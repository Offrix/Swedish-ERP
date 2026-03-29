import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  cloneSnapshotValue,
  deserializeSnapshotValue,
  serializeSnapshotValue
} from "./clone.mjs";

export const CRITICAL_DOMAIN_STATE_TABLE = "critical_domain_state_snapshots";
export const CRITICAL_DOMAIN_STATE_SCHEMA_VERSION = 1;

export class CriticalDomainStateConflictError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "CriticalDomainStateConflictError";
    this.code = "critical_domain_state_conflict";
    this.details = cloneSnapshotValue(details);
  }
}

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
  return crypto.createHash("sha256").update(JSON.stringify(serializeSnapshotValue(snapshot ?? null))).digest("hex");
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

function optionalText(value, fieldName) {
  if (value == null) {
    return null;
  }
  return text(value, fieldName);
}

function createConflictError({ domainKey, expectedObjectVersion, actualObjectVersion, action }) {
  return new CriticalDomainStateConflictError("Critical domain state optimistic concurrency check failed.", {
    domainKey,
    expectedObjectVersion,
    actualObjectVersion,
    action
  });
}

export function createInMemoryCriticalDomainStateStore() {
  const records = new Map();

  return {
    kind: "memory_critical_domain_state_store",

    load(domainKey) {
      const record = records.get(text(domainKey, "domainKey")) || null;
      return record ? cloneSnapshotValue(record) : null;
    },

    save({
      domainKey,
      snapshot,
      expectedObjectVersion = null,
      persistedAt = null,
      durabilityPolicy = null,
      adapterKind = null
    }) {
      const normalizedDomainKey = text(domainKey, "domainKey");
      const normalizedExpectedObjectVersion = normalizeExpectedObjectVersion(expectedObjectVersion);
      const existingRecord = records.get(normalizedDomainKey) || null;
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
      const record = {
        domainKey: normalizedDomainKey,
        schemaVersion: CRITICAL_DOMAIN_STATE_SCHEMA_VERSION,
        snapshot: cloneSnapshotValue(snapshot ?? {}),
        snapshotHash: hashSnapshot(snapshot),
        persistedAt: normalizeTimestamp(persistedAt),
        objectVersion: existingRecord ? existingRecord.objectVersion + 1 : 1,
        durabilityPolicy: optionalText(durabilityPolicy, "durabilityPolicy"),
        adapterKind: optionalText(adapterKind, "adapterKind")
      };
      records.set(normalizedDomainKey, record);
      return cloneSnapshotValue(record);
    },

    list() {
      return [...records.values()].map((record) => cloneSnapshotValue(record));
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
    snapshot: row.snapshot_json ? deserializeSnapshotValue(JSON.parse(row.snapshot_json)) : {},
    snapshotHash: row.snapshot_hash,
    persistedAt: row.persisted_at,
    objectVersion: normalizeObjectVersion(row.object_version),
    durabilityPolicy: row.durability_policy,
    adapterKind: row.adapter_kind
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
      persisted_at text not null,
      object_version integer not null default 1,
      durability_policy text,
      adapter_kind text
    );
  `);
  const tableInfo = db.prepare(`pragma table_info(${CRITICAL_DOMAIN_STATE_TABLE})`).all();
  const columnNames = new Set(tableInfo.map((row) => row.name));
  if (!columnNames.has("object_version")) {
    db.exec(`alter table ${CRITICAL_DOMAIN_STATE_TABLE} add column object_version integer not null default 1;`);
  }
  if (!columnNames.has("durability_policy")) {
    db.exec(`alter table ${CRITICAL_DOMAIN_STATE_TABLE} add column durability_policy text;`);
  }
  if (!columnNames.has("adapter_kind")) {
    db.exec(`alter table ${CRITICAL_DOMAIN_STATE_TABLE} add column adapter_kind text;`);
  }
  const selectStatement = db.prepare(`
    select domain_key, schema_version, snapshot_json, snapshot_hash, persisted_at, object_version, durability_policy, adapter_kind
    from ${CRITICAL_DOMAIN_STATE_TABLE}
    where domain_key = ?
  `);
  const insertStatement = db.prepare(`
    insert into ${CRITICAL_DOMAIN_STATE_TABLE} (
      domain_key,
      schema_version,
      snapshot_json,
      snapshot_hash,
      persisted_at,
      object_version,
      durability_policy,
      adapter_kind
    ) values (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateStatement = db.prepare(`
    update ${CRITICAL_DOMAIN_STATE_TABLE}
    set schema_version = ?,
        snapshot_json = ?,
        snapshot_hash = ?,
        persisted_at = ?,
        object_version = ?,
        durability_policy = ?,
        adapter_kind = ?
    where domain_key = ?
      and object_version = ?
  `);
  const listStatement = db.prepare(`
    select domain_key, schema_version, snapshot_json, snapshot_hash, persisted_at, object_version, durability_policy, adapter_kind
    from ${CRITICAL_DOMAIN_STATE_TABLE}
    order by domain_key asc
  `);

  return {
    kind: "sqlite_critical_domain_state_store",
    filePath: resolvedFilePath,

    load(domainKey) {
      return mapRow(selectStatement.get(text(domainKey, "domainKey")));
    },

    save({
      domainKey,
      snapshot,
      expectedObjectVersion = null,
      persistedAt = null,
      durabilityPolicy = null,
      adapterKind = null
    }) {
      const normalizedDomainKey = text(domainKey, "domainKey");
      const normalizedExpectedObjectVersion = normalizeExpectedObjectVersion(expectedObjectVersion);
      const existingRecord = mapRow(selectStatement.get(normalizedDomainKey));
      const record = {
        domainKey: normalizedDomainKey,
        schemaVersion: CRITICAL_DOMAIN_STATE_SCHEMA_VERSION,
        snapshot: cloneSnapshotValue(snapshot ?? {}),
        snapshotHash: hashSnapshot(snapshot),
        persistedAt: normalizeTimestamp(persistedAt),
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
        insertStatement.run(
          record.domainKey,
          record.schemaVersion,
          JSON.stringify(serializeSnapshotValue(record.snapshot)),
          record.snapshotHash,
          record.persistedAt,
          record.objectVersion,
          record.durabilityPolicy,
          record.adapterKind
        );
        return record;
      }
      const result = updateStatement.run(
        record.schemaVersion,
        JSON.stringify(serializeSnapshotValue(record.snapshot)),
        record.snapshotHash,
        record.persistedAt,
        record.objectVersion,
        record.durabilityPolicy,
        record.adapterKind,
        record.domainKey,
        existingRecord.objectVersion
      );
      if (Number(result.changes) !== 1) {
        throw createConflictError({
          domainKey: normalizedDomainKey,
          expectedObjectVersion: existingRecord.objectVersion,
          actualObjectVersion: mapRow(selectStatement.get(normalizedDomainKey))?.objectVersion ?? null,
          action: "update"
        });
      }
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
