import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 8.2 e2e flow handles payroll tax, AGI signing, leave locks and correction history", async () => {
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
    const adminToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    const employee = createEmployeeWithContract({
      platform,
      givenName: "Sara",
      familyName: "Sink",
      workEmail: "sara.sink@example.com",
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
      actorId: "e2e-test"
    });
    const leaveEntry = platform.createLeaveEntry({
      companyId: COMPANY_ID,
      employmentId: employee.employment.employmentId,
      leaveTypeId: leaveType.leaveTypeId,
      reportingPeriod: "202603",
      days: [
        { date: "2026-03-19", extentPercent: 50 },
        { date: "2026-03-20", extentPercent: 100 }
      ],
      actorId: "e2e-test"
    });
    platform.submitLeaveEntry({
      companyId: COMPANY_ID,
      leaveEntryId: leaveEntry.leaveEntryId,
      actorId: "e2e-test"
    });

    await requestJson(baseUrl, "/v1/payroll/statutory-profiles", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employee.employment.employmentId,
        taxMode: "sink",
        contributionClassCode: "full",
        sinkDecisionType: "ordinary_sink",
        sinkValidFrom: "2026-01-01",
        sinkValidTo: "2026-12-31",
        sinkRatePercent: 22.5,
        sinkDecisionDocumentId: "sink-decision-2026",
        fallbackTaxMode: "manual_rate",
        fallbackManualRateReasonCode: "sink_fallback_pending_decision",
        fallbackTaxRatePercent: 30
      }
    });

    const payCalendar = (
      await requestJson(baseUrl, `/v1/payroll/pay-calendars?companyId=${COMPANY_ID}`, {
        token: adminToken
      })
    ).items.find((item) => item.payCalendarCode === "MONTHLY_STANDARD");
    assert.ok(payCalendar);

    const regularRun = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payCalendarId: payCalendar.payCalendarId,
        reportingPeriod: "202603",
        employmentIds: [employee.employment.employmentId],
        manualInputs: [
          {
            employmentId: employee.employment.employmentId,
            payItemCode: "BONUS",
            amount: 5000,
            processingStep: 4
          },
          {
            employmentId: employee.employment.employmentId,
            payItemCode: "BENEFIT",
            amount: 4200,
            processingStep: 6
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

    const createdSubmission = await requestJson(baseUrl, "/v1/payroll/agi-submissions", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportingPeriod: "202603"
      }
    });
    const draftEmployee = createdSubmission.currentVersion.employees[0];
    assert.equal(draftEmployee.payloadJson.taxFields.sinkTax > 0, true);
    assert.equal(draftEmployee.payloadJson.absence.signalCount, 2);

    await requestJson(baseUrl, `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}/validate`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    await requestJson(baseUrl, `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}/ready-for-sign`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    const accepted = await requestJson(baseUrl, `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}/submit`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: COMPANY_ID,
        simulatedOutcome: "accepted"
      }
    });
    assert.equal(accepted.currentVersion.state, "accepted");

    assert.throws(
      () =>
        platform.createLeaveEntry({
          companyId: COMPANY_ID,
          employmentId: employee.employment.employmentId,
          leaveTypeId: leaveType.leaveTypeId,
          reportingPeriod: "202603",
          days: [{ date: "2026-03-24", extentPercent: 100 }],
          actorId: "e2e-test"
        }),
      (error) => error?.code === "leave_signals_locked"
    );

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
            employmentId: employee.employment.employmentId,
            payItemCode: "CORRECTION",
            amount: 1800,
            originalPeriod: "202602",
            sourcePayRunId: regularRun.payRunId,
            sourceLineId: regularRun.lines[0].payRunLineId,
            note: "Late March correction."
          }
        ]
      }
    });
    await requestJson(baseUrl, `/v1/payroll/pay-runs/${correctionRun.payRunId}/approve`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: COMPANY_ID
      }
    });

    await requestJson(baseUrl, `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}/correction`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        correctionReason: "Late March correction."
      }
    });
    await requestJson(baseUrl, `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}/validate`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    await requestJson(baseUrl, `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}/ready-for-sign`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    await requestJson(baseUrl, `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}/submit`, {
      method: "POST",
      token: adminToken,
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
    });

    const fetched = await requestJson(
      baseUrl,
      `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}?companyId=${COMPANY_ID}`,
      {
        token: adminToken
      }
    );
    assert.equal(fetched.versions.length, 2);
    assert.equal(fetched.currentVersion.state, "partially_rejected");
    assert.equal(fetched.currentVersion.errors.length, 1);
    assert.equal(fetched.versions.find((version) => version.versionNo === 1).state, "superseded");
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
    actorId: "e2e-test"
  });
  const employment = platform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Payroll employee",
    payModelCode: "monthly_salary",
    startDate: "2025-01-01",
    actorId: "e2e-test"
  });
  platform.addEmploymentContract({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    validFrom: "2025-01-01",
    salaryModelCode: "monthly_salary",
    monthlySalary,
    actorId: "e2e-test"
  });
  platform.addEmployeeBankAccount({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    payoutMethod: "domestic_account",
    accountHolderName: `${givenName} ${familyName}`,
    clearingNumber: "5000",
    accountNumber: `12345${String(monthlySalary).padStart(5, "0")}`,
    bankName: "E2E Payroll Bank",
    primaryAccount: true,
    actorId: "e2e-test"
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
