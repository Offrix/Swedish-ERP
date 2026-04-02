import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 11.4 API creates canonical sick leave types and payroll auto-calculates Swedish sick pay", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-04-01T08:00:00Z")
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

    const employee = platform.createEmployee({
      companyId: COMPANY_ID,
      givenName: "Alma",
      familyName: "Api Sickpay",
      workEmail: "alma.api.sickpay@example.com",
      dateOfBirth: "1990-01-01",
      actorId: "integration-test"
    });
    const employment = platform.createEmployment({
      companyId: COMPANY_ID,
      employeeId: employee.employeeId,
      employmentTypeCode: "permanent",
      jobTitle: "Payroll specialist",
      payModelCode: "monthly_salary",
      startDate: "2025-01-01",
      actorId: "integration-test"
    });
    platform.recordEmploymentSalaryBasis({
      companyId: COMPANY_ID,
      employeeId: employee.employeeId,
      employmentId: employment.employmentId,
      validFrom: "2025-01-01",
      salaryBasisCode: "MONTHLY_STANDARD",
      payModelCode: "monthly_salary",
      standardWeeklyHours: 40,
      ordinaryHoursPerMonth: 160,
      actorId: "integration-test"
    });
    platform.addEmploymentContract({
      companyId: COMPANY_ID,
      employeeId: employee.employeeId,
      employmentId: employment.employmentId,
      validFrom: "2025-01-01",
      salaryModelCode: "monthly_salary",
      monthlySalary: 32000,
      currencyCode: "SEK",
      actorId: "integration-test"
    });
    platform.addEmployeeBankAccount({
      companyId: COMPANY_ID,
      employeeId: employee.employeeId,
      payoutMethod: "domestic_account",
      accountHolderName: "Alma Api Sickpay",
      clearingNumber: "5000",
      accountNumber: "1234567890",
      bankName: "Integration Test Bank",
      primaryAccount: true,
      actorId: "integration-test"
    });
    const scheduleTemplate = platform.createScheduleTemplate({
      companyId: COMPANY_ID,
      scheduleTemplateCode: "FULL_TIME_WEEKDAY_API",
      displayName: "Full-time weekday API",
      days: [
        { weekday: 1, plannedMinutes: 480 },
        { weekday: 2, plannedMinutes: 480 },
        { weekday: 3, plannedMinutes: 480 },
        { weekday: 4, plannedMinutes: 480 },
        { weekday: 5, plannedMinutes: 480 }
      ],
      actorId: "integration-test"
    });
    platform.assignScheduleTemplate({
      companyId: COMPANY_ID,
      employmentId: employment.employmentId,
      scheduleTemplateId: scheduleTemplate.scheduleTemplateId,
      validFrom: "2025-01-01",
      actorId: "integration-test"
    });

    const leaveType = await requestJson(baseUrl, "/v1/hr/leave-types", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        leaveTypeCode: "SICK_LEAVE_API",
        displayName: "Sick leave API",
        payrollTreatmentCode: "sick_leave",
        requiresManagerApproval: false
      }
    });
    assert.equal(leaveType.payrollTreatmentCode, "sick_leave");

    const leaveEntry = platform.createLeaveEntry({
      companyId: COMPANY_ID,
      employmentId: employment.employmentId,
      leaveTypeId: leaveType.leaveTypeId,
      reportingPeriod: "202604",
      days: [
        { date: "2026-04-01", extentPercent: 100 },
        { date: "2026-04-02", extentPercent: 50 },
        { date: "2026-04-03", extentPercent: 100 }
      ],
      actorId: "integration-test"
    });
    platform.submitLeaveEntry({
      companyId: COMPANY_ID,
      leaveEntryId: leaveEntry.leaveEntryId,
      actorId: "integration-test"
    });

    const payCalendar = (
      await requestJson(baseUrl, `/v1/payroll/pay-calendars?companyId=${COMPANY_ID}`, {
        token: sessionToken
      })
    ).items.find((item) => item.payCalendarCode === "MONTHLY_STANDARD");
    assert.ok(payCalendar);

    const payRun = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
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
            manualRateReasonCode: "emergency_manual_transition",
            taxRatePercent: 30,
            contributionClassCode: "full"
          }
        ]
      }
    });

    assert.deepEqual(
      payRun.lines.filter((line) => line.payItemCode === "SICK_ABSENCE_DEDUCTION").map((line) => line.amount),
      [1600, 800, 1600]
    );
    assert.deepEqual(
      payRun.lines.filter((line) => line.payItemCode === "SICK_PAY").map((line) => line.amount),
      [1280, 640, 1280]
    );
    assert.deepEqual(
      payRun.lines.filter((line) => line.payItemCode === "QUALIFYING_DEDUCTION").map((line) => line.amount),
      [1280]
    );
    assert.equal(payRun.payslips[0].totals.taxableBase, 29920);
    assert.equal(payRun.payslips[0].totals.employerContributionBase, 29920);
    assert.equal(payRun.payrollInputSnapshot.sourceSnapshot[employment.employmentId].leaveEntries[0].payrollTreatmentCode, "sick_leave");
    assert.equal(payRun.payrollInputSnapshot.sourceSnapshot[employment.employmentId].absenceDecisions[0].payrollTreatmentCode, "sick_leave");
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
    phase12PayrollTrialGuardsEnabled: true
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
  const mutationIdempotencyKey = ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase())
    ? crypto.randomUUID()
    : null;
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
