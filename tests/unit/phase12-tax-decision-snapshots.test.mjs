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
    identityValue: "19800112-1113"
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
  assert.equal(tableRun.payslips[0].totals.taxDecision.outputs.preliminaryTax, 8652);
  assert.equal(tableRun.payslips[0].totals.taxDecision.outputs.tableLookupMode, "fixed_amount");
  assert.equal(tableRun.payslips[0].totals.taxDecision.outputs.tableLookupRowCode, "30B34");
  assert.equal(tableRun.payslips[0].totals.taxDecision.rule_pack_id, "payroll-tax-se-2026.1");
  assert.equal(tableRun.payslips[0].totals.taxDecision.rule_pack_checksum, "phase8-payroll-tax-se-2026-1");

  const highIncomeEmployee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Helge",
    familyName: "Hogtabell",
    monthlySalary: 82000,
    identityValue: "19800112-8886"
  });
  payrollPlatform.createTaxDecisionSnapshot({
    companyId: COMPANY_ID,
    employmentId: highIncomeEmployee.employment.employmentId,
    decisionType: "tabell",
    incomeYear: 2026,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    municipalityCode: "0180",
    tableCode: "34",
    columnCode: "1",
    decisionSource: "skatteverket_table_import",
    decisionReference: "tabell-34-kolumn-1-2026-high",
    evidenceRef: "evidence-tax-table-2026-high",
    actorId: "unit-test"
  });
  const highIncomeRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [highIncomeEmployee.employment.employmentId],
    actorId: "unit-test"
  });
  assert.equal(highIncomeRun.payslips[0].totals.taxDecision.outputs.preliminaryTax, 28700);
  assert.equal(highIncomeRun.payslips[0].totals.taxDecision.outputs.tableLookupMode, "percentage");
  assert.equal(highIncomeRun.payslips[0].totals.taxDecision.outputs.tableLookupRowCode, "30%34");

  const jamkningEmployee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Jonna",
    familyName: "Jamkning",
    monthlySalary: 40000,
    identityValue: "19800112-2228"
  });
  payrollPlatform.createTaxDecisionSnapshot({
    companyId: COMPANY_ID,
    employmentId: jamkningEmployee.employment.employmentId,
    decisionType: "jamkning_fast",
    incomeYear: 2026,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    municipalityCode: "0180",
    tableCode: "34",
    columnCode: "1",
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
  assert.equal(jamkningRun.payslips[0].totals.taxDecision.outputs.decisionType, "jamkning_fast");
  assert.equal(jamkningRun.payslips[0].totals.taxDecision.outputs.preliminaryTax, 7452);

  const jamkningPercentEmployee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Pia",
    familyName: "Jamkningprocent",
    monthlySalary: 40000,
    identityValue: "19800112-2129"
  });
  payrollPlatform.createTaxDecisionSnapshot({
    companyId: COMPANY_ID,
    employmentId: jamkningPercentEmployee.employment.employmentId,
    decisionType: "jamkning_procent",
    incomeYear: 2026,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    adjustmentPercentage: 27,
    decisionSource: "skatteverket_adjustment_decision",
    decisionReference: "jamkning-2026-002",
    evidenceRef: "evidence-jamkning-2026-002",
    actorId: "unit-test"
  });
  const jamkningPercentRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [jamkningPercentEmployee.employment.employmentId],
    actorId: "unit-test"
  });
  assert.equal(jamkningPercentRun.payslips[0].totals.taxDecision.outputs.decisionType, "jamkning_procent");
  assert.equal(jamkningPercentRun.payslips[0].totals.taxDecision.outputs.preliminaryTax, 10800);

  const legacyJamkningEmployee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Lina",
    familyName: "Legacyjamkning",
    monthlySalary: 40000,
    identityValue: "19800112-0164"
  });
  const legacyJamkningDecision = payrollPlatform.createTaxDecisionSnapshot({
    companyId: COMPANY_ID,
    employmentId: legacyJamkningEmployee.employment.employmentId,
    decisionType: "jamkning",
    incomeYear: 2026,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    municipalityCode: "0180",
    tableCode: "34",
    columnCode: "1",
    adjustmentFixedAmount: -500,
    decisionSource: "skatteverket_adjustment_decision",
    decisionReference: "jamkning-legacy-2026-001",
    evidenceRef: "evidence-jamkning-legacy-2026",
    actorId: "unit-test"
  });
  assert.equal(legacyJamkningDecision.decisionType, "jamkning_fast");
  const legacyJamkningRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [legacyJamkningEmployee.employment.employmentId],
    actorId: "unit-test"
  });
  assert.equal(legacyJamkningRun.payslips[0].totals.taxDecision.outputs.decisionType, "jamkning_fast");
  assert.equal(legacyJamkningRun.payslips[0].totals.taxDecision.outputs.preliminaryTax, 8152);

  const extraEmployee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Ella",
    familyName: "Engang",
    monthlySalary: 40000,
    identityValue: "19800112-3333"
  });
  payrollPlatform.createTaxDecisionSnapshot({
    companyId: COMPANY_ID,
    employmentId: extraEmployee.employment.employmentId,
    decisionType: "engangsskatt",
    incomeYear: 2026,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    columnCode: "1",
    annualIncomeBasisAmount: 480000,
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
  assert.equal(extraRun.payslips[0].totals.taxDecision.outputs.preliminaryTax, 3400);
  assert.equal(extraRun.payslips[0].totals.taxDecision.outputs.oneTimeLookupRatePercent, 34);
  assert.equal(extraRun.payslips[0].totals.taxDecision.outputs.annualIncomeBasisAmount, 480000);

  const sinkEmployee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Sune",
    familyName: "Sinksnapshot",
    monthlySalary: 40000,
    identityValue: "19800112-0008"
  });
  const sinkDecision = payrollPlatform.createTaxDecisionSnapshot({
    companyId: COMPANY_ID,
    employmentId: sinkEmployee.employment.employmentId,
    decisionType: "sink",
    incomeYear: 2026,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    sinkRatePercent: 22.5,
    sinkSeaIncome: false,
    decisionSource: "skatteverket_sink_decision",
    decisionReference: "sink-2026-001",
    evidenceRef: "evidence-sink-2026",
    actorId: "unit-test"
  });
  assert.equal(sinkDecision.decisionType, "sink");
  const sinkRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [sinkEmployee.employment.employmentId],
    actorId: "unit-test"
  });
  assert.equal(sinkRun.payslips[0].totals.taxDecision.outputs.decisionType, "sink");
  assert.equal(sinkRun.payslips[0].totals.taxDecision.outputs.taxFieldCode, "sink_tax");
  assert.equal(sinkRun.payslips[0].totals.taxDecision.outputs.preliminaryTax, 9000);

  const aSinkEmployee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Aron",
    familyName: "Asink",
    monthlySalary: 40000,
    identityValue: "19800112-5551"
  });
  const aSinkDecision = payrollPlatform.createTaxDecisionSnapshot({
    companyId: COMPANY_ID,
    employmentId: aSinkEmployee.employment.employmentId,
    decisionType: "a_sink",
    incomeYear: 2026,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    decisionSource: "skatteverket_asink_decision",
    decisionReference: "asink-2026-001",
    evidenceRef: "evidence-asink-2026",
    actorId: "unit-test"
  });
  assert.equal(aSinkDecision.decisionType, "asink");
  const aSinkRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [aSinkEmployee.employment.employmentId],
    actorId: "unit-test"
  });
  assert.equal(aSinkRun.payslips[0].totals.taxDecision.outputs.decisionType, "asink");
  assert.equal(aSinkRun.payslips[0].totals.taxDecision.outputs.taxFieldCode, "a_sink_tax");
  assert.equal(aSinkRun.payslips[0].totals.taxDecision.outputs.preliminaryTax, 6000);

  const emergencyEmployee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Maja",
    familyName: "Emergency",
    monthlySalary: 30000,
    identityValue: "19800112-4448"
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
    overrideEndsOn: "2026-03-31",
    rollbackPlanRef: "rollback-plan-tax-emergency-202603",
    actorId: "payroll-agent-1"
  });
  assert.equal(emergencyDraft.status, "draft");
  assert.equal(emergencyDraft.overrideEndsOn, "2026-03-31");
  assert.equal(emergencyDraft.rollbackPlanRef, "rollback-plan-tax-emergency-202603");
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
  assert.equal(emergencyApproved.overrideEndsOn, "2026-03-31");
  assert.equal(emergencyApproved.rollbackPlanRef, "rollback-plan-tax-emergency-202603");
  const emergencyRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [emergencyEmployee.employment.employmentId],
    actorId: "unit-test"
  });
  assert.equal(emergencyRun.payslips[0].totals.taxDecision.outputs.decisionType, "emergency_manual");
  assert.equal(emergencyRun.payslips[0].totals.taxDecision.outputs.preliminaryTax, 8700);
  assert.equal(emergencyRun.payslips[0].totals.taxDecision.rule_pack_id, "payroll-tax-se-2026.1");
  assert.equal(emergencyRun.payslips[0].totals.taxDecision.rule_pack_checksum, "phase8-payroll-tax-se-2026-1");
});

