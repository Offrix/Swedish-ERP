import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";

export const LEGAL_FORM_CODES = Object.freeze([
  "AKTIEBOLAG",
  "EKONOMISK_FORENING",
  "ENSKILD_NARINGSVERKSAMHET",
  "HANDELSBOLAG",
  "KOMMANDITBOLAG"
]);
export const LEGAL_FORM_PROFILE_STATUSES = Object.freeze(["planned", "active", "historical", "superseded"]);
export const REPORTING_OBLIGATION_PROFILE_STATUSES = Object.freeze(["draft", "approved", "historical", "superseded"]);
export const DECLARATION_PROFILE_CODES = Object.freeze(["INK2", "INK4", "NE"]);
export const SIGNATORY_CLASS_CODES = Object.freeze([
  "BOARD_OR_CEO",
  "ASSOCIATION_SIGNATORY",
  "OWNER_PROPRIETOR",
  "PARTNER_SIGNATORY"
]);
export const FILING_PROFILE_CODES = Object.freeze([
  "AB_ANNUAL_REPORT_AND_INK2",
  "EF_ANNUAL_REPORT_AND_INK2",
  "SOLE_TRADER_NE",
  "PARTNERSHIP_INK4",
  "PARTNERSHIP_ANNUAL_REPORT_AND_INK4"
]);
export const LEGAL_FORM_RULEPACK_VERSION = "se-legal-form-2026.1";
export const DEMO_COMPANY_ID = "00000000-0000-4000-8000-000000000001";

export function createLegalFormPlatform(options = {}) {
  return createLegalFormEngine(options);
}

