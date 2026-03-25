import test from "node:test";
import assert from "node:assert/strict";
import { exists, listFiles, mandatoryDocs, requiredApps, requiredPackages } from "../../scripts/lib/repo.mjs";

test("repo contains required Phase 0 structure and excludes split desktop apps", async () => {
  for (const relativePath of [...requiredApps, ...requiredPackages, ...mandatoryDocs]) {
    assert.equal(await exists(relativePath), true, `${relativePath} should exist`);
  }
  assert.equal(await exists("apps/simple-web"), false);
  assert.equal(await exists("apps/pro-web"), false);
});

test("repo file walker excludes dependencies and junctioned package trees", async () => {
  const packageFiles = await listFiles("packages");
  assert.equal(packageFiles.some((file) => file.includes("/node_modules/")), false);
  assert.equal(packageFiles.some((file) => file.startsWith("packages/domain-core/node_modules")), false);
});
