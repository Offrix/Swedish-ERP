import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { createDefaultJobHandlers, runWorkerBatch } from "../../apps/worker/src/worker.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { loginWithStrongAuthOnPlatform } from "../helpers/platform-auth.mjs";

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

test("Phase 14 Step 4 async jobs do not run while their controlling kill switch is disabled", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T11:00:00Z")
  });
  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });

  platform.upsertFeatureFlag({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    flagKey: "jobs.system_noop_enabled",
    description: "Controls the noop worker lane.",
    flagType: "kill_switch",
    scopeType: "company",
    scopeRef: DEMO_IDS.companyId,
    defaultEnabled: true,
    enabled: true,
    ownerUserId: DEMO_IDS.userId,
    riskClass: "high",
    sunsetAt: "2026-12-31"
  });

  const queuedJob = await platform.enqueueRuntimeJob({
    companyId: DEMO_IDS.companyId,
    jobType: "system.noop",
    sourceObjectType: "test_fixture",
    sourceObjectId: "noop-disabled",
    idempotencyKey: "step4-noop-disabled",
    payload: { noop: true },
    metadata: { featureFlagKey: "jobs.system_noop_enabled" },
    actorId: "system"
  });

  platform.requestEmergencyDisable({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    flagKey: "jobs.system_noop_enabled",
    scopeType: "company",
    scopeRef: DEMO_IDS.companyId,
    reasonCode: "incident_lockdown",
    expiresInMinutes: 30
  });

  const processed = await runWorkerBatch({
    platform,
    handlers: createDefaultJobHandlers({ logger: () => {} }),
    logger: () => {},
    workerId: "worker-step4-disabled"
  });
  const jobAfterBatch = await platform.getRuntimeJob({ jobId: queuedJob.jobId });
  const attempts = await platform.listRuntimeJobAttempts({ jobId: queuedJob.jobId });

  assert.equal(processed, 0);
  assert.equal(jobAfterBatch.status, "queued");
  assert.equal(attempts.length, 0);
});

test("Phase 14 Step 4 async jobs are blocked before execution if a kill switch flips after claim", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T11:30:00Z")
  });
  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });

  platform.upsertFeatureFlag({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    flagKey: "jobs.system_noop_enabled",
    description: "Controls the noop worker lane.",
    flagType: "kill_switch",
    scopeType: "company",
    scopeRef: DEMO_IDS.companyId,
    defaultEnabled: true,
    enabled: true,
    ownerUserId: DEMO_IDS.userId,
    riskClass: "high",
    sunsetAt: "2026-12-31"
  });

  const queuedJob = await platform.enqueueRuntimeJob({
    companyId: DEMO_IDS.companyId,
    jobType: "system.noop",
    sourceObjectType: "test_fixture",
    sourceObjectId: "noop-disable-after-claim",
    idempotencyKey: "step4-noop-disable-after-claim",
    payload: { noop: true },
    metadata: { featureFlagKey: "jobs.system_noop_enabled" },
    actorId: "system"
  });

  const [claimedJob] = await platform.claimAvailableRuntimeJobs({
    workerId: "worker-step4-disable-after-claim",
    limit: 1,
    claimTtlSeconds: 120
  });
  assert.equal(claimedJob.jobId, queuedJob.jobId);

  platform.requestEmergencyDisable({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    flagKey: "jobs.system_noop_enabled",
    scopeType: "company",
    scopeRef: DEMO_IDS.companyId,
    reasonCode: "incident_lockdown",
    expiresInMinutes: 30
  });

  const started = await platform.startRuntimeJobAttempt({
    jobId: queuedJob.jobId,
    claimToken: claimedJob.claimToken,
    workerId: "worker-step4-disable-after-claim"
  });
  const jobAfterStart = await platform.getRuntimeJob({ jobId: queuedJob.jobId });
  const attempts = await platform.listRuntimeJobAttempts({ jobId: queuedJob.jobId });

  assert.equal(started.skipped, true);
  assert.equal(started.skipReasonCode, "async_job_feature_disabled");
  assert.equal(jobAfterStart.status, "queued");
  assert.equal(attempts.length, 0);
});
