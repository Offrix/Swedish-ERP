import crypto from "node:crypto";
import { createRequire } from "node:module";
import { EVENT_ENVELOPE_VERSION } from "../../events/src/index.mjs";
import {
  cloneSnapshotValue,
  deserializeSnapshotValue,
  serializeSnapshotValue
} from "./clone.mjs";
import {
  CRITICAL_DOMAIN_STATE_SCHEMA_VERSION,
  CRITICAL_DOMAIN_STATE_TABLE,
  CRITICAL_DOMAIN_COMMAND_RECEIPT_TABLE,
  CRITICAL_DOMAIN_DOMAIN_EVENT_TABLE,
  CRITICAL_DOMAIN_OUTBOX_MESSAGE_TABLE,
  CRITICAL_DOMAIN_EVIDENCE_REF_TABLE,
  CriticalDomainStateConflictError
} from "./critical-domain-state-store.mjs";

const require = createRequire(import.meta.url);

export const POSTGRES_CRITICAL_DOMAIN_STATE_REQUIRED_MIGRATION_IDS = Object.freeze([
  "20260326121500_phase2_critical_domain_state_runtime"
]);

export const POSTGRES_CRITICAL_DOMAIN_STATE_SCHEMA_CONTRACT = Object.freeze({
  schemaMigrationsTable: "schema_migrations",
  requiredMigrationIds: POSTGRES_CRITICAL_DOMAIN_STATE_REQUIRED_MIGRATION_IDS,
  tables: Object.freeze({
    critical_domain_state_snapshots: Object.freeze({
      columns: Object.freeze([
        "domain_key",
        "schema_version",
        "snapshot_json",
        "snapshot_hash",
        "persisted_at",
        "object_version",
        "durability_policy",
        "adapter_kind"
      ])
    }),
    critical_domain_command_receipts: Object.freeze({
      columns: Object.freeze([
        "command_receipt_id",
        "domain_key",
        "company_id",
        "command_type",
        "aggregate_type",
        "aggregate_id",
        "command_id",
        "idempotency_key",
        "expected_object_version",
        "resulting_object_version",
        "actor_id",
        "session_revision",
        "correlation_id",
        "causation_id",
        "payload_hash",
        "command_payload_json",
        "metadata_json",
        "status",
        "recorded_at",
        "processed_at"
      ]),
      indexes: Object.freeze(["critical_domain_command_receipts_company_recorded_idx"]),
      uniqueConstraints: Object.freeze([
        Object.freeze(["company_id", "command_type", "command_id"]),
        Object.freeze(["company_id", "idempotency_key"])
      ]),
      foreignKeys: Object.freeze([
        Object.freeze({
          columns: Object.freeze(["company_id"]),
          foreignTable: "companies",
          foreignColumns: Object.freeze(["company_id"])
        })
      ])
    }),
    critical_domain_domain_events: Object.freeze({
      columns: Object.freeze([
        "domain_event_id",
        "domain_key",
        "company_id",
        "aggregate_type",
        "aggregate_id",
        "command_receipt_id",
        "object_version",
        "event_type",
        "payload_json",
        "actor_id",
        "correlation_id",
        "causation_id",
        "status",
        "recorded_at"
      ]),
      indexes: Object.freeze([
        "critical_domain_domain_events_company_recorded_idx",
        "critical_domain_domain_events_receipt_idx"
      ]),
      foreignKeys: Object.freeze([
        Object.freeze({
          columns: Object.freeze(["company_id"]),
          foreignTable: "companies",
          foreignColumns: Object.freeze(["company_id"])
        }),
        Object.freeze({
          columns: Object.freeze(["command_receipt_id"]),
          foreignTable: "critical_domain_command_receipts",
          foreignColumns: Object.freeze(["command_receipt_id"])
        })
      ])
    }),
    critical_domain_outbox_messages: Object.freeze({
      columns: Object.freeze([
        "outbox_message_id",
        "domain_key",
        "company_id",
        "aggregate_type",
        "aggregate_id",
        "command_receipt_id",
        "event_type",
        "payload_json",
        "actor_id",
        "correlation_id",
        "causation_id",
        "idempotency_key",
        "status",
        "recorded_at",
        "published_at"
      ]),
      indexes: Object.freeze([
        "critical_domain_outbox_messages_company_recorded_idx",
        "critical_domain_outbox_messages_receipt_idx"
      ]),
      foreignKeys: Object.freeze([
        Object.freeze({
          columns: Object.freeze(["company_id"]),
          foreignTable: "companies",
          foreignColumns: Object.freeze(["company_id"])
        }),
        Object.freeze({
          columns: Object.freeze(["command_receipt_id"]),
          foreignTable: "critical_domain_command_receipts",
          foreignColumns: Object.freeze(["command_receipt_id"])
        })
      ])
    }),
    critical_domain_evidence_refs: Object.freeze({
      columns: Object.freeze([
        "evidence_ref_id",
        "domain_key",
        "company_id",
        "aggregate_type",
        "aggregate_id",
        "command_receipt_id",
        "domain_event_id",
        "evidence_ref_type",
        "evidence_ref",
        "metadata_json",
        "actor_id",
        "correlation_id",
        "causation_id",
        "status",
        "recorded_at"
      ]),
      indexes: Object.freeze([
        "critical_domain_evidence_refs_company_recorded_idx",
        "critical_domain_evidence_refs_receipt_idx"
      ]),
      foreignKeys: Object.freeze([
        Object.freeze({
          columns: Object.freeze(["company_id"]),
          foreignTable: "companies",
          foreignColumns: Object.freeze(["company_id"])
        }),
        Object.freeze({
          columns: Object.freeze(["command_receipt_id"]),
          foreignTable: "critical_domain_command_receipts",
          foreignColumns: Object.freeze(["command_receipt_id"])
        }),
        Object.freeze({
          columns: Object.freeze(["domain_event_id"]),
          foreignTable: "critical_domain_domain_events",
          foreignColumns: Object.freeze(["domain_event_id"])
        })
      ])
    })
  })
});

