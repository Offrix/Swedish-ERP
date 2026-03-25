import test from "node:test";
import assert from "node:assert/strict";
import { createOrgAuthPlatform, DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { loginWithStrongAuthOnPlatform } from "../helpers/platform-auth.mjs";

test("Phase 1 tenant setup and module activation enforce onboarding readiness, dependencies and approvals", () => {
  const platform = createOrgAuthPlatform({
    clock: () => new Date("2026-03-25T08:00:00Z")
  });

  const onboardingRun = platform.createOnboardingRun({
    legalName: "Tenant Setup AB",
    orgNumber: "559900-4242",
    adminEmail: "owner@tenant-setup.test",
    adminDisplayName: "Owner Admin",
    accountingYear: "2026"
  });
  let snapshot = platform.snapshot();
  const createdCompany = snapshot.companies.find((company) => company.companyId === onboardingRun.companyId);
  const createdProfile = snapshot.tenantSetupProfiles.find((profile) => profile.companyId === onboardingRun.companyId);
  assert.equal(createdCompany.status, "setup_pending");
  assert.equal(createdProfile.status, "setup_pending");

  platform.updateOnboardingStep({
    runId: onboardingRun.runId,
    resumeToken: onboardingRun.resumeToken,
    stepCode: "registrations",
    payload: {
      registrations: [
        { registrationType: "f_tax", registrationValue: "configured-f-tax", status: "configured" },
        { registrationType: "vat", registrationValue: "configured-vat", status: "configured" },
        { registrationType: "employer", registrationValue: "configured-employer", status: "configured" }
      ]
    }
  });
  platform.updateOnboardingStep({
    runId: onboardingRun.runId,
    resumeToken: onboardingRun.resumeToken,
    stepCode: "chart_template",
    payload: {
      chartTemplateId: "DSAM-2026",
      voucherSeriesCodes: ["A", "B", "E", "H", "I"]
    }
  });
  platform.updateOnboardingStep({
    runId: onboardingRun.runId,
    resumeToken: onboardingRun.resumeToken,
    stepCode: "vat_setup",
    payload: {
      vatScheme: "se_standard",
      filingPeriod: "monthly"
    }
  });
  platform.updateOnboardingStep({
    runId: onboardingRun.runId,
    resumeToken: onboardingRun.resumeToken,
    stepCode: "fiscal_periods",
    payload: {
      year: 2026
    }
  });

  snapshot = platform.snapshot();
  const completedCompany = snapshot.companies.find((company) => company.companyId === onboardingRun.companyId);
  const completedProfile = snapshot.tenantSetupProfiles.find((profile) => profile.companyId === onboardingRun.companyId);
  assert.equal(completedCompany.status, "active");
  assert.equal(completedProfile.status, "active");
  assert.equal(Boolean(completedProfile.onboardingCompletedAt), true);

  const onboardingAdminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: onboardingRun.companyId,
    email: "owner@tenant-setup.test"
  });
  assert.ok(onboardingAdminToken);

  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });

  const approver = platform.createCompanyUser({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    email: "module-approver@example.test",
    displayName: "Module Approver",
    roleCode: "approver",
    requiresMfa: false
  });
  const companyAdmin = platform.createCompanyUser({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    email: "finance-admin@example.test",
    displayName: "Finance Admin",
    roleCode: "company_admin",
    requiresMfa: false
  });
  const companyAdminLogin = platform.startLogin({
    companyId: DEMO_IDS.companyId,
    email: "finance-admin@example.test"
  });
  const companyAdminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: "finance-admin@example.test"
  });
  assert.ok(companyAdmin.companyUserId);
  assert.equal(companyAdmin.requiresMfa, true);
  assert.equal(companyAdminLogin.session.requiredFactorCount, 2);
  assert.deepEqual(companyAdminLogin.availableMethods.sort(), ["bankid", "totp"]);
  assert.ok(companyAdminToken);
  platform.createObjectGrant({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    companyUserId: approver.companyUserId,
    permissionCode: "company.manage",
    objectType: "module_activation",
    objectId: DEMO_IDS.companyId
  });

  const ledgerModule = platform.registerModuleDefinition({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    moduleCode: "ledger",
    label: "Ledger",
    riskClass: "low",
    coreModule: true,
    requiredPolicyCodes: ["MODULE_ACTIVATION_AND_TENANT_SETUP"],
    requiredRulepackCodes: ["RP-ACCOUNTING-METHOD-SE"]
  });
  const payrollModule = platform.registerModuleDefinition({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    moduleCode: "payroll",
    label: "Payroll",
    riskClass: "high",
    dependencyModuleCodes: ["ledger"],
    requiredPolicyCodes: ["MODULE_ACTIVATION_AND_TENANT_SETUP", "DOCUMENT_REVIEW_AND_ECONOMIC_DECISION"],
    requiredRulepackCodes: ["RP-FISCAL-YEAR-SE", "RP-TAX-ACCOUNT-MAPPING-SE"]
  });
  assert.equal(ledgerModule.coreModule, true);
  assert.equal(payrollModule.dependencyModuleCodes[0], "ledger");

  assert.throws(
    () =>
      platform.activateModule({
        sessionToken: adminToken,
        companyId: DEMO_IDS.companyId,
        moduleCode: "payroll",
        activationReason: "Prepare payroll rollout.",
        approvalActorIds: [approver.user.userId]
      }),
    (error) => error?.code === "module_activation_dependency_missing"
  );

  const ledgerActivation = platform.activateModule({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    moduleCode: "ledger",
    activationReason: "Ledger is required for all accounting flows."
  });
  assert.equal(ledgerActivation.status, "active");

  assert.throws(
    () =>
      platform.activateModule({
        sessionToken: adminToken,
        companyId: DEMO_IDS.companyId,
        moduleCode: "payroll",
        activationReason: "Prepare payroll rollout.",
        approvalActorIds: [DEMO_IDS.userId]
      }),
    (error) => error?.code === "module_activation_self_approval_forbidden"
  );

  const payrollActivation = platform.activateModule({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    moduleCode: "payroll",
    activationReason: "Payroll rollout for migration wave 1.",
    approvalActorIds: [approver.user.userId]
  });
  assert.equal(payrollActivation.status, "active");
  assert.deepEqual(payrollActivation.approvalActorIds, [approver.user.userId]);

  const suspended = platform.suspendModuleActivation({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    moduleCode: "payroll",
    reasonCode: "tenant_hold"
  });
  assert.equal(suspended.status, "suspended");

  snapshot = platform.snapshot();
  const activationAudit = snapshot.auditEvents.find((event) => event.action === "tenant_setup.module_activation.activated" && event.metadata?.moduleCode === "payroll");
  const suspensionAudit = snapshot.auditEvents.find((event) => event.action === "tenant_setup.module_activation.suspended" && event.metadata?.moduleCode === "payroll");
  assert.deepEqual(activationAudit.metadata.approvalActorIds, [approver.user.userId]);
  assert.equal(activationAudit.metadata.activationReason, "Payroll rollout for migration wave 1.");
  assert.equal(suspensionAudit.metadata.reasonCode, "tenant_hold");
});
