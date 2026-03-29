import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { loginWithStrongAuthOnPlatform } from "../helpers/platform-auth.mjs";

const FINAL_CHECKLIST_CODES = [
  "technical",
  "regulated",
  "support",
  "migration",
  "security",
  "parity",
  "advantage",
  "trial_sales_readiness"
];
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
const PARITY_SLICES = [
  {
    label: "Finance parity",
    segmentCode: "finance_payroll_ab",
    competitorCode: "fortnox",
    cutoverTemplateRef: "cutover-template://finance/v1",
    scenarioCodes: [
      "finance_core",
      "vat_cycle",
      "payroll_agi",
      "tax_account_reconciliation",
      "annual_reporting",
      "support_operations"
    ],
    criteriaCodes: [
      "finance_ready_tenant_setup",
      "accounting_ap_ar_bank_vat",
      "payroll_agi",
      "annual_reporting_declarations",
      "integrations_api_webhooks",
      "migration_support_operations"
    ]
  },
  {
    label: "Service parity",
    segmentCode: "service_project_company",
    competitorCode: "teamleader",
    cutoverTemplateRef: "cutover-template://service/v1",
    scenarioCodes: [
      "finance_core",
      "vat_cycle",
      "payroll_agi",
      "tax_account_reconciliation",
      "annual_reporting",
      "support_operations",
      "project_profitability"
    ],
    criteriaCodes: [
      "portfolio_project_status",
      "resource_capacity",
      "quote_to_project_handoff",
      "time_expense_material_to_invoice",
      "project_profitability",
      "customer_context_execution"
    ]
  },
  {
    label: "Field parity",
    segmentCode: "construction_service_id06",
    competitorCode: "bygglet",
    cutoverTemplateRef: "cutover-template://construction/v1",
    scenarioCodes: [
      "finance_core",
      "vat_cycle",
      "payroll_agi",
      "hus_claim",
      "tax_account_reconciliation",
      "annual_reporting",
      "support_operations",
      "project_profitability",
      "personalliggare_id06"
    ],
    criteriaCodes: [
      "work_order_service_order",
      "material_photo_signature_evidence",
      "personalliggare",
      "simple_field_execution",
      "change_order_semantics",
      "id06_compliance"
    ]
  }
];
const SUPPLEMENTAL_SEGMENTS = [
  {
    label: "HUS pilot",
    segmentCode: "hus_business",
    cutoverTemplateRef: "cutover-template://hus/v1",
    scenarioCodes: [
      "finance_core",
      "vat_cycle",
      "payroll_agi",
      "hus_claim",
      "tax_account_reconciliation",
      "annual_reporting",
      "support_operations"
    ]
  },
  {
    label: "Enterprise pilot",
    segmentCode: "enterprise_sso_customer",
    cutoverTemplateRef: "cutover-template://enterprise/v1",
    scenarioCodes: [
      "finance_core",
      "vat_cycle",
      "payroll_agi",
      "tax_account_reconciliation",
      "annual_reporting",
      "support_operations",
      "enterprise_auth"
    ]
  }
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

test("Phase 18.6 records approved final go-live gate when every prerequisite is green", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-30T00:05:00Z")
  });
  const tenantControl = platform.getDomain("tenantControl");
  loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  const financeReady = bootstrapFinanceReadyCompany({
    tenantControl,
    legalName: "Phase 18 GA Gate AB",
    orgNumber: "559901-0101",
    adminEmail: "phase18-go-live-owner@example.test"
  });
  const companyToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: financeReady.companyId,
    email: financeReady.adminEmail
  });
  const financeApprover = platform.createCompanyUser({
    sessionToken: companyToken,
    companyId: financeReady.companyId,
    email: "phase18-go-live-finance@example.test",
    displayName: "Phase 18 Go Live Finance",
    roleCode: "approver",
    requiresMfa: true
  });
  const supportApprover = platform.createCompanyUser({
    sessionToken: companyToken,
    companyId: financeReady.companyId,
    email: "phase18-go-live-support@example.test",
    displayName: "Phase 18 Go Live Support",
    roleCode: "bureau_user",
    requiresMfa: true
  });

  const releaseArtifacts = createReleasedGoLiveArtifacts({
    tenantControl,
    companyToken,
    companyId: financeReady.companyId,
    financeApproverUserId: financeApprover.user.userId,
    supportApproverUserId: supportApprover.user.userId
  });
  const gate = tenantControl.recordGoLiveGate({
    sessionToken: companyToken,
    companyId: financeReady.companyId,
    pilotExecutionIds: releaseArtifacts.pilotExecutionIds,
    pilotCohortIds: releaseArtifacts.pilotCohortIds,
    parityScorecardIds: releaseArtifacts.parityScorecardIds,
    advantageReleaseBundleId: releaseArtifacts.advantageReleaseBundleId,
    uiContractFreezeRecordId: releaseArtifacts.uiContractFreezeRecordId,
    checklistResults: FINAL_CHECKLIST_CODES.map((checklistCode) => ({
      checklistCode,
      status: "green",
      evidenceRefs: [`go-live://${checklistCode}/green`]
    })),
    notes: "All final release gates are green."
  });

  assert.equal(gate.status, "approved");
  assert.equal(gate.summary.generalAvailabilityReady, true);
  assert.deepEqual(gate.summary.missingPilotSegmentCodes, []);
  assert.deepEqual(gate.summary.missingParityCategories, []);
  assert.deepEqual(gate.summary.blockedChecklistCodes, []);
  assert.equal(gate.summary.greenChecklistCodes.length, FINAL_CHECKLIST_CODES.length);

  const evidence = tenantControl.exportGoLiveGateEvidence({
    sessionToken: companyToken,
    goLiveGateRecordId: gate.goLiveGateRecordId
  });
  const artifactRefs = evidence.artifacts || evidence.artifactRefs || [];
  assert.equal(evidence.bundleType, "go_live_gate_record");
  assert.equal(artifactRefs.some((artifact) => artifact.artifactType === "go_live_gate_manifest"), true);
});

