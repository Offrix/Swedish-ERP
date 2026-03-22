import crypto from "node:crypto";

export const PERSONALLIGGARE_REGISTRATION_STATUSES = Object.freeze([
  "draft",
  "checklist_in_progress",
  "registered",
  "active",
  "closed"
]);
export const PERSONALLIGGARE_ATTENDANCE_EVENT_TYPES = Object.freeze(["check_in", "check_out", "correction"]);
export const PERSONALLIGGARE_SOURCE_CHANNELS = Object.freeze(["kiosk", "mobile", "admin"]);
export const PERSONALLIGGARE_EXPORT_TYPES = Object.freeze(["daily", "person", "employer", "audit"]);
export const PRICE_BASE_AMOUNT_2026 = 59200;
export const PERSONALLIGGARE_THRESHOLD_2026_EX_VAT = PRICE_BASE_AMOUNT_2026 * 4;

export function createPersonalliggarePlatform(options = {}) {
  return createPersonalliggareEngine(options);
}

export function createPersonalliggareEngine({
  clock = () => new Date(),
  hrPlatform = null,
  projectsPlatform = null
} = {}) {
  const state = {
    constructionSites: new Map(),
    siteIdsByCompany: new Map(),
    siteIdByCode: new Map(),
    auditEvents: []
  };

  return {
    registrationStatuses: PERSONALLIGGARE_REGISTRATION_STATUSES,
    attendanceEventTypes: PERSONALLIGGARE_ATTENDANCE_EVENT_TYPES,
    sourceChannels: PERSONALLIGGARE_SOURCE_CHANNELS,
    exportTypes: PERSONALLIGGARE_EXPORT_TYPES,
    thresholdAmount2026ExVat: PERSONALLIGGARE_THRESHOLD_2026_EX_VAT,
    listConstructionSites,
    getConstructionSite,
    createConstructionSite,
    listConstructionSiteRegistrations,
    createConstructionSiteRegistration,
    listAttendanceEvents,
    recordAttendanceEvent,
    correctAttendanceEvent,
    listKioskDevices,
    createKioskDevice,
    listAttendanceExports,
    exportAttendanceControlChain,
    listAttendanceAuditEvents
  };

  function listConstructionSites({ companyId, thresholdRequired = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const thresholdFilter = thresholdRequired == null ? null : thresholdRequired === true;
    return (state.siteIdsByCompany.get(resolvedCompanyId) || [])
      .map((constructionSiteId) => state.constructionSites.get(constructionSiteId))
      .filter(Boolean)
      .filter((record) => (thresholdFilter == null ? true : record.thresholdRequiredFlag === thresholdFilter))
      .sort((left, right) => left.siteCode.localeCompare(right.siteCode))
      .map(copy);
  }

  function getConstructionSite({ companyId, constructionSiteId } = {}) {
    return copy(requireConstructionSite(companyId, constructionSiteId));
  }

  function createConstructionSite({
    companyId,
    constructionSiteId = null,
    siteCode,
    siteName,
    siteAddress,
    builderOrgNo,
    estimatedTotalCostExVat,
    startDate,
    endDate = null,
    projectId = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedSiteCode = requireText(siteCode, "construction_site_code_required");
    const scopedKey = `${resolvedCompanyId}:${resolvedSiteCode}`;
    if (state.siteIdByCode.has(scopedKey)) {
      throw createError(409, "construction_site_code_not_unique", `Construction site ${resolvedSiteCode} already exists.`);
    }
    if (projectId && projectsPlatform?.getProject) {
      projectsPlatform.getProject({ companyId: resolvedCompanyId, projectId });
    }
    const estimatedAmount = normalizeMoney(estimatedTotalCostExVat, "construction_site_estimated_cost_invalid");
    const record = {
      constructionSiteId: normalizeOptionalText(constructionSiteId) || crypto.randomUUID(),
      companyId: resolvedCompanyId,
      siteCode: resolvedSiteCode,
      siteName: requireText(siteName, "construction_site_name_required"),
      siteAddress: requireText(siteAddress, "construction_site_address_required"),
      builderOrgNo: requireText(builderOrgNo, "construction_site_builder_org_required"),
      projectId: normalizeOptionalText(projectId),
      estimatedTotalCostExVat: estimatedAmount,
      thresholdRequiredFlag: estimatedAmount > PERSONALLIGGARE_THRESHOLD_2026_EX_VAT,
      registrationStatus: "draft",
      startDate: normalizeRequiredDate(startDate, "construction_site_start_date_required"),
      endDate: normalizeOptionalDate(endDate, "construction_site_end_date_invalid"),
      registrations: [],
      attendanceEvents: [],
      kioskDevices: [],
      exports: [],
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.constructionSites.set(record.constructionSiteId, record);
    appendToIndex(state.siteIdsByCompany, record.companyId, record.constructionSiteId);
    state.siteIdByCode.set(scopedKey, record.constructionSiteId);
    pushAudit(state, clock, {
      companyId: record.companyId,
      constructionSiteId: record.constructionSiteId,
      actorId,
      correlationId,
      action: "personalliggare.site.created",
      entityType: "construction_site",
      entityId: record.constructionSiteId,
      projectId: record.projectId,
      explanation: `Created construction site ${record.siteCode}.`
    });
    return copy(record);
  }

  function listConstructionSiteRegistrations({ companyId, constructionSiteId } = {}) {
    return copy(requireConstructionSite(companyId, constructionSiteId).registrations);
  }

  function createConstructionSiteRegistration({ companyId, constructionSiteId, registrationReference, status = "registered", checklistItems = [], registeredOn = null, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const record = requireConstructionSite(companyId, constructionSiteId);
    const registration = {
      constructionSiteRegistrationId: crypto.randomUUID(),
      registrationReference: requireText(registrationReference, "construction_site_registration_reference_required"),
      status: requireEnum(PERSONALLIGGARE_REGISTRATION_STATUSES, status, "personalliggare_registration_status_invalid"),
      registeredOn: normalizeOptionalDate(registeredOn, "construction_site_registered_on_invalid"),
      checklistItems: Array.isArray(checklistItems) ? copy(checklistItems) : [],
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    record.registrations.push(registration);
    record.registrationStatus = registration.status;
    record.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      constructionSiteId: record.constructionSiteId,
      actorId,
      correlationId,
      action: "personalliggare.site.registration_created",
      entityType: "construction_site_registration",
      entityId: registration.constructionSiteRegistrationId,
      projectId: record.projectId,
      explanation: `Created registration state ${registration.status} for site ${record.siteCode}.`
    });
    return copy(registration);
  }

  function listAttendanceEvents({ companyId, constructionSiteId, workerIdentityValue = null } = {}) {
    const record = requireConstructionSite(companyId, constructionSiteId);
    const identityFilter = normalizeOptionalText(workerIdentityValue);
    return record.attendanceEvents.filter((event) => (identityFilter ? event.workerIdentityValue === identityFilter : true)).map(copy);
  }

  function recordAttendanceEvent({ companyId, constructionSiteId, employmentId = null, workerIdentityType = "personnummer", workerIdentityValue, fullNameSnapshot, employerOrgNo, contractorOrgNo, eventType, eventTimestamp, sourceChannel, deviceId = null, offlineFlag = false, geoContext = null, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const record = requireConstructionSite(companyId, constructionSiteId);
    if (employmentId && hrPlatform?.getEmployeeForEmployment) {
      hrPlatform.getEmployeeForEmployment({ companyId: record.companyId, employmentId });
    }
    const attendanceEvent = {
      attendanceEventId: crypto.randomUUID(),
      employmentId: normalizeOptionalText(employmentId),
      workerIdentityType: requireText(workerIdentityType, "attendance_identity_type_required"),
      workerIdentityValue: requireText(workerIdentityValue, "attendance_identity_value_required"),
      fullNameSnapshot: requireText(fullNameSnapshot, "attendance_full_name_required"),
      employerOrgNo: requireText(employerOrgNo, "attendance_employer_org_required"),
      contractorOrgNo: requireText(contractorOrgNo, "attendance_contractor_org_required"),
      eventType: requireEnum(PERSONALLIGGARE_ATTENDANCE_EVENT_TYPES, eventType, "attendance_event_type_invalid"),
      eventTimestamp: normalizeRequiredTimestamp(eventTimestamp, "attendance_event_timestamp_required"),
      sourceChannel: requireEnum(PERSONALLIGGARE_SOURCE_CHANNELS, sourceChannel, "attendance_source_channel_invalid"),
      deviceId: normalizeOptionalText(deviceId),
      offlineFlag: offlineFlag === true,
      geoContext: normalizeObject(geoContext),
      corrections: [],
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    record.attendanceEvents.push(attendanceEvent);
    record.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      constructionSiteId: record.constructionSiteId,
      actorId,
      correlationId,
      action: "personalliggare.attendance_recorded",
      entityType: "attendance_event",
      entityId: attendanceEvent.attendanceEventId,
      projectId: record.projectId,
      explanation: `Recorded ${attendanceEvent.eventType} for site ${record.siteCode}.`
    });
    return copy(attendanceEvent);
  }

  function correctAttendanceEvent({ companyId, attendanceEventId, correctedTimestamp = null, correctedEventType = null, correctionReason, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const { constructionSite, attendanceEvent } = requireAttendanceEvent(companyId, attendanceEventId);
    const correction = {
      attendanceCorrectionId: crypto.randomUUID(),
      correctionReason: requireText(correctionReason, "attendance_correction_reason_required"),
      correctedTimestamp: normalizeOptionalTimestamp(correctedTimestamp, "attendance_correction_timestamp_invalid"),
      correctedEventType: correctedEventType ? requireEnum(PERSONALLIGGARE_ATTENDANCE_EVENT_TYPES, correctedEventType, "attendance_correction_type_invalid") : null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    attendanceEvent.corrections.push(correction);
    constructionSite.attendanceEvents.push({
      attendanceEventId: crypto.randomUUID(),
      employmentId: attendanceEvent.employmentId,
      workerIdentityType: attendanceEvent.workerIdentityType,
      workerIdentityValue: attendanceEvent.workerIdentityValue,
      fullNameSnapshot: attendanceEvent.fullNameSnapshot,
      employerOrgNo: attendanceEvent.employerOrgNo,
      contractorOrgNo: attendanceEvent.contractorOrgNo,
      eventType: "correction",
      eventTimestamp: correction.correctedTimestamp || attendanceEvent.eventTimestamp,
      sourceChannel: "admin",
      deviceId: null,
      offlineFlag: false,
      geoContext: {},
      originalAttendanceEventId: attendanceEvent.attendanceEventId,
      correctionReason: correction.correctionReason,
      correctedEventType: correction.correctedEventType,
      corrections: [],
      createdByActorId: correction.createdByActorId,
      createdAt: nowIso(clock)
    });
    constructionSite.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: constructionSite.companyId,
      constructionSiteId: constructionSite.constructionSiteId,
      actorId,
      correlationId,
      action: "personalliggare.attendance_corrected",
      entityType: "attendance_correction",
      entityId: correction.attendanceCorrectionId,
      projectId: constructionSite.projectId,
      explanation: `Corrected attendance event ${attendanceEvent.attendanceEventId} for site ${constructionSite.siteCode}.`
    });
    return copy(correction);
  }

  function listKioskDevices({ companyId, constructionSiteId } = {}) {
    return copy(requireConstructionSite(companyId, constructionSiteId).kioskDevices);
  }

  function createKioskDevice({ companyId, constructionSiteId, deviceCode, displayName, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const record = requireConstructionSite(companyId, constructionSiteId);
    const kioskDevice = {
      kioskDeviceId: crypto.randomUUID(),
      deviceCode: requireText(deviceCode, "kiosk_device_code_required"),
      displayName: requireText(displayName, "kiosk_device_name_required"),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    record.kioskDevices.push(kioskDevice);
    record.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      constructionSiteId: record.constructionSiteId,
      actorId,
      correlationId,
      action: "personalliggare.kiosk.created",
      entityType: "kiosk_device",
      entityId: kioskDevice.kioskDeviceId,
      projectId: record.projectId,
      explanation: `Created kiosk device ${kioskDevice.deviceCode} for site ${record.siteCode}.`
    });
    return copy(kioskDevice);
  }

  function listAttendanceExports({ companyId, constructionSiteId } = {}) {
    return copy(requireConstructionSite(companyId, constructionSiteId).exports);
  }

  function exportAttendanceControlChain({ companyId, constructionSiteId, exportType, exportDate = null, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const record = requireConstructionSite(companyId, constructionSiteId);
    const resolvedExportType = requireEnum(PERSONALLIGGARE_EXPORT_TYPES, exportType, "attendance_export_type_invalid");
    const resolvedExportDate = normalizeOptionalDate(exportDate, "attendance_export_date_invalid");
    const events = record.attendanceEvents
      .filter((event) => (resolvedExportDate ? event.eventTimestamp.slice(0, 10) === resolvedExportDate : true))
      .sort((left, right) => left.eventTimestamp.localeCompare(right.eventTimestamp));
    const corrections = events.flatMap((event) => event.corrections || []);
    const attendanceExport = {
      attendanceExportId: crypto.randomUUID(),
      exportType: resolvedExportType,
      exportDate: resolvedExportDate,
      eventCount: events.length,
      correctionCount: corrections.length,
      controlChainHash: hashObject({
        constructionSiteId: record.constructionSiteId,
        exportType: resolvedExportType,
        exportDate: resolvedExportDate,
        events,
        corrections
      }),
      payloadJson: {
        constructionSiteId: record.constructionSiteId,
        siteCode: record.siteCode,
        thresholdRequiredFlag: record.thresholdRequiredFlag,
        exportType: resolvedExportType,
        exportDate: resolvedExportDate,
        events,
        corrections
      },
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    record.exports.push(attendanceExport);
    record.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      constructionSiteId: record.constructionSiteId,
      actorId,
      correlationId,
      action: "personalliggare.export.created",
      entityType: "attendance_export",
      entityId: attendanceExport.attendanceExportId,
      projectId: record.projectId,
      explanation: `Exported ${attendanceExport.exportType} control chain for site ${record.siteCode}.`
    });
    return copy(attendanceExport);
  }

  function listAttendanceAuditEvents({ companyId, constructionSiteId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedConstructionSiteId = normalizeOptionalText(constructionSiteId);
    return state.auditEvents
      .filter((event) => event.companyId === resolvedCompanyId)
      .filter((event) => (resolvedConstructionSiteId ? event.constructionSiteId === resolvedConstructionSiteId : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function requireConstructionSite(companyId, constructionSiteId) {
    const record = state.constructionSites.get(requireText(constructionSiteId, "construction_site_id_required"));
    if (!record || record.companyId !== requireText(companyId, "company_id_required")) {
      throw createError(404, "construction_site_not_found", "Construction site was not found.");
    }
    return record;
  }

  function requireAttendanceEvent(companyId, attendanceEventId) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    for (const siteId of state.siteIdsByCompany.get(resolvedCompanyId) || []) {
      const constructionSite = state.constructionSites.get(siteId);
      const attendanceEvent = constructionSite?.attendanceEvents.find((candidate) => candidate.attendanceEventId === attendanceEventId);
      if (attendanceEvent) {
        return { constructionSite, attendanceEvent };
      }
    }
    throw createError(404, "attendance_event_not_found", "Attendance event was not found.");
  }
}

function appendToIndex(map, key, value) {
  const current = map.get(key) || [];
  current.push(value);
  map.set(key, current);
}

function requireText(value, code) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    throw createError(400, code, "Required value is missing.");
  }
  return normalized;
}

function normalizeOptionalText(value) {
  if (value == null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function normalizeMoney(value, code) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw createError(400, code, "Expected a non-negative numeric amount.");
  }
  return roundMoney(numberValue);
}

function normalizeRequiredDate(value, code) {
  const normalized = normalizeOptionalDate(value, code);
  if (!normalized) {
    throw createError(400, code, "Date is required.");
  }
  return normalized;
}

function normalizeOptionalDate(value, code) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw createError(400, code, "Date must use YYYY-MM-DD.");
  }
  return normalized;
}

function normalizeRequiredTimestamp(value, code) {
  const normalized = normalizeOptionalTimestamp(value, code);
  if (!normalized) {
    throw createError(400, code, "Timestamp is required.");
  }
  return normalized;
}

function normalizeOptionalTimestamp(value, code) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  if (Number.isNaN(Date.parse(normalized))) {
    throw createError(400, code, "Timestamp must be ISO-8601 compatible.");
  }
  return new Date(normalized).toISOString();
}

function normalizeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return copy(value);
}

function requireEnum(allowedValues, value, code) {
  const normalized = requireText(value, code);
  if (!allowedValues.includes(normalized)) {
    throw createError(400, code, `Value ${normalized} is not allowed.`);
  }
  return normalized;
}

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function pushAudit(state, clock, entry) {
  state.auditEvents.push({
    auditEventId: crypto.randomUUID(),
    companyId: entry.companyId,
    constructionSiteId: entry.constructionSiteId || null,
    actorId: entry.actorId,
    correlationId: entry.correlationId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    projectId: entry.projectId || null,
    createdAt: nowIso(clock),
    explanation: entry.explanation
  });
}

function hashObject(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (value == null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function copy(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createError(statusCode, error, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.error = error;
  return err;
}
