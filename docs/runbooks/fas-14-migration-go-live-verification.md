> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 14.3 verification

## Syfte

Verifiera att migration cockpit, diff reports, cutover, rollback och go-live-ritualen fungerar enligt FAS 14.3.

## När den används

- efter implementation av FAS 14.3
- före markering av 14.3 som klar i styrdokumenten
- vid regressionskontroll efter ändringar i migrering, parallellkörning eller rollback-flöden

## Förkrav

- repo är bootstrapat
- test- och verifieringskommandon kan köras lokalt
- databasmigreringar och seeds för FAS 14.3 finns i repo

## Steg för steg

1. Kör `node scripts/lint.mjs`.
2. Kör `node scripts/typecheck.mjs`.
3. Kör `node scripts/build.mjs`.
4. Kör `node scripts/run-tests.mjs all`.
5. Kör `node scripts/security-scan.mjs`.
6. Kör `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase14-migration-go-live.ps1`.
7. Kör `node scripts/db-migrate.mjs --dry-run`.
8. Kör `node scripts/db-seed.mjs --dry-run`.
9. Kör `node scripts/db-seed.mjs --demo --dry-run`.
10. Kör `node scripts/db-migrate.mjs`.
11. Kör `node scripts/db-seed.mjs`.
12. Kör `node scripts/db-seed.mjs --demo`.

## Verifiering

- mapping sets kan skapas, listas och godkännas per källsystem
- import batches registreras, körs och kan korrigeras manuellt utan att batchhistorik muteras
- diff reports producerar difference items med beslut per item
- cutover-plan låser `acceptedVarianceThresholds`, `rollbackPointRef` och `stabilizationWindowHours`
- cutover validation blockeras när reglerade submission-dead-letters är öppna
- cutover validation kräver accepted migration acceptance record, gröna contract tests, gröna golden scenarios, ackade runbooks och färsk restore drill
- cutover-plan följer ordningen start, final extract, acceptance, validate, sign-off, checklista, switch och stabilize
- migration cockpit materialiserar `datasetSummary`, `cutoverBoard` och `acceptanceBoard` med stabila board-kontrakt, queue-summary, counters, attention-signaler och rollback/correction-status
- rollback skiljer på pre-switch purge och post-switch compensation
- post-switch rollback kräver explicit rollback-plan, suspended integrations och bevarad audit/receipt-evidence
- rollback efter skickad reglerad filing kräver recovery plan och får inte skriva över filinghistorik
- post-cutover correction cases kan öppnas och listas i cockpit utan att tidigare acceptance-evidens tappas

## Vanliga fel

- `mapping_set_not_found`: batch eller approval pekar på okänd mapping set
- `diff_report_not_found`: beslut försöker skriva på okänd diff report
- `cutover_validation_required`: switch eller stabilisering får inte ske innan validering är godkänd
- `cutover_signoff_incomplete`: sign-off-kedjan är inte komplett innan switch
- `cutover_checklist_incomplete`: obligatoriska checklistpunkter är inte klara innan switch
- `cutover_validation_blocked`: validation gate stoppas av dead letters, saknad acceptance, öppna access findings eller saknad evidence
- `cutover_blocking_differences`: blockerande differenser måste hanteras innan switch
- `cutover_rollback_not_started`: rollback kan inte fullföljas innan den startats
- `cutover_rollback_window_closed`: stängd cutover får inte rullas tillbaka utan måste använda post-cutover correction case
- `cutover_rollback_recovery_plan_required`: rollback efter skickad reglerad filing kräver recovery plan

## Återställning

- starta om lokal testmiljö och kör om seeds om migreringsdata behöver återställas
- skapa ny batch, ny diff report eller ny cutover-plan i stället för att skriva över tidigare evidens

## Rollback

- rulla tillbaka commit som introducerade FAS 14.3 om regressionen är i kod
- radera inte cutover- eller rollback-historik; använd rollback-flödet och ny version av planen

## Ansvarig

- huvudagenten som levererar FAS 14.3

## Exit gate

- alla steg ovan gröna
- migration cockpit, diff reports, cutover och rollback verifierade
- FAS 14.3 kan markeras klar i plan och verifieringsgrindar

