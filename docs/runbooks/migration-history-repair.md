# Migration History Repair

## Purpose

Repair and verify the canonical `schema_migrations` history before any persistence-changing phase continues.

## Canonical rule

`schema_migrations` owns exactly these columns:

- `migration_id`
- `applied_at`

No migration may write:

- `version`
- `description`
- mixed key formats for migration history

Canonical insert pattern:

```sql
INSERT INTO schema_migrations (migration_id)
VALUES ('YYYYMMDDHHMMSS_name')
ON CONFLICT (migration_id) DO NOTHING;
```

## Detection

Run:

```powershell
pnpm run verify:db
node --test tests/unit/phase1-migration-history.test.mjs
```

Both checks must stay green before new migrations are added or existing migrations are applied.

## Repair steps

1. Find every migration that writes `schema_migrations(version, description)` or `ON CONFLICT (version)`.
2. Replace the insert with the canonical `migration_id` form.
3. Remove free-form migration descriptions from `schema_migrations`.
4. Re-run `pnpm run verify:db`.
5. Re-run `node --test tests/unit/phase1-migration-history.test.mjs`.
6. Re-run the full test suite before moving to the next roadmap subphase.

## Guardrails

- `scripts/db-migrate.mjs` must fail fast on legacy `schema_migrations` formats.
- `scripts/new-migration.ps1` must keep generating canonical `migration_id` inserts.
- No persistence phase may proceed on top of mixed migration-history formats.
