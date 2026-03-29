import crypto from "node:crypto";
import {
  ACTIVITY_ENTRY_STATUSES,
  ACTIVITY_VISIBILITY_SCOPES
} from "./constants.mjs";
import { createAuditEnvelope } from "../../events/src/index.mjs";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";

export function createActivityPlatform(options = {}) {
  return createActivityEngine(options);
}

export function createActivityEngine({ clock = () => new Date() } = {}) {
  const state = {
    entries: new Map(),
    entryIdsByCompany: new Map(),
    entryIdByProjectionKey: new Map(),
    relations: new Map(),
    relationIdsByEntry: new Map(),
    rebuildRuns: [],
    auditEvents: []
  };

  const engine = {
    activityEntryStatuses: ACTIVITY_ENTRY_STATUSES,
    activityVisibilityScopes: ACTIVITY_VISIBILITY_SCOPES,
    projectActivityEntry,
    listActivityEntries,
    listActivityEntriesPage,
    getActivityEntry,
    hideActivityEntryByPolicy,
    rebuildActivityProjection,
    snapshotActivity
  };

  Object.defineProperty(engine, "__durableState", {
    value: state,
    enumerable: false
  });

  return engine;

  function projectActivityEntry({
    companyId,
    objectType,
    objectId,
    activityType,
    actorType,
    actorSnapshot = {},
    summary,
    occurredAt = null,
    sourceEventId,
    visibilityScope = "company",
    visibilityUserId = null,
    visibilityTeamId = null,
    relatedObjects = [],
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedObjectType = requireText(objectType, "activity_object_type_required");
    const resolvedObjectId = requireText(objectId, "activity_object_id_required");
    const resolvedActivityType = normalizeCode(activityType, "activity_type_required");
    const resolvedSourceEventId = requireText(sourceEventId, "activity_source_event_id_required");
    const projectionKey = [resolvedCompanyId, resolvedObjectType, resolvedObjectId, resolvedActivityType, resolvedSourceEventId].join("::");
    const existingEntryId = state.entryIdByProjectionKey.get(projectionKey);
    if (existingEntryId) {
      return presentActivityEntry(state, state.entries.get(existingEntryId));
    }

    const resolvedVisibilityScope = assertAllowed(normalizeEnumValue(visibilityScope, "activity_visibility_scope_required"), ACTIVITY_VISIBILITY_SCOPES, "activity_visibility_scope_invalid");
    const resolvedVisibilityUserId = normalizeOptionalText(visibilityUserId);
    const resolvedVisibilityTeamId = normalizeOptionalText(visibilityTeamId);
    if (resolvedVisibilityScope === "user" && !resolvedVisibilityUserId) {
      throw createError(400, "activity_visibility_user_id_required", "User-scoped activity requires a visibilityUserId.");
    }
    if (resolvedVisibilityScope === "team" && !resolvedVisibilityTeamId) {
      throw createError(400, "activity_visibility_team_id_required", "Team-scoped activity requires a visibilityTeamId.");
    }
    if (resolvedVisibilityScope !== "user" && resolvedVisibilityUserId) {
      throw createError(400, "activity_visibility_user_scope_mismatch", "visibilityUserId is only allowed for user-scoped activity.");
    }
    if (resolvedVisibilityScope !== "team" && resolvedVisibilityTeamId) {
      throw createError(400, "activity_visibility_team_scope_mismatch", "visibilityTeamId is only allowed for team-scoped activity.");
    }

    const entry = {
      activityEntryId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      objectType: resolvedObjectType,
      objectId: resolvedObjectId,
      activityType: resolvedActivityType,
      actorType: normalizeCode(actorType, "activity_actor_type_required"),
      actorSnapshotJson: copy(actorSnapshot || {}),
      summary: requireText(summary, "activity_summary_required"),
      occurredAt: normalizeOptionalDateTime(occurredAt) || nowIso(clock),
      sourceEventId: resolvedSourceEventId,
      visibilityScope: resolvedVisibilityScope,
      visibilityUserId: resolvedVisibilityUserId,
      visibilityTeamId: resolvedVisibilityTeamId,
      status: "visible",
      hiddenReasonCode: null,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock),
      projectionKey
    };
    state.entries.set(entry.activityEntryId, entry);
    appendToIndex(state.entryIdsByCompany, resolvedCompanyId, entry.activityEntryId);
    state.entryIdByProjectionKey.set(projectionKey, entry.activityEntryId);
    for (const relatedObject of Array.isArray(relatedObjects) ? relatedObjects : []) {
      const relation = {
        activityRelationId: crypto.randomUUID(),
        activityEntryId: entry.activityEntryId,
        relatedObjectType: requireText(relatedObject.relatedObjectType, "activity_related_object_type_required"),
        relatedObjectId: requireText(relatedObject.relatedObjectId, "activity_related_object_id_required"),
        relationCode: normalizeCode(relatedObject.relationCode || "related_to", "activity_relation_code_required")
      };
      state.relations.set(relation.activityRelationId, relation);
      appendToIndex(state.relationIdsByEntry, entry.activityEntryId, relation.activityRelationId);
    }
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: entry.createdByActorId,
      action: "activity.projected",
      entityType: "activity_entry",
      entityId: entry.activityEntryId,
      explanation: `Projected activity ${entry.activityType} for ${entry.objectType} ${entry.objectId}.`
    });
    return presentActivityEntry(state, entry);
  }

  function listActivityEntries({
    companyId,
    objectType = null,
    objectId = null,
    visibilityScope = null,
    relatedObjectType = null,
    relatedObjectId = null,
    viewerUserId = null,
    viewerTeamIds = [],
    viewerCanReadBackoffice = false
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedVisibilityScope = visibilityScope == null ? null : assertAllowed(normalizeEnumValue(visibilityScope, "activity_visibility_scope_required"), ACTIVITY_VISIBILITY_SCOPES, "activity_visibility_scope_invalid");
    return (state.entryIdsByCompany.get(resolvedCompanyId) || [])
      .map((entryId) => state.entries.get(entryId))
      .filter(Boolean)
      .filter((entry) => canViewerSeeActivityEntry(entry, { viewerUserId, viewerTeamIds, viewerCanReadBackoffice }))
      .map((entry) => presentActivityEntry(state, entry))
      .filter((entry) => (objectType ? entry.objectType === objectType : true))
      .filter((entry) => (objectId ? entry.objectId === objectId : true))
      .filter((entry) => (resolvedVisibilityScope ? entry.visibilityScope === resolvedVisibilityScope : true))
      .filter((entry) => {
        if (!relatedObjectType && !relatedObjectId) {
          return true;
        }
        return entry.relations.some((relation) => (!relatedObjectType || relation.relatedObjectType === relatedObjectType) && (!relatedObjectId || relation.relatedObjectId === relatedObjectId));
      })
      .sort(compareActivityEntries);
  }

  function listActivityEntriesPage({
    companyId,
    objectType = null,
    objectId = null,
    visibilityScope = null,
    relatedObjectType = null,
    relatedObjectId = null,
    limit = null,
    cursor = null,
    viewerUserId = null,
    viewerTeamIds = [],
    viewerCanReadBackoffice = false
  } = {}) {
    const resolvedLimit = limit == null ? null : normalizePositiveInteger(limit, "activity_limit_invalid");
    const resolvedCursor = cursor == null ? null : decodeActivityCursor(cursor);
    const filteredItems = listActivityEntries({
      companyId,
      objectType,
      objectId,
      visibilityScope,
      relatedObjectType,
      relatedObjectId,
      viewerUserId,
      viewerTeamIds,
      viewerCanReadBackoffice
    }).filter((entry) => isAfterActivityCursor(entry, resolvedCursor));
    const items = resolvedLimit == null ? filteredItems : filteredItems.slice(0, resolvedLimit);
    const nextCursor = resolvedLimit != null && filteredItems.length > resolvedLimit ? encodeActivityCursor(items[items.length - 1]) : null;
    return {
      items,
      nextCursor
    };
  }

  function getActivityEntry({ companyId, activityEntryId, viewerUserId = null, viewerTeamIds = [], viewerCanReadBackoffice = false } = {}) {
    const entry = requireEntry(state, companyId, activityEntryId);
    if (!canViewerSeeActivityEntry(entry, { viewerUserId, viewerTeamIds, viewerCanReadBackoffice })) {
      throw createError(403, "activity_entry_scope_forbidden", "Activity entry is outside the actor scope.");
    }
    return presentActivityEntry(state, entry);
  }

  function hideActivityEntryByPolicy({ companyId, activityEntryId, reasonCode, actorId = "system" } = {}) {
    const entry = requireEntry(state, companyId, activityEntryId);
    entry.status = "hidden_by_policy";
    entry.hiddenReasonCode = normalizeCode(reasonCode, "activity_hide_reason_required");
    entry.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: entry.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      action: "activity.hidden",
      entityType: "activity_entry",
      entityId: entry.activityEntryId,
      explanation: `Activity entry ${entry.activityEntryId} hidden by policy.`
    });
    return presentActivityEntry(state, entry);
  }

  function rebuildActivityProjection({ companyId, actorId = "system", projectionScope = "full_rebuild" } = {}) {
    const run = {
      rebuildRunId: crypto.randomUUID(),
      companyId: requireText(companyId, "company_id_required"),
      projectionScope: normalizeCode(projectionScope, "activity_projection_scope_required"),
      actorId: requireText(actorId, "actor_id_required"),
      rebuiltEntryCount: (state.entryIdsByCompany.get(companyId) || []).length,
      recordedAt: nowIso(clock)
    };
    state.rebuildRuns.push(run);
    pushAudit(state, clock, {
      companyId: run.companyId,
      actorId: run.actorId,
      action: "activity.rebuilt",
      entityType: "activity_projection",
      entityId: run.rebuildRunId,
      explanation: `Rebuilt activity projection for ${run.companyId}.`
    });
    return copy(run);
  }

  function snapshotActivity() {
    return {
      entries: [...state.entries.values()].map(copy),
      relations: [...state.relations.values()].map(copy),
      rebuildRuns: state.rebuildRuns.map(copy),
      auditEvents: state.auditEvents.map(copy)
    };
  }
}

