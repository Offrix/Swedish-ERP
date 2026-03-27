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

Every SQL migration file must contain exactly one canonical insert, and the `migration_id` must match the file basename exactly.

## Detection

Run:

```powershell
pnpm run db:repair-migration-history
pnpm run verify:db
node --test tests/unit/phase1-migration-history.test.mjs
node --test tests/unit/phase1-migration-history-repair.test.mjs
```

Both checks must stay green before new migrations are added or existing migrations are applied.

## Repair steps

1. Run `pnpm run db:repair-migration-history` without flags and inspect the generated repair plan.
2. If the output says `status: canonical`, stop there and continue with verification.
3. If the output says `status: repair_required`, re-run with `pnpm run db:repair-migration-history -- --apply`.
4. The repair script renames the old table to a timestamped backup, recreates canonical `schema_migrations`, and rehydrates `migration_id` values from canonical `migration_id` or legacy `version`.
5. Re-run `pnpm run verify:db`.
6. Re-run:

```powershell
node --test tests/unit/phase1-migration-history.test.mjs
node --test tests/unit/phase1-migration-history-repair.test.mjs
```

7. Re-run the full test suite before moving to the next roadmap subphase.

## Guardrails

- `scripts/db-migrate.mjs` must fail fast on legacy `schema_migrations` formats.
- `scripts/repair-migration-history.mjs` is the only supported automated repair path.
- `scripts/new-migration.ps1` must keep generating canonical `migration_id` inserts.
- No persistence phase may proceed on top of mixed migration-history formats.
