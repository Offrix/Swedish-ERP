import test from "node:test";
import assert from "node:assert/strict";
import { createBankingPlatform } from "../../packages/domain-banking/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 3.3 banking durable export stores bank identifiers and payment export payloads outside plain snapshot state", () => {
  const apPlatform = {
    getApOpenItem({ apOpenItemId }) {
      assert.equal(apOpenItemId, "ap-open-1");
      return {
        apOpenItemId,
        supplierInvoiceId: "supplier-invoice-1",
        status: "open",
        openAmount: 1250,
        dueOn: "2026-12-05"
      };
    },
    getSupplierInvoice({ supplierInvoiceId }) {
      assert.equal(supplierInvoiceId, "supplier-invoice-1");
      return {
        supplierInvoiceId,
        supplierId: "supplier-1",
        status: "posted",
        invoiceType: "invoice",
        currencyCode: "SEK",
        paymentReference: "LEV-2026-12"
      };
    },
    getSupplier({ supplierId }) {
      assert.equal(supplierId, "supplier-1");
      return {
        supplierId,
        legalName: "Leverantor AB",
        paymentRecipient: "Leverantor AB",
        bankgiro: "9876543210"
      };
    },
    reserveApOpenItem() {
      return {
        journalEntryId: "journal-reserve-1"
      };
    }
  };

  const platform = createBankingPlatform({
    clock: () => new Date("2026-12-02T09:00:00Z"),
    seedDemo: false,
    apPlatform
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

  const proposal = platform.createPaymentProposal({
    companyId: COMPANY_ID,
    bankAccountId: bankAccount.bankAccountId,
    apOpenItemIds: ["ap-open-1"],
    paymentDate: "2026-12-05",
    paymentRailCode: "bankgiro_file",
    actorId: "unit-test"
  });

  platform.approvePaymentProposal({
    companyId: COMPANY_ID,
    paymentProposalId: proposal.paymentProposalId,
    actorId: "unit-test"
  });

  const exported = platform.exportPaymentProposal({
    companyId: COMPANY_ID,
    paymentProposalId: proposal.paymentProposalId,
    actorId: "unit-test"
  });

  assert.match(exported.paymentBatch.exportPayload, /payee;account;amount;currency;due_date;reference/);
  assert.match(exported.paymentBatch.exportPayload, /9876543210/);

  const durableState = platform.exportDurableState();
  const serialized = JSON.stringify(durableState);

  assert.equal(serialized.includes("5566778899"), false);
  assert.equal(serialized.includes("9876543210"), false);
  assert.equal(serialized.includes("payee;account;amount;currency;due_date;reference"), false);
  assert.equal(serialized.includes("SEB"), true);

  const restoredPlatform = createBankingPlatform({
    clock: () => new Date("2026-12-02T09:00:00Z"),
    seedDemo: false,
    apPlatform
  });
  restoredPlatform.importDurableState(durableState);

  const restoredAccount = restoredPlatform.getBankAccount({
    companyId: COMPANY_ID,
    bankAccountId: bankAccount.bankAccountId
  });
  const restoredBatch = restoredPlatform.getPaymentBatch({
    companyId: COMPANY_ID,
    paymentBatchId: exported.paymentBatch.paymentBatchId
  });

  assert.equal(restoredAccount.accountNumber.endsWith("8899"), true);
  assert.equal(restoredAccount.last4, "8899");
  assert.match(restoredBatch.exportPayload, /9876543210/);
  assert.equal(restoredPlatform.listSecretStorePostures()[0].providerKind, "software_kms");
});
