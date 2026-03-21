FAS 0 CI/test policy
=====================

Detta dokument beskriver den CI-bas som gäller under FAS 0 enligt `docs/test-plans/master-verification-gates.md`.

Principer
---------

- Varje pull request mot `main` måste köra `.github/workflows/fas0-ci.yml`.
- Workflowet måste ge bevis för `lint`, `typecheck`, `test`, `security` och `runtime-log`.
- Körningen ska vara deterministisk: samma repo, samma låsta runtimeversioner och samma skript lokalt och i CI.
- Branch protection konfigureras i GitHub så att `fas0-ci / baseline` krävs före merge.

Bas-kommando
------------

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run security
pnpm run runtime-log
```

CI-gates
--------

1. `baseline` installerar verktyg och kör repoets egna skript.
2. `runtime-log` skriver ut Node-, pnpm- och Python-versioner till artefakt.
3. `CODEOWNERS` säkerställer ägarskap för kod, docs, infra och workflowfiler.
4. Dependabot uppdaterar npm- och GitHub Actions-lagret veckovis.

Scope i FAS 0
-------------

- en enda `desktop-web`
- en separat `field-mobile`
- ett `api`
- en `worker`

Det finns inga `simple-web`- eller `pro-web`-varianter i repot.
