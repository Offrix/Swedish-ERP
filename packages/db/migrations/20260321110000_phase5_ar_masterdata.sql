ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS customer_no TEXT,
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS org_number TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'SE',
  ADD COLUMN IF NOT EXISTS language_code TEXT NOT NULL DEFAULT 'sv',
  ADD COLUMN IF NOT EXISTS vat_status TEXT NOT NULL DEFAULT 'vat_registered',
  ADD COLUMN IF NOT EXISTS base_currency_code TEXT NOT NULL DEFAULT 'SEK',
  ADD COLUMN IF NOT EXISTS payment_terms_code TEXT NOT NULL DEFAULT 'net_30',
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reminder_profile_code TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS allow_reminder_fee BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allow_interest BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allow_partial_delivery BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS blocked_for_invoicing BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS blocked_for_delivery BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS billing_address_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_address_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS peppol_id TEXT,
  ADD COLUMN IF NOT EXISTS peppol_scheme TEXT,
  ADD COLUMN IF NOT EXISTS default_ar_account_no TEXT,
  ADD COLUMN IF NOT EXISTS default_revenue_segment TEXT,
  ADD COLUMN IF NOT EXISTS project_dimension_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS import_source_key TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE customers
SET customer_no = COALESCE(customer_no, customer_code, 'CUST-' || SUBSTRING(customer_id::text FROM 1 FOR 8))
WHERE customer_no IS NULL;

UPDATE customers
SET legal_name = COALESCE(legal_name, display_name)
WHERE legal_name IS NULL;

