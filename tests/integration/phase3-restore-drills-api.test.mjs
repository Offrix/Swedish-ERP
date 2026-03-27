import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 3.4 API operationalizes restore drills, worker chaos and observability coverage", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-27T09:00:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });

    platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "phase3-restore-field@example.test",
      displayName: "Phase 3 Restore Field",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase3-restore-field@example.test"
    });

    const databaseRestore = await requestJson(baseUrl, "/v1/ops/restore-drills", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        drillCode: "phase3-api-database-restore",
        drillType: "database_restore",
        targetRtoMinutes: 60,
        targetRpoMinutes: 15,
        status: "scheduled",
        scheduledFor: "2026-03-27T09:15:00Z",
        evidence: {
          backupSnapshotRef: "snapshot://phase3/api/database"
        }
      }
    });
    assert.equal(databaseRestore.status, "scheduled");

    const startedDatabaseRestore = await requestJson(baseUrl, `/v1/ops/restore-drills/${databaseRestore.restoreDrillId}/start`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        startedAt: "2026-03-27T09:16:00Z"
      }
    });
    assert.equal(startedDatabaseRestore.status, "running");

    const completedDatabaseRestore = await requestJson(baseUrl, `/v1/ops/restore-drills/${databaseRestore.restoreDrillId}/complete`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        actualRtoMinutes: 35,
        actualRpoMinutes: 7,
        status: "passed",
        verificationSummary: "Database restore integrity validated.",
        completedAt: "2026-03-27T09:50:00Z",
        evidence: {
          verificationRef: "evidence://phase3/api/database"
        }
      }
    });
    assert.equal(completedDatabaseRestore.status, "passed");

    const projectionRebuild = await requestJson(baseUrl, "/v1/ops/restore-drills", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        drillCode: "phase3-api-projection-rebuild",
        drillType: "projection_rebuild",
        targetRtoMinutes: 30,
        targetRpoMinutes: 5,
        status: "scheduled",
        evidence: {
          projectionCodes: ["search_projection"]
        }
      }
    });
    await requestJson(baseUrl, `/v1/ops/restore-drills/${projectionRebuild.restoreDrillId}/complete`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        actualRtoMinutes: 11,
        actualRpoMinutes: 2,
        status: "passed",
        verificationSummary: "Projection rebuild parity verified.",
        evidence: {
          checkpointRef: "checkpoint://phase3/api/projection"
        }
      }
    });

    const workerRestart = await requestJson(baseUrl, "/v1/ops/restore-drills", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        drillCode: "phase3-api-worker-restart",
        drillType: "worker_restart",
        targetRtoMinutes: 15,
        targetRpoMinutes: 5,
        status: "scheduled",
        evidence: {
          workerLane: "async_runtime"
        }
      }
    });
    const workerChaos = await requestJson(baseUrl, "/v1/ops/chaos-scenarios", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        restoreDrillId: workerRestart.restoreDrillId,
        scenarioCode: "worker_restart",
        failureMode: "worker_process_crash",
        queueRecoverySeconds: 29,
        impactSummary: "Worker restart resumed queue consumption inside target window.",
        status: "executed",
        evidence: {
          workerRestartCount: 1
        }
      }
    });
    assert.equal(workerChaos.restoreDrillId, workerRestart.restoreDrillId);

    await requestJson(baseUrl, `/v1/ops/restore-drills/${workerRestart.restoreDrillId}/complete`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        actualRtoMinutes: 8,
        actualRpoMinutes: 1,
        status: "passed",
        verificationSummary: "Worker restart drill passed.",
        evidence: {
          chaosScenarioId: workerChaos.chaosScenarioId
        }
      }
    });

    const restoreDrills = await requestJson(baseUrl, `/v1/ops/restore-drills?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(restoreDrills.items.length >= 3, true);
    assert.equal(restoreDrills.items.some((item) => item.drillType === "database_restore" && item.status === "passed"), true);
    assert.equal(restoreDrills.items.some((item) => item.drillType === "projection_rebuild" && item.status === "passed"), true);
    assert.equal(restoreDrills.items.some((item) => item.drillType === "worker_restart" && item.status === "passed"), true);

    await requestJson(baseUrl, `/v1/ops/restore-drills?companyId=${DEMO_IDS.companyId}`, {
      token: fieldToken,
      expectedStatus: 403
    });
    await requestJson(baseUrl, `/v1/ops/restore-drills/${databaseRestore.restoreDrillId}/complete`, {
      method: "POST",
      token: fieldToken,
      expectedStatus: 403,
      body: {
        companyId: DEMO_IDS.companyId,
        actualRtoMinutes: 10,
        actualRpoMinutes: 1,
        status: "passed",
        verificationSummary: "Field users may not complete restore drills."
      }
    });

    const observability = await requestJson(baseUrl, `/v1/ops/observability?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.deepEqual(observability.runtimeControlPlane.restoreDrillCoverage.missingRestoreDrillTypes, []);
    assert.equal(observability.runtimeControlPlane.restoreDrillCoverage.workerRestartChaosCovered, true);
  } finally {
    await stopServer(server);
  }
});
