import crypto from "node:crypto";
import {
  AGREEMENT_ASSIGNMENT_STATUSES,
  AGREEMENT_CATALOG_ENTRY_STATUSES,
  AGREEMENT_FAMILY_STATUSES,
  AGREEMENT_INTAKE_CASE_STATUSES,
  AGREEMENT_OVERRIDE_TYPE_CODES,
  AGREEMENT_RULEPACK_CODE,
  AGREEMENT_VERSION_STATUSES,
  LOCAL_AGREEMENT_SUPPLEMENT_STATUSES
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

export function createCollectiveAgreementsEngine({
  clock = () => new Date(),
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null,
  hrPlatform = null
} = {}) {
  const state = {
    agreementFamilies: new Map(),
    agreementFamilyIdsByCompany: new Map(),
    agreementFamilyIdByCode: new Map(),
    agreementFamilyIdByIdempotencyKey: new Map(),
    agreementVersions: new Map(),
    agreementVersionIdsByCompany: new Map(),
    agreementVersionIdsByFamily: new Map(),
    agreementVersionIdByIdempotencyKey: new Map(),
    agreementAssignments: new Map(),
    agreementAssignmentIdsByCompany: new Map(),
    agreementAssignmentIdsByEmployment: new Map(),
    agreementAssignmentIdByIdempotencyKey: new Map(),
    agreementOverrides: new Map(),
    agreementOverrideIdsByAssignment: new Map(),
    agreementOverrideIdByIdempotencyKey: new Map(),
    agreementCatalogEntries: new Map(),
    agreementCatalogEntryIdsByCompany: new Map(),
    agreementCatalogEntryIdsByFamily: new Map(),
    agreementCatalogEntryIdByVersion: new Map(),
    agreementCatalogEntryIdByIdempotencyKey: new Map(),
    agreementIntakeCases: new Map(),
    agreementIntakeCaseIdsByCompany: new Map(),
    agreementIntakeCaseIdByIdempotencyKey: new Map(),
    localAgreementSupplements: new Map(),
    localAgreementSupplementIdsByCompany: new Map(),
    localAgreementSupplementIdsByEmployment: new Map(),
    localAgreementSupplementIdByVersion: new Map(),
    localAgreementSupplementIdByIdempotencyKey: new Map(),
    auditEvents: []
  };

  if (seedDemo) {
    seedDemoState(state, clock);
  }

  const engine = {
    agreementFamilyStatuses: AGREEMENT_FAMILY_STATUSES,
    agreementVersionStatuses: AGREEMENT_VERSION_STATUSES,
    agreementAssignmentStatuses: AGREEMENT_ASSIGNMENT_STATUSES,
    agreementOverrideTypeCodes: AGREEMENT_OVERRIDE_TYPE_CODES,
    createAgreementFamily,
    listAgreementFamilies,
    publishAgreementVersion,
    listAgreementVersions,
    getAgreementVersion,
    publishAgreementCatalogEntry,
    listAgreementCatalogEntries,
    submitAgreementIntakeCase,
    listAgreementIntakeCases,
    startAgreementIntakeExtraction,
    reviewAgreementIntakeCase,
    approveLocalAgreementSupplement,
    listLocalAgreementSupplements,
    assignAgreementToEmployment,
    listAgreementAssignments,
    createAgreementOverride,
    listAgreementOverrides,
    getActiveAgreementForEmployment,
    evaluateAgreementOverlay
  };

  Object.defineProperty(engine, "__durableState", {
    value: state,
    enumerable: false
  });

  return engine;

  function createAgreementFamily({
    companyId,
    code,
    name,
    sectorCode = null,
    status = "active",
    idempotencyKey = null,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedIdempotencyKey = normalizeOptionalText(idempotencyKey);
    if (resolvedIdempotencyKey) {
      const existingFamilyId = state.agreementFamilyIdByIdempotencyKey.get(
        createIdempotencyLookupKey(resolvedCompanyId, "agreement_family_create", resolvedIdempotencyKey)
      );
      if (existingFamilyId) {
        return presentAgreementFamily(state.agreementFamilies.get(existingFamilyId));
      }
    }
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
    if (resolvedIdempotencyKey) {
      state.agreementFamilyIdByIdempotencyKey.set(
        createIdempotencyLookupKey(resolvedCompanyId, "agreement_family_create", resolvedIdempotencyKey),
        record.agreementFamilyId
      );
    }
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
    idempotencyKey = null,
    actorId = "system"
  } = {}) {
    const family = requireAgreementFamily(state, companyId, { agreementFamilyId, agreementFamilyCode });
    const resolvedIdempotencyKey = normalizeOptionalText(idempotencyKey);
    if (resolvedIdempotencyKey) {
      const existingVersionId = state.agreementVersionIdByIdempotencyKey.get(
        createIdempotencyLookupKey(family.companyId, "agreement_version_publish", resolvedIdempotencyKey)
      );
      if (existingVersionId) {
        return presentAgreementVersion(state.agreementVersions.get(existingVersionId));
      }
    }
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
    if (resolvedIdempotencyKey) {
      state.agreementVersionIdByIdempotencyKey.set(
        createIdempotencyLookupKey(family.companyId, "agreement_version_publish", resolvedIdempotencyKey),
        record.agreementVersionId
      );
    }
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

  function publishAgreementCatalogEntry({
    companyId,
    agreementVersionId,
    catalogCode = null,
    dropdownLabel,
    publicationScopeCode = "platform_published",
    sourceIntakeCaseId = null,
    idempotencyKey = null,
    actorId = "system"
  } = {}) {
    const version = requireAgreementVersion(state, companyId, agreementVersionId);
    const resolvedIdempotencyKey = normalizeOptionalText(idempotencyKey);
    if (resolvedIdempotencyKey) {
      const existingCatalogEntryId = state.agreementCatalogEntryIdByIdempotencyKey.get(
        createIdempotencyLookupKey(version.companyId, "agreement_catalog_publish", resolvedIdempotencyKey)
      );
      if (existingCatalogEntryId) {
        return presentAgreementCatalogEntry(state.agreementCatalogEntries.get(existingCatalogEntryId));
      }
    }
    const existingByVersionId = state.agreementCatalogEntryIdByVersion.get(version.agreementVersionId) || null;
    if (existingByVersionId) {
      const existing = state.agreementCatalogEntries.get(existingByVersionId);
      if (existing && existing.status === "published") {
        return presentAgreementCatalogEntry(existing);
      }
    }
    if (sourceIntakeCaseId) {
      const intakeCase = requireAgreementIntakeCase(state, version.companyId, sourceIntakeCaseId);
      if (intakeCase.status !== "approved_for_publication") {
        throw createError(409, "agreement_intake_not_ready_for_catalog_publication", "Agreement intake case is not approved for catalog publication.");
      }
    }
    markSupersededCatalogEntries(state, version.companyId, version.agreementFamilyId, version.effectiveFrom, clock);
    const now = nowIso(clock);
    const record = Object.freeze({
      agreementCatalogEntryId: existingByVersionId || crypto.randomUUID(),
      companyId: version.companyId,
      agreementFamilyId: version.agreementFamilyId,
      agreementFamilyCode: version.agreementFamilyCode,
      agreementVersionId: version.agreementVersionId,
      catalogCode: normalizeCode(catalogCode || version.versionCode, "agreement_catalog_code_required"),
      dropdownLabel: requireText(dropdownLabel, "agreement_catalog_dropdown_label_required"),
      publicationScopeCode: normalizeCode(publicationScopeCode, "agreement_catalog_publication_scope_required"),
      sourceIntakeCaseId: normalizeOptionalText(sourceIntakeCaseId),
      effectiveFrom: version.effectiveFrom,
      effectiveTo: version.effectiveTo,
      status: "published",
      publishedByActorId: requireText(actorId, "actor_id_required"),
      publishedAt: now,
      createdAt: existingByVersionId ? state.agreementCatalogEntries.get(existingByVersionId)?.createdAt || now : now,
      updatedAt: now
    });
    state.agreementCatalogEntries.set(record.agreementCatalogEntryId, record);
    if (!existingByVersionId) {
      appendToIndex(state.agreementCatalogEntryIdsByCompany, version.companyId, record.agreementCatalogEntryId);
      appendToIndex(state.agreementCatalogEntryIdsByFamily, version.agreementFamilyId, record.agreementCatalogEntryId);
    }
    state.agreementCatalogEntryIdByVersion.set(version.agreementVersionId, record.agreementCatalogEntryId);
    if (resolvedIdempotencyKey) {
      state.agreementCatalogEntryIdByIdempotencyKey.set(
        createIdempotencyLookupKey(version.companyId, "agreement_catalog_publish", resolvedIdempotencyKey),
        record.agreementCatalogEntryId
      );
    }
    return presentAgreementCatalogEntry(record);
  }

  function listAgreementCatalogEntries({ companyId, status = "published", agreementFamilyId = null, agreementFamilyCode = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const family = agreementFamilyId || agreementFamilyCode ? requireAgreementFamily(state, resolvedCompanyId, { agreementFamilyId, agreementFamilyCode }) : null;
    const resolvedStatus = status ? resolveCatalogEntryStatus(status) : null;
    const sourceIds = family
      ? (state.agreementCatalogEntryIdsByFamily.get(family.agreementFamilyId) || [])
      : (state.agreementCatalogEntryIdsByCompany.get(resolvedCompanyId) || []);
    return sourceIds
      .map((agreementCatalogEntryId) => state.agreementCatalogEntries.get(agreementCatalogEntryId))
      .filter(Boolean)
      .filter((record) => record.companyId === resolvedCompanyId)
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .sort((left, right) => left.dropdownLabel.localeCompare(right.dropdownLabel) || left.effectiveFrom.localeCompare(right.effectiveFrom))
      .map(presentAgreementCatalogEntry);
  }

  function submitAgreementIntakeCase({
    companyId,
    proposedFamilyCode,
    proposedFamilyName,
    requestedPublicationTarget = "catalog",
    sourceDocumentRef = null,
    intakeChannelCode = "support_backoffice",
    requestedEmploymentId = null,
    note = null,
    idempotencyKey = null,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedIdempotencyKey = normalizeOptionalText(idempotencyKey);
    if (resolvedIdempotencyKey) {
      const existingIntakeCaseId = state.agreementIntakeCaseIdByIdempotencyKey.get(
        createIdempotencyLookupKey(resolvedCompanyId, "agreement_intake_submit", resolvedIdempotencyKey)
      );
      if (existingIntakeCaseId) {
        return presentAgreementIntakeCase(state.agreementIntakeCases.get(existingIntakeCaseId));
      }
    }
    const resolvedPublicationTarget = resolveAgreementIntakePublicationTarget(requestedPublicationTarget);
    const now = nowIso(clock);
    const record = Object.freeze({
      agreementIntakeCaseId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      proposedFamilyCode: normalizeCode(proposedFamilyCode, "agreement_intake_family_code_required"),
      proposedFamilyName: requireText(proposedFamilyName, "agreement_intake_family_name_required"),
      requestedPublicationTarget: resolvedPublicationTarget,
      sourceDocumentRef: normalizeOptionalText(sourceDocumentRef),
      intakeChannelCode: normalizeCode(intakeChannelCode, "agreement_intake_channel_code_required"),
      requestedEmploymentId: normalizeOptionalText(requestedEmploymentId),
      note: normalizeOptionalText(note),
      status: "received",
      submittedByActorId: requireText(actorId, "actor_id_required"),
      submittedAt: now,
      extractionStartedAt: null,
      reviewQueuedAt: null,
      reviewedByActorId: null,
      reviewedAt: null,
      linkedAgreementVersionId: null,
      linkedCatalogEntryId: null,
      linkedLocalAgreementSupplementId: null,
      createdAt: now,
      updatedAt: now
    });
    state.agreementIntakeCases.set(record.agreementIntakeCaseId, record);
    appendToIndex(state.agreementIntakeCaseIdsByCompany, resolvedCompanyId, record.agreementIntakeCaseId);
    if (resolvedIdempotencyKey) {
      state.agreementIntakeCaseIdByIdempotencyKey.set(
        createIdempotencyLookupKey(resolvedCompanyId, "agreement_intake_submit", resolvedIdempotencyKey),
        record.agreementIntakeCaseId
      );
    }
    return presentAgreementIntakeCase(record);
  }

  function listAgreementIntakeCases({ companyId, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = status ? resolveAgreementIntakeCaseStatus(status) : null;
    return (state.agreementIntakeCaseIdsByCompany.get(resolvedCompanyId) || [])
      .map((agreementIntakeCaseId) => state.agreementIntakeCases.get(agreementIntakeCaseId))
      .filter(Boolean)
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(presentAgreementIntakeCase);
  }

  function startAgreementIntakeExtraction({ companyId, agreementIntakeCaseId, actorId = "system" } = {}) {
    const intakeCase = requireAgreementIntakeCase(state, companyId, agreementIntakeCaseId);
    if (!["received", "extraction_in_progress", "review_pending"].includes(intakeCase.status)) {
      throw createError(409, "agreement_intake_extraction_invalid", "Agreement intake extraction can only start from received or pending states.");
    }
    const now = nowIso(clock);
    const nextRecord = Object.freeze({
      ...intakeCase,
      status: "extraction_in_progress",
      extractionStartedAt: intakeCase.extractionStartedAt || now,
      reviewQueuedAt: now,
      updatedAt: now,
      extractionStartedByActorId: requireText(actorId, "actor_id_required")
    });
    state.agreementIntakeCases.set(nextRecord.agreementIntakeCaseId, nextRecord);
    return presentAgreementIntakeCase(nextRecord);
  }

  function reviewAgreementIntakeCase({
    companyId,
    agreementIntakeCaseId,
    decisionStatus,
    agreementFamilyId = null,
    agreementFamilyCode = null,
    agreementFamilyName = null,
    versionCode = null,
    effectiveFrom,
    effectiveTo = null,
    rulepackVersion = null,
    ruleSet = {},
    catalogCode = null,
    dropdownLabel = null,
    baseAgreementVersionId = null,
    supplementCode = null,
    supplementLabel = null,
    targetEmploymentId = null,
    overlayRuleSet = {},
    actorId = "system"
  } = {}) {
    const intakeCase = requireAgreementIntakeCase(state, companyId, agreementIntakeCaseId);
    if (!["received", "extraction_in_progress", "review_pending"].includes(intakeCase.status)) {
      throw createError(409, "agreement_intake_review_invalid", "Agreement intake case cannot be reviewed from its current state.");
    }
    const resolvedDecisionStatus = resolveAgreementIntakeCaseStatus(decisionStatus);
    if (!["approved_for_publication", "approved_for_local_supplement", "rejected"].includes(resolvedDecisionStatus)) {
      throw createError(400, "agreement_intake_review_status_invalid", "Agreement intake review must end in publication, local supplement or rejection.");
    }
    const now = nowIso(clock);
    const reviewedCase = Object.freeze({
      ...intakeCase,
      status: resolvedDecisionStatus,
      reviewQueuedAt: intakeCase.reviewQueuedAt || now,
      reviewedByActorId: requireText(actorId, "actor_id_required"),
      reviewedAt: now,
      updatedAt: now
    });
    state.agreementIntakeCases.set(reviewedCase.agreementIntakeCaseId, reviewedCase);
    let linkedAgreementVersionId = null;
    let linkedCatalogEntryId = null;
    let linkedLocalAgreementSupplementId = null;

    if (resolvedDecisionStatus === "approved_for_publication") {
      const family = resolveAgreementFamilyForIntake({
        state,
        companyId: reviewedCase.companyId,
        agreementFamilyId,
        agreementFamilyCode,
        agreementFamilyName,
        intakeCase: reviewedCase,
        actorId,
        createAgreementFamily
      });
      const version = publishAgreementVersion({
        companyId: reviewedCase.companyId,
        agreementFamilyId: family.agreementFamilyId,
        versionCode,
        effectiveFrom,
        effectiveTo,
        rulepackVersion: requireText(rulepackVersion, "agreement_intake_rulepack_version_required"),
        ruleSet,
        actorId
      });
      const catalogEntry = publishAgreementCatalogEntry({
        companyId: reviewedCase.companyId,
        agreementVersionId: version.agreementVersionId,
        catalogCode,
        dropdownLabel: dropdownLabel || family.name,
        sourceIntakeCaseId: reviewedCase.agreementIntakeCaseId,
        actorId
      });
      linkedAgreementVersionId = version.agreementVersionId;
      linkedCatalogEntryId = catalogEntry.agreementCatalogEntryId;
    }

    if (resolvedDecisionStatus === "approved_for_local_supplement") {
      const supplement = approveLocalAgreementSupplement({
        companyId: reviewedCase.companyId,
        agreementVersionId: requireText(baseAgreementVersionId, "agreement_local_supplement_base_version_required"),
        supplementCode: supplementCode || intakeCase.proposedFamilyCode,
        displayName: supplementLabel || intakeCase.proposedFamilyName,
        targetEmploymentId: targetEmploymentId || intakeCase.requestedEmploymentId || null,
        effectiveFrom,
        effectiveTo,
        overlayRuleSet,
        sourceIntakeCaseId: reviewedCase.agreementIntakeCaseId,
        actorId
      });
      linkedAgreementVersionId = supplement.agreementVersionId;
      linkedLocalAgreementSupplementId = supplement.localAgreementSupplementId;
    }

    const nextRecord = Object.freeze({
      ...reviewedCase,
      linkedAgreementVersionId,
      linkedCatalogEntryId,
      linkedLocalAgreementSupplementId,
      updatedAt: now
    });
    state.agreementIntakeCases.set(nextRecord.agreementIntakeCaseId, nextRecord);
    return presentAgreementIntakeCase(nextRecord);
  }

  function approveLocalAgreementSupplement({
    companyId,
    agreementVersionId,
    supplementCode,
    displayName,
    targetEmploymentId = null,
    effectiveFrom = null,
    effectiveTo = null,
    overlayRuleSet = {},
    sourceIntakeCaseId = null,
    idempotencyKey = null,
    actorId = "system"
  } = {}) {
    const version = requireAgreementVersion(state, companyId, agreementVersionId);
    const resolvedIdempotencyKey = normalizeOptionalText(idempotencyKey);
    if (resolvedIdempotencyKey) {
      const existingSupplementId = state.localAgreementSupplementIdByIdempotencyKey.get(
        createIdempotencyLookupKey(version.companyId, "agreement_local_supplement_approve", resolvedIdempotencyKey)
      );
      if (existingSupplementId) {
        return presentLocalAgreementSupplement(state.localAgreementSupplements.get(existingSupplementId));
      }
    }
    if (sourceIntakeCaseId) {
      const intakeCase = requireAgreementIntakeCase(state, version.companyId, sourceIntakeCaseId);
      if (intakeCase.status !== "approved_for_local_supplement") {
        throw createError(409, "agreement_intake_not_ready_for_local_supplement", "Agreement intake case is not approved for local supplement creation.");
      }
    }
    const resolvedTargetEmploymentId = normalizeOptionalText(targetEmploymentId);
    const resolvedEffectiveFrom = effectiveFrom ? normalizeRequiredDate(effectiveFrom, "agreement_local_supplement_effective_from_invalid") : version.effectiveFrom;
    const resolvedEffectiveTo = effectiveTo ? normalizeRequiredDate(effectiveTo, "agreement_local_supplement_effective_to_invalid") : version.effectiveTo;
    if (resolvedEffectiveTo && resolvedEffectiveTo < resolvedEffectiveFrom) {
      throw createError(400, "agreement_local_supplement_dates_invalid", "Local supplement end date cannot be earlier than start date.");
    }
    const existingByVersionId = state.localAgreementSupplementIdByVersion.get(version.agreementVersionId) || null;
    if (existingByVersionId) {
      const existing = state.localAgreementSupplements.get(existingByVersionId);
      if (existing && existing.status === "approved" && existing.targetEmploymentId === resolvedTargetEmploymentId) {
        return presentLocalAgreementSupplement(existing);
      }
    }
    const now = nowIso(clock);
    const record = Object.freeze({
      localAgreementSupplementId: existingByVersionId || crypto.randomUUID(),
      companyId: version.companyId,
      agreementFamilyId: version.agreementFamilyId,
      agreementFamilyCode: version.agreementFamilyCode,
      agreementVersionId: version.agreementVersionId,
      supplementCode: normalizeCode(supplementCode, "agreement_local_supplement_code_required"),
      displayName: requireText(displayName, "agreement_local_supplement_display_name_required"),
      targetEmploymentId: resolvedTargetEmploymentId,
      effectiveFrom: resolvedEffectiveFrom,
      effectiveTo: resolvedEffectiveTo,
      overlayRuleSetJson: sanitizeJson(overlayRuleSet),
      sourceIntakeCaseId: normalizeOptionalText(sourceIntakeCaseId),
      status: "approved",
      approvedByActorId: requireText(actorId, "actor_id_required"),
      approvedAt: now,
      createdAt: existingByVersionId ? state.localAgreementSupplements.get(existingByVersionId)?.createdAt || now : now,
      updatedAt: now
    });
    state.localAgreementSupplements.set(record.localAgreementSupplementId, record);
    if (!existingByVersionId) {
      appendToIndex(state.localAgreementSupplementIdsByCompany, version.companyId, record.localAgreementSupplementId);
      if (resolvedTargetEmploymentId) {
        appendToIndex(state.localAgreementSupplementIdsByEmployment, resolvedTargetEmploymentId, record.localAgreementSupplementId);
      }
    }
    state.localAgreementSupplementIdByVersion.set(version.agreementVersionId, record.localAgreementSupplementId);
    if (resolvedIdempotencyKey) {
      state.localAgreementSupplementIdByIdempotencyKey.set(
        createIdempotencyLookupKey(version.companyId, "agreement_local_supplement_approve", resolvedIdempotencyKey),
        record.localAgreementSupplementId
      );
    }
    return presentLocalAgreementSupplement(record);
  }

  function listLocalAgreementSupplements({ companyId, targetEmploymentId = null, status = "approved" } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedTargetEmploymentId = normalizeOptionalText(targetEmploymentId);
    const resolvedStatus = status ? resolveLocalAgreementSupplementStatus(status) : null;
    const sourceIds = resolvedTargetEmploymentId
      ? (state.localAgreementSupplementIdsByEmployment.get(resolvedTargetEmploymentId) || [])
      : (state.localAgreementSupplementIdsByCompany.get(resolvedCompanyId) || []);
    return sourceIds
      .map((localAgreementSupplementId) => state.localAgreementSupplements.get(localAgreementSupplementId))
      .filter(Boolean)
      .filter((record) => record.companyId === resolvedCompanyId)
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .sort((left, right) => left.displayName.localeCompare(right.displayName) || left.effectiveFrom.localeCompare(right.effectiveFrom))
      .map(presentLocalAgreementSupplement);
  }

  function assignAgreementToEmployment({
    companyId,
    employeeId,
    employmentId,
    agreementVersionId = null,
    agreementCatalogEntryId = null,
    localAgreementSupplementId = null,
    effectiveFrom,
    effectiveTo = null,
    assignmentReasonCode,
    idempotencyKey = null,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedIdempotencyKey = normalizeOptionalText(idempotencyKey);
    if (resolvedIdempotencyKey) {
      const existingAssignmentId = state.agreementAssignmentIdByIdempotencyKey.get(
        createIdempotencyLookupKey(resolvedCompanyId, "agreement_assignment_create", resolvedIdempotencyKey)
      );
      if (existingAssignmentId) {
        return presentAgreementAssignment(state.agreementAssignments.get(existingAssignmentId));
      }
    }
    const resolvedEmployeeId = requireText(employeeId, "employee_id_required");
    const resolvedEmploymentId = requireText(employmentId, "employment_id_required");
    let version = null;
    let catalogEntry = null;
    let localSupplement = null;
    if (agreementCatalogEntryId) {
      catalogEntry = requireAgreementCatalogEntry(state, resolvedCompanyId, agreementCatalogEntryId);
      if (catalogEntry.status !== "published") {
        throw createError(409, "agreement_catalog_entry_not_published", "Agreement assignment requires a published catalog entry.");
      }
      version = requireAgreementVersion(state, resolvedCompanyId, catalogEntry.agreementVersionId);
    } else if (localAgreementSupplementId) {
      localSupplement = requireLocalAgreementSupplement(state, resolvedCompanyId, localAgreementSupplementId);
      if (localSupplement.status !== "approved") {
        throw createError(409, "agreement_local_supplement_not_approved", "Agreement assignment requires an approved local supplement.");
      }
      if (localSupplement.targetEmploymentId && localSupplement.targetEmploymentId !== resolvedEmploymentId) {
        throw createError(409, "agreement_local_supplement_scope_invalid", "Local supplement is not approved for this employment.");
      }
      version = requireAgreementVersion(state, resolvedCompanyId, localSupplement.agreementVersionId);
    } else {
      version = requireAgreementVersion(state, resolvedCompanyId, agreementVersionId);
      const publishedCatalogEntryId = state.agreementCatalogEntryIdByVersion.get(version.agreementVersionId) || null;
      if (!publishedCatalogEntryId) {
        throw createError(409, "agreement_assignment_requires_published_catalog", "Agreement assignment must reference a published catalog entry or an approved local supplement.");
      }
      catalogEntry = requireAgreementCatalogEntry(state, resolvedCompanyId, publishedCatalogEntryId);
      if (catalogEntry.status !== "published") {
        throw createError(409, "agreement_catalog_entry_not_published", "Agreement assignment requires a published catalog entry.");
      }
    }
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
      agreementCatalogEntryId: catalogEntry?.agreementCatalogEntryId || null,
      localAgreementSupplementId: localSupplement?.localAgreementSupplementId || null,
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
    if (resolvedIdempotencyKey) {
      state.agreementAssignmentIdByIdempotencyKey.set(
        createIdempotencyLookupKey(resolvedCompanyId, "agreement_assignment_create", resolvedIdempotencyKey),
        record.agreementAssignmentId
      );
    }
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
    idempotencyKey = null,
    actorId = "system"
  } = {}) {
    const assignment = requireAgreementAssignment(state, companyId, agreementAssignmentId);
    const resolvedIdempotencyKey = normalizeOptionalText(idempotencyKey);
    if (resolvedIdempotencyKey) {
      const existingOverrideId = state.agreementOverrideIdByIdempotencyKey.get(
        createIdempotencyLookupKey(assignment.companyId, "agreement_override_create", resolvedIdempotencyKey)
      );
      if (existingOverrideId) {
        return presentAgreementOverride(state.agreementOverrides.get(existingOverrideId));
      }
    }
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
    if (resolvedIdempotencyKey) {
      state.agreementOverrideIdByIdempotencyKey.set(
        createIdempotencyLookupKey(assignment.companyId, "agreement_override_create", resolvedIdempotencyKey),
        record.agreementOverrideId
      );
    }
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
    const catalogEntry = assignment.agreementCatalogEntryId
      ? requireAgreementCatalogEntry(state, resolvedCompanyId, assignment.agreementCatalogEntryId)
      : null;
    const localSupplement = assignment.localAgreementSupplementId
      ? requireLocalAgreementSupplement(state, resolvedCompanyId, assignment.localAgreementSupplementId)
      : null;
    return {
      agreementFamily: requireAgreementFamily(state, resolvedCompanyId, { agreementFamilyId: assignment.agreementFamilyId }),
      agreementVersion: version,
      agreementCatalogEntry: catalogEntry,
      agreementAssignment: assignment,
      localAgreementSupplement: localSupplement,
      agreementOverrides: overrides
    };
  }

  function evaluateAgreementOverlay({ companyId, employeeId, employmentId, eventDate, baseRuleSet = {} } = {}) {
    const resolvedEventDate = normalizeRequiredDate(eventDate, "agreement_event_date_required");
    const activeAgreement = getActiveAgreementForEmployment({
      companyId,
      employeeId,
      employmentId,
      eventDate: resolvedEventDate
    });
    if (!activeAgreement) {
      return null;
    }
    const mergedRuleSet = {
      ...sanitizeJson(baseRuleSet),
      ...sanitizeJson(activeAgreement.agreementVersion.ruleSetJson)
    };
    if (activeAgreement.localAgreementSupplement) {
      Object.assign(mergedRuleSet, sanitizeJson(activeAgreement.localAgreementSupplement.overlayRuleSetJson));
    }
    for (const override of activeAgreement.agreementOverrides) {
      Object.assign(mergedRuleSet, sanitizeJson(override.overridePayloadJson));
    }
    const rateComponents = buildAgreementRateComponents(mergedRuleSet);
    const validityWindow = resolveAgreementOverlayValidityWindow(activeAgreement);
    return {
      agreementOverlayId: buildAgreementOverlayId(activeAgreement, resolvedEventDate),
      agreementCode: activeAgreement.agreementFamily.code,
      agreementFamilyCode: activeAgreement.agreementFamily.code,
      agreementCatalogEntryId: activeAgreement.agreementCatalogEntry?.agreementCatalogEntryId || null,
      agreementVersionId: activeAgreement.agreementVersion.agreementVersionId,
      agreementVersionCode: activeAgreement.agreementVersion.versionCode,
      assignmentId: activeAgreement.agreementAssignment.agreementAssignmentId,
      localAgreementSupplementId: activeAgreement.localAgreementSupplement?.localAgreementSupplementId || null,
      overrides: activeAgreement.agreementOverrides.map((override) => override.agreementOverrideId),
      validFrom: validityWindow.validFrom,
      validTo: validityWindow.validTo,
      rateComponents,
      ruleSet: mergedRuleSet
    };
  }
}

function buildAgreementOverlayId(activeAgreement, eventDate) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        agreementVersionId: activeAgreement.agreementVersion.agreementVersionId,
        assignmentId: activeAgreement.agreementAssignment.agreementAssignmentId,
        localAgreementSupplementId: activeAgreement.localAgreementSupplement?.localAgreementSupplementId || null,
        overrides: activeAgreement.agreementOverrides.map((override) => override.agreementOverrideId).sort(),
        eventDate
      })
    )
    .digest("hex")
    .slice(0, 24);
}

function resolveAgreementOverlayValidityWindow(activeAgreement) {
  const candidates = [
    activeAgreement.agreementVersion.effectiveFrom,
    activeAgreement.agreementAssignment.effectiveFrom,
    activeAgreement.localAgreementSupplement?.effectiveFrom || null
  ].filter(Boolean);
  const validFrom = [...candidates].sort().at(-1) || activeAgreement.agreementVersion.effectiveFrom;
  const validTo = [activeAgreement.agreementVersion.effectiveTo, activeAgreement.agreementAssignment.effectiveTo, activeAgreement.localAgreementSupplement?.effectiveTo || null]
    .filter(Boolean)
    .sort()[0] || null;
  return {
    validFrom,
    validTo
  };
}

function buildAgreementRateComponents(ruleSet = {}) {
  const resolvedRuleSet = sanitizeJson(ruleSet);
  const explicitRateComponents =
    resolvedRuleSet.rateComponents && typeof resolvedRuleSet.rateComponents === "object" && !Array.isArray(resolvedRuleSet.rateComponents)
      ? sanitizeJson(resolvedRuleSet.rateComponents)
      : {};

  const payItemRates = {};
  for (const entry of [
    buildAgreementPayItemRateComponent({
      payItemCode: "OVERTIME",
      explicit: explicitRateComponents.overtime || explicitRateComponents.OVERTIME || null,
      legacyMultiplier: resolvedRuleSet.overtimeMultiplier,
      legacyUnitRate: resolvedRuleSet.overtimeUnitRate,
      defaultBasisCode: "contract_hourly_rate"
    }),
    buildAgreementPayItemRateComponent({
      payItemCode: "OB",
      explicit: explicitRateComponents.ob || explicitRateComponents.OB || null,
      legacyUnitRate: resolvedRuleSet.obUnitRate ?? resolvedRuleSet.obCategoryA,
      defaultBasisCode: "contract_hourly_rate"
    }),
    buildAgreementPayItemRateComponent({
      payItemCode: "JOUR",
      explicit: explicitRateComponents.jour || explicitRateComponents.JOUR || null,
      legacyUnitRate: resolvedRuleSet.jourUnitRate,
      defaultBasisCode: "contract_hourly_rate"
    }),
    buildAgreementPayItemRateComponent({
      payItemCode: "STANDBY",
      explicit: explicitRateComponents.standby || explicitRateComponents.STANDBY || explicitRateComponents.beredskap || null,
      legacyUnitRate: resolvedRuleSet.standbyUnitRate ?? resolvedRuleSet.beredskapUnitRate,
      defaultBasisCode: "contract_hourly_rate"
    }),
    buildAgreementPayItemRateComponent({
      payItemCode: "VACATION_SUPPLEMENT",
      explicit: explicitRateComponents.vacationSupplement || explicitRateComponents.VACATION_SUPPLEMENT || null,
      legacyPercent: resolvedRuleSet.vacationSupplementRate,
      defaultBasisCode: "contract_monthly_salary",
      autoGenerate: true
    })
  ]) {
    if (entry) {
      payItemRates[entry.payItemCode] = entry;
    }
  }

  const pensionAdditionsSource = Array.isArray(explicitRateComponents.pensionAdditions)
    ? explicitRateComponents.pensionAdditions
    : Array.isArray(resolvedRuleSet.pensionAdditions)
    ? resolvedRuleSet.pensionAdditions
    : [];

  return {
    payItemRates,
    pensionAdditions: pensionAdditionsSource
      .map((candidate, index) => buildAgreementPensionAdditionComponent(candidate, index))
      .filter(Boolean)
  };
}

function buildAgreementPayItemRateComponent({
  payItemCode,
  explicit = null,
  legacyMultiplier = null,
  legacyUnitRate = null,
  legacyPercent = null,
  defaultBasisCode = "contract_hourly_rate",
  autoGenerate = false
} = {}) {
  const candidate =
    explicit && typeof explicit === "object" && !Array.isArray(explicit)
      ? sanitizeJson(explicit)
      : {};
  const normalizedPayItemCode = normalizeCode(payItemCode, "agreement_overlay_pay_item_code_required");
  const component = {
    payItemCode: normalizedPayItemCode,
    calculationMode: normalizeOptionalText(candidate.calculationMode) || null,
    basisCode: normalizeOptionalText(candidate.basisCode) || defaultBasisCode,
    multiplier: normalizeFiniteNumber(candidate.multiplier ?? legacyMultiplier),
    unitRate: normalizeFiniteNumber(candidate.unitRate ?? legacyUnitRate),
    percent: normalizeFiniteNumber(candidate.percent ?? legacyPercent),
    autoGenerate: candidate.autoGenerate == null ? autoGenerate === true : candidate.autoGenerate === true,
    note: normalizeOptionalText(candidate.note)
  };
  if (!component.calculationMode) {
    if (component.unitRate != null) {
      component.calculationMode = "unit_rate";
    } else if (component.multiplier != null) {
      component.calculationMode = "multiplier";
    } else if (component.percent != null) {
      component.calculationMode = "percent_of_basis";
    }
  }
  if (!component.calculationMode) {
    return null;
  }
  return component;
}

function buildAgreementPensionAdditionComponent(candidate, index) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }
  const resolved = sanitizeJson(candidate);
  const contributionMode = normalizeOptionalText(resolved.contributionMode)
    || (resolved.fixedContributionAmount != null ? "fixed_amount" : resolved.contributionRatePercent != null ? "rate_percent" : null);
  if (!contributionMode) {
    return null;
  }
  return {
    componentCode: normalizeCode(resolved.componentCode || `PENSION_${index + 1}`, "agreement_pension_component_code_required"),
    planCode: normalizeOptionalText(resolved.planCode),
    providerCode: normalizeOptionalText(resolved.providerCode),
    payItemCode: normalizeOptionalText(resolved.payItemCode),
    contributionMode,
    contributionRatePercent: normalizeFiniteNumber(resolved.contributionRatePercent),
    fixedContributionAmount: normalizeFiniteNumber(resolved.fixedContributionAmount),
    basisCode: normalizeOptionalText(resolved.basisCode) || "pensionable_base_after_exchange",
    dimensionJson:
      resolved.dimensionJson && typeof resolved.dimensionJson === "object" && !Array.isArray(resolved.dimensionJson)
        ? sanitizeJson(resolved.dimensionJson)
        : {},
    note: normalizeOptionalText(resolved.note)
  };
}

