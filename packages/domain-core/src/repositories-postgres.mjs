import { createRequire } from "node:module";
import {
  CORE_CANONICAL_REPOSITORY_TABLE,
  CanonicalRepositoryConflictError
} from "./repositories.mjs";

const require = createRequire(import.meta.url);

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function text(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${fieldName} is required.`);
  }
  return value.trim();
}

function normalizeTimestamp(value) {
  const candidate = value == null ? new Date() : value;
  const date = candidate instanceof Date ? candidate : new Date(candidate);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("recordedAt must be a valid timestamp.");
  }
  return date.toISOString();
}

function jsonValue(value) {
  if (value == null) {
    return null;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return clone(value);
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

function mapRow(row, tableName) {
  if (!row) {
    return null;
  }
  return {
    tableName,
    boundedContextCode: row.bounded_context_code,
    objectType: row.object_type,
    companyId: row.company_id,
    objectId: row.object_id,
    status: row.status,
    payload: jsonValue(row.payload_json) || {},
    objectVersion: Number(row.object_version),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastActorId: row.last_actor_id,
    lastCorrelationId: row.last_correlation_id
  };
}

function loadPostgresClient() {
  try {
    const postgresModule = require("postgres");
    return postgresModule?.default || postgresModule;
  } catch (error) {
    const message = typeof error?.message === "string" ? error.message : "unknown_error";
    throw new Error(`Postgres client package could not be loaded for canonical repositories: ${message}`);
  }
}

function escapeIdentifier(name) {
  const normalized = text(name, "tableName");
  if (!/^[a-z_][a-z0-9_]*$/u.test(normalized)) {
    throw new TypeError(`Unsafe SQL identifier: ${normalized}`);
  }
  return `"${normalized}"`;
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

async function fetchRow(tx, tableName, { boundedContextCode, objectType, companyId, objectId }) {
  const tableIdentifier = tx.unsafe(escapeIdentifier(tableName));
  const rows = await tx`
    select *
    from ${tableIdentifier}
    where bounded_context_code = ${boundedContextCode}
      and object_type = ${objectType}
      and company_id = ${companyId}
      and object_id = ${objectId}
    limit 1
  `;
  return rows[0] || null;
}

function createPostgresTransaction(tx) {
  return {
    kind: "postgres_canonical_repository_transaction",

    async getRecord({ tableName = CORE_CANONICAL_REPOSITORY_TABLE, boundedContextCode = "core", objectType, companyId, objectId }) {
      const row = await fetchRow(tx, tableName, {
        boundedContextCode: text(boundedContextCode, "boundedContextCode"),
        objectType: text(objectType, "objectType"),
        companyId: text(companyId, "companyId"),
        objectId: text(objectId, "objectId")
      });
      return mapRow(row, tableName);
    },

    async listRecords({ tableName = CORE_CANONICAL_REPOSITORY_TABLE, boundedContextCode = "core", objectType, companyId }) {
      const tableIdentifier = tx.unsafe(escapeIdentifier(tableName));
      const rows = await tx`
        select *
        from ${tableIdentifier}
        where bounded_context_code = ${text(boundedContextCode, "boundedContextCode")}
          and object_type = ${text(objectType, "objectType")}
          and company_id = ${text(companyId, "companyId")}
        order by updated_at asc, object_id asc
      `;
      return rows.map((row) => mapRow(row, tableName));
    },

    async saveRecord({
      tableName = CORE_CANONICAL_REPOSITORY_TABLE,
      boundedContextCode = "core",
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
      const normalized = {
        tableName,
        boundedContextCode: text(boundedContextCode, "boundedContextCode"),
        objectType: text(objectType, "objectType"),
        companyId: text(companyId, "companyId"),
        objectId: text(objectId, "objectId"),
        actorId: actorId == null ? null : text(actorId, "actorId"),
        correlationId: correlationId == null ? null : text(correlationId, "correlationId"),
        recordedAt: normalizeTimestamp(recordedAt),
        payload: clone(payload ?? {})
      };
      normalized.status = normalizeStatus(status, normalized.payload);

      const existing = await fetchRow(tx, normalized.tableName, normalized);
      const tableIdentifier = tx.unsafe(escapeIdentifier(normalized.tableName));
      if (!existing) {
        if (![null, 0].includes(expectedObjectVersion)) {
          throw createConflictError({
            ...normalized,
            expectedObjectVersion,
            actualObjectVersion: null,
            action: "create"
          });
        }
        const rows = await tx`
          insert into ${tableIdentifier} (
            bounded_context_code,
            object_type,
            company_id,
            object_id,
            status,
            payload_json,
            object_version,
            last_actor_id,
            last_correlation_id,
            created_at,
            updated_at
          ) values (
            ${normalized.boundedContextCode},
            ${normalized.objectType},
            ${normalized.companyId},
            ${normalized.objectId},
            ${normalized.status},
            ${JSON.stringify(normalized.payload)}::jsonb,
            1,
            ${normalized.actorId},
            ${normalized.correlationId},
            ${normalized.recordedAt},
            ${normalized.recordedAt}
          )
          returning *
        `;
        return mapRow(rows[0], normalized.tableName);
      }

      if (expectedObjectVersion == null || Number(expectedObjectVersion) !== Number(existing.object_version)) {
        throw createConflictError({
          ...normalized,
          expectedObjectVersion,
          actualObjectVersion: existing.object_version,
          action: "update"
        });
      }

      const rows = await tx`
        update ${tableIdentifier}
        set status = ${normalized.status},
            payload_json = ${JSON.stringify(normalized.payload)}::jsonb,
            object_version = object_version + 1,
            last_actor_id = ${normalized.actorId},
            last_correlation_id = ${normalized.correlationId},
            updated_at = ${normalized.recordedAt}
        where bounded_context_code = ${normalized.boundedContextCode}
          and object_type = ${normalized.objectType}
          and company_id = ${normalized.companyId}
          and object_id = ${normalized.objectId}
          and object_version = ${Number(expectedObjectVersion)}
        returning *
      `;
      if (rows.length === 0) {
        throw createConflictError({
          ...normalized,
          expectedObjectVersion,
          actualObjectVersion: null,
          action: "update"
        });
      }
      return mapRow(rows[0], normalized.tableName);
    },

    async deleteRecord({ tableName = CORE_CANONICAL_REPOSITORY_TABLE, boundedContextCode = "core", objectType, companyId, objectId, expectedObjectVersion }) {
      const normalized = {
        tableName,
        boundedContextCode: text(boundedContextCode, "boundedContextCode"),
        objectType: text(objectType, "objectType"),
        companyId: text(companyId, "companyId"),
        objectId: text(objectId, "objectId")
      };
      const existing = await fetchRow(tx, normalized.tableName, normalized);
      if (!existing || expectedObjectVersion == null || Number(expectedObjectVersion) !== Number(existing.object_version)) {
        throw createConflictError({
          ...normalized,
          expectedObjectVersion,
          actualObjectVersion: existing?.object_version ?? null,
          action: "delete"
        });
      }
      const tableIdentifier = tx.unsafe(escapeIdentifier(normalized.tableName));
      await tx`
        delete from ${tableIdentifier}
        where bounded_context_code = ${normalized.boundedContextCode}
          and object_type = ${normalized.objectType}
          and company_id = ${normalized.companyId}
          and object_id = ${normalized.objectId}
          and object_version = ${Number(expectedObjectVersion)}
      `;
      return mapRow(existing, normalized.tableName);
    }
  };
}

export function resolveCanonicalRepositoryConnectionString({
  connectionString = null,
  env = process.env
} = {}) {
  if (connectionString) {
    return connectionString;
  }
  if (env.CANONICAL_REPOSITORY_URL) {
    return env.CANONICAL_REPOSITORY_URL;
  }
  if (env.POSTGRES_URL) {
    return env.POSTGRES_URL;
  }
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }
  if (!env.POSTGRES_HOST) {
    return null;
  }
  const missingKeys = ["POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB"].filter((key) => !env[key]);
  if (missingKeys.length > 0) {
    throw new Error(`Missing Postgres environment variables for canonical repositories: ${missingKeys.join(", ")}.`);
  }
  const user = env.POSTGRES_USER;
  const password = env.POSTGRES_PASSWORD;
  const host = env.POSTGRES_HOST;
  const port = env.POSTGRES_PORT || "5432";
  const database = env.POSTGRES_DB;
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

export function createPostgresCanonicalRepositoryStore({
  connectionString = null,
  env = process.env,
  max = 5,
  idleTimeout = 20,
  connectTimeout = 10
} = {}) {
  const resolvedConnectionString = resolveCanonicalRepositoryConnectionString({ connectionString, env });
  if (!resolvedConnectionString) {
    throw new Error("Postgres connection information is required for canonical repositories.");
  }
  const postgres = loadPostgresClient();
  const sql = postgres(resolvedConnectionString, {
    max,
    idle_timeout: idleTimeout,
    connect_timeout: connectTimeout,
    prepare: false,
    onnotice: () => {}
  });

  return {
    kind: "postgres_canonical_repository_store",

    async close() {
      await sql.end({ timeout: 5 });
    },

    async withTransaction(work) {
      return sql.begin((tx) => work(createPostgresTransaction(tx)));
    }
  };
}
