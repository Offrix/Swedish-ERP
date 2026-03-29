UPDATE pay_run_payslips
SET render_payload_json = '{
  "reportingPeriod": "202603",
  "payDate": "2026-03-25",
  "runType": "regular",
  "totals": {
    "grossEarnings": 43500.00,
    "grossDeductions": 0.00,
    "grossAfterDeductions": 43500.00,
    "preliminaryTax": 10732.50,
    "preliminaryTaxStatus": "resolved_sink",
    "netDeductions": 0.00,
    "netPay": 32767.50,
    "employerContributionBase": 47700.00,
    "employerContributionPreviewAmount": 14987.34,
    "employerContributionPreviewStatus": "resolved_rule_pack",
    "taxDecision": {
      "outputs": {
        "taxFieldCode": "sink_tax",
        "preliminaryTax": 10732.50,
        "sinkRatePercent": 22.5
      }
    }
  },
  "warnings": [],
  "agiPreview": {
    "taxFieldCode": "sink_tax",
    "leaveSignalCount": 2,
    "reportableLeaveEntryCount": 1
  }
}'::jsonb
WHERE payslip_id = '00000000-0000-4000-8000-000000008331';

UPDATE pay_run_payslips
SET render_payload_json = '{
  "reportingPeriod": "202603",
  "payDate": "2026-03-27",
  "runType": "extra",
  "totals": {
    "grossEarnings": 5000.00,
    "grossDeductions": 0.00,
    "grossAfterDeductions": 5000.00,
    "preliminaryTax": 1125.00,
    "preliminaryTaxStatus": "resolved_sink",
    "netDeductions": 0.00,
    "netPay": 3875.00,
    "employerContributionBase": 5000.00,
    "employerContributionPreviewAmount": 1571.00,
    "employerContributionPreviewStatus": "resolved_rule_pack",
    "taxDecision": {
      "outputs": {
        "taxFieldCode": "sink_tax",
        "preliminaryTax": 1125.00,
        "sinkRatePercent": 22.5
      }
    }
  },
  "warnings": [],
  "agiPreview": {
    "taxFieldCode": "sink_tax",
    "leaveSignalCount": 2,
    "reportableLeaveEntryCount": 1
  }
}'::jsonb
WHERE payslip_id = '00000000-0000-4000-8000-000000008332';

