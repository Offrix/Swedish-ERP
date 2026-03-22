import crypto from "node:crypto";

export const INVOICE_DELIVERY_CHANNELS = Object.freeze(["pdf_email", "peppol"]);
export const PAYMENT_LINK_STATUSES = Object.freeze(["active", "consumed", "expired", "cancelled"]);
export const SUBMISSION_STATUSES = Object.freeze([
  "ready",
  "signed",
  "submitted",
  "received",
  "accepted",
  "transport_failed",
  "retry_pending",
  "domain_rejected",
  "finalized",
  "superseded"
]);
export const SUBMISSION_SIGNED_STATES = Object.freeze(["pending", "signed", "not_required"]);
export const SUBMISSION_RECEIPT_TYPES = Object.freeze(["technical_ack", "business_ack", "final_ack", "technical_nack", "business_nack"]);
export const SUBMISSION_RETRY_CLASSES = Object.freeze(["automatic", "manual_only", "forbidden"]);
export const SUBMISSION_ACTION_TYPES = Object.freeze(["retry", "collect_more_data", "correct_payload", "contact_provider", "close_as_duplicate"]);
export const SUBMISSION_ACTION_STATUSES = Object.freeze(["open", "claimed", "waiting_input", "resolved", "closed", "auto_resolved"]);
const SUBMISSION_ACTION_PRIORITIES = Object.freeze(["low", "normal", "high", "urgent"]);

export function createIntegrationPlatform(options = {}) {
  return createIntegrationEngine(options);
}