test("Phase 5.5 emergency tax overrides require explicit time-box, rollback plan and approved inline evidence", () => {
  const fixedNow = new Date("2026-03-28T09:30:00Z");
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
    givenName: "Elin",
    familyName: "Override",
    monthlySalary: 32000,
    identityValue: "19800112-1113"
  });

  assert.throws(
    () =>
      payrollPlatform.createTaxDecisionSnapshot({
        companyId: COMPANY_ID,
        employmentId: employee.employment.employmentId,
        decisionType: "emergency_manual",
        incomeYear: 2026,
        validFrom: "2026-03-01",
        validTo: "2026-12-31",
        withholdingRatePercent: 28,
        decisionSource: "manual_emergency_override",
        decisionReference: "missing-window",
        evidenceRef: "evidence-missing-window",
        reasonCode: "cutover_gap",
        rollbackPlanRef: "rollback-plan-tax-emergency-missing-window",
        actorId: "payroll-agent-1"
      }),
    (error) => error?.code === "tax_decision_snapshot_emergency_override_ends_on_required"
  );

  assert.throws(
    () =>
      payrollPlatform.createTaxDecisionSnapshot({
        companyId: COMPANY_ID,
        employmentId: employee.employment.employmentId,
        decisionType: "emergency_manual",
        incomeYear: 2026,
        validFrom: "2026-03-01",
        validTo: "2026-12-31",
        withholdingRatePercent: 28,
        decisionSource: "manual_emergency_override",
        decisionReference: "missing-rollback",
        evidenceRef: "evidence-missing-rollback",
        reasonCode: "cutover_gap",
        overrideEndsOn: "2026-03-31",
        actorId: "payroll-agent-1"
      }),
    (error) => error?.code === "tax_decision_snapshot_emergency_rollback_plan_required"
  );

  assert.throws(
    () =>
      payrollPlatform.createPayRun({
        companyId: COMPANY_ID,
        payCalendarId: payCalendar.payCalendarId,
        reportingPeriod: "202603",
        employmentIds: [employee.employment.employmentId],
        taxDecisionSnapshots: [
          {
            employmentId: employee.employment.employmentId,
            decisionType: "emergency_manual",
            incomeYear: 2026,
            validFrom: "2026-03-01",
            validTo: "2026-12-31",
            overrideEndsOn: "2026-03-31",
            withholdingRatePercent: 28,
            decisionSource: "manual_emergency_override",
            decisionReference: "inline-unapproved",
            evidenceRef: "evidence-inline-unapproved",
            reasonCode: "cutover_gap",
            rollbackPlanRef: "rollback-plan-inline-unapproved"
          }
        ],
        actorId: "unit-test"
      }),
    (error) => error?.code === "payroll_tax_decision_snapshot_approval_required"
  );
});

