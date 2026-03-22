INSERT INTO rule_packs (
  rule_pack_id,
  domain,
  jurisdiction,
  effective_from,
  effective_to,
  version,
  checksum,
  source_snapshot_date,
  semantic_change_summary,
  machine_readable_rules_json,
  human_readable_explanation_json,
  test_vectors_json,
  migration_notes_json
)
VALUES (
  'payroll-tax-se-2026.1',
  'payroll',
  'SE',
  '2026-01-01',
  NULL,
  '2026.1',
  'phase8-payroll-tax-se-2026-1',
  '2026-03-22',
  'Phase 8.2 payroll tax pack with manual-rate and SINK support.',
  '{
    "taxModes": ["manual_rate", "sink"],
    "manualRate": {
      "requiresTaxRatePercent": true,
      "taxFieldCode": "preliminary_tax"
    },
    "sink": {
      "standardRatePercent": 22.5,
      "seaIncomeRatePercent": 15.0,
      "taxFieldCode": "sink_tax"
    }
  }'::jsonb,
  '[
    "Phase 8.2 resolves manual preliminary tax from statutory profile rates.",
    "SINK uses 22.5 percent by default and 15.0 percent for sea income."
  ]'::jsonb,
  '[
    { "vectorId": "payroll-tax-manual-rate-30" },
    { "vectorId": "payroll-tax-sink-standard-22-5" },
    { "vectorId": "payroll-tax-sink-sea-income-15-0" }
  ]'::jsonb,
  '[
    "Phase 8.2 adds AGI payload materialization and correction versions."
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

UPDATE pay_item_definitions
SET agi_mapping_code = CASE
  WHEN pay_item_code = 'BENEFIT' THEN 'taxable_benefit'
  WHEN pay_item_code = 'PENSION_PREMIUM' THEN 'pension_premium'
  WHEN pay_item_code IN ('TAX_FREE_TRAVEL_ALLOWANCE', 'TAX_FREE_MILEAGE') THEN 'tax_free_allowance'
  WHEN pay_item_code IN ('NET_DEDUCTION', 'GARNISHMENT', 'ADVANCE', 'RECLAIM') THEN 'not_reported'
  ELSE 'cash_compensation'
END
WHERE company_id = '00000000-0000-4000-8000-000000000001';

UPDATE pay_run_lines
SET agi_mapping_code = CASE
  WHEN pay_item_code = 'BENEFIT' THEN 'taxable_benefit'
  WHEN pay_item_code = 'PENSION_PREMIUM' THEN 'pension_premium'
  WHEN pay_item_code IN ('TAX_FREE_TRAVEL_ALLOWANCE', 'TAX_FREE_MILEAGE') THEN 'tax_free_allowance'
  WHEN pay_item_code IN ('NET_DEDUCTION', 'GARNISHMENT', 'ADVANCE', 'RECLAIM') THEN 'not_reported'
  ELSE 'cash_compensation'
END
WHERE company_id = '00000000-0000-4000-8000-000000000001';

UPDATE pay_run_payslips
SET render_payload_json = '{
  "reportingPeriod": "202603",
  "payDate": "2026-03-25",
  "runType": "regular",
  "totals": {
    "grossEarnings": 41700.00,
    "grossDeductions": 0.00,
    "grossAfterDeductions": 41700.00,
    "preliminaryTax": 12510.00,
    "preliminaryTaxStatus": "resolved_manual_rate",
    "netDeductions": 0.00,
    "netPay": 29190.00,
    "employerContributionBase": 41700.00,
    "employerContributionPreviewAmount": 13101.14,
    "employerContributionPreviewStatus": "resolved_rule_pack",
    "taxDecision": {
      "outputs": {
        "taxFieldCode": "preliminary_tax",
        "preliminaryTax": 12510.00,
        "taxRatePercent": 30.0
      }
    },
    "employerContributionDecision": {
      "outputs": {
        "contributionClassCode": "full",
        "ratePercent": 31.42,
        "employerContributionPreviewAmount": 13101.14
      }
    }
  },
  "warnings": [],
  "agiPreview": {
    "taxFieldCode": "preliminary_tax",
    "leaveSignalCount": 2,
    "reportableLeaveEntryCount": 1
  }
}'::jsonb
WHERE payslip_id = '00000000-0000-4000-8000-000000008231';

