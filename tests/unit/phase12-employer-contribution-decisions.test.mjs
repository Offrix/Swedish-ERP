import test from "node:test";
import assert from "node:assert/strict";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 11.2 employer contribution decisions handle full rate, age buckets, threshold splits and vaxa tax-account relief", () => {
  const fixedNow = new Date("2026-03-28T09:45:00Z");
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

  const standardEmployee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Frida",
    familyName: "Fullavgift",
    monthlySalary: 30000,
    identityValue: "19920303-1118",
    dateOfBirth: "1992-03-03"
  });
  const standardRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [standardEmployee.employment.employmentId],
    actorId: "unit-test"
  });
  assert.equal(standardRun.payslips[0].totals.employerContributionPreviewAmount, 9426);
  assert.equal(standardRun.payslips[0].totals.employerContributionDecision.outputs.decisionType, "full");
  assert.equal(standardRun.payslips[0].totals.employerContributionDecision.outputs.thresholds.thresholdModeCode, "none");
  assert.deepEqual(standardRun.payslips[0].totals.employerContributionDecision.outputs.reducedComponents, []);
  assert.equal(standardRun.payslips[0].totals.employerContributionDecision.outputs.rulepackRef.rulepackId, "payroll-employer-contribution-se-2026.1");

  const olderEmployee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Algot",
    familyName: "Aldersavgift",
    monthlySalary: 30000,
    identityValue: "19590203-1110",
    dateOfBirth: "1959-02-03"
  });
  const olderRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [olderEmployee.employment.employmentId],
    actorId: "unit-test"
  });
  assert.equal(olderRun.payslips[0].totals.employerContributionPreviewAmount, 3063);
  assert.equal(olderRun.payslips[0].totals.employerContributionDecision.outputs.decisionType, "reduced_age_pension_only");
  assert.equal(olderRun.payslips[0].totals.employerContributionDecision.outputs.ageBucket, "year_start_67_plus");
  assert.equal(
    olderRun.payslips[0].totals.employerContributionDecision.outputs.reducedComponents[0].componentCode,
    "age_pension_only"
  );
  assert.equal(olderRun.payslips[0].totals.employerContributionDecision.rule_pack_id, "payroll-employer-contribution-se-2026.1");
  assert.equal(olderRun.payslips[0].totals.employerContributionDecision.rule_pack_checksum, "phase8-payroll-employer-contribution-se-2026-1");

  const youthEmployee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Ylva",
    familyName: "Youthdecision",
    monthlySalary: 30000,
    identityValue: "20050512-2226",
    dateOfBirth: "2005-05-12"
  });
  const youthRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202604",
    employmentIds: [youthEmployee.employment.employmentId],
    actorId: "unit-test"
  });
  assert.equal(youthRun.payslips[0].totals.employerContributionPreviewAmount, 6773.5);
  assert.equal(
    youthRun.payslips[0].totals.employerContributionDecision.outputs.decisionType,
    "temporary_youth_reduction"
  );
  assert.deepEqual(
    youthRun.payslips[0].totals.employerContributionDecision.outputs.contributionComponents.map((component) => component.componentCode),
    ["temporary_youth_reduction_band", "standard_overflow_band"]
  );
  assert.equal(youthRun.payslips[0].totals.employerContributionDecision.outputs.thresholds.baseLimitAmount, 25000);
  assert.equal(
    youthRun.payslips[0].totals.employerContributionDecision.outputs.reducedComponents[0].componentCode,
    "temporary_youth_reduction_band"
  );
  assert.equal(youthRun.payslips[0].totals.employerContributionDecision.outputs.referenceFullContributionAmount, 9426);
  assert.equal(youthRun.payslips[0].totals.employerContributionDecision.rule_pack_id, "payroll-employer-contribution-se-2026.2");
  assert.equal(youthRun.payslips[0].totals.employerContributionDecision.rule_pack_checksum, "phase8-payroll-employer-contribution-se-2026-2");

  const noContributionEmployee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Nils",
    familyName: "Nollavgift",
    monthlySalary: 30000,
    identityValue: "19370112-4442",
    dateOfBirth: "1937-01-12"
  });
  const noContributionRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [noContributionEmployee.employment.employmentId],
    actorId: "unit-test"
  });
  assert.equal(noContributionRun.payslips[0].totals.employerContributionPreviewAmount, 0);
  assert.equal(noContributionRun.payslips[0].totals.employerContributionDecision.outputs.decisionType, "no_contribution");
  assert.equal(noContributionRun.payslips[0].totals.employerContributionDecision.outputs.fullRatePercent, 31.42);
  assert.equal(noContributionRun.payslips[0].totals.employerContributionDecision.outputs.reducedRatePercent, 0);
  assert.equal(
    noContributionRun.payslips[0].totals.employerContributionDecision.outputs.reducedComponents[0].componentCode,
    "no_contribution"
  );

  const vaxaEmployee = createMonthlyEmployee({
    hrPlatform,
    givenName: "Vera",
    familyName: "Vaxa",
    monthlySalary: 30000,
    identityValue: "19900112-3331",
    dateOfBirth: "1990-01-12"
  });
  assert.throws(
    () =>
      payrollPlatform.createEmployerContributionDecisionSnapshot({
        companyId: COMPANY_ID,
        employmentId: vaxaEmployee.employment.employmentId,
        decisionType: "vaxa",
        ageBucket: "standard",
        legalBasisCode: "se_vaxa_2026_refund_credit",
        validFrom: "2026-01-01",
        validTo: "2026-12-31",
        fullRate: 30,
        thresholds: {
          thresholdModeCode: "monthly_base_limit",
          baseLimitAmount: 25000,
          thresholdBasisCode: "employer_contribution_base",
          periodCode: "month",
          currencyCode: "SEK"
        },
        reducedComponents: [{
          componentCode: "vaxa_reduced_band",
          ratePercent: 10.21,
          baseLimitAmount: 25000,
          appliesToCode: "threshold_band",
          refundProcessCode: "tax_account_credit_2026"
        }],
        vaxaEligibilityProfile: {
          eligibilitySourceCode: "manual_review",
          supportWindowMonths: 24,
          supportEmployeeCountLimit: 2,
          supportMode: "tax_account_credit",
          refundProcessCode: "tax_account_credit_2026",
          deMinimisAidTracked: true
        },
        decisionSource: "support_review",
        decisionReference: "vaxa-2026-invalid-rate",
        evidenceRef: "evidence-vaxa-2026-invalid-rate",
        actorId: "payroll-agent-1"
      }),
    (error) => error?.code === "employer_contribution_decision_snapshot_full_rate_mismatch"
  );
  const vaxaDraft = payrollPlatform.createEmployerContributionDecisionSnapshot({
    companyId: COMPANY_ID,
    employmentId: vaxaEmployee.employment.employmentId,
    decisionType: "vaxa",
    ageBucket: "standard",
    legalBasisCode: "se_vaxa_2026_refund_credit",
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    fullRate: 31.42,
    thresholds: {
      thresholdModeCode: "monthly_base_limit",
      baseLimitAmount: 25000,
      thresholdBasisCode: "employer_contribution_base",
      periodCode: "month",
      currencyCode: "SEK"
    },
    reducedComponents: [{
      componentCode: "vaxa_reduced_band",
      ratePercent: 10.21,
      baseLimitAmount: 25000,
      appliesToCode: "threshold_band",
      refundProcessCode: "tax_account_credit_2026"
    }],
    vaxaEligibilityProfile: {
      eligibilitySourceCode: "manual_review",
      supportWindowMonths: 24,
      supportEmployeeCountLimit: 2,
      supportMode: "tax_account_credit",
      refundProcessCode: "tax_account_credit_2026",
      deMinimisAidTracked: true
    },
    decisionSource: "support_review",
    decisionReference: "vaxa-2026-001",
    evidenceRef: "evidence-vaxa-2026-001",
    actorId: "payroll-agent-1"
  });
  assert.equal(vaxaDraft.status, "draft");
  assert.equal(vaxaDraft.baseLimit, 25000);
  assert.equal(vaxaDraft.reducedRate, 10.21);
  assert.equal(vaxaDraft.thresholds.baseLimitAmount, 25000);
  assert.equal(vaxaDraft.reducedComponents[0].componentCode, "vaxa_reduced_band");
  assert.equal(vaxaDraft.vaxaEligibilityProfile.supportMode, "tax_account_credit");
  assert.equal(vaxaDraft.rulepackRef.rulepackId, "payroll-employer-contribution-se-2026.1");
  assert.throws(
    () =>
      payrollPlatform.approveEmployerContributionDecisionSnapshot({
        companyId: COMPANY_ID,
        employerContributionDecisionSnapshotId: vaxaDraft.employerContributionDecisionSnapshotId,
        actorId: "payroll-agent-1"
      }),
    (error) => error?.code === "employer_contribution_decision_snapshot_dual_review_required"
  );
  const vaxaApproved = payrollPlatform.approveEmployerContributionDecisionSnapshot({
    companyId: COMPANY_ID,
    employerContributionDecisionSnapshotId: vaxaDraft.employerContributionDecisionSnapshotId,
    actorId: "payroll-agent-2"
  });
  assert.equal(vaxaApproved.status, "approved");
  const vaxaRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [vaxaEmployee.employment.employmentId],
    actorId: "unit-test"
  });
  assert.equal(vaxaRun.payslips[0].totals.employerContributionPreviewAmount, 4123.5);
  assert.equal(vaxaRun.payslips[0].totals.employerContributionDecision.outputs.decisionType, "vaxa");
  assert.equal(vaxaRun.payslips[0].totals.employerContributionDecision.outputs.referenceFullContributionAmount, 9426);
  assert.equal(vaxaRun.payslips[0].totals.employerContributionDecision.outputs.taxAccountReliefAmount, 5302.5);
  assert.equal(vaxaRun.payslips[0].totals.employerContributionDecision.outputs.thresholds.baseLimitAmount, 25000);
  assert.equal(
    vaxaRun.payslips[0].totals.employerContributionDecision.outputs.reducedComponents[0].refundProcessCode,
    "tax_account_credit_2026"
  );
  assert.equal(vaxaRun.payslips[0].totals.employerContributionDecision.outputs.rulepackRef.rulepackId, "payroll-employer-contribution-se-2026.1");
  assert.equal(
    vaxaRun.payslips[0].totals.employerContributionDecision.outputs.taxAccountConsequence.creditAmount,
    5302.5
  );
  assert.equal(vaxaRun.payslips[0].totals.employerContributionDecision.rule_pack_id, "payroll-employer-contribution-se-2026.1");
  assert.equal(vaxaRun.payslips[0].totals.employerContributionDecision.rule_pack_checksum, "phase8-payroll-employer-contribution-se-2026-1");
});

