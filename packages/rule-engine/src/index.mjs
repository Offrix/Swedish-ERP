import crypto from "node:crypto";

export const AUTOMATION_DECISION_TYPES = Object.freeze(["posting_suggestion", "classification", "anomaly_detection"]);
export const AUTOMATION_DECISION_STATES = Object.freeze(["proposed", "manual_override", "accepted"]);
export const RULE_PACK_STATUSES = Object.freeze(["draft", "validated", "approved", "published", "retired", "emergency_disabled"]);
export const RULE_PACK_SELECTION_MODES = Object.freeze(["effective_date", "rollback_override", "exact_version"]);
export const RULE_PACK_ROLLBACK_STATUSES = Object.freeze(["planned", "activated", "superseded", "cancelled"]);
export const AUTOMATION_BOUNDARY_POLICY_CODE = "AI_DECISION_BOUNDARY";
export const AUTOMATION_REVIEW_SOURCE_DOMAIN_CODE = "AUTOMATION";
export const AUTOMATION_FLAG_KEYS = Object.freeze({
  global: "automation.ai.enabled",
  classification: "automation.ai.classification.enabled",
  postingSuggestion: "automation.ai.posting_suggestions.enabled",
  anomalyDetection: "automation.ai.anomaly_detection.enabled"
});

