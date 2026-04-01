import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";
import { createVatPlatform } from "../../domain-vat/src/index.mjs";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";
import {
  normalizeOptionalSwedishOrganizationNumber,
  normalizeOptionalVatNumber,
  normalizeRequiredIsoDate,
  normalizeRequiredOcrReference
} from "../../domain-core/src/validation.mjs";
import {
  applyDurableStateSnapshot,
  serializeDurableState
} from "../../domain-core/src/state-snapshots.mjs";
import {
  buildJournalReversalLineInputs,
  buildRealizedFxJournalLine
} from "../../domain-ledger/src/index.mjs";

export const AR_CUSTOMER_STATUSES = Object.freeze(["active", "blocked", "archived"]);
export const AR_PRICE_LIST_STATUSES = Object.freeze(["draft", "active", "inactive"]);
export const AR_QUOTE_STATUSES = Object.freeze(["draft", "sent", "accepted", "rejected", "expired", "converted"]);
export const AR_CONTRACT_STATUSES = Object.freeze(["draft", "pending_approval", "active", "paused", "terminated", "expired"]);
export const AR_INVOICE_FREQUENCIES = Object.freeze(["monthly", "quarterly", "annual", "one_time"]);
export const AR_INVOICE_TYPES = Object.freeze(["standard", "credit_note", "partial", "subscription"]);
export const AR_INVOICE_FIELD_EVALUATION_STATUSES = Object.freeze(["calculated", "blocked", "passed", "superseded"]);
export const AR_INVOICE_STATUSES = Object.freeze([
  "draft",
  "validated",
  "approved",
  "issued",
  "delivered",
  "delivery_failed",
  "partially_paid",
  "paid",
  "overdue",
  "disputed",
  "credited",
  "written_off",
  "reversed"
]);
export const AR_OPEN_ITEM_STATUSES = Object.freeze([
  "open",
  "partially_settled",
  "settled",
  "disputed",
  "written_off",
  "reversed"
]);
export const AR_COLLECTION_STAGES = Object.freeze(["none", "stage_1", "stage_2", "escalated", "hold", "closed"]);
export const AR_ALLOCATION_TYPES = Object.freeze(["payment", "credit_note", "prepayment", "writeoff_adjustment"]);
export const AR_ALLOCATION_STATUSES = Object.freeze(["proposed", "confirmed", "reversed"]);
export const AR_PAYMENT_MATCHING_RUN_STATUSES = Object.freeze(["received", "matched", "review_required", "completed", "failed"]);
export const AR_PAYMENT_MATCH_SOURCE_CHANNELS = Object.freeze(["bank_feed", "bank_file", "webhook", "manual"]);
export const AR_PAYMENT_MATCH_CANDIDATE_STATUSES = Object.freeze(["proposed", "confirmed", "rejected", "reversed"]);
export const AR_UNMATCHED_RECEIPT_STATUSES = Object.freeze(["unmatched", "partially_allocated", "allocated", "reversed"]);
export const AR_DUNNING_RUN_STATUSES = Object.freeze(["draft", "executed", "reversed", "cancelled"]);
export const AR_DUNNING_ITEM_ACTION_STATUSES = Object.freeze(["proposed", "booked", "skipped", "reversed"]);
export const AR_AGING_BUCKET_CODES = Object.freeze(["current", "1_30", "31_60", "61_90", "91_plus"]);
export const AR_INVOICE_SERIES_STATUSES = Object.freeze(["active", "paused", "archived"]);

const DEMO_COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const DEFAULT_BANK_ACCOUNT_NUMBER = "1110";
const DEFAULT_UNALLOCATED_RECEIPT_ACCOUNT_NUMBER = "2950";
const DEFAULT_CUSTOMER_PREPAYMENT_ACCOUNT_NUMBER = "2940";
const DEFAULT_SMALL_DIFFERENCE_ACCOUNT_NUMBER = "6900";
const DEFAULT_SMALL_DIFFERENCE_POLICY_LIMIT = 100;
const DEFAULT_REMINDER_FEE_AMOUNT = 60;
const DEFAULT_STATUTORY_INTEREST_PERCENT = 8;
const STATUTORY_REFERENCE_RATE_BASELINES = Object.freeze([
  Object.freeze({
    effectiveFrom: "2026-01-01",
    referenceRatePercent: 2
  })
]);
const AR_INVOICE_ISSUE_READY_STATUSES = new Set(["draft", "validated", "approved"]);
const AR_INVOICE_ALREADY_ISSUED_STATUSES = new Set([
  "issued",
  "delivered",
  "delivery_failed",
  "partially_paid",
  "paid",
  "overdue",
  "disputed",
  "credited",
  "written_off"
]);
const DEFAULT_INVOICE_SERIES_DEFINITIONS = Object.freeze([
  Object.freeze({
    seriesCode: "B",
    description: "Customer invoice numbering",
    prefix: "INV-",
    nextNumber: 1,
    status: "active",
    invoiceTypeCodes: Object.freeze(["standard", "partial", "subscription"]),
    voucherSeriesPurposeCode: "AR_INVOICE",
    importedSequencePreservationEnabled: true
  }),
  Object.freeze({
    seriesCode: "C",
    description: "Customer credit note numbering",
    prefix: "CRN-",
    nextNumber: 1,
    status: "active",
    invoiceTypeCodes: Object.freeze(["credit_note"]),
    voucherSeriesPurposeCode: "AR_CREDIT_NOTE",
    importedSequencePreservationEnabled: true
  })
]);
const EU_COUNTRY_CODES = new Set([
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "EL",
  "ES",
  "FI",
  "FR",
  "HR",
  "HU",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK"
]);

export function createArPlatform(options = {}) {
  return createArEngine(options);
}

