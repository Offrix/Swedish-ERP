import crypto from "node:crypto";
import {
  applyDurableStateSnapshot,
  serializeDurableState
} from "../../domain-core/src/state-snapshots.mjs";

export const COMPANY_SETUP_PROFILE_STATUSES = Object.freeze([
  "draft",
  "bootstrap_running",
  "finance_ready",
  "pilot",
  "production_live",
  "suspended"
]);
export const TRIAL_ENVIRONMENT_PROFILE_STATUSES = Object.freeze([
  "draft",
  "active",
  "reset_in_progress",
  "promotion_in_progress",
  "expired",
  "archived"
]);
export const PROMOTION_PLAN_STATUSES = Object.freeze([
  "draft",
  "validated",
  "approved",
  "executed",
  "cancelled"
]);
export const PARALLEL_RUN_PLAN_STATUSES = Object.freeze([
  "draft",
  "started",
  "completed",
  "cancelled"
]);
export const FINANCE_READINESS_CHECK_STATUSES = Object.freeze(["pending", "completed", "blocked"]);
export const PILOT_EXECUTION_STATUSES = Object.freeze([
  "in_progress",
  "blocked",
  "completed"
]);
export const PILOT_COHORT_STATUSES = Object.freeze([
  "planned",
  "running",
  "accepted",
  "rejected"
]);
export const PARITY_SCORECARD_STATUSES = Object.freeze([
  "green",
  "blocked"
]);
export const PARITY_CRITERION_STATUSES = Object.freeze([
  "green",
  "amber",
  "red",
  "na"
]);
export const PILOT_SCENARIO_STATUSES = Object.freeze([
  "pending",
  "passed",
  "blocked",
  "failed"
]);

