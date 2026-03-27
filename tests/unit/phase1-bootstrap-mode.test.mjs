import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_IDS, createOrgAuthPlatform } from "../../packages/domain-org-auth/src/index.mjs";
import { readText } from "../../scripts/lib/repo.mjs";

test("phase 1.3 org-auth does not seed demo data by default", () => {
  const platform = createOrgAuthPlatform({
    clock: () => new Date("2026-03-26T08:00:00Z")
  });

  const snapshot = platform.snapshot();
  assert.equal(snapshot.companies.length, 0);
  assert.equal(snapshot.users.length, 0);
  assert.equal(snapshot.companyUsers.length, 0);
});

test("phase 1.3 org-auth only seeds demo data through explicit bootstrap scenario", () => {
  const platform = createOrgAuthPlatform({
    clock: () => new Date("2026-03-26T08:05:00Z"),
    bootstrapScenarioCode: "test_default_demo"
  });

  const snapshot = platform.snapshot();
  assert.equal(snapshot.companies.some((company) => company.companyId === DEMO_IDS.companyId), true);
});

test("phase 1.3 api platform keeps seeded test fixtures explicit and disables production autoseed", () => {
  const testPlatform = createApiPlatform({
    clock: () => new Date("2026-03-26T08:10:00Z"),
    runtimeMode: "test",
    env: {},
    criticalDomainStateStoreKind: "memory"
  });
  const explicitSeedPlatform = createApiPlatform({
    clock: () => new Date("2026-03-26T08:10:00Z"),
    runtimeMode: "test",
    env: {},
    bootstrapScenarioCode: "test_default_demo",
    criticalDomainStateStoreKind: "memory"
  });
  const productionPlatform = createApiPlatform({
    clock: () => new Date("2026-03-26T08:10:00Z"),
    runtimeMode: "production",
    env: {},
    criticalDomainStateStoreKind: "memory"
  });

  try {
    assert.equal(testPlatform.bootstrapModePolicy.defaultBootstrapMode, "none");
    assert.equal(testPlatform.getRuntimeModeProfile().environmentMode, "test");
    assert.equal(testPlatform.snapshot().companies.length, 0);
    assert.equal(explicitSeedPlatform.getCompanyProfile({ companyId: DEMO_IDS.companyId }).companyId, DEMO_IDS.companyId);
    assert.equal(productionPlatform.snapshot().companies.length, 0);
  } finally {
    testPlatform.closeCriticalDomainStateStore?.();
    explicitSeedPlatform.closeCriticalDomainStateStore?.();
    productionPlatform.closeCriticalDomainStateStore?.();
  }
});

test("phase 1.3 remaining core domains default to bootstrapMode=none instead of raw seedDemo=false", async () => {
  const files = [
    "packages/domain-ap/src/index.mjs",
    "packages/domain-balances/src/engine.mjs",
    "packages/domain-banking/src/index.mjs",
    "packages/domain-collective-agreements/src/engine.mjs",
    "packages/domain-document-classification/src/engine.mjs",
    "packages/domain-hr/src/index.mjs",
    "packages/domain-import-cases/src/engine.mjs"
  ];

  for (const file of files) {
    const source = await readText(file);
    assert.match(
      source,
      /bootstrapMode\s*=\s*"none"/u,
      `${file} must default to bootstrapMode=none`
    );
    assert.match(
      source,
      /bootstrapScenarioCode\s*=\s*null/u,
      `${file} must expose bootstrapScenarioCode for explicit seeding`
    );
    assert.doesNotMatch(
      source,
      /seedDemo\s*=\s*false/u,
      `${file} must not keep raw seedDemo=false as the constructor default`
    );
  }
});
