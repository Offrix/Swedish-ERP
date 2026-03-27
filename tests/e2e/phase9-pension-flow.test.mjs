import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 9.3 e2e flow produces collective-agreement pension reports and reconciliation evidence", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T11:45:00Z")
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

    const collectumEmployee = await createEmployeeWithContract({
      baseUrl,
      token: sessionToken,
      givenName: "Clara",
      familyName: "Collectum",
      workEmail: "clara.collectum@example.com",
      monthlySalary: 65000
    });
    const foraEmployee = await createEmployeeWithContract({
      baseUrl,
      token: sessionToken,
      givenName: "Felix",
      familyName: "Fora",
      workEmail: "felix.fora@example.com",
      monthlySalary: 42000
    });

    for (const employment of [collectumEmployee.employment, foraEmployee.employment]) {
      await requestJson(baseUrl, "/v1/payroll/statutory-profiles", {
        method: "POST",
        token: sessionToken,
        expectedStatus: 201,
        body: {
          companyId: COMPANY_ID,
          employmentId: employment.employmentId,
          taxMode: "manual_rate",
          manualRateReasonCode: "emergency_manual_transition",
          taxRatePercent: 30,
          contributionClassCode: "full"
        }
      });
    }

    await requestJson(baseUrl, "/v1/pension/enrollments", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employeeId: collectumEmployee.employee.employeeId,
        employmentId: collectumEmployee.employment.employmentId,
        planCode: "ITP1",
        startsOn: "2025-01-01",
        contributionMode: "rate_percent",
        contributionRatePercent: 4.5
      }
    });
    await requestJson(baseUrl, "/v1/pension/salary-exchange-agreements", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employeeId: collectumEmployee.employee.employeeId,
        employmentId: collectumEmployee.employment.employmentId,
        startsOn: "2026-01-01",
        exchangeMode: "fixed_amount",
        exchangeValue: 3000
      }
    });
    await requestJson(baseUrl, "/v1/pension/enrollments", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employeeId: foraEmployee.employee.employeeId,
        employmentId: foraEmployee.employment.employmentId,
        planCode: "FORA",
        startsOn: "2025-01-01",
        contributionMode: "rate_percent",
        contributionRatePercent: 4.2
      }
    });

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
        employmentIds: [collectumEmployee.employment.employmentId, foraEmployee.employment.employmentId]
      }
    });
    assert.equal(payRun.lines.some((line) => line.payItemCode === "FORA_PREMIUM" && line.amount === 1764), true);

    await requestJson(baseUrl, `/v1/payroll/pay-runs/${payRun.payRunId}/approve`, {
      method: "POST",
      token: sessionToken,
      body: { companyId: COMPANY_ID }
    });

    const collectumReport = await requestJson(baseUrl, "/v1/pension/reports", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportingPeriod: "202603",
        providerCode: "collectum"
      }
    });
    const foraReport = await requestJson(baseUrl, "/v1/pension/reports", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportingPeriod: "202603",
        providerCode: "fora"
      }
    });

    assert.equal(collectumReport.lines.some((line) => line.payloadJson.reportType === "monthly_gross_salary"), true);
    assert.equal(foraReport.lines.some((line) => line.payloadJson.reportType === "monthly_wage_report"), true);
    assert.equal(foraReport.dueDate, "2026-04-30");

    const collectumReconciliation = await requestJson(baseUrl, "/v1/pension/reconciliations", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportingPeriod: "202603",
        providerCode: "collectum",
        invoicedAmount: collectumReport.totals.contributionAmount
      }
    });
    const foraReconciliation = await requestJson(baseUrl, "/v1/pension/reconciliations", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportingPeriod: "202603",
        providerCode: "fora",
        invoicedAmount: 1800
      }
    });
    assert.equal(collectumReconciliation.status, "matched");
    assert.equal(foraReconciliation.status, "difference_detected");

    const auditEvents = await requestJson(baseUrl, `/v1/pension/audit-events?companyId=${COMPANY_ID}&employmentId=${collectumEmployee.employment.employmentId}`, {
      token: sessionToken
    });
    assert.equal(auditEvents.items.some((event) => event.action === "salary_exchange.agreement.created"), true);
    assert.equal(auditEvents.items.some((event) => event.action === "pension.snapshot.materialized"), true);
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
      jobTitle: "Pension operator",
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
      bankName: "Pension E2E Bank",
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
