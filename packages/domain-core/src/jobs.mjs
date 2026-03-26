import crypto from "node:crypto";
import { createPostgresAsyncJobStore } from "./jobs-store-postgres.mjs";

export { createPostgresAsyncJobStore };

export const ASYNC_JOB_STATUSES = Object.freeze(["queued", "claimed", "running", "retry_scheduled", "succeeded", "dead_lettered", "cancelled"]);
export const ASYNC_JOB_RISK_CLASSES = Object.freeze(["low", "medium", "high"]);
export const ASYNC_JOB_REPLAY_STATUSES = Object.freeze(["planned", "approved", "executed", "rejected"]);
export const ASYNC_JOB_OPERATOR_STATES = Object.freeze(["pending_triage", "acknowledged", "replay_planned", "resolved", "closed"]);
export const ASYNC_JOB_ERROR_CLASSES = Object.freeze(["transient_technical", "persistent_technical", "business_input", "downstream_unknown"]);

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

function text(value, code, error) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw error(400, code, `${code} is required.`);
  }
  return value.trim();
}

function optionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function positiveInteger(value, code, error, fallback = null) {
  if (value == null) {
    if (fallback == null) {
      throw error(400, code, `${code} is required.`);
    }
    return fallback;
  }
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw error(400, code, `${code} must be a positive integer.`);
  }
  return normalized;
}

function assertAllowed(value, allowedValues, code, error, fallback = null) {
  const resolved = value == null ? fallback : value;
  if (!allowedValues.includes(resolved)) {
    throw error(400, code, `${code} must be one of ${allowedValues.join(", ")}.`);
  }
  return resolved;
}

function normalizeIsoTimestamp(value, code, error, fallback) {
  const candidate = value == null ? fallback : value;
  const date = candidate instanceof Date ? candidate : new Date(candidate);
  if (Number.isNaN(date.getTime())) {
    throw error(400, code, `${code} must be a valid timestamp.`);
  }
  return date.toISOString();
}

function createPayloadHash(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload ?? null)).digest("hex");
}

function addSeconds(isoTimestamp, seconds) {
  return new Date(new Date(isoTimestamp).getTime() + seconds * 1000).toISOString();
}

function defaultRetryDelaySeconds(errorClass, attemptNo) {
  if (!["transient_technical", "downstream_unknown"].includes(errorClass)) {
    return null;
  }
  const delay = 30 * 2 ** Math.max(0, attemptNo - 1);
  return Math.min(delay, 900);
}

function compareJobs(left, right) {
  return right.priority - left.priority
    || left.availableAt.localeCompare(right.availableAt)
    || left.createdAt.localeCompare(right.createdAt)
    || left.jobId.localeCompare(right.jobId);
}

