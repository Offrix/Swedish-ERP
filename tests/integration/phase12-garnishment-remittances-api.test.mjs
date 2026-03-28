import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 12.6 API manages garnishment decisions and remittance instructions", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-28T11:15:00Z")
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
    const payCalendar = (
      await requestJson(baseUrl, `/v1/payroll/pay-calendars?companyId=${COMPANY_ID}`, {
        token: sessionToken
      })
    ).items[0];

    const employee = await createMonthlyEmployee({
      baseUrl,
      token: sessionToken,
      givenName: "Greta",
      familyName: "Garnapi",
      identityValue: "19800112-8888"
    });

    await requestJson(baseUrl, "/v1/payroll/tax-decisions", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employee.employment.employmentId,
        decisionType: "tabell",
        incomeYear: 2026,
        validFrom: "2026-01-01",
        validTo: "2026-12-31",
        municipalityCode: "0180",
        tableCode: "34",
        columnCode: "1",
        withholdingFixedAmount: 10000,
        decisionSource: "skatteverket_table_import",
        decisionReference: "tabell-34-1-2026",
        evidenceRef: "evidence-tax-garnishment-api-2026"
      }
    });

    const decision = await requestJson(baseUrl, "/v1/payroll/garnishments", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employee.employment.employmentId,
        decisionType: "authority_order",
        incomeYear: 2026,
        validFrom: "2026-01-01",
        validTo: "2026-12-31",
        deductionModelCode: "max_above_protected_amount",
        maximumWithheldAmount: 7000,
        protectedAmountAmount: 12000,
        householdProfile: {
          householdTypeCode: "single_adult",
          childAgeBandCounts: {
            age_0_6: 0,
            age_7_10: 0,
            age_11_14: 0,
            age_15_plus: 0
          }
        },
        authorityCaseReference: "KFM-API-2026-0001",
        remittanceRecipientName: "Kronofogden",
        remittanceMethodCode: "bankgiro",
        remittanceBankgiro: "5050-1234",
        remittanceOcrReference: "KFMAPI20260001",
        decisionSource: "kronofogden_order",
        decisionReference: "api-beslut-2026-0001",
        evidenceRef: "evidence-kfm-api-2026-0001"
      }
    });
    assert.equal(decision.status, "approved");

    const listedDecisions = await requestJson(
      baseUrl,
      `/v1/payroll/garnishments?companyId=${COMPANY_ID}&employmentId=${employee.employment.employmentId}&effectiveDate=2026-03-25`,
      { token: sessionToken }
    );
    assert.equal(listedDecisions.items.length, 1);
    assert.equal(listedDecisions.items[0].garnishmentDecisionSnapshotId, decision.garnishmentDecisionSnapshotId);

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
    assert.equal(payRun.payslips[0].totals.garnishmentAmount, 7000);

    const approvedRun = await requestJson(
      baseUrl,
      `/v1/payroll/pay-runs/${payRun.payRunId}/approve`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID
        }
      }
    );
    assert.equal(approvedRun.remittanceInstructions.length, 1);

    const remittances = await requestJson(
      baseUrl,
      `/v1/payroll/garnishment-remittances?companyId=${COMPANY_ID}&payRunId=${payRun.payRunId}`,
      { token: sessionToken }
    );
    assert.equal(remittances.items.length, 1);
    assert.equal(remittances.items[0].status, "payment_order_ready");

    const remittance = await requestJson(
      baseUrl,
      `/v1/payroll/garnishment-remittances/${remittances.items[0].remittanceInstructionId}?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    assert.equal(remittance.amount, 7000);
    assert.equal(remittance.decisionSnapshot.garnishmentDecisionSnapshotId, decision.garnishmentDecisionSnapshotId);

    const settled = await requestJson(
      baseUrl,
      `/v1/payroll/garnishment-remittances/${remittances.items[0].remittanceInstructionId}/settle`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID,
          paymentOrderReference: "BANK-GARN-202603"
        }
      }
    );
    assert.equal(settled.status, "settled");
    assert.equal(settled.paymentOrderReference, "BANK-GARN-202603");
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
    phase8PayrollEnabled: true
  };
}

async function createMonthlyEmployee({ baseUrl, token, givenName, familyName, identityValue }) {
  const employee = await requestJson(baseUrl, "/v1/hr/employees", {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId: COMPANY_ID,
      givenName,
      familyName,
      identityType: "personnummer",
      identityValue,
      workEmail: `${givenName.toLowerCase()}.${familyName.toLowerCase()}@example.com`
    }
  });
  const employment = await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/employments`, {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId: COMPANY_ID,
      employmentTypeCode: "permanent",
      jobTitle: "Garnishment API tester",
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
      monthlySalary: 30000
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
      bankName: "Garnishment API Bank",
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
