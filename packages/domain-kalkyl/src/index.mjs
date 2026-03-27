import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";

export const ESTIMATE_VERSION_STATUSES = Object.freeze(["draft", "reviewed", "approved", "quoted", "converted", "superseded"]);
export const ESTIMATE_LINE_TYPE_CODES = Object.freeze(["labor", "material", "subcontractor", "equipment", "other"]);

export function createKalkylPlatform(options = {}) {
  return createKalkylEngine(options);
}

export function createKalkylEngine({
  clock = () => new Date(),
  arPlatform = null,
  projectsPlatform = null
} = {}) {
  const state = {
    estimateVersions: new Map(),
    estimateVersionIdsByCompany: new Map(),
    estimateVersionIdsByEstimateNo: new Map(),
    auditEvents: []
  };

  return {
    estimateVersionStatuses: ESTIMATE_VERSION_STATUSES,
    estimateLineTypeCodes: ESTIMATE_LINE_TYPE_CODES,
    listEstimateVersions,
    getEstimateVersion,
    createEstimateVersion,
    addEstimateLine,
    addEstimateAssumption,
    reviewEstimateVersion,
    approveEstimateVersion,
    convertEstimateToQuote,
    convertEstimateToProjectBudget,
    listEstimateAuditEvents,
    snapshotKalkyl
  };

  function listEstimateVersions({ companyId, estimateNo = null, status = null, customerId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedEstimateNo = normalizeOptionalText(estimateNo);
    const resolvedStatus = status == null ? null : requireEnum(ESTIMATE_VERSION_STATUSES, status, "estimate_status_invalid");
    const resolvedCustomerId = normalizeOptionalText(customerId);
    return (state.estimateVersionIdsByCompany.get(resolvedCompanyId) || [])
      .map((estimateVersionId) => state.estimateVersions.get(estimateVersionId))
      .filter(Boolean)
      .filter((estimate) => (resolvedEstimateNo ? estimate.estimateNo === resolvedEstimateNo : true))
      .filter((estimate) => (resolvedStatus ? estimate.status === resolvedStatus : true))
      .filter((estimate) => (resolvedCustomerId ? estimate.customerId === resolvedCustomerId : true))
      .sort(compareEstimateVersions)
      .map((estimate) => presentEstimateVersion(estimate));
  }

  function getEstimateVersion({ companyId, estimateVersionId } = {}) {
    return presentEstimateVersion(requireEstimateVersion(state, companyId, estimateVersionId));
  }

  function createEstimateVersion({
    companyId,
    estimateVersionId = null,
    estimateNo = null,
    supersedesEstimateVersionId = null,
    customerId,
    projectId = null,
    currencyCode = "SEK",
    validFrom,
    validTo = null,
    title,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const sourceEstimate = normalizeOptionalText(supersedesEstimateVersionId)
      ? requireEstimateVersion(state, resolvedCompanyId, supersedesEstimateVersionId)
      : null;
    const resolvedEstimateNo = sourceEstimate?.estimateNo || normalizeOptionalText(estimateNo) || nextEstimateNo(state, resolvedCompanyId);
    const versionNo = sourceEstimate ? sourceEstimate.versionNo + 1 : nextEstimateVersionNo(state, resolvedCompanyId, resolvedEstimateNo);
    const resolvedCustomerId = requireText(customerId || sourceEstimate?.customerId, "customer_id_required");
    if (arPlatform?.getCustomer) {
      arPlatform.getCustomer({ companyId: resolvedCompanyId, customerId: resolvedCustomerId });
    }
    const resolvedProjectId = normalizeOptionalText(projectId ?? sourceEstimate?.projectId ?? null);
    if (resolvedProjectId && projectsPlatform?.getProject) {
      projectsPlatform.getProject({ companyId: resolvedCompanyId, projectId: resolvedProjectId });
    }
    const now = nowIso(clock);
    const estimate = {
      estimateVersionId: normalizeOptionalText(estimateVersionId) || crypto.randomUUID(),
      companyId: resolvedCompanyId,
      estimateNo: resolvedEstimateNo,
      versionNo,
      supersedesEstimateVersionId: sourceEstimate?.estimateVersionId || null,
      supersededByEstimateVersionId: null,
      customerId: resolvedCustomerId,
      projectId: resolvedProjectId,
      title: requireText(title || sourceEstimate?.title || `Estimate ${resolvedEstimateNo}`, "estimate_title_required"),
      status: "draft",
      currencyCode: normalizeCurrency(currencyCode || sourceEstimate?.currencyCode || "SEK"),
      validFrom: normalizeRequiredDate(validFrom || sourceEstimate?.validFrom, "estimate_valid_from_required"),
      validTo: normalizeOptionalDate(validTo || sourceEstimate?.validTo || null, "estimate_valid_to_invalid"),
      lines: sourceEstimate ? copy(sourceEstimate.lines) : [],
      assumptions: sourceEstimate ? copy(sourceEstimate.assumptions) : [],
      quoteConversion: null,
      projectBudgetConversion: null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: now,
      updatedAt: now
    };
    if (sourceEstimate) {
      sourceEstimate.status = "superseded";
      sourceEstimate.supersededByEstimateVersionId = estimate.estimateVersionId;
      sourceEstimate.updatedAt = now;
    }
    state.estimateVersions.set(estimate.estimateVersionId, estimate);
    appendToIndex(state.estimateVersionIdsByCompany, resolvedCompanyId, estimate.estimateVersionId);
    appendToIndex(state.estimateVersionIdsByEstimateNo, buildEstimateKey(resolvedCompanyId, resolvedEstimateNo), estimate.estimateVersionId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: estimate.createdByActorId,
      correlationId,
      action: "kalkyl.estimate_version_created",
      entityType: "estimate_version",
      entityId: estimate.estimateVersionId,
      projectId: estimate.projectId,
      explanation: `Created estimate ${estimate.estimateNo} version ${estimate.versionNo}.`
    });
    return presentEstimateVersion(estimate);
  }

  function addEstimateLine({
    companyId,
    estimateVersionId,
    estimateLineId = null,
    lineTypeCode,
    description,
    quantity,
    unitCode,
    costAmount,
    salesAmount,
    projectPhaseCode = null,
    riskClassCode = "standard",
    costModelCode = "manual",
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const estimate = requireEstimateVersion(state, companyId, estimateVersionId);
    assertDraftEstimate(estimate);
    const line = {
      estimateLineId: normalizeOptionalText(estimateLineId) || crypto.randomUUID(),
      lineTypeCode: requireEnum(ESTIMATE_LINE_TYPE_CODES, lineTypeCode, "estimate_line_type_invalid"),
      description: requireText(description, "estimate_line_description_required"),
      quantity: normalizePositiveNumber(quantity, "estimate_line_quantity_invalid"),
      unitCode: requireText(unitCode, "estimate_line_unit_required"),
      costAmount: normalizeMoney(costAmount, "estimate_line_cost_amount_invalid"),
      salesAmount: normalizeMoney(salesAmount, "estimate_line_sales_amount_invalid"),
      projectPhaseCode: normalizeOptionalText(projectPhaseCode),
      riskClassCode: normalizeCode(riskClassCode, "estimate_line_risk_class_required"),
      costModelCode: normalizeCode(costModelCode, "estimate_line_cost_model_required")
    };
    estimate.lines.push(line);
    estimate.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: estimate.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "kalkyl.estimate_line_added",
      entityType: "estimate_line",
      entityId: line.estimateLineId,
      projectId: estimate.projectId,
      explanation: `Added estimate line ${line.lineTypeCode} to ${estimate.estimateNo} v${estimate.versionNo}.`
    });
    return copy(line);
  }

  function addEstimateAssumption({
    companyId,
    estimateVersionId,
    estimateAssumptionId = null,
    assumptionCode,
    description,
    impactAmount,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const estimate = requireEstimateVersion(state, companyId, estimateVersionId);
    assertDraftEstimate(estimate);
    const assumption = {
      estimateAssumptionId: normalizeOptionalText(estimateAssumptionId) || crypto.randomUUID(),
      assumptionCode: normalizeCode(assumptionCode, "estimate_assumption_code_required"),
      description: requireText(description, "estimate_assumption_description_required"),
      impactAmount: normalizeSignedMoney(impactAmount, "estimate_assumption_impact_amount_invalid")
    };
    estimate.assumptions.push(assumption);
    estimate.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: estimate.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "kalkyl.estimate_assumption_added",
      entityType: "estimate_assumption",
      entityId: assumption.estimateAssumptionId,
      projectId: estimate.projectId,
      explanation: `Added assumption ${assumption.assumptionCode} to ${estimate.estimateNo} v${estimate.versionNo}.`
    });
    return copy(assumption);
  }

  function reviewEstimateVersion({ companyId, estimateVersionId, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const estimate = requireEstimateVersion(state, companyId, estimateVersionId);
    assertEstimateStatus(estimate, ["draft"], "estimate_review_requires_draft");
    validateEstimateForApproval(estimate);
    estimate.status = "reviewed";
    estimate.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: estimate.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "kalkyl.estimate_reviewed",
      entityType: "estimate_version",
      entityId: estimate.estimateVersionId,
      projectId: estimate.projectId,
      explanation: `Reviewed estimate ${estimate.estimateNo} v${estimate.versionNo}.`
    });
    return presentEstimateVersion(estimate);
  }

  function approveEstimateVersion({ companyId, estimateVersionId, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const estimate = requireEstimateVersion(state, companyId, estimateVersionId);
    assertEstimateStatus(estimate, ["reviewed"], "estimate_approval_requires_reviewed");
    validateEstimateForApproval(estimate);
    estimate.status = "approved";
    estimate.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: estimate.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "kalkyl.estimate_approved",
      entityType: "estimate_version",
      entityId: estimate.estimateVersionId,
      projectId: estimate.projectId,
      explanation: `Approved estimate ${estimate.estimateNo} v${estimate.versionNo}.`
    });
    return presentEstimateVersion(estimate);
  }

  function convertEstimateToQuote({
    companyId,
    estimateVersionId,
    validUntil = null,
    quoteTitle = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const estimate = requireEstimateVersion(state, companyId, estimateVersionId);
    assertEstimateStatus(estimate, ["approved", "quoted"], "estimate_quote_conversion_requires_approved");
    const quoteConversion = estimate.quoteConversion || {
      quoteConversionId: crypto.randomUUID(),
      estimateVersionId: estimate.estimateVersionId,
      customerId: estimate.customerId,
      title: requireText(quoteTitle || estimate.title, "estimate_quote_title_required"),
      currencyCode: estimate.currencyCode,
      validUntil: normalizeOptionalDate(validUntil || estimate.validTo || null, "estimate_quote_valid_until_invalid"),
      payload: {
        customerId: estimate.customerId,
        title: quoteTitle || estimate.title,
        validUntil: normalizeOptionalDate(validUntil || estimate.validTo || null, "estimate_quote_valid_until_invalid"),
        currencyCode: estimate.currencyCode,
        lines: estimate.lines.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitCode: line.unitCode,
          unitPrice: line.quantity === 0 ? 0 : roundMoney(line.salesAmount / line.quantity)
        }))
      },
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    estimate.quoteConversion = quoteConversion;
    estimate.status = "quoted";
    estimate.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: estimate.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "kalkyl.estimate_converted_to_quote",
      entityType: "estimate_version",
      entityId: estimate.estimateVersionId,
      projectId: estimate.projectId,
      explanation: `Prepared quote conversion payload for estimate ${estimate.estimateNo} v${estimate.versionNo}.`
    });
    return presentEstimateVersion(estimate);
  }

  function convertEstimateToProjectBudget({
    companyId,
    estimateVersionId,
    projectId = null,
    budgetName = null,
    validFrom = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const estimate = requireEstimateVersion(state, companyId, estimateVersionId);
    assertEstimateStatus(estimate, ["approved", "quoted"], "estimate_project_budget_conversion_requires_approved");
    const resolvedProjectId = requireText(projectId || estimate.projectId, "project_id_required");
    if (!projectsPlatform?.createProjectBudgetVersion) {
      throw createError(409, "project_budget_platform_unavailable", "Projects platform is required for project budget conversion.");
    }
    const resolvedValidFrom = normalizeRequiredDate(validFrom || estimate.validFrom, "estimate_project_budget_valid_from_required");
    const reportingPeriod = resolvedValidFrom.slice(0, 7).replace("-", "");
    const budgetLines = buildProjectBudgetLines(estimate, reportingPeriod);
    if (budgetLines.length === 0) {
      throw createError(409, "estimate_project_budget_lines_required", "Estimate must contain convertible cost or revenue lines.");
    }
    const projectBudgetVersion = projectsPlatform.createProjectBudgetVersion({
      companyId: estimate.companyId,
      projectId: resolvedProjectId,
      budgetName: budgetName || `${estimate.estimateNo} v${estimate.versionNo}`,
      validFrom: resolvedValidFrom,
      lines: budgetLines,
      actorId,
      correlationId
    });
    estimate.projectBudgetConversion = {
      projectBudgetVersionId: projectBudgetVersion.projectBudgetVersionId,
      projectId: resolvedProjectId,
      reportingPeriod,
      lineCount: budgetLines.length,
      convertedAt: nowIso(clock),
      createdByActorId: requireText(actorId, "actor_id_required")
    };
    estimate.status = "converted";
    estimate.projectId = resolvedProjectId;
    estimate.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: estimate.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "kalkyl.estimate_converted_to_project_budget",
      entityType: "estimate_version",
      entityId: estimate.estimateVersionId,
      projectId: resolvedProjectId,
      explanation: `Converted estimate ${estimate.estimateNo} v${estimate.versionNo} into project budget ${projectBudgetVersion.projectBudgetVersionId}.`
    });
    return presentEstimateVersion(estimate);
  }

  function listEstimateAuditEvents({ companyId, estimateVersionId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedEstimateVersionId = normalizeOptionalText(estimateVersionId);
    return state.auditEvents
      .filter((event) => event.companyId === resolvedCompanyId)
      .filter((event) => (resolvedEstimateVersionId ? event.entityId === resolvedEstimateVersionId : true))
      .sort(compareAuditEvents)
      .map(copy);
  }

  function snapshotKalkyl({ companyId } = {}) {
    return {
      estimates: listEstimateVersions({ companyId }),
      auditEvents: listEstimateAuditEvents({ companyId })
    };
  }
}

