import { createReportingPlatform } from "../../domain-reporting/src/index.mjs";
import {
  DASHBOARD_WIDGET_STATUSES,
  DASHBOARD_WIDGET_TYPE_CODES,
  SAVED_VIEW_STATUSES,
  SAVED_VIEW_VISIBILITY_CODES,
  SEARCH_DOCUMENT_STATUSES,
  SEARCH_REINDEX_STATUSES
} from "./constants.mjs";
import {
  appendToIndex,
  assertAllowed,
  copy,
  createError,
  dedupeStrings,
  documentRegistryKey,
  hashObject,
  isSavedViewVisible,
  isVisible,
  newId,
  normalizeCode,
  normalizeEnumValue,
  normalizeObjectOrDefault,
  normalizeOptionalDateTime,
  normalizeOptionalText,
  normalizePermissionScope,
  normalizePlainObject,
  nowIso,
  requireText
} from "./helpers.mjs";

export function createSearchPlatform(options = {}) {
  return createSearchEngine(options);
}

export function createSearchEngine({ clock = () => new Date(), reportingPlatform = null } = {}) {
  const reporting = reportingPlatform || createReportingPlatform({ clock });
  const state = {
    projectionContracts: new Map(),
    searchDocuments: new Map(),
    searchDocumentIdsByCompany: new Map(),
    searchDocumentIdByKey: new Map(),
    reindexRequests: new Map(),
    reindexRequestIdsByCompany: new Map(),
    savedViews: new Map(),
    savedViewIdsByCompany: new Map(),
    dashboardWidgets: new Map(),
    dashboardWidgetIdsByCompany: new Map(),
    auditEvents: []
  };

  return {
    searchDocumentStatuses: SEARCH_DOCUMENT_STATUSES,
    searchReindexStatuses: SEARCH_REINDEX_STATUSES,
    savedViewStatuses: SAVED_VIEW_STATUSES,
    savedViewVisibilityCodes: SAVED_VIEW_VISIBILITY_CODES,
    dashboardWidgetStatuses: DASHBOARD_WIDGET_STATUSES,
    dashboardWidgetTypeCodes: DASHBOARD_WIDGET_TYPE_CODES,
    listSearchProjectionContracts,
    requestSearchReindex,
    listSearchReindexRequests,
    listSearchDocuments,
    getSearchDocument,
    createSavedView,
    listSavedViews,
    getSavedView,
    updateSavedView,
    shareSavedView,
    archiveSavedView,
    repairSavedView,
    createDashboardWidget,
    listDashboardWidgets,
    snapshotSearch
  };

  function listSearchProjectionContracts({ companyId } = {}) {
    return syncProjectionContracts(requireText(companyId, "company_id_required")).map(copy);
  }

  function requestSearchReindex({
    companyId,
    projectionCode = null,
    reasonCode = "manual_request",
    actorId = "system",
    correlationId = newId()
  } = {}) {
    const request = {
      searchReindexRequestId: newId(),
      companyId: requireText(companyId, "company_id_required"),
      projectionCode: normalizeOptionalText(projectionCode),
      reasonCode: normalizeCode(reasonCode, "search_reindex_reason_required"),
      actorId: requireText(actorId, "actor_id_required"),
      status: "requested",
      requestedAt: nowIso(clock),
      startedAt: null,
      completedAt: null,
      errorCode: null,
      indexedCount: 0,
      unchangedCount: 0,
      tombstonedCount: 0
    };
    state.reindexRequests.set(request.searchReindexRequestId, request);
    appendToIndex(state.reindexRequestIdsByCompany, request.companyId, request.searchReindexRequestId);
    pushAudit({
      companyId: request.companyId,
      actorId: request.actorId,
      correlationId,
      action: "search.reindex.requested",
      entityType: "search_reindex_request",
      entityId: request.searchReindexRequestId,
      explanation: `Requested search reindex${request.projectionCode ? ` for ${request.projectionCode}` : ""}.`
    });
    return runReindex(request, correlationId);
  }

  function listSearchReindexRequests({ companyId, projectionCode = null, status = null } = {}) {
    const resolvedStatus =
      status == null
        ? null
        : assertAllowed(normalizeEnumValue(status, "search_reindex_status_required"), SEARCH_REINDEX_STATUSES, "search_reindex_status_invalid");
    return (state.reindexRequestIdsByCompany.get(requireText(companyId, "company_id_required")) || [])
      .map((requestId) => state.reindexRequests.get(requestId))
      .filter(Boolean)
      .filter((request) => (projectionCode ? request.projectionCode === projectionCode : true))
      .filter((request) => (resolvedStatus ? request.status === resolvedStatus : true))
      .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))
      .map(copy);
  }

  function listSearchDocuments({
    companyId,
    query = null,
    projectionCode = null,
    objectType = null,
    status = null,
    viewerUserId = null,
    viewerTeamIds = [],
    limit = 50
  } = {}) {
    const resolvedStatus =
      status == null
        ? null
        : assertAllowed(normalizeEnumValue(status, "search_document_status_required"), SEARCH_DOCUMENT_STATUSES, "search_document_status_invalid");
    const normalizedQuery = normalizeOptionalText(query);
    const normalizedViewerUserId = normalizeOptionalText(viewerUserId);
    const normalizedViewerTeamIds = dedupeStrings(Array.isArray(viewerTeamIds) ? viewerTeamIds : []);
    const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
    return (state.searchDocumentIdsByCompany.get(requireText(companyId, "company_id_required")) || [])
      .map((documentId) => state.searchDocuments.get(documentId))
      .filter(Boolean)
      .filter((document) => (projectionCode ? document.projectionCode === projectionCode : true))
      .filter((document) => (objectType ? document.objectType === objectType : true))
      .filter((document) => (resolvedStatus ? document.status === resolvedStatus : !["tombstoned", "purged"].includes(document.status)))
      .filter((document) => isVisible(document.permissionScope, normalizedViewerUserId, normalizedViewerTeamIds))
      .map((document) => ({ ...copy(document), matchScore: computeMatchScore(document, normalizedQuery) }))
      .filter((document) => (normalizedQuery ? document.matchScore > 0 : true))
      .sort(compareSearchResults)
      .slice(0, safeLimit);
  }

  function getSearchDocument({ companyId, searchDocumentId, viewerUserId = null, viewerTeamIds = [] } = {}) {
    const document = requireSearchDocument(requireText(companyId, "company_id_required"), searchDocumentId);
    if (!isVisible(document.permissionScope, normalizeOptionalText(viewerUserId), dedupeStrings(Array.isArray(viewerTeamIds) ? viewerTeamIds : []))) {
      throw createError(403, "search_document_forbidden", "Search document is not visible to the current actor.");
    }
    return copy(document);
  }

  function createSavedView({ companyId, ownerUserId, surfaceCode, title, queryJson, sortJson = {}, visibilityCode = "private", sharedWithTeamId = null, actorId = "system", correlationId = newId() } = {}) {
    const savedView = buildSavedView({
      companyId: requireText(companyId, "company_id_required"),
      savedViewId: newId(),
      ownerUserId: requireText(ownerUserId, "saved_view_owner_user_id_required"),
      surfaceCode: normalizeCode(surfaceCode, "saved_view_surface_code_required"),
      title: requireText(title, "saved_view_title_required"),
      queryJson,
      sortJson,
      visibilityCode,
      sharedWithTeamId,
      actorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    });
    state.savedViews.set(savedView.savedViewId, savedView);
    appendToIndex(state.savedViewIdsByCompany, savedView.companyId, savedView.savedViewId);
    pushAudit({ companyId: savedView.companyId, actorId: savedView.createdByActorId, correlationId, action: "search.saved_view.created", entityType: "saved_view", entityId: savedView.savedViewId, explanation: `Created saved view ${savedView.savedViewId}.` });
    return copy(savedView);
  }

  function listSavedViews({ companyId, viewerUserId, viewerTeamIds = [], surfaceCode = null, status = null } = {}) {
    const resolvedStatus =
      status == null
        ? null
        : assertAllowed(normalizeEnumValue(status, "saved_view_status_required"), SAVED_VIEW_STATUSES, "saved_view_status_invalid");
    const normalizedViewerTeamIds = dedupeStrings(Array.isArray(viewerTeamIds) ? viewerTeamIds : []);
    return (state.savedViewIdsByCompany.get(requireText(companyId, "company_id_required")) || [])
      .map((savedViewId) => state.savedViews.get(savedViewId))
      .filter(Boolean)
      .filter((savedView) => isSavedViewVisible(savedView, requireText(viewerUserId, "saved_view_viewer_user_id_required"), normalizedViewerTeamIds))
      .filter((savedView) => (surfaceCode ? savedView.surfaceCode === surfaceCode.toUpperCase() : true))
      .filter((savedView) => (resolvedStatus ? savedView.status === resolvedStatus : true))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map(copy);
  }

  function getSavedView({ companyId, savedViewId, viewerUserId, viewerTeamIds = [] } = {}) {
    const savedView = requireSavedView(requireText(companyId, "company_id_required"), savedViewId);
    if (!isSavedViewVisible(savedView, requireText(viewerUserId, "saved_view_viewer_user_id_required"), dedupeStrings(Array.isArray(viewerTeamIds) ? viewerTeamIds : []))) {
      throw createError(403, "saved_view_forbidden", "Saved view is not visible to the current actor.");
    }
    return copy(savedView);
  }

  function updateSavedView({ companyId, savedViewId, viewerUserId, title = null, queryJson = undefined, sortJson = undefined, actorId = "system", correlationId = newId() } = {}) {
    const savedView = requireOwnedSavedView(requireText(companyId, "company_id_required"), savedViewId, viewerUserId);
    if (savedView.status === "archived") {
      throw createError(409, "saved_view_archived", "Archived saved view cannot be updated.");
    }
    const next = buildSavedView({
      companyId: savedView.companyId,
      savedViewId: savedView.savedViewId,
      ownerUserId: savedView.ownerUserId,
      surfaceCode: savedView.surfaceCode,
      title: title == null ? savedView.title : title,
      queryJson: queryJson === undefined ? savedView.queryJson : queryJson,
      sortJson: sortJson === undefined ? savedView.sortJson : sortJson,
      visibilityCode: savedView.visibilityCode,
      sharedWithTeamId: savedView.sharedWithTeamId,
      actorId: requireText(actorId, "actor_id_required"),
      createdAt: savedView.createdAt,
      updatedAt: nowIso(clock)
    });
    state.savedViews.set(next.savedViewId, next);
    pushAudit({ companyId: next.companyId, actorId: next.createdByActorId, correlationId, action: "search.saved_view.updated", entityType: "saved_view", entityId: next.savedViewId, explanation: `Updated saved view ${next.savedViewId}.` });
    return copy(next);
  }

  function shareSavedView({ companyId, savedViewId, viewerUserId, visibilityCode, sharedWithTeamId = null, actorId = "system", correlationId = newId() } = {}) {
    const savedView = requireOwnedSavedView(requireText(companyId, "company_id_required"), savedViewId, viewerUserId);
    const resolvedVisibilityCode = assertAllowed(normalizeEnumValue(visibilityCode, "saved_view_visibility_code_required"), SAVED_VIEW_VISIBILITY_CODES, "saved_view_visibility_code_invalid");
    if (resolvedVisibilityCode === "team" && !normalizeOptionalText(sharedWithTeamId)) {
      throw createError(400, "saved_view_team_id_required", "Team visibility requires sharedWithTeamId.");
    }
    savedView.visibilityCode = resolvedVisibilityCode;
    savedView.sharedWithTeamId = resolvedVisibilityCode === "team" ? requireText(sharedWithTeamId, "saved_view_team_id_required") : null;
    savedView.updatedAt = nowIso(clock);
    pushAudit({ companyId: savedView.companyId, actorId: requireText(actorId, "actor_id_required"), correlationId, action: "search.saved_view.shared", entityType: "saved_view", entityId: savedView.savedViewId, explanation: `Shared saved view ${savedView.savedViewId} as ${savedView.visibilityCode}.` });
    return copy(savedView);
  }

  function archiveSavedView({ companyId, savedViewId, viewerUserId, actorId = "system", correlationId = newId() } = {}) {
    const savedView = requireOwnedSavedView(requireText(companyId, "company_id_required"), savedViewId, viewerUserId);
    savedView.status = "archived";
    savedView.updatedAt = nowIso(clock);
    pushAudit({ companyId: savedView.companyId, actorId: requireText(actorId, "actor_id_required"), correlationId, action: "search.saved_view.archived", entityType: "saved_view", entityId: savedView.savedViewId, explanation: `Archived saved view ${savedView.savedViewId}.` });
    return copy(savedView);
  }

  function repairSavedView({ companyId, savedViewId, viewerUserId, actorId = "system", correlationId = newId() } = {}) {
    const savedView = requireOwnedSavedView(requireText(companyId, "company_id_required"), savedViewId, viewerUserId);
    const evaluation = evaluateSavedViewQuery(savedView.companyId, savedView.queryJson);
    savedView.status = evaluation.status;
    savedView.brokenReasonCode = evaluation.brokenReasonCode;
    savedView.updatedAt = nowIso(clock);
    pushAudit({ companyId: savedView.companyId, actorId: requireText(actorId, "actor_id_required"), correlationId, action: "search.saved_view.repaired", entityType: "saved_view", entityId: savedView.savedViewId, explanation: `Repaired saved view ${savedView.savedViewId}.` });
    return copy(savedView);
  }

  function createDashboardWidget({ companyId, ownerUserId, surfaceCode, widgetTypeCode, layoutSlot, settingsJson = {}, actorId = "system", correlationId = newId() } = {}) {
    const widget = {
      dashboardWidgetId: newId(),
      companyId: requireText(companyId, "company_id_required"),
      ownerUserId: requireText(ownerUserId, "dashboard_widget_owner_user_id_required"),
      surfaceCode: normalizeCode(surfaceCode, "dashboard_widget_surface_code_required"),
      widgetTypeCode: assertAllowed(normalizeEnumValue(widgetTypeCode, "dashboard_widget_type_code_required"), DASHBOARD_WIDGET_TYPE_CODES, "dashboard_widget_type_code_invalid"),
      layoutSlot: requireText(layoutSlot, "dashboard_widget_layout_slot_required"),
      settingsJson: copy(normalizePlainObject(settingsJson, "dashboard_widget_settings_invalid")),
      status: evaluateDashboardWidgetStatus(requireText(companyId, "company_id_required"), settingsJson),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.dashboardWidgets.set(widget.dashboardWidgetId, widget);
    appendToIndex(state.dashboardWidgetIdsByCompany, widget.companyId, widget.dashboardWidgetId);
    pushAudit({ companyId: widget.companyId, actorId: widget.createdByActorId, correlationId, action: "search.dashboard_widget.created", entityType: "dashboard_widget", entityId: widget.dashboardWidgetId, explanation: `Created dashboard widget ${widget.dashboardWidgetId}.` });
    return copy(widget);
  }

  function listDashboardWidgets({ companyId, ownerUserId, surfaceCode = null, status = null } = {}) {
    const resolvedStatus =
      status == null
        ? null
        : assertAllowed(normalizeEnumValue(status, "dashboard_widget_status_required"), DASHBOARD_WIDGET_STATUSES, "dashboard_widget_status_invalid");
    return (state.dashboardWidgetIdsByCompany.get(requireText(companyId, "company_id_required")) || [])
      .map((widgetId) => state.dashboardWidgets.get(widgetId))
      .filter(Boolean)
      .filter((widget) => widget.ownerUserId === requireText(ownerUserId, "dashboard_widget_owner_user_id_required"))
      .filter((widget) => (surfaceCode ? widget.surfaceCode === surfaceCode.toUpperCase() : true))
      .filter((widget) => (resolvedStatus ? widget.status === resolvedStatus : true))
      .sort((left, right) => left.layoutSlot.localeCompare(right.layoutSlot) || right.updatedAt.localeCompare(left.updatedAt))
      .map(copy);
  }

  function snapshotSearch() {
    return copy({
      projectionContracts: [...state.projectionContracts.values()],
      searchDocuments: [...state.searchDocuments.values()],
      reindexRequests: [...state.reindexRequests.values()],
      savedViews: [...state.savedViews.values()],
      dashboardWidgets: [...state.dashboardWidgets.values()],
      auditEvents: state.auditEvents
    });
  }

  function runReindex(request, correlationId) {
    request.status = "running";
    request.startedAt = nowIso(clock);
    const contracts = syncProjectionContracts(request.companyId).filter((contract) =>
      request.projectionCode ? contract.projectionCode === request.projectionCode : true
    );
    if (request.projectionCode && contracts.length === 0) {
      request.status = "failed";
      request.completedAt = nowIso(clock);
      request.errorCode = "search_projection_contract_missing";
      throw createError(404, "search_projection_contract_missing", `Projection contract ${request.projectionCode} was not found.`);
    }

    const seenKeys = new Set();
    let indexedCount = 0;
    let unchangedCount = 0;
    for (const contract of contracts) {
      const source = resolveProjectionSource(contract.sourceDomainCode);
      const documents = source.listSearchProjectionDocuments({ companyId: request.companyId }).filter((document) => document.projectionCode === contract.projectionCode);
      for (const rawDocument of documents) {
        const result = upsertProjectionDocument(request.companyId, contract, rawDocument);
        seenKeys.add(result.documentKey);
        if (result.changed) {
          indexedCount += 1;
        } else {
          unchangedCount += 1;
        }
      }
    }

    let tombstonedCount = 0;
    for (const documentId of state.searchDocumentIdsByCompany.get(request.companyId) || []) {
      const document = state.searchDocuments.get(documentId);
      if (!document || ["tombstoned", "purged"].includes(document.status)) {
        continue;
      }
      if (request.projectionCode && document.projectionCode !== request.projectionCode) {
        continue;
      }
      const key = documentRegistryKey(document.companyId, document.projectionCode, document.objectId);
      if (seenKeys.has(key)) {
        continue;
      }
      document.status = "tombstoned";
      document.tombstonedAt = nowIso(clock);
      document.updatedAt = document.tombstonedAt;
      tombstonedCount += 1;
    }

    request.status = "completed";
    request.completedAt = nowIso(clock);
    request.indexedCount = indexedCount;
    request.unchangedCount = unchangedCount;
    request.tombstonedCount = tombstonedCount;
    pushAudit({ companyId: request.companyId, actorId: request.actorId, correlationId, action: "search.reindex.completed", entityType: "search_reindex_request", entityId: request.searchReindexRequestId, explanation: `Completed search reindex with ${indexedCount} indexed and ${tombstonedCount} tombstoned documents.` });
    return { reindexRequest: copy(request), indexingSummary: { projectionCount: contracts.length, indexedCount, unchangedCount, tombstonedCount } };
  }

  function syncProjectionContracts(companyId) {
    const results = [];
    for (const source of collectProjectionSources()) {
      for (const rawContract of source.listSearchProjectionContracts({ companyId })) {
        const contract = normalizeProjectionContract(companyId, source.sourceDomainCode, rawContract);
        const existing = state.projectionContracts.get(contract.projectionContractId);
        state.projectionContracts.set(contract.projectionContractId, { ...(existing || {}), ...contract, updatedAt: nowIso(clock) });
        results.push(copy(state.projectionContracts.get(contract.projectionContractId)));
      }
    }
    return results.sort((left, right) => left.projectionCode.localeCompare(right.projectionCode));
  }

  function collectProjectionSources() {
    if (
      reporting &&
      typeof reporting.listSearchProjectionContracts === "function" &&
      typeof reporting.listSearchProjectionDocuments === "function"
    ) {
      return [
        {
          sourceDomainCode: "reporting",
          listSearchProjectionContracts: (input) => reporting.listSearchProjectionContracts(input),
          listSearchProjectionDocuments: (input) => reporting.listSearchProjectionDocuments(input)
        }
      ];
    }
    return [];
  }

  function resolveProjectionSource(sourceDomainCode) {
    const source = collectProjectionSources().find((candidate) => candidate.sourceDomainCode === sourceDomainCode);
    if (!source) {
      throw createError(500, "search_projection_source_missing", `Projection source ${sourceDomainCode} is not configured.`);
    }
    return source;
  }

  function upsertProjectionDocument(companyId, contract, rawDocument) {
    const objectId = requireText(rawDocument.objectId, "search_projection_object_id_required");
    const registryKey = documentRegistryKey(companyId, contract.projectionCode, objectId);
    const existingId = state.searchDocumentIdByKey.get(registryKey);
    const existing = existingId ? state.searchDocuments.get(existingId) : null;
    const normalized = normalizeProjectionDocument(contract, rawDocument, existing);
    if (existing && existing.sourceHash === normalized.sourceHash && existing.status === "indexed") {
      existing.updatedAt = nowIso(clock);
      return { changed: false, documentKey: registryKey };
    }

    const searchDocument = {
      searchDocumentId: existing?.searchDocumentId || newId(),
      companyId,
      projectionCode: contract.projectionCode,
      sourceDomainCode: contract.sourceDomainCode,
      objectType: contract.objectType,
      objectId,
      ...normalized,
      status: "indexed",
      indexedVersion: existing ? Number(existing.indexedVersion || 0) + 1 : 1,
      indexedAt: nowIso(clock),
      staleAt: null,
      tombstonedAt: null,
      createdAt: existing?.createdAt || nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.searchDocuments.set(searchDocument.searchDocumentId, searchDocument);
    if (!existing) {
      appendToIndex(state.searchDocumentIdsByCompany, companyId, searchDocument.searchDocumentId);
    }
    state.searchDocumentIdByKey.set(registryKey, searchDocument.searchDocumentId);
    return { changed: true, documentKey: registryKey };
  }

  function buildSavedView(input) {
    const evaluation = evaluateSavedViewQuery(input.companyId, input.queryJson);
    const visibilityCode = assertAllowed(normalizeEnumValue(input.visibilityCode, "saved_view_visibility_code_required"), SAVED_VIEW_VISIBILITY_CODES, "saved_view_visibility_code_invalid");
    return {
      savedViewId: input.savedViewId,
      companyId: input.companyId,
      ownerUserId: input.ownerUserId,
      surfaceCode: input.surfaceCode,
      title: input.title,
      queryJson: copy(normalizePlainObject(input.queryJson, "saved_view_query_invalid")),
      sortJson: copy(normalizePlainObject(input.sortJson, "saved_view_sort_invalid")),
      visibilityCode,
      sharedWithTeamId: visibilityCode === "team" ? requireText(input.sharedWithTeamId, "saved_view_team_id_required") : null,
      status: evaluation.status,
      brokenReasonCode: evaluation.brokenReasonCode,
      createdByActorId: input.actorId,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt
    };
  }

  function evaluateSavedViewQuery(companyId, queryJson) {
    const normalizedQuery = normalizePlainObject(queryJson, "saved_view_query_invalid");
    const contracts = syncProjectionContracts(companyId);
    if (normalizedQuery.projectionCode && !contracts.some((contract) => contract.projectionCode === normalizedQuery.projectionCode)) {
      return { status: "broken", brokenReasonCode: "projection_contract_missing" };
    }
    if (normalizedQuery.objectType && !contracts.some((contract) => contract.objectType === normalizedQuery.objectType)) {
      return { status: "broken", brokenReasonCode: "object_type_not_indexed" };
    }
    return { status: "active", brokenReasonCode: null };
  }

  function evaluateDashboardWidgetStatus(companyId, settingsJson) {
    const savedViewId = normalizeOptionalText(settingsJson.savedViewId);
    if (!savedViewId) {
      return "active";
    }
    const savedView = requireSavedView(companyId, savedViewId);
    return savedView.status === "active" ? "active" : "degraded";
  }

  function requireSearchDocument(companyId, searchDocumentId) {
    const document = state.searchDocuments.get(requireText(searchDocumentId, "search_document_id_required"));
    if (!document || document.companyId !== companyId) {
      throw createError(404, "search_document_not_found", "Search document was not found.");
    }
    return document;
  }

  function requireSavedView(companyId, savedViewId) {
    const savedView = state.savedViews.get(requireText(savedViewId, "saved_view_id_required"));
    if (!savedView || savedView.companyId !== companyId) {
      throw createError(404, "saved_view_not_found", "Saved view was not found.");
    }
    return savedView;
  }

  function requireOwnedSavedView(companyId, savedViewId, viewerUserId) {
    const savedView = requireSavedView(companyId, savedViewId);
    if (savedView.ownerUserId !== requireText(viewerUserId, "saved_view_viewer_user_id_required")) {
      throw createError(403, "saved_view_forbidden", "Saved view is not owned by the current actor.");
    }
    return savedView;
  }

  function pushAudit({ companyId, actorId, correlationId, action, entityType, entityId, explanation }) {
    state.auditEvents.push({
      auditEventId: newId(),
      companyId,
      actorId,
      correlationId,
      action,
      entityType,
      entityId,
      explanation,
      recordedAt: nowIso(clock)
    });
  }
}

function normalizeProjectionContract(companyId, sourceDomainCode, rawContract) {
  const projectionCode = requireText(rawContract.projectionCode, "search_projection_code_required");
  return {
    projectionContractId: `${companyId}::${projectionCode}`,
    companyId,
    projectionCode,
    objectType: requireText(rawContract.objectType, "search_projection_object_type_required"),
    sourceDomainCode: normalizeOptionalText(rawContract.sourceDomainCode) || sourceDomainCode,
    displayName: requireText(rawContract.displayName || projectionCode, "search_projection_display_name_required"),
    projectionVersionNo: Number(rawContract.projectionVersionNo || 1),
    visibilityScope: rawContract.visibilityScope || "company",
    supportsGlobalSearch: rawContract.supportsGlobalSearch !== false,
    supportsSavedViews: rawContract.supportsSavedViews !== false,
    surfaceCodes: dedupeStrings(Array.isArray(rawContract.surfaceCodes) ? rawContract.surfaceCodes : ["desktop.search"]),
    filterFieldCodes: dedupeStrings(Array.isArray(rawContract.filterFieldCodes) ? rawContract.filterFieldCodes : [])
  };
}

function normalizeProjectionDocument(contract, rawDocument, existingDocument) {
  const filterPayload = normalizeObjectOrDefault(rawDocument.filterPayload);
  const permissionScope = normalizePermissionScope(rawDocument.permissionScope, contract.visibilityScope);
  const surfaceCodes = dedupeStrings(Array.isArray(rawDocument.surfaceCodes) ? rawDocument.surfaceCodes : contract.surfaceCodes);
  const searchText = normalizeOptionalText(rawDocument.searchText) || buildSearchText(rawDocument);
  const sourceVersion =
    normalizeOptionalText(rawDocument.sourceVersion) ||
    hashObject({
      projectionCode: contract.projectionCode,
      objectId: rawDocument.objectId,
      searchText,
      filterPayload,
      permissionScope,
      sourceUpdatedAt: rawDocument.sourceUpdatedAt || existingDocument?.sourceUpdatedAt || null
    });
  return {
    displayTitle: requireText(rawDocument.displayTitle || rawDocument.title, "search_document_title_required"),
    displaySubtitle: normalizeOptionalText(rawDocument.displaySubtitle || rawDocument.subtitle),
    documentStatus: normalizeOptionalText(rawDocument.documentStatus || rawDocument.status) || "active",
    searchText,
    snippet: normalizeOptionalText(rawDocument.snippet),
    filterPayload,
    permissionScope,
    surfaceCodes,
    sourceVersion,
    sourceHash: hashObject({
      projectionCode: contract.projectionCode,
      displayTitle: rawDocument.displayTitle || rawDocument.title,
      displaySubtitle: rawDocument.displaySubtitle || rawDocument.subtitle || null,
      documentStatus: rawDocument.documentStatus || rawDocument.status || "active",
      searchText,
      filterPayload,
      permissionScope,
      surfaceCodes,
      sourceVersion
    }),
    sourceUpdatedAt: normalizeOptionalDateTime(rawDocument.sourceUpdatedAt) || existingDocument?.sourceUpdatedAt || new Date().toISOString()
  };
}

function buildSearchText(rawDocument) {
  return dedupeStrings(
    [
      rawDocument.displayTitle,
      rawDocument.title,
      rawDocument.displaySubtitle,
      rawDocument.subtitle,
      rawDocument.status,
      rawDocument.documentStatus,
      rawDocument.objectId,
      rawDocument.objectType,
      rawDocument.searchKeywords,
      rawDocument.searchSummary
    ]
      .flat()
      .filter((value) => typeof value === "string" && value.trim().length > 0)
  ).join(" ");
}

function computeMatchScore(document, query) {
  const normalizedQuery = normalizeOptionalText(query)?.toLowerCase();
  if (!normalizedQuery) {
    return 1;
  }
  const title = `${document.displayTitle} ${document.displaySubtitle || ""}`.trim().toLowerCase();
  const haystack = `${title} ${document.searchText}`.trim().toLowerCase();
  if (document.objectId.toLowerCase() === normalizedQuery) {
    return 1000;
  }
  let score = 0;
  if (title === normalizedQuery) {
    score += 900;
  }
  if (title.includes(normalizedQuery)) {
    score += 500;
  }
  if (haystack.includes(normalizedQuery)) {
    score += 250;
  }
  for (const token of normalizedQuery.split(/\s+/).filter(Boolean)) {
    if (title.includes(token)) {
      score += 120;
    } else if (haystack.includes(token)) {
      score += 35;
    }
  }
  return score;
}

function compareSearchResults(left, right) {
  if (right.matchScore !== left.matchScore) {
    return right.matchScore - left.matchScore;
  }
  const rank = statusScore(right.status) - statusScore(left.status);
  if (rank !== 0) {
    return rank;
  }
  return right.updatedAt.localeCompare(left.updatedAt);
}

function statusScore(status) {
  return { indexed: 4, stale: 3, tombstoned: 2, purged: 1 }[status] || 0;
}