const DEFAULT_ONBOARDING_STEP_CODES = Object.freeze([
  "company_profile",
  "registrations",
  "chart_template",
  "vat_setup",
  "fiscal_periods"
]);
const FORBIDDEN_LIVE_CARRY_OVER_CODES = Object.freeze([
  "auth_secret",
  "bank_rail",
  "ledger_history",
  "payroll_run",
  "provider_ref",
  "submission_receipt",
  "token"
]);
const DEFAULT_ROLE_TEMPLATE_CODE = "standard_sme";
const DEFAULT_QUEUE_STRUCTURE_CODE = "standard_finance";
const DEFAULT_CHART_TEMPLATE_ID = "DSAM-2026";
const DEFAULT_VOUCHER_SERIES_CODES = Object.freeze(["A", "B", "E", "H", "I"]);
const DEFAULT_VAT_SCHEME = "se_standard";
const DEFAULT_VAT_FILING_PERIOD = "monthly";
const DEFAULT_ACCOUNTING_METHOD_CODE = "FAKTURERINGSMETOD";
const DEFAULT_LEGAL_FORM_CODE = "AKTIEBOLAG";
const TENANT_BOOTSTRAP_ACTOR_ID = "tenant_control_bootstrap";
const DEFAULT_TRIAL_MODE = "trial";
const DEFAULT_TRIAL_WATERMARK_CODE = "TRIAL";
const DEFAULT_TRIAL_PROVIDER_POLICY_CODE = "trial_safe_default";
const DEFAULT_TRIAL_SEED_SCENARIO_CODE = "service_company_basic";
const TRIAL_SEED_SCENARIO_VERSION = "2026.1";
const TRIAL_REFRESH_PACK_VERSION = "2026.1";
const TRIAL_DATA_RETENTION_POLICY_CODE = "trial_reset_archive_30d";
const TRIAL_REFRESH_POLICY_CODE = "preserve_masterdata_reset_process";
const TRIAL_SESSION_TERMINATION_POLICY_CODE = "revoke_non_operator_sessions";
const DEFAULT_TRIAL_REFRESH_PACK_CODE = "documents_and_work_items";
const DEFAULT_TRIAL_BLOCKED_OPERATION_CLASSES = Object.freeze([
  "live_credentials",
  "live_submissions",
  "live_bank_rails",
  "live_tax_account_events",
  "live_psp_settlement",
  "legal_effect"
]);
const DEFAULT_PILOT_COHORT_CODE = "internal_finance_dogfood";
const PILOT_REQUIRED_APPROVAL_CLASSES = Object.freeze(["implementation", "finance", "support"]);
const DEFAULT_PILOT_SCENARIO_DEFINITIONS = Object.freeze([
  Object.freeze({
    scenarioCode: "finance_core",
    label: "Finance core",
    domainCode: "finance",
    description: "Accounts receivable, accounts payable, banking and close flows."
  }),
  Object.freeze({
    scenarioCode: "vat_cycle",
    label: "VAT cycle",
    domainCode: "vat",
    description: "VAT decision, period lock and reporting flow."
  }),
  Object.freeze({
    scenarioCode: "payroll_agi",
    label: "Payroll and AGI",
    domainCode: "payroll",
    description: "Payroll processing, AGI preparation and submission readiness."
  }),
  Object.freeze({
    scenarioCode: "hus_claim",
    label: "HUS claim",
    domainCode: "hus",
    description: "HUS readiness, evidence and submission chain."
  }),
  Object.freeze({
    scenarioCode: "tax_account_reconciliation",
    label: "Tax account reconciliation",
    domainCode: "tax_account",
    description: "Tax account liabilities, discrepancies and reconciliation handling."
  }),
  Object.freeze({
    scenarioCode: "annual_reporting",
    label: "Annual reporting",
    domainCode: "annual_reporting",
    description: "Annual package, signoff and filing readiness."
  }),
  Object.freeze({
    scenarioCode: "support_operations",
    label: "Support operations",
    domainCode: "support",
    description: "Support case, replay, dead-letter and incident handling."
  })
]);
const OPTIONAL_PILOT_SCENARIO_DEFINITIONS = Object.freeze([
  Object.freeze({
    scenarioCode: "project_profitability",
    label: "Project profitability",
    domainCode: "projects",
    description: "Project commercial core, actuals, profitability and forecast handling."
  }),
  Object.freeze({
    scenarioCode: "personalliggare_id06",
    label: "Personalliggare and ID06",
    domainCode: "personalliggare_id06",
    description: "Attendance, trusted kiosk and ID06 verification evidence flow."
  }),
  Object.freeze({
    scenarioCode: "enterprise_auth",
    label: "Enterprise authentication",
    domainCode: "enterprise_auth",
    description: "SSO, federation and enterprise auth controls for pilot scope."
  })
]);
const PILOT_COHORT_SEGMENT_DEFINITIONS = Object.freeze([
  Object.freeze({
    segmentCode: "finance_payroll_ab",
    label: "AB finance and payroll",
    requiredScenarioCodes: [
      "finance_core",
      "vat_cycle",
      "payroll_agi",
      "tax_account_reconciliation",
      "annual_reporting",
      "support_operations"
    ],
    minimumPilotCount: 1
  }),
  Object.freeze({
    segmentCode: "service_project_company",
    label: "Service and project company",
    requiredScenarioCodes: [
      "finance_core",
      "vat_cycle",
      "payroll_agi",
      "tax_account_reconciliation",
      "annual_reporting",
      "support_operations",
      "project_profitability"
    ],
    minimumPilotCount: 1
  }),
  Object.freeze({
    segmentCode: "hus_business",
    label: "HUS business",
    requiredScenarioCodes: [
      "finance_core",
      "vat_cycle",
      "payroll_agi",
      "hus_claim",
      "tax_account_reconciliation",
      "annual_reporting",
      "support_operations"
    ],
    minimumPilotCount: 1
  }),
  Object.freeze({
    segmentCode: "construction_service_id06",
    label: "Construction and service with personalliggare and ID06",
    requiredScenarioCodes: [
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
    minimumPilotCount: 1
  }),
  Object.freeze({
    segmentCode: "enterprise_sso_customer",
    label: "Enterprise SSO customer",
    requiredScenarioCodes: [
      "finance_core",
      "vat_cycle",
      "payroll_agi",
      "tax_account_reconciliation",
      "annual_reporting",
      "support_operations",
      "enterprise_auth"
    ],
    minimumPilotCount: 1
  })
]);
const PARITY_BENCHMARK_CRITERIA = Object.freeze({
  finance_ready_tenant_setup: Object.freeze({ criterionCode: "finance_ready_tenant_setup", label: "Finance-ready tenant setup" }),
  accounting_ap_ar_bank_vat: Object.freeze({ criterionCode: "accounting_ap_ar_bank_vat", label: "Accounting, AP, AR, bank and VAT" }),
  payroll_agi: Object.freeze({ criterionCode: "payroll_agi", label: "Payroll and AGI" }),
  annual_reporting_declarations: Object.freeze({ criterionCode: "annual_reporting_declarations", label: "Annual reporting and declarations" }),
  hus_claims: Object.freeze({ criterionCode: "hus_claims", label: "HUS where relevant" }),
  integrations_api_webhooks: Object.freeze({ criterionCode: "integrations_api_webhooks", label: "Integrations, API and webhooks" }),
  migration_support_operations: Object.freeze({ criterionCode: "migration_support_operations", label: "Migration and supportable daily operations" }),
  portfolio_project_status: Object.freeze({ criterionCode: "portfolio_project_status", label: "Portfolio and project status" }),
  resource_capacity: Object.freeze({ criterionCode: "resource_capacity", label: "Resource and capacity" }),
  quote_to_project_handoff: Object.freeze({ criterionCode: "quote_to_project_handoff", label: "Quote or deal to project handoff" }),
  time_expense_material_to_invoice: Object.freeze({ criterionCode: "time_expense_material_to_invoice", label: "Time, expense and material to invoice" }),
  project_profitability: Object.freeze({ criterionCode: "project_profitability", label: "Project profitability" }),
  customer_context_execution: Object.freeze({ criterionCode: "customer_context_execution", label: "Customer context through execution" }),
  work_order_service_order: Object.freeze({ criterionCode: "work_order_service_order", label: "Work order and service order" }),
  material_photo_signature_evidence: Object.freeze({ criterionCode: "material_photo_signature_evidence", label: "Material, photo and signature evidence" }),
  personalliggare: Object.freeze({ criterionCode: "personalliggare", label: "Personalliggare" }),
  simple_field_execution: Object.freeze({ criterionCode: "simple_field_execution", label: "Simple field execution" }),
  change_order_semantics: Object.freeze({ criterionCode: "change_order_semantics", label: "Change-order semantics" }),
  id06_compliance: Object.freeze({ criterionCode: "id06_compliance", label: "ID06 compliance" })
});
const GO_LIVE_PARITY_GATE_CODES = Object.freeze([
  "finance_hygiene",
  "payroll_correctness",
  "regulated_submissions_recovery",
  "general_project_core",
  "field_pack_targeted",
  "trial_to_live",
  "migration_cutover",
  "api_webhooks",
  "bankid_sso_backoffice"
]);
const PARITY_COMPETITOR_DEFINITIONS = Object.freeze([
  Object.freeze({
    competitorCode: "fortnox",
    label: "Fortnox",
    categoryCode: "finance_platform",
    requiredPilotSegmentCodes: ["finance_payroll_ab"],
    criterionCodes: [
      "finance_ready_tenant_setup",
      "accounting_ap_ar_bank_vat",
      "payroll_agi",
      "annual_reporting_declarations",
      "integrations_api_webhooks",
      "migration_support_operations"
    ]
  }),
  Object.freeze({
    competitorCode: "visma",
    label: "Visma",
    categoryCode: "finance_platform",
    requiredPilotSegmentCodes: ["finance_payroll_ab"],
    criterionCodes: [
      "finance_ready_tenant_setup",
      "accounting_ap_ar_bank_vat",
      "payroll_agi",
      "annual_reporting_declarations",
      "integrations_api_webhooks",
      "migration_support_operations"
    ]
  }),
  Object.freeze({
    competitorCode: "bokio",
    label: "Bokio",
    categoryCode: "finance_platform",
    requiredPilotSegmentCodes: ["finance_payroll_ab"],
    criterionCodes: [
      "finance_ready_tenant_setup",
      "accounting_ap_ar_bank_vat",
      "payroll_agi",
      "annual_reporting_declarations",
      "integrations_api_webhooks",
      "migration_support_operations"
    ]
  }),
  Object.freeze({
    competitorCode: "wint",
    label: "Wint",
    categoryCode: "finance_platform",
    requiredPilotSegmentCodes: ["finance_payroll_ab"],
    criterionCodes: [
      "finance_ready_tenant_setup",
      "accounting_ap_ar_bank_vat",
      "payroll_agi",
      "annual_reporting_declarations",
      "integrations_api_webhooks",
      "migration_support_operations"
    ]
  }),
  Object.freeze({
    competitorCode: "bjorn_lunden",
    label: "Bjorn Lunden",
    categoryCode: "finance_platform",
    requiredPilotSegmentCodes: ["finance_payroll_ab"],
    criterionCodes: [
      "finance_ready_tenant_setup",
      "accounting_ap_ar_bank_vat",
      "payroll_agi",
      "annual_reporting_declarations",
      "integrations_api_webhooks",
      "migration_support_operations"
    ]
  }),
  ...["teamleader", "monday", "asana", "clickup", "zoho", "odoo", "dynamics365"].map((competitorCode) => Object.freeze({
    competitorCode,
    label: competitorCode === "dynamics365" ? "Dynamics 365 Project Operations" : competitorCode,
    categoryCode: "crm_project_service",
    requiredPilotSegmentCodes: ["service_project_company"],
    criterionCodes: [
      "portfolio_project_status",
      "resource_capacity",
      "quote_to_project_handoff",
      "time_expense_material_to_invoice",
      "project_profitability",
      "customer_context_execution"
    ]
  })),
  ...["bygglet", "byggdagboken"].map((competitorCode) => Object.freeze({
    competitorCode,
    label: competitorCode,
    categoryCode: "field_vertical",
    requiredPilotSegmentCodes: ["construction_service_id06"],
    criterionCodes: [
      "work_order_service_order",
      "material_photo_signature_evidence",
      "personalliggare",
      "simple_field_execution",
      "change_order_semantics",
      "id06_compliance"
    ]
  }))
]);
const TRIAL_SEED_SCENARIO_ALIAS_CODES = Object.freeze({
  agency_trial_seed: "retainer_capacity_agency"
});
const TRIAL_SEED_SCENARIOS = Object.freeze({
  service_company_basic: Object.freeze({
    code: "service_company_basic",
    label: "Service company basic",
    legalFormCode: "AKTIEBOLAG",
    chartTemplateId: "DSAM-2026",
    vatScheme: "se_standard",
    vatFilingPeriod: "monthly",
    employees: Object.freeze([]),
    employments: Object.freeze([]),
    documents: Object.freeze(["supplier_invoice_sample", "sales_invoice_sample", "ocr_receipt_sample"]),
    projects: Object.freeze([]),
    invoices: Object.freeze(["standard_sales_invoice"]),
    syntheticFeeds: Object.freeze(["bank_statement_basic", "tax_account_basic"]),
    workItems: Object.freeze(["review_queue_seed", "notification_seed", "activity_seed"])
  }),
  consulting_time_and_milestone: Object.freeze({
    code: "consulting_time_and_milestone",
    label: "Consulting time and milestone",
    legalFormCode: "AKTIEBOLAG",
    chartTemplateId: "DSAM-2026",
    vatScheme: "se_standard",
    vatFilingPeriod: "monthly",
    employees: Object.freeze(["consultant_1", "consultant_2"]),
    employments: Object.freeze(["consultant_monthly_salary"]),
    documents: Object.freeze(["milestone_contract", "supplier_invoice_sample", "time_report_sample"]),
    projects: Object.freeze(["consulting_project_time", "consulting_project_milestone"]),
    invoices: Object.freeze(["time_invoice", "milestone_invoice"]),
    syntheticFeeds: Object.freeze(["bank_statement_consulting", "tax_account_basic"]),
    workItems: Object.freeze(["time_review_seed", "delivery_review_seed", "notification_seed"])
  }),
  salary_employer_with_agi: Object.freeze({
    code: "salary_employer_with_agi",
    label: "Salary employer with AGI",
    legalFormCode: "AKTIEBOLAG",
    chartTemplateId: "DSAM-2026",
    vatScheme: "se_standard",
    vatFilingPeriod: "monthly",
    employees: Object.freeze(["employee_admin", "employee_operator"]),
    employments: Object.freeze(["monthly_salary", "hourly_salary"]),
    documents: Object.freeze(["employment_contract", "expense_receipt_sample"]),
    projects: Object.freeze([]),
    invoices: Object.freeze([]),
    syntheticFeeds: Object.freeze(["agi_receipt_sandbox", "tax_account_payroll", "bank_statement_payroll"]),
    workItems: Object.freeze(["payroll_review_seed", "agi_receipt_seed", "notification_seed"])
  }),
  hus_eligible_services_company: Object.freeze({
    code: "hus_eligible_services_company",
    label: "HUS eligible services company",
    legalFormCode: "AKTIEBOLAG",
    chartTemplateId: "DSAM-2026",
    vatScheme: "se_standard",
    vatFilingPeriod: "monthly",
    employees: Object.freeze(["hus_operator"]),
    employments: Object.freeze(["monthly_salary"]),
    documents: Object.freeze(["hus_invoice_sample", "hus_property_reference"]),
    projects: Object.freeze(["hus_service_project"]),
    invoices: Object.freeze(["hus_invoice"]),
    syntheticFeeds: Object.freeze(["hus_decision_sandbox", "bank_statement_hus", "tax_account_basic"]),
    workItems: Object.freeze(["hus_review_seed", "submission_monitor_seed", "notification_seed"])
  }),
  project_service_with_field_pack: Object.freeze({
    code: "project_service_with_field_pack",
    label: "Project service with field pack",
    legalFormCode: "AKTIEBOLAG",
    chartTemplateId: "DSAM-2026",
    vatScheme: "se_standard",
    vatFilingPeriod: "monthly",
    employees: Object.freeze(["dispatcher", "field_worker"]),
    employments: Object.freeze(["field_salary"]),
    documents: Object.freeze(["work_order_sample", "field_photo_sample"]),
    projects: Object.freeze(["service_project", "field_work_order"]),
    invoices: Object.freeze(["field_service_invoice"]),
    syntheticFeeds: Object.freeze(["bank_statement_field", "tax_account_basic"]),
    workItems: Object.freeze(["field_dispatch_seed", "review_queue_seed", "activity_seed"])
  }),
  construction_service_pack: Object.freeze({
    code: "construction_service_pack",
    label: "Construction service pack",
    legalFormCode: "AKTIEBOLAG",
    chartTemplateId: "DSAM-2026",
    vatScheme: "se_standard",
    vatFilingPeriod: "monthly",
    employees: Object.freeze(["site_manager", "construction_worker"]),
    employments: Object.freeze(["construction_salary"]),
    documents: Object.freeze(["personalliggare_sample", "id06_sample", "site_log_sample"]),
    projects: Object.freeze(["construction_project", "site_visit_project"]),
    invoices: Object.freeze(["construction_invoice"]),
    syntheticFeeds: Object.freeze(["bank_statement_construction", "tax_account_basic"]),
    workItems: Object.freeze(["id06_review_seed", "personalliggare_review_seed", "notification_seed"])
  }),
  retainer_capacity_agency: Object.freeze({
    code: "retainer_capacity_agency",
    label: "Retainer capacity agency",
    legalFormCode: "AKTIEBOLAG",
    chartTemplateId: "DSAM-2026",
    vatScheme: "se_standard",
    vatFilingPeriod: "monthly",
    employees: Object.freeze(["agency_pm", "agency_creator"]),
    employments: Object.freeze(["agency_salary"]),
    documents: Object.freeze(["retainer_contract", "ocr_receipt_sample", "supplier_invoice_sample"]),
    projects: Object.freeze(["retainer_project", "capacity_pool"]),
    invoices: Object.freeze(["retainer_invoice", "change_order_invoice"]),
    syntheticFeeds: Object.freeze(["bank_statement_agency", "tax_account_basic"]),
    workItems: Object.freeze(["capacity_review_seed", "client_delivery_seed", "notification_seed"])
  }),
  trade_and_supplier_invoices: Object.freeze({
    code: "trade_and_supplier_invoices",
    label: "Trade and supplier invoices",
    legalFormCode: "AKTIEBOLAG",
    chartTemplateId: "DSAM-2026",
    vatScheme: "se_standard",
    vatFilingPeriod: "monthly",
    employees: Object.freeze(["warehouse_admin"]),
    employments: Object.freeze(["monthly_salary"]),
    documents: Object.freeze(["supplier_invoice_sample", "goods_receipt_sample", "ocr_receipt_sample"]),
    projects: Object.freeze([]),
    invoices: Object.freeze(["trade_sales_invoice"]),
    syntheticFeeds: Object.freeze(["bank_statement_trade", "tax_account_basic"]),
    workItems: Object.freeze(["ap_matching_seed", "payment_review_seed", "notification_seed"])
  })
});
const TRIAL_REFRESH_PACKS = Object.freeze({
  documents_and_work_items: Object.freeze({
    refreshPackCode: "documents_and_work_items",
    label: "Documents and work items refresh",
    preserveMasterdata: true,
    resetProcessData: false,
    appendDocuments: Object.freeze(["new_invoice_upload", "ocr_mailroom_drop", "supplier_pdf_batch"]),
    appendWorkItems: Object.freeze(["review_queue_delta", "notification_delta", "activity_delta"])
  }),
  bank_tax_and_receipts: Object.freeze({
    refreshPackCode: "bank_tax_and_receipts",
    label: "Bank, tax and receipt refresh",
    preserveMasterdata: true,
    resetProcessData: false,
    appendDocuments: Object.freeze(["bank_statement_delta", "tax_account_delta"]),
    appendWorkItems: Object.freeze(["submission_monitor_delta", "tax_reconciliation_delta"])
  })
});
const PORTABLE_CARRY_OVER_SELECTIONS = Object.freeze({
  company_masterdata: Object.freeze({
    selectionCode: "company_masterdata",
    label: "Company masterdata",
    importBatchCode: "company_masterdata",
    portableObjectTypes: Object.freeze(["company_profile"]),
    mandatory: true
  }),
  company_registrations: Object.freeze({
    selectionCode: "company_registrations",
    label: "Company registrations",
    importBatchCode: "company_registrations",
    portableObjectTypes: Object.freeze(["company_registration"]),
    mandatory: true
  }),
  settings: Object.freeze({
    selectionCode: "settings",
    label: "Settings",
    importBatchCode: "company_settings",
    portableObjectTypes: Object.freeze(["settings"]),
    mandatory: true
  }),
  chart_selection: Object.freeze({
    selectionCode: "chart_selection",
    label: "Chart selection",
    importBatchCode: "chart_selection",
    portableObjectTypes: Object.freeze(["chart_template", "voucher_series"]),
    mandatory: true
  }),
  document_templates: Object.freeze({
    selectionCode: "document_templates",
    label: "Document templates",
    importBatchCode: "document_templates",
    portableObjectTypes: Object.freeze(["document_template"]),
    mandatory: false
  }),
  portable_documents: Object.freeze({
    selectionCode: "portable_documents",
    label: "Portable documents",
    importBatchCode: "portable_documents",
    portableObjectTypes: Object.freeze(["document"]),
    mandatory: false
  }),
  project_templates: Object.freeze({
    selectionCode: "project_templates",
    label: "Project templates",
    importBatchCode: "project_templates",
    portableObjectTypes: Object.freeze(["project_template"]),
    mandatory: false
  }),
  customer_supplier_masterdata: Object.freeze({
    selectionCode: "customer_supplier_masterdata",
    label: "Customer and supplier masterdata",
    importBatchCode: "customer_supplier_masterdata",
    portableObjectTypes: Object.freeze(["customer", "supplier"]),
    mandatory: false
  }),
  users_roles: Object.freeze({
    selectionCode: "users_roles",
    label: "Approved users and roles",
    importBatchCode: "users_roles",
    portableObjectTypes: Object.freeze(["company_user", "team_membership"]),
    mandatory: false
  })
});
const PROMOTION_REQUIRED_APPROVAL_CLASSES = Object.freeze(["implementation", "finance", "security"]);
const DEFAULT_PROMOTION_GO_LIVE_PATH = "parallel_run";
const PROMOTION_PORTABLE_DATA_VERSION = "2026.1";
const PROMOTION_VALIDATION_VERSION = "2026.1";
const FORBIDDEN_TRIAL_LIVE_ARTIFACT_CODES = Object.freeze([
  "trial_journal_entries",
  "trial_payroll_runs",
  "trial_submission_receipts",
  "provider_refs",
  "provider_tokens",
  "trial_evidence_bundles",
  "synthetic_bank_events",
  "synthetic_tax_account_events",
  "synthetic_support_artifacts"
]);
const DEFAULT_POST_PROMOTION_TASK_CODES = Object.freeze([
  "configure_live_provider_credentials",
  "import_opening_balances",
  "import_payroll_history_if_applicable",
  "import_open_items_and_history",
  "configure_bank_connections",
  "configure_authority_registration"
]);
const DEFAULT_TRIAL_SUPPORT_POLICY_CODE = "trial_live_ops_default";
const DEFAULT_TRIAL_OPERATIONS_QUEUE_DEFINITIONS = Object.freeze([
  Object.freeze({
    queueCode: "TRIAL_SUPPORT_QUEUE",
    label: "Trial support queue",
    sourceType: "trial_environment_profile"
  }),
  Object.freeze({
    queueCode: "TRIAL_RESET_QUEUE",
    label: "Trial reset queue",
    sourceType: "trial_reset"
  }),
  Object.freeze({
    queueCode: "TRIAL_PROMOTION_QUEUE",
    label: "Trial promotion queue",
    sourceType: "promotion_plan"
  }),
  Object.freeze({
    queueCode: "TRIAL_EXPIRY_QUEUE",
    label: "Trial expiry queue",
    sourceType: "trial_expiry"
  }),
  Object.freeze({
    queueCode: "TRIAL_PARALLEL_RUN_QUEUE",
    label: "Trial parallel run queue",
    sourceType: "parallel_run_plan"
  })
]);
const DEFAULT_TRIAL_RESET_ROLE_CODES = Object.freeze(["company_admin", "bureau_user"]);
const DEFAULT_TRIAL_SUPPORT_ROLE_CODES = Object.freeze(["company_admin", "bureau_user"]);
const DEFAULT_TRIAL_EXPIRY_WARNING_DAYS = 7;
const DEFAULT_TRIAL_PROMOTION_STALE_DAYS = 14;
const DEFAULT_TRIAL_RESET_STALE_HOURS = 4;
const DEFAULT_TRIAL_ANALYTICS_WINDOW_DAYS = 90;
const TRIAL_POLICY_ALLOWED_ROLE_CODES = Object.freeze(["company_admin", "approver", "payroll_admin", "field_user", "bureau_user"]);
const DEFAULT_FINANCE_QUEUE_STRUCTURE = Object.freeze([
  Object.freeze({
    queueCode: "finance_review",
    label: "Finance review",
    ownerTeamId: "finance_ops",
    priority: "high",
    defaultRiskClass: "medium",
    defaultSlaHours: 24,
    escalationPolicyCode: "FINANCE_QUEUE_ESCALATION",
    allowedSourceDomains: Object.freeze(["ledger", "ar", "ap", "banking", "tax_account"]),
    requiredDecisionTypes: Object.freeze(["generic_review", "tax_reconciliation"])
  }),
  Object.freeze({
    queueCode: "payroll_review",
    label: "Payroll review",
    ownerTeamId: "payroll_ops",
    priority: "high",
    defaultRiskClass: "high",
    defaultSlaHours: 12,
    escalationPolicyCode: "PAYROLL_QUEUE_ESCALATION",
    allowedSourceDomains: Object.freeze(["payroll", "agi", "tax_account"]),
    requiredDecisionTypes: Object.freeze(["generic_review", "payroll_treatment", "tax_reconciliation"])
  }),
  Object.freeze({
    queueCode: "vat_decision_review",
    label: "VAT review",
    ownerTeamId: "finance_ops",
    priority: "high",
    defaultRiskClass: "medium",
    defaultSlaHours: 24,
    escalationPolicyCode: "VAT_QUEUE_ESCALATION",
    allowedSourceDomains: Object.freeze(["vat", "ar", "ap"]),
    requiredDecisionTypes: Object.freeze(["generic_review", "vat_treatment"])
  })
]);
const DEFAULT_ROLE_TEMPLATE_ASSIGNMENTS = Object.freeze([
  Object.freeze({
    roleCode: "company_admin",
    teamId: "finance_ops",
    teamRole: "lead",
    description: "Owns finance-ready decisions, tenant setup and go-live approvals."
  }),
  Object.freeze({
    roleCode: "approver",
    teamId: "finance_ops",
    teamRole: "member",
    description: "Approves finance, compliance and regulated decisions."
  }),
  Object.freeze({
    roleCode: "payroll_admin",
    teamId: "payroll_ops",
    teamRole: "lead",
    description: "Owns payroll processing and AGI review."
  }),
  Object.freeze({
    roleCode: "field_user",
    teamId: "field_ops",
    teamRole: "member",
    description: "Handles field and vertical workflows without finance authority."
  })
]);

export function createTenantControlPlatform(options = {}) {
  return createTenantControlEngine(options);
}

export function createTenantControlEngine({
  clock = () => new Date(),
  orgAuthPlatform = null,
  getDomain = () => null,
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null
} = {}) {
  const state = {
    tenantBootstraps: new Map(),
    bootstrapStepStates: new Map(),
    companySetupProfiles: new Map(),
    companySetupProfileIdByCompany: new Map(),
    moduleDefinitions: new Map(),
    moduleActivationProfiles: new Map(),
    trialEnvironmentProfiles: new Map(),
    trialEnvironmentIdsByCompany: new Map(),
    trialSupportPolicies: new Map(),
    promotionPlans: new Map(),
    promotionPlanIdsByCompany: new Map(),
    promotionValidationReports: new Map(),
    portableDataBundles: new Map(),
    parallelRunPlans: new Map(),
    parallelRunPlanIdsByCompany: new Map(),
    pilotExecutions: new Map(),
    pilotExecutionIdsByCompany: new Map(),
    pilotCohorts: new Map(),
    pilotCohortIdsByCompany: new Map(),
    pilotCohortIdsBySegment: new Map(),
    parityScorecards: new Map(),
    parityScorecardIdsByCompany: new Map(),
    parityScorecardIdsByCompetitor: new Map(),
    financeBlueprintsByCompany: new Map(),
    financeFoundationRecordsByCompany: new Map(),
    tenantControlEvents: [],
    auditEvents: []
  };

  if (seedDemo) {
    syncAllFromOrgAuth();
  }

  return {
    companySetupProfileStatuses: COMPANY_SETUP_PROFILE_STATUSES,
    trialEnvironmentProfileStatuses: TRIAL_ENVIRONMENT_PROFILE_STATUSES,
    promotionPlanStatuses: PROMOTION_PLAN_STATUSES,
    parallelRunPlanStatuses: PARALLEL_RUN_PLAN_STATUSES,
    pilotExecutionStatuses: PILOT_EXECUTION_STATUSES,
    pilotCohortStatuses: PILOT_COHORT_STATUSES,
    parityScorecardStatuses: PARITY_SCORECARD_STATUSES,
    pilotScenarioStatuses: PILOT_SCENARIO_STATUSES,
    createTenantBootstrap,
    getTenantBootstrap,
    getTenantBootstrapChecklist,
    updateTenantBootstrapStep,
    getCompanySetupProfile,
    registerTenantModuleDefinition,
    listTenantModuleDefinitions,
    activateTenantModule,
    listTenantModuleActivations,
    suspendTenantModuleActivation,
    createTrialEnvironment,
    listTrialEnvironments,
    getTrialSupportPolicy,
    updateTrialSupportPolicy,
    getTrialOperationsSnapshot,
    listTrialOperationAlerts,
    listTrialOperationQueueViews,
    listTrialPromotionWorkflows,
    getTrialSalesDemoAnalytics,
    resetTrialEnvironment,
    refreshTrialEnvironment,
    promoteTrialToLive,
    getPromotionPlan,
    executePromotionPlan,
    listPromotionPlans,
    startParallelRun,
    listParallelRunPlans,
    startPilotExecution,
    getPilotExecution,
    listPilotExecutions,
    recordPilotScenarioOutcome,
    completePilotExecution,
    exportPilotExecutionEvidence,
    startPilotCohort,
    getPilotCohort,
    listPilotCohorts,
    attachPilotExecutionsToCohort,
    assessPilotCohort,
    exportPilotCohortEvidence,
    recordParityScorecard,
    getParityScorecard,
    listParityScorecards,
    exportParityScorecardEvidence,
    getFinanceReadinessValidation,
    snapshotTenantControl,
    exportDurableState,
    importDurableState
  };

  function createTenantBootstrap({
    legalName,
    orgNumber,
    adminEmail,
    adminDisplayName,
    accountingYear,
    legalFormCode = null,
    accountingMethodCode = null,
    ownerTaxationCode = null,
    annualNetTurnoverSek = null,
    fiscalYearStartDate = null,
    fiscalYearEndDate = null,
    chartTemplateId = null,
    vatScheme = null,
    vatFilingPeriod = null,
    roleTemplateCode = null,
    queueStructureCode = null
  } = {}) {
    const financeBlueprint = normalizeFinanceBlueprint({
      legalName,
      accountingYear,
      legalFormCode,
      accountingMethodCode,
      ownerTaxationCode,
      annualNetTurnoverSek,
      fiscalYearStartDate,
      fiscalYearEndDate,
      chartTemplateId,
      vatScheme,
      vatFilingPeriod,
      roleTemplateCode,
      queueStructureCode
    });
    const delegated = requireOrgAuthPlatform().createOnboardingRun({
      legalName,
      orgNumber,
      adminEmail,
      adminDisplayName,
      accountingYear
    });
    syncRunFromOrgAuth(delegated.runId);
    state.financeBlueprintsByCompany.set(delegated.companyId, financeBlueprint);
    refreshCompanySetupProfile(delegated.companyId);
    return presentTenantBootstrap(delegated.runId);
  }

  function getTenantBootstrap({ tenantBootstrapId, resumeToken = null } = {}) {
    const bootstrap = requireTenantBootstrap(tenantBootstrapId, resumeToken);
    return presentTenantBootstrap(bootstrap.tenantBootstrapId);
  }

  function getTenantBootstrapChecklist({ tenantBootstrapId, resumeToken = null } = {}) {
    const bootstrap = requireTenantBootstrap(tenantBootstrapId, resumeToken);
    return {
      tenantBootstrapId: bootstrap.tenantBootstrapId,
      companyId: bootstrap.companyId,
      status: bootstrap.status,
      currentStep: bootstrap.currentStep,
      checklist: buildChecklist(bootstrap.tenantBootstrapId)
    };
  }

  function updateTenantBootstrapStep({
    tenantBootstrapId,
    resumeToken = null,
    stepCode,
    payload
  } = {}) {
    const bootstrap = requireTenantBootstrap(tenantBootstrapId, resumeToken);
    requireOrgAuthPlatform().updateOnboardingStep({
      runId: bootstrap.onboardingRunId,
      resumeToken: bootstrap.resumeToken,
      stepCode,
      payload
    });
    syncRunFromOrgAuth(bootstrap.onboardingRunId);
    maybeMaterializeFinanceReadyFoundation(bootstrap.companyId);
    return presentTenantBootstrap(bootstrap.tenantBootstrapId);
  }

  function getCompanySetupProfile({ sessionToken, companyId } = {}) {
    authorizeCompanyAction({
      sessionToken,
      companyId,
      action: "COMPANY_READ",
      objectType: "company_setup_profile",
      objectId: companyId,
      scopeCode: "tenant_setup"
    });
    const profile = state.companySetupProfiles.get(requireCompanySetupProfileId(companyId));
    if (!profile) {
      throw httpError(404, "company_setup_profile_not_found", "Company setup profile was not found.");
    }
    maybeMaterializeFinanceReadyFoundation(companyId);
    return copy(state.companySetupProfiles.get(requireCompanySetupProfileId(companyId)));
  }

  function getFinanceReadinessValidation({ sessionToken, companyId } = {}) {
    getCompanySetupProfile({ sessionToken, companyId });
    const record = state.financeFoundationRecordsByCompany.get(requireText(companyId, "company_id_required"));
    if (!record) {
      return {
        companyId: requireText(companyId, "company_id_required"),
        status: "pending",
        checks: buildFinanceReadinessChecks({
          foundation: null,
          checklist: (() => {
            const bootstrap = findTenantBootstrapByCompanyId(companyId);
            return bootstrap ? buildChecklist(bootstrap.tenantBootstrapId) : [];
          })()
        })
      };
    }
    return copy({
      companyId: record.companyId,
      status: record.status,
      checks: record.financeReadinessChecks,
      foundation: record
    });
  }

  function registerTenantModuleDefinition({
    sessionToken,
    companyId,
    moduleCode,
    label,
    riskClass,
    coreModule,
    dependencyModuleCodes,
    requiredPolicyCodes,
    requiredRulepackCodes,
    requiresCompletedTenantSetup,
    allowSuspend
  } = {}) {
    const definition = requireOrgAuthPlatform().registerModuleDefinition({
      sessionToken,
      companyId,
      moduleCode,
      label,
      riskClass,
      coreModule,
      dependencyModuleCodes,
      requiredPolicyCodes,
      requiredRulepackCodes,
      requiresCompletedTenantSetup,
      allowSuspend
    });
    syncAllFromOrgAuth();
    return copy(requireModuleDefinition(companyId, definition.moduleCode));
  }

  function listTenantModuleDefinitions({ sessionToken, companyId } = {}) {
    authorizeCompanyAction({
      sessionToken,
      companyId,
      action: "COMPANY_READ",
      objectType: "module_definition",
      objectId: companyId,
      scopeCode: "module_activation"
    });
    syncAllFromOrgAuth();
    return [...state.moduleDefinitions.values()]
      .filter((record) => record.companyId === requireText(companyId, "company_id_required"))
      .sort((left, right) => left.moduleCode.localeCompare(right.moduleCode))
      .map(copy);
  }

  function activateTenantModule({
    sessionToken,
    companyId,
    moduleCode,
    effectiveFrom,
    activationReason,
    approvalActorIds
  } = {}) {
    const activation = requireOrgAuthPlatform().activateModule({
      sessionToken,
      companyId,
      moduleCode,
      effectiveFrom,
      activationReason,
      approvalActorIds
    });
    syncAllFromOrgAuth();
    return copy(requireModuleActivationProfile(companyId, activation.moduleCode));
  }

  function listTenantModuleActivations({ sessionToken, companyId } = {}) {
    authorizeCompanyAction({
      sessionToken,
      companyId,
      action: "COMPANY_READ",
      objectType: "module_activation_profile",
      objectId: companyId,
      scopeCode: "module_activation"
    });
    syncAllFromOrgAuth();
    return [...state.moduleActivationProfiles.values()]
      .filter((record) => record.companyId === requireText(companyId, "company_id_required"))
      .sort((left, right) => left.moduleCode.localeCompare(right.moduleCode))
      .map(copy);
  }

  function suspendTenantModuleActivation({
    sessionToken,
    companyId,
    moduleCode,
    reasonCode
  } = {}) {
    const activation = requireOrgAuthPlatform().suspendModuleActivation({
      sessionToken,
      companyId,
      moduleCode,
      reasonCode
    });
    syncAllFromOrgAuth();
    return copy(requireModuleActivationProfile(companyId, activation.moduleCode));
  }

  function createTrialEnvironment({
    sessionToken,
    companyId,
    label = null,
    seedScenarioCode = null,
    watermarkCode = DEFAULT_TRIAL_WATERMARK_CODE,
    expiresAt = null
  } = {}) {
    const principal = authorizeCompanyAction({
      sessionToken,
      companyId,
      action: "COMPANY_MANAGE",
      objectType: "trial_environment_profile",
      objectId: companyId,
      scopeCode: "trial_environment"
    });
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const now = nowIso();
    const trialIsolationProfile = buildTrialIsolationProfile({
      orgAuthPlatform: requireOrgAuthPlatform(),
      sessionToken,
      companyId: resolvedCompanyId,
      watermarkCode
    });
    const resolvedScenario = resolveTrialSeedScenario(seedScenarioCode);
    const seededAt = nowIso();
    const seedMaterialization = materializeTrialSeedScenario({
      companyId: resolvedCompanyId,
      scenario: resolvedScenario,
      seededAt,
      label
    });
    const record = {
      trialEnvironmentProfileId: crypto.randomUUID(),
      trialEnvironmentId: null,
      tenantId: resolvedCompanyId,
      companyId: resolvedCompanyId,
      label: normalizeOptionalText(label) || `Trial ${resolvedCompanyId.slice(0, 8)}`,
      mode: trialIsolationProfile.mode,
      status: "active",
      watermarkCode: trialIsolationProfile.watermarkCode,
      watermarkPolicy: trialIsolationProfile.watermarkPolicy,
      requestedSeedScenarioCode: normalizeOptionalText(seedScenarioCode),
      seedScenarioCode: resolvedScenario.code,
      seedScenarioVersion: TRIAL_SEED_SCENARIO_VERSION,
      seedScenarioLabel: resolvedScenario.label,
      seedScenarioSummary: seedMaterialization.summary,
      seedScenarioManifest: seedMaterialization.manifest,
      providerPolicyCode: trialIsolationProfile.providerPolicyCode,
      providerPolicy: trialIsolationProfile.providerPolicy,
      supportsRealCredentials: trialIsolationProfile.supportsRealCredentials,
      supportsLegalEffect: trialIsolationProfile.supportsLegalEffect,
      promotionEligibleFlag: trialIsolationProfile.promotionEligibleFlag,
      trialIsolationStatus: trialIsolationProfile.trialIsolationStatus,
      blockedOperationClasses: copy(trialIsolationProfile.blockedOperationClasses),
      liveCredentialPolicy: "blocked",
      liveSubmissionPolicy: "blocked",
      liveBankRailPolicy: "blocked",
      liveEconomicEffectPolicy: "blocked",
      trialDataRetentionPolicyCode: TRIAL_DATA_RETENTION_POLICY_CODE,
      refreshPolicyCode: TRIAL_REFRESH_POLICY_CODE,
      sessionTerminationPolicyCode: TRIAL_SESSION_TERMINATION_POLICY_CODE,
      resetCount: 0,
      refreshCount: 0,
      lastResetAt: null,
      lastRefreshedAt: null,
      lastSeededAt: seededAt,
      archivedDataRefs: [],
      resetHistory: [],
      refreshHistory: [],
      latestResetEvidenceBundleId: null,
      latestRefreshEvidenceBundleId: null,
      latestPromotionEvidenceBundleId: null,
      archivedReasonCode: null,
      promotedAt: null,
      liveCompanyId: null,
      lastPromotionPlanId: null,
      expiresAt: normalizeOptionalText(expiresAt),
      createdByUserId: principal.userId,
      createdAt: now,
      updatedAt: now
    };
    record.trialEnvironmentId = record.trialEnvironmentProfileId;
    state.trialEnvironmentProfiles.set(record.trialEnvironmentProfileId, record);
    appendToIndex(state.trialEnvironmentIdsByCompany, resolvedCompanyId, record.trialEnvironmentProfileId);
    appendDomainEvent("trial.environment.created", {
      companyId: resolvedCompanyId,
      trialEnvironmentProfileId: record.trialEnvironmentProfileId,
      actorUserId: principal.userId,
      seedScenarioCode: record.seedScenarioCode,
      requestedSeedScenarioCode: record.requestedSeedScenarioCode,
      mode: record.mode,
      watermarkCode: record.watermarkCode,
      providerPolicyCode: record.providerPolicyCode
    });
    appendAuditEvent({
      companyId: resolvedCompanyId,
      actorId: principal.userId,
      action: "tenant_control.trial_environment.created",
      entityType: "trial_environment_profile",
      entityId: record.trialEnvironmentProfileId,
      metadata: {
        watermarkCode: record.watermarkCode,
        seedScenarioCode: record.seedScenarioCode,
        seedScenarioVersion: record.seedScenarioVersion,
        mode: record.mode,
        providerPolicyCode: record.providerPolicyCode,
        supportsLegalEffect: record.supportsLegalEffect
      }
    });
    return copy(record);
  }

  function listTrialEnvironments({ sessionToken, companyId } = {}) {
    authorizeCompanyAction({
      sessionToken,
      companyId,
      action: "COMPANY_READ",
      objectType: "trial_environment_profile",
      objectId: companyId,
      scopeCode: "trial_environment"
    });
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.trialEnvironmentIdsByCompany.get(resolvedCompanyId) || [])
      .map((trialEnvironmentProfileId) => state.trialEnvironmentProfiles.get(trialEnvironmentProfileId))
      .filter(Boolean)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function getTrialSupportPolicy({ sessionToken, companyId } = {}) {
    authorizeCompanyAction({
      sessionToken,
      companyId,
      action: "COMPANY_READ",
      objectType: "trial_support_policy",
      objectId: companyId,
      scopeCode: "trial_operations"
    });
    return presentTrialSupportPolicy(resolveTrialSupportPolicy(companyId));
  }

  function updateTrialSupportPolicy({
    sessionToken,
    companyId,
    allowedResetRoleCodes = null,
    allowedResetCompanyUserIds = null,
    allowedSupportRoleCodes = null,
    expiryWarningDays = null,
    promotionStaleDays = null,
    resetStaleHours = null,
    analyticsWindowDays = null
  } = {}) {
    const principal = authorizeCompanyAction({
      sessionToken,
      companyId,
      action: "COMPANY_MANAGE",
      objectType: "trial_support_policy",
      objectId: companyId,
      scopeCode: "trial_operations"
    });
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const existing = resolveTrialSupportPolicy(resolvedCompanyId);
    const allowedResetUsers = validateCompanyUserIdsForPolicy({
      companyId: resolvedCompanyId,
      companyUserIds: allowedResetCompanyUserIds
    });
    const updated = {
      ...existing,
      allowedResetRoleCodes:
        allowedResetRoleCodes == null
          ? existing.allowedResetRoleCodes
          : normalizeTrialPolicyRoleCodes(allowedResetRoleCodes, "trial_support_policy_role_invalid"),
      allowedResetCompanyUserIds:
        allowedResetCompanyUserIds == null ? existing.allowedResetCompanyUserIds : allowedResetUsers,
      allowedSupportRoleCodes:
        allowedSupportRoleCodes == null
          ? existing.allowedSupportRoleCodes
          : normalizeTrialPolicyRoleCodes(allowedSupportRoleCodes, "trial_support_policy_role_invalid"),
      expiryWarningDays:
        expiryWarningDays == null
          ? existing.expiryWarningDays
          : normalizePositiveInteger(expiryWarningDays, "trial_support_policy_expiry_warning_invalid"),
      promotionStaleDays:
        promotionStaleDays == null
          ? existing.promotionStaleDays
          : normalizePositiveInteger(promotionStaleDays, "trial_support_policy_promotion_stale_invalid"),
      resetStaleHours:
        resetStaleHours == null
          ? existing.resetStaleHours
          : normalizePositiveInteger(resetStaleHours, "trial_support_policy_reset_stale_invalid"),
      analyticsWindowDays:
        analyticsWindowDays == null
          ? existing.analyticsWindowDays
          : normalizePositiveInteger(analyticsWindowDays, "trial_support_policy_analytics_window_invalid"),
      updatedByUserId: principal.userId,
      updatedAt: nowIso()
    };
    state.trialSupportPolicies.set(resolvedCompanyId, updated);
    appendDomainEvent("trial.support_policy.updated", {
      companyId: resolvedCompanyId,
      actorUserId: principal.userId,
      allowedResetRoleCodes: updated.allowedResetRoleCodes,
      allowedResetCompanyUserIds: updated.allowedResetCompanyUserIds,
      expiryWarningDays: updated.expiryWarningDays,
      promotionStaleDays: updated.promotionStaleDays,
      resetStaleHours: updated.resetStaleHours,
      analyticsWindowDays: updated.analyticsWindowDays
    });
    appendAuditEvent({
      companyId: resolvedCompanyId,
      actorId: principal.userId,
      action: "tenant_control.trial_support_policy.updated",
      entityType: "trial_support_policy",
      entityId: resolvedCompanyId,
      metadata: {
        allowedResetRoleCodes: updated.allowedResetRoleCodes,
        allowedResetCompanyUserIds: updated.allowedResetCompanyUserIds,
        allowedSupportRoleCodes: updated.allowedSupportRoleCodes,
        expiryWarningDays: updated.expiryWarningDays,
        promotionStaleDays: updated.promotionStaleDays,
        resetStaleHours: updated.resetStaleHours,
        analyticsWindowDays: updated.analyticsWindowDays
      }
    });
    return presentTrialSupportPolicy(updated);
  }

  function getTrialOperationsSnapshot({ sessionToken, companyId } = {}) {
    authorizeCompanyAction({
      sessionToken,
      companyId,
      action: "COMPANY_READ",
      objectType: "trial_support_policy",
      objectId: companyId,
      scopeCode: "trial_operations"
    });
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const supportPolicy = resolveTrialSupportPolicy(resolvedCompanyId);
    const trials = listTrialEnvironmentRecordsByCompany(resolvedCompanyId);
    const promotions = listPromotionPlanRecordsByCompany(resolvedCompanyId);
    const parallelRuns = listParallelRunPlanRecordsByCompany(resolvedCompanyId);
    const alerts = buildTrialOperationAlerts({
      companyId: resolvedCompanyId,
      supportPolicy,
      trials,
      promotions,
      parallelRuns
    });
    const queueViews = buildTrialOperationQueueViews({
      companyId: resolvedCompanyId,
      supportPolicy,
      trials,
      promotions,
      parallelRuns,
      alerts
    });
    const promotionWorkflows = buildTrialPromotionWorkflows({
      promotions,
      supportPolicy
    });
    const salesDemoAnalytics = buildTrialSalesDemoAnalytics({
      supportPolicy,
      trials,
      promotions,
      parallelRuns
    });
    return copy({
      companyId: resolvedCompanyId,
      generatedAt: nowIso(),
      supportPolicy: presentTrialSupportPolicy(supportPolicy),
      queueViews,
      alerts,
      promotionWorkflows,
      salesDemoAnalytics,
      summary: {
        trialCount: trials.length,
        activeTrialCount: trials.filter((trial) => trial.status === "active").length,
        promotionPlanCount: promotions.length,
        pendingPromotionCount: promotions.filter((plan) => ["validated", "approved"].includes(plan.status)).length,
        alertCount: alerts.length,
        criticalAlertCount: alerts.filter((alert) => alert.severityCode === "critical").length,
        queueCount: queueViews.length
      }
    });
  }

  function listTrialOperationAlerts({ sessionToken, companyId } = {}) {
    return getTrialOperationsSnapshot({ sessionToken, companyId }).alerts;
  }

  function listTrialOperationQueueViews({ sessionToken, companyId } = {}) {
    return getTrialOperationsSnapshot({ sessionToken, companyId }).queueViews;
  }

  function listTrialPromotionWorkflows({ sessionToken, companyId } = {}) {
    return getTrialOperationsSnapshot({ sessionToken, companyId }).promotionWorkflows;
  }

  function getTrialSalesDemoAnalytics({ sessionToken, companyId } = {}) {
    return getTrialOperationsSnapshot({ sessionToken, companyId }).salesDemoAnalytics;
  }

  function resetTrialEnvironment({
    sessionToken,
    trialEnvironmentProfileId,
    reasonCode = "manual_reset"
  } = {}) {
    const trialEnvironment = requireTrialEnvironment(trialEnvironmentProfileId);
    assertTrialEnvironmentStatus(trialEnvironment, ["active"], "trial_environment_reset_status_invalid");
    assertTrialEnvironmentIsolated(trialEnvironment);
    const principal = authorizeCompanyAction({
      sessionToken,
      companyId: trialEnvironment.companyId,
      action: "COMPANY_MANAGE",
      objectType: "trial_environment_profile",
      objectId: trialEnvironmentProfileId,
      scopeCode: "trial_environment"
    });
    assertTrialResetRights({ principal, companyId: trialEnvironment.companyId });
    const resetStartedAt = nowIso();
    trialEnvironment.status = "reset_in_progress";
    trialEnvironment.updatedAt = resetStartedAt;
    const terminatedSessions = terminateTrialSessions({
      sessionToken,
      companyId: trialEnvironment.companyId,
      actorId: principal.userId
    });
    const archivedDataRef = archiveTrialProcessState(trialEnvironment);
    const reseededAt = nowIso();
    const resolvedScenario = resolveTrialSeedScenario(trialEnvironment.seedScenarioCode);
    const seedMaterialization = materializeTrialSeedScenario({
      companyId: trialEnvironment.companyId,
      scenario: resolvedScenario,
      seededAt: reseededAt,
      label: trialEnvironment.label
    });
    trialEnvironment.seedScenarioCode = resolvedScenario.code;
    trialEnvironment.seedScenarioVersion = TRIAL_SEED_SCENARIO_VERSION;
    trialEnvironment.seedScenarioLabel = resolvedScenario.label;
    trialEnvironment.seedScenarioSummary = seedMaterialization.summary;
    trialEnvironment.seedScenarioManifest = seedMaterialization.manifest;
    trialEnvironment.refreshCount = 0;
    trialEnvironment.lastRefreshedAt = null;
    trialEnvironment.refreshHistory = [];
    trialEnvironment.resetCount += 1;
    trialEnvironment.lastSeededAt = reseededAt;
    trialEnvironment.lastResetAt = reseededAt;
    trialEnvironment.updatedAt = reseededAt;
    trialEnvironment.status = "active";
    const resetEvidenceBundle = createTrialLifecycleEvidenceBundle({
      trialEnvironment,
      actorId: principal.userId,
      bundleType: "trial_reset",
      title: `Trial reset ${trialEnvironment.label}`,
      metadata: {
        reasonCode,
        resetCount: trialEnvironment.resetCount,
        terminatedSessionIds: terminatedSessions.sessionIds,
        terminatedSessionCount: terminatedSessions.sessionIds.length,
        archivedDataRef,
        seedScenarioCode: trialEnvironment.seedScenarioCode,
        seedScenarioVersion: trialEnvironment.seedScenarioVersion
      }
    });
    trialEnvironment.latestResetEvidenceBundleId = resetEvidenceBundle.evidenceBundleId;
    trialEnvironment.archivedDataRefs = [...trialEnvironment.archivedDataRefs, archivedDataRef];
    trialEnvironment.resetHistory = [
      ...trialEnvironment.resetHistory,
      {
        resetOrdinal: trialEnvironment.resetCount,
        reasonCode,
        terminatedSessionIds: terminatedSessions.sessionIds,
        archivedDataRef,
        evidenceBundleId: resetEvidenceBundle.evidenceBundleId,
        resetAt: reseededAt
      }
    ];
    appendDomainEvent("trial.environment.reset", {
      companyId: trialEnvironment.companyId,
      trialEnvironmentProfileId,
      actorUserId: principal.userId,
      reasonCode,
      resetCount: trialEnvironment.resetCount,
      evidenceBundleId: trialEnvironment.latestResetEvidenceBundleId,
      terminatedSessionCount: terminatedSessions.sessionIds.length
    });
    appendAuditEvent({
      companyId: trialEnvironment.companyId,
      actorId: principal.userId,
      action: "tenant_control.trial_environment.reset",
      entityType: "trial_environment_profile",
      entityId: trialEnvironmentProfileId,
      metadata: {
        reasonCode,
        resetCount: trialEnvironment.resetCount,
        terminatedSessionIds: terminatedSessions.sessionIds,
        archivedDataRef,
        evidenceBundleId: trialEnvironment.latestResetEvidenceBundleId
      }
    });
    return copy(trialEnvironment);
  }

  function refreshTrialEnvironment({
    sessionToken,
    trialEnvironmentProfileId,
    refreshPackCode = DEFAULT_TRIAL_REFRESH_PACK_CODE,
    reasonCode = "manual_refresh"
  } = {}) {
    const trialEnvironment = requireTrialEnvironment(trialEnvironmentProfileId);
    assertTrialEnvironmentStatus(trialEnvironment, ["active"], "trial_environment_refresh_status_invalid");
    assertTrialEnvironmentIsolated(trialEnvironment);
    const principal = authorizeCompanyAction({
      sessionToken,
      companyId: trialEnvironment.companyId,
      action: "COMPANY_MANAGE",
      objectType: "trial_environment_profile",
      objectId: trialEnvironmentProfileId,
      scopeCode: "trial_environment"
    });
    const refreshPack = resolveTrialRefreshPack(refreshPackCode);
    const refreshedAt = nowIso();
    const refreshManifest = materializeTrialRefreshPack({
      trialEnvironment,
      refreshPack,
      refreshedAt
    });
    trialEnvironment.refreshCount += 1;
    trialEnvironment.lastRefreshedAt = refreshedAt;
    trialEnvironment.updatedAt = refreshedAt;
    trialEnvironment.refreshHistory = [
      ...trialEnvironment.refreshHistory,
      {
        refreshOrdinal: trialEnvironment.refreshCount,
        refreshPackCode: refreshPack.refreshPackCode,
        refreshPackVersion: TRIAL_REFRESH_PACK_VERSION,
        refreshedAt,
        manifest: refreshManifest
      }
    ];
    const refreshEvidenceBundle = createTrialLifecycleEvidenceBundle({
      trialEnvironment,
      actorId: principal.userId,
      bundleType: "trial_refresh",
      title: `Trial refresh ${trialEnvironment.label}`,
      metadata: {
        reasonCode,
        refreshCount: trialEnvironment.refreshCount,
        refreshPackCode: refreshPack.refreshPackCode,
        refreshPackVersion: TRIAL_REFRESH_PACK_VERSION,
        manifest: refreshManifest
      }
    });
    trialEnvironment.latestRefreshEvidenceBundleId = refreshEvidenceBundle.evidenceBundleId;
    appendDomainEvent("trial.environment.refreshed", {
      companyId: trialEnvironment.companyId,
      trialEnvironmentProfileId,
      actorUserId: principal.userId,
      refreshPackCode: refreshPack.refreshPackCode,
      refreshCount: trialEnvironment.refreshCount,
      evidenceBundleId: refreshEvidenceBundle.evidenceBundleId
    });
    appendAuditEvent({
      companyId: trialEnvironment.companyId,
      actorId: principal.userId,
      action: "tenant_control.trial_environment.refreshed",
      entityType: "trial_environment_profile",
      entityId: trialEnvironmentProfileId,
      metadata: {
        reasonCode,
        refreshCount: trialEnvironment.refreshCount,
        refreshPackCode: refreshPack.refreshPackCode,
        evidenceBundleId: refreshEvidenceBundle.evidenceBundleId
      }
    });
    return copy(trialEnvironment);
  }

  function promoteTrialToLive({
    sessionToken,
    trialEnvironmentProfileId,
    carryOverSelectionCodes = [],
    approvalActorIds = [],
    executeNow = false
  } = {}) {
    const trialEnvironment = requireTrialEnvironment(trialEnvironmentProfileId);
    assertTrialEnvironmentReadyForPromotion(trialEnvironment);
    const principal = authorizeCompanyAction({
      sessionToken,
      companyId: trialEnvironment.companyId,
      action: "COMPANY_MANAGE",
      objectType: "promotion_plan",
      objectId: trialEnvironmentProfileId,
      scopeCode: "promotion_plan"
    });
    const normalizedCarryOverSelectionCodes = resolvePortableCarryOverSelections(carryOverSelectionCodes);
    const forbiddenCarryOvers = normalizedCarryOverSelectionCodes.filter((code) =>
      FORBIDDEN_LIVE_CARRY_OVER_CODES.includes(code)
    );
    if (forbiddenCarryOvers.length > 0) {
      throw httpError(
        409,
        "trial_promotion_forbidden_carry_over",
        `Trial promotion cannot carry live-forbidden refs: ${forbiddenCarryOvers.join(", ")}.`
      );
    }
    const normalizedApprovalActorIds = normalizeStringList(approvalActorIds);
    const validationReport = buildPromotionValidationReport({
      trialEnvironment,
      principal,
      carryOverSelectionCodes: normalizedCarryOverSelectionCodes
    });
    const portableDataBundle = buildPortableDataBundle({
      trialEnvironment,
      validationReport,
      carryOverSelectionCodes: normalizedCarryOverSelectionCodes
    });
    const approvalCoverage = evaluatePromotionApprovalCoverage({
      companyId: trialEnvironment.companyId,
      principalUserId: principal.userId,
      approvalActorIds: normalizedApprovalActorIds
    });
    const now = nowIso();
    const plan = {
      promotionPlanId: crypto.randomUUID(),
      companyId: trialEnvironment.companyId,
      trialEnvironmentProfileId,
      status: approvalCoverage.complete ? "approved" : "validated",
      sourceCompanyId: trialEnvironment.companyId,
      sourceMasterdataSnapshotHash: validationReport.sourceMasterdataSnapshotHash,
      carryOverPolicyCode: "portable_masterdata_only",
      carryOverSelectionCodes: normalizedCarryOverSelectionCodes,
      approvalActorIds: normalizedApprovalActorIds,
      approvalCoverage,
      validationReportId: validationReport.promotionValidationReportId,
      portableDataBundleId: portableDataBundle.portableDataBundleId,
      recommendedGoLivePath: validationReport.recommendedGoLivePath,
      requiresCutover: true,
      forbiddenCarryOvers,
      blockingIssueCodes: validationReport.blockingIssues.map((issue) => issue.issueCode),
      warningCodes: validationReport.warnings.map((warning) => warning.warningCode),
      createdByUserId: principal.userId,
      createdAt: now,
      updatedAt: now,
      approvedAt: approvalCoverage.complete ? now : null,
      executedAt: null,
      liveCompanyId: null,
      liveTenantBootstrapId: null,
      liveFinanceFoundationStatus: null,
      liveCompanySetupProfileId: null,
      sourceTrialStatus: trialEnvironment.status,
      executionSummary: null
    };
    if (validationReport.status !== "eligible") {
      plan.status = "validated";
    }
    state.promotionValidationReports.set(validationReport.promotionValidationReportId, validationReport);
    state.portableDataBundles.set(portableDataBundle.portableDataBundleId, portableDataBundle);
    state.promotionPlans.set(plan.promotionPlanId, plan);
    appendToIndex(state.promotionPlanIdsByCompany, plan.companyId, plan.promotionPlanId);
    appendAuditEvent({
      companyId: plan.companyId,
      actorId: principal.userId,
      action: "tenant_control.trial_promotion.created",
      entityType: "promotion_plan",
      entityId: plan.promotionPlanId,
      metadata: {
        status: plan.status,
        carryOverSelectionCodes: plan.carryOverSelectionCodes,
        approvalActorIds: plan.approvalActorIds,
        validationReportId: plan.validationReportId,
        portableDataBundleId: plan.portableDataBundleId,
        recommendedGoLivePath: plan.recommendedGoLivePath
      }
    });
    return executeNow
      ? executePromotionPlan({
          sessionToken,
          promotionPlanId: plan.promotionPlanId
        })
      : presentPromotionPlan(plan);
  }

  function getPromotionPlan({ sessionToken, promotionPlanId } = {}) {
    const plan = requirePromotionPlan(promotionPlanId);
    authorizeCompanyAction({
      sessionToken,
      companyId: plan.companyId,
      action: "COMPANY_READ",
      objectType: "promotion_plan",
      objectId: plan.promotionPlanId,
      scopeCode: "promotion_plan"
    });
    return presentPromotionPlan(plan);
  }

  function executePromotionPlan({ sessionToken, promotionPlanId } = {}) {
    const plan = requirePromotionPlan(promotionPlanId);
    const trialEnvironment = requireTrialEnvironment(plan.trialEnvironmentProfileId);
    assertTrialEnvironmentReadyForPromotion(trialEnvironment);
    const principal = authorizeCompanyAction({
      sessionToken,
      companyId: plan.companyId,
      action: "COMPANY_MANAGE",
      objectType: "promotion_plan",
      objectId: plan.promotionPlanId,
      scopeCode: "promotion_plan"
    });
    if (plan.status === "executed") {
      return presentPromotionPlan(plan);
    }
    if (plan.status !== "approved") {
      throw httpError(409, "trial_promotion_approval_incomplete", "Trial promotion requires completed approval coverage before execution.");
    }

    const validationReport = requirePromotionValidationReport(plan.validationReportId);
    if (validationReport.status !== "eligible") {
      throw httpError(409, "trial_promotion_validation_blocked", "Trial promotion validation is blocked.");
    }
    const portableDataBundle = requirePortableDataBundle(plan.portableDataBundleId);
    const promotionStartedAt = nowIso();
    trialEnvironment.status = "promotion_in_progress";
    trialEnvironment.updatedAt = promotionStartedAt;

    const liveBootstrap = materializeLiveCompanyFromPromotion({
      portableDataBundle,
      trialEnvironment,
      plan,
      principal
    });
    const liveCompanySetupProfile = state.companySetupProfiles.get(requireCompanySetupProfileId(liveBootstrap.companyId));
    const liveFinanceFoundation = state.financeFoundationRecordsByCompany.get(liveBootstrap.companyId) || null;
    const promotionEvidenceBundle = createPromotionEvidenceBundle({
      trialEnvironment,
      plan,
      validationReport,
      portableDataBundle,
      actorId: principal.userId,
      liveCompanyId: liveBootstrap.companyId
    });

    trialEnvironment.status = "archived";
    trialEnvironment.promotionEligibleFlag = false;
    trialEnvironment.archivedReasonCode = "promoted_to_live";
    trialEnvironment.promotedAt = promotionStartedAt;
    trialEnvironment.lastPromotionPlanId = plan.promotionPlanId;
    trialEnvironment.liveCompanyId = liveBootstrap.companyId;
    trialEnvironment.latestPromotionEvidenceBundleId = promotionEvidenceBundle.evidenceBundleId;
    trialEnvironment.updatedAt = nowIso();

    plan.status = "executed";
    plan.executedAt = nowIso();
    plan.updatedAt = plan.executedAt;
    plan.liveCompanyId = liveBootstrap.companyId;
    plan.liveTenantBootstrapId = liveBootstrap.tenantBootstrapId;
    plan.liveCompanySetupProfileId = liveCompanySetupProfile?.companySetupProfileId || null;
    plan.liveFinanceFoundationStatus = liveFinanceFoundation?.status || null;
    plan.executionSummary = {
      liveCompanyId: liveBootstrap.companyId,
      liveTenantBootstrapId: liveBootstrap.tenantBootstrapId,
      promotedAt: plan.executedAt,
      liveFinanceFoundationStatus: liveFinanceFoundation?.status || "pending",
      liveCompanySetupStatus: liveCompanySetupProfile?.status || null,
      evidenceBundleId: promotionEvidenceBundle.evidenceBundleId,
      requiredPostPromotionTaskCodes: copy(DEFAULT_POST_PROMOTION_TASK_CODES)
    };

    appendDomainEvent("trial.promoted_to_live", {
      companyId: plan.companyId,
      trialEnvironmentProfileId: trialEnvironment.trialEnvironmentProfileId,
      promotionPlanId: plan.promotionPlanId,
      actorUserId: principal.userId,
      liveCompanyId: liveBootstrap.companyId,
      liveTenantBootstrapId: liveBootstrap.tenantBootstrapId,
      portableDataBundleId: portableDataBundle.portableDataBundleId,
      validationReportId: validationReport.promotionValidationReportId
    });
    appendAuditEvent({
      companyId: plan.companyId,
      actorId: principal.userId,
      action: "tenant_control.trial_promotion.executed",
      entityType: "promotion_plan",
      entityId: plan.promotionPlanId,
      metadata: {
        liveCompanyId: liveBootstrap.companyId,
        liveTenantBootstrapId: liveBootstrap.tenantBootstrapId,
        validationReportId: validationReport.promotionValidationReportId,
        portableDataBundleId: portableDataBundle.portableDataBundleId,
        evidenceBundleId: promotionEvidenceBundle.evidenceBundleId
      }
    });
    return presentPromotionPlan(plan);
  }

  function listPromotionPlans({ sessionToken, companyId } = {}) {
    authorizeCompanyAction({
      sessionToken,
      companyId,
      action: "COMPANY_READ",
      objectType: "promotion_plan",
      objectId: companyId,
      scopeCode: "promotion_plan"
    });
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.promotionPlanIdsByCompany.get(resolvedCompanyId) || [])
      .map((promotionPlanId) => state.promotionPlans.get(promotionPlanId))
      .filter(Boolean)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((plan) => presentPromotionPlan(plan));
  }

  function startParallelRun({
    sessionToken,
    companyId,
    trialEnvironmentProfileId,
    liveCompanyId = null,
    runWindowDays = 30
  } = {}) {
    const principal = authorizeCompanyAction({
      sessionToken,
      companyId,
      action: "COMPANY_MANAGE",
      objectType: "parallel_run_plan",
      objectId: companyId,
      scopeCode: "parallel_run"
    });
    const trialEnvironment = requireTrialEnvironment(trialEnvironmentProfileId);
    assertTrialEnvironmentIsolated(trialEnvironment);
    if (trialEnvironment.companyId !== requireText(companyId, "company_id_required")) {
      throw httpError(409, "parallel_run_trial_scope_mismatch", "Trial environment belongs to another company.");
    }
    const now = nowIso();
    const record = {
      parallelRunPlanId: crypto.randomUUID(),
      companyId,
      trialEnvironmentProfileId,
      liveCompanyId: normalizeOptionalText(liveCompanyId),
      status: "started",
      runWindowDays: normalizePositiveInteger(runWindowDays, "parallel_run_window_invalid"),
      createdByUserId: principal.userId,
      startedAt: now,
      createdAt: now,
      updatedAt: now
    };
    state.parallelRunPlans.set(record.parallelRunPlanId, record);
    appendToIndex(state.parallelRunPlanIdsByCompany, companyId, record.parallelRunPlanId);
    appendDomainEvent("parallel_run.started", {
      companyId,
      parallelRunPlanId: record.parallelRunPlanId,
      actorUserId: principal.userId
    });
    appendAuditEvent({
      companyId,
      actorId: principal.userId,
      action: "tenant_control.parallel_run.started",
      entityType: "parallel_run_plan",
      entityId: record.parallelRunPlanId,
      metadata: {
        runWindowDays: record.runWindowDays,
        trialEnvironmentProfileId
      }
    });
    return copy(record);
  }

  function listParallelRunPlans({ sessionToken, companyId } = {}) {
    authorizeCompanyAction({
      sessionToken,
      companyId,
      action: "COMPANY_READ",
      objectType: "parallel_run_plan",
      objectId: companyId,
      scopeCode: "parallel_run"
    });
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.parallelRunPlanIdsByCompany.get(resolvedCompanyId) || [])
      .map((parallelRunPlanId) => state.parallelRunPlans.get(parallelRunPlanId))
      .filter(Boolean)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function startPilotExecution({
    sessionToken,
    companyId,
    label = null,
    cohortCode = DEFAULT_PILOT_COHORT_CODE,
    scenarioCodes = [],
    trialEnvironmentProfileId = null,
    promotionPlanId = null,
    parallelRunPlanId = null,
    cutoverPlanId = null,
    notes = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const principal = authorizeCompanyAction({
      sessionToken,
      companyId: resolvedCompanyId,
      action: "COMPANY_MANAGE",
      objectType: "pilot_execution",
      objectId: resolvedCompanyId,
      scopeCode: "pilot_execution"
    });
    const financeReadiness = getFinanceReadinessValidation({
      sessionToken,
      companyId: resolvedCompanyId
    });
    if (financeReadiness.status !== "finance_ready") {
      throw httpError(409, "pilot_execution_finance_not_ready", "Pilot execution requires a finance-ready company.");
    }

    const resolvedTrialEnvironment = trialEnvironmentProfileId ? requireTrialEnvironment(trialEnvironmentProfileId) : null;
    if (resolvedTrialEnvironment && resolvedTrialEnvironment.companyId !== resolvedCompanyId) {
      throw httpError(409, "pilot_execution_trial_scope_mismatch", "Trial environment belongs to another company.");
    }
    if (resolvedTrialEnvironment) {
      assertTrialEnvironmentIsolated(resolvedTrialEnvironment);
    }

    const resolvedPromotionPlan = promotionPlanId ? requirePromotionPlan(promotionPlanId) : null;
    if (resolvedPromotionPlan && resolvedPromotionPlan.companyId !== resolvedCompanyId) {
      throw httpError(409, "pilot_execution_promotion_scope_mismatch", "Promotion plan belongs to another company.");
    }

    const resolvedParallelRunPlan = parallelRunPlanId ? requireParallelRunPlan(parallelRunPlanId) : null;
    if (resolvedParallelRunPlan && resolvedParallelRunPlan.companyId !== resolvedCompanyId) {
      throw httpError(409, "pilot_execution_parallel_run_scope_mismatch", "Parallel run belongs to another company.");
    }

    const scenarioDefinitions = resolvePilotScenarioDefinitions(scenarioCodes);
    const domainAvailability = buildPilotDomainAvailability(scenarioDefinitions);
    const missingDomains = domainAvailability.filter((item) => item.available !== true).map((item) => item.domainCode);
    if (missingDomains.length > 0) {
      throw httpError(
        409,
        "pilot_execution_domain_unavailable",
        `Pilot execution requires domains that are not available: ${missingDomains.join(", ")}.`
      );
    }

    const now = nowIso();
    const record = {
      pilotExecutionId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      cohortCode: requireText(String(cohortCode || DEFAULT_PILOT_COHORT_CODE), "pilot_cohort_code_required"),
      label: normalizeOptionalText(label) || `Internal pilot ${resolvedCompanyId}`,
      status: "in_progress",
      financeReadinessStatusAtStart: financeReadiness.status,
      financeReadinessSnapshot: copy(financeReadiness),
      scenarioResults: buildPilotScenarioResults(scenarioDefinitions),
      scenarioSummary: null,
      gateStatus: "in_progress",
      blockingIssueCodes: [],
      nextActionCodes: [],
      domainAvailability,
      trialEnvironmentProfileId: resolvedTrialEnvironment?.trialEnvironmentProfileId || null,
      promotionPlanId: resolvedPromotionPlan?.promotionPlanId || null,
      parallelRunPlanId: resolvedParallelRunPlan?.parallelRunPlanId || null,
      cutoverPlanId: normalizeOptionalText(cutoverPlanId),
      rollbackPreparedness: {
        status: "pending",
        strategyCode: null,
        evidenceRefs: [],
        notes: null,
        updatedAt: null
      },
      approvalCoverage: {
        requiredApprovalClasses: copy(PILOT_REQUIRED_APPROVAL_CLASSES),
        implementation: { fulfilled: false, actorUserIds: [] },
        finance: { fulfilled: false, actorUserIds: [] },
        support: { fulfilled: false, actorUserIds: [] },
        complete: false
      },
      latestEvidenceBundleId: null,
      notes: normalizeOptionalText(notes),
      startedByUserId: principal.userId,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
      completedAt: null
    };
    syncPilotExecutionDerivedState(record);
    state.pilotExecutions.set(record.pilotExecutionId, record);
    appendToIndex(state.pilotExecutionIdsByCompany, resolvedCompanyId, record.pilotExecutionId);
    appendDomainEvent("pilot.started", {
      companyId: resolvedCompanyId,
      pilotExecutionId: record.pilotExecutionId,
      actorUserId: principal.userId,
      cohortCode: record.cohortCode,
      scenarioCodes: record.scenarioResults.map((item) => item.scenarioCode)
    });
    appendAuditEvent({
      companyId: resolvedCompanyId,
      actorId: principal.userId,
      action: "tenant_control.pilot_execution.started",
      entityType: "pilot_execution",
      entityId: record.pilotExecutionId,
      metadata: {
        cohortCode: record.cohortCode,
        scenarioCount: record.scenarioResults.length,
        trialEnvironmentProfileId: record.trialEnvironmentProfileId,
        promotionPlanId: record.promotionPlanId,
        parallelRunPlanId: record.parallelRunPlanId
      }
    });
    return presentPilotExecution(record);
  }

  function getPilotExecution({ sessionToken, pilotExecutionId } = {}) {
    const record = requirePilotExecution(pilotExecutionId);
    authorizeCompanyAction({
      sessionToken,
      companyId: record.companyId,
      action: "COMPANY_READ",
      objectType: "pilot_execution",
      objectId: record.pilotExecutionId,
      scopeCode: "pilot_execution"
    });
    return presentPilotExecution(record);
  }

  function listPilotExecutions({ sessionToken, companyId } = {}) {
    authorizeCompanyAction({
      sessionToken,
      companyId,
      action: "COMPANY_READ",
      objectType: "pilot_execution",
      objectId: companyId,
      scopeCode: "pilot_execution"
    });
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.pilotExecutionIdsByCompany.get(resolvedCompanyId) || [])
      .map((pilotExecutionId) => state.pilotExecutions.get(pilotExecutionId))
      .filter(Boolean)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((record) => presentPilotExecution(record));
  }

  function recordPilotScenarioOutcome({
    sessionToken,
    pilotExecutionId,
    scenarioCode,
    status,
    notes = null,
    blockerCodes = [],
    evidenceRefs = []
  } = {}) {
    const record = requirePilotExecution(pilotExecutionId);
    const principal = authorizeCompanyAction({
      sessionToken,
      companyId: record.companyId,
      action: "COMPANY_MANAGE",
      objectType: "pilot_execution",
      objectId: record.pilotExecutionId,
      scopeCode: "pilot_execution"
    });
    if (record.status === "completed") {
      throw httpError(409, "pilot_execution_completed", "Completed pilot executions are immutable.");
    }
    const resolvedScenarioCode = requireText(scenarioCode, "pilot_scenario_code_required");
    const scenario = record.scenarioResults.find((item) => item.scenarioCode === resolvedScenarioCode);
    if (!scenario) {
      throw httpError(404, "pilot_scenario_not_found", "Pilot scenario was not found.");
    }
    const resolvedStatus = requirePilotScenarioStatus(status);
    scenario.status = resolvedStatus;
    scenario.notes = normalizeOptionalText(notes);
    scenario.blockerCodes = resolvedStatus === "passed" ? [] : normalizeStringList(blockerCodes);
    scenario.evidenceRefs = normalizePilotArtifactRefs(evidenceRefs, {
      defaultArtifactType: "pilot_scenario_evidence",
      roleCode: "pilot_execution"
    });
    scenario.recordedByUserId = principal.userId;
    scenario.recordedAt = nowIso();
    scenario.updatedAt = scenario.recordedAt;
    syncPilotExecutionDerivedState(record);
    record.updatedAt = scenario.updatedAt;
    appendDomainEvent("pilot.scenario_recorded", {
      companyId: record.companyId,
      pilotExecutionId: record.pilotExecutionId,
      scenarioCode: scenario.scenarioCode,
      status: scenario.status,
      actorUserId: principal.userId
    });
    appendAuditEvent({
      companyId: record.companyId,
      actorId: principal.userId,
      action: "tenant_control.pilot_execution.scenario_recorded",
      entityType: "pilot_execution",
      entityId: record.pilotExecutionId,
      metadata: {
        scenarioCode: scenario.scenarioCode,
        status: scenario.status,
        blockerCodes: copy(scenario.blockerCodes),
        evidenceRefCount: scenario.evidenceRefs.length
      }
    });
    return presentPilotExecution(record);
  }

  function completePilotExecution({
    sessionToken,
    pilotExecutionId,
    approvalActorIds = [],
    rollbackStrategyCode,
    rollbackEvidenceRefs = [],
    notes = null
  } = {}) {
    const record = requirePilotExecution(pilotExecutionId);
    const principal = authorizeCompanyAction({
      sessionToken,
      companyId: record.companyId,
      action: "COMPANY_MANAGE",
      objectType: "pilot_execution",
      objectId: record.pilotExecutionId,
      scopeCode: "pilot_execution"
    });
    if (record.status === "completed") {
      return presentPilotExecution(record);
    }

    syncPilotExecutionDerivedState(record);
    if (record.scenarioSummary?.pendingCount > 0 || record.scenarioSummary?.blockedCount > 0 || record.scenarioSummary?.failedCount > 0) {
      throw httpError(409, "pilot_execution_not_ready_for_completion", "All pilot scenarios must pass before completion.");
    }

    const financeReadiness = getFinanceReadinessValidation({
      sessionToken,
      companyId: record.companyId
    });
    if (financeReadiness.status !== "finance_ready") {
      throw httpError(409, "pilot_execution_finance_not_ready", "Pilot completion requires a finance-ready company.");
    }

    const approvalCoverage = evaluatePilotApprovalCoverage({
      companyId: record.companyId,
      principalUserId: principal.userId,
      approvalActorIds: normalizeStringList(approvalActorIds)
    });
    if (approvalCoverage.complete !== true) {
      throw httpError(409, "pilot_execution_approval_incomplete", "Pilot completion requires implementation, finance and support approval coverage.");
    }

    const normalizedRollbackEvidenceRefs = normalizePilotArtifactRefs(rollbackEvidenceRefs, {
      defaultArtifactType: "rollback_preparedness_evidence",
      roleCode: "pilot_execution"
    });
    if (normalizedRollbackEvidenceRefs.length === 0) {
      throw httpError(409, "pilot_execution_rollback_evidence_required", "Pilot completion requires rollback preparedness evidence.");
    }

    record.rollbackPreparedness = {
      status: "verified",
      strategyCode: requireText(rollbackStrategyCode, "pilot_execution_rollback_strategy_required"),
      evidenceRefs: normalizedRollbackEvidenceRefs,
      notes: normalizeOptionalText(notes),
      updatedAt: nowIso()
    };
    record.approvalCoverage = approvalCoverage;
    record.notes = normalizeOptionalText(notes) || record.notes;
    record.financeReadinessSnapshot = copy(financeReadiness);
    record.financeReadinessStatusAtStart = record.financeReadinessStatusAtStart || financeReadiness.status;
    const evidenceBundle = createPilotExecutionEvidenceBundle({
      record,
      actorId: principal.userId
    });
    record.latestEvidenceBundleId = evidenceBundle.evidenceBundleId;
    record.status = "completed";
    record.gateStatus = "completed";
    record.blockingIssueCodes = [];
    record.completedAt = nowIso();
    record.updatedAt = record.completedAt;

    const companySetupProfileId = state.companySetupProfileIdByCompany.get(record.companyId);
    const companySetupProfile = companySetupProfileId ? state.companySetupProfiles.get(companySetupProfileId) || null : null;
    if (companySetupProfile) {
      companySetupProfile.status = "pilot";
      companySetupProfile.updatedAt = record.completedAt;
      companySetupProfile.financeReadyAt = companySetupProfile.financeReadyAt || record.completedAt;
    }

    appendDomainEvent("pilot.completed", {
      companyId: record.companyId,
      pilotExecutionId: record.pilotExecutionId,
      actorUserId: principal.userId,
      evidenceBundleId: record.latestEvidenceBundleId
    });
    appendAuditEvent({
      companyId: record.companyId,
      actorId: principal.userId,
      action: "tenant_control.pilot_execution.completed",
      entityType: "pilot_execution",
      entityId: record.pilotExecutionId,
      metadata: {
        evidenceBundleId: record.latestEvidenceBundleId,
        rollbackStrategyCode: record.rollbackPreparedness.strategyCode,
        approvalCoverage: copy(record.approvalCoverage)
      }
    });
    return presentPilotExecution(record);
  }

  function exportPilotExecutionEvidence({ sessionToken, pilotExecutionId } = {}) {
    const record = requirePilotExecution(pilotExecutionId);
    authorizeCompanyAction({
      sessionToken,
      companyId: record.companyId,
      action: "COMPANY_READ",
      objectType: "pilot_execution",
      objectId: record.pilotExecutionId,
      scopeCode: "pilot_execution"
    });
    if (record.status !== "completed") {
      throw httpError(409, "pilot_execution_not_completed", "Pilot evidence can only be exported after completion.");
    }
    const evidenceDomain = getOptionalDomain("evidence");
    if (
      record.latestEvidenceBundleId
      && evidenceDomain
      && typeof evidenceDomain.getEvidenceBundle === "function"
    ) {
      return evidenceDomain.getEvidenceBundle({
        companyId: record.companyId,
        evidenceBundleId: record.latestEvidenceBundleId
      });
    }
    const evidenceBundle = createPilotExecutionEvidenceBundle({
      record,
      actorId: "tenant_control_pilot_export"
    });
    record.latestEvidenceBundleId = evidenceBundle.evidenceBundleId;
    record.updatedAt = nowIso();
    return copy(evidenceBundle);
  }

  function startPilotCohort({
    sessionToken,
    companyId,
    segmentCode,
    label = null,
    pilotExecutionIds = [],
    notes = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const principal = authorizeCompanyAction({
      sessionToken,
      companyId: resolvedCompanyId,
      action: "COMPANY_MANAGE",
      objectType: "pilot_cohort",
      objectId: resolvedCompanyId,
      scopeCode: "pilot_execution"
    });
    const segmentDefinition = requirePilotCohortSegmentDefinition(segmentCode);
    const now = nowIso();
    const record = {
      pilotCohortId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      segmentCode: segmentDefinition.segmentCode,
      label: normalizeOptionalText(label) || segmentDefinition.label,
      status: "planned",
      requiredScenarioCodes: copy(segmentDefinition.requiredScenarioCodes),
      minimumPilotCount: segmentDefinition.minimumPilotCount,
      pilotExecutionIds: [],
      linkedPilotExecutions: [],
      coverageSummary: {
        requiredScenarioCodes: copy(segmentDefinition.requiredScenarioCodes),
        coveredScenarioCodes: [],
        missingScenarioCodes: copy(segmentDefinition.requiredScenarioCodes),
        completedPilotCount: 0,
        minimumPilotCount: segmentDefinition.minimumPilotCount,
        readyForAcceptance: false
      },
      blockingIssueCodes: ["pilot_cohort_needs_completed_pilots"],
      reusableCutoverTemplateRefs: [],
      rollbackEvidenceRefs: [],
      approvalCoverage: {
        requiredApprovalClasses: copy(PILOT_REQUIRED_APPROVAL_CLASSES),
        implementation: { fulfilled: false, actorUserIds: [] },
        finance: { fulfilled: false, actorUserIds: [] },
        support: { fulfilled: false, actorUserIds: [] },
        complete: false
      },
      notes: normalizeOptionalText(notes),
      latestEvidenceBundleId: null,
      createdAt: now,
      updatedAt: now,
      startedByUserId: principal.userId,
      acceptedAt: null,
      rejectedAt: null
    };
    state.pilotCohorts.set(record.pilotCohortId, record);
    appendToIndex(state.pilotCohortIdsByCompany, resolvedCompanyId, record.pilotCohortId);
    appendToIndex(state.pilotCohortIdsBySegment, record.segmentCode, record.pilotCohortId);
    if (Array.isArray(pilotExecutionIds) && pilotExecutionIds.length > 0) {
      linkPilotExecutionsIntoCohort({
        record,
        pilotExecutionIds,
        principalUserId: principal.userId
      });
    } else {
      syncPilotCohortDerivedState(record);
    }
    appendDomainEvent("pilot.cohort.started", {
      companyId: resolvedCompanyId,
      pilotCohortId: record.pilotCohortId,
      segmentCode: record.segmentCode,
      actorUserId: principal.userId
    });
    appendAuditEvent({
      companyId: resolvedCompanyId,
      actorId: principal.userId,
      action: "tenant_control.pilot_cohort.started",
      entityType: "pilot_cohort",
      entityId: record.pilotCohortId,
      metadata: {
        segmentCode: record.segmentCode,
        pilotExecutionCount: record.pilotExecutionIds.length
      }
    });
    return presentPilotCohort(record);
  }

  function getPilotCohort({ sessionToken, pilotCohortId } = {}) {
    const record = requirePilotCohort(pilotCohortId);
    authorizeCompanyAction({
      sessionToken,
      companyId: record.companyId,
      action: "COMPANY_READ",
      objectType: "pilot_cohort",
      objectId: record.pilotCohortId,
      scopeCode: "pilot_execution"
    });
    return presentPilotCohort(record);
  }

  function listPilotCohorts({ sessionToken, companyId = null, segmentCode = null } = {}) {
    const resolvedCompanyId = normalizeOptionalText(companyId);
    if (resolvedCompanyId) {
      authorizeCompanyAction({
        sessionToken,
        companyId: resolvedCompanyId,
        action: "COMPANY_READ",
        objectType: "pilot_cohort",
        objectId: resolvedCompanyId,
        scopeCode: "pilot_execution"
      });
    }
    const resolvedSegmentCode = normalizeOptionalText(segmentCode);
    let candidates = [...state.pilotCohorts.values()];
    if (resolvedCompanyId) {
      const allowedIds = new Set(state.pilotCohortIdsByCompany.get(resolvedCompanyId) || []);
      candidates = candidates.filter((item) => allowedIds.has(item.pilotCohortId));
    }
    if (resolvedSegmentCode) {
      candidates = candidates.filter((item) => item.segmentCode === resolvedSegmentCode);
    }
    return candidates
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((record) => presentPilotCohort(record));
  }

  function attachPilotExecutionsToCohort({
    sessionToken,
    pilotCohortId,
    pilotExecutionIds = []
  } = {}) {
    const record = requirePilotCohort(pilotCohortId);
    const principal = authorizeCompanyAction({
      sessionToken,
      companyId: record.companyId,
      action: "COMPANY_MANAGE",
      objectType: "pilot_cohort",
      objectId: record.pilotCohortId,
      scopeCode: "pilot_execution"
    });
    if (["accepted", "rejected"].includes(record.status)) {
      throw httpError(409, "pilot_cohort_terminal", "Pilot cohort is already terminal.");
    }
    linkPilotExecutionsIntoCohort({
      record,
      pilotExecutionIds,
      principalUserId: principal.userId
    });
    appendAuditEvent({
      companyId: record.companyId,
      actorId: principal.userId,
      action: "tenant_control.pilot_cohort.pilots_attached",
      entityType: "pilot_cohort",
      entityId: record.pilotCohortId,
      metadata: {
        linkedPilotExecutionIds: copy(record.pilotExecutionIds)
      }
    });
    return presentPilotCohort(record);
  }

  function assessPilotCohort({
    sessionToken,
    pilotCohortId,
    decision,
    approvalActorIds = [],
    reusableCutoverTemplateRefs = [],
    rollbackEvidenceRefs = [],
    blockerCodes = [],
    notes = null
  } = {}) {
    const record = requirePilotCohort(pilotCohortId);
    const principal = authorizeCompanyAction({
      sessionToken,
      companyId: record.companyId,
      action: "COMPANY_MANAGE",
      objectType: "pilot_cohort",
      objectId: record.pilotCohortId,
      scopeCode: "pilot_execution"
    });
    if (["accepted", "rejected"].includes(record.status)) {
      return presentPilotCohort(record);
    }

    syncPilotCohortDerivedState(record);
    const resolvedDecision = requireText(String(decision || ""), "pilot_cohort_decision_required");
    if (!["accepted", "rejected"].includes(resolvedDecision)) {
      throw httpError(400, "pilot_cohort_decision_invalid", "Pilot cohort decision must be accepted or rejected.");
    }

    if (resolvedDecision === "accepted" && record.coverageSummary.readyForAcceptance !== true) {
      throw httpError(409, "pilot_cohort_not_ready_for_acceptance", "Pilot cohort is not ready for acceptance.");
    }

    const approvalCoverage = evaluatePilotApprovalCoverage({
      companyId: record.companyId,
      principalUserId: principal.userId,
      approvalActorIds: normalizeStringList(approvalActorIds)
    });
    if (resolvedDecision === "accepted" && approvalCoverage.complete !== true) {
      throw httpError(409, "pilot_cohort_approval_incomplete", "Pilot cohort acceptance requires implementation, finance and support approval coverage.");
    }

    const normalizedCutoverTemplateRefs = normalizePilotArtifactRefs(reusableCutoverTemplateRefs, {
      defaultArtifactType: "cutover_template_evidence",
      roleCode: "pilot_cohort"
    });
    const normalizedRollbackEvidenceRefs = normalizePilotArtifactRefs(rollbackEvidenceRefs, {
      defaultArtifactType: "rollback_preparedness_evidence",
      roleCode: "pilot_cohort"
    });
    if (resolvedDecision === "accepted" && normalizedCutoverTemplateRefs.length === 0) {
      throw httpError(409, "pilot_cohort_cutover_template_required", "Pilot cohort acceptance requires reusable cutover template evidence.");
    }
    if (resolvedDecision === "accepted" && normalizedRollbackEvidenceRefs.length === 0) {
      throw httpError(409, "pilot_cohort_rollback_evidence_required", "Pilot cohort acceptance requires rollback evidence.");
    }

    record.approvalCoverage = approvalCoverage;
    record.reusableCutoverTemplateRefs = normalizedCutoverTemplateRefs;
    record.rollbackEvidenceRefs = normalizedRollbackEvidenceRefs;
    record.notes = normalizeOptionalText(notes) || record.notes;
    record.updatedAt = nowIso();
    if (resolvedDecision === "accepted") {
      const evidenceBundle = createPilotCohortEvidenceBundle({
        record,
        actorId: principal.userId
      });
      record.latestEvidenceBundleId = evidenceBundle.evidenceBundleId;
      record.status = "accepted";
      record.acceptedAt = record.updatedAt;
      record.blockingIssueCodes = [];
    } else {
      const resolvedBlockerCodes = normalizeStringList(blockerCodes);
      if (resolvedBlockerCodes.length === 0) {
        throw httpError(409, "pilot_cohort_rejection_requires_blockers", "Rejected pilot cohorts require blocker codes.");
      }
      record.status = "rejected";
      record.rejectedAt = record.updatedAt;
      record.blockingIssueCodes = resolvedBlockerCodes;
    }
    appendDomainEvent("pilot.cohort.assessed", {
      companyId: record.companyId,
      pilotCohortId: record.pilotCohortId,
      decision: record.status,
      actorUserId: principal.userId
    });
    appendAuditEvent({
      companyId: record.companyId,
      actorId: principal.userId,
      action: "tenant_control.pilot_cohort.assessed",
      entityType: "pilot_cohort",
      entityId: record.pilotCohortId,
      metadata: {
        decision: record.status,
        cutoverTemplateCount: record.reusableCutoverTemplateRefs.length,
        rollbackEvidenceCount: record.rollbackEvidenceRefs.length,
        approvalCoverage: copy(record.approvalCoverage)
      }
    });
    return presentPilotCohort(record);
  }

  function exportPilotCohortEvidence({ sessionToken, pilotCohortId } = {}) {
    const record = requirePilotCohort(pilotCohortId);
    authorizeCompanyAction({
      sessionToken,
      companyId: record.companyId,
      action: "COMPANY_READ",
      objectType: "pilot_cohort",
      objectId: record.pilotCohortId,
      scopeCode: "pilot_execution"
    });
    if (record.status !== "accepted") {
      throw httpError(409, "pilot_cohort_not_accepted", "Pilot cohort evidence can only be exported after acceptance.");
    }
    const evidenceDomain = getOptionalDomain("evidence");
    if (
      record.latestEvidenceBundleId
      && evidenceDomain
      && typeof evidenceDomain.getEvidenceBundle === "function"
    ) {
      return evidenceDomain.getEvidenceBundle({
        companyId: record.companyId,
        evidenceBundleId: record.latestEvidenceBundleId
      });
    }
    const evidenceBundle = createPilotCohortEvidenceBundle({
      record,
      actorId: "tenant_control_pilot_cohort_export"
    });
    record.latestEvidenceBundleId = evidenceBundle.evidenceBundleId;
    record.updatedAt = nowIso();
    return copy(evidenceBundle);
  }

  function recordParityScorecard({
    sessionToken,
    companyId,
    competitorCode,
    pilotCohortIds = [],
    criteriaResults = [],
    gateResults = [],
    notes = null
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const principal = authorizeCompanyAction({
      sessionToken,
      companyId: resolvedCompanyId,
      action: "COMPANY_MANAGE",
      objectType: "parity_scorecard",
      objectId: resolvedCompanyId,
      scopeCode: "pilot_execution"
    });
    const competitorDefinition = requireParityCompetitorDefinition(competitorCode);
    const linkedPilotCohorts = normalizeStringList(pilotCohortIds).map((pilotCohortId) => {
      const pilotCohort = requirePilotCohort(pilotCohortId);
      if (pilotCohort.companyId !== resolvedCompanyId) {
        throw httpError(409, "parity_scorecard_company_scope_mismatch", "Pilot cohort belongs to another company.");
      }
      if (pilotCohort.status !== "accepted") {
        throw httpError(409, "parity_scorecard_requires_accepted_pilot_cohort", "Parity scorecards require accepted pilot cohorts.");
      }
      return pilotCohort;
    });
    for (const requiredSegmentCode of competitorDefinition.requiredPilotSegmentCodes) {
      if (!linkedPilotCohorts.some((pilotCohort) => pilotCohort.segmentCode === requiredSegmentCode)) {
        throw httpError(409, "parity_scorecard_missing_required_segment", `Parity scorecard requires accepted pilot cohort for segment ${requiredSegmentCode}.`);
      }
    }

    const normalizedCriteriaResults = normalizeParityCriterionResults({
      competitorDefinition,
      criteriaResults
    });
    const normalizedGateResults = normalizeParityGateResults(gateResults);
    const summary = buildParityScorecardSummary({
      criteriaResults: normalizedCriteriaResults,
      gateResults: normalizedGateResults
    });
    const now = nowIso();
    const record = {
      parityScorecardId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      competitorCode: competitorDefinition.competitorCode,
      competitorLabel: competitorDefinition.label,
      categoryCode: competitorDefinition.categoryCode,
      pilotCohortIds: linkedPilotCohorts.map((pilotCohort) => pilotCohort.pilotCohortId),
      criteriaResults: normalizedCriteriaResults,
      gateResults: normalizedGateResults,
      summary,
      status: summary.parityAchieved ? "green" : "blocked",
      notes: normalizeOptionalText(notes),
      latestEvidenceBundleId: null,
      recordedAt: now,
      updatedAt: now,
      actorUserId: principal.userId
    };
    const evidenceBundle = createParityScorecardEvidenceBundle({
      record,
      actorId: principal.userId
    });
    record.latestEvidenceBundleId = evidenceBundle.evidenceBundleId;
    state.parityScorecards.set(record.parityScorecardId, record);
    appendToIndex(state.parityScorecardIdsByCompany, resolvedCompanyId, record.parityScorecardId);
    appendToIndex(state.parityScorecardIdsByCompetitor, record.competitorCode, record.parityScorecardId);
    appendDomainEvent("parity.scorecard.recorded", {
      companyId: resolvedCompanyId,
      parityScorecardId: record.parityScorecardId,
      competitorCode: record.competitorCode,
      status: record.status,
      actorUserId: principal.userId
    });
    appendAuditEvent({
      companyId: resolvedCompanyId,
      actorId: principal.userId,
      action: "tenant_control.parity_scorecard.recorded",
      entityType: "parity_scorecard",
      entityId: record.parityScorecardId,
      metadata: {
        competitorCode: record.competitorCode,
        categoryCode: record.categoryCode,
        pilotCohortIds: copy(record.pilotCohortIds),
        parityAchieved: record.summary.parityAchieved
      }
    });
    return presentParityScorecard(record);
  }

  function getParityScorecard({ sessionToken, parityScorecardId } = {}) {
    const record = requireParityScorecard(parityScorecardId);
    authorizeCompanyAction({
      sessionToken,
      companyId: record.companyId,
      action: "COMPANY_READ",
      objectType: "parity_scorecard",
      objectId: record.parityScorecardId,
      scopeCode: "pilot_execution"
    });
    return presentParityScorecard(record);
  }

  function listParityScorecards({ sessionToken, companyId = null, competitorCode = null } = {}) {
    const resolvedCompanyId = normalizeOptionalText(companyId);
    if (resolvedCompanyId) {
      authorizeCompanyAction({
        sessionToken,
        companyId: resolvedCompanyId,
        action: "COMPANY_READ",
        objectType: "parity_scorecard",
        objectId: resolvedCompanyId,
        scopeCode: "pilot_execution"
      });
    }
    const resolvedCompetitorCode = normalizeOptionalText(competitorCode);
    let candidates = [...state.parityScorecards.values()];
    if (resolvedCompanyId) {
      const allowedIds = new Set(state.parityScorecardIdsByCompany.get(resolvedCompanyId) || []);
      candidates = candidates.filter((item) => allowedIds.has(item.parityScorecardId));
    }
    if (resolvedCompetitorCode) {
      candidates = candidates.filter((item) => item.competitorCode === resolvedCompetitorCode);
    }
    return candidates
      .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
      .map((record) => presentParityScorecard(record));
  }

  function exportParityScorecardEvidence({ sessionToken, parityScorecardId } = {}) {
    const record = requireParityScorecard(parityScorecardId);
    authorizeCompanyAction({
      sessionToken,
      companyId: record.companyId,
      action: "COMPANY_READ",
      objectType: "parity_scorecard",
      objectId: record.parityScorecardId,
      scopeCode: "pilot_execution"
    });
    const evidenceDomain = getOptionalDomain("evidence");
    if (
      record.latestEvidenceBundleId
      && evidenceDomain
      && typeof evidenceDomain.getEvidenceBundle === "function"
    ) {
      return evidenceDomain.getEvidenceBundle({
        companyId: record.companyId,
        evidenceBundleId: record.latestEvidenceBundleId
      });
    }
    const evidenceBundle = createParityScorecardEvidenceBundle({
      record,
      actorId: "tenant_control_parity_scorecard_export"
    });
    record.latestEvidenceBundleId = evidenceBundle.evidenceBundleId;
    record.updatedAt = nowIso();
    return copy(evidenceBundle);
  }

  function listTrialEnvironmentRecordsByCompany(companyId) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.trialEnvironmentIdsByCompany.get(resolvedCompanyId) || [])
      .map((trialEnvironmentProfileId) => state.trialEnvironmentProfiles.get(trialEnvironmentProfileId))
      .filter(Boolean)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  function listPromotionPlanRecordsByCompany(companyId) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.promotionPlanIdsByCompany.get(resolvedCompanyId) || [])
      .map((promotionPlanId) => state.promotionPlans.get(promotionPlanId))
      .filter(Boolean)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  function listParallelRunPlanRecordsByCompany(companyId) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.parallelRunPlanIdsByCompany.get(resolvedCompanyId) || [])
      .map((parallelRunPlanId) => state.parallelRunPlans.get(parallelRunPlanId))
      .filter(Boolean)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  function listPilotExecutionRecordsByCompany(companyId) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.pilotExecutionIdsByCompany.get(resolvedCompanyId) || [])
      .map((pilotExecutionId) => state.pilotExecutions.get(pilotExecutionId))
      .filter(Boolean)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  function resolveTrialSupportPolicy(companyId) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const existing = state.trialSupportPolicies.get(resolvedCompanyId);
    if (existing) {
      return existing;
    }
    const record = {
      trialSupportPolicyId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      policyCode: DEFAULT_TRIAL_SUPPORT_POLICY_CODE,
      queueViews: copy(DEFAULT_TRIAL_OPERATIONS_QUEUE_DEFINITIONS),
      allowedResetRoleCodes: [...DEFAULT_TRIAL_RESET_ROLE_CODES],
      allowedResetCompanyUserIds: [],
      allowedSupportRoleCodes: [...DEFAULT_TRIAL_SUPPORT_ROLE_CODES],
      expiryWarningDays: DEFAULT_TRIAL_EXPIRY_WARNING_DAYS,
      promotionStaleDays: DEFAULT_TRIAL_PROMOTION_STALE_DAYS,
      resetStaleHours: DEFAULT_TRIAL_RESET_STALE_HOURS,
      analyticsWindowDays: DEFAULT_TRIAL_ANALYTICS_WINDOW_DAYS,
      requiredPromotionApprovalClasses: copy(PROMOTION_REQUIRED_APPROVAL_CLASSES),
      queueSeparationMode: "trial_support_only",
      salesDemoAnalyticsEnabled: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      updatedByUserId: null
    };
    state.trialSupportPolicies.set(resolvedCompanyId, record);
    return record;
  }

  function presentTrialSupportPolicy(policy) {
    const companyUsers = new Map(
      listSourceCompanyUsersSnapshot(policy.companyId).map((record) => [record.companyUserId, record])
    );
    return copy({
      ...policy,
      allowedResetCompanyUsers: policy.allowedResetCompanyUserIds
        .map((companyUserId) => {
          const companyUser = companyUsers.get(companyUserId);
          return companyUser
            ? {
                companyUserId,
                userId: companyUser.userId,
                roleCode: companyUser.roleCode,
                email: companyUser.email,
                displayName: companyUser.displayName
              }
            : {
                companyUserId,
                userId: null,
                roleCode: null,
                email: null,
                displayName: null
              };
        })
        .sort((left, right) => String(left.companyUserId).localeCompare(String(right.companyUserId)))
    });
  }

  function buildTrialOperationAlerts({ companyId, supportPolicy, trials, promotions, parallelRuns } = {}) {
    const alerts = [];
    const promotionByTrialId = new Map(promotions.map((plan) => [plan.trialEnvironmentProfileId, plan]));
    const parallelByTrialId = new Map(parallelRuns.map((plan) => [plan.trialEnvironmentProfileId, plan]));
    const now = clock();
    for (const trial of trials) {
      const expiresAt = normalizeOptionalText(trial.expiresAt);
      const promotion = promotionByTrialId.get(trial.trialEnvironmentProfileId) || null;
      const parallelRun = parallelByTrialId.get(trial.trialEnvironmentProfileId) || null;
      if (trial.supportsLegalEffect === true || trial.trialIsolationStatus !== "isolated") {
        alerts.push(
          createTrialOperationAlert({
            companyId,
            alertCode: "trial_isolation_breach",
            severityCode: "critical",
            queueCode: "TRIAL_SUPPORT_QUEUE",
            title: `Trial isolation breach: ${trial.label}`,
            detail: "Trial environment is no longer fully isolated from live capabilities.",
            trialEnvironment: trial
          })
        );
      }
      if (expiresAt) {
        const expiresAtDate = new Date(expiresAt);
        const daysUntilExpiry = Math.ceil((expiresAtDate.getTime() - now.getTime()) / 86400000);
        if (daysUntilExpiry < 0 && trial.status !== "archived") {
          alerts.push(
            createTrialOperationAlert({
              companyId,
              alertCode: "trial_expired",
              severityCode: "critical",
              queueCode: "TRIAL_EXPIRY_QUEUE",
              title: `Expired trial: ${trial.label}`,
              detail: "Trial environment expired and requires archival, reset or promotion decision.",
              trialEnvironment: trial,
              ageHours: Math.abs(hoursBetween(now, expiresAtDate))
            })
          );
        } else if (daysUntilExpiry <= supportPolicy.expiryWarningDays && trial.status === "active") {
          alerts.push(
            createTrialOperationAlert({
              companyId,
              alertCode: "trial_expiring_soon",
              severityCode: "attention",
              queueCode: "TRIAL_EXPIRY_QUEUE",
              title: `Trial expiring soon: ${trial.label}`,
              detail: `Trial expires within ${supportPolicy.expiryWarningDays} days and needs owner action.`,
              trialEnvironment: trial,
              ageHours: Math.max(0, hoursBetween(expiresAtDate, now))
            })
          );
        }
      }
      if (trial.status === "reset_in_progress") {
        const staleHours = hoursBetween(now, new Date(trial.updatedAt || trial.createdAt));
        alerts.push(
          createTrialOperationAlert({
            companyId,
            alertCode: staleHours >= supportPolicy.resetStaleHours ? "trial_reset_stuck" : "trial_reset_in_progress",
            severityCode: staleHours >= supportPolicy.resetStaleHours ? "critical" : "attention",
            queueCode: "TRIAL_RESET_QUEUE",
            title: `Trial reset in progress: ${trial.label}`,
            detail:
              staleHours >= supportPolicy.resetStaleHours
                ? "Reset exceeded allowed stale threshold and needs operator intervention."
                : "Reset is running and should be monitored until complete.",
            trialEnvironment: trial,
            ageHours: staleHours
          })
        );
      }
      if (promotion && ["validated", "approved"].includes(promotion.status)) {
        const staleDays = daysBetween(now, new Date(promotion.updatedAt || promotion.createdAt));
        if (staleDays >= supportPolicy.promotionStaleDays) {
          alerts.push(
            createTrialOperationAlert({
              companyId,
              alertCode: "trial_promotion_stalled",
              severityCode: "attention",
              queueCode: "TRIAL_PROMOTION_QUEUE",
              title: `Trial promotion stalled: ${trial.label}`,
              detail: "Promotion is waiting longer than allowed and needs approval or execution.",
              trialEnvironment: trial,
              promotionPlan: promotion,
              ageHours: staleDays * 24
            })
          );
        }
      }
      if (parallelRun && parallelRun.status === "started") {
        alerts.push(
          createTrialOperationAlert({
            companyId,
            alertCode: "trial_parallel_run_active",
            severityCode: "attention",
            queueCode: "TRIAL_PARALLEL_RUN_QUEUE",
            title: `Parallel run active: ${trial.label}`,
            detail: "Trial promotion path still depends on an active parallel run.",
            trialEnvironment: trial,
            parallelRunPlan: parallelRun,
            ageHours: hoursBetween(now, new Date(parallelRun.updatedAt || parallelRun.createdAt))
          })
        );
      }
    }
    return alerts.sort((left, right) => String(right.severityCode).localeCompare(String(left.severityCode)) || String(left.createdAt).localeCompare(String(right.createdAt)));
  }

  function buildTrialOperationQueueViews({ companyId, supportPolicy, trials, promotions, parallelRuns, alerts } = {}) {
    const alertsByQueueCode = groupItemsBy(alerts, (alert) => alert.queueCode);
    const activeTrials = trials.filter((trial) => ["active", "promotion_in_progress", "reset_in_progress"].includes(trial.status));
    const pendingPromotions = promotions.filter((plan) => ["validated", "approved"].includes(plan.status));
    const expiringAlerts = alerts.filter((alert) => alert.queueCode === "TRIAL_EXPIRY_QUEUE");
    return supportPolicy.queueViews.map((queue) => {
      const queueAlerts = alertsByQueueCode.get(queue.queueCode) || [];
      let openCount = 0;
      let completedCount = 0;
      switch (queue.queueCode) {
        case "TRIAL_SUPPORT_QUEUE":
          openCount = activeTrials.length;
          completedCount = trials.filter((trial) => ["archived", "expired"].includes(trial.status)).length;
          break;
        case "TRIAL_RESET_QUEUE":
          openCount = trials.filter((trial) => trial.status === "reset_in_progress").length;
          completedCount = trials.reduce((sum, trial) => sum + Number(trial.resetCount || 0), 0);
          break;
        case "TRIAL_PROMOTION_QUEUE":
          openCount = pendingPromotions.length;
          completedCount = promotions.filter((plan) => plan.status === "executed").length;
          break;
        case "TRIAL_EXPIRY_QUEUE":
          openCount = expiringAlerts.length;
          completedCount = trials.filter((trial) => trial.status === "archived").length;
          break;
        case "TRIAL_PARALLEL_RUN_QUEUE":
          openCount = parallelRuns.filter((plan) => plan.status === "started").length;
          completedCount = parallelRuns.filter((plan) => plan.status === "completed").length;
          break;
        default:
          break;
      }
      return {
        queueCode: queue.queueCode,
        label: queue.label,
        sourceType: queue.sourceType,
        openCount,
        completedCount,
        alertCount: queueAlerts.length,
        criticalCount: queueAlerts.filter((alert) => alert.severityCode === "critical").length,
        attentionCount: queueAlerts.filter((alert) => alert.severityCode === "attention").length,
        statusCode:
          queueAlerts.some((alert) => alert.severityCode === "critical")
            ? "critical"
            : queueAlerts.length > 0 || openCount > 0
              ? "attention"
              : "ok",
        drilldownTarget: {
          objectType: "trial_operations_queue",
          objectId: queue.queueCode,
          routePath: "/v1/trial/operations/queues"
        },
        companyId
      };
    });
  }

  function buildTrialPromotionWorkflows({ promotions, supportPolicy } = {}) {
    return promotions.map((plan) => {
      const pendingApprovalClasses = (plan.approvalCoverage?.requiredApprovalClasses || []).filter(
        (approvalClass) => plan.approvalCoverage?.[approvalClass]?.fulfilled !== true
      );
      return {
        workflowId: plan.promotionPlanId,
        promotionPlanId: plan.promotionPlanId,
        companyId: plan.companyId,
        trialEnvironmentProfileId: plan.trialEnvironmentProfileId,
        currentStageCode: resolvePromotionWorkflowStage(plan),
        pendingApprovalClasses,
        recommendedGoLivePath: plan.recommendedGoLivePath,
        requiresCutover: plan.requiresCutover === true,
        requiredPostPromotionTaskCodes:
          plan.executionSummary?.requiredPostPromotionTaskCodes || copy(DEFAULT_POST_PROMOTION_TASK_CODES),
        carryOverSelectionCodes: copy(plan.carryOverSelectionCodes || []),
        blockingIssueCodes: copy(plan.blockingIssueCodes || []),
        warningCodes: copy(plan.warningCodes || []),
        supportPolicyCode: supportPolicy.policyCode,
        liveCompanyId: plan.liveCompanyId || null,
        status: plan.status,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt
      };
    });
  }

  function buildTrialSalesDemoAnalytics({ supportPolicy, trials, promotions, parallelRuns } = {}) {
    const now = clock();
    const windowStartsAt = new Date(now.getTime() - supportPolicy.analyticsWindowDays * 86400000);
    const windowTrials = trials.filter((trial) => new Date(trial.createdAt) >= windowStartsAt);
    const windowPromotions = promotions.filter((plan) => new Date(plan.createdAt) >= windowStartsAt);
    const promotedPlans = promotions.filter((plan) => plan.status === "executed");
    const promotionLeadTimes = promotedPlans
      .map((plan) => {
        const matchingTrial = trials.find((trial) => trial.trialEnvironmentProfileId === plan.trialEnvironmentProfileId);
        if (!matchingTrial || !plan.executedAt) {
          return null;
        }
        return Math.max(0, daysBetween(new Date(plan.executedAt), new Date(matchingTrial.createdAt)));
      })
      .filter((value) => value != null);
    return {
      analyticsWindowDays: supportPolicy.analyticsWindowDays,
      windowStartsAt: windowStartsAt.toISOString(),
      totalTrialsCreated: windowTrials.length,
      activeTrialCount: trials.filter((trial) => trial.status === "active").length,
      archivedTrialCount: trials.filter((trial) => trial.status === "archived").length,
      expiredTrialCount: trials.filter((trial) => trial.status === "expired").length,
      resetVolume: trials.reduce((sum, trial) => sum + Number(trial.resetCount || 0), 0),
      refreshVolume: trials.reduce((sum, trial) => sum + Number(trial.refreshCount || 0), 0),
      promotionPipelineCount: windowPromotions.filter((plan) => ["validated", "approved"].includes(plan.status)).length,
      promotionsExecuted: windowPromotions.filter((plan) => plan.status === "executed").length,
      parallelRunStartedCount: parallelRuns.filter((plan) => plan.status === "started").length,
      conversionRatePercent:
        windowTrials.length > 0
          ? Number(((windowPromotions.filter((plan) => plan.status === "executed").length / windowTrials.length) * 100).toFixed(2))
          : 0,
      averageDaysToPromotion:
        promotionLeadTimes.length > 0
          ? Number((promotionLeadTimes.reduce((sum, value) => sum + value, 0) / promotionLeadTimes.length).toFixed(2))
          : null,
      scenarioBreakdown: buildTrialScenarioBreakdown(trials)
    };
  }

  function maybeMaterializeFinanceReadyFoundation(companyId) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const bootstrap = findTenantBootstrapByCompanyId(resolvedCompanyId);
    const companySetupProfileId = state.companySetupProfileIdByCompany.get(resolvedCompanyId);
    const companySetupProfile = companySetupProfileId ? state.companySetupProfiles.get(companySetupProfileId) || null : null;
    const bootstrapCompleted =
      bootstrap?.bootstrapStatus === "completed" ||
      companySetupProfile?.bootstrapStatus === "completed" ||
      ["finance_ready", "pilot", "production_live"].includes(companySetupProfile?.status || "");
    if (!bootstrapCompleted) {
      refreshCompanySetupProfile(resolvedCompanyId);
      return null;
    }

    const financeFoundation = materializeFinanceReadyFoundation({
      companyId: resolvedCompanyId,
      bootstrap
    });
    const previous = state.financeFoundationRecordsByCompany.get(resolvedCompanyId) || null;
    state.financeFoundationRecordsByCompany.set(resolvedCompanyId, financeFoundation);
    refreshCompanySetupProfile(resolvedCompanyId);

    appendAuditEvent({
      companyId: resolvedCompanyId,
      actorId: TENANT_BOOTSTRAP_ACTOR_ID,
      action: "tenant_control.finance_foundation.materialized",
      entityType: "finance_foundation",
      entityId: resolvedCompanyId,
      metadata: {
        status: financeFoundation.status,
        checkCount: financeFoundation.financeReadinessChecks.length
      }
    });
    if (financeFoundation.status === "finance_ready" && previous?.status !== "finance_ready") {
      appendDomainEvent("tenant.bootstrap.completed", {
        companyId: resolvedCompanyId,
        tenantBootstrapId: bootstrap?.tenantBootstrapId || null,
        financeFoundationRef: financeFoundation.foundationId
      });
    }
    return financeFoundation;
  }

  function materializeFinanceReadyFoundation({ companyId, bootstrap = null } = {}) {
    const legalFormDomain = getOptionalDomain("legalForm");
    const accountingMethodDomain = getOptionalDomain("accountingMethod");
    const fiscalYearDomain = getOptionalDomain("fiscalYear");
    const ledgerDomain = getOptionalDomain("ledger");
    const vatDomain = getOptionalDomain("vat");
    const reviewCenterDomain = getOptionalDomain("reviewCenter");
    const company = findCompanySnapshotById(companyId);
    const financeBlueprint =
      state.financeBlueprintsByCompany.get(companyId) ||
      inferFinanceBlueprint({
        companyId,
        bootstrap,
        company,
        checklist: bootstrap ? buildChecklist(bootstrap.tenantBootstrapId) : []
      });

    const legalFormProfile = legalFormDomain
      ? ensureActiveLegalFormProfile({ legalFormDomain, companyId, financeBlueprint })
      : null;
    const fiscalYearProfile = fiscalYearDomain
      ? ensureFiscalYearProfile({ fiscalYearDomain, companyId, financeBlueprint })
      : null;
    const activeFiscalYear = fiscalYearDomain
      ? ensureActiveFiscalYear({ fiscalYearDomain, companyId, financeBlueprint, fiscalYearProfile })
      : null;
    const accountingMethod = accountingMethodDomain
      ? ensureAccountingMethodProfile({ accountingMethodDomain, companyId, financeBlueprint })
      : null;
    const reportingObligation = legalFormDomain && legalFormProfile && activeFiscalYear
      ? ensureReportingObligation({
          legalFormDomain,
          companyId,
          financeBlueprint,
          legalFormProfile,
          activeFiscalYear
        })
      : null;
    const ledgerCatalog = ledgerDomain
      ? ledgerDomain.installLedgerCatalog({
          companyId,
          chartTemplateId: financeBlueprint.chartTemplateId,
          actorId: TENANT_BOOTSTRAP_ACTOR_ID
        })
      : null;
    const vatCatalog = vatDomain
      ? vatDomain.installVatCatalog({
          companyId,
          actorId: TENANT_BOOTSTRAP_ACTOR_ID
        })
      : null;
    const queueStructure = reviewCenterDomain
      ? ensureQueueStructure({
          reviewCenterDomain,
          companyId,
          financeBlueprint
        })
      : null;
    const roleTemplate = buildRoleTemplate(financeBlueprint);
    const checks = buildFinanceReadinessChecks({
      foundation: {
        legalFormProfile,
        fiscalYearProfile,
        activeFiscalYear,
        accountingMethod,
        reportingObligation,
        ledgerCatalog,
        vatCatalog,
        roleTemplate,
        queueStructure
      },
      checklist: bootstrap ? buildChecklist(bootstrap.tenantBootstrapId) : [],
      financeBlueprint
    });
    const status = checks.every((item) => item.status === "completed")
      ? "finance_ready"
      : checks.some((item) => item.status === "blocked")
        ? "blocked"
        : "pending";

    return {
      foundationId: `finance_foundation::${companyId}`,
      companyId,
      status,
      legalFormProfileId: legalFormProfile?.legalFormProfileId || null,
      legalFormCode: legalFormProfile?.legalFormCode || financeBlueprint.legalFormCode,
      accountingMethodProfileId: accountingMethod?.methodProfileId || null,
      accountingMethodCode: accountingMethod?.methodCode || financeBlueprint.accountingMethodCode,
      accountingMethodAssessmentId: accountingMethod?.eligibilityAssessmentId || null,
      fiscalYearProfileId: fiscalYearProfile?.fiscalYearProfileId || null,
      activeFiscalYearId: activeFiscalYear?.fiscalYearId || null,
      fiscalYearStartDate: activeFiscalYear?.startDate || financeBlueprint.fiscalYearStartDate,
      fiscalYearEndDate: activeFiscalYear?.endDate || financeBlueprint.fiscalYearEndDate,
      chartTemplateId: financeBlueprint.chartTemplateId,
      voucherSeriesCount: ledgerCatalog?.totalVoucherSeries || 0,
      reportingObligationProfileId: reportingObligation?.reportingObligationProfileId || null,
      reportingObligationStatus: reportingObligation?.status || null,
      vatProfile: {
        vatScheme: financeBlueprint.vatScheme,
        filingPeriod: financeBlueprint.vatFilingPeriod,
        vatCodeCount: vatCatalog?.totalVatCodes || 0,
        reviewQueueCode: "vat_decision_review"
      },
      roleTemplate,
      queueStructure,
      financeReadinessChecks: checks,
      materializedAt: nowIso(),
      updatedAt: nowIso()
    };
  }

  function ensureActiveLegalFormProfile({ legalFormDomain, companyId, financeBlueprint } = {}) {
    const profiles = legalFormDomain.listLegalFormProfiles({ companyId });
    const plannedOrActive =
      profiles.find((profile) => profile.status === "active") ||
      [...profiles].sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom))[0] ||
      legalFormDomain.createLegalFormProfile({
        companyId,
        legalFormCode: financeBlueprint.legalFormCode,
        effectiveFrom: financeBlueprint.fiscalYearStartDate,
        actorId: TENANT_BOOTSTRAP_ACTOR_ID
      });
    return plannedOrActive.status === "active"
      ? plannedOrActive
      : legalFormDomain.activateLegalFormProfile({
          companyId,
          legalFormProfileId: plannedOrActive.legalFormProfileId,
          actorId: TENANT_BOOTSTRAP_ACTOR_ID
        });
  }

  function ensureAccountingMethodProfile({ accountingMethodDomain, companyId, financeBlueprint } = {}) {
    const assessments = accountingMethodDomain.listMethodEligibilityAssessments({ companyId });
    const assessment =
      assessments[0] ||
      accountingMethodDomain.assessCashMethodEligibility({
        companyId,
        assessmentDate: financeBlueprint.fiscalYearStartDate,
        annualNetTurnoverSek: financeBlueprint.annualNetTurnoverSek,
        legalFormCode: financeBlueprint.legalFormCode,
        actorId: TENANT_BOOTSTRAP_ACTOR_ID
      });
    const existingProfiles = accountingMethodDomain.listMethodProfiles({ companyId });
    const matchingProfile =
      existingProfiles.find((profile) => profile.status === "active") ||
      existingProfiles.find(
        (profile) =>
          profile.methodCode === financeBlueprint.accountingMethodCode &&
          profile.effectiveFrom === financeBlueprint.fiscalYearStartDate
      ) ||
      accountingMethodDomain.createMethodProfile({
        companyId,
        methodCode: financeBlueprint.accountingMethodCode,
        effectiveFrom: financeBlueprint.fiscalYearStartDate,
        fiscalYearStartDate: financeBlueprint.fiscalYearStartDate,
        eligibilityAssessmentId: assessment.assessmentId,
        onboardingOverride: true,
        actorId: TENANT_BOOTSTRAP_ACTOR_ID
      });
    return matchingProfile.status === "active"
      ? matchingProfile
      : accountingMethodDomain.activateMethodProfile({
          companyId,
          methodProfileId: matchingProfile.methodProfileId,
          actorId: TENANT_BOOTSTRAP_ACTOR_ID
        });
  }

  function ensureFiscalYearProfile({ fiscalYearDomain, companyId, financeBlueprint } = {}) {
    const profiles = fiscalYearDomain.listFiscalYearProfiles({ companyId });
    return (
      profiles[0] ||
      fiscalYearDomain.createFiscalYearProfile({
        companyId,
        legalFormCode: financeBlueprint.legalFormCode,
        ownerTaxationCode: financeBlueprint.ownerTaxationCode,
        actorId: TENANT_BOOTSTRAP_ACTOR_ID
      })
    );
  }

  function ensureActiveFiscalYear({ fiscalYearDomain, companyId, financeBlueprint, fiscalYearProfile } = {}) {
    const existingActive = fiscalYearDomain.listFiscalYears({ companyId, status: "active" })[0] || null;
    if (existingActive) {
      return existingActive;
    }
    const matchingPlanned =
      fiscalYearDomain.listFiscalYears({ companyId }).find(
        (fiscalYear) =>
          fiscalYear.startDate === financeBlueprint.fiscalYearStartDate &&
          fiscalYear.endDate === financeBlueprint.fiscalYearEndDate
      ) ||
      fiscalYearDomain.createFiscalYear({
        companyId,
        fiscalYearProfileId: fiscalYearProfile?.fiscalYearProfileId || null,
        startDate: financeBlueprint.fiscalYearStartDate,
        endDate: financeBlueprint.fiscalYearEndDate,
        approvalBasisCode: "BOOKKEEPING_ENTRY",
        actorId: TENANT_BOOTSTRAP_ACTOR_ID
      });
    return matchingPlanned.status === "active"
      ? matchingPlanned
      : fiscalYearDomain.activateFiscalYear({
          companyId,
          fiscalYearId: matchingPlanned.fiscalYearId,
          actorId: TENANT_BOOTSTRAP_ACTOR_ID
        });
  }

  function ensureReportingObligation({
    legalFormDomain,
    companyId,
    financeBlueprint,
    legalFormProfile,
    activeFiscalYear
  } = {}) {
    const fiscalYearKey = String(activeFiscalYear.startDate || financeBlueprint.fiscalYearStartDate).slice(0, 4);
    const existing =
      legalFormDomain.listReportingObligationProfiles({ companyId }).find(
        (profile) =>
          profile.legalFormProfileId === legalFormProfile.legalFormProfileId &&
          profile.fiscalYearKey === fiscalYearKey
      ) ||
      legalFormDomain.createReportingObligationProfile({
        companyId,
        legalFormProfileId: legalFormProfile.legalFormProfileId,
        fiscalYearKey,
        fiscalYearId: activeFiscalYear.fiscalYearId,
        requiresAnnualReport: requiresAnnualReport(financeBlueprint.legalFormCode),
        requiresYearEndAccounts: true,
        allowsSimplifiedYearEnd: allowsSimplifiedYearEnd(financeBlueprint.legalFormCode),
        requiresBolagsverketFiling: requiresBolagsverketFiling(financeBlueprint.legalFormCode),
        requiresTaxDeclarationPackage: true,
        actorId: TENANT_BOOTSTRAP_ACTOR_ID
      });
    return existing.status === "approved"
      ? existing
      : legalFormDomain.approveReportingObligationProfile({
          companyId,
          reportingObligationProfileId: existing.reportingObligationProfileId,
          actorId: TENANT_BOOTSTRAP_ACTOR_ID
        });
  }

  function ensureQueueStructure({ reviewCenterDomain, companyId, financeBlueprint } = {}) {
    const queueCodes = [];
    for (const queueTemplate of DEFAULT_FINANCE_QUEUE_STRUCTURE) {
      const canonicalQueueCode = String(queueTemplate.queueCode || "")
        .trim()
        .replaceAll("-", "_")
        .replaceAll(" ", "_")
        .toUpperCase();
      const existingQueue = reviewCenterDomain.listReviewCenterQueues({ companyId }).find(
        (queue) => queue.queueCode === canonicalQueueCode
      );
      const queue =
        existingQueue ||
        reviewCenterDomain.createReviewQueue({
          companyId,
          queueCode: queueTemplate.queueCode,
          label: queueTemplate.label,
          ownerTeamId: queueTemplate.ownerTeamId,
          priority: queueTemplate.priority,
          defaultRiskClass: queueTemplate.defaultRiskClass,
          defaultSlaHours: queueTemplate.defaultSlaHours,
          escalationPolicyCode: queueTemplate.escalationPolicyCode,
          allowedSourceDomains: queueTemplate.allowedSourceDomains,
          requiredDecisionTypes: queueTemplate.requiredDecisionTypes,
          actorId: TENANT_BOOTSTRAP_ACTOR_ID
        });
      queueCodes.push(queueTemplate.queueCode);
    }
    return {
      queueStructureCode: financeBlueprint.queueStructureCode,
      queueCodes: [...new Set(queueCodes)].sort()
    };
  }

  function buildRoleTemplate(financeBlueprint) {
    return {
      roleTemplateCode: financeBlueprint.roleTemplateCode,
      assignments: copy(DEFAULT_ROLE_TEMPLATE_ASSIGNMENTS)
    };
  }

  function refreshCompanySetupProfile(companyId) {
    const orgAuthSnapshot = getOrgAuthSnapshot();
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const company = (orgAuthSnapshot?.companies || []).find((record) => record.companyId === resolvedCompanyId) || null;
    const tenantSetupProfile =
      (orgAuthSnapshot?.tenantSetupProfiles || []).find((record) => record.companyId === resolvedCompanyId) || null;
    const bootstrap = findTenantBootstrapByCompanyId(resolvedCompanyId);
    if (!tenantSetupProfile && !bootstrap) {
      return null;
    }
    upsertCompanySetupProfile({
      companyId: resolvedCompanyId,
      tenantBootstrapId: bootstrap?.tenantBootstrapId || tenantSetupProfile?.onboardingRunId || null,
      bootstrapStatus: bootstrap?.bootstrapStatus || null,
      currentStep: bootstrap?.currentStep || null,
      tenantSetupProfile,
      company
    });
    return state.companySetupProfiles.get(requireCompanySetupProfileId(resolvedCompanyId)) || null;
  }

  function findTenantBootstrapByCompanyId(companyId) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return [...state.tenantBootstraps.values()].find((record) => record.companyId === resolvedCompanyId) || null;
  }

  function snapshotTenantControl() {
    return copy({
      tenantBootstraps: [...state.tenantBootstraps.values()],
      bootstrapStepStates: [...state.bootstrapStepStates.values()],
      companySetupProfiles: [...state.companySetupProfiles.values()],
      moduleDefinitions: [...state.moduleDefinitions.values()],
      moduleActivationProfiles: [...state.moduleActivationProfiles.values()],
      trialEnvironmentProfiles: [...state.trialEnvironmentProfiles.values()],
      trialSupportPolicies: [...state.trialSupportPolicies.values()],
      promotionPlans: [...state.promotionPlans.values()],
      promotionValidationReports: [...state.promotionValidationReports.values()],
      portableDataBundles: [...state.portableDataBundles.values()],
      parallelRunPlans: [...state.parallelRunPlans.values()],
      pilotExecutions: [...state.pilotExecutions.values()],
      pilotCohorts: [...state.pilotCohorts.values()],
      parityScorecards: [...state.parityScorecards.values()],
      financeBlueprints: [...state.financeBlueprintsByCompany.values()],
      financeFoundationRecords: [...state.financeFoundationRecordsByCompany.values()],
      tenantControlEvents: [...state.tenantControlEvents],
      auditEvents: [...state.auditEvents]
    });
  }

  function exportDurableState() {
    return serializeDurableState(state);
  }

  function importDurableState(snapshot) {
    applyDurableStateSnapshot(state, snapshot);
  }

  function syncAllFromOrgAuth() {
    const orgAuthSnapshot = getOrgAuthSnapshot();
    if (!orgAuthSnapshot) {
      return;
    }
    syncBootstrapState(orgAuthSnapshot);
    syncModuleState(orgAuthSnapshot);
  }

  function syncRunFromOrgAuth(runId) {
    const orgAuthSnapshot = getOrgAuthSnapshot();
    if (!orgAuthSnapshot) {
      return;
    }
    syncBootstrapState(orgAuthSnapshot, runId);
  }

  function syncBootstrapState(orgAuthSnapshot, runId = null) {
    const runFilter = normalizeOptionalText(runId);
    const companiesById = new Map((orgAuthSnapshot.companies || []).map((record) => [record.companyId, record]));
    if (!runFilter) {
      state.tenantBootstraps.clear();
      state.bootstrapStepStates.clear();
      state.companySetupProfiles.clear();
      state.companySetupProfileIdByCompany.clear();
    }

    for (const run of orgAuthSnapshot.onboardingRuns || []) {
      if (runFilter && run.runId !== runFilter) {
        continue;
      }
      const stepStates = (orgAuthSnapshot.onboardingStepStates || []).filter((record) => record.runId === run.runId);
      const tenantSetupProfile = (orgAuthSnapshot.tenantSetupProfiles || []).find(
        (record) => record.companyId === run.companyId
      );
      upsertBootstrapMirror({
        run,
        stepStates,
        tenantSetupProfile,
        company: companiesById.get(run.companyId) || null
      });
    }

    for (const tenantSetupProfile of orgAuthSnapshot.tenantSetupProfiles || []) {
      if (runFilter) {
        const run = (orgAuthSnapshot.onboardingRuns || []).find((record) => record.runId === runFilter);
        if (!run || run.companyId !== tenantSetupProfile.companyId) {
          continue;
        }
      }
      if (!state.companySetupProfileIdByCompany.has(tenantSetupProfile.companyId)) {
        upsertCompanySetupProfile({
          companyId: tenantSetupProfile.companyId,
          tenantBootstrapId: null,
          bootstrapStatus: null,
          currentStep: null,
          tenantSetupProfile,
          company: companiesById.get(tenantSetupProfile.companyId) || null
        });
      }
    }
  }

  function syncModuleState(orgAuthSnapshot) {
    state.moduleDefinitions.clear();
    state.moduleActivationProfiles.clear();
    for (const record of orgAuthSnapshot.moduleDefinitions || []) {
      state.moduleDefinitions.set(createCompanyScopedKey(record.companyId, record.moduleCode), {
        ...copy(record),
        moduleActivationProfileId: null
      });
    }
    for (const record of orgAuthSnapshot.moduleActivations || []) {
      state.moduleActivationProfiles.set(createCompanyScopedKey(record.companyId, record.moduleCode), {
        ...copy(record),
        moduleActivationProfileId: record.moduleActivationId
      });
    }
  }

  function upsertBootstrapMirror({ run, stepStates, tenantSetupProfile, company } = {}) {
    const existing = state.tenantBootstraps.get(run.runId) || null;
    for (const stepState of stepStates) {
      state.bootstrapStepStates.set(createStepStateKey(stepState.runId, stepState.stepCode), copy(stepState));
    }
    const bootstrap = {
      tenantBootstrapId: run.runId,
      onboardingRunId: run.runId,
      companyId: run.companyId,
      resumeToken: run.resumeToken,
      status: mapCompanySetupStatus(tenantSetupProfile?.status, run.status),
      bootstrapStatus: run.status,
      currentStep: run.currentStep,
      legalName: company?.legalName || null,
      orgNumber: company?.orgNumber || null,
      companyStatus: company?.status || null,
      payloadJson: copy(run.payloadJson || {}),
      createdAt: existing?.createdAt || run.createdAt || nowIso(),
      updatedAt: nowIso()
    };
    state.tenantBootstraps.set(run.runId, bootstrap);
    upsertCompanySetupProfile({
      companyId: run.companyId,
      tenantBootstrapId: run.runId,
      bootstrapStatus: run.status,
      currentStep: run.currentStep,
      tenantSetupProfile,
      company
    });
  }

  function upsertCompanySetupProfile({
    companyId,
    tenantBootstrapId,
    bootstrapStatus,
    currentStep,
    tenantSetupProfile,
    company
  } = {}) {
    const existingId = state.companySetupProfileIdByCompany.get(companyId);
    const existing = existingId ? state.companySetupProfiles.get(existingId) : null;
    const companySetupProfileId =
      existingId ||
      tenantSetupProfile?.tenantSetupProfileId ||
      crypto.randomUUID();
    const status = mapCompanySetupStatus(tenantSetupProfile?.status, bootstrapStatus, company?.status, existing?.status);
    const financeBlueprint = state.financeBlueprintsByCompany.get(companyId) || inferFinanceBlueprint({
      companyId,
      bootstrap: tenantBootstrapId ? state.tenantBootstraps.get(tenantBootstrapId) || null : null,
      company,
      checklist: tenantBootstrapId ? buildChecklist(tenantBootstrapId) : []
    });
    const financeFoundation = state.financeFoundationRecordsByCompany.get(companyId) || null;
    const financeReadinessChecks = Array.isArray(financeFoundation?.financeReadinessChecks)
      ? copy(financeFoundation.financeReadinessChecks)
      : buildFinanceReadinessChecks({
          foundation: financeFoundation,
          checklist: tenantBootstrapId ? buildChecklist(tenantBootstrapId) : (() => {
            const bootstrap = findTenantBootstrapByCompanyId(companyId);
            return bootstrap ? buildChecklist(bootstrap.tenantBootstrapId) : [];
          })(),
          financeBlueprint
        });
    const record = {
      companySetupProfileId,
      tenantSetupProfileId: tenantSetupProfile?.tenantSetupProfileId || companySetupProfileId,
      companyId,
      tenantBootstrapId,
      status,
      bootstrapStatus,
      currentStep,
      onboardingCompletedAt: tenantSetupProfile?.onboardingCompletedAt || null,
      approvedAt: tenantSetupProfile?.approvedAt || null,
      suspendedAt: tenantSetupProfile?.suspendedAt || null,
      suspendedReasonCode: tenantSetupProfile?.suspendedReasonCode || null,
      financeReadyAt:
        status === "finance_ready" || status === "pilot" || status === "production_live"
          ? tenantSetupProfile?.onboardingCompletedAt || nowIso()
          : null,
      financeBlueprintJson: copy(financeBlueprint),
      financeFoundationJson: copy(financeFoundation),
      financeReadinessChecks,
      companyStatus: company?.status || null,
      createdAt: existing?.createdAt || tenantSetupProfile?.createdAt || nowIso(),
      updatedAt: nowIso()
    };
    state.companySetupProfiles.set(companySetupProfileId, record);
    state.companySetupProfileIdByCompany.set(companyId, companySetupProfileId);
  }

  function requireTenantBootstrap(tenantBootstrapId, resumeToken = null) {
    const bootstrap = state.tenantBootstraps.get(requireText(tenantBootstrapId, "tenant_bootstrap_id_required"));
    if (!bootstrap) {
      throw httpError(404, "tenant_bootstrap_not_found", "Tenant bootstrap was not found.");
    }
    if (resumeToken && bootstrap.resumeToken !== resumeToken) {
      throw httpError(403, "tenant_bootstrap_resume_token_invalid", "Resume token is invalid for this tenant bootstrap.");
    }
    return bootstrap;
  }

  function requireCompanySetupProfileId(companyId) {
    const companySetupProfileId = state.companySetupProfileIdByCompany.get(requireText(companyId, "company_id_required"));
    if (!companySetupProfileId) {
      throw httpError(404, "company_setup_profile_not_found", "Company setup profile was not found.");
    }
    return companySetupProfileId;
  }

  function requireModuleDefinition(companyId, moduleCode) {
    const record = state.moduleDefinitions.get(createCompanyScopedKey(companyId, moduleCode));
    if (!record) {
      throw httpError(404, "module_definition_not_found", "Module definition was not found.");
    }
    return record;
  }

  function requireModuleActivationProfile(companyId, moduleCode) {
    const record = state.moduleActivationProfiles.get(createCompanyScopedKey(companyId, moduleCode));
    if (!record) {
      throw httpError(404, "module_activation_profile_not_found", "Module activation profile was not found.");
    }
    return record;
  }

  function requireTrialEnvironment(trialEnvironmentProfileId) {
    const record = state.trialEnvironmentProfiles.get(requireText(trialEnvironmentProfileId, "trial_environment_profile_id_required"));
    if (!record) {
      throw httpError(404, "trial_environment_profile_not_found", "Trial environment profile was not found.");
    }
    return record;
  }

  function presentTenantBootstrap(tenantBootstrapId) {
    const bootstrap = requireTenantBootstrap(tenantBootstrapId);
    const financeBlueprint = state.financeBlueprintsByCompany.get(bootstrap.companyId) || null;
    const financeFoundation = state.financeFoundationRecordsByCompany.get(bootstrap.companyId) || null;
    return {
      tenantBootstrapId: bootstrap.tenantBootstrapId,
      runId: bootstrap.onboardingRunId,
      resumeToken: bootstrap.resumeToken,
      companyId: bootstrap.companyId,
      status: bootstrap.bootstrapStatus,
      companySetupStatus: bootstrap.status,
      currentStep: bootstrap.currentStep,
      payloadJson: copy(bootstrap.payloadJson || {}),
      financeBlueprintJson: copy(financeBlueprint),
      financeFoundationJson: copy(financeFoundation),
      checklist: buildChecklist(bootstrap.tenantBootstrapId)
    };
  }

  function buildChecklist(tenantBootstrapId) {
    const resolvedTenantBootstrapId = requireText(tenantBootstrapId, "tenant_bootstrap_id_required");
    return DEFAULT_ONBOARDING_STEP_CODES.map((stepCode) => {
      const stepState = state.bootstrapStepStates.get(createStepStateKey(resolvedTenantBootstrapId, stepCode));
      return {
        stepCode,
        status: stepState?.status || "pending",
        completedAt: stepState?.completedAt || null,
        dataJson: copy(stepState?.dataJson || {})
      };
    });
  }

  function authorizeCompanyAction({
    sessionToken,
    companyId,
    action,
    objectType,
    objectId,
    scopeCode
  } = {}) {
    const platform = requireOrgAuthPlatform();
    const { principal, decision } = platform.checkAuthorization({
      sessionToken,
      action: platform.actions[action],
      resource: {
        companyId: requireText(companyId, "company_id_required"),
        objectType: requireText(objectType, "object_type_required"),
        objectId: requireText(objectId, "object_id_required"),
        scopeCode: requireText(scopeCode, "scope_code_required")
      }
    });
    if (!decision.allowed) {
      throw httpError(403, "forbidden", "The current session is not authorized for this action.");
    }
    return principal;
  }

  function requireOrgAuthPlatform() {
    if (!orgAuthPlatform) {
      throw httpError(500, "tenant_control_org_auth_unavailable", "Tenant control requires org-auth orchestration.");
    }
    return orgAuthPlatform;
  }

  function normalizeTrialPolicyRoleCodes(roleCodes, code) {
    const resolved = normalizeStringList(roleCodes);
    for (const roleCode of resolved) {
      if (!TRIAL_POLICY_ALLOWED_ROLE_CODES.includes(roleCode)) {
        throw httpError(400, code, `Unsupported trial support role ${roleCode}.`);
      }
    }
    return resolved;
  }

  function validateCompanyUserIdsForPolicy({ companyId, companyUserIds } = {}) {
    const requestedIds = normalizeStringList(companyUserIds);
    if (requestedIds.length === 0) {
      return [];
    }
    const knownUsers = new Set(listSourceCompanyUsersSnapshot(companyId).map((record) => record.companyUserId));
    for (const companyUserId of requestedIds) {
      if (!knownUsers.has(companyUserId)) {
        throw httpError(409, "trial_support_policy_company_user_not_found", `Company user ${companyUserId} is not active in the company.`);
      }
    }
    return requestedIds;
  }

  function assertTrialResetRights({ principal, companyId } = {}) {
    const supportPolicy = resolveTrialSupportPolicy(companyId);
    const roleAllowed = (principal?.roles || []).some((roleCode) => supportPolicy.allowedResetRoleCodes.includes(roleCode));
    const userAllowed =
      normalizeOptionalText(principal?.companyUserId) != null
      && supportPolicy.allowedResetCompanyUserIds.includes(principal.companyUserId);
    if (!roleAllowed && !userAllowed) {
      throw httpError(403, "trial_environment_reset_right_required", "Trial reset requires explicit trial reset rights.");
    }
  }

  function getOrgAuthSnapshot() {
    const platform = requireOrgAuthPlatform();
    if (typeof platform.snapshot !== "function") {
      return null;
    }
    return platform.snapshot();
  }

  function resolveTrialSeedScenario(seedScenarioCode) {
    const requestedScenarioCode = normalizeOptionalText(seedScenarioCode);
    const canonicalScenarioCode =
      (requestedScenarioCode && TRIAL_SEED_SCENARIO_ALIAS_CODES[requestedScenarioCode]) ||
      requestedScenarioCode ||
      DEFAULT_TRIAL_SEED_SCENARIO_CODE;
    const scenario = TRIAL_SEED_SCENARIOS[canonicalScenarioCode];
    if (!scenario) {
      throw httpError(
        400,
        "trial_seed_scenario_not_supported",
        `Unsupported trial seed scenario: ${canonicalScenarioCode}.`
      );
    }
    return scenario;
  }

  function resolveTrialRefreshPack(refreshPackCode) {
    const canonicalRefreshPackCode = normalizeOptionalText(refreshPackCode) || DEFAULT_TRIAL_REFRESH_PACK_CODE;
    const refreshPack = TRIAL_REFRESH_PACKS[canonicalRefreshPackCode];
    if (!refreshPack) {
      throw httpError(400, "trial_refresh_pack_not_supported", `Unsupported trial refresh pack: ${canonicalRefreshPackCode}.`);
    }
    return refreshPack;
  }

  function materializeTrialSeedScenario({ companyId, scenario, seededAt, label = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedScenario = scenario || resolveTrialSeedScenario(null);
    const manifest = {
      seedCatalogRef: `${resolvedScenario.code}@${TRIAL_SEED_SCENARIO_VERSION}`,
      label: normalizeOptionalText(label) || resolvedScenario.label,
      legalFormCode: resolvedScenario.legalFormCode,
      chartTemplateId: resolvedScenario.chartTemplateId,
      vatSetup: {
        vatScheme: resolvedScenario.vatScheme,
        vatFilingPeriod: resolvedScenario.vatFilingPeriod
      },
      employees: resolvedScenario.employees.map((employeeCode, index) => ({
        employeeCode,
        employeeRef: `${resolvedCompanyId}:${resolvedScenario.code}:employee:${index + 1}`
      })),
      employments: resolvedScenario.employments.map((employmentCode, index) => ({
        employmentCode,
        employmentRef: `${resolvedCompanyId}:${resolvedScenario.code}:employment:${index + 1}`
      })),
      documents: resolvedScenario.documents.map((documentCode, index) => ({
        documentCode,
        documentRef: `${resolvedCompanyId}:${resolvedScenario.code}:document:${index + 1}`
      })),
      projects: resolvedScenario.projects.map((projectCode, index) => ({
        projectCode,
        projectRef: `${resolvedCompanyId}:${resolvedScenario.code}:project:${index + 1}`
      })),
      invoices: resolvedScenario.invoices.map((invoiceCode, index) => ({
        invoiceCode,
        invoiceRef: `${resolvedCompanyId}:${resolvedScenario.code}:invoice:${index + 1}`
      })),
      syntheticFeeds: resolvedScenario.syntheticFeeds.map((feedCode, index) => ({
        feedCode,
        feedRef: `${resolvedCompanyId}:${resolvedScenario.code}:feed:${index + 1}`
      })),
      workItems: resolvedScenario.workItems.map((workItemCode, index) => ({
        workItemCode,
        workItemRef: `${resolvedCompanyId}:${resolvedScenario.code}:work-item:${index + 1}`
      })),
      seededAt
    };
    return {
      summary: {
        seedCatalogRef: manifest.seedCatalogRef,
        label: resolvedScenario.label,
        legalFormCode: resolvedScenario.legalFormCode,
        chartTemplateId: resolvedScenario.chartTemplateId,
        vatScheme: resolvedScenario.vatScheme,
        vatFilingPeriod: resolvedScenario.vatFilingPeriod,
        employeeCount: manifest.employees.length,
        employmentCount: manifest.employments.length,
        documentCount: manifest.documents.length,
        projectCount: manifest.projects.length,
        invoiceCount: manifest.invoices.length,
        syntheticFeedCount: manifest.syntheticFeeds.length,
        workItemCount: manifest.workItems.length
      },
      manifest
    };
  }

  function materializeTrialRefreshPack({ trialEnvironment, refreshPack, refreshedAt } = {}) {
    const refreshOrdinal = Number(trialEnvironment?.refreshCount || 0) + 1;
    return {
      refreshPackCode: refreshPack.refreshPackCode,
      refreshPackVersion: TRIAL_REFRESH_PACK_VERSION,
      preserveMasterdata: refreshPack.preserveMasterdata === true,
      resetProcessData: refreshPack.resetProcessData === true,
      documents: refreshPack.appendDocuments.map((documentCode, index) => ({
        documentCode,
        documentRef: `${trialEnvironment.companyId}:${trialEnvironment.seedScenarioCode}:refresh:${refreshOrdinal}:document:${index + 1}`
      })),
      workItems: refreshPack.appendWorkItems.map((workItemCode, index) => ({
        workItemCode,
        workItemRef: `${trialEnvironment.companyId}:${trialEnvironment.seedScenarioCode}:refresh:${refreshOrdinal}:work-item:${index + 1}`
      })),
      refreshedAt
    };
  }

  function terminateTrialSessions({ sessionToken, companyId, actorId } = {}) {
    const authPlatform = requireOrgAuthPlatform();
    if (typeof authPlatform.snapshot !== "function" || typeof authPlatform.revokeSession !== "function") {
      return { sessionIds: [] };
    }
    const snapshot = authPlatform.snapshot();
    const currentSessionId =
      typeof authPlatform.inspectSession === "function"
        ? authPlatform.inspectSession({ sessionToken }).session.sessionId
        : null;
    const targetSessionIds = (snapshot.authSessions || [])
      .filter((session) => session.companyId === companyId)
      .filter((session) => session.status === "active" || session.status === "pending_mfa")
      .filter((session) => session.revokedAt == null)
      .map((session) => session.sessionId)
      .filter((sessionId) => sessionId !== currentSessionId);
    for (const targetSessionId of targetSessionIds) {
      if (typeof authPlatform.revokeSessionForCompanyOperation === "function") {
        authPlatform.revokeSessionForCompanyOperation({
          companyId,
          targetSessionId,
          actorId: requireText(actorId, "actor_id_required"),
          operationCode: "trial_environment_reset",
          explanation: "Session revoked by trial reset operation."
        });
        continue;
      }
      authPlatform.revokeSession({
        sessionToken,
        targetSessionId
      });
    }
    return {
      sessionIds: targetSessionIds
    };
  }

  function archiveTrialProcessState(trialEnvironment) {
    return {
      archiveRefId: `trial-archive:${trialEnvironment.trialEnvironmentProfileId}:reset:${trialEnvironment.resetCount + 1}`,
      archivedAt: nowIso(),
      retentionPolicyCode: trialEnvironment.trialDataRetentionPolicyCode || TRIAL_DATA_RETENTION_POLICY_CODE,
      previousResetCount: trialEnvironment.resetCount,
      previousRefreshCount: trialEnvironment.refreshCount,
      previousResetEvidenceBundleId: normalizeOptionalText(trialEnvironment.latestResetEvidenceBundleId),
      previousRefreshEvidenceBundleId: normalizeOptionalText(trialEnvironment.latestRefreshEvidenceBundleId)
    };
  }

  function createTrialLifecycleEvidenceBundle({
    trialEnvironment,
    actorId,
    bundleType,
    title,
    metadata = {}
  } = {}) {
    const evidenceDomain = getOptionalDomain("evidence");
    const artifactRefs = [
      {
        artifactType: "trial_seed_manifest",
        artifactRef: `trial-seed://${trialEnvironment.seedScenarioCode}@${trialEnvironment.seedScenarioVersion}`,
        checksum: hashJson(trialEnvironment.seedScenarioManifest),
        roleCode: "tenant_control",
        metadata: {
          seedScenarioCode: trialEnvironment.seedScenarioCode,
          seedScenarioVersion: trialEnvironment.seedScenarioVersion
        }
      }
    ];
    if (evidenceDomain && typeof evidenceDomain.createFrozenEvidenceBundleSnapshot === "function") {
      return evidenceDomain.createFrozenEvidenceBundleSnapshot({
        companyId: trialEnvironment.companyId,
        bundleType,
        sourceObjectType: "trial_environment_profile",
        sourceObjectId: trialEnvironment.trialEnvironmentProfileId,
        sourceObjectVersion: `${bundleType}:${trialEnvironment.resetCount}:${trialEnvironment.refreshCount}`,
        title,
        retentionClass: "operational",
        classificationCode: "restricted_internal",
        metadata,
        artifactRefs,
        relatedObjectRefs: [
          {
            objectType: "trial_environment_profile",
            objectId: trialEnvironment.trialEnvironmentProfileId,
            relationCode: "subject"
          }
        ],
        actorId,
        previousEvidenceBundleId:
          bundleType === "trial_reset"
            ? trialEnvironment.latestResetEvidenceBundleId
            : trialEnvironment.latestRefreshEvidenceBundleId,
        environmentMode: trialEnvironment.mode
      });
    }
    return {
      evidenceBundleId: crypto.randomUUID(),
      bundleType,
      sourceObjectType: "trial_environment_profile",
      sourceObjectId: trialEnvironment.trialEnvironmentProfileId,
      metadata: copy(metadata),
      artifactRefs,
      environmentMode: trialEnvironment.mode
    };
  }

  function getOptionalDomain(domainKey) {
    return typeof getDomain === "function" ? getDomain(domainKey) || null : null;
  }

  function assertTrialEnvironmentStatus(trialEnvironment, allowedStatuses, code) {
    const allowed = Array.isArray(allowedStatuses) ? allowedStatuses : [];
    if (
      trialEnvironment.status === "active"
      && normalizeOptionalText(trialEnvironment.expiresAt)
      && trialEnvironment.expiresAt < nowIso()
    ) {
      trialEnvironment.status = "expired";
      trialEnvironment.updatedAt = nowIso();
    }
    if (!allowed.includes(trialEnvironment.status)) {
      throw httpError(409, code, `Trial environment status ${trialEnvironment.status} is not allowed for this operation.`);
    }
  }

  function assertTrialEnvironmentReadyForPromotion(trialEnvironment) {
    assertTrialEnvironmentStatus(trialEnvironment, ["active"], "trial_environment_promotion_status_invalid");
    assertTrialEnvironmentIsolated(trialEnvironment);
    if (trialEnvironment.promotionEligibleFlag !== true) {
      throw httpError(409, "trial_environment_not_promotion_eligible", "Trial environment is not eligible for promotion.");
    }
  }

  function requireParallelRunPlan(parallelRunPlanId) {
    const record = state.parallelRunPlans.get(requireText(parallelRunPlanId, "parallel_run_plan_id_required"));
    if (!record) {
      throw httpError(404, "parallel_run_plan_not_found", "Parallel run plan was not found.");
    }
    return record;
  }

  function requirePilotExecution(pilotExecutionId) {
    const record = state.pilotExecutions.get(requireText(pilotExecutionId, "pilot_execution_id_required"));
    if (!record) {
      throw httpError(404, "pilot_execution_not_found", "Pilot execution was not found.");
    }
    return record;
  }

  function requirePilotCohort(pilotCohortId) {
    const record = state.pilotCohorts.get(requireText(pilotCohortId, "pilot_cohort_id_required"));
    if (!record) {
      throw httpError(404, "pilot_cohort_not_found", "Pilot cohort was not found.");
    }
    return record;
  }

  function requireParityScorecard(parityScorecardId) {
    const record = state.parityScorecards.get(requireText(parityScorecardId, "parity_scorecard_id_required"));
    if (!record) {
      throw httpError(404, "parity_scorecard_not_found", "Parity scorecard was not found.");
    }
    return record;
  }

  function requirePromotionPlan(promotionPlanId) {
    const record = state.promotionPlans.get(requireText(promotionPlanId, "promotion_plan_id_required"));
    if (!record) {
      throw httpError(404, "promotion_plan_not_found", "Promotion plan was not found.");
    }
    return record;
  }

  function requirePromotionValidationReport(promotionValidationReportId) {
    const record = state.promotionValidationReports.get(
      requireText(promotionValidationReportId, "promotion_validation_report_id_required")
    );
    if (!record) {
      throw httpError(404, "promotion_validation_report_not_found", "Promotion validation report was not found.");
    }
    return record;
  }

  function requirePortableDataBundle(portableDataBundleId) {
    const record = state.portableDataBundles.get(requireText(portableDataBundleId, "portable_data_bundle_id_required"));
    if (!record) {
      throw httpError(404, "portable_data_bundle_not_found", "Portable data bundle was not found.");
    }
    return record;
  }

  function resolvePortableCarryOverSelections(carryOverSelectionCodes) {
    const requested = normalizeStringList(carryOverSelectionCodes);
    const merged = [
      ...Object.values(PORTABLE_CARRY_OVER_SELECTIONS)
        .filter((selection) => selection.mandatory)
        .map((selection) => selection.selectionCode),
      ...requested
    ];
    const resolved = [];
    for (const selectionCode of merged) {
      const definition = PORTABLE_CARRY_OVER_SELECTIONS[selectionCode];
      if (!definition) {
        throw httpError(400, "trial_promotion_selection_unsupported", `Unsupported carry-over selection ${selectionCode}.`);
      }
      if (!resolved.includes(selectionCode)) {
        resolved.push(selectionCode);
      }
    }
    return resolved;
  }

  function presentPromotionPlan(plan) {
    const validationReport = plan.validationReportId
      ? state.promotionValidationReports.get(plan.validationReportId) || null
      : null;
    const portableDataBundle = plan.portableDataBundleId
      ? state.portableDataBundles.get(plan.portableDataBundleId) || null
      : null;
    return copy({
      ...plan,
      validationReport,
      portableDataBundle
    });
  }

  function presentPilotExecution(record) {
    return copy({
      ...record,
      scenarioResults: (record.scenarioResults || []).map((item) => copy(item)),
      scenarioSummary: copy(record.scenarioSummary),
      blockingIssueCodes: copy(record.blockingIssueCodes || []),
      nextActionCodes: copy(record.nextActionCodes || []),
      domainAvailability: copy(record.domainAvailability || []),
      rollbackPreparedness: copy(record.rollbackPreparedness || null),
      approvalCoverage: copy(record.approvalCoverage || null)
    });
  }

  function presentPilotCohort(record) {
    return copy({
      ...record,
      requiredScenarioCodes: copy(record.requiredScenarioCodes || []),
      pilotExecutionIds: copy(record.pilotExecutionIds || []),
      linkedPilotExecutions: copy(record.linkedPilotExecutions || []),
      coverageSummary: copy(record.coverageSummary || null),
      blockingIssueCodes: copy(record.blockingIssueCodes || []),
      reusableCutoverTemplateRefs: copy(record.reusableCutoverTemplateRefs || []),
      rollbackEvidenceRefs: copy(record.rollbackEvidenceRefs || []),
      approvalCoverage: copy(record.approvalCoverage || null)
    });
  }

  function presentParityScorecard(record) {
    return copy({
      ...record,
      pilotCohortIds: copy(record.pilotCohortIds || []),
      criteriaResults: copy(record.criteriaResults || []),
      gateResults: copy(record.gateResults || []),
      summary: copy(record.summary || null)
    });
  }

  function buildPromotionValidationReport({
    trialEnvironment,
    principal,
    carryOverSelectionCodes
  } = {}) {
    const company = findCompanySnapshotById(trialEnvironment.companyId);
    const financeBlueprint =
      state.financeBlueprintsByCompany.get(trialEnvironment.companyId)
      || inferFinanceBlueprint({ companyId: trialEnvironment.companyId, company });
    const financeFoundation = state.financeFoundationRecordsByCompany.get(trialEnvironment.companyId) || null;
    const registrations = listCompanyRegistrationsSnapshot(trialEnvironment.companyId);
    const sourceUsers = listSourceCompanyUsersSnapshot(trialEnvironment.companyId);
    const blockingIssues = [];
    const warnings = [];
    if (!company) {
      blockingIssues.push({
        issueCode: "source_company_missing",
        detail: "Source company profile is missing."
      });
    }
    if (financeFoundation?.status !== "finance_ready") {
      warnings.push({
        warningCode: "source_company_not_finance_ready",
        detail: "Source trial company is not finance-ready; promotion will use the portable finance blueprint instead."
      });
    }
    if (!company?.legalName || !company?.orgNumber) {
      blockingIssues.push({
        issueCode: "source_company_masterdata_incomplete",
        detail: "Legal name and org number are required before promotion."
      });
    }
    if (registrations.length === 0) {
      warnings.push({
        warningCode: "source_company_registrations_missing",
        detail: "Source trial company has no explicit registrations; promotion will stage default registration placeholders."
      });
    }
    if (sourceUsers.filter((item) => item.roleCode === "company_admin").length === 0) {
      blockingIssues.push({
        issueCode: "source_company_admin_missing",
        detail: "At least one active company admin is required for promotion."
      });
    }
    if (carryOverSelectionCodes.includes("users_roles") && sourceUsers.length === 0) {
      warnings.push({
        warningCode: "portable_users_roles_empty",
        detail: "No additional users or role assignments are available for staged carry-over."
      });
    }
    return {
      promotionValidationReportId: crypto.randomUUID(),
      companyId: trialEnvironment.companyId,
      trialEnvironmentProfileId: trialEnvironment.trialEnvironmentProfileId,
      status: blockingIssues.length === 0 ? "eligible" : "blocked",
      version: PROMOTION_VALIDATION_VERSION,
      sourceMasterdataSnapshotHash: hashJson({
        company,
        financeBlueprint,
        financeFoundationStatus: financeFoundation?.status || null,
        registrations,
        carryOverSelectionCodes
      }),
      carryOverSelectionCodes: copy(carryOverSelectionCodes),
      carryOverSelectionDetails: carryOverSelectionCodes.map((selectionCode) => copy(PORTABLE_CARRY_OVER_SELECTIONS[selectionCode])),
      sourceCompanyProfile: company
        ? {
            companyId: company.companyId,
            legalName: company.legalName,
            orgNumber: company.orgNumber,
            status: company.status
          }
        : null,
      sourceFinanceFoundationStatus: financeFoundation?.status || null,
      sourceFinanceBlueprint: copy(financeBlueprint),
      sourceRegistrationCount: registrations.length,
      sourceUserCount: sourceUsers.length,
      blockedForbiddenArtifactCodes: copy(FORBIDDEN_TRIAL_LIVE_ARTIFACT_CODES),
      blockingIssues,
      warnings,
      recommendedGoLivePath: DEFAULT_PROMOTION_GO_LIVE_PATH,
      generatedByUserId: principal.userId,
      createdAt: nowIso()
    };
  }

  function buildPortableDataBundle({
    trialEnvironment,
    validationReport,
    carryOverSelectionCodes
  } = {}) {
    const company = findCompanySnapshotById(trialEnvironment.companyId);
    const financeBlueprint =
      state.financeBlueprintsByCompany.get(trialEnvironment.companyId)
      || inferFinanceBlueprint({ companyId: trialEnvironment.companyId, company });
    const registrations = listCompanyRegistrationsSnapshot(trialEnvironment.companyId);
    const sourceUsers = listSourceCompanyUsersSnapshot(trialEnvironment.companyId);
    const portableDocuments =
      carryOverSelectionCodes.includes("portable_documents") || carryOverSelectionCodes.includes("document_templates")
        ? copy(trialEnvironment.seedScenarioManifest.documents || [])
        : [];
    const portableProjectTemplates = carryOverSelectionCodes.includes("project_templates")
      ? copy(trialEnvironment.seedScenarioManifest.projects || [])
      : [];
    const stagedUsers = carryOverSelectionCodes.includes("users_roles")
      ? sourceUsers.map((item) => ({
          userId: item.userId,
          email: item.email,
          displayName: item.displayName,
          roleCode: item.roleCode,
          stagedOnly: true
        }))
      : [];
    const stagedImportBatches = [...new Set(
      carryOverSelectionCodes.map((selectionCode) => PORTABLE_CARRY_OVER_SELECTIONS[selectionCode].importBatchCode)
    )].sort();
    return {
      portableDataBundleId: crypto.randomUUID(),
      companyId: trialEnvironment.companyId,
      trialEnvironmentProfileId: trialEnvironment.trialEnvironmentProfileId,
      validationReportId: validationReport.promotionValidationReportId,
      version: PROMOTION_PORTABLE_DATA_VERSION,
      carryOverSelectionCodes: copy(carryOverSelectionCodes),
      companyMasterdata: company
        ? {
            legalName: company.legalName,
            orgNumber: company.orgNumber,
            settingsJson: copy({
              accountingYear: financeBlueprint.accountingYear,
              chartTemplateId: financeBlueprint.chartTemplateId,
              voucherSeriesCodes: copy(company.settingsJson?.voucherSeriesCodes || DEFAULT_VOUCHER_SERIES_CODES),
              vatScheme: financeBlueprint.vatScheme,
              vatFilingPeriod: financeBlueprint.vatFilingPeriod,
              legalFormCode: financeBlueprint.legalFormCode,
              accountingMethodCode: financeBlueprint.accountingMethodCode,
              ownerTaxationCode: financeBlueprint.ownerTaxationCode,
              annualNetTurnoverSek: financeBlueprint.annualNetTurnoverSek
            })
          }
        : null,
      registrations: registrations.length > 0 ? copy(registrations) : buildDefaultPromotionRegistrations(),
      financeBlueprintJson: copy(financeBlueprint),
      portableDocuments,
      portableProjectTemplates,
      stagedUsers,
      stagedImportBatches,
      liveForbiddenArtifacts: FORBIDDEN_TRIAL_LIVE_ARTIFACT_CODES.map((artifactCode) => ({
        artifactCode,
        policy: "archive_in_trial_only"
      })),
      createdAt: nowIso()
    };
  }

  function evaluatePromotionApprovalCoverage({
    companyId,
    principalUserId,
    approvalActorIds
  } = {}) {
    const sourceUsers = listSourceCompanyUsersSnapshot(companyId);
    const financeActorIds = [];
    const securityActorIds = [];
    for (const approvalActorId of approvalActorIds) {
      const actorRecords = sourceUsers.filter((item) => item.userId === approvalActorId);
      if (actorRecords.some((item) => item.roleCode === "company_admin" || item.roleCode === "approver")) {
        financeActorIds.push(approvalActorId);
      }
      if (actorRecords.some((item) => ["approver", "bureau_user", "company_admin"].includes(item.roleCode))) {
        securityActorIds.push(approvalActorId);
      }
    }
    const implementationActorIds = normalizeStringList([principalUserId]);
    return {
      requiredApprovalClasses: copy(PROMOTION_REQUIRED_APPROVAL_CLASSES),
      implementation: {
        fulfilled: implementationActorIds.length > 0,
        actorUserIds: implementationActorIds
      },
      finance: {
        fulfilled: financeActorIds.length > 0,
        actorUserIds: normalizeStringList(financeActorIds)
      },
      security: {
        fulfilled: securityActorIds.length > 0,
        actorUserIds: normalizeStringList(securityActorIds)
      },
      complete: implementationActorIds.length > 0 && financeActorIds.length > 0 && securityActorIds.length > 0
    };
  }

  function materializeLiveCompanyFromPromotion({
    portableDataBundle,
    trialEnvironment,
    plan,
    principal
  } = {}) {
    const authPlatform = requireOrgAuthPlatform();
    const adminContact = resolvePromotionAdminContact({
      companyId: trialEnvironment.companyId,
      preferredUserId: principal.userId
    });
    const financeBlueprint = copy(portableDataBundle.financeBlueprintJson || {});
    const accountingYear = String(financeBlueprint.accountingYear || currentDateUtcYear());
    const liveBootstrap = authPlatform.createOnboardingRun({
      legalName: portableDataBundle.companyMasterdata?.legalName || `Live ${trialEnvironment.label}`,
      orgNumber: portableDataBundle.companyMasterdata?.orgNumber || "",
      adminEmail: adminContact.email,
      adminDisplayName: adminContact.displayName,
      accountingYear
    });
    state.financeBlueprintsByCompany.set(liveBootstrap.companyId, {
      ...financeBlueprint,
      companyId: liveBootstrap.companyId,
      sourceTrialEnvironmentProfileId: trialEnvironment.trialEnvironmentProfileId,
      promotionPlanId: plan.promotionPlanId
    });
    authPlatform.updateOnboardingStep({
      runId: liveBootstrap.runId,
      resumeToken: liveBootstrap.resumeToken,
      stepCode: "registrations",
      payload: {
        registrations: copy(portableDataBundle.registrations || [])
      }
    });
    authPlatform.updateOnboardingStep({
      runId: liveBootstrap.runId,
      resumeToken: liveBootstrap.resumeToken,
      stepCode: "chart_template",
      payload: {
        chartTemplateId: financeBlueprint.chartTemplateId,
        voucherSeriesCodes: copy((portableDataBundle.companyMasterdata?.settingsJson?.voucherSeriesCodes) || DEFAULT_VOUCHER_SERIES_CODES)
      }
    });
    authPlatform.updateOnboardingStep({
      runId: liveBootstrap.runId,
      resumeToken: liveBootstrap.resumeToken,
      stepCode: "vat_setup",
      payload: {
        vatScheme: financeBlueprint.vatScheme,
        filingPeriod: financeBlueprint.vatFilingPeriod
      }
    });
    authPlatform.updateOnboardingStep({
      runId: liveBootstrap.runId,
      resumeToken: liveBootstrap.resumeToken,
      stepCode: "fiscal_periods",
      payload: {
        year: Number(accountingYear)
      }
    });
    syncRunFromOrgAuth(liveBootstrap.runId);
    maybeMaterializeFinanceReadyFoundation(liveBootstrap.companyId);
    return {
      tenantBootstrapId: liveBootstrap.runId,
      resumeToken: liveBootstrap.resumeToken,
      companyId: liveBootstrap.companyId
    };
  }

  function resolvePromotionAdminContact({ companyId, preferredUserId = null } = {}) {
    const sourceUsers = listSourceCompanyUsersSnapshot(companyId);
    const preferred =
      (preferredUserId && sourceUsers.find((item) => item.userId === preferredUserId)) ||
      sourceUsers.find((item) => item.roleCode === "company_admin") ||
      sourceUsers[0] ||
      null;
    if (!preferred?.email || !preferred?.displayName) {
      throw httpError(409, "trial_promotion_admin_contact_missing", "Promotion requires an active source-company admin contact.");
    }
    return {
      email: preferred.email,
      displayName: preferred.displayName
    };
  }

  function listCompanyRegistrationsSnapshot(companyId) {
    const orgAuthSnapshot = getOrgAuthSnapshot();
    return copy(
      (orgAuthSnapshot?.companyRegistrations || [])
        .filter((record) => record.companyId === requireText(companyId, "company_id_required"))
        .sort((left, right) => left.registrationType.localeCompare(right.registrationType))
    );
  }

  function buildDefaultPromotionRegistrations() {
    const effectiveFrom = nowIso();
    return [
      {
        registrationType: "f_tax",
        registrationValue: "f_tax_pending_confirmation",
        status: "configured",
        effectiveFrom
      },
      {
        registrationType: "vat",
        registrationValue: "vat_pending_confirmation",
        status: "configured",
        effectiveFrom
      },
      {
        registrationType: "employer",
        registrationValue: "employer_pending_confirmation",
        status: "configured",
        effectiveFrom
      }
    ];
  }

  function listSourceCompanyUsersSnapshot(companyId) {
    const orgAuthSnapshot = getOrgAuthSnapshot();
    const usersById = new Map((orgAuthSnapshot?.users || []).map((record) => [record.userId, record]));
    return ((orgAuthSnapshot?.companyUsers || [])
      .filter((record) => record.companyId === requireText(companyId, "company_id_required"))
      .filter((record) => record.status === "active")
      .map((record) => ({
        companyUserId: record.companyUserId,
        companyId: record.companyId,
        userId: record.userId,
        roleCode: record.roleCode,
        email: usersById.get(record.userId)?.email || null,
        displayName: usersById.get(record.userId)?.displayName || null
      })));
  }

  function createPromotionEvidenceBundle({
    trialEnvironment,
    plan,
    validationReport,
    portableDataBundle,
    actorId,
    liveCompanyId
  } = {}) {
    const evidenceDomain = getOptionalDomain("evidence");
    const metadata = {
      promotionPlanId: plan.promotionPlanId,
      liveCompanyId,
      validationReportId: validationReport.promotionValidationReportId,
      portableDataBundleId: portableDataBundle.portableDataBundleId,
      carryOverSelectionCodes: copy(plan.carryOverSelectionCodes)
    };
    const artifactRefs = [
      {
        artifactType: "promotion_validation_report",
        artifactRef: `promotion-validation://${validationReport.promotionValidationReportId}`,
        checksum: hashJson(validationReport),
        roleCode: "tenant_control",
        metadata: {
          version: validationReport.version
        }
      },
      {
        artifactType: "portable_data_bundle",
        artifactRef: `portable-data://${portableDataBundle.portableDataBundleId}`,
        checksum: hashJson(portableDataBundle),
        roleCode: "tenant_control",
        metadata: {
          version: portableDataBundle.version
        }
      }
    ];
    if (evidenceDomain && typeof evidenceDomain.createFrozenEvidenceBundleSnapshot === "function") {
      return evidenceDomain.createFrozenEvidenceBundleSnapshot({
        companyId: trialEnvironment.companyId,
        bundleType: "trial_promotion",
        sourceObjectType: "promotion_plan",
        sourceObjectId: plan.promotionPlanId,
        sourceObjectVersion: `trial_promotion:${plan.updatedAt || plan.createdAt}`,
        title: "Trial promotion to live evidence",
        retentionClass: "operational",
        classificationCode: "restricted_internal",
        metadata,
        artifactRefs,
        relatedObjectRefs: [
          {
            objectType: "trial_environment_profile",
            objectId: trialEnvironment.trialEnvironmentProfileId,
            relationCode: "source_trial"
          },
          {
            objectType: "company",
            objectId: liveCompanyId,
            relationCode: "target_live"
          }
        ],
        actorId,
        previousEvidenceBundleId: trialEnvironment.latestPromotionEvidenceBundleId || null,
        environmentMode: trialEnvironment.mode
      });
    }
    return {
      evidenceBundleId: crypto.randomUUID(),
      bundleType: "trial_promotion",
      sourceObjectType: "promotion_plan",
      sourceObjectId: plan.promotionPlanId,
      metadata: copy(metadata),
      artifactRefs,
      environmentMode: trialEnvironment.mode
    };
  }

  function createPilotExecutionEvidenceBundle({
    record,
    actorId
  } = {}) {
    const evidenceDomain = getOptionalDomain("evidence");
    const metadata = {
      cohortCode: record.cohortCode,
      financeReadinessStatusAtStart: record.financeReadinessStatusAtStart,
      approvalCoverage: copy(record.approvalCoverage),
      rollbackPreparedness: copy(record.rollbackPreparedness),
      scenarioSummary: copy(record.scenarioSummary)
    };
    const artifactRefs = [
      {
        artifactType: "pilot_finance_readiness_snapshot",
        artifactRef: `pilot-finance-readiness://${record.companyId}/${record.pilotExecutionId}`,
        checksum: hashJson(record.financeReadinessSnapshot),
        roleCode: "tenant_control",
        metadata: {
          status: record.financeReadinessSnapshot?.status || null
        }
      },
      {
        artifactType: "pilot_scenario_matrix",
        artifactRef: `pilot-scenarios://${record.pilotExecutionId}`,
        checksum: hashJson(record.scenarioResults),
        roleCode: "tenant_control",
        metadata: {
          totalCount: record.scenarioResults.length
        }
      },
      {
        artifactType: "pilot_rollback_preparedness",
        artifactRef: `pilot-rollback://${record.pilotExecutionId}`,
        checksum: hashJson(record.rollbackPreparedness),
        roleCode: "tenant_control",
        metadata: {
          status: record.rollbackPreparedness?.status || null,
          strategyCode: record.rollbackPreparedness?.strategyCode || null
        }
      },
      ...flattenPilotArtifactRefs(record.scenarioResults),
      ...normalizePilotArtifactRefs(record.rollbackPreparedness?.evidenceRefs, {
        defaultArtifactType: "rollback_preparedness_evidence",
        roleCode: "pilot_execution"
      })
    ];
    const relatedObjectRefs = [
      {
        objectType: "company",
        objectId: record.companyId,
        relationCode: "pilot_company"
      }
    ];
    if (record.trialEnvironmentProfileId) {
      relatedObjectRefs.push({
        objectType: "trial_environment_profile",
        objectId: record.trialEnvironmentProfileId,
        relationCode: "source_trial"
      });
    }
    if (record.promotionPlanId) {
      relatedObjectRefs.push({
        objectType: "promotion_plan",
        objectId: record.promotionPlanId,
        relationCode: "promotion_plan"
      });
    }
    if (record.parallelRunPlanId) {
      relatedObjectRefs.push({
        objectType: "parallel_run_plan",
        objectId: record.parallelRunPlanId,
        relationCode: "parallel_run"
      });
    }
    if (record.cutoverPlanId) {
      relatedObjectRefs.push({
        objectType: "migration_cutover_plan",
        objectId: record.cutoverPlanId,
        relationCode: "cutover_plan"
      });
    }
    if (evidenceDomain && typeof evidenceDomain.createFrozenEvidenceBundleSnapshot === "function") {
      return evidenceDomain.createFrozenEvidenceBundleSnapshot({
        companyId: record.companyId,
        bundleType: "pilot_execution",
        sourceObjectType: "pilot_execution",
        sourceObjectId: record.pilotExecutionId,
        sourceObjectVersion: `pilot_execution:${record.updatedAt || record.createdAt}`,
        title: "Pilot execution evidence",
        retentionClass: "operational",
        classificationCode: "restricted_internal",
        metadata,
        artifactRefs,
        relatedObjectRefs,
        actorId,
        previousEvidenceBundleId: record.latestEvidenceBundleId || null,
        environmentMode: "pilot_parallel"
      });
    }
    return {
      evidenceBundleId: crypto.randomUUID(),
      bundleType: "pilot_execution",
      sourceObjectType: "pilot_execution",
      sourceObjectId: record.pilotExecutionId,
      metadata: copy(metadata),
      artifactRefs,
      relatedObjectRefs,
      environmentMode: "pilot_parallel"
    };
  }

  function createPilotCohortEvidenceBundle({
    record,
    actorId
  } = {}) {
    const evidenceDomain = getOptionalDomain("evidence");
    const metadata = {
      segmentCode: record.segmentCode,
      coverageSummary: copy(record.coverageSummary),
      approvalCoverage: copy(record.approvalCoverage)
    };
    const artifactRefs = [
      {
        artifactType: "pilot_cohort_coverage_matrix",
        artifactRef: `pilot-cohort-coverage://${record.pilotCohortId}`,
        checksum: hashJson(record.coverageSummary),
        roleCode: "tenant_control",
        metadata: {
          completedPilotCount: record.coverageSummary?.completedPilotCount || 0,
          missingScenarioCount: (record.coverageSummary?.missingScenarioCodes || []).length
        }
      },
      ...normalizePilotArtifactRefs(record.reusableCutoverTemplateRefs, {
        defaultArtifactType: "cutover_template_evidence",
        roleCode: "pilot_cohort"
      }),
      ...normalizePilotArtifactRefs(record.rollbackEvidenceRefs, {
        defaultArtifactType: "rollback_preparedness_evidence",
        roleCode: "pilot_cohort"
      })
    ];
    const relatedObjectRefs = [
      {
        objectType: "company",
        objectId: record.companyId,
        relationCode: "pilot_cohort_company"
      },
      ...(record.pilotExecutionIds || []).map((pilotExecutionId) => ({
        objectType: "pilot_execution",
        objectId: pilotExecutionId,
        relationCode: "pilot_execution"
      }))
    ];
    if (evidenceDomain && typeof evidenceDomain.createFrozenEvidenceBundleSnapshot === "function") {
      return evidenceDomain.createFrozenEvidenceBundleSnapshot({
        companyId: record.companyId,
        bundleType: "pilot_cohort",
        sourceObjectType: "pilot_cohort",
        sourceObjectId: record.pilotCohortId,
        sourceObjectVersion: `pilot_cohort:${record.updatedAt || record.createdAt}`,
        title: "Pilot cohort evidence",
        retentionClass: "operational",
        classificationCode: "restricted_internal",
        metadata,
        artifactRefs,
        relatedObjectRefs,
        actorId,
        previousEvidenceBundleId: record.latestEvidenceBundleId || null,
        environmentMode: "pilot_parallel"
      });
    }
    return {
      evidenceBundleId: crypto.randomUUID(),
      bundleType: "pilot_cohort",
      sourceObjectType: "pilot_cohort",
      sourceObjectId: record.pilotCohortId,
      metadata: copy(metadata),
      artifactRefs,
      relatedObjectRefs,
      environmentMode: "pilot_parallel"
    };
  }

  function createParityScorecardEvidenceBundle({
    record,
    actorId
  } = {}) {
    const evidenceDomain = getOptionalDomain("evidence");
    const metadata = {
      competitorCode: record.competitorCode,
      categoryCode: record.categoryCode,
      status: record.status,
      summary: copy(record.summary)
    };
    const artifactRefs = [
      {
        artifactType: "parity_scorecard_matrix",
        artifactRef: `parity-scorecard://${record.parityScorecardId}`,
        checksum: hashJson({
          criteriaResults: record.criteriaResults,
          gateResults: record.gateResults,
          summary: record.summary
        }),
        roleCode: "tenant_control",
        metadata: {
          competitorCode: record.competitorCode,
          parityAchieved: record.summary?.parityAchieved === true
        }
      },
      ...record.criteriaResults.flatMap((item) => normalizePilotArtifactRefs(item.evidenceRefs, {
        defaultArtifactType: "parity_criterion_evidence",
        roleCode: "parity_scorecard"
      })),
      ...record.gateResults.flatMap((item) => normalizePilotArtifactRefs(item.evidenceRefs, {
        defaultArtifactType: "parity_gate_evidence",
        roleCode: "parity_scorecard"
      }))
    ];
    const relatedObjectRefs = [
      {
        objectType: "company",
        objectId: record.companyId,
        relationCode: "parity_company"
      },
      ...(record.pilotCohortIds || []).map((pilotCohortId) => ({
        objectType: "pilot_cohort",
        objectId: pilotCohortId,
        relationCode: "accepted_pilot_cohort"
      }))
    ];
    if (evidenceDomain && typeof evidenceDomain.createFrozenEvidenceBundleSnapshot === "function") {
      return evidenceDomain.createFrozenEvidenceBundleSnapshot({
        companyId: record.companyId,
        bundleType: "parity_scorecard",
        sourceObjectType: "parity_scorecard",
        sourceObjectId: record.parityScorecardId,
        sourceObjectVersion: `parity_scorecard:${record.updatedAt || record.recordedAt}`,
        title: "Parity scorecard evidence",
        retentionClass: "operational",
        classificationCode: "restricted_internal",
        metadata,
        artifactRefs,
        relatedObjectRefs,
        actorId,
        previousEvidenceBundleId: record.latestEvidenceBundleId || null,
        environmentMode: "pilot_parallel"
      });
    }
    return {
      evidenceBundleId: crypto.randomUUID(),
      bundleType: "parity_scorecard",
      sourceObjectType: "parity_scorecard",
      sourceObjectId: record.parityScorecardId,
      metadata: copy(metadata),
      artifactRefs,
      relatedObjectRefs,
      environmentMode: "pilot_parallel"
    };
  }

  function findCompanySnapshotById(companyId) {
    const orgAuthSnapshot = getOrgAuthSnapshot();
    return (orgAuthSnapshot?.companies || []).find((record) => record.companyId === requireText(companyId, "company_id_required")) || null;
  }

  function appendDomainEvent(eventCode, payload) {
    state.tenantControlEvents.push({
      eventId: crypto.randomUUID(),
      eventCode: requireText(eventCode, "event_code_required"),
      payloadJson: copy(payload || {}),
      emittedAt: nowIso()
    });
  }

  function appendAuditEvent({ companyId, actorId, action, entityType, entityId, metadata = {} } = {}) {
    state.auditEvents.push({
      auditEventId: crypto.randomUUID(),
      companyId: requireText(companyId, "company_id_required"),
      actorId: normalizeOptionalText(actorId),
      action: requireText(action, "audit_action_required"),
      entityType: requireText(entityType, "audit_entity_type_required"),
      entityId: requireText(entityId, "audit_entity_id_required"),
      metadata: copy(metadata || {}),
      recordedAt: nowIso()
    });
  }

  function createTrialOperationAlert({
    companyId,
    alertCode,
    severityCode,
    queueCode,
    title,
    detail,
    trialEnvironment = null,
    promotionPlan = null,
    parallelRunPlan = null,
    ageHours = null
  } = {}) {
    return {
      trialOperationAlertId: crypto.randomUUID(),
      companyId,
      alertCode: requireText(alertCode, "trial_alert_code_required"),
      severityCode: requireText(severityCode, "trial_alert_severity_required"),
      queueCode: requireText(queueCode, "trial_alert_queue_required"),
      title: requireText(title, "trial_alert_title_required"),
      detail: requireText(detail, "trial_alert_detail_required"),
      trialEnvironmentProfileId: trialEnvironment?.trialEnvironmentProfileId || null,
      promotionPlanId: promotionPlan?.promotionPlanId || null,
      parallelRunPlanId: parallelRunPlan?.parallelRunPlanId || null,
      objectType:
        trialEnvironment != null
          ? "trial_environment_profile"
          : promotionPlan != null
            ? "promotion_plan"
            : parallelRunPlan != null
              ? "parallel_run_plan"
              : "trial_operations",
      objectId:
        trialEnvironment?.trialEnvironmentProfileId
        || promotionPlan?.promotionPlanId
        || parallelRunPlan?.parallelRunPlanId
        || companyId,
      ageHours: ageHours == null ? null : Number(ageHours.toFixed(2)),
      createdAt: nowIso()
    };
  }

  function resolvePromotionWorkflowStage(plan) {
    switch (plan.status) {
      case "validated":
        return "awaiting_approval";
      case "approved":
        return "ready_for_execution";
      case "executed":
        return "live_materialized";
      case "cancelled":
        return "cancelled";
      default:
        return "draft";
    }
  }

  function buildTrialScenarioBreakdown(trials) {
    const counts = new Map();
    for (const trial of trials) {
      const scenarioCode = normalizeOptionalText(trial.seedScenarioCode) || "unknown";
      counts.set(scenarioCode, Number(counts.get(scenarioCode) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([scenarioCode, count]) => ({ scenarioCode, count }))
      .sort((left, right) => right.count - left.count || left.scenarioCode.localeCompare(right.scenarioCode));
  }

  function resolvePilotScenarioDefinitions(requestedScenarioCodes = []) {
    const requested = normalizeStringList(requestedScenarioCodes);
    if (requested.length === 0) {
      return DEFAULT_PILOT_SCENARIO_DEFINITIONS.map((item) => copy(item));
    }
    const supportedDefinitions = [...DEFAULT_PILOT_SCENARIO_DEFINITIONS, ...OPTIONAL_PILOT_SCENARIO_DEFINITIONS];
    return requested.map((scenarioCode) => {
      const definition = supportedDefinitions.find((item) => item.scenarioCode === scenarioCode);
      if (!definition) {
        throw httpError(400, "pilot_scenario_unsupported", `Unsupported pilot scenario ${scenarioCode}.`);
      }
      return copy(definition);
    });
  }

  function requirePilotCohortSegmentDefinition(segmentCode) {
    const resolvedSegmentCode = requireText(String(segmentCode || ""), "pilot_cohort_segment_code_required");
    const definition = PILOT_COHORT_SEGMENT_DEFINITIONS.find((item) => item.segmentCode === resolvedSegmentCode);
    if (!definition) {
      throw httpError(400, "pilot_cohort_segment_unsupported", `Unsupported pilot cohort segment ${resolvedSegmentCode}.`);
    }
    return copy(definition);
  }

  function buildPilotScenarioResults(definitions) {
    const now = nowIso();
    return (Array.isArray(definitions) ? definitions : []).map((definition) => ({
      scenarioCode: definition.scenarioCode,
      label: definition.label,
      domainCode: definition.domainCode,
      description: definition.description,
      requiredFlag: true,
      status: "pending",
      blockerCodes: [],
      evidenceRefs: [],
      notes: null,
      recordedByUserId: null,
      recordedAt: null,
      updatedAt: now
    }));
  }

  function buildPilotDomainAvailability(definitions = DEFAULT_PILOT_SCENARIO_DEFINITIONS) {
    const domainChecksByCode = new Map([
      ["finance", { domainCode: "finance", requiredDomains: ["ledger", "ar", "ap", "banking"] }],
      ["vat", { domainCode: "vat", requiredDomains: ["vat"] }],
      ["payroll", { domainCode: "payroll", requiredDomains: ["payroll"] }],
      ["hus", { domainCode: "hus", requiredDomains: ["hus"] }],
      ["tax_account", { domainCode: "tax_account", requiredDomains: ["taxAccount"] }],
      ["annual_reporting", { domainCode: "annual_reporting", requiredDomains: ["annualReporting"] }],
      ["support", { domainCode: "support", requiredDomains: ["core"] }],
      ["projects", { domainCode: "projects", requiredDomains: ["projects"] }],
      ["personalliggare_id06", { domainCode: "personalliggare_id06", requiredDomains: ["personalliggare", "id06"] }],
      ["enterprise_auth", { domainCode: "enterprise_auth", requiredDomains: ["orgAuth"] }]
    ]);
    const requestedDomainCodes = [
      ...new Set((Array.isArray(definitions) ? definitions : []).map((item) => item.domainCode).filter(Boolean))
    ];
    return requestedDomainCodes.map((domainCode) => {
      const item = domainChecksByCode.get(domainCode) || { domainCode, requiredDomains: [] };
      const missingDomainKeys = item.requiredDomains.filter((domainKey) => !getOptionalDomain(domainKey));
      return {
        domainCode: item.domainCode,
        available: missingDomainKeys.length === 0,
        requiredDomains: copy(item.requiredDomains),
        missingDomainKeys
      };
    });
  }

  function syncPilotExecutionDerivedState(record) {
    const scenarioSummary = buildPilotScenarioSummary(record.scenarioResults);
    record.scenarioSummary = scenarioSummary;
    record.blockingIssueCodes = buildPilotBlockingIssueCodes(record, scenarioSummary);
    record.nextActionCodes = buildPilotNextActionCodes(record, scenarioSummary);
    if (scenarioSummary.failedCount > 0 || scenarioSummary.blockedCount > 0) {
      record.status = "blocked";
      record.gateStatus = "blocked";
      return;
    }
    if (record.status !== "completed") {
      record.status = "in_progress";
      record.gateStatus = scenarioSummary.pendingCount === 0 ? "ready_for_completion" : "in_progress";
    }
  }

  function buildPilotScenarioSummary(scenarios) {
    const items = Array.isArray(scenarios) ? scenarios : [];
    const totalCount = items.length;
    const pendingCount = items.filter((item) => item.status === "pending").length;
    const passedCount = items.filter((item) => item.status === "passed").length;
    const blockedCount = items.filter((item) => item.status === "blocked").length;
    const failedCount = items.filter((item) => item.status === "failed").length;
    const requiredCount = items.filter((item) => item.requiredFlag !== false).length;
    return {
      totalCount,
      requiredCount,
      pendingCount,
      passedCount,
      blockedCount,
      failedCount,
      readyForCompletion: requiredCount > 0 && pendingCount === 0 && blockedCount === 0 && failedCount === 0,
      coveragePercent: requiredCount > 0 ? Number(((passedCount / requiredCount) * 100).toFixed(2)) : 0
    };
  }

  function buildPilotBlockingIssueCodes(record, scenarioSummary) {
    const blockingIssues = [];
    if (record.financeReadinessSnapshot?.status !== "finance_ready") {
      blockingIssues.push("finance_readiness_not_green");
    }
    if (scenarioSummary.pendingCount > 0) {
      blockingIssues.push("pilot_scenarios_pending");
    }
    if (scenarioSummary.blockedCount > 0) {
      blockingIssues.push("pilot_scenarios_blocked");
    }
    if (scenarioSummary.failedCount > 0) {
      blockingIssues.push("pilot_scenarios_failed");
    }
    if ((record.domainAvailability || []).some((item) => item.available !== true)) {
      blockingIssues.push("pilot_domain_unavailable");
    }
    if (record.rollbackPreparedness?.status !== "verified") {
      blockingIssues.push("rollback_preparedness_missing");
    }
    if (record.approvalCoverage?.complete !== true) {
      blockingIssues.push("pilot_signoff_incomplete");
    }
    if (!record.latestEvidenceBundleId && record.status === "completed") {
      blockingIssues.push("pilot_evidence_missing");
    }
    return [...new Set(blockingIssues)];
  }

  function buildPilotNextActionCodes(record, scenarioSummary) {
    const nextActions = [];
    if (scenarioSummary.pendingCount > 0) {
      nextActions.push("record_remaining_scenarios");
    }
    if (scenarioSummary.blockedCount > 0 || scenarioSummary.failedCount > 0) {
      nextActions.push("resolve_blocked_scenarios");
    }
    if (record.rollbackPreparedness?.status !== "verified") {
      nextActions.push("attach_rollback_preparedness");
    }
    if (scenarioSummary.readyForCompletion && record.approvalCoverage?.complete !== true) {
      nextActions.push("collect_pilot_signoff");
    }
    if (record.status === "completed" && !record.latestEvidenceBundleId) {
      nextActions.push("freeze_pilot_evidence");
    }
    return [...new Set(nextActions)];
  }

  function linkPilotExecutionsIntoCohort({ record, pilotExecutionIds = [], principalUserId } = {}) {
    const resolvedPilotExecutionIds = normalizeStringList(pilotExecutionIds);
    for (const pilotExecutionId of resolvedPilotExecutionIds) {
      const pilotExecution = requirePilotExecution(pilotExecutionId);
      if (pilotExecution.companyId !== record.companyId) {
        throw httpError(409, "pilot_cohort_company_scope_mismatch", "Pilot execution belongs to another company.");
      }
      if (pilotExecution.status !== "completed") {
        throw httpError(409, "pilot_cohort_requires_completed_pilot", "Pilot cohort requires completed pilot executions.");
      }
      if (!record.requiredScenarioCodes.every((scenarioCode) => pilotExecution.scenarioResults.some((item) => item.scenarioCode === scenarioCode))) {
        throw httpError(409, "pilot_cohort_scenario_coverage_mismatch", "Pilot execution does not cover the required segment scenarios.");
      }
      if (!record.pilotExecutionIds.includes(pilotExecution.pilotExecutionId)) {
        record.pilotExecutionIds.push(pilotExecution.pilotExecutionId);
      }
      pilotExecution.cohortCode = record.segmentCode;
      pilotExecution.updatedAt = nowIso();
    }
    record.linkedPilotExecutions = record.pilotExecutionIds
      .map((pilotExecutionId) => state.pilotExecutions.get(pilotExecutionId))
      .filter(Boolean)
      .map((pilotExecution) => ({
        pilotExecutionId: pilotExecution.pilotExecutionId,
        label: pilotExecution.label,
        cohortCode: pilotExecution.cohortCode,
        companyId: pilotExecution.companyId,
        scenarioSummary: copy(pilotExecution.scenarioSummary),
        latestEvidenceBundleId: pilotExecution.latestEvidenceBundleId || null,
        completedAt: pilotExecution.completedAt || null
      }));
    record.updatedAt = nowIso();
    syncPilotCohortDerivedState(record);
    appendDomainEvent("pilot.cohort.pilots_linked", {
      companyId: record.companyId,
      pilotCohortId: record.pilotCohortId,
      actorUserId: principalUserId,
      pilotExecutionIds: copy(record.pilotExecutionIds)
    });
  }

  function syncPilotCohortDerivedState(record) {
    const coverageSummary = buildPilotCohortCoverageSummary(record);
    record.coverageSummary = coverageSummary;
    if (record.status === "accepted" || record.status === "rejected") {
      return;
    }
    if (coverageSummary.completedPilotCount === 0) {
      record.status = "planned";
    } else {
      record.status = "running";
    }
    record.blockingIssueCodes = buildPilotCohortBlockingIssueCodes(record);
  }

  function buildPilotCohortCoverageSummary(record) {
    const linkedPilots = (record.pilotExecutionIds || [])
      .map((pilotExecutionId) => state.pilotExecutions.get(pilotExecutionId))
      .filter(Boolean);
    const coveredScenarioCodes = [
      ...new Set(
        linkedPilots.flatMap((pilotExecution) =>
          (pilotExecution.scenarioResults || [])
            .filter((item) => item.status === "passed")
            .map((item) => item.scenarioCode)
        )
      )
    ].sort();
    const requiredScenarioCodes = normalizeStringList(record.requiredScenarioCodes);
    const missingScenarioCodes = requiredScenarioCodes.filter((scenarioCode) => !coveredScenarioCodes.includes(scenarioCode));
    const completedPilotCount = linkedPilots.filter((pilotExecution) => pilotExecution.status === "completed").length;
    return {
      requiredScenarioCodes,
      coveredScenarioCodes,
      missingScenarioCodes,
      completedPilotCount,
      minimumPilotCount: Number(record.minimumPilotCount || 1),
      readyForAcceptance: completedPilotCount >= Number(record.minimumPilotCount || 1) && missingScenarioCodes.length === 0
    };
  }

  function buildPilotCohortBlockingIssueCodes(record) {
    const issues = [];
    if ((record.coverageSummary?.completedPilotCount || 0) < Number(record.minimumPilotCount || 1)) {
      issues.push("pilot_cohort_needs_completed_pilots");
    }
    if ((record.coverageSummary?.missingScenarioCodes || []).length > 0) {
      issues.push("pilot_cohort_missing_segment_coverage");
    }
    return [...new Set(issues)];
  }

  function requireParityCompetitorDefinition(competitorCode) {
    const resolvedCompetitorCode = requireText(String(competitorCode || ""), "parity_competitor_code_required");
    const definition = PARITY_COMPETITOR_DEFINITIONS.find((item) => item.competitorCode === resolvedCompetitorCode);
    if (!definition) {
      throw httpError(400, "parity_competitor_unsupported", `Unsupported parity competitor ${resolvedCompetitorCode}.`);
    }
    return copy(definition);
  }

  function normalizeParityCriterionResults({ competitorDefinition, criteriaResults } = {}) {
    const rawResults = Array.isArray(criteriaResults) ? criteriaResults : [];
    return competitorDefinition.criterionCodes.map((criterionCode) => {
      const definition = PARITY_BENCHMARK_CRITERIA[criterionCode];
      const entry = rawResults.find((item) => item?.criterionCode === criterionCode) || null;
      if (!definition || !entry) {
        throw httpError(409, "parity_scorecard_missing_criterion", `Parity scorecard requires criterion ${criterionCode}.`);
      }
      const status = requireParityCriterionStatus(entry.status);
      return {
        criterionCode,
        label: definition.label,
        status,
        notes: normalizeOptionalText(entry.notes),
        evidenceRefs: normalizePilotArtifactRefs(entry.evidenceRefs, {
          defaultArtifactType: "parity_criterion_evidence",
          roleCode: "parity_scorecard"
        })
      };
    });
  }

  function normalizeParityGateResults(gateResults) {
    const rawResults = Array.isArray(gateResults) ? gateResults : [];
    return GO_LIVE_PARITY_GATE_CODES.map((gateCode) => {
      const entry = rawResults.find((item) => item?.gateCode === gateCode) || null;
      if (!entry) {
        throw httpError(409, "parity_scorecard_missing_gate", `Parity scorecard requires gate ${gateCode}.`);
      }
      const status = requireParityCriterionStatus(entry.status);
      return {
        gateCode,
        status,
        notes: normalizeOptionalText(entry.notes),
        evidenceRefs: normalizePilotArtifactRefs(entry.evidenceRefs, {
          defaultArtifactType: "parity_gate_evidence",
          roleCode: "parity_scorecard"
        })
      };
    });
  }

  function buildParityScorecardSummary({ criteriaResults = [], gateResults = [] } = {}) {
    const greenCriteriaCount = criteriaResults.filter((item) => item.status === "green").length;
    const redCriteriaCount = criteriaResults.filter((item) => item.status === "red").length;
    const amberCriteriaCount = criteriaResults.filter((item) => item.status === "amber").length;
    const blockedGateCodes = gateResults.filter((item) => item.status !== "green").map((item) => item.gateCode);
    return {
      totalCriteriaCount: criteriaResults.length,
      greenCriteriaCount,
      amberCriteriaCount,
      redCriteriaCount,
      blockedGateCodes,
      parityAchieved: redCriteriaCount === 0 && amberCriteriaCount === 0 && blockedGateCodes.length === 0
    };
  }

  function requirePilotScenarioStatus(status) {
    const resolved = requireText(String(status || ""), "pilot_scenario_status_required");
    if (!PILOT_SCENARIO_STATUSES.includes(resolved) || resolved === "pending") {
      throw httpError(400, "pilot_scenario_status_invalid", "Pilot scenario status must be passed, blocked or failed.");
    }
    return resolved;
  }

  function requireParityCriterionStatus(status) {
    const resolved = requireText(String(status || ""), "parity_status_required");
    if (!PARITY_CRITERION_STATUSES.includes(resolved)) {
      throw httpError(400, "parity_status_invalid", "Parity status must be green, amber, red or na.");
    }
    return resolved;
  }

  function evaluatePilotApprovalCoverage({
    companyId,
    principalUserId,
    approvalActorIds
  } = {}) {
    const sourceUsers = listSourceCompanyUsersSnapshot(companyId);
    const financeActorIds = [];
    const supportActorIds = [];
    for (const approvalActorId of approvalActorIds) {
      const actorRecords = sourceUsers.filter((item) => item.userId === approvalActorId);
      if (actorRecords.some((item) => item.roleCode === "company_admin" || item.roleCode === "approver")) {
        financeActorIds.push(approvalActorId);
      }
      if (actorRecords.some((item) => ["approver", "bureau_user", "company_admin"].includes(item.roleCode))) {
        supportActorIds.push(approvalActorId);
      }
    }
    const implementationActorIds = normalizeStringList([principalUserId]);
    return {
      requiredApprovalClasses: copy(PILOT_REQUIRED_APPROVAL_CLASSES),
      implementation: {
        fulfilled: implementationActorIds.length > 0,
        actorUserIds: implementationActorIds
      },
      finance: {
        fulfilled: financeActorIds.length > 0,
        actorUserIds: normalizeStringList(financeActorIds)
      },
      support: {
        fulfilled: supportActorIds.length > 0,
        actorUserIds: normalizeStringList(supportActorIds)
      },
      complete: implementationActorIds.length > 0 && financeActorIds.length > 0 && supportActorIds.length > 0
    };
  }

  function normalizePilotArtifactRefs(values, { defaultArtifactType = "pilot_evidence", roleCode = "pilot_execution" } = {}) {
    return (Array.isArray(values) ? values : [])
      .map((entry, index) => {
        if (typeof entry === "string") {
          const artifactRef = normalizeOptionalText(entry);
          if (!artifactRef) {
            return null;
          }
          return {
            artifactType: defaultArtifactType,
            artifactRef,
            checksum: hashJson({ artifactRef }),
            roleCode,
            metadata: {}
          };
        }
        if (!entry || typeof entry !== "object") {
          return null;
        }
        const artifactRef = normalizeOptionalText(entry.artifactRef) || normalizeOptionalText(entry.ref);
        if (!artifactRef) {
          return null;
        }
        return {
          artifactType: normalizeOptionalText(entry.artifactType) || defaultArtifactType,
          artifactRef,
          checksum: normalizeOptionalText(entry.checksum) || hashJson({ artifactRef, index }),
          roleCode: normalizeOptionalText(entry.roleCode) || roleCode,
          metadata: copy(entry.metadata || {})
        };
      })
      .filter(Boolean);
  }

  function flattenPilotArtifactRefs(scenarios) {
    return (Array.isArray(scenarios) ? scenarios : []).flatMap((scenario) =>
      normalizePilotArtifactRefs(scenario.evidenceRefs, {
        defaultArtifactType: "pilot_scenario_evidence",
        roleCode: "pilot_execution"
      }).map((artifact) => ({
        ...artifact,
        metadata: {
          ...artifact.metadata,
          scenarioCode: scenario.scenarioCode,
          scenarioStatus: scenario.status
        }
      }))
    );
  }

  function groupItemsBy(items, keyResolver) {
    const grouped = new Map();
    for (const item of Array.isArray(items) ? items : []) {
      const key = keyResolver(item);
      if (!key) {
        continue;
      }
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(item);
    }
    return grouped;
  }

  function hoursBetween(left, right) {
    return (new Date(left).getTime() - new Date(right).getTime()) / 3600000;
  }

  function daysBetween(left, right) {
    return (new Date(left).getTime() - new Date(right).getTime()) / 86400000;
  }
}

function normalizeFinanceBlueprint({
  legalName = null,
  accountingYear = null,
  legalFormCode = null,
  accountingMethodCode = null,
  ownerTaxationCode = null,
  annualNetTurnoverSek = null,
  fiscalYearStartDate = null,
  fiscalYearEndDate = null,
  chartTemplateId = null,
  vatScheme = null,
  vatFilingPeriod = null,
  roleTemplateCode = null,
  queueStructureCode = null
} = {}) {
  const normalizedAccountingYear = normalizeOptionalText(accountingYear) || String(new Date().getUTCFullYear());
  const inferredLegalFormCode = inferLegalFormCode({ legalName, legalFormCode });
  const startDate = normalizeOptionalText(fiscalYearStartDate) || `${normalizedAccountingYear}-01-01`;
  return {
    legalFormCode: normalizeOptionalText(legalFormCode) || inferredLegalFormCode,
    accountingMethodCode: normalizeOptionalText(accountingMethodCode) || DEFAULT_ACCOUNTING_METHOD_CODE,
    ownerTaxationCode: normalizeOptionalText(ownerTaxationCode) || defaultOwnerTaxationCode(inferredLegalFormCode),
    annualNetTurnoverSek: normalizeMoneyOrDefault(annualNetTurnoverSek, 0),
    fiscalYearStartDate: startDate,
    fiscalYearEndDate: normalizeOptionalText(fiscalYearEndDate) || `${startDate.slice(0, 4)}-12-31`,
    chartTemplateId: normalizeOptionalText(chartTemplateId) || DEFAULT_CHART_TEMPLATE_ID,
    vatScheme: normalizeOptionalText(vatScheme) || DEFAULT_VAT_SCHEME,
    vatFilingPeriod: normalizeOptionalText(vatFilingPeriod) || DEFAULT_VAT_FILING_PERIOD,
    roleTemplateCode: normalizeOptionalText(roleTemplateCode) || DEFAULT_ROLE_TEMPLATE_CODE,
    queueStructureCode: normalizeOptionalText(queueStructureCode) || DEFAULT_QUEUE_STRUCTURE_CODE
  };
}

function inferFinanceBlueprint({ companyId, bootstrap = null, company = null, checklist = [] } = {}) {
  const chartStep = checklist.find((step) => step.stepCode === "chart_template")?.dataJson || {};
  const vatStep = checklist.find((step) => step.stepCode === "vat_setup")?.dataJson || {};
  const fiscalPeriodsStep = checklist.find((step) => step.stepCode === "fiscal_periods")?.dataJson || {};
  const accountingYear =
    normalizeOptionalText(fiscalPeriodsStep.year ? String(fiscalPeriodsStep.year) : null) ||
    normalizeOptionalText(company?.settingsJson?.accountingYear) ||
    normalizeOptionalText(bootstrap?.payloadJson?.accountingYear) ||
    String(new Date().getUTCFullYear());
  return normalizeFinanceBlueprint({
    legalName: company?.legalName || bootstrap?.legalName || companyId,
    accountingYear,
    legalFormCode: bootstrap?.payloadJson?.legalFormCode || company?.settingsJson?.legalFormCode || null,
    accountingMethodCode: bootstrap?.payloadJson?.accountingMethodCode || company?.settingsJson?.accountingMethodCode || null,
    ownerTaxationCode: bootstrap?.payloadJson?.ownerTaxationCode || company?.settingsJson?.ownerTaxationCode || null,
    annualNetTurnoverSek: bootstrap?.payloadJson?.annualNetTurnoverSek || company?.settingsJson?.annualNetTurnoverSek || 0,
    fiscalYearStartDate: bootstrap?.payloadJson?.fiscalYearStartDate || `${accountingYear}-01-01`,
    fiscalYearEndDate: bootstrap?.payloadJson?.fiscalYearEndDate || `${accountingYear}-12-31`,
    chartTemplateId: chartStep.chartTemplateId || company?.settingsJson?.chartTemplateId,
    vatScheme: vatStep.vatScheme || company?.settingsJson?.vatScheme,
    vatFilingPeriod: vatStep.filingPeriod || company?.settingsJson?.vatFilingPeriod,
    roleTemplateCode: bootstrap?.payloadJson?.roleTemplateCode || null,
    queueStructureCode: bootstrap?.payloadJson?.queueStructureCode || null
  });
}

function buildFinanceReadinessChecks({ foundation, checklist = [], financeBlueprint = null } = {}) {
  const bootstrapCompleted = checklist.length > 0 && checklist.every((step) => step.status === "completed");
  const roleTemplateAssignments = foundation?.roleTemplate?.assignments || [];
  const queueCodes = foundation?.queueStructure?.queueCodes || [];
  return [
    buildCheck("bootstrap_completed", bootstrapCompleted, bootstrapCompleted ? null : "onboarding steps are incomplete"),
    buildCheck("legal_form_profile", Boolean(foundation?.legalFormProfile), "legal form profile is missing"),
    buildCheck("accounting_method_profile", Boolean(foundation?.accountingMethod), "accounting method profile is missing"),
    buildCheck("fiscal_year_active", Boolean(foundation?.activeFiscalYear), "active fiscal year is missing"),
    buildCheck("chart_template_installed", (foundation?.ledgerCatalog?.totalAccounts || 0) > 0, "ledger catalog is missing"),
    buildCheck("vat_profile", (foundation?.vatCatalog?.totalVatCodes || 0) > 0 && Boolean(financeBlueprint?.vatScheme), "VAT profile is missing"),
    buildCheck("reporting_obligation", Boolean(foundation?.reportingObligation), "reporting obligation profile is missing"),
    buildCheck("role_template", roleTemplateAssignments.length > 0, "role template is missing"),
    buildCheck("queue_structure", queueCodes.length >= 3, "queue structure is incomplete")
  ];
}

function buildCheck(code, completed, blockerMessage = null) {
  return {
    checkCode: code,
    status: completed ? "completed" : blockerMessage ? "blocked" : "pending",
    blockerMessage: completed ? null : blockerMessage
  };
}

function inferLegalFormCode({ legalName = null, legalFormCode = null } = {}) {
  if (normalizeOptionalText(legalFormCode)) {
    return requireText(legalFormCode, "legal_form_code_required");
  }
  const normalizedLegalName = String(legalName || "").trim().toUpperCase();
  if (normalizedLegalName.endsWith(" AB")) {
    return "AKTIEBOLAG";
  }
  if (normalizedLegalName.endsWith(" KB")) {
    return "KOMMANDITBOLAG";
  }
  if (normalizedLegalName.endsWith(" HB")) {
    return "HANDELSBOLAG";
  }
  if (normalizedLegalName.includes("EKONOMISK FÖRENING") || normalizedLegalName.includes("EK. FÖR")) {
    return "EKONOMISK_FORENING";
  }
  return DEFAULT_LEGAL_FORM_CODE;
}

function defaultOwnerTaxationCode(legalFormCode) {
  return legalFormCode === "ENSKILD_NARINGSVERKSAMHET" ? "PHYSICAL_PERSON_PARTICIPANT" : "LEGAL_PERSON_ONLY";
}

function requiresAnnualReport(legalFormCode) {
  return ["AKTIEBOLAG", "EKONOMISK_FORENING"].includes(legalFormCode);
}

function requiresBolagsverketFiling(legalFormCode) {
  return ["AKTIEBOLAG", "EKONOMISK_FORENING"].includes(legalFormCode);
}

function allowsSimplifiedYearEnd(legalFormCode) {
  return ["ENSKILD_NARINGSVERKSAMHET", "HANDELSBOLAG", "KOMMANDITBOLAG"].includes(legalFormCode);
}

function normalizeMoneyOrDefault(value, defaultValue) {
  const resolved = Number(value);
  return Number.isFinite(resolved) && resolved >= 0 ? resolved : defaultValue;
}

function buildTrialIsolationProfile({ orgAuthPlatform, sessionToken, companyId, watermarkCode } = {}) {
  const normalizedWatermarkCode = normalizeTrialWatermarkCode(watermarkCode);
  const authModeCatalog = resolveTrialAuthModeCatalog({ orgAuthPlatform, sessionToken, companyId });
  return {
    mode: DEFAULT_TRIAL_MODE,
    watermarkCode: normalizedWatermarkCode,
    watermarkPolicy: {
      watermarkCode: normalizedWatermarkCode,
      bannerText: "TRIAL - no legal effect",
      applyToEvidence: true,
      applyToExports: true,
      applyToReadModels: true
    },
    providerPolicyCode: DEFAULT_TRIAL_PROVIDER_POLICY_CODE,
    providerPolicy: {
      providerPolicyCode: DEFAULT_TRIAL_PROVIDER_POLICY_CODE,
      supportsLegalEffect: false,
      supportsRealCredentials: false,
      authProviders: authModeCatalog,
      adapters: {
        banking: {
          trialSafe: true,
          sandboxSupported: false,
          adapterMode: "simulator",
          supportsLegalEffect: false
        },
        submissions: {
          trialSafe: true,
          sandboxSupported: false,
          adapterMode: "simulator",
          supportsLegalEffect: false,
          receiptMode: "synthetic"
        },
        payments: {
          trialSafe: true,
          sandboxSupported: true,
          adapterMode: "sandbox_or_simulator",
          supportsLegalEffect: false
        },
        taxAccount: {
          trialSafe: true,
          sandboxSupported: false,
          adapterMode: "simulator",
          supportsLegalEffect: false
        },
        ocr: {
          trialSafe: true,
          sandboxSupported: true,
          adapterMode: "sandbox_or_simulator",
          supportsLegalEffect: false
        },
        publicApi: {
          trialSafe: true,
          sandboxSupported: true,
          adapterMode: "sandbox",
          supportsLegalEffect: false
        }
      }
    },
    supportsRealCredentials: false,
    supportsLegalEffect: false,
    promotionEligibleFlag: true,
    trialIsolationStatus: "isolated",
    blockedOperationClasses: DEFAULT_TRIAL_BLOCKED_OPERATION_CLASSES
  };
}

function resolveTrialAuthModeCatalog({ orgAuthPlatform, sessionToken, companyId } = {}) {
  if (!orgAuthPlatform || typeof orgAuthPlatform.getIdentityIsolationSummary !== "function") {
    return [];
  }
  const summary = orgAuthPlatform.getIdentityIsolationSummary({
    sessionToken,
    companyId
  });
  return (summary.modeCatalog || [])
    .filter((entry) => entry.runtimeMode === DEFAULT_TRIAL_MODE)
    .map((entry) => ({
      providerCode: entry.providerCode,
      providerEnvironmentRef: entry.providerEnvironmentRef,
      callbackDomain: entry.callbackDomain,
      callbackPath: entry.callbackPath,
      redirectUri: entry.redirectUri,
      allowsTestIdentities: entry.allowsTestIdentities === true,
      supportsLegalEffect: entry.supportsLegalEffect === true,
      sandboxSupported: true
    }));
}

function normalizeTrialWatermarkCode(value) {
  return requireText(String(value || DEFAULT_TRIAL_WATERMARK_CODE), "trial_watermark_required")
    .replaceAll(/[^A-Za-z0-9_]+/g, "_")
    .replaceAll(/_+/g, "_")
    .replace(/^_/, "")
    .replace(/_$/, "")
    .toUpperCase();
}

function assertTrialEnvironmentIsolated(trialEnvironment) {
  if (!trialEnvironment || trialEnvironment.mode !== DEFAULT_TRIAL_MODE) {
    throw httpError(409, "trial_environment_mode_invalid", "Trial environment must run in trial mode.");
  }
  if (trialEnvironment.supportsRealCredentials !== false || trialEnvironment.liveCredentialPolicy !== "blocked") {
    throw httpError(409, "trial_environment_live_credentials_not_blocked", "Trial environment must block live credentials.");
  }
  if (trialEnvironment.supportsLegalEffect !== false || trialEnvironment.liveSubmissionPolicy !== "blocked") {
    throw httpError(409, "trial_environment_legal_effect_not_blocked", "Trial environment must block legal effect.");
  }
  if (trialEnvironment.liveBankRailPolicy !== "blocked" || trialEnvironment.liveEconomicEffectPolicy !== "blocked") {
    throw httpError(409, "trial_environment_live_effect_not_blocked", "Trial environment must block live bank rails and live economic effect.");
  }
  if (normalizeOptionalText(trialEnvironment.providerPolicyCode) == null || trialEnvironment.trialIsolationStatus !== "isolated") {
    throw httpError(409, "trial_environment_not_isolated", "Trial environment isolation policy is incomplete.");
  }
}

function mapCompanySetupStatus(tenantStatus, bootstrapStatus = null, companyStatus = null, existingStatus = null) {
  if (tenantStatus === "suspended") {
    return "suspended";
  }
  if (existingStatus === "production_live" && tenantStatus === "active") {
    return "production_live";
  }
  if (existingStatus === "pilot" && tenantStatus === "active") {
    return "pilot";
  }
  if (companyStatus === "trial") {
    return "pilot";
  }
  if (tenantStatus === "active") {
    return companyStatus === "active" ? "finance_ready" : "finance_ready";
  }
  if (tenantStatus === "setup_pending" || bootstrapStatus === "in_progress") {
    return "bootstrap_running";
  }
  return "draft";
}

function createCompanyScopedKey(companyId, recordCode) {
  return `${requireText(companyId, "company_id_required")}::${requireText(recordCode, "record_code_required")}`;
}

function createStepStateKey(tenantBootstrapId, stepCode) {
  return `${requireText(tenantBootstrapId, "tenant_bootstrap_id_required")}::${requireText(stepCode, "step_code_required")}`;
}

function appendToIndex(index, key, value) {
  const resolvedKey = requireText(key, "index_key_required");
  const next = [...new Set([...(index.get(resolvedKey) || []), value])];
  index.set(resolvedKey, next);
}

function requireText(value, code) {
  if (typeof value !== "string" || value.trim() === "") {
    throw httpError(400, code, `${code.replaceAll("_", " ")}.`);
  }
  return value.trim();
}

function normalizeOptionalText(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function normalizeStringList(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => normalizeOptionalText(String(value || ""))).filter(Boolean))].sort();
}

function normalizePositiveInteger(value, code) {
  const resolved = Number(value);
  if (!Number.isInteger(resolved) || resolved <= 0) {
    throw httpError(400, code, `${code.replaceAll("_", " ")}.`);
  }
  return resolved;
}

function nowIso(clock = () => new Date()) {
  return clock().toISOString();
}

function currentDateUtcYear(clock = () => new Date()) {
  return clock().getUTCFullYear();
}

function copy(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function hashJson(value) {
  return crypto.createHash("sha256").update(JSON.stringify(copy(value))).digest("hex");
}

function httpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
