import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";
import { createRulePackRegistry } from "../../rule-engine/src/index.mjs";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";

const DEMO_COMPANY_ID = "00000000-0000-4000-8000-000000000001";

export const ACCOUNTING_METHOD_CODES = Object.freeze(["KONTANTMETOD", "FAKTURERINGSMETOD"]);
export const ACCOUNTING_METHOD_PROFILE_STATUSES = Object.freeze(["planned", "active", "historical"]);
export const METHOD_CHANGE_REQUEST_STATUSES = Object.freeze([
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "superseded",
  "implemented"
]);
export const YEAR_END_CATCH_UP_RUN_STATUSES = Object.freeze(["completed", "reversed"]);
export const FINANCIAL_ENTITY_CLASSIFICATIONS = Object.freeze([
  "NON_FINANCIAL",
  "CREDIT_INSTITUTION",
  "SECURITIES_COMPANY",
  "INSURANCE_COMPANY",
  "FINANCIAL_HOLDING_GROUP"
]);
export const CASH_METHOD_NET_TURNOVER_LIMIT_SEK = 3_000_000;
export const ACCOUNTING_METHOD_RULEPACK_CODE = "RP-ACCOUNTING-METHOD-SE";
export const ACCOUNTING_METHOD_RULEPACK_VERSION = "se-accounting-method-2026.1";
const DEFAULT_CASH_METHOD_RECEIVABLE_ACCOUNT_NUMBER = "1210";
const DEFAULT_CASH_METHOD_PAYABLE_ACCOUNT_NUMBER = "2410";

const ACCOUNTING_METHOD_RULE_PACKS = Object.freeze([
  Object.freeze({
    rulePackId: "accounting-method-se-2026.1",
    rulePackCode: ACCOUNTING_METHOD_RULEPACK_CODE,
    domain: "accounting_method",
    jurisdiction: "SE",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    version: ACCOUNTING_METHOD_RULEPACK_VERSION,
    checksum: "accounting-method-se-2026.1",
    sourceSnapshotDate: "2026-03-24",
    semanticChangeSummary: "Swedish accounting-method baseline for cash and invoice method eligibility and year-end catch-up.",
    machineReadableRules: Object.freeze({
      cashMethodNetTurnoverLimitSek: CASH_METHOD_NET_TURNOVER_LIMIT_SEK,
      financialEntityExclusions: Object.freeze([...FINANCIAL_ENTITY_CLASSIFICATIONS].filter((code) => code !== "NON_FINANCIAL"))
    }),
    humanReadableExplanation: Object.freeze([
      "Cash method is limited to companies within the statutory turnover threshold and excluded for financial entities."
    ]),
    testVectors: Object.freeze([]),
    migrationNotes: Object.freeze([])
  })
]);

const CASH_METHOD_LEGAL_BASIS_CODE = "BFL_5_2_3";
const INVOICE_METHOD_LEGAL_BASIS_CODE = "BFL_5_2_1";
const CASH_METHOD_BLOCKING_REASONS = Object.freeze({
  turnover: "net_turnover_exceeds_cash_method_limit",
  financialEntity: "financial_entity_excluded"
});
const YEAR_END_OPEN_ITEM_TYPES = Object.freeze(["CUSTOMER_INVOICE", "SUPPLIER_INVOICE", "RECEIVABLE", "PAYABLE"]);

export function createAccountingMethodPlatform(options = {}) {
  return createAccountingMethodEngine(options);
}

