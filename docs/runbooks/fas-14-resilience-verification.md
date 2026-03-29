> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 14.2 verification

## Syfte

Verifiera att feature flags, emergency disable, load profiles, restore drills och chaos-scenarier fungerar enligt FAS 14.2.

## När den används

- efter implementation av FAS 14.2
- före markering av 14.2 som klar i styrdokumenten
- vid regressionskontroll efter ändringar i rollout, återställning eller drifttålighet

## Förkrav

- repo är bootstrapat
- test- och verifieringskommandon kan köras lokalt
- databasmigreringar och seeds för FAS 14.2 finns i repo

## Steg för steg

1. Kör `node scripts/lint.mjs`.
2. Kör `node scripts/typecheck.mjs`.
3. Kör `node scripts/build.mjs`.
4. Kör `node scripts/run-tests.mjs all`.
5. Kör `node scripts/security-scan.mjs`.
6. Kör `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase14-resilience.ps1`.
7. Kör `node scripts/db-migrate.mjs --dry-run`.
8. Kör `node scripts/db-seed.mjs --dry-run`.
9. Kör `node scripts/db-seed.mjs --demo --dry-run`.
10. Kör `node scripts/db-migrate.mjs`.
11. Kör `node scripts/db-seed.mjs`.
12. Kör `node scripts/db-seed.mjs --demo`.

## Verifiering

- feature flags sparar type, owner, risk class, scope och sunset
- emergency disable skapar tidsbegränsat kill-switch-spår utan att skriva över flagghistorik
- load profiles lagrar target och observed utfall per profil
- restore drills binder RTO/RPO mot faktisk evidens
- chaos-scenarier registrerar failure mode, recoverytid och impactsammanfattning

## Vanliga fel

- `feature_flag_scope_type_invalid`: scopeType är ogiltig för flaggan
- `feature_flag_scope_ref_invalid`: scopeRef saknas eller är ogiltig för valt scopeType
- `feature_flag_scope_required`: disable-begäran måste ange scope när flera flagginstanser finns
- `feature_flag_risk_class_invalid`: riskklass saknas eller stöds inte
- `emergency_disable_already_active`: kill switch försöker öppnas igen trots redan aktiv disable
- `restore_drill_status_invalid`: restore drill saknar godkänd status eller evidens

## Återställning

- starta om lokal testmiljö och kör om seeds om resilience-data behöver återställas
- skapa ny flaggversion, nytt restore drill eller nytt chaos-scenario i stället för att mutera historiken

## Rollback

- rulla tillbaka commit som introducerade FAS 14.2 om regressionen är i kod
- radera inte historiska feature-flag-, emergency-disable- eller restore-drill-records; använd ny version eller disable-flagga

## Ansvarig

- huvudagenten som levererar FAS 14.2

## Exit gate

- alla steg ovan gröna
- feature flags, emergency disable, load profiler, restore drills och chaos-scenarier verifierade
- FAS 14.2 kan markeras klar i plan och verifieringsgrindar

