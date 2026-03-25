import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { exists } from "../../scripts/lib/repo.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..", "..");

function repoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

test("non-UI readiness scripts exist for late build-sequence verification", async () => {
  for (const relativePath of [
    "scripts/verify-step47-external-surface.ps1",
    "scripts/verify-step48-golden-scenarios.ps1",
    "scripts/run-pilot-parallel-runs.ps1",
    "scripts/verify-final-non-ui-readiness.ps1"
  ]) {
    assert.equal(await exists(relativePath), true, `${relativePath} should exist`);
  }
});

test("final non-UI readiness script chains late-step verification in the right order", async () => {
  const source = await readFile(repoPath("scripts", "verify-final-non-ui-readiness.ps1"), "utf8");

  for (const expectedCall of [
    "node scripts/lint.mjs",
    "node scripts/typecheck.mjs",
    "node scripts/build.mjs",
    "node scripts/security-scan.mjs",
    "verify-step47-external-surface.ps1",
    "verify-step48-golden-scenarios.ps1",
    "verify-checkpoint-v1.ps1",
    "verify-checkpoint-v2.ps1",
    "verify-checkpoint-v3.ps1",
    "verify-checkpoint-v4.ps1",
    "verify-checkpoint-v5.ps1",
    "verify-checkpoint-v7.ps1",
    "run-pilot-parallel-runs.ps1"
  ]) {
    assert.match(source, new RegExp(expectedCall.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "u"));
  }
});
