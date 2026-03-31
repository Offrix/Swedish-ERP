import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

test("Phase 11.2 end-to-end flow exposes bureau portfolio, tracked client requests and approval packages", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T12:30:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const root = await requestJson(baseUrl, "/");
    assert.equal(root.routes.includes("/v1/bureau/portfolio"), true);
    assert.equal(root.routes.includes("/v1/bureau/client-requests"), true);
    assert.equal(root.routes.includes("/v1/bureau/approval-packages"), true);
    assert.equal(root.routes.includes("/v1/collaboration/comments"), true);

    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });
    const consultant = platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "bureau-e2e@example.test",
      displayName: "Bureau E2E Consultant",
      roleCode: "bureau_user",
      requiresMfa: false
    });
    const consultantToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: consultant.user.email
    });

    const clientCompany = platform.createCompany({
      legalName: "Bureau Flow Client AB",
      orgNumber: "559900-2200",
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
    const reportSnapshotId = seedClientReporting(platform, clientCompany.companyId);

    await requestJson(baseUrl, "/v1/bureau/portfolio/memberships", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        clientCompanyId: clientCompany.companyId,
        responsibleConsultantId: consultant.companyUserId,
        activeFrom: "2026-01-01"
      }
    });

    const portfolio = await requestJson(baseUrl, `/v1/bureau/portfolio?bureauOrgId=${DEMO_IDS.companyId}`, {
      token: consultantToken
    });
    assert.equal(portfolio.items.length, 1);
    assert.equal(portfolio.items[0].clientStatus, "active");

    const request = await requestJson(baseUrl, "/v1/bureau/client-requests", {
      method: "POST",
      token: consultantToken,
      expectedStatus: 201,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        clientCompanyId: clientCompany.companyId,
        sourceObjectType: "report_snapshot",
        sourceObjectId: reportSnapshotId,
        requestType: "document_request",
        requestedFromContactId: "finance@bureau-flow.test",
        blockerScope: "submission",
        targetDate: "2026-04-08",
        requestedPayload: {
          documentCategories: ["bank_statement", "vendor_invoice"]
        }
      }
    });
    const sentRequest = await requestJson(baseUrl, `/v1/bureau/client-requests/${request.requestId}/send`, {
      method: "POST",
      token: consultantToken,
      body: {
        bureauOrgId: DEMO_IDS.companyId
      }
    });
    assert.equal(sentRequest.status, "sent");

    const approval = await requestJson(baseUrl, "/v1/bureau/approval-packages", {
      method: "POST",
      token: consultantToken,
      expectedStatus: 201,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        clientCompanyId: clientCompany.companyId,
        approvalType: "period_close",
        snapshotRef: {
          reportSnapshotId,
          snapshotHash: reportSnapshotId
        },
        targetDate: "2026-04-15",
        namedApproverContactId: "ceo@bureau-flow.test"
      }
    });
    const sentApproval = await requestJson(baseUrl, `/v1/bureau/approval-packages/${approval.approvalPackageId}/send`, {
      method: "POST",
      token: consultantToken,
      body: {
        bureauOrgId: DEMO_IDS.companyId
      }
    });
    assert.equal(sentApproval.status, "sent_for_approval");

    const workItems = await requestJson(baseUrl, `/v1/bureau/work-items?bureauOrgId=${DEMO_IDS.companyId}`, {
      token: consultantToken
    });
    assert.equal(workItems.items.some((item) => item.sourceType === "bureau_client_request"), true);
    assert.equal(workItems.items.some((item) => item.sourceType === "bureau_approval_package"), true);
  } finally {
    await stopServer(server);
  }
});

function seedClientReporting(platform, companyId) {
  const eligibilityAssessment = platform.assessCashMethodEligibility({
    companyId,
    annualNetTurnoverSek: 450000,
    legalFormCode: "AB",
    actorId: "e2e"
  });
  const methodProfile = platform.createMethodProfile({
    companyId,
    methodCode: "FAKTURERINGSMETOD",
    effectiveFrom: "2026-01-01",
    fiscalYearStartDate: "2026-01-01",
    eligibilityAssessmentId: eligibilityAssessment.assessmentId,
    onboardingOverride: true,
    actorId: "e2e"
  });
  platform.activateMethodProfile({
    companyId,
    methodProfileId: methodProfile.methodProfileId,
    actorId: "e2e"
  });
  const fiscalYearProfile = platform.createFiscalYearProfile({
    companyId,
    legalFormCode: "AKTIEBOLAG",
    actorId: "e2e"
  });
  const fiscalYear = platform.createFiscalYear({
    companyId,
    fiscalYearProfileId: fiscalYearProfile.fiscalYearProfileId,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    approvalBasisCode: "BASELINE",
    actorId: "e2e"
  });
  platform.activateFiscalYear({
    companyId,
    fiscalYearId: fiscalYear.fiscalYearId,
    actorId: "e2e"
  });
  platform.installLedgerCatalog({
    companyId,
    actorId: "e2e"
  });
  platform.ensureAccountingYearPeriod({
    companyId,
    fiscalYear: 2026,
    actorId: "e2e"
  });
  const created = platform.createJournalEntry({
    companyId,
    journalDate: "2026-01-04",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: `phase11-bureau-e2e-${companyId}`,
    actorId: "e2e",
    idempotencyKey: `phase11-bureau-e2e-${companyId}`,
    lines: [
      { accountNumber: "1510", debitAmount: 4500 },
      { accountNumber: "3010", creditAmount: 4500 }
    ]
  });
  platform.validateJournalEntry({
    companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "e2e"
  });
  platform.postJournalEntry({
    companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "e2e",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });
  const snapshot = platform.runReportSnapshot({
    companyId,
    reportCode: "income_statement",
    fromDate: "2026-01-01",
    toDate: "2026-01-31",
    actorId: "e2e"
  });
  return snapshot.reportSnapshotId;
}

async function loginWithStrongAuth({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(baseUrl, "/v1/auth/login", {
    method: "POST",
    body: {
      companyId,
      email
    }
  });
  await requestJson(baseUrl, "/v1/auth/mfa/totp/verify", {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: platform.getTotpCodeForTesting({ companyId, email })
    }
  });
  const bankidStart = await requestJson(baseUrl, "/v1/auth/bankid/start", {
    method: "POST",
    token: started.sessionToken
  });
  await requestJson(baseUrl, "/v1/auth/bankid/collect", {
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
  const started = await requestJson(baseUrl, "/v1/auth/login", {
    method: "POST",
    body: {
      companyId,
      email
    }
  });
  await requestJson(baseUrl, "/v1/auth/mfa/totp/verify", {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: platform.getTotpCodeForTesting({ companyId, email })
    }
  });
  return started.sessionToken;
}

async function requestJson(baseUrl, path, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const mutationIdempotencyKey = ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase()) ? crypto.randomUUID() : null;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(mutationIdempotencyKey ? { "idempotency-key": mutationIdempotencyKey } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus);
  return payload;
}
