> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Migration cockpit, parallel run and cutover

## Syfte

Detta dokument definierar importbatch, mapping review, diff report, parallellkörning, accept- och regression gates, cutover, rollback och objekt-för-objekt-spårning vid migrering. Syftet är att kunna föra över kunddata och historik från källsystem till målplattform utan dolda differenser eller otydliga go-live-beslut.

## Scope

### Ingår

- migration cockpit för importbatcher, mappings, diff reports och sign-off
- parallellkörning mellan källsystem och målmodell
- accept/regression gate, cutover och rollback
- differensklasser, manuella korrigeringar och beviskrav innan go-live
- objekt-för-objekt-spårning genom hela migreringen

### Ingår inte

- generell historisk import utanför migreringsprogram
- kod för extract från ett specifikt källsystem; endast den styrda modellen för mottagning
- affärsbeslut om vilka kunder som ska migreras överhuvudtaget

### Systemgränser

- migration cockpit äger batch, mapping set, diff report, cutover plan och go-live evidence
- källdomäner äger validering av respektive objektkategori i målsystemet
- rapport- och close-domäner används för parallellkörningsjämförelser men äger inte migreringsbeslutet

## Roller

- **Migration lead** äger helheten, cutover-plan och sign-off inför go-live.
- **Domain reviewer** granskar mapping och differenser för sitt område.
- **Data operator** laddar batcher, kör valideringar och hanterar korrigeringar.
- **Customer signatory** eller pilotägare godkänner resultat där kundbeslut krävs.
- **Rollback owner** ansvarar för återställningsbeslut om cutover måste avbrytas.

## Begrepp

- **Import batch** — Identifierad last av datafiler eller importerade objekt.
- **Mapping review** — Kontrollerat godkännande av hur källfält mappas till målmodell.
- **Diff report** — Rapport över skillnader mellan källsystem och målsystem.
- **Difference class** — Klassning av differens, till exempel `cosmetic`, `timing`, `mapping_error`, `missing_data`, `material`.
- **Parallel run** — Period då båda systemen jämförs på samma affärsutfall.
- **Cutover** — Själva bytet till målsystemet.
- **Go-live evidence** — Det samlade bevispaketet som krävs innan produktionstart.

## Objektmodell

### Import batch
- fält: `import_batch_id`, `source_system`, `batch_type`, `received_at`, `status`, `record_count`, `hash`, `scope`, `mapping_set_id`, `validation_summary`
- invariant: batch-hash och record count måste sparas innan bearbetning

### Mapping set
- fält: `mapping_set_id`, `source_system`, `domain_scope`, `version_no`, `status`, `reviewed_by`, `approved_by`, `effective_for_batches`
- invariant: batch får inte gå till godkänd import utan aktivt mapping set

### Diff report
- fält: `diff_report_id`, `comparison_scope`, `source_snapshot_ref`, `target_snapshot_ref`, `difference_summary`, `materiality_assessment`, `status`
- invariant: diff report måste kunna reproduceras från sparade snapshots

### Cutover plan
- fält: `cutover_plan_id`, `company_id`, `freeze_at`, `last_extract_at`, `validation_gate_status`, `rollback_point`, `signoff_chain`, `status`
- invariant: cutover plan måste referera till exakt migration scope och exakt rollback point

## State machine

### Import batch
- `received -> validated -> mapped -> imported -> reconciled -> accepted`
- `validated -> rejected`
- `imported -> corrected -> reconciled`

### Diff report
- `generated -> reviewed -> accepted`
- `reviewed -> remediation_required -> regenerated`

### Cutover
- `planned -> freeze_started -> final_extract_done -> validation_passed -> switched -> stabilized -> closed`
- `freeze_started -> aborted`
- `switched -> rollback_in_progress -> rolled_back`

## Användarflöden

### Batchimport
1. Batch tas emot och fingerprintas.
2. Validering körs på format, counts och mapping.
3. Import sker till staging eller direkt migreringsyta.
4. Reconciliation mot källsnapshot skapas.

### Parallel run
1. Källsystem och målsystem kör samma period eller delmängd.
2. Rapporter, reskontra, opening balances och utvalda operativa flöden jämförs.
3. Diff reports granskas per domän.
4. Materiella skillnader måste vara lösta eller uttryckligen accepterade före cutover.

### Cutover och rollback
1. Freeze startas enligt plan.
2. Sista extract görs och importeras.
3. Slutlig gate kontrollerar counts, differenser, åtkomster och runbooks.
4. Om gate faller stoppas switch eller så körs rollback enligt fördefinierad ordning.

