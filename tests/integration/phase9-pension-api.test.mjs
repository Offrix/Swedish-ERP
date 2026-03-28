import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 9.3 migration and seeds add pension plans, salary exchange agreements and reports", async () => {
  const migration = await readText("packages/db/migrations/20260322010000_phase9_pension_salary_exchange.sql");
  for (const fragment of [
    "CREATE TABLE IF NOT EXISTS pension_plans",
    "CREATE TABLE IF NOT EXISTS employee_pension_enrollments",
    "CREATE TABLE IF NOT EXISTS salary_exchange_agreements",
    "CREATE TABLE IF NOT EXISTS pension_basis_snapshots",
    "CREATE TABLE IF NOT EXISTS pension_reports",
    "CREATE TABLE IF NOT EXISTS pension_reconciliations",
    "ALTER TABLE pension_events"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }

  const seed = await readText("packages/db/seeds/20260322010010_phase9_pension_salary_exchange_seed.sql");
  for (const fragment of ["ITP1", "FORA", "SALARY_EXCHANGE_GROSS_DEDUCTION", "PENSION_SPECIAL_PAYROLL_TAX"]) {
    assert.match(seed, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }

  const demoSeed = await readText("packages/db/seeds/20260322011000_phase9_pension_salary_exchange_demo_seed.sql");
  for (const fragment of ["ITP2", "EXTRA_PENSION", "difference_detected", "salary_exchange_threshold_warning"]) {
    assert.match(demoSeed, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }
});

test("Phase 9.3 API manages pension enrollments, salary exchange, reports and reconciliation", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T11:15:00Z")
  });
  const server = createApiServer({
    platform,
    flags: enabledFlags()
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const sessionToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    await requestJson(baseUrl, "/v1/ledger/chart/install", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: { companyId: COMPANY_ID }
    });

    const plans = await requestJson(baseUrl, `/v1/pension/plans?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(plans.items.some((item) => item.planCode === "ITP1"), true);

    const employee = await createEmployeeWithContract({
      baseUrl,
      token: sessionToken,
      givenName: "Pella",
      familyName: "Pension",
      workEmail: "pella.pension@example.com",
      monthlySalary: 65000
    });

    await requestJson(baseUrl, "/v1/payroll/statutory-profiles", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employee.employment.employmentId,
        taxMode: "manual_rate",
        manualRateReasonCode: "emergency_manual_transition",
        taxRatePercent: 30,
        contributionClassCode: "full"
      }
    });

    await requestJson(baseUrl, "/v1/pension/enrollments", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employeeId: employee.employee.employeeId,
        employmentId: employee.employment.employmentId,
        planCode: "ITP1",
        startsOn: "2025-01-01",
        contributionMode: "rate_percent",
        contributionRatePercent: 4.5
      }
    });
    await requestJson(baseUrl, "/v1/pension/enrollments", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employeeId: employee.employee.employeeId,
        employmentId: employee.employment.employmentId,
        planCode: "EXTRA_PENSION",
        startsOn: "2026-01-01",
        contributionMode: "fixed_amount",
        fixedContributionAmount: 1500,
        providerCode: "collectum"
      }
    });

    const simulation = await requestJson(baseUrl, "/v1/pension/salary-exchange/simulations", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 200,
      body: {
        companyId: COMPANY_ID,
        employeeId: employee.employee.employeeId,
        employmentId: employee.employment.employmentId,
        monthlyGrossSalary: 65000,
        exchangeMode: "fixed_amount",
        exchangeValue: 3000
      }
    });
    assert.equal(simulation.exchangedAmount, 3000);
    assert.equal(simulation.policyVersionRef, "se_salary_exchange_policy_2026_v1");
    assert.equal(simulation.specialPayrollTaxRatePercent, 24.26);

    const agreement = await requestJson(baseUrl, "/v1/pension/salary-exchange-agreements", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employeeId: employee.employee.employeeId,
        employmentId: employee.employment.employmentId,
        startsOn: "2026-01-01",
        exchangeMode: "fixed_amount",
        exchangeValue: 3000
      }
    });
    assert.equal(agreement.policyVersionRef, "se_salary_exchange_policy_2026_v1");
    assert.equal(agreement.maximumExchangeShare, 0.2);

    const payCalendar = (
      await requestJson(baseUrl, `/v1/payroll/pay-calendars?companyId=${COMPANY_ID}`, {
        token: sessionToken
      })
    ).items[0];
    const payRun = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payCalendarId: payCalendar.payCalendarId,
        reportingPeriod: "202603",
        employmentIds: [employee.employment.employmentId]
      }
    });
    assert.equal(payRun.lines.some((line) => line.payItemCode === "PENSION_PREMIUM" && line.amount === 2925), true);
    assert.equal(payRun.lines.some((line) => line.payItemCode === "EXTRA_PENSION_PREMIUM" && line.amount === 3174), true);
    assert.equal(payRun.lines.some((line) => line.payItemCode === "SALARY_EXCHANGE_GROSS_DEDUCTION" && line.amount === 3000), true);

    const pensionEvents = await requestJson(
      baseUrl,
      `/v1/pension/events?companyId=${COMPANY_ID}&reportingPeriod=202603&employmentId=${employee.employment.employmentId}`,
      { token: sessionToken }
    );
    assert.equal(pensionEvents.items.length, 3);

    await requestJson(baseUrl, `/v1/payroll/pay-runs/${payRun.payRunId}/approve`, {
      method: "POST",
      token: sessionToken,
      body: { companyId: COMPANY_ID }
    });

    const posting = await requestJson(baseUrl, "/v1/payroll/postings", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payRunId: payRun.payRunId
      }
    });
    assert.equal(posting.journalLines.some((line) => line.accountNumber === "7120"), true);
    assert.equal(posting.journalLines.some((line) => line.accountNumber === "2550"), true);

    const report = await requestJson(baseUrl, "/v1/pension/reports", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportingPeriod: "202603",
        providerCode: "collectum"
      }
    });
    assert.equal(report.totals.contributionAmount, 7599);
    assert.equal(report.providerExportInstruction.instructionVersionRef, "collectum_export_instruction_2026_v1");
    assert.equal(report.lines.every((line) => line.payloadJson.instructionVersionRef === "collectum_export_instruction_2026_v1"), true);

    const reconciliation = await requestJson(baseUrl, "/v1/pension/reconciliations", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportingPeriod: "202603",
        providerCode: "collectum",
        invoicedAmount: 7599
      }
    });
    assert.equal(reconciliation.status, "matched");

    const auditEvents = await requestJson(baseUrl, `/v1/pension/audit-events?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(auditEvents.items.some((event) => event.action === "pension.enrollment.created"), true);
    assert.equal(auditEvents.items.some((event) => event.action === "pension.report.created"), true);
  } finally {
    await stopServer(server);
  }
});