export function createIntegrationEngine({ clock = () => new Date(), paymentBaseUrl = "https://payments.local" } = {}) {
  const state = {
    submissions: new Map(),
    submissionIdsByCompany: new Map(),
    submissionIdsByReuseKey: new Map(),
    receipts: new Map(),
    receiptIdsBySubmission: new Map(),
    queueItems: new Map(),
    queueItemIdsByCompany: new Map(),
    queueItemIdsBySubmission: new Map()
  };

  return {
    deliveryChannels: INVOICE_DELIVERY_CHANNELS,
    paymentLinkStatuses: PAYMENT_LINK_STATUSES,
    submissionStatuses: SUBMISSION_STATUSES,
    submissionSignedStates: SUBMISSION_SIGNED_STATES,
    submissionReceiptTypes: SUBMISSION_RECEIPT_TYPES,
    submissionRetryClasses: SUBMISSION_RETRY_CLASSES,
    submissionActionTypes: SUBMISSION_ACTION_TYPES,
    submissionActionStatuses: SUBMISSION_ACTION_STATUSES,
    prepareInvoiceDelivery,
    createPaymentLink,
    prepareAuthoritySubmission(input) {
      return prepareAuthoritySubmission({ state, clock }, input);
    },
    signAuthoritySubmission(input) {
      return signAuthoritySubmission({ state, clock }, input);
    },
    listAuthoritySubmissions(input) {
      return listAuthoritySubmissions({ state }, input);
    },
    getAuthoritySubmission(input) {
      return getAuthoritySubmission({ state }, input);
    },
    submitAuthoritySubmission(input) {
      return submitAuthoritySubmission({ state, clock }, input);
    },
    registerSubmissionReceipt(input) {
      return registerSubmissionReceipt({ state, clock }, input);
    },
    listSubmissionActionQueue(input) {
      return listSubmissionActionQueue({ state }, input);
    },
    retryAuthoritySubmission(input) {
      return retryAuthoritySubmission({ state, clock }, input);
    },
    resolveSubmissionQueueItem(input) {
      return resolveSubmissionQueueItem({ state, clock }, input);
    },
    snapshotIntegrations() {
      return clone({
        submissions: [...state.submissions.values()].map((submission) => enrichSubmission(state, submission)),
        receipts: [...state.receipts.values()],
        actionQueueItems: [...state.queueItems.values()]
      });
    }
  };

  function prepareInvoiceDelivery({
    companyId,
    invoice,
    customer,
    deliveryChannel,
    recipientEmails = [],
    buyerReference = null,
    purchaseOrderReference = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedChannel = assertAllowed(deliveryChannel || invoice.deliveryChannel, INVOICE_DELIVERY_CHANNELS, "invoice_delivery_channel_invalid");
    const documentType = invoice.invoiceType === "credit_note" ? "credit_note" : "invoice";
    if (resolvedChannel === "pdf_email") {
      const recipients = uniqueEmails(recipientEmails);
      if (recipients.length === 0) {
        throw createError(400, "invoice_delivery_recipient_required", "PDF delivery requires at least one recipient email.");
      }
      const payload = {
        templateCode: "ar_invoice_pdf_v1",
        documentType,
        invoiceId: invoice.customerInvoiceId,
        invoiceNumber: invoice.invoiceNumber,
        issuedAt: invoice.issuedAt,
        dueDate: invoice.dueDate,
        customerName: customer.legalName,
        lines: invoice.lines,
        totals: invoice.totals
      };
      return {
        deliveryId: crypto.randomUUID(),
        companyId: resolvedCompanyId,
        invoiceId: invoice.customerInvoiceId,
        invoiceNumber: invoice.invoiceNumber,
        channel: resolvedChannel,
        documentType,
        payloadType: "pdf_render_request",
        payloadVersion: "1.0",
        payloadHash: hashObject(payload),
        status: "delivered",
        recipient: recipients.join(","),
        buyerReference: normalizeOptionalText(buyerReference),
        purchaseOrderReference: normalizeOptionalText(purchaseOrderReference),
        payload,
        createdAt: nowIso(clock)
      };
    }

    const peppolId = normalizeOptionalText(customer.peppolIdentifier);
    const peppolScheme = normalizeOptionalText(customer.peppolScheme);
    if (!peppolId || !peppolScheme) {
      throw createError(400, "peppol_identifier_missing", "Peppol delivery requires customer identifier and scheme.");
    }
    const resolvedBuyerReference = normalizeOptionalText(buyerReference);
    const resolvedPurchaseOrderReference = normalizeOptionalText(purchaseOrderReference);
    if (!resolvedBuyerReference && !resolvedPurchaseOrderReference) {
      throw createError(
        400,
        "peppol_reference_missing",
        "Peppol delivery requires buyer reference or purchase-order reference for outbound validation."
      );
    }
    const payload = {
      standard: "Peppol BIS Billing 3",
      documentType,
      invoiceId: invoice.customerInvoiceId,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      paymentReference: invoice.paymentReference,
      seller: {
        companyId: resolvedCompanyId
      },
      buyer: {
        legalName: customer.legalName,
        countryCode: customer.countryCode,
        peppolIdentifier: peppolId,
        peppolScheme
      },
      references: {
        buyerReference: resolvedBuyerReference,
        purchaseOrderReference: resolvedPurchaseOrderReference
      },
      currencyCode: invoice.currencyCode,
      lines: invoice.lines.map((line) => ({
        description: line.description,
        quantity: line.quantity,
        unitCode: line.unitCode,
        unitPrice: line.unitPrice,
        lineAmount: line.lineAmount,
        vatCode: line.vatCode
      })),
      totals: invoice.totals
    };
    return {
      deliveryId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      invoiceId: invoice.customerInvoiceId,
      invoiceNumber: invoice.invoiceNumber,
      channel: resolvedChannel,
      documentType,
      payloadType: "peppol_bis_billing_3",
      payloadVersion: "3.0",
      payloadHash: hashObject(payload),
      status: "prepared",
      recipient: `${peppolScheme}:${peppolId}`,
      buyerReference: resolvedBuyerReference,
      purchaseOrderReference: resolvedPurchaseOrderReference,
      payload,
      createdAt: nowIso(clock)
    };
  }

  function createPaymentLink({
    companyId,
    invoiceId,
    amount,
    currencyCode,
    providerCode = "internal_mock",
    expiresAt
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedInvoiceId = requireText(invoiceId, "customer_invoice_id_required");
    const resolvedAmount = normalizeMoney(amount, "payment_link_amount_invalid");
    const resolvedCurrencyCode = normalizeUpperCode(currencyCode, "currency_code_required", 3);
    const paymentLinkId = crypto.randomUUID();
    const resolvedExpiresAt = normalizeDate(expiresAt || addDaysIso(nowIso(clock).slice(0, 10), 14), "payment_link_expiry_invalid");
    return {
      paymentLinkId,
      companyId: resolvedCompanyId,
      invoiceId: resolvedInvoiceId,
      providerCode: requireText(providerCode, "payment_link_provider_code_required"),
      status: "active",
      amount: resolvedAmount,
      currencyCode: resolvedCurrencyCode,
      url: `${paymentBaseUrl.replace(/\/+$/, "")}/${resolvedInvoiceId}/${paymentLinkId}`,
      expiresAt: resolvedExpiresAt,
      createdAt: nowIso(clock)
    };
  }
}

function prepareAuthoritySubmission({ state, clock }, input = {}) {
  const submissionType = requireText(input.submissionType, "submission_type_required");
  const companyId = requireText(input.companyId, "company_id_required");
  const payloadVersion = requireText(input.payloadVersion, "payload_version_required");
  const providerKey = requireText(input.providerKey, "submission_provider_key_required");
  const recipientId = requireText(input.recipientId, "submission_recipient_id_required");
  const sourceObjectType = requireText(input.sourceObjectType, "submission_source_object_type_required");
  const sourceObjectId = requireText(input.sourceObjectId, "submission_source_object_id_required");
  const actorId = requireText(input.actorId || "system", "actor_id_required");
  const signedState = assertAllowed(input.signedState || "pending", SUBMISSION_SIGNED_STATES, "submission_signed_state_invalid");
  const priority = assertAllowed(input.priority || "normal", SUBMISSION_ACTION_PRIORITIES, "submission_priority_invalid");
  const payload = clone(input.payload ?? {});
  const payloadHash = hashObject(payload);
  const idempotencyKey = requireText(
    input.idempotencyKey || buildIdempotencyKey({ submissionType, providerKey, recipientId, sourceObjectType, sourceObjectId, payloadVersion, payloadHash, periodId: input.periodId || null }),
    "submission_idempotency_key_required"
  );
  const reuseKey = buildReuseKey(companyId, idempotencyKey, payloadHash);
  const existingId = state.submissionIdsByReuseKey.get(reuseKey);
  if (existingId) {
    const existing = state.submissions.get(existingId);
    if (existing && !["superseded"].includes(existing.status)) {
      return {
        ...enrichSubmission(state, existing),
        idempotentReplay: true
      };
    }
  }

  const preparedAt = nowIso(clock);
  const submission = {
    submissionId: crypto.randomUUID(),
    rootSubmissionId: null,
    previousSubmissionId: normalizeOptionalText(input.previousSubmissionId),
    supersedesSubmissionId: normalizeOptionalText(input.supersedesSubmissionId),
    submissionType,
    companyId,
    periodId: normalizeOptionalText(input.periodId),
    sourceObjectType,
    sourceObjectId,
    payloadVersion,
    attemptNo: Number(input.attemptNo || 1),
    status: signedState === "pending" ? "ready" : "signed",
    providerKey,
    recipientId,
    idempotencyKey,
    signedState,
    signatoryRoleRequired: normalizeOptionalText(input.signatoryRoleRequired),
    priority,
    retryClass: assertAllowed(input.retryClass || "manual_only", SUBMISSION_RETRY_CLASSES, "submission_retry_class_invalid"),
    payloadHash,
    payloadJson: payload,
    correlationId: normalizeOptionalText(input.correlationId) || crypto.randomUUID(),
    submittedAt: null,
    acceptedAt: null,
    finalizedAt: null,
    signedAt: signedState === "signed" ? preparedAt : null,
    signedByActorId: signedState === "signed" ? actorId : null,
    createdByActorId: actorId,
    createdAt: preparedAt,
    updatedAt: preparedAt
  };
  submission.rootSubmissionId = submission.previousSubmissionId
    ? (state.submissions.get(submission.previousSubmissionId)?.rootSubmissionId || submission.previousSubmissionId)
    : submission.submissionId;
  state.submissions.set(submission.submissionId, submission);
  appendToIndex(state.submissionIdsByCompany, companyId, submission.submissionId);
  state.submissionIdsByReuseKey.set(reuseKey, submission.submissionId);
  return {
    ...enrichSubmission(state, submission),
    idempotentReplay: false
  };
}

function signAuthoritySubmission({ state, clock }, { companyId, submissionId, actorId, signatureReference = null } = {}) {
  const submission = requireSubmission(state, companyId, submissionId);
  if (submission.signedState === "not_required") {
    return enrichSubmission(state, submission);
  }
  if (submission.status !== "ready" || submission.signedState !== "pending") {
    throw createError(409, "submission_not_ready_for_sign", "Submission must be ready before signing.");
  }
  submission.signedState = "signed";
  submission.status = "signed";
  submission.signedAt = nowIso(clock);
  submission.signedByActorId = requireText(actorId || "system", "actor_id_required");
  submission.signatureReference = normalizeOptionalText(signatureReference) || `signature:${submission.submissionId}`;
  submission.updatedAt = submission.signedAt;
  return enrichSubmission(state, submission);
}

function listAuthoritySubmissions({ state }, { companyId, submissionType = null, sourceObjectType = null, sourceObjectId = null } = {}) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  return (state.submissionIdsByCompany.get(resolvedCompanyId) || [])
    .map((submissionId) => state.submissions.get(submissionId))
    .filter(Boolean)
    .filter((submission) => (submissionType ? submission.submissionType === submissionType : true))
    .filter((submission) => (sourceObjectType ? submission.sourceObjectType === sourceObjectType : true))
    .filter((submission) => (sourceObjectId ? submission.sourceObjectId === sourceObjectId : true))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map((submission) => enrichSubmission(state, submission));
}

function getAuthoritySubmission({ state }, { companyId, submissionId } = {}) {
  return enrichSubmission(state, requireSubmission(state, companyId, submissionId));
}

function submitAuthoritySubmission(
  { state, clock },
  { companyId, submissionId, actorId, mode = "test", simulatedTransportOutcome = "technical_ack", providerReference = null, message = null } = {}
) {
  const submission = requireSubmission(state, companyId, submissionId);
  if (submission.status !== "signed") {
    throw createError(409, "submission_not_signed", "Submission must be signed before dispatch.");
  }

  submission.status = "submitted";
  submission.submittedAt = nowIso(clock);
  submission.updatedAt = submission.submittedAt;
  submission.dispatchMode = requireText(mode, "submission_mode_required");
  submission.providerReference = normalizeOptionalText(providerReference);
  submission.dispatchMessage = normalizeOptionalText(message);

  const outcome = normalizeOptionalText(simulatedTransportOutcome) || "technical_ack";
  if (outcome === "transport_failed") {
    submission.status = "transport_failed";
    submission.updatedAt = nowIso(clock);
    createQueueItem(state, {
      submission,
      actionType: "retry",
      priority: submission.priority,
      ownerQueue: ownerQueueForSubmission(submission),
      retryAfter: addMinutesIso(submission.updatedAt, 15),
      requiredInput: [],
      rootCauseCode: "transport_failed",
      clock
    });
    return enrichSubmission(state, submission);
  }

  if (outcome === "technical_ack" || outcome === "technical_nack") {
    registerSubmissionReceipt(
      { state, clock },
      {
        companyId,
        submissionId,
        receiptType: outcome,
        providerStatus: outcome,
        rawReference: submission.providerReference,
        message,
        actorId
      }
    );
  }
  return enrichSubmission(state, submission);
}

function registerSubmissionReceipt(
  { state, clock },
  { companyId, submissionId, receiptType, providerStatus = null, rawReference = null, message = null, isFinal = null, requiredInput = [], actorId = "system" } = {}
) {
  const submission = requireSubmission(state, companyId, submissionId);
  if (["finalized", "superseded"].includes(submission.status)) {
    throw createError(409, "submission_receipt_not_allowed", "Receipts cannot be appended to a finalized or superseded submission.");
  }
  const normalizedType = assertAllowed(receiptType, SUBMISSION_RECEIPT_TYPES, "submission_receipt_type_invalid");
  const existingReceipt = findMatchingReceipt(state, submission.submissionId, {
    receiptType: normalizedType,
    providerStatus,
    rawReference,
    message,
    isFinal
  });
  if (existingReceipt) {
    return enrichSubmission(state, submission);
  }
  const receipt = {
    receiptId: crypto.randomUUID(),
    submissionId: submission.submissionId,
    sequenceNo: nextSequenceNo(state.receiptIdsBySubmission.get(submission.submissionId)),
    receiptType: normalizedType,
    providerStatus: normalizeOptionalText(providerStatus) || normalizedType,
    normalizedStatus: normalizedType,
    rawReference: normalizeOptionalText(rawReference),
    messageText: normalizeOptionalText(message),
    isFinal: isFinal == null ? normalizedType === "final_ack" || normalizedType.endsWith("_nack") : isFinal === true,
    receivedByActorId: requireText(actorId || "system", "actor_id_required"),
    receivedAt: nowIso(clock)
  };
  state.receipts.set(receipt.receiptId, receipt);
  appendToIndex(state.receiptIdsBySubmission, submission.submissionId, receipt.receiptId);

  if (normalizedType === "technical_ack" || normalizedType === "business_ack") {
    submission.status = normalizedType === "business_ack" ? "accepted" : "received";
    if (normalizedType === "business_ack") {
      submission.acceptedAt = receipt.receivedAt;
    }
    submission.updatedAt = receipt.receivedAt;
  } else if (normalizedType === "final_ack") {
    submission.status = "finalized";
    submission.acceptedAt = submission.acceptedAt || receipt.receivedAt;
    submission.finalizedAt = receipt.receivedAt;
    submission.updatedAt = receipt.receivedAt;
    autoResolveQueueItems(state, submission.submissionId, "receipt_final_ack", receipt.receivedAt);
  } else if (normalizedType === "technical_nack") {
    submission.status = "transport_failed";
    submission.updatedAt = receipt.receivedAt;
    createQueueItem(state, {
      submission,
      actionType: "retry",
      priority: escalatePriority(submission.priority, "technical_nack"),
      ownerQueue: ownerQueueForSubmission(submission),
      retryAfter: addMinutesIso(receipt.receivedAt, 15),
      requiredInput: [],
      rootCauseCode: "technical_nack",
      clock
    });
  } else if (normalizedType === "business_nack") {
    submission.status = "domain_rejected";
    submission.updatedAt = receipt.receivedAt;
    createQueueItem(state, {
      submission,
      actionType: Array.isArray(requiredInput) && requiredInput.length > 0 ? "collect_more_data" : "correct_payload",
      priority: escalatePriority(submission.priority, "business_nack"),
      ownerQueue: ownerQueueForSubmission(submission),
      retryAfter: null,
      requiredInput: Array.isArray(requiredInput) ? requiredInput : [],
      rootCauseCode: "business_nack",
      clock
    });
  }
  return enrichSubmission(state, submission);
}

function listSubmissionActionQueue({ state }, { companyId, status = null, ownerQueue = null } = {}) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  return (state.queueItemIdsByCompany.get(resolvedCompanyId) || [])
    .map((queueItemId) => state.queueItems.get(queueItemId))
    .filter(Boolean)
    .filter((queueItem) => (status ? queueItem.status === status : true))
    .filter((queueItem) => (ownerQueue ? queueItem.ownerQueue === ownerQueue : true))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map(clone);
}

