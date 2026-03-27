import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

const WORKSPACE_ROOT = "C:\\Users\\snobb\\Desktop\\Swedish ERP";
const SCRIPT_PATH = path.join(WORKSPACE_ROOT, "scripts", "runtime-honesty-scan.mjs");

test("phase 1.5 runtime honesty scan CLI reports protected runtime blockers", () => {
  const result = spawnSync(
    process.execPath,
    [
      SCRIPT_PATH,
      "--mode",
      "production",
      "--surface",
      "api",
      "--active-store-kind",
      "memory",
      "--critical-domain-state-store-kind",
      "memory",
      "--expect-finding",
      "missing_persistent_store",
      "--expect-finding",
      "map_only_critical_truth",
      "--expect-finding",
      "stub_provider_present",
      "--expect-finding",
      "simulated_receipt_runtime",
      "--expect-finding",
      "forbidden_route_family_present",
      "--require-startup-blocked",
      "--require-blocking",
      "--json"
    ],
    {
      cwd: WORKSPACE_ROOT,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.runtimeMode, "production");
  assert.equal(payload.startupAllowed, false);
  assert.ok(payload.summary.blockingCount >= 1);
  assert.equal(
    payload.findings.some((finding) => finding.findingCode === "missing_persistent_store"),
    true
  );
  assert.equal(
    payload.findings.some((finding) => finding.findingCode === "seed_demo_forbidden"),
    false
  );
});

test("phase 1.5 runtime honesty scan CLI fails when an expected finding is missing", () => {
  const result = spawnSync(
    process.execPath,
    [
      SCRIPT_PATH,
      "--mode",
      "production",
      "--surface",
      "api",
      "--active-store-kind",
      "memory",
      "--critical-domain-state-store-kind",
      "memory",
      "--expect-finding",
      "does_not_exist",
      "--json"
    ],
    {
      cwd: WORKSPACE_ROOT,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing expected finding: does_not_exist/u);
});

test("phase 1.5 runtime honesty scan CLI reports protected demo data when explicit seeding leaks into production", () => {
  const result = spawnSync(
    process.execPath,
    [
      SCRIPT_PATH,
      "--mode",
      "production",
      "--surface",
      "api",
      "--active-store-kind",
      "memory",
      "--critical-domain-state-store-kind",
      "memory",
      "--bootstrap-mode",
      "scenario_seed",
      "--bootstrap-scenario-code",
      "test_default_demo",
      "--seed-demo",
      "--expect-finding",
      "seed_demo_forbidden",
      "--expect-finding",
      "demo_data_present_in_protected_mode",
      "--require-startup-blocked",
      "--require-blocking",
      "--json"
    ],
    {
      cwd: WORKSPACE_ROOT,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.runtimeMode, "production");
  assert.equal(payload.startupAllowed, false);
  assert.equal(
    payload.findings.some(
      (finding) => finding.findingCode === "demo_data_present_in_protected_mode"
    ),
    true
  );
  assert.equal(
    payload.findings.some((finding) => finding.findingCode === "seed_demo_forbidden"),
    true
  );
});

test("phase 1.5 runtime honesty scan CLI can boot sqlite-backed critical truth without explicit file path", () => {
  const result = spawnSync(
    process.execPath,
    [
      SCRIPT_PATH,
      "--mode",
      "test",
      "--surface",
      "api",
      "--critical-domain-state-store-kind",
      "sqlite",
      "--json"
    ],
    {
      cwd: WORKSPACE_ROOT,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.runtimeMode, "test");
  assert.ok(payload.summary.totalCount >= 1);
});
