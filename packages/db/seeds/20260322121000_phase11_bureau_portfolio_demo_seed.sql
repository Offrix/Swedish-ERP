INSERT INTO companies (
  company_id,
  legal_name,
  org_number,
  status,
  settings_json
)
VALUES (
  '00000000-0000-4000-8000-000000001201',
  'Byra Demo Client AB',
  '559900-1201',
  'active',
  '{
    "bureauDelivery": {
      "closeLeadBusinessDays": 3,
      "reportingLeadBusinessDays": 2,
      "submissionLeadBusinessDays": 2,
      "generalLeadBusinessDays": 1,
      "approvalLeadBusinessDays": 2,
      "reminderProfile": "standard"
    }
  }'::jsonb
)
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO accounting_periods (
  accounting_period_id,
  company_id,
  starts_on,
  ends_on,
  status
)
VALUES (
  '00000000-0000-4000-8000-000000001202',
  '00000000-0000-4000-8000-000000001201',
  DATE '2026-01-01',
  DATE '2026-12-31',
  'open'
)
ON CONFLICT (accounting_period_id) DO NOTHING;

INSERT INTO bureau_portfolio_memberships (
  portfolio_id,
  bureau_org_id,
  client_company_id,
  responsible_consultant_company_user_id,
  status_profile,
  criticality,
  active_from
)
VALUES (
  '00000000-0000-4000-8000-000000001203',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000001201',
  '00000000-0000-4000-8000-000000000021',
  'standard',
  'high',
  DATE '2026-01-01'
)
ON CONFLICT (portfolio_id) DO NOTHING;

INSERT INTO bureau_client_requests (
  request_id,
  bureau_org_id,
  portfolio_id,
  client_company_id,
  accounting_period_id,
  source_object_type,
  source_object_id,
  request_type,
  requested_from_contact_id,
  requested_from_contact_json,
  owner_consultant_company_user_id,
  deadline_at,
  deadline_basis_json,
  reminder_profile,
  blocker_scope,
  requested_payload_json,
  response_access_code,
  status
)
VALUES (
  '00000000-0000-4000-8000-000000001204',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000001203',
  '00000000-0000-4000-8000-000000001201',
  '00000000-0000-4000-8000-000000001202',
  'report_snapshot',
  'phase11-bureau-demo-snapshot',
  'document_request',
  'finance@bureau-demo-client.test',
  '{"contactId":"finance@bureau-demo-client.test","displayName":"Finance Contact","email":"finance@bureau-demo-client.test"}'::jsonb,
  '00000000-0000-4000-8000-000000000021',
  TIMESTAMPTZ '2026-04-06T09:00:00Z',
  '{"basisType":"submissionLeadBusinessDays","basisValue":"2026-04-08","bufferBusinessDays":2}'::jsonb,
  'standard',
  'submission',
  '{"documentCategories":["bank_statement","supplier_invoice"]}'::jsonb,
  'bureau-demo-request-access',
  'sent'
)
ON CONFLICT (request_id) DO NOTHING;

INSERT INTO bureau_client_request_responses (
  response_id,
  request_id,
  response_type,
  responded_by_contact_id,
  comment,
  attachments_json,
  responded_at
)
VALUES (
  '00000000-0000-4000-8000-000000001205',
  '00000000-0000-4000-8000-000000001204',
  'documents_delivered',
  'finance@bureau-demo-client.test',
  'Bank statement attached.',
  '[{"attachmentId":"00000000-0000-4000-8000-000000001215","name":"Bank statement.pdf","documentId":"phase11-demo-bank-statement"}]'::jsonb,
  TIMESTAMPTZ '2026-04-05T10:15:00Z'
)
ON CONFLICT (response_id) DO NOTHING;

INSERT INTO bureau_approval_packages (
  approval_package_id,
  bureau_org_id,
  portfolio_id,
  client_company_id,
  accounting_period_id,
  approval_type,
  package_version,
  snapshot_type,
  report_snapshot_id,
  snapshot_hash,
  approval_deadline_at,
  deadline_basis_json,
  named_approver_contact_id,
  named_approver_contact_json,
  requires_named_approver,
  attachments_json,
  response_access_code,
  status
)
VALUES (
  '00000000-0000-4000-8000-000000001206',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000001203',
  '00000000-0000-4000-8000-000000001201',
  '00000000-0000-4000-8000-000000001202',
  'period_close',
  1,
  'report_snapshot',
  NULL,
  'phase11-demo-approval-snapshot-hash',
  TIMESTAMPTZ '2026-04-15T09:00:00Z',
  '{"basisType":"approvalLeadBusinessDays","basisValue":"2026-04-17","bufferBusinessDays":2}'::jsonb,
  'ceo@bureau-demo-client.test',
  '{"contactId":"ceo@bureau-demo-client.test","displayName":"CEO Demo","email":"ceo@bureau-demo-client.test"}'::jsonb,
  TRUE,
  '[]'::jsonb,
  'bureau-demo-approval-access',
  'approved'
)
ON CONFLICT (approval_package_id) DO NOTHING;