function retryAuthoritySubmission({ state, clock }, { companyId, submissionId, actorId } = {}) {
  const previous = requireSubmission(state, companyId, submissionId);
  if (previous.status !== "transport_failed") {
    throw createError(409, "submission_not_retryable", "Only transport-failed submissions can be retried with the same payload.");
  }
  if (previous.retryClass === "forbidden") {
    throw createError(409, "submission_retry_forbidden", "Retry is forbidden for this submission.");
  }
  previous.status = "retry_pending";
  previous.updatedAt = nowIso(clock);
  autoResolveQueueItems(state, previous.submissionId, "retry_spawned", previous.updatedAt);

  const retried = prepareAuthoritySubmission(
    { state, clock },
    {
      companyId: previous.companyId,
      submissionType: previous.submissionType,
      periodId: previous.periodId,
      sourceObjectType: previous.sourceObjectType,
      sourceObjectId: previous.sourceObjectId,
      payloadVersion: previous.payloadVersion,
      providerKey: previous.providerKey,
      recipientId: previous.recipientId,
      payload: previous.payloadJson,
      signedState: previous.signedState,
      actorId: actorId || "system",
      idempotencyKey: `${previous.idempotencyKey}:retry:${previous.attemptNo + 1}`,
      previousSubmissionId: previous.submissionId,
      attemptNo: previous.attemptNo + 1,
      priority: previous.priority,
      retryClass: previous.retryClass,
      signatoryRoleRequired: previous.signatoryRoleRequired,
      correlationId: previous.correlationId
    }
  );
  return {
    previousSubmission: enrichSubmission(state, previous),
    submission: retried
  };
}

