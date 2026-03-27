import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";

const CRITICAL_DOMAIN_KEYS = Object.freeze([
  "orgAuth",
  "evidence",
  "observability",
  "ledger",
  "vat",
  "ar",
  "ap",
  "payroll",
  "taxAccount",
  "reviewCenter",
  "projects",
  "integrations"
]);

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

test("Phase 2.4 rehydrates critical domain truth from sqlite-backed durable snapshots", () => {
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
      assert.equal(durability?.truthMode, "durable_snapshot");
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

test("Phase 2.4 runtime diagnostics clear map-only truth only for durable critical-domain stores", () => {
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

test("Phase 2.4 platform exposes per-domain durability inventory for critical domains", () => {
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
    assert.equal(memoryInventory.every((entry) => entry.truthMode === "in_memory_snapshot"), true);
    assert.equal(sqliteInventory.every((entry) => typeof entry.snapshotHash === "string" && entry.snapshotHash.length > 0), true);
  } finally {
    sqlitePlatform.closeCriticalDomainStateStore();
    memoryPlatform.closeCriticalDomainStateStore();
    cleanupTempDirectory(temp.directory);
  }
});
