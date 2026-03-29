import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { loginWithStrongAuthOnPlatform } from "../helpers/platform-auth.mjs";

const GO_LIVE_GATES = [
  "finance_hygiene",
  "payroll_correctness",
  "regulated_submissions_recovery",
  "general_project_core",
  "field_pack_targeted",
  "trial_to_live",
  "migration_cutover",
  "api_webhooks",
  "bankid_sso_backoffice"
];
const FINANCE_SCENARIOS = [
  "finance_core",
  "vat_cycle",
  "payroll_agi",
  "tax_account_reconciliation",
  "annual_reporting",
  "support_operations"
];
const SERVICE_PROJECT_SCENARIOS = [
  ...FINANCE_SCENARIOS,
  "project_profitability"
];
const CONSTRUCTION_SCENARIOS = [
  "finance_core",
  "vat_cycle",
  "payroll_agi",
  "hus_claim",
  "tax_account_reconciliation",
  "annual_reporting",
  "support_operations",
  "project_profitability",
  "personalliggare_id06"
];
const FINANCE_CRITERIA = [
  "finance_ready_tenant_setup",
  "accounting_ap_ar_bank_vat",
  "payroll_agi",
  "annual_reporting_declarations",
  "integrations_api_webhooks",
  "migration_support_operations"
];
const SERVICE_CRITERIA = [
  "portfolio_project_status",
  "resource_capacity",
  "quote_to_project_handoff",
  "time_expense_material_to_invoice",
  "project_profitability",
  "customer_context_execution"
];
const FIELD_CRITERIA = [
  "work_order_service_order",
  "material_photo_signature_evidence",
  "personalliggare",
  "simple_field_execution",
  "change_order_semantics",
  "id06_compliance"
];
const GREEN_MOVES = [
  "tax_account_cockpit",
  "unified_receipts_recovery",
  "migration_concierge",
  "safe_trial_to_live",
  "project_profitability_mission_control"
].map((moveCode) => ({
  moveCode,
  status: "green",
  evidenceRefs: [`advantage://${moveCode}/green`]
}));

test("Phase 18.5 records frozen UI contract baseline when released advantage bundle exists", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T23:15:00Z")
  });
  const tenantControl = platform.getDomain("tenantControl");
  loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  const financeReady = bootstrapFinanceReadyCompany({
    tenantControl,
    legalName: "Phase 18 UI Freeze AB",
    orgNumber: "559901-0054",
    adminEmail: "phase18-ui-freeze-owner@example.test"
  });
  const companyToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: financeReady.companyId,
    email: financeReady.adminEmail
  });
  const financeApprover = platform.createCompanyUser({
    sessionToken: companyToken,
    companyId: financeReady.companyId,
    email: "phase18-ui-freeze-finance@example.test",
    displayName: "Phase 18 UI Freeze Finance",
    roleCode: "approver",
    requiresMfa: true
  });
  const supportApprover = platform.createCompanyUser({
    sessionToken: companyToken,
    companyId: financeReady.companyId,
    email: "phase18-ui-freeze-support@example.test",
    displayName: "Phase 18 UI Freeze Support",
    roleCode: "bureau_user",
    requiresMfa: true
  });
  const releasedBundle = createReleasedAdvantageBundle({
    tenantControl,
    companyToken,
    companyId: financeReady.companyId,
    financeApproverUserId: financeApprover.user.userId,
    supportApproverUserId: supportApprover.user.userId
  });

  const freezeRecord = tenantControl.recordUiContractFreeze({
    sessionToken: companyToken,
    companyId: financeReady.companyId,
    advantageReleaseBundleId: releasedBundle.advantageReleaseBundleId,
    contractSnapshot: buildMinimalUiContractSnapshot(),
    notes: "UI backend contracts frozen."
  });

  assert.equal(freezeRecord.status, "frozen");
  assert.equal(freezeRecord.summary.objectProfileCount, 2);
  assert.equal(freezeRecord.summary.workbenchCount, 2);
  assert.equal(freezeRecord.summary.totalRouteContractCount, 4);
  assert.equal(freezeRecord.summary.commandCount >= 4, true);
  assert.deepEqual(freezeRecord.summary.surfaceFamilyCodes, ["backoffice", "desktop", "field"]);
  assert.equal(typeof freezeRecord.hashes.aggregateHash, "string");
  assert.equal(freezeRecord.hashes.aggregateHash.length, 64);

  const evidence = tenantControl.exportUiContractFreezeEvidence({
    sessionToken: companyToken,
    uiContractFreezeRecordId: freezeRecord.uiContractFreezeRecordId
  });
  const artifactRefs = evidence.artifacts || evidence.artifactRefs || [];
  assert.equal(evidence.bundleType, "ui_contract_freeze_record");
  assert.equal(artifactRefs.some((artifact) => artifact.artifactType === "ui_contract_freeze_manifest"), true);
});

