import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

test("Phase 11.2 API scopes bureau portfolio and tracks requests, approvals, comments and mass actions", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T12:00:00Z")
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

    const consultant = platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "bureau-consultant@example.test",
      displayName: "Bureau Consultant",
      roleCode: "bureau_user",
      requiresMfa: false
    });
    const otherConsultant = platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "bureau-other@example.test",
      displayName: "Other Bureau Consultant",
      roleCode: "bureau_user",
      requiresMfa: false
    });
    const consultantToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: consultant.user.email
    });

    const clientA = platform.createCompany({
      legalName: "Client Scope A AB",
      orgNumber: "559900-1101",
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
    const clientB = platform.createCompany({
      legalName: "Client Scope B AB",
      orgNumber: "559900-1102",
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

    const reportSnapshotId = seedClientReporting(platform, clientA.companyId);

    await requestJson(`${baseUrl}/v1/bureau/portfolio/memberships`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        clientCompanyId: clientA.companyId,
        responsibleConsultantId: consultant.companyUserId,
        activeFrom: "2026-01-01"
      }
    });
    await requestJson(`${baseUrl}/v1/bureau/portfolio/memberships`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        clientCompanyId: clientB.companyId,
        responsibleConsultantId: otherConsultant.companyUserId,
        activeFrom: "2026-01-01"
      }
    });

    const visiblePortfolio = await requestJson(`${baseUrl}/v1/bureau/portfolio?bureauOrgId=${DEMO_IDS.companyId}`, {
      token: consultantToken
    });
    assert.equal(visiblePortfolio.items.length, 1);
    assert.equal(visiblePortfolio.items[0].clientCompanyId, clientA.companyId);

    const request = await requestJson(`${baseUrl}/v1/bureau/client-requests`, {
      method: "POST",
      token: consultantToken,
      expectedStatus: 201,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        clientCompanyId: clientA.companyId,
        sourceObjectType: "report_snapshot",
        sourceObjectId: "phase11-bureau-snapshot",
        requestType: "document_request",
        requestedFromContactId: "finance@scope-a.test",
        blockerScope: "submission",
        targetDate: "2026-04-08",
        requestedPayload: {
          documentCategories: ["bank_statement"]
        }
      }
    });
    assert.equal(request.deadlineAt, "2026-04-06T09:00:00.000Z");

    const sentRequest = await requestJson(`${baseUrl}/v1/bureau/client-requests/${request.requestId}/send`, {
      method: "POST",
      token: consultantToken,
      body: {
        bureauOrgId: DEMO_IDS.companyId
      }
    });
    assert.equal(sentRequest.status, "sent");

    const deliveredRequest = await requestJson(`${baseUrl}/v1/bureau/client-requests/${request.requestId}/respond`, {
      method: "POST",
      body: {
        responseAccessCode: sentRequest.responseAccessCode,
        respondedByContactId: "finance@scope-a.test",
        responseType: "documents_delivered",
        attachments: [{ documentId: "doc-scope-a-1", name: "Bank statement.pdf" }]
      }
    });
    assert.equal(deliveredRequest.status, "delivered");

    const acceptedRequest = await requestJson(`${baseUrl}/v1/bureau/client-requests/${request.requestId}/accept`, {
      method: "POST",
      token: consultantToken,
      body: {
        bureauOrgId: DEMO_IDS.companyId
      }
    });
    assert.equal(acceptedRequest.status, "accepted");

    const approval = await requestJson(`${baseUrl}/v1/bureau/approval-packages`, {
      method: "POST",
      token: consultantToken,
      expectedStatus: 201,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        clientCompanyId: clientA.companyId,
        approvalType: "period_close",
        snapshotRef: {
          reportSnapshotId,
          snapshotHash: reportSnapshotId
        },
        targetDate: "2026-04-15",
        namedApproverContactId: "ceo@scope-a.test"
      }
    });
    const sentApproval = await requestJson(`${baseUrl}/v1/bureau/approval-packages/${approval.approvalPackageId}/send`, {
      method: "POST",
      token: consultantToken,
      body: {
        bureauOrgId: DEMO_IDS.companyId
      }
    });
    const approved = await requestJson(`${baseUrl}/v1/bureau/approval-packages/${approval.approvalPackageId}/respond`, {
      method: "POST",
      body: {
        responseAccessCode: sentApproval.responseAccessCode,
        respondedByContactId: "ceo@scope-a.test",
        responseType: "approved"
      }
    });
    assert.equal(approved.status, "approved");

    const comment = await requestJson(`${baseUrl}/v1/collaboration/comments`, {
      method: "POST",
      token: consultantToken,
      expectedStatus: 201,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        objectType: "bureau_client_request",
        objectId: request.requestId,
        body: "Klart att fÃ¶lja upp med klienten.",
        mentionCompanyUserIds: [consultant.companyUserId],
        createAssignment: true
      }
    });
    assert.equal(comment.objectType, "bureau_client_request");

    const workItems = await requestJson(`${baseUrl}/v1/work-items?bureauOrgId=${DEMO_IDS.companyId}`, {
      token: consultantToken
    });
    const commentWorkItem = workItems.items.find((item) => item.sourceType === "core_comment");
    assert.equal(Boolean(commentWorkItem), true);
    const claimedWorkItem = await requestJson(`${baseUrl}/v1/work-items/${commentWorkItem.workItemId}/claim`, {
      method: "POST",
      token: consultantToken,
      body: {
        bureauOrgId: DEMO_IDS.companyId
      }
    });
    assert.equal(claimedWorkItem.status, "acknowledged");
    const resolvedWorkItem = await requestJson(`${baseUrl}/v1/work-items/${commentWorkItem.workItemId}/resolve`, {
      method: "POST",
      token: consultantToken,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        resolutionCode: "client_follow_up_done",
        completionNote: "Follow-up completed."
      }
    });
    assert.equal(resolvedWorkItem.status, "resolved");
    assert.equal(resolvedWorkItem.resolutionCode, "client_follow_up_done");

    const reminders = await requestJson(`${baseUrl}/v1/bureau/mass-actions`, {
      method: "POST",
      token: adminToken,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        actionType: "send_reminder",
        clientCompanyIds: [clientA.companyId, clientB.companyId]
      }
    });
    assert.equal(reminders.results.length, 2);
  } finally {
    await stopServer(server);
  }
});

