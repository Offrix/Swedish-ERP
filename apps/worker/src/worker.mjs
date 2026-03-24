import os from "node:os";
import { createApiPlatform } from "../../api/src/platform.mjs";
import { createInMemoryAsyncJobStore, createPostgresAsyncJobStore } from "../../../packages/domain-core/src/jobs.mjs";
import { isMainModule } from "../../../scripts/lib/repo.mjs";

function createWorkerError(message, { retryable = false, retryDelaySeconds = null, errorClass = "persistent_technical", errorCode = "worker_failure", replayAllowed = true } = {}) {
  const error = new Error(message);
  error.retryable = retryable;
  error.retryDelaySeconds = retryDelaySeconds;
  error.errorClass = errorClass;
  error.errorCode = errorCode;
  error.replayAllowed = replayAllowed;
  return error;
}

export function createDefaultJobHandlers({ logger = console.log } = {}) {
  return Object.freeze({
    "system.noop": async ({ job }) => {
      logger(`worker noop handler acknowledged ${job.jobId}`);
      return {
        resultCode: "noop"
      };
    }
  });
}

function buildWorkerId(env = process.env) {
  return env.WORKER_ID || `${os.hostname()}:${process.pid}`;
}

function shouldUsePostgresJobStore(env = process.env) {
  if (env.WORKER_JOB_STORE === "memory") {
    return false;
  }
  if (env.WORKER_JOB_STORE === "postgres") {
    return true;
  }
  return Boolean(env.POSTGRES_URL || env.DATABASE_URL || env.POSTGRES_HOST);
}

export function resolveWorkerJobStore({ env = process.env, logger = console.log } = {}) {
  if (shouldUsePostgresJobStore(env)) {
    logger("worker using postgres async job store");
    return createPostgresAsyncJobStore({ env, logger });
  }
  logger("worker using in-memory async job store");
  return createInMemoryAsyncJobStore();
}

function classifyWorkerFailure(error, attemptNo, maxAttempts) {
  const errorClass = typeof error?.errorClass === "string" ? error.errorClass : error?.retryable ? "transient_technical" : "persistent_technical";
  const errorCode = typeof error?.errorCode === "string" ? error.errorCode : "worker_failure";
  const errorMessage = typeof error?.message === "string" && error.message.trim().length > 0 ? error.message.trim() : "Worker execution failed.";
  const configuredRetryDelay = Number.isInteger(error?.retryDelaySeconds) && error.retryDelaySeconds > 0 ? error.retryDelaySeconds : null;
  const retryDelaySeconds = error?.retryable === true ? configuredRetryDelay || Math.min(30 * 2 ** Math.max(0, attemptNo - 1), 900) : null;
  const exhaustedAttempts = attemptNo >= maxAttempts;
  return {
    errorClass,
    errorCode,
    errorMessage,
    retryDelaySeconds: exhaustedAttempts ? null : retryDelaySeconds,
    terminalReason: exhaustedAttempts ? "max_attempts_exhausted" : errorCode,
    replayAllowed: error?.replayAllowed !== false
  };
}

