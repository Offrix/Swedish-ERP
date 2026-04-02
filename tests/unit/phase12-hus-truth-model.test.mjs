import test from "node:test";
import assert from "node:assert/strict";
import { createHusPlatform } from "../../packages/domain-hus/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 12.1 carries VAT-inclusive labor truth and buyer evidence through HUS readiness and claim payloads", () => {
  const hus = createHusPlatform({
    clock: () => new Date("2026-04-01T08:00:00Z")
  });

  const husCase = hus.createHusCase({
    companyId: COMPANY_ID,
    caseReference: "HUS-12-TRUTH-001",
    serviceTypeCode: "rot",
    workCompletedOn: "2026-03-10",
    housingFormCode: "smallhouse",
    propertyDesignation: "UPPSALA SUNNERSTA 1:31",
    executorFskattApproved: true,
    executorFskattValidatedOn: "2026-03-01",
    actorId: "phase12-unit"
  });

  const classified = hus.classifyHusCase({
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
        description: "ROT labor with explicit VAT basis",
        serviceTypeCode: "rot",
        workedHours: 8,
        laborCostInclVatAmount: 12500,
        laborCostExVatAmount: 10000,
        vatAmount: 2500,
        materialAmount: 5000
      }
    ],
    actorId: "phase12-unit"
  });

  assert.equal(classified.status, "draft");
  assert.equal(classified.totalLaborCostInclVatAmount, 12500);
  assert.equal(classified.totalLaborCostExVatAmount, 10000);
  assert.equal(classified.totalVatAmount, 2500);
  assert.equal(classified.preliminaryReductionAmount, 3750);
  assert.equal(classified.customerShareAmount, 13750);
  assert.equal(classified.serviceLines[0].rulepackRef.rateWindowCode, "2026_standard");
  assert.match(classified.buyers[0].buyerIdentityRef, /^hus-buyer-identity:/);
  assert.equal(classified.buyers[0].identityValidationStatus, "validated");
  assert.equal(classified.buyers[0].buyerIdentityMaskedValue, "******9991");

  hus.markHusCaseInvoiced({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    invoiceNumber: "HUS-12-TRUTH-INV-001",
    invoiceIssuedOn: "2026-03-11",
    actorId: "phase12-unit"
  });

  hus.recordHusCustomerPayment({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    paidAmount: 13750,
    paidOn: "2026-03-12",
    paymentChannel: "bankgiro",
    paymentReference: "BG-HUS-12-TRUTH-001",
    actorId: "phase12-unit"
  });

  const readiness = hus.evaluateHusCaseReadiness({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId
  });
  assert.equal(readiness.status, "ready");
  assert.equal(readiness.claimReadyState, "claim_ready");
  assert.equal(readiness.activeRulepackRef.rateWindowCode, "2026_standard");
  assert.equal(readiness.paymentWindowSummaries.length, 1);
  assert.equal(readiness.paymentWindowSummaries[0].reductionRate, 0.3);
  assert.equal(readiness.buyerCapacities[0].buyerIdentityRef, classified.buyers[0].buyerIdentityRef);
  assert.equal(readiness.buyerCapacities[0].remainingAnnualCapAmount, 75000);
  assert.equal(readiness.claimReadyEvidenceRefs.includes(classified.buyers[0].buyerIdentityRef), true);

  const claim = hus.createHusClaim({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    actorId: "phase12-unit"
  });
  const payload = claim.versions.at(-1).payloadJson;

  assert.equal(claim.claimReadyState, "claim_ready");
  assert.equal(claim.rulepackRef.rateWindowCode, "2026_standard");
  assert.equal(claim.paymentAllocations[0].reductionRate, 0.3);
  assert.equal(claim.buyerAllocations[0].buyerIdentityRef, classified.buyers[0].buyerIdentityRef);
  assert.equal(claim.buyerAllocations[0].remainingAnnualCapAmountAfterClaim, 71250);
  assert.equal(payload.laborCostInclVatAmount, 12500);
  assert.equal(payload.laborCostExVatAmount, 10000);
  assert.equal(payload.vatAmount, 2500);
  assert.equal(payload.claimReadyState, "claim_ready");
  assert.equal(payload.activeRulepackRef.rateWindowCode, "2026_standard");
  assert.equal(payload.buyers[0].buyerIdentityRef, classified.buyers[0].buyerIdentityRef);
  assert.equal(payload.buyerAllocations[0].buyerIdentityRef, classified.buyers[0].buyerIdentityRef);
  assert.equal(payload.paymentWindowSummaries[0].rulepackRef.rateWindowCode, "2026_standard");
});

