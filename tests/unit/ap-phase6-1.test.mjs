import test from "node:test";
import assert from "node:assert/strict";
import { createApEngine } from "../../packages/domain-ap/src/index.mjs";
import { createVatPlatform } from "../../packages/domain-vat/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 6.1 imports suppliers idempotently and flags bank-detail changes", () => {
  const vat = createVatPlatform({ seedDemo: true });
  const ap = createApEngine({
    clock: () => new Date("2026-09-01T08:00:00Z"),
    vatPlatform: vat
  });

  const firstBatch = ap.importSuppliers({
    companyId: COMPANY_ID,
    batchKey: "suppliers-1",
    suppliers: [
      {
        supplierNo: "SUP1001",
        legalName: "Nordic Supplier AB",
        countryCode: "SE",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        paymentRecipient: "Nordic Supplier AB",
        bankgiro: "1234-5678",
        defaultExpenseAccountNumber: "4010",
        defaultVatCode: "VAT_SE_DOMESTIC_25"
      }
    ]
  });
  const replayBatch = ap.importSuppliers({
    companyId: COMPANY_ID,
    batchKey: "suppliers-1",
    suppliers: [
      {
        supplierNo: "SUP1001",
        legalName: "Nordic Supplier AB",
        countryCode: "SE",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        paymentRecipient: "Nordic Supplier AB",
        bankgiro: "1234-5678",
        defaultExpenseAccountNumber: "4010",
        defaultVatCode: "VAT_SE_DOMESTIC_25"
      }
    ]
  });
  const updateBatch = ap.importSuppliers({
    companyId: COMPANY_ID,
    batchKey: "suppliers-2",
    suppliers: [
      {
        supplierNo: "SUP1001",
        legalName: "Nordic Supplier AB Updated",
        countryCode: "SE",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        paymentRecipient: "Nordic Supplier AB Updated",
        bankgiro: "7654-3210"
      }
    ]
  });

  const suppliers = ap.listSuppliers({ companyId: COMPANY_ID });
  assert.equal(firstBatch.summary.created, 1);
  assert.equal(replayBatch.supplierImportBatchId, firstBatch.supplierImportBatchId);
  assert.equal(updateBatch.summary.updated, 1);
  assert.equal(suppliers.length, 1);
  assert.equal(suppliers[0].paymentBlocked, true);
});

test("Phase 6.1 purchase orders inherit defaults and receipts enforce duplicate protection", () => {
  const vat = createVatPlatform({ seedDemo: true });
  const ap = createApEngine({
    clock: () => new Date("2026-09-05T08:00:00Z"),
    vatPlatform: vat
  });

  const supplier = ap.createSupplier({
    companyId: COMPANY_ID,
    supplierNo: "SUP2001",
    legalName: "Build Material AB",
    countryCode: "SE",
    currencyCode: "SEK",
    paymentTermsCode: "NET20",
    paymentRecipient: "Build Material AB",
    bankgiro: "1234567",
    defaultExpenseAccountNumber: "4010",
    defaultVatCode: "VAT_SE_DOMESTIC_25",
    defaultUnitPrice: 250
  });
  const purchaseOrder = ap.createPurchaseOrder({
    companyId: COMPANY_ID,
    supplierId: supplier.supplierId,
    requesterUserId: "user-1",
    lines: [
      {
        description: "Plywood",
        quantityOrdered: 10
      }
    ]
  });

  assert.equal(purchaseOrder.lines[0].expenseAccountNumber, "4010");
  assert.equal(purchaseOrder.lines[0].unitPrice, 250);
  assert.throws(
    () =>
      ap.transitionPurchaseOrderStatus({
        companyId: COMPANY_ID,
        purchaseOrderId: purchaseOrder.purchaseOrderId,
        targetStatus: "sent",
        actorId: "user-1"
      }),
    /draft to sent/
  );

  ap.transitionPurchaseOrderStatus({
    companyId: COMPANY_ID,
    purchaseOrderId: purchaseOrder.purchaseOrderId,
    targetStatus: "approved",
    actorId: "user-1"
  });
  ap.transitionPurchaseOrderStatus({
    companyId: COMPANY_ID,
    purchaseOrderId: purchaseOrder.purchaseOrderId,
    targetStatus: "sent",
    actorId: "user-1"
  });

  const receipt = ap.createReceipt({
    companyId: COMPANY_ID,
    purchaseOrderId: purchaseOrder.purchaseOrderId,
    receiptDate: "2026-09-05",
    receiverActorId: "user-1",
    supplierInvoiceReference: "SUP-INV-1",
    externalReceiptRef: "DEL-1",
    lines: [
      {
        purchaseOrderLineId: purchaseOrder.lines[0].purchaseOrderLineId,
        receivedQuantity: 4
      }
    ]
  });
  const duplicate = ap.createReceipt({
    companyId: COMPANY_ID,
    purchaseOrderId: purchaseOrder.purchaseOrderId,
    receiptDate: "2026-09-05",
    receiverActorId: "user-1",
    supplierInvoiceReference: "SUP-INV-1",
    externalReceiptRef: "DEL-1",
    lines: [
      {
        purchaseOrderLineId: purchaseOrder.lines[0].purchaseOrderLineId,
        receivedQuantity: 4
      }
    ]
  });

  const refreshedPurchaseOrder = ap.getPurchaseOrder({
    companyId: COMPANY_ID,
    purchaseOrderId: purchaseOrder.purchaseOrderId
  });
  assert.equal(duplicate.apReceiptId, receipt.apReceiptId);
  assert.equal(refreshedPurchaseOrder.status, "partially_received");
  assert.equal(refreshedPurchaseOrder.lines[0].receivedQuantity, 4);
});

test("Phase 6.1 receipts block cumulative overdelivery beyond the configured tolerance", () => {
  const vat = createVatPlatform({ seedDemo: true });
  const ap = createApEngine({
    clock: () => new Date("2026-09-10T09:00:00Z"),
    vatPlatform: vat
  });

  const supplier = ap.createSupplier({
    companyId: COMPANY_ID,
    legalName: "Tolerance Supplier AB",
    countryCode: "SE",
    currencyCode: "SEK",
    paymentTermsCode: "NET30",
    paymentRecipient: "Tolerance Supplier AB",
    bankgiro: "2222-3333",
    defaultExpenseAccountNumber: "4010"
  });
  const purchaseOrder = ap.createPurchaseOrder({
    companyId: COMPANY_ID,
    supplierId: supplier.supplierId,
    requesterUserId: "user-1",
    lines: [
      {
        description: "Consulting",
        quantityOrdered: 10,
        unitPrice: 1000,
        overdeliveryTolerancePercent: 5
      }
    ]
  });
  ap.transitionPurchaseOrderStatus({
    companyId: COMPANY_ID,
    purchaseOrderId: purchaseOrder.purchaseOrderId,
    targetStatus: "approved",
    actorId: "user-1"
  });

  assert.throws(
    () =>
      ap.createReceipt({
        companyId: COMPANY_ID,
        purchaseOrderId: purchaseOrder.purchaseOrderId,
        receiptDate: "2026-09-10",
        receiverActorId: "user-1",
        lines: [
          {
            purchaseOrderLineId: purchaseOrder.lines[0].purchaseOrderLineId,
            receivedQuantity: 10.6
          }
        ]
      }),
    /overdelivery/
  );
});
