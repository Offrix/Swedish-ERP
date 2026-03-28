import os from "node:os";
import { createApiPlatform } from "../../api/src/platform.mjs";
import { createInMemoryAsyncJobStore, createPostgresAsyncJobStore } from "../../../packages/domain-core/src/jobs.mjs";
import { isMainModule } from "../../../scripts/lib/repo.mjs";
import { assertRuntimeStartupAllowed } from "../../../scripts/lib/runtime-diagnostics.mjs";

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
    },
    "notifications.expire_due": async ({ job, platform }) => {
      const result = platform.expireNotificationsDue({
        companyId: typeof job.payload?.companyId === "string" ? job.payload.companyId : null,
        asOf: typeof job.payload?.asOf === "string" ? job.payload.asOf : null,
        actorId: "worker_scheduler",
        reasonCode: typeof job.payload?.reasonCode === "string" ? job.payload.reasonCode : "notification_ttl_elapsed"
      });
      logger(`worker expired ${result.totalCount} notifications for job ${job.jobId}`);
      return {
        resultCode: "notifications_expired",
        resultPayload: {
          totalCount: result.totalCount,
          notificationIds: result.items.map((item) => item.notificationId)
        }
      };
    },
    "notifications.build_digest": async ({ job, platform }) => {
      const digest = platform.buildNotificationDigest({
        companyId: job.companyId,
        recipientType: typeof job.payload?.recipientType === "string" ? job.payload.recipientType : "user",
        recipientId: job.payload?.recipientId,
        categoryCode: typeof job.payload?.categoryCode === "string" ? job.payload.categoryCode : null,
        onlyUnread: job.payload?.onlyUnread !== false,
        generatedAt: typeof job.payload?.generatedAt === "string" ? job.payload.generatedAt : null
      });
      logger(`worker built notification digest for ${digest.recipientType}:${digest.recipientId} in job ${job.jobId}`);
      return {
        resultCode: "notification_digest_built",
        resultPayload: digest
      };
    },
    "documents.ocr.requested": async ({ job, platform }) => {
      const result = platform.runDocumentOcr({
        companyId: job.companyId,
        documentId: job.payload?.documentId,
        reasonCode: typeof job.payload?.reasonCode === "string" ? job.payload.reasonCode : undefined,
        actorId: "worker_scheduler"
      });
      logger(`worker ran OCR for document ${result.document.documentId} in job ${job.jobId}`);
      return {
        resultCode: "document_ocr_completed",
        resultPayload: {
          documentId: result.document.documentId,
          ocrRunId: result.ocrRun.ocrRunId,
          suggestedDocumentType: result.ocrRun.suggestedDocumentType,
          reviewTaskId: result.reviewTask?.reviewTaskId || null
        }
      };
    },
    "submission.transport": async ({ job, platform }) => {
      const result = platform.executeAuthoritySubmissionTransport({
        companyId: job.companyId,
        submissionId: job.payload?.submissionId,
        jobId: job.jobId,
        actorId: "worker_scheduler",
        mode:
          typeof job.payload?.mode === "string"
            ? job.payload.mode
            : platform.getRuntimeModeProfile?.().environmentMode || platform.environmentMode || "test",
        simulatedTransportOutcome: typeof job.payload?.simulatedTransportOutcome === "string" ? job.payload.simulatedTransportOutcome : "technical_ack",
        providerReference: typeof job.payload?.providerReference === "string" ? job.payload.providerReference : null,
        message: typeof job.payload?.message === "string" ? job.payload.message : null,
        requiredInput: Array.isArray(job.payload?.requiredInput) ? job.payload.requiredInput : []
      });
      logger(`worker processed submission transport ${result.submissionId} in job ${job.jobId}`);
      return {
        resultCode: result.executionSkipped === true ? "submission_transport_skipped" : "submission_transport_completed",
        resultPayload: {
          submissionId: result.submissionId,
          status: result.status,
          receiptTypes: Array.isArray(result.receipts) ? result.receipts.map((receipt) => receipt.receiptType) : [],
          skipReasonCode: result.skipReasonCode || null
        }
      };
    },
    "submission.receipt.collect": async ({ job, platform }) => {
      const result = platform.executeSubmissionReceiptCollection({
        companyId: job.companyId,
        submissionId: job.payload?.submissionId,
        jobId: job.jobId,
        actorId: "worker_scheduler",
        simulatedReceiptType: typeof job.payload?.simulatedReceiptType === "string" ? job.payload.simulatedReceiptType : null,
        providerStatus: typeof job.payload?.providerStatus === "string" ? job.payload.providerStatus : null,
        message: typeof job.payload?.message === "string" ? job.payload.message : null,
        requiredInput: Array.isArray(job.payload?.requiredInput) ? job.payload.requiredInput : []
      });
      logger(`worker collected submission receipts ${result.submissionId} in job ${job.jobId}`);
      return {
        resultCode: result.executionSkipped === true ? "submission_receipt_collection_skipped" : "submission_receipt_collection_completed",
        resultPayload: {
          submissionId: result.submissionId,
          status: result.status,
          receiptTypes: Array.isArray(result.receipts) ? result.receipts.map((receipt) => receipt.receiptType) : [],
          skipReasonCode: result.skipReasonCode || null
        }
      };
    },
    "search.saved_view_compatibility_scan": async ({ job, platform }) => {
      const result = platform.runSavedViewCompatibilityScan({
        companyId: job.companyId,
        surfaceCode: typeof job.payload?.surfaceCode === "string" ? job.payload.surfaceCode : null,
        actorId: "worker_scheduler"
      });
      logger(`worker scanned ${result.scannedCount} saved views for compatibility in job ${job.jobId}`);
      return {
        resultCode: "saved_view_compatibility_scanned",
        resultPayload: result
      };
    },
    "search.reindex": async ({ job, platform }) => {
      const result = platform.executeSearchReindexRequest({
        companyId: job.companyId,
        searchReindexRequestId: job.payload?.searchReindexRequestId,
        actorId: "worker_scheduler"
      });
      logger(`worker completed search reindex ${result.reindexRequest.searchReindexRequestId} for job ${job.jobId}`);
      return {
        resultCode: "search_reindex_completed",
        resultPayload: {
          searchReindexRequestId: result.reindexRequest.searchReindexRequestId,
          indexingSummary: result.indexingSummary
        }
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
    let traceSpan = null;
    try {
      started = await platform.startRuntimeJobAttempt({
        jobId: claimedJob.jobId,
        claimToken: claimedJob.claimToken,
        workerId
      });
      if (started?.skipped) {
        if (typeof platform.recordStructuredLog === "function") {
          platform.recordStructuredLog({
            companyId: claimedJob.companyId,
            surfaceCode: "worker",
            severity: "warn",
            eventCode: "worker.job.skipped",
            message: `Skipped async job ${started.job.jobType} because ${started.skipReasonCode}.`,
            correlationId: started.job.correlationId || null,
            sourceObjectType: "async_job",
            sourceObjectId: started.job.jobId,
            actorId: workerId,
            metadata: {
              jobType: started.job.jobType,
              skipReasonCode: started.skipReasonCode
            }
          });
        }
        logger(`worker skipped job ${started.job.jobId} (${started.job.jobType}) because ${started.skipReasonCode}`);
        processedJobs += 1;
        continue;
      }
      if (typeof platform.startTraceSpan === "function") {
        traceSpan = platform.startTraceSpan({
          companyId: started.job.companyId,
          traceCode: "worker.job",
          correlationId: started.job.correlationId || started.job.jobId,
          sourceObjectType: "async_job",
          sourceObjectId: started.job.jobId,
          actorId: workerId,
          attributes: {
            surfaceCode: "worker",
            jobType: started.job.jobType,
            workerId
          }
        });
      }
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
      if (typeof platform.recordStructuredLog === "function") {
        platform.recordStructuredLog({
          companyId: started.job.companyId,
          surfaceCode: "worker",
          severity: "info",
          eventCode: "worker.job.completed",
          message: `Completed async job ${started.job.jobType}.`,
          correlationId: started.job.correlationId || null,
          traceId: traceSpan?.traceId || null,
          spanId: traceSpan?.spanId || null,
          sourceObjectType: "async_job",
          sourceObjectId: started.job.jobId,
          actorId: workerId,
          metadata: {
            jobType: started.job.jobType,
            resultCode: result?.resultCode || "succeeded"
          }
        });
      }
      if (traceSpan && typeof platform.completeTraceSpan === "function") {
        platform.completeTraceSpan({
          spanId: traceSpan.spanId,
          outcomeCode: result?.resultCode || "succeeded",
          resultSummary: {
            jobType: started.job.jobType,
            jobId: started.job.jobId
          }
        });
      }
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
      if (typeof platform.recordStructuredLog === "function") {
        platform.recordStructuredLog({
          companyId: referenceJob.companyId,
          surfaceCode: "worker",
          severity: "error",
          eventCode: "worker.job.failed",
          message: failure.errorMessage,
          correlationId: referenceJob.correlationId || null,
          traceId: traceSpan?.traceId || null,
          spanId: traceSpan?.spanId || null,
          sourceObjectType: "async_job",
          sourceObjectId: referenceJob.jobId,
          actorId: workerId,
          metadata: {
            jobType: referenceJob.jobType,
            errorCode: failure.errorCode,
            errorClass: failure.errorClass,
            retryDelaySeconds: failure.retryDelaySeconds,
            terminalReason: failure.terminalReason
          }
        });
      }
      if (traceSpan && typeof platform.failTraceSpan === "function") {
        platform.failTraceSpan({
          spanId: traceSpan.spanId,
          errorCode: failure.errorCode,
          errorMessage: failure.errorMessage,
          resultSummary: {
            jobType: referenceJob.jobType,
            jobId: referenceJob.jobId
          }
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
  env = process.env,
  runtimeMode = null,
  enforceExplicitRuntimeMode = true
} = {}) {
  const resolvedJobStore = jobStore || resolveWorkerJobStore({ env, logger });
  const resolvedPlatform = platform || createApiPlatform({
    asyncJobStore: resolvedJobStore,
    asyncJobStoreKind: resolvedJobStore.kind,
    startupSurface: "worker",
    env,
    runtimeMode,
    enforceExplicitRuntimeMode
  });
  const runtimeDiagnostics =
    typeof resolvedPlatform.scanRuntimeInvariants === "function"
      ? resolvedPlatform.scanRuntimeInvariants({
          startupSurface: "worker",
          activeStoreKind: resolvedJobStore.kind
        })
      : typeof resolvedPlatform.getRuntimeStartupDiagnostics === "function"
        ? resolvedPlatform.getRuntimeStartupDiagnostics()
        : null;
  assertRuntimeStartupAllowed({
    diagnostics: runtimeDiagnostics,
    starter: "worker"
  });
  const workerId = buildWorkerId(env);

  let stopped = false;
  let timer = null;
  let activeRun = Promise.resolve();

  logger(
    `worker started with poll interval ${intervalMs}ms, worker id ${workerId}, mode ${resolvedPlatform.environmentMode}, store ${
      runtimeDiagnostics?.activeStoreKind || resolvedJobStore.kind
    } and findings ${runtimeDiagnostics?.summary?.totalCount || 0}`
  );
  if (typeof resolvedPlatform.recordStructuredLog === "function") {
    resolvedPlatform.recordStructuredLog({
      surfaceCode: "worker",
      severity: "info",
      eventCode: "worker.startup",
      message: `Worker started with id ${workerId}.`,
      actorId: workerId,
      metadata: {
        intervalMs,
        batchSize,
        claimTtlSeconds,
        environmentMode: resolvedPlatform.environmentMode,
        activeStoreKind: runtimeDiagnostics?.activeStoreKind || resolvedJobStore.kind,
        runtimeFindingCount: runtimeDiagnostics?.summary?.totalCount || 0
      }
    });
  }

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
    runtimeDiagnostics,
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
            if (typeof resolvedPlatform.closeCriticalDomainStateStore === "function") {
              resolvedPlatform.closeCriticalDomainStateStore();
            }
            logger("worker stopped");
          })
          .catch(() => {});
      }
  };
}

if (isMainModule(import.meta.url)) {
  const runtime = startWorker({
    enforceExplicitRuntimeMode: true
  });
  process.on("SIGINT", () => {
    runtime.stop();
    process.exit(0);
  });
}
