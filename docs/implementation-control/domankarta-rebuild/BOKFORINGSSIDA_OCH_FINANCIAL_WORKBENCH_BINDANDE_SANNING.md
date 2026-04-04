# BOKFÖRINGSSIDA_OCH_FINANCIAL_WORKBENCH_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för bokföringssidan och hela financial workbench-ytan.

Detta dokument ska styra:
- bokföringssidan som produkt- och runtime-yta
- workbenchrader för bokföring, reskontra, moms, skattekonto, lön och close
- drilldown-beteende
- snapshot-val, as-of-val och periodval
- state badges, freshness badges och blockeringsorsaker
- exportknappar och artifact-governance
- support-reveal, masking och läsrättigheter
- mapping mellan UI-actions och commandfamiljer

Ingen UI-yta, ingen route, inget querylager, inget searchindex, ingen exportmotor och inget supportverktyg får definiera avvikande ytsanning för bokföringssidan utan att detta dokument skrivs om först.

## Syfte

Detta dokument finns för att läsaren ska kunna bygga hela bokföringssidan utan att gissa:
- vilka read models sidan får läsa från
- vad som är live, locked, preliminary, superseded, stale eller blocked
- när en drilldown ska låsa snapshot och när den får läsa live truth
- vilka knappar som är read-only och vilka som skapar command
- hur export artefakter ska uppsta och bevisas
- hur masking, permission och support reveal ska fungera

Detta dokument bygger inte ny bokföringslogik. Det äger ytan som presenterar, avgränsar och driver kommandon mot canonical truth.

## Omfattning

Detta dokument omfattar:
- bokföringssidan och dess huvudsektioner
- workbenchrader och detailpanels
- canonical read models för sidan
- snapshot- och as-of-logik
- journal- och rapportdrilldown
- filter, badges, sortering och bulk actions
- exportrequest och artifactreceipt
- permission- och maskingbeslut för sidan
- stale/freshness- och watermarkbeteende

Detta dokument omfattar inte:
- kontering eller postinglogik i sig
- BAS-kontoklassning i sig
- SIE-parser eller exportformat i sig
- momslogik, AGI-logik, payroll-beräkning eller close-logik i sig
- visuell styling, spacing eller komponentbibliotek

Kanonisk agarskapsregel:
- affärslogiken ägs av respektive bindande flödesdokument
- detta dokument äger hur sanningen får projiceras, grupperas, filtreras, maskeras, exporteras och kommenderas på bokföringssidan

## Absoluta principer

- bokföringssidan får aldrig vara egen source of truth
- searchindex, workbench-cache och UI-state får aldrig ersätta canonical accounting truth
- stale data måste visas som stale eller blocked, aldrig som implicit korrekt
- locked reporting får aldrig läsa live-drilldown utanför sitt snapshot scope
- export som ser verklig ut måste vara verklig artifact, inte memory:// eller fake payload
- posted legal-effect truth får aldrig ändras via inline edit på sidan
- alla skrivande actions måste ga via command och actor receipt
- permission och masking måste vara first-class och orsakskodade
- samma sida får aldrig samtidigt presentera live-sanning som om den vore locked snapshot utan tydlig badge och scope label
- totalsummor får aldrig blandas över olika valutor utan uttrycklig canonical omräkning eller separat summering

## Bindande dokumenthierarki för bokföringssidan och financial workbench

Bokföringssidan lutar bindande på minst dessa dokument:
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md`
- `RAPPORTER_MOMS_AGI_RESKONTRA_HUVUDBOK_BINDANDE_SANNING.md`
- `SEARCH_ACTIVITY_NOTIFICATIONS_OCH_WORKBENCHES_BINDANDE_SANNING.md`
- `SIE4_IMPORT_OCH_EXPORT_BINDANDE_SANNING.md`
- `BAS_KONTOPOLICY_BINDANDE_SANNING.md`
- `VERIFIKATIONSSERIER_OCH_BOKFORINGSPOLICY_BINDANDE_SANNING.md`
- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md`
- `SUPPORT_BACKOFFICE_INCIDENTS_OCH_REPLAY_BINDANDE_SANNING.md`

Detta dokument äger ytan när gamla dokument bara äger domäntruth men inte surface semantics.

## Kanoniska objekt

Minst följande first-class objekt måste finnas för bokföringssidan:
- `AccountingWorkbenchView`
  - en scopead, canonical read model för bokföringssidan
- `AccountingViewScope`
  - tenant, fiscalYear, periodScope, snapshotMode, asOfTime, entityScope, permissionScope
- `AccountingRow`
  - canonical rad för workbench eller tabellsektion, aldrig raw payload