INSERT INTO employment_statutory_profiles (
  employment_statutory_profile_id,
  company_id,
  employment_id,
  tax_mode,
  tax_rate_percent,
  contribution_class_code,
  sink_decision_type,
  sink_valid_from,
  sink_valid_to,
  sink_rate_percent,
  sink_sea_income,
  sink_decision_document_id,
  fallback_tax_mode,
  fallback_tax_rate_percent,
  created_by_actor_id
)
VALUES (
  '00000000-0000-4000-8000-000000008401',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000721',
  'manual_rate',
  30.0,
  'full',
  NULL,
  NULL,
  NULL,
  NULL,
  FALSE,
  NULL,
  NULL,
  NULL,
  'seed'
)
ON CONFLICT (employment_id) DO UPDATE
SET
  tax_mode = EXCLUDED.tax_mode,
  tax_rate_percent = EXCLUDED.tax_rate_percent,
  contribution_class_code = EXCLUDED.contribution_class_code,
  sink_decision_type = EXCLUDED.sink_decision_type,
  sink_valid_from = EXCLUDED.sink_valid_from,
  sink_valid_to = EXCLUDED.sink_valid_to,
  sink_rate_percent = EXCLUDED.sink_rate_percent,
  sink_sea_income = EXCLUDED.sink_sea_income,
  sink_decision_document_id = EXCLUDED.sink_decision_document_id,
  fallback_tax_mode = EXCLUDED.fallback_tax_mode,
  fallback_tax_rate_percent = EXCLUDED.fallback_tax_rate_percent,
  updated_at = NOW();

INSERT INTO agi_periods (
  agi_period_id,
  company_id,
  reporting_period,
  starts_on,
  ends_on,
  created_at
)
VALUES (
  '00000000-0000-4000-8000-000000008410',
  '00000000-0000-4000-8000-000000000001',
  '202603',
  '2026-03-01',
  '2026-03-31',
  NOW()
)
ON CONFLICT (company_id, reporting_period) DO NOTHING;

INSERT INTO agi_submissions (
  agi_submission_id,
  company_id,
  agi_period_id,
  reporting_period,
  current_version_id,
  latest_submitted_version_id,
  status,
  created_by_actor_id,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000008411',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000008410',
  '202603',
  NULL,
  NULL,
  'accepted',
  'seed',
  NOW(),
  NOW()
)
ON CONFLICT (company_id, agi_period_id) DO NOTHING;