export function createRulePackRegistry({ clock = () => new Date(), seedRulePacks = [] } = {}) {
  const state = {
    rulePacks: new Map(),
    rollbacks: new Map()
  };

  for (const rulePack of seedRulePacks) {
    registerRulePack(rulePack);
  }

  return {
    rulePackStatuses: RULE_PACK_STATUSES,
    rulePackSelectionModes: RULE_PACK_SELECTION_MODES,
    rulePackRollbackStatuses: RULE_PACK_ROLLBACK_STATUSES,
    registerRulePack,
    createDraftRulePackVersion,
    validateRulePackVersion,
    approveRulePackVersion,
    publishRulePackVersion,
    retireRulePackVersion,
    rollbackRulePackVersion,
    listRulePackRollbacks,
    listRulePacks,
    getRulePack,
    resolveRulePack,
    buildRuleDecision,
    snapshotRuleRegistry
  };

  function registerRulePack(rulePackInput = {}) {
    const normalized = normalizeRulePack(rulePackInput, {
      defaultStatus: normalizeOptionalStatus(rulePackInput.status) || "published",
      nowIso: nowIso()
    });
    assertRulePackIdIsUnique(normalized.rulePackId);
    if (normalized.status === "published") {
      assertNoPublishedOverlap(normalized);
    }
    state.rulePacks.set(normalized.rulePackId, normalized);
    return copy(normalized);
  }

  function createDraftRulePackVersion(rulePackInput = {}) {
    const normalized = normalizeRulePack(rulePackInput, {
      defaultStatus: "draft",
      nowIso: nowIso()
    });
    assertRulePackIdIsUnique(normalized.rulePackId);
    state.rulePacks.set(normalized.rulePackId, normalized);
    return copy(normalized);
  }

  function validateRulePackVersion({ rulePackId, actorId = "system" } = {}) {
    const rulePack = requireRulePack(rulePackId);
    assertRulePackStatus(rulePack, ["draft"], "rule_pack_cannot_be_validated");
    rulePack.status = "validated";
    rulePack.validatedAt = nowIso();
    rulePack.updatedAt = rulePack.validatedAt;
    rulePack.validatedBy = requireText(actorId, "actor_id_required");
    return copy(rulePack);
  }

  function approveRulePackVersion({ rulePackId, actorId = "system", approvalRef = null } = {}) {
    const rulePack = requireRulePack(rulePackId);
    assertRulePackStatus(rulePack, ["validated", "approved"], "rule_pack_cannot_be_approved");
    rulePack.status = "approved";
    rulePack.approvedAt = nowIso();
    rulePack.updatedAt = rulePack.approvedAt;
    rulePack.approvedBy = requireText(actorId, "actor_id_required");
    if (approvalRef != null) {
      rulePack.approvalRef = requireText(String(approvalRef), "approval_ref_invalid");
    }
    return copy(rulePack);
  }

  function publishRulePackVersion({ rulePackId, actorId = "system", approvalRef = null } = {}) {
    const rulePack = requireRulePack(rulePackId);
    assertRulePackStatus(rulePack, ["approved", "published"], "rule_pack_cannot_be_published");
    if (rulePack.status !== "published") {
      assertNoPublishedOverlap(rulePack);
    }
    rulePack.status = "published";
    rulePack.approvedAt = rulePack.approvedAt || nowIso();
    rulePack.approvedBy = rulePack.approvedBy || requireText(actorId, "actor_id_required");
    rulePack.publishedAt = nowIso();
    rulePack.updatedAt = rulePack.publishedAt;
    if (approvalRef != null) {
      rulePack.approvalRef = requireText(String(approvalRef), "approval_ref_invalid");
    }
    return copy(rulePack);
  }

  function retireRulePackVersion({ rulePackId, actorId = "system", retirementReason = null } = {}) {
    const rulePack = requireRulePack(rulePackId);
    assertRulePackStatus(rulePack, ["published", "retired"], "rule_pack_cannot_be_retired");
    rulePack.status = "retired";
    rulePack.retiredAt = nowIso();
    rulePack.updatedAt = rulePack.retiredAt;
    rulePack.retiredBy = requireText(actorId, "actor_id_required");
    if (retirementReason != null) {
      rulePack.retirementReason = requireText(String(retirementReason), "retirement_reason_invalid");
    }
    return copy(rulePack);
  }

  function rollbackRulePackVersion({ rulePackId, effectiveFrom = null, actorId = "system", reasonCode, replayRequired = false } = {}) {
    const target = requireRulePack(rulePackId);
    if (!["published", "retired"].includes(target.status)) {
      throw createError(409, "rule_pack_rollback_target_invalid", "Rollback target must be published or retired.");
    }
    const rollbackRecord = {
      rollbackId: crypto.randomUUID(),
      rulePackCode: target.rulePackCode,
      targetRulePackId: target.rulePackId,
      domain: target.domain,
      jurisdiction: target.jurisdiction,
      effectiveFrom: normalizeDate(effectiveFrom || nowDate(), "rule_pack_rollback_effective_from_invalid"),
      status: "activated",
      actorId: requireText(actorId, "actor_id_required"),
      reasonCode: requireText(reasonCode, "rule_pack_rollback_reason_required"),
      replayRequired: replayRequired === true,
      createdAt: nowIso()
    };
    state.rollbacks.set(rollbackRecord.rollbackId, rollbackRecord);
    return copy(rollbackRecord);
  }

  function listRulePackRollbacks({ rulePackCode = null, domain = null, jurisdiction = null, status = null } = {}) {
    return [...state.rollbacks.values()]
      .filter((record) => (rulePackCode ? record.rulePackCode === rulePackCode : true))
      .filter((record) => (domain ? record.domain === domain : true))
      .filter((record) => (jurisdiction ? record.jurisdiction === jurisdiction : true))
      .filter((record) => (status ? record.status === status : true))
      .sort(sortRollbackRecords)
      .map(copy);
  }

  function listRulePacks({ domain = null, jurisdiction = null, rulePackCode = null, status = null } = {}) {
    return [...state.rulePacks.values()]
      .filter((rulePack) => (domain ? rulePack.domain === domain : true))
      .filter((rulePack) => (jurisdiction ? rulePack.jurisdiction === jurisdiction : true))
      .filter((rulePack) => (rulePackCode ? rulePack.rulePackCode === rulePackCode : true))
      .filter((rulePack) => (status ? rulePack.status === status : true))
      .sort(sortRulePacks)
      .map(copy);
  }

  function getRulePack({ rulePackId, required = true } = {}) {
    const rulePack = state.rulePacks.get(requireText(rulePackId, "rule_pack_id_required")) || null;
    if (!rulePack && required) {
      throw createError(404, "rule_pack_not_found", "Rule pack was not found.");
    }
    return rulePack ? copy(rulePack) : null;
  }

  function resolveRulePack({
    rulePackId = null,
    rulePackCode = null,
    domain,
    jurisdiction,
    effectiveDate,
    companyType = null,
    registrationCode = null,
    groupCode = null,
    specialCaseCode = null
  } = {}) {
    if (rulePackId) {
      return attachSelectionMetadata(getRulePack({ rulePackId }), "exact_version", null);
    }

    const resolvedDomain = requireText(domain, "rule_pack_domain_required");
    const resolvedJurisdiction = requireText(jurisdiction, "rule_pack_jurisdiction_required");
    const resolvedEffectiveDate = normalizeDate(effectiveDate || nowDate(), "rule_pack_effective_date_invalid");
    const selectionInputs = { companyType, registrationCode, groupCode, specialCaseCode };
    const matches = listRulePacks({
      domain: resolvedDomain,
      jurisdiction: resolvedJurisdiction
    })
      .filter((rulePack) => rulePack.status === "published")
      .filter((rulePack) => (rulePackCode ? rulePack.rulePackCode === rulePackCode : true))
      .filter((rulePack) => rulePack.effectiveFrom <= resolvedEffectiveDate)
      .filter((rulePack) => !rulePack.effectiveTo || rulePack.effectiveTo > resolvedEffectiveDate)
      .filter((rulePack) => scopeMatches(rulePack, selectionInputs));

    if (matches.length === 0) {
      throw createError(404, "rule_pack_not_found", `No rule pack matched ${resolvedDomain}/${resolvedJurisdiction} on ${resolvedEffectiveDate}.`);
    }

    const rollbackOverride = resolveRollbackOverride({
      domain: resolvedDomain,
      jurisdiction: resolvedJurisdiction,
      rulePackCode,
      effectiveDate: resolvedEffectiveDate,
      selectionInputs
    });
    if (rollbackOverride) {
      return rollbackOverride;
    }

    const matchedCodes = [...new Set(matches.map((rulePack) => rulePack.rulePackCode))];
    if (!rulePackCode && matchedCodes.length > 1) {
      throw createError(
        409,
        "rule_pack_selection_ambiguous",
        `Multiple rule pack codes matched ${resolvedDomain}/${resolvedJurisdiction} on ${resolvedEffectiveDate}.`
      );
    }

    return attachSelectionMetadata(matches[0], "effective_date", null);
  }

  function buildRuleDecision({
    decisionCode,
    effectiveDate,
    rulePack,
    inputs,
    outputs = {},
    warnings = [],
    explanation = [],
    needsManualReview = false
  } = {}) {
    const resolvedDecisionCode = requireText(decisionCode, "decision_code_required");
    const resolvedRulePack = rulePack && typeof rulePack === "object" ? copy(rulePack) : null;
    if (!resolvedRulePack?.rulePackId) {
      throw createError(400, "rule_pack_required", "Rule pack is required.");
    }
    return {
      decisionCode: resolvedDecisionCode,
      inputsHash: hashObject(inputs || {}),
      rulePackId: resolvedRulePack.rulePackId,
      rulePackCode: resolvedRulePack.rulePackCode,
      rulePackVersion: resolvedRulePack.version,
      selectionMode: resolvedRulePack.selectionMode || "effective_date",
      effectiveDate: normalizeDate(effectiveDate || nowDate(), "decision_effective_date_invalid"),
      outputs: copy(outputs || {}),
      warnings: Array.isArray(warnings) ? copy(warnings) : [],
      explanation: Array.isArray(explanation) ? copy(explanation) : [],
      needsManualReview: needsManualReview === true,
      generatedAt: new Date(clock()).toISOString()
    };
  }

  function snapshotRuleRegistry() {
    const items = listRulePacks();
    const rollbacks = listRulePackRollbacks();
    return {
      statuses: RULE_PACK_STATUSES,
      selectionModes: RULE_PACK_SELECTION_MODES,
      rollbackStatuses: RULE_PACK_ROLLBACK_STATUSES,
      totalRulePackCount: items.length,
      publishedRulePackCount: items.filter((item) => item.status === "published").length,
      retiredRulePackCount: items.filter((item) => item.status === "retired").length,
      totalRollbackCount: rollbacks.length,
      items,
      rollbacks
    };
  }

  function resolveRollbackOverride({ domain, jurisdiction, rulePackCode, effectiveDate, selectionInputs }) {
    const rollback = listRulePackRollbacks({ domain, jurisdiction, status: "activated" })
      .filter((record) => record.effectiveFrom <= effectiveDate)
      .filter((record) => (rulePackCode ? record.rulePackCode === rulePackCode : true))[0];
    if (!rollback) {
      return null;
    }
    const target = state.rulePacks.get(rollback.targetRulePackId);
    if (!target) {
      throw createError(500, "rule_pack_rollback_target_missing", "Rollback target rule pack is missing.");
    }
    if (!scopeMatches(target, selectionInputs)) {
      return null;
    }
    return attachSelectionMetadata(target, "rollback_override", rollback.rollbackId);
  }

  function requireRulePack(rulePackId) {
    const stored = state.rulePacks.get(requireText(rulePackId, "rule_pack_id_required"));
    if (!stored) {
      throw createError(404, "rule_pack_not_found", "Rule pack was not found.");
    }
    return stored;
  }

  function assertRulePackIdIsUnique(rulePackId) {
    if (state.rulePacks.has(rulePackId)) {
      throw createError(409, "rule_pack_id_exists", `Rule pack ${rulePackId} already exists.`);
    }
  }

  function assertRulePackStatus(rulePack, allowedStatuses, code) {
    if (!allowedStatuses.includes(rulePack.status)) {
      throw createError(409, code, `Rule pack ${rulePack.rulePackId} is ${rulePack.status}.`);
    }
  }

  function assertNoPublishedOverlap(candidate) {
    const overlapping = [...state.rulePacks.values()]
      .filter((item) => item.rulePackId !== candidate.rulePackId)
      .filter((item) => item.status === "published")
      .filter((item) => item.domain === candidate.domain)
      .filter((item) => item.jurisdiction === candidate.jurisdiction)
      .filter((item) => item.rulePackCode === candidate.rulePackCode)
      .filter((item) => buildScopeSignature(item) === buildScopeSignature(candidate))
      .filter((item) => intervalsOverlap(item, candidate));
    if (overlapping.length > 0) {
      throw createError(409, "rule_pack_effective_interval_overlaps", `Rule pack ${candidate.rulePackId} overlaps a published version.`);
    }
  }

  function nowDate() {
    return new Date(clock()).toISOString().slice(0, 10);
  }

  function nowIso() {
    return new Date(clock()).toISOString();
  }
}

