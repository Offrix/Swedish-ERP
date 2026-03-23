import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 14.3 flow exposes migration routes and keeps cockpit evidence intact through rollback", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T22:50:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const root = await requestJson(baseUrl, "/");
    assert.equal(root.routes.includes("/v1/migration/cutover-plans/:cutoverPlanId/rollback/complete"), true);
    assert.equal(root.routes.includes("/v1/migration/cockpit"), true);

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
        mappings: [{ sourceField: "customer_no", targetField: "customerNumber", transformCode: "identity" }]
      }
    });
    await requestJson(baseUrl, `/v1/migration/mapping-sets/${mappingSet.mappingSetId}/approve`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        batchIds: []
      }
    });

    const cutoverPlan = await requestJson(baseUrl, "/v1/migration/cutover-plans", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        freezeAt: "2026-03-23T08:00:00.000Z",
        rollbackPoint: "snapshot://phase14-e2e",
        signoffChain: [{ userId: DEMO_IDS.userId, roleCode: "migration_lead", label: "Migration lead" }],
        goLiveChecklist: [{ itemCode: "parallel_run_green", label: "Parallel run green" }]
      }
    });
    await requestJson(baseUrl, "/v1/migration/diff-reports", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        comparisonScope: "parallel_run_finance",
        sourceSnapshotRef: { system: "legacy_erp", period: "2026-03" },
        targetSnapshotRef: { system: "swedish_erp", period: "2026-03" },
        differenceItems: []
      }
    });
    await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/signoffs`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/checklist/parallel_run_green`, {
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
    await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/rollback`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "parallel_run_mismatch"
      }
    });
    await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/rollback/complete`, {
      method: "POST",
      token: adminToken,
      body: { companyId: DEMO_IDS.companyId }
    });

    const cockpit = await requestJson(baseUrl, `/v1/migration/cockpit?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(cockpit.cutoverPlans.length, 1);
    assert.equal(cockpit.mappingSets.length, 1);
  } finally {
    await stopServer(server);
  }
});