UPDATE pay_run_payslips
SET render_payload_json = '{
  "reportingPeriod": "202603",
  "payDate": "2026-03-28",
  "runType": "correction",
  "totals": {
    "grossEarnings": 1800.00,
    "grossDeductions": 0.00,
    "grossAfterDeductions": 1800.00,
    "preliminaryTax": 405.00,
    "preliminaryTaxStatus": "resolved_sink",
    "netDeductions": 0.00,
    "netPay": 1395.00,
    "employerContributionBase": 1800.00,
    "employerContributionPreviewAmount": 565.56,
    "employerContributionPreviewStatus": "resolved_rule_pack",
    "taxDecision": {
      "outputs": {
        "taxFieldCode": "sink_tax",
        "preliminaryTax": 405.00,
        "sinkRatePercent": 22.5
      }
    }
  },
  "warnings": [],
  "retro": {
    "originalPeriod": "202602",
    "sourcePayRunId": "00000000-0000-4000-8000-000000008301"
  },
  "agiPreview": {
    "taxFieldCode": "sink_tax",
    "leaveSignalCount": 2,
    "reportableLeaveEntryCount": 1
  }
}'::jsonb
WHERE payslip_id = '00000000-0000-4000-8000-000000008333';

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
  '00000000-0000-4000-8000-000000008431',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000791',
  'sink',
  NULL,
  'full',
  'ordinary_sink',
  '2026-01-01',
  '2026-12-31',
  22.5,
  FALSE,
  NULL,
  'manual_rate',
  30.0,
  'demo'
)
ON CONFLICT (employment_id) DO UPDATE
SET
  tax_mode = EXCLUDED.tax_mode,
  contribution_class_code = EXCLUDED.contribution_class_code,
  sink_decision_type = EXCLUDED.sink_decision_type,
  sink_valid_from = EXCLUDED.sink_valid_from,
  sink_valid_to = EXCLUDED.sink_valid_to,
  sink_rate_percent = EXCLUDED.sink_rate_percent,
  sink_sea_income = EXCLUDED.sink_sea_income,
  fallback_tax_mode = EXCLUDED.fallback_tax_mode,
  fallback_tax_rate_percent = EXCLUDED.fallback_tax_rate_percent,
  updated_at = NOW();

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
  '00000000-0000-4000-8000-000000008432',
  '00000000-0000-4000-8000-000000008411',
  '00000000-0000-4000-8000-000000000001',
  '202603',
  2,
  'partially_rejected',
  '00000000-0000-4000-8000-000000008412',
  '00000000-0000-4000-8000-000000008412',
  'Added late-reported SINK employee and March correction.',
  '[
    "00000000-0000-4000-8000-000000008201",
    "00000000-0000-4000-8000-000000008301",
    "00000000-0000-4000-8000-000000008302",
    "00000000-0000-4000-8000-000000008303"
  ]'::jsonb,
  'phase8-demo-agi-source-202603-v2',
  'phase8-demo-agi-version-202603-v2',
  '{
    "employer": {
      "companyId": "00000000-0000-4000-8000-000000000001",
      "legalName": "Seed Company AB",
      "orgNumber": "556677-8899",
      "employerRegistrationValue": "employer-demo"
    },
    "reportingPeriod": "202603",
    "sourcePayRunIds": [
      "00000000-0000-4000-8000-000000008201",
      "00000000-0000-4000-8000-000000008301",
      "00000000-0000-4000-8000-000000008302",
      "00000000-0000-4000-8000-000000008303"
    ],
    "totals": {
      "employeeCount": 2,
      "cashCompensationAmount": 92000.00,
      "taxableBenefitAmount": 4200.00,
      "taxFreeAllowanceAmount": 0.00,
      "pensionPremiumAmount": 0.00,
      "preliminaryTaxAmount": 12510.00,
      "sinkTaxAmount": 12262.50
    },
    "employees": [
      {
        "agiEmployeeId": "00000000-0000-4000-8000-000000008433",
        "employeeId": "00000000-0000-4000-8000-000000000711",
        "personIdentifierType": "national_identity",
        "personIdentifier": "19800112-1238",
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
      },
      {
        "agiEmployeeId": "00000000-0000-4000-8000-000000008434",
        "employeeId": "00000000-0000-4000-8000-000000000781",
        "personIdentifierType": "national_identity",
        "personIdentifier": "19891103-4321",
        "protectedIdentity": true,
        "countryCode": "SE",
        "compensationFields": {
          "cashCompensationAmount": 50300.00,
          "taxableBenefitAmount": 4200.00,
          "taxFreeAllowanceAmount": 0.00,
          "pensionPremiumAmount": 0.00
        },
        "taxFields": {
          "preliminaryTax": null,
          "sinkTax": 12262.50
        },
        "taxFieldCount": 1,
        "sourcePayRunIds": [
          "00000000-0000-4000-8000-000000008301",
          "00000000-0000-4000-8000-000000008302",
          "00000000-0000-4000-8000-000000008303"
        ],
        "sourcePayRunLineIds": [
          "00000000-0000-4000-8000-000000008311",
          "00000000-0000-4000-8000-000000008312",
          "00000000-0000-4000-8000-000000008313",
          "00000000-0000-4000-8000-000000008314"
        ],
        "sourceEmploymentIds": ["00000000-0000-4000-8000-000000000791"],
        "mappingIssues": [],
        "absence": {
          "signalCount": 2,
          "incomplete": false,
          "unapprovedEntryCount": 0
        }
      }
    ],
    "generatedAt": "2026-03-22T08:15:00.000Z",
    "correctionReason": "Added late-reported SINK employee and March correction.",
    "previousSubmittedVersionId": "00000000-0000-4000-8000-000000008412"
  }'::jsonb,
  '{
    "mode": "test",
    "payloadVersion": "agi-json-v1",
    "payload": {
      "reportingPeriod": "202603",
      "employeeCount": 2,
      "correctionVersion": 2
    }
  }'::jsonb,
  '["00000000-0000-4000-8000-000000000781"]'::jsonb,
  '[
    "00000000-0000-4000-8000-000000000721",
    "00000000-0000-4000-8000-000000000791"
  ]'::jsonb,
  '[]'::jsonb,
  '[{"code":"agi_correction_from_previous_version","message":"Version built as correction from version 1."}]'::jsonb,
  TRUE,
  NOW(),
  NOW(),
  'demo',
  NOW(),
  'demo',
  'test',
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (agi_submission_id, version_no) DO NOTHING;

UPDATE agi_submission_versions
SET
  state = 'superseded',
  superseded_at = NOW(),
  updated_at = NOW()
WHERE agi_submission_version_id = '00000000-0000-4000-8000-000000008412';

