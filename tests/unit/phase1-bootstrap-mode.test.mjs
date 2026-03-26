import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_IDS, createOrgAuthPlatform } from "../../packages/domain-org-auth/src/index.mjs";

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
    env: {}
  });
  const productionPlatform = createApiPlatform({
    clock: () => new Date("2026-03-26T08:10:00Z"),
    runtimeMode: "production",
    env: {}
  });

  assert.equal(testPlatform.bootstrapModePolicy.defaultBootstrapMode, "none");
  assert.equal(testPlatform.getRuntimeModeProfile().environmentMode, "test");
  assert.equal(testPlatform.getCompanyProfile({ companyId: DEMO_IDS.companyId }).companyId, DEMO_IDS.companyId);
  assert.equal(productionPlatform.snapshot().companies.length, 0);
});
