import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";
import { createRulePackRegistry } from "../../rule-engine/src/index.mjs";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";

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
export const HUS_CLAIM_TRANSPORT_TYPES = Object.freeze(["json", "xml", "direct_api"]);
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
export const HUS_RULEPACK_CODE = "RP-HUS-SE";
export const HUS_RULEPACK_VERSION = "se-hus-2026.1";
const HUS_SETTLEMENT_CLEARING_ACCOUNT = "1180";
const HUS_SKATTEVERKET_ACCOUNT = "2560";
const HUS_RECOVERY_RECEIVABLE_ACCOUNT = "1590";

const HUS_RULE_PACKS = Object.freeze([
  Object.freeze({
    rulePackId: "hus-se-2025.1",
    rulePackCode: HUS_RULEPACK_CODE,
    domain: "hus",
    jurisdiction: "SE",
    effectiveFrom: "2025-01-01",
    effectiveTo: "2026-01-01",
    version: "se-hus-2025.1",
    checksum: "hus-se-2025.1",
    sourceSnapshotDate: "2026-03-24",
    semanticChangeSummary: "Swedish HUS baseline for 2025 claims.",
    machineReadableRules: Object.freeze({
      ruleYear: 2025,
      annualCapAmount: 75000,
      rotAnnualCapAmount: 50000,
      rutAnnualCapAmount: 75000,
      rotReductionRate: 0.5,
      rutReductionRate: 0.5,
      deadlineRollForwardWeekend: true
    }),
    humanReadableExplanation: Object.freeze(["HUS decisions must pin the rule year that applied when the work was completed and the claim payload was created."]),
    testVectors: Object.freeze([]),
    migrationNotes: Object.freeze([])
  }),
  Object.freeze({
    rulePackId: "hus-se-2026.1",
    rulePackCode: HUS_RULEPACK_CODE,
    domain: "hus",
    jurisdiction: "SE",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    version: HUS_RULEPACK_VERSION,
    checksum: "hus-se-2026.1",
    sourceSnapshotDate: "2026-03-24",
    semanticChangeSummary: "Swedish HUS baseline for 2026 claims.",
    machineReadableRules: Object.freeze({
      ruleYear: 2026,
      annualCapAmount: 75000,
      rotAnnualCapAmount: 50000,
      rutAnnualCapAmount: 75000,
      rotReductionRate: 0.3,
      rutReductionRate: 0.5,
      deadlineRollForwardWeekend: true
    }),
    humanReadableExplanation: Object.freeze(["HUS decisions must pin the rule year that applied when the work was completed and the claim payload was created."]),
    testVectors: Object.freeze([]),
    migrationNotes: Object.freeze([])
  })
]);

const ALLOWED_AR_INVOICE_STATUSES = new Set(["issued", "delivered", "partially_paid", "paid", "overdue", "disputed", "credited"]);
const MONEY_EPSILON = 0.01;

export function createHusPlatform(options = {}) {
  return createHusEngine(options);
}

