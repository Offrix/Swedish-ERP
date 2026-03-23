# Swedish ERP

Svenskt enterprise-system för ekonomi, dokument, HR, lön, projekt, bygg, myndighetsflöden, integrationer och go-live-härdning byggt som en modulär monolit enligt `docs/MASTER_BUILD_PLAN.md`.

Repo:t innehåller:

- `apps/desktop-web` som enda fullständiga desktop-yta för alla roller
- `apps/field-mobile` som separat tumvänlig stöd-yta
- `apps/api` som gemensamt API- och integrationslager
- `apps/worker` som runtime för asynkrona jobb, automation och batchflöden

Byggstatus i repo:t omfattar FAS `0` till `14.3`, inklusive dokumentarkiv, ledger, moms, AR, AP, HR, lön, pension, projekt, byråläge, myndighetsfiler, publikt API, partnerintegrationer, automation, säkerhetsgranskning, resilience och migration cockpit.

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

Fasvisa verifieringsrunbooks finns under `docs/runbooks/` och mastergrindarna i `docs/test-plans/master-verification-gates.md`.
