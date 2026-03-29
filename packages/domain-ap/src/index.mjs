import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";
import { createVatPlatform } from "../../domain-vat/src/index.mjs";
import {
  applyDurableStateSnapshot,
  serializeDurableState
} from "../../domain-core/src/state-snapshots.mjs";

export const AP_SUPPLIER_STATUSES = Object.freeze(["draft", "active", "blocked", "archived"]);
export const AP_PURCHASE_ORDER_STATUSES = Object.freeze([
  "draft",
  "approved",
  "sent",
  "partially_received",
  "fully_received",
  "closed",
  "cancelled"
]);
export const AP_RECEIPT_TARGET_TYPES = Object.freeze(["expense", "asset", "inventory", "project_material"]);
export const AP_SUPPLIER_INVOICE_STATUSES = Object.freeze([
  "draft",
  "matching",
  "pending_approval",
  "approved",
  "posted",
  "scheduled_for_payment",
  "paid",
  "credited",
  "voided"
]);
export const AP_SUPPLIER_INVOICE_TYPES = Object.freeze(["standard", "credit_note"]);
export const AP_SUPPLIER_INVOICE_DUPLICATE_STATUSES = Object.freeze([
  "not_checked",
  "exact_duplicate",
  "suspect_duplicate",
  "cleared"
]);
export const AP_MATCH_VARIANCE_STATUSES = Object.freeze(["open", "accepted", "corrected", "closed"]);
export const AP_MATCH_MODES = Object.freeze(["none", "two_way", "three_way"]);

const DEFAULT_PURCHASE_ORDER_PREFIX = "PO";
const DEFAULT_SUPPLIER_PREFIX = "SUP";
const DEFAULT_INVOICE_PREFIX = "APINV";
const DEFAULT_CREDIT_NOTE_PREFIX = "APCRN";
const DEFAULT_LIABILITY_ACCOUNT_BY_REGION = Object.freeze({
  SE: "2410",
  EU: "2420",
  NON_EU: "2430"
});
const DEFAULT_VAT_ACCOUNT_BY_EFFECT = Object.freeze({
  input_vat: "2640",
  output_vat: "2650"
});
const DEFAULT_TOLERANCE_PROFILES = Object.freeze({
  standard: {
    priceTolerancePercent: 2,
    quantityTolerancePercent: 2,
    totalToleranceAmount: 50,
    autoAcceptWithinTolerance: true
  },
  strict: {
    priceTolerancePercent: 0,
    quantityTolerancePercent: 0,
    totalToleranceAmount: 0,
    autoAcceptWithinTolerance: false
  }
});
const EU_COUNTRY_CODES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE"
]);

export function createApPlatform(options = {}) {
  return createApEngine(options);
}

