CREATE TABLE IF NOT EXISTS tax_account_import_batches (
  import_batch_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  import_source TEXT NOT NULL,
  statement_date DATE NULL,
  imported_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  event_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  imported_by_actor_id TEXT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS tax_account_events (
  tax_account_event_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  import_batch_id TEXT NOT NULL REFERENCES tax_account_import_batches(import_batch_id),
  import_source TEXT NOT NULL,
  event_date DATE NOT NULL,
  posting_date DATE NOT NULL,
  event_type_code TEXT NOT NULL,
  effect_direction TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  currency_code TEXT NOT NULL,
  external_reference TEXT NOT NULL,
  source_reference TEXT NOT NULL,
  source_object_type TEXT NULL,
  source_object_id TEXT NULL,
  liability_type_code TEXT NULL,
  period_key TEXT NULL,
  mapping_status TEXT NOT NULL,
  reconciliation_status TEXT NOT NULL,
  mapped_target_object_type TEXT NULL,
  mapped_target_object_id TEXT NULL,
  mapped_liability_type_code TEXT NULL,
  mapped_by_rule_code TEXT NULL,
  ledger_posting_status TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tax_account_events_import_identity
  ON tax_account_events(company_id, import_source, external_reference, source_reference, posting_date, event_type_code, effect_direction, amount);

CREATE TABLE IF NOT EXISTS tax_account_reconciliation_items (
  reconciliation_item_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  liability_type_code TEXT NOT NULL,
  source_domain_code TEXT NOT NULL,
  source_object_type TEXT NOT NULL,
  source_object_id TEXT NOT NULL,
  source_reference TEXT NULL,
  period_key TEXT NULL,
  due_date DATE NOT NULL,
  currency_code TEXT NOT NULL,
  expected_amount NUMERIC(18,2) NOT NULL,
  assessed_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  settled_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tax_account_reconciliation_items_source
  ON tax_account_reconciliation_items(company_id, liability_type_code, source_object_type, source_object_id, due_date);

CREATE TABLE IF NOT EXISTS tax_account_offsets (
  tax_account_offset_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  tax_account_event_id TEXT NOT NULL REFERENCES tax_account_events(tax_account_event_id),
  reconciliation_item_id TEXT NOT NULL REFERENCES tax_account_reconciliation_items(reconciliation_item_id),
  reconciliation_run_id TEXT NULL,
  offset_amount NUMERIC(18,2) NOT NULL,
  offset_date DATE NOT NULL,
  offset_reason_code TEXT NOT NULL,
  status TEXT NOT NULL,
  approval_note TEXT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS tax_account_discrepancy_cases (
  discrepancy_case_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  status TEXT NOT NULL,
  difference_type_code TEXT NOT NULL,
  gross_difference_amount NUMERIC(18,2) NOT NULL,
  review_required BOOLEAN NOT NULL DEFAULT TRUE,
  tax_account_event_id TEXT NULL REFERENCES tax_account_events(tax_account_event_id),
  reconciliation_item_id TEXT NULL REFERENCES tax_account_reconciliation_items(reconciliation_item_id),
  explanation TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ NULL,
  resolved_by_actor_id TEXT NULL,
  resolution_note TEXT NULL
);

CREATE TABLE IF NOT EXISTS tax_account_reconciliation_runs (
  reconciliation_run_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  summary JSONB NOT NULL,
  event_ids_reviewed JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_offsets JSONB NOT NULL DEFAULT '[]'::jsonb,
  discrepancy_case_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
