import test from "node:test";
import assert from "node:assert/strict";
import { createHusPlatform } from "../../packages/domain-hus/src/index.mjs";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

function createHusWithLedger(clock) {
  const ledger = createLedgerPlatform({ clock });
  ledger.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "phase13-ledger-unit"
  });
  ledger.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "phase13-ledger-unit"
  });
  const hus = createHusPlatform({
    clock,
    ledgerPlatform: ledger
  });
  return { hus, ledger };
}

test("Phase 13.1 posts accepted HUS claims into the ledger with canonical recipe metadata", () => {
  const clock = () => new Date("2026-03-24T08:00:00Z");
  const { hus, ledger } = createHusWithLedger(clock);

  const husCase = hus.createHusCase({
    companyId: COMPANY_ID,
    caseReference: "HUS-13-LEDGER-001",
    serviceTypeCode: "rot",
    workCompletedOn: "2026-03-10",
    housingFormCode: "smallhouse",
    propertyDesignation: "UPPSALA SUNNERSTA 1:31",
    executorFskattApproved: true,
    executorFskattValidatedOn: "2026-03-01",
    actorId: "phase13-ledger-unit"
  });

  hus.classifyHusCase({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    buyers: [
      {
        displayName: "Anna Andersson",
        personalIdentityNumber: "197501019991",
        allocationPercent: 100
      }
    ],
    serviceLines: [
      {
        description: "ROT labor only",
        serviceTypeCode: "rot",
        workedHours: 8,
        laborCostAmount: 10000
      }
    ],
    actorId: "phase13-ledger-unit"
  });
  hus.markHusCaseInvoiced({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    invoiceNumber: "HUS-13-LEDGER-INV-001",
    invoiceIssuedOn: "2026-03-11",
    actorId: "phase13-ledger-unit"
  });
  hus.recordHusCustomerPayment({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    paidAmount: 7000,
    paidOn: "2026-03-12",
    paymentChannel: "bankgiro",
    paymentReference: "BG-HUS-13-LEDGER-001",
    actorId: "phase13-ledger-unit"
  });
  const claim = hus.createHusClaim({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    actorId: "phase13-ledger-unit"
  });
  hus.submitHusClaim({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId,
    submittedOn: "2026-03-13",
    actorId: "phase13-ledger-unit"
  });
  const submittedClaim = hus.getHusClaim({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId
  });

  const decision = hus.recordHusDecision({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId,
    decisionDate: "2026-03-15",
    approvedAmount: 3000,
    reasonCode: "accepted",
    actorId: "phase13-ledger-unit"
  });

  assert.ok(decision.husDecision.journalEntryId);
  const journal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: decision.husDecision.journalEntryId
  });
  assert.equal(journal.metadataJson.postingRecipeCode, "HUS_CLAIM_ACCEPTED");
  assert.equal(journal.metadataJson.postingSignalCode, "hus.claim.accepted");
  assert.equal(journal.metadataJson.sourceDomain, "hus");
  assert.equal(journal.metadataJson.husClaimId, claim.husClaimId);
  assert.equal(journal.metadataJson.claimPayloadHash, submittedClaim.payloadHash);
  assert.deepEqual(
    journal.lines.map(({ accountNumber, debitAmount, creditAmount }) => ({ accountNumber, debitAmount, creditAmount })),
    [
      { accountNumber: "1180", debitAmount: 3000, creditAmount: 0 },
      { accountNumber: "2560", debitAmount: 0, creditAmount: 3000 }
    ]
  );
});

