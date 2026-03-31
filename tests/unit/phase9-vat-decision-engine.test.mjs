import test from "node:test";
import assert from "node:assert/strict";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";
import { createVatEngine } from "../../packages/domain-vat/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const PROJECT_ID = "00000000-0000-4000-8000-000000000041";

test("Phase 9.3 materializes VAT declaration basis, resolves review blockers and enforces VAT period locks", () => {
  const clock = () => new Date("2026-03-28T10:00:00Z");
  const ledger = createLedgerPlatform({ clock });
  const vat = createVatEngine({ clock, ledgerPlatform: ledger });

  ledger.installLedgerCatalog({
    companyId: COMPANY_ID,
    chartTemplateId: "DSAM-2026",
    actorId: "user-1"
  });
  ledger.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "user-1"
  });

  const domesticSourceId = "phase9-3-unit-domestic";
  const domesticDecision = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_id: domesticSourceId,
      vat_code_candidate: "VAT_SE_DOMESTIC_25"
    })
  });

  const created = ledger.createJournalEntry({
    companyId: COMPANY_ID,
    journalDate: "2026-03-21",
    voucherSeriesCode: "B",
    sourceType: "AR_INVOICE",
    sourceId: domesticSourceId,
    idempotencyKey: domesticSourceId,
    actorId: "user-1",
    description: "Phase 9.3 domestic VAT evidence",
    lines: [
      { accountNumber: "1510", debitAmount: 1250 },
      { accountNumber: "3010", creditAmount: 1000 },
      { accountNumber: "2610", creditAmount: 250 }
    ]
  });
  ledger.validateJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "user-1"
  });
  ledger.postJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "user-1",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });

  const review = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_id: "phase9-3-unit-review",
      line_quantity: null
    })
  });
  assert.equal(review.vatDecision.status, "review_required");
  assert.equal(review.vatDecision.lifecycleStatus, "pending_review");

  const blockedBasis = vat.getVatDeclarationBasis({
    companyId: COMPANY_ID,
    fromDate: "2026-03-01",
    toDate: "2026-03-31"
  });
  assert.equal(blockedBasis.readyForDeclaration, false);
  assert.equal(blockedBasis.blockerCodes.includes("open_review_queue_items"), true);
  assert.equal(blockedBasis.ledgerComparison.matched, true);

  const resolved = vat.resolveVatReviewQueueItem({
    companyId: COMPANY_ID,
    vatReviewQueueItemId: review.reviewQueueItem.vatReviewQueueItemId,
    vatCode: "VAT_SE_DOMESTIC_25",
    resolutionCode: "manual_domestic_resolution",
    resolutionNote: "Verified from invoice facts",
    actorId: "user-1"
  });
  assert.equal(resolved.reviewQueueItem.status, "resolved");
  assert.equal(resolved.vatDecision.status, "decided");
  assert.equal(resolved.vatDecision.lifecycleStatus, "approved");
  assert.equal(resolved.vatDecision.outputs.reportingChannel, "regular_vat_return");

  const resolvedCreated = ledger.createJournalEntry({
    companyId: COMPANY_ID,
    journalDate: "2026-03-21",
    voucherSeriesCode: "B",
    sourceType: "AR_INVOICE",
    sourceId: "phase9-3-unit-review",
    idempotencyKey: "phase9-3-unit-review",
    actorId: "user-1",
    description: "Phase 9.3 resolved VAT evidence",
    lines: [
      { accountNumber: "1510", debitAmount: 1250 },
      { accountNumber: "3010", creditAmount: 1000 },
      { accountNumber: "2610", creditAmount: 250 }
    ]
  });
  ledger.validateJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: resolvedCreated.journalEntry.journalEntryId,
    actorId: "user-1"
  });
  ledger.postJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: resolvedCreated.journalEntry.journalEntryId,
    actorId: "user-1",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });

  const readyBasis = vat.getVatDeclarationBasis({
    companyId: COMPANY_ID,
    fromDate: "2026-03-01",
    toDate: "2026-03-31"
  });
  assert.equal(readyBasis.readyForLock, true);
  assert.deepEqual(readyBasis.blockerCodes, []);
  assert.equal(readyBasis.approvedDecisionCount, 2);
  assert.equal(readyBasis.decidedDecisionCount, 2);

  const lock = vat.lockVatPeriod({
    companyId: COMPANY_ID,
    fromDate: "2026-03-01",
    toDate: "2026-03-31",
    reasonCode: "vat_return_signoff",
    basisSnapshotHash: readyBasis.sourceSnapshotHash,
    actorId: "user-1"
  });
  assert.equal(lock.status, "locked");

  assert.throws(
    () =>
      vat.evaluateVatDecision({
        companyId: COMPANY_ID,
        actorId: "user-1",
        transactionLine: buildTransactionLine({
          source_id: "phase9-3-unit-locked",
          tax_date: "2026-03-22",
          invoice_date: "2026-03-22",
          delivery_date: "2026-03-22"
        })
      }),
    /locked/i
  );

  const unlocked = vat.unlockVatPeriod({
    companyId: COMPANY_ID,
    vatPeriodLockId: lock.vatPeriodLockId,
    reasonCode: "correction_required",
    actorId: "user-1"
  });
  assert.equal(unlocked.status, "unlocked");

  const afterUnlock = vat.evaluateVatDecision({
    companyId: COMPANY_ID,
    actorId: "user-1",
    transactionLine: buildTransactionLine({
      source_id: "phase9-3-unit-after-unlock",
      tax_date: "2026-03-22",
      invoice_date: "2026-03-22",
      delivery_date: "2026-03-22"
    })
  });
  assert.equal(afterUnlock.vatDecision.status, "decided");
  assert.equal(afterUnlock.vatDecision.lifecycleStatus, "approved");

  const declarationRun = vat.createVatDeclarationRun({
    companyId: COMPANY_ID,
    fromDate: "2026-03-01",
    toDate: "2026-03-31",
    signer: "finance-signer",
    actorId: "user-1"
  });
  const declaredDomestic = vat.getVatDecision({
    companyId: COMPANY_ID,
    vatDecisionId: domesticDecision.vatDecision.vatDecisionId
  });
  const declaredResolved = vat.getVatDecision({
    companyId: COMPANY_ID,
    vatDecisionId: resolved.vatDecision.vatDecisionId
  });
  assert.equal(declaredDomestic.lifecycleStatus, "declared");
  assert.equal(declaredResolved.lifecycleStatus, "declared");
  assert.equal(declaredDomestic.vatDeclarationRunIds.includes(declarationRun.vatDeclarationRunId), true);
  assert.equal(declaredResolved.vatDeclarationRunIds.includes(declarationRun.vatDeclarationRunId), true);
});

function buildTransactionLine(overrides = {}) {
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
    project_id: PROJECT_ID,
    source_type: "AR_INVOICE",
    source_id: "phase9-3-unit-default",
    ...overrides
  };
}