export async function runWorkerBatch({
  platform,
  handlers = createDefaultJobHandlers(),
  batchSize = Number(process.env.WORKER_BATCH_SIZE || 10),
  claimTtlSeconds = Number(process.env.WORKER_CLAIM_TTL_SECONDS || 120),
  workerId = buildWorkerId(),
  logger = console.log
} = {}) {
  const claimedJobs = await platform.claimAvailableRuntimeJobs({
    workerId,
    limit: batchSize,
    claimTtlSeconds
  });
  let processedJobs = 0;

  for (const claimedJob of claimedJobs) {
    let started = null;
    try {
      started = await platform.startRuntimeJobAttempt({
        jobId: claimedJob.jobId,
        claimToken: claimedJob.claimToken,
        workerId
      });
      const handler = handlers[started.job.jobType];
      if (!handler) {
        throw createWorkerError(`No handler registered for async job type ${started.job.jobType}.`, {
          retryable: false,
          errorClass: "persistent_technical",
          errorCode: "job_handler_missing"
        });
      }
      const result = await handler({
        job: started.job,
        attempt: started.attempt,
        platform,
        workerId,
        logger
      });
      await platform.completeRuntimeJob({
        jobId: started.job.jobId,
        claimToken: started.job.claimToken,
        workerId,
        attemptId: started.attempt.jobAttemptId,
        resultCode: result?.resultCode || "succeeded",
        resultPayload: result?.resultPayload || result?.payload || {}
      });
      logger(`worker completed job ${started.job.jobId} (${started.job.jobType})`);
    } catch (error) {
      const referenceJob = started?.job || claimedJob;
      const referenceAttempt = started?.attempt || { attemptNo: Number(referenceJob.attemptCount || 0) + 1, jobAttemptId: null };
      const failure = classifyWorkerFailure(error, referenceAttempt.attemptNo, referenceJob.maxAttempts || 1);
      if (started?.attempt?.jobAttemptId) {
        await platform.failRuntimeJob({
          jobId: referenceJob.jobId,
          claimToken: referenceJob.claimToken,
          workerId,
          attemptId: started.attempt.jobAttemptId,
          errorClass: failure.errorClass,
          errorCode: failure.errorCode,
          errorMessage: failure.errorMessage,
          retryDelaySeconds: failure.retryDelaySeconds,
          terminalReason: failure.terminalReason,
          replayAllowed: failure.replayAllowed
        });
      }
      logger(`worker failed job ${referenceJob.jobId} (${referenceJob.jobType}) with ${failure.errorCode}`);
    }
    processedJobs += 1;
  }

  return processedJobs;
}

export function startWorker({
  intervalMs = Number(process.env.WORKER_INTERVAL_MS || 5000),
  batchSize = Number(process.env.WORKER_BATCH_SIZE || 10),
  claimTtlSeconds = Number(process.env.WORKER_CLAIM_TTL_SECONDS || 120),
  logger = console.log,
  handlers = createDefaultJobHandlers({ logger }),
  platform = null,
  jobStore = null,
  env = process.env
} = {}) {
  const resolvedJobStore = jobStore || resolveWorkerJobStore({ env, logger });
  const resolvedPlatform = platform || createApiPlatform({
    asyncJobStore: resolvedJobStore
  });
  const workerId = buildWorkerId(env);

  let stopped = false;
  let timer = null;
  let activeRun = Promise.resolve();

  logger(`worker started with poll interval ${intervalMs}ms and worker id ${workerId}`);

  async function tick() {
    if (stopped) {
      return;
    }
    try {
      const processed = await runWorkerBatch({
        platform: resolvedPlatform,
        handlers,
        batchSize,
        claimTtlSeconds,
        workerId,
        logger
      });
      logger(`worker heartbeat ${new Date().toISOString()} processed=${processed}`);
    } catch (error) {
      logger(`worker loop failure ${error?.message || "unknown_error"}`);
    } finally {
      if (!stopped) {
        timer = setTimeout(() => {
          activeRun = tick();
        }, intervalMs);
      }
    }
  }

  activeRun = tick();

  return {
    intervalMs,
    batchSize,
    claimTtlSeconds,
    workerId,
    platform: resolvedPlatform,
    asyncJobStoreKind: resolvedJobStore.kind,
    stop() {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
      }
      Promise.resolve(activeRun)
        .finally(async () => {
          if (typeof resolvedPlatform.closeRuntimeJobStore === "function") {
            await resolvedPlatform.closeRuntimeJobStore();
          }
          logger("worker stopped");
        })
        .catch(() => {});
    }
  };
}

if (isMainModule(import.meta.url)) {
  const runtime = startWorker();
  process.on("SIGINT", () => {
    runtime.stop();
    process.exit(0);
  });
}