## Affärsregler

### Differensklasser
- `cosmetic` påverkar inte siffror eller regelutfall
- `timing` avser skillnad i synktid eller batchfönster men inte slutligt utfall
- `mapping_error` avser felaktig fält- eller kodmappning
- `missing_data` avser poster som inte kommit över
- `material` avser skillnad som påverkar bokföring, rapportering, saldo eller regulatoriskt utfall

### Accept- och regression gate
- inga öppna materiella differenser får finnas
- kända icke-materiella differenser ska vara dokumenterade och godkända
- batch counts, kontrollsummor och slumpstickprov ska gå ihop mot källsnapshot
- runbooks, supportberedskap och rollback point måste vara verifierade

### Manuella korrigeringar
- manuella korrigeringar ska loggas per objekt med orsak, ansvarig och godkännare
- korrigering får inte skrivas direkt i importerad rådata utan ska ske som separat transformations- eller target-action
- korrigering som påverkar diff report kräver ny diffkörning

### Objekt-för-objekt-spårning
- varje importerat objekt ska kunna kopplas till källsystemets identifierare, batch och mapping set
- merge eller sammanslagning av objekt ska bevara alla källreferenser
- avvisade objekt ska ligga kvar i migreringshistoriken med tydlig orsak

## Behörigheter

- `migration_lead` får godkänna mapping sets, diff reports och cutover-planer
- `domain_reviewer` får godkänna eller underkänna differenser inom eget domänscope
- `data_operator` får köra importer, omkörningar och generera diff reports men inte signera go-live ensam
- `rollback_owner` får initiera rollback när cutover-status eller incident kräver det

## Fel- och konfliktfall

- batch utan giltig hash eller mapping set ska nekas
- diff report som inte går att reproducera ska behandlas som blocker
- cutover-försök utan verifierad rollback point ska stoppas
- manuell korrigering utan ny diffkörning ska nekas
- objekt med tvetydig källidentitet ska gå till mapping review eller duplicate review

## Notifieringar

- migration lead får notifiering om materiella differenser, batchfel och gate-fall
- domain reviewers får notifiering när ny diff report kräver granskning
- customer signatory får notifiering när kundbeslut eller godkännande behövs inför go-live
- rollback owner får notifiering vid cutover-incident eller fallerande stabiliseringskontroll

## Audit trail

- alla batcher, mappingbeslut, differensbedömningar, korrigeringar, cutoversteg och rollbackåtgärder ska auditloggas
- auditspåret ska göra det möjligt att gå från en importerad post i målsystemet tillbaka till batch, mapping set och källidentifierare
- go-live evidence ska vara versionsstämplat och signerat med vem som godkände vad och när

## API/events/jobs

- kommandon: `register_import_batch`, `approve_mapping_set`, `run_import_batch`, `generate_diff_report`, `record_difference_decision`, `start_cutover`, `complete_cutover`, `start_rollback`
- events: `import_batch_received`, `import_batch_imported`, `diff_report_generated`, `migration_gate_failed`, `cutover_started`, `cutover_switched`, `rollback_started`
- jobb: `batch_validation_job`, `migration_diff_job`, `parallel_run_compare_job`, `cutover_gate_job`

## UI-krav

- migration cockpit ska visa batchstatus, differenser, mapping state och cutover-plan i en sammanhållen vy
- användaren ska kunna drilldowna från diff summary till enskilt objekt
- materiella differenser ska ha tydlig blocker-markering
- cutovervyn ska visa checklista, ansvariga och rollback point före switch

## Testfall

1. importera batch med giltig hash och mapping; förväntat utfall: batch till `validated`
2. generera diff report med materiell differens; förväntat utfall: blocker
3. gör manuell korrigering och kör om diff; förväntat utfall: ny diff report
4. starta cutover utan rollback point; förväntat utfall: nekad
5. parallellkörning med matchande rapporter; förväntat utfall: accept gate passerar
6. rollback efter switch återställer definierad målstatus

## Exit gate

- [ ] importbatcher, mapping och diff reports är fullt spårbara
- [ ] parallellkörning kan reproducera differensanalys per objekt och totalsumma
- [ ] cutover kräver uttrycklig accept gate och rollback point
- [ ] manuella korrigeringar är separata, godkända och auditerade
- [ ] go-live evidence räcker för kund, intern kontroll och eftergranskning

