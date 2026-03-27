ALTER TABLE restore_drills
  ADD COLUMN IF NOT EXISTS drill_type TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS restore_plan_id UUID,
  ADD COLUMN IF NOT EXISTS verification_summary TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE restore_drills
SET drill_type = CASE
  WHEN drill_type IS NOT NULL THEN drill_type
  WHEN drill_code ILIKE '%projection%' OR drill_code ILIKE '%reindex%' THEN 'projection_rebuild'
  WHEN drill_code ILIKE '%worker%' OR drill_code ILIKE '%queue%' THEN 'worker_restart'
  ELSE 'database_restore'
END;

UPDATE restore_drills
SET status = CASE
  WHEN status = 'planned' THEN 'scheduled'
  ELSE status
END;

UPDATE restore_drills
SET started_at = COALESCE(started_at, recorded_at)
WHERE status IN ('running', 'passed', 'failed');

UPDATE restore_drills
SET completed_at = COALESCE(completed_at, recorded_at)
WHERE status IN ('passed', 'failed');

UPDATE restore_drills
SET updated_at = COALESCE(updated_at, completed_at, started_at, recorded_at);

ALTER TABLE restore_drills
  ALTER COLUMN drill_type SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_restore_drills_company_type_recorded_at
  ON restore_drills (company_id, drill_type, recorded_at DESC);

ALTER TABLE chaos_scenarios
  ADD COLUMN IF NOT EXISTS restore_drill_id UUID;

CREATE INDEX IF NOT EXISTS idx_chaos_scenarios_restore_drill
  ON chaos_scenarios (restore_drill_id);

INSERT INTO schema_migrations (migration_id)
VALUES ('20260327091500_phase3_restore_drill_lifecycle')
ON CONFLICT (migration_id) DO NOTHING;