- `AccountingRowIssue`
  - first-class issue record för stale, missing proof, permission block, snapshot mismatch eller masking
- `SnapshotSelection`
  - uttrycklig bindning till live, preliminary, locked, superseded eller reopened snapshot
- `DrilldownScope`
  - uttrycklig regel för vilka artifacter, journals, subledgers och reports en drilldown får läsa
- `ExportRequest`
  - actor-bound request om att skapa export artifact
- `ExportArtifactReceipt`
  - verkligt artifact-receipt med digest, storage profile och delivery status
- `MaskingDecision`
  - per rad eller per fält, med reason code
- `RevealDecision`
  - support reveal eller auditor reveal med approval, watermark och TTL
- `FreshnessCheckpoint`
  - canonical checkpoint som binder en read model till source version och data-age
- `BulkActionRequest`
  - first-class request för bulk action, aldrig direkt multi-write i UI

## Kanoniska state machines

Minst följande state machines är bindande:

### A. `SnapshotSelection`
- `live`
- `preliminary_snapshot`
- `locked_snapshot`
- `superseded_snapshot`
- `reopened_snapshot`
- `blocked`

Tillåtna övergångar:
- `live -> preliminary_snapshot`
- `preliminary_snapshot -> locked_snapshot`
- `locked_snapshot -> superseded_snapshot`
- `locked_snapshot -> reopened_snapshot`
- alla till `blocked` om proof eller permission saknas

Otillåtna övergångar:
- `locked_snapshot -> live` utan ny explicit scope-valhandling
- `superseded_snapshot -> locked_snapshot` utan nytt snapshotobjekt

### B. `AccountingRowFreshness`
- `fresh`
- `lagging`
- `stale`
- `blocked_unknown`

### C. `ExportArtifactReceipt`
- `requested`
- `materializing`
- `stored`
- `delivered`
- `failed`
- `superseded`
- `retained`
- `expired_by_policy`

### D. `BulkActionRequest`
- `draft`
- `validated`
- `submitted`
- `accepted`
- `rejected`
- `cancelled`

## Kanoniska commands

Endast följande command-familjer får startas från bokföringssidan:
- `OpenAccountingWorkbench`
- `ChangeAccountingViewScope`
- `LockViewToSnapshot`
- `RequestAccountingDrilldown`
- `GenerateReportSnapshot`
- `LockReportSnapshot`
- `GenerateExportArtifact`
- `CreateManualJournalDraft`
- `SubmitManualJournal`
- `StartCorrectionCase`
- `RequestPeriodReopen`
- `RequestFiscalYearReopen`
- `RunReconciliation`
- `AcknowledgeWorkbenchIssue`
- `RequestSupportReveal`

Förbjudet:
- direkt `PATCH` eller `DELETE` av legal-effect truth från bokföringssidan
- bulk update som direkt muterar flera legal objekt utan first-class `BulkActionRequest`

## Kanoniska events

Minst följande events måste finnas:
- `AccountingWorkbenchOpened`
- `AccountingViewScopeChanged`
- `SnapshotSelectionChanged`
- `AccountingDrilldownPrepared`
- `AccountingDrilldownBlocked`
- `ExportArtifactRequested`
- `ExportArtifactStored`
- `ExportArtifactDelivered`
- `ExportArtifactFailed`
- `FreshnessCheckpointObserved`
- `AccountingRowMarkedStale`
- `MaskingApplied`
- `RevealGranted`
- `RevealDenied`
- `BulkActionSubmitted`
- `BulkActionRejected`
- `CorrectionCaseStartedFromWorkbench`

## Kanoniska route-familjer

Tillåtna route-familjer:
- read-only workbench routes
- snapshot-scopeade reporting routes
- export artifact routes
- command submission routes
- support reveal routes
- audit/read receipt routes

Uttryckligen förbjudna route-familjer:
- routes som skriver legal truth via raw request payload
- routes som returnerar oscopead blandning av live och locked data
- routes som returnerar raw `detailPayload` eller `workbenchPayload` som canonical ytsanning

## Kanoniska permissions och review boundaries

Miniminivaer:
- `accounting_viewer`
  - läsa tillaten accounting view inom tenant och scope
- `accounting_operator`
  - skapa draft, starta reconciliation, begara export
- `accounting_reviewer`
  - läsa locked artifacts, signera vissa review-steg, godkänna vissa bulk requests
- `accounting_controller`
  - locka rapportsnapshot, starta correction-case, initiera reopen-begaran
- `accounting_admin`
  - konfigurera saved views, thresholds och policybundna settings