test("Phase 18.5 rejects freeze when linked advantage bundle is not released", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T23:20:00Z")
  });
  const tenantControl = platform.getDomain("tenantControl");
  loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  const financeReady = bootstrapFinanceReadyCompany({
    tenantControl,
    legalName: "Phase 18 UI Freeze Guard AB",
    orgNumber: "559901-0062",
    adminEmail: "phase18-ui-freeze-guard@example.test"
  });
  const companyToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: financeReady.companyId,
    email: financeReady.adminEmail
  });
  const blockedBundle = tenantControl.recordAdvantageReleaseBundle({
    sessionToken: companyToken,
    companyId: financeReady.companyId,
    parityScorecardIds: [],
    moveResults: GREEN_MOVES
  });

  assert.equal(blockedBundle.status, "blocked");
  assert.throws(
    () =>
      tenantControl.recordUiContractFreeze({
        sessionToken: companyToken,
        companyId: financeReady.companyId,
        advantageReleaseBundleId: blockedBundle.advantageReleaseBundleId,
        contractSnapshot: buildMinimalUiContractSnapshot()
      }),
    (error) => error?.code === "ui_contract_freeze_requires_released_advantage_bundle"
  );
});

function createReleasedAdvantageBundle({
  tenantControl,
  companyToken,
  companyId,
  financeApproverUserId,
  supportApproverUserId
}) {
  const financeScorecard = createAcceptedCohortAndParityScorecard({
    tenantControl,
    companyToken,
    companyId,
    financeApproverUserId,
    supportApproverUserId,
    label: "Finance parity",
    segmentCode: "finance_payroll_ab",
    scenarioCodes: FINANCE_SCENARIOS,
    competitorCode: "fortnox",
    criteriaCodes: FINANCE_CRITERIA,
    cutoverTemplateRef: "cutover-template://finance/v1"
  });
  const serviceScorecard = createAcceptedCohortAndParityScorecard({
    tenantControl,
    companyToken,
    companyId,
    financeApproverUserId,
    supportApproverUserId,
    label: "Service parity",
    segmentCode: "service_project_company",
    scenarioCodes: SERVICE_PROJECT_SCENARIOS,
    competitorCode: "teamleader",
    criteriaCodes: SERVICE_CRITERIA,
    cutoverTemplateRef: "cutover-template://service/v1"
  });
  const fieldScorecard = createAcceptedCohortAndParityScorecard({
    tenantControl,
    companyToken,
    companyId,
    financeApproverUserId,
    supportApproverUserId,
    label: "Field parity",
    segmentCode: "construction_service_id06",
    scenarioCodes: CONSTRUCTION_SCENARIOS,
    competitorCode: "bygglet",
    criteriaCodes: FIELD_CRITERIA,
    cutoverTemplateRef: "cutover-template://construction/v1"
  });
  return tenantControl.recordAdvantageReleaseBundle({
    sessionToken: companyToken,
    companyId,
    parityScorecardIds: [
      financeScorecard.parityScorecardId,
      serviceScorecard.parityScorecardId,
      fieldScorecard.parityScorecardId
    ],
    moveResults: GREEN_MOVES
  });
}

