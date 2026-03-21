# Scripts

Helper scripts for local setup, structure verification and phased rollout checks.

- `build.mjs`: syntax-checks runnable JavaScript files.
- `db-migrate.mjs`: applies SQL migrations through Docker or lists them in dry-run mode.
- `db-seed.mjs`: applies baseline or demo seed SQL through Docker.
- `dev.mjs`: starts `api`, `desktop-web`, `field-mobile` and `worker`.
- `doctor.mjs`: verifies local tool presence and locked runtime versions.
- `healthcheck.mjs`: pings local health endpoints.
- `lint.mjs`: validates repo structure and document consistency.
- `runtime-log.mjs`: prints configured and discovered runtime versions.
- `security-scan.mjs`: scans for tracked secrets and unsafe env files.
- `typecheck.mjs`: validates runtime alignment and FAS 0 package boundaries.
- `run-tests.mjs`: dispatches Node test suites by layer.
- `verify-phase0.ps1`: validates required package and infra skeleton.
- `verify-phase1.ps1`: validates required FAS 1 auth, org and onboarding artifacts.
- `verify-db.ps1`: validates migration file naming.
- `new-migration.ps1`: creates timestamped migration file in `packages/db/migrations`.
- `dev-up.ps1`: starts docker infra.
- `dev-down.ps1`: stops docker infra.
