import crypto from "node:crypto";

export const AR_CUSTOMER_STATUSES = Object.freeze(["active", "blocked", "archived"]);
export const AR_PRICE_LIST_STATUSES = Object.freeze(["draft", "active", "inactive"]);
export const AR_QUOTE_STATUSES = Object.freeze(["draft", "sent", "accepted", "rejected", "expired", "converted"]);
export const AR_CONTRACT_STATUSES = Object.freeze(["draft", "pending_approval", "active", "paused", "terminated", "expired"]);
export const AR_INVOICE_FREQUENCIES = Object.freeze(["monthly", "quarterly", "annual", "one_time"]);

const DEMO_COMPANY_ID = "00000000-0000-4000-8000-000000000001";

export function createArPlatform(options = {}) {
  return createArEngine(options);
}

export function createArEngine({ clock = () => new Date(), seedDemo = true, vatPlatform = null } = {}) {
  const state = {
    customers: new Map(),
    customerIdsByCompany: new Map(),
    customerIdsByCompanyNo: new Map(),
    customerIdsByCompanyImportSource: new Map(),
    contacts: new Map(),
    contactIdsByCustomer: new Map(),
    items: new Map(),
    itemIdsByCompany: new Map(),
    itemIdsByCompanyCode: new Map(),
    priceLists: new Map(),
    priceListIdsByCompany: new Map(),
    priceListIdsByCompanyCode: new Map(),
    quotes: new Map(),
    quoteIdsByCompany: new Map(),
    quoteIdsByCompanyNo: new Map(),
    contracts: new Map(),
    contractIdsByCompany: new Map(),
    contractIdsByCompanyNo: new Map(),
    customerImportBatches: new Map(),
    customerImportBatchIdsByCompanyKey: new Map(),
    countersByCompany: new Map(),
    auditEvents: []
  };

  if (seedDemo) {
    seedDemoState();
  }

  return {
    customerStatuses: AR_CUSTOMER_STATUSES,
    priceListStatuses: AR_PRICE_LIST_STATUSES,
    quoteStatuses: AR_QUOTE_STATUSES,
    contractStatuses: AR_CONTRACT_STATUSES,
    invoiceFrequencies: AR_INVOICE_FREQUENCIES,
    listCustomers,
    getCustomer,
    createCustomer,
    listCustomerContacts,
    createCustomerContact,
    listItems,
    getItem,
    createItem,
    listPriceLists,
    getPriceList,
    createPriceList,
    listQuotes,
    getQuote,
    createQuote,
    transitionQuote,
    reviseQuote,
    listContracts,
    getContract,
    createContract,
    transitionContractStatus,
    importCustomers,
    getCustomerImportBatch,
    snapshotAr
  };

  function listCustomers({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.customerIdsByCompany.get(resolvedCompanyId) || [])
      .map((customerId) => state.customers.get(customerId))
      .filter(Boolean)
      .sort((left, right) => left.customerNo.localeCompare(right.customerNo))
      .map(copy);
  }

  function getCustomer({ companyId, customerId } = {}) {
    return copy(requireCustomerRecord(state, companyId, customerId));
  }

  function createCustomer({
    companyId,
    customerNo = null,
    legalName,
    organizationNumber = null,
    countryCode,
    languageCode,
    currencyCode,
    paymentTermsCode,
    invoiceDeliveryMethod,
    creditLimitAmount = 0,
    reminderProfileCode,
    peppolScheme = null,
    peppolIdentifier = null,
    vatStatus = "registered",
    billingAddress,
    deliveryAddress,
    customerStatus = "active",
    importSourceKey = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedCustomerNo = resolveSequenceOrValue({
      state,
      companyId: resolvedCompanyId,
      sequenceKey: "customer",
      prefix: "CUST",
      value: customerNo,
      requiredCode: "customer_no_required"
    });
    ensureCustomerNoUnique(state, resolvedCompanyId, resolvedCustomerNo);

    const normalizedImportSourceKey = normalizeOptionalText(importSourceKey);
    if (normalizedImportSourceKey) {
      ensureCustomerImportSourceUnique(state, resolvedCompanyId, normalizedImportSourceKey);
    }

    validateOrganizationNumber(countryCode, organizationNumber);
    validatePeppolFields({
      countryCode,
      peppolScheme,
      peppolIdentifier
    });

    const record = {
      customerId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      customerNo: resolvedCustomerNo,
      legalName: requireText(legalName, "customer_legal_name_required"),
      organizationNumber: normalizeOptionalText(organizationNumber),
      countryCode: normalizeUpperCode(countryCode, "country_code_required", 2),
      languageCode: normalizeUpperCode(languageCode, "language_code_required", 2),
      currencyCode: normalizeUpperCode(currencyCode, "currency_code_required", 3),
      paymentTermsCode: requireText(paymentTermsCode, "payment_terms_code_required"),
      invoiceDeliveryMethod: requireText(invoiceDeliveryMethod, "invoice_delivery_method_required"),
      creditLimitAmount: normalizeMoney(creditLimitAmount, "credit_limit_amount_invalid"),
      reminderProfileCode: requireText(reminderProfileCode, "reminder_profile_code_required"),
      peppolScheme: normalizeOptionalText(peppolScheme),
      peppolIdentifier: normalizeOptionalText(peppolIdentifier),
      vatStatus: requireText(vatStatus, "vat_status_required"),
      billingAddress: normalizeAddress(billingAddress, "billing_address_invalid"),
      deliveryAddress: normalizeAddress(deliveryAddress || billingAddress, "delivery_address_invalid"),
      customerStatus: assertAllowed(customerStatus, AR_CUSTOMER_STATUSES, "customer_status_invalid"),
      importSourceKey: normalizedImportSourceKey,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };

    persistCustomerRecord(state, record);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "ar.customer.created",
      entityType: "ar_customer",
      entityId: record.customerId,
      explanation: `Created customer ${resolvedCustomerNo}.`
    });
    return copy(record);
  }

  function listCustomerContacts({ companyId, customerId } = {}) {
    const customer = requireCustomerRecord(state, companyId, customerId);
    return (state.contactIdsByCustomer.get(customer.customerId) || [])
      .map((contactId) => state.contacts.get(contactId))
      .filter(Boolean)
      .sort((left, right) => left.displayName.localeCompare(right.displayName))
      .map(copy);
  }

  function createCustomerContact({
    companyId,
    customerId,
    displayName,
    email,
    phone = null,
    roleCode,
    defaultBilling = false,
    defaultDelivery = false,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const customer = requireCustomerRecord(state, companyId, customerId);
    const resolvedEmail = normalizeEmail(email);
    const contactIds = ensureCollection(state.contactIdsByCustomer, customer.customerId);
    const duplicate = contactIds
      .map((contactId) => state.contacts.get(contactId))
      .find((contact) => contact && contact.email === resolvedEmail);
    if (duplicate) {
      throw createError(409, "customer_contact_email_not_unique", `Contact email ${resolvedEmail} already exists for the customer.`);
    }
    if (defaultBilling) {
      clearDefaultContactFlag(state, contactIds, "defaultBilling", clock);
    }
    if (defaultDelivery) {
      clearDefaultContactFlag(state, contactIds, "defaultDelivery", clock);
    }
    const record = {
      customerContactId: crypto.randomUUID(),
      companyId: customer.companyId,
      customerId: customer.customerId,
      displayName: requireText(displayName, "customer_contact_name_required"),
      email: resolvedEmail,
      phone: normalizeOptionalText(phone),
      roleCode: requireText(roleCode, "customer_contact_role_required"),
      defaultBilling: defaultBilling === true,
      defaultDelivery: defaultDelivery === true,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.contacts.set(record.customerContactId, record);
    contactIds.push(record.customerContactId);
    pushAudit(state, clock, {
      companyId: customer.companyId,
      actorId,
      correlationId,
      action: "ar.customer_contact.created",
      entityType: "ar_customer_contact",
      entityId: record.customerContactId,
      explanation: `Created contact ${resolvedEmail} for customer ${customer.customerNo}.`
    });
    return copy(record);
  }

  function listItems({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.itemIdsByCompany.get(resolvedCompanyId) || [])
      .map((itemId) => state.items.get(itemId))
      .filter(Boolean)
      .sort((left, right) => left.itemCode.localeCompare(right.itemCode))
      .map(copy);
  }

  function getItem({ companyId, itemId } = {}) {
    return copy(requireItemRecord(state, companyId, itemId));
  }

  function createItem({
    companyId,
    itemCode = null,
    description,
    itemType,
    unitCode,
    standardPrice,
    revenueAccountNumber,
    vatCode,
    recurringFlag = false,
    projectBoundFlag = false,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedItemCode = resolveSequenceOrValue({
      state,
      companyId: resolvedCompanyId,
      sequenceKey: "item",
      prefix: "ITEM",
      value: itemCode,
      requiredCode: "ar_item_code_required"
    });
    if (state.itemIdsByCompanyCode.has(toCompanyScopedKey(resolvedCompanyId, resolvedItemCode))) {
      throw createError(409, "ar_item_code_not_unique", `Item code ${resolvedItemCode} already exists.`);
    }
    const resolvedVatCode = ensureVatCodeExists(vatPlatform, resolvedCompanyId, vatCode);
    const record = {
      arItemId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      itemCode: resolvedItemCode,
      description: requireText(description, "ar_item_description_required"),
      itemType: requireText(itemType, "ar_item_type_required"),
      unitCode: requireText(unitCode, "ar_item_unit_required"),
      standardPrice: normalizeMoney(standardPrice, "ar_item_standard_price_invalid"),
      revenueAccountNumber: normalizeAccountNumber(revenueAccountNumber),
      vatCode: resolvedVatCode,
      recurringFlag: recurringFlag === true,
      projectBoundFlag: projectBoundFlag === true,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.items.set(record.arItemId, record);
    ensureCollection(state.itemIdsByCompany, resolvedCompanyId).push(record.arItemId);
    state.itemIdsByCompanyCode.set(toCompanyScopedKey(resolvedCompanyId, resolvedItemCode), record.arItemId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "ar.item.created",
      entityType: "ar_item",
      entityId: record.arItemId,
      explanation: `Created item ${resolvedItemCode}.`
    });
    return copy(record);
  }

  function listPriceLists({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.priceListIdsByCompany.get(resolvedCompanyId) || [])
      .map((priceListId) => state.priceLists.get(priceListId))
      .filter(Boolean)
      .sort((left, right) => left.priceListCode.localeCompare(right.priceListCode))
      .map(copy);
  }

  function getPriceList({ companyId, priceListId } = {}) {
    return copy(requirePriceListRecord(state, companyId, priceListId));
  }

  function createPriceList({
    companyId,
    priceListCode,
    description,
    currencyCode,
    validFrom,
    validTo = null,
    status = "active",
    lines,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedCode = requireText(priceListCode, "ar_price_list_code_required").toUpperCase();
    if (state.priceListIdsByCompanyCode.has(toCompanyScopedKey(resolvedCompanyId, resolvedCode))) {
      throw createError(409, "ar_price_list_code_not_unique", `Price list code ${resolvedCode} already exists.`);
    }
    const record = {
      priceListId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      priceListCode: resolvedCode,
      description: requireText(description, "ar_price_list_description_required"),
      currencyCode: normalizeUpperCode(currencyCode, "currency_code_required", 3),
      validFrom: normalizeDate(validFrom, "price_list_valid_from_invalid"),
      validTo: normalizeOptionalDate(validTo, "price_list_valid_to_invalid"),
      status: assertAllowed(status, AR_PRICE_LIST_STATUSES, "ar_price_list_status_invalid"),
      lines: normalizePriceListLines({
        state,
        companyId: resolvedCompanyId,
        currencyCode,
        lines
      }),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    assertDateRange(record.validFrom, record.validTo, "price_list_date_range_invalid");
    assertNoPriceListOverlap(record.lines);
    state.priceLists.set(record.priceListId, record);
    ensureCollection(state.priceListIdsByCompany, resolvedCompanyId).push(record.priceListId);
    state.priceListIdsByCompanyCode.set(toCompanyScopedKey(resolvedCompanyId, resolvedCode), record.priceListId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "ar.price_list.created",
      entityType: "ar_price_list",
      entityId: record.priceListId,
      explanation: `Created price list ${resolvedCode}.`
    });
    return copy(record);
  }

  function listQuotes({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.quoteIdsByCompany.get(resolvedCompanyId) || [])
      .map((quoteId) => state.quotes.get(quoteId))
      .filter(Boolean)
      .sort((left, right) => left.quoteNo.localeCompare(right.quoteNo))
      .map(copy);
  }

  function getQuote({ companyId, quoteId } = {}) {
    return copy(requireQuoteRecord(state, companyId, quoteId));
  }

  function createQuote({
    companyId,
    customerId,
    title,
    validUntil,
    currencyCode,
    discountModel = "none",
    priceListId = null,
    lines,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const customer = requireCustomerRecord(state, companyId, customerId);
    const version = buildQuoteVersion({
      state,
      clock,
      vatPlatform,
      companyId: customer.companyId,
      customer,
      title,
      validUntil,
      currencyCode,
      discountModel,
      priceListId,
      lines,
      versionNo: 1,
      supersedesQuoteVersionId: null
    });
    const record = {
      quoteId: crypto.randomUUID(),
      companyId: customer.companyId,
      customerId: customer.customerId,
      quoteNo: nextScopedSequence(state, customer.companyId, "quote", "Q"),
      currentVersionId: version.quoteVersionId,
      currentVersionNo: version.versionNo,
      status: version.status,
      convertedContractId: null,
      versions: [version],
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.quotes.set(record.quoteId, record);
    ensureCollection(state.quoteIdsByCompany, customer.companyId).push(record.quoteId);
    state.quoteIdsByCompanyNo.set(toCompanyScopedKey(customer.companyId, record.quoteNo), record.quoteId);
    pushAudit(state, clock, {
      companyId: customer.companyId,
      actorId,
      correlationId,
      action: "ar.quote.created",
      entityType: "ar_quote",
      entityId: record.quoteId,
      explanation: `Created quote ${record.quoteNo} version 1.`
    });
    return copy(record);
  }

  function transitionQuote({ companyId, quoteId, targetStatus, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const quote = requireQuoteRecord(state, companyId, quoteId);
    const version = requireCurrentQuoteVersion(quote);
    const nextStatus = requireText(targetStatus, "quote_target_status_required");
    assertQuoteTransition(version.status, nextStatus);
    version.status = nextStatus;
    version.updatedAt = nowIso(clock);
    quote.status = nextStatus;
    quote.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: quote.companyId,
      actorId,
      correlationId,
      action: "ar.quote.status_changed",
      entityType: "ar_quote",
      entityId: quote.quoteId,
      explanation: `Moved quote ${quote.quoteNo} to ${nextStatus}.`
    });
    return copy(quote);
  }

  function reviseQuote({
    companyId,
    quoteId,
    title = null,
    validUntil = null,
    currencyCode = null,
    discountModel = null,
    priceListId,
    lines = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const quote = requireQuoteRecord(state, companyId, quoteId);
    const currentVersion = requireCurrentQuoteVersion(quote);
    if (currentVersion.status === "converted") {
      throw createError(409, "quote_already_converted", "Converted quotes cannot be revised.");
    }
    const nextVersion = buildQuoteVersion({
      state,
      clock,
      vatPlatform,
      companyId: quote.companyId,
      customer: requireCustomerRecord(state, quote.companyId, quote.customerId),
      title: title || currentVersion.title,
      validUntil: validUntil || currentVersion.validUntil,
      currencyCode: currencyCode || currentVersion.currencyCode,
      discountModel: discountModel || currentVersion.discountModel,
      priceListId: priceListId === undefined ? currentVersion.priceListId : priceListId,
      lines: lines || currentVersion.lines,
      versionNo: quote.currentVersionNo + 1,
      supersedesQuoteVersionId: currentVersion.quoteVersionId
    });
    quote.versions.push(nextVersion);
    quote.currentVersionId = nextVersion.quoteVersionId;
    quote.currentVersionNo = nextVersion.versionNo;
    quote.status = nextVersion.status;
    quote.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: quote.companyId,
      actorId,
      correlationId,
      action: "ar.quote.revised",
      entityType: "ar_quote",
      entityId: quote.quoteId,
      explanation: `Created quote ${quote.quoteNo} version ${nextVersion.versionNo}.`
    });
    return copy(quote);
  }

  function listContracts({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.contractIdsByCompany.get(resolvedCompanyId) || [])
      .map((contractId) => state.contracts.get(contractId))
      .filter(Boolean)
      .sort((left, right) => left.contractNo.localeCompare(right.contractNo))
      .map(copy);
  }

  function getContract({ companyId, contractId } = {}) {
    return copy(requireContractRecord(state, companyId, contractId));
  }

  function createContract({
    companyId,
    customerId = null,
    sourceQuoteId = null,
    title,
    startDate,
    endDate,
    invoiceFrequency,
    currencyCode = null,
    minimumFeeAmount = 0,
    indexationAnnualPercent = 0,
    indexationAppliesFrom = null,
    terminationRuleCode,
    creditRuleCode,
    status = "draft",
    lines = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const sourceQuote = sourceQuoteId ? requireQuoteRecord(state, resolvedCompanyId, sourceQuoteId) : null;
    const sourceQuoteVersion = sourceQuote ? requireCurrentQuoteVersion(sourceQuote) : null;
    if (sourceQuoteVersion && sourceQuoteVersion.status !== "accepted") {
      throw createError(409, "quote_must_be_accepted", "Only accepted quotes may convert to contracts.");
    }
    const customer = sourceQuote
      ? requireCustomerRecord(state, resolvedCompanyId, sourceQuote.customerId)
      : requireCustomerRecord(state, resolvedCompanyId, customerId);
    const resolvedCurrencyCode = normalizeUpperCode(
      currencyCode || sourceQuoteVersion?.currencyCode || customer.currencyCode,
      "currency_code_required",
      3
    );
    const contractLines = normalizeCommercialLines({
      state,
      vatPlatform,
      companyId: resolvedCompanyId,
      currencyCode: resolvedCurrencyCode,
      referenceDate: startDate,
      priceListId: sourceQuoteVersion?.priceListId || null,
      lines: lines || sourceQuoteVersion?.lines
    });
    const record = {
      contractId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      contractNo: nextScopedSequence(state, resolvedCompanyId, "contract", "C"),
      customerId: customer.customerId,
      sourceQuoteId: sourceQuote?.quoteId || null,
      sourceQuoteVersionId: sourceQuoteVersion?.quoteVersionId || null,
      title: requireText(title || sourceQuoteVersion?.title, "ar_contract_title_required"),
      startDate: normalizeDate(startDate, "contract_start_date_invalid"),
      endDate: normalizeDate(endDate, "contract_end_date_invalid"),
      invoiceFrequency: assertAllowed(invoiceFrequency, AR_INVOICE_FREQUENCIES, "ar_contract_invoice_frequency_invalid"),
      currencyCode: resolvedCurrencyCode,
      minimumFeeAmount: normalizeMoney(minimumFeeAmount, "contract_minimum_fee_invalid"),
      indexationAnnualPercent: normalizeMoney(indexationAnnualPercent, "contract_indexation_invalid"),
      indexationAppliesFrom: normalizeOptionalDate(indexationAppliesFrom, "contract_indexation_date_invalid"),
      terminationRuleCode: requireText(terminationRuleCode, "contract_termination_rule_required"),
      creditRuleCode: requireText(creditRuleCode, "contract_credit_rule_required"),
      status: assertAllowed(status, AR_CONTRACT_STATUSES, "ar_contract_status_invalid"),
      lines: contractLines,
      invoicePlan: [],
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    assertDateRange(record.startDate, record.endDate, "contract_date_range_invalid");
    if (record.indexationAppliesFrom && record.indexationAppliesFrom < record.startDate) {
      throw createError(409, "contract_indexation_retroactive", "Indexation may not start before the contract start date.");
    }
    if (record.status === "active") {
      record.invoicePlan = generateInvoicePlan(record);
    }
    state.contracts.set(record.contractId, record);
    ensureCollection(state.contractIdsByCompany, resolvedCompanyId).push(record.contractId);
    state.contractIdsByCompanyNo.set(toCompanyScopedKey(resolvedCompanyId, record.contractNo), record.contractId);
    if (sourceQuote) {
      markQuoteConverted(sourceQuote, record.contractId, clock);
    }
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "ar.contract.created",
      entityType: "ar_contract",
      entityId: record.contractId,
      explanation: `Created contract ${record.contractNo}.`
    });
    return copy(record);
  }

  function transitionContractStatus({
    companyId,
    contractId,
    targetStatus,
    resolvedEndDate = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const contract = requireContractRecord(state, companyId, contractId);
    const nextStatus = requireText(targetStatus, "contract_target_status_required");
    assertContractTransition(contract.status, nextStatus);
    if (nextStatus === "terminated" && !resolvedEndDate && !contract.endDate) {
      throw createError(409, "contract_end_date_required", "Terminated contracts require an end date.");
    }
    contract.status = nextStatus;
    if (nextStatus === "active" && contract.invoicePlan.length === 0) {
      contract.invoicePlan = generateInvoicePlan(contract);
    }
    if (nextStatus === "terminated") {
      contract.endDate = normalizeDate(resolvedEndDate || contract.endDate, "contract_end_date_invalid");
      contract.invoicePlan = truncateInvoicePlan(contract.invoicePlan, contract.endDate);
    }
    contract.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: contract.companyId,
      actorId,
      correlationId,
      action: "ar.contract.status_changed",
      entityType: "ar_contract",
      entityId: contract.contractId,
      explanation: `Moved contract ${contract.contractNo} to ${nextStatus}.`
    });
    return copy(contract);
  }

  function importCustomers({
    companyId,
    batchKey,
    rows,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    if (!Array.isArray(rows) || rows.length === 0) {
      throw createError(400, "customer_import_rows_required", "Customer import requires at least one row.");
    }
    const resolvedBatchKey = requireText(batchKey, "customer_import_batch_key_required");
    const payloadHash = hashObject(rows);
    const scopedBatchKey = toCompanyScopedKey(resolvedCompanyId, resolvedBatchKey);
    const existingBatchId = state.customerImportBatchIdsByCompanyKey.get(scopedBatchKey) || null;
    if (existingBatchId) {
      const existingBatch = state.customerImportBatches.get(existingBatchId);
      if (existingBatch.payloadHash !== payloadHash) {
        throw createError(409, "customer_import_batch_conflict", "Import batch key already exists with different payload.");
      }
      return {
        customerImportBatch: copy(existingBatch),
        idempotentReplay: true
      };
    }

    let createdCustomers = 0;
    let updatedCustomers = 0;
    let createdContacts = 0;
    const importedCustomerIds = [];
    for (const row of rows) {
      const result = upsertImportedCustomer({
        state,
        clock,
        vatPlatform,
        companyId: resolvedCompanyId,
        row,
        batchKey: resolvedBatchKey,
        actorId,
        correlationId
      });
      createdCustomers += result.createdCustomer ? 1 : 0;
      updatedCustomers += result.createdCustomer ? 0 : 1;
      createdContacts += result.createdContactCount;
      importedCustomerIds.push(result.customerId);
    }

    const batch = {
      customerImportBatchId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      batchKey: resolvedBatchKey,
      payloadHash,
      rowCount: rows.length,
      createdCustomers,
      updatedCustomers,
      createdContacts,
      importedCustomerIds,
      createdAt: nowIso(clock)
    };
    state.customerImportBatches.set(batch.customerImportBatchId, batch);
    state.customerImportBatchIdsByCompanyKey.set(scopedBatchKey, batch.customerImportBatchId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "ar.customer_import.completed",
      entityType: "ar_customer_import_batch",
      entityId: batch.customerImportBatchId,
      explanation: `Imported ${rows.length} customer rows with batch ${resolvedBatchKey}.`
    });
    return {
      customerImportBatch: copy(batch),
      idempotentReplay: false
    };
  }

  function getCustomerImportBatch({ companyId, customerImportBatchId } = {}) {
    const batch = state.customerImportBatches.get(requireText(customerImportBatchId, "customer_import_batch_id_required"));
    if (!batch || batch.companyId !== requireText(companyId, "company_id_required")) {
      throw createError(404, "customer_import_batch_not_found", "Customer import batch was not found.");
    }
    return copy(batch);
  }

  function snapshotAr() {
    return copy({
      customers: [...state.customers.values()],
      contacts: [...state.contacts.values()],
      items: [...state.items.values()],
      priceLists: [...state.priceLists.values()],
      quotes: [...state.quotes.values()],
      contracts: [...state.contracts.values()],
      customerImportBatches: [...state.customerImportBatches.values()],
      auditEvents: state.auditEvents
    });
  }

  function seedDemoState() {
    const customer = createCustomer({
      companyId: DEMO_COMPANY_ID,
      customerNo: "CUST-1000",
      legalName: "Demo Customer AB",
      organizationNumber: "5566778899",
      countryCode: "SE",
      languageCode: "SV",
      currencyCode: "SEK",
      paymentTermsCode: "NET30",
      invoiceDeliveryMethod: "pdf_email",
      creditLimitAmount: 100000,
      reminderProfileCode: "standard",
      billingAddress: {
        line1: "Sveavagen 1",
        postalCode: "11157",
        city: "Stockholm",
        countryCode: "SE"
      },
      deliveryAddress: {
        line1: "Sveavagen 1",
        postalCode: "11157",
        city: "Stockholm",
        countryCode: "SE"
      }
    });
    createCustomerContact({
      companyId: DEMO_COMPANY_ID,
      customerId: customer.customerId,
      displayName: "Anna Demo",
      email: "anna.demo@example.com",
      roleCode: "billing",
      defaultBilling: true
    });
    const item = createItem({
      companyId: DEMO_COMPANY_ID,
      itemCode: "SERV-001",
      description: "Standard consulting",
      itemType: "service",
      unitCode: "hour",
      standardPrice: 1250,
      revenueAccountNumber: "3010",
      vatCode: "VAT_SE_DOMESTIC_25"
    });
    const priceList = createPriceList({
      companyId: DEMO_COMPANY_ID,
      priceListCode: "STD",
      description: "Standard SEK price list",
      currencyCode: "SEK",
      validFrom: "2026-01-01",
      status: "active",
      lines: [
        {
          itemId: item.arItemId,
          unitPrice: 1250,
          validFrom: "2026-01-01"
        }
      ]
    });
    const quote = createQuote({
      companyId: DEMO_COMPANY_ID,
      customerId: customer.customerId,
      title: "Demo consulting quote",
      validUntil: "2026-06-30",
      currencyCode: "SEK",
      priceListId: priceList.priceListId,
      lines: [{ itemId: item.arItemId, quantity: 10 }]
    });
    transitionQuote({
      companyId: DEMO_COMPANY_ID,
      quoteId: quote.quoteId,
      targetStatus: "sent"
    });
  }
}

function ensureCustomerNoUnique(state, companyId, customerNo) {
  if (state.customerIdsByCompanyNo.has(toCompanyScopedKey(companyId, customerNo))) {
    throw createError(409, "customer_no_not_unique", `Customer number ${customerNo} already exists.`);
  }
}

function ensureCustomerImportSourceUnique(state, companyId, importSourceKey) {
  if (state.customerIdsByCompanyImportSource.has(toCompanyScopedKey(companyId, importSourceKey))) {
    throw createError(409, "customer_import_source_not_unique", `Import source key ${importSourceKey} already exists.`);
  }
}

function persistCustomerRecord(state, record) {
  state.customers.set(record.customerId, record);
  ensureCollection(state.customerIdsByCompany, record.companyId).push(record.customerId);
  state.customerIdsByCompanyNo.set(toCompanyScopedKey(record.companyId, record.customerNo), record.customerId);
  if (record.importSourceKey) {
    state.customerIdsByCompanyImportSource.set(toCompanyScopedKey(record.companyId, record.importSourceKey), record.customerId);
  }
  state.contactIdsByCustomer.set(record.customerId, []);
}

function requireCustomerRecord(state, companyId, customerId) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const customer = state.customers.get(requireText(customerId, "customer_id_required"));
  if (!customer || customer.companyId !== resolvedCompanyId) {
    throw createError(404, "customer_not_found", "Customer was not found.");
  }
  return customer;
}

function requireItemRecord(state, companyId, itemId) {
  const item = state.items.get(requireText(itemId, "ar_item_id_required"));
  if (!item || item.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "ar_item_not_found", "AR item was not found.");
  }
  return item;
}