export function createAutomationAiEngine({
  clock = () => new Date(),
  seedRulePacks = [],
  resolveRuntimeFlags = null,
  getReviewCenterPlatform = null
} = {}) {
  const registry = createRulePackRegistry({ clock, seedRulePacks });
  const state = {
    decisions: new Map()
  };

  function nowDate() {
    return new Date(clock()).toISOString().slice(0, 10);
  }

  return {
    ruleRegistry: registry,
    rulePackStatuses: RULE_PACK_STATUSES,
    rulePackSelectionModes: RULE_PACK_SELECTION_MODES,
    rulePackRollbackStatuses: RULE_PACK_ROLLBACK_STATUSES,
    registerRulePack: (input) => registry.registerRulePack(input),
    listRulePacks: (filters) => registry.listRulePacks(filters),
    resolveRulePack: (filters) => registry.resolveRulePack(filters),
    buildRuleDecision: (input) => registry.buildRuleDecision(input),
    automationDecisionTypes: AUTOMATION_DECISION_TYPES,
    automationDecisionStates: AUTOMATION_DECISION_STATES,
    automationBoundaryPolicyCode: AUTOMATION_BOUNDARY_POLICY_CODE,
    automationFlagKeys: AUTOMATION_FLAG_KEYS,
    createNoCodeRulePack,
    listNoCodeRulePacks,
    evaluateNoCodeRulePack,
    suggestLedgerPosting,
    classifyArtifact,
    detectAnomaly,
    listAutomationDecisions,
    getAutomationDecision,
    overrideAutomationDecision
  };

  function createNoCodeRulePack(input = {}) {
    const resolvedDomain = enforceAutomationRulePackDomain(input.domain || "automation");
    return registry.registerRulePack({
      ...input,
      rulePackId: input.rulePackId || crypto.randomUUID(),
      rulePackCode:
        input.rulePackCode ||
        deriveRulePackCode({
          domain: resolvedDomain,
          jurisdiction: input.jurisdiction || "SE",
          rulePackId: input.rulePackId || "automation"
        }),
      domain: resolvedDomain,
      jurisdiction: input.jurisdiction || "SE",
      effectiveFrom: input.effectiveFrom || nowDate(),
      effectiveTo: input.effectiveTo || null,
      version: input.version || "1",
      status: input.status || "published",
      approvalRef: input.approvalRef || null,
      changeReason: input.changeReason || input.semanticChangeSummary || "No-code automation rule pack created via API.",
      testVectorSetId: input.testVectorSetId || null,
      createdBy: input.createdBy || "system",
      approvedBy: input.approvedBy || "system",
      sourceSnapshotDate: input.sourceSnapshotDate || input.effectiveFrom || nowDate(),
      semanticChangeSummary: input.semanticChangeSummary || "Registered no-code automation rule pack.",
      domain: resolvedDomain
    });
  }

  function listNoCodeRulePacks({ domain = null, jurisdiction = null } = {}) {
    return registry.listRulePacks({ domain, jurisdiction });
  }

  function evaluateNoCodeRulePack({ rulePackId, facts = {} } = {}) {
    const rulePack = registry.getRulePack({ rulePackId });
    const rules = rulePack.machineReadableRules || {};
    const conditions = Array.isArray(rules.conditions)
      ? rules.conditions
      : Array.isArray(rules.when)
        ? rules.when
        : [];
    const matched = conditions.every((condition) => matchesCondition(condition, facts));
    return {
      rulePackId: rulePack.rulePackId,
      rulePackCode: rulePack.rulePackCode,
      matched,
      outputs: matched ? copy(rules.then || rules.outputs || {}) : {}
    };
  }

  function suggestLedgerPosting({
    companyId,
    companyUserId = null,
    sourceObjectType,
    sourceObjectId,
    candidatePostings = [],
    evidence = {},
    rulePackId = null,
    effectiveDate = nowDate(),
    actorId = "system"
  } = {}) {
    const resolvedRulePack = resolveOptionalRulePack(rulePackId, effectiveDate);
    const candidates = normalizeCandidatePostings(candidatePostings, evidence);
    const topCandidate = candidates[0];
    const confidence = clampNumber(topCandidate.score, 0.35, 0.99);
    const inputs = {
      sourceObjectType,
      sourceObjectId,
      candidatePostings: candidates,
      evidence
    };
    const boundary = createAutomationBoundaryProfile({
      companyId,
      companyUserId,
      decisionType: "posting_suggestion",
      confidence,
      inputs,
      outputs: {
        suggestedLines: topCandidate.lines,
        safeToPost: false,
        postingKey: topCandidate.postingKey
      },
      resolveRuntimeFlags,
      effectiveDate
    });
    return recordDecision({
      companyId,
      companyUserId,
      decisionType: "posting_suggestion",
      actorId,
      effectiveDate,
      rulePack: resolvedRulePack,
      inputs,
      outputs: boundary.outputs,
      explanation: [
        ...buildPostingExplanation(resolvedRulePack, topCandidate, evidence),
        ...boundary.explanation
      ],
      warnings: mergeWarnings(
        confidence < 0.85 ? [{ code: "manual_review_required", message: "Posting suggestion requires human approval." }] : [],
        boundary.warnings
      ),
      needsManualReview: boundary.needsManualReview,
      confidence,
      boundary
    });
  }

  function classifyArtifact({
    companyId,
    companyUserId = null,
    classifierType,
    candidates = [],
    evidence = {},
    rulePackId = null,
    effectiveDate = nowDate(),
    actorId = "system"
  } = {}) {
    const resolvedRulePack = resolveOptionalRulePack(rulePackId, effectiveDate);
    const normalizedCandidates = normalizeClassificationCandidates(candidates, evidence);
    const winningCandidate = normalizedCandidates[0];
    const confidence = clampNumber(winningCandidate.score, 0.4, 0.99);
    const inputs = {
      classifierType,
      candidates: normalizedCandidates,
      evidence
    };
    const boundary = createAutomationBoundaryProfile({
      companyId,
      companyUserId,
      decisionType: "classification",
      confidence,
      inputs,
      outputs: {
        classifierType: requireText(classifierType, "classifier_type_required"),
        selectedCode: winningCandidate.code
      },
      resolveRuntimeFlags,
      effectiveDate
    });
    return recordDecision({
      companyId,
      companyUserId,
      decisionType: "classification",
      actorId,
      effectiveDate,
      rulePack: resolvedRulePack,
      inputs,
      outputs: boundary.outputs,
      explanation: [
        ...buildClassificationExplanation(
          resolvedRulePack,
          boundary.explanationCandidate || winningCandidate,
          evidence
        ),
        ...boundary.explanation
      ],
      warnings: mergeWarnings(
        confidence < 0.8 ? [{ code: "classification_confidence_low", message: "Classification should be reviewed before automation continues." }] : [],
        boundary.warnings
      ),
      needsManualReview: boundary.needsManualReview,
      confidence,
      boundary
    });
  }

  function detectAnomaly({
    companyId,
    companyUserId = null,
    anomalyType,
    actualValue,
    expectedValue,
    tolerancePercent = 10,
    evidence = {},
    rulePackId = null,
    effectiveDate = nowDate(),
    actorId = "system"
  } = {}) {
    const resolvedRulePack = resolveOptionalRulePack(rulePackId, effectiveDate);
    const resolvedActualValue = Number(actualValue);
    const resolvedExpectedValue = Number(expectedValue);
    if (!Number.isFinite(resolvedActualValue) || !Number.isFinite(resolvedExpectedValue)) {
      throw createError(400, "anomaly_value_invalid", "Actual and expected values must be numeric.");
    }
    const deviation = Math.abs(resolvedActualValue - resolvedExpectedValue);
    const baseline = Math.max(Math.abs(resolvedExpectedValue), 1);
    const deviationPercent = Number(((deviation / baseline) * 100).toFixed(2));
    const threshold = Number(tolerancePercent);
    const flagged = deviationPercent > threshold;
    const confidence = flagged ? clampNumber(0.6 + deviationPercent / 200, 0.6, 0.99) : 0.55;
    const inputs = {
      anomalyType,
      actualValue: resolvedActualValue,
      expectedValue: resolvedExpectedValue,
      tolerancePercent: threshold,
      evidence
    };
    const boundary = createAutomationBoundaryProfile({
      companyId,
      companyUserId,
      decisionType: "anomaly_detection",
      confidence,
      inputs,
      outputs: {
        anomalyType: requireText(anomalyType, "anomaly_type_required"),
        flagged,
        deviationPercent,
        severity: flagged ? (deviationPercent >= threshold * 2 ? "high" : "medium") : "informational"
      },
      resolveRuntimeFlags,
      effectiveDate
    });
    return recordDecision({
      companyId,
      companyUserId,
      decisionType: "anomaly_detection",
      actorId,
      effectiveDate,
      rulePack: resolvedRulePack,
      inputs,
      outputs: boundary.outputs,
      explanation: [
        ...buildAnomalyExplanation(resolvedRulePack, deviationPercent, threshold, evidence),
        ...boundary.explanation
      ],
      warnings: mergeWarnings(
        flagged ? [{ code: "anomaly_flagged", message: "Anomaly requires review before downstream automation continues." }] : [],
        boundary.warnings
      ),
      needsManualReview: boundary.needsManualReview,
      confidence,
      boundary
    });
  }

  function listAutomationDecisions({ companyId, decisionType = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedDecisionType = decisionType ? requireText(decisionType, "automation_decision_type_required") : null;
    return [...state.decisions.values()]
      .filter((decision) => decision.companyId === resolvedCompanyId)
      .filter((decision) => (resolvedDecisionType ? decision.decisionType === resolvedDecisionType : true))
      .sort((left, right) => left.generatedAt.localeCompare(right.generatedAt))
      .map(copy);
  }

  function getAutomationDecision({ companyId, decisionId } = {}) {
    const decision = state.decisions.get(requireText(decisionId, "automation_decision_id_required"));
    if (!decision || decision.companyId !== requireText(companyId, "company_id_required")) {
      throw createError(404, "automation_decision_not_found", "Automation decision was not found.");
    }
    return copy(decision);
  }

  function overrideAutomationDecision({
    companyId,
    decisionId,
    actorId,
    overrideReasonCode,
    acceptedOutputs
  } = {}) {
    const decision = state.decisions.get(requireText(decisionId, "automation_decision_id_required"));
    if (!decision || decision.companyId !== requireText(companyId, "company_id_required")) {
      throw createError(404, "automation_decision_not_found", "Automation decision was not found.");
    }
    const resolvedOutputs = copy(acceptedOutputs || decision.outputs);
    assertAcceptedOutputsWithinBoundary(decision, resolvedOutputs);
    decision.state = "manual_override";
    decision.override = {
      overrideId: crypto.randomUUID(),
      actorId: requireText(actorId || "system", "actor_id_required"),
      overrideReasonCode: requireText(overrideReasonCode, "automation_override_reason_required"),
      acceptedOutputs: resolvedOutputs,
      overriddenAt: new Date(clock()).toISOString()
    };
    if (decision.reviewItemId) {
      settleAutomationReviewItem({
        reviewCenterPlatform: resolveReviewCenterPlatform(getReviewCenterPlatform),
        decision,
        actorId: decision.override.actorId,
        note: `Manual override recorded for ${decision.decisionType}.`,
        reasonCode: decision.override.overrideReasonCode
      });
    }
    return copy(decision);
  }

  function resolveOptionalRulePack(rulePackId, effectiveDate) {
    if (!rulePackId) {
      return null;
    }
    const exactRulePack = registry.getRulePack({ rulePackId, required: false });
    if (exactRulePack) {
      enforceAutomationRulePackDomain(exactRulePack.domain);
      return exactRulePack;
    }
    return registry.resolveRulePack({
      domain: "automation",
      jurisdiction: "SE",
      effectiveDate
    });
  }

  function recordDecision({
    companyId,
    companyUserId,
    decisionType,
    actorId,
    effectiveDate,
    rulePack,
    inputs,
    outputs,
    explanation,
    warnings,
    needsManualReview,
    confidence,
    boundary
  }) {
    const ruleDecision = rulePack
      ? registry.buildRuleDecision({
          decisionCode: decisionType,
          effectiveDate,
          rulePack,
          inputs,
          outputs,
          warnings,
          explanation,
          needsManualReview
        })
      : {
          decisionCode: decisionType,
          inputsHash: hashObject(inputs || {}),
          rulePackId: null,
          rulePackCode: null,
          rulePackVersion: null,
          selectionMode: null,
          effectiveDate: normalizeDate(effectiveDate || nowDate(), "decision_effective_date_invalid"),
          outputs: copy(outputs || {}),
          warnings: Array.isArray(warnings) ? copy(warnings) : [],
          explanation: Array.isArray(explanation) ? copy(explanation) : [],
          needsManualReview: needsManualReview === true,
          generatedAt: new Date(clock()).toISOString()
        };
    const decision = {
      decisionId: crypto.randomUUID(),
      companyId: requireText(companyId, "company_id_required"),
      companyUserId: normalizeOptionalText(companyUserId),
      decisionType: assertAllowed(decisionType, AUTOMATION_DECISION_TYPES, "automation_decision_type_invalid"),
      state: "proposed",
      actorId: requireText(actorId || "system", "actor_id_required"),
      confidence: Number(Number(confidence).toFixed(4)),
      policyCode: AUTOMATION_BOUNDARY_POLICY_CODE,
      policyState: boundary.policyState,
      policyHits: copy(boundary.policyHits),
      reviewReasonCodes: copy(boundary.reviewReasonCodes),
      reviewRequired: boundary.needsManualReview,
      reviewQueueCode: boundary.reviewQueueCode,
      reviewItemId: null,
      finalizationAllowed: false,
      submissionAllowed: false,
      downstreamDispatchAllowed: false,
      runtimeFlags: copy(boundary.runtimeFlags),
      aiTrace: extractAiTrace(inputs),
      ...ruleDecision
    };
    state.decisions.set(decision.decisionId, decision);
    if (boundary.needsManualReview) {
      decision.reviewItemId = maybeCreateAutomationReviewItem({
        reviewCenterPlatform: resolveReviewCenterPlatform(getReviewCenterPlatform),
        decision,
        inputs,
        boundary
      });
    }
    return copy(decision);
  }
}

function enforceAutomationRulePackDomain(domain) {
  const resolvedDomain = requireText(String(domain || "automation"), "automation_rule_pack_domain_required").toLowerCase();
  if (resolvedDomain !== "automation") {
    throw createError(409, "automation_rule_pack_domain_forbidden", "Automation rule packs may only be registered for the automation domain.");
  }
  return resolvedDomain;
}

function createAutomationBoundaryProfile({
  companyId,
  companyUserId = null,
  decisionType,
  confidence,
  inputs = {},
  outputs = {},
  resolveRuntimeFlags = null,
  effectiveDate = null
} = {}) {
  const resolvedDecisionType = assertAllowed(decisionType, AUTOMATION_DECISION_TYPES, "automation_decision_type_invalid");
  const evidence = copy(inputs?.evidence || {});
  const runtimeFlags = typeof resolveRuntimeFlags === "function"
    ? copy(resolveRuntimeFlags({ companyId, companyUserId }) || {})
    : {};
  const featureFlagKey = determineAutomationFlagKey(resolvedDecisionType);
  if (!isRuntimeFlagEnabled(runtimeFlags, AUTOMATION_FLAG_KEYS.global) || !isRuntimeFlagEnabled(runtimeFlags, featureFlagKey)) {
    throw createError(503, "automation_ai_disabled", "AI automation is disabled for this tenant or module.");
  }

  assertNoForbiddenAutomationIntent({ decisionType: resolvedDecisionType, inputs, outputs, evidence });

  const reviewReasonCodes = new Set();
  const policyHits = new Set();
  const warnings = [];
  const explanation = [];
  let adjustedOutputs = copy(outputs || {});
  let reviewQueueCode = "DOCUMENT_REVIEW";
  let requiredDecisionType = resolvedDecisionType === "classification" ? "classification" : "generic_review";
  let reviewRiskClass = resolvedDecisionType === "anomaly_detection" ? "medium" : "high";
  let explanationCandidate = null;

  const threshold = resolveConfidenceThreshold(resolvedDecisionType, evidence, adjustedOutputs);
  if (Number(confidence) < threshold) {
    policyHits.add("confidence_threshold_review");
    reviewReasonCodes.add("confidence_threshold_review");
    warnings.push({
      code: "confidence_threshold_review",
      message: `Confidence ${Number(confidence).toFixed(2)} is below the ${threshold.toFixed(2)} threshold.`
    });
    explanation.push(`Confidence ${Number(confidence).toFixed(2)} triggered mandatory review at threshold ${threshold.toFixed(2)}.`);
  }

  const deterministicOverride = applyDeterministicOverride({
    decisionType: resolvedDecisionType,
    outputs: adjustedOutputs,
    confidence,
    evidence
  });
  if (deterministicOverride) {
    adjustedOutputs = deterministicOverride.outputs;
    explanationCandidate = deterministicOverride.explanationCandidate || null;
    policyHits.add("deterministic_rulepack_override");
    reviewReasonCodes.add("deterministic_rulepack_override");
    warnings.push({
      code: "deterministic_rulepack_override",
      message: "Deterministic rulepack evidence overrode the AI suggestion."
    });
    explanation.push(deterministicOverride.explanation);
  }

  if (resolvedDecisionType === "posting_suggestion") {
    policyHits.add("economic_posting_prohibited");
    reviewReasonCodes.add("economic_posting_requires_review");
    explanation.push("Posting suggestions are suggestion-only and may never create final ledger postings directly.");
    reviewRiskClass = "high";
  }

  if (resolvedDecisionType === "anomaly_detection" && adjustedOutputs.flagged === true) {
    policyHits.add("anomaly_requires_review");
    reviewReasonCodes.add("anomaly_requires_review");
    explanation.push("Flagged anomalies require review before downstream handling continues.");
    reviewRiskClass = adjustedOutputs.severity === "high" ? "critical" : "high";
  }

  if (hasEvidenceFlag(evidence, "personImpact") || hasEvidenceFlag(evidence, "payrollImpact") || hasEvidenceFlag(evidence, "agiImpact")) {
    policyHits.add("person_or_payroll_impact_requires_review");
    reviewReasonCodes.add("person_or_payroll_impact_requires_review");
    reviewQueueCode = "PAYROLL_REVIEW";
    requiredDecisionType = "payroll_treatment";
    reviewRiskClass = "critical";
    explanation.push("Person-, payroll- or AGI-impacting suggestions must be reviewed in payroll review.");
  }

  for (const [flagKey, policyHit, reviewReason, explanatoryText] of [
    ["privateSpendCandidate", "private_spend_requires_review", "private_spend_requires_review", "Private-spend candidates may never be finalized by AI."],
    ["benefitBoundaryCase", "benefit_boundary_requires_review", "benefit_boundary_requires_review", "Benefit boundary cases require human review."],
    ["wellnessBoundaryCase", "wellness_boundary_requires_review", "wellness_boundary_requires_review", "Wellness threshold cases require human review."],
    ["vatImpact", "vat_impact_requires_review", "vat_impact_requires_review", "VAT-affecting suggestions require review."],
    ["husImpact", "hus_impact_requires_review", "hus_impact_requires_review", "HUS-affecting suggestions require review."],
    ["annualFilingImpact", "annual_filing_requires_review", "annual_filing_requires_review", "Annual filing suggestions require review."],
    ["submissionIntent", "regulated_submission_prohibited", "regulated_submission_requires_review", "Regulated submissions can never be sent autonomously."]
  ]) {
    if (hasEvidenceFlag(evidence, flagKey)) {
      policyHits.add(policyHit);
      reviewReasonCodes.add(reviewReason);
      explanation.push(explanatoryText);
    }
  }

  const explicitPolicyHits = Array.isArray(evidence.policyHitCodes) ? evidence.policyHitCodes : [];
  for (const policyHitCode of explicitPolicyHits) {
    const resolvedPolicyHit = normalizePolicyCode(policyHitCode);
    policyHits.add(resolvedPolicyHit);
    reviewReasonCodes.add(resolvedPolicyHit);
  }

  if (evidence.aiGenerated === true && !hasModelMetadata(evidence)) {
    policyHits.add("model_metadata_missing");
    reviewReasonCodes.add("model_metadata_missing");
    warnings.push({
      code: "model_metadata_missing",
      message: "AI-generated suggestions without model metadata require review."
    });
    explanation.push("AI-generated evidence omitted model metadata and was forced into review.");
  }

  adjustedOutputs = {
    ...adjustedOutputs,
    finalizationAllowed: false,
    submissionAllowed: false,
    downstreamDispatchAllowed: false
  };
  if (resolvedDecisionType === "posting_suggestion") {
    adjustedOutputs.safeToPost = false;
  }

  const needsManualReview =
    resolvedDecisionType === "posting_suggestion"
    || reviewReasonCodes.size > 0
    || policyHits.size > 0
    || Boolean(inputs?.evidence?.requiresManualReview);

  return {
    outputs: adjustedOutputs,
    explanation,
    explanationCandidate,
    warnings,
    needsManualReview,
    reviewQueueCode,
    requiredDecisionType,
    reviewRiskClass,
    policyState: needsManualReview ? "review_required" : "suggestion_only",
    policyHits: [...policyHits].sort(),
    reviewReasonCodes: [...reviewReasonCodes].sort(),
    runtimeFlags
  };
}

function applyDeterministicOverride({ decisionType, outputs = {}, confidence, evidence = {} } = {}) {
  if (decisionType === "classification") {
    const deterministicSelectedCode = normalizeOptionalText(
      evidence.deterministicSelectedCode
      || evidence.rulepackSelectedCode
      || evidence.deterministicOutcomeCode
    );
    if (deterministicSelectedCode && deterministicSelectedCode !== outputs.selectedCode) {
      return {
        outputs: {
          ...outputs,
          selectedCode: deterministicSelectedCode
        },
        explanationCandidate: {
          code: deterministicSelectedCode,
          score: confidence
        },
        explanation: `Deterministic rulepack output ${deterministicSelectedCode} overrode the AI classification suggestion.`
      };
    }
    return null;
  }

  if (decisionType === "posting_suggestion") {
    const deterministicPostingKey = normalizeOptionalText(evidence.deterministicPostingKey || evidence.rulepackPostingKey);
    const deterministicLines = normalizeOptionalPostingLines(evidence.deterministicSuggestedLines || evidence.rulepackSuggestedLines);
    const hasKeyOverride = deterministicPostingKey && deterministicPostingKey !== outputs.postingKey;
    const hasLineOverride = deterministicLines && hashObject(deterministicLines) !== hashObject(outputs.suggestedLines || []);
    if (hasKeyOverride || hasLineOverride) {
      return {
        outputs: {
          ...outputs,
          postingKey: deterministicPostingKey || outputs.postingKey,
          suggestedLines: deterministicLines || outputs.suggestedLines
        },
        explanation: "Deterministic rulepack posting guidance overrode the AI posting suggestion."
      };
    }
    return null;
  }

  if (decisionType === "anomaly_detection") {
    const deterministicFlagged = normalizeOptionalBoolean(
      Object.hasOwn(evidence, "deterministicFlagged") ? evidence.deterministicFlagged : evidence.rulepackFlagged
    );
    if (deterministicFlagged != null && deterministicFlagged !== outputs.flagged) {
      return {
        outputs: {
          ...outputs,
          flagged: deterministicFlagged,
          severity: deterministicFlagged ? outputs.severity || "high" : "informational"
        },
        explanation: `Deterministic anomaly policy overrode the AI flagged state to ${deterministicFlagged}.`
      };
    }
  }

  return null;
}

function maybeCreateAutomationReviewItem({ reviewCenterPlatform, decision, inputs = {}, boundary } = {}) {
  if (!reviewCenterPlatform || typeof reviewCenterPlatform.createReviewItem !== "function") {
    throw createError(409, "automation_review_center_required", "Review center platform is required for AI decisions that mandate review.");
  }
  const sourceReference = normalizeOptionalText(
    inputs?.sourceObjectId
    || inputs?.evidence?.documentId
    || inputs?.evidence?.sourceObjectId
    || inputs?.evidence?.sourceReference
  );
  const reviewItem = reviewCenterPlatform.createReviewItem({
    companyId: decision.companyId,
    queueCode: boundary.reviewQueueCode,
    reviewTypeCode: mapAutomationReviewType(decision.decisionType),
    sourceDomainCode: AUTOMATION_REVIEW_SOURCE_DOMAIN_CODE,
    sourceObjectType: "automation_decision",
    sourceObjectId: decision.decisionId,
    sourceReference,
    sourceObjectLabel: sourceReference ? `Automation ${decision.decisionType} for ${sourceReference}` : `Automation ${decision.decisionType}`,
    requiredDecisionType: boundary.requiredDecisionType,
    riskClass: boundary.reviewRiskClass,
    title: buildAutomationReviewTitle(decision),
    summary: decision.policyHits.join(", "),
    requestedPayload: {
      decisionId: decision.decisionId,
      decisionType: decision.decisionType,
      confidence: decision.confidence,
      policyHits: decision.policyHits,
      reviewReasonCodes: decision.reviewReasonCodes,
      outputs: decision.outputs
    },
    evidenceRefs: [
      `automation_decision:${decision.decisionId}`,
      ...(sourceReference ? [`source_ref:${sourceReference}`] : [])
    ],
    policyCode: AUTOMATION_BOUNDARY_POLICY_CODE,
    actorId: decision.actorId
  });
  return reviewItem.reviewItemId;
}

function settleAutomationReviewItem({ reviewCenterPlatform, decision, actorId, note = null, reasonCode = "manual_override" } = {}) {
  if (!reviewCenterPlatform || typeof reviewCenterPlatform.getReviewCenterItem !== "function") {
    return;
  }
  const current = reviewCenterPlatform.getReviewCenterItem({
    companyId: decision.companyId,
    reviewItemId: decision.reviewItemId
  });
  if (["open", "waiting_input", "escalated"].includes(current.status)) {
    reviewCenterPlatform.claimReviewCenterItem({
      companyId: decision.companyId,
      reviewItemId: decision.reviewItemId,
      actorId
    });
  }
  const claimed = reviewCenterPlatform.getReviewCenterItem({
    companyId: decision.companyId,
    reviewItemId: decision.reviewItemId
  });
  if (claimed.status === "claimed") {
    reviewCenterPlatform.startReviewCenterItem({
      companyId: decision.companyId,
      reviewItemId: decision.reviewItemId,
      actorId
    });
  }
  const inReview = reviewCenterPlatform.getReviewCenterItem({
    companyId: decision.companyId,
    reviewItemId: decision.reviewItemId
  });
  if (["claimed", "in_review", "waiting_input", "escalated"].includes(inReview.status)) {
    reviewCenterPlatform.decideReviewCenterItem({
      companyId: decision.companyId,
      reviewItemId: decision.reviewItemId,
      decisionCode: "approve",
      reasonCode: normalizePolicyCode(reasonCode),
      note: note || `Approved automation decision ${decision.decisionId}.`,
      decisionPayload: {
        decisionId: decision.decisionId,
        decisionType: decision.decisionType,
        overrideReasonCode: decision.override?.overrideReasonCode || null
      },
      actorId
    });
  }
  const approved = reviewCenterPlatform.getReviewCenterItem({
    companyId: decision.companyId,
    reviewItemId: decision.reviewItemId
  });
  if (["approved", "rejected", "escalated"].includes(approved.status)) {
    reviewCenterPlatform.closeReviewCenterItem({
      companyId: decision.companyId,
      reviewItemId: decision.reviewItemId,
      actorId,
      note: note || `Closed after automation override for ${decision.decisionId}.`
    });
  }
}

function determineAutomationFlagKey(decisionType) {
  if (decisionType === "posting_suggestion") {
    return AUTOMATION_FLAG_KEYS.postingSuggestion;
  }
  if (decisionType === "classification") {
    return AUTOMATION_FLAG_KEYS.classification;
  }
  return AUTOMATION_FLAG_KEYS.anomalyDetection;
}

function isRuntimeFlagEnabled(runtimeFlags, flagKey) {
  return runtimeFlags?.[flagKey] !== false;
}

function assertNoForbiddenAutomationIntent({ decisionType, inputs = {}, outputs = {}, evidence = {} } = {}) {
  const candidateFlags = [
    outputs.safeToPost === true,
    outputs.submissionAllowed === true,
    outputs.downstreamDispatchAllowed === true,
    hasEvidenceFlag(evidence, "submissionIntent"),
    hasEvidenceFlag(evidence, "submitToAuthority"),
    hasEvidenceFlag(evidence, "postToLedger"),
    hasEvidenceFlag(evidence, "dispatchFinalOutcome")
  ];
  if (candidateFlags.some(Boolean)) {
    throw createError(409, "automation_finalization_forbidden", `Automation ${decisionType} may not finalize postings or submissions.`);
  }
}

function assertAcceptedOutputsWithinBoundary(decision, acceptedOutputs) {
  if (acceptedOutputs?.safeToPost === true) {
    throw createError(409, "automation_finalization_forbidden", "Automation overrides may not mark a posting suggestion as safe to post.");
  }
  if (
    acceptedOutputs?.finalizationAllowed === true
    || acceptedOutputs?.submissionAllowed === true
    || acceptedOutputs?.downstreamDispatchAllowed === true
    || acceptedOutputs?.postToLedger === true
    || acceptedOutputs?.submitToAuthority === true
  ) {
    throw createError(409, "automation_finalization_forbidden", "Automation overrides may not finalize economic outcomes or submissions.");
  }
  if (decision.decisionType === "classification" && !normalizeOptionalText(acceptedOutputs?.selectedCode)) {
    throw createError(400, "automation_override_selected_code_required", "Classification overrides must preserve a selected code.");
  }
}

function buildAutomationReviewTitle(decision) {
  if (decision.decisionType === "posting_suggestion") {
    return `Automation posting suggestion requires review for ${decision.decisionId}`;
  }
  if (decision.decisionType === "classification") {
    return `Automation classification requires review for ${decision.decisionId}`;
  }
  return `Automation anomaly requires review for ${decision.decisionId}`;
}

function mapAutomationReviewType(decisionType) {
  if (decisionType === "posting_suggestion") {
    return "AUTOMATION_POSTING_SUGGESTION";
  }
  if (decisionType === "classification") {
    return "AUTOMATION_CLASSIFICATION";
  }
  return "AUTOMATION_ANOMALY";
}

function mergeWarnings(...warningGroups) {
  const merged = new Map();
  for (const warning of warningGroups.flat()) {
    if (!warning || typeof warning !== "object") {
      continue;
    }
    const code = requireText(String(warning.code), "automation_warning_code_required");
    const message = requireText(String(warning.message), "automation_warning_message_required");
    merged.set(`${code}:${message}`, { code, message });
  }
  return [...merged.values()];
}

function extractAiTrace(inputs = {}) {
  const evidence = inputs?.evidence || {};
  return {
    aiGenerated: evidence.aiGenerated === true,
    inputSource: normalizeOptionalText(
      evidence.inputSource
      || evidence.source
      || inputs.sourceObjectType
      || inputs.classifierType
      || inputs.anomalyType
    ),
    modelProvider: normalizeOptionalText(evidence.modelProvider || evidence.provider),
    modelName: normalizeOptionalText(evidence.modelName || evidence.model),
    modelVersion: normalizeOptionalText(evidence.modelVersion),
    extractionMode: normalizeOptionalText(evidence.extractionMode || evidence.promptMode || evidence.suggestionMode)
  };
}

function hasModelMetadata(evidence = {}) {
  return Boolean(
    normalizeOptionalText(evidence.modelVersion)
    || (normalizeOptionalText(evidence.modelProvider || evidence.provider) && normalizeOptionalText(evidence.modelName || evidence.model))
  );
}

function hasEvidenceFlag(evidence, key) {
  return evidence?.[key] === true;
}

function normalizeOptionalPostingLines(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }
  return value.map((line) => ({
    accountNumber: requireText(line.accountNumber, "posting_line_account_required"),
    debitAmount: Number(line.debitAmount || 0),
    creditAmount: Number(line.creditAmount || 0)
  }));
}

