import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 12.1 API manages tax decision snapshots and pay runs consume approved snapshots", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-28T10:00:00Z")
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
      givenName: "Iris",
      familyName: "Taxapi",
      identityValue: "19800112-5555"
    });
    const tableDecision = await requestJson(baseUrl, "/v1/payroll/tax-decisions", {
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
        withholdingFixedAmount: 11950,
        decisionSource: "skatteverket_table_import",
        decisionReference: "tabell-34-1-2026",
        evidenceRef: "evidence-tax-api-2026"
      }
    });
    assert.equal(tableDecision.status, "approved");

    const listed = await requestJson(
      baseUrl,
      `/v1/payroll/tax-decisions?companyId=${COMPANY_ID}&employmentId=${employee.employment.employmentId}&effectiveDate=2026-03-25`,
      {
        token: sessionToken
      }
    );
    assert.equal(listed.items.length, 1);
    assert.equal(listed.items[0].taxDecisionSnapshotId, tableDecision.taxDecisionSnapshotId);

    const run = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
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
    assert.equal(run.payslips[0].totals.taxDecision.outputs.decisionType, "tabell");
    assert.equal(run.payslips[0].totals.taxDecision.outputs.preliminaryTax, 11950);

    const emergencyEmployee = await createMonthlyEmployee({
      baseUrl,
      token: sessionToken,
      givenName: "Ellen",
      familyName: "Emergencyapi",
      identityValue: "19800112-6666"
    });
    const emergencyDraft = await requestJson(baseUrl, "/v1/payroll/tax-decisions", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: emergencyEmployee.employment.employmentId,
        decisionType: "emergency_manual",
        incomeYear: 2026,
        validFrom: "2026-01-01",
        validTo: "2026-12-31",
        withholdingRatePercent: 29,
        decisionSource: "manual_emergency_override",
        decisionReference: "emergency-api-2026",
        evidenceRef: "evidence-emergency-api-2026",
        reasonCode: "skattebeslut_saknas_vid_cutover"
      }
    });
    assert.equal(emergencyDraft.status, "draft");

    const approveResponse = await fetch(
      `${baseUrl}/v1/payroll/tax-decisions/${emergencyDraft.taxDecisionSnapshotId}/approve`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          companyId: COMPANY_ID
        })
      }
    );
    const approvePayload = await approveResponse.json();
    assert.equal(approveResponse.status, 409);
    assert.equal(approvePayload.error, "tax_decision_snapshot_dual_review_required");
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
      jobTitle: "Tax decision API tester",
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
      monthlySalary: 40000
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
      bankName: "Tax API Bank",
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