function requirePriceListRecord(state, companyId, priceListId) {
  const priceList = state.priceLists.get(requireText(priceListId, "ar_price_list_id_required"));
  if (!priceList || priceList.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "ar_price_list_not_found", "AR price list was not found.");
  }
  return priceList;
}

function requireQuoteRecord(state, companyId, quoteId) {
  const quote = state.quotes.get(requireText(quoteId, "quote_id_required"));
  if (!quote || quote.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "quote_not_found", "Quote was not found.");
  }
  return quote;
}

function requireContractRecord(state, companyId, contractId) {
  const contract = state.contracts.get(requireText(contractId, "ar_contract_id_required"));
  if (!contract || contract.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "ar_contract_not_found", "AR contract was not found.");
  }
  return contract;
}

function requireCurrentQuoteVersion(quote) {
  const version = quote.versions.find((candidate) => candidate.quoteVersionId === quote.currentVersionId);
  if (!version) {
    throw createError(500, "quote_version_missing", "Current quote version is missing.");
  }
  return version;
}

function buildQuoteVersion({
  state,
  clock,
  vatPlatform,
  companyId,
  customer,
  title,
  validUntil,
  currencyCode,
  discountModel,
  priceListId,
  lines,
  versionNo,
  supersedesQuoteVersionId
}) {
  const normalizedValidUntil = normalizeDate(validUntil, "quote_valid_until_invalid");
  const normalizedCurrencyCode = normalizeUpperCode(currencyCode, "currency_code_required", 3);
  const normalizedLines = normalizeCommercialLines({
    state,
    vatPlatform,
    companyId,
    currencyCode: normalizedCurrencyCode,
    referenceDate: normalizedValidUntil,
    priceListId,
    lines
  });
  return {
    quoteVersionId: crypto.randomUUID(),
    versionNo,
    status: "draft",
    supersedesQuoteVersionId,
    customerId: customer.customerId,
    title: requireText(title, "quote_title_required"),
    validUntil: normalizedValidUntil,
    currencyCode: normalizedCurrencyCode,
    discountModel: requireText(discountModel, "quote_discount_model_required"),
    priceListId: priceListId ? requirePriceListRecord(state, companyId, priceListId).priceListId : null,
    lines: normalizedLines,
    totalAmount: roundMoney(normalizedLines.reduce((sum, line) => sum + line.lineAmount, 0)),
    sourceSnapshotHash: hashObject({
      title,
      validUntil: normalizedValidUntil,
      currencyCode: normalizedCurrencyCode,
      discountModel,
      priceListId,
      lines: normalizedLines
    }),
    createdAt: nowIso(clock),
    updatedAt: nowIso(clock)
  };
}

