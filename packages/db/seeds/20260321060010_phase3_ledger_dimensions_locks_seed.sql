INSERT INTO accounting_periods (
  accounting_period_id,
  company_id,
  starts_on,
  ends_on,
  status
)
VALUES (
  '00000000-0000-4000-8000-000000000032',
  '00000000-0000-4000-8000-000000000001',
  DATE '2027-01-01',
  DATE '2027-12-31',
  'open'
)
ON CONFLICT (company_id, starts_on, ends_on) DO NOTHING;

INSERT INTO ledger_dimension_values (company_id, dimension_key, dimension_code, dimension_label, status)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'projectId', 'project-demo-alpha', 'Demo Project Alpha', 'active'),
  ('00000000-0000-4000-8000-000000000001', 'projectId', 'project-demo-beta', 'Demo Project Beta', 'active'),
  ('00000000-0000-4000-8000-000000000001', 'costCenterCode', 'CC-100', 'Operations', 'active'),
  ('00000000-0000-4000-8000-000000000001', 'costCenterCode', 'CC-200', 'Projects', 'active'),
  ('00000000-0000-4000-8000-000000000001', 'businessAreaCode', 'BA-SERVICES', 'Services', 'active'),
  ('00000000-0000-4000-8000-000000000001', 'businessAreaCode', 'BA-FIELD', 'Field', 'active')
ON CONFLICT (company_id, dimension_key, dimension_code) DO UPDATE
SET dimension_label = EXCLUDED.dimension_label,
    status = EXCLUDED.status,
    updated_at = NOW();

UPDATE voucher_series
SET description = CASE series_code
  WHEN 'V' THEN 'Automated corrections and reversals'
  WHEN 'W' THEN 'Historical imports'
  WHEN 'X' THEN 'Audit and revision adjustments'
  WHEN 'Y' THEN 'Technical migration reserve'
  WHEN 'Z' THEN 'Blocked reserve series'
  ELSE description
END
WHERE company_id = '00000000-0000-4000-8000-000000000001'
  AND series_code IN ('V', 'W', 'X', 'Y', 'Z');
