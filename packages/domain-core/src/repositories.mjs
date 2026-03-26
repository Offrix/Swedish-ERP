import crypto from "node:crypto";

export const CORE_CANONICAL_REPOSITORY_TABLE = "core_domain_records";

export const CORE_CANONICAL_REPOSITORY_OBJECT_TYPES = Object.freeze({
  portfolios: "bureau_portfolio_membership",
  requests: "bureau_client_request",
  approvals: "bureau_approval_package",
  workItems: "bureau_work_item",
  operationalWorkItems: "operational_work_item",
  comments: "core_comment",
  closeChecklists: "close_checklist",
  closeBlockers: "close_blocker",
  closeSignoffs: "close_signoff",
  closeReopenRequests: "close_reopen_request",
  supportCases: "support_case",
  impersonationSessions: "impersonation_session",
  accessReviewBatches: "access_review_batch",
  adminDiagnostics: "admin_diagnostic",
  breakGlassSessions: "break_glass_session",
  featureFlags: "feature_flag",
  emergencyDisables: "emergency_disable",
  loadProfiles: "load_profile",
  restoreDrills: "restore_drill",
  chaosScenarios: "chaos_scenario",
  auditCorrelations: "audit_correlation",
  incidentSignals: "incident_signal",
  runtimeIncidents: "runtime_incident",
  runtimeIncidentEvents: "runtime_incident_event",
  runtimeIncidentPostReviews: "runtime_incident_post_review",
  runtimeRestorePlans: "runtime_restore_plan",
  mappingSets: "mapping_set",
  importBatches: "import_batch",
  migrationCorrections: "migration_correction",
  diffReports: "diff_report",
  cutoverPlans: "cutover_plan",
  migrationAcceptanceRecords: "migration_acceptance_record",
  postCutoverCorrectionCases: "post_cutover_correction_case",
  payrollMigrationBatches: "payroll_migration_batch",
  employeeMigrationRecords: "employee_migration_record",
  balanceBaselines: "balance_baseline",
  payrollMigrationDiffs: "payroll_migration_diff",
  payrollMigrationApprovals: "payroll_migration_approval"
});

