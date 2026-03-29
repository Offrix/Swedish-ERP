import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { createDefaultJobHandlers, runWorkerBatch } from "../../apps/worker/src/worker.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_APPROVER_IDS, DEMO_IDS, DEMO_TEAM_IDS } from "../../packages/domain-org-auth/src/index.mjs";
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
  assert.equal(attempts[0].status, "succeeded");
  assert.equal(typeof attempts[0].claimedAt, "string");
  assert.equal(typeof attempts[0].claimExpiresAt, "string");
  assert.equal(attempts[0].resultCode, "noop");
});

test("Phase 14 Step 4 async jobs dead-letter unsupported handlers and allow replay planning", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T10:30:00Z")
  });

  const queuedJob = await platform.enqueueRuntimeJob({
    companyId: "00000000-0000-4000-8000-000000000001",
    jobType: "system.replayable_noop",
    sourceObjectType: "test_fixture",
    sourceObjectId: "replayable-noop-1",
    idempotencyKey: "step4-replayable-noop-missing-handler",
    payload: { replay: true },
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
  const deadLetter = deadLetters.find((candidate) => candidate.jobId === queuedJob.jobId);
  assert.equal(deadLetteredJob.status, "dead_lettered");
  assert.equal(Boolean(deadLetter), true);
  assert.equal(deadLetter.poisonPillDetected, true);
  assert.equal(deadLetter.poisonReasonCode, "missing_handler");

  const replayPlan = await platform.planRuntimeJobReplay({
    jobId: queuedJob.jobId,
    plannedByUserId: "00000000-0000-4000-8000-000000000001",
    reasonCode: "handler_added"
  });
  assert.equal(replayPlan.status, "pending_approval");
  await assert.rejects(
    () =>
      platform.approveRuntimeJobReplay({
        replayPlanId: replayPlan.replayPlanId,
        approvedByUserId: "00000000-0000-4000-8000-000000000001"
      }),
    (error) => error?.code === "async_job_replay_self_approval_forbidden"
  );
  const approvedReplayPlan = await platform.approveRuntimeJobReplay({
    replayPlanId: replayPlan.replayPlanId,
    approvedByUserId: "00000000-0000-4000-8000-000000000002"
  });
  assert.equal(approvedReplayPlan.status, "approved");
  const executedReplay = await platform.executeRuntimeJobReplay({
    replayPlanId: replayPlan.replayPlanId,
    actorId: "00000000-0000-4000-8000-000000000002"
  });
  assert.equal(executedReplay.replayPlan.status, "scheduled");
  assert.equal(executedReplay.replayJob.metadata.replayPlanId, replayPlan.replayPlanId);

  const processedReplay = await runWorkerBatch({
    platform,
    handlers: {
      "system.replayable_noop": async () => ({
        resultCode: "replayed_noop",
        resultPayload: { replayed: true }
      })
    },
    logger: () => {},
    workerId: "worker-step4-replay"
  });
  assert.equal(processedReplay, 1);

  const finalReplayPlan = (await platform.listRuntimeJobReplayPlans({ jobId: queuedJob.jobId }))[0];
  const replayJob = await platform.getRuntimeJob({ jobId: executedReplay.replayJob.jobId });
  assert.equal(finalReplayPlan.status, "completed");
  assert.equal(finalReplayPlan.lastOutcomeCode, "replayed_noop");
  assert.equal(replayJob.status, "succeeded");
});

