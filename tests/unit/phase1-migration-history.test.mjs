import test from "node:test";
import assert from "node:assert/strict";
import { listFiles, readText } from "../../scripts/lib/repo.mjs";

test("all migrations use canonical schema_migrations format", async () => {
  const migrationFiles = await listFiles("packages/db/migrations", [".sql"]);

  for (const file of migrationFiles) {
    const sql = await readText(file);

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
  }
});
