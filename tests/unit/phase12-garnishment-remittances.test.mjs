import test from "node:test";
import assert from "node:assert/strict";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 12.6 garnishment decisions drive withholding and remittance instructions", () => {
  const fixedNow = new Date("2026-03-28T11:00:00Z");
  const hrPlatform = createHrPlatform({ clock: () => fixedNow });
  const timePlatform = createTimePlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const payrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    hrPlatform,
    timePlatform
  });

  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const employee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Klara",
    familyName: "Kronofogd",
    monthlySalary: 30000,
    identityValue: "19800112-7771"
  });

  payrollPlatform.createTaxDecisionSnapshot({
    companyId: COMPANY_ID,
    employmentId: employee.employment.employmentId,
    decisionType: "tabell",
    incomeYear: 2026,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    municipalityCode: "0180",
    tableCode: "34",
    columnCode: "1",
    withholdingFixedAmount: 10000,
    decisionSource: "skatteverket_table_import",
    decisionReference: "tabell-34-1-2026",
    evidenceRef: "evidence-tax-kfm-2026",
    actorId: "unit-test"
  });

  const garnishmentDecision = payrollPlatform.createGarnishmentDecisionSnapshot({
    companyId: COMPANY_ID,
    employmentId: employee.employment.employmentId,
    decisionType: "authority_order",
    incomeYear: 2026,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    deductionModelCode: "max_above_protected_amount",
    maximumWithheldAmount: 7000,
    protectedAmountAmount: 12000,
    householdProfile: {
      householdTypeCode: "single_adult",
      childAgeBandCounts: {
        age_0_6: 0,
        age_7_10: 0,
        age_11_14: 0,
        age_15_plus: 0
      }
    },
    authorityCaseReference: "KFM-2026-0001",
    remittanceRecipientName: "Kronofogden",
    remittanceMethodCode: "bankgiro",
    remittanceBankgiro: "5050-1234",
    remittanceOcrReference: "202600015",
    decisionSource: "kronofogden_order",
    decisionReference: "beslut-2026-0001",
    evidenceRef: "evidence-kfm-2026-0001",
    actorId: "unit-test"
  });
  assert.equal(garnishmentDecision.status, "approved");
  assert.equal(garnishmentDecision.protectedAmountBaseline.adultBaseAmount, 6243);

  const manualOverrideDraft = payrollPlatform.createGarnishmentDecisionSnapshot({
    companyId: COMPANY_ID,
    employmentId: employee.employment.employmentId,
    decisionType: "manual_override",
    incomeYear: 2026,
    validFrom: "2026-02-01",
    validTo: "2026-02-28",
    deductionModelCode: "fixed_amount",
    fixedDeductionAmount: 2500,
    protectedAmountAmount: 12000,
    householdProfile: {
      householdTypeCode: "single_adult",
      childAgeBandCounts: {
        age_0_6: 0,
        age_7_10: 0,
        age_11_14: 0,
        age_15_plus: 0
      }
    },
    authorityCaseReference: "KFM-MANUAL-2026",
    remittanceRecipientName: "Kronofogden",
    remittanceMethodCode: "bankgiro",
    remittanceBankgiro: "5050-1234",
    decisionSource: "support_manual_override",
    decisionReference: "manual-2026-0001",
    evidenceRef: "evidence-kfm-manual-2026-0001",
    reasonCode: "authority_decision_pending_correction",
    actorId: "payroll-agent-1"
  });
  assert.equal(manualOverrideDraft.status, "draft");
  assert.throws(
    () =>
      payrollPlatform.approveGarnishmentDecisionSnapshot({
        companyId: COMPANY_ID,
        garnishmentDecisionSnapshotId: manualOverrideDraft.garnishmentDecisionSnapshotId,
        actorId: "payroll-agent-1"
      }),
    (error) => error?.code === "garnishment_decision_snapshot_dual_review_required"
  );

  const payRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [employee.employment.employmentId],
    actorId: "unit-test"
  });
  const payslip = payRun.payslips[0];
  assert.equal(payslip.totals.preliminaryTax, 10000);
  assert.equal(payslip.totals.garnishmentAmount, 7000);
  assert.equal(payslip.totals.garnishmentDecision.outputs.availableAboveProtected, 8000);
  assert.equal(payslip.totals.garnishmentDecision.outputs.remittanceBankgiro, "5050-1234");
  const garnishmentLine = payRun.lines.find((line) => line.payItemCode === "GARNISHMENT");
  assert.ok(garnishmentLine);
  assert.equal(garnishmentLine.ledgerAccountCode, "2720");

  const approvedRun = payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: payRun.payRunId,
    actorId: "unit-test"
  });
  assert.equal(approvedRun.remittanceInstructions.length, 1);
  assert.equal(approvedRun.remittanceSummary.paymentOrderReadyCount, 1);
  assert.equal(approvedRun.remittanceInstructions[0].amount, 7000);
  assert.equal(approvedRun.remittanceInstructions[0].paymentOrderState, "payment_order_ready");

  const settled = payrollPlatform.settleRemittanceInstruction({
    companyId: COMPANY_ID,
    remittanceInstructionId: approvedRun.remittanceInstructions[0].remittanceInstructionId,
    paymentOrderReference: "BANK-ORDER-2026-03",
    actorId: "unit-test"
  });
  assert.equal(settled.status, "settled");
  assert.equal(settled.paymentOrderReference, "BANK-ORDER-2026-03");
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
    jobTitle: "Garnishment tester",
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
    bankName: "Payroll Garnishment Bank",
    primaryAccount: true,
    actorId: "unit-test"
  });
  return {
    employee,
    employment
  };
}
