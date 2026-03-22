UPDATE companies
SET settings_json = jsonb_set(
  COALESCE(settings_json, '{}'::jsonb),
  '{companyFormCode}',
  to_jsonb(COALESCE(settings_json->>'companyFormCode', 'AB')),
  true
),
updated_at = NOW()
WHERE company_id = '00000000-0000-4000-8000-000000000001'
  AND (settings_json->>'companyFormCode') IS NULL;