export function createLegalFormEngine({
  clock = () => new Date(),
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null
} = {}) {
  const state = {
    legalFormProfiles: new Map(),
    legalFormProfileIdsByCompany: new Map(),
    reportingObligationProfiles: new Map(),
    reportingObligationIdsByCompany: new Map(),
    auditEvents: []
  };

  if (seedDemo) {
    seedDemoState(state, clock);
  }

  return {
    legalFormCodes: LEGAL_FORM_CODES,
    legalFormProfileStatuses: LEGAL_FORM_PROFILE_STATUSES,
    reportingObligationProfileStatuses: REPORTING_OBLIGATION_PROFILE_STATUSES,
    declarationProfileCodes: DECLARATION_PROFILE_CODES,
    signatoryClassCodes: SIGNATORY_CLASS_CODES,
    filingProfileCodes: FILING_PROFILE_CODES,
    createLegalFormProfile,
    listLegalFormProfiles,
    getLegalFormProfile,
    activateLegalFormProfile,
    resolveActiveLegalFormProfile,
    createReportingObligationProfile,
    listReportingObligationProfiles,
    getReportingObligationProfile,
    approveReportingObligationProfile,
    resolveReportingObligationProfile,
    resolveDeclarationProfile,
    listLegalFormAuditEvents
  };

  function createLegalFormProfile({
    companyId,
    legalFormCode,
    effectiveFrom,
    effectiveTo = null,
    filingProfileCode = null,
    signatoryClassCode = null,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedLegalFormCode = assertAllowed(normalizeCode(legalFormCode, "legal_form_code_required"), LEGAL_FORM_CODES, "legal_form_code_invalid");
    const resolvedEffectiveFrom = normalizeDate(effectiveFrom, "effective_from_invalid");
    const resolvedEffectiveTo = normalizeOptionalDate(effectiveTo, "effective_to_invalid");
    if (resolvedEffectiveTo && resolvedEffectiveTo <= resolvedEffectiveFrom) {
      throw createError(400, "legal_form_profile_interval_invalid", "effectiveTo must be later than effectiveFrom.");
    }
    assertNoProfileOverlap(state, resolvedCompanyId, resolvedEffectiveFrom, resolvedEffectiveTo);
    const profile = Object.freeze({
      legalFormProfileId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      legalFormCode: resolvedLegalFormCode,
      effectiveFrom: resolvedEffectiveFrom,
      effectiveTo: resolvedEffectiveTo,
      filingProfileCode: normalizeOptionalAllowedCode(
        filingProfileCode,
        FILING_PROFILE_CODES,
        "filing_profile_code_invalid"
      ) || defaultFilingProfileCode(resolvedLegalFormCode),
      signatoryClassCode: normalizeOptionalAllowedCode(
        signatoryClassCode,
        SIGNATORY_CLASS_CODES,
        "signatory_class_code_invalid"
      ) || defaultSignatoryClassCode(resolvedLegalFormCode),
      declarationProfileCode: defaultDeclarationProfileCode(resolvedLegalFormCode),
      status: "planned",
      rulepackCode: "RP-LEGAL-FORM-SE",
      rulepackVersion: LEGAL_FORM_RULEPACK_VERSION,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock),
      supersededByProfileId: null
    });
    state.legalFormProfiles.set(profile.legalFormProfileId, profile);
    appendToIndex(state.legalFormProfileIdsByCompany, resolvedCompanyId, profile.legalFormProfileId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: profile.createdByActorId,
      action: "legal_form.profile_created",
      entityType: "legal_form_profile",
      entityId: profile.legalFormProfileId,
      explanation: `Created ${resolvedLegalFormCode} profile effective from ${resolvedEffectiveFrom}.`
    });
    return copy(profile);
  }

  function listLegalFormProfiles({ companyId, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = normalizeOptionalStatus(status, LEGAL_FORM_PROFILE_STATUSES, "legal_form_profile_status_invalid");
    return (state.legalFormProfileIdsByCompany.get(resolvedCompanyId) || [])
      .map((profileId) => state.legalFormProfiles.get(profileId))
      .filter(Boolean)
      .filter((profile) => (resolvedStatus ? profile.status === resolvedStatus : true))
      .sort((left, right) => left.effectiveFrom.localeCompare(right.effectiveFrom) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function getLegalFormProfile({ companyId, legalFormProfileId } = {}) {
    return copy(requireLegalFormProfile(state, companyId, legalFormProfileId));
  }

  function activateLegalFormProfile({ companyId, legalFormProfileId, actorId = "system" } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const profile = requireLegalFormProfile(state, resolvedCompanyId, legalFormProfileId);
    if (profile.status === "active") {
      return copy(profile);
    }
    const now = nowIso(clock);
    const activeProfiles = listInternalLegalFormProfiles(state, resolvedCompanyId).filter(
      (candidate) => candidate.status === "active" && candidate.legalFormProfileId !== profile.legalFormProfileId
    );
    for (const candidate of activeProfiles) {
      state.legalFormProfiles.set(candidate.legalFormProfileId, Object.freeze({
        ...candidate,
        status: "historical",
        effectiveTo: candidate.effectiveTo || dayBefore(profile.effectiveFrom),
        supersededByProfileId: profile.legalFormProfileId,
        updatedAt: now
      }));
    }
    const activated = Object.freeze({
      ...profile,
      status: "active",
      updatedAt: now
    });
    state.legalFormProfiles.set(activated.legalFormProfileId, activated);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: requireText(actorId, "actor_id_required"),
      action: "legal_form.profile_activated",
      entityType: "legal_form_profile",
      entityId: activated.legalFormProfileId,
      explanation: `Activated ${activated.legalFormCode} profile.`
    });
    return copy(activated);
  }

  function resolveActiveLegalFormProfile({ companyId, asOfDate, legalFormProfileId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    if (normalizeOptionalText(legalFormProfileId)) {
      return copy(requireLegalFormProfile(state, resolvedCompanyId, legalFormProfileId));
    }
    const resolvedAsOfDate = normalizeDate(asOfDate, "as_of_date_invalid");
    const matches = listInternalLegalFormProfiles(state, resolvedCompanyId)
      .filter((profile) => ["active", "historical"].includes(profile.status))
      .filter((profile) => intervalIncludes(profile.effectiveFrom, profile.effectiveTo, resolvedAsOfDate));
    if (matches.length === 0) {
      throw createError(409, "legal_form_profile_missing", "No legal-form profile covers the requested date.");
    }
    return copy(matches.sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom))[0]);
  }

  function createReportingObligationProfile({
    companyId,
    legalFormProfileId,
    fiscalYearKey,
    fiscalYearId = null,
    accountingPeriodId = null,
    requiresAnnualReport,
    requiresYearEndAccounts,
    allowsSimplifiedYearEnd = false,
    requiresBolagsverketFiling = false,
    requiresTaxDeclarationPackage = true,
    declarationProfileCode = null,
    signatoryClassCode = null,
    packageFamilyCode = null,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const legalFormProfile = requireLegalFormProfile(state, resolvedCompanyId, legalFormProfileId);
    const resolvedFiscalYearKey = requireText(fiscalYearKey, "fiscal_year_key_required");
    const resolvedDeclarationProfileCode =
      normalizeOptionalAllowedCode(declarationProfileCode, DECLARATION_PROFILE_CODES, "declaration_profile_code_invalid") ||
      defaultDeclarationProfileCode(legalFormProfile.legalFormCode);
    const resolvedSignatoryClassCode =
      normalizeOptionalAllowedCode(signatoryClassCode, SIGNATORY_CLASS_CODES, "signatory_class_code_invalid") ||
      legalFormProfile.signatoryClassCode;
    const obligation = Object.freeze({
      reportingObligationProfileId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      legalFormProfileId: legalFormProfile.legalFormProfileId,
      legalFormCode: legalFormProfile.legalFormCode,
      fiscalYearKey: resolvedFiscalYearKey,
      fiscalYearId: normalizeOptionalText(fiscalYearId),
      accountingPeriodId: normalizeOptionalText(accountingPeriodId),
      requiresAnnualReport: requiresAnnualReport === true,
      requiresYearEndAccounts: requiresYearEndAccounts === true,
      allowsSimplifiedYearEnd: allowsSimplifiedYearEnd === true,
      requiresBolagsverketFiling: requiresBolagsverketFiling === true,
      requiresTaxDeclarationPackage: requiresTaxDeclarationPackage !== false,
      declarationProfileCode: resolvedDeclarationProfileCode,
      signatoryClassCode: resolvedSignatoryClassCode,
      filingProfileCode: legalFormProfile.filingProfileCode,
      packageFamilyCode:
        normalizeOptionalText(packageFamilyCode) ||
        defaultPackageFamilyCode(legalFormProfile.legalFormCode, {
          requiresAnnualReport: requiresAnnualReport === true
        }),
      status: "draft",
      rulepackCode: "RP-ANNUAL-FILING-SE",
      rulepackVersion: LEGAL_FORM_RULEPACK_VERSION,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock),
      supersededByReportingObligationProfileId: null
    });
    assertNoReportingObligationDuplication(state, obligation);
    assertObligationConsistency(obligation);
    state.reportingObligationProfiles.set(obligation.reportingObligationProfileId, obligation);
    appendToIndex(state.reportingObligationIdsByCompany, resolvedCompanyId, obligation.reportingObligationProfileId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: obligation.createdByActorId,
      action: "legal_form.reporting_obligation_created",
      entityType: "reporting_obligation_profile",
      entityId: obligation.reportingObligationProfileId,
      explanation: `Created reporting obligation ${obligation.packageFamilyCode} for ${obligation.fiscalYearKey}.`
    });
    return copy(obligation);
  }

  function listReportingObligationProfiles({ companyId, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = normalizeOptionalStatus(
      status,
      REPORTING_OBLIGATION_PROFILE_STATUSES,
      "reporting_obligation_profile_status_invalid"
    );
    return (state.reportingObligationIdsByCompany.get(resolvedCompanyId) || [])
      .map((profileId) => state.reportingObligationProfiles.get(profileId))
      .filter(Boolean)
      .filter((profile) => (resolvedStatus ? profile.status === resolvedStatus : true))
      .sort((left, right) => left.fiscalYearKey.localeCompare(right.fiscalYearKey) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function getReportingObligationProfile({ companyId, reportingObligationProfileId } = {}) {
    return copy(requireReportingObligationProfile(state, companyId, reportingObligationProfileId));
  }

  function approveReportingObligationProfile({ companyId, reportingObligationProfileId, actorId = "system" } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const profile = requireReportingObligationProfile(state, resolvedCompanyId, reportingObligationProfileId);
    if (profile.status === "approved") {
      return copy(profile);
    }
    const now = nowIso(clock);
    const supersededProfiles = listInternalReportingObligationProfiles(state, resolvedCompanyId).filter(
      (candidate) =>
        candidate.status === "approved" &&
        candidate.reportingObligationProfileId !== profile.reportingObligationProfileId &&
        candidate.legalFormProfileId === profile.legalFormProfileId &&
        candidate.fiscalYearKey === profile.fiscalYearKey
    );
    for (const candidate of supersededProfiles) {
      state.reportingObligationProfiles.set(candidate.reportingObligationProfileId, Object.freeze({
        ...candidate,
        status: "superseded",
        supersededByReportingObligationProfileId: profile.reportingObligationProfileId,
        updatedAt: now
      }));
    }
    const approved = Object.freeze({
      ...profile,
      status: "approved",
      updatedAt: now
    });
    state.reportingObligationProfiles.set(approved.reportingObligationProfileId, approved);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: requireText(actorId, "actor_id_required"),
      action: "legal_form.reporting_obligation_approved",
      entityType: "reporting_obligation_profile",
      entityId: approved.reportingObligationProfileId,
      explanation: `Approved reporting obligation ${approved.packageFamilyCode} for ${approved.fiscalYearKey}.`
    });
    return copy(approved);
  }

  function resolveReportingObligationProfile({
    companyId,
    legalFormProfileId = null,
    accountingPeriodId = null,
    fiscalYearId = null,
    fiscalYearKey = null,
    asOfDate = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const targetLegalFormProfile =
      normalizeOptionalText(legalFormProfileId) != null
        ? requireLegalFormProfile(state, resolvedCompanyId, legalFormProfileId)
        : resolveActiveLegalFormProfile({ companyId: resolvedCompanyId, asOfDate });
    const resolvedAccountingPeriodId = normalizeOptionalText(accountingPeriodId);
    const resolvedFiscalYearId = normalizeOptionalText(fiscalYearId);
    const resolvedFiscalYearKey = normalizeOptionalText(fiscalYearKey);
    let candidates = listInternalReportingObligationProfiles(state, resolvedCompanyId)
      .filter((profile) => profile.status === "approved")
      .filter((profile) => profile.legalFormProfileId === targetLegalFormProfile.legalFormProfileId);
    if (resolvedFiscalYearKey) {
      const keyed = candidates.filter((profile) => profile.fiscalYearKey === resolvedFiscalYearKey);
      candidates = keyed.length > 0 ? keyed : candidates;
    }
    if (resolvedFiscalYearId) {
      const fiscalYearMatches = candidates.filter((profile) => profile.fiscalYearId === resolvedFiscalYearId);
      candidates = fiscalYearMatches.length > 0 ? fiscalYearMatches : candidates;
    }
    const periodMatches = resolvedAccountingPeriodId
      ? candidates.filter((profile) => profile.accountingPeriodId === resolvedAccountingPeriodId)
      : candidates;
    const matches = periodMatches.length > 0 ? periodMatches : candidates;
    if (matches.length === 0) {
      throw createError(409, "reporting_obligation_profile_missing", "No approved reporting-obligation profile matches the requested annual context.");
    }
    return copy(matches.sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]);
  }

  function resolveDeclarationProfile(input = {}) {
    const legalFormProfile = resolveActiveLegalFormProfile(input);
    const reportingObligation = resolveReportingObligationProfile({
      ...input,
      legalFormProfileId: legalFormProfile.legalFormProfileId
    });
    return copy({
      companyId: legalFormProfile.companyId,
      legalFormProfileId: legalFormProfile.legalFormProfileId,
      legalFormCode: legalFormProfile.legalFormCode,
      filingProfileCode: legalFormProfile.filingProfileCode,
      declarationProfileCode: reportingObligation.declarationProfileCode,
      reportingObligationProfileId: reportingObligation.reportingObligationProfileId,
      packageFamilyCode: reportingObligation.packageFamilyCode,
      signatoryClassCode: reportingObligation.signatoryClassCode,
      submissionFamilyCode: submissionFamilyCodeFor(reportingObligation),
      requiredPackageCodes: requiredPackageCodesFor(reportingObligation),
      supplementPackageCodes: supplementPackageCodesFor(reportingObligation)
    });
  }

  function listLegalFormAuditEvents({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return state.auditEvents
      .filter((event) => event.companyId === resolvedCompanyId)
      .map(copy);
  }
}

function seedDemoState(state, clock) {
  const profile = Object.freeze({
    legalFormProfileId: crypto.randomUUID(),
    companyId: DEMO_COMPANY_ID,
    legalFormCode: "AKTIEBOLAG",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    filingProfileCode: "AB_ANNUAL_REPORT_AND_INK2",
    signatoryClassCode: "BOARD_OR_CEO",
    declarationProfileCode: "INK2",
    status: "active",
    rulepackCode: "RP-LEGAL-FORM-SE",
    rulepackVersion: LEGAL_FORM_RULEPACK_VERSION,
    createdByActorId: "seed",
    createdAt: nowIso(clock),
    updatedAt: nowIso(clock),
    supersededByProfileId: null
  });
  state.legalFormProfiles.set(profile.legalFormProfileId, profile);
  appendToIndex(state.legalFormProfileIdsByCompany, DEMO_COMPANY_ID, profile.legalFormProfileId);

  const obligation = Object.freeze({
    reportingObligationProfileId: crypto.randomUUID(),
    companyId: DEMO_COMPANY_ID,
    legalFormProfileId: profile.legalFormProfileId,
    legalFormCode: profile.legalFormCode,
    fiscalYearKey: "2026",
    fiscalYearId: null,
    accountingPeriodId: null,
    requiresAnnualReport: true,
    requiresYearEndAccounts: false,
    allowsSimplifiedYearEnd: false,
    requiresBolagsverketFiling: true,
    requiresTaxDeclarationPackage: true,
    declarationProfileCode: "INK2",
    signatoryClassCode: "BOARD_OR_CEO",
    filingProfileCode: profile.filingProfileCode,
    packageFamilyCode: "annual_report_ab",
    status: "approved",
    rulepackCode: "RP-ANNUAL-FILING-SE",
    rulepackVersion: LEGAL_FORM_RULEPACK_VERSION,
    createdByActorId: "seed",
    createdAt: nowIso(clock),
    updatedAt: nowIso(clock),
    supersededByReportingObligationProfileId: null
  });
  state.reportingObligationProfiles.set(obligation.reportingObligationProfileId, obligation);
  appendToIndex(state.reportingObligationIdsByCompany, DEMO_COMPANY_ID, obligation.reportingObligationProfileId);
}

function requiredPackageCodesFor(reportingObligation) {
  switch (reportingObligation.declarationProfileCode) {
    case "INK2":
      return Object.freeze(["INK2", "SRU"]);
    case "INK4":
      return Object.freeze(["INK4", "SRU"]);
    case "NE":
      return Object.freeze(["NE", "SRU"]);
    default:
      return Object.freeze(["SRU"]);
  }
}

function supplementPackageCodesFor(reportingObligation) {
  if (reportingObligation.declarationProfileCode === "NE") {
    return Object.freeze(["NEA"]);
  }
  return Object.freeze([]);
}

function submissionFamilyCodeFor(reportingObligation) {
  if (reportingObligation.requiresAnnualReport && reportingObligation.requiresBolagsverketFiling) {
    return "bolagsverket_annual_plus_tax";
  }
  return "skatteverket_tax_only";
}

function assertObligationConsistency(profile) {
  if (profile.legalFormCode === "ENSKILD_NARINGSVERKSAMHET" && profile.requiresAnnualReport) {
    throw createError(409, "sole_trader_annual_report_not_supported", "Sole traders cannot default to annual-report filing.");
  }
  if (["AKTIEBOLAG", "EKONOMISK_FORENING"].includes(profile.legalFormCode) && profile.declarationProfileCode !== "INK2") {
    throw createError(409, "ink2_required_for_legal_person", "AB and economic associations must use INK2 declaration profiles.");
  }
  if (["HANDELSBOLAG", "KOMMANDITBOLAG"].includes(profile.legalFormCode) && profile.declarationProfileCode !== "INK4") {
    throw createError(409, "ink4_required_for_partnership", "HB and KB must use INK4 declaration profiles.");
  }
  if (profile.legalFormCode === "ENSKILD_NARINGSVERKSAMHET" && profile.declarationProfileCode !== "NE") {
    throw createError(409, "ne_required_for_sole_trader", "Sole traders must use the NE declaration profile.");
  }
}

function assertNoProfileOverlap(state, companyId, effectiveFrom, effectiveTo) {
  const overlaps = listInternalLegalFormProfiles(state, companyId).find((profile) =>
    intervalsOverlap(profile.effectiveFrom, profile.effectiveTo, effectiveFrom, effectiveTo)
  );
  if (overlaps) {
    throw createError(409, "legal_form_profile_overlap", "Legal-form profiles may not overlap.");
  }
}

function assertNoReportingObligationDuplication(state, obligation) {
  const duplicate = listInternalReportingObligationProfiles(state, obligation.companyId).find(
    (candidate) =>
      candidate.legalFormProfileId === obligation.legalFormProfileId &&
      candidate.fiscalYearKey === obligation.fiscalYearKey &&
      candidate.status !== "superseded"
  );
  if (duplicate) {
    throw createError(
      409,
      "reporting_obligation_profile_duplicate",
      "A reporting-obligation profile already exists for the legal-form profile and fiscal year."
    );
  }
}

function listInternalLegalFormProfiles(state, companyId) {
  return (state.legalFormProfileIdsByCompany.get(companyId) || [])
    .map((profileId) => state.legalFormProfiles.get(profileId))
    .filter(Boolean);
}

function listInternalReportingObligationProfiles(state, companyId) {
  return (state.reportingObligationIdsByCompany.get(companyId) || [])
    .map((profileId) => state.reportingObligationProfiles.get(profileId))
    .filter(Boolean);
}

function requireLegalFormProfile(state, companyId, legalFormProfileId) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const resolvedProfileId = requireText(legalFormProfileId, "legal_form_profile_id_required");
  const profile = state.legalFormProfiles.get(resolvedProfileId);
  if (!profile || profile.companyId !== resolvedCompanyId) {
    throw createError(404, "legal_form_profile_not_found", "Legal-form profile was not found.");
  }
  return profile;
}

