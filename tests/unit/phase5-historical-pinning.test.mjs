import test from "node:test";
import assert from "node:assert/strict";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";
import { createIntegrationPlatform } from "../../packages/domain-integrations/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 5.3 ledger reversals and corrections preserve normalized pinning metadata", () => {
  const ledger = createLedgerPlatform({
    clock: () => new Date("2026-03-27T09:00:00Z")
  });
  ledger.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "phase5-3-unit"
  });
  ledger.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "phase5-3-unit"
  });

  const metadataJson = {
    pipelineStage: "phase5_historical_pinning_test",
    rulepackRefs: [
      {
        rulepackId: "rulepack-payroll-tax-2026",
        rulepackCode: "SE-PAYROLL-TAX",
        rulepackVersion: "2026.1",
        rulepackChecksum: "rulepack-payroll-tax-2026"
      }
    ],
    providerBaselineRefs: [
      {
        providerBaselineId: "annual-json-baseline-2026",
        providerCode: "skatteverket-json-support",
        baselineCode: "SE-ANNUAL-DECLARATION-JSON",
        providerBaselineVersion: "2026.1",
        providerBaselineChecksum: "annual-json-baseline-2026"
      }
    ],
    decisionSnapshotRefs: [
      {
        decisionSnapshotId: "decision-snapshot-1",
        snapshotTypeCode: "payroll_tax_decision",
        sourceDomain: "payroll",
        sourceObjectId: "pay-run-1",
        sourceObjectVersion: "source-hash-1",
        decisionHash: "decision-hash-1",
        rulepackCode: "SE-PAYROLL-TAX",
        rulepackVersion: "2026.1"
      }
    ]
  };

  const created = ledger.createJournalEntry({
    companyId: COMPANY_ID,
    journalDate: "2026-03-27",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "phase5-3-original",
    actorId: "phase5-3-unit",
    idempotencyKey: "phase5-3-original",
    metadataJson,
    lines: [
      { accountNumber: "1110", debitAmount: 1000, creditAmount: 0, dimensionJson: {} },
      { accountNumber: "3010", debitAmount: 0, creditAmount: 1000, dimensionJson: {} }
    ]
  });
  ledger.validateJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase5-3-unit"
  });
  const posted = ledger.postJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase5-3-unit"
  });

  const reversal = ledger.reverseJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: posted.journalEntry.journalEntryId,
    actorId: "phase5-3-unit",
    reasonCode: "test_reversal",
    correctionKey: "phase5-3-reversal"
  });
  assert.deepEqual(
    reversal.reversalJournalEntry.metadataJson.rulepackRefs.map((entry) => entry.rulepackCode),
    ["SE-PAYROLL-TAX"]
  );
  assert.deepEqual(
    reversal.reversalJournalEntry.metadataJson.providerBaselineRefs.map((entry) => entry.baselineCode),
    ["SE-ANNUAL-DECLARATION-JSON"]
  );
  assert.deepEqual(
    reversal.reversalJournalEntry.metadataJson.decisionSnapshotRefs.map((entry) => entry.snapshotTypeCode),
    ["payroll_tax_decision"]
  );

  const correctedSource = ledger.createJournalEntry({
    companyId: COMPANY_ID,
    journalDate: "2026-03-27",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "phase5-3-correction-source",
    actorId: "phase5-3-unit",
    idempotencyKey: "phase5-3-correction-source",
    metadataJson,
    lines: [
      { accountNumber: "1510", debitAmount: 2000, creditAmount: 0, dimensionJson: {} },
      { accountNumber: "3010", debitAmount: 0, creditAmount: 2000, dimensionJson: {} }
    ]
  });
  ledger.validateJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: correctedSource.journalEntry.journalEntryId,
    actorId: "phase5-3-unit"
  });
  const correctedPosted = ledger.postJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: correctedSource.journalEntry.journalEntryId,
    actorId: "phase5-3-unit"
  });
  const correction = ledger.correctJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: correctedPosted.journalEntry.journalEntryId,
    actorId: "phase5-3-unit",
    reasonCode: "test_correction",
    correctionKey: "phase5-3-correction",
    lines: [
      { accountNumber: "1510", debitAmount: 2500, creditAmount: 0, dimensionJson: {} },
      { accountNumber: "3010", debitAmount: 0, creditAmount: 2500, dimensionJson: {} }
    ]
  });
  assert.deepEqual(
    correction.correctedJournalEntry.metadataJson.rulepackRefs.map((entry) => entry.rulepackCode),
    ["SE-PAYROLL-TAX"]
  );
  assert.deepEqual(
    correction.correctedJournalEntry.metadataJson.providerBaselineRefs.map((entry) => entry.baselineCode),
    ["SE-ANNUAL-DECLARATION-JSON"]
  );
  assert.deepEqual(
    correction.correctedJournalEntry.metadataJson.decisionSnapshotRefs.map((entry) => entry.snapshotTypeCode),
    ["payroll_tax_decision"]
  );
});

