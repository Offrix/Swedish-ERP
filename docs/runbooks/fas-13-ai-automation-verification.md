# FAS 13.3 verification

## Syfte

Verifiera att automation, no-code-regler, konteringsförslag, klassificering, anomalidetektion och human override fungerar enligt FAS 13.3.

## När den används

- efter implementation av FAS 13.3
- före markering av 13.3 som klar i styrdokumenten
- vid regressionskontroll efter ändringar i rule-engine, automation eller override-flöden

## Förkrav

- repo är bootstrapat
- test- och verifieringskommandon kan köras lokalt
- databasmigreringar och seeds för FAS 13.3 finns i repo

## Steg för steg

1. Kör `node scripts/lint.mjs`.
2. Kör `node scripts/typecheck.mjs`.
3. Kör `node scripts/build.mjs`.
4. Kör `node scripts/run-tests.mjs all`.
5. Kör `node scripts/security-scan.mjs`.
6. Kör `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase13-ai-automation.ps1`.
7. Kör `node scripts/db-migrate.mjs --dry-run`.
8. Kör `node scripts/db-seed.mjs --dry-run`.
9. Kör `node scripts/db-seed.mjs --demo --dry-run`.
10. Kör `node scripts/db-migrate.mjs`.
11. Kör `node scripts/db-seed.mjs`.
12. Kör `node scripts/db-seed.mjs --demo`.

## Verifiering

- rule packs kan skapas och listas versionsstyrt
- posting suggestions, classifications och anomalies ger confidence och förklaring
- beslut kräver manuell granskning innan ledgerpåverkan
- override skapar ny override-record utan att mutera originalbeslutet
- automation-beslut kan länkas till webhook-event för operatörsflöden

## Vanliga fel

- `rule_pack_not_found`: automation försöker använda okänd regelpack-version
- `automation_decision_type_invalid`: beslutstyp stöds inte av automationsmotorn
- `automation_override_reason_required`: override saknar förklarad reason code
- `decision_effective_date_invalid`: effectiveDate är inte giltigt ISO-datum

## Återställning

- starta om lokal testmiljö och kör om seeds om beslutshistorik behöver återställas
- skapa ny regelpack-version eller nytt override-beslut i stället för att skriva över historik

## Rollback

- rulla tillbaka commit som introducerade FAS 13.3 om regressionen är i kod
- radera inte tidigare automation-beslut; disable flaggan och skapa ny regelpack-version eller nytt override

## Ansvarig

- huvudagenten som levererar FAS 13.3

## Exit gate

- alla steg ovan gröna
- AI-beslut, confidence, förklaring och human override verifierade
- FAS 13.3 kan markeras klar i plan och verifieringsgrindar