export function createAccountingMethodEngine({
  clock = () => new Date(),
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null,
  ruleRegistry = null,
  getLedgerPlatform = null
} = {}) {
  const rules = ruleRegistry || createRulePackRegistry({
    clock,
    seedRulePacks: ACCOUNTING_METHOD_RULE_PACKS
  });
  const state = {
    methodProfiles: new Map(),
    methodProfileIdsByCompany: new Map(),
    methodChangeRequests: new Map(),
    methodChangeRequestIdsByCompany: new Map(),
    eligibilityAssessments: new Map(),
    eligibilityAssessmentIdsByCompany: new Map(),
    yearEndCatchUpRuns: new Map(),
    yearEndCatchUpRunIdsByCompany: new Map(),
    yearEndCatchUpRunIdByDedupeKey: new Map(),
    auditEvents: []
  };

  if (seedDemo) {
    seedDemoCompany(state, clock, resolveAccountingMethodRulePack(currentDate(clock)));
  }

  const engine = {
    accountingMethodCodes: ACCOUNTING_METHOD_CODES,
    accountingMethodProfileStatuses: ACCOUNTING_METHOD_PROFILE_STATUSES,
    methodChangeRequestStatuses: METHOD_CHANGE_REQUEST_STATUSES,
    yearEndCatchUpRunStatuses: YEAR_END_CATCH_UP_RUN_STATUSES,
    assessCashMethodEligibility,
    listMethodEligibilityAssessments,
    getMethodEligibilityAssessment,
    createMethodProfile,
    listMethodProfiles,
    getMethodProfile,
    activateMethodProfile,
    getActiveMethodForDate,
    getMethodHistory,
    submitMethodChangeRequest,
    listMethodChangeRequests,
    approveMethodChangeRequest,
    rejectMethodChangeRequest,
    runYearEndCatchUp,
    reverseYearEndCatchUpRun,
    listYearEndCatchUpRuns,
    getYearEndCatchUpRun,
    listAccountingMethodAuditEvents
  };

  Object.defineProperty(engine, "rulePackGovernance", {
    value: Object.freeze({
      listRulePacks: (filters = {}) => rules.listRulePacks({ domain: "accounting_method", jurisdiction: "SE", ...filters }),
      getRulePack: (filters) => rules.getRulePack(filters),
      createDraftRulePackVersion: (input) => rules.createDraftRulePackVersion(input),
      validateRulePackVersion: (input) => rules.validateRulePackVersion(input),
      approveRulePackVersion: (input) => rules.approveRulePackVersion(input),
      publishRulePackVersion: (input) => rules.publishRulePackVersion(input),
      rollbackRulePackVersion: (input) => rules.rollbackRulePackVersion(input),
      listRulePackRollbacks: (filters = {}) => rules.listRulePackRollbacks({ domain: "accounting_method", jurisdiction: "SE", ...filters })
    }),
    enumerable: false
  });


  Object.defineProperty(engine, "__durableState", {
    value: state,
    enumerable: false
  });

  return engine;

  function assessCashMethodEligibility({
    companyId,
    assessmentDate = null,
    annualNetTurnoverSek,
    legalFormCode,
    financialEntityClassification = "NON_FINANCIAL",
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedAssessmentDate = normalizeDate(assessmentDate || currentDate(clock), "assessment_date_invalid");
    const resolvedLegalFormCode = normalizeCode(legalFormCode, "legal_form_code_required");
    const resolvedAnnualNetTurnoverSek = normalizeMoney(annualNetTurnoverSek, "annual_net_turnover_invalid");
    const resolvedFinancialEntityClassification = assertAllowed(
      normalizeCode(financialEntityClassification, "financial_entity_classification_required"),
      FINANCIAL_ENTITY_CLASSIFICATIONS,
      "financial_entity_classification_invalid"
    );
    const blockingReasons = [];
    const rulePack = resolveAccountingMethodRulePack(resolvedAssessmentDate);

    if (resolvedAnnualNetTurnoverSek > CASH_METHOD_NET_TURNOVER_LIMIT_SEK) {
      blockingReasons.push(CASH_METHOD_BLOCKING_REASONS.turnover);
    }
    if (resolvedFinancialEntityClassification !== "NON_FINANCIAL") {
      blockingReasons.push(CASH_METHOD_BLOCKING_REASONS.financialEntity);
    }

    const assessment = Object.freeze({
      assessmentId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      assessmentDate: resolvedAssessmentDate,
      legalFormCode: resolvedLegalFormCode,
      netTurnoverBasisSek: resolvedAnnualNetTurnoverSek,
      entityTypeBasis: resolvedLegalFormCode,
      financialEntityClassification: resolvedFinancialEntityClassification,
      financialEntityExclusion: resolvedFinancialEntityClassification !== "NON_FINANCIAL",
      rulepackId: rulePack.rulePackId,
      rulepackCode: rulePack.rulePackCode,
      rulepackVersion: rulePack.version,
      rulepackChecksum: rulePack.checksum,
      eligibleForCashMethod: blockingReasons.length === 0,
      blockingReasons: Object.freeze([...blockingReasons]),
      assessedByActorId: requireText(actorId, "actor_id_required"),
      assessedAt: nowIso(clock)
    });

    state.eligibilityAssessments.set(assessment.assessmentId, assessment);
    appendToIndex(state.eligibilityAssessmentIdsByCompany, resolvedCompanyId, assessment.assessmentId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: assessment.assessedByActorId,
      action: "accounting_method.eligibility_assessed",
      entityType: "accounting_method_eligibility_assessment",
      entityId: assessment.assessmentId,
      explanation: `Assessed cash-method eligibility with turnover ${resolvedAnnualNetTurnoverSek} SEK and entity class ${resolvedFinancialEntityClassification}.`
    });
    return copy(assessment);
  }

  function listMethodEligibilityAssessments({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.eligibilityAssessmentIdsByCompany.get(resolvedCompanyId) || [])
      .map((assessmentId) => state.eligibilityAssessments.get(assessmentId))
      .filter(Boolean)
      .sort((left, right) => right.assessmentDate.localeCompare(left.assessmentDate) || right.assessedAt.localeCompare(left.assessedAt))
      .map(copy);
  }

  function getMethodEligibilityAssessment({ companyId, assessmentId } = {}) {
    return copy(requireEligibilityAssessment(state, companyId, assessmentId));
  }

  function createMethodProfile({
    companyId,
    methodCode,
    effectiveFrom,
    effectiveTo = null,
    fiscalYearStartDate = null,
    legalBasisCode = null,
    eligibilityAssessmentId,
    onboardingOverride = false,
    methodChangeRequestId = null,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedMethodCode = assertAllowed(normalizeCode(methodCode, "method_code_required"), ACCOUNTING_METHOD_CODES, "method_code_invalid");
    const resolvedEffectiveFrom = normalizeDate(effectiveFrom, "effective_from_invalid");
    const resolvedEffectiveTo = normalizeOptionalDate(effectiveTo, "effective_to_invalid");
    const resolvedFiscalYearStartDate = normalizeOptionalDate(fiscalYearStartDate, "fiscal_year_start_date_invalid");
    const resolvedOnboardingOverride = onboardingOverride === true;
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const assessment = requireEligibilityAssessment(state, resolvedCompanyId, eligibilityAssessmentId);
    const linkedMethodChangeRequestId = normalizeOptionalText(methodChangeRequestId);
    const methodChangeRequest =
      linkedMethodChangeRequestId == null ? null : requireMethodChangeRequest(state, resolvedCompanyId, linkedMethodChangeRequestId);

    if (resolvedEffectiveTo && resolvedEffectiveTo <= resolvedEffectiveFrom) {
      throw createError(400, "method_profile_interval_invalid", "effectiveTo must be later than effectiveFrom.");
    }
    if (!resolvedOnboardingOverride && resolvedFiscalYearStartDate == null) {
      throw createError(
        409,
        "method_profile_fiscal_year_start_required",
        "Method profiles require fiscalYearStartDate unless onboardingOverride is enabled."
      );
    }
    if (!resolvedOnboardingOverride && resolvedFiscalYearStartDate && resolvedEffectiveFrom !== resolvedFiscalYearStartDate) {
      throw createError(
        409,
        "method_profile_effective_from_must_match_fiscal_year_start",
        "Method profiles may only start on the first day of the fiscal year unless onboardingOverride is enabled."
      );
    }
    if (resolvedMethodCode === "KONTANTMETOD" && !assessment.eligibleForCashMethod) {
      throw createError(409, "cash_method_not_eligible", "The company is not eligible for cash accounting under the recorded assessment.");
    }
    if (methodChangeRequest) {
      if (methodChangeRequest.status !== "approved") {
        throw createError(409, "method_change_request_not_approved", "A linked method change request must be approved before the profile can be created.");
      }
      if (methodChangeRequest.requestedMethodCode !== resolvedMethodCode || methodChangeRequest.requestedEffectiveFrom !== resolvedEffectiveFrom) {
        throw createError(409, "method_change_request_profile_mismatch", "The linked method change request does not match the profile method or start date.");
      }
    }

    const rulePack = resolveAccountingMethodRulePack(resolvedEffectiveFrom);
    assertNoPlannedProfileOverlap({
      state,
      companyId: resolvedCompanyId,
      effectiveFrom: resolvedEffectiveFrom,
      effectiveTo: resolvedEffectiveTo
    });

    const profile = Object.freeze({
      methodProfileId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      methodCode: resolvedMethodCode,
      effectiveFrom: resolvedEffectiveFrom,
      effectiveTo: resolvedEffectiveTo,
      rulepackId: rulePack.rulePackId,
      rulepackCode: rulePack.rulePackCode,
      rulepackVersion: rulePack.version,
      rulepackChecksum: rulePack.checksum,
      fiscalYearStartDate: resolvedFiscalYearStartDate,
      legalBasisCode: normalizeOptionalText(legalBasisCode) || defaultLegalBasisCode(resolvedMethodCode),
      eligibilityAssessmentId: assessment.assessmentId,
      eligibilitySnapshot: copy({
        eligibleForCashMethod: assessment.eligibleForCashMethod,
        blockingReasons: assessment.blockingReasons,
        netTurnoverBasisSek: assessment.netTurnoverBasisSek,
        legalFormCode: assessment.legalFormCode,
        financialEntityClassification: assessment.financialEntityClassification,
        rulepackId: assessment.rulepackId,
        rulepackCode: assessment.rulepackCode,
        rulepackVersion: assessment.rulepackVersion,
        rulepackChecksum: assessment.rulepackChecksum
      }),
      status: "planned",
      onboardingOverride: resolvedOnboardingOverride,
      methodChangeRequestId: linkedMethodChangeRequestId,
      approvedBy: null,
      approvedAt: null,
      activatedBy: null,
      activatedAt: null,
      createdByActorId: resolvedActorId,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock),
      supersededBy: null
    });

    state.methodProfiles.set(profile.methodProfileId, profile);
    appendToIndex(state.methodProfileIdsByCompany, resolvedCompanyId, profile.methodProfileId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      action: "accounting_method.profile_created",
      entityType: "accounting_method_profile",
      entityId: profile.methodProfileId,
      explanation: `Created planned ${resolvedMethodCode} method profile effective ${resolvedEffectiveFrom}.`
    });
    return copy(profile);
  }

  function listMethodProfiles({ companyId, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = normalizeOptionalStatus(status, ACCOUNTING_METHOD_PROFILE_STATUSES, "method_profile_status_invalid");
    return listProfilesByCompany(state, resolvedCompanyId)
      .filter((profile) => (resolvedStatus ? profile.status === resolvedStatus : true))
      .map(copy);
  }

  function getMethodProfile({ companyId, methodProfileId } = {}) {
    return copy(requireMethodProfile(state, companyId, methodProfileId));
  }

  function activateMethodProfile({ companyId, methodProfileId, actorId = "system" } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const profile = requireMethodProfile(state, resolvedCompanyId, methodProfileId);
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const today = currentDate(clock);

    if (profile.status !== "planned") {
      throw createError(409, "method_profile_not_planned", "Only planned method profiles can be activated.");
    }
    if (profile.effectiveFrom > today) {
      throw createError(409, "method_profile_activation_too_early", "A method profile cannot be activated before its effectiveFrom date.");
    }

    if (profile.methodChangeRequestId) {
      const request = requireMethodChangeRequest(state, resolvedCompanyId, profile.methodChangeRequestId);
      if (request.status !== "approved") {
        throw createError(409, "method_change_request_not_approved", "The linked method change request is not approved.");
      }
    }

    const incompleteCatchUpRun = (state.yearEndCatchUpRunIdsByCompany.get(resolvedCompanyId) || [])
      .map((runId) => state.yearEndCatchUpRuns.get(runId))
      .filter(Boolean)
      .find((run) => !["completed", "reversed"].includes(run.status));
    if (incompleteCatchUpRun) {
      throw createError(409, "year_end_catch_up_pending", "An incomplete year-end catch-up run must be resolved before activating a new method profile.");
    }

    const activeProfiles = listProfilesByCompany(state, resolvedCompanyId).filter((candidate) => candidate.status === "active");
    if (activeProfiles.length > 1) {
      throw createError(409, "method_profile_overlap_detected", "Multiple active method profiles already exist for the company.");
    }

    for (const activeProfile of activeProfiles) {
      if (activeProfile.methodProfileId === profile.methodProfileId) {
        continue;
      }
      if (profile.effectiveFrom <= activeProfile.effectiveFrom) {
        throw createError(409, "method_profile_activation_conflict", "The new method profile must start after the currently active profile.");
      }
      replaceMethodProfile(state, activeProfile.methodProfileId, {
        status: "historical",
        effectiveTo: profile.effectiveFrom,
        updatedAt: nowIso(clock),
        supersededBy: profile.methodProfileId
      });
    }

    const activatedProfile = replaceMethodProfile(state, profile.methodProfileId, {
      status: "active",
      approvedBy: resolvedActorId,
      approvedAt: profile.approvedAt || nowIso(clock),
      activatedBy: resolvedActorId,
      activatedAt: nowIso(clock),
      updatedAt: nowIso(clock)
    });

    if (activatedProfile.methodChangeRequestId) {
      const request = requireMethodChangeRequest(state, resolvedCompanyId, activatedProfile.methodChangeRequestId);
      replaceMethodChangeRequest(state, request.methodChangeRequestId, {
        status: "implemented",
        implementedAt: nowIso(clock),
        updatedAt: nowIso(clock)
      });
    }

    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      action: "accounting_method.profile_activated",
      entityType: "accounting_method_profile",
      entityId: activatedProfile.methodProfileId,
      explanation: `Activated ${activatedProfile.methodCode} method profile from ${activatedProfile.effectiveFrom}.`
    });

    return copy(activatedProfile);
  }

  function getActiveMethodForDate({ companyId, accountingDate } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedAccountingDate = normalizeDate(accountingDate, "accounting_date_invalid");
    const matchingProfiles = listProfilesByCompany(state, resolvedCompanyId).filter((profile) =>
      profile.status !== "planned" && coversDate(profile.effectiveFrom, profile.effectiveTo, resolvedAccountingDate)
    );

    if (matchingProfiles.length === 0) {
      throw createError(404, "active_method_not_found", "No active accounting method profile covers the requested date.");
    }
    if (matchingProfiles.length > 1) {
      throw createError(409, "active_method_ambiguous", "More than one accounting method profile covers the requested date.");
    }

    const profile = matchingProfiles[0];
    return copy({
      ...profile,
      accountingDate: resolvedAccountingDate,
      timingMode: profile.methodCode === "KONTANTMETOD" ? "payment_date_with_year_end_catch_up" : "invoice_date_accrual"
    });
  }

  function getMethodHistory({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return copy({
      profiles: listProfilesByCompany(state, resolvedCompanyId),
      changeRequests: listMethodChangeRequests({ companyId: resolvedCompanyId }),
      eligibilityAssessments: listMethodEligibilityAssessments({ companyId: resolvedCompanyId }),
      yearEndCatchUpRuns: listYearEndCatchUpRuns({ companyId: resolvedCompanyId })
    });
  }

  function submitMethodChangeRequest({
    companyId,
    requestedMethodCode,
    requestedEffectiveFrom,
    reasonCode,
    fiscalYearStartDate = null,
    onboardingOverride = false,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedRequestedMethodCode = assertAllowed(
      normalizeCode(requestedMethodCode, "requested_method_code_required"),
      ACCOUNTING_METHOD_CODES,
      "requested_method_code_invalid"
    );
    const resolvedRequestedEffectiveFrom = normalizeDate(requestedEffectiveFrom, "requested_effective_from_invalid");
    const resolvedReasonCode = normalizeCode(reasonCode, "reason_code_required");
    const resolvedFiscalYearStartDate = normalizeOptionalDate(fiscalYearStartDate, "fiscal_year_start_date_invalid");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedOnboardingOverride = onboardingOverride === true;

    if (!resolvedOnboardingOverride && resolvedFiscalYearStartDate == null) {
      throw createError(
        409,
        "method_change_request_fiscal_year_start_required",
        "Method change requests require fiscalYearStartDate unless onboardingOverride is enabled."
      );
    }
    if (!resolvedOnboardingOverride && resolvedFiscalYearStartDate && resolvedRequestedEffectiveFrom !== resolvedFiscalYearStartDate) {
      throw createError(
        409,
        "method_change_request_effective_from_invalid",
        "Method change requests must start on the first day of the fiscal year unless onboardingOverride is enabled."
      );
    }

    const currentProfile = resolveCurrentProfileForChange(state, resolvedCompanyId, resolvedRequestedEffectiveFrom);
    if (currentProfile && currentProfile.methodCode === resolvedRequestedMethodCode) {
      throw createError(409, "method_change_request_no_change", "The requested method already applies for the requested period.");
    }
    if (!currentProfile && !resolvedOnboardingOverride) {
      throw createError(409, "method_change_request_current_profile_missing", "A method change request requires an existing method profile unless onboardingOverride is enabled.");
    }

    const methodChangeRequestId = crypto.randomUUID();
    const request = Object.freeze({
      methodChangeRequestId,
      companyId: resolvedCompanyId,
      currentMethodCode: currentProfile?.methodCode || null,
      requestedMethodCode: resolvedRequestedMethodCode,
      requestedEffectiveFrom: resolvedRequestedEffectiveFrom,
      fiscalYearStartDate: resolvedFiscalYearStartDate,
      reasonCode: resolvedReasonCode,
      requestedByActorId: resolvedActorId,
      requestedAt: nowIso(clock),
      status: "submitted",
      decisionNote: null,
      approvedBy: null,
      approvedAt: null,
      implementedAt: null,
      supersededByMethodChangeRequestId: null,
      onboardingOverride: resolvedOnboardingOverride,
      updatedAt: nowIso(clock)
    });

    const supersededRequests = (state.methodChangeRequestIdsByCompany.get(resolvedCompanyId) || [])
      .map((requestId) => state.methodChangeRequests.get(requestId))
      .filter(Boolean)
      .filter((candidate) => ["submitted", "under_review", "approved"].includes(candidate.status))
      .filter((candidate) => candidate.requestedEffectiveFrom === resolvedRequestedEffectiveFrom);
    for (const candidate of supersededRequests) {
      replaceMethodChangeRequest(state, candidate.methodChangeRequestId, {
        status: "superseded",
        supersededByMethodChangeRequestId: methodChangeRequestId,
        updatedAt: nowIso(clock)
      });
    }

    state.methodChangeRequests.set(request.methodChangeRequestId, request);
    appendToIndex(state.methodChangeRequestIdsByCompany, resolvedCompanyId, request.methodChangeRequestId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      action: "accounting_method.change_request_submitted",
      entityType: "accounting_method_change_request",
      entityId: request.methodChangeRequestId,
      explanation: `Submitted method change request to ${resolvedRequestedMethodCode} effective ${resolvedRequestedEffectiveFrom}.`
    });
    return copy(request);
  }

  function listMethodChangeRequests({ companyId, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = normalizeOptionalStatus(status, METHOD_CHANGE_REQUEST_STATUSES, "method_change_request_status_invalid");
    return (state.methodChangeRequestIdsByCompany.get(resolvedCompanyId) || [])
      .map((requestId) => state.methodChangeRequests.get(requestId))
      .filter(Boolean)
      .filter((request) => (resolvedStatus ? request.status === resolvedStatus : true))
      .sort((left, right) => left.requestedEffectiveFrom.localeCompare(right.requestedEffectiveFrom) || left.requestedAt.localeCompare(right.requestedAt))
      .map(copy);
  }

  function approveMethodChangeRequest({ companyId, methodChangeRequestId, actorId = "system", decisionNote = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const request = requireMethodChangeRequest(state, resolvedCompanyId, methodChangeRequestId);
    const resolvedActorId = requireText(actorId, "actor_id_required");

    if (!["submitted", "under_review"].includes(request.status)) {
      throw createError(409, "method_change_request_not_approvable", "Only submitted or under-review method change requests can be approved.");
    }

    const approvedRequest = replaceMethodChangeRequest(state, request.methodChangeRequestId, {
      status: "approved",
      decisionNote: normalizeOptionalText(decisionNote),
      approvedBy: resolvedActorId,
      approvedAt: nowIso(clock),
      updatedAt: nowIso(clock)
    });
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      action: "accounting_method.change_request_approved",
      entityType: "accounting_method_change_request",
      entityId: approvedRequest.methodChangeRequestId,
      explanation: `Approved change request to ${approvedRequest.requestedMethodCode} effective ${approvedRequest.requestedEffectiveFrom}.`
    });
    return copy(approvedRequest);
  }

  function rejectMethodChangeRequest({ companyId, methodChangeRequestId, actorId = "system", decisionNote } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const request = requireMethodChangeRequest(state, resolvedCompanyId, methodChangeRequestId);
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedDecisionNote = requireText(decisionNote, "decision_note_required");

    if (!["submitted", "under_review"].includes(request.status)) {
      throw createError(409, "method_change_request_not_rejectable", "Only submitted or under-review method change requests can be rejected.");
    }

    const rejectedRequest = replaceMethodChangeRequest(state, request.methodChangeRequestId, {
      status: "rejected",
      decisionNote: resolvedDecisionNote,
      approvedBy: resolvedActorId,
      approvedAt: nowIso(clock),
      updatedAt: nowIso(clock)
    });
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      action: "accounting_method.change_request_rejected",
      entityType: "accounting_method_change_request",
      entityId: rejectedRequest.methodChangeRequestId,
      explanation: `Rejected change request to ${rejectedRequest.requestedMethodCode}.`
    });
    return copy(rejectedRequest);
  }

  function runYearEndCatchUp({ companyId, fiscalYearEndDate, openItems, actorId = "system" } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedFiscalYearEndDate = normalizeDate(fiscalYearEndDate, "fiscal_year_end_date_invalid");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const activeMethod = getActiveMethodForDate({ companyId: resolvedCompanyId, accountingDate: resolvedFiscalYearEndDate });

    if (activeMethod.methodCode !== "KONTANTMETOD") {
      throw createError(409, "year_end_catch_up_requires_cash_method", "Year-end catch-up may only run when the active method is cash accounting.");
    }

    const ledgerPlatform = requireYearEndLedgerPlatform(getLedgerPlatform);
    const accountingCurrencyCode = resolveAccountingCurrencyCode(ledgerPlatform, resolvedCompanyId);
    const normalizedOpenItems = normalizeOpenItems(openItems, resolvedFiscalYearEndDate, accountingCurrencyCode);
    const capturedItems = normalizedOpenItems.filter((item) => item.recognitionDate <= resolvedFiscalYearEndDate && item.unpaidAmount > 0);
    const rulePack = resolveAccountingMethodRulePack(resolvedFiscalYearEndDate);
    const snapshotHash = buildSnapshotHash({
      companyId: resolvedCompanyId,
      fiscalYearEndDate: resolvedFiscalYearEndDate,
      capturedItems
    });
    const dedupeKey = `${resolvedCompanyId}:${resolvedFiscalYearEndDate}:${snapshotHash}`;
    const existingRunId = state.yearEndCatchUpRunIdByDedupeKey.get(dedupeKey);
    if (existingRunId) {
      return copy(state.yearEndCatchUpRuns.get(existingRunId));
    }

    const totals = capturedItems.reduce(
      (accumulator, item) => {
        if (isReceivableItemType(item.openItemType)) {
          accumulator.receivablesAmount = roundMoney(accumulator.receivablesAmount + item.unpaidAmount);
        } else {
          accumulator.payablesAmount = roundMoney(accumulator.payablesAmount + item.unpaidAmount);
        }
        return accumulator;
      },
      { receivablesAmount: 0, payablesAmount: 0 }
    );
    const journalEntryId =
      capturedItems.length === 0
        ? null
        : postYearEndCatchUpJournal({
          ledgerPlatform,
          companyId: resolvedCompanyId,
          fiscalYearEndDate: resolvedFiscalYearEndDate,
          snapshotHash,
          activeMethod,
          actorId: resolvedActorId,
          items: capturedItems,
          rulePack
        });

    const run = Object.freeze({
      yearEndCatchUpRunId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      fiscalYearEndDate: resolvedFiscalYearEndDate,
      methodProfileId: activeMethod.methodProfileId,
      methodCode: activeMethod.methodCode,
      rulepackId: rulePack.rulePackId,
      rulepackCode: rulePack.rulePackCode,
      rulepackVersion: rulePack.version,
      rulepackChecksum: rulePack.checksum,
      timingSignal: "year_end_catch_up",
      status: "completed",
      snapshotHash,
      capturedItemCount: capturedItems.length,
      accountingCurrencyCode,
      journalEntryId,
      reversalJournalEntryId: null,
      totals,
      items: Object.freeze(
        capturedItems.map((item) =>
          Object.freeze({
            ...item,
            postingIntentCode: isReceivableItemType(item.openItemType)
              ? "cash_method_year_end_receivable"
              : "cash_method_year_end_payable"
          })
        )
      ),
      createdByActorId: resolvedActorId,
      createdAt: nowIso(clock)
    });

    state.yearEndCatchUpRuns.set(run.yearEndCatchUpRunId, run);
    appendToIndex(state.yearEndCatchUpRunIdsByCompany, resolvedCompanyId, run.yearEndCatchUpRunId);
    state.yearEndCatchUpRunIdByDedupeKey.set(dedupeKey, run.yearEndCatchUpRunId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      action: "accounting_method.year_end_catch_up_completed",
      entityType: "accounting_method_year_end_catch_up_run",
      entityId: run.yearEndCatchUpRunId,
      explanation: `Captured ${run.capturedItemCount} unpaid items for cash-method year-end catch-up on ${resolvedFiscalYearEndDate}.`
    });
    return copy(run);
  }

  function reverseYearEndCatchUpRun({
    companyId,
    yearEndCatchUpRunId,
    reasonCode,
    reversedOn = null,
    actorId = "system",
    approvedByActorId = null,
    approvedByRoleCode = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const run = requireYearEndCatchUpRun(state, resolvedCompanyId, yearEndCatchUpRunId);
    if (run.status === "reversed") {
      return copy(run);
    }
    if (!run.journalEntryId) {
      throw createError(409, "year_end_catch_up_not_posted", "Year-end catch-up run does not have a posted journal to reverse.");
    }
    const ledgerPlatform = requireYearEndLedgerPlatform(getLedgerPlatform);
    const reversed = ledgerPlatform.reverseJournalEntry({
      companyId: resolvedCompanyId,
      journalEntryId: run.journalEntryId,
      actorId: requireText(actorId, "actor_id_required"),
      approvedByActorId: requireText(approvedByActorId, "approved_by_actor_id_required"),
      approvedByRoleCode: requireText(approvedByRoleCode, "approved_by_role_code_required"),
      reasonCode: requireText(reasonCode, "reason_code_required"),
      correctionKey: `year_end_catch_up:${run.yearEndCatchUpRunId}`,
      journalDate: reversedOn ? normalizeDate(reversedOn, "year_end_catch_up_reversed_on_invalid") : null
    });
    const reversedRun = replaceYearEndCatchUpRun(state, run.yearEndCatchUpRunId, {
      status: "reversed",
      reversalJournalEntryId: reversed.reversalJournalEntry.journalEntryId,
      reversedAt: nowIso(clock),
      reversedByActorId: requireText(actorId, "actor_id_required")
    });
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: requireText(actorId, "actor_id_required"),
      action: "accounting_method.year_end_catch_up_reversed",
      entityType: "accounting_method_year_end_catch_up_run",
      entityId: reversedRun.yearEndCatchUpRunId,
      explanation: `Reversed year-end catch-up run ${reversedRun.yearEndCatchUpRunId}.`
    });
    return copy(reversedRun);
  }

  function listYearEndCatchUpRuns({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.yearEndCatchUpRunIdsByCompany.get(resolvedCompanyId) || [])
      .map((runId) => state.yearEndCatchUpRuns.get(runId))
      .filter(Boolean)
      .sort((left, right) => left.fiscalYearEndDate.localeCompare(right.fiscalYearEndDate) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function getYearEndCatchUpRun({ companyId, yearEndCatchUpRunId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const run = state.yearEndCatchUpRuns.get(requireText(yearEndCatchUpRunId, "year_end_catch_up_run_id_required"));
    if (!run || run.companyId !== resolvedCompanyId) {
      throw createError(404, "year_end_catch_up_run_not_found", "Year-end catch-up run was not found.");
    }
    return copy(run);
  }

  function listAccountingMethodAuditEvents({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return state.auditEvents.filter((event) => event.companyId === resolvedCompanyId).map(copy);
  }

  function resolveAccountingMethodRulePack(effectiveDate) {
    return rules.resolveRulePack({
      rulePackCode: ACCOUNTING_METHOD_RULEPACK_CODE,
      domain: "accounting_method",
      jurisdiction: "SE",
      effectiveDate
    });
  }
}

function seedDemoCompany(state, clock, rulePack) {
  const assessedAt = nowIso(clock);
  const assessment = Object.freeze({
    assessmentId: crypto.randomUUID(),
    companyId: DEMO_COMPANY_ID,
    assessmentDate: currentDate(clock),
    legalFormCode: "AB",
    netTurnoverBasisSek: 4_250_000,
    entityTypeBasis: "AB",
    financialEntityClassification: "NON_FINANCIAL",
    financialEntityExclusion: false,
    rulepackId: rulePack.rulePackId,
    rulepackCode: rulePack.rulePackCode,
    rulepackVersion: rulePack.version,
    rulepackChecksum: rulePack.checksum,
    eligibleForCashMethod: false,
    blockingReasons: Object.freeze([CASH_METHOD_BLOCKING_REASONS.turnover]),
    assessedByActorId: "seed",
    assessedAt
  });
  state.eligibilityAssessments.set(assessment.assessmentId, assessment);
  appendToIndex(state.eligibilityAssessmentIdsByCompany, DEMO_COMPANY_ID, assessment.assessmentId);

  const profile = Object.freeze({
    methodProfileId: crypto.randomUUID(),
    companyId: DEMO_COMPANY_ID,
    methodCode: "FAKTURERINGSMETOD",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    rulepackId: rulePack.rulePackId,
    rulepackCode: rulePack.rulePackCode,
    rulepackVersion: rulePack.version,
    rulepackChecksum: rulePack.checksum,
    fiscalYearStartDate: "2026-01-01",
    legalBasisCode: INVOICE_METHOD_LEGAL_BASIS_CODE,
    eligibilityAssessmentId: assessment.assessmentId,
    eligibilitySnapshot: copy({
      eligibleForCashMethod: assessment.eligibleForCashMethod,
      blockingReasons: assessment.blockingReasons,
      netTurnoverBasisSek: assessment.netTurnoverBasisSek,
      legalFormCode: assessment.legalFormCode,
      financialEntityClassification: assessment.financialEntityClassification,
      rulepackId: assessment.rulepackId,
      rulepackCode: assessment.rulepackCode,
      rulepackVersion: assessment.rulepackVersion,
      rulepackChecksum: assessment.rulepackChecksum
    }),
    status: "active",
    onboardingOverride: true,
    methodChangeRequestId: null,
    approvedBy: "seed",
    approvedAt: assessedAt,
    activatedBy: "seed",
    activatedAt: assessedAt,
    createdByActorId: "seed",
    createdAt: assessedAt,
    updatedAt: assessedAt,
    supersededBy: null
  });
  state.methodProfiles.set(profile.methodProfileId, profile);
  appendToIndex(state.methodProfileIdsByCompany, DEMO_COMPANY_ID, profile.methodProfileId);
}

function listProfilesByCompany(state, companyId) {
  return (state.methodProfileIdsByCompany.get(companyId) || [])
    .map((profileId) => state.methodProfiles.get(profileId))
    .filter(Boolean)
    .sort((left, right) => left.effectiveFrom.localeCompare(right.effectiveFrom) || left.createdAt.localeCompare(right.createdAt));
}

function resolveCurrentProfileForChange(state, companyId, effectiveDate) {
  return listProfilesByCompany(state, companyId).find((profile) => profile.status !== "planned" && coversDate(profile.effectiveFrom, profile.effectiveTo, effectiveDate)) || null;
}

function requireMethodProfile(state, companyId, methodProfileId) {
  const profile = state.methodProfiles.get(requireText(methodProfileId, "method_profile_id_required"));
  if (!profile || profile.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "method_profile_not_found", "Accounting method profile was not found.");
  }
  return profile;
}

function requireMethodChangeRequest(state, companyId, methodChangeRequestId) {
  const request = state.methodChangeRequests.get(requireText(methodChangeRequestId, "method_change_request_id_required"));
  if (!request || request.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "method_change_request_not_found", "Accounting method change request was not found.");
  }
  return request;
}

function requireYearEndCatchUpRun(state, companyId, yearEndCatchUpRunId) {
  const run = state.yearEndCatchUpRuns.get(requireText(yearEndCatchUpRunId, "year_end_catch_up_run_id_required"));
  if (!run || run.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "year_end_catch_up_run_not_found", "Year-end catch-up run was not found.");
  }
  return run;
}

