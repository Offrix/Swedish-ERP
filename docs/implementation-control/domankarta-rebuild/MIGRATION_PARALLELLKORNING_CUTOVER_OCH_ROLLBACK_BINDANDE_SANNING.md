# MIGRATION_PARALLELLKORNING_CUTOVER_OCH_ROLLBACK_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för migration, parallellkorning, cutover, watch window, rollback och fail-forward.

## Syfte

Detta dokument ska låsa hur svenska bolag, byraer, payrollportföljer och flerbolagsmiljoer flyttas till plattformen utan falsk parity, utan dold dubbelexport och utan rollback-teater.

## Omfattning

Detta dokument omfattar:
- source discovery
- source capability receipts
- extract lineage
- canonical dataset freeze
- import execution
- parallel run
- final delta extract
- cutover decision
- watch window
- rollback eller fail-forward
- migration evidence och sign-off

Detta dokument omfattar inte:
- själva seller-side invoice truth
- själva AP-, VAT-, payroll- eller ledgertruth
- UI-formgivning av migration workbench

## Absoluta principer

- ingen migration får ga live utan frozen extract boundary
- ingen cutover får göras utan explicit rollback- eller fail-forward-strategi
- ingen rollback får lovas om data redan divergerat utan definierad dataplan
- parallel run får inte bygga på manuella excelfiler som ensam paritysanning
- varje källsystem, extract, importbatch och cutoverbeslut måste vara receiptsakrat
- migration får aldrig skriva direkt till targetdomän utan canonical import contracts

## Bindande dokumenthierarki för migration, parallellkorning och rollback

- `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md` äger document-driven ingest som kan bli del av canonical datasets
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` äger ledgertruth som migrationen måste landa i
- `FAKTURAFLODET_BINDANDE_SANNING.md`, `LEVFAKTURAFLODET_BINDANDE_SANNING.md`, `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md`, `LONEFLODET_BINDANDE_SANNING.md`, `AGI_FLODET_BINDANDE_SANNING.md`, `ROT_RUT_HUS_FLODET_BINDANDE_SANNING.md`, `SIE4_IMPORT_OCH_EXPORT_BINDANDE_SANNING.md` och ändra flödesbiblar äger respektive maltruth
- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` äger sign-off, evidence bundle och approval truth runt migration
- Domän 13, 15 och 27 får inte definiera avvikande migration-, cutover-, rollback- eller paritytruth utan att detta dokument skrivs om samtidigt

## Kanoniska objekt

- `MigrationProgram`
- `MigrationSourceBinding`
- `SourceCapabilityReceipt`
- `ExtractManifest`
- `CanonicalDataset`
- `ImportBatch`
- `ParallelRunWindow`
- `ParityFinding`
- `CutoverDecision`
- `WatchWindow`
- `RollbackDecision`
- `FailForwardDecision`
- `CutoverReceipt`
- `RollbackReceipt`

## Kanoniska state machines

- `MigrationProgram`: `draft -> discovery -> extract_ready -> import_ready -> parallel_run -> cutover_ready -> cutover_executed -> watch_window -> closed | rolled_back | fail_forwarded`
- `CanonicalDataset`: `draft -> frozen -> imported | superseded | rejected`
- `ImportBatch`: `queued -> running -> committed | failed | rolled_back`
- `CutoverDecision`: `draft -> pending_approval -> approved | rejected | superseded`
- `WatchWindow`: `open -> stable | rollback_triggered | fail_forward_triggered`

## Kanoniska commands

- `RegisterMigrationSource`
- `CaptureSourceCapabilityReceipt`
- `FreezeExtractManifest`
- `FreezeCanonicalDataset`
- `ExecuteImportBatch`
- `OpenParallelRunWindow`
- `RecordParityFinding`
- `ApproveCutoverDecision`
- `ExecuteCutover`
- `OpenWatchWindow`
- `TriggerRollbackDecision`
- `TriggerFailForwardDecision`
- `CloseMigrationProgram`

## Kanoniska events

- `MigrationSourceRegistered`
- `SourceCapabilityReceiptCaptured`
- `ExtractManifestFrozen`
- `CanonicalDatasetFrozen`
- `ImportBatchCommitted`
- `ParallelRunWindowOpened`
- `ParityFindingRecorded`
- `CutoverApproved`
- `CutoverExecuted`
- `WatchWindowOpened`
- `RollbackTriggered`
- `FailForwardTriggered`
- `MigrationProgramClosed`

## Kanoniska route-familjer

