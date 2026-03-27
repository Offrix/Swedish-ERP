import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";
import { createRulePackRegistry } from "../../rule-engine/src/index.mjs";

const DEMO_COMPANY_ID = "00000000-0000-4000-8000-000000000001";

export const FISCAL_YEAR_STATUSES = Object.freeze(["planned", "active", "closing", "closed", "historical"]);
export const FISCAL_YEAR_CHANGE_REQUEST_STATUSES = Object.freeze([
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "implemented"
]);
export const FISCAL_PERIOD_LOCK_STATES = Object.freeze(["open", "soft_locked", "hard_locked", "reopened"]);
export const FISCAL_PERIOD_CLOSE_STATES = Object.freeze(["open", "closing", "closed"]);
export const FISCAL_YEAR_KINDS = Object.freeze(["CALENDAR", "BROKEN", "SHORT", "EXTENDED"]);
export const LEGAL_FORM_CODES_REQUIRING_CALENDAR_YEAR = Object.freeze(["FYSISK_PERSON", "ENSKILD_NARINGSVERKSAMHET"]);
export const OWNER_TAXATION_CODES = Object.freeze(["LEGAL_PERSON_ONLY", "PHYSICAL_PERSON_PARTICIPANT"]);
export const FISCAL_YEAR_RULEPACK_CODE = "RP-FISCAL-YEAR-SE";
export const FISCAL_YEAR_RULEPACK_VERSION = "se-fiscal-year-2026.1";

const FISCAL_YEAR_RULE_PACKS = Object.freeze([
  Object.freeze({
    rulePackId: "fiscal-year-se-2026.1",
    rulePackCode: FISCAL_YEAR_RULEPACK_CODE,
    domain: "fiscal_year",
    jurisdiction: "SE",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    version: FISCAL_YEAR_RULEPACK_VERSION,
    checksum: "fiscal-year-se-2026.1",
    sourceSnapshotDate: "2026-03-24",
    semanticChangeSummary: "Swedish fiscal-year baseline covering calendar-year restrictions, change permissions and month-boundary periods.",
    machineReadableRules: Object.freeze({
      legalFormCodesRequiringCalendarYear: LEGAL_FORM_CODES_REQUIRING_CALENDAR_YEAR,
      ownerTaxationCodes: OWNER_TAXATION_CODES
    }),
    humanReadableExplanation: Object.freeze([
      "Fiscal-year selection is constrained by legal form, owner taxation and change-of-year approval basis."
    ]),
    testVectors: Object.freeze([]),
    migrationNotes: Object.freeze([])
  })
]);

export function createFiscalYearPlatform(options = {}) {
  return createFiscalYearEngine(options);
}