function requireEligibilityAssessment(state, companyId, assessmentId) {
  const assessment = state.eligibilityAssessments.get(requireText(assessmentId, "eligibility_assessment_id_required"));
  if (!assessment || assessment.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "eligibility_assessment_not_found", "Accounting method eligibility assessment was not found.");
  }
  return assessment;
}

function replaceMethodProfile(state, methodProfileId, updates) {
  const existing = state.methodProfiles.get(methodProfileId);
  const next = Object.freeze({
    ...existing,
    ...copy(updates)
  });
  state.methodProfiles.set(methodProfileId, next);
  return next;
}

function replaceMethodChangeRequest(state, methodChangeRequestId, updates) {
  const existing = state.methodChangeRequests.get(methodChangeRequestId);
  const next = Object.freeze({
    ...existing,
    ...copy(updates)
  });
  state.methodChangeRequests.set(methodChangeRequestId, next);
  return next;
}

function replaceYearEndCatchUpRun(state, yearEndCatchUpRunId, updates) {
  const existing = state.yearEndCatchUpRuns.get(yearEndCatchUpRunId);
  const next = Object.freeze({
    ...existing,
    ...copy(updates)
  });
  state.yearEndCatchUpRuns.set(yearEndCatchUpRunId, next);
  return next;
}

