import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { matchPath } from "./route-helpers.mjs";

export const ROUTE_TRUST_LEVELS = Object.freeze(["public", "authenticated", "mfa", "strong_mfa"]);

const MUTATING_HTTP_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const READONLY_HTTP_METHODS = new Set(["GET"]);
const ACTION_SEGMENTS = new Set([
  "accept",
  "ack",
  "acknowledge",
  "activate",
  "approve",
  "archive",
  "assert",
  "assign",
  "attach_document",
  "book",
  "claim",
  "close",
  "collect",
  "complete",
  "convert_to_project_budget",
  "convert_to_quote",
  "correct",
  "correction",
  "corrections",
  "decide",
  "deliver",
  "diagnostics",
  "dispatch",
  "end",
  "escalate",
  "execute",
  "export",
  "fail",
  "final_extract",
  "finalize",
  "generate_periods",
  "health",
  "health_checks",
  "import",
  "import_records",
  "invoice",
  "lock",
  "match",
  "override",
  "post",
  "post_review",
  "ready_for_sign",
  "recalculate",
  "refresh",
  "regenerate",
  "reject",
  "release",
  "reopen",
  "repair",
  "replay",
  "replay_plan",
  "respond",
  "resolve",
  "retry",
  "retry_delivery",
  "return",
  "revoke",
  "revise",
  "rotate",
  "run",
  "send",
  "share",
  "sign",
  "signoff",
  "signoffs",
  "snooze",
  "start",
  "status",
  "stabilize",
  "submit",
  "suspend",
  "switch",
  "triage",
  "update",
  "validate",
  "versions",
  "writeoffs"
]);
const GENERIC_OBJECT_TYPES = new Set([
  "account",
  "agreement",
  "batch",
  "bundle",
  "case",
  "chain",
  "checklist",
  "comment",
  "connection",
  "decision",
  "definition",
  "diff",
  "drill",
  "entry",
  "event",
  "export",
  "flag",
  "item",
  "job",
  "line",
  "membership",
  "message",
  "notification",
  "offset",
  "operation",
  "package",
  "period",
  "plan",
  "profile",
  "proposal",
  "record",
  "report",
  "request",
  "resource",
  "run",
  "scenario",
  "secret",
  "session",
  "snapshot",
  "statement",
  "task",
  "token",
  "type",
  "user",
  "version",
  "widget"
]);
const EXACT_PUBLIC_ROUTE_KEYS = new Set([
  "POST /v1/system/bootstrap/validate",
  "POST /v1/auth/login",
  "POST /v1/auth/federation/start",
  "POST /v1/onboarding/runs",
  "POST /v1/tenant/bootstrap",
  "POST /v1/public/oauth/token"
]);
const SELF_ROUTE_KEYS = new Set([
  "POST /v1/auth/logout",
  "POST /v1/auth/challenges",
  "POST /v1/auth/challenges/:challengeId/complete",
  "POST /v1/auth/devices/:deviceTrustRecordId/trust",
  "POST /v1/auth/devices/:deviceTrustRecordId/revoke",
  "POST /v1/auth/mfa/totp/enroll",
  "POST /v1/auth/mfa/totp/verify",
  "POST /v1/auth/mfa/passkeys/register-options",
  "POST /v1/auth/mfa/passkeys/register-verify",
  "POST /v1/auth/mfa/passkeys/assert",
  "POST /v1/auth/bankid/start",
  "POST /v1/auth/bankid/collect",
  "POST /v1/auth/federation/callback",
  "POST /v1/authz/check",
  "POST /v1/hr/employee-portal/me/leave-entries",
  "PATCH /v1/hr/employee-portal/me/leave-entries/:leaveEntryId",
  "POST /v1/hr/employee-portal/me/leave-entries/:leaveEntryId/submit"
]);
const LOW_RISK_COMPANY_READ_ROUTE_KEYS = new Set([
  "POST /v1/notifications/bulk-actions",
  "POST /v1/notifications/:notificationId/read",
  "POST /v1/notifications/:notificationId/ack",
  "POST /v1/notifications/:notificationId/acknowledge",
  "POST /v1/notifications/:notificationId/snooze"
]);
const HIGH_RISK_ROUTE_PREFIXES = Object.freeze([
  "/v1/org/",
  "/v1/ledger/",
  "/v1/sie/",
  "/v1/vat/",
  "/v1/banking/",
  "/v1/payroll/",
  "/v1/pension/",
  "/v1/annual-reporting/",
  "/v1/submissions/",
  "/v1/backoffice/",
  "/v1/ops/",
  "/v1/migration/",
  "/v1/tax-account/",
  "/v1/legal-forms/",
  "/v1/accounting-method/",
  "/v1/fiscal-years/",
  "/v1/balances/",
  "/v1/collective-agreements/",
  "/v1/tenant/",
  "/v1/trial/",
  "/v1/pilot/"
]);

