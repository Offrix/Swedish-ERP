INSERT INTO feature_flags (
  feature_flag_id,
  company_id,
  flag_key,
  description,
  flag_type,
  scope_type,
  scope_ref,
  default_enabled,
  enabled,
  owner_user_id,
  risk_class,
  sunset_at,
  emergency_disabled,
  changed_by_user_id,
  created_at,
  updated_at
)
VALUES (
  '14000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000001',
  'phase13.public_api',
  'Controls public API exposure for phase 13.',
  'release',
  'company',
  '00000000-0000-4000-8000-000000000001',
  TRUE,
  TRUE,
  '00000000-0000-4000-8000-000000000011',
  'medium',
  DATE '2026-12-31',
  FALSE,
  '00000000-0000-4000-8000-000000000011',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;