export function createApEngine({
  clock = () => new Date(),
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null,
  vatPlatform = createVatPlatform({ clock, seedDemo: true }),
  ledgerPlatform = null,
  documentPlatform = null,
  orgAuthPlatform = null,
  documentClassificationPlatform = null,
  importCasesPlatform = null,
  getDocumentClassificationPlatform = null,
  getImportCasesPlatform = null
} = {}) {
  const state = {
    suppliers: new Map(),
    supplierIdsByCompany: new Map(),
    supplierIdsByCompanyNo: new Map(),
    supplierIdsByCompanyImportSource: new Map(),
    purchaseOrders: new Map(),
    purchaseOrderIdsByCompany: new Map(),
    purchaseOrderIdsByCompanyNo: new Map(),
    purchaseOrderIdsByCompanyImportSource: new Map(),
    receipts: new Map(),
    receiptIdsByCompany: new Map(),
    receiptIdsByCompanyKey: new Map(),
    supplierImportBatches: new Map(),
    supplierImportBatchIdsByCompanyKey: new Map(),
    purchaseOrderImportBatches: new Map(),
    purchaseOrderImportBatchIdsByCompanyKey: new Map(),
    supplierInvoices: new Map(),
    supplierInvoiceIdsByCompany: new Map(),
    supplierInvoiceIdsByCompanyRef: new Map(),
    supplierInvoiceIdsByCompanyDocument: new Map(),
    supplierInvoiceIdsByCompanyFingerprint: new Map(),
    supplierInvoiceMatchRuns: new Map(),
    supplierInvoiceMatchRunIdsByCompany: new Map(),
    supplierInvoiceVarianceIdsByInvoice: new Map(),
    supplierInvoiceVariances: new Map(),
    apOpenItems: new Map(),
    apOpenItemIdsByCompany: new Map(),
    countersByCompany: new Map(),
    auditEvents: []
  };

  if (seedDemo) {
    seedDemoState();
  }

  return {
    supplierStatuses: AP_SUPPLIER_STATUSES,
    purchaseOrderStatuses: AP_PURCHASE_ORDER_STATUSES,
    receiptTargetTypes: AP_RECEIPT_TARGET_TYPES,
    supplierInvoiceStatuses: AP_SUPPLIER_INVOICE_STATUSES,
    supplierInvoiceTypes: AP_SUPPLIER_INVOICE_TYPES,
    duplicateStatuses: AP_SUPPLIER_INVOICE_DUPLICATE_STATUSES,
    matchModes: AP_MATCH_MODES,
    listSuppliers,
    getSupplier,
    createSupplier,
    transitionSupplierStatus,
    importSuppliers,
    getSupplierImportBatch,
    listPurchaseOrders,
    getPurchaseOrder,
    createPurchaseOrder,
    transitionPurchaseOrderStatus,
    importPurchaseOrders,
    getPurchaseOrderImportBatch,
    listReceipts,
    getReceipt,
    createReceipt,
    listSupplierInvoices,
    getSupplierInvoice,
    listApOpenItems,
    getApOpenItem,
    getApPaymentPreparation,
    ingestSupplierInvoice,
    createSupplierCreditNote,
    runSupplierInvoiceMatch,
    approveSupplierInvoice,
    postSupplierInvoice,
    reserveApOpenItem,
    releaseApOpenItemReservation,
    settleApOpenItem,
    reopenApOpenItem,
    snapshotAp,
    exportDurableState,
    importDurableState
  };

  function listSuppliers({ companyId, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.supplierIdsByCompany.get(resolvedCompanyId) || [])
      .map((supplierId) => state.suppliers.get(supplierId))
      .filter(Boolean)
      .filter((supplier) => !status || supplier.status === status)
      .sort((left, right) => left.supplierNo.localeCompare(right.supplierNo))
      .map(copy);
  }

  function getSupplier({ companyId, supplierId } = {}) {
    return copy(requireSupplierRecord(state, companyId, supplierId));
  }

  function createSupplier({
    companyId,
    supplierNo = null,
    legalName,
    organizationNumber = null,
    vatNumber = null,
    countryCode,
    currencyCode,
    paymentTermsCode,
    paymentRecipient = null,
    bankgiro = null,
    plusgiro = null,
    iban = null,
    bic = null,
    defaultExpenseAccountNumber = null,
    defaultVatCode = null,
    defaultDimensions = {},
    defaultUnitPrice = null,
    paymentBlocked = false,
    bookingBlocked = false,
    riskClassCode = "standard",
    attestChainId = null,
    requiresPo = true,
    requiresReceipt = false,
    allowCreditWithoutLink = false,
    reverseChargeDefault = false,
    status = "active",
    importSourceKey = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedSupplierNo = resolveSequenceOrValue({
      state,
      companyId: resolvedCompanyId,
      sequenceKey: "supplier",
      prefix: DEFAULT_SUPPLIER_PREFIX,
      value: supplierNo,
      requiredCode: "supplier_no_required"
    });
    ensureSupplierNoUnique(state, resolvedCompanyId, resolvedSupplierNo);
    const normalizedImportSourceKey = normalizeOptionalText(importSourceKey);
    if (normalizedImportSourceKey) {
      ensureSupplierImportSourceUnique(state, resolvedCompanyId, normalizedImportSourceKey);
    }

    const bankDetails = normalizeSupplierBankDetails({
      bankgiro,
      plusgiro,
      iban,
      bic,
      paymentRecipient
    });
    const record = {
      supplierId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      supplierNo: resolvedSupplierNo,
      legalName: requireText(legalName, "supplier_legal_name_required"),
      organizationNumber: normalizeOptionalText(organizationNumber),
      vatNumber: normalizeOptionalText(vatNumber),
      countryCode: normalizeUpperCode(countryCode, "country_code_required", 2),
      currencyCode: normalizeUpperCode(currencyCode, "currency_code_required", 3),
      paymentTermsCode: requireText(paymentTermsCode, "payment_terms_code_required"),
      paymentRecipient: bankDetails.paymentRecipient,
      bankgiro: bankDetails.bankgiro,
      plusgiro: bankDetails.plusgiro,
      iban: bankDetails.iban,
      bic: bankDetails.bic,
      defaultExpenseAccountNumber: normalizeOptionalAccountNumber(defaultExpenseAccountNumber),
      defaultVatCode: ensureOptionalVatCodeExists(vatPlatform, resolvedCompanyId, defaultVatCode),
      defaultDimensionsJson: normalizeDimensions(defaultDimensions),
      defaultUnitPrice: normalizeOptionalMoney(defaultUnitPrice, "supplier_default_unit_price_invalid"),
      paymentBlocked: paymentBlocked === true,
      bookingBlocked: bookingBlocked === true,
      riskClassCode: requireText(riskClassCode, "supplier_risk_class_required"),
      attestChainId: normalizeOptionalText(attestChainId),
      requiresPo: requiresPo !== false,
      requiresReceipt: requiresReceipt === true,
      allowCreditWithoutLink: allowCreditWithoutLink === true,
      reverseChargeDefault: reverseChargeDefault === true,
      status: assertAllowed(status, AP_SUPPLIER_STATUSES, "supplier_status_invalid"),
      importSourceKey: normalizedImportSourceKey,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.suppliers.set(record.supplierId, record);
    ensureCollection(state.supplierIdsByCompany, resolvedCompanyId).push(record.supplierId);
    state.supplierIdsByCompanyNo.set(toCompanyScopedKey(resolvedCompanyId, resolvedSupplierNo), record.supplierId);
    if (normalizedImportSourceKey) {
      state.supplierIdsByCompanyImportSource.set(toCompanyScopedKey(resolvedCompanyId, normalizedImportSourceKey), record.supplierId);
    }
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "ap.supplier.created",
      entityType: "ap_supplier",
      entityId: record.supplierId,
      explanation: `Created supplier ${resolvedSupplierNo}.`
    });
    return copy(record);
  }

  function transitionSupplierStatus({
    companyId,
    supplierId,
    targetStatus,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const supplier = requireSupplierRecord(state, companyId, supplierId);
    const nextStatus = requireText(targetStatus, "supplier_target_status_required");
    assertSupplierTransition(supplier.status, nextStatus);
    if (nextStatus === "archived") {
      const openPurchaseOrders = (state.purchaseOrderIdsByCompany.get(supplier.companyId) || [])
        .map((purchaseOrderId) => state.purchaseOrders.get(purchaseOrderId))
        .filter(Boolean)
        .filter(
          (purchaseOrder) =>
            purchaseOrder.supplierId === supplier.supplierId &&
            !["closed", "cancelled"].includes(purchaseOrder.status)
        );
      if (openPurchaseOrders.length > 0) {
        throw createError(409, "supplier_archive_blocked", "Supplier with open purchase orders cannot be archived.");
      }
    }
    supplier.status = assertAllowed(nextStatus, AP_SUPPLIER_STATUSES, "supplier_status_invalid");
    supplier.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: supplier.companyId,
      actorId,
      correlationId,
      action: "ap.supplier.status_changed",
      entityType: "ap_supplier",
      entityId: supplier.supplierId,
      explanation: `Moved supplier ${supplier.supplierNo} to ${nextStatus}.`
    });
    return copy(supplier);
  }

  function importSuppliers({
    companyId,
    batchKey,
    suppliers,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedBatchKey = requireText(batchKey, "supplier_import_batch_key_required");
    if (!Array.isArray(suppliers) || suppliers.length === 0) {
      throw createError(400, "supplier_import_items_required", "Supplier import requires at least one supplier.");
    }
    const payloadHash = hashObject(suppliers);
    const scopedBatchKey = toCompanyScopedKey(resolvedCompanyId, resolvedBatchKey);
    const existingBatchId = state.supplierImportBatchIdsByCompanyKey.get(scopedBatchKey);
    if (existingBatchId) {
      const existingBatch = state.supplierImportBatches.get(existingBatchId);
      if (existingBatch.payloadHash !== payloadHash) {
        throw createError(409, "supplier_import_batch_conflict", "Supplier import batch key already exists with different payload.");
      }
      return copy(existingBatch);
    }

    const itemResults = [];
    let created = 0;
    let updated = 0;

    for (const incoming of suppliers) {
      const existingSupplier = resolveSupplierForImport(state, resolvedCompanyId, incoming);
      if (!existingSupplier) {
        const createdSupplier = createSupplier({
          companyId: resolvedCompanyId,
          ...incoming,
          actorId,
          correlationId
        });
        created += 1;
        itemResults.push({
          supplierNo: createdSupplier.supplierNo,
          supplierId: createdSupplier.supplierId,
          result: "created"
        });
        continue;
      }
      updateSupplierFromImport({
        state,
        clock,
        vatPlatform,
        supplier: existingSupplier,
        incoming,
        companyId: resolvedCompanyId,
        actorId
      });
      updated += 1;
      itemResults.push({
        supplierNo: existingSupplier.supplierNo,
        supplierId: existingSupplier.supplierId,
        result: "updated"
      });
    }

    const batch = {
      supplierImportBatchId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      batchKey: resolvedBatchKey,
      payloadHash,
      status: "completed",
      summary: { created, updated },
      items: itemResults,
      createdByActorId: actorId,
      createdAt: nowIso(clock)
    };
    state.supplierImportBatches.set(batch.supplierImportBatchId, batch);
    state.supplierImportBatchIdsByCompanyKey.set(scopedBatchKey, batch.supplierImportBatchId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "ap.supplier_import.completed",
      entityType: "ap_supplier_import_batch",
      entityId: batch.supplierImportBatchId,
      explanation: `Completed supplier import batch ${resolvedBatchKey}.`
    });
    return copy(batch);
  }

  function getSupplierImportBatch({ companyId, supplierImportBatchId } = {}) {
    const batch = state.supplierImportBatches.get(requireText(supplierImportBatchId, "supplier_import_batch_id_required"));
    if (!batch || batch.companyId !== requireText(companyId, "company_id_required")) {
      throw createError(404, "supplier_import_batch_not_found", "Supplier import batch was not found.");
    }
    return copy(batch);
  }

  function listPurchaseOrders({ companyId, supplierId = null, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.purchaseOrderIdsByCompany.get(resolvedCompanyId) || [])
      .map((purchaseOrderId) => state.purchaseOrders.get(purchaseOrderId))
      .filter(Boolean)
      .filter((purchaseOrder) => !supplierId || purchaseOrder.supplierId === supplierId)
      .filter((purchaseOrder) => !status || purchaseOrder.status === status)
      .sort((left, right) => left.poNo.localeCompare(right.poNo))
      .map(copy);
  }

  function getPurchaseOrder({ companyId, purchaseOrderId } = {}) {
    return copy(requirePurchaseOrderRecord(state, companyId, purchaseOrderId));
  }

  function createPurchaseOrder({
    companyId,
    poNo = null,
    supplierId,
    currencyCode = null,
    requesterUserId,
    expectedDeliveryDate = null,
    approvalPolicyCode = "standard",
    toleranceProfileCode = "standard",
    defaultExpenseAccountNumber = null,
    defaultVatCode = null,
    defaultDimensions = {},
    defaultUnitPrice = null,
    projectCode = null,
    costCenterCode = null,
    importSourceKey = null,
    status = "draft",
    lines,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const supplier = requireSupplierRecord(state, companyId, supplierId);
    if (["blocked", "archived"].includes(supplier.status) || supplier.bookingBlocked === true) {
      throw createError(409, "supplier_blocked_for_po", "Supplier is blocked and cannot receive new purchase orders.");
    }
    const resolvedCompanyId = supplier.companyId;
    const resolvedPoNo = resolveSequenceOrValue({
      state,
      companyId: resolvedCompanyId,
      sequenceKey: "purchase_order",
      prefix: DEFAULT_PURCHASE_ORDER_PREFIX,
      value: poNo,
      requiredCode: "purchase_order_no_required"
    });
    ensurePurchaseOrderNoUnique(state, resolvedCompanyId, resolvedPoNo);

    const normalizedImportSourceKey = normalizeOptionalText(importSourceKey);
    if (normalizedImportSourceKey) {
      ensurePurchaseOrderImportSourceUnique(state, resolvedCompanyId, normalizedImportSourceKey);
    }

    const resolvedCurrencyCode = normalizeUpperCode(currencyCode || supplier.currencyCode, "currency_code_required", 3);
    const headerDefaults = {
      defaultExpenseAccountNumber: normalizeOptionalAccountNumber(defaultExpenseAccountNumber) || supplier.defaultExpenseAccountNumber,
      defaultVatCode: ensureOptionalVatCodeExists(vatPlatform, resolvedCompanyId, defaultVatCode) || supplier.defaultVatCode,
      defaultDimensionsJson: mergeDimensions(supplier.defaultDimensionsJson, normalizeDimensions(defaultDimensions)),
      defaultUnitPrice:
        normalizeOptionalMoney(defaultUnitPrice, "purchase_order_default_unit_price_invalid") ?? supplier.defaultUnitPrice,
      projectCode: normalizeOptionalText(projectCode),
      costCenterCode: normalizeOptionalText(costCenterCode),
      toleranceProfileCode: requireText(toleranceProfileCode, "purchase_order_tolerance_profile_required")
    };
    const normalizedLines = normalizePurchaseOrderLines({
      vatPlatform,
      companyId: resolvedCompanyId,
      supplier,
      currencyCode: resolvedCurrencyCode,
      headerDefaults,
      lines
    });
    const record = {
      purchaseOrderId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      poNo: resolvedPoNo,
      supplierId: supplier.supplierId,
      currencyCode: resolvedCurrencyCode,
      requesterUserId: requireText(requesterUserId, "purchase_order_requester_required"),
      approvalPolicyCode: requireText(approvalPolicyCode, "purchase_order_approval_policy_required"),
      toleranceProfileCode: headerDefaults.toleranceProfileCode,
      expectedDeliveryDate: normalizeOptionalDate(expectedDeliveryDate, "purchase_order_expected_delivery_date_invalid"),
      defaultExpenseAccountNumber: headerDefaults.defaultExpenseAccountNumber,
      defaultVatCode: headerDefaults.defaultVatCode,
      defaultDimensionsJson: headerDefaults.defaultDimensionsJson,
      defaultUnitPrice: headerDefaults.defaultUnitPrice,
      projectCode: headerDefaults.projectCode,
      costCenterCode: headerDefaults.costCenterCode,
      status: assertAllowed(status, AP_PURCHASE_ORDER_STATUSES, "purchase_order_status_invalid"),
      lines: normalizedLines,
      approvedByActorId: null,
      approvedAt: null,
      sentAt: null,
      closedAt: null,
      importSourceKey: normalizedImportSourceKey,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.purchaseOrders.set(record.purchaseOrderId, record);
    ensureCollection(state.purchaseOrderIdsByCompany, resolvedCompanyId).push(record.purchaseOrderId);
    state.purchaseOrderIdsByCompanyNo.set(toCompanyScopedKey(resolvedCompanyId, resolvedPoNo), record.purchaseOrderId);
    if (normalizedImportSourceKey) {
      state.purchaseOrderIdsByCompanyImportSource.set(toCompanyScopedKey(resolvedCompanyId, normalizedImportSourceKey), record.purchaseOrderId);
    }
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "ap.purchase_order.created",
      entityType: "ap_purchase_order",
      entityId: record.purchaseOrderId,
      explanation: `Created purchase order ${resolvedPoNo}.`
    });
    return copy(record);
  }

  function transitionPurchaseOrderStatus({
    companyId,
    purchaseOrderId,
    targetStatus,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const purchaseOrder = requirePurchaseOrderRecord(state, companyId, purchaseOrderId);
    const nextStatus = requireText(targetStatus, "purchase_order_target_status_required");
    assertPurchaseOrderTransition(purchaseOrder.status, nextStatus);
    if (nextStatus === "approved") {
      purchaseOrder.approvedByActorId = actorId;
      purchaseOrder.approvedAt = nowIso(clock);
    }
    if (nextStatus === "sent") {
      if (purchaseOrder.status !== "approved") {
        throw createError(409, "purchase_order_must_be_approved", "Purchase order must be approved before it can be sent.");
      }
      purchaseOrder.sentAt = nowIso(clock);
    }
    if (nextStatus === "closed") {
      purchaseOrder.closedAt = nowIso(clock);
    }
    purchaseOrder.status = assertAllowed(nextStatus, AP_PURCHASE_ORDER_STATUSES, "purchase_order_status_invalid");
    purchaseOrder.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: purchaseOrder.companyId,
      actorId,
      correlationId,
      action: "ap.purchase_order.status_changed",
      entityType: "ap_purchase_order",
      entityId: purchaseOrder.purchaseOrderId,
      explanation: `Moved purchase order ${purchaseOrder.poNo} to ${nextStatus}.`
    });
    return copy(purchaseOrder);
  }

  function importPurchaseOrders({
    companyId,
    batchKey,
    purchaseOrders,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedBatchKey = requireText(batchKey, "purchase_order_import_batch_key_required");
    if (!Array.isArray(purchaseOrders) || purchaseOrders.length === 0) {
      throw createError(400, "purchase_order_import_items_required", "Purchase-order import requires at least one item.");
    }
    const payloadHash = hashObject(purchaseOrders);
    const scopedBatchKey = toCompanyScopedKey(resolvedCompanyId, resolvedBatchKey);
    const existingBatchId = state.purchaseOrderImportBatchIdsByCompanyKey.get(scopedBatchKey);
    if (existingBatchId) {
      const existingBatch = state.purchaseOrderImportBatches.get(existingBatchId);
      if (existingBatch.payloadHash !== payloadHash) {
        throw createError(
          409,
          "purchase_order_import_batch_conflict",
          "Purchase-order import batch key already exists with different payload."
        );
      }
      return copy(existingBatch);
    }

    const itemResults = [];
    let created = 0;
    let updated = 0;

    for (const incoming of purchaseOrders) {
      const existingPurchaseOrder = resolvePurchaseOrderForImport(state, resolvedCompanyId, incoming);
      if (!existingPurchaseOrder) {
        const createdPurchaseOrder = createPurchaseOrder({
          companyId: resolvedCompanyId,
          ...incoming,
          actorId,
          correlationId
        });
        created += 1;
        itemResults.push({
          poNo: createdPurchaseOrder.poNo,
          purchaseOrderId: createdPurchaseOrder.purchaseOrderId,
          result: "created"
        });
        continue;
      }
      updatePurchaseOrderFromImport({
        state,
        clock,
        vatPlatform,
        purchaseOrder: existingPurchaseOrder,
        incoming,
        actorId
      });
      updated += 1;
      itemResults.push({
        poNo: existingPurchaseOrder.poNo,
        purchaseOrderId: existingPurchaseOrder.purchaseOrderId,
        result: "updated"
      });
    }

    const batch = {
      purchaseOrderImportBatchId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      batchKey: resolvedBatchKey,
      payloadHash,
      status: "completed",
      summary: { created, updated },
      items: itemResults,
      createdByActorId: actorId,
      createdAt: nowIso(clock)
    };
    state.purchaseOrderImportBatches.set(batch.purchaseOrderImportBatchId, batch);
    state.purchaseOrderImportBatchIdsByCompanyKey.set(scopedBatchKey, batch.purchaseOrderImportBatchId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "ap.purchase_order_import.completed",
      entityType: "ap_purchase_order_import_batch",
      entityId: batch.purchaseOrderImportBatchId,
      explanation: `Completed purchase-order import batch ${resolvedBatchKey}.`
    });
    return copy(batch);
  }

  function getPurchaseOrderImportBatch({ companyId, purchaseOrderImportBatchId } = {}) {
    const batch = state.purchaseOrderImportBatches.get(
      requireText(purchaseOrderImportBatchId, "purchase_order_import_batch_id_required")
    );
    if (!batch || batch.companyId !== requireText(companyId, "company_id_required")) {
      throw createError(404, "purchase_order_import_batch_not_found", "Purchase-order import batch was not found.");
    }
    return copy(batch);
  }

  function listReceipts({ companyId, purchaseOrderId = null, supplierInvoiceReference = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const normalizedSupplierInvoiceReference = normalizeOptionalText(supplierInvoiceReference);
    return (state.receiptIdsByCompany.get(resolvedCompanyId) || [])
      .map((receiptId) => state.receipts.get(receiptId))
      .filter(Boolean)
      .filter((receipt) => !purchaseOrderId || receipt.purchaseOrderId === purchaseOrderId)
      .filter(
        (receipt) =>
          !normalizedSupplierInvoiceReference || receipt.supplierInvoiceReference === normalizedSupplierInvoiceReference
      )
      .sort((left, right) => left.receiptDate.localeCompare(right.receiptDate))
      .map(copy);
  }

  function getReceipt({ companyId, apReceiptId } = {}) {
    const receipt = state.receipts.get(requireText(apReceiptId, "ap_receipt_id_required"));
    if (!receipt || receipt.companyId !== requireText(companyId, "company_id_required")) {
      throw createError(404, "ap_receipt_not_found", "Receipt was not found.");
    }
    return copy(receipt);
  }

  function createReceipt({
    companyId,
    purchaseOrderId,
    receiptDate,
    receiverActorId,
    supplierInvoiceReference = null,
    externalReceiptRef = null,
    deliveryReference = null,
    comment = null,
    varianceCode = null,
    lines,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const purchaseOrder = requirePurchaseOrderRecord(state, companyId, purchaseOrderId);
    if (!["approved", "sent", "partially_received"].includes(purchaseOrder.status)) {
      throw createError(409, "purchase_order_not_receivable", "Receipt may only be registered for approved, sent or partially received purchase orders.");
    }
    const normalizedReceiptDate = normalizeDate(receiptDate, "receipt_date_invalid");
    const duplicateKey = buildReceiptDuplicateKey({
      companyId: purchaseOrder.companyId,
      purchaseOrderId: purchaseOrder.purchaseOrderId,
      supplierInvoiceReference,
      externalReceiptRef,
      receiptDate: normalizedReceiptDate,
      lines
    });
    const existingReceiptId = state.receiptIdsByCompanyKey.get(duplicateKey);
    if (existingReceiptId) {
      return copy(state.receipts.get(existingReceiptId));
    }
    if (!Array.isArray(lines) || lines.length === 0) {
      throw createError(400, "receipt_lines_required", "Receipt requires at least one line.");
    }

    const receiptLines = lines.map((line, index) => {
      const purchaseOrderLine = requirePurchaseOrderLine(purchaseOrder, line.purchaseOrderLineId);
      const quantityFromPercent =
        line.receivedPercent !== undefined && line.receivedPercent !== null
          ? roundQuantity((purchaseOrderLine.quantityOrdered * normalizePositiveNumber(line.receivedPercent, "receipt_percent_invalid")) / 100)
          : null;
      const receivedQuantity = roundQuantity(
        quantityFromPercent ?? normalizePositiveNumber(line.receivedQuantity, "receipt_quantity_invalid")
      );
      const maxQuantity = roundQuantity(
        purchaseOrderLine.quantityOrdered * (1 + purchaseOrderLine.overdeliveryTolerancePercent / 100)
      );
      if (roundQuantity(purchaseOrderLine.receivedQuantity + receivedQuantity) > maxQuantity) {
        throw createError(409, "receipt_exceeds_tolerance", "Cumulative receipt exceeds allowed overdelivery.");
      }
      purchaseOrderLine.receivedQuantity = roundQuantity(purchaseOrderLine.receivedQuantity + receivedQuantity);
      return {
        apReceiptLineId: crypto.randomUUID(),
        purchaseOrderLineId: purchaseOrderLine.purchaseOrderLineId,
        lineNo: index + 1,
        receivedQuantity,
        receivedPercent: quantityFromPercent !== null ? normalizePositiveNumber(line.receivedPercent, "receipt_percent_invalid") : null,
        receiptTargetType: purchaseOrderLine.receiptTargetType,
        varianceCode: normalizeOptionalText(line.varianceCode),
        comment: normalizeOptionalText(line.comment)
      };
    });

    const receipt = {
      apReceiptId: crypto.randomUUID(),
      companyId: purchaseOrder.companyId,
      supplierId: purchaseOrder.supplierId,
      purchaseOrderId: purchaseOrder.purchaseOrderId,
      receiptDate: normalizedReceiptDate,
      receiverActorId: requireText(receiverActorId, "receipt_receiver_required"),
      supplierInvoiceReference: normalizeOptionalText(supplierInvoiceReference),
      externalReceiptRef: normalizeOptionalText(externalReceiptRef),
      deliveryReference: normalizeOptionalText(deliveryReference),
      comment: normalizeOptionalText(comment),
      varianceCode: normalizeOptionalText(varianceCode),
      duplicateKey,
      lines: receiptLines,
      createdByActorId: actorId,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    purchaseOrder.status = resolvePurchaseOrderReceiptStatus(purchaseOrder);
    purchaseOrder.updatedAt = nowIso(clock);

    state.receipts.set(receipt.apReceiptId, receipt);
    ensureCollection(state.receiptIdsByCompany, purchaseOrder.companyId).push(receipt.apReceiptId);
    state.receiptIdsByCompanyKey.set(duplicateKey, receipt.apReceiptId);
    pushAudit(state, clock, {
      companyId: purchaseOrder.companyId,
      actorId,
      correlationId,
      action: "ap.receipt.created",
      entityType: "ap_receipt",
      entityId: receipt.apReceiptId,
      explanation: `Created receipt ${receipt.apReceiptId} for purchase order ${purchaseOrder.poNo}.`
    });
    return copy(receipt);
  }

  function listSupplierInvoices({ companyId, status = null, reviewRequired = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.supplierInvoiceIdsByCompany.get(resolvedCompanyId) || [])
      .map((supplierInvoiceId) => state.supplierInvoices.get(supplierInvoiceId))
      .filter(Boolean)
      .filter((invoice) => (status ? invoice.status === status : true))
      .filter((invoice) => (reviewRequired === null ? true : invoice.reviewRequired === (reviewRequired === true)))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function getSupplierInvoice({ companyId, supplierInvoiceId } = {}) {
    const invoice = requireSupplierInvoiceRecord(state, companyId, supplierInvoiceId);
    return presentSupplierInvoice(state, invoice);
  }

  function listApOpenItems({ companyId, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.apOpenItemIdsByCompany.get(resolvedCompanyId) || [])
      .map((apOpenItemId) => state.apOpenItems.get(apOpenItemId))
      .filter(Boolean)
      .filter((openItem) => (status ? openItem.status === status : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function getApOpenItem({ companyId, apOpenItemId } = {}) {
    return copy(requireApOpenItemRecord(state, companyId, apOpenItemId));
  }

  function getApPaymentPreparation({ companyId, apOpenItemId } = {}) {
    const openItem = requireApOpenItemRecord(state, companyId, apOpenItemId);
    const invoice = requireSupplierInvoiceRecord(state, openItem.companyId, openItem.supplierInvoiceId);
    const supplier = requireSupplierRecord(state, invoice.companyId, invoice.supplierId);
    return buildApPaymentPreparation({ openItem, invoice, supplier });
  }

  function createSupplierCreditNote({
    companyId,
    supplierInvoiceId,
    externalInvoiceRef = null,
    invoiceDate = null,
    dueDate = null,
    creditReasonCode = null,
    lines = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const originalInvoice = requireSupplierInvoiceRecord(state, companyId, supplierInvoiceId);
    if (originalInvoice.invoiceType === "credit_note") {
      throw createError(409, "credit_note_source_invalid", "Credit notes cannot be created from an existing AP credit note.");
    }
    const supplier = requireSupplierRecord(state, originalInvoice.companyId, originalInvoice.supplierId);
    const lineInputs = buildCreditNoteLineInputs({ originalInvoice, lines });
    return ingestSupplierInvoice({
      companyId: originalInvoice.companyId,
      supplierId: supplier.supplierId,
      purchaseOrderId: originalInvoice.purchaseOrderId,
      documentId: null,
      classificationCaseId: null,
      importCaseId: null,
      requiresImportCase: false,
      invoiceType: "credit_note",
      originalSupplierInvoiceId: originalInvoice.supplierInvoiceId,
      creditReasonCode,
      sourceChannel: "manual",
      externalInvoiceRef:
        externalInvoiceRef || `${originalInvoice.externalInvoiceRef}-CR`,
      invoiceDate: invoiceDate || nowIso(clock).slice(0, 10),
      dueDate: dueDate || invoiceDate || nowIso(clock).slice(0, 10),
      currencyCode: originalInvoice.currencyCode,
      paymentReference: originalInvoice.paymentReference,
      lines: lineInputs,
      actorId,
      correlationId
    });
  }

  function ingestSupplierInvoice({
    companyId,
    supplierId = null,
    supplierNo = null,
    purchaseOrderId = null,
    purchaseOrderNo = null,
    documentId = null,
    classificationCaseId = null,
    importCaseId = null,
    requiresImportCase = null,
    sourceChannel = "manual",
    invoiceType = "standard",
    originalSupplierInvoiceId = null,
    creditReasonCode = null,
    externalInvoiceRef = null,
    invoiceDate = null,
    dueDate = null,
    currencyCode = null,
    paymentReference = null,
    lines = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const documentContext = documentId
      ? resolveDocumentInvoiceContext({ documentPlatform, companyId: resolvedCompanyId, documentId })
      : null;
    const supplier = resolveSupplierForInvoiceIngest({
      state,
      companyId: resolvedCompanyId,
      supplierId,
      supplierNo,
      ocrFields: documentContext?.ocrFields || {}
    });
    if (["blocked", "archived"].includes(supplier.status) || supplier.bookingBlocked === true) {
      throw createError(409, "supplier_missing_or_blocked", "Supplier is blocked for AP invoice ingest.");
    }

    const linkedPurchaseOrder = resolvePurchaseOrderForInvoice({
      state,
      companyId: resolvedCompanyId,
      purchaseOrderId,
      purchaseOrderNo: purchaseOrderNo || documentContext?.purchaseOrderReference || null
    });
    const originalSupplierInvoice = originalSupplierInvoiceId
      ? requireSupplierInvoiceRecord(state, resolvedCompanyId, originalSupplierInvoiceId)
      : null;
    const resolvedInvoiceType = assertAllowed(invoiceType, AP_SUPPLIER_INVOICE_TYPES, "supplier_invoice_type_invalid");
    if (resolvedInvoiceType === "credit_note" && !originalSupplierInvoice && supplier.allowCreditWithoutLink !== true) {
      throw createError(409, "credit_link_missing", "Supplier credit notes require a valid original supplier invoice unless supplier policy allows unlinked credits.");
    }
    if (originalSupplierInvoice && originalSupplierInvoice.supplierId !== supplier.supplierId) {
      throw createError(409, "credit_supplier_mismatch", "Credit note must reference a supplier invoice from the same supplier.");
    }
    if (originalSupplierInvoice && originalSupplierInvoice.invoiceType === "credit_note") {
      throw createError(409, "credit_link_invalid", "Original supplier invoice may not itself be a credit note.");
    }
    const normalizedExternalInvoiceRef = requireText(
      externalInvoiceRef || documentContext?.externalInvoiceRef || documentContext?.invoiceNumber,
      "supplier_invoice_external_ref_required"
    );
    const resolvedInvoiceDate = normalizeDate(
      invoiceDate || documentContext?.invoiceDate || nowIso(clock).slice(0, 10),
      "supplier_invoice_date_invalid"
    );
    const resolvedDueDate = normalizeDate(
      dueDate || documentContext?.dueDate || resolvedInvoiceDate,
      "supplier_invoice_due_date_invalid"
    );
    const resolvedCurrencyCode = normalizeUpperCode(
      currencyCode || documentContext?.currencyCode || supplier.currencyCode,
      "currency_code_required",
      3
    );
    const normalizedLines = normalizeSupplierInvoiceLines({
      lines,
      documentContext,
      supplier,
      purchaseOrder: linkedPurchaseOrder,
      invoiceType: resolvedInvoiceType,
      invoiceDate: resolvedInvoiceDate,
      currencyCode: resolvedCurrencyCode,
      companyId: resolvedCompanyId,
      ledgerPlatform,
      vatPlatform,
      actorId,
      correlationId
    });
    if (normalizedLines.length === 0) {
      throw createError(409, "supplier_invoice_lines_required", "Supplier invoice requires at least one coding line.");
    }

    const netAmount = roundMoney(normalizedLines.reduce((sum, line) => sum + line.netAmount, 0));
    const vatAmount = roundMoney(normalizedLines.reduce((sum, line) => sum + line.vatAmount, 0));
    const grossAmount = roundMoney(netAmount + vatAmount);
    if (resolvedInvoiceType === "credit_note" && originalSupplierInvoice && grossAmount > originalSupplierInvoice.grossAmount) {
      throw createError(409, "credit_amount_exceeds_original", "Supplier credit note exceeds the original supplier invoice amount.");
    }
    const documentHash = buildInvoiceDocumentHash({
      documentContext,
      fallbackValue: {
        supplierId: supplier.supplierId,
        externalInvoiceRef: normalizedExternalInvoiceRef,
        invoiceDate: resolvedInvoiceDate,
        grossAmount
      }
    });
    const fingerprintHash = buildSupplierInvoiceFingerprint({
      supplierId: supplier.supplierId,
      invoiceType: resolvedInvoiceType,
      originalSupplierInvoiceId: originalSupplierInvoice?.supplierInvoiceId || null,
      externalInvoiceRef: normalizedExternalInvoiceRef,
      invoiceDate: resolvedInvoiceDate,
      grossAmount,
      currencyCode: resolvedCurrencyCode,
      documentHash,
      paymentReference: paymentReference || documentContext?.paymentReference || documentContext?.reference || null
    });
    const existingExactId = state.supplierInvoiceIdsByCompanyFingerprint.get(
      toCompanyScopedKey(resolvedCompanyId, fingerprintHash)
    );
    if (existingExactId) {
      return presentSupplierInvoice(state, state.supplierInvoices.get(existingExactId));
    }

    const nearDuplicate = findNearDuplicateSupplierInvoice({
      state,
      companyId: resolvedCompanyId,
      supplierId: supplier.supplierId,
      externalInvoiceRef: normalizedExternalInvoiceRef,
      invoiceDate: resolvedInvoiceDate,
      grossAmount,
      currencyCode: resolvedCurrencyCode,
      documentHash
    });
    const reviewQueueCodes = uniqueStrings([
      ...normalizedLines.flatMap((line) => (line.reviewRequired ? line.reviewQueueCodes : [])),
      ...(documentContext?.reviewRequired ? ["ocr_low_confidence"] : []),
      ...(nearDuplicate ? ["duplicate_suspect"] : [])
    ]);
    const reviewRequired = reviewQueueCodes.length > 0;
    const approvalSteps = buildInvoiceApprovalSteps({
      orgAuthPlatform,
      supplier,
      actorId,
      clock
    });
    const staticPaymentHoldReasonCodes = supplier.paymentBlocked === true ? ["payment_hold"] : [];

    const invoice = {
      supplierInvoiceId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      supplierInvoiceNo: nextScopedSequence(state, resolvedCompanyId, "supplierInvoice", DEFAULT_INVOICE_PREFIX),
      supplierId: supplier.supplierId,
      purchaseOrderId: linkedPurchaseOrder?.purchaseOrderId || null,
      purchaseOrderNo: linkedPurchaseOrder?.poNo || null,
      documentId: documentContext?.documentId || null,
      documentVersionId: documentContext?.documentVersionId || null,
      sourceChannel: assertAllowed(sourceChannel, ["manual", "email", "api", "peppol", "integration"], "ap_source_channel_invalid"),
      externalInvoiceRef: normalizedExternalInvoiceRef,
      invoiceDate: resolvedInvoiceDate,
      dueDate: resolvedDueDate,
      currencyCode: resolvedCurrencyCode,
      netAmount,
      vatAmount,
      grossAmount,
      paymentReference: normalizeOptionalText(paymentReference || documentContext?.paymentReference || documentContext?.reference),
      documentHash,
      duplicateCheckStatus: nearDuplicate ? "suspect_duplicate" : "cleared",
      duplicateFingerprintHash: fingerprintHash,
      duplicateOfSupplierInvoiceId: nearDuplicate?.supplierInvoiceId || null,
      invoiceType: resolvedInvoiceType,
      originalSupplierInvoiceId: originalSupplierInvoice?.supplierInvoiceId || null,
      creditReasonCode: normalizeOptionalText(creditReasonCode),
      classificationCaseId: normalizeOptionalText(classificationCaseId),
      classificationCaseStatus: null,
      classificationReviewReasonCodes: [],
      classificationTreatmentCodes: [],
      classificationTargetDomainCodes: [],
      personLinkedDocumentFlag: false,
      personLinkedDocumentBlocked: false,
      importCaseId: normalizeOptionalText(importCaseId),
      importCaseStatus: null,
      importCaseCompletenessStatus: null,
      importCaseBlockingReasonCodes: [],
      requiresImportCase: requiresImportCase === true,
      matchMode: linkedPurchaseOrder ? (supplier.requiresReceipt ? "three_way" : "two_way") : "none",
      status: reviewRequired ? "pending_approval" : "draft",
      reviewRequired,
      staticReviewQueueCodes: reviewQueueCodes,
      matchReviewQueueCodes: [],
      dynamicReviewQueueCodes: [],
      reviewQueueCodes,
      approvalChainId: supplier.attestChainId || null,
      approvalStatus: approvalSteps.length > 0 ? "pending" : "not_required",
      approvalSteps,
      staticPaymentHoldReasonCodes,
      dynamicPaymentHoldReasonCodes: [],
      paymentHold: staticPaymentHoldReasonCodes.length > 0,
      paymentHoldReasonCodes: staticPaymentHoldReasonCodes,
      paymentReadinessStatus: "not_ready",
      paymentReadinessReasonCodes: ["invoice_not_posted"],
      lines: normalizedLines,
      latestMatchRunId: null,
      journalEntryId: null,
      apOpenItemId: null,
      createdByActorId: actorId,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock),
      approvedAt: null,
      approvedByActorId: null,
      postedAt: null,
      paidAt: null
    };

    state.supplierInvoices.set(invoice.supplierInvoiceId, invoice);
    ensureCollection(state.supplierInvoiceIdsByCompany, resolvedCompanyId).push(invoice.supplierInvoiceId);
    state.supplierInvoiceIdsByCompanyRef.set(
      toCompanyScopedKey(resolvedCompanyId, `${supplier.supplierId}:${normalizedExternalInvoiceRef}`),
      invoice.supplierInvoiceId
    );
    state.supplierInvoiceIdsByCompanyFingerprint.set(
      toCompanyScopedKey(resolvedCompanyId, fingerprintHash),
      invoice.supplierInvoiceId
    );
    if (invoice.documentId) {
      state.supplierInvoiceIdsByCompanyDocument.set(
        toCompanyScopedKey(resolvedCompanyId, invoice.documentId),
        invoice.supplierInvoiceId
      );
      if (documentPlatform && typeof documentPlatform.linkDocumentRecord === "function") {
        documentPlatform.linkDocumentRecord({
          companyId: resolvedCompanyId,
          documentId: invoice.documentId,
          targetType: "ap_supplier_invoice",
          targetId: invoice.supplierInvoiceId,
          metadataJson: {
            relationType: "source_document"
          },
          actorId,
      correlationId
        });
      }
    }

    refreshSupplierInvoiceControls({
      state,
      invoice,
      supplier,
      actorId,
      correlationId,
      documentClassificationPlatform,
      importCasesPlatform,
      getDocumentClassificationPlatform,
      getImportCasesPlatform
    });

    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "ap.supplier_invoice.ingested",
      entityType: "ap_supplier_invoice",
      entityId: invoice.supplierInvoiceId,
      explanation: `Ingested supplier invoice ${normalizedExternalInvoiceRef}.`
    });
    return presentSupplierInvoice(state, invoice);
  }

  function runSupplierInvoiceMatch({
    companyId,
    supplierInvoiceId,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const invoice = requireSupplierInvoiceRecord(state, companyId, supplierInvoiceId);
    const supplier = requireSupplierRecord(state, invoice.companyId, invoice.supplierId);
    refreshSupplierInvoiceControls({
      state,
      invoice,
      supplier,
      actorId,
      correlationId,
      documentClassificationPlatform,
      importCasesPlatform,
      getDocumentClassificationPlatform,
      getImportCasesPlatform
    });
    const purchaseOrder = invoice.purchaseOrderId
      ? requirePurchaseOrderRecord(state, invoice.companyId, invoice.purchaseOrderId)
      : null;
    const varianceIds = [];
    const lineResults = [];
    let matchMode = invoice.purchaseOrderId ? (supplier.requiresReceipt ? "three_way" : "two_way") : "none";

    for (const line of invoice.lines) {
      const result = {
        supplierInvoiceLineId: line.supplierInvoiceLineId,
        lineNo: line.lineNo,
        matchMode: purchaseOrder ? (line.receiptRequired ? "three_way" : "two_way") : "none",
        matchedPurchaseOrderLineId: null,
        matchedReceiptQuantity: 0,
        variances: []
      };
      const currentVariances = [];
      if (purchaseOrder) {
        const purchaseOrderLine = resolvePurchaseOrderLineForInvoice(purchaseOrder, line);
        if (!purchaseOrderLine) {
          currentVariances.push(
            createInvoiceVariance({
              invoice,
              line,
              varianceCode: "purchase_order_line_missing",
              severity: "error",
              message: "Invoice line could not be matched to a purchase-order line.",
              expectedValue: null,
              actualValue: line.description
            })
          );
        } else {
          result.matchedPurchaseOrderLineId = purchaseOrderLine.purchaseOrderLineId;
          const tolerance = resolveToleranceProfile(
            line.toleranceProfileCode || purchaseOrderLine.toleranceProfileCode || purchaseOrder.toleranceProfileCode
          );
          const expectedUnitPrice = purchaseOrderLine.unitPrice;
          const expectedNetAmount = roundMoney(expectedUnitPrice * line.quantity);
          const priceVariancePercent =
            expectedUnitPrice > 0 ? Math.abs(((line.unitPrice - expectedUnitPrice) / expectedUnitPrice) * 100) : 0;
          const totalVarianceAmount = Math.abs(line.netAmount - expectedNetAmount);
          if (
            priceVariancePercent > tolerance.priceTolerancePercent ||
            totalVarianceAmount > tolerance.totalToleranceAmount
          ) {
            currentVariances.push(
              createInvoiceVariance({
                invoice,
                line,
                varianceCode: "price_variance",
                severity: "error",
                message: "Invoice price exceeds purchase-order tolerance.",
                expectedValue: expectedUnitPrice,
                actualValue: line.unitPrice,
                toleranceValue: tolerance.priceTolerancePercent
              })
            );
          }
          if (line.receiptRequired) {
            const matchedReceiptQuantity = summarizeReceiptQuantity(state, purchaseOrder.purchaseOrderId, purchaseOrderLine.purchaseOrderLineId);
            result.matchedReceiptQuantity = matchedReceiptQuantity;
            if (roundQuantity(matchedReceiptQuantity) + 0.0001 < roundQuantity(line.quantity)) {
              currentVariances.push(
                createInvoiceVariance({
                  invoice,
                  line,
                  varianceCode: "receipt_variance",
                  severity: "error",
                  message: "Received quantity is lower than invoiced quantity.",
                  expectedValue: line.quantity,
                  actualValue: matchedReceiptQuantity,
                  toleranceValue: tolerance.quantityTolerancePercent
                })
              );
            }
          }
        }
      } else if (supplier.requiresPo) {
        currentVariances.push(
          createInvoiceVariance({
            invoice,
            line,
            varianceCode: "po_required_missing",
            severity: "error",
            message: "Supplier requires a purchase order before matching can pass.",
            expectedValue: "purchase_order",
            actualValue: null
          })
        );
      }

      if (line.reviewRequired) {
        currentVariances.push(
          createInvoiceVariance({
            invoice,
            line,
            varianceCode: "tax_review_required",
            severity: "warning",
            message: "VAT proposal requires review before posting.",
            expectedValue: null,
            actualValue: line.vatProposal?.vatCode || null
          })
        );
      }

      for (const variance of currentVariances) {
        state.supplierInvoiceVariances.set(variance.supplierInvoiceVarianceId, variance);
        varianceIds.push(variance.supplierInvoiceVarianceId);
        result.variances.push(copy(variance));
      }
      lineResults.push(result);
    }

    state.supplierInvoiceVarianceIdsByInvoice.set(invoice.supplierInvoiceId, varianceIds);
    const blockingVariances = varianceIds
      .map((varianceId) => state.supplierInvoiceVariances.get(varianceId))
      .filter(Boolean)
      .filter((variance) => variance.status === "open");
    invoice.matchReviewQueueCodes = uniqueStrings(blockingVariances.map((variance) => variance.reviewQueueCode));
    refreshSupplierInvoiceControls({
      state,
      invoice,
      supplier,
      actorId,
      correlationId,
      documentClassificationPlatform,
      importCasesPlatform,
      getDocumentClassificationPlatform,
      getImportCasesPlatform
    });
    const reviewRequired = invoice.reviewRequired;

    const matchRun = {
      supplierInvoiceMatchRunId: crypto.randomUUID(),
      companyId: invoice.companyId,
      supplierInvoiceId: invoice.supplierInvoiceId,
      matchMode,
      status: reviewRequired ? "review_required" : "matched",
      varianceCount: blockingVariances.length,
      reviewRequired,
      lineResults,
      createdByActorId: actorId,
      createdAt: nowIso(clock)
    };
    state.supplierInvoiceMatchRuns.set(matchRun.supplierInvoiceMatchRunId, matchRun);
    ensureCollection(state.supplierInvoiceMatchRunIdsByCompany, invoice.companyId).push(matchRun.supplierInvoiceMatchRunId);

    invoice.latestMatchRunId = matchRun.supplierInvoiceMatchRunId;
    invoice.matchMode = matchMode;
    invoice.approvalStatus = hasPendingInvoiceApprovalSteps(invoice) ? "pending" : invoice.approvalStatus;
    invoice.status = resolveInvoiceApprovalStatus({
      invoice,
      reviewRequired
    });
    invoice.approvedAt = invoice.status === "approved" ? nowIso(clock) : null;
    invoice.approvedByActorId = invoice.status === "approved" ? actorId : null;
    invoice.updatedAt = nowIso(clock);

    pushAudit(state, clock, {
      companyId: invoice.companyId,
      actorId,
      correlationId,
      action: "ap.supplier_invoice.matched",
      entityType: "ap_supplier_invoice",
      entityId: invoice.supplierInvoiceId,
      explanation: reviewRequired
        ? `Supplier invoice ${invoice.externalInvoiceRef} requires review after matching.`
        : `Supplier invoice ${invoice.externalInvoiceRef} matched successfully.`
    });
    return {
      invoice: presentSupplierInvoice(state, invoice),
      matchRun: copy(matchRun)
    };
  }

  function approveSupplierInvoice({
    companyId,
    supplierInvoiceId,
    actorId = "system",
    actorCompanyUserId = null,
    actorRoleCodes = [],
    correlationId = crypto.randomUUID()
  } = {}) {
    const invoice = requireSupplierInvoiceRecord(state, companyId, supplierInvoiceId);
    const supplier = requireSupplierRecord(state, invoice.companyId, invoice.supplierId);
    refreshSupplierInvoiceControls({
      state,
      invoice,
      supplier,
      actorId,
      correlationId,
      documentClassificationPlatform,
      importCasesPlatform,
      getDocumentClassificationPlatform,
      getImportCasesPlatform
    });
    if (invoice.reviewRequired) {
      throw createError(409, "supplier_invoice_review_required", "Supplier invoice still has open review requirements.");
    }
    if (invoice.status === "approved") {
      return presentSupplierInvoice(state, invoice);
    }

    const nextStep = getNextPendingInvoiceApprovalStep(invoice);
    if (!nextStep) {
      invoice.status = "approved";
      invoice.approvalStatus = invoice.approvalSteps.length > 0 ? "approved" : "not_required";
      invoice.approvedAt = invoice.approvedAt || nowIso(clock);
      invoice.approvedByActorId = invoice.approvedByActorId || actorId;
      invoice.updatedAt = nowIso(clock);
      return presentSupplierInvoice(state, invoice);
    }

    if (!canActorApproveStep({ step: nextStep, actorCompanyUserId, actorRoleCodes })) {
      throw createError(403, "approval_step_not_assigned", "Current user is not assigned to the active approval step.");
    }

    nextStep.status = "approved";
    nextStep.actedAt = nowIso(clock);
    nextStep.actedByActorId = actorId;
    nextStep.actedByCompanyUserId = normalizeOptionalText(actorCompanyUserId);
    nextStep.actedByRoleCode = resolveActedByRoleCode(nextStep, actorRoleCodes);
    invoice.approvalStatus = hasPendingInvoiceApprovalSteps(invoice) ? "pending" : "approved";
    invoice.status = hasPendingInvoiceApprovalSteps(invoice) ? "pending_approval" : "approved";
    if (invoice.status === "approved") {
      invoice.approvedAt = nowIso(clock);
      invoice.approvedByActorId = actorId;
    }
    invoice.updatedAt = nowIso(clock);

    pushAudit(state, clock, {
      companyId: invoice.companyId,
      actorId,
      correlationId,
      action: "ap.supplier_invoice.approved",
      entityType: "ap_supplier_invoice",
      entityId: invoice.supplierInvoiceId,
      explanation: `Approved supplier invoice ${invoice.externalInvoiceRef} at step ${nextStep.stepOrder}.`
    });
    return presentSupplierInvoice(state, invoice);
  }

  function postSupplierInvoice({
    companyId,
    supplierInvoiceId,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const invoice = requireSupplierInvoiceRecord(state, companyId, supplierInvoiceId);
    if (invoice.status === "posted") {
      return presentSupplierInvoice(state, invoice);
    }
    const supplier = requireSupplierRecord(state, invoice.companyId, invoice.supplierId);
    refreshSupplierInvoiceControls({
      state,
      invoice,
      supplier,
      actorId,
      correlationId,
      documentClassificationPlatform,
      importCasesPlatform,
      getDocumentClassificationPlatform,
      getImportCasesPlatform
    });
    if (invoice.reviewRequired || invoice.status !== "approved") {
      throw createError(409, "supplier_invoice_review_required", "Supplier invoice must be approved without open variances before posting.");
    }
    if (!ledgerPlatform || typeof ledgerPlatform.applyPostingIntent !== "function") {
      throw createError(500, "ledger_platform_missing", "Ledger platform is required to post AP invoices.");
    }

    const journalLines = buildSupplierInvoiceJournalLines({
      invoice,
      supplier
    });
    const groupedJournalLines = mergeJournalLines(journalLines);
    const isCreditNote = invoice.invoiceType === "credit_note";
    const posted = ledgerPlatform.applyPostingIntent({
      companyId: invoice.companyId,
      journalDate: invoice.invoiceDate,
      recipeCode: isCreditNote ? "AP_CREDIT_NOTE" : "AP_INVOICE",
      postingSignalCode: isCreditNote ? "ap.credit_note.posted" : "ap.invoice.posted",
      voucherSeriesPurposeCode: isCreditNote ? "AP_CREDIT_NOTE" : "AP_INVOICE",
      fallbackVoucherSeriesCode: "E",
      sourceType: isCreditNote ? "AP_CREDIT_NOTE" : "AP_INVOICE",
      sourceId: invoice.supplierInvoiceId,
      sourceObjectVersion: invoice.duplicateFingerprintHash,
      actorId,
      idempotencyKey: `${isCreditNote ? "ap_credit_note_post" : "ap_invoice_post"}:${invoice.supplierInvoiceId}:${invoice.duplicateFingerprintHash}`,
      description: `${isCreditNote ? "Supplier credit note" : "Supplier invoice"} ${invoice.externalInvoiceRef}`,
      metadataJson: {
        pipelineStage: "ap_supplier_invoice_posting",
        documentId: invoice.documentId,
        supplierInvoiceNo: invoice.supplierInvoiceNo,
        invoiceType: invoice.invoiceType || "standard",
        originalSupplierInvoiceId: invoice.originalSupplierInvoiceId || null
      },
      lines: groupedJournalLines
    });
    invoice.status = "posted";
    invoice.journalEntryId = posted.journalEntry.journalEntryId;
    invoice.postedAt = nowIso(clock);
    invoice.updatedAt = nowIso(clock);
    refreshSupplierInvoiceControls({
      state,
      invoice,
      supplier,
      actorId,
      correlationId,
      documentClassificationPlatform,
      importCasesPlatform,
      getDocumentClassificationPlatform,
      getImportCasesPlatform
    });

    const openItem = {
      apOpenItemId: crypto.randomUUID(),
      companyId: invoice.companyId,
      supplierInvoiceId: invoice.supplierInvoiceId,
      originalAmount: isCreditNote ? roundMoney(0 - invoice.grossAmount) : invoice.grossAmount,
      openAmount: isCreditNote ? roundMoney(0 - invoice.grossAmount) : invoice.grossAmount,
      reservedAmount: 0,
      paidAmount: 0,
      dueOn: invoice.dueDate,
      status: "open",
      paymentHold: invoice.paymentHold === true,
      paymentHoldReasonCodes: [...(invoice.paymentHoldReasonCodes || [])],
      paymentReadinessStatus: invoice.paymentReadinessStatus,
      paymentReadinessReasonCodes: [...(invoice.paymentReadinessReasonCodes || [])],
      importCaseId: invoice.importCaseId || null,
      classificationCaseId: invoice.classificationCaseId || null,
      paymentProposalId: null,
      paymentOrderId: null,
      lastPaymentOrderId: null,
      lastBankEventId: null,
      lastReservationJournalEntryId: null,
      lastSettlementJournalEntryId: null,
      lastReturnJournalEntryId: null,
      lastRejectionJournalEntryId: null,
      journalEntryId: posted.journalEntry.journalEntryId,
      currencyCode: invoice.currencyCode,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock),
      closedAt: null
    };
    state.apOpenItems.set(openItem.apOpenItemId, openItem);
    ensureCollection(state.apOpenItemIdsByCompany, invoice.companyId).push(openItem.apOpenItemId);

    const purchaseOrder = invoice.purchaseOrderId
      ? requirePurchaseOrderRecord(state, invoice.companyId, invoice.purchaseOrderId)
      : null;
    if (purchaseOrder) {
      for (const line of invoice.lines) {
        if (!line.purchaseOrderMatchedLineId) {
          continue;
        }
        const purchaseOrderLine = requirePurchaseOrderLine(purchaseOrder, line.purchaseOrderMatchedLineId);
        purchaseOrderLine.invoicedQuantity = roundQuantity(
          Math.max(0, purchaseOrderLine.invoicedQuantity + (isCreditNote ? 0 - line.quantity : line.quantity))
        );
      }
      purchaseOrder.updatedAt = nowIso(clock);
    }

    invoice.apOpenItemId = openItem.apOpenItemId;
    invoice.updatedAt = nowIso(clock);

    pushAudit(state, clock, {
      companyId: invoice.companyId,
      actorId,
      correlationId,
      action: "ap.supplier_invoice.posted",
      entityType: "ap_supplier_invoice",
      entityId: invoice.supplierInvoiceId,
      explanation: `${isCreditNote ? "Posted supplier credit note" : "Posted supplier invoice"} ${invoice.externalInvoiceRef}.`
    });
    return presentSupplierInvoice(state, invoice);
  }

  function reserveApOpenItem({
    companyId,
    apOpenItemId,
    paymentProposalId = null,
    paymentOrderId,
    bankAccountNumber = "1110",
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const openItem = requireApOpenItemRecord(state, companyId, apOpenItemId);
    if (openItem.status === "reserved" && openItem.paymentOrderId === requireText(paymentOrderId, "payment_order_id_required")) {
      return {
        openItem: copy(openItem),
        invoice: presentSupplierInvoice(state, requireSupplierInvoiceRecord(state, companyId, openItem.supplierInvoiceId)),
        journalEntryId: openItem.lastReservationJournalEntryId,
        idempotentReplay: true
      };
    }
    if (openItem.status !== "open") {
      throw createError(409, "ap_open_item_not_open", "Only open AP items can be reserved for payment.");
    }
    const invoice = requireSupplierInvoiceRecord(state, companyId, openItem.supplierInvoiceId);
    const supplier = requireSupplierRecord(state, companyId, invoice.supplierId);
    refreshSupplierInvoiceControls({
      state,
      invoice,
      supplier,
      actorId,
      correlationId,
      documentClassificationPlatform,
      importCasesPlatform,
      getDocumentClassificationPlatform,
      getImportCasesPlatform
    });
    openItem.paymentHold = invoice.paymentHold === true;
    openItem.paymentHoldReasonCodes = [...(invoice.paymentHoldReasonCodes || [])];
    openItem.paymentReadinessStatus = invoice.paymentReadinessStatus;
    openItem.paymentReadinessReasonCodes = [...(invoice.paymentReadinessReasonCodes || [])];
    openItem.updatedAt = nowIso(clock);
    if (invoice.status !== "posted") {
      throw createError(409, "supplier_invoice_not_posted", "Only posted supplier invoices can enter payment proposals.");
    }
    if (invoice.invoiceType === "credit_note" || Number(openItem.openAmount || 0) <= 0) {
      throw createError(409, "credit_note_not_payable", "Supplier credit notes and non-positive AP balances cannot enter payment proposals.");
    }
    if (invoice.reviewRequired || supplier.paymentBlocked === true || invoice.paymentHold === true) {
      throw createError(409, "payment_hold_active", "Supplier invoice is blocked from payment until risk or review is cleared.");
    }
    ensureSupplierPaymentDetails(supplier);

    const journalEntry = postApLifecycleJournal({
      ledgerPlatform,
      companyId: openItem.companyId,
      journalDate: openItem.dueOn,
      recipeCode: "AP_PAYMENT_RESERVE",
      postingSignalCode: "ap.payment.reserved",
      actorId,
      sourceId: `${paymentOrderId}:reserve`,
      sourceObjectVersion: hashObject({
        apOpenItemId: openItem.apOpenItemId,
        paymentOrderId,
        reservedAmount: openItem.openAmount
      }),
      idempotencyKey: `ap_payment_reserve:${openItem.apOpenItemId}:${paymentOrderId}`,
      description: `AP payment reserve ${invoice.externalInvoiceRef}`,
      metadataJson: {
        pipelineStage: "ap_payment_reserve",
        apOpenItemId: openItem.apOpenItemId,
        paymentOrderId,
        paymentProposalId
      },
      lines: mergeJournalLines([
        {
          accountNumber: resolveLiabilityAccountNumber(supplier),
          debitAmount: openItem.openAmount,
          creditAmount: 0,
          dimensionJson: {}
        },
        {
          accountNumber: "2450",
          debitAmount: 0,
          creditAmount: openItem.openAmount,
          dimensionJson: {}
        }
      ])
    });

    openItem.status = "reserved";
    openItem.reservedAmount = openItem.openAmount;
    openItem.paymentProposalId = normalizeOptionalText(paymentProposalId);
    openItem.paymentOrderId = requireText(paymentOrderId, "payment_order_id_required");
    openItem.lastPaymentOrderId = openItem.paymentOrderId;
    openItem.lastReservationJournalEntryId = journalEntry.journalEntryId;
    openItem.updatedAt = nowIso(clock);

    invoice.status = "scheduled_for_payment";
    invoice.updatedAt = nowIso(clock);

    pushAudit(state, clock, {
      companyId: openItem.companyId,
      actorId,
      correlationId,
      action: "ap.open_item.reserved",
      entityType: "ap_open_item",
      entityId: openItem.apOpenItemId,
      explanation: `Reserved AP item ${openItem.apOpenItemId} into payment order ${paymentOrderId}.`
    });

    return {
      openItem: copy(openItem),
      invoice: presentSupplierInvoice(state, invoice),
      journalEntryId: journalEntry.journalEntryId,
      idempotentReplay: false
    };
  }

  function releaseApOpenItemReservation({
    companyId,
    apOpenItemId,
    paymentOrderId,
    actorId = "system",
    correlationId = crypto.randomUUID(),
    reasonCode = "payment_rejected"
  } = {}) {
    const openItem = requireApOpenItemRecord(state, companyId, apOpenItemId);
    if (openItem.status !== "reserved") {
      throw createError(409, "ap_open_item_not_reserved", "Only reserved AP items can be released from payment.");
    }
    if (paymentOrderId && openItem.paymentOrderId !== paymentOrderId) {
      throw createError(409, "payment_order_scope_mismatch", "Reservation belongs to another payment order.");
    }
    const invoice = requireSupplierInvoiceRecord(state, companyId, openItem.supplierInvoiceId);
    const supplier = requireSupplierRecord(state, companyId, invoice.supplierId);
    const resolvedPaymentOrderId = openItem.paymentOrderId || requireText(paymentOrderId, "payment_order_id_required");

    const journalEntry = postApLifecycleJournal({
      ledgerPlatform,
      companyId: openItem.companyId,
      journalDate: nowIso(clock).slice(0, 10),
      recipeCode: "AP_PAYMENT_RELEASE",
      postingSignalCode: "ap.payment.released",
      actorId,
      sourceId: `${resolvedPaymentOrderId}:reject`,
      sourceObjectVersion: hashObject({
        apOpenItemId: openItem.apOpenItemId,
        paymentOrderId: resolvedPaymentOrderId,
        reasonCode
      }),
      idempotencyKey: `ap_payment_release:${openItem.apOpenItemId}:${resolvedPaymentOrderId}:${reasonCode}`,
      description: `AP payment release ${invoice.externalInvoiceRef}`,
      metadataJson: {
        pipelineStage: "ap_payment_release",
        apOpenItemId: openItem.apOpenItemId,
        paymentOrderId: resolvedPaymentOrderId,
        reasonCode
      },
      lines: mergeJournalLines([
        {
          accountNumber: "2450",
          debitAmount: openItem.reservedAmount || openItem.openAmount,
          creditAmount: 0,
          dimensionJson: {}
        },
        {
          accountNumber: resolveLiabilityAccountNumber(supplier),
          debitAmount: 0,
          creditAmount: openItem.reservedAmount || openItem.openAmount,
          dimensionJson: {}
        }
      ])
    });

    openItem.status = "open";
    openItem.reservedAmount = 0;
    openItem.paymentProposalId = null;
    openItem.paymentOrderId = null;
    openItem.lastRejectionJournalEntryId = journalEntry.journalEntryId;
    openItem.updatedAt = nowIso(clock);

    invoice.status = "posted";
    invoice.updatedAt = nowIso(clock);

    pushAudit(state, clock, {
      companyId: openItem.companyId,
      actorId,
      correlationId,
      action: "ap.open_item.reservation_released",
      entityType: "ap_open_item",
      entityId: openItem.apOpenItemId,
      explanation: `Released payment reservation ${resolvedPaymentOrderId} for AP item ${openItem.apOpenItemId}.`
    });

    return {
      openItem: copy(openItem),
      invoice: presentSupplierInvoice(state, invoice),
      journalEntryId: journalEntry.journalEntryId
    };
  }

  function settleApOpenItem({
    companyId,
    apOpenItemId,
    paymentOrderId,
    bankAccountNumber,
    bankEventId = null,
    bookedOn = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const openItem = requireApOpenItemRecord(state, companyId, apOpenItemId);
    if (openItem.status === "paid" && bankEventId && openItem.lastBankEventId === bankEventId) {
      return {
        openItem: copy(openItem),
        invoice: presentSupplierInvoice(state, requireSupplierInvoiceRecord(state, companyId, openItem.supplierInvoiceId)),
        journalEntryId: openItem.lastSettlementJournalEntryId,
        idempotentReplay: true
      };
    }
    if (openItem.status !== "reserved") {
      throw createError(409, "ap_open_item_not_reserved", "Only reserved AP items can be settled from bank booking.");
    }
    if (paymentOrderId && openItem.paymentOrderId !== paymentOrderId) {
      throw createError(409, "payment_order_scope_mismatch", "Reserved AP item belongs to another payment order.");
    }
    const invoice = requireSupplierInvoiceRecord(state, companyId, openItem.supplierInvoiceId);
    const resolvedBookedOn = normalizeDate(bookedOn || nowIso(clock).slice(0, 10), "payment_booked_date_invalid");
    const journalEntry = postApLifecycleJournal({
      ledgerPlatform,
      companyId: openItem.companyId,
      journalDate: resolvedBookedOn,
      recipeCode: "AP_PAYMENT_SETTLEMENT",
      postingSignalCode: "bank.payment_order.settled",
      actorId,
      sourceId: `${openItem.paymentOrderId || paymentOrderId}:book`,
      sourceObjectVersion: hashObject({
        apOpenItemId: openItem.apOpenItemId,
        paymentOrderId: openItem.paymentOrderId || paymentOrderId,
        bankEventId,
        bookedOn: resolvedBookedOn
      }),
      idempotencyKey: `ap_payment_settle:${openItem.apOpenItemId}:${openItem.paymentOrderId || paymentOrderId}:${resolvedBookedOn}`,
      description: `AP payment settled ${invoice.externalInvoiceRef}`,
      metadataJson: {
        pipelineStage: "ap_payment_settlement",
        apOpenItemId: openItem.apOpenItemId,
        paymentOrderId: openItem.paymentOrderId || paymentOrderId,
        bankEventId
      },
      lines: mergeJournalLines([
        {
          accountNumber: "2450",
          debitAmount: openItem.reservedAmount || openItem.openAmount,
          creditAmount: 0,
          dimensionJson: {}
        },
        {
          accountNumber: requireText(bankAccountNumber, "bank_account_number_required"),
          debitAmount: 0,
          creditAmount: openItem.reservedAmount || openItem.openAmount,
          dimensionJson: {}
        }
      ])
    });

    openItem.paidAmount = roundMoney(openItem.paidAmount + openItem.openAmount);
    openItem.openAmount = 0;
    openItem.reservedAmount = 0;
    openItem.status = "paid";
    openItem.closedAt = `${resolvedBookedOn}T00:00:00.000Z`;
    openItem.lastBankEventId = normalizeOptionalText(bankEventId);
    openItem.lastSettlementJournalEntryId = journalEntry.journalEntryId;
    openItem.updatedAt = nowIso(clock);

    invoice.status = "paid";
    invoice.paidAt = nowIso(clock);
    invoice.updatedAt = nowIso(clock);

    pushAudit(state, clock, {
      companyId: openItem.companyId,
      actorId,
      correlationId,
      action: "ap.open_item.settled",
      entityType: "ap_open_item",
      entityId: openItem.apOpenItemId,
      explanation: `Settled AP item ${openItem.apOpenItemId} from bank booking ${bankEventId || "manual"}.`
    });

    return {
      openItem: copy(openItem),
      invoice: presentSupplierInvoice(state, invoice),
      journalEntryId: journalEntry.journalEntryId,
      idempotentReplay: false
    };
  }

  function reopenApOpenItem({
    companyId,
    apOpenItemId,
    paymentOrderId = null,
    bankAccountNumber,
    bankEventId,
    returnedOn = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const openItem = requireApOpenItemRecord(state, companyId, apOpenItemId);
    if (openItem.status === "open" && bankEventId && openItem.lastBankEventId === bankEventId) {
      return {
        openItem: copy(openItem),
        invoice: presentSupplierInvoice(state, requireSupplierInvoiceRecord(state, companyId, openItem.supplierInvoiceId)),
        journalEntryId: openItem.lastReturnJournalEntryId,
        idempotentReplay: true
      };
    }
    if (openItem.status !== "paid") {
      throw createError(409, "ap_open_item_not_paid", "Only paid AP items can be reopened from a bank return.");
    }
    const invoice = requireSupplierInvoiceRecord(state, companyId, openItem.supplierInvoiceId);
    const supplier = requireSupplierRecord(state, companyId, invoice.supplierId);
    const resolvedReturnedOn = normalizeDate(returnedOn || nowIso(clock).slice(0, 10), "payment_return_date_invalid");
    const journalEntry = postApLifecycleJournal({
      ledgerPlatform,
      companyId: openItem.companyId,
      journalDate: resolvedReturnedOn,
      recipeCode: "AP_PAYMENT_RETURN",
      postingSignalCode: "bank.payment_order.returned",
      actorId,
      sourceId: `${openItem.lastPaymentOrderId || openItem.paymentOrderId || paymentOrderId}:return`,
      sourceObjectVersion: hashObject({
        apOpenItemId: openItem.apOpenItemId,
        paymentOrderId: openItem.lastPaymentOrderId || openItem.paymentOrderId || paymentOrderId,
        bankEventId,
        returnedOn: resolvedReturnedOn
      }),
      idempotencyKey: `ap_payment_return:${openItem.apOpenItemId}:${bankEventId || openItem.lastPaymentOrderId || paymentOrderId}`,
      description: `AP payment returned ${invoice.externalInvoiceRef}`,
      metadataJson: {
        pipelineStage: "ap_payment_return",
        apOpenItemId: openItem.apOpenItemId,
        paymentOrderId: openItem.lastPaymentOrderId || openItem.paymentOrderId || paymentOrderId,
        bankEventId
      },
      lines: mergeJournalLines([
        {
          accountNumber: requireText(bankAccountNumber, "bank_account_number_required"),
          debitAmount: openItem.originalAmount || invoice.grossAmount,
          creditAmount: 0,
          dimensionJson: {}
        },
        {
          accountNumber: resolveLiabilityAccountNumber(supplier),
          debitAmount: 0,
          creditAmount: openItem.originalAmount || invoice.grossAmount,
          dimensionJson: {}
        }
      ])
    });

    openItem.openAmount = openItem.originalAmount || invoice.grossAmount;
    openItem.paidAmount = 0;
    openItem.reservedAmount = 0;
    openItem.status = "open";
    openItem.paymentProposalId = null;
    openItem.paymentOrderId = null;
    openItem.closedAt = null;
    openItem.lastBankEventId = requireText(bankEventId, "bank_event_id_required");
    openItem.lastReturnJournalEntryId = journalEntry.journalEntryId;
    openItem.updatedAt = nowIso(clock);

    invoice.status = "posted";
    invoice.paidAt = null;
    invoice.updatedAt = nowIso(clock);

    pushAudit(state, clock, {
      companyId: openItem.companyId,
      actorId,
      correlationId,
      action: "ap.open_item.reopened",
      entityType: "ap_open_item",
      entityId: openItem.apOpenItemId,
      explanation: `Reopened AP item ${openItem.apOpenItemId} from returned payment ${bankEventId}.`
    });

    return {
      openItem: copy(openItem),
      invoice: presentSupplierInvoice(state, invoice),
      journalEntryId: journalEntry.journalEntryId,
      idempotentReplay: false
    };
  }

  function snapshotAp() {
    return {
      suppliers: Array.from(state.suppliers.values()).map(copy),
      purchaseOrders: Array.from(state.purchaseOrders.values()).map(copy),
      receipts: Array.from(state.receipts.values()).map(copy),
      supplierInvoices: Array.from(state.supplierInvoices.values()).map(copy),
      supplierInvoiceMatchRuns: Array.from(state.supplierInvoiceMatchRuns.values()).map(copy),
      supplierInvoiceVariances: Array.from(state.supplierInvoiceVariances.values()).map(copy),
      apOpenItems: Array.from(state.apOpenItems.values()).map(copy),
      supplierImportBatches: Array.from(state.supplierImportBatches.values()).map(copy),
      purchaseOrderImportBatches: Array.from(state.purchaseOrderImportBatches.values()).map(copy),
      auditEvents: state.auditEvents.map(copy)
    };
  }

  function exportDurableState() {
    return serializeDurableState(state);
  }

  function importDurableState(snapshot) {
    applyDurableStateSnapshot(state, snapshot);
  }

  function seedDemoState() {
    // FAS 6.1 runtime demo seeding remains intentionally empty.
  }
}

function requireSupplierRecord(state, companyId, supplierId) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const record = state.suppliers.get(requireText(supplierId, "supplier_id_required"));
  if (!record || record.companyId !== resolvedCompanyId) {
    throw createError(404, "supplier_not_found", "Supplier was not found.");
  }
  return record;
}

function requirePurchaseOrderRecord(state, companyId, purchaseOrderId) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const record = state.purchaseOrders.get(requireText(purchaseOrderId, "purchase_order_id_required"));
  if (!record || record.companyId !== resolvedCompanyId) {
    throw createError(404, "purchase_order_not_found", "Purchase order was not found.");
  }
  return record;
}

function requirePurchaseOrderLine(purchaseOrder, purchaseOrderLineId) {
  const resolvedPurchaseOrderLineId = requireText(purchaseOrderLineId, "purchase_order_line_id_required");
  const line = purchaseOrder.lines.find((candidate) => candidate.purchaseOrderLineId === resolvedPurchaseOrderLineId);
  if (!line) {
    throw createError(404, "purchase_order_line_not_found", "Purchase-order line was not found.");
  }
  return line;
}

function requireSupplierInvoiceRecord(state, companyId, supplierInvoiceId) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const invoice = state.supplierInvoices.get(requireText(supplierInvoiceId, "supplier_invoice_id_required"));
  if (!invoice || invoice.companyId !== resolvedCompanyId) {
    throw createError(404, "supplier_invoice_not_found", "Supplier invoice was not found.");
  }
  return invoice;
}

function requireApOpenItemRecord(state, companyId, apOpenItemId) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const openItem = state.apOpenItems.get(requireText(apOpenItemId, "ap_open_item_id_required"));
  if (!openItem || openItem.companyId !== resolvedCompanyId) {
    throw createError(404, "ap_open_item_not_found", "AP open item was not found.");
  }
  return openItem;
}

function presentSupplierInvoice(state, invoice) {
  const varianceIds = state.supplierInvoiceVarianceIdsByInvoice.get(invoice.supplierInvoiceId) || [];
  const variances = varianceIds
    .map((varianceId) => state.supplierInvoiceVariances.get(varianceId))
    .filter(Boolean)
    .map(copy);
  const matchRun = invoice.latestMatchRunId ? copy(state.supplierInvoiceMatchRuns.get(invoice.latestMatchRunId)) : null;
  return copy({
    ...invoice,
    variances,
    matchRun
  });
}

function refreshSupplierInvoiceControls({
  state,
  invoice,
  supplier,
  actorId = "system",
  correlationId = crypto.randomUUID(),
  documentClassificationPlatform = null,
  importCasesPlatform = null,
  getDocumentClassificationPlatform = null,
  getImportCasesPlatform = null
}) {
  const resolvedClassificationPlatform = resolveDeferredPlatform({
    platform: documentClassificationPlatform,
    getter: getDocumentClassificationPlatform
  });
  const resolvedImportCasesPlatform = resolveDeferredPlatform({
    platform: importCasesPlatform,
    getter: getImportCasesPlatform
  });
  const classificationCase = resolveInvoiceClassificationCase({
    documentClassificationPlatform: resolvedClassificationPlatform,
    companyId: invoice.companyId,
    documentId: invoice.documentId,
    classificationCaseId: invoice.classificationCaseId
  });
  const classificationAssessment = assessInvoiceClassificationCase(classificationCase);
  const importCase = resolveInvoiceImportCase({
    importCasesPlatform: resolvedImportCasesPlatform,
    companyId: invoice.companyId,
    documentId: invoice.documentId,
    importCaseId: invoice.importCaseId,
    actorId,
    correlationId
  });
  const importAssessment = assessInvoiceImportCase({
    invoice,
    supplier,
    importCase
  });

  invoice.classificationCaseId = classificationCase?.classificationCaseId || normalizeOptionalText(invoice.classificationCaseId);
  invoice.classificationCaseStatus = classificationCase?.status || null;
  invoice.classificationReviewReasonCodes = [...classificationAssessment.reviewReasonCodes];
  invoice.classificationTreatmentCodes = [...classificationAssessment.treatmentCodes];
  invoice.classificationTargetDomainCodes = [...classificationAssessment.targetDomainCodes];
  invoice.personLinkedDocumentFlag = classificationAssessment.personLinkedDocumentFlag;
  invoice.personLinkedDocumentBlocked = classificationAssessment.personLinkedDocumentBlocked;

  invoice.importCaseId = importCase?.importCaseId || normalizeOptionalText(invoice.importCaseId);
  invoice.importCaseStatus = importCase?.status || null;
  invoice.importCaseCompletenessStatus = importCase?.completeness?.status || null;
  invoice.importCaseBlockingReasonCodes = [...importAssessment.blockingReasonCodes];
  invoice.requiresImportCase = importAssessment.requiresImportCase;

  invoice.dynamicReviewQueueCodes = uniqueStrings([
    ...classificationAssessment.reviewQueueCodes,
    ...importAssessment.reviewQueueCodes
  ]);
  invoice.reviewQueueCodes = uniqueStrings([
    ...(invoice.staticReviewQueueCodes || []),
    ...(invoice.matchReviewQueueCodes || []),
    ...(invoice.dynamicReviewQueueCodes || [])
  ]);
  invoice.reviewRequired = invoice.reviewQueueCodes.length > 0;

  invoice.dynamicPaymentHoldReasonCodes = uniqueStrings([
    ...classificationAssessment.paymentHoldReasonCodes,
    ...importAssessment.paymentHoldReasonCodes
  ]);
  invoice.paymentHoldReasonCodes = uniqueStrings([
    ...(invoice.staticPaymentHoldReasonCodes || []),
    ...(invoice.dynamicPaymentHoldReasonCodes || [])
  ]);
  invoice.paymentHold = invoice.paymentHoldReasonCodes.length > 0;

  invoice.paymentReadinessReasonCodes = uniqueStrings([
    ...(invoice.status === "posted" ? [] : ["invoice_not_posted"]),
    ...(invoice.reviewRequired ? ["review_required"] : []),
    ...(invoice.paymentHoldReasonCodes || []),
    ...(invoice.invoiceType === "credit_note" ? ["credit_note_not_payable"] : []),
    ...(hasSupplierPaymentDetails(supplier) ? [] : ["supplier_payment_details_missing"])
  ]);
  invoice.paymentReadinessStatus =
    invoice.invoiceType === "credit_note"
      ? "not_applicable"
      : invoice.paymentReadinessReasonCodes.length === 0
      ? "ready"
      : invoice.status === "posted"
        ? "blocked"
        : "not_ready";
}

function resolveDeferredPlatform({ platform = null, getter = null }) {
  if (platform) {
    return platform;
  }
  if (typeof getter === "function") {
    return getter() || null;
  }
  return null;
}

function resolveInvoiceClassificationCase({
  documentClassificationPlatform,
  companyId,
  documentId = null,
  classificationCaseId = null
}) {
  const resolvedClassificationCaseId = normalizeOptionalText(classificationCaseId);
  if (!resolvedClassificationCaseId && !documentId) {
    return null;
  }
  if (
    !documentClassificationPlatform ||
    typeof documentClassificationPlatform.getClassificationCase !== "function" ||
    typeof documentClassificationPlatform.listClassificationCases !== "function"
  ) {
    if (resolvedClassificationCaseId) {
      throw createError(
        409,
        "document_classification_platform_missing",
        "Document classification platform is required when classificationCaseId is supplied."
      );
    }
    return null;
  }

  const classificationCase = resolvedClassificationCaseId
    ? documentClassificationPlatform.getClassificationCase({
        companyId,
        classificationCaseId: resolvedClassificationCaseId
      })
    : documentClassificationPlatform
        .listClassificationCases({ companyId, documentId: requireText(documentId, "document_id_required") })
        .filter((candidate) => candidate.correctedToCaseId == null)
        .at(-1) || null;

  if (classificationCase && documentId && classificationCase.documentId !== documentId) {
    throw createError(
      409,
      "classification_case_document_mismatch",
      "Classification case does not belong to the supplier invoice document."
    );
  }
  return classificationCase;
}

function assessInvoiceClassificationCase(classificationCase) {
  if (!classificationCase) {
    return {
      reviewReasonCodes: [],
      treatmentCodes: [],
      targetDomainCodes: [],
      personLinkedDocumentFlag: false,
      personLinkedDocumentBlocked: false,
      reviewQueueCodes: [],
      paymentHoldReasonCodes: []
    };
  }

  const treatmentIntents = Array.isArray(classificationCase.treatmentIntents) ? classificationCase.treatmentIntents : [];
  const treatmentCodes = uniqueStrings(treatmentIntents.map((intent) => intent.treatmentCode));
  const targetDomainCodes = uniqueStrings(treatmentIntents.map((intent) => intent.targetDomainCode));
  const personLinkedDocumentFlag =
    (Array.isArray(classificationCase.personLinks) && classificationCase.personLinks.length > 0) ||
    targetDomainCodes.some((code) => ["PAYROLL", "BENEFITS", "TRAVEL"].includes(code)) ||
    treatmentCodes.some((code) =>
      ["PRIVATE_RECEIVABLE", "NET_SALARY_DEDUCTION", "TAXABLE_BENEFIT", "WELLNESS_ALLOWANCE"].includes(code)
    );
  const classificationPending = !["approved", "dispatched"].includes(classificationCase.status);
  const personLinkedDocumentBlocked =
    personLinkedDocumentFlag &&
    (classificationPending ||
      targetDomainCodes.some((code) => ["PAYROLL", "BENEFITS", "TRAVEL"].includes(code)) ||
      treatmentCodes.some((code) =>
        ["PRIVATE_RECEIVABLE", "NET_SALARY_DEDUCTION", "TAXABLE_BENEFIT", "WELLNESS_ALLOWANCE"].includes(code)
      ));

  return {
    reviewReasonCodes: [...(classificationCase.reviewReasonCodes || [])],
    treatmentCodes,
    targetDomainCodes,
    personLinkedDocumentFlag,
    personLinkedDocumentBlocked,
    reviewQueueCodes: personLinkedDocumentFlag ? ["person_linked_document"] : [],
    paymentHoldReasonCodes: uniqueStrings([
      ...(classificationPending ? ["person_linked_classification_pending"] : []),
      ...(personLinkedDocumentBlocked ? ["person_linked_handoff_required"] : [])
    ])
  };
}

function resolveInvoiceImportCase({
  importCasesPlatform,
  companyId,
  documentId = null,
  importCaseId = null,
  actorId = "system",
  correlationId = crypto.randomUUID()
}) {
  const resolvedImportCaseId = normalizeOptionalText(importCaseId);
  if (!resolvedImportCaseId) {
    return null;
  }
  if (
    !importCasesPlatform ||
    typeof importCasesPlatform.getImportCase !== "function" ||
    typeof importCasesPlatform.attachDocumentToImportCase !== "function"
  ) {
    throw createError(409, "import_cases_platform_missing", "Import cases platform is required when importCaseId is supplied.");
  }
  let importCase = importCasesPlatform.getImportCase({
    companyId,
    importCaseId: resolvedImportCaseId
  });
  if (
    documentId &&
    ["opened", "collecting_documents", "ready_for_review"].includes(importCase.status) &&
    !importCase.documentLinks.some((link) => link.documentId === documentId)
  ) {
    const roleCode = importCase.documentLinks.some((link) => link.roleCode === "PRIMARY_SUPPLIER_DOCUMENT")
      ? "OTHER_SUPPORTING_DOCUMENT"
      : "PRIMARY_SUPPLIER_DOCUMENT";
    importCase = importCasesPlatform.attachDocumentToImportCase({
      companyId,
      importCaseId: resolvedImportCaseId,
      documentId,
      roleCode,
      metadataJson: {
        relationType: "ap_supplier_invoice_source_document",
        correlationId
      },
      actorId
    });
  }
  return importCase;
}

function assessInvoiceImportCase({ invoice, supplier, importCase }) {
  const requiresImportCase =
    invoice.requiresImportCase === true ||
    (supplier.countryCode !== "SE" &&
      !EU_COUNTRY_CODES.has(supplier.countryCode) &&
      invoice.lines.some((line) => line.goodsOrServices === "goods" || line.importCaseRequired === true));
  if (!requiresImportCase && !importCase) {
    return {
      requiresImportCase: false,
      blockingReasonCodes: [],
      reviewQueueCodes: [],
      paymentHoldReasonCodes: []
    };
  }

  const blockingReasonCodes = [];
  if (!importCase) {
    blockingReasonCodes.push("IMPORT_CASE_REQUIRED");
  } else {
    if (importCase.completeness?.status !== "complete") {
      blockingReasonCodes.push(...(importCase.completeness?.blockingReasonCodes || []));
      blockingReasonCodes.push("IMPORT_CASE_INCOMPLETE");
    }
    if (!["approved", "posted"].includes(importCase.status)) {
      blockingReasonCodes.push("IMPORT_CASE_NOT_APPROVED");
    }
  }

  return {
    requiresImportCase,
    blockingReasonCodes: uniqueStrings(blockingReasonCodes),
    reviewQueueCodes: blockingReasonCodes.length > 0 ? ["import_case_review"] : [],
    paymentHoldReasonCodes: uniqueStrings(
      blockingReasonCodes.map((reasonCode) => {
        switch (reasonCode) {
          case "IMPORT_CASE_REQUIRED":
            return "import_case_required";
          case "IMPORT_CASE_INCOMPLETE":
          case "PRIMARY_SUPPLIER_DOCUMENT_MISSING":
          case "CUSTOMS_EVIDENCE_MISSING":
            return "import_case_incomplete";
          case "IMPORT_CASE_NOT_APPROVED":
            return "import_case_not_approved";
          default:
            return `import_case_${String(reasonCode).toLowerCase()}`;
        }
      })
    )
  };
}

function hasSupplierPaymentDetails(supplier) {
  return Boolean(supplier?.bankgiro || supplier?.plusgiro || supplier?.iban);
}

function buildInvoiceApprovalSteps({ orgAuthPlatform, supplier, actorId = "system", clock = () => new Date() }) {
  if (
    !supplier?.attestChainId ||
    !orgAuthPlatform ||
    typeof orgAuthPlatform.getApprovalChainSnapshot !== "function"
  ) {
    return [];
  }
  const chain = orgAuthPlatform.getApprovalChainSnapshot({
    approvalChainId: supplier.attestChainId
  });
  return (chain.steps || []).map((step) => ({
    approvalChainStepId: step.approvalChainStepId,
    stepOrder: step.stepOrder,
    approverRoleCode: step.approverRoleCode || null,
    approverCompanyUserId: step.approverCompanyUserId || null,
    delegationAllowed: step.delegationAllowed !== false,
    label: step.metadataJson?.label || `step_${step.stepOrder}`,
    status: "pending",
    actedAt: null,
    actedByActorId: null,
    actedByCompanyUserId: null,
    actedByRoleCode: null,
    createdByActorId: actorId,
    createdAt: nowIso(clock),
    updatedAt: nowIso(clock)
  }));
}

function hasPendingInvoiceApprovalSteps(invoice) {
  return (invoice.approvalSteps || []).some((step) => step.status === "pending");
}

function getNextPendingInvoiceApprovalStep(invoice) {
  return [...(invoice.approvalSteps || [])]
    .sort((left, right) => Number(left.stepOrder || 0) - Number(right.stepOrder || 0))
    .find((step) => step.status === "pending") || null;
}

function canActorApproveStep({ step, actorCompanyUserId = null, actorRoleCodes = [] }) {
  const resolvedActorCompanyUserId = normalizeOptionalText(actorCompanyUserId);
  const roleCodes = Array.isArray(actorRoleCodes) ? actorRoleCodes.map((value) => normalizeOptionalText(value)).filter(Boolean) : [];
  if (step.approverCompanyUserId && resolvedActorCompanyUserId === step.approverCompanyUserId) {
    return true;
  }
  if (step.approverRoleCode && roleCodes.includes(step.approverRoleCode)) {
    return true;
  }
  return false;
}

function resolveActedByRoleCode(step, actorRoleCodes = []) {
  const roleCodes = Array.isArray(actorRoleCodes) ? actorRoleCodes.map((value) => normalizeOptionalText(value)).filter(Boolean) : [];
  if (step.approverRoleCode && roleCodes.includes(step.approverRoleCode)) {
    return step.approverRoleCode;
  }
  return roleCodes[0] || null;
}

function resolveInvoiceApprovalStatus({ invoice, reviewRequired }) {
  if (reviewRequired) {
    return "pending_approval";
  }
  if (hasPendingInvoiceApprovalSteps(invoice)) {
    return "pending_approval";
  }
  return "approved";
}

function resolveSupplierForInvoiceIngest({ state, companyId, supplierId = null, supplierNo = null, ocrFields = {} }) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  if (supplierId) {
    return requireSupplierRecord(state, resolvedCompanyId, supplierId);
  }
  const normalizedSupplierNo = normalizeOptionalText(supplierNo);
  if (normalizedSupplierNo) {
    const resolvedSupplierId = state.supplierIdsByCompanyNo.get(
      toCompanyScopedKey(resolvedCompanyId, normalizedSupplierNo.toUpperCase())
    );
    if (!resolvedSupplierId) {
      throw createError(404, "supplier_not_found", "Supplier number was not found.");
    }
    return requireSupplierRecord(state, resolvedCompanyId, resolvedSupplierId);
  }
  const counterparty = readOcrFieldValue(ocrFields.counterparty);
  if (!counterparty) {
    throw createError(409, "supplier_missing_or_blocked", "Supplier could not be resolved from OCR.");
  }
  const normalizedCounterparty = normalizePartyLabel(counterparty);
  const candidates = (state.supplierIdsByCompany.get(resolvedCompanyId) || [])
    .map((candidateSupplierId) => state.suppliers.get(candidateSupplierId))
    .filter(Boolean);
  const exact = candidates.find((candidate) => normalizePartyLabel(candidate.legalName) === normalizedCounterparty);
  if (exact) {
    return exact;
  }
  const fuzzy = candidates.find((candidate) => normalizePartyLabel(candidate.legalName).includes(normalizedCounterparty));
  if (fuzzy) {
    return fuzzy;
  }
  throw createError(409, "supplier_missing_or_blocked", "Supplier could not be matched from OCR counterparty.");
}

function resolveDocumentInvoiceContext({ documentPlatform, companyId, documentId }) {
  if (!documentPlatform || typeof documentPlatform.getDocumentOcrRuns !== "function") {
    throw createError(500, "document_platform_missing", "Document platform is required for document-based AP ingest.");
  }
  const documentState = documentPlatform.getDocumentOcrRuns({
    companyId,
    documentId
  });
  const latestRun = [...(documentState.ocrRuns || [])]
    .sort((left, right) => (left.completedAt || left.createdAt).localeCompare(right.completedAt || right.createdAt))
    .at(-1);
  if (!latestRun) {
    throw createError(409, "document_ocr_required", "Document OCR must be completed before AP ingest.");
  }
  const approvedCorrection = [...(documentState.reviewTasks || [])]
    .filter((task) => task.ocrRunId === latestRun.ocrRunId && task.status === "approved")
    .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt))
    .at(-1);
  const ocrFields = mergeOcrFieldMaps(latestRun.extractedFieldsJson || {}, approvedCorrection?.correctedFieldsJson || {});
  return {
    documentId: documentState.document.documentId,
    documentVersionId: latestRun.ocrDocumentVersionId || latestRun.sourceDocumentVersionId || null,
    externalInvoiceRef: readOcrFieldValue(ocrFields.invoiceNumber),
    invoiceNumber: readOcrFieldValue(ocrFields.invoiceNumber),
    invoiceDate: readOcrFieldValue(ocrFields.invoiceDate),
    dueDate: readOcrFieldValue(ocrFields.dueDate),
    currencyCode: readOcrFieldValue(ocrFields.currencyCode),
    paymentReference: readOcrFieldValue(ocrFields.reference),
    purchaseOrderReference: readOcrFieldValue(ocrFields.purchaseOrderReference),
    ocrFields,
    lineItems: Array.isArray(readOcrFieldValue(ocrFields.lineItems)) ? readOcrFieldValue(ocrFields.lineItems) : [],
    reviewRequired: latestRun.reviewRequired === true,
    extractedText: latestRun.extractedText || "",
    documentHash: hashObject({
      documentId: documentState.document.documentId,
      ocrRunId: latestRun.ocrRunId,
      extractedFieldsJson: ocrFields,
      extractedText: latestRun.extractedText || ""
    })
  };
}

function normalizeSupplierInvoiceLines({
  lines,
  documentContext,
  supplier,
  purchaseOrder,
  invoiceType = "standard",
  invoiceDate,
  currencyCode,
  companyId,
  ledgerPlatform,
  vatPlatform,
  actorId,
  correlationId
}) {
  const documentLines = documentContext?.lineItems || [];
  const sourceLines =
    Array.isArray(lines) && lines.length > 0
      ? lines
      : documentLines.length > 0
        ? documentLines
        : [
            {
              description: `Invoice ${documentContext?.externalInvoiceRef || "summary"}`,
              quantity: 1,
              unitPrice: readMoneyField(documentContext?.ocrFields?.netAmount) || readMoneyField(documentContext?.ocrFields?.totalAmount),
              netAmount: readMoneyField(documentContext?.ocrFields?.netAmount) || readMoneyField(documentContext?.ocrFields?.totalAmount),
              vatCode: supplier.defaultVatCode,
              expenseAccountNumber: supplier.defaultExpenseAccountNumber
            }
          ];

  return sourceLines.map((line, index) => {
    const purchaseOrderLine = purchaseOrder ? resolvePurchaseOrderLineForInvoice(purchaseOrder, { ...line, lineNo: index + 1 }) : null;
    const quantity = roundQuantity(
      normalizePositiveNumber(
        line.quantity ?? 1,
        "supplier_invoice_line_quantity_invalid"
      )
    );
    const unitPrice = normalizeMoney(
      line.unitPrice ??
        (line.netAmount != null ? Number(line.netAmount) / quantity : purchaseOrderLine?.unitPrice ?? supplier.defaultUnitPrice ?? 0),
      "supplier_invoice_line_unit_price_invalid"
    );
    if (unitPrice <= 0) {
      throw createError(409, "supplier_invoice_line_unit_price_invalid", "Supplier invoice line unit price must be positive.");
    }
    const netAmount = normalizeMoney(
      line.netAmount != null ? line.netAmount : roundMoney(quantity * unitPrice),
      "supplier_invoice_line_net_amount_invalid"
    );
    const expenseAccountNumber =
      normalizeOptionalAccountNumber(line.expenseAccountNumber) ||
      purchaseOrderLine?.expenseAccountNumber ||
      purchaseOrder?.defaultExpenseAccountNumber ||
      supplier.defaultExpenseAccountNumber ||
      null;
    const dimensionsJson = mergeDimensions(
      supplier.defaultDimensionsJson,
      mergeDimensions(purchaseOrder?.defaultDimensionsJson, line.dimensionsJson || {})
    );
    const vatProposal = buildApVatProposal({
      companyId,
      supplier,
      line,
      invoiceType,
      invoiceDate,
      currencyCode,
      netAmount,
      quantity,
      purchaseOrderLine,
      vatPlatform,
      actorId,
      correlationId
    });
    const allocationRequirements = collectApLineAllocationRequirements({
      ledgerPlatform,
      companyId,
      expenseAccountNumber,
      dimensionsJson
    });
    const reviewQueueCodes = uniqueStrings([
      ...(expenseAccountNumber ? [] : ["coding_required"]),
      ...(vatProposal.reviewRequired ? vatProposal.reviewQueueCodes : []),
      ...(allocationRequirements.reviewRequired ? ["allocation_review_required"] : [])
    ]);

    return {
      supplierInvoiceLineId: crypto.randomUUID(),
      lineNo: index + 1,
      description: requireText(line.description || `Invoice line ${index + 1}`, "supplier_invoice_line_description_required"),
      quantity,
      unitPrice,
      netAmount,
      expenseAccountNumber,
      dimensionsJson,
      allocationRequiredFieldCodes: allocationRequirements.requiredFieldCodes,
      allocationMissingFieldCodes: allocationRequirements.missingFieldCodes,
      allocationInvalidFieldCodes: allocationRequirements.invalidFieldCodes,
      allocationReviewRequired: allocationRequirements.reviewRequired,
      goodsOrServices: normalizeOptionalText(line.goodsOrServices)?.toLowerCase() === "goods" ? "goods" : "services",
      importCaseRequired: line.importCaseRequired === true,
      reverseChargeFlag: line.reverseChargeFlag === true || supplier.reverseChargeDefault === true,
      constructionServiceFlag: line.constructionServiceFlag === true,
      deductionRatio: line.deductionRatio == null ? 1 : normalizeNonNegativeNumber(line.deductionRatio, "supplier_invoice_line_deduction_ratio_invalid"),
      vatCode: vatProposal.vatCode,
      vatRate: vatProposal.vatRate,
      vatAmount: vatProposal.vatAmount,
      grossAmount: roundMoney(netAmount + vatProposal.vatAmount),
      vatProposal,
      receiptRequired: line.receiptRequired === true || supplier.requiresReceipt === true,
      purchaseOrderLineId: normalizeOptionalText(line.purchaseOrderLineId),
      purchaseOrderLineReference: normalizeOptionalText(line.purchaseOrderLineReference),
      purchaseOrderMatchedLineId: purchaseOrderLine?.purchaseOrderLineId || null,
      toleranceProfileCode: purchaseOrderLine?.toleranceProfileCode || purchaseOrder?.toleranceProfileCode || "standard",
      reviewRequired: reviewQueueCodes.length > 0,
      reviewQueueCodes
    };
  });
}

function buildApVatProposal({
  companyId,
  supplier,
  line,
  invoiceType = "standard",
  invoiceDate,
  currencyCode = "SEK",
  netAmount,
  quantity,
  purchaseOrderLine,
  vatPlatform,
  actorId,
  correlationId
}) {
  const vatCodeCandidate =
    normalizeOptionalText(line.vatCode) ||
    purchaseOrderLine?.vatCode ||
    supplier.defaultVatCode ||
    deriveDomesticPurchaseVatCode(line.vatRate);
  const goodsOrServices = normalizeOptionalText(line.goodsOrServices)?.toLowerCase() === "goods" ? "goods" : "services";
  const reverseChargeFlag = line.reverseChargeFlag === true || supplier.reverseChargeDefault === true;
  if (!vatPlatform || typeof vatPlatform.evaluateVatDecision !== "function") {
    return buildReviewVatProposal("tax_review_required", "VAT platform is required to classify supplier-invoice VAT.");
  }
  const vatEvaluation = vatPlatform.evaluateVatDecision({
    companyId,
    actorId,
    correlationId,
    transactionLine: {
      source_type: invoiceType === "credit_note" ? "AP_CREDIT_NOTE" : "AP_INVOICE",
      source_id: `${supplier.supplierId}:${line.description}:${quantity}`,
      supply_type: "purchase",
      seller_country: supplier.countryCode,
      seller_vat_registration_country: supplier.countryCode,
      buyer_country: "SE",
      goods_or_services: goodsOrServices,
      invoice_date: invoiceDate,
      delivery_date: invoiceDate,
      tax_date: invoiceDate,
      prepayment_date: invoiceDate,
      currency: currencyCode,
      line_amount_ex_vat: netAmount,
      line_quantity: quantity,
      vat_rate: line.vatRate ?? deriveVatRateFromCode(vatCodeCandidate) ?? 25,
      reverse_charge_flag: reverseChargeFlag,
      import_flag: supplier.countryCode !== "SE" && !EU_COUNTRY_CODES.has(supplier.countryCode) && goodsOrServices === "goods",
      export_flag: false,
      buyer_is_taxable_person: true,
      construction_service_flag: line.constructionServiceFlag === true,
      oss_flag: false,
      ioss_flag: false,
      vat_code_candidate: vatCodeCandidate,
      deduction_ratio: line.deductionRatio == null ? 1 : line.deductionRatio,
      credit_note_flag: invoiceType === "credit_note",
      original_vat_decision_id: normalizeOptionalText(line.originalVatDecisionId)
    }
  });
  const vatDecision = vatEvaluation.vatDecision;
  const postingEntries = vatDecision.outputs?.postingEntries || vatDecision.postingEntries || [];
  const vatAmount = roundMoney(
    postingEntries.reduce((sum, entry) => {
      if (entry.vatEffect === "input_vat" || entry.vatEffect === "output_vat") {
        return sum + Math.abs(Number(entry.amount || 0));
      }
      return sum;
    }, 0)
  );
  const reviewRequired = vatDecision.status === "review_required" || Boolean(vatEvaluation.reviewQueueItem);
  return {
    vatCode: vatDecision.vatCode,
    vatRate: Number(vatDecision.outputs?.vatRate ?? vatDecision.vatRate ?? deriveVatRateFromCode(vatDecision.vatCode) ?? 0),
    vatAmount,
    explanation: vatDecision.explanation,
    decisionCategory: vatDecision.outputs?.decisionCategory || vatDecision.decisionCategory || "review_required",
    declarationBoxCodes: copy(vatDecision.declarationBoxCodes || vatDecision.outputs?.declarationBoxCodes || []),
    postingEntries: copy(postingEntries),
    reviewRequired,
    reviewQueueCodes: reviewRequired
      ? [vatDecision.reviewQueueCode || vatEvaluation.reviewQueueItem?.reviewQueueCode || "tax_review_required"]
      : [],
    vatDecisionId: vatDecision.vatDecisionId || null,
    vatReviewQueueItemId: vatEvaluation.reviewQueueItem?.vatReviewQueueItemId || null
  };
}

function buildDomesticPurchaseVatProposal({ vatCodeCandidate, vatRate, netAmount }) {
  const resolvedVatCode = vatCodeCandidate || deriveDomesticPurchaseVatCode(vatRate);
  const resolvedVatRate = deriveVatRateFromCode(resolvedVatCode) ?? normalizeOptionalNumber(vatRate) ?? 0;
  if (resolvedVatCode === null) {
    return buildReviewVatProposal("tax_review_required", "Domestic supplier-charged VAT code could not be derived.");
  }
  const vatAmount = roundMoney(netAmount * (resolvedVatRate / 100));
  return {
    vatCode: resolvedVatCode,
    vatRate: resolvedVatRate,
    vatAmount,
    explanation:
      resolvedVatRate > 0
        ? `Leverantören är svensk och raden använder ingående moms ${resolvedVatRate} %. Beloppet förs till konto 2640 och box 48.`
        : "Leverantören är svensk men raden är momsfri eller undantagen och ger därför ingen ingående moms.",
    decisionCategory: "domestic_supplier_charged_purchase",
    declarationBoxCodes: resolvedVatRate > 0 ? ["48"] : [],
    postingEntries:
      resolvedVatRate > 0
        ? [
            {
              entryCode: "input_vat_supplier_charged",
              direction: "debit",
              amount: vatAmount,
              vatEffect: "input_vat"
            }
          ]
        : [],
    reviewRequired: false,
    reviewQueueCodes: [],
    vatDecisionId: null,
    vatReviewQueueItemId: null
  };
}

function buildReviewVatProposal(reviewQueueCode, explanation) {
  return {
    vatCode: "VAT_REVIEW_REQUIRED",
    vatRate: 0,
    vatAmount: 0,
    explanation,
    decisionCategory: "review_required",
    declarationBoxCodes: [],
    postingEntries: [],
    reviewRequired: true,
    reviewQueueCodes: [reviewQueueCode],
    vatDecisionId: null,
    vatReviewQueueItemId: null
  };
}

function collectApLineAllocationRequirements({ ledgerPlatform, companyId, expenseAccountNumber, dimensionsJson = {} }) {
  if (!expenseAccountNumber || !ledgerPlatform || typeof ledgerPlatform.listLedgerAccounts !== "function") {
    return {
      requiredFieldCodes: [],
      missingFieldCodes: [],
      invalidFieldCodes: [],
      reviewRequired: false
    };
  }
  const account = ledgerPlatform
    .listLedgerAccounts({ companyId })
    .find((candidate) => candidate.accountNumber === expenseAccountNumber);
  const catalog =
    typeof ledgerPlatform.listLedgerDimensions === "function" ? ledgerPlatform.listLedgerDimensions({ companyId }) : null;
  const requiredFieldCodes = new Set();
  const missingFieldCodes = new Set();
  const invalidFieldCodes = new Set();
  for (const requiredDimensionKey of account?.requiredDimensionKeys || []) {
    const fieldCode = mapDimensionKeyToApFieldCode(requiredDimensionKey);
    if (!fieldCode) {
      continue;
    }
    requiredFieldCodes.add(fieldCode);
    const value = normalizeOptionalText(dimensionsJson?.[requiredDimensionKey]);
    if (!value) {
      missingFieldCodes.add(fieldCode);
      continue;
    }
    if (!ledgerDimensionValueExists({ catalog, dimensionKey: requiredDimensionKey, value })) {
      invalidFieldCodes.add(fieldCode);
    }
  }
  return {
    requiredFieldCodes: [...requiredFieldCodes].sort(),
    missingFieldCodes: [...missingFieldCodes].sort(),
    invalidFieldCodes: [...invalidFieldCodes].sort(),
    reviewRequired: missingFieldCodes.size > 0 || invalidFieldCodes.size > 0
  };
}

function mapDimensionKeyToApFieldCode(dimensionKey) {
  const mapping = {
    projectId: "project_id",
    costCenterCode: "cost_center_code",
    businessAreaCode: "business_area_code",
    serviceLineCode: "service_line_code"
  };
  return mapping[dimensionKey] || null;
}

function ledgerDimensionValueExists({ catalog, dimensionKey, value }) {
  if (!catalog || !value) {
    return false;
  }
  const bucketKey =
    dimensionKey === "projectId"
      ? "projects"
      : dimensionKey === "costCenterCode"
        ? "costCenters"
        : dimensionKey === "businessAreaCode"
          ? "businessAreas"
          : dimensionKey === "serviceLineCode"
            ? "serviceLines"
            : null;
  if (!bucketKey || !Array.isArray(catalog[bucketKey])) {
    return false;
  }
  return catalog[bucketKey].some((entry) => entry.code === value && entry.status === "active");
}

function buildCreditNoteLineInputs({ originalInvoice, lines = null }) {
  if (Array.isArray(lines) && lines.length > 0) {
    return lines;
  }
  return (originalInvoice.lines || []).map((line) => ({
    description: line.description,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    expenseAccountNumber: line.expenseAccountNumber,
    dimensionsJson: copy(line.dimensionsJson || {}),
    goodsOrServices: line.goodsOrServices,
    importCaseRequired: line.importCaseRequired === true,
    reverseChargeFlag: line.reverseChargeFlag === true,
    constructionServiceFlag: line.constructionServiceFlag === true,
    deductionRatio: line.deductionRatio,
    vatCode: line.vatCode,
    originalVatDecisionId: line.vatProposal?.vatDecisionId || null,
    receiptRequired: line.receiptRequired === true,
    purchaseOrderLineId: line.purchaseOrderLineId || null,
    purchaseOrderLineReference: line.purchaseOrderLineReference || null
  }));
}

function buildApPaymentPreparation({ openItem, invoice, supplier }) {
  const blockerCodes = uniqueStrings([
    ...(openItem.status === "open" ? [] : [`open_item_${openItem.status}`]),
    ...(invoice.paymentReadinessReasonCodes || []),
    ...(invoice.invoiceType === "credit_note" ? ["credit_note_not_payable"] : []),
    ...(Number(openItem.openAmount || 0) > 0 ? [] : ["non_positive_open_amount"]),
    ...(hasSupplierPaymentDetails(supplier) ? [] : ["supplier_payment_details_missing"])
  ]);
  const status =
    invoice.invoiceType === "credit_note" || Number(openItem.openAmount || 0) <= 0
      ? "not_applicable"
      : blockerCodes.length === 0
        ? "ready"
        : "blocked";
  return copy({
    apPaymentPreparationId: hashObject({
      companyId: openItem.companyId,
      apOpenItemId: openItem.apOpenItemId,
      status,
      blockerCodes
    }),
    companyId: openItem.companyId,
    apOpenItemId: openItem.apOpenItemId,
    supplierInvoiceId: invoice.supplierInvoiceId,
    supplierId: supplier.supplierId,
    invoiceType: invoice.invoiceType || "standard",
    status,
    blockerCodes,
    reviewRequired: invoice.reviewRequired === true,
    paymentHold: invoice.paymentHold === true,
    amount: openItem.openAmount,
    currencyCode: openItem.currencyCode,
    dueOn: openItem.dueOn,
    payeeName: supplier.paymentRecipient || supplier.legalName,
    bankgiro: supplier.bankgiro || null,
    plusgiro: supplier.plusgiro || null,
    iban: supplier.iban || null,
    bic: supplier.bic || null,
    sourceStatus: {
      openItemStatus: openItem.status,
      invoiceStatus: invoice.status,
      paymentReadinessStatus: invoice.paymentReadinessStatus || null
    }
  });
}

function resolvePurchaseOrderForInvoice({ state, companyId, purchaseOrderId = null, purchaseOrderNo = null }) {
  if (purchaseOrderId) {
    return requirePurchaseOrderRecord(state, companyId, purchaseOrderId);
  }
  const normalizedPurchaseOrderNo = normalizeOptionalText(purchaseOrderNo);
  if (!normalizedPurchaseOrderNo) {
    return null;
  }
  const resolvedPurchaseOrderId = state.purchaseOrderIdsByCompanyNo.get(
    toCompanyScopedKey(companyId, normalizedPurchaseOrderNo.toUpperCase())
  );
  return resolvedPurchaseOrderId ? requirePurchaseOrderRecord(state, companyId, resolvedPurchaseOrderId) : null;
}

function resolvePurchaseOrderLineForInvoice(purchaseOrder, line) {
  const purchaseOrderLineId = normalizeOptionalText(line.purchaseOrderMatchedLineId || line.purchaseOrderLineId);
  if (purchaseOrderLineId) {
    return purchaseOrder.lines.find((candidate) => candidate.purchaseOrderLineId === purchaseOrderLineId) || null;
  }
  const purchaseOrderLineReference = normalizeOptionalText(line.purchaseOrderLineReference);
  if (purchaseOrderLineReference) {
    return (
      purchaseOrder.lines.find(
        (candidate) => String(candidate.lineNo) === purchaseOrderLineReference || candidate.description === purchaseOrderLineReference
      ) || null
    );
  }
  if (purchaseOrder.lines.length === 1) {
    return purchaseOrder.lines[0];
  }
  return purchaseOrder.lines.find((candidate) => candidate.lineNo === line.lineNo) || null;
}

function createInvoiceVariance({
  invoice,
  line,
  varianceCode,
  severity,
  message,
  expectedValue,
  actualValue,
  toleranceValue = null
}) {
  return {
    supplierInvoiceVarianceId: crypto.randomUUID(),
    companyId: invoice.companyId,
    supplierInvoiceId: invoice.supplierInvoiceId,
    supplierInvoiceLineId: line.supplierInvoiceLineId,
    varianceCode,
    reviewQueueCode: varianceCode === "tax_review_required" ? "tax_review_required" : "match_variance",
    severity,
    status: "open",
    message,
    expectedValue,
    actualValue,
    toleranceValue,
    createdAt: invoice.updatedAt
  };
}

function summarizeReceiptQuantity(state, purchaseOrderId, purchaseOrderLineId) {
  const purchaseOrder = state.purchaseOrders.get(purchaseOrderId);
  if (!purchaseOrder) {
    return 0;
  }
  return roundQuantity(
    (state.receiptIdsByCompany.get(purchaseOrder.companyId) || [])
      .map((receiptId) => state.receipts.get(receiptId))
      .filter(Boolean)
      .filter((receipt) => receipt.purchaseOrderId === purchaseOrderId)
      .flatMap((receipt) => receipt.lines)
      .filter((line) => line.purchaseOrderLineId === purchaseOrderLineId)
      .reduce((sum, line) => sum + Number(line.receivedQuantity || 0), 0)
  );
}

function resolveToleranceProfile(toleranceProfileCode) {
  const normalized = normalizeOptionalText(toleranceProfileCode);
  return copy(DEFAULT_TOLERANCE_PROFILES[normalized] || DEFAULT_TOLERANCE_PROFILES.standard);
}

function buildSupplierInvoiceJournalLines({ invoice, supplier }) {
  const lines = [];
  const isCreditNote = invoice.invoiceType === "credit_note";
  for (const invoiceLine of invoice.lines) {
    if (!invoiceLine.expenseAccountNumber) {
      throw createError(409, "supplier_invoice_line_account_required", "Supplier invoice line account is required before posting.");
    }
    lines.push({
      accountNumber: invoiceLine.expenseAccountNumber,
      debitAmount: isCreditNote ? 0 : invoiceLine.netAmount,
      creditAmount: isCreditNote ? invoiceLine.netAmount : 0,
      dimensionJson: copy(invoiceLine.dimensionsJson || {})
    });
    for (const vatPostingEntry of invoiceLine.vatProposal.postingEntries || []) {
      lines.push({
        accountNumber: resolveVatAccountNumber(vatPostingEntry, invoiceLine.vatProposal),
        debitAmount: isCreditNote
          ? vatPostingEntry.direction === "credit"
            ? Math.abs(Number(vatPostingEntry.amount || 0))
            : 0
          : vatPostingEntry.direction === "debit"
            ? Math.abs(Number(vatPostingEntry.amount || 0))
            : 0,
        creditAmount: isCreditNote
          ? vatPostingEntry.direction === "debit"
            ? Math.abs(Number(vatPostingEntry.amount || 0))
            : 0
          : vatPostingEntry.direction === "credit"
            ? Math.abs(Number(vatPostingEntry.amount || 0))
            : 0,
        dimensionJson: copy(invoiceLine.dimensionsJson || {})
      });
    }
  }
  lines.push({
    accountNumber: resolveLiabilityAccountNumber(supplier),
    debitAmount: isCreditNote ? invoice.grossAmount : 0,
    creditAmount: isCreditNote ? 0 : invoice.grossAmount,
    dimensionJson: {}
  });
  return lines;
}

function mergeJournalLines(lines) {
  const grouped = new Map();
  for (const line of lines) {
    const key = stableStringify({
      accountNumber: line.accountNumber,
      dimensionJson: line.dimensionJson || {}
    });
    const existing = grouped.get(key);
    if (existing) {
      existing.debitAmount = roundMoney(existing.debitAmount + Number(line.debitAmount || 0));
      existing.creditAmount = roundMoney(existing.creditAmount + Number(line.creditAmount || 0));
      continue;
    }
    grouped.set(key, {
      accountNumber: line.accountNumber,
      debitAmount: roundMoney(Number(line.debitAmount || 0)),
      creditAmount: roundMoney(Number(line.creditAmount || 0)),
      dimensionJson: copy(line.dimensionJson || {})
    });
  }
  return [...grouped.values()].filter((line) => line.debitAmount > 0 || line.creditAmount > 0);
}

function resolveVatAccountNumber(vatPostingEntry, vatProposal) {
  if (vatPostingEntry.vatEffect === "input_vat") {
    return DEFAULT_VAT_ACCOUNT_BY_EFFECT.input_vat;
  }
  if (vatProposal.decisionCategory?.includes("eu_")) {
    return "2660";
  }
  if (vatProposal.decisionCategory?.includes("construction")) {
    return "2670";
  }
  if (vatProposal.decisionCategory?.includes("import")) {
    return "2680";
  }
  return DEFAULT_VAT_ACCOUNT_BY_EFFECT.output_vat;
}

function resolveLiabilityAccountNumber(supplier) {
  if (supplier.countryCode === "SE") {
    return DEFAULT_LIABILITY_ACCOUNT_BY_REGION.SE;
  }
  if (EU_COUNTRY_CODES.has(supplier.countryCode)) {
    return DEFAULT_LIABILITY_ACCOUNT_BY_REGION.EU;
  }
  return DEFAULT_LIABILITY_ACCOUNT_BY_REGION.NON_EU;
}

function ensureSupplierPaymentDetails(supplier) {
  if (!supplier.bankgiro && !supplier.plusgiro && !supplier.iban) {
    throw createError(409, "supplier_payment_details_missing", "Supplier is missing payment details required for bank export.");
  }
}

function postApLifecycleJournal({
  ledgerPlatform,
  companyId,
  journalDate,
  recipeCode,
  postingSignalCode = null,
  actorId,
  sourceId,
  sourceObjectVersion = null,
  idempotencyKey,
  description,
  metadataJson = {},
  lines
}) {
  if (!ledgerPlatform || typeof ledgerPlatform.applyPostingIntent !== "function") {
    throw createError(500, "ledger_platform_missing", "Ledger platform is required for AP payment lifecycle postings.");
  }
  const posted = ledgerPlatform.applyPostingIntent({
    companyId,
    journalDate,
    recipeCode,
    postingSignalCode,
    voucherSeriesPurposeCode: "AP_PAYMENT",
    fallbackVoucherSeriesCode: "E",
    sourceType: "AP_PAYMENT",
    sourceId: requireText(sourceId, "source_id_required"),
    sourceObjectVersion,
    actorId,
    idempotencyKey: requireText(idempotencyKey, "idempotency_key_required"),
    description: requireText(description, "journal_description_required"),
    metadataJson: {
      ...copy(metadataJson),
      pipelineArea: "ap_payment"
    },
    lines
  });
  return posted.journalEntry;
}

function buildSupplierInvoiceFingerprint({
  supplierId,
  invoiceType = "standard",
  originalSupplierInvoiceId = null,
  externalInvoiceRef,
  invoiceDate,
  grossAmount,
  currencyCode,
  documentHash,
  paymentReference = null
}) {
  return hashObject({
    supplierId,
    invoiceType: assertAllowed(invoiceType, AP_SUPPLIER_INVOICE_TYPES, "supplier_invoice_type_invalid"),
    originalSupplierInvoiceId: normalizeOptionalText(originalSupplierInvoiceId),
    externalInvoiceRef: requireText(externalInvoiceRef, "supplier_invoice_external_ref_required").toUpperCase(),
    invoiceDate,
    grossAmount: roundMoney(grossAmount),
    currencyCode: normalizeUpperCode(currencyCode, "currency_code_required", 3),
    documentHash: requireText(documentHash, "document_hash_required"),
    paymentReference: normalizeOptionalText(paymentReference)
  });
}

function findNearDuplicateSupplierInvoice({
  state,
  companyId,
  supplierId,
  externalInvoiceRef,
  invoiceDate,
  grossAmount,
  currencyCode,
  documentHash
}) {
  return (state.supplierInvoiceIdsByCompany.get(companyId) || [])
    .map((supplierInvoiceId) => state.supplierInvoices.get(supplierInvoiceId))
    .filter(Boolean)
    .find(
      (candidate) =>
        candidate.supplierId === supplierId &&
        candidate.externalInvoiceRef === externalInvoiceRef &&
        candidate.invoiceDate === invoiceDate &&
        candidate.currencyCode === currencyCode &&
        roundMoney(candidate.grossAmount) === roundMoney(grossAmount) &&
        candidate.documentHash !== documentHash
    );
}

function buildInvoiceDocumentHash({ documentContext, fallbackValue }) {
  if (documentContext?.documentHash) {
    return documentContext.documentHash;
  }
  return hashObject(fallbackValue);
}

function readOcrFieldValue(field) {
  if (field && typeof field === "object" && "value" in field) {
    return field.value;
  }
  return field ?? null;
}

function readMoneyField(field) {
  const raw = readOcrFieldValue(field);
  if (raw === null || raw === undefined || raw === "") {
    return null;
  }
  const numeric = Number(String(raw).replace(",", "."));
  return Number.isFinite(numeric) ? roundMoney(numeric) : null;
}

function mergeOcrFieldMaps(extractedFields, correctedFields) {
  const merged = copy(extractedFields || {});
  for (const [key, value] of Object.entries(correctedFields || {})) {
    merged[key] = value;
  }
  return merged;
}

function normalizePartyLabel(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function deriveDomesticPurchaseVatCode(vatRate) {
  const resolvedVatRate = normalizeOptionalNumber(vatRate);
  if (resolvedVatRate === 25) {
    return "VAT_SE_DOMESTIC_25";
  }
  if (resolvedVatRate === 12) {
    return "VAT_SE_DOMESTIC_12";
  }
  if (resolvedVatRate === 6) {
    return "VAT_SE_DOMESTIC_6";
  }
  if (resolvedVatRate === 0) {
    return "VAT_SE_EXEMPT";
  }
  return null;
}

function deriveVatRateFromCode(vatCode) {
  switch ((normalizeOptionalText(vatCode) || "").toUpperCase()) {
    case "VAT_SE_DOMESTIC_25":
    case "VAT_SE_RC_BUILD_PURCHASE":
    case "VAT_SE_EU_GOODS_PURCHASE_RC":
    case "VAT_SE_EU_SERVICES_PURCHASE_RC":
    case "VAT_SE_NON_EU_SERVICE_PURCHASE_RC":
    case "VAT_SE_DOMESTIC_GOODS_PURCHASE_RC":
    case "VAT_SE_DOMESTIC_SERVICES_PURCHASE_RC":
      return 25;
    case "VAT_SE_DOMESTIC_12":
      return 12;
    case "VAT_SE_DOMESTIC_6":
      return 6;
    case "VAT_SE_EXEMPT":
      return 0;
    default:
      return null;
  }
}

function uniqueStrings(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function resolveSupplierForImport(state, companyId, incoming) {
  const importSourceKey = normalizeOptionalText(incoming.importSourceKey);
  if (importSourceKey) {
    const supplierId = state.supplierIdsByCompanyImportSource.get(toCompanyScopedKey(companyId, importSourceKey));
    if (supplierId) {
      return state.suppliers.get(supplierId);
    }
  }
  const supplierNo = normalizeOptionalText(incoming.supplierNo);
  if (supplierNo) {
    const supplierId = state.supplierIdsByCompanyNo.get(toCompanyScopedKey(companyId, supplierNo));
    if (supplierId) {
      return state.suppliers.get(supplierId);
    }
  }
  return null;
}

function updateSupplierFromImport({ state, clock, vatPlatform, supplier, incoming, companyId, actorId }) {
  const previousBankFingerprint = hashObject({
    paymentRecipient: supplier.paymentRecipient,
    bankgiro: supplier.bankgiro,
    plusgiro: supplier.plusgiro,
    iban: supplier.iban,
    bic: supplier.bic
  });
  const bankDetails = normalizeSupplierBankDetails({
    bankgiro: incoming.bankgiro ?? supplier.bankgiro,
    plusgiro: incoming.plusgiro ?? supplier.plusgiro,
    iban: incoming.iban ?? supplier.iban,
    bic: incoming.bic ?? supplier.bic,
    paymentRecipient: incoming.paymentRecipient ?? supplier.paymentRecipient
  });
  supplier.legalName = requireText(incoming.legalName || supplier.legalName, "supplier_legal_name_required");
  supplier.organizationNumber = normalizeOptionalText(incoming.organizationNumber ?? supplier.organizationNumber);
  supplier.vatNumber = normalizeOptionalText(incoming.vatNumber ?? supplier.vatNumber);
  supplier.countryCode = normalizeUpperCode(incoming.countryCode || supplier.countryCode, "country_code_required", 2);
  supplier.currencyCode = normalizeUpperCode(incoming.currencyCode || supplier.currencyCode, "currency_code_required", 3);
  supplier.paymentTermsCode = requireText(incoming.paymentTermsCode || supplier.paymentTermsCode, "payment_terms_code_required");
  supplier.paymentRecipient = bankDetails.paymentRecipient;
  supplier.bankgiro = bankDetails.bankgiro;
  supplier.plusgiro = bankDetails.plusgiro;
  supplier.iban = bankDetails.iban;
  supplier.bic = bankDetails.bic;
  supplier.defaultExpenseAccountNumber = normalizeOptionalAccountNumber(
    incoming.defaultExpenseAccountNumber ?? supplier.defaultExpenseAccountNumber
  );
  supplier.defaultVatCode = ensureOptionalVatCodeExists(
    vatPlatform,
    companyId,
    incoming.defaultVatCode ?? supplier.defaultVatCode
  );
  supplier.defaultDimensionsJson = mergeDimensions(
    supplier.defaultDimensionsJson,
    incoming.defaultDimensions ? normalizeDimensions(incoming.defaultDimensions) : {}
  );
  supplier.defaultUnitPrice =
    normalizeOptionalMoney(
      incoming.defaultUnitPrice ?? supplier.defaultUnitPrice,
      "supplier_default_unit_price_invalid"
    ) ?? null;
  supplier.paymentBlocked = incoming.paymentBlocked === true || supplier.paymentBlocked === true;
  supplier.bookingBlocked = incoming.bookingBlocked === true || supplier.bookingBlocked === true;
  supplier.requiresPo = incoming.requiresPo !== undefined ? incoming.requiresPo !== false : supplier.requiresPo;
  supplier.requiresReceipt = incoming.requiresReceipt !== undefined ? incoming.requiresReceipt === true : supplier.requiresReceipt;
  supplier.allowCreditWithoutLink =
    incoming.allowCreditWithoutLink !== undefined
      ? incoming.allowCreditWithoutLink === true
      : supplier.allowCreditWithoutLink;
  supplier.reverseChargeDefault =
    incoming.reverseChargeDefault !== undefined ? incoming.reverseChargeDefault === true : supplier.reverseChargeDefault;
  supplier.updatedAt = nowIso(clock);

  const nextBankFingerprint = hashObject({
    paymentRecipient: supplier.paymentRecipient,
    bankgiro: supplier.bankgiro,
    plusgiro: supplier.plusgiro,
    iban: supplier.iban,
    bic: supplier.bic
  });
  if (previousBankFingerprint !== nextBankFingerprint) {
    supplier.paymentBlocked = true;
    pushAudit(state, clock, {
      companyId: supplier.companyId,
      actorId,
      correlationId: crypto.randomUUID(),
      action: "ap.supplier.bank_details_changed",
      entityType: "ap_supplier",
      entityId: supplier.supplierId,
      explanation: `Bank details changed for supplier ${supplier.supplierNo}; payment hold activated.`
    });
  }
}

function resolvePurchaseOrderForImport(state, companyId, incoming) {
  const importSourceKey = normalizeOptionalText(incoming.importSourceKey);
  if (importSourceKey) {
    const purchaseOrderId = state.purchaseOrderIdsByCompanyImportSource.get(toCompanyScopedKey(companyId, importSourceKey));
    if (purchaseOrderId) {
      return state.purchaseOrders.get(purchaseOrderId);
    }
  }
  const poNo = normalizeOptionalText(incoming.poNo);
  if (poNo) {
    const purchaseOrderId = state.purchaseOrderIdsByCompanyNo.get(toCompanyScopedKey(companyId, poNo));
    if (purchaseOrderId) {
      return state.purchaseOrders.get(purchaseOrderId);
    }
  }
  return null;
}

function updatePurchaseOrderFromImport({ state, clock, vatPlatform, purchaseOrder, incoming, actorId }) {
  if (["partially_received", "fully_received", "closed", "cancelled"].includes(purchaseOrder.status)) {
    throw createError(409, "purchase_order_import_update_blocked", "Purchase order with receipts or closed status cannot be updated by import.");
  }
  const supplier = requireSupplierRecord(state, purchaseOrder.companyId, incoming.supplierId || purchaseOrder.supplierId);
  const headerDefaults = {
    defaultExpenseAccountNumber:
      normalizeOptionalAccountNumber(incoming.defaultExpenseAccountNumber) ||
      purchaseOrder.defaultExpenseAccountNumber ||
      supplier.defaultExpenseAccountNumber,
    defaultVatCode:
      ensureOptionalVatCodeExists(vatPlatform, purchaseOrder.companyId, incoming.defaultVatCode) ||
      purchaseOrder.defaultVatCode ||
      supplier.defaultVatCode,
    defaultDimensionsJson: mergeDimensions(
      supplier.defaultDimensionsJson,
      mergeDimensions(purchaseOrder.defaultDimensionsJson, normalizeDimensions(incoming.defaultDimensions || {}))
    ),
    defaultUnitPrice:
      normalizeOptionalMoney(incoming.defaultUnitPrice, "purchase_order_default_unit_price_invalid") ??
      purchaseOrder.defaultUnitPrice ??
      supplier.defaultUnitPrice,
    projectCode: normalizeOptionalText(incoming.projectCode || purchaseOrder.projectCode),
    costCenterCode: normalizeOptionalText(incoming.costCenterCode || purchaseOrder.costCenterCode),
    toleranceProfileCode: requireText(
      incoming.toleranceProfileCode || purchaseOrder.toleranceProfileCode,
      "purchase_order_tolerance_profile_required"
    )
  };
  purchaseOrder.supplierId = supplier.supplierId;
  purchaseOrder.currencyCode = normalizeUpperCode(incoming.currencyCode || purchaseOrder.currencyCode, "currency_code_required", 3);
  purchaseOrder.requesterUserId = requireText(
    incoming.requesterUserId || purchaseOrder.requesterUserId,
    "purchase_order_requester_required"
  );
  purchaseOrder.expectedDeliveryDate = normalizeOptionalDate(
    incoming.expectedDeliveryDate || purchaseOrder.expectedDeliveryDate,
    "purchase_order_expected_delivery_date_invalid"
  );
  purchaseOrder.approvalPolicyCode = requireText(
    incoming.approvalPolicyCode || purchaseOrder.approvalPolicyCode,
    "purchase_order_approval_policy_required"
  );
  purchaseOrder.toleranceProfileCode = headerDefaults.toleranceProfileCode;
  purchaseOrder.defaultExpenseAccountNumber = headerDefaults.defaultExpenseAccountNumber;
  purchaseOrder.defaultVatCode = headerDefaults.defaultVatCode;
  purchaseOrder.defaultDimensionsJson = headerDefaults.defaultDimensionsJson;
  purchaseOrder.defaultUnitPrice = headerDefaults.defaultUnitPrice;
  purchaseOrder.projectCode = headerDefaults.projectCode;
  purchaseOrder.costCenterCode = headerDefaults.costCenterCode;
  purchaseOrder.lines = normalizePurchaseOrderLines({
    vatPlatform,
    companyId: purchaseOrder.companyId,
    supplier,
    currencyCode: purchaseOrder.currencyCode,
    headerDefaults,
    lines: incoming.lines
  });
  purchaseOrder.updatedAt = nowIso(clock);
  pushAudit(state, clock, {
    companyId: purchaseOrder.companyId,
    actorId,
    correlationId: crypto.randomUUID(),
    action: "ap.purchase_order.updated_from_import",
    entityType: "ap_purchase_order",
    entityId: purchaseOrder.purchaseOrderId,
    explanation: `Updated purchase order ${purchaseOrder.poNo} from import.`
  });
}

function normalizePurchaseOrderLines({ vatPlatform, companyId, supplier, currencyCode, headerDefaults, lines }) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw createError(400, "purchase_order_lines_required", "Purchase order requires at least one line.");
  }
  return lines.map((line, index) => {
    const quantityOrdered = roundQuantity(normalizePositiveNumber(line.quantityOrdered, "purchase_order_quantity_invalid"));
    const unitPrice =
      normalizeOptionalMoney(line.unitPrice, "purchase_order_unit_price_invalid") ??
      headerDefaults.defaultUnitPrice ??
      supplier.defaultUnitPrice;
    if (unitPrice === null || unitPrice === undefined) {
      throw createError(400, "purchase_order_unit_price_missing", "Purchase-order line requires a unit price or a default price.");
    }
    const expenseAccountNumber =
      normalizeOptionalAccountNumber(line.expenseAccountNumber) ||
      headerDefaults.defaultExpenseAccountNumber ||
      supplier.defaultExpenseAccountNumber;
    if (!expenseAccountNumber) {
      throw createError(400, "purchase_order_account_missing", "Purchase-order line requires an expense account or default account.");
    }
    const vatCode =
      ensureOptionalVatCodeExists(vatPlatform, companyId, line.vatCode) ||
      headerDefaults.defaultVatCode ||
      supplier.defaultVatCode ||
      null;
    return {
      purchaseOrderLineId: crypto.randomUUID(),
      lineNo: index + 1,
      description: requireText(line.description, "purchase_order_line_description_required"),
      quantityOrdered,
      unitPrice: roundMoney(unitPrice),
      netAmount: roundMoney(quantityOrdered * unitPrice),
      currencyCode,
      vatCode,
      expenseAccountNumber,
      defaultDimensionsJson: mergeDimensions(
        headerDefaults.defaultDimensionsJson,
        mergeDimensions(
          {
            projectCode: normalizeOptionalText(line.projectCode || headerDefaults.projectCode),
            costCenterCode: normalizeOptionalText(line.costCenterCode || headerDefaults.costCenterCode)
          },
          normalizeDimensions(line.defaultDimensions || {})
        )
      ),
      receiptTargetType: assertAllowed(
        normalizeOptionalText(line.receiptTargetType) || "expense",
        AP_RECEIPT_TARGET_TYPES,
        "purchase_order_receipt_target_invalid"
      ),
      toleranceProfileCode: requireText(
        normalizeOptionalText(line.toleranceProfileCode) || headerDefaults.toleranceProfileCode,
        "purchase_order_tolerance_profile_required"
      ),
      overdeliveryTolerancePercent: normalizeNonNegativeNumber(
        line.overdeliveryTolerancePercent ?? 0,
        "purchase_order_overdelivery_tolerance_invalid"
      ),
      receivedQuantity: 0,
      invoicedQuantity: 0
    };
  });
}

function normalizeSupplierBankDetails({ bankgiro = null, plusgiro = null, iban = null, bic = null, paymentRecipient = null }) {
  const normalized = {
    paymentRecipient: normalizeOptionalText(paymentRecipient),
    bankgiro: normalizeBankgiro(bankgiro),
    plusgiro: normalizePlusgiro(plusgiro),
    iban: normalizeIban(iban),
    bic: normalizeBic(bic)
  };
  const populatedCount = [normalized.bankgiro, normalized.plusgiro, normalized.iban].filter(Boolean).length;
  if (populatedCount > 0 && !normalized.paymentRecipient) {
    throw createError(409, "supplier_payment_recipient_required", "Payment recipient is required when bank details are present.");
  }
  if (normalized.iban && !normalized.bic) {
    throw createError(409, "supplier_bic_required", "BIC is required when IBAN is present.");
  }
  return normalized;
}

function normalizeBankgiro(value) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  const digits = normalized.replace(/[^0-9]/g, "");
  if (digits.length < 7 || digits.length > 8) {
    throw createError(409, "bankgiro_invalid", "Bankgiro must contain 7 or 8 digits.");
  }
  return digits;
}

function normalizePlusgiro(value) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  const digits = normalized.replace(/[^0-9]/g, "");
  if (digits.length < 2 || digits.length > 8) {
    throw createError(409, "plusgiro_invalid", "Plusgiro must contain between 2 and 8 digits.");
  }
  return digits;
}