function normalizeOptionalBoolean(value) {
  if (value === true || value === false) {
    return value;
  }
  return null;
}

function normalizePolicyCode(value) {
  return requireText(String(value), "automation_policy_code_required")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function resolveConfidenceThreshold(decisionType, evidence, outputs) {
  if (decisionType === "posting_suggestion") {
    return 1;
  }
  if (decisionType === "classification") {
    if (
      hasEvidenceFlag(evidence, "personImpact")
      || hasEvidenceFlag(evidence, "privateSpendCandidate")
      || hasEvidenceFlag(evidence, "benefitBoundaryCase")
      || hasEvidenceFlag(evidence, "vatImpact")
    ) {
      return 0.98;
    }
    return 0.95;
  }
  if (decisionType === "anomaly_detection" && outputs?.flagged === true) {
    return 0.75;
  }
  return 0.7;
}

function resolveReviewCenterPlatform(getReviewCenterPlatform) {
  if (typeof getReviewCenterPlatform !== "function") {
    return null;
  }
  return getReviewCenterPlatform() || null;
}

function assertAllowed(value, allowedValues, code) {
  if (!allowedValues.includes(value)) {
    throw createError(400, code, `${value} is not supported.`);
  }
  return value;
}

function normalizeRulePack(rulePackInput, { defaultStatus, nowIso }) {
  const domain = requireText(rulePackInput.domain, "rule_pack_domain_required");
  const jurisdiction = requireText(rulePackInput.jurisdiction, "rule_pack_jurisdiction_required");
  const effectiveFrom = normalizeDate(rulePackInput.effectiveFrom, "rule_pack_effective_from_invalid");
  const effectiveTo =
    rulePackInput.effectiveTo === null || rulePackInput.effectiveTo === undefined || rulePackInput.effectiveTo === ""
      ? null
      : normalizeDate(rulePackInput.effectiveTo, "rule_pack_effective_to_invalid");
  if (effectiveTo && effectiveTo <= effectiveFrom) {
    throw createError(400, "rule_pack_effective_interval_invalid", "effectiveTo must be later than effectiveFrom.");
  }
  const version = requireText(String(rulePackInput.version), "rule_pack_version_required");
  const rulePackId = requireText(rulePackInput.rulePackId, "rule_pack_id_required");
  const rulePackCode = requireText(
    String(rulePackInput.rulePackCode || deriveRulePackCode({ domain, jurisdiction, rulePackId })),
    "rule_pack_code_required"
  ).toUpperCase();
  const status = normalizeOptionalStatus(rulePackInput.status) || defaultStatus;
  const machineReadableRules = copy(rulePackInput.machineReadableRules || {});
  const humanReadableExplanation = Array.isArray(rulePackInput.humanReadableExplanation)
    ? copy(rulePackInput.humanReadableExplanation)
    : [String(rulePackInput.humanReadableExplanation || "")].filter(Boolean);
  const testVectors = Array.isArray(rulePackInput.testVectors) ? copy(rulePackInput.testVectors) : [];
  const migrationNotes = Array.isArray(rulePackInput.migrationNotes) ? copy(rulePackInput.migrationNotes) : [];
  const sourceSnapshotDate = normalizeDate(
    rulePackInput.sourceSnapshotDate || effectiveFrom,
    "rule_pack_source_snapshot_date_invalid"
  );
  const checksum =
    typeof rulePackInput.checksum === "string" && rulePackInput.checksum.trim().length > 0
      ? rulePackInput.checksum.trim()
      : hashObject({
          domain,
          jurisdiction,
          rulePackCode,
          effectiveFrom,
          effectiveTo,
          version,
          machineReadableRules,
          humanReadableExplanation,
          testVectors,
          migrationNotes
        });

  return {
    rulePackId,
    rulePackCode,
    immutableVersionId: requireText(rulePackInput.immutableVersionId || rulePackId, "rule_pack_immutable_version_id_required"),
    domain,
    jurisdiction,
    status,
    effectiveFrom,
    effectiveTo,
    version,
    payloadSchemaVersion: requireText(String(rulePackInput.payloadSchemaVersion || "1"), "rule_pack_payload_schema_version_required"),
    approvalRef: normalizeOptionalText(rulePackInput.approvalRef),
    changeReason: requireText(
      rulePackInput.changeReason || rulePackInput.semanticChangeSummary || "Initial rule pack registration.",
      "rule_pack_change_reason_required"
    ),
    supersedesVersion: normalizeOptionalText(rulePackInput.supersedesVersion),
    rollbackPolicy: normalizeOptionalText(rulePackInput.rollbackPolicy) || "publish_successor_or_activate_prior_version",
    testVectorSetId: normalizeOptionalText(rulePackInput.testVectorSetId),
    createdBy: requireText(String(rulePackInput.createdBy || "system"), "rule_pack_created_by_required"),
    approvedBy: normalizeOptionalText(rulePackInput.approvedBy),
    publishedAt:
      normalizeOptionalTimestamp(rulePackInput.publishedAt, "rule_pack_published_at_invalid") ||
      (status === "published" || status === "retired" ? nowIso : null),
    retiredAt:
      normalizeOptionalTimestamp(rulePackInput.retiredAt, "rule_pack_retired_at_invalid") ||
      (status === "retired" ? nowIso : null),
    validatedAt:
      normalizeOptionalTimestamp(rulePackInput.validatedAt, "rule_pack_validated_at_invalid") ||
      (["validated", "approved", "published", "retired"].includes(status) ? nowIso : null),
    approvedAt:
      normalizeOptionalTimestamp(rulePackInput.approvedAt, "rule_pack_approved_at_invalid") ||
      (["approved", "published", "retired"].includes(status) ? nowIso : null),
    checksum,
    sourceSnapshotDate,
    semanticChangeSummary: requireText(
      rulePackInput.semanticChangeSummary || "Initial rule pack registration.",
      "rule_pack_semantic_change_summary_required"
    ),
    machineReadableRules,
    humanReadableExplanation,
    testVectors,
    migrationNotes,
    companyTypes: normalizeOptionalStringArray(rulePackInput.companyTypes),
    registrationCodes: normalizeOptionalStringArray(rulePackInput.registrationCodes),
    groupCodes: normalizeOptionalStringArray(rulePackInput.groupCodes),
    specialCaseCodes: normalizeOptionalStringArray(rulePackInput.specialCaseCodes),
    createdAt: normalizeOptionalTimestamp(rulePackInput.createdAt, "rule_pack_created_at_invalid") || nowIso,
    updatedAt: normalizeOptionalTimestamp(rulePackInput.updatedAt, "rule_pack_updated_at_invalid") || nowIso,
    emergencyDisabledAt: normalizeOptionalTimestamp(rulePackInput.emergencyDisabledAt, "rule_pack_emergency_disabled_at_invalid")
  };
}

function normalizeCandidatePostings(values, evidence) {
  const normalizedValues = Array.isArray(values) ? values : [];
  if (normalizedValues.length > 0) {
    return normalizedValues
      .map((value, index) => ({
        postingKey: requireText(value.postingKey || `candidate_${index + 1}`, "posting_candidate_key_required"),
        score: clampNumber(Number(value.score ?? 0.75), 0.01, 0.99),
        lines: Array.isArray(value.lines) && value.lines.length > 0
          ? value.lines.map((line) => ({
              accountNumber: requireText(line.accountNumber, "posting_line_account_required"),
              debitAmount: Number(line.debitAmount || 0),
              creditAmount: Number(line.creditAmount || 0)
            }))
          : defaultPostingLines(evidence)
      }))
      .sort((left, right) => right.score - left.score);
  }

  const lines = defaultPostingLines(evidence);
  return [{
    postingKey: "default",
    score: evidence?.documentType === "supplier_invoice" ? 0.78 : 0.74,
    lines
  }];
}

function defaultPostingLines(evidence = {}) {
  const documentType = String(evidence.documentType || evidence.sourceObjectType || "").trim();
  if (documentType === "supplier_invoice") {
    return [
      { accountNumber: "5410", debitAmount: 1000, creditAmount: 0 },
      { accountNumber: "2440", debitAmount: 0, creditAmount: 1000 }
    ];
  }
  return [
    { accountNumber: "1510", debitAmount: 1000, creditAmount: 0 },
    { accountNumber: "3010", debitAmount: 0, creditAmount: 1000 }
  ];
}

function normalizeClassificationCandidates(values, evidence) {
  const normalizedValues = Array.isArray(values) ? values : [];
  if (normalizedValues.length > 0) {
    return normalizedValues
      .map((value, index) => ({
        code: requireText(value.code || `class_${index + 1}`, "classification_candidate_code_required"),
        score: clampNumber(Number(value.score ?? 0.75), 0.01, 0.99)
      }))
      .sort((left, right) => right.score - left.score);
  }
  return [{
    code: evidence?.documentType === "supplier_invoice" ? "supplier_invoice" : "customer_invoice",
    score: evidence?.ocrConfidence ? clampNumber(Number(evidence.ocrConfidence), 0.4, 0.99) : 0.72
  }];
}

function buildPostingExplanation(rulePack, candidate, evidence) {
  return [
    rulePack
      ? `Rule pack ${rulePack.rulePackId} (${rulePack.rulePackCode}) evaluated for posting suggestion.`
      : "No matching automation rule pack was supplied; using deterministic fallback heuristics.",
    `Top candidate ${candidate.postingKey} scored ${candidate.score.toFixed(2)}.`,
    `Evidence source ${String(evidence.documentType || evidence.sourceObjectType || "unknown")} was used to shape the posting lines.`
  ];
}

function buildClassificationExplanation(rulePack, candidate, evidence) {
  return [
    rulePack
      ? `Rule pack ${rulePack.rulePackId} (${rulePack.rulePackCode}) evaluated classification evidence.`
      : "Classification fallback logic used evidence completeness and supplied candidates.",
    `Selected class ${candidate.code} with score ${candidate.score.toFixed(2)}.`,
    `Evidence fields available: ${Object.keys(evidence || {}).sort().join(", ") || "none"}.`
  ];
}

function buildAnomalyExplanation(rulePack, deviationPercent, threshold, evidence) {
  return [
    rulePack
      ? `Rule pack ${rulePack.rulePackId} (${rulePack.rulePackCode}) informed anomaly tolerance.`
      : "Default anomaly tolerance evaluation applied.",
    `Deviation measured ${deviationPercent.toFixed(2)}% against threshold ${Number(threshold).toFixed(2)}%.`,
    `Evidence fields available: ${Object.keys(evidence || {}).sort().join(", ") || "none"}.`
  ];
}

function matchesCondition(condition, facts) {
  const field = requireText(condition?.field, "rule_condition_field_required");
  const actualValue = facts?.[field];
  if (Object.hasOwn(condition || {}, "equals")) {
    return actualValue === condition.equals;
  }
  if (Object.hasOwn(condition || {}, "contains")) {
    return Array.isArray(actualValue) ? actualValue.includes(condition.contains) : String(actualValue || "").includes(String(condition.contains));
  }
  if (Object.hasOwn(condition || {}, "gt")) {
    return Number(actualValue) > Number(condition.gt);
  }
  if (Object.hasOwn(condition || {}, "lt")) {
    return Number(actualValue) < Number(condition.lt);
  }
  return false;
}

function clampNumber(value, floor, ceiling) {
  const resolvedValue = Number.isFinite(Number(value)) ? Number(value) : floor;
  return Math.min(ceiling, Math.max(floor, resolvedValue));
}

function sortRulePacks(left, right) {
  const domainComparison = left.domain.localeCompare(right.domain);
  if (domainComparison !== 0) {
    return domainComparison;
  }
  const jurisdictionComparison = left.jurisdiction.localeCompare(right.jurisdiction);
  if (jurisdictionComparison !== 0) {
    return jurisdictionComparison;
  }
  const codeComparison = left.rulePackCode.localeCompare(right.rulePackCode);
  if (codeComparison !== 0) {
    return codeComparison;
  }
  const fromComparison = right.effectiveFrom.localeCompare(left.effectiveFrom);
  if (fromComparison !== 0) {
    return fromComparison;
  }
  const publishedComparison = String(right.publishedAt || "").localeCompare(String(left.publishedAt || ""));
  if (publishedComparison !== 0) {
    return publishedComparison;
  }
  const versionComparison = right.version.localeCompare(left.version);
  if (versionComparison !== 0) {
    return versionComparison;
  }
  return right.rulePackId.localeCompare(left.rulePackId);
}

function sortRollbackRecords(left, right) {
  const effectiveComparison = right.effectiveFrom.localeCompare(left.effectiveFrom);
  if (effectiveComparison !== 0) {
    return effectiveComparison;
  }
  return right.createdAt.localeCompare(left.createdAt);
}

function normalizeOptionalStatus(value) {
  if (value == null || value === "") {
    return null;
  }
  return assertAllowed(requireText(String(value), "rule_pack_status_invalid"), RULE_PACK_STATUSES, "rule_pack_status_invalid");
}

function normalizeOptionalStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value.map((item) => requireText(String(item), "rule_pack_filter_value_invalid")))].sort();
}