function assertNoPlannedProfileOverlap({ state, companyId, effectiveFrom, effectiveTo }) {
  const overlappingPlannedProfile = listProfilesByCompany(state, companyId).find(
    (profile) => profile.status === "planned" && intervalsOverlap(profile.effectiveFrom, profile.effectiveTo, effectiveFrom, effectiveTo)
  );
  if (overlappingPlannedProfile) {
    throw createError(409, "planned_method_profile_overlap", "A planned method profile already overlaps the requested interval.");
  }
}

function normalizeOpenItems(openItems, fiscalYearEndDate, accountingCurrencyCode = "SEK") {
  if (!Array.isArray(openItems)) {
    throw createError(400, "year_end_open_items_invalid", "openItems must be an array.");
  }
  return openItems.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw createError(400, "year_end_open_item_invalid", `Open item ${index + 1} must be an object.`);
    }
    const openItemType = assertAllowed(
      normalizeCode(item.openItemType || item.sourceType, "year_end_open_item_type_required"),
      YEAR_END_OPEN_ITEM_TYPES,
      "year_end_open_item_type_invalid"
    );
    const recognitionDate = normalizeDate(
      item.recognitionDate || item.invoiceDate || item.documentDate || fiscalYearEndDate,
      "year_end_open_item_recognition_date_invalid"
    );
    const currencyCode = normalizeOptionalText(item.currency) || accountingCurrencyCode;
    const functionalUnpaidAmount = resolveFunctionalAmount({
      amount: item.unpaidAmount,
      currencyCode,
      accountingCurrencyCode,
      exchangeRate: item.exchangeRate,
      functionalAmount: item.functionalUnpaidAmount,
      amountCode: "year_end_open_item_unpaid_amount_invalid",
      functionalAmountCode: "year_end_open_item_functional_unpaid_amount_invalid",
      exchangeRateCode: "year_end_open_item_exchange_rate_invalid"
    });
    const openItemTypeIsReceivable = isReceivableItemType(openItemType);
    const postingLines = normalizeCatchUpPostingLines({
      postingLines: item.postingLines,
      openItemType,
      sourceId: item.sourceId,
      accountingCurrencyCode,
      openItemFunctionalAmount: functionalUnpaidAmount
    });
    return Object.freeze({
      openItemType,
      sourceType: normalizeOptionalText(item.sourceType) || openItemType.toLowerCase(),
      sourceId: requireText(item.sourceId, "year_end_open_item_source_id_required"),
      recognitionDate,
      dueDate: normalizeOptionalDate(item.dueDate, "year_end_open_item_due_date_invalid"),
      unpaidAmount: normalizeMoney(item.unpaidAmount, "year_end_open_item_unpaid_amount_invalid"),
      functionalUnpaidAmount,
      currency: currencyCode,
      exchangeRate:
        currencyCode === accountingCurrencyCode
          ? null
          : normalizePositiveNumber(item.exchangeRate, "year_end_open_item_exchange_rate_invalid"),
      vatAmount: normalizeOptionalMoney(item.vatAmount, "year_end_open_item_vat_amount_invalid"),
      counterpartyId: normalizeOptionalText(item.counterpartyId),
      openItemAccountNumber: normalizeAccountNumber(
        item.openItemAccountNumber
          || (openItemTypeIsReceivable ? DEFAULT_CASH_METHOD_RECEIVABLE_ACCOUNT_NUMBER : DEFAULT_CASH_METHOD_PAYABLE_ACCOUNT_NUMBER),
        "year_end_open_item_account_number_required"
      ),
      accountingCurrencyCode,
      postingLines
    });
  });
}

