import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";

export const HUS_CASE_STATES = Object.freeze([
  "draft",
  "classified",
  "invoice_blocked",
  "invoiced",
  "customer_partially_paid",
  "customer_paid",
  "claim_draft",
  "claim_submitted",
  "claim_accepted",
  "claim_partially_accepted",
  "claim_rejected",
  "paid_out",
  "recovery_pending",
  "closed"
]);
export const HUS_SERVICE_TYPE_CODES = Object.freeze(["rot", "rut", "not_eligible"]);
export const HUS_PAYMENT_CHANNELS = Object.freeze(["bank_transfer", "card", "swish", "plusgiro", "bankgiro"]);
export const HUS_CLAIM_TRANSPORT_TYPES = Object.freeze(["json", "xml"]);
export const HUS_HOUSING_FORM_CODES = Object.freeze([
  "smallhouse",
  "owner_apartment",
  "condominium",
  "rental_apartment",
  "household_other"
]);
export const HUS_INVOICE_GATE_STATUSES = Object.freeze(["pending", "blocked", "passed"]);
export const HUS_CLAIM_ELIGIBILITY_STATUSES = Object.freeze(["blocked", "not_ready", "partial_ready", "ready", "claimed_out"]);
export const HUS_DECISION_DIFFERENCE_STATUSES = Object.freeze(["open", "resolved"]);
export const HUS_RECOVERY_CANDIDATE_STATUSES = Object.freeze(["open", "recovered", "written_off"]);
export const HUS_DECISION_RESOLUTION_CODES = Object.freeze(["customer_reinvoice", "internal_writeoff", "credit_note_issued"]);

const ALLOWED_AR_INVOICE_STATUSES = new Set(["issued", "delivered", "partially_paid", "paid", "overdue", "disputed", "credited"]);
const MONEY_EPSILON = 0.01;

export function createHusPlatform(options = {}) {
  return createHusEngine(options);
}