export function createInMemoryAsyncJobStore() {
  const state = {
    jobs: new Map(),
    attempts: new Map(),
    attemptIdsByJob: new Map(),
    deadLetters: new Map(),
    deadLetterByJob: new Map(),
    replayPlans: new Map()
  };

  function listAttempts(jobId) {
    return (state.attemptIdsByJob.get(jobId) || []).map((attemptId) => clone(state.attempts.get(attemptId)));
  }

  function releaseExpiredClaims(nowIsoValue) {
    for (const job of state.jobs.values()) {
      if (["claimed", "running"].includes(job.status) && job.claimExpiresAt && job.claimExpiresAt < nowIsoValue) {
        job.status = "queued";
        job.claimToken = null;
        job.workerId = null;
        job.claimedAt = null;
        job.claimExpiresAt = null;
        job.updatedAt = nowIsoValue;
      }
    }
  }

  return {
    kind: "memory",

    async close() {},

    async enqueueJob(record) {
      state.jobs.set(record.jobId, clone(record));
      return clone(state.jobs.get(record.jobId));
    },

    async findJobByIdempotency({ companyId, jobType, idempotencyKey }) {
      if (!idempotencyKey) {
        return null;
      }
      return clone(
        [...state.jobs.values()]
          .filter((job) => job.companyId === companyId && job.jobType === jobType && job.idempotencyKey === idempotencyKey)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] || null
      );
    },

    async getJob(jobId) {
      return clone(state.jobs.get(jobId) || null);
    },

    async claimAvailableJobs({ workerId, limit, claimTtlSeconds, nowIso: nowIsoValue }) {
      releaseExpiredClaims(nowIsoValue);
      const claimExpiresAt = addSeconds(nowIsoValue, claimTtlSeconds);
      const claimed = [];
      for (const job of [...state.jobs.values()]
        .filter((candidate) => ["queued", "retry_scheduled"].includes(candidate.status) && candidate.availableAt <= nowIsoValue)
        .sort(compareJobs)
        .slice(0, limit)) {
        job.status = "claimed";
        job.workerId = workerId;
        job.claimToken = crypto.randomUUID();
        job.claimedAt = nowIsoValue;
        job.claimExpiresAt = claimExpiresAt;
        job.updatedAt = nowIsoValue;
        claimed.push(clone(job));
      }
      return claimed;
    },

    async releaseJobClaim({ jobId, claimToken, workerId, availableAt, releasedAt }) {
      const job = state.jobs.get(jobId);
      if (!job) {
        return null;
      }
      if (job.claimToken !== claimToken || job.workerId !== workerId) {
        throw new Error(`Async job ${jobId} is not claimed by worker ${workerId}.`);
      }
      job.status = "queued";
      job.claimToken = null;
      job.workerId = null;
      job.claimedAt = null;
      job.claimExpiresAt = null;
      job.availableAt = availableAt || job.availableAt;
      job.updatedAt = releasedAt || job.updatedAt;
      return clone(job);
    },

    async startJobAttempt({ jobId, claimToken, workerId, startedAt }) {
      const job = state.jobs.get(jobId);
      if (!job) {
        throw new Error(`Async job ${jobId} was not found.`);
      }
      if (job.claimToken !== claimToken || job.workerId !== workerId) {
        throw new Error(`Async job ${jobId} is not claimed by worker ${workerId}.`);
      }

      const existingAttempt = listAttempts(jobId).find((attempt) => attempt.claimToken === claimToken && !attempt.finishedAt);
      if (existingAttempt) {
        return {
          job: clone(job),
          attempt: existingAttempt
        };
      }

      const attemptNo = Number(job.attemptCount || 0) + 1;
      const attempt = {
        jobAttemptId: crypto.randomUUID(),
        jobId,
        attemptNo,
        workerId,
        claimToken,
        startedAt,
        finishedAt: null,
        resultCode: null,
        errorClass: null,
        errorCode: null,
        errorMessage: null,
        resultPayload: null,
        nextRetryAt: null,
        createdAt: startedAt
      };
      job.status = "running";
      job.attemptCount = attemptNo;
      job.updatedAt = startedAt;
      state.attempts.set(attempt.jobAttemptId, attempt);
      state.attemptIdsByJob.set(jobId, [...(state.attemptIdsByJob.get(jobId) || []), attempt.jobAttemptId]);

      return {
        job: clone(job),
        attempt: clone(attempt)
      };
    },

    async finalizeJobAttempt({
      jobId,
      claimToken,
      workerId,
      attemptId,
      finishedAt,
      terminalState,
      resultCode = null,
      resultPayload = null,
      errorClass = null,
      errorCode = null,
      errorMessage = null,
      nextRetryAt = null,
      terminalReason = null,
      replayAllowed = true
    }) {
      const job = state.jobs.get(jobId);
      if (!job) {
        throw new Error(`Async job ${jobId} was not found.`);
      }
      if (job.claimToken !== claimToken || job.workerId !== workerId) {
        throw new Error(`Async job ${jobId} is not claimed by worker ${workerId}.`);
      }
      const attempt = state.attempts.get(attemptId);
      if (!attempt) {
        throw new Error(`Async job attempt ${attemptId} was not found.`);
      }
      if (attempt.finishedAt) {
        return {
          job: clone(job),
          attempt: clone(attempt),
          deadLetter: clone(state.deadLetters.get(state.deadLetterByJob.get(jobId)) || null)
        };
      }

      attempt.finishedAt = finishedAt;
      attempt.resultCode = resultCode;
      attempt.errorClass = errorClass;
      attempt.errorCode = errorCode;
      attempt.errorMessage = errorMessage;
      attempt.resultPayload = clone(resultPayload);
      attempt.nextRetryAt = nextRetryAt;

      job.claimToken = null;
      job.workerId = null;
      job.claimedAt = null;
      job.claimExpiresAt = null;
      job.updatedAt = finishedAt;

      if (terminalState === "succeeded") {
        job.status = "succeeded";
        job.completedAt = finishedAt;
        job.lastResultCode = resultCode;
        job.lastErrorClass = null;
        job.lastErrorCode = null;
        job.lastErrorMessage = null;
      } else if (terminalState === "retry_scheduled") {
        job.status = "retry_scheduled";
        job.availableAt = nextRetryAt;
        job.lastResultCode = null;
        job.lastErrorClass = errorClass;
        job.lastErrorCode = errorCode;
        job.lastErrorMessage = errorMessage;
      } else {
        job.status = "dead_lettered";
        job.lastResultCode = null;
        job.lastErrorClass = errorClass;
        job.lastErrorCode = errorCode;
        job.lastErrorMessage = errorMessage;
        const existingDeadLetterId = state.deadLetterByJob.get(jobId);
        const deadLetter = existingDeadLetterId ? state.deadLetters.get(existingDeadLetterId) : {
          deadLetterId: crypto.randomUUID(),
          jobId,
          companyId: job.companyId,
          latestAttemptId: attempt.jobAttemptId,
          terminalReason: terminalReason || "worker_terminal_failure",
          operatorState: "pending_triage",
          replayAllowed,
          enteredAt: finishedAt,
          createdAt: finishedAt,
          updatedAt: finishedAt
        };
        deadLetter.latestAttemptId = attempt.jobAttemptId;
        deadLetter.terminalReason = terminalReason || deadLetter.terminalReason;
        deadLetter.replayAllowed = replayAllowed;
        deadLetter.updatedAt = finishedAt;
        state.deadLetters.set(deadLetter.deadLetterId, deadLetter);
        state.deadLetterByJob.set(jobId, deadLetter.deadLetterId);
      }

      return {
        job: clone(job),
        attempt: clone(attempt),
        deadLetter: clone(state.deadLetters.get(state.deadLetterByJob.get(jobId)) || null)
      };
    },

    async cancelJob({ jobId, cancelledAt, reasonCode = null }) {
      const job = state.jobs.get(jobId);
      if (!job) {
        return null;
      }
      job.status = "cancelled";
      job.cancelledAt = cancelledAt;
      job.claimToken = null;
      job.workerId = null;
      job.claimedAt = null;
      job.claimExpiresAt = null;
      job.lastErrorCode = reasonCode;
      job.updatedAt = cancelledAt;
      return clone(job);
    },

    async listJobs(filters = {}) {
      return [...state.jobs.values()]
        .filter((job) => (filters.companyId ? job.companyId === filters.companyId : true))
        .filter((job) => (filters.status ? job.status === filters.status : true))
        .filter((job) => (filters.jobType ? job.jobType === filters.jobType : true))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map(clone);
    },

    async listJobAttempts(jobId) {
      return listAttempts(jobId);
    },

    async listDeadLetters(filters = {}) {
      return [...state.deadLetters.values()]
        .filter((deadLetter) => (filters.companyId ? deadLetter.companyId === filters.companyId : true))
        .filter((deadLetter) => (filters.operatorState ? deadLetter.operatorState === filters.operatorState : true))
        .sort((left, right) => right.enteredAt.localeCompare(left.enteredAt))
        .map(clone);
    },

    async updateDeadLetter({ deadLetterId, operatorState, updatedAt }) {
      const deadLetter = state.deadLetters.get(deadLetterId);
      if (!deadLetter) {
        return null;
      }
      deadLetter.operatorState = operatorState;
      deadLetter.updatedAt = updatedAt;
      return clone(deadLetter);
    },

    async createReplayPlan(plan) {
      state.replayPlans.set(plan.replayPlanId, clone(plan));
      return clone(state.replayPlans.get(plan.replayPlanId));
    },

    async listReplayPlans(filters = {}) {
      return [...state.replayPlans.values()]
        .filter((plan) => (filters.jobId ? plan.jobId === filters.jobId : true))
        .filter((plan) => (filters.status ? plan.status === filters.status : true))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map(clone);
    },

    async getReplayPlan(replayPlanId) {
      return clone(state.replayPlans.get(replayPlanId) || null);
    },

    async approveReplayPlan({ replayPlanId, approvedByUserId, approvedAt }) {
      const replayPlan = state.replayPlans.get(replayPlanId);
      if (!replayPlan) {
        return null;
      }
      replayPlan.status = "approved";
      replayPlan.approvedByUserId = approvedByUserId;
      replayPlan.approvedAt = approvedAt;
      replayPlan.updatedAt = approvedAt;
      return clone(replayPlan);
    },

    async markReplayPlanExecuted({ replayPlanId, replayJobId, executedAt }) {
      const replayPlan = state.replayPlans.get(replayPlanId);
      if (!replayPlan) {
        return null;
      }
      replayPlan.status = "executed";
      replayPlan.replayJobId = replayJobId;
      replayPlan.executedAt = executedAt;
      replayPlan.updatedAt = executedAt;
      return clone(replayPlan);
    }
  };
}

