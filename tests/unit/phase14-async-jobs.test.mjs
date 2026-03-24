import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { createDefaultJobHandlers, runWorkerBatch } from "../../apps/worker/src/worker.mjs";

test("Phase 14 Step 4 async jobs support retry scheduling and completion", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T10:00:00Z")
  });

  const queuedJob = await platform.enqueueRuntimeJob({
    companyId: "00000000-0000-4000-8000-000000000001",
    jobType: "system.noop",
    sourceObjectType: "test_fixture",
    sourceObjectId: "noop-1",
    idempotencyKey: "step4-noop-1",
    payload: { noop: true },
    actorId: "system"
  });
  assert.equal(queuedJob.status, "queued");

  const processed = await runWorkerBatch({
    platform,
    handlers: createDefaultJobHandlers({ logger: () => {} }),
    logger: () => {},
    workerId: "worker-step4"
  });
  assert.equal(processed, 1);

  const completedJob = await platform.getRuntimeJob({ jobId: queuedJob.jobId });
  const attempts = await platform.listRuntimeJobAttempts({ jobId: queuedJob.jobId });
  assert.equal(completedJob.status, "succeeded");
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].resultCode, "noop");
});

test("Phase 14 Step 4 async jobs dead-letter unsupported handlers and allow replay planning", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T10:30:00Z")
  });

  const queuedJob = await platform.enqueueRuntimeJob({
    companyId: "00000000-0000-4000-8000-000000000001",
    jobType: "documents.ocr.requested",
    sourceObjectType: "document",
    sourceObjectId: "doc-42",
    idempotencyKey: "step4-ocr-missing-handler",
    payload: { documentId: "doc-42" },
    actorId: "system"
  });

  await runWorkerBatch({
    platform,
    handlers: {},
    logger: () => {},
    workerId: "worker-step4"
  });

  const deadLetteredJob = await platform.getRuntimeJob({ jobId: queuedJob.jobId });
  const deadLetters = await platform.listRuntimeDeadLetters({
    companyId: queuedJob.companyId
  });
  assert.equal(deadLetteredJob.status, "dead_lettered");
  assert.equal(deadLetters.some((candidate) => candidate.jobId === queuedJob.jobId), true);

  const replayPlan = await platform.planRuntimeJobReplay({
    jobId: queuedJob.jobId,
    plannedByUserId: "00000000-0000-4000-8000-000000000001",
    reasonCode: "handler_added"
  });
  assert.equal(replayPlan.status, "planned");
});