export function createHusEngine({
  clock = () => new Date(),
  arPlatform = null,
  projectsPlatform = null
} = {}) {
  const state = {
    husCases: new Map(),
    husCaseIdsByCompany: new Map(),
    husClaims: new Map(),
    husDecisionDifferences: new Map(),
    husDecisionDifferenceIdsByCompany: new Map(),
    husRecoveryCandidates: new Map(),
    husRecoveryCandidateIdsByCompany: new Map(),
    auditEvents: []
  };

  return {
    husCaseStates: HUS_CASE_STATES,
    husServiceTypeCodes: HUS_SERVICE_TYPE_CODES,
    husPaymentChannels: HUS_PAYMENT_CHANNELS,
    husClaimTransportTypes: HUS_CLAIM_TRANSPORT_TYPES,
    husHousingFormCodes: HUS_HOUSING_FORM_CODES,
    husInvoiceGateStatuses: HUS_INVOICE_GATE_STATUSES,
    husClaimEligibilityStatuses: HUS_CLAIM_ELIGIBILITY_STATUSES,
    husDecisionDifferenceStatuses: HUS_DECISION_DIFFERENCE_STATUSES,
    husRecoveryCandidateStatuses: HUS_RECOVERY_CANDIDATE_STATUSES,
    listHusCases,
    getHusCase,
    createHusCase,
    classifyHusCase,
    markHusCaseInvoiced,
    evaluateHusCaseReadiness,
    recordHusCustomerPayment,
    listHusClaims,
    getHusClaim,
    createHusClaim,
    submitHusClaim,
    recordHusDecision,
    listHusDecisionDifferences,
    resolveHusDecisionDifference,
    recordHusPayout,
    registerHusCreditAdjustment,
    listHusRecoveryCandidates,
    getHusRecoveryCandidate,
    recordHusRecovery,
    listHusAuditEvents
  };

  function listHusCases({ companyId, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = normalizeOptionalText(status);
    return (state.husCaseIdsByCompany.get(resolvedCompanyId) || [])
      .map((husCaseId) => state.husCases.get(husCaseId))
      .filter(Boolean)
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .sort((left, right) => left.caseReference.localeCompare(right.caseReference))
      .map(projectHusCase);
  }

  function getHusCase({ companyId, husCaseId } = {}) {
    return projectHusCase(requireHusCase(companyId, husCaseId));
  }

  function createHusCase({
    companyId,
    husCaseId = null,
    caseReference = null,
    customerId = null,
    projectId = null,
    customerInvoiceId = null,
    serviceTypeCode = "rot",
    workCompletedOn,
    workCompletedFrom = null,
    workCompletedTo = null,
    currencyCode = "SEK",
    ruleYear = 2026,
    housingFormCode = null,
    propertyDesignation = null,
    apartmentDesignation = null,
    housingAssociationOrgNumber = null,
    serviceAddressLine1 = null,
    postalCode = null,
    city = null,
    executorFskattApproved = false,
    executorFskattValidatedOn = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    if (customerId && arPlatform?.getCustomer) {
      arPlatform.getCustomer({ companyId: resolvedCompanyId, customerId });
    }
    if (projectId && projectsPlatform?.getProject) {
      projectsPlatform.getProject({ companyId: resolvedCompanyId, projectId });
    }
    if (customerInvoiceId && arPlatform?.getInvoice) {
      arPlatform.getInvoice({ companyId: resolvedCompanyId, customerInvoiceId });
    }
    const propertyProfile = normalizePropertyProfile({
      housingFormCode,
      propertyDesignation,
      apartmentDesignation,
      housingAssociationOrgNumber,
      serviceAddressLine1,
      postalCode,
      city
    });
    const workInterval = normalizeWorkInterval({
      workCompletedOn,
      workCompletedFrom,
      workCompletedTo
    });
    const record = {
      husCaseId: normalizeOptionalText(husCaseId) || crypto.randomUUID(),
      companyId: resolvedCompanyId,
      caseReference: normalizeOptionalText(caseReference) || generateCaseReference(state, resolvedCompanyId, clock),
      customerId: normalizeOptionalText(customerId),
      projectId: normalizeOptionalText(projectId),
      customerInvoiceId: normalizeOptionalText(customerInvoiceId),
      serviceTypeCode: requireEnum(HUS_SERVICE_TYPE_CODES, serviceTypeCode, "hus_service_type_invalid"),
      workCompletedOn: workInterval.workCompletedOn,
      workCompletedFrom: workInterval.workCompletedFrom,
      workCompletedTo: workInterval.workCompletedTo,
      currencyCode: normalizeUpperCode(currencyCode, "hus_currency_code_required", 3),
      ruleYear: normalizeWholeNumber(ruleYear, "hus_rule_year_invalid"),
      status: "draft",
      totalGrossAmount: 0,
      totalEligibleLaborAmount: 0,
      preliminaryReductionAmount: 0,
      customerShareAmount: 0,
      paidCustomerAmount: 0,
      outstandingCustomerShareAmount: 0,
      claimedAmountTotal: 0,
      approvedAmountTotal: 0,
      paidOutAmountTotal: 0,
      recoveredAmountTotal: 0,
      propertyProfile,
      executorEligibility: {
        fskattApproved: executorFskattApproved === true,
        fskattValidatedOn: normalizeOptionalDate(executorFskattValidatedOn, "hus_fskatt_validated_on_invalid")
      },
      invoiceGateStatus: "pending",
      invoiceBlockerCodes: ["invoice_gate_not_checked"],
      invoiceGateSnapshot: null,
      claimEligibilityStatus: "blocked",
      claimBlockerCodes: ["invoice_gate_not_checked"],
      claimReadyAmount: 0,
      buyers: [],
      serviceLines: [],
      classificationDecisions: [],
      customerPayments: [],
      claims: [],
      decisions: [],
      decisionDifferences: [],
      payouts: [],
      recoveries: [],
      recoveryCandidates: [],
      creditAdjustments: [],
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    refreshCaseDerivedState(record);
    state.husCases.set(record.husCaseId, record);
    appendToIndex(state.husCaseIdsByCompany, record.companyId, record.husCaseId);
    pushAudit(state, clock, {
      companyId: record.companyId,
      caseId: record.husCaseId,
      actorId,
      correlationId,
      action: "hus.case.created",
      entityType: "hus_case",
      entityId: record.husCaseId,
      projectId: record.projectId,
      explanation: `Created HUS case ${record.caseReference}.`
    });
    return projectHusCase(record);
  }

  function classifyHusCase({
    companyId,
    husCaseId,
    serviceLines = [],
    buyers = [],
    housingFormCode = null,
    propertyDesignation = null,
    apartmentDesignation = null,
    housingAssociationOrgNumber = null,
    serviceAddressLine1 = null,
    postalCode = null,
    city = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const record = requireHusCase(companyId, husCaseId);
    if (["claim_submitted", "paid_out", "closed"].includes(record.status)) {
      throw createError(409, "hus_case_not_classifiable", "The HUS case can no longer be reclassified.");
    }
    const normalizedLines = normalizeServiceLines(serviceLines, record.serviceTypeCode);
    const totals = summarizeServiceLines(normalizedLines);
    const normalizedBuyers = normalizeBuyers(buyers, totals.customerShareAmount, totals.preliminaryReductionAmount);
    record.serviceLines = normalizedLines;
    record.buyers = normalizedBuyers;
    if (arguments[0] && hasAnyPropertyInput(arguments[0])) {
      record.propertyProfile = normalizePropertyProfile({
        ...record.propertyProfile,
        housingFormCode: housingFormCode ?? record.propertyProfile.housingFormCode,
        propertyDesignation: propertyDesignation ?? record.propertyProfile.propertyDesignation,
        apartmentDesignation: apartmentDesignation ?? record.propertyProfile.apartmentDesignation,
        housingAssociationOrgNumber: housingAssociationOrgNumber ?? record.propertyProfile.housingAssociationOrgNumber,
        serviceAddressLine1: serviceAddressLine1 ?? record.propertyProfile.serviceAddressLine1,
        postalCode: postalCode ?? record.propertyProfile.postalCode,
        city: city ?? record.propertyProfile.city
      });
    }
    record.classificationDecisions.push({
      husClassificationDecisionId: crypto.randomUUID(),
      ruleYear: record.ruleYear,
      decisionHash: hashObject({
        normalizedLines,
        normalizedBuyers,
        propertyProfile: record.propertyProfile,
        ruleYear: record.ruleYear
      }),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    });
    record.totalGrossAmount = totals.totalGrossAmount;
    record.totalEligibleLaborAmount = totals.totalEligibleLaborAmount;
    record.preliminaryReductionAmount = totals.preliminaryReductionAmount;
    record.customerShareAmount = totals.customerShareAmount;
    record.outstandingCustomerShareAmount = roundMoney(Math.max(0, record.customerShareAmount - record.paidCustomerAmount));
    refreshCaseDerivedState(record);
    record.status = record.invoiceGateStatus === "blocked" ? "invoice_blocked" : "classified";
    record.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      caseId: record.husCaseId,
      actorId,
      correlationId,
      action: "hus.case.classified",
      entityType: "hus_case",
      entityId: record.husCaseId,
      projectId: record.projectId,
      explanation: `Classified HUS case ${record.caseReference}.`
    });
    return projectHusCase(record);
  }

  function markHusCaseInvoiced({
    companyId,
    husCaseId,
    customerInvoiceId = null,
    invoiceNumber = null,
    invoiceIssuedOn = null,
    invoiceGrossAmount = null,
    invoiceLaborAmount = null,
    invoicePreliminaryReductionAmount = null,
    invoiceCustomerShareAmount = null,
    housingFormCode = null,
    propertyDesignation = null,
    apartmentDesignation = null,
    housingAssociationOrgNumber = null,
    serviceAddressLine1 = null,
    postalCode = null,
    city = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const record = requireHusCase(companyId, husCaseId);
    const resolvedCustomerInvoiceId = normalizeOptionalText(customerInvoiceId) || record.customerInvoiceId;
    if (resolvedCustomerInvoiceId && arPlatform?.getInvoice) {
      arPlatform.getInvoice({ companyId: record.companyId, customerInvoiceId: resolvedCustomerInvoiceId });
    }
    record.customerInvoiceId = resolvedCustomerInvoiceId;
    if (hasAnyPropertyInput(arguments[0])) {
      record.propertyProfile = normalizePropertyProfile({
        ...record.propertyProfile,
        housingFormCode: housingFormCode ?? record.propertyProfile.housingFormCode,
        propertyDesignation: propertyDesignation ?? record.propertyProfile.propertyDesignation,
        apartmentDesignation: apartmentDesignation ?? record.propertyProfile.apartmentDesignation,
        housingAssociationOrgNumber: housingAssociationOrgNumber ?? record.propertyProfile.housingAssociationOrgNumber,
        serviceAddressLine1: serviceAddressLine1 ?? record.propertyProfile.serviceAddressLine1,
        postalCode: postalCode ?? record.propertyProfile.postalCode,
        city: city ?? record.propertyProfile.city
      });
    }
    record.invoiceGateSnapshot = normalizeInvoiceGateSnapshotInput({
      ...record.invoiceGateSnapshot,
      invoiceNumber,
      invoiceIssuedOn,
      invoiceGrossAmount,
      invoiceLaborAmount,
      invoicePreliminaryReductionAmount,
      invoiceCustomerShareAmount
    });
    const invoiceGate = refreshInvoiceGate(record);
    record.updatedAt = nowIso(clock);
    if (invoiceGate.status === "blocked") {
      record.status = "invoice_blocked";
      pushAudit(state, clock, {
        companyId: record.companyId,
        caseId: record.husCaseId,
        actorId,
        correlationId,
        action: "hus.case.invoice_blocked",
        entityType: "hus_case",
        entityId: record.husCaseId,
        projectId: record.projectId,
        explanation: `Blocked HUS invoice gate for case ${record.caseReference}.`
      });
      throw createError(409, "hus_invoice_gate_blocked", `HUS invoice gate is blocked: ${invoiceGate.blockerCodes.join(", ")}`);
    }
    record.status = "invoiced";
    pushAudit(state, clock, {
      companyId: record.companyId,
      caseId: record.husCaseId,
      actorId,
      correlationId,
      action: "hus.case.invoiced",
      entityType: "hus_case",
      entityId: record.husCaseId,
      projectId: record.projectId,
      explanation: `Marked HUS case ${record.caseReference} as invoiced.`
    });
    return projectHusCase(record);
  }

  function evaluateHusCaseReadiness({ companyId, husCaseId, asOfDate = null } = {}) {
    const record = requireHusCase(companyId, husCaseId);
    return buildClaimReadinessSnapshot(record, normalizeOptionalDate(asOfDate, "hus_readiness_as_of_invalid"));
  }

  function recordHusCustomerPayment({
    companyId,
    husCaseId,
    paidAmount,
    paidOn,
    paymentChannel,
    paymentReference = null,
    externalTraceId = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const record = requireHusCase(companyId, husCaseId);
    if (record.invoiceGateStatus !== "passed") {
      throw createError(409, "hus_invoice_gate_not_passed", "Invoice gate must pass before customer payments can be registered.");
    }
    if (record.customerShareAmount <= 0) {
      throw createError(409, "hus_customer_share_missing", "Customer share must be classified before payments can be registered.");
    }
    const normalizedPaymentChannel = requireEnum(HUS_PAYMENT_CHANNELS, paymentChannel, "hus_payment_channel_invalid");
    if (!normalizeOptionalText(paymentReference) && !normalizeOptionalText(externalTraceId)) {
      throw createError(409, "hus_payment_evidence_missing", "Electronic HUS payments require a payment reference or external trace id.");
    }
    const paymentDate = normalizeRequiredDate(paidOn, "hus_customer_payment_date_required");
    if (paymentDate < record.workCompletedOn) {
      throw createError(409, "hus_payment_before_work_completed", "Customer payment cannot be registered before the work is completed.");
    }
    const paymentRecord = {
      husCustomerPaymentId: crypto.randomUUID(),
      paidAmount: normalizeMoney(paidAmount, "hus_customer_payment_amount_invalid"),
      paidOn: paymentDate,
      paymentChannel: normalizedPaymentChannel,
      paymentReference: normalizeOptionalText(paymentReference),
      externalTraceId: normalizeOptionalText(externalTraceId),
      evidenceStatus: "verified",
      claimCapacityAmount: 0,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    record.customerPayments.push(paymentRecord);
    refreshCaseDerivedState(record);
    record.status = record.outstandingCustomerShareAmount === 0 ? "customer_paid" : "customer_partially_paid";
    record.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      caseId: record.husCaseId,
      actorId,
      correlationId,
      action: "hus.case.customer_payment_recorded",
      entityType: "hus_case",
      entityId: record.husCaseId,
      projectId: record.projectId,
      explanation: `Recorded customer payment for HUS case ${record.caseReference}.`
    });
    return projectHusCase(record);
  }

  function listHusClaims({ companyId, husCaseId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedCaseId = normalizeOptionalText(husCaseId);
    const cases = resolvedCaseId
      ? [requireHusCase(resolvedCompanyId, resolvedCaseId)]
      : (state.husCaseIdsByCompany.get(resolvedCompanyId) || []).map((id) => state.husCases.get(id)).filter(Boolean);
    return cases.flatMap((record) => record.claims.map(copy));
  }

  function getHusClaim({ companyId, husClaimId } = {}) {
    return copy(requireHusClaim(companyId, husClaimId));
  }

  function createHusClaim({
    companyId,
    husCaseId,
    requestedAmount = null,
    transportType = "json",
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const record = requireHusCase(companyId, husCaseId);
    const readiness = buildClaimReadinessSnapshot(record);
    if (readiness.status === "blocked" || readiness.claimableReductionAmount <= 0) {
      throw createError(409, "hus_claim_not_ready", `The HUS case is not ready for claim creation: ${readiness.blockerCodes.join(", ")}`);
    }
    const maximumClaimableAmount = readiness.claimableReductionAmount;
    const resolvedRequestedAmount = normalizeMoney(
      requestedAmount ?? maximumClaimableAmount,
      "hus_claim_amount_invalid"
    );
    if (resolvedRequestedAmount > maximumClaimableAmount + MONEY_EPSILON) {
      throw createError(409, "hus_claim_amount_exceeds_ready_amount", "Requested HUS claim amount exceeds currently claimable reduction.");
    }
    const paymentAllocations = allocateClaimAmountAcrossPayments(record, resolvedRequestedAmount);
    const claimRecord = {
      husClaimId: crypto.randomUUID(),
      companyId: record.companyId,
      husCaseId: record.husCaseId,
      versionNo: record.claims.length + 1,
      requestedAmount: resolvedRequestedAmount,
      transportType: requireEnum(HUS_CLAIM_TRANSPORT_TYPES, transportType, "hus_claim_transport_invalid"),
      status: "claim_draft",
      submittedOn: null,
      payloadHash: null,
      claimReadinessStatus: readiness.status,
      paymentAllocations,
      versions: [],
      statusEvents: [],
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    const payload = buildClaimPayload(record, claimRecord, readiness);
    const version = {
      husClaimVersionId: crypto.randomUUID(),
      versionNo: claimRecord.versionNo,
      payloadJson: payload,
      payloadHash: hashObject(payload),
      createdAt: nowIso(clock)
    };
    claimRecord.versions.push(version);
    claimRecord.statusEvents.push({
      husClaimStatusEventId: crypto.randomUUID(),
      eventCode: "claim_draft",
      payloadJson: {
        requestedAmount: claimRecord.requestedAmount,
        claimReadinessStatus: readiness.status
      },
      createdAt: nowIso(clock)
    });
    record.claims.push(claimRecord);
    state.husClaims.set(claimRecord.husClaimId, claimRecord);
    refreshCaseDerivedState(record);
    record.status = "claim_draft";
    record.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      caseId: record.husCaseId,
      actorId,
      correlationId,
      action: "hus.claim.drafted",
      entityType: "hus_claim",
      entityId: claimRecord.husClaimId,
      projectId: record.projectId,
      explanation: `Drafted HUS claim for case ${record.caseReference}.`
    });
    return copy(claimRecord);
  }

  function submitHusClaim({
    companyId,
    husClaimId,
    submittedOn = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const claimRecord = requireHusClaim(companyId, husClaimId);
    if (claimRecord.status !== "claim_draft") {
      throw createError(409, "hus_claim_not_submittable", "Only draft HUS claims can be submitted.");
    }
    const record = requireHusCase(companyId, claimRecord.husCaseId);
    const resolvedSubmittedOn = normalizeRequiredDate(submittedOn || nowIso(clock).slice(0, 10), "hus_claim_submission_date_required");
    const currentReadiness = buildClaimReadinessSnapshot(record, {
      asOfDate: resolvedSubmittedOn,
      excludeClaimId: claimRecord.husClaimId
    });
    if (currentReadiness.status === "blocked") {
      throw createError(409, "hus_claim_submission_blocked", `HUS claim submission is blocked: ${currentReadiness.blockerCodes.join(", ")}`);
    }
    if (!Array.isArray(claimRecord.paymentAllocations) || claimRecord.paymentAllocations.length === 0) {
      throw createError(409, "hus_claim_payment_allocations_missing", "HUS claim submission requires locked payment allocations.");
    }
    for (const allocation of claimRecord.paymentAllocations) {
      const latestAllowedSubmissionDate = deadlineForPaymentDate(allocation.paidOn);
      if (resolvedSubmittedOn > latestAllowedSubmissionDate) {
        throw createError(409, "hus_claim_submission_deadline_passed", "The HUS claim cannot be submitted after 31 January following the payment year.");
      }
    }
    const latestVersion = claimRecord.versions.at(-1);
    const expectedPayload = buildClaimPayload(record, claimRecord, currentReadiness);
    const expectedPayloadHash = hashObject(expectedPayload);
    if (latestVersion.payloadHash !== expectedPayloadHash) {
      throw createError(409, "hus_claim_payload_stale", "The HUS claim payload is stale and must be regenerated from current locked data.");
    }
    claimRecord.status = "claim_submitted";
    claimRecord.submittedOn = resolvedSubmittedOn;
    claimRecord.payloadHash = latestVersion.payloadHash;
    claimRecord.updatedAt = nowIso(clock);
    claimRecord.statusEvents.push({
      husClaimStatusEventId: crypto.randomUUID(),
      eventCode: "claim_submitted",
      payloadJson: {
        submittedOn: resolvedSubmittedOn,
        payloadHash: claimRecord.payloadHash
      },
      createdAt: nowIso(clock)
    });
    refreshCaseDerivedState(record);
    record.status = "claim_submitted";
    record.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      caseId: record.husCaseId,
      actorId,
      correlationId,
      action: "hus.claim.submitted",
      entityType: "hus_claim",
      entityId: claimRecord.husClaimId,
      projectId: record.projectId,
      explanation: `Submitted HUS claim for case ${record.caseReference}.`
    });
    return copy(claimRecord);
  }

  function recordHusDecision({
    companyId,
    husClaimId,
    decisionDate,
    approvedAmount,
    rejectedAmount = null,
    reasonCode,
    rejectedOutcomeCode = "customer_reinvoice",
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const claimRecord = requireHusClaim(companyId, husClaimId);
    const record = requireHusCase(companyId, claimRecord.husCaseId);
    const resolvedApprovedAmount = normalizeMoney(approvedAmount, "hus_decision_approved_amount_invalid");
    const resolvedRejectedAmount = normalizeMoney(
      rejectedAmount ?? Math.max(0, claimRecord.requestedAmount - resolvedApprovedAmount),
      "hus_decision_rejected_amount_invalid"
    );
    if (!moneyEquals(roundMoney(resolvedApprovedAmount + resolvedRejectedAmount), claimRecord.requestedAmount)) {
      throw createError(409, "hus_decision_amount_mismatch", "Approved and rejected HUS decision amounts must reconcile to the requested amount.");
    }
    const decision = {
      husDecisionId: crypto.randomUUID(),
      husClaimId: claimRecord.husClaimId,
      decisionDate: normalizeRequiredDate(decisionDate, "hus_decision_date_required"),
      requestedAmount: claimRecord.requestedAmount,
      approvedAmount: resolvedApprovedAmount,
      rejectedAmount: resolvedRejectedAmount,
      reasonCode: requireText(reasonCode, "hus_decision_reason_required"),
      rejectedOutcomeCode: requireText(rejectedOutcomeCode, "hus_rejected_outcome_required"),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    record.decisions.push(decision);
    let differenceRecord = null;
    if (resolvedRejectedAmount > 0) {
      differenceRecord = {
        husDecisionDifferenceId: crypto.randomUUID(),
        companyId: record.companyId,
        husCaseId: record.husCaseId,
        husClaimId: claimRecord.husClaimId,
        husDecisionId: decision.husDecisionId,
        rejectedAmount: resolvedRejectedAmount,
        suggestedResolutionCode: decision.rejectedOutcomeCode,
        resolutionCode: null,
        resolutionNote: null,
        status: "open",
        createdByActorId: decision.createdByActorId,
        createdAt: nowIso(clock),
        resolvedAt: null
      };
      record.decisionDifferences.push(differenceRecord);
      state.husDecisionDifferences.set(differenceRecord.husDecisionDifferenceId, differenceRecord);
      appendToIndex(state.husDecisionDifferenceIdsByCompany, record.companyId, differenceRecord.husDecisionDifferenceId);
    }
    if (resolvedRejectedAmount === 0) {
      claimRecord.status = "claim_accepted";
      record.status = "claim_accepted";
    } else if (resolvedApprovedAmount === 0) {
      claimRecord.status = "claim_rejected";
      record.status = "claim_rejected";
    } else {
      claimRecord.status = "claim_partially_accepted";
      record.status = "claim_partially_accepted";
    }
    claimRecord.updatedAt = nowIso(clock);
    claimRecord.statusEvents.push({
      husClaimStatusEventId: crypto.randomUUID(),
      eventCode: claimRecord.status,
      payloadJson: {
        approvedAmount: resolvedApprovedAmount,
        rejectedAmount: resolvedRejectedAmount,
        reasonCode: decision.reasonCode
      },
      createdAt: nowIso(clock)
    });
    refreshCaseDerivedState(record);
    record.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      caseId: record.husCaseId,
      actorId,
      correlationId,
      action: "hus.claim.decision_recorded",
      entityType: "hus_decision",
      entityId: decision.husDecisionId,
      projectId: record.projectId,
      explanation: `Recorded HUS decision for case ${record.caseReference}.`
    });
    return {
      husClaim: copy(claimRecord),
      husDecision: copy(decision),
      husDecisionDifference: copy(differenceRecord)
    };
  }

  function listHusDecisionDifferences({ companyId, husCaseId = null, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedCaseId = normalizeOptionalText(husCaseId);
    const resolvedStatus = normalizeOptionalText(status);
    return (state.husDecisionDifferenceIdsByCompany.get(resolvedCompanyId) || [])
      .map((differenceId) => state.husDecisionDifferences.get(differenceId))
      .filter(Boolean)
      .filter((record) => (resolvedCaseId ? record.husCaseId === resolvedCaseId : true))
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function resolveHusDecisionDifference({
    companyId,
    husDecisionDifferenceId,
    resolutionCode,
    resolutionNote = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const record = requireHusDecisionDifference(companyId, husDecisionDifferenceId);
    if (record.status !== "open") {
      throw createError(409, "hus_decision_difference_not_open", "Only open HUS decision differences can be resolved.");
    }
    record.status = "resolved";
    record.resolutionCode = requireEnum(HUS_DECISION_RESOLUTION_CODES, resolutionCode, "hus_decision_resolution_code_invalid");
    record.resolutionNote = normalizeOptionalText(resolutionNote);
    record.resolvedByActorId = requireText(actorId, "actor_id_required");
    record.resolvedAt = nowIso(clock);
    const husCase = requireHusCase(record.companyId, record.husCaseId);
    refreshCaseDerivedState(husCase);
    if (!hasOpenDecisionDifferences(husCase) && !hasOpenRecoveryCandidates(husCase) && husCase.status === "claim_rejected") {
      husCase.status = "closed";
    }
    husCase.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: husCase.companyId,
      caseId: husCase.husCaseId,
      actorId,
      correlationId,
      action: "hus.decision_difference.resolved",
      entityType: "hus_decision_difference",
      entityId: record.husDecisionDifferenceId,
      projectId: husCase.projectId,
      explanation: `Resolved HUS decision difference for case ${husCase.caseReference}.`
    });
    return copy(record);
  }

  function recordHusPayout({
    companyId,
    husClaimId,
    payoutDate,
    payoutAmount,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const claimRecord = requireHusClaim(companyId, husClaimId);
    if (!["claim_accepted", "claim_partially_accepted"].includes(claimRecord.status)) {
      throw createError(409, "hus_claim_not_payable", "Only accepted HUS claims can be paid out.");
    }
    const record = requireHusCase(companyId, claimRecord.husCaseId);
    const payout = {
      husPayoutId: crypto.randomUUID(),
      husClaimId: claimRecord.husClaimId,
      payoutDate: normalizeRequiredDate(payoutDate, "hus_payout_date_required"),
      payoutAmount: normalizeMoney(payoutAmount, "hus_payout_amount_invalid"),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    const priorPayoutAmount = sumAmounts(record.payouts.filter((item) => item.husClaimId === claimRecord.husClaimId), "payoutAmount");
    const approvedAmount = sumAmounts(record.decisions.filter((item) => item.husClaimId === claimRecord.husClaimId), "approvedAmount");
    if (payout.payoutAmount + priorPayoutAmount > approvedAmount + MONEY_EPSILON) {
      throw createError(409, "hus_payout_exceeds_approved_amount", "HUS payout exceeds the approved claim amount.");
    }
    record.payouts.push(payout);
    claimRecord.status = "paid_out";
    claimRecord.updatedAt = nowIso(clock);
    claimRecord.statusEvents.push({
      husClaimStatusEventId: crypto.randomUUID(),
      eventCode: "paid_out",
      payloadJson: {
        payoutAmount: payout.payoutAmount,
        payoutDate: payout.payoutDate
      },
      createdAt: nowIso(clock)
    });
    refreshCaseDerivedState(record);
    record.status = hasOpenRecoveryCandidates(record) ? "recovery_pending" : "paid_out";
    record.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      caseId: record.husCaseId,
      actorId,
      correlationId,
      action: "hus.claim.payout_recorded",
      entityType: "hus_payout",
      entityId: payout.husPayoutId,
      projectId: record.projectId,
      explanation: `Recorded HUS payout for case ${record.caseReference}.`
    });
    return { husClaim: copy(claimRecord), husPayout: copy(payout) };
  }

  function registerHusCreditAdjustment({
    companyId,
    husCaseId,
    adjustmentDate,
    adjustmentAmount,
    reasonCode,
    afterPayoutFlag = false,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const record = requireHusCase(companyId, husCaseId);
    const adjustment = {
      husCreditAdjustmentId: crypto.randomUUID(),
      adjustmentDate: normalizeRequiredDate(adjustmentDate, "hus_credit_adjustment_date_required"),
      adjustmentAmount: normalizeMoney(adjustmentAmount, "hus_credit_adjustment_amount_invalid"),
      reasonCode: requireText(reasonCode, "hus_credit_adjustment_reason_required"),
      afterPayoutFlag: afterPayoutFlag === true,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    record.creditAdjustments.push(adjustment);
    let recoveryCandidate = null;
    if (adjustment.afterPayoutFlag) {
      recoveryCandidate = {
        husRecoveryCandidateId: crypto.randomUUID(),
        companyId: record.companyId,
        husCaseId: record.husCaseId,
        triggerType: "credit_adjustment",
        previousAcceptedAmount: sumAmounts(record.decisions, "approvedAmount"),
        correctAmount: roundMoney(Math.max(0, sumAmounts(record.decisions, "approvedAmount") - adjustment.adjustmentAmount)),
        differenceAmount: adjustment.adjustmentAmount,
        status: "open",
        sourceAdjustmentId: adjustment.husCreditAdjustmentId,
        createdByActorId: adjustment.createdByActorId,
        createdAt: nowIso(clock)
      };
      record.recoveryCandidates.push(recoveryCandidate);
      state.husRecoveryCandidates.set(recoveryCandidate.husRecoveryCandidateId, recoveryCandidate);
      appendToIndex(state.husRecoveryCandidateIdsByCompany, record.companyId, recoveryCandidate.husRecoveryCandidateId);
    }
    refreshCaseDerivedState(record);
    record.status = adjustment.afterPayoutFlag ? "recovery_pending" : record.status;
    record.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      caseId: record.husCaseId,
      actorId,
      correlationId,
      action: "hus.case.credit_adjusted",
      entityType: "hus_credit_adjustment",
      entityId: adjustment.husCreditAdjustmentId,
      projectId: record.projectId,
      explanation: `Registered credit adjustment for HUS case ${record.caseReference}.`
    });
    return {
      husCase: projectHusCase(record),
      husCreditAdjustment: copy(adjustment),
      husRecoveryCandidate: copy(recoveryCandidate)
    };
  }

  function listHusRecoveryCandidates({ companyId, husCaseId = null, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedCaseId = normalizeOptionalText(husCaseId);
    const resolvedStatus = normalizeOptionalText(status);
    return (state.husRecoveryCandidateIdsByCompany.get(resolvedCompanyId) || [])
      .map((candidateId) => state.husRecoveryCandidates.get(candidateId))
      .filter(Boolean)
      .filter((record) => (resolvedCaseId ? record.husCaseId === resolvedCaseId : true))
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function getHusRecoveryCandidate({ companyId, husRecoveryCandidateId } = {}) {
    return copy(requireHusRecoveryCandidate(companyId, husRecoveryCandidateId));
  }

  function recordHusRecovery({
    companyId,
    husCaseId,
    husRecoveryCandidateId = null,
    recoveryDate,
    recoveryAmount,
    reasonCode,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const record = requireHusCase(companyId, husCaseId);
    const recoveryAmountValue = normalizeMoney(recoveryAmount, "hus_recovery_amount_invalid");
    const recoveryCandidate = normalizeOptionalText(husRecoveryCandidateId)
      ? requireHusRecoveryCandidate(record.companyId, husRecoveryCandidateId)
      : findOpenRecoveryCandidate(record);
    if (!recoveryCandidate || recoveryCandidate.husCaseId !== record.husCaseId || recoveryCandidate.status !== "open") {
      throw createError(409, "hus_recovery_candidate_missing", "An open HUS recovery candidate is required before recovery can be recorded.");
    }
    if (recoveryAmountValue > recoveryCandidate.differenceAmount + MONEY_EPSILON) {
      throw createError(409, "hus_recovery_exceeds_difference", "Recorded HUS recovery exceeds the candidate difference amount.");
    }
    const recovery = {
      husRecoveryId: crypto.randomUUID(),
      husRecoveryCandidateId: recoveryCandidate.husRecoveryCandidateId,
      recoveryDate: normalizeRequiredDate(recoveryDate, "hus_recovery_date_required"),
      recoveryAmount: recoveryAmountValue,
      reasonCode: requireText(reasonCode, "hus_recovery_reason_required"),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    record.recoveries.push(recovery);
    recoveryCandidate.status = recoveryAmountValue >= recoveryCandidate.differenceAmount - MONEY_EPSILON ? "recovered" : "open";
    recoveryCandidate.resolvedAt = recoveryCandidate.status === "recovered" ? nowIso(clock) : null;
    recoveryCandidate.resolutionCode = recoveryCandidate.status === "recovered" ? "recovered" : null;
    refreshCaseDerivedState(record);
    if (!hasOpenRecoveryCandidates(record) && !hasOpenDecisionDifferences(record)) {
      record.status = "closed";
    } else {
      record.status = "recovery_pending";
    }
    record.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      caseId: record.husCaseId,
      actorId,
      correlationId,
      action: "hus.case.recovery_recorded",
      entityType: "hus_recovery",
      entityId: recovery.husRecoveryId,
      projectId: record.projectId,
      explanation: `Recorded HUS recovery for case ${record.caseReference}.`
    });
    return {
      husCase: projectHusCase(record),
      husRecovery: copy(recovery),
      husRecoveryCandidate: copy(recoveryCandidate)
    };
  }

  function listHusAuditEvents({ companyId, husCaseId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedCaseId = normalizeOptionalText(husCaseId);
    return state.auditEvents
      .filter((event) => event.companyId === resolvedCompanyId)
      .filter((event) => (resolvedCaseId ? event.caseId === resolvedCaseId : true))
      .sort(compareAuditEvents)
      .map(copy);
  }

  function projectHusCase(record) {
    return copy({
      ...record,
      claimReadiness: buildClaimReadinessSnapshot(record)
    });
  }

  function refreshCaseDerivedState(record) {
    record.paidCustomerAmount = sumAmounts(record.customerPayments, "paidAmount");
    const invoiceGate = refreshInvoiceGate(record);
    const readiness = buildClaimReadinessSnapshot(record);
    record.invoiceGateStatus = invoiceGate.status;
    record.invoiceBlockerCodes = [...invoiceGate.blockerCodes];
    record.claimEligibilityStatus = readiness.status;
    record.claimBlockerCodes = [...readiness.blockerCodes];
    record.claimReadyAmount = readiness.claimableReductionAmount;
    record.claimedAmountTotal = sumActiveClaimAmounts(record);
    record.approvedAmountTotal = sumAmounts(record.decisions, "approvedAmount");
    record.paidOutAmountTotal = sumAmounts(record.payouts, "payoutAmount");
    record.recoveredAmountTotal = sumAmounts(record.recoveries, "recoveryAmount");
    record.outstandingCustomerShareAmount = roundMoney(Math.max(0, record.customerShareAmount - record.paidCustomerAmount));
  }

  function refreshInvoiceGate(record) {
    if (!record.invoiceGateSnapshot && !record.customerInvoiceId) {
      return {
        status: "pending",
        blockerCodes: ["invoice_gate_not_checked"]
      };
    }
    const evaluation = evaluateInvoiceGate(record);
    record.invoiceGateSnapshot = evaluation.snapshot;
    record.invoiceGateStatus = evaluation.status;
    record.invoiceBlockerCodes = evaluation.blockerCodes;
    return evaluation;
  }

  function buildClaimReadinessSnapshot(record, options = null) {
    const resolvedAsOfDate = normalizeOptionalDate(
      typeof options === "string" ? options : options?.asOfDate,
      "hus_readiness_as_of_invalid"
    ) || todayDate(clock);
    const excludeClaimId = typeof options === "object" && options ? normalizeOptionalText(options.excludeClaimId) : null;
    const blockerCodes = [];
    if (record.invoiceGateStatus !== "passed") {
      blockerCodes.push(...record.invoiceBlockerCodes.filter((code) => code !== "invoice_gate_not_checked"));
      blockerCodes.push("invoice_gate_not_passed");
    }
    if (!record.executorEligibility.fskattApproved) {
      blockerCodes.push("executor_fskatt_missing");
    }
    if (!record.serviceLines.some((line) => line.eligibleLaborAmount > 0)) {
      blockerCodes.push("hus_eligible_labor_missing");
    }
    if (record.serviceLines.some((line) => line.eligibleLaborAmount > 0 && !(line.workedHours > 0))) {
      blockerCodes.push("hus_worked_hours_missing");
    }
    if (!record.buyers.length) {
      blockerCodes.push("hus_buyers_missing");
    }
    if (!record.customerPayments.length) {
      blockerCodes.push("hus_customer_payment_missing");
    }
    if (record.customerPayments.some((payment) => payment.evidenceStatus !== "verified")) {
      blockerCodes.push("hus_customer_payment_evidence_missing");
    }
    const paymentCapacities = buildPaymentCapacities(record, { excludeClaimId });
    const expiredRemainingCapacity = paymentCapacities
      .filter((item) => item.remainingReductionAmount > MONEY_EPSILON && resolvedAsOfDate > item.latestAllowedSubmissionDate)
      .reduce((sum, item) => sum + item.remainingReductionAmount, 0);
    if (expiredRemainingCapacity > MONEY_EPSILON) {
      blockerCodes.push("hus_claim_deadline_passed");
    }
    const claimableReductionAmount = roundMoney(
      paymentCapacities
        .filter((item) => resolvedAsOfDate <= item.latestAllowedSubmissionDate)
        .reduce((sum, item) => sum + item.remainingReductionAmount, 0)
    );
    const paidRatio = record.customerShareAmount > 0 ? Math.min(1, roundMoney(record.paidCustomerAmount / record.customerShareAmount)) : 0;
    const status = blockerCodes.length > 0
      ? "blocked"
      : claimableReductionAmount <= MONEY_EPSILON
        ? "claimed_out"
        : paidRatio < 1
          ? "partial_ready"
          : "ready";
    return {
      status,
      blockerCodes: uniqueTexts(blockerCodes),
      claimableReductionAmount,
      paidRatio,
      asOfDate: resolvedAsOfDate,
      paymentCapacities: paymentCapacities.map(copy)
    };
  }

  function evaluateInvoiceGate(record) {
    const blockerCodes = [];
    const snapshot = normalizeInvoiceGateSnapshot(record, arPlatform);
    if (!record.buyers.length) {
      blockerCodes.push("hus_buyers_missing");
    }
    if (!record.serviceLines.some((line) => line.eligibleLaborAmount > 0)) {
      blockerCodes.push("hus_eligible_labor_missing");
    }
    appendPropertyBlockers(record, blockerCodes);
    if (!snapshot.invoiceNumber && !record.customerInvoiceId) {
      blockerCodes.push("hus_invoice_reference_missing");
    }
    if (!snapshot.invoiceIssuedOn) {
      blockerCodes.push("hus_invoice_issue_date_missing");
    }
    if (!moneyEquals(snapshot.invoiceGrossAmount, record.totalGrossAmount)) {
      blockerCodes.push("hus_invoice_gross_amount_mismatch");
    }
    if (!moneyEquals(snapshot.invoiceLaborAmount, record.totalEligibleLaborAmount)) {
      blockerCodes.push("hus_invoice_labor_amount_mismatch");
    }
    if (!moneyEquals(snapshot.invoicePreliminaryReductionAmount, record.preliminaryReductionAmount)) {
      blockerCodes.push("hus_invoice_reduction_amount_mismatch");
    }
    if (!moneyEquals(snapshot.invoiceCustomerShareAmount, record.customerShareAmount)) {
      blockerCodes.push("hus_invoice_customer_share_mismatch");
    }
    if (snapshot.arInvoice) {
      const arInvoice = snapshot.arInvoice;
      const arFieldEvaluation = snapshot.arFieldEvaluation;
      if (normalizeOptionalText(arInvoice.husCaseId) && arInvoice.husCaseId !== record.husCaseId) {
        blockerCodes.push("hus_ar_invoice_case_mismatch");
      }
      if (!ALLOWED_AR_INVOICE_STATUSES.has(arInvoice.status)) {
        blockerCodes.push("hus_ar_invoice_not_issued");
      }
      if (arFieldEvaluation && arFieldEvaluation.status !== "passed") {
        blockerCodes.push("hus_ar_invoice_field_gate_blocked");
      }
      if (normalizeOptionalText(arInvoice.husServiceTypeCode) && arInvoice.husServiceTypeCode !== record.serviceTypeCode) {
        blockerCodes.push("hus_ar_invoice_service_type_mismatch");
      }
      if (normalizeOptionalText(arInvoice.husBuyerIdentityNumber)) {
        const buyerIdentityNumbers = new Set(record.buyers.map((buyer) => buyer.personalIdentityNumber));
        if (!buyerIdentityNumbers.has(normalizeIdentityNumber(arInvoice.husBuyerIdentityNumber, "hus_buyer_identity_invalid"))) {
          blockerCodes.push("hus_ar_invoice_buyer_mismatch");
        }
      }
    }
    return {
      status: blockerCodes.length > 0 ? "blocked" : "passed",
      blockerCodes: uniqueTexts(blockerCodes),
      snapshot: stripArSnapshot(snapshot)
    };
  }

  function requireHusCase(companyId, husCaseId) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const record = state.husCases.get(requireText(husCaseId, "hus_case_id_required"));
    if (!record || record.companyId !== resolvedCompanyId) {
      throw createError(404, "hus_case_not_found", "HUS case was not found.");
    }
    return record;
  }

  function requireHusClaim(companyId, husClaimId) {
    const claimRecord = state.husClaims.get(requireText(husClaimId, "hus_claim_id_required"));
    if (!claimRecord || claimRecord.companyId !== requireText(companyId, "company_id_required")) {
      throw createError(404, "hus_claim_not_found", "HUS claim was not found.");
    }
    return claimRecord;
  }

  function requireHusDecisionDifference(companyId, husDecisionDifferenceId) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const record = state.husDecisionDifferences.get(requireText(husDecisionDifferenceId, "hus_decision_difference_id_required"));
    if (!record || record.companyId !== resolvedCompanyId) {
      throw createError(404, "hus_decision_difference_not_found", "HUS decision difference was not found.");
    }
    return record;
  }

function requireHusRecoveryCandidate(companyId, husRecoveryCandidateId) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const record = state.husRecoveryCandidates.get(requireText(husRecoveryCandidateId, "hus_recovery_candidate_id_required"));
    if (!record || record.companyId !== resolvedCompanyId) {
      throw createError(404, "hus_recovery_candidate_not_found", "HUS recovery candidate was not found.");
    }
    return record;
  }
}

function normalizeServiceLines(serviceLines, defaultServiceTypeCode) {
  if (!Array.isArray(serviceLines) || serviceLines.length === 0) {
    throw createError(400, "hus_service_lines_required", "At least one HUS service line is required.");
  }
  return serviceLines.map((line, index) => {
    const serviceTypeCode = requireEnum(HUS_SERVICE_TYPE_CODES, line?.serviceTypeCode ?? defaultServiceTypeCode, "hus_service_line_type_invalid");
    const laborCostAmount = normalizeMoney(line?.laborCostAmount ?? 0, "hus_service_line_labor_invalid");
    const materialAmount = normalizeMoney(line?.materialAmount ?? 0, "hus_service_line_material_invalid");
    const travelAmount = normalizeMoney(line?.travelAmount ?? 0, "hus_service_line_travel_invalid");
    const equipmentAmount = normalizeMoney(line?.equipmentAmount ?? 0, "hus_service_line_equipment_invalid");
    const adminAmount = normalizeMoney(line?.adminAmount ?? 0, "hus_service_line_admin_invalid");
    const otherAmount = normalizeMoney(line?.otherAmount ?? 0, "hus_service_line_other_invalid");
    const totalAmount = roundMoney(laborCostAmount + materialAmount + travelAmount + equipmentAmount + adminAmount + otherAmount);
    const reductionRate = serviceTypeCode === "rot" ? 0.3 : serviceTypeCode === "rut" ? 0.5 : 0;
    return {
      husServiceLineId: crypto.randomUUID(),
      lineNo: index + 1,
      description: requireText(line?.description || `Service line ${index + 1}`, "hus_service_line_description_required"),
      serviceTypeCode,
      workedHours: normalizeOptionalPositiveNumber(line?.workedHours, "hus_service_line_worked_hours_invalid"),
      laborCostAmount,
      materialAmount,
      travelAmount,
      equipmentAmount,
      adminAmount,
      otherAmount,
      totalAmount,
      eligibleLaborAmount: serviceTypeCode === "not_eligible" ? 0 : laborCostAmount,
      preliminaryReductionAmount: roundMoney(laborCostAmount * reductionRate),
      customerShareAmount: roundMoney(totalAmount - laborCostAmount * reductionRate)
    };
  });
}

function summarizeServiceLines(serviceLines) {
  return serviceLines.reduce(
    (accumulator, line) => ({
      totalGrossAmount: roundMoney(accumulator.totalGrossAmount + line.totalAmount),
      totalEligibleLaborAmount: roundMoney(accumulator.totalEligibleLaborAmount + line.eligibleLaborAmount),
      preliminaryReductionAmount: roundMoney(accumulator.preliminaryReductionAmount + line.preliminaryReductionAmount),
      customerShareAmount: roundMoney(accumulator.customerShareAmount + line.customerShareAmount)
    }),
    {
      totalGrossAmount: 0,
      totalEligibleLaborAmount: 0,
      preliminaryReductionAmount: 0,
      customerShareAmount: 0
    }
  );
}

function normalizeBuyers(buyers, customerShareAmount, preliminaryReductionAmount) {
  if (!Array.isArray(buyers) || buyers.length === 0) {
    throw createError(400, "hus_case_buyers_required", "At least one HUS buyer is required.");
  }
  const normalized = buyers.map((buyer, index) => ({
    husCaseBuyerId: crypto.randomUUID(),
    buyerNo: index + 1,
    displayName: requireText(buyer?.displayName, "hus_buyer_name_required"),
    personalIdentityNumber: normalizeIdentityNumber(buyer?.personalIdentityNumber, "hus_buyer_identity_required"),
    allocationPercent: normalizePositiveNumber(buyer?.allocationPercent ?? (buyers.length === 1 ? 100 : 0), "hus_buyer_allocation_invalid"),
    relationCode: normalizeOptionalText(buyer?.relationCode) || "resident",
    eligibilityFlags: {
      residentAtAddress: buyer?.residentAtAddress !== false,
      ownsResidence: buyer?.ownsResidence !== false
    }
  }));
  const totalPercent = roundMoney(normalized.reduce((sum, buyer) => sum + buyer.allocationPercent, 0));
  if (!moneyEquals(totalPercent, 100)) {
    throw createError(400, "hus_buyer_allocation_invalid", "HUS buyer allocation must sum to 100 percent.");
  }
  return normalized.map((buyer) => ({
    ...buyer,
    customerShareAmount: roundMoney(customerShareAmount * (buyer.allocationPercent / 100)),
    preliminaryReductionAmount: roundMoney(preliminaryReductionAmount * (buyer.allocationPercent / 100))
  }));
}

function normalizePropertyProfile({
  housingFormCode = null,
  propertyDesignation = null,
  apartmentDesignation = null,
  housingAssociationOrgNumber = null,
  serviceAddressLine1 = null,
  postalCode = null,
  city = null
} = {}) {
  return {
    housingFormCode: normalizeOptionalText(housingFormCode)
      ? requireEnum(HUS_HOUSING_FORM_CODES, housingFormCode, "hus_housing_form_invalid")
      : null,
    propertyDesignation: normalizeOptionalText(propertyDesignation),
    apartmentDesignation: normalizeOptionalText(apartmentDesignation),
    housingAssociationOrgNumber: normalizeOptionalOrgNumber(housingAssociationOrgNumber),
    serviceAddressLine1: normalizeOptionalText(serviceAddressLine1),
    postalCode: normalizeOptionalText(postalCode),
    city: normalizeOptionalText(city)
  };
}

function normalizeWorkInterval({ workCompletedOn, workCompletedFrom = null, workCompletedTo = null } = {}) {
  const resolvedCompletedOn = normalizeRequiredDate(workCompletedOn, "hus_work_completed_on_required");
  const resolvedFrom = normalizeOptionalDate(workCompletedFrom, "hus_work_completed_from_invalid") || resolvedCompletedOn;
  const resolvedTo = normalizeOptionalDate(workCompletedTo, "hus_work_completed_to_invalid") || resolvedCompletedOn;
  if (resolvedFrom > resolvedTo || resolvedTo > resolvedCompletedOn) {
    throw createError(400, "hus_work_interval_invalid", "HUS work interval must end on or before the completed date.");
  }
  return {
    workCompletedOn: resolvedCompletedOn,
    workCompletedFrom: resolvedFrom,
    workCompletedTo: resolvedTo
  };
}

function normalizeInvoiceGateSnapshotInput(input = {}) {
  if (!input) {
    return null;
  }
  return {
    invoiceNumber: normalizeOptionalText(input.invoiceNumber),
    invoiceIssuedOn: normalizeOptionalDate(input.invoiceIssuedOn, "hus_invoice_issued_on_invalid"),
    invoiceGrossAmount: normalizeOptionalMoney(input.invoiceGrossAmount, "hus_invoice_gross_amount_invalid"),
    invoiceLaborAmount: normalizeOptionalMoney(input.invoiceLaborAmount, "hus_invoice_labor_amount_invalid"),
    invoicePreliminaryReductionAmount: normalizeOptionalMoney(input.invoicePreliminaryReductionAmount, "hus_invoice_reduction_amount_invalid"),
    invoiceCustomerShareAmount: normalizeOptionalMoney(input.invoiceCustomerShareAmount, "hus_invoice_customer_share_invalid")
  };
}

function normalizeInvoiceGateSnapshot(record, arPlatform) {
  const snapshot = normalizeInvoiceGateSnapshotInput(record.invoiceGateSnapshot || {});
  const arInvoice = record.customerInvoiceId && typeof arPlatform?.getInvoice === "function"
    ? arPlatform.getInvoice({ companyId: record.companyId, customerInvoiceId: record.customerInvoiceId })
    : null;
  const arFieldEvaluation = arInvoice && typeof arPlatform?.getInvoiceFieldEvaluation === "function"
    ? arPlatform.getInvoiceFieldEvaluation({ companyId: record.companyId, customerInvoiceId: arInvoice.customerInvoiceId })
    : null;
  return {
    invoiceNumber: snapshot?.invoiceNumber || arInvoice?.invoiceNumber || null,
    invoiceIssuedOn: snapshot?.invoiceIssuedOn || normalizeOptionalDate(arInvoice?.issuedAt?.slice?.(0, 10) || arInvoice?.issueDate, "hus_invoice_issued_on_invalid"),
    invoiceGrossAmount: snapshot?.invoiceGrossAmount ?? record.totalGrossAmount,
    invoiceLaborAmount: snapshot?.invoiceLaborAmount ?? record.totalEligibleLaborAmount,
    invoicePreliminaryReductionAmount: snapshot?.invoicePreliminaryReductionAmount ?? record.preliminaryReductionAmount,
    invoiceCustomerShareAmount: snapshot?.invoiceCustomerShareAmount ?? record.customerShareAmount,
    arInvoice,
    arFieldEvaluation
  };
}

function stripArSnapshot(snapshot) {
  const copyValue = { ...snapshot };
  delete copyValue.arInvoice;
  delete copyValue.arFieldEvaluation;
  return copyValue;
}

function appendPropertyBlockers(record, blockerCodes) {
  const profile = record.propertyProfile || {};
  if (!profile.housingFormCode) {
    blockerCodes.push("hus_housing_form_missing");
  }
  if (record.serviceTypeCode === "rot") {
    if (profile.housingFormCode === "smallhouse" || profile.housingFormCode === "owner_apartment") {
      if (!profile.propertyDesignation) {
        blockerCodes.push("hus_property_designation_missing");
      }
    }
    if (profile.housingFormCode === "condominium") {
      if (!profile.apartmentDesignation) {
        blockerCodes.push("hus_apartment_designation_missing");
      }
      if (!profile.housingAssociationOrgNumber) {
        blockerCodes.push("hus_housing_association_org_number_missing");
      }
    }
    if (profile.housingFormCode === "rental_apartment" && !profile.apartmentDesignation) {
      blockerCodes.push("hus_apartment_designation_missing");
    }
  }
  if (record.serviceTypeCode === "rut" && !profile.serviceAddressLine1 && !profile.propertyDesignation && !profile.apartmentDesignation) {
    blockerCodes.push("hus_service_address_missing");
  }
}

function buildPaymentCapacities(record, { excludeClaimId = null } = {}) {
  const payments = [...record.customerPayments].sort(comparePayments);
  const customerShareBase = Math.max(record.customerShareAmount, 0);
  const reductionBase = Math.max(0, roundMoney(record.preliminaryReductionAmount - sumPrePayoutCreditAdjustments(record)));
  const claimAllocationsByPaymentId = new Map();
  for (const claim of record.claims) {
    if (excludeClaimId && claim.husClaimId === excludeClaimId) {
      continue;
    }
    for (const allocation of claim.paymentAllocations || []) {
      claimAllocationsByPaymentId.set(
        allocation.husCustomerPaymentId,
        roundMoney((claimAllocationsByPaymentId.get(allocation.husCustomerPaymentId) || 0) + allocation.claimReductionAmount)
      );
    }
  }
  let remainingCustomerShare = customerShareBase;
  return payments.map((payment) => {
    const coveredCustomerShareAmount = roundMoney(Math.max(0, Math.min(payment.paidAmount, remainingCustomerShare)));
    remainingCustomerShare = roundMoney(Math.max(0, remainingCustomerShare - coveredCustomerShareAmount));
    const grossReductionCapacity = customerShareBase > 0
      ? roundMoney(reductionBase * (coveredCustomerShareAmount / customerShareBase))
      : 0;
    const usedReductionAmount = claimAllocationsByPaymentId.get(payment.husCustomerPaymentId) || 0;
    const remainingReductionAmount = roundMoney(Math.max(0, grossReductionCapacity - usedReductionAmount));
    payment.claimCapacityAmount = grossReductionCapacity;
    return {
      husCustomerPaymentId: payment.husCustomerPaymentId,
      paidOn: payment.paidOn,
      paymentReference: payment.paymentReference,
      externalTraceId: payment.externalTraceId,
      coveredCustomerShareAmount,
      grossReductionCapacity,
      usedReductionAmount,
      remainingReductionAmount,
      latestAllowedSubmissionDate: deadlineForPaymentDate(payment.paidOn)
    };
  });
}

function allocateClaimAmountAcrossPayments(record, claimAmount) {
  let remaining = roundMoney(claimAmount);
  const allocations = [];
  for (const paymentCapacity of buildPaymentCapacities(record)) {
    if (remaining <= MONEY_EPSILON) {
      break;
    }
    const allocationAmount = roundMoney(Math.min(paymentCapacity.remainingReductionAmount, remaining));
    if (allocationAmount <= MONEY_EPSILON) {
      continue;
    }
    allocations.push({
      husCustomerPaymentId: paymentCapacity.husCustomerPaymentId,
      paidOn: paymentCapacity.paidOn,
      latestAllowedSubmissionDate: paymentCapacity.latestAllowedSubmissionDate,
      claimReductionAmount: allocationAmount
    });
    remaining = roundMoney(Math.max(0, remaining - allocationAmount));
  }
  if (remaining > MONEY_EPSILON) {
    throw createError(409, "hus_claim_payment_capacity_exhausted", "HUS claim amount exceeds the available payment-backed reduction capacity.");
  }
  return allocations;
}

function buildClaimPayload(record, claimRecord, readiness) {
  return {
    husCaseId: record.husCaseId,
    caseReference: record.caseReference,
    customerInvoiceId: record.customerInvoiceId,
    ruleYear: record.ruleYear,
    serviceTypeCode: record.serviceTypeCode,
    workCompletedOn: record.workCompletedOn,
    workCompletedFrom: record.workCompletedFrom,
    workCompletedTo: record.workCompletedTo,
    propertyProfile: record.propertyProfile,
    serviceLines: record.serviceLines,
    buyers: record.buyers,
    customerPayments: record.customerPayments,
    paymentAllocations: claimRecord.paymentAllocations,
    requestedAmount: claimRecord.requestedAmount,
    transportType: claimRecord.transportType,
    claimReadinessStatus: readiness.status,
    claimBlockerCodes: readiness.blockerCodes
  };
}

function sumActiveClaimAmounts(record) {
  return roundMoney(record.claims.reduce((sum, claim) => sum + Number(claim.requestedAmount || 0), 0));
}

function sumPrePayoutCreditAdjustments(record) {
  return roundMoney(record.creditAdjustments
    .filter((adjustment) => adjustment.afterPayoutFlag !== true)
    .reduce((sum, adjustment) => sum + Number(adjustment.adjustmentAmount || 0), 0));
}

function comparePayments(left, right) {
  return left.paidOn.localeCompare(right.paidOn) || left.createdAt.localeCompare(right.createdAt);
}

function hasOpenDecisionDifferences(record) {
  return record.decisionDifferences.some((item) => item.status === "open");
}

function hasOpenRecoveryCandidates(record) {
  return record.recoveryCandidates.some((item) => item.status === "open");
}

function findOpenRecoveryCandidate(record) {
  return record.recoveryCandidates.find((item) => item.status === "open") || null;
}

function generateCaseReference(state, companyId, clock) {
  const count = (state.husCaseIdsByCompany.get(companyId) || []).length + 1;
  return `HUS-${todayDate(clock).slice(0, 4)}-${String(count).padStart(4, "0")}`;
}

function deadlineForPaymentDate(paidOn) {
  return `${String(Number(String(paidOn).slice(0, 4)) + 1)}-01-31`;
}

function appendToIndex(map, key, value) {
  const current = map.get(key) || [];
  current.push(value);
  map.set(key, current);
}

function sumAmounts(items, fieldName) {
  return roundMoney((items || []).reduce((sum, item) => sum + Number(item[fieldName] || 0), 0));
}

function hasAnyPropertyInput(input = {}) {
  return [
    input.housingFormCode,
    input.propertyDesignation,
    input.apartmentDesignation,
    input.housingAssociationOrgNumber,
    input.serviceAddressLine1,
    input.postalCode,
    input.city
  ].some((value) => normalizeOptionalText(value) != null);
}

function uniqueTexts(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function normalizeIdentityNumber(value, code) {
  const normalized = requireText(value, code).replace(/[^0-9]/g, "");
  if (![10, 12].includes(normalized.length)) {
    throw createError(400, code, "Buyer identity number must use 10 or 12 digits.");
  }
  return normalized;
}

function normalizeOptionalOrgNumber(value) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  const digits = normalized.replace(/[^0-9]/g, "");
  if (digits.length !== 10) {
    throw createError(400, "hus_org_number_invalid", "Organisation number must use 10 digits.");
  }
  return digits;
}

function requireText(value, code) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    throw createError(400, code, "Required value is missing.");
  }
  return normalized;
}

function normalizeOptionalText(value) {
  if (value == null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function normalizeRequiredDate(value, code) {
  const normalized = normalizeOptionalDate(value, code);
  if (!normalized) {
    throw createError(400, code, "Date is required.");
  }
  return normalized;
}

function normalizeOptionalDate(value, code) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw createError(400, code, "Date must use YYYY-MM-DD.");
  }
  return normalized;
}

function normalizeUpperCode(value, code, length = null) {
  const normalized = requireText(value, code).toUpperCase();
  if (length != null && normalized.length !== length) {
    throw createError(400, code, `Expected ${length} characters.`);
  }
  return normalized;
}

function normalizeMoney(value, code) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw createError(400, code, "Expected a non-negative numeric amount.");
  }
  return roundMoney(numberValue);
}