- `support_restricted`
  - läsa maskad metadata, aldrig reveal som default
- `support_reveal_approved`
  - tidsbegransad reveal med watermark, approval ref och full audit receipt
- `auditor_readonly`
  - läsa locked snapshots och exports, aldrig driva corrections

Step-up eller second review krav:
- support reveal av PII eller lönekanslig data
- reopen request
- export av locked report package
- bulk action som kan driva legal-effect mutation downstream

## Nummer-, serie-, referens- och identitetsregler

- bokföringssidan får aldrig generera syntetiska verifikationsnummer
- visade verifikationsreferenser ska komma från canonical ledger
- page-local `rowId` får bara vara teknisk presentation identity och får aldrig ersätta legal identity
- varje export artifact ska ha eget `artifactId`, `artifactDigest` och `storageRef`
- saved views ska ha stabil `savedViewId` men får aldrig vara legal reference
- drilldown receipts ska ha eget `drilldownReceiptId`

## Valuta-, avrundnings- och omräkningsregler

- alla totalsummor på sidan ska visa accounting currency som primär totalsanning
- transaction currency får visas sekundart per rad eller per group
- blandade transaktionsvalutor får inte summeras utan uttrycklig omräkningsregel
- locked snapshot ska visa exakt den omräkningsgrund som gäller för snapshotet
- live view ska visa aktuell canonical omräkning och timestamp för kurskalla om den är relevant för ytan

## Replay-, correction-, recovery- och cutover-regler

- bokföringssidan får inte skapa ny legal truth vid page refresh, retry eller replay
- samma `ExportRequest` med samma scope och samma artifact policy får inte skapa flera giltiga artifacts utan lineage
- correction från raden ska alltid skapa nytt case, aldrig inline overwrite
- vid restore eller rebuild ska workbench kunna återbildas deterministiskt från canonical projections och checkpoints
- cutover får aldrig dölja att en rad kommer från migrerad sanning; migration lineage ska vara synlig i detailpanel

## Huvudflödet

Huvudflödet ska vara:
1. användaren öppnar bokföringssidan
2. tenant, fiscal year och period/snapshot scope resolveras
3. systemet laddar canonical `AccountingWorkbenchView`
4. freshness checkpoints och permissionbeslut appliceras
5. raden eller rapportsektionen renderas med state badge och issue badges
6. användaren borra via drilldown som är scopead till samma snapshot eller uttryckligt live scope
7. användaren kan begara export, starta correction-case eller skapa draft via command
8. alla skrivande actions ger actor receipt och audit receipt

## Bindande scenarioaxlar

Bokföringssidan måste korsas minst över dessa scenarioaxlar:
- `live` vs `locked_snapshot`
- `open_period` vs `locked_period`
- `fresh` vs `stale`
- `single_entity` vs `multi_entity_scope`
- `sek_only` vs `foreign_currency_present`
- `no_dimensions` vs `dimensions_required`
- `full_access` vs `masked` vs `blocked`
- `normal_view` vs `support_reveal`
- `clean_state` vs `missing_proof` vs `reopened`

## Bindande policykartor

### A. Read-model policy
- `general_ledger_panel` -> only `GeneralLedgerProjection`
- `verification_list_panel` -> only `VerificationListProjection`
- `ar_panel` -> only `AccountsReceivableProjection`
- `ap_panel` -> only `AccountsPayableProjection`
- `vat_panel` -> only `VatReturnProjection` eller locked VAT snapshot
- `tax_account_panel` -> only `TaxAccountProjection`
- `payroll_panel` -> only payroll-proof-aware projection
- `close_panel` -> only close package projection och artifact receipts

### B. Badge policy
- `live`
- `preliminary`
- `locked`
- `superseded`
- `reopened`
- `stale`
- `blocked`
- `masked`
- `migration_lineage`

### C. Export policy
- varje exportknapp måste deklarera om den ger `live_export`, `snapshot_export`, `audit_package` eller `download_existing_locked_artifact`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

Detta dokument skapar inte ny ledgerposting, men det äger ytfacit mot proof-ledger.

Varje radtyp måste kunna bindas till minst ett av följande expected outcome-spAr:
- `voucher_lines[]`
- `subledger_state`
- `vat_box_values[]`
- `agi_field_values[]`
- `tax_account_movements[]`
- `close_artifact_refs[]`
- `export_artifact_receipts[]`

Om ytan inte kan harleda raden till minst ett sadant spAr ska raden vara `blocked_unknown`, inte grön.

## Bindande rapport-, export- och myndighetsmappning

