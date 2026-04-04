# DOMAIN_15_ROADMAP

## mal

Bygg om Domän 15 från dagens cockpit- och evidensskal till en verklig svensk migrations- och cutovermotor som:
- upptacker kalla och source family med evidens
- knyter auth, consent, scopes och capability detection till migrationssanning
- extraherar till canonical datasets med lineage, checksummor och cutoff-basis
- importerar deterministiskt till riktiga targetdomäner med duplicate- och double-counting-guards
- kor verklig parallel run, final extract, delta extract, switch, watch window och rollback
- stöder bureau multi-client drift och saker trial/live-promotion

## varfor domänen behovs

Utan denna domän gör det inte att sakert flytta ett svenskt bolag från tidigare system till ny canonical truth utan risk för:
- fel ingående balanser
- fel open items
- fel YTD, AGI eller skattekontohistorik
- felaktig trial/live-promotion
- falsk rollbackberedskap
- oreglerad radatafarvaring
- byradrift som ser skalbar ut men saknar verklig canonical motor

## bindande tvärdomänsunderlag

- `FAKTURAFLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migration av issued invoices, credits, settlements, customer balances och historical invoice artifacts.
- `LEVERANTORSBETALNINGAR_OCH_LEVERANTORSRESKONTRA_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migration av leverantörsreskontra efter posting, supplier advances, historical AP-settlement, returned payments, payment fees, FX och exported-but-not-booked supplier payment batches.
- `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migration av bankkonto, statement imports, bankline identities, reconciliation outcomes, bank-owned postings och historical bank balances.
- `MOMSFLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migration av momsbeslut, box truth, periodisk sammanställning, OSS, importmoms, replacement-declaration lineage och historical VAT receipts.
- `SKATTEKONTOFLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migration av skattekontotransaktioner, `1630`-mirror, ränta, anstånd, refunds, payout blocks och historical authority receipts.
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av vouchers, serier, öppningsbalanser, kontrollkonton, correction lineage, period states och SIE4-vouchertruth.
- `PERIODISERING_OCH_BOKSLUTSOMFORINGAR_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av interimkonton, closing adjustments, reversal schedules, framework-bound simplifications och historical cutoff-decisions.
- `ANLAGGNINGSTILLGANGAR_OCH_AVSKRIVNINGAR_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av asset cards, anskaffningsvarden, ackumulerade avskrivningar, impairments, disposals och historical asset-ledger.
- `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av opening inventory, ownership profile, valuation method, count-baseline, inkuranshistorik och carrying value.
- `INKOP_VARUMOTTAG_OCH_LEVERANSMATCHNING_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av open PO, supplier confirmations, received-not-invoiced, invoice-before-receipt holds, ownership acceptance och match history.
- `ORDER_OFFERT_AVTAL_TILL_FAKTURA_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av quotes, agreements, orders, change orders, billing triggers och invoice handoff history.
- `PROJEKT_WIP_INTAKTSAVRAKNING_OCH_LONSAMHET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av project roots, WIP snapshots, recognition decisions, billable readiness och profitability history.
- `ARBETSORDER_TID_MATERIAL_OCH_FAKTURERBARHET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av work orders, time captures, material captures, signoff refs, billable decisions och invoice handoff history.
- `KVITTOFLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migration av digitala och pappersburna receipts, receipt-driven verifikationer, duplicate detection, originalformatbevarande och historical receipt corrections/refunds.
- `LONEFLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av pay calendars, payroll input snapshots, pay runs, payslips, corrections, final-pay cases, employee receivables, payout readiness och replay-safe payroll history.
- `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av pay item catalog, account profiles, line effect classes, BAS-lönekonton, deduction anchors, receivable anchors och accrued-payroll anchors.
- `PRELIMINARSKATT_OCH_SKATTETABELLER_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av frozen tax decisions, table references, one-time tax basis, jamkningsbeslut, SINK/A-SINK evidence och no-tax certificate lineage.
- `ARBETSGIVARAVGIFTER_OCH_SPECIALREGLER_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av contribution decisions, age-regime evidence, temporary reduction windows, växa-support linkage och historical contribution basis.
- `FORMANER_OCH_FORMANSBESKATTNING_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av benefit cases, valuation snapshots, ownership decisions, taxable-vs-tax-free lineage och payroll benefit handoff history.
- `RESOR_TRAKTAMENTE_OCH_MILERSATTNING_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av travel cases, itinerary snapshots, traktamentsbeslut, meal reductions, mileage resolutions och travel payroll handoff history.
- `PENSION_OCH_LONEVAXLING_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av pension arrangements, salary exchange agreements, top-up policy refs, special payroll tax lineage och pension payroll handoff history.
- `SEMESTER_SEMESTERSKULD_OCH_SEMESTERERSATTNING_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av semesterår, intjäningsprofiler, sparade dagar, semesterlonsbeslut, förskottssemesterrecovery och semesterskuldshistorik.
- `SJUKLON_KARENS_OCH_FRANVARO_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av sjukperioder, karensbeslut, deltidsfrånvaro, läkarintygsstatus, högriskskyddsbeslut och sjuk-payroll-handoffs.
- `LONEUTMATNING_OCH_ANDRA_MYNDIGHETSAVDRAG_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av myndighetsbeslut, löneutmatningshistorik, remitteringar, superseded orders och öppna myndighetsskulder.
- `NEGATIV_NETTOLON_OCH_EMPLOYEE_RECEIVABLE_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av negative-net cases, employee receivables, settlement history, bankrepayments och blockerade kvittningsfall.
- `LONEUTBETALNING_OCH_BANKRETURER_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av payroll payout batches, settlement receipts, returned salary payments, reopened liabilities och reissue history.
- `AGI_FLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av AGI-perioder, huvuduppgifter, individuppgifter, receipts, correction chains, removal cases och frånvarotransfereringar.
- `AGI_FALTKARTA_OCH_RATTELSER_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av AGI-faltrutor, skattefaltsklassning, huvuduppgiftssummor, adjustment-rutor och historical field-map versions.
- `SKATTEKONTOMAPPNING_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av `1630`-mirror, authority-event-klassning, payroll/VAT-clearing mot skattekonto, HUS/grön-offsets och unknown authority event blockers.
- `VERIFIKATIONSSERIER_OCH_BOKFORINGSPOLICY_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av verifikationsserier, voucher identity, reservationsluckor, correction policy, posting date policy och SIE4-serieparitet.
- `VALUTA_OMRAKNING_OCH_KURSDIFFERENS_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av redovisningsvaluta, historical rate lineage, omräkningsdatum, FX gain/loss, period-end valuation och rounding.
- `LEGAL_REASON_CODES_OCH_SPECIALTEXTPOLICY_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av legal basis, specialtexter, reason-code-lineage, HUS/grön claims och historical invoice reason payloads.
- `ROT_RUT_HUS_FLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av HUS-cases, buyer allocations, split-invoice receivables, claim versions, decisions, payouts, tax-account-offsets och recovery chains.
- `GRON_TEKNIK_FLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av green-tech cases, installation lines, split-invoice receivables, claim versions, decisions, payouts, tax-account-offsets, VAT timing decisions och recovery chains.
- `ARSBOKSLUT_ARSREDOVISNING_OCH_INK2_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av hard-close states, årsredovisningspaket, K2/K3-classification, INK2/INK2R/INK2S sets, uppskjuten-skatt decisions, filing evidence och årsbokslutskedjor.
- `AGARUTTAG_UTDELNING_KU31_OCH_KUPONGSKATT_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering av utdelningsbeslut, equity sources, owner liabilities, KU31 data, kupongskattekedjor och owner-distribution evidence.
- `SIE4_IMPORT_OCH_EXPORT_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering via SIE typ 4, voucher serialization, `#RAR`, `#KONTO`, `#VER`, `#TRANS`, dimensionsmetadata och roundtrip/parity-evidence.
- `RAPPORTER_MOMS_AGI_RESKONTRA_HUVUDBOK_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migrering och parity för momsrapporter, AGI-underlag, reskontror, huvudbok, verifikationslista och balans- eller resultatuppstallningar.
- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör migration evidence, cutover sign-off, delegated approvals, support reveal och break-glass lineage.
- `MIGRATION_PARALLELLKORNING_CUTOVER_OCH_ROLLBACK_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör source bindings, capability receipts, extract manifests, canonical datasets, import batches, parallel run, cutover, watch window, rollback, fail-forward och migration parity.