export function createFiscalYearEngine({
  clock = () => new Date(),
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null,
  ruleRegistry = null
} = {}) {
  const rules = ruleRegistry || createRulePackRegistry({
    clock,
    seedRulePacks: FISCAL_YEAR_RULE_PACKS
  });
  const state = {
    profiles: new Map(),
    profileIdsByCompany: new Map(),
    fiscalYears: new Map(),
    fiscalYearIdsByCompany: new Map(),
    periods: new Map(),
    periodIdsByFiscalYear: new Map(),
    changeRequests: new Map(),
    changeRequestIdsByCompany: new Map(),
    auditEvents: []
  };

  if (seedDemo) {
    seedDemoCompany(state, clock, resolveFiscalYearRulePack("2026-01-01"));
  }

  return {
    fiscalYearStatuses: FISCAL_YEAR_STATUSES,
    fiscalPeriodLockStates: FISCAL_PERIOD_LOCK_STATES,
    fiscalYearKinds: FISCAL_YEAR_KINDS,
    createFiscalYearProfile,
    listFiscalYearProfiles,
    getFiscalYearProfile,
    submitFiscalYearChangeRequest,
    listFiscalYearChangeRequests,
    approveFiscalYearChangeRequest,
    createFiscalYear,
    listFiscalYears,
    getFiscalYear,
    activateFiscalYear,
    generatePeriods,
    getActiveFiscalYearForDate,
    getPeriodForDate,
    reopenPeriod,
    getFiscalYearHistory,
    listFiscalYearAuditEvents
  };

  function createFiscalYearProfile({
    companyId,
    legalFormCode,
    ownerTaxationCode = "LEGAL_PERSON_ONLY",
    groupAlignmentRequired = false,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedLegalFormCode = normalizeCode(legalFormCode, "legal_form_code_required");
    const resolvedOwnerTaxationCode = assertAllowed(
      normalizeCode(ownerTaxationCode, "owner_taxation_code_required"),
      OWNER_TAXATION_CODES,
      "owner_taxation_code_invalid"
    );
    const rulePack = resolveFiscalYearRulePack(currentDate(clock));
    const profile = Object.freeze({
      fiscalYearProfileId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      legalFormCode: resolvedLegalFormCode,
      ownerTaxationCode: resolvedOwnerTaxationCode,
      mustUseCalendarYear: mustUseCalendarYear({ legalFormCode: resolvedLegalFormCode, ownerTaxationCode: resolvedOwnerTaxationCode }),
      groupAlignmentRequired: groupAlignmentRequired === true,
      rulepackId: rulePack.rulePackId,
      rulepackCode: rulePack.rulePackCode,
      rulepackVersion: rulePack.version,
      rulepackChecksum: rulePack.checksum,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    });

    state.profiles.set(profile.fiscalYearProfileId, profile);
    appendToIndex(state.profileIdsByCompany, resolvedCompanyId, profile.fiscalYearProfileId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: profile.createdByActorId,
      action: "fiscal_year.profile_created",
      entityType: "fiscal_year_profile",
      entityId: profile.fiscalYearProfileId,
      explanation: `Created fiscal-year profile for legal form ${resolvedLegalFormCode}.`
    });
    return copy(profile);
  }

  function listFiscalYearProfiles({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.profileIdsByCompany.get(resolvedCompanyId) || [])
      .map((profileId) => state.profiles.get(profileId))
      .filter(Boolean)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function getFiscalYearProfile({ companyId, fiscalYearProfileId } = {}) {
    return copy(requireFiscalYearProfile(state, companyId, fiscalYearProfileId));
  }

  function submitFiscalYearChangeRequest({
    companyId,
    requestedStartDate,
    requestedEndDate,
    reasonCode,
    permissionReference = null,
    groupAlignmentStartDate = null,
    groupAlignmentEndDate = null,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const profile = requireLatestFiscalYearProfile(state, resolvedCompanyId);
    const resolvedRequestedStartDate = normalizeMonthBoundaryStartDate(requestedStartDate, "requested_start_date_invalid");
    const resolvedRequestedEndDate = normalizeMonthBoundaryEndDate(requestedEndDate, "requested_end_date_invalid");
    const rulePack = resolveFiscalYearRulePack(resolvedRequestedStartDate);
    const yearKind = resolveFiscalYearKind(resolvedRequestedStartDate, resolvedRequestedEndDate);
    assertFiscalYearAllowedForProfile({
      profile,
      startDate: resolvedRequestedStartDate,
      endDate: resolvedRequestedEndDate,
      yearKind
    });
    const currentFiscalYear = latestNonPlannedFiscalYear(state, resolvedCompanyId);
    const taxAgencyPermissionRequired = requiresTaxAgencyPermission({
      currentFiscalYear,
      requestedYearKind: yearKind,
      reasonCode
    });
    const request = Object.freeze({
      changeRequestId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      requestedStartDate: resolvedRequestedStartDate,
      requestedEndDate: resolvedRequestedEndDate,
      yearKind,
      reasonCode: normalizeCode(reasonCode, "reason_code_required"),
      taxAgencyPermissionRequired,
      permissionStatus: taxAgencyPermissionRequired ? (normalizeOptionalText(permissionReference) ? "granted" : "pending") : "not_required",
      permissionReference: normalizeOptionalText(permissionReference),
      rulepackId: rulePack.rulePackId,
      rulepackCode: rulePack.rulePackCode,
      rulepackVersion: rulePack.version,
      rulepackChecksum: rulePack.checksum,
      groupAlignmentStartDate: normalizeOptionalDate(groupAlignmentStartDate, "group_alignment_start_date_invalid"),
      groupAlignmentEndDate: normalizeOptionalDate(groupAlignmentEndDate, "group_alignment_end_date_invalid"),
      status: "submitted",
      approvedBy: null,
      approvedAt: null,
      implementedAt: null,
      requestedByActorId: requireText(actorId, "actor_id_required"),
      requestedAt: nowIso(clock),
      updatedAt: nowIso(clock)
    });

    state.changeRequests.set(request.changeRequestId, request);
    appendToIndex(state.changeRequestIdsByCompany, resolvedCompanyId, request.changeRequestId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: request.requestedByActorId,
      action: "fiscal_year.change_request_submitted",
      entityType: "fiscal_year_change_request",
      entityId: request.changeRequestId,
      explanation: `Submitted ${yearKind} fiscal-year change request for ${resolvedRequestedStartDate} to ${resolvedRequestedEndDate}.`
    });
    return copy(request);
  }

  function listFiscalYearChangeRequests({ companyId, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = normalizeOptionalStatus(status, FISCAL_YEAR_CHANGE_REQUEST_STATUSES, "fiscal_year_change_request_status_invalid");
    return (state.changeRequestIdsByCompany.get(resolvedCompanyId) || [])
      .map((changeRequestId) => state.changeRequests.get(changeRequestId))
      .filter(Boolean)
      .filter((request) => (resolvedStatus ? request.status === resolvedStatus : true))
      .sort((left, right) => left.requestedStartDate.localeCompare(right.requestedStartDate) || left.requestedAt.localeCompare(right.requestedAt))
      .map(copy);
  }

  function approveFiscalYearChangeRequest({ companyId, changeRequestId, actorId = "system" } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const request = requireFiscalYearChangeRequest(state, resolvedCompanyId, changeRequestId);
    const profile = requireLatestFiscalYearProfile(state, resolvedCompanyId);
    const resolvedActorId = requireText(actorId, "actor_id_required");

    if (request.status !== "submitted") {
      throw createError(409, "fiscal_year_change_request_not_approvable", "Only submitted change requests can be approved.");
    }
    if (request.taxAgencyPermissionRequired && request.permissionStatus !== "granted") {
      throw createError(409, "fiscal_year_permission_missing", "Skatteverket permission must be granted before approval.");
    }
    if (profile.groupAlignmentRequired) {
      if (!request.groupAlignmentStartDate || !request.groupAlignmentEndDate) {
        throw createError(409, "group_alignment_reference_required", "Group-aligned companies must supply the reference fiscal year when approving a change.");
      }
      if (
        request.requestedStartDate !== request.groupAlignmentStartDate ||
        request.requestedEndDate !== request.groupAlignmentEndDate
      ) {
        throw createError(409, "group_alignment_mismatch", "The requested fiscal year does not align with the required group fiscal year.");
      }
    }

    const approvedRequest = replaceFiscalYearChangeRequest(state, request.changeRequestId, {
      status: "approved",
      approvedBy: resolvedActorId,
      approvedAt: nowIso(clock),
      updatedAt: nowIso(clock)
    });
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      action: "fiscal_year.change_request_approved",
      entityType: "fiscal_year_change_request",
      entityId: approvedRequest.changeRequestId,
      explanation: `Approved fiscal-year change request for ${approvedRequest.requestedStartDate} to ${approvedRequest.requestedEndDate}.`
    });
    return copy(approvedRequest);
  }

  function createFiscalYear({
    companyId,
    fiscalYearProfileId = null,
    startDate,
    endDate,
    approvalBasisCode,
    changeRequestId = null,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const profile =
      normalizeOptionalText(fiscalYearProfileId) == null
        ? requireLatestFiscalYearProfile(state, resolvedCompanyId)
        : requireFiscalYearProfile(state, resolvedCompanyId, fiscalYearProfileId);
    const resolvedStartDate = normalizeMonthBoundaryStartDate(startDate, "start_date_invalid");
    const resolvedEndDate = normalizeMonthBoundaryEndDate(endDate, "end_date_invalid");
    const rulePack = resolveFiscalYearRulePack(resolvedStartDate);
    const yearKind = resolveFiscalYearKind(resolvedStartDate, resolvedEndDate);
    const resolvedApprovalBasisCode = normalizeCode(approvalBasisCode, "approval_basis_code_required");
    const linkedChangeRequestId = normalizeOptionalText(changeRequestId);
    const linkedChangeRequest =
      linkedChangeRequestId == null ? null : requireFiscalYearChangeRequest(state, resolvedCompanyId, linkedChangeRequestId);

    assertFiscalYearAllowedForProfile({
      profile,
      startDate: resolvedStartDate,
      endDate: resolvedEndDate,
      yearKind
    });
    assertNoFiscalYearOverlap(state, resolvedCompanyId, resolvedStartDate, resolvedEndDate);
    if (["SHORT", "EXTENDED"].includes(yearKind) && !["BOOKKEEPING_ENTRY", "BOOKKEEPING_EXIT", "YEAR_CHANGE"].includes(resolvedApprovalBasisCode)) {
      throw createError(409, "fiscal_year_length_basis_invalid", "Short and extended fiscal years require a valid onboarding, exit or year-change basis.");
    }
    if (linkedChangeRequest) {
      if (linkedChangeRequest.status !== "approved") {
        throw createError(409, "fiscal_year_change_request_not_approved", "The linked fiscal-year change request must be approved.");
      }
      if (linkedChangeRequest.requestedStartDate !== resolvedStartDate || linkedChangeRequest.requestedEndDate !== resolvedEndDate) {
        throw createError(409, "fiscal_year_change_request_mismatch", "The linked change request does not match the requested fiscal year.");
      }
    }

    const priorFiscalYear = latestNonPlannedFiscalYear(state, resolvedCompanyId);
    const fiscalYear = Object.freeze({
      fiscalYearId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      fiscalYearProfileId: profile.fiscalYearProfileId,
      startDate: resolvedStartDate,
      endDate: resolvedEndDate,
      rulepackId: rulePack.rulePackId,
      rulepackCode: rulePack.rulePackCode,
      rulepackVersion: rulePack.version,
      rulepackChecksum: rulePack.checksum,
      yearKind,
      approvalBasisCode: resolvedApprovalBasisCode,
      changeRequestId: linkedChangeRequestId,
      status: "planned",
      priorFiscalYearId: priorFiscalYear?.fiscalYearId || null,
      nextFiscalYearId: null,
      periodsGeneratedAt: null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    });

    state.fiscalYears.set(fiscalYear.fiscalYearId, fiscalYear);
    appendToIndex(state.fiscalYearIdsByCompany, resolvedCompanyId, fiscalYear.fiscalYearId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: fiscalYear.createdByActorId,
      action: "fiscal_year.created",
      entityType: "fiscal_year",
      entityId: fiscalYear.fiscalYearId,
      explanation: `Created planned ${yearKind} fiscal year ${resolvedStartDate} to ${resolvedEndDate}.`
    });
    return copy(fiscalYear);
  }

  function listFiscalYears({ companyId, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = normalizeOptionalStatus(status, FISCAL_YEAR_STATUSES, "fiscal_year_status_invalid");
    return listFiscalYearsByCompany(state, resolvedCompanyId)
      .filter((fiscalYear) => (resolvedStatus ? fiscalYear.status === resolvedStatus : true))
      .map((fiscalYear) => presentFiscalYear(state, fiscalYear));
  }

  function getFiscalYear({ companyId, fiscalYearId } = {}) {
    const fiscalYear = requireFiscalYear(state, companyId, fiscalYearId);
    return presentFiscalYear(state, fiscalYear);
  }

  function activateFiscalYear({ companyId, fiscalYearId, actorId = "system" } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const fiscalYear = requireFiscalYear(state, resolvedCompanyId, fiscalYearId);
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const today = currentDate(clock);

    if (fiscalYear.status !== "planned") {
      throw createError(409, "fiscal_year_not_planned", "Only planned fiscal years can be activated.");
    }
    if (fiscalYear.startDate > today) {
      throw createError(409, "fiscal_year_activation_too_early", "A fiscal year cannot be activated before its start date.");
    }

    const activeFiscalYears = listFiscalYearsByCompany(state, resolvedCompanyId).filter((candidate) => candidate.status === "active");
    if (activeFiscalYears.length > 1) {
      throw createError(409, "fiscal_year_overlap_detected", "More than one active fiscal year already exists for the company.");
    }

    for (const activeFiscalYear of activeFiscalYears) {
      if (activeFiscalYear.fiscalYearId === fiscalYear.fiscalYearId) {
        continue;
      }
      if (fiscalYear.startDate <= activeFiscalYear.startDate) {
        throw createError(409, "fiscal_year_activation_conflict", "The new fiscal year must start after the currently active fiscal year.");
      }
      replaceFiscalYear(state, activeFiscalYear.fiscalYearId, {
        status: "historical",
        nextFiscalYearId: fiscalYear.fiscalYearId,
        updatedAt: nowIso(clock)
      });
    }

    generatePeriods({ companyId: resolvedCompanyId, fiscalYearId: fiscalYear.fiscalYearId, actorId: resolvedActorId });
    const activatedFiscalYear = replaceFiscalYear(state, fiscalYear.fiscalYearId, {
      status: "active",
      updatedAt: nowIso(clock)
    });

    if (activatedFiscalYear.changeRequestId) {
      const request = requireFiscalYearChangeRequest(state, resolvedCompanyId, activatedFiscalYear.changeRequestId);
      replaceFiscalYearChangeRequest(state, request.changeRequestId, {
        status: "implemented",
        implementedAt: nowIso(clock),
        updatedAt: nowIso(clock)
      });
    }

    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      action: "fiscal_year.activated",
      entityType: "fiscal_year",
      entityId: activatedFiscalYear.fiscalYearId,
      explanation: `Activated fiscal year ${activatedFiscalYear.startDate} to ${activatedFiscalYear.endDate}.`
    });
    return presentFiscalYear(state, activatedFiscalYear);
  }

  function generatePeriods({ companyId, fiscalYearId, actorId = "system" } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const fiscalYear = requireFiscalYear(state, resolvedCompanyId, fiscalYearId);
    const existingPeriods = listPeriodsForFiscalYear(state, fiscalYear.fiscalYearId);
    if (existingPeriods.length > 0) {
      return copy(existingPeriods);
    }

    const generatedPeriods = [];
    let cursorDate = fiscalYear.startDate;
    let index = 1;
    while (cursorDate <= fiscalYear.endDate) {
      const periodStartDate = cursorDate;
      const periodEndDate = lastDayOfMonth(cursorDate);
      const period = Object.freeze({
        periodId: crypto.randomUUID(),
        fiscalYearId: fiscalYear.fiscalYearId,
        companyId: resolvedCompanyId,
        periodCode: `${periodStartDate.slice(0, 4)}${periodStartDate.slice(5, 7)}`,
        ordinal: index,
        startDate: periodStartDate,
        endDate: periodEndDate,
        lockState: "open",
        closeState: "open",
        createdAt: nowIso(clock),
        updatedAt: nowIso(clock)
      });
      state.periods.set(period.periodId, period);
      appendToIndex(state.periodIdsByFiscalYear, fiscalYear.fiscalYearId, period.periodId);
      generatedPeriods.push(period);
      cursorDate = firstDayOfNextMonth(periodStartDate);
      index += 1;
    }

    replaceFiscalYear(state, fiscalYear.fiscalYearId, {
      periodsGeneratedAt: nowIso(clock),
      updatedAt: nowIso(clock)
    });
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: requireText(actorId, "actor_id_required"),
      action: "fiscal_year.periods_generated",
      entityType: "fiscal_year",
      entityId: fiscalYear.fiscalYearId,
      explanation: `Generated ${generatedPeriods.length} fiscal periods for ${fiscalYear.startDate} to ${fiscalYear.endDate}.`
    });
    return copy(generatedPeriods);
  }

  function getActiveFiscalYearForDate({ companyId, accountingDate } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedAccountingDate = normalizeDate(accountingDate, "accounting_date_invalid");
    const matchingFiscalYears = listFiscalYearsByCompany(state, resolvedCompanyId).filter((fiscalYear) =>
      fiscalYear.status !== "planned" && coversDate(fiscalYear.startDate, addOneDay(fiscalYear.endDate), resolvedAccountingDate)
    );

    if (matchingFiscalYears.length === 0) {
      throw createError(404, "active_fiscal_year_not_found", "No active fiscal year covers the requested date.");
    }
    if (matchingFiscalYears.length > 1) {
      throw createError(409, "active_fiscal_year_ambiguous", "More than one fiscal year covers the requested date.");
    }
    return presentFiscalYear(state, matchingFiscalYears[0]);
  }

  function getPeriodForDate({ companyId, accountingDate } = {}) {
    const activeFiscalYear = getActiveFiscalYearForDate({ companyId, accountingDate });
    const period = listPeriodsForFiscalYear(state, activeFiscalYear.fiscalYearId).find((candidate) =>
      coversDate(candidate.startDate, addOneDay(candidate.endDate), accountingDate)
    );
    if (!period) {
      throw createError(404, "fiscal_period_not_found", "No fiscal period covers the requested date.");
    }
    return copy(period);
  }

  function reopenPeriod({ companyId, periodId, actorId = "system", reasonCode } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const period = requireFiscalPeriod(state, resolvedCompanyId, periodId);
    const reopenedPeriod = replacePeriod(state, period.periodId, {
      lockState: "reopened",
      closeState: "open",
      updatedAt: nowIso(clock),
      reopenReasonCode: normalizeCode(reasonCode, "reopen_reason_code_required")
    });
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: requireText(actorId, "actor_id_required"),
      action: "fiscal_year.period_reopened",
      entityType: "fiscal_period",
      entityId: reopenedPeriod.periodId,
      explanation: `Reopened fiscal period ${reopenedPeriod.periodCode}.`
    });
    return copy(reopenedPeriod);
  }

  function getFiscalYearHistory({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return copy({
      profiles: listFiscalYearProfiles({ companyId: resolvedCompanyId }),
      fiscalYears: listFiscalYears({ companyId: resolvedCompanyId }),
      changeRequests: listFiscalYearChangeRequests({ companyId: resolvedCompanyId })
    });
  }

  function listFiscalYearAuditEvents({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return state.auditEvents.filter((event) => event.companyId === resolvedCompanyId).map(copy);
  }

  function resolveFiscalYearRulePack(effectiveDate) {
    return rules.resolveRulePack({
      rulePackCode: FISCAL_YEAR_RULEPACK_CODE,
      domain: "fiscal_year",
      jurisdiction: "SE",
      effectiveDate
    });
  }
}

function seedDemoCompany(state, clock, rulePack) {
  const profile = Object.freeze({
    fiscalYearProfileId: crypto.randomUUID(),
    companyId: DEMO_COMPANY_ID,
    legalFormCode: "AKTIEBOLAG",
    ownerTaxationCode: "LEGAL_PERSON_ONLY",
    mustUseCalendarYear: false,
    groupAlignmentRequired: false,
    rulepackId: rulePack.rulePackId,
    rulepackCode: rulePack.rulePackCode,
    rulepackVersion: rulePack.version,
    rulepackChecksum: rulePack.checksum,
    createdByActorId: "seed",
    createdAt: nowIso(clock),
    updatedAt: nowIso(clock)
  });
  state.profiles.set(profile.fiscalYearProfileId, profile);
  appendToIndex(state.profileIdsByCompany, DEMO_COMPANY_ID, profile.fiscalYearProfileId);

  const fiscalYear = Object.freeze({
    fiscalYearId: crypto.randomUUID(),
    companyId: DEMO_COMPANY_ID,
    fiscalYearProfileId: profile.fiscalYearProfileId,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    rulepackId: rulePack.rulePackId,
    rulepackCode: rulePack.rulePackCode,
    rulepackVersion: rulePack.version,
    rulepackChecksum: rulePack.checksum,
    yearKind: "CALENDAR",
    approvalBasisCode: "BASELINE",
    changeRequestId: null,
    status: "active",
    priorFiscalYearId: null,
    nextFiscalYearId: null,
    periodsGeneratedAt: nowIso(clock),
    createdByActorId: "seed",
    createdAt: nowIso(clock),
    updatedAt: nowIso(clock)
  });
  state.fiscalYears.set(fiscalYear.fiscalYearId, fiscalYear);
  appendToIndex(state.fiscalYearIdsByCompany, DEMO_COMPANY_ID, fiscalYear.fiscalYearId);
  storeGeneratedPeriods(state, clock, fiscalYear);
}

function mustUseCalendarYear({ legalFormCode, ownerTaxationCode }) {
  if (LEGAL_FORM_CODES_REQUIRING_CALENDAR_YEAR.includes(legalFormCode)) {
    return true;
  }
  if (["HANDELSBOLAG", "KOMMANDITBOLAG"].includes(legalFormCode) && ownerTaxationCode === "PHYSICAL_PERSON_PARTICIPANT") {
    return true;
  }
  return false;
}

function resolveFiscalYearKind(startDate, endDate) {
  if (endDate < startDate) {
    throw createError(400, "fiscal_year_interval_invalid", "endDate must not be earlier than startDate.");
  }
  const months = calendarMonthSpan(startDate, endDate);
  if (months > 18) {
    throw createError(409, "fiscal_year_too_long", "An extended fiscal year must not exceed 18 calendar months.");
  }
  if (months === 12) {
    if (startDate.slice(5, 10) === "01-01" && endDate.slice(5, 10) === "12-31") {
      return "CALENDAR";
    }
    return "BROKEN";
  }
  if (months < 12) {
    return "SHORT";
  }
  return "EXTENDED";
}

function assertFiscalYearAllowedForProfile({ profile, startDate, endDate, yearKind }) {
  if (profile.mustUseCalendarYear && (startDate.slice(5, 10) !== "01-01" || endDate.slice(5, 10) !== "12-31")) {
    throw createError(409, "calendar_year_required", "The fiscal-year profile requires calendar-year accounting.");
  }
  if (profile.mustUseCalendarYear && yearKind !== "CALENDAR") {
    throw createError(409, "calendar_year_required", "The fiscal-year profile requires a calendar year.");
  }
}

function requiresTaxAgencyPermission({ currentFiscalYear, requestedYearKind, reasonCode }) {
  if (!currentFiscalYear) {
    return false;
  }
  const resolvedReasonCode = normalizeCode(reasonCode, "reason_code_required");
  if (currentFiscalYear.yearKind === "BROKEN" && requestedYearKind === "CALENDAR") {
    return false;
  }
  if (resolvedReasonCode === "GROUP_ALIGNMENT") {
    return false;
  }
  return true;
}

function assertNoFiscalYearOverlap(state, companyId, startDate, endDate) {
  const overlappingFiscalYear = listFiscalYearsByCompany(state, companyId).find((fiscalYear) =>
    intervalsOverlap(fiscalYear.startDate, addOneDay(fiscalYear.endDate), startDate, addOneDay(endDate))
  );
  if (overlappingFiscalYear) {
    throw createError(409, "fiscal_year_overlap", "A fiscal year already overlaps the requested interval.");
  }
}

function listFiscalYearsByCompany(state, companyId) {
  return (state.fiscalYearIdsByCompany.get(companyId) || [])
    .map((fiscalYearId) => state.fiscalYears.get(fiscalYearId))
    .filter(Boolean)
    .sort((left, right) => left.startDate.localeCompare(right.startDate) || left.createdAt.localeCompare(right.createdAt));
}

function listPeriodsForFiscalYear(state, fiscalYearId) {
  return (state.periodIdsByFiscalYear.get(fiscalYearId) || [])
    .map((periodId) => state.periods.get(periodId))
    .filter(Boolean)
    .sort((left, right) => left.startDate.localeCompare(right.startDate));
}

function latestNonPlannedFiscalYear(state, companyId) {
  return [...listFiscalYearsByCompany(state, companyId)].reverse().find((fiscalYear) => fiscalYear.status !== "planned") || null;
}

function requireLatestFiscalYearProfile(state, companyId) {
  const profiles = (state.profileIdsByCompany.get(companyId) || []).map((profileId) => state.profiles.get(profileId)).filter(Boolean);
  if (profiles.length === 0) {
    throw createError(404, "fiscal_year_profile_not_found", "No fiscal-year profile was found for the company.");
  }
  return profiles.at(-1);
}

function requireFiscalYearProfile(state, companyId, fiscalYearProfileId) {
  const profile = state.profiles.get(requireText(fiscalYearProfileId, "fiscal_year_profile_id_required"));
  if (!profile || profile.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "fiscal_year_profile_not_found", "Fiscal-year profile was not found.");
  }
  return profile;
}

