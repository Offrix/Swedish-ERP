import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { startApiServer } from "../../apps/api/src/server.mjs";
import { startWorker } from "../../apps/worker/src/worker.mjs";
import { createInMemoryCriticalDomainStateStore } from "../../packages/domain-core/src/index.mjs";

function createTempSqlitePath(prefix) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
  return {
    directory,
    filePath: path.join(directory, "critical-domain-state.sqlite")
  };
}

function cleanupTempDirectory(directory) {
  fs.rmSync(directory, { recursive: true, force: true });
}

test("phase 1.4 runtime diagnostics surface flat merge collisions as warnings in test mode", () => {
  const platform = createApiPlatform({
    runtimeMode: "test",
    env: {}
  });

  const findings = platform.listRuntimeInvariantFindings();
  const collisions = platform.listFlatMergeCollisions();
  const flatMergeFinding = findings.find((finding) => finding.findingCode === "flat_merge_collision");
  const mapTruthFinding = findings.find((finding) => finding.findingCode === "map_only_critical_truth");
  const stubProviderFinding = findings.find((finding) => finding.findingCode === "stub_provider_present");
  const simulatedRuntimeFinding = findings.find((finding) => finding.findingCode === "simulated_receipt_runtime");
  const forbiddenRouteFinding = findings.find((finding) => finding.findingCode === "forbidden_route_family_present");
  const phasebucketRouteFinding = findings.find(
    (finding) => finding.findingCode === "phasebucket_route_runtime_present"
  );
  const secretRuntimeFinding = findings.find((finding) => finding.findingCode === "secret_runtime_not_bank_grade");

  assert.ok(flatMergeFinding);
  assert.ok(collisions.length > 0);
  assert.equal(collisions.some((finding) => finding.findingCode === "flat_merge_collision"), true);
  assert.ok(mapTruthFinding);
  assert.ok(stubProviderFinding);
  assert.equal(simulatedRuntimeFinding, undefined);
  assert.equal(forbiddenRouteFinding, undefined);
  assert.equal(phasebucketRouteFinding, undefined);
  assert.equal(secretRuntimeFinding, undefined);
  assert.equal(flatMergeFinding.severityCode, "warning");
  assert.equal(platform.getRuntimeStartupDiagnostics().startupAllowed, true);
});

test("phase 1.4 api starter rejects protected boot when runtime invariants are blocking", async () => {
  await assert.rejects(
    () =>
      startApiServer({
        port: 0,
        env: {
          ERP_RUNTIME_MODE: "production"
        },
        logger: () => {},
        enforceExplicitRuntimeMode: true
      }),
    /startup blocked by runtime invariants/u
  );
});

test("phase 1.4 worker rejects protected boot when runtime store is not persistent", async () => {
  await assert.rejects(
    () =>
      startWorker({
        intervalMs: 250,
        env: {
          ERP_RUNTIME_MODE: "pilot_parallel",
          WORKER_JOB_STORE: "memory"
        },
        logger: () => {},
        enforceExplicitRuntimeMode: true
      }),
    /startup blocked by runtime invariants/u
  );
});

test("phase 1.4 protected runtime does not auto-provision sqlite-backed critical truth", () => {
  const platform = createApiPlatform({
    runtimeMode: "production",
    env: {}
  });

  try {
    const durability = platform.listCriticalDomainDurability();
    const diagnostics = platform.getRuntimeStartupDiagnostics();
    assert.equal(durability.every((entry) => entry.truthMode === "in_memory_repository_envelope"), true);
    assert.equal(diagnostics.startupAllowed, false);
    assert.equal(
      diagnostics.findings.some((finding) => finding.findingCode === "secret_runtime_not_bank_grade"),
      true
    );
  } finally {
    platform.closeCriticalDomainStateStore?.();
  }
});

test("phase 1.4 protected runtime exposes sqlite critical truth as a blocking persistence invariant", () => {
  const temp = createTempSqlitePath("swedish-erp-phase1-critical-store");
  const platform = createApiPlatform({
    runtimeMode: "production",
    env: {},
    criticalDomainStateStoreKind: "sqlite",
    criticalDomainStateStorePath: temp.filePath
  });

  try {
    const diagnostics = platform.getRuntimeStartupDiagnostics();
    const durability = platform.listCriticalDomainDurability();
    assert.equal(durability.every((entry) => entry.truthMode === "repository_envelope"), true);
    assert.equal(diagnostics.criticalDomainStoreKind, "sqlite");
    assert.equal(diagnostics.startupAllowed, false);
    assert.equal(
      diagnostics.findings.some((finding) => finding.findingCode === "critical_domain_store_not_persistent"),
      true
    );
    assert.equal(
      diagnostics.findings.some((finding) => finding.findingCode === "secret_runtime_not_bank_grade"),
      true
    );
  } finally {
    platform.closeCriticalDomainStateStore?.();
    cleanupTempDirectory(temp.directory);
  }
});

test("phase 1.4 protected runtime blocks sqlite critical truth even when other runtime stores resolve to postgres", () => {
  const temp = createTempSqlitePath("swedish-erp-phase1-critical-store-postgres-mismatch");
  const platform = createApiPlatform({
    runtimeMode: "production",
    env: {
      POSTGRES_URL: "postgres://runtime-store"
    },
    criticalDomainStateStoreKind: "sqlite",
    criticalDomainStateStorePath: temp.filePath
  });

  try {
    const diagnostics = platform.getRuntimeStartupDiagnostics();
    assert.equal(diagnostics.activeStoreKind, "postgres");
    assert.equal(diagnostics.criticalDomainStoreKind, "sqlite");
    assert.equal(diagnostics.startupAllowed, false);
    assert.equal(
      diagnostics.findings.some((finding) => finding.findingCode === "critical_domain_store_not_persistent"),
      true
    );
    assert.equal(
      diagnostics.findings.some((finding) => finding.findingCode === "secret_runtime_not_bank_grade"),
      true
    );
  } finally {
    platform.closeCriticalDomainStateStore?.();
    cleanupTempDirectory(temp.directory);
  }
});