function normalizeIban(value) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  const compact = normalized.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z0-9]{15,34}$/.test(compact)) {
    throw createError(409, "iban_invalid", "IBAN format is invalid.");
  }
  return compact;
}

function normalizeBic(value) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  const upper = normalized.toUpperCase();
  if (!/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(upper)) {
    throw createError(409, "bic_invalid", "BIC format is invalid.");
  }
  return upper;
}

function resolvePurchaseOrderReceiptStatus(purchaseOrder) {
  const allFullyReceived = purchaseOrder.lines.every(
    (line) => roundQuantity(line.receivedQuantity) >= roundQuantity(line.quantityOrdered)
  );
  if (allFullyReceived) {
    return "fully_received";
  }
  const anyReceived = purchaseOrder.lines.some((line) => line.receivedQuantity > 0);
  return anyReceived ? "partially_received" : purchaseOrder.status;
}

function buildReceiptDuplicateKey({ companyId, purchaseOrderId, supplierInvoiceReference, externalReceiptRef, receiptDate, lines }) {
  const externalKey = normalizeOptionalText(externalReceiptRef);
  if (externalKey) {
    return toCompanyScopedKey(companyId, `receipt:${purchaseOrderId}:${externalKey}`);
  }
  return toCompanyScopedKey(
    companyId,
    hashObject({
      purchaseOrderId,
      supplierInvoiceReference: normalizeOptionalText(supplierInvoiceReference),
      receiptDate,
      lines: (lines || []).map((line) => ({
        purchaseOrderLineId: line.purchaseOrderLineId,
        receivedQuantity: line.receivedQuantity ?? null,
        receivedPercent: line.receivedPercent ?? null
      }))
    })
  );
}