function resolveSubmissionQueueItem(
  { state, clock },
  { companyId, queueItemId, resolutionCode, actorId = "system", ownerUserId = null } = {}
) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const queueItem = state.queueItems.get(requireText(queueItemId, "submission_queue_item_id_required"));
  if (!queueItem || queueItem.companyId !== resolvedCompanyId) {
    throw createError(404, "submission_queue_item_not_found", "Submission queue item was not found.");
  }
  if (!["open", "claimed", "waiting_input"].includes(queueItem.status)) {
    return clone(queueItem);
  }
  queueItem.ownerUserId = normalizeOptionalText(ownerUserId) || normalizeOptionalText(queueItem.ownerUserId);
  queueItem.status = "resolved";
  queueItem.resolutionCode = requireText(resolutionCode, "submission_queue_resolution_code_required");
  queueItem.resolvedByActorId = requireText(actorId || "system", "actor_id_required");
  queueItem.updatedAt = nowIso(clock);
  return clone(queueItem);
}

function enrichSubmission(state, submission) {
  return clone({
    ...submission,
    receipts: (state.receiptIdsBySubmission.get(submission.submissionId) || [])
      .map((receiptId) => state.receipts.get(receiptId))
      .filter(Boolean)
      .sort((left, right) => left.sequenceNo - right.sequenceNo)
      .map(clone),
    actionQueueItems: (state.queueItemIdsBySubmission.get(submission.submissionId) || [])
      .map((queueItemId) => state.queueItems.get(queueItemId))
      .filter(Boolean)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(clone)
  });
}