function seedClientReporting(platform, companyId) {
  const eligibilityAssessment = platform.assessCashMethodEligibility({
    companyId,
    annualNetTurnoverSek: 500000,
    legalFormCode: "AB",
    actorId: "setup"
  });
  const methodProfile = platform.createMethodProfile({
    companyId,
    methodCode: "FAKTURERINGSMETOD",
    effectiveFrom: "2026-01-01",
    fiscalYearStartDate: "2026-01-01",
    eligibilityAssessmentId: eligibilityAssessment.assessmentId,
    onboardingOverride: true,
    actorId: "setup"
  });
  platform.activateMethodProfile({
    companyId,
    methodProfileId: methodProfile.methodProfileId,
    actorId: "setup"
  });
  const fiscalYearProfile = platform.createFiscalYearProfile({
    companyId,
    legalFormCode: "AKTIEBOLAG",
    actorId: "setup"
  });
  const fiscalYear = platform.createFiscalYear({
    companyId,
    fiscalYearProfileId: fiscalYearProfile.fiscalYearProfileId,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    approvalBasisCode: "BASELINE",
    actorId: "setup"
  });
  platform.activateFiscalYear({
    companyId,
    fiscalYearId: fiscalYear.fiscalYearId,
    actorId: "setup"
  });
  platform.installLedgerCatalog({
    companyId,
    actorId: "setup"
  });
  platform.ensureAccountingYearPeriod({
    companyId,
    fiscalYear: 2026,
    actorId: "setup"
  });
  const created = platform.createJournalEntry({
    companyId,
    journalDate: "2026-01-05",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: `phase11-bureau-${companyId}`,
    actorId: "setup",
    idempotencyKey: `phase11-bureau-${companyId}`,
    lines: [
      { accountNumber: "1510", debitAmount: 5000 },
      { accountNumber: "3010", creditAmount: 5000 }
    ]
  });
  platform.validateJournalEntry({
    companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "setup"
  });
  platform.postJournalEntry({
    companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "setup"
  });
  const snapshot = platform.runReportSnapshot({
    companyId,
    reportCode: "income_statement",
    fromDate: "2026-01-01",
    toDate: "2026-01-31",
    actorId: "setup"
  });
  return snapshot.reportSnapshotId;
}

async function loginWithStrongAuth({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(`${baseUrl}/v1/auth/login`, {
    method: "POST",
    body: {
      companyId,
      email
    }
  });
  const totpCode = platform.getTotpCodeForTesting({ companyId, email });
  await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: totpCode
    }
  });
  const bankidStart = await requestJson(`${baseUrl}/v1/auth/bankid/start`, {
    method: "POST",
    token: started.sessionToken
  });
  await requestJson(`${baseUrl}/v1/auth/bankid/collect`, {
    method: "POST",
    token: started.sessionToken,
    body: {
      orderRef: bankidStart.orderRef,
      completionToken: platform.getBankIdCompletionTokenForTesting(bankidStart.orderRef)
    }
  });
  return started.sessionToken;
}

async function loginWithTotpOnly({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(`${baseUrl}/v1/auth/login`, {
    method: "POST",
    body: {
      companyId,
      email
    }
  });
  await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: platform.getTotpCodeForTesting({ companyId, email })
    }
  });
  return started.sessionToken;
}

async function requestJson(url, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus);
  return payload;
}