function ensureSupplierNoUnique(state, companyId, supplierNo) {
  if (state.supplierIdsByCompanyNo.has(toCompanyScopedKey(companyId, supplierNo))) {
    throw createError(409, "supplier_no_not_unique", `Supplier number ${supplierNo} already exists.`);
  }
}

function ensureSupplierImportSourceUnique(state, companyId, importSourceKey) {
  if (state.supplierIdsByCompanyImportSource.has(toCompanyScopedKey(companyId, importSourceKey))) {
    throw createError(409, "supplier_import_source_not_unique", `Supplier import source ${importSourceKey} already exists.`);
  }
}

function ensurePurchaseOrderNoUnique(state, companyId, poNo) {
  if (state.purchaseOrderIdsByCompanyNo.has(toCompanyScopedKey(companyId, poNo))) {
    throw createError(409, "purchase_order_no_not_unique", `Purchase order number ${poNo} already exists.`);
  }
}

function ensurePurchaseOrderImportSourceUnique(state, companyId, importSourceKey) {
  if (state.purchaseOrderIdsByCompanyImportSource.has(toCompanyScopedKey(companyId, importSourceKey))) {
    throw createError(
      409,
      "purchase_order_import_source_not_unique",
      `Purchase-order import source ${importSourceKey} already exists.`
    );
  }
}