Bokföringssidan måste kunna exponera eller starta artefakter för minst:
- huvudbok
- grundbok/verifikationslista
- provbalans
- momsrapport
- AGI-underlag där tillämpligt
- kundreskontra
- leverantörsreskontra
- SIE-export
- audit export
- year-end package

Regel:
- om exporten bygger på locked snapshot ska hela drilldown- och artifactkedjan vara snapshot-scopead
- om exporten är live ska den vara markerad som live och inte fa utges som locked legal artifact

## Bindande scenariofamilj till proof-ledger och rapportspar

Minst följande scenariofamiljer måste finnas:
- `WB-A` allman huvudboksvy
- `WB-B` verifikationslista med drilldown
- `WB-C` reskontra och öppna poster
- `WB-D` moms och momsrutor
- `WB-E` close och year-end package
- `WB-F` stale/missing checkpoint
- `WB-G` masked/reveal
- `WB-H` foreign currency and FX details
- `WB-I` dimension/object filtered views
- `WB-J` export artifact lifecycle

## Tvingande dokument- eller indataregler

För att sidan ska fa öppnas måste minst följande vara explicit eller resolverbart:
- `tenantId`
- `fiscalYearId`
- `accountingViewFamily`
- `scopeMode` = `live | preliminary_snapshot | locked_snapshot`
- permission context

För locked snapshot krävs dessutom:
- `snapshotId`
- `artifactLineageRef`
- `snapshotCreatedAt`
- `snapshotDigest`

## Bindande legal reason-code-katalog eller specialorsakskatalog

Minst följande reason codes måste finnas på ytan:
- `stale_projection`
- `unknown_freshness`
- `permission_masked`
- `support_reveal_required`
- `snapshot_mismatch`
- `missing_proof_binding`
- `legal_context_missing`
- `reopen_under_review`
- `export_not_materialized`
- `artifact_superseded`
- `migration_lineage_present`

## Bindande faltspec eller inputspec per profil

Minst följande kolumner eller detailfA lt måste kunna renderas för relevanta radtyper:
- object family
- legal date
- posting date
- fiscal period
- series
- voucher number or legal reference
- counterparty
- ledger account or report field ref
- amount in accounting currency
- amount in transaction currency där relevant
- state badge
- freshness badge
- snapshot ref
- artifact ref
- correction lineage
- dimension/object summary

Minst följande filter måste finnas där de är relevanta:
- fiscal year
- period or as-of
- snapshot mode
- object family
- account interval
- counterparty
- dimension/object
- currency
- state badge
- stale/blocked only
- corrected/reopened only

## Scenariofamiljer som hela systemet måste tacka

- öppna sida i live-lage
- öppna sida i locked snapshot-lage
- stale checkpoint på en del av ytan
- maskerad rad med support-reveal
- export av locked huvudbok
- export blocked pga saknad artifact
- correction case startad från rad
- reopen-begaran från close-rad
- drilldown till reskontra från huvudbok
- dimensionfilter med object-specific totals

## Scenarioregler per familj

### `WB-A` huvudbok
- ska låsa canonical ledger projection
- ska visa series och voucher number exakt
- ska blockera om proof binding saknas

### `WB-B` verifikationslista
- drilldown får inte visa annan truth an den listan bygger på
- locked lista ska ge locked drilldown

### `WB-C` reskontra
- öppna poster ska kunna bindas till subledger state
- write-off eller correction ska vara tydligt markerad

### `WB-D` moms
- momsruta ska kunna bindas till reporting snapshot eller live scope
- ruta får inte visas som green om underlaget är stale eller missing

### `WB-E` close
- period- och year-end-status ska visa blockeringsorsaker explicit
- reopen får endast startas via command

### `WB-F` stale
- stale rad ska ha badge, tooltip/reason code och blockregel för kritiska exports

### `WB-G` masked
- masked data får inte avmaskas av page refresh eller saved view

### `WB-H` FX
- accounting currency och transaction currency ska visas separat

### `WB-I` dimension
- filtrering på dimension/object får inte tappa totalsanning eller skapa shadow sums

### `WB-J` export
- artifact receipt ska visas med digest, scope, actor och status

## Blockerande valideringar

- öppning av locked snapshot utan `snapshotId` är förbjuden
- drilldown från locked snapshot till live data är förbjuden
- export av locked artifact utan materialiserat artifact receipt är förbjuden
- rad utan proof-binding är förbjuden att markera som fresh
- masked data får inte exponer as i download om reveal inte finns
- stale `general_ledger` eller `verification_list` ska blockera legal export
- blandad scope i samma grid utan tydlig badge är förbjuden

## Rapport- och exportkonsekvenser