function text(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${fieldName} is required.`);
  }
  return value.trim();
}

function optionalText(value, fieldName) {
  if (value == null) {
    return null;
  }
  return text(value, fieldName);
}

function normalizeTimestamp(value = null) {
  const candidate = value == null ? new Date() : new Date(value);
  if (Number.isNaN(candidate.getTime())) {
    throw new TypeError("persistedAt must be a valid timestamp.");
  }
  return candidate.toISOString();
}

function hashSnapshot(snapshot) {
  return crypto.createHash("sha256").update(JSON.stringify(serializeSnapshotValue(snapshot ?? null))).digest("hex");
}

function hashPayload(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(serializeSnapshotValue(payload ?? null))).digest("hex");
}

function normalizeExpectedObjectVersion(value) {
  if (value == null) {
    return null;
  }
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new TypeError("expectedObjectVersion must be a non-negative integer.");
  }
  return normalized;
}

function normalizeObjectVersion(value) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new TypeError("objectVersion must be a positive integer.");
  }
  return normalized;
}

function normalizePositiveInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new TypeError(`${fieldName} must be a positive integer.`);
  }
  return normalized;
}

function deserializePersistedValue(value) {
  if (value == null) {
    return {};
  }
  if (typeof value === "string") {
    return deserializeSnapshotValue(JSON.parse(value));
  }
  return deserializeSnapshotValue(cloneSnapshotValue(value));
}

function createConflictError({ domainKey, expectedObjectVersion, actualObjectVersion, action }) {
  return new CriticalDomainStateConflictError("Critical domain state optimistic concurrency check failed.", {
    domainKey,
    expectedObjectVersion,
    actualObjectVersion,
    action
  });
}

function mapRow(row) {
  if (!row) {
    return null;
  }
  return {
    domainKey: row.domain_key,
    schemaVersion: Number(row.schema_version),
    snapshot: deserializePersistedValue(row.snapshot_json),
    snapshotHash: row.snapshot_hash,
    persistedAt: row.persisted_at,
    objectVersion: normalizeObjectVersion(row.object_version),
    durabilityPolicy: row.durability_policy,
    adapterKind: row.adapter_kind
  };
}

function mapCommandReceiptRow(row) {
  if (!row) {
    return null;
  }
  return {
    commandReceiptId: row.command_receipt_id,
    domainKey: row.domain_key,
    companyId: row.company_id,
    commandType: row.command_type,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    commandId: row.command_id,
    idempotencyKey: row.idempotency_key,
    expectedObjectVersion: row.expected_object_version == null ? null : Number(row.expected_object_version),
    resultingObjectVersion: row.resulting_object_version == null ? null : Number(row.resulting_object_version),
    actorId: row.actor_id,
    sessionRevision: Number(row.session_revision),
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    payloadHash: row.payload_hash,
    commandPayload: deserializePersistedValue(row.command_payload_json),
    metadata: deserializePersistedValue(row.metadata_json),
    status: row.status,
    recordedAt: row.recorded_at,
    processedAt: row.processed_at
  };
}

function mapDomainEventRow(row) {
  if (!row) {
    return null;
  }
  return {
    domainEventId: row.domain_event_id,
    domainKey: row.domain_key,
    companyId: row.company_id,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    commandReceiptId: row.command_receipt_id,
    objectVersion: row.object_version == null ? null : Number(row.object_version),
    eventType: row.event_type,
    payload: deserializePersistedValue(row.payload_json),
    actorId: row.actor_id,
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    status: row.status,
    recordedAt: row.recorded_at
  };
}

function mapOutboxMessageRow(row) {
  if (!row) {
    return null;
  }
  return {
    eventEnvelopeVersion: row.event_envelope_version == null ? EVENT_ENVELOPE_VERSION : Number(row.event_envelope_version),
    outboxMessageId: row.outbox_message_id,
    domainKey: row.domain_key,
    companyId: row.company_id,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    commandReceiptId: row.command_receipt_id,
    eventType: row.event_type,
    payload: deserializePersistedValue(row.payload_json),
    actorId: row.actor_id,
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    recordedAt: row.recorded_at,
    publishedAt: row.published_at
  };
}

function mapEvidenceRefRow(row) {
  if (!row) {
    return null;
  }
  return {
    evidenceRefId: row.evidence_ref_id,
    domainKey: row.domain_key,
    companyId: row.company_id,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    commandReceiptId: row.command_receipt_id,
    domainEventId: row.domain_event_id,
    evidenceRefType: row.evidence_ref_type,
    evidenceRef: row.evidence_ref,
    metadata: deserializePersistedValue(row.metadata_json),
    actorId: row.actor_id,
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    status: row.status,
    recordedAt: row.recorded_at
  };
}

function loadPostgresClient() {
  try {
    const postgresModule = require("postgres");
    return postgresModule?.default || postgresModule;
  } catch (error) {
    const message = typeof error?.message === "string" ? error.message : "unknown_error";
    throw new Error(`Postgres client package could not be loaded for critical domain state store: ${message}`);
  }
}

function buildColumnContractKey(tableName, columnName) {
  return `${tableName}.${columnName}`;
}

function buildIndexContractKey(tableName, indexName) {
  return `${tableName}.${indexName}`;
}

function buildUniqueConstraintKey(tableName, columns) {
  return `${tableName}:${columns.join(",")}`;
}

function buildForeignKeyContractKey(tableName, columns, foreignTable, foreignColumns) {
  return `${tableName}:${columns.join(",")}=>${foreignTable}:${foreignColumns.join(",")}`;
}

async function verifyPostgresCriticalDomainStateStoreSchemaContract(sql) {
  const [schemaMigrationsTableRows, migrationRows, columnRows, indexRows, uniqueConstraintRows, foreignKeyRows] = await Promise.all([
    sql`select to_regclass(current_schema() || '.schema_migrations')::text as relation_name`,
    sql`select migration_id from schema_migrations`,
    sql`
      select table_name, column_name
      from information_schema.columns
      where table_schema = current_schema()
    `,
    sql`
      select tablename as table_name, indexname as index_name
      from pg_indexes
      where schemaname = current_schema()
    `,
    sql`
      select tc.table_name, string_agg(kcu.column_name, ',' order by kcu.ordinal_position) as column_list
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
       and tc.table_schema = kcu.table_schema
      where tc.table_schema = current_schema()
        and tc.constraint_type = 'UNIQUE'
      group by tc.table_name, tc.constraint_name
    `,
    sql`
      select
        tc.table_name,
        string_agg(kcu.column_name, ',' order by kcu.ordinal_position) as column_list,
        ccu.table_name as foreign_table_name,
        string_agg(ccu.column_name, ',' order by kcu.ordinal_position) as foreign_column_list
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
       and tc.table_schema = kcu.table_schema
      join information_schema.constraint_column_usage ccu
        on tc.constraint_name = ccu.constraint_name
       and tc.table_schema = ccu.table_schema
      where tc.table_schema = current_schema()
        and tc.constraint_type = 'FOREIGN KEY'
      group by tc.table_name, tc.constraint_name, ccu.table_name
    `
  ]);

  if (!schemaMigrationsTableRows[0]?.relation_name) {
    throw new Error("Postgres critical domain state schema contract is incomplete: missing schema_migrations table.");
  }

  const installedMigrationIds = new Set(migrationRows.map((row) => row.migration_id));
  const availableColumns = new Set(columnRows.map((row) => buildColumnContractKey(row.table_name, row.column_name)));
  const availableIndexes = new Set(indexRows.map((row) => buildIndexContractKey(row.table_name, row.index_name)));
  const availableUniqueConstraints = new Set(
    uniqueConstraintRows.map((row) => buildUniqueConstraintKey(row.table_name, String(row.column_list || "").split(",").filter(Boolean)))
  );
  const availableForeignKeys = new Set(
    foreignKeyRows.map((row) =>
      buildForeignKeyContractKey(
        row.table_name,
        String(row.column_list || "").split(",").filter(Boolean),
        row.foreign_table_name,
        String(row.foreign_column_list || "").split(",").filter(Boolean)
      )
    )
  );

  const missingMigrationIds = POSTGRES_CRITICAL_DOMAIN_STATE_SCHEMA_CONTRACT.requiredMigrationIds.filter(
    (migrationId) => !installedMigrationIds.has(migrationId)
  );
  const missingColumns = [];
  const missingIndexes = [];
  const missingUniqueConstraints = [];
  const missingForeignKeys = [];

  for (const [tableName, tableContract] of Object.entries(POSTGRES_CRITICAL_DOMAIN_STATE_SCHEMA_CONTRACT.tables)) {
    for (const columnName of tableContract.columns || []) {
      if (!availableColumns.has(buildColumnContractKey(tableName, columnName))) {
        missingColumns.push(`${tableName}.${columnName}`);
      }
    }
    for (const indexName of tableContract.indexes || []) {
      if (!availableIndexes.has(buildIndexContractKey(tableName, indexName))) {
        missingIndexes.push(`${tableName}.${indexName}`);
      }
    }
    for (const columns of tableContract.uniqueConstraints || []) {
      if (!availableUniqueConstraints.has(buildUniqueConstraintKey(tableName, columns))) {
        missingUniqueConstraints.push(`${tableName}:${columns.join(",")}`);
      }
    }
    for (const foreignKey of tableContract.foreignKeys || []) {
      const contractKey = buildForeignKeyContractKey(
        tableName,
        foreignKey.columns,
        foreignKey.foreignTable,
        foreignKey.foreignColumns
      );
      if (!availableForeignKeys.has(contractKey)) {
        missingForeignKeys.push(contractKey);
      }
    }
  }

  const failureMessages = [];
  if (missingMigrationIds.length > 0) failureMessages.push(`missing migrations [${missingMigrationIds.join(", ")}]`);
  if (missingColumns.length > 0) failureMessages.push(`missing columns [${missingColumns.join(", ")}]`);
  if (missingIndexes.length > 0) failureMessages.push(`missing indexes [${missingIndexes.join(", ")}]`);
  if (missingUniqueConstraints.length > 0) failureMessages.push(`missing unique constraints [${missingUniqueConstraints.join(", ")}]`);
  if (missingForeignKeys.length > 0) failureMessages.push(`missing foreign keys [${missingForeignKeys.join(", ")}]`);
  if (failureMessages.length > 0) {
    throw new Error(`Postgres critical domain state schema contract is incomplete: ${failureMessages.join("; ")}.`);
  }

  return Object.freeze({
    ok: true,
    schemaMigrationsTable: POSTGRES_CRITICAL_DOMAIN_STATE_SCHEMA_CONTRACT.schemaMigrationsTable,
    verifiedAt: new Date().toISOString(),
    requiredMigrationIds: [...POSTGRES_CRITICAL_DOMAIN_STATE_REQUIRED_MIGRATION_IDS],
    checkedTables: Object.keys(POSTGRES_CRITICAL_DOMAIN_STATE_SCHEMA_CONTRACT.tables),
    checkedIndexes: Object.values(POSTGRES_CRITICAL_DOMAIN_STATE_SCHEMA_CONTRACT.tables)
      .flatMap((tableContract) => [...(tableContract.indexes || [])])
  });
}

export function resolveCriticalDomainStateConnectionString({
  connectionString = null,
  env = process.env
} = {}) {
  if (connectionString) return connectionString;
  if (env.ERP_CRITICAL_DOMAIN_STATE_URL) return env.ERP_CRITICAL_DOMAIN_STATE_URL;
  if (env.CRITICAL_DOMAIN_STATE_URL) return env.CRITICAL_DOMAIN_STATE_URL;
  if (env.CANONICAL_REPOSITORY_URL) return env.CANONICAL_REPOSITORY_URL;
  if (env.POSTGRES_URL) return env.POSTGRES_URL;
  if (env.DATABASE_URL) return env.DATABASE_URL;
  if (!env.POSTGRES_HOST) return null;
  const user = text(env.POSTGRES_USER || env.POSTGRES_USERNAME || "postgres", "POSTGRES_USER");
  const password = optionalText(env.POSTGRES_PASSWORD, "POSTGRES_PASSWORD") || "";
  const host = text(env.POSTGRES_HOST, "POSTGRES_HOST");
  const port = Number(env.POSTGRES_PORT || 5432);
  if (!Number.isInteger(port) || port <= 0) {
    throw new TypeError("POSTGRES_PORT must be a positive integer.");
  }
  const database = text(env.POSTGRES_DB || env.POSTGRES_DATABASE || "postgres", "POSTGRES_DB");
  const auth = password.length > 0
    ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}`
    : encodeURIComponent(user);
  return `postgres://${auth}@${host}:${port}/${encodeURIComponent(database)}`;
}