function normalizeCommercialLines({ state, vatPlatform, companyId, currencyCode, referenceDate = null, priceListId, lines }) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw createError(400, "commercial_lines_required", "At least one line is required.");
  }
  return lines.map((line, index) =>
    normalizeCommercialLine({
      state,
      vatPlatform,
      companyId,
      currencyCode,
      referenceDate,
      priceListId,
      line,
      lineNumber: index + 1
    })
  );
}

function normalizeCommercialLine({ state, vatPlatform, companyId, currencyCode, referenceDate, priceListId, line, lineNumber }) {
  if (!line || typeof line !== "object") {
    throw createError(400, "commercial_line_invalid", "Each commercial line must be an object.");
  }
  const item = line.itemId ? requireItemRecord(state, companyId, line.itemId) : null;
  const quantity = normalizePositiveNumber(line.quantity ?? 1, "commercial_line_quantity_invalid");
  const resolvedCurrencyCode = normalizeUpperCode(currencyCode, "currency_code_required", 3);
  const unitPrice = normalizeMoney(
    line.unitPrice ?? resolveItemPrice(state, companyId, item, priceListId, resolvedCurrencyCode, referenceDate),
    "commercial_line_unit_price_invalid"
  );
  const description = requireText(line.description || item?.description || `Line ${lineNumber}`, "commercial_line_description_required");
  const revenueAccountNumber = normalizeAccountNumber(line.revenueAccountNumber || item?.revenueAccountNumber);
  const vatCode = ensureVatCodeExists(vatPlatform, companyId, line.vatCode || item?.vatCode);
  return {
    lineId: crypto.randomUUID(),
    lineNumber,
    itemId: item?.arItemId || null,
    itemCode: item?.itemCode || normalizeOptionalText(line.itemCode),
    description,
    quantity,
    unitCode: requireText(line.unitCode || item?.unitCode || "ea", "commercial_line_unit_required"),
    unitPrice,
    lineAmount: roundMoney(quantity * unitPrice),
    revenueAccountNumber,
    vatCode,
    recurringFlag: line.recurringFlag === true || item?.recurringFlag === true,
    projectBoundFlag: line.projectBoundFlag === true || item?.projectBoundFlag === true
  };
}

