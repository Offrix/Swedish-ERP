import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { loginWithStrongAuthOnPlatform } from "../helpers/platform-auth.mjs";
import {
  summarizeProjectionRebuildGates,
  summarizeTransactionBoundary
} from "../../packages/domain-core/src/index.mjs";

test("Phase 2.6 rollback checkpoints follow open-sealed-used dual review flow", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T09:00:00Z")
  });
  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  const approver = platform.createCompanyUser({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    email: "phase2-checkpoint-approver@example.test",
    displayName: "Phase 2 Checkpoint Approver",
    roleCode: "company_admin",
    requiresMfa: false
  });

  const checkpoint = platform.createRollbackCheckpoint({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    scopeCode: "regulated_submission_recovery",
    snapshotRefs: ["snapshot://phase2/vat-before-cutover"],
    commandReceiptIds: ["receipt-1"],
    notes: "Checkpoint before destructive replay window."
  });
  assert.equal(checkpoint.status, "open");

  const sealed = platform.sealRollbackCheckpoint({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    rollbackCheckpointId: checkpoint.rollbackCheckpointId,
    sealSummary: "Checkpoint sealed after validation of snapshot hash.",
    requiredReviewUserIds: [approver.userId]
  });
  assert.equal(sealed.status, "sealed");
  assert.deepEqual(sealed.requiredReviewUserIds, [approver.userId]);

  const used = platform.useRollbackCheckpoint({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    rollbackCheckpointId: checkpoint.rollbackCheckpointId,
    usageSummary: "Rollback rehearsal executed through controlled operator flow.",
    approvalActorIds: [approver.userId],
    evidence: {
      rollbackVerificationRef: "evidence://phase2/checkpoint/used"
    }
  });
  assert.equal(used.status, "used");
  assert.equal(used.usedByUserId, checkpoint.createdByUserId);
  assert.deepEqual(used.approvalActorIds, [approver.userId]);

  const controlPlane = platform.getRuntimeControlPlaneSummary({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId
  });
  assert.equal(controlPlane.rollbackCheckpointSummary.usedCount, 1);
  assert.equal(controlPlane.rollbackCheckpointSummary.sealedCount, 0);
});

test("Phase 2.6 replay drills build resumable coverage summary", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T10:00:00Z")
  });
  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });

  const drill = platform.recordReplayDrill({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    drillCode: "phase2-replay-drill",
    targetScope: "async_job_dead_letter",
    deadLetterId: "dead-letter-1",
    jobId: "job-1",
    expectedOutcome: "Replay should rehydrate the command path without duplicate effect."
  });
  assert.equal(drill.status, "planned");

  const started = platform.startReplayDrill({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    replayDrillId: drill.replayDrillId,
    startedAt: "2026-03-29T10:05:00Z"
  });
  assert.equal(started.status, "running");

  const completed = platform.completeReplayDrill({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    replayDrillId: drill.replayDrillId,
    status: "passed",
    verificationSummary: "Replay drill completed without duplicate posting or lost evidence.",
    completedAt: "2026-03-29T10:08:00Z",
    evidence: {
      replayVerificationRef: "evidence://phase2/replay-drill/passed"
    }
  });
  assert.equal(completed.status, "passed");

  const replaySummary = platform.getReplayDrillSummary({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId
  });
  assert.equal(replaySummary.coverageMissing, false);
  assert.equal(replaySummary.passedCount, 1);
  assert.equal(replaySummary.failedCount, 0);
});

test("Phase 2.6 transaction-boundary helpers flag lagging commits and rebuild blockers", () => {
  const commitLag = summarizeTransactionBoundary({
    asOf: "2026-03-29T09:00:00Z",
    warningLagMinutes: 15,
    criticalLagMinutes: 45,
    commandReceipts: [
      {
        domainKey: "vat",
        commandReceiptId: "receipt-1",
        recordedAt: "2026-03-29T08:00:00Z"
      }
    ],
    outboxMessages: [
      {
        domainKey: "vat",
        outboxMessageId: "outbox-1",
        status: "pending",
        recordedAt: "2026-03-29T08:00:00Z"
      }
    ]
  });
  assert.equal(commitLag.summary.lagState, "critical");
  assert.equal(commitLag.summary.laggingDomainCount, 1);
  assert.equal(commitLag.items[0].domainKey, "vat");
  assert.equal(commitLag.items[0].lagState, "critical");

  const projectionGates = summarizeProjectionRebuildGates({
    asOf: "2026-03-29T09:00:00Z",
    runningStaleMinutes: 15,
    projectionContracts: [
      {
        projectionCode: "reporting.snapshot_projection",
        objectType: "report_snapshot",
        sourceDomainCode: "reporting"
      },
      {
        projectionCode: "review.queue_projection",
        objectType: "review_item",
        sourceDomainCode: "review_center"
      }
    ],
    projectionCheckpoints: [
      {
        projectionCode: "reporting.snapshot_projection",
        checkpointSequenceNo: 1,
        status: "running",
        lastStartedAt: "2026-03-29T08:30:00Z",
        lastCompletedAt: null,
        lastErrorCode: null,
        lastErrorMessage: null
      }
    ]
  });
  assert.equal(projectionGates.summary.warningCount, 1);
  assert.equal(projectionGates.summary.blockingCount, 1);
  assert.equal(projectionGates.items.find((item) => item.projectionCode === "reporting.snapshot_projection")?.gateState, "warning");
  assert.equal(projectionGates.items.find((item) => item.projectionCode === "review.queue_projection")?.gateState, "blocking");
});