function requireReportingObligationProfile(state, companyId, reportingObligationProfileId) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const resolvedProfileId = requireText(reportingObligationProfileId, "reporting_obligation_profile_id_required");
  const profile = state.reportingObligationProfiles.get(resolvedProfileId);
  if (!profile || profile.companyId !== resolvedCompanyId) {
    throw createError(404, "reporting_obligation_profile_not_found", "Reporting-obligation profile was not found.");
  }
  return profile;
}

function defaultDeclarationProfileCode(legalFormCode) {
  switch (legalFormCode) {
    case "AKTIEBOLAG":
    case "EKONOMISK_FORENING":
      return "INK2";
    case "HANDELSBOLAG":
    case "KOMMANDITBOLAG":
      return "INK4";
    case "ENSKILD_NARINGSVERKSAMHET":
      return "NE";
    default:
      throw createError(400, "declaration_profile_unsupported", "Unsupported legal form for declaration profile.");
  }
}

function defaultFilingProfileCode(legalFormCode) {
  switch (legalFormCode) {
    case "AKTIEBOLAG":
      return "AB_ANNUAL_REPORT_AND_INK2";
    case "EKONOMISK_FORENING":
      return "EF_ANNUAL_REPORT_AND_INK2";
    case "ENSKILD_NARINGSVERKSAMHET":
      return "SOLE_TRADER_NE";
    case "HANDELSBOLAG":
    case "KOMMANDITBOLAG":
      return "PARTNERSHIP_INK4";
    default:
      throw createError(400, "filing_profile_unsupported", "Unsupported legal form for filing profile.");
  }
}

