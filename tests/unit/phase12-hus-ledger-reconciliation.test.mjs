import test from "node:test";
import assert from "node:assert/strict";
import { createHusPlatform } from "../../packages/domain-hus/src/index.mjs";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

function createHusWithLedger(clock) {
  const ledger = createLedgerPlatform({ clock });
  ledger.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "phase12-hus-ledger-unit"
  });
  ledger.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "phase12-hus-ledger-unit"
  });
  const hus = createHusPlatform({
    clock,
    ledgerPlatform: ledger
  });
  return { hus, ledger };
}

function buildBaseCase(hus, { caseReference, propertyDesignation }) {
  const husCase = hus.createHusCase({
    companyId: COMPANY_ID,
    caseReference,
    serviceTypeCode: "rot",
    workCompletedOn: "2026-03-10",
    housingFormCode: "smallhouse",
    propertyDesignation,
    executorFskattApproved: true,
    executorFskattValidatedOn: "2026-03-01",
    actorId: "phase12-hus-ledger-unit"
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
    actorId: "phase12-hus-ledger-unit"
  });
  hus.markHusCaseInvoiced({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    invoiceNumber: `${caseReference}-INV`,
    invoiceIssuedOn: "2026-03-11",
    actorId: "phase12-hus-ledger-unit"
  });
  hus.recordHusCustomerPayment({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    paidAmount: 12000,
    paidOn: "2026-03-15",
    paymentChannel: "bankgiro",
    paymentReference: `${caseReference}-PAY`,
    actorId: "phase12-hus-ledger-unit"
  });
  return husCase;
}

test("Phase 12.2 creates canonical authority/customer receivables and journals through submission, partial acceptance, payout and recovery", () => {
  const clock = () => new Date("2026-03-24T08:00:00Z");
  const { hus, ledger } = createHusWithLedger(clock);
  const husCase = buildBaseCase(hus, {
    caseReference: "HUS-12-LEDGER-001",
    propertyDesignation: "UPPSALA SUNNERSTA 1:41"
  });

  const claim = hus.createHusClaim({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    actorId: "phase12-hus-ledger-unit"
  });
  const submittedClaim = hus.submitHusClaim({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId,
    submittedOn: "2026-03-16",
    actorId: "phase12-hus-ledger-unit"
  });

  assert.ok(submittedClaim.submissionJournalEntryId);
  assert.ok(submittedClaim.authorityReceivableId);
  const submittedCase = hus.getHusCase({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId
  });
  assert.equal(submittedCase.authorityReceivables.length, 1);
  assert.equal(submittedCase.authorityReceivables[0].status, "submitted");
  assert.equal(submittedCase.authorityReceivables[0].outstandingAmount, 3000);
  const submissionJournal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: submittedClaim.submissionJournalEntryId
  });
  assert.equal(submissionJournal.metadataJson.postingRecipeCode, "HUS_CLAIM_SUBMITTED");
  assert.equal(submissionJournal.metadataJson.authorityReceivableId, submittedClaim.authorityReceivableId);
  assert.deepEqual(
    submissionJournal.lines.map(({ accountNumber, debitAmount, creditAmount }) => ({ accountNumber, debitAmount, creditAmount })),
    [
      { accountNumber: "1590", debitAmount: 3000, creditAmount: 0 },
      { accountNumber: "2560", debitAmount: 0, creditAmount: 3000 }
    ]
  );

  const decision = hus.recordHusDecision({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId,
    decisionDate: "2026-03-18",
    approvedAmount: 2500,
    rejectedAmount: 500,
    reasonCode: "partial_acceptance",
    rejectedOutcomeCode: "customer_reinvoice",
    actorId: "phase12-hus-ledger-unit"
  });
  const decisionJournal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: decision.husDecision.journalEntryId
  });
  assert.equal(decisionJournal.metadataJson.postingRecipeCode, "HUS_CLAIM_PARTIALLY_ACCEPTED");
  assert.deepEqual(
    decisionJournal.lines.map(({ accountNumber, debitAmount, creditAmount }) => ({ accountNumber, debitAmount, creditAmount })),
    [
      { accountNumber: "1180", debitAmount: 2500, creditAmount: 0 },
      { accountNumber: "1590", debitAmount: 0, creditAmount: 2500 }
    ]
  );

  const resolvedDifference = hus.resolveHusDecisionDifference({
    companyId: COMPANY_ID,
    husDecisionDifferenceId: decision.husDecisionDifference.husDecisionDifferenceId,
    resolutionCode: "customer_reinvoice",
    resolutionNote: "Customer reinvoiced for rejected part.",
    actorId: "phase12-hus-ledger-unit"
  });
  assert.ok(resolvedDifference.resolutionJournalEntryId);
  assert.ok(resolvedDifference.husCustomerReceivableId);
  const differenceJournal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: resolvedDifference.resolutionJournalEntryId
  });
  assert.equal(differenceJournal.metadataJson.postingRecipeCode, "HUS_CLAIM_DIFFERENCE_CUSTOMER_RECEIVABLE");
  assert.deepEqual(
    differenceJournal.lines.map(({ accountNumber, debitAmount, creditAmount }) => ({ accountNumber, debitAmount, creditAmount })),
    [
      { accountNumber: "1210", debitAmount: 500, creditAmount: 0 },
      { accountNumber: "1590", debitAmount: 0, creditAmount: 500 }
    ]
  );

  const payout = hus.recordHusPayout({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId,
    payoutDate: "2026-03-20",
    payoutAmount: 2500,
    actorId: "phase12-hus-ledger-unit"
  });
  assert.ok(payout.husPayout.journalEntryId);
  const payoutJournal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: payout.husPayout.journalEntryId
  });
  assert.equal(payoutJournal.metadataJson.postingRecipeCode, "HUS_PAYOUT_SETTLED");
  assert.equal(payoutJournal.metadataJson.settlementModelCode, "bank_account");
  assert.equal(payoutJournal.metadataJson.settlementAccountNumber, "1110");
  assert.deepEqual(
    payoutJournal.lines.map(({ accountNumber, debitAmount, creditAmount }) => ({ accountNumber, debitAmount, creditAmount })),
    [
      { accountNumber: "1110", debitAmount: 2500, creditAmount: 0 },
      { accountNumber: "1180", debitAmount: 0, creditAmount: 2500 }
    ]
  );

  const credit = hus.registerHusCreditAdjustment({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    adjustmentDate: "2026-03-25",
    adjustmentAmount: 200,
    reasonCode: "credit_note_after_payout",
    afterPayoutFlag: true,
    actorId: "phase12-hus-ledger-unit"
  });
  const recovery = hus.recordHusRecovery({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    husRecoveryCandidateId: credit.husRecoveryCandidate.husRecoveryCandidateId,
    recoveryDate: "2026-03-28",
    recoveryAmount: 200,
    reasonCode: "skatteverket_recovery",
    actorId: "phase12-hus-ledger-unit"
  });
  const recoveryJournal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: recovery.husRecovery.journalEntryId
  });
  assert.equal(recoveryJournal.metadataJson.postingRecipeCode, "HUS_RECOVERY_CONFIRMED");
  assert.deepEqual(
    recoveryJournal.lines.map(({ accountNumber, debitAmount, creditAmount }) => ({ accountNumber, debitAmount, creditAmount })),
    [
      { accountNumber: "1590", debitAmount: 200, creditAmount: 0 },
      { accountNumber: "1180", debitAmount: 0, creditAmount: 200 }
    ]
  );

  const finalCase = hus.getHusCase({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId
  });
  assert.equal(finalCase.status, "recovered");
  assert.equal(finalCase.customerReceivables.length, 1);
  assert.equal(finalCase.customerReceivables[0].outstandingAmount, 500);
  assert.equal(finalCase.authorityReceivables[0].status, "recovered");
  assert.equal(finalCase.authorityReceivables[0].payoutSettledAmount, 2500);
  assert.equal(finalCase.authorityReceivables[0].recoveredAmount, 200);
});

