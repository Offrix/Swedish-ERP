import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 7.1 API supports multiple employments, contract history, employee documents and sensitive-field audit", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-12-02T08:00:00Z")
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
      phase7HrEnabled: true
    }
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminSessionToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    const document = await requestJson(baseUrl, "/v1/documents", {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        documentType: "employment_contract",
        sourceChannel: "manual",
        sourceReference: "phase7-api-contract-001"
      }
    });
    await requestJson(baseUrl, `/v1/documents/${document.documentId}/versions`, {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        variantType: "original",
        storageKey: "documents/originals/phase7-api-contract-001.pdf",
        mimeType: "application/pdf",
        fileHash: "phase7-api-contract-001",
        sourceReference: "phase7-api-contract-001"
      }
    });

    const employee = await requestJson(baseUrl, "/v1/hr/employees", {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        givenName: "Elin",
        familyName: "Master",
        identityType: "samordningsnummer",
        identityValue: "920262-9870",
        privateEmail: "elin.private@example.com",
        protectedIdentity: true
      }
    });

    const manager = await requestJson(baseUrl, "/v1/hr/employees", {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        givenName: "Maria",
        familyName: "Chef",
        identityType: "personnummer",
        identityValue: "810101-1115"
      }
    });

    const managerEmployment = await requestJson(baseUrl, `/v1/hr/employees/${manager.employeeId}/employments`, {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentTypeCode: "permanent",
        jobTitle: "HR-chef",
        payModelCode: "monthly_salary",
        startDate: "2024-01-01"
      }
    });

    const firstEmployment = await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/employments`, {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentTypeCode: "permanent",
        jobTitle: "Payroll specialist",
        payModelCode: "monthly_salary",
        startDate: "2025-01-01"
      }
    });
    await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/employments`, {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentTypeCode: "hourly_assignment",
        jobTitle: "Project support",
        payModelCode: "hourly_salary",
        startDate: "2025-06-01"
      }
    });

    await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/contracts`, {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: firstEmployment.employmentId,
        validFrom: "2025-01-01",
        validTo: "2025-12-31",
        salaryModelCode: "monthly_salary",
        monthlySalary: 39000
      }
    });
    await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/contracts`, {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: firstEmployment.employmentId,
        validFrom: "2026-01-01",
        salaryModelCode: "monthly_salary",
        monthlySalary: 42000,
        termsDocumentId: document.documentId
      }
    });
    await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/placements`, {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: firstEmployment.employmentId,
        validFrom: "2025-01-01",
        organizationUnitCode: "people-ops",
        businessUnitCode: "services",
        departmentCode: "payroll",
        costCenterCode: "CC-700",
        serviceLineCode: "PAYROLL",
        workplaceCode: "STHLM"
      }
    });
    await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/salary-bases`, {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: firstEmployment.employmentId,
        validFrom: "2025-01-01",
        salaryBasisCode: "FULL_TIME_MONTHLY",
        payModelCode: "monthly_salary",
        employmentRatePercent: 100,
        standardWeeklyHours: 40,
        ordinaryHoursPerMonth: 173.33
      }
    });

    await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/manager-assignments`, {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: firstEmployment.employmentId,
        managerEmploymentId: managerEmployment.employmentId,
        validFrom: "2025-01-01"
      }
    });

    const bankAccount = await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/bank-accounts`, {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payoutMethod: "iban",
        accountHolderName: "Elin Master",
        countryCode: "DE",
        iban: "DE02120300000000202051",
        bic: "BYLADEM1001"
      }
    });
    assert.equal(bankAccount.maskedAccountDisplay.endsWith("2051"), true);

    await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/documents`, {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        documentId: document.documentId
      }
    });

    const employeeState = await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}?companyId=${COMPANY_ID}`, {
      token: adminSessionToken
    });
    const snapshot = await requestJson(
      baseUrl,
      `/v1/hr/employees/${employee.employeeId}/employments/${firstEmployment.employmentId}/snapshot?companyId=${COMPANY_ID}&snapshotDate=2026-01-15`,
      {
        token: adminSessionToken
      }
    );
    const contracts = await requestJson(
      baseUrl,
      `/v1/hr/employees/${employee.employeeId}/contracts?companyId=${COMPANY_ID}&employmentId=${firstEmployment.employmentId}`,
      {
        token: adminSessionToken
      }
    );
    const placements = await requestJson(
      baseUrl,
      `/v1/hr/employees/${employee.employeeId}/placements?companyId=${COMPANY_ID}&employmentId=${firstEmployment.employmentId}`,
      {
        token: adminSessionToken
      }
    );
    const salaryBases = await requestJson(
      baseUrl,
      `/v1/hr/employees/${employee.employeeId}/salary-bases?companyId=${COMPANY_ID}&employmentId=${firstEmployment.employmentId}`,
      {
        token: adminSessionToken
      }
    );
    const audits = await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/audit-events?companyId=${COMPANY_ID}`, {
      token: adminSessionToken
    });

    assert.equal(employeeState.employments.length, 2);
    assert.equal(employeeState.identityValueMasked.endsWith("9870"), true);
    assert.equal(contracts.items.length, 2);
    assert.equal(placements.items.length, 1);
    assert.equal(salaryBases.items.length, 1);
    assert.equal(snapshot.activePlacement.costCenterCode, "CC-700");
    assert.equal(snapshot.activeSalaryBasis.salaryBasisCode, "FULL_TIME_MONTHLY");
    assert.equal(snapshot.completeness.readyForPayrollInputs, true);
    assert.equal(audits.items.some((candidate) => candidate.action === "hr.employee.sensitive_fields_logged"), true);
    assert.equal(audits.items.some((candidate) => candidate.action === "hr.employee_bank_account.recorded"), true);
  } finally {
    await stopServer(server);
  }
});

test("Phase 7.1 HR routes disable cleanly behind the feature flag", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-12-02T08:00:00Z")
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
      phase7HrEnabled: false
    }
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminSessionToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    const response = await fetch(`${baseUrl}/v1/hr/employees`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${adminSessionToken}`
      }
    });
    const payload = await response.json();
    assert.equal(response.status, 503);
    assert.equal(payload.error, "feature_disabled");
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