test("Phase 5.5 emergency employer contribution overrides require rollback plan and time-box", () => {
  const fixedNow = new Date("2026-03-28T09:45:00Z");
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
    givenName: "Emil",
    familyName: "Emergencyavgift",
    monthlySalary: 30000,
    identityValue: "19900112-3331",
    dateOfBirth: "1991-02-03"
  });

  assert.throws(
    () =>
      payrollPlatform.createEmployerContributionDecisionSnapshot({
        companyId: COMPANY_ID,
        employmentId: employee.employment.employmentId,
        decisionType: "emergency_manual",
        ageBucket: "standard",
        legalBasisCode: "manual_emergency_override",
        validFrom: "2026-03-01",
        validTo: "2026-12-31",
        fullRate: 31.42,
        decisionSource: "manual_emergency_override",
        decisionReference: "emergency-contribution-missing-window",
        evidenceRef: "evidence-emergency-contribution-missing-window",
        reasonCode: "provider_gap",
        rollbackPlanRef: "rollback-plan-contribution-emergency-202603",
        actorId: "payroll-agent-1"
      }),
    (error) => error?.code === "employer_contribution_decision_snapshot_override_ends_on_required"
  );

  const emergencyDraft = payrollPlatform.createEmployerContributionDecisionSnapshot({
    companyId: COMPANY_ID,
    employmentId: employee.employment.employmentId,
    decisionType: "emergency_manual",
    ageBucket: "standard",
    legalBasisCode: "manual_emergency_override",
    validFrom: "2026-03-01",
    validTo: "2026-12-31",
    overrideEndsOn: "2026-03-31",
    fullRate: 31.42,
    decisionSource: "manual_emergency_override",
    decisionReference: "emergency-contribution-2026-001",
    evidenceRef: "evidence-emergency-contribution-2026-001",
    reasonCode: "provider_gap",
    rollbackPlanRef: "rollback-plan-contribution-emergency-202603",
    actorId: "payroll-agent-1"
  });
  assert.equal(emergencyDraft.status, "draft");
  assert.equal(emergencyDraft.overrideEndsOn, "2026-03-31");
  assert.equal(emergencyDraft.rollbackPlanRef, "rollback-plan-contribution-emergency-202603");

  assert.throws(
    () =>
      payrollPlatform.approveEmployerContributionDecisionSnapshot({
        companyId: COMPANY_ID,
        employerContributionDecisionSnapshotId: emergencyDraft.employerContributionDecisionSnapshotId,
        actorId: "payroll-agent-1"
      }),
    (error) => error?.code === "employer_contribution_decision_snapshot_dual_review_required"
  );

  const emergencyApproved = payrollPlatform.approveEmployerContributionDecisionSnapshot({
    companyId: COMPANY_ID,
    employerContributionDecisionSnapshotId: emergencyDraft.employerContributionDecisionSnapshotId,
    actorId: "payroll-agent-2"
  });
  assert.equal(emergencyApproved.status, "approved");
  assert.equal(emergencyApproved.overrideEndsOn, "2026-03-31");
  assert.equal(emergencyApproved.rollbackPlanRef, "rollback-plan-contribution-emergency-202603");
});

function createMonthlyEmployee({ hrPlatform, givenName, familyName, monthlySalary, identityValue, dateOfBirth }) {
  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName,
    familyName,
    identityType: "personnummer",
    identityValue,
    dateOfBirth,
    workEmail: `${givenName.toLowerCase()}.${familyName.toLowerCase()}@example.com`,
    actorId: "unit-test"
  });
  const employment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Employer contribution tester",
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
    bankName: "Payroll Contribution Bank",
    primaryAccount: true,
    actorId: "unit-test"
  });
  return {
    employee,
    employment
  };
}
