# Swedish ERP

FAS 0 repo-skelett för en modulär monolit med:

- `apps/desktop-web`
- `apps/field-mobile`
- `apps/api`
- `apps/worker`

Monorepot följer `docs/MASTER_BUILD_PLAN.md` med en enda desktop-yta, en separat fältyta för mobil, ett API och en worker-runtime för asynkrona jobb.

## Bootstrap

```bash
corepack enable
corepack prepare pnpm@10.12.4 --activate
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm run test
```

## Daglig utveckling

```bash
pnpm run dev
```

Separata kommandon:

```bash
pnpm --filter @swedish-erp/api start
pnpm --filter @swedish-erp/desktop-web start
pnpm --filter @swedish-erp/field-mobile start
pnpm --filter @swedish-erp/worker start
```

## Databas och seed

```bash
docker compose -f infra/docker/docker-compose.yml up -d
pnpm run db:migrate
pnpm run db:seed
pnpm run seed:demo
```

## Verifiering

```bash
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm run test
pnpm run security
pnpm run runtime-log
```

FAS 0-verifiering och promptresultat finns i `docs/runbooks/fas-0-bootstrap-verification.md`.