ALTER TABLE customers
  ALTER COLUMN customer_no SET NOT NULL,
  ALTER COLUMN legal_name SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customers_phase5_ar_customer_no_not_blank'
  ) THEN
    ALTER TABLE customers
      ADD CONSTRAINT ck_customers_phase5_ar_customer_no_not_blank
      CHECK (LENGTH(BTRIM(customer_no)) > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customers_phase5_ar_credit_limit_non_negative'
  ) THEN
    ALTER TABLE customers
      ADD CONSTRAINT ck_customers_phase5_ar_credit_limit_non_negative
      CHECK (credit_limit >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customers_phase5_ar_country_code'
  ) THEN
    ALTER TABLE customers
      ADD CONSTRAINT ck_customers_phase5_ar_country_code
      CHECK (country_code ~ '^[A-Z]{2}$');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customers_phase5_ar_vat_status'
  ) THEN
    ALTER TABLE customers
      ADD CONSTRAINT ck_customers_phase5_ar_vat_status
      CHECK (vat_status IN ('vat_registered', 'not_vat_registered', 'reverse_charge_only', 'exempt'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_customers_phase5_customer_no
  ON customers (company_id, customer_no);

CREATE INDEX IF NOT EXISTS ix_customers_phase5_org_number
  ON customers (company_id, org_number);

CREATE INDEX IF NOT EXISTS ix_customers_phase5_import_source_key
  ON customers (company_id, import_source_key)
  WHERE import_source_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS customer_contacts (
  customer_contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  contact_no TEXT NOT NULL,
  role_code TEXT NOT NULL DEFAULT 'general',
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  preferred_language_code TEXT,
  title TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, customer_id, contact_no)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_contacts_phase5_role'
  ) THEN
    ALTER TABLE customer_contacts
      ADD CONSTRAINT ck_customer_contacts_phase5_role
      CHECK (role_code IN ('billing', 'delivery', 'contract', 'reminder', 'general'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_customer_contacts_phase5_status'
  ) THEN
    ALTER TABLE customer_contacts
      ADD CONSTRAINT ck_customer_contacts_phase5_status
      CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_customer_contacts_phase5_customer
  ON customer_contacts (company_id, customer_id, is_primary DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS ar_items (
  ar_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL,
  unit_code TEXT NOT NULL DEFAULT 'ea',
  status TEXT NOT NULL DEFAULT 'active',
  vat_behavior_code TEXT NOT NULL,
  default_vat_code TEXT,
  default_revenue_account_no TEXT,
  dimensions_required_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  recurring_flag BOOLEAN NOT NULL DEFAULT FALSE,
  project_bound_flag BOOLEAN NOT NULL DEFAULT FALSE,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, item_code)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_items_phase5_item_type'
  ) THEN
    ALTER TABLE ar_items
      ADD CONSTRAINT ck_ar_items_phase5_item_type
      CHECK (item_type IN ('goods', 'service', 'fee', 'subscription', 'project', 'discount'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_items_phase5_status'
  ) THEN
    ALTER TABLE ar_items
      ADD CONSTRAINT ck_ar_items_phase5_status
      CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_items_phase5_vat_behavior'
  ) THEN
    ALTER TABLE ar_items
      ADD CONSTRAINT ck_ar_items_phase5_vat_behavior
      CHECK (vat_behavior_code IN ('standard', 'reduced', 'zero', 'exempt', 'reverse_charge', 'out_of_scope'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ar_price_lists (
  ar_price_list_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  price_list_code TEXT NOT NULL,
  price_list_name TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  status TEXT NOT NULL DEFAULT 'draft',
  valid_from DATE NOT NULL,
  valid_to DATE,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, price_list_code, valid_from)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_price_lists_phase5_status'
  ) THEN
    ALTER TABLE ar_price_lists
      ADD CONSTRAINT ck_ar_price_lists_phase5_status
      CHECK (status IN ('draft', 'active', 'archived'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_price_lists_phase5_valid_range'
  ) THEN
    ALTER TABLE ar_price_lists
      ADD CONSTRAINT ck_ar_price_lists_phase5_valid_range
      CHECK (valid_to IS NULL OR valid_to >= valid_from);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ar_price_list_items (
  ar_price_list_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ar_price_list_id UUID NOT NULL REFERENCES ar_price_lists(ar_price_list_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  ar_item_id UUID NOT NULL REFERENCES ar_items(ar_item_id) ON DELETE RESTRICT,
  valid_from DATE NOT NULL,
  valid_to DATE,
  unit_price NUMERIC(18, 4) NOT NULL,
  minimum_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
  pricing_model_code TEXT NOT NULL DEFAULT 'fixed_price',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ar_price_list_id, ar_item_id, valid_from)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_price_list_items_phase5_unit_price_non_negative'
  ) THEN
    ALTER TABLE ar_price_list_items
      ADD CONSTRAINT ck_ar_price_list_items_phase5_unit_price_non_negative
      CHECK (unit_price >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_price_list_items_phase5_min_qty_non_negative'
  ) THEN
    ALTER TABLE ar_price_list_items
      ADD CONSTRAINT ck_ar_price_list_items_phase5_min_qty_non_negative
      CHECK (minimum_quantity >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_price_list_items_phase5_valid_range'
  ) THEN
    ALTER TABLE ar_price_list_items
      ADD CONSTRAINT ck_ar_price_list_items_phase5_valid_range
      CHECK (valid_to IS NULL OR valid_to >= valid_from);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_price_list_items_phase5_pricing_model'
  ) THEN
    ALTER TABLE ar_price_list_items
      ADD CONSTRAINT ck_ar_price_list_items_phase5_pricing_model
      CHECK (pricing_model_code IN ('fixed_price', 'tiered', 'usage', 'manual'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_ar_price_list_items_phase5_lookup
  ON ar_price_list_items (company_id, ar_item_id, valid_from, valid_to);

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS quote_no TEXT,
  ADD COLUMN IF NOT EXISTS valid_from DATE,
  ADD COLUMN IF NOT EXISTS valid_to DATE,
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'SEK',
  ADD COLUMN IF NOT EXISTS payment_terms_code TEXT NOT NULL DEFAULT 'net_30',
  ADD COLUMN IF NOT EXISTS ar_price_list_id UUID REFERENCES ar_price_lists(ar_price_list_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_quote_id UUID REFERENCES quotes(quote_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_contract_id UUID,
  ADD COLUMN IF NOT EXISTS generation_key TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE quotes
SET quote_no = COALESCE(quote_no, 'Q-' || SUBSTRING(quote_id::text FROM 1 FOR 8))
WHERE quote_no IS NULL;

ALTER TABLE quotes
  ALTER COLUMN quote_no SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_quotes_phase5_status'
  ) THEN
    ALTER TABLE quotes
      ADD CONSTRAINT ck_quotes_phase5_status
      CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_quotes_phase5_valid_range'
  ) THEN
    ALTER TABLE quotes
      ADD CONSTRAINT ck_quotes_phase5_valid_range
      CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_to >= valid_from);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_quotes_phase5_quote_no
  ON quotes (company_id, quote_no);

CREATE UNIQUE INDEX IF NOT EXISTS ux_quotes_phase5_generation_key
  ON quotes (company_id, generation_key)
  WHERE generation_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS quote_versions (
  quote_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(quote_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  valid_from DATE,
  valid_to DATE,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  payment_terms_code TEXT NOT NULL DEFAULT 'net_30',
  discount_model_code TEXT NOT NULL DEFAULT 'none',
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_actor_id TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (quote_id, version_number)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_quote_versions_phase5_status'
  ) THEN
    ALTER TABLE quote_versions
      ADD CONSTRAINT ck_quote_versions_phase5_status
      CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_quote_versions_phase5_discount_model'
  ) THEN
    ALTER TABLE quote_versions
      ADD CONSTRAINT ck_quote_versions_phase5_discount_model
      CHECK (discount_model_code IN ('none', 'line', 'header', 'volume'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS quote_version_lines (
  quote_version_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_version_id UUID NOT NULL REFERENCES quote_versions(quote_version_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  line_type TEXT NOT NULL DEFAULT 'item',
  ar_item_id UUID REFERENCES ar_items(ar_item_id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
  unit_price NUMERIC(18, 4) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(9, 4) NOT NULL DEFAULT 0,
  net_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  vat_code TEXT,
  vat_rate NUMERIC(9, 4),
  period_start DATE,
  period_end DATE,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (quote_version_id, line_no)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_quote_version_lines_phase5_line_type'
  ) THEN
    ALTER TABLE quote_version_lines
      ADD CONSTRAINT ck_quote_version_lines_phase5_line_type
      CHECK (line_type IN ('item', 'text', 'fee', 'discount'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_quote_version_lines_phase5_quantity_non_negative'
  ) THEN
    ALTER TABLE quote_version_lines
      ADD CONSTRAINT ck_quote_version_lines_phase5_quantity_non_negative
      CHECK (quantity >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_quote_version_lines_phase5_unit_price_non_negative'
  ) THEN
    ALTER TABLE quote_version_lines
      ADD CONSTRAINT ck_quote_version_lines_phase5_unit_price_non_negative
      CHECK (unit_price >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_quote_version_lines_phase5_discount_percent_range'
  ) THEN
    ALTER TABLE quote_version_lines
      ADD CONSTRAINT ck_quote_version_lines_phase5_discount_percent_range
      CHECK (discount_percent >= 0 AND discount_percent <= 100);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS contracts (
  contract_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
  quote_id UUID REFERENCES quotes(quote_id) ON DELETE SET NULL,
  contract_no TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  starts_on DATE NOT NULL,
  ends_on DATE,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  payment_terms_code TEXT NOT NULL DEFAULT 'net_30',
  indexation_code TEXT,
  min_fee_amount NUMERIC(18, 2),
  credit_rule_code TEXT NOT NULL DEFAULT 'standard',
  termination_policy_code TEXT NOT NULL DEFAULT 'notice_required',
  allow_partial_delivery BOOLEAN NOT NULL DEFAULT TRUE,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_actor_id TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, contract_no)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_contracts_phase5_status'
  ) THEN
    ALTER TABLE contracts
      ADD CONSTRAINT ck_contracts_phase5_status
      CHECK (status IN ('draft', 'pending_approval', 'active', 'paused', 'terminated', 'expired'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_contracts_phase5_valid_range'
  ) THEN
    ALTER TABLE contracts
      ADD CONSTRAINT ck_contracts_phase5_valid_range
      CHECK (ends_on IS NULL OR ends_on >= starts_on);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS contract_versions (
  contract_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(contract_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  starts_on DATE NOT NULL,
  ends_on DATE,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_actor_id TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contract_id, version_number)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_contract_versions_phase5_status'
  ) THEN
    ALTER TABLE contract_versions
      ADD CONSTRAINT ck_contract_versions_phase5_status
      CHECK (status IN ('draft', 'active', 'superseded', 'terminated', 'expired'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_contract_versions_phase5_valid_range'
  ) THEN
    ALTER TABLE contract_versions
      ADD CONSTRAINT ck_contract_versions_phase5_valid_range
      CHECK (ends_on IS NULL OR ends_on >= starts_on);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS contract_version_lines (
  contract_version_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_version_id UUID NOT NULL REFERENCES contract_versions(contract_version_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  ar_item_id UUID REFERENCES ar_items(ar_item_id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
  unit_price NUMERIC(18, 4) NOT NULL DEFAULT 0,
  billing_frequency_code TEXT NOT NULL DEFAULT 'monthly',
  service_period_required BOOLEAN NOT NULL DEFAULT TRUE,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contract_version_id, line_no)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_contract_version_lines_phase5_quantity_non_negative'
  ) THEN
    ALTER TABLE contract_version_lines
      ADD CONSTRAINT ck_contract_version_lines_phase5_quantity_non_negative
      CHECK (quantity >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_contract_version_lines_phase5_unit_price_non_negative'
  ) THEN
    ALTER TABLE contract_version_lines
      ADD CONSTRAINT ck_contract_version_lines_phase5_unit_price_non_negative
      CHECK (unit_price >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_contract_version_lines_phase5_frequency'
  ) THEN
    ALTER TABLE contract_version_lines
      ADD CONSTRAINT ck_contract_version_lines_phase5_frequency
      CHECK (billing_frequency_code IN ('monthly', 'quarterly', 'yearly', 'milestone', 'once'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS invoice_plans (
  invoice_plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(contract_id) ON DELETE RESTRICT,
  plan_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  frequency_code TEXT NOT NULL DEFAULT 'monthly',
  start_on DATE NOT NULL,
  end_on DATE,
  next_run_on DATE,
  last_generated_on DATE,
  generation_timezone TEXT NOT NULL DEFAULT 'Europe/Stockholm',
  idempotency_scope_key TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_actor_id TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, plan_code),
  UNIQUE (company_id, idempotency_scope_key)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_invoice_plans_phase5_status'
  ) THEN
    ALTER TABLE invoice_plans
      ADD CONSTRAINT ck_invoice_plans_phase5_status
      CHECK (status IN ('draft', 'active', 'paused', 'terminated', 'completed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_invoice_plans_phase5_frequency'
  ) THEN
    ALTER TABLE invoice_plans
      ADD CONSTRAINT ck_invoice_plans_phase5_frequency
      CHECK (frequency_code IN ('monthly', 'quarterly', 'yearly', 'milestone', 'custom'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_invoice_plans_phase5_valid_range'
  ) THEN
    ALTER TABLE invoice_plans
      ADD CONSTRAINT ck_invoice_plans_phase5_valid_range
      CHECK (end_on IS NULL OR end_on >= start_on);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS invoice_plan_lines (
  invoice_plan_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_plan_id UUID NOT NULL REFERENCES invoice_plans(invoice_plan_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  sequence_no INTEGER NOT NULL,
  planned_invoice_date DATE NOT NULL,
  period_start DATE,
  period_end DATE,
  ar_item_id UUID REFERENCES ar_items(ar_item_id) ON DELETE SET NULL,
  contract_version_line_id UUID REFERENCES contract_version_lines(contract_version_line_id) ON DELETE SET NULL,
  quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
  unit_price NUMERIC(18, 4) NOT NULL DEFAULT 0,
  line_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  status TEXT NOT NULL DEFAULT 'planned',
  generation_key TEXT,
  generated_customer_invoice_id UUID REFERENCES customer_invoices(customer_invoice_id) ON DELETE SET NULL,
  skip_reason_code TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (invoice_plan_id, sequence_no)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_invoice_plan_lines_phase5_generation_key
  ON invoice_plan_lines (company_id, generation_key)
  WHERE generation_key IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_invoice_plan_lines_phase5_status'
  ) THEN
    ALTER TABLE invoice_plan_lines
      ADD CONSTRAINT ck_invoice_plan_lines_phase5_status
      CHECK (status IN ('planned', 'generated', 'invoiced', 'skipped', 'cancelled'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_invoice_plan_lines_phase5_quantity_non_negative'
  ) THEN
    ALTER TABLE invoice_plan_lines
      ADD CONSTRAINT ck_invoice_plan_lines_phase5_quantity_non_negative
      CHECK (quantity >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_invoice_plan_lines_phase5_unit_price_non_negative'
  ) THEN
    ALTER TABLE invoice_plan_lines
      ADD CONSTRAINT ck_invoice_plan_lines_phase5_unit_price_non_negative
      CHECK (unit_price >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_invoice_plan_lines_phase5_line_amount_non_negative'
  ) THEN
    ALTER TABLE invoice_plan_lines
      ADD CONSTRAINT ck_invoice_plan_lines_phase5_line_amount_non_negative
      CHECK (line_amount >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_invoice_plan_lines_phase5_period_range'
  ) THEN
    ALTER TABLE invoice_plan_lines
      ADD CONSTRAINT ck_invoice_plan_lines_phase5_period_range
      CHECK (period_start IS NULL OR period_end IS NULL OR period_end >= period_start);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_invoice_plan_lines_phase5_schedule
  ON invoice_plan_lines (company_id, planned_invoice_date, status);

CREATE TABLE IF NOT EXISTS ar_customer_import_batches (
  ar_customer_import_batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  source_channel TEXT NOT NULL DEFAULT 'manual_file',
  source_file_name TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  row_count INTEGER NOT NULL DEFAULT 0,
  applied_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_customer_import_batches_phase5_status'
  ) THEN
    ALTER TABLE ar_customer_import_batches
      ADD CONSTRAINT ck_ar_customer_import_batches_phase5_status
      CHECK (status IN ('received', 'validated', 'applied', 'partial', 'failed'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ar_customer_import_rows (
  ar_customer_import_row_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ar_customer_import_batch_id UUID NOT NULL REFERENCES ar_customer_import_batches(ar_customer_import_batch_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  row_no INTEGER NOT NULL,
  external_key TEXT,
  status TEXT NOT NULL DEFAULT 'validated',
  customer_id UUID REFERENCES customers(customer_id) ON DELETE SET NULL,
  error_code TEXT,
  error_message TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ar_customer_import_batch_id, row_no)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_ar_customer_import_rows_phase5_status'
  ) THEN
    ALTER TABLE ar_customer_import_rows
      ADD CONSTRAINT ck_ar_customer_import_rows_phase5_status
      CHECK (status IN ('validated', 'applied', 'failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_ar_customer_import_rows_phase5_status
  ON ar_customer_import_rows (company_id, status, created_at DESC);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260321110000_phase5_ar_masterdata')
ON CONFLICT (migration_id) DO NOTHING;