function requireYearEndLedgerPlatform(getLedgerPlatform) {
  const ledgerPlatform = typeof getLedgerPlatform === "function" ? getLedgerPlatform() : null;
  if (!ledgerPlatform || typeof ledgerPlatform.applyPostingIntent !== "function" || typeof ledgerPlatform.reverseJournalEntry !== "function") {
    throw createError(500, "ledger_platform_required_for_year_end_catch_up", "Ledger platform is required for real year-end catch-up postings.");
  }
  return ledgerPlatform;
}

function resolveAccountingCurrencyCode(ledgerPlatform, companyId) {
  if (!ledgerPlatform || typeof ledgerPlatform.getAccountingCurrencyProfile !== "function") {
    return "SEK";
  }
  return ledgerPlatform.getAccountingCurrencyProfile({ companyId }).accountingCurrencyCode || "SEK";
}

function postYearEndCatchUpJournal({
  ledgerPlatform,
  companyId,
  fiscalYearEndDate,
  snapshotHash,
  activeMethod,
  actorId,
  items,
  rulePack
}) {
  if (typeof ledgerPlatform.ensureAccountingYearPeriod === "function") {
    ledgerPlatform.ensureAccountingYearPeriod({
      companyId,
      fiscalYear: Number(fiscalYearEndDate.slice(0, 4)),
      actorId
    });
  }
  const journalLines = buildYearEndCatchUpJournalLines(items);
  const posted = ledgerPlatform.applyPostingIntent({
    companyId,
    journalDate: fiscalYearEndDate,
    recipeCode: "YEAR_END_ADJUSTMENT",
    postingSignalCode: "accounting_method.year_end_catch_up.completed",
    sourceType: "YEAR_END_TRANSFER",
    sourceId: `cash_method_year_end_catch_up:${companyId}:${fiscalYearEndDate}:${snapshotHash}`,
    sourceObjectVersion: snapshotHash,
    actorId,
    idempotencyKey: `cash_method_year_end_catch_up:${companyId}:${fiscalYearEndDate}:${snapshotHash}`,
    description: `Cash-method year-end catch-up ${fiscalYearEndDate}`,
    metadataJson: {
      pipelineStage: "cash_method_year_end_catch_up",
      accountingMethodProfileId: activeMethod.methodProfileId,
      accountingMethodCode: activeMethod.methodCode,
      timingSignal: "year_end_catch_up",
      snapshotHash,
      rulepackId: rulePack.rulePackId,
      rulepackCode: rulePack.rulePackCode,
      rulepackVersion: rulePack.version,
      rulepackChecksum: rulePack.checksum
    },
    lines: journalLines
  });
  return posted.journalEntry.journalEntryId;
}