function assertSupplierTransition(currentStatus, nextStatus) {
  const transitions = {
    draft: new Set(["active", "blocked", "archived"]),
    active: new Set(["blocked", "archived"]),
    blocked: new Set(["active", "archived"]),
    archived: new Set()
  };
  if (!(transitions[currentStatus] || new Set()).has(nextStatus)) {
    throw createError(409, "supplier_status_transition_invalid", `Cannot move supplier from ${currentStatus} to ${nextStatus}.`);
  }
}

function assertPurchaseOrderTransition(currentStatus, nextStatus) {
  const transitions = {
    draft: new Set(["approved", "cancelled"]),
    approved: new Set(["sent", "cancelled"]),
    sent: new Set(["closed", "cancelled"]),
    partially_received: new Set(["fully_received", "closed", "cancelled"]),
    fully_received: new Set(["closed"]),
    closed: new Set(),
    cancelled: new Set()
  };
  if (!(transitions[currentStatus] || new Set()).has(nextStatus)) {
    throw createError(
      409,
      "purchase_order_status_transition_invalid",
      `Cannot move purchase order from ${currentStatus} to ${nextStatus}.`
    );
  }
}

function ensureCollection(map, key) {
  if (!map.has(key)) {
    map.set(key, []);
  }
  return map.get(key);
}

