import test from "node:test";
import assert from "node:assert/strict";
import { createHusPlatform } from "../../packages/domain-hus/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 13.1 applies buyer annual cap and weekend-adjusted HUS deadline", () => {
  const hus = createHusPlatform({
    clock: () => new Date("2026-12-20T08:00:00Z")
  });

  const buyer = {
    displayName: "Anna Andersson",
    personalIdentityNumber: "197501019991",
    allocationPercent: 100
  };

  const saturatedCase = hus.createHusCase({
    companyId: COMPANY_ID,
    caseReference: "HUS-13-CAP-001",
    serviceTypeCode: "rot",
    workCompletedOn: "2026-06-10",
    housingFormCode: "smallhouse",
    propertyDesignation: "UPPSALA SUNNERSTA 1:23",
    executorFskattApproved: true,
    executorFskattValidatedOn: "2026-06-01",
    actorId: "phase13-unit"
  });
  hus.classifyHusCase({
    companyId: COMPANY_ID,
    husCaseId: saturatedCase.husCaseId,
    buyers: [buyer],
    serviceLines: [
      {
        description: "ROT labor saturation",
        serviceTypeCode: "rot",
        workedHours: 40,
        laborCostAmount: 150000
      }
    ],
    actorId: "phase13-unit"
  });
  hus.markHusCaseInvoiced({
    companyId: COMPANY_ID,
    husCaseId: saturatedCase.husCaseId,
    invoiceNumber: "HUS-13-CAP-INV-001",
    invoiceIssuedOn: "2026-06-11",
    actorId: "phase13-unit"
  });
  hus.recordHusCustomerPayment({
    companyId: COMPANY_ID,
    husCaseId: saturatedCase.husCaseId,
    paidAmount: 105000,
    paidOn: "2026-06-12",
    paymentChannel: "bankgiro",
    paymentReference: "BG-HUS-13-CAP-001",
    actorId: "phase13-unit"
  });
  const saturatedClaim = hus.createHusClaim({
    companyId: COMPANY_ID,
    husCaseId: saturatedCase.husCaseId,
    actorId: "phase13-unit"
  });
  hus.submitHusClaim({
    companyId: COMPANY_ID,
    husClaimId: saturatedClaim.husClaimId,
    submittedOn: "2026-06-13",
    actorId: "phase13-unit"
  });
  hus.recordHusDecision({
    companyId: COMPANY_ID,
    husClaimId: saturatedClaim.husClaimId,
    decisionDate: "2026-06-14",
    approvedAmount: 45000,
    reasonCode: "accepted",
    actorId: "phase13-unit"
  });

  const cappedCase = hus.createHusCase({
    companyId: COMPANY_ID,
    caseReference: "HUS-13-CAP-002",
    serviceTypeCode: "rot",
    workCompletedOn: "2026-12-10",
    housingFormCode: "smallhouse",
    propertyDesignation: "UPPSALA SUNNERSTA 1:24",
    executorFskattApproved: true,
    executorFskattValidatedOn: "2026-12-01",
    actorId: "phase13-unit"
  });
  hus.classifyHusCase({
    companyId: COMPANY_ID,
    husCaseId: cappedCase.husCaseId,
    buyers: [buyer],
    serviceLines: [
      {
        description: "ROT labor cap remainder",
        serviceTypeCode: "rot",
        workedHours: 12,
        laborCostAmount: 50000
      }
    ],
    actorId: "phase13-unit"
  });
  hus.markHusCaseInvoiced({
    companyId: COMPANY_ID,
    husCaseId: cappedCase.husCaseId,
    invoiceNumber: "HUS-13-CAP-INV-002",
    invoiceIssuedOn: "2026-12-11",
    actorId: "phase13-unit"
  });
  hus.recordHusCustomerPayment({
    companyId: COMPANY_ID,
    husCaseId: cappedCase.husCaseId,
    paidAmount: 35000,
    paidOn: "2026-12-15",
    paymentChannel: "swish",
    paymentReference: "SWISH-HUS-13-CAP-002",
    actorId: "phase13-unit"
  });

  const readiness = hus.evaluateHusCaseReadiness({
    companyId: COMPANY_ID,
    husCaseId: cappedCase.husCaseId
  });
  assert.equal(readiness.claimableReductionAmount, 5000);
  assert.equal(readiness.buyerClaimableReductionAmount, 5000);
  assert.equal(readiness.paymentCapacities[0].latestAllowedSubmissionDate, "2027-02-01");

  const cappedClaim = hus.createHusClaim({
    companyId: COMPANY_ID,
    husCaseId: cappedCase.husCaseId,
    transportType: "direct_api",
    actorId: "phase13-unit"
  });
  assert.equal(cappedClaim.requestedAmount, 5000);
  assert.equal(cappedClaim.transportProfile.deliveryChannelCode, "direct_api");
  assert.equal(cappedClaim.buyerAllocations[0].requestedAmount, 5000);
  assert.equal(cappedClaim.buyerAllocations[0].remainingServiceTypeCapAmountAfterClaim, 0);
});