export function createHusEngine({
  clock = () => new Date(),
  arPlatform = null,
  projectsPlatform = null,
  ledgerPlatform = null,
  ruleRegistry = null
} = {}) {
  const rules = ruleRegistry || createRulePackRegistry({
    clock,
    seedRulePacks: HUS_RULE_PACKS
  });
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

  const engine = {
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

  Object.defineProperty(engine, "rulePackGovernance", {
    value: Object.freeze({
      listRulePacks: (filters = {}) => rules.listRulePacks({ domain: "hus", jurisdiction: "SE", ...filters }),
      getRulePack: (filters) => rules.getRulePack(filters),
      createDraftRulePackVersion: (input) => rules.createDraftRulePackVersion(input),
      validateRulePackVersion: (input) => rules.validateRulePackVersion(input),
      approveRulePackVersion: (input) => rules.approveRulePackVersion(input),
      publishRulePackVersion: (input) => rules.publishRulePackVersion(input),
      rollbackRulePackVersion: (input) => rules.rollbackRulePackVersion(input),
      listRulePackRollbacks: (filters = {}) => rules.listRulePackRollbacks({ domain: "hus", jurisdiction: "SE", ...filters })
    }),
    enumerable: false
  });

  return engine;

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
    const rulePack = resolveHusRulePack({
      effectiveDate: workInterval.workCompletedOn,
      ruleYear: normalizeWholeNumber(ruleYear, "hus_rule_year_invalid")
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
      ruleYear: rulePack.ruleYear,
      rulepackId: rulePack.rulePackId,
      rulepackCode: rulePack.rulePackCode,
      rulepackVersion: rulePack.version,
      rulepackChecksum: rulePack.checksum,
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
    if (hasLockedClaimFields(record)) {
      throw createError(409, "hus_case_claim_fields_locked", "The HUS case has a locked claim lifecycle and can no longer be reclassified.");
    }
    const normalizedLines = normalizeServiceLines(serviceLines, {
      defaultServiceTypeCode: record.serviceTypeCode,
      ruleYear: record.ruleYear
    });
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
      rulepackId: record.rulepackId,
      rulepackCode: record.rulepackCode,
      rulepackVersion: record.rulepackVersion,
      rulepackChecksum: record.rulepackChecksum,
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
    if (hasLockedClaimFields(record)) {
      throw createError(409, "hus_case_claim_fields_locked", "Invoice-linked HUS fields are locked after a claim has been drafted.");
    }
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
    const buyerAllocations = allocateClaimAmountAcrossBuyers(state, record, resolvedRequestedAmount);
    const rulePack = resolveHusRulePack({ effectiveDate: record.workCompletedOn, ruleYear: record.ruleYear });
    const claimRecord = {
      husClaimId: crypto.randomUUID(),
      companyId: record.companyId,
      husCaseId: record.husCaseId,
      versionNo: record.claims.length + 1,
      rulepackId: rulePack.rulePackId,
      rulepackCode: rulePack.rulePackCode,
      rulepackVersion: rulePack.version,
      rulepackChecksum: rulePack.checksum,
      requestedAmount: resolvedRequestedAmount,
      transportType: requireEnum(HUS_CLAIM_TRANSPORT_TYPES, transportType, "hus_claim_transport_invalid"),
      status: "claim_draft",
      submittedOn: null,
      payloadHash: null,
      claimReadinessStatus: readiness.status,
      paymentAllocations,
      buyerAllocations,
      transportProfile: buildHusTransportProfile({
        transportType: requireEnum(HUS_CLAIM_TRANSPORT_TYPES, transportType, "hus_claim_transport_invalid")
      }),
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
    if (!Array.isArray(claimRecord.buyerAllocations) || claimRecord.buyerAllocations.length === 0) {
      throw createError(409, "hus_claim_buyer_allocations_missing", "HUS claim submission requires locked buyer allocations.");
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
    if (claimRecord.status !== "claim_submitted") {
      throw createError(409, "hus_claim_not_decidable", "Only submitted HUS claims can receive authority decisions.");
    }
    const record = requireHusCase(companyId, claimRecord.husCaseId);
    const resolvedApprovedAmount = normalizeMoney(approvedAmount, "hus_decision_approved_amount_invalid");
    const resolvedRejectedAmount = normalizeMoney(
      rejectedAmount ?? Math.max(0, claimRecord.requestedAmount - resolvedApprovedAmount),
      "hus_decision_rejected_amount_invalid"
    );
    const rulePack = resolveHusRulePack({
      effectiveDate: claimRecord.submittedOn || record.workCompletedOn,
      ruleYear: record.ruleYear
    });
    if (!moneyEquals(roundMoney(resolvedApprovedAmount + resolvedRejectedAmount), claimRecord.requestedAmount)) {
      throw createError(409, "hus_decision_amount_mismatch", "Approved and rejected HUS decision amounts must reconcile to the requested amount.");
    }
    const decision = {
      husDecisionId: crypto.randomUUID(),
      husClaimId: claimRecord.husClaimId,
      rulepackId: rulePack.rulePackId,
      rulepackCode: rulePack.rulePackCode,
      rulepackVersion: rulePack.version,
      rulepackChecksum: rulePack.checksum,
      decisionDate: normalizeRequiredDate(decisionDate, "hus_decision_date_required"),
      requestedAmount: claimRecord.requestedAmount,
      approvedAmount: resolvedApprovedAmount,
      rejectedAmount: resolvedRejectedAmount,
      buyerOutcomeAllocations: buildClaimBuyerDecisionAllocations(claimRecord, {
        approvedAmount: resolvedApprovedAmount,
        rejectedAmount: resolvedRejectedAmount
      }),
      journalEntryId: null,
      reasonCode: requireText(reasonCode, "hus_decision_reason_required"),
      rejectedOutcomeCode: requireText(rejectedOutcomeCode, "hus_rejected_outcome_required"),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    if (claimRecord.submittedOn && decision.decisionDate < claimRecord.submittedOn) {
      throw createError(409, "hus_decision_before_submission", "HUS decisions cannot be recorded before the claim submission date.");
    }
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
    if (resolvedApprovedAmount > 0) {
      const postedDecision = maybePostHusDecisionToLedger({
        ledgerPlatform,
        record,
        claimRecord,
        decision,
        actorId,
        correlationId
      });
      decision.journalEntryId = postedDecision?.journalEntry?.journalEntryId || null;
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
    if (record.decisionDifferences.some((item) => item.husClaimId === claimRecord.husClaimId && item.status === "open")) {
      throw createError(409, "hus_claim_difference_unresolved", "Partial HUS decisions must resolve open decision differences before payout.");
    }
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
      journalEntryId: null,
      reasonCode: requireText(reasonCode, "hus_recovery_reason_required"),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    record.recoveries.push(recovery);
    const postedRecovery = maybePostHusRecoveryToLedger({
      ledgerPlatform,
      record,
      recoveryCandidate,
      recovery,
      actorId,
      correlationId
    });
    recovery.journalEntryId = postedRecovery?.journalEntry?.journalEntryId || null;
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

  function resolveHusRulePack({ effectiveDate, ruleYear = null } = {}) {
    const rulePack = rules.resolveRulePack({
      rulePackCode: HUS_RULEPACK_CODE,
      domain: "hus",
      jurisdiction: "SE",
      effectiveDate
    });
    const resolvedRuleYear = Number(rulePack.machineReadableRules?.ruleYear || String(rulePack.effectiveFrom).slice(0, 4));
    if (ruleYear != null && Number(ruleYear) !== resolvedRuleYear) {
      throw createError(409, "hus_rule_year_rulepack_mismatch", "Provided HUS rule year does not match the effective rulepack.");
    }
    return {
      ...rulePack,
      ruleYear: resolvedRuleYear
    };
  }

  function projectHusCase(record) {
    return copy({
      ...record,
      claimReadiness: buildClaimReadinessSnapshot(record)
    });
  }

  function maybePostHusDecisionToLedger({
    ledgerPlatform,
    record,
    claimRecord,
    decision,
    actorId,
    correlationId
  } = {}) {
    if (!ledgerPlatform || typeof ledgerPlatform.applyPostingIntent !== "function") {
      return null;
    }
    const recipeCode = claimRecord.status === "claim_partially_accepted"
      ? "HUS_CLAIM_PARTIALLY_ACCEPTED"
      : "HUS_CLAIM_ACCEPTED";
    ensureHusVoucherSeries({
      ledgerPlatform,
      companyId: record.companyId,
      seriesCode: "B",
      description: "HUS settlement clearing",
      actorId
    });
    return ledgerPlatform.applyPostingIntent({
      companyId: record.companyId,
      journalDate: decision.decisionDate,
      recipeCode,
      postingSignalCode: claimRecord.status === "claim_partially_accepted"
        ? "hus.claim.partially_accepted"
        : "hus.claim.accepted",
      sourceType: "ROT_RUT_CLAIM",
      sourceId: claimRecord.husClaimId,
      sourceObjectVersion: `hus-decision:${decision.husDecisionId}`,
      actorId,
      correlationId,
      idempotencyKey: `hus-decision-posting:${decision.husDecisionId}`,
      description: `HUS claim ${claimRecord.versionNo} ${claimRecord.status}`,
      metadataJson: buildHusPostingMetadata({
        record,
        claimRecord,
        rulepackId: decision.rulepackId,
        rulepackCode: decision.rulepackCode,
        rulepackVersion: decision.rulepackVersion,
        rulepackChecksum: decision.rulepackChecksum,
        claimPayloadHash: claimRecord.payloadHash,
        approvedAmount: decision.approvedAmount,
        rejectedAmount: decision.rejectedAmount
      }),
      lines: [
        createHusJournalLine(HUS_SETTLEMENT_CLEARING_ACCOUNT, 1, decision.approvedAmount, 0, record),
        createHusJournalLine(HUS_SKATTEVERKET_ACCOUNT, 2, 0, decision.approvedAmount, record)
      ]
    });
  }

  function maybePostHusRecoveryToLedger({
    ledgerPlatform,
    record,
    recoveryCandidate,
    recovery,
    actorId,
    correlationId
  } = {}) {
    if (!ledgerPlatform || typeof ledgerPlatform.applyPostingIntent !== "function") {
      return null;
    }
    ensureHusVoucherSeries({
      ledgerPlatform,
      companyId: record.companyId,
      seriesCode: "V",
      description: "HUS recovery adjustments",
      actorId
    });
    return ledgerPlatform.applyPostingIntent({
      companyId: record.companyId,
      journalDate: recovery.recoveryDate,
      recipeCode: "HUS_RECOVERY_CONFIRMED",
      postingSignalCode: "hus.recovery.confirmed",
      sourceType: "ROT_RUT_CLAIM",
      sourceId: recoveryCandidate.husRecoveryCandidateId,
      sourceObjectVersion: `hus-recovery:${recovery.husRecoveryId}`,
      actorId,
      correlationId,
      idempotencyKey: `hus-recovery-posting:${recovery.husRecoveryId}`,
      description: `HUS recovery ${record.caseReference}`,
      metadataJson: buildHusPostingMetadata({
        record,
        claimRecord: findClaimByRecoveryCandidate(record, recoveryCandidate),
        rulepackId: record.rulepackId,
        rulepackCode: record.rulepackCode,
        rulepackVersion: record.rulepackVersion,
        rulepackChecksum: record.rulepackChecksum,
        recoveryAmount: recovery.recoveryAmount,
        recoveryCandidateId: recoveryCandidate.husRecoveryCandidateId
      }),
      lines: [
        createHusJournalLine(HUS_RECOVERY_RECEIVABLE_ACCOUNT, 1, recovery.recoveryAmount, 0, record),
        createHusJournalLine(HUS_SETTLEMENT_CLEARING_ACCOUNT, 2, 0, recovery.recoveryAmount, record)
      ]
    });
  }

  function buildHusPostingMetadata({
    record,
    claimRecord = null,
    rulepackId,
    rulepackCode,
    rulepackVersion,
    rulepackChecksum,
    claimPayloadHash = null,
    approvedAmount = null,
    rejectedAmount = null,
    recoveryAmount = null,
    recoveryCandidateId = null
  } = {}) {
    return {
      rulepackRefs: [
        {
          rulepackId,
          rulepackCode,
          rulepackVersion,
          rulepackChecksum
        }
      ],
      husCaseId: record.husCaseId,
      husCaseReference: record.caseReference,
      husClaimId: claimRecord?.husClaimId || null,
      customerInvoiceId: record.customerInvoiceId || null,
      projectId: record.projectId || null,
      serviceTypeCode: record.serviceTypeCode,
      claimPayloadHash: claimPayloadHash || null,
      approvedAmount: normalizeOptionalMoney(approvedAmount, "hus_posting_approved_amount_invalid"),
      rejectedAmount: normalizeOptionalMoney(rejectedAmount, "hus_posting_rejected_amount_invalid"),
      recoveryAmount: normalizeOptionalMoney(recoveryAmount, "hus_posting_recovery_amount_invalid"),
      recoveryCandidateId: normalizeOptionalText(recoveryCandidateId),
      propertyDesignation: record.propertyProfile?.propertyDesignation || null,
      housingFormCode: record.propertyProfile?.housingFormCode || null
    };
  }

  function createHusJournalLine(accountNumber, lineNumber, debitAmount, creditAmount, record) {
    const dimensionJson = record.projectId
      ? { projectId: record.projectId }
      : null;
    return {
      accountNumber,
      lineNumber,
      debitAmount: roundMoney(debitAmount),
      creditAmount: roundMoney(creditAmount),
      sourceType: "ROT_RUT_CLAIM",
      sourceId: record.husCaseId,
      description: record.caseReference,
      ...(dimensionJson ? { dimensionJson } : {})
    };
  }

  function findClaimByRecoveryCandidate(record, recoveryCandidate) {
    return record.claims.find((claim) =>
      record.decisions.some(
        (decision) =>
          decision.husClaimId === claim.husClaimId
          && moneyEquals(decision.approvedAmount, recoveryCandidate.previousAcceptedAmount)
      )
    ) || record.claims.at(-1) || null;
  }

  function ensureHusVoucherSeries({
    ledgerPlatform,
    companyId,
    seriesCode,
    description,
    actorId
  } = {}) {
    if (!ledgerPlatform || typeof ledgerPlatform.upsertVoucherSeries !== "function") {
      return;
    }
    ledgerPlatform.upsertVoucherSeries({
      companyId,
      seriesCode,
      description,
      purposeCodes: [],
      locked: true,
      changeReasonCode: "hus_posting_runtime",
      actorId
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
    const buyerCapacities = buildBuyerCapacities(state, record, { excludeClaimId });
    if (!buyerCapacities.some((buyer) => buyer.remainingClaimableAmount > MONEY_EPSILON)) {
      blockerCodes.push("hus_buyer_annual_cap_exhausted");
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
    const paymentClaimableReductionAmount = roundMoney(
      paymentCapacities
        .filter((item) => resolvedAsOfDate <= item.latestAllowedSubmissionDate)
        .reduce((sum, item) => sum + item.remainingReductionAmount, 0)
    );
    const buyerClaimableReductionAmount = roundMoney(
      buyerCapacities.reduce((sum, buyer) => sum + buyer.remainingClaimableAmount, 0)
    );
    const claimableReductionAmount = roundMoney(Math.min(paymentClaimableReductionAmount, buyerClaimableReductionAmount));
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
      paymentClaimableReductionAmount,
      buyerClaimableReductionAmount,
      paidRatio,
      asOfDate: resolvedAsOfDate,
      paymentCapacities: paymentCapacities.map(copy),
      buyerCapacities: buyerCapacities.map(copy)
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

function normalizeServiceLines(serviceLines, { defaultServiceTypeCode, ruleYear }) {
  if (!Array.isArray(serviceLines) || serviceLines.length === 0) {
    throw createError(400, "hus_service_lines_required", "At least one HUS service line is required.");
  }
  const rulePack = resolveStaticHusRulePackByYear(ruleYear);
  return serviceLines.map((line, index) => {
    const serviceTypeCode = requireEnum(HUS_SERVICE_TYPE_CODES, line?.serviceTypeCode ?? defaultServiceTypeCode, "hus_service_line_type_invalid");
    const laborCostAmount = normalizeMoney(line?.laborCostAmount ?? 0, "hus_service_line_labor_invalid");
    const materialAmount = normalizeMoney(line?.materialAmount ?? 0, "hus_service_line_material_invalid");
    const travelAmount = normalizeMoney(line?.travelAmount ?? 0, "hus_service_line_travel_invalid");
    const equipmentAmount = normalizeMoney(line?.equipmentAmount ?? 0, "hus_service_line_equipment_invalid");
    const adminAmount = normalizeMoney(line?.adminAmount ?? 0, "hus_service_line_admin_invalid");
    const otherAmount = normalizeMoney(line?.otherAmount ?? 0, "hus_service_line_other_invalid");
    const totalAmount = roundMoney(laborCostAmount + materialAmount + travelAmount + equipmentAmount + adminAmount + otherAmount);
    const reductionRate =
      serviceTypeCode === "rot"
        ? Number(rulePack.machineReadableRules?.rotReductionRate ?? 0.3)
        : serviceTypeCode === "rut"
          ? Number(rulePack.machineReadableRules?.rutReductionRate ?? 0.5)
          : 0;
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

function buildBuyerCapacities(state, record, { excludeClaimId = null } = {}) {
  return record.buyers.map((buyer) => {
    const caseClaimedAmount = sumBuyerClaimUsageForCase(record, buyer.personalIdentityNumber, {
      excludeClaimId
    });
    const annualUsage = summarizeBuyerAnnualUsage(
      state,
      record.companyId,
      record.ruleYear,
      buyer.personalIdentityNumber,
      {
        excludeClaimId,
        serviceTypeCode: record.serviceTypeCode
      }
    );
    const rulePack = resolveStaticHusRulePackByYear(record.ruleYear);
    const annualCapAmount = Number(rulePack.machineReadableRules?.annualCapAmount ?? 75000);
    const serviceTypeCapAmount = record.serviceTypeCode === "rot"
      ? Number(rulePack.machineReadableRules?.rotAnnualCapAmount ?? 50000)
      : Number(rulePack.machineReadableRules?.rutAnnualCapAmount ?? annualCapAmount);
    const remainingAnnualCapAmount = roundMoney(Math.max(0, annualCapAmount - annualUsage.totalUsedAmount));
    const remainingServiceTypeCapAmount = roundMoney(Math.max(0, serviceTypeCapAmount - annualUsage.serviceTypeUsedAmount));
    const remainingCaseAmount = roundMoney(Math.max(0, buyer.preliminaryReductionAmount - caseClaimedAmount));
    const remainingClaimableAmount = roundMoney(
      Math.min(remainingCaseAmount, remainingAnnualCapAmount, remainingServiceTypeCapAmount)
    );
    return {
      husCaseBuyerId: buyer.husCaseBuyerId,
      displayName: buyer.displayName,
      personalIdentityNumber: buyer.personalIdentityNumber,
      allocationPercent: buyer.allocationPercent,
      casePreliminaryReductionAmount: buyer.preliminaryReductionAmount,
      caseClaimedAmount,
      annualCapAmount,
      serviceTypeCapAmount,
      annualUsedAmount: annualUsage.totalUsedAmount,
      serviceTypeUsedAmount: annualUsage.serviceTypeUsedAmount,
      remainingAnnualCapAmount,
      remainingServiceTypeCapAmount,
      remainingClaimableAmount
    };
  });
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

function allocateClaimAmountAcrossBuyers(state, record, claimAmount) {
  let remaining = roundMoney(claimAmount);
  const buyerCapacities = buildBuyerCapacities(state, record);
  const totalBuyerCapacity = roundMoney(buyerCapacities.reduce((sum, buyer) => sum + buyer.remainingClaimableAmount, 0));
  if (remaining > totalBuyerCapacity + MONEY_EPSILON) {
    throw createError(409, "hus_claim_buyer_capacity_exhausted", "HUS claim amount exceeds buyer allocation or yearly HUS cap capacity.");
  }
  const allocations = [];
  const totalWeight = roundMoney(buyerCapacities.reduce((sum, buyer) => sum + buyer.remainingClaimableAmount, 0));
  buyerCapacities.forEach((buyerCapacity, index) => {
    if (remaining <= MONEY_EPSILON) {
      return;
    }
    const provisionalAmount = index === buyerCapacities.length - 1
      ? remaining
      : roundMoney((claimAmount * buyerCapacity.remainingClaimableAmount) / Math.max(totalWeight, MONEY_EPSILON));
    const allocatedAmount = roundMoney(Math.min(buyerCapacity.remainingClaimableAmount, provisionalAmount, remaining));
    if (allocatedAmount <= MONEY_EPSILON) {
      return;
    }
    allocations.push({
      husCaseBuyerId: buyerCapacity.husCaseBuyerId,
      displayName: buyerCapacity.displayName,
      personalIdentityNumber: buyerCapacity.personalIdentityNumber,
      allocationPercent: buyerCapacity.allocationPercent,
      requestedAmount: allocatedAmount,
      annualCapAmount: buyerCapacity.annualCapAmount,
      serviceTypeCapAmount: buyerCapacity.serviceTypeCapAmount,
      annualUsedAmountBeforeClaim: buyerCapacity.annualUsedAmount,
      serviceTypeUsedAmountBeforeClaim: buyerCapacity.serviceTypeUsedAmount,
      remainingAnnualCapAmountAfterClaim: roundMoney(Math.max(0, buyerCapacity.remainingAnnualCapAmount - allocatedAmount)),
      remainingServiceTypeCapAmountAfterClaim: roundMoney(Math.max(0, buyerCapacity.remainingServiceTypeCapAmount - allocatedAmount))
    });
    remaining = roundMoney(Math.max(0, remaining - allocatedAmount));
  });
  if (remaining > MONEY_EPSILON) {
    const sortedCapacities = [...buyerCapacities].sort((left, right) => right.remainingClaimableAmount - left.remainingClaimableAmount);
    for (const buyerCapacity of sortedCapacities) {
      if (remaining <= MONEY_EPSILON) {
        break;
      }
      const allocation = allocations.find((item) => item.husCaseBuyerId === buyerCapacity.husCaseBuyerId);
      const alreadyAllocatedAmount = allocation?.requestedAmount || 0;
      const spareAmount = roundMoney(Math.max(0, buyerCapacity.remainingClaimableAmount - alreadyAllocatedAmount));
      if (spareAmount <= MONEY_EPSILON) {
        continue;
      }
      const topUpAmount = roundMoney(Math.min(spareAmount, remaining));
      if (!allocation) {
        allocations.push({
          husCaseBuyerId: buyerCapacity.husCaseBuyerId,
          displayName: buyerCapacity.displayName,
          personalIdentityNumber: buyerCapacity.personalIdentityNumber,
          allocationPercent: buyerCapacity.allocationPercent,
          requestedAmount: topUpAmount,
          annualCapAmount: buyerCapacity.annualCapAmount,
          serviceTypeCapAmount: buyerCapacity.serviceTypeCapAmount,
          annualUsedAmountBeforeClaim: buyerCapacity.annualUsedAmount,
          serviceTypeUsedAmountBeforeClaim: buyerCapacity.serviceTypeUsedAmount,
          remainingAnnualCapAmountAfterClaim: roundMoney(Math.max(0, buyerCapacity.remainingAnnualCapAmount - topUpAmount)),
          remainingServiceTypeCapAmountAfterClaim: roundMoney(Math.max(0, buyerCapacity.remainingServiceTypeCapAmount - topUpAmount))
        });
      } else {
        allocation.requestedAmount = roundMoney(allocation.requestedAmount + topUpAmount);
        allocation.remainingAnnualCapAmountAfterClaim = roundMoney(Math.max(0, allocation.remainingAnnualCapAmountAfterClaim - topUpAmount));
        allocation.remainingServiceTypeCapAmountAfterClaim = roundMoney(Math.max(0, allocation.remainingServiceTypeCapAmountAfterClaim - topUpAmount));
      }
      remaining = roundMoney(Math.max(0, remaining - topUpAmount));
    }
  }
  if (remaining > MONEY_EPSILON) {
    throw createError(409, "hus_claim_buyer_capacity_exhausted", "HUS claim amount exceeds buyer allocation or yearly HUS cap capacity.");
  }
  return allocations;
}

function buildClaimPayload(record, claimRecord, readiness) {
  return {
    husCaseId: record.husCaseId,
    caseReference: record.caseReference,
    customerInvoiceId: record.customerInvoiceId,
    ruleYear: record.ruleYear,
    rulepackId: claimRecord.rulepackId || record.rulepackId,
    rulepackCode: claimRecord.rulepackCode || record.rulepackCode,
    rulepackVersion: claimRecord.rulepackVersion || record.rulepackVersion,
    rulepackChecksum: claimRecord.rulepackChecksum || record.rulepackChecksum,
    serviceTypeCode: record.serviceTypeCode,
    workCompletedOn: record.workCompletedOn,
    workCompletedFrom: record.workCompletedFrom,
    workCompletedTo: record.workCompletedTo,
    propertyProfile: record.propertyProfile,
    serviceLines: record.serviceLines,
    buyers: record.buyers,
    customerPayments: record.customerPayments,
    paymentAllocations: claimRecord.paymentAllocations,
    buyerAllocations: claimRecord.buyerAllocations,
    transportProfile: claimRecord.transportProfile,
    requestedAmount: claimRecord.requestedAmount,
    transportType: claimRecord.transportType,
    claimReadinessStatus: readiness.status,
    claimBlockerCodes: readiness.blockerCodes,
    buyerCapacities: readiness.buyerCapacities,
    paymentCapacities: readiness.paymentCapacities
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

function sumBuyerClaimUsageForCase(record, personalIdentityNumber, { excludeClaimId = null } = {}) {
  return roundMoney(record.claims.reduce((sum, claim) => {
    if (excludeClaimId && claim.husClaimId === excludeClaimId) {
      return sum;
    }
    return sum + resolveBuyerUsageAmountForClaim(claim, record, personalIdentityNumber);
  }, 0));
}

function summarizeBuyerAnnualUsage(state, companyId, ruleYear, personalIdentityNumber, { excludeClaimId = null, serviceTypeCode = null } = {}) {
  let totalUsedAmount = 0;
  let serviceTypeUsedAmount = 0;
  for (const husCaseId of state.husCaseIdsByCompany.get(companyId) || []) {
    const record = state.husCases.get(husCaseId);
    if (!record || record.ruleYear !== ruleYear) {
      continue;
    }
    for (const claim of record.claims) {
      if (excludeClaimId && claim.husClaimId === excludeClaimId) {
        continue;
      }
      const usedAmount = resolveBuyerUsageAmountForClaim(claim, record, personalIdentityNumber);
      totalUsedAmount = roundMoney(totalUsedAmount + usedAmount);
      if (serviceTypeCode && record.serviceTypeCode === serviceTypeCode) {
        serviceTypeUsedAmount = roundMoney(serviceTypeUsedAmount + usedAmount);
      }
    }
  }
  return {
    totalUsedAmount,
    serviceTypeUsedAmount
  };
}

function resolveBuyerUsageAmountForClaim(claim, record, personalIdentityNumber) {
  const baseAllocation = resolveClaimBuyerAllocationAmount(claim, personalIdentityNumber);
  if (baseAllocation <= MONEY_EPSILON) {
    return 0;
  }
  if (claim.status === "claim_rejected") {
    return 0;
  }
  const approvedAmount = resolveApprovedAmountForClaim(record, claim.husClaimId);
  const recoveredAmount = resolveRecoveredAmountForClaim(record, claim.husClaimId);
  if (approvedAmount > MONEY_EPSILON) {
    const approvedBuyerAmount = roundMoney(baseAllocation * Math.min(1, approvedAmount / Math.max(claim.requestedAmount, MONEY_EPSILON)));
    return roundMoney(Math.max(0, approvedBuyerAmount - recoveredAmount));
  }
  return baseAllocation;
}

function resolveClaimBuyerAllocationAmount(claim, personalIdentityNumber) {
  if (Array.isArray(claim.buyerAllocations) && claim.buyerAllocations.length > 0) {
    return roundMoney(
      claim.buyerAllocations
        .filter((allocation) => allocation.personalIdentityNumber === personalIdentityNumber)
        .reduce((sum, allocation) => sum + Number(allocation.requestedAmount || 0), 0)
    );
  }
  return 0;
}

function resolveApprovedAmountForClaim(record, husClaimId) {
  return roundMoney(
    record.decisions
      .filter((decision) => decision.husClaimId === husClaimId)
      .reduce((sum, decision) => sum + Number(decision.approvedAmount || 0), 0)
  );
}

function resolveRecoveredAmountForClaim(record, husClaimId) {
  const approvedAmount = resolveApprovedAmountForClaim(record, husClaimId);
  if (approvedAmount <= MONEY_EPSILON) {
    return 0;
  }
  const totalRecoveredAmount = roundMoney(
    record.recoveries.reduce((sum, recovery) => sum + Number(recovery.recoveryAmount || 0), 0)
  );
  if (totalRecoveredAmount <= MONEY_EPSILON) {
    return 0;
  }
  const totalApprovedAcrossCase = roundMoney(
    record.decisions.reduce((sum, decision) => sum + Number(decision.approvedAmount || 0), 0)
  );
  if (totalApprovedAcrossCase <= MONEY_EPSILON) {
    return 0;
  }
  return roundMoney(totalRecoveredAmount * (approvedAmount / totalApprovedAcrossCase));
}

function buildClaimBuyerDecisionAllocations(claimRecord, { approvedAmount, rejectedAmount }) {
  const requestedAmount = Math.max(Number(claimRecord.requestedAmount || 0), MONEY_EPSILON);
  return (claimRecord.buyerAllocations || []).map((allocation) => {
    const requestedBuyerAmount = roundMoney(Number(allocation.requestedAmount || 0));
    const weight = requestedBuyerAmount / requestedAmount;
    return {
      husCaseBuyerId: allocation.husCaseBuyerId,
      personalIdentityNumber: allocation.personalIdentityNumber,
      requestedAmount: requestedBuyerAmount,
      approvedAmount: roundMoney(approvedAmount * weight),
      rejectedAmount: roundMoney(rejectedAmount * weight)
    };
  });
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

function hasLockedClaimFields(record) {
  return record.claims.some((claim) => !["claim_rejected"].includes(claim.status));
}

function generateCaseReference(state, companyId, clock) {
  const count = (state.husCaseIdsByCompany.get(companyId) || []).length + 1;
  return `HUS-${todayDate(clock).slice(0, 4)}-${String(count).padStart(4, "0")}`;
}

function deadlineForPaymentDate(paidOn) {
  const year = Number(String(paidOn).slice(0, 4)) + 1;
  const deadline = new Date(Date.UTC(year, 0, 31));
  while (deadline.getUTCDay() === 0 || deadline.getUTCDay() === 6) {
    deadline.setUTCDate(deadline.getUTCDate() + 1);
  }
  return deadline.toISOString().slice(0, 10);
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

function resolveStaticHusRulePackByYear(ruleYear) {
  return HUS_RULE_PACKS.find((rulePack) => Number(rulePack.machineReadableRules?.ruleYear) === Number(ruleYear))
    || HUS_RULE_PACKS.at(-1);
}

function buildHusTransportProfile({ transportType }) {
  return transportType === "direct_api"
    ? {
        transportType,
        deliveryChannelCode: "direct_api",
        serializationFormatCode: "canonical_json",
        supportsOfficialSubmission: true
      }
    : transportType === "xml"
      ? {
          transportType,
          deliveryChannelCode: "signed_xml",
          serializationFormatCode: "xml",
          supportsOfficialSubmission: true
        }
      : {
          transportType,
          deliveryChannelCode: "legacy_json",
          serializationFormatCode: "json",
          supportsOfficialSubmission: false
        };
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


function createError(statusCode, error, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.error = error;
  return err;
}