function buildYearEndCatchUpJournalLines(items) {
  let lineNumber = 1;
  const lines = [];
  for (const item of items) {
    const receivable = isReceivableItemType(item.openItemType);
    lines.push({
      accountNumber: item.openItemAccountNumber,
      debitAmount: receivable ? item.unpaidAmount : 0,
      creditAmount: receivable ? 0 : item.unpaidAmount,
      currencyCode: item.currency,
      exchangeRate: item.exchangeRate,
      functionalDebitAmount: receivable ? item.functionalUnpaidAmount : 0,
      functionalCreditAmount: receivable ? 0 : item.functionalUnpaidAmount,
      lineNumber,
      sourceType: "YEAR_END_TRANSFER",
      sourceId: `${item.sourceId}:open_item`
    });
    lineNumber += 1;
    for (const postingLine of item.postingLines) {
      lines.push({
        ...postingLine,
        lineNumber,
        sourceType: "YEAR_END_TRANSFER",
        sourceId: postingLine.sourceId || item.sourceId
      });
      lineNumber += 1;
    }
  }
  return lines;
}

function normalizeCatchUpPostingLines({
  postingLines,
  openItemType,
  sourceId,
  accountingCurrencyCode,
  openItemFunctionalAmount
}) {
  if (!Array.isArray(postingLines) || postingLines.length === 0) {
    throw createError(409, "year_end_open_item_posting_lines_required", "Year-end catch-up items require explicit posting lines.");
  }
  const receivable = isReceivableItemType(openItemType);
  let totalFunctionalDebit = 0;
  let totalFunctionalCredit = 0;
  const normalizedLines = postingLines.map((line, index) => {
    if (!line || typeof line !== "object" || Array.isArray(line)) {
      throw createError(400, "year_end_open_item_posting_line_invalid", `Posting line ${index + 1} must be an object.`);
    }
    const debitAmount = normalizeMoney(line.debitAmount || 0, "year_end_open_item_posting_line_amount_invalid");
    const creditAmount = normalizeMoney(line.creditAmount || 0, "year_end_open_item_posting_line_amount_invalid");
    if ((debitAmount > 0 && creditAmount > 0) || (debitAmount === 0 && creditAmount === 0)) {
      throw createError(409, "year_end_open_item_posting_line_side_invalid", "Each posting line must be either debit or credit.");
    }
    if (receivable && debitAmount > 0) {
      throw createError(409, "year_end_open_item_posting_line_direction_invalid", "Receivable catch-up lines must credit revenue/VAT side accounts.");
    }
    if (!receivable && creditAmount > 0) {
      throw createError(409, "year_end_open_item_posting_line_direction_invalid", "Payable catch-up lines must debit expense/VAT side accounts.");
    }
    const currencyCode = normalizeOptionalText(line.currencyCode) || accountingCurrencyCode;
    const exchangeRate =
      currencyCode === accountingCurrencyCode
        ? null
        : normalizePositiveNumber(line.exchangeRate, "year_end_open_item_posting_line_exchange_rate_invalid");
    const functionalDebitAmount = resolveFunctionalAmount({
      amount: debitAmount,
      currencyCode,
      accountingCurrencyCode,
      exchangeRate,
      functionalAmount: line.functionalDebitAmount,
      amountCode: "year_end_open_item_posting_line_amount_invalid",
      functionalAmountCode: "year_end_open_item_posting_line_functional_amount_invalid",
      exchangeRateCode: "year_end_open_item_posting_line_exchange_rate_invalid"
    });
    const functionalCreditAmount = resolveFunctionalAmount({
      amount: creditAmount,
      currencyCode,
      accountingCurrencyCode,
      exchangeRate,
      functionalAmount: line.functionalCreditAmount,
      amountCode: "year_end_open_item_posting_line_amount_invalid",
      functionalAmountCode: "year_end_open_item_posting_line_functional_amount_invalid",
      exchangeRateCode: "year_end_open_item_posting_line_exchange_rate_invalid"
    });
    totalFunctionalDebit = roundMoney(totalFunctionalDebit + functionalDebitAmount);
    totalFunctionalCredit = roundMoney(totalFunctionalCredit + functionalCreditAmount);
    return Object.freeze({
      accountNumber: normalizeAccountNumber(line.accountNumber, "year_end_open_item_posting_line_account_required"),
      debitAmount,
      creditAmount,
      currencyCode,
      exchangeRate,
      functionalDebitAmount,
      functionalCreditAmount,
      dimensionJson: copy(line.dimensionJson || {}),
      sourceId: normalizeOptionalText(line.sourceId) || requireText(sourceId, "year_end_open_item_source_id_required")
    });
  });
  if (receivable && totalFunctionalCredit !== openItemFunctionalAmount) {
    throw createError(409, "year_end_open_item_balance_mismatch", "Receivable catch-up lines must credit the full functional unpaid amount.");
  }
  if (!receivable && totalFunctionalDebit !== openItemFunctionalAmount) {
    throw createError(409, "year_end_open_item_balance_mismatch", "Payable catch-up lines must debit the full functional unpaid amount.");
  }
  return Object.freeze(normalizedLines);
}

