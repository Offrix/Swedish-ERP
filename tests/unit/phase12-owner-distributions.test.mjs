import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_APPROVER_IDS, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";

test("Phase 12.5 owner distributions enforce treaty proof, post payout journals and build KU31 for supported recipients", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-04-01T09:00:00Z")
  });
  const { annualPackage } = prepareAnnualTaxChain(platform, "phase12-owner-1");
  const shareClass = platform.createShareClass({
    companyId: DEMO_IDS.companyId,
    actorId: DEMO_IDS.userId,
    name: "Ordinary A",
    votesPerShare: 1,
    dividendPriorityCode: "ordinary"
  });
  const holdings = platform.createShareholderHoldingSnapshot({
    companyId: DEMO_IDS.companyId,
    actorId: DEMO_IDS.userId,
    effectiveDate: "2026-03-31",
    evidenceRef: "evidence:share-register:2026-03-31",
    holders: [
      {
        holderRef: {
          holderId: "resident-owner",
          displayName: "Resident Owner",
          taxProfileCode: "swedish_private_person",
          identityReference: "identity:resident-owner",
          identityMaskedValue: "850101-****",
          countryCode: "SE"
        },
        shareClassHoldings: [{ shareClassId: shareClass.shareClassId, shareCount: 5 }]
      },
      {
        holderRef: {
          holderId: "foreign-owner",
          displayName: "Foreign Owner Ltd",
          taxProfileCode: "foreign_recipient",
          identityReference: "identity:foreign-owner",
          identityMaskedValue: "TAX-***",
          countryCode: "GB"
        },
        shareClassHoldings: [{ shareClassId: shareClass.shareClassId, shareCount: 5 }]
      }
    ]
  });
  const freeEquitySnapshot = platform.createFreeEquitySnapshot({
    companyId: DEMO_IDS.companyId,
    actorId: DEMO_IDS.userId,
    proofSourceType: "annual_report_package",
    effectiveDate: "2026-03-31",
    freeEquityAmount: 5000,
    annualReportPackageId: annualPackage.packageId
  });
  const proposed = platform.proposeDividendDecision({
    companyId: DEMO_IDS.companyId,
    actorId: DEMO_IDS.userId,
    decisionDate: "2026-04-01",
    holdingSnapshotId: holdings.snapshotId,
    freeEquitySnapshotId: freeEquitySnapshot.freeEquitySnapshotId,
    boardEvidenceRef: "evidence:board-proposal:2026-04-01",
    prudenceAssessmentText: "Liquidity remains strong after the proposal.",
    liquidityAssessmentText: "Bank balance supports the distribution.",
    journalPlan: {
      equityAccountNumber: "2030",
      liabilityAccountNumber: "2890",
      paymentAccountNumber: "1110",
      authorityLiabilityAccountNumber: "2560"
    },
    perShareAmount: 200
  });
  const reviewPending = platform.submitDividendDecisionForReview({
    companyId: DEMO_IDS.companyId,
    decisionId: proposed.decisionId,
    actorId: DEMO_IDS.userId,
    reviewEvidenceRef: "evidence:review:2026-04-01"
  });
  const stammaReady = platform.markDividendDecisionStammaReady({
    companyId: DEMO_IDS.companyId,
    decisionId: reviewPending.decisionId,
    actorId: DEMO_IDS.userId,
    stammaNoticeEvidenceRef: "evidence:stamma-notice:2026-04-02"
  });
  const resolved = platform.resolveDividendAtStamma({
    companyId: DEMO_IDS.companyId,
    decisionId: stammaReady.decisionId,
    actorId: DEMO_IDS.userId,
    approvedByActorId: DEMO_APPROVER_IDS.userId,
    approvedByRoleCode: "finance_manager",
    resolutionDate: "2026-04-10",
    evidenceRef: "evidence:stamma-protocol:2026-04-10"
  });
  assert.equal(resolved.status, "stamma_resolved");

  assert.throws(
    () =>
      platform.scheduleDividendPayout({
        companyId: DEMO_IDS.companyId,
        decisionId: resolved.decisionId,
        actorId: DEMO_IDS.userId,
        approvedByActorId: DEMO_APPROVER_IDS.userId,
        approvedByRoleCode: "finance_manager",
        paymentDate: "2026-04-15",
        recipientOverrides: [
          {
            holderId: "foreign-owner",
            withholdingRate: 0.15
          }
        ]
      }),
    (error) => error?.code === "kupongskatt_treaty_evidence_required"
  );

  const scheduled = platform.scheduleDividendPayout({
    companyId: DEMO_IDS.companyId,
    decisionId: resolved.decisionId,
    actorId: DEMO_IDS.userId,
    approvedByActorId: DEMO_APPROVER_IDS.userId,
    approvedByRoleCode: "finance_manager",
    paymentDate: "2026-04-15",
    recipientOverrides: [
      {
        holderId: "foreign-owner",
        withholdingRate: 0.15,
        treatyEvidenceRef: "evidence:treaty:gb-se",
        treatyApprovedByActorId: DEMO_APPROVER_IDS.userId,
        treatyApprovedByRoleCode: "finance_manager"
      }
    ]
  });
  assert.equal(scheduled.status, "scheduled");
  assert.equal(scheduled.paymentInstructions.length, 2);
  assert.equal(scheduled.kupongskattRecords.length, 1);
  assert.equal(scheduled.kupongskattRecords[0].amount, 150);
  assert.equal(scheduled.kupongskattRecords[0].authorityPaymentDueDate, "2026-08-15");

  const payout = platform.recordDividendPayout({
    companyId: DEMO_IDS.companyId,
    decisionId: scheduled.decisionId,
    actorId: DEMO_IDS.userId,
    approvedByActorId: DEMO_APPROVER_IDS.userId,
    approvedByRoleCode: "finance_manager",
    payoutDate: "2026-04-15",
    payouts: [
      {
        instructionId: scheduled.paymentInstructions.find((entry) => entry.recipientRef.holderId === "resident-owner").instructionId,
        grossAmount: 1000
      },
      {
        instructionId: scheduled.paymentInstructions.find((entry) => entry.recipientRef.holderId === "foreign-owner").instructionId,
        grossAmount: 500
      }
    ]
  });
  assert.equal(payout.status, "partially_paid");
  assert.equal(payout.paidGrossAmount, 1500);
  assert.equal(payout.paidNetAmount, 1425);
  assert.equal(payout.paidWithholdingAmount, 75);

  const payoutJournal = platform.getJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalEntryId: payout.payoutRuns[0].journalEntryId
  });
  assert.deepEqual(
    payoutJournal.lines.map((line) => ({
      accountNumber: line.accountNumber,
      debitAmount: line.debitAmount,
      creditAmount: line.creditAmount
    })),
    [
      { accountNumber: "2890", debitAmount: 1500, creditAmount: 0 },
      { accountNumber: "1110", debitAmount: 0, creditAmount: 1425 },
      { accountNumber: "2560", debitAmount: 0, creditAmount: 75 }
    ]
  );

  const ku31 = platform.buildKu31Draft({
    companyId: DEMO_IDS.companyId,
    decisionId: payout.decisionId,
    actorId: DEMO_IDS.userId
  });
  assert.equal(ku31.items.length, 1);
  assert.equal(ku31.items[0].recipientRef.holderId, "resident-owner");
  assert.equal(ku31.items[0].controlStatementDueDate, "2027-01-31");
  assert.equal(ku31.skippedRecipients.length, 1);
  assert.equal(ku31.skippedRecipients[0].reasonCode, "ku31_current_profile_not_supported_for_foreign_recipient");
});