function defaultPackageFamilyCode(legalFormCode, { requiresAnnualReport }) {
  switch (legalFormCode) {
    case "AKTIEBOLAG":
      return "annual_report_ab";
    case "EKONOMISK_FORENING":
      return "annual_report_ef";
    case "ENSKILD_NARINGSVERKSAMHET":
      return "sole_trader_year_end";
    case "HANDELSBOLAG":
    case "KOMMANDITBOLAG":
      return requiresAnnualReport ? "partnership_annual_report_and_ink4" : "partnership_ink4";
    default:
      throw createError(400, "package_family_unsupported", "Unsupported legal form for package family.");
  }
}

function defaultSignatoryClassCode(legalFormCode) {
  switch (legalFormCode) {
    case "AKTIEBOLAG":
      return "BOARD_OR_CEO";
    case "EKONOMISK_FORENING":
      return "ASSOCIATION_SIGNATORY";
    case "ENSKILD_NARINGSVERKSAMHET":
      return "OWNER_PROPRIETOR";
    case "HANDELSBOLAG":
    case "KOMMANDITBOLAG":
      return "PARTNER_SIGNATORY";
    default:
      throw createError(400, "signatory_class_unsupported", "Unsupported legal form for signatory class.");
  }
}

function intervalsOverlap(leftStart, leftEnd, rightStart, rightEnd) {
  const normalizedLeftEnd = leftEnd || "9999-12-31";
  const normalizedRightEnd = rightEnd || "9999-12-31";
  return leftStart <= normalizedRightEnd && rightStart <= normalizedLeftEnd;
}

