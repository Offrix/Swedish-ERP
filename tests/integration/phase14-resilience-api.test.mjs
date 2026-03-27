import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_APPROVER_IDS, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 14.2 API records feature-flag metadata, emergency disables and recovery evidence", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T21:40:00Z")
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
    const releaseApprover = platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "phase14-release-approver@example.test",
      displayName: "Phase 14 Release Approver",
      roleCode: "approver",
      requiresMfa: false
    });
    platform.createObjectGrant({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      companyUserId: releaseApprover.companyUserId,
      permissionCode: "company.manage",
      objectType: "resilience",
      objectId: DEMO_IDS.companyId
    });
    platform.createDelegation({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      fromCompanyUserId: DEMO_IDS.companyUserId,
      toCompanyUserId: releaseApprover.companyUserId,
      scopeCode: "emergency_disable",
      permissionCode: "company.manage"
    });
    platform.createObjectGrant({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      companyUserId: DEMO_APPROVER_IDS.companyUserId,
      permissionCode: "company.manage",
      objectType: "feature_flag",
      objectId: DEMO_IDS.companyId
    });
    const releaseApproverToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase14-release-approver@example.test"
    });
    platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "phase14-ops-field@example.test",
      displayName: "Phase 14 Ops Field",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase14-ops-field@example.test"
    });

    const approvalDenied = await requestJson(baseUrl, "/v1/ops/feature-flags", {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
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
      }
    });
    assert.equal(approvalDenied.error, "feature_flag_approval_required");
    const featureFlag = await requestJson(baseUrl, "/v1/ops/feature-flags", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
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
        sunsetAt: "2026-12-31",
        changeReason: "Payment exports are entering staged rollout.",
        approvalActorIds: [DEMO_APPROVER_IDS.userId]
      }
    });
    assert.equal(featureFlag.flagType, "kill_switch");
    assert.deepEqual(featureFlag.approvalActorIds, [DEMO_APPROVER_IDS.userId]);
    await requestJson(baseUrl, "/v1/ops/feature-flags", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        flagKey: "payments.kill_switch",
        description: "Global default.",
        flagType: "kill_switch",
        scopeType: "global",
        defaultEnabled: false,
        enabled: false,
        ownerUserId: DEMO_IDS.userId,
        riskClass: "high",
        sunsetAt: "2026-12-31",
        changeReason: "Global default stays disabled until staged rollout is complete.",
        approvalActorIds: [DEMO_APPROVER_IDS.userId]
      }
    });
    await requestJson(baseUrl, "/v1/ops/feature-flags", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
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
        sunsetAt: "2026-12-31",
        changeReason: "User override remains disabled for finance reviewer.",
        approvalActorIds: [DEMO_APPROVER_IDS.userId]
      }
    });
    await requestJson(baseUrl, "/v1/ops/feature-flags", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        flagKey: "reports.legacy_export",
        description: "Legacy export path pending cleanup.",
        flagType: "ops",
        scopeType: "company",
        scopeRef: DEMO_IDS.companyId,
        defaultEnabled: false,
        enabled: true,
        ownerUserId: DEMO_IDS.userId,
        riskClass: "medium",
        sunsetAt: "2026-03-21",
        changeReason: "Cleanup validation for expired flags."
      }
    });

    const beforeDisable = await requestJson(baseUrl, `/v1/ops/feature-flags?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(beforeDisable.resolved[featureFlag.flagKey], true);
    assert.equal(beforeDisable.resolved["reports.legacy_export"], false);
    assert.equal(beforeDisable.items.find((item) => item.flagKey === "reports.legacy_export").expired, true);
    const userScopedView = await requestJson(baseUrl, `/v1/ops/feature-flags?companyId=${DEMO_IDS.companyId}&companyUserId=${DEMO_IDS.companyUserId}`, {
      token: adminToken
    });
    assert.equal(userScopedView.resolved[featureFlag.flagKey], false);

    const ambiguousDisable = await requestJson(baseUrl, "/v1/ops/emergency-disables", {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        flagKey: featureFlag.flagKey,
        reasonCode: "incident_lockdown",
        expiresInMinutes: 30
      }
    });
    assert.equal(ambiguousDisable.error, "feature_flag_scope_required");

    const disable = await requestJson(baseUrl, "/v1/ops/emergency-disables", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        flagKey: featureFlag.flagKey,
        scopeType: "company",
        scopeRef: DEMO_IDS.companyId,
        reasonCode: "incident_lockdown",
        expiresInMinutes: 30
      }
    });
    assert.equal(disable.featureFlag.emergencyDisabled, true);
    const selfReleaseDenied = await requestJson(baseUrl, `/v1/ops/emergency-disables/${disable.emergencyDisable.emergencyDisableId}/release`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        verificationSummary: "Self release should be blocked for high-risk disable."
      }
    });
    assert.equal(selfReleaseDenied.error, "emergency_disable_self_release_forbidden");
    const releasedDisable = await requestJson(baseUrl, `/v1/ops/emergency-disables/${disable.emergencyDisable.emergencyDisableId}/release`, {
      method: "POST",
      token: releaseApproverToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        verificationSummary: "Queue health and payment adapter probes are green again."
      }
    });
    assert.equal(releasedDisable.featureFlag.emergencyDisabled, false);
    assert.equal(releasedDisable.emergencyDisable.status, "released");

    const afterDisable = await requestJson(baseUrl, `/v1/ops/feature-flags?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(afterDisable.resolved[featureFlag.flagKey], true);

    await requestJson(baseUrl, "/v1/ops/load-profiles", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        profileCode: "pilot_target",
        targetThroughputPerMinute: 1200,
        observedP95Ms: 180,
        queueRecoverySeconds: 45,
        status: "passed"
      }
    });
    await requestJson(baseUrl, "/v1/ops/restore-drills", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        drillCode: "nightly_restore",
        targetRtoMinutes: 60,
        targetRpoMinutes: 15,
        actualRtoMinutes: 42,
        actualRpoMinutes: 10,
        status: "passed",
        evidence: { restorePoint: "snapshot://phase14-2" }
      }
    });
    await requestJson(baseUrl, "/v1/ops/chaos-scenarios", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        scenarioCode: "worker_restart",
        failureMode: "worker_process_crash",
        queueRecoverySeconds: 35,
        impactSummary: "Recovered within target window.",
        status: "executed",
        evidence: { deadLetterBacklog: 0 }
      }
    });

    const disables = await requestJson(baseUrl, `/v1/ops/emergency-disables?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    const loadProfiles = await requestJson(baseUrl, `/v1/ops/load-profiles?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    const restoreDrills = await requestJson(baseUrl, `/v1/ops/restore-drills?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    const chaosScenarios = await requestJson(baseUrl, `/v1/ops/chaos-scenarios?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    for (const path of [
      `/v1/ops/feature-flags?companyId=${DEMO_IDS.companyId}`,
      `/v1/ops/emergency-disables?companyId=${DEMO_IDS.companyId}`,
      `/v1/ops/load-profiles?companyId=${DEMO_IDS.companyId}`,
      `/v1/ops/restore-drills?companyId=${DEMO_IDS.companyId}`,
      `/v1/ops/chaos-scenarios?companyId=${DEMO_IDS.companyId}`
    ]) {
      await requestJson(baseUrl, path, {
        token: fieldUserToken,
        expectedStatus: 403
      });
    }

    assert.equal(disables.items.length, 1);
    assert.equal(disables.items[0].status, "released");
    assert.equal(loadProfiles.items[0].status, "passed");
    assert.equal(restoreDrills.items[0].actualRtoMinutes <= restoreDrills.items[0].targetRtoMinutes, true);
    assert.equal(chaosScenarios.items[0].queueRecoverySeconds <= 35, true);
  } finally {
    await stopServer(server);
  }
});