function normalizeOptionalText(value) {
  if (value == null || value === "") {
    return null;
  }
  return requireText(String(value), "optional_text_invalid");
}

function normalizeOptionalTimestamp(value, code) {
  if (value == null || value === "") {
    return null;
  }
  const resolvedValue = requireText(String(value), code);
  const parsed = Date.parse(resolvedValue);
  if (Number.isNaN(parsed)) {
    throw createError(400, code, `${resolvedValue} must be an ISO timestamp.`);
  }
  return new Date(parsed).toISOString();
}

function deriveRulePackCode({ domain, jurisdiction, rulePackId }) {
  const base = `${jurisdiction}_${domain}_${String(rulePackId || "RULE_PACK")}`;
  return base
    .replaceAll(/[^A-Za-z0-9]+/g, "_")
    .replaceAll(/_+/g, "_")
    .replace(/^_/, "")
    .replace(/_$/, "")
    .toUpperCase();
}

function scopeMatches(rulePack, selectionInputs = {}) {
  return (
    matchesScopedValue(rulePack.companyTypes, selectionInputs.companyType) &&
    matchesScopedValue(rulePack.registrationCodes, selectionInputs.registrationCode) &&
    matchesScopedValue(rulePack.groupCodes, selectionInputs.groupCode) &&
    matchesScopedValue(rulePack.specialCaseCodes, selectionInputs.specialCaseCode)
  );
}