function createQueueItem(
  state,
  { submission, actionType, priority, ownerQueue, retryAfter, requiredInput = [], rootCauseCode, clock }
) {
  const existing = (state.queueItemIdsBySubmission.get(submission.submissionId) || [])
    .map((queueItemId) => state.queueItems.get(queueItemId))
    .filter(Boolean)
    .find((candidate) => ["open", "claimed", "waiting_input"].includes(candidate.status) && candidate.actionType === actionType && candidate.rootCauseCode === rootCauseCode);
  if (existing) {
    return existing;
  }
  const queueItem = {
    queueItemId: crypto.randomUUID(),
    submissionId: submission.submissionId,
    companyId: submission.companyId,
    actionType,
    priority,
    ownerQueue: ownerQueue || "submission_operator",
    ownerUserId: null,
    status: "open",
    retryAfter,
    requiredInput: clone(requiredInput),
    resolutionCode: null,
    rootCauseCode,
    createdAt: nowIso(clock),
    updatedAt: nowIso(clock)
  };
  state.queueItems.set(queueItem.queueItemId, queueItem);
  appendToIndex(state.queueItemIdsByCompany, queueItem.companyId, queueItem.queueItemId);
  appendToIndex(state.queueItemIdsBySubmission, queueItem.submissionId, queueItem.queueItemId);
  return queueItem;
}

