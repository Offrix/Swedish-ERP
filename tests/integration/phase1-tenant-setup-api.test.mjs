import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer, readText } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 1 tenant setup migration creates setup and module activation tables", async () => {
  const migration = await readText("packages/db/migrations/20260325030000_phase1_tenant_setup_module_activation.sql");
  for (const tableName of ["tenant_setup_profiles", "module_definitions", "module_activations"]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName.replaceAll("_", "\\_")}`));
  }
});

test("Phase 1 API routes tenant setup, trial and module lifecycles through tenant-control", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-25T09:00:00Z")
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

    const root = await requestJson(baseUrl, "/", { token: adminToken });
    for (const route of [
      "/v1/org/tenant-setup/profile",
      "/v1/org/module-activations",
      "/v1/tenant/bootstrap",
      "/v1/tenant/modules/definitions",
      "/v1/tenant/modules/activations",
      "/v1/trial/environments",
      "/v1/trial/promotions",
      "/v1/tenant/parallel-runs"
    ]) {
      assert.equal(root.routes.includes(route), true, `${route} should be exposed`);
    }

    const onboardingRun = await requestJson(baseUrl, "/v1/tenant/bootstrap", {
      method: "POST",
      expectedStatus: 201,
      body: {
        legalName: "API Tenant Bootstrap AB",
        orgNumber: "559900-6767",
        adminEmail: "api-owner@example.test",
        adminDisplayName: "API Owner"
      }
    });
    assert.equal(onboardingRun.companySetupStatus, "bootstrap_running");

    const onboardingRead = await requestJson(baseUrl, `/v1/onboarding/runs/${onboardingRun.tenantBootstrapId}?resumeToken=${onboardingRun.resumeToken}`);
    assert.equal(onboardingRead.companyId, onboardingRun.companyId);

    await requestJson(baseUrl, `/v1/onboarding/runs/${onboardingRun.tenantBootstrapId}/steps/registrations`, {
      method: "POST",
      body: {
        resumeToken: onboardingRun.resumeToken,
        registrations: [
          { registrationType: "f_tax", registrationValue: "configured-f-tax", status: "configured" },
          { registrationType: "vat", registrationValue: "configured-vat", status: "configured" },
          { registrationType: "employer", registrationValue: "configured-employer", status: "configured" }
        ]
      }
    });
    await requestJson(baseUrl, `/v1/onboarding/runs/${onboardingRun.tenantBootstrapId}/steps/chart`, {
      method: "POST",
      body: {
        resumeToken: onboardingRun.resumeToken,
        chartTemplateId: "DSAM-2026",
        voucherSeriesCodes: ["A", "B", "E", "H", "I"]
      }
    });
    await requestJson(baseUrl, `/v1/onboarding/runs/${onboardingRun.tenantBootstrapId}/steps/vat`, {
      method: "POST",
      body: {
        resumeToken: onboardingRun.resumeToken,
        vatScheme: "se_standard",
        filingPeriod: "monthly"
      }
    });
    await requestJson(baseUrl, `/v1/onboarding/runs/${onboardingRun.tenantBootstrapId}/steps/periods`, {
      method: "POST",
      body: {
        resumeToken: onboardingRun.resumeToken,
        year: 2026
      }
    });

    const onboardingChecklist = await requestJson(
      baseUrl,
      `/v1/tenant/bootstrap/${onboardingRun.tenantBootstrapId}/checklist?resumeToken=${onboardingRun.resumeToken}`
    );
    assert.equal(onboardingChecklist.checklist.every((item) => item.status === "completed"), true);

    const onboardingAdminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: onboardingRun.companyId,
      email: "api-owner@example.test"
    });
    const onboardingProfile = await requestJson(baseUrl, `/v1/tenant/bootstrap/profile?companyId=${onboardingRun.companyId}`, {
      token: onboardingAdminToken
    });
    assert.equal(onboardingProfile.status, "finance_ready");
    assert.equal(onboardingProfile.financeReadinessChecks.every((item) => item.status === "completed"), true);
    assert.equal(onboardingProfile.financeBlueprintJson.legalFormCode, "AKTIEBOLAG");
    assert.equal(onboardingProfile.financeBlueprintJson.accountingMethodCode, "FAKTURERINGSMETOD");
    assert.equal(onboardingProfile.financeFoundationJson.status, "finance_ready");
    assert.equal(onboardingProfile.financeFoundationJson.vatProfile.vatCodeCount > 0, true);
    assert.deepEqual(onboardingProfile.financeFoundationJson.queueStructure.queueCodes, [
      "finance_review",
      "payroll_review",
      "vat_decision_review"
    ]);

    const tenantProfile = await requestJson(baseUrl, `/v1/org/tenant-setup/profile?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(["finance_ready", "production_live", "pilot"].includes(tenantProfile.status), true);

    const canonicalTenantProfile = await requestJson(baseUrl, `/v1/tenant/bootstrap/profile?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(canonicalTenantProfile.companyId, DEMO_IDS.companyId);

    const approver = platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "api-module-approver@example.test",
      displayName: "API Module Approver",
      roleCode: "approver",
      requiresMfa: false
    });
    platform.createObjectGrant({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      companyUserId: approver.companyUserId,
      permissionCode: "company.manage",
      objectType: "module_activation",
      objectId: DEMO_IDS.companyId
    });

    const ledgerModule = await requestJson(baseUrl, "/v1/tenant/modules/definitions", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        moduleCode: "ledger",
        label: "Ledger",
        riskClass: "low",
        coreModule: true,
        requiredPolicyCodes: ["MODULE_ACTIVATION_AND_TENANT_SETUP"],
        requiredRulepackCodes: ["RP-ACCOUNTING-METHOD-SE"]
      }
    });
    const payrollModule = await requestJson(baseUrl, "/v1/tenant/modules/definitions", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        moduleCode: "payroll",
        label: "Payroll",
        riskClass: "high",
        dependencyModuleCodes: ["ledger"],
        requiredPolicyCodes: ["MODULE_ACTIVATION_AND_TENANT_SETUP", "PAYROLL_MIGRATION"],
        requiredRulepackCodes: ["RP-FISCAL-YEAR-SE", "RP-TAX-ACCOUNT-MAPPING-SE"]
      }
    });
    assert.equal(ledgerModule.moduleCode, "ledger");
    assert.equal(payrollModule.moduleCode, "payroll");

    const definitions = await requestJson(baseUrl, `/v1/tenant/modules/definitions?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(definitions.items.length >= 2, true);

    const missingDependency = await requestJson(baseUrl, "/v1/tenant/modules/activations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        moduleCode: "payroll",
        activationReason: "Payroll should wait for ledger.",
        approvalActorIds: [approver.user.userId]
      }
    });
    assert.equal(missingDependency.error, "module_activation_dependency_missing");

    const ledgerActivation = await requestJson(baseUrl, "/v1/tenant/modules/activations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        moduleCode: "ledger",
        activationReason: "Ledger is activated first."
      }
    });
    assert.equal(ledgerActivation.status, "active");

    const payrollActivation = await requestJson(baseUrl, "/v1/tenant/modules/activations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        moduleCode: "payroll",
        activationReason: "Payroll rollout for controlled pilot.",
        approvalActorIds: [approver.user.userId]
      }
    });
    assert.equal(payrollActivation.status, "active");
    assert.deepEqual(payrollActivation.approvalActorIds, [approver.user.userId]);

    const activations = await requestJson(baseUrl, `/v1/tenant/modules/activations?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(activations.items.some((item) => item.moduleCode === "ledger"), true);
    assert.equal(activations.items.some((item) => item.moduleCode === "payroll"), true);

    const suspended = await requestJson(baseUrl, "/v1/tenant/modules/activations/payroll/suspend", {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "ops_pause"
      }
    });
    assert.equal(suspended.status, "suspended");

    const trialEnvironment = await requestJson(baseUrl, "/v1/trial/environments", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        label: "Go-live trial",
        seedScenarioCode: "agency_trial_seed"
      }
    });
    assert.equal(trialEnvironment.mode, "trial");
    assert.equal(trialEnvironment.watermarkCode, "TRIAL");
    assert.equal(trialEnvironment.providerPolicyCode, "trial_safe_default");
    assert.equal(trialEnvironment.liveSubmissionPolicy, "blocked");
    assert.equal(trialEnvironment.supportsRealCredentials, false);
    assert.equal(trialEnvironment.supportsLegalEffect, false);
    assert.equal(trialEnvironment.promotionEligibleFlag, true);
    assert.equal(trialEnvironment.trialIsolationStatus, "isolated");
    assert.equal(trialEnvironment.blockedOperationClasses.includes("live_credentials"), true);
    assert.equal(trialEnvironment.providerPolicy.authProviders.length >= 2, true);
    assert.equal(trialEnvironment.requestedSeedScenarioCode, "agency_trial_seed");
    assert.equal(trialEnvironment.seedScenarioCode, "retainer_capacity_agency");
    assert.equal(trialEnvironment.seedScenarioVersion, "2026.1");
    assert.equal(trialEnvironment.seedScenarioSummary.documentCount > 0, true);

    const trialEnvironments = await requestJson(baseUrl, `/v1/trial/environments?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(trialEnvironments.items.some((item) => item.trialEnvironmentProfileId === trialEnvironment.trialEnvironmentProfileId), true);

    const refresh = await requestJson(baseUrl, `/v1/trial/environments/${trialEnvironment.trialEnvironmentProfileId}/refresh`, {
      method: "POST",
      token: adminToken,
      body: {
        refreshPackCode: "documents_and_work_items",
        reasonCode: "refresh_for_demo"
      }
    });
    assert.equal(refresh.refreshCount, 1);
    assert.equal(refresh.refreshHistory.length, 1);
    assert.equal(refresh.latestRefreshEvidenceBundleId != null, true);

    const reset = await requestJson(baseUrl, `/v1/trial/environments/${trialEnvironment.trialEnvironmentProfileId}/reset`, {
      method: "POST",
      token: adminToken,
      body: {
        reasonCode: "reset_for_demo"
      }
    });
    assert.equal(reset.resetCount, 1);
    assert.equal(reset.refreshCount, 0);
    assert.equal(reset.resetHistory.length, 1);
    assert.equal(reset.latestResetEvidenceBundleId != null, true);

    const promotion = await requestJson(baseUrl, "/v1/trial/promotions", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        trialEnvironmentProfileId: trialEnvironment.trialEnvironmentProfileId,
        carryOverSelectionCodes: ["settings", "document_templates"],
        approvalActorIds: [approver.user.userId]
      }
    });
    assert.equal(["approved", "validated"].includes(promotion.status), true);

    const promotions = await requestJson(baseUrl, `/v1/trial/promotions?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(promotions.items.length >= 1, true);

    const parallelRun = await requestJson(baseUrl, "/v1/tenant/parallel-runs", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        trialEnvironmentProfileId: trialEnvironment.trialEnvironmentProfileId,
        runWindowDays: 21
      }
    });
    assert.equal(parallelRun.status, "started");
  } finally {
    await stopServer(server);
  }
});
