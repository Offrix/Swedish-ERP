import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 15.1 API exposes payroll, tax-account and submission reporting snapshots", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-28T09:30:00Z")
  });
  await seedPhase15Reporting(platform);

  const server = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase2DocumentArchiveEnabled: true,
      phase2CompanyInboxEnabled: true,
      phase2OcrReviewEnabled: true,
      phase3LedgerEnabled: true,
      phase4VatEnabled: true,
      phase5ArEnabled: true,
      phase6ApEnabled: true,
      phase10ProjectsEnabled: true
    }
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const sessionToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    const metrics = await requestJson(`${baseUrl}/v1/reporting/metric-definitions?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(metrics.items.some((metric) => metric.metricCode === "payroll_gross_earnings_amount"), true);
    assert.equal(metrics.items.some((metric) => metric.metricCode === "tax_account_net_balance_amount"), true);
    assert.equal(metrics.items.some((metric) => metric.metricCode === "submission_total_count"), true);

    const payrollSnapshot = await requestJson(`${baseUrl}/v1/reporting/report-snapshots`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportCode: "payroll_summary",
        fromDate: "2026-03-01",
        toDate: "2026-03-31",
        viewMode: "period"
      }
    });
    const taxAccountSnapshot = await requestJson(`${baseUrl}/v1/reporting/report-snapshots`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportCode: "tax_account_summary",
        fromDate: "2026-03-01",
        toDate: "2026-03-31",
        viewMode: "period"
      }
    });
    const submissionSnapshot = await requestJson(`${baseUrl}/v1/reporting/report-snapshots`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportCode: "submission_dashboard",
        fromDate: "2026-03-01",
        toDate: "2026-03-31",
        viewMode: "period"
      }
    });

    assert.equal(payrollSnapshot.lines[0].metricValues.payroll_run_count, 1);
    assert.equal(taxAccountSnapshot.lines[0].metricValues.tax_account_open_difference_case_count, 1);
    assert.equal(submissionSnapshot.totals.metricTotals.submission_total_count, 2);
    assert.equal(submissionSnapshot.lines.some((line) => line.metricValues.submission_failed_count > 0), true);
  } finally {
    await stopServer(server);
  }
});

async function seedPhase15Reporting(platform) {
  platform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "phase15-api"
  });
  platform.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "phase15-api"
  });
  platform.createBankAccount({
    companyId: COMPANY_ID,
    bankName: "Phase15 Payroll Bank",
    ledgerAccountNumber: "1110",
    clearingNumber: "5000",
    accountNumber: "5566778899",
    isDefault: true,
    actorId: "phase15-api"
  });
  const employee = createHourlyEmployee(platform);
  platform.upsertEmploymentStatutoryProfile({
    companyId: COMPANY_ID,
    employmentId: employee.employment.employmentId,
    taxMode: "manual_rate",
    manualRateReasonCode: "emergency_manual_transition",
    taxRatePercent: 30,
    contributionClassCode: "full",
    actorId: "phase15-api"
  });
  platform.createTimeEntry({
    companyId: COMPANY_ID,
    employmentId: employee.employment.employmentId,
    workDate: "2026-03-18",
    workedMinutes: 480,
    projectId: "project-demo-alpha",
    actorId: "phase15-api"
  });
  platform.approveTimeSet({
    companyId: COMPANY_ID,
    employmentId: employee.employment.employmentId,
    startsOn: "2026-03-01",
    endsOn: "2026-03-31",
    actorId: "phase15-api"
  });
  const payCalendar = platform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const payRun = platform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [employee.employment.employmentId],
    manualInputs: [
      {
        employmentId: employee.employment.employmentId,
        payItemCode: "BONUS",
        amount: 1200,
        processingStep: 4,
        dimensionJson: {
          projectId: "project-demo-alpha"
        }
      }
    ],
    actorId: "phase15-api"
  });
  platform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: payRun.payRunId,
    actorId: "phase15-api"
  });
  platform.createAgiSubmission({
    companyId: COMPANY_ID,
    reportingPeriod: "202603",
    actorId: "phase15-api"
  });
  platform.createVacationLiabilitySnapshot({
    companyId: COMPANY_ID,
    reportingPeriod: "202603",
    actorId: "phase15-api"
  });
  platform.registerExpectedTaxLiability({
    companyId: COMPANY_ID,
    liabilityTypeCode: "VAT",
    sourceDomainCode: "VAT",
    sourceObjectType: "vat_declaration_run",
    sourceObjectId: "vat_run_phase15_2026_03",
    sourceReference: "VAT-PHASE15-2026-03",
    periodKey: "2026-03",
    dueDate: "2026-03-12",
    amount: 9300,
    actorId: "phase15-api"
  });
  platform.importTaxAccountEvents({
    companyId: COMPANY_ID,
    importSource: "SKV_CSV",
    statementDate: "2026-03-28",
    events: [
      {
        eventTypeCode: "VAT_ASSESSMENT",
        eventDate: "2026-03-12",
        postingDate: "2026-03-12",
        amount: 9300,
        externalReference: "SKV-VAT-PHASE15-API",
        periodKey: "2026-03"
      },
      {
        eventTypeCode: "FEE",
        eventDate: "2026-03-13",
        postingDate: "2026-03-13",
        amount: 500,
        externalReference: "SKV-FEE-PHASE15-API"
      }
    ],
    actorId: "phase15-api"
  });
  platform.createTaxAccountReconciliation({
    companyId: COMPANY_ID,
    actorId: "phase15-api"
  });

  let submission = platform.prepareAuthoritySubmission({
    companyId: COMPANY_ID,
    submissionType: "agi_monthly",
    sourceObjectType: "agi_submission_period",
    sourceObjectId: "agi-period-2026-03",
    payloadVersion: "phase15.1",
    providerKey: "skatteverket",
    recipientId: "skatteverket:agi",
    payload: {
      sourceObjectVersion: "agi-period-2026-03:v1"
    },
    actorId: "phase15-api",
    signedState: "not_required"
  });
  platform.executeAuthoritySubmissionTransport({
    companyId: COMPANY_ID,
    submissionId: submission.submissionId,
    actorId: "phase15-api",
    mode: "trial"
  });

  submission = platform.prepareAuthoritySubmission({
    companyId: COMPANY_ID,
    submissionType: "vat_declaration",
    sourceObjectType: "vat_return",
    sourceObjectId: "vat-return-2026-03",
    payloadVersion: "phase15.1-vat",
    providerKey: "skatteverket",
    recipientId: "skatteverket:vat",
    payload: {
      sourceObjectVersion: "vat-return-2026-03:v1"
    },
    actorId: "phase15-api",
    signedState: "not_required"
  });
  platform.executeAuthoritySubmissionTransport({
    companyId: COMPANY_ID,
    submissionId: submission.submissionId,
    actorId: "phase15-api",
    mode: "test",
    transportScenarioCode: "transport_failed"
  });
}

function createHourlyEmployee(platform) {
  const employee = platform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Petra",
    familyName: "Report",
    identityType: "personnummer",
    identityValue: "19800112-1238",
    workEmail: "petra.report@example.com",
    actorId: "phase15-api"
  });
  const employment = platform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Consultant",
    payModelCode: "hourly_salary",
    startDate: "2025-01-01",
    actorId: "phase15-api"
  });
  platform.addEmploymentContract({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    validFrom: "2025-01-01",
    salaryModelCode: "hourly_salary",
    hourlyRate: 200,
    currencyCode: "SEK",
    actorId: "phase15-api"
  });
  platform.addEmployeeBankAccount({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    payoutMethod: "domestic_account",
    accountHolderName: "Petra Report",
    clearingNumber: "5000",
    accountNumber: "1234567890",
    bankName: "Payroll Employee Bank",
    primaryAccount: true,
    actorId: "phase15-api"
  });
  return {
    employee,
    employment
  };
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

async function requestJson(url, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const mutationIdempotencyKey = ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase()) ? crypto.randomUUID() : null;
  const response = await fetch(url, {
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
