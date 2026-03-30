import test from "node:test";
import assert from "node:assert/strict";
import { createBankingPlatform } from "../../packages/domain-banking/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 3.3 banking durable export stores company bank account identifiers outside plain snapshot state", () => {
  const platform = createBankingPlatform({
    clock: () => new Date("2026-12-02T09:00:00Z"),
    seedDemo: false
  });

  const bankAccount = platform.createBankAccount({
    companyId: COMPANY_ID,
    bankName: "SEB",
    ledgerAccountNumber: "1110",
    clearingNumber: "5000",
    accountNumber: "5566778899",
    currencyCode: "SEK",
    actorId: "unit-test"
  });

  const durableState = platform.exportDurableState();
  const serialized = JSON.stringify(durableState);

  assert.equal(serialized.includes("5566778899"), false);
  assert.equal(serialized.includes("SEB"), true);
  assert.equal(bankAccount.accountNumber.endsWith("8899"), true);

  const restoredPlatform = createBankingPlatform({
    clock: () => new Date("2026-12-02T09:00:00Z"),
    seedDemo: false
  });
  restoredPlatform.importDurableState(durableState);

  const restoredAccount = restoredPlatform.getBankAccount({
    companyId: COMPANY_ID,
    bankAccountId: bankAccount.bankAccountId
  });

  assert.equal(restoredAccount.accountNumber.endsWith("8899"), true);
  assert.equal(restoredAccount.last4, "8899");
  assert.equal(restoredPlatform.listSecretStorePostures()[0].providerKind, "software_kms");
});
