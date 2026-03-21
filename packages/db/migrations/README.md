# Migrations

Naming convention:

`YYYYMMDDHHMMSS_<slug>.sql`

Rules:

- Never edit an applied migration in place.
- Add a new migration for every change.
- Keep migration SQL idempotent where practical for local bootstrap.
- Seed files live in `../seeds/`.
