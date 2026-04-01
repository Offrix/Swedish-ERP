import { createReportingPlatform } from "../../domain-reporting/src/index.mjs";
import {
  getObjectProfileContract,
  getWorkbenchContract,
  OBJECT_PROFILE_CONTRACTS,
  WORKBENCH_CONTRACTS
} from "./contracts.mjs";
import {
  DASHBOARD_WIDGET_STATUSES,
  DASHBOARD_WIDGET_TYPE_CODES,
  PROJECTION_CHECKPOINT_STATUSES,
  SAVED_VIEW_STATUSES,
  SAVED_VIEW_VISIBILITY_CODES,
  SEARCH_DOCUMENT_STATUSES,
  SEARCH_REBUILD_MODES,
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
import { createAuditEnvelope } from "../../events/src/index.mjs";

export function createSearchPlatform(options = {}) {
  return createSearchEngine(options);
}

export function createSearchEngine({
  clock = () => new Date(),
  reportingPlatform = null,
  getLedgerPlatform = null,
  getVatPlatform = null,
  getTaxAccountPlatform = null,
  getPayrollPlatform = null,
  getHusPlatform = null,
  getAnnualReportingPlatform = null,
  getReviewCenterPlatform = null,
  getNotificationsPlatform = null,
  getActivityPlatform = null,
  getProjectsPlatform = null,
  getFieldPlatform = null,
  getPersonalliggarePlatform = null,
  getId06Platform = null,
  getCorePlatform = null,
  getArPlatform = null,
  getApPlatform = null,
  getBankingPlatform = null,
  getImportCasesPlatform = null,
  getLegalFormPlatform = null,
  getIntegrationsPlatform = null,
  getDocumentClassificationPlatform = null
} = {}) {
  const reporting = reportingPlatform || createReportingPlatform({ clock });
  const state = {
    projectionContracts: new Map(),
    projectionCheckpoints: new Map(),
    projectionCheckpointIdsByCompany: new Map(),
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
  const lazyPlatforms = {
    ledger: getLedgerPlatform,
    vat: getVatPlatform,
    taxAccount: getTaxAccountPlatform,
    payroll: getPayrollPlatform,
    hus: getHusPlatform,
    annualReporting: getAnnualReportingPlatform,
    reviewCenter: getReviewCenterPlatform,
    notifications: getNotificationsPlatform,
    activity: getActivityPlatform,
    projects: getProjectsPlatform,
    field: getFieldPlatform,
    personalliggare: getPersonalliggarePlatform,
    id06: getId06Platform,
    core: getCorePlatform,
    ar: getArPlatform,
    ap: getApPlatform,
    banking: getBankingPlatform,
    importCases: getImportCasesPlatform,
    legalForm: getLegalFormPlatform,
    integrations: getIntegrationsPlatform,
    documentClassification: getDocumentClassificationPlatform
  };

  const engine = {
    searchDocumentStatuses: SEARCH_DOCUMENT_STATUSES,
    searchReindexStatuses: SEARCH_REINDEX_STATUSES,
    searchRebuildModes: SEARCH_REBUILD_MODES,
    projectionCheckpointStatuses: PROJECTION_CHECKPOINT_STATUSES,
    savedViewStatuses: SAVED_VIEW_STATUSES,
    savedViewVisibilityCodes: SAVED_VIEW_VISIBILITY_CODES,
    dashboardWidgetStatuses: DASHBOARD_WIDGET_STATUSES,
    dashboardWidgetTypeCodes: DASHBOARD_WIDGET_TYPE_CODES,
    listSearchProjectionContracts,
    listProjectionCheckpoints,
    requestSearchReindex,
    executeSearchReindexRequest,
    failSearchReindexRequest,
    listSearchReindexRequests,
    listSearchDocuments,
    getSearchDocument,
    listObjectProfileContracts,
    getObjectProfile,
    listWorkbenchContracts,
    getWorkbench,
    createSavedView,
    listSavedViews,
    getSavedView,
    updateSavedView,
    shareSavedView,
    archiveSavedView,
    repairSavedView,
    runSavedViewCompatibilityScan,
    createDashboardWidget,
    listDashboardWidgets,
    snapshotSearch
  };

  Object.defineProperty(engine, "__durableState", {
    value: state,
    enumerable: false
  });

  return engine;

  function listSearchProjectionContracts({ companyId } = {}) {
    return syncProjectionContracts(requireText(companyId, "company_id_required")).map(copy);
  }

  function listProjectionCheckpoints({ companyId, projectionCode = null, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus =
      status == null
        ? null
        : assertAllowed(normalizeEnumValue(status, "projection_checkpoint_status_required"), PROJECTION_CHECKPOINT_STATUSES, "projection_checkpoint_status_invalid");
    const resolvedProjectionCode = normalizeOptionalText(projectionCode);
    return (state.projectionCheckpointIdsByCompany.get(resolvedCompanyId) || [])
      .map((checkpointId) => state.projectionCheckpoints.get(checkpointId))
      .filter(Boolean)
      .filter((checkpoint) => (resolvedProjectionCode ? checkpoint.projectionCode === resolvedProjectionCode : true))
      .filter((checkpoint) => (resolvedStatus ? checkpoint.status === resolvedStatus : true))
      .sort((left, right) => left.projectionCode.localeCompare(right.projectionCode))
      .map(copy);
  }

  async function requestSearchReindex({
    companyId,
    projectionCode = null,
    rebuildMode = "delta",
    reasonCode = "manual_request",
    actorId = "system",
    correlationId = newId()
  } = {}) {
    const request = {
      searchReindexRequestId: newId(),
      companyId: requireText(companyId, "company_id_required"),
      projectionCode: normalizeOptionalText(projectionCode),
      rebuildMode: assertAllowed(normalizeEnumValue(rebuildMode, "search_rebuild_mode_required"), SEARCH_REBUILD_MODES, "search_rebuild_mode_invalid"),
      reasonCode: normalizeCode(reasonCode, "search_reindex_reason_required"),
      actorId: requireText(actorId, "actor_id_required"),
      status: "requested",
      requestedAt: nowIso(clock),
      startedAt: null,
      completedAt: null,
      jobId: null,
      errorCode: null,
      errorMessage: null,
      indexedCount: 0,
      unchangedCount: 0,
      tombstonedCount: 0
    };
    validateReindexProjection(request);
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
    const corePlatform = resolveCorePlatform();
    if (corePlatform && typeof corePlatform.enqueueRuntimeJob === "function") {
      const queuedJob = await corePlatform.enqueueRuntimeJob({
        companyId: request.companyId,
        jobType: "search.reindex",
        sourceObjectType: "search_reindex_request",
        sourceObjectId: request.searchReindexRequestId,
        idempotencyKey: `search_reindex:${request.searchReindexRequestId}`,
        payload: {
          companyId: request.companyId,
          searchReindexRequestId: request.searchReindexRequestId,
          projectionCode: request.projectionCode,
          rebuildMode: request.rebuildMode
        },
        metadata: {
          rebuildReasonCode: request.reasonCode,
          projectionCode: request.projectionCode,
          rebuildMode: request.rebuildMode,
          sourceDomainCode: "search"
        },
        riskClass: "low",
        priority: 40,
        actorId: request.actorId,
        correlationId
      });
      request.jobId = queuedJob.jobId;
      return {
        reindexRequest: copy(request),
        indexingSummary: null,
        queuedJob: copy(queuedJob)
      };
    }
      return executeSearchReindexRequest({
        companyId: request.companyId,
        searchReindexRequestId: request.searchReindexRequestId,
        actorId: request.actorId,
        correlationId
      });
  }

  function executeSearchReindexRequest({
    companyId,
    searchReindexRequestId,
    actorId = "system",
    correlationId = newId()
  } = {}) {
    const request = requireSearchReindexRequest(companyId, searchReindexRequestId);
    const contracts = validateReindexProjection(request);
    if (request.status === "completed") {
      return {
        reindexRequest: copy(request),
        indexingSummary: buildIndexingSummary(request, contracts.length)
      };
    }
    request.status = "running";
    request.startedAt = nowIso(clock);
    request.completedAt = null;
    request.errorCode = null;
    request.errorMessage = null;
    markProjectionCheckpointsRunning({ request, contracts });
    pushAudit({
      companyId: request.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "search.reindex.started",
      entityType: "search_reindex_request",
      entityId: request.searchReindexRequestId,
      explanation: `Started search reindex${request.projectionCode ? ` for ${request.projectionCode}` : ""}.`
    });
    try {
      return runReindex(request, contracts, correlationId, actorId);
    } catch (error) {
      markProjectionCheckpointsFailed({
        request,
        contracts,
        errorCode: typeof error?.code === "string" ? error.code : "search_reindex_failed",
        errorMessage: typeof error?.message === "string" && error.message.trim().length > 0 ? error.message.trim() : "Search reindex failed."
      });
      markReindexFailed(request, {
        actorId,
        correlationId,
        errorCode: typeof error?.code === "string" ? error.code : "search_reindex_failed",
        errorMessage: typeof error?.message === "string" && error.message.trim().length > 0 ? error.message.trim() : "Search reindex failed."
      });
      throw error;
    }
  }

  function failSearchReindexRequest({
    companyId,
    searchReindexRequestId,
    actorId = "system",
    correlationId = newId(),
    errorCode = "search_reindex_failed",
    errorMessage = "Search reindex failed."
  } = {}) {
    const request = requireSearchReindexRequest(companyId, searchReindexRequestId);
    markReindexFailed(request, {
      actorId,
      correlationId,
      errorCode,
      errorMessage
    });
    return copy(request);
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

  function listObjectProfileContracts({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return OBJECT_PROFILE_CONTRACTS.map((contract) => ({
      companyId: resolvedCompanyId,
      profileType: contract.profileType,
      objectType: contract.objectType,
      surfaceCodes: copy(contract.surfaceCodes || []),
      sectionCodes: copy(contract.sectionCodes),
      blockerCodes: copy(contract.blockerCodes),
      actionContracts: copy(contract.actionContracts)
    }));
  }

  function getObjectProfile({
    companyId,
    objectType,
    objectId,
    viewerUserId = null,
    viewerTeamIds = [],
    actorId = "system",
    correlationId = newId()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedObjectType = normalizeObjectProfileType(objectType);
    const resolvedObjectId = requireText(objectId, "object_id_required");
    const resolvedViewerUserId = normalizeOptionalText(viewerUserId);
    const resolvedViewerTeamIds = dedupeStrings(Array.isArray(viewerTeamIds) ? viewerTeamIds : []);
    const contract = getObjectProfileContract(resolvedObjectType);
    if (!contract) {
      throw createError(404, "object_profile_contract_not_found", `Object profile contract ${resolvedObjectType} was not found.`);
    }
    const indexedDocument = [...state.searchDocuments.values()].find(
      (document) =>
        document.companyId === resolvedCompanyId &&
        normalizeObjectProfileType(document.objectType) === resolvedObjectType &&
        document.objectId === resolvedObjectId
    );
    if (indexedDocument && shouldEnforceVisibility(resolvedViewerUserId, resolvedViewerTeamIds) && !isVisible(indexedDocument.permissionScope, resolvedViewerUserId, resolvedViewerTeamIds)) {
      pushAudit({
        companyId: resolvedCompanyId,
        actorId: requireText(actorId, "actor_id_required"),
        correlationId,
        action: "search.visibility.denied",
        entityType: "object_profile",
        entityId: `${resolvedObjectType}:${resolvedObjectId}`,
        explanation: `Object profile ${resolvedObjectType}:${resolvedObjectId} is not visible to the current actor.`,
        result: "denied",
        metadata: {
          reasonCode: "permission_scope_denied"
        }
      });
      throw createError(403, "object_profile_forbidden", "Object profile is not visible to the current actor.");
    }
    const detailPayload = normalizeReadModelPayload(indexedDocument?.detailPayload);
    const allowedActions = normalizeActionContracts(detailPayload.allowedActions, contract.actionContracts);
    const blockers = buildProfileBlockers(contract, indexedDocument, detailPayload);
    const permissionSummary = buildPermissionSummary(indexedDocument, detailPayload.permissionSummary, contract);
    return {
      profileType: contract.profileType,
      objectType: contract.objectType,
      objectId: resolvedObjectId,
      companyId: resolvedCompanyId,
      version: 1,
      status: indexedDocument?.documentStatus || "contract_defined",
      header: {
        title: indexedDocument?.displayTitle || `${contract.profileType} ${resolvedObjectId}`,
        subtitle: indexedDocument?.displaySubtitle || null,
        statusCode: indexedDocument?.documentStatus || "contract_defined",
        statusLabel: indexedDocument?.documentStatus || "contract_defined",
        criticalBadges: copy(detailPayload.criticalBadges || []),
        primaryActions: copy(allowedActions.slice(0, 3)),
        secondaryActions: copy(allowedActions.slice(3)),
        owner: copy(detailPayload.owner || null),
        updatedAt: indexedDocument?.updatedAt || nowIso(clock)
      },
      snapshot: buildProfileSnapshot(detailPayload.snapshot, resolvedObjectId),
      sections: buildProfileSections(contract, detailPayload.sections, blockers),
      relatedObjects: copy(detailPayload.relatedObjects || []),
      receipts: copy(detailPayload.receipts || []),
      evidence: copy(detailPayload.evidence || []),
      allowedActions: copy(allowedActions),
      blockers: copy(blockers),
      permissionSummary,
      correctionLineage: copy(detailPayload.correctionLineage || null),
      auditRefs: buildAuditRefs(detailPayload.auditRefs),
      timeline: copy(detailPayload.timeline || []),
      searchSummary: indexedDocument
        ? {
              title: indexedDocument.displayTitle,
              subtitle: indexedDocument.displaySubtitle || null
            }
        : {},
      projectionInfo: {
        projectionCode: indexedDocument?.projectionCode || null,
        objectType: contract.objectType,
        objectId: resolvedObjectId,
        sourceVersion: indexedDocument?.sourceVersion || null,
        targetVersion: indexedDocument?.sourceVersion || null,
        staleProjection: indexedDocument?.status === "stale"
      }
    };
  }

  function listWorkbenchContracts({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return WORKBENCH_CONTRACTS.map((contract) => ({
      companyId: resolvedCompanyId,
      workbenchCode: contract.workbenchCode,
      title: contract.title,
      surfaceCodes: copy(contract.surfaceCodes || []),
      defaultViewCode: contract.defaultViewCode || "default",
      rowObjectTypes: copy(contract.rowObjectTypes),
      counterCodes: copy(contract.counterCodes),
      bulkActionCodes: copy(contract.bulkActionCodes),
      savedViewCodes: copy(contract.savedViewCodes),
      commandBarActionCodes: copy(contract.commandBarActionCodes),
      filters: buildDefaultWorkbenchFilters(contract),
      sorts: buildDefaultWorkbenchSorts()
    }));
  }

  function getWorkbench({
    companyId,
    workbenchCode,
    viewerUserId = null,
    viewerTeamIds = [],
    savedViewId = null,
    status = null,
    objectType = null,
    query = null,
    sortCode = null,
    direction = null,
    limit = 50,
    actorId = "system",
    correlationId = newId()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedViewerUserId = normalizeOptionalText(viewerUserId);
    const resolvedViewerTeamIds = dedupeStrings(Array.isArray(viewerTeamIds) ? viewerTeamIds : []);
    const contract = getWorkbenchContract(requireText(workbenchCode, "workbench_code_required"));
    if (!contract) {
      throw createError(404, "workbench_contract_not_found", `Workbench contract ${workbenchCode} was not found.`);
    }
    const visibleSavedViews = resolvedViewerUserId
      ? listSavedViews({
          companyId: resolvedCompanyId,
          viewerUserId: resolvedViewerUserId,
          viewerTeamIds: resolvedViewerTeamIds,
          surfaceCode: inferWorkbenchSurfaceCode(contract),
          status: "active"
        }).map((savedView) => ({
          savedViewId: savedView.savedViewId,
          title: savedView.title,
          visibilityCode: savedView.visibilityCode,
          compatibilitySummary: copy(savedView.compatibilitySummary || null)
        }))
      : [];
    const activeSavedView = normalizeOptionalText(savedViewId)
      ? getSavedView({
          companyId: resolvedCompanyId,
          savedViewId,
          viewerUserId: resolvedViewerUserId || "system",
          viewerTeamIds: resolvedViewerTeamIds
        })
      : null;
    if (activeSavedView && activeSavedView.status !== "active") {
      throw createError(409, "saved_view_broken", "Saved view is not active.");
    }
    if (activeSavedView?.queryJson?.workbenchCode && activeSavedView.queryJson.workbenchCode !== contract.workbenchCode) {
      throw createError(400, "saved_view_workbench_mismatch", "Saved view does not target this workbench.");
    }
    const baseRows = [...state.searchDocuments.values()]
      .filter((document) => document.companyId === resolvedCompanyId)
      .filter((document) => contract.rowObjectTypes.includes(normalizeObjectProfileType(document.objectType)))
      .filter((document) => !shouldEnforceVisibility(resolvedViewerUserId, resolvedViewerTeamIds) || isVisible(document.permissionScope, resolvedViewerUserId, resolvedViewerTeamIds))
      .map((document) => buildWorkbenchRow(document));
    const filteredRows = applyWorkbenchFilters({
      rows: baseRows,
      contract,
      queryJson: activeSavedView?.queryJson || {},
      directStatus: status,
      directObjectType: objectType,
      directQuery: query
    });
    const sortedRows = sortWorkbenchRows({
      rows: filteredRows,
      sortJson: activeSavedView?.sortJson || {},
      explicitSortCode: sortCode,
      explicitDirection: direction
    });
    const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
    const counters = buildWorkbenchCounters(baseRows, contract.counterCodes || []);
    return {
      workbenchCode: contract.workbenchCode,
      title: contract.title,
      scope: "company",
      defaultViewCode: contract.defaultViewCode || "default",
      views: buildWorkbenchViews(contract, visibleSavedViews),
      counters,
      filters: buildDefaultWorkbenchFilters(contract),
      sorts: buildDefaultWorkbenchSorts(),
      bulkActions: (contract.bulkActionCodes || []).map((actionCode) => ({ actionCode, label: actionCode })),
      rows: sortedRows.slice(0, safeLimit),
      previewContract: {
        previewType: "object_profile",
        openMode: "side_panel"
      },
      commandBar: buildDefaultCommandBar(contract, visibleSavedViews),
      savedViewsSupported: Array.isArray(contract.savedViewCodes) && contract.savedViewCodes.length > 0,
      savedViews: copy(visibleSavedViews),
      activeSavedViewId: activeSavedView?.savedViewId || null,
      compatibilitySummary: copy(activeSavedView?.compatibilitySummary || null),
      projectionInfo: {
        projectionCode: contract.workbenchCode,
        objectType: "workbench",
        objectId: contract.workbenchCode,
        sourceVersion: baseRows[0]?.updatedAt || nowIso(clock),
        targetVersion: baseRows[0]?.updatedAt || nowIso(clock),
        staleProjection: false
      },
      companyId: resolvedCompanyId
    };

    function buildWorkbenchRow(document) {
      const workbenchPayload = normalizeReadModelPayload(document.workbenchPayload);
      const normalizedObjectType = normalizeObjectProfileType(document.objectType);
      return {
        rowId: `${normalizedObjectType}:${document.objectId}`,
        objectType: normalizedObjectType,
        objectId: document.objectId,
        status: document.documentStatus,
        statusLabel: document.documentStatus,
        primaryLabel: document.displayTitle,
        secondaryLabel: document.displaySubtitle || null,
        pillars: copy(workbenchPayload.pillars || []),
        blockerBadges: buildWorkbenchBlockerBadges(document, workbenchPayload),
        receiptBadges: copy(workbenchPayload.receiptBadges || []),
        owner: copy(workbenchPayload.owner || null),
        updatedAt: document.updatedAt,
        counterTags: dedupeStrings(workbenchPayload.counterTags || []),
        drilldownTarget: `/v1/object-profiles/${normalizedObjectType}/${document.objectId}`,
        previewTarget: `/v1/object-profiles/${normalizedObjectType}/${document.objectId}`,
        bulkActionEligibility: copy(workbenchPayload.bulkActionEligibility || { eligible: true, denialReasonCodes: [] })
      };
    }
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
      .filter((savedView) => (surfaceCode ? surfaceMatches(savedView.surfaceCode, normalizeSurfaceCodeValue(surfaceCode)) : true))
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
    const evaluation = evaluateSavedViewQuery(savedView.companyId, savedView.surfaceCode, savedView.queryJson, savedView.sortJson);
    savedView.status = evaluation.status;
    savedView.brokenReasonCode = evaluation.brokenReasonCode;
    savedView.compatibilitySummary = evaluation.compatibilitySummary;
    savedView.updatedAt = nowIso(clock);
    pushAudit({ companyId: savedView.companyId, actorId: requireText(actorId, "actor_id_required"), correlationId, action: "search.saved_view.repaired", entityType: "saved_view", entityId: savedView.savedViewId, explanation: `Repaired saved view ${savedView.savedViewId}.` });
    return copy(savedView);
  }

  function runSavedViewCompatibilityScan({ companyId, surfaceCode = null, actorId = "system", correlationId = newId() } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedSurfaceCode = normalizeOptionalText(surfaceCode)?.toUpperCase() || null;
    const items = [];
    let changedCount = 0;
    let brokenCount = 0;
    let repairedCount = 0;

    for (const savedViewId of state.savedViewIdsByCompany.get(resolvedCompanyId) || []) {
      const savedView = state.savedViews.get(savedViewId);
      if (!savedView) {
        continue;
      }
      if (resolvedSurfaceCode && savedView.surfaceCode !== resolvedSurfaceCode) {
        continue;
      }
        const evaluation = evaluateSavedViewQuery(savedView.companyId, savedView.surfaceCode, savedView.queryJson, savedView.sortJson);
        const previousStatus = savedView.status;
        const previousBrokenReasonCode = savedView.brokenReasonCode || null;
        const changed = previousStatus !== evaluation.status || previousBrokenReasonCode !== evaluation.brokenReasonCode;
        if (changed) {
        changedCount += 1;
        if (previousStatus !== "broken" && evaluation.status === "broken") {
          brokenCount += 1;
        }
        if (previousStatus === "broken" && evaluation.status === "active") {
          repairedCount += 1;
          }
          savedView.status = evaluation.status;
          savedView.brokenReasonCode = evaluation.brokenReasonCode;
          savedView.compatibilitySummary = evaluation.compatibilitySummary;
          savedView.updatedAt = nowIso(clock);
        }
        items.push({
          savedViewId: savedView.savedViewId,
          surfaceCode: savedView.surfaceCode,
          status: savedView.status,
          brokenReasonCode: savedView.brokenReasonCode || null,
          compatibilitySummary: copy(savedView.compatibilitySummary || null),
          changed
        });
      }

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "search.saved_view.compatibility_scanned",
      entityType: "saved_view_scan",
      entityId: correlationId,
      explanation: `Scanned ${items.length} saved views for compatibility${resolvedSurfaceCode ? ` on ${resolvedSurfaceCode}` : ""}.`
    });

    return {
      companyId: resolvedCompanyId,
      surfaceCode: resolvedSurfaceCode,
      scannedCount: items.length,
      changedCount,
      brokenCount,
      repairedCount,
      items
    };
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
      projectionCheckpoints: [...state.projectionCheckpoints.values()],
      searchDocuments: [...state.searchDocuments.values()],
      reindexRequests: [...state.reindexRequests.values()],
      savedViews: [...state.savedViews.values()],
      dashboardWidgets: [...state.dashboardWidgets.values()],
      auditEvents: state.auditEvents
    });
  }

  function validateReindexProjection(request) {
    const contracts = syncProjectionContracts(request.companyId).filter((contract) =>
      request.projectionCode ? contract.projectionCode === request.projectionCode : true
    );
    if (request.projectionCode && contracts.length === 0) {
      throw createError(404, "search_projection_contract_missing", `Projection contract ${request.projectionCode} was not found.`);
    }
    return contracts;
  }

  function runReindex(request, contracts, correlationId, actorId = request.actorId) {
    const seenKeys = new Set();
    const projectionStats = new Map();
    const targetedProjectionCodes = new Set(contracts.map((contract) => contract.projectionCode));
    let indexedCount = 0;
    let unchangedCount = 0;
    let purgedCount = 0;
    if (request.rebuildMode === "full") {
      purgedCount = purgeProjectionDocuments({
        companyId: request.companyId,
        projectionCodes: targetedProjectionCodes,
        projectionStats
      });
    }
    for (const contract of contracts) {
      const source = resolveProjectionSource(contract.sourceDomainCode);
      const documents = source
        .listSearchProjectionDocuments({ companyId: request.companyId })
        .filter((document) => document.projectionCode === contract.projectionCode);
      const sourceHash = buildProjectionSourceHash(documents);
      ensureProjectionStats(projectionStats, contract.projectionCode).sourceHash = sourceHash;
      for (const rawDocument of documents) {
        const result = upsertProjectionDocument(request.companyId, contract, rawDocument);
        seenKeys.add(result.documentKey);
        const stats = ensureProjectionStats(projectionStats, contract.projectionCode);
        if (result.changed) {
          indexedCount += 1;
          stats.indexedCount += 1;
        } else {
          unchangedCount += 1;
          stats.unchangedCount += 1;
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
      ensureProjectionStats(projectionStats, document.projectionCode).tombstonedCount += 1;
    }

    request.status = "completed";
    request.completedAt = nowIso(clock);
    request.indexedCount = indexedCount;
    request.unchangedCount = unchangedCount;
    request.tombstonedCount = tombstonedCount;
    request.purgedCount = purgedCount;
    markProjectionCheckpointsCompleted({ request, contracts, projectionStats });
    pushAudit({ companyId: request.companyId, actorId: requireText(actorId, "actor_id_required"), correlationId, action: "search.reindex.completed", entityType: "search_reindex_request", entityId: request.searchReindexRequestId, explanation: `Completed search reindex with ${indexedCount} indexed and ${tombstonedCount} tombstoned documents.` });
    return { reindexRequest: copy(request), indexingSummary: buildIndexingSummary(request, contracts.length) };
  }

  function buildIndexingSummary(request, projectionCount) {
    return {
      projectionCount,
      indexedCount: Number(request.indexedCount || 0),
      unchangedCount: Number(request.unchangedCount || 0),
      tombstonedCount: Number(request.tombstonedCount || 0),
      purgedCount: Number(request.purgedCount || 0),
      rebuildMode: request.rebuildMode || "delta"
    };
  }

  function requireSearchReindexRequest(companyId, searchReindexRequestId) {
    const request = state.reindexRequests.get(requireText(searchReindexRequestId, "search_reindex_request_id_required"));
    if (!request || request.companyId !== requireText(companyId, "company_id_required")) {
      throw createError(404, "search_reindex_request_not_found", "Search reindex request was not found.");
    }
    return request;
  }

  function resolveCorePlatform() {
    return typeof lazyPlatforms.core === "function" ? lazyPlatforms.core() : null;
  }

  function markReindexFailed(request, { actorId, correlationId, errorCode, errorMessage }) {
    request.status = "failed";
    request.completedAt = nowIso(clock);
    request.errorCode = normalizeCode(errorCode || "search_reindex_failed", "search_reindex_error_code_required");
    request.errorMessage = normalizeOptionalText(errorMessage) || "Search reindex failed.";
    pushAudit({
      companyId: request.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "search.reindex.failed",
      entityType: "search_reindex_request",
      entityId: request.searchReindexRequestId,
      explanation: `Search reindex failed with ${request.errorCode}.`,
      metadata: {
        errorMessage: request.errorMessage
      }
    });
  }

  function markProjectionCheckpointsRunning({ request, contracts }) {
    const requestedAt = request.requestedAt || nowIso(clock);
    const startedAt = request.startedAt || nowIso(clock);
    for (const contract of contracts) {
      const checkpoint = upsertProjectionCheckpoint(request.companyId, contract);
      checkpoint.status = "running";
      checkpoint.lastRequestId = request.searchReindexRequestId;
      checkpoint.lastRequestedAt = requestedAt;
      checkpoint.lastStartedAt = startedAt;
      checkpoint.lastCompletedAt = null;
      checkpoint.lastErrorCode = null;
      checkpoint.lastErrorMessage = null;
      checkpoint.lastRebuildMode = request.rebuildMode || "delta";
    }
  }

  function markProjectionCheckpointsCompleted({ request, contracts, projectionStats }) {
    const completedAt = request.completedAt || nowIso(clock);
    for (const contract of contracts) {
      const checkpoint = upsertProjectionCheckpoint(request.companyId, contract);
      const stats = projectionStats.get(contract.projectionCode) || ensureProjectionStats(projectionStats, contract.projectionCode);
      checkpoint.status = "completed";
      checkpoint.lastRequestId = request.searchReindexRequestId;
      checkpoint.lastRebuildMode = request.rebuildMode || "delta";
      checkpoint.lastCompletedAt = completedAt;
      checkpoint.lastErrorCode = null;
      checkpoint.lastErrorMessage = null;
      checkpoint.lastIndexedCount = stats.indexedCount;
      checkpoint.lastUnchangedCount = stats.unchangedCount;
      checkpoint.lastTombstonedCount = stats.tombstonedCount;
      checkpoint.lastPurgedCount = stats.purgedCount;
      checkpoint.lastDocumentCount = countIndexedProjectionDocuments(request.companyId, contract.projectionCode);
      checkpoint.lastSourceHash = stats.sourceHash;
      checkpoint.checkpointSequenceNo += 1;
      checkpoint.updatedAt = completedAt;
    }
  }

  function markProjectionCheckpointsFailed({ request, contracts, errorCode, errorMessage }) {
    const failedAt = nowIso(clock);
    const normalizedErrorCode = normalizeCode(errorCode || "search_reindex_failed", "search_reindex_error_code_required");
    const normalizedErrorMessage = normalizeOptionalText(errorMessage) || "Search reindex failed.";
    for (const contract of contracts) {
      const checkpoint = upsertProjectionCheckpoint(request.companyId, contract);
      checkpoint.status = "failed";
      checkpoint.lastRequestId = request.searchReindexRequestId;
      checkpoint.lastRebuildMode = request.rebuildMode || "delta";
      checkpoint.lastCompletedAt = failedAt;
      checkpoint.lastErrorCode = normalizedErrorCode;
      checkpoint.lastErrorMessage = normalizedErrorMessage;
      checkpoint.updatedAt = failedAt;
    }
  }

  function upsertProjectionCheckpoint(companyId, contract) {
    const checkpointId = `${companyId}::${contract.projectionCode}`;
    let checkpoint = state.projectionCheckpoints.get(checkpointId);
    if (!checkpoint) {
      checkpoint = {
        projectionCheckpointId: checkpointId,
        companyId,
        projectionCode: contract.projectionCode,
        sourceDomainCode: contract.sourceDomainCode,
        status: "idle",
        checkpointSequenceNo: 0,
        lastRequestId: null,
        lastRequestedAt: null,
        lastStartedAt: null,
        lastCompletedAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        lastRebuildMode: "delta",
        lastIndexedCount: 0,
        lastUnchangedCount: 0,
        lastTombstonedCount: 0,
        lastPurgedCount: 0,
        lastDocumentCount: 0,
        lastSourceHash: null,
        createdAt: nowIso(clock),
        updatedAt: nowIso(clock)
      };
      state.projectionCheckpoints.set(checkpointId, checkpoint);
      appendToIndex(state.projectionCheckpointIdsByCompany, companyId, checkpointId);
    } else {
      checkpoint.sourceDomainCode = contract.sourceDomainCode;
      checkpoint.updatedAt = nowIso(clock);
    }
    return checkpoint;
  }

  function ensureProjectionStats(projectionStats, projectionCode) {
    if (!projectionStats.has(projectionCode)) {
      projectionStats.set(projectionCode, {
        indexedCount: 0,
        unchangedCount: 0,
        tombstonedCount: 0,
        purgedCount: 0,
        sourceHash: buildProjectionSourceHash([])
      });
    }
    return projectionStats.get(projectionCode);
  }

  function purgeProjectionDocuments({ companyId, projectionCodes, projectionStats }) {
    const retainedIds = [];
    let purgedCount = 0;
    for (const documentId of state.searchDocumentIdsByCompany.get(companyId) || []) {
      const document = state.searchDocuments.get(documentId);
      if (!document) {
        continue;
      }
      if (projectionCodes.has(document.projectionCode)) {
        const stats = ensureProjectionStats(projectionStats, document.projectionCode);
        stats.purgedCount += 1;
        purgedCount += 1;
        state.searchDocuments.delete(documentId);
        state.searchDocumentIdByKey.delete(documentRegistryKey(document.companyId, document.projectionCode, document.objectId));
        continue;
      }
      retainedIds.push(documentId);
    }
    if (retainedIds.length > 0) {
      state.searchDocumentIdsByCompany.set(companyId, retainedIds);
    } else {
      state.searchDocumentIdsByCompany.delete(companyId);
    }
    return purgedCount;
  }

  function countIndexedProjectionDocuments(companyId, projectionCode) {
    return (state.searchDocumentIdsByCompany.get(companyId) || [])
      .map((documentId) => state.searchDocuments.get(documentId))
      .filter(Boolean)
      .filter((document) => document.projectionCode === projectionCode)
      .filter((document) => !["tombstoned", "purged"].includes(document.status))
      .length;
  }

  function buildProjectionSourceHash(documents) {
    return hashObject(
      [...(Array.isArray(documents) ? documents : [])]
        .map((document) => copy(document))
        .sort((left, right) =>
          requireText(left.projectionCode || "", "search_projection_code_required").localeCompare(requireText(right.projectionCode || "", "search_projection_code_required"))
          || requireText(left.objectId || "", "search_projection_object_id_required").localeCompare(requireText(right.objectId || "", "search_projection_object_id_required"))
        )
    );
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
    const sources = [];
    if (
      reporting &&
      typeof reporting.listSearchProjectionContracts === "function" &&
      typeof reporting.listSearchProjectionDocuments === "function"
    ) {
      sources.push({
        sourceDomainCode: "reporting",
        listSearchProjectionContracts: (input) => reporting.listSearchProjectionContracts(input),
        listSearchProjectionDocuments: (input) => reporting.listSearchProjectionDocuments(input)
      });
    }
    for (const [sourceDomainCode, resolver] of Object.entries(lazyPlatforms)) {
      if (typeof resolver !== "function") {
        continue;
      }
      const candidate = resolver();
      const listProjectionContracts =
        typeof candidate?.listSearchProjectionContracts === "function"
          ? (input) => candidate.listSearchProjectionContracts(input)
          : typeof candidate?.listDocumentClassificationSearchProjectionContracts === "function"
            ? (input) => candidate.listDocumentClassificationSearchProjectionContracts(input)
            : null;
      const listProjectionDocuments =
        typeof candidate?.listSearchProjectionDocuments === "function"
          ? (input) => candidate.listSearchProjectionDocuments(input)
          : typeof candidate?.listDocumentClassificationSearchProjectionDocuments === "function"
            ? (input) => candidate.listDocumentClassificationSearchProjectionDocuments(input)
            : null;
      if (
        candidate &&
        typeof listProjectionContracts === "function" &&
        typeof listProjectionDocuments === "function"
      ) {
        sources.push({
          sourceDomainCode,
          listSearchProjectionContracts: listProjectionContracts,
          listSearchProjectionDocuments: listProjectionDocuments
        });
      }
    }
    return sources;
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
    const surfaceCode = normalizeSurfaceCodeValue(input.surfaceCode);
    const normalizedQueryJson = copy(normalizePlainObject(input.queryJson, "saved_view_query_invalid"));
    const normalizedSortJson = copy(normalizePlainObject(input.sortJson, "saved_view_sort_invalid"));
    const evaluation = evaluateSavedViewQuery(input.companyId, surfaceCode, normalizedQueryJson, normalizedSortJson);
    const visibilityCode = assertAllowed(normalizeEnumValue(input.visibilityCode, "saved_view_visibility_code_required"), SAVED_VIEW_VISIBILITY_CODES, "saved_view_visibility_code_invalid");
    return {
      savedViewId: input.savedViewId,
      companyId: input.companyId,
      ownerUserId: input.ownerUserId,
      surfaceCode,
      title: input.title,
      queryJson: normalizedQueryJson,
      sortJson: normalizedSortJson,
      visibilityCode,
      sharedWithTeamId: visibilityCode === "team" ? requireText(input.sharedWithTeamId, "saved_view_team_id_required") : null,
      status: evaluation.status,
      brokenReasonCode: evaluation.brokenReasonCode,
      compatibilitySummary: evaluation.compatibilitySummary,
      createdByActorId: input.actorId,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt
    };
  }

  function evaluateSavedViewQuery(companyId, surfaceCode, queryJson, sortJson = {}) {
    const normalizedQuery = normalizePlainObject(queryJson, "saved_view_query_invalid");
    const normalizedSort = normalizePlainObject(sortJson, "saved_view_sort_invalid");
    const contracts = syncProjectionContracts(companyId);
    const normalizedSurfaceCode = normalizeSurfaceCodeValue(surfaceCode);
    const workbenchCode = normalizeOptionalText(normalizedQuery.workbenchCode);
    const projectionCode = normalizeOptionalText(normalizedQuery.projectionCode);
    const objectType = normalizeOptionalText(normalizedQuery.objectType);
    const filters = normalizeObjectOrDefault(normalizedQuery.filters);
    if (!workbenchCode && !projectionCode && !objectType) {
      return brokenSavedView("saved_view_target_missing");
    }
    if (workbenchCode) {
      const workbenchContract = getWorkbenchContract(workbenchCode);
      if (!workbenchContract) {
        return brokenSavedView("workbench_contract_missing");
      }
      if (!isSurfaceCompatible(normalizedSurfaceCode, workbenchContract.surfaceCodes || [])) {
        return brokenSavedView("surface_code_incompatible");
      }
      if (objectType && !workbenchContract.rowObjectTypes.includes(normalizeObjectProfileType(objectType))) {
        return brokenSavedView("workbench_object_type_invalid");
      }
      const allowedFilterCodes = buildDefaultWorkbenchFilters(workbenchContract).map((filter) => filter.filterCode);
      for (const filterCode of Object.keys(filters)) {
        if (!allowedFilterCodes.includes(filterCode)) {
          return brokenSavedView("saved_view_filter_invalid");
        }
      }
      const allowedSortCodes = buildDefaultWorkbenchSorts().map((sort) => sort.sortCode);
      if (normalizeOptionalText(normalizedSort.sortCode) && !allowedSortCodes.includes(normalizedSort.sortCode)) {
        return brokenSavedView("saved_view_sort_invalid");
      }
      return activeSavedView({
        targetType: "workbench",
        targetCode: workbenchContract.workbenchCode,
        allowedFilterCodes,
        allowedSortCodes,
        compatibleSurfaceCodes: copy(workbenchContract.surfaceCodes || [])
      });
    }
    let matchedContract = null;
    if (projectionCode) {
      matchedContract = contracts.find((contract) => contract.projectionCode === projectionCode) || null;
      if (!matchedContract) {
        return brokenSavedView("projection_contract_missing");
      }
    }
    if (objectType) {
      const matchedByObjectType = contracts.find((contract) => normalizeObjectProfileType(contract.objectType) === normalizeObjectProfileType(objectType)) || null;
      if (!matchedByObjectType) {
        return brokenSavedView("object_type_not_indexed");
      }
      if (matchedContract && normalizeObjectProfileType(matchedContract.objectType) !== normalizeObjectProfileType(objectType)) {
        return brokenSavedView("projection_object_type_mismatch");
      }
      matchedContract = matchedContract || matchedByObjectType;
    }
    if (!matchedContract) {
      return brokenSavedView("saved_view_target_missing");
    }
    if (!isSurfaceCompatible(normalizedSurfaceCode, matchedContract.surfaceCodes || [])) {
      return brokenSavedView("surface_code_incompatible");
    }
    const allowedFilterCodes = dedupeStrings(["query", "objectType", "status", ...(matchedContract.filterFieldCodes || [])]);
    for (const filterCode of Object.keys(filters)) {
      if (!allowedFilterCodes.includes(filterCode)) {
        return brokenSavedView("saved_view_filter_invalid");
      }
    }
    return activeSavedView({
      targetType: "projection",
      targetCode: matchedContract.projectionCode,
      allowedFilterCodes,
      allowedSortCodes: ["updatedAtDesc", "primaryLabelAsc", "statusAsc"],
      compatibleSurfaceCodes: copy(matchedContract.surfaceCodes || [])
    });

    function brokenSavedView(reasonCode) {
      return {
        status: "broken",
        brokenReasonCode: reasonCode,
        compatibilitySummary: {
          targetType: workbenchCode ? "workbench" : "projection",
          targetCode: workbenchCode || projectionCode || objectType || null,
          compatibleSurfaceCodes: [],
          allowedFilterCodes: [],
          allowedSortCodes: [],
          reasonCode
        }
      };
    }

    function activeSavedView(summary) {
      return {
        status: "active",
        brokenReasonCode: null,
        compatibilitySummary: {
          ...summary,
          reasonCode: null
        }
      };
    }
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

  function pushAudit({
    companyId,
    actorId,
    correlationId,
    action,
    entityType,
    entityId,
    explanation,
    result = "success",
    metadata = {},
    sessionId = null
  }) {
    state.auditEvents.push(
      createAuditEnvelope({
        auditId: newId(),
        companyId,
        actorId,
        correlationId,
        action,
        entityType,
        entityId,
        explanation,
        result,
        metadata,
        sessionId,
        recordedAt: new Date(clock()),
        auditClass: "search_action"
      })
    );
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
  const detailPayload = normalizeReadModelPayload(rawDocument.detailPayload || rawDocument.objectProfilePayload);
  const workbenchPayload = normalizeReadModelPayload(rawDocument.workbenchPayload);
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
      detailPayload,
      workbenchPayload,
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
    detailPayload,
    workbenchPayload,
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
      detailPayload,
      workbenchPayload,
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

function normalizeObjectProfileType(objectType) {
  const resolvedObjectType = requireText(objectType, "object_profile_object_type_required");
  const knownObjectTypes = new Set([
    ...OBJECT_PROFILE_CONTRACTS.map((contract) => contract.objectType),
    ...WORKBENCH_CONTRACTS.flatMap((contract) => contract.rowObjectTypes || [])
  ]);
  if (knownObjectTypes.has(resolvedObjectType)) {
    return resolvedObjectType;
  }
  const fingerprint = normalizeObjectTypeFingerprint(resolvedObjectType);
  for (const candidate of knownObjectTypes) {
    if (normalizeObjectTypeFingerprint(candidate) === fingerprint) {
      return candidate;
    }
  }
  return resolvedObjectType;
}

function normalizeObjectTypeFingerprint(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
}

function defaultPermissionSummary() {
  return {
    scope: "company",
    visibilityCode: "desktop_only",
    allowedRoleCodes: ["company_admin", "approver", "payroll_admin", "bureau_user"],
    requiresStepUp: false,
    requiresDualControl: false
  };
}

function defaultAuditRefs() {
  return {
    auditClass: "desktop_read_model",
    auditEventIds: [],
    evidenceBundleIds: [],
    receiptIds: [],
    correlationIds: []
  };
}

function buildDefaultWorkbenchFilters(contract) {
  return [
    {
      filterCode: "status",
      type: "enum",
      label: "Status",
      fieldPath: "status",
      operators: ["eq", "in"],
      allowedValues: ["contract_defined", "active", "pending", "indexed", "stale", "completed", "failed"],
      defaultValue: null,
      required: false
    },
    {
      filterCode: "objectType",
      type: "multi_enum",
      label: "Object type",
      fieldPath: "objectType",
      operators: ["in"],
      allowedValues: copy(contract.rowObjectTypes || []),
      defaultValue: null,
      required: false
    },
    {
      filterCode: "updatedAt",
      type: "date_range",
      label: "Updated at",
      fieldPath: "updatedAt",
      operators: ["between"],
      allowedValues: [],
      defaultValue: null,
      required: false
    }
  ];
}

function buildDefaultWorkbenchSorts() {
  return [
    {
      sortCode: "updatedAtDesc",
      fieldPath: "updatedAt",
      label: "Last updated",
      defaultDirection: "desc",
      allowedDirections: ["asc", "desc"]
    },
    {
      sortCode: "statusAsc",
      fieldPath: "status",
      label: "Status",
      defaultDirection: "asc",
      allowedDirections: ["asc", "desc"]
    },
    {
      sortCode: "primaryLabelAsc",
      fieldPath: "primaryLabel",
      label: "Primary label",
      defaultDirection: "asc",
      allowedDirections: ["asc", "desc"]
    }
  ];
}

function buildDefaultCommandBar(contract, visibleSavedViews = []) {
  return {
    contextObject: {
      objectType: "workbench",
      objectId: contract.workbenchCode
    },
    availableCommands: (contract.commandBarActionCodes || []).map((actionCode) => ({
      actionCode,
      label: actionCode
    })),
    recentCommands: [],
    quickFilters: [
      ...(contract.savedViewCodes || []).map((savedViewCode) => ({
        filterCode: savedViewCode,
        label: savedViewCode
      })),
      ...visibleSavedViews.map((savedView) => ({
        filterCode: savedView.savedViewId,
        label: savedView.title
      }))
    ],
    createActions: (contract.commandBarActionCodes || []).map((actionCode) => ({
      actionCode,
      label: actionCode
    })),
    dangerZoneActions: []
  };
}

function normalizeReadModelPayload(payload) {
  return copy(normalizeObjectOrDefault(payload));
}

function normalizeActionContracts(actions, fallbackActions = []) {
  const rawActions = Array.isArray(actions) && actions.length > 0 ? actions : fallbackActions;
  return rawActions.map((item) => {
    if (typeof item === "string") {
      return {
        actionCode: item,
        actionClass: item.split(".")[0],
        label: item,
        httpMethod: "POST",
        routeTemplate: null,
        requiresStepUp: false,
        requiresDualControl: false,
        receiptRequired: /submit|export|replay|correct|offset|reverse|close|approve|lock/i.test(item),
        reviewRequired: /approve|submit|correct|escalate/i.test(item),
        forbiddenReasonCodes: []
      };
    }
    return {
      actionCode: requireText(item.actionCode, "action_code_required"),
      actionClass: normalizeOptionalText(item.actionClass) || requireText(item.actionCode, "action_code_required").split(".")[0],
      label: normalizeOptionalText(item.label) || requireText(item.actionCode, "action_code_required"),
      httpMethod: normalizeOptionalText(item.httpMethod) || "POST",
      routeTemplate: normalizeOptionalText(item.routeTemplate),
      requiresStepUp: Boolean(item.requiresStepUp),
      requiresDualControl: Boolean(item.requiresDualControl),
      receiptRequired: Boolean(item.receiptRequired),
      reviewRequired: Boolean(item.reviewRequired),
      forbiddenReasonCodes: dedupeStrings(item.forbiddenReasonCodes || [])
    };
  });
}

function buildProfileSnapshot(snapshot, objectId) {
  const payload = normalizeReadModelPayload(snapshot);
  return {
    identityFields: Array.isArray(payload.identityFields) && payload.identityFields.length > 0 ? copy(payload.identityFields) : [{ fieldCode: "objectId", value: objectId }],
    financialFields: copy(payload.financialFields || []),
    complianceFields: copy(payload.complianceFields || []),
    responsibilityFields: copy(payload.responsibilityFields || []),
    periodFields: copy(payload.periodFields || [])
  };
}

function buildProfileSections(contract, sections, blockers) {
  const indexedSections = new Map(
    (Array.isArray(sections) ? sections : [])
      .filter((section) => section && typeof section === "object" && typeof section.sectionCode === "string")
      .map((section) => [section.sectionCode, copy(section)])
  );
  return contract.sectionCodes.map((sectionCode) => {
    const stored = indexedSections.get(sectionCode) || {};
    return {
      sectionCode,
      title: normalizeOptionalText(stored.title) || humanizeCode(sectionCode),
      layout: normalizeOptionalText(stored.layout) || "field_list",
      fields: copy(stored.fields || []),
      warnings: copy(stored.warnings || []),
      blockers: copy(stored.blockers || blockers.filter((blocker) => blocker.sectionCode === sectionCode)),
      inlineActions: normalizeActionContracts(stored.inlineActions || [], [])
    };
  });
}

function buildProfileBlockers(contract, indexedDocument, detailPayload) {
  const blockerMap = new Map();
  for (const blockerCode of contract.blockerCodes || []) {
    blockerMap.set(blockerCode, {
      blockerCode,
      title: humanizeCode(blockerCode),
      severity: "warning",
      sectionCode: null,
      source: "contract"
    });
  }
  for (const blocker of Array.isArray(detailPayload.blockers) ? detailPayload.blockers : []) {
    if (!blocker || typeof blocker !== "object" || typeof blocker.blockerCode !== "string") {
      continue;
    }
    blockerMap.set(blocker.blockerCode, {
      blockerCode: blocker.blockerCode,
      title: normalizeOptionalText(blocker.title) || humanizeCode(blocker.blockerCode),
      severity: normalizeOptionalText(blocker.severity) || "blocking",
      sectionCode: normalizeOptionalText(blocker.sectionCode),
      source: normalizeOptionalText(blocker.source) || "projection"
    });
  }
  for (const blockerCode of dedupeStrings(indexedDocument?.workbenchPayload?.blockerCodes || [])) {
    if (!blockerMap.has(blockerCode)) {
      blockerMap.set(blockerCode, {
        blockerCode,
        title: humanizeCode(blockerCode),
        severity: "blocking",
        sectionCode: null,
        source: "projection"
      });
    }
  }
  return [...blockerMap.values()];
}

function buildPermissionSummary(indexedDocument, permissionSummary, contract) {
  const payload = normalizeReadModelPayload(permissionSummary);
  const defaultSummary = defaultPermissionSummary();
  return {
    scope: normalizeOptionalText(payload.scope) || indexedDocument?.permissionScope?.scopeCode || defaultSummary.scope,
    visibilityCode: normalizeOptionalText(payload.visibilityCode) || inferVisibilityCode(contract, indexedDocument),
    allowedRoleCodes: dedupeStrings(payload.allowedRoleCodes || defaultSummary.allowedRoleCodes),
    requiresStepUp: payload.requiresStepUp === undefined ? defaultSummary.requiresStepUp : Boolean(payload.requiresStepUp),
    requiresDualControl: payload.requiresDualControl === undefined ? defaultSummary.requiresDualControl : Boolean(payload.requiresDualControl)
  };
}

function buildAuditRefs(auditRefs) {
  const payload = normalizeReadModelPayload(auditRefs);
  const defaults = defaultAuditRefs();
  return {
    auditClass: normalizeOptionalText(payload.auditClass) || defaults.auditClass,
    auditEventIds: copy(payload.auditEventIds || defaults.auditEventIds),
    evidenceBundleIds: copy(payload.evidenceBundleIds || defaults.evidenceBundleIds),
    receiptIds: copy(payload.receiptIds || defaults.receiptIds),
    correlationIds: copy(payload.correlationIds || defaults.correlationIds)
  };
}

function buildWorkbenchBlockerBadges(document, workbenchPayload) {
  if (Array.isArray(workbenchPayload.blockerBadges) && workbenchPayload.blockerBadges.length > 0) {
    return copy(workbenchPayload.blockerBadges);
  }
  return dedupeStrings(workbenchPayload.blockerCodes || []).map((blockerCode) => ({
    blockerCode,
    label: humanizeCode(blockerCode)
  }));
}

function applyWorkbenchFilters({ rows, contract, queryJson, directStatus, directObjectType, directQuery }) {
  const filters = normalizeObjectOrDefault(queryJson.filters);
  let result = [...rows];
  const requestedObjectType = normalizeOptionalText(directObjectType) || normalizeOptionalText(queryJson.objectType);
  const requestedStatus = normalizeOptionalText(directStatus) || normalizeOptionalText(queryJson.status);
  const requestedQuery = normalizeOptionalText(directQuery) || normalizeOptionalText(queryJson.query);
  if (normalizeOptionalText(queryJson.workbenchCode) && queryJson.workbenchCode !== contract.workbenchCode) {
    throw createError(400, "saved_view_workbench_mismatch", "Saved view does not target this workbench.");
  }
  if (requestedObjectType) {
    result = result.filter((row) => normalizeObjectProfileType(row.objectType) === normalizeObjectProfileType(requestedObjectType));
  }
  if (requestedStatus) {
    result = result.filter((row) => row.status === requestedStatus);
  }
  if (requestedQuery) {
    const normalizedQuery = requestedQuery.toLowerCase();
    result = result.filter((row) => `${row.primaryLabel} ${row.secondaryLabel || ""} ${row.objectId}`.toLowerCase().includes(normalizedQuery));
  }
  for (const [filterCode, filterValue] of Object.entries(filters)) {
    if (filterValue == null || filterValue === "") {
      continue;
    }
    if (filterCode === "status") {
      result = result.filter((row) => row.status === filterValue);
      continue;
    }
    if (filterCode === "objectType") {
      result = result.filter((row) => normalizeObjectProfileType(row.objectType) === normalizeObjectProfileType(filterValue));
      continue;
    }
    if (filterCode === "updatedAt" && filterValue && typeof filterValue === "object") {
      const from = normalizeOptionalDateTime(filterValue.from);
      const to = normalizeOptionalDateTime(filterValue.to);
      result = result.filter((row) => (!from || row.updatedAt >= from) && (!to || row.updatedAt <= to));
      continue;
    }
  }
  return result;
}

function sortWorkbenchRows({ rows, sortJson = {}, explicitSortCode = null, explicitDirection = null }) {
  const availableSorts = buildDefaultWorkbenchSorts();
  const sortCode = normalizeOptionalText(explicitSortCode) || normalizeOptionalText(sortJson.sortCode) || availableSorts[0].sortCode;
  const selectedSort = availableSorts.find((item) => item.sortCode === sortCode) || availableSorts[0];
  const requestedDirection = normalizeOptionalText(explicitDirection) || normalizeOptionalText(sortJson.direction) || selectedSort.defaultDirection;
  const resolvedDirection = selectedSort.allowedDirections.includes(requestedDirection) ? requestedDirection : selectedSort.defaultDirection;
  const multiplier = resolvedDirection === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => {
    const leftValue = left[selectedSort.fieldPath] || "";
    const rightValue = right[selectedSort.fieldPath] || "";
    if (leftValue < rightValue) {
      return -1 * multiplier;
    }
    if (leftValue > rightValue) {
      return 1 * multiplier;
    }
    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

function buildWorkbenchCounters(rows, counterCodes) {
  return Object.fromEntries(
    (counterCodes || []).map((counterCode) => [
      counterCode,
      rows.filter((row) => matchesWorkbenchCounter(row, counterCode)).length
    ])
  );
}

function matchesWorkbenchCounter(row, counterCode) {
  const normalizedCounterCode = String(counterCode || "").toLowerCase();
  if (row.counterTags.includes(counterCode)) {
    return true;
  }
  if (normalizedCounterCode.includes("blocked") || normalizedCounterCode.includes("difference") || normalizedCounterCode.includes("exception") || normalizedCounterCode.includes("review")) {
    return Array.isArray(row.blockerBadges) && row.blockerBadges.length > 0;
  }
  return false;
}

function buildWorkbenchViews(contract, visibleSavedViews) {
  return [
    {
      viewCode: contract.defaultViewCode || "default",
      label: "Default",
      rowObjectTypes: copy(contract.rowObjectTypes)
    },
    ...(contract.savedViewCodes || []).map((savedViewCode) => ({
      filterCode: savedViewCode,
      viewCode: savedViewCode,
      label: humanizeCode(savedViewCode),
      rowObjectTypes: copy(contract.rowObjectTypes)
    })),
    ...visibleSavedViews.map((savedView) => ({
      viewCode: savedView.savedViewId,
      label: savedView.title,
      rowObjectTypes: copy(contract.rowObjectTypes)
    })),
  ];
}

function inferWorkbenchSurfaceCode(contract) {
  return normalizeSurfaceCodeValue((contract.surfaceCodes || ["desktop.search"])[0]);
}

function inferVisibilityCode(contract, indexedDocument) {
  if ((indexedDocument?.surfaceCodes || contract.surfaceCodes || []).some((surfaceCode) => surfaceMatches(surfaceCode, "backoffice.ops"))) {
    return "backoffice_only";
  }
  return "desktop_only";
}

function shouldEnforceVisibility(viewerUserId, viewerTeamIds) {
  return Boolean(viewerUserId) || (Array.isArray(viewerTeamIds) && viewerTeamIds.length > 0);
}

function isSurfaceCompatible(surfaceCode, allowedSurfaceCodes) {
  const normalizedSurfaceCode = normalizeSurfaceCodeValue(surfaceCode);
  return (Array.isArray(allowedSurfaceCodes) ? allowedSurfaceCodes : []).some((candidate) => surfaceMatches(candidate, normalizedSurfaceCode));
}

function surfaceMatches(left, right) {
  return surfaceFingerprint(left) === surfaceFingerprint(right);
}

function normalizeSurfaceCodeValue(value) {
  return requireText(value, "saved_view_surface_code_required")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toUpperCase();
}

function surfaceFingerprint(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
}

function humanizeCode(value) {
  return String(value || "")
    .replace(/[_\.]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}
