import crypto from "node:crypto";

export const AUTOMATION_DECISION_TYPES = Object.freeze(["posting_suggestion", "classification", "anomaly_detection"]);
export const AUTOMATION_DECISION_STATES = Object.freeze(["proposed", "manual_override", "accepted"]);

export function createRulePackRegistry({ clock = () => new Date(), seedRulePacks = [] } = {}) {
  const state = {
    rulePacks: new Map()
  };

  for (const rulePack of seedRulePacks) {
    registerRulePack(rulePack);
  }

  return {
    registerRulePack,
    listRulePacks,
    resolveRulePack,
    buildRuleDecision
  };

  function registerRulePack(rulePackInput = {}) {
    const normalized = normalizeRulePack(rulePackInput);
    state.rulePacks.set(normalized.rulePackId, normalized);
    return copy(normalized);
  }

  function listRulePacks({ domain = null, jurisdiction = null } = {}) {
    return [...state.rulePacks.values()]
      .filter((rulePack) => (domain ? rulePack.domain === domain : true))
      .filter((rulePack) => (jurisdiction ? rulePack.jurisdiction === jurisdiction : true))
      .sort(sortRulePacks)
      .map(copy);
  }

  function resolveRulePack({
    domain,
    jurisdiction,
    effectiveDate,
    companyType = null,
    registrationCode = null,
    groupCode = null,
    specialCaseCode = null
  } = {}) {
    const resolvedDomain = requireText(domain, "rule_pack_domain_required");
    const resolvedJurisdiction = requireText(jurisdiction, "rule_pack_jurisdiction_required");
    const resolvedEffectiveDate = normalizeDate(effectiveDate || nowDate(), "rule_pack_effective_date_invalid");
    const matches = listRulePacks({
      domain: resolvedDomain,
      jurisdiction: resolvedJurisdiction
    }).filter((rulePack) => {
      if (rulePack.effectiveFrom > resolvedEffectiveDate) {
        return false;
      }
      if (rulePack.effectiveTo && rulePack.effectiveTo < resolvedEffectiveDate) {
        return false;
      }
      if (rulePack.companyTypes.length > 0 && companyType && !rulePack.companyTypes.includes(companyType)) {
        return false;
      }
      if (rulePack.registrationCodes.length > 0 && registrationCode && !rulePack.registrationCodes.includes(registrationCode)) {
        return false;
      }
      if (rulePack.groupCodes.length > 0 && groupCode && !rulePack.groupCodes.includes(groupCode)) {
        return false;
      }
      if (rulePack.specialCaseCodes.length > 0 && specialCaseCode && !rulePack.specialCaseCodes.includes(specialCaseCode)) {
        return false;
      }
      return true;
    });

    if (matches.length === 0) {
      const error = new Error(`No rule pack matched ${resolvedDomain}/${resolvedJurisdiction} on ${resolvedEffectiveDate}.`);
      error.status = 404;
      error.code = "rule_pack_not_found";
      throw error;
    }

    return copy(matches[0]);
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
      effectiveDate: normalizeDate(effectiveDate || nowDate(), "decision_effective_date_invalid"),
      outputs: copy(outputs || {}),
      warnings: Array.isArray(warnings) ? copy(warnings) : [],
      explanation: Array.isArray(explanation) ? copy(explanation) : [],
      needsManualReview: needsManualReview === true,
      generatedAt: new Date(clock()).toISOString()
    };
  }

  function nowDate() {
    return new Date(clock()).toISOString().slice(0, 10);
  }
}

