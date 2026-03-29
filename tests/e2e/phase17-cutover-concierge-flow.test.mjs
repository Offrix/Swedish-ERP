import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 17.6 flow exposes concierge routes and keeps cutover concierge evidence readable end-to-end", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T12:00:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const root = await requestJson(baseUrl, "/");
    assert.equal(root.routes.includes("/v1/migration/cutover-plans/:cutoverPlanId/concierge"), true);
    assert.equal(root.routes.includes("/v1/migration/cutover-plans/:cutoverPlanId/signoff-evidence"), true);
    assert.equal(root.routes.includes("/v1/migration/cutover-plans/:cutoverPlanId/source-extract-checklist/:itemCode"), true);
    assert.equal(root.routes.includes("/v1/migration/cutover-plans/:cutoverPlanId/rehearsals"), true);
    assert.equal(root.routes.includes("/v1/migration/cutover-plans/:cutoverPlanId/variance-report"), true);
    assert.equal(root.routes.includes("/v1/migration/cutover-plans/:cutoverPlanId/rollback-drill"), true);

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
        rollbackPointRef: "snapshot://phase17-6-e2e",
        acceptedVarianceThresholds: {
          amountDelta: 0,
          countDelta: 0
        },
        stabilizationWindowHours: 24,
        signoffChain: [{ userId: DEMO_IDS.userId, roleCode: "migration_lead", label: "Migration lead" }],
        goLiveChecklist: [{ itemCode: "support_staffed", label: "Support staffed" }]
      }
    });
    await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/source-extract-checklist/masterdata_extract`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        status: "completed",
        sourceExtractRef: "extract://masterdata_extract",
        verificationSummary: "Master data extract verified"
      }
    });
    const concierge = await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/concierge?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(concierge.sourceExtractChecklist.length >= 4, true);
    assert.equal(concierge.sourceExtractChecklist.some((item) => item.itemCode === "masterdata_extract" && item.status === "completed"), true);
    assert.equal(Array.isArray(concierge.nextActionCodes), true);
  } finally {
    await stopServer(server);
  }
});