function resolveItemPrice(state, companyId, item, priceListId, currencyCode, referenceDate) {
  if (!item) {
    return null;
  }
  if (!priceListId) {
    return item.standardPrice;
  }
  const priceList = requirePriceListRecord(state, companyId, priceListId);
  const matchingRows = priceList.lines
    .filter((line) => line.itemId === item.arItemId && line.currencyCode === currencyCode)
    .filter((line) => isDateWithin(line.validFrom, line.validTo, referenceDate || priceList.validFrom))
    .sort((left, right) => right.validFrom.localeCompare(left.validFrom));
  return matchingRows[0]?.unitPrice ?? item.standardPrice;
}

function markQuoteConverted(quote, contractId, clock = () => new Date()) {
  const version = requireCurrentQuoteVersion(quote);
  version.status = "converted";
  version.updatedAt = nowIso(clock);
  quote.status = "converted";
  quote.convertedContractId = contractId;
  quote.updatedAt = nowIso(clock);
}

function generateInvoicePlan(contract) {
  if (contract.status !== "active") {
    throw createError(409, "contract_not_active", "Only active contracts may generate invoice plans.");
  }
  assertDateRange(contract.startDate, contract.endDate, "contract_date_range_invalid");
  const baseAmount = roundMoney(
    Math.max(Number(contract.minimumFeeAmount || 0), contract.lines.reduce((sum, line) => sum + Number(line.lineAmount || 0), 0))
  );
  if (contract.invoiceFrequency === "one_time") {
    return [
      createInvoicePlanRow(
        1,
        contract.startDate,
        contract.startDate,
        contract.endDate,
        resolveIndexedAmount({ ...contract, periodStartsOn: contract.startDate }, baseAmount),
        contract.currencyCode
      )
    ];
  }

  const rows = [];
  const monthsByFrequency = {
    monthly: 1,
    quarterly: 3,
    annual: 12
  };
  let currentStart = contract.startDate;
  let sequenceNo = 1;
  while (currentStart <= contract.endDate) {
    const nextStart = addMonthsIso(currentStart, monthsByFrequency[contract.invoiceFrequency]);
    const periodEndsOn = minIsoDate(addDaysIso(nextStart, -1), contract.endDate);
    rows.push(
      createInvoicePlanRow(
        sequenceNo,
        currentStart,
        currentStart,
        periodEndsOn,
        resolveIndexedAmount({ ...contract, periodStartsOn: currentStart }, baseAmount),
        contract.currencyCode
      )
    );
    currentStart = nextStart;
    sequenceNo += 1;
  }
  assertInvoicePlanIntegrity(rows);
  return rows;
}