export function createPostgresCriticalDomainStateStore({
  connectionString = null,
  env = process.env,
  max = 5,
  idleTimeout = 5,
  connectTimeout = 30,
  sqlClient = null
} = {}) {
  const ownsClient = !sqlClient;
  const resolvedConnectionString = resolveCriticalDomainStateConnectionString({ connectionString, env });
  if (!sqlClient && !resolvedConnectionString) {
    throw new Error("Postgres connection information is required for critical domain state store.");
  }
  const postgres = sqlClient ? null : loadPostgresClient();
  const sql = sqlClient || postgres(resolvedConnectionString, {
    max,
    idle_timeout: idleTimeout,
    connect_timeout: connectTimeout,
    prepare: false
  });
  let schemaContractVerification = null;

  return {
    kind: "postgres_critical_domain_state_store",
    connectionString: resolvedConnectionString,

    async load(domainKey) {
      const rows = await sql`
        select domain_key, schema_version, snapshot_json, snapshot_hash, persisted_at, object_version, durability_policy, adapter_kind
        from critical_domain_state_snapshots
        where domain_key = ${text(domainKey, "domainKey")}
        limit 1
      `;
      return mapRow(rows[0] || null);
    },

    async save({
      domainKey,
      snapshot,
      expectedObjectVersion = null,
      persistedAt = null,
      durabilityPolicy = null,
      adapterKind = null
    }) {
      const normalizedDomainKey = text(domainKey, "domainKey");
      const normalizedExpectedObjectVersion = normalizeExpectedObjectVersion(expectedObjectVersion);
      const normalizedPersistedAt = normalizeTimestamp(persistedAt);
      return sql.begin(async (tx) => {
        const existingRows = await tx`
          select domain_key, schema_version, snapshot_json, snapshot_hash, persisted_at, object_version, durability_policy, adapter_kind
          from critical_domain_state_snapshots
          where domain_key = ${normalizedDomainKey}
          limit 1
        `;
        const existingRecord = mapRow(existingRows[0] || null);
        const record = {
          domainKey: normalizedDomainKey,
          schemaVersion: CRITICAL_DOMAIN_STATE_SCHEMA_VERSION,
          snapshot: cloneSnapshotValue(snapshot ?? {}),
          snapshotHash: hashSnapshot(snapshot),
          persistedAt: normalizedPersistedAt,
          objectVersion: existingRecord ? existingRecord.objectVersion + 1 : 1,
          durabilityPolicy: optionalText(durabilityPolicy, "durabilityPolicy"),
          adapterKind: optionalText(adapterKind, "adapterKind")
        };
        if (
          existingRecord
          && normalizedExpectedObjectVersion !== null
          && normalizedExpectedObjectVersion !== existingRecord.objectVersion
        ) {
          throw createConflictError({
            domainKey: normalizedDomainKey,
            expectedObjectVersion: normalizedExpectedObjectVersion,
            actualObjectVersion: existingRecord.objectVersion,
            action: "update"
          });
        }
        if (!existingRecord && ![null, 0].includes(normalizedExpectedObjectVersion)) {
          throw createConflictError({
            domainKey: normalizedDomainKey,
            expectedObjectVersion: normalizedExpectedObjectVersion,
            actualObjectVersion: null,
            action: "create"
          });
        }
        if (!existingRecord) {
          const rows = await tx`
            insert into critical_domain_state_snapshots (
              domain_key,
              schema_version,
              snapshot_json,
              snapshot_hash,
              persisted_at,
              object_version,
              durability_policy,
              adapter_kind
            ) values (
              ${record.domainKey},
              ${record.schemaVersion},
              ${JSON.stringify(serializeSnapshotValue(record.snapshot))}::jsonb,
              ${record.snapshotHash},
              ${record.persistedAt},
              ${record.objectVersion},
              ${record.durabilityPolicy},
              ${record.adapterKind}
            )
            returning domain_key, schema_version, snapshot_json, snapshot_hash, persisted_at, object_version, durability_policy, adapter_kind
          `;
          return mapRow(rows[0]);
        }
        const rows = await tx`
          update critical_domain_state_snapshots
          set schema_version = ${record.schemaVersion},
              snapshot_json = ${JSON.stringify(serializeSnapshotValue(record.snapshot))}::jsonb,
              snapshot_hash = ${record.snapshotHash},
              persisted_at = ${record.persistedAt},
              object_version = ${record.objectVersion},
              durability_policy = ${record.durabilityPolicy},
              adapter_kind = ${record.adapterKind}
          where domain_key = ${record.domainKey}
            and object_version = ${existingRecord.objectVersion}
          returning domain_key, schema_version, snapshot_json, snapshot_hash, persisted_at, object_version, durability_policy, adapter_kind
        `;
        if (rows.length === 0) {
          const latestRows = await tx`
            select domain_key, schema_version, snapshot_json, snapshot_hash, persisted_at, object_version, durability_policy, adapter_kind
            from critical_domain_state_snapshots
            where domain_key = ${normalizedDomainKey}
            limit 1
          `;
          throw createConflictError({
            domainKey: normalizedDomainKey,
            expectedObjectVersion: existingRecord.objectVersion,
            actualObjectVersion: mapRow(latestRows[0] || null)?.objectVersion ?? null,
            action: "update"
          });
        }
        return mapRow(rows[0]);
      });
    },

    async list() {
      const rows = await sql`
        select domain_key, schema_version, snapshot_json, snapshot_hash, persisted_at, object_version, durability_policy, adapter_kind
        from critical_domain_state_snapshots
        order by domain_key asc
      `;
      return rows.map(mapRow);
    },

    async recordMutation({
      domainKey,
      companyId,
      commandType,
      aggregateType,
      aggregateId,
      commandId = crypto.randomUUID(),
      idempotencyKey = null,
      expectedObjectVersion = null,
      actorId = "system",
      sessionRevision = 1,
      correlationId = crypto.randomUUID(),
      causationId = null,
      commandPayload = {},
      metadata = {},
      domainEventRecords = [],
      outboxMessageRecords = [],
      evidenceRefRecords = [],
      snapshot,
      persistedAt = null,
      durabilityPolicy = null,
      adapterKind = null
    }) {
      const normalizedDomainKey = text(domainKey, "domainKey");
      const normalizedCompanyId = text(companyId, "companyId");
      const normalizedCommandType = text(commandType, "commandType");
      const normalizedAggregateType = text(aggregateType, "aggregateType");
      const normalizedAggregateId = text(aggregateId, "aggregateId");
      const normalizedCommandId = text(commandId, "commandId");
      const normalizedIdempotencyKey =
        optionalText(idempotencyKey, "idempotencyKey")
        || `${normalizedCommandType}:${normalizedCommandId}`;
      const normalizedExpectedObjectVersion = normalizeExpectedObjectVersion(expectedObjectVersion);
      const normalizedActorId = text(actorId, "actorId");
      const normalizedSessionRevision = normalizePositiveInteger(sessionRevision, "sessionRevision");
      const normalizedCorrelationId = text(correlationId, "correlationId");
      const normalizedCausationId = optionalText(causationId, "causationId");
      const normalizedRecordedAt = normalizeTimestamp(persistedAt);
      const normalizedCommandPayload = cloneSnapshotValue(commandPayload ?? {});
      const normalizedMetadata = cloneSnapshotValue(metadata ?? {});
      const clonedDomainEventRecords = cloneSnapshotValue(domainEventRecords ?? []);
      const clonedOutboxMessageRecords = cloneSnapshotValue(outboxMessageRecords ?? []);
      const clonedEvidenceRefRecords = cloneSnapshotValue(evidenceRefRecords ?? []);

      return cloneSnapshotValue(
        await sql.begin(async (tx) => {
          const [existingByCommandRows, existingByIdempotencyRows, existingStateRows] = await Promise.all([
            tx`
              select *
              from critical_domain_command_receipts
              where company_id = ${normalizedCompanyId}
                and command_type = ${normalizedCommandType}
                and command_id = ${normalizedCommandId}
              limit 1
            `,
            tx`
              select *
              from critical_domain_command_receipts
              where company_id = ${normalizedCompanyId}
                and idempotency_key = ${normalizedIdempotencyKey}
              limit 1
            `,
            tx`
              select domain_key, schema_version, snapshot_json, snapshot_hash, persisted_at, object_version, durability_policy, adapter_kind
              from critical_domain_state_snapshots
              where domain_key = ${normalizedDomainKey}
              limit 1
            `
          ]);
          const existingByCommand = mapCommandReceiptRow(existingByCommandRows[0] || null);
          const existingByIdempotency = mapCommandReceiptRow(existingByIdempotencyRows[0] || null);
          const existingRecord = mapRow(existingStateRows[0] || null);

          if (existingByCommand || existingByIdempotency) {
            const existingReceipt = existingByCommand || existingByIdempotency;
            const [domainEventRows, outboxRows, evidenceRows] = await Promise.all([
              tx`
                select *
                from critical_domain_domain_events
                where company_id = ${normalizedCompanyId}
                  and command_receipt_id = ${existingReceipt.commandReceiptId}
                order by recorded_at asc, domain_event_id asc
              `,
              tx`
                select *
                from critical_domain_outbox_messages
                where company_id = ${normalizedCompanyId}
                  and command_receipt_id = ${existingReceipt.commandReceiptId}
                order by recorded_at asc, outbox_message_id asc
              `,
              tx`
                select *
                from critical_domain_evidence_refs
                where company_id = ${normalizedCompanyId}
                  and command_receipt_id = ${existingReceipt.commandReceiptId}
                order by recorded_at asc, evidence_ref_id asc
              `
            ]);
            return {
              duplicate: true,
              stateRecord: existingRecord,
              commandReceipt: existingReceipt,
              domainEvents: domainEventRows.map(mapDomainEventRow),
              outboxMessages: outboxRows.map(mapOutboxMessageRow),
              evidenceRefs: evidenceRows.map(mapEvidenceRefRow)
            };
          }

          const stateRecord = {
            domainKey: normalizedDomainKey,
            schemaVersion: CRITICAL_DOMAIN_STATE_SCHEMA_VERSION,
            snapshot: cloneSnapshotValue(snapshot ?? {}),
            snapshotHash: hashSnapshot(snapshot),
            persistedAt: normalizedRecordedAt,
            objectVersion: existingRecord ? existingRecord.objectVersion + 1 : 1,
            durabilityPolicy: optionalText(durabilityPolicy, "durabilityPolicy"),
            adapterKind: optionalText(adapterKind, "adapterKind")
          };

          if (
            existingRecord
            && normalizedExpectedObjectVersion !== null
            && normalizedExpectedObjectVersion !== existingRecord.objectVersion
          ) {
            throw createConflictError({
              domainKey: normalizedDomainKey,
              expectedObjectVersion: normalizedExpectedObjectVersion,
              actualObjectVersion: existingRecord.objectVersion,
              action: "update"
            });
          }
          if (!existingRecord && ![null, 0].includes(normalizedExpectedObjectVersion)) {
            throw createConflictError({
              domainKey: normalizedDomainKey,
              expectedObjectVersion: normalizedExpectedObjectVersion,
              actualObjectVersion: null,
              action: "create"
            });
          }

          if (!existingRecord) {
            await tx`
              insert into critical_domain_state_snapshots (
                domain_key,
                schema_version,
                snapshot_json,
                snapshot_hash,
                persisted_at,
                object_version,
                durability_policy,
                adapter_kind
              ) values (
                ${stateRecord.domainKey},
                ${stateRecord.schemaVersion},
                ${JSON.stringify(serializeSnapshotValue(stateRecord.snapshot))}::jsonb,
                ${stateRecord.snapshotHash},
                ${stateRecord.persistedAt},
                ${stateRecord.objectVersion},
                ${stateRecord.durabilityPolicy},
                ${stateRecord.adapterKind}
              )
            `;
          } else {
            const updatedRows = await tx`
              update critical_domain_state_snapshots
              set schema_version = ${stateRecord.schemaVersion},
                  snapshot_json = ${JSON.stringify(serializeSnapshotValue(stateRecord.snapshot))}::jsonb,
                  snapshot_hash = ${stateRecord.snapshotHash},
                  persisted_at = ${stateRecord.persistedAt},
                  object_version = ${stateRecord.objectVersion},
                  durability_policy = ${stateRecord.durabilityPolicy},
                  adapter_kind = ${stateRecord.adapterKind}
              where domain_key = ${stateRecord.domainKey}
                and object_version = ${existingRecord.objectVersion}
              returning object_version
            `;
            if (updatedRows.length === 0) {
              const latestRows = await tx`
                select domain_key, schema_version, snapshot_json, snapshot_hash, persisted_at, object_version, durability_policy, adapter_kind
                from critical_domain_state_snapshots
                where domain_key = ${normalizedDomainKey}
                limit 1
              `;
              throw createConflictError({
                domainKey: normalizedDomainKey,
                expectedObjectVersion: existingRecord.objectVersion,
                actualObjectVersion: mapRow(latestRows[0] || null)?.objectVersion ?? null,
                action: "update"
              });
            }
          }

          const receipt = {
            commandReceiptId: crypto.randomUUID(),
            domainKey: normalizedDomainKey,
            companyId: normalizedCompanyId,
            commandType: normalizedCommandType,
            aggregateType: normalizedAggregateType,
            aggregateId: normalizedAggregateId,
            commandId: normalizedCommandId,
            idempotencyKey: normalizedIdempotencyKey,
            expectedObjectVersion: normalizedExpectedObjectVersion,
            resultingObjectVersion: stateRecord.objectVersion,
            actorId: normalizedActorId,
            sessionRevision: normalizedSessionRevision,
            correlationId: normalizedCorrelationId,
            causationId: normalizedCausationId,
            payloadHash: hashPayload(normalizedCommandPayload),
            commandPayload: normalizedCommandPayload,
            metadata: normalizedMetadata,
            status: "accepted",
            recordedAt: normalizedRecordedAt,
            processedAt: normalizedRecordedAt
          };
          await tx`
            insert into critical_domain_command_receipts (
              command_receipt_id,
              domain_key,
              company_id,
              command_type,
              aggregate_type,
              aggregate_id,
              command_id,
              idempotency_key,
              expected_object_version,
              resulting_object_version,
              actor_id,
              session_revision,
              correlation_id,
              causation_id,
              payload_hash,
              command_payload_json,
              metadata_json,
              status,
              recorded_at,
              processed_at
            ) values (
              ${receipt.commandReceiptId},
              ${receipt.domainKey},
              ${receipt.companyId},
              ${receipt.commandType},
              ${receipt.aggregateType},
              ${receipt.aggregateId},
              ${receipt.commandId},
              ${receipt.idempotencyKey},
              ${receipt.expectedObjectVersion},
              ${receipt.resultingObjectVersion},
              ${receipt.actorId},
              ${receipt.sessionRevision},
              ${receipt.correlationId},
              ${receipt.causationId},
              ${receipt.payloadHash},
              ${JSON.stringify(serializeSnapshotValue(receipt.commandPayload))}::jsonb,
              ${JSON.stringify(serializeSnapshotValue(receipt.metadata))}::jsonb,
              ${receipt.status},
              ${receipt.recordedAt},
              ${receipt.processedAt}
            )
          `;

          const recordedDomainEvents = [];
          for (const record of clonedDomainEventRecords) {
            const normalized = {
              domainEventId: record.domainEventId || crypto.randomUUID(),
              domainKey: normalizedDomainKey,
              companyId: normalizedCompanyId,
              aggregateType: text(record.aggregateType || normalizedAggregateType, "aggregateType"),
              aggregateId: text(record.aggregateId || normalizedAggregateId, "aggregateId"),
              commandReceiptId: receipt.commandReceiptId,
              objectVersion: record.objectVersion == null ? stateRecord.objectVersion : Number(record.objectVersion),
              eventType: text(record.eventType, "eventType"),
              payload: cloneSnapshotValue(record.payload ?? {}),
              actorId: text(record.actorId || normalizedActorId, "actorId"),
              correlationId: text(record.correlationId || normalizedCorrelationId, "correlationId"),
              causationId: optionalText(record.causationId, "causationId") || receipt.commandReceiptId,
              status: "recorded",
              recordedAt: normalizeTimestamp(record.recordedAt || normalizedRecordedAt)
            };
            await tx`
              insert into critical_domain_domain_events (
                domain_event_id,
                domain_key,
                company_id,
                aggregate_type,
                aggregate_id,
                command_receipt_id,
                object_version,
                event_type,
                payload_json,
                actor_id,
                correlation_id,
                causation_id,
                status,
                recorded_at
              ) values (
                ${normalized.domainEventId},
                ${normalized.domainKey},
                ${normalized.companyId},
                ${normalized.aggregateType},
                ${normalized.aggregateId},
                ${normalized.commandReceiptId},
                ${normalized.objectVersion},
                ${normalized.eventType},
                ${JSON.stringify(serializeSnapshotValue(normalized.payload))}::jsonb,
                ${normalized.actorId},
                ${normalized.correlationId},
                ${normalized.causationId},
                ${normalized.status},
                ${normalized.recordedAt}
              )
            `;
            recordedDomainEvents.push(normalized);
          }

          const recordedOutboxMessages = [];
          for (const record of clonedOutboxMessageRecords) {
            const normalized = {
              outboxMessageId: record.outboxMessageId || crypto.randomUUID(),
              domainKey: normalizedDomainKey,
              companyId: normalizedCompanyId,
              aggregateType: text(record.aggregateType || normalizedAggregateType, "aggregateType"),
              aggregateId: text(record.aggregateId || normalizedAggregateId, "aggregateId"),
              commandReceiptId: receipt.commandReceiptId,
              eventType: text(record.eventType, "eventType"),
              payload: cloneSnapshotValue(record.payload ?? {}),
              actorId: text(record.actorId || normalizedActorId, "actorId"),
              correlationId: text(record.correlationId || normalizedCorrelationId, "correlationId"),
              causationId: optionalText(record.causationId, "causationId") || receipt.commandReceiptId,
              idempotencyKey: optionalText(record.idempotencyKey, "idempotencyKey"),
              status: "pending",
              recordedAt: normalizeTimestamp(record.recordedAt || normalizedRecordedAt),
              publishedAt: null
            };
            await tx`
              insert into critical_domain_outbox_messages (
                outbox_message_id,
                domain_key,
                company_id,
                aggregate_type,
                aggregate_id,
                command_receipt_id,
                event_type,
                payload_json,
                actor_id,
                correlation_id,
                causation_id,
                idempotency_key,
                status,
                recorded_at,
                published_at
              ) values (
                ${normalized.outboxMessageId},
                ${normalized.domainKey},
                ${normalized.companyId},
                ${normalized.aggregateType},
                ${normalized.aggregateId},
                ${normalized.commandReceiptId},
                ${normalized.eventType},
                ${JSON.stringify(serializeSnapshotValue(normalized.payload))}::jsonb,
                ${normalized.actorId},
                ${normalized.correlationId},
                ${normalized.causationId},
                ${normalized.idempotencyKey},
                ${normalized.status},
                ${normalized.recordedAt},
                ${normalized.publishedAt}
              )
            `;
            recordedOutboxMessages.push(normalized);
          }

          const recordedEvidenceRefs = [];
          for (const record of clonedEvidenceRefRecords) {
            const normalized = {
              evidenceRefId: record.evidenceRefId || crypto.randomUUID(),
              domainKey: normalizedDomainKey,
              companyId: normalizedCompanyId,
              aggregateType: text(record.aggregateType || normalizedAggregateType, "aggregateType"),
              aggregateId: text(record.aggregateId || normalizedAggregateId, "aggregateId"),
              commandReceiptId: receipt.commandReceiptId,
              domainEventId: optionalText(record.domainEventId, "domainEventId"),
              evidenceRefType: text(record.evidenceRefType, "evidenceRefType"),
              evidenceRef: text(record.evidenceRef, "evidenceRef"),
              metadata: cloneSnapshotValue(record.metadata ?? {}),
              actorId: optionalText(record.actorId || normalizedActorId, "actorId"),
              correlationId: optionalText(record.correlationId || normalizedCorrelationId, "correlationId"),
              causationId: optionalText(record.causationId, "causationId") || receipt.commandReceiptId,
              status: "recorded",
              recordedAt: normalizeTimestamp(record.recordedAt || normalizedRecordedAt)
            };
            await tx`
              insert into critical_domain_evidence_refs (
                evidence_ref_id,
                domain_key,
                company_id,
                aggregate_type,
                aggregate_id,
                command_receipt_id,
                domain_event_id,
                evidence_ref_type,
                evidence_ref,
                metadata_json,
                actor_id,
                correlation_id,
                causation_id,
                status,
                recorded_at
              ) values (
                ${normalized.evidenceRefId},
                ${normalized.domainKey},
                ${normalized.companyId},
                ${normalized.aggregateType},
                ${normalized.aggregateId},
                ${normalized.commandReceiptId},
                ${normalized.domainEventId},
                ${normalized.evidenceRefType},
                ${normalized.evidenceRef},
                ${JSON.stringify(serializeSnapshotValue(normalized.metadata))}::jsonb,
                ${normalized.actorId},
                ${normalized.correlationId},
                ${normalized.causationId},
                ${normalized.status},
                ${normalized.recordedAt}
              )
            `;
            recordedEvidenceRefs.push(normalized);
          }

          return {
            duplicate: false,
            stateRecord,
            commandReceipt: receipt,
            domainEvents: recordedDomainEvents,
            outboxMessages: recordedOutboxMessages,
            evidenceRefs: recordedEvidenceRefs
          };
        })
      );
    },

    async listCommandReceipts({ domainKey = null, companyId = null } = {}) {
      const rows = await sql`
        select *
        from critical_domain_command_receipts
        where (${domainKey == null} or domain_key = ${domainKey == null ? null : text(domainKey, "domainKey")})
          and (${companyId == null} or company_id = ${companyId == null ? null : text(companyId, "companyId")})
        order by recorded_at asc, command_receipt_id asc
      `;
      return rows.map(mapCommandReceiptRow);
    },

    async listDomainEvents({ domainKey = null, companyId = null, commandReceiptId = null } = {}) {
      const rows = await sql`
        select *
        from critical_domain_domain_events
        where (${domainKey == null} or domain_key = ${domainKey == null ? null : text(domainKey, "domainKey")})
          and (${companyId == null} or company_id = ${companyId == null ? null : text(companyId, "companyId")})
          and (${commandReceiptId == null} or command_receipt_id = ${commandReceiptId == null ? null : text(commandReceiptId, "commandReceiptId")})
        order by recorded_at asc, domain_event_id asc
      `;
      return rows.map(mapDomainEventRow);
    },

    async listOutboxMessages({ domainKey = null, companyId = null, commandReceiptId = null } = {}) {
      const rows = await sql`
        select *
        from critical_domain_outbox_messages
        where (${domainKey == null} or domain_key = ${domainKey == null ? null : text(domainKey, "domainKey")})
          and (${companyId == null} or company_id = ${companyId == null ? null : text(companyId, "companyId")})
          and (${commandReceiptId == null} or command_receipt_id = ${commandReceiptId == null ? null : text(commandReceiptId, "commandReceiptId")})
        order by recorded_at asc, outbox_message_id asc
      `;
      return rows.map(mapOutboxMessageRow);
    },

    async listEvidenceRefs({ domainKey = null, companyId = null, commandReceiptId = null } = {}) {
      const rows = await sql`
        select *
        from critical_domain_evidence_refs
        where (${domainKey == null} or domain_key = ${domainKey == null ? null : text(domainKey, "domainKey")})
          and (${companyId == null} or company_id = ${companyId == null ? null : text(companyId, "companyId")})
          and (${commandReceiptId == null} or command_receipt_id = ${commandReceiptId == null ? null : text(commandReceiptId, "commandReceiptId")})
        order by recorded_at asc, evidence_ref_id asc
      `;
      return rows.map(mapEvidenceRefRow);
    },

    async verifySchemaContract() {
      if (!schemaContractVerification) {
        schemaContractVerification = verifyPostgresCriticalDomainStateStoreSchemaContract(sql)
          .catch((error) => {
            schemaContractVerification = null;
            throw error;
          });
      }
      return schemaContractVerification;
    },

    close() {
      return ownsClient && typeof sql?.end === "function" ? sql.end({ timeout: 0 }) : undefined;
    }
  };
}