function resolveFunctionalAmount({
  amount,
  currencyCode,
  accountingCurrencyCode,
  exchangeRate,
  functionalAmount,
  amountCode,
  functionalAmountCode,
  exchangeRateCode
}) {
  const normalizedAmount = normalizeMoney(amount, amountCode);
  const resolvedCurrencyCode = normalizeOptionalText(currencyCode) || accountingCurrencyCode;
  if (resolvedCurrencyCode === accountingCurrencyCode) {
    return normalizedAmount;
  }
  if (functionalAmount != null && functionalAmount !== "") {
    return normalizeMoney(functionalAmount, functionalAmountCode);
  }
  return roundMoney(normalizedAmount * normalizePositiveNumber(exchangeRate, exchangeRateCode));
}

function intervalsOverlap(leftStart, leftEnd, rightStart, rightEnd) {
  const resolvedLeftEnd = leftEnd || "9999-12-31";
  const resolvedRightEnd = rightEnd || "9999-12-31";
  return leftStart < resolvedRightEnd && rightStart < resolvedLeftEnd;
}

function coversDate(startDate, endDate, candidateDate) {
  return startDate <= candidateDate && (endDate == null || candidateDate < endDate);
}

function isReceivableItemType(openItemType) {
  return openItemType === "CUSTOMER_INVOICE" || openItemType === "RECEIVABLE";
}