const EXPLICIT_ROUTE_OVERRIDES = new Map([
  ["POST /v1/auth/logout", override("auth", "identity_session_end", "authenticated", "self", "auth_session", "auth_session", null, false)],
  ["GET /v1/auth/providers/isolation", { ...override("auth", "identity_provider_isolation_read", "strong_mfa", "company", "auth_provider_isolation", "auth_provider_isolation", "company.read", true), mutation: false }],
  ["GET /v1/auth/factors", { ...override("auth", "identity_factor_inventory_read", "authenticated", "self", "auth_factor", "auth_factor", null, false), mutation: false }],
  ["POST /v1/tenant/bootstrap", override("tenant", "tenant_bootstrap_create", "public", "public", "tenant_bootstrap", "tenant_bootstrap", null, false)],
  ["GET /v1/tenant/bootstrap/:tenantBootstrapId", { ...override("tenant", "tenant_bootstrap_read", "authenticated", "company", "tenant_bootstrap", "tenant_bootstrap", "company.read", true), mutation: false }],
  ["GET /v1/tenant/bootstrap/:tenantBootstrapId/checklist", { ...override("tenant", "tenant_bootstrap_checklist_read", "authenticated", "company", "tenant_bootstrap", "tenant_bootstrap", "company.read", false), mutation: false }],
  ["GET /v1/tenant/bootstrap/profile", { ...override("tenant", "company_setup_profile_read", "strong_mfa", "company", "tenant_setup", "company_setup_profile", "company.read", false), mutation: false }],
  ["POST /v1/tenant/modules/definitions", override("tenant", "module_definition_manage", "strong_mfa", "company", "module_activation", "module_definition", "company.manage", false)],
  ["GET /v1/tenant/modules/definitions", { ...override("tenant", "module_definition_read", "strong_mfa", "company", "module_activation", "module_definition", "company.read", false), mutation: false }],
  ["POST /v1/tenant/modules/activations", override("tenant", "module_activation_manage", "strong_mfa", "company", "module_activation", "module_activation_profile", "company.manage", true)],
  ["GET /v1/tenant/modules/activations", { ...override("tenant", "module_activation_read", "strong_mfa", "company", "module_activation", "module_activation_profile", "company.read", false), mutation: false }],
  ["POST /v1/tenant/modules/activations/:moduleCode/suspend", override("tenant", "module_activation_suspend", "strong_mfa", "company", "module_activation", "module_activation_profile", "company.manage", true)],
  ["POST /v1/tenant/parallel-runs", override("tenant", "parallel_run_start", "strong_mfa", "company", "parallel_run", "parallel_run_plan", "company.manage", true)],
  ["POST /v1/trial/environments", override("trial", "trial_environment_create", "strong_mfa", "company", "trial_environment", "trial_environment_profile", "company.manage", false)],
  ["GET /v1/trial/environments", { ...override("trial", "trial_environment_read", "strong_mfa", "company", "trial_environment", "trial_environment_profile", "company.read", false), mutation: false }],
  ["POST /v1/trial/environments/:trialEnvironmentProfileId/reset", override("trial", "trial_environment_reset", "strong_mfa", "company", "trial_environment", "trial_environment_profile", "company.manage", true)],
  ["POST /v1/trial/environments/:trialEnvironmentProfileId/refresh", override("trial", "trial_environment_refresh", "strong_mfa", "company", "trial_environment", "trial_environment_profile", "company.manage", true)],
  ["POST /v1/trial/promotions", override("trial", "trial_promotion_create", "strong_mfa", "company", "promotion_plan", "promotion_plan", "company.manage", false)],
  ["POST /v1/trial/promotions/:promotionPlanId/execute", override("trial", "trial_promotion_execute", "strong_mfa", "company", "promotion_plan", "promotion_plan", "company.manage", true)],
  ["GET /v1/trial/promotions", { ...override("trial", "trial_promotion_read", "strong_mfa", "company", "promotion_plan", "promotion_plan", "company.read", false), mutation: false }],
  ["GET /v1/trial/promotions/workflows", { ...override("trial", "trial_promotion_workflow_read", "strong_mfa", "company", "promotion_plan", "promotion_workflow", "company.read", false), mutation: false }],
  ["GET /v1/trial/support-policy", { ...override("trial", "trial_support_policy_read", "strong_mfa", "company", "trial_support_policy", "trial_support_policy", "company.read", false), mutation: false }],
  ["POST /v1/trial/support-policy", override("trial", "trial_support_policy_manage", "strong_mfa", "company", "trial_support_policy", "trial_support_policy", "company.manage", true)],
  ["GET /v1/trial/operations", { ...override("trial", "trial_operations_snapshot_read", "strong_mfa", "company", "trial_support_policy", "trial_operations_snapshot", "company.read", false), mutation: false }],
  ["GET /v1/trial/operations/alerts", { ...override("trial", "trial_operations_alert_read", "strong_mfa", "company", "trial_support_policy", "trial_operation_alert", "company.read", false), mutation: false }],
  ["GET /v1/trial/operations/queues", { ...override("trial", "trial_operations_queue_read", "strong_mfa", "company", "trial_support_policy", "trial_operations_queue", "company.read", false), mutation: false }],
  ["GET /v1/trial/analytics", { ...override("trial", "trial_sales_demo_analytics_read", "strong_mfa", "company", "trial_support_policy", "trial_sales_demo_analytics", "company.read", false), mutation: false }],
  ["POST /v1/pilot/executions", override("pilot", "pilot_execution_start", "strong_mfa", "company", "pilot_execution", "pilot_execution", "company.manage", false)],
  ["GET /v1/pilot/executions", { ...override("pilot", "pilot_execution_read", "strong_mfa", "company", "pilot_execution", "pilot_execution", "company.read", false), mutation: false }],
  ["GET /v1/pilot/executions/:pilotExecutionId", { ...override("pilot", "pilot_execution_read", "strong_mfa", "company", "pilot_execution", "pilot_execution", "company.read", false), mutation: false }],
  ["POST /v1/pilot/executions/:pilotExecutionId/scenarios/:scenarioCode", override("pilot", "pilot_execution_scenario_record", "strong_mfa", "pilot_execution", "pilot_execution", "pilot_execution", "company.manage", true)],
  ["POST /v1/pilot/executions/:pilotExecutionId/complete", override("pilot", "pilot_execution_complete", "strong_mfa", "pilot_execution", "pilot_execution", "pilot_execution", "company.manage", true)],
  ["GET /v1/pilot/executions/:pilotExecutionId/evidence", { ...override("pilot", "pilot_execution_evidence_read", "strong_mfa", "pilot_execution", "pilot_execution", "evidence_bundle", "company.read", false), mutation: false }],
  ["POST /v1/pilot/cohorts", override("pilot", "pilot_cohort_start", "strong_mfa", "company", "pilot_cohort", "pilot_cohort", "company.manage", false)],
  ["GET /v1/pilot/cohorts", { ...override("pilot", "pilot_cohort_read", "strong_mfa", "company", "pilot_cohort", "pilot_cohort", "company.read", false), mutation: false }],
  ["GET /v1/pilot/cohorts/:pilotCohortId", { ...override("pilot", "pilot_cohort_read", "strong_mfa", "pilot_cohort", "pilot_cohort", "pilot_cohort", "company.read", false), mutation: false }],
  ["POST /v1/pilot/cohorts/:pilotCohortId/pilots", override("pilot", "pilot_cohort_pilot_attach", "strong_mfa", "pilot_cohort", "pilot_cohort", "pilot_cohort", "company.manage", true)],
  ["POST /v1/pilot/cohorts/:pilotCohortId/assess", override("pilot", "pilot_cohort_assess", "strong_mfa", "pilot_cohort", "pilot_cohort", "pilot_cohort", "company.manage", true)],
  ["GET /v1/pilot/cohorts/:pilotCohortId/evidence", { ...override("pilot", "pilot_cohort_evidence_read", "strong_mfa", "pilot_cohort", "pilot_cohort", "evidence_bundle", "company.read", false), mutation: false }],
  ["POST /v1/release/parity-scorecards", override("release", "parity_scorecard_record", "strong_mfa", "company", "parity_scorecard", "parity_scorecard", "company.manage", false)],
  ["GET /v1/release/parity-scorecards", { ...override("release", "parity_scorecard_read", "strong_mfa", "company", "parity_scorecard", "parity_scorecard", "company.read", false), mutation: false }],
  ["GET /v1/release/parity-scorecards/:parityScorecardId", { ...override("release", "parity_scorecard_read", "strong_mfa", "parity_scorecard", "parity_scorecard", "parity_scorecard", "company.read", false), mutation: false }],
  ["GET /v1/release/parity-scorecards/:parityScorecardId/evidence", { ...override("release", "parity_scorecard_evidence_read", "strong_mfa", "parity_scorecard", "parity_scorecard", "evidence_bundle", "company.read", false), mutation: false }],
  ["POST /v1/release/advantage-bundles", override("release", "advantage_release_bundle_record", "strong_mfa", "company", "advantage_release_bundle", "advantage_release_bundle", "company.manage", false)],
  ["GET /v1/release/advantage-bundles", { ...override("release", "advantage_release_bundle_read", "strong_mfa", "company", "advantage_release_bundle", "advantage_release_bundle", "company.read", false), mutation: false }],
  ["GET /v1/release/advantage-bundles/:advantageReleaseBundleId", { ...override("release", "advantage_release_bundle_read", "strong_mfa", "advantage_release_bundle", "advantage_release_bundle", "advantage_release_bundle", "company.read", false), mutation: false }],
  ["GET /v1/release/advantage-bundles/:advantageReleaseBundleId/evidence", { ...override("release", "advantage_release_bundle_evidence_read", "strong_mfa", "advantage_release_bundle", "advantage_release_bundle", "evidence_bundle", "company.read", false), mutation: false }],
  ["POST /v1/release/ui-contract-freezes", override("release", "ui_contract_freeze_record", "strong_mfa", "company", "ui_contract_freeze_record", "ui_contract_freeze_record", "company.manage", false)],
  ["GET /v1/release/ui-contract-freezes", { ...override("release", "ui_contract_freeze_read", "strong_mfa", "company", "ui_contract_freeze_record", "ui_contract_freeze_record", "company.read", false), mutation: false }],
  ["GET /v1/release/ui-contract-freezes/:uiContractFreezeRecordId", { ...override("release", "ui_contract_freeze_read", "strong_mfa", "ui_contract_freeze_record", "ui_contract_freeze_record", "ui_contract_freeze_record", "company.read", false), mutation: false }],
  ["GET /v1/release/ui-contract-freezes/:uiContractFreezeRecordId/evidence", { ...override("release", "ui_contract_freeze_evidence_read", "strong_mfa", "ui_contract_freeze_record", "ui_contract_freeze_record", "evidence_bundle", "company.read", false), mutation: false }],
  ["POST /v1/release/go-live-gates", override("release", "go_live_gate_record", "strong_mfa", "company", "go_live_gate_record", "go_live_gate_record", "company.manage", false)],
  ["GET /v1/release/go-live-gates", { ...override("release", "go_live_gate_read", "strong_mfa", "company", "go_live_gate_record", "go_live_gate_record", "company.read", false), mutation: false }],
  ["GET /v1/release/go-live-gates/:goLiveGateRecordId", { ...override("release", "go_live_gate_read", "strong_mfa", "go_live_gate_record", "go_live_gate_record", "go_live_gate_record", "company.read", false), mutation: false }],
  ["GET /v1/release/go-live-gates/:goLiveGateRecordId/evidence", { ...override("release", "go_live_gate_evidence_read", "strong_mfa", "go_live_gate_record", "go_live_gate_record", "evidence_bundle", "company.read", false), mutation: false }],
  ["POST /v1/ap/suppliers/:supplierId/payment-block", override("ap", "ap_supplier_payment_block_manage", "strong_mfa", "supplier", "ap_supplier", "ap_supplier", "company.manage", true)],
  ["POST /v1/ap/suppliers/:supplierId/payment-block/release", override("ap", "ap_supplier_payment_block_release", "strong_mfa", "supplier", "ap_supplier", "ap_supplier", "company.manage", true)],
  ["POST /v1/integrations/connections", override("integrations", "integration_connection_create", "strong_mfa", "company", "integration_connection", "integration_connection", "company.manage", false)],
  ["POST /v1/integrations/connections/:connectionId/credentials", override("integrations", "integration_credentials_manage", "strong_mfa", "integration_connection", "integration_connection", "integration_credential_set", "company.manage", true)],
  ["POST /v1/integrations/connections/:connectionId/consents", override("integrations", "integration_consent_authorize", "strong_mfa", "integration_connection", "integration_connection", "integration_consent_grant", "company.manage", true)],
  ["POST /v1/integrations/connections/:connectionId/health-checks", override("integrations", "integration_health_check_run", "strong_mfa", "integration_connection", "integration_connection", "integration_health_check", "company.manage", true)],
  ["POST /v1/close/checklists/:checklistId/reopen", override("close", "close_reopen_request_create", "strong_mfa", "company", "close_reopen_request", "close_reopen_request", "company.manage", false)],
  ["POST /v1/close/reopen-requests/:reopenRequestId/adjustments", override("close", "close_adjustment_post", "strong_mfa", "close_reopen_request", "close_reopen_request", "close_adjustment", "company.manage", false)],
  ["POST /v1/close/reopen-requests/:reopenRequestId/relock", override("close", "close_reopen_request_relock", "strong_mfa", "close_reopen_request", "close_reopen_request", "close_reopen_request", "company.manage", false)],
  ["POST /v1/auth/challenges", override("auth", "identity_step_up_start", "authenticated", "self", "auth_challenge", "auth_challenge", null, false)],
  ["POST /v1/auth/challenges/:challengeId/complete", override("auth", "identity_factor_verify", "authenticated", "self", "auth_challenge", "auth_challenge", null, false)],
  ["POST /v1/auth/devices/:deviceTrustRecordId/trust", override("auth", "identity_device_trust_manage", "mfa", "self", "device_trust_record", "device_trust_record", null, false)],
  ["POST /v1/auth/devices/:deviceTrustRecordId/revoke", override("auth", "identity_device_trust_manage", "mfa", "self", "device_trust_record", "device_trust_record", null, false)],
  ["POST /v1/auth/mfa/totp/enroll", override("auth", "identity_factor_manage", "mfa", "self", "auth_factor", "auth_factor", "auth.factor.manage", false)],
  ["POST /v1/auth/mfa/totp/verify", override("auth", "identity_factor_verify", "authenticated", "self", "auth_factor", "auth_factor", null, false)],
  ["POST /v1/auth/mfa/passkeys/register-options", override("auth", "identity_factor_manage", "strong_mfa", "self", "auth_factor", "auth_factor", "auth.factor.manage", false)],
  ["POST /v1/auth/mfa/passkeys/register-verify", override("auth", "identity_factor_verify", "authenticated", "self", "auth_factor", "auth_factor", null, false)],
  ["POST /v1/auth/mfa/passkeys/assert", override("auth", "identity_factor_verify", "authenticated", "self", "auth_factor", "auth_factor", null, false)],
  ["POST /v1/auth/bankid/start", override("auth", "identity_factor_verify", "authenticated", "self", "auth_factor", "auth_factor", null, false)],
  ["POST /v1/auth/bankid/collect", override("auth", "identity_factor_verify", "authenticated", "self", "auth_factor", "auth_factor", null, false)],
  ["POST /v1/auth/federation/start", override("auth", "identity_federation_start", "public", "self", "auth_federation", "auth_challenge", null, false)],
  ["POST /v1/auth/federation/callback", override("auth", "identity_federation_complete", "authenticated", "self", "auth_federation", "auth_challenge", null, false)],
  ["POST /v1/auth/sessions/:sessionId/revoke", override("auth", "identity_session_manage", "strong_mfa", "company", "auth_session", "auth_session", "auth.session.revoke", true)],
  ["POST /v1/authz/check", { ...override("auth", "permission_resolution", "authenticated", "self", "authorization", "authorization_decision", null, false), mutation: false }],
  ["POST /v1/org/delegations", override("org", "org_identity_admin", "strong_mfa", "company", "delegation", "delegation", "delegation.manage", false)],
  ["POST /v1/org/companies/:companyId/users", override("org", "org_identity_admin", "strong_mfa", "company", "company_user", "company_user", "company_user.write", true)],
  ["POST /v1/backoffice/support-cases/:supportCaseId/close", override("backoffice", "support_case_operate", "strong_mfa", "support_case", "support_case", "support_case", "company.manage", true)],
  ["GET /v1/backoffice/checkpoints", { ...override("backoffice", "rollback_checkpoint_read", "strong_mfa", "company", "rollback_checkpoint", "rollback_checkpoint", "company.read", false), mutation: false }],
  ["POST /v1/backoffice/checkpoints", override("backoffice", "rollback_checkpoint_create", "strong_mfa", "company", "rollback_checkpoint", "rollback_checkpoint", "company.manage", false)],
  ["POST /v1/backoffice/checkpoints/:rollbackCheckpointId/seal", override("backoffice", "rollback_checkpoint_seal", "strong_mfa", "rollback_checkpoint", "rollback_checkpoint", "rollback_checkpoint", "company.manage", true)],
  ["POST /v1/backoffice/checkpoints/:rollbackCheckpointId/use", override("backoffice", "rollback_checkpoint_use", "strong_mfa", "rollback_checkpoint", "rollback_checkpoint", "rollback_checkpoint", "company.manage", true)],
  ["POST /v1/backoffice/checkpoints/:rollbackCheckpointId/expire", override("backoffice", "rollback_checkpoint_expire", "strong_mfa", "rollback_checkpoint", "rollback_checkpoint", "rollback_checkpoint", "company.manage", true)],
  ["GET /v1/backoffice/replay-drills", { ...override("backoffice", "replay_drill_read", "strong_mfa", "company", "replay_drill", "replay_drill", "company.read", false), mutation: false }],
  ["POST /v1/backoffice/replay-drills", override("backoffice", "replay_drill_record", "strong_mfa", "company", "replay_drill", "replay_drill", "company.manage", false)],
  ["POST /v1/backoffice/replay-drills/:replayDrillId/start", override("backoffice", "replay_drill_start", "strong_mfa", "replay_drill", "replay_drill", "replay_drill", "company.manage", true)],
  ["POST /v1/backoffice/replay-drills/:replayDrillId/complete", override("backoffice", "replay_drill_complete", "strong_mfa", "replay_drill", "replay_drill", "replay_drill", "company.manage", true)],
  ["POST /v1/backoffice/access-reviews/:reviewBatchId/sign-off", override("backoffice", "access_review_signoff", "strong_mfa", "access_review_batch", "access_review_batch", "access_review_batch", "company.manage", true)],
  ["POST /v1/backoffice/impersonations/:sessionId/start", override("backoffice", "support_impersonation_start", "strong_mfa", "impersonation_session", "impersonation_session", "impersonation_session", "company.manage", true)],
  ["POST /v1/backoffice/break-glass/:breakGlassId/start", override("backoffice", "break_glass_activate", "strong_mfa", "break_glass_session", "break_glass_session", "break_glass_session", "company.manage", true)],
  ["GET /v1/ops/security/alerts", { ...override("ops", "security_alert_read", "strong_mfa", "company", "backoffice", "security_alert", "company.read", false), mutation: false }],
  ["GET /v1/ops/security/budgets", { ...override("ops", "security_budget_read", "strong_mfa", "company", "backoffice", "security_budget", "company.read", false), mutation: false }],
  ["GET /v1/ops/security/failure-series", { ...override("ops", "security_failure_series_read", "strong_mfa", "company", "backoffice", "security_failure_series", "company.read", false), mutation: false }],
  ["GET /v1/ops/security/risk-summary", { ...override("ops", "security_risk_summary_read", "strong_mfa", "company", "backoffice", "security_risk_summary", "company.read", false), mutation: false }],
  ["GET /v1/ops/transaction-boundary", { ...override("ops", "transaction_boundary_read", "strong_mfa", "company", "transaction_boundary", "transaction_boundary", "company.read", false), mutation: false }],
  ["POST /v1/ledger/accounts", override("ledger", "ledger_chart_govern", "strong_mfa", "company", "ledger_chart", "ledger_account", "company.manage", true)],
  ["POST /v1/ledger/dimensions/:dimensionType", override("ledger", "ledger_dimension_govern", "strong_mfa", "company", "ledger_dimension_catalog", "ledger_dimension_value", "company.manage", true)],
  ["POST /v1/ledger/voucher-series", override("ledger", "ledger_voucher_series_govern", "strong_mfa", "company", "voucher_series", "voucher_series", "company.manage", true)],
  ["POST /v1/ledger/opening-balances", override("ledger", "ledger_opening_balance_post", "strong_mfa", "company", "ledger_opening_balance", "opening_balance_batch", "company.manage", true)],
  ["POST /v1/ledger/opening-balances/:openingBalanceBatchId/reverse", override("ledger", "ledger_opening_balance_reverse", "strong_mfa", "opening_balance_batch", "ledger_opening_balance", "opening_balance_batch", "company.manage", true)],
  ["POST /v1/ledger/year-end-transfers", override("ledger", "ledger_year_end_transfer_post", "strong_mfa", "company", "ledger_year_end_transfer", "year_end_transfer_batch", "company.manage", true)],
  ["POST /v1/ledger/year-end-transfers/:yearEndTransferBatchId/reverse", override("ledger", "ledger_year_end_transfer_reverse", "strong_mfa", "year_end_transfer_batch", "ledger_year_end_transfer", "year_end_transfer_batch", "company.manage", true)],
  ["POST /v1/ledger/vat-clearing-runs", override("ledger", "ledger_vat_clearing_post", "strong_mfa", "company", "ledger_vat_clearing", "vat_clearing_run", "company.manage", true)],
  ["POST /v1/ledger/vat-clearing-runs/:vatClearingRunId/reverse", override("ledger", "ledger_vat_clearing_reverse", "strong_mfa", "vat_clearing_run", "ledger_vat_clearing", "vat_clearing_run", "company.manage", true)],
  ["POST /v1/ledger/asset-cards", override("ledger", "ledger_asset_card_register", "strong_mfa", "company", "ledger_asset_depreciation", "asset_card", "company.manage", true)],
  ["POST /v1/ledger/depreciation-batches", override("ledger", "ledger_depreciation_post", "strong_mfa", "company", "ledger_asset_depreciation", "depreciation_batch", "company.manage", true)],
  ["POST /v1/ledger/depreciation-batches/:depreciationBatchId/reverse", override("ledger", "ledger_depreciation_reverse", "strong_mfa", "depreciation_batch", "ledger_asset_depreciation", "depreciation_batch", "company.manage", true)],
  ["POST /v1/ledger/accrual-schedules", override("ledger", "ledger_accrual_schedule_register", "strong_mfa", "company", "ledger_period_accrual", "accrual_schedule", "company.manage", true)],
  ["POST /v1/ledger/accrual-batches", override("ledger", "ledger_accrual_post", "strong_mfa", "company", "ledger_period_accrual", "accrual_batch", "company.manage", true)],
  ["POST /v1/ledger/accrual-batches/:accrualBatchId/reverse", override("ledger", "ledger_accrual_reverse", "strong_mfa", "accrual_batch", "ledger_period_accrual", "accrual_batch", "company.manage", true)],
  ["POST /v1/sie/exports", override("ledger", "sie4_export_create", "strong_mfa", "company", "ledger", "sie_export_job", "company.manage", true)],
  ["GET /v1/sie/exports", { ...override("ledger", "sie4_export_read", "strong_mfa", "company", "ledger", "sie_export_job", "company.read", false), mutation: false }],
  ["GET /v1/sie/exports/:sieExportJobId", { ...override("ledger", "sie4_export_read", "strong_mfa", "company", "ledger", "sie_export_job", "company.read", false), mutation: false }],
  ["POST /v1/sie/imports", override("ledger", "sie4_import_apply", "strong_mfa", "company", "ledger", "sie_import_job", "company.manage", true)],
  ["GET /v1/sie/imports", { ...override("ledger", "sie4_import_read", "strong_mfa", "company", "ledger", "sie_import_job", "company.read", false), mutation: false }],
  ["GET /v1/sie/imports/:sieImportJobId", { ...override("ledger", "sie4_import_read", "strong_mfa", "company", "ledger", "sie_import_job", "company.read", false), mutation: false }],
  ["POST /v1/vat/review-queue/:vatReviewQueueItemId/resolve", override("vat", "vat_review_resolve", "strong_mfa", "vat_review_queue_item", "vat", "vat_review_queue_item", "company.manage", true)],
  ["POST /v1/vat/period-locks", override("vat", "vat_period_lock", "strong_mfa", "company", "vat", "vat_period_lock", "company.manage", false)],
  ["POST /v1/vat/period-locks/:vatPeriodLockId/unlock", override("vat", "vat_period_unlock", "strong_mfa", "vat_period_lock", "vat", "vat_period_lock", "company.manage", true)],
  ["POST /v1/tax-account/events/:taxAccountEventId/classify", override("tax_account", "tax_account_event_classify", "strong_mfa", "company", "tax_account", "tax_account_event", "company.manage", true)],
  ["POST /v1/tax-account/discrepancy-cases/:discrepancyCaseId/review", override("tax_account", "tax_account_discrepancy_review", "strong_mfa", "company", "tax_account", "tax_account_difference_case", "company.manage", true)],
  ["POST /v1/tax-account/discrepancy-cases/:discrepancyCaseId/resolve", override("tax_account", "tax_account_discrepancy_resolve", "strong_mfa", "company", "tax_account", "tax_account_difference_case", "company.manage", true)],
  ["POST /v1/tax-account/discrepancy-cases/:discrepancyCaseId/waive", override("tax_account", "tax_account_discrepancy_waive", "strong_mfa", "company", "tax_account", "tax_account_difference_case", "company.manage", true)],
  ["POST /v1/documents/:documentId/ocr/runs/:ocrRunId/provider-callback", override("documents", "document_ocr_provider_callback", "strong_mfa", "document", "document", "ocr_run", "company.manage", true)],
  ["POST /v1/review-tasks/:reviewTaskId/approve", override("documents", "review_task_decide", "mfa", "review_task", "review_task", "review_task", "approval.approve", true)],
  ["POST /v1/review-center/items/:reviewItemId/approve", override("review", "review_center_decide", "mfa", "review_item", "review_item", "review_item", "approval.approve", true)],
  ["POST /v1/review-center/items/:reviewItemId/reject", override("review", "review_center_decide", "mfa", "review_item", "review_item", "review_item", "approval.approve", true)],
  ["POST /v1/review-center/items/:reviewItemId/escalate", override("review", "review_center_escalate", "mfa", "review_item", "review_item", "review_item", "approval.approve", true)],
  ["POST /v1/review-center/items/:reviewItemId/start", override("review", "review_center_start", "mfa", "review_item", "review_item", "review_item", "approval.approve", true)],
  ["POST /v1/review-center/items/:reviewItemId/request-more-input", override("review", "review_center_request_more_input", "mfa", "review_item", "review_item", "review_item", "approval.approve", true)],
  ["POST /v1/review-center/items/:reviewItemId/reassign", override("review", "review_center_reassign", "mfa", "review_item", "review_item", "review_item", "approval.approve", true)],
  ["POST /v1/review-center/items/:reviewItemId/close", override("review", "review_center_close", "mfa", "review_item", "review_item", "review_item", "approval.approve", true)],
  ["POST /v1/work-items/:workItemId/assign", override("ops", "operational_work_item_assign", "strong_mfa", "operational_work_item", "backoffice", "operational_work_item", "company.manage", true)],
  ["POST /v1/work-items/:workItemId/escalate", override("ops", "operational_work_item_escalate", "strong_mfa", "operational_work_item", "backoffice", "operational_work_item", "company.manage", true)],
  ["POST /v1/work-items/:workItemId/dual-approve", override("ops", "operational_work_item_dual_approve", "strong_mfa", "operational_work_item", "backoffice", "operational_work_item", "company.manage", true)],
  ["POST /v1/projects/quote-handoffs", override("projects", "project_quote_handoff_create", "strong_mfa", "company", "project", "project", "company.manage", false)],
  ["POST /v1/projects/trial-scenarios/:scenarioCode/materialize", override("projects", "project_trial_scenario_materialize", "strong_mfa", "company", "project_trial_scenario_run", "project_trial_scenario_run", "company.manage", false)],
  ["POST /v1/projects/import-batches", override("projects", "project_import_batch_create", "strong_mfa", "company", "project_import_batch", "project_import_batch", "company.manage", false)],
  ["POST /v1/projects/import-batches/:projectImportBatchId/commit", override("projects", "project_import_batch_commit", "strong_mfa", "company", "project_import_batch", "project_import_batch", "company.manage", true)],
  ["POST /v1/projects/:projectId/opportunity-links", override("projects", "project_opportunity_link_create", "strong_mfa", "project", "project", "project_opportunity_link", "company.manage", true)],
  ["POST /v1/projects/:projectId/quote-links", override("projects", "project_quote_link_create", "strong_mfa", "project", "project", "project_quote_link", "company.manage", true)],
  ["POST /v1/projects/:projectId/engagements", override("projects", "project_engagement_create", "strong_mfa", "project", "project", "project_engagement", "company.manage", true)],
  ["POST /v1/projects/:projectId/work-models", override("projects", "project_work_model_create", "strong_mfa", "project", "project", "project_work_model", "company.manage", true)],
  ["POST /v1/projects/:projectId/work-packages", override("projects", "project_work_package_create", "strong_mfa", "project", "project", "project_work_package", "company.manage", true)],
  ["POST /v1/projects/:projectId/delivery-milestones", override("projects", "project_delivery_milestone_create", "strong_mfa", "project", "project", "project_delivery_milestone", "company.manage", true)],
  ["POST /v1/projects/:projectId/work-logs", override("projects", "project_work_log_record", "strong_mfa", "project", "project", "project_work_log", "company.manage", true)],
  ["POST /v1/projects/:projectId/revenue-plans", override("projects", "project_revenue_plan_create", "strong_mfa", "project", "project", "project_revenue_plan", "company.manage", true)],
  ["POST /v1/projects/:projectId/revenue-plans/:projectRevenuePlanId/approve", override("projects", "project_revenue_plan_approve", "strong_mfa", "project", "project", "project_revenue_plan", "company.manage", true)],
  ["POST /v1/projects/:projectId/billing-plans", override("projects", "project_billing_plan_create", "strong_mfa", "project", "project", "project_billing_plan", "company.manage", true)],
  ["POST /v1/projects/:projectId/status-updates", override("projects", "project_status_update_create", "strong_mfa", "project", "project", "project_status_update", "company.manage", true)],
  ["POST /v1/projects/:projectId/capacity-reservations", override("projects", "project_capacity_reservation_create", "strong_mfa", "project", "project", "project_capacity_reservation", "company.manage", true)],
  ["POST /v1/projects/:projectId/capacity-reservations/:projectCapacityReservationId/status", override("projects", "project_capacity_reservation_status", "strong_mfa", "project", "project", "project_capacity_reservation", "company.manage", true)],
  ["POST /v1/projects/:projectId/assignment-plans", override("projects", "project_assignment_plan_create", "strong_mfa", "project", "project", "project_assignment_plan", "company.manage", true)],
  ["POST /v1/projects/:projectId/assignment-plans/:projectAssignmentPlanId/status", override("projects", "project_assignment_plan_status", "strong_mfa", "project", "project", "project_assignment_plan", "company.manage", true)],
  ["POST /v1/projects/:projectId/risks", override("projects", "project_risk_create", "strong_mfa", "project", "project", "project_risk", "company.manage", true)],
  ["POST /v1/projects/:projectId/risks/:projectRiskId/status", override("projects", "project_risk_status", "strong_mfa", "project", "project", "project_risk", "company.manage", true)],
  ["POST /v1/projects/:projectId/profitability-adjustments", override("projects", "project_profitability_adjustment_create", "strong_mfa", "project", "project", "project_profitability_adjustment", "company.manage", true)],
  ["POST /v1/projects/:projectId/profitability-adjustments/:projectProfitabilityAdjustmentId/decide", override("projects", "project_profitability_adjustment_decide", "strong_mfa", "project", "project", "project_profitability_adjustment", "company.manage", true)],
  ["POST /v1/projects/:projectId/invoice-readiness-assessments", override("projects", "project_invoice_readiness_assess", "strong_mfa", "project", "project", "project_invoice_readiness_assessment", "company.manage", true)],
  ["POST /v1/projects/:projectId/invoice-simulations", override("projects", "project_invoice_simulation_create", "strong_mfa", "project", "project", "project_invoice_simulation", "company.manage", true)],
  ["POST /v1/projects/:projectId/profitability-snapshots", override("projects", "project_profitability_snapshot_materialize", "strong_mfa", "project", "project", "project_profitability_snapshot", "company.manage", true)],
  ["POST /v1/projects/:projectId/live-conversion-plans", override("projects", "project_live_conversion_plan_create", "strong_mfa", "project", "project", "project_live_conversion_plan", "company.manage", true)],
  ["POST /v1/personalliggare/sites", override("personalliggare", "personalliggare_site_create", "strong_mfa", "company", "personalliggare_site", "personalliggare_site", "company.manage", false)],
  ["POST /v1/personalliggare/sites/:constructionSiteId/registrations", override("personalliggare", "personalliggare_registration_create", "strong_mfa", "construction_site", "personalliggare_site", "personalliggare_registration", "company.manage", true)],
  ["POST /v1/personalliggare/sites/:constructionSiteId/attendance-events", override("personalliggare", "personalliggare_attendance_event_record", "mfa", "construction_site", "personalliggare_site", "personalliggare_attendance_event", "company.manage", true)],
  ["POST /v1/personalliggare/attendance-events/:attendanceEventId/corrections", override("personalliggare", "personalliggare_attendance_event_correct", "strong_mfa", "attendance_event", "personalliggare_attendance_event", "personalliggare_attendance_correction", "company.manage", true)],
  ["POST /v1/personalliggare/sites/:constructionSiteId/kiosk-devices", override("personalliggare", "personalliggare_kiosk_device_create", "strong_mfa", "construction_site", "personalliggare_site", "personalliggare_kiosk_device", "company.manage", true)],
  ["POST /v1/personalliggare/sites/:constructionSiteId/kiosk-devices/:kioskDeviceId/trust", override("personalliggare", "personalliggare_kiosk_device_trust", "strong_mfa", "construction_site", "personalliggare_site", "personalliggare_kiosk_device", "company.manage", true)],
  ["POST /v1/personalliggare/sites/:constructionSiteId/kiosk-devices/:kioskDeviceId/revoke", override("personalliggare", "personalliggare_kiosk_device_revoke", "strong_mfa", "construction_site", "personalliggare_site", "personalliggare_kiosk_device", "company.manage", true)],
  ["POST /v1/personalliggare/sites/:constructionSiteId/exports", override("personalliggare", "personalliggare_attendance_export_create", "strong_mfa", "construction_site", "personalliggare_site", "personalliggare_attendance_export", "company.manage", true)],
  ["POST /v1/id06/companies/verify", override("id06", "id06_company_verify", "strong_mfa", "company", "id06_company_verification", "id06_company_verification", "company.manage", false)],
  ["POST /v1/id06/persons/verify", override("id06", "id06_person_verify", "strong_mfa", "company", "id06_person_verification", "id06_person_verification", "company.manage", false)],
  ["POST /v1/id06/cards/validate", override("id06", "id06_card_validate", "strong_mfa", "company", "id06_card_status", "id06_card_status", "company.manage", false)],
  ["POST /v1/id06/workplaces/:workplaceId/bindings", override("id06", "id06_workplace_binding_create", "strong_mfa", "workplace", "id06_workplace_binding", "id06_workplace_binding", "company.manage", true)],
  ["POST /v1/id06/workplaces/:workplaceId/exports", override("id06", "id06_evidence_export_create", "strong_mfa", "workplace", "id06_workplace_binding", "id06_evidence_bundle", "company.manage", true)],
  ["POST /v1/egenkontroll/templates", override("egenkontroll", "egenkontroll_template_create", "strong_mfa", "company", "egenkontroll_template", "egenkontroll_template", "company.manage", false)],
  ["POST /v1/egenkontroll/templates/:checklistTemplateId/activate", override("egenkontroll", "egenkontroll_template_activate", "strong_mfa", "checklist_template", "egenkontroll_template", "egenkontroll_template", "company.manage", true)],
  ["POST /v1/egenkontroll/instances", override("egenkontroll", "egenkontroll_instance_create", "strong_mfa", "company", "egenkontroll_instance", "egenkontroll_instance", "company.manage", false)],
  ["POST /v1/egenkontroll/instances/:checklistInstanceId/start", override("egenkontroll", "egenkontroll_instance_start", "mfa", "checklist_instance", "egenkontroll_instance", "egenkontroll_instance", "company.manage", true)],
  ["POST /v1/egenkontroll/instances/:checklistInstanceId/outcomes", override("egenkontroll", "egenkontroll_point_outcome_record", "mfa", "checklist_instance", "egenkontroll_instance", "egenkontroll_point_outcome", "company.manage", true)],
  ["POST /v1/egenkontroll/instances/:checklistInstanceId/deviations", override("egenkontroll", "egenkontroll_deviation_create", "mfa", "checklist_instance", "egenkontroll_instance", "egenkontroll_deviation", "company.manage", true)],
  ["POST /v1/egenkontroll/deviations/:checklistDeviationId/acknowledge", override("egenkontroll", "egenkontroll_deviation_acknowledge", "strong_mfa", "checklist_deviation", "egenkontroll_deviation", "egenkontroll_deviation", "company.manage", true)],
  ["POST /v1/egenkontroll/deviations/:checklistDeviationId/resolve", override("egenkontroll", "egenkontroll_deviation_resolve", "strong_mfa", "checklist_deviation", "egenkontroll_deviation", "egenkontroll_deviation", "company.manage", true)],
  ["POST /v1/egenkontroll/instances/:checklistInstanceId/signoffs", override("egenkontroll", "egenkontroll_signoff_record", "strong_mfa", "checklist_instance", "egenkontroll_instance", "egenkontroll_signoff", "approval.approve", true)],
  ["POST /v1/field/operational-cases", override("field", "field_operational_case_create", "strong_mfa", "project", "field_operational_case", "field_operational_case", "company.manage", false)],
  ["GET /v1/field/operational-cases", { ...override("field", "field_operational_case_read", "authenticated", "company", "field_operational_case", "field_operational_case", "company.read", false), mutation: false }],
  ["GET /v1/field/operational-cases/:operationalCaseId", { ...override("field", "field_operational_case_read", "authenticated", "project", "field_operational_case", "field_operational_case", "company.read", false), mutation: false }],
  ["POST /v1/field/operational-cases/:operationalCaseId/material-reservations", override("field", "field_material_reservation_create", "strong_mfa", "project", "field_operational_case", "field_material_reservation", "company.manage", false)],
  ["POST /v1/field/operational-cases/:operationalCaseId/conflicts/:conflictRecordId/resolve", override("field", "field_conflict_record_resolve", "strong_mfa", "project", "field_operational_case", "field_conflict_record", "company.manage", true)],
  ["POST /v1/import-cases", override("import_cases", "import_case_create", "strong_mfa", "company", "import_case", "import_case", "company.manage", false)],
  ["GET /v1/import-cases", override("import_cases", "import_case_list", "mfa", "company", "import_case", "import_case", "company.read", false)],
  ["GET /v1/import-cases/:importCaseId", override("import_cases", "import_case_read", "mfa", "import_case", "import_case", "import_case", "company.read", false)],
  ["POST /v1/import-cases/:importCaseId/attach-document", override("import_cases", "import_case_attach_document", "strong_mfa", "import_case", "import_case", "import_case", "company.manage", false)],
  ["POST /v1/import-cases/:importCaseId/components", override("import_cases", "import_case_component_add", "strong_mfa", "import_case", "import_case", "import_case_component", "company.manage", false)],
  ["POST /v1/import-cases/:importCaseId/recalculate", override("import_cases", "import_case_recalculate", "strong_mfa", "import_case", "import_case", "import_case", "company.manage", false)],
  ["POST /v1/import-cases/:importCaseId/approve", override("import_cases", "import_case_approve", "strong_mfa", "import_case", "import_case", "import_case", "company.manage", true)],
  ["POST /v1/import-cases/:importCaseId/correction-requests", override("import_cases", "import_case_correction_request_create", "strong_mfa", "import_case", "import_case", "import_case_correction_request", "company.manage", false)],
  ["POST /v1/import-cases/:importCaseId/correction-requests/:importCaseCorrectionRequestId/decide", override("import_cases", "import_case_correction_request_decide", "strong_mfa", "import_case", "import_case", "import_case_correction_request", "company.manage", true)],
  ["POST /v1/import-cases/:importCaseId/apply", override("import_cases", "import_case_apply", "strong_mfa", "import_case", "import_case", "import_case", "company.manage", true)],
  ["POST /v1/migration/parallel-run-results", override("migration", "parallel_run_result_record", "strong_mfa", "company", "migration_parallel_run_result", "migration_parallel_run_result", "company.manage", false)],
  ["POST /v1/migration/parallel-run-results/:parallelRunResultId/accept", override("migration", "parallel_run_result_accept", "strong_mfa", "parallel_run_result", "migration_parallel_run_result", "migration_parallel_run_result", "company.manage", true)],
  ["POST /v1/migration/cutover-plans/:cutoverPlanId/checklist/:itemCode", override("migration", "cutover_checklist_update", "strong_mfa", "checklist_item", "cutover_plan", "cutover_checklist_item", "company.manage", true)],
  ["POST /v1/migration/cutover-plans/:cutoverPlanId/source-extract-checklist/:itemCode", override("migration", "cutover_source_extract_checklist_update", "strong_mfa", "checklist_item", "cutover_plan", "cutover_source_extract_checklist_item", "company.manage", true)],
  ["POST /v1/migration/cutover-plans/:cutoverPlanId/rehearsals", override("migration", "cutover_rehearsal_record", "strong_mfa", "cutover_plan", "migration_cutover_plan", "cutover_rehearsal", "company.manage", true)],
  ["POST /v1/migration/cutover-plans/:cutoverPlanId/variance-report", override("migration", "cutover_variance_report_generate", "strong_mfa", "cutover_plan", "migration_cutover_plan", "cutover_automated_variance_report", "company.manage", true)],
  ["POST /v1/migration/cutover-plans/:cutoverPlanId/rollback-drill", override("migration", "cutover_rollback_drill_record", "strong_mfa", "cutover_plan", "migration_cutover_plan", "cutover_rollback_drill", "company.manage", true)],
  ["POST /v1/notifications/:notificationId/acknowledge", override("ops", "notification_acknowledge", "authenticated", "notification", "notification", "notification", "company.read", true)],
  ["POST /v1/ops/rule-governance/changes", override("ops", "regulatory_change_create", "strong_mfa", "company", "regulatory_change_entry", "regulatory_change_entry", "company.manage", false)],
  ["POST /v1/ops/rule-governance/changes/:regulatoryChangeEntryId/source-snapshots", override("ops", "regulatory_change_source_capture", "strong_mfa", "regulatory_change_entry", "regulatory_change_entry", "regulatory_change_entry", "company.manage", true)],
  ["POST /v1/ops/rule-governance/changes/:regulatoryChangeEntryId/diff-review", override("ops", "regulatory_change_diff_review", "strong_mfa", "regulatory_change_entry", "regulatory_change_entry", "regulatory_change_entry", "company.manage", true)],
  ["POST /v1/ops/rule-governance/changes/:regulatoryChangeEntryId/sandbox-verification", override("ops", "regulatory_change_sandbox_verify", "strong_mfa", "regulatory_change_entry", "regulatory_change_entry", "regulatory_change_entry", "company.manage", true)],
  ["POST /v1/ops/rule-governance/changes/:regulatoryChangeEntryId/approve", override("ops", "regulatory_change_approve", "strong_mfa", "regulatory_change_entry", "regulatory_change_entry", "regulatory_change_entry", "company.manage", true)],
  ["POST /v1/ops/rule-governance/changes/:regulatoryChangeEntryId/publish", override("ops", "regulatory_change_publish", "strong_mfa", "regulatory_change_entry", "regulatory_change_entry", "regulatory_change_entry", "company.manage", true)],
  ["POST /v1/ops/rule-governance/changes/:regulatoryChangeEntryId/rollback", override("ops", "regulatory_change_rollback", "strong_mfa", "regulatory_change_entry", "regulatory_change_entry", "regulatory_change_entry", "company.manage", true)]
]);

