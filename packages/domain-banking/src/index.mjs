import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";

export const BANK_ACCOUNT_STATUSES = Object.freeze(["active", "blocked", "archived"]);
export const PAYMENT_PROPOSAL_STATUSES = Object.freeze(["draft", "approved", "exported", "submitted", "accepted_by_bank", "partially_executed", "settled", "failed", "cancelled"]);
export const PAYMENT_ORDER_STATUSES = Object.freeze(["prepared", "reserved", "sent", "accepted", "booked", "returned", "rejected"]);
export const PAYMENT_BATCH_STATUSES = Object.freeze(["draft", "exported", "submitted", "accepted_by_bank", "partially_executed", "settled", "failed", "cancelled"]);
export const BANK_PAYMENT_EVENT_TYPES = Object.freeze(["booked", "rejected", "returned"]);
export const BANK_STATEMENT_EVENT_MATCH_STATUSES = Object.freeze(["matched_payment_order", "matched_tax_account", "reconciliation_required"]);
export const BANK_STATEMENT_EVENT_PROCESSING_STATUSES = Object.freeze(["received", "processed", "reconciliation_required"]);
export const BANK_RECONCILIATION_CASE_STATUSES = Object.freeze(["open", "in_review", "resolved", "written_off"]);
export const BANK_RECONCILIATION_PENDING_ACTION_CODES = Object.freeze(["approve_payment_order_statement", "approve_tax_account_statement_bridge"]);
export const BANK_STATEMENT_CATEGORY_CODES = Object.freeze(["generic", "tax_account"]);
export const BANK_PAYMENT_ORDER_ACTIONS = Object.freeze(["booked", "rejected", "returned"]);
export const PAYMENT_RAIL_CODES = Object.freeze(["open_banking", "iso20022_file", "bankgiro_file"]);
export const PAYMENT_FILE_FORMAT_CODES = Object.freeze(["open_banking_api", "pain.001", "bankgiro_csv"]);
export const STATEMENT_IMPORT_SOURCE_CODES = Object.freeze(["open_banking_sync", "camt053_file", "manual_statement"]);
export const STATEMENT_IMPORT_STATUSES = Object.freeze(["processed", "reconciliation_required"]);
export const SETTLEMENT_LIABILITY_LINK_STATUSES = Object.freeze(["pending", "matched", "settled", "returned", "rejected"]);
export const SETTLEMENT_LIABILITY_OBJECT_TYPES = Object.freeze(["ap_open_item", "tax_account_event"]);

const PAYMENT_RAIL_CONFIG_BY_CODE = Object.freeze({
  open_banking: Object.freeze({
    paymentRailCode: "open_banking",
    paymentFileFormatCode: "open_banking_api",
    providerCode: "enable_banking",
    baselineCode: "SE-OPEN-BANKING-CORE",
    deliveryMode: "api_dispatch"
  }),
  iso20022_file: Object.freeze({
    paymentRailCode: "iso20022_file",
    paymentFileFormatCode: "pain.001",
    providerCode: "bank_file_channel",
    baselineCode: "SE-BANK-FILE-FORMAT",
    deliveryMode: "file_export"
  }),
  bankgiro_file: Object.freeze({
    paymentRailCode: "bankgiro_file",
    paymentFileFormatCode: "bankgiro_csv",
    providerCode: "bank_file_channel",
    baselineCode: "SE-BANK-FILE-FORMAT",
    deliveryMode: "file_export"
  })
});

const STATEMENT_IMPORT_SOURCE_CONFIG_BY_CODE = Object.freeze({
  open_banking_sync: Object.freeze({
    sourceChannelCode: "open_banking_sync",
    fileFormatCode: "open_banking_api",
    providerCode: "enable_banking",
    baselineCode: "SE-OPEN-BANKING-CORE"
  }),
  camt053_file: Object.freeze({
    sourceChannelCode: "camt053_file",
    fileFormatCode: "camt.053",
    providerCode: "bank_file_channel",
    baselineCode: "SE-BANK-FILE-FORMAT"
  }),
  manual_statement: Object.freeze({
    sourceChannelCode: "manual_statement",
    fileFormatCode: "manual_statement",
    providerCode: null,
    baselineCode: null
  })
});

export function createBankingPlatform(options = {}) {
  return createBankingEngine(options);
}