export function createArEngine({
  clock = () => new Date(),
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null,
  accountingMethodPlatform = null,
  vatPlatform = createVatPlatform({ clock, seedDemo: true }),
  ledgerPlatform = null,
  integrationPlatform = null,
  orgAuthPlatform = null,
  companyProfilesById = null
} = {}) {
  void accountingMethodPlatform;
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
    invoices: new Map(),
    invoiceSeries: new Map(),
    invoiceSeriesIdsByCompanyCode: new Map(),
    invoiceIdsByCompany: new Map(),
    invoiceIdsByCompanyNo: new Map(),
    invoiceIdsByCompanyGenerationKey: new Map(),
    paymentLinks: new Map(),
    paymentLinkIdsByInvoice: new Map(),
    openItems: new Map(),
    openItemIdsByCompany: new Map(),
    openItemIdByInvoice: new Map(),
    openItemEvents: [],
    paymentMatchingRuns: new Map(),
    paymentMatchingRunIdsByCompany: new Map(),
    paymentMatchingRunIdsByKey: new Map(),
    paymentMatchCandidates: new Map(),
    paymentMatchCandidateIdsByRun: new Map(),
    allocations: new Map(),
    allocationIdsByCompany: new Map(),
    allocationIdsByOpenItem: new Map(),
    allocationIdsByKey: new Map(),
    unmatchedBankReceipts: new Map(),
    unmatchedReceiptIdsByCompany: new Map(),
    unmatchedReceiptIdsByKey: new Map(),
    dunningRuns: new Map(),
    dunningRunIdsByCompany: new Map(),
    dunningRunIdsByKey: new Map(),
    writeoffs: new Map(),
    writeoffIdsByCompany: new Map(),
    agingSnapshots: new Map(),
    agingSnapshotIdsByCompany: new Map(),
    agingSnapshotIdsByKey: new Map(),
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
    invoiceTypes: AR_INVOICE_TYPES,
    invoiceStatuses: AR_INVOICE_STATUSES,
    invoiceFrequencies: AR_INVOICE_FREQUENCIES,
    openItemStatuses: AR_OPEN_ITEM_STATUSES,
    collectionStages: AR_COLLECTION_STAGES,
    allocationTypes: AR_ALLOCATION_TYPES,
    allocationStatuses: AR_ALLOCATION_STATUSES,
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
    listInvoiceSeries,
    upsertInvoiceSeries,
    reserveImportedInvoiceNumber,
    listInvoices,
    getInvoice,
    getInvoiceFieldEvaluation,
    createInvoice,
    issueInvoice,
    deliverInvoice,
    createInvoicePaymentLink,
    listOpenItems,
    getOpenItem,
    updateOpenItemCollectionState,
    createOpenItemAllocation,
    reverseOpenItemAllocation,
    listPaymentMatchingRuns,
    getPaymentMatchingRun,
    createPaymentMatchingRun,
    listDunningRuns,
    getDunningRun,
    createDunningRun,
    createWriteoff,
    listAgingSnapshots,
    captureAgingSnapshot,
    importCustomers,
    getCustomerImportBatch,
    snapshotAr,
    exportDurableState,
    importDurableState
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
    allowReminderFee = true,
    allowInterest = true,
    allowPartialDelivery = true,
    blockedForInvoicing = false,
    blockedForDelivery = false,
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

    const resolvedCountryCode = normalizeUpperCode(countryCode, "country_code_required", 2);
    const normalizedOrganizationNumber = normalizeCustomerOrganizationNumber(resolvedCountryCode, organizationNumber);
    validatePeppolFields({
      countryCode: resolvedCountryCode,
      peppolScheme,
      peppolIdentifier
    });

    const record = {
      customerId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      customerNo: resolvedCustomerNo,
      legalName: requireText(legalName, "customer_legal_name_required"),
      organizationNumber: normalizedOrganizationNumber,
      countryCode: resolvedCountryCode,
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
      allowReminderFee: allowReminderFee === true,
      allowInterest: allowInterest === true,
      allowPartialDelivery: allowPartialDelivery === true,
      blockedForInvoicing: blockedForInvoicing === true,
      blockedForDelivery: blockedForDelivery === true,
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
    costCenterCode = null,
    businessAreaCode = null,
    serviceLineCode = null,
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
      costCenterCode: normalizeOptionalText(costCenterCode),
      businessAreaCode: normalizeOptionalText(businessAreaCode),
      serviceLineCode: normalizeOptionalText(serviceLineCode),
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
    setQuoteLifecycleTimestamp(version, nextStatus, clock);
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

  function listInvoiceSeries({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    ensureDefaultInvoiceSeriesForCompany(state, resolvedCompanyId, clock);
    return [...state.invoiceSeries.values()]
      .filter((series) => series.companyId === resolvedCompanyId)
      .sort((left, right) => left.seriesCode.localeCompare(right.seriesCode))
      .map(copy);
  }

  function upsertInvoiceSeries({
    companyId,
    seriesCode,
    prefix = null,
    description = null,
    nextNumber = null,
    status = null,
    invoiceTypeCodes = null,
    voucherSeriesPurposeCode = null,
    importedSequencePreservationEnabled = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    ensureDefaultInvoiceSeriesForCompany(state, resolvedCompanyId, clock);
    const normalizedSeriesCode = normalizeInvoiceSeriesCode(seriesCode, "ar_invoice_series_code_required");
    const existing = findInvoiceSeriesRecord(state, resolvedCompanyId, normalizedSeriesCode);
    const resolvedStatus = normalizeInvoiceSeriesStatus(status ?? existing?.status ?? "active");
    const resolvedInvoiceTypeCodes = normalizeInvoiceSeriesTypeCodes(
      invoiceTypeCodes ?? existing?.invoiceTypeCodes ?? defaultInvoiceTypeCodes(normalizedSeriesCode)
    );
    const resolvedVoucherSeriesPurposeCode = normalizeInvoiceVoucherPurposeCode(
      voucherSeriesPurposeCode ?? existing?.voucherSeriesPurposeCode ?? defaultVoucherPurposeForInvoiceTypes(resolvedInvoiceTypeCodes)
    );

    ensureInvoiceSeriesTypeAvailability({
      state,
      companyId: resolvedCompanyId,
      invoiceTypeCodes: resolvedInvoiceTypeCodes,
      currentSeriesId: existing?.arInvoiceSeriesId || null,
      status: resolvedStatus
    });
    ensureLedgerPurposeAvailableForInvoiceSeries({
      ledgerPlatform,
      companyId: resolvedCompanyId,
      voucherSeriesPurposeCode: resolvedVoucherSeriesPurposeCode,
      status: resolvedStatus
    });

    const now = nowIso(clock);
    const record = existing || {
      arInvoiceSeriesId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      seriesCode: normalizedSeriesCode,
      createdAt: now
    };
    record.prefix = normalizeInvoiceSeriesPrefix(prefix ?? existing?.prefix ?? defaultInvoicePrefix(normalizedSeriesCode));
    record.description = normalizeInvoiceSeriesDescription(
      description ?? existing?.description ?? defaultInvoiceSeriesDescription(normalizedSeriesCode)
    );
    record.nextNumber = normalizePositiveInteger(nextNumber ?? existing?.nextNumber ?? 1, "ar_invoice_series_next_number_invalid");
    record.status = resolvedStatus;
    record.invoiceTypeCodes = resolvedInvoiceTypeCodes;
    record.voucherSeriesPurposeCode = resolvedVoucherSeriesPurposeCode;
    record.importedSequencePreservationEnabled =
      importedSequencePreservationEnabled == null
        ? existing?.importedSequencePreservationEnabled ?? true
        : Boolean(importedSequencePreservationEnabled);
    record.updatedAt = now;

    state.invoiceSeries.set(record.arInvoiceSeriesId, record);
    state.invoiceSeriesIdsByCompanyCode.set(toCompanyScopedKey(resolvedCompanyId, normalizedSeriesCode), record.arInvoiceSeriesId);

    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: existing ? "ar.invoice_series.updated" : "ar.invoice_series.created",
      entityType: "ar_invoice_series",
      entityId: record.arInvoiceSeriesId,
      explanation: `${existing ? "Updated" : "Created"} invoice series ${record.seriesCode}.`
    });

    return copy(record);
  }

  function reserveImportedInvoiceNumber({
    companyId,
    seriesCode,
    importedInvoiceSequenceNumber,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    ensureDefaultInvoiceSeriesForCompany(state, resolvedCompanyId, clock);
    const series = requireInvoiceSeriesRecord(state, resolvedCompanyId, seriesCode);
    const resolvedSequenceNumber = normalizePositiveInteger(
      importedInvoiceSequenceNumber,
      "ar_imported_invoice_sequence_number_invalid"
    );
    if (series.importedSequencePreservationEnabled !== true) {
      throw createError(
        409,
        "ar_invoice_series_import_preservation_disabled",
        `Invoice series ${series.seriesCode} does not allow imported sequence preservation.`
      );
    }

    const nextNumberAdjusted = series.nextNumber <= resolvedSequenceNumber;
    if (nextNumberAdjusted) {
      series.nextNumber = resolvedSequenceNumber + 1;
      series.updatedAt = nowIso(clock);
    }

    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "ar.invoice_series.imported_number_reserved",
      entityType: "ar_invoice_series",
      entityId: series.arInvoiceSeriesId,
      explanation: `Reserved imported invoice sequence ${resolvedSequenceNumber} in series ${series.seriesCode}.`
    });

    return {
      invoiceSeries: copy(series),
      nextNumberAdjusted
    };
  }

  function listInvoices({ companyId, customerId = null, status = null, projectId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedCustomerId = normalizeOptionalText(customerId);
    const resolvedStatus = status ? assertAllowed(status, AR_INVOICE_STATUSES, "customer_invoice_status_invalid") : null;
    const resolvedProjectId = normalizeOptionalText(projectId);
    return (state.invoiceIdsByCompany.get(resolvedCompanyId) || [])
      .map((invoiceId) => state.invoices.get(invoiceId))
      .filter(Boolean)
      .filter((invoice) => (resolvedCustomerId ? invoice.customerId === resolvedCustomerId : true))
      .filter((invoice) => (resolvedStatus ? invoice.status === resolvedStatus : true))
      .filter((invoice) => (resolvedProjectId ? (invoice.projectIds || []).includes(resolvedProjectId) : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function getInvoice({ companyId, customerInvoiceId } = {}) {
    return copy(requireInvoiceRecord(state, companyId, customerInvoiceId));
  }

  function getInvoiceFieldEvaluation({ companyId, customerInvoiceId } = {}) {
    const invoice = requireInvoiceRecord(state, companyId, customerInvoiceId);
    return copy(invoice.invoiceFieldEvaluation || null);
  }

  function createInvoice({
    companyId,
    customerId,
    sourceContractId = null,
    sourceQuoteId = null,
    originalInvoiceId = null,
    invoiceType = "standard",
    deliveryChannel = "pdf_email",
    issueDate,
    dueDate,
    currencyCode = null,
    exchangeRate = null,
    lines = null,
    supplyDate = null,
    deliveryDate = null,
    sellerLegalName = null,
    sellerOrganizationNumber = null,
    sellerVatNumber = null,
    sellerAddress = null,
    buyerReference = null,
    purchaseOrderReference = null,
    buyerVatNumber = null,
    buyerVatNumberStatus = null,
    specialLegalText = null,
    amendmentReason = null,
    exportEvidenceReference = null,
    currencyVatAmountSek = null,
    husCaseId = null,
    husPropertyDesignation = null,
    husBuyerIdentityNumber = null,
    husServiceTypeCode = null,
    recipientEmails = [],
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const customer = requireCustomerRecord(state, resolvedCompanyId, customerId);
    if (customer.customerStatus === "blocked" || customer.blockedForInvoicing === true) {
      throw createError(409, "invoice_validation_failed", "Blocked customers cannot be invoiced.");
    }
    const sourceQuote = sourceQuoteId ? requireQuoteRecord(state, resolvedCompanyId, sourceQuoteId) : null;
    const sourceQuoteVersion = sourceQuote ? requireCurrentQuoteVersion(sourceQuote) : null;
    const contract = sourceContractId ? requireContractRecord(state, resolvedCompanyId, sourceContractId) : null;
    if (contract && contract.status !== "active") {
      throw createError(409, "contract_not_active", "Only active contracts may create invoice proposals in FAS 5.2.");
    }
    if (contract && contract.customerId !== customer.customerId) {
      throw createError(409, "contract_customer_mismatch", "Invoice customer must match the source contract customer.");
    }
    if (sourceQuote && sourceQuote.customerId !== customer.customerId) {
      throw createError(409, "quote_customer_mismatch", "Invoice customer must match the source quote customer.");
    }
    if (sourceQuoteVersion && !["accepted", "converted"].includes(sourceQuoteVersion.status)) {
      throw createError(409, "quote_not_invoice_ready", "Only accepted or converted quote versions may create invoice drafts.");
    }
    if (contract && sourceQuote && contract.sourceQuoteId && contract.sourceQuoteId !== sourceQuote.quoteId) {
      throw createError(409, "contract_quote_mismatch", "Source quote must match the contract source quote when both are provided.");
    }
    const originalInvoice = originalInvoiceId ? requireInvoiceRecord(state, resolvedCompanyId, originalInvoiceId) : null;
    const resolvedInvoiceType = assertAllowed(invoiceType, AR_INVOICE_TYPES, "customer_invoice_type_invalid");
    if (resolvedInvoiceType === "credit_note" && !originalInvoice) {
      throw createError(409, "credit_link_missing", "Credit invoices require a valid original invoice.");
    }
    if (resolvedInvoiceType === "subscription" && !contract) {
      throw createError(409, "subscription_contract_required", "Subscription invoices require an active contract.");
    }
    if (resolvedInvoiceType === "partial" && customer.allowPartialDelivery === false) {
      throw createError(409, "partial_delivery_not_allowed", "Customer does not allow partial delivery invoicing.");
    }
    const resolvedIssueDate = normalizeDate(issueDate, "invoice_issue_date_invalid");
    const resolvedDueDate = normalizeDate(dueDate, "invoice_due_date_invalid");
    assertDateRange(resolvedIssueDate, resolvedDueDate, "invoice_due_date_invalid");
    const resolvedBuyerVatNumber = normalizeOptionalVatNumber(buyerVatNumber, "invoice_buyer_vat_number_invalid", {
      errorFactory: createError,
      countryCode: customer.countryCode
    });
    const resolvedBuyerVatNumberStatus = normalizeOptionalVatNumberStatus(
      buyerVatNumberStatus ?? originalInvoice?.buyerVatNumberStatus ?? null
    );
    const resolvedCurrencyCode = normalizeUpperCode(
      currencyCode || contract?.currencyCode || sourceQuoteVersion?.currencyCode || customer.currencyCode,
      "currency_code_required",
      3
    );
    const resolvedSupplyDate = normalizeDate(supplyDate || resolvedIssueDate, "invoice_supply_date_invalid");
    const resolvedDeliveryDate = deliveryDate ? normalizeDate(deliveryDate, "invoice_delivery_date_invalid") : null;
    const invoiceLines = normalizeCommercialLines({
      state,
      vatPlatform,
      companyId: resolvedCompanyId,
      currencyCode: resolvedCurrencyCode,
      referenceDate: resolvedIssueDate,
      priceListId: null,
      lines: lines || contract?.lines || sourceQuoteVersion?.lines
    });
    if (invoiceLines.length === 0) {
      throw createError(400, "invoice_lines_required", "Invoices require at least one line.");
    }
    assertProjectBoundLinesLinked(invoiceLines);
    if (sourceQuoteVersion && !contract) {
      assertQuoteVersionCompatibleWithInvoice({
        sourceQuoteVersion,
        invoiceCurrencyCode: resolvedCurrencyCode,
        invoiceLines
      });
    }
    const projectLinkSummary = summarizeInvoiceProjectLinks(invoiceLines);
    const sellerSnapshot = resolveInvoiceSellerSnapshot({
      companyId: resolvedCompanyId,
      sellerLegalName,
      sellerOrganizationNumber,
      sellerVatNumber,
      sellerAddress,
      orgAuthPlatform,
      companyProfilesById
    });
    const totals = calculateInvoiceTotals({
      vatPlatform,
      companyId: resolvedCompanyId,
      lines: invoiceLines
    });
    if (resolvedInvoiceType === "credit_note" && totals.grossAmount > originalInvoice.remainingAmount) {
      throw createError(409, "credit_amount_exceeds_original", "Credit note exceeds the remaining creditable amount.");
    }
    const sourceDescriptor = resolveInvoiceSourceDescriptor({
      customer,
      contract,
      sourceQuote,
      sourceQuoteVersion,
      originalInvoice,
      invoiceType: resolvedInvoiceType,
      issueDate: resolvedIssueDate
    });
    const invoiceGenerationKey = hashObject({
      companyId: resolvedCompanyId,
      sourceType: sourceDescriptor.sourceType,
      sourceId: sourceDescriptor.sourceId,
      sourceVersion: sourceDescriptor.sourceVersion,
      customerId: customer.customerId,
      invoiceType: resolvedInvoiceType,
      issueDate: resolvedIssueDate,
      dueDate: resolvedDueDate,
      currencyCode: resolvedCurrencyCode,
      exchangeRate: normalizeOptionalPositiveNumber(exchangeRate, "invoice_exchange_rate_invalid"),
      supplyDate: resolvedSupplyDate,
      deliveryDate: resolvedDeliveryDate,
      sellerSnapshot,
      deliveryChannel,
      buyerReference: normalizeOptionalText(buyerReference),
      purchaseOrderReference: normalizeOptionalText(purchaseOrderReference),
      buyerVatNumber: resolvedBuyerVatNumber,
      buyerVatNumberStatus: resolvedBuyerVatNumberStatus,
      specialLegalText: normalizeOptionalText(specialLegalText),
      amendmentReason: normalizeOptionalText(amendmentReason),
      exportEvidenceReference: normalizeOptionalText(exportEvidenceReference),
      currencyVatAmountSek: normalizeOptionalMoney(currencyVatAmountSek, "invoice_currency_vat_amount_sek_invalid"),
      husCaseId: normalizeOptionalText(husCaseId),
      husPropertyDesignation: normalizeOptionalText(husPropertyDesignation),
      husBuyerIdentityNumber: normalizeOptionalText(husBuyerIdentityNumber),
      husServiceTypeCode: normalizeOptionalText(husServiceTypeCode),
      lines: invoiceLines
    });
    const existingInvoiceId = state.invoiceIdsByCompanyGenerationKey.get(toCompanyScopedKey(resolvedCompanyId, invoiceGenerationKey));
    if (existingInvoiceId) {
      const existingInvoice = state.invoices.get(existingInvoiceId);
      if (existingInvoice) {
        return copy(existingInvoice);
      }
    }
    const record = {
      customerInvoiceId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      customerId: customer.customerId,
      sourceContractId: contract?.contractId || null,
      sourceQuoteId: normalizeOptionalText(sourceQuoteId),
      sourceQuoteVersionId: sourceQuoteVersion?.quoteVersionId || contract?.sourceQuoteVersionId || null,
      originalInvoiceId: originalInvoice?.customerInvoiceId || null,
      sourceType: sourceDescriptor.sourceType,
      sourceId: sourceDescriptor.sourceId,
      sourceVersion: sourceDescriptor.sourceVersion,
      projectIds: projectLinkSummary.projectIds,
      primaryProjectId: projectLinkSummary.primaryProjectId,
      projectLinkStatus: projectLinkSummary.projectLinkStatus,
      invoiceType: resolvedInvoiceType,
      status: "draft",
      deliveryChannel: requireText(deliveryChannel, "invoice_delivery_channel_required"),
      invoiceNumber: null,
      invoiceSeriesCode: null,
      invoiceSequenceNumber: null,
      issueIdempotencyKey: null,
      issueDate: resolvedIssueDate,
      dueDate: resolvedDueDate,
      currencyCode: resolvedCurrencyCode,
      exchangeRate: normalizeOptionalPositiveNumber(exchangeRate, "invoice_exchange_rate_invalid"),
      lines: invoiceLines,
      totals,
      supplyDate: resolvedSupplyDate,
      deliveryDate: resolvedDeliveryDate,
      sellerLegalName: sellerSnapshot.legalName,
      sellerOrganizationNumber: sellerSnapshot.organizationNumber,
      sellerVatNumber: sellerSnapshot.vatNumber,
      sellerAddress: sellerSnapshot.address,
      buyerReference: normalizeOptionalText(buyerReference),
      purchaseOrderReference: normalizeOptionalText(purchaseOrderReference),
      buyerVatNumber: resolvedBuyerVatNumber,
      buyerVatNumberStatus: resolvedBuyerVatNumberStatus,
      specialLegalText: normalizeOptionalText(specialLegalText),
      amendmentReason: normalizeOptionalText(amendmentReason),
      exportEvidenceReference: normalizeOptionalText(exportEvidenceReference),
      currencyVatAmountSek: normalizeOptionalMoney(currencyVatAmountSek, "invoice_currency_vat_amount_sek_invalid"),
      husCaseId: normalizeOptionalText(husCaseId),
      husPropertyDesignation: normalizeOptionalText(husPropertyDesignation),
      husBuyerIdentityNumber: normalizeOptionalText(husBuyerIdentityNumber),
      husServiceTypeCode: normalizeOptionalText(husServiceTypeCode),
      invoiceFieldEvaluation: null,
      recipientEmails: uniqueTexts(recipientEmails),
      journalEntryId: null,
      issuedAt: null,
      validatedAt: null,
      approvedAt: null,
      deliveredAt: null,
      deliveries: [],
      paymentLinks: [],
      creditedAmount: 0,
      remainingAmount: totals.grossAmount,
      paymentReference: null,
      invoiceGenerationKey,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    record.invoiceFieldEvaluation = evaluateInvoiceFieldRulesSnapshot({
      state,
      clock,
      vatPlatform,
      ledgerPlatform,
      invoice: record,
      customer,
      originalInvoice,
      actorId
    });
    state.invoices.set(record.customerInvoiceId, record);
    ensureCollection(state.invoiceIdsByCompany, resolvedCompanyId).push(record.customerInvoiceId);
    state.invoiceIdsByCompanyGenerationKey.set(toCompanyScopedKey(resolvedCompanyId, invoiceGenerationKey), record.customerInvoiceId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "ar.invoice.created",
      entityType: "ar_invoice",
      entityId: record.customerInvoiceId,
      explanation: `Created ${resolvedInvoiceType} invoice draft for customer ${customer.customerNo}.`
    });
    return copy(record);
  }

  function issueInvoice({ companyId, customerInvoiceId, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const invoice = requireInvoiceRecord(state, companyId, customerInvoiceId);
    if (AR_INVOICE_ALREADY_ISSUED_STATUSES.has(invoice.status)) {
      if (!invoice.journalEntryId) {
        throw createError(409, "invoice_issue_state_invalid", "Issued invoice is missing its ledger posting.");
      }
      if (invoice.invoiceType !== "credit_note") {
        ensureOpenItemForInvoice({
          state,
          clock,
          ledgerPlatform,
          invoice,
          customer: requireCustomerRecord(state, invoice.companyId, invoice.customerId)
        });
      }
      return copy(invoice);
    }
    if (!AR_INVOICE_ISSUE_READY_STATUSES.has(invoice.status)) {
      throw createError(409, "invoice_issue_illegal_state", `Invoice cannot be issued from status ${invoice.status}.`);
    }
    if (invoice.journalEntryId) {
      throw createError(409, "invoice_issue_state_invalid", "Draft invoice carries a journal entry even though it is not issued.");
    }
    if (!ledgerPlatform || typeof ledgerPlatform.applyPostingIntent !== "function") {
      throw createError(500, "ledger_platform_missing", "Ledger platform is required to issue invoices.");
    }
    const customer = requireCustomerRecord(state, invoice.companyId, invoice.customerId);
    if (customer.customerStatus === "blocked" || customer.blockedForInvoicing === true) {
      throw createError(409, "invoice_validation_failed", "Blocked customers cannot be invoiced.");
    }
    const originalInvoice = invoice.originalInvoiceId
      ? requireInvoiceRecord(state, invoice.companyId, invoice.originalInvoiceId)
      : null;
    const fieldEvaluation = evaluateInvoiceFieldRulesSnapshot({
      state,
      clock,
      vatPlatform,
      ledgerPlatform,
      invoice,
      customer,
      originalInvoice,
      actorId
    });
    invoice.invoiceFieldEvaluation = fieldEvaluation;
    if (fieldEvaluation.status !== "passed") {
      throw createError(
        409,
        "invoice_issue_blocked",
        `Invoice cannot be issued before legal field blockers are resolved: ${(fieldEvaluation.missingFieldCodes || []).join(", ")}`
      );
    }
    ensureDefaultInvoiceSeriesForCompany(state, invoice.companyId, clock);
    invoice.validatedAt = invoice.validatedAt || nowIso(clock);
    invoice.approvedAt = invoice.approvedAt || nowIso(clock);
    const series = resolveConfiguredInvoiceSeries(state, invoice.companyId, invoice.invoiceType, invoice.invoiceSeriesCode || null, clock);
    if (!invoice.invoiceNumber) {
      const sequenceNumber = nextInvoiceSeriesNumber(series, clock);
      invoice.invoiceSeriesCode = series.seriesCode;
      invoice.invoiceSequenceNumber = sequenceNumber;
      invoice.invoiceNumber = `${series.prefix}${String(sequenceNumber).padStart(5, "0")}`;
      state.invoiceIdsByCompanyNo.set(toCompanyScopedKey(invoice.companyId, invoice.invoiceNumber), invoice.customerInvoiceId);
    } else if (invoice.invoiceSequenceNumber) {
      reserveImportedInvoiceNumber({
        companyId: invoice.companyId,
        seriesCode: invoice.invoiceSeriesCode || series.seriesCode,
        importedInvoiceSequenceNumber: invoice.invoiceSequenceNumber,
        actorId,
        correlationId
      });
    }
    invoice.invoiceSeriesCode = invoice.invoiceSeriesCode || series.seriesCode;
    invoice.issueIdempotencyKey = invoice.issueIdempotencyKey || `invoice.issue:${invoice.invoiceGenerationKey}`;
    invoice.paymentReference = normalizeRequiredOcrReference(
      invoice.paymentReference || buildInvoiceOcrReference(invoice.invoiceSequenceNumber || 0),
      "invoice_payment_reference_invalid",
      {
        errorFactory: createError,
        controlMode: "mod10"
      }
    );
    evaluateInvoiceVatDecisions({
      vatPlatform,
      companyId: invoice.companyId,
      invoice,
      customer,
      originalInvoice,
      actorId,
      correlationId
    });
    const journalLines = buildInvoiceJournalLines({
      invoice,
      customer,
      ledgerPlatform
    });
    const posted = ledgerPlatform.applyPostingIntent({
      companyId: invoice.companyId,
      journalDate: invoice.issueDate,
      recipeCode: invoice.invoiceType === "credit_note" ? "AR_CREDIT_NOTE" : "AR_INVOICE",
      voucherSeriesPurposeCode: series.voucherSeriesPurposeCode,
      fallbackVoucherSeriesCode: series.seriesCode,
      postingSignalCode: invoice.invoiceType === "credit_note" ? "ar.credit_note.issued" : "ar.invoice.issued",
      sourceType: resolveInvoiceSourceType(invoice.invoiceType),
      sourceId: invoice.customerInvoiceId,
      sourceObjectVersion: invoice.invoiceGenerationKey || invoice.issueIdempotencyKey,
      actorId,
      idempotencyKey: invoice.issueIdempotencyKey,
      description: `${invoice.invoiceType} ${invoice.invoiceNumber}`,
      lines: journalLines
    });
    if (vatPlatform && typeof vatPlatform.recordVatDecisionPosting === "function") {
      vatPlatform.recordVatDecisionPosting({
        companyId: invoice.companyId,
        vatDecisionIds: [...new Set(invoice.lines.map((line) => line.vatDecisionId).filter(Boolean))],
        journalEntryId: posted.journalEntry.journalEntryId,
        actorId,
        correlationId
      });
    }

    invoice.status = "issued";
    invoice.journalEntryId = posted.journalEntry.journalEntryId;
    invoice.issuedAt = nowIso(clock);
    invoice.updatedAt = nowIso(clock);

    if (invoice.invoiceType !== "credit_note") {
      ensureOpenItemForInvoice({
        state,
        clock,
        ledgerPlatform,
        invoice,
        customer,
        actorId,
        correlationId
      });
    }

    if (invoice.invoiceType === "credit_note" && invoice.originalInvoiceId) {
      originalInvoice.creditedAmount = roundMoney(originalInvoice.creditedAmount + invoice.totals.grossAmount);
      originalInvoice.remainingAmount = roundMoney(Math.max(0, originalInvoice.remainingAmount - invoice.totals.grossAmount));
      if (originalInvoice.remainingAmount === 0) {
        originalInvoice.status = "credited";
      }
      originalInvoice.updatedAt = nowIso(clock);
      applyCreditToOpenItem({
        state,
        clock,
        originalInvoice,
        creditInvoice: invoice,
        actorId,
        correlationId
      });
    }

    pushAudit(state, clock, {
      companyId: invoice.companyId,
      actorId,
      correlationId,
      action: "ar.invoice.issued",
      entityType: "ar_invoice",
      entityId: invoice.customerInvoiceId,
      explanation: `Issued invoice ${invoice.invoiceNumber} and posted journal ${invoice.journalEntryId}.`
    });
    return copy(invoice);
  }

  function deliverInvoice({
    companyId,
    customerInvoiceId,
    deliveryChannel = null,
    recipientEmails = null,
    buyerReference = null,
    purchaseOrderReference = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const invoice = requireInvoiceRecord(state, companyId, customerInvoiceId);
    if (!invoice.journalEntryId) {
      throw createError(409, "invoice_not_issued", "Invoices must be issued before delivery.");
    }
    if (!integrationPlatform || typeof integrationPlatform.prepareInvoiceDelivery !== "function") {
      throw createError(500, "integration_platform_missing", "Integration platform is required for invoice delivery.");
    }
    const customer = requireCustomerRecord(state, invoice.companyId, invoice.customerId);
    if (customer.blockedForDelivery === true) {
      throw createError(409, "delivery_failed", "Customer is blocked for delivery.");
    }
    const contactEmails =
      recipientEmails && recipientEmails.length > 0
        ? recipientEmails
        : (state.contactIdsByCustomer.get(customer.customerId) || [])
            .map((contactId) => state.contacts.get(contactId))
            .filter((contact) => contact?.defaultBilling || contact?.roleCode === "billing")
            .map((contact) => contact.email);
    let preparedDelivery;
    try {
      preparedDelivery = integrationPlatform.prepareInvoiceDelivery({
        companyId: invoice.companyId,
        invoice,
        customer,
        deliveryChannel: deliveryChannel || invoice.deliveryChannel,
        recipientEmails: contactEmails,
        buyerReference: buyerReference || invoice.buyerReference,
        purchaseOrderReference: purchaseOrderReference || invoice.purchaseOrderReference
      });
    } catch (error) {
      invoice.status = "delivery_failed";
      invoice.updatedAt = nowIso(clock);
      pushAudit(state, clock, {
        companyId: invoice.companyId,
        actorId,
        correlationId,
        action: "ar.invoice.delivery_failed",
        entityType: "ar_invoice",
        entityId: invoice.customerInvoiceId,
        explanation: `Delivery validation failed for invoice ${invoice.invoiceNumber}: ${error.code || "delivery_failed"}.`
      });
      throw error;
    }
    invoice.deliveries.push(preparedDelivery);
    invoice.status = "delivered";
    invoice.deliveredAt = nowIso(clock);
    invoice.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: invoice.companyId,
      actorId,
      correlationId,
      action: "ar.invoice.delivered",
      entityType: "ar_invoice",
      entityId: invoice.customerInvoiceId,
      explanation: `Prepared ${preparedDelivery.channel} delivery for invoice ${invoice.invoiceNumber}.`
    });
    return copy(preparedDelivery);
  }

  function createInvoicePaymentLink({
    companyId,
    customerInvoiceId,
    amount = null,
    expiresAt = null,
    providerCode,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const invoice = requireInvoiceRecord(state, companyId, customerInvoiceId);
    if (!integrationPlatform || typeof integrationPlatform.createPaymentLink !== "function") {
      throw createError(500, "integration_platform_missing", "Integration platform is required for payment links.");
    }
    if (!invoice.journalEntryId) {
      throw createError(409, "invoice_not_issued", "Payment links require an issued invoice.");
    }
    if (invoice.invoiceType === "credit_note") {
      throw createError(409, "payment_link_not_allowed_for_credit_note", "Credit notes may not expose payment links.");
    }
    const paymentLink = integrationPlatform.createPaymentLink({
      companyId: invoice.companyId,
      invoiceId: invoice.customerInvoiceId,
      amount: amount ?? invoice.remainingAmount,
      currencyCode: invoice.currencyCode,
      providerCode,
      expiresAt
    });
    state.paymentLinks.set(paymentLink.paymentLinkId, paymentLink);
    ensureCollection(state.paymentLinkIdsByInvoice, invoice.customerInvoiceId).push(paymentLink.paymentLinkId);
    invoice.paymentLinks.push(paymentLink);
    invoice.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: invoice.companyId,
      actorId,
      correlationId,
      action: "ar.invoice.payment_link_created",
      entityType: "ar_invoice",
      entityId: invoice.customerInvoiceId,
      explanation: `Created payment link ${paymentLink.paymentLinkId} for invoice ${invoice.invoiceNumber}.`
    });
    return copy(paymentLink);
  }

  function listOpenItems({ companyId, customerId = null, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = status ? assertAllowed(status, AR_OPEN_ITEM_STATUSES, "ar_open_item_status_invalid") : null;
    const resolvedCustomerId = normalizeOptionalText(customerId);
    return (state.openItemIdsByCompany.get(resolvedCompanyId) || [])
      .map((arOpenItemId) => state.openItems.get(arOpenItemId))
      .filter(Boolean)
      .filter((openItem) => (resolvedCustomerId ? openItem.customerId === resolvedCustomerId : true))
      .filter((openItem) => (resolvedStatus ? openItem.status === resolvedStatus : true))
      .sort((left, right) => `${left.dueOn || ""}${left.arOpenItemId}`.localeCompare(`${right.dueOn || ""}${right.arOpenItemId}`))
      .map(copy);
  }

  function getOpenItem({ companyId, arOpenItemId } = {}) {
    return copy(requireOpenItemRecord(state, companyId, arOpenItemId));
  }

  function updateOpenItemCollectionState({
    companyId,
    arOpenItemId,
    collectionStageCode = null,
    disputeFlag = null,
    dunningHoldFlag = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const openItem = requireOpenItemRecord(state, companyId, arOpenItemId);
    if (disputeFlag != null) {
      openItem.disputeFlag = disputeFlag === true;
    }
    if (dunningHoldFlag != null) {
      openItem.dunningHoldFlag = dunningHoldFlag === true;
    }
    if (collectionStageCode) {
      openItem.collectionStageCode = assertAllowed(
        collectionStageCode,
        AR_COLLECTION_STAGES,
        "ar_collection_stage_invalid"
      );
    }
    if (openItem.disputeFlag || openItem.dunningHoldFlag) {
      openItem.collectionStageCode = "hold";
    } else if (openItem.openAmount === 0) {
      openItem.collectionStageCode = "closed";
    }
    openItem.status = resolveOpenItemStatus(openItem);
    refreshOpenItemAging(openItem, nowIso(clock).slice(0, 10));
    touchOpenItem(openItem);
    syncInvoiceFromOpenItem(state, clock, openItem);
    pushAudit(state, clock, {
      companyId: openItem.companyId,
      actorId,
      correlationId,
      action: "ar.open_item.collection_state_updated",
      entityType: "ar_open_item",
      entityId: openItem.arOpenItemId,
      explanation: `Updated collection state for open item ${openItem.arOpenItemId}.`
    });
    return copy(openItem);
  }

  function createOpenItemAllocation({
    companyId,
    arOpenItemId,
    allocationAmount,
    allocatedOn,
    allocationType = "payment",
    sourceChannel = "manual",
    bankTransactionUid = null,
    statementLineHash = null,
    externalEventRef = null,
    arPaymentMatchingRunId = null,
    unmatchedBankReceiptId = null,
    receiptAmount = null,
    currencyCode = null,
    settlementExchangeRate = null,
    functionalReceiptAmount = null,
    reasonCode = "manual_allocation",
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const openItem = requireOpenItemRecord(state, companyId, arOpenItemId);
    if (!ledgerPlatform || typeof ledgerPlatform.applyPostingIntent !== "function") {
      throw createError(500, "ledger_platform_missing", "Ledger platform is required for AR allocations.");
    }
    const resolvedAllocationType = assertAllowed(allocationType, AR_ALLOCATION_TYPES, "ar_allocation_type_invalid");
    const resolvedSourceChannel = assertAllowed(
      sourceChannel,
      [...AR_PAYMENT_MATCH_SOURCE_CHANNELS, "system"],
      "ar_payment_source_channel_invalid"
    );
    const resolvedAllocatedOn = normalizeDate(allocatedOn || nowIso(clock).slice(0, 10), "ar_allocation_date_invalid");
    const resolvedCurrencyCode = normalizeUpperCode(currencyCode || openItem.currencyCode, "currency_code_required", 3);
    const resolvedAllocatedAmount = normalizePositiveNumber(allocationAmount, "ar_allocation_amount_invalid");
    if (resolvedAllocatedAmount > openItem.openAmount) {
      throw createError(409, "allocation_exceeds_open_amount", "Allocation amount exceeds the remaining open amount.");
    }

    const unmatchedReceipt = unmatchedBankReceiptId
      ? requireUnmatchedReceiptRecord(state, openItem.companyId, unmatchedBankReceiptId)
      : null;
    if (unmatchedReceipt && resolvedAllocatedAmount > unmatchedReceipt.remainingAmount) {
      throw createError(409, "allocation_exceeds_unmatched_receipt", "Allocation exceeds the unmatched receipt remainder.");
    }

    const allocationKeySource =
      normalizeOptionalText(externalEventRef) ||
      `${normalizeOptionalText(bankTransactionUid) || "manual"}:${openItem.arOpenItemId}:${resolvedAllocatedOn}:${resolvedAllocatedAmount}`;
    const scopedAllocationKey = toCompanyScopedKey(openItem.companyId, allocationKeySource);
    const existingAllocationId = state.allocationIdsByKey.get(scopedAllocationKey);
    if (existingAllocationId) {
      return copy(state.allocations.get(existingAllocationId));
    }

    const resolvedReceiptAmount = normalizePositiveNumber(
      receiptAmount ?? (unmatchedReceipt ? resolvedAllocatedAmount : resolvedAllocatedAmount),
      "ar_receipt_amount_invalid"
    );
    const suspenseAmount = unmatchedReceipt ? 0 : roundMoney(Math.max(0, resolvedReceiptAmount - resolvedAllocatedAmount));
    const resolvedFunctionalAllocatedAmount = resolveFunctionalAmount({ amount: resolvedAllocatedAmount, openItem });
    const functionalReceiptAmounts = resolveAllocationFunctionalReceiptAmounts({
      openItem,
      receiptAmount: resolvedReceiptAmount,
      allocatedAmount: resolvedAllocatedAmount,
      suspenseAmount,
      currencyCode: resolvedCurrencyCode,
      unmatchedReceipt,
      settlementExchangeRate,
      functionalReceiptAmount
    });
    const resolvedFunctionalReceiptAmount = functionalReceiptAmounts.totalFunctionalReceiptAmount;
    const resolvedFunctionalSettledAmount = functionalReceiptAmounts.allocatedFunctionalReceiptAmount;
    const matchingRun = arPaymentMatchingRunId
      ? requirePaymentMatchingRunRecord(state, openItem.companyId, arPaymentMatchingRunId)
      : null;
    const allocation = {
      arAllocationId: crypto.randomUUID(),
      companyId: openItem.companyId,
      arOpenItemId: openItem.arOpenItemId,
      customerInvoiceId: openItem.customerInvoiceId,
      allocationType: resolvedAllocationType,
      sourceChannel: resolvedSourceChannel,
      status: "confirmed",
      allocatedAmount: resolvedAllocatedAmount,
      currencyCode: resolvedCurrencyCode,
      functionalAmount: resolvedFunctionalAllocatedAmount,
      functionalReceiptAmount: resolvedFunctionalReceiptAmount,
      functionalSettledAmount: resolvedFunctionalSettledAmount,
      realizedFxAmount: roundMoney(resolvedFunctionalSettledAmount - resolvedFunctionalAllocatedAmount),
      settlementExchangeRate: resolveOptionalSettlementExchangeRate({
        openItem,
        currencyCode: resolvedCurrencyCode,
        settlementExchangeRate,
        functionalReceiptAmount: resolvedFunctionalReceiptAmount,
        receiptAmount: resolvedReceiptAmount
      }),
      allocatedOn: resolvedAllocatedOn,
      bankTransactionUid: normalizeOptionalText(bankTransactionUid) || unmatchedReceipt?.bankTransactionUid || null,
      statementLineHash:
        normalizeOptionalText(statementLineHash) ||
        unmatchedReceipt?.statementLineHash ||
        buildStatementLineHash({
          bankTransactionUid,
          amount: resolvedReceiptAmount,
          currencyCode: resolvedCurrencyCode,
          valueDate: resolvedAllocatedOn
        }),
      externalEventRef: normalizeOptionalText(externalEventRef) || allocationKeySource,
      arPaymentMatchingRunId: matchingRun?.arPaymentMatchingRunId || null,
      reversalOfAllocationId: null,
      reasonCode: requireText(reasonCode, "ar_allocation_reason_required"),
      unmatchedBankReceiptId: unmatchedReceipt?.arUnmatchedBankReceiptId || null,
      suspenseAmount,
      journalEntryId: null,
      reversalJournalEntryId: null,
      metadataJson: {},
      createdByActorId: actorId,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };

    const journal = postArJournal({
      ledgerPlatform,
      companyId: openItem.companyId,
      journalDate: resolvedAllocatedOn,
      recipeCode: "AR_PAYMENT_ALLOCATION",
      postingSignalCode: "ar.payment.allocated",
      voucherSeriesPurposeCode: "AR_PAYMENT",
      fallbackVoucherSeriesCode: "D",
      sourceType: "AR_PAYMENT",
      sourceId: allocation.arAllocationId,
      sourceObjectVersion: hashObject({
        arOpenItemId: openItem.arOpenItemId,
        allocationType: resolvedAllocationType,
        allocatedOn: resolvedAllocatedOn,
        allocatedAmount: allocation.allocatedAmount,
        externalEventRef: allocation.externalEventRef
      }),
      actorId,
      idempotencyKey: `ar_allocation:${allocation.externalEventRef}:${resolvedAllocationType}`,
      description: `AR allocation ${allocation.arAllocationId}`,
      lines: buildAllocationJournalLines({
        openItem,
        allocation,
        receiptAmount: resolvedReceiptAmount,
        unmatchedReceipt
      })
    });
    allocation.journalEntryId = journal.journalEntryId;

    state.allocations.set(allocation.arAllocationId, allocation);
    ensureCollection(state.allocationIdsByCompany, openItem.companyId).push(allocation.arAllocationId);
    ensureCollection(state.allocationIdsByOpenItem, openItem.arOpenItemId).push(allocation.arAllocationId);
    state.allocationIdsByKey.set(scopedAllocationKey, allocation.arAllocationId);

    applyAllocationToOpenItem({
      state,
      clock,
      openItem,
      allocation,
      actorId
    });

    if (unmatchedReceipt) {
      unmatchedReceipt.remainingAmount = roundMoney(unmatchedReceipt.remainingAmount - resolvedAllocatedAmount);
      unmatchedReceipt.status = resolveUnmatchedReceiptStatus(unmatchedReceipt);
      unmatchedReceipt.linkedArAllocationId = allocation.arAllocationId;
      unmatchedReceipt.updatedAt = nowIso(clock);
    } else if (suspenseAmount > 0) {
      createOrReuseUnmatchedReceipt({
        state,
        clock,
        companyId: openItem.companyId,
        bankTransactionUid: allocation.bankTransactionUid || `bank:${allocation.arAllocationId}`,
        statementLineHash: allocation.statementLineHash,
        valueDate: resolvedAllocatedOn,
        amount: suspenseAmount,
        currencyCode: resolvedCurrencyCode,
        payerReference: null,
        customerHint: null,
        linkedArAllocationId: allocation.arAllocationId,
        actorId,
        payloadJson: {
          reasonCode: "overpayment_remainder",
          allocationId: allocation.arAllocationId
        }
      });
    }

    pushAudit(state, clock, {
      companyId: allocation.companyId,
      actorId,
      correlationId,
      action: "ar.allocation.confirmed",
      entityType: "ar_allocation",
      entityId: allocation.arAllocationId,
      explanation: `Confirmed allocation ${allocation.arAllocationId} for open item ${openItem.arOpenItemId}.`
    });
    return copy(allocation);
  }

  function reverseOpenItemAllocation({
    companyId,
    arAllocationId,
    reversedOn = null,
    reasonCode,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const allocation = requireAllocationRecord(state, companyId, arAllocationId);
    if (allocation.status === "reversed") {
      return copy(allocation);
    }
    if (!ledgerPlatform || typeof ledgerPlatform.applyPostingIntent !== "function") {
      throw createError(500, "ledger_platform_missing", "Ledger platform is required to reverse AR allocations.");
    }
      const openItem = requireOpenItemRecord(state, allocation.companyId, allocation.arOpenItemId);
      const resolvedReversedOn = normalizeDate(reversedOn || nowIso(clock).slice(0, 10), "ar_allocation_reverse_date_invalid");
      const originalJournal = ledgerPlatform.getJournalEntry({
        companyId: allocation.companyId,
        journalEntryId: allocation.journalEntryId
      });
      const reversalJournal = postArJournal({
        ledgerPlatform,
        companyId: allocation.companyId,
      journalDate: resolvedReversedOn,
      recipeCode: "AR_PAYMENT_REVERSAL",
      postingSignalCode: "ar.payment.reversed",
      voucherSeriesPurposeCode: "AR_PAYMENT",
      fallbackVoucherSeriesCode: "D",
      sourceType: "AR_PAYMENT",
      sourceId: `reversal:${allocation.arAllocationId}`,
      sourceObjectVersion: hashObject({
        arAllocationId: allocation.arAllocationId,
        reversedOn: resolvedReversedOn,
        allocatedAmount: allocation.allocatedAmount
        }),
        actorId,
        idempotencyKey: `ar_allocation_reversal:${allocation.arAllocationId}`,
        description: `AR allocation reversal ${allocation.arAllocationId}`,
        lines: buildJournalReversalLineInputs(originalJournal.lines)
      });
    allocation.status = "reversed";
    allocation.reversalJournalEntryId = reversalJournal.journalEntryId;
    allocation.updatedAt = nowIso(clock);

    const previousOpenAmount = openItem.openAmount;
    const previousFunctionalOpenAmount = roundMoney(openItem.functionalOpenAmount ?? openItem.openAmount);
    openItem.openAmount = roundMoney(openItem.openAmount + allocation.allocatedAmount);
    openItem.paidAmount = roundMoney(Math.max(0, openItem.paidAmount - allocation.allocatedAmount));
    openItem.functionalOpenAmount = roundMoney(previousFunctionalOpenAmount + allocation.functionalAmount);
    openItem.functionalPaidAmount = roundMoney(Math.max(0, (openItem.functionalPaidAmount || 0) - allocation.functionalAmount));
    openItem.closedOn = null;
    openItem.collectionStageCode = openItem.disputeFlag || openItem.dunningHoldFlag ? "hold" : "none";
    openItem.status = resolveOpenItemStatus(openItem);
    refreshOpenItemAging(openItem, resolvedReversedOn);
    touchOpenItem(openItem);
    appendOpenItemEvent(state, clock, {
      openItem,
      eventCode: "allocation_reversed",
      eventReasonCode: requireText(reasonCode, "ar_allocation_reverse_reason_required"),
      eventSourceType: "MANUAL_REVIEW",
      eventSourceId: allocation.arAllocationId,
      amountDelta: allocation.allocatedAmount,
      openAmountBefore: previousOpenAmount,
      openAmountAfter: openItem.openAmount,
      snapshotJson: {
        reversalJournalEntryId: allocation.reversalJournalEntryId,
        functionalOpenAmountBefore: previousFunctionalOpenAmount,
        functionalOpenAmountAfter: openItem.functionalOpenAmount
      },
      actorId
    });
    syncInvoiceFromOpenItem(state, clock, openItem);
    createOrReuseUnmatchedReceipt({
      state,
      clock,
      companyId: allocation.companyId,
      bankTransactionUid: allocation.bankTransactionUid || `reversal:${allocation.arAllocationId}`,
      statementLineHash: allocation.statementLineHash || buildStatementLineHash({
        bankTransactionUid: allocation.bankTransactionUid || allocation.arAllocationId,
        amount: allocation.allocatedAmount,
        currencyCode: allocation.currencyCode,
        valueDate: resolvedReversedOn
      }),
      valueDate: resolvedReversedOn,
      amount: allocation.allocatedAmount,
      currencyCode: allocation.currencyCode,
      payerReference: null,
      customerHint: null,
      linkedArAllocationId: allocation.arAllocationId,
      actorId,
      payloadJson: {
        reasonCode: requireText(reasonCode, "ar_allocation_reverse_reason_required"),
        reversalOfAllocationId: allocation.arAllocationId
      }
    });
    pushAudit(state, clock, {
      companyId: allocation.companyId,
      actorId,
      correlationId,
      action: "ar.allocation.reversed",
      entityType: "ar_allocation",
      entityId: allocation.arAllocationId,
      explanation: `Reversed allocation ${allocation.arAllocationId}.`
    });
    return copy(allocation);
  }

  function listPaymentMatchingRuns({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.paymentMatchingRunIdsByCompany.get(resolvedCompanyId) || [])
      .map((runId) => state.paymentMatchingRuns.get(runId))
      .filter(Boolean)
      .sort((left, right) => right.runStartedAt.localeCompare(left.runStartedAt))
      .map(copy);
  }

  function getPaymentMatchingRun({ companyId, arPaymentMatchingRunId } = {}) {
    return copy(requirePaymentMatchingRunRecord(state, companyId, arPaymentMatchingRunId));
  }

  function createPaymentMatchingRun({
    companyId,
    sourceChannel,
    externalBatchRef = null,
    idempotencyKey = null,
    transactions,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedSourceChannel = assertAllowed(sourceChannel, AR_PAYMENT_MATCH_SOURCE_CHANNELS, "ar_payment_source_channel_invalid");
    if (!Array.isArray(transactions) || transactions.length === 0) {
      throw createError(400, "ar_payment_transactions_required", "Payment matching requires at least one transaction.");
    }
    const resolvedIdempotencyKey =
      normalizeOptionalText(idempotencyKey) ||
      hashObject({
        companyId: resolvedCompanyId,
        sourceChannel: resolvedSourceChannel,
        externalBatchRef: normalizeOptionalText(externalBatchRef),
        transactions
      });
    const scopedRunKey = toCompanyScopedKey(resolvedCompanyId, resolvedIdempotencyKey);
    const existingRunId = state.paymentMatchingRunIdsByKey.get(scopedRunKey);
    if (existingRunId) {
      return copy(state.paymentMatchingRuns.get(existingRunId));
    }

    const run = {
      arPaymentMatchingRunId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      sourceChannel: resolvedSourceChannel,
      externalBatchRef: normalizeOptionalText(externalBatchRef),
      idempotencyKey: resolvedIdempotencyKey,
      status: "received",
      runStartedAt: nowIso(clock),
      runCompletedAt: null,
      stats: {
        processed: transactions.length,
        matched: 0,
        reviewRequired: 0
      },
      candidates: [],
      allocations: [],
      unmatchedReceipts: [],
      createdByActorId: actorId,
      createdAt: nowIso(clock)
    };
    state.paymentMatchingRuns.set(run.arPaymentMatchingRunId, run);
    ensureCollection(state.paymentMatchingRunIdsByCompany, resolvedCompanyId).push(run.arPaymentMatchingRunId);
    state.paymentMatchingRunIdsByKey.set(scopedRunKey, run.arPaymentMatchingRunId);

    for (const transaction of transactions) {
      const candidate = buildPaymentMatchCandidate({ state, transaction, companyId: resolvedCompanyId });
      candidate.arPaymentMatchingRunId = run.arPaymentMatchingRunId;
      state.paymentMatchCandidates.set(candidate.arPaymentMatchCandidateId, candidate);
      ensureCollection(state.paymentMatchCandidateIdsByRun, run.arPaymentMatchingRunId).push(candidate.arPaymentMatchCandidateId);
      run.candidates.push(candidate);

      if (candidate.status === "rejected" || !candidate.arOpenItemId) {
        const unmatchedReceipt = createOrReuseUnmatchedReceipt({
          state,
          clock,
          companyId: resolvedCompanyId,
          bankTransactionUid: candidate.bankTransactionUid,
          statementLineHash: candidate.statementLineHash,
          valueDate: candidate.valueDate,
          amount: candidate.amount,
          currencyCode: candidate.currencyCode,
          payerReference: candidate.payerReference,
          customerHint: normalizeOptionalText(transaction.customerHint),
          linkedArAllocationId: null,
          actorId,
          payloadJson: candidate.payloadJson
        });
        run.unmatchedReceipts.push(unmatchedReceipt);
        run.stats.reviewRequired += 1;
        continue;
      }

      const openItem = requireOpenItemRecord(state, resolvedCompanyId, candidate.arOpenItemId);
      const allocatedAmount = roundMoney(Math.min(candidate.amount, openItem.openAmount));
      const allocation = createOpenItemAllocation({
        companyId: resolvedCompanyId,
        arOpenItemId: candidate.arOpenItemId,
        allocationAmount: allocatedAmount,
        allocatedOn: candidate.valueDate,
        sourceChannel: resolvedSourceChannel,
        allocationType: "payment",
        bankTransactionUid: candidate.bankTransactionUid,
        statementLineHash: candidate.statementLineHash,
        externalEventRef: `payment_match:${candidate.bankTransactionUid}:${candidate.arOpenItemId}`,
        arPaymentMatchingRunId: run.arPaymentMatchingRunId,
        receiptAmount: candidate.amount,
        currencyCode: candidate.currencyCode,
        reasonCode: candidate.reasonCode,
        actorId,
        correlationId
      });
      candidate.status = "confirmed";
      candidate.payloadJson = {
        ...candidate.payloadJson,
        allocationId: allocation.arAllocationId
      };
      run.allocations.push(allocation);
      run.stats.matched += 1;
      if (candidate.amount > allocatedAmount) {
        run.stats.reviewRequired += 1;
      }
    }

    run.status = run.stats.reviewRequired > 0 ? "review_required" : "completed";
    run.runCompletedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "ar.payment_matching_run.completed",
      entityType: "ar_payment_matching_run",
      entityId: run.arPaymentMatchingRunId,
      explanation: `Completed payment matching run ${run.arPaymentMatchingRunId}.`
    });
    return copy(run);
  }

  function listDunningRuns({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.dunningRunIdsByCompany.get(resolvedCompanyId) || [])
      .map((runId) => state.dunningRuns.get(runId))
      .filter(Boolean)
      .sort((left, right) => right.runDate.localeCompare(left.runDate))
      .map(copy);
  }

  function getDunningRun({ companyId, arDunningRunId } = {}) {
    return copy(requireDunningRunRecord(state, companyId, arDunningRunId));
  }

  function createDunningRun({
    companyId,
    runDate,
    stageCode,
    annualInterestRatePercent = null,
    reminderFeeAmount = DEFAULT_REMINDER_FEE_AMOUNT,
    idempotencyKey = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedRunDate = normalizeDate(runDate, "ar_dunning_run_date_invalid");
    const resolvedStageCode = assertAllowed(stageCode, ["stage_1", "stage_2", "escalated"], "ar_dunning_stage_invalid");
    const resolvedInterestRate = normalizePositiveNumber(
      annualInterestRatePercent ?? resolveStatutoryInterestPercent(resolvedRunDate),
      "ar_dunning_interest_rate_invalid"
    );
    const calculationWindowStart = firstDayOfMonthIso(resolvedRunDate);
    const calculationWindowEnd = resolvedRunDate;
    const resolvedIdempotencyKey =
      normalizeOptionalText(idempotencyKey) || `${resolvedCompanyId}:${resolvedStageCode}:${calculationWindowStart}:${calculationWindowEnd}`;
    const scopedRunKey = toCompanyScopedKey(resolvedCompanyId, resolvedIdempotencyKey);
    const existingRunId = state.dunningRunIdsByKey.get(scopedRunKey);
    if (existingRunId) {
      return copy(state.dunningRuns.get(existingRunId));
    }

    const run = {
      arDunningRunId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      runDate: resolvedRunDate,
      stageCode: resolvedStageCode,
      status: "draft",
      calculationWindowStart,
      calculationWindowEnd,
      idempotencyKey: resolvedIdempotencyKey,
      summary: {
        items: 0,
        feesGenerated: 0,
        interestGenerated: 0,
        skipped: 0
      },
      items: [],
      createdByActorId: actorId,
      createdAt: nowIso(clock)
    };
    state.dunningRuns.set(run.arDunningRunId, run);
    ensureCollection(state.dunningRunIdsByCompany, resolvedCompanyId).push(run.arDunningRunId);
    state.dunningRunIdsByKey.set(scopedRunKey, run.arDunningRunId);

    for (const openItem of listEligibleOpenItemsForDunning(state, resolvedCompanyId, resolvedRunDate)) {
      const customer = requireCustomerRecord(state, resolvedCompanyId, openItem.customerId);
      const item = {
        arDunningRunItemId: crypto.randomUUID(),
        arDunningRunId: run.arDunningRunId,
        companyId: resolvedCompanyId,
        arOpenItemId: openItem.arOpenItemId,
        customerInvoiceId: openItem.customerInvoiceId,
        stageCode: resolvedStageCode,
        feeAmount: 0,
        interestAmount: 0,
        lateCompensationAmount: 0,
        actionStatus: "proposed",
        skipReasonCode: null,
        journalEntryIds: [],
        payloadJson: {},
        createdAt: nowIso(clock)
      };
      if (openItem.disputeFlag || openItem.dunningHoldFlag || openItem.collectionStageCode === "hold") {
        item.actionStatus = "skipped";
        item.skipReasonCode = "dunning_hold";
        run.summary.skipped += 1;
        run.items.push(item);
        continue;
      }
      if (!isDunningStageEligible(openItem.collectionStageCode, resolvedStageCode)) {
        continue;
      }

      item.feeAmount = customer.allowReminderFee && resolvedStageCode === "stage_1" ? roundMoney(reminderFeeAmount) : 0;
      item.interestAmount = customer.allowInterest
        ? calculateLateInterestAmount(openItem.openAmount, openItem.dueOn, resolvedRunDate, resolvedInterestRate)
        : 0;

      if (item.feeAmount > 0 || item.interestAmount > 0) {
        const journal = postArJournal({
          ledgerPlatform,
          companyId: resolvedCompanyId,
          journalDate: resolvedRunDate,
          recipeCode: "AR_DUNNING_CHARGE",
          postingSignalCode: "ar.dunning.charge_booked",
          voucherSeriesPurposeCode: "AR_DUNNING",
          fallbackVoucherSeriesCode: "B",
          sourceType: "AR_INVOICE",
          sourceId: `${openItem.arOpenItemId}:${resolvedStageCode}`,
          sourceObjectVersion: hashObject({
            arOpenItemId: openItem.arOpenItemId,
            stageCode: resolvedStageCode,
            feeAmount: item.feeAmount,
            interestAmount: item.interestAmount,
            annualInterestRatePercent: resolvedInterestRate,
            calculationWindowEnd
          }),
          actorId,
          idempotencyKey: `ar_dunning:${openItem.arOpenItemId}:${resolvedStageCode}:${calculationWindowEnd}`,
          description: `AR dunning ${resolvedStageCode} ${openItem.arOpenItemId}`,
          lines: buildDunningJournalLines({
            openItem,
            feeAmount: item.feeAmount,
            interestAmount: item.interestAmount
          })
        });
        item.journalEntryIds.push(journal.journalEntryId);
        const beforeAmount = openItem.openAmount;
        openItem.originalAmount = roundMoney(openItem.originalAmount + item.feeAmount + item.interestAmount);
        openItem.openAmount = roundMoney(openItem.openAmount + item.feeAmount + item.interestAmount);
        appendOpenItemEvent(state, clock, {
          openItem,
          eventCode: "dunning_charge_booked",
          eventReasonCode: resolvedStageCode,
          eventSourceType: "DUNNING",
          eventSourceId: item.arDunningRunItemId,
          amountDelta: roundMoney(item.feeAmount + item.interestAmount),
          openAmountBefore: beforeAmount,
          openAmountAfter: openItem.openAmount,
          snapshotJson: {
            journalEntryIds: item.journalEntryIds,
            feeAmount: item.feeAmount,
            interestAmount: item.interestAmount
          },
          actorId
        });
        run.summary.feesGenerated += item.feeAmount > 0 ? 1 : 0;
        run.summary.interestGenerated += item.interestAmount > 0 ? 1 : 0;
      }

      openItem.collectionStageCode = resolvedStageCode;
      refreshOpenItemAging(openItem, resolvedRunDate);
      touchOpenItem(openItem);
      item.actionStatus = "booked";
      run.summary.items += 1;
      syncInvoiceFromOpenItem(state, clock, openItem);
      run.items.push(item);
    }

    run.status = "executed";
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "ar.dunning_run.executed",
      entityType: "ar_dunning_run",
      entityId: run.arDunningRunId,
      explanation: `Executed dunning run ${run.arDunningRunId} for ${resolvedStageCode}.`
    });
    return copy(run);
  }

function createWriteoff({
    companyId,
    arOpenItemId,
    writeoffAmount,
    writeoffDate,
    reasonCode,
    applyBadDebtVatRelief = false,
    policyLimitAmount = DEFAULT_SMALL_DIFFERENCE_POLICY_LIMIT,
    approvedByActorId = null,
    approvedByRoleCode = null,
    ledgerAccountNumber = DEFAULT_SMALL_DIFFERENCE_ACCOUNT_NUMBER,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const openItem = requireOpenItemRecord(state, companyId, arOpenItemId);
    if (!ledgerPlatform || typeof ledgerPlatform.applyPostingIntent !== "function") {
      throw createError(500, "ledger_platform_missing", "Ledger platform is required for AR write-offs.");
    }
    if (openItem.disputeFlag || openItem.dunningHoldFlag) {
      throw createError(409, "writeoff_dispute_blocked", "Disputed or held items cannot be written off automatically.");
    }
    const resolvedWriteoffAmount = normalizePositiveNumber(writeoffAmount, "ar_writeoff_amount_invalid");
    if (resolvedWriteoffAmount > openItem.openAmount) {
      throw createError(409, "writeoff_exceeds_open_amount", "Write-off amount exceeds the open amount.");
    }
    const resolvedWriteoffDate = normalizeDate(writeoffDate, "ar_writeoff_date_invalid");
    const resolvedPolicyLimitAmount = normalizePositiveNumber(policyLimitAmount, "ar_writeoff_policy_limit_invalid");
    const requiresApproval = resolvedWriteoffAmount > resolvedPolicyLimitAmount;
    if (requiresApproval && !normalizeOptionalText(approvedByActorId)) {
      throw createError(409, "writeoff_approval_required", "Write-off exceeds the configured automatic policy limit.");
    }
    const resolvedApplyBadDebtVatRelief = applyBadDebtVatRelief === true;
    const badDebtVatAdjustment = resolvedApplyBadDebtVatRelief
      ? resolveBadDebtVatAdjustment({
          state,
          vatPlatform,
          ledgerPlatform,
          companyId,
          openItem,
          writeoffAmount: resolvedWriteoffAmount,
          writeoffDate: resolvedWriteoffDate,
          actorId,
          correlationId
        })
      : null;

    const writeoff = {
      arWriteoffId: crypto.randomUUID(),
      companyId: openItem.companyId,
      arOpenItemId: openItem.arOpenItemId,
      customerInvoiceId: openItem.customerInvoiceId,
      arAllocationId: null,
      status: "posted",
      reasonCode: requireText(reasonCode, "ar_writeoff_reason_required"),
      policyLimitAmount: resolvedPolicyLimitAmount,
      requiresApproval,
      approvedByActorId: normalizeOptionalText(approvedByActorId),
      writeoffAmount: resolvedWriteoffAmount,
      currencyCode: openItem.currencyCode,
      functionalAmount: resolveFunctionalAmount({ amount: resolvedWriteoffAmount, openItem }),
      badDebtVatReliefApplied: badDebtVatAdjustment != null,
      badDebtVatReliefAmount: badDebtVatAdjustment?.vatReliefAmount || 0,
      badDebtVatFunctionalReliefAmount: badDebtVatAdjustment?.functionalVatReliefAmount || 0,
      badDebtVatDecisionIds: copy(badDebtVatAdjustment?.vatDecisionIds || []),
      ledgerAccountNumber: requireText(ledgerAccountNumber, "ar_writeoff_account_required"),
      writeoffDate: resolvedWriteoffDate,
      reversalOfWriteoffId: null,
      journalEntryId: null,
      metadataJson:
        badDebtVatAdjustment == null
          ? {}
          : {
              badDebtVatReliefApplied: true,
              badDebtVatReliefAmount: badDebtVatAdjustment.vatReliefAmount,
              badDebtVatDecisionIds: copy(badDebtVatAdjustment.vatDecisionIds)
            },
      createdByActorId: actorId,
      createdAt: nowIso(clock)
    };
    const journal = postArJournal({
      ledgerPlatform,
      companyId: openItem.companyId,
      journalDate: resolvedWriteoffDate,
      recipeCode: "AR_WRITEOFF",
      postingSignalCode: "ar.writeoff.posted",
      voucherSeriesPurposeCode: "AR_WRITEOFF",
      fallbackVoucherSeriesCode: "V",
      sourceType: "MANUAL_JOURNAL",
      sourceId: `writeoff:${writeoff.arWriteoffId}`,
      sourceObjectVersion: hashObject({
        arOpenItemId: openItem.arOpenItemId,
        writeoffDate: resolvedWriteoffDate,
        writeoffAmount: resolvedWriteoffAmount,
        reasonCode: writeoff.reasonCode,
        badDebtVatReliefApplied: writeoff.badDebtVatReliefApplied,
        badDebtVatDecisionIds: writeoff.badDebtVatDecisionIds
      }),
      actorId,
      approvedByActorId: writeoff.approvedByActorId,
      approvedByRoleCode,
      idempotencyKey: `ar_writeoff:${openItem.arOpenItemId}:${resolvedWriteoffDate}:${resolvedWriteoffAmount}:${resolvedApplyBadDebtVatRelief ? "vat_relief" : "plain"}`,
      description: `AR writeoff ${writeoff.arWriteoffId}`,
      lines: buildWriteoffJournalLines({
        openItem,
        ledgerAccountNumber: writeoff.ledgerAccountNumber,
        writeoffAmount: resolvedWriteoffAmount,
        badDebtVatAdjustment
      })
    });
    if (
      badDebtVatAdjustment?.vatDecisionIds?.length > 0
      && vatPlatform
      && typeof vatPlatform.recordVatDecisionPosting === "function"
    ) {
      vatPlatform.recordVatDecisionPosting({
        companyId: openItem.companyId,
        vatDecisionIds: badDebtVatAdjustment.vatDecisionIds,
        journalEntryId: journal.journalEntryId,
        actorId,
        correlationId
      });
    }
    writeoff.journalEntryId = journal.journalEntryId;
    state.writeoffs.set(writeoff.arWriteoffId, writeoff);
    ensureCollection(state.writeoffIdsByCompany, openItem.companyId).push(writeoff.arWriteoffId);

    const beforeAmount = openItem.openAmount;
    const beforeFunctionalAmount = roundMoney(openItem.functionalOpenAmount ?? openItem.openAmount);
    openItem.openAmount = roundMoney(openItem.openAmount - resolvedWriteoffAmount);
    openItem.writeoffAmount = roundMoney(openItem.writeoffAmount + resolvedWriteoffAmount);
    openItem.functionalOpenAmount = roundMoney(Math.max(0, beforeFunctionalAmount - writeoff.functionalAmount));
    openItem.functionalWriteoffAmount = roundMoney((openItem.functionalWriteoffAmount || 0) + writeoff.functionalAmount);
    openItem.status = resolveOpenItemStatus(openItem);
    if (openItem.openAmount === 0) {
      openItem.closedOn = resolvedWriteoffDate;
      openItem.collectionStageCode = "closed";
    }
    refreshOpenItemAging(openItem, resolvedWriteoffDate);
    touchOpenItem(openItem);
    appendOpenItemEvent(state, clock, {
      openItem,
      eventCode: "writeoff_posted",
      eventReasonCode: writeoff.reasonCode,
      eventSourceType: "WRITE_OFF",
      eventSourceId: writeoff.arWriteoffId,
      amountDelta: -resolvedWriteoffAmount,
      openAmountBefore: beforeAmount,
      openAmountAfter: openItem.openAmount,
      snapshotJson: {
        journalEntryId: writeoff.journalEntryId,
        badDebtVatReliefApplied: writeoff.badDebtVatReliefApplied,
        badDebtVatDecisionIds: writeoff.badDebtVatDecisionIds,
        functionalOpenAmountBefore: beforeFunctionalAmount,
        functionalOpenAmountAfter: openItem.functionalOpenAmount
      },
      actorId
    });
    syncInvoiceFromOpenItem(state, clock, openItem);
    pushAudit(state, clock, {
      companyId: openItem.companyId,
      actorId,
      correlationId,
      action: "ar.writeoff.posted",
      entityType: "ar_writeoff",
      entityId: writeoff.arWriteoffId,
      explanation:
        badDebtVatAdjustment == null
          ? `Posted write-off ${writeoff.arWriteoffId} for open item ${openItem.arOpenItemId}.`
          : `Posted write-off ${writeoff.arWriteoffId} with bad-debt VAT relief for open item ${openItem.arOpenItemId}.`
    });
    return copy(writeoff);
  }

  function listAgingSnapshots({ companyId, cutoffDate = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedCutoffDate = cutoffDate ? normalizeDate(cutoffDate, "ar_aging_cutoff_date_invalid") : null;
    return (state.agingSnapshotIdsByCompany.get(resolvedCompanyId) || [])
      .map((agingSnapshotId) => state.agingSnapshots.get(agingSnapshotId))
      .filter(Boolean)
      .filter((snapshot) => (resolvedCutoffDate ? snapshot.cutoffDate === resolvedCutoffDate : true))
      .sort((left, right) => right.cutoffDate.localeCompare(left.cutoffDate))
      .map(copy);
  }

  function captureAgingSnapshot({ companyId, cutoffDate, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedCutoffDate = normalizeDate(cutoffDate, "ar_aging_cutoff_date_invalid");
    const openItems = (state.openItemIdsByCompany.get(resolvedCompanyId) || [])
      .map((arOpenItemId) => state.openItems.get(arOpenItemId))
      .filter(Boolean)
      .filter((openItem) => openItem.status !== "reversed" && openItem.openAmount > 0);
    const sourceHash = hashObject(
      openItems.map((openItem) => ({
        arOpenItemId: openItem.arOpenItemId,
        customerId: openItem.customerId,
        dueOn: openItem.dueOn,
        openAmount: openItem.openAmount,
        status: openItem.status,
        updatedAt: openItem.updatedAt
      }))
    );
    const scopedSnapshotKey = toCompanyScopedKey(resolvedCompanyId, `${resolvedCutoffDate}:${sourceHash}`);
    const existingSnapshotId = state.agingSnapshotIdsByKey.get(scopedSnapshotKey);
    if (existingSnapshotId) {
      return copy(state.agingSnapshots.get(existingSnapshotId));
    }

    const bucketTotals = Object.fromEntries(AR_AGING_BUCKET_CODES.map((bucket) => [bucket, 0]));
    const customerTotals = {};
    for (const openItem of openItems) {
      const bucket = computeAgingBucket(openItem.dueOn, resolvedCutoffDate);
      bucketTotals[bucket] = roundMoney((bucketTotals[bucket] || 0) + openItem.openAmount);
      customerTotals[openItem.customerId] = roundMoney((customerTotals[openItem.customerId] || 0) + openItem.openAmount);
      openItem.agingBucketCode = bucket;
    }

    const snapshot = {
      arAgingSnapshotId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      cutoffDate: resolvedCutoffDate,
      sourceHash,
      openItemCount: openItems.length,
      bucketTotalsJson: bucketTotals,
      customerTotalsJson: customerTotals,
      generatedByActorId: actorId,
      generatedAt: nowIso(clock)
    };
    state.agingSnapshots.set(snapshot.arAgingSnapshotId, snapshot);
    ensureCollection(state.agingSnapshotIdsByCompany, resolvedCompanyId).push(snapshot.arAgingSnapshotId);
    state.agingSnapshotIdsByKey.set(scopedSnapshotKey, snapshot.arAgingSnapshotId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "ar.aging_snapshot.generated",
      entityType: "ar_aging_snapshot",
      entityId: snapshot.arAgingSnapshotId,
      explanation: `Captured AR aging snapshot for ${resolvedCutoffDate}.`
    });
    return copy(snapshot);
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
      invoiceSeries: [...state.invoiceSeries.values()],
      invoices: [...state.invoices.values()],
      paymentLinks: [...state.paymentLinks.values()],
      openItems: [...state.openItems.values()],
      openItemEvents: state.openItemEvents,
      paymentMatchingRuns: [...state.paymentMatchingRuns.values()],
      paymentMatchCandidates: [...state.paymentMatchCandidates.values()],
      allocations: [...state.allocations.values()],
      unmatchedBankReceipts: [...state.unmatchedBankReceipts.values()],
      dunningRuns: [...state.dunningRuns.values()],
      writeoffs: [...state.writeoffs.values()],
      agingSnapshots: [...state.agingSnapshots.values()],
      customerImportBatches: [...state.customerImportBatches.values()],
      auditEvents: state.auditEvents
    });
  }

  function exportDurableState() {
    return serializeDurableState(state);
  }

  function importDurableState(snapshot) {
    applyDurableStateSnapshot(state, snapshot);
  }

  function seedDemoState() {
    ensureDefaultInvoiceSeriesForCompany(state, DEMO_COMPANY_ID, clock);
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

function requireOpenItemRecord(state, companyId, arOpenItemId) {
  const openItem = state.openItems.get(requireText(arOpenItemId, "ar_open_item_id_required"));
  if (!openItem || openItem.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "ar_open_item_not_found", "AR open item was not found.");
  }
  return openItem;
}

function requireAllocationRecord(state, companyId, arAllocationId) {
  const allocation = state.allocations.get(requireText(arAllocationId, "ar_allocation_id_required"));
  if (!allocation || allocation.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "ar_allocation_not_found", "AR allocation was not found.");
  }
  return allocation;
}

function requirePaymentMatchingRunRecord(state, companyId, arPaymentMatchingRunId) {
  const run = state.paymentMatchingRuns.get(requireText(arPaymentMatchingRunId, "ar_payment_matching_run_id_required"));
  if (!run || run.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "ar_payment_matching_run_not_found", "AR payment matching run was not found.");
  }
  return run;
}

function requireDunningRunRecord(state, companyId, arDunningRunId) {
  const run = state.dunningRuns.get(requireText(arDunningRunId, "ar_dunning_run_id_required"));
  if (!run || run.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "ar_dunning_run_not_found", "AR dunning run was not found.");
  }
  return run;
}

function requireUnmatchedReceiptRecord(state, companyId, unmatchedBankReceiptId) {
  const receipt = state.unmatchedBankReceipts.get(requireText(unmatchedBankReceiptId, "ar_unmatched_bank_receipt_id_required"));
  if (!receipt || receipt.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "ar_unmatched_bank_receipt_not_found", "AR unmatched bank receipt was not found.");
  }
  return receipt;
}

function ensureOpenItemForInvoice({ state, clock, ledgerPlatform = null, invoice, customer, actorId = "system", correlationId = crypto.randomUUID() }) {
  if (!invoice || invoice.invoiceType === "credit_note") {
    return null;
  }
  const scopedKey = toCompanyScopedKey(invoice.companyId, invoice.customerInvoiceId);
  const existingOpenItemId = state.openItemIdByInvoice.get(scopedKey);
  if (existingOpenItemId) {
    const openItem = state.openItems.get(existingOpenItemId);
    if (openItem) {
      const functionalCurrencyCode = resolveLedgerFunctionalCurrencyCode({ ledgerPlatform, companyId: invoice.companyId });
      const functionalAmount = calculateInvoiceFunctionalGrossAmount({ invoice, functionalCurrencyCode });
      openItem.originalAmount = invoice.totals.grossAmount;
      openItem.openAmount = invoice.remainingAmount;
      openItem.functionalCurrencyCode = functionalCurrencyCode;
      openItem.functionalExchangeRate = resolveFunctionalExchangeRate({ invoice, functionalCurrencyCode });
      openItem.functionalOriginalAmount = functionalAmount;
      openItem.functionalOpenAmount = functionalAmount;
      openItem.dueOn = invoice.dueDate;
      openItem.status = resolveOpenItemStatus(openItem);
      refreshOpenItemAging(openItem, invoice.issueDate);
      touchOpenItem(openItem);
      return openItem;
    }
  }
  const functionalCurrencyCode = resolveLedgerFunctionalCurrencyCode({ ledgerPlatform, companyId: invoice.companyId });
  const functionalAmount = calculateInvoiceFunctionalGrossAmount({ invoice, functionalCurrencyCode });
  const openItem = {
    arOpenItemId: crypto.randomUUID(),
    companyId: invoice.companyId,
    customerId: customer.customerId,
    customerCountryCode: customer.countryCode,
    customerInvoiceId: invoice.customerInvoiceId,
    originalCustomerInvoiceId: invoice.customerInvoiceId,
    sourceType: invoice.sourceType,
    sourceId: invoice.sourceId,
    sourceVersion: invoice.sourceVersion,
    idempotencyKey: `open_item:${invoice.customerInvoiceId}`,
    currencyCode: invoice.currencyCode,
    functionalCurrencyCode,
    functionalExchangeRate: resolveFunctionalExchangeRate({ invoice, functionalCurrencyCode }),
    originalAmount: invoice.totals.grossAmount,
    openAmount: invoice.remainingAmount,
    functionalOriginalAmount: functionalAmount,
    functionalOpenAmount: functionalAmount,
    paidAmount: 0,
    functionalPaidAmount: 0,
    creditedAmount: 0,
    functionalCreditedAmount: 0,
    writeoffAmount: 0,
    functionalWriteoffAmount: 0,
    disputedAmount: 0,
    dueOn: invoice.dueDate,
    openedOn: invoice.issueDate,
    closedOn: null,
    lastActivityAt: invoice.issuedAt || nowIso(clock),
    agingBucketCode: computeAgingBucket(invoice.dueDate, invoice.issueDate),
    collectionStageCode: "none",
    disputeFlag: false,
    dunningHoldFlag: false,
    status: "open",
    metadataJson: {
      invoiceNumber: invoice.invoiceNumber
    },
    createdAt: nowIso(clock),
    updatedAt: nowIso(clock)
  };
  state.openItems.set(openItem.arOpenItemId, openItem);
  ensureCollection(state.openItemIdsByCompany, openItem.companyId).push(openItem.arOpenItemId);
  state.openItemIdByInvoice.set(scopedKey, openItem.arOpenItemId);
  appendOpenItemEvent(state, clock, {
    openItem,
    eventCode: "open_item_created",
    eventReasonCode: invoice.invoiceType,
    eventSourceType: "AR_INVOICE",
    eventSourceId: invoice.customerInvoiceId,
    amountDelta: invoice.totals.grossAmount,
    openAmountBefore: 0,
    openAmountAfter: openItem.openAmount,
    snapshotJson: {
      invoiceNumber: invoice.invoiceNumber
    },
    actorId
  });
  pushAudit(state, clock, {
    companyId: openItem.companyId,
    actorId,
    correlationId,
    action: "ar.open_item.created",
    entityType: "ar_open_item",
    entityId: openItem.arOpenItemId,
    explanation: `Created AR open item ${openItem.arOpenItemId} for invoice ${invoice.customerInvoiceId}.`
  });
  return openItem;
}

function applyCreditToOpenItem({ state, clock, originalInvoice, creditInvoice, actorId = "system" }) {
  const scopedKey = toCompanyScopedKey(originalInvoice.companyId, originalInvoice.customerInvoiceId);
  const openItemId = state.openItemIdByInvoice.get(scopedKey);
  if (!openItemId) {
    return;
  }
  const openItem = state.openItems.get(openItemId);
  if (!openItem) {
    return;
  }
  const previousOpenAmount = openItem.openAmount;
  const previousFunctionalOpenAmount = roundMoney(openItem.functionalOpenAmount ?? openItem.openAmount);
  const functionalCreditAmount = calculateInvoiceFunctionalGrossAmount({
    invoice: creditInvoice,
    functionalCurrencyCode: openItem.functionalCurrencyCode || "SEK"
  });
  openItem.creditedAmount = roundMoney(openItem.creditedAmount + creditInvoice.totals.grossAmount);
  openItem.functionalCreditedAmount = roundMoney((openItem.functionalCreditedAmount || 0) + functionalCreditAmount);
  openItem.openAmount = roundMoney(Math.max(0, openItem.openAmount - creditInvoice.totals.grossAmount));
  openItem.functionalOpenAmount = roundMoney(Math.max(0, previousFunctionalOpenAmount - functionalCreditAmount));
  if (openItem.openAmount === 0) {
    openItem.closedOn = creditInvoice.issueDate;
    openItem.collectionStageCode = "closed";
  }
  openItem.status = resolveOpenItemStatus(openItem);
  refreshOpenItemAging(openItem, creditInvoice.issueDate);
  touchOpenItem(openItem);
  appendOpenItemEvent(state, clock, {
    openItem,
    eventCode: "credit_applied",
    eventReasonCode: creditInvoice.customerInvoiceId,
    eventSourceType: "AR_CREDIT_NOTE",
    eventSourceId: creditInvoice.customerInvoiceId,
    amountDelta: -creditInvoice.totals.grossAmount,
    openAmountBefore: previousOpenAmount,
    openAmountAfter: openItem.openAmount,
    snapshotJson: {
      creditInvoiceId: creditInvoice.customerInvoiceId,
      functionalOpenAmountBefore: previousFunctionalOpenAmount,
      functionalOpenAmountAfter: openItem.functionalOpenAmount
    },
    actorId
  });
}

function applyAllocationToOpenItem({ state, clock, openItem, allocation, actorId = "system" }) {
  const previousOpenAmount = openItem.openAmount;
  const previousFunctionalOpenAmount = roundMoney(openItem.functionalOpenAmount ?? openItem.openAmount);
  if (allocation.allocationType === "credit_note") {
    openItem.creditedAmount = roundMoney(openItem.creditedAmount + allocation.allocatedAmount);
    openItem.functionalCreditedAmount = roundMoney((openItem.functionalCreditedAmount || 0) + allocation.functionalAmount);
  } else if (allocation.allocationType === "writeoff_adjustment") {
    openItem.writeoffAmount = roundMoney(openItem.writeoffAmount + allocation.allocatedAmount);
    openItem.functionalWriteoffAmount = roundMoney((openItem.functionalWriteoffAmount || 0) + allocation.functionalAmount);
  } else {
    openItem.paidAmount = roundMoney(openItem.paidAmount + allocation.allocatedAmount);
    openItem.functionalPaidAmount = roundMoney((openItem.functionalPaidAmount || 0) + allocation.functionalAmount);
  }
  openItem.openAmount = roundMoney(openItem.openAmount - allocation.allocatedAmount);
  openItem.functionalOpenAmount = roundMoney(Math.max(0, previousFunctionalOpenAmount - allocation.functionalAmount));
  if (openItem.openAmount === 0) {
    openItem.closedOn = allocation.allocatedOn;
    openItem.collectionStageCode = "closed";
  }
  openItem.status = resolveOpenItemStatus(openItem);
  refreshOpenItemAging(openItem, allocation.allocatedOn);
  touchOpenItem(openItem);
  appendOpenItemEvent(state, clock, {
    openItem,
    eventCode: "payment_allocation_confirmed",
    eventReasonCode: allocation.reasonCode,
    eventSourceType: "BANK_MATCH",
    eventSourceId: allocation.arAllocationId,
    amountDelta: -allocation.allocatedAmount,
    openAmountBefore: previousOpenAmount,
    openAmountAfter: openItem.openAmount,
    snapshotJson: {
      journalEntryId: allocation.journalEntryId,
      functionalOpenAmountBefore: previousFunctionalOpenAmount,
      functionalOpenAmountAfter: openItem.functionalOpenAmount
    },
    actorId
  });
  syncInvoiceFromOpenItem(state, clock, openItem);
}

function syncInvoiceFromOpenItem(state, clock, openItem) {
  if (!openItem.customerInvoiceId) {
    return;
  }
  const invoice = state.invoices.get(openItem.customerInvoiceId);
  if (!invoice) {
    return;
  }
  invoice.remainingAmount = openItem.openAmount;
  if (openItem.disputeFlag || openItem.dunningHoldFlag) {
    invoice.status = "disputed";
  } else if (openItem.status === "written_off" && openItem.openAmount === 0) {
    invoice.status = "written_off";
  } else if (openItem.openAmount === 0) {
    invoice.status = invoice.creditedAmount > 0 ? "credited" : "paid";
  } else if (openItem.paidAmount > 0 || openItem.creditedAmount > 0 || openItem.writeoffAmount > 0) {
    invoice.status = "partially_paid";
  } else if (invoice.dueDate < nowIso(clock).slice(0, 10)) {
    invoice.status = "overdue";
  }
  invoice.updatedAt = nowIso(clock);
}

function resolveOpenItemStatus(openItem) {
  if (openItem.disputeFlag || openItem.dunningHoldFlag) {
    return "disputed";
  }
  if (openItem.openAmount === 0 && openItem.writeoffAmount > 0) {
    return "written_off";
  }
  if (openItem.openAmount === 0) {
    return "settled";
  }
  if (openItem.paidAmount > 0 || openItem.creditedAmount > 0 || openItem.writeoffAmount > 0) {
    return "partially_settled";
  }
  return "open";
}

function refreshOpenItemAging(openItem, cutoffDate) {
  openItem.agingBucketCode = computeAgingBucket(openItem.dueOn, cutoffDate);
}

function computeAgingBucket(dueOn, cutoffDate) {
  if (!dueOn || !cutoffDate) {
    return "current";
  }
  const overdueDays = diffDays(cutoffDate, dueOn);
  if (overdueDays <= 0) {
    return "current";
  }
  if (overdueDays <= 30) {
    return "1_30";
  }
  if (overdueDays <= 60) {
    return "31_60";
  }
  if (overdueDays <= 90) {
    return "61_90";
  }
  return "91_plus";
}

function touchOpenItem(openItem) {
  openItem.lastActivityAt = nowIso();
  openItem.updatedAt = openItem.lastActivityAt;
}

function appendOpenItemEvent(
  state,
  clock,
  {
    openItem,
    eventCode,
    eventReasonCode = null,
    eventSourceType,
    eventSourceId,
    amountDelta,
    openAmountBefore,
    openAmountAfter,
    snapshotJson = {},
    actorId = "system"
  }
) {
  state.openItemEvents.push({
    arOpenItemEventId: crypto.randomUUID(),
    arOpenItemId: openItem.arOpenItemId,
    companyId: openItem.companyId,
    eventCode,
    eventReasonCode: normalizeOptionalText(eventReasonCode),
    eventSourceType,
    eventSourceId,
    amountDelta: roundMoney(amountDelta),
    openAmountBefore: roundMoney(openAmountBefore),
    openAmountAfter: roundMoney(openAmountAfter),
    snapshotJson: copy(snapshotJson),
    occurredAt: nowIso(clock),
    createdByActorId: actorId,
    createdAt: nowIso(clock)
  });
}

function createOrReuseUnmatchedReceipt({
  state,
  clock,
  companyId,
  bankTransactionUid,
  statementLineHash,
  valueDate,
  amount,
  currencyCode,
  payerReference = null,
  customerHint = null,
  linkedArAllocationId = null,
  actorId = "system",
  payloadJson = {}
}) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const resolvedTransactionUid = requireText(bankTransactionUid, "bank_transaction_uid_required");
  const resolvedStatementLineHash =
    normalizeOptionalText(statementLineHash) ||
    buildStatementLineHash({ bankTransactionUid: resolvedTransactionUid, amount, currencyCode, valueDate });
  const key = toCompanyScopedKey(resolvedCompanyId, `${resolvedTransactionUid}:${resolvedStatementLineHash}`);
  const existingId = state.unmatchedReceiptIdsByKey.get(key);
  if (existingId) {
    const existingReceipt = state.unmatchedBankReceipts.get(existingId);
    existingReceipt.updatedAt = nowIso(clock);
    return existingReceipt;
  }
  const receipt = {
    arUnmatchedBankReceiptId: crypto.randomUUID(),
    companyId: resolvedCompanyId,
    bankTransactionUid: resolvedTransactionUid,
    statementLineHash: resolvedStatementLineHash,
    valueDate: normalizeDate(valueDate, "ar_unmatched_receipt_value_date_invalid"),
    amount: roundMoney(amount),
    remainingAmount: roundMoney(amount),
    currencyCode: normalizeUpperCode(currencyCode, "currency_code_required", 3),
    payerReference: normalizeOptionalText(payerReference),
    customerHint: normalizeOptionalText(customerHint),
    status: "unmatched",
    linkedArAllocationId: linkedArAllocationId ? requireText(linkedArAllocationId, "ar_allocation_id_required") : null,
    payloadJson: copy(payloadJson),
    createdByActorId: actorId,
    createdAt: nowIso(clock),
    updatedAt: nowIso(clock)
  };
  state.unmatchedBankReceipts.set(receipt.arUnmatchedBankReceiptId, receipt);
  ensureCollection(state.unmatchedReceiptIdsByCompany, resolvedCompanyId).push(receipt.arUnmatchedBankReceiptId);
  state.unmatchedReceiptIdsByKey.set(key, receipt.arUnmatchedBankReceiptId);
  return receipt;
}

function resolveUnmatchedReceiptStatus(receipt) {
  if (receipt.remainingAmount <= 0) {
    return "allocated";
  }
  if (receipt.remainingAmount < receipt.amount) {
    return "partially_allocated";
  }
  return "unmatched";
}

function buildStatementLineHash({ bankTransactionUid, amount, currencyCode, valueDate }) {
  return hashObject({
    bankTransactionUid: normalizeOptionalText(bankTransactionUid),
    amount: roundMoney(amount),
    currencyCode: normalizeOptionalText(currencyCode)?.toUpperCase() || "SEK",
    valueDate: normalizeOptionalText(valueDate)
  });
}

function buildPaymentMatchCandidate({ state, transaction, companyId }) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const amount = normalizePositiveNumber(transaction.amount, "ar_payment_transaction_amount_invalid");
  const currencyCode = normalizeUpperCode(transaction.currencyCode || "SEK", "currency_code_required", 3);
  const valueDate = normalizeDate(transaction.valueDate, "ar_payment_transaction_value_date_invalid");
  const bankTransactionUid = requireText(
    transaction.bankTransactionUid || transaction.externalTransactionUid,
    "bank_transaction_uid_required"
  );
  const statementLineHash =
    normalizeOptionalText(transaction.statementLineHash) ||
    buildStatementLineHash({ bankTransactionUid, amount, currencyCode, valueDate });
  const payerReference = normalizeOptionalText(transaction.payerReference || transaction.paymentReference);

  let candidateOpenItem = null;
  if (transaction.arOpenItemId) {
    candidateOpenItem = requireOpenItemRecord(state, resolvedCompanyId, transaction.arOpenItemId);
  } else if (transaction.customerInvoiceId) {
    const openItemId = state.openItemIdByInvoice.get(toCompanyScopedKey(resolvedCompanyId, transaction.customerInvoiceId)) || null;
    candidateOpenItem = openItemId ? state.openItems.get(openItemId) : null;
  } else if (payerReference) {
    candidateOpenItem = findOpenItemByPaymentReference(state, resolvedCompanyId, payerReference);
  }

  const matchReason = candidateOpenItem ? resolveMatchReason(candidateOpenItem, amount) : "no_confident_match";
  return {
    arPaymentMatchCandidateId: crypto.randomUUID(),
    arPaymentMatchingRunId: null,
    companyId: resolvedCompanyId,
    arOpenItemId: candidateOpenItem?.arOpenItemId || null,
    customerId: candidateOpenItem?.customerId || null,
    bankTransactionUid,
    statementLineHash,
    payerReference,
    amount,
    currencyCode,
    valueDate,
    matchScore: candidateOpenItem ? resolveMatchScore(candidateOpenItem, amount) : 0.2,
    status: candidateOpenItem ? "proposed" : "rejected",
    reasonCode: matchReason,
    payloadJson: {
      paymentReference: payerReference,
      customerHint: normalizeOptionalText(transaction.customerHint)
    },
    createdAt: nowIso()
  };
}

function resolveMatchReason(openItem, amount) {
  if (!openItem) {
    return "no_confident_match";
  }
  if (amount > openItem.openAmount) {
    return "overpayment_reference_match";
  }
  if (amount < openItem.openAmount) {
    return "partial_reference_match";
  }
  return "exact_reference_and_amount";
}

function resolveMatchScore(openItem, amount) {
  if (!openItem) {
    return 0;
  }
  if (amount === openItem.openAmount) {
    return 0.99;
  }
  if (amount < openItem.openAmount) {
    return 0.95;
  }
  return 0.93;
}

function findOpenItemByPaymentReference(state, companyId, payerReference) {
  const resolvedReference = requireText(payerReference, "payment_reference_required");
  const openItems = (state.openItemIdsByCompany.get(companyId) || [])
    .map((arOpenItemId) => state.openItems.get(arOpenItemId))
    .filter(Boolean)
    .filter((openItem) => openItem.openAmount > 0);
  return (
    openItems.find((openItem) => {
      const invoice = state.invoices.get(openItem.customerInvoiceId);
      return invoice && (invoice.paymentReference === resolvedReference || invoice.invoiceNumber === resolvedReference);
    }) || null
  );
}

function resolveOpenItemReceivableAccount(openItem) {
  if (!openItem?.customerId) {
    return "1210";
  }
  return resolveCustomerReceivableAccount({ countryCode: openItem.customerCountryCode || "SE" });
}

function buildAllocationJournalLines({ openItem, allocation, receiptAmount, unmatchedReceipt }) {
  const receivableAccountNumber = resolveOpenItemReceivableAccount(openItem);
  if (unmatchedReceipt) {
    return [
      createJournalLine(DEFAULT_UNALLOCATED_RECEIPT_ACCOUNT_NUMBER, 1, allocation.allocatedAmount, 0, "AR_PAYMENT", allocation.arAllocationId, buildOpenItemJournalOptions({
        openItem,
        debitAmount: allocation.allocatedAmount,
        creditAmount: 0
      })),
      createJournalLine(receivableAccountNumber, 2, 0, allocation.allocatedAmount, "AR_PAYMENT", allocation.arAllocationId, buildOpenItemJournalOptions({
        openItem,
        debitAmount: 0,
        creditAmount: allocation.allocatedAmount
      }))
    ];
  }
  if (allocation.allocationType === "prepayment") {
    return [
      createJournalLine(DEFAULT_CUSTOMER_PREPAYMENT_ACCOUNT_NUMBER, 1, allocation.allocatedAmount, 0, "AR_PAYMENT", allocation.arAllocationId, buildOpenItemJournalOptions({
        openItem,
        debitAmount: allocation.allocatedAmount,
        creditAmount: 0
      })),
      createJournalLine(receivableAccountNumber, 2, 0, allocation.allocatedAmount, "AR_PAYMENT", allocation.arAllocationId, buildOpenItemJournalOptions({
        openItem,
        debitAmount: 0,
        creditAmount: allocation.allocatedAmount
      }))
    ];
  }
  const functionalReceiptAmount = allocation.functionalReceiptAmount || resolveFunctionalAmount({ amount: receiptAmount, openItem });
  const functionalSettledAmount = allocation.functionalSettledAmount || allocation.functionalAmount || 0;
  const functionalSuspenseAmount = allocation.suspenseAmount > 0
    ? roundMoney(functionalReceiptAmount - functionalSettledAmount)
    : 0;
  const lines = [
    createJournalLine(DEFAULT_BANK_ACCOUNT_NUMBER, 1, receiptAmount, 0, "AR_PAYMENT", allocation.arAllocationId, {
      currencyCode: allocation.currencyCode || openItem.currencyCode || openItem.functionalCurrencyCode || "SEK",
      exchangeRate: allocation.settlementExchangeRate,
      functionalDebitAmount: functionalReceiptAmount,
      functionalCreditAmount: 0
    }),
    createJournalLine(receivableAccountNumber, 2, 0, allocation.allocatedAmount, "AR_PAYMENT", allocation.arAllocationId, buildOpenItemJournalOptions({
      openItem,
      debitAmount: 0,
      creditAmount: allocation.allocatedAmount
    }))
  ];
  if (allocation.suspenseAmount > 0) {
    lines.push(
      createJournalLine(
        DEFAULT_UNALLOCATED_RECEIPT_ACCOUNT_NUMBER,
        3,
          0,
          allocation.suspenseAmount,
          "AR_PAYMENT",
          allocation.arAllocationId,
          {
            currencyCode: allocation.currencyCode || openItem.currencyCode || openItem.functionalCurrencyCode || "SEK",
            exchangeRate: allocation.settlementExchangeRate,
            functionalDebitAmount: 0,
            functionalCreditAmount: functionalSuspenseAmount
          }
        )
      );
    }
  const fxLine = buildRealizedFxJournalLine({
    differenceAmount: allocation.realizedFxAmount || 0,
    balanceOrientation: "asset",
    sourceType: "AR_PAYMENT",
    sourceId: allocation.arAllocationId,
    lineNumber: lines.length + 1
  });
  if (fxLine) {
    lines.push(fxLine);
  }
  return lines;
}

function buildDunningJournalLines({ openItem, feeAmount, interestAmount }) {
  const receivableAccountNumber = resolveOpenItemReceivableAccount(openItem);
  const totalAmount = roundMoney(feeAmount + interestAmount);
  const lines = [createJournalLine(receivableAccountNumber, 1, totalAmount, 0, "AR_INVOICE", openItem.arOpenItemId, buildOpenItemJournalOptions({
    openItem,
    debitAmount: totalAmount,
    creditAmount: 0
  }))];
  let lineNumber = 2;
  if (feeAmount > 0) {
    lines.push(createJournalLine("3520", lineNumber, 0, feeAmount, "AR_INVOICE", openItem.arOpenItemId, buildOpenItemJournalOptions({
      openItem,
      debitAmount: 0,
      creditAmount: feeAmount
    })));
    lineNumber += 1;
  }
  if (interestAmount > 0) {
    lines.push(createJournalLine("3530", lineNumber, 0, interestAmount, "AR_INVOICE", openItem.arOpenItemId, buildOpenItemJournalOptions({
      openItem,
      debitAmount: 0,
      creditAmount: interestAmount
    })));
  }
  return lines;
}

function resolveBadDebtVatAdjustment({
  state,
  vatPlatform,
  ledgerPlatform,
  companyId,
  openItem,
  writeoffAmount,
  writeoffDate,
  actorId,
  correlationId
}) {
  if (!vatPlatform || typeof vatPlatform.evaluateVatDecision !== "function" || typeof vatPlatform.getVatDecision !== "function") {
    throw createError(500, "vat_platform_missing", "VAT platform is required for bad-debt VAT relief.");
  }
  if (!openItem.customerInvoiceId) {
    throw createError(409, "bad_debt_vat_review_required", "Bad-debt VAT relief requires an originating customer invoice.");
  }
  const invoice = requireInvoiceRecord(state, companyId, openItem.customerInvoiceId);
  if (invoice.invoiceType !== "standard" || !invoice.journalEntryId) {
    throw createError(409, "bad_debt_vat_review_required", "Bad-debt VAT relief only supports posted standard invoices.");
  }
  if (
    roundMoney(writeoffAmount) !== roundMoney(openItem.openAmount) ||
    roundMoney(writeoffAmount) !== roundMoney(invoice.remainingAmount) ||
    roundMoney(openItem.originalAmount) !== roundMoney(invoice.totals.grossAmount) ||
    roundMoney(openItem.openAmount) !== roundMoney(invoice.totals.grossAmount)
  ) {
    throw createError(
      409,
      "bad_debt_vat_review_required",
      "Bad-debt VAT relief currently requires a full write-off of an untouched unpaid invoice."
    );
  }
  if (
    roundMoney(openItem.paidAmount || 0) > 0 ||
    roundMoney(openItem.creditedAmount || 0) > 0 ||
    roundMoney(openItem.writeoffAmount || 0) > 0 ||
    roundMoney(invoice.creditedAmount || 0) > 0
  ) {
    throw createError(
      409,
      "bad_debt_vat_review_required",
      "Bad-debt VAT relief requires an unpaid invoice without prior settlements, credits or write-offs."
    );
  }

  const accountingCurrencyCode = resolveLedgerFunctionalCurrencyCode({ ledgerPlatform, companyId });
  const usesForeignCurrency = invoice.currencyCode !== accountingCurrencyCode;
  const exchangeRate = usesForeignCurrency ? normalizePositiveNumber(invoice.exchangeRate, "invoice_exchange_rate_required") : null;
  const functionalVatAmounts = usesForeignCurrency
    ? allocateFunctionalVatAmounts({
        invoice,
        accountingCurrencyCode,
        exchangeRate
      })
    : (invoice.lines || []).map((line) => calculateInvoiceLineOutputVatAmount(line));
  const vatReliefLineMap = new Map();
  const vatDecisionIds = [];
  let totalVatReliefAmount = 0;
  let totalFunctionalVatReliefAmount = 0;

  for (const [index, line] of (invoice.lines || []).entries()) {
    const vatAmount = calculateInvoiceLineOutputVatAmount(line);
    if (vatAmount <= 0) {
      continue;
    }
    if (!line.vatDecisionId) {
      throw createError(
        409,
        "bad_debt_vat_review_required",
        `Bad-debt VAT relief requires original VAT decision references for VAT-bearing line ${line.lineNumber}.`
      );
    }
    const originalDecision = vatPlatform.getVatDecision({
      companyId,
      vatDecisionId: line.vatDecisionId
    });
    const vatDecisionResult = vatPlatform.evaluateVatDecision({
      companyId,
      actorId,
      correlationId,
      transactionLine: {
        ...(originalDecision.transactionLine || {}),
        source_type: "AR_BAD_DEBT_ADJUSTMENT",
        source_id: `ar_writeoff_bad_debt:${openItem.arOpenItemId}:${writeoffDate}:${roundMoney(writeoffAmount)}:${line.lineId}`,
        invoice_date: writeoffDate,
        tax_date: writeoffDate,
        credit_note_flag: false,
        bad_debt_adjustment_flag: true,
        original_vat_decision_id: line.vatDecisionId,
        line_amount_ex_vat: originalDecision.transactionLine?.line_amount_ex_vat ?? line.lineAmount,
        line_quantity: originalDecision.transactionLine?.line_quantity ?? line.quantity,
        vat_rate: originalDecision.transactionLine?.vat_rate ?? line.vatEffectiveRate ?? resolveVatRate(vatPlatform, companyId, line.vatCode),
        vat_code_candidate: originalDecision.transactionLine?.vat_code_candidate ?? line.vatCode,
        project_id: originalDecision.transactionLine?.project_id ?? line.projectId ?? null
      }
    });
    if (vatDecisionResult.reviewQueueItem || vatDecisionResult.vatDecision.status !== "decided") {
      throw createError(
        409,
        "bad_debt_vat_review_required",
        `Bad-debt VAT relief is blocked until VAT review is resolved for line ${line.lineNumber}.`
      );
    }

    const vatAccountNumber = resolveOutputVatAccountNumber(line.vatEffectiveRate);
    if (!vatAccountNumber) {
      throw createError(
        409,
        "bad_debt_vat_review_required",
        `Bad-debt VAT relief is missing an output VAT account for line ${line.lineNumber}.`
      );
    }
    const functionalVatAmount = roundMoney(functionalVatAmounts[index] || 0);
    const existingLine = vatReliefLineMap.get(vatAccountNumber) || {
      accountNumber: vatAccountNumber,
      amount: 0,
      functionalAmount: 0,
      vatDecisionIds: []
    };
    existingLine.amount = roundMoney(existingLine.amount + vatAmount);
    existingLine.functionalAmount = roundMoney(existingLine.functionalAmount + functionalVatAmount);
    existingLine.vatDecisionIds.push(vatDecisionResult.vatDecision.vatDecisionId);
    vatReliefLineMap.set(vatAccountNumber, existingLine);
    totalVatReliefAmount = roundMoney(totalVatReliefAmount + vatAmount);
    totalFunctionalVatReliefAmount = roundMoney(totalFunctionalVatReliefAmount + functionalVatAmount);
    vatDecisionIds.push(vatDecisionResult.vatDecision.vatDecisionId);
  }

  if (totalVatReliefAmount <= 0) {
    throw createError(
      409,
      "bad_debt_vat_not_applicable",
      "Bad-debt VAT relief can only be applied to invoices with output VAT."
    );
  }

  const functionalWriteoffAmount = resolveFunctionalAmount({ amount: writeoffAmount, openItem });
  const netLossAmount = roundMoney(writeoffAmount - totalVatReliefAmount);
  const functionalNetLossAmount = roundMoney(functionalWriteoffAmount - totalFunctionalVatReliefAmount);
  if (netLossAmount < 0 || functionalNetLossAmount < 0) {
    throw createError(
      409,
      "bad_debt_vat_amount_invalid",
      "Bad-debt VAT relief exceeds the write-off amount."
    );
  }

  return {
    vatDecisionIds,
    vatReliefAmount: totalVatReliefAmount,
    functionalVatReliefAmount: totalFunctionalVatReliefAmount,
    functionalWriteoffAmount,
    netLossAmount,
    functionalNetLossAmount,
    vatReliefLines: [...vatReliefLineMap.values()]
  };
}

function buildWriteoffJournalLines({ openItem, ledgerAccountNumber, writeoffAmount, badDebtVatAdjustment = null }) {
  return [
    ...(badDebtVatAdjustment == null
      ? [
          createJournalLine(
            ledgerAccountNumber,
            1,
            writeoffAmount,
            0,
            "MANUAL_JOURNAL",
            openItem.arOpenItemId,
            buildOpenItemJournalOptions({
              openItem,
              debitAmount: writeoffAmount,
              creditAmount: 0
            })
          ),
          createJournalLine(
            resolveOpenItemReceivableAccount(openItem),
            2,
            0,
            writeoffAmount,
            "MANUAL_JOURNAL",
            openItem.arOpenItemId,
            buildOpenItemJournalOptions({
              openItem,
              debitAmount: 0,
              creditAmount: writeoffAmount
            })
          )
        ]
      : buildBadDebtWriteoffJournalLines({
          openItem,
          ledgerAccountNumber,
          writeoffAmount,
          badDebtVatAdjustment
        }))
  ];
}

function buildBadDebtWriteoffJournalLines({ openItem, ledgerAccountNumber, writeoffAmount, badDebtVatAdjustment }) {
  const lines = [];
  let lineNumber = 1;
  if (badDebtVatAdjustment.netLossAmount > 0) {
    lines.push(
      createJournalLine(
        ledgerAccountNumber,
        lineNumber++,
        badDebtVatAdjustment.netLossAmount,
        0,
        "MANUAL_JOURNAL",
        openItem.arOpenItemId,
        buildOpenItemJournalOptions({
          openItem,
          debitAmount: badDebtVatAdjustment.netLossAmount,
          creditAmount: 0,
          functionalDebitAmount: badDebtVatAdjustment.functionalNetLossAmount
        })
      )
    );
  }
  for (const vatLine of badDebtVatAdjustment.vatReliefLines) {
    lines.push(
      createJournalLine(
        vatLine.accountNumber,
        lineNumber++,
        vatLine.amount,
        0,
        "MANUAL_JOURNAL",
        vatLine.vatDecisionIds[0] || openItem.arOpenItemId,
        buildOpenItemJournalOptions({
          openItem,
          debitAmount: vatLine.amount,
          creditAmount: 0,
          functionalDebitAmount: vatLine.functionalAmount
        })
      )
    );
  }
  lines.push(
    createJournalLine(
      resolveOpenItemReceivableAccount(openItem),
      lineNumber,
      0,
      writeoffAmount,
      "MANUAL_JOURNAL",
      openItem.arOpenItemId,
      buildOpenItemJournalOptions({
        openItem,
        debitAmount: 0,
        creditAmount: writeoffAmount,
        functionalCreditAmount: badDebtVatAdjustment.functionalWriteoffAmount
      })
    )
  );
  return lines;
}

function postArJournal({
  ledgerPlatform,
  companyId,
  journalDate,
  recipeCode,
  postingSignalCode = null,
  voucherSeriesCode = null,
  voucherSeriesPurposeCode = null,
  fallbackVoucherSeriesCode = null,
  sourceType,
  sourceId,
  sourceObjectVersion = null,
  actorId,
  approvedByActorId = null,
  approvedByRoleCode = null,
  idempotencyKey,
  description,
  lines
}) {
  const posted = ledgerPlatform.applyPostingIntent({
    companyId,
    journalDate,
    recipeCode,
    postingSignalCode,
    voucherSeriesCode,
    voucherSeriesPurposeCode,
    fallbackVoucherSeriesCode,
    sourceType,
    sourceId,
    sourceObjectVersion,
    actorId,
    approvedByActorId,
    approvedByRoleCode,
    idempotencyKey,
    description,
    lines
  });
  return posted.journalEntry;
}

function listEligibleOpenItemsForDunning(state, companyId, runDate) {
  return (state.openItemIdsByCompany.get(companyId) || [])
    .map((arOpenItemId) => state.openItems.get(arOpenItemId))
    .filter(Boolean)
    .filter((openItem) => openItem.openAmount > 0 && openItem.dueOn && openItem.dueOn < runDate)
    .sort((left, right) => left.dueOn.localeCompare(right.dueOn));
}

function isDunningStageEligible(currentStageCode, nextStageCode) {
  if (nextStageCode === "stage_1") {
    return currentStageCode === "none";
  }
  if (nextStageCode === "stage_2") {
    return currentStageCode === "stage_1";
  }
  if (nextStageCode === "escalated") {
    return currentStageCode === "stage_2";
  }
  return false;
}

function calculateLateInterestAmount(openAmount, dueOn, runDate, annualInterestRatePercent) {
  const overdueDays = Math.max(0, diffDays(runDate, dueOn));
  if (overdueDays <= 0) {
    return 0;
  }
  return roundMoney((roundMoney(openAmount) * Number(annualInterestRatePercent || 0) * overdueDays) / 36500);
}

function resolveStatutoryInterestPercent(runDate) {
  return roundMoney(resolveReferenceRatePercent(runDate) + DEFAULT_STATUTORY_INTEREST_PERCENT);
}

function resolveReferenceRatePercent(runDate) {
  const resolvedRunDate = normalizeDate(runDate, "ar_reference_rate_date_invalid");
  let matchedReferenceRate = 0;
  for (const baseline of STATUTORY_REFERENCE_RATE_BASELINES) {
    if (baseline.effectiveFrom <= resolvedRunDate) {
      matchedReferenceRate = baseline.referenceRatePercent;
    }
  }
  return matchedReferenceRate;
}

function firstDayOfMonthIso(date) {
  const [year, month] = normalizeDate(date, "month_date_invalid").split("-").map(Number);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
}

function diffDays(leftDate, rightDate) {
  const left = new Date(`${normalizeDate(leftDate, "left_date_invalid")}T00:00:00.000Z`);
  const right = new Date(`${normalizeDate(rightDate, "right_date_invalid")}T00:00:00.000Z`);
  return Math.floor((left.getTime() - right.getTime()) / 86400000);
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

function requireInvoiceRecord(state, companyId, customerInvoiceId) {
  const invoice = state.invoices.get(requireText(customerInvoiceId, "customer_invoice_id_required"));
  if (!invoice || invoice.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "customer_invoice_not_found", "Customer invoice was not found.");
  }
  return invoice;
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
    commercialSnapshotHash: buildCommercialSnapshotHash({
      currencyCode: normalizedCurrencyCode,
      lines: normalizedLines
    }),
    sourceSnapshotHash: hashObject({
      title,
      validUntil: normalizedValidUntil,
      currencyCode: normalizedCurrencyCode,
      discountModel,
      priceListId,
      lines: normalizedLines
    }),
    sentAt: null,
    acceptedAt: null,
    rejectedAt: null,
    expiredAt: null,
    convertedAt: null,
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
  const goodsOrServices =
    normalizeOptionalText(line.goodsOrServices)?.toLowerCase() === "goods" || item?.itemType === "goods" ? "goods" : "services";
  return {
    lineId: crypto.randomUUID(),
    lineNumber,
    itemId: item?.arItemId || null,
    itemCode: item?.itemCode || normalizeOptionalText(line.itemCode),
    itemType: item?.itemType || normalizeOptionalText(line.itemType) || null,
    projectId: normalizeOptionalText(line.projectId),
    costCenterCode: normalizeOptionalText(line.costCenterCode || item?.costCenterCode),
    businessAreaCode: normalizeOptionalText(line.businessAreaCode || item?.businessAreaCode),
    serviceLineCode: normalizeOptionalText(line.serviceLineCode || item?.serviceLineCode),
    goodsOrServices,
    description,
    quantity,
    unitCode: requireText(line.unitCode || item?.unitCode || "ea", "commercial_line_unit_required"),
    unitPrice,
    lineAmount: roundMoney(quantity * unitPrice),
    revenueAccountNumber,
    vatCode,
    vatDecisionId: null,
    vatReviewQueueItemId: null,
    vatDecisionCategory: null,
    vatDeclarationBoxCodes: [],
    vatEffectiveRate: null,
    vatPostingEntries: [],
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
  version.convertedAt = version.convertedAt || nowIso(clock);
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

function calculateInvoiceTotals({ vatPlatform, companyId, lines }) {
  const netAmount = roundMoney(lines.reduce((sum, line) => sum + Number(line.lineAmount || 0), 0));
  const vatAmount = roundMoney(
    lines.reduce((sum, line) => sum + calculateVatAmount(resolveVatRate(vatPlatform, companyId, line.vatCode), line.lineAmount), 0)
  );
  return {
    netAmount,
    vatAmount,
    grossAmount: roundMoney(netAmount + vatAmount)
  };
}

function resolveVatRate(vatPlatform, companyId, vatCode) {
  if (!vatPlatform || typeof vatPlatform.listVatCodes !== "function") {
    return 0;
  }
  const vatCodeDefinition = vatPlatform.listVatCodes({ companyId }).find((candidate) => candidate.vatCode === vatCode);
  return Number(vatCodeDefinition?.vatRate || 0);
}

function calculateVatAmount(vatRate, netAmount) {
  if (!vatRate) {
    return 0;
  }
  return roundMoney(Number(netAmount || 0) * (vatRate / 100));
}

function evaluateInvoiceVatDecisions({
  vatPlatform,
  companyId,
  invoice,
  customer,
  originalInvoice = null,
  actorId,
  correlationId
}) {
  if (!vatPlatform || typeof vatPlatform.evaluateVatDecision !== "function") {
    throw createError(500, "vat_platform_missing", "VAT platform is required to issue invoices.");
  }
  return (invoice.lines || []).map((line, index) => {
    const originalLine = invoice.invoiceType === "credit_note" ? originalInvoice?.lines?.[index] || null : null;
    const reverseChargeFlag = typeof line.vatCode === "string" && line.vatCode.includes("_RC_");
    const exportFlag = typeof line.vatCode === "string" && line.vatCode.includes("EXPORT");
    const ossFlag = typeof line.vatCode === "string" && line.vatCode.includes("OSS");
    const iossFlag = typeof line.vatCode === "string" && line.vatCode.includes("IOSS");
    const constructionServiceFlag =
      typeof line.vatCode === "string" && (line.vatCode.includes("RC_BUILD") || line.vatCode.includes("BUILD"));
    const vatEvaluation = vatPlatform.evaluateVatDecision({
      companyId,
      actorId,
      correlationId,
      transactionLine: {
        source_type: invoice.invoiceType === "credit_note" ? "AR_CREDIT_NOTE" : "AR_INVOICE",
        source_id: `${invoice.customerInvoiceId}:${line.lineId}`,
        supply_type: "sale",
        seller_country: "SE",
        seller_vat_registration_country: "SE",
        buyer_country: customer.countryCode || "SE",
        goods_or_services: line.goodsOrServices || "services",
        invoice_date: invoice.issueDate,
        delivery_date: invoice.deliveryDate || invoice.supplyDate || invoice.issueDate,
        tax_date: invoice.supplyDate || invoice.issueDate,
        prepayment_date: invoice.issueDate,
        currency: invoice.currencyCode || "SEK",
        line_amount_ex_vat: line.lineAmount,
        line_quantity: line.quantity,
        vat_rate: resolveVatRate(vatPlatform, companyId, line.vatCode),
        vat_code_candidate: line.vatCode,
        buyer_is_taxable_person: Boolean(invoice.buyerVatNumber),
        buyer_vat_number: invoice.buyerVatNumber || null,
        buyer_vat_number_status: invoice.buyerVatNumberStatus || null,
        import_flag: false,
        reverse_charge_flag: reverseChargeFlag,
        export_flag: exportFlag,
        oss_flag: ossFlag,
        ioss_flag: iossFlag,
        construction_service_flag: constructionServiceFlag,
        credit_note_flag: invoice.invoiceType === "credit_note",
        original_vat_decision_id: originalLine?.vatDecisionId || null,
        project_id: line.projectId || null
      }
    });
    const vatDecision = vatEvaluation.vatDecision;
    if (vatDecision.status !== "decided" || vatEvaluation.reviewQueueItem) {
      throw createError(
        409,
        "invoice_issue_blocked",
        `Invoice cannot be issued before VAT decision blockers are resolved for line ${line.lineNumber}.`
      );
    }
    line.vatDecisionId = vatDecision.vatDecisionId;
    line.vatReviewQueueItemId = vatEvaluation.reviewQueueItem?.vatReviewQueueItemId || null;
    line.vatDecisionCategory = vatDecision.outputs?.decisionCategory || vatDecision.decisionCategory || null;
    line.vatDeclarationBoxCodes = copy(vatDecision.outputs?.declarationBoxCodes || vatDecision.declarationBoxCodes || []);
    line.vatEffectiveRate = Number(vatDecision.outputs?.vatRate ?? vatDecision.vatRate ?? 0);
    line.vatPostingEntries = copy(vatDecision.outputs?.postingEntries || vatDecision.postingEntries || []);
    return vatDecision;
  });
}

function calculateInvoiceLineOutputVatAmount(line) {
  return roundMoney(
    (line.vatPostingEntries || []).reduce((sum, entry) => {
      if (entry.vatEffect !== "output_vat") {
        return sum;
      }
      return sum + Math.abs(Number(entry.amount || 0));
    }, 0)
  );
}

function buildInvoiceJournalLines({ invoice, customer, ledgerPlatform = null }) {
  const sourceType = resolveInvoiceSourceType(invoice.invoiceType);
  const receivableAccountNumber = resolveCustomerReceivableAccount(customer);
  const accountingCurrencyCode = resolveLedgerFunctionalCurrencyCode({ ledgerPlatform, companyId: invoice.companyId });
  const usesForeignCurrency = invoice.currencyCode !== accountingCurrencyCode;
  const exchangeRate =
    usesForeignCurrency
      ? normalizePositiveNumber(invoice.exchangeRate, "invoice_exchange_rate_required")
      : null;
  const journalLines = [];
  const functionalVatAmounts = usesForeignCurrency
    ? allocateFunctionalVatAmounts({
      invoice,
      accountingCurrencyCode,
      exchangeRate
    })
    : (invoice.lines || []).map((line) => calculateInvoiceLineOutputVatAmount(line));
  let lineNumber = 1;
  let totalDebit = 0;
  let totalCredit = 0;

  for (const [index, line] of (invoice.lines || []).entries()) {
    const vatAmount = calculateInvoiceLineOutputVatAmount(line);
    const functionalVatAmount = functionalVatAmounts[index] || 0;
    const functionalRevenueAmount = usesForeignCurrency ? roundMoney(line.lineAmount * exchangeRate) : line.lineAmount;
    const vatAccountNumber = resolveOutputVatAccountNumber(line.vatEffectiveRate);
    if (vatAmount > 0 && !vatAccountNumber) {
      throw createError(409, "invoice_issue_blocked", `Invoice VAT account mapping is missing for line ${line.lineNumber}.`);
    }
    if (invoice.invoiceType === "credit_note") {
      journalLines.push(
        createJournalLine(line.revenueAccountNumber, lineNumber, line.lineAmount, 0, sourceType, line.lineId, {
          dimensionJson: buildRevenueDimensionJson({ companyId: invoice.companyId, ledgerPlatform, line }),
          currencyCode: invoice.currencyCode,
          exchangeRate,
          functionalDebitAmount: functionalRevenueAmount
        })
      );
      totalDebit += functionalRevenueAmount;
      lineNumber += 1;
      if (vatAmount > 0 && vatAccountNumber) {
        journalLines.push(createJournalLine(vatAccountNumber, lineNumber, vatAmount, 0, sourceType, line.vatDecisionId || line.lineId, {
          currencyCode: invoice.currencyCode,
          exchangeRate,
          functionalDebitAmount: functionalVatAmount
        }));
        totalDebit += functionalVatAmount;
        lineNumber += 1;
      }
      continue;
    }

    journalLines.push(
      createJournalLine(line.revenueAccountNumber, lineNumber, 0, line.lineAmount, sourceType, line.lineId, {
        dimensionJson: buildRevenueDimensionJson({ companyId: invoice.companyId, ledgerPlatform, line }),
        currencyCode: invoice.currencyCode,
        exchangeRate,
        functionalCreditAmount: functionalRevenueAmount
      })
    );
    totalCredit += functionalRevenueAmount;
    lineNumber += 1;
    if (vatAmount > 0 && vatAccountNumber) {
      journalLines.push(createJournalLine(vatAccountNumber, lineNumber, 0, vatAmount, sourceType, line.vatDecisionId || line.lineId, {
        currencyCode: invoice.currencyCode,
        exchangeRate,
        functionalCreditAmount: functionalVatAmount
      }));
      totalCredit += functionalVatAmount;
      lineNumber += 1;
    }
  }

  const receivableAmount = roundMoney(Math.abs(totalCredit - totalDebit));
  if (invoice.invoiceType === "credit_note") {
    journalLines.unshift(createJournalLine(receivableAccountNumber, 0, 0, invoice.totals.grossAmount, sourceType, invoice.customerInvoiceId, {
      currencyCode: invoice.currencyCode,
      exchangeRate,
      functionalCreditAmount: receivableAmount
    }));
  } else {
    journalLines.unshift(createJournalLine(receivableAccountNumber, 0, invoice.totals.grossAmount, 0, sourceType, invoice.customerInvoiceId, {
      currencyCode: invoice.currencyCode,
      exchangeRate,
      functionalDebitAmount: receivableAmount
    }));
  }
  return journalLines.map((line, index) => ({
    ...line,
    lineNumber: index + 1
  }));
}

function evaluateInvoiceFieldRulesSnapshot({
  state,
  clock,
  vatPlatform,
  ledgerPlatform,
  invoice,
  customer,
  originalInvoice = null,
  actorId = "system"
}) {
  const scenarioCode = resolveInvoiceLegalScenarioCode({ invoice, customer });
  const missingFieldCodes = [];
  const warningCodes = [];
  const requiredFieldCodes = collectRequiredInvoiceFieldCodes({ scenarioCode, invoice, customer, vatPlatform, ledgerPlatform });
  const hasPositiveVat = (invoice.lines || []).some(
    (line) => resolveVatRate(vatPlatform, invoice.companyId, line.vatCode) > 0
  );

  if (!invoice.sellerLegalName) {
    missingFieldCodes.push("seller_identity");
  }
  if (!invoice?.sellerAddress?.line1 || !invoice?.sellerAddress?.postalCode || !invoice?.sellerAddress?.city) {
    missingFieldCodes.push("seller_address");
  }
  if (!invoice.sellerVatNumber) {
    missingFieldCodes.push("seller_vat_number");
  }
  if (!invoice.issueDate) {
    missingFieldCodes.push("issue_date");
  }
  if (!invoice.dueDate) {
    missingFieldCodes.push("due_date");
  }
  if (!invoice.supplyDate) {
    missingFieldCodes.push("supply_date");
  }
  if (!Array.isArray(invoice.lines) || invoice.lines.length === 0) {
    missingFieldCodes.push("invoice_lines");
  }
  if (!customer?.legalName) {
    missingFieldCodes.push("buyer_identity");
  }
  if (!customer?.billingAddress?.line1 || !customer?.billingAddress?.postalCode || !customer?.billingAddress?.city) {
    missingFieldCodes.push("buyer_address");
  }
  if ((invoice.lines || []).some((line) => !line.vatCode)) {
    missingFieldCodes.push("line_vat_code");
  }
  const governedDimensionRequirements = collectInvoiceDimensionRequirements({
    ledgerPlatform,
    companyId: invoice.companyId,
    invoiceLines: invoice.lines || []
  });
  for (const requiredFieldCode of governedDimensionRequirements.requiredFieldCodes) {
    if (governedDimensionRequirements.missingFieldCodes.has(requiredFieldCode)) {
      missingFieldCodes.push(requiredFieldCode);
    }
    requiredFieldCodes.push(requiredFieldCode);
  }
  if (invoice.invoiceType === "credit_note") {
    if (!invoice.originalInvoiceId || !originalInvoice) {
      missingFieldCodes.push("original_invoice_reference");
    }
    if (!invoice.amendmentReason) {
      missingFieldCodes.push("amendment_reason");
    }
  }
  if (scenarioCode === "reverse_charge_invoice") {
    if (!invoice.buyerVatNumber) {
      missingFieldCodes.push("buyer_vat_number");
    }
    if (!invoice.specialLegalText) {
      missingFieldCodes.push("special_legal_text");
    }
  }
  if (scenarioCode === "export_invoice") {
    if (!invoice.deliveryDate) {
      missingFieldCodes.push("delivery_date");
    }
    if (!invoice.exportEvidenceReference) {
      missingFieldCodes.push("export_evidence_reference");
    }
    if (!invoice.specialLegalText) {
      missingFieldCodes.push("special_legal_text");
    }
  }
  if (invoice.husCaseId) {
    if (!invoice.husPropertyDesignation) {
      missingFieldCodes.push("hus_property_designation");
    }
    if (!invoice.husBuyerIdentityNumber) {
      missingFieldCodes.push("hus_buyer_identity_number");
    }
    if (!invoice.husServiceTypeCode) {
      missingFieldCodes.push("hus_service_type_code");
    }
  }
  if (invoice.currencyCode !== "SEK" && hasPositiveVat && invoice.currencyVatAmountSek == null) {
    missingFieldCodes.push("currency_vat_amount_sek");
  }
  if (invoice.currencyCode !== resolveLedgerFunctionalCurrencyCode({ ledgerPlatform, companyId: invoice.companyId }) && !invoice.exchangeRate) {
    missingFieldCodes.push("exchange_rate");
  }
  if (scenarioCode === "eu_cross_border_invoice" && !invoice.buyerVatNumber) {
    missingFieldCodes.push("buyer_vat_number");
  }
  if (scenarioCode === "eu_cross_border_invoice" && !invoice.buyerVatNumber) {
    warningCodes.push("buyer_vat_number_missing_review");
  }
  if (scenarioCode === "eu_cross_border_invoice" && invoiceRequiresValidatedEuVatNumber(invoice) && invoice.buyerVatNumberStatus !== "valid") {
    missingFieldCodes.push("buyer_vat_number_status_valid");
    warningCodes.push("buyer_vat_number_vies_validation_required");
  }

  const dedupedMissingFieldCodes = [...new Set(missingFieldCodes)].sort();
  const status = dedupedMissingFieldCodes.length > 0 ? "blocked" : "passed";
  return {
    invoiceFieldEvaluationId: crypto.randomUUID(),
    companyId: invoice.companyId,
    customerInvoiceId: invoice.customerInvoiceId,
    scenarioCode,
    rulepackVersion: "RP-INVOICE-FIELD-RULES-SE@2026.1",
    status,
    blockingRuleCount: dedupedMissingFieldCodes.length,
    requiredFieldCodes,
    missingFieldCodes: dedupedMissingFieldCodes,
    warningCodes: [...new Set(warningCodes)].sort(),
    evaluatedByActorId: requireText(actorId, "actor_id_required"),
    evaluatedAt: nowIso(clock),
    evidence: {
      invoiceType: invoice.invoiceType,
      sellerLegalName: invoice.sellerLegalName || null,
      sellerOrganizationNumber: invoice.sellerOrganizationNumber || null,
      sellerVatNumber: invoice.sellerVatNumber || null,
      sellerAddress: copy(invoice.sellerAddress || null),
      customerCountryCode: customer.countryCode,
      buyerVatNumber: invoice.buyerVatNumber || null,
      buyerVatNumberStatus: invoice.buyerVatNumberStatus || null,
      invoiceLineVatCodes: (invoice.lines || []).map((line) => line.vatCode),
      revenueDimensions: (invoice.lines || []).map((line) => ({
        lineId: line.lineId,
        projectId: line.projectId || null,
        costCenterCode: line.costCenterCode || null,
        businessAreaCode: line.businessAreaCode || null,
        serviceLineCode: line.serviceLineCode || null
      })),
      husCaseId: invoice.husCaseId || null,
      originalInvoiceId: invoice.originalInvoiceId || null
    }
  };
}

function resolveInvoiceLegalScenarioCode({ invoice, customer }) {
  if (invoice.husCaseId) {
    return "hus_invoice";
  }
  if (invoice.invoiceType === "credit_note") {
    return "amendment_invoice";
  }
  const vatCodes = new Set((invoice.lines || []).map((line) => normalizeOptionalText(line.vatCode)).filter(Boolean));
  if ([...vatCodes].some((vatCode) => vatCode.includes("_RC_"))) {
    return "reverse_charge_invoice";
  }
  if ([...vatCodes].some((vatCode) => vatCode.includes("EXPORT"))) {
    return "export_invoice";
  }
  if (customer.countryCode !== "SE" && EU_COUNTRY_CODES.has(customer.countryCode)) {
    return "eu_cross_border_invoice";
  }
  return "standard_full_invoice";
}

function collectRequiredInvoiceFieldCodes({ scenarioCode, invoice, customer, vatPlatform, ledgerPlatform = null }) {
  const requiredFieldCodes = [
    "seller_identity",
    "seller_address",
    "seller_vat_number",
    "issue_date",
    "due_date",
    "supply_date",
    "invoice_lines",
    "buyer_identity",
    "buyer_address",
    "line_vat_code"
  ];
  if (invoice.invoiceType === "credit_note") {
    requiredFieldCodes.push("original_invoice_reference", "amendment_reason");
  }
  if (scenarioCode === "reverse_charge_invoice") {
    requiredFieldCodes.push("buyer_vat_number", "special_legal_text");
  }
  if (scenarioCode === "export_invoice") {
    requiredFieldCodes.push("delivery_date", "export_evidence_reference", "special_legal_text");
  }
  if (scenarioCode === "hus_invoice") {
    requiredFieldCodes.push("hus_property_designation", "hus_buyer_identity_number", "hus_service_type_code");
  }
  if (invoice.currencyCode !== "SEK" && (invoice.lines || []).some((line) => resolveVatRate(vatPlatform, invoice.companyId, line.vatCode) > 0)) {
    requiredFieldCodes.push("currency_vat_amount_sek");
  }
  if (invoice.currencyCode !== resolveLedgerFunctionalCurrencyCode({ ledgerPlatform, companyId: invoice.companyId })) {
    requiredFieldCodes.push("exchange_rate");
  }
  if (scenarioCode === "eu_cross_border_invoice" && customer.countryCode !== "SE") {
    requiredFieldCodes.push("buyer_vat_number");
    if (invoiceRequiresValidatedEuVatNumber(invoice)) {
      requiredFieldCodes.push("buyer_vat_number_status_valid");
    }
  }
  return [...new Set(requiredFieldCodes)].sort();
}

function createJournalLine(
  accountNumber,
  lineNumber,
  debitAmount,
  creditAmount,
  sourceType,
  sourceId,
  {
    dimensionJson = null,
    currencyCode = null,
    exchangeRate = null,
    functionalDebitAmount = null,
    functionalCreditAmount = null
  } = {}
) {
  const record = {
    accountNumber,
    debitAmount: roundMoney(debitAmount),
    creditAmount: roundMoney(creditAmount),
    sourceType,
    sourceId,
    lineNumber
  };
  if (dimensionJson && Object.keys(dimensionJson).length > 0) {
    record.dimensionJson = dimensionJson;
  }
  if (currencyCode) {
    record.currencyCode = currencyCode;
  }
  if (exchangeRate != null) {
    record.exchangeRate = roundMoney(exchangeRate * 1000000) / 1000000;
  }
  if (functionalDebitAmount != null) {
    record.functionalDebitAmount = roundMoney(functionalDebitAmount);
  }
  if (functionalCreditAmount != null) {
    record.functionalCreditAmount = roundMoney(functionalCreditAmount);
  }
  return record;
}

function allocateFunctionalVatAmounts({ invoice, accountingCurrencyCode, exchangeRate }) {
  const vatAmounts = (invoice.lines || []).map((line) => calculateInvoiceLineOutputVatAmount(line));
  if (!vatAmounts.some((amount) => amount > 0)) {
    return vatAmounts.map(() => 0);
  }
  const usesExplicitSekVatAmount = accountingCurrencyCode === "SEK" && invoice.currencyVatAmountSek != null;
  if (!usesExplicitSekVatAmount) {
    return vatAmounts.map((amount) => roundMoney(amount * exchangeRate));
  }
  const targetTotal = roundMoney(invoice.currencyVatAmountSek);
  const sourceTotal = roundMoney(vatAmounts.reduce((sum, amount) => sum + amount, 0));
  const positiveVatIndexes = vatAmounts
    .map((amount, index) => (amount > 0 ? index : null))
    .filter((index) => index != null);
  const lastPositiveVatIndex = positiveVatIndexes[positiveVatIndexes.length - 1];
  let allocated = 0;
  return vatAmounts.map((amount, index) => {
    if (amount <= 0) {
      return 0;
    }
    if (index === lastPositiveVatIndex || sourceTotal === 0) {
      return roundMoney(targetTotal - allocated);
    }
    const functionalAmount = roundMoney(targetTotal * (amount / sourceTotal));
    allocated = roundMoney(allocated + functionalAmount);
    return functionalAmount;
  });
}

function resolveLedgerFunctionalCurrencyCode({ ledgerPlatform, companyId }) {
  if (!ledgerPlatform || typeof ledgerPlatform.getAccountingCurrencyProfile !== "function") {
    return "SEK";
  }
  return ledgerPlatform.getAccountingCurrencyProfile({ companyId }).accountingCurrencyCode || "SEK";
}

function calculateInvoiceFunctionalGrossAmount({ invoice, functionalCurrencyCode }) {
  const exchangeRate = resolveFunctionalExchangeRate({ invoice, functionalCurrencyCode });
  const usesForeignCurrency = invoice.currencyCode !== functionalCurrencyCode;
  if (!usesForeignCurrency) {
    return roundMoney(invoice.totals.grossAmount);
  }
  const functionalNetAmount = roundMoney((invoice.lines || []).reduce((sum, line) => sum + roundMoney(line.lineAmount * exchangeRate), 0));
  const hasPositiveVat = (invoice.lines || []).some((line) => calculateInvoiceLineOutputVatAmount(line) > 0);
  const functionalVatAmount =
    functionalCurrencyCode === "SEK" && hasPositiveVat && invoice.currencyVatAmountSek != null
      ? roundMoney(invoice.currencyVatAmountSek)
      : roundMoney((invoice.lines || []).reduce((sum, line) => sum + roundMoney(calculateInvoiceLineOutputVatAmount(line) * exchangeRate), 0));
  return roundMoney(functionalNetAmount + functionalVatAmount);
}

function resolveFunctionalExchangeRate({ invoice, functionalCurrencyCode }) {
  if (invoice.currencyCode === functionalCurrencyCode) {
    return 1;
  }
  return normalizePositiveNumber(invoice.exchangeRate, "invoice_exchange_rate_required");
}

function resolveFunctionalAmount({ amount, openItem }) {
  const normalizedAmount = roundMoney(amount);
  const functionalCurrencyCode = openItem.functionalCurrencyCode || "SEK";
  if ((openItem.currencyCode || functionalCurrencyCode) === functionalCurrencyCode) {
    return normalizedAmount;
  }
  return roundMoney(normalizedAmount * Number(openItem.functionalExchangeRate || 1));
}

function resolveOptionalSettlementExchangeRate({
  openItem,
  currencyCode,
  settlementExchangeRate,
  functionalReceiptAmount,
  receiptAmount
}) {
  const normalizedCurrencyCode = normalizeUpperCode(currencyCode || openItem.currencyCode || "SEK", "currency_code_required", 3);
  const functionalCurrencyCode = openItem.functionalCurrencyCode || "SEK";
  if (normalizedCurrencyCode === functionalCurrencyCode) {
    return null;
  }
  if (settlementExchangeRate != null && settlementExchangeRate !== "") {
    return normalizePositiveNumber(settlementExchangeRate, "ar_settlement_exchange_rate_invalid");
  }
  if (functionalReceiptAmount != null && Number(receiptAmount || 0) > 0) {
    return roundMoney(Number(functionalReceiptAmount) / Number(receiptAmount || 1));
  }
  return Number(openItem.functionalExchangeRate || 1);
}

function resolveAllocationFunctionalReceiptAmounts({
  openItem,
  receiptAmount,
  allocatedAmount,
  suspenseAmount,
  currencyCode,
  unmatchedReceipt,
  settlementExchangeRate,
  functionalReceiptAmount
}) {
  if (unmatchedReceipt) {
    const carryingFunctionalAmount = resolveFunctionalAmount({ amount: allocatedAmount, openItem });
    return {
      totalFunctionalReceiptAmount: carryingFunctionalAmount,
      allocatedFunctionalReceiptAmount: carryingFunctionalAmount
    };
  }
  if (functionalReceiptAmount != null && functionalReceiptAmount !== "") {
    const normalizedFunctionalReceiptAmount = normalizePositiveNumber(functionalReceiptAmount, "ar_functional_receipt_amount_invalid");
    if (suspenseAmount <= 0 || Number(receiptAmount || 0) === Number(allocatedAmount || 0)) {
      return {
        totalFunctionalReceiptAmount: normalizedFunctionalReceiptAmount,
        allocatedFunctionalReceiptAmount: normalizedFunctionalReceiptAmount
      };
    }
    return {
      totalFunctionalReceiptAmount: normalizedFunctionalReceiptAmount,
      allocatedFunctionalReceiptAmount: roundMoney(
        normalizedFunctionalReceiptAmount * (Number(allocatedAmount || 0) / Number(receiptAmount || 1))
      )
    };
  }
  const normalizedCurrencyCode = normalizeUpperCode(currencyCode || openItem.currencyCode || "SEK", "currency_code_required", 3);
  const functionalCurrencyCode = openItem.functionalCurrencyCode || "SEK";
  if (normalizedCurrencyCode === functionalCurrencyCode) {
    const normalizedFunctionalReceiptAmount = roundMoney(receiptAmount);
    if (suspenseAmount <= 0 || Number(receiptAmount || 0) === Number(allocatedAmount || 0)) {
      return {
        totalFunctionalReceiptAmount: normalizedFunctionalReceiptAmount,
        allocatedFunctionalReceiptAmount: normalizedFunctionalReceiptAmount
      };
    }
    return {
      totalFunctionalReceiptAmount: normalizedFunctionalReceiptAmount,
      allocatedFunctionalReceiptAmount: roundMoney(
        normalizedFunctionalReceiptAmount * (Number(allocatedAmount || 0) / Number(receiptAmount || 1))
      )
    };
  }
  const rate = settlementExchangeRate != null && settlementExchangeRate !== ""
    ? normalizePositiveNumber(settlementExchangeRate, "ar_settlement_exchange_rate_invalid")
    : Number(openItem.functionalExchangeRate || 1);
  const totalFunctionalReceiptAmount = roundMoney(Number(receiptAmount || 0) * rate);
  if (suspenseAmount <= 0 || Number(receiptAmount || 0) === Number(allocatedAmount || 0)) {
    return {
      totalFunctionalReceiptAmount,
      allocatedFunctionalReceiptAmount: totalFunctionalReceiptAmount
    };
  }
  return {
    totalFunctionalReceiptAmount,
    allocatedFunctionalReceiptAmount: roundMoney(totalFunctionalReceiptAmount * (Number(allocatedAmount || 0) / Number(receiptAmount || 1)))
  };
}

function buildOpenItemJournalOptions({
  openItem,
  debitAmount,
  creditAmount,
  functionalDebitAmount = null,
  functionalCreditAmount = null
}) {
  const functionalCurrencyCode = openItem.functionalCurrencyCode || "SEK";
  const usesForeignCurrency = (openItem.currencyCode || functionalCurrencyCode) !== functionalCurrencyCode;
  return {
    currencyCode: openItem.currencyCode || functionalCurrencyCode,
    exchangeRate: usesForeignCurrency ? Number(openItem.functionalExchangeRate || 1) : null,
    functionalDebitAmount:
      functionalDebitAmount != null
        ? roundMoney(functionalDebitAmount)
        : usesForeignCurrency
          ? resolveFunctionalAmount({ amount: debitAmount, openItem })
          : roundMoney(debitAmount),
    functionalCreditAmount:
      functionalCreditAmount != null
        ? roundMoney(functionalCreditAmount)
        : usesForeignCurrency
          ? resolveFunctionalAmount({ amount: creditAmount, openItem })
          : roundMoney(creditAmount)
  };
}

function buildRevenueDimensionJson({ companyId, ledgerPlatform, line }) {
  const dimensionJson = {};
  if (line.projectId && ledgerProjectDimensionExists({ companyId, ledgerPlatform, projectId: line.projectId })) {
    dimensionJson.projectId = line.projectId;
  }
  if (line.costCenterCode) {
    dimensionJson.costCenterCode = line.costCenterCode;
  }
  if (line.businessAreaCode) {
    dimensionJson.businessAreaCode = line.businessAreaCode;
  }
  if (line.serviceLineCode) {
    dimensionJson.serviceLineCode = line.serviceLineCode;
  }
  return Object.keys(dimensionJson).length > 0 ? dimensionJson : null;
}

function ledgerProjectDimensionExists({ companyId, ledgerPlatform, projectId }) {
  if (!projectId || !ledgerPlatform || typeof ledgerPlatform.listLedgerDimensions !== "function") {
    return false;
  }
  const catalog = ledgerPlatform.listLedgerDimensions({ companyId });
  return Array.isArray(catalog?.projects) && catalog.projects.some((value) => value.code === projectId && value.status === "active");
}

function collectInvoiceDimensionRequirements({ ledgerPlatform, companyId, invoiceLines }) {
  if (!ledgerPlatform || typeof ledgerPlatform.listLedgerAccounts !== "function" || !Array.isArray(invoiceLines) || invoiceLines.length === 0) {
    return {
      requiredFieldCodes: [],
      missingFieldCodes: new Set()
    };
  }
  const accountsByNumber = new Map(
    ledgerPlatform.listLedgerAccounts({ companyId }).map((account) => [account.accountNumber, account])
  );
  const requiredFieldCodes = new Set();
  const missingFieldCodes = new Set();
  for (const line of invoiceLines) {
    const account = accountsByNumber.get(line.revenueAccountNumber);
    for (const requiredDimensionKey of account?.requiredDimensionKeys || []) {
      const fieldCode = mapDimensionKeyToInvoiceFieldCode(requiredDimensionKey);
      if (!fieldCode) {
        continue;
      }
      requiredFieldCodes.add(fieldCode);
      if (!line?.[requiredDimensionKey]) {
        missingFieldCodes.add(fieldCode);
      }
    }
  }
  return {
    requiredFieldCodes: [...requiredFieldCodes].sort(),
    missingFieldCodes
  };
}

function mapDimensionKeyToInvoiceFieldCode(dimensionKey) {
  const mapping = {
    projectId: "project_id",
    costCenterCode: "cost_center_code",
    businessAreaCode: "business_area_code",
    serviceLineCode: "service_line_code"
  };
  return mapping[dimensionKey] || null;
}

function resolveInvoiceSourceType(invoiceType) {
  return invoiceType === "credit_note" ? "AR_CREDIT_NOTE" : "AR_INVOICE";
}

function ensureDefaultInvoiceSeriesForCompany(state, companyId, clock = () => new Date()) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  for (const definition of DEFAULT_INVOICE_SERIES_DEFINITIONS) {
    if (findInvoiceSeriesRecord(state, resolvedCompanyId, definition.seriesCode)) {
      continue;
    }
    const now = nowIso(clock);
    const record = {
      arInvoiceSeriesId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      seriesCode: definition.seriesCode,
      prefix: definition.prefix,
      description: definition.description,
      nextNumber: definition.nextNumber,
      status: definition.status,
      invoiceTypeCodes: [...definition.invoiceTypeCodes],
      voucherSeriesPurposeCode: definition.voucherSeriesPurposeCode,
      importedSequencePreservationEnabled: definition.importedSequencePreservationEnabled,
      createdAt: now,
      updatedAt: now
    };
    state.invoiceSeries.set(record.arInvoiceSeriesId, record);
    state.invoiceSeriesIdsByCompanyCode.set(toCompanyScopedKey(resolvedCompanyId, record.seriesCode), record.arInvoiceSeriesId);
  }
}

function findInvoiceSeriesRecord(state, companyId, seriesCode) {
  const normalizedSeriesCode = normalizeInvoiceSeriesCode(seriesCode, "ar_invoice_series_code_required");
  const seriesId = state.invoiceSeriesIdsByCompanyCode.get(toCompanyScopedKey(companyId, normalizedSeriesCode));
  return seriesId ? state.invoiceSeries.get(seriesId) : null;
}

function requireInvoiceSeriesRecord(state, companyId, seriesCode) {
  const series = findInvoiceSeriesRecord(state, companyId, seriesCode);
  if (!series) {
    const normalizedSeriesCode = normalizeInvoiceSeriesCode(seriesCode, "ar_invoice_series_code_required");
    throw createError(404, "ar_invoice_series_not_found", `Invoice series ${normalizedSeriesCode} was not found.`);
  }
  return series;
}

function resolveConfiguredInvoiceSeries(state, companyId, invoiceType, preferredSeriesCode = null, clock = () => new Date()) {
  ensureDefaultInvoiceSeriesForCompany(state, companyId, clock);
  const resolvedInvoiceType = assertAllowed(invoiceType, AR_INVOICE_TYPES, "ar_invoice_type_invalid");
  if (preferredSeriesCode) {
    const preferredSeries = requireInvoiceSeriesRecord(state, companyId, preferredSeriesCode);
    ensureInvoiceSeriesUsable(preferredSeries);
    if (!preferredSeries.invoiceTypeCodes.includes(resolvedInvoiceType)) {
      throw createError(
        409,
        "ar_invoice_series_type_mismatch",
        `Invoice series ${preferredSeries.seriesCode} is not configured for invoice type ${resolvedInvoiceType}.`
      );
    }
    return preferredSeries;
  }

  const candidates = [...state.invoiceSeries.values()]
    .filter((series) => series.companyId === companyId)
    .filter((series) => series.status === "active")
    .filter((series) => series.invoiceTypeCodes.includes(resolvedInvoiceType))
    .sort((left, right) => left.seriesCode.localeCompare(right.seriesCode));
  if (candidates.length === 0) {
    throw createError(404, "ar_invoice_series_not_configured", `No active invoice series handles invoice type ${resolvedInvoiceType}.`);
  }
  if (candidates.length > 1) {
    throw createError(
      409,
      "ar_invoice_series_ambiguous",
      `Multiple active invoice series handle invoice type ${resolvedInvoiceType}.`
    );
  }
  return candidates[0];
}

function nextInvoiceSeriesNumber(series, clock = () => new Date()) {
  ensureInvoiceSeriesUsable(series);
  const nextNumber = normalizePositiveInteger(series.nextNumber, "ar_invoice_series_next_number_invalid");
  series.nextNumber = nextNumber + 1;
  series.updatedAt = nowIso(clock);
  return nextNumber;
}

function ensureInvoiceSeriesUsable(series) {
  if (!series || series.status !== "active") {
    throw createError(409, "ar_invoice_series_not_usable", "Invoice series is not active.");
  }
}

function ensureInvoiceSeriesTypeAvailability({ state, companyId, invoiceTypeCodes, currentSeriesId = null, status }) {
  if (status !== "active") {
    return;
  }
  for (const invoiceTypeCode of invoiceTypeCodes) {
    const conflictingSeries = [...state.invoiceSeries.values()]
      .filter((series) => series.companyId === companyId)
      .filter((series) => series.status === "active")
      .filter((series) => series.arInvoiceSeriesId !== currentSeriesId)
      .find((series) => series.invoiceTypeCodes.includes(invoiceTypeCode));
    if (conflictingSeries) {
      throw createError(
        409,
        "ar_invoice_series_type_conflict",
        `Invoice type ${invoiceTypeCode} is already assigned to active series ${conflictingSeries.seriesCode}.`
      );
    }
  }
}

function ensureLedgerPurposeAvailableForInvoiceSeries({ ledgerPlatform, companyId, voucherSeriesPurposeCode, status }) {
  if (status !== "active" || !ledgerPlatform || typeof ledgerPlatform.resolveVoucherSeriesForPurpose !== "function") {
    return;
  }
  try {
    ledgerPlatform.resolveVoucherSeriesForPurpose({
      companyId,
      purposeCode: voucherSeriesPurposeCode
    });
  } catch (error) {
    throw createError(
      error.status || 409,
      error.code || "ar_invoice_series_voucher_purpose_invalid",
      `Invoice series requires available ledger purpose ${voucherSeriesPurposeCode}.`
    );
  }
}

function normalizeInvoiceSeriesCode(value, code) {
  const normalized = requireText(value, code).toUpperCase();
  if (!/^[A-Z0-9_-]{1,20}$/.test(normalized)) {
    throw createError(400, code, "Invoice series code format is invalid.");
  }
  return normalized;
}

function normalizeInvoiceSeriesPrefix(value) {
  if (value == null) {
    return "";
  }
  const normalized = String(value).trim().toUpperCase();
  if (normalized.length > 20) {
    throw createError(400, "ar_invoice_series_prefix_invalid", "Invoice series prefix must be 20 characters or fewer.");
  }
  return normalized;
}

function normalizeInvoiceSeriesDescription(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw createError(400, "ar_invoice_series_description_required", "Invoice series description is required.");
  }
  return normalized;
}

function normalizeInvoiceSeriesStatus(value) {
  const normalized = requireText(value, "ar_invoice_series_status_required");
  if (!AR_INVOICE_SERIES_STATUSES.includes(normalized)) {
    throw createError(400, "ar_invoice_series_status_invalid", `Unsupported invoice series status ${normalized}.`);
  }
  return normalized;
}

function normalizeInvoiceSeriesTypeCodes(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw createError(400, "ar_invoice_series_types_invalid", "Invoice series must include at least one invoice type.");
  }
  return [...new Set(values.map((value) => assertAllowed(value, AR_INVOICE_TYPES, "ar_invoice_type_invalid")))].sort();
}

