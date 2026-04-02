import test from "node:test";
import assert from "node:assert/strict";
import { createHusPlatform } from "../../packages/domain-hus/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 10.3 HUS classifies, submits, pays out and recovers deterministically", () => {
  const husPlatform = createHusPlatform({
    clock: () => new Date("2026-03-22T08:00:00Z")
  });

  const husCase = husPlatform.createHusCase({
    companyId: COMPANY_ID,
    caseReference: "HUS-TEST-001",
    serviceTypeCode: "rot",
    workCompletedOn: "2026-03-10",
    housingFormCode: "smallhouse",
    propertyDesignation: "UPPSALA SUNNERSTA 1:23",
    executorFskattApproved: true,
    executorFskattValidatedOn: "2026-03-01",
    actorId: "unit-test"
  });

  const classified = husPlatform.classifyHusCase({
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
    actorId: "unit-test"
  });

  assert.equal(classified.preliminaryReductionAmount, 3000);
  assert.equal(classified.customerShareAmount, 12000);
  assert.equal(classified.status, "draft");

  const invoiced = husPlatform.markHusCaseInvoiced({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    invoiceNumber: "HUS-TEST-INV-001",
    invoiceIssuedOn: "2026-03-11",
    actorId: "unit-test"
  });
  assert.equal(invoiced.status, "draft");

  const partialPayment = husPlatform.recordHusCustomerPayment({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    paidAmount: 5000,
    paidOn: "2026-03-12",
    paymentChannel: "bankgiro",
    paymentReference: "BG-REF-001",
    actorId: "unit-test"
  });
  assert.equal(partialPayment.status, "claim_ready");
  assert.equal(partialPayment.outstandingCustomerShareAmount, 7000);

  const paid = husPlatform.recordHusCustomerPayment({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    paidAmount: 7000,
    paidOn: "2026-03-15",
    paymentChannel: "swish",
    paymentReference: "SWISH-REF-002",
    actorId: "unit-test"
  });
  assert.equal(paid.status, "claim_ready");

  const claim = husPlatform.createHusClaim({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    actorId: "unit-test"
  });
  assert.equal(claim.requestedAmount, 3000);
  assert.equal(claim.status, "claim_draft");

  const submitted = husPlatform.submitHusClaim({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId,
    submittedOn: "2026-03-16",
    actorId: "unit-test"
  });
  assert.equal(submitted.status, "claim_submitted");

  const decision = husPlatform.recordHusDecision({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId,
    decisionDate: "2026-03-18",
    approvedAmount: 3000,
    reasonCode: "accepted",
    actorId: "unit-test"
  });
  assert.equal(decision.husClaim.status, "claim_accepted");

  const payout = husPlatform.recordHusPayout({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId,
    payoutDate: "2026-03-20",
    payoutAmount: 3000,
    actorId: "unit-test"
  });
  assert.equal(payout.husClaim.status, "paid_out");

  const credit = husPlatform.registerHusCreditAdjustment({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    adjustmentDate: "2026-03-25",
    adjustmentAmount: 500,
    reasonCode: "customer_credit_note",
    afterPayoutFlag: true,
    actorId: "unit-test"
  });
  assert.equal(credit.husCase.status, "paid_out");

  const recovery = husPlatform.recordHusRecovery({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    recoveryDate: "2026-03-28",
    recoveryAmount: 500,
    reasonCode: "skatteverket_recovery",
    actorId: "unit-test"
  });
  assert.equal(recovery.husCase.status, "recovered");

  const auditEvents = husPlatform.listHusAuditEvents({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId
  });
  assert.equal(auditEvents.some((event) => event.action === "hus.case.classified"), true);
  assert.equal(auditEvents.some((event) => event.action === "hus.claim.submitted"), true);
  assert.equal(auditEvents.some((event) => event.action === "hus.case.recovery_recorded"), true);
});
