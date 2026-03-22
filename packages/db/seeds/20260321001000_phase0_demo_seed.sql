INSERT INTO customers (customer_id, company_id, customer_code, customer_no, display_name, legal_name, status)
VALUES (
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000001',
  'C-100',
  'C-100',
  'Demo Kund AB',
  'Demo Kund AB',
  'active'
)
ON CONFLICT (customer_id) DO NOTHING;

INSERT INTO suppliers (
  supplier_id,
  company_id,
  supplier_code,
  supplier_no,
  display_name,
  legal_name,
  status,
  country_code,
  base_currency_code,
  payment_terms_code
)
VALUES (
  '00000000-0000-4000-8000-000000000202',
  '00000000-0000-4000-8000-000000000001',
  'S-100',
  'S-100',
  'Demo Leverantor AB',
  'Demo Leverantor AB',
  'active',
  'SE',
  'SEK',
  'net_30'
)
ON CONFLICT (supplier_id) DO NOTHING;

INSERT INTO employees (employee_id, company_id, employee_number, display_name, status)
VALUES ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000001', 'E-100', 'Demo Anstalld', 'active')
ON CONFLICT (employee_id) DO NOTHING;

INSERT INTO employments (employment_id, company_id, employee_id, status, starts_on)
VALUES ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000203', 'active', DATE '2026-01-01')
ON CONFLICT (employment_id) DO NOTHING;

INSERT INTO projects (project_id, company_id, project_code, display_name, status)
VALUES ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000001', 'P-100', 'Demo Projekt', 'active')
ON CONFLICT (project_id) DO NOTHING;

INSERT INTO customer_invoices (customer_invoice_id, company_id, customer_id, invoice_number, status)
VALUES ('00000000-0000-4000-8000-000000000206', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000201', '10001', 'draft')
ON CONFLICT (customer_invoice_id) DO NOTHING;

INSERT INTO supplier_invoices (supplier_invoice_id, company_id, supplier_id, invoice_number, status)
VALUES ('00000000-0000-4000-8000-000000000207', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000202', 'SUP-10001', 'draft')
ON CONFLICT (supplier_invoice_id) DO NOTHING;

INSERT INTO pay_runs (pay_run_id, company_id, payroll_period, status)
VALUES ('00000000-0000-4000-8000-000000000208', '00000000-0000-4000-8000-000000000001', '2026-01', 'draft')
ON CONFLICT (pay_run_id) DO NOTHING;

INSERT INTO hus_claims (hus_claim_id, company_id, customer_invoice_id, claim_type, status)
VALUES ('00000000-0000-4000-8000-000000000209', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000206', 'rot', 'draft')
ON CONFLICT (hus_claim_id) DO NOTHING;

INSERT INTO attendance_logs (attendance_log_id, company_id, employee_id, check_in_at)
VALUES ('00000000-0000-4000-8000-000000000210', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000203', NOW())
ON CONFLICT (attendance_log_id) DO NOTHING;