INSERT INTO bureau_approval_responses (
  approval_response_id,
  approval_package_id,
  response_type,
  responded_by_contact_id,
  delegated_from_contact_id,
  comment,
  attachments_json,
  responded_at
)
VALUES (
  '00000000-0000-4000-8000-000000001207',
  '00000000-0000-4000-8000-000000001206',
  'approved',
  'ceo@bureau-demo-client.test',
  NULL,
  'Approved after review.',
  '[]'::jsonb,
  TIMESTAMPTZ '2026-04-12T08:30:00Z'
)
ON CONFLICT (approval_response_id) DO NOTHING;

INSERT INTO core_work_items (
  work_item_id,
  bureau_org_id,
  portfolio_id,
  client_company_id,
  source_type,
  source_id,
  owner_company_user_id,
  deadline_at,
  blocker_scope,
  status,
  status_history_json
)
VALUES
(
  '00000000-0000-4000-8000-000000001208',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000001203',
  '00000000-0000-4000-8000-000000001201',
  'bureau_client_request',
  '00000000-0000-4000-8000-000000001204',
  '00000000-0000-4000-8000-000000000021',
  TIMESTAMPTZ '2026-04-06T09:00:00Z',
  'submission',
  'resolved',
  '[{"fromStatus":null,"toStatus":"waiting_external","actorId":"00000000-0000-4000-8000-000000000011","reasonCode":"request_sent","changedAt":"2026-04-01T08:00:00Z"},{"fromStatus":"waiting_external","toStatus":"resolved","actorId":"client","reasonCode":"client_response_received","changedAt":"2026-04-05T10:15:00Z"}]'::jsonb
),
(
  '00000000-0000-4000-8000-000000001209',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000001203',
  '00000000-0000-4000-8000-000000001201',
  'bureau_approval_package',
  '00000000-0000-4000-8000-000000001206',
  '00000000-0000-4000-8000-000000000021',
  TIMESTAMPTZ '2026-04-15T09:00:00Z',
  'reporting',
  'closed',
  '[{"fromStatus":null,"toStatus":"waiting_external","actorId":"00000000-0000-4000-8000-000000000011","reasonCode":"approval_sent","changedAt":"2026-04-10T08:00:00Z"},{"fromStatus":"waiting_external","toStatus":"closed","actorId":"client","reasonCode":"approval_granted","changedAt":"2026-04-12T08:30:00Z"}]'::jsonb
)
ON CONFLICT (work_item_id) DO NOTHING;

INSERT INTO core_comments (
  comment_id,
  bureau_org_id,
  portfolio_id,
  client_company_id,
  object_type,
  object_id,
  visibility,
  author_company_user_id,
  body,
  mention_company_user_ids_json,
  metadata_json
)
VALUES (
  '00000000-0000-4000-8000-000000001210',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000001203',
  '00000000-0000-4000-8000-000000001201',
  'bureau_client_request',
  '00000000-0000-4000-8000-000000001204',
  'internal',
  '00000000-0000-4000-8000-000000000021',
  'Klienten har svarat, underlaget ser komplett ut.',
  '["00000000-0000-4000-8000-000000000021"]'::jsonb,
  '{"createAssignment":true}'::jsonb
)
ON CONFLICT (comment_id) DO NOTHING;

INSERT INTO core_mass_action_runs (
  mass_action_id,
  bureau_org_id,
  action_type,
  selected_client_company_ids_json,
  initiated_by_company_user_id
)
VALUES (
  '00000000-0000-4000-8000-000000001211',
  '00000000-0000-4000-8000-000000000001',
  'send_reminder',
  '["00000000-0000-4000-8000-000000001201"]'::jsonb,
  '00000000-0000-4000-8000-000000000021'
)
ON CONFLICT (mass_action_id) DO NOTHING;

INSERT INTO core_mass_action_results (
  mass_action_result_id,
  mass_action_id,
  client_company_id,
  status,
  message,
  payload_json
)
VALUES (
  '00000000-0000-4000-8000-000000001212',
  '00000000-0000-4000-8000-000000001211',
  '00000000-0000-4000-8000-000000001201',
  'success',
  'Reminder dispatched to active client request.',
  '{"reminderCount":1}'::jsonb
)
ON CONFLICT (mass_action_result_id) DO NOTHING;

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
