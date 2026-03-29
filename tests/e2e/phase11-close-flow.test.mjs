import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

test("Phase 11.3 end-to-end flow exposes close routes and closes a checklist", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T13:30:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const root = await requestJson(baseUrl, "/");
    assert.equal(root.routes.includes("/v1/close/workbench"), true);
    assert.equal(root.routes.includes("/v1/close/checklists"), true);
    assert.equal(root.routes.includes("/v1/close/checklists/:checklistId/signoff"), true);

    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });
    const preparer = platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "close-e2e-preparer@example.test",
      displayName: "Close E2E Preparer",
      roleCode: "bureau_user",
      requiresMfa: false
    });
    const preparerToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: preparer.user.email
    });

    const { clientCompany, period, reportSnapshotId, reconciliationRuns } = seedClientCloseSetup(platform, adminToken, preparer.companyUserId);
    const checklist = await requestJson(baseUrl, "/v1/close/checklists", {
      method: "POST",
      token: preparerToken,
      expectedStatus: 201,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        clientCompanyId: clientCompany.companyId,
        accountingPeriodId: period.accountingPeriodId,
        reportSnapshotId,
        signoffChain: [
          { companyUserId: preparer.companyUserId, roleCode: "close_preparer" },
          { companyUserId: DEMO_IDS.companyUserId, roleCode: "close_signatory" }
        ]
      }
    });

    for (const step of checklist.steps) {
      await requestJson(baseUrl, `/v1/close/checklists/${checklist.checklistId}/steps/${step.stepCode}/complete`, {
        method: "POST",
        token: preparerToken,
        body: step.reconciliationAreaCode
          ? { bureauOrgId: DEMO_IDS.companyId, reconciliationRunId: reconciliationRuns[step.reconciliationAreaCode] }
          : step.evidenceType === "report_snapshot"
            ? { bureauOrgId: DEMO_IDS.companyId, evidenceRefs: [{ reportSnapshotId }] }
            : { bureauOrgId: DEMO_IDS.companyId, evidenceRefs: [{ note: `${step.stepCode} done` }] }
      });
    }

    await requestJson(baseUrl, `/v1/close/checklists/${checklist.checklistId}/signoff`, {
      method: "POST",
      token: preparerToken,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        comment: "Prepared"
      }
    });

    const closed = await requestJson(baseUrl, `/v1/close/checklists/${checklist.checklistId}/signoff`, {
      method: "POST",
      token: adminToken,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        comment: "Approved"
      }
    });
    assert.equal(closed.status, "closed");
    assert.equal(closed.signoffs.length, 2);
  } finally {
    await stopServer(server);
  }
});

function seedClientCloseSetup(platform, adminToken, responsibleConsultantId) {
  const clientCompany = platform.createCompany({
    legalName: "Close E2E Client AB",
    orgNumber: "559900-4305",
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
  platform.createPortfolioMembership({
    sessionToken: adminToken,
    bureauOrgId: DEMO_IDS.companyId,
    clientCompanyId: clientCompany.companyId,
    responsibleConsultantId,
    activeFrom: "2026-01-01"
  });
  const eligibilityAssessment = platform.assessCashMethodEligibility({
    companyId: clientCompany.companyId,
    annualNetTurnoverSek: 510000,
    legalFormCode: "AB",
    actorId: "phase11-close-e2e"
  });
  const methodProfile = platform.createMethodProfile({
    companyId: clientCompany.companyId,
    methodCode: "FAKTURERINGSMETOD",
    effectiveFrom: "2026-01-01",
    fiscalYearStartDate: "2026-01-01",
    eligibilityAssessmentId: eligibilityAssessment.assessmentId,
    onboardingOverride: true,
    actorId: "phase11-close-e2e"
  });
  platform.activateMethodProfile({
    companyId: clientCompany.companyId,
    methodProfileId: methodProfile.methodProfileId,
    actorId: "phase11-close-e2e"
  });
  const fiscalYearProfile = platform.createFiscalYearProfile({
    companyId: clientCompany.companyId,
    legalFormCode: "AKTIEBOLAG",
    actorId: "phase11-close-e2e"
  });
  const fiscalYear = platform.createFiscalYear({
    companyId: clientCompany.companyId,
    fiscalYearProfileId: fiscalYearProfile.fiscalYearProfileId,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    approvalBasisCode: "BASELINE",
    actorId: "phase11-close-e2e"
  });
  platform.activateFiscalYear({
    companyId: clientCompany.companyId,
    fiscalYearId: fiscalYear.fiscalYearId,
    actorId: "phase11-close-e2e"
  });
  platform.installLedgerCatalog({
    companyId: clientCompany.companyId,
    actorId: "phase11-close-e2e"
  });
  const period = platform.ensureAccountingYearPeriod({
    companyId: clientCompany.companyId,
    fiscalYear: 2026,
    actorId: "phase11-close-e2e"
  });
  const created = platform.createJournalEntry({
    companyId: clientCompany.companyId,
    journalDate: "2026-01-12",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "phase11-close-e2e-income",
    actorId: "phase11-close-e2e",
    idempotencyKey: "phase11-close-e2e-income",
    lines: [
      { accountNumber: "1510", debitAmount: 5100 },
      { accountNumber: "3010", creditAmount: 5100 }
    ]
  });
  platform.validateJournalEntry({
    companyId: clientCompany.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase11-close-e2e"
  });
  platform.postJournalEntry({
    companyId: clientCompany.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase11-close-e2e"
  });
  const reportSnapshot = platform.runReportSnapshot({
    companyId: clientCompany.companyId,
    reportCode: "income_statement",
    fromDate: "2026-01-01",
    toDate: "2026-01-31",
    actorId: "phase11-close-e2e"
  });
  const reconciliationRuns = {};
  for (const areaCode of ["bank", "ar", "ap", "vat"]) {
    const run = platform.createReconciliationRun({
      companyId: clientCompany.companyId,
      accountingPeriodId: period.accountingPeriodId,
      areaCode,
      cutoffDate: "2026-12-31",
      differenceItems: [],
      actorId: "phase11-close-e2e"
    });
    platform.signOffReconciliationRun({
      companyId: clientCompany.companyId,
      reconciliationRunId: run.reconciliationRun.reconciliationRunId,
      actorId: "phase11-close-e2e",
      signatoryRole: "close_signatory"
    });
    reconciliationRuns[areaCode] = run.reconciliationRun.reconciliationRunId;
  }
  return {
    clientCompany,
    period,
    reportSnapshotId: reportSnapshot.reportSnapshotId,
    reconciliationRuns
  };
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
  const response = await fetch(`${baseUrl}${path}`, {
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
