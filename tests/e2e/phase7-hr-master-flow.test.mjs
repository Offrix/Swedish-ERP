import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 7.1 e2e flow blocks overlapping employments while preserving versioned contracts and sensitive audit trail", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-12-03T08:00:00Z")
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
        sourceReference: "phase7-e2e-contract-001"
      }
    });
    await requestJson(baseUrl, `/v1/documents/${document.documentId}/versions`, {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        variantType: "original",
        storageKey: "documents/originals/phase7-e2e-contract-001.pdf",
        mimeType: "application/pdf",
        fileHash: "phase7-e2e-contract-001",
        sourceReference: "phase7-e2e-contract-001"
      }
    });

    const employee = await requestJson(baseUrl, "/v1/hr/employees", {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        givenName: "Nova",
        familyName: "HR",
        identityType: "samordningsnummer",
        identityValue: "930363-1239",
        protectedIdentity: true
      }
    });

    const manager = await requestJson(baseUrl, "/v1/hr/employees", {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        givenName: "Patrik",
        familyName: "Lead",
        identityType: "personnummer",
        identityValue: "820202-1112"
      }
    });

    const managerEmployment = await requestJson(baseUrl, `/v1/hr/employees/${manager.employeeId}/employments`, {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentTypeCode: "permanent",
        jobTitle: "Head of HR",
        payModelCode: "monthly_salary",
        startDate: "2024-01-01"
      }
    });

    const mainEmployment = await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/employments`, {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentTypeCode: "permanent",
        jobTitle: "People operations specialist",
        payModelCode: "monthly_salary",
        startDate: "2025-01-01"
      }
    });
    const overlappingEmploymentAttempt = await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/employments`, {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 409,
      body: {
        companyId: COMPANY_ID,
        employmentTypeCode: "hourly_assignment",
        jobTitle: "Project coordinator",
        payModelCode: "hourly_salary",
        startDate: "2025-09-01"
      }
    });
    assert.equal(overlappingEmploymentAttempt.error, "employment_overlaps_existing_active_employment");

    await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/contracts`, {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: mainEmployment.employmentId,
        validFrom: "2025-01-01",
        validTo: "2025-12-31",
        salaryModelCode: "monthly_salary",
        monthlySalary: 37000
      }
    });
    await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/contracts`, {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: mainEmployment.employmentId,
        validFrom: "2026-01-01",
        salaryModelCode: "monthly_salary",
        monthlySalary: 39500,
        termsDocumentId: document.documentId
      }
    });

    await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/manager-assignments`, {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: mainEmployment.employmentId,
        managerEmploymentId: managerEmployment.employmentId,
        validFrom: "2025-01-01"
      }
    });

    await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/bank-accounts`, {
      method: "POST",
      token: adminSessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payoutMethod: "domestic_account",
        accountHolderName: "Nova HR",
        countryCode: "SE",
        clearingNumber: "5000",
        accountNumber: "1234567890"
      }
    });
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
    const contracts = await requestJson(
      baseUrl,
      `/v1/hr/employees/${employee.employeeId}/contracts?companyId=${COMPANY_ID}&employmentId=${mainEmployment.employmentId}`,
      {
        token: adminSessionToken
      }
    );
    const audits = await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/audit-events?companyId=${COMPANY_ID}`, {
      token: adminSessionToken
    });

    assert.equal(employeeState.employments.length, 1);
    assert.equal(employeeState.documents.length, 1);
    assert.equal(contracts.items.length, 2);
    assert.equal(contracts.items[0].contractVersion, 1);
    assert.equal(contracts.items[1].contractVersion, 2);
    assert.equal(audits.items.some((candidate) => candidate.action === "hr.employee.sensitive_fields_logged"), true);
    assert.equal(audits.items.some((candidate) => candidate.action === "hr.employee_bank_account.recorded"), true);
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
  const mutationIdempotencyKey = ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase()) ? crypto.randomUUID() : null;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(mutationIdempotencyKey ? { "idempotency-key": mutationIdempotencyKey } : {})
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
