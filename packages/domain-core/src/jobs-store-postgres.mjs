import crypto from "node:crypto";
import postgres from "postgres";

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function jsonValue(value) {
  if (value == null) {
    return null;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return clone(value);
}

function mapJobRow(row) {
  if (!row) {
    return null;
  }
  return {
    jobId: row.job_id,
    companyId: row.company_id,
    jobType: row.job_type,
    sourceEventId: row.source_event_id,
    sourceObjectType: row.source_object_type,
    sourceObjectId: row.source_object_id,
    idempotencyKey: row.idempotency_key,
    payloadHash: row.payload_hash,
    payload: jsonValue(row.payload_json),
    metadata: jsonValue(row.metadata_json) || {},
    status: row.status,
    riskClass: row.risk_class,
    priority: row.priority,
    availableAt: row.available_at,
    claimToken: row.claim_token,
    workerId: row.worker_id,
    claimedAt: row.claimed_at,
    claimExpiresAt: row.claim_expires_at,
    attemptCount: Number(row.attempt_count || 0),
    maxAttempts: Number(row.max_attempts || 0),
    lastResultCode: row.last_result_code,
    lastErrorClass: row.last_error_class,
    lastErrorCode: row.last_error_code,
    lastErrorMessage: row.last_error_message,
    correlationId: row.correlation_id,
    enqueuedBy: row.enqueued_by,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAttemptRow(row) {
  if (!row) {
    return null;
  }
  return {
    jobAttemptId: row.job_attempt_id,
    jobId: row.job_id,
    attemptNo: Number(row.attempt_no || 0),
    workerId: row.worker_id,
    claimToken: row.claim_token,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    resultCode: row.result_code,
    errorClass: row.error_class,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    resultPayload: jsonValue(row.result_payload_json),
    nextRetryAt: row.next_retry_at,
    createdAt: row.created_at
  };
}

function mapDeadLetterRow(row) {
  if (!row) {
    return null;
  }
  return {
    deadLetterId: row.dead_letter_id,
    jobId: row.job_id,
    companyId: row.company_id,
    latestAttemptId: row.latest_attempt_id,
    terminalReason: row.terminal_reason,
    operatorState: row.operator_state,
    replayAllowed: row.replay_allowed,
    enteredAt: row.entered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapReplayPlanRow(row) {
  if (!row) {
    return null;
  }
  return {
    replayPlanId: row.replay_plan_id,
    jobId: row.job_id,
    companyId: row.company_id,
    plannedByUserId: row.planned_by_user_id,
    reasonCode: row.reason_code,
    plannedPayloadStrategy: row.planned_payload_strategy,
    status: row.status,
    approvedByUserId: row.approved_by_user_id,
    replayJobId: row.replay_job_id,
    plannedAt: row.planned_at,
    approvedAt: row.approved_at,
    executedAt: row.executed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function buildConnectionString({
  connectionString = null,
  env = process.env
} = {}) {
  if (connectionString) {
    return connectionString;
  }
  if (env.POSTGRES_URL) {
    return env.POSTGRES_URL;
  }
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }
  if (!env.POSTGRES_HOST) {
    return null;
  }
  const user = env.POSTGRES_USER || "swedish_erp";
  const password = env.POSTGRES_PASSWORD || "swedish_erp";
  const host = env.POSTGRES_HOST;
  const port = env.POSTGRES_PORT || "55432";
  const database = env.POSTGRES_DB || "swedish_erp";
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

async function fetchJob(tx, jobId) {
  const rows = await tx`select * from async_jobs where job_id = ${jobId} limit 1`;
  return rows[0] || null;
}

async function fetchAttempt(tx, attemptId) {
  const rows = await tx`select * from async_job_attempts where job_attempt_id = ${attemptId} limit 1`;
  return rows[0] || null;
}

async function fetchLatestAttemptForClaim(tx, jobId, claimToken) {
  const rows = await tx`
    select *
    from async_job_attempts
    where job_id = ${jobId}
      and claim_token = ${claimToken}
    order by attempt_no desc
    limit 1
  `;
  return rows[0] || null;
}

export function createPostgresAsyncJobStore({
  connectionString = null,
  env = process.env,
  max = 5,
  idleTimeout = 20,
  connectTimeout = 10,
  logger = () => {}
} = {}) {
  const resolvedConnectionString = buildConnectionString({ connectionString, env });
  if (!resolvedConnectionString) {
    throw new Error("Postgres connection information is required for the async job store.");
  }

  const sql = postgres(resolvedConnectionString, {
    max,
    idle_timeout: idleTimeout,
    connect_timeout: connectTimeout,
    prepare: false,
    onnotice: () => {}
  });

  const store = {
    kind: "postgres",

    async close() {
      await sql.end({ timeout: 5 });
    },

    async enqueueJob(record) {
      const rows = await sql`
        insert into async_jobs (
          job_id, company_id, job_type, source_event_id, source_object_type, source_object_id,
          idempotency_key, payload_hash, payload_json, metadata_json, status, risk_class, priority,
          available_at, claim_token, worker_id, claimed_at, claim_expires_at, attempt_count,
          max_attempts, last_result_code, last_error_class, last_error_code, last_error_message,
          correlation_id, enqueued_by, completed_at, cancelled_at, created_at, updated_at
        ) values (
          ${record.jobId}, ${record.companyId}, ${record.jobType}, ${record.sourceEventId},
          ${record.sourceObjectType}, ${record.sourceObjectId}, ${record.idempotencyKey}, ${record.payloadHash},
          ${JSON.stringify(record.payload)}::jsonb, ${JSON.stringify(record.metadata || {})}::jsonb,
          ${record.status}, ${record.riskClass}, ${record.priority}, ${record.availableAt}, ${record.claimToken},
          ${record.workerId}, ${record.claimedAt}, ${record.claimExpiresAt}, ${record.attemptCount},
          ${record.maxAttempts}, ${record.lastResultCode}, ${record.lastErrorClass}, ${record.lastErrorCode},
          ${record.lastErrorMessage}, ${record.correlationId}, ${record.enqueuedBy}, ${record.completedAt},
          ${record.cancelledAt}, ${record.createdAt}, ${record.updatedAt}
        )
        returning *
      `;
      return mapJobRow(rows[0]);
    },

    async findJobByIdempotency({ companyId, jobType, idempotencyKey }) {
      if (!idempotencyKey) {
        return null;
      }
      const rows = await sql`
        select *
        from async_jobs
        where company_id = ${companyId}
          and job_type = ${jobType}
          and idempotency_key = ${idempotencyKey}
        order by created_at desc
        limit 1
      `;
      return mapJobRow(rows[0]);
    },

    async getJob(jobId) {
      const rows = await sql`select * from async_jobs where job_id = ${jobId} limit 1`;
      return mapJobRow(rows[0]);
    },

    async claimAvailableJobs({ workerId, limit, claimTtlSeconds, nowIso }) {
      return sql.begin(async (tx) => {
        const claimExpiresAt = new Date(new Date(nowIso).getTime() + claimTtlSeconds * 1000).toISOString();
        await tx`
          update async_jobs
          set status = 'queued',
              claim_token = null,
              worker_id = null,
              claimed_at = null,
              claim_expires_at = null,
              updated_at = ${nowIso}
          where status in ('claimed', 'running')
            and claim_expires_at is not null
            and claim_expires_at < ${nowIso}
        `;

        const candidates = await tx`
          select *
          from async_jobs
          where status in ('queued', 'retry_scheduled')
            and available_at <= ${nowIso}
          order by priority desc, available_at asc, created_at asc
          limit ${limit}
          for update skip locked
        `;

        const claimed = [];
        for (const candidate of candidates) {
          const claimToken = crypto.randomUUID();
          const rows = await tx`
            update async_jobs
            set status = 'claimed',
                worker_id = ${workerId},
                claim_token = ${claimToken},
                claimed_at = ${nowIso},
                claim_expires_at = ${claimExpiresAt},
                updated_at = ${nowIso}
            where job_id = ${candidate.job_id}
            returning *
          `;
          claimed.push(mapJobRow(rows[0]));
        }

        return claimed;
      });
    },

    async startJobAttempt({ jobId, claimToken, workerId, startedAt }) {
      return sql.begin(async (tx) => {
        const jobRow = await fetchJob(tx, jobId);
        if (!jobRow) {
          throw new Error(`Async job ${jobId} was not found.`);
        }
        if (jobRow.claim_token !== claimToken || jobRow.worker_id !== workerId) {
          throw new Error(`Async job ${jobId} is not claimed by worker ${workerId}.`);
        }

        const existingAttempt = await fetchLatestAttemptForClaim(tx, jobId, claimToken);
        if (existingAttempt && !existingAttempt.finished_at) {
          return {
            job: mapJobRow(jobRow),
            attempt: mapAttemptRow(existingAttempt)
          };
        }

        const attemptNo = Number(jobRow.attempt_count || 0) + 1;
        const attemptRows = await tx`
          insert into async_job_attempts (
            job_attempt_id, job_id, attempt_no, worker_id, claim_token, started_at, created_at
          ) values (
            ${crypto.randomUUID()}, ${jobId}, ${attemptNo}, ${workerId}, ${claimToken}, ${startedAt}, ${startedAt}
          )
          returning *
        `;
        const jobRows = await tx`
          update async_jobs
          set status = 'running',
              attempt_count = ${attemptNo},
              updated_at = ${startedAt}
          where job_id = ${jobId}
          returning *
        `;

        return {
          job: mapJobRow(jobRows[0]),
          attempt: mapAttemptRow(attemptRows[0])
        };
      });
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
      return sql.begin(async (tx) => {
        const jobRow = await fetchJob(tx, jobId);
        if (!jobRow) {
          throw new Error(`Async job ${jobId} was not found.`);
        }
        if (jobRow.claim_token !== claimToken || jobRow.worker_id !== workerId) {
          throw new Error(`Async job ${jobId} is not claimed by worker ${workerId}.`);
        }

        const attemptRow = await fetchAttempt(tx, attemptId);
        if (!attemptRow) {
          throw new Error(`Async job attempt ${attemptId} was not found.`);
        }
        if (attemptRow.finished_at) {
          const deadLetters = await tx`select * from async_job_dead_letters where job_id = ${jobId} limit 1`;
          return {
            job: mapJobRow(jobRow),
            attempt: mapAttemptRow(attemptRow),
            deadLetter: mapDeadLetterRow(deadLetters[0])
          };
        }

        const attemptRows = await tx`
          update async_job_attempts
          set finished_at = ${finishedAt},
              result_code = ${resultCode},
              error_class = ${errorClass},
              error_code = ${errorCode},
              error_message = ${errorMessage},
              result_payload_json = ${JSON.stringify(resultPayload)}::jsonb,
              next_retry_at = ${nextRetryAt}
          where job_attempt_id = ${attemptId}
          returning *
        `;

        let jobRows;
        if (terminalState === "succeeded") {
          jobRows = await tx`
            update async_jobs
            set status = 'succeeded',
                claim_token = null,
                worker_id = null,
                claimed_at = null,
                claim_expires_at = null,
                completed_at = ${finishedAt},
                updated_at = ${finishedAt},
                last_result_code = ${resultCode},
                last_error_class = null,
                last_error_code = null,
                last_error_message = null
            where job_id = ${jobId}
            returning *
          `;
        } else if (terminalState === "retry_scheduled") {
          jobRows = await tx`
            update async_jobs
            set status = 'retry_scheduled',
                claim_token = null,
                worker_id = null,
                claimed_at = null,
                claim_expires_at = null,
                available_at = ${nextRetryAt},
                updated_at = ${finishedAt},
                last_result_code = null,
                last_error_class = ${errorClass},
                last_error_code = ${errorCode},
                last_error_message = ${errorMessage}
            where job_id = ${jobId}
            returning *
          `;
        } else {
          jobRows = await tx`
            update async_jobs
            set status = 'dead_lettered',
                claim_token = null,
                worker_id = null,
                claimed_at = null,
                claim_expires_at = null,
                updated_at = ${finishedAt},
                last_result_code = null,
                last_error_class = ${errorClass},
                last_error_code = ${errorCode},
                last_error_message = ${errorMessage}
            where job_id = ${jobId}
            returning *
          `;
          await tx`
            insert into async_job_dead_letters (
              dead_letter_id, job_id, company_id, latest_attempt_id, terminal_reason,
              operator_state, replay_allowed, entered_at, created_at, updated_at
            ) values (
              ${crypto.randomUUID()}, ${jobId}, ${jobRow.company_id}, ${attemptId},
              ${terminalReason || "worker_terminal_failure"}, 'pending_triage', ${replayAllowed},
              ${finishedAt}, ${finishedAt}, ${finishedAt}
            )
            on conflict (job_id)
            do update set
              latest_attempt_id = excluded.latest_attempt_id,
              terminal_reason = excluded.terminal_reason,
              replay_allowed = excluded.replay_allowed,
              updated_at = excluded.updated_at
          `;
        }

        const deadLetterRows = await tx`
          select *
          from async_job_dead_letters
          where job_id = ${jobId}
          limit 1
        `;

        return {
          job: mapJobRow(jobRows[0]),
          attempt: mapAttemptRow(attemptRows[0]),
          deadLetter: mapDeadLetterRow(deadLetterRows[0])
        };
      });
    },

    async cancelJob({ jobId, cancelledAt, reasonCode = null }) {
      const rows = await sql`
        update async_jobs
        set status = 'cancelled',
            cancelled_at = ${cancelledAt},
            claim_token = null,
            worker_id = null,
            claimed_at = null,
            claim_expires_at = null,
            updated_at = ${cancelledAt},
            last_error_code = ${reasonCode}
        where job_id = ${jobId}
        returning *
      `;
      return mapJobRow(rows[0]);
    },

    async listJobs(filters = {}) {
      const rows = await sql`
        select *
        from async_jobs
        order by created_at desc
      `;
      return rows
        .map(mapJobRow)
        .filter((job) => (filters.companyId ? job.companyId === filters.companyId : true))
        .filter((job) => (filters.status ? job.status === filters.status : true))
        .filter((job) => (filters.jobType ? job.jobType === filters.jobType : true));
    },

    async listJobAttempts(jobId) {
      const rows = await sql`
        select *
        from async_job_attempts
        where job_id = ${jobId}
        order by attempt_no asc
      `;
      return rows.map(mapAttemptRow);
    },

    async listDeadLetters(filters = {}) {
      const rows = await sql`
        select *
        from async_job_dead_letters
        order by entered_at desc
      `;
      return rows
        .map(mapDeadLetterRow)
        .filter((deadLetter) => (filters.companyId ? deadLetter.companyId === filters.companyId : true))
        .filter((deadLetter) => (filters.operatorState ? deadLetter.operatorState === filters.operatorState : true));
    },

    async createReplayPlan(plan) {
      const rows = await sql`
        insert into async_job_replay_plans (
          replay_plan_id, job_id, company_id, planned_by_user_id, reason_code,
          planned_payload_strategy, status, approved_by_user_id, replay_job_id,
          planned_at, approved_at, executed_at, created_at, updated_at
        ) values (
          ${plan.replayPlanId}, ${plan.jobId}, ${plan.companyId}, ${plan.plannedByUserId},
          ${plan.reasonCode}, ${plan.plannedPayloadStrategy}, ${plan.status}, ${plan.approvedByUserId},
          ${plan.replayJobId}, ${plan.plannedAt}, ${plan.approvedAt}, ${plan.executedAt},
          ${plan.createdAt}, ${plan.updatedAt}
        )
        returning *
      `;
      return mapReplayPlanRow(rows[0]);
    },

    async listReplayPlans(filters = {}) {
      const rows = await sql`
        select *
        from async_job_replay_plans
        order by created_at desc
      `;
      return rows
        .map(mapReplayPlanRow)
        .filter((plan) => (filters.jobId ? plan.jobId === filters.jobId : true))
        .filter((plan) => (filters.status ? plan.status === filters.status : true));
    },

    async getReplayPlan(replayPlanId) {
      const rows = await sql`
        select *
        from async_job_replay_plans
        where replay_plan_id = ${replayPlanId}
        limit 1
      `;
      return mapReplayPlanRow(rows[0]);
    },

    async approveReplayPlan({ replayPlanId, approvedByUserId, approvedAt }) {
      const rows = await sql`
        update async_job_replay_plans
        set status = 'approved',
            approved_by_user_id = ${approvedByUserId},
            approved_at = ${approvedAt},
            updated_at = ${approvedAt}
        where replay_plan_id = ${replayPlanId}
        returning *
      `;
      return mapReplayPlanRow(rows[0]);
    },

    async markReplayPlanExecuted({ replayPlanId, replayJobId, executedAt }) {
      const rows = await sql`
        update async_job_replay_plans
        set status = 'executed',
            replay_job_id = ${replayJobId},
            executed_at = ${executedAt},
            updated_at = ${executedAt}
        where replay_plan_id = ${replayPlanId}
        returning *
      `;
      return mapReplayPlanRow(rows[0]);
    }
  };

  logger("async job store using postgres backend");
  return store;
}
