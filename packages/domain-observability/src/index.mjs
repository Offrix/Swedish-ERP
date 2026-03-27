import crypto from "node:crypto";

export const OBSERVABILITY_LOG_LEVELS = Object.freeze(["debug", "info", "warn", "error", "critical"]);
export const TRACE_SPAN_STATUSES = Object.freeze(["running", "completed", "failed"]);
export const INVARIANT_ALARM_STATES = Object.freeze(["open", "acknowledged", "resolved"]);

const GLOBAL_SCOPE_KEY = "__global__";

export function createObservabilityPlatform(options = {}) {
  return createObservabilityEngine(options);
}

export function createObservabilityEngine({
  clock = () => new Date()
} = {}) {
  const state = {
    structuredLogs: new Map(),
    structuredLogIdsByScope: new Map(),
    traceSpans: new Map(),
    traceSpanIdsByScope: new Map(),
    invariantAlarms: new Map(),
    invariantAlarmIdsByScope: new Map()
  };

  return {
    observabilityLogLevels: OBSERVABILITY_LOG_LEVELS,
    traceSpanStatuses: TRACE_SPAN_STATUSES,
    invariantAlarmStates: INVARIANT_ALARM_STATES,
    recordStructuredLog,
    listStructuredLogs,
    startTraceSpan,
    completeTraceSpan,
    failTraceSpan,
    listTraceSpans,
    listTraceChains,
    synchronizeInvariantAlarm,
    acknowledgeInvariantAlarm,
    resolveInvariantAlarm,
    listInvariantAlarms,
    exportDurableState,
    importDurableState
  };

  function recordStructuredLog({
    companyId = null,
    surfaceCode,
    severity = "info",
    eventCode,
    message = null,
    correlationId = null,
    traceId = null,
    spanId = null,
    sourceObjectType = null,
    sourceObjectId = null,
    actorId = "system",
    metadata = {},
    recordedAt = null
  } = {}) {
    const resolvedSeverity = assertAllowed(severity, OBSERVABILITY_LOG_LEVELS, "observability_log_level_invalid");
    const resolvedSurfaceCode = text(surfaceCode, "observability_surface_code_required");
    const resolvedEventCode = text(eventCode, "observability_event_code_required");
    const resolvedRecordedAt = isoTimestamp(recordedAt || nowIso(clock), "observability_recorded_at_invalid");
    const logRecord = {
      logId: crypto.randomUUID(),
      companyId: optionalText(companyId),
      surfaceCode: resolvedSurfaceCode,
      severity: resolvedSeverity,
      eventCode: resolvedEventCode,
      message: optionalText(message) || resolvedEventCode,
      correlationId: optionalText(correlationId),
      traceId: optionalText(traceId) || optionalText(correlationId),
      spanId: optionalText(spanId),
      sourceObjectType: optionalText(sourceObjectType),
      sourceObjectId: optionalText(sourceObjectId),
      actorId: text(actorId || "system", "observability_actor_id_required"),
      metadataJson: clone(metadata || {}),
      recordedAt: resolvedRecordedAt
    };
    state.structuredLogs.set(logRecord.logId, logRecord);
    appendToScopeIndex(state.structuredLogIdsByScope, logRecord.companyId, logRecord.logId);
    return clone(logRecord);
  }

  function listStructuredLogs({
    companyId = null,
    includeGlobal = true,
    surfaceCode = null,
    severity = null,
    eventCode = null,
    correlationId = null,
    traceId = null,
    limit = 100
  } = {}) {
    const safeLimit = normalizeLimit(limit);
    const resolvedSeverity = severity == null ? null : assertAllowed(severity, OBSERVABILITY_LOG_LEVELS, "observability_log_level_invalid");
    const ids = collectScopeIds(state.structuredLogIdsByScope, optionalText(companyId), includeGlobal);
    return ids
      .map((logId) => state.structuredLogs.get(logId))
      .filter(Boolean)
      .filter((record) => (surfaceCode ? record.surfaceCode === surfaceCode : true))
      .filter((record) => (resolvedSeverity ? record.severity === resolvedSeverity : true))
      .filter((record) => (eventCode ? record.eventCode === eventCode : true))
      .filter((record) => (correlationId ? record.correlationId === correlationId : true))
      .filter((record) => (traceId ? record.traceId === traceId : true))
      .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt) || right.logId.localeCompare(left.logId))
      .slice(0, safeLimit)
      .map(clone);
  }

  function startTraceSpan({
    companyId = null,
    traceCode,
    traceId = null,
    parentSpanId = null,
    correlationId = null,
    sourceObjectType = null,
    sourceObjectId = null,
    actorId = "system",
    attributes = {},
    startedAt = null
  } = {}) {
    const resolvedStartedAt = isoTimestamp(startedAt || nowIso(clock), "trace_span_started_at_invalid");
    const span = {
      spanId: crypto.randomUUID(),
      traceId: optionalText(traceId) || optionalText(correlationId) || crypto.randomUUID(),
      companyId: optionalText(companyId),
      traceCode: text(traceCode, "trace_code_required"),
      parentSpanId: optionalText(parentSpanId),
      correlationId: optionalText(correlationId),
      sourceObjectType: optionalText(sourceObjectType),
      sourceObjectId: optionalText(sourceObjectId),
      actorId: text(actorId || "system", "trace_actor_id_required"),
      attributesJson: clone(attributes || {}),
      status: "running",
      outcomeCode: null,
      errorCode: null,
      errorMessage: null,
      resultSummaryJson: null,
      startedAt: resolvedStartedAt,
      completedAt: null,
      updatedAt: resolvedStartedAt
    };
    state.traceSpans.set(span.spanId, span);
    appendToScopeIndex(state.traceSpanIdsByScope, span.companyId, span.spanId);
    return clone(span);
  }

  function completeTraceSpan({
    spanId,
    outcomeCode = "success",
    resultSummary = {},
    completedAt = null
  } = {}) {
    const span = requireTraceSpan(spanId);
    const resolvedCompletedAt = isoTimestamp(completedAt || nowIso(clock), "trace_span_completed_at_invalid");
    span.status = "completed";
    span.outcomeCode = text(outcomeCode, "trace_outcome_code_required");
    span.errorCode = null;
    span.errorMessage = null;
    span.resultSummaryJson = clone(resultSummary || {});
    span.completedAt = resolvedCompletedAt;
    span.updatedAt = resolvedCompletedAt;
    return clone(span);
  }

  function failTraceSpan({
    spanId,
    errorCode,
    errorMessage,
    resultSummary = {},
    completedAt = null
  } = {}) {
    const span = requireTraceSpan(spanId);
    const resolvedCompletedAt = isoTimestamp(completedAt || nowIso(clock), "trace_span_completed_at_invalid");
    span.status = "failed";
    span.outcomeCode = "failed";
    span.errorCode = text(errorCode || "trace_failed", "trace_error_code_required");
    span.errorMessage = text(errorMessage || "Trace span failed.", "trace_error_message_required");
    span.resultSummaryJson = clone(resultSummary || {});
    span.completedAt = resolvedCompletedAt;
    span.updatedAt = resolvedCompletedAt;
    return clone(span);
  }

  function listTraceSpans({
    companyId = null,
    includeGlobal = true,
    traceId = null,
    correlationId = null,
    status = null,
    limit = 200
  } = {}) {
    const safeLimit = normalizeLimit(limit, 500);
    const resolvedStatus = status == null ? null : assertAllowed(status, TRACE_SPAN_STATUSES, "trace_span_status_invalid");
    const ids = collectScopeIds(state.traceSpanIdsByScope, optionalText(companyId), includeGlobal);
    return ids
      .map((spanId) => state.traceSpans.get(spanId))
      .filter(Boolean)
      .filter((span) => (traceId ? span.traceId === traceId : true))
      .filter((span) => (correlationId ? span.correlationId === correlationId : true))
      .filter((span) => (resolvedStatus ? span.status === resolvedStatus : true))
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt) || right.spanId.localeCompare(left.spanId))
      .slice(0, safeLimit)
      .map(clone);
  }

  function listTraceChains({
    companyId = null,
    includeGlobal = true,
    limit = 100
  } = {}) {
    const safeLimit = normalizeLimit(limit);
    const spans = listTraceSpans({
      companyId,
      includeGlobal,
      limit: 1000
    });
    const logs = listStructuredLogs({
      companyId,
      includeGlobal,
      limit: 1000
    });
    const logsByTraceId = logs.reduce((accumulator, record) => {
      const key = record.traceId || record.correlationId || null;
      if (!key) {
        return accumulator;
      }
      if (!accumulator.has(key)) {
        accumulator.set(key, []);
      }
      accumulator.get(key).push(record);
      return accumulator;
    }, new Map());

    const traces = new Map();
    for (const span of spans) {
      const existing = traces.get(span.traceId) || {
        traceId: span.traceId,
        companyIds: new Set(),
        correlationIds: new Set(),
        sourceObjects: new Map(),
        spanCount: 0,
        runningSpanCount: 0,
        failedSpanCount: 0,
        startedAt: span.startedAt,
        completedAt: span.completedAt,
        status: span.status,
        surfaceCodes: new Set(),
        traceCodes: new Set(),
        latestUpdatedAt: span.updatedAt || span.startedAt
      };
      if (span.companyId) {
        existing.companyIds.add(span.companyId);
      }
      if (span.correlationId) {
        existing.correlationIds.add(span.correlationId);
      }
      if (span.sourceObjectType && span.sourceObjectId) {
        existing.sourceObjects.set(`${span.sourceObjectType}:${span.sourceObjectId}`, {
          sourceObjectType: span.sourceObjectType,
          sourceObjectId: span.sourceObjectId
        });
      }
      existing.spanCount += 1;
      if (span.status === "running") {
        existing.runningSpanCount += 1;
      }
      if (span.status === "failed") {
        existing.failedSpanCount += 1;
      }
      existing.startedAt = existing.startedAt.localeCompare(span.startedAt) <= 0 ? existing.startedAt : span.startedAt;
      if (!existing.completedAt || (span.completedAt && existing.completedAt.localeCompare(span.completedAt) < 0)) {
        existing.completedAt = span.completedAt || existing.completedAt;
      }
      if (!existing.latestUpdatedAt || existing.latestUpdatedAt.localeCompare(span.updatedAt || span.startedAt) < 0) {
        existing.latestUpdatedAt = span.updatedAt || span.startedAt;
      }
      if (span.attributesJson?.surfaceCode) {
        existing.surfaceCodes.add(span.attributesJson.surfaceCode);
      }
      existing.traceCodes.add(span.traceCode);
      if (span.status === "failed") {
        existing.status = "failed";
      } else if (existing.status !== "failed" && span.status === "running") {
        existing.status = "running";
      } else if (existing.status !== "failed" && existing.status !== "running") {
        existing.status = "completed";
      }
      traces.set(span.traceId, existing);
    }

    for (const [traceId, traceLogs] of logsByTraceId.entries()) {
      const existing = traces.get(traceId) || {
        traceId,
        companyIds: new Set(),
        correlationIds: new Set(),
        sourceObjects: new Map(),
        spanCount: 0,
        runningSpanCount: 0,
        failedSpanCount: 0,
        startedAt: traceLogs[0]?.recordedAt || nowIso(clock),
        completedAt: null,
        status: "running",
        surfaceCodes: new Set(),
        traceCodes: new Set(),
        latestUpdatedAt: traceLogs[0]?.recordedAt || nowIso(clock)
      };
      for (const record of traceLogs) {
        if (record.companyId) {
          existing.companyIds.add(record.companyId);
        }
        if (record.correlationId) {
          existing.correlationIds.add(record.correlationId);
        }
        if (record.sourceObjectType && record.sourceObjectId) {
          existing.sourceObjects.set(`${record.sourceObjectType}:${record.sourceObjectId}`, {
            sourceObjectType: record.sourceObjectType,
            sourceObjectId: record.sourceObjectId
          });
        }
        existing.surfaceCodes.add(record.surfaceCode);
        if (!existing.latestUpdatedAt || existing.latestUpdatedAt.localeCompare(record.recordedAt) < 0) {
          existing.latestUpdatedAt = record.recordedAt;
        }
        existing.startedAt = existing.startedAt.localeCompare(record.recordedAt) <= 0 ? existing.startedAt : record.recordedAt;
      }
      traces.set(traceId, existing);
    }

    return [...traces.values()]
      .map((trace) => {
        const traceLogs = logsByTraceId.get(trace.traceId) || [];
        return {
          traceId: trace.traceId,
          status: trace.status,
          startedAt: trace.startedAt,
          completedAt: trace.completedAt,
          latestUpdatedAt: trace.latestUpdatedAt,
          spanCount: trace.spanCount,
          runningSpanCount: trace.runningSpanCount,
          failedSpanCount: trace.failedSpanCount,
          logCount: traceLogs.length,
          companyIds: [...trace.companyIds].sort(),
          correlationIds: [...trace.correlationIds].sort(),
          surfaceCodes: [...trace.surfaceCodes].sort(),
          traceCodes: [...trace.traceCodes].sort(),
          sourceObjects: [...trace.sourceObjects.values()].sort((left, right) =>
            left.sourceObjectType.localeCompare(right.sourceObjectType)
            || left.sourceObjectId.localeCompare(right.sourceObjectId)
          ),
          latestLogLevel: traceLogs.map((record) => record.severity).sort(compareLogSeverity).slice(-1)[0] || null
        };
      })
      .sort((left, right) => right.latestUpdatedAt.localeCompare(left.latestUpdatedAt) || right.traceId.localeCompare(left.traceId))
      .slice(0, safeLimit)
      .map(clone);
  }

  function synchronizeInvariantAlarm({
    companyId = null,
    alarmCode,
    sourceObjectType = null,
    sourceObjectId = null,
    severity = "high",
    summary,
    metadata = {},
    correlationId = null,
    actorId = "system",
    active = true,
    resolutionCode = "condition_cleared"
  } = {}) {
    const key = invariantAlarmKey({
      companyId,
      alarmCode,
      sourceObjectType,
      sourceObjectId
    });
    const existing = state.invariantAlarms.get(key) || null;
    if (active !== true) {
      if (!existing || existing.state === "resolved") {
        return null;
      }
      existing.state = "resolved";
      existing.resolvedAt = nowIso(clock);
      existing.resolutionCode = text(resolutionCode || "condition_cleared", "invariant_alarm_resolution_code_required");
      existing.updatedAt = existing.resolvedAt;
      existing.lastActorId = text(actorId || "system", "invariant_alarm_actor_id_required");
      return clone(existing);
    }

    const resolvedSeverity = assertAllowed(severity, ["low", "medium", "high", "critical"], "invariant_alarm_severity_invalid");
    const openedAt = nowIso(clock);
    const alarm = existing || {
      invariantAlarmId: crypto.randomUUID(),
      companyId: optionalText(companyId),
      alarmCode: text(alarmCode, "invariant_alarm_code_required"),
      sourceObjectType: optionalText(sourceObjectType),
      sourceObjectId: optionalText(sourceObjectId),
      firstOpenedAt: openedAt,
      lastRaisedAt: openedAt,
      resolvedAt: null,
      resolutionCode: null,
      occurrenceCount: 0,
      createdAt: openedAt,
      updatedAt: openedAt,
      state: "open"
    };
    alarm.severity = resolvedSeverity;
    alarm.summary = text(summary, "invariant_alarm_summary_required");
    alarm.metadataJson = clone(metadata || {});
    alarm.correlationId = optionalText(correlationId);
    alarm.lastActorId = text(actorId || "system", "invariant_alarm_actor_id_required");
    alarm.lastRaisedAt = openedAt;
    alarm.updatedAt = openedAt;
    alarm.occurrenceCount += 1;
    alarm.state = "open";
    alarm.resolvedAt = null;
    alarm.resolutionCode = null;
    state.invariantAlarms.set(key, alarm);
    if (!existing) {
      appendToScopeIndex(state.invariantAlarmIdsByScope, alarm.companyId, key);
    }
    return clone(alarm);
  }

  function acknowledgeInvariantAlarm({
    invariantAlarmId,
    actorId = "system"
  } = {}) {
    const alarm = requireInvariantAlarmById(invariantAlarmId);
    if (alarm.state === "resolved") {
      return clone(alarm);
    }
    alarm.state = "acknowledged";
    alarm.updatedAt = nowIso(clock);
    alarm.lastActorId = text(actorId || "system", "invariant_alarm_actor_id_required");
    return clone(alarm);
  }

  function resolveInvariantAlarm({
    invariantAlarmId = null,
    companyId = null,
    alarmCode = null,
    sourceObjectType = null,
    sourceObjectId = null,
    resolutionCode = "condition_cleared",
    actorId = "system"
  } = {}) {
    const alarm =
      invariantAlarmId != null
        ? requireInvariantAlarmById(invariantAlarmId)
        : state.invariantAlarms.get(
            invariantAlarmKey({
              companyId,
              alarmCode,
              sourceObjectType,
              sourceObjectId
            })
          );
    if (!alarm) {
      return null;
    }
    if (alarm.state === "resolved") {
      return clone(alarm);
    }
    alarm.state = "resolved";
    alarm.resolvedAt = nowIso(clock);
    alarm.resolutionCode = text(resolutionCode, "invariant_alarm_resolution_code_required");
    alarm.updatedAt = alarm.resolvedAt;
    alarm.lastActorId = text(actorId || "system", "invariant_alarm_actor_id_required");
    return clone(alarm);
  }

  function listInvariantAlarms({
    companyId = null,
    includeGlobal = true,
    state: requestedState = null,
    severity = null,
    limit = 200
  } = {}) {
    const safeLimit = normalizeLimit(limit, 500);
    const resolvedState = requestedState == null ? null : assertAllowed(requestedState, INVARIANT_ALARM_STATES, "invariant_alarm_state_invalid");
    const resolvedSeverity = severity == null ? null : assertAllowed(severity, ["low", "medium", "high", "critical"], "invariant_alarm_severity_invalid");
    const ids = collectScopeIds(state.invariantAlarmIdsByScope, optionalText(companyId), includeGlobal);
    return ids
      .map((alarmId) => state.invariantAlarms.get(alarmId))
      .filter(Boolean)
      .filter((alarm) => (resolvedState ? alarm.state === resolvedState : true))
      .filter((alarm) => (resolvedSeverity ? alarm.severity === resolvedSeverity : true))
      .sort((left, right) => right.lastRaisedAt.localeCompare(left.lastRaisedAt) || right.invariantAlarmId.localeCompare(left.invariantAlarmId))
      .slice(0, safeLimit)
      .map(clone);
  }

  function exportDurableState() {
    return clone({
      structuredLogs: [...state.structuredLogs.values()],
      traceSpans: [...state.traceSpans.values()],
      invariantAlarms: [...state.invariantAlarms.values()]
    });
  }

  function importDurableState(snapshot = {}) {
    clearState();
    for (const record of Array.isArray(snapshot.structuredLogs) ? snapshot.structuredLogs : []) {
      state.structuredLogs.set(record.logId, clone(record));
      appendToScopeIndex(state.structuredLogIdsByScope, record.companyId || null, record.logId);
    }
    for (const record of Array.isArray(snapshot.traceSpans) ? snapshot.traceSpans : []) {
      state.traceSpans.set(record.spanId, clone(record));
      appendToScopeIndex(state.traceSpanIdsByScope, record.companyId || null, record.spanId);
    }
    for (const record of Array.isArray(snapshot.invariantAlarms) ? snapshot.invariantAlarms : []) {
      const key = invariantAlarmKey({
        companyId: record.companyId || null,
        alarmCode: record.alarmCode,
        sourceObjectType: record.sourceObjectType || null,
        sourceObjectId: record.sourceObjectId || null
      });
      state.invariantAlarms.set(key, clone(record));
      appendToScopeIndex(state.invariantAlarmIdsByScope, record.companyId || null, key);
    }
  }

  function requireTraceSpan(spanId) {
    const span = state.traceSpans.get(text(spanId, "trace_span_id_required"));
    if (!span) {
      throw createError("trace_span_not_found", "Trace span was not found.");
    }
    return span;
  }

  function requireInvariantAlarmById(invariantAlarmId) {
    const resolvedId = text(invariantAlarmId, "invariant_alarm_id_required");
    const alarm = [...state.invariantAlarms.values()].find((candidate) => candidate.invariantAlarmId === resolvedId);
    if (!alarm) {
      throw createError("invariant_alarm_not_found", "Invariant alarm was not found.");
    }
    return alarm;
  }

  function clearState() {
    state.structuredLogs.clear();
    state.structuredLogIdsByScope.clear();
    state.traceSpans.clear();
    state.traceSpanIdsByScope.clear();
    state.invariantAlarms.clear();
    state.invariantAlarmIdsByScope.clear();
  }
}

