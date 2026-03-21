import test from "node:test";
import assert from "node:assert/strict";
import { readJson, readText } from "../../scripts/lib/repo.mjs";

test("runtime versions stay aligned across root config and ADR", async () => {
  const packageJson = await readJson("package.json");
  const versions = packageJson.config.runtimeVersions;
  const adrRuntime = await readText("docs/adr/ADR-0001-runtime-versions.md");

  assert.equal((await readText(".nvmrc")).trim(), versions.node);
  assert.equal((await readText(".python-version")).trim(), versions.python);
  assert.match(await readText("infra/docker/docker-compose.yml"), new RegExp(`postgres:${versions.postgresql}`));
  assert.match(await readText("infra/docker/docker-compose.yml"), new RegExp(`valkey/valkey:${versions.valkey}`));

  for (const value of Object.values(versions)) {
    assert.match(adrRuntime, new RegExp(String(value).replaceAll(".", "\\.")));
  }
});