function presentActivityEntry(state, entry) {
  return {
    ...copy(entry),
    relations: (state.relationIdsByEntry.get(entry.activityEntryId) || []).map((relationId) => copy(state.relations.get(relationId))).filter(Boolean)
  };
}

function requireEntry(state, companyId, activityEntryId) {
  const entry = state.entries.get(requireText(activityEntryId, "activity_entry_id_required"));
  if (!entry) {
    throw createError(404, "activity_entry_not_found", "Activity entry was not found.");
  }
  if (companyId && entry.companyId !== companyId) {
    throw createError(403, "cross_company_forbidden", "Activity entry belongs to another company.");
  }
  return entry;
}

function canViewerSeeActivityEntry(entry, { viewerUserId = null, viewerTeamIds = [], viewerCanReadBackoffice = false } = {}) {
  const resolvedViewerUserId = normalizeOptionalText(viewerUserId);
  const resolvedViewerTeamIds = normalizeViewerTeamIds(viewerTeamIds);
  switch (entry.visibilityScope) {
    case "company":
      return true;
    case "user":
      return Boolean(resolvedViewerUserId && entry.visibilityUserId === resolvedViewerUserId);
    case "team":
      return Boolean(entry.visibilityTeamId && resolvedViewerTeamIds.includes(entry.visibilityTeamId));
    case "backoffice":
      return viewerCanReadBackoffice === true;
    default:
      return false;
  }
}