test("Phase 14 Step 4 async jobs recover claim expiry and dead-letter poison-pill crash loops", async () => {
  let currentTime = "2026-03-24T10:32:00Z";
  const platform = createApiPlatform({
    clock: () => new Date(currentTime)
  });

  const queuedJob = await platform.enqueueRuntimeJob({
    companyId: "00000000-0000-4000-8000-000000000001",
    jobType: "system.noop",
    sourceObjectType: "test_fixture",
    sourceObjectId: "claim-expiry-poison-1",
    idempotencyKey: "step4-claim-expiry-poison-1",
    payload: { noop: true },
    maxAttempts: 2,
    actorId: "system"
  });

  const [claimedJobOne] = await platform.claimAvailableRuntimeJobs({
    workerId: "worker-step4-poison-1",
    limit: 1,
    claimTtlSeconds: 60
  });
  assert.equal(claimedJobOne.jobId, queuedJob.jobId);

  await platform.startRuntimeJobAttempt({
    jobId: queuedJob.jobId,
    claimToken: claimedJobOne.claimToken,
    workerId: "worker-step4-poison-1"
  });

  currentTime = "2026-03-24T10:33:05Z";
  const reclaimedJobs = await platform.claimAvailableRuntimeJobs({
    workerId: "worker-step4-poison-2",
    limit: 1,
    claimTtlSeconds: 60
  });
  assert.equal(reclaimedJobs.length, 1);
  assert.equal(reclaimedJobs[0].jobId, queuedJob.jobId);

  const afterFirstRecovery = await platform.getRuntimeJob({ jobId: queuedJob.jobId });
  const attemptsAfterFirstRecovery = await platform.listRuntimeJobAttempts({ jobId: queuedJob.jobId });
  assert.equal(afterFirstRecovery.claimExpiryCount, 1);
  assert.equal(attemptsAfterFirstRecovery.length, 1);
  assert.equal(attemptsAfterFirstRecovery[0].status, "claim_expired");
  assert.equal(attemptsAfterFirstRecovery[0].errorCode, "worker_claim_expired");
  assert.equal(attemptsAfterFirstRecovery[0].resultCode, "claim_expired");

  const startedSecondAttempt = await platform.startRuntimeJobAttempt({
    jobId: queuedJob.jobId,
    claimToken: reclaimedJobs[0].claimToken,
    workerId: "worker-step4-poison-2"
  });
  assert.equal(startedSecondAttempt.attempt.attemptNo, 2);

  currentTime = "2026-03-24T10:34:10Z";
  const noFurtherClaims = await platform.claimAvailableRuntimeJobs({
    workerId: "worker-step4-poison-3",
    limit: 1,
    claimTtlSeconds: 60
  });
  assert.equal(noFurtherClaims.length, 0);

  const deadLetteredJob = await platform.getRuntimeJob({ jobId: queuedJob.jobId });
  const deadLetters = await platform.listRuntimeDeadLetters({
    companyId: queuedJob.companyId
  });
  const deadLetter = deadLetters.find((candidate) => candidate.jobId === queuedJob.jobId);
  const replayPlan = await platform.planRuntimeJobReplay({
    jobId: queuedJob.jobId,
    plannedByUserId: "00000000-0000-4000-8000-000000000001",
    reasonCode: "worker_crash_loop_resolved"
  });

  assert.equal(deadLetteredJob.status, "dead_lettered");
  assert.equal(deadLetteredJob.claimExpiryCount, 2);
  assert.equal(deadLetteredJob.lastErrorCode, "worker_claim_expired");
  assert.equal(deadLetter.operatorState, "pending_triage");
  assert.equal(deadLetter.poisonPillDetected, true);
  assert.equal(deadLetter.poisonReasonCode, "claim_expiry_loop");
  assert.equal(typeof deadLetter.poisonFingerprint, "string");
  assert.equal(deadLetter.latestAttemptId, startedSecondAttempt.attempt.jobAttemptId);
  assert.equal(replayPlan.status, "pending_approval");
});

test("Phase 14 Step 4 async jobs record synthetic attempts when a claim expires before execution starts", async () => {
  let currentTime = "2026-03-24T10:36:00Z";
  const platform = createApiPlatform({
    clock: () => new Date(currentTime)
  });

  const queuedJob = await platform.enqueueRuntimeJob({
    companyId: "00000000-0000-4000-8000-000000000001",
    jobType: "system.noop",
    sourceObjectType: "test_fixture",
    sourceObjectId: "claim-expiry-before-start-1",
    idempotencyKey: "step4-claim-expiry-before-start-1",
    payload: { noop: true },
    maxAttempts: 3,
    actorId: "system"
  });

  const [claimedJob] = await platform.claimAvailableRuntimeJobs({
    workerId: "worker-step4-claim-only",
    limit: 1,
    claimTtlSeconds: 60
  });
  assert.equal(claimedJob.jobId, queuedJob.jobId);

  currentTime = "2026-03-24T10:37:05Z";
  const reclaimedJobs = await platform.claimAvailableRuntimeJobs({
    workerId: "worker-step4-claim-only-recovery",
    limit: 1,
    claimTtlSeconds: 60
  });
  const attempts = await platform.listRuntimeJobAttempts({ jobId: queuedJob.jobId });
  const recoveredJob = await platform.getRuntimeJob({ jobId: queuedJob.jobId });

  assert.equal(reclaimedJobs.length, 1);
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].status, "claim_expired");
  assert.equal(attempts[0].startedAt, null);
  assert.equal(attempts[0].claimedAt, claimedJob.claimedAt);
  assert.equal(attempts[0].claimExpiresAt, claimedJob.claimExpiresAt);
  assert.equal(attempts[0].errorCode, "worker_claim_expired");
  assert.equal(recoveredJob.claimExpiryCount, 1);
  assert.equal(recoveredJob.attemptCount, 1);
});

