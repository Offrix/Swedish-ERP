import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 15.1 materializes payroll, tax-account and submission reporting snapshots from real domain runtime", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-28T09:00:00Z")
  });
  await seedPhase15Reporting(platform);

  const metricDefinitions = platform.listMetricDefinitions({ companyId: COMPANY_ID });
  assert.equal(metricDefinitions.some((metric) => metric.metricCode === "payroll_gross_earnings_amount"), true);
  assert.equal(metricDefinitions.some((metric) => metric.metricCode === "tax_account_net_balance_amount"), true);
  assert.equal(metricDefinitions.some((metric) => metric.metricCode === "submission_total_count"), true);

  const definitions = platform.listReportDefinitions({ companyId: COMPANY_ID });
  assert.equal(definitions.some((definition) => definition.reportCode === "payroll_summary"), true);
  assert.equal(definitions.some((definition) => definition.reportCode === "tax_account_summary"), true);
  assert.equal(definitions.some((definition) => definition.reportCode === "submission_dashboard"), true);

  const payrollSnapshot = platform.runReportSnapshot({
    companyId: COMPANY_ID,
    reportCode: "payroll_summary",
    fromDate: "2026-03-01",
    toDate: "2026-03-31",
    viewMode: "period",
    actorId: "phase15-unit"
  });
  const taxAccountSnapshot = platform.runReportSnapshot({
    companyId: COMPANY_ID,
    reportCode: "tax_account_summary",
    fromDate: "2026-03-01",
    toDate: "2026-03-31",
    viewMode: "period",
    actorId: "phase15-unit"
  });
  const submissionSnapshot = platform.runReportSnapshot({
    companyId: COMPANY_ID,
    reportCode: "submission_dashboard",
    fromDate: "2026-03-01",
    toDate: "2026-03-31",
    viewMode: "period",
    actorId: "phase15-unit"
  });

  assert.equal(payrollSnapshot.lines.length, 1);
  assert.equal(payrollSnapshot.lines[0].metricValues.payroll_run_count, 1);
  assert.equal(payrollSnapshot.lines[0].metricValues.payroll_agi_submission_count, 1);
  assert.equal(payrollSnapshot.lines[0].metricValues.payroll_exception_count, 1);
  assert.equal(payrollSnapshot.lines[0].metricValues.payroll_gross_earnings_amount > 0, true);
  assert.equal(payrollSnapshot.lines[0].metricValues.payroll_vacation_liability_amount > 0, true);

  assert.equal(taxAccountSnapshot.lines.length, 1);
  assert.equal(taxAccountSnapshot.lines[0].metricValues.tax_account_event_count, 2);
  assert.equal(taxAccountSnapshot.lines[0].metricValues.tax_account_import_batch_count, 1);
  assert.equal(taxAccountSnapshot.lines[0].metricValues.tax_account_open_difference_case_count, 1);

  assert.equal(submissionSnapshot.lines.length, 2);
  assert.equal(submissionSnapshot.lines.some((line) => line.metricValues.submission_accepted_count > 0), true);
  assert.equal(submissionSnapshot.lines.some((line) => line.metricValues.submission_failed_count > 0), true);
  assert.equal(submissionSnapshot.totals.metricTotals.submission_total_count, 2);
});