- `POST /migration-programs`
- `POST /migration-sources`
- `POST /migration-sources/{id}/capability-receipts`
- `POST /extract-manifests`
- `POST /canonical-datasets`
- `POST /import-batches`
- `POST /parallel-run-windows`
- `POST /parity-findings`
- `POST /cutover-decisions`
- `POST /watch-windows`
- `POST /rollback-decisions`
- `POST /fail-forward-decisions`

## Kanoniska permissions och review boundaries

- source registration får initieras av migration operator eller bureau lead
- capability receipts för auth, scopes och provider APIs får inte godkännas av samma person som skapade dem
- cutover approval kraver SoD mellan migration lead och go-live approver
- rollback eller fail-forward får bara triggas av explicit incident eller cutover authority
- support får läsa masked migration evidence men får inte skriva om canonical datasets

## Nummer-, serie-, referens- och identitetsregler

- varje migrationprogram ska ha ett stabilt `MIGR-YYYY-NNNNN`
- varje extractmanifest ska ha ett stabilt `EXT-YYYY-NNNNN`
- varje canonical dataset ska ha ett stabilt `CDS-YYYY-NNNNN`
- varje importbatch ska ha ett stabilt `IMP-YYYY-NNNNN`
- varje cutover receipt ska ha ett stabilt `CUT-YYYY-NNNNN`
- varje rollback receipt ska ha ett stabilt `RBK-YYYY-NNNNN`
- checksummor på filer, dataset och paritypaket är obligatoriska

## Valuta-, avrundnings- och omräkningsregler

- migration får aldrig avrunda om source truth kan bevaras med exakt minor unit
- om sourcevaluta skiljer sig från targetvaluta måste source amount, source currency, source rate och target amount lagras samtidigt
- om source saknar kurslinje får ingen automatisk omräkning ske utan explicit rulepack och evidence

## Replay-, correction-, recovery- och cutover-regler

- varje importbatch måste vara replaybar med samma inputhash och samma expected outcome
- varje final delta extract måste ha en frozen cutoff timestamp
- rollback får bara återstalla till en definierad recovery target
- fail-forward får bara användas om post-cutover writes redan gjort gammal miljo stale
- watch window måste vara definierad innan cutover approval

## Huvudflödet

1. source binding skapas och knyts till riktigt bolag, ledger, fiscal year och method
2. capability receipt fryses för auth, scopes, extract families och unsupported gaps
3. extract manifest fryses med source tidsgrans, datasetomfang, hashes och fallback policy
4. canonical dataset fryses och signeras för import
5. importbatch kor till targetdomäner via riktiga import contracts
6. parallel run kor med paritymatt mot rapporter, open items, payroll och filing artifacts
7. cutover decision godkänns med explicit rollback eller fail-forward-plan
8. final delta extract kor och ny canonical dataset fryses
9. cutover exekveras och watch window öppnas
10. migration stangs som `closed`, `rolled_back` eller `fail_forwarded`

## Bindande scenarioaxlar

- source family: SIE, API, file export, bankformat, payroll export, document export, mixed-source
- legal entity profile: aktiebolag, enskild firma, handelsbolag, flerbolag, bureau client
- accounting method: faktureringsmetoden, bokslutsmetoden
- fiscal year profile: regular, short, extended
- cutover mode: weekend, overnight, payroll-sensitive, filing-sensitive
- delta mode: none, append-only, source-reextract, full reseed
- rollback posture: cold rollback, warm rollback, fail-forward-only
- data family: ledger, ÄR, AP, bank, VAT, tax account, payroll, AGI, HUS, green tech, documents

## Bindande policykartor

- `MIG-POL-001 source_family_to_required_receipts`
- `MIG-POL-002 dataset_family_to_target_domain`
- `MIG-POL-003 cutover_mode_to_watch_window`
- `MIG-POL-004 rollback_posture_to_allowed_actions`
- `MIG-POL-005 unsupported_source_gap_to_blocking_decision`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `MIG-P0001` source capability receipt captured with `source_family`, `auth_method`, `scope_set`, `unsupported_gaps[]`, `hash`
- `MIG-P0002` extract manifest frozen with `from_timestamp`, `to_timestamp`, `dataset_families[]`, `artifact_hashes[]`
- `MIG-P0003` canonical dataset frozen with `dataset_id`, `source_receipts[]`, `record_counts`, `checksum`
- `MIG-P0004` import batch committed with `target_domain`, `target_receipt_ids[]`, `skipped_duplicates`, `hard_failures=0`
- `MIG-P0005` parallel run parity passed with `report_family`, `source_value`, `target_value`, `variance=0`
- `MIG-P0006` cutover blocked because `unsupported_gap` or `open_parity_findings>0`
- `MIG-P0007` watch window opened with `stable_baselines[]`, `guardrails[]`, `rollback_deadline`
- `MIG-P0008` rollback executed with `recovery_target`, `restored_batch_ids[]`, `stale_data_window`
- `MIG-P0009` fail-forward executed with `source_marked_stale=true`, `new_target_receipt`
- `MIG-P0010` migration closed with `final_verdict`, `approval_bundle_id`, `retention_bundle_id`