## faser

- Fas 15.1 source-discovery / family-detection hardening
- Fas 15.2 source-connection / consent / capability-detection hardening
- Fas 15.3 cutoff-basis / date-hierarchy hardening
- Fas 15.4 wave-1 ingress canonicalization hardening
- Fas 15.5 canonical-dataset / lineage / raw-artifact governance hardening
- Fas 15.6 mapping / auto-mapping / confidence / blocker-code hardening
- Fas 15.7 variance / materiality / waiver / signoff hardening
- Fas 15.8 target-write / identity-resolution / duplicate / double-count hardening
- Fas 15.9 import-execution / domain-landing / idempotency hardening
- Fas 15.10 parallel-run / parity / threshold hardening
- Fas 15.11 cutover-plan / final-extract / delta-extract / switch hardening
- Fas 15.12 rollback / restore / checkpoint / compensation hardening
- Fas 15.13 post-cutover correction / watch-window hardening
- Fas 15.14 payroll-history / YTD / AGI / balance landing hardening
- Fas 15.15 bureau-portfolio / delegated-approval / cohort hardening
- Fas 15.16 trial-live-promotion / non-in-place isolation hardening
- Fas 15.17 route / surface / runbook / seed / legacy purge
- Fas 15.18 Swedish source priority / competitor migration friction hardening

