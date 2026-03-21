import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { repoPath } from "../../scripts/lib/repo.mjs";

test("golden rule-pack fixture carries mandatory metadata", async () => {
  const fixture = JSON.parse(await fs.readFile(repoPath("packages", "test-fixtures", "golden", "rule-pack.sample.json"), "utf8"));
  for (const field of [
    "rule_pack_id",
    "domain",
    "jurisdiction",
    "effective_from",
    "version",
    "checksum",
    "source_snapshot_date",
    "semantic_change_summary",
    "machine_readable_rules",
    "human_readable_explanation",
    "test_vectors",
    "migration_notes"
  ]) {
    assert.ok(field in fixture, `missing ${field}`);
  }
});
