import test from "node:test";
import assert from "node:assert/strict";
import { createOrgAuthPlatform } from "../../packages/domain-org-auth/src/index.mjs";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 12.1 tax decision snapshots replace manual-rate default and enforce dual review for emergency manual", () => {
  const fixedNow = new Date("2026-03-28T09:30:00Z");
  const orgAuthPlatform = createOrgAuthPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo"
  });
  const hrPlatform = createHrPlatform({ clock: () => fixedNow });
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

  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];

  const tableEmployee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Tora",
    familyName: "Tabell",
    monthlySalary: 40000,
    identityValue: "19800112-1111"
  });
  payrollPlatform.createTaxDecisionSnapshot({
    companyId: COMPANY_ID,
    employmentId: tableEmployee.employment.employmentId,
    decisionType: "tabell",
    incomeYear: 2026,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    municipalityCode: "0180",
    tableCode: "34",
    columnCode: "1",
    withholdingFixedAmount: 11800,
    decisionSource: "skatteverket_table_import",
    decisionReference: "tabell-34-kolumn-1-2026",
    evidenceRef: "evidence-tax-table-2026",
    actorId: "unit-test"
  });
  const tableRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [tableEmployee.employment.employmentId],
    actorId: "unit-test"
  });
  assert.equal(tableRun.payslips[0].totals.taxDecision.outputs.decisionType, "tabell");
  assert.equal(tableRun.payslips[0].totals.taxDecision.outputs.preliminaryTax, 11800);

  const jamkningEmployee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Jonna",
    familyName: "Jamkning",
    monthlySalary: 40000,
    identityValue: "19800112-2222"
  });
  payrollPlatform.createTaxDecisionSnapshot({
    companyId: COMPANY_ID,
    employmentId: jamkningEmployee.employment.employmentId,
    decisionType: "jamkning",
    incomeYear: 2026,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    municipalityCode: "0180",
    tableCode: "34",
    columnCode: "1",
    withholdingRatePercent: 30,
    adjustmentFixedAmount: -1200,
    decisionSource: "skatteverket_adjustment_decision",
    decisionReference: "jamkning-2026-001",
    evidenceRef: "evidence-jamkning-2026",
    actorId: "unit-test"
  });
  const jamkningRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [jamkningEmployee.employment.employmentId],
    actorId: "unit-test"
  });
  assert.equal(jamkningRun.payslips[0].totals.taxDecision.outputs.decisionType, "jamkning");
  assert.equal(jamkningRun.payslips[0].totals.taxDecision.outputs.preliminaryTax, 10800);

  const extraEmployee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Ella",
    familyName: "Engang",
    monthlySalary: 0,
    identityValue: "19800112-3333"
  });
  payrollPlatform.createTaxDecisionSnapshot({
    companyId: COMPANY_ID,
    employmentId: extraEmployee.employment.employmentId,
    decisionType: "engangsskatt",
    incomeYear: 2026,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    withholdingRatePercent: 35,
    decisionSource: "skatteverket_one_time_profile",
    decisionReference: "engang-2026-001",
    evidenceRef: "evidence-engang-2026",
    actorId: "unit-test"
  });
  const extraRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    runType: "extra",
    employmentIds: [extraEmployee.employment.employmentId],
    manualInputs: [
      {
        employmentId: extraEmployee.employment.employmentId,
        payItemCode: "BONUS",
        amount: 10000,
        processingStep: 4
      }
    ],
    actorId: "unit-test"
  });
  assert.equal(extraRun.payslips[0].totals.taxDecision.outputs.decisionType, "engangsskatt");
  assert.equal(extraRun.payslips[0].totals.taxDecision.outputs.preliminaryTax, 3500);

  const emergencyEmployee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Maja",
    familyName: "Emergency",
    monthlySalary: 30000,
    identityValue: "19800112-4444"
  });
  const emergencyDraft = payrollPlatform.createTaxDecisionSnapshot({
    companyId: COMPANY_ID,
    employmentId: emergencyEmployee.employment.employmentId,
    decisionType: "emergency_manual",
    incomeYear: 2026,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    withholdingRatePercent: 29,
    decisionSource: "manual_emergency_override",
    decisionReference: "emergency-2026-001",
    evidenceRef: "evidence-emergency-2026",
    reasonCode: "skattebeslut_saknas_vid_cutover",
    actorId: "payroll-agent-1"
  });
  assert.equal(emergencyDraft.status, "draft");
  assert.throws(
    () =>
      payrollPlatform.approveTaxDecisionSnapshot({
        companyId: COMPANY_ID,
        taxDecisionSnapshotId: emergencyDraft.taxDecisionSnapshotId,
        actorId: "payroll-agent-1"
      }),
    (error) => error?.code === "tax_decision_snapshot_dual_review_required"
  );
  const emergencyApproved = payrollPlatform.approveTaxDecisionSnapshot({
    companyId: COMPANY_ID,
    taxDecisionSnapshotId: emergencyDraft.taxDecisionSnapshotId,
    actorId: "payroll-agent-2"
  });
  assert.equal(emergencyApproved.status, "approved");
  const emergencyRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [emergencyEmployee.employment.employmentId],
    actorId: "unit-test"
  });
  assert.equal(emergencyRun.payslips[0].totals.taxDecision.outputs.decisionType, "emergency_manual");
  assert.equal(emergencyRun.payslips[0].totals.taxDecision.outputs.preliminaryTax, 8700);
});

function createMonthlyEmployee({ hrPlatform, givenName, familyName, monthlySalary, identityValue }) {
  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName,
    familyName,
    identityType: "personnummer",
    identityValue,
    workEmail: `${givenName.toLowerCase()}.${familyName.toLowerCase()}@example.com`,
    actorId: "unit-test"
  });
  const employment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Tax decision tester",
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
    accountNumber: "1234567890",
    bankName: "Payroll Tax Bank",
    primaryAccount: true,
    actorId: "unit-test"
  });
  return {
    employee,
    employment
  };
}
