import crypto from "node:crypto";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";

export const REGULATORY_CHANGE_TARGET_TYPES = Object.freeze(["rule_pack", "provider_baseline"]);
export const REGULATORY_CHANGE_STATUSES = Object.freeze([
  "planned",
  "source_captured",
  "diff_reviewed",
  "sandbox_verified",
  "approved",
  "published",
  "rollback_activated",
  "cancelled"
]);
export const REGULATORY_CHANGE_APPROVAL_ROLES = Object.freeze(["domain_owner", "compliance_owner"]);
export const REGULATORY_CHANGE_SANDBOX_RESULTS = Object.freeze(["passed", "failed"]);

export function createRegulatoryChangeCalendar({
  clock = () => new Date(),
  resolveRulePackTargets = null,
  providerBaselineRegistry = null
} = {}) {
  const state = {
    changes: new Map(),
    changeIdsByCompany: new Map(),
    changeIdByIdempotencyKey: new Map()
  };

  function requireChangeEntry(regulatoryChangeEntryId) {
    const entry = state.changes.get(requireText(regulatoryChangeEntryId, "regulatory_change_entry_id_required"));
    if (!entry) {
      throw createError(404, "regulatory_change_entry_not_found", "Regulatory change entry was not found.");
    }
    return entry;
  }

  function requireOwnedChangeEntry(companyId, regulatoryChangeEntryId) {
    const entry = requireChangeEntry(regulatoryChangeEntryId);
    if (entry.companyId !== requireText(companyId, "company_id_required")) {
      throw createError(404, "regulatory_change_entry_not_found", "Regulatory change entry was not found.");
    }
    return entry;
  }

  return {
    regulatoryChangeTargetTypes: REGULATORY_CHANGE_TARGET_TYPES,
    regulatoryChangeStatuses: REGULATORY_CHANGE_STATUSES,
    regulatoryChangeApprovalRoles: REGULATORY_CHANGE_APPROVAL_ROLES,
    regulatoryChangeSandboxResults: REGULATORY_CHANGE_SANDBOX_RESULTS,
    createRegulatoryChangeEntry,
    listRegulatoryChangeEntries,
    getRegulatoryChangeEntry,
    captureRegulatorySourceSnapshot,
    recordRegulatoryDiffReview,
    recordRegulatorySandboxVerification,
    approveRegulatoryChange,
    publishRegulatoryChange,
    activateRegulatoryRollback,
    snapshotRegulatoryChangeCalendar
  };

  function createRegulatoryChangeEntry({
    companyId,
    targetType,
    targetKey = null,
    targetId,
    changeSummary,
    reasonCode,
    plannedPublishAt = null,
    stagedPublishAt = null,
    actorId = "system",
    idempotencyKey = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedTargetType = requireEnum(REGULATORY_CHANGE_TARGET_TYPES, targetType, "regulatory_change_target_type_invalid");
    const resolvedTargetId = requireText(targetId, "regulatory_change_target_id_required");
    const resolvedTargetKey = normalizeOptionalText(targetKey) || defaultTargetKeyForType(resolvedTargetType);
    const resolvedSummary = requireText(changeSummary, "regulatory_change_summary_required");
    const resolvedReasonCode = requireText(reasonCode, "regulatory_change_reason_code_required");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedIdempotencyKey =
      normalizeOptionalText(idempotencyKey) ||
      hashObject({
        companyId: resolvedCompanyId,
        targetType: resolvedTargetType,
        targetKey: resolvedTargetKey,
        targetId: resolvedTargetId,
        reasonCode: resolvedReasonCode
      });

    const existingId = state.changeIdByIdempotencyKey.get(resolvedCompanyId)?.get(resolvedIdempotencyKey) || null;
    if (existingId) {
      return requireChangeEntry(existingId);
    }

    const target = resolveTarget({
      targetType: resolvedTargetType,
      targetKey: resolvedTargetKey,
      targetId: resolvedTargetId
    });
    const timestamp = nowIso(clock);
    const entry = {
      regulatoryChangeEntryId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      targetType: resolvedTargetType,
      targetKey: resolvedTargetKey,
      targetId: resolvedTargetId,
      targetCode: requireText(target.targetCode, "regulatory_change_target_code_required"),
      targetDomain: requireText(target.targetDomain, "regulatory_change_target_domain_required"),
      targetVersion: requireText(target.targetVersion, "regulatory_change_target_version_required"),
      providerCode: normalizeOptionalText(target.providerCode),
      effectiveFrom: normalizeOptionalText(target.effectiveFrom),
      changeSummary: resolvedSummary,
      reasonCode: resolvedReasonCode,
      plannedPublishAt: normalizeOptionalIsoDateTime(plannedPublishAt, "regulatory_change_planned_publish_at_invalid"),
      stagedPublishAt: normalizeOptionalIsoDateTime(stagedPublishAt, "regulatory_change_staged_publish_at_invalid"),
      sourceSnapshot: null,
      diffReview: null,
      sandboxVerification: null,
      approvals: [],
      publication: null,
      rollback: null,
      status: "planned",
      createdByActorId: resolvedActorId,
      createdAt: timestamp,
      updatedAt: timestamp,
      idempotencyKey: resolvedIdempotencyKey
    };
    if (entry.plannedPublishAt && entry.stagedPublishAt && entry.stagedPublishAt < entry.plannedPublishAt) {
      throw createError(
        400,
        "regulatory_change_staged_publish_before_planned",
        "stagedPublishAt must be on or after plannedPublishAt."
      );
    }
    state.changes.set(entry.regulatoryChangeEntryId, entry);
    appendToIndex(state.changeIdsByCompany, resolvedCompanyId, entry.regulatoryChangeEntryId);
    setNestedMapValue(state.changeIdByIdempotencyKey, resolvedCompanyId, resolvedIdempotencyKey, entry.regulatoryChangeEntryId);
    return copy(entry);
  }

  function listRegulatoryChangeEntries({ companyId, status = null, targetType = null, targetKey = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.changeIdsByCompany.get(resolvedCompanyId) || [])
      .map((changeId) => state.changes.get(changeId))
      .filter(Boolean)
      .filter((entry) => (status ? entry.status === status : true))
      .filter((entry) => (targetType ? entry.targetType === targetType : true))
      .filter((entry) => (targetKey ? entry.targetKey === targetKey : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function getRegulatoryChangeEntry({ regulatoryChangeEntryId, required = true } = {}) {
    const entry = state.changes.get(requireText(regulatoryChangeEntryId, "regulatory_change_entry_id_required")) || null;
    if (!entry && required) {
      throw createError(404, "regulatory_change_entry_not_found", "Regulatory change entry was not found.");
    }
    return entry ? copy(entry) : null;
  }

  function captureRegulatorySourceSnapshot({
    companyId,
    regulatoryChangeEntryId,
    actorId = "system",
    officialSourceUrl,
    officialSourceRefs = [],
    retrievedAt,
    sourceChecksum,
    sourceSnapshotDate = null,
    note = null
  } = {}) {
    const entry = requireOwnedChangeEntry(companyId, regulatoryChangeEntryId);
    const normalizedSourceRefs = normalizeOfficialSourceRefs({
      officialSourceRefs,
      officialSourceUrl,
      retrievedAt,
      sourceChecksum,
      sourceSnapshotDate,
      note,
      nowIso: nowIso(clock),
      nowDate: nowDate(clock)
    });
    entry.sourceSnapshot = {
      officialSourceUrl: normalizedSourceRefs[0].url,
      officialSourceRefs: normalizedSourceRefs,
      retrievedAt: normalizedSourceRefs[0].retrievedAt,
      sourceChecksum: normalizedSourceRefs[0].checksum,
      sourceSnapshotDate: normalizedSourceRefs[0].sourceSnapshotDate,
      note: normalizeOptionalText(note),
      actorId: requireText(actorId, "actor_id_required"),
      recordedAt: nowIso(clock)
    };
    entry.status = maxStatus(entry.status, "source_captured");
    entry.updatedAt = nowIso(clock);
    return copy(entry);
  }

  function recordRegulatoryDiffReview({
    companyId,
    regulatoryChangeEntryId,
    actorId = "system",
    diffSummary,
    impactSummary,
    approved = true,
    breakingChangeRefs = []
  } = {}) {
    const entry = requireOwnedChangeEntry(companyId, regulatoryChangeEntryId);
    requireSourceSnapshot(entry);
    const approvedFlag = approved !== false;
    entry.diffReview = {
      diffSummary: requireText(diffSummary, "regulatory_diff_summary_required"),
      impactSummary: requireText(impactSummary, "regulatory_impact_summary_required"),
      approved: approvedFlag,
      breakingChangeRefs: normalizeStringArray(breakingChangeRefs),
      actorId: requireText(actorId, "actor_id_required"),
      reviewedAt: nowIso(clock)
    };
    entry.status = approvedFlag ? maxStatus(entry.status, "diff_reviewed") : "source_captured";
    entry.updatedAt = nowIso(clock);
    return copy(entry);
  }

  function recordRegulatorySandboxVerification({
    companyId,
    regulatoryChangeEntryId,
    actorId = "system",
    verificationResult,
    verificationEnvironment = "sandbox_internal",
    scenarioRefs = [],
    outputChecksum = null,
    evidenceRef = null
  } = {}) {
    const entry = requireOwnedChangeEntry(companyId, regulatoryChangeEntryId);
    requireApprovedDiffReview(entry);
    const resolvedResult = requireEnum(REGULATORY_CHANGE_SANDBOX_RESULTS, verificationResult, "regulatory_sandbox_result_invalid");
    const resolvedScenarioRefs = normalizeStringArray(scenarioRefs);
    const resolvedOutputChecksum = normalizeOptionalText(outputChecksum);
    if (resolvedResult === "passed" && resolvedScenarioRefs.length === 0) {
      throw createError(
        409,
        "regulatory_change_golden_vectors_required",
        "Passed sandbox verification must cite at least one golden vector or scenario reference."
      );
    }
    if (resolvedResult === "passed" && !resolvedOutputChecksum) {
      throw createError(
        409,
        "regulatory_change_output_checksum_required",
        "Passed sandbox verification must record an output checksum."
      );
    }
    entry.sandboxVerification = {
      verificationResult: resolvedResult,
      verificationEnvironment: requireText(verificationEnvironment, "regulatory_sandbox_environment_required"),
      scenarioRefs: resolvedScenarioRefs,
      outputChecksum: resolvedOutputChecksum,
      evidenceRef: normalizeOptionalText(evidenceRef),
      actorId: requireText(actorId, "actor_id_required"),
      verifiedAt: nowIso(clock)
    };
    entry.status = resolvedResult === "passed" ? maxStatus(entry.status, "sandbox_verified") : "diff_reviewed";
    entry.updatedAt = nowIso(clock);
    return copy(entry);
  }

  function approveRegulatoryChange({
    companyId,
    regulatoryChangeEntryId,
    actorId = "system",
    approvalRole,
    approvalRef = null,
    note = null
  } = {}) {
    const entry = requireOwnedChangeEntry(companyId, regulatoryChangeEntryId);
    requirePassedSandboxVerification(entry);
    const resolvedRole = requireEnum(REGULATORY_CHANGE_APPROVAL_ROLES, approvalRole, "regulatory_change_approval_role_invalid");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const approval = {
      approvalRole: resolvedRole,
      actorId: resolvedActorId,
      approvalRef: normalizeOptionalText(approvalRef),
      note: normalizeOptionalText(note),
      approvedAt: nowIso(clock)
    };
    entry.approvals = [
      ...entry.approvals.filter((candidate) => candidate.approvalRole !== resolvedRole),
      approval
    ].sort((left, right) => left.approvalRole.localeCompare(right.approvalRole));
    if (hasFullApprovalSet(entry)) {
      entry.status = "approved";
    }
    entry.updatedAt = nowIso(clock);
    return copy(entry);
  }

  function publishRegulatoryChange({
    companyId,
    regulatoryChangeEntryId,
    actorId = "system",
    approvalRef = null
  } = {}) {
    const entry = requireOwnedChangeEntry(companyId, regulatoryChangeEntryId);
    requirePublishReady(entry);
    const stagedPublishAt = normalizeOptionalText(entry.stagedPublishAt);
    if (stagedPublishAt && nowIso(clock) < stagedPublishAt) {
      throw createError(
        409,
        "regulatory_change_staged_publish_pending",
        "Staged publish time has not been reached yet."
      );
    }
    const target = resolveTarget({
      targetType: entry.targetType,
      targetKey: entry.targetKey,
      targetId: entry.targetId
    });
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const targetSnapshot = publishTarget({
      target,
      targetType: entry.targetType,
      targetId: entry.targetId,
      actorId: resolvedActorId,
      approvalRef: normalizeOptionalText(approvalRef) || entry.approvals.find((candidate) => candidate.approvalRole === "compliance_owner")?.approvalRef || null
    });
    entry.publication = {
      publishedAt: nowIso(clock),
      publishedByActorId: resolvedActorId,
      approvalRef: normalizeOptionalText(approvalRef),
      targetSnapshot
    };
    entry.status = "published";
    entry.updatedAt = entry.publication.publishedAt;
    return copy(entry);
  }

  function activateRegulatoryRollback({
    companyId,
    regulatoryChangeEntryId,
    actorId = "system",
    effectiveFrom = null,
    reasonCode,
    replayRequired = false
  } = {}) {
    const entry = requireOwnedChangeEntry(companyId, regulatoryChangeEntryId);
    if (!["published", "rollback_activated"].includes(entry.status)) {
      throw createError(409, "regulatory_change_rollback_not_allowed", "Rollback requires a published change entry.");
    }
    if (entry.rollback) {
      return copy(entry);
    }
    const target = resolveTarget({
      targetType: entry.targetType,
      targetKey: entry.targetKey,
      targetId: entry.targetId
    });
    const rollbackRecord = rollbackTarget({
      target,
      targetType: entry.targetType,
      targetId: entry.targetId,
      actorId: requireText(actorId, "actor_id_required"),
      effectiveFrom: normalizeOptionalText(effectiveFrom),
      reasonCode: requireText(reasonCode, "regulatory_change_rollback_reason_required"),
      replayRequired: replayRequired === true
    });
    entry.rollback = {
      rollbackAt: nowIso(clock),
      rollbackByActorId: requireText(actorId, "actor_id_required"),
      rollbackRecord
    };
    entry.status = "rollback_activated";
    entry.updatedAt = entry.rollback.rollbackAt;
    return copy(entry);
  }

  function snapshotRegulatoryChangeCalendar({ companyId } = {}) {
    const items = listRegulatoryChangeEntries({ companyId });
    return {
      totalCount: items.length,
      plannedCount: items.filter((item) => item.status === "planned").length,
      pendingApprovalCount: items.filter((item) => ["source_captured", "diff_reviewed", "sandbox_verified"].includes(item.status)).length,
      approvedCount: items.filter((item) => item.status === "approved").length,
      publishedCount: items.filter((item) => item.status === "published").length,
      rollbackCount: items.filter((item) => item.status === "rollback_activated").length,
      items
    };
  }

  function resolveTarget({ targetType, targetKey, targetId }) {
    if (targetType === "provider_baseline") {
      if (!providerBaselineRegistry?.getProviderBaseline) {
        throw createError(500, "provider_baseline_registry_required", "Provider baseline registry is required.");
      }
      const providerBaseline = providerBaselineRegistry.getProviderBaseline({
        providerBaselineId: targetId
      });
      return {
        targetType,
        targetKey,
        targetId,
        targetCode: providerBaseline.baselineCode,
        targetDomain: providerBaseline.domain,
        targetVersion: providerBaseline.version,
        providerCode: providerBaseline.providerCode,
        effectiveFrom: providerBaseline.effectiveFrom,
        getStatus: () => providerBaselineRegistry.getProviderBaseline({ providerBaselineId: targetId }).status,
        validate: ({ actorId }) => providerBaselineRegistry.validateProviderBaselineVersion({ providerBaselineId: targetId, actorId }),
        approve: ({ actorId, approvalRef }) => providerBaselineRegistry.approveProviderBaselineVersion({ providerBaselineId: targetId, actorId, approvalRef }),
        publish: ({ actorId, approvalRef }) => providerBaselineRegistry.publishProviderBaselineVersion({ providerBaselineId: targetId, actorId, approvalRef }),
        rollback: ({ actorId, effectiveFrom, reasonCode, replayRequired }) =>
          providerBaselineRegistry.rollbackProviderBaselineVersion({
            providerBaselineId: targetId,
            actorId,
            effectiveFrom,
            reasonCode,
            replayRequired
          })
      };
    }

    const targets = normalizeRulePackTargets(resolveRulePackTargets);
    const target = targets.get(targetKey);
    if (!target) {
      throw createError(404, "regulatory_rule_pack_target_not_found", `Rule-pack target ${targetKey} was not found.`);
    }
    const rulePack = target.getRulePack({ rulePackId: targetId });
    return {
      targetType,
      targetKey,
      targetId,
      targetCode: rulePack.rulePackCode,
      targetDomain: rulePack.domain,
      targetVersion: rulePack.version,
      providerCode: null,
      effectiveFrom: rulePack.effectiveFrom,
      getStatus: () => target.getRulePack({ rulePackId: targetId }).status,
      validate: ({ actorId }) => target.validateRulePackVersion({ rulePackId: targetId, actorId }),
      approve: ({ actorId, approvalRef }) => target.approveRulePackVersion({ rulePackId: targetId, actorId, approvalRef }),
      publish: ({ actorId, approvalRef }) => target.publishRulePackVersion({ rulePackId: targetId, actorId, approvalRef }),
      rollback: ({ actorId, effectiveFrom, reasonCode, replayRequired }) =>
        target.rollbackRulePackVersion({
          rulePackId: targetId,
          actorId,
          effectiveFrom,
          reasonCode,
          replayRequired
        })
    };
  }
}

function publishTarget({ target, targetType, targetId, actorId, approvalRef }) {
  const currentStatus = target.getStatus();
  if (currentStatus === "draft") {
    target.validate({ actorId });
    target.approve({ actorId, approvalRef });
    return target.publish({ actorId, approvalRef });
  }
  if (currentStatus === "validated") {
    target.approve({ actorId, approvalRef });
    return target.publish({ actorId, approvalRef });
  }
  if (currentStatus === "approved") {
    return target.publish({ actorId, approvalRef });
  }
  if (currentStatus === "published") {
    return readPublishedTargetSnapshot({ target, targetType, targetId });
  }
  throw createError(409, "regulatory_change_publish_target_invalid", `${targetType} target ${targetId} cannot be published from status ${currentStatus}.`);
}

function rollbackTarget({ target, targetType, targetId, actorId, effectiveFrom, reasonCode, replayRequired }) {
  const currentStatus = target.getStatus();
  if (!["published", "retired"].includes(currentStatus)) {
    throw createError(409, "regulatory_change_rollback_target_invalid", `${targetType} target ${targetId} cannot be rolled back from status ${currentStatus}.`);
  }
  return target.rollback({
    actorId,
    effectiveFrom,
    reasonCode,
    replayRequired
  });
}

function readPublishedTargetSnapshot({ target, targetType, targetId }) {
  if (targetType === "provider_baseline") {
    return {
      providerBaselineId: targetId,
      status: target.getStatus()
    };
  }
  return {
    rulePackId: targetId,
    status: target.getStatus()
  };
}

function requireSourceSnapshot(entry) {
  if (!entry.sourceSnapshot) {
    throw createError(409, "regulatory_change_source_snapshot_required", "Official source snapshot must be recorded first.");
  }
}

function requireApprovedDiffReview(entry) {
  requireSourceSnapshot(entry);
  if (!entry.diffReview?.approved) {
    throw createError(409, "regulatory_change_diff_review_required", "Approved diff review must be recorded first.");
  }
}

function requirePassedSandboxVerification(entry) {
  requireApprovedDiffReview(entry);
  if (entry.sandboxVerification?.verificationResult !== "passed") {
    throw createError(409, "regulatory_change_sandbox_verification_required", "Passed sandbox verification must be recorded first.");
  }
}

function requirePublishReady(entry) {
  requirePassedSandboxVerification(entry);
  if (!hasFullApprovalSet(entry)) {
    throw createError(409, "regulatory_change_dual_approval_required", "Domain-owner and compliance-owner approvals are both required.");
  }
  const approvalActors = new Set(entry.approvals.map((approval) => approval.actorId));
  if (approvalActors.size < REGULATORY_CHANGE_APPROVAL_ROLES.length) {
    throw createError(409, "regulatory_change_dual_control_same_actor", "Dual control requires distinct actors.");
  }
}

function hasFullApprovalSet(entry) {
  const approvalRoles = new Set(entry.approvals.map((approval) => approval.approvalRole));
  return REGULATORY_CHANGE_APPROVAL_ROLES.every((role) => approvalRoles.has(role));
}

function normalizeRulePackTargets(resolveRulePackTargets) {
  const targetMap = new Map();
  const rawTargets = typeof resolveRulePackTargets === "function" ? resolveRulePackTargets() : {};
  for (const [targetKey, target] of Object.entries(rawTargets || {})) {
    if (!target || typeof target !== "object") {
      continue;
    }
    const requiredFunctions = ["getRulePack", "validateRulePackVersion", "approveRulePackVersion", "publishRulePackVersion", "rollbackRulePackVersion"];
    for (const functionName of requiredFunctions) {
      if (typeof target[functionName] !== "function") {
        throw createError(500, "regulatory_rule_pack_target_invalid", `Rule-pack target ${targetKey} is missing ${functionName}.`);
      }
    }
    targetMap.set(targetKey, target);
  }
  return targetMap;
}

function defaultTargetKeyForType(targetType) {
  return targetType === "provider_baseline" ? "provider_baseline_registry" : "rule_pack_registry";
}

function maxStatus(currentStatus, candidateStatus) {
  const currentIndex = REGULATORY_CHANGE_STATUSES.indexOf(currentStatus);
  const candidateIndex = REGULATORY_CHANGE_STATUSES.indexOf(candidateStatus);
  return candidateIndex > currentIndex ? candidateStatus : currentStatus;
}

function normalizeStringArray(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => normalizeOptionalText(value)).filter(Boolean))];
}

function normalizeOfficialSourceRefs({
  officialSourceRefs = [],
  officialSourceUrl,
  retrievedAt,
  sourceChecksum,
  sourceSnapshotDate,
  note,
  nowIso,
  nowDate
} = {}) {
  const normalized = (Array.isArray(officialSourceRefs) ? officialSourceRefs : [])
    .map((value, index) => ({
      sourceRefId: normalizeOptionalText(value?.sourceRefId) || `official_source:${index + 1}`,
      sourceType: requireText(value?.sourceType || "official_source", "regulatory_source_ref_type_required"),
      url: requireText(value?.url || value?.officialSourceUrl || value?.sourceUrl, "regulatory_source_url_required"),
      retrievedAt: normalizeOptionalIsoDateTime(value?.retrievedAt, "regulatory_source_ref_retrieved_at_invalid") || nowIso,
      checksum: requireText(value?.checksum || value?.sourceChecksum, "regulatory_source_checksum_required"),
      sourceSnapshotDate: normalizeOptionalIsoDate(value?.sourceSnapshotDate, "regulatory_source_ref_snapshot_date_invalid") || nowDate,
      note: normalizeOptionalText(value?.note)
    }))
    .sort((left, right) => left.url.localeCompare(right.url) || left.checksum.localeCompare(right.checksum));
  if (normalized.length > 0) {
    return normalized;
  }
  return [{
    sourceRefId: "official_source:1",
    sourceType: "official_source",
    url: requireText(officialSourceUrl, "regulatory_source_url_required"),
    retrievedAt: normalizeOptionalIsoDateTime(retrievedAt, "regulatory_source_retrieved_at_invalid") || nowIso,
    checksum: requireText(sourceChecksum, "regulatory_source_checksum_required"),
    sourceSnapshotDate: normalizeOptionalIsoDate(sourceSnapshotDate, "regulatory_source_snapshot_date_invalid") || nowDate,
    note: normalizeOptionalText(note)
  }];
}

function normalizeOptionalIsoDateTime(value, code) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw createError(400, code, `${code} is invalid.`);
  }
  return parsed.toISOString();
}

function normalizeOptionalIsoDate(value, code) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw createError(400, code, `${code} is invalid.`);
  }
  return normalized;
}

function appendToIndex(index, key, value) {
  const items = index.get(key) || [];
  items.push(value);
  index.set(key, items);
}

function setNestedMapValue(nestedMap, key, nestedKey, value) {
  const scoped = nestedMap.get(key) || new Map();
  scoped.set(nestedKey, value);
  nestedMap.set(key, scoped);
}

function requireEnum(allowedValues, value, code) {
  const resolved = requireText(value, code);
  if (!allowedValues.includes(resolved)) {
    throw createError(400, code, `${resolved} is not allowed.`);
  }
  return resolved;
}

function requireText(value, code) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    throw createError(400, code, `${code} is required.`);
  }
  return normalized;
}

function normalizeOptionalText(value) {
  if (value == null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

function nowDate(clock) {
  return nowIso(clock).slice(0, 10);
}

function hashObject(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? {})).digest("hex");
}


function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
