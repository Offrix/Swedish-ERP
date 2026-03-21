# Seeds

Seed naming convention:

- `YYYYMMDDHHMMSS_<slug>.sql`

Seed files are intended for local Docker bootstrap only.

Seed execution policy:

- `pnpm run db:seed` applies every non-demo seed in timestamp order
- `pnpm run seed:demo` applies all seeds, including `_demo_` files, in timestamp order
- Phase 3.1 adds DSAM chart and voucher series baseline seed plus demo journals for ledger verification
- Phase 3.2 adds dimension catalogs, next-period correction baseline data and demo reversals/corrections for ledger verification
