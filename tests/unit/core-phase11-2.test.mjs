import test from "node:test";
import assert from "node:assert/strict";
import { createCorePlatform } from "../../packages/domain-core/src/index.mjs";
import { createOrgAuthPlatform, DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";

test("Phase 11.2 core enforces bureau scope, derives deadlines and tracks requests plus approvals", () => {
  const clock = () => new Date("2026-03-22T10:00:00Z");
  const org = createOrgAuthPlatform({ clock, bootstrapScenarioCode: "test_default_demo" });
  const core = createCorePlatform({ orgAuthPlatform: org, clock });
  const adminToken = loginStrongAuth(org, DEMO_IDS.companyId, DEMO_ADMIN_EMAIL);

  const consultant = org.createCompanyUser({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    email: "consultant@example.test",
    displayName: "Consultant Scope",
    roleCode: "bureau_user",
    requiresMfa: false
  });
  const otherConsultant = org.createCompanyUser({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    email: "other-consultant@example.test",
    displayName: "Other Consultant",
    roleCode: "bureau_user",
    requiresMfa: false
  });
  const consultantToken = loginWithTotpOnly(org, DEMO_IDS.companyId, consultant.user.email);

  const clientA = org.createCompany({
    legalName: "Client A AB",
    orgNumber: "559900-1001",
    settingsJson: {
      bureauDelivery: {
        closeLeadBusinessDays: 3,
        reportingLeadBusinessDays: 2,
        submissionLeadBusinessDays: 2,
        generalLeadBusinessDays: 1,
        approvalLeadBusinessDays: 2,
        reminderProfile: "standard"
      }
    }
  });
  const clientB = org.createCompany({
    legalName: "Client B AB",
    orgNumber: "559900-1002",
    settingsJson: {
      bureauDelivery: {
        closeLeadBusinessDays: 3,
        reportingLeadBusinessDays: 2,
        submissionLeadBusinessDays: 2,
        generalLeadBusinessDays: 1,
        approvalLeadBusinessDays: 2,
        reminderProfile: "standard"
      }
    }
  });
  const expiredClient = org.createCompany({
    legalName: "Expired Client AB",
    orgNumber: "559900-1003",
    settingsJson: {
      bureauDelivery: {
        closeLeadBusinessDays: 3,
        reportingLeadBusinessDays: 2,
        submissionLeadBusinessDays: 2,
        generalLeadBusinessDays: 1,
        approvalLeadBusinessDays: 2,
        reminderProfile: "standard"
      }
    }
  });

  core.createPortfolioMembership({
    sessionToken: adminToken,
    bureauOrgId: DEMO_IDS.companyId,
    clientCompanyId: clientA.companyId,
    responsibleConsultantId: consultant.companyUserId,
    activeFrom: "2026-01-01"
  });
  core.createPortfolioMembership({
    sessionToken: adminToken,
    bureauOrgId: DEMO_IDS.companyId,
    clientCompanyId: clientB.companyId,
    responsibleConsultantId: otherConsultant.companyUserId,
    activeFrom: "2026-01-01"
  });
  core.createPortfolioMembership({
    sessionToken: adminToken,
    bureauOrgId: DEMO_IDS.companyId,
    clientCompanyId: expiredClient.companyId,
    responsibleConsultantId: consultant.companyUserId,
    activeFrom: "2026-01-01",
    activeTo: "2026-02-01"
  });

  const visiblePortfolio = core.listPortfolioMemberships({
    sessionToken: consultantToken,
    bureauOrgId: DEMO_IDS.companyId
  });
  assert.equal(visiblePortfolio.length, 1);
  assert.equal(visiblePortfolio[0].clientCompanyId, clientA.companyId);

  const request = core.createClientRequest({
    sessionToken: consultantToken,
    bureauOrgId: DEMO_IDS.companyId,
    clientCompanyId: clientA.companyId,
    sourceObjectType: "report_snapshot",
    sourceObjectId: "snapshot-a",
    requestType: "document_request",
    requestedFromContactId: "finance@clienta.test",
    blockerScope: "submission",
    targetDate: "2026-04-08",
    requestedPayload: {
      documentCategories: ["bank_statement", "supplier_invoice"]
    }
  });
  assert.equal(request.deadlineAt, "2026-04-06T09:00:00.000Z");

  const sentRequest = core.sendClientRequest({
    sessionToken: consultantToken,
    bureauOrgId: DEMO_IDS.companyId,
    requestId: request.requestId
  });
  assert.equal(sentRequest.status, "sent");
  assert.equal(typeof sentRequest.responseAccessCode, "string");

  const deliveredRequest = core.submitClientResponse({
    requestId: request.requestId,
    responseAccessCode: sentRequest.responseAccessCode,
    respondedByContactId: "finance@clienta.test",
    attachments: [{ documentId: "doc-a-1", name: "Bank statement.pdf" }]
  });
  assert.equal(deliveredRequest.status, "delivered");

  const acceptedRequest = core.acceptClientRequest({
    sessionToken: consultantToken,
    bureauOrgId: DEMO_IDS.companyId,
    requestId: request.requestId
  });
  assert.equal(acceptedRequest.status, "accepted");

  const approval = core.createApprovalPackage({
    sessionToken: consultantToken,
    bureauOrgId: DEMO_IDS.companyId,
    clientCompanyId: clientA.companyId,
    approvalType: "period_close",
    snapshotRef: {
      reportSnapshotId: "report-snapshot-a"
    },
    targetDate: "2026-04-15",
    namedApproverContactId: "ceo@clienta.test"
  });
  const sentApproval = core.sendApprovalPackage({
    sessionToken: consultantToken,
    bureauOrgId: DEMO_IDS.companyId,
    approvalPackageId: approval.approvalPackageId
  });
  const approved = core.recordApprovalResponse({
    approvalPackageId: approval.approvalPackageId,
    responseAccessCode: sentApproval.responseAccessCode,
    respondedByContactId: "ceo@clienta.test",
    responseType: "approved"
  });
  assert.equal(approved.status, "approved");

  const comment = core.createComment({
    sessionToken: consultantToken,
    bureauOrgId: DEMO_IDS.companyId,
    objectType: "bureau_client_request",
    objectId: request.requestId,
    body: "Behöver dubbelkolla sista underlaget.",
    mentionCompanyUserIds: [consultant.companyUserId],
    createAssignment: true
  });
  assert.equal(comment.objectId, request.requestId);

  const workItems = core.listWorkItems({
    sessionToken: consultantToken,
    bureauOrgId: DEMO_IDS.companyId
  });
  const commentWorkItem = workItems.find((item) => item.sourceType === "core_comment");
  assert.equal(Boolean(commentWorkItem), true);
  const claimedWorkItem = core.claimWorkItem({
    sessionToken: consultantToken,
    bureauOrgId: DEMO_IDS.companyId,
    workItemId: commentWorkItem.workItemId
  });
  assert.equal(claimedWorkItem.status, "acknowledged");
  const resolvedWorkItem = core.resolveWorkItem({
    sessionToken: consultantToken,
    bureauOrgId: DEMO_IDS.companyId,
    workItemId: commentWorkItem.workItemId,
    resolutionCode: "client_follow_up_done",
    completionNote: "Follow-up completed."
  });
  assert.equal(resolvedWorkItem.status, "resolved");
  assert.equal(resolvedWorkItem.resolutionCode, "client_follow_up_done");

  const recomputedPortfolio = core.runPortfolioStatusRecomputeJob({
    bureauOrgId: DEMO_IDS.companyId
  });
  assert.equal(recomputedPortfolio.some((item) => item.clientCompanyId === expiredClient.companyId), true);
});

function loginStrongAuth(platform, companyId, email) {
  const started = platform.startLogin({ companyId, email });
  platform.verifyTotp({
    sessionToken: started.sessionToken,
    code: platform.getTotpCodeForTesting({ companyId, email })
  });
  const bankIdStart = platform.startBankIdAuthentication({
    sessionToken: started.sessionToken
  });
  platform.collectBankIdAuthentication({
    sessionToken: started.sessionToken,
    orderRef: bankIdStart.orderRef,
    completionToken: platform.getBankIdCompletionTokenForTesting(bankIdStart.orderRef)
  });
  return started.sessionToken;
}

function loginWithTotpOnly(platform, companyId, email) {
  const started = platform.startLogin({ companyId, email });
  platform.verifyTotp({
    sessionToken: started.sessionToken,
    code: platform.getTotpCodeForTesting({ companyId, email })
  });
  return started.sessionToken;
}
