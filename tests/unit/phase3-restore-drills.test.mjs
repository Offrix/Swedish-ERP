import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { loginWithStrongAuthOnPlatform } from "../helpers/platform-auth.mjs";

test("Phase 3.4 restore drills follow lifecycle and expose required coverage", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-27T07:30:00Z")
  });
  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });

  const databaseRestore = platform.recordRestoreDrill({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    drillCode: "phase3-database-restore",
    drillType: "database_restore",
    targetRtoMinutes: 60,
    targetRpoMinutes: 15,
    status: "scheduled",
    scheduledFor: "2026-03-27T08:00:00Z",
    evidence: {
      backupSnapshotRef: "snapshot://phase3/database"
    }
  });
  assert.equal(databaseRestore.status, "scheduled");
  assert.equal(databaseRestore.actualRtoMinutes, null);

  const startedDatabaseRestore = platform.startRestoreDrill({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    restoreDrillId: databaseRestore.restoreDrillId,
    startedAt: "2026-03-27T08:02:00Z"
  });
  assert.equal(startedDatabaseRestore.status, "running");

  const completedDatabaseRestore = platform.completeRestoreDrill({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    restoreDrillId: databaseRestore.restoreDrillId,
    actualRtoMinutes: 38,
    actualRpoMinutes: 8,
    status: "passed",
    verificationSummary: "Database restore replay and integrity checks passed.",
    completedAt: "2026-03-27T08:40:00Z",
    evidence: {
      restoreVerificationRef: "evidence://restore/database"
    }
  });
  assert.equal(completedDatabaseRestore.status, "passed");
  assert.equal(completedDatabaseRestore.completedAt, "2026-03-27T08:40:00.000Z");

  const projectionRebuild = platform.recordRestoreDrill({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    drillCode: "phase3-projection-rebuild",
    drillType: "projection_rebuild",
    targetRtoMinutes: 30,
    targetRpoMinutes: 5,
    status: "scheduled",
    evidence: {
      projectionCodes: ["search_projection", "workbench_projection"]
    }
  });
  platform.completeRestoreDrill({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    restoreDrillId: projectionRebuild.restoreDrillId,
    actualRtoMinutes: 12,
    actualRpoMinutes: 2,
    status: "passed",
    verificationSummary: "Projection rebuild replayed from source truth without parity drift.",
    evidence: {
      checkpointRef: "checkpoint://phase3/rebuild"
    }
  });

  const workerRestart = platform.recordRestoreDrill({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    drillCode: "phase3-worker-restart",
    drillType: "worker_restart",
    targetRtoMinutes: 15,
    targetRpoMinutes: 5,
    status: "scheduled",
    evidence: {
      workerLane: "async_runtime"
    }
  });
  const workerChaos = platform.recordChaosScenario({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    restoreDrillId: workerRestart.restoreDrillId,
    scenarioCode: "worker_restart",
    failureMode: "worker_process_crash",
    queueRecoverySeconds: 40,
    impactSummary: "Worker restart drained queue backlog within target window.",
    status: "executed",
    evidence: {
      workerRestartCount: 1
    }
  });
  platform.completeRestoreDrill({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    restoreDrillId: workerRestart.restoreDrillId,
    actualRtoMinutes: 9,
    actualRpoMinutes: 1,
    status: "passed",
    verificationSummary: "Worker restart and queue resume passed.",
    evidence: {
      chaosScenarioId: workerChaos.chaosScenarioId
    }
  });

  const coverage = platform.getRestoreDrillCoverageSummary({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId
  });
  assert.deepEqual(coverage.missingRestoreDrillTypes, []);
  assert.equal(coverage.workerRestartChaosCovered, true);
  assert.equal(coverage.items.find((item) => item.drillType === "database_restore")?.covered, true);
  assert.equal(coverage.items.find((item) => item.drillType === "projection_rebuild")?.covered, true);
  assert.equal(coverage.items.find((item) => item.drillType === "worker_restart")?.latestChaosScenarioId, workerChaos.chaosScenarioId);

  const controlPlane = platform.getRuntimeControlPlaneSummary({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId
  });
  assert.deepEqual(controlPlane.restoreDrillCoverage.missingRestoreDrillTypes, []);
  assert.equal(controlPlane.restoreDrillCoverage.workerRestartChaosCovered, true);
  assert.equal(controlPlane.recentRestoreDrills.length >= 3, true);
});
