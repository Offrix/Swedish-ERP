INSERT INTO projects (
  project_id,
  company_id,
  project_code,
  project_reference_code,
  display_name,
  customer_id,
  starts_on,
  currency_code,
  status,
  billing_model_code,
  revenue_recognition_model_code,
  contract_value_amount,
  updated_at
) VALUES
  ('00000000-0000-4000-8000-000000010101','00000000-0000-4000-8000-000000000001','P-ALPHA','project-demo-alpha','Demo Project Alpha','00000000-0000-4000-8000-000000005101','2026-01-01','SEK','active','time_and_material','billing_equals_revenue',180000,NOW()),
  ('00000000-0000-4000-8000-000000010102','00000000-0000-4000-8000-000000000001','P-BETA','project-demo-beta','Demo Project Beta','00000000-0000-4000-8000-000000005102','2026-01-01','SEK','active','fixed_price','over_time',260000,NOW())
ON CONFLICT (project_id) DO UPDATE
SET project_reference_code = EXCLUDED.project_reference_code,
    customer_id = EXCLUDED.customer_id,
    starts_on = EXCLUDED.starts_on,
    currency_code = EXCLUDED.currency_code,
    status = EXCLUDED.status,
    billing_model_code = EXCLUDED.billing_model_code,
    revenue_recognition_model_code = EXCLUDED.revenue_recognition_model_code,
    contract_value_amount = EXCLUDED.contract_value_amount,
    updated_at = NOW();

INSERT INTO project_budget_versions (
  project_budget_version_id,
  company_id,
  project_id,
  version_no,
  budget_name,
  valid_from,
  status,
  totals_json,
  created_by_actor_id
) VALUES
  ('00000000-0000-4000-8000-000000010111','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000010101',1,'P-ALPHA baseline','2026-01-01','approved','{"costAmount":91500,"revenueAmount":160000}'::jsonb,'phase10_1_seed'),
  ('00000000-0000-4000-8000-000000010112','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000010102',1,'P-BETA baseline','2026-01-01','approved','{"costAmount":121000,"revenueAmount":200000}'::jsonb,'phase10_1_seed')
ON CONFLICT (project_budget_version_id) DO NOTHING;

INSERT INTO project_budget_lines (
  project_budget_line_id,
  project_budget_version_id,
  company_id,
  project_id,
  line_kind,
  category_code,
  reporting_period,
  amount,
  employment_id,
  activity_code,
  note
) VALUES
  ('00000000-0000-4000-8000-000000010121','00000000-0000-4000-8000-000000010111','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000010101','cost','labor','202603',42000,'00000000-0000-4000-8000-000000000721',NULL,'seed'),
  ('00000000-0000-4000-8000-000000010122','00000000-0000-4000-8000-000000010111','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000010101','cost','benefits','202603',2500,NULL,NULL,'seed'),
  ('00000000-0000-4000-8000-000000010123','00000000-0000-4000-8000-000000010111','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000010101','cost','pension','202603',3200,NULL,NULL,'seed'),
  ('00000000-0000-4000-8000-000000010124','00000000-0000-4000-8000-000000010111','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000010101','cost','travel','202603',1800,NULL,NULL,'seed'),
  ('00000000-0000-4000-8000-000000010125','00000000-0000-4000-8000-000000010111','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000010101','revenue','revenue','202603',78000,NULL,NULL,'seed'),
  ('00000000-0000-4000-8000-000000010126','00000000-0000-4000-8000-000000010112','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000010102','cost','labor','202603',48000,'00000000-0000-4000-8000-000000000723',NULL,'seed'),
  ('00000000-0000-4000-8000-000000010127','00000000-0000-4000-8000-000000010112','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000010102','cost','material','202603',22000,NULL,NULL,'seed'),
  ('00000000-0000-4000-8000-000000010128','00000000-0000-4000-8000-000000010112','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000010102','revenue','revenue','202603',90000,NULL,NULL,'seed')
ON CONFLICT (project_budget_line_id) DO NOTHING;

INSERT INTO project_resource_allocations (
  project_resource_allocation_id,
  company_id,
  project_id,
  employment_id,
  reporting_period,
  planned_minutes,
  billable_minutes,
  bill_rate_amount,
  cost_rate_amount,
  activity_code,
  status,
  created_by_actor_id
) VALUES
  ('00000000-0000-4000-8000-000000010131','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000010101','00000000-0000-4000-8000-000000000721','202603',9600,9600,900,450,'CONSULTING','planned','phase10_1_seed'),
  ('00000000-0000-4000-8000-000000010132','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000010102','00000000-0000-4000-8000-000000000723','202603',9600,9600,1100,500,'FIELD','planned','phase10_1_seed')
ON CONFLICT (project_resource_allocation_id) DO NOTHING;
