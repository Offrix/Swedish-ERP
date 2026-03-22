INSERT INTO annual_report_packages (
  package_id,
  company_id,
  accounting_period_id,
  fiscal_year,
  profile_code,
  status,
  created_by_actor_id,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000001401',
  '00000000-0000-4000-8000-000000001201',
  '00000000-0000-4000-8000-000000001202',
  '2026',
  'k2',
  'signed',
  '00000000-0000-4000-8000-000000000011',
  TIMESTAMPTZ '2026-05-20T09:00:00Z',
  TIMESTAMPTZ '2026-05-20T09:30:00Z'
)
ON CONFLICT (package_id) DO NOTHING;

INSERT INTO annual_report_versions (
  version_id,
  package_id,
  company_id,
  version_no,
  profile_code,
  package_status,
  accounting_period_id,
  documents_json,
  text_sections_json,
  note_sections_json,
  tax_package_outputs_json,
  source_fingerprint,
  checksum,
  diff_from_previous_json,
  created_by_actor_id,
  locked_at,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000001402',
  '00000000-0000-4000-8000-000000001401',
  '00000000-0000-4000-8000-000000001201',
  1,
  'k2',
  'signed',
  '00000000-0000-4000-8000-000000001202',
  '[{"documentCode":"balance_sheet","sourceType":"report_snapshot","checksum":"phase12-demo-balance"},{"documentCode":"income_statement","sourceType":"report_snapshot","checksum":"phase12-demo-income"},{"documentCode":"notes_bundle","sourceType":"text_bundle","checksum":"phase12-demo-notes"},{"documentCode":"management_report","sourceType":"text_bundle","checksum":"phase12-demo-management"},{"documentCode":"establishment_certificate","sourceType":"generated_text","checksum":"phase12-demo-certificate"}]'::jsonb,
  '{"management_report":"Demo annual report","accounting_policies":"K2 policy baseline"}'::jsonb,
  '{"notes_bundle":"Demo notes","simplified_notes":"Demo simplified notes"}'::jsonb,
  '[{"taxPackageCode":"income_tax_support","outputChecksum":"phase12-demo-tax"}]'::jsonb,
  'phase12-demo-source',
  'phase12-demo-checksum',
  '[]'::jsonb,
  '00000000-0000-4000-8000-000000000011',
  TIMESTAMPTZ '2026-05-20T09:30:00Z',
  TIMESTAMPTZ '2026-05-20T09:05:00Z',
  TIMESTAMPTZ '2026-05-20T09:30:00Z'
)
ON CONFLICT (version_id) DO NOTHING;

UPDATE annual_report_packages
SET current_version_id = '00000000-0000-4000-8000-000000001402'
WHERE package_id = '00000000-0000-4000-8000-000000001401';

INSERT INTO annual_report_signatories (
  signatory_id,
  package_id,
  version_id,
  company_id,
  company_user_id,
  user_id,
  signatory_role,
  status,
  invited_at,
  signed_at,
  comment,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000001403',
  '00000000-0000-4000-8000-000000001401',
  '00000000-0000-4000-8000-000000001402',
  '00000000-0000-4000-8000-000000001201',
  '00000000-0000-4000-8000-000000000021',
  '00000000-0000-4000-8000-000000000011',
  'ceo',
  'signed',
  TIMESTAMPTZ '2026-05-20T09:10:00Z',
  TIMESTAMPTZ '2026-05-20T09:25:00Z',
  'Signed demo annual report',
  TIMESTAMPTZ '2026-05-20T09:25:00Z'
)
ON CONFLICT (signatory_id) DO NOTHING;

INSERT INTO annual_report_submission_events (
  submission_event_id,
  package_id,
  version_id,
  event_type,
  payload_checksum,
  provider_reference,
  payload_json,
  recorded_at
)
VALUES (
  '00000000-0000-4000-8000-000000001404',
  '00000000-0000-4000-8000-000000001401',
  '00000000-0000-4000-8000-000000001402',
  'package_prepared',
  'phase12-demo-checksum',
  NULL,
  '{"profileCode":"k2"}'::jsonb,
  TIMESTAMPTZ '2026-05-20T09:05:00Z'
)
ON CONFLICT (submission_event_id) DO NOTHING;

INSERT INTO tax_declaration_packages (
  tax_declaration_package_id,
  annual_report_version_id,
  company_id,
  package_code,
  output_checksum,
  payload_json
)
VALUES (
  '00000000-0000-4000-8000-000000001405',
  '00000000-0000-4000-8000-000000001402',
  '00000000-0000-4000-8000-000000001201',
  'income_tax_support',
  'phase12-demo-tax',
  '{"derivedFrom":["phase12-demo-income","phase12-demo-balance"]}'::jsonb
)
ON CONFLICT (tax_declaration_package_id) DO NOTHING;