UPDATE agi_submissions
SET
  current_version_id = '00000000-0000-4000-8000-000000008432',
  latest_submitted_version_id = '00000000-0000-4000-8000-000000008432',
  status = 'partially_rejected',
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
VALUES
  (
    '00000000-0000-4000-8000-000000008433',
    '00000000-0000-4000-8000-000000008432',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000711',
    'national_identity',
    '19800112-1238',
    FALSE,
    'phase8-demo-agi-employee-seed-202603-v2',
    '{
      "employeeId": "00000000-0000-4000-8000-000000000711",
      "taxFieldCount": 1,
      "taxFields": {
        "preliminaryTax": 12510.00,
        "sinkTax": null
      }
    }'::jsonb,
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000008434',
    '00000000-0000-4000-8000-000000008432',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000781',
    'national_identity',
    '19891103-4321',
    TRUE,
    'phase8-demo-agi-employee-sink-202603-v2',
    '{
      "employeeId": "00000000-0000-4000-8000-000000000781",
      "taxFieldCount": 1,
      "taxFields": {
        "preliminaryTax": null,
        "sinkTax": 12262.50
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
    '00000000-0000-4000-8000-000000008435',
    '00000000-0000-4000-8000-000000008433',
    '00000000-0000-4000-8000-000000008432',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000711',
    '00000000-0000-4000-8000-000000008201',
    '00000000-0000-4000-8000-000000008211',
    'MONTHLY_SALARY',
    'cash_compensation',
    40500.00,
    40500.00,
    '{"seed":"phase8_2_demo","employee":"seed"}'::jsonb,
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000008436',
    '00000000-0000-4000-8000-000000008433',
    '00000000-0000-4000-8000-000000008432',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000711',
    '00000000-0000-4000-8000-000000008201',
    '00000000-0000-4000-8000-000000008212',
    'BONUS',
    'cash_compensation',
    1200.00,
    1200.00,
    '{"seed":"phase8_2_demo","employee":"seed"}'::jsonb,
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000008437',
    '00000000-0000-4000-8000-000000008434',
    '00000000-0000-4000-8000-000000008432',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000781',
    '00000000-0000-4000-8000-000000008301',
    '00000000-0000-4000-8000-000000008311',
    'MONTHLY_SALARY',
    'cash_compensation',
    43500.00,
    43500.00,
    '{"seed":"phase8_2_demo","employee":"sink"}'::jsonb,
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000008438',
    '00000000-0000-4000-8000-000000008434',
    '00000000-0000-4000-8000-000000008432',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000781',
    '00000000-0000-4000-8000-000000008301',
    '00000000-0000-4000-8000-000000008312',
    'BENEFIT',
    'taxable_benefit',
    4200.00,
    4200.00,
    '{"seed":"phase8_2_demo","employee":"sink"}'::jsonb,
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000008439',
    '00000000-0000-4000-8000-000000008434',
    '00000000-0000-4000-8000-000000008432',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000781',
    '00000000-0000-4000-8000-000000008302',
    '00000000-0000-4000-8000-000000008313',
    'BONUS',
    'cash_compensation',
    5000.00,
    5000.00,
    '{"seed":"phase8_2_demo","employee":"sink"}'::jsonb,
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000008440',
    '00000000-0000-4000-8000-000000008434',
    '00000000-0000-4000-8000-000000008432',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000781',
    '00000000-0000-4000-8000-000000008303',
    '00000000-0000-4000-8000-000000008314',
    'CORRECTION',
    'cash_compensation',
    1800.00,
    1800.00,
    '{"seed":"phase8_2_demo","employee":"sink"}'::jsonb,
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
    '00000000-0000-4000-8000-000000008441',
    '00000000-0000-4000-8000-000000008432',
    '00000000-0000-4000-8000-000000008433',
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
    '00000000-0000-4000-8000-000000008442',
    '00000000-0000-4000-8000-000000008432',
    '00000000-0000-4000-8000-000000008433',
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
  ),
  (
    '00000000-0000-4000-8000-000000008443',
    '00000000-0000-4000-8000-000000008432',
    '00000000-0000-4000-8000-000000008434',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000781',
    '00000000-0000-4000-8000-000000000791',
    'temporary_parental_benefit',
    '202603',
    '2026-03-19',
    50.00,
    NULL,
    '{"leaveSignalId":"00000000-0000-4000-8000-000000000981"}'::jsonb,
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000008444',
    '00000000-0000-4000-8000-000000008432',
    '00000000-0000-4000-8000-000000008434',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000781',
    '00000000-0000-4000-8000-000000000791',
    'temporary_parental_benefit',
    '202603',
    '2026-03-20',
    100.00,
    NULL,
    '{"leaveSignalId":"00000000-0000-4000-8000-000000000982"}'::jsonb,
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
  '00000000-0000-4000-8000-000000008445',
  '00000000-0000-4000-8000-000000008432',
  '00000000-0000-4000-8000-000000000001',
  'demo',
  NOW(),
  'phase8-demo-signature-202603-v2'
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
  '00000000-0000-4000-8000-000000008446',
  '00000000-0000-4000-8000-000000008432',
  '00000000-0000-4000-8000-000000000001',
  'partially_rejected',
  'test:partially_rejected',
  'Correction version partially rejected in test mode for follow-up handling.',
  'demo',
  NOW(),
  '{"mode":"test","outcome":"partially_rejected"}'::jsonb
)
ON CONFLICT (agi_receipt_id) DO NOTHING;

INSERT INTO agi_errors (
  agi_error_id,
  agi_submission_version_id,
  company_id,
  agi_receipt_id,
  error_code,
  message,
  severity,
  payload_json,
  created_at
)
VALUES (
  '00000000-0000-4000-8000-000000008447',
  '00000000-0000-4000-8000-000000008432',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000008446',
  'agi_demo_follow_up_required',
  'Demo correction receipt created an action queue item for manual review.',
  'error',
  '{"employeeId":"00000000-0000-4000-8000-000000000781","reason":"demo_partial_rejection"}'::jsonb,
  NOW()
)
ON CONFLICT (agi_error_id) DO NOTHING;