function createAcceptedCohortAndParityScorecard({
  tenantControl,
  companyToken,
  companyId,
  financeApproverUserId,
  supportApproverUserId,
  label,
  segmentCode,
  scenarioCodes,
  competitorCode,
  criteriaCodes,
  cutoverTemplateRef
}) {
  const cohort = createAcceptedPilotCohort({
    tenantControl,
    companyToken,
    companyId,
    financeApproverUserId,
    supportApproverUserId,
    label,
    segmentCode,
    scenarioCodes,
    cutoverTemplateRef
  });
  return tenantControl.recordParityScorecard({
    sessionToken: companyToken,
    companyId,
    competitorCode,
    pilotCohortIds: [cohort.pilotCohortId],
    criteriaResults: criteriaCodes.map((criterionCode) => ({
      criterionCode,
      status: "green",
      evidenceRefs: [`evidence://${criterionCode}/green`]
    })),
    gateResults: GO_LIVE_GATES.map((gateCode) => ({
      gateCode,
      status: "green",
      evidenceRefs: [`gate://${gateCode}/green`]
    }))
  });
}

function createAcceptedPilotCohort({
  tenantControl,
  companyToken,
  companyId,
  financeApproverUserId,
  supportApproverUserId,
  label,
  segmentCode,
  scenarioCodes,
  cutoverTemplateRef
}) {
  const pilot = tenantControl.startPilotExecution({
    sessionToken: companyToken,
    companyId,
    label,
    scenarioCodes
  });
  for (const scenarioCode of scenarioCodes) {
    tenantControl.recordPilotScenarioOutcome({
      sessionToken: companyToken,
      pilotExecutionId: pilot.pilotExecutionId,
      scenarioCode,
      status: "passed",
      evidenceRefs: [`runbook://${scenarioCode}/passed`]
    });
  }
  tenantControl.completePilotExecution({
    sessionToken: companyToken,
    pilotExecutionId: pilot.pilotExecutionId,
    approvalActorIds: [financeApproverUserId, supportApproverUserId],
    rollbackStrategyCode: "restore_previous_live_and_reconcile",
    rollbackEvidenceRefs: ["runbook://rollback/verified"]
  });
  const cohort = tenantControl.startPilotCohort({
    sessionToken: companyToken,
    companyId,
    segmentCode,
    pilotExecutionIds: [pilot.pilotExecutionId]
  });
  return tenantControl.assessPilotCohort({
    sessionToken: companyToken,
    pilotCohortId: cohort.pilotCohortId,
    decision: "accepted",
    approvalActorIds: [financeApproverUserId, supportApproverUserId],
    reusableCutoverTemplateRefs: [cutoverTemplateRef],
    rollbackEvidenceRefs: ["runbook://rollback/verified"]
  });
}

function bootstrapFinanceReadyCompany({ tenantControl, legalName, orgNumber, adminEmail }) {
  const onboardingRun = tenantControl.createTenantBootstrap({
    legalName,
    orgNumber,
    adminEmail,
    adminDisplayName: "Phase 18 UI Freeze Owner",
    accountingYear: "2026"
  });
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
  return {
    companyId: onboardingRun.companyId,
    adminEmail
  };
}

