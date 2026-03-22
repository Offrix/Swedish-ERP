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
) VALUES (
  '00000000-0000-4000-8000-000000010211',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000010101',
  2,
  'P-ALPHA forecast revision',
  '2026-03-01',
  'approved',
  '{"costAmount":98000,"revenueAmount":170000}'::jsonb,
  'phase10_1_demo'
) ON CONFLICT (project_budget_version_id) DO NOTHING;

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
  ('00000000-0000-4000-8000-000000010221','00000000-0000-4000-8000-000000010211','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000010101','cost','labor','202604',46000,'00000000-0000-4000-8000-000000000721','CONSULTING','forecast revision'),
  ('00000000-0000-4000-8000-000000010222','00000000-0000-4000-8000-000000010211','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000010101','cost','travel','202604',2500,NULL,NULL,'forecast revision'),
  ('00000000-0000-4000-8000-000000010223','00000000-0000-4000-8000-000000010211','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000010101','revenue','revenue','202604',92000,NULL,NULL,'forecast revision')
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
) VALUES (
  '00000000-0000-4000-8000-000000010231',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000010101',
  '00000000-0000-4000-8000-000000000721',
  '202604',
  10200,
  10200,
  940,
  470,
  'CONSULTING',
  'confirmed',
  'phase10_1_demo'
) ON CONFLICT (project_resource_allocation_id) DO NOTHING;