test("Phase 18.6 records blocked gate when any final checklist item is not green", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-30T00:15:00Z")
  });
  const tenantControl = platform.getDomain("tenantControl");
  loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  const financeReady = bootstrapFinanceReadyCompany({
    tenantControl,
    legalName: "Phase 18 GA Blocked AB",
    orgNumber: "559901-0102",
    adminEmail: "phase18-go-live-blocked@example.test"
  });
  const companyToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: financeReady.companyId,
    email: financeReady.adminEmail
  });
  const financeApprover = platform.createCompanyUser({
    sessionToken: companyToken,
    companyId: financeReady.companyId,
    email: "phase18-go-live-blocked-finance@example.test",
    displayName: "Phase 18 Go Live Blocked Finance",
    roleCode: "approver",
    requiresMfa: true
  });
  const supportApprover = platform.createCompanyUser({
    sessionToken: companyToken,
    companyId: financeReady.companyId,
    email: "phase18-go-live-blocked-support@example.test",
    displayName: "Phase 18 Go Live Blocked Support",
    roleCode: "bureau_user",
    requiresMfa: true
  });

  const releaseArtifacts = createReleasedGoLiveArtifacts({
    tenantControl,
    companyToken,
    companyId: financeReady.companyId,
    financeApproverUserId: financeApprover.user.userId,
    supportApproverUserId: supportApprover.user.userId
  });
  const gate = tenantControl.recordGoLiveGate({
    sessionToken: companyToken,
    companyId: financeReady.companyId,
    pilotExecutionIds: releaseArtifacts.pilotExecutionIds,
    pilotCohortIds: releaseArtifacts.pilotCohortIds,
    parityScorecardIds: releaseArtifacts.parityScorecardIds,
    advantageReleaseBundleId: releaseArtifacts.advantageReleaseBundleId,
    uiContractFreezeRecordId: releaseArtifacts.uiContractFreezeRecordId,
    checklistResults: FINAL_CHECKLIST_CODES.map((checklistCode) => ({
      checklistCode,
      status: checklistCode === "security" ? "amber" : "green",
      evidenceRefs: [`go-live://${checklistCode}/${checklistCode === "security" ? "amber" : "green"}`]
    }))
  });

  assert.equal(gate.status, "blocked");
  assert.equal(gate.summary.generalAvailabilityReady, false);
  assert.deepEqual(gate.summary.blockedChecklistCodes, ["security"]);
  assert.equal(gate.summary.blockingIssueCodes.includes("release_checklist_blocked"), true);
});

