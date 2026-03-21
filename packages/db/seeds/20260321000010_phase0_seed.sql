INSERT INTO companies (company_id, legal_name, org_number, status)
VALUES ('00000000-0000-4000-8000-000000000001', 'Swedish ERP Demo AB', '559900-0001', 'active')
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO users (user_id, email, display_name, status)
VALUES ('00000000-0000-4000-8000-000000000011', 'admin@example.test', 'Phase 0 Admin', 'active')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO company_users (company_user_id, company_id, user_id, role_code, status)
VALUES ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'company_admin', 'active')
ON CONFLICT (company_user_id) DO NOTHING;

INSERT INTO accounting_periods (accounting_period_id, company_id, starts_on, ends_on, status)
VALUES ('00000000-0000-4000-8000-000000000031', '00000000-0000-4000-8000-000000000001', DATE '2026-01-01', DATE '2026-12-31', 'open')
ON CONFLICT (accounting_period_id) DO NOTHING;

INSERT INTO voucher_series (voucher_series_id, company_id, series_code, description)
VALUES
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'A', 'Manual journals'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', 'B', 'Customer invoices'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001', 'E', 'Supplier invoices'),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000001', 'H', 'Payroll'),
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000001', 'I', 'VAT')
ON CONFLICT (voucher_series_id) DO NOTHING;