test("Phase 13.1 posts partial acceptance and recovery with distinct HUS recipes", () => {
  const clock = () => new Date("2026-03-24T08:00:00Z");
  const { hus, ledger } = createHusWithLedger(clock);

  const husCase = hus.createHusCase({
    companyId: COMPANY_ID,
    caseReference: "HUS-13-LEDGER-002",
    serviceTypeCode: "rot",
    workCompletedOn: "2026-03-10",
    housingFormCode: "smallhouse",
    propertyDesignation: "UPPSALA SUNNERSTA 1:32",
    executorFskattApproved: true,
    executorFskattValidatedOn: "2026-03-01",
    actorId: "phase13-ledger-unit"
  });

  hus.classifyHusCase({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    buyers: [
      {
        displayName: "Anna Andersson",
        personalIdentityNumber: "197501019991",
        allocationPercent: 100
      }
    ],
    serviceLines: [
      {
        description: "ROT labor and material",
        serviceTypeCode: "rot",
        workedHours: 8,
        laborCostAmount: 10000,
        materialAmount: 5000
      }
    ],
    actorId: "phase13-ledger-unit"
  });
  hus.markHusCaseInvoiced({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    invoiceNumber: "HUS-13-LEDGER-INV-002",
    invoiceIssuedOn: "2026-03-11",
    actorId: "phase13-ledger-unit"
  });
  hus.recordHusCustomerPayment({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    paidAmount: 12000,
    paidOn: "2026-03-15",
    paymentChannel: "bankgiro",
    paymentReference: "BG-HUS-13-LEDGER-002",
    actorId: "phase13-ledger-unit"
  });
  const claim = hus.createHusClaim({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    actorId: "phase13-ledger-unit"
  });
  hus.submitHusClaim({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId,
    submittedOn: "2026-03-16",
    actorId: "phase13-ledger-unit"
  });

  const decision = hus.recordHusDecision({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId,
    decisionDate: "2026-03-18",
    approvedAmount: 2500,
    rejectedAmount: 500,
    reasonCode: "partial_acceptance",
    rejectedOutcomeCode: "customer_reinvoice",
    actorId: "phase13-ledger-unit"
  });
  assert.ok(decision.husDecision.journalEntryId);
  const decisionJournal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: decision.husDecision.journalEntryId
  });
  assert.equal(decisionJournal.metadataJson.postingRecipeCode, "HUS_CLAIM_PARTIALLY_ACCEPTED");
  assert.equal(decisionJournal.metadataJson.postingSignalCode, "hus.claim.partially_accepted");

  hus.resolveHusDecisionDifference({
    companyId: COMPANY_ID,
    husDecisionDifferenceId: decision.husDecisionDifference.husDecisionDifferenceId,
    resolutionCode: "customer_reinvoice",
    resolutionNote: "Customer reinvoiced.",
    actorId: "phase13-ledger-unit"
  });
  hus.recordHusPayout({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId,
    payoutDate: "2026-03-20",
    payoutAmount: 2500,
    actorId: "phase13-ledger-unit"
  });
  const credit = hus.registerHusCreditAdjustment({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    adjustmentDate: "2026-03-25",
    adjustmentAmount: 200,
    reasonCode: "credit_note_after_payout",
    afterPayoutFlag: true,
    actorId: "phase13-ledger-unit"
  });
  const recovery = hus.recordHusRecovery({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    husRecoveryCandidateId: credit.husRecoveryCandidate.husRecoveryCandidateId,
    recoveryDate: "2026-03-28",
    recoveryAmount: 200,
    reasonCode: "skatteverket_recovery",
    actorId: "phase13-ledger-unit"
  });

  assert.ok(recovery.husRecovery.journalEntryId);
  const recoveryJournal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: recovery.husRecovery.journalEntryId
  });
  assert.equal(recoveryJournal.metadataJson.postingRecipeCode, "HUS_RECOVERY_CONFIRMED");
  assert.equal(recoveryJournal.metadataJson.postingSignalCode, "hus.recovery.confirmed");
  assert.equal(recoveryJournal.metadataJson.recoveryCandidateId, credit.husRecoveryCandidate.husRecoveryCandidateId);
  assert.deepEqual(
    recoveryJournal.lines.map(({ accountNumber, debitAmount, creditAmount }) => ({ accountNumber, debitAmount, creditAmount })),
    [
      { accountNumber: "1590", debitAmount: 200, creditAmount: 0 },
      { accountNumber: "1180", debitAmount: 0, creditAmount: 200 }
    ]
  );
});
