import test from "node:test";
import assert from "node:assert/strict";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";
import { createIntegrationPlatform } from "../../packages/domain-integrations/src/index.mjs";
import { createVatEngine } from "../../packages/domain-vat/src/index.mjs";

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
    actorId: "phase5-3-unit",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });

  const reversal = ledger.reverseJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: posted.journalEntry.journalEntryId,
    actorId: "phase5-3-unit",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager",
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
    actorId: "phase5-3-unit",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });
  const correction = ledger.correctJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: correctedPosted.journalEntry.journalEntryId,
    actorId: "phase5-3-unit",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager",
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

test("Phase 5.4 VAT declaration and periodic statement artifacts pin rulepacks, baselines and decision snapshots", () => {
  const vat = createVatEngine({
    clock: () => new Date("2026-03-30T09:00:00Z")
  });

  vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "phase5-4-unit",
    transactionLine: buildVatTransactionLine({
      source_id: "phase5-4-domestic",
      vat_code_candidate: "VAT_SE_DOMESTIC_25",
      line_amount_ex_vat: 1000
    })
  });
  vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "phase5-4-unit",
    transactionLine: buildVatTransactionLine({
      source_id: "phase5-4-eu-service",
      buyer_country: "DE",
      buyer_type: "business",
      buyer_vat_no: "DE123456789",
      buyer_is_taxable_person: true,
      buyer_vat_number: "DE123456789",
      buyer_vat_number_status: "valid",
      goods_or_services: "services",
      vat_code_candidate: "VAT_SE_EU_SERVICES_B2B",
      line_amount_ex_vat: 450
    })
  });

  const basis = vat.getVatDeclarationBasis({
    companyId: COMPANY_ID,
    fromDate: "2026-03-01",
    toDate: "2026-03-31"
  });
  assert.deepEqual(
    basis.rulepackRefs.map((entry) => `${entry.rulepackCode}:${entry.rulepackVersion}`),
    ["SE-VAT-CORE:2026.3"]
  );
  assert.deepEqual(
    basis.providerBaselineRefs.map((entry) => entry.baselineCode),
    ["SE-SKATTEVERKET-VAT-API"]
  );
  assert.equal(basis.decisionSnapshotRefs.length, 2);

  const declarationRun = vat.createVatDeclarationRun({
    companyId: COMPANY_ID,
    fromDate: "2026-03-01",
    toDate: "2026-03-31",
    actorId: "phase5-4-unit",
    signer: "phase5-4-signer"
  });
  const declarationReplay = vat.createVatDeclarationRun({
    companyId: COMPANY_ID,
    fromDate: "2026-03-01",
    toDate: "2026-03-31",
    actorId: "phase5-4-unit",
    signer: "phase5-4-signer",
    previousSubmissionId: declarationRun.vatDeclarationRunId,
    correctionReason: "pinning_replay"
  });
  assert.deepEqual(declarationReplay.rulepackRefs, declarationRun.rulepackRefs);
  assert.deepEqual(declarationReplay.providerBaselineRefs, declarationRun.providerBaselineRefs);
  assert.deepEqual(declarationReplay.decisionSnapshotRefs, declarationRun.decisionSnapshotRefs);

  const periodicRun = vat.createVatPeriodicStatementRun({
    companyId: COMPANY_ID,
    fromDate: "2026-03-01",
    toDate: "2026-03-31",
    actorId: "phase5-4-unit"
  });
  const periodicReplay = vat.createVatPeriodicStatementRun({
    companyId: COMPANY_ID,
    fromDate: "2026-03-01",
    toDate: "2026-03-31",
    actorId: "phase5-4-unit",
    previousSubmissionId: periodicRun.vatPeriodicStatementRunId,
    correctionReason: "pinning_replay"
  });
  assert.deepEqual(periodicReplay.rulepackRefs, periodicRun.rulepackRefs);
  assert.deepEqual(periodicReplay.providerBaselineRefs, periodicRun.providerBaselineRefs);
  assert.deepEqual(periodicReplay.decisionSnapshotRefs, periodicRun.decisionSnapshotRefs);
});

function buildVatTransactionLine(overrides = {}) {
  return {
    seller_country: "SE",
    seller_vat_registration_country: "SE",
    buyer_country: "SE",
    buyer_type: "business",
    buyer_vat_no: "SE556677889901",
    buyer_is_taxable_person: true,
    buyer_vat_number: "SE556677889901",
    buyer_vat_number_status: "valid",
    supply_type: "sale",
    goods_or_services: "goods",
    supply_subtype: "standard",
    property_related_flag: false,
    construction_service_flag: false,
    transport_end_country: "SE",
    import_flag: false,
    export_flag: false,
    reverse_charge_flag: false,
    oss_flag: false,
    ioss_flag: false,
    currency: "SEK",
    tax_date: "2026-03-21",
    invoice_date: "2026-03-21",
    delivery_date: "2026-03-21",
    prepayment_date: "2026-03-21",
    line_amount_ex_vat: 1000,
    line_discount: 0,
    line_quantity: 1,
    line_uom: "ea",
    vat_rate: 25,
    tax_rate_candidate: 25,
    vat_code_candidate: "VAT_SE_DOMESTIC_25",
    exemption_reason: "not_applicable",
    invoice_text_code: "domestic_standard",
    report_box_code: "05",
    source_type: "AR_INVOICE",
    source_id: "phase5-4-default",
    ...overrides
  };
}
