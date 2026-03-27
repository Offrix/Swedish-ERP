> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 14.1 verification

## Syfte

Verifiera att backoffice, audit review, access review, impersonation, break-glass och SoD-kontroller fungerar enligt FAS 14.1.

## När den används

- efter implementation av FAS 14.1
- före markering av 14.1 som klar i styrdokumenten
- vid regressionskontroll efter ändringar i support, audit eller säkerhetsstyrning

## Förkrav

- repo är bootstrapat
- test- och verifieringskommandon kan köras lokalt
- databasmigreringar och seeds för FAS 14.1 finns i repo

## Steg för steg

1. Kör `node scripts/lint.mjs`.
2. Kör `node scripts/typecheck.mjs`.
3. Kör `node scripts/build.mjs`.
4. Kör `node scripts/run-tests.mjs all`.
5. Kör `node scripts/security-scan.mjs`.
6. Kör `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase14-security-review.ps1`.
7. Kör `node scripts/db-migrate.mjs --dry-run`.
8. Kör `node scripts/db-seed.mjs --dry-run`.
9. Kör `node scripts/db-seed.mjs --demo --dry-run`.
10. Kör `node scripts/db-migrate.mjs`.
11. Kör `node scripts/db-seed.mjs`.
12. Kör `node scripts/db-seed.mjs --demo`.

## Verifiering

- support cases kan skapas och knytas till policy scope och approved actions
- audit explorer visar filtrerbar append-only historik
- impersonation kräver godkännande och kan avslutas spårbart
- access review genererar findings och SoD-beslut per finding
- break-glass kräver dual control och kan bara stängas i korrekt ordning
- secret-referenser kan verifieras utan att hemliga värden exponeras i diagnostics

## Vanliga fel

- `support_case_not_found`: diagnostic eller impersonation pekar på okänt supportärende
- `support_action_separation_required`: samma principal försöker både begära och godkänna känslig supportaction
- `impersonation_self_approval_forbidden`: samma principal försöker både begära och godkänna impersonation
- `break_glass_self_approval_forbidden`: samma principal försöker både begära och godkänna break-glass
- `break_glass_close_invalid_state`: sessionen kan inte stängas från nuvarande state
- `access_review_finding_not_found`: beslut pekar på okänd finding i reviewbatchen

## Återställning

- starta om lokal testmiljö och kör om seeds om backoffice-data behöver återställas
- använd nya support cases eller nya review-batcher i stället för att mutera historiska säkerhetsspår

## Rollback

- rulla tillbaka commit som introducerade FAS 14.1 om regressionen är i kod
- radera inte audit, impersonation eller break-glass-historik; disable flagga eller skapa ny reviewbatch i stället

## Ansvarig

- huvudagenten som levererar FAS 14.1

## Exit gate

- alla steg ovan gröna
- backoffice, audit review, impersonation, break-glass och SoD verifierade
- FAS 14.1 kan markeras klar i plan och verifieringsgrindar