function truncateInvoicePlan(invoicePlan, endDate) {
  const resolvedEndDate = normalizeDate(endDate, "contract_end_date_invalid");
  const nextPlan = invoicePlan
    .map((row) => ({ ...row }))
    .filter((row) => row.periodStartsOn <= resolvedEndDate)
    .map((row) => {
      if (row.periodEndsOn > resolvedEndDate) {
        return {
          ...row,
          periodEndsOn: resolvedEndDate,
          plannedInvoiceDate: minIsoDate(row.plannedInvoiceDate, resolvedEndDate)
        };
      }
      return row;
    });
  assertInvoicePlanIntegrity(nextPlan);
  return nextPlan;
}

function createInvoicePlanRow(sequenceNo, plannedInvoiceDate, periodStartsOn, periodEndsOn, amount, currencyCode) {
  return {
    invoicePlanRowId: crypto.randomUUID(),
    sequenceNo,
    plannedInvoiceDate,
    periodStartsOn,
    periodEndsOn,
    amount: roundMoney(amount),
    currencyCode: normalizeUpperCode(currencyCode, "currency_code_required", 3),
    status: "planned"
  };
}

function resolveIndexedAmount(contract, baseAmount) {
  if (!contract.indexationAppliesFrom || Number(contract.indexationAnnualPercent || 0) === 0) {
    return roundMoney(baseAmount);
  }
  if (contract.periodStartsOn < contract.indexationAppliesFrom) {
    return roundMoney(baseAmount);
  }
  return roundMoney(baseAmount * (1 + Number(contract.indexationAnnualPercent || 0) / 100));
}

