import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 14.3 API tracks mapping, imports, diffs, cutover and rollback end-to-end", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T21:50:00Z")
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

    const mappingSet = await requestJson(baseUrl, "/v1/migration/mapping-sets", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        sourceSystem: "legacy_erp",
        domainScope: "finance",
        versionNo: 1,
        mappings: [{ sourceField: "account_no", targetField: "accountNumber", transformCode: "identity" }]
      }
    });
    const approvedMappingSet = await requestJson(baseUrl, `/v1/migration/mapping-sets/${mappingSet.mappingSetId}/approve`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        batchIds: []
      }
    });
    assert.equal(approvedMappingSet.status, "approved");

    const batch = await requestJson(baseUrl, "/v1/migration/import-batches", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        sourceSystem: "legacy_erp",
        batchType: "chart_of_accounts",
        recordCount: 42,
        hash: "phase14-import-hash",
        scope: { companyId: DEMO_IDS.companyId },
        mappingSetId: mappingSet.mappingSetId,
        objectRefs: [{ sourceObjectId: "1000", targetObjectId: "1000", objectType: "ledger_account" }]
      }
    });
    const importedBatch = await requestJson(baseUrl, `/v1/migration/import-batches/${batch.importBatchId}/run`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        autoAccept: true
      }
    });
    assert.equal(importedBatch.status, "accepted");

    const correction = await requestJson(baseUrl, `/v1/migration/import-batches/${batch.importBatchId}/corrections`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        sourceObjectId: "1000",
        targetObjectId: "1000",
        reasonCode: "manual_mapping_fix",
        comment: "Verified legacy mapping."
      }
    });
    assert.equal(correction.importBatchId, batch.importBatchId);

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
          { objectType: "trial_balance", sourceObjectId: "tb-2026-03", targetObjectId: "tb-2026-03", differenceClass: "material", comment: "temporary mismatch" }
        ]
      }
    });
    assert.equal(diffReport.status, "remediation_required");

    const acceptedDiff = await requestJson(baseUrl, `/v1/migration/diff-reports/${diffReport.diffReportId}/items/${diffReport.differenceItems[0].itemId}`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        decision: "accepted",
        comment: "Parallel run confirmed."
      }
    });
    assert.equal(acceptedDiff.status, "accepted");

    const cutoverPlan = await requestJson(baseUrl, "/v1/migration/cutover-plans", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        freezeAt: "2026-03-23T08:00:00.000Z",
        rollbackPoint: "snapshot://phase14-api",
        signoffChain: [{ userId: DEMO_IDS.userId, roleCode: "migration_lead", label: "Migration lead" }],
        goLiveChecklist: [{ itemCode: "support_staffed", label: "Support staffed" }]
      }
    });
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

    await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/start`, {
      method: "POST",
      token: adminToken,
      body: { companyId: DEMO_IDS.companyId }
    });
    await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/final-extract`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        lastExtractAt: "2026-03-23T08:10:00.000Z"
      }
    });
    await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/validate`, {
      method: "POST",
      token: adminToken,
      body: { companyId: DEMO_IDS.companyId }
    });
    await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/switch`, {
      method: "POST",
      token: adminToken,
      body: { companyId: DEMO_IDS.companyId }
    });
    const stabilized = await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/stabilize`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        close: false
      }
    });
    assert.equal(stabilized.status, "stabilized");

    const rollbackStarted = await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/rollback`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "parallel_run_mismatch"
      }
    });
    assert.equal(rollbackStarted.status, "rollback_in_progress");

    const rollbackCompleted = await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/rollback/complete`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(rollbackCompleted.status, "rolled_back");

    const cockpit = await requestJson(baseUrl, `/v1/migration/cockpit?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(cockpit.mappingSets.length, 1);
    assert.equal(cockpit.importBatches.length, 1);
    assert.equal(cockpit.corrections.length, 1);
    assert.equal(cockpit.diffReports.length, 1);
    assert.equal(cockpit.cutoverPlans.length, 1);
  } finally {
    await stopServer(server);
  }
});
