INSERT INTO id06_company_verifications (
  id06_company_verification_id,
  company_id,
  org_no,
  company_name,
  provider_code,
  status,
  verified_at,
  created_by_actor_id,
  created_at,
  updated_at
) VALUES (
  'id06-company-demo-1',
  'company_demo_1',
  '556677-8899',
  'Demo Install AB',
  'id06',
  'verified',
  '2026-03-25T08:00:00.000Z',
  'system',
  '2026-03-25T08:00:00.000Z',
  '2026-03-25T08:00:00.000Z'
)
ON CONFLICT DO NOTHING;