test("Phase 9.3 pension routes disable cleanly behind the feature flag", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T11:15:00Z")
  });
  const server = createApiServer({
    platform,
    flags: {
      ...enabledFlags(),
      phase9PensionEnabled: false
    }
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const response = await requestJson(baseUrl, `/v1/pension/plans?companyId=${COMPANY_ID}`, {
      expectedStatus: 503
    });
    assert.equal(response.error, "feature_disabled");
  } finally {
    await stopServer(server);
  }
});

function enabledFlags() {
  return {
    phase1AuthOnboardingEnabled: true,
    phase2DocumentArchiveEnabled: true,
    phase2CompanyInboxEnabled: true,
    phase2OcrReviewEnabled: true,
    phase3LedgerEnabled: true,
    phase4VatEnabled: true,
    phase5ArEnabled: true,
    phase6ApEnabled: true,
    phase7HrEnabled: true,
    phase7TimeEnabled: true,
    phase7AbsenceEnabled: true,
    phase8PayrollEnabled: true,
    phase9BenefitsEnabled: true,
    phase9TravelEnabled: true,
    phase9PensionEnabled: true
  };
}

async function createEmployeeWithContract({ baseUrl, token, givenName, familyName, workEmail, monthlySalary }) {
  const employee = await requestJson(baseUrl, "/v1/hr/employees", {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId: COMPANY_ID,
      givenName,
      familyName,
      workEmail
    }
  });
  const employment = await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/employments`, {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId: COMPANY_ID,
      employmentTypeCode: "permanent",
      jobTitle: "Pension consultant",
      payModelCode: "monthly_salary",
      startDate: "2025-01-01"
    }
  });
  await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/contracts`, {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId: COMPANY_ID,
      employmentId: employment.employmentId,
      validFrom: "2025-01-01",
      salaryModelCode: "monthly_salary",
      monthlySalary
    }
  });
  await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/bank-accounts`, {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId: COMPANY_ID,
      payoutMethod: "domestic_account",
      accountHolderName: `${givenName} ${familyName}`,
      clearingNumber: "5000",
      accountNumber: "1234567890",
      bankName: "Pension Test Bank",
      primaryAccount: true
    }
  });
  return {
    employee,
    employment
  };
}

async function loginWithRequiredFactors({ baseUrl, platform, companyId, email }) {
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
  if (started.session.requiredFactorCount > 1) {
    const bankIdStart = await requestJson(baseUrl, "/v1/auth/bankid/start", {
      method: "POST",
      token: started.sessionToken
    });
    await requestJson(baseUrl, "/v1/auth/bankid/collect", {
      method: "POST",
      token: started.sessionToken,
      body: {
        orderRef: bankIdStart.orderRef,
        completionToken: platform.getBankIdCompletionTokenForTesting(bankIdStart.orderRef)
      }
    });
  }
  return started.sessionToken;
}

async function requestJson(baseUrl, path, { method = "GET", token = null, body = null, expectedStatus = 200 } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus, JSON.stringify(payload));
  return payload;
}
