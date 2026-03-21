# ADR-0001 - Runtime versions

Status: Accepted  
Date: 2026-03-21

## Context

Projektet ska byggas med Codex av en anvandare som inte sjalv kodar. Runtimes och plattformar maste darfor vara stabila, valstodda, enkla att installera lokalt och latta att reproducera i CI och produktion. Vi valjer fa sprak och fa driftmiljoer.

## Decision

Vi laser FAS 0 till foljande exakta patchversioner:

- **Node.js 24.14.0** for alla TypeScript-appar och workers.
- **Python 3.14.3** for dokumenttolkning, ETL, batcher, rapportgeneratorer och AI-assisterade verktyg.
- **PostgreSQL 18.0** som enda primara relationsdatabas.
- **Valkey 8.0.0** for cache, rate limiting, las och jobbkoer.
- **TypeScript 5.8.3** som primart applikationssprak.
- **React 19.2.0** som UI-bas.
- **Next.js 16.0.0** for `desktop-web`.
- **Expo SDK 54.0.0** for `field-mobile`.
- **pnpm 10.12.4** via Corepack for JavaScript/TypeScript-monorepot.
- **uv + pyproject.toml + uv.lock** for Python-beroenden med Python 3.14.3 som krav.
- **Docker + docker compose** med `node:24.14.0-bookworm-slim`, `python:3.14.3-slim-bookworm`, `postgres:18.0` och `valkey/valkey:8.0.0-bookworm`.

## Rules

1. Exakta patchversioner ska vara lasa i:
   - `packageManager` och `engines` i `package.json`
   - `config.runtimeVersions` i rotens `package.json`
   - `.nvmrc`
   - `.python-version`
   - `uv.lock`
   - Dockerfiles
   - `infra/docker/docker-compose.yml`
2. Runtime-uppgradering ar ett eget arbete som krav er:
   - ny ADR eller ADR-tillagg
   - testkorning i staging
   - uppdaterad rollback-plan
3. Inga lokala maskininstallationer far vara en dold forutsattning. Allt ska ga att kora i containrar eller via dokumenterade bootstrapkommandon.

## Why

- **24.14.0** valdes for Node eftersom den redan finns i den aktuella utvecklingsmiljon och minskar risken for versionsglidning i FAS 0.
- **3.14.3** valdes for Python eftersom det ar senaste stabila 3.14-bugfixpatchen och ger en striktare, mer defensiv FAS 0-lasning an grundslappet.
- **18.0** och **8.0.0** ger tydlig databaso ch cachebas som matchar MASTER BUILD PLAN utan att introducera en senare gren i FAS 0.
- **19.2.0**, **16.0.0** och **54.0.0** laser UI-linjerna runt en enda `desktop-web` och en separat `field-mobile`.
- **10.12.4** valdes for pnpm som stabil Corepack-styrd workspace-version.

## Consequences

### Positive

- Lagre friktion i Codex-arbetet.
- Enklare onboarding for nya utvecklare.
- Farre kombinationer att felsoka.
- Mindre risk for versionsdrift mellan lokal miljo, CI och produktion.

### Negative

- Uppgradering av monorepo-stack maste ske disciplinerat.
- Vissa verktyg ligger las ta till en specifik patch tidigare an vad senare faser kanske skulle foredra.

## Verification

- [ ] `.nvmrc` finns och matchar `package.json`.
- [ ] `.python-version` finns och matchar Docker-image.
- [ ] CI skriver ut exakta runtimeversioner i logg.
- [ ] `pnpm run doctor` eller motsvarande verifierar lokala versioner.
- [ ] Samma tester gar gront lokalt, i CI och i staging.
