ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(customer_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS service_type_code TEXT,
  ADD COLUMN IF NOT EXISTS priority_code TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS scheduled_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS labor_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_item_id UUID REFERENCES ar_items(ar_item_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS labor_rate_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS signature_required BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS signature_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS customer_invoice_id UUID REFERENCES customer_invoices(customer_invoice_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version_no INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_by_actor_id TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS ux_work_orders_company_number_phase10_2
  ON work_orders (company_id, work_order_number)
  WHERE work_order_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_work_orders_phase10_2_project_status
  ON work_orders (company_id, project_id, status, scheduled_start_at);

CREATE TABLE IF NOT EXISTS inventory_locations (
  inventory_location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  location_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  location_type TEXT NOT NULL,
  project_id UUID REFERENCES projects(project_id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, location_code)
);

CREATE TABLE IF NOT EXISTS inventory_items (
  inventory_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  unit_code TEXT NOT NULL,
  ar_item_id UUID REFERENCES ar_items(ar_item_id) ON DELETE SET NULL,
  sales_unit_price_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, item_code)
);

CREATE TABLE IF NOT EXISTS inventory_balances (
  inventory_balance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(inventory_item_id) ON DELETE CASCADE,
  inventory_location_id UUID NOT NULL REFERENCES inventory_locations(inventory_location_id) ON DELETE CASCADE,
  on_hand_quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
  reserved_quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
  updated_by_actor_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (inventory_item_id, inventory_location_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_inventory_balances_reserved_le_onhand_phase10_2'
  ) THEN
    ALTER TABLE inventory_balances
      ADD CONSTRAINT chk_inventory_balances_reserved_le_onhand_phase10_2
      CHECK (reserved_quantity <= on_hand_quantity);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_inventory_balances_phase10_2_company_location
  ON inventory_balances (company_id, inventory_location_id, inventory_item_id);

CREATE TABLE IF NOT EXISTS field_dispatch_assignments (
  dispatch_assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES work_orders(work_order_id) ON DELETE CASCADE,
  employment_id UUID NOT NULL REFERENCES employments(employment_id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_field_dispatch_assignments_phase10_2_work_order
  ON field_dispatch_assignments (company_id, work_order_id, status);

CREATE INDEX IF NOT EXISTS ix_field_dispatch_assignments_phase10_2_employment
  ON field_dispatch_assignments (company_id, employment_id, starts_at);

CREATE TABLE IF NOT EXISTS field_material_withdrawals (
  material_withdrawal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES work_orders(work_order_id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(inventory_item_id) ON DELETE RESTRICT,
  inventory_location_id UUID NOT NULL REFERENCES inventory_locations(inventory_location_id) ON DELETE RESTRICT,
  quantity NUMERIC(18,4) NOT NULL,
  source_channel TEXT NOT NULL DEFAULT 'api',
  note TEXT,
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_field_material_withdrawals_phase10_2_project
  ON field_material_withdrawals (company_id, project_id, created_at);

CREATE TABLE IF NOT EXISTS field_customer_signatures (
  field_customer_signature_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES work_orders(work_order_id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL,
  signature_text TEXT NOT NULL,
  signature_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'captured',
  captured_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_field_customer_signatures_phase10_2_work_order
  ON field_customer_signatures (company_id, work_order_id, status);

CREATE TABLE IF NOT EXISTS field_sync_envelopes (
  field_sync_envelope_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  client_mutation_id TEXT NOT NULL,
  client_device_id TEXT NOT NULL,
  client_user_id TEXT NOT NULL,
  object_type TEXT NOT NULL,
  local_object_id TEXT,
  server_object_id TEXT,
  mutation_type TEXT NOT NULL,
  base_server_version INTEGER,
  merge_strategy TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  UNIQUE (company_id, client_mutation_id)
);

CREATE INDEX IF NOT EXISTS ix_field_sync_envelopes_phase10_2_status
  ON field_sync_envelopes (company_id, sync_status, created_at);