## Bindande rapport-, export- och myndighetsmappning

- parity måste kunna bevisas mot huvudbok, reskontror, momsrapport, AGI-underlag, skattekonto, HUS claims, SIE4-export och ändra relevanta targetrapporter
- ingen filingfardig status får sattas före migration parity för filing-driven datafamiljer är godkänd
- migration receipts måste exporteras till evidence bundle för audit och support

## Bindande scenariofamilj till proof-ledger och rapportspar

- `MIG-A001` SIE4-ledger migration -> `MIG-P0001`, `MIG-P0002`, `MIG-P0003`, `MIG-P0004`, `MIG-P0005`
- `MIG-A002` API-baserad ÄR/AP migration -> `MIG-P0001`, `MIG-P0003`, `MIG-P0004`, `MIG-P0005`
- `MIG-B001` payroll YTD + AGI migration -> `MIG-P0001`, `MIG-P0003`, `MIG-P0004`, `MIG-P0005`, `MIG-P0007`
- `MIG-B002` HUS/green-tech open claims migration -> `MIG-P0001`, `MIG-P0003`, `MIG-P0004`, `MIG-P0006`
- `MIG-C001` unsupported source gap discovered -> `MIG-P0006`
- `MIG-D001` rollback before new writes -> `MIG-P0008`
- `MIG-D002` fail-forward after divergent writes -> `MIG-P0009`

## Tvingande dokument- eller indataregler

- varje source binding måste knytas till juridisk person, orgnr, ledger och fiscal year
- varje extract manifest måste innehålla exakt dataintervall och exakt datafamiljlista
- varje canonical dataset måste ha checksummor, record counts och lineage till source artifacts
- varje cutover beslut måste ha named approvers, rollback posture, watch window och communication scope

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `MIG-R001 unsupported_source_capability`
- `MIG-R002 missing_source_consent`
- `MIG-R003 parity_not_zero`
- `MIG-R004 unsupported_fiscal_split`
- `MIG-R005 filing_window_conflict`
- `MIG-R006 rollback_window_expired`
- `MIG-R007 fail_forward_required_due_to_divergent_writes`

## Bindande faltspec eller inputspec per profil

- source binding: `source_family`, `tenant_id`, `legal_entity_id`, `ledger_id`, `fiscal_year_ids[]`, `auth_profile`
- extract manifest: `from_timestamp`, `to_timestamp`, `dataset_families[]`, `artifact_refs[]`, `checksum_set`
- canonical dataset: `dataset_id`, `lineage_refs[]`, `target_domains[]`, `record_counts`, `hash`
- cutover decision: `cutover_mode`, `rollback_posture`, `watch_window_hours`, `approver_ids[]`, `blockers[]`
- rollback decision: `trigger_reason_code`, `recovery_target`, `data_divergence_window`, `authority_id`

## Scenariofamiljer som hela systemet måste tacka

- full historical ledger import
- open ÄR/AP only
- payroll YTD with upcoming AGI
- bank and tax-account migration with reconciliation carryover
- HUS open claims and pending authority decisions
- final delta extract close to month-end
- cutover in payroll lock week
- rollback without new writes
- fail-forward after new writes
- bureau multi-client wave
- multi-entity shared cutover
- source gap discovered after extract freeze

## Scenarioregler per familj

- unsupported source capability blockerar cutover tills gap är eliminerad eller explicit scope-skuren och godkänd
- parityfinding på filing-driven data blockerar cutover tills skillnaden är förklarad och evidensford
- final delta extract får inte ga över tidigare frozen cutoff utan nytt dataset-id
- rollback utan nya writes får inte markeras fail-forward
- fail-forward får inte kallas rollback

## Blockerande valideringar

- cutover blocked om `open_parity_findings > 0`
- cutover blocked om `watch_window_hours` saknas
- cutover blocked om `rollback_posture` saknas
- import blocked om source checksummor eller record counts saknas
- import blocked om target domain mappings saknas
- rollback blocked om recovery target inte är verifierad

## Rapport- och exportkonsekvenser

- migration receipts ska kunna visas i operator workbench, audit pack och support tooling
- parity findings ska exporteras med source/target diff och approved resolution
- cutover och rollback receipts ska ingå i go-live bevispaket

## Förbjudna förenklingar