test("Phase 12.1 rejects invalid buyer identities by checksum and calendar date", () => {
  const hus = createHusPlatform({
    clock: () => new Date("2026-04-01T08:00:00Z")
  });

  const invalidDateIdentity = buildIdentityNumberWithValidChecksum("850230123");

  const checksumCase = hus.createHusCase({
    companyId: COMPANY_ID,
    caseReference: "HUS-12-TRUTH-002",
    serviceTypeCode: "rot",
    workCompletedOn: "2026-03-10",
    housingFormCode: "smallhouse",
    propertyDesignation: "UPPSALA SUNNERSTA 1:32",
    executorFskattApproved: true,
    executorFskattValidatedOn: "2026-03-01",
    actorId: "phase12-unit"
  });

  assert.throws(
    () =>
      hus.classifyHusCase({
        companyId: COMPANY_ID,
        husCaseId: checksumCase.husCaseId,
        buyers: [
          {
            displayName: "Anna Andersson",
            personalIdentityNumber: "197501019992",
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
        actorId: "phase12-unit"
      }),
    (error) => error?.error === "hus_buyer_identity_required" && /checksum/i.test(error.message)
  );

  const invalidDateCase = hus.createHusCase({
    companyId: COMPANY_ID,
    caseReference: "HUS-12-TRUTH-003",
    serviceTypeCode: "rot",
    workCompletedOn: "2026-03-10",
    housingFormCode: "smallhouse",
    propertyDesignation: "UPPSALA SUNNERSTA 1:33",
    executorFskattApproved: true,
    executorFskattValidatedOn: "2026-03-01",
    actorId: "phase12-unit"
  });

  assert.throws(
    () =>
      hus.classifyHusCase({
        companyId: COMPANY_ID,
        husCaseId: invalidDateCase.husCaseId,
        buyers: [
          {
            displayName: "Anna Andersson",
            personalIdentityNumber: invalidDateIdentity,
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
        actorId: "phase12-unit"
      }),
    /date part is invalid/i
  );
});

test("Phase 12.1 keeps invoice truth pinned and requires explicit claim rulepack when HUS payments span rate windows", () => {
  const hus = createHusPlatform({
    clock: () => new Date("2025-05-25T08:00:00Z")
  });

  const husCase = hus.createHusCase({
    companyId: COMPANY_ID,
    caseReference: "HUS-12-TRUTH-004",
    serviceTypeCode: "rot",
    workCompletedOn: "2025-05-01",
    ruleYear: 2025,
    housingFormCode: "smallhouse",
    propertyDesignation: "UPPSALA SUNNERSTA 1:34",
    executorFskattApproved: true,
    executorFskattValidatedOn: "2025-04-20",
    actorId: "phase12-unit"
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
        description: "ROT labor across 2025 rate windows",
        serviceTypeCode: "rot",
        workedHours: 8,
        laborCostAmount: 10000
      }
    ],
    actorId: "phase12-unit"
  });

  hus.markHusCaseInvoiced({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    invoiceNumber: "HUS-12-TRUTH-INV-004",
    invoiceIssuedOn: "2025-05-02",
    invoiceGrossAmount: 10000,
    invoiceLaborAmount: 10000,
    invoicePreliminaryReductionAmount: 3000,
    invoiceCustomerShareAmount: 7000,
    actorId: "phase12-unit"
  });

  hus.recordHusCustomerPayment({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    paidAmount: 3500,
    paidOn: "2025-05-10",
    paymentChannel: "bankgiro",
    paymentReference: "BG-HUS-12-TRUTH-004A",
    actorId: "phase12-unit"
  });
  hus.recordHusCustomerPayment({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    paidAmount: 2500,
    paidOn: "2025-05-20",
    paymentChannel: "swish",
    paymentReference: "SW-HUS-12-TRUTH-004B",
    actorId: "phase12-unit"
  });

  const persistedCase = hus.getHusCase({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId
  });
  assert.equal(persistedCase.invoiceGateStatus, "passed");
  assert.equal(persistedCase.preliminaryReductionAmount, 3000);
  assert.equal(persistedCase.customerShareAmount, 7000);

  const readiness = hus.evaluateHusCaseReadiness({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId
  });
  assert.equal(readiness.status, "blocked");
  assert.equal(readiness.claimReadyState, "draft");
  assert.deepEqual(
    readiness.blockerCodes.filter((code) => code === "hus_multiple_rate_windows_pending"),
    ["hus_multiple_rate_windows_pending"]
  );
  assert.equal(readiness.paymentWindowSummaries.length, 2);
  assert.deepEqual(
    readiness.paymentWindowSummaries.map((window) => ({
      rulepackId: window.rulepackId,
      reductionRate: window.reductionRate,
      remainingReductionAmount: window.remainingReductionAmount
    })),
    [
      {
        rulepackId: "hus-se-2025.1",
        reductionRate: 0.3,
        remainingReductionAmount: 1500
      },
      {
        rulepackId: "hus-se-2025.2",
        reductionRate: 0.5,
        remainingReductionAmount: 2500
      }
    ]
  );

  assert.throws(
    () =>
      hus.createHusClaim({
        companyId: COMPANY_ID,
        husCaseId: husCase.husCaseId,
        actorId: "phase12-unit"
      }),
    (error) => error?.error === "hus_claim_not_ready" && /hus_multiple_rate_windows_pending/.test(error.message)
  );

  const selectedClaim = hus.createHusClaim({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    claimRulepackId: "hus-se-2025.1",
    actorId: "phase12-unit"
  });
  assert.equal(selectedClaim.requestedAmount, 1500);
  assert.equal(selectedClaim.rulepackRef.rateWindowCode, "2025_standard");
  assert.equal(selectedClaim.paymentAllocations.length, 1);
  assert.equal(selectedClaim.paymentAllocations[0].reductionRate, 0.3);
  assert.equal(selectedClaim.paymentAllocations[0].rulepackRef.rulepackId, "hus-se-2025.1");
});

function buildIdentityNumberWithValidChecksum(prefix) {
  const digits = String(prefix).replace(/\D/g, "");
  assert.equal(digits.length, 9);
  for (let checkDigit = 0; checkDigit <= 9; checkDigit += 1) {
    const candidate = `${digits}${checkDigit}`;
    if (isValidLuhn(candidate)) {
      return candidate;
    }
  }
  throw new Error("Unable to build a valid checksum test identity number.");
}

function isValidLuhn(digits) {
  let sum = 0;
  for (let index = 0; index < digits.length - 1; index += 1) {
    let digit = Number(digits[index]);
    digit *= index % 2 === 0 ? 2 : 1;
    if (digit > 9) {
      digit -= 9;
    }
    sum += digit;
  }
  const controlDigit = Number(digits.at(-1));
  return (sum + controlDigit) % 10 === 0;
}