function assertInvoicePlanIntegrity(rows) {
  for (let index = 1; index < rows.length; index += 1) {
    if (rows[index].periodStartsOn !== addDaysIso(rows[index - 1].periodEndsOn, 1)) {
      throw createError(409, "invoice_plan_gap_or_overlap", "Generated invoice plan contains gaps or overlaps.");
    }
  }
}

function upsertImportedCustomer({ state, clock, vatPlatform, companyId, row, batchKey, actorId, correlationId }) {
  if (!row || typeof row !== "object") {
    throw createError(400, "customer_import_row_invalid", "Each import row must be an object.");
  }
  const normalizedImportSourceKey = normalizeOptionalText(row.importSourceKey);
  const resolvedCustomerNo = row.customerNo
    ? requireText(row.customerNo, "customer_no_required").toUpperCase()
    : null;
  const existingCustomerId =
    (normalizedImportSourceKey && state.customerIdsByCompanyImportSource.get(toCompanyScopedKey(companyId, normalizedImportSourceKey))) ||
    (resolvedCustomerNo && state.customerIdsByCompanyNo.get(toCompanyScopedKey(companyId, resolvedCustomerNo))) ||
    null;

  if (!existingCustomerId) {
    const customer = createImportedCustomer(state, clock, companyId, batchKey, actorId, correlationId, row);
    let createdContactCount = 0;
    for (const contact of Array.isArray(row.contacts) ? row.contacts : []) {
      createImportedContact(state, clock, companyId, customer.customerId, actorId, correlationId, contact);
      createdContactCount += 1;
    }
    return { customerId: customer.customerId, createdCustomer: true, createdContactCount };
  }

  const customer = state.customers.get(existingCustomerId);
  validateOrganizationNumber(row.countryCode || customer.countryCode, row.organizationNumber || customer.organizationNumber);
  validatePeppolFields({
    countryCode: row.countryCode || customer.countryCode,
    peppolScheme: row.peppolScheme || customer.peppolScheme,
    peppolIdentifier: row.peppolIdentifier || customer.peppolIdentifier
  });
  if (normalizedImportSourceKey && normalizedImportSourceKey !== customer.importSourceKey) {
    ensureCustomerImportSourceUnique(state, companyId, normalizedImportSourceKey);
    if (customer.importSourceKey) {
      state.customerIdsByCompanyImportSource.delete(toCompanyScopedKey(companyId, customer.importSourceKey));
    }
    state.customerIdsByCompanyImportSource.set(toCompanyScopedKey(companyId, normalizedImportSourceKey), customer.customerId);
  }
  Object.assign(customer, {
    legalName: requireText(row.legalName || customer.legalName, "customer_legal_name_required"),
    organizationNumber: normalizeOptionalText(row.organizationNumber || customer.organizationNumber),
    countryCode: normalizeUpperCode(row.countryCode || customer.countryCode, "country_code_required", 2),
    languageCode: normalizeUpperCode(row.languageCode || customer.languageCode, "language_code_required", 2),
    currencyCode: normalizeUpperCode(row.currencyCode || customer.currencyCode, "currency_code_required", 3),
    paymentTermsCode: requireText(row.paymentTermsCode || customer.paymentTermsCode, "payment_terms_code_required"),
    invoiceDeliveryMethod: requireText(row.invoiceDeliveryMethod || customer.invoiceDeliveryMethod, "invoice_delivery_method_required"),
    creditLimitAmount: normalizeMoney(row.creditLimitAmount ?? customer.creditLimitAmount, "credit_limit_amount_invalid"),
    reminderProfileCode: requireText(row.reminderProfileCode || customer.reminderProfileCode, "reminder_profile_code_required"),
    peppolScheme: normalizeOptionalText(row.peppolScheme || customer.peppolScheme),
    peppolIdentifier: normalizeOptionalText(row.peppolIdentifier || customer.peppolIdentifier),
    vatStatus: requireText(row.vatStatus || customer.vatStatus, "vat_status_required"),
    billingAddress: normalizeAddress(row.billingAddress || customer.billingAddress, "billing_address_invalid"),
    deliveryAddress: normalizeAddress(row.deliveryAddress || customer.deliveryAddress, "delivery_address_invalid"),
    customerStatus: assertAllowed(row.customerStatus || customer.customerStatus, AR_CUSTOMER_STATUSES, "customer_status_invalid"),
    importSourceKey: normalizedImportSourceKey || customer.importSourceKey,
    updatedAt: nowIso(clock)
  });

  let createdContactCount = 0;
  const contactIds = ensureCollection(state.contactIdsByCustomer, customer.customerId);
  for (const contact of Array.isArray(row.contacts) ? row.contacts : []) {
    const resolvedEmail = normalizeOptionalText(contact.email)?.toLowerCase() || null;
    const existingContact = contactIds
      .map((contactId) => state.contacts.get(contactId))
      .find((candidate) => candidate && resolvedEmail && candidate.email === resolvedEmail);
    if (existingContact) {
      existingContact.displayName = requireText(contact.displayName || existingContact.displayName, "customer_contact_name_required");
      existingContact.phone = normalizeOptionalText(contact.phone || existingContact.phone);
      existingContact.roleCode = requireText(contact.roleCode || existingContact.roleCode, "customer_contact_role_required");
      existingContact.updatedAt = nowIso(clock);
      continue;
    }
    createImportedContact(state, clock, companyId, customer.customerId, actorId, correlationId, contact);
    createdContactCount += 1;
  }
  pushAudit(state, clock, {
    companyId,
    actorId,
    correlationId,
    action: "ar.customer.updated",
    entityType: "ar_customer",
    entityId: customer.customerId,
    explanation: `Updated customer ${customer.customerNo} from import ${batchKey}.`
  });
  return { customerId: customer.customerId, createdCustomer: false, createdContactCount };
}

