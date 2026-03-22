import crypto from "node:crypto";

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

const DEFAULT_PURCHASE_ORDER_PREFIX = "PO";
const DEFAULT_SUPPLIER_PREFIX = "SUP";

export function createApPlatform(options = {}) {
  return createApEngine(options);
}

export function createApEngine({ clock = () => new Date(), seedDemo = false, vatPlatform = null } = {}) {
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
    snapshotAp
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

  function snapshotAp() {
    return {
      suppliers: Array.from(state.suppliers.values()).map(copy),
      purchaseOrders: Array.from(state.purchaseOrders.values()).map(copy),
      receipts: Array.from(state.receipts.values()).map(copy),
      supplierImportBatches: Array.from(state.supplierImportBatches.values()).map(copy),
      purchaseOrderImportBatches: Array.from(state.purchaseOrderImportBatches.values()).map(copy),
      auditEvents: state.auditEvents.map(copy)
    };
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
  state.auditEvents.push({
    auditEventId: crypto.randomUUID(),
    createdAt: nowIso(clock),
    ...event
  });
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