function presentEstimateVersion(estimate) {
  const totals = summarizeEstimate(estimate);
  return {
    ...copy(estimate),
    totals
  };
}

function requireEstimateVersion(state, companyId, estimateVersionId) {
  const estimate = state.estimateVersions.get(requireText(estimateVersionId, "estimate_version_id_required"));
  if (!estimate || estimate.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "estimate_version_not_found", "Estimate version was not found.");
  }
  return estimate;
}

function assertDraftEstimate(estimate) {
  assertEstimateStatus(estimate, ["draft"], "estimate_draft_required");
}

function assertEstimateStatus(estimate, allowedStatuses, errorCode) {
  if (!allowedStatuses.includes(estimate.status)) {
    throw createError(409, errorCode, `Estimate ${estimate.estimateNo} v${estimate.versionNo} is in status ${estimate.status}.`);
  }
}

function validateEstimateForApproval(estimate) {
  if (!Array.isArray(estimate.lines) || estimate.lines.length === 0) {
    throw createError(409, "estimate_lines_required", "Estimate version requires at least one line.");
  }
  const totals = summarizeEstimate(estimate);
  if (totals.totalSalesAmount <= 0) {
    throw createError(409, "estimate_sales_total_invalid", "Estimate sales total must be greater than zero.");
  }
}