function autoResolveQueueItems(state, submissionId, resolutionCode, timestamp) {
  for (const queueItemId of state.queueItemIdsBySubmission.get(submissionId) || []) {
    const queueItem = state.queueItems.get(queueItemId);
    if (!queueItem || !["open", "claimed", "waiting_input"].includes(queueItem.status)) {
      continue;
    }
    queueItem.status = "auto_resolved";
    queueItem.resolutionCode = resolutionCode;
    queueItem.updatedAt = timestamp;
  }
}

function requireSubmission(state, companyId, submissionId) {
  const submission = state.submissions.get(requireText(submissionId, "submission_id_required"));
  if (!submission || submission.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "submission_not_found", "Submission was not found.");
  }
  return submission;
}

function findMatchingReceipt(state, submissionId, { receiptType, providerStatus = null, rawReference = null, message = null, isFinal = null } = {}) {
  const normalizedProviderStatus = normalizeOptionalText(providerStatus) || receiptType;
  const normalizedReference = normalizeOptionalText(rawReference);
  const normalizedMessage = normalizeOptionalText(message);
  const normalizedFinal = isFinal == null ? receiptType === "final_ack" || receiptType.endsWith("_nack") : isFinal === true;
  return (state.receiptIdsBySubmission.get(submissionId) || [])
    .map((receiptId) => state.receipts.get(receiptId))
    .filter(Boolean)
    .find(
      (receipt) =>
        receipt.receiptType === receiptType &&
        receipt.providerStatus === normalizedProviderStatus &&
        receipt.rawReference === normalizedReference &&
        receipt.messageText === normalizedMessage &&
        receipt.isFinal === normalizedFinal
    );
}

