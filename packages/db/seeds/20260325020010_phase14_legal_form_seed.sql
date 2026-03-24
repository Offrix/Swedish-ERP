BEGIN;

INSERT INTO legal_form_profiles (
  legal_form_profile_id,
  company_id,
  legal_form_code,
  effective_from,
  effective_to,
  filing_profile_code,
  signatory_class_code,
  declaration_profile_code,
  status,
  rulepack_code,
  rulepack_version,
  created_by_actor_id
)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  '00000000-0000-4000-8000-000000000001',
  'AKTIEBOLAG',
  DATE '2026-01-01',
  NULL,
  'AB_ANNUAL_REPORT_AND_INK2',
  'BOARD_OR_CEO',
  'INK2',
  'active',
  'RP-LEGAL-FORM-SE',
  'se-legal-form-2026.1',
  'seed'
)
ON CONFLICT (legal_form_profile_id) DO NOTHING;

INSERT INTO reporting_obligation_profiles (
  reporting_obligation_profile_id,
  company_id,
  legal_form_profile_id,
  legal_form_code,
  fiscal_year_key,
  fiscal_year_id,
  accounting_period_id,
  requires_annual_report,
  requires_year_end_accounts,
  allows_simplified_year_end,
  requires_bolagsverket_filing,
  requires_tax_declaration_package,
  declaration_profile_code,
  signatory_class_code,
  filing_profile_code,
  package_family_code,
  status,
  rulepack_code,
  rulepack_version,
  created_by_actor_id
)
VALUES (
  '22222222-2222-4222-8222-222222222222',
  '00000000-0000-4000-8000-000000000001',
  '11111111-1111-4111-8111-111111111111',
  'AKTIEBOLAG',
  '2026',
  NULL,
  NULL,
  TRUE,
  FALSE,
  FALSE,
  TRUE,
  TRUE,
  'INK2',
  'BOARD_OR_CEO',
  'AB_ANNUAL_REPORT_AND_INK2',
  'annual_report_ab',
  'approved',
  'RP-ANNUAL-FILING-SE',
  'se-legal-form-2026.1',
  'seed'
)
ON CONFLICT (reporting_obligation_profile_id) DO NOTHING;

COMMIT;