test("Phase 2.4 async jobs extend claim expiry through heartbeats", async () => {
  let currentTime = "2026-03-24T10:38:00Z";
  const platform = createApiPlatform({
    clock: () => new Date(currentTime)
  });

  const queuedJob = await platform.enqueueRuntimeJob({
    companyId: "00000000-0000-4000-8000-000000000001",
    jobType: "system.noop",
    sourceObjectType: "test_fixture",
    sourceObjectId: "heartbeat-claim-1",
    idempotencyKey: "phase2-heartbeat-claim-1",
    payload: { noop: true },
    actorId: "system"
  });

  const [claimedJob] = await platform.claimAvailableRuntimeJobs({
    workerId: "worker-step4-heartbeat",
    limit: 1,
    claimTtlSeconds: 60
  });
  assert.equal(claimedJob.jobId, queuedJob.jobId);

  const started = await platform.startRuntimeJobAttempt({
    jobId: queuedJob.jobId,
    claimToken: claimedJob.claimToken,
    workerId: "worker-step4-heartbeat"
  });
  const originalJobExpiry = started.job.claimExpiresAt;
  const originalAttemptExpiry = started.attempt.claimExpiresAt;

  currentTime = "2026-03-24T10:38:45Z";
  const heartbeated = await platform.heartbeatRuntimeJobAttempt({
    jobId: queuedJob.jobId,
    claimToken: claimedJob.claimToken,
    workerId: "worker-step4-heartbeat",
    attemptId: started.attempt.jobAttemptId,
    claimTtlSeconds: 180
  });

  assert.equal(heartbeated.job.status, "running");
  assert.equal(heartbeated.attempt.status, "running");
  assert.ok(heartbeated.job.claimExpiresAt > originalJobExpiry);
  assert.ok(heartbeated.attempt.claimExpiresAt > originalAttemptExpiry);
});

test("Phase 2.4 worker records synthetic failed attempts when attempt start crashes before persistence", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T10:39:00Z")
  });

  const queuedJob = await platform.enqueueRuntimeJob({
    companyId: "00000000-0000-4000-8000-000000000001",
    jobType: "system.noop",
    sourceObjectType: "test_fixture",
    sourceObjectId: "attempt-start-crash-1",
    idempotencyKey: "phase2-attempt-start-crash-1",
    payload: { noop: true },
    actorId: "system"
  });

  const crashingPlatform = {
    ...platform,
    async startRuntimeJobAttempt() {
      const err = new Error("Attempt start crashed before persistence.");
      err.errorClass = "persistent_technical";
      err.errorCode = "worker_attempt_start_crash";
      err.retryable = false;
      err.replayAllowed = true;
      throw err;
    }
  };

  const processed = await runWorkerBatch({
    platform: crashingPlatform,
    handlers: createDefaultJobHandlers({ logger: () => {} }),
    logger: () => {},
    workerId: "worker-step4-attempt-start-crash"
  });

  const deadLetteredJob = await platform.getRuntimeJob({ jobId: queuedJob.jobId });
  const attempts = await platform.listRuntimeJobAttempts({ jobId: queuedJob.jobId });
  const deadLetters = await platform.listRuntimeDeadLetters({
    companyId: queuedJob.companyId
  });
  const deadLetter = deadLetters.find((candidate) => candidate.jobId === queuedJob.jobId);

  assert.equal(processed, 1);
  assert.equal(deadLetteredJob.status, "dead_lettered");
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].startedAt, null);
  assert.equal(attempts[0].errorCode, "worker_attempt_start_crash");
  assert.equal(attempts[0].status, "dead_lettered");
  assert.equal(Boolean(deadLetter), true);
  assert.equal(deadLetter.latestAttemptId, attempts[0].jobAttemptId);
});

