INSERT INTO migration_import_batches (
  import_batch_id,
  company_id,
  source_system,
  batch_type,
  received_at,
  status,
  record_count,
  hash,
  scope_json,
  mapping_set_id,
  validation_summary_json,
  object_refs_json,
  imported_at,
  reconciled_at,
  accepted_at,
  updated_at
)
VALUES (
  '14000000-0000-4000-8000-000000000202',
  '00000000-0000-4000-8000-000000000001',
  'legacy_erp',
  'chart_of_accounts',
  NOW(),
  'accepted',
  42,
  'seed-phase14-import-hash',
  '{"companyId":"00000000-0000-4000-8000-000000000001"}'::jsonb,
  '14000000-0000-4000-8000-000000000201',
  '{"batchHashVerified":true,"mappingApproved":true}'::jsonb,
  '[{"sourceObjectId":"1000","targetObjectId":"1000","objectType":"ledger_account","state":"accepted"}]'::jsonb,
  NOW(),
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (import_batch_id) DO NOTHING;

INSERT INTO migration_diff_reports (
  diff_report_id,
  company_id,
  comparison_scope,
  source_snapshot_ref_json,
  target_snapshot_ref_json,
  difference_summary_json,
  materiality_assessment,
  status,
  difference_items_json,
  generated_by_user_id,
  generated_at,
  updated_at
)
VALUES (
  '14000000-0000-4000-8000-000000000203',
  '00000000-0000-4000-8000-000000000001',
  'parallel_run_finance',
  '{"system":"legacy_erp","period":"2026-03"}'::jsonb,
  '{"system":"swedish_erp","period":"2026-03"}'::jsonb,
  '{"totalCount":1,"timing":1}'::jsonb,
  'non_material',
  'accepted',
  '[{"itemId":"demo-item-1","objectType":"trial_balance","sourceObjectId":"tb-2026-03","targetObjectId":"tb-2026-03","differenceClass":"timing","decision":"accepted"}]'::jsonb,
  '00000000-0000-4000-8000-000000000011',
  NOW(),
  NOW()
)
ON CONFLICT (diff_report_id) DO NOTHING;

INSERT INTO migration_cutover_plans (
  cutover_plan_id,
  company_id,
  freeze_at,
  last_extract_at,
  validation_gate_status,
  rollback_point,
  signoff_chain_json,
  go_live_checklist_json,
  status,
  created_by_user_id,
  created_at,
  updated_at
)
VALUES (
  '14000000-0000-4000-8000-000000000204',
  '00000000-0000-4000-8000-000000000001',
  NOW() + INTERVAL '1 day',
  NOW(),
  'passed',
  'snapshot://phase14-demo',
  '[{"sequence":1,"userId":"00000000-0000-4000-8000-000000000011","roleCode":"migration_lead","label":"Migration lead"}]'::jsonb,
  '[{"itemCode":"support_staffed","label":"Support runbook staffed","mandatory":true,"status":"open"}]'::jsonb,
  'validation_passed',
  '00000000-0000-4000-8000-000000000011',
  NOW(),
  NOW()
)
ON CONFLICT (cutover_plan_id) DO NOTHING;
