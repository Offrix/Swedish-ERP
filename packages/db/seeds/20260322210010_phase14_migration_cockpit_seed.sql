INSERT INTO migration_mapping_sets (
  mapping_set_id,
  company_id,
  source_system,
  domain_scope,
  version_no,
  status,
  mappings_json,
  reviewed_by_user_id,
  approved_by_user_id,
  effective_for_batches_json,
  created_at,
  updated_at
)
VALUES (
  '14000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000001',
  'legacy_erp',
  'finance_core',
  1,
  'approved',
  '[{"sourceField":"legacy_account","targetField":"account_number"}]'::jsonb,
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000011',
  '[]'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (mapping_set_id) DO NOTHING;
