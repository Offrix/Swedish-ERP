import test from "node:test";
import assert from "node:assert/strict";
import { createTaxAccountEngine } from "../../packages/domain-tax-account/src/index.mjs";

test("Step 9.5 manual classification resolves unmatched assessment discrepancy and clears blockers", () => {
  const engine = createTaxAccountEngine({
    clock: () => new Date("2026-03-28T09:00:00Z"),
    seedDemo: false
  });
  const companyId = "tax_account_phase95_manual";

  const importResult = engine.importTaxAccountEvents({
    companyId,
    importSource: "SKV_CSV",
    statementDate: "2026-03-28",
    events: [
      {
        eventTypeCode: "VAT_ASSESSMENT",
        eventDate: "2026-03-12",
        postingDate: "2026-03-12",
        amount: 9300,
        externalReference: "SKV-VAT-PHASE95-MANUAL",
        periodKey: "2026-02"
      }
    ],
    actorId: "phase95-user"
  });
  const reconciliation = engine.createTaxAccountReconciliation({
    companyId,
    actorId: "phase95-user"
  });
  assert.equal(reconciliation.discrepancyCaseIds.length, 1);
  assert.deepEqual(engine.getTaxAccountBalance({ companyId }).blockerCodes, ["tax_account_open_discrepancy"]);

  const expectedLiability = engine.registerExpectedTaxLiability({
    companyId,
    liabilityTypeCode: "VAT",
    sourceDomainCode: "VAT",
    sourceObjectType: "vat_declaration_run",
    sourceObjectId: "vat_run_phase95_2026_02",
    sourceReference: "VAT-PHASE95-2026-02",
    periodKey: "2026-02",
    dueDate: "2026-03-12",
    amount: 9300,
    actorId: "phase95-user"
  });

  const classified = engine.classifyTaxAccountEvent({
    companyId,
    taxAccountEventId: importResult.items[0].taxAccountEventId,
    reconciliationItemId: expectedLiability.reconciliationItemId,
    differenceCaseId: reconciliation.discrepancyCaseIds[0],
    resolutionNote: "Linked to registered VAT liability after SKV import review.",
    actorId: "phase95-user"
  });

  assert.equal(classified.event.mappingStatus, "mapped");
  assert.equal(classified.event.reconciliationStatus, "closed");
  assert.equal(classified.event.classificationCode, "MANUAL_FINANCE_CLASSIFICATION");
  assert.equal(classified.differenceCase.status, "resolved");
  assert.equal(classified.balance.openDifferenceCaseCount, 0);
  assert.deepEqual(classified.balance.blockerCodes, []);

  const liability = engine.getExpectedTaxLiability({
    companyId,
    reconciliationItemId: expectedLiability.reconciliationItemId
  });
  assert.equal(liability.status, "assessment_matched");
  assert.equal(liability.remainingSettlementAmount, 9300);
});

test("Step 9.5 discrepancy review and waiver close blockers without deleting case history", () => {
  const engine = createTaxAccountEngine({
    clock: () => new Date("2026-03-28T10:00:00Z"),
    seedDemo: false
  });
  const companyId = "tax_account_phase95_discrepancy";

  engine.importTaxAccountEvents({
    companyId,
    importSource: "SKV_CSV",
    statementDate: "2026-03-28",
    events: [
      {
        eventTypeCode: "FEE",
        eventDate: "2026-03-12",
        postingDate: "2026-03-12",
        amount: 500,
        externalReference: "SKV-FEE-PHASE95"
      }
    ],
    actorId: "phase95-user"
  });

  const reconciliation = engine.createTaxAccountReconciliation({
    companyId,
    actorId: "phase95-user"
  });
  const discrepancyCaseId = reconciliation.discrepancyCaseIds[0];
  assert.equal(engine.getTaxAccountBalance({ companyId }).readyForClose, false);

  const reviewed = engine.reviewTaxAccountDifferenceCase({
    companyId,
    discrepancyCaseId,
    reviewNote: "Confirmed unmatched fee and preparing waiver.",
    actorId: "phase95-user"
  });
  assert.equal(reviewed.status, "reviewed");

  const waived = engine.waiveTaxAccountDifferenceCase({
    companyId,
    discrepancyCaseId,
    waiverReasonCode: "manual_reconciliation_outside_platform",
    resolutionNote: "Legacy fee handled outside ERP during cutover.",
    actorId: "phase95-user"
  });
  assert.equal(waived.status, "waived");
  assert.equal(waived.waiverReasonCode, "MANUAL_RECONCILIATION_OUTSIDE_PLATFORM");

  const storedCase = engine.getTaxAccountDifferenceCase({
    companyId,
    discrepancyCaseId
  });
  assert.equal(storedCase.reviewNote, "Confirmed unmatched fee and preparing waiver.");
  assert.equal(storedCase.resolutionNote, "Legacy fee handled outside ERP during cutover.");
  assert.equal(engine.listOpenTaxAccountDifferenceCases({ companyId }).length, 0);

  const balance = engine.getTaxAccountBalance({ companyId });
  assert.equal(balance.readyForClose, true);
  assert.equal(balance.readyForFiling, true);
  assert.deepEqual(balance.blockerCodes, []);
});
