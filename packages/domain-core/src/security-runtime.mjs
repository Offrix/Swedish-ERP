import crypto from "node:crypto";
import { cloneValue as clone } from "./clone.mjs";

export const SECURITY_ALERT_SEVERITIES = Object.freeze(["low", "medium", "high", "critical"]);
export const SECURITY_ALERT_STATES = Object.freeze(["open", "acknowledged", "resolved"]);
export const SECURITY_RISK_LEVELS = Object.freeze(["low", "medium", "high", "critical"]);

const GLOBAL_COMPANY_ID = "__global__";

export function createSecurityRuntimePlatform(options = {}) {
  return createSecurityRuntimeEngine(options);
}

export function createSecurityRuntimeEngine({
  clock = () => new Date()
} = {}) {
  const state = {
    budgets: new Map(),
    failureSeries: new Map(),
    alerts: new Map(),
    riskSubjects: new Map()
  };

  const engine = {
    securityAlertSeverities: SECURITY_ALERT_SEVERITIES,
    securityAlertStates: SECURITY_ALERT_STATES,
    securityRiskLevels: SECURITY_RISK_LEVELS,
    consumeSecurityBudget,
    assertSecurityFailureSeriesOpen,
    recordSecurityFailureSeries,
    clearSecurityFailureSeries,
    recordSecurityAnomaly,
    getSecurityRiskSummary,
    listSecurityAlerts,
    listSecurityBudgets,
    listSecurityFailureSeries,
    snapshotSecurityRuntime
  };

  Object.defineProperty(engine, "__durableState", {
    value: state,
    enumerable: false
  });

  return engine;

  function current() {
    return new Date(clock());
  }

  function consumeSecurityBudget({
    companyId = null,
    budgetCode,
    subjectKey,
    subjectType = null,
    subjectId = null,
    actorId = null,
    ipAddress = null,
    limit,
    windowMs,
    lockoutMs = null,
    errorStatus = 429,
    errorCode = "security_rate_limited",
    errorMessage = "Too many security-sensitive requests. Try again later.",
    alertCode = null,
    alertSeverity = "high",
    riskScore = 20,
    metadata = {}
  } = {}) {
    const resolvedBudgetCode = requireText(budgetCode, "security_budget_code_required");
    const resolvedSubjectKey = requireText(subjectKey, "security_budget_subject_key_required");
    const resolvedWindowMs = requirePositiveInteger(windowMs, "security_budget_window_invalid");
    const resolvedLimit = requirePositiveInteger(limit, "security_budget_limit_invalid");
    const resolvedCompanyId = normalizeCompanyId(companyId);
    const budget = resolveBudget({
      companyId: resolvedCompanyId,
      budgetCode: resolvedBudgetCode,
      subjectKey: resolvedSubjectKey,
      actorId,
      ipAddress
    });

    refreshBudgetWindow(budget, resolvedWindowMs);
    if (budget.lockedUntil && new Date(budget.lockedUntil) > current()) {
      raiseBudgetAlert({
        companyId: resolvedCompanyId,
        budget,
        subjectType,
        subjectId,
        actorId,
        ipAddress,
        alertCode: alertCode || `${resolvedBudgetCode}_rate_limited`,
        alertSeverity,
        riskScore,
        metadata: {
          ...metadata,
          limit: resolvedLimit,
          windowMs: resolvedWindowMs,
          lockedUntil: budget.lockedUntil
        }
      });
      throw createSecurityError(errorStatus, errorCode, errorMessage, {
        preserveDurableStateOnFailure: true,
        retryable: true,
        details: [
          {
            field: resolvedBudgetCode,
            issue: "budget_locked",
            lockedUntil: budget.lockedUntil
          }
        ]
      });
    }

    if (budget.count >= resolvedLimit) {
      budget.lockedUntil = isoDate(new Date(current().getTime() + Number(lockoutMs || resolvedWindowMs)));
      budget.updatedAt = isoDate();
      raiseBudgetAlert({
        companyId: resolvedCompanyId,
        budget,
        subjectType,
        subjectId,
        actorId,
        ipAddress,
        alertCode: alertCode || `${resolvedBudgetCode}_rate_limited`,
        alertSeverity,
        riskScore,
        metadata: {
          ...metadata,
          limit: resolvedLimit,
          windowMs: resolvedWindowMs,
          lockedUntil: budget.lockedUntil
        }
      });
      throw createSecurityError(errorStatus, errorCode, errorMessage, {
        preserveDurableStateOnFailure: true,
        retryable: true,
        details: [
          {
            field: resolvedBudgetCode,
            issue: "budget_limit_exceeded",
            limit: resolvedLimit,
            windowMs: resolvedWindowMs,
            lockedUntil: budget.lockedUntil
          }
        ]
      });
    }

    budget.count += 1;
    budget.lastConsumedAt = isoDate();
    budget.updatedAt = budget.lastConsumedAt;
    budget.metadata = clone(metadata || {});
    return clone(budget);
  }

  function assertSecurityFailureSeriesOpen({
    companyId = null,
    seriesCode,
    subjectKey,
    errorStatus = 429,
    errorCode = "security_series_locked",
    errorMessage = "Security verification is temporarily locked."
  } = {}) {
    const resolvedCompanyId = normalizeCompanyId(companyId);
    const resolvedSeriesCode = requireText(seriesCode, "security_series_code_required");
    const resolvedSubjectKey = requireText(subjectKey, "security_series_subject_key_required");
    const series = state.failureSeries.get(buildScopedKey(resolvedCompanyId, resolvedSeriesCode, resolvedSubjectKey));
    if (!series) {
      return null;
    }
    refreshFailureSeriesWindow(series, series.windowMs);
    if (series.lockedUntil && new Date(series.lockedUntil) > current()) {
      throw createSecurityError(errorStatus, errorCode, errorMessage, {
        preserveDurableStateOnFailure: true,
        retryable: true,
        details: [
          {
            field: resolvedSeriesCode,
            issue: "series_locked",
            lockedUntil: series.lockedUntil
          }
        ]
      });
    }
    return clone(series);
  }

  function recordSecurityFailureSeries({
    companyId = null,
    seriesCode,
    subjectKey,
    subjectType = null,
    subjectId = null,
    actorId = null,
    ipAddress = null,
    threshold,
    windowMs,
    lockoutMs,
    alertCode = null,
    alertSeverity = "high",
    riskScore = 25,
    metadata = {}
  } = {}) {
    const resolvedCompanyId = normalizeCompanyId(companyId);
    const resolvedSeriesCode = requireText(seriesCode, "security_series_code_required");
    const resolvedSubjectKey = requireText(subjectKey, "security_series_subject_key_required");
    const resolvedThreshold = requirePositiveInteger(threshold, "security_series_threshold_invalid");
    const resolvedWindowMs = requirePositiveInteger(windowMs, "security_series_window_invalid");
    const resolvedLockoutMs = requirePositiveInteger(lockoutMs, "security_series_lockout_invalid");
    const key = buildScopedKey(resolvedCompanyId, resolvedSeriesCode, resolvedSubjectKey);
    const series = state.failureSeries.get(key) || {
      failureSeriesId: crypto.randomUUID(),
      companyId: resolvedCompanyId === GLOBAL_COMPANY_ID ? null : resolvedCompanyId,
      seriesCode: resolvedSeriesCode,
      subjectKey: resolvedSubjectKey,
      threshold: resolvedThreshold,
      windowMs: resolvedWindowMs,
      failureCount: 0,
      windowStartedAt: null,
      lastFailureAt: null,
      lastSuccessAt: null,
      lockedUntil: null,
      actorId: actorId || null,
      ipAddress: ipAddress || null,
      metadata: {},
      createdAt: isoDate(),
      updatedAt: isoDate()
    };

    refreshFailureSeriesWindow(series, resolvedWindowMs);
    series.failureCount += 1;
    series.lastFailureAt = isoDate();
    series.updatedAt = series.lastFailureAt;
    series.actorId = actorId || series.actorId || null;
    series.ipAddress = ipAddress || series.ipAddress || null;
    series.metadata = clone(metadata || {});
    state.failureSeries.set(key, series);

    if (series.failureCount >= resolvedThreshold) {
      series.lockedUntil = isoDate(new Date(current().getTime() + resolvedLockoutMs));
      series.updatedAt = isoDate();
      raiseBudgetAlert({
        companyId: resolvedCompanyId,
        budget: {
          budgetCode: resolvedSeriesCode,
          subjectKey: resolvedSubjectKey,
          count: series.failureCount,
          lockedUntil: series.lockedUntil
        },
        subjectType,
        subjectId,
        actorId,
        ipAddress,
        alertCode: alertCode || `${resolvedSeriesCode}_locked`,
        alertSeverity,
        riskScore,
        metadata: {
          ...metadata,
          threshold: resolvedThreshold,
          windowMs: resolvedWindowMs,
          lockedUntil: series.lockedUntil
        }
      });
    }

    return clone(series);
  }

  function clearSecurityFailureSeries({
    companyId = null,
    seriesCode,
    subjectKey
  } = {}) {
    const resolvedCompanyId = normalizeCompanyId(companyId);
    const resolvedSeriesCode = requireText(seriesCode, "security_series_code_required");
    const resolvedSubjectKey = requireText(subjectKey, "security_series_subject_key_required");
    const key = buildScopedKey(resolvedCompanyId, resolvedSeriesCode, resolvedSubjectKey);
    const series = state.failureSeries.get(key);
    if (!series) {
      return null;
    }
    series.failureCount = 0;
    series.windowStartedAt = isoDate();
    series.lastFailureAt = null;
    series.lastSuccessAt = isoDate();
    series.lockedUntil = null;
    series.updatedAt = series.lastSuccessAt;
    return clone(series);
  }

  function recordSecurityAnomaly({
    companyId = null,
    alertCode,
    subjectKey,
    subjectType = null,
    subjectId = null,
    actorId = null,
    ipAddress = null,
    severity = "medium",
    riskScore = 10,
    metadata = {}
  } = {}) {
    const resolvedCompanyId = normalizeCompanyId(companyId);
    return raiseBudgetAlert({
      companyId: resolvedCompanyId,
      budget: {
        budgetCode: requireText(alertCode, "security_alert_code_required"),
        subjectKey: requireText(subjectKey, "security_alert_subject_key_required"),
        count: 1,
        lockedUntil: null
      },
      subjectType,
      subjectId,
      actorId,
      ipAddress,
      alertCode,
      alertSeverity: severity,
      riskScore,
      metadata
    });
  }

  function getSecurityRiskSummary({
    companyId = null,
    subjectKey
  } = {}) {
    const resolvedCompanyId = normalizeCompanyId(companyId);
    const resolvedSubjectKey = requireText(subjectKey, "security_subject_key_required");
    const summary = state.riskSubjects.get(buildScopedKey(resolvedCompanyId, "risk_subject", resolvedSubjectKey));
    return summary ? clone(summary) : null;
  }

  function listSecurityAlerts({
    companyId = null,
    alertCode = null,
    stateCode = null,
    severity = null
  } = {}) {
    const resolvedCompanyId = companyId == null ? null : normalizeCompanyId(companyId);
    const resolvedState = stateCode == null ? null : requireAllowedValue(stateCode, SECURITY_ALERT_STATES, "security_alert_state_invalid");
    const resolvedSeverity = severity == null ? null : requireAllowedValue(severity, SECURITY_ALERT_SEVERITIES, "security_alert_severity_invalid");
    return [...state.alerts.values()]
      .filter((alert) => (resolvedCompanyId ? normalizeCompanyId(alert.companyId) === resolvedCompanyId : true))
      .filter((alert) => (alertCode ? alert.alertCode === alertCode : true))
      .filter((alert) => (resolvedState ? alert.state === resolvedState : true))
      .filter((alert) => (resolvedSeverity ? alert.severity === resolvedSeverity : true))
      .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt))
      .map(clone);
  }

  function listSecurityBudgets({
    companyId = null,
    budgetCode = null
  } = {}) {
    const resolvedCompanyId = companyId == null ? null : normalizeCompanyId(companyId);
    return [...state.budgets.values()]
      .filter((budget) => (resolvedCompanyId ? normalizeCompanyId(budget.companyId) === resolvedCompanyId : true))
      .filter((budget) => (budgetCode ? budget.budgetCode === budgetCode : true))
      .sort((left, right) => left.budgetCode.localeCompare(right.budgetCode) || left.subjectKey.localeCompare(right.subjectKey))
      .map(clone);
  }

  function listSecurityFailureSeries({
    companyId = null,
    seriesCode = null
  } = {}) {
    const resolvedCompanyId = companyId == null ? null : normalizeCompanyId(companyId);
    return [...state.failureSeries.values()]
      .filter((series) => (resolvedCompanyId ? normalizeCompanyId(series.companyId) === resolvedCompanyId : true))
      .filter((series) => (seriesCode ? series.seriesCode === seriesCode : true))
      .sort((left, right) => left.seriesCode.localeCompare(right.seriesCode) || left.subjectKey.localeCompare(right.subjectKey))
      .map(clone);
  }

  function snapshotSecurityRuntime() {
    return clone({
      budgets: [...state.budgets.values()],
      failureSeries: [...state.failureSeries.values()],
      alerts: [...state.alerts.values()],
      riskSubjects: [...state.riskSubjects.values()]
    });
  }

  function resolveBudget({
    companyId,
    budgetCode,
    subjectKey,
    actorId = null,
    ipAddress = null
  }) {
    const key = buildScopedKey(companyId, budgetCode, subjectKey);
    const existing = state.budgets.get(key);
    if (existing) {
      return existing;
    }
    const budget = {
      securityBudgetId: crypto.randomUUID(),
      companyId: companyId === GLOBAL_COMPANY_ID ? null : companyId,
      budgetCode,
      subjectKey,
      count: 0,
      windowStartedAt: null,
      lastConsumedAt: null,
      lockedUntil: null,
      actorId: actorId || null,
      ipAddress: ipAddress || null,
      metadata: {},
      createdAt: isoDate(),
      updatedAt: isoDate()
    };
    state.budgets.set(key, budget);
    return budget;
  }

  function refreshBudgetWindow(budget, windowMs) {
    const now = current();
    if (budget.lockedUntil && new Date(budget.lockedUntil) <= now) {
      budget.lockedUntil = null;
    }
    if (!budget.windowStartedAt) {
      budget.windowStartedAt = isoDate(now);
    }
    if (new Date(budget.windowStartedAt).getTime() + windowMs <= now.getTime()) {
      budget.count = 0;
      budget.windowStartedAt = isoDate(now);
      budget.lastConsumedAt = null;
    }
    budget.updatedAt = isoDate(now);
  }

  function refreshFailureSeriesWindow(series, windowMs) {
    const now = current();
    if (series.lockedUntil && new Date(series.lockedUntil) <= now) {
      series.lockedUntil = null;
    }
    if (!series.windowStartedAt) {
      series.windowStartedAt = isoDate(now);
    }
    if (new Date(series.windowStartedAt).getTime() + windowMs <= now.getTime()) {
      series.failureCount = 0;
      series.windowStartedAt = isoDate(now);
      series.lastFailureAt = null;
    }
    series.updatedAt = isoDate(now);
  }

  function raiseBudgetAlert({
    companyId,
    budget,
    subjectType = null,
    subjectId = null,
    actorId = null,
    ipAddress = null,
    alertCode,
    alertSeverity = "medium",
    riskScore = 10,
    metadata = {}
  }) {
    const resolvedAlertCode = requireText(alertCode, "security_alert_code_required");
    const resolvedSeverity = requireAllowedValue(alertSeverity, SECURITY_ALERT_SEVERITIES, "security_alert_severity_invalid");
    const alertKey = buildScopedKey(companyId, resolvedAlertCode, budget.subjectKey);
    const existing = state.alerts.get(alertKey);
    if (existing) {
      existing.eventCount += 1;
      existing.lastSeenAt = isoDate();
      existing.updatedAt = existing.lastSeenAt;
      existing.severity = maxSeverity(existing.severity, resolvedSeverity);
      existing.lastActorId = actorId || existing.lastActorId || null;
      existing.lastIpAddress = ipAddress || existing.lastIpAddress || null;
      existing.metadata = clone({
        ...existing.metadata,
        ...metadata,
        budgetCode: budget.budgetCode,
        count: budget.count,
        lockedUntil: budget.lockedUntil
      });
      upsertRiskSubject({
        companyId,
        subjectKey: budget.subjectKey,
        subjectType,
        subjectId,
        actorId,
        ipAddress,
        riskScore,
        lastAlertCode: resolvedAlertCode
      });
      return clone(existing);
    }

    const alert = {
      securityAlertId: crypto.randomUUID(),
      companyId: companyId === GLOBAL_COMPANY_ID ? null : companyId,
      alertCode: resolvedAlertCode,
      severity: resolvedSeverity,
      state: "open",
      subjectKey: budget.subjectKey,
      subjectType: subjectType || null,
      subjectId: subjectId || null,
      budgetCode: budget.budgetCode || resolvedAlertCode,
      eventCount: Math.max(1, Number(budget.count || 0)),
      firstSeenAt: isoDate(),
      lastSeenAt: isoDate(),
      lastActorId: actorId || null,
      lastIpAddress: ipAddress || null,
      metadata: clone({
        ...metadata,
        budgetCode: budget.budgetCode,
        count: budget.count,
        lockedUntil: budget.lockedUntil
      }),
      createdAt: isoDate(),
      updatedAt: isoDate()
    };
    state.alerts.set(alertKey, alert);
    upsertRiskSubject({
      companyId,
      subjectKey: budget.subjectKey,
      subjectType,
      subjectId,
      actorId,
      ipAddress,
      riskScore,
      lastAlertCode: resolvedAlertCode
    });
    return clone(alert);
  }

  function upsertRiskSubject({
    companyId,
    subjectKey,
    subjectType = null,
    subjectId = null,
    actorId = null,
    ipAddress = null,
    riskScore = 0,
    lastAlertCode = null
  }) {
    const riskKey = buildScopedKey(companyId, "risk_subject", subjectKey);
    const existing = state.riskSubjects.get(riskKey);
    if (existing) {
      existing.lastScore = Number(riskScore || 0);
      existing.totalScore += Number(riskScore || 0);
      existing.level = deriveRiskLevel(existing.totalScore);
      existing.updatedAt = isoDate();
      existing.lastActorId = actorId || existing.lastActorId || null;
      existing.lastIpAddress = ipAddress || existing.lastIpAddress || null;
      existing.lastAlertCode = lastAlertCode || existing.lastAlertCode || null;
      return existing;
    }
    const summary = {
      securityRiskSummaryId: crypto.randomUUID(),
      companyId: companyId === GLOBAL_COMPANY_ID ? null : companyId,
      subjectKey,
      subjectType: subjectType || null,
      subjectId: subjectId || null,
      totalScore: Number(riskScore || 0),
      lastScore: Number(riskScore || 0),
      level: deriveRiskLevel(Number(riskScore || 0)),
      lastActorId: actorId || null,
      lastIpAddress: ipAddress || null,
      lastAlertCode: lastAlertCode || null,
      createdAt: isoDate(),
      updatedAt: isoDate()
    };
    state.riskSubjects.set(riskKey, summary);
    return summary;
  }
}

