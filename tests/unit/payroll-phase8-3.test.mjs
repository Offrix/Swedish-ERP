import test from "node:test";
import assert from "node:assert/strict";
import { createOrgAuthPlatform } from "../../packages/domain-org-auth/src/index.mjs";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";
import { createBankingPlatform } from "../../packages/domain-banking/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";
import { createProviderBaselineRegistry } from "../../packages/rule-engine/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 8.3 payroll posting preserves dimensions, exports payouts and reproduces vacation liability snapshots", () => {
  const fixedNow = new Date("2026-03-22T09:00:00Z");
  const orgAuthPlatform = createOrgAuthPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo"
  });
  const hrPlatform = createHrPlatform({ clock: () => fixedNow });
  const timePlatform = createTimePlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const ledgerPlatform = createLedgerPlatform({
    clock: () => fixedNow
  });
  ledgerPlatform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "unit-test"
  });
  ledgerPlatform.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "unit-test"
  });
  const bankingPlatform = createBankingPlatform({
    clock: () => fixedNow
  });
  const payrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    orgAuthPlatform,
    hrPlatform,
    timePlatform,
    ledgerPlatform,
    bankingPlatform
  });

  bankingPlatform.createBankAccount({
    companyId: COMPANY_ID,
    bankName: "Payroll House Bank",
    ledgerAccountNumber: "1110",
    clearingNumber: "5000",
    accountNumber: "5566778899",
    isDefault: true,
    actorId: "unit-test"
  });

  const employee = createHourlyEmployee({
    hrPlatform,
    givenName: "Lina",
    familyName: "Ledger",
    identityValue: "19800112-1238",
    hourlyRate: 200
  });

  payrollPlatform.upsertEmploymentStatutoryProfile({
    companyId: COMPANY_ID,
    employmentId: employee.employment.employmentId,
    taxMode: "manual_rate",
    manualRateReasonCode: "emergency_manual_transition",
    taxRatePercent: 30,
    contributionClassCode: "full",
    actorId: "unit-test"
  });

  timePlatform.createTimeEntry({
    companyId: COMPANY_ID,
    employmentId: employee.employment.employmentId,
    workDate: "2026-03-18",
    workedMinutes: 480,
    projectId: "project-demo-alpha",
    actorId: "unit-test"
  });

  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const run = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [employee.employment.employmentId],
    manualInputs: [
      {
        employmentId: employee.employment.employmentId,
        payItemCode: "BONUS",
        amount: 1500,
        processingStep: 4,
        dimensionJson: {
          projectId: "project-demo-beta",
          costCenterCode: "CC-200",
          businessAreaCode: "BA-FIELD"
        }
      }
    ],
    actorId: "unit-test"
  });

  assert.equal(run.calculationSteps.find((step) => step.stepNo === 17)?.status, "completed");
  assert.equal(run.calculationSteps.find((step) => step.stepNo === 18)?.status, "completed");
  assert.deepEqual(
    run.rulepackRefs.map((entry) => entry.rulepackCode).sort(),
    ["SE-EMPLOYER-CONTRIBUTIONS", "SE-PAYROLL-TAX"]
  );
  assert.deepEqual(
    run.providerBaselineRefs.map((entry) => entry.baselineCode),
    ["SE-SKATTEVERKET-AGI-API"]
  );
  assert.equal(typeof run.providerBaselineRefs[0].providerBaselineId, "string");
  assert.equal(typeof run.providerBaselineRefs[0].providerBaselineVersion, "string");
  assert.equal(typeof run.providerBaselineRefs[0].providerBaselineChecksum, "string");
  assert.equal(run.decisionSnapshotRefs.length >= 2, true);
  assert.equal(typeof run.payrollInputSnapshotId, "string");
  assert.equal(typeof run.payrollInputFingerprint, "string");
  assert.equal(typeof run.payRunFingerprint, "string");
  assert.equal(run.payrollInputSnapshot?.payrollInputSnapshotId, run.payrollInputSnapshotId);
  assert.equal(run.payrollInputSnapshot?.inputFingerprint, run.payrollInputFingerprint);
  assert.equal(run.payrollInputSnapshot?.sourceSnapshotHash, run.sourceSnapshotHash);

  payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: run.payRunId,
    actorId: "unit-test"
  });

  const posting = payrollPlatform.createPayrollPosting({
    companyId: COMPANY_ID,
    payRunId: run.payRunId,
    actorId: "unit-test"
  });
  const salaryLine = posting.journalLines.find((line) => line.accountNumber === "7020");
  const bonusLine = posting.journalLines.find((line) => line.accountNumber === "7060");
  assert.deepEqual(salaryLine.dimensionJson, { projectId: "project-demo-alpha" });
  assert.deepEqual(bonusLine.dimensionJson, {
    projectId: "project-demo-beta",
    costCenterCode: "CC-200",
    businessAreaCode: "BA-FIELD"
  });
  assert.deepEqual(
    posting.rulepackRefs.map((entry) => entry.rulepackCode).sort(),
    ["SE-EMPLOYER-CONTRIBUTIONS", "SE-PAYROLL-TAX"]
  );
  assert.deepEqual(
    posting.providerBaselineRefs.map((entry) => entry.baselineCode),
    ["SE-SKATTEVERKET-AGI-API"]
  );
  assert.equal(posting.decisionSnapshotRefs.length >= 2, true);
  assert.equal(posting.payrollInputSnapshotId, run.payrollInputSnapshotId);
  assert.equal(posting.payrollInputFingerprint, run.payrollInputFingerprint);
  assert.equal(posting.payRunFingerprint, run.payRunFingerprint);
  const postingJournal = ledgerPlatform.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: posting.journalEntryId
  });
  assert.deepEqual(
    postingJournal.metadataJson.rulepackRefs.map((entry) => entry.rulepackCode).sort(),
    ["SE-EMPLOYER-CONTRIBUTIONS", "SE-PAYROLL-TAX"]
  );
  assert.equal(postingJournal.metadataJson.postingRecipeCode, "PAYROLL_RUN");
  assert.equal(postingJournal.metadataJson.journalType, "payroll_posting");
  assert.equal(postingJournal.metadataJson.sourceObjectVersion, posting.payloadHash);
  assert.equal(postingJournal.metadataJson.payrollInputSnapshotId, run.payrollInputSnapshotId);
  assert.equal(postingJournal.metadataJson.payRunFingerprint, run.payRunFingerprint);

  const payoutBatch = payrollPlatform.createPayrollPayoutBatch({
    companyId: COMPANY_ID,
    payRunId: run.payRunId,
    actorId: "unit-test"
  });
  assert.match(payoutBatch.exportPayload, /5000:1234567890/);
  assert.deepEqual(
    payoutBatch.providerBaselineRefs.map((entry) => entry.baselineCode),
    ["SE-SKATTEVERKET-AGI-API"]
  );
  assert.equal(payoutBatch.decisionSnapshotRefs.length >= 2, true);
  assert.equal(payoutBatch.payrollInputSnapshotId, run.payrollInputSnapshotId);
  assert.equal(payoutBatch.payRunFingerprint, run.payRunFingerprint);

  const matchedBatch = payrollPlatform.matchPayrollPayoutBatch({
    companyId: COMPANY_ID,
    payrollPayoutBatchId: payoutBatch.payrollPayoutBatchId,
    bankEventId: "bank-unit-payroll-202603",
    actorId: "unit-test"
  });
  assert.equal(matchedBatch.status, "matched");
  assert.ok(matchedBatch.matchedJournalEntryId);
  const payoutMatchJournal = ledgerPlatform.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: matchedBatch.matchedJournalEntryId
  });
  assert.deepEqual(
    payoutMatchJournal.metadataJson.rulepackRefs.map((entry) => entry.rulepackCode).sort(),
    ["SE-EMPLOYER-CONTRIBUTIONS", "SE-PAYROLL-TAX"]
  );
  assert.equal(payoutMatchJournal.metadataJson.postingRecipeCode, "PAYROLL_PAYOUT_MATCH");
  assert.equal(payoutMatchJournal.metadataJson.journalType, "settlement_posting");
  assert.equal(typeof payoutMatchJournal.metadataJson.sourceObjectVersion, "string");
  assert.equal(payoutMatchJournal.metadataJson.payrollInputSnapshotId, run.payrollInputSnapshotId);
  assert.equal(payoutMatchJournal.metadataJson.payRunFingerprint, run.payRunFingerprint);

  const agiSubmission = payrollPlatform.createAgiSubmission({
    companyId: COMPANY_ID,
    reportingPeriod: "202603",
    actorId: "unit-test"
  });
  assert.deepEqual(
    agiSubmission.currentVersion.rulepackRefs.map((entry) => entry.rulepackCode).sort(),
    ["SE-EMPLOYER-CONTRIBUTIONS", "SE-PAYROLL-TAX"]
  );
  assert.deepEqual(
    agiSubmission.currentVersion.providerBaselineRefs.map((entry) => entry.baselineCode),
    ["SE-SKATTEVERKET-AGI-API"]
  );
  assert.equal(typeof agiSubmission.currentVersion.providerBaselineRefs[0].providerBaselineId, "string");
  assert.equal(typeof agiSubmission.currentVersion.providerBaselineRefs[0].providerBaselineVersion, "string");
  assert.equal(typeof agiSubmission.currentVersion.providerBaselineRefs[0].providerBaselineChecksum, "string");
  assert.equal(agiSubmission.currentVersion.decisionSnapshotRefs.length >= 2, true);
  assert.equal(agiSubmission.currentVersion.payloadJson.payrollInputSnapshotRefs[0].payrollInputSnapshotId, run.payrollInputSnapshotId);
  assert.equal(agiSubmission.currentVersion.payloadJson.payrollInputSnapshotRefs[0].payRunFingerprint, run.payRunFingerprint);

  const snapshot = payrollPlatform.createVacationLiabilitySnapshot({
    companyId: COMPANY_ID,
    reportingPeriod: "202603",
    actorId: "unit-test"
  });
  const repeatedSnapshot = payrollPlatform.createVacationLiabilitySnapshot({
    companyId: COMPANY_ID,
    reportingPeriod: "202603",
    actorId: "unit-test"
  });
  assert.equal(repeatedSnapshot.vacationLiabilitySnapshotId, snapshot.vacationLiabilitySnapshotId);
  assert.equal(snapshot.totals.liabilityAmount > 0, true);
});

