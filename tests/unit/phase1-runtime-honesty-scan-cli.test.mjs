import test from "node:test";
import assert from "node:assert/strict";
import { runRuntimeHonestyScan } from "../../scripts/runtime-honesty-scan.mjs";

function createMemoryStream() {
  let buffer = "";
  return {
    stream: {
      write(chunk) {
        buffer += String(chunk);
      }
    },
    read() {
      return buffer;
    }
  };
}

async function runScan(argv) {
  const stdout = createMemoryStream();
  const stderr = createMemoryStream();
  const result = await runRuntimeHonestyScan({
    argv,
    stdout: stdout.stream,
    stderr: stderr.stream
  });
  return {
    status: result.exitCode,
    stdout: stdout.read(),
    stderr: stderr.read()
  };
}

test("phase 1.5 runtime honesty scan CLI reports protected runtime blockers", () => {
  return runScan([
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
      "--expect-finding",
      "phasebucket_route_runtime_present",
      "--require-startup-blocked",
      "--require-blocking",
      "--json"
    ]).then((result) => {
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
        payload.findings.some(
          (finding) => finding.findingCode === "phasebucket_route_runtime_present"
        ),
        true
      );
      assert.equal(
        payload.findings.some((finding) => finding.findingCode === "seed_demo_forbidden"),
        false
      );
    });
});

test("phase 1.5 runtime honesty scan CLI fails when an expected finding is missing", () => {
  return runScan([
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
    ]).then((result) => {
      assert.equal(result.status, 1);
      assert.match(result.stderr, /Missing expected finding: does_not_exist/u);
    });
});

test("phase 1.5 runtime honesty scan CLI reports protected demo data when explicit seeding leaks into production", () => {
  return runScan([
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
    ]).then((result) => {
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
});

test("phase 1.5 runtime honesty scan CLI can boot sqlite-backed critical truth without explicit file path", () => {
  return runScan([
      "--mode",
      "test",
      "--surface",
      "api",
      "--critical-domain-state-store-kind",
      "sqlite",
      "--json"
    ]).then((result) => {
      assert.equal(result.status, 0, result.stderr);
      const payload = JSON.parse(result.stdout);
      assert.equal(payload.runtimeMode, "test");
      assert.ok(payload.summary.totalCount >= 1);
    });
});
