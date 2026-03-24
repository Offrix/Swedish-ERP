import test from "node:test";
import assert from "node:assert/strict";
import { createHusPlatform } from "../../packages/domain-hus/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Step 28 HUS gates proportion claims, open decision differences and recover after payout", () => {
  const hus = createHusPlatform({
    clock: () => new Date("2026-03-24T08:00:00Z")
  });

  const husCase = hus.createHusCase({
    companyId: COMPANY_ID,
    caseReference: "HUS-28-UNIT-001",
    serviceTypeCode: "rot",
    workCompletedOn: "2026-03-10",
    housingFormCode: "smallhouse",
    propertyDesignation: "UPPSALA SUNNERSTA 1:23",
    executorFskattApproved: true,
    executorFskattValidatedOn: "2026-03-01",
    actorId: "step28-unit"
  });

  hus.classifyHusCase({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    buyers: [
      {
        displayName: "Anna Andersson",
        personalIdentityNumber: "197501019999",
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
    actorId: "step28-unit"
  });

  hus.markHusCaseInvoiced({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    invoiceNumber: "HUS-28-INV-001",
    invoiceIssuedOn: "2026-03-11",
    actorId: "step28-unit"
  });

  hus.recordHusCustomerPayment({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    paidAmount: 6000,
    paidOn: "2026-03-15",
    paymentChannel: "bankgiro",
    paymentReference: "BG-28-001",
    actorId: "step28-unit"
  });

  const readiness = hus.evaluateHusCaseReadiness({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId
  });
  assert.equal(readiness.status, "partial_ready");
  assert.equal(readiness.claimableReductionAmount, 1500);

  const claim = hus.createHusClaim({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    actorId: "step28-unit"
  });
  assert.equal(claim.requestedAmount, 1500);
  assert.equal(claim.paymentAllocations.length, 1);

  hus.submitHusClaim({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId,
    submittedOn: "2026-03-16",
    actorId: "step28-unit"
  });

  const decision = hus.recordHusDecision({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId,
    decisionDate: "2026-03-18",
    approvedAmount: 1000,
    rejectedAmount: 500,
    reasonCode: "partial_acceptance",
    rejectedOutcomeCode: "customer_reinvoice",
    actorId: "step28-unit"
  });
  assert.equal(decision.husClaim.status, "claim_partially_accepted");
  assert.equal(decision.husDecisionDifference.status, "open");

  const resolvedDifference = hus.resolveHusDecisionDifference({
    companyId: COMPANY_ID,
    husDecisionDifferenceId: decision.husDecisionDifference.husDecisionDifferenceId,
    resolutionCode: "customer_reinvoice",
    resolutionNote: "Customer notified.",
    actorId: "step28-unit"
  });
  assert.equal(resolvedDifference.status, "resolved");

  hus.recordHusPayout({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId,
    payoutDate: "2026-03-20",
    payoutAmount: 1000,
    actorId: "step28-unit"
  });

  const credit = hus.registerHusCreditAdjustment({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    adjustmentDate: "2026-03-25",
    adjustmentAmount: 200,
    reasonCode: "credit_note_after_payout",
    afterPayoutFlag: true,
    actorId: "step28-unit"
  });
  assert.equal(credit.husRecoveryCandidate.status, "open");

  const recovery = hus.recordHusRecovery({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    husRecoveryCandidateId: credit.husRecoveryCandidate.husRecoveryCandidateId,
    recoveryDate: "2026-03-28",
    recoveryAmount: 200,
    reasonCode: "skatteverket_recovery",
    actorId: "step28-unit"
  });
  assert.equal(recovery.husRecoveryCandidate.status, "recovered");
  assert.equal(recovery.husCase.status, "closed");
});

test("Step 28 HUS gates block payment and claim without invoice and payment evidence", () => {
  const hus = createHusPlatform({
    clock: () => new Date("2026-03-24T08:00:00Z")
  });

  const husCase = hus.createHusCase({
    companyId: COMPANY_ID,
    caseReference: "HUS-28-UNIT-002",
    serviceTypeCode: "rot",
    workCompletedOn: "2026-03-10",
    actorId: "step28-unit"
  });

  hus.classifyHusCase({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    buyers: [
      {
        displayName: "Anna Andersson",
        personalIdentityNumber: "197501019999",
        allocationPercent: 100
      }
    ],
    serviceLines: [
      {
        description: "ROT labor only",
        serviceTypeCode: "rot",
        workedHours: 4,
        laborCostAmount: 4000
      }
    ],
    actorId: "step28-unit"
  });

  assert.throws(() =>
    hus.markHusCaseInvoiced({
      companyId: COMPANY_ID,
      husCaseId: husCase.husCaseId,
      invoiceNumber: "HUS-28-INV-002",
      invoiceIssuedOn: "2026-03-11",
      actorId: "step28-unit"
    })
  );

  const blockedReadiness = hus.evaluateHusCaseReadiness({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId
  });
  assert.equal(blockedReadiness.status, "blocked");
  assert.equal(blockedReadiness.blockerCodes.includes("invoice_gate_not_passed"), true);
});