function requireFiscalYearChangeRequest(state, companyId, changeRequestId) {
  const request = state.changeRequests.get(requireText(changeRequestId, "fiscal_year_change_request_id_required"));
  if (!request || request.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "fiscal_year_change_request_not_found", "Fiscal-year change request was not found.");
  }
  return request;
}

function requireFiscalYear(state, companyId, fiscalYearId) {
  const fiscalYear = state.fiscalYears.get(requireText(fiscalYearId, "fiscal_year_id_required"));
  if (!fiscalYear || fiscalYear.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "fiscal_year_not_found", "Fiscal year was not found.");
  }
  return fiscalYear;
}

function requireFiscalPeriod(state, companyId, periodId) {
  const period = state.periods.get(requireText(periodId, "period_id_required"));
  if (!period || period.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "fiscal_period_not_found", "Fiscal period was not found.");
  }
  return period;
}

function replaceFiscalYear(state, fiscalYearId, updates) {
  const existing = state.fiscalYears.get(fiscalYearId);
  const next = Object.freeze({
    ...existing,
    ...copy(updates)
  });
  state.fiscalYears.set(fiscalYearId, next);
  return next;
}

function replaceFiscalYearChangeRequest(state, changeRequestId, updates) {
  const existing = state.changeRequests.get(changeRequestId);
  const next = Object.freeze({
    ...existing,
    ...copy(updates)
  });
  state.changeRequests.set(changeRequestId, next);
  return next;
}

