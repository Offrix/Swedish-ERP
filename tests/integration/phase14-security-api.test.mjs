import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_APPROVER_EMAIL, DEMO_APPROVER_IDS, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 14.1 API enforces support, audit review, SoD findings and break-glass controls", async () => {
  let now = new Date("2026-03-22T21:30:00Z");
  const platform = createApiPlatform({
    clock: () => now
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
    const fieldUser = platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "phase14-field-user@example.test",
      displayName: "Phase 14 Field User",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase14-field-user@example.test"
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
      toCompanyUserId: DEMO_APPROVER_IDS.companyUserId,
      scopeCode: "access_review_batch",
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
    platform.createDelegation({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      fromCompanyUserId: DEMO_IDS.companyUserId,
      toCompanyUserId: secondApprover.companyUserId,
      scopeCode: "access_review_batch",
      permissionCode: "company.manage"
    });
    platform.createDelegation({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      fromCompanyUserId: DEMO_IDS.companyUserId,
      toCompanyUserId: secondApprover.companyUserId,
      scopeCode: "support_case",
      permissionCode: "company.manage",
      startsAt: "2025-10-01T00:00:00.000Z"
    });

    const supportCase = await requestJson(baseUrl, "/v1/backoffice/support-cases", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        category: "integration_failure",
        severity: "high",
        approvedActions: ["plan_job_replay", "impersonation_read_only", "impersonation_limited_write"],
        relatedObjectRefs: [{ objectType: "submission", objectId: "submission-1" }]
      }
    });
    const fieldUserSupportListForbidden = await requestJson(baseUrl, `/v1/backoffice/support-cases?companyId=${DEMO_IDS.companyId}`, {
      token: fieldUserToken,
      expectedStatus: 403
    });
    assert.equal(fieldUserSupportListForbidden.error, "backoffice_role_forbidden");
    for (const financeReadPath of [
      `/v1/ledger/accounts?companyId=${DEMO_IDS.companyId}`,
      `/v1/reporting/metric-definitions?companyId=${DEMO_IDS.companyId}`,
      `/v1/vat/codes?companyId=${DEMO_IDS.companyId}`,
      `/v1/ar/customers?companyId=${DEMO_IDS.companyId}`,
      `/v1/ap/suppliers?companyId=${DEMO_IDS.companyId}`
    ]) {
      const financeReadDenied = await requestJson(baseUrl, financeReadPath, {
        token: fieldUserToken,
        expectedStatus: 403
      });
      assert.equal(financeReadDenied.error, "finance_operations_role_forbidden");
    }
    await requestJson(baseUrl, `/v1/backoffice/support-cases/${supportCase.supportCaseId}/approve-actions`, {
      method: "POST",
      token: approverToken,
      body: {
        companyId: DEMO_IDS.companyId,
        approvedActions: ["plan_job_replay", "impersonation_read_only"]
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
    const closedSupportCase = await requestJson(baseUrl, `/v1/backoffice/support-cases/${supportCase.supportCaseId}/close`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        resolutionCode: "operator_resolved",
        resolutionNote: "Replay planned and monitored."
      }
    });
    assert.equal(closedSupportCase.status, "closed");
    assert.equal(closedSupportCase.resolutionCode, "operator_resolved");
    const supportEvidence = await requestJson(baseUrl, `/v1/backoffice/support-cases/${supportCase.supportCaseId}/evidence?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(supportEvidence.evidenceBundle.status, "frozen");
    assert.equal(supportEvidence.evidenceBundle.supportCaseId, supportCase.supportCaseId);

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
    assert.notEqual(impersonation.targetCompanyUserId, DEMO_APPROVER_IDS.companyUserId);
    assert.notEqual(impersonation.requestedByUserId, DEMO_IDS.userId);
    assert.equal(impersonation.masking.masked, true);
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
    assert.equal(impersonationApproved.status, "approved");
    assert.notDeepEqual(impersonationApproved.approvalActorIds, [DEMO_APPROVER_IDS.userId]);
    assert.equal(impersonationApproved.watermark.watermarkCode, "SUPPORT-IMPERSONATION");
    const impersonationStarted = await requestJson(baseUrl, `/v1/backoffice/impersonations/${impersonation.sessionId}/start`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(impersonationStarted.status, "active");
    const impersonationEnded = await requestJson(baseUrl, `/v1/backoffice/impersonations/${impersonation.sessionId}/end`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "case_resolved"
      }
    });
    assert.equal(impersonationEnded.status, "terminated");
    const impersonationEvidence = await requestJson(baseUrl, `/v1/backoffice/impersonations/${impersonation.sessionId}/evidence?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(impersonationEvidence.evidenceBundle.status, "frozen");
    assert.equal(impersonationEvidence.evidenceBundle.watermark.watermarkCode, "SUPPORT-IMPERSONATION");
    const limitedWriteMissingAllowlist = await requestJson(baseUrl, "/v1/backoffice/impersonations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 400,
      body: {
        companyId: DEMO_IDS.companyId,
        supportCaseId: supportCase.supportCaseId,
        targetCompanyUserId: DEMO_APPROVER_IDS.companyUserId,
        purposeCode: "support_limited_write_missing_allowlist",
        mode: "limited_write"
      }
    });
    assert.equal(limitedWriteMissingAllowlist.error, "impersonation_restricted_actions_required");
    const limitedWriteInvalidAllowlist = await requestJson(baseUrl, "/v1/backoffice/impersonations", {
      method: "POST",
      token: secondApproverToken,
      expectedStatus: 400,
      body: {
        companyId: DEMO_IDS.companyId,
        supportCaseId: supportCase.supportCaseId,
        targetCompanyUserId: DEMO_APPROVER_IDS.companyUserId,
        purposeCode: "support_limited_write_invalid_allowlist",
        mode: "limited_write",
        restrictedActions: ["ledger.force_post"]
      }
    });
    assert.equal(limitedWriteInvalidAllowlist.error, "impersonation_restricted_action_not_allowlisted");
    const limitedWriteImpersonation = await requestJson(baseUrl, "/v1/backoffice/impersonations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        supportCaseId: supportCase.supportCaseId,
        targetCompanyUserId: DEMO_APPROVER_IDS.companyUserId,
        purposeCode: "support_limited_write",
        mode: "limited_write",
        restrictedActions: ["jobs.retry"]
      }
    });
    const limitedWriteDenied = await requestJson(baseUrl, `/v1/backoffice/impersonations/${limitedWriteImpersonation.sessionId}/approve`, {
      method: "POST",
      token: approverToken,
      expectedStatus: 403,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(limitedWriteDenied.error, "impersonation_limited_write_approval_required");
    await requestJson(baseUrl, `/v1/backoffice/support-cases/${supportCase.supportCaseId}/approve-actions`, {
      method: "POST",
      token: secondApproverToken,
      body: {
        companyId: DEMO_IDS.companyId,
        approvedActions: ["impersonation_limited_write"]
      }
    });
    const limitedWriteApproved = await requestJson(baseUrl, `/v1/backoffice/impersonations/${limitedWriteImpersonation.sessionId}/approve`, {
      method: "POST",
      token: approverToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(limitedWriteApproved.status, "approved");
    assert.notDeepEqual(limitedWriteApproved.approvalActorIds.sort(), [DEMO_APPROVER_IDS.userId, secondApprover.user.userId].sort());
    const limitedWriteStarted = await requestJson(baseUrl, `/v1/backoffice/impersonations/${limitedWriteImpersonation.sessionId}/start`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(limitedWriteStarted.status, "active");
    assert.deepEqual(limitedWriteStarted.restrictedActions, ["jobs.retry"]);
    const limitedWriteEnded = await requestJson(baseUrl, `/v1/backoffice/impersonations/${limitedWriteImpersonation.sessionId}/end`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "case_resolved"
      }
    });
    assert.equal(limitedWriteEnded.status, "terminated");
    const singleApproverWriteCase = await requestJson(baseUrl, "/v1/backoffice/support-cases", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        category: "impersonation_escalation",
        severity: "high",
        approvedActions: ["impersonation_read_only", "impersonation_limited_write"]
      }
    });
    await requestJson(baseUrl, `/v1/backoffice/support-cases/${singleApproverWriteCase.supportCaseId}/approve-actions`, {
      method: "POST",
      token: approverToken,
      body: {
        companyId: DEMO_IDS.companyId,
        approvedActions: ["impersonation_read_only", "impersonation_limited_write"]
      }
    });
    const singleApproverWriteSession = await requestJson(baseUrl, "/v1/backoffice/impersonations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        supportCaseId: singleApproverWriteCase.supportCaseId,
        targetCompanyUserId: DEMO_APPROVER_IDS.companyUserId,
        purposeCode: "support_limited_write_single_approver",
        mode: "limited_write",
        restrictedActions: ["jobs.retry"]
      }
    });
    const singleApproverDenied = await requestJson(baseUrl, `/v1/backoffice/impersonations/${singleApproverWriteSession.sessionId}/approve`, {
      method: "POST",
      token: secondApproverToken,
      expectedStatus: 403,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(singleApproverDenied.error, "impersonation_limited_write_dual_approval_required");
    const expiringImpersonation = await requestJson(baseUrl, "/v1/backoffice/impersonations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        supportCaseId: singleApproverWriteCase.supportCaseId,
        targetCompanyUserId: DEMO_APPROVER_IDS.companyUserId,
        purposeCode: "support_read_only_expiring",
        mode: "read_only",
        expiresInMinutes: 1
      }
    });
    await requestJson(baseUrl, `/v1/backoffice/impersonations/${expiringImpersonation.sessionId}/approve`, {
      method: "POST",
      token: approverToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    now = new Date("2026-03-22T21:32:30Z");
    const expiredStartDenied = await requestJson(baseUrl, `/v1/backoffice/impersonations/${expiringImpersonation.sessionId}/start`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(expiredStartDenied.error, "impersonation_session_expired");
    now = new Date("2026-03-22T21:33:00Z");

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
    assert.notEqual(payrollFinding.userId, DEMO_IDS.userId);
    assert.equal(accessReview.masking.masked, true);
    const staleDelegationFinding = accessReview.findings.find((finding) => finding.findingCode === "access.stale_delegation");
    assert.ok(staleDelegationFinding);
    assert.equal(accessReview.cadenceCode, "quarterly");
    assert.equal(accessReview.reviewPeriodStart, "2026-01-01");
    assert.equal(accessReview.reviewPeriodEnd, "2026-03-31");

    const reviewed = await requestJson(baseUrl, `/v1/backoffice/access-reviews/${accessReview.reviewBatchId}/findings/${payrollFinding.findingId}`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        decision: "accepted",
        remediationNote: "Phase 14 API verification"
      }
    });
    assert.equal(reviewed.status, "in_review");
    const remediated = await requestJson(baseUrl, `/v1/backoffice/access-reviews/${accessReview.reviewBatchId}/findings/${staleDelegationFinding.findingId}`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        decision: "removed",
        remediationNote: "Phase 14 API stale delegation cleanup"
      }
    });
    assert.equal(remediated.status, "remediated");
    const selfSignoffDenied = await requestJson(baseUrl, `/v1/backoffice/access-reviews/${accessReview.reviewBatchId}/sign-off`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        attestationNote: "Self sign-off should fail"
      }
    });
    assert.equal(selfSignoffDenied.error, "access_review_signoff_separation_required");
    const signedOffReview = await requestJson(baseUrl, `/v1/backoffice/access-reviews/${accessReview.reviewBatchId}/sign-off`, {
      method: "POST",
      token: secondApproverToken,
      body: {
        companyId: DEMO_IDS.companyId,
        attestationNote: "Independent attestation complete"
      }
    });
    assert.equal(signedOffReview.status, "signed_off");
    assert.notEqual(signedOffReview.signedOffByUserId, secondApprover.user.userId);

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
    assert.notEqual(breakGlass.incidentId, "INC-1401");
    assert.equal(breakGlass.masking.masked, true);
    const breakGlassInvalidAllowlist = await requestJson(baseUrl, "/v1/backoffice/break-glass", {
      method: "POST",
      token: adminToken,
      expectedStatus: 400,
      body: {
        companyId: DEMO_IDS.companyId,
        incidentId: "INC-1402",
        purposeCode: "invalid_break_glass_request",
        requestedActions: ["dangerous_live_mutation"]
      }
    });
    assert.equal(breakGlassInvalidAllowlist.error, "break_glass_requested_action_not_allowlisted");
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
    assert.equal(secondApproval.status, "dual_approved");
    assert.notEqual(secondApproval.approvals[0], DEMO_APPROVER_IDS.userId);
    assert.equal(secondApproval.watermark.watermarkCode, "BREAK-GLASS");
    const startedBreakGlass = await requestJson(baseUrl, `/v1/backoffice/break-glass/${breakGlass.breakGlassId}/start`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(startedBreakGlass.status, "active");
    const reviewedBreakGlass = await requestJson(baseUrl, `/v1/backoffice/break-glass/${breakGlass.breakGlassId}/close`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "incident_resolved"
      }
    });
    assert.equal(reviewedBreakGlass.status, "ended");
    assert.equal(reviewedBreakGlass.endReasonCode, "incident_resolved");
    const closedBreakGlass = await requestJson(baseUrl, `/v1/backoffice/break-glass/${breakGlass.breakGlassId}/close`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(closedBreakGlass.status, "ended");
    const breakGlassEvidence = await requestJson(baseUrl, `/v1/backoffice/break-glass/${breakGlass.breakGlassId}/evidence?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(breakGlassEvidence.evidenceBundle.status, "frozen");
    assert.equal(breakGlassEvidence.evidenceBundle.watermark.watermarkCode, "BREAK-GLASS");

    const auditEvents = await requestJson(baseUrl, `/v1/backoffice/audit-events?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(auditEvents.items.some((event) => event.entityType === "admin_diagnostic"), true);
    assert.equal(auditEvents.items.some((event) => event.entityType === "break_glass_session"), true);
    const fieldUserAuditForbidden = await requestJson(baseUrl, `/v1/backoffice/audit-events?companyId=${DEMO_IDS.companyId}`, {
      token: fieldUserToken,
      expectedStatus: 403
    });
    assert.equal(fieldUserAuditForbidden.error, "backoffice_role_forbidden");
  } finally {
    await stopServer(server);
  }
});
