import crypto from "node:crypto";

export const TIME_CLOCK_EVENT_TYPES = Object.freeze(["clock_in", "clock_out"]);
export const TIME_BALANCE_TYPES = Object.freeze(["flex_minutes", "comp_minutes", "overtime_minutes"]);
export const TIME_ENTRY_SOURCE_TYPES = Object.freeze(["manual", "clock", "import"]);

export function createTimePlatform(options = {}) {
  return createTimeEngine(options);
}

export function createTimeEngine({ clock = () => new Date(), hrPlatform = null } = {}) {
  const state = {
    scheduleTemplates: new Map(),
    scheduleTemplateIdsByCompany: new Map(),
    scheduleTemplateIdsByCode: new Map(),
    scheduleAssignments: new Map(),
    scheduleAssignmentIdsByEmployment: new Map(),
    clockEvents: new Map(),
    clockEventIdsByEmployment: new Map(),
    timeEntries: new Map(),
    timeEntryIdsByEmployment: new Map(),
    balanceTransactions: new Map(),
    balanceTransactionIdsByEmployment: new Map(),
    periodLocks: new Map(),
    periodLockIdsByEmployment: new Map(),
    countersByCompany: new Map()
  };

  return {
    clockEventTypes: TIME_CLOCK_EVENT_TYPES,
    balanceTypes: TIME_BALANCE_TYPES,
    entrySourceTypes: TIME_ENTRY_SOURCE_TYPES,
    listScheduleTemplates,
    createScheduleTemplate,
    listScheduleAssignments,
    assignScheduleTemplate,
    listClockEvents,
    recordClockEvent,
    listTimeEntries,
    getTimeEntry,
    createTimeEntry,
    listTimeBalances,
    listTimePeriodLocks,
    lockTimePeriod
  };

  function listScheduleTemplates({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.scheduleTemplateIdsByCompany.get(resolvedCompanyId) || [])
      .map((scheduleTemplateId) => state.scheduleTemplates.get(scheduleTemplateId))
      .filter(Boolean)
      .sort((left, right) => left.scheduleTemplateCode.localeCompare(right.scheduleTemplateCode))
      .map(copy);
  }

  function createScheduleTemplate({
    companyId,
    scheduleTemplateCode = null,
    displayName,
    timezone = "Europe/Stockholm",
    active = true,
    days,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedCode = resolveSequenceOrValue({
      state,
      companyId: resolvedCompanyId,
      sequenceKey: "schedule_template",
      prefix: "SCH",
      value: scheduleTemplateCode,
      requiredCode: "schedule_template_code_required"
    });
    ensureUniqueCode(state.scheduleTemplateIdsByCode, resolvedCompanyId, resolvedCode, "schedule_template_code_exists");

    const normalizedDays = normalizeScheduleDays(days);
    if (normalizedDays.length === 0) {
      throw createError(400, "schedule_template_days_required", "At least one schedule day is required.");
    }

    const template = {
      scheduleTemplateId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      scheduleTemplateCode: resolvedCode,
      displayName: requireText(displayName, "schedule_template_display_name_required"),
      timezone: requireText(timezone, "schedule_template_timezone_required"),
      active: active !== false,
      days: normalizedDays,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };

    state.scheduleTemplates.set(template.scheduleTemplateId, template);
    appendToIndex(state.scheduleTemplateIdsByCompany, resolvedCompanyId, template.scheduleTemplateId);
    setIndexValue(state.scheduleTemplateIdsByCode, resolvedCompanyId, resolvedCode, template.scheduleTemplateId);
    return copy(template);
  }

  function listScheduleAssignments({ companyId, employmentId } = {}) {
    requireEmployment(companyId, employmentId, hrPlatform);
    return (state.scheduleAssignmentIdsByEmployment.get(employmentId) || [])
      .map((assignmentId) => state.scheduleAssignments.get(assignmentId))
      .filter(Boolean)
      .sort((left, right) => left.validFrom.localeCompare(right.validFrom))
      .map(copy);
  }

  function assignScheduleTemplate({
    companyId,
    employmentId,
    scheduleTemplateId,
    validFrom,
    validTo = null,
    actorId = "system"
  } = {}) {
    const employment = requireEmployment(companyId, employmentId, hrPlatform);
    const template = requireScheduleTemplate(employment.companyId, scheduleTemplateId, state);
    const resolvedValidFrom = normalizeRequiredDate(validFrom, "schedule_assignment_valid_from_required");
    const resolvedValidTo = normalizeOptionalDate(validTo, "schedule_assignment_valid_to_invalid");
    if (resolvedValidTo && resolvedValidTo < resolvedValidFrom) {
      throw createError(400, "schedule_assignment_dates_invalid", "Schedule assignment end date cannot be earlier than start date.");
    }

    const assignment = {
      timeScheduleAssignmentId: crypto.randomUUID(),
      companyId: employment.companyId,
      employmentId: employment.employmentId,
      scheduleTemplateId: template.scheduleTemplateId,
      scheduleTemplateCode: template.scheduleTemplateCode,
      validFrom: resolvedValidFrom,
      validTo: resolvedValidTo,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };

    state.scheduleAssignments.set(assignment.timeScheduleAssignmentId, assignment);
    appendToIndex(state.scheduleAssignmentIdsByEmployment, employment.employmentId, assignment.timeScheduleAssignmentId);
    return copy(assignment);
  }

  function listClockEvents({ companyId, employmentId } = {}) {
    requireEmployment(companyId, employmentId, hrPlatform);
    return (state.clockEventIdsByEmployment.get(employmentId) || [])
      .map((timeClockEventId) => state.clockEvents.get(timeClockEventId))
      .filter(Boolean)
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
      .map(copy);
  }

  function recordClockEvent({
    companyId,
    employmentId,
    eventType,
    occurredAt,
    sourceChannel = "field_mobile",
    projectId = null,
    activityCode = null,
    actorId = "system"
  } = {}) {
    const employment = requireEmployment(companyId, employmentId, hrPlatform);
    const resolvedEventType = assertAllowed(eventType, TIME_CLOCK_EVENT_TYPES, "clock_event_type_invalid");
    const resolvedOccurredAt = normalizeRequiredDateTime(occurredAt, "clock_event_occurred_at_required");
    const workDate = resolvedOccurredAt.slice(0, 10);
    assertPeriodOpen({
      state,
      companyId: employment.companyId,
      employmentId: employment.employmentId,
      workDate
    });

    const clockEvent = {
      timeClockEventId: crypto.randomUUID(),
      companyId: employment.companyId,
      employmentId: employment.employmentId,
      eventType: resolvedEventType,
      occurredAt: resolvedOccurredAt,
      workDate,
      sourceChannel: requireText(sourceChannel, "clock_event_source_channel_required"),
      projectId: normalizeOptionalText(projectId),
      activityCode: normalizeOptionalText(activityCode),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };

    state.clockEvents.set(clockEvent.timeClockEventId, clockEvent);
    appendToIndex(state.clockEventIdsByEmployment, employment.employmentId, clockEvent.timeClockEventId);
    return copy(clockEvent);
  }

  function listTimeEntries({ companyId, employmentId } = {}) {
    requireEmployment(companyId, employmentId, hrPlatform);
    return (state.timeEntryIdsByEmployment.get(employmentId) || [])
      .map((timeEntryId) => state.timeEntries.get(timeEntryId))
      .filter(Boolean)
      .sort((left, right) => left.workDate.localeCompare(right.workDate) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function getTimeEntry({ companyId, employmentId, timeEntryId } = {}) {
    requireEmployment(companyId, employmentId, hrPlatform);
    const entry = state.timeEntries.get(requireText(timeEntryId, "time_entry_id_required"));
    if (!entry || entry.companyId !== companyId || entry.employmentId !== employmentId) {
      throw createError(404, "time_entry_not_found", "Time entry was not found.");
    }
    return copy(entry);
  }

  function createTimeEntry({
    companyId,
    employmentId,
    workDate,
    projectId = null,
    activityCode = null,
    sourceType = "manual",
    startsAt = null,
    endsAt = null,
    breakMinutes = 0,
    workedMinutes = null,
    overtimeMinutes = 0,
    obMinutes = 0,
    jourMinutes = 0,
    standbyMinutes = 0,
    flexDeltaMinutes = null,
    compDeltaMinutes = 0,
    sourceClockEventIds = [],
    actorId = "system"
  } = {}) {
    const employment = requireEmployment(companyId, employmentId, hrPlatform);
    const resolvedWorkDate = normalizeRequiredDate(workDate, "time_entry_work_date_required");
    assertPeriodOpen({
      state,
      companyId: employment.companyId,
      employmentId: employment.employmentId,
      workDate: resolvedWorkDate
    });

    const resolvedSourceType = assertAllowed(sourceType, TIME_ENTRY_SOURCE_TYPES, "time_entry_source_type_invalid");
    const resolvedStartsAt = normalizeOptionalDateTime(startsAt, "time_entry_starts_at_invalid");
    const resolvedEndsAt = normalizeOptionalDateTime(endsAt, "time_entry_ends_at_invalid");
    const resolvedBreakMinutes = normalizeNonNegativeInteger(breakMinutes, "time_entry_break_minutes_invalid");

    if (resolvedStartsAt && resolvedStartsAt.slice(0, 10) !== resolvedWorkDate) {
      throw createError(400, "time_entry_start_date_mismatch", "Time entry start timestamp must match work date.");
    }
    if (resolvedEndsAt && resolvedEndsAt.slice(0, 10) !== resolvedWorkDate) {
      throw createError(400, "time_entry_end_date_mismatch", "Time entry end timestamp must match work date.");
    }
    if ((resolvedStartsAt && !resolvedEndsAt) || (!resolvedStartsAt && resolvedEndsAt)) {
      throw createError(400, "time_entry_span_incomplete", "Both start and end timestamps are required when one is provided.");
    }

    const resolvedWorkedMinutes =
      workedMinutes == null
        ? resolvedStartsAt && resolvedEndsAt
          ? computeWorkedMinutes(resolvedStartsAt, resolvedEndsAt, resolvedBreakMinutes)
          : null
        : normalizeNonNegativeInteger(workedMinutes, "time_entry_worked_minutes_invalid");
    if (resolvedWorkedMinutes == null) {
      throw createError(
        400,
        "time_entry_worked_minutes_required",
        "Worked minutes or a complete start/end span is required for a time entry."
      );
    }

    const assignment = resolveActiveScheduleAssignment({
      state,
      companyId: employment.companyId,
      employmentId: employment.employmentId,
      workDate: resolvedWorkDate
    });
    const scheduleDay = assignment ? getScheduleDayForDate(assignment.template, resolvedWorkDate) : null;
    const scheduledMinutes = scheduleDay ? scheduleDay.plannedMinutes : 0;

    const normalizedSourceClockEventIds = normalizeSourceClockEventIds({
      state,
      companyId: employment.companyId,
      employmentId: employment.employmentId,
      sourceClockEventIds
    });
    const resolvedOvertimeMinutes = normalizeNonNegativeInteger(overtimeMinutes, "time_entry_overtime_minutes_invalid");
    const resolvedObMinutes = normalizeNonNegativeInteger(obMinutes, "time_entry_ob_minutes_invalid");
    const resolvedJourMinutes = normalizeNonNegativeInteger(jourMinutes, "time_entry_jour_minutes_invalid");
    const resolvedStandbyMinutes = normalizeNonNegativeInteger(standbyMinutes, "time_entry_standby_minutes_invalid");
    const resolvedCompDeltaMinutes = normalizeInteger(compDeltaMinutes, "time_entry_comp_delta_invalid");
    const resolvedFlexDeltaMinutes =
      flexDeltaMinutes == null
        ? resolvedWorkedMinutes - scheduledMinutes
        : normalizeInteger(flexDeltaMinutes, "time_entry_flex_delta_invalid");

    const entry = {
      timeEntryId: crypto.randomUUID(),
      companyId: employment.companyId,
      employmentId: employment.employmentId,
      workDate: resolvedWorkDate,
      projectId: normalizeOptionalText(projectId),
      activityCode: normalizeOptionalText(activityCode),
      sourceType: resolvedSourceType,
      startsAt: resolvedStartsAt,
      endsAt: resolvedEndsAt,
      breakMinutes: resolvedBreakMinutes,
      workedMinutes: resolvedWorkedMinutes,
      scheduledMinutes,
      overtimeMinutes: resolvedOvertimeMinutes,
      obMinutes: resolvedObMinutes,
      jourMinutes: resolvedJourMinutes,
      standbyMinutes: resolvedStandbyMinutes,
      flexDeltaMinutes: resolvedFlexDeltaMinutes,
      compDeltaMinutes: resolvedCompDeltaMinutes,
      sourceClockEventIds: normalizedSourceClockEventIds,
      scheduleTemplateId: assignment ? assignment.scheduleTemplateId : null,
      scheduleTemplateCode: assignment ? assignment.scheduleTemplateCode : null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };

    state.timeEntries.set(entry.timeEntryId, entry);
    appendToIndex(state.timeEntryIdsByEmployment, employment.employmentId, entry.timeEntryId);
    createBalanceTransactionsForEntry(entry);
    return copy(entry);
  }

  function listTimeBalances({ companyId, employmentId, cutoffDate = null } = {}) {
    const employment = requireEmployment(companyId, employmentId, hrPlatform);
    const resolvedCutoffDate = cutoffDate ? normalizeRequiredDate(cutoffDate, "balance_cutoff_date_invalid") : "9999-12-31";
    const transactions = (state.balanceTransactionIdsByEmployment.get(employment.employmentId) || [])
      .map((timeBalanceTransactionId) => state.balanceTransactions.get(timeBalanceTransactionId))
      .filter(Boolean)
      .filter((transaction) => transaction.effectiveDate <= resolvedCutoffDate)
      .sort((left, right) => left.effectiveDate.localeCompare(right.effectiveDate) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);

    const balances = {
      flex_minutes: 0,
      comp_minutes: 0,
      overtime_minutes: 0
    };
    for (const transaction of transactions) {
      balances[transaction.balanceType] += transaction.deltaMinutes;
    }

    return {
      companyId: employment.companyId,
      employmentId: employment.employmentId,
      cutoffDate: resolvedCutoffDate,
      snapshotHash: buildSnapshotHash({ cutoffDate: resolvedCutoffDate, transactions, balances }),
      balances,
      transactions
    };
  }

  function listTimePeriodLocks({ companyId, employmentId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const keys = employmentId ? [employmentId] : Array.from(state.periodLockIdsByEmployment.keys());
    const seen = new Set();
    const items = [];

    for (const key of keys) {
      for (const timePeriodLockId of state.periodLockIdsByEmployment.get(key) || []) {
        if (seen.has(timePeriodLockId)) {
          continue;
        }
        const lock = state.periodLocks.get(timePeriodLockId);
        if (!lock || lock.companyId !== resolvedCompanyId) {
          continue;
        }
        seen.add(timePeriodLockId);
        items.push(copy(lock));
      }
    }

    return items.sort((left, right) => left.startsOn.localeCompare(right.startsOn));
  }

  function lockTimePeriod({
    companyId,
    employmentId = null,
    startsOn,
    endsOn,
    reasonCode,
    note = null,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedEmployment = employmentId ? requireEmployment(resolvedCompanyId, employmentId, hrPlatform) : null;
    const resolvedStartsOn = normalizeRequiredDate(startsOn, "time_period_lock_starts_on_required");
    const resolvedEndsOn = normalizeRequiredDate(endsOn, "time_period_lock_ends_on_required");
    if (resolvedEndsOn < resolvedStartsOn) {
      throw createError(400, "time_period_lock_dates_invalid", "Time period lock end date cannot be earlier than start date.");
    }

    const lock = {
      timePeriodLockId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      employmentId: resolvedEmployment ? resolvedEmployment.employmentId : null,
      startsOn: resolvedStartsOn,
      endsOn: resolvedEndsOn,
      reasonCode: requireText(reasonCode, "time_period_lock_reason_required"),
      note: normalizeOptionalText(note),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };

    state.periodLocks.set(lock.timePeriodLockId, lock);
    appendToIndex(state.periodLockIdsByEmployment, resolvedEmployment ? resolvedEmployment.employmentId : "*", lock.timePeriodLockId);
    return copy(lock);
  }

  function createBalanceTransactionsForEntry(entry) {
    const definitions = [
      {
        balanceType: "flex_minutes",
        deltaMinutes: entry.flexDeltaMinutes,
        explanation: "Derived flex delta from recorded time entry."
      },
      {
        balanceType: "comp_minutes",
        deltaMinutes: entry.compDeltaMinutes,
        explanation: "Recorded comp-time delta from time entry."
      },
      {
        balanceType: "overtime_minutes",
        deltaMinutes: entry.overtimeMinutes,
        explanation: "Recorded overtime minutes from time entry."
      }
    ];

    for (const definition of definitions) {
      if (!definition.deltaMinutes) {
        continue;
      }
      const transaction = {
        timeBalanceTransactionId: crypto.randomUUID(),
        companyId: entry.companyId,
        employmentId: entry.employmentId,
        balanceType: definition.balanceType,
        effectiveDate: entry.workDate,
        deltaMinutes: definition.deltaMinutes,
        sourceType: "time_entry",
        sourceId: entry.timeEntryId,
        explanation: definition.explanation,
        createdByActorId: entry.createdByActorId,
        createdAt: entry.createdAt
      };
      state.balanceTransactions.set(transaction.timeBalanceTransactionId, transaction);
      appendToIndex(state.balanceTransactionIdsByEmployment, entry.employmentId, transaction.timeBalanceTransactionId);
    }
  }
}

function requireEmployment(companyId, employmentId, hrPlatform = null) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const resolvedEmploymentId = requireText(employmentId, "employment_id_required");
  if (!hrPlatform) {
    return {
      companyId: resolvedCompanyId,
      employmentId: resolvedEmploymentId
    };
  }

  for (const employee of hrPlatform.listEmployees({ companyId: resolvedCompanyId })) {
    for (const employment of hrPlatform.listEmployments({
      companyId: resolvedCompanyId,
      employeeId: employee.employeeId
    })) {
      if (employment.employmentId === resolvedEmploymentId) {
        return employment;
      }
    }
  }

  throw createError(404, "employment_not_found", "Employment was not found.");
}

function requireScheduleTemplate(companyId, scheduleTemplateId, state) {
  const template = state.scheduleTemplates.get(requireText(scheduleTemplateId, "schedule_template_id_required"));
  if (!template || template.companyId !== companyId) {
    throw createError(404, "schedule_template_not_found", "Schedule template was not found.");
  }
  return template;
}

function resolveActiveScheduleAssignment({ state, companyId, employmentId, workDate }) {
  const assignment = (state.scheduleAssignmentIdsByEmployment.get(employmentId) || [])
    .map((assignmentId) => state.scheduleAssignments.get(assignmentId))
    .filter(Boolean)
    .filter(
      (candidate) =>
        candidate.companyId === companyId &&
        candidate.validFrom <= workDate &&
        (!candidate.validTo || candidate.validTo >= workDate)
    )
    .sort((left, right) => right.validFrom.localeCompare(left.validFrom))[0];

  if (!assignment) {
    return null;
  }

  return {
    ...assignment,
    template: state.scheduleTemplates.get(assignment.scheduleTemplateId) || null
  };
}

function getScheduleDayForDate(template, workDate) {
  if (!template) {
    return null;
  }
  const weekday = weekdayFromDate(workDate);
  return template.days.find((candidate) => candidate.weekday === weekday) || null;
}

function normalizeScheduleDays(days) {
  if (!Array.isArray(days)) {
    throw createError(400, "schedule_template_days_invalid", "Schedule days must be an array.");
  }
  const seen = new Set();
  return days.map((candidate) => {
    const weekday = normalizeInteger(candidate?.weekday, "schedule_template_weekday_invalid");
    if (weekday < 1 || weekday > 7) {
      throw createError(400, "schedule_template_weekday_invalid", "Weekday must be between 1 and 7.");
    }
    if (seen.has(weekday)) {
      throw createError(409, "schedule_template_weekday_duplicate", "Each weekday can only appear once per schedule template.");
    }
    seen.add(weekday);
    return {
      weekday,
      plannedMinutes: normalizeNonNegativeInteger(candidate?.plannedMinutes ?? 0, "schedule_template_planned_minutes_invalid"),
      obMinutes: normalizeNonNegativeInteger(candidate?.obMinutes ?? 0, "schedule_template_ob_minutes_invalid"),
      jourMinutes: normalizeNonNegativeInteger(candidate?.jourMinutes ?? 0, "schedule_template_jour_minutes_invalid"),
      standbyMinutes: normalizeNonNegativeInteger(candidate?.standbyMinutes ?? 0, "schedule_template_standby_minutes_invalid"),
      startTime: normalizeOptionalTime(candidate?.startTime, "schedule_template_start_time_invalid"),
      endTime: normalizeOptionalTime(candidate?.endTime, "schedule_template_end_time_invalid"),
      breakMinutes: normalizeNonNegativeInteger(candidate?.breakMinutes ?? 0, "schedule_template_break_minutes_invalid")
    };
  });
}

function normalizeSourceClockEventIds({ state, companyId, employmentId, sourceClockEventIds }) {
  if (!Array.isArray(sourceClockEventIds)) {
    throw createError(400, "time_entry_source_clock_events_invalid", "sourceClockEventIds must be an array.");
  }
  return sourceClockEventIds.map((sourceClockEventId) => {
    const resolvedId = requireText(sourceClockEventId, "time_clock_event_id_required");
    const clockEvent = state.clockEvents.get(resolvedId);
    if (!clockEvent || clockEvent.companyId !== companyId || clockEvent.employmentId !== employmentId) {
      throw createError(404, "time_clock_event_not_found", "Referenced clock event was not found.");
    }
    return resolvedId;
  });
}

function assertPeriodOpen({ state, companyId, employmentId, workDate }) {
  const relevantLocks = [
    ...(state.periodLockIdsByEmployment.get("*") || []),
    ...(state.periodLockIdsByEmployment.get(employmentId) || [])
  ]
    .map((timePeriodLockId) => state.periodLocks.get(timePeriodLockId))
    .filter(Boolean)
    .filter((candidate) => candidate.companyId === companyId);

  for (const lock of relevantLocks) {
    if (lock.startsOn <= workDate && lock.endsOn >= workDate) {
      throw createError(409, "time_period_locked", "The requested work date falls inside a locked time period.");
    }
  }
}

function buildSnapshotHash(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function weekdayFromDate(value) {
  const date = new Date(`${value}T12:00:00Z`);
  const weekday = date.getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

function computeWorkedMinutes(startsAt, endsAt, breakMinutes) {
  const startedAt = Date.parse(startsAt);
  const endedAt = Date.parse(endsAt);
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt) || endedAt <= startedAt) {
    throw createError(400, "time_entry_span_invalid", "Time entry end must be later than start.");
  }
  const minutes = Math.round((endedAt - startedAt) / 60000) - breakMinutes;
  if (minutes < 0) {
    throw createError(400, "time_entry_break_minutes_invalid", "Break minutes cannot exceed worked span.");
  }
  return minutes;
}

function resolveSequenceOrValue({ state, companyId, sequenceKey, prefix, value, requiredCode }) {
  const normalizedValue = normalizeOptionalText(value);
  if (normalizedValue) {
    return normalizedValue;
  }
  if (!prefix) {
    throw createError(400, requiredCode, "Code is required.");
  }
  const nextValue = (state.countersByCompany.get(`${companyId}:${sequenceKey}`) || 0) + 1;
  state.countersByCompany.set(`${companyId}:${sequenceKey}`, nextValue);
  return `${prefix}${String(nextValue).padStart(4, "0")}`;
}

function ensureUniqueCode(index, companyId, code, errorCode) {
  if (!index.has(companyId)) {
    return;
  }
  if (index.get(companyId).has(code)) {
    throw createError(409, errorCode, "Code already exists.");
  }
}

function setIndexValue(index, companyId, code, value) {
  if (!index.has(companyId)) {
    index.set(companyId, new Map());
  }
  index.get(companyId).set(code, value);
}

function appendToIndex(index, key, value) {
  if (!index.has(key)) {
    index.set(key, []);
  }
  index.get(key).push(value);
}

function nowIso(clock) {
  return clock().toISOString();
}

function requireText(value, code) {
  if (typeof value !== "string" || value.trim() === "") {
    throw createError(400, code, "Required text value is missing.");
  }
  return value.trim();
}

function normalizeOptionalText(value) {
  if (value == null) {
    return null;
  }
  return requireText(String(value), "text_invalid");
}

function normalizeRequiredDate(value, code) {
  const resolvedValue = requireText(value, code);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolvedValue)) {
    throw createError(400, code, "Date must be in YYYY-MM-DD format.");
  }
  return resolvedValue;
}

function normalizeOptionalDate(value, code) {
  if (value == null || value === "") {
    return null;
  }
  return normalizeRequiredDate(String(value), code);
}

function normalizeRequiredDateTime(value, code) {
  const resolvedValue = requireText(value, code);
  const parsed = Date.parse(resolvedValue);
  if (!Number.isFinite(parsed)) {
    throw createError(400, code, "Timestamp is invalid.");
  }
  return new Date(parsed).toISOString();
}

function normalizeOptionalDateTime(value, code) {
  if (value == null || value === "") {
    return null;
  }
  return normalizeRequiredDateTime(String(value), code);
}

function normalizeOptionalTime(value, code) {
  if (value == null || value === "") {
    return null;
  }
  const resolvedValue = requireText(String(value), code);
  if (!/^\d{2}:\d{2}$/.test(resolvedValue)) {
    throw createError(400, code, "Time must be in HH:MM format.");
  }
  return resolvedValue;
}

function normalizeInteger(value, code) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw createError(400, code, "Value must be an integer.");
  }
  return value;
}

function normalizeNonNegativeInteger(value, code) {
  const integer = normalizeInteger(Number(value), code);
  if (integer < 0) {
    throw createError(400, code, "Value cannot be negative.");
  }
  return integer;
}

function assertAllowed(value, allowedValues, code) {
  const resolvedValue = requireText(value, code);
  if (!allowedValues.includes(resolvedValue)) {
    throw createError(400, code, "Value is not allowed.");
  }
  return resolvedValue;
}

function createError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}