function buildProjectBudgetLines(estimate, reportingPeriod) {
  const lines = [];
  for (const line of estimate.lines) {
    if (line.costAmount > 0) {
      lines.push({
        lineKind: "cost",
        categoryCode: normalizeBudgetCategory(line.lineTypeCode),
        reportingPeriod,
        amount: line.costAmount,
        activityCode: line.projectPhaseCode || null,
        note: line.description
      });
    }
    if (line.salesAmount > 0) {
      lines.push({
        lineKind: "revenue",
        categoryCode: "revenue",
        reportingPeriod,
        amount: line.salesAmount,
        activityCode: line.projectPhaseCode || null,
        note: line.description
      });
    }
  }
  for (const assumption of estimate.assumptions) {
    if (assumption.impactAmount === 0) {
      continue;
    }
    lines.push({
      lineKind: assumption.impactAmount > 0 ? "revenue" : "cost",
      categoryCode: assumption.impactAmount > 0 ? "revenue" : "other_cost",
      reportingPeriod,
      amount: Math.abs(assumption.impactAmount),
      activityCode: null,
      note: assumption.description
    });
  }
  return lines;
}

function summarizeEstimate(estimate) {
  const totalCostAmount = roundMoney(estimate.lines.reduce((sum, line) => sum + Number(line.costAmount || 0), 0));
  const baseSalesAmount = roundMoney(estimate.lines.reduce((sum, line) => sum + Number(line.salesAmount || 0), 0));
  const assumptionImpactAmount = roundMoney(estimate.assumptions.reduce((sum, assumption) => sum + Number(assumption.impactAmount || 0), 0));
  const totalSalesAmount = roundMoney(baseSalesAmount + assumptionImpactAmount);
  const marginAmount = roundMoney(totalSalesAmount - totalCostAmount);
  return {
    lineCount: estimate.lines.length,
    assumptionCount: estimate.assumptions.length,
    totalCostAmount,
    totalSalesAmount,
    assumptionImpactAmount,
    marginAmount,
    marginPercent: totalSalesAmount === 0 ? 0 : roundMoney((marginAmount / totalSalesAmount) * 100)
  };
}

