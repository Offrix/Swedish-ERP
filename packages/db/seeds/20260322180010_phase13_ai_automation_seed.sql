INSERT INTO automation_rule_packs (
  rule_pack_id,
  company_id,
  domain,
  jurisdiction,
  effective_from,
  effective_to,
  version,
  checksum,
  source_snapshot_date,
  semantic_change_summary,
  machine_readable_rules,
  human_readable_explanation,
  test_vectors,
  migration_notes,
  created_at
)
VALUES (
  '13000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000001',
  'automation',
  'SE',
  DATE '2026-01-01',
  NULL,
  '1',
  'seed-automation-rulepack-checksum',
  DATE '2026-01-01',
  'Initial automation seed pack.',
  '{"conditions":[{"field":"documentType","equals":"supplier_invoice"}],"then":{"postingTemplate":"supplier_cost"}}'::jsonb,
  '["Seed automation pack for supplier invoices."]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  NOW()
)
ON CONFLICT (rule_pack_id) DO NOTHING;