## dependencies

- Domän 1 för canonical persistence, event lineage, idempotency och replay-safe runtime
- Domän 2 för secrets, consent, provider auth, trust levels och encryption
- Domän 3-6 för ledger, AP/ÄR, VAT, banking och tax-account truth som migrationen måste landa i
- Domän 8-10 för HR, balances, payroll, AGI och benefits/travel/pension truth
- Domän 13 för cockpit/workbench/reporting/search runt migration operations
- Domän 14 för integrations control plane och svenska ingressadapters
- Domän 16 för support/backoffice/replay/incident/runbook-driven operations

## vad som för koras parallellt

- 15.1 och 15.17 kan delvis koras parallellt eftersom discoverynamngivning och route/runbook-rensning måste läsas tidigt.
- 15.2 kan koras parallellt med borjan av 15.4 när profile- och connectionmodell är last.
- 15.5 kan koras parallellt med design av 15.6 och 15.8, men inga live-importer för ga över innan 15.5 är klar.
- 15.10 kan koras parallellt med 15.13 och 15.15 efter att canonical dataset och landing receipts finns.
- 15.16 kan hårda tenant-control-promotion samtidigt som 15.11-15.13 byggs, men får inte markas klar före cutover/rollback-sanningen.

## vad som inte för koras parallellt

- 15.4 får inte markas klar före 15.1-15.3.
- 15.8 och 15.9 får inte markas klara före 15.5-15.7.
- 15.10 får inte markas klar före 15.5 och 15.9.
- 15.11 och 15.12 får inte markas klara före 15.10.
- 15.14 får inte markas klar före 15.8, 15.9 och Domän 10:s payrolltruth.
- 15.15 får inte markas klar före 15.1-15.12.
- 15.16 får inte markas klar före 15.11-15.12.
- 15.18 får inte markas klar före 15.1, 15.4 och 15.17.

## exit gates

- source discovery finns som verklig runtime och blockerar ambiguous eller unsupported källor
- wave-1-ingressfamiljer gör genom samma canonical extract/dataset-path
- canonical datasets, lineage, checksummor, cutoff-basis och raw-artifact registry är first-class
- target write semantics, duplicate detection och double-counting guards är first-class och bevisade
- parallel run räknas av motorn själv, inte av caller
- final extract, delta extract, switch, watch window och rollback är tekniskt verkliga
- payroll migration landar verklig payrolltruth eller är tydligt avgränsad som partiell lane
- bureau migrations och trial/live-promotion är sakra, auditerade och skalbara

## test gates

- en samma source truth via SIE4 och API måste kunna ge samma canonical dataset-checksum där scope overlappar
- samma importfarsak med samma idempotency key får inte skapa dubbellanding
- parallel run ska faila när source/target-deltas overskrider thresholds och passera farst efter verklig acceptance
- final extract ska ge immutable artifact med checksum och manifest som används av switch
- rollback ska visa verklig restore- eller compensation-kedja med receipts och blockerande policy för regulated history
- payroll migration ska bevisa landing, diff, approve, finalize och rollback i rätt domäner

## delfaser

### Delfas 15.1 source-discovery / family-detection hardening
- markering: replace
- dependencies:
  - blockerar nastan allt efterat
- vad som för koras parallellt:
  - 15.17
  - delar av 15.18
- vad som inte för koras parallellt:
  - ingen wave-1-adapter för markas live före denna delfas
- exit gates:
  - `SourceSystemProfile` finns i DB och runtime
  - discovery kan klassificera minst `api_gl`, `sie4_file`, `csv_template`, `excel_template`, `bureau_bundle`, `documents_only`
  - ambiguous family ger blocker code, aldrig tyst fallback
- konkreta verifikationer:
  - giltig SIE4-fil ska ge `familyCode=sie4_file`
  - okand zip utan manifest ska ge `source_family_unknown`
  - CSV med fel fingerprint ska ge blocker i stallet för manuell gissning
