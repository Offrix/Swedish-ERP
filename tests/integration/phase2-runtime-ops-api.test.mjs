import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 2.6 API operationalizes checkpoints, replay drills and transaction-boundary monitoring", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T09:00:00Z")
  });
  platform.criticalDomainStateStore.recordMutation({
    domainKey: "vat",
    companyId: DEMO_IDS.companyId,
    commandType: "vat.decision.record",
    aggregateType: "vat_decision",
    aggregateId: "vat-decision-1",
    actorId: "system",
    sessionRevision: 1,
    commandPayload: {
      decisionCode: "domestic_standard"
    },
    snapshot: {
      decisions: [
        {
          vatDecisionId: "vat-decision-1"
        }
      ]
    },
    outboxMessageRecords: [
      {
        eventType: "vat.decision.recorded",
        payload: {
          vatDecisionId: "vat-decision-1"
        },
        recordedAt: "2026-03-29T08:00:00Z"
      }
    ],
    evidenceRefRecords: [
      {
        evidenceRefType: "audit",
        evidenceRef: "evidence://phase2/vat-decision-1",
        recordedAt: "2026-03-29T08:00:00Z"
      }
    ],
    persistedAt: "2026-03-29T08:00:00Z"
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });
    const approver = platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "phase2-api-checkpoint-approver@example.test",
      displayName: "Phase 2 API Checkpoint Approver",
      roleCode: "company_admin",
      requiresMfa: false
    });

    const checkpoint = await requestJson(baseUrl, "/v1/backoffice/checkpoints", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        scopeCode: "regulated_submission_recovery",
        snapshotRefs: ["snapshot://phase2/api/vat-before-replay"],
        commandReceiptIds: ["receipt-1"],
        notes: "Checkpoint before replay drill."
      }
    });
    assert.equal(checkpoint.status, "open");

    const sealedCheckpoint = await requestJson(baseUrl, `/v1/backoffice/checkpoints/${checkpoint.rollbackCheckpointId}/seal`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        sealSummary: "Checkpoint sealed for replay rehearsal.",
        requiredReviewUserIds: [approver.userId]
      }
    });
    assert.equal(sealedCheckpoint.status, "sealed");

    const usedCheckpoint = await requestJson(baseUrl, `/v1/backoffice/checkpoints/${checkpoint.rollbackCheckpointId}/use`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        usageSummary: "Rollback checkpoint consumed during operator rehearsal.",
        approvalActorIds: [approver.userId]
      }
    });
    assert.equal(usedCheckpoint.status, "used");

    const replayDrill = await requestJson(baseUrl, "/v1/backoffice/replay-drills", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        drillCode: "phase2-api-replay-drill",
        targetScope: "async_job_dead_letter",
        deadLetterId: "dead-letter-1",
        jobId: "job-1",
        expectedOutcome: "Replay remains idempotent and evidence-complete."
      }
    });
    assert.equal(replayDrill.status, "planned");

    const startedReplayDrill = await requestJson(baseUrl, `/v1/backoffice/replay-drills/${replayDrill.replayDrillId}/start`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        startedAt: "2026-03-29T09:05:00Z"
      }
    });
    assert.equal(startedReplayDrill.status, "running");

    const completedReplayDrill = await requestJson(baseUrl, `/v1/backoffice/replay-drills/${replayDrill.replayDrillId}/complete`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        status: "passed",
        verificationSummary: "Replay drill completed without duplicate commit or lost outbox evidence.",
        completedAt: "2026-03-29T09:08:00Z"
      }
    });
    assert.equal(completedReplayDrill.status, "passed");

    const replayDrills = await requestJson(baseUrl, `/v1/backoffice/replay-drills?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(replayDrills.summary.coverageMissing, false);
    assert.equal(replayDrills.items.some((item) => item.status === "passed"), true);

    const transactionBoundary = await requestJson(baseUrl, `/v1/ops/transaction-boundary?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(transactionBoundary.commitLag.summary.laggingDomainCount, 1);
    assert.equal(transactionBoundary.commitLag.summary.lagState, "critical");
    assert.equal(transactionBoundary.commitLag.items[0].domainKey, "vat");

    const observability = await requestJson(baseUrl, `/v1/ops/observability?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(observability.metrics.laggingCommitBoundaryCount, 1);
    assert.equal(observability.runtimeControlPlane.rollbackCheckpointSummary.usedCount, 1);
    assert.equal(observability.runtimeControlPlane.replayDrillSummary.passedCount, 1);
  } finally {
    await stopServer(server);
  }
});
