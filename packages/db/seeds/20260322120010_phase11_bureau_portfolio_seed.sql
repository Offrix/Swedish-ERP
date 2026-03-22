UPDATE companies
SET settings_json = jsonb_set(
  COALESCE(settings_json, '{}'::jsonb),
  '{bureauDelivery}',
  '{
    "closeLeadBusinessDays": 3,
    "reportingLeadBusinessDays": 2,
    "submissionLeadBusinessDays": 2,
    "generalLeadBusinessDays": 1,
    "approvalLeadBusinessDays": 2,
    "reminderProfile": "standard"
  }'::jsonb,
  true
),
updated_at = NOW()
WHERE company_id = '00000000-0000-4000-8000-000000000001';
