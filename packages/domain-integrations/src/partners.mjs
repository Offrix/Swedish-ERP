import crypto from "node:crypto";

export const PARTNER_CONNECTION_TYPES = Object.freeze(["bank", "peppol", "pension", "crm", "commerce", "id06"]);
export const PARTNER_CONNECTION_STATUSES = Object.freeze(["active", "degraded", "outage", "disabled"]);
export const PARTNER_FALLBACK_MODES = Object.freeze(["queue_retry", "manual_review", "disabled"]);
export const PARTNER_OPERATION_STATUSES = Object.freeze(["queued", "running", "succeeded", "failed", "fallback", "rate_limited", "retry_scheduled"]);
export const JOB_STATUSES = Object.freeze(["queued", "claimed", "running", "succeeded", "failed", "retry_scheduled", "dead_lettered", "replay_planned", "replayed"]);
export const JOB_RISK_CLASSES = Object.freeze(["normal", "high_risk", "restricted"]);
export const JOB_ERROR_CLASSES = Object.freeze(["transient_technical", "persistent_technical", "business_input", "downstream_unknown"]);
export const PARTNER_CONNECTION_CATALOG = Object.freeze({
  bank: Object.freeze({
    connectionType: "bank",
    operationCodes: Object.freeze(["payment_export", "statement_sync", "tax_account_sync"]),
    replaySafe: true,
    emitsWebhookEventTypes: Object.freeze(["partner.connection.updated", "partner.operation.completed", "partner.operation.failed"])
  }),
  peppol: Object.freeze({
    connectionType: "peppol",
    operationCodes: Object.freeze(["invoice_send", "credit_note_send", "status_sync", "inbound_document_sync"]),
    replaySafe: true,
    emitsWebhookEventTypes: Object.freeze(["partner.connection.updated", "partner.contract_test.completed", "partner.operation.completed", "partner.operation.failed"])
  }),
  pension: Object.freeze({
    connectionType: "pension",
    operationCodes: Object.freeze(["enrollment_export", "premium_basis_export", "contribution_status_sync"]),
    replaySafe: true,
    emitsWebhookEventTypes: Object.freeze(["partner.connection.updated", "partner.operation.completed", "partner.operation.failed"])
  }),
  crm: Object.freeze({
    connectionType: "crm",
    operationCodes: Object.freeze(["customer_sync", "invoice_sync", "project_sync"]),
    replaySafe: true,
    emitsWebhookEventTypes: Object.freeze(["partner.connection.updated", "partner.operation.completed", "partner.operation.failed"])
  }),
  commerce: Object.freeze({
    connectionType: "commerce",
    operationCodes: Object.freeze(["order_sync", "payout_sync", "stock_sync"]),
    replaySafe: true,
    emitsWebhookEventTypes: Object.freeze(["partner.connection.updated", "partner.operation.completed", "partner.operation.failed"])
  }),
  id06: Object.freeze({
    connectionType: "id06",
    operationCodes: Object.freeze(["attendance_sync", "site_registry_sync", "device_status_sync"]),
    replaySafe: true,
    emitsWebhookEventTypes: Object.freeze(["partner.connection.updated", "partner.operation.completed", "partner.operation.failed"])
  })
});

