# FAS 0 Bootstrap Verification

Detta dokument sammanfattar resultatet av P0-01, P0-02 och P0-03.

## P0-01 Monorepo och runtime-lasning

- Monorepot innehaller `apps`, `packages`, `infra`, `docs`, `scripts` och `.github`.
- Runtimeversioner har last patch-lock i rotfiler, ADR och Docker-relaterade filer.
- Lokal Dockerprofil innehaller PostgreSQL, Valkey, MinIO och Mailpit.

## P0-02 CI, kvalitet och sakerhetsbas

- GitHub Actions workflow `fas0-ci` kor `lint`, `typecheck`, `build`, `test`, `security` och `runtime-log`.
- `CODEOWNERS` och Dependabot finns i repot.
- Repoet innehaller lokal sakerhetsscan for tracked secrets och otillatna `.env`-filer.

## P0-03 Doman- och docskeleton

- Alla paket i huvudplanens monorepostruktur har placeholders med README och `src/index.ts` eller motsvarande.
- Obligatoriska docs finns under `docs/`.
- Konflikten om flera desktop-varianter ar borttagen i de styrande dokumenten.

## Verifieringskommandon

```bash
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm run test
pnpm run security
pnpm run runtime-log
pnpm run db:migrate -- --dry-run
pnpm run seed:demo -- --dry-run
```
