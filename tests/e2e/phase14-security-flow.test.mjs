import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_APPROVER_EMAIL, DEMO_APPROVER_IDS, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 14.1 flow exposes backoffice routes and keeps dual-control on break-glass", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T22:30:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const root = await requestJson(baseUrl, "/");
    assert.equal(root.routes.includes("/v1/backoffice/support-cases"), true);
    assert.equal(root.routes.includes("/v1/backoffice/break-glass/:breakGlassId/approve"), true);

    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });
    const approverToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_APPROVER_EMAIL
    });
    const secondApprover = platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "phase14-second-approver@example.test",
      displayName: "Phase 14 Second Approver",
      roleCode: "approver",
      requiresMfa: false
    });
    const secondApproverToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase14-second-approver@example.test"
    });

    platform.createDelegation({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      fromCompanyUserId: DEMO_IDS.companyUserId,
      toCompanyUserId: DEMO_APPROVER_IDS.companyUserId,
      scopeCode: "backoffice",
      permissionCode: "company.manage"
    });
    platform.createDelegation({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      fromCompanyUserId: DEMO_IDS.companyUserId,
      toCompanyUserId: DEMO_APPROVER_IDS.companyUserId,
      scopeCode: "break_glass_session",
      permissionCode: "company.manage"
    });
    platform.createDelegation({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      fromCompanyUserId: DEMO_IDS.companyUserId,
      toCompanyUserId: secondApprover.companyUserId,
      scopeCode: "backoffice",
      permissionCode: "company.manage"
    });
    platform.createDelegation({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      fromCompanyUserId: DEMO_IDS.companyUserId,
      toCompanyUserId: secondApprover.companyUserId,
      scopeCode: "break_glass_session",
      permissionCode: "company.manage"
    });

    const supportCase = await requestJson(baseUrl, "/v1/backoffice/support-cases", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        category: "access_review",
        severity: "medium",
        approvedActions: ["list_async_jobs"]
      }
    });
    assert.equal(supportCase.status, "open");

    const breakGlass = await requestJson(baseUrl, "/v1/backoffice/break-glass", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        incidentId: "INC-14-E2E",
        purposeCode: "incident_investigation",
        requestedActions: ["list_async_jobs"]
      }
    });

    const requesterDenied = await requestJson(baseUrl, `/v1/backoffice/break-glass/${breakGlass.breakGlassId}/approve`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(requesterDenied.error, "break_glass_self_approval_forbidden");

    const firstApproval = await requestJson(baseUrl, `/v1/backoffice/break-glass/${breakGlass.breakGlassId}/approve`, {
      method: "POST",
      token: approverToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(firstApproval.status, "requested");

    const secondApproval = await requestJson(baseUrl, `/v1/backoffice/break-glass/${breakGlass.breakGlassId}/approve`, {
      method: "POST",
      token: secondApproverToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(secondApproval.status, "active");

    const reviewed = await requestJson(baseUrl, `/v1/backoffice/break-glass/${breakGlass.breakGlassId}/close`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    const closed = await requestJson(baseUrl, `/v1/backoffice/break-glass/${breakGlass.breakGlassId}/close`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(reviewed.status, "reviewed");
    assert.equal(closed.status, "closed");
  } finally {
    await stopServer(server);
  }
});
