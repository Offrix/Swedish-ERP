import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";

export const ID06_COMPANY_VERIFICATION_STATUSES = Object.freeze(["requested", "verified", "failed", "expired"]);
export const ID06_PERSON_VERIFICATION_STATUSES = Object.freeze(["requested", "verified", "failed", "expired"]);
export const ID06_CARD_LIFECYCLE_STATUSES = Object.freeze(["unknown", "active", "inactive", "blocked", "expired"]);
export const ID06_WORKPLACE_BINDING_STATUSES = Object.freeze(["pending", "active", "suspended", "revoked"]);
export const ID06_WORK_PASS_STATUSES = Object.freeze(["issued", "suspended", "revoked", "expired"]);

export function createId06Platform(options = {}) {
  return createId06Engine(options);
}

export function createId06Engine({
  clock = () => new Date(),
  personalliggarePlatform = null
} = {}) {
  const state = {
    companyVerifications: new Map(),
    personVerifications: new Map(),
    employerLinks: new Map(),
    cardStatuses: new Map(),
    workplaceBindings: new Map(),
    workPasses: new Map(),
    attendanceMirrors: new Map(),
    evidenceBundles: new Map(),
    auditEvents: []
  };

  const engine = {
    companyVerificationStatuses: ID06_COMPANY_VERIFICATION_STATUSES,
    personVerificationStatuses: ID06_PERSON_VERIFICATION_STATUSES,
    cardLifecycleStatuses: ID06_CARD_LIFECYCLE_STATUSES,
    workplaceBindingStatuses: ID06_WORKPLACE_BINDING_STATUSES,
    workPassStatuses: ID06_WORK_PASS_STATUSES,
    verifyCompany,
    listCompanyVerifications,
    verifyPerson,
    listPersonVerifications,
    validateCard,
    listCardStatuses,
    createWorkplaceBinding,
    listWorkplaceBindings,
    listWorkPasses,
    exportWorkplaceEvidence,
    listEvidenceBundles,
    listAttendanceMirrors,
    listAuditEvents
  };

  Object.defineProperty(engine, "__durableState", {
    value: state,
    enumerable: false
  });

  return engine;

  function verifyCompany({
    companyId,
    orgNo,
    companyName,
    externalCompanyRef = null,
    providerCode = "id06",
    status = "verified",
    effectiveFrom = null,
    effectiveTo = null,
    verifiedAt = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedOrgNo = requireText(orgNo, "id06_company_org_required");
    const existing = findCompanyVerificationByOrgNo(resolvedCompanyId, resolvedOrgNo);
    const record = existing || {
      id06CompanyVerificationId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      orgNo: resolvedOrgNo,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    record.companyName = requireText(companyName, "id06_company_name_required");
    record.externalCompanyRef = optionalText(externalCompanyRef);
    record.providerCode = requireText(providerCode, "id06_provider_code_required");
    record.status = requireEnum(ID06_COMPANY_VERIFICATION_STATUSES, status, "id06_company_verification_status_invalid");
    record.effectiveFrom = normalizeOptionalDate(effectiveFrom, "id06_company_effective_from_invalid");
    record.effectiveTo = normalizeOptionalDate(effectiveTo, "id06_company_effective_to_invalid");
    record.verifiedAt = normalizeOptionalTimestamp(verifiedAt, "id06_company_verified_at_invalid") || nowIso(clock);
    record.updatedAt = nowIso(clock);
    state.companyVerifications.set(record.id06CompanyVerificationId, record);
    appendAuditEvent({
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "id06.company.verified",
      entityType: "id06_company_verification",
      entityId: record.id06CompanyVerificationId,
      explanation: `Verified company ${record.orgNo} for ID06 use.`
    });
    return copy(record);
  }

  function listCompanyVerifications({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return [...state.companyVerifications.values()]
      .filter((record) => record.companyId === resolvedCompanyId)
      .sort((left, right) => left.orgNo.localeCompare(right.orgNo))
      .map(copy);
  }

  function verifyPerson({
    companyId,
    employmentId = null,
    workerIdentityType = "personnummer",
    workerIdentityValue,
    fullNameSnapshot,
    externalPersonRef = null,
    providerCode = "id06",
    status = "verified",
    effectiveFrom = null,
    effectiveTo = null,
    verifiedAt = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedIdentityType = requireText(workerIdentityType, "id06_person_identity_type_required");
    const resolvedIdentityValue = requireText(workerIdentityValue, "id06_person_identity_value_required");
    const existing = findPersonVerification(resolvedCompanyId, resolvedIdentityType, resolvedIdentityValue);
    const record = existing || {
      id06PersonVerificationId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      workerIdentityType: resolvedIdentityType,
      workerIdentityValue: resolvedIdentityValue,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    record.employmentId = optionalText(employmentId);
    record.fullNameSnapshot = requireText(fullNameSnapshot, "id06_person_name_required");
    record.externalPersonRef = optionalText(externalPersonRef);
    record.providerCode = requireText(providerCode, "id06_provider_code_required");
    record.status = requireEnum(ID06_PERSON_VERIFICATION_STATUSES, status, "id06_person_verification_status_invalid");
    record.effectiveFrom = normalizeOptionalDate(effectiveFrom, "id06_person_effective_from_invalid");
    record.effectiveTo = normalizeOptionalDate(effectiveTo, "id06_person_effective_to_invalid");
    record.verifiedAt = normalizeOptionalTimestamp(verifiedAt, "id06_person_verified_at_invalid") || nowIso(clock);
    record.updatedAt = nowIso(clock);
    state.personVerifications.set(record.id06PersonVerificationId, record);
    appendAuditEvent({
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "id06.person.verified",
      entityType: "id06_person_verification",
      entityId: record.id06PersonVerificationId,
      explanation: `Verified person ${resolvedIdentityValue} for ID06 use.`
    });
    return copy(record);
  }

  function listPersonVerifications({ companyId, workerIdentityValue = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const identityFilter = optionalText(workerIdentityValue);
    return [...state.personVerifications.values()]
      .filter((record) => record.companyId === resolvedCompanyId)
      .filter((record) => (identityFilter ? record.workerIdentityValue === identityFilter : true))
      .sort((left, right) => left.workerIdentityValue.localeCompare(right.workerIdentityValue))
      .map(copy);
  }

  function validateCard({
    companyId,
    employerOrgNo,
    workerIdentityType = "personnummer",
    workerIdentityValue,
    cardReference,
    maskedCardNumber = null,
    providerCode = "id06",
    status = "active",
    validFrom = null,
    validTo = null,
    validatedAt = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const companyVerification = requireVerifiedCompany(resolvedCompanyId, employerOrgNo);
    const personVerification = requireVerifiedPerson(resolvedCompanyId, workerIdentityType, workerIdentityValue);
    const employerLink = getOrCreateEmployerLink({
      companyId: resolvedCompanyId,
      employerOrgNo: companyVerification.orgNo,
      personVerification,
      companyVerification,
      actorId
    });
    const resolvedCardReference = requireText(cardReference, "id06_card_reference_required");
    const existing = findCardStatus(resolvedCompanyId, resolvedCardReference);
    const record = existing || {
      id06CardStatusId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      cardReference: resolvedCardReference,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    record.employerOrgNo = companyVerification.orgNo;
    record.workerIdentityType = personVerification.workerIdentityType;
    record.workerIdentityValue = personVerification.workerIdentityValue;
    record.maskedCardNumber = optionalText(maskedCardNumber);
    record.providerCode = requireText(providerCode, "id06_provider_code_required");
    record.status = requireEnum(ID06_CARD_LIFECYCLE_STATUSES, status, "id06_card_status_invalid");
    record.validFrom = normalizeOptionalDate(validFrom, "id06_card_valid_from_invalid");
    record.validTo = normalizeOptionalDate(validTo, "id06_card_valid_to_invalid");
    record.validatedAt = normalizeOptionalTimestamp(validatedAt, "id06_card_validated_at_invalid") || nowIso(clock);
    record.id06EmployerLinkId = employerLink.id06EmployerLinkId;
    record.updatedAt = nowIso(clock);
    state.cardStatuses.set(record.id06CardStatusId, record);
    appendAuditEvent({
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "id06.card.validated",
      entityType: "id06_card_status",
      entityId: record.id06CardStatusId,
      explanation: `Validated ID06 card ${resolvedCardReference} for ${record.workerIdentityValue}.`
    });
    return copy(record);
  }

  function listCardStatuses({ companyId, workerIdentityValue = null, workplaceId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const identityFilter = optionalText(workerIdentityValue);
    const workplaceFilter = optionalText(workplaceId);
    const bindingIdsForWorkplace = workplaceFilter
      ? new Set(
          [...state.workplaceBindings.values()]
            .filter((binding) => binding.companyId === resolvedCompanyId && binding.workplaceId === workplaceFilter)
            .map((binding) => binding.id06CardStatusId)
        )
      : null;
    return [...state.cardStatuses.values()]
      .filter((record) => record.companyId === resolvedCompanyId)
      .filter((record) => (identityFilter ? record.workerIdentityValue === identityFilter : true))
      .filter((record) => (bindingIdsForWorkplace ? bindingIdsForWorkplace.has(record.id06CardStatusId) : true))
      .sort((left, right) => left.workerIdentityValue.localeCompare(right.workerIdentityValue))
      .map(copy);
  }

  function createWorkplaceBinding({
    companyId,
    workplaceId,
    employerOrgNo,
    workerIdentityType = "personnummer",
    workerIdentityValue,
    cardReference,
    effectiveFrom = null,
    effectiveTo = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const workplace = requireWorkplace(resolvedCompanyId, workplaceId);
    const companyVerification = requireVerifiedCompany(resolvedCompanyId, employerOrgNo);
    const personVerification = requireVerifiedPerson(resolvedCompanyId, workerIdentityType, workerIdentityValue);
    const cardStatus = requireActiveCardStatus({
      companyId: resolvedCompanyId,
      cardReference,
      employerOrgNo: companyVerification.orgNo,
      workerIdentityValue: personVerification.workerIdentityValue
    });
    const existing = [...state.workplaceBindings.values()].find(
      (binding) =>
        binding.companyId === resolvedCompanyId &&
        binding.workplaceId === workplace.workplaceId &&
        binding.workerIdentityValue === personVerification.workerIdentityValue &&
        binding.employerOrgNo === companyVerification.orgNo &&
        binding.id06CardStatusId === cardStatus.id06CardStatusId &&
        binding.status === "active"
    );
    if (existing) {
      return copy(existing);
    }
    const record = {
      id06WorkplaceBindingId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      workplaceId: workplace.workplaceId,
      workplaceIdentifier: workplace.workplaceIdentifier,
      constructionSiteId: workplace.constructionSiteId,
      employerOrgNo: companyVerification.orgNo,
      workerIdentityType: personVerification.workerIdentityType,
      workerIdentityValue: personVerification.workerIdentityValue,
      id06CardStatusId: cardStatus.id06CardStatusId,
      status: "active",
      effectiveFrom: normalizeOptionalDate(effectiveFrom, "id06_binding_effective_from_invalid") || todayIso(clock),
      effectiveTo: normalizeOptionalDate(effectiveTo, "id06_binding_effective_to_invalid"),
      activatedAt: nowIso(clock),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.workplaceBindings.set(record.id06WorkplaceBindingId, record);
    const workPass = issueWorkPass({
      companyId: resolvedCompanyId,
      workplaceId: workplace.workplaceId,
      binding: record,
      actorId
    });
    appendAuditEvent({
      companyId: resolvedCompanyId,
      workplaceId: workplace.workplaceId,
      actorId,
      correlationId,
      action: "id06.binding.activated",
      entityType: "id06_workplace_binding",
      entityId: record.id06WorkplaceBindingId,
      explanation: `Activated ID06 workplace binding and issued work pass ${workPass.workPassCode}.`
    });
    return copy(record);
  }

  function listWorkplaceBindings({ companyId, workplaceId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedWorkplaceId = requireText(workplaceId, "id06_workplace_id_required");
    return [...state.workplaceBindings.values()]
      .filter((record) => record.companyId === resolvedCompanyId && record.workplaceId === resolvedWorkplaceId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function listWorkPasses({ companyId, workplaceId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedWorkplaceId = requireText(workplaceId, "id06_workplace_id_required");
    return [...state.workPasses.values()]
      .filter((record) => record.companyId === resolvedCompanyId && record.workplaceId === resolvedWorkplaceId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function exportWorkplaceEvidence({
    companyId,
    workplaceId,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const workplace = requireWorkplace(resolvedCompanyId, workplaceId);
    const bindings = listWorkplaceBindings({ companyId: resolvedCompanyId, workplaceId: workplace.workplaceId }).filter(
      (record) => record.status === "active"
    );
    const workPasses = listWorkPasses({ companyId: resolvedCompanyId, workplaceId: workplace.workplaceId }).filter(
      (record) => record.status === "issued"
    );
    const attendanceMirrors = refreshAttendanceMirrorsForWorkplace({
      companyId: resolvedCompanyId,
      workplaceId: workplace.workplaceId
    });
    const record = {
      id06EvidenceBundleId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      workplaceId: workplace.workplaceId,
      workplaceIdentifier: workplace.workplaceIdentifier,
      bindingCount: bindings.length,
      workPassCount: workPasses.length,
      attendanceMirrorCount: attendanceMirrors.length,
      evidenceHash: hashObject({
        workplaceId: workplace.workplaceId,
        bindings: bindings.map((binding) => ({
          id06WorkplaceBindingId: binding.id06WorkplaceBindingId,
          workerIdentityValue: binding.workerIdentityValue,
          employerOrgNo: binding.employerOrgNo,
          id06CardStatusId: binding.id06CardStatusId
        })),
        workPasses: workPasses.map((workPass) => ({
          id06WorkPassId: workPass.id06WorkPassId,
          workPassCode: workPass.workPassCode,
          id06WorkplaceBindingId: workPass.id06WorkplaceBindingId
        })),
        attendanceMirrors: attendanceMirrors.map((mirror) => ({
          attendanceEventId: mirror.attendanceEventId,
          workerIdentityValue: mirror.workerIdentityValue,
          id06WorkplaceBindingId: mirror.id06WorkplaceBindingId
        }))
      }),
      exportedAt: nowIso(clock),
      createdByActorId: requireText(actorId, "actor_id_required")
    };
    state.evidenceBundles.set(record.id06EvidenceBundleId, record);
    appendAuditEvent({
      companyId: resolvedCompanyId,
      workplaceId: workplace.workplaceId,
      actorId,
      correlationId,
      action: "id06.export.created",
      entityType: "id06_evidence_bundle",
      entityId: record.id06EvidenceBundleId,
      explanation: `Exported immutable ID06 evidence bundle for workplace ${workplace.workplaceIdentifier}.`
    });
    return copy(record);
  }

  function listEvidenceBundles({ companyId, workplaceId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const workplaceFilter = optionalText(workplaceId);
    return [...state.evidenceBundles.values()]
      .filter((record) => record.companyId === resolvedCompanyId)
      .filter((record) => (workplaceFilter ? record.workplaceId === workplaceFilter : true))
      .sort((left, right) => left.exportedAt.localeCompare(right.exportedAt))
      .map(copy);
  }

  function listAttendanceMirrors({ companyId, workplaceId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedWorkplaceId = requireText(workplaceId, "id06_workplace_id_required");
    return [...state.attendanceMirrors.values()]
      .filter((record) => record.companyId === resolvedCompanyId && record.workplaceId === resolvedWorkplaceId)
      .sort((left, right) => left.mirroredAt.localeCompare(right.mirroredAt))
      .map(copy);
  }

  function listAuditEvents({ companyId, workplaceId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const workplaceFilter = optionalText(workplaceId);
    return state.auditEvents
      .filter((record) => record.companyId === resolvedCompanyId)
      .filter((record) => (workplaceFilter ? record.workplaceId === workplaceFilter : true))
      .map(copy);
  }

  function issueWorkPass({ companyId, workplaceId, binding, actorId }) {
    const record = {
      id06WorkPassId: crypto.randomUUID(),
      companyId,
      workplaceId,
      id06WorkplaceBindingId: binding.id06WorkplaceBindingId,
      workPassCode: `WP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      status: "issued",
      issuedAt: nowIso(clock),
      validFrom: binding.effectiveFrom,
      validTo: binding.effectiveTo,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.workPasses.set(record.id06WorkPassId, record);
    return copy(record);
  }

  function refreshAttendanceMirrorsForWorkplace({ companyId, workplaceId }) {
    const workplace = requireWorkplace(companyId, workplaceId);
    if (!personalliggarePlatform || typeof personalliggarePlatform.listAttendanceEvents !== "function" || !workplace.constructionSiteId) {
      return [];
    }
    const bindings = [...state.workplaceBindings.values()].filter(
      (binding) => binding.companyId === companyId && binding.workplaceId === workplace.workplaceId && binding.status === "active"
    );
    const bindingsByIdentity = new Map(bindings.map((binding) => [binding.workerIdentityValue, binding]));
    const events = personalliggarePlatform.listAttendanceEvents({
      companyId,
      constructionSiteId: workplace.constructionSiteId
    });
    for (const event of events) {
      const binding = bindingsByIdentity.get(event.workerIdentityValue);
      if (!binding) {
        continue;
      }
      const existing = [...state.attendanceMirrors.values()].find(
        (mirror) => mirror.companyId === companyId && mirror.attendanceEventId === event.attendanceEventId
      );
      if (existing) {
        continue;
      }
      const mirror = {
        id06AttendanceMirrorId: crypto.randomUUID(),
        companyId,
        workplaceId: workplace.workplaceId,
        attendanceEventId: event.attendanceEventId,
        workerIdentityValue: event.workerIdentityValue,
        id06WorkplaceBindingId: binding.id06WorkplaceBindingId,
        mirroredAt: nowIso(clock)
      };
      state.attendanceMirrors.set(mirror.id06AttendanceMirrorId, mirror);
    }
    return listAttendanceMirrors({ companyId, workplaceId: workplace.workplaceId });
  }

  function getOrCreateEmployerLink({ companyId, employerOrgNo, personVerification, companyVerification, actorId }) {
    const existing = [...state.employerLinks.values()].find(
      (record) =>
        record.companyId === companyId &&
        record.employerOrgNo === employerOrgNo &&
        record.workerIdentityType === personVerification.workerIdentityType &&
        record.workerIdentityValue === personVerification.workerIdentityValue &&
        record.status === "active"
    );
    if (existing) {
      return existing;
    }
    const record = {
      id06EmployerLinkId: crypto.randomUUID(),
      companyId,
      employerOrgNo,
      workerIdentityType: personVerification.workerIdentityType,
      workerIdentityValue: personVerification.workerIdentityValue,
      id06CompanyVerificationId: companyVerification.id06CompanyVerificationId,
      id06PersonVerificationId: personVerification.id06PersonVerificationId,
      status: "active",
      effectiveFrom: personVerification.effectiveFrom,
      effectiveTo: personVerification.effectiveTo,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.employerLinks.set(record.id06EmployerLinkId, record);
    return record;
  }

  function requireVerifiedCompany(companyId, orgNo) {
    const record = findCompanyVerificationByOrgNo(companyId, requireText(orgNo, "id06_company_org_required"));
    if (!record || record.status !== "verified") {
      throw createError(409, "id06_company_verification_required", "Verified ID06 company snapshot is required.");
    }
    return record;
  }

  function requireVerifiedPerson(companyId, workerIdentityType, workerIdentityValue) {
    const record = findPersonVerification(
      companyId,
      requireText(workerIdentityType, "id06_person_identity_type_required"),
      requireText(workerIdentityValue, "id06_person_identity_value_required")
    );
    if (!record || record.status !== "verified") {
      throw createError(409, "id06_person_verification_required", "Verified ID06 person snapshot is required.");
    }
    return record;
  }

  function requireActiveCardStatus({ companyId, cardReference, employerOrgNo, workerIdentityValue }) {
    const record = findCardStatus(companyId, requireText(cardReference, "id06_card_reference_required"));
    if (!record || record.status !== "active") {
      throw createError(409, "id06_card_active_status_required", "Active ID06 card status is required.");
    }
    if (record.employerOrgNo !== employerOrgNo || record.workerIdentityValue !== workerIdentityValue) {
      throw createError(409, "id06_card_binding_mismatch", "ID06 card does not match verified employer or worker identity.");
    }
    return record;
  }

  function requireWorkplace(companyId, workplaceId) {
    const resolvedWorkplaceId = requireText(workplaceId, "id06_workplace_id_required");
    if (!personalliggarePlatform || typeof personalliggarePlatform.listConstructionSites !== "function") {
      return {
        workplaceId: resolvedWorkplaceId,
        workplaceIdentifier: resolvedWorkplaceId,
        constructionSiteId: null
      };
    }
    const site = personalliggarePlatform
      .listConstructionSites({ companyId })
      .find((candidate) => candidate.workplaceId === resolvedWorkplaceId || candidate.constructionSiteId === resolvedWorkplaceId);
    if (!site) {
      throw createError(404, "id06_workplace_not_found", "ID06 workplace must exist in personalliggare workplace registry.");
    }
    return {
      workplaceId: site.workplaceId,
      workplaceIdentifier: site.workplaceIdentifier,
      constructionSiteId: site.constructionSiteId
    };
  }

  function findCompanyVerificationByOrgNo(companyId, orgNo) {
    return [...state.companyVerifications.values()].find(
      (record) => record.companyId === companyId && record.orgNo === orgNo
    ) || null;
  }

  function findPersonVerification(companyId, workerIdentityType, workerIdentityValue) {
    return [...state.personVerifications.values()].find(
      (record) =>
        record.companyId === companyId &&
        record.workerIdentityType === workerIdentityType &&
        record.workerIdentityValue === workerIdentityValue
    ) || null;
  }

  function findCardStatus(companyId, cardReference) {
    return [...state.cardStatuses.values()].find(
      (record) => record.companyId === companyId && record.cardReference === cardReference
    ) || null;
  }

  function appendAuditEvent({ companyId, workplaceId = null, actorId, correlationId, action, entityType, entityId, explanation }) {
    state.auditEvents.push(
      createAuditEnvelopeFromLegacyEvent({
        auditClass: "id06_action",
        event: {
          auditEventId: crypto.randomUUID(),
          companyId: requireText(companyId, "company_id_required"),
          workplaceId,
          actorId: requireText(actorId, "actor_id_required"),
          correlationId: requireText(correlationId, "correlation_id_required"),
          action: requireText(action, "id06_audit_action_required"),
          entityType: requireText(entityType, "id06_audit_entity_type_required"),
          entityId: requireText(entityId, "id06_audit_entity_id_required"),
          createdAt: nowIso(clock),
          explanation: requireText(explanation, "id06_audit_explanation_required")
        }
      })
    );
  }
}

function createError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function requireText(value, code) {
  const resolved = String(value || "").trim();
  if (!resolved) {
    throw createError(400, code, `${code} is required.`);
  }
  return resolved;
}

function requireEnum(values, value, code) {
  const resolved = requireText(value, code);
  if (!values.includes(resolved)) {
    throw createError(400, code, `${resolved} is not a supported value for ${code}.`);
  }
  return resolved;
}

function optionalText(value) {
  const resolved = String(value || "").trim();
  return resolved || null;
}

function normalizeOptionalDate(value, code) {
  const resolved = optionalText(value);
  if (!resolved) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolved)) {
    throw createError(400, code, `${code} must use YYYY-MM-DD.`);
  }
  return resolved;
}

function normalizeOptionalTimestamp(value, code) {
  const resolved = optionalText(value);
  if (!resolved) {
    return null;
  }
  const date = new Date(resolved);
  if (Number.isNaN(date.valueOf())) {
    throw createError(400, code, `${code} must be a valid timestamp.`);
  }
  return date.toISOString();
}

function nowIso(clock) {
  return clock().toISOString();
}

function todayIso(clock) {
  return nowIso(clock).slice(0, 10);
}


function hashObject(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