function replacePeriod(state, periodId, updates) {
  const existing = state.periods.get(periodId);
  const next = Object.freeze({
    ...existing,
    ...copy(updates)
  });
  state.periods.set(periodId, next);
  return next;
}

function presentFiscalYear(state, fiscalYear) {
  return copy({
    ...fiscalYear,
    periods: listPeriodsForFiscalYear(state, fiscalYear.fiscalYearId)
  });
}

function storeGeneratedPeriods(state, clock, fiscalYear) {
  let cursorDate = fiscalYear.startDate;
  let index = 1;
  while (cursorDate <= fiscalYear.endDate) {
    const periodStartDate = cursorDate;
    const periodEndDate = lastDayOfMonth(cursorDate);
    const period = Object.freeze({
      periodId: crypto.randomUUID(),
      fiscalYearId: fiscalYear.fiscalYearId,
      companyId: fiscalYear.companyId,
      periodCode: `${periodStartDate.slice(0, 4)}${periodStartDate.slice(5, 7)}`,
      ordinal: index,
      startDate: periodStartDate,
      endDate: periodEndDate,
      lockState: "open",
      closeState: "open",
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    });
    state.periods.set(period.periodId, period);
    appendToIndex(state.periodIdsByFiscalYear, fiscalYear.fiscalYearId, period.periodId);
    cursorDate = firstDayOfNextMonth(periodStartDate);
    index += 1;
  }
}

