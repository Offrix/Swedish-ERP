import test from "node:test";
import assert from "node:assert/strict";
import { createTaxAccountEngine } from "../../packages/domain-tax-account/src/index.mjs";

test("Step 11 tax account imports idempotently, reconciles liabilities and approves offsets", () => {
  const engine = createTaxAccountEngine({
    clock: () => new Date("2026-03-24T10:00:00Z"),
    seedDemo: false
  });
  const companyId = "company_tax_1";

  const expectedLiability = engine.registerExpectedTaxLiability({
    companyId,
    liabilityTypeCode: "VAT",
    sourceDomainCode: "VAT",
    sourceObjectType: "vat_declaration_run",
    sourceObjectId: "vat_run_2026_02",
    sourceReference: "VAT-2026-02",
    periodKey: "2026-02",
    dueDate: "2026-03-12",
    amount: 12500,
    actorId: "user_1"
  });
  assert.equal(expectedLiability.remainingAssessmentAmount, 12500);
  assert.equal(expectedLiability.remainingSettlementAmount, 0);

  const importResult = engine.importTaxAccountEvents({
    companyId,
    importSource: "SKV_CSV",
    statementDate: "2026-03-24",
    events: [
      {
        eventTypeCode: "VAT_ASSESSMENT",
        eventDate: "2026-03-12",
        postingDate: "2026-03-12",
        amount: 12500,
        externalReference: "SKV-VAT-2026-02",
        sourceObjectType: "vat_declaration_run",
        sourceObjectId: "vat_run_2026_02",
        periodKey: "2026-02"
      },
      {
        eventTypeCode: "PAYMENT",
        eventDate: "2026-03-12",
        postingDate: "2026-03-12",
        amount: 12500,
        externalReference: "SKV-PAY-2026-03-12"
      }
    ],
    actorId: "user_1"
  });
  assert.equal(importResult.importBatch.importedCount, 2);

  const replayImport = engine.importTaxAccountEvents({
    companyId,
    importSource: "SKV_CSV",
    statementDate: "2026-03-24",
    events: [
      {
        eventTypeCode: "PAYMENT",
        eventDate: "2026-03-12",
        postingDate: "2026-03-12",
        amount: 12500,
        externalReference: "SKV-PAY-2026-03-12"
      }
    ],
    actorId: "user_1"
  });
  assert.equal(replayImport.importBatch.duplicateCount, 1);

  const reconciliation = engine.createTaxAccountReconciliation({
    companyId,
    actorId: "user_1"
  });
  assert.equal(reconciliation.suggestedOffsets.length, 1);
  assert.equal(reconciliation.suggestedOffsets[0].offsetAmount, 12500);

  const approvedOffset = engine.approveTaxAccountOffset({
    companyId,
    taxAccountEventId: reconciliation.suggestedOffsets[0].taxAccountEventId,
    reconciliationItemId: reconciliation.suggestedOffsets[0].reconciliationItemId,
    offsetAmount: reconciliation.suggestedOffsets[0].offsetAmount,
    offsetReasonCode: reconciliation.suggestedOffsets[0].offsetReasonCode,
    reconciliationRunId: reconciliation.reconciliationRunId,
    actorId: "user_1"
  });
  assert.equal(approvedOffset.status, "approved");

  const settledLiability = engine.getExpectedTaxLiability({
    companyId,
    reconciliationItemId: expectedLiability.reconciliationItemId
  });
  assert.equal(settledLiability.status, "settled");
  assert.equal(settledLiability.remainingSettlementAmount, 0);

  const balance = engine.getTaxAccountBalance({ companyId });
  assert.equal(balance.creditBalance, 12500);
  assert.equal(balance.debitBalance, 12500);
  assert.equal(balance.netBalance, 0);
  assert.equal(balance.openCreditAmount, 0);
  assert.equal(balance.openDifferenceCaseCount, 0);
});

test("Step 11 tax account opens discrepancy cases for unmatched assessments", () => {
  const engine = createTaxAccountEngine({
    clock: () => new Date("2026-03-24T11:00:00Z"),
    seedDemo: false
  });
  const companyId = "company_tax_2";

  engine.importTaxAccountEvents({
    companyId,
    importSource: "SKV_CSV",
    events: [
      {
        eventTypeCode: "AGI_ASSESSMENT",
        eventDate: "2026-03-12",
        postingDate: "2026-03-12",
        amount: 21000,
        externalReference: "SKV-AGI-2026-02",
        periodKey: "2026-02"
      }
    ],
    actorId: "user_2"
  });

  const reconciliation = engine.createTaxAccountReconciliation({
    companyId,
    actorId: "user_2"
  });

  assert.equal(reconciliation.discrepancyCaseIds.length, 1);
  const openCases = engine.listOpenTaxAccountDifferenceCases({ companyId });
  assert.equal(openCases.length, 1);
  assert.equal(openCases[0].differenceTypeCode, "ASSESSMENT_TARGET_MISSING");
});
