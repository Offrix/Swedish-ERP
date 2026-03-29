import crypto from "node:crypto";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";

export const TIME_CLOCK_EVENT_TYPES = Object.freeze(["clock_in", "clock_out"]);
export const TIME_BALANCE_TYPES = Object.freeze(["flex_minutes", "comp_minutes", "overtime_minutes"]);
export const TIME_ENTRY_SOURCE_TYPES = Object.freeze(["manual", "clock", "import"]);
export const TIME_ENTRY_STATUSES = Object.freeze(["draft", "submitted", "approved", "rejected"]);
export const APPROVED_TIME_SET_STATUSES = Object.freeze(["approved", "locked"]);
export const LEAVE_SIGNAL_TYPES = Object.freeze(["none", "parental_benefit", "temporary_parental_benefit"]);
export const LEAVE_ENTRY_STATUSES = Object.freeze(["draft", "submitted", "approved", "rejected"]);
export const LEAVE_SIGNAL_LOCK_STATES = Object.freeze(["ready_for_sign", "signed", "submitted"]);

export function createTimePlatform(options = {}) {
  return createTimeEngine(options);
}

export function createTimeEngine({
  clock = () => new Date(),
  hrPlatform = null,
  documentPlatform = null,
  balancesPlatform = null,
  collectiveAgreementsPlatform = null
} = {}) {
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
    approvedTimeSets: new Map(),
    approvedTimeSetIdsByEmployment: new Map(),
    periodLocks: new Map(),
    periodLockIdsByEmployment: new Map(),
    leaveTypes: new Map(),
    leaveTypeIdsByCompany: new Map(),
    leaveTypeIdsByCode: new Map(),
    leaveEntries: new Map(),
    leaveEntryIdsByCompany: new Map(),
    leaveEntryIdsByEmployee: new Map(),
    leaveEntryIdsByEmployment: new Map(),
    leaveEntryEvents: new Map(),
    leaveEntryEventIdsByEntry: new Map(),
    leaveSignals: new Map(),
    leaveSignalIdsByEntry: new Map(),
    leaveSignalIdsByEmployee: new Map(),
    leaveSignalLocks: new Map(),
    leaveSignalLockIdsByEmployment: new Map(),
    absenceDecisions: new Map(),
    absenceDecisionIdByLeaveEntry: new Map(),
    absenceDecisionIdsByEmployment: new Map(),
    absenceDecisionIdsByEmployee: new Map(),
    countersByCompany: new Map()
  };

  return {
    clockEventTypes: TIME_CLOCK_EVENT_TYPES,
    balanceTypes: TIME_BALANCE_TYPES,
    entrySourceTypes: TIME_ENTRY_SOURCE_TYPES,
    timeEntryStatuses: TIME_ENTRY_STATUSES,
    approvedTimeSetStatuses: APPROVED_TIME_SET_STATUSES,
    leaveSignalTypes: LEAVE_SIGNAL_TYPES,
    leaveEntryStatuses: LEAVE_ENTRY_STATUSES,
    leaveSignalLockStates: LEAVE_SIGNAL_LOCK_STATES,
    listScheduleTemplates,
    createScheduleTemplate,
    listScheduleAssignments,
    assignScheduleTemplate,
    listClockEvents,
    recordClockEvent,
    listTimeEntries,
    getTimeEntry,
    createTimeEntry,
    submitTimeEntry,
    approveTimeEntry,
    rejectTimeEntry,
    listApprovedTimeSets,
    approveTimeSet,
    listTimeBalances,
    getEmploymentTimeBase,
    listTimePeriodLocks,
    lockTimePeriod,
    listLeaveTypes,
    createLeaveType,
    listLeaveEntries,
    getLeaveEntry,
    createLeaveEntry,
    updateLeaveEntry,
    submitLeaveEntry,
    approveLeaveEntry,
    rejectLeaveEntry,
    listLeaveSignals,
    listLeaveSignalLocks,
    lockLeaveSignals,
    listAbsenceDecisions
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

  function listTimeEntries({ companyId, employmentId, status = null } = {}) {
    requireEmployment(companyId, employmentId, hrPlatform);
    return (state.timeEntryIdsByEmployment.get(employmentId) || [])
      .map((timeEntryId) => state.timeEntries.get(timeEntryId))
      .filter(Boolean)
      .filter((entry) => (status ? entry.status === assertAllowed(status, TIME_ENTRY_STATUSES, "time_entry_status_invalid") : true))
      .sort((left, right) => left.workDate.localeCompare(right.workDate) || left.createdAt.localeCompare(right.createdAt))
      .map(enrichTimeEntry);
  }

  function getTimeEntry({ companyId, employmentId, timeEntryId } = {}) {
    requireEmployment(companyId, employmentId, hrPlatform);
    const entry = state.timeEntries.get(requireText(timeEntryId, "time_entry_id_required"));
    if (!entry || entry.companyId !== companyId || entry.employmentId !== employmentId) {
      throw createError(404, "time_entry_not_found", "Time entry was not found.");
    }
    return enrichTimeEntry(entry);
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
    approvalMode = "auto",
    managerEmploymentId = null,
    allocationRefs = [],
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
    const resolvedApprovalMode = assertAllowed(approvalMode || "auto", ["auto", "manual"], "time_entry_approval_mode_invalid");
    const resolvedFlexDeltaMinutes =
      flexDeltaMinutes == null
        ? resolvedWorkedMinutes - scheduledMinutes
        : normalizeInteger(flexDeltaMinutes, "time_entry_flex_delta_invalid");
    const resolvedManagerEmploymentId = managerEmploymentId ? requireText(managerEmploymentId, "manager_employment_id_required") : null;
    const resolvedAllocationRefs = normalizeAllocationRefs({
      allocationRefs,
      projectId: normalizeOptionalText(projectId),
      activityCode: normalizeOptionalText(activityCode),
      workedMinutes: resolvedWorkedMinutes
    });

    const entry = {
      timeEntryId: crypto.randomUUID(),
      companyId: employment.companyId,
      employmentId: employment.employmentId,
      employeeId: employment.employeeId,
      workDate: resolvedWorkDate,
      projectId: normalizeOptionalText(projectId),
      activityCode: normalizeOptionalText(activityCode),
      sourceType: resolvedSourceType,
      status: resolvedApprovalMode === "auto" ? "approved" : "draft",
      approvalMode: resolvedApprovalMode,
      requiresApproval: resolvedApprovalMode === "manual",
      managerEmploymentId: resolvedManagerEmploymentId,
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
      allocationRefs: resolvedAllocationRefs,
      scheduleTemplateId: assignment ? assignment.scheduleTemplateId : null,
      scheduleTemplateCode: assignment ? assignment.scheduleTemplateCode : null,
      submittedAt: null,
      approvedAt: resolvedApprovalMode === "auto" ? nowIso(clock) : null,
      rejectedAt: null,
      rejectedReason: null,
      approvalActorId: resolvedApprovalMode === "auto" ? requireText(actorId, "actor_id_required") : null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock),
      events: []
    };

    state.timeEntries.set(entry.timeEntryId, entry);
    appendToIndex(state.timeEntryIdsByEmployment, employment.employmentId, entry.timeEntryId);
    appendTimeEntryEvent({
      entry,
      eventType: "created",
      status: entry.status,
      note: entry.status === "approved" ? "Time entry created and auto-approved." : "Time entry created in draft state.",
      actorId
    });
    if (entry.status === "approved") {
      createBalanceTransactionsForEntry(entry);
    }
    return enrichTimeEntry(entry);
  }

  function submitTimeEntry({ companyId, employmentId, timeEntryId, actorId = "system" } = {}) {
    const entry = requireTimeEntry({ companyId, employmentId, timeEntryId, state });
    if (entry.status !== "draft") {
      throw createError(409, "time_entry_submit_invalid", "Only draft time entries can be submitted.");
    }
    const managerAssignment =
      entry.managerEmploymentId != null
        ? { managerEmploymentId: entry.managerEmploymentId }
        : resolveActiveManagerAssignment({
            companyId: entry.companyId,
            employeeId: entry.employeeId,
            employmentId: entry.employmentId,
            effectiveDate: entry.workDate,
            hrPlatform
          });
    if (!managerAssignment) {
      throw createError(409, "time_entry_manager_approval_missing", "No active manager assignment covers this time entry.");
    }
    entry.managerEmploymentId = managerAssignment.managerEmploymentId;
    entry.status = "submitted";
    entry.submittedAt = nowIso(clock);
    entry.updatedAt = entry.submittedAt;
    appendTimeEntryEvent({
      entry,
      eventType: "submitted",
      status: entry.status,
      note: "Time entry submitted for approval.",
      actorId
    });
    return enrichTimeEntry(entry);
  }

  function approveTimeEntry({ companyId, employmentId, timeEntryId, actorId = "system" } = {}) {
    const entry = requireTimeEntry({ companyId, employmentId, timeEntryId, state });
    if (!["draft", "submitted"].includes(entry.status)) {
      throw createError(409, "time_entry_approval_invalid", "Only draft or submitted time entries can be approved.");
    }
    if (entry.status === "draft" && entry.requiresApproval) {
      submitTimeEntry({ companyId, employmentId, timeEntryId, actorId });
    }
    entry.status = "approved";
    entry.approvedAt = nowIso(clock);
    entry.updatedAt = entry.approvedAt;
    entry.approvalActorId = requireText(actorId, "actor_id_required");
    createBalanceTransactionsForEntry(entry);
    appendTimeEntryEvent({
      entry,
      eventType: "approved",
      status: entry.status,
      note: "Time entry approved.",
      actorId
    });
    return enrichTimeEntry(entry);
  }

  function rejectTimeEntry({ companyId, employmentId, timeEntryId, reason, actorId = "system" } = {}) {
    const entry = requireTimeEntry({ companyId, employmentId, timeEntryId, state });
    if (!["draft", "submitted"].includes(entry.status)) {
      throw createError(409, "time_entry_rejection_invalid", "Only draft or submitted time entries can be rejected.");
    }
    entry.status = "rejected";
    entry.rejectedAt = nowIso(clock);
    entry.updatedAt = entry.rejectedAt;
    entry.rejectedReason = requireText(reason, "time_entry_rejection_reason_required");
    appendTimeEntryEvent({
      entry,
      eventType: "rejected",
      status: entry.status,
      note: entry.rejectedReason,
      actorId
    });
    return enrichTimeEntry(entry);
  }

  function listApprovedTimeSets({ companyId, employmentId } = {}) {
    requireEmployment(companyId, employmentId, hrPlatform);
    return (state.approvedTimeSetIdsByEmployment.get(employmentId) || [])
      .map((approvedTimeSetId) => state.approvedTimeSets.get(approvedTimeSetId))
      .filter(Boolean)
      .sort((left, right) => left.startsOn.localeCompare(right.startsOn) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function approveTimeSet({
    companyId,
    employmentId,
    startsOn,
    endsOn,
    note = null,
    actorId = "system"
  } = {}) {
    const employment = requireEmployment(companyId, employmentId, hrPlatform);
    const resolvedStartsOn = normalizeRequiredDate(startsOn, "approved_time_set_starts_on_required");
    const resolvedEndsOn = normalizeRequiredDate(endsOn, "approved_time_set_ends_on_required");
    if (resolvedEndsOn < resolvedStartsOn) {
      throw createError(400, "approved_time_set_dates_invalid", "Approved time set end date cannot be earlier than start date.");
    }

    const entriesInRange = listTimeEntries({
      companyId: employment.companyId,
      employmentId: employment.employmentId
    }).filter((entry) => entry.workDate >= resolvedStartsOn && entry.workDate <= resolvedEndsOn);
    const pendingEntries = entriesInRange.filter((entry) => ["draft", "submitted"].includes(entry.status));
    if (pendingEntries.length > 0) {
      throw createError(409, "approved_time_set_pending_entries", "All time entries in the window must be approved or rejected before the time set can be approved.");
    }
    const approvedEntries = entriesInRange.filter((entry) => entry.status === "approved");
    if (approvedEntries.length === 0) {
      throw createError(409, "approved_time_set_entries_required", "At least one approved time entry is required to approve a time set.");
    }

    const timeBalances = listTimeBalances({
      companyId: employment.companyId,
      employmentId: employment.employmentId,
      cutoffDate: resolvedEndsOn
    });
    const existing = listApprovedTimeSets({
      companyId: employment.companyId,
      employmentId: employment.employmentId
    }).find((candidate) => candidate.startsOn === resolvedStartsOn && candidate.endsOn === resolvedEndsOn);
    if (existing && existing.status === "locked") {
      throw createError(409, "approved_time_set_locked", "Approved time set is already locked and cannot be replaced.");
    }

    const fingerprint = buildSnapshotHash({
      startsOn: resolvedStartsOn,
      endsOn: resolvedEndsOn,
      entryIds: approvedEntries.map((entry) => entry.timeEntryId),
      statuses: approvedEntries.map((entry) => entry.status),
      updatedAt: approvedEntries.map((entry) => entry.updatedAt),
      balanceSnapshotHash: timeBalances.snapshotHash
    });
    const effectiveStatus = isTimeWindowLocked({
      state,
      companyId: employment.companyId,
      employmentId: employment.employmentId,
      startsOn: resolvedStartsOn,
      endsOn: resolvedEndsOn
    })
      ? "locked"
      : "approved";

    if (existing && existing.timeEntryFingerprint === fingerprint && existing.status === effectiveStatus) {
      return existing;
    }

    const record = {
      approvedTimeSetId: existing?.approvedTimeSetId || crypto.randomUUID(),
      companyId: employment.companyId,
      employeeId: employment.employeeId,
      employmentId: employment.employmentId,
      startsOn: resolvedStartsOn,
      endsOn: resolvedEndsOn,
      approvedEntryIds: approvedEntries.map((entry) => entry.timeEntryId),
      approvedEntryCount: approvedEntries.length,
      timeEntryFingerprint: fingerprint,
      balanceSnapshotHash: timeBalances.snapshotHash,
      status: effectiveStatus,
      note: normalizeOptionalText(note),
      approvedByActorId: requireText(actorId, "actor_id_required"),
      approvedAt: nowIso(clock),
      lockedAt: effectiveStatus === "locked" ? nowIso(clock) : null,
      createdAt: existing?.createdAt || nowIso(clock),
      updatedAt: nowIso(clock)
    };

    state.approvedTimeSets.set(record.approvedTimeSetId, record);
    if (!existing) {
      appendToIndex(state.approvedTimeSetIdsByEmployment, employment.employmentId, record.approvedTimeSetId);
    }
    return copy(record);
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

  function getEmploymentTimeBase({ companyId, employmentId, workDate = null, cutoffDate = null } = {}) {
    const employment = requireEmployment(companyId, employmentId, hrPlatform);
    const resolvedWorkDate = workDate ? normalizeRequiredDate(workDate, "employment_time_base_work_date_invalid") : nowIso(clock).slice(0, 10);
    const resolvedCutoffDate = cutoffDate ? normalizeRequiredDate(cutoffDate, "employment_time_base_cutoff_date_invalid") : resolvedWorkDate;
    const hrSnapshot =
      hrPlatform && typeof hrPlatform.getEmploymentSnapshot === "function"
        ? hrPlatform.getEmploymentSnapshot({
            companyId: employment.companyId,
            employeeId: employment.employeeId,
            employmentId: employment.employmentId,
            snapshotDate: resolvedWorkDate
          })
        : {
            snapshotDate: resolvedWorkDate,
            employee: null,
            employment: copy(employment),
            activeContract: null,
            activeManagerAssignment: null,
            primaryBankAccount: null
          };
    const activeScheduleAssignment = resolveActiveScheduleAssignment({
      state,
      companyId: employment.companyId,
      employmentId: employment.employmentId,
      workDate: resolvedWorkDate
    });
    const scheduleDay = activeScheduleAssignment ? getScheduleDayForDate(activeScheduleAssignment.template, resolvedWorkDate) : null;
    const approvedEntries = listTimeEntries({
      companyId: employment.companyId,
      employmentId: employment.employmentId
    }).filter((entry) => entry.status === "approved" && entry.workDate <= resolvedCutoffDate);
    const approvedTimeSets = listApprovedTimeSets({
      companyId: employment.companyId,
      employmentId: employment.employmentId
    }).filter((timeSet) => timeSet.startsOn <= resolvedCutoffDate);
    const pendingApprovals = listTimeEntries({
      companyId: employment.companyId,
      employmentId: employment.employmentId
    }).filter((entry) => ["draft", "submitted"].includes(entry.status));
    const timeBalances = listTimeBalances({
      companyId: employment.companyId,
      employmentId: employment.employmentId,
      cutoffDate: resolvedCutoffDate
    });
    const balanceSnapshots = resolveExternalBalanceSnapshots({
      companyId: employment.companyId,
      employeeId: employment.employeeId,
      employmentId: employment.employmentId,
      cutoffDate: resolvedCutoffDate,
      balancesPlatform
    });
    const agreementOverlay =
      collectiveAgreementsPlatform && typeof collectiveAgreementsPlatform.evaluateAgreementOverlay === "function"
        ? collectiveAgreementsPlatform.evaluateAgreementOverlay({
            companyId: employment.companyId,
            employeeId: employment.employeeId,
            employmentId: employment.employmentId,
            eventDate: resolvedWorkDate
          })
        : null;

    return {
      companyId: employment.companyId,
      employeeId: employment.employeeId,
      employmentId: employment.employmentId,
      workDate: resolvedWorkDate,
      cutoffDate: resolvedCutoffDate,
      hrSnapshot,
      activeScheduleAssignment: activeScheduleAssignment
        ? {
            ...copy(activeScheduleAssignment),
            scheduleDay
          }
        : null,
      timeBalances,
      balanceSnapshots,
      agreementOverlay,
      approvedTimeSets,
      activeApprovedTimeSet:
        approvedTimeSets
          .filter((timeSet) => timeSet.startsOn <= resolvedWorkDate && timeSet.endsOn >= resolvedWorkDate)
          .sort((left, right) => right.startsOn.localeCompare(left.startsOn))[0] || null,
      approvedTimeEntries: approvedEntries.filter((entry) => entry.workDate === resolvedWorkDate),
      approvedTimeEntryCount: approvedEntries.length,
      pendingTimeEntries: pendingApprovals,
      pendingApprovalCount: pendingApprovals.length
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
    const approvedTimeSetsToLock = resolvedEmployment
      ? listApprovedTimeSets({
          companyId: resolvedCompanyId,
          employmentId: resolvedEmployment.employmentId
        })
      : Array.from(state.approvedTimeSets.values())
          .filter((candidate) => candidate.companyId === resolvedCompanyId)
          .map(copy);
    for (const approvedTimeSet of approvedTimeSetsToLock) {
      if (approvedTimeSet.startsOn >= resolvedStartsOn && approvedTimeSet.endsOn <= resolvedEndsOn) {
        const mutable = state.approvedTimeSets.get(approvedTimeSet.approvedTimeSetId);
        if (mutable && mutable.status !== "locked") {
          mutable.status = "locked";
          mutable.lockedAt = nowIso(clock);
          mutable.updatedAt = mutable.lockedAt;
        }
      }
    }
    return copy(lock);
  }

  function listLeaveTypes({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.leaveTypeIdsByCompany.get(resolvedCompanyId) || [])
      .map((leaveTypeId) => state.leaveTypes.get(leaveTypeId))
      .filter(Boolean)
      .sort((left, right) => left.leaveTypeCode.localeCompare(right.leaveTypeCode))
      .map(copy);
  }

  function createLeaveType({
    companyId,
    leaveTypeCode = null,
    displayName,
    signalType = "none",
    requiresManagerApproval = true,
    requiresSupportingDocument = false,
    active = true,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedCode = resolveSequenceOrValue({
      state,
      companyId: resolvedCompanyId,
      sequenceKey: "leave_type",
      prefix: "LEAVE",
      value: leaveTypeCode,
      requiredCode: "leave_type_code_required"
    });
    ensureUniqueCode(state.leaveTypeIdsByCode, resolvedCompanyId, resolvedCode, "leave_type_code_exists");

    const leaveType = {
      leaveTypeId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      leaveTypeCode: resolvedCode,
      displayName: requireText(displayName, "leave_type_display_name_required"),
      signalType: assertAllowed(signalType || "none", LEAVE_SIGNAL_TYPES, "leave_signal_type_invalid"),
      requiresManagerApproval: requiresManagerApproval !== false,
      requiresSupportingDocument: requiresSupportingDocument === true,
      active: active !== false,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };

    state.leaveTypes.set(leaveType.leaveTypeId, leaveType);
    appendToIndex(state.leaveTypeIdsByCompany, resolvedCompanyId, leaveType.leaveTypeId);
    setIndexValue(state.leaveTypeIdsByCode, resolvedCompanyId, resolvedCode, leaveType.leaveTypeId);
    return copy(leaveType);
  }

  function listLeaveEntries({ companyId, employeeId = null, employmentId = null, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    if (employeeId) {
      requireEmployeeRecord(resolvedCompanyId, employeeId, hrPlatform);
    }
    if (employmentId) {
      requireEmployment(resolvedCompanyId, employmentId, hrPlatform);
    }

    return (state.leaveEntryIdsByCompany.get(resolvedCompanyId) || [])
      .map((leaveEntryId) => state.leaveEntries.get(leaveEntryId))
      .filter(Boolean)
      .filter((candidate) => !employeeId || candidate.employeeId === employeeId)
      .filter((candidate) => !employmentId || candidate.employmentId === employmentId)
      .filter((candidate) => !status || candidate.status === status)
      .sort((left, right) => left.startDate.localeCompare(right.startDate) || left.createdAt.localeCompare(right.createdAt))
      .map((candidate) => enrichLeaveEntry(state, candidate));
  }

  function getLeaveEntry({ companyId, leaveEntryId } = {}) {
    const entry = requireLeaveEntry(companyId, leaveEntryId, state);
    return enrichLeaveEntry(state, entry);
  }

  function createLeaveEntry({
    companyId,
    employmentId,
    leaveTypeId,
    reportingPeriod = null,
    days,
    startDate = null,
    endDate = null,
    note = null,
    supportingDocumentId = null,
    sourceChannel = "employee_portal",
    actorId = "system"
  } = {}) {
    const employment = requireEmployment(companyId, employmentId, hrPlatform);
    const leaveType = requireLeaveType(employment.companyId, leaveTypeId, state);
    const normalizedDays = normalizeLeaveDays(days);
    const { resolvedStartDate, resolvedEndDate } = resolveLeaveDateWindow({
      days: normalizedDays,
      startDate,
      endDate
    });
    const resolvedReportingPeriod = normalizeOptionalReportingPeriod(reportingPeriod, "leave_reporting_period_invalid");
    assertLeaveReportingBoundary({
      leaveType,
      reportingPeriod: resolvedReportingPeriod,
      days: normalizedDays
    });

    assertLeaveSignalsOpen({
      state,
      companyId: employment.companyId,
      employmentId: employment.employmentId,
      reportingPeriod: resolvedReportingPeriod
    });

    const entry = {
      leaveEntryId: crypto.randomUUID(),
      companyId: employment.companyId,
      employeeId: employment.employeeId,
      employmentId: employment.employmentId,
      leaveTypeId: leaveType.leaveTypeId,
      leaveTypeCode: leaveType.leaveTypeCode,
      status: "draft",
      startDate: resolvedStartDate,
      endDate: resolvedEndDate,
      reportingPeriod: resolvedReportingPeriod,
      days: normalizedDays,
      note: normalizeOptionalText(note),
      supportingDocumentId: resolveSupportingDocumentId({
        companyId: employment.companyId,
        supportingDocumentId,
        documentPlatform
      }),
      sourceChannel: requireText(sourceChannel, "leave_source_channel_required"),
      signalCompleteness: buildLeaveSignalCompleteness({
        leaveType,
        reportingPeriod: resolvedReportingPeriod,
        days: normalizedDays
      }),
      managerEmploymentId: null,
      submittedAt: null,
      approvedAt: null,
      rejectedAt: null,
      rejectedReason: null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };

    if (leaveType.requiresSupportingDocument && !entry.supportingDocumentId) {
      throw createError(400, "leave_supporting_document_required", "The chosen leave type requires a supporting document.");
    }

    state.leaveEntries.set(entry.leaveEntryId, entry);
    appendToIndex(state.leaveEntryIdsByCompany, employment.companyId, entry.leaveEntryId);
    appendToIndex(state.leaveEntryIdsByEmployee, employment.employeeId, entry.leaveEntryId);
    appendToIndex(state.leaveEntryIdsByEmployment, employment.employmentId, entry.leaveEntryId);
    replaceLeaveSignalsForEntry({ state, entry, leaveType, clock });
    appendLeaveEntryEvent({
      state,
      entry,
      eventType: "created",
      status: entry.status,
      note: "Leave entry created.",
      actorId
    });
    return enrichLeaveEntry(state, entry);
  }

  function updateLeaveEntry({
    companyId,
    leaveEntryId,
    reportingPeriod = undefined,
    days = undefined,
    startDate = undefined,
    endDate = undefined,
    note = undefined,
    supportingDocumentId = undefined,
    actorId = "system"
  } = {}) {
    const entry = requireLeaveEntry(companyId, leaveEntryId, state);
    if (entry.status !== "draft") {
      throw createError(409, "leave_entry_not_editable", "Only draft leave entries can be edited.");
    }
    const leaveType = requireLeaveType(entry.companyId, entry.leaveTypeId, state);
    const nextReportingPeriod =
      reportingPeriod === undefined
        ? entry.reportingPeriod
        : normalizeOptionalReportingPeriod(reportingPeriod, "leave_reporting_period_invalid");
    assertLeaveSignalsOpen({
      state,
      companyId: entry.companyId,
      employmentId: entry.employmentId,
      reportingPeriod: nextReportingPeriod
    });

    const nextDays = days === undefined ? entry.days : normalizeLeaveDays(days);
    assertLeaveReportingBoundary({
      leaveType,
      reportingPeriod: nextReportingPeriod,
      days: nextDays
    });
    const { resolvedStartDate, resolvedEndDate } = resolveLeaveDateWindow({
      days: nextDays,
      startDate: startDate === undefined ? entry.startDate : startDate,
      endDate: endDate === undefined ? entry.endDate : endDate
    });

    entry.reportingPeriod = nextReportingPeriod;
    entry.days = nextDays;
    entry.startDate = resolvedStartDate;
    entry.endDate = resolvedEndDate;
    if (note !== undefined) {
      entry.note = normalizeOptionalText(note);
    }
    if (supportingDocumentId !== undefined) {
      entry.supportingDocumentId = resolveSupportingDocumentId({
        companyId: entry.companyId,
        supportingDocumentId,
        documentPlatform
      });
    }
    if (leaveType.requiresSupportingDocument && !entry.supportingDocumentId) {
      throw createError(400, "leave_supporting_document_required", "The chosen leave type requires a supporting document.");
    }
    entry.signalCompleteness = buildLeaveSignalCompleteness({
      leaveType,
      reportingPeriod: entry.reportingPeriod,
      days: entry.days
    });
    entry.updatedAt = nowIso(clock);
    replaceLeaveSignalsForEntry({ state, entry, leaveType, clock });
    appendLeaveEntryEvent({
      state,
      entry,
      eventType: "updated",
      status: entry.status,
      note: "Leave entry updated.",
      actorId
    });
    return enrichLeaveEntry(state, entry);
  }

  function submitLeaveEntry({ companyId, leaveEntryId, actorId = "system" } = {}) {
    const entry = requireLeaveEntry(companyId, leaveEntryId, state);
    if (entry.status !== "draft") {
      throw createError(409, "leave_entry_submit_invalid", "Only draft leave entries can be submitted.");
    }
    const leaveType = requireLeaveType(entry.companyId, entry.leaveTypeId, state);
    assertLeaveSignalsOpen({
      state,
      companyId: entry.companyId,
      employmentId: entry.employmentId,
      reportingPeriod: entry.reportingPeriod
    });
    if (leaveType.requiresSupportingDocument && !entry.supportingDocumentId) {
      throw createError(400, "leave_supporting_document_required", "The chosen leave type requires a supporting document.");
    }
    if (!entry.signalCompleteness.complete) {
      throw createError(409, "leave_signals_incomplete", "Leave signals are incomplete for AGI-sensitive absence.");
    }

    const managerAssignment = leaveType.requiresManagerApproval
      ? resolveActiveManagerAssignment({
          companyId: entry.companyId,
          employeeId: entry.employeeId,
          employmentId: entry.employmentId,
          effectiveDate: entry.startDate,
          hrPlatform
        })
      : null;
    if (leaveType.requiresManagerApproval && !managerAssignment) {
      throw createError(409, "leave_manager_approval_missing", "No active manager assignment covers this leave entry.");
    }

    entry.managerEmploymentId = managerAssignment ? managerAssignment.managerEmploymentId : null;
    entry.submittedAt = nowIso(clock);
    entry.updatedAt = entry.submittedAt;

    if (leaveType.requiresManagerApproval) {
      entry.status = "submitted";
      appendLeaveEntryEvent({
        state,
        entry,
        eventType: "submitted",
        status: entry.status,
        note: "Leave entry submitted for manager approval.",
        actorId
      });
    } else {
      entry.status = "approved";
      entry.approvedAt = entry.submittedAt;
      appendLeaveEntryEvent({
        state,
        entry,
        eventType: "submitted",
        status: "submitted",
        note: "Leave entry submitted.",
        actorId
      });
      appendLeaveEntryEvent({
        state,
        entry,
        eventType: "approved",
        status: entry.status,
        note: "Leave entry auto-approved because the leave type does not require manager approval.",
        actorId
      });
    }

    return enrichLeaveEntry(state, entry);
  }

  function approveLeaveEntry({ companyId, leaveEntryId, actorId = "system" } = {}) {
    const entry = requireLeaveEntry(companyId, leaveEntryId, state);
    if (entry.status !== "submitted") {
      throw createError(409, "leave_entry_approval_invalid", "Only submitted leave entries can be approved.");
    }
    assertLeaveSignalsOpen({
      state,
      companyId: entry.companyId,
      employmentId: entry.employmentId,
      reportingPeriod: entry.reportingPeriod
    });

    entry.status = "approved";
    entry.approvedAt = nowIso(clock);
    entry.updatedAt = entry.approvedAt;
    upsertAbsenceDecision({
      state,
      entry,
      leaveType: requireLeaveType(entry.companyId, entry.leaveTypeId, state),
      decisionStatus: "approved",
      actorId,
      clock
    });
    appendLeaveEntryEvent({
      state,
      entry,
      eventType: "approved",
      status: entry.status,
      note: "Leave entry approved.",
      actorId
    });
    return enrichLeaveEntry(state, entry);
  }

  function rejectLeaveEntry({ companyId, leaveEntryId, reason, actorId = "system" } = {}) {
    const entry = requireLeaveEntry(companyId, leaveEntryId, state);
    if (entry.status !== "submitted") {
      throw createError(409, "leave_entry_rejection_invalid", "Only submitted leave entries can be rejected.");
    }
    assertLeaveSignalsOpen({
      state,
      companyId: entry.companyId,
      employmentId: entry.employmentId,
      reportingPeriod: entry.reportingPeriod
    });

    entry.status = "rejected";
    entry.rejectedAt = nowIso(clock);
    entry.updatedAt = entry.rejectedAt;
    entry.rejectedReason = requireText(reason, "leave_rejection_reason_required");
    replaceLeaveSignalsForEntry({
      state,
      entry: {
        ...entry,
        reportingPeriod: null
      },
      leaveType: requireLeaveType(entry.companyId, entry.leaveTypeId, state),
      clock
    });
    upsertAbsenceDecision({
      state,
      entry,
      leaveType: requireLeaveType(entry.companyId, entry.leaveTypeId, state),
      decisionStatus: "rejected",
      actorId,
      clock
    });
    appendLeaveEntryEvent({
      state,
      entry,
      eventType: "rejected",
      status: entry.status,
      note: entry.rejectedReason,
      actorId
    });
    return enrichLeaveEntry(state, entry);
  }

  function listAbsenceDecisions({ companyId, employeeId = null, employmentId = null, reportingPeriod = null, decisionStatus = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    if (employeeId) {
      requireEmployeeRecord(resolvedCompanyId, employeeId, hrPlatform);
    }
    if (employmentId) {
      requireEmployment(resolvedCompanyId, employmentId, hrPlatform);
    }
    const ids =
      employeeId != null
        ? state.absenceDecisionIdsByEmployee.get(employeeId) || []
        : Array.from(state.absenceDecisions.keys());

    return ids
      .map((absenceDecisionId) => state.absenceDecisions.get(absenceDecisionId))
      .filter(Boolean)
      .filter((candidate) => candidate.companyId === resolvedCompanyId)
      .filter((candidate) => !employmentId || candidate.employmentId === employmentId)
      .filter((candidate) => !reportingPeriod || candidate.reportingPeriod === reportingPeriod)
      .filter((candidate) => !decisionStatus || candidate.decisionStatus === decisionStatus)
      .sort((left, right) => left.startDate.localeCompare(right.startDate) || left.decidedAt.localeCompare(right.decidedAt))
      .map(copy);
  }

  function listLeaveSignals({ companyId, employeeId = null, employmentId = null, reportingPeriod = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    if (employeeId) {
      requireEmployeeRecord(resolvedCompanyId, employeeId, hrPlatform);
    }
    if (employmentId) {
      requireEmployment(resolvedCompanyId, employmentId, hrPlatform);
    }
    const ids =
      employeeId != null
        ? state.leaveSignalIdsByEmployee.get(employeeId) || []
        : Array.from(state.leaveSignals.keys());

    return ids
      .map((leaveSignalId) => state.leaveSignals.get(leaveSignalId))
      .filter(Boolean)
      .filter((candidate) => candidate.companyId === resolvedCompanyId)
      .filter((candidate) => !employmentId || candidate.employmentId === employmentId)
      .filter((candidate) => !reportingPeriod || candidate.reportingPeriod === reportingPeriod)
      .sort(
        (left, right) =>
          left.reportingPeriod.localeCompare(right.reportingPeriod) ||
          left.workDate.localeCompare(right.workDate) ||
          left.specificationNo - right.specificationNo
      )
      .map(copy);
  }

  function listLeaveSignalLocks({ companyId, employmentId = null, reportingPeriod = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const keys = employmentId ? [employmentId] : Array.from(state.leaveSignalLockIdsByEmployment.keys());
    const seen = new Set();
    const items = [];

    for (const key of keys) {
      for (const leaveSignalLockId of state.leaveSignalLockIdsByEmployment.get(key) || []) {
        if (seen.has(leaveSignalLockId)) {
          continue;
        }
        const lock = state.leaveSignalLocks.get(leaveSignalLockId);
        if (!lock || lock.companyId !== resolvedCompanyId) {
          continue;
        }
        if (reportingPeriod && lock.reportingPeriod !== reportingPeriod) {
          continue;
        }
        seen.add(leaveSignalLockId);
        items.push(copy(lock));
      }
    }

    return items.sort((left, right) => left.reportingPeriod.localeCompare(right.reportingPeriod));
  }

  function lockLeaveSignals({
    companyId,
    employmentId = null,
    reportingPeriod,
    lockState = "signed",
    note = null,
    sourceReference = null,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedEmployment = employmentId ? requireEmployment(resolvedCompanyId, employmentId, hrPlatform) : null;
    const resolvedReportingPeriod = normalizeRequiredReportingPeriod(reportingPeriod, "leave_reporting_period_required");
    const resolvedLockState = assertAllowed(lockState, LEAVE_SIGNAL_LOCK_STATES, "leave_signal_lock_state_invalid");
    const existing = listLeaveSignalLocks({
      companyId: resolvedCompanyId,
      employmentId: resolvedEmployment ? resolvedEmployment.employmentId : null,
      reportingPeriod: resolvedReportingPeriod
    }).find((candidate) => candidate.lockState === resolvedLockState);
    if (existing) {
      return existing;
    }

    const lock = {
      leaveSignalLockId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      employmentId: resolvedEmployment ? resolvedEmployment.employmentId : null,
      reportingPeriod: resolvedReportingPeriod,
      lockState: resolvedLockState,
      note: normalizeOptionalText(note),
      sourceReference: normalizeOptionalText(sourceReference),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };

    state.leaveSignalLocks.set(lock.leaveSignalLockId, lock);
    appendToIndex(state.leaveSignalLockIdsByEmployment, resolvedEmployment ? resolvedEmployment.employmentId : "*", lock.leaveSignalLockId);
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
      if (hasInternalBalanceTransactionForEntry({
        employmentId: entry.employmentId,
        timeEntryId: entry.timeEntryId,
        balanceType: definition.balanceType,
        state
      })) {
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
      syncExternalBalanceTransaction({
        entry,
        definition
      });
    }
  }

  function syncExternalBalanceTransaction({ entry, definition }) {
    if (!balancesPlatform || typeof balancesPlatform.listBalanceAccounts !== "function") {
      return;
    }
    if (typeof balancesPlatform.getBalanceType === "function") {
      try {
        balancesPlatform.getBalanceType({
          companyId: entry.companyId,
          balanceTypeCode: definition.balanceType
        });
      } catch (error) {
        if (error?.code === "balance_type_not_found") {
          return;
        }
        throw error;
      }
    }
    const matchingAccounts = balancesPlatform.listBalanceAccounts({
      companyId: entry.companyId,
      ownerTypeCode: "employment",
      employeeId: entry.employeeId,
      employmentId: entry.employmentId,
      balanceTypeCode: definition.balanceType
    });
    const targetAccount =
      matchingAccounts[0] ||
      (typeof balancesPlatform.openBalanceAccount === "function"
        ? balancesPlatform.openBalanceAccount({
            companyId: entry.companyId,
            balanceTypeCode: definition.balanceType,
            ownerTypeCode: "employment",
            employeeId: entry.employeeId,
            employmentId: entry.employmentId,
            externalReference: `time:${entry.timeEntryId}`,
            actorId: entry.approvalActorId || entry.createdByActorId
          })
        : null);
    if (!targetAccount || typeof balancesPlatform.recordBalanceTransaction !== "function") {
      return;
    }
    balancesPlatform.recordBalanceTransaction({
      companyId: entry.companyId,
      balanceAccountId: targetAccount.balanceAccountId,
      effectiveDate: entry.workDate,
      transactionTypeCode: definition.deltaMinutes > 0 ? "earn" : "spend",
      quantityDelta: definition.deltaMinutes,
      sourceDomainCode: "TIME",
      sourceObjectType: "time_entry",
      sourceObjectId: entry.timeEntryId,
      sourceReference: entry.timeEntryId,
      idempotencyKey: `time-entry:${entry.timeEntryId}:${definition.balanceType}`,
      explanation: definition.explanation,
      actorId: entry.approvalActorId || entry.createdByActorId
    });
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

function requireTimeEntry({ companyId, employmentId, timeEntryId, state = null }) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const resolvedEmploymentId = requireText(employmentId, "employment_id_required");
  const resolvedTimeEntryId = requireText(timeEntryId, "time_entry_id_required");
  const entry = state.timeEntries.get(resolvedTimeEntryId);
  if (!entry || entry.companyId !== resolvedCompanyId || entry.employmentId !== resolvedEmploymentId) {
    throw createError(404, "time_entry_not_found", "Time entry was not found.");
  }
  return entry;
}

function requireEmployeeRecord(companyId, employeeId, hrPlatform = null) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const resolvedEmployeeId = requireText(employeeId, "employee_id_required");
  if (!hrPlatform) {
    return {
      companyId: resolvedCompanyId,
      employeeId: resolvedEmployeeId
    };
  }
  return hrPlatform.getEmployee({
    companyId: resolvedCompanyId,
    employeeId: resolvedEmployeeId
  });
}

function requireScheduleTemplate(companyId, scheduleTemplateId, state) {
  const template = state.scheduleTemplates.get(requireText(scheduleTemplateId, "schedule_template_id_required"));
  if (!template || template.companyId !== companyId) {
    throw createError(404, "schedule_template_not_found", "Schedule template was not found.");
  }
  return template;
}

function requireLeaveType(companyId, leaveTypeId, state) {
  const leaveType = state.leaveTypes.get(requireText(leaveTypeId, "leave_type_id_required"));
  if (!leaveType || leaveType.companyId !== companyId) {
    throw createError(404, "leave_type_not_found", "Leave type was not found.");
  }
  return leaveType;
}

function requireLeaveEntry(companyId, leaveEntryId, state) {
  const entry = state.leaveEntries.get(requireText(leaveEntryId, "leave_entry_id_required"));
  if (!entry || entry.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "leave_entry_not_found", "Leave entry was not found.");
  }
  return entry;
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

function resolveActiveManagerAssignment({ companyId, employeeId, employmentId, effectiveDate, hrPlatform = null }) {
  if (!hrPlatform) {
    return null;
  }
  return hrPlatform
    .listManagerAssignments({
      companyId,
      employeeId,
      employmentId
    })
    .filter(
      (candidate) =>
        candidate.validFrom <= effectiveDate && (!candidate.validTo || candidate.validTo >= effectiveDate)
    )
    .sort((left, right) => right.validFrom.localeCompare(left.validFrom))[0] || null;
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

function normalizeLeaveDays(days) {
  if (!Array.isArray(days) || days.length === 0) {
    throw createError(400, "leave_days_required", "Leave entry days must be a non-empty array.");
  }
  const seen = new Set();
  return days
    .map((candidate) => {
      const date = normalizeRequiredDate(candidate?.date, "leave_day_date_required");
      if (seen.has(date)) {
        throw createError(409, "leave_day_duplicate", "Each leave day can only appear once per leave entry.");
      }
      seen.add(date);
      const extentPercent = normalizeOptionalBoundedNumber(candidate?.extentPercent, "leave_day_extent_percent_invalid", {
        min: 0,
        max: 100
      });
      const extentHours = normalizeOptionalBoundedNumber(candidate?.extentHours, "leave_day_extent_hours_invalid", {
        min: 0
      });
      if (extentPercent == null && extentHours == null) {
        throw createError(400, "leave_day_extent_required", "Each leave day must carry extent in percent or hours.");
      }
      return {
        date,
        extentPercent,
        extentHours,
        note: normalizeOptionalText(candidate?.note)
      };
    })
    .sort((left, right) => left.date.localeCompare(right.date));
}

function resolveLeaveDateWindow({ days, startDate = null, endDate = null }) {
  const resolvedStartDate = days[0].date;
  const resolvedEndDate = days[days.length - 1].date;
  if (startDate != null && normalizeRequiredDate(startDate, "leave_start_date_invalid") !== resolvedStartDate) {
    throw createError(400, "leave_start_date_mismatch", "Explicit start date must match the first leave day.");
  }
  if (endDate != null && normalizeRequiredDate(endDate, "leave_end_date_invalid") !== resolvedEndDate) {
    throw createError(400, "leave_end_date_mismatch", "Explicit end date must match the last leave day.");
  }
  return {
    resolvedStartDate,
    resolvedEndDate
  };
}

function buildLeaveSignalCompleteness({ leaveType, reportingPeriod, days }) {
  const missingFields = [];
  const resolvedReportingPeriod = normalizeOptionalReportingPeriod(reportingPeriod, "leave_reporting_period_invalid");
  if (leaveType.signalType !== "none" && !resolvedReportingPeriod) {
    missingFields.push("reportingPeriod");
  }
  for (const day of days) {
    if (leaveType.signalType !== "none" && day.extentPercent == null && day.extentHours == null) {
      missingFields.push(`extent:${day.date}`);
    }
  }
  return {
    complete: missingFields.length === 0,
    missingFields
  };
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

function replaceLeaveSignalsForEntry({ state, entry, leaveType, clock }) {
  for (const leaveSignalId of state.leaveSignalIdsByEntry.get(entry.leaveEntryId) || []) {
    const signal = state.leaveSignals.get(leaveSignalId);
    if (signal) {
      removeFromIndex(state.leaveSignalIdsByEmployee, signal.employeeId, leaveSignalId);
    }
    state.leaveSignals.delete(leaveSignalId);
  }
  state.leaveSignalIdsByEntry.set(entry.leaveEntryId, []);

  if (leaveType.signalType === "none") {
    return;
  }

  const reportingPeriod = normalizeOptionalReportingPeriod(entry.reportingPeriod, "leave_reporting_period_invalid");
  if (!reportingPeriod) {
    return;
  }
  entry.days.forEach((day, index) => {
    const signal = {
      leaveSignalId: crypto.randomUUID(),
      companyId: entry.companyId,
      employeeId: entry.employeeId,
      employmentId: entry.employmentId,
      leaveEntryId: entry.leaveEntryId,
      reportingPeriod,
      workDate: day.date,
      specificationNo: index + 1,
      signalType: leaveType.signalType,
      extentPercent: day.extentPercent,
      extentHours: day.extentHours,
      complete: day.extentPercent != null || day.extentHours != null,
      createdAt: nowIso(clock)
    };
    state.leaveSignals.set(signal.leaveSignalId, signal);
    appendToIndex(state.leaveSignalIdsByEntry, entry.leaveEntryId, signal.leaveSignalId);
    appendToIndex(state.leaveSignalIdsByEmployee, entry.employeeId, signal.leaveSignalId);
  });
}

function appendLeaveEntryEvent({ state, entry, eventType, status, note, actorId }) {
  const event = {
    leaveEntryEventId: crypto.randomUUID(),
    companyId: entry.companyId,
    leaveEntryId: entry.leaveEntryId,
    eventType: requireText(eventType, "leave_event_type_required"),
    status: requireText(status, "leave_event_status_required"),
    note: normalizeOptionalText(note),
    actorId: requireText(actorId, "actor_id_required"),
    recordedAt: entry.updatedAt || entry.createdAt
  };
  state.leaveEntryEvents.set(event.leaveEntryEventId, event);
  appendToIndex(state.leaveEntryEventIdsByEntry, entry.leaveEntryId, event.leaveEntryEventId);
}

function enrichLeaveEntry(state, entry) {
  return {
    ...copy(entry),
    absenceDecision: state.absenceDecisionIdByLeaveEntry.has(entry.leaveEntryId)
      ? copy(state.absenceDecisions.get(state.absenceDecisionIdByLeaveEntry.get(entry.leaveEntryId)))
      : null,
    events: (state.leaveEntryEventIdsByEntry.get(entry.leaveEntryId) || [])
      .map((eventId) => state.leaveEntryEvents.get(eventId))
      .filter(Boolean)
      .map(copy),
    signals: (state.leaveSignalIdsByEntry.get(entry.leaveEntryId) || [])
      .map((signalId) => state.leaveSignals.get(signalId))
      .filter(Boolean)
      .map(copy)
  };
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

function isTimeWindowLocked({ state, companyId, employmentId, startsOn, endsOn }) {
  const relevantLocks = [
    ...(state.periodLockIdsByEmployment.get("*") || []),
    ...(state.periodLockIdsByEmployment.get(employmentId) || [])
  ]
    .map((timePeriodLockId) => state.periodLocks.get(timePeriodLockId))
    .filter(Boolean)
    .filter((candidate) => candidate.companyId === companyId);
  return relevantLocks.some((lock) => lock.startsOn <= startsOn && lock.endsOn >= endsOn);
}

function assertLeaveSignalsOpen({ state, companyId, employmentId, reportingPeriod = null }) {
  const resolvedReportingPeriod = normalizeOptionalReportingPeriod(reportingPeriod, "leave_reporting_period_invalid");
  if (!resolvedReportingPeriod) {
    return;
  }

  const relevantLocks = [
    ...(state.leaveSignalLockIdsByEmployment.get("*") || []),
    ...(state.leaveSignalLockIdsByEmployment.get(employmentId) || [])
  ]
    .map((leaveSignalLockId) => state.leaveSignalLocks.get(leaveSignalLockId))
    .filter(Boolean)
    .filter((candidate) => candidate.companyId === companyId && candidate.reportingPeriod === resolvedReportingPeriod);

  if (relevantLocks.length > 0) {
    throw createError(409, "leave_signals_locked", "Leave signals are locked because AGI signing has already started or completed.");
  }
}

function assertLeaveReportingBoundary({ leaveType, reportingPeriod, days }) {
  if (!leaveType || leaveType.signalType === "none") {
    return;
  }
  const resolvedReportingPeriod = normalizeOptionalReportingPeriod(reportingPeriod, "leave_reporting_period_invalid");
  if (!resolvedReportingPeriod) {
    return;
  }
  const periodPrefix = `${resolvedReportingPeriod.slice(0, 4)}-${resolvedReportingPeriod.slice(4, 6)}`;
  for (const day of days) {
    if (!String(day.date).startsWith(periodPrefix)) {
      throw createError(
        409,
        "leave_reporting_period_boundary_invalid",
        "AGI-sensitive leave days must stay inside the selected reporting period."
      );
    }
  }
}

function upsertAbsenceDecision({ state, entry, leaveType, decisionStatus, actorId, clock }) {
  const existingDecisionId = state.absenceDecisionIdByLeaveEntry.get(entry.leaveEntryId) || null;
  const record = {
    absenceDecisionId: existingDecisionId || crypto.randomUUID(),
    companyId: entry.companyId,
    employeeId: entry.employeeId,
    employmentId: entry.employmentId,
    leaveEntryId: entry.leaveEntryId,
    leaveTypeId: entry.leaveTypeId,
    leaveTypeCode: leaveType.leaveTypeCode,
    decisionStatus: requireText(decisionStatus, "absence_decision_status_required"),
    reportingPeriod: entry.reportingPeriod,
    signalType: leaveType.signalType,
    agiSensitive: leaveType.signalType !== "none",
    boundaryValidated: leaveType.signalType === "none" || Boolean(entry.reportingPeriod),
    startDate: entry.startDate,
    endDate: entry.endDate,
    signalCompleteness: copy(entry.signalCompleteness),
    decidedByActorId: requireText(actorId, "actor_id_required"),
    decidedAt: nowIso(clock),
    createdAt: existingDecisionId ? state.absenceDecisions.get(existingDecisionId)?.createdAt || nowIso(clock) : nowIso(clock),
    updatedAt: nowIso(clock)
  };
  state.absenceDecisions.set(record.absenceDecisionId, record);
  state.absenceDecisionIdByLeaveEntry.set(entry.leaveEntryId, record.absenceDecisionId);
  if (!existingDecisionId) {
    appendToIndex(state.absenceDecisionIdsByEmployment, entry.employmentId, record.absenceDecisionId);
    appendToIndex(state.absenceDecisionIdsByEmployee, entry.employeeId, record.absenceDecisionId);
  }
  return copy(record);
}

function buildSnapshotHash(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function normalizeAllocationRefs({ allocationRefs, projectId, activityCode, workedMinutes }) {
  const candidateRefs = Array.isArray(allocationRefs) && allocationRefs.length > 0
    ? allocationRefs
    : projectId || activityCode
      ? [
          {
            projectId,
            activityCode,
            allocationMinutes: workedMinutes
          }
        ]
      : [];
  const normalized = candidateRefs.map((candidate, index) => ({
    allocationRefId: normalizeOptionalText(candidate?.allocationRefId) || `ALLOC-${index + 1}`,
    projectId: normalizeOptionalText(candidate?.projectId),
    activityCode: normalizeOptionalText(candidate?.activityCode),
    allocationMinutes: normalizeNonNegativeInteger(candidate?.allocationMinutes ?? 0, "time_entry_allocation_minutes_invalid")
  }));
  const totalAllocatedMinutes = normalized.reduce((sum, candidate) => sum + candidate.allocationMinutes, 0);
  if (normalized.length > 0 && totalAllocatedMinutes !== workedMinutes) {
    throw createError(
      409,
      "time_entry_allocation_minutes_mismatch",
      "Allocation minutes must sum exactly to worked minutes."
    );
  }
  return normalized;
}

function appendTimeEntryEvent({ entry, eventType, status, note = null, actorId = "system" }) {
  entry.events.push({
    timeEntryEventId: crypto.randomUUID(),
    eventType: requireText(eventType, "time_entry_event_type_required"),
    status: requireText(status, "time_entry_event_status_required"),
    note: normalizeOptionalText(note),
    actorId: requireText(actorId, "actor_id_required"),
    recordedAt: entry.updatedAt || entry.createdAt
  });
}

function enrichTimeEntry(entry) {
  return copy(entry);
}

function hasInternalBalanceTransactionForEntry({ employmentId, timeEntryId, balanceType, state }) {
  return (state.balanceTransactionIdsByEmployment.get(employmentId) || [])
    .map((timeBalanceTransactionId) => state.balanceTransactions.get(timeBalanceTransactionId))
    .filter(Boolean)
    .some((transaction) => transaction.sourceId === timeEntryId && transaction.balanceType === balanceType);
}

function resolveExternalBalanceSnapshots({ companyId, employeeId, employmentId, cutoffDate, balancesPlatform = null }) {
  if (!balancesPlatform || typeof balancesPlatform.listBalanceAccounts !== "function") {
    return [];
  }
  return balancesPlatform
    .listBalanceAccounts({
      companyId,
      ownerTypeCode: "employment",
      employeeId,
      employmentId
    })
    .map((account) => ({
      account,
      snapshot:
        typeof balancesPlatform.getBalanceSnapshot === "function"
          ? balancesPlatform.getBalanceSnapshot({
              companyId,
              balanceAccountId: account.balanceAccountId,
              cutoffDate
            })
          : null
    }));
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

function removeFromIndex(index, key, value) {
  if (!index.has(key)) {
    return;
  }
  index.set(
    key,
    index.get(key).filter((candidate) => candidate !== value)
  );
}

function resolveSupportingDocumentId({ companyId, supportingDocumentId, documentPlatform = null }) {
  const resolvedDocumentId = normalizeOptionalText(supportingDocumentId);
  if (!resolvedDocumentId) {
    return null;
  }
  if (documentPlatform) {
    documentPlatform.getDocumentRecord({
      companyId,
      documentId: resolvedDocumentId
    });
  }
  return resolvedDocumentId;
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

function normalizeRequiredReportingPeriod(value, code) {
  const resolvedValue = requireText(value, code);
  if (!/^\d{6}$/.test(resolvedValue)) {
    throw createError(400, code, "Reporting period must be in YYYYMM format.");
  }
  return resolvedValue;
}

function normalizeOptionalReportingPeriod(value, code) {
  if (value == null || value === "") {
    return null;
  }
  return normalizeRequiredReportingPeriod(String(value), code);
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

function normalizeOptionalBoundedNumber(value, code, { min = null, max = null } = {}) {
  if (value == null || value === "") {
    return null;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw createError(400, code, "Value must be numeric.");
  }
  if (min != null && value < min) {
    throw createError(400, code, "Value is below the allowed minimum.");
  }
  if (max != null && value > max) {
    throw createError(400, code, "Value is above the allowed maximum.");
  }
  return value;
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

