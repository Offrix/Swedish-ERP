import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { API_PLATFORM_BUILD_ORDER, createApiPlatform } from "../../apps/api/src/platform.mjs";
import { createInMemoryCriticalDomainStateStore } from "../../packages/domain-core/src/index.mjs";

const CRITICAL_DOMAIN_KEYS = Object.freeze(
  API_PLATFORM_BUILD_ORDER.filter((domainKey) => domainKey !== "automation")
);

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

test("Phase 2.1 rehydrates repository-backed domain truth from sqlite-backed aggregate envelopes", () => {
  const temp = createTempSqlitePath("swedish-erp-phase24");
  const options = {
    env: {},
    runtimeMode: "test",
    criticalDomainStateStoreKind: "sqlite",
    criticalDomainStateStorePath: temp.filePath
  };

  const platform1 = createApiPlatform(options);

  try {
    const company = platform1.createCompany({
      legalName: "Phase 24 AB",
      orgNumber: "556677-8899",
      status: "active"
    });
    const reviewQueue = platform1.createReviewQueue({
      companyId: company.companyId,
      queueCode: "PAYROLL_REVIEW",
      label: "Payroll review",
      actorId: "system"
    });
    const submission = platform1.prepareAuthoritySubmission({
      companyId: company.companyId,
      submissionType: "agi",
      payloadVersion: "agi-json-v1",
      providerKey: "skatteverket",
      recipientId: "SE556677889901",
      sourceObjectType: "pay_run",
      sourceObjectId: "pay-run-1",
      actorId: "system",
      payload: {
        reportId: "agi-2026-03",
        lines: [{ employeeId: "emp-1", grossSalary: 1000 }]
      }
    });

    for (const domainKey of CRITICAL_DOMAIN_KEYS) {
      const durability = platform1.getDomain(domainKey)?.getCriticalDomainDurability?.();
      assert.equal(durability?.truthMode, "repository_envelope");
      assert.equal(typeof durability?.objectVersion, "number");
      assert.ok(typeof durability?.snapshotHash === "string" && durability.snapshotHash.length > 0);
    }

    platform1.closeCriticalDomainStateStore();

    const platform2 = createApiPlatform(options);
    try {
      const companyAfterRestart = platform2.getCompanyProfile({ companyId: company.companyId });
      assert.equal(companyAfterRestart.legalName, "Phase 24 AB");

      const queues = platform2.listReviewCenterQueues({ companyId: company.companyId });
      assert.equal(queues.length, 1);
      assert.equal(queues[0].reviewQueueId, reviewQueue.reviewQueueId);

      const submissions = platform2.listAuthoritySubmissions({ companyId: company.companyId });
      assert.equal(submissions.length, 1);
      assert.equal(submissions[0].submissionId, submission.submissionId);
      assert.equal(submissions[0].submissionType, "agi");
    } finally {
      platform2.closeCriticalDomainStateStore();
    }
  } finally {
    cleanupTempDirectory(temp.directory);
  }
});

test("Phase 2.1 runtime diagnostics clear map-only truth only for repository-backed durable domain stores", () => {
  const temp = createTempSqlitePath("swedish-erp-phase24-runtime");
  const sqlitePlatform = createApiPlatform({
    env: {},
    runtimeMode: "production",
    criticalDomainStateStoreKind: "sqlite",
    criticalDomainStateStorePath: temp.filePath
  });
  const memoryPlatform = createApiPlatform({
    env: {},
    runtimeMode: "production",
    criticalDomainStateStoreKind: "memory"
  });

  try {
    const sqliteDiagnostics = sqlitePlatform.scanRuntimeInvariants({ startupSurface: "api" });
    assert.equal(
      sqliteDiagnostics.findings.some((finding) => finding.findingCode === "map_only_critical_truth"),
      false
    );

    const memoryDiagnostics = memoryPlatform.scanRuntimeInvariants({ startupSurface: "api" });
    assert.equal(
      memoryDiagnostics.findings.some((finding) => finding.findingCode === "map_only_critical_truth"),
      true
    );
  } finally {
    sqlitePlatform.closeCriticalDomainStateStore();
    memoryPlatform.closeCriticalDomainStateStore();
    cleanupTempDirectory(temp.directory);
  }
});

test("Phase 2.1 platform exposes per-domain durability inventory for all repository-backed domains", () => {
  const temp = createTempSqlitePath("swedish-erp-phase24-inventory");
  const sqlitePlatform = createApiPlatform({
    env: {},
    runtimeMode: "test",
    criticalDomainStateStoreKind: "sqlite",
    criticalDomainStateStorePath: temp.filePath
  });
  const memoryPlatform = createApiPlatform({
    env: {},
    runtimeMode: "test",
    criticalDomainStateStoreKind: "memory"
  });

  try {
    const sqliteInventory = sqlitePlatform.listCriticalDomainDurability();
    const memoryInventory = memoryPlatform.listCriticalDomainDurability();

    assert.deepEqual(sqliteInventory.map((entry) => entry.domainKey), CRITICAL_DOMAIN_KEYS);
    assert.deepEqual(memoryInventory.map((entry) => entry.domainKey), CRITICAL_DOMAIN_KEYS);
    assert.equal(sqliteInventory.every((entry) => entry.durable === true), true);
    assert.equal(memoryInventory.every((entry) => entry.truthMode === "in_memory_repository_envelope"), true);
    assert.equal(sqliteInventory.every((entry) => entry.truthMode === "repository_envelope"), true);
    assert.equal(sqliteInventory.every((entry) => typeof entry.objectVersion === "number" && entry.objectVersion >= 1), true);
    assert.equal(sqliteInventory.every((entry) => typeof entry.snapshotHash === "string" && entry.snapshotHash.length > 0), true);
  } finally {
    sqlitePlatform.closeCriticalDomainStateStore();
    memoryPlatform.closeCriticalDomainStateStore();
    cleanupTempDirectory(temp.directory);
  }
});

test("Phase 2.1 can bootstrap sqlite-backed repository truth without explicit file path", () => {
  const platform = createApiPlatform({
    env: {},
    runtimeMode: "test",
    criticalDomainStateStoreKind: "sqlite"
  });

  try {
    const durability = platform.listCriticalDomainDurability();
    assert.equal(durability.every((entry) => entry.truthMode === "repository_envelope"), true);
    assert.equal(
      durability.every((entry) => typeof entry.snapshotHash === "string" && entry.snapshotHash.length > 0),
      true
    );
  } finally {
    platform.closeCriticalDomainStateStore();
  }
});

test("Phase 2.1 rolls back repository-backed domain mutations when aggregate save fails", () => {
  const baseStore = createInMemoryCriticalDomainStateStore();
  let failWrites = false;
  const failingStore = {
    ...baseStore,
    kind: "failing_critical_domain_state_store",
    save(payload) {
      if (failWrites) {
        throw new Error("critical_domain_save_failed");
      }
      return baseStore.save(payload);
    }
  };

  const platform = createApiPlatform({
    env: {},
    runtimeMode: "test",
    criticalDomainStateStore: failingStore
  });

  try {
    failWrites = true;
    assert.throws(
      () =>
        platform.createCompany({
          legalName: "Rollback AB",
          orgNumber: "556677-1100",
          status: "active"
        }),
      /critical_domain_save_failed/
    );
    const orgAuthSnapshot = platform.getDomain("orgAuth").exportDurableState();
    assert.equal(JSON.stringify(orgAuthSnapshot).includes("Rollback AB"), false);
  } finally {
    platform.closeCriticalDomainStateStore?.();
  }
});
