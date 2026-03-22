import crypto from "node:crypto";

export const BANK_ACCOUNT_STATUSES = Object.freeze(["active", "blocked", "archived"]);
export const PAYMENT_PROPOSAL_STATUSES = Object.freeze(["draft", "approved", "exported", "submitted", "accepted_by_bank", "partially_executed", "settled", "failed", "cancelled"]);
export const PAYMENT_ORDER_STATUSES = Object.freeze(["prepared", "reserved", "sent", "accepted", "booked", "returned", "rejected"]);
export const BANK_PAYMENT_EVENT_TYPES = Object.freeze(["booked", "rejected", "returned"]);

export function createBankingPlatform(options = {}) {
  return createBankingEngine(options);
}

export function createBankingEngine({ clock = () => new Date(), seedDemo = false, apPlatform = null } = {}) {
  const state = {
    bankAccounts: new Map(),
    bankAccountIdsByCompany: new Map(),
    bankAccountIdsByIdentity: new Map(),
    paymentProposals: new Map(),
    paymentProposalIdsByCompany: new Map(),
    paymentProposalIdsByKey: new Map(),
    paymentOrders: new Map(),
    paymentOrderIdsByCompany: new Map(),
    paymentOrderIdsByProposal: new Map(),
    bankPaymentEvents: new Map(),
    bankPaymentEventIdsByKey: new Map(),
    countersByCompany: new Map(),
    auditEvents: []
  };

  if (seedDemo) {
    seedDemoState();
  }

  return {
    bankAccountStatuses: BANK_ACCOUNT_STATUSES,
    paymentProposalStatuses: PAYMENT_PROPOSAL_STATUSES,
    paymentOrderStatuses: PAYMENT_ORDER_STATUSES,
    bankPaymentEventTypes: BANK_PAYMENT_EVENT_TYPES,
    listBankAccounts,
    getBankAccount,
    createBankAccount,
    listPaymentProposals,
    getPaymentProposal,
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

  function createPaymentProposal({ companyId, bankAccountId, apOpenItemIds, paymentDate = null, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    ensureApPlatform(apPlatform);
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const bankAccount = requireBankAccountRecord(state, resolvedCompanyId, bankAccountId);
    if (bankAccount.status !== "active") {
      throw createError(409, "bank_account_not_active", "Only active bank accounts can be used.");
    }
    if (!Array.isArray(apOpenItemIds) || apOpenItemIds.length === 0) {
      throw createError(400, "payment_proposal_open_items_required", "Payment proposal requires AP open items.");
    }

    const uniqueOpenItemIds = [...new Set(apOpenItemIds.map((value) => requireText(value, "ap_open_item_id_required")))].sort();
    const sourceOpenItemSetHash = hashObject({ companyId: resolvedCompanyId, bankAccountId, paymentDate, apOpenItemIds: uniqueOpenItemIds });
    const scopedKey = toCompanyScopedKey(resolvedCompanyId, sourceOpenItemSetHash);
    if (state.paymentProposalIdsByKey.has(scopedKey)) {
      return presentPaymentProposal(state, state.paymentProposalIdsByKey.get(scopedKey));
    }

    const proposal = {
      paymentProposalId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      paymentProposalNo: nextScopedSequence(state, resolvedCompanyId, "paymentProposal", "PAY"),
      bankAccountId,
      status: "draft",
      paymentDate: normalizeDate(paymentDate || nowIso(clock).slice(0, 10), "payment_date_invalid"),
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
      createdByActorId: actorId,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.paymentProposals.set(proposal.paymentProposalId, proposal);
    ensureCollection(state.paymentProposalIdsByCompany, resolvedCompanyId).push(proposal.paymentProposalId);
    state.paymentProposalIdsByKey.set(scopedKey, proposal.paymentProposalId);

    for (const apOpenItemId of uniqueOpenItemIds) {
      const openItem = apPlatform.getApOpenItem({ companyId: resolvedCompanyId, apOpenItemId });
      const invoice = apPlatform.getSupplierInvoice({ companyId: resolvedCompanyId, supplierInvoiceId: openItem.supplierInvoiceId });
      const supplier = apPlatform.getSupplier({ companyId: resolvedCompanyId, supplierId: invoice.supplierId });
      validateOpenItemForProposal({ openItem, invoice, supplier, bankAccount });
      const order = {
        paymentOrderId: crypto.randomUUID(),
        companyId: resolvedCompanyId,
        paymentProposalId: proposal.paymentProposalId,
        apOpenItemId: openItem.apOpenItemId,
        supplierInvoiceId: invoice.supplierInvoiceId,
        supplierId: supplier.supplierId,
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
        bankEventId: null,
        createdAt: nowIso(clock),
        updatedAt: nowIso(clock)
      };
      state.paymentOrders.set(order.paymentOrderId, order);
      ensureCollection(state.paymentOrderIdsByCompany, resolvedCompanyId).push(order.paymentOrderId);
      ensureCollection(state.paymentOrderIdsByProposal, proposal.paymentProposalId).push(order.paymentOrderId);
      proposal.totalAmount = roundMoney(proposal.totalAmount + order.amount);
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
    const rows = orders.map((order) => [order.payeeName, order.bankgiro || order.plusgiro || order.iban || "", order.amount.toFixed(2), order.currencyCode, order.dueDate, order.paymentReference].join(";"));
    proposal.status = "exported";
    proposal.exportedAt = proposal.exportedAt || nowIso(clock);
    proposal.exportFileName = `${proposal.paymentProposalNo}.csv`;
    proposal.exportPayload = ["payee;account;amount;currency;due_date;reference", ...rows].join("\n");
    proposal.exportPayloadHash = hashObject({ paymentProposalId: proposal.paymentProposalId, exportPayload: proposal.exportPayload });
    proposal.updatedAt = nowIso(clock);
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
    if (!["exported", "submitted", "accepted_by_bank", "partially_executed", "settled"].includes(proposal.status)) {
      throw createError(409, "payment_proposal_not_exported", "Payment proposal must be exported before submit.");
    }
    proposal.status = proposal.status === "settled" ? "settled" : "submitted";
    proposal.submittedAt = proposal.submittedAt || nowIso(clock);
    proposal.updatedAt = nowIso(clock);
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
    if (!["submitted", "accepted_by_bank", "partially_executed", "settled"].includes(proposal.status)) {
      throw createError(409, "payment_proposal_not_submitted", "Payment proposal must be submitted before bank acceptance.");
    }
    proposal.status = proposal.status === "settled" ? "settled" : "accepted_by_bank";
    proposal.acceptedByBankAt = proposal.acceptedByBankAt || nowIso(clock);
    proposal.updatedAt = nowIso(clock);
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

  function bookPaymentOrder({ companyId, paymentOrderId, bankEventId, bookedOn = null, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
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
    order.bookedJournalEntryId = settled.journalEntryId;
    order.updatedAt = nowIso(clock);
    bankPaymentEvent.bankPaymentEvent.journalEntryId = settled.journalEntryId;
    bankPaymentEvent.bankPaymentEvent.status = "processed";
    refreshProposalStatus(state, proposal.paymentProposalId, clock);
    return { paymentProposal: presentPaymentProposal(state, proposal.paymentProposalId), paymentOrder: copy(order), bankPaymentEvent: copy(bankPaymentEvent.bankPaymentEvent), idempotentReplay: false };
  }

  function rejectPaymentOrder({ companyId, paymentOrderId, bankEventId, actorId = "system", correlationId = crypto.randomUUID(), reasonCode = "payment_rejected" } = {}) {
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
    order.rejectedJournalEntryId = released.journalEntryId;
    order.updatedAt = nowIso(clock);
    bankPaymentEvent.bankPaymentEvent.journalEntryId = released.journalEntryId;
    bankPaymentEvent.bankPaymentEvent.status = "processed";
    refreshProposalStatus(state, proposal.paymentProposalId, clock);
    return { paymentProposal: presentPaymentProposal(state, proposal.paymentProposalId), paymentOrder: copy(order), bankPaymentEvent: copy(bankPaymentEvent.bankPaymentEvent), idempotentReplay: false };
  }

  function returnPaymentOrder({ companyId, paymentOrderId, bankEventId, returnedOn = null, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
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
    order.returnedJournalEntryId = reopened.journalEntryId;
    order.updatedAt = nowIso(clock);
    bankPaymentEvent.bankPaymentEvent.journalEntryId = reopened.journalEntryId;
    bankPaymentEvent.bankPaymentEvent.status = "processed";
    refreshProposalStatus(state, proposal.paymentProposalId, clock);
    return { paymentProposal: presentPaymentProposal(state, proposal.paymentProposalId), paymentOrder: copy(order), bankPaymentEvent: copy(bankPaymentEvent.bankPaymentEvent), idempotentReplay: false };
  }

  function snapshotBanking() {
    return copy({
      bankAccounts: [...state.bankAccounts.values()],
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

function validateOpenItemForProposal({ openItem, invoice, supplier, bankAccount }) {
  if (openItem.status !== "open") throw createError(409, "ap_open_item_not_open", "Only open AP items can be selected.");
  if (invoice.status !== "posted") throw createError(409, "supplier_invoice_not_posted", "Only posted supplier invoices can be paid.");
  if (invoice.reviewRequired || supplier.paymentBlocked === true || invoice.paymentHold === true) throw createError(409, "payment_hold_active", "Supplier invoice is blocked from payment.");
  if (invoice.currencyCode !== bankAccount.currencyCode) throw createError(409, "payment_currency_mismatch", "Payment currency must match bank account currency in v1.");
  if (!supplier.bankgiro && !supplier.plusgiro && !supplier.iban) throw createError(409, "supplier_payment_details_missing", "Supplier is missing payment details.");
}

function presentPaymentProposal(state, paymentProposalId) {
  const proposal = state.paymentProposals.get(paymentProposalId);
  if (!proposal) return null;
  return copy({ ...proposal, bankAccount: state.bankAccounts.get(proposal.bankAccountId) || null, orders: listProposalOrderRecords(state, paymentProposalId).map(copy) });
}

function listProposalOrderRecords(state, paymentProposalId) {
  return (state.paymentOrderIdsByProposal.get(paymentProposalId) || []).map((paymentOrderId) => state.paymentOrders.get(paymentOrderId)).filter(Boolean).sort((left, right) => left.createdAt.localeCompare(right.createdAt));
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
  if (orders.length === 0) proposal.status = "cancelled";
  else if (orders.every((order) => order.status === "booked")) { proposal.status = "settled"; proposal.settledAt = proposal.settledAt || nowIso(clock); }
  else if (orders.some((order) => order.status === "booked" || order.status === "returned")) proposal.status = "partially_executed";
  else if (orders.every((order) => order.status === "rejected")) { proposal.status = "failed"; proposal.failedAt = proposal.failedAt || nowIso(clock); }
  else if (orders.some((order) => order.status === "accepted")) proposal.status = "accepted_by_bank";
  else if (orders.some((order) => order.status === "sent")) proposal.status = "submitted";
  else if (orders.some((order) => order.status === "reserved")) proposal.status = "exported";
  else proposal.status = proposal.approvedAt ? "approved" : "draft";
  proposal.updatedAt = nowIso(clock);
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

function assertProposalTransition(currentStatus, targetStatus) {
  const transitions = { draft: new Set(["approved", "cancelled"]), approved: new Set(["exported", "cancelled"]), exported: new Set(["submitted", "accepted_by_bank", "partially_executed", "settled", "failed"]), submitted: new Set(["accepted_by_bank", "partially_executed", "settled", "failed"]), accepted_by_bank: new Set(["partially_executed", "settled", "failed"]), partially_executed: new Set(["settled", "failed"]), settled: new Set(), failed: new Set(), cancelled: new Set() };
  if (!(transitions[currentStatus] || new Set()).has(targetStatus)) throw createError(409, "payment_proposal_transition_invalid", `Cannot move payment proposal from ${currentStatus} to ${targetStatus}.`);
}

function ensureCollection(map, key) { if (!map.has(key)) map.set(key, []); return map.get(key); }
function nextScopedSequence(state, companyId, sequenceKey, prefix) { const companyCounters = state.countersByCompany.get(companyId) || {}; const nextNumber = Number(companyCounters[sequenceKey] || 0) + 1; companyCounters[sequenceKey] = nextNumber; state.countersByCompany.set(companyId, companyCounters); return `${requireText(prefix, "sequence_prefix_required")}${String(nextNumber).padStart(4, "0")}`; }
function normalizeOptionalText(value) { if (value === null || value === undefined) return null; const normalized = String(value).trim(); return normalized.length > 0 ? normalized : null; }
function requireText(value, code) { const normalized = normalizeOptionalText(value); if (!normalized) throw createError(400, code, `Missing required value for ${code}.`); return normalized; }
function normalizeUpperCode(value, code, expectedLength) { const normalized = requireText(value, code).toUpperCase(); if (expectedLength && normalized.length !== expectedLength) throw createError(409, code, `Expected ${expectedLength} characters for ${code}.`); return normalized; }
function normalizeDate(value, code) { const normalized = requireText(value, code); if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw createError(409, code, `Invalid date ${normalized}.`); return normalized; }
function assertAllowed(value, allowedValues, code) { const normalized = requireText(value, code); if (!allowedValues.includes(normalized)) throw createError(409, code, `Unsupported value ${normalized}.`); return normalized; }
function roundMoney(value) { return Number(Number(value || 0).toFixed(2)); }
function nowIso(clock) { return clock().toISOString(); }
function pushAudit(state, clock, event) { state.auditEvents.push({ auditEventId: crypto.randomUUID(), createdAt: nowIso(clock), ...event }); }
function copy(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
function createError(statusCode, code, message) { const error = new Error(message); error.statusCode = statusCode; error.code = code; return error; }
function toCompanyScopedKey(companyId, value) { return `${requireText(companyId, "company_id_required")}::${requireText(value, "scoped_key_required")}`; }
function hashObject(value) { return crypto.createHash("sha256").update(stableStringify(value)).digest("hex"); }
function stableStringify(value) { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(",")}]`; return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`; }