function compareActivityEntries(left, right) {
  return right.occurredAt.localeCompare(left.occurredAt)
    || right.activityEntryId.localeCompare(left.activityEntryId);
}

function normalizeOptionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeViewerTeamIds(viewerTeamIds) {
  return Array.isArray(viewerTeamIds)
    ? [...new Set(viewerTeamIds.filter((teamId) => typeof teamId === "string" && teamId.trim().length > 0).map((teamId) => teamId.trim()))]
    : [];
}

function normalizePositiveInteger(value, code) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw createError(400, code, `${code} must be a positive integer.`);
  }
  return normalized;
}

function encodeActivityCursor(entry) {
  return Buffer.from(JSON.stringify({
    occurredAt: entry.occurredAt,
    activityEntryId: entry.activityEntryId
  }), "utf8").toString("base64url");
}

function decodeActivityCursor(cursor) {
  try {
    const value = JSON.parse(Buffer.from(String(cursor), "base64url").toString("utf8"));
    return {
      occurredAt: normalizeOptionalDateTime(value?.occurredAt),
      activityEntryId: requireText(value?.activityEntryId, "activity_cursor_invalid")
    };
  } catch {
    throw createError(400, "activity_cursor_invalid", "Activity cursor is invalid.");
  }
}

function isAfterActivityCursor(entry, cursor) {
  if (!cursor) {
    return true;
  }
  if (entry.occurredAt < cursor.occurredAt) {
    return true;
  }
  if (entry.occurredAt > cursor.occurredAt) {
    return false;
  }
  return entry.activityEntryId < cursor.activityEntryId;
}

function appendToIndex(index, key, value) {
  if (!index.has(key)) {
    index.set(key, []);
  }
  index.get(key).push(value);
}

function pushAudit(state, clock, {
  companyId,
  actorId,
  action,
  entityType,
  entityId,
  explanation,
  result = "success",
  correlationId = crypto.randomUUID(),
  metadata = {},
  sessionId = null
}) {
  state.auditEvents.push(
    createAuditEnvelope({
      companyId,
      actorId,
      action,
      entityType,
      entityId,
      explanation,
      result,
      correlationId,
      metadata,
      sessionId,
      recordedAt: new Date(clock()),
      auditClass: "activity_action"
    })
  );
}

function normalizeCode(value, code) {
  return requireText(value, code).replaceAll("-", "_").replaceAll(" ", "_").toUpperCase();
}

function normalizeEnumValue(value, code) {
  return requireText(value, code).replaceAll("-", "_").replaceAll(" ", "_").toLowerCase();
}

function normalizeOptionalDateTime(value) {
  if (value == null || String(value).trim().length === 0) {
    return null;
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw createError(400, "activity_datetime_invalid", "Datetime is invalid.");
  }
  return date.toISOString();
}

function requireText(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createError(400, code, `${code} is required.`);
  }
  return value.trim();
}

function assertAllowed(value, allowed, code) {
  if (!allowed.includes(value)) {
    throw createError(400, code, `Value "${value}" is not allowed.`);
  }
  return value;
}

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