- konkreta tester:
  - unit för SIE header, CSV fingerprint och bundle manifest detection
  - integration för discovery-API med blocker vid ambiguity
  - e2e där one-click bara skapar discovery + dry-run-initiering
- konkreta kontroller vi måste kunna utfora:
  - samma artifact ska alltid ge samma discovery checksum
  - ändrad header ska ge ny fingerprint
  - documents-only för aldrig markas som full economic truth

### Delfas 15.2 source-connection / consent / capability-detection hardening
- markering: harden
- dependencies:
  - 15.1
- vad som för koras parallellt:
  - 15.4
  - 15.17
- vad som inte för koras parallellt:
  - extract-jobb får inte markas live före effective consent-status
- exit gates:
  - `SourceConnection`, `ConsentGrant` och `CapabilitySnapshot` finns
  - expiry och revocation blockerar extract
  - source capabilities harleds från discovery + auth + provider metadata
- konkreta verifikationer:
  - expired consent ska blockera extract
  - scope-reduktion på Fortnox/Visma-liknande connection ska sanka capabilities
  - file-only bureau-bundle ska kunna vara giltig utan OAuth
- konkreta tester:
  - unit för effective consent-status
  - integration för connection health med expiry blocker
  - regression för scope change -> new capability snapshot
- konkreta kontroller vi måste kunna utfora:
  - lista connections där `expiresAt < now` och se att none är extractable
  - visa capability diff före/efter reauth
  - bevisa att revokerad consent inte räknas som readiness

### Delfas 15.3 cutoff-basis / date-hierarchy hardening
- markering: replace
- dependencies:
  - 15.1
  - 15.2
- vad som för koras parallellt:
  - 15.5
- vad som inte för koras parallellt:
  - inga import- eller cutover-planer för godkännas innan central cutoffmodell finns
- exit gates:
  - `CutoffBasis` finns med extract-, opening balance-, journal-, open item-, payroll-, AGI-, diff-, freeze-, final extract- och switchdatum
  - varje dataset och landing receipt bör cutoff-basis-version
- konkreta verifikationer:
  - opening balance med fel datum ska blockeras före landing
  - open-item cutoff som overlappar journal history ska blockeras
  - AGI-period och YTD-period mismatch ska ge blocker
- konkreta tester:
  - unit för cutoff precedence per dataset family
  - integration där mixed cutoff under samma plan blockeras
  - e2e där switch nekas när final extract inte matchar freeze-basis
- konkreta kontroller vi måste kunna utfora:
  - läsa ut en hel plan och se en enda cutoff-basis-version
  - verifiera att diff och import använder samma basis-hash
  - bevisa att payroll, tax-account och opening balances inte blandar periodlogik

### Delfas 15.4 wave-1 ingress canonicalization hardening
- markering: rewrite
- dependencies:
  - 15.1
  - 15.2
  - 15.3
- vad som för koras parallellt:
  - adapterarbete per familj efter att canonical schema är last
- vad som inte för koras parallellt:
  - inga wave-2/3-adapters före wave-1 är verkliga
- exit gates:
  - SIE4, API GL, CSV template, Excel template och bureau bundle producerar `ExtractManifest`
  - unsupported format leder till blocker eller explicit review path
  - alla wave-1-ingressvagar bör provider/source fingerprints och artifact refs
- konkreta verifikationer:
  - samma källsanning via SIE4 och API ska ge samma relevanta dataset-checksum
  - bureau bundle utan manifest checksum ska blockeras
  - CSV utan obligatorisk kolumn ska blockeras
- konkreta tester:
  - unit för strict SIE parsing och CSV schema lint
  - integration för API extract -> manifest -> dataset creation
  - e2e för one-click dry run mot SIE4 och API
- konkreta kontroller vi måste kunna utfora:
  - jamfora rowCount/checksum mellan ingressfamiljer
  - visa artifact fingerprint och manifest-linje till dataset
  - verifiera att Excel/CSV-template version är explicit last

### Delfas 15.5 canonical-dataset / lineage / raw-artifact governance hardening
- markering: replace
- dependencies:
  - 15.3
  - 15.4
- vad som för koras parallellt:
  - 15.6
  - 15.8
- vad som inte för koras parallellt:
  - ingen live-import utan frysta datasetfamiljer
- exit gates:
  - `ExtractManifest`, `CanonicalDataset`, `DatasetLineageEdge`, `RawSourceArtifact` finns
  - obligatoriska datasetfamiljer finns för ledger/balances/open items/VAT/bank/tax-account/payroll/projects/shareholder history
  - raw artifacts har checksum, retention profile, encryption policy och access boundary
