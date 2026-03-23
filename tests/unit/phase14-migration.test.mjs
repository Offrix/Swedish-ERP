import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { loginWithStrongAuthOnPlatform } from "../helpers/platform-auth.mjs";

test("Phase 14.3 migration cockpit tracks import, diff, cutover and rollback deterministically", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T20:30:00Z")
  });
  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });

  const mappingSet = platform.createMappingSet({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    sourceSystem: "legacy_erp",
    domainScope: "finance",
    versionNo: 1,
    mappings: [{ sourceField: "account_no", targetField: "accountNumber", transformCode: "identity" }]
  });
  const approvedMappingSet = platform.approveMappingSet({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    mappingSetId: mappingSet.mappingSetId
  });
  assert.equal(approvedMappingSet.status, "approved");

  const batch = platform.registerImportBatch({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    sourceSystem: "legacy_erp",
    batchType: "chart_of_accounts",
    recordCount: 42,
    hash: "phase14-import-hash",
    scope: { companyId: DEMO_IDS.companyId },
    mappingSetId: mappingSet.mappingSetId,
    objectRefs: [{ sourceObjectId: "1000", targetObjectId: "1000", objectType: "ledger_account" }]
  });
  const importedBatch = platform.runImportBatch({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    importBatchId: batch.importBatchId,
    autoAccept: true
  });
  assert.equal(importedBatch.status, "accepted");

  const diffReport = platform.generateDiffReport({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    comparisonScope: "parallel_run_finance",
    sourceSnapshotRef: { system: "legacy_erp", period: "2026-03" },
    targetSnapshotRef: { system: "swedish_erp", period: "2026-03" },
    differenceItems: [
      { objectType: "trial_balance", sourceObjectId: "tb-2026-03", targetObjectId: "tb-2026-03", differenceClass: "material", comment: "temporary mismatch" }
    ]
  });
  assert.equal(diffReport.status, "remediation_required");
  const acceptedDiff = platform.recordDifferenceDecision({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    diffReportId: diffReport.diffReportId,
    itemId: diffReport.differenceItems[0].itemId,
    decision: "accepted",
    comment: "parallel run confirmed"
  });
  assert.equal(acceptedDiff.status, "accepted");

  const cutoverPlan = platform.createCutoverPlan({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    freezeAt: "2026-03-23T08:00:00.000Z",
    rollbackPoint: "snapshot://phase14-unit",
    signoffChain: [{ userId: DEMO_IDS.userId, roleCode: "migration_lead", label: "Migration lead" }],
    goLiveChecklist: [{ itemCode: "support_staffed", label: "Support staffed" }]
  });
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
  platform.startCutover({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId
  });
  platform.completeFinalExtract({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId,
    lastExtractAt: "2026-03-23T08:10:00.000Z"
  });
  platform.passCutoverValidation({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId
  });
  platform.switchCutover({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId
  });
  const rollbackStarted = platform.startRollback({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId,
    reasonCode: "parallel_run_mismatch"
  });
  assert.equal(rollbackStarted.status, "rollback_in_progress");
  const rollbackCompleted = platform.completeRollback({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId
  });
  assert.equal(rollbackCompleted.status, "rolled_back");

  const cockpit = platform.getMigrationCockpit({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId
  });
  assert.equal(cockpit.mappingSets.length, 1);
  assert.equal(cockpit.importBatches.length, 1);
  assert.equal(cockpit.diffReports.length, 1);
  assert.equal(cockpit.cutoverPlans.length, 1);
});
