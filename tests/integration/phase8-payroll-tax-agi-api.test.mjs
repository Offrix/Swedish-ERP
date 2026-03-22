import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 8.2 migration and seeds add tax, SINK and AGI structures", async () => {
  const migration = await readText("packages/db/migrations/20260321210000_phase8_payroll_tax_agi.sql");
  for (const fragment of [
    "CREATE TABLE IF NOT EXISTS employment_statutory_profiles",
    "CREATE TABLE IF NOT EXISTS agi_periods",
    "CREATE TABLE IF NOT EXISTS agi_submission_versions",
    "CREATE TABLE IF NOT EXISTS agi_absence_payloads",
    "CREATE TABLE IF NOT EXISTS agi_receipts",
    "CREATE TABLE IF NOT EXISTS agi_signatures"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }

  const seed = await readText("packages/db/seeds/20260321210010_phase8_payroll_tax_agi_seed.sql");
  for (const fragment of [
    "payroll-tax-se-2026.1",
    "employment_statutory_profiles",
    "agi_submission_versions",
    "test:accepted"
  ]) {
    assert.match(seed, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }

  const demoSeed = await readText("packages/db/seeds/20260321211000_phase8_payroll_tax_agi_demo_seed.sql");
  for (const fragment of [
    "ordinary_sink",
    "partially_rejected",
    "Added late-reported SINK employee and March correction.",
    "agi_demo_follow_up_required"
  ]) {
    assert.match(demoSeed, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }
});

test("Phase 8.2 API manages statutory profiles and AGI submissions with corrections", async () => {
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

    const manual = createEmployeeWithContract({
      platform,
      givenName: "Iris",
      familyName: "Income",
      workEmail: "iris.income@example.com",
      identityValue: "19800112-1234",
      monthlySalary: 41000
    });
    const sink = createEmployeeWithContract({
      platform,
      givenName: "Nils",
      familyName: "Sink",
      workEmail: "nils.sink@example.com",
      identityValue: "19891103-4321",
      monthlySalary: 43500,
      protectedIdentity: true
    });

    const leaveType = platform.createLeaveType({
      companyId: COMPANY_ID,
      leaveTypeCode: "TEMP_PARENTAL",
      displayName: "Temporary parental benefit",
      signalType: "temporary_parental_benefit",
      requiresManagerApproval: false,
      actorId: "integration-test"
    });
    const leaveEntry = platform.createLeaveEntry({
      companyId: COMPANY_ID,
      employmentId: sink.employment.employmentId,
      leaveTypeId: leaveType.leaveTypeId,
      reportingPeriod: "202603",
      days: [
        { date: "2026-03-19", extentPercent: 50 },
        { date: "2026-03-20", extentPercent: 100 }
      ],
      actorId: "integration-test"
    });
    platform.submitLeaveEntry({
      companyId: COMPANY_ID,
      leaveEntryId: leaveEntry.leaveEntryId,
      actorId: "integration-test"
    });

    await requestJson(baseUrl, "/v1/payroll/statutory-profiles", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: manual.employment.employmentId,
        taxMode: "manual_rate",
        taxRatePercent: 30,
        contributionClassCode: "full"
      }
    });
    await requestJson(baseUrl, "/v1/payroll/statutory-profiles", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: sink.employment.employmentId,
        taxMode: "sink",
        contributionClassCode: "full",
        sinkDecisionType: "ordinary_sink",
        sinkValidFrom: "2026-01-01",
        sinkValidTo: "2026-12-31",
        sinkRatePercent: 22.5,
        fallbackTaxMode: "manual_rate",
        fallbackTaxRatePercent: 30
      }
    });

    const statutoryProfiles = await requestJson(baseUrl, `/v1/payroll/statutory-profiles?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(statutoryProfiles.items.length >= 2, true);

    const rulePacks = await requestJson(baseUrl, `/v1/payroll/rule-packs?companyId=${COMPANY_ID}&effectiveDate=2026-03-25`, {
      token: sessionToken
    });
    assert.equal(rulePacks.items.some((item) => item.rulePackId === "payroll-tax-se-2026.1"), true);

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
            employmentId: manual.employment.employmentId,
            payItemCode: "BONUS",
            amount: 1700,
            processingStep: 4
          },
          {
            employmentId: sink.employment.employmentId,
            payItemCode: "BONUS",
            amount: 5000,
            processingStep: 4
          },
          {
            employmentId: sink.employment.employmentId,
            payItemCode: "BENEFIT",
            amount: 4200,
            processingStep: 6
          }
        ]
      }
    });
    await requestJson(baseUrl, `/v1/payroll/pay-runs/${regularRun.payRunId}/approve`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });

    const createdSubmission = await requestJson(baseUrl, "/v1/payroll/agi-submissions", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportingPeriod: "202603"
      }
    });
    assert.equal(createdSubmission.currentVersion.employees.length, 2);

    const validated = await requestJson(
      baseUrl,
      `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}/validate`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID
        }
      }
    );
    assert.equal(validated.currentVersion.state, "validated");

    await requestJson(baseUrl, `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}/ready-for-sign`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });

    const accepted = await requestJson(baseUrl, `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}/submit`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        simulatedOutcome: "accepted"
      }
    });
    assert.equal(accepted.currentVersion.state, "accepted");

    const leaveLocks = platform.listLeaveSignalLocks({
      companyId: COMPANY_ID,
      employmentId: sink.employment.employmentId,
      reportingPeriod: "202603"
    });
    assert.deepEqual(
      leaveLocks.map((lock) => lock.lockState).sort(),
      ["ready_for_sign", "signed", "submitted"]
    );

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
            employmentId: sink.employment.employmentId,
            payItemCode: "CORRECTION",
            amount: 1800,
            originalPeriod: "202602",
            sourcePayRunId: regularRun.payRunId,
            sourceLineId: regularRun.lines.find((line) => line.employeeId === sink.employee.employeeId).payRunLineId
          }
        ]
      }
    });
    await requestJson(baseUrl, `/v1/payroll/pay-runs/${correctionRun.payRunId}/approve`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });

    const correctionDraft = await requestJson(
      baseUrl,
      `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}/correction`,
      {
        method: "POST",
        token: sessionToken,
        expectedStatus: 201,
        body: {
          companyId: COMPANY_ID,
          correctionReason: "Late March correction and SINK follow-up."
        }
      }
    );
    assert.equal(correctionDraft.currentVersion.versionNo, 2);

    await requestJson(baseUrl, `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}/validate`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    await requestJson(baseUrl, `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}/ready-for-sign`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    const correctionSubmitted = await requestJson(
      baseUrl,
      `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}/submit`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID,
          simulatedOutcome: "partially_rejected",
          receiptErrors: [
            {
              errorCode: "agi_follow_up_required",
              message: "Manual review required for corrected sink employee."
            }
          ]
        }
      }
    );
    assert.equal(correctionSubmitted.currentVersion.state, "partially_rejected");
    assert.equal(correctionSubmitted.currentVersion.errors.length, 1);

    const fetched = await requestJson(
      baseUrl,
      `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}?companyId=${COMPANY_ID}`,
      {
        token: sessionToken
      }
    );
    assert.equal(fetched.versions.length, 2);
    assert.equal(fetched.currentVersion.changedEmployeeIds.includes(sink.employee.employeeId), true);
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

function createEmployeeWithContract({
  platform,
  givenName,
  familyName,
  workEmail,
  identityValue,
  monthlySalary,
  protectedIdentity = false
}) {
  const employee = platform.createEmployee({
    companyId: COMPANY_ID,
    givenName,
    familyName,
    identityType: "personnummer",
    identityValue,
    protectedIdentity,
    workEmail,
    actorId: "integration-test"
  });
  const employment = platform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Payroll employee",
    payModelCode: "monthly_salary",
    startDate: "2025-01-01",
    actorId: "integration-test"
  });
  platform.addEmploymentContract({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    validFrom: "2025-01-01",
    salaryModelCode: "monthly_salary",
    monthlySalary,
    actorId: "integration-test"
  });
  platform.addEmployeeBankAccount({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    payoutMethod: "domestic_account",
    accountHolderName: `${givenName} ${familyName}`,
    clearingNumber: "5000",
    accountNumber: `12345${String(monthlySalary).padStart(5, "0")}`,
    bankName: "Integration Payroll Bank",
    primaryAccount: true,
    actorId: "integration-test"
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