function normalizeInvoiceVoucherPurposeCode(value) {
  const normalized = requireText(value, "ar_invoice_series_voucher_purpose_required").toUpperCase();
  if (!/^[A-Z0-9_:-]{2,64}$/.test(normalized)) {
    throw createError(400, "ar_invoice_series_voucher_purpose_invalid", "Invoice series voucher purpose code format is invalid.");
  }
  return normalized;
}

function defaultInvoiceSeriesDescription(seriesCode) {
  return seriesCode === "C" ? "Customer credit note numbering" : "Customer invoice numbering";
}

function defaultInvoicePrefix(seriesCode) {
  return seriesCode === "C" ? "CRN-" : "INV-";
}

function defaultInvoiceTypeCodes(seriesCode) {
  return seriesCode === "C" ? ["credit_note"] : ["standard", "partial", "subscription"];
}

function defaultVoucherPurposeForInvoiceTypes(invoiceTypeCodes) {
  return invoiceTypeCodes.length === 1 && invoiceTypeCodes[0] === "credit_note" ? "AR_CREDIT_NOTE" : "AR_INVOICE";
}

function resolveInvoiceSourceDescriptor({ customer, contract, sourceQuote, sourceQuoteVersion, originalInvoice, invoiceType, issueDate }) {
  if (originalInvoice) {
    return {
      sourceType: "AR_CREDIT_ORIGINAL",
      sourceId: originalInvoice.customerInvoiceId,
      sourceVersion: originalInvoice.issuedAt || originalInvoice.createdAt
    };
  }
  if (contract) {
    return {
      sourceType: invoiceType === "subscription" ? "CONTRACT_PLAN" : "CONTRACT",
      sourceId: contract.contractId,
      sourceVersion: contract.updatedAt
    };
  }
  if (sourceQuoteVersion) {
    return {
      sourceType: "QUOTE",
      sourceId: requireText(sourceQuote?.quoteId, "source_quote_id_required"),
      sourceVersion: requireText(sourceQuoteVersion.quoteVersionId, "source_quote_version_id_required")
    };
  }
  return {
    sourceType: invoiceType === "partial" ? "MANUAL_PARTIAL" : "MANUAL",
    sourceId: customer.customerId,
    sourceVersion: issueDate
  };
}