function resolveSequenceOrValue({ state, companyId, sequenceKey, prefix, value, requiredCode }) {
  const normalizedValue = normalizeOptionalText(value);
  if (normalizedValue) {
    return normalizedValue.toUpperCase();
  }
  return nextScopedSequence(state, companyId, sequenceKey, prefix, requiredCode);
}

function nextScopedSequence(state, companyId, sequenceKey, prefix, requiredCode = "sequence_required") {
  const companyCounters = state.countersByCompany.get(companyId) || {};
  const nextNumber = Number(companyCounters[sequenceKey] || 0) + 1;
  companyCounters[sequenceKey] = nextNumber;
  state.countersByCompany.set(companyId, companyCounters);
  const resolvedPrefix = requireText(prefix, requiredCode);
  return `${resolvedPrefix}${String(nextNumber).padStart(4, "0")}`;
}

function ensureOptionalVatCodeExists(vatPlatform, companyId, vatCode) {
  const normalizedVatCode = normalizeOptionalText(vatCode);
  if (!normalizedVatCode) {
    return null;
  }
  if (vatPlatform && typeof vatPlatform.getVatCode === "function") {
    vatPlatform.getVatCode({
      companyId,
      vatCode: normalizedVatCode
    });
  }
  return normalizedVatCode;
}

