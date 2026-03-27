import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { loginWithStrongAuthOnPlatform } from "../helpers/platform-auth.mjs";

test("Phase 1 tenant setup flows through tenant-control with finance-ready state, module activation and trial lifecycles", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-25T08:00:00Z"),
    bootstrapScenarioCode: "test_default_demo"
  });
  const tenantControl = platform.getDomain("tenantControl");

  const onboardingRun = tenantControl.createTenantBootstrap({
    legalName: "Tenant Setup AB",
    orgNumber: "559900-4242",
    adminEmail: "owner@tenant-setup.test",
    adminDisplayName: "Owner Admin",
    accountingYear: "2026"
  });

  let snapshot = tenantControl.snapshotTenantControl();
  const createdProfile = snapshot.companySetupProfiles.find((profile) => profile.companyId === onboardingRun.companyId);
  const createdBootstrap = snapshot.tenantBootstraps.find((record) => record.companyId === onboardingRun.companyId);
  assert.equal(createdBootstrap.bootstrapStatus, "in_progress");
  assert.equal(createdProfile.status, "bootstrap_running");
  assert.equal(onboardingRun.companySetupStatus, "bootstrap_running");

  tenantControl.updateTenantBootstrapStep({
    tenantBootstrapId: onboardingRun.tenantBootstrapId,
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
  tenantControl.updateTenantBootstrapStep({
    tenantBootstrapId: onboardingRun.tenantBootstrapId,
    resumeToken: onboardingRun.resumeToken,
    stepCode: "chart_template",
    payload: {
      chartTemplateId: "DSAM-2026",
      voucherSeriesCodes: ["A", "B", "E", "H", "I"]
    }
  });
  tenantControl.updateTenantBootstrapStep({
    tenantBootstrapId: onboardingRun.tenantBootstrapId,
    resumeToken: onboardingRun.resumeToken,
    stepCode: "vat_setup",
    payload: {
      vatScheme: "se_standard",
      filingPeriod: "monthly"
    }
  });
  tenantControl.updateTenantBootstrapStep({
    tenantBootstrapId: onboardingRun.tenantBootstrapId,
    resumeToken: onboardingRun.resumeToken,
    stepCode: "fiscal_periods",
    payload: {
      year: 2026
    }
  });

  snapshot = tenantControl.snapshotTenantControl();
  const completedProfile = snapshot.companySetupProfiles.find((profile) => profile.companyId === onboardingRun.companyId);
  const completedBootstrap = snapshot.tenantBootstraps.find((record) => record.companyId === onboardingRun.companyId);
  assert.equal(completedBootstrap.bootstrapStatus, "completed");
  assert.equal(completedProfile.status, "finance_ready");
  assert.equal(Boolean(completedProfile.onboardingCompletedAt), true);

  const onboardingAdminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: onboardingRun.companyId,
    email: "owner@tenant-setup.test"
  });
  assert.ok(onboardingAdminToken);
  const legalFormDomain = platform.getDomain("legalForm");
  const accountingMethodDomain = platform.getDomain("accountingMethod");
  const fiscalYearDomain = platform.getDomain("fiscalYear");
  const ledgerDomain = platform.getDomain("ledger");
  const vatDomain = platform.getDomain("vat");
  const reviewCenterDomain = platform.getDomain("reviewCenter");
  const financeReadiness = tenantControl.getFinanceReadinessValidation({
    sessionToken: onboardingAdminToken,
    companyId: onboardingRun.companyId
  });
  assert.equal(financeReadiness.status, "finance_ready");
  assert.equal(financeReadiness.checks.every((item) => item.status === "completed"), true);
  const canonicalProfile = tenantControl.getCompanySetupProfile({
    sessionToken: onboardingAdminToken,
    companyId: onboardingRun.companyId
  });
  assert.equal(canonicalProfile.financeBlueprintJson.legalFormCode, "AKTIEBOLAG");
  assert.equal(canonicalProfile.financeBlueprintJson.accountingMethodCode, "FAKTURERINGSMETOD");
  assert.equal(canonicalProfile.financeFoundationJson.status, "finance_ready");
  assert.equal(canonicalProfile.financeFoundationJson.voucherSeriesCount > 0, true);
  assert.equal(canonicalProfile.financeFoundationJson.vatProfile.vatCodeCount > 0, true);
  assert.deepEqual(canonicalProfile.financeFoundationJson.queueStructure.queueCodes, [
    "finance_review",
    "payroll_review",
    "vat_decision_review"
  ]);
  assert.equal(
    legalFormDomain.listLegalFormProfiles({ companyId: onboardingRun.companyId }).some(
      (profile) => profile.status === "active" && profile.legalFormCode === "AKTIEBOLAG"
    ),
    true
  );
  assert.equal(
    legalFormDomain.listReportingObligationProfiles({ companyId: onboardingRun.companyId }).some(
      (profile) => profile.status === "approved"
    ),
    true
  );
  assert.equal(
    accountingMethodDomain.listMethodProfiles({ companyId: onboardingRun.companyId }).some(
      (profile) => profile.status === "active" && profile.methodCode === "FAKTURERINGSMETOD"
    ),
    true
  );
  assert.equal(
    Boolean(fiscalYearDomain.getActiveFiscalYearForDate({ companyId: onboardingRun.companyId, accountingDate: "2026-01-01" })),
    true
  );
  assert.equal(ledgerDomain.listLedgerAccounts({ companyId: onboardingRun.companyId }).length > 0, true);
  assert.equal(ledgerDomain.listVoucherSeries({ companyId: onboardingRun.companyId }).length > 0, true);
  assert.equal(vatDomain.listVatCodes({ companyId: onboardingRun.companyId }).length > 0, true);
  assert.equal(
    reviewCenterDomain
      .listReviewCenterQueues({ companyId: onboardingRun.companyId })
      .map((queue) => String(queue.queueCode).toLowerCase())
      .sort()
      .join(","),
    "finance_review,payroll_review,vat_decision_review"
  );

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
  platform.createObjectGrant({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    companyUserId: approver.companyUserId,
    permissionCode: "company.manage",
    objectType: "module_activation",
    objectId: DEMO_IDS.companyId
  });

  const ledgerModule = tenantControl.registerTenantModuleDefinition({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    moduleCode: "ledger",
    label: "Ledger",
    riskClass: "low",
    coreModule: true,
    requiredPolicyCodes: ["MODULE_ACTIVATION_AND_TENANT_SETUP"],
    requiredRulepackCodes: ["RP-ACCOUNTING-METHOD-SE"]
  });
  const payrollModule = tenantControl.registerTenantModuleDefinition({
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
      tenantControl.activateTenantModule({
        sessionToken: adminToken,
        companyId: DEMO_IDS.companyId,
        moduleCode: "payroll",
        activationReason: "Prepare payroll rollout.",
        approvalActorIds: [approver.user.userId]
      }),
    (error) => error?.code === "module_activation_dependency_missing"
  );

  const ledgerActivation = tenantControl.activateTenantModule({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    moduleCode: "ledger",
    activationReason: "Ledger is required for all accounting flows."
  });
  assert.equal(ledgerActivation.status, "active");

  const payrollActivation = tenantControl.activateTenantModule({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    moduleCode: "payroll",
    activationReason: "Payroll rollout for migration wave 1.",
    approvalActorIds: [approver.user.userId]
  });
  assert.equal(payrollActivation.status, "active");

  const suspended = tenantControl.suspendTenantModuleActivation({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    moduleCode: "payroll",
    reasonCode: "tenant_hold"
  });
  assert.equal(suspended.status, "suspended");

  const trialEnvironment = tenantControl.createTrialEnvironment({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    seedScenarioCode: "agency_trial_seed"
  });
  assert.equal(trialEnvironment.liveCredentialPolicy, "blocked");

  const resetTrialEnvironment = tenantControl.resetTrialEnvironment({
    sessionToken: adminToken,
    trialEnvironmentProfileId: trialEnvironment.trialEnvironmentProfileId,
    reasonCode: "verification_reset"
  });
  assert.equal(resetTrialEnvironment.resetCount, 1);

  const promotionPlan = tenantControl.promoteTrialToLive({
    sessionToken: adminToken,
    trialEnvironmentProfileId: trialEnvironment.trialEnvironmentProfileId,
    carryOverSelectionCodes: ["settings", "document_templates"],
    approvalActorIds: [approver.user.userId]
  });
  assert.equal(["approved", "validated"].includes(promotionPlan.status), true);

  const parallelRunPlan = tenantControl.startParallelRun({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    trialEnvironmentProfileId: trialEnvironment.trialEnvironmentProfileId,
    runWindowDays: 14
  });
  assert.equal(parallelRunPlan.status, "started");

  snapshot = tenantControl.snapshotTenantControl();
  assert.equal(snapshot.moduleActivationProfiles.some((item) => item.moduleCode === "payroll" && item.status === "suspended"), true);
  assert.equal(snapshot.trialEnvironmentProfiles.length >= 1, true);
  assert.equal(snapshot.promotionPlans.length >= 1, true);
  assert.equal(snapshot.parallelRunPlans.length >= 1, true);
});