- konkreta verifikationer:
  - ändrad källrad ska ändra dataset-checksum
  - samma ofarandrade extract ska ge samma checksum
  - saknat kritiskt dataset ska blockera acceptance
- konkreta tester:
  - unit för lineage och checksumkedja
  - integration för manifest -> dataset -> evidence bundle
  - failure test för missing dataset family
- konkreta kontroller vi måste kunna utfora:
  - spara target object tillbaka till source artifact
  - lista alla raw artifacts för en plan med retentionklass
  - verifiera att waiver inte kan dolja saknat dataset

### Delfas 15.6 mapping / auto-mapping / confidence / blocker-code hardening
- markering: replace
- dependencies:
  - 15.5
- vad som för koras parallellt:
  - 15.7
- vad som inte för koras parallellt:
  - inga approved mapping sets utan coverage truth
- exit gates:
  - `MappingSet`, `AutoMappingCandidate`, `FieldCoverageReceipt` och `BlockedFieldDecision` finns
  - varje mapping set visar coverage, confidence och blocked fields
  - manuella overrides måste vara explicit evidensburna
- konkreta verifikationer:
  - sourcefalt utan target mapping ska synas som blocked coverage
  - low-confidence candidate ska krava review
  - override ska ge receipt, inte tyst mutation
- konkreta tester:
  - unit för confidence scoring och override guard
  - integration för mapping approval med blocked field deny
  - regression för samma source schema -> samma candidate ranking
- konkreta kontroller vi måste kunna utfora:
  - lista alla blocked fields innan import
  - visa varfor en candidate valdes
  - bevisa att override inte kan radera source lineage

### Delfas 15.7 variance / materiality / waiver / signoff hardening
- markering: rewrite
- dependencies:
  - 15.5
  - 15.6
- vad som för koras parallellt:
  - 15.10
- vad som inte för koras parallellt:
  - go-live- eller cutover-acceptance får inte byggas klart före denna delfas
- exit gates:
  - diffar räknas från canonical source + target truth
  - `VarianceReport`, `VarianceItem`, `WaiverRecord`, `MaterialityDecision` finns
  - waivers är tidsboxade, motiverade och signerade
- konkreta verifikationer:
  - material diff ska blockera acceptance tills antingen last eller godkänd waiver finns
  - samma source/target med ofarandrad cutoff ska ge samma variance-report checksum
  - caller ska inte kunna injicera skillnader direkt
- konkreta tester:
  - unit för materiality classes
  - integration för variance generation från datasets
  - e2e för waiver-livscykel med expiry
- konkreta kontroller vi måste kunna utfora:
  - visa full lineage för varje blockerande diff
  - lista alla öppna waivers med expiry
  - bevisa att diffen genereras av motorn, inte requestpayload

### Delfas 15.8 target-write / identity-resolution / duplicate / double-count hardening
- markering: replace
- dependencies:
  - 15.5
  - 15.6
- vad som för koras parallellt:
  - 15.14
- vad som inte för koras parallellt:
  - ingen production-import före explicit target-policy per object family
- exit gates:
  - create/merge/replace/block finns per object family
  - canonical identity resolution finns för kunder, leverantörer, employees, projects, open items och shareholder history
  - double-counting guards finns mellan ingressfamiljer
- konkreta verifikationer:
  - samma kund via SIE4 och API får inte skapas dubbelt
  - samma open item via CSV och bureau bundle ska blockeras eller resolvas deterministiskt
  - conflicting supplier bank details ska följa policy, inte implicit overwrite
- konkreta tester:
  - unit för identity resolution matrix
  - integration för duplicate import across source families
  - regression för double-count guard across SIE4/API
- konkreta kontroller vi måste kunna utfora:
  - läsa ut vilken write policy som användes per target object
  - bevisa att samma external ref inte skapar ny canonical identitet
  - visa blocker codes för merge-konflikter

### Delfas 15.9 import-execution / domain-landing / idempotency hardening
- markering: replace
- dependencies:
  - 15.5
  - 15.8
- vad som för koras parallellt:
  - 15.14 för payrollspecifik landing
- vad som inte för koras parallellt:
  - inga import batches för längre bara hoppa status utan receipts
- exit gates:
  - `ImportBatchExecution`, `ImportWriteReceipt`, `LandingFailureRecord` och `ImportReplayReceipt` finns
  - varje landing skriver till riktig targetdomän via commands
  - idempotency fungerar per batch, per object family och per source object
- konkreta verifikationer:
  - samma batch med samma idempotency key ska återlamna befintligt receipt
  - partial failure ska ge replayable landing-failures, inte oklar status
  - import receipt ska visa exakt vilka objects som skrevs