function normalizeCompanyId(companyId) {
  return companyId == null ? GLOBAL_COMPANY_ID : requireText(companyId, "security_company_id_required");
}

function buildScopedKey(companyId, code, subjectKey) {
  return `${companyId}:${code}:${subjectKey}`;
}

function deriveRiskLevel(totalScore) {
  if (totalScore >= 90) {
    return "critical";
  }
  if (totalScore >= 60) {
    return "high";
  }
  if (totalScore >= 30) {
    return "medium";
  }
  return "low";
}

function maxSeverity(left, right) {
  const leftIndex = SECURITY_ALERT_SEVERITIES.indexOf(left);
  const rightIndex = SECURITY_ALERT_SEVERITIES.indexOf(right);
  return leftIndex >= rightIndex ? left : right;
}

function createSecurityError(status, code, message, extras = {}) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  Object.assign(error, extras);
  return error;
}

function requireText(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createSecurityError(400, code, `${code} is required.`);
  }
  return value.trim();
}

function requirePositiveInteger(value, code) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createSecurityError(400, code, `${code} must be a positive integer.`);
  }
  return parsed;
}

function requireAllowedValue(value, allowedValues, code) {
  const resolved = requireText(value, code);
  if (!allowedValues.includes(resolved)) {
    throw createSecurityError(400, code, `${resolved} is not allowed.`);
  }
  return resolved;
}

function isoDate(value = new Date()) {
  return new Date(value).toISOString();
}