export function createBankingEngine({
  clock = () => new Date(),
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null,
  apPlatform = null,
  integrationsPlatform = null,
  taxAccountPlatform = null,
  getTaxAccountPlatform = null,
  getIntegrationsPlatform = null
} = {}) {
  const state = {
    bankAccounts: new Map(),
    bankAccountIdsByCompany: new Map(),
    bankAccountIdsByIdentity: new Map(),
    paymentProposals: new Map(),
    paymentProposalIdsByCompany: new Map(),
    paymentProposalIdsByKey: new Map(),
    paymentBatches: new Map(),
    paymentBatchIdsByCompany: new Map(),
    paymentBatchIdByProposal: new Map(),
    paymentOrders: new Map(),
    paymentOrderIdsByCompany: new Map(),
    paymentOrderIdsByProposal: new Map(),
    bankPaymentEvents: new Map(),
    bankPaymentEventIdsByKey: new Map(),
    bankStatementEvents: new Map(),
    bankStatementEventIdsByCompany: new Map(),
    bankStatementEventIdByIdentity: new Map(),
    statementImports: new Map(),
    statementImportIdsByCompany: new Map(),
    reconciliationCases: new Map(),
    reconciliationCaseIdsByCompany: new Map(),
    settlementLiabilityLinks: new Map(),
    settlementLiabilityLinkIdsByCompany: new Map(),
    settlementLiabilityLinkIdByPaymentOrder: new Map(),
    settlementLiabilityLinkIdByStatementEvent: new Map(),
    countersByCompany: new Map(),
    auditEvents: []
  };

  if (seedDemo) {
    seedDemoState();
  }

  const engine = {
    bankAccountStatuses: BANK_ACCOUNT_STATUSES,
    paymentProposalStatuses: PAYMENT_PROPOSAL_STATUSES,
    paymentOrderStatuses: PAYMENT_ORDER_STATUSES,
    paymentBatchStatuses: PAYMENT_BATCH_STATUSES,
    paymentRailCodes: PAYMENT_RAIL_CODES,
    paymentFileFormatCodes: PAYMENT_FILE_FORMAT_CODES,
    bankPaymentEventTypes: BANK_PAYMENT_EVENT_TYPES,
    bankStatementEventMatchStatuses: BANK_STATEMENT_EVENT_MATCH_STATUSES,
    bankStatementEventProcessingStatuses: BANK_STATEMENT_EVENT_PROCESSING_STATUSES,
    bankReconciliationCaseStatuses: BANK_RECONCILIATION_CASE_STATUSES,
    bankReconciliationPendingActionCodes: BANK_RECONCILIATION_PENDING_ACTION_CODES,
    statementImportSourceCodes: STATEMENT_IMPORT_SOURCE_CODES,
    statementImportStatuses: STATEMENT_IMPORT_STATUSES,
    settlementLiabilityLinkStatuses: SETTLEMENT_LIABILITY_LINK_STATUSES,
    listBankAccounts,
    getBankAccount,
    createBankAccount,
    listBankStatementEvents,
    getBankStatementEvent,
    listStatementImports,
    getStatementImport,
    importBankStatementEvents,
    listBankReconciliationCases,
    getBankReconciliationCase,
    resolveBankReconciliationCase,
    listPaymentProposals,
    getPaymentProposal,
    listPaymentBatches,
    getPaymentBatch,
    listSettlementLiabilityLinks,
    createPaymentProposal,
    approvePaymentProposal,
    exportPaymentProposal,
    submitPaymentProposal,
    acceptPaymentProposal,
    bookPaymentOrder,
    rejectPaymentOrder,
    returnPaymentOrder,
    snapshotBanking
  };

  Object.defineProperty(engine, "__durableState", {
    value: state,
    enumerable: false
  });

  return engine;

  function listBankAccounts({ companyId, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.bankAccountIdsByCompany.get(resolvedCompanyId) || [])
      .map((bankAccountId) => state.bankAccounts.get(bankAccountId))
      .filter(Boolean)
      .filter((account) => (status ? account.status === status : true))
      .sort((left, right) => left.bankAccountNo.localeCompare(right.bankAccountNo))
      .map(copy);
  }

  function getBankAccount({ companyId, bankAccountId } = {}) {
    return copy(requireBankAccountRecord(state, companyId, bankAccountId));
  }

  function createBankAccount({
    companyId,
    bankName,
    ledgerAccountNumber,
    currencyCode = "SEK",
    clearingNumber = null,
    accountNumber = null,
    bankgiro = null,
    plusgiro = null,
    iban = null,
    bic = null,
    status = "active",
    isDefault = false,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const identity = [iban, accountNumber, bankgiro, plusgiro].map(normalizeOptionalText).find(Boolean);
    if (!identity) {
      throw createError(409, "bank_account_identifier_required", "Bank account requires account number, IBAN, bankgiro or plusgiro.");
    }
    const scopedIdentity = toCompanyScopedKey(resolvedCompanyId, identity.toUpperCase());
    if (state.bankAccountIdsByIdentity.has(scopedIdentity)) {
      return copy(state.bankAccounts.get(state.bankAccountIdsByIdentity.get(scopedIdentity)));
    }

    if (isDefault === true) {
      for (const existingId of state.bankAccountIdsByCompany.get(resolvedCompanyId) || []) {
        const existing = state.bankAccounts.get(existingId);
        if (existing) {
          existing.isDefault = false;
          existing.updatedAt = nowIso(clock);
        }
      }
    }

    const account = {
      bankAccountId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      bankAccountNo: nextScopedSequence(state, resolvedCompanyId, "bankAccount", "BANK"),
      bankName: requireText(bankName, "bank_name_required"),
      ledgerAccountNumber: requireText(ledgerAccountNumber, "bank_ledger_account_required"),
      currencyCode: normalizeUpperCode(currencyCode, "currency_code_required", 3),
      clearingNumber: normalizeOptionalText(clearingNumber),
      accountNumber: normalizeOptionalText(accountNumber),
      bankgiro: normalizeOptionalText(bankgiro),
      plusgiro: normalizeOptionalText(plusgiro),
      iban: normalizeOptionalText(iban),
      bic: normalizeOptionalText(bic),
      status: assertAllowed(status, BANK_ACCOUNT_STATUSES, "bank_account_status_invalid"),
      isDefault: isDefault === true,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.bankAccounts.set(account.bankAccountId, account);
    ensureCollection(state.bankAccountIdsByCompany, resolvedCompanyId).push(account.bankAccountId);
    state.bankAccountIdsByIdentity.set(scopedIdentity, account.bankAccountId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "bank.account.created",
      entityType: "bank_account",
      entityId: account.bankAccountId,
      explanation: `Created bank account ${account.bankAccountNo}.`
    });
    return copy(account);
  }

  function listBankStatementEvents({ companyId, bankAccountId = null, matchStatus = null, processingStatus = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedBankAccountId = normalizeOptionalText(bankAccountId);
    const resolvedMatchStatus = matchStatus == null ? null : assertAllowed(matchStatus, BANK_STATEMENT_EVENT_MATCH_STATUSES, "bank_statement_match_status_invalid");
    const resolvedProcessingStatus =
      processingStatus == null
        ? null
        : assertAllowed(processingStatus, BANK_STATEMENT_EVENT_PROCESSING_STATUSES, "bank_statement_processing_status_invalid");
    return (state.bankStatementEventIdsByCompany.get(resolvedCompanyId) || [])
      .map((bankStatementEventId) => state.bankStatementEvents.get(bankStatementEventId))
      .filter(Boolean)
      .filter((event) => (resolvedBankAccountId ? event.bankAccountId === resolvedBankAccountId : true))
      .filter((event) => (resolvedMatchStatus ? event.matchStatus === resolvedMatchStatus : true))
      .filter((event) => (resolvedProcessingStatus ? event.processingStatus === resolvedProcessingStatus : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function getBankStatementEvent({ companyId, bankStatementEventId } = {}) {
    return copy(requireBankStatementEventRecord(state, companyId, bankStatementEventId));
  }

  function listStatementImports({ companyId, status = null, sourceChannelCode = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = status == null ? null : assertAllowed(status, STATEMENT_IMPORT_STATUSES, "statement_import_status_invalid");
    const resolvedSourceChannelCode =
      sourceChannelCode == null ? null : assertAllowed(sourceChannelCode, STATEMENT_IMPORT_SOURCE_CODES, "statement_import_source_invalid");
    return (state.statementImportIdsByCompany.get(resolvedCompanyId) || [])
      .map((statementImportId) => presentStatementImport(state, statementImportId))
      .filter(Boolean)
      .filter((statementImport) => (resolvedStatus ? statementImport.status === resolvedStatus : true))
      .filter((statementImport) => (resolvedSourceChannelCode ? statementImport.sourceChannelCode === resolvedSourceChannelCode : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  function getStatementImport({ companyId, statementImportId } = {}) {
    const statementImport = requireStatementImportRecord(state, companyId, statementImportId);
    return presentStatementImport(state, statementImport.statementImportId);
  }

  function importBankStatementEvents({
    companyId,
    bankAccountId,
    statementDate = null,
    sourceChannelCode = "manual_statement",
    sourceFileName = null,
    providerCode = null,
    providerReference = null,
    statementFileFormatCode = null,
    events,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const bankAccount = requireBankAccountRecord(state, resolvedCompanyId, bankAccountId);
    if (!Array.isArray(events) || events.length === 0) {
      throw createError(400, "bank_statement_events_required", "Bank statement import requires at least one event.");
    }

    const resolvedStatementDate = normalizeDate(statementDate || nowIso(clock).slice(0, 10), "statement_date_invalid");
    const statementImportConfig = resolveStatementImportConfig({
      sourceChannelCode,
      statementFileFormatCode,
      providerCode,
      effectiveDate: resolvedStatementDate,
      integrationsPlatform,
      getIntegrationsPlatform
    });
    const statementImport = {
      statementImportId: crypto.randomUUID(),
      statementImportNo: nextScopedSequence(state, resolvedCompanyId, "statementImport", "STMT"),
      companyId: resolvedCompanyId,
      bankAccountId: bankAccount.bankAccountId,
      statementDate: resolvedStatementDate,
      sourceChannelCode: statementImportConfig.sourceChannelCode,
      statementFileFormatCode: statementImportConfig.statementFileFormatCode,
      providerCode: statementImportConfig.providerCode,
      providerBaselineId: statementImportConfig.providerBaselineRef?.providerBaselineId || null,
      providerBaselineCode: statementImportConfig.providerBaselineRef?.baselineCode || null,
      providerBaselineVersion: statementImportConfig.providerBaselineRef?.providerBaselineVersion || null,
      providerBaselineChecksum: statementImportConfig.providerBaselineRef?.providerBaselineChecksum || null,
      providerReference: normalizeOptionalText(providerReference),
      sourceFileName: normalizeOptionalText(sourceFileName),
      status: "processed",
      importedCount: 0,
      duplicateCount: 0,
      matchedPaymentOrderCount: 0,
      matchedTaxAccountCount: 0,
      reconciliationRequiredCount: 0,
      eventCount: 0,
      createdByActorId: resolvedActorId,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.statementImports.set(statementImport.statementImportId, statementImport);
    ensureCollection(state.statementImportIdsByCompany, resolvedCompanyId).push(statementImport.statementImportId);
    const importedEvents = [];
    let duplicateCount = 0;
    let matchedPaymentOrderCount = 0;
    let matchedTaxAccountCount = 0;
    let reconciliationRequiredCount = 0;
    for (const rawEvent of events) {
      const normalized = normalizeBankStatementEventInput({
        bankAccount,
        rawEvent,
        statementDate: resolvedStatementDate
      });
      const identityKey = buildStatementIdentityKey({
        companyId: resolvedCompanyId,
        bankAccountId: bankAccount.bankAccountId,
        externalReference: normalized.externalReference,
        bookingDate: normalized.bookingDate,
        amount: normalized.amount,
        statementImportId: statementImport.statementImportId
      });
      const existingStatementEventId = state.bankStatementEventIdByIdentity.get(identityKey);
      if (existingStatementEventId) {
        duplicateCount += 1;
        importedEvents.push(copy(state.bankStatementEvents.get(existingStatementEventId)));
        continue;
      }

      const statementEvent = {
        bankStatementEventId: crypto.randomUUID(),
        statementImportId: statementImport.statementImportId,
        companyId: resolvedCompanyId,
        bankAccountId: bankAccount.bankAccountId,
        externalReference: normalized.externalReference,
        bookingDate: normalized.bookingDate,
        amount: normalized.amount,
        currencyCode: normalized.currencyCode,
        counterpartyName: normalized.counterpartyName,
        referenceText: normalized.referenceText,
        statementCategoryCode: normalized.statementCategoryCode,
        sourceChannelCode: statementImport.sourceChannelCode,
        statementFileFormatCode: statementImport.statementFileFormatCode,
        providerCode: statementImport.providerCode,
        providerReference: statementImport.providerReference,
        linkedPaymentOrderId: normalized.linkedPaymentOrderId,
        paymentOrderAction: normalized.paymentOrderAction,
        matchStatus: "reconciliation_required",
        processingStatus: "received",
        matchedObjectType: null,
        matchedObjectId: null,
        reconciliationCaseId: null,
        taxAccountEventId: null,
        failureReasonCode: null,
        createdAt: nowIso(clock),
        updatedAt: nowIso(clock)
      };
      state.bankStatementEvents.set(statementEvent.bankStatementEventId, statementEvent);
      ensureCollection(state.bankStatementEventIdsByCompany, resolvedCompanyId).push(statementEvent.bankStatementEventId);
      state.bankStatementEventIdByIdentity.set(identityKey, statementEvent.bankStatementEventId);

      processImportedStatementEvent({
        state,
        statementEvent,
        apPlatform,
        taxAccountPlatform,
        getTaxAccountPlatform,
        bankAccount,
        statementImport,
        actorId: resolvedActorId,
        correlationId,
        clock
      });
      if (statementEvent.matchStatus === "matched_payment_order") {
        matchedPaymentOrderCount += 1;
      }
      if (statementEvent.matchStatus === "matched_tax_account") {
        matchedTaxAccountCount += 1;
      }
      if (statementEvent.processingStatus === "reconciliation_required") {
        reconciliationRequiredCount += 1;
      }
      importedEvents.push(copy(statementEvent));
    }

    statementImport.importedCount = importedEvents.length - duplicateCount;
    statementImport.duplicateCount = duplicateCount;
    statementImport.matchedPaymentOrderCount = matchedPaymentOrderCount;
    statementImport.matchedTaxAccountCount = matchedTaxAccountCount;
    statementImport.reconciliationRequiredCount = reconciliationRequiredCount;
    statementImport.eventCount = importedEvents.length;
    statementImport.status = reconciliationRequiredCount > 0 ? "reconciliation_required" : "processed";
    statementImport.updatedAt = nowIso(clock);

    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: "bank.statement_events.imported",
      entityType: "bank_statement_import",
      entityId: statementImport.statementImportId,
      explanation: `Imported ${importedEvents.length - duplicateCount} bank statement events with ${duplicateCount} duplicates ignored.`
    });
    return copy({
      statementImport: presentStatementImport(state, statementImport.statementImportId),
      bankAccountId: bankAccount.bankAccountId,
      statementDate: resolvedStatementDate,
      importedCount: importedEvents.length - duplicateCount,
      duplicateCount,
      items: importedEvents
    });
  }

  function listBankReconciliationCases({ companyId, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = status == null ? null : assertAllowed(status, BANK_RECONCILIATION_CASE_STATUSES, "bank_reconciliation_case_status_invalid");
    return (state.reconciliationCaseIdsByCompany.get(resolvedCompanyId) || [])
      .map((reconciliationCaseId) => state.reconciliationCases.get(reconciliationCaseId))
      .filter(Boolean)
      .filter((reconciliationCase) => (resolvedStatus ? reconciliationCase.status === resolvedStatus : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function getBankReconciliationCase({ companyId, reconciliationCaseId } = {}) {
    return copy(requireBankReconciliationCaseRecord(state, companyId, reconciliationCaseId));
  }

  function resolveBankReconciliationCase({
    companyId,
    reconciliationCaseId,
    resolutionCode,
    resolutionNote = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const reconciliationCase = requireBankReconciliationCaseRecord(state, companyId, reconciliationCaseId);
    if (!["open", "in_review"].includes(reconciliationCase.status)) {
      return copy(reconciliationCase);
    }
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const normalizedResolutionCode = normalizeOptionalText(resolutionCode);
    if (reconciliationCase.pendingActionCode && !normalizedResolutionCode) {
      throw createError(
        400,
        "bank_reconciliation_resolution_code_required",
        "Approval-gated bank reconciliation cases require an explicit resolution code."
      );
    }
    const resolvedResolutionCode = normalizedResolutionCode || "resolved";
    const statementEvent = state.bankStatementEvents.get(reconciliationCase.bankStatementEventId);
    if (reconciliationCase.pendingActionCode && !isAllowedPendingActionResolutionCode(reconciliationCase, resolvedResolutionCode)) {
      throw createError(
        409,
        "bank_reconciliation_resolution_invalid",
        `Unsupported resolution ${resolvedResolutionCode} for pending action ${reconciliationCase.pendingActionCode}.`
      );
    }

    let executedActionCode = null;
    if (reconciliationCase.pendingActionCode === "approve_payment_order_statement" && resolvedResolutionCode === "approve_payment_order_statement") {
      executePaymentOrderStatementApproval({
        state,
        reconciliationCase,
        statementEvent,
        actorId: resolvedActorId,
        correlationId,
        clock
      });
      executedActionCode = resolvedResolutionCode;
    } else if (
      reconciliationCase.pendingActionCode === "approve_tax_account_statement_bridge" &&
      resolvedResolutionCode === "approve_tax_account_statement_bridge"
    ) {
      executeTaxAccountStatementApproval({
        state,
        reconciliationCase,
        statementEvent,
        taxAccountPlatform,
        getTaxAccountPlatform,
        actorId: resolvedActorId,
        clock
      });
      executedActionCode = resolvedResolutionCode;
    }

    reconciliationCase.status = resolvedResolutionCode === "written_off" ? "written_off" : "resolved";
    reconciliationCase.resolutionCode = resolvedResolutionCode;
    reconciliationCase.resolutionNote = normalizeOptionalText(resolutionNote);
    reconciliationCase.resolvedAt = nowIso(clock);
    reconciliationCase.resolvedByActorId = resolvedActorId;
    reconciliationCase.executedActionCode = executedActionCode;
    reconciliationCase.executedActionAt = executedActionCode ? reconciliationCase.resolvedAt : null;
    reconciliationCase.updatedAt = reconciliationCase.resolvedAt;

    if (statementEvent) {
      if (reconciliationCase.pendingActionCode && !executedActionCode) {
        if (reconciliationCase.pendingActionCode === "approve_payment_order_statement" && statementEvent.linkedPaymentOrderId) {
          syncSettlementLiabilityLinkForPaymentOrder(state, clock, {
            companyId: statementEvent.companyId,
            paymentOrderId: statementEvent.linkedPaymentOrderId,
            status: "pending",
            settledAmount: 0,
            clearBankStatementEventId: true,
            clearBankPaymentEventId: true
          });
        }
        statementEvent.failureReasonCode = resolvedResolutionCode;
        statementEvent.updatedAt = reconciliationCase.updatedAt;
      }
      statementEvent.processingStatus = "processed";
      if (!executedActionCode && !reconciliationCase.pendingActionCode) {
        statementEvent.matchStatus = "reconciliation_required";
        statementEvent.failureReasonCode = resolvedResolutionCode;
        statementEvent.updatedAt = reconciliationCase.updatedAt;
      }
    }

    pushAudit(state, clock, {
      companyId: reconciliationCase.companyId,
      actorId: reconciliationCase.resolvedByActorId,
      correlationId,
      action: "bank.reconciliation_case.resolved",
      entityType: "bank_reconciliation_case",
      entityId: reconciliationCase.reconciliationCaseId,
      explanation: `Resolved bank reconciliation case ${reconciliationCase.reconciliationCaseId} with ${resolvedResolutionCode}.`
    });
    return copy(reconciliationCase);
  }

  function processImportedStatementEvent({
    state,
    statementEvent,
    apPlatform,
    taxAccountPlatform,
    getTaxAccountPlatform,
    bankAccount,
    actorId,
    correlationId,
    clock
  }) {
    if (statementEvent.linkedPaymentOrderId && statementEvent.paymentOrderAction) {
      try {
        requirePaymentOrderRecord(state, statementEvent.companyId, statementEvent.linkedPaymentOrderId);
        const reconciliationCase = openBankReconciliationCase({
          companyId: statementEvent.companyId,
          bankAccountId: statementEvent.bankAccountId,
          bankStatementEventId: statementEvent.bankStatementEventId,
          caseTypeCode: "payment_order_posting_gate",
          differenceAmount: statementEvent.amount,
          reasonCode: "bank_statement_requires_domain_approval",
          actorId,
          pendingActionCode: "approve_payment_order_statement",
          pendingTargetObjectType: "payment_order",
          pendingTargetObjectId: statementEvent.linkedPaymentOrderId,
          pendingPayload: {
            paymentOrderAction: statementEvent.paymentOrderAction,
            bookingDate: statementEvent.bookingDate,
            bankEventId: statementEvent.externalReference
          }
        });
        statementEvent.matchStatus = "matched_payment_order";
        statementEvent.processingStatus = "reconciliation_required";
        statementEvent.matchedObjectType = "payment_order";
        statementEvent.matchedObjectId = statementEvent.linkedPaymentOrderId;
        statementEvent.failureReasonCode = null;
        statementEvent.reconciliationCaseId = reconciliationCase.reconciliationCaseId;
        statementEvent.updatedAt = nowIso(clock);
        syncSettlementLiabilityLinkForPaymentOrder(state, clock, {
          companyId: statementEvent.companyId,
          paymentOrderId: statementEvent.linkedPaymentOrderId,
          bankStatementEventId: statementEvent.bankStatementEventId,
          status: "matched",
          settledAmount: 0
        });
        return reconciliationCase;
      } catch (error) {
        const reconciliationCase = openBankReconciliationCase({
          companyId: statementEvent.companyId,
          bankAccountId: statementEvent.bankAccountId,
          bankStatementEventId: statementEvent.bankStatementEventId,
          caseTypeCode: "payment_order_link_failed",
          differenceAmount: statementEvent.amount,
          reasonCode: error?.code || "payment_order_link_failed",
          actorId
        });
        statementEvent.reconciliationCaseId = reconciliationCase.reconciliationCaseId;
        statementEvent.matchStatus = "reconciliation_required";
        statementEvent.processingStatus = "reconciliation_required";
        statementEvent.failureReasonCode = error?.code || "payment_order_link_failed";
        statementEvent.updatedAt = nowIso(clock);
        return reconciliationCase;
      }
    }

    if (statementEvent.statementCategoryCode === "tax_account") {
      try {
        assertTaxAccountStatementBridgeAvailable({
          taxAccountPlatform,
          getTaxAccountPlatform
        });
        const reconciliationCase = openBankReconciliationCase({
          companyId: statementEvent.companyId,
          bankAccountId: statementEvent.bankAccountId,
          bankStatementEventId: statementEvent.bankStatementEventId,
          caseTypeCode: "tax_account_posting_gate",
          differenceAmount: statementEvent.amount,
          reasonCode: "bank_statement_requires_domain_approval",
          actorId,
          pendingActionCode: "approve_tax_account_statement_bridge",
          pendingTargetObjectType: "tax_account_event",
          pendingTargetObjectId: null,
          pendingPayload: {
            statementCategoryCode: statementEvent.statementCategoryCode,
            bookingDate: statementEvent.bookingDate,
            bankEventId: statementEvent.externalReference
          }
        });
        statementEvent.matchStatus = "matched_tax_account";
        statementEvent.processingStatus = "reconciliation_required";
        statementEvent.reconciliationCaseId = reconciliationCase.reconciliationCaseId;
        statementEvent.matchedObjectType = null;
        statementEvent.matchedObjectId = null;
        statementEvent.taxAccountEventId = null;
        statementEvent.failureReasonCode = null;
        statementEvent.updatedAt = nowIso(clock);
        return reconciliationCase;
      } catch (error) {
        const reconciliationCase = openBankReconciliationCase({
          companyId: statementEvent.companyId,
          bankAccountId: statementEvent.bankAccountId,
          bankStatementEventId: statementEvent.bankStatementEventId,
          caseTypeCode: "tax_account_bridge_failed",
          differenceAmount: statementEvent.amount,
          reasonCode: error?.code || "tax_account_bridge_failed",
          actorId
        });
        statementEvent.reconciliationCaseId = reconciliationCase.reconciliationCaseId;
        statementEvent.matchStatus = "reconciliation_required";
        statementEvent.processingStatus = "reconciliation_required";
        statementEvent.failureReasonCode = error?.code || "tax_account_bridge_failed";
        statementEvent.updatedAt = nowIso(clock);
        return reconciliationCase;
      }
    }

    const reconciliationCase = openBankReconciliationCase({
      companyId: statementEvent.companyId,
      bankAccountId: statementEvent.bankAccountId,
      bankStatementEventId: statementEvent.bankStatementEventId,
      caseTypeCode: "unmatched_statement_event",
      differenceAmount: statementEvent.amount,
      reasonCode: "bank_statement_unmatched",
      actorId
    });
    statementEvent.reconciliationCaseId = reconciliationCase.reconciliationCaseId;
    statementEvent.matchStatus = "reconciliation_required";
    statementEvent.processingStatus = "reconciliation_required";
    statementEvent.failureReasonCode = "bank_statement_unmatched";
    statementEvent.updatedAt = nowIso(clock);
    return reconciliationCase;
  }

  function applyStatementEventToPaymentOrder({ statementEvent, actorId, correlationId }) {
    switch (statementEvent.paymentOrderAction) {
      case "booked":
        return bookPaymentOrder({
          companyId: statementEvent.companyId,
          paymentOrderId: statementEvent.linkedPaymentOrderId,
          bankEventId: statementEvent.externalReference,
          bookedOn: statementEvent.bookingDate,
          bankStatementEventId: statementEvent.bankStatementEventId,
          actorId,
          correlationId
        });
      case "rejected":
        return rejectPaymentOrder({
          companyId: statementEvent.companyId,
          paymentOrderId: statementEvent.linkedPaymentOrderId,
          bankEventId: statementEvent.externalReference,
          bankStatementEventId: statementEvent.bankStatementEventId,
          actorId,
          correlationId,
          reasonCode: "bank_statement_rejected"
        });
      case "returned":
        return returnPaymentOrder({
          companyId: statementEvent.companyId,
          paymentOrderId: statementEvent.linkedPaymentOrderId,
          bankEventId: statementEvent.externalReference,
          returnedOn: statementEvent.bookingDate,
          bankStatementEventId: statementEvent.bankStatementEventId,
          actorId,
          correlationId
        });
      default:
        throw createError(409, "bank_payment_order_action_invalid", "Unsupported bank statement payment-order action.");
    }
  }

  function bridgeStatementEventToTaxAccount({
    statementEvent,
    bankAccount,
    taxAccountPlatform,
    getTaxAccountPlatform,
    actorId
  }) {
    const resolvedTaxAccountPlatform = resolveDeferredPlatform({
      platform: taxAccountPlatform,
      getter: getTaxAccountPlatform
    });
    if (!resolvedTaxAccountPlatform || typeof resolvedTaxAccountPlatform.importTaxAccountEvents !== "function") {
      throw createError(409, "tax_account_platform_missing", "Tax account platform is required for tax-account statement events.");
    }
    const result = resolvedTaxAccountPlatform.importTaxAccountEvents({
      companyId: statementEvent.companyId,
      importSource: "BANKING_STATEMENT",
      statementDate: statementEvent.bookingDate,
      events: [
        {
          eventTypeCode: "PAYMENT",
          eventDate: statementEvent.bookingDate,
          postingDate: statementEvent.bookingDate,
          amount: Math.abs(statementEvent.amount),
          externalReference: statementEvent.externalReference,
          sourceObjectType: "bank_statement_event",
          sourceObjectId: statementEvent.bankStatementEventId,
          sourceReference: bankAccount.bankAccountNo
        }
      ],
      actorId
    });
    return {
      taxAccountEventId: result.items[0]?.taxAccountEventId || null
    };
  }

  function executePaymentOrderStatementApproval({ state, reconciliationCase, statementEvent, actorId, correlationId, clock }) {
    const resolvedStatementEvent =
      statementEvent ||
      state.bankStatementEvents.get(requireText(reconciliationCase.bankStatementEventId, "bank_statement_event_id_required"));
    if (!resolvedStatementEvent) {
      throw createError(404, "bank_statement_event_not_found", "Bank statement event was not found for reconciliation case.");
    }
    const paymentActionResult = applyStatementEventToPaymentOrder({
      statementEvent: resolvedStatementEvent,
      actorId,
      correlationId
    });
    resolvedStatementEvent.matchStatus = "matched_payment_order";
    resolvedStatementEvent.processingStatus = "processed";
    resolvedStatementEvent.matchedObjectType = "payment_order";
    resolvedStatementEvent.matchedObjectId = resolvedStatementEvent.linkedPaymentOrderId;
    resolvedStatementEvent.failureReasonCode = null;
    resolvedStatementEvent.updatedAt = nowIso(clock);
    const order = state.paymentOrders.get(resolvedStatementEvent.linkedPaymentOrderId);
    if (order) {
      order.lastStatementEventId = resolvedStatementEvent.bankStatementEventId;
    }
    return paymentActionResult;
  }

  function executeTaxAccountStatementApproval({
    state,
    reconciliationCase,
    statementEvent,
    taxAccountPlatform,
    getTaxAccountPlatform,
    actorId,
    clock
  }) {
    const resolvedStatementEvent =
      statementEvent ||
      state.bankStatementEvents.get(requireText(reconciliationCase.bankStatementEventId, "bank_statement_event_id_required"));
    if (!resolvedStatementEvent) {
      throw createError(404, "bank_statement_event_not_found", "Bank statement event was not found for reconciliation case.");
    }
    const bankAccount = requireBankAccountRecord(state, resolvedStatementEvent.companyId, resolvedStatementEvent.bankAccountId);
    const bridgeResult = bridgeStatementEventToTaxAccount({
      statementEvent: resolvedStatementEvent,
      bankAccount,
      taxAccountPlatform,
      getTaxAccountPlatform,
      actorId
    });
    resolvedStatementEvent.matchStatus = "matched_tax_account";
    resolvedStatementEvent.processingStatus = "processed";
    resolvedStatementEvent.matchedObjectType = "tax_account_event";
    resolvedStatementEvent.matchedObjectId = bridgeResult.taxAccountEventId;
    resolvedStatementEvent.taxAccountEventId = bridgeResult.taxAccountEventId;
    resolvedStatementEvent.failureReasonCode = null;
    resolvedStatementEvent.updatedAt = nowIso(clock);
    if (bridgeResult.taxAccountEventId) {
      upsertStatementSettlementLiabilityLink(state, clock, {
        companyId: resolvedStatementEvent.companyId,
        bankStatementEventId: resolvedStatementEvent.bankStatementEventId,
        bankAccountId: resolvedStatementEvent.bankAccountId,
        liabilityObjectType: "tax_account_event",
        liabilityObjectId: bridgeResult.taxAccountEventId,
        expectedAmount: Math.abs(resolvedStatementEvent.amount),
        currencyCode: resolvedStatementEvent.currencyCode,
        status: "settled"
      });
    }
    return bridgeResult;
  }

  function assertTaxAccountStatementBridgeAvailable({ taxAccountPlatform, getTaxAccountPlatform }) {
    const resolvedTaxAccountPlatform = resolveDeferredPlatform({
      platform: taxAccountPlatform,
      getter: getTaxAccountPlatform
    });
    if (!resolvedTaxAccountPlatform || typeof resolvedTaxAccountPlatform.importTaxAccountEvents !== "function") {
      throw createError(409, "tax_account_platform_missing", "Tax account platform is required for tax-account statement events.");
    }
    return resolvedTaxAccountPlatform;
  }

  function openBankReconciliationCase({
    companyId,
    bankAccountId,
    bankStatementEventId,
    caseTypeCode,
    differenceAmount,
    reasonCode,
    actorId,
    pendingActionCode = null,
    pendingTargetObjectType = null,
    pendingTargetObjectId = null,
    pendingPayload = null
  }) {
    const reconciliationCase = {
      reconciliationCaseId: crypto.randomUUID(),
      companyId: requireText(companyId, "company_id_required"),
      bankAccountId: requireText(bankAccountId, "bank_account_id_required"),
      bankStatementEventId: requireText(bankStatementEventId, "bank_statement_event_id_required"),
      caseTypeCode: requireText(caseTypeCode, "bank_reconciliation_case_type_required"),
      status: "open",
      differenceAmount: roundMoney(differenceAmount),
      reasonCode: requireText(reasonCode, "bank_reconciliation_reason_required"),
      pendingActionCode:
        pendingActionCode == null
          ? null
          : assertAllowed(
              pendingActionCode,
              BANK_RECONCILIATION_PENDING_ACTION_CODES,
              "bank_reconciliation_pending_action_invalid"
            ),
      pendingTargetObjectType: normalizeOptionalText(pendingTargetObjectType),
      pendingTargetObjectId: normalizeOptionalText(pendingTargetObjectId),
      pendingPayload: pendingPayload == null ? null : copy(pendingPayload),
      resolutionCode: null,
      resolutionNote: null,
      resolvedAt: null,
      resolvedByActorId: null,
      executedActionCode: null,
      executedActionAt: null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.reconciliationCases.set(reconciliationCase.reconciliationCaseId, reconciliationCase);
    ensureCollection(state.reconciliationCaseIdsByCompany, reconciliationCase.companyId).push(reconciliationCase.reconciliationCaseId);
    return reconciliationCase;
  }

  function listPaymentProposals({ companyId, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.paymentProposalIdsByCompany.get(resolvedCompanyId) || [])
      .map((paymentProposalId) => presentPaymentProposal(state, paymentProposalId))
      .filter(Boolean)
      .filter((proposal) => (status ? proposal.status === status : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  function getPaymentProposal({ companyId, paymentProposalId } = {}) {
    const proposal = requirePaymentProposalRecord(state, companyId, paymentProposalId);
    return presentPaymentProposal(state, proposal.paymentProposalId);
  }

  function listPaymentBatches({ companyId, status = null, paymentRailCode = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = status == null ? null : assertAllowed(status, PAYMENT_BATCH_STATUSES, "payment_batch_status_invalid");
    const resolvedPaymentRailCode =
      paymentRailCode == null ? null : assertAllowed(paymentRailCode, PAYMENT_RAIL_CODES, "payment_rail_code_invalid");
    return (state.paymentBatchIdsByCompany.get(resolvedCompanyId) || [])
      .map((paymentBatchId) => presentPaymentBatch(state, paymentBatchId))
      .filter(Boolean)
      .filter((paymentBatch) => (resolvedStatus ? paymentBatch.status === resolvedStatus : true))
      .filter((paymentBatch) => (resolvedPaymentRailCode ? paymentBatch.paymentRailCode === resolvedPaymentRailCode : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  function getPaymentBatch({ companyId, paymentBatchId } = {}) {
    const paymentBatch = requirePaymentBatchRecord(state, companyId, paymentBatchId);
    return presentPaymentBatch(state, paymentBatch.paymentBatchId);
  }

  function listSettlementLiabilityLinks({
    companyId,
    paymentOrderId = null,
    bankStatementEventId = null,
    liabilityObjectType = null,
    status = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedLiabilityObjectType =
      liabilityObjectType == null
        ? null
        : assertAllowed(liabilityObjectType, SETTLEMENT_LIABILITY_OBJECT_TYPES, "settlement_liability_object_type_invalid");
    const resolvedStatus = status == null ? null : assertAllowed(status, SETTLEMENT_LIABILITY_LINK_STATUSES, "settlement_link_status_invalid");
    const resolvedPaymentOrderId = normalizeOptionalText(paymentOrderId);
    const resolvedBankStatementEventId = normalizeOptionalText(bankStatementEventId);
    return (state.settlementLiabilityLinkIdsByCompany.get(resolvedCompanyId) || [])
      .map((settlementLiabilityLinkId) => state.settlementLiabilityLinks.get(settlementLiabilityLinkId))
      .filter(Boolean)
      .filter((link) => (resolvedPaymentOrderId ? link.paymentOrderId === resolvedPaymentOrderId : true))
      .filter((link) => (resolvedBankStatementEventId ? link.bankStatementEventId === resolvedBankStatementEventId : true))
      .filter((link) => (resolvedLiabilityObjectType ? link.liabilityObjectType === resolvedLiabilityObjectType : true))
      .filter((link) => (resolvedStatus ? link.status === resolvedStatus : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function createPaymentProposal({
    companyId,
    bankAccountId,
    apOpenItemIds,
    paymentDate = null,
    paymentRailCode = "bankgiro_file",
    paymentFileFormatCode = null,
    providerCode = null,
    providerReference = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    ensureApPlatform(apPlatform);
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const bankAccount = requireBankAccountRecord(state, resolvedCompanyId, bankAccountId);
    if (bankAccount.status !== "active") {
      throw createError(409, "bank_account_not_active", "Only active bank accounts can be used.");
    }
    if (!Array.isArray(apOpenItemIds) || apOpenItemIds.length === 0) {
      throw createError(400, "payment_proposal_open_items_required", "Payment proposal requires AP open items.");
    }

    const resolvedPaymentDate = normalizeDate(paymentDate || nowIso(clock).slice(0, 10), "payment_date_invalid");
    const railConfig = resolvePaymentRailConfig({
      paymentRailCode,
      paymentFileFormatCode,
      providerCode,
      effectiveDate: resolvedPaymentDate,
      integrationsPlatform,
      getIntegrationsPlatform
    });
    const uniqueOpenItemIds = [...new Set(apOpenItemIds.map((value) => requireText(value, "ap_open_item_id_required")))].sort();
    const sourceOpenItemSetHash = hashObject({
      companyId: resolvedCompanyId,
      bankAccountId,
      paymentDate: resolvedPaymentDate,
      paymentRailCode: railConfig.paymentRailCode,
      apOpenItemIds: uniqueOpenItemIds
    });
    const scopedKey = toCompanyScopedKey(resolvedCompanyId, sourceOpenItemSetHash);
    if (state.paymentProposalIdsByKey.has(scopedKey)) {
      return presentPaymentProposal(state, state.paymentProposalIdsByKey.get(scopedKey));
    }

    const proposal = {
      paymentProposalId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      paymentProposalNo: nextScopedSequence(state, resolvedCompanyId, "paymentProposal", "PAY"),
      bankAccountId,
      paymentBatchId: null,
      paymentRailCode: railConfig.paymentRailCode,
      paymentFileFormatCode: railConfig.paymentFileFormatCode,
      providerCode: railConfig.providerCode,
      providerBaselineId: railConfig.providerBaselineRef?.providerBaselineId || null,
      providerBaselineCode: railConfig.providerBaselineRef?.baselineCode || null,
      providerBaselineVersion: railConfig.providerBaselineRef?.providerBaselineVersion || null,
      providerBaselineChecksum: railConfig.providerBaselineRef?.providerBaselineChecksum || null,
      providerReference: normalizeOptionalText(providerReference),
      status: "draft",
      paymentDate: resolvedPaymentDate,
      currencyCode: bankAccount.currencyCode,
      totalAmount: 0,
      sourceOpenItemSetHash,
      exportFileName: null,
      exportPayload: null,
      exportPayloadHash: null,
      approvedByActorId: null,
      approvedAt: null,
      exportedAt: null,
      submittedAt: null,
      acceptedByBankAt: null,
      settledAt: null,
      failedAt: null,
      cancelledAt: null,
      failureReasonCodes: [],
      createdByActorId: actorId,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };

    const paymentBatch = {
      paymentBatchId: crypto.randomUUID(),
      paymentBatchNo: nextScopedSequence(state, resolvedCompanyId, "paymentBatch", "BATCH"),
      companyId: resolvedCompanyId,
      paymentProposalId: proposal.paymentProposalId,
      bankAccountId,
      paymentRailCode: railConfig.paymentRailCode,
      paymentFileFormatCode: railConfig.paymentFileFormatCode,
      providerCode: railConfig.providerCode,
      providerBaselineId: railConfig.providerBaselineRef?.providerBaselineId || null,
      providerBaselineCode: railConfig.providerBaselineRef?.baselineCode || null,
      providerBaselineVersion: railConfig.providerBaselineRef?.providerBaselineVersion || null,
      providerBaselineChecksum: railConfig.providerBaselineRef?.providerBaselineChecksum || null,
      providerReference: normalizeOptionalText(providerReference),
      deliveryMode: railConfig.deliveryMode,
      status: "draft",
      paymentDate: resolvedPaymentDate,
      currencyCode: bankAccount.currencyCode,
      totalAmount: 0,
      orderCount: 0,
      exportFileName: null,
      exportPayload: null,
      exportPayloadHash: null,
      exportedAt: null,
      submittedAt: null,
      acceptedByBankAt: null,
      settledAt: null,
      failedAt: null,
      cancelledAt: null,
      createdByActorId: actorId,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    proposal.paymentBatchId = paymentBatch.paymentBatchId;
    state.paymentProposals.set(proposal.paymentProposalId, proposal);
    ensureCollection(state.paymentProposalIdsByCompany, resolvedCompanyId).push(proposal.paymentProposalId);
    state.paymentProposalIdsByKey.set(scopedKey, proposal.paymentProposalId);
    state.paymentBatches.set(paymentBatch.paymentBatchId, paymentBatch);
    ensureCollection(state.paymentBatchIdsByCompany, resolvedCompanyId).push(paymentBatch.paymentBatchId);
    state.paymentBatchIdByProposal.set(proposal.paymentProposalId, paymentBatch.paymentBatchId);

    for (const apOpenItemId of uniqueOpenItemIds) {
      const openItem = apPlatform.getApOpenItem({ companyId: resolvedCompanyId, apOpenItemId });
      const invoice = apPlatform.getSupplierInvoice({ companyId: resolvedCompanyId, supplierInvoiceId: openItem.supplierInvoiceId });
      const supplier = apPlatform.getSupplier({ companyId: resolvedCompanyId, supplierId: invoice.supplierId });
      const paymentPreparation =
        typeof apPlatform.getApPaymentPreparation === "function"
          ? apPlatform.getApPaymentPreparation({ companyId: resolvedCompanyId, apOpenItemId })
          : null;
      validateOpenItemForProposal({ openItem, invoice, supplier, bankAccount, paymentPreparation });
      const order = {
        paymentOrderId: crypto.randomUUID(),
        companyId: resolvedCompanyId,
        paymentProposalId: proposal.paymentProposalId,
        paymentBatchId: paymentBatch.paymentBatchId,
        bankAccountId: bankAccount.bankAccountId,
        apOpenItemId: openItem.apOpenItemId,
        supplierInvoiceId: invoice.supplierInvoiceId,
        supplierId: supplier.supplierId,
        settlementLiabilityObjectType: "ap_open_item",
        settlementLiabilityObjectId: openItem.apOpenItemId,
        settlementLiabilitySourceDomain: "ap",
        paymentRailCode: railConfig.paymentRailCode,
        paymentFileFormatCode: railConfig.paymentFileFormatCode,
        providerCode: railConfig.providerCode,
        providerBaselineCode: railConfig.providerBaselineRef?.baselineCode || null,
        status: "prepared",
        payeeName: supplier.paymentRecipient || supplier.legalName,
        bankgiro: supplier.bankgiro,
        plusgiro: supplier.plusgiro,
        iban: supplier.iban,
        bic: supplier.bic,
        paymentReference: invoice.paymentReference || invoice.externalInvoiceRef,
        amount: openItem.openAmount,
        currencyCode: invoice.currencyCode,
        dueDate: openItem.dueOn,
        lineageKey: hashObject({ companyId: resolvedCompanyId, bankAccountId, payeeName: supplier.paymentRecipient || supplier.legalName, amount: openItem.openAmount, dueDate: openItem.dueOn, sourceOpenItemSet: [openItem.apOpenItemId] }),
        reservedJournalEntryId: null,
        bookedJournalEntryId: null,
        rejectedJournalEntryId: null,
        returnedJournalEntryId: null,
        failureReasonCode: null,
        lastStatementEventId: null,
        bankEventId: null,
        createdAt: nowIso(clock),
        updatedAt: nowIso(clock)
      };
      state.paymentOrders.set(order.paymentOrderId, order);
      ensureCollection(state.paymentOrderIdsByCompany, resolvedCompanyId).push(order.paymentOrderId);
      ensureCollection(state.paymentOrderIdsByProposal, proposal.paymentProposalId).push(order.paymentOrderId);
      proposal.totalAmount = roundMoney(proposal.totalAmount + order.amount);
      paymentBatch.totalAmount = roundMoney(paymentBatch.totalAmount + order.amount);
      paymentBatch.orderCount += 1;
      ensureSettlementLiabilityLinkRecord(state, clock, {
        companyId: resolvedCompanyId,
        paymentBatchId: paymentBatch.paymentBatchId,
        paymentProposalId: proposal.paymentProposalId,
        paymentOrderId: order.paymentOrderId,
        liabilityObjectType: "ap_open_item",
        liabilityObjectId: openItem.apOpenItemId,
        relatedObjectType: "supplier_invoice",
        relatedObjectId: invoice.supplierInvoiceId,
        expectedAmount: order.amount,
        currencyCode: order.currencyCode
      });
    }

    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "bank.payment_proposal.created",
      entityType: "payment_proposal",
      entityId: proposal.paymentProposalId,
      explanation: `Created payment proposal ${proposal.paymentProposalNo}.`
    });
    return presentPaymentProposal(state, proposal.paymentProposalId);
  }

  function approvePaymentProposal({ companyId, paymentProposalId, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const proposal = requirePaymentProposalRecord(state, companyId, paymentProposalId);
    assertProposalTransition(proposal.status, "approved");
    proposal.status = "approved";
    proposal.approvedAt = nowIso(clock);
    proposal.approvedByActorId = actorId;
    proposal.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: proposal.companyId,
      actorId,
      correlationId,
      action: "bank.payment_proposal.approved",
      entityType: "payment_proposal",
      entityId: proposal.paymentProposalId,
      explanation: `Approved payment proposal ${proposal.paymentProposalNo}.`
    });
    return presentPaymentProposal(state, proposal.paymentProposalId);
  }

  function exportPaymentProposal({ companyId, paymentProposalId, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    ensureApPlatform(apPlatform);
    const proposal = requirePaymentProposalRecord(state, companyId, paymentProposalId);
    const paymentBatch = requirePaymentBatchByProposalRecord(state, proposal);
    if (!["approved", "exported", "submitted", "accepted_by_bank", "partially_executed", "settled"].includes(proposal.status)) {
      throw createError(409, "payment_proposal_not_approved", "Payment proposal must be approved before export.");
    }
    const bankAccount = requireBankAccountRecord(state, proposal.companyId, proposal.bankAccountId);
    for (const order of listProposalOrderRecords(state, proposal.paymentProposalId)) {
      if (order.status === "prepared") {
        const reserved = apPlatform.reserveApOpenItem({
          companyId: proposal.companyId,
          apOpenItemId: order.apOpenItemId,
          paymentProposalId: proposal.paymentProposalId,
          paymentOrderId: order.paymentOrderId,
          bankAccountNumber: bankAccount.ledgerAccountNumber,
          actorId,
          correlationId
        });
        order.status = "reserved";
        order.reservedJournalEntryId = reserved.journalEntryId;
        order.updatedAt = nowIso(clock);
      }
    }
    const orders = listProposalOrderRecords(state, proposal.paymentProposalId);
    const exportArtifact = buildPaymentBatchExportArtifact({
      paymentBatch,
      proposal,
      bankAccount,
      orders
    });
    proposal.status = "exported";
    proposal.exportedAt = proposal.exportedAt || nowIso(clock);
    proposal.exportFileName = exportArtifact.exportFileName;
    proposal.exportPayload = exportArtifact.exportPayload;
    proposal.exportPayloadHash = hashObject({ paymentProposalId: proposal.paymentProposalId, exportPayload: proposal.exportPayload });
    proposal.updatedAt = nowIso(clock);
    paymentBatch.status = "exported";
    paymentBatch.exportedAt = proposal.exportedAt;
    paymentBatch.exportFileName = exportArtifact.exportFileName;
    paymentBatch.exportPayload = exportArtifact.exportPayload;
    paymentBatch.exportPayloadHash = hashObject({ paymentBatchId: paymentBatch.paymentBatchId, exportPayload: exportArtifact.exportPayload });
    paymentBatch.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: proposal.companyId,
      actorId,
      correlationId,
      action: "bank.payment_proposal.exported",
      entityType: "payment_proposal",
      entityId: proposal.paymentProposalId,
      explanation: `Exported payment proposal ${proposal.paymentProposalNo}.`
    });
    return presentPaymentProposal(state, proposal.paymentProposalId);
  }

  function submitPaymentProposal({ companyId, paymentProposalId, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const proposal = requirePaymentProposalRecord(state, companyId, paymentProposalId);
    const paymentBatch = requirePaymentBatchByProposalRecord(state, proposal);
    if (!["exported", "submitted", "accepted_by_bank", "partially_executed", "settled"].includes(proposal.status)) {
      throw createError(409, "payment_proposal_not_exported", "Payment proposal must be exported before submit.");
    }
    proposal.status = proposal.status === "settled" ? "settled" : "submitted";
    proposal.submittedAt = proposal.submittedAt || nowIso(clock);
    proposal.updatedAt = nowIso(clock);
    paymentBatch.status = proposal.status === "settled" ? "settled" : "submitted";
    paymentBatch.submittedAt = proposal.submittedAt;
    paymentBatch.updatedAt = nowIso(clock);
    for (const order of listProposalOrderRecords(state, proposal.paymentProposalId)) {
      if (order.status === "reserved") {
        order.status = "sent";
        order.updatedAt = nowIso(clock);
      }
    }
    pushAudit(state, clock, {
      companyId: proposal.companyId,
      actorId,
      correlationId,
      action: "bank.payment_proposal.submitted",
      entityType: "payment_proposal",
      entityId: proposal.paymentProposalId,
      explanation: `Submitted payment proposal ${proposal.paymentProposalNo}.`
    });
    return presentPaymentProposal(state, proposal.paymentProposalId);
  }

  function acceptPaymentProposal({ companyId, paymentProposalId, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const proposal = requirePaymentProposalRecord(state, companyId, paymentProposalId);
    const paymentBatch = requirePaymentBatchByProposalRecord(state, proposal);
    if (!["submitted", "accepted_by_bank", "partially_executed", "settled"].includes(proposal.status)) {
      throw createError(409, "payment_proposal_not_submitted", "Payment proposal must be submitted before bank acceptance.");
    }
    proposal.status = proposal.status === "settled" ? "settled" : "accepted_by_bank";
    proposal.acceptedByBankAt = proposal.acceptedByBankAt || nowIso(clock);
    proposal.updatedAt = nowIso(clock);
    paymentBatch.status = proposal.status === "settled" ? "settled" : "accepted_by_bank";
    paymentBatch.acceptedByBankAt = proposal.acceptedByBankAt;
    paymentBatch.updatedAt = nowIso(clock);
    for (const order of listProposalOrderRecords(state, proposal.paymentProposalId)) {
      if (order.status === "sent") {
        order.status = "accepted";
        order.updatedAt = nowIso(clock);
      }
    }
    pushAudit(state, clock, {
      companyId: proposal.companyId,
      actorId,
      correlationId,
      action: "bank.payment_proposal.accepted",
      entityType: "payment_proposal",
      entityId: proposal.paymentProposalId,
      explanation: `Registered bank acceptance for payment proposal ${proposal.paymentProposalNo}.`
    });
    return presentPaymentProposal(state, proposal.paymentProposalId);
  }

  function bookPaymentOrder({
    companyId,
    paymentOrderId,
    bankEventId,
    bookedOn = null,
    bankStatementEventId = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    ensureApPlatform(apPlatform);
    const order = requirePaymentOrderRecord(state, companyId, paymentOrderId);
    const proposal = requirePaymentProposalRecord(state, companyId, order.paymentProposalId);
    const bankAccount = requireBankAccountRecord(state, proposal.companyId, proposal.bankAccountId);
    const bankPaymentEvent = upsertBankPaymentEvent(state, proposal.companyId, order.paymentOrderId, bankEventId, "booked", clock);
    if (bankPaymentEvent.idempotentReplay) {
      return { paymentProposal: presentPaymentProposal(state, proposal.paymentProposalId), paymentOrder: copy(order), bankPaymentEvent: copy(bankPaymentEvent.bankPaymentEvent), idempotentReplay: true };
    }
    if (!["reserved", "sent", "accepted", "booked"].includes(order.status)) {
      throw createError(409, "payment_order_not_bookable", "Payment order is not in a bookable state.");
    }
    const settled = apPlatform.settleApOpenItem({
      companyId: proposal.companyId,
      apOpenItemId: order.apOpenItemId,
      paymentOrderId: order.paymentOrderId,
      bankAccountNumber: bankAccount.ledgerAccountNumber,
      bankEventId,
      bookedOn,
      actorId,
      correlationId
    });
    order.status = "booked";
    order.bankEventId = bankEventId;
    order.lastStatementEventId = null;
    order.failureReasonCode = null;
    order.bookedJournalEntryId = settled.journalEntryId;
    order.updatedAt = nowIso(clock);
    bankPaymentEvent.bankPaymentEvent.journalEntryId = settled.journalEntryId;
    bankPaymentEvent.bankPaymentEvent.status = "processed";
    syncSettlementLiabilityLinkForPaymentOrder(state, clock, {
      companyId: proposal.companyId,
      paymentOrderId: order.paymentOrderId,
      bankStatementEventId,
      bankPaymentEventId: bankPaymentEvent.bankPaymentEvent.bankPaymentEventId,
      status: "settled",
      settledAmount: order.amount
    });
    refreshProposalStatus(state, proposal.paymentProposalId, clock);
    return { paymentProposal: presentPaymentProposal(state, proposal.paymentProposalId), paymentOrder: copy(order), bankPaymentEvent: copy(bankPaymentEvent.bankPaymentEvent), idempotentReplay: false };
  }

  function rejectPaymentOrder({
    companyId,
    paymentOrderId,
    bankEventId,
    bankStatementEventId = null,
    actorId = "system",
    correlationId = crypto.randomUUID(),
    reasonCode = "payment_rejected"
  } = {}) {
    ensureApPlatform(apPlatform);
    const order = requirePaymentOrderRecord(state, companyId, paymentOrderId);
    const proposal = requirePaymentProposalRecord(state, companyId, order.paymentProposalId);
    const bankPaymentEvent = upsertBankPaymentEvent(state, proposal.companyId, order.paymentOrderId, bankEventId, "rejected", clock);
    if (bankPaymentEvent.idempotentReplay) {
      return { paymentProposal: presentPaymentProposal(state, proposal.paymentProposalId), paymentOrder: copy(order), bankPaymentEvent: copy(bankPaymentEvent.bankPaymentEvent), idempotentReplay: true };
    }
    if (!["reserved", "sent", "accepted", "rejected"].includes(order.status)) {
      throw createError(409, "payment_order_not_rejectable", "Payment order is not in a rejectable state.");
    }
    const released = apPlatform.releaseApOpenItemReservation({
      companyId: proposal.companyId,
      apOpenItemId: order.apOpenItemId,
      paymentOrderId: order.paymentOrderId,
      actorId,
      correlationId,
      reasonCode
    });
    order.status = "rejected";
    order.bankEventId = bankEventId;
    order.failureReasonCode = reasonCode;
    order.lastStatementEventId = null;
    order.rejectedJournalEntryId = released.journalEntryId;
    order.updatedAt = nowIso(clock);
    bankPaymentEvent.bankPaymentEvent.journalEntryId = released.journalEntryId;
    bankPaymentEvent.bankPaymentEvent.status = "processed";
    syncSettlementLiabilityLinkForPaymentOrder(state, clock, {
      companyId: proposal.companyId,
      paymentOrderId: order.paymentOrderId,
      bankStatementEventId,
      bankPaymentEventId: bankPaymentEvent.bankPaymentEvent.bankPaymentEventId,
      status: "rejected",
      settledAmount: 0
    });
    refreshProposalStatus(state, proposal.paymentProposalId, clock);
    return { paymentProposal: presentPaymentProposal(state, proposal.paymentProposalId), paymentOrder: copy(order), bankPaymentEvent: copy(bankPaymentEvent.bankPaymentEvent), idempotentReplay: false };
  }

  function returnPaymentOrder({
    companyId,
    paymentOrderId,
    bankEventId,
    returnedOn = null,
    bankStatementEventId = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    ensureApPlatform(apPlatform);
    const order = requirePaymentOrderRecord(state, companyId, paymentOrderId);
    const proposal = requirePaymentProposalRecord(state, companyId, order.paymentProposalId);
    const bankAccount = requireBankAccountRecord(state, proposal.companyId, proposal.bankAccountId);
    const bankPaymentEvent = upsertBankPaymentEvent(state, proposal.companyId, order.paymentOrderId, bankEventId, "returned", clock);
    if (bankPaymentEvent.idempotentReplay) {
      return { paymentProposal: presentPaymentProposal(state, proposal.paymentProposalId), paymentOrder: copy(order), bankPaymentEvent: copy(bankPaymentEvent.bankPaymentEvent), idempotentReplay: true };
    }
    if (!["booked", "returned"].includes(order.status)) {
      throw createError(409, "payment_order_not_returnable", "Only booked payment orders can be returned.");
    }
    const reopened = apPlatform.reopenApOpenItem({
      companyId: proposal.companyId,
      apOpenItemId: order.apOpenItemId,
      paymentOrderId: order.paymentOrderId,
      bankAccountNumber: bankAccount.ledgerAccountNumber,
      bankEventId,
      returnedOn,
      actorId,
      correlationId
    });
    order.status = "returned";
    order.bankEventId = bankEventId;
    order.failureReasonCode = "payment_returned";
    order.lastStatementEventId = null;
    order.returnedJournalEntryId = reopened.journalEntryId;
    order.updatedAt = nowIso(clock);
    bankPaymentEvent.bankPaymentEvent.journalEntryId = reopened.journalEntryId;
    bankPaymentEvent.bankPaymentEvent.status = "processed";
    syncSettlementLiabilityLinkForPaymentOrder(state, clock, {
      companyId: proposal.companyId,
      paymentOrderId: order.paymentOrderId,
      bankStatementEventId,
      bankPaymentEventId: bankPaymentEvent.bankPaymentEvent.bankPaymentEventId,
      status: "returned",
      settledAmount: 0
    });
    refreshProposalStatus(state, proposal.paymentProposalId, clock);
    return { paymentProposal: presentPaymentProposal(state, proposal.paymentProposalId), paymentOrder: copy(order), bankPaymentEvent: copy(bankPaymentEvent.bankPaymentEvent), idempotentReplay: false };
  }

  function snapshotBanking() {
    return copy({
      bankAccounts: [...state.bankAccounts.values()],
      paymentBatches: [...state.paymentBatches.values()],
      bankStatementEvents: [...state.bankStatementEvents.values()],
      statementImports: [...state.statementImports.values()],
      reconciliationCases: [...state.reconciliationCases.values()],
      settlementLiabilityLinks: [...state.settlementLiabilityLinks.values()],
      paymentProposals: [...state.paymentProposals.values()],
      paymentOrders: [...state.paymentOrders.values()],
      bankPaymentEvents: [...state.bankPaymentEvents.values()],
      auditEvents: state.auditEvents
    });
  }

  function seedDemoState() {}
}

function ensureApPlatform(apPlatform) {
  if (!apPlatform || typeof apPlatform.getApOpenItem !== "function" || typeof apPlatform.getSupplierInvoice !== "function" || typeof apPlatform.getSupplier !== "function") {
    throw createError(500, "ap_platform_missing", "AP platform is required for banking orchestration.");
  }
}

function validateOpenItemForProposal({ openItem, invoice, supplier, bankAccount, paymentPreparation = null }) {
  if (openItem.status !== "open") throw createError(409, "ap_open_item_not_open", "Only open AP items can be selected.");
  if (invoice.status !== "posted") throw createError(409, "supplier_invoice_not_posted", "Only posted supplier invoices can be paid.");
  if (Number(openItem.openAmount || 0) <= 0 || invoice.invoiceType === "credit_note") {
    throw createError(409, "credit_note_not_payable", "Supplier credit notes and non-positive AP balances cannot be turned into payment proposals.");
  }
  if (paymentPreparation && paymentPreparation.status !== "ready") {
    throw createError(
      409,
      "payment_not_ready",
      `Supplier invoice is not payment-ready: ${(paymentPreparation.blockerCodes || []).join(", ")}.`
    );
  }
  if (invoice.paymentReadinessStatus && invoice.paymentReadinessStatus !== "ready") {
    throw createError(
      409,
      "payment_not_ready",
      `Supplier invoice is not payment-ready: ${(invoice.paymentReadinessReasonCodes || []).join(", ")}.`
    );
  }
  if (invoice.reviewRequired || supplier.paymentBlocked === true || invoice.paymentHold === true) throw createError(409, "payment_hold_active", "Supplier invoice is blocked from payment.");
  if (invoice.currencyCode !== bankAccount.currencyCode) throw createError(409, "payment_currency_mismatch", "Payment currency must match bank account currency in v1.");
  if (!supplier.bankgiro && !supplier.plusgiro && !supplier.iban) throw createError(409, "supplier_payment_details_missing", "Supplier is missing payment details.");
}

function presentPaymentProposal(state, paymentProposalId) {
  const proposal = state.paymentProposals.get(paymentProposalId);
  if (!proposal) return null;
  const paymentBatchId = proposal.paymentBatchId || state.paymentBatchIdByProposal.get(proposal.paymentProposalId) || null;
  return copy({
    ...proposal,
    bankAccount: state.bankAccounts.get(proposal.bankAccountId) || null,
    paymentBatch: paymentBatchId ? presentPaymentBatch(state, paymentBatchId) : null,
    orders: listProposalOrderRecords(state, paymentProposalId).map(copy)
  });
}

function listProposalOrderRecords(state, paymentProposalId) {
  return (state.paymentOrderIdsByProposal.get(paymentProposalId) || []).map((paymentOrderId) => state.paymentOrders.get(paymentOrderId)).filter(Boolean).sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function presentPaymentBatch(state, paymentBatchId) {
  const paymentBatch = state.paymentBatches.get(paymentBatchId);
  if (!paymentBatch) return null;
  const proposal = state.paymentProposals.get(paymentBatch.paymentProposalId) || null;
  return copy({
    ...paymentBatch,
    bankAccount: state.bankAccounts.get(paymentBatch.bankAccountId) || null,
    proposal: proposal ? { paymentProposalId: proposal.paymentProposalId, paymentProposalNo: proposal.paymentProposalNo, status: proposal.status } : null,
    orders: proposal ? listProposalOrderRecords(state, proposal.paymentProposalId).map(copy) : []
  });
}

function presentStatementImport(state, statementImportId) {
  const statementImport = state.statementImports.get(statementImportId);
  if (!statementImport) return null;
  const items = (state.bankStatementEventIdsByCompany.get(statementImport.companyId) || [])
    .map((bankStatementEventId) => state.bankStatementEvents.get(bankStatementEventId))
    .filter((event) => event?.statementImportId === statementImport.statementImportId)
    .map(copy);
  return copy({
    ...statementImport,
    bankAccount: state.bankAccounts.get(statementImport.bankAccountId) || null,
    items
  });
}

function requirePaymentBatchRecord(state, companyId, paymentBatchId) {
  const paymentBatch = state.paymentBatches.get(requireText(paymentBatchId, "payment_batch_id_required"));
  if (!paymentBatch || paymentBatch.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "payment_batch_not_found", "Payment batch was not found.");
  }
  return paymentBatch;
}

function requirePaymentBatchByProposalRecord(state, proposal) {
  const paymentBatchId = proposal?.paymentBatchId || state.paymentBatchIdByProposal.get(proposal?.paymentProposalId);
  if (!paymentBatchId) {
    throw createError(404, "payment_batch_not_found", "Payment batch was not found for payment proposal.");
  }
  return requirePaymentBatchRecord(state, proposal.companyId, paymentBatchId);
}

function requireStatementImportRecord(state, companyId, statementImportId) {
  const statementImport = state.statementImports.get(requireText(statementImportId, "statement_import_id_required"));
  if (!statementImport || statementImport.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "statement_import_not_found", "Statement import was not found.");
  }
  return statementImport;
}

function upsertBankPaymentEvent(state, companyId, paymentOrderId, bankEventId, eventType, clock) {
  const scopedKey = toCompanyScopedKey(companyId, `${assertAllowed(eventType, BANK_PAYMENT_EVENT_TYPES, "bank_payment_event_type_invalid")}:${requireText(bankEventId, "bank_event_id_required")}`);
  if (state.bankPaymentEventIdsByKey.has(scopedKey)) {
    return { bankPaymentEvent: state.bankPaymentEvents.get(state.bankPaymentEventIdsByKey.get(scopedKey)), idempotentReplay: true };
  }
  const bankPaymentEvent = {
    bankPaymentEventId: crypto.randomUUID(),
    companyId: requireText(companyId, "company_id_required"),
    paymentOrderId: requireText(paymentOrderId, "payment_order_id_required"),
    bankEventId: requireText(bankEventId, "bank_event_id_required"),
    eventType,
    status: "received",
    journalEntryId: null,
    createdAt: nowIso(clock),
    updatedAt: nowIso(clock)
  };
  state.bankPaymentEvents.set(bankPaymentEvent.bankPaymentEventId, bankPaymentEvent);
  state.bankPaymentEventIdsByKey.set(scopedKey, bankPaymentEvent.bankPaymentEventId);
  return { bankPaymentEvent, idempotentReplay: false };
}

function refreshProposalStatus(state, paymentProposalId, clock) {
  const proposal = state.paymentProposals.get(paymentProposalId);
  if (!proposal) return;
  const orders = listProposalOrderRecords(state, paymentProposalId);
  proposal.failureReasonCodes = uniqueStrings(
    orders.map((order) => order.failureReasonCode).filter(Boolean)
  );
  if (orders.length === 0) proposal.status = "cancelled";
  else if (orders.every((order) => order.status === "booked")) { proposal.status = "settled"; proposal.settledAt = proposal.settledAt || nowIso(clock); }
  else if (orders.every((order) => ["returned", "rejected"].includes(order.status))) { proposal.status = "failed"; proposal.failedAt = proposal.failedAt || nowIso(clock); }
  else if (orders.some((order) => ["booked", "returned", "rejected"].includes(order.status))) proposal.status = "partially_executed";
  else if (orders.some((order) => order.status === "accepted")) proposal.status = "accepted_by_bank";
  else if (orders.some((order) => order.status === "sent")) proposal.status = "submitted";
  else if (orders.some((order) => order.status === "reserved")) proposal.status = "exported";
  else proposal.status = proposal.approvedAt ? "approved" : "draft";
  proposal.updatedAt = nowIso(clock);
  syncPaymentBatchStatus(state, proposal, clock);
}

function syncPaymentBatchStatus(state, proposal, clock) {
  const paymentBatch = proposal ? state.paymentBatches.get(proposal.paymentBatchId || state.paymentBatchIdByProposal.get(proposal.paymentProposalId)) : null;
  if (!paymentBatch) return;
  const statusMap = {
    draft: "draft",
    approved: "draft",
    exported: "exported",
    submitted: "submitted",
    accepted_by_bank: "accepted_by_bank",
    partially_executed: "partially_executed",
    settled: "settled",
    failed: "failed",
    cancelled: "cancelled"
  };
  paymentBatch.status = statusMap[proposal.status] || paymentBatch.status;
  paymentBatch.totalAmount = proposal.totalAmount;
  if (proposal.exportedAt) paymentBatch.exportedAt = proposal.exportedAt;
  if (proposal.submittedAt) paymentBatch.submittedAt = proposal.submittedAt;
  if (proposal.acceptedByBankAt) paymentBatch.acceptedByBankAt = proposal.acceptedByBankAt;
  if (proposal.settledAt) paymentBatch.settledAt = proposal.settledAt;
  if (proposal.failedAt) paymentBatch.failedAt = proposal.failedAt;
  if (proposal.cancelledAt) paymentBatch.cancelledAt = proposal.cancelledAt;
  paymentBatch.updatedAt = nowIso(clock);
}

function ensureSettlementLiabilityLinkRecord(
  state,
  clock,
  {
    companyId,
    paymentBatchId,
    paymentProposalId,
    paymentOrderId,
    liabilityObjectType,
    liabilityObjectId,
    relatedObjectType = null,
    relatedObjectId = null,
    expectedAmount,
    currencyCode
  }
) {
  const existingId = state.settlementLiabilityLinkIdByPaymentOrder.get(paymentOrderId);
  if (existingId) {
    return state.settlementLiabilityLinks.get(existingId);
  }
  const record = {
    settlementLiabilityLinkId: crypto.randomUUID(),
    companyId: requireText(companyId, "company_id_required"),
    paymentBatchId: requireText(paymentBatchId, "payment_batch_id_required"),
    paymentProposalId: requireText(paymentProposalId, "payment_proposal_id_required"),
    paymentOrderId: requireText(paymentOrderId, "payment_order_id_required"),
    bankStatementEventId: null,
    bankPaymentEventId: null,
    bankAccountId: null,
    liabilityObjectType: assertAllowed(liabilityObjectType, SETTLEMENT_LIABILITY_OBJECT_TYPES, "settlement_liability_object_type_invalid"),
    liabilityObjectId: requireText(liabilityObjectId, "settlement_liability_object_id_required"),
    relatedObjectType: normalizeOptionalText(relatedObjectType),
    relatedObjectId: normalizeOptionalText(relatedObjectId),
    expectedAmount: roundMoney(expectedAmount),
    settledAmount: 0,
    currencyCode: normalizeUpperCode(currencyCode, "currency_code_required", 3),
    status: "pending",
    createdAt: nowIso(clock),
    updatedAt: nowIso(clock)
  };
  state.settlementLiabilityLinks.set(record.settlementLiabilityLinkId, record);
  ensureCollection(state.settlementLiabilityLinkIdsByCompany, record.companyId).push(record.settlementLiabilityLinkId);
  state.settlementLiabilityLinkIdByPaymentOrder.set(record.paymentOrderId, record.settlementLiabilityLinkId);
  return record;
}

function syncSettlementLiabilityLinkForPaymentOrder(
  state,
  clock,
  {
    companyId,
    paymentOrderId,
    bankStatementEventId = null,
    bankPaymentEventId = null,
    status,
    settledAmount = null,
    clearBankStatementEventId = false,
    clearBankPaymentEventId = false
  }
) {
  const linkId = state.settlementLiabilityLinkIdByPaymentOrder.get(requireText(paymentOrderId, "payment_order_id_required"));
  if (!linkId) return null;
  const link = state.settlementLiabilityLinks.get(linkId);
  if (!link || link.companyId !== requireText(companyId, "company_id_required")) return null;
  if (clearBankStatementEventId) {
    link.bankStatementEventId = null;
  } else {
    link.bankStatementEventId = normalizeOptionalText(bankStatementEventId) || link.bankStatementEventId;
  }
  if (clearBankPaymentEventId) {
    link.bankPaymentEventId = null;
  } else {
    link.bankPaymentEventId = normalizeOptionalText(bankPaymentEventId) || link.bankPaymentEventId;
  }
  link.status = assertAllowed(status, SETTLEMENT_LIABILITY_LINK_STATUSES, "settlement_link_status_invalid");
  link.settledAmount = settledAmount == null ? link.settledAmount : roundMoney(settledAmount);
  link.updatedAt = nowIso(clock);
  return link;
}

function upsertStatementSettlementLiabilityLink(
  state,
  clock,
  { companyId, bankStatementEventId, bankAccountId, liabilityObjectType, liabilityObjectId, expectedAmount, currencyCode, status }
) {
  const scopedKey = toCompanyScopedKey(requireText(companyId, "company_id_required"), requireText(bankStatementEventId, "bank_statement_event_id_required"));
  const existingId = state.settlementLiabilityLinkIdByStatementEvent.get(scopedKey);
  if (existingId) {
    const existing = state.settlementLiabilityLinks.get(existingId);
    existing.status = assertAllowed(status, SETTLEMENT_LIABILITY_LINK_STATUSES, "settlement_link_status_invalid");
    existing.updatedAt = nowIso(clock);
    return existing;
  }
  const record = {
    settlementLiabilityLinkId: crypto.randomUUID(),
    companyId: requireText(companyId, "company_id_required"),
    paymentBatchId: null,
    paymentProposalId: null,
    paymentOrderId: null,
    bankStatementEventId: requireText(bankStatementEventId, "bank_statement_event_id_required"),
    bankPaymentEventId: null,
    bankAccountId: requireText(bankAccountId, "bank_account_id_required"),
    liabilityObjectType: assertAllowed(liabilityObjectType, SETTLEMENT_LIABILITY_OBJECT_TYPES, "settlement_liability_object_type_invalid"),
    liabilityObjectId: requireText(liabilityObjectId, "settlement_liability_object_id_required"),
    relatedObjectType: null,
    relatedObjectId: null,
    expectedAmount: roundMoney(expectedAmount),
    settledAmount: roundMoney(expectedAmount),
    currencyCode: normalizeUpperCode(currencyCode, "currency_code_required", 3),
    status: assertAllowed(status, SETTLEMENT_LIABILITY_LINK_STATUSES, "settlement_link_status_invalid"),
    createdAt: nowIso(clock),
    updatedAt: nowIso(clock)
  };
  state.settlementLiabilityLinks.set(record.settlementLiabilityLinkId, record);
  ensureCollection(state.settlementLiabilityLinkIdsByCompany, record.companyId).push(record.settlementLiabilityLinkId);
  state.settlementLiabilityLinkIdByStatementEvent.set(scopedKey, record.settlementLiabilityLinkId);
  return record;
}

function resolvePaymentRailConfig({
  paymentRailCode = "bankgiro_file",
  paymentFileFormatCode = null,
  providerCode = null,
  effectiveDate,
  integrationsPlatform = null,
  getIntegrationsPlatform = null
} = {}) {
  const railTemplate = PAYMENT_RAIL_CONFIG_BY_CODE[assertAllowed(paymentRailCode, PAYMENT_RAIL_CODES, "payment_rail_code_invalid")];
  const resolvedPaymentFileFormatCode =
    paymentFileFormatCode == null
      ? railTemplate.paymentFileFormatCode
      : assertAllowed(paymentFileFormatCode, PAYMENT_FILE_FORMAT_CODES, "payment_file_format_code_invalid");
  const resolvedProviderCode = normalizeOptionalText(providerCode) || railTemplate.providerCode;
  return {
    paymentRailCode: railTemplate.paymentRailCode,
    paymentFileFormatCode: resolvedPaymentFileFormatCode,
    providerCode: resolvedProviderCode,
    deliveryMode: railTemplate.deliveryMode,
    providerBaselineRef: resolveProviderBaselineRef({
      providerCode: resolvedProviderCode,
      baselineCode: railTemplate.baselineCode,
      effectiveDate,
      integrationsPlatform,
      getIntegrationsPlatform
    })
  };
}

function resolveStatementImportConfig({
  sourceChannelCode = "manual_statement",
  statementFileFormatCode = null,
  providerCode = null,
  effectiveDate,
  integrationsPlatform = null,
  getIntegrationsPlatform = null
} = {}) {
  const sourceTemplate =
    STATEMENT_IMPORT_SOURCE_CONFIG_BY_CODE[assertAllowed(sourceChannelCode, STATEMENT_IMPORT_SOURCE_CODES, "statement_import_source_invalid")];
  const resolvedProviderCode = normalizeOptionalText(providerCode) || sourceTemplate.providerCode;
  return {
    sourceChannelCode: sourceTemplate.sourceChannelCode,
    statementFileFormatCode: normalizeOptionalText(statementFileFormatCode) || sourceTemplate.fileFormatCode,
    providerCode: resolvedProviderCode,
    providerBaselineRef:
      sourceTemplate.baselineCode && resolvedProviderCode
        ? resolveProviderBaselineRef({
            providerCode: resolvedProviderCode,
            baselineCode: sourceTemplate.baselineCode,
            effectiveDate,
            integrationsPlatform,
            getIntegrationsPlatform
          })
        : null
  };
}

function resolveProviderBaselineRef({ providerCode, baselineCode, effectiveDate, integrationsPlatform = null, getIntegrationsPlatform = null } = {}) {
  if (!providerCode || !baselineCode) {
    return null;
  }
  const integrationPlatform = resolveDeferredPlatform({
    platform: integrationsPlatform,
    getter: getIntegrationsPlatform
  });
  if (!integrationPlatform || typeof integrationPlatform.resolveProviderBaseline !== "function") {
    return {
      providerBaselineId: null,
      baselineCode,
      providerCode,
      providerBaselineVersion: null,
      providerBaselineChecksum: null
    };
  }
  const providerBaseline = integrationPlatform.resolveProviderBaseline({
    domain: "integrations",
    jurisdiction: "SE",
    providerCode,
    baselineCode,
    effectiveDate: normalizeDate(effectiveDate || new Date().toISOString().slice(0, 10), "provider_baseline_effective_date_invalid")
  });
  if (!providerBaseline) {
    return null;
  }
  return {
    providerBaselineId: providerBaseline.providerBaselineId,
    baselineCode: providerBaseline.baselineCode,
    providerCode: providerBaseline.providerCode,
    providerBaselineVersion: providerBaseline.version,
    providerBaselineChecksum: providerBaseline.checksum
  };
}

function isAllowedPendingActionResolutionCode(reconciliationCase, resolutionCode) {
  return resolutionCode === reconciliationCase.pendingActionCode || resolutionCode === "written_off";
}

function buildPaymentBatchExportArtifact({ paymentBatch, proposal, bankAccount, orders }) {
  switch (paymentBatch.paymentRailCode) {
    case "open_banking":
      return {
        exportFileName: `${paymentBatch.paymentBatchNo}.json`,
        exportPayload: stableStringify({
          paymentBatchId: paymentBatch.paymentBatchId,
          paymentBatchNo: paymentBatch.paymentBatchNo,
          paymentDate: proposal.paymentDate,
          rail: paymentBatch.paymentRailCode,
          providerCode: paymentBatch.providerCode,
          bankAccount: {
            bankAccountId: bankAccount.bankAccountId,
            accountNumber: bankAccount.accountNumber,
            iban: bankAccount.iban
          },
          orders: orders.map((order) => ({
            paymentOrderId: order.paymentOrderId,
            amount: order.amount,
            currencyCode: order.currencyCode,
            paymentReference: order.paymentReference,
            payeeName: order.payeeName,
            beneficiaryAccount: order.iban || order.bankgiro || order.plusgiro || null
          }))
        })
      };
    case "iso20022_file":
      return {
        exportFileName: `${paymentBatch.paymentBatchNo}.xml`,
        exportPayload: [
          `<PaymentBatch id="${paymentBatch.paymentBatchNo}" rail="iso20022_file" format="pain.001" paymentDate="${proposal.paymentDate}">`,
          ...orders.map(
            (order) =>
              `  <PaymentOrder id="${order.paymentOrderId}" amount="${order.amount.toFixed(2)}" currency="${order.currencyCode}" dueDate="${order.dueDate}" account="${escapeXml(order.iban || order.bankgiro || order.plusgiro || "")}" reference="${escapeXml(order.paymentReference)}" payee="${escapeXml(order.payeeName)}" />`
          ),
          `</PaymentBatch>`
        ].join("\n")
      };
    default: {
      const rows = orders.map((order) =>
        [order.payeeName, order.bankgiro || order.plusgiro || order.iban || "", order.amount.toFixed(2), order.currencyCode, order.dueDate, order.paymentReference].join(";")
      );
      return {
        exportFileName: `${paymentBatch.paymentBatchNo}.csv`,
        exportPayload: ["payee;account;amount;currency;due_date;reference", ...rows].join("\n")
      };
    }
  }
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function requireBankAccountRecord(state, companyId, bankAccountId) {
  const bankAccount = state.bankAccounts.get(requireText(bankAccountId, "bank_account_id_required"));
  if (!bankAccount || bankAccount.companyId !== requireText(companyId, "company_id_required")) throw createError(404, "bank_account_not_found", "Bank account was not found.");
  return bankAccount;
}

function requirePaymentProposalRecord(state, companyId, paymentProposalId) {
  const proposal = state.paymentProposals.get(requireText(paymentProposalId, "payment_proposal_id_required"));
  if (!proposal || proposal.companyId !== requireText(companyId, "company_id_required")) throw createError(404, "payment_proposal_not_found", "Payment proposal was not found.");
  return proposal;
}

function requirePaymentOrderRecord(state, companyId, paymentOrderId) {
  const order = state.paymentOrders.get(requireText(paymentOrderId, "payment_order_id_required"));
  if (!order || order.companyId !== requireText(companyId, "company_id_required")) throw createError(404, "payment_order_not_found", "Payment order was not found.");
  return order;
}

function requireBankStatementEventRecord(state, companyId, bankStatementEventId) {
  const statementEvent = state.bankStatementEvents.get(requireText(bankStatementEventId, "bank_statement_event_id_required"));
  if (!statementEvent || statementEvent.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "bank_statement_event_not_found", "Bank statement event was not found.");
  }
  return statementEvent;
}

function requireBankReconciliationCaseRecord(state, companyId, reconciliationCaseId) {
  const reconciliationCase = state.reconciliationCases.get(requireText(reconciliationCaseId, "bank_reconciliation_case_id_required"));
  if (!reconciliationCase || reconciliationCase.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "bank_reconciliation_case_not_found", "Bank reconciliation case was not found.");
  }
  return reconciliationCase;
}

function assertProposalTransition(currentStatus, targetStatus) {
  const transitions = { draft: new Set(["approved", "cancelled"]), approved: new Set(["exported", "cancelled"]), exported: new Set(["submitted", "accepted_by_bank", "partially_executed", "settled", "failed"]), submitted: new Set(["accepted_by_bank", "partially_executed", "settled", "failed"]), accepted_by_bank: new Set(["partially_executed", "settled", "failed"]), partially_executed: new Set(["settled", "failed"]), settled: new Set(), failed: new Set(), cancelled: new Set() };
  if (!(transitions[currentStatus] || new Set()).has(targetStatus)) throw createError(409, "payment_proposal_transition_invalid", `Cannot move payment proposal from ${currentStatus} to ${targetStatus}.`);
}

function ensureCollection(map, key) { if (!map.has(key)) map.set(key, []); return map.get(key); }
function uniqueStrings(values) { return [...new Set((values || []).filter(Boolean))]; }
function nextScopedSequence(state, companyId, sequenceKey, prefix) { const companyCounters = state.countersByCompany.get(companyId) || {}; const nextNumber = Number(companyCounters[sequenceKey] || 0) + 1; companyCounters[sequenceKey] = nextNumber; state.countersByCompany.set(companyId, companyCounters); return `${requireText(prefix, "sequence_prefix_required")}${String(nextNumber).padStart(4, "0")}`; }
function normalizeOptionalText(value) { if (value === null || value === undefined) return null; const normalized = String(value).trim(); return normalized.length > 0 ? normalized : null; }
function requireText(value, code) { const normalized = normalizeOptionalText(value); if (!normalized) throw createError(400, code, `Missing required value for ${code}.`); return normalized; }
function normalizeUpperCode(value, code, expectedLength) { const normalized = requireText(value, code).toUpperCase(); if (expectedLength && normalized.length !== expectedLength) throw createError(409, code, `Expected ${expectedLength} characters for ${code}.`); return normalized; }
function normalizeDate(value, code) { const normalized = requireText(value, code); if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw createError(409, code, `Invalid date ${normalized}.`); return normalized; }
function assertAllowed(value, allowedValues, code) { const normalized = requireText(value, code); if (!allowedValues.includes(normalized)) throw createError(409, code, `Unsupported value ${normalized}.`); return normalized; }
function roundMoney(value) { return Number(Number(value || 0).toFixed(2)); }
function nowIso(clock) { return clock().toISOString(); }
function pushAudit(state, clock, event) {
  state.auditEvents.push(
    createAuditEnvelopeFromLegacyEvent({
      clock,
      auditClass: "banking_action",
      event
    })
  );
}
function createError(statusCode, code, message) { const error = new Error(message); error.statusCode = statusCode; error.code = code; return error; }
function toCompanyScopedKey(companyId, value) { return `${requireText(companyId, "company_id_required")}::${requireText(value, "scoped_key_required")}`; }
function resolveDeferredPlatform({ platform = null, getter = null }) { if (platform) return platform; if (typeof getter === "function") return getter() || null; return null; }
function buildStatementIdentityKey({ companyId, bankAccountId, externalReference, bookingDate, amount }) {
  return hashObject({
    companyId: requireText(companyId, "company_id_required"),
    bankAccountId: requireText(bankAccountId, "bank_account_id_required"),
    externalReference: requireText(externalReference, "bank_statement_external_reference_required"),
    bookingDate: normalizeDate(bookingDate, "bank_statement_booking_date_invalid"),
    amount: roundMoney(amount)
  });
}
function normalizeBankStatementEventInput({ bankAccount, rawEvent, statementDate }) {
  const externalReference = requireText(rawEvent?.externalReference || rawEvent?.bankEventId, "bank_statement_external_reference_required");
  const bookingDate = normalizeDate(rawEvent?.bookingDate || rawEvent?.eventDate || statementDate, "bank_statement_booking_date_invalid");
  return {
    externalReference,
    bookingDate,
    amount: roundMoney(Number(rawEvent?.amount || 0)),
    currencyCode: normalizeUpperCode(rawEvent?.currencyCode || bankAccount.currencyCode, "currency_code_required", 3),
    counterpartyName: normalizeOptionalText(rawEvent?.counterpartyName),
    referenceText: normalizeOptionalText(rawEvent?.referenceText),
    statementCategoryCode: assertAllowed(rawEvent?.statementCategoryCode || "generic", BANK_STATEMENT_CATEGORY_CODES, "bank_statement_category_invalid"),
    linkedPaymentOrderId: normalizeOptionalText(rawEvent?.linkedPaymentOrderId),
    paymentOrderAction: normalizeOptionalText(rawEvent?.paymentOrderAction)
      ? assertAllowed(rawEvent.paymentOrderAction, BANK_PAYMENT_ORDER_ACTIONS, "bank_payment_order_action_invalid")
      : null
  };
}
function hashObject(value) { return crypto.createHash("sha256").update(stableStringify(value)).digest("hex"); }
function stableStringify(value) { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(",")}]`; return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`; }
