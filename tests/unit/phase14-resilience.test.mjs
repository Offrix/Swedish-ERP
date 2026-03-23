import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { loginWithStrongAuthOnPlatform } from "../helpers/platform-auth.mjs";

test("Phase 14.2 resilience records flag metadata, emergency disable and recovery evidence", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T20:00:00Z")
  });
  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });

  const featureFlag = platform.upsertFeatureFlag({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    flagKey: "payments.kill_switch",
    description: "Stops outgoing payment exports.",
    flagType: "kill_switch",
    scopeType: "company",
    scopeRef: DEMO_IDS.companyId,
    defaultEnabled: false,
    enabled: true,
    ownerUserId: DEMO_IDS.userId,
    riskClass: "high",
    sunsetAt: "2026-12-31"
  });
  assert.equal(featureFlag.flagType, "kill_switch");
  assert.equal(featureFlag.ownerUserId, DEMO_IDS.userId);
  assert.equal(featureFlag.sunsetAt, "2026-12-31");
  platform.upsertFeatureFlag({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    flagKey: "payments.kill_switch",
    description: "Global default.",
    flagType: "kill_switch",
    scopeType: "global",
    defaultEnabled: false,
    enabled: false,
    ownerUserId: DEMO_IDS.userId,
    riskClass: "high",
    sunsetAt: "2026-12-31"
  });
  platform.upsertFeatureFlag({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    flagKey: "payments.kill_switch",
    description: "User override.",
    flagType: "kill_switch",
    scopeType: "company_user",
    scopeRef: DEMO_IDS.companyUserId,
    defaultEnabled: false,
    enabled: false,
    ownerUserId: DEMO_IDS.userId,
    riskClass: "high",
    sunsetAt: "2026-12-31"
  });
  assert.equal(platform.resolveRuntimeFlags({ companyId: DEMO_IDS.companyId })[featureFlag.flagKey], true);
  assert.equal(platform.resolveRuntimeFlags({ companyId: DEMO_IDS.companyId, companyUserId: DEMO_IDS.companyUserId })[featureFlag.flagKey], false);
  assert.throws(
    () =>
      platform.requestEmergencyDisable({
        sessionToken: adminToken,
        companyId: DEMO_IDS.companyId,
        flagKey: featureFlag.flagKey,
        reasonCode: "incident_lockdown",
        expiresInMinutes: 30
      }),
    (error) => error?.code === "feature_flag_scope_required"
  );

  const disable = platform.requestEmergencyDisable({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    flagKey: featureFlag.flagKey,
    scopeType: "company",
    scopeRef: DEMO_IDS.companyId,
    reasonCode: "incident_lockdown",
    expiresInMinutes: 30
  });
  assert.equal(disable.featureFlag.emergencyDisabled, true);
  assert.equal(platform.resolveRuntimeFlags({ companyId: DEMO_IDS.companyId })[featureFlag.flagKey], false);

  const loadProfile = platform.recordLoadProfile({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    profileCode: "pilot_target",
    targetThroughputPerMinute: 1200,
    observedP95Ms: 180,
    queueRecoverySeconds: 45,
    status: "passed"
  });
  const restoreDrill = platform.recordRestoreDrill({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    drillCode: "nightly_restore",
    targetRtoMinutes: 60,
    targetRpoMinutes: 15,
    actualRtoMinutes: 42,
    actualRpoMinutes: 10,
    status: "passed",
    evidence: { restorePoint: "snapshot://phase14-unit" }
  });
  const chaosScenario = platform.recordChaosScenario({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    scenarioCode: "worker_restart",
    failureMode: "worker_process_crash",
    queueRecoverySeconds: 35,
    impactSummary: "Recovered within target window.",
    status: "executed",
    evidence: { deadLetterBacklog: 0 }
  });

  assert.equal(loadProfile.status, "passed");
  assert.equal(restoreDrill.actualRtoMinutes <= restoreDrill.targetRtoMinutes, true);
  assert.equal(chaosScenario.queueRecoverySeconds <= 35, true);
});
