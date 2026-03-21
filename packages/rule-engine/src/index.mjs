import crypto from "node:crypto";

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
