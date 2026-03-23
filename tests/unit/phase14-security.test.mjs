import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_APPROVER_EMAIL, DEMO_APPROVER_IDS, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { loginWithStrongAuthOnPlatform, loginWithTotpOnPlatform } from "../helpers/platform-auth.mjs";

test("Phase 14.1 backoffice, SoD, impersonation and break-glass stay policy-bound", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T19:30:00Z")
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

  const supportCase = platform.createSupportCase({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    category: "integration_failure",
    severity: "high",
    approvedActions: ["plan_job_replay"],
    relatedObjectRefs: [{ objectType: "submission", objectId: "submission-1" }]
  });
  platform.approveSupportCaseActions({
    sessionToken: approverToken,
    companyId: DEMO_IDS.companyId,
    supportCaseId: supportCase.supportCaseId,
    approvedActions: ["plan_job_replay"]
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
  assert.equal(impersonationApproved.status, "active");
  const impersonationEnded = platform.terminateImpersonation({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    sessionId: impersonation.sessionId,
    reasonCode: "case_resolved"
  });
  assert.equal(impersonationEnded.status, "ended");

  const accessReview = platform.generateAccessReview({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    dueInDays: 5
  });
  const payrollFinding = accessReview.findings.find((finding) => finding.findingCode === "sod.admin_payroll_overlap");
  assert.ok(payrollFinding);
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
  assert.equal(secondApproval.status, "active");
  const reviewedBreakGlass = platform.closeBreakGlassSession({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    breakGlassId: breakGlass.breakGlassId
  });
  assert.equal(reviewedBreakGlass.status, "reviewed");
  const closedBreakGlass = platform.closeBreakGlassSession({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    breakGlassId: breakGlass.breakGlassId
  });
  assert.equal(closedBreakGlass.status, "closed");

  const auditTrail = platform.listAuditTrail({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId
  });
  assert.equal(auditTrail.some((event) => event.entityType === "break_glass_session"), true);
  assert.equal(auditTrail.some((event) => event.entityType === "admin_diagnostic"), true);
});