function calendarMonthSpan(startDate, endDate) {
  const startYear = Number(startDate.slice(0, 4));
  const startMonth = Number(startDate.slice(5, 7));
  const endYear = Number(endDate.slice(0, 4));
  const endMonth = Number(endDate.slice(5, 7));
  return (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
}

function normalizeMonthBoundaryStartDate(value, code) {
  const resolved = normalizeDate(value, code);
  if (!resolved.endsWith("-01")) {
    throw createError(409, code, "Fiscal-year start dates must fall on the first day of a calendar month.");
  }
  return resolved;
}

function normalizeMonthBoundaryEndDate(value, code) {
  const resolved = normalizeDate(value, code);
  if (resolved !== lastDayOfMonth(resolved)) {
    throw createError(409, code, "Fiscal-year end dates must fall on the last day of a calendar month.");
  }
  return resolved;
}

function lastDayOfMonth(dateValue) {
  const year = Number(dateValue.slice(0, 4));
  const month = Number(dateValue.slice(5, 7));
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function firstDayOfNextMonth(dateValue) {
  const year = Number(dateValue.slice(0, 4));
  const month = Number(dateValue.slice(5, 7));
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

function addOneDay(dateValue) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function coversDate(startDate, endDate, candidateDate) {
  return startDate <= candidateDate && candidateDate < endDate;
}

function intervalsOverlap(leftStart, leftEndExclusive, rightStart, rightEndExclusive) {
  return leftStart < rightEndExclusive && rightStart < leftEndExclusive;
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
      auditClass: "fiscal_year_action",
      event
    })
  );
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

function normalizeOptionalStatus(value, allowedValues, code) {
  if (value == null || value === "") {
    return null;
  }
  return assertAllowed(normalizeCode(value, code), allowedValues, code);
}

function normalizeCode(value, code) {
  return requireText(String(value || ""), code)
    .replaceAll(/[^A-Za-z0-9_]+/g, "_")
    .replaceAll(/_+/g, "_")
    .replace(/^_/, "")
    .replace(/_$/, "")
    .toUpperCase();
}

function normalizeOptionalText(value) {
  if (value == null) {
    return null;
  }
  const resolved = String(value).trim();
  return resolved.length > 0 ? resolved : null;
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

function copy(value) {
  return value == null ? value : structuredClone(value);
}

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
