import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { loginWithStrongAuthOnPlatform } from "../helpers/platform-auth.mjs";

test("Phase 17.5 tenant-control exposes trial/live operations split with support policy, reset rights and analytics", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T12:00:00Z")
  });
  const tenantControl = platform.getDomain("tenantControl");
  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });

  const approver = platform.createCompanyUser({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    email: "phase17-approver@example.test",
    displayName: "Phase 17 Approver",
    roleCode: "approver",
    requiresMfa: true
  });
  const bureauUser = platform.createCompanyUser({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    email: "phase17-bureau@example.test",
    displayName: "Phase 17 Bureau",
    roleCode: "bureau_user",
    requiresMfa: true
  });
  const approverToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: approver.user.email
  });
  const bureauToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: bureauUser.user.email
  });

  const resetRightsTrial = tenantControl.createTrialEnvironment({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    label: "Reset rights trial",
    expiresAt: "2026-04-03T00:00:00Z"
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

  const supportPolicy = tenantControl.updateTrialSupportPolicy({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    allowedResetRoleCodes: ["bureau_user"],
    allowedResetCompanyUserIds: [bureauUser.companyUserId],
    allowedSupportRoleCodes: ["bureau_user", "company_admin"],
    expiryWarningDays: 5,
    promotionStaleDays: 10,
    resetStaleHours: 2,
    analyticsWindowDays: 60
  });
  assert.equal(supportPolicy.allowedResetCompanyUsers[0].companyUserId, bureauUser.companyUserId);

  assert.throws(
    () =>
      tenantControl.resetTrialEnvironment({
        sessionToken: approverToken,
        trialEnvironmentProfileId: resetRightsTrial.trialEnvironmentProfileId,
        reasonCode: "phase17_reset_check"
      }),
    (error) => error?.code === "trial_environment_reset_right_required"
  );

  const resetResult = tenantControl.resetTrialEnvironment({
    sessionToken: bureauToken,
    trialEnvironmentProfileId: resetRightsTrial.trialEnvironmentProfileId,
    reasonCode: "phase17_reset_check"
  });
  assert.equal(resetResult.resetCount, 1);
  const refreshedAdminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });

  const expiringTrial = tenantControl.createTrialEnvironment({
    sessionToken: refreshedAdminToken,
    companyId: DEMO_IDS.companyId,
    label: "Expiring trial",
    expiresAt: "2026-04-02T00:00:00Z"
  });
  const expiredTrial = tenantControl.createTrialEnvironment({
    sessionToken: refreshedAdminToken,
    companyId: DEMO_IDS.companyId,
    label: "Expired trial",
    expiresAt: "2026-03-20T00:00:00Z"
  });
  const promotionPlan = tenantControl.promoteTrialToLive({
    sessionToken: refreshedAdminToken,
    trialEnvironmentProfileId: expiringTrial.trialEnvironmentProfileId,
    approvalActorIds: [DEMO_IDS.userId]
  });
  assert.equal(promotionPlan.sourceTrialTenantId, expiringTrial.tenantId);
  assert.equal(promotionPlan.allowedObjectRefs.some((item) => item.objectType === "company_profile"), true);
  assert.equal(promotionPlan.allowedObjectRefs.some((item) => item.objectType === "submission_receipt"), false);
  tenantControl.startParallelRun({
    sessionToken: refreshedAdminToken,
    companyId: DEMO_IDS.companyId,
    trialEnvironmentProfileId: expiringTrial.trialEnvironmentProfileId,
    runWindowDays: 14
  });

  const durableState = tenantControl.exportDurableState();
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
  tenantControl.importDurableState(durableState);

  const operations = tenantControl.getTrialOperationsSnapshot({
    sessionToken: refreshedAdminToken,
    companyId: DEMO_IDS.companyId
  });
  assert.equal(operations.supportPolicy.policyCode, "trial_live_ops_default");
  assert.equal(operations.queueViews.length, 5);
  assert.equal(operations.promotionWorkflows.some((workflow) => workflow.currentStageCode === "ready_for_execution"), true);
  assert.equal(operations.salesDemoAnalytics.totalTrialsCreated >= 3, true);
  assert.equal(operations.salesDemoAnalytics.promotionPipelineCount >= 1, true);
  assert.equal(operations.alerts.some((alert) => alert.alertCode === "trial_expiring_soon"), true);
  assert.equal(operations.alerts.some((alert) => alert.alertCode === "trial_reset_stuck"), true);
  assert.equal(operations.alerts.some((alert) => alert.alertCode === "trial_promotion_stalled"), true);
  assert.equal(operations.alerts.some((alert) => alert.alertCode === "trial_parallel_run_active"), true);
});

function rewriteSerializedMapRecord(serializedMap, recordId, updater) {
  assert.equal(serializedMap?.__type, "Map");
  serializedMap.entries = serializedMap.entries.map(([key, value]) =>
    key === recordId ? [key, updater(value)] : [key, value]
  );
}