test("Phase 12.5 owner distributions reject unsigned annual packages as free-equity proof", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-04-01T10:00:00Z")
  });
  const annualPackage = prepareUnsignedAnnualPackage(platform, "phase12-owner-proof");

  assert.throws(
    () =>
      platform.createFreeEquitySnapshot({
        companyId: DEMO_IDS.companyId,
        actorId: DEMO_IDS.userId,
        proofSourceType: "annual_report_package",
        effectiveDate: "2026-03-31",
        freeEquityAmount: 1200,
        annualReportPackageId: annualPackage.packageId
      }),
    (error) => error?.code === "annual_report_version_not_locked_for_dividend_proof"
  );
});

test("Phase 12.5 owner distribution reversal creates a separate correction chain", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-04-01T11:00:00Z")
  });
  const { annualPackage } = prepareAnnualTaxChain(platform, "phase12-owner-reversal");
  const shareClass = platform.createShareClass({
    companyId: DEMO_IDS.companyId,
    actorId: DEMO_IDS.userId,
    name: "Ordinary B",
    votesPerShare: 1,
    dividendPriorityCode: "ordinary"
  });
  const holdings = platform.createShareholderHoldingSnapshot({
    companyId: DEMO_IDS.companyId,
    actorId: DEMO_IDS.userId,
    effectiveDate: "2026-03-31",
    evidenceRef: "evidence:share-register:reversal",
    holders: [
      {
        holderRef: {
          holderId: "reversal-owner",
          displayName: "Reversal Owner",
          taxProfileCode: "swedish_private_person",
          identityReference: "identity:reversal-owner",
          identityMaskedValue: "770101-****",
          countryCode: "SE"
        },
        shareClassHoldings: [{ shareClassId: shareClass.shareClassId, shareCount: 4 }]
      }
    ]
  });
  const freeEquitySnapshot = platform.createFreeEquitySnapshot({
    companyId: DEMO_IDS.companyId,
    actorId: DEMO_IDS.userId,
    proofSourceType: "annual_report_package",
    effectiveDate: "2026-03-31",
    freeEquityAmount: 5000,
    annualReportPackageId: annualPackage.packageId
  });
  const proposed = platform.proposeDividendDecision({
    companyId: DEMO_IDS.companyId,
    actorId: DEMO_IDS.userId,
    decisionDate: "2026-04-01",
    holdingSnapshotId: holdings.snapshotId,
    freeEquitySnapshotId: freeEquitySnapshot.freeEquitySnapshotId,
    boardEvidenceRef: "evidence:board-proposal:reversal",
    prudenceAssessmentText: "Reversal scenario prudence.",
    liquidityAssessmentText: "Reversal scenario liquidity.",
    journalPlan: {
      equityAccountNumber: "2030",
      liabilityAccountNumber: "2890",
      paymentAccountNumber: "1110"
    },
    perShareAmount: 100
  });
  platform.submitDividendDecisionForReview({
    companyId: DEMO_IDS.companyId,
    decisionId: proposed.decisionId,
    actorId: DEMO_IDS.userId
  });
  platform.markDividendDecisionStammaReady({
    companyId: DEMO_IDS.companyId,
    decisionId: proposed.decisionId,
    actorId: DEMO_IDS.userId
  });
  const resolved = platform.resolveDividendAtStamma({
    companyId: DEMO_IDS.companyId,
    decisionId: proposed.decisionId,
    actorId: DEMO_IDS.userId,
    approvedByActorId: DEMO_APPROVER_IDS.userId,
    approvedByRoleCode: "finance_manager",
    resolutionDate: "2026-04-10",
    evidenceRef: "evidence:stamma-protocol:reversal"
  });
  const scheduled = platform.scheduleDividendPayout({
    companyId: DEMO_IDS.companyId,
    decisionId: resolved.decisionId,
    actorId: DEMO_IDS.userId,
    approvedByActorId: DEMO_APPROVER_IDS.userId,
    approvedByRoleCode: "finance_manager",
    paymentDate: "2026-04-18"
  });
  const paid = platform.recordDividendPayout({
    companyId: DEMO_IDS.companyId,
    decisionId: scheduled.decisionId,
    actorId: DEMO_IDS.userId,
    approvedByActorId: DEMO_APPROVER_IDS.userId,
    approvedByRoleCode: "finance_manager",
    payoutDate: "2026-04-18"
  });
  const reversed = platform.reverseDividendPayout({
    companyId: DEMO_IDS.companyId,
    decisionId: paid.decisionId,
    actorId: DEMO_IDS.userId,
    approvedByActorId: DEMO_APPROVER_IDS.userId,
    approvedByRoleCode: "finance_manager",
    reversalDate: "2026-04-20"
  });
  assert.equal(reversed.status, "reversed");
  assert.equal(reversed.reversalJournalEntryIds.length, 1);
  assert.equal(reversed.paymentInstructions[0].status, "reversed");
  const originalPayoutJournal = platform.getJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalEntryId: paid.payoutRuns[0].journalEntryId
  });
  assert.equal(originalPayoutJournal.reversedByJournalEntryId, reversed.reversalJournalEntryIds[0]);
});