test("Phase 5.3 regulated submission retry and correction preserve pinning refs", async () => {
  const integrations = createIntegrationPlatform({
    clock: () => new Date("2026-03-27T10:00:00Z")
  });

  let submission = integrations.prepareAuthoritySubmission({
    companyId: COMPANY_ID,
    submissionType: "income_tax_return",
    sourceObjectType: "tax_declaration_package",
    sourceObjectId: "tax-package-phase5-3",
    sourceObjectVersion: "v1",
    payloadVersion: "phase5-3",
    providerKey: "skatteverket",
    recipientId: "skatteverket:income-tax",
    signedState: "not_required",
    payload: {
      exportCode: "ink2_support_json",
      checksum: "phase5-3-underlag-v1",
      sourceObjectVersion: "v1"
    },
    rulepackRefs: [
      {
        rulepackId: "annual-rulepack-2026",
        rulepackCode: "RP-ANNUAL-FILING-SE",
        rulepackVersion: "2026.1",
        rulepackChecksum: "annual-rulepack-2026"
      }
    ],
    providerBaselineRefs: [
      {
        providerBaselineId: "annual-json-baseline-2026",
        providerCode: "skatteverket-json-support",
        baselineCode: "SE-ANNUAL-DECLARATION-JSON",
        providerBaselineVersion: "2026.1",
        providerBaselineChecksum: "annual-json-baseline-2026"
      }
    ],
    decisionSnapshotRefs: [
      {
        decisionSnapshotId: "phase5-3-decision-1",
        snapshotTypeCode: "annual_tax_decision",
        sourceDomain: "annual_reporting",
        sourceObjectId: "tax-package-phase5-3",
        sourceObjectVersion: "v1",
        decisionHash: "phase5-3-decision-1",
        rulepackCode: "RP-ANNUAL-FILING-SE",
        rulepackVersion: "2026.1"
      }
    ],
    actorId: "phase5-3-unit"
  });

  submission = await integrations.submitAuthoritySubmission({
    companyId: COMPANY_ID,
    submissionId: submission.submissionId,
    actorId: "phase5-3-unit",
    simulatedTransportOutcome: "transport_failed"
  });
  const retried = integrations.retryAuthoritySubmission({
    companyId: COMPANY_ID,
    submissionId: submission.submissionId,
    actorId: "phase5-3-unit"
  });
  assert.equal(retried.submission.rulepackRefs[0].rulepackCode, "RP-ANNUAL-FILING-SE");
  assert.equal(retried.submission.providerBaselineRefs[0].baselineCode, "SE-ANNUAL-DECLARATION-JSON");
  assert.equal(retried.submission.decisionSnapshotRefs[0].snapshotTypeCode, "annual_tax_decision");
  await integrations.submitAuthoritySubmission({
    companyId: COMPANY_ID,
    submissionId: retried.submission.submissionId,
    actorId: "phase5-3-unit",
    simulatedTransportOutcome: "technical_ack"
  });

  const correction = integrations.openSubmissionCorrection({
    companyId: COMPANY_ID,
    submissionId: retried.submission.submissionId,
    actorId: "phase5-3-unit",
    reasonCode: "phase5_3_test_correction",
    sourceObjectVersion: "v2",
    payloadVersion: "phase5-3-correction",
    payload: {
      exportCode: "ink2_support_json",
      checksum: "phase5-3-underlag-v2",
      sourceObjectVersion: "v2"
    },
    idempotencyKey: "phase5-3-correction"
  });
  assert.equal(correction.submission.rulepackRefs[0].rulepackCode, "RP-ANNUAL-FILING-SE");
  assert.equal(correction.submission.providerBaselineRefs[0].baselineCode, "SE-ANNUAL-DECLARATION-JSON");
  assert.equal(correction.submission.decisionSnapshotRefs[0].snapshotTypeCode, "annual_tax_decision");

  const evidencePack = integrations.getSubmissionEvidencePack({
    companyId: COMPANY_ID,
    submissionId: correction.submission.submissionId
  });
  assert.equal(evidencePack.rulepackRefs[0].rulepackCode, "RP-ANNUAL-FILING-SE");
  assert.equal(evidencePack.providerBaselineRefs[0].baselineCode, "SE-ANNUAL-DECLARATION-JSON");
  assert.equal(evidencePack.decisionSnapshotRefs[0].snapshotTypeCode, "annual_tax_decision");
});