INSERT INTO agi_submission_versions (
  agi_submission_version_id,
  agi_submission_id,
  company_id,
  reporting_period,
  version_no,
  state,
  previous_version_id,
  previous_submitted_version_id,
  correction_reason,
  source_pay_run_ids_json,
  source_snapshot_hash,
  payload_hash,
  payload_json,
  adapter_payload_json,
  changed_employee_ids_json,
  lock_employment_ids_json,
  validation_errors_json,
  validation_warnings_json,
  totals_match,
  validated_at,
  ready_for_sign_at,
  ready_for_sign_by_actor_id,
  submitted_at,
  submitted_by_actor_id,
  submission_mode,
  superseded_at,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000008412',
  '00000000-0000-4000-8000-000000008411',
  '00000000-0000-4000-8000-000000000001',
  '202603',
  1,
  'accepted',
  NULL,
  NULL,
  NULL,
  '["00000000-0000-4000-8000-000000008201"]'::jsonb,
  'phase8-seed-agi-source-202603',
  'phase8-seed-agi-version-202603-v1',
  '{
    "employer": {
      "companyId": "00000000-0000-4000-8000-000000000001",
      "legalName": "Seed Company AB",
      "orgNumber": "556677-8899",
      "employerRegistrationValue": "employer-demo"
    },
    "reportingPeriod": "202603",
    "sourcePayRunIds": ["00000000-0000-4000-8000-000000008201"],
    "totals": {
      "employeeCount": 1,
      "cashCompensationAmount": 41700.00,
      "taxableBenefitAmount": 0.00,
      "taxFreeAllowanceAmount": 0.00,
      "pensionPremiumAmount": 0.00,
      "preliminaryTaxAmount": 12510.00,
      "sinkTaxAmount": 0.00
    },
    "employees": [
      {
        "agiEmployeeId": "00000000-0000-4000-8000-000000008413",
        "employeeId": "00000000-0000-4000-8000-000000000711",
        "personIdentifierType": "national_identity",
        "personIdentifier": "19800112-1234",
        "protectedIdentity": false,
        "countryCode": "SE",
        "compensationFields": {
          "cashCompensationAmount": 41700.00,
          "taxableBenefitAmount": 0.00,
          "taxFreeAllowanceAmount": 0.00,
          "pensionPremiumAmount": 0.00
        },
        "taxFields": {
          "preliminaryTax": 12510.00,
          "sinkTax": null
        },
        "taxFieldCount": 1,
        "sourcePayRunIds": ["00000000-0000-4000-8000-000000008201"],
        "sourcePayRunLineIds": [
          "00000000-0000-4000-8000-000000008211",
          "00000000-0000-4000-8000-000000008212"
        ],
        "sourceEmploymentIds": ["00000000-0000-4000-8000-000000000721"],
        "mappingIssues": [],
        "absence": {
          "signalCount": 2,
          "incomplete": false,
          "unapprovedEntryCount": 0
        }
      }
    ],
    "generatedAt": "2026-03-22T08:00:00.000Z",
    "correctionReason": null,
    "previousSubmittedVersionId": null
  }'::jsonb,
  '{
    "mode": "test",
    "payloadVersion": "agi-json-v1",
    "payload": {
      "reportingPeriod": "202603",
      "employeeCount": 1
    }
  }'::jsonb,
  '[]'::jsonb,
  '["00000000-0000-4000-8000-000000000721"]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  TRUE,
  NOW(),
  NOW(),
  'seed',
  NOW(),
  'seed',
  'test',
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (agi_submission_id, version_no) DO NOTHING;

UPDATE agi_submissions
SET
  current_version_id = '00000000-0000-4000-8000-000000008412',
  latest_submitted_version_id = '00000000-0000-4000-8000-000000008412',
  status = 'accepted',
  updated_at = NOW()
WHERE agi_submission_id = '00000000-0000-4000-8000-000000008411';

INSERT INTO agi_employees (
  agi_employee_id,
  agi_submission_version_id,
  company_id,
  employee_id,
  person_identifier_type,
  person_identifier,
  protected_identity,
  payload_hash,
  payload_json,
  created_at
)
VALUES (
  '00000000-0000-4000-8000-000000008413',
  '00000000-0000-4000-8000-000000008412',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000711',
  'national_identity',
  '19800112-1234',
  FALSE,
  'phase8-seed-agi-employee-202603-v1',
  '{
    "agiEmployeeId": "00000000-0000-4000-8000-000000008413",
    "employeeId": "00000000-0000-4000-8000-000000000711",
    "personIdentifierType": "national_identity",
    "personIdentifier": "19800112-1234",
    "protectedIdentity": false,
    "countryCode": "SE",
    "compensationFields": {
      "cashCompensationAmount": 41700.00,
      "taxableBenefitAmount": 0.00,
      "taxFreeAllowanceAmount": 0.00,
      "pensionPremiumAmount": 0.00
    },
    "taxFields": {
      "preliminaryTax": 12510.00,
      "sinkTax": null
    },
    "taxFieldCount": 1,
    "sourcePayRunIds": ["00000000-0000-4000-8000-000000008201"],
    "sourcePayRunLineIds": [
      "00000000-0000-4000-8000-000000008211",
      "00000000-0000-4000-8000-000000008212"
    ],
    "sourceEmploymentIds": ["00000000-0000-4000-8000-000000000721"],
    "mappingIssues": [],
    "absence": {
      "signalCount": 2,
      "incomplete": false,
      "unapprovedEntryCount": 0
    }
  }'::jsonb,
  NOW()
)
ON CONFLICT (agi_employee_id) DO NOTHING;

