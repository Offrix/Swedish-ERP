const CANONICAL_COLUMNS = Object.freeze(["migration_id", "applied_at"]);
const BACKUP_TABLE_NAME_PATTERN = /^[a-z][a-z0-9_]*$/u;

function normalizeColumnName(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function unique(values) {
  return [...new Set(values)];
}

function validateBackupTableName(backupTableName) {
  if (!BACKUP_TABLE_NAME_PATTERN.test(backupTableName)) {
    throw new Error(
      `Invalid backup table name "${backupTableName}". Use lowercase letters, numbers and underscores only.`
    );
  }
}

function buildMigrationIdExpression(shape) {
  if (shape.columns.includes("migration_id")) {
    return "NULLIF(TRIM(migration_id), '')";
  }

  if (shape.columns.includes("version")) {
    return "NULLIF(TRIM(version::text), '')";
  }

  return null;
}

function buildAppliedAtExpression(shape) {
  if (shape.columns.includes("applied_at")) {
    return "COALESCE(applied_at, NOW())";
  }

  return "NOW()";
}

export function classifyMigrationHistoryShape(columns) {
  const normalizedColumns = unique(columns.map(normalizeColumnName).filter(Boolean));
  const extraColumns = normalizedColumns.filter((column) => !CANONICAL_COLUMNS.includes(column));
  const missingColumns = CANONICAL_COLUMNS.filter((column) => !normalizedColumns.includes(column));
  const repairable =
    normalizedColumns.includes("migration_id") || normalizedColumns.includes("version");

  return Object.freeze({
    columns: Object.freeze(normalizedColumns),
    missingColumns: Object.freeze(missingColumns),
    extraColumns: Object.freeze(extraColumns),
    isCanonical: missingColumns.length === 0 && extraColumns.length === 0,
    needsRepair: missingColumns.length > 0 || extraColumns.length > 0,
    repairable
  });
}

export function buildMigrationHistoryRepairPlan({
  columns,
  backupTableName = "schema_migrations_legacy_pre_repair"
}) {
  validateBackupTableName(backupTableName);

  const shape = classifyMigrationHistoryShape(columns);

  if (shape.columns.length === 0) {
    throw new Error("schema_migrations table was not found or returned no columns.");
  }

  if (shape.isCanonical) {
    return Object.freeze({
      status: "canonical",
      backupTableName: null,
      findings: Object.freeze(["schema_migrations already uses canonical migration_id/applied_at columns."]),
      sql: null,
      shape
    });
  }

  if (!shape.repairable) {
    throw new Error(
      `schema_migrations is not repairable automatically. Missing migration id source in columns: ${shape.columns.join(", ")}.`
    );
  }

  const migrationIdExpression = buildMigrationIdExpression(shape);
  const appliedAtExpression = buildAppliedAtExpression(shape);
  const findings = [
    ...shape.missingColumns.map((column) => `missing canonical column ${column}`),
    ...shape.extraColumns.map((column) => `unexpected legacy column ${column}`)
  ];

  const sql = [
    "BEGIN;",
    `ALTER TABLE schema_migrations RENAME TO ${backupTableName};`,
    "CREATE TABLE schema_migrations (",
    "  migration_id TEXT PRIMARY KEY,",
    "  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
    ");",
    "INSERT INTO schema_migrations (migration_id, applied_at)",
    "SELECT migration_id, MIN(applied_at) AS applied_at",
    "FROM (",
    `  SELECT ${migrationIdExpression} AS migration_id, ${appliedAtExpression} AS applied_at`,
    `  FROM ${backupTableName}`,
    ") normalized",
    "WHERE migration_id IS NOT NULL",
    "GROUP BY migration_id",
    "ORDER BY migration_id;",
    "COMMIT;"
  ].join("\n");

  return Object.freeze({
    status: "repair_required",
    backupTableName,
    findings: Object.freeze(findings),
    sql,
    shape
  });
}