function mergeDimensions(left = {}, right = {}) {
  const result = {
    ...(left || {})
  };
  for (const [key, value] of Object.entries(right || {})) {
    if (value !== null && value !== undefined && value !== "") {
      result[key] = value;
    }
  }
  return result;
}

function normalizeDimensions(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) => entryValue !== null && entryValue !== undefined && entryValue !== "")
      .map(([entryKey, entryValue]) => [entryKey, String(entryValue)])
  );
}

function normalizeOptionalAccountNumber(value) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  if (!/^[0-9]{4}$/.test(normalized)) {
    throw createError(409, "account_number_invalid", "Account number must be four digits.");
  }
  return normalized;
}

function requireText(value, code) {
  if (typeof value !== "string" || value.trim() === "") {
    throw createError(400, code, `${code.replaceAll("_", " ")}.`);
  }
  return value.trim();
}

function normalizeOptionalText(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized === "" ? null : normalized;
}

function normalizeUpperCode(value, code, expectedLength = null) {
  const normalized = requireText(value, code).toUpperCase();
  if (expectedLength && normalized.length !== expectedLength) {
    throw createError(409, code, `${code.replaceAll("_", " ")}.`);
  }
  return normalized;
}

function normalizeDate(value, code) {
  const normalized = requireText(value, code);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw createError(409, code, `${code.replaceAll("_", " ")}.`);
  }
  return normalized;
}

