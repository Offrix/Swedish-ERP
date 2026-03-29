import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 17.6 API exposes cutover concierge, source extract, rehearsal, variance and rollback drill runtime", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T11:00:00Z")
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

    const cutoverPlan = await requestJson(baseUrl, "/v1/migration/cutover-plans", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        freezeAt: "2026-03-30T08:00:00.000Z",
        rollbackPointRef: "snapshot://phase17-6-api",
        acceptedVarianceThresholds: {
          amountDelta: 0,
          countDelta: 0
        },
        stabilizationWindowHours: 24,
        signoffChain: [{ userId: DEMO_IDS.userId, roleCode: "migration_lead", label: "Migration lead" }],
        goLiveChecklist: [{ itemCode: "support_staffed", label: "Support staffed" }]
      }
    });

    for (const item of cutoverPlan.sourceExtractChecklist) {
      await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/source-extract-checklist/${item.itemCode}`, {
        method: "POST",
        token: adminToken,
        body: {
          companyId: DEMO_IDS.companyId,
          status: "completed",
          sourceExtractRef: `extract://${item.itemCode}`,
          verificationSummary: `${item.label} verified`
        }
      });
    }

    const diffReport = await requestJson(baseUrl, "/v1/migration/diff-reports", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        comparisonScope: "parallel_run_finance",
        sourceSnapshotRef: { system: "legacy_erp", period: "2026-03" },
        targetSnapshotRef: { system: "swedish_erp", period: "2026-03" },
        differenceItems: [
          { objectType: "trial_balance", sourceObjectId: "tb-2026-03", targetObjectId: "tb-2026-03", differenceClass: "material", comment: "temporary delta" }
        ]
      }
    });
    await requestJson(baseUrl, `/v1/migration/diff-reports/${diffReport.diffReportId}/items/${diffReport.differenceItems[0].itemId}`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        decision: "accepted",
        comment: "Reconciled during concierge rehearsal."
      }
    });

    const parallelRunResult = await requestJson(baseUrl, "/v1/migration/parallel-run-results", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        cutoverPlanId: cutoverPlan.cutoverPlanId,
        comparisonScope: "finance",
        sourceSnapshotRef: { system: "legacy_erp", period: "2026-03" },
        targetSnapshotRef: { system: "swedish_erp", period: "2026-03" },
        metrics: [
          {
            metricCode: "trial_balance_delta",
            label: "Trial balance delta",
            thresholdCode: "amountDelta",
            sourceValue: 75000,
            targetValue: 75000,
            unitCode: "sek"
          }
        ]
      }
    });
    await requestJson(baseUrl, `/v1/migration/parallel-run-results/${parallelRunResult.parallelRunResultId}/accept`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        decisionComment: "Finance parallel run accepted."
      }
    });

    const rehearsal = await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/rehearsals`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        rehearsalType: "full_dress_rehearsal",
        scopeCode: "finance_cutover",
        status: "completed",
        summary: "Dress rehearsal completed cleanly.",
        observedIssueCount: 0,
        diffReportIds: [diffReport.diffReportId],
        parallelRunResultIds: [parallelRunResult.parallelRunResultId]
      }
    });
    assert.equal(rehearsal.status, "completed");

    const varianceReport = await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/variance-report`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        diffReportIds: [diffReport.diffReportId]
      }
    });
    assert.equal(varianceReport.status, "accepted");

    const restoreDrill = platform.recordRestoreDrill({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      drillCode: "phase17-api-rollback-drill",
      targetRtoMinutes: 60,
      targetRpoMinutes: 15,
      actualRtoMinutes: 33,
      actualRpoMinutes: 7,
      status: "passed",
      verificationSummary: "Rollback drill passed."
    });
    const rollbackDrill = await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/rollback-drill`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        restoreDrillId: restoreDrill.restoreDrillId,
        verificationSummary: "Linked rollback drill to concierge."
      }
    });
    assert.equal(rollbackDrill.status, "passed");

    await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/signoffs`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/checklist/support_staffed`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        status: "completed"
      }
    });

    const signoffEvidence = await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/signoff-evidence?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(signoffEvidence.evidenceBundle.status, "frozen");

    const concierge = await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/concierge?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(concierge.sourceExtractSummary.pending, 0);
    assert.equal(concierge.rehearsalSummary.completed, 1);
    assert.equal(concierge.automatedVarianceReport.status, "accepted");
    assert.equal(concierge.rollbackDrill.status, "passed");
    assert.equal(concierge.signoffEvidenceBundle.status, "frozen");

    const cockpit = await requestJson(baseUrl, `/v1/migration/cockpit?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(cockpit.conciergeSummary.totalPlans, 1);
    assert.equal(cockpit.cutoverBoard.items[0].sourceExtractSummary.pending, 0);
    assert.equal(cockpit.cutoverBoard.items[0].rehearsalSummary.completed, 1);
    assert.equal(cockpit.cutoverBoard.items[0].rollbackDrillStatus, "passed");
    assert.equal(cockpit.cutoverBoard.items[0].automatedVarianceStatus, "accepted");
    assert.equal(cockpit.cutoverBoard.items[0].signoffEvidenceStatus, "frozen");

    const cutoverDashboard = await requestJson(baseUrl, `/v1/mission-control/dashboards/cutover_control?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(cutoverDashboard.summary.conciergeAttentionCount >= 0, true);
    assert.equal(cutoverDashboard.rows.some((row) => row.conciergeStageCode != null), true);
  } finally {
    await stopServer(server);
  }
});
