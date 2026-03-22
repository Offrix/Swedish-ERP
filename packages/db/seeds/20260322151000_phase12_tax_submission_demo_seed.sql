UPDATE companies
SET settings_json = jsonb_set(
  COALESCE(settings_json, '{}'::jsonb),
  '{companyFormCode}',
  '"AB"'::jsonb,
  true
),
updated_at = NOW()
WHERE company_id = '00000000-0000-4000-8000-000000001201';

UPDATE tax_declaration_packages
SET
  annual_report_package_id = '00000000-0000-4000-8000-000000001401',
  fiscal_year = '2026',
  status = 'accepted',
  source_fingerprint = 'phase12-demo-tax-package-fingerprint',
  authority_overview_json = '{
    "companyId":"00000000-0000-4000-8000-000000001201",
    "fiscalYear":"2026",
    "vat":{"runCount":1,"totalDeclaredTaxAmount":1200},
    "agi":{"submissionCount":1,"totalCashCompensationAmount":48000,"totalPreliminaryTaxAmount":9600},
    "hus":{"caseCount":1,"claimCount":1,"decisionCount":1,"totalRequestedAmount":8000,"totalApprovedAmount":7600},
    "specialPayrollTax":{"snapshotCount":1,"totalPensionPremiumAmount":6200,"specialPayrollTaxAmount":1504.66}
  }'::jsonb,
  exports_json = '[
    {"exportCode":"ink_support_json","fileName":"INK_2026.json","payloadHash":"phase12-demo-ink"},
    {"exportCode":"ne_support_json","fileName":"NE_2026.json","payloadHash":"phase12-demo-ne"},
    {"exportCode":"sru_rows_csv","fileName":"SRU_2026.csv","payloadHash":"phase12-demo-sru"},
    {"exportCode":"vat_audit_overview_json","fileName":"VAT_2026.json","payloadHash":"phase12-demo-vat"},
    {"exportCode":"agi_audit_overview_json","fileName":"AGI_2026.json","payloadHash":"phase12-demo-agi"},
    {"exportCode":"hus_summary_json","fileName":"HUS_2026.json","payloadHash":"phase12-demo-hus"},
    {"exportCode":"special_payroll_tax_json","fileName":"SLP_2026.json","payloadHash":"phase12-demo-slp"}
  ]'::jsonb,
  created_by_actor_id = '00000000-0000-4000-8000-000000000011',
  updated_at = TIMESTAMPTZ '2026-05-21T11:00:00Z'
WHERE tax_declaration_package_id = '00000000-0000-4000-8000-000000001405';

INSERT INTO submission_envelopes (
  submission_id,
  root_submission_id,
  company_id,
  submission_type,
  period_id,
  source_object_type,
  source_object_id,
  payload_version,
  attempt_no,
  status,
  provider_key,
  recipient_id,
  idempotency_key,
  signed_state,
  signatory_role_required,
  priority,
  retry_class,
  payload_hash,
  payload_json,
  correlation_id,
  submitted_at,
  accepted_at,
  finalized_at,
  signed_at,
  signed_by_actor_id,
  created_by_actor_id,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000001406',
  '00000000-0000-4000-8000-000000001406',
  '00000000-0000-4000-8000-000000001201',
  'income_tax_submission',
  '00000000-0000-4000-8000-000000001202',
  'tax_declaration_package',
  '00000000-0000-4000-8000-000000001405',
  'phase12.2',
  1,
  'finalized',
  'skatteverket_mock',
  '5599001201',
  'phase12-demo-income-tax-idempotency',
  'signed',
  'company_admin',
  'high',
  'manual_only',
  'phase12-demo-income-tax-payload',
  '{"taxDeclarationPackageId":"00000000-0000-4000-8000-000000001405","packageCode":"annual_tax_bundle"}'::jsonb,
  'phase12-demo-correlation',
  TIMESTAMPTZ '2026-05-21T11:05:00Z',
  TIMESTAMPTZ '2026-05-21T11:07:00Z',
  TIMESTAMPTZ '2026-05-21T11:07:00Z',
  TIMESTAMPTZ '2026-05-21T11:04:00Z',
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000011',
  TIMESTAMPTZ '2026-05-21T11:03:00Z',
  TIMESTAMPTZ '2026-05-21T11:07:00Z'
)
ON CONFLICT (submission_id) DO NOTHING;

INSERT INTO submission_receipts (
  receipt_id,
  submission_id,
  sequence_no,
  receipt_type,
  provider_status,
  normalized_status,
  raw_reference,
  message_text,
  is_final,
  received_by_actor_id,
  received_at
)
VALUES
(
  '00000000-0000-4000-8000-000000001407',
  '00000000-0000-4000-8000-000000001406',
  1,
  'technical_ack',
  'technical_ack',
  'technical_ack',
  'phase12-demo-provider-ref',
  'Technical acceptance received.',
  FALSE,
  '00000000-0000-4000-8000-000000000011',
  TIMESTAMPTZ '2026-05-21T11:06:00Z'
),
(
  '00000000-0000-4000-8000-000000001408',
  '00000000-0000-4000-8000-000000001406',
  2,
  'final_ack',
  'accepted',
  'final_ack',
  'phase12-demo-provider-ref',
  'Submission accepted.',
  TRUE,
  '00000000-0000-4000-8000-000000000011',
  TIMESTAMPTZ '2026-05-21T11:07:00Z'
)
ON CONFLICT (receipt_id) DO NOTHING;

INSERT INTO submission_action_queue (
  queue_item_id,
  submission_id,
  company_id,
  action_type,
  priority,
  owner_queue,
  owner_user_id,
  status,
  retry_after,
  required_input_json,
  resolution_code,
  root_cause_code,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000001409',
  '00000000-0000-4000-8000-000000001406',
  '00000000-0000-4000-8000-000000001201',
  'retry',
  'normal',
  'tax_operator',
  NULL,
  'auto_resolved',
  TIMESTAMPTZ '2026-05-21T11:20:00Z',
  '[]'::jsonb,
  'receipt_final_ack',
  'technical_nack',
  TIMESTAMPTZ '2026-05-21T11:06:30Z',
  TIMESTAMPTZ '2026-05-21T11:07:00Z'
)
ON CONFLICT (queue_item_id) DO NOTHING;
