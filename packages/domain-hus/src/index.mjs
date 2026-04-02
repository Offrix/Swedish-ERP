import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";
import { createRulePackRegistry } from "../../rule-engine/src/index.mjs";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";
import { createConfiguredSecretStore } from "../../domain-core/src/secret-runtime.mjs";
import { applyDurableStateSnapshot, serializeDurableState } from "../../domain-core/src/state-snapshots.mjs";
import {
  normalizeOptionalPaymentReference as normalizeOptionalPaymentReferenceKernel,
  normalizeOptionalSwedishOrganizationNumber as normalizeOptionalSwedishOrganizationNumberKernel,
  normalizeRequiredSwedishIdentityNumber as normalizeRequiredSwedishIdentityNumberKernel
} from "../../domain-core/src/validation.mjs";

export const HUS_CASE_STATES = Object.freeze([
  "draft",
  "claim_ready",
  "claimed",
  "accepted",
  "partially_accepted",
  "rejected",
  "paid_out",
  "recovered",
  "written_off"
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
export const HUS_AUTHORITY_RECEIVABLE_STATUSES = Object.freeze([
  "submitted",
  "difference_pending",
  "cleared_for_payout",
  "settled",
  "partially_paid_out",
  "paid_out",
  "recovered",
  "written_off"
]);
export const HUS_CUSTOMER_RECEIVABLE_STATUSES = Object.freeze(["open", "written_off"]);
export const HUS_PAYOUT_SETTLEMENT_MODELS = Object.freeze(["bank_account", "tax_account"]);
export const HUS_RULEPACK_CODE = "RP-HUS-SE";
export const HUS_RULEPACK_VERSION = "se-hus-2026.1";
const HUS_SETTLEMENT_CLEARING_ACCOUNT = "1180";
const HUS_SKATTEVERKET_ACCOUNT = "2560";
const HUS_AUTHORITY_RECEIVABLE_ACCOUNT = "1590";
const HUS_CUSTOMER_RECEIVABLE_ACCOUNT = "1210";
const HUS_INTERNAL_WRITEOFF_ACCOUNT = "6900";
const HUS_BANK_ACCOUNT = "1110";
const HUS_TAX_ACCOUNT = "1120";

const HUS_RULE_PACKS = Object.freeze([
  Object.freeze({
    rulePackId: "hus-se-2025.1",
    rulePackCode: HUS_RULEPACK_CODE,
    domain: "hus",
    jurisdiction: "SE",
    effectiveFrom: "2025-01-01",
    effectiveTo: "2025-05-12",
    version: "se-hus-2025.1",
    checksum: "hus-se-2025.1",
    sourceSnapshotDate: "2026-04-01",
    semanticChangeSummary: "Swedish HUS baseline for payments made before the temporary ROT increase in 2025.",
    machineReadableRules: Object.freeze({
      ruleYear: 2025,
      annualCapAmount: 75000,
      rotAnnualCapAmount: 50000,
      rutAnnualCapAmount: 75000,
      rateWindowCode: "2025_standard",
      rotReductionRate: 0.3,
      rutReductionRate: 0.5,
      deadlineRollForwardWeekend: true
    }),
    humanReadableExplanation: Object.freeze([
      "ROT uses 30 percent for customer payments before 12 May 2025. RUT remains 50 percent."
    ]),
    officialSourceRefs: Object.freeze([
      "https://www.skatteverket.se/privat/fastigheterochbostad/rotarbeteochrutarbete.4.2e56d4ba1202f95012080002966.html",
      "https://www.skatteverket.se/foretag/skatterochavdrag/rotochrut/safungerarrotavdraget.4.2ef18e6a125660db8b080002709.html"
    ]),
    testVectors: Object.freeze([]),
    migrationNotes: Object.freeze([])
  }),
  Object.freeze({
    rulePackId: "hus-se-2025.2",
    rulePackCode: HUS_RULEPACK_CODE,
    domain: "hus",
    jurisdiction: "SE",
    effectiveFrom: "2025-05-12",
    effectiveTo: "2026-01-01",
    version: "se-hus-2025.2",
    checksum: "hus-se-2025.2",
    sourceSnapshotDate: "2026-04-01",
    semanticChangeSummary: "Swedish HUS baseline during the temporary ROT increase in 2025.",
    machineReadableRules: Object.freeze({
      ruleYear: 2025,
      annualCapAmount: 75000,
      rotAnnualCapAmount: 50000,
      rutAnnualCapAmount: 75000,
      rateWindowCode: "2025_temporary_rot_increase",
      rotReductionRate: 0.5,
      rutReductionRate: 0.5,
      deadlineRollForwardWeekend: true
    }),
    humanReadableExplanation: Object.freeze([
      "ROT uses 50 percent for finished work where the customer pays between 12 May 2025 and 31 December 2025. RUT remains 50 percent."
    ]),
    officialSourceRefs: Object.freeze([
      "https://www.skatteverket.se/privat/fastigheterochbostad/rotarbeteochrutarbete.4.2e56d4ba1202f95012080002966.html",
      "https://www.skatteverket.se/foretag/skatterochavdrag/rotochrut/safungerarrotavdraget.4.2ef18e6a125660db8b080002709.html"
    ]),
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
    sourceSnapshotDate: "2026-04-01",
    semanticChangeSummary: "Swedish HUS baseline for 2026 claims.",
    machineReadableRules: Object.freeze({
      ruleYear: 2026,
      annualCapAmount: 75000,
      rotAnnualCapAmount: 50000,
      rutAnnualCapAmount: 75000,
      rateWindowCode: "2026_standard",
      rotReductionRate: 0.3,
      rutReductionRate: 0.5,
      deadlineRollForwardWeekend: true
    }),
    humanReadableExplanation: Object.freeze([
      "ROT returns to 30 percent from 1 January 2026. RUT remains 50 percent."
    ]),
    officialSourceRefs: Object.freeze([
      "https://www.skatteverket.se/privat/fastigheterochbostad/rotarbeteochrutarbete.4.2e56d4ba1202f95012080002966.html",
      "https://www.skatteverket.se/foretag/skatterochavdrag/rotochrut/safungerarrotavdraget.4.2ef18e6a125660db8b080002709.html"
    ]),
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
  ruleRegistry = null,
  environmentMode = "test",
  env = process.env,
  secretRuntimeBridgeRunner = null,
  secretSealKey = null,
  secretStore = null
} = {}) {
  const rules = ruleRegistry || createRulePackRegistry({
    clock,
    seedRulePacks: HUS_RULE_PACKS
  });
  const husSecretStore =
    secretStore ||
    createConfiguredSecretStore({
      clock,
      env,
      bridgeRunner: secretRuntimeBridgeRunner || undefined,
      environmentMode,
      storeId: "hus",
      masterKey: secretSealKey || `swedish-erp-hus-seal:${environmentMode}`,
      activeKeyVersion: `hus:${environmentMode}:v1`
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
    husAuthorityReceivableStatuses: HUS_AUTHORITY_RECEIVABLE_STATUSES,
    husCustomerReceivableStatuses: HUS_CUSTOMER_RECEIVABLE_STATUSES,
    husPayoutSettlementModels: HUS_PAYOUT_SETTLEMENT_MODELS,
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
    listHusAuditEvents,
    exportDurableState,
    importDurableState,
    listSecretStorePostures: () => [husSecretStore.getSecurityPosture()]
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


  Object.defineProperty(engine, "__durableState", {
    value: state,
    enumerable: false
  });

  return engine;

  function exportDurableState() {
    return {
      ...serializeDurableState(
        {
          husCases: state.husCases,
          husCaseIdsByCompany: state.husCaseIdsByCompany,
          auditEvents: state.auditEvents
        },
        {
          customSerializers: {
            husCases: (records) => serializeHusCasesForPersistence(records, { secretStore: husSecretStore })
          }
        }
      ),
      secretStoreBundle: husSecretStore.exportSecretBundle()
    };
  }

  function importDurableState(snapshot) {
    applyDurableStateSnapshot(
      {
        husCases: state.husCases,
        husCaseIdsByCompany: state.husCaseIdsByCompany,
        auditEvents: state.auditEvents
      },
      snapshot,
      { preserveKeys: ["secretStoreBundle"] }
    );
    husSecretStore.importSecretBundle(snapshot?.secretStoreBundle);
    rehydratePersistedHusCases(state, { secretStore: husSecretStore });
    rebuildDerivedHusIndexes(state);
  }

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
      rulepackEffectiveFrom: rulePack.effectiveFrom,
      rulepackEffectiveTo: rulePack.effectiveTo,
      rulepackMachineReadableRules: copy(rulePack.machineReadableRules || {}),
      rulepackOfficialSourceRefs: [...(rulePack.officialSourceRefs || [])],
      rulepackRef: buildRulepackRef(rulePack),
      status: "draft",
      totalGrossAmount: 0,
      totalLaborCostInclVatAmount: 0,
      totalLaborCostExVatAmount: 0,
      totalVatAmount: 0,
      totalEligibleLaborAmount: 0,
      preliminaryReductionAmount: 0,
      customerShareAmount: 0,
      paidCustomerAmount: 0,
      outstandingCustomerShareAmount: 0,
      claimedAmountTotal: 0,
      approvedAmountTotal: 0,
      paidOutAmountTotal: 0,
      recoveredAmountTotal: 0,
      workDateRange: {
        from: workInterval.workCompletedFrom,
        to: workInterval.workCompletedTo,
        completedOn: workInterval.workCompletedOn
      },
      propertyProfile,
      propertyRef: buildPropertyRef(propertyProfile),
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
      claimReadyState: "draft",
      claimReadyAt: null,
      claimReadyRulepackRef: null,
      claimReadyEvidenceRefs: [],
      buyers: [],
      serviceLines: [],
      classificationDecisions: [],
      customerPayments: [],
      claims: [],
      decisions: [],
      decisionDifferences: [],
      authorityReceivables: [],
      customerReceivables: [],
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
      ruleYear: record.ruleYear,
      effectiveDate: record.workCompletedOn
    });
    const totals = summarizeServiceLines(normalizedLines, { effectiveDate: record.workCompletedOn });
    const normalizedBuyers = normalizeBuyers(
      record.husCaseId,
      buyers,
      totals.customerShareAmount,
      totals.preliminaryReductionAmount,
      nowIso(clock)
    );
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
    record.totalLaborCostInclVatAmount = totals.totalLaborCostInclVatAmount;
    record.totalLaborCostExVatAmount = totals.totalLaborCostExVatAmount;
    record.totalVatAmount = totals.totalVatAmount;
    record.totalEligibleLaborAmount = totals.totalEligibleLaborAmount;
    record.preliminaryReductionAmount = totals.preliminaryReductionAmount;
    record.customerShareAmount = totals.customerShareAmount;
    record.outstandingCustomerShareAmount = roundMoney(Math.max(0, record.customerShareAmount - record.paidCustomerAmount));
    refreshCaseDerivedState(record);
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
    refreshCaseDerivedState(record);
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
    const normalizedPaymentReference = normalizeOptionalPaymentReference(paymentReference, "hus_payment_reference_invalid");
    if (!normalizedPaymentReference && !normalizeOptionalText(externalTraceId)) {
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
      paymentReference: normalizedPaymentReference,
      externalTraceId: normalizeOptionalText(externalTraceId),
      evidenceStatus: "verified",
      claimCapacityAmount: 0,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    record.customerPayments.push(paymentRecord);
    refreshCaseDerivedState(record);
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
    claimRulepackId = null,
    transportType = "json",
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const record = requireHusCase(companyId, husCaseId);
    const readiness = buildClaimReadinessSnapshot(record, { claimRulepackId });
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
    const rulePack = resolveHusRegisteredRulePackById(readiness.activeRulepackRef?.rulepackId) || resolveHusRulePack({
      effectiveDate: record.workCompletedOn,
      ruleYear: record.ruleYear
    });
    const paymentAllocations = allocateClaimAmountAcrossPayments(record, resolvedRequestedAmount, {
      claimRulepackId: rulePack.rulePackId,
      resolvePaymentRulePack: resolveHusPaymentWindowRulePack
    });
    const buyerAllocations = allocateClaimAmountAcrossBuyers(state, record, resolvedRequestedAmount, {
      claimRulepackId: rulePack.rulePackId,
      paymentAllocations
    });
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
      claimReadyAt: record.claimReadyAt || nowIso(clock),
      claimReadyState: readiness.claimReadyState,
      claimRuleYear: rulePack.ruleYear,
      submittedOn: null,
      payloadHash: null,
      claimReadinessStatus: readiness.status,
      paymentAllocations,
      buyerAllocations,
      rulepackRef: buildRulepackRef(rulePack),
      claimReadyEvidenceRefs: [...(readiness.claimReadyEvidenceRefs || [])],
      transportProfile: buildHusTransportProfile({
        transportType: requireEnum(HUS_CLAIM_TRANSPORT_TYPES, transportType, "hus_claim_transport_invalid")
      }),
      versions: [],
      statusEvents: [],
      authorityReceivableId: null,
      submissionJournalEntryId: null,
      submissionAttemptRef: null,
      decisionRef: null,
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
        claimReadinessStatus: readiness.status,
        claimReadyAt: claimRecord.claimReadyAt,
        rulepackRef: claimRecord.rulepackRef
      },
      createdAt: nowIso(clock)
    });
    record.claims.push(claimRecord);
    state.husClaims.set(claimRecord.husClaimId, claimRecord);
    refreshCaseDerivedState(record);
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
      excludeClaimId: claimRecord.husClaimId,
      claimRulepackId: claimRecord.rulepackId
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
    claimRecord.payloadHash = latestVersion.payloadHash;
    const authorityReceivable = createHusAuthorityReceivable({
      record,
      claimRecord,
      submittedOn: resolvedSubmittedOn,
      actorId
    });
    const postedSubmission = maybePostHusClaimSubmissionToLedger({
      ledgerPlatform,
      record,
      claimRecord,
      authorityReceivable,
      submittedOn: resolvedSubmittedOn,
      actorId,
      correlationId
    });
    authorityReceivable.submissionJournalEntryId = postedSubmission?.journalEntry?.journalEntryId || null;
    authorityReceivable.updatedAt = nowIso(clock);
    authorityReceivable.reconciliationEntries.push(
      createHusReceivableReconciliationEntry({
        eventCode: "claim_submitted",
        eventDate: resolvedSubmittedOn,
        amount: claimRecord.requestedAmount,
        journalEntryId: authorityReceivable.submissionJournalEntryId,
        balanceAfterAmount: claimRecord.requestedAmount,
        actorId,
        note: `Submitted HUS claim ${claimRecord.husClaimId}.`
      })
    );
    claimRecord.authorityReceivableId = authorityReceivable.husAuthorityReceivableId;
    claimRecord.status = "claim_submitted";
    claimRecord.submittedOn = resolvedSubmittedOn;
    claimRecord.submissionJournalEntryId = authorityReceivable.submissionJournalEntryId;
    claimRecord.submissionAttemptRef = `hus-claim-submit:${claimRecord.husClaimId}:${resolvedSubmittedOn}`;
    claimRecord.updatedAt = nowIso(clock);
    claimRecord.statusEvents.push({
      husClaimStatusEventId: crypto.randomUUID(),
      eventCode: "claim_submitted",
      payloadJson: {
        submittedOn: resolvedSubmittedOn,
        payloadHash: claimRecord.payloadHash,
        authorityReceivableId: authorityReceivable.husAuthorityReceivableId,
        submissionJournalEntryId: claimRecord.submissionJournalEntryId
      },
      createdAt: nowIso(clock)
    });
    syncCaseAuthorityReceivable(record, authorityReceivable);
    refreshCaseDerivedState(record);
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
    const rulePack = resolveHusRegisteredRulePackById(claimRecord.rulepackId) || resolveHusRulePack({
      effectiveDate: claimRecord.submittedOn || record.workCompletedOn,
      ruleYear: record.ruleYear
    });
    if (!moneyEquals(roundMoney(resolvedApprovedAmount + resolvedRejectedAmount), claimRecord.requestedAmount)) {
      throw createError(409, "hus_decision_amount_mismatch", "Approved and rejected HUS decision amounts must reconcile to the requested amount.");
    }
    const authorityReceivable = requireHusAuthorityReceivableForClaim(record, claimRecord);
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
        resolutionJournalEntryId: null,
        husCustomerReceivableId: null,
        status: "open",
        createdByActorId: decision.createdByActorId,
        createdAt: nowIso(clock),
        resolvedAt: null
      };
      state.husDecisionDifferences.set(differenceRecord.husDecisionDifferenceId, differenceRecord);
      appendToIndex(state.husDecisionDifferenceIdsByCompany, record.companyId, differenceRecord.husDecisionDifferenceId);
      syncCaseDecisionDifference(record, differenceRecord);
    }
    if (resolvedRejectedAmount === 0) {
      claimRecord.status = "claim_accepted";
    } else if (resolvedApprovedAmount === 0) {
      claimRecord.status = "claim_rejected";
    } else {
      claimRecord.status = "claim_partially_accepted";
    }
    claimRecord.decisionRef = decision.husDecisionId;
    if (resolvedApprovedAmount > 0) {
      const postedDecision = maybePostHusDecisionToLedger({
        ledgerPlatform,
        record,
        claimRecord,
        authorityReceivable,
        decision,
        actorId,
        correlationId
      });
      decision.journalEntryId = postedDecision?.journalEntry?.journalEntryId || null;
    }
    authorityReceivable.approvedAmount = roundMoney(authorityReceivable.approvedAmount + resolvedApprovedAmount);
    authorityReceivable.rejectedAmount = roundMoney(authorityReceivable.rejectedAmount + resolvedRejectedAmount);
    authorityReceivable.outstandingAmount = roundMoney(Math.max(0, authorityReceivable.outstandingAmount - resolvedApprovedAmount));
    authorityReceivable.status = authorityReceivable.outstandingAmount > MONEY_EPSILON
      ? "difference_pending"
      : "cleared_for_payout";
    authorityReceivable.decisionJournalEntryId = decision.journalEntryId;
    authorityReceivable.updatedAt = nowIso(clock);
    authorityReceivable.reconciliationEntries.push(
      createHusReceivableReconciliationEntry({
        eventCode: claimRecord.status,
        eventDate: decision.decisionDate,
        amount: resolvedApprovedAmount,
        journalEntryId: decision.journalEntryId,
        balanceAfterAmount: authorityReceivable.outstandingAmount,
        actorId,
        note: `Decision ${decision.husDecisionId} approved ${resolvedApprovedAmount} and rejected ${resolvedRejectedAmount}.`
      })
    );
    syncCaseAuthorityReceivable(record, authorityReceivable);
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
    const husCase = requireHusCase(record.companyId, record.husCaseId);
    const claimRecord = requireHusClaim(record.companyId, record.husClaimId);
    const authorityReceivable = requireHusAuthorityReceivableForClaim(husCase, claimRecord);
    const resolvedResolutionCode = requireEnum(HUS_DECISION_RESOLUTION_CODES, resolutionCode, "hus_decision_resolution_code_invalid");
    record.status = "resolved";
    record.resolutionCode = resolvedResolutionCode;
    record.resolutionNote = normalizeOptionalText(resolutionNote);
    record.resolvedByActorId = requireText(actorId, "actor_id_required");
    record.resolvedAt = nowIso(clock);
    let customerReceivable = null;
    if (resolvedResolutionCode === "customer_reinvoice") {
      customerReceivable = createHusCustomerReceivable({
        husCase,
        claimRecord,
        differenceRecord: record,
        actorId
      });
    }
    const postedResolution = maybePostHusDecisionDifferenceToLedger({
      ledgerPlatform,
      record: husCase,
      claimRecord,
      differenceRecord: record,
      authorityReceivable,
      customerReceivable,
      actorId,
      correlationId
    });
    record.resolutionJournalEntryId = postedResolution?.journalEntry?.journalEntryId || null;
    if (customerReceivable) {
      customerReceivable.journalEntryId = record.resolutionJournalEntryId;
      customerReceivable.reconciliationEntries.push(
        createHusReceivableReconciliationEntry({
          eventCode: "customer_receivable_created",
          eventDate: record.resolvedAt.slice(0, 10),
          amount: customerReceivable.amount,
          journalEntryId: customerReceivable.journalEntryId,
          balanceAfterAmount: customerReceivable.outstandingAmount,
          actorId,
          note: `Created HUS customer receivable from difference ${record.husDecisionDifferenceId}.`
        })
      );
      syncCaseCustomerReceivable(husCase, customerReceivable);
      record.husCustomerReceivableId = customerReceivable.husCustomerReceivableId;
    }
    authorityReceivable.outstandingAmount = roundMoney(Math.max(0, authorityReceivable.outstandingAmount - record.rejectedAmount));
    authorityReceivable.status = authorityReceivable.outstandingAmount > MONEY_EPSILON
      ? "difference_pending"
      : (
          resolvedResolutionCode === "customer_reinvoice"
            ? (resolveApprovedAmountForClaim(husCase, claimRecord.husClaimId) > MONEY_EPSILON ? "cleared_for_payout" : "settled")
            : "written_off"
        );
    authorityReceivable.updatedAt = nowIso(clock);
    authorityReceivable.reconciliationEntries.push(
      createHusReceivableReconciliationEntry({
        eventCode: resolvedResolutionCode === "customer_reinvoice" ? "difference_customer_reinvoice" : "difference_written_off",
        eventDate: record.resolvedAt.slice(0, 10),
        amount: record.rejectedAmount,
        journalEntryId: record.resolutionJournalEntryId,
        balanceAfterAmount: authorityReceivable.outstandingAmount,
        actorId,
        note: `Resolved HUS decision difference ${record.husDecisionDifferenceId}.`
      })
    );
    syncCaseAuthorityReceivable(husCase, authorityReceivable);
    syncCaseDecisionDifference(husCase, record);
    refreshCaseDerivedState(husCase);
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
    settlementModelCode = "bank_account",
    settlementAccountNumber = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const claimRecord = requireHusClaim(companyId, husClaimId);
    if (!["claim_accepted", "claim_partially_accepted"].includes(claimRecord.status)) {
      throw createError(409, "hus_claim_not_payable", "Only accepted HUS claims can be paid out.");
    }
    const record = requireHusCase(companyId, claimRecord.husCaseId);
    if (hasOpenDecisionDifferencesForClaim(state, record, claimRecord.husClaimId)) {
      throw createError(409, "hus_claim_difference_unresolved", "Partial HUS decisions must resolve open decision differences before payout.");
    }
    const resolvedSettlementModelCode = requireEnum(
      HUS_PAYOUT_SETTLEMENT_MODELS,
      settlementModelCode,
      "hus_payout_settlement_model_invalid"
    );
    const payout = {
      husPayoutId: crypto.randomUUID(),
      husClaimId: claimRecord.husClaimId,
      payoutDate: normalizeRequiredDate(payoutDate, "hus_payout_date_required"),
      payoutAmount: normalizeMoney(payoutAmount, "hus_payout_amount_invalid"),
      settlementModelCode: resolvedSettlementModelCode,
      settlementAccountNumber: resolveHusPayoutSettlementAccountNumber({
        settlementModelCode: resolvedSettlementModelCode,
        settlementAccountNumber
      }),
      journalEntryId: null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    const priorPayoutAmount = sumAmounts(record.payouts.filter((item) => item.husClaimId === claimRecord.husClaimId), "payoutAmount");
    const approvedAmount = sumAmounts(record.decisions.filter((item) => item.husClaimId === claimRecord.husClaimId), "approvedAmount");
    if (payout.payoutAmount + priorPayoutAmount > approvedAmount + MONEY_EPSILON) {
      throw createError(409, "hus_payout_exceeds_approved_amount", "HUS payout exceeds the approved claim amount.");
    }
    record.payouts.push(payout);
    const postedPayout = maybePostHusPayoutToLedger({
      ledgerPlatform,
      record,
      claimRecord,
      payout,
      actorId,
      correlationId
    });
    payout.journalEntryId = postedPayout?.journalEntry?.journalEntryId || null;
    const authorityReceivable = requireHusAuthorityReceivableForClaim(record, claimRecord);
    authorityReceivable.payoutSettledAmount = roundMoney(authorityReceivable.payoutSettledAmount + payout.payoutAmount);
    authorityReceivable.status = authorityReceivable.payoutSettledAmount + MONEY_EPSILON >= authorityReceivable.approvedAmount
      ? "paid_out"
      : "partially_paid_out";
    authorityReceivable.updatedAt = nowIso(clock);
    authorityReceivable.reconciliationEntries.push(
      createHusReceivableReconciliationEntry({
        eventCode: "payout_settled",
        eventDate: payout.payoutDate,
        amount: payout.payoutAmount,
        journalEntryId: payout.journalEntryId,
        balanceAfterAmount: authorityReceivable.outstandingAmount,
        actorId,
        note: `Settled HUS payout ${payout.husPayoutId} via ${payout.settlementModelCode}.`
      })
    );
    syncCaseAuthorityReceivable(record, authorityReceivable);
    claimRecord.status = "paid_out";
    claimRecord.updatedAt = nowIso(clock);
    claimRecord.statusEvents.push({
      husClaimStatusEventId: crypto.randomUUID(),
      eventCode: "paid_out",
      payloadJson: {
        payoutAmount: payout.payoutAmount,
        payoutDate: payout.payoutDate,
        settlementModelCode: payout.settlementModelCode,
        journalEntryId: payout.journalEntryId
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
      state.husRecoveryCandidates.set(recoveryCandidate.husRecoveryCandidateId, recoveryCandidate);
      appendToIndex(state.husRecoveryCandidateIdsByCompany, record.companyId, recoveryCandidate.husRecoveryCandidateId);
      syncCaseRecoveryCandidate(record, recoveryCandidate);
    }
    refreshCaseDerivedState(record);
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
      : findOpenRecoveryCandidate(state, record);
    if (!recoveryCandidate || recoveryCandidate.husCaseId !== record.husCaseId || recoveryCandidate.status !== "open") {
      throw createError(409, "hus_recovery_candidate_missing", "An open HUS recovery candidate is required before recovery can be recorded.");
    }
    if (recoveryAmountValue > recoveryCandidate.differenceAmount + MONEY_EPSILON) {
      throw createError(409, "hus_recovery_exceeds_difference", "Recorded HUS recovery exceeds the candidate difference amount.");
    }
    const claimRecord = findClaimByRecoveryCandidate(record, recoveryCandidate);
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
    if (claimRecord?.authorityReceivableId) {
      const authorityReceivable = requireHusAuthorityReceivableForClaim(record, claimRecord);
      authorityReceivable.recoveredAmount = roundMoney(authorityReceivable.recoveredAmount + recoveryAmountValue);
      authorityReceivable.status = "recovered";
      authorityReceivable.updatedAt = nowIso(clock);
      authorityReceivable.reconciliationEntries.push(
        createHusReceivableReconciliationEntry({
          eventCode: "recovery_recorded",
          eventDate: recovery.recoveryDate,
          amount: recovery.recoveryAmount,
          journalEntryId: recovery.journalEntryId,
          balanceAfterAmount: authorityReceivable.outstandingAmount,
          actorId,
          note: `Recorded HUS recovery ${recovery.husRecoveryId}.`
        })
      );
      syncCaseAuthorityReceivable(record, authorityReceivable);
    }
    recoveryCandidate.status = recoveryAmountValue >= recoveryCandidate.differenceAmount - MONEY_EPSILON ? "recovered" : "open";
    recoveryCandidate.resolvedAt = recoveryCandidate.status === "recovered" ? nowIso(clock) : null;
    recoveryCandidate.resolutionCode = recoveryCandidate.status === "recovered" ? "recovered" : null;
    syncCaseRecoveryCandidate(record, recoveryCandidate);
    refreshCaseDerivedState(record);
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

  function resolveHusRegisteredRulePackById(rulePackId) {
    const resolvedRulePackId = normalizeOptionalText(rulePackId);
    if (!resolvedRulePackId) {
      return null;
    }
    return resolveStaticHusRulePackById(resolvedRulePackId) || rules.getRulePack({
      rulePackId: resolvedRulePackId,
      required: false
    }) || null;
  }

  function resolveHusPaymentWindowRulePack(record, effectiveDate) {
    const resolvedDate = normalizeOptionalDate(
      effectiveDate,
      "hus_rulepack_effective_date_invalid"
    ) || determineDefaultHusFinancialEffectiveDate(record);
    const datedRulePack = resolveHusRulePack({
      effectiveDate: resolvedDate
    });
    const persistedRulePack = buildPersistedHusRulePack(record);
    if (!persistedRulePack) {
      return datedRulePack;
    }
    const effectiveYear = Number(String(resolvedDate).slice(0, 4));
    const datedRuleYear = Number(
      datedRulePack.machineReadableRules?.ruleYear || String(datedRulePack.effectiveFrom).slice(0, 4)
    );
    const persistedRuleYear = Number(
      persistedRulePack.machineReadableRules?.ruleYear || String(persistedRulePack.effectiveFrom).slice(0, 4)
    );
    return datedRuleYear < effectiveYear && persistedRuleYear >= effectiveYear
      ? persistedRulePack
      : datedRulePack;
  }

  function serializeHusCasesForPersistence(records, { secretStore } = {}) {
    if (!(records instanceof Map)) {
      return new Map();
    }
    const serialized = new Map();
    for (const [husCaseId, record] of records.entries()) {
      serialized.set(husCaseId, sanitizePersistedHusCase(record, { secretStore }));
    }
    return serialized;
  }

  function sanitizePersistedHusCase(record, { secretStore } = {}) {
    const sanitizedBuyers = (record.buyers || []).map((buyer) =>
      sanitizePersistedHusBuyer(buyer, {
        secretStore,
        companyId: record.companyId,
        husCaseId: record.husCaseId
      })
    );
    const buyersById = new Map(sanitizedBuyers.map((buyer) => [buyer.husCaseBuyerId, buyer]));
    return {
      ...copy(record),
      buyers: sanitizedBuyers,
      claims: (record.claims || []).map((claim) => sanitizePersistedHusClaim(claim, { buyersById })),
      decisions: (record.decisions || []).map((decision) => sanitizePersistedHusDecision(decision, { buyersById })),
      decisionDifferences: (record.decisionDifferences || []).map(copy),
      authorityReceivables: (record.authorityReceivables || []).map(copy),
      customerReceivables: (record.customerReceivables || []).map(copy),
      payouts: (record.payouts || []).map(copy),
      recoveries: (record.recoveries || []).map(copy),
      recoveryCandidates: (record.recoveryCandidates || []).map(copy),
      creditAdjustments: (record.creditAdjustments || []).map(copy)
    };
  }

  function sanitizePersistedHusBuyer(buyer, { secretStore, companyId, husCaseId } = {}) {
    const identityNumber = normalizeOptionalText(buyer?.personalIdentityNumber);
    if (!identityNumber || !secretStore?.storeSecretMaterial) {
      return copy(buyer);
    }
    const maskedValue = maskIdentityNumber(identityNumber);
    const buyerIdentityRef = buildHusBuyerIdentityRef(husCaseId, buyer.husCaseBuyerId);
    const lookupDigest = secretStore.createBlindIndex({
      value: `${companyId}:${identityNumber}`,
      purpose: "hus_buyer_identity_lookup"
    }).digest;
    const secretMeta = secretStore.storeSecretMaterial({
      secretId: buyerIdentityRef,
      classCode: "S3",
      material: {
        personalIdentityNumber: identityNumber
      },
      owner: {
        domainKey: "hus",
        companyId,
        husCaseId,
        husCaseBuyerId: buyer.husCaseBuyerId,
        objectType: "hus_buyer_identity"
      },
      maskedValue,
      blindIndexInputs: [
        {
          purpose: "hus_buyer_identity_lookup",
          value: `${companyId}:${identityNumber}`
        }
      ],
      fingerprintPurpose: "hus_buyer_identity"
    });
    return {
      ...copy(buyer),
      personalIdentityNumber: secretMeta.maskedValue,
      buyerIdentityRef,
      buyerIdentityMaskedValue: secretMeta.maskedValue,
      personalIdentitySecretRef: secretMeta.secretRef,
      personalIdentityMaskedValue: secretMeta.maskedValue,
      personalIdentityFingerprint: secretMeta.fingerprint,
      personalIdentityLookupDigest: lookupDigest
    };
  }

  function sanitizePersistedHusClaim(claim, { buyersById } = {}) {
    return {
      ...copy(claim),
      buyerAllocations: (claim.buyerAllocations || []).map((allocation) =>
        sanitizePersistedHusBuyerLinkedRecord(allocation, { buyersById })
      ),
      versions: (claim.versions || []).map((version) => sanitizePersistedHusClaimVersion(version, { buyersById })),
      statusEvents: (claim.statusEvents || []).map(copy)
    };
  }

  function sanitizePersistedHusClaimVersion(version, { buyersById } = {}) {
    return {
      ...copy(version),
      payloadJson: sanitizePersistedHusClaimPayload(version.payloadJson, { buyersById })
    };
  }

  function sanitizePersistedHusClaimPayload(payload, { buyersById } = {}) {
    if (!payload || typeof payload !== "object") {
      return payload;
    }
    return {
      ...copy(payload),
      buyers: (payload.buyers || []).map((buyer) => sanitizePersistedHusBuyerLinkedRecord(buyer, { buyersById })),
      buyerAllocations: (payload.buyerAllocations || []).map((allocation) =>
        sanitizePersistedHusBuyerLinkedRecord(allocation, { buyersById })
      ),
      buyerCapacities: (payload.buyerCapacities || []).map((capacity) =>
        sanitizePersistedHusBuyerLinkedRecord(capacity, { buyersById })
      )
    };
  }

  function sanitizePersistedHusDecision(decision, { buyersById } = {}) {
    return {
      ...copy(decision),
      buyerOutcomeAllocations: (decision.buyerOutcomeAllocations || []).map((allocation) =>
        sanitizePersistedHusBuyerLinkedRecord(allocation, { buyersById })
      )
    };
  }

  function sanitizePersistedHusBuyerLinkedRecord(record, { buyersById } = {}) {
    if (!record || typeof record !== "object") {
      return record;
    }
    const persistedBuyer = resolvePersistedHusBuyerById(buyersById, record.husCaseBuyerId);
    const maskedIdentity =
      persistedBuyer?.personalIdentityMaskedValue
      || persistedBuyer?.personalIdentityNumber
      || maskIdentityNumber(record.personalIdentityNumber);
    return {
      ...copy(record),
      personalIdentityNumber: maskedIdentity,
      buyerIdentityRef: persistedBuyer?.buyerIdentityRef || record?.buyerIdentityRef || null,
      buyerIdentityMaskedValue: persistedBuyer?.buyerIdentityMaskedValue || maskedIdentity
    };
  }

  function rehydratePersistedHusCases(targetState, { secretStore } = {}) {
    for (const [husCaseId, record] of targetState.husCases.entries()) {
      targetState.husCases.set(husCaseId, rehydratePersistedHusCase(record, { secretStore }));
    }
  }

  function rehydratePersistedHusCase(record, { secretStore } = {}) {
    const rehydratedBuyers = (record.buyers || []).map((buyer) => rehydratePersistedHusBuyer(buyer, { secretStore }));
    const buyersById = new Map(rehydratedBuyers.map((buyer) => [buyer.husCaseBuyerId, buyer]));
    return {
      ...copy(record),
      buyers: rehydratedBuyers,
      claims: (record.claims || []).map((claim) => rehydratePersistedHusClaim(claim, { buyersById })),
      decisions: (record.decisions || []).map((decision) => rehydratePersistedHusDecision(decision, { buyersById })),
      decisionDifferences: (record.decisionDifferences || []).map(copy),
      authorityReceivables: (record.authorityReceivables || []).map(copy),
      customerReceivables: (record.customerReceivables || []).map(copy),
      payouts: (record.payouts || []).map(copy),
      recoveries: (record.recoveries || []).map(copy),
      recoveryCandidates: (record.recoveryCandidates || []).map(copy),
      creditAdjustments: (record.creditAdjustments || []).map(copy)
    };
  }

  function rehydratePersistedHusBuyer(buyer, { secretStore } = {}) {
    const nextBuyer = copy(buyer);
    const secretRef = normalizeOptionalText(buyer?.personalIdentitySecretRef);
    if (!secretRef || !secretStore?.hasSecretMaterial?.({ secretId: secretRef })) {
      return nextBuyer;
    }
    const secretValue = secretStore.readSecretMaterial({
      secretId: secretRef,
      parse: true
    });
    nextBuyer.personalIdentityNumber = normalizeIdentityNumber(
      secretValue?.personalIdentityNumber,
      "hus_buyer_identity_required"
    );
    nextBuyer.buyerIdentityRef = nextBuyer.buyerIdentityRef || secretRef;
    nextBuyer.buyerIdentityMaskedValue = nextBuyer.personalIdentityMaskedValue || maskIdentityNumber(nextBuyer.personalIdentityNumber);
    delete nextBuyer.personalIdentitySecretRef;
    delete nextBuyer.personalIdentityMaskedValue;
    delete nextBuyer.personalIdentityFingerprint;
    delete nextBuyer.personalIdentityLookupDigest;
    return nextBuyer;
  }

  function rehydratePersistedHusClaim(claim, { buyersById } = {}) {
    return {
      ...copy(claim),
      buyerAllocations: (claim.buyerAllocations || []).map((allocation) =>
        rehydratePersistedHusBuyerLinkedRecord(allocation, { buyersById })
      ),
      versions: (claim.versions || []).map((version) => rehydratePersistedHusClaimVersion(version, { buyersById })),
      statusEvents: (claim.statusEvents || []).map(copy)
    };
  }

  function rehydratePersistedHusClaimVersion(version, { buyersById } = {}) {
    return {
      ...copy(version),
      payloadJson: rehydratePersistedHusClaimPayload(version.payloadJson, { buyersById })
    };
  }

  function rehydratePersistedHusClaimPayload(payload, { buyersById } = {}) {
    if (!payload || typeof payload !== "object") {
      return payload;
    }
    return {
      ...copy(payload),
      buyers: (payload.buyers || []).map((buyer) => rehydratePersistedHusBuyerLinkedRecord(buyer, { buyersById })),
      buyerAllocations: (payload.buyerAllocations || []).map((allocation) =>
        rehydratePersistedHusBuyerLinkedRecord(allocation, { buyersById })
      ),
      buyerCapacities: (payload.buyerCapacities || []).map((capacity) =>
        rehydratePersistedHusBuyerLinkedRecord(capacity, { buyersById })
      )
    };
  }

  function rehydratePersistedHusDecision(decision, { buyersById } = {}) {
    return {
      ...copy(decision),
      buyerOutcomeAllocations: (decision.buyerOutcomeAllocations || []).map((allocation) =>
        rehydratePersistedHusBuyerLinkedRecord(allocation, { buyersById })
      )
    };
  }

  function rehydratePersistedHusBuyerLinkedRecord(record, { buyersById } = {}) {
    if (!record || typeof record !== "object") {
      return record;
    }
    const buyer = resolvePersistedHusBuyerById(buyersById, record.husCaseBuyerId);
    if (!buyer?.personalIdentityNumber) {
      return copy(record);
    }
    return {
      ...copy(record),
      personalIdentityNumber: buyer.personalIdentityNumber,
      buyerIdentityRef: buyer.buyerIdentityRef || record?.buyerIdentityRef || null,
      buyerIdentityMaskedValue: buyer.buyerIdentityMaskedValue || maskIdentityNumber(buyer.personalIdentityNumber)
    };
  }

  function rebuildDerivedHusIndexes(targetState) {
    targetState.husCaseIdsByCompany.clear();
    targetState.husClaims.clear();
    targetState.husDecisionDifferences.clear();
    targetState.husDecisionDifferenceIdsByCompany.clear();
    targetState.husRecoveryCandidates.clear();
    targetState.husRecoveryCandidateIdsByCompany.clear();

    for (const [husCaseId, record] of targetState.husCases.entries()) {
      appendToIndex(targetState.husCaseIdsByCompany, record.companyId, husCaseId);
      for (const claim of record.claims || []) {
        targetState.husClaims.set(claim.husClaimId, claim);
      }
      for (const differenceRecord of record.decisionDifferences || []) {
        targetState.husDecisionDifferences.set(differenceRecord.husDecisionDifferenceId, differenceRecord);
        appendToIndex(
          targetState.husDecisionDifferenceIdsByCompany,
          record.companyId,
          differenceRecord.husDecisionDifferenceId
        );
      }
      for (const recoveryCandidate of record.recoveryCandidates || []) {
        targetState.husRecoveryCandidates.set(recoveryCandidate.husRecoveryCandidateId, recoveryCandidate);
        appendToIndex(
          targetState.husRecoveryCandidateIdsByCompany,
          record.companyId,
          recoveryCandidate.husRecoveryCandidateId
        );
      }
    }
  }

  function resolvePersistedHusBuyerById(buyersById, husCaseBuyerId) {
    if (!(buyersById instanceof Map)) {
      return null;
    }
    const resolvedBuyerId = normalizeOptionalText(husCaseBuyerId);
    return resolvedBuyerId ? buyersById.get(resolvedBuyerId) || null : null;
  }

  function maskIdentityNumber(value) {
    const normalized = normalizeOptionalText(value);
    if (!normalized) {
      return null;
    }
    if (normalized.length <= 4) {
      return `****${normalized}`;
    }
    return `${"*".repeat(normalized.length - 4)}${normalized.slice(-4)}`;
  }

  function projectHusCase(record) {
    return copy({
      ...record,
      claimReadiness: buildClaimReadinessSnapshot(record)
    });
  }

  function maybePostHusClaimSubmissionToLedger({
    ledgerPlatform,
    record,
    claimRecord,
    authorityReceivable,
    submittedOn,
    actorId,
    correlationId
  } = {}) {
    if (!ledgerPlatform || typeof ledgerPlatform.applyPostingIntent !== "function") {
      return null;
    }
    ensureHusVoucherSeries({
      ledgerPlatform,
      companyId: record.companyId,
      seriesCode: "B",
      description: "HUS claim lifecycle",
      actorId
    });
    return ledgerPlatform.applyPostingIntent({
      companyId: record.companyId,
      journalDate: submittedOn,
      recipeCode: "HUS_CLAIM_SUBMITTED",
      postingSignalCode: "hus.claim.submitted",
      sourceType: "ROT_RUT_CLAIM",
      sourceId: claimRecord.husClaimId,
      sourceObjectVersion: `hus-claim-submission:${claimRecord.husClaimId}:${submittedOn}`,
      actorId,
      correlationId,
      idempotencyKey: `hus-claim-submission-posting:${claimRecord.husClaimId}`,
      description: `HUS claim ${claimRecord.versionNo} submitted`,
      metadataJson: buildHusPostingMetadata({
        record,
        claimRecord,
        rulepackId: claimRecord.rulepackId,
        rulepackCode: claimRecord.rulepackCode,
        rulepackVersion: claimRecord.rulepackVersion,
        rulepackChecksum: claimRecord.rulepackChecksum,
        claimPayloadHash: claimRecord.payloadHash,
        submissionAmount: claimRecord.requestedAmount,
        authorityReceivableId: authorityReceivable.husAuthorityReceivableId
      }),
      lines: [
        createHusJournalLine(HUS_AUTHORITY_RECEIVABLE_ACCOUNT, 1, claimRecord.requestedAmount, 0, record, { ledgerPlatform }),
        createHusJournalLine(HUS_SKATTEVERKET_ACCOUNT, 2, 0, claimRecord.requestedAmount, record, { ledgerPlatform })
      ]
    });
  }

  function maybePostHusDecisionToLedger({
    ledgerPlatform,
    record,
    claimRecord,
    authorityReceivable,
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
        rejectedAmount: decision.rejectedAmount,
        authorityReceivableId: authorityReceivable?.husAuthorityReceivableId || claimRecord.authorityReceivableId || null
      }),
      lines: [
        createHusJournalLine(HUS_SETTLEMENT_CLEARING_ACCOUNT, 1, decision.approvedAmount, 0, record, { ledgerPlatform }),
        createHusJournalLine(HUS_AUTHORITY_RECEIVABLE_ACCOUNT, 2, 0, decision.approvedAmount, record, { ledgerPlatform })
      ]
    });
  }

  function maybePostHusDecisionDifferenceToLedger({
    ledgerPlatform,
    record,
    claimRecord,
    differenceRecord,
    authorityReceivable,
    customerReceivable = null,
    actorId,
    correlationId
  } = {}) {
    if (!ledgerPlatform || typeof ledgerPlatform.applyPostingIntent !== "function") {
      return null;
    }
    const isCustomerReceivable = differenceRecord.resolutionCode === "customer_reinvoice";
    ensureHusVoucherSeries({
      ledgerPlatform,
      companyId: record.companyId,
      seriesCode: "V",
      description: "HUS difference adjustments",
      actorId
    });
    return ledgerPlatform.applyPostingIntent({
      companyId: record.companyId,
      journalDate: String(differenceRecord.resolvedAt || nowIso(clock)).slice(0, 10),
      recipeCode: isCustomerReceivable
        ? "HUS_CLAIM_DIFFERENCE_CUSTOMER_RECEIVABLE"
        : "HUS_CLAIM_DIFFERENCE_WRITEOFF",
      postingSignalCode: isCustomerReceivable
        ? "hus.claim.difference.customer_reinvoice"
        : "hus.claim.difference.written_off",
      sourceType: "ROT_RUT_CLAIM",
      sourceId: differenceRecord.husDecisionDifferenceId,
      sourceObjectVersion: `hus-difference-resolution:${differenceRecord.husDecisionDifferenceId}:${differenceRecord.resolutionCode}`,
      actorId,
      correlationId,
      idempotencyKey: `hus-difference-posting:${differenceRecord.husDecisionDifferenceId}`,
      description: `HUS difference ${differenceRecord.husDecisionDifferenceId} resolved`,
      metadataJson: buildHusPostingMetadata({
        record,
        claimRecord,
        rulepackId: claimRecord.rulepackId,
        rulepackCode: claimRecord.rulepackCode,
        rulepackVersion: claimRecord.rulepackVersion,
        rulepackChecksum: claimRecord.rulepackChecksum,
        differenceAmount: differenceRecord.rejectedAmount,
        differenceResolutionCode: differenceRecord.resolutionCode,
        authorityReceivableId: authorityReceivable?.husAuthorityReceivableId || null,
        customerReceivableId: customerReceivable?.husCustomerReceivableId || null
      }),
      lines: [
        createHusJournalLine(
          isCustomerReceivable ? HUS_CUSTOMER_RECEIVABLE_ACCOUNT : HUS_INTERNAL_WRITEOFF_ACCOUNT,
          1,
          differenceRecord.rejectedAmount,
          0,
          record,
          { ledgerPlatform }
        ),
        createHusJournalLine(HUS_AUTHORITY_RECEIVABLE_ACCOUNT, 2, 0, differenceRecord.rejectedAmount, record, { ledgerPlatform })
      ]
    });
  }

  function maybePostHusPayoutToLedger({
    ledgerPlatform,
    record,
    claimRecord,
    payout,
    actorId,
    correlationId
  } = {}) {
    if (!ledgerPlatform || typeof ledgerPlatform.applyPostingIntent !== "function") {
      return null;
    }
    ensureHusVoucherSeries({
      ledgerPlatform,
      companyId: record.companyId,
      seriesCode: "B",
      description: "HUS payout settlement",
      actorId
    });
    return ledgerPlatform.applyPostingIntent({
      companyId: record.companyId,
      journalDate: payout.payoutDate,
      recipeCode: "HUS_PAYOUT_SETTLED",
      postingSignalCode: "hus.payout.settled",
      sourceType: "ROT_RUT_CLAIM",
      sourceId: payout.husPayoutId,
      sourceObjectVersion: `hus-payout:${payout.husPayoutId}`,
      actorId,
      correlationId,
      idempotencyKey: `hus-payout-posting:${payout.husPayoutId}`,
      description: `HUS payout ${record.caseReference}`,
      metadataJson: buildHusPostingMetadata({
        record,
        claimRecord,
        rulepackId: claimRecord.rulepackId,
        rulepackCode: claimRecord.rulepackCode,
        rulepackVersion: claimRecord.rulepackVersion,
        rulepackChecksum: claimRecord.rulepackChecksum,
        payoutAmount: payout.payoutAmount,
        authorityReceivableId: claimRecord.authorityReceivableId,
        settlementModelCode: payout.settlementModelCode,
        settlementAccountNumber: payout.settlementAccountNumber
      }),
      lines: [
        createHusJournalLine(payout.settlementAccountNumber, 1, payout.payoutAmount, 0, record, { ledgerPlatform }),
        createHusJournalLine(HUS_SETTLEMENT_CLEARING_ACCOUNT, 2, 0, payout.payoutAmount, record, { ledgerPlatform })
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
    const claimRecord = findClaimByRecoveryCandidate(record, recoveryCandidate);
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
        claimRecord,
        rulepackId: record.rulepackId,
        rulepackCode: record.rulepackCode,
        rulepackVersion: record.rulepackVersion,
        rulepackChecksum: record.rulepackChecksum,
        recoveryAmount: recovery.recoveryAmount,
        recoveryCandidateId: recoveryCandidate.husRecoveryCandidateId,
        authorityReceivableId: claimRecord?.authorityReceivableId || null
      }),
      lines: [
        createHusJournalLine(HUS_AUTHORITY_RECEIVABLE_ACCOUNT, 1, recovery.recoveryAmount, 0, record, { ledgerPlatform }),
        createHusJournalLine(HUS_SETTLEMENT_CLEARING_ACCOUNT, 2, 0, recovery.recoveryAmount, record, { ledgerPlatform })
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
    submissionAmount = null,
    approvedAmount = null,
    rejectedAmount = null,
    differenceAmount = null,
    differenceResolutionCode = null,
    payoutAmount = null,
    recoveryAmount = null,
    recoveryCandidateId = null,
    authorityReceivableId = null,
    customerReceivableId = null,
    settlementModelCode = null,
    settlementAccountNumber = null
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
      submissionAmount: normalizeOptionalMoney(submissionAmount, "hus_posting_submission_amount_invalid"),
      approvedAmount: normalizeOptionalMoney(approvedAmount, "hus_posting_approved_amount_invalid"),
      rejectedAmount: normalizeOptionalMoney(rejectedAmount, "hus_posting_rejected_amount_invalid"),
      differenceAmount: normalizeOptionalMoney(differenceAmount, "hus_posting_difference_amount_invalid"),
      differenceResolutionCode: normalizeOptionalText(differenceResolutionCode),
      payoutAmount: normalizeOptionalMoney(payoutAmount, "hus_posting_payout_amount_invalid"),
      recoveryAmount: normalizeOptionalMoney(recoveryAmount, "hus_posting_recovery_amount_invalid"),
      recoveryCandidateId: normalizeOptionalText(recoveryCandidateId),
      authorityReceivableId: normalizeOptionalText(authorityReceivableId),
      customerReceivableId: normalizeOptionalText(customerReceivableId),
      settlementModelCode: normalizeOptionalText(settlementModelCode),
      settlementAccountNumber: normalizeOptionalText(settlementAccountNumber),
      propertyDesignation: record.propertyProfile?.propertyDesignation || null,
      housingFormCode: record.propertyProfile?.housingFormCode || null
    };
  }

  function createHusJournalLine(accountNumber, lineNumber, debitAmount, creditAmount, record, options = null) {
    const dimensionJson = resolveHusJournalDimensions(record, options);
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

  function resolveHusJournalDimensions(record, options = null) {
    const includeProjectDimension = options?.includeProjectDimension !== false;
    if (!includeProjectDimension || !record.projectId) {
      return null;
    }
    const ledgerPlatform = options?.ledgerPlatform || null;
    if (!ledgerPlatform || typeof ledgerPlatform.listLedgerDimensions !== "function") {
      return { projectId: record.projectId };
    }
    try {
      const dimensionCatalog = ledgerPlatform.listLedgerDimensions({
        companyId: record.companyId
      });
      const projectValue = (dimensionCatalog?.projects || []).find(
        (candidate) => candidate.code === record.projectId && candidate.status === "active"
      );
      return projectValue ? { projectId: record.projectId } : null;
    } catch {
      return null;
    }
  }

  function createHusAuthorityReceivable({
    record,
    claimRecord,
    submittedOn,
    actorId
  } = {}) {
    return {
      husAuthorityReceivableId: crypto.randomUUID(),
      companyId: record.companyId,
      husCaseId: record.husCaseId,
      husClaimId: claimRecord.husClaimId,
      rulepackRef: copy(claimRecord.rulepackRef || record.rulepackRef),
      submittedOn,
      originalAmount: claimRecord.requestedAmount,
      outstandingAmount: claimRecord.requestedAmount,
      approvedAmount: 0,
      rejectedAmount: 0,
      payoutSettledAmount: 0,
      recoveredAmount: 0,
      submissionJournalEntryId: null,
      decisionJournalEntryId: null,
      status: "submitted",
      reconciliationEntries: [],
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
  }

  function createHusCustomerReceivable({
    husCase,
    claimRecord,
    differenceRecord,
    actorId
  } = {}) {
    return {
      husCustomerReceivableId: crypto.randomUUID(),
      companyId: husCase.companyId,
      husCaseId: husCase.husCaseId,
      husClaimId: claimRecord.husClaimId,
      husDecisionDifferenceId: differenceRecord.husDecisionDifferenceId,
      status: "open",
      amount: differenceRecord.rejectedAmount,
      outstandingAmount: differenceRecord.rejectedAmount,
      journalEntryId: null,
      resolutionCode: differenceRecord.resolutionCode,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock),
      reconciliationEntries: []
    };
  }

  function createHusReceivableReconciliationEntry({
    eventCode,
    eventDate,
    amount,
    journalEntryId = null,
    balanceAfterAmount = null,
    actorId,
    note = null
  } = {}) {
    return {
      husReceivableReconciliationEntryId: crypto.randomUUID(),
      eventCode: requireText(eventCode, "hus_reconciliation_event_code_required"),
      eventDate: normalizeRequiredDate(eventDate, "hus_reconciliation_event_date_required"),
      amount: normalizeOptionalMoney(amount, "hus_reconciliation_amount_invalid"),
      journalEntryId: normalizeOptionalText(journalEntryId),
      balanceAfterAmount: normalizeOptionalMoney(balanceAfterAmount, "hus_reconciliation_balance_amount_invalid"),
      actorId: requireText(actorId, "actor_id_required"),
      note: normalizeOptionalText(note),
      createdAt: nowIso(clock)
    };
  }

  function resolveHusPayoutSettlementAccountNumber({
    settlementModelCode,
    settlementAccountNumber = null
  } = {}) {
    if (settlementAccountNumber) {
      return normalizeUpperCode(settlementAccountNumber, "hus_payout_settlement_account_required", 4);
    }
    return settlementModelCode === "tax_account" ? HUS_TAX_ACCOUNT : HUS_BANK_ACCOUNT;
  }

  function requireHusAuthorityReceivableForClaim(record, claimRecord) {
    const authorityReceivable = (record.authorityReceivables || []).find(
      (candidate) =>
        candidate.husAuthorityReceivableId === claimRecord.authorityReceivableId
        || candidate.husClaimId === claimRecord.husClaimId
    );
    if (!authorityReceivable) {
      throw createError(409, "hus_authority_receivable_missing", "The HUS claim is missing its authority receivable.");
    }
    return authorityReceivable;
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

  function buildPaymentWindowSummaries(paymentCapacities, resolvedAsOfDate) {
    const windows = new Map();
    for (const paymentCapacity of paymentCapacities) {
      const key = paymentCapacity.rulepackId;
      if (!windows.has(key)) {
        windows.set(key, {
          rulepackId: paymentCapacity.rulepackId,
          rulepackCode: paymentCapacity.rulepackCode,
          rulepackVersion: paymentCapacity.rulepackVersion,
          rulepackChecksum: paymentCapacity.rulepackChecksum,
          rulepackRef: paymentCapacity.rulepackRef,
          claimRuleYear: paymentCapacity.claimRuleYear,
          reductionRate: paymentCapacity.reductionRate,
          remainingReductionAmount: 0,
          expiredReductionAmount: 0,
          paymentEvidenceRefs: []
        });
      }
      const summary = windows.get(key);
      if (resolvedAsOfDate <= paymentCapacity.latestAllowedSubmissionDate) {
        summary.remainingReductionAmount = roundMoney(summary.remainingReductionAmount + paymentCapacity.remainingReductionAmount);
      } else {
        summary.expiredReductionAmount = roundMoney(summary.expiredReductionAmount + paymentCapacity.remainingReductionAmount);
      }
      summary.paymentEvidenceRefs = uniqueTexts([
        ...summary.paymentEvidenceRefs,
        paymentCapacity.paymentEvidenceRef
      ]);
    }
    return [...windows.values()]
      .sort((left, right) => String(left.rulepackRef?.effectiveFrom || "").localeCompare(String(right.rulepackRef?.effectiveFrom || "")));
  }

  function resolveClaimPreparationWindow(paymentWindowSummaries, claimRulepackId) {
    const activeWindows = (paymentWindowSummaries || []).filter((window) => window.remainingReductionAmount > MONEY_EPSILON);
    if (!activeWindows.length) {
      return {
        activeWindow: null,
        blockerCodes: []
      };
    }
    if (claimRulepackId) {
      const requestedWindow = activeWindows.find((window) => window.rulepackId === claimRulepackId);
      return requestedWindow
        ? { activeWindow: requestedWindow, blockerCodes: [] }
        : { activeWindow: null, blockerCodes: ["hus_claim_rule_window_not_available"] };
    }
    if (activeWindows.length > 1) {
      return {
        activeWindow: null,
        blockerCodes: ["hus_multiple_rate_windows_pending"]
      };
    }
    return {
      activeWindow: activeWindows[0],
      blockerCodes: []
    };
  }

  function resolveHusCaseState(record, readiness) {
    const latestClaim = record.claims.at(-1) || null;
    const hasRecoveredCandidate = (record.recoveryCandidates || []).some((candidate) => candidate.status === "recovered");
    const hasWrittenOffCandidate = (record.recoveryCandidates || []).some((candidate) => candidate.status === "written_off");
    const hasWrittenOffDifference = (record.decisionDifferences || []).some(
      (difference) =>
        difference.status === "resolved"
        && ["internal_writeoff", "credit_note_issued"].includes(difference.resolutionCode)
    );
    if (latestClaim?.status === "paid_out") {
      if (hasRecoveredCandidate && !hasOpenRecoveryCandidates(state, record)) {
        return "recovered";
      }
      if ((hasWrittenOffCandidate || hasWrittenOffDifference) && !hasOpenRecoveryCandidates(state, record) && !hasOpenDecisionDifferences(state, record)) {
        return "written_off";
      }
      return "paid_out";
    }
    if (latestClaim?.status === "claim_accepted") {
      return "accepted";
    }
    if (latestClaim?.status === "claim_partially_accepted") {
      if (hasWrittenOffDifference && !hasOpenDecisionDifferences(state, record)) {
        return "written_off";
      }
      return "partially_accepted";
    }
    if (latestClaim?.status === "claim_rejected") {
      if (hasWrittenOffDifference && !hasOpenDecisionDifferences(state, record)) {
        return "written_off";
      }
      return "rejected";
    }
    if (latestClaim?.status === "claim_submitted") {
      return "claimed";
    }
    if (readiness.claimReadyState === "claim_ready" || latestClaim?.status === "claim_draft") {
      return "claim_ready";
    }
    return "draft";
  }

  function refreshCaseDerivedState(record) {
    const financialSnapshot = buildCaseFinancialSnapshot(record);
    const latestClaim = record.claims.at(-1) || null;
    record.paidCustomerAmount = sumAmounts(record.customerPayments, "paidAmount");
    record.serviceLines = financialSnapshot.serviceLines;
    record.totalGrossAmount = financialSnapshot.totalGrossAmount;
    record.totalLaborCostInclVatAmount = financialSnapshot.totalLaborCostInclVatAmount;
    record.totalLaborCostExVatAmount = financialSnapshot.totalLaborCostExVatAmount;
    record.totalVatAmount = financialSnapshot.totalVatAmount;
    record.totalEligibleLaborAmount = financialSnapshot.totalEligibleLaborAmount;
    record.preliminaryReductionAmount = financialSnapshot.preliminaryReductionAmount;
    record.customerShareAmount = financialSnapshot.customerShareAmount;
    record.rulepackRef = record.rulepackRef || buildRulepackRef({
      rulePackId: record.rulepackId,
      rulePackCode: record.rulepackCode,
      version: record.rulepackVersion,
      checksum: record.rulepackChecksum,
      effectiveFrom: `${String(record.ruleYear).padStart(4, "0")}-01-01`,
      effectiveTo: null,
      machineReadableRules: {
        ruleYear: record.ruleYear
      },
      officialSourceRefs: []
    });
    record.propertyRef = buildPropertyRef(record.propertyProfile);
    record.workDateRange = {
      from: record.workCompletedFrom,
      to: record.workCompletedTo,
      completedOn: record.workCompletedOn
    };
    record.currentClaimReadyRulepackRef = financialSnapshot.rulepackRef;
    const invoiceGate = refreshInvoiceGate(record);
    const readiness = buildClaimReadinessSnapshot(record);
    const resolvedClaimReadyState = latestClaim?.status === "claim_draft"
      ? "claim_ready"
      : readiness.claimReadyState;
    record.invoiceGateStatus = invoiceGate.status;
    record.invoiceBlockerCodes = [...invoiceGate.blockerCodes];
    record.claimEligibilityStatus = readiness.status;
    record.claimBlockerCodes = [...readiness.blockerCodes];
    record.claimReadyAmount = readiness.claimableReductionAmount;
    record.claimReadyState = resolvedClaimReadyState;
    record.claimReadyAt = resolvedClaimReadyState === "claim_ready"
      ? (
          latestClaim?.status === "claim_draft"
            ? (latestClaim.claimReadyAt || record.claimReadyAt || nowIso(clock))
            : (record.claimReadyAt || nowIso(clock))
        )
      : null;
    record.currentClaimReadyRulepackRef = readiness.activeRulepackRef || latestClaim?.rulepackRef || financialSnapshot.rulepackRef;
    record.claimReadyRulepackRef = resolvedClaimReadyState === "claim_ready"
      ? (
          latestClaim?.status === "claim_draft"
            ? (latestClaim.rulepackRef || readiness.activeRulepackRef || financialSnapshot.rulepackRef)
            : (readiness.activeRulepackRef || financialSnapshot.rulepackRef)
        )
      : null;
    record.claimReadyEvidenceRefs = resolvedClaimReadyState === "claim_ready"
      ? uniqueTexts([
          ...(latestClaim?.status === "claim_draft" ? latestClaim.claimReadyEvidenceRefs || [] : []),
          ...(readiness.claimReadyEvidenceRefs || [])
        ])
      : [];
    record.claimedAmountTotal = sumActiveClaimAmounts(record);
    record.approvedAmountTotal = sumAmounts(record.decisions, "approvedAmount");
    record.paidOutAmountTotal = sumAmounts(record.payouts, "payoutAmount");
    record.recoveredAmountTotal = sumAmounts(record.recoveries, "recoveryAmount");
    record.outstandingCustomerShareAmount = roundMoney(Math.max(0, record.customerShareAmount - record.paidCustomerAmount));
    record.status = resolveHusCaseState(record, readiness);
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
    const claimRulepackId = typeof options === "object" && options ? normalizeOptionalText(options.claimRulepackId) : null;
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
    const paymentCapacities = buildPaymentCapacities(record, {
      excludeClaimId,
      resolvePaymentRulePack: resolveHusPaymentWindowRulePack
    });
    const paymentWindowSummaries = buildPaymentWindowSummaries(paymentCapacities, resolvedAsOfDate);
    const claimWindowResolution = resolveClaimPreparationWindow(paymentWindowSummaries, claimRulepackId);
    blockerCodes.push(...claimWindowResolution.blockerCodes);
    const activeWindow = claimWindowResolution.activeWindow;
    const buyerCapacities = activeWindow
      ? buildBuyerCapacities(state, record, { excludeClaimId, claimRulepackId: activeWindow.rulepackId })
      : [];
    if (activeWindow && !buyerCapacities.some((buyer) => buyer.remainingClaimableAmount > MONEY_EPSILON)) {
      blockerCodes.push("hus_buyer_annual_cap_exhausted");
    }
    const expiredRemainingCapacity = paymentCapacities
      .filter((item) => item.remainingReductionAmount > MONEY_EPSILON && resolvedAsOfDate > item.latestAllowedSubmissionDate)
      .reduce((sum, item) => sum + item.remainingReductionAmount, 0);
    if (expiredRemainingCapacity > MONEY_EPSILON) {
      blockerCodes.push("hus_claim_deadline_passed");
    }
    const paymentClaimableReductionAmount = roundMoney(
      paymentCapacities
        .filter((item) => (!activeWindow || item.rulepackId === activeWindow.rulepackId) && resolvedAsOfDate <= item.latestAllowedSubmissionDate)
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
    const claimReadyEvidenceRefs = activeWindow
      ? uniqueTexts([
          buildHusInvoiceEvidenceRef(record),
          buildPropertyEvidenceRef(record),
          ...activeWindow.paymentEvidenceRefs,
          ...buyerCapacities.flatMap((buyer) => buyer.evidenceRefs || [])
        ])
      : [];
    return {
      status,
      claimReadyState: blockerCodes.length === 0 && claimableReductionAmount > MONEY_EPSILON ? "claim_ready" : "draft",
      blockerCodes: uniqueTexts(blockerCodes),
      claimableReductionAmount,
      paymentClaimableReductionAmount,
      buyerClaimableReductionAmount,
      paidRatio,
      asOfDate: resolvedAsOfDate,
      paymentCapacities: paymentCapacities.map(copy),
      buyerCapacities: buyerCapacities.map(copy),
      paymentWindowSummaries: paymentWindowSummaries.map(copy),
      activeRulepackRef: activeWindow?.rulepackRef || null,
      claimReadyEvidenceRefs
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

function normalizeServiceLines(serviceLines, { defaultServiceTypeCode, ruleYear, effectiveDate = null }) {
  if (!Array.isArray(serviceLines) || serviceLines.length === 0) {
    throw createError(400, "hus_service_lines_required", "At least one HUS service line is required.");
  }
  const rulePack = resolveStaticHusRulePackByEffectiveDate(effectiveDate || `${String(ruleYear).padStart(4, "0")}-01-01`);
  return serviceLines.map((line, index) => {
    const serviceTypeCode = requireEnum(HUS_SERVICE_TYPE_CODES, line?.serviceTypeCode ?? defaultServiceTypeCode, "hus_service_line_type_invalid");
    const laborAmounts = normalizeLaborCostAmounts(line);
    const materialAmount = normalizeMoney(line?.materialAmount ?? 0, "hus_service_line_material_invalid");
    const travelAmount = normalizeMoney(line?.travelAmount ?? 0, "hus_service_line_travel_invalid");
    const equipmentAmount = normalizeMoney(line?.equipmentAmount ?? 0, "hus_service_line_equipment_invalid");
    const adminAmount = normalizeMoney(line?.adminAmount ?? 0, "hus_service_line_admin_invalid");
    const otherAmount = normalizeMoney(line?.otherAmount ?? 0, "hus_service_line_other_invalid");
    const reductionRate = resolveReductionRateForServiceType(serviceTypeCode, rulePack);
    const totalAmount = roundMoney(
      laborAmounts.laborCostInclVatAmount
      + materialAmount
      + travelAmount
      + equipmentAmount
      + adminAmount
      + otherAmount
    );
    const eligibleLaborAmount = serviceTypeCode === "not_eligible" ? 0 : laborAmounts.laborCostInclVatAmount;
    const preliminaryReductionAmount = roundMoney(eligibleLaborAmount * reductionRate);
    return {
      husServiceLineId: crypto.randomUUID(),
      lineNo: index + 1,
      description: requireText(line?.description || `Service line ${index + 1}`, "hus_service_line_description_required"),
      serviceTypeCode,
      workedHours: normalizeOptionalPositiveNumber(line?.workedHours, "hus_service_line_worked_hours_invalid"),
      laborCostAmount: laborAmounts.laborCostInclVatAmount,
      laborCostInclVatAmount: laborAmounts.laborCostInclVatAmount,
      laborCostExVatAmount: laborAmounts.laborCostExVatAmount,
      vatAmount: laborAmounts.vatAmount,
      vatRate: laborAmounts.vatRate,
      materialAmount,
      travelAmount,
      equipmentAmount,
      adminAmount,
      otherAmount,
      totalAmount,
      eligibleLaborAmount,
      reductionRate,
      preliminaryReductionAmount,
      customerShareAmount: roundMoney(totalAmount - preliminaryReductionAmount),
      rulepackRef: buildRulepackRef(rulePack)
    };
  });
}

function summarizeServiceLines(serviceLines, options = {}) {
  return buildCaseFinancialSnapshot({ serviceLines }, { serviceLines, ...options });
}

function normalizeBuyers(husCaseId, buyers, customerShareAmount, preliminaryReductionAmount, identityValidatedAt) {
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
    },
    buyerIdentityRef: buildHusBuyerIdentityRef(husCaseId, crypto.randomUUID()),
    identityValidationStatus: "validated",
    identityValidatedAt: normalizeOptionalText(identityValidatedAt) || null
  }));
  const totalPercent = roundMoney(normalized.reduce((sum, buyer) => sum + buyer.allocationPercent, 0));
  if (!moneyEquals(totalPercent, 100)) {
    throw createError(400, "hus_buyer_allocation_invalid", "HUS buyer allocation must sum to 100 percent.");
  }
  return normalized.map((buyer) => ({
    ...buyer,
    buyerIdentityRef: buildHusBuyerIdentityRef(husCaseId, buyer.husCaseBuyerId),
    buyerIdentityMaskedValue: maskIdentityNumber(buyer.personalIdentityNumber),
    customerShareAmount: roundMoney(customerShareAmount * (buyer.allocationPercent / 100)),
    preliminaryReductionAmount: roundMoney(preliminaryReductionAmount * (buyer.allocationPercent / 100)),
    evidenceRefs: buildHusBuyerEvidenceRefs(
      {
        husCaseId,
        customerInvoiceId: null,
        invoiceGateSnapshot: null,
        propertyProfile: null
      },
      buyer,
      []
    )
  }));
}

function buildBuyerCapacities(state, record, { excludeClaimId = null, claimRulepackId = null } = {}) {
  const claimRulePack = resolveStaticHusRulePackById(claimRulepackId)
    || ((claimRulepackId && claimRulepackId === record.rulepackId) ? buildPersistedHusRulePack(record) : null)
    || resolveRecordedOrStaticHusRulePack(record, record.workCompletedOn);
  const financialSnapshot = buildCaseFinancialSnapshot(record, { rulePack: claimRulePack });
  return record.buyers.map((buyer) => {
    const caseClaimedAmount = sumBuyerClaimUsageForCase(record, buyer.personalIdentityNumber, {
      excludeClaimId,
      claimRulepackId: claimRulePack.rulePackId
    });
    const annualUsage = summarizeBuyerAnnualUsage(
      state,
      record.companyId,
      Number(claimRulePack.machineReadableRules?.ruleYear || record.ruleYear),
      buyer.personalIdentityNumber,
      {
        excludeClaimId,
        serviceTypeCode: record.serviceTypeCode
      }
    );
    const annualCapAmount = Number(claimRulePack.machineReadableRules?.annualCapAmount ?? 75000);
    const serviceTypeCapAmount = record.serviceTypeCode === "rot"
      ? Number(claimRulePack.machineReadableRules?.rotAnnualCapAmount ?? 50000)
      : Number(claimRulePack.machineReadableRules?.rutAnnualCapAmount ?? annualCapAmount);
    const remainingAnnualCapAmount = roundMoney(Math.max(0, annualCapAmount - annualUsage.totalUsedAmount));
    const remainingServiceTypeCapAmount = roundMoney(Math.max(0, serviceTypeCapAmount - annualUsage.serviceTypeUsedAmount));
    const casePreliminaryReductionAmount = roundMoney(
      financialSnapshot.preliminaryReductionAmount * (buyer.allocationPercent / 100)
    );
    const remainingCaseAmount = roundMoney(Math.max(0, casePreliminaryReductionAmount - caseClaimedAmount));
    const remainingClaimableAmount = roundMoney(
      Math.min(remainingCaseAmount, remainingAnnualCapAmount, remainingServiceTypeCapAmount)
    );
    return {
      husCaseBuyerId: buyer.husCaseBuyerId,
      displayName: buyer.displayName,
      personalIdentityNumber: buyer.personalIdentityNumber,
      buyerIdentityRef: buyer.buyerIdentityRef || buildHusBuyerIdentityRef(record.husCaseId, buyer.husCaseBuyerId),
      buyerIdentityMaskedValue: buyer.buyerIdentityMaskedValue || maskIdentityNumber(buyer.personalIdentityNumber),
      allocationPercent: buyer.allocationPercent,
      casePreliminaryReductionAmount,
      caseClaimedAmount,
      annualCapAmount,
      serviceTypeCapAmount,
      annualUsedAmount: annualUsage.totalUsedAmount,
      serviceTypeUsedAmount: annualUsage.serviceTypeUsedAmount,
      usedAnnualCapAmount: annualUsage.totalUsedAmount,
      usedServiceTypeCapAmount: annualUsage.serviceTypeUsedAmount,
      remainingAnnualCapAmount,
      remainingServiceTypeCapAmount,
      remainingClaimableAmount,
      rulepackRef: buildRulepackRef(claimRulePack),
      evidenceRefs: buildHusBuyerEvidenceRefs(record, buyer, [])
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

function buildPaymentCapacities(record, { excludeClaimId = null, resolvePaymentRulePack = null } = {}) {
  const payments = [...record.customerPayments].sort(comparePayments);
  const claimAllocationsByPaymentId = new Map();
  const remainingCustomerShareByRulepackId = new Map();
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
  return payments.map((payment) => {
    const paymentRulePack = typeof resolvePaymentRulePack === "function"
      ? resolvePaymentRulePack(record, payment.paidOn)
      : resolveRecordedOrStaticHusRulePack(record, payment.paidOn);
    const paymentSnapshot = buildCaseFinancialSnapshot(record, {
      rulePack: paymentRulePack
    });
    const customerShareBase = Math.max(paymentSnapshot.customerShareAmount, 0);
    const reductionBase = Math.max(0, roundMoney(paymentSnapshot.preliminaryReductionAmount - sumPrePayoutCreditAdjustments(record)));
    const remainingCustomerShare = remainingCustomerShareByRulepackId.has(paymentRulePack.rulePackId)
      ? remainingCustomerShareByRulepackId.get(paymentRulePack.rulePackId)
      : customerShareBase;
    const coveredCustomerShareAmount = roundMoney(Math.max(0, Math.min(payment.paidAmount, remainingCustomerShare)));
    remainingCustomerShareByRulepackId.set(
      paymentRulePack.rulePackId,
      roundMoney(Math.max(0, remainingCustomerShare - coveredCustomerShareAmount))
    );
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
      latestAllowedSubmissionDate: deadlineForPaymentDate(payment.paidOn),
      claimRuleYear: paymentRulePack.machineReadableRules?.ruleYear ?? Number(String(payment.paidOn).slice(0, 4)),
      reductionRate: resolveReductionRateForServiceType(record.serviceTypeCode, paymentRulePack),
      rulepackId: paymentRulePack.rulePackId,
      rulepackCode: paymentRulePack.rulePackCode,
      rulepackVersion: paymentRulePack.version,
      rulepackChecksum: paymentRulePack.checksum,
      rulepackRef: buildRulepackRef(paymentRulePack),
      paymentEvidenceRef: buildHusPaymentEvidenceRef(payment)
    };
  });
}

function allocateClaimAmountAcrossPayments(record, claimAmount, { claimRulepackId = null, resolvePaymentRulePack = null } = {}) {
  let remaining = roundMoney(claimAmount);
  const allocations = [];
  for (const paymentCapacity of buildPaymentCapacities(record, { resolvePaymentRulePack })) {
    if (claimRulepackId && paymentCapacity.rulepackId !== claimRulepackId) {
      continue;
    }
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
      claimReductionAmount: allocationAmount,
      rulepackId: paymentCapacity.rulepackId,
      rulepackCode: paymentCapacity.rulepackCode,
      rulepackVersion: paymentCapacity.rulepackVersion,
      rulepackChecksum: paymentCapacity.rulepackChecksum,
      rulepackRef: paymentCapacity.rulepackRef,
      reductionRate: paymentCapacity.reductionRate,
      paymentEvidenceRef: paymentCapacity.paymentEvidenceRef
    });
    remaining = roundMoney(Math.max(0, remaining - allocationAmount));
  }
  if (remaining > MONEY_EPSILON) {
    throw createError(409, "hus_claim_payment_capacity_exhausted", "HUS claim amount exceeds the available payment-backed reduction capacity.");
  }
  return allocations;
}

function allocateClaimAmountAcrossBuyers(state, record, claimAmount, { claimRulepackId = null, paymentAllocations = [] } = {}) {
  let remaining = roundMoney(claimAmount);
  const buyerCapacities = buildBuyerCapacities(state, record, { claimRulepackId });
  const totalBuyerCapacity = roundMoney(buyerCapacities.reduce((sum, buyer) => sum + buyer.remainingClaimableAmount, 0));
  if (remaining > totalBuyerCapacity + MONEY_EPSILON) {
    throw createError(409, "hus_claim_buyer_capacity_exhausted", "HUS claim amount exceeds buyer allocation or yearly HUS cap capacity.");
  }
  const allocations = [];
  const totalWeight = roundMoney(buyerCapacities.reduce((sum, buyer) => sum + buyer.remainingClaimableAmount, 0));
  const paymentEvidenceRefs = uniqueTexts((paymentAllocations || []).map((allocation) => allocation.paymentEvidenceRef));
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
      buyerIdentityRef: buyerCapacity.buyerIdentityRef,
      buyerIdentityMaskedValue: buyerCapacity.buyerIdentityMaskedValue,
      allocationPercent: buyerCapacity.allocationPercent,
      requestedAmount: allocatedAmount,
      annualCapAmount: buyerCapacity.annualCapAmount,
      serviceTypeCapAmount: buyerCapacity.serviceTypeCapAmount,
      annualUsedAmountBeforeClaim: buyerCapacity.annualUsedAmount,
      serviceTypeUsedAmountBeforeClaim: buyerCapacity.serviceTypeUsedAmount,
      usedAnnualCapAmount: buyerCapacity.usedAnnualCapAmount,
      usedServiceTypeCapAmount: buyerCapacity.usedServiceTypeCapAmount,
      remainingAnnualCapAmountAfterClaim: roundMoney(Math.max(0, buyerCapacity.remainingAnnualCapAmount - allocatedAmount)),
      remainingServiceTypeCapAmountAfterClaim: roundMoney(Math.max(0, buyerCapacity.remainingServiceTypeCapAmount - allocatedAmount)),
      remainingAnnualCapAmount: roundMoney(Math.max(0, buyerCapacity.remainingAnnualCapAmount - allocatedAmount)),
      remainingServiceTypeCapAmount: roundMoney(Math.max(0, buyerCapacity.remainingServiceTypeCapAmount - allocatedAmount)),
      rulepackRef: buyerCapacity.rulepackRef,
      evidenceRefs: buildHusBuyerEvidenceRefs(record, buyerCapacity, paymentEvidenceRefs)
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
          buyerIdentityRef: buyerCapacity.buyerIdentityRef,
          buyerIdentityMaskedValue: buyerCapacity.buyerIdentityMaskedValue,
          allocationPercent: buyerCapacity.allocationPercent,
          requestedAmount: topUpAmount,
          annualCapAmount: buyerCapacity.annualCapAmount,
          serviceTypeCapAmount: buyerCapacity.serviceTypeCapAmount,
          annualUsedAmountBeforeClaim: buyerCapacity.annualUsedAmount,
          serviceTypeUsedAmountBeforeClaim: buyerCapacity.serviceTypeUsedAmount,
          usedAnnualCapAmount: buyerCapacity.usedAnnualCapAmount,
          usedServiceTypeCapAmount: buyerCapacity.usedServiceTypeCapAmount,
          remainingAnnualCapAmountAfterClaim: roundMoney(Math.max(0, buyerCapacity.remainingAnnualCapAmount - topUpAmount)),
          remainingServiceTypeCapAmountAfterClaim: roundMoney(Math.max(0, buyerCapacity.remainingServiceTypeCapAmount - topUpAmount)),
          remainingAnnualCapAmount: roundMoney(Math.max(0, buyerCapacity.remainingAnnualCapAmount - topUpAmount)),
          remainingServiceTypeCapAmount: roundMoney(Math.max(0, buyerCapacity.remainingServiceTypeCapAmount - topUpAmount)),
          rulepackRef: buyerCapacity.rulepackRef,
          evidenceRefs: buildHusBuyerEvidenceRefs(record, buyerCapacity, paymentEvidenceRefs)
        });
      } else {
        allocation.requestedAmount = roundMoney(allocation.requestedAmount + topUpAmount);
        allocation.remainingAnnualCapAmountAfterClaim = roundMoney(Math.max(0, allocation.remainingAnnualCapAmountAfterClaim - topUpAmount));
        allocation.remainingServiceTypeCapAmountAfterClaim = roundMoney(Math.max(0, allocation.remainingServiceTypeCapAmountAfterClaim - topUpAmount));
        allocation.remainingAnnualCapAmount = roundMoney(Math.max(0, allocation.remainingAnnualCapAmount - topUpAmount));
        allocation.remainingServiceTypeCapAmount = roundMoney(Math.max(0, allocation.remainingServiceTypeCapAmount - topUpAmount));
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
    ruleYear: claimRecord.claimRuleYear || record.ruleYear,
    rulepackId: claimRecord.rulepackId || record.rulepackId,
    rulepackCode: claimRecord.rulepackCode || record.rulepackCode,
    rulepackVersion: claimRecord.rulepackVersion || record.rulepackVersion,
    rulepackChecksum: claimRecord.rulepackChecksum || record.rulepackChecksum,
    rulepackRef: claimRecord.rulepackRef || record.rulepackRef,
    serviceTypeCode: record.serviceTypeCode,
    workCompletedOn: record.workCompletedOn,
    workCompletedFrom: record.workCompletedFrom,
    workCompletedTo: record.workCompletedTo,
    workDateRange: record.workDateRange,
    propertyProfile: record.propertyProfile,
    propertyRef: record.propertyRef,
    laborCostInclVatAmount: record.totalLaborCostInclVatAmount,
    laborCostExVatAmount: record.totalLaborCostExVatAmount,
    vatAmount: record.totalVatAmount,
    serviceLines: record.serviceLines,
    buyers: record.buyers,
    customerPayments: record.customerPayments,
    paymentAllocations: claimRecord.paymentAllocations,
    buyerAllocations: claimRecord.buyerAllocations,
    transportProfile: claimRecord.transportProfile,
    requestedAmount: claimRecord.requestedAmount,
    transportType: claimRecord.transportType,
    claimReadinessStatus: readiness.status,
    claimReadyState: readiness.claimReadyState,
    claimReadyAt: claimRecord.claimReadyAt || record.claimReadyAt,
    claimReadyEvidenceRefs: uniqueTexts([
      ...(claimRecord.claimReadyEvidenceRefs || []),
      ...(readiness.claimReadyEvidenceRefs || [])
    ]),
    claimBlockerCodes: readiness.blockerCodes,
    buyerCapacities: readiness.buyerCapacities,
    paymentCapacities: readiness.paymentCapacities,
    paymentWindowSummaries: readiness.paymentWindowSummaries,
    activeRulepackRef: readiness.activeRulepackRef
  };
}

function sumActiveClaimAmounts(record) {
  return roundMoney(record.claims.reduce((sum, claim) => {
    if (claim.status === "claim_rejected") {
      return sum;
    }
    return sum + Number(claim.requestedAmount || 0);
  }, 0));
}

function sumPrePayoutCreditAdjustments(record) {
  return roundMoney(record.creditAdjustments
    .filter((adjustment) => adjustment.afterPayoutFlag !== true)
    .reduce((sum, adjustment) => sum + Number(adjustment.adjustmentAmount || 0), 0));
}

function comparePayments(left, right) {
  return left.paidOn.localeCompare(right.paidOn) || left.createdAt.localeCompare(right.createdAt);
}

function sumBuyerClaimUsageForCase(record, personalIdentityNumber, { excludeClaimId = null, claimRulepackId = null } = {}) {
  return roundMoney(record.claims.reduce((sum, claim) => {
    if (excludeClaimId && claim.husClaimId === excludeClaimId) {
      return sum;
    }
    if (claimRulepackId && claim.rulepackId !== claimRulepackId) {
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
    if (!record) {
      continue;
    }
    for (const claim of record.claims) {
      if (excludeClaimId && claim.husClaimId === excludeClaimId) {
        continue;
      }
      const claimRuleYear = Number(claim.claimRuleYear || record.ruleYear);
      if (claimRuleYear !== ruleYear) {
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
      buyerIdentityRef: allocation.buyerIdentityRef || null,
      buyerIdentityMaskedValue: allocation.buyerIdentityMaskedValue || maskIdentityNumber(allocation.personalIdentityNumber),
      requestedAmount: requestedBuyerAmount,
      approvedAmount: roundMoney(approvedAmount * weight),
      rejectedAmount: roundMoney(rejectedAmount * weight),
      evidenceRefs: [...(allocation.evidenceRefs || [])]
    };
  });
}

function syncCaseDecisionDifference(record, differenceRecord) {
  upsertCaseCollectionRecord(record.decisionDifferences, "husDecisionDifferenceId", differenceRecord);
}

function syncCaseAuthorityReceivable(record, authorityReceivable) {
  upsertCaseCollectionRecord(record.authorityReceivables, "husAuthorityReceivableId", authorityReceivable);
}

function syncCaseCustomerReceivable(record, customerReceivable) {
  upsertCaseCollectionRecord(record.customerReceivables, "husCustomerReceivableId", customerReceivable);
}

function syncCaseRecoveryCandidate(record, recoveryCandidate) {
  upsertCaseCollectionRecord(record.recoveryCandidates, "husRecoveryCandidateId", recoveryCandidate);
}

function upsertCaseCollectionRecord(collection, idField, entry) {
  const index = collection.findIndex((candidate) => candidate[idField] === entry[idField]);
  if (index === -1) {
    collection.push(entry);
    return;
  }
  collection[index] = entry;
}

function listCaseDecisionDifferences(state, record) {
  const records = (state.husDecisionDifferenceIdsByCompany.get(record.companyId) || [])
    .map((differenceId) => state.husDecisionDifferences.get(differenceId))
    .filter(Boolean)
    .filter((candidate) => candidate.husCaseId === record.husCaseId);
  return records.length ? records : record.decisionDifferences;
}

function listCaseRecoveryCandidates(state, record) {
  const records = (state.husRecoveryCandidateIdsByCompany.get(record.companyId) || [])
    .map((candidateId) => state.husRecoveryCandidates.get(candidateId))
    .filter(Boolean)
    .filter((candidate) => candidate.husCaseId === record.husCaseId);
  return records.length ? records : record.recoveryCandidates;
}

function hasOpenDecisionDifferences(state, record) {
  return listCaseDecisionDifferences(state, record).some((item) => item.status === "open");
}

function hasOpenDecisionDifferencesForClaim(state, record, husClaimId) {
  return listCaseDecisionDifferences(state, record).some(
    (item) => item.husClaimId === husClaimId && item.status === "open"
  );
}

function hasOpenRecoveryCandidates(state, record) {
  return listCaseRecoveryCandidates(state, record).some((item) => item.status === "open");
}

function findOpenRecoveryCandidate(state, record) {
  return listCaseRecoveryCandidates(state, record).find((item) => item.status === "open") || null;
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

function maskIdentityNumber(value) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  if (normalized.length <= 4) {
    return `****${normalized}`;
  }
  return `${"*".repeat(normalized.length - 4)}${normalized.slice(-4)}`;
}

function resolveStaticHusRulePackByYear(ruleYear) {
  return HUS_RULE_PACKS.find((rulePack) => Number(rulePack.machineReadableRules?.ruleYear) === Number(ruleYear))
    || HUS_RULE_PACKS.at(-1);
}

function resolveStaticHusRulePackById(rulePackId) {
  const resolvedRulePackId = normalizeOptionalText(rulePackId);
  if (!resolvedRulePackId) {
    return null;
  }
  return HUS_RULE_PACKS.find((rulePack) => rulePack.rulePackId === resolvedRulePackId) || null;
}

function resolveStaticHusRulePackByEffectiveDate(effectiveDate) {
  const resolvedDate = normalizeOptionalDate(effectiveDate, "hus_rulepack_effective_date_invalid");
  if (!resolvedDate) {
    return HUS_RULE_PACKS.at(-1);
  }
  return HUS_RULE_PACKS.find((rulePack) => {
    const from = String(rulePack.effectiveFrom);
    const to = rulePack.effectiveTo ? String(rulePack.effectiveTo) : null;
    return resolvedDate >= from && (!to || resolvedDate < to);
  }) || HUS_RULE_PACKS.at(-1);
}

function buildPersistedHusRulePack(record) {
  if (!record?.rulepackId) {
    return null;
  }
  return {
    rulePackId: record.rulepackId,
    rulePackCode: record.rulepackCode,
    version: record.rulepackVersion,
    checksum: record.rulepackChecksum,
    effectiveFrom: record.rulepackEffectiveFrom || `${String(record.ruleYear || new Date().getUTCFullYear()).padStart(4, "0")}-01-01`,
    effectiveTo: record.rulepackEffectiveTo || null,
    machineReadableRules: copy(record.rulepackMachineReadableRules || { ruleYear: record.ruleYear }),
    officialSourceRefs: [...(record.rulepackOfficialSourceRefs || record.rulepackRef?.officialSourceRefs || [])]
  };
}

function resolveRecordedOrStaticHusRulePack(record, effectiveDate = null) {
  const staticRulePack = resolveStaticHusRulePackByEffectiveDate(effectiveDate || determineDefaultHusFinancialEffectiveDate(record));
  const persistedRulePack = buildPersistedHusRulePack(record);
  if (!persistedRulePack) {
    return staticRulePack;
  }
  if (!staticRulePack) {
    return persistedRulePack;
  }
  const effectiveYear = Number(String(normalizeOptionalDate(effectiveDate, "hus_rulepack_effective_date_invalid") || determineDefaultHusFinancialEffectiveDate(record)).slice(0, 4));
  if (effectiveYear > Number(staticRulePack.machineReadableRules?.ruleYear || String(staticRulePack.effectiveFrom).slice(0, 4))) {
    return persistedRulePack;
  }
  return persistedRulePack.rulePackId === staticRulePack.rulePackId ? staticRulePack : persistedRulePack;
}

function buildRulepackRef(rulePack) {
  if (!rulePack) {
    return null;
  }
  return {
    rulepackId: rulePack.rulePackId,
    rulepackCode: rulePack.rulePackCode,
    rulepackVersion: rulePack.version,
    rulepackChecksum: rulePack.checksum,
    ruleYear: Number(rulePack.machineReadableRules?.ruleYear || String(rulePack.effectiveFrom).slice(0, 4)),
    rateWindowCode: normalizeOptionalText(rulePack.machineReadableRules?.rateWindowCode) || null,
    effectiveFrom: rulePack.effectiveFrom,
    effectiveTo: rulePack.effectiveTo || null,
    officialSourceRefs: [...(rulePack.officialSourceRefs || [])]
  };
}

function resolveReductionRateForServiceType(serviceTypeCode, rulePack) {
  if (!rulePack || serviceTypeCode === "not_eligible") {
    return 0;
  }
  if (serviceTypeCode === "rot") {
    return Number(rulePack.machineReadableRules?.rotReductionRate ?? 0.3);
  }
  if (serviceTypeCode === "rut") {
    return Number(rulePack.machineReadableRules?.rutReductionRate ?? 0.5);
  }
  return 0;
}

function resolveDefaultHusFinancialRulePack(record) {
  const anchoredRulePack = resolveStaticHusRulePackById(record?.rulepackId);
  if (anchoredRulePack) {
    return anchoredRulePack;
  }
  return resolveRecordedOrStaticHusRulePack(record, determineDefaultHusFinancialEffectiveDate(record));
}

function determineDefaultHusFinancialEffectiveDate(record) {
  return normalizeOptionalText(record?.workCompletedOn) || HUS_RULE_PACKS.at(-1).effectiveFrom;
}

function buildPropertyRef(propertyProfile = {}) {
  return {
    housingFormCode: propertyProfile.housingFormCode || null,
    propertyDesignation: propertyProfile.propertyDesignation || null,
    apartmentDesignation: propertyProfile.apartmentDesignation || null,
    housingAssociationOrgNumber: propertyProfile.housingAssociationOrgNumber || null,
    serviceAddressLine1: propertyProfile.serviceAddressLine1 || null,
    postalCode: propertyProfile.postalCode || null,
    city: propertyProfile.city || null
  };
}

function buildPropertyEvidenceRef(record) {
  return normalizeOptionalText(record?.husCaseId)
    ? `hus-property:${record.husCaseId}`
    : null;
}

function buildHusInvoiceEvidenceRef(record) {
  const invoiceNumber = normalizeOptionalText(record?.invoiceGateSnapshot?.invoiceNumber);
  const customerInvoiceId = normalizeOptionalText(record?.customerInvoiceId);
  if (invoiceNumber) {
    return `hus-invoice:${invoiceNumber}`;
  }
  if (customerInvoiceId) {
    return `hus-invoice:${customerInvoiceId}`;
  }
  return null;
}

function buildHusPaymentEvidenceRef(payment) {
  const paymentId = normalizeOptionalText(payment?.husCustomerPaymentId);
  return paymentId ? `hus-payment:${paymentId}` : null;
}

function buildHusBuyerIdentityRef(husCaseId, husCaseBuyerId) {
  return `hus-buyer-identity:${husCaseId}:${husCaseBuyerId}`;
}

function buildHusBuyerEvidenceRefs(record, buyer, paymentEvidenceRefs = []) {
  return uniqueTexts([
    buyer?.buyerIdentityRef || null,
    buildHusInvoiceEvidenceRef(record),
    buildPropertyEvidenceRef(record),
    ...(paymentEvidenceRefs || [])
  ]);
}

function normalizeLaborCostAmounts(line = {}) {
  const vatRate = normalizeOptionalRate(line?.vatRate, "hus_service_line_vat_rate_invalid") ?? 0.25;
  const legacyLaborCostAmount = normalizeOptionalMoney(line?.laborCostAmount, "hus_service_line_labor_invalid");
  let laborCostInclVatAmount = normalizeOptionalMoney(
    line?.laborCostInclVatAmount ?? legacyLaborCostAmount,
    "hus_service_line_labor_incl_vat_invalid"
  );
  let laborCostExVatAmount = normalizeOptionalMoney(line?.laborCostExVatAmount, "hus_service_line_labor_ex_vat_invalid");
  let vatAmount = normalizeOptionalMoney(line?.vatAmount, "hus_service_line_vat_amount_invalid");

  if (laborCostInclVatAmount == null && laborCostExVatAmount == null && vatAmount == null) {
    laborCostInclVatAmount = 0;
    laborCostExVatAmount = 0;
    vatAmount = 0;
  } else if (laborCostInclVatAmount != null && laborCostExVatAmount != null && vatAmount != null) {
    if (!moneyEquals(laborCostInclVatAmount, roundMoney(laborCostExVatAmount + vatAmount))) {
      throw createError(400, "hus_service_line_labor_amounts_mismatch", "Labor amounts including VAT must reconcile to ex-VAT plus VAT.");
    }
  } else if (laborCostInclVatAmount != null && laborCostExVatAmount != null) {
    vatAmount = roundMoney(laborCostInclVatAmount - laborCostExVatAmount);
  } else if (laborCostInclVatAmount != null && vatAmount != null) {
    laborCostExVatAmount = roundMoney(laborCostInclVatAmount - vatAmount);
  } else if (laborCostExVatAmount != null && vatAmount != null) {
    laborCostInclVatAmount = roundMoney(laborCostExVatAmount + vatAmount);
  } else if (laborCostInclVatAmount != null) {
    laborCostExVatAmount = roundMoney(laborCostInclVatAmount / (1 + vatRate));
    vatAmount = roundMoney(laborCostInclVatAmount - laborCostExVatAmount);
  } else if (laborCostExVatAmount != null) {
    vatAmount = roundMoney(laborCostExVatAmount * vatRate);
    laborCostInclVatAmount = roundMoney(laborCostExVatAmount + vatAmount);
  } else {
    throw createError(400, "hus_service_line_labor_amount_invalid", "Labor amount cannot be derived.");
  }

  if (vatAmount < 0 || laborCostExVatAmount < 0 || laborCostInclVatAmount < 0) {
    throw createError(400, "hus_service_line_labor_amount_invalid", "Labor amounts must be non-negative.");
  }
  if (laborCostInclVatAmount + MONEY_EPSILON < laborCostExVatAmount || laborCostInclVatAmount + MONEY_EPSILON < vatAmount) {
    throw createError(400, "hus_service_line_labor_amount_invalid", "Labor amounts are inconsistent.");
  }
  return {
    vatRate,
    laborCostInclVatAmount,
    laborCostExVatAmount,
    vatAmount
  };
}

function projectServiceLineForRulePack(line, rulePack) {
  const reductionRate = resolveReductionRateForServiceType(line.serviceTypeCode, rulePack);
  const laborCostInclVatAmount = normalizeMoney(
    line?.laborCostInclVatAmount ?? line?.laborCostAmount ?? 0,
    "hus_service_line_labor_incl_vat_invalid"
  );
  const laborCostExVatAmount = normalizeMoney(line?.laborCostExVatAmount ?? 0, "hus_service_line_labor_ex_vat_invalid");
  const vatAmount = normalizeMoney(line?.vatAmount ?? 0, "hus_service_line_vat_amount_invalid");
  const materialAmount = normalizeMoney(line?.materialAmount ?? 0, "hus_service_line_material_invalid");
  const travelAmount = normalizeMoney(line?.travelAmount ?? 0, "hus_service_line_travel_invalid");
  const equipmentAmount = normalizeMoney(line?.equipmentAmount ?? 0, "hus_service_line_equipment_invalid");
  const adminAmount = normalizeMoney(line?.adminAmount ?? 0, "hus_service_line_admin_invalid");
  const otherAmount = normalizeMoney(line?.otherAmount ?? 0, "hus_service_line_other_invalid");
  const totalAmount = roundMoney(laborCostInclVatAmount + materialAmount + travelAmount + equipmentAmount + adminAmount + otherAmount);
  const eligibleLaborAmount = line?.serviceTypeCode === "not_eligible" ? 0 : laborCostInclVatAmount;
  const preliminaryReductionAmount = roundMoney(eligibleLaborAmount * reductionRate);
  return {
    ...copy(line),
    laborCostAmount: laborCostInclVatAmount,
    laborCostInclVatAmount,
    laborCostExVatAmount,
    vatAmount,
    totalAmount,
    eligibleLaborAmount,
    reductionRate,
    preliminaryReductionAmount,
    customerShareAmount: roundMoney(totalAmount - preliminaryReductionAmount),
    rulepackRef: buildRulepackRef(rulePack)
  };
}

function buildCaseFinancialSnapshot(record, { effectiveDate = null, rulePack = null, serviceLines = null } = {}) {
  const resolvedRulePack = rulePack
    || (effectiveDate
      ? resolveStaticHusRulePackByEffectiveDate(effectiveDate)
      : resolveDefaultHusFinancialRulePack(record));
  const resolvedServiceLines = Array.isArray(serviceLines) ? serviceLines : (record.serviceLines || []);
  const projectedServiceLines = resolvedServiceLines.map((line) => projectServiceLineForRulePack(line, resolvedRulePack));
  return projectedServiceLines.reduce(
    (accumulator, line) => ({
      rulePack: resolvedRulePack,
      rulepackRef: buildRulepackRef(resolvedRulePack),
      serviceLines: projectedServiceLines,
      totalGrossAmount: roundMoney(accumulator.totalGrossAmount + line.totalAmount),
      totalLaborCostInclVatAmount: roundMoney(accumulator.totalLaborCostInclVatAmount + line.laborCostInclVatAmount),
      totalLaborCostExVatAmount: roundMoney(accumulator.totalLaborCostExVatAmount + line.laborCostExVatAmount),
      totalVatAmount: roundMoney(accumulator.totalVatAmount + line.vatAmount),
      totalEligibleLaborAmount: roundMoney(accumulator.totalEligibleLaborAmount + line.eligibleLaborAmount),
      preliminaryReductionAmount: roundMoney(accumulator.preliminaryReductionAmount + line.preliminaryReductionAmount),
      customerShareAmount: roundMoney(accumulator.customerShareAmount + line.customerShareAmount)
    }),
    {
      rulePack: resolvedRulePack,
      rulepackRef: buildRulepackRef(resolvedRulePack),
      serviceLines: projectedServiceLines,
      totalGrossAmount: 0,
      totalLaborCostInclVatAmount: 0,
      totalLaborCostExVatAmount: 0,
      totalVatAmount: 0,
      totalEligibleLaborAmount: 0,
      preliminaryReductionAmount: 0,
      customerShareAmount: 0
    }
  );
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
  return normalizeRequiredSwedishIdentityNumberKernel(value, code, { errorFactory: createError });
}

function normalizeOptionalOrgNumber(value) {
  return normalizeOptionalSwedishOrganizationNumberKernel(value, "hus_org_number_invalid", { errorFactory: createError });
}

function normalizeOptionalPaymentReference(value, code) {
  return normalizeOptionalPaymentReferenceKernel(value, code, { errorFactory: createError });
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

function normalizeOptionalRate(value, code) {
  if (value == null || value === "") {
    return null;
  }
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0 || numberValue > 1) {
    throw createError(400, code, "Expected a rate between 0 and 1.");
  }
  return Math.round((numberValue + Number.EPSILON) * 1000000) / 1000000;
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
