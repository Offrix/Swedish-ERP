> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 13.1 verification

## Syfte

Verifiera att publikt API, OAuth-scope, sandbox och webhook-kedjan fungerar enligt FAS 13.1.

## När den används

- efter implementation av FAS 13.1
- före markering av 13.1 som klar i styrdokumenten
- vid regressionskontroll efter ändringar i publikt API, scopes eller webhook-flöden

## Förkrav

- repo är bootstrapat
- test- och verifieringskommandon kan köras lokalt
- databasmigreringar och seeds för FAS 13.1 finns i repo

## Steg för steg

1. Kör `node scripts/lint.mjs`.
2. Kör `node scripts/typecheck.mjs`.
3. Kör `node scripts/build.mjs`.
4. Kör `node scripts/run-tests.mjs all`.
5. Kör `node scripts/security-scan.mjs`.
6. Kör `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase13-public-api.ps1`.
7. Kör `node scripts/db-migrate.mjs --dry-run`.
8. Kör `node scripts/db-seed.mjs --dry-run`.
9. Kör `node scripts/db-seed.mjs --demo --dry-run`.
10. Kör `node scripts/db-migrate.mjs`.
11. Kör `node scripts/db-seed.mjs`.
12. Kör `node scripts/db-seed.mjs --demo`.

## Verifiering

- publik specifikation kan läsas versionsstyrt
- OAuth client credentials ger token med rätt scope och mode
- sandbox-katalog och rapport-snapshots respekterar scope och bolagsgräns
- webhook-subscription, event och delivery-kedja är append-only och idempotent per mode
- webhook-hemligheter returneras endast vid skapande och maskeras i listningar
- durable export och restore exponerar aldrig rå webhook-signing-secret men signerad delivery-dispatch fungerar fortfarande efter import
- compatibility baseline kan registreras utan att mutera tidigare baselines

## Vanliga fel

- `public_api_client_not_found`: klient-id saknas eller hör till annat bolag
- `public_api_scope_denied`: token saknar krävt scope för resursen
- `public_api_webhook_mode_mismatch`: webhook-mode matchar inte klientens driftläge
- `public_api_mode_denied`: begärt sandbox- eller produktionsläge är inte tillåtet för klienten

## Återställning

- starta om lokal testmiljö och kör om seeds om webhook- eller tokenhistorik behöver återställas
- skapa ny compatibility baseline i stället för att skriva över tidigare historik

## Rollback

- rulla tillbaka commit som introducerade FAS 13.1 om regressionen är i kod
- radera inte historiska webhook-events eller compatibility baselines; skapa ny version eller disable flaggorna

## Ansvarig

- huvudagenten som levererar FAS 13.1

## Exit gate

- alla steg ovan gröna
- publikt API, OAuth, webhook-idempotens och compatibility-baselines verifierade
- FAS 13.1 kan markeras klar i plan och verifieringsgrindar