function ownerQueueForSubmission(submission) {
  if (submission.submissionType.startsWith("vat") || submission.submissionType.startsWith("income_tax") || submission.submissionType.startsWith("annual")) {
    return "tax_operator";
  }
  if (submission.submissionType.startsWith("agi")) {
    return "tax_operator";
  }
  if (submission.submissionType.startsWith("hus")) {
    return "hus_operator";
  }
  if (submission.submissionType.startsWith("peppol")) {
    return "peppol_operator";
  }
  return "submission_operator";
}

function buildReuseKey(companyId, idempotencyKey, payloadHash) {
  return `${companyId}:${idempotencyKey}:${payloadHash}`;
}

function buildIdempotencyKey({ submissionType, providerKey, recipientId, sourceObjectType, sourceObjectId, payloadVersion, payloadHash, periodId }) {
  return hashObject({
    submissionType,
    providerKey,
    recipientId,
    sourceObjectType,
    sourceObjectId,
    payloadVersion,
    payloadHash,
    periodId: periodId || null
  });
}

function nextSequenceNo(receiptIds) {
  return Array.isArray(receiptIds) ? receiptIds.length + 1 : 1;
}

function appendToIndex(map, key, value) {
  if (!map.has(key)) {
    map.set(key, []);
  }
  map.get(key).push(value);
}

function escalatePriority(priority, failureType) {
  if (failureType === "business_nack") {
    return priority === "urgent" ? "urgent" : "high";
  }
  return priority;
}

function uniqueEmails(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => normalizeEmail(value)))];
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

function normalizeMoney(value, code) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw createError(400, code, `${code} must be greater than zero.`);
  }
  return roundMoney(number);
}

function normalizeDate(value, code) {
  const input = requireText(value, code);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    throw createError(400, code, `${code} must be an ISO date.`);
  }
  return input;
}

function addDaysIso(date, days) {
  const resolved = new Date(`${date}T00:00:00.000Z`);
  resolved.setUTCDate(resolved.getUTCDate() + days);
  return resolved.toISOString().slice(0, 10);
}

function addMinutesIso(timestamp, minutes) {
  const resolved = new Date(timestamp);
  resolved.setUTCMinutes(resolved.getUTCMinutes() + minutes);
  return resolved.toISOString();
}

function assertAllowed(value, allowedValues, code) {
  const resolvedValue = requireText(value, code);
  if (!allowedValues.includes(resolvedValue)) {
    throw createError(400, code, `${code} does not allow ${resolvedValue}.`);
  }
  return resolvedValue;
}

function requireText(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createError(400, code, `${code} is required.`);
  }
  return value.trim();
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function nowIso(clock = () => new Date()) {
  return new Date(clock()).toISOString();
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

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