test("Phase 14 Step 4 worker runs submission transport jobs through the shared runtime", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T10:35:00Z")
  });

  const submission = await platform.prepareAuthoritySubmission({
    companyId: DEMO_IDS.companyId,
    submissionType: "income_tax_return",
    sourceObjectType: "tax_declaration_package",
    sourceObjectId: "tax-package-1",
    providerKey: "skatteverket",
    recipientId: "skatteverket:income-tax",
    signedState: "signed",
    actorId: "system",
    payloadVersion: "1.0",
    payload: {
      packageId: "tax-package-1"
    }
  });

  const dispatched = await platform.submitAuthoritySubmission({
    companyId: DEMO_IDS.companyId,
    submissionId: submission.submissionId,
    actorId: "system",
    simulatedTransportOutcome: "technical_ack"
  });
  assert.equal(dispatched.transportQueued, true);
  assert.equal(typeof dispatched.queuedJob?.jobId, "string");

  const processed = await runWorkerBatch({
    platform,
    handlers: createDefaultJobHandlers({ logger: () => {} }),
    logger: () => {},
    workerId: "worker-step4-submission"
  });
  assert.equal(processed, 1);

  const completedJob = await platform.getRuntimeJob({ jobId: dispatched.queuedJob.jobId });
  const attempts = await platform.listRuntimeJobAttempts({ jobId: dispatched.queuedJob.jobId });
  const refreshedSubmission = platform.getAuthoritySubmission({
    companyId: DEMO_IDS.companyId,
    submissionId: submission.submissionId
  });

  assert.equal(completedJob.status, "succeeded");
  assert.equal(completedJob.lastResultCode, "submission_transport_completed");
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].resultPayload.submissionId, submission.submissionId);
  assert.equal(refreshedSubmission.status, "received");
  assert.deepEqual(
    refreshedSubmission.receipts.map((receipt) => receipt.receiptType),
    ["technical_ack"]
  );
});

test("Phase 13.3 worker keeps production submission transport on explicit official fallback path", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T10:37:00Z")
  });

  const submission = await platform.prepareAuthoritySubmission({
    companyId: DEMO_IDS.companyId,
    submissionType: "income_tax_return",
    sourceObjectType: "tax_declaration_package",
    sourceObjectId: "tax-package-13-3-worker",
    providerKey: "skatteverket",
    recipientId: "skatteverket:income-tax",
    signedState: "signed",
    actorId: "system",
    payloadVersion: "1.0",
    providerBaselineRefs: [
      {
        providerBaselineId: "annual-sru-export-se-2026.1",
        providerCode: "skatteverket",
        baselineCode: "SE-SRU-FILE",
        providerBaselineVersion: "2026.1",
        providerBaselineChecksum: "annual-sru-export-se-2026.1"
      }
    ],
    payload: {
      packageId: "tax-package-13-3-worker"
    }
  });

  const dispatched = await platform.submitAuthoritySubmission({
    companyId: DEMO_IDS.companyId,
    submissionId: submission.submissionId,
    actorId: "system",
    mode: "production"
  });
  assert.equal(dispatched.transportQueued, true);

  const processed = await runWorkerBatch({
    platform,
    handlers: createDefaultJobHandlers({ logger: () => {} }),
    logger: () => {},
    workerId: "worker-step4-submission-production-fallback"
  });
  assert.equal(processed, 1);

  const refreshedSubmission = platform.getAuthoritySubmission({
    companyId: DEMO_IDS.companyId,
    submissionId: submission.submissionId
  });
  assert.equal(refreshedSubmission.status, "submitted");
  assert.equal(refreshedSubmission.transportJobId, null);
  assert.equal(refreshedSubmission.canonicalEnvelope.envelopeState, "awaiting_receipts");
  assert.equal(refreshedSubmission.lastTransportPlan.fallbackActivated, true);
  assert.equal(refreshedSubmission.actionQueueItems.some((item) => item.actionType === "contact_provider"), true);
});

