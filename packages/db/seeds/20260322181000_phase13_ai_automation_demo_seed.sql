INSERT INTO automation_decisions (
  decision_id,
  company_id,
  decision_type,
  state,
  actor_id,
  confidence,
  effective_date,
  rule_pack_id,
  inputs_hash,
  outputs_json,
  explanation_json,
  warnings_json,
  needs_manual_review,
  generated_at
)
VALUES (
  '13000000-0000-4000-8000-000000000202',
  '00000000-0000-4000-8000-000000000001',
  'posting_suggestion',
  'proposed',
  'demo-phase13-3',
  0.8300,
  DATE '2026-03-22',
  '13000000-0000-4000-8000-000000000201',
  'seed-automation-input-hash',
  '{"suggestedLines":[{"accountNumber":"5410","debitAmount":1000},{"accountNumber":"2440","creditAmount":1000}],"safeToPost":false}'::jsonb,
  '["Seed automation decision for supplier invoice."]'::jsonb,
  '["manual_review_required"]'::jsonb,
  TRUE,
  NOW()
)
ON CONFLICT (decision_id) DO NOTHING;