function buildMinimalUiContractSnapshot() {
  return {
    objectProfileContracts: [
      {
        profileType: "PayRunProfile",
        objectType: "payRun",
        surfaceCodes: ["desktop.payroll"],
        sectionCodes: ["employees", "postingPreview"],
        blockerCodes: ["missing_tax_table_or_sink_decision"],
        actionContracts: [
          {
            actionCode: "payroll.approve",
            actionClass: "payroll",
            requiresStepUp: true,
            requiresDualControl: false,
            receiptRequired: true,
            reviewRequired: true,
            forbiddenReasonCodes: []
          }
        ]
      },
      {
        profileType: "SupportCaseProfile",
        objectType: "supportCase",
        surfaceCodes: ["backoffice.ops"],
        sectionCodes: ["caseContext", "audit"],
        blockerCodes: ["missing_dual_control"],
        actionContracts: [
          {
            actionCode: "support.closeCase",
            actionClass: "support",
            requiresStepUp: true,
            requiresDualControl: true,
            receiptRequired: true,
            reviewRequired: true,
            forbiddenReasonCodes: ["missing_permission"]
          }
        ]
      }
    ],
    workbenchContracts: [
      {
        workbenchCode: "PayrollWorkbench",
        title: "Payroll workbench",
        surfaceCodes: ["desktop.payroll"],
        commandBarActionCodes: ["payroll.createRun"],
        bulkActionCodes: ["agi.collectReceipts"]
      },
      {
        workbenchCode: "FieldOpsWorkbench",
        title: "Field workbench",
        surfaceCodes: ["desktop.field"],
        commandBarActionCodes: ["field.openDispatch"],
        bulkActionCodes: ["field.assignDispatch"]
      }
    ],
    readRouteContracts: [
      { method: "GET", path: "/v1/object-profiles/contracts", contractKind: "contract_catalog", surfaceFamilyCodes: ["desktop"] },
      { method: "GET", path: "/v1/workbenches/contracts", contractKind: "contract_catalog", surfaceFamilyCodes: ["desktop"] }
    ],
    actionRouteContracts: [
      {
        method: "POST",
        path: "/v1/backoffice/support-cases/:supportCaseId/close",
        routeFamily: "backoffice",
        requiredActionClass: "support_case_operate",
        requiredTrustLevel: "strong_mfa",
        requiredScopeType: "support_case",
        scopeCode: "support_case",
        objectType: "support_case",
        permissionCode: "company.manage",
        expectedObjectVersion: true,
        contractKind: "action",
        surfaceFamilyCodes: ["backoffice"]
      },
      {
        method: "POST",
        path: "/v1/field/operational-cases/:operationalCaseId/conflicts/:conflictRecordId/resolve",
        routeFamily: "field",
        requiredActionClass: "field_conflict_record_resolve",
        requiredTrustLevel: "strong_mfa",
        requiredScopeType: "project",
        scopeCode: "field_operational_case",
        objectType: "field_operational_case",
        permissionCode: "company.manage",
        expectedObjectVersion: true,
        contractKind: "action",
        surfaceFamilyCodes: ["field"]
      }
    ],
    commandCatalog: [
      { commandCode: "payroll.approve", sourceType: "object_profile_action", surfaceCodes: ["desktop.payroll"] },
      { commandCode: "support.closeCase", sourceType: "object_profile_action", surfaceCodes: ["backoffice.ops"] },
      { commandCode: "payroll.createRun", sourceType: "workbench_command_bar", surfaceCodes: ["desktop.payroll"] },
      { commandCode: "field.openDispatch", sourceType: "workbench_command_bar", surfaceCodes: ["desktop.field"] }
    ],
    blockerCatalog: [
      { blockerCode: "missing_tax_table_or_sink_decision", surfaceCodes: ["desktop.payroll"] },
      { blockerCode: "missing_dual_control", surfaceCodes: ["backoffice.ops"] }
    ],
    permissionReasonCatalog: [
      { reasonCode: "missing_permission", surfaceFamilyCodes: ["desktop", "backoffice", "field"] },
      { reasonCode: "trust_level_insufficient", surfaceFamilyCodes: ["desktop", "backoffice", "field"] },
      { reasonCode: "field_control_role_forbidden", surfaceFamilyCodes: ["field"] }
    ]
  };
}
