import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 4.5 surface object grants unlock explicit finance surfaces without widening role defaults", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-30T14:00:00Z")
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
    await requestJson(baseUrl, "/v1/ledger/chart/install", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });

    const fieldUser = platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "phase45-finance-surface-field@example.test",
      displayName: "Phase 4.5 Finance Surface Field",
      roleCode: "field_user",
      requiresMfa: false
    });

    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase45-finance-surface-field@example.test"
    });

    const deniedBeforeGrant = await requestJson(baseUrl, `/v1/ledger/accounts?companyId=${DEMO_IDS.companyId}`, {
      token: fieldUserToken,
      expectedStatus: 403
    });
    assert.equal(deniedBeforeGrant.error, "finance_operations_role_forbidden");

    platform.createObjectGrant({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      companyUserId: fieldUser.companyUserId,
      permissionCode: "surface.finance.read",
      objectType: "finance_surface",
      objectId: DEMO_IDS.companyId
    });

    const grantedAccounts = await requestJson(baseUrl, `/v1/ledger/accounts?companyId=${DEMO_IDS.companyId}`, {
      token: fieldUserToken
    });
    assert.equal(Array.isArray(grantedAccounts.items), true);
    assert.equal(grantedAccounts.items.some((account) => account.accountNumber === "1110"), true);
  } finally {
    await stopServer(server);
  }
});