- konkreta tester:
  - unit för idempotency per object family
  - integration för failed landing -> replay
  - e2e för SIE4/API/CSV batch -> target receipts
- konkreta kontroller vi måste kunna utfora:
  - lista alla target receipts per batch
  - replaya bara failed objects
  - visa att `runImportBatch` inte längre kan ga green utan target writes

### Delfas 15.10 parallel-run / parity / threshold hardening
- markering: replace
- dependencies:
  - 15.7
  - 15.9
- vad som för koras parallellt:
  - 15.13
  - 15.15
- vad som inte för koras parallellt:
  - cutover acceptance får inte bygga på caller-supplied metrics längre
- exit gates:
  - `ParallelRunPlan`, `ParallelRunMeasurement`, `ParityDecision` och `ThresholdProfile` finns
  - measurements räknas av motorn från source + target receipts
  - acceptance kraver riktig threshold evaluation och manuell signoff där policy kraver det
- konkreta verifikationer:
  - över threshold ska ge blockerad parallel run
  - inom threshold men med manual-review policy ska krava acceptance
  - olika cutoff-basis ska ge blockerad parity
- konkreta tester:
  - unit för threshold evaluation
  - integration för engine-generated metrics
  - e2e för finance/payroll parity acceptance
- konkreta kontroller vi måste kunna utfora:
  - visa exakt varifran varje metric kommer
  - bevisa att source och target bygger på samma basis
  - läsa ut varfor en run blev `completed`, `manual_review_required` eller `blocked`

### Delfas 15.11 cutover-plan / final-extract / delta-extract / switch hardening
- markering: replace
- dependencies:
  - 15.9
  - 15.10
- vad som för koras parallellt:
  - 15.13
  - 15.16
- vad som inte för koras parallellt:
  - ingen bred live-promotion före denna delfas
- exit gates:
  - `CutoverPlan`, `FinalExtractArtifact`, `DeltaExtractArtifact`, `SwitchReceipt`, `FreezeWindowState` finns
  - final extract producerar immutable manifest + dataset checksum
  - switch gör verklig truth handoff med receipt
- konkreta verifikationer:
  - final extract ska ge artifact hash och dataset lineage
  - delta extract ska visa endast ändringar efter freeze
  - switch ska blockeras om final extract och parity inte matchar
- konkreta tester:
  - unit för delta extract selection
  - integration för final extract -> validation -> switch
  - e2e för cutover with watch window start
- konkreta kontroller vi måste kunna utfora:
  - exportera switch receipt med source/target refs
  - verifiera att source writes är frysta under freeze window
  - bevisa att no-op switch inte kan gamma missad final extract

### Delfas 15.12 rollback / restore / checkpoint / compensation hardening
- markering: replace
- dependencies:
  - 15.11
  - Domän 16 restore/replay truth
- vad som för koras parallellt:
  - 15.13
- vad som inte för koras parallellt:
  - ingen go-live med ordet rollback innan restore-backed path finns
- exit gates:
  - `CutoverCheckpoint`, `RollbackPlan`, `RollbackExecutionReceipt`, `RollbackCompensationPlan` finns
  - rollback kan vara `restore_backed` eller `post_switch_compensation`, men mode måste vara explicit
  - restore-backed rollback kraver checkpoint lineage och bevisad restore drill
- konkreta verifikationer:
  - pre-switch rollback ska kunna återstalla target till checkpoint
  - post-switch rollback med regulated filings ska krava compensation plan
  - rollback utan restore drill eller checkpoint ska blockeras
- konkreta tester:
  - unit för rollback mode selection
  - integration för checkpoint -> rollback execution
  - e2e för regulated filing after switch -> compensation-only path
- konkreta kontroller vi måste kunna utfora:
  - visa exakt rollback mode och varfor det valdes
  - lista checkpoint artifacts och restore drill refs
  - bevisa att rollback receipt inte bara är metadata utan länkar till faktisk återstallning eller kompensation

### Delfas 15.13 post-cutover correction / watch-window hardening
- markering: rewrite
- dependencies:
  - 15.11
  - 15.12
- vad som för koras parallellt:
  - 15.15
  - 15.16
- vad som inte för koras parallellt:
  - close av cutover utan aktiv watch window
- exit gates:
  - `PostCutoverCorrectionCase`, `WatchWindowState`, `WatchSignal`, `CorrectionClosureReceipt` finns
  - correction lane är kopplad till owner, SLA, reopen rules och rollback mode
  - cutover kan inte stangas innan watch window och blockerare är grana