test("Phase 13.1 locks HUS claim fields and blocks unresolved partial payout", () => {
  const hus = createHusPlatform({
    clock: () => new Date("2026-03-24T08:00:00Z")
  });

  const husCase = hus.createHusCase({
    companyId: COMPANY_ID,
    caseReference: "HUS-13-LOCK-001",
    serviceTypeCode: "rot",
    workCompletedOn: "2026-03-10",
    housingFormCode: "smallhouse",
    propertyDesignation: "UPPSALA SUNNERSTA 1:25",
    executorFskattApproved: true,
    executorFskattValidatedOn: "2026-03-01",
    actorId: "phase13-unit"
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
    actorId: "phase13-unit"
  });
  hus.markHusCaseInvoiced({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    invoiceNumber: "HUS-13-LOCK-INV-001",
    invoiceIssuedOn: "2026-03-11",
    actorId: "phase13-unit"
  });
  hus.recordHusCustomerPayment({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    paidAmount: 12000,
    paidOn: "2026-03-15",
    paymentChannel: "bankgiro",
    paymentReference: "BG-HUS-13-LOCK-001",
    actorId: "phase13-unit"
  });

  const claim = hus.createHusClaim({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    transportType: "direct_api",
    actorId: "phase13-unit"
  });
  assert.equal(claim.transportProfile.supportsOfficialSubmission, true);

  assert.throws(
    () =>
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
            description: "Reclassified line",
            serviceTypeCode: "rot",
            workedHours: 8,
            laborCostAmount: 10000,
            materialAmount: 5000
          }
        ],
        actorId: "phase13-unit"
      }),
    (error) => error?.error === "hus_case_claim_fields_locked"
  );

  assert.throws(
    () =>
      hus.recordHusDecision({
        companyId: COMPANY_ID,
        husClaimId: claim.husClaimId,
        decisionDate: "2026-03-16",
        approvedAmount: 3000,
        reasonCode: "accepted",
        actorId: "phase13-unit"
      }),
    (error) => error?.error === "hus_claim_not_decidable"
  );

  hus.submitHusClaim({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId,
    submittedOn: "2026-03-16",
    actorId: "phase13-unit"
  });

  const decision = hus.recordHusDecision({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId,
    decisionDate: "2026-03-18",
    approvedAmount: 2500,
    rejectedAmount: 500,
    reasonCode: "partial_acceptance",
    rejectedOutcomeCode: "customer_reinvoice",
    actorId: "phase13-unit"
  });

  assert.throws(
    () =>
      hus.recordHusPayout({
        companyId: COMPANY_ID,
        husClaimId: claim.husClaimId,
        payoutDate: "2026-03-20",
        payoutAmount: 2500,
        actorId: "phase13-unit"
      }),
    (error) => error?.error === "hus_claim_difference_unresolved"
  );

  hus.resolveHusDecisionDifference({
    companyId: COMPANY_ID,
    husDecisionDifferenceId: decision.husDecisionDifference.husDecisionDifferenceId,
    resolutionCode: "customer_reinvoice",
    resolutionNote: "Customer reinvoiced.",
    actorId: "phase13-unit"
  });

  const payout = hus.recordHusPayout({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId,
    payoutDate: "2026-03-20",
    payoutAmount: 2500,
    actorId: "phase13-unit"
  });
  assert.equal(payout.husClaim.status, "paid_out");
});

test("Phase 13.1 supports XML HUS transport profiles", () => {
  const hus = createHusPlatform({
    clock: () => new Date("2026-03-24T08:00:00Z")
  });

  const husCase = hus.createHusCase({
    companyId: COMPANY_ID,
    caseReference: "HUS-13-XML-001",
    serviceTypeCode: "rut",
    workCompletedOn: "2026-03-10",
    housingFormCode: "household_other",
    serviceAddressLine1: "Rutgatan 1",
    executorFskattApproved: true,
    executorFskattValidatedOn: "2026-03-01",
    actorId: "phase13-unit"
  });

  hus.classifyHusCase({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    buyers: [
      {
        displayName: "Ruth Rutsson",
        personalIdentityNumber: "198001019994",
        allocationPercent: 100
      }
    ],
    serviceLines: [
      {
        description: "RUT cleaning",
        serviceTypeCode: "rut",
        workedHours: 5,
        laborCostAmount: 2000
      }
    ],
    actorId: "phase13-unit"
  });
  hus.markHusCaseInvoiced({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    invoiceNumber: "HUS-13-XML-INV-001",
    invoiceIssuedOn: "2026-03-11",
    actorId: "phase13-unit"
  });
  hus.recordHusCustomerPayment({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    paidAmount: 1000,
    paidOn: "2026-03-12",
    paymentChannel: "card",
    paymentReference: "CARD-HUS-13-XML-001",
    actorId: "phase13-unit"
  });

  const claim = hus.createHusClaim({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    transportType: "xml",
    actorId: "phase13-unit"
  });
  assert.equal(claim.transportProfile.deliveryChannelCode, "signed_xml");
  assert.equal(claim.transportProfile.supportsOfficialSubmission, true);
});
