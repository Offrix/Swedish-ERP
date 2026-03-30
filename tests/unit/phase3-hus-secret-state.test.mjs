import test from "node:test";
import assert from "node:assert/strict";
import { createHusPlatform } from "../../packages/domain-hus/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const BUYER_IDENTITY = "197501019991";

test("Phase 3.3 HUS durable export stores buyer identities outside plain snapshot state", () => {
  const hus = createHusPlatform({
    clock: () => new Date("2026-03-24T08:00:00Z")
  });

  const husCase = hus.createHusCase({
    companyId: COMPANY_ID,
    caseReference: "HUS-3-SECRET-001",
    serviceTypeCode: "rot",
    workCompletedOn: "2026-03-10",
    housingFormCode: "smallhouse",
    propertyDesignation: "UPPSALA SUNNERSTA 1:55",
    executorFskattApproved: true,
    executorFskattValidatedOn: "2026-03-01",
    actorId: "unit-test"
  });

  hus.classifyHusCase({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    buyers: [
      {
        displayName: "Anna Andersson",
        personalIdentityNumber: BUYER_IDENTITY,
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

  hus.markHusCaseInvoiced({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    invoiceNumber: "HUS-3-SECRET-INV-001",
    invoiceIssuedOn: "2026-03-11",
    actorId: "unit-test"
  });

  hus.recordHusCustomerPayment({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    paidAmount: 12000,
    paidOn: "2026-03-15",
    paymentChannel: "bankgiro",
    paymentReference: "BG-HUS-3-SECRET-001",
    actorId: "unit-test"
  });

  const claim = hus.createHusClaim({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    transportType: "direct_api",
    actorId: "unit-test"
  });

  const runtimeBuyerIdentity = claim.buyerAllocations[0].personalIdentityNumber;
  assert.ok(runtimeBuyerIdentity);

  const durableState = hus.exportDurableState();
  const serialized = JSON.stringify(durableState);

  assert.equal(serialized.includes(BUYER_IDENTITY), false);
  assert.equal(serialized.includes(runtimeBuyerIdentity), false);
  assert.match(serialized, /\*+9991/u);
  assert.ok(Array.isArray(durableState.secretStoreBundle?.entries));
  assert.ok(durableState.secretStoreBundle.entries.length > 0);

  const restoredHus = createHusPlatform({
    clock: () => new Date("2026-03-24T08:00:00Z")
  });
  restoredHus.importDurableState(durableState);

  const restoredCase = restoredHus.getHusCase({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId
  });
  const restoredClaim = restoredHus.getHusClaim({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId
  });

  assert.equal(restoredCase.buyers[0].personalIdentityNumber, runtimeBuyerIdentity);
  assert.equal(restoredClaim.buyerAllocations[0].personalIdentityNumber, runtimeBuyerIdentity);

  restoredHus.submitHusClaim({
    companyId: COMPANY_ID,
    husClaimId: claim.husClaimId,
    submittedOn: "2026-03-16",
    actorId: "unit-test"
  });

  const resnapshot = JSON.stringify(restoredHus.exportDurableState());
  assert.equal(resnapshot.includes(BUYER_IDENTITY), false);
  assert.equal(resnapshot.includes(runtimeBuyerIdentity), false);
});
