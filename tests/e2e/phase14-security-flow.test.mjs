import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
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
    assert.equal(root.routes.includes("/v1/backoffice/break-glass/:breakGlassId/start"), true);
    assert.equal(root.routes.includes("/v1/backoffice/access-reviews/:reviewBatchId/sign-off"), true);

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
      toCompanyUserId: DEMO_APPROVER_IDS.companyUserId,
      scopeCode: "access_review_batch",
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
    platform.createDelegation({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      fromCompanyUserId: DEMO_IDS.companyUserId,
      toCompanyUserId: secondApprover.companyUserId,
      scopeCode: "access_review_batch",
      permissionCode: "company.manage"
    });
    platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL,
      displayName: "Phase 14 Payroll Admin",
      roleCode: "payroll_admin",
      requiresMfa: false
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

    const accessReview = await requestJson(baseUrl, "/v1/backoffice/access-reviews", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        dueInDays: 3
      }
    });
    const payrollFinding = accessReview.findings.find((finding) => finding.findingCode === "sod.admin_payroll_overlap");
    assert.ok(payrollFinding);
    const remediatedReview = await requestJson(baseUrl, `/v1/backoffice/access-reviews/${accessReview.reviewBatchId}/findings/${payrollFinding.findingId}`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        decision: "accepted",
        remediationNote: "E2E review"
      }
    });
    assert.equal(remediatedReview.status, "remediated");
    const accessReviewSignedOff = await requestJson(baseUrl, `/v1/backoffice/access-reviews/${accessReview.reviewBatchId}/sign-off`, {
      method: "POST",
      token: secondApproverToken,
      body: {
        companyId: DEMO_IDS.companyId,
        attestationNote: "Independent attestation complete"
      }
    });
    assert.equal(accessReviewSignedOff.status, "signed_off");

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
    assert.equal(breakGlass.masking.masked, true);
    const invalidBreakGlass = await requestJson(baseUrl, "/v1/backoffice/break-glass", {
      method: "POST",
      token: adminToken,
      expectedStatus: 400,
      body: {
        companyId: DEMO_IDS.companyId,
        incidentId: "INC-14-E2E-INVALID",
        purposeCode: "invalid_request",
        requestedActions: ["dangerous_live_mutation"]
      }
    });
    assert.equal(invalidBreakGlass.error, "break_glass_requested_action_not_allowlisted");

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
    assert.equal(secondApproval.status, "dual_approved");
    const started = await requestJson(baseUrl, `/v1/backoffice/break-glass/${breakGlass.breakGlassId}/start`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(started.status, "active");
    const reviewed = await requestJson(baseUrl, `/v1/backoffice/break-glass/${breakGlass.breakGlassId}/close`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "incident_resolved"
      }
    });
    const closed = await requestJson(baseUrl, `/v1/backoffice/break-glass/${breakGlass.breakGlassId}/close`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(reviewed.status, "ended");
    assert.equal(closed.status, "ended");
  } finally {
    await stopServer(server);
  }
});