const CORE_BOUNDED_CONTEXT_CODE = "core";

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function text(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${fieldName} is required.`);
  }
  return value.trim();
}

function normalizeStatus(value, payload) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (typeof payload?.status === "string" && payload.status.trim().length > 0) {
    return payload.status.trim();
  }
  return null;
}

function normalizeTimestamp(value) {
  const candidate = value == null ? new Date() : value;
  const date = candidate instanceof Date ? candidate : new Date(candidate);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("recordedAt must be a valid timestamp.");
  }
  return date.toISOString();
}

function buildRecordKey({ tableName, boundedContextCode, objectType, companyId, objectId }) {
  return [tableName, boundedContextCode, objectType, companyId, objectId].join("::");
}

function toRepositoryObject(record) {
  if (!record) {
    return null;
  }
  return {
    tableName: record.tableName,
    boundedContextCode: record.boundedContextCode,
    objectType: record.objectType,
    companyId: record.companyId,
    objectId: record.objectId,
    status: record.status,
    payload: clone(record.payload),
    objectVersion: record.objectVersion,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastActorId: record.lastActorId,
    lastCorrelationId: record.lastCorrelationId
  };
}

export class CanonicalRepositoryConflictError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "CanonicalRepositoryConflictError";
    this.code = "canonical_repository_conflict";
    this.details = clone(details);
  }
}

function createConflictError({ tableName, boundedContextCode, objectType, companyId, objectId, expectedObjectVersion, actualObjectVersion, action }) {
  return new CanonicalRepositoryConflictError("Optimistic concurrency check failed.", {
    tableName,
    boundedContextCode,
    objectType,
    companyId,
    objectId,
    expectedObjectVersion: expectedObjectVersion == null ? null : Number(expectedObjectVersion),
    actualObjectVersion: actualObjectVersion == null ? null : Number(actualObjectVersion),
    action
  });
}

function createMemoryTransaction(records) {
  return {
    kind: "memory_canonical_repository_transaction",

    async getRecord({ tableName = CORE_CANONICAL_REPOSITORY_TABLE, boundedContextCode = CORE_BOUNDED_CONTEXT_CODE, objectType, companyId, objectId }) {
      const key = buildRecordKey({
        tableName,
        boundedContextCode,
        objectType: text(objectType, "objectType"),
        companyId: text(companyId, "companyId"),
        objectId: text(objectId, "objectId")
      });
      return toRepositoryObject(records.get(key) || null);
    },

    async listRecords({ tableName = CORE_CANONICAL_REPOSITORY_TABLE, boundedContextCode = CORE_BOUNDED_CONTEXT_CODE, objectType, companyId }) {
      const normalizedObjectType = text(objectType, "objectType");
      const normalizedCompanyId = text(companyId, "companyId");
      return [...records.values()]
        .filter((record) =>
          record.tableName === tableName
          && record.boundedContextCode === boundedContextCode
          && record.objectType === normalizedObjectType
          && record.companyId === normalizedCompanyId
        )
        .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt) || left.objectId.localeCompare(right.objectId))
        .map(toRepositoryObject);
    },

    async saveRecord({
      tableName = CORE_CANONICAL_REPOSITORY_TABLE,
      boundedContextCode = CORE_BOUNDED_CONTEXT_CODE,
      objectType,
      companyId,
      objectId,
      status = null,
      payload,
      expectedObjectVersion = null,
      actorId = null,
      correlationId = null,
      recordedAt = null
    }) {
      const normalizedObjectType = text(objectType, "objectType");
      const normalizedCompanyId = text(companyId, "companyId");
      const normalizedObjectId = text(objectId, "objectId");
      const key = buildRecordKey({
        tableName,
        boundedContextCode,
        objectType: normalizedObjectType,
        companyId: normalizedCompanyId,
        objectId: normalizedObjectId
      });
      const existing = records.get(key) || null;
      const normalizedRecordedAt = normalizeTimestamp(recordedAt);
      const normalizedPayload = clone(payload ?? {});
      const normalizedStatus = normalizeStatus(status, normalizedPayload);

      if (!existing) {
        if (![null, 0].includes(expectedObjectVersion)) {
          throw createConflictError({
            tableName,
            boundedContextCode,
            objectType: normalizedObjectType,
            companyId: normalizedCompanyId,
            objectId: normalizedObjectId,
            expectedObjectVersion,
            actualObjectVersion: null,
            action: "create"
          });
        }
        const created = {
          tableName,
          boundedContextCode,
          objectType: normalizedObjectType,
          companyId: normalizedCompanyId,
          objectId: normalizedObjectId,
          status: normalizedStatus,
          payload: normalizedPayload,
          objectVersion: 1,
          createdAt: normalizedRecordedAt,
          updatedAt: normalizedRecordedAt,
          lastActorId: actorId ? text(actorId, "actorId") : null,
          lastCorrelationId: correlationId ? text(correlationId, "correlationId") : null
        };
        records.set(key, created);
        return toRepositoryObject(created);
      }

      if (expectedObjectVersion == null || Number(expectedObjectVersion) !== Number(existing.objectVersion)) {
        throw createConflictError({
          tableName,
          boundedContextCode,
          objectType: normalizedObjectType,
          companyId: normalizedCompanyId,
          objectId: normalizedObjectId,
          expectedObjectVersion,
          actualObjectVersion: existing.objectVersion,
          action: "update"
        });
      }

      const updated = {
        ...existing,
        status: normalizedStatus,
        payload: normalizedPayload,
        objectVersion: existing.objectVersion + 1,
        updatedAt: normalizedRecordedAt,
        lastActorId: actorId ? text(actorId, "actorId") : existing.lastActorId,
        lastCorrelationId: correlationId ? text(correlationId, "correlationId") : existing.lastCorrelationId
      };
      records.set(key, updated);
      return toRepositoryObject(updated);
    },

    async deleteRecord({
      tableName = CORE_CANONICAL_REPOSITORY_TABLE,
      boundedContextCode = CORE_BOUNDED_CONTEXT_CODE,
      objectType,
      companyId,
      objectId,
      expectedObjectVersion
    }) {
      const normalizedObjectType = text(objectType, "objectType");
      const normalizedCompanyId = text(companyId, "companyId");
      const normalizedObjectId = text(objectId, "objectId");
      const key = buildRecordKey({
        tableName,
        boundedContextCode,
        objectType: normalizedObjectType,
        companyId: normalizedCompanyId,
        objectId: normalizedObjectId
      });
      const existing = records.get(key) || null;
      if (!existing || expectedObjectVersion == null || Number(expectedObjectVersion) !== Number(existing.objectVersion)) {
        throw createConflictError({
          tableName,
          boundedContextCode,
          objectType: normalizedObjectType,
          companyId: normalizedCompanyId,
          objectId: normalizedObjectId,
          expectedObjectVersion,
          actualObjectVersion: existing?.objectVersion ?? null,
          action: "delete"
        });
      }
      records.delete(key);
      return toRepositoryObject(existing);
    }
  };
}

export function createInMemoryCanonicalRepositoryStore() {
  const records = new Map();

  return {
    kind: "memory_canonical_repository_store",

    async close() {},

    async withTransaction(work) {
      const transactionalState = new Map();
      for (const [key, value] of records.entries()) {
        transactionalState.set(key, clone(value));
      }
      const transaction = createMemoryTransaction(transactionalState);
      const result = await work(transaction);
      records.clear();
      for (const [key, value] of transactionalState.entries()) {
        records.set(key, value);
      }
      return result;
    },

    snapshot() {
      return [...records.values()].map(toRepositoryObject);
    }
  };
}

function createRepositoryExecutor({ store = null, transaction = null }) {
  if (transaction) {
    return async (work) => work(transaction);
  }
  if (!store || typeof store.withTransaction !== "function") {
    throw new TypeError("A canonical repository store or transaction is required.");
  }
  return async (work) => store.withTransaction(work);
}

export function createCanonicalJsonRepository({
  store = null,
  transaction = null,
  tableName = CORE_CANONICAL_REPOSITORY_TABLE,
  boundedContextCode = CORE_BOUNDED_CONTEXT_CODE,
  objectType
}) {
  const normalizedObjectType = text(objectType, "objectType");
  const execute = createRepositoryExecutor({ store, transaction });

  return {
    tableName,
    boundedContextCode,
    objectType: normalizedObjectType,

    async get({ companyId, objectId }) {
      return execute((tx) =>
        tx.getRecord({
          tableName,
          boundedContextCode,
          objectType: normalizedObjectType,
          companyId,
          objectId
        })
      );
    },

    async list({ companyId }) {
      return execute((tx) =>
        tx.listRecords({
          tableName,
          boundedContextCode,
          objectType: normalizedObjectType,
          companyId
        })
      );
    },

    async save({
      companyId,
      objectId,
      status = null,
      payload,
      expectedObjectVersion = null,
      actorId = null,
      correlationId = crypto.randomUUID(),
      recordedAt = null
    }) {
      return execute((tx) =>
        tx.saveRecord({
          tableName,
          boundedContextCode,
          objectType: normalizedObjectType,
          companyId,
          objectId,
          status,
          payload,
          expectedObjectVersion,
          actorId,
          correlationId,
          recordedAt
        })
      );
    },

    async delete({ companyId, objectId, expectedObjectVersion }) {
      return execute((tx) =>
        tx.deleteRecord({
          tableName,
          boundedContextCode,
          objectType: normalizedObjectType,
          companyId,
          objectId,
          expectedObjectVersion
        })
      );
    }
  };
}

export function createCoreCanonicalRepositories({ store = null, transaction = null } = {}) {
  return Object.fromEntries(
    Object.entries(CORE_CANONICAL_REPOSITORY_OBJECT_TYPES).map(([key, objectType]) => [
      key,
      createCanonicalJsonRepository({
        store,
        transaction,
        tableName: CORE_CANONICAL_REPOSITORY_TABLE,
        boundedContextCode: CORE_BOUNDED_CONTEXT_CODE,
        objectType
      })
    ])
  );
}
