import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";

export const EGENKONTROLL_TEMPLATE_STATUSES = Object.freeze(["draft", "active", "retired"]);
export const EGENKONTROLL_INSTANCE_STATUSES = Object.freeze([
  "draft",
  "assigned",
  "in_progress",
  "review_required",
  "signed_off",
  "closed"
]);
export const EGENKONTROLL_POINT_RESULT_CODES = Object.freeze(["pass", "fail", "not_applicable", "deviation"]);
export const EGENKONTROLL_DEVIATION_STATUSES = Object.freeze(["open", "acknowledged", "resolved"]);
export const EGENKONTROLL_DEVIATION_SEVERITIES = Object.freeze(["minor", "major", "critical"]);
export const EGENKONTROLL_SIGNOFF_ROLE_CODES = Object.freeze(["site_lead", "reviewer", "project_manager"]);

export function createEgenkontrollPlatform(options = {}) {
  return createEgenkontrollEngine(options);
}

export function createEgenkontrollEngine({
  clock = () => new Date(),
  projectsPlatform = null,
  fieldPlatform = null
} = {}) {
  const state = {
    templates: new Map(),
    templateIdsByCompany: new Map(),
    templateIdByCodeVersion: new Map(),
    instances: new Map(),
    instanceIdsByCompany: new Map(),
    instanceIdsByProject: new Map(),
    instanceIdsByWorkOrder: new Map(),
    pointOutcomes: new Map(),
    pointOutcomeIdsByInstance: new Map(),
    latestOutcomeIdByInstanceAndPoint: new Map(),
    deviations: new Map(),
    deviationIdsByCompany: new Map(),
    deviationIdsByInstance: new Map(),
    signoffs: new Map(),
    signoffIdsByInstance: new Map(),
    auditEvents: []
  };

  return {
    checklistTemplateStatuses: EGENKONTROLL_TEMPLATE_STATUSES,
    checklistInstanceStatuses: EGENKONTROLL_INSTANCE_STATUSES,
    checklistPointResultCodes: EGENKONTROLL_POINT_RESULT_CODES,
    checklistDeviationStatuses: EGENKONTROLL_DEVIATION_STATUSES,
    checklistDeviationSeverities: EGENKONTROLL_DEVIATION_SEVERITIES,
    checklistSignoffRoleCodes: EGENKONTROLL_SIGNOFF_ROLE_CODES,
    listChecklistTemplates,
    getChecklistTemplate,
    createChecklistTemplate,
    activateChecklistTemplate,
    listChecklistInstances,
    getChecklistInstance,
    createChecklistInstance,
    startChecklistInstance,
    recordChecklistPointOutcome,
    listChecklistDeviations,
    raiseChecklistDeviation,
    acknowledgeChecklistDeviation,
    resolveChecklistDeviation,
    listChecklistSignoffs,
    signOffChecklist,
    listEgenkontrollAuditEvents,
    snapshotEgenkontroll
  };

  function listChecklistTemplates({ companyId, templateCode = null, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedTemplateCode = normalizeOptionalCode(templateCode);
    const resolvedStatus = status == null ? null : requireEnum(EGENKONTROLL_TEMPLATE_STATUSES, status, "egenkontroll_template_status_invalid");
    return (state.templateIdsByCompany.get(resolvedCompanyId) || [])
      .map((checklistTemplateId) => state.templates.get(checklistTemplateId))
      .filter(Boolean)
      .filter((template) => (resolvedTemplateCode ? template.templateCode === resolvedTemplateCode : true))
      .filter((template) => (resolvedStatus ? template.status === resolvedStatus : true))
      .sort(compareTemplates)
      .map((template) => presentTemplate(template));
  }

  function getChecklistTemplate({ companyId, checklistTemplateId } = {}) {
    return presentTemplate(requireTemplate(state, companyId, checklistTemplateId));
  }

  function createChecklistTemplate({
    companyId,
    checklistTemplateId = null,
    templateCode,
    displayName,
    industryPackCode = "bygg",
    riskClassCode = "standard",
    sections,
    requiredSignoffRoleCodes = ["site_lead"],
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedTemplateCode = normalizeCode(templateCode, "egenkontroll_template_code_required");
    const normalizedSections = normalizeSections(sections);
    const normalizedRequiredSignoffRoleCodes = normalizeSignoffRoleCodes(requiredSignoffRoleCodes);
    const nextVersion = determineNextTemplateVersion(state, resolvedCompanyId, resolvedTemplateCode);
    const now = nowIso(clock);
    const template = {
      checklistTemplateId: normalizeOptionalText(checklistTemplateId) || crypto.randomUUID(),
      companyId: resolvedCompanyId,
      templateCode: resolvedTemplateCode,
      displayName: requireText(displayName, "egenkontroll_template_display_name_required"),
      industryPackCode: requireText(industryPackCode, "egenkontroll_industry_pack_code_required"),
      riskClassCode: normalizeCode(riskClassCode, "egenkontroll_risk_class_code_required"),
      version: nextVersion,
      status: "draft",
      sections: normalizedSections,
      requiredSignoffRoleCodes: normalizedRequiredSignoffRoleCodes,
      pointCodes: Object.freeze(flattenPointCodes(normalizedSections)),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: now,
      updatedAt: now
    };
    const key = buildTemplateVersionKey(resolvedCompanyId, resolvedTemplateCode, nextVersion);
    state.templates.set(template.checklistTemplateId, template);
    appendToIndex(state.templateIdsByCompany, resolvedCompanyId, template.checklistTemplateId);
    state.templateIdByCodeVersion.set(key, template.checklistTemplateId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: template.createdByActorId,
      correlationId,
      action: "egenkontroll.template_created",
      entityType: "checklist_template",
      entityId: template.checklistTemplateId,
      projectId: null,
      explanation: `Created checklist template ${template.templateCode} version ${template.version}.`
    });
    return presentTemplate(template);
  }

  function activateChecklistTemplate({ companyId, checklistTemplateId, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const template = requireTemplate(state, companyId, checklistTemplateId);
    const retiredTemplateIds = [];
    for (const candidateId of state.templateIdsByCompany.get(template.companyId) || []) {
      const candidate = state.templates.get(candidateId);
      if (!candidate || candidate.templateCode !== template.templateCode || candidate.checklistTemplateId === template.checklistTemplateId) {
        continue;
      }
      if (candidate.status === "active") {
        candidate.status = "retired";
        candidate.updatedAt = nowIso(clock);
        retiredTemplateIds.push(candidate.checklistTemplateId);
      }
    }
    template.status = "active";
    template.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: template.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "egenkontroll.template_activated",
      entityType: "checklist_template",
      entityId: template.checklistTemplateId,
      projectId: null,
      explanation: `Activated checklist template ${template.templateCode} version ${template.version}${retiredTemplateIds.length ? ` and retired ${retiredTemplateIds.length} prior version(s)` : ""}.`
    });
    return presentTemplate(template);
  }

  function listChecklistInstances({ companyId, projectId = null, workOrderId = null, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedProjectId = normalizeOptionalText(projectId);
    const resolvedWorkOrderId = normalizeOptionalText(workOrderId);
    const resolvedStatus = status == null ? null : requireEnum(EGENKONTROLL_INSTANCE_STATUSES, status, "egenkontroll_instance_status_invalid");
    return (state.instanceIdsByCompany.get(resolvedCompanyId) || [])
      .map((checklistInstanceId) => state.instances.get(checklistInstanceId))
      .filter(Boolean)
      .filter((instance) => (resolvedProjectId ? instance.projectId === resolvedProjectId : true))
      .filter((instance) => (resolvedWorkOrderId ? instance.workOrderId === resolvedWorkOrderId : true))
      .filter((instance) => (resolvedStatus ? instance.status === resolvedStatus : true))
      .sort(compareInstances)
      .map((instance) => presentInstance(state, instance));
  }

  function getChecklistInstance({ companyId, checklistInstanceId } = {}) {
    return presentInstance(state, requireInstance(state, companyId, checklistInstanceId), { includeHistory: true });
  }

  function createChecklistInstance({
    companyId,
    checklistInstanceId = null,
    checklistTemplateId,
    projectId,
    workOrderId = null,
    assignedToUserId = null,
    dueDate = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const template = requireTemplate(state, resolvedCompanyId, checklistTemplateId);
    if (template.status !== "active") {
      throw createError(409, "egenkontroll_template_not_active", "Checklist template must be active before it can be instantiated.");
    }
    const resolvedProjectId = requireText(projectId, "project_id_required");
    if (projectsPlatform?.getProject) {
      projectsPlatform.getProject({ companyId: resolvedCompanyId, projectId: resolvedProjectId });
    }
    const resolvedWorkOrderId = normalizeOptionalText(workOrderId);
    if (resolvedWorkOrderId && fieldPlatform?.getWorkOrder) {
      const workOrder = fieldPlatform.getWorkOrder({ companyId: resolvedCompanyId, workOrderId: resolvedWorkOrderId });
      if (normalizeOptionalText(workOrder.projectId) && workOrder.projectId !== resolvedProjectId) {
        throw createError(409, "egenkontroll_work_order_project_mismatch", "Work order must belong to the same project as the checklist instance.");
      }
    }
    const now = nowIso(clock);
    const instance = {
      checklistInstanceId: normalizeOptionalText(checklistInstanceId) || crypto.randomUUID(),
      companyId: resolvedCompanyId,
      checklistTemplateId: template.checklistTemplateId,
      templateCode: template.templateCode,
      templateVersion: template.version,
      projectId: resolvedProjectId,
      workOrderId: resolvedWorkOrderId,
      status: normalizeOptionalText(assignedToUserId) ? "assigned" : "draft",
      assignedToUserId: normalizeOptionalText(assignedToUserId),
      dueDate: normalizeOptionalDate(dueDate, "egenkontroll_due_date_invalid"),
      startedAt: null,
      completedAt: null,
      closedAt: null,
      requiredPointCodes: template.pointCodes,
      requiredSignoffRoleCodes: template.requiredSignoffRoleCodes,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: now,
      updatedAt: now
    };
    state.instances.set(instance.checklistInstanceId, instance);
    appendToIndex(state.instanceIdsByCompany, resolvedCompanyId, instance.checklistInstanceId);
    appendToIndex(state.instanceIdsByProject, buildScopedProjectKey(resolvedCompanyId, resolvedProjectId), instance.checklistInstanceId);
    if (resolvedWorkOrderId) {
      appendToIndex(state.instanceIdsByWorkOrder, buildScopedWorkOrderKey(resolvedCompanyId, resolvedWorkOrderId), instance.checklistInstanceId);
    }
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: instance.createdByActorId,
      correlationId,
      action: "egenkontroll.instance_created",
      entityType: "checklist_instance",
      entityId: instance.checklistInstanceId,
      projectId: instance.projectId,
      explanation: `Created checklist instance ${instance.checklistInstanceId} from template ${instance.templateCode} v${instance.templateVersion}.`
    });
    return presentInstance(state, instance);
  }

  function startChecklistInstance({ companyId, checklistInstanceId, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const instance = requireInstance(state, companyId, checklistInstanceId);
    if (!["draft", "assigned"].includes(instance.status)) {
      throw createError(409, "egenkontroll_instance_not_startable", "Checklist instance can only be started from draft or assigned.");
    }
    instance.status = "in_progress";
    instance.startedAt = instance.startedAt || nowIso(clock);
    instance.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: instance.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "egenkontroll.instance_started",
      entityType: "checklist_instance",
      entityId: instance.checklistInstanceId,
      projectId: instance.projectId,
      explanation: `Started checklist instance ${instance.checklistInstanceId}.`
    });
    return presentInstance(state, instance);
  }

  function recordChecklistPointOutcome({
    companyId,
    checklistInstanceId,
    pointCode,
    resultCode,
    note = null,
    documentIds = [],
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const instance = requireInstance(state, companyId, checklistInstanceId);
    if (["signed_off", "closed"].includes(instance.status)) {
      throw createError(409, "egenkontroll_instance_locked", "Checklist outcomes cannot be recorded after sign-off.");
    }
    if (instance.status === "draft" || instance.status === "assigned") {
      startChecklistInstance({
        companyId: instance.companyId,
        checklistInstanceId: instance.checklistInstanceId,
        actorId,
        correlationId
      });
    }
    const template = requireTemplate(state, instance.companyId, instance.checklistTemplateId);
    const resolvedPointCode = normalizeCode(pointCode, "egenkontroll_point_code_required");
    const pointDefinition = requireTemplatePoint(template, resolvedPointCode);
    const resolvedResultCode = requireEnum(EGENKONTROLL_POINT_RESULT_CODES, resultCode, "egenkontroll_point_result_invalid");
    const normalizedDocumentIds = normalizeStringList(documentIds, "egenkontroll_document_id_required");
    if (pointDefinition.evidenceRequiredFlag && normalizedDocumentIds.length === 0) {
      throw createError(409, "egenkontroll_evidence_required", "Evidence documents are required for this checklist point.");
    }
    const latestOutcome = getLatestOutcome(state, instance.checklistInstanceId, resolvedPointCode);
    const payloadHash = buildHash({
      checklistInstanceId: instance.checklistInstanceId,
      pointCode: resolvedPointCode,
      resultCode: resolvedResultCode,
      note: normalizeOptionalText(note),
      documentIds: normalizedDocumentIds
    });
    if (latestOutcome && latestOutcome.payloadHash === payloadHash) {
      return presentOutcome(latestOutcome);
    }
    const now = nowIso(clock);
    const outcome = {
      checklistPointOutcomeId: crypto.randomUUID(),
      checklistInstanceId: instance.checklistInstanceId,
      companyId: instance.companyId,
      pointCode: resolvedPointCode,
      pointLabel: pointDefinition.label,
      resultCode: resolvedResultCode,
      note: normalizeOptionalText(note),
      documentIds: normalizedDocumentIds,
      revisionNo: latestOutcome ? latestOutcome.revisionNo + 1 : 1,
      supersedesChecklistPointOutcomeId: latestOutcome?.checklistPointOutcomeId || null,
      supersededAt: null,
      payloadHash,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: now
    };
    if (latestOutcome) {
      latestOutcome.supersededAt = now;
    }
    state.pointOutcomes.set(outcome.checklistPointOutcomeId, outcome);
    appendToIndex(state.pointOutcomeIdsByInstance, instance.checklistInstanceId, outcome.checklistPointOutcomeId);
    state.latestOutcomeIdByInstanceAndPoint.set(buildInstancePointKey(instance.checklistInstanceId, resolvedPointCode), outcome.checklistPointOutcomeId);
    instance.status = resolvedResultCode === "fail" || resolvedResultCode === "deviation"
      ? "review_required"
      : determineOpenDeviationCount(state, instance.checklistInstanceId) > 0
        ? "review_required"
        : "in_progress";
    instance.updatedAt = now;
    pushAudit(state, clock, {
      companyId: instance.companyId,
      actorId: outcome.createdByActorId,
      correlationId,
      action: "egenkontroll.point_recorded",
      entityType: "checklist_point_outcome",
      entityId: outcome.checklistPointOutcomeId,
      projectId: instance.projectId,
      explanation: `Recorded checklist point ${resolvedPointCode} as ${resolvedResultCode} on instance ${instance.checklistInstanceId}.`
    });
    return presentOutcome(outcome);
  }

  function listChecklistDeviations({ companyId, checklistInstanceId = null, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedInstanceId = normalizeOptionalText(checklistInstanceId);
    const resolvedStatus = status == null ? null : requireEnum(EGENKONTROLL_DEVIATION_STATUSES, status, "egenkontroll_deviation_status_invalid");
    const deviationIds = resolvedInstanceId
      ? state.deviationIdsByInstance.get(resolvedInstanceId) || []
      : state.deviationIdsByCompany.get(resolvedCompanyId) || [];
    return deviationIds
      .map((checklistDeviationId) => state.deviations.get(checklistDeviationId))
      .filter(Boolean)
      .filter((deviation) => deviation.companyId === resolvedCompanyId)
      .filter((deviation) => (resolvedStatus ? deviation.status === resolvedStatus : true))
      .sort(compareDeviations)
      .map((deviation) => presentDeviation(deviation));
  }

  function raiseChecklistDeviation({
    companyId,
    checklistInstanceId,
    pointCode,
    severityCode = "major",
    title,
    description,
    documentIds = [],
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const instance = requireInstance(state, companyId, checklistInstanceId);
    if (["signed_off", "closed"].includes(instance.status)) {
      throw createError(409, "egenkontroll_instance_locked", "Checklist deviations cannot be created after sign-off.");
    }
    const template = requireTemplate(state, instance.companyId, instance.checklistTemplateId);
    const resolvedPointCode = normalizeCode(pointCode, "egenkontroll_point_code_required");
    requireTemplatePoint(template, resolvedPointCode);
    const resolvedSeverityCode = requireEnum(EGENKONTROLL_DEVIATION_SEVERITIES, severityCode, "egenkontroll_deviation_severity_invalid");
    const resolvedTitle = requireText(title, "egenkontroll_deviation_title_required");
    const resolvedDescription = requireText(description, "egenkontroll_deviation_description_required");
    const normalizedDocumentIds = normalizeStringList(documentIds, "egenkontroll_document_id_required");
    const existing = (state.deviationIdsByInstance.get(instance.checklistInstanceId) || [])
      .map((checklistDeviationId) => state.deviations.get(checklistDeviationId))
      .find((candidate) => candidate && candidate.pointCode === resolvedPointCode && candidate.title === resolvedTitle && candidate.status !== "resolved");
    if (existing) {
      return presentDeviation(existing);
    }
    const now = nowIso(clock);
    const deviation = {
      checklistDeviationId: crypto.randomUUID(),
      checklistInstanceId: instance.checklistInstanceId,
      companyId: instance.companyId,
      projectId: instance.projectId,
      workOrderId: instance.workOrderId,
      pointCode: resolvedPointCode,
      severityCode: resolvedSeverityCode,
      title: resolvedTitle,
      description: resolvedDescription,
      documentIds: normalizedDocumentIds,
      status: "open",
      ownerUserId: instance.assignedToUserId,
      acknowledgedAt: null,
      acknowledgedByActorId: null,
      resolvedAt: null,
      resolvedByActorId: null,
      resolutionNote: null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: now,
      updatedAt: now
    };
    state.deviations.set(deviation.checklistDeviationId, deviation);
    appendToIndex(state.deviationIdsByCompany, instance.companyId, deviation.checklistDeviationId);
    appendToIndex(state.deviationIdsByInstance, instance.checklistInstanceId, deviation.checklistDeviationId);
    instance.status = "review_required";
    instance.updatedAt = now;
    pushAudit(state, clock, {
      companyId: instance.companyId,
      actorId: deviation.createdByActorId,
      correlationId,
      action: "egenkontroll.deviation_raised",
      entityType: "checklist_deviation",
      entityId: deviation.checklistDeviationId,
      projectId: instance.projectId,
      explanation: `Raised deviation ${deviation.checklistDeviationId} on point ${resolvedPointCode}.`
    });
    return presentDeviation(deviation);
  }

  function acknowledgeChecklistDeviation({ companyId, checklistDeviationId, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const deviation = requireDeviation(state, companyId, checklistDeviationId);
    if (deviation.status !== "open") {
      throw createError(409, "egenkontroll_deviation_not_acknowledgeable", "Only open deviations can be acknowledged.");
    }
    deviation.status = "acknowledged";
    deviation.acknowledgedAt = nowIso(clock);
    deviation.acknowledgedByActorId = requireText(actorId, "actor_id_required");
    deviation.updatedAt = deviation.acknowledgedAt;
    pushAudit(state, clock, {
      companyId: deviation.companyId,
      actorId: deviation.acknowledgedByActorId,
      correlationId,
      action: "egenkontroll.deviation_acknowledged",
      entityType: "checklist_deviation",
      entityId: deviation.checklistDeviationId,
      projectId: deviation.projectId,
      explanation: `Acknowledged deviation ${deviation.checklistDeviationId}.`
    });
    return presentDeviation(deviation);
  }

  function resolveChecklistDeviation({
    companyId,
    checklistDeviationId,
    resolutionNote,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const deviation = requireDeviation(state, companyId, checklistDeviationId);
    if (deviation.status === "resolved") {
      return presentDeviation(deviation);
    }
    deviation.status = "resolved";
    deviation.resolutionNote = requireText(resolutionNote, "egenkontroll_deviation_resolution_note_required");
    deviation.resolvedAt = nowIso(clock);
    deviation.resolvedByActorId = requireText(actorId, "actor_id_required");
    deviation.updatedAt = deviation.resolvedAt;
    const instance = requireInstance(state, deviation.companyId, deviation.checklistInstanceId);
    if (!["signed_off", "closed"].includes(instance.status)) {
      instance.status = determineOpenDeviationCount(state, instance.checklistInstanceId) === 0 ? "in_progress" : "review_required";
      instance.updatedAt = nowIso(clock);
    }
    pushAudit(state, clock, {
      companyId: deviation.companyId,
      actorId: deviation.resolvedByActorId,
      correlationId,
      action: "egenkontroll.deviation_resolved",
      entityType: "checklist_deviation",
      entityId: deviation.checklistDeviationId,
      projectId: deviation.projectId,
      explanation: `Resolved deviation ${deviation.checklistDeviationId}.`
    });
    return presentDeviation(deviation);
  }

  function listChecklistSignoffs({ companyId, checklistInstanceId } = {}) {
    const instance = requireInstance(state, companyId, checklistInstanceId);
    return (state.signoffIdsByInstance.get(instance.checklistInstanceId) || [])
      .map((checklistSignoffId) => state.signoffs.get(checklistSignoffId))
      .filter(Boolean)
      .sort(compareSignoffs)
      .map((signoff) => presentSignoff(signoff));
  }

  function signOffChecklist({
    companyId,
    checklistInstanceId,
    signoffRoleCode,
    note = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const instance = requireInstance(state, companyId, checklistInstanceId);
    const template = requireTemplate(state, instance.companyId, instance.checklistTemplateId);
    const resolvedSignoffRoleCode = requireEnum(EGENKONTROLL_SIGNOFF_ROLE_CODES, signoffRoleCode, "egenkontroll_signoff_role_invalid");
    if (!template.requiredSignoffRoleCodes.includes(resolvedSignoffRoleCode)) {
      throw createError(409, "egenkontroll_signoff_role_not_required", "Sign-off role is not required for this template.");
    }
    if (!hasAllRequiredOutcomes(state, template, instance.checklistInstanceId)) {
      throw createError(409, "egenkontroll_signoff_blocked_incomplete", "Checklist cannot be signed off before all required points have outcomes.");
    }
    if (determineOpenDeviationCount(state, instance.checklistInstanceId) > 0) {
      throw createError(409, "egenkontroll_signoff_blocked_open_deviations", "Checklist cannot be signed off while deviations remain unresolved.");
    }
    const existingSignoff = (state.signoffIdsByInstance.get(instance.checklistInstanceId) || [])
      .map((checklistSignoffId) => state.signoffs.get(checklistSignoffId))
      .find((candidate) => candidate && candidate.signoffRoleCode === resolvedSignoffRoleCode);
    if (existingSignoff) {
      return {
        signoff: presentSignoff(existingSignoff),
        checklistInstance: presentInstance(state, instance, { includeHistory: true })
      };
    }
    const signoff = {
      checklistSignoffId: crypto.randomUUID(),
      checklistInstanceId: instance.checklistInstanceId,
      companyId: instance.companyId,
      signoffRoleCode: resolvedSignoffRoleCode,
      note: normalizeOptionalText(note),
      signedByActorId: requireText(actorId, "actor_id_required"),
      signedAt: nowIso(clock)
    };
    state.signoffs.set(signoff.checklistSignoffId, signoff);
    appendToIndex(state.signoffIdsByInstance, instance.checklistInstanceId, signoff.checklistSignoffId);
    const collectedRoles = new Set(
      (state.signoffIdsByInstance.get(instance.checklistInstanceId) || [])
        .map((checklistSignoffId) => state.signoffs.get(checklistSignoffId))
        .filter(Boolean)
        .map((record) => record.signoffRoleCode)
    );
    instance.status = template.requiredSignoffRoleCodes.every((roleCode) => collectedRoles.has(roleCode)) ? "closed" : "signed_off";
    instance.completedAt = instance.completedAt || signoff.signedAt;
    if (instance.status === "closed") {
      instance.closedAt = signoff.signedAt;
    }
    instance.updatedAt = signoff.signedAt;
    pushAudit(state, clock, {
      companyId: instance.companyId,
      actorId: signoff.signedByActorId,
      correlationId,
      action: "egenkontroll.instance_signed_off",
      entityType: "checklist_signoff",
      entityId: signoff.checklistSignoffId,
      projectId: instance.projectId,
      explanation: `Recorded ${resolvedSignoffRoleCode} sign-off on checklist instance ${instance.checklistInstanceId}.`
    });
    return {
      signoff: presentSignoff(signoff),
      checklistInstance: presentInstance(state, instance, { includeHistory: true })
    };
  }

  function listEgenkontrollAuditEvents({ companyId, checklistInstanceId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedChecklistInstanceId = normalizeOptionalText(checklistInstanceId);
    return state.auditEvents
      .filter((event) => event.companyId === resolvedCompanyId)
      .filter((event) => (resolvedChecklistInstanceId ? event.checklistInstanceId === resolvedChecklistInstanceId : true))
      .sort(compareAuditEvents)
      .map(copy);
  }

  function snapshotEgenkontroll({ companyId } = {}) {
    return {
      templates: listChecklistTemplates({ companyId }),
      instances: listChecklistInstances({ companyId }),
      deviations: listChecklistDeviations({ companyId }),
      auditEvents: listEgenkontrollAuditEvents({ companyId })
    };
  }
}

function presentTemplate(template) {
  return copy(template);
}

function presentInstance(state, instance, { includeHistory = false } = {}) {
  const template = state.templates.get(instance.checklistTemplateId);
  const latestPointOutcomes = getLatestOutcomesForInstance(state, instance.checklistInstanceId).map((outcome) => presentOutcome(outcome));
  const deviations = (state.deviationIdsByInstance.get(instance.checklistInstanceId) || [])
    .map((checklistDeviationId) => state.deviations.get(checklistDeviationId))
    .filter(Boolean)
    .sort(compareDeviations)
    .map((deviation) => presentDeviation(deviation));
  const signoffs = (state.signoffIdsByInstance.get(instance.checklistInstanceId) || [])
    .map((checklistSignoffId) => state.signoffs.get(checklistSignoffId))
    .filter(Boolean)
    .sort(compareSignoffs)
    .map((signoff) => presentSignoff(signoff));
  const collectedRoles = signoffs.map((signoff) => signoff.signoffRoleCode);
  const result = {
    ...copy(instance),
    template: template ? presentTemplate(template) : null,
    latestPointOutcomes,
    deviations,
    signoffs,
    summary: {
      totalPointCount: instance.requiredPointCodes.length,
      completedPointCount: latestPointOutcomes.length,
      unresolvedDeviationCount: deviations.filter((deviation) => deviation.status !== "resolved").length,
      requiredSignoffRoleCodes: copy(instance.requiredSignoffRoleCodes),
      collectedSignoffRoleCodes: copy(collectedRoles),
      pendingSignoffRoleCodes: instance.requiredSignoffRoleCodes.filter((roleCode) => !collectedRoles.includes(roleCode))
    }
  };
  if (includeHistory) {
    result.pointOutcomeHistory = (state.pointOutcomeIdsByInstance.get(instance.checklistInstanceId) || [])
      .map((checklistPointOutcomeId) => state.pointOutcomes.get(checklistPointOutcomeId))
      .filter(Boolean)
      .sort(compareOutcomes)
      .map((outcome) => presentOutcome(outcome));
  }
  return result;
}

function presentOutcome(outcome) {
  return copy(outcome);
}

function presentDeviation(deviation) {
  return copy(deviation);
}

function presentSignoff(signoff) {
  return copy(signoff);
}

function requireTemplate(state, companyId, checklistTemplateId) {
  const template = state.templates.get(requireText(checklistTemplateId, "checklist_template_id_required"));
  if (!template || template.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "egenkontroll_template_not_found", "Checklist template was not found.");
  }
  return template;
}

function requireInstance(state, companyId, checklistInstanceId) {
  const instance = state.instances.get(requireText(checklistInstanceId, "checklist_instance_id_required"));
  if (!instance || instance.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "egenkontroll_instance_not_found", "Checklist instance was not found.");
  }
  return instance;
}

function requireDeviation(state, companyId, checklistDeviationId) {
  const deviation = state.deviations.get(requireText(checklistDeviationId, "checklist_deviation_id_required"));
  if (!deviation || deviation.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "egenkontroll_deviation_not_found", "Checklist deviation was not found.");
  }
  return deviation;
}

function requireTemplatePoint(template, pointCode) {
  for (const section of template.sections) {
    for (const point of section.points) {
      if (point.pointCode === pointCode) {
        return point;
      }
    }
  }
  throw createError(404, "egenkontroll_point_not_found", "Checklist point was not found in the selected template.");
}

function determineNextTemplateVersion(state, companyId, templateCode) {
  const versions = (state.templateIdsByCompany.get(companyId) || [])
    .map((checklistTemplateId) => state.templates.get(checklistTemplateId))
    .filter(Boolean)
    .filter((template) => template.templateCode === templateCode)
    .map((template) => template.version);
  return versions.length === 0 ? 1 : Math.max(...versions) + 1;
}

function normalizeSections(sections) {
  if (!Array.isArray(sections) || sections.length === 0) {
    throw createError(400, "egenkontroll_template_sections_required", "Checklist template must contain at least one section.");
  }
  const seenSectionCodes = new Set();
  const seenPointCodes = new Set();
  return Object.freeze(
    sections.map((section, sectionIndex) => {
      const sectionCode = normalizeCode(section?.sectionCode || `section_${sectionIndex + 1}`, "egenkontroll_section_code_required");
      if (seenSectionCodes.has(sectionCode)) {
        throw createError(409, "egenkontroll_section_code_not_unique", `Checklist section ${sectionCode} is duplicated.`);
      }
      seenSectionCodes.add(sectionCode);
      const points = Array.isArray(section?.points) ? section.points : [];
      if (points.length === 0) {
        throw createError(400, "egenkontroll_section_points_required", `Checklist section ${sectionCode} must contain at least one point.`);
      }
      return Object.freeze({
        sectionCode,
        label: requireText(section?.label, "egenkontroll_section_label_required"),
        points: Object.freeze(
          points.map((point, pointIndex) => {
            const pointCode = normalizeCode(point?.pointCode || `${sectionCode}_${pointIndex + 1}`, "egenkontroll_point_code_required");
            if (seenPointCodes.has(pointCode)) {
              throw createError(409, "egenkontroll_point_code_not_unique", `Checklist point ${pointCode} is duplicated.`);
            }
            seenPointCodes.add(pointCode);
            return Object.freeze({
              pointCode,
              label: requireText(point?.label, "egenkontroll_point_label_required"),
              instructionText: normalizeOptionalText(point?.instructionText),
              evidenceRequiredFlag: point?.evidenceRequiredFlag === true
            });
          })
        )
      });
    })
  );
}

function normalizeSignoffRoleCodes(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw createError(400, "egenkontroll_signoff_roles_required", "Checklist template must define at least one sign-off role.");
  }
  const roles = [...new Set(values.map((value) => requireEnum(EGENKONTROLL_SIGNOFF_ROLE_CODES, value, "egenkontroll_signoff_role_invalid")))];
  return Object.freeze(roles);
}

function normalizeStringList(values, code) {
  if (!Array.isArray(values)) {
    return [];
  }
  return [...new Set(values.map((value) => requireText(value, code)))];
}

function getLatestOutcome(state, checklistInstanceId, pointCode) {
  const checklistPointOutcomeId = state.latestOutcomeIdByInstanceAndPoint.get(buildInstancePointKey(checklistInstanceId, pointCode));
  return checklistPointOutcomeId ? state.pointOutcomes.get(checklistPointOutcomeId) || null : null;
}

function getLatestOutcomesForInstance(state, checklistInstanceId) {
  return (state.pointOutcomeIdsByInstance.get(checklistInstanceId) || [])
    .map((checklistPointOutcomeId) => state.pointOutcomes.get(checklistPointOutcomeId))
    .filter(Boolean)
    .filter((outcome) => !outcome.supersededAt)
    .sort(compareOutcomes);
}

function hasAllRequiredOutcomes(state, template, checklistInstanceId) {
  return template.pointCodes.every((pointCode) => Boolean(getLatestOutcome(state, checklistInstanceId, pointCode)));
}

function determineOpenDeviationCount(state, checklistInstanceId) {
  return (state.deviationIdsByInstance.get(checklistInstanceId) || [])
    .map((checklistDeviationId) => state.deviations.get(checklistDeviationId))
    .filter(Boolean)
    .filter((deviation) => deviation.status !== "resolved")
    .length;
}

function flattenPointCodes(sections) {
  return sections.flatMap((section) => section.points.map((point) => point.pointCode));
}

function appendToIndex(index, key, value) {
  if (!index.has(key)) {
    index.set(key, []);
  }
  index.get(key).push(value);
}

function buildTemplateVersionKey(companyId, templateCode, version) {
  return `${companyId}:${templateCode}:${version}`;
}

function buildScopedProjectKey(companyId, projectId) {
  return `${companyId}:${projectId}`;
}

function buildScopedWorkOrderKey(companyId, workOrderId) {
  return `${companyId}:${workOrderId}`;
}

function buildInstancePointKey(checklistInstanceId, pointCode) {
  return `${checklistInstanceId}:${pointCode}`;
}

function compareTemplates(left, right) {
  return left.templateCode.localeCompare(right.templateCode) || right.version - left.version || left.createdAt.localeCompare(right.createdAt);
}

function compareInstances(left, right) {
  return left.createdAt.localeCompare(right.createdAt) || left.checklistInstanceId.localeCompare(right.checklistInstanceId);
}

function compareOutcomes(left, right) {
  return left.createdAt.localeCompare(right.createdAt) || left.pointCode.localeCompare(right.pointCode);
}

function compareDeviations(left, right) {
  return left.createdAt.localeCompare(right.createdAt) || left.checklistDeviationId.localeCompare(right.checklistDeviationId);
}

function compareSignoffs(left, right) {
  return left.signedAt.localeCompare(right.signedAt) || left.checklistSignoffId.localeCompare(right.checklistSignoffId);
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

function normalizeCode(value, code) {
  return requireText(value, code).replaceAll("-", "_").replaceAll(" ", "_").toUpperCase();
}

function normalizeOptionalCode(value) {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized.replaceAll("-", "_").replaceAll(" ", "_").toUpperCase() : null;
}

function requireEnum(allowedValues, value, code) {
  const normalized = requireText(value, code).replaceAll("-", "_").replaceAll(" ", "_").toLowerCase();
  if (!allowedValues.includes(normalized)) {
    throw createError(400, code, `Value ${normalized} is not allowed.`);
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

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

function pushAudit(state, clock, entry) {
  state.auditEvents.push(
    createAuditEnvelopeFromLegacyEvent({
      clock,
      auditClass: "egenkontroll_action",
      event: entry
    })
  );
}

function buildHash(value) {
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