function prepareAnnualTaxChain(platform, actorId) {
  const annualPackage = prepareSignedAnnualPackage(platform, actorId);
  postResultTransfer(platform, actorId);
  const refreshedAnnualPackage = platform.getAnnualReportPackage({
    companyId: DEMO_IDS.companyId,
    packageId: annualPackage.packageId
  });
  const taxPackage = platform.createTaxDeclarationPackage({
    companyId: DEMO_IDS.companyId,
    packageId: refreshedAnnualPackage.packageId,
    versionId: refreshedAnnualPackage.currentVersion.versionId,
    actorId: DEMO_IDS.userId
  });
  return {
    annualPackage: refreshedAnnualPackage,
    taxPackage
  };
}

function prepareSignedAnnualPackage(platform, actorId) {
  const annualPackage = prepareUnsignedAnnualPackage(platform, actorId);
  platform.inviteAnnualReportSignatory({
    companyId: DEMO_IDS.companyId,
    packageId: annualPackage.packageId,
    versionId: annualPackage.currentVersion.versionId,
    companyUserId: DEMO_IDS.companyUserId,
    signatoryRole: "ceo"
  });
  platform.inviteAnnualReportSignatory({
    companyId: DEMO_IDS.companyId,
    packageId: annualPackage.packageId,
    versionId: annualPackage.currentVersion.versionId,
    companyUserId: DEMO_IDS.companyUserId,
    signatoryRole: "board_member"
  });
  return platform.signAnnualReportVersion({
    companyId: DEMO_IDS.companyId,
    packageId: annualPackage.packageId,
    versionId: annualPackage.currentVersion.versionId,
    actorId: DEMO_IDS.userId,
    comment: "Signed for owner-distribution testing"
  });
}