function resolveCustomerReceivableAccount(customer) {
  const countryCode = normalizeOptionalText(customer?.countryCode)?.toUpperCase() || "SE";
  if (countryCode === "SE") {
    return "1210";
  }
  if (EU_COUNTRY_CODES.has(countryCode)) {
    return "1220";
  }
  return "1230";
}

function resolveOutputVatAccountNumber(vatRate) {
  const formattedRate = Number(vatRate || 0).toFixed(2);
  if (formattedRate === "25.00") {
    return "2610";
  }
  if (formattedRate === "12.00") {
    return "2620";
  }
  if (formattedRate === "6.00") {
    return "2630";
  }
  return null;
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
  const resolvedCountryCode = normalizeUpperCode(row.countryCode || customer.countryCode, "country_code_required", 2);
  const normalizedOrganizationNumber = normalizeCustomerOrganizationNumber(
    resolvedCountryCode,
    row.organizationNumber || customer.organizationNumber
  );
  validatePeppolFields({
    countryCode: resolvedCountryCode,
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
    organizationNumber: normalizedOrganizationNumber,
    countryCode: resolvedCountryCode,
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
    allowReminderFee: row.allowReminderFee == null ? customer.allowReminderFee : row.allowReminderFee === true,
    allowInterest: row.allowInterest == null ? customer.allowInterest : row.allowInterest === true,
    allowPartialDelivery: row.allowPartialDelivery == null ? customer.allowPartialDelivery : row.allowPartialDelivery === true,
    blockedForInvoicing: row.blockedForInvoicing == null ? customer.blockedForInvoicing : row.blockedForInvoicing === true,
    blockedForDelivery: row.blockedForDelivery == null ? customer.blockedForDelivery : row.blockedForDelivery === true,
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
  const resolvedCountryCode = normalizeUpperCode(row.countryCode, "country_code_required", 2);
  const normalizedOrganizationNumber = normalizeCustomerOrganizationNumber(resolvedCountryCode, row.organizationNumber || null);
  validatePeppolFields({
    countryCode: resolvedCountryCode,
    peppolScheme: row.peppolScheme || null,
    peppolIdentifier: row.peppolIdentifier || null
  });
  const record = {
    customerId: crypto.randomUUID(),
    companyId,
    customerNo,
    legalName: requireText(row.legalName, "customer_legal_name_required"),
    organizationNumber: normalizedOrganizationNumber,
    countryCode: resolvedCountryCode,
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
    allowReminderFee: row.allowReminderFee !== false,
    allowInterest: row.allowInterest !== false,
    allowPartialDelivery: row.allowPartialDelivery !== false,
    blockedForInvoicing: row.blockedForInvoicing === true,
    blockedForDelivery: row.blockedForDelivery === true,
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

function setQuoteLifecycleTimestamp(version, status, clock) {
  if (status === "sent") {
    version.sentAt = version.sentAt || nowIso(clock);
  }
  if (status === "accepted") {
    version.acceptedAt = version.acceptedAt || nowIso(clock);
  }
  if (status === "rejected") {
    version.rejectedAt = version.rejectedAt || nowIso(clock);
  }
  if (status === "expired") {
    version.expiredAt = version.expiredAt || nowIso(clock);
  }
}

function buildCommercialSnapshotHash({ currencyCode, lines }) {
  return hashObject({
    currencyCode: normalizeUpperCode(currencyCode, "currency_code_required", 3),
    lines: (lines || []).map((line) => ({
      itemId: line.itemId || null,
      itemCode: line.itemCode || null,
      projectId: line.projectId || null,
      description: line.description,
      quantity: line.quantity,
      unitCode: line.unitCode,
      unitPrice: line.unitPrice,
      lineAmount: line.lineAmount,
      revenueAccountNumber: line.revenueAccountNumber,
      vatCode: line.vatCode,
      recurringFlag: line.recurringFlag === true,
      projectBoundFlag: line.projectBoundFlag === true
    }))
  });
}

function assertProjectBoundLinesLinked(invoiceLines) {
  if (invoiceLines.some((line) => line.projectBoundFlag === true && !line.projectId)) {
    throw createError(409, "project_link_required", "Project-bound invoice lines require projectId.");
  }
}

function summarizeInvoiceProjectLinks(invoiceLines) {
  const projectIds = [...new Set((invoiceLines || []).map((line) => normalizeOptionalText(line.projectId)).filter(Boolean))].sort();
  if (projectIds.length === 0) {
    return {
      projectIds: [],
      primaryProjectId: null,
      projectLinkStatus: "unlinked"
    };
  }
  if (projectIds.length === 1) {
    return {
      projectIds,
      primaryProjectId: projectIds[0],
      projectLinkStatus: "single_project"
    };
  }
  return {
    projectIds,
    primaryProjectId: null,
    projectLinkStatus: "multi_project"
  };
}

function assertQuoteVersionCompatibleWithInvoice({ sourceQuoteVersion, invoiceCurrencyCode, invoiceLines }) {
  const expectedHash =
    sourceQuoteVersion.commercialSnapshotHash ||
    buildCommercialSnapshotHash({
      currencyCode: sourceQuoteVersion.currencyCode,
      lines: sourceQuoteVersion.lines
    });
  const invoiceHash = buildCommercialSnapshotHash({
    currencyCode: invoiceCurrencyCode,
    lines: invoiceLines
  });
  if (expectedHash !== invoiceHash) {
    throw createError(
      409,
      "quote_version_mismatch",
      "Invoice draft does not match the accepted quote version. Create a new quote version or invoice from contract/project source."
    );
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
  normalizeCustomerOrganizationNumber(countryCode, organizationNumber);
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

function uniqueTexts(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => requireText(value, "text_value_required")))];
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

function normalizeOptionalVatNumberStatus(value) {
  const normalized = normalizeOptionalText(value)?.toLowerCase() || null;
  if (!normalized) {
    return null;
  }
  if (["valid", "verified", "confirmed"].includes(normalized)) {
    return "valid";
  }
  if (["invalid", "rejected"].includes(normalized)) {
    return "invalid";
  }
  if (["unchecked", "unverified", "unknown", "pending", "service_unavailable", "unavailable"].includes(normalized)) {
    return "unverified";
  }
  if (["missing", "not_applicable", "na"].includes(normalized)) {
    return normalized === "missing" ? "missing" : "not_applicable";
  }
  throw createError(
    400,
    "invoice_buyer_vat_number_status_invalid",
    "buyerVatNumberStatus must be valid, invalid, unverified, missing or not_applicable."
  );
}

function invoiceRequiresValidatedEuVatNumber(invoice) {
  return Array.isArray(invoice?.lines) && invoice.lines.some((line) => line?.goodsOrServices === "goods");
}

function resolveInvoiceSellerSnapshot({
  companyId,
  sellerLegalName = null,
  sellerOrganizationNumber = null,
  sellerVatNumber = null,
  sellerAddress = null,
  orgAuthPlatform = null,
  companyProfilesById = null
} = {}) {
  const companyProfile = resolveCompanyProfileSnapshot({ companyId, orgAuthPlatform, companyProfilesById });
  const address =
    normalizeOptionalAddress(
      sellerAddress
      || companyProfile?.address
      || companyProfile?.businessAddress
      || companyProfile?.registeredAddress
      || companyProfile?.settingsJson?.businessAddress
      || companyProfile?.settingsJson?.registeredAddress
      || companyProfile?.settingsJson?.invoiceAddress
      || null,
      "invoice_seller_address_invalid"
    );
  const organizationNumber = normalizeCustomerOrganizationNumber(
    address?.countryCode || "SE",
    sellerOrganizationNumber ?? companyProfile?.orgNumber ?? companyProfile?.organizationNumber ?? null
  );
  const derivedVatNumber =
    sellerVatNumber
    || companyProfile?.vatNumber
    || companyProfile?.settingsJson?.vatNumber
    || deriveSwedishVatNumberFromOrganizationNumber(address?.countryCode || "SE", organizationNumber);
  return {
    legalName: requireOptionalTextOrNull(
      sellerLegalName ?? companyProfile?.legalName ?? null,
      "invoice_seller_legal_name_invalid"
    ),
    organizationNumber,
    vatNumber: normalizeOptionalVatNumber(derivedVatNumber, "invoice_seller_vat_number_invalid", {
      errorFactory: createError,
      countryCode: address?.countryCode || "SE"
    }),
    address
  };
}

function resolveCompanyProfileSnapshot({ companyId, orgAuthPlatform = null, companyProfilesById = null } = {}) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  if (orgAuthPlatform?.getCompanyProfile) {
    try {
      return copy(orgAuthPlatform.getCompanyProfile({ companyId: resolvedCompanyId }));
    } catch {
      // Fall through to explicit fixtures when AR is used outside the full platform.
    }
  }
  if (companyProfilesById instanceof Map) {
    return copy(companyProfilesById.get(resolvedCompanyId) || null);
  }
  if (companyProfilesById && typeof companyProfilesById === "object") {
    return copy(companyProfilesById[resolvedCompanyId] || null);
  }
  return null;
}

function requireOptionalTextOrNull(value, code) {
  const normalized = normalizeOptionalText(value);
  if (normalized === null) {
    return null;
  }
  return requireText(normalized, code);
}

function normalizeOptionalAddress(address, code) {
  if (address === null || address === undefined) {
    return null;
  }
  return normalizeAddress(address, code);
}

function deriveSwedishVatNumberFromOrganizationNumber(countryCode, organizationNumber) {
  if (normalizeOptionalText(countryCode)?.toUpperCase() !== "SE" || !organizationNumber) {
    return null;
  }
  const digits = String(organizationNumber).replace(/\D+/g, "");
  if (digits.length !== 10) {
    return null;
  }
  return `SE${digits}01`;
}

function buildInvoiceOcrReference(sequenceNumber) {
  const payload = String(normalizePositiveInteger(sequenceNumber, "invoice_sequence_number_invalid")).padStart(9, "0");
  return `${payload}${calculateMod10CheckDigit(payload)}`;
}

function calculateMod10CheckDigit(digits) {
  const normalizedDigits = String(digits || "").replace(/\D+/g, "");
  let sum = 0;
  let doubleDigit = true;
  for (let index = normalizedDigits.length - 1; index >= 0; index -= 1) {
    let digit = Number(normalizedDigits[index]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  return String((10 - (sum % 10)) % 10);
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
  return normalizeRequiredIsoDate(value, code, { errorFactory: createError });
}

function normalizeCustomerOrganizationNumber(countryCode, organizationNumber) {
  const normalizedCountryCode = normalizeOptionalText(countryCode)?.toUpperCase() || null;
  if (normalizedCountryCode === "SE") {
    return normalizeOptionalSwedishOrganizationNumber(organizationNumber, "organization_number_invalid", {
      errorFactory: createError
    });
  }
  return normalizeOptionalText(organizationNumber);
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

function normalizeOptionalMoney(value, code) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return normalizeMoney(value, code);
}

function normalizePositiveNumber(value, code) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw createError(400, code, `${code} must be greater than zero.`);
  }
  return roundMoney(number);
}

function normalizeOptionalPositiveNumber(value, code) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return normalizePositiveNumber(value, code);
}

function normalizePositiveInteger(value, code) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw createError(400, code, `${code} must be a positive integer.`);
  }
  return number;
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

function pushAudit(state, clock, event) {
  state.auditEvents.push(
    createAuditEnvelopeFromLegacyEvent({
      clock,
      auditClass: "ar_action",
      event
    })
  );
}

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
