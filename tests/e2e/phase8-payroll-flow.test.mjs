import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 8.1 e2e flow runs payroll, traces retro adjustments and regenerates payslips", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T08:00:00Z")
  });
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
      phase7HrEnabled: true,
      phase7TimeEnabled: true,
      phase7AbsenceEnabled: true,
      phase8PayrollEnabled: true
    }
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    const employee = await requestJson(baseUrl, "/v1/hr/employees", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        givenName: "Signe",
        familyName: "Salary",
        workEmail: "signe.salary@example.com"
      }
    });
    const employment = await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/employments`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentTypeCode: "permanent",
        jobTitle: "Consultant",
        payModelCode: "monthly_salary",
        startDate: "2025-01-01"
      }
    });
    await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/contracts`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        validFrom: "2025-01-01",
        salaryModelCode: "monthly_salary",
        monthlySalary: 39000
      }
    });
    await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/bank-accounts`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payoutMethod: "domestic_account",
        accountHolderName: "Signe Salary",
        clearingNumber: "5000",
        accountNumber: "0987654321",
        bankName: "Payroll Flow Bank",
        primaryAccount: true
      }
    });

    const payCalendars = await requestJson(baseUrl, `/v1/payroll/pay-calendars?companyId=${COMPANY_ID}`, {
      token: adminToken
    });
    const payCalendar = payCalendars.items.find((item) => item.payCalendarCode === "MONTHLY_STANDARD");
    assert.ok(payCalendar);

    const regularRun = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payCalendarId: payCalendar.payCalendarId,
        reportingPeriod: "202603",
        manualInputs: [
          {
            employmentId: employment.employmentId,
            payItemCode: "BONUS",
            amount: 3000,
            processingStep: 4
          }
        ],
        statutoryProfiles: [
          {
            employmentId: employment.employmentId,
            taxMode: "manual_rate",
            manualRateReasonCode: "emergency_manual_transition",
            taxRatePercent: 30
          }
        ]
      }
    });
    await requestJson(baseUrl, `/v1/payroll/pay-runs/${regularRun.payRunId}/approve`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: COMPANY_ID
      }
    });

    const correctionRun = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payCalendarId: payCalendar.payCalendarId,
        reportingPeriod: "202603",
        runType: "correction",
        retroAdjustments: [
          {
            employmentId: employment.employmentId,
            payItemCode: "CORRECTION",
            amount: 1600,
            originalPeriod: "202602",
            sourcePayRunId: regularRun.payRunId,
            sourceLineId: regularRun.lines[0].payRunLineId
          }
        ]
      }
    });
    const correctionFromGet = await requestJson(
      baseUrl,
      `/v1/payroll/pay-runs/${correctionRun.payRunId}?companyId=${COMPANY_ID}`,
      {
        token: adminToken
      }
    );
    assert.equal(
      correctionFromGet.lines.some((line) => line.sourcePeriod === "202602" && line.sourcePayRunId === regularRun.payRunId),
      true
    );

    const finalRun = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payCalendarId: payCalendar.payCalendarId,
        reportingPeriod: "202604",
        runType: "final",
        finalPayAdjustments: [
          {
            employmentId: employment.employmentId,
            terminationDate: "2026-04-11",
            finalSettlementAmount: 9000,
            remainingVacationDays: 3,
            remainingVacationSettlementAmount: 3600,
            advanceVacationRecoveryAmount: 1000
          }
        ]
      }
    });

    const finalPayslipBefore = await requestJson(
      baseUrl,
      `/v1/payroll/pay-runs/${finalRun.payRunId}/payslips/${employment.employmentId}?companyId=${COMPANY_ID}`,
      {
        token: adminToken
      }
    );
    assert.equal(finalPayslipBefore.runType, "final");

    const finalPayslipAfter = await requestJson(
      baseUrl,
      `/v1/payroll/pay-runs/${finalRun.payRunId}/payslips/${employment.employmentId}/regenerate`,
      {
        method: "POST",
        token: adminToken,
        body: {
          companyId: COMPANY_ID
        }
      }
    );
    assert.equal(finalPayslipAfter.regenerationNo, 1);
    assert.equal(finalPayslipAfter.snapshotHash, finalPayslipBefore.snapshotHash);
  } finally {
    await stopServer(server);
  }
});

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
  assert.equal(
    response.status,
    expectedStatus,
    `Expected ${expectedStatus} for ${method} ${path}, got ${response.status}: ${JSON.stringify(payload)}`
  );
  return payload;
}