export function createAutomationAiEngine({ clock = () => new Date(), seedRulePacks = [] } = {}) {
  const registry = createRulePackRegistry({ clock, seedRulePacks });
  const state = {
    decisions: new Map()
  };

  function nowDate() {
    return new Date(clock()).toISOString().slice(0, 10);
  }

  return {
    ...registry,
    automationDecisionTypes: AUTOMATION_DECISION_TYPES,
    automationDecisionStates: AUTOMATION_DECISION_STATES,
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
    return registry.registerRulePack({
      rulePackId: input.rulePackId || crypto.randomUUID(),
      sourceSnapshotDate: input.sourceSnapshotDate || input.effectiveFrom,
      semanticChangeSummary: input.semanticChangeSummary || "Registered no-code automation rule pack.",
      ...input
    });
  }

  function listNoCodeRulePacks({ domain = null, jurisdiction = null } = {}) {
    return registry.listRulePacks({ domain, jurisdiction });
  }

  function evaluateNoCodeRulePack({ rulePackId, facts = {} } = {}) {
    const rulePack = registry.listRulePacks().find((candidate) => candidate.rulePackId === requireText(rulePackId, "rule_pack_id_required"));
    if (!rulePack) {
      throw createError(404, "rule_pack_not_found", "Rule pack was not found.");
    }
    const rules = rulePack.machineReadableRules || {};
    const conditions = Array.isArray(rules.conditions)
      ? rules.conditions
      : Array.isArray(rules.when)
        ? rules.when
        : [];
    const matched = conditions.every((condition) => matchesCondition(condition, facts));
    return {
      rulePackId: rulePack.rulePackId,
      matched,
      outputs: matched ? copy(rules.then || rules.outputs || {}) : {}
    };
  }

  function suggestLedgerPosting({
    companyId,
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
    return recordDecision({
      companyId,
      decisionType: "posting_suggestion",
      actorId,
      effectiveDate,
      rulePack: resolvedRulePack,
      inputs: {
        sourceObjectType,
        sourceObjectId,
        candidatePostings: candidates,
        evidence
      },
      outputs: {
        suggestedLines: topCandidate.lines,
        safeToPost: false,
        postingKey: topCandidate.postingKey
      },
      explanation: buildPostingExplanation(resolvedRulePack, topCandidate, evidence),
      warnings: confidence < 0.85 ? [{ code: "manual_review_required", message: "Posting suggestion requires human approval." }] : [],
      needsManualReview: true,
      confidence
    });
  }

  function classifyArtifact({
    companyId,
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
    return recordDecision({
      companyId,
      decisionType: "classification",
      actorId,
      effectiveDate,
      rulePack: resolvedRulePack,
      inputs: {
        classifierType,
        candidates: normalizedCandidates,
        evidence
      },
      outputs: {
        classifierType: requireText(classifierType, "classifier_type_required"),
        selectedCode: winningCandidate.code
      },
      explanation: buildClassificationExplanation(resolvedRulePack, winningCandidate, evidence),
      warnings: confidence < 0.8 ? [{ code: "classification_confidence_low", message: "Classification should be reviewed before automation continues." }] : [],
      needsManualReview: confidence < 0.95,
      confidence
    });
  }

  function detectAnomaly({
    companyId,
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
    return recordDecision({
      companyId,
      decisionType: "anomaly_detection",
      actorId,
      effectiveDate,
      rulePack: resolvedRulePack,
      inputs: {
        anomalyType,
        actualValue: resolvedActualValue,
        expectedValue: resolvedExpectedValue,
        tolerancePercent: threshold,
        evidence
      },
      outputs: {
        anomalyType: requireText(anomalyType, "anomaly_type_required"),
        flagged,
        deviationPercent,
        severity: flagged ? (deviationPercent >= threshold * 2 ? "high" : "medium") : "informational"
      },
      explanation: buildAnomalyExplanation(resolvedRulePack, deviationPercent, threshold, evidence),
      warnings: flagged ? [{ code: "anomaly_flagged", message: "Anomaly requires review before downstream automation continues." }] : [],
      needsManualReview: flagged,
      confidence
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
    decision.state = "manual_override";
    decision.override = {
      overrideId: crypto.randomUUID(),
      actorId: requireText(actorId || "system", "actor_id_required"),
      overrideReasonCode: requireText(overrideReasonCode, "automation_override_reason_required"),
      acceptedOutputs: copy(acceptedOutputs || decision.outputs),
      overriddenAt: new Date(clock()).toISOString()
    };
    return copy(decision);
  }

  function resolveOptionalRulePack(rulePackId, effectiveDate) {
    if (!rulePackId) {
      return null;
    }
    return registry.listRulePacks().find((candidate) => candidate.rulePackId === rulePackId)
      || registry.resolveRulePack({
        domain: "automation",
        jurisdiction: "SE",
        effectiveDate
      });
  }

  function recordDecision({
    companyId,
    decisionType,
    actorId,
    effectiveDate,
    rulePack,
    inputs,
    outputs,
    explanation,
    warnings,
    needsManualReview,
    confidence
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
      decisionType: assertAllowed(decisionType, AUTOMATION_DECISION_TYPES, "automation_decision_type_invalid"),
      state: "proposed",
      actorId: requireText(actorId || "system", "actor_id_required"),
      confidence: Number(Number(confidence).toFixed(4)),
      ...ruleDecision
    };
    state.decisions.set(decision.decisionId, decision);
    return copy(decision);
  }
}

function assertAllowed(value, allowedValues, code) {
  if (!allowedValues.includes(value)) {
    throw createError(400, code, `${value} is not supported.`);
  }
  return value;
}

function normalizeRulePack(rulePackInput) {
  const domain = requireText(rulePackInput.domain, "rule_pack_domain_required");
  const jurisdiction = requireText(rulePackInput.jurisdiction, "rule_pack_jurisdiction_required");
  const effectiveFrom = normalizeDate(rulePackInput.effectiveFrom, "rule_pack_effective_from_invalid");
  const effectiveTo =
    rulePackInput.effectiveTo === null || rulePackInput.effectiveTo === undefined || rulePackInput.effectiveTo === ""
      ? null
      : normalizeDate(rulePackInput.effectiveTo, "rule_pack_effective_to_invalid");
  const version = requireText(String(rulePackInput.version), "rule_pack_version_required");
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
          effectiveFrom,
          effectiveTo,
          version,
          machineReadableRules,
          humanReadableExplanation,
          testVectors,
          migrationNotes
        });

  return {
    rulePackId: requireText(rulePackInput.rulePackId, "rule_pack_id_required"),
    domain,
    jurisdiction,
    effectiveFrom,
    effectiveTo,
    version,
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
    createdAt: rulePackInput.createdAt || new Date().toISOString()
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
    rulePack ? `Rule pack ${rulePack.rulePackId} evaluated for posting suggestion.` : "No matching automation rule pack was supplied; using deterministic fallback heuristics.",
    `Top candidate ${candidate.postingKey} scored ${candidate.score.toFixed(2)}.`,
    `Evidence source ${String(evidence.documentType || evidence.sourceObjectType || "unknown")} was used to shape the posting lines.`
  ];
}

function buildClassificationExplanation(rulePack, candidate, evidence) {
  return [
    rulePack ? `Rule pack ${rulePack.rulePackId} evaluated classification evidence.` : "Classification fallback logic used evidence completeness and supplied candidates.",
    `Selected class ${candidate.code} with score ${candidate.score.toFixed(2)}.`,
    `Evidence fields available: ${Object.keys(evidence || {}).sort().join(", ") || "none"}.`
  ];
}

function buildAnomalyExplanation(rulePack, deviationPercent, threshold, evidence) {
  return [
    rulePack ? `Rule pack ${rulePack.rulePackId} informed anomaly tolerance.` : "Default anomaly tolerance evaluation applied.",
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
  const fromComparison = right.effectiveFrom.localeCompare(left.effectiveFrom);
  if (fromComparison !== 0) {
    return fromComparison;
  }
  return right.version.localeCompare(left.version);
}

function normalizeOptionalStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value.map((item) => requireText(String(item), "rule_pack_filter_value_invalid")))].sort();
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