test("Phase 12.2 writes off fully rejected HUS differences with canonical ledger intent", () => {
  const clock = () => new Date("2026-03-24T08:00:00Z");
  const { hus, ledger } = createHusWithLedger(clock);
  const husCase = buildBaseCase(hus, {
    caseReference: "HUS-12-LEDGER-002",
    propertyDesignation: "UPPSALA SUNNERSTA 1:42"
  });

  const claim = hus.createHusClaim({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    actorId: "phase12-hus-ledger-unit"
  });
  hus.submitHusClaim({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId,
    submittedOn: "2026-03-16",
    actorId: "phase12-hus-ledger-unit"
  });
  const decision = hus.recordHusDecision({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId,
    decisionDate: "2026-03-18",
    approvedAmount: 0,
    rejectedAmount: 3000,
    reasonCode: "rejected",
    rejectedOutcomeCode: "internal_writeoff",
    actorId: "phase12-hus-ledger-unit"
  });

  const resolvedDifference = hus.resolveHusDecisionDifference({
    companyId: COMPANY_ID,
    husDecisionDifferenceId: decision.husDecisionDifference.husDecisionDifferenceId,
    resolutionCode: "internal_writeoff",
    resolutionNote: "Internal write-off approved.",
    actorId: "phase12-hus-ledger-unit"
  });

  const writeoffJournal = ledger.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: resolvedDifference.resolutionJournalEntryId
  });
  assert.equal(writeoffJournal.metadataJson.postingRecipeCode, "HUS_CLAIM_DIFFERENCE_WRITEOFF");
  assert.deepEqual(
    writeoffJournal.lines.map(({ accountNumber, debitAmount, creditAmount }) => ({ accountNumber, debitAmount, creditAmount })),
    [
      { accountNumber: "6900", debitAmount: 3000, creditAmount: 0 },
      { accountNumber: "1590", debitAmount: 0, creditAmount: 3000 }
    ]
  );

  const finalCase = hus.getHusCase({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId
  });
  assert.equal(finalCase.status, "written_off");
  assert.equal(finalCase.customerReceivables.length, 0);
  assert.equal(finalCase.authorityReceivables[0].status, "written_off");
  assert.equal(finalCase.authorityReceivables[0].outstandingAmount, 0);
});
