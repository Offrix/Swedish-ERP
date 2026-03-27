import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_APPROVER_EMAIL, DEMO_APPROVER_IDS, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { loginWithStrongAuthOnPlatform, loginWithTotpOnPlatform } from "../helpers/platform-auth.mjs";

test("Phase 14.1 backoffice, SoD, impersonation and break-glass stay policy-bound", () => {
  let now = new Date("2026-03-22T19:30:00Z");
  const platform = createApiPlatform({
    clock: () => now
  });
  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  const approverToken = loginWithTotpOnPlatform({
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
  const secondApproverToken = loginWithTotpOnPlatform({
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
  platform.createDelegation({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    fromCompanyUserId: DEMO_IDS.companyUserId,
    toCompanyUserId: secondApprover.companyUserId,
    scopeCode: "support_case",
    permissionCode: "company.manage",
    startsAt: "2025-10-01T00:00:00.000Z"
  });

  const supportCase = platform.createSupportCase({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    category: "integration_failure",
    severity: "high",
    approvedActions: ["plan_job_replay", "impersonation_read_only", "impersonation_limited_write"],
    relatedObjectRefs: [{ objectType: "submission", objectId: "submission-1" }]
  });
  platform.approveSupportCaseActions({
    sessionToken: approverToken,
    companyId: DEMO_IDS.companyId,
    supportCaseId: supportCase.supportCaseId,
    approvedActions: ["plan_job_replay", "impersonation_read_only"]
  });

  const job = platform.enqueueAsyncJob({
    companyId: DEMO_IDS.companyId,
    jobType: "bank.payment_export",
    payloadRef: "payout-1",
    payload: { payoutBatchId: "payout-1" },
    riskClass: "high_risk",
    actorId: "phase14-1-unit"
  });
  platform.failAsyncJobAttempt({
    companyId: DEMO_IDS.companyId,
    jobId: job.jobId,
    errorClass: "persistent_technical",
    errorMessage: "provider outage",
    replayAllowed: true
  });

  const diagnostic = platform.runAdminDiagnostic({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    supportCaseId: supportCase.supportCaseId,
    commandType: "plan_job_replay",
    input: { jobId: job.jobId }
  });
  assert.equal(diagnostic.resultSummary.replayPlan.status, "replay_planned");
  const secretRefDiagnostic = platform.runAdminDiagnostic({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    supportCaseId: supportCase.supportCaseId,
    commandType: "verify_secret_refs",
    input: { secretRefs: ["vault://prod/payments/webhook-secret"] }
  });
  assert.equal(secretRefDiagnostic.resultSummary.verified, true);
  assert.equal(secretRefDiagnostic.resultSummary.secretRefs[0].includes("webhook-secret"), false);
  const closedSupportCase = platform.closeSupportCase({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    supportCaseId: supportCase.supportCaseId,
    resolutionCode: "operator_resolved",
    resolutionNote: "Replay planned and monitored."
  });
  assert.equal(closedSupportCase.status, "closed");
  assert.equal(closedSupportCase.resolutionCode, "operator_resolved");
  assert.equal(closedSupportCase.closedByUserId, DEMO_IDS.userId);

  const impersonation = platform.requestImpersonation({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    supportCaseId: supportCase.supportCaseId,
    targetCompanyUserId: DEMO_APPROVER_IDS.companyUserId,
    purposeCode: "support_read_only",
    mode: "read_only"
  });
  assert.throws(
    () =>
      platform.approveImpersonation({
        sessionToken: adminToken,
        companyId: DEMO_IDS.companyId,
        sessionId: impersonation.sessionId
      }),
    (error) => error?.code === "impersonation_self_approval_forbidden"
  );
  const impersonationApproved = platform.approveImpersonation({
    sessionToken: approverToken,
    companyId: DEMO_IDS.companyId,
    sessionId: impersonation.sessionId
  });
  assert.equal(impersonationApproved.status, "approved");
  assert.deepEqual(impersonationApproved.approvalActorIds, [DEMO_APPROVER_IDS.userId]);
  assert.equal(impersonationApproved.watermark.watermarkCode, "SUPPORT-IMPERSONATION");
  const impersonationStarted = platform.activateImpersonation({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    sessionId: impersonation.sessionId
  });
  assert.equal(impersonationStarted.status, "active");
  assert.equal(impersonationStarted.activatedByUserId, DEMO_IDS.userId);
  const impersonationEnded = platform.terminateImpersonation({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    sessionId: impersonation.sessionId,
    reasonCode: "case_resolved"
  });
  assert.equal(impersonationEnded.status, "terminated");
  assert.throws(
    () =>
      platform.requestImpersonation({
        sessionToken: adminToken,
        companyId: DEMO_IDS.companyId,
        supportCaseId: supportCase.supportCaseId,
        targetCompanyUserId: DEMO_APPROVER_IDS.companyUserId,
        purposeCode: "support_limited_write_missing_allowlist",
        mode: "limited_write"
      }),
    (error) => error?.code === "impersonation_restricted_actions_required"
  );
  const limitedWriteImpersonation = platform.requestImpersonation({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    supportCaseId: supportCase.supportCaseId,
    targetCompanyUserId: DEMO_APPROVER_IDS.companyUserId,
    purposeCode: "support_limited_write",
    mode: "limited_write",
    restrictedActions: ["jobs.retry"]
  });
  assert.throws(
    () =>
      platform.approveImpersonation({
        sessionToken: approverToken,
        companyId: DEMO_IDS.companyId,
        sessionId: limitedWriteImpersonation.sessionId
      }),
    (error) => error?.code === "impersonation_limited_write_approval_required"
  );
  platform.approveSupportCaseActions({
    sessionToken: secondApproverToken,
    companyId: DEMO_IDS.companyId,
    supportCaseId: supportCase.supportCaseId,
    approvedActions: ["impersonation_limited_write"]
  });
  const limitedWriteApproved = platform.approveImpersonation({
    sessionToken: approverToken,
    companyId: DEMO_IDS.companyId,
    sessionId: limitedWriteImpersonation.sessionId
  });
  assert.equal(limitedWriteApproved.status, "approved");
  assert.deepEqual(limitedWriteApproved.approvalActorIds.sort(), [DEMO_APPROVER_IDS.userId, secondApprover.user.userId].sort());
  const limitedWriteStarted = platform.activateImpersonation({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    sessionId: limitedWriteImpersonation.sessionId
  });
  assert.equal(limitedWriteStarted.status, "active");
  assert.deepEqual(limitedWriteStarted.restrictedActions, ["jobs.retry"]);
  const limitedWriteEnded = platform.terminateImpersonation({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    sessionId: limitedWriteImpersonation.sessionId,
    reasonCode: "case_resolved"
  });
  assert.equal(limitedWriteEnded.status, "terminated");
  const singleApproverWriteCase = platform.createSupportCase({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    category: "impersonation_escalation",
    severity: "high",
    approvedActions: ["impersonation_read_only", "impersonation_limited_write"]
  });
  platform.approveSupportCaseActions({
    sessionToken: approverToken,
    companyId: DEMO_IDS.companyId,
    supportCaseId: singleApproverWriteCase.supportCaseId,
    approvedActions: ["impersonation_read_only", "impersonation_limited_write"]
  });
  const singleApproverWriteSession = platform.requestImpersonation({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    supportCaseId: singleApproverWriteCase.supportCaseId,
    targetCompanyUserId: DEMO_APPROVER_IDS.companyUserId,
    purposeCode: "support_limited_write_single_approver",
    mode: "limited_write",
    restrictedActions: ["jobs.retry"]
  });
  assert.throws(
    () =>
      platform.approveImpersonation({
        sessionToken: secondApproverToken,
        companyId: DEMO_IDS.companyId,
        sessionId: singleApproverWriteSession.sessionId
      }),
    (error) => error?.code === "impersonation_limited_write_dual_approval_required"
  );
  const expiringImpersonation = platform.requestImpersonation({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    supportCaseId: singleApproverWriteCase.supportCaseId,
    targetCompanyUserId: DEMO_APPROVER_IDS.companyUserId,
    purposeCode: "support_read_only_expiring",
    mode: "read_only",
    expiresInMinutes: 1
  });
  platform.approveImpersonation({
    sessionToken: approverToken,
    companyId: DEMO_IDS.companyId,
    sessionId: expiringImpersonation.sessionId
  });
  now = new Date("2026-03-22T19:32:00Z");
  assert.throws(
    () =>
      platform.activateImpersonation({
        sessionToken: adminToken,
        companyId: DEMO_IDS.companyId,
        sessionId: expiringImpersonation.sessionId
      }),
    (error) => error?.code === "impersonation_session_expired"
  );
  now = new Date("2026-03-22T19:33:00Z");

  const accessReview = platform.generateAccessReview({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    dueInDays: 5
  });
  const payrollFinding = accessReview.findings.find((finding) => finding.findingCode === "sod.admin_payroll_overlap");
  assert.ok(payrollFinding);
  const staleDelegationFinding = accessReview.findings.find((finding) => finding.findingCode === "access.stale_delegation");
  assert.ok(staleDelegationFinding);
  assert.equal(accessReview.cadenceCode, "quarterly");
  assert.equal(accessReview.reviewPeriodStart, "2026-01-01");
  assert.equal(accessReview.reviewPeriodEnd, "2026-03-31");
  assert.equal(accessReview.coverageSummary.activeDelegationCount >= 1, true);
  const reviewed = platform.recordAccessReviewDecision({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    reviewBatchId: accessReview.reviewBatchId,
    findingId: payrollFinding.findingId,
    decision: "accepted",
    remediationNote: "Phase 14 unit test"
  });
  assert.equal(["in_review", "signed_off", "remediated"].includes(reviewed.status), true);

  const breakGlass = platform.requestBreakGlass({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    incidentId: "INC-1401",
    purposeCode: "incident_investigation",
    requestedActions: ["list_feature_flags"]
  });
  assert.throws(
    () =>
      platform.approveBreakGlass({
        sessionToken: adminToken,
        companyId: DEMO_IDS.companyId,
        breakGlassId: breakGlass.breakGlassId
      }),
    (error) => error?.code === "break_glass_self_approval_forbidden"
  );
  const firstApproval = platform.approveBreakGlass({
    sessionToken: approverToken,
    companyId: DEMO_IDS.companyId,
    breakGlassId: breakGlass.breakGlassId
  });
  assert.equal(firstApproval.status, "requested");
  const secondApproval = platform.approveBreakGlass({
    sessionToken: secondApproverToken,
    companyId: DEMO_IDS.companyId,
    breakGlassId: breakGlass.breakGlassId
  });
  assert.equal(secondApproval.status, "dual_approved");
  assert.equal(secondApproval.watermark.watermarkCode, "BREAK-GLASS");
  const activeBreakGlass = platform.activateBreakGlass({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    breakGlassId: breakGlass.breakGlassId
  });
  assert.equal(activeBreakGlass.status, "active");
  const endedBreakGlass = platform.closeBreakGlassSession({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    breakGlassId: breakGlass.breakGlassId,
    reasonCode: "incident_resolved"
  });
  assert.equal(endedBreakGlass.status, "ended");
  assert.equal(endedBreakGlass.endReasonCode, "incident_resolved");
  const closedBreakGlass = platform.closeBreakGlassSession({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    breakGlassId: breakGlass.breakGlassId
  });
  assert.equal(closedBreakGlass.status, "ended");

  const auditTrail = platform.listAuditTrail({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId
  });
  assert.equal(auditTrail.some((event) => event.entityType === "break_glass_session"), true);
  assert.equal(auditTrail.some((event) => event.entityType === "admin_diagnostic"), true);
});