function createImportedCustomer(state, clock, companyId, batchKey, actorId, correlationId, row) {
  const customerNo = resolveSequenceOrValue({
    state,
    companyId,
    sequenceKey: "customer",
    prefix: "CUST",
    value: row.customerNo || null,
    requiredCode: "customer_no_required"
  });
  ensureCustomerNoUnique(state, companyId, customerNo);
  const normalizedImportSourceKey = normalizeOptionalText(row.importSourceKey);
  if (normalizedImportSourceKey) {
    ensureCustomerImportSourceUnique(state, companyId, normalizedImportSourceKey);
  }
  validateOrganizationNumber(row.countryCode, row.organizationNumber || null);
  validatePeppolFields({
    countryCode: row.countryCode,
    peppolScheme: row.peppolScheme || null,
    peppolIdentifier: row.peppolIdentifier || null
  });
  const record = {
    customerId: crypto.randomUUID(),
    companyId,
    customerNo,
    legalName: requireText(row.legalName, "customer_legal_name_required"),
    organizationNumber: normalizeOptionalText(row.organizationNumber || null),
    countryCode: normalizeUpperCode(row.countryCode, "country_code_required", 2),
    languageCode: normalizeUpperCode(row.languageCode, "language_code_required", 2),
    currencyCode: normalizeUpperCode(row.currencyCode, "currency_code_required", 3),
    paymentTermsCode: requireText(row.paymentTermsCode, "payment_terms_code_required"),
    invoiceDeliveryMethod: requireText(row.invoiceDeliveryMethod, "invoice_delivery_method_required"),
    creditLimitAmount: normalizeMoney(row.creditLimitAmount ?? 0, "credit_limit_amount_invalid"),
    reminderProfileCode: requireText(row.reminderProfileCode, "reminder_profile_code_required"),
    peppolScheme: normalizeOptionalText(row.peppolScheme || null),
    peppolIdentifier: normalizeOptionalText(row.peppolIdentifier || null),
    vatStatus: requireText(row.vatStatus || "registered", "vat_status_required"),
    billingAddress: normalizeAddress(row.billingAddress || {}, "billing_address_invalid"),
    deliveryAddress: normalizeAddress(row.deliveryAddress || row.billingAddress || {}, "delivery_address_invalid"),
    customerStatus: assertAllowed(row.customerStatus || "active", AR_CUSTOMER_STATUSES, "customer_status_invalid"),
    importSourceKey: normalizedImportSourceKey,
    importedFromBatchId: batchKey,
    createdAt: nowIso(clock),
    updatedAt: nowIso(clock)
  };
  persistCustomerRecord(state, record);
  pushAudit(state, clock, {
    companyId,
    actorId,
    correlationId,
    action: "ar.customer.created",
    entityType: "ar_customer",
    entityId: record.customerId,
    explanation: `Created customer ${customerNo} from import ${batchKey}.`
  });
  return record;
}

function createImportedContact(state, clock, companyId, customerId, actorId, correlationId, contact) {
  const contactIds = ensureCollection(state.contactIdsByCustomer, customerId);
  if (contact.defaultBilling === true) {
    clearDefaultContactFlag(state, contactIds, "defaultBilling", clock);
  }
  if (contact.defaultDelivery === true) {
    clearDefaultContactFlag(state, contactIds, "defaultDelivery", clock);
  }
  const record = {
    customerContactId: crypto.randomUUID(),
    companyId,
    customerId,
    displayName: requireText(contact.displayName, "customer_contact_name_required"),
    email: normalizeEmail(contact.email),
    phone: normalizeOptionalText(contact.phone || null),
    roleCode: requireText(contact.roleCode || "billing", "customer_contact_role_required"),
    defaultBilling: contact.defaultBilling === true,
    defaultDelivery: contact.defaultDelivery === true,
    createdAt: nowIso(clock),
    updatedAt: nowIso(clock)
  };
  state.contacts.set(record.customerContactId, record);
  contactIds.push(record.customerContactId);
  pushAudit(state, clock, {
    companyId,
    actorId,
    correlationId,
    action: "ar.customer_contact.created",
    entityType: "ar_customer_contact",
    entityId: record.customerContactId,
    explanation: `Created contact ${record.email} from import.`
  });
}

function normalizePriceListLines({ state, companyId, currencyCode, lines }) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw createError(400, "ar_price_list_lines_required", "Price lists require at least one line.");
  }
  return lines.map((line, index) => {
    const item = requireItemRecord(state, companyId, line.itemId);
    const record = {
      priceListLineId: crypto.randomUUID(),
      lineNumber: index + 1,
      itemId: item.arItemId,
      itemCode: item.itemCode,
      unitPrice: normalizeMoney(line.unitPrice, "ar_price_list_unit_price_invalid"),
      currencyCode: normalizeUpperCode(line.currencyCode || currencyCode, "currency_code_required", 3),
      validFrom: normalizeDate(line.validFrom, "ar_price_list_valid_from_invalid"),
      validTo: normalizeOptionalDate(line.validTo, "ar_price_list_valid_to_invalid")
    };
    assertDateRange(record.validFrom, record.validTo, "price_list_line_date_range_invalid");
    return record;
  });
}

function ensureVatCodeExists(vatPlatform, companyId, vatCode) {
  const resolvedVatCode = requireText(vatCode, "vat_code_required");
  if (!vatPlatform || typeof vatPlatform.listVatCodes !== "function") {
    return resolvedVatCode;
  }
  const vatCodes = vatPlatform.listVatCodes({ companyId });
  if (!vatCodes.some((candidate) => candidate.vatCode === resolvedVatCode)) {
    throw createError(400, "vat_code_not_found", `VAT code ${resolvedVatCode} was not found for the company.`);
  }
  return resolvedVatCode;
}

function assertQuoteTransition(currentStatus, nextStatus) {
  const transitions = {
    draft: ["sent", "expired"],
    sent: ["accepted", "rejected", "expired"],
    accepted: ["converted"],
    rejected: [],
    expired: [],
    converted: []
  };
  if (!transitions[currentStatus]?.includes(nextStatus)) {
    throw createError(409, "quote_transition_invalid", `Quote cannot move from ${currentStatus} to ${nextStatus}.`);
  }
}