INSERT INTO agi_employee_lines (
  agi_employee_line_id,
  agi_employee_id,
  agi_submission_version_id,
  company_id,
  employee_id,
  source_pay_run_id,
  source_pay_run_line_id,
  pay_item_code,
  agi_mapping_code,
  amount,
  directional_amount,
  payload_json,
  created_at
)
VALUES
  (
    '00000000-0000-4000-8000-000000008414',
    '00000000-0000-4000-8000-000000008413',
    '00000000-0000-4000-8000-000000008412',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000711',
    '00000000-0000-4000-8000-000000008201',
    '00000000-0000-4000-8000-000000008211',
    'MONTHLY_SALARY',
    'cash_compensation',
    40500.00,
    40500.00,
    '{"seed":"phase8_2","source":"pay_run_line"}'::jsonb,
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000008415',
    '00000000-0000-4000-8000-000000008413',
    '00000000-0000-4000-8000-000000008412',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000711',
    '00000000-0000-4000-8000-000000008201',
    '00000000-0000-4000-8000-000000008212',
    'BONUS',
    'cash_compensation',
    1200.00,
    1200.00,
    '{"seed":"phase8_2","source":"pay_run_line"}'::jsonb,
    NOW()
  )
ON CONFLICT (agi_employee_line_id) DO NOTHING;

INSERT INTO agi_absence_payloads (
  agi_absence_payload_id,
  agi_submission_version_id,
  agi_employee_id,
  company_id,
  employee_id,
  employment_id,
  signal_type,
  reporting_period,
  work_date,
  extent_percent,
  extent_hours,
  payload_json,
  created_at
)
VALUES
  (
    '00000000-0000-4000-8000-000000008416',
    '00000000-0000-4000-8000-000000008412',
    '00000000-0000-4000-8000-000000008413',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000711',
    '00000000-0000-4000-8000-000000000721',
    'parental_benefit',
    '202603',
    '2026-03-03',
    100.00,
    NULL,
    '{"leaveSignalId":"00000000-0000-4000-8000-000000000941"}'::jsonb,
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000008417',
    '00000000-0000-4000-8000-000000008412',
    '00000000-0000-4000-8000-000000008413',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000711',
    '00000000-0000-4000-8000-000000000721',
    'parental_benefit',
    '202603',
    '2026-03-04',
    100.00,
    NULL,
    '{"leaveSignalId":"00000000-0000-4000-8000-000000000942"}'::jsonb,
    NOW()
  )
ON CONFLICT (agi_absence_payload_id) DO NOTHING;

INSERT INTO agi_signatures (
  agi_signature_id,
  agi_submission_version_id,
  company_id,
  signed_by_actor_id,
  signed_at,
  signature_ref
)
VALUES (
  '00000000-0000-4000-8000-000000008418',
  '00000000-0000-4000-8000-000000008412',
  '00000000-0000-4000-8000-000000000001',
  'seed',
  NOW(),
  'phase8-seed-signature-202603-v1'
)
ON CONFLICT (agi_signature_id) DO NOTHING;

INSERT INTO agi_receipts (
  agi_receipt_id,
  agi_submission_version_id,
  company_id,
  receipt_status,
  receipt_code,
  message,
  received_by_actor_id,
  received_at,
  payload_json
)
VALUES (
  '00000000-0000-4000-8000-000000008419',
  '00000000-0000-4000-8000-000000008412',
  '00000000-0000-4000-8000-000000000001',
  'accepted',
  'test:accepted',
  'Seed AGI receipt accepted in test mode.',
  'seed',
  NOW(),
  '{"mode":"test","outcome":"accepted"}'::jsonb
)
ON CONFLICT (agi_receipt_id) DO NOTHING;