function normalizeFiniteNumber(value) {
  if (value == null || value === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
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

function presentAgreementCatalogEntry(record) {
  return copy(record);
}

function presentAgreementIntakeCase(record) {
  return copy(record);
}

function presentLocalAgreementSupplement(record) {
  return copy(record);
}

function createIdempotencyLookupKey(companyId, actionCode, idempotencyKey) {
  return `${requireText(companyId, "company_id_required")}::${requireText(actionCode, "agreement_action_code_required")}::${requireText(idempotencyKey, "idempotency_key_required")}`;
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

function requireAgreementCatalogEntry(state, companyId, agreementCatalogEntryId) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const record = state.agreementCatalogEntries.get(requireText(agreementCatalogEntryId, "agreement_catalog_entry_id_required")) || null;
  if (!record || record.companyId !== resolvedCompanyId) {
    throw createError(404, "agreement_catalog_entry_not_found", "Agreement catalog entry was not found.");
  }
  return record;
}

function requireAgreementIntakeCase(state, companyId, agreementIntakeCaseId) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const record = state.agreementIntakeCases.get(requireText(agreementIntakeCaseId, "agreement_intake_case_id_required")) || null;
  if (!record || record.companyId !== resolvedCompanyId) {
    throw createError(404, "agreement_intake_case_not_found", "Agreement intake case was not found.");
  }
  return record;
}

function requireLocalAgreementSupplement(state, companyId, localAgreementSupplementId) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const record = state.localAgreementSupplements.get(requireText(localAgreementSupplementId, "agreement_local_supplement_id_required")) || null;
  if (!record || record.companyId !== resolvedCompanyId) {
    throw createError(404, "agreement_local_supplement_not_found", "Local agreement supplement was not found.");
  }
  return record;
}