function assertContractTransition(currentStatus, nextStatus) {
  const transitions = {
    draft: ["pending_approval", "active", "terminated"],
    pending_approval: ["active", "terminated"],
    active: ["paused", "terminated", "expired"],
    paused: ["active", "terminated", "expired"],
    terminated: [],
    expired: []
  };
  if (!transitions[currentStatus]?.includes(nextStatus)) {
    throw createError(409, "contract_transition_invalid", `Contract cannot move from ${currentStatus} to ${nextStatus}.`);
  }
}

function assertNoPriceListOverlap(lines) {
  const grouped = new Map();
  for (const line of lines) {
    const key = `${line.itemId}:${line.currencyCode}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(line);
  }
  for (const group of grouped.values()) {
    const sorted = [...group].sort((left, right) => left.validFrom.localeCompare(right.validFrom));
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      if (current.validFrom <= (previous.validTo || "9999-12-31")) {
        throw createError(409, "price_list_line_overlap", "Price-list lines may not overlap for the same item and currency.");
      }
    }
  }
}

function validateOrganizationNumber(countryCode, organizationNumber) {
  const normalizedCountryCode = normalizeOptionalText(countryCode)?.toUpperCase() || null;
  const normalizedOrgNo = normalizeOptionalText(organizationNumber);
  if (!normalizedOrgNo) {
    return;
  }
  if (normalizedCountryCode === "SE") {
    const digits = normalizedOrgNo.replace(/\D/g, "");
    if (digits.length !== 10 && digits.length !== 12) {
      throw createError(400, "organization_number_invalid", "Swedish organization numbers must contain 10 or 12 digits.");
    }
  }
}

function validatePeppolFields({ countryCode, peppolScheme, peppolIdentifier }) {
  if ((peppolScheme && !peppolIdentifier) || (!peppolScheme && peppolIdentifier)) {
    throw createError(400, "peppol_fields_incomplete", "Peppol requires both scheme and identifier.");
  }
  if (peppolIdentifier && !countryCode) {
    throw createError(400, "peppol_country_required", "Peppol identifiers require a country code.");
  }
}

function clearDefaultContactFlag(state, contactIds, propertyName, clock = () => new Date()) {
  for (const contactId of contactIds) {
    const contact = state.contacts.get(contactId);
    if (contact) {
      contact[propertyName] = false;
      contact.updatedAt = nowIso(clock);
    }
  }
}

function resolveSequenceOrValue({ state, companyId, sequenceKey, prefix, value, requiredCode }) {
  if (value) {
    return requireText(value, requiredCode).toUpperCase();
  }
  return nextScopedSequence(state, companyId, sequenceKey, prefix);
}

function nextScopedSequence(state, companyId, sequenceKey, prefix) {
  if (!state.countersByCompany.has(companyId)) {
    state.countersByCompany.set(companyId, {});
  }
  const counters = state.countersByCompany.get(companyId);
  counters[sequenceKey] = (counters[sequenceKey] || 0) + 1;
  return `${prefix}-${String(counters[sequenceKey]).padStart(5, "0")}`;
}

function ensureCollection(map, key) {
  if (!map.has(key)) {
    map.set(key, []);
  }
  return map.get(key);
}

function normalizeAddress(address, code) {
  if (!address || typeof address !== "object" || Array.isArray(address)) {
    throw createError(400, code, "Address must be an object.");
  }
  return {
    line1: requireText(address.line1 || "", `${code}_line1_required`),
    line2: normalizeOptionalText(address.line2 || null),
    postalCode: requireText(address.postalCode || "", `${code}_postal_code_required`),
    city: requireText(address.city || "", `${code}_city_required`),
    countryCode: normalizeUpperCode(address.countryCode, `${code}_country_code_required`, 2)
  };
}

function normalizeOptionalText(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return String(value).trim();
}

function normalizeEmail(value) {
  const email = requireText(value, "email_required").toLowerCase();
  if (!email.includes("@")) {
    throw createError(400, "email_invalid", "Email address is invalid.");
  }
  return email;
}

function normalizeUpperCode(value, code, length) {
  const normalized = requireText(value, code).toUpperCase();
  if (normalized.length !== length) {
    throw createError(400, code, `${code} must have length ${length}.`);
  }
  return normalized;
}

function normalizeAccountNumber(value) {
  const accountNumber = requireText(value, "revenue_account_number_required");
  if (!/^\d{4}$/.test(accountNumber)) {
    throw createError(400, "revenue_account_number_invalid", "Revenue account number must be four digits.");
  }
  return accountNumber;
}

function normalizeDate(value, code) {
  const input = requireText(value, code);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    throw createError(400, code, `${code} must be an ISO date.`);
  }
  return input;
}

function normalizeOptionalDate(value, code) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return normalizeDate(value, code);
}

function assertDateRange(fromDate, toDate, code) {
  if (toDate && fromDate > toDate) {
    throw createError(400, code, `${code} requires fromDate to be on or before toDate.`);
  }
}

function isDateWithin(validFrom, validTo, candidateDate) {
  const resolvedCandidateDate = normalizeDate(candidateDate, "candidate_date_invalid");
  return validFrom <= resolvedCandidateDate && (!validTo || validTo >= resolvedCandidateDate);
}

function normalizeMoney(value, code) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw createError(400, code, `${code} must be a non-negative number.`);
  }
  return roundMoney(number);
}

function normalizePositiveNumber(value, code) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw createError(400, code, `${code} must be greater than zero.`);
  }
  return roundMoney(number);
}

function addDaysIso(date, days) {
  const resolved = new Date(`${date}T00:00:00.000Z`);
  resolved.setUTCDate(resolved.getUTCDate() + days);
  return resolved.toISOString().slice(0, 10);
}

function addMonthsIso(date, months) {
  const [year, month, day] = date.split("-").map(Number);
  const targetMonthIndex = month - 1 + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDay);
  return new Date(Date.UTC(targetYear, targetMonth, targetDay)).toISOString().slice(0, 10);
}

function minIsoDate(left, right) {
  return left <= right ? left : right;
}

function nowIso(clock = () => new Date()) {
  return new Date(clock()).toISOString();
}

function assertAllowed(value, allowedValues, code) {
  const resolvedValue = requireText(value, code);
  if (!allowedValues.includes(resolvedValue)) {
    throw createError(400, code, `${code} does not allow ${resolvedValue}.`);
  }
  return resolvedValue;
}

function toCompanyScopedKey(companyId, value) {
  return `${companyId}:${value}`;
}

function requireText(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createError(400, code, `${code} is required.`);
  }
  return value.trim();
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function hashObject(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function pushAudit(state, clock, { companyId, actorId, correlationId, action, entityType, entityId, explanation }) {
  state.auditEvents.push({
    auditEventId: crypto.randomUUID(),
    companyId,
    actorId,
    correlationId,
    action,
    entityType,
    entityId,
    explanation,
    recordedAt: nowIso(clock)
  });
}

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