function createReleasedGoLiveArtifacts({
  tenantControl,
  companyToken,
  companyId,
  financeApproverUserId,
  supportApproverUserId
}) {
  const approvalActorIds = [financeApproverUserId, supportApproverUserId];
  const pilotExecutionIds = [];
  const pilotCohortIds = [];
  const parityScorecardIds = [];

  for (const slice of PARITY_SLICES) {
    const cohort = createAcceptedPilotCohort({
      tenantControl,
      companyToken,
      companyId,
      approvalActorIds,
      label: slice.label,
      segmentCode: slice.segmentCode,
      scenarioCodes: slice.scenarioCodes,
      cutoverTemplateRef: slice.cutoverTemplateRef
    });
    pilotExecutionIds.push(...cohort.linkedPilotExecutions.map((pilotExecution) => pilotExecution.pilotExecutionId));
    pilotCohortIds.push(cohort.pilotCohortId);
    const scorecard = tenantControl.recordParityScorecard({
      sessionToken: companyToken,
      companyId,
      competitorCode: slice.competitorCode,
      pilotCohortIds: [cohort.pilotCohortId],
      criteriaResults: slice.criteriaCodes.map((criterionCode) => ({
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
    parityScorecardIds.push(scorecard.parityScorecardId);
  }

  for (const slice of SUPPLEMENTAL_SEGMENTS) {
    const cohort = createAcceptedPilotCohort({
      tenantControl,
      companyToken,
      companyId,
      approvalActorIds,
      label: slice.label,
      segmentCode: slice.segmentCode,
      scenarioCodes: slice.scenarioCodes,
      cutoverTemplateRef: slice.cutoverTemplateRef
    });
    pilotExecutionIds.push(...cohort.linkedPilotExecutions.map((pilotExecution) => pilotExecution.pilotExecutionId));
    pilotCohortIds.push(cohort.pilotCohortId);
  }

  const advantageReleaseBundle = tenantControl.recordAdvantageReleaseBundle({
    sessionToken: companyToken,
    companyId,
    parityScorecardIds,
    moveResults: GREEN_MOVES
  });
  const uiContractFreezeRecord = tenantControl.recordUiContractFreeze({
    sessionToken: companyToken,
    companyId,
    advantageReleaseBundleId: advantageReleaseBundle.advantageReleaseBundleId,
    contractSnapshot: buildMinimalUiContractSnapshot()
  });
  return {
    pilotExecutionIds: [...new Set(pilotExecutionIds)],
    pilotCohortIds: [...new Set(pilotCohortIds)],
    parityScorecardIds,
    advantageReleaseBundleId: advantageReleaseBundle.advantageReleaseBundleId,
    uiContractFreezeRecordId: uiContractFreezeRecord.uiContractFreezeRecordId
  };
}

function createAcceptedPilotCohort({
  tenantControl,
  companyToken,
  companyId,
  approvalActorIds,
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
    approvalActorIds,
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
    approvalActorIds,
    reusableCutoverTemplateRefs: [cutoverTemplateRef],
    rollbackEvidenceRefs: ["runbook://rollback/verified"]
  });
}

function bootstrapFinanceReadyCompany({ tenantControl, legalName, orgNumber, adminEmail }) {
  const onboardingRun = tenantControl.createTenantBootstrap({
    legalName,
    orgNumber,
    adminEmail,
    adminDisplayName: "Phase 18 Go Live Owner",
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
