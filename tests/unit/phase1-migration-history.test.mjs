import test from "node:test";
import assert from "node:assert/strict";
import { listFiles, readText } from "../../scripts/lib/repo.mjs";

test("all migrations use canonical schema_migrations format", async () => {
  const migrationFiles = await listFiles("packages/db/migrations", [".sql"]);
  const migrationIds = new Set();

  for (const file of migrationFiles) {
    const sql = await readText(file);
    const expectedMigrationId = file.split("/").at(-1).replace(/\.sql$/u, "");
    const migrationIdMatches = [...sql.matchAll(
      /INSERT\s+INTO\s+schema_migrations\s*\(\s*migration_id\s*\)\s*VALUES\s*\(\s*'([^']+)'\s*\)/giu
    )].map((match) => match[1]);

    assert.doesNotMatch(
      sql,
      /schema_migrations\s*\(\s*version\s*,\s*description\s*\)/iu,
      `${file} uses legacy schema_migrations(version, description) columns`
    );
    assert.doesNotMatch(
      sql,
      /ON\s+CONFLICT\s*\(\s*version\s*\)/iu,
      `${file} uses legacy ON CONFLICT(version) key`
    );

    if (/INSERT\s+INTO\s+schema_migrations/iu.test(sql)) {
      assert.match(
        sql,
        /INSERT\s+INTO\s+schema_migrations\s*\(\s*migration_id\s*\)/iu,
        `${file} must insert into schema_migrations using the canonical migration_id column`
      );
    }

    assert.equal(
      migrationIdMatches.length,
      1,
      `${file} must register itself exactly once in schema_migrations`
    );
    assert.equal(
      migrationIdMatches[0],
      expectedMigrationId,
      `${file} must register itself using migration_id ${expectedMigrationId}`
    );
    assert.equal(
      migrationIds.has(migrationIdMatches[0]),
      false,
      `${file} reuses migration_id ${migrationIdMatches[0]}`
    );
    migrationIds.add(migrationIdMatches[0]);
  }
});
