import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { createDefaultJobHandlers, runWorkerBatch } from "../../apps/worker/src/worker.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_APPROVER_IDS, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
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
  platform.createObjectGrant({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    companyUserId: DEMO_APPROVER_IDS.companyUserId,
    permissionCode: "company.manage",
    objectType: "feature_flag",
    objectId: DEMO_IDS.companyId
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
    sunsetAt: "2026-12-31",
    changeReason: "Noop lane remains available until incident disable triggers.",
    approvalActorIds: [DEMO_APPROVER_IDS.userId]
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
  platform.createObjectGrant({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    companyUserId: DEMO_APPROVER_IDS.companyUserId,
    permissionCode: "company.manage",
    objectType: "feature_flag",
    objectId: DEMO_IDS.companyId
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
    sunsetAt: "2026-12-31",
    changeReason: "Noop lane remains available until incident disable triggers.",
    approvalActorIds: [DEMO_APPROVER_IDS.userId]
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

test("Phase 14 Step 4 worker expires due notifications through scheduled runtime jobs", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T12:00:00Z")
  });

  const dueNotification = platform.createNotification({
    companyId: DEMO_IDS.companyId,
    recipientType: "user",
    recipientId: DEMO_IDS.userId,
    categoryCode: "deadline_warning",
    priorityCode: "medium",
    sourceDomainCode: "CORE",
    sourceObjectType: "work_item",
    sourceObjectId: "work-notify-expire-1",
    title: "Deadline warning",
    body: "This notification should expire in the scheduler.",
    expiresAt: "2026-03-24T11:00:00Z",
    actorId: "system"
  });
  const futureNotification = platform.createNotification({
    companyId: DEMO_IDS.companyId,
    recipientType: "user",
    recipientId: DEMO_IDS.userId,
    categoryCode: "deadline_warning",
    priorityCode: "low",
    sourceDomainCode: "CORE",
    sourceObjectType: "work_item",
    sourceObjectId: "work-notify-expire-2",
    title: "Future warning",
    body: "This notification should remain active.",
    expiresAt: "2026-03-24T13:00:00Z",
    actorId: "system"
  });

  const queuedJob = await platform.enqueueRuntimeJob({
    companyId: DEMO_IDS.companyId,
    jobType: "notifications.expire_due",
    sourceObjectType: "notification_center",
    sourceObjectId: DEMO_IDS.companyId,
    idempotencyKey: "step4-notification-expire-due",
    payload: {
      companyId: DEMO_IDS.companyId,
      asOf: "2026-03-24T12:00:00Z",
      reasonCode: "notification_ttl_elapsed"
    },
    actorId: "system"
  });

  const processed = await runWorkerBatch({
    platform,
    handlers: createDefaultJobHandlers({ logger: () => {} }),
    logger: () => {},
    workerId: "worker-step4-notifications-expire"
  });
  assert.equal(processed, 1);

  const completedJob = await platform.getRuntimeJob({ jobId: queuedJob.jobId });
  const dueAfter = platform.getNotification({
    companyId: DEMO_IDS.companyId,
    notificationId: dueNotification.notificationId
  });
  const futureAfter = platform.getNotification({
    companyId: DEMO_IDS.companyId,
    notificationId: futureNotification.notificationId
  });

  assert.equal(completedJob.status, "succeeded");
  assert.equal(completedJob.lastResultCode, "notifications_expired");
  assert.equal(dueAfter.status, "expired");
  assert.equal(futureAfter.status, "created");
});

test("Phase 14 Step 4 worker builds notification digests for scheduled delivery lanes", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T12:30:00Z")
  });

  const unreadNotification = platform.createNotification({
    companyId: DEMO_IDS.companyId,
    recipientType: "user",
    recipientId: DEMO_IDS.userId,
    categoryCode: "review_due",
    priorityCode: "high",
    sourceDomainCode: "REVIEW_CENTER",
    sourceObjectType: "review_item",
    sourceObjectId: "review-digest-job-1",
    title: "Digest review",
    body: "Unread digest item.",
    actorId: "system"
  });
  const handledNotification = platform.createNotification({
    companyId: DEMO_IDS.companyId,
    recipientType: "user",
    recipientId: DEMO_IDS.userId,
    categoryCode: "deadline_warning",
    priorityCode: "low",
    sourceDomainCode: "CORE",
    sourceObjectType: "work_item",
    sourceObjectId: "work-digest-job-2",
    title: "Handled digest item",
    body: "This should not remain in the unread digest.",
    actorId: "system"
  });
  platform.acknowledgeNotification({
    companyId: DEMO_IDS.companyId,
    notificationId: handledNotification.notificationId,
    actorId: DEMO_IDS.userId
  });

  const queuedJob = await platform.enqueueRuntimeJob({
    companyId: DEMO_IDS.companyId,
    jobType: "notifications.build_digest",
    sourceObjectType: "notification_center",
    sourceObjectId: DEMO_IDS.userId,
    idempotencyKey: "step4-notification-digest-user",
    payload: {
      recipientType: "user",
      recipientId: DEMO_IDS.userId,
      onlyUnread: true
    },
    actorId: "system"
  });

  const processed = await runWorkerBatch({
    platform,
    handlers: createDefaultJobHandlers({ logger: () => {} }),
    logger: () => {},
    workerId: "worker-step4-notifications-digest"
  });
  assert.equal(processed, 1);

  const completedJob = await platform.getRuntimeJob({ jobId: queuedJob.jobId });
  const attempts = await platform.listRuntimeJobAttempts({ jobId: queuedJob.jobId });
  assert.equal(completedJob.status, "succeeded");
  assert.equal(completedJob.lastResultCode, "notification_digest_built");
  assert.equal(attempts.length, 1);
  assert.deepEqual(attempts[0].resultPayload.notificationIds, [unreadNotification.notificationId]);
  assert.equal(attempts[0].resultPayload.unreadCount, 1);
});

test("Phase 14 Step 4 worker runs saved-view compatibility scans", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-25T13:00:00Z")
  });

  const brokenView = platform.createSavedView({
    companyId: DEMO_IDS.companyId,
    ownerUserId: DEMO_IDS.userId,
    surfaceCode: "desktop_reporting",
    title: "Broken compatibility view",
    queryJson: {
      projectionCode: "reporting.non_existing_projection"
    },
    actorId: DEMO_IDS.userId
  });
  assert.equal(brokenView.status, "broken");

  const queuedJob = await platform.enqueueRuntimeJob({
    companyId: DEMO_IDS.companyId,
    jobType: "search.saved_view_compatibility_scan",
    sourceObjectType: "saved_view",
    sourceObjectId: brokenView.savedViewId,
    idempotencyKey: "step4-saved-view-compat-scan",
    payload: {
      surfaceCode: "desktop_reporting"
    },
    actorId: "system"
  });

  const processed = await runWorkerBatch({
    platform,
    handlers: createDefaultJobHandlers({ logger: () => {} }),
    logger: () => {},
    workerId: "worker-step4-saved-view-compat"
  });
  assert.equal(processed, 1);

  const completedJob = await platform.getRuntimeJob({ jobId: queuedJob.jobId });
  const attempts = await platform.listRuntimeJobAttempts({ jobId: queuedJob.jobId });
  assert.equal(completedJob.status, "succeeded");
  assert.equal(completedJob.lastResultCode, "saved_view_compatibility_scanned");
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].resultPayload.scannedCount >= 1, true);
  assert.equal(attempts[0].resultPayload.items.some((item) => item.savedViewId === brokenView.savedViewId), true);
});