function nextEstimateNo(state, companyId) {
  const count = (state.estimateVersionIdsByCompany.get(companyId) || []).length + 1;
  return `EST-${String(count).padStart(4, "0")}`;
}

function nextEstimateVersionNo(state, companyId, estimateNo) {
  const versions = (state.estimateVersionIdsByEstimateNo.get(buildEstimateKey(companyId, estimateNo)) || [])
    .map((estimateVersionId) => state.estimateVersions.get(estimateVersionId))
    .filter(Boolean)
    .map((estimate) => estimate.versionNo);
  return versions.length === 0 ? 1 : Math.max(...versions) + 1;
}

function buildEstimateKey(companyId, estimateNo) {
  return `${companyId}:${estimateNo}`;
}

function appendToIndex(index, key, value) {
  if (!index.has(key)) {
    index.set(key, []);
  }
  index.get(key).push(value);
}

function compareEstimateVersions(left, right) {
  return left.estimateNo.localeCompare(right.estimateNo) || right.versionNo - left.versionNo || left.createdAt.localeCompare(right.createdAt);
}

function normalizeBudgetCategory(lineTypeCode) {
  if (lineTypeCode === "labor") {
    return "labor";
  }
  if (lineTypeCode === "material") {
    return "material";
  }
  if (lineTypeCode === "subcontractor") {
    return "subcontractor";
  }
  return "other_cost";
}

