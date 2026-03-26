import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMigrationHistoryRepairPlan,
  classifyMigrationHistoryShape
} from "../../scripts/lib/migration-history.mjs";

test("canonical schema_migrations shape requires no repair", () => {
  const shape = classifyMigrationHistoryShape(["migration_id", "applied_at"]);
  assert.equal(shape.isCanonical, true);
  assert.equal(shape.needsRepair, false);

  const plan = buildMigrationHistoryRepairPlan({
    columns: ["migration_id", "applied_at"]
  });
  assert.equal(plan.status, "canonical");
  assert.equal(plan.sql, null);
});

test("legacy version/description schema_migrations shape gets canonical repair SQL", () => {
  const plan = buildMigrationHistoryRepairPlan({
    columns: ["version", "description"],
    backupTableName: "schema_migrations_legacy_test"
  });

  assert.equal(plan.status, "repair_required");
  assert.match(plan.sql, /ALTER TABLE schema_migrations RENAME TO schema_migrations_legacy_test;/u);
  assert.match(plan.sql, /version::text/u);
  assert.match(plan.sql, /CREATE TABLE schema_migrations/u);
  assert.deepEqual(plan.findings, [
    "missing canonical column migration_id",
    "missing canonical column applied_at",
    "unexpected legacy column version",
    "unexpected legacy column description"
  ]);
});

test("mixed schema_migrations shape preserves canonical migration_id during repair", () => {
  const plan = buildMigrationHistoryRepairPlan({
    columns: ["migration_id", "description", "applied_at"],
    backupTableName: "schema_migrations_legacy_mixed"
  });

  assert.equal(plan.status, "repair_required");
  assert.match(plan.sql, /NULLIF\(TRIM\(migration_id\), ''\)/u);
  assert.doesNotMatch(plan.sql, /version::text/u);
  assert.deepEqual(plan.findings, ["unexpected legacy column description"]);
});

test("repair plan rejects unsupported schema_migrations shapes", () => {
  assert.throws(
    () => buildMigrationHistoryRepairPlan({ columns: ["description"] }),
    /not repairable automatically/u
  );
});

test("repair plan rejects invalid backup table names", () => {
  assert.throws(
    () =>
      buildMigrationHistoryRepairPlan({
        columns: ["version"],
        backupTableName: "schema-migrations-invalid"
      }),
    /Invalid backup table name/u
  );
});