function intervalIncludes(startDate, endDate, targetDate) {
  const normalizedEndDate = endDate || "9999-12-31";
  return startDate <= targetDate && targetDate <= normalizedEndDate;
}

function dayBefore(dateText) {
  const date = new Date(`${dateText}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function appendToIndex(indexMap, key, value) {
  const entries = indexMap.get(key) || [];
  entries.push(value);
  indexMap.set(key, entries);
}

function normalizeCode(value, errorCode) {
  return requireText(value, errorCode)
    .trim()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function normalizeOptionalAllowedCode(value, allowed, errorCode) {
  if (normalizeOptionalText(value) == null) {
    return null;
  }
  return assertAllowed(normalizeCode(value, errorCode), allowed, errorCode);
}

function assertAllowed(value, allowedValues, errorCode) {
  if (!allowedValues.includes(value)) {
    throw createError(400, errorCode, `Unsupported value ${value}.`);
  }
  return value;
}

function normalizeDate(value, errorCode) {
  const resolvedValue = requireText(value, errorCode);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolvedValue)) {
    throw createError(400, errorCode, "Dates must use YYYY-MM-DD.");
  }
  return resolvedValue;
}

function normalizeOptionalDate(value, errorCode) {
  const resolvedValue = normalizeOptionalText(value);
  return resolvedValue == null ? null : normalizeDate(resolvedValue, errorCode);
}

function normalizeOptionalStatus(value, allowedValues, errorCode) {
  const resolvedValue = normalizeOptionalText(value);
  return resolvedValue == null ? null : assertAllowed(normalizeCode(resolvedValue, errorCode), allowedValues, errorCode);
}

function normalizeOptionalText(value) {
  if (value == null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length === 0 ? null : normalized;
}

function requireText(value, errorCode) {
  const normalized = normalizeOptionalText(value);
  if (normalized == null) {
    throw createError(400, errorCode, `${errorCode} is required.`);
  }
  return normalized;
}

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function pushAudit(state, clock, auditEvent) {
  state.auditEvents.push(
    createAuditEnvelopeFromLegacyEvent({
      clock,
      auditClass: "legal_form_action",
      event: auditEvent
    })
  );
}

function nowIso(clock) {
  return clock().toISOString();
}

function copy(value) {
  if (value === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value));
}