test("Phase 14 Step 4 worker collects later submission receipts through the shared runtime", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T10:40:00Z")
  });

  const submission = await platform.prepareAuthoritySubmission({
    companyId: DEMO_IDS.companyId,
    submissionType: "income_tax_return",
    sourceObjectType: "tax_declaration_package",
    sourceObjectId: "tax-package-2",
    providerKey: "skatteverket",
    recipientId: "skatteverket:income-tax",
    signedState: "signed",
    actorId: "system",
    payloadVersion: "1.0",
    payload: {
      packageId: "tax-package-2"
    }
  });
  const dispatched = await platform.submitAuthoritySubmission({
    companyId: DEMO_IDS.companyId,
    submissionId: submission.submissionId,
    actorId: "system",
    simulatedTransportOutcome: "technical_ack"
  });
  await runWorkerBatch({
    platform,
    handlers: createDefaultJobHandlers({ logger: () => {} }),
    logger: () => {},
    workerId: "worker-step4-submission-collect-transport"
  });

  const replay = await platform.requestSubmissionReplay({
    companyId: DEMO_IDS.companyId,
    submissionId: submission.submissionId,
    actorId: "system",
    reasonCode: "collect_missing_business_receipt",
    simulatedReceiptType: "business_ack",
    idempotencyKey: `replay:${dispatched.queuedJob.jobId}:business-ack`
  });
  assert.equal(replay.replayQueued, true);
  assert.equal(replay.replayTarget, "submission.receipt.collect");

  const processed = await runWorkerBatch({
    platform,
    handlers: createDefaultJobHandlers({ logger: () => {} }),
    logger: () => {},
    workerId: "worker-step4-submission-collect"
  });
  assert.equal(processed, 1);

  const completedReplayJob = await platform.getRuntimeJob({ jobId: replay.queuedJob.jobId });
  const refreshedSubmission = platform.getAuthoritySubmission({
    companyId: DEMO_IDS.companyId,
    submissionId: submission.submissionId
  });
  assert.equal(completedReplayJob.status, "succeeded");
  assert.equal(completedReplayJob.lastResultCode, "submission_receipt_collection_completed");
  assert.equal(refreshedSubmission.status, "accepted");
  assert.deepEqual(
    refreshedSubmission.receipts.map((receipt) => receipt.receiptType),
    ["technical_ack", "business_ack"]
  );
});

test("Phase 14 Step 4 worker runs OCR jobs through the shared runtime", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T10:45:00Z")
  });

  platform.registerInboxChannel({
    companyId: DEMO_IDS.companyId,
    channelCode: "ocr_jobs",
    inboundAddress: "ocr@inbound.example.test",
    useCase: "documents_inbox",
    allowedMimeTypes: ["application/pdf"],
    maxAttachmentSizeBytes: 1024 * 1024,
    classificationConfidenceThreshold: 0.9,
    fieldConfidenceThreshold: 0.9
  });

  const ingested = platform.ingestEmailMessage({
    companyId: DEMO_IDS.companyId,
    recipientAddress: "ocr@inbound.example.test",
    messageId: "<phase14-ocr-job-1>",
    rawStorageKey: "raw-mail/phase14-ocr-job-1.eml",
    attachments: [
      {
        filename: "invoice.pdf",
        mimeType: "application/pdf",
        storageKey: "documents/originals/phase14-ocr-job-1.pdf",
        contentText: "Invoice: INV-3001 Supplier: Demo Leverantor AB Total: 3999.00 OCR: 77777"
      }
    ],
    actorId: "system"
  });
  const documentId = ingested.routedDocuments[0].documentId;

  const queuedJob = await platform.enqueueRuntimeJob({
    companyId: DEMO_IDS.companyId,
    jobType: "documents.ocr.requested",
    sourceObjectType: "document",
    sourceObjectId: documentId,
    idempotencyKey: "step4-ocr-job-shared-runtime",
    payload: {
      documentId
    },
    actorId: "system"
  });

  const processed = await runWorkerBatch({
    platform,
    handlers: createDefaultJobHandlers({ logger: () => {} }),
    logger: () => {},
    workerId: "worker-step4-ocr"
  });
  assert.equal(processed, 1);

  const completedJob = await platform.getRuntimeJob({ jobId: queuedJob.jobId });
  const attempts = await platform.listRuntimeJobAttempts({ jobId: queuedJob.jobId });
  const runs = platform.getDocumentOcrRuns({
    companyId: DEMO_IDS.companyId,
    documentId
  });

  assert.equal(completedJob.status, "succeeded");
  assert.equal(completedJob.lastResultCode, "document_ocr_completed");
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].resultPayload.documentId, documentId);
  assert.equal(runs.ocrRuns.length, 1);
  assert.equal(runs.ocrRuns[0].suggestedDocumentType, "supplier_invoice");
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
  assert.equal(typeof attempts[0].resultPayload.notificationDigestId, "string");
  assert.deepEqual(attempts[0].resultPayload.notificationIds, [unreadNotification.notificationId]);
  assert.equal(attempts[0].resultPayload.unreadCount, 1);
});

