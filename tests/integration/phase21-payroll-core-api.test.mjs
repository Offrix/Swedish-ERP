import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Step 21 payroll API exposes exceptions, manual resolution and correction runs", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T10:00:00Z")
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

    const employee = await requestJson(baseUrl, "/v1/hr/employees", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        givenName: "Ada",
        familyName: "Api",
        workEmail: "ada.api@example.com"
      }
    });
    const employment = await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/employments`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentTypeCode: "permanent",
        jobTitle: "API payroll tester",
        payModelCode: "monthly_salary",
        startDate: "2025-01-01"
      }
    });
    await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/contracts`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        validFrom: "2025-01-01",
        salaryModelCode: "monthly_salary",
        monthlySalary: 42000
      }
    });
    await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/bank-accounts`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payoutMethod: "domestic_account",
        accountHolderName: "Ada Api",
        clearingNumber: "5000",
        accountNumber: "9988776655",
        bankName: "API Test Payroll Bank",
        primaryAccount: true
      }
    });

    const migrationBatch = await requestJson(baseUrl, "/v1/payroll/migrations", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        sourceSystemCode: "LEGACY_PAYROLL",
        migrationMode: "test",
        effectiveCutoverDate: "2026-03-25",
        firstTargetReportingPeriod: "2026-03"
      }
    });
    await requestJson(
      baseUrl,
      `/v1/payroll/migrations/${migrationBatch.payrollMigrationBatchId}/validate`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID
        }
      }
    );

    const payCalendar = (await requestJson(baseUrl, `/v1/payroll/pay-calendars?companyId=${COMPANY_ID}`, {
      token: sessionToken
    })).items[0];

    const exceptionRun = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payCalendarId: payCalendar.payCalendarId,
        reportingPeriod: "202603",
        runType: "extra",
        employmentIds: [employment.employmentId],
        migrationBatchId: migrationBatch.payrollMigrationBatchId,
        statutoryProfiles: [
          {
            employmentId: employment.employmentId,
            taxMode: "manual_rate",
            taxRatePercent: 30,
            contributionClassCode: "full"
          }
        ],
        manualInputs: [
          {
            employmentId: employment.employmentId,
            payItemCode: "BENEFIT",
            amount: 1200,
            processingStep: 6
          }
        ]
      }
    });

    const exceptions = await requestJson(
      baseUrl,
      `/v1/payroll/pay-runs/${exceptionRun.payRunId}/exceptions?companyId=${COMPANY_ID}`,
      {
        token: sessionToken
      }
    );
    const codes = exceptions.items.map((item) => item.code).sort();
    assert.deepEqual(codes, [
      "benefit_without_cash_salary",
      "collective_agreement_missing",
      "negative_net_pay",
      "payroll_migration_batch_not_ready",
      "payroll_migration_validation_blocking"
    ]);

    const warning = exceptions.items.find((item) => item.code === "benefit_without_cash_salary");
    const resolved = await requestJson(
      baseUrl,
      `/v1/payroll/pay-runs/${exceptionRun.payRunId}/exceptions/${warning.payrollExceptionId}/resolve`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID,
          note: "Reviewed manually."
        }
      }
    );
    assert.equal(resolved.status, "resolved");

    const approveResponse = await fetch(`${baseUrl}/v1/payroll/pay-runs/${exceptionRun.payRunId}/approve`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${sessionToken}`
      },
      body: JSON.stringify({
        companyId: COMPANY_ID
      })
    });
    const approvePayload = await approveResponse.json();
    assert.equal(approveResponse.status, 409);
    assert.equal(approvePayload.error, "payroll_run_has_blocking_exceptions");

    const regularRun = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payCalendarId: payCalendar.payCalendarId,
        reportingPeriod: "202604",
        employmentIds: [employment.employmentId],
        statutoryProfiles: [
          {
            employmentId: employment.employmentId,
            taxMode: "manual_rate",
            taxRatePercent: 30,
            contributionClassCode: "full"
          }
        ]
      }
    });

    const correctionRun = await requestJson(
      baseUrl,
      `/v1/payroll/pay-runs/${regularRun.payRunId}/correction`,
      {
        method: "POST",
        token: sessionToken,
        expectedStatus: 201,
        body: {
          companyId: COMPANY_ID,
          correctionReason: "Late benefit correction",
          retroAdjustments: [
            {
              employmentId: employment.employmentId,
              payItemCode: "CORRECTION",
              amount: 600,
              originalPeriod: "202603",
              sourcePayRunId: regularRun.payRunId,
              note: "Retro correction via API route."
            }
          ]
        }
      }
    );
    assert.equal(correctionRun.runType, "correction");
    assert.equal(correctionRun.correctionOfPayRunId, regularRun.payRunId);
    assert.equal(correctionRun.correctionReason, "Late benefit correction");
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
    phase13PublicApiEnabled: true,
    phase13PartnerEnabled: true,
    phase13AutomationEnabled: true,
    phase14SecurityEnabled: true,
    phase14ResilienceEnabled: true,
    phase14MigrationEnabled: true
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
