# FAS 13.2 verification

## Syfte

Verifiera att partnerkopplingar, kontraktstester, fallback, rate limits och replay-säkra jobb fungerar enligt FAS 13.2.

## När den används

- efter implementation av FAS 13.2
- före markering av 13.2 som klar i styrdokumenten
- vid regressionskontroll efter ändringar i adapterlager, kontraktstester eller jobbkön

## Förkrav

- repo är bootstrapat
- test- och verifieringskommandon kan köras lokalt
- databasmigreringar och seeds för FAS 13.2 finns i repo

## Steg för steg

1. Kör `node scripts/lint.mjs`.
2. Kör `node scripts/typecheck.mjs`.
3. Kör `node scripts/build.mjs`.
4. Kör `node scripts/run-tests.mjs all`.
5. Kör `node scripts/security-scan.mjs`.
6. Kör `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase13-partner-integrations.ps1`.
7. Kör `node scripts/db-migrate.mjs --dry-run`.
8. Kör `node scripts/db-seed.mjs --dry-run`.
9. Kör `node scripts/db-seed.mjs --demo --dry-run`.
10. Kör `node scripts/db-migrate.mjs`.
11. Kör `node scripts/db-seed.mjs`.
12. Kör `node scripts/db-seed.mjs --demo`.

## Verifiering

- partner connections materialiseras per bolag och adaptertyp
- partner connections nekas om credentialsRef saknas; varje miljö kräver explicit secret reference
- kontraktstester körs och resultatet kan listas utan att historik skrivs över
- fallback och rate-limit-status bevaras som egen operationstyp
- async jobs, replay-planer och mass-retry är idempotenta och spårbara
- partneroperationer triggar webhook-events för lyckade och fallerade körningar

## Vanliga fel

- `partner_connection_not_found`: anslutningen saknas eller hör till annat bolag
- `partner_credentials_ref_required`: anslutningen saknar explicit secret reference för aktuell miljö
- `partner_rate_limit_exceeded`: rate-limit spärrar ny operation innan nytt fönster öppnas
- `async_job_replay_forbidden`: replay saknar godkänd replay-plan eller replayAllowed=false
- `partner_contract_test_missing`: kontraktstest saknas för anslutningen

## Återställning

- starta om lokal testmiljö och kör om seeds om adapter- eller jobbhistorik behöver återställas
- skapa ny connection eller ny operation i stället för att mutera historiska körningar

## Rollback

- rulla tillbaka commit som introducerade FAS 13.2 om regressionen är i kod
- radera inte historiska partneroperationer, kontraktstester eller jobb; använd ny operation, replay eller disable-flagga

## Ansvarig

- huvudagenten som levererar FAS 13.2

## Exit gate

- alla steg ovan gröna
- partnerkopplingar, kontraktstester, fallback, rate limits och replay verifierade
- FAS 13.2 kan markeras klar i plan och verifieringsgrindar