test("Phase 14 Step 4 worker releases snoozed notifications and records escalation scans", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T13:30:00Z")
  });

  const notification = platform.createNotification({
    companyId: DEMO_IDS.companyId,
    recipientType: "team",
    recipientId: DEMO_TEAM_IDS.financeOps,
    categoryCode: "deadline_warning",
    priorityCode: "critical",
    sourceDomainCode: "CORE",
    sourceObjectType: "work_item",
    sourceObjectId: "work-notify-snooze-job-1",
    title: "Critical snoozed warning",
    body: "Should be released and escalated by worker jobs.",
    actorId: "system"
  });
  platform.deliverNotification({
    companyId: DEMO_IDS.companyId,
    notificationId: notification.notificationId,
    channelCode: "email",
    actorId: "system"
  });
  platform.snoozeNotification({
    companyId: DEMO_IDS.companyId,
    notificationId: notification.notificationId,
    until: "2026-03-24T12:00:00Z",
    actorId: DEMO_IDS.userId
  });

  const releaseJob = await platform.enqueueRuntimeJob({
    companyId: DEMO_IDS.companyId,
    jobType: "notifications.release_snoozed",
    sourceObjectType: "notification_center",
    sourceObjectId: DEMO_IDS.companyId,
    idempotencyKey: "step4-notification-release-snoozed",
    payload: {
      companyId: DEMO_IDS.companyId,
      asOf: "2026-03-24T13:30:00Z"
    },
    actorId: "system"
  });
  const releasedCount = await runWorkerBatch({
    platform,
    handlers: createDefaultJobHandlers({ logger: () => {} }),
    logger: () => {},
    workerId: "worker-step4-notifications-release"
  });
  assert.equal(releasedCount, 1);

  const releasedJob = await platform.getRuntimeJob({ jobId: releaseJob.jobId });
  const releasedNotification = platform.getNotification({
    companyId: DEMO_IDS.companyId,
    notificationId: notification.notificationId
  });
  assert.equal(releasedJob.status, "succeeded");
  assert.equal(releasedJob.lastResultCode, "notifications_snooze_released");
  assert.equal(releasedNotification.status, "delivered");

  const escalationJob = await platform.enqueueRuntimeJob({
    companyId: DEMO_IDS.companyId,
    jobType: "notifications.escalation_scan",
    sourceObjectType: "notification_center",
    sourceObjectId: DEMO_IDS.companyId,
    idempotencyKey: "step4-notification-escalation-scan",
    payload: {
      asOf: "2026-03-24T14:30:00Z",
      escalationPolicyCode: "notification.default"
    },
    actorId: "system"
  });
  const escalatedCount = await runWorkerBatch({
    platform,
    handlers: createDefaultJobHandlers({ logger: () => {} }),
    logger: () => {},
    workerId: "worker-step4-notifications-escalation"
  });
  assert.equal(escalatedCount, 1);

  const escalationJobState = await platform.getRuntimeJob({ jobId: escalationJob.jobId });
  const escalationAttempts = await platform.listRuntimeJobAttempts({ jobId: escalationJob.jobId });
  assert.equal(escalationJobState.status, "succeeded");
  assert.equal(escalationJobState.lastResultCode, "notification_escalations_scanned");
  assert.equal(escalationAttempts[0].resultPayload.createdCount, 1);
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

test("Phase 14 Step 4 worker executes queued search reindex requests", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-25T13:30:00Z")
  });

  const request = await platform.requestSearchReindex({
    companyId: DEMO_IDS.companyId,
    projectionCode: "reporting.report_snapshot",
    actorId: DEMO_IDS.userId
  });
  assert.equal(request.reindexRequest.status, "requested");
  assert.equal(typeof request.reindexRequest.jobId, "string");

  const processed = await runWorkerBatch({
    platform,
    handlers: createDefaultJobHandlers({ logger: () => {} }),
    logger: () => {},
    workerId: "worker-step4-search-reindex"
  });
  assert.equal(processed, 1);

  const completedJob = await platform.getRuntimeJob({ jobId: request.reindexRequest.jobId });
  const attempts = await platform.listRuntimeJobAttempts({ jobId: request.reindexRequest.jobId });
  const completedRequest = platform.listSearchReindexRequests({
    companyId: DEMO_IDS.companyId,
    status: "completed"
  }).find((candidate) => candidate.searchReindexRequestId === request.reindexRequest.searchReindexRequestId);

  assert.equal(completedJob.status, "succeeded");
  assert.equal(completedJob.lastResultCode, "search_reindex_completed");
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].resultPayload.searchReindexRequestId, request.reindexRequest.searchReindexRequestId);
  assert.equal(Boolean(completedRequest), true);
});