function prepareUnsignedAnnualPackage(platform, actorId) {
  platform.installLedgerCatalog({
    companyId: DEMO_IDS.companyId,
    actorId
  });
  const period = platform.ensureAccountingYearPeriod({
    companyId: DEMO_IDS.companyId,
    fiscalYear: 2026,
    actorId
  });
  const incomeJournal = platform.createJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalDate: "2026-01-20",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: `${actorId}:income`,
    actorId,
    idempotencyKey: `${actorId}:income`,
    lines: [
      { accountNumber: "1510", debitAmount: 18000 },
      { accountNumber: "3010", creditAmount: 18000 }
    ]
  });
  platform.validateJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalEntryId: incomeJournal.journalEntry.journalEntryId,
    actorId
  });
  platform.postJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalEntryId: incomeJournal.journalEntry.journalEntryId,
    actorId,
    approvedByActorId: DEMO_APPROVER_IDS.userId,
    approvedByRoleCode: "finance_manager"
  });
  platform.lockAccountingPeriod({
    companyId: DEMO_IDS.companyId,
    accountingPeriodId: period.accountingPeriodId,
    status: "hard_closed",
    actorId,
    reasonCode: "annual_reporting_ready",
    approvedByActorId: DEMO_IDS.userId,
    approvedByRoleCode: "company_admin"
  });
  return platform.createAnnualReportPackage({
    companyId: DEMO_IDS.companyId,
    accountingPeriodId: period.accountingPeriodId,
    profileCode: "k3",
    actorId: DEMO_IDS.userId,
    textSections: {
      management_report: "Owner distribution annual package",
      accounting_policies: "K3 policies",
      material_events: "No material events"
    },
    noteSections: {
      notes_bundle: "Owner distribution notes",
      cash_flow_commentary: "Stable cash flow",
      related_party_commentary: "No related-party issues"
    }
  });
}

function postResultTransfer(platform, actorId) {
  const fiscalYearId = platform
    .listFiscalYears({ companyId: DEMO_IDS.companyId })
    .find((candidate) => candidate.startDate === "2026-01-01")?.fiscalYearId;
  return platform.createYearEndTransferBatch({
    companyId: DEMO_IDS.companyId,
    fiscalYearId,
    transferKind: "RESULT_TRANSFER",
    sourceCode: "ANNUAL_REPORTING_CLOSE",
    actorId,
    idempotencyKey: `result-transfer:${DEMO_IDS.companyId}:2026`
  });
}