test("Phase 11.1 table tax decisions reject inline withholding overrides", () => {
  const fixedNow = new Date("2026-03-28T09:30:00Z");
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
  const employee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Tove",
    familyName: "Tabellguard",
    monthlySalary: 40000,
    identityValue: "19800112-9991"
  });

  assert.throws(
    () =>
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
        withholdingFixedAmount: 8652,
        decisionSource: "skatteverket_table_import",
        decisionReference: "tabell-inline-blocked-2026",
        evidenceRef: "evidence-tabell-inline-blocked-2026",
        actorId: "unit-test"
      }),
    (error) => error?.code === "tax_decision_snapshot_table_manual_withholding_forbidden"
  );
});

test("Phase 11.1 one-time tax decisions require annual income basis and official lookup", () => {
  const fixedNow = new Date("2026-03-28T09:30:00Z");
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
  const employee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Ola",
    familyName: "Engangguard",
    monthlySalary: 40000,
    identityValue: "19800112-9793"
  });

  assert.throws(
    () =>
      payrollPlatform.createTaxDecisionSnapshot({
        companyId: COMPANY_ID,
        employmentId: employee.employment.employmentId,
        decisionType: "engangsskatt",
        incomeYear: 2026,
        validFrom: "2026-01-01",
        validTo: "2026-12-31",
        columnCode: "1",
        decisionSource: "skatteverket_one_time_profile",
        decisionReference: "engang-missing-annual-basis-2026",
        evidenceRef: "evidence-engang-missing-annual-basis-2026",
        actorId: "unit-test"
      }),
    (error) => error?.code === "tax_decision_snapshot_one_time_annual_income_basis_required"
  );

  assert.throws(
    () =>
      payrollPlatform.createTaxDecisionSnapshot({
        companyId: COMPANY_ID,
        employmentId: employee.employment.employmentId,
        decisionType: "engangsskatt",
        incomeYear: 2026,
        validFrom: "2026-01-01",
        validTo: "2026-12-31",
        columnCode: "1",
        annualIncomeBasisAmount: 480000,
        withholdingRatePercent: 35,
        decisionSource: "skatteverket_one_time_profile",
        decisionReference: "engang-inline-rate-2026",
        evidenceRef: "evidence-engang-inline-rate-2026",
        actorId: "unit-test"
      }),
    (error) => error?.code === "tax_decision_snapshot_one_time_inline_withholding_forbidden"
  );
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