- konkreta verifikationer:
  - ny diff efter switch ska öppna correction case i stallet för tyst ignoreras
  - open correction case ska blockera close
  - watch-window exit ska krava explicit receipt
- konkreta tester:
  - unit för watch-window closure rules
  - integration för auto-open correction case on drift
  - e2e för switch -> watch -> correction -> close
- konkreta kontroller vi måste kunna utfora:
  - lista alla watch signals under ett cutover-plan-id
  - se varfor cutover fortfarande är öppet
  - bevisa att correction lane lever vidare efter switch

### Delfas 15.14 payroll-history / YTD / AGI / balance landing hardening
- markering: replace
- dependencies:
  - 15.8
  - 15.9
  - Domän 10 payrolltruth
- vad som för koras parallellt:
  - delar av 15.15
- vad som inte för koras parallellt:
  - payroll migration får inte kallas klar medan finalize bara skriver balances
- exit gates:
  - `PayrollMigrationBatch`, `PayrollHistoryLandingReceipt`, `YtdCarryForwardReceipt`, `AgiCarryForwardReceipt` finns
  - payroll landing skriver till riktiga payroll/HR/balance-truths där policy kraver det
  - finalize och rollback tacker mer an balance baselines
- konkreta verifikationer:
  - YTD/AGI carry-forward ska bli läsbar i riktig payrollruntime efter migration
  - finalize ska skapa receipts för HR/payroll/balances
  - rollback ska kunna rulla tillbaka hela payroll landningen eller explicit markera kompensationsspar
- konkreta tester:
  - unit för YTD/AGI landing semantics
  - integration för payroll migrate -> validate -> finalize -> rollback
  - regression för missing evidence mapping -> block
- konkreta kontroller vi måste kunna utfora:
  - se vilka payrollobjekt som faktiskt skrevs
  - bevisa att batchen inte bara landade balances
  - spara varje anställds historik till source artifacts

### Delfas 15.15 bureau-portfolio / delegated-approval / cohort hardening
- markering: harden
- dependencies:
  - 15.1-15.13
- vad som för koras parallellt:
  - 15.16
  - 15.18
- vad som inte för koras parallellt:
  - ingen massmigrering före canonical datasetmotor
- exit gates:
  - `BureauMigrationPortfolio`, `DelegatedMigrationApproval`, `MigrationCohortDashboard`, `ClientScopeIsolationReceipt` finns
  - byra kan kora discovery, extract, cutover och watch window för många klienter utan datablodning
  - delegated approvals är explicit scopeade och auditade
- konkreta verifikationer:
  - två klienter med samma source family ska hållas fullständigt separerade
  - byraapproval ska inte kunna signera fel klientscope
  - cohort dashboard ska baseras på verkliga plan-/dataset-/cutoverobjekt
- konkreta tester:
  - integration för multi-client bureau migration flows
  - security test för scope bleed
  - regression för delegated approval boundaries
- konkreta kontroller vi måste kunna utfora:
  - lista alla klienter i ett cohort med isolerade receipts
  - visa vem som godkande vad för vilken klient
  - bevisa att byradashboard inte är frikopplad från runtime truth

### Delfas 15.16 trial-live-promotion / non-in-place isolation hardening
- markering: harden
- dependencies:
  - 15.11
  - 15.12
  - 15.15
- vad som för koras parallellt:
  - 15.17
- vad som inte för koras parallellt:
  - ingen go-live-path för blanda in-place promotion med canonical migration-path
- exit gates:
  - trial/live-promotion och migration-cutover använder explicit gemensamma receipts men separata truth paths
  - `promotionMode=copy_to_new_live_tenant` är last där promotion används
  - forbidden trial-live artifacts och object types blockeras konsekvent
- konkreta verifikationer:
  - promotion får inte röra med live-forbidden refs
  - migration cutover och promotion ska kunna samexistera utan dubbla sanningar
  - evidence bundle ska visa copy-to-new-live och blocked carry-overs
- konkreta tester:
  - integration för promotion validation report
  - regression för forbidden carry-över
  - e2e för trial -> promotion -> migration-linked live bootstrap
- konkreta kontroller vi måste kunna utfora:
  - lista blocked object types före promotion
  - visa evidence bundle som binder promotion till migration receipts
  - bevisa att live tenant skapas nytt, inte muteras fram

### Delfas 15.17 route / surface / runbook / seed / legacy purge
- markering: rewrite
- dependencies:
  - 15.1
  - 15.4
  - 15.11
- vad som för koras parallellt:
  - 15.18