function normalizeOptionalMoney(value, code) {
  if (value == null || value === "") {
    return null;
  }
  return normalizeMoney(value, code);
}

function normalizeWholeNumber(value, code) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw createError(400, code, "Expected a non-negative whole number.");
  }
  return Math.round(numberValue);
}

function normalizePositiveNumber(value, code) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw createError(400, code, "Expected a positive numeric value.");
  }
  return roundMoney(numberValue);
}

function normalizeOptionalPositiveNumber(value, code) {
  if (value == null || value === "") {
    return null;
  }
  return normalizePositiveNumber(value, code);
}

function requireEnum(allowedValues, value, code) {
  const normalized = requireText(value, code);
  if (!allowedValues.includes(normalized)) {
    throw createError(400, code, `Value ${normalized} is not allowed.`);
  }
  return normalized;
}

function todayDate(clock) {
  return new Date(clock()).toISOString().slice(0, 10);
}

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function moneyEquals(left, right) {
  return Math.abs(roundMoney(left) - roundMoney(right)) <= MONEY_EPSILON;
}

function pushAudit(state, clock, entry) {
  state.auditEvents.push(
    createAuditEnvelopeFromLegacyEvent({
      clock,
      auditClass: "hus_action",
      event: entry
    })
  );
}

function hashObject(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (value == null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function compareAuditEvents(left, right) {
  return resolveAuditRecordedAt(left).localeCompare(resolveAuditRecordedAt(right))
    || String(left.auditId || left.auditEventId || "").localeCompare(String(right.auditId || right.auditEventId || ""));
}

function resolveAuditRecordedAt(event) {
  return String(event?.recordedAt || event?.createdAt || event?.occurredAt || "");
}

function copy(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createError(statusCode, error, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.error = error;
  return err;
}
