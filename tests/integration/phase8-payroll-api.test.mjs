import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 8.1 migration and seeds add payroll core tables, rule pack and demo pay runs", async () => {
  const migration = await readText("packages/db/migrations/20260321200000_phase8_payroll_core.sql");
  for (const fragment of [
    "CREATE TABLE IF NOT EXISTS pay_item_definitions",
    "CREATE TABLE IF NOT EXISTS pay_calendars",
    "ALTER TABLE pay_runs",
    "ALTER TABLE pay_run_lines",
    "CREATE TABLE IF NOT EXISTS pay_run_events",
    "CREATE TABLE IF NOT EXISTS pay_run_payslips"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }

  const cleanupMigration = await readText("packages/db/migrations/20260325033000_phase8_payroll_placeholder_cleanup.sql");
  for (const fragment of [
    "UPDATE pay_item_definitions",
    "UPDATE pay_run_lines",
    "UPDATE pay_run_payslips",
    "payroll_tax_profile_missing"
  ]) {
    assert.match(cleanupMigration, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }

  const seed = await readText("packages/db/seeds/20260321200010_phase8_payroll_core_seed.sql");
  for (const fragment of [
    "payroll-employer-contribution-se-2026.1",
    "MONTHLY_STANDARD",
    "MONTHLY_SALARY",
    "pay_run_payslips"
  ]) {
    assert.match(seed, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }
  assert.doesNotMatch(seed, /phase8_2_pending|phase8_3_pending/u);

  const demoSeed = await readText("packages/db/seeds/20260321201000_phase8_payroll_core_demo_seed.sql");
  for (const fragment of [
    "phase8-demo-payrun-extra-202603",
    "phase8-demo-payrun-correction-202603",
    "phase8-demo-payrun-final-202604",
    "Retro correction for February bonus"
  ]) {
    assert.match(demoSeed, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }
  assert.doesNotMatch(demoSeed, /phase8_2_pending|phase8_3_pending/u);
});

test("Phase 8.1 API manages pay item catalog, payroll runs, retro traceability and payslip regeneration", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T08:00:00Z")
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
        givenName: "Pia",
        familyName: "Payroll",
        workEmail: "pia.payroll@example.com"
      }
    });
    const employment = await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/employments`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentTypeCode: "permanent",
        jobTitle: "Payroll specialist",
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
        monthlySalary: 40000
      }
    });
    await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/bank-accounts`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payoutMethod: "domestic_account",
        accountHolderName: "Pia Payroll",
        clearingNumber: "5000",
        accountNumber: "1234567890",
        bankName: "API Test Bank",
        primaryAccount: true
      }
    });

    const rulePacks = await requestJson(baseUrl, `/v1/payroll/rule-packs?companyId=${COMPANY_ID}&effectiveDate=2026-03-22`, {
      token: sessionToken
    });
    assert.equal(rulePacks.items.length >= 1, true);

    const payItems = await requestJson(baseUrl, `/v1/payroll/pay-items?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(payItems.items.some((item) => item.payItemCode === "MONTHLY_SALARY"), true);

    const customItem = await requestJson(baseUrl, "/v1/payroll/pay-items", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payItemCode: "FIELD_ALLOWANCE",
        payItemType: "field_allowance",
        displayName: "Field allowance",
        calculationBasis: "manual_amount",
        unitCode: "amount",
        compensationBucket: "gross_addition",
        affectsVacationBasis: false,
        affectsPensionBasis: false
      }
    });
    assert.equal(customItem.payItemCode, "FIELD_ALLOWANCE");
    assert.equal(customItem.taxTreatmentCode, "taxable");
    assert.equal(customItem.employerContributionTreatmentCode, "included");
    assert.equal(customItem.agiMappingCode, "cash_compensation");
    assert.equal(customItem.ledgerAccountCode, "7090");

    const payCalendars = await requestJson(baseUrl, `/v1/payroll/pay-calendars?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    const payCalendar = payCalendars.items.find((item) => item.payCalendarCode === "MONTHLY_STANDARD");
    assert.ok(payCalendar);

    const regularRun = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payCalendarId: payCalendar.payCalendarId,
        reportingPeriod: "202603",
        manualInputs: [
          {
            employmentId: employment.employmentId,
            payItemCode: "BONUS",
            amount: 2000,
            processingStep: 4
          }
        ],
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
    assert.equal(regularRun.runType, "regular");
    assert.equal(regularRun.calculationSteps.length, 18);

    const approvedRun = await requestJson(baseUrl, `/v1/payroll/pay-runs/${regularRun.payRunId}/approve`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(approvedRun.status, "approved");

    const youthEmployee = await requestJson(baseUrl, "/v1/hr/employees", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        givenName: "Ylva",
        familyName: "Youth",
        workEmail: "ylva.youth.api@example.com",
        dateOfBirth: "2005-05-12"
      }
    });
    const youthEmployment = await requestJson(baseUrl, `/v1/hr/employees/${youthEmployee.employeeId}/employments`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentTypeCode: "permanent",
        jobTitle: "Junior operator",
        payModelCode: "monthly_salary",
        startDate: "2026-01-01"
      }
    });
    await requestJson(baseUrl, `/v1/hr/employees/${youthEmployee.employeeId}/contracts`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: youthEmployment.employmentId,
        validFrom: "2026-01-01",
        salaryModelCode: "monthly_salary",
        monthlySalary: 30000
      }
    });
    await requestJson(baseUrl, `/v1/hr/employees/${youthEmployee.employeeId}/bank-accounts`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payoutMethod: "domestic_account",
        accountHolderName: "Ylva Youth",
        clearingNumber: "5000",
        accountNumber: "1111222233",
        bankName: "API Youth Bank",
        primaryAccount: true
      }
    });

    const youthRun = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payCalendarId: payCalendar.payCalendarId,
        reportingPeriod: "202604",
        employmentIds: [youthEmployment.employmentId],
        statutoryProfiles: [
          {
            employmentId: youthEmployment.employmentId,
            taxMode: "manual_rate",
            taxRatePercent: 30,
            contributionClassCode: "full"
          }
        ]
      }
    });
    assert.equal(youthRun.payslips[0].totals.employerContributionPreviewAmount, 6773.5);
    assert.equal(youthRun.payslips[0].totals.employerContributionDecision.outputs.contributionClassCode, "temporary_youth_reduction");
    assert.equal(youthRun.payslips[0].totals.employerContributionDecision.outputs.reducedContributionBase, 25000);
    assert.equal(youthRun.payslips[0].totals.employerContributionDecision.outputs.overflowContributionBase, 5000);

    const correctionRun = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
      method: "POST",
      token: sessionToken,
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
            amount: 1800,
            originalPeriod: "202602",
            sourcePayRunId: regularRun.payRunId,
            sourceLineId: regularRun.lines[0].payRunLineId,
            note: "Retro API correction."
          }
        ]
      }
    });
    const retroLine = correctionRun.lines.find((line) => line.payItemCode === "CORRECTION");
    assert.ok(retroLine);
    assert.equal(retroLine.sourcePeriod, "202602");
    assert.equal(retroLine.sourcePayRunId, regularRun.payRunId);

    const finalRun = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payCalendarId: payCalendar.payCalendarId,
        reportingPeriod: "202604",
        runType: "final",
        finalPayAdjustments: [
          {
            employmentId: employment.employmentId,
            terminationDate: "2026-04-12",
            finalSettlementAmount: 12000,
            remainingVacationDays: 4,
            remainingVacationSettlementAmount: 4800,
            advanceVacationRecoveryAmount: 1500
          }
        ]
      }
    });
    assert.equal(finalRun.lines.some((line) => line.payItemCode === "FINAL_PAY"), true);

    const payslips = await requestJson(baseUrl, `/v1/payroll/pay-runs/${regularRun.payRunId}/payslips?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(payslips.items.length, 1);

    const regenerated = await requestJson(
      baseUrl,
      `/v1/payroll/pay-runs/${regularRun.payRunId}/payslips/${employment.employmentId}/regenerate`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID
        }
      }
    );
    assert.equal(regenerated.regenerationNo, 1);
  } finally {
    await stopServer(server);
  }
});

test("Phase 8.1 payroll routes disable cleanly behind the feature flag", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T08:00:00Z")
  });
  const server = createApiServer({
    platform,
    flags: {
      ...enabledFlags(),
      phase8PayrollEnabled: false
    }
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
    const response = await fetch(`${baseUrl}/v1/payroll/pay-items?companyId=${COMPANY_ID}`, {
      headers: {
        authorization: `Bearer ${sessionToken}`
      }
    });
    const payload = await response.json();
    assert.equal(response.status, 503);
    assert.equal(payload.error, "feature_disabled");
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
