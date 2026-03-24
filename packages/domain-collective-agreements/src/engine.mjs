import crypto from "node:crypto";
import {
  AGREEMENT_ASSIGNMENT_STATUSES,
  AGREEMENT_FAMILY_STATUSES,
  AGREEMENT_OVERRIDE_TYPE_CODES,
  AGREEMENT_RULEPACK_CODE,
  AGREEMENT_VERSION_STATUSES
} from "./constants.mjs";
import {
  appendToIndex,
  compareDateRanges,
  copy,
  createError,
  currentDate,
  getIndexValue,
  normalizeCode,
  normalizeOptionalText,
  normalizeRequiredDate,
  nowIso,
  requireText,
  setIndexValue
} from "./helpers.mjs";

export function createCollectiveAgreementsPlatform(options = {}) {
  return createCollectiveAgreementsEngine(options);
}

export function createCollectiveAgreementsEngine({ clock = () => new Date(), seedDemo = false, hrPlatform = null } = {}) {
  const state = {
    agreementFamilies: new Map(),
    agreementFamilyIdsByCompany: new Map(),
    agreementFamilyIdByCode: new Map(),
    agreementVersions: new Map(),
    agreementVersionIdsByCompany: new Map(),
    agreementVersionIdsByFamily: new Map(),
    agreementAssignments: new Map(),
    agreementAssignmentIdsByCompany: new Map(),
    agreementAssignmentIdsByEmployment: new Map(),
    agreementOverrides: new Map(),
    agreementOverrideIdsByAssignment: new Map(),
    auditEvents: []
  };

  if (seedDemo) {
    seedDemoState(state, clock);
  }

  return {
    agreementFamilyStatuses: AGREEMENT_FAMILY_STATUSES,
    agreementVersionStatuses: AGREEMENT_VERSION_STATUSES,
    agreementAssignmentStatuses: AGREEMENT_ASSIGNMENT_STATUSES,
    agreementOverrideTypeCodes: AGREEMENT_OVERRIDE_TYPE_CODES,
    createAgreementFamily,
    listAgreementFamilies,
    publishAgreementVersion,
    listAgreementVersions,
    getAgreementVersion,
    assignAgreementToEmployment,
    listAgreementAssignments,
    createAgreementOverride,
    listAgreementOverrides,
    getActiveAgreementForEmployment,
    evaluateAgreementOverlay
  };

  function createAgreementFamily({
    companyId,
    code,
    name,
    sectorCode = null,
    status = "active",
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedCode = normalizeCode(code, "agreement_family_code_required");
    if (getIndexValue(state.agreementFamilyIdByCode, resolvedCompanyId, resolvedCode)) {
      throw createError(409, "agreement_family_code_exists", "Agreement family code already exists.");
    }
    const resolvedStatus = resolveFamilyStatus(status);
    const now = nowIso(clock);
    const record = Object.freeze({
      agreementFamilyId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      code: resolvedCode,
      name: requireText(name, "agreement_family_name_required"),
      sectorCode: normalizeOptionalText(sectorCode),
      status: resolvedStatus,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: now,
      updatedAt: now
    });
    state.agreementFamilies.set(record.agreementFamilyId, record);
    appendToIndex(state.agreementFamilyIdsByCompany, resolvedCompanyId, record.agreementFamilyId);
    setIndexValue(state.agreementFamilyIdByCode, resolvedCompanyId, resolvedCode, record.agreementFamilyId);
    return presentAgreementFamily(record);
  }

  function listAgreementFamilies({ companyId, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = status ? resolveFamilyStatus(status) : null;
    return (state.agreementFamilyIdsByCompany.get(resolvedCompanyId) || [])
      .map((agreementFamilyId) => state.agreementFamilies.get(agreementFamilyId))
      .filter(Boolean)
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .sort((left, right) => left.code.localeCompare(right.code))
      .map(presentAgreementFamily);
  }

  function publishAgreementVersion({
    companyId,
    agreementFamilyId = null,
    agreementFamilyCode = null,
    versionCode = null,
    effectiveFrom,
    effectiveTo = null,
    rulepackCode = AGREEMENT_RULEPACK_CODE,
    rulepackVersion,
    ruleSet = {},
    actorId = "system"
  } = {}) {
    const family = requireAgreementFamily(state, companyId, { agreementFamilyId, agreementFamilyCode });
    const resolvedEffectiveFrom = normalizeRequiredDate(effectiveFrom, "agreement_version_effective_from_required");
    const resolvedEffectiveTo = effectiveTo ? normalizeRequiredDate(effectiveTo, "agreement_version_effective_to_invalid") : null;
    if (resolvedEffectiveTo && resolvedEffectiveTo < resolvedEffectiveFrom) {
      throw createError(400, "agreement_version_dates_invalid", "Agreement version end date cannot be earlier than start date.");
    }
    ensureNoOverlappingAgreementVersion(state, family, resolvedEffectiveFrom, resolvedEffectiveTo);

    const now = nowIso(clock);
    const record = Object.freeze({
      agreementVersionId: crypto.randomUUID(),
      agreementFamilyId: family.agreementFamilyId,
      companyId: family.companyId,
      agreementFamilyCode: family.code,
      versionCode: normalizeCode(versionCode || `${family.code}_${resolvedEffectiveFrom}`, "agreement_version_code_required"),
      effectiveFrom: resolvedEffectiveFrom,
      effectiveTo: resolvedEffectiveTo,
      rulepackCode: normalizeCode(rulepackCode, "agreement_rulepack_code_required"),
      rulepackVersion: requireText(rulepackVersion, "agreement_rulepack_version_required"),
      status: "active",
      ruleSetJson: sanitizeJson(ruleSet),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: now,
      updatedAt: now
    });
    state.agreementVersions.set(record.agreementVersionId, record);
    appendToIndex(state.agreementVersionIdsByCompany, family.companyId, record.agreementVersionId);
    appendToIndex(state.agreementVersionIdsByFamily, family.agreementFamilyId, record.agreementVersionId);
    markHistoricalVersions(state, family.agreementFamilyId, record.effectiveFrom);
    return presentAgreementVersion(record);
  }

  function listAgreementVersions({ companyId, agreementFamilyId = null, agreementFamilyCode = null, status = null } = {}) {
    const family = agreementFamilyId || agreementFamilyCode ? requireAgreementFamily(state, companyId, { agreementFamilyId, agreementFamilyCode }) : null;
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = status ? resolveVersionStatus(status) : null;
    const sourceIds = family
      ? (state.agreementVersionIdsByFamily.get(family.agreementFamilyId) || [])
      : (state.agreementVersionIdsByCompany.get(resolvedCompanyId) || []);
    return sourceIds
      .map((agreementVersionId) => state.agreementVersions.get(agreementVersionId))
      .filter(Boolean)
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .sort((left, right) => left.effectiveFrom.localeCompare(right.effectiveFrom) || left.versionCode.localeCompare(right.versionCode))
      .map(presentAgreementVersion);
  }

  function getAgreementVersion({ companyId, agreementVersionId } = {}) {
    return presentAgreementVersion(requireAgreementVersion(state, companyId, agreementVersionId));
  }

  function assignAgreementToEmployment({
    companyId,
    employeeId,
    employmentId,
    agreementVersionId,
    effectiveFrom,
    effectiveTo = null,
    assignmentReasonCode,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedEmployeeId = requireText(employeeId, "employee_id_required");
    const resolvedEmploymentId = requireText(employmentId, "employment_id_required");
    const version = requireAgreementVersion(state, resolvedCompanyId, agreementVersionId);
    if (hrPlatform) {
      hrPlatform.getEmployment({ companyId: resolvedCompanyId, employeeId: resolvedEmployeeId, employmentId: resolvedEmploymentId });
    }
    const resolvedEffectiveFrom = normalizeRequiredDate(effectiveFrom, "agreement_assignment_effective_from_required");
    const resolvedEffectiveTo = effectiveTo ? normalizeRequiredDate(effectiveTo, "agreement_assignment_effective_to_invalid") : null;
    if (resolvedEffectiveTo && resolvedEffectiveTo < resolvedEffectiveFrom) {
      throw createError(400, "agreement_assignment_dates_invalid", "Agreement assignment end date cannot be earlier than start date.");
    }
    if (resolvedEffectiveFrom < version.effectiveFrom || (version.effectiveTo && (!resolvedEffectiveTo || resolvedEffectiveTo > version.effectiveTo))) {
      throw createError(409, "agreement_assignment_outside_version_window", "Agreement assignment must be contained within the selected agreement version.");
    }
    ensureNoOverlappingAssignment(state, resolvedCompanyId, resolvedEmploymentId, resolvedEffectiveFrom, resolvedEffectiveTo);

    const today = currentDate(clock);
    const record = Object.freeze({
      agreementAssignmentId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      employeeId: resolvedEmployeeId,
      employmentId: resolvedEmploymentId,
      agreementFamilyId: version.agreementFamilyId,
      agreementFamilyCode: version.agreementFamilyCode,
      agreementVersionId: version.agreementVersionId,
      effectiveFrom: resolvedEffectiveFrom,
      effectiveTo: resolvedEffectiveTo,
      assignmentReasonCode: normalizeCode(assignmentReasonCode, "agreement_assignment_reason_code_required"),
      status: determineAssignmentStatus({ effectiveFrom: resolvedEffectiveFrom, effectiveTo: resolvedEffectiveTo, today }),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    });
    state.agreementAssignments.set(record.agreementAssignmentId, record);
    appendToIndex(state.agreementAssignmentIdsByCompany, resolvedCompanyId, record.agreementAssignmentId);
    appendToIndex(state.agreementAssignmentIdsByEmployment, resolvedEmploymentId, record.agreementAssignmentId);
    return presentAgreementAssignment(record);
  }

  function listAgreementAssignments({ companyId, employeeId = null, employmentId = null, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedEmployeeId = normalizeOptionalText(employeeId);
    const resolvedEmploymentId = normalizeOptionalText(employmentId);
    const resolvedStatus = status ? resolveAssignmentStatus(status) : null;
    const sourceIds = resolvedEmploymentId
      ? (state.agreementAssignmentIdsByEmployment.get(resolvedEmploymentId) || [])
      : (state.agreementAssignmentIdsByCompany.get(resolvedCompanyId) || []);
    return sourceIds
      .map((agreementAssignmentId) => state.agreementAssignments.get(agreementAssignmentId))
      .filter(Boolean)
      .filter((record) => record.companyId === resolvedCompanyId)
      .filter((record) => (resolvedEmployeeId ? record.employeeId === resolvedEmployeeId : true))
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .sort((left, right) => left.effectiveFrom.localeCompare(right.effectiveFrom) || left.createdAt.localeCompare(right.createdAt))
      .map(presentAgreementAssignment);
  }

  function createAgreementOverride({
    companyId,
    agreementAssignmentId,
    overrideTypeCode,
    overridePayload,
    effectiveFrom = null,
    effectiveTo = null,
    reasonCode,
    approvedByActorId = null,
    actorId = "system"
  } = {}) {
    const assignment = requireAgreementAssignment(state, companyId, agreementAssignmentId);
    const resolvedEffectiveFrom = effectiveFrom ? normalizeRequiredDate(effectiveFrom, "agreement_override_effective_from_invalid") : assignment.effectiveFrom;
    const resolvedEffectiveTo = effectiveTo ? normalizeRequiredDate(effectiveTo, "agreement_override_effective_to_invalid") : assignment.effectiveTo;
    if (resolvedEffectiveTo && resolvedEffectiveTo < resolvedEffectiveFrom) {
      throw createError(400, "agreement_override_dates_invalid", "Agreement override end date cannot be earlier than start date.");
    }
    const resolvedApprovedByActorId = requireText(approvedByActorId || actorId, "agreement_override_approved_by_required");
    const now = nowIso(clock);
    const record = Object.freeze({
      agreementOverrideId: crypto.randomUUID(),
      companyId: assignment.companyId,
      agreementAssignmentId: assignment.agreementAssignmentId,
      agreementVersionId: assignment.agreementVersionId,
      overrideTypeCode: resolveOverrideTypeCode(overrideTypeCode),
      overridePayloadJson: sanitizeJson(overridePayload || {}),
      effectiveFrom: resolvedEffectiveFrom,
      effectiveTo: resolvedEffectiveTo,
      reasonCode: normalizeCode(reasonCode, "agreement_override_reason_code_required"),
      approvedByActorId: resolvedApprovedByActorId,
      approvedAt: now,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: now
    });
    state.agreementOverrides.set(record.agreementOverrideId, record);
    appendToIndex(state.agreementOverrideIdsByAssignment, assignment.agreementAssignmentId, record.agreementOverrideId);
    return presentAgreementOverride(record);
  }

  function listAgreementOverrides({ companyId, agreementAssignmentId } = {}) {
    const assignment = requireAgreementAssignment(state, companyId, agreementAssignmentId);
    return (state.agreementOverrideIdsByAssignment.get(assignment.agreementAssignmentId) || [])
      .map((agreementOverrideId) => state.agreementOverrides.get(agreementOverrideId))
      .filter(Boolean)
      .sort((left, right) => (left.effectiveFrom || "").localeCompare(right.effectiveFrom || "") || left.createdAt.localeCompare(right.createdAt))
      .map(presentAgreementOverride);
  }

  function getActiveAgreementForEmployment({ companyId, employeeId, employmentId, eventDate } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedEmployeeId = requireText(employeeId, "employee_id_required");
    const resolvedEmploymentId = requireText(employmentId, "employment_id_required");
    const resolvedEventDate = normalizeRequiredDate(eventDate, "agreement_event_date_required");
    const matchingAssignments = listAgreementAssignments({
      companyId: resolvedCompanyId,
      employeeId: resolvedEmployeeId,
      employmentId: resolvedEmploymentId
    }).filter((assignment) => compareDateRanges(assignment.effectiveFrom, assignment.effectiveTo, resolvedEventDate, resolvedEventDate));
    if (matchingAssignments.length === 0) {
      return null;
    }
    if (matchingAssignments.length > 1) {
      throw createError(409, "agreement_assignment_conflict", "More than one active agreement assignment matches the requested event date.");
    }
    const assignment = matchingAssignments[0];
    const version = getAgreementVersion({
      companyId: resolvedCompanyId,
      agreementVersionId: assignment.agreementVersionId
    });
    if (!compareDateRanges(version.effectiveFrom, version.effectiveTo, resolvedEventDate, resolvedEventDate)) {
      throw createError(409, "agreement_version_not_effective", "Assigned agreement version is not effective for the requested event date.");
    }
    const overrides = listAgreementOverrides({
      companyId: resolvedCompanyId,
      agreementAssignmentId: assignment.agreementAssignmentId
    }).filter((override) => compareDateRanges(override.effectiveFrom, override.effectiveTo, resolvedEventDate, resolvedEventDate));
    return {
      agreementFamily: requireAgreementFamily(state, resolvedCompanyId, { agreementFamilyId: assignment.agreementFamilyId }),
      agreementVersion: version,
      agreementAssignment: assignment,
      agreementOverrides: overrides
    };
  }

  function evaluateAgreementOverlay({ companyId, employeeId, employmentId, eventDate, baseRuleSet = {} } = {}) {
    const activeAgreement = getActiveAgreementForEmployment({
      companyId,
      employeeId,
      employmentId,
      eventDate
    });
    if (!activeAgreement) {
      return null;
    }
    const mergedRuleSet = {
      ...sanitizeJson(baseRuleSet),
      ...sanitizeJson(activeAgreement.agreementVersion.ruleSetJson)
    };
    for (const override of activeAgreement.agreementOverrides) {
      Object.assign(mergedRuleSet, sanitizeJson(override.overridePayloadJson));
    }
    return {
      agreementFamilyCode: activeAgreement.agreementFamily.code,
      agreementVersionId: activeAgreement.agreementVersion.agreementVersionId,
      agreementVersionCode: activeAgreement.agreementVersion.versionCode,
      assignmentId: activeAgreement.agreementAssignment.agreementAssignmentId,
      overrides: activeAgreement.agreementOverrides.map((override) => override.agreementOverrideId),
      ruleSet: mergedRuleSet
    };
  }
}

function presentAgreementFamily(record) {
  return copy(record);
}

function presentAgreementVersion(record) {
  return copy(record);
}

function presentAgreementAssignment(record) {
  return copy(record);
}

function presentAgreementOverride(record) {
  return copy(record);
}

function requireAgreementFamily(state, companyId, { agreementFamilyId = null, agreementFamilyCode = null } = {}) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  let record = null;
  if (agreementFamilyId) {
    record = state.agreementFamilies.get(requireText(agreementFamilyId, "agreement_family_id_required")) || null;
  } else if (agreementFamilyCode) {
    const familyId = getIndexValue(state.agreementFamilyIdByCode, resolvedCompanyId, normalizeCode(agreementFamilyCode, "agreement_family_code_required"));
    record = familyId ? state.agreementFamilies.get(familyId) : null;
  }
  if (!record || record.companyId !== resolvedCompanyId) {
    throw createError(404, "agreement_family_not_found", "Agreement family was not found.");
  }
  return record;
}

function requireAgreementVersion(state, companyId, agreementVersionId) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const record = state.agreementVersions.get(requireText(agreementVersionId, "agreement_version_id_required")) || null;
  if (!record || record.companyId !== resolvedCompanyId) {
    throw createError(404, "agreement_version_not_found", "Agreement version was not found.");
  }
  return record;
}

function requireAgreementAssignment(state, companyId, agreementAssignmentId) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const record = state.agreementAssignments.get(requireText(agreementAssignmentId, "agreement_assignment_id_required")) || null;
  if (!record || record.companyId !== resolvedCompanyId) {
    throw createError(404, "agreement_assignment_not_found", "Agreement assignment was not found.");
  }
  return record;
}

function ensureNoOverlappingAgreementVersion(state, family, effectiveFrom, effectiveTo) {
  for (const versionId of state.agreementVersionIdsByFamily.get(family.agreementFamilyId) || []) {
    const version = state.agreementVersions.get(versionId);
    if (!version || version.status === "retired" || version.status === "historical") {
      continue;
    }
    if (compareDateRanges(version.effectiveFrom, version.effectiveTo, effectiveFrom, effectiveTo)) {
      throw createError(409, "agreement_version_overlap", "Agreement versions for the same family cannot overlap.");
    }
  }
}

function markHistoricalVersions(state, agreementFamilyId, effectiveFrom) {
  for (const versionId of state.agreementVersionIdsByFamily.get(agreementFamilyId) || []) {
    const version = state.agreementVersions.get(versionId);
    if (!version || version.status !== "active" || version.effectiveFrom >= effectiveFrom) {
      continue;
    }
    const nextStatus = version.effectiveTo && version.effectiveTo >= effectiveFrom ? version.status : "historical";
    if (nextStatus !== version.status) {
      state.agreementVersions.set(
        version.agreementVersionId,
        Object.freeze({
          ...version,
          status: nextStatus,
          updatedAt: version.updatedAt
        })
      );
    }
  }
}

function ensureNoOverlappingAssignment(state, companyId, employmentId, effectiveFrom, effectiveTo) {
  for (const assignmentId of state.agreementAssignmentIdsByEmployment.get(employmentId) || []) {
    const assignment = state.agreementAssignments.get(assignmentId);
    if (!assignment || assignment.companyId !== companyId) {
      continue;
    }
    if (compareDateRanges(assignment.effectiveFrom, assignment.effectiveTo, effectiveFrom, effectiveTo)) {
      throw createError(409, "agreement_assignment_overlap", "Agreement assignments for the same employment cannot overlap.");
    }
  }
}

function determineAssignmentStatus({ effectiveFrom, effectiveTo, today }) {
  if (effectiveFrom > today) {
    return "planned";
  }
  if (effectiveTo && effectiveTo < today) {
    return "historical";
  }
  return "active";
}

function resolveFamilyStatus(status) {
  return assertStatus(normalizeCode(status || "active", "agreement_family_status_required").toLowerCase(), AGREEMENT_FAMILY_STATUSES, "agreement_family_status_invalid");
}

function resolveVersionStatus(status) {
  return assertStatus(normalizeCode(status, "agreement_version_status_required").toLowerCase(), AGREEMENT_VERSION_STATUSES, "agreement_version_status_invalid");
}

function resolveAssignmentStatus(status) {
  return assertStatus(normalizeCode(status, "agreement_assignment_status_required").toLowerCase(), AGREEMENT_ASSIGNMENT_STATUSES, "agreement_assignment_status_invalid");
}

function resolveOverrideTypeCode(overrideTypeCode) {
  return assertStatus(normalizeCode(overrideTypeCode, "agreement_override_type_code_required").toLowerCase(), AGREEMENT_OVERRIDE_TYPE_CODES, "agreement_override_type_code_invalid");
}

function assertStatus(value, allowedValues, code) {
  if (!allowedValues.includes(value)) {
    throw createError(400, code, `${code} must be one of ${allowedValues.join(", ")}.`);
  }
  return value;
}

function sanitizeJson(value) {
  return copy(value || {});
}

function seedDemoState(state, clock) {
  const companyId = "00000000-0000-4000-8000-000000000001";
  const now = nowIso(clock);
  const family = Object.freeze({
    agreementFamilyId: "agreement-family-demo-1",
    companyId,
    code: "TEKNIKAVTALET",
    name: "Teknikavtalet",
    sectorCode: "PRIVATE",
    status: "active",
    createdByActorId: "seed",
    createdAt: now,
    updatedAt: now
  });
  const version = Object.freeze({
    agreementVersionId: "agreement-version-demo-1",
    agreementFamilyId: family.agreementFamilyId,
    companyId,
    agreementFamilyCode: family.code,
    versionCode: "TEKNIKAVTALET_2026_01",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    rulepackCode: AGREEMENT_RULEPACK_CODE,
    rulepackVersion: "2026.1",
    status: "active",
    ruleSetJson: { overtimeMultiplier: 1.5, obCategoryA: 32.5 },
    createdByActorId: "seed",
    createdAt: now,
    updatedAt: now
  });
  state.agreementFamilies.set(family.agreementFamilyId, family);
  appendToIndex(state.agreementFamilyIdsByCompany, companyId, family.agreementFamilyId);
  setIndexValue(state.agreementFamilyIdByCode, companyId, family.code, family.agreementFamilyId);
  state.agreementVersions.set(version.agreementVersionId, version);
  appendToIndex(state.agreementVersionIdsByCompany, companyId, version.agreementVersionId);
  appendToIndex(state.agreementVersionIdsByFamily, family.agreementFamilyId, version.agreementVersionId);
}