async function seedPhase15Reporting(platform) {
  platform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "phase15-unit"
  });
  platform.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "phase15-unit"
  });
  platform.createBankAccount({
    companyId: COMPANY_ID,
    bankName: "Phase15 Payroll Bank",
    ledgerAccountNumber: "1110",
    clearingNumber: "5000",
    accountNumber: "5566778899",
    isDefault: true,
    actorId: "phase15-unit"
  });

  const employee = createHourlyEmployee(platform);
  platform.upsertEmploymentStatutoryProfile({
    companyId: COMPANY_ID,
    employmentId: employee.employment.employmentId,
    taxMode: "manual_rate",
    manualRateReasonCode: "emergency_manual_transition",
    taxRatePercent: 30,
    contributionClassCode: "full",
    actorId: "phase15-unit"
  });
  platform.createTimeEntry({
    companyId: COMPANY_ID,
    employmentId: employee.employment.employmentId,
    workDate: "2026-03-18",
    workedMinutes: 480,
    projectId: "project-demo-alpha",
    actorId: "phase15-unit"
  });

  const payCalendar = platform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const payRun = platform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [employee.employment.employmentId],
    manualInputs: [
      {
        employmentId: employee.employment.employmentId,
        payItemCode: "BONUS",
        amount: 1200,
        processingStep: 4,
        dimensionJson: {
          projectId: "project-demo-alpha"
        }
      }
    ],
    actorId: "phase15-unit"
  });
  platform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: payRun.payRunId,
    actorId: "phase15-unit"
  });
  platform.createAgiSubmission({
    companyId: COMPANY_ID,
    reportingPeriod: "202603",
    actorId: "phase15-unit"
  });
  platform.createVacationLiabilitySnapshot({
    companyId: COMPANY_ID,
    reportingPeriod: "202603",
    actorId: "phase15-unit"
  });

  platform.registerExpectedTaxLiability({
    companyId: COMPANY_ID,
    liabilityTypeCode: "VAT",
    sourceDomainCode: "VAT",
    sourceObjectType: "vat_declaration_run",
    sourceObjectId: "vat_run_phase15_2026_03",
    sourceReference: "VAT-PHASE15-2026-03",
    periodKey: "2026-03",
    dueDate: "2026-03-12",
    amount: 9300,
    actorId: "phase15-unit"
  });
  platform.importTaxAccountEvents({
    companyId: COMPANY_ID,
    importSource: "SKV_CSV",
    statementDate: "2026-03-28",
    events: [
      {
        eventTypeCode: "VAT_ASSESSMENT",
        eventDate: "2026-03-12",
        postingDate: "2026-03-12",
        amount: 9300,
        externalReference: "SKV-VAT-PHASE15",
        periodKey: "2026-03"
      },
      {
        eventTypeCode: "FEE",
        eventDate: "2026-03-13",
        postingDate: "2026-03-13",
        amount: 500,
        externalReference: "SKV-FEE-PHASE15"
      }
    ],
    actorId: "phase15-unit"
  });
  platform.createTaxAccountReconciliation({
    companyId: COMPANY_ID,
    actorId: "phase15-unit"
  });

  let submission = platform.prepareAuthoritySubmission({
    companyId: COMPANY_ID,
    submissionType: "agi_monthly",
    sourceObjectType: "agi_submission_period",
    sourceObjectId: "agi-period-2026-03",
    payloadVersion: "phase15.1",
    providerKey: "skatteverket",
    recipientId: "skatteverket:agi",
    payload: {
      sourceObjectVersion: "agi-period-2026-03:v1"
    },
    actorId: "phase15-unit",
    signedState: "not_required"
  });
  platform.executeAuthoritySubmissionTransport({
    companyId: COMPANY_ID,
    submissionId: submission.submissionId,
    actorId: "phase15-unit",
    mode: "trial"
  });
  submission = platform.prepareAuthoritySubmission({
    companyId: COMPANY_ID,
    submissionType: "vat_declaration",
    sourceObjectType: "vat_return",
    sourceObjectId: "vat-return-2026-03",
    payloadVersion: "phase15.1-vat",
    providerKey: "skatteverket",
    recipientId: "skatteverket:vat",
    payload: {
      sourceObjectVersion: "vat-return-2026-03:v1"
    },
    actorId: "phase15-unit",
    signedState: "not_required"
  });
  platform.executeAuthoritySubmissionTransport({
    companyId: COMPANY_ID,
    submissionId: submission.submissionId,
    actorId: "phase15-unit",
    mode: "test",
    transportScenarioCode: "transport_failed"
  });
}

function createHourlyEmployee(platform) {
  const employee = platform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Petra",
    familyName: "Report",
    identityType: "personnummer",
    identityValue: "19800112-1238",
    workEmail: "petra.report@example.com",
    actorId: "phase15-unit"
  });
  const employment = platform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Consultant",
    payModelCode: "hourly_salary",
    startDate: "2025-01-01",
    actorId: "phase15-unit"
  });
  platform.addEmploymentContract({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    validFrom: "2025-01-01",
    salaryModelCode: "hourly_salary",
    hourlyRate: 200,
    currencyCode: "SEK",
    actorId: "phase15-unit"
  });
  platform.addEmployeeBankAccount({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    payoutMethod: "domestic_account",
    accountHolderName: "Petra Report",
    clearingNumber: "5000",
    accountNumber: "1234567890",
    bankName: "Payroll Employee Bank",
    primaryAccount: true,
    actorId: "phase15-unit"
  });
  return {
    employee,
    employment
  };
}
