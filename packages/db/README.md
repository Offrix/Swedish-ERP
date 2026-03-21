# @swedish-erp/db

Phase 0 database foundation with migration framework, seed files and baseline governance tables.

## Phase 0 commitments

- One migration stream in `migrations/`.
- One seed stream in `seeds/`.
- Monotonic timestamped SQL files.
- `schema_migrations` table for applied tracking.
- Core audit/idempotency/outbox tables available before domain rollout.
- Placeholder domain tables exist for every table family listed i `docs/MASTER_BUILD_PLAN.md`.

## Usage

- Create migration: `pnpm db:new-migration --name=<slug>`
- Verify migration naming: `pnpm verify:db`
- Dry-run migrations: `pnpm run db:migrate -- --dry-run`
- Apply migrations through Docker infra: `pnpm run db:migrate`
- Apply baseline seed: `pnpm run db:seed`
- Apply demo seed: `pnpm run seed:demo`