test("phase 2.5 protected runtime clears critical-domain persistence finding when injected truth is postgres-backed", () => {
  const baseStore = createInMemoryCriticalDomainStateStore();
  const platform = createApiPlatform({
    runtimeMode: "production",
    env: {
      POSTGRES_URL: "postgres://runtime-store",
      ERP_CRITICAL_DOMAIN_STATE_STORE: "postgres"
    },
    criticalDomainStateStore: {
      ...baseStore,
      kind: "postgres_critical_domain_state_store",
      verifySchemaContract: () => ({ ok: true })
    }
  });

  try {
    const diagnostics = platform.getRuntimeStartupDiagnostics();
    assert.equal(diagnostics.activeStoreKind, "postgres");
    assert.equal(diagnostics.criticalDomainStoreKind, "postgres");
    assert.equal(
      diagnostics.findings.some((finding) => finding.findingCode === "critical_domain_store_not_persistent"),
      false
    );
    assert.equal(
      diagnostics.findings.some((finding) => finding.findingCode === "secret_runtime_not_bank_grade"),
      true
    );
  } finally {
    platform.closeCriticalDomainStateStore?.();
  }
});

test("phase 2.5 critical-domain URL infers Postgres truth without separate store-kind flag", () => {
  const baseStore = createInMemoryCriticalDomainStateStore();
  const platform = createApiPlatform({
    runtimeMode: "production",
    env: {
      POSTGRES_URL: "postgres://runtime-store",
      ERP_CRITICAL_DOMAIN_STATE_URL: "postgres://critical-domain-store"
    },
    criticalDomainStateStore: {
      ...baseStore,
      kind: "postgres_critical_domain_state_store",
      verifySchemaContract: () => ({ ok: true })
    }
  });

  try {
    const diagnostics = platform.getRuntimeStartupDiagnostics();
    assert.equal(diagnostics.criticalDomainStoreKind, "postgres");
    assert.equal(
      diagnostics.findings.some((finding) => finding.findingCode === "critical_domain_store_not_persistent"),
      false
    );
    assert.equal(
      diagnostics.findings.some((finding) => finding.findingCode === "secret_runtime_not_bank_grade"),
      true
    );
  } finally {
    platform.closeCriticalDomainStateStore?.();
  }
});

test("phase 3.2 protected runtime clears secret runtime finding when AWS KMS wrapped roots are configured", () => {
  const baseStore = createInMemoryCriticalDomainStateStore();
  const platform = createApiPlatform({
    runtimeMode: "production",
    env: {
      POSTGRES_URL: "postgres://runtime-store",
      ERP_CRITICAL_DOMAIN_STATE_STORE: "postgres",
      ERP_SECRET_RUNTIME_PROVIDER: "aws_kms",
      ERP_AWS_KMS_REGION: "eu-north-1",
      ERP_AWS_KMS_MODE_ROOT_KEY_ID: "swedish-erp/mode-root-key",
      ERP_AWS_KMS_MODE_ROOT_WRAPPED_B64: Buffer.from("wrapped-mode-root").toString("base64"),
      ERP_AWS_KMS_SERVICE_KEK_KEY_ID: "swedish-erp/service-kek",
      ERP_AWS_KMS_SERVICE_KEK_WRAPPED_B64: Buffer.from("wrapped-service-kek").toString("base64"),
      ERP_AWS_KMS_BLIND_INDEX_KEY_ID: "swedish-erp/blind-index-key",
      ERP_AWS_KMS_BLIND_INDEX_WRAPPED_B64: Buffer.from("wrapped-blind-index").toString("base64")
    },
    secretRuntimeBridgeRunner: () => ({
      region: "eu-north-1",
      modeRoot: {
        keyId: "alias/swedish-erp/mode-root-key",
        plaintextKeyMaterialB64: Buffer.from("mode-root-material").toString("base64")
      },
      serviceKek: {
        keyId: "alias/swedish-erp/service-kek",
        plaintextKeyMaterialB64: Buffer.from("service-kek-material").toString("base64")
      },
      blindIndex: {
        keyId: "alias/swedish-erp/blind-index-key",
        plaintextKeyMaterialB64: Buffer.from("blind-index-material").toString("base64")
      }
    }),
    criticalDomainStateStore: {
      ...baseStore,
      kind: "postgres_critical_domain_state_store",
      verifySchemaContract: () => ({ ok: true })
    }
  });

  try {
    const diagnostics = platform.getRuntimeStartupDiagnostics();
    const orgAuthPosture = platform.getDomain("orgAuth").listSecretStorePostures()[0];
    const integrationPosture = platform.getDomain("integrations").listSecretStorePostures()[0];
    assert.equal(platform.environmentMode, "production");
    assert.equal(
      diagnostics.findings.some((finding) => finding.findingCode === "critical_domain_store_not_persistent"),
      false
    );
    assert.equal(
      diagnostics.findings.some((finding) => finding.findingCode === "secret_runtime_not_bank_grade"),
      false
    );
    assert.equal(orgAuthPosture.providerKind, "aws_kms");
    assert.equal(orgAuthPosture.environmentMode, "production");
    assert.equal(orgAuthPosture.bankGradeReady, true);
    assert.equal(integrationPosture.providerKind, "aws_kms");
    assert.equal(integrationPosture.environmentMode, "production");
    assert.equal(integrationPosture.bankGradeReady, true);
  } finally {
    platform.closeCriticalDomainStateStore?.();
  }
});
