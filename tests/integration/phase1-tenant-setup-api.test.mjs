import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer, readText } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 1 tenant setup migration creates setup and module activation tables", async () => {
  const migration = await readText("packages/db/migrations/20260325030000_phase1_tenant_setup_module_activation.sql");
  for (const tableName of ["tenant_setup_profiles", "module_definitions", "module_activations"]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName.replaceAll("_", "\\_")}`));
  }
});

test("Phase 1 API exposes tenant setup profile and module activation lifecycle", async () => {
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
    assert.equal(root.routes.includes("/v1/org/tenant-setup/profile"), true);
    assert.equal(root.routes.includes("/v1/org/module-activations"), true);

    const tenantProfile = await requestJson(baseUrl, `/v1/org/tenant-setup/profile?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(tenantProfile.status, "active");

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

    const ledgerModule = await requestJson(baseUrl, "/v1/org/module-definitions", {
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
    const payrollModule = await requestJson(baseUrl, "/v1/org/module-definitions", {
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

    const definitions = await requestJson(baseUrl, `/v1/org/module-definitions?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(definitions.items.length >= 2, true);

    const missingDependency = await requestJson(baseUrl, "/v1/org/module-activations", {
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

    const ledgerActivation = await requestJson(baseUrl, "/v1/org/module-activations", {
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

    const missingApproval = await requestJson(baseUrl, "/v1/org/module-activations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        moduleCode: "payroll",
        activationReason: "Payroll rollout without approver should fail."
      }
    });
    assert.equal(missingApproval.error, "module_activation_approval_required");

    const payrollActivation = await requestJson(baseUrl, "/v1/org/module-activations", {
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

    const activations = await requestJson(baseUrl, `/v1/org/module-activations?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(activations.items.some((item) => item.moduleCode === "ledger"), true);
    assert.equal(activations.items.some((item) => item.moduleCode === "payroll"), true);

    const suspended = await requestJson(baseUrl, "/v1/org/module-activations/payroll/suspend", {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "ops_pause"
      }
    });
    assert.equal(suspended.status, "suspended");

    const snapshot = platform.snapshot();
    const auditEvent = snapshot.auditEvents.find((event) => event.action === "tenant_setup.module_activation.activated" && event.metadata?.moduleCode === "payroll");
    assert.deepEqual(auditEvent.metadata.approvalActorIds, [approver.user.userId]);
    assert.equal(auditEvent.metadata.activationReason, "Payroll rollout for controlled pilot.");
  } finally {
    await stopServer(server);
  }
});
