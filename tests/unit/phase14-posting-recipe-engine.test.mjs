import test from "node:test";
import assert from "node:assert/strict";
import { createLedgerEngine } from "../../packages/domain-ledger/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 8.4 posting recipe registry covers the signal matrix for core regulated posting areas", () => {
  const engine = createLedgerEngine({
    clock: () => new Date("2026-03-28T10:00:00Z"),
    seedDemo: false
  });

  const codes = engine.listPostingRecipes().map((recipe) => recipe.recipeCode);
  for (const expectedCode of [
    "AR_INVOICE",
    "AR_CREDIT_NOTE",
    "AP_INVOICE",
    "AP_PAYMENT_SETTLEMENT",
    "PAYROLL_RUN",
    "PAYROLL_PAYOUT_MATCH",
    "BANK_STATEMENT_MATCH",
    "TAX_ACCOUNT_CLASSIFIED_EVENT",
    "HUS_CLAIM_ACCEPTED",
    "YEAR_END_ADJUSTMENT"
  ]) {
    assert.equal(codes.includes(expectedCode), true);
  }
});

test("Phase 8.4 applyPostingIntent stamps recipe metadata and blocks missing versions or source mismatches", () => {
  const engine = createLedgerEngine({
    clock: () => new Date("2026-03-28T10:30:00Z"),
    seedDemo: false
  });
  engine.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "unit-test"
  });
  engine.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "unit-test"
  });

  const applied = engine.applyPostingIntent({
    companyId: COMPANY_ID,
    journalDate: "2026-03-28",
    recipeCode: "AR_INVOICE",
    sourceType: "AR_INVOICE",
    sourceId: "phase8-4-ar-invoice",
    sourceObjectVersion: "invoice:v1",
    actorId: "unit-test",
    idempotencyKey: "phase8-4-ar-invoice",
    description: "Posting recipe smoke test",
    lines: [
      {
        accountNumber: "1210",
        debitAmount: 1250
      },
      {
        accountNumber: "3010",
        creditAmount: 1000
      },
      {
        accountNumber: "2610",
        creditAmount: 250
      }
    ]
  });

  assert.equal(applied.journalEntry.status, "posted");
  assert.equal(applied.journalEntry.metadataJson.postingRecipeCode, "AR_INVOICE");
  assert.equal(applied.journalEntry.metadataJson.postingRecipeVersion, "2026.1");
  assert.equal(applied.journalEntry.metadataJson.postingSignalCode, "ar.invoice.issued");
  assert.equal(applied.journalEntry.metadataJson.journalType, "operational_posting");
  assert.equal(applied.journalEntry.metadataJson.sourceDomain, "ar");
  assert.equal(applied.journalEntry.metadataJson.sourceObjectVersion, "invoice:v1");

  assert.throws(
    () =>
      engine.applyPostingIntent({
        companyId: COMPANY_ID,
        journalDate: "2026-03-28",
        recipeCode: "AR_INVOICE",
        sourceType: "AP_INVOICE",
        sourceId: "phase8-4-bad-source",
        sourceObjectVersion: "bad-source:v1",
        actorId: "unit-test",
        idempotencyKey: "phase8-4-bad-source",
        description: "Posting recipe mismatch",
        lines: [
          {
            accountNumber: "1210",
            debitAmount: 100
          },
          {
            accountNumber: "3010",
            creditAmount: 100
          }
        ]
      }),
    /does not allow source type/i
  );

  assert.throws(
    () =>
      engine.applyPostingIntent({
        companyId: COMPANY_ID,
        journalDate: "2026-03-28",
        recipeCode: "AR_INVOICE",
        sourceType: "AR_INVOICE",
        sourceId: "phase8-4-missing-version",
        actorId: "unit-test",
        idempotencyKey: "phase8-4-missing-version",
        description: "Missing source version",
        lines: [
          {
            accountNumber: "1210",
            debitAmount: 100
          },
          {
            accountNumber: "3010",
            creditAmount: 100
          }
        ]
      }),
    /source object version/i
  );
});