function normalizeOptionalDate(value, code) {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalizeDate(normalized, code) : null;
}

function normalizePositiveNumber(value, code) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw createError(409, code, `${code.replaceAll("_", " ")}.`);
  }
  return numeric;
}

function normalizeNonNegativeNumber(value, code) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw createError(409, code, `${code.replaceAll("_", " ")}.`);
  }
  return numeric;
}

function normalizeOptionalNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeOptionalMoney(value, code) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return normalizeMoney(value, code);
}

function normalizeMoney(value, code) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw createError(409, code, `${code.replaceAll("_", " ")}.`);
  }
  return roundMoney(numeric);
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function roundQuantity(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function assertAllowed(value, allowedValues, code) {
  const normalized = requireText(value, code);
  if (!allowedValues.includes(normalized)) {
    throw createError(409, code, `${code.replaceAll("_", " ")}.`);
  }
  return normalized;
}

function nowIso(clock) {
  return clock().toISOString();
}

function copy(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function toCompanyScopedKey(companyId, value) {
  return `${requireText(companyId, "company_id_required")}::${requireText(value, "scoped_key_required")}`;
}

function createError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function pushAudit(state, clock, event) {
  state.auditEvents.push(
    createAuditEnvelopeFromLegacyEvent({
      clock,
      auditClass: "ap_action",
      event
    })
  );
}

function hashObject(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}
