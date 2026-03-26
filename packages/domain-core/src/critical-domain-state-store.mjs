import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export const CRITICAL_DOMAIN_STATE_TABLE = "critical_domain_state_snapshots";
export const CRITICAL_DOMAIN_STATE_SCHEMA_VERSION = 1;

function text(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${fieldName} is required.`);
  }
  return value.trim();
}

function normalizeTimestamp(value = null) {
  const candidate = value == null ? new Date() : new Date(value);
  if (Number.isNaN(candidate.getTime())) {
    throw new TypeError("persistedAt must be a valid timestamp.");
  }
  return candidate.toISOString();
}

function hashSnapshot(snapshot) {
  return crypto.createHash("sha256").update(JSON.stringify(snapshot ?? null)).digest("hex");
}

export function createInMemoryCriticalDomainStateStore() {
  const records = new Map();

  return {
    kind: "memory_critical_domain_state_store",

    load(domainKey) {
      const record = records.get(text(domainKey, "domainKey")) || null;
      return record ? JSON.parse(JSON.stringify(record)) : null;
    },

    save({ domainKey, snapshot, persistedAt = null }) {
      const normalizedDomainKey = text(domainKey, "domainKey");
      const record = {
        domainKey: normalizedDomainKey,
        schemaVersion: CRITICAL_DOMAIN_STATE_SCHEMA_VERSION,
        snapshot: JSON.parse(JSON.stringify(snapshot ?? {})),
        snapshotHash: hashSnapshot(snapshot),
        persistedAt: normalizeTimestamp(persistedAt)
      };
      records.set(normalizedDomainKey, record);
      return JSON.parse(JSON.stringify(record));
    },

    list() {
      return [...records.values()].map((record) => JSON.parse(JSON.stringify(record)));
    },

    close() {}
  };
}

function ensureDatabaseDirectory(filePath) {
  if (filePath === ":memory:") {
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function mapRow(row) {
  if (!row) {
    return null;
  }
  return {
    domainKey: row.domain_key,
    schemaVersion: Number(row.schema_version),
    snapshot: row.snapshot_json ? JSON.parse(row.snapshot_json) : {},
    snapshotHash: row.snapshot_hash,
    persistedAt: row.persisted_at
  };
}

export function createSqliteCriticalDomainStateStore({ filePath }) {
  const resolvedFilePath = text(filePath, "filePath");
  ensureDatabaseDirectory(resolvedFilePath);
  const db = new DatabaseSync(resolvedFilePath);
  db.exec(`
    create table if not exists ${CRITICAL_DOMAIN_STATE_TABLE} (
      domain_key text primary key,
      schema_version integer not null,
      snapshot_json text not null,
      snapshot_hash text not null,
      persisted_at text not null
    );
  `);
  const selectStatement = db.prepare(`
    select domain_key, schema_version, snapshot_json, snapshot_hash, persisted_at
    from ${CRITICAL_DOMAIN_STATE_TABLE}
    where domain_key = ?
  `);
  const upsertStatement = db.prepare(`
    insert into ${CRITICAL_DOMAIN_STATE_TABLE} (
      domain_key,
      schema_version,
      snapshot_json,
      snapshot_hash,
      persisted_at
    ) values (?, ?, ?, ?, ?)
    on conflict(domain_key) do update set
      schema_version = excluded.schema_version,
      snapshot_json = excluded.snapshot_json,
      snapshot_hash = excluded.snapshot_hash,
      persisted_at = excluded.persisted_at
  `);
  const listStatement = db.prepare(`
    select domain_key, schema_version, snapshot_json, snapshot_hash, persisted_at
    from ${CRITICAL_DOMAIN_STATE_TABLE}
    order by domain_key asc
  `);

  return {
    kind: "sqlite_critical_domain_state_store",
    filePath: resolvedFilePath,

    load(domainKey) {
      return mapRow(selectStatement.get(text(domainKey, "domainKey")));
    },

    save({ domainKey, snapshot, persistedAt = null }) {
      const record = {
        domainKey: text(domainKey, "domainKey"),
        schemaVersion: CRITICAL_DOMAIN_STATE_SCHEMA_VERSION,
        snapshot: JSON.parse(JSON.stringify(snapshot ?? {})),
        snapshotHash: hashSnapshot(snapshot),
        persistedAt: normalizeTimestamp(persistedAt)
      };
      upsertStatement.run(
        record.domainKey,
        record.schemaVersion,
        JSON.stringify(record.snapshot),
        record.snapshotHash,
        record.persistedAt
      );
      return record;
    },

    list() {
      return listStatement.all().map(mapRow);
    },

    close() {
      db.close();
    }
  };
}
