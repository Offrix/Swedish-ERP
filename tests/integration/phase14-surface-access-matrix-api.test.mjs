import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 14 access matrix denies field users on critical desktop-only surfaces", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-25T09:30:00Z")
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
    platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "phase14-access-matrix-field@example.test",
      displayName: "Phase 14 Access Matrix Field",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase14-access-matrix-field@example.test"
    });

    for (const surface of [
      { path: `/v1/ledger/accounts?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/reporting/metric-definitions?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/vat/codes?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/ar/customers?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/ap/suppliers?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/banking/statement-events?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/hus/decision-differences?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/accounting-method/history?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/fiscal-years/history?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/tax-account/events?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/review-center/queues?companyId=${DEMO_IDS.companyId}`, error: "review_center_role_forbidden" },
      { path: `/v1/ops/feature-flags?companyId=${DEMO_IDS.companyId}`, error: "backoffice_role_forbidden" },
      { path: `/v1/migration/cockpit?companyId=${DEMO_IDS.companyId}`, error: "payroll_operations_role_forbidden" },
      { path: `/v1/legal-forms/profiles?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/annual-reporting/packages?companyId=${DEMO_IDS.companyId}`, error: "annual_operations_role_forbidden" },
      { path: `/v1/backoffice/support-cases?companyId=${DEMO_IDS.companyId}`, error: "backoffice_role_forbidden" }
    ]) {
      const response = await requestJson(baseUrl, surface.path, {
        token: fieldUserToken,
        expectedStatus: 403
      });
      assert.equal(response.error, surface.error, surface.path);
    }
  } finally {
    await stopServer(server);
  }
});
