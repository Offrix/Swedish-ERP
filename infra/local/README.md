# Local Infra Notes

- Copy `.env.example` to `.env` at repo root.
- Start infra with `pnpm infra:up`.
- Dry-run migrations with `pnpm run db:migrate -- --dry-run`.
- Apply migrations with `pnpm run db:migrate`.
- Apply baseline seed with `pnpm run db:seed`.
- Apply demo seed with `pnpm run seed:demo`.
- Verify with `pnpm verify:phase0`.
