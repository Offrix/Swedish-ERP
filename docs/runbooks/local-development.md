> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Local development runbook

Detta dokument beskriver exakt hur en ny dator ska sattas upp for att bygga produkten lokalt med Codex.

## Mal

En person utan egen kodvana ska kunna:

- klona repot
- installera ratt verktyg
- starta lokala beroenden
- kora migrationer och seed
- kora verifieringskommandon
- be Codex implementera en delfas

## Rekommenderad arbetsmiljo

### macOS
- Terminal + Git
- Docker Desktop eller OrbStack
- VS Code
- Node `24.14.0` via nvm eller fnm
- Python `3.14.3` via pyenv eller uv-managed install

### Windows
- WSL2
- Ubuntu i WSL
- Docker Desktop med WSL integration
- VS Code med Remote WSL
- Node `24.14.0` i WSL
- Python `3.14.3` i WSL

### Linux
- Docker Engine + docker compose plugin
- Git
- Node `24.14.0`
- Python `3.14.3`
- VS Code eller annan editor

## Verktyg som ska installeras

- Git
- Docker
- Node `24.14.0`
- Corepack
- pnpm `10.12.4` via Corepack
- Python `3.14.3`
- uv
- jq
- yq valfritt men rekommenderat
- mkcert for lokal HTTPS om BankID-sandbox eller SSO kraver det

## Konton som ska finnas

- GitHub
- AWS
- Cloudflare
- Sentry
- Grafana Cloud
- PostHog
- Postmark
- inbound email provider
- open banking sandbox eller leverantor
- Peppol access point sandbox eller motsvarande
- BankID/eID testavtal eller leverantorssandbox

## Forsta bootstrap fran tom dator

### 1. Klona repo

```bash
git clone <REPO_URL> swedish-erp
cd swedish-erp
```

### 2. Aktivera ratt Node-version

Exempel med nvm:

```bash
nvm install 24.14.0
nvm use 24.14.0
corepack enable
corepack prepare pnpm@10.12.4 --activate
```

### 3. Installera Python- och Node-beroenden

```bash
pnpm install --frozen-lockfile
uv sync
```

### 4. Kopiera miljofiler

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/desktop-web/.env.example apps/desktop-web/.env
cp apps/field-mobile/.env.example apps/field-mobile/.env
cp apps/worker/.env.example apps/worker/.env
cp infra/docker/.env.example infra/docker/.env
```

### 5. Starta lokala tjanster

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

Lokal docker-miljo ska innehalla minst:
- postgres
- valkey
- minio eller annan lokal objektlagring
- mailpit for lokal utgaende mailtest
- eventuella lokala stubbar for externa tjanster

### 6. Kor migreringar

```bash
pnpm run db:migrate
pnpm run db:seed
```

### 7. Starta appar

```bash
pnpm run dev
```

Forvantat:
- API startar
- `desktop-web` startar
- `field-mobile` startar
- `worker` startar

## Halsokontroll

Kor alltid:

```bash
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm run test
pnpm run security
pnpm run doctor
```

Det ska verifiera:
- Node-version
- Python-version
- Docker
- env-filer
- databasanslutning nar Docker ar tillgangligt
- objektlagring och ko/cache via lokal profil

## Seed-data

Repo ska innehalla kommando som skapar:
- demo-bolag
- demo-kunder
- demo-leverantorer
- demo-anstallda
- demo-projekt
- demo-fakturor
- demo-lonekorningar
- demo-HUS-fall
- demo-personalliggare-site

Exempel:

```bash
pnpm run seed:demo
```

## Standardkommandon

```bash
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm run test
pnpm run test:unit
pnpm run test:integration
pnpm run test:e2e
pnpm run test:golden
pnpm run db:migrate
pnpm run db:seed
pnpm run seed:demo
pnpm run dev
pnpm run runtime-log
```

Python-kommandon nar worker eller regelpaket andras:

```bash
uv run pytest
```

## Hur anvandaren ska arbeta med Codex

1. oppna repot
2. oppna relevant dokument
3. valj en delfas
4. kopiera motsvarande prompt fran `docs/prompts/CODEX_PROMPT_LIBRARY.md`
5. klistra in prompten i Codex
6. lat Codex skapa eller andra kod, tester och docs
7. kor kommandona ovan
8. verifiera fasens gate i `docs/test-plans/master-verification-gates.md`

## Om nagot gar fel

### Databasproblem

```bash
docker compose -f infra/docker/docker-compose.yml down -v
docker compose -f infra/docker/docker-compose.yml up -d
pnpm run db:migrate
pnpm run db:seed
```

### Node-modulproblem

```bash
rm -rf node_modules
rm -f pnpm-lock.yaml
pnpm install
```

### Python-problem

```bash
uv sync --reinstall
```

### Portkrockar

- kontrollera att `4000`, `4001`, `4002`, `55432`, `56379`, `59000`, `58025` och `51025` ar lediga
- andra portar i `.env` och `infra/docker/.env` om det behovs

## Daglig startsekvens

```bash
docker compose -f infra/docker/docker-compose.yml up -d
pnpm run dev
```

## Daglig stoppsekvens

```bash
docker compose -f infra/docker/docker-compose.yml stop
```

## Exit gate

- [ ] En ny dator kan starta repo fran dokumentet ovan.
- [ ] Seed-data gar att skapa.
- [ ] Lint, typecheck och test kan koras lokalt.
- [ ] Anvandaren kan folja runbooken utan muntliga instruktioner.

