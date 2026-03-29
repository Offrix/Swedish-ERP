import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { loginWithStrongAuthOnPlatform } from "../helpers/platform-auth.mjs";

test("Phase 17.6 cutover concierge tracks source extracts, rehearsals, variance, signoff evidence and rollback drill", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T10:00:00Z")
  });
  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });

  const cutoverPlan = platform.createCutoverPlan({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    freezeAt: "2026-03-30T08:00:00.000Z",
    rollbackPointRef: "snapshot://phase17-6-unit",
    acceptedVarianceThresholds: {
      amountDelta: 0,
      countDelta: 0
    },
    stabilizationWindowHours: 24,
    signoffChain: [{ userId: DEMO_IDS.userId, roleCode: "migration_lead", label: "Migration lead" }],
    goLiveChecklist: [{ itemCode: "support_staffed", label: "Support staffed" }]
  });
  assert.equal(cutoverPlan.sourceExtractChecklist.length >= 4, true);

  for (const item of cutoverPlan.sourceExtractChecklist) {
    platform.updateCutoverSourceExtractChecklistItem({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      cutoverPlanId: cutoverPlan.cutoverPlanId,
      itemCode: item.itemCode,
      status: "completed",
      sourceExtractRef: `extract://${item.itemCode}`,
      verificationSummary: `${item.label} verified`
    });
  }

  const diffReport = platform.generateDiffReport({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    comparisonScope: "parallel_run_finance",
    sourceSnapshotRef: { system: "legacy_erp", period: "2026-03" },
    targetSnapshotRef: { system: "swedish_erp", period: "2026-03" },
    differenceItems: [
      { objectType: "trial_balance", sourceObjectId: "tb-2026-03", targetObjectId: "tb-2026-03", differenceClass: "material", comment: "temporary delta" }
    ]
  });
  platform.recordDifferenceDecision({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    diffReportId: diffReport.diffReportId,
    itemId: diffReport.differenceItems[0].itemId,
    decision: "accepted",
    comment: "Reconciled during concierge rehearsal."
  });

  const parallelRunResult = platform.recordParallelRunResult({
    sessionToken: adminToken,
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
        sourceValue: 50000,
        targetValue: 50000,
        unitCode: "sek"
      }
    ]
  });
  platform.acceptParallelRunResult({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    parallelRunResultId: parallelRunResult.parallelRunResultId,
    decisionComment: "Finance parallel run accepted."
  });

  const rehearsal = platform.recordCutoverRehearsal({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId,
    rehearsalType: "full_dress_rehearsal",
    scopeCode: "finance_cutover",
    status: "completed",
    summary: "Dress rehearsal completed cleanly.",
    observedIssueCount: 0,
    diffReportIds: [diffReport.diffReportId],
    parallelRunResultIds: [parallelRunResult.parallelRunResultId]
  });
  assert.equal(rehearsal.status, "completed");

  const varianceReport = platform.generateCutoverAutomatedVarianceReport({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId,
    diffReportIds: [diffReport.diffReportId]
  });
  assert.equal(varianceReport.status, "accepted");

  const restoreDrill = platform.recordRestoreDrill({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    drillCode: "phase17-cutover-rollback",
    targetRtoMinutes: 60,
    targetRpoMinutes: 15,
    actualRtoMinutes: 35,
    actualRpoMinutes: 8,
    status: "passed",
    verificationSummary: "Rollback drill passed."
  });
  const rollbackDrill = platform.recordCutoverRollbackDrill({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId,
    restoreDrillId: restoreDrill.restoreDrillId,
    verificationSummary: "Cutover-specific rollback drill linked."
  });
  assert.equal(rollbackDrill.status, "passed");

  platform.recordCutoverSignoff({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId
  });
  platform.updateCutoverChecklistItem({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId,
    itemCode: "support_staffed",
    status: "completed"
  });

  const signoffEvidence = platform.exportCutoverSignoffEvidence({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId
  });
  assert.equal(signoffEvidence.status, "frozen");

  const concierge = platform.getCutoverConcierge({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId
  });
  assert.equal(concierge.sourceExtractSummary.pending, 0);
  assert.equal(concierge.rehearsalSummary.completed, 1);
  assert.equal(concierge.automatedVarianceReport.status, "accepted");
  assert.equal(concierge.rollbackDrill.status, "passed");
  assert.equal(concierge.signoffEvidenceBundle.status, "frozen");

  const cockpit = platform.getMigrationCockpit({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId
  });
  assert.equal(cockpit.conciergeSummary.totalPlans, 1);
  assert.equal(cockpit.cutoverBoard.items[0].conciergeStageCode, "guided_cutover");
  assert.equal(cockpit.cutoverBoard.items[0].sourceExtractSummary.pending, 0);
  assert.equal(cockpit.cutoverBoard.items[0].rehearsalSummary.completed, 1);
  assert.equal(cockpit.cutoverBoard.items[0].rollbackDrillStatus, "passed");
  assert.equal(cockpit.cutoverBoard.items[0].automatedVarianceStatus, "accepted");
  assert.equal(cockpit.cutoverBoard.items[0].signoffEvidenceStatus, "frozen");
});
