export const MIGRATIONS_DIR = "packages/db/migrations";
export const SEEDS_DIR = "packages/db/seeds";

export const EXPECTED_PHASE0_TABLES = [
  "companies",
  "users",
  "company_users",
  "delegations",
  "accounts",
  "voucher_series",
  "journal_entries",
  "journal_lines",
  "accounting_periods",
  "documents",
  "document_versions",
  "document_links",
  "email_ingest_messages",
  "customers",
  "quotes",
  "customer_invoices",
  "ar_open_items",
  "suppliers",
  "purchase_orders",
  "supplier_invoices",
  "ap_open_items",
  "employees",
  "employments",
  "time_entries",
  "leave_entries",
  "pay_runs",
  "pay_run_lines",
  "benefit_events",
  "travel_claims",
  "mileage_logs",
  "pension_events",
  "projects",
  "project_budgets",
  "project_budget_versions",
  "project_budget_lines",
  "project_resource_allocations",
  "project_cost_snapshots",
  "project_wip_snapshots",
  "project_forecast_snapshots",
  "work_orders",
  "inventory_locations",
  "inventory_items",
  "inventory_balances",
  "field_dispatch_assignments",
  "field_material_withdrawals",
  "field_customer_signatures",
  "field_sync_envelopes",
  "field_events",
  "attendance_logs",
  "vat_decisions",
  "agi_submissions",
  "hus_claims",
  "peppol_messages",
  "annual_report_packages",
  "audit_events",
  "idempotency_keys",
  "outbox_events"
] as const;

export const EXPECTED_PHASE1_TABLES = [
  "roles",
  "permissions",
  "role_permissions",
  "object_grants",
  "approval_chains",
  "approval_chain_steps",
  "auth_identities",
  "auth_sessions",
  "auth_factors",
  "auth_challenges",
  "auth_providers",
  "company_setup_blueprints",
  "company_registrations",
  "company_vat_setups",
  "onboarding_runs",
  "onboarding_step_states"
] as const;

export interface MigrationFile {
  readonly id: string;
  readonly slug: string;
  readonly fileName: string;
}

export interface DbAuditContext {
  readonly actorId: string;
  readonly companyId: string;
  readonly correlationId: string;
}
