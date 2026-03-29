import test from "node:test";
import assert from "node:assert/strict";
import { createOrgAuthPlatform } from "../../packages/domain-org-auth/src/index.mjs";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 8.2 payroll resolves manual tax and SINK, locks AGI absence and creates correction versions", () => {
  const fixedNow = new Date("2026-03-22T08:00:00Z");
  const orgAuthPlatform = createOrgAuthPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo"
  });
  const hrPlatform = createHrPlatform({
    clock: () => fixedNow
  });
  const timePlatform = createTimePlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const payrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    orgAuthPlatform,
    hrPlatform,
    timePlatform
  });

  const manual = createEmployeeWithContract({
    hrPlatform,
    givenName: "Mia",
    familyName: "Manual",
    workEmail: "mia.manual@example.com",
    identityValue: "19800112-1238",
    monthlySalary: 40000
  });
  const sink = createEmployeeWithContract({
    hrPlatform,
    givenName: "Sven",
    familyName: "Sink",
    workEmail: "sven.sink@example.com",
    identityValue: "19891103-4323",
    monthlySalary: 43500,
    protectedIdentity: true
  });

  const leaveType = timePlatform.createLeaveType({
    companyId: COMPANY_ID,
    leaveTypeCode: "TEMP_PARENTAL",
    displayName: "Temporary parental benefit",
    signalType: "temporary_parental_benefit",
    requiresManagerApproval: false,
    actorId: "unit-test"
  });
  const leaveEntry = timePlatform.createLeaveEntry({
    companyId: COMPANY_ID,
    employmentId: sink.employment.employmentId,
    leaveTypeId: leaveType.leaveTypeId,
    reportingPeriod: "202603",
    days: [
      {
        date: "2026-03-19",
        extentPercent: 50
      },
      {
        date: "2026-03-20",
        extentPercent: 100
      }
    ],
    actorId: "unit-test"
  });
  timePlatform.submitLeaveEntry({
    companyId: COMPANY_ID,
    leaveEntryId: leaveEntry.leaveEntryId,
    actorId: "unit-test"
  });

  payrollPlatform.upsertEmploymentStatutoryProfile({
    companyId: COMPANY_ID,
    employmentId: manual.employment.employmentId,
    taxMode: "manual_rate",
    manualRateReasonCode: "emergency_manual_transition",
    taxRatePercent: 30,
    contributionClassCode: "full",
    actorId: "unit-test"
  });
  payrollPlatform.upsertEmploymentStatutoryProfile({
    companyId: COMPANY_ID,
    employmentId: sink.employment.employmentId,
    taxMode: "sink",
    contributionClassCode: "full",
    sinkDecisionType: "ordinary_sink",
    sinkValidFrom: "2026-01-01",
    sinkValidTo: "2026-12-31",
    sinkRatePercent: 22.5,
    sinkDecisionDocumentId: "sink-decision-2026",
    fallbackTaxMode: "manual_rate",
    fallbackManualRateReasonCode: "sink_fallback_pending_decision",
    fallbackTaxRatePercent: 30,
    actorId: "unit-test"
  });

  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const regularRun = payrollPlatform.createPayRun({
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
    ],
    actorId: "unit-test"
  });
  payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: regularRun.payRunId,
    actorId: "unit-test"
  });

  const draftSubmission = payrollPlatform.createAgiSubmission({
    companyId: COMPANY_ID,
    reportingPeriod: "202603",
    actorId: "unit-test"
  });
  assert.equal(draftSubmission.currentVersion.versionNo, 1);
  assert.equal(draftSubmission.currentVersion.employees.length, 2);

  const manualEmployee = draftSubmission.currentVersion.employees.find((employee) => employee.employeeId === manual.employee.employeeId);
  const sinkEmployee = draftSubmission.currentVersion.employees.find((employee) => employee.employeeId === sink.employee.employeeId);
  assert.equal(manualEmployee.payloadJson.taxFields.preliminaryTax > 0, true);
  assert.equal(manualEmployee.payloadJson.taxFields.sinkTax, null);
  assert.equal(sinkEmployee.payloadJson.taxFields.preliminaryTax, null);
  assert.equal(sinkEmployee.payloadJson.taxFields.sinkTax > 0, true);
  assert.equal(sinkEmployee.payloadJson.protectedIdentity, true);
  assert.equal(sinkEmployee.payloadJson.absence.signalCount, 2);

  const validated = payrollPlatform.validateAgiSubmission({
    companyId: COMPANY_ID,
    agiSubmissionId: draftSubmission.agiSubmissionId
  });
  assert.equal(validated.currentVersion.state, "validated");
  assert.equal(validated.currentVersion.validationErrors.length, 0);

  payrollPlatform.markAgiSubmissionReadyForSign({
    companyId: COMPANY_ID,
    agiSubmissionId: draftSubmission.agiSubmissionId,
    actorId: "unit-test"
  });
  const accepted = payrollPlatform.submitAgiSubmission({
    companyId: COMPANY_ID,
    agiSubmissionId: draftSubmission.agiSubmissionId,
    actorId: "unit-test",
    simulatedOutcome: "accepted"
  });
  assert.equal(accepted.currentVersion.state, "accepted");
  assert.equal(accepted.currentVersion.receipts.length, 1);

  const leaveLocks = timePlatform.listLeaveSignalLocks({
    companyId: COMPANY_ID,
    employmentId: sink.employment.employmentId,
    reportingPeriod: "202603"
  });
  assert.deepEqual(
    leaveLocks.map((lock) => lock.lockState).sort(),
    ["ready_for_sign", "signed", "submitted"]
  );

  assert.throws(
    () =>
      timePlatform.createLeaveEntry({
        companyId: COMPANY_ID,
        employmentId: sink.employment.employmentId,
        leaveTypeId: leaveType.leaveTypeId,
        reportingPeriod: "202603",
        days: [
          {
            date: "2026-03-25",
            extentPercent: 100
          }
        ],
        actorId: "unit-test"
      }),
    (error) => error?.code === "leave_signals_locked"
  );

  const correctionRun = payrollPlatform.createPayRun({
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
        sourceLineId: regularRun.lines.find((line) => line.employeeId === sink.employee.employeeId).payRunLineId,
        note: "Late March correction."
      }
    ],
    actorId: "unit-test"
  });
  payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: correctionRun.payRunId,
    actorId: "unit-test"
  });

  const correctionDraft = payrollPlatform.createAgiCorrectionVersion({
    companyId: COMPANY_ID,
    agiSubmissionId: draftSubmission.agiSubmissionId,
    correctionReason: "Late March correction and SINK follow-up.",
    actorId: "unit-test"
  });
  assert.equal(correctionDraft.currentVersion.versionNo, 2);
  assert.deepEqual(correctionDraft.currentVersion.changedEmployeeIds, [sink.employee.employeeId]);

  payrollPlatform.validateAgiSubmission({
    companyId: COMPANY_ID,
    agiSubmissionId: draftSubmission.agiSubmissionId
  });
  payrollPlatform.markAgiSubmissionReadyForSign({
    companyId: COMPANY_ID,
    agiSubmissionId: draftSubmission.agiSubmissionId,
    actorId: "unit-test"
  });
  const correctionSubmitted = payrollPlatform.submitAgiSubmission({
    companyId: COMPANY_ID,
    agiSubmissionId: draftSubmission.agiSubmissionId,
    actorId: "unit-test",
    simulatedOutcome: "partially_rejected",
    receiptErrors: [
      {
        errorCode: "agi_follow_up_required",
        message: "Manual review required for corrected sink employee."
      }
    ]
  });

  assert.equal(correctionSubmitted.currentVersion.state, "partially_rejected");
  assert.equal(correctionSubmitted.currentVersion.errors.length, 1);
  assert.equal(correctionSubmitted.versions.find((version) => version.versionNo === 1).state, "superseded");
});

function createEmployeeWithContract({
  hrPlatform,
  givenName,
  familyName,
  workEmail,
  identityValue,
  monthlySalary,
  protectedIdentity = false
}) {
  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName,
    familyName,
    identityType: "personnummer",
    identityValue,
    protectedIdentity,
    workEmail,
    actorId: "unit-test"
  });
  const employment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Payroll employee",
    payModelCode: "monthly_salary",
    startDate: "2025-01-01",
    actorId: "unit-test"
  });
  hrPlatform.addEmploymentContract({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    validFrom: "2025-01-01",
    salaryModelCode: "monthly_salary",
    monthlySalary,
    currencyCode: "SEK",
    actorId: "unit-test"
  });
  hrPlatform.addEmployeeBankAccount({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    payoutMethod: "domestic_account",
    accountHolderName: `${givenName} ${familyName}`,
    clearingNumber: "5000",
    accountNumber: `12345${String(monthlySalary).padStart(5, "0")}`,
    bankName: "Unit Test Payroll Bank",
    primaryAccount: true,
    actorId: "unit-test"
  });
  return {
    employee,
    employment
  };
}
