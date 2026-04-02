import test from "node:test";
import assert from "node:assert/strict";
import { createOrgAuthPlatform } from "../../packages/domain-org-auth/src/index.mjs";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";
import { createEvidencePlatform } from "../../packages/domain-evidence/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 11.6 builds AGI employer totals, preserves specification numbers and records version evidence", () => {
  const fixedNow = new Date("2026-04-01T09:00:00Z");
  const orgAuthPlatform = createOrgAuthPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo"
  });
  const hrPlatform = createHrPlatform({ clock: () => fixedNow });
  const timePlatform = createTimePlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const evidencePlatform = createEvidencePlatform({
    clock: () => fixedNow
  });
  const payrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    orgAuthPlatform,
    hrPlatform,
    timePlatform,
    evidencePlatform
  });

  const standard = createMonthlyEmployee({
    hrPlatform,
    givenName: "Frida",
    familyName: "Fullavgift",
    monthlySalary: 30000,
    identityValue: "19920303-1118",
    dateOfBirth: "1992-03-03"
  });
  const older = createMonthlyEmployee({
    hrPlatform,
    givenName: "Algot",
    familyName: "Aldersavgift",
    monthlySalary: 30000,
    identityValue: "19590203-1110",
    dateOfBirth: "1959-02-03"
  });
  const vaxa = createMonthlyEmployee({
    hrPlatform,
    givenName: "Vera",
    familyName: "Vaxa",
    monthlySalary: 30000,
    identityValue: "19900112-3331",
    dateOfBirth: "1990-01-12"
  });

  const vaxaDraft = payrollPlatform.createEmployerContributionDecisionSnapshot({
    companyId: COMPANY_ID,
    employmentId: vaxa.employment.employmentId,
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
    decisionReference: "vaxa-2026-0116",
    evidenceRef: "evidence-vaxa-2026-0116",
    actorId: "payroll-agent-1"
  });
  payrollPlatform.approveEmployerContributionDecisionSnapshot({
    companyId: COMPANY_ID,
    employerContributionDecisionSnapshotId: vaxaDraft.employerContributionDecisionSnapshotId,
    actorId: "payroll-agent-2"
  });

  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const regularRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [standard.employment.employmentId, older.employment.employmentId, vaxa.employment.employmentId],
    taxDecisionSnapshots: [
      createTabellDecision(standard.employment.employmentId),
      createTabellDecision(older.employment.employmentId),
      createTabellDecision(vaxa.employment.employmentId)
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
  const draftEmployerTotals = draftSubmission.currentVersion.payloadJson.employerTotals;
  assert.equal(draftSubmission.currentVersion.evidenceBundleId != null, true);
  assert.equal(draftEmployerTotals.field487SummaArbetsgivaravgifterOchSlf, 21915);
  assert.equal(
    draftEmployerTotals.field497SummaSkatteavdrag,
    Math.trunc(
      draftSubmission.currentVersion.payloadJson.totals.preliminaryTaxAmount
        + draftSubmission.currentVersion.payloadJson.totals.sinkTaxAmount
        + draftSubmission.currentVersion.payloadJson.totals.aSinkTaxAmount
    )
  );
  assert.deepEqual(
    draftEmployerTotals.contributionBuckets.map((bucket) => ({
      ratePercent: bucket.ratePercent,
      roundedContributionAmount: bucket.roundedContributionAmount,
      usesVaxaGrossUp: bucket.usesVaxaGrossUp
    })),
    [
      {
        ratePercent: 31.42,
        roundedContributionAmount: 18852,
        usesVaxaGrossUp: true
      },
      {
        ratePercent: 10.21,
        roundedContributionAmount: 3063,
        usesVaxaGrossUp: false
      }
    ]
  );
  assert.equal(draftEmployerTotals.vaxaRefundExposureAmount, 5302.5);

  const initialSpecificationNumbers = new Map(
    draftSubmission.currentVersion.employees.map((employee) => [employee.employeeId, employee.payloadJson.specificationNumber])
  );
  assert.deepEqual(
    [...initialSpecificationNumbers.values()].sort((left, right) => left - right),
    [1, 2, 3]
  );

  const validatedSubmission = payrollPlatform.validateAgiSubmission({
    companyId: COMPANY_ID,
    agiSubmissionId: draftSubmission.agiSubmissionId
  });
  assert.equal(validatedSubmission.currentVersion.state, "validated");
  assert.equal(validatedSubmission.currentVersion.evidenceBundleId !== draftSubmission.currentVersion.evidenceBundleId, true);

  payrollPlatform.markAgiSubmissionReadyForSign({
    companyId: COMPANY_ID,
    agiSubmissionId: draftSubmission.agiSubmissionId,
    actorId: "unit-test"
  });
  payrollPlatform.submitAgiSubmission({
    companyId: COMPANY_ID,
    agiSubmissionId: draftSubmission.agiSubmissionId,
    actorId: "unit-test",
    simulatedOutcome: "accepted"
  });

  const correctionRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    runType: "correction",
    retroAdjustments: [
      {
        employmentId: vaxa.employment.employmentId,
        payItemCode: "CORRECTION",
        amount: 1800,
        originalPeriod: "202602",
        sourcePayRunId: regularRun.payRunId,
        sourceLineId: regularRun.lines.find((line) => line.employeeId === vaxa.employee.employeeId).payRunLineId,
        note: "Late vaxa correction."
      }
    ],
    taxDecisionSnapshots: [
      createTabellDecision(standard.employment.employmentId),
      createTabellDecision(older.employment.employmentId),
      createTabellDecision(vaxa.employment.employmentId)
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
    correctionReason: "Late vaxa payroll correction.",
    actorId: "unit-test"
  });
  assert.equal(correctionDraft.currentVersion.versionNo, 2);
  assert.deepEqual(correctionDraft.currentVersion.changedEmployeeIds, [vaxa.employee.employeeId]);
  assert.equal(correctionDraft.currentVersion.evidenceBundleId != null, true);
  assert.equal(
    correctionDraft.currentVersion.payloadJson.employerTotals.field487SummaArbetsgivaravgifterOchSlf,
    22480
  );
  const correctionSpecificationNumbers = new Map(
    correctionDraft.currentVersion.employees.map((employee) => [employee.employeeId, employee.payloadJson.specificationNumber])
  );
  assert.deepEqual(correctionSpecificationNumbers, initialSpecificationNumbers);
});

function createTabellDecision(employmentId) {
  return {
    employmentId,
    decisionType: "tabell",
    incomeYear: 2026,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    municipalityCode: "0180",
    tableCode: "34",
    columnCode: "1",
    decisionSource: "skatteverket_table_import",
    decisionReference: `tabell-34-kolumn-1-${employmentId}`,
    evidenceRef: `evidence-tax-table-${employmentId}`
  };
}

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
    jobTitle: "AGI hardening tester",
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
    bankName: "AGI Payroll Bank",
    primaryAccount: true,
    actorId: "unit-test"
  });
  return {
    employee,
    employment
  };
}