function normalizeOptionalText(value) {
  if (value == null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function requireText(value, code) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    throw createError(400, code, "Required value is missing.");
  }
  return normalized;
}

function requireEnum(allowedValues, value, code) {
  const normalized = requireText(value, code).replaceAll("-", "_").replaceAll(" ", "_").toLowerCase();
  if (!allowedValues.includes(normalized)) {
    throw createError(400, code, `Value ${normalized} is not allowed.`);
  }
  return normalized;
}

function normalizeCode(value, code) {
  return requireText(value, code).replaceAll("-", "_").replaceAll(" ", "_").toUpperCase();
}

function normalizeCurrency(value) {
  const normalized = requireText(value, "currency_code_required").toUpperCase();
  if (normalized.length !== 3) {
    throw createError(400, "currency_code_invalid", "Currency code must be ISO-4217 compatible.");
  }
  return normalized;
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

function normalizePositiveNumber(value, code) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw createError(400, code, "Value must be greater than zero.");
  }
  return parsed;
}

function normalizeMoney(value, code) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw createError(400, code, "Amount must be zero or greater.");
  }
  return roundMoney(parsed);
}

function normalizeSignedMoney(value, code) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw createError(400, code, "Amount must be numeric.");
  }
  return roundMoney(parsed);
}

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

function pushAudit(state, clock, entry) {
  state.auditEvents.push(
    createAuditEnvelopeFromLegacyEvent({
      clock,
      auditClass: "kalkyl_action",
      event: entry
    })
  );
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function compareAuditEvents(left, right) {
  return resolveAuditRecordedAt(left).localeCompare(resolveAuditRecordedAt(right))
    || String(left.auditId || left.auditEventId || "").localeCompare(String(right.auditId || right.auditEventId || ""));
}

function resolveAuditRecordedAt(event) {
  return String(event?.recordedAt || event?.createdAt || event?.occurredAt || "");
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