function createError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function text(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createError(code, `${code} is required.`);
  }
  return value.trim();
}

function optionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

function isoTimestamp(value, code) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw createError(code, `${code} must be a valid ISO timestamp.`);
  }
  return parsed.toISOString();
}

function assertAllowed(value, allowedValues, code) {
  if (!allowedValues.includes(value)) {
    throw createError(code, `${code} must be one of ${allowedValues.join(", ")}.`);
  }
  return value;
}

function normalizeLimit(value, fallback = 100) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return fallback;
  }
  return Math.max(1, Math.min(Math.trunc(normalized), 1000));
}

function scopeKey(companyId) {
  return optionalText(companyId) || GLOBAL_SCOPE_KEY;
}

function appendToScopeIndex(index, companyId, recordId) {
  const key = scopeKey(companyId);
  if (!index.has(key)) {
    index.set(key, []);
  }
  const existing = index.get(key);
  if (!existing.includes(recordId)) {
    existing.push(recordId);
  }
}

function collectScopeIds(index, companyId, includeGlobal) {
  const ids = [];
  const companyKey = scopeKey(companyId);
  if (companyKey !== GLOBAL_SCOPE_KEY) {
    ids.push(...(index.get(companyKey) || []));
  }
  if (includeGlobal !== false) {
    ids.push(...(index.get(GLOBAL_SCOPE_KEY) || []));
  }
  return [...new Set(ids)];
}

function invariantAlarmKey({ companyId = null, alarmCode, sourceObjectType = null, sourceObjectId = null } = {}) {
  return [
    scopeKey(companyId),
    text(alarmCode, "invariant_alarm_code_required"),
    optionalText(sourceObjectType) || "_",
    optionalText(sourceObjectId) || "_"
  ].join("::");
}

function compareLogSeverity(left, right) {
  return OBSERVABILITY_LOG_LEVELS.indexOf(left) - OBSERVABILITY_LOG_LEVELS.indexOf(right);
}