export function createAsyncJobStore(options = {}) {
  if (options.kind === "postgres" || options.connectionString || options.env?.POSTGRES_URL || options.env?.DATABASE_URL || options.env?.POSTGRES_HOST) {
    return createPostgresAsyncJobStore(options);
  }
  return createInMemoryAsyncJobStore(options);
}

export function createAsyncJobsModule({
  clock = () => new Date(),
  audit,
  error,
  store = createInMemoryAsyncJobStore(),
  incidentHooks = null,
  resolveRuntimeFlags = null
} = {}) {
  return {
    asyncJobStatuses: ASYNC_JOB_STATUSES,
    asyncJobRiskClasses: ASYNC_JOB_RISK_CLASSES,
    asyncJobReplayStatuses: ASYNC_JOB_REPLAY_STATUSES,
    asyncJobOperatorStates: ASYNC_JOB_OPERATOR_STATES,
    asyncJobErrorClasses: ASYNC_JOB_ERROR_CLASSES,
    enqueueAsyncJob,
    claimAvailableAsyncJobs,
    startAsyncJobAttempt,
    completeAsyncJob,
    failAsyncJob,
    cancelAsyncJob,
    getAsyncJob,
    listAsyncJobs,
    listAsyncJobAttempts,
    listAsyncDeadLetters,
    triageAsyncDeadLetter,
    planAsyncJobReplay,
    approveAsyncJobReplay,
    executeAsyncJobReplay,
    listAsyncJobReplayPlans,
    closeAsyncJobStore
  };

  async function closeAsyncJobStore() {
    if (typeof store.close === "function") {
      await store.close();
    }
  }

  async function enqueueAsyncJob({
    companyId,
    jobType,
    sourceEventId = null,
    sourceObjectType,
    sourceObjectId,
    idempotencyKey = null,
    payload = {},
    metadata = {},
    riskClass = "medium",
    priority = 50,
    availableAt = null,
    maxAttempts = 5,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = text(companyId, "async_job_company_id_required", error);
    const resolvedJobType = text(jobType, "async_job_type_required", error);
    const resolvedSourceObjectType = text(sourceObjectType, "async_job_source_object_type_required", error);
    const resolvedSourceObjectId = text(sourceObjectId, "async_job_source_object_id_required", error);
    const resolvedRiskClass = assertAllowed(riskClass, ASYNC_JOB_RISK_CLASSES, "async_job_risk_class_invalid", error);
    const resolvedPriority = positiveInteger(priority, "async_job_priority_invalid", error, 50);
    const resolvedMaxAttempts = positiveInteger(maxAttempts, "async_job_max_attempts_invalid", error, 5);
    const availableAtIso = normalizeIsoTimestamp(availableAt, "async_job_available_at_invalid", error, nowIso(clock));

    const existing = await store.findJobByIdempotency({
      companyId: resolvedCompanyId,
      jobType: resolvedJobType,
      idempotencyKey: optionalText(idempotencyKey)
    });
    if (existing && !["cancelled", "dead_lettered"].includes(existing.status)) {
      return existing;
    }

    const job = await store.enqueueJob({
      jobId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      jobType: resolvedJobType,
      sourceEventId: optionalText(sourceEventId),
      sourceObjectType: resolvedSourceObjectType,
      sourceObjectId: resolvedSourceObjectId,
      idempotencyKey: optionalText(idempotencyKey),
      payloadHash: createPayloadHash(payload),
      payload: clone(payload),
      metadata: clone(metadata || {}),
      status: "queued",
      riskClass: resolvedRiskClass,
      priority: resolvedPriority,
      availableAt: availableAtIso,
      claimToken: null,
      workerId: null,
      claimedAt: null,
      claimExpiresAt: null,
      attemptCount: 0,
      maxAttempts: resolvedMaxAttempts,
      lastResultCode: null,
      lastErrorClass: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      correlationId,
      enqueuedBy: actorId,
      completedAt: null,
      cancelledAt: null,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    });

    audit({
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "jobs.async_job.enqueued",
      entityType: "async_job",
      entityId: job.jobId,
      explanation: `Queued async job ${job.jobType}.`
    });
    return job;
  }

  async function claimAvailableAsyncJobs({
    workerId,
    limit = 10,
    claimTtlSeconds = 120
  } = {}) {
    const resolvedWorkerId = text(workerId, "async_job_worker_id_required", error);
    const claimedJobs = await store.claimAvailableJobs({
      workerId: resolvedWorkerId,
      limit: positiveInteger(limit, "async_job_claim_limit_invalid", error, 10),
      claimTtlSeconds: positiveInteger(claimTtlSeconds, "async_job_claim_ttl_invalid", error, 120),
      nowIso: nowIso(clock)
    });
    const claimableJobs = [];
    for (const job of claimedJobs) {
      const disableDecision = resolveJobDisableDecision(job, resolveRuntimeFlags);
      if (!disableDecision) {
        claimableJobs.push(job);
        continue;
      }
      const releasedJob = await store.releaseJobClaim({
        jobId: job.jobId,
        claimToken: job.claimToken,
        workerId: resolvedWorkerId,
        availableAt: nowIso(clock),
        releasedAt: nowIso(clock)
      });
      audit({
        companyId: job.companyId,
        actorId: resolvedWorkerId,
        correlationId: job.correlationId,
        action: "jobs.async_job.claim_released",
        entityType: "async_job",
        entityId: job.jobId,
        explanation: `Released claim for async job ${job.jobType} because feature flag ${disableDecision.flagKey} is disabled.`
      });
      if (releasedJob) {
        claimableJobs.push({
          ...releasedJob,
          skipped: true,
          skipReasonCode: disableDecision.reasonCode,
          skipFlagKey: disableDecision.flagKey
        });
      }
    }
    return claimableJobs.filter((job) => job.skipped !== true);
  }

  async function startAsyncJobAttempt({
    jobId,
    claimToken,
    workerId
  } = {}) {
    const resolvedJobId = text(jobId, "async_job_id_required", error);
    const resolvedClaimToken = text(claimToken, "async_job_claim_token_required", error);
    const resolvedWorkerId = text(workerId, "async_job_worker_id_required", error);
    const currentJob = await store.getJob(resolvedJobId);
    if (!currentJob) {
      throw error(404, "async_job_not_found", "Async job was not found.");
    }
    const disableDecision = resolveJobDisableDecision(currentJob, resolveRuntimeFlags);
    if (disableDecision) {
      const releasedJob = await store.releaseJobClaim({
        jobId: resolvedJobId,
        claimToken: resolvedClaimToken,
        workerId: resolvedWorkerId,
        availableAt: nowIso(clock),
        releasedAt: nowIso(clock)
      });
      audit({
        companyId: currentJob.companyId,
        actorId: resolvedWorkerId,
        correlationId: currentJob.correlationId,
        action: "jobs.async_job.execution_blocked",
        entityType: "async_job",
        entityId: currentJob.jobId,
        explanation: `Blocked async job ${currentJob.jobType} because feature flag ${disableDecision.flagKey} is disabled.`
      });
      return {
        job: releasedJob || currentJob,
        attempt: null,
        skipped: true,
        skipReasonCode: disableDecision.reasonCode,
        skipFlagKey: disableDecision.flagKey
      };
    }
    return store.startJobAttempt({
      jobId: resolvedJobId,
      claimToken: resolvedClaimToken,
      workerId: resolvedWorkerId,
      startedAt: nowIso(clock)
    });
  }

  async function completeAsyncJob({
    jobId,
    claimToken,
    workerId,
    attemptId,
    resultCode = "succeeded",
    resultPayload = {}
  } = {}) {
    const result = await store.finalizeJobAttempt({
      jobId: text(jobId, "async_job_id_required", error),
      claimToken: text(claimToken, "async_job_claim_token_required", error),
      workerId: text(workerId, "async_job_worker_id_required", error),
      attemptId: text(attemptId, "async_job_attempt_id_required", error),
      finishedAt: nowIso(clock),
      terminalState: "succeeded",
      resultCode: text(resultCode, "async_job_result_code_required", error),
      resultPayload: clone(resultPayload || {})
    });
    audit({
      companyId: result.job.companyId,
      actorId: workerId,
      correlationId: result.job.correlationId,
      action: "jobs.async_job.completed",
      entityType: "async_job",
      entityId: result.job.jobId,
      explanation: `Completed async job ${result.job.jobType}.`
    });
    return result;
  }

  async function failAsyncJob({
    jobId,
    claimToken,
    workerId,
    attemptId,
    errorClass = "persistent_technical",
    errorCode = "worker_failure",
    errorMessage = "Worker execution failed.",
    retryDelaySeconds = null,
    terminalReason = null,
    replayAllowed = true
  } = {}) {
    const currentJob = await store.getJob(text(jobId, "async_job_id_required", error));
    if (!currentJob) {
      throw error(404, "async_job_not_found", "Async job was not found.");
    }
    const currentAttemptNo = Number(currentJob.attemptCount || 0);
    const resolvedErrorClass = assertAllowed(errorClass, ASYNC_JOB_ERROR_CLASSES, "async_job_error_class_invalid", error);
    const resolvedRetryDelaySeconds = retryDelaySeconds == null ? defaultRetryDelaySeconds(resolvedErrorClass, currentAttemptNo) : positiveInteger(retryDelaySeconds, "async_job_retry_delay_invalid", error);
    const exhaustedAttempts = currentAttemptNo >= currentJob.maxAttempts;
    const shouldRetry = resolvedRetryDelaySeconds != null && !exhaustedAttempts;
    const result = await store.finalizeJobAttempt({
      jobId: currentJob.jobId,
      claimToken: text(claimToken, "async_job_claim_token_required", error),
      workerId: text(workerId, "async_job_worker_id_required", error),
      attemptId: text(attemptId, "async_job_attempt_id_required", error),
      finishedAt: nowIso(clock),
      terminalState: shouldRetry ? "retry_scheduled" : "dead_lettered",
      errorClass: resolvedErrorClass,
      errorCode: text(errorCode, "async_job_error_code_required", error),
      errorMessage: text(errorMessage, "async_job_error_message_required", error),
      nextRetryAt: shouldRetry ? addSeconds(nowIso(clock), resolvedRetryDelaySeconds) : null,
      terminalReason: shouldRetry ? null : optionalText(terminalReason) || (exhaustedAttempts ? "max_attempts_exhausted" : "worker_terminal_failure"),
      replayAllowed
    });
    audit({
      companyId: result.job.companyId,
      actorId: workerId,
      correlationId: result.job.correlationId,
      action: shouldRetry ? "jobs.async_job.retry_scheduled" : "jobs.async_job.dead_lettered",
      entityType: "async_job",
      entityId: result.job.jobId,
      explanation: shouldRetry
        ? `Scheduled retry for async job ${result.job.jobType}.`
        : `Moved async job ${result.job.jobType} to dead letter.`
    });
    if (shouldRetry) {
      incidentHooks?.onAsyncJobRetryScheduled?.({
        job: result.job,
        attempt: result.attempt,
        retryAt: result.attempt?.nextRetryAt || null
      });
    } else {
      incidentHooks?.onAsyncJobDeadLetter?.({
        job: result.job,
        attempt: result.attempt,
        deadLetter: result.deadLetter
      });
    }
    return result;
  }

  async function cancelAsyncJob({
    jobId,
    actorId = "system",
    correlationId = crypto.randomUUID(),
    reasonCode = "cancelled_by_operator"
  } = {}) {
    const cancelled = await store.cancelJob({
      jobId: text(jobId, "async_job_id_required", error),
      cancelledAt: nowIso(clock),
      reasonCode: text(reasonCode, "async_job_cancel_reason_required", error)
    });
    if (!cancelled) {
      throw error(404, "async_job_not_found", "Async job was not found.");
    }
    audit({
      companyId: cancelled.companyId,
      actorId,
      correlationId,
      action: "jobs.async_job.cancelled",
      entityType: "async_job",
      entityId: cancelled.jobId,
      explanation: `Cancelled async job ${cancelled.jobType}.`
    });
    return cancelled;
  }

  async function getAsyncJob({ jobId } = {}) {
    const job = await store.getJob(text(jobId, "async_job_id_required", error));
    if (!job) {
      throw error(404, "async_job_not_found", "Async job was not found.");
    }
    return job;
  }

  async function listAsyncJobs(filters = {}) {
    return store.listJobs({
      companyId: optionalText(filters.companyId),
      status: optionalText(filters.status),
      jobType: optionalText(filters.jobType)
    });
  }

  async function listAsyncJobAttempts({ jobId } = {}) {
    return store.listJobAttempts(text(jobId, "async_job_id_required", error));
  }

  async function listAsyncDeadLetters(filters = {}) {
    return store.listDeadLetters({
      companyId: optionalText(filters.companyId),
      operatorState: optionalText(filters.operatorState)
    });
  }

  async function triageAsyncDeadLetter({
    companyId,
    deadLetterId,
    actorId,
    operatorState,
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required", error);
    const resolvedDeadLetterId = text(deadLetterId, "async_dead_letter_id_required", error);
    const resolvedActorId = text(actorId || "system", "actor_id_required", error);
    const nextOperatorState = assertAllowed(operatorState, ASYNC_JOB_OPERATOR_STATES, "async_job_operator_state_invalid", error);
    const deadLetter = (await listAsyncDeadLetters({ companyId: resolvedCompanyId }))
      .find((candidate) => candidate.deadLetterId === resolvedDeadLetterId);
    if (!deadLetter) {
      throw error(404, "async_dead_letter_not_found", "Async dead-letter case was not found.");
    }
    if (deadLetter.operatorState === nextOperatorState) {
      return deadLetter;
    }
    if (!isDeadLetterTransitionAllowed(deadLetter.operatorState, nextOperatorState)) {
      throw error(409, "async_dead_letter_transition_invalid", `Cannot move dead-letter from ${deadLetter.operatorState} to ${nextOperatorState}.`);
    }
    if (nextOperatorState === "replay_planned" && deadLetter.replayAllowed !== true) {
      throw error(409, "async_dead_letter_replay_forbidden", "Replay is not allowed for this dead-letter case.");
    }
    const updatedDeadLetter = await store.updateDeadLetter({
      deadLetterId: deadLetter.deadLetterId,
      operatorState: nextOperatorState,
      updatedAt: nowIso(clock)
    });
    audit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: "jobs.async_job.dead_letter_triaged",
      entityType: "async_dead_letter",
      entityId: deadLetter.deadLetterId,
      explanation: `Moved async dead-letter ${deadLetter.deadLetterId} to ${nextOperatorState}.`
    });
    return updatedDeadLetter;
  }

  async function planAsyncJobReplay({
    jobId,
    plannedByUserId,
    reasonCode,
    plannedPayloadStrategy = "reuse",
    correlationId = crypto.randomUUID()
  } = {}) {
    const job = await getAsyncJob({ jobId });
    const deadLetter = (await listAsyncDeadLetters({ companyId: job.companyId })).find((candidate) => candidate.jobId === job.jobId);
    if (!deadLetter) {
      throw error(409, "async_job_not_dead_lettered", "Replay requires a dead-lettered job.");
    }
    const replayPlan = await store.createReplayPlan({
      replayPlanId: crypto.randomUUID(),
      jobId: job.jobId,
      companyId: job.companyId,
      plannedByUserId: text(plannedByUserId, "async_job_replay_planned_by_required", error),
      reasonCode: text(reasonCode, "async_job_replay_reason_required", error),
      plannedPayloadStrategy: text(plannedPayloadStrategy, "async_job_replay_payload_strategy_required", error),
      status: "planned",
      approvedByUserId: null,
      replayJobId: null,
      plannedAt: nowIso(clock),
      approvedAt: null,
      executedAt: null,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    });
    audit({
      companyId: job.companyId,
      actorId: replayPlan.plannedByUserId,
      correlationId,
      action: "jobs.async_job.replay_planned",
      entityType: "async_job_replay_plan",
      entityId: replayPlan.replayPlanId,
      explanation: `Planned replay for async job ${job.jobType}.`
    });
    incidentHooks?.onAsyncJobReplayPlanned?.({
      replayPlan,
      job
    });
    return replayPlan;
  }

  async function approveAsyncJobReplay({
    replayPlanId,
    approvedByUserId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const replayPlan = await store.approveReplayPlan({
      replayPlanId: text(replayPlanId, "async_job_replay_plan_id_required", error),
      approvedByUserId: text(approvedByUserId, "async_job_replay_approved_by_required", error),
      approvedAt: nowIso(clock)
    });
    if (!replayPlan) {
      throw error(404, "async_job_replay_plan_not_found", "Replay plan was not found.");
    }
    audit({
      companyId: replayPlan.companyId,
      actorId: replayPlan.approvedByUserId,
      correlationId,
      action: "jobs.async_job.replay_approved",
      entityType: "async_job_replay_plan",
      entityId: replayPlan.replayPlanId,
      explanation: `Approved replay plan for job ${replayPlan.jobId}.`
    });
    return replayPlan;
  }

  async function executeAsyncJobReplay({
    replayPlanId,
    actorId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const replayPlan = await store.getReplayPlan(text(replayPlanId, "async_job_replay_plan_id_required", error));
    if (!replayPlan) {
      throw error(404, "async_job_replay_plan_not_found", "Replay plan was not found.");
    }
    if (replayPlan.status !== "approved") {
      throw error(409, "async_job_replay_plan_not_approved", "Replay plan must be approved before execution.");
    }

    const sourceJob = await getAsyncJob({ jobId: replayPlan.jobId });
    const replayJob = await enqueueAsyncJob({
      companyId: sourceJob.companyId,
      jobType: sourceJob.jobType,
      sourceEventId: sourceJob.sourceEventId,
      sourceObjectType: sourceJob.sourceObjectType,
      sourceObjectId: sourceJob.sourceObjectId,
      payload: sourceJob.payload,
      metadata: {
        ...sourceJob.metadata,
        replayOfJobId: sourceJob.jobId,
        replayPlanId: replayPlan.replayPlanId
      },
      riskClass: sourceJob.riskClass,
      priority: sourceJob.priority,
      availableAt: nowIso(clock),
      maxAttempts: sourceJob.maxAttempts,
      actorId: text(actorId || replayPlan.approvedByUserId, "async_job_replay_actor_required", error),
      correlationId
    });
    const executedPlan = await store.markReplayPlanExecuted({
      replayPlanId: replayPlan.replayPlanId,
      replayJobId: replayJob.jobId,
      executedAt: nowIso(clock)
    });
    audit({
      companyId: replayPlan.companyId,
      actorId: actorId || replayPlan.approvedByUserId,
      correlationId,
      action: "jobs.async_job.replay_executed",
      entityType: "async_job_replay_plan",
      entityId: replayPlan.replayPlanId,
      explanation: `Executed replay for async job ${sourceJob.jobType}.`
    });
    incidentHooks?.onAsyncJobReplayExecuted?.({
      replayPlan: executedPlan,
      replayJob,
      actorId: actorId || replayPlan.approvedByUserId
    });
    return {
      replayPlan: executedPlan,
      replayJob
    };
  }

  async function listAsyncJobReplayPlans(filters = {}) {
    return store.listReplayPlans({
      jobId: optionalText(filters.jobId),
      status: optionalText(filters.status)
    });
  }
}

function isDeadLetterTransitionAllowed(currentState, nextState) {
  const transitions = {
    pending_triage: new Set(["acknowledged", "replay_planned", "resolved", "closed"]),
    acknowledged: new Set(["replay_planned", "resolved", "closed"]),
    replay_planned: new Set(["resolved", "closed"]),
    resolved: new Set(["closed"]),
    closed: new Set()
  };
  return transitions[currentState]?.has(nextState) === true;
}

function resolveJobDisableDecision(job, resolveRuntimeFlags) {
  if (!job || typeof resolveRuntimeFlags !== "function") {
    return null;
  }
  const flagKey = optionalText(job.metadata?.featureFlagKey || job.metadata?.runtimeFlagKey);
  if (!flagKey) {
    return null;
  }
  const runtimeFlags = resolveRuntimeFlags({ companyId: job.companyId }) || {};
  if (runtimeFlags[flagKey] !== false) {
    return null;
  }
  return {
    flagKey,
    reasonCode: "async_job_feature_disabled"
  };
}