export function createPartnerModule({
  state,
  clock = () => new Date(),
  contractTestExecutors = null,
  operationExecutors = null
}) {
  return {
    partnerConnectionTypes: PARTNER_CONNECTION_TYPES,
    partnerConnectionStatuses: PARTNER_CONNECTION_STATUSES,
    partnerFallbackModes: PARTNER_FALLBACK_MODES,
    partnerOperationStatuses: PARTNER_OPERATION_STATUSES,
    jobStatuses: JOB_STATUSES,
    jobRiskClasses: JOB_RISK_CLASSES,
    jobErrorClasses: JOB_ERROR_CLASSES,
    listPartnerConnectionCatalog,
    getPartnerConnectionCapabilities,
    createPartnerConnection,
    listPartnerConnections,
    setPartnerConnectionHealth,
    runAdapterContractTest,
    listAdapterContractResults,
    dispatchPartnerOperation,
    executePartnerOperation,
    listPartnerOperations,
    enqueueAsyncJob,
    listAsyncJobs,
    getAsyncJob,
    claimAsyncJob,
    completeAsyncJob,
    failAsyncJobAttempt,
    planJobReplay,
    executeJobReplay,
    massRetryJobs
  };

  function listPartnerConnectionCatalog() {
    return PARTNER_CONNECTION_TYPES.map((connectionType) => partnerCatalogEntry(connectionType));
  }

  function getPartnerConnectionCapabilities({ companyId, connectionId } = {}) {
    const connection = requireConnection(companyId, connectionId);
    return {
      ...partnerCatalogEntry(connection.connectionType),
      connectionId: connection.connectionId,
      partnerCode: connection.partnerCode,
      displayName: connection.displayName,
      mode: connection.mode,
      status: connection.status,
      fallbackMode: connection.fallbackMode,
      rateLimitPerMinute: connection.rateLimitPerMinute,
      credentialsConfigured: connection.credentialsRef != null
    };
  }

  function createPartnerConnection({
    companyId,
    connectionType,
    partnerCode,
    displayName,
    mode = "production",
    rateLimitPerMinute = 60,
    fallbackMode = "queue_retry",
    credentialsRef = null,
    actorId = "system"
  } = {}) {
    const connection = {
      connectionId: crypto.randomUUID(),
      companyId: text(companyId, "company_id_required"),
      connectionType: assertAllowed(connectionType, PARTNER_CONNECTION_TYPES, "partner_connection_type_invalid"),
      partnerCode: text(partnerCode, "partner_code_required"),
      displayName: text(displayName, "partner_display_name_required"),
      mode: assertAllowed(mode, ["sandbox", "production"], "partner_mode_invalid"),
      rateLimitPerMinute: normalizePositiveInteger(rateLimitPerMinute, "partner_rate_limit_invalid"),
      fallbackMode: assertAllowed(fallbackMode, PARTNER_FALLBACK_MODES, "partner_fallback_mode_invalid"),
      credentialsRef: optionalText(credentialsRef),
      status: "active",
      createdByActorId: text(actorId || "system", "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.partnerConnections.set(connection.connectionId, connection);
    return clone(connection);
  }

  function listPartnerConnections({ companyId, connectionType = null } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedType = optionalText(connectionType);
    return [...state.partnerConnections.values()]
      .filter((connection) => connection.companyId === resolvedCompanyId)
      .filter((connection) => (resolvedType ? connection.connectionType === resolvedType : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(clone);
  }

  function setPartnerConnectionHealth({ companyId, connectionId, status } = {}) {
    const connection = requireConnection(companyId, connectionId);
    connection.status = assertAllowed(status, PARTNER_CONNECTION_STATUSES, "partner_connection_status_invalid");
    connection.updatedAt = nowIso(clock);
    return clone(connection);
  }

  async function runAdapterContractTest({ companyId, connectionId, actorId = "system" } = {}) {
    const connection = requireConnection(companyId, connectionId);
    const assertions = contractAssertionsFor(connection.connectionType);
    const executor = resolveConfiguredExecutor(contractTestExecutors, connection);
    const rawResult =
      typeof executor === "function"
        ? await executor({
            connection: clone(connection),
            assertions: clone(assertions),
            actorId: text(actorId || "system", "actor_id_required")
          })
        : {
            result: "failed",
            failures: [
              {
                code: "partner_contract_runtime_missing",
                message: `No contract-test executor is registered for ${connection.connectionType}.`
              }
            ]
          };
    const normalized = normalizeContractTestResult(rawResult, assertions);
    const contractResult = {
      contractResultId: crypto.randomUUID(),
      companyId: connection.companyId,
      connectionId: connection.connectionId,
      connectionType: connection.connectionType,
      partnerCode: connection.partnerCode,
      mode: connection.mode,
      actorId: text(actorId || "system", "actor_id_required"),
      result: normalized.result,
      assertions: normalized.assertions,
      failures: normalized.failures,
      diagnostics: normalized.diagnostics,
      executedAt: nowIso(clock)
    };
    state.partnerContractResults.set(contractResult.contractResultId, contractResult);
    return clone(contractResult);
  }

  function listAdapterContractResults({ companyId, connectionId = null } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedConnectionId = optionalText(connectionId);
    return [...state.partnerContractResults.values()]
      .filter((result) => result.companyId === resolvedCompanyId)
      .filter((result) => (resolvedConnectionId ? result.connectionId === resolvedConnectionId : true))
      .sort((left, right) => left.executedAt.localeCompare(right.executedAt))
      .map(clone);
  }

  async function dispatchPartnerOperation({
    companyId,
    connectionId,
    operationCode,
    payload = {},
    actorId = "system"
  } = {}) {
    const connection = requireConnection(companyId, connectionId);
    const companyKey = `${companyId}:${connectionId}:${currentMinuteKey(clock)}`;
    const currentCount = state.partnerRateLimitCounters.get(companyKey) || 0;
    const operation = {
      operationId: crypto.randomUUID(),
      companyId: connection.companyId,
      connectionId: connection.connectionId,
      connectionType: connection.connectionType,
      partnerCode: connection.partnerCode,
      mode: connection.mode,
      operationCode: text(operationCode, "partner_operation_code_required"),
      payloadHash: hashObject(payload),
      payloadJson: clone(payload),
      actorId: text(actorId || "system", "actor_id_required"),
      fallbackMode: connection.fallbackMode,
      status: "queued",
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    if (connection.status === "disabled") {
      throw createError(409, "partner_connection_disabled", "Partner connection is disabled.");
    }
    if (!partnerCatalogEntry(connection.connectionType).operationCodes.includes(operation.operationCode)) {
      throw createError(409, "partner_operation_code_not_supported", `Operation ${operation.operationCode} is not supported for ${connection.connectionType}.`);
    }
    if (currentCount >= connection.rateLimitPerMinute) {
      operation.status = "rate_limited";
      operation.fallbackTriggered = connection.fallbackMode !== "disabled";
      operation.fallbackReasonCode = "rate_limit_exceeded";
      operation.updatedAt = nowIso(clock);
      state.partnerOperations.set(operation.operationId, operation);
      if (connection.fallbackMode === "queue_retry") {
        const job = enqueueAsyncJob({
          companyId,
          jobType: `${connection.connectionType}.${operation.operationCode}`,
          payloadRef: operation.operationId,
          payload,
          priority: "normal",
          riskClass: connection.connectionType === "bank" ? "high_risk" : "normal",
          idempotencyKey: `${connection.connectionId}:${operation.operationCode}:${operation.payloadHash}`,
          actorId
        });
        operation.jobId = job.jobId;
      }
      return clone(operation);
    }
    state.partnerRateLimitCounters.set(companyKey, currentCount + 1);
    state.partnerOperations.set(operation.operationId, operation);

    if (connection.status === "outage" || connection.status === "degraded") {
      operation.status = "fallback";
      operation.fallbackTriggered = true;
      operation.fallbackReasonCode = connection.status === "outage" ? "provider_outage" : "provider_degraded";
      operation.updatedAt = nowIso(clock);
      if (connection.fallbackMode === "queue_retry") {
        const job = enqueueAsyncJob({
          companyId,
          jobType: `${connection.connectionType}.${operation.operationCode}`,
          payloadRef: operation.operationId,
          payload,
          priority: connection.status === "outage" ? "high" : "normal",
          riskClass: connection.connectionType === "bank" ? "high_risk" : "normal",
          idempotencyKey: `${connection.connectionId}:${operation.operationCode}:${operation.payloadHash}`,
          actorId
        });
        operation.jobId = job.jobId;
      }
      return clone(operation);
    }

    const job = enqueueAsyncJob({
      companyId,
      jobType: `${connection.connectionType}.${operation.operationCode}`,
      payloadRef: operation.operationId,
      payload,
      priority: "normal",
      riskClass: connection.connectionType === "bank" ? "high_risk" : "normal",
      idempotencyKey: `${connection.connectionId}:${operation.operationCode}:${operation.payloadHash}`,
      actorId
    });
    operation.jobId = job.jobId;
    operation.updatedAt = nowIso(clock);
    return clone(operation);
  }

  async function executePartnerOperation({ companyId, operationId, actorId = "system" } = {}) {
    const operation = requireOperation(companyId, operationId);
    const connection = requireConnection(companyId, operation.connectionId);
    if (!operation.jobId) {
      throw createError(409, "partner_operation_not_dispatchable", "Partner operation does not have a dispatchable async job.");
    }
    if (operation.status === "succeeded") {
      return clone(operation);
    }

    const claimedJob = claimAsyncJob({
      companyId,
      jobId: operation.jobId,
      workerId: `${connection.connectionType}-worker`
    });
    operation.status = "running";
    operation.updatedAt = nowIso(clock);

    const executor = resolveConfiguredExecutor(operationExecutors, connection);
    if (typeof executor !== "function") {
      const failedJob = failAsyncJobAttempt({
        companyId,
        jobId: operation.jobId,
        errorClass: "persistent_technical",
        errorMessage: `No partner-operation executor is registered for ${connection.connectionType}.`,
        replayAllowed: true
      });
      return finalizePartnerOperationFailure({
        operation,
        connection,
        failedJob,
        failureStatus: connection.fallbackMode === "disabled" ? "failed" : "fallback",
        failureCode: "partner_operation_runtime_missing",
        failureMessage: `No partner-operation executor is registered for ${connection.connectionType}.`,
        timestamp: nowIso(clock)
      });
    }

    const rawResult = await executor({
      connection: clone(connection),
      operation: clone(operation),
      job: clone(claimedJob),
      actorId: text(actorId || "system", "actor_id_required")
    });
    const normalized = normalizePartnerOperationResult(rawResult);

    if (normalized.outcome === "succeeded") {
      completeAsyncJob({
        companyId,
        jobId: operation.jobId,
        resultSummary: {
          providerReference: normalized.providerReference || `${connection.partnerCode}:${operation.operationId}`,
          responseSummary: normalized.responseSummary
        }
      });
      operation.status = "succeeded";
      operation.providerReference = normalized.providerReference || `${connection.partnerCode}:${operation.operationId}`;
      operation.failureCode = null;
      operation.failureMessage = null;
      operation.nextRetryAt = null;
      operation.updatedAt = nowIso(clock);
      return clone(operation);
    }

    const failedJob = failAsyncJobAttempt({
      companyId,
      jobId: operation.jobId,
      errorClass: normalized.errorClass,
      errorMessage: normalized.errorMessage,
      replayAllowed: normalized.replayAllowed
    });

    if (normalized.outcome === "rate_limited") {
      return finalizePartnerOperationFailure({
        operation,
        connection,
        failedJob,
        failureStatus: "rate_limited",
        failureCode: normalized.failureCode || "partner_rate_limit_exceeded",
        failureMessage: normalized.errorMessage,
        timestamp: nowIso(clock)
      });
    }
    if (normalized.outcome === "fallback") {
      return finalizePartnerOperationFailure({
        operation,
        connection,
        failedJob,
        failureStatus: "fallback",
        failureCode: normalized.failureCode || normalized.fallbackReasonCode || "partner_fallback_triggered",
        failureMessage: normalized.errorMessage,
        timestamp: nowIso(clock)
      });
    }
    return finalizePartnerOperationFailure({
      operation,
      connection,
      failedJob,
      failureStatus: failedJob.status === "retry_scheduled" ? "retry_scheduled" : "failed",
      failureCode: normalized.failureCode || "partner_operation_failed",
      failureMessage: normalized.errorMessage,
      timestamp: nowIso(clock)
    });
  }

  function listPartnerOperations({ companyId, connectionId = null, status = null } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedConnectionId = optionalText(connectionId);
    const resolvedStatus = optionalText(status);
    return [...state.partnerOperations.values()]
      .filter((operation) => operation.companyId === resolvedCompanyId)
      .filter((operation) => (resolvedConnectionId ? operation.connectionId === resolvedConnectionId : true))
      .filter((operation) => (resolvedStatus ? operation.status === resolvedStatus : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(clone);
  }

  function enqueueAsyncJob({
    companyId,
    jobType,
    payloadRef,
    payload = {},
    priority = "normal",
    riskClass = "normal",
    retryPolicy = {},
    sourceEventId = null,
    sourceActionId = null,
    idempotencyKey = null,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedJobType = text(jobType, "job_type_required");
    const payloadHash = hashObject(payload);
    const resolvedKey = optionalText(idempotencyKey) || `${resolvedCompanyId}:${resolvedJobType}:${payloadHash}`;
    const existing = [...state.asyncJobs.values()].find(
      (job) => job.companyId === resolvedCompanyId && job.idempotencyKey === resolvedKey && ["queued", "claimed", "running", "retry_scheduled"].includes(job.status)
    );
    if (existing) {
      return presentJob(existing);
    }
    const normalizedRetryPolicy = normalizeRetryPolicy(retryPolicy);
    const job = {
      jobId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      jobType: resolvedJobType,
      jobPayloadHash: payloadHash,
      jobPayloadRef: text(payloadRef || resolvedKey, "job_payload_ref_required"),
      payloadJson: clone(payload),
      status: "queued",
      priority: text(priority || "normal", "job_priority_required"),
      riskClass: assertAllowed(riskClass, JOB_RISK_CLASSES, "job_risk_class_invalid"),
      idempotencyKey: resolvedKey,
      sourceEventId: optionalText(sourceEventId),
      sourceActionId: optionalText(sourceActionId),
      correlationId: crypto.randomUUID(),
      retryPolicy: normalizedRetryPolicy,
      timeoutSeconds: normalizedRetryPolicy.timeoutSeconds,
      createdByActorId: text(actorId || "system", "actor_id_required"),
      createdAt: nowIso(clock),
      availableAt: nowIso(clock),
      lastErrorClass: null,
      replayOfJobId: null,
      attempts: [],
      claimToken: null,
      claimedByWorkerId: null
    };
    state.asyncJobs.set(job.jobId, job);
    return presentJob(job);
  }

  function listAsyncJobs({ companyId, status = null, jobType = null } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedStatus = optionalText(status);
    const resolvedJobType = optionalText(jobType);
    return [...state.asyncJobs.values()]
      .filter((job) => job.companyId === resolvedCompanyId)
      .filter((job) => (resolvedStatus ? job.status === resolvedStatus : true))
      .filter((job) => (resolvedJobType ? job.jobType === resolvedJobType : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(presentJob);
  }

  function getAsyncJob({ companyId, jobId } = {}) {
    return presentJob(requireJob(companyId, jobId));
  }

  function claimAsyncJob({ companyId, jobId, workerId } = {}) {
    const job = requireJob(companyId, jobId);
    if (!["queued", "retry_scheduled", "replay_planned"].includes(job.status)) {
      throw createError(409, "job_claim_invalid_state", "Job cannot be claimed in the current state.");
    }
    if (new Date(job.availableAt) > new Date(nowIso(clock))) {
      throw createError(409, "job_retry_not_ready", "Job cannot be claimed before its retry window opens.");
    }
    if (job.claimToken && job.status === "claimed") {
      throw createError(409, "job_double_claim_blocked", "Job is already claimed.");
    }
    job.status = "claimed";
    job.claimToken = crypto.randomUUID();
    job.claimedByWorkerId = text(workerId, "job_worker_id_required");
    job.updatedAt = nowIso(clock);
    return presentJob(job);
  }

  function completeAsyncJob({ companyId, jobId, resultSummary = {} } = {}) {
    const job = requireJob(companyId, jobId);
    const attempt = startAttemptIfNeeded(job);
    attempt.result = "succeeded";
    attempt.finishedAt = nowIso(clock);
    attempt.resultSummary = clone(resultSummary);
    job.status = "succeeded";
    job.claimToken = null;
    job.updatedAt = attempt.finishedAt;
    return presentJob(job);
  }

  function failAsyncJobAttempt({ companyId, jobId, errorClass, errorMessage, replayAllowed = null } = {}) {
    const job = requireJob(companyId, jobId);
    const attempt = startAttemptIfNeeded(job);
    const resolvedErrorClass = assertAllowed(errorClass, JOB_ERROR_CLASSES, "job_error_class_invalid");
    attempt.result = "failed";
    attempt.errorClass = resolvedErrorClass;
    attempt.errorMessageRedacted = text(errorMessage, "job_error_message_required");
    attempt.finishedAt = nowIso(clock);
    job.lastErrorClass = resolvedErrorClass;
    const nextAction = classifyFailure(job, resolvedErrorClass);
    job.updatedAt = attempt.finishedAt;
    job.claimToken = null;
    job.claimedByWorkerId = null;

    if (nextAction === "retry") {
      attempt.nextRetryAt = addMinutesIso(attempt.finishedAt, computeBackoffMinutes(job.retryPolicy, job.attempts.length));
      job.availableAt = attempt.nextRetryAt;
      job.status = "retry_scheduled";
      return presentJob(job);
    }

    job.status = "dead_lettered";
    state.asyncDeadLetters.set(job.jobId, {
      deadLetterId: crypto.randomUUID(),
      jobId: job.jobId,
      companyId: job.companyId,
      enteredAt: attempt.finishedAt,
      terminalReason: resolvedErrorClass,
      operatorState: "unseen",
      replayAllowed: replayAllowed == null ? job.riskClass !== "restricted" : replayAllowed === true,
      riskClass: job.riskClass
    });
    return presentJob(job);
  }

  function planJobReplay({ companyId, jobId, actorId = "system", approvedByActorId = null } = {}) {
    const job = requireJob(companyId, jobId);
    if (job.status !== "dead_lettered") {
      throw createError(409, "job_replay_invalid_state", "Only dead-lettered jobs can be replayed.");
    }
    const resolvedActorId = text(actorId || "system", "actor_id_required");
    const resolvedApprovedByActorId = optionalText(approvedByActorId);
    if (job.riskClass !== "normal" && resolvedApprovedByActorId == null) {
      throw createError(409, "job_replay_requires_approval", "High-risk or restricted jobs require explicit replay approval.");
    }
    if (job.riskClass !== "normal" && resolvedApprovedByActorId && resolvedApprovedByActorId === resolvedActorId) {
      throw createError(409, "job_replay_self_approval_forbidden", "Replay approval must come from a separate actor.");
    }
    job.status = "replay_planned";
    job.replayPlannedByActorId = resolvedActorId;
    job.replayApprovedByActorId = resolvedApprovedByActorId;
    job.updatedAt = nowIso(clock);
    return presentJob(job);
  }

  function executeJobReplay({ companyId, jobId, actorId = "system" } = {}) {
    const job = requireJob(companyId, jobId);
    if (job.status !== "replay_planned") {
      throw createError(409, "job_replay_not_planned", "Replay must be planned before execution.");
    }
    const replayed = enqueueAsyncJob({
      companyId: job.companyId,
      jobType: job.jobType,
      payloadRef: job.jobPayloadRef,
      payload: job.payloadJson,
      priority: job.priority,
      riskClass: job.riskClass,
      retryPolicy: job.retryPolicy,
      sourceEventId: job.sourceEventId,
      sourceActionId: job.sourceActionId,
      idempotencyKey: `${job.idempotencyKey}:replay:${job.attempts.length + 1}`,
      actorId
    });
    const replayJob = state.asyncJobs.get(replayed.jobId);
    replayJob.replayOfJobId = job.jobId;
    job.status = "replayed";
    job.updatedAt = nowIso(clock);
    return {
      originalJob: presentJob(job),
      replayJob: presentJob(replayJob)
    };
  }

  function massRetryJobs({ companyId, jobIds = [], actorId = "system" } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      throw createError(400, "mass_retry_job_ids_required", "At least one job id is required for mass retry.");
    }
    const jobs = jobIds.map((jobId) => requireJob(resolvedCompanyId, jobId));
    const firstRiskClass = jobs[0].riskClass;
    const firstErrorClass = jobs[0].lastErrorClass;
    if (jobs.some((job) => job.riskClass !== firstRiskClass || job.lastErrorClass !== firstErrorClass)) {
      throw createError(409, "mass_retry_mixed_scope_forbidden", "Mass retry requires matching risk class and error class.");
    }
    return jobs.map((job) =>
      planJobReplay({
        companyId: resolvedCompanyId,
        jobId: job.jobId,
        actorId,
        approvedByActorId: firstRiskClass === "normal" ? actorId : null
      })
    );
  }

  function requireConnection(companyId, connectionId) {
    const connection = state.partnerConnections.get(text(connectionId, "partner_connection_id_required"));
    if (!connection || connection.companyId !== text(companyId, "company_id_required")) {
      throw createError(404, "partner_connection_not_found", "Partner connection was not found.");
    }
    return connection;
  }

  function requireOperation(companyId, operationId) {
    const operation = state.partnerOperations.get(text(operationId, "partner_operation_id_required"));
    if (!operation || operation.companyId !== text(companyId, "company_id_required")) {
      throw createError(404, "partner_operation_not_found", "Partner operation was not found.");
    }
    return operation;
  }

  function requireJob(companyId, jobId) {
    const job = state.asyncJobs.get(text(jobId, "job_id_required"));
    if (!job || job.companyId !== text(companyId, "company_id_required")) {
      throw createError(404, "job_not_found", "Async job was not found.");
    }
    return job;
  }

  function startAttemptIfNeeded(job) {
    const lastAttempt = job.attempts[job.attempts.length - 1];
    if (lastAttempt && !lastAttempt.finishedAt) {
      return lastAttempt;
    }
    const attempt = {
      attemptNo: job.attempts.length + 1,
      startedAt: nowIso(clock),
      finishedAt: null,
      workerId: job.claimedByWorkerId || "system",
      result: null,
      errorClass: null,
      errorMessageRedacted: null,
      nextRetryAt: null,
      resultSummary: null
    };
    job.attempts.push(attempt);
    job.status = "running";
    job.updatedAt = attempt.startedAt;
    return attempt;
  }

  function presentJob(job) {
    return clone({
      ...job,
      deadLetter: state.asyncDeadLetters.get(job.jobId) || null
    });
  }
}

function finalizePartnerOperationFailure({ operation, connection, failedJob, failureStatus, failureCode, failureMessage, timestamp }) {
  const latestAttempt = Array.isArray(failedJob.attempts) && failedJob.attempts.length > 0 ? failedJob.attempts[failedJob.attempts.length - 1] : null;
  operation.status = failureStatus;
  operation.failureCode = failureCode || null;
  operation.failureMessage = failureMessage || null;
  operation.fallbackTriggered = failureStatus === "fallback" || failureStatus === "rate_limited";
  operation.fallbackReasonCode = operation.fallbackTriggered ? failureCode || null : null;
  operation.nextRetryAt = latestAttempt?.nextRetryAt || null;
  operation.updatedAt = timestamp;
  if (connection.fallbackMode === "disabled" && failureStatus === "fallback") {
    operation.status = "failed";
    operation.fallbackTriggered = false;
    operation.fallbackReasonCode = null;
  }
  return clone(operation);
}

function resolveConfiguredExecutor(catalog, connection) {
  if (typeof catalog === "function") {
    return catalog;
  }
  if (!catalog || typeof catalog !== "object") {
    return null;
  }
  return catalog[connection.connectionId] || catalog[connection.partnerCode] || catalog[connection.connectionType] || null;
}

function normalizeContractTestResult(value, fallbackAssertions) {
  const resolved = value && typeof value === "object" ? value : {};
  const result = ["passed", "failed"].includes(resolved.result) ? resolved.result : "failed";
  const assertions = Array.isArray(resolved.assertions) && resolved.assertions.length > 0 ? resolved.assertions.map(String) : [...fallbackAssertions];
  const failures = Array.isArray(resolved.failures)
    ? resolved.failures.map((failure) => ({
        code: optionalText(failure?.code) || "partner_contract_failure",
        message: optionalText(failure?.message) || "Partner contract assertion failed."
      }))
    : [];
  return {
    result,
    assertions,
    failures,
    diagnostics: resolved.diagnostics && typeof resolved.diagnostics === "object" ? clone(resolved.diagnostics) : {}
  };
}

function normalizePartnerOperationResult(value = {}) {
  const resolved = value && typeof value === "object" ? value : {};
  const outcome = ["succeeded", "failed", "fallback", "rate_limited"].includes(resolved.outcome) ? resolved.outcome : "failed";
  return {
    outcome,
    providerReference: optionalText(resolved.providerReference),
    responseSummary: resolved.responseSummary && typeof resolved.responseSummary === "object" ? clone(resolved.responseSummary) : {},
    errorClass: assertAllowed(
      resolved.errorClass || (outcome === "rate_limited" ? "transient_technical" : outcome === "fallback" ? "downstream_unknown" : "persistent_technical"),
      JOB_ERROR_CLASSES,
      "job_error_class_invalid"
    ),
    errorMessage: optionalText(resolved.errorMessage) || `Partner operation ${outcome}.`,
    failureCode: optionalText(resolved.failureCode),
    fallbackReasonCode: optionalText(resolved.fallbackReasonCode),
    replayAllowed: resolved.replayAllowed !== false
  };
}

function partnerCatalogEntry(connectionType) {
  const catalog = PARTNER_CONNECTION_CATALOG[connectionType];
  if (!catalog) {
    throw createError(400, "partner_connection_type_invalid", `${connectionType} is not a supported partner connection type.`);
  }
  return clone({
    ...catalog,
    contractAssertions: contractAssertionsFor(connectionType)
  });
}

function normalizeRetryPolicy(value = {}) {
  const policy = value && typeof value === "object" ? value : {};
  return {
    maxAttempts: normalizePositiveInteger(policy.maxAttempts || 3, "job_retry_policy_invalid"),
    baseDelayMinutes: normalizePositiveInteger(policy.baseDelayMinutes || 5, "job_retry_policy_invalid"),
    timeoutSeconds: normalizePositiveInteger(policy.timeoutSeconds || 90, "job_retry_policy_invalid")
  };
}

function classifyFailure(job, errorClass) {
  if (errorClass === "business_input" || errorClass === "persistent_technical") {
    return "dead_letter";
  }
  if (job.attempts.length >= job.retryPolicy.maxAttempts) {
    return "dead_letter";
  }
  return "retry";
}

function computeBackoffMinutes(retryPolicy, attemptCount) {
  return Math.min(retryPolicy.baseDelayMinutes * 2 ** Math.max(0, attemptCount - 1), 120);
}

function contractAssertionsFor(connectionType) {
  const assertionCatalog = {
    bank: ["statement_cursor_required", "payment_reference_roundtrip", "retryable_transport_codes_mapped"],
    peppol: ["receiver_identifier_required", "receipt_normalization", "duplicate_delivery_guard"],
    pension: ["enrollment_period_required", "salary_exchange_snapshot", "provider_reference_recorded"],
    crm: ["external_customer_id_required", "upsert_idempotency", "rate_limit_headers_observed"],
    commerce: ["order_reference_required", "line_tax_mapping", "stock_change_idempotency"],
    id06: ["site_identifier_required", "attendance_window_validation", "device_reference_roundtrip"]
  };
  return assertionCatalog[connectionType] || ["contract_defined"];
}

function currentMinuteKey(clock = () => new Date()) {
  return nowIso(clock).slice(0, 16);
}

function hashObject(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function addMinutesIso(timestamp, minutes) {
  const resolved = new Date(timestamp);
  resolved.setUTCMinutes(resolved.getUTCMinutes() + minutes);
  return resolved.toISOString();
}

function nowIso(clock = () => new Date()) {
  return new Date(clock()).toISOString();
}

function normalizePositiveInteger(value, code) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw createError(400, code, `${code} must be a positive integer.`);
  }
  return number;
}

function assertAllowed(value, allowed, code) {
  const resolved = text(value, code);
  if (!allowed.includes(resolved)) {
    throw createError(400, code, `${code} does not allow ${resolved}.`);
  }
  return resolved;
}

function optionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function text(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createError(400, code, `${code} is required.`);
  }
  return value.trim();
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
