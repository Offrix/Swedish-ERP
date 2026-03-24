INSERT INTO agreement_families (
  agreement_family_id,
  company_id,
  code,
  name,
  sector_code,
  status,
  created_by_actor_id,
  created_at,
  updated_at
)
VALUES (
  'agreement-family-demo-1',
  '00000000-0000-4000-8000-000000000001',
  'TEKNIKAVTALET',
  'Teknikavtalet',
  'PRIVATE',
  'active',
  'seed',
  NOW(),
  NOW()
)
ON CONFLICT (agreement_family_id) DO NOTHING;

INSERT INTO agreement_versions (
  agreement_version_id,
  agreement_family_id,
  company_id,
  agreement_family_code,
  version_code,
  effective_from,
  effective_to,
  rulepack_code,
  rulepack_version,
  status,
  rule_set_json,
  created_by_actor_id,
  created_at,
  updated_at
)
VALUES (
  'agreement-version-demo-1',
  'agreement-family-demo-1',
  '00000000-0000-4000-8000-000000000001',
  'TEKNIKAVTALET',
  'TEKNIKAVTALET_2026_01',
  '2026-01-01',
  NULL,
  'TENANT-COLLECTIVE-AGREEMENT',
  '2026.1',
  'active',
  '{"overtimeMultiplier":1.5,"obCategoryA":32.5}'::jsonb,
  'seed',
  NOW(),
  NOW()
)
ON CONFLICT (agreement_version_id) DO NOTHING;