function matchesScopedValue(allowedValues, actualValue) {
  if (!Array.isArray(allowedValues) || allowedValues.length === 0) {
    return true;
  }
  return actualValue != null && allowedValues.includes(requireText(String(actualValue), "rule_pack_scope_value_required"));
}

function intervalsOverlap(left, right) {
  const leftEnd = left.effectiveTo || "9999-12-31";
  const rightEnd = right.effectiveTo || "9999-12-31";
  return left.effectiveFrom < rightEnd && right.effectiveFrom < leftEnd;
}

function attachSelectionMetadata(rulePack, selectionMode, rollbackId) {
  const resolvedRulePack = copy(rulePack);
  resolvedRulePack.selectionMode = assertAllowed(selectionMode, RULE_PACK_SELECTION_MODES, "rule_pack_selection_mode_invalid");
  if (rollbackId) {
    resolvedRulePack.rollbackId = rollbackId;
  }
  return resolvedRulePack;
}

function buildScopeSignature(rulePack) {
  return JSON.stringify({
    companyTypes: rulePack.companyTypes || [],
    registrationCodes: rulePack.registrationCodes || [],
    groupCodes: rulePack.groupCodes || [],
    specialCaseCodes: rulePack.specialCaseCodes || []
  });
}

function normalizeDate(value, code) {
  const resolvedValue = requireText(value, code);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolvedValue)) {
    throw createError(400, code, `${resolvedValue} must be an ISO date (YYYY-MM-DD).`);
  }
  return resolvedValue;
}

function requireText(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createError(400, code, `${code} is required.`);
  }
  return value.trim();
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
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
