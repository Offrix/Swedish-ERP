import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Step 35 API exposes object profile and workbench contracts and enforces desktop-only access", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-25T12:15:00Z")
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

    const root = await requestJson(baseUrl, "/", { token: adminToken });
    for (const route of [
      "/v1/object-profiles/contracts",
      "/v1/object-profiles/:objectType/:objectId",
      "/v1/workbenches/contracts",
      "/v1/workbenches/:workbenchCode"
    ]) {
      assert.equal(root.routes.includes(route), true);
    }

    const objectProfileContracts = await requestJson(baseUrl, `/v1/object-profiles/contracts?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(objectProfileContracts.items.some((item) => item.objectType === "payRun"), true);

    const payRunProfile = await requestJson(baseUrl, `/v1/object-profiles/payRun/pr_demo_1?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(payRunProfile.profileType, "PayRunProfile");
    assert.equal(payRunProfile.objectId, "pr_demo_1");

    const workbenchContracts = await requestJson(baseUrl, `/v1/workbenches/contracts?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(workbenchContracts.items.some((item) => item.workbenchCode === "FinanceWorkbench"), true);

    const financeWorkbench = await requestJson(baseUrl, `/v1/workbenches/FinanceWorkbench?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(financeWorkbench.workbenchCode, "FinanceWorkbench");
    assert.equal(Array.isArray(financeWorkbench.rows), true);

    platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "phase35-field-reader@example.test",
      displayName: "Phase 35 Field Reader",
      roleCode: "field_user",
      requiresMfa: false
    });

    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase35-field-reader@example.test"
    });

    for (const path of [
      `/v1/object-profiles/contracts?companyId=${DEMO_IDS.companyId}`,
      `/v1/workbenches/contracts?companyId=${DEMO_IDS.companyId}`
    ]) {
      const payload = await requestJson(baseUrl, path, {
        token: fieldUserToken,
        expectedStatus: 403
      });
      assert.equal(payload.error, "desktop_surface_role_forbidden");
    }
  } finally {
    await stopServer(server);
  }
});