- vad som inte för koras parallellt:
  - inga nya docs eller routes får skapas mot gammal nomenklatur
- exit gates:
  - routefamiljen skiljer tydligt mellan `sie`, `migration`, `import_cases`, `payroll_migration`, `trial_promotion`
  - gamla runbooks är omskrivna eller arkiverade
  - demo seeds är flyttade till test-only, archive eller remove
- konkreta verifikationer:
  - `phase14-migration-intake-routes.mjs` ska inte längre maskera import-cases som generell migration
  - saknade runbooks ska finnas
  - gamla migration-go-live-pastaenden ska vara rensade från osanna docs
- konkreta tester:
  - route-contract consistency test
  - doc lint för bindande sanningskallor
  - seed-scope test som nekar demo seed i protected mode
- konkreta kontroller vi måste kunna utfora:
  - lista exakt vilka docs som rewrite/archive/remove
  - lista exakt vilka seeds som är test-only
  - verifiera att inga routes pekar ut import-cases som generell engine

### Delfas 15.18 Swedish source priority / competitor migration friction hardening
- markering: harden
- dependencies:
  - 15.1
  - 15.4
  - 15.17
- vad som för koras parallellt:
  - inget som ändrar wave-1-prioritet utan detta underlag
- vad som inte för koras parallellt:
  - long-tail adapters får inte prioriteras före svenska migrationskallor
- exit gates:
  - wave 1 är last till svenska verkliga källsystem och filformat
  - varje wave-1-kalla har official-source evidence för auth, export/import och migrationfriktion
  - backlogordning speglar verklig svensk marknad
- konkreta verifikationer:
  - Fortnox, Visma, Bokio, SIE4, CSV/Excel och bureau bundle ska vara prioriterade före mindre kritiska källor
  - varje prioriterad kalla ska ha official-source reference i library/runbooks
  - unsupported high-friction source ska klassas explicit i stallet för att latsas stödjas
- konkreta tester:
  - backlog policy test
  - provider/source-priority lint
  - readiness test för wave-1-only go-live
- konkreta kontroller vi måste kunna utfora:
  - öppna market evidence per source family
  - visa varfor en kalla ligger i wave 1 eller senare
  - bevisa att svenska go-live-källor inte tappas bort av mindre viktiga adapterspar

## konkreta verifieringar

- importera SIE4 och API-extract för samma avgränsade scope och verifiera samma canonical checksums där datamangden overlappar
- skapa en expired consent och verifiera att extract nekas trots att connection record fortfarande finns
- kor final extract och kontrollera att immutable artifact, manifest, checksum och cutoff-basis skrivs innan switch tillats
- genomfar en blocked parallel run, acceptera efter faktisk remediation och verifiera att acceptance-record länkar till verkliga measurements
- kor payroll migration finalize och verifiera att fler receipts an balance-transaktioner skapas

## konkreta tester

- unit: discovery, fingerprint, cutoff precedence, canonical dataset hashing, identity resolution, threshold evaluation
- integration: source discovery API, extract -> manifest -> dataset, mapping approval, import landing, cutover, rollback, payroll finalize
- regression: double-count guards, expired consent, missing required datasets, route drift, runbook truth lint
- e2e: wave-1 migration dry-run, finance cutover, payroll migration cutover, bureau multi-client cohort, trial-live promotion with migration coupling

## konkreta kontroller vi måste kunna utfora

- spara ett targetobjekt hela vagen tillbaka till source artifact, manifest och cutoff-basis
- se exakt varfor en migration är blockerad, inklusive blocker code, dataset family och required approval
- jamfora samma bolags source och target i parallel run utan att farlita sig på caller-supplied metrics
- visa exakt vilka docs, seeds och legacy routes som ska rewrite/archive/remove
- bevisa att rollback antingen är restore-backed eller explicit compensation-backed, aldrig oklart mellanting

## markeringar

- keep: SIE4-lane, ledger/opening balance truth, evidence bundle-frysning, bureau portfolio-ops, trial/live copy-to-new-live
- harden: integrations-control-plane reuse, payroll-history evidence lane, delegated approvals, promotion evidence
- rewrite: cutover concierge semantics, runbooks, routefamiljer, source connection/capability model, payroll finalize/rollback semantics
- replace: source discovery, canonical datasets, diff engine, parallel-run engine, target-write engine, final extract/switch, restore-backed rollback
- migrate: `migration_cutover_plans` och narliggande cockpit-tabeller till ny canonical migrationsmodell
- archive: gamla demo seeds och osanna runbooks
- remove: falska wave-1-claims utan riktiga adapters, namngivning som gör import-cases till generell migration engine