- `live_export` ska markeras som live
- `snapshot_export` ska markeras med snapshotId och digest
- `audit_package` ska inkludera artifact lineage och actor receipts
- `download_existing_locked_artifact` får bara ladda existerande artifact, inte skapa ny dold variant

## Förbjudna förenklingar

- implicit `latest` utan datum eller snapshotlabel
- fake PDF, fake XLSX eller memory-only artifact
- inline edit av posted truth
- raw `detailPayload` som ytsanning
- automatisk grön status när freshness är okand
- live-drilldown från locked report utan uttrycklig avvikelsebadge
- oscopeade saved views som korsar tenants, periods eller snapshots

## Fler bindande proof-ledger-regler för specialfall

- om en rad avser correction eller reversal måste original reference visas
- om en rad avser migration måste migration lineage visas
- om en rad avser reopened period måste close-status, reopen-case och pending re-close synas

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

Varje radtyp ska kunna beskriva minst en state-effekt:
- `ar_open_item_state`
- `ap_open_item_state`
- `vat_snapshot_state`
- `tax_account_state`
- `pay_run_state`
- `close_package_state`
- `export_artifact_state`

## Bindande verifikations-, serie- och exportregler

- verifikationsserier ska visas exakt som ledger äger dem
- exports ska visa artifact scope och digest
- samma scope får inte producera flera samtidiga `authoritative_locked_artifact` utan supersession lineage

## Bindande variantmatris som måste korsas mot varje scenariofamilj

Varje scenariofamilj måste korsas mot minst:
- `live | locked_snapshot`
- `fresh | stale | blocked_unknown`
- `masked | unmasked`
- `sek_only | fx_present`
- `dimensionless | dimension_bound`
- `viewer | operator | reviewer | controller | support_reveal`

## Bindande fixture-klasser för bokföringssidan och financial workbench

- `WBX-001` clean live ledger view
- `WBX-002` locked snapshot ledger view
- `WBX-003` stale projection view
- `WBX-004` masked payroll row
- `WBX-005` dimension filtered revenue view
- `WBX-006` export artifact lifecycle
- `WBX-007` reopen pending close row
- `WBX-008` migration lineage row

## Bindande expected outcome-format per scenario

Varje scenario ska minst ge:
- `viewScope`
- `rowSetDigest`
- `stateBadges[]`
- `freshnessOutcome`
- `proofBindings[]`
- `drilldownScope`
- `exportOutcome`
- `commandAvailability`
- `blockingReasons[]`

## Bindande canonical verifikationsseriepolicy

Bokföringssidan ska visa men aldrig aga verifikationsserier.

Regel:
- inga syntetiska seriesammanslagningar
- inga UI-genererade ersättningsnummer
- sortering får inte förändra canonical seriesekvens

## Bindande expected outcome per central scenariofamilj

- `WB-A001` live huvudbok -> fresh live projection, inga locked badges
- `WB-B001` locked verifikationslista -> locked badge, locked drilldown, export via existing artifact eller ny locked artifact request
- `WB-F001` stale checkpoint -> stale badge, export blocked för legal artifact
- `WB-G001` masked lönerad -> masked columns, reveal unavailable utan approval
- `WB-J001` export requested -> receipt with `requested`, senare `stored` eller `failed`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `WB-A*` -> canonical ledger projection
- `WB-B*` -> verification list + drilldown proof
- `WB-C*` -> subledger-state-bound rows
- `WB-D*` -> VAT/report-proof-bound rows
- `WB-E*` -> close package and reopen state
- `WB-F*` -> stale and checkpoint handling
- `WB-G*` -> masking and reveal handling
- `WB-H*` -> FX presentation rules
- `WB-I*` -> dimension/object presentation rules
- `WB-J*` -> export artifact lifecycle

## Bindande testkrav

Minst följande testklasser är blockerande:
- projection contract tests
- locked snapshot drilldown tests
- freshness checkpoint tests
- masking and reveal tests
- export artifact equality tests
- permission boundary tests
- stale blocks legal export tests
- mixed-scope rejection tests
- scenario proof tests mot accounting proof ledger

## Källor som styr dokumentet

- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md`
- `RAPPORTER_MOMS_AGI_RESKONTRA_HUVUDBOK_BINDANDE_SANNING.md`
- `SEARCH_ACTIVITY_NOTIFICATIONS_OCH_WORKBENCHES_BINDANDE_SANNING.md`
- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md`
- `SUPPORT_BACKOFFICE_INCIDENTS_OCH_REPLAY_BINDANDE_SANNING.md`
- `06_RELEASE_GATES_OCH_ACCEPTANSKRAV.md`
