import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_APPROVER_EMAIL, DEMO_APPROVER_IDS, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 14.1 API enforces support, audit review, SoD findings and break-glass controls", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T21:30:00Z")
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

    platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL,
      displayName: "Phase 14 Payroll Admin",
      roleCode: "payroll_admin",
      requiresMfa: false
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
      scopeCode: "support_case",
      permissionCode: "company.manage"
    });
    platform.createDelegation({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      fromCompanyUserId: DEMO_IDS.companyUserId,
      toCompanyUserId: DEMO_APPROVER_IDS.companyUserId,
      scopeCode: "impersonation_session",
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
      scopeCode: "support_case",
      permissionCode: "company.manage"
    });
    platform.createDelegation({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      fromCompanyUserId: DEMO_IDS.companyUserId,
      toCompanyUserId: secondApprover.companyUserId,
      scopeCode: "impersonation_session",
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
        category: "integration_failure",
        severity: "high",
        approvedActions: ["plan_job_replay"],
        relatedObjectRefs: [{ objectType: "submission", objectId: "submission-1" }]
      }
    });
    await requestJson(baseUrl, `/v1/backoffice/support-cases/${supportCase.supportCaseId}/approve-actions`, {
      method: "POST",
      token: approverToken,
      body: {
        companyId: DEMO_IDS.companyId,
        approvedActions: ["plan_job_replay"]
      }
    });

    const failedJob = platform.enqueueAsyncJob({
      companyId: DEMO_IDS.companyId,
      jobType: "bank.payment_export",
      payloadRef: "phase14-support-job",
      payload: { payoutBatchId: "phase14-support-job" },
      riskClass: "high_risk",
      actorId: "phase14-1-api"
    });
    platform.failAsyncJobAttempt({
      companyId: DEMO_IDS.companyId,
      jobId: failedJob.jobId,
      errorClass: "persistent_technical",
      errorMessage: "provider outage",
      replayAllowed: true
    });

    const diagnostic = await requestJson(baseUrl, `/v1/backoffice/support-cases/${supportCase.supportCaseId}/diagnostics`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        commandType: "plan_job_replay",
        input: { jobId: failedJob.jobId }
      }
    });
    assert.equal(diagnostic.resultSummary.replayPlan.status, "replay_planned");
    const secretRefDiagnostic = await requestJson(baseUrl, `/v1/backoffice/support-cases/${supportCase.supportCaseId}/diagnostics`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        commandType: "verify_secret_refs",
        input: { secretRefs: ["vault://prod/payments/webhook-secret"] }
      }
    });
    assert.equal(secretRefDiagnostic.resultSummary.verified, true);
    assert.equal(secretRefDiagnostic.resultSummary.secretRefs[0].includes("webhook-secret"), false);

    const impersonation = await requestJson(baseUrl, "/v1/backoffice/impersonations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        supportCaseId: supportCase.supportCaseId,
        targetCompanyUserId: DEMO_APPROVER_IDS.companyUserId,
        purposeCode: "support_read_only",
        mode: "read_only"
      }
    });
    const selfApprovalDenied = await requestJson(baseUrl, `/v1/backoffice/impersonations/${impersonation.sessionId}/approve`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(selfApprovalDenied.error, "impersonation_self_approval_forbidden");
    const impersonationApproved = await requestJson(baseUrl, `/v1/backoffice/impersonations/${impersonation.sessionId}/approve`, {
      method: "POST",
      token: approverToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(impersonationApproved.status, "active");
    const impersonationEnded = await requestJson(baseUrl, `/v1/backoffice/impersonations/${impersonation.sessionId}/end`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "case_resolved"
      }
    });
    assert.equal(impersonationEnded.status, "ended");

    const accessReview = await requestJson(baseUrl, "/v1/backoffice/access-reviews", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        scopeType: "company",
        scopeRef: DEMO_IDS.companyId,
        dueInDays: 5
      }
    });
    const payrollFinding = accessReview.findings.find((finding) => finding.findingCode === "sod.admin_payroll_overlap");
    assert.ok(payrollFinding);

    const reviewed = await requestJson(baseUrl, `/v1/backoffice/access-reviews/${accessReview.reviewBatchId}/findings/${payrollFinding.findingId}`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        decision: "accepted",
        remediationNote: "Phase 14 API verification"
      }
    });
    assert.equal(["in_review", "signed_off", "remediated"].includes(reviewed.status), true);

    const breakGlass = await requestJson(baseUrl, "/v1/backoffice/break-glass", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        incidentId: "INC-1401",
        purposeCode: "incident_investigation",
        requestedActions: ["list_feature_flags"]
      }
    });
    const selfBreakGlassDenied = await requestJson(baseUrl, `/v1/backoffice/break-glass/${breakGlass.breakGlassId}/approve`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(selfBreakGlassDenied.error, "break_glass_self_approval_forbidden");

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

    const reviewedBreakGlass = await requestJson(baseUrl, `/v1/backoffice/break-glass/${breakGlass.breakGlassId}/close`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(reviewedBreakGlass.status, "reviewed");

    const closedBreakGlass = await requestJson(baseUrl, `/v1/backoffice/break-glass/${breakGlass.breakGlassId}/close`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(closedBreakGlass.status, "closed");

    const auditEvents = await requestJson(baseUrl, `/v1/backoffice/audit-events?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(auditEvents.items.some((event) => event.entityType === "admin_diagnostic"), true);
    assert.equal(auditEvents.items.some((event) => event.entityType === "break_glass_session"), true);
  } finally {
    await stopServer(server);
  }
});
