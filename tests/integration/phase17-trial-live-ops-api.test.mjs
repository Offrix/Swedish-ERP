import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 17.5 API exposes trial/live operations split with policy, queues, alerts and analytics", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T12:00:00Z")
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
    const approver = platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "phase17-api-approver@example.test",
      displayName: "Phase 17 API Approver",
      roleCode: "approver",
      requiresMfa: true
    });
    const bureauUser = platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "phase17-api-bureau@example.test",
      displayName: "Phase 17 API Bureau",
      roleCode: "bureau_user",
      requiresMfa: true
    });
    const approverToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: approver.user.email
    });
    const bureauToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: bureauUser.user.email
    });

    const resetRightsTrial = await requestJson(baseUrl, "/v1/trial/environments", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        label: "Trial reset rights",
        expiresAt: "2026-04-03T00:00:00Z"
      }
    });
    assert.notEqual(resetRightsTrial.tenantId, DEMO_IDS.companyId);
    assert.equal(resetRightsTrial.isolationRefs.sequenceSpaceRef.startsWith("trial-sequences://"), true);
    assert.equal(resetRightsTrial.isolationRefs.providerRefNamespaceRef.startsWith("trial-providers://"), true);
    for (const companyUserId of [approver.companyUserId, bureauUser.companyUserId]) {
      platform.createObjectGrant({
        sessionToken: adminToken,
        companyId: DEMO_IDS.companyId,
        companyUserId,
        permissionCode: "company.manage",
        objectType: "trial_environment_profile",
        objectId: resetRightsTrial.trialEnvironmentProfileId
      });
    }

    const updatedPolicy = await requestJson(baseUrl, "/v1/trial/support-policy", {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        allowedResetRoleCodes: ["bureau_user"],
        allowedResetCompanyUserIds: [bureauUser.companyUserId],
        allowedSupportRoleCodes: ["bureau_user", "company_admin"],
        expiryWarningDays: 5,
        promotionStaleDays: 10,
        resetStaleHours: 2,
        analyticsWindowDays: 60
      }
    });
    assert.equal(updatedPolicy.allowedResetCompanyUsers[0].companyUserId, bureauUser.companyUserId);

    const forbiddenReset = await requestJson(
      baseUrl,
      `/v1/trial/environments/${resetRightsTrial.trialEnvironmentProfileId}/reset`,
      {
        method: "POST",
        token: approverToken,
        expectedStatus: 403,
        body: {
          reasonCode: "phase17_api_reset_check"
        }
      }
    );
    assert.equal(forbiddenReset.error, "trial_environment_reset_right_required");

    const resetResult = await requestJson(
      baseUrl,
      `/v1/trial/environments/${resetRightsTrial.trialEnvironmentProfileId}/reset`,
      {
        method: "POST",
        token: bureauToken,
        body: {
          reasonCode: "phase17_api_reset_check"
        }
      }
    );
    assert.equal(resetResult.resetCount, 1);
    const refreshedAdminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });

    const expiringTrial = await requestJson(baseUrl, "/v1/trial/environments", {
      method: "POST",
      token: refreshedAdminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        label: "Expiring API trial",
        expiresAt: "2026-04-02T00:00:00Z"
      }
    });
    const expiredTrial = await requestJson(baseUrl, "/v1/trial/environments", {
      method: "POST",
      token: refreshedAdminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        label: "Expired API trial",
        expiresAt: "2026-03-20T00:00:00Z"
      }
    });
    const promotionPlan = await requestJson(baseUrl, "/v1/trial/promotions", {
      method: "POST",
      token: refreshedAdminToken,
      expectedStatus: 201,
      body: {
        trialEnvironmentProfileId: expiringTrial.trialEnvironmentProfileId,
        approvalActorIds: [DEMO_IDS.userId]
      }
    });
    assert.equal(promotionPlan.sourceTrialTenantId, expiringTrial.tenantId);
    assert.equal(promotionPlan.allowedObjectRefs.some((item) => item.objectType === "company_profile"), true);
    assert.equal(promotionPlan.allowedObjectRefs.some((item) => item.objectType === "submission_receipt"), false);
    await requestJson(baseUrl, "/v1/tenant/parallel-runs", {
      method: "POST",
      token: refreshedAdminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        trialEnvironmentProfileId: expiringTrial.trialEnvironmentProfileId,
        runWindowDays: 14
      }
    });

    const durableState = platform.getDomain("tenantControl").exportDurableState();
    rewriteSerializedMapRecord(durableState.trialEnvironmentProfiles, expiredTrial.trialEnvironmentProfileId, (trial) => ({
      ...trial,
      status: "reset_in_progress",
      updatedAt: "2026-03-29T08:30:00Z"
    }));
    rewriteSerializedMapRecord(durableState.promotionPlans, promotionPlan.promotionPlanId, (plan) => ({
      ...plan,
      status: "approved",
      updatedAt: "2026-03-10T00:00:00Z"
    }));
    platform.getDomain("tenantControl").importDurableState(durableState);

    const supportPolicy = await requestJson(baseUrl, `/v1/trial/support-policy?companyId=${DEMO_IDS.companyId}`, {
      token: refreshedAdminToken
    });
    assert.equal(supportPolicy.allowedResetRoleCodes.includes("bureau_user"), true);

    const operations = await requestJson(baseUrl, `/v1/trial/operations?companyId=${DEMO_IDS.companyId}`, {
      token: refreshedAdminToken
    });
    assert.equal(operations.queueViews.length, 5);
    assert.equal(operations.alerts.some((alert) => alert.alertCode === "trial_expiring_soon"), true);
    assert.equal(operations.alerts.some((alert) => alert.alertCode === "trial_reset_stuck"), true);
    assert.equal(operations.alerts.some((alert) => alert.alertCode === "trial_promotion_stalled"), true);
    assert.equal(operations.alerts.some((alert) => alert.alertCode === "trial_parallel_run_active"), true);
    assert.equal(operations.salesDemoAnalytics.promotionPipelineCount >= 1, true);

    const alerts = await requestJson(baseUrl, `/v1/trial/operations/alerts?companyId=${DEMO_IDS.companyId}`, {
      token: refreshedAdminToken
    });
    assert.equal(alerts.items.length >= 4, true);

    const queues = await requestJson(baseUrl, `/v1/trial/operations/queues?companyId=${DEMO_IDS.companyId}`, {
      token: refreshedAdminToken
    });
    assert.equal(queues.items.some((queue) => queue.queueCode === "TRIAL_PROMOTION_QUEUE"), true);

    const workflows = await requestJson(baseUrl, `/v1/trial/promotions/workflows?companyId=${DEMO_IDS.companyId}`, {
      token: refreshedAdminToken
    });
    assert.equal(workflows.items.some((workflow) => workflow.currentStageCode === "ready_for_execution"), true);

    const analytics = await requestJson(baseUrl, `/v1/trial/analytics?companyId=${DEMO_IDS.companyId}`, {
      token: refreshedAdminToken
    });
    assert.equal(analytics.totalTrialsCreated >= 3, true);
    assert.equal(analytics.parallelRunStartedCount >= 1, true);

    const dashboard = await requestJson(
      baseUrl,
      `/v1/mission-control/dashboards/trial_conversion?companyId=${DEMO_IDS.companyId}`,
      {
        token: refreshedAdminToken
      }
    );
    assert.equal(dashboard.summary.operationsSummary.alertCount >= 4, true);
    assert.equal(dashboard.summary.salesDemoAnalytics.promotionPipelineCount >= 1, true);
    assert.equal(dashboard.counters.alertCount >= 4, true);
  } finally {
    await stopServer(server);
  }
});

function rewriteSerializedMapRecord(serializedMap, recordId, updater) {
  assert.equal(serializedMap?.__type, "Map");
  serializedMap.entries = serializedMap.entries.map(([key, value]) =>
    key === recordId ? [key, updater(value)] : [key, value]
  );
}