- manuell "vi tittade i gamla systemet" som ensam paritybevisning
- rollback utan recovery target
- fail-forward etiketterad som rollback
- delta extract utan frozen cutoff
- import direkt till targetdatabas utan import contracts
- dubbelskrivning utan explicit strategidokument

## Fler bindande proof-ledger-regler för specialfall

- `MIG-P0011` bureau wave cutover must include `client_scope[]`, `sequence_order[]`, `shared_operator_roster`
- `MIG-P0012` month-end conflict blocked with `MIG-R005`
- `MIG-P0013` payroll-sensitive cutover requires `next_payrun_id`, `AGI_window`, `bankfile_lock_state`
- `MIG-P0014` source stale after fail-forward recorded with `source_write_disable_receipt`
- `MIG-P0015` post-cutover data repair must be recorded as correction import, never hidden replay

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `MIG-P0004` skapar target-owned receipts i respektive targetdomän
- `MIG-P0005` skapar `parity_passed`
- `MIG-P0006` skapar `cutover_blocked`
- `MIG-P0008` skapar `rolled_back`
- `MIG-P0009` skapar `fail_forwarded`

## Bindande verifikations-, serie- och exportregler

- EJ TILLÄMPLIGT som egen voucher-sanning
- om migration skapar voucherimport ska all verifikationstruth agas av `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` och `SIE4_IMPORT_OCH_EXPORT_BINDANDE_SANNING.md`

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- source family x legal form
- source family x accounting method
- dataset family x cutover mode
- cutover mode x rollback posture
- payroll-sensitive window x AGI window
- bureau wave x multi-entity

## Bindande fixture-klasser för migration, parallellkorning och rollback

- `MGF-001` single-company ledger migration
- `MGF-002` full ÄR/AP migration with open items
- `MGF-003` payroll YTD plus upcoming AGI
- `MGF-004` HUS open claims plus tax-account mirror
- `MGF-005` multi-entity with intercompany balances
- `MGF-006` bureau batch wave
- `MGF-007` rollback-before-writes drill
- `MGF-008` fail-forward-after-writes drill

## Bindande expected outcome-format per scenario

- `scenario_id`
- `fixture_class`
- `source_family`
- `dataset_scope`
- `required_receipts[]`
- `expected_target_receipts[]`
- `expected_parity_reports[]`
- `expected_blockers[]`
- `expected_cutover_verdict`
- `expected_watch_window_verdict`

## Bindande canonical verifikationsseriepolicy

- EJ TILLÄMPLIGT som egen seriepolicy
- imported voucher series ska bevaras eller canonicaliseras enligt bokförings- eller SIE4-bibeln

## Bindande expected outcome per central scenariofamilj

- `MIG-A001` med `MGF-001` ska ge zero paritydiff på huvudbok, balansrapport, resultatrapport och SIE4 roundtrip
- `MIG-B001` med `MGF-003` ska ge zero paritydiff på YTD, AGI field maps och payroll liability anchors
- `MIG-D001` med `MGF-007` ska ge `rolled_back` och inga kvarvarande target-owned writes efter recovery target
- `MIG-D002` med `MGF-008` ska ge `fail_forwarded`, source stale markerad och ny target receipt för driftfortsattning

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `MIG-A001` -> import committed, parity zero, cutover-ready
- `MIG-A002` -> import committed, open-item parity zero
- `MIG-B001` -> payroll parity zero, AGI parity zero
- `MIG-B002` -> blocked unless authority-state lineage is complete
- `MIG-C001` -> cutover blocked
- `MIG-D001` -> rolled_back
- `MIG-D002` -> fail_forwarded

## Bindande testkrav

- deterministic replay of same canonical dataset twice with same result
- deliberate gap fixture must hard block cutover
- rollback drill must prove recovery target and restored read model integrity
- fail-forward drill must prove source stale labeling and no false rollback wording
- bureau wave test must prove per-client isolation and shared operator evidence
- month-end and payroll-window cutover tests must prove blocker or explicit approval path

## Källor som styr dokumentet

- [AWS Prescriptive Guidance: Cutover stage](https://docs.aws.amazon.com/prescriptive-guidance/latest/best-practices-migration-cutover/cutover-stage.html)
- [PostgreSQL 17: Continuous Archiving and Point-in-Time Recovery](https://www.postgresql.org/docs/17/continuous-archiving.html)
- [PostgreSQL 17: Transaction Isolation](https://www.postgresql.org/docs/17/transaction-iso.html)
- [NIST SP 800-34 Rev. 1](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final)
- [Föreningen SIE-Gruppen: Vad är SIE?](https://sie.se/vadsie/)
- [Föreningen SIE-Gruppen: SIE filformat](https://sie.se/wp-content/uploads/2026/02/SIE_filformat_ver_4C_2025-08-06.pdf)