test("Phase 5.4 payroll calculation fails if AGI provider baseline pinning is unavailable", () => {
  const fixedNow = new Date("2026-03-22T09:00:00Z");
  const orgAuthPlatform = createOrgAuthPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo"
  });
  const hrPlatform = createHrPlatform({ clock: () => fixedNow });
  const timePlatform = createTimePlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const ledgerPlatform = createLedgerPlatform({
    clock: () => fixedNow
  });
  ledgerPlatform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "unit-test"
  });
  ledgerPlatform.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "unit-test"
  });
  const bankingPlatform = createBankingPlatform({
    clock: () => fixedNow
  });
  const payrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    orgAuthPlatform,
    hrPlatform,
    timePlatform,
    ledgerPlatform,
    bankingPlatform,
    providerBaselineRegistry: createProviderBaselineRegistry({
      clock: () => fixedNow,
      seedProviderBaselines: []
    })
  });

  createHourlyEmployee({
    hrPlatform,
    givenName: "Pia",
    familyName: "Pinned",
    identityValue: "19800112-1238",
    hourlyRate: 200
  });

  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  assert.throws(
    () =>
      payrollPlatform.createPayRun({
        companyId: COMPANY_ID,
        payCalendarId: payCalendar.payCalendarId,
        reportingPeriod: "202603",
        actorId: "unit-test"
      }),
    (error) => error?.code === "payroll_provider_baseline_missing"
  );
});

function createHourlyEmployee({ hrPlatform, givenName, familyName, identityValue, hourlyRate }) {
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
    jobTitle: "Payroll consultant",
    payModelCode: "hourly_salary",
    startDate: "2025-01-01",
    actorId: "unit-test"
  });
  hrPlatform.addEmploymentContract({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    validFrom: "2025-01-01",
    salaryModelCode: "hourly_salary",
    hourlyRate,
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
    bankName: "Payroll Employee Bank",
    primaryAccount: true,
    actorId: "unit-test"
  });
  return {
    employee,
    employment
  };
}