const SOURCE_ROUTE_FILES = Object.freeze([
  new URL("./server.mjs", import.meta.url),
  ...fs
    .readdirSync(fileURLToPath(new URL(".", import.meta.url)), { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^phase\d+(?:-[a-z0-9]+)*-routes\.mjs$/i.test(entry.name))
    .map((entry) => new URL(`./${entry.name}`, import.meta.url))
    .sort((left, right) => left.href.localeCompare(right.href))
]);

const READ_ROUTE_TEMPLATES = Object.freeze(
  dedupeRoutes(SOURCE_ROUTE_FILES.flatMap((fileUrl) => parseRoutesFromSource(fileUrl, READONLY_HTTP_METHODS))).map((route) =>
    Object.freeze({
      method: route.method,
      path: route.path
    })
  )
);
const MUTATING_ROUTE_CONTRACTS = Object.freeze(buildRouteContracts());
const UI_PERMISSION_REASON_CATALOG = Object.freeze([
  Object.freeze({
    reasonCode: "session_token_required",
    category: "trust",
    label: "Session required",
    explanation: "The actor must have an authenticated session before the route or contract can be used.",
    surfaceFamilyCodes: ["desktop", "backoffice", "field"]
  }),
  Object.freeze({
    reasonCode: "trust_level_insufficient",
    category: "trust",
    label: "Higher trust level required",
    explanation: "The actor is authenticated but lacks the required MFA or strong MFA trust level.",
    surfaceFamilyCodes: ["desktop", "backoffice", "field"]
  }),
  Object.freeze({
    reasonCode: "missing_permission",
    category: "permission",
    label: "Permission missing",
    explanation: "The actor does not hold the required company permission or delegated grant for the operation.",
    surfaceFamilyCodes: ["desktop", "backoffice", "field"]
  }),
  Object.freeze({
    reasonCode: "cross_company_forbidden",
    category: "scope",
    label: "Cross-company access denied",
    explanation: "The requested object or route falls outside the signed-in principal's company scope.",
    surfaceFamilyCodes: ["desktop", "backoffice", "field"]
  }),
  Object.freeze({
    reasonCode: "permission_scope_denied",
    category: "visibility",
    label: "Permission scope denied",
    explanation: "The actor cannot see the object because read-model visibility or queue scope denies access.",
    surfaceFamilyCodes: ["desktop", "backoffice", "field"]
  }),
  Object.freeze({
    reasonCode: "search_document_forbidden",
    category: "visibility",
    label: "Search document denied",
    explanation: "The search hit exists but is not visible to the current actor due to visibility trimming.",
    surfaceFamilyCodes: ["desktop", "backoffice", "field"]
  }),
  Object.freeze({
    reasonCode: "object_profile_forbidden",
    category: "visibility",
    label: "Object profile denied",
    explanation: "The object profile exists but is not visible to the current actor.",
    surfaceFamilyCodes: ["desktop", "backoffice", "field"]
  }),
  Object.freeze({
    reasonCode: "saved_view_forbidden",
    category: "visibility",
    label: "Saved view denied",
    explanation: "The saved view is not owned by or shared with the current actor.",
    surfaceFamilyCodes: ["desktop", "backoffice", "field"]
  }),
  Object.freeze({
    reasonCode: "desktop_surface_role_forbidden",
    category: "surface",
    label: "Desktop surface denied",
    explanation: "The current actor is not allowed to access desktop-only read models under the active server-side surface policy.",
    surfaceFamilyCodes: ["desktop"]
  }),
  Object.freeze({
    reasonCode: "search_workspace_role_forbidden",
    category: "surface",
    label: "Search workspace denied",
    explanation: "The current actor is not allowed to access search, object-profile or workbench read models under the active server-side surface policy.",
    surfaceFamilyCodes: ["desktop", "backoffice"]
  }),
  Object.freeze({
    reasonCode: "finance_operations_role_forbidden",
    category: "surface",
    label: "Finance operations denied",
    explanation: "The current actor is not allowed to access finance operations worklists under the active server-side surface policy.",
    surfaceFamilyCodes: ["desktop"]
  }),
  Object.freeze({
    reasonCode: "annual_operations_role_forbidden",
    category: "surface",
    label: "Annual operations denied",
    explanation: "The current actor is not allowed to access annual reporting and filing operations under the active server-side surface policy.",
    surfaceFamilyCodes: ["desktop"]
  }),
  Object.freeze({
    reasonCode: "payroll_operations_role_forbidden",
    category: "surface",
    label: "Payroll operations denied",
    explanation: "The current actor is not allowed to access payroll operations worklists under the active server-side surface policy.",
    surfaceFamilyCodes: ["desktop"]
  }),
  Object.freeze({
    reasonCode: "hr_operations_role_forbidden",
    category: "surface",
    label: "HR operations denied",
    explanation: "The current actor is not allowed to access HR read models under the active server-side surface policy.",
    surfaceFamilyCodes: ["desktop"]
  }),
  Object.freeze({
    reasonCode: "time_operations_role_forbidden",
    category: "surface",
    label: "Time operations denied",
    explanation: "The current actor is not allowed to access time operations read models under the active server-side surface policy.",
    surfaceFamilyCodes: ["desktop"]
  }),
  Object.freeze({
    reasonCode: "project_workspace_role_forbidden",
    category: "surface",
    label: "Project workspace denied",
    explanation: "The current actor is not allowed to access the project workspace surfaces under the active server-side surface policy.",
    surfaceFamilyCodes: ["desktop"]
  }),
  Object.freeze({
    reasonCode: "field_control_role_forbidden",
    category: "surface",
    label: "Field control denied",
    explanation: "The current actor is not allowed to access field operations controls under the active server-side surface policy.",
    surfaceFamilyCodes: ["field"]
  }),
  Object.freeze({
    reasonCode: "personalliggare_control_role_forbidden",
    category: "surface",
    label: "Personalliggare control denied",
    explanation: "The current actor is not allowed to access personalliggare controls under the active server-side surface policy.",
    surfaceFamilyCodes: ["field"]
  }),
  Object.freeze({
    reasonCode: "id06_control_role_forbidden",
    category: "surface",
    label: "ID06 control denied",
    explanation: "The current actor is not allowed to access ID06 controls under the active server-side surface policy.",
    surfaceFamilyCodes: ["field"]
  }),
  Object.freeze({
    reasonCode: "egenkontroll_control_role_forbidden",
    category: "surface",
    label: "Egenkontroll denied",
    explanation: "The current actor is not allowed to access egenkontroll controls under the active server-side surface policy.",
    surfaceFamilyCodes: ["field"]
  })
]);
export const ROUTE_SCOPE_TYPES = Object.freeze(
  [...new Set(MUTATING_ROUTE_CONTRACTS.map((routeContract) => routeContract.requiredScopeType))].sort()
);

export function listPublishedRouteContracts() {
  return MUTATING_ROUTE_CONTRACTS.map(cloneContract);
}

export function listPublishedReadRouteTemplates() {
  return READ_ROUTE_TEMPLATES.map(cloneContract);
}

export function listUiPermissionReasonCatalog() {
  return UI_PERMISSION_REASON_CATALOG.map(clonePermissionReason);
}

export function resolvePublishedRouteContract({ method, path } = {}) {
  const resolvedMethod = normalizeMethod(method);
  const resolvedPath = normalizePath(path);
  if (!resolvedMethod || !resolvedPath) {
    return null;
  }
  for (const routeContract of MUTATING_ROUTE_CONTRACTS) {
    if (routeContract.method !== resolvedMethod) {
      continue;
    }
    const params = matchPath(resolvedPath, routeContract.path);
    if (!params) {
      continue;
    }
    return {
      ...cloneContract(routeContract),
      params
    };
  }
  return null;
}

function buildRouteContracts() {
  return dedupeRoutes(SOURCE_ROUTE_FILES.flatMap((fileUrl) => parseMutatingRoutesFromSource(fileUrl))).map((route) =>
    Object.freeze(buildRouteContract(route))
  );
}

function parseMutatingRoutesFromSource(fileUrl) {
  return parseRoutesFromSource(fileUrl, MUTATING_HTTP_METHODS);
}

function parseRoutesFromSource(fileUrl, allowedMethods) {
  const sourceText = fs.readFileSync(fileURLToPath(fileUrl), "utf8");
  const bindings = new Map(
    [...sourceText.matchAll(/const\s+(\w+)\s*=\s*matchPath\(path,\s*"([^"]+)"\)/g)].map((match) => [match[1], match[2]])
  );
  const routes = [];
  for (const match of sourceText.matchAll(/if\s*\(([^\{]+)\)\s*\{/g)) {
    const condition = match[1];
    const methods = [...condition.matchAll(/req\.method\s*===\s*"([A-Z]+)"/g)].map((methodMatch) => methodMatch[1]);
    if (methods.length === 0) {
      continue;
    }
    const directPaths = [...condition.matchAll(/path\s*===\s*"([^"]+)"/g)].map((pathMatch) => pathMatch[1]);
    const boundPaths = [...bindings.entries()].filter(([binding]) => condition.includes(binding)).map(([, route]) => route);
    for (const method of methods) {
      if (!allowedMethods.has(method)) {
        continue;
      }
      for (const routePath of new Set([...directPaths, ...boundPaths])) {
        if (routePath === "/" || routePath === "/healthz" || routePath === "/readyz") {
          continue;
        }
        routes.push({ method, path: routePath });
      }
    }
  }
  return routes;
}

function dedupeRoutes(routes) {
  const seen = new Set();
  return routes
    .filter(({ method, path }) => method && path)
    .filter(({ method, path }) => {
      const key = `${method} ${path}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((left, right) => (left.path === right.path ? left.method.localeCompare(right.method) : left.path.localeCompare(right.path)));
}

function buildRouteContract({ method, path }) {
  const key = `${method} ${path}`;
  const overrideEntry = EXPLICIT_ROUTE_OVERRIDES.get(key);
  const routeFamily = overrideEntry?.routeFamily || deriveRouteFamily(path);
  const objectType = overrideEntry?.objectType || deriveObjectType(path, routeFamily);
  const requiredScopeType = overrideEntry?.requiredScopeType || deriveScopeType(path, objectType);
  const scopeCode = overrideEntry?.scopeCode || deriveScopeCode(requiredScopeType, objectType, routeFamily);
  const requiredTrustLevel = overrideEntry?.requiredTrustLevel || deriveTrustLevel(path, routeFamily);
  const permissionCode =
    overrideEntry && Object.prototype.hasOwnProperty.call(overrideEntry, "permissionCode")
      ? overrideEntry.permissionCode
      : derivePermissionCode({ method, path, routeFamily, requiredScopeType });
  const requiredActionClass = overrideEntry?.requiredActionClass || deriveActionClass({ path, routeFamily, objectType });
  const expectedObjectVersion =
    overrideEntry && Object.prototype.hasOwnProperty.call(overrideEntry, "expectedObjectVersion")
      ? overrideEntry.expectedObjectVersion
      : getRouteParams(path).length > 0;
  const mutation =
    overrideEntry && Object.prototype.hasOwnProperty.call(overrideEntry, "mutation")
      ? overrideEntry.mutation
      : !EXACT_PUBLIC_ROUTE_KEYS.has(key) || key === "POST /v1/auth/login";
  return {
    method,
    path,
    routeFamily,
    mutation,
    requiredActionClass,
    requiredTrustLevel,
    requiredScopeType,
    scopeCode,
    objectType,
    permissionCode: permissionCode || null,
    expectedObjectVersion: expectedObjectVersion === true
  };
}

function override(routeFamily, requiredActionClass, requiredTrustLevel, requiredScopeType, scopeCode, objectType, permissionCode, expectedObjectVersion) {
  return {
    routeFamily,
    requiredActionClass,
    requiredTrustLevel,
    requiredScopeType,
    scopeCode,
    objectType,
    permissionCode,
    expectedObjectVersion
  };
}

function deriveRouteFamily(path) {
  return normalizeToken(getStaticSegments(path)[0] || "system");
}

function deriveObjectType(path, routeFamily) {
  if (isPublicRoute(path)) {
    if (path === "/v1/auth/login") {
      return "auth_session";
    }
    if (path === "/v1/onboarding/runs") {
      return "onboarding_run";
    }
    if (path === "/v1/public/oauth/token") {
      return "public_access_token";
    }
    return "runtime_bootstrap_validation";
  }
  if (path === "/v1/authz/check") {
    return "authorization_decision";
  }
  const paramTokens = getRouteParams(path).map(normalizeParamName).filter(Boolean);
  const staticTokens = getStaticSegments(path).map(normalizeToken).filter(Boolean);
  if (paramTokens.length > 0) {
    const lastStaticToken = staticTokens[staticTokens.length - 1] || null;
    const derived = lastStaticToken && ACTION_SEGMENTS.has(lastStaticToken) ? paramTokens[0] : paramTokens[paramTokens.length - 1];
    return maybePrefixGenericObjectType(derived, routeFamily);
  }
  return maybePrefixGenericObjectType(singularize(staticTokens[staticTokens.length - 1] || routeFamily), routeFamily);
}

function deriveScopeType(path, objectType) {
  if (isPublicRoute(path)) {
    return "public";
  }
  if (SELF_ROUTE_KEYS.has(`POST ${path}`) || SELF_ROUTE_KEYS.has(`PATCH ${path}`)) {
    return "self";
  }
  if (path.includes("/checklist/:itemCode")) {
    return "checklist_item";
  }
  const paramTokens = getRouteParams(path).map(normalizeParamName).filter(Boolean);
  return paramTokens[0] || (objectType === "auth_session" || objectType === "auth_factor" ? "self" : "company");
}

function deriveScopeCode(requiredScopeType, objectType, routeFamily) {
  if (requiredScopeType === "public") {
    return "public";
  }
  if (requiredScopeType === "self") {
    return objectType;
  }
  if (requiredScopeType === "company") {
    return objectType || routeFamily;
  }
  if (requiredScopeType === "checklist_item") {
    return "cutover_plan";
  }
  return requiredScopeType || objectType || routeFamily;
}

function deriveTrustLevel(path, routeFamily) {
  if (isPublicRoute(path)) {
    return "public";
  }
  if (SELF_ROUTE_KEYS.has(`POST ${path}`) || SELF_ROUTE_KEYS.has(`PATCH ${path}`)) {
    return "authenticated";
  }
  if (path.startsWith("/v1/notifications/")) {
    return "authenticated";
  }
  if (HIGH_RISK_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return "strong_mfa";
  }
  if (routeFamily === "documents" || routeFamily === "review") {
    return "mfa";
  }
  return "mfa";
}

function derivePermissionCode({ method, path, routeFamily, requiredScopeType }) {
  const key = `${method} ${path}`;
  if (EXACT_PUBLIC_ROUTE_KEYS.has(key)) {
    return null;
  }
  if (SELF_ROUTE_KEYS.has(key)) {
    return null;
  }
  if (LOW_RISK_COMPANY_READ_ROUTE_KEYS.has(key)) {
    return "company.read";
  }
  if (path.startsWith("/v1/org/companies/:companyId/users")) {
    return "company_user.write";
  }
  if (path.startsWith("/v1/org/delegations")) {
    return "delegation.manage";
  }
  if (path.startsWith("/v1/org/object-grants")) {
    return "object_grant.manage";
  }
  if (path.startsWith("/v1/org/attest-chains")) {
    return "attest_chain.manage";
  }
  if (path.startsWith("/v1/auth/sessions/")) {
    return "auth.session.revoke";
  }
  if (path.startsWith("/v1/auth/mfa/") && path.endsWith("/register-options")) {
    return "auth.factor.manage";
  }
  const operation = deriveOperation(path);
  if (["approve", "reject", "decide", "sign", "signoff", "ready_for_sign"].includes(operation)) {
    return "approval.approve";
  }
  if (requiredScopeType === "public" || requiredScopeType === "self") {
    return null;
  }
  if (routeFamily === "documents" || routeFamily === "review") {
    return operation === "approve" ? "approval.approve" : "company.manage";
  }
  return "company.manage";
}

function deriveActionClass({ path, routeFamily, objectType }) {
  return compactTokens([routeFamily, objectType, deriveOperation(path)]).join("_");
}

function deriveOperation(path) {
  const staticTokens = getStaticSegments(path).map(normalizeToken).filter(Boolean);
  const lastStaticToken = staticTokens[staticTokens.length - 1] || "execute";
  if (ACTION_SEGMENTS.has(lastStaticToken)) {
    return singularize(lastStaticToken);
  }
  return getRouteParams(path).length > 0 ? "update" : "create";
}

function isPublicRoute(path) {
  return EXACT_PUBLIC_ROUTE_KEYS.has(`POST ${path}`);
}

function getStaticSegments(path) {
  return normalizePath(path)
    .split("/")
    .filter(Boolean)
    .slice(1)
    .filter((segment) => !segment.startsWith(":"));
}

function getRouteParams(path) {
  return normalizePath(path)
    .split("/")
    .filter((segment) => segment.startsWith(":"))
    .map((segment) => segment.slice(1));
}

function normalizeMethod(method) {
  return typeof method === "string" && method.trim().length > 0 ? method.trim().toUpperCase() : null;
}

function normalizePath(path) {
  return typeof path === "string" && path.trim().length > 0 ? path.trim() : null;
}

function normalizeToken(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function normalizeParamName(paramName) {
  const normalized = normalizeToken(paramName);
  return normalized ? normalized.replace(/_(id|code)$/, "") : null;
}

function singularize(value) {
  if (!value) {
    return value;
  }
  if (value.endsWith("ies")) {
    return `${value.slice(0, -3)}y`;
  }
  if (value.endsWith("ses")) {
    return value.slice(0, -2);
  }
  if (value.endsWith("s") && !value.endsWith("ss")) {
    return value.slice(0, -1);
  }
  return value;
}

function maybePrefixGenericObjectType(objectType, routeFamily) {
  if (!objectType) {
    return normalizeToken(routeFamily || "resource");
  }
  if (objectType.startsWith(`${routeFamily}_`) || !GENERIC_OBJECT_TYPES.has(objectType)) {
    return objectType;
  }
  return `${routeFamily}_${objectType}`;
}

function compactTokens(tokens) {
  const compacted = [];
  for (const token of tokens.map(normalizeToken).filter(Boolean)) {
    if (compacted[compacted.length - 1] !== token) {
      compacted.push(token);
    }
  }
  return compacted;
}

function cloneContract(routeContract) {
  return {
    ...routeContract
  };
}

function clonePermissionReason(reason) {
  return {
    ...reason,
    surfaceFamilyCodes: [...(reason.surfaceFamilyCodes || [])]
  };
}