function resolveAgreementFamilyForIntake({
  state,
  companyId,
  agreementFamilyId = null,
  agreementFamilyCode = null,
  agreementFamilyName = null,
  intakeCase,
  actorId,
  createAgreementFamily
}) {
  if (agreementFamilyId || agreementFamilyCode) {
    return requireAgreementFamily(state, companyId, { agreementFamilyId, agreementFamilyCode });
  }
  const proposedFamilyCode = normalizeCode(agreementFamilyCode || intakeCase.proposedFamilyCode, "agreement_intake_family_code_required");
  const existingFamilyId = getIndexValue(state.agreementFamilyIdByCode, companyId, proposedFamilyCode);
  if (existingFamilyId) {
    return state.agreementFamilies.get(existingFamilyId);
  }
  return createAgreementFamily({
    companyId,
    code: proposedFamilyCode,
    name: agreementFamilyName || intakeCase.proposedFamilyName,
    status: "active",
    actorId
  });
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

function markSupersededCatalogEntries(state, companyId, agreementFamilyId, effectiveFrom, clock) {
  const now = nowIso(clock);
  for (const agreementCatalogEntryId of state.agreementCatalogEntryIdsByFamily.get(agreementFamilyId) || []) {
    const catalogEntry = state.agreementCatalogEntries.get(agreementCatalogEntryId);
    if (!catalogEntry || catalogEntry.companyId !== companyId || catalogEntry.status !== "published") {
      continue;
    }
    if (catalogEntry.effectiveFrom < effectiveFrom) {
      state.agreementCatalogEntries.set(
        catalogEntry.agreementCatalogEntryId,
        Object.freeze({
          ...catalogEntry,
          status: "superseded",
          updatedAt: now
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

function resolveCatalogEntryStatus(status) {
  return assertStatus(normalizeCode(status, "agreement_catalog_entry_status_required").toLowerCase(), AGREEMENT_CATALOG_ENTRY_STATUSES, "agreement_catalog_entry_status_invalid");
}

function resolveAgreementIntakeCaseStatus(status) {
  return assertStatus(normalizeCode(status, "agreement_intake_case_status_required").toLowerCase(), AGREEMENT_INTAKE_CASE_STATUSES, "agreement_intake_case_status_invalid");
}

function resolveLocalAgreementSupplementStatus(status) {
  return assertStatus(normalizeCode(status, "agreement_local_supplement_status_required").toLowerCase(), LOCAL_AGREEMENT_SUPPLEMENT_STATUSES, "agreement_local_supplement_status_invalid");
}

function resolveAgreementIntakePublicationTarget(requestedPublicationTarget) {
  const value = normalizeCode(requestedPublicationTarget || "catalog", "agreement_intake_publication_target_required").toLowerCase();
  if (!["catalog", "local_supplement"].includes(value)) {
    throw createError(400, "agreement_intake_publication_target_invalid", "Agreement intake publication target must be catalog or local_supplement.");
  }
  return value;
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
