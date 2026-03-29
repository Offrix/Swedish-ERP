import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 12.2 API manages employer contribution decisions and pay runs consume approved vaxa snapshots", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-28T10:15:00Z")
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
      givenName: "Valter",
      familyName: "Vaxaapi",
      identityValue: "19900112-7779",
      dateOfBirth: "1990-01-12"
    });
    const vaxaDraft = await requestJson(baseUrl, "/v1/payroll/employer-contribution-decisions", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employee.employment.employmentId,
        decisionType: "vaxa",
        ageBucket: "standard",
        legalBasisCode: "se_vaxa_2025_extended",
        validFrom: "2026-01-01",
        validTo: "2026-12-31",
        baseLimit: 25000,
        fullRate: 31.42,
        reducedRate: 10.21,
        specialConditions: {
          supportWindowMonths: 24,
          supportEmployeeCountLimit: 2,
          supportMode: "tax_account_credit"
        },
        decisionSource: "support_review",
        decisionReference: "vaxa-api-2026-001",
        evidenceRef: "evidence-vaxa-api-2026-001"
      }
    });
    assert.equal(vaxaDraft.status, "draft");

    const listed = await requestJson(
      baseUrl,
      `/v1/payroll/employer-contribution-decisions?companyId=${COMPANY_ID}&employmentId=${employee.employment.employmentId}`,
      {
        token: sessionToken
      }
    );
    assert.equal(listed.items.length, 1);
    assert.equal(
      listed.items[0].employerContributionDecisionSnapshotId,
      vaxaDraft.employerContributionDecisionSnapshotId
    );

    const approveResponse = await fetch(
      `${baseUrl}/v1/payroll/employer-contribution-decisions/${vaxaDraft.employerContributionDecisionSnapshotId}/approve`,
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
    assert.equal(approvePayload.error, "employer_contribution_decision_snapshot_dual_review_required");

    platform.approveEmployerContributionDecisionSnapshot({
      companyId: COMPANY_ID,
      employerContributionDecisionSnapshotId: vaxaDraft.employerContributionDecisionSnapshotId,
      actorId: "payroll-approver-2"
    });

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
    assert.equal(payRun.payslips[0].totals.employerContributionDecision.outputs.decisionType, "vaxa");
    assert.equal(payRun.payslips[0].totals.employerContributionPreviewAmount, 4123.5);
    assert.equal(payRun.payslips[0].totals.employerContributionDecision.outputs.taxAccountReliefAmount, 5302.5);
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

async function createMonthlyEmployee({ baseUrl, token, givenName, familyName, identityValue, dateOfBirth }) {
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
      dateOfBirth,
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
      jobTitle: "Employer contribution API tester",
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
      bankName: "Contribution API Bank",
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
