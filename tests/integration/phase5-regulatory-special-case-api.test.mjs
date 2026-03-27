import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 5.5 API rejects free manual-rate and undocumented SINK statutory profiles", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-27T08:00:00Z")
  });
  const server = createApiServer({
    platform,
    flags: enabledFlags()
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

    const employee = await requestJson(baseUrl, "/v1/hr/employees", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        givenName: "Regina",
        familyName: "Rulepack",
        workEmail: "regina.rulepack@example.test",
        dateOfBirth: "1990-01-01"
      }
    });
    const employment = await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/employments`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentTypeCode: "permanent",
        jobTitle: "Payroll subject",
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

    const manualRateRejected = await requestJson(baseUrl, "/v1/payroll/statutory-profiles", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 400,
      body: {
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        taxMode: "manual_rate",
        taxRatePercent: 30
      }
    });
    assert.equal(manualRateRejected.error, "statutory_profile_manual_rate_reason_required");

    const sinkRejected = await requestJson(baseUrl, "/v1/payroll/statutory-profiles", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 400,
      body: {
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        taxMode: "sink",
        sinkDecisionType: "ordinary_sink",
        sinkValidFrom: "2026-01-01",
        sinkValidTo: "2026-12-31",
        sinkRatePercent: 22.5
      }
    });
    assert.equal(sinkRejected.error, "statutory_profile_sink_decision_document_required");

    const accepted = await requestJson(baseUrl, "/v1/payroll/statutory-profiles", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        taxMode: "manual_rate",
        manualRateReasonCode: "emergency_manual_transition",
        taxRatePercent: 30
      }
    });
    assert.equal(accepted.manualRateReasonCode, "emergency_manual_transition");
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
