# @swedish-erp/db

Database foundation with migration framework, seed files and baseline governance tables.

## Commitments

- One migration stream in `migrations/`.
- One seed stream in `seeds/`.
- Monotonic timestamped SQL files.
- `schema_migrations` table for applied tracking.
- Core audit/idempotency/outbox tables available before domain rollout.
- Placeholder domain tables exist for every table family listed i `docs/MASTER_BUILD_PLAN.md`.
- Phase 1 org/auth/onboarding tables live in the same monotonic migration stream.
- Phase 3.1 ledger hardening, DSAM chart seed and demo journals live in the same monotonic stream.
- Phase 3.2 ledger dimension catalogs, period-lock metadata and correction links live in the same monotonic stream.
- Phase 3.3 reporting definitions, report snapshots and reconciliation sign-off objects live in the same monotonic stream.
- Phase 4.1 adds VAT masterdata, dated rule packs, traceable VAT decisions and manual review queue objects in the same monotonic stream.

## Usage

- Create migration: `pnpm db:new-migration --name=<slug>`
- Verify migration naming: `pnpm verify:db`
- Dry-run migrations: `pnpm run db:migrate -- --dry-run`
- Apply migrations through Docker infra: `pnpm run db:migrate`
- Apply all baseline seeds in order: `pnpm run db:seed`
- Apply baseline and demo seeds in order: `pnpm run seed:demo`