function defaultLegalBasisCode(methodCode) {
  return methodCode === "KONTANTMETOD" ? CASH_METHOD_LEGAL_BASIS_CODE : INVOICE_METHOD_LEGAL_BASIS_CODE;
}

function appendToIndex(index, key, value) {
  const items = index.get(key) || [];
  items.push(value);
  index.set(key, items);
}

function pushAudit(state, clock, event) {
  state.auditEvents.push(
    createAuditEnvelopeFromLegacyEvent({
      clock,
      auditClass: "accounting_method_action",
      event
    })
  );
}

function buildSnapshotHash(value) {
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

function currentDate(clock) {
  return new Date(clock()).toISOString().slice(0, 10);
}

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

function normalizeDate(value, code) {
  const resolved = requireText(value, code);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolved)) {
    throw createError(400, code, "Date must use YYYY-MM-DD format.");
  }
  return resolved;
}

function normalizeOptionalDate(value, code) {
  if (value == null || value === "") {
    return null;
  }
  return normalizeDate(value, code);
}

function normalizeMoney(value, code) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw createError(400, code, "Amount must be a non-negative number.");
  }
  return roundMoney(numeric);
}

function normalizePositiveNumber(value, code) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw createError(400, code, "Amount must be a positive number.");
  }
  return roundMoney(numeric);
}

function normalizeOptionalMoney(value, code) {
  if (value == null || value === "") {
    return null;
  }
  return normalizeMoney(value, code);
}

function normalizeCode(value, code) {
  return requireText(String(value || ""), code)
    .replaceAll(/[^A-Za-z0-9_]+/g, "_")
    .replaceAll(/_+/g, "_")
    .replace(/^_/, "")
    .replace(/_$/, "")
    .toUpperCase();
}

function normalizeOptionalStatus(value, allowedValues, code) {
  if (value == null || value === "") {
    return null;
  }
  return assertAllowed(normalizeCode(value, code), allowedValues, code);
}

function normalizeOptionalText(value) {
  if (value == null) {
    return null;
  }
  const resolved = String(value).trim();
  return resolved.length > 0 ? resolved : null;
}

function normalizeAccountNumber(value, code) {
  const resolved = requireText(String(value || ""), code);
  if (!/^\d{4}$/.test(resolved)) {
    throw createError(400, code, "Account number must be a four-digit BAS account.");
  }
  return resolved;
}

function requireText(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createError(400, code, `${code} is required.`);
  }
  return value.trim();
}

function assertAllowed(value, allowedValues, code) {
  const resolved = requireText(String(value || ""), code);
  if (!allowedValues.includes(resolved)) {
    throw createError(400, code, `${resolved} is not allowed.`);
  }
  return resolved;
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}


function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
