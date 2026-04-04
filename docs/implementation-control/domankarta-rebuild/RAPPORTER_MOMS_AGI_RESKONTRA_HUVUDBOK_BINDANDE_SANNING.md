# RAPPORTER_MOMS_AGI_RESKONTRA_HUVUDBOK_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för alla regulatoriska och finansiella rapporter som systemet producerar som:
- momsrapport
- periodisk sammanställning
- AGI-visning och AGI-underlag
- kundreskontra och leverantörsreskontra
- huvudbok
- grundbok och verifikationslista
- balans- och resultatrapport

## Syfte

Detta dokument ska göra rapportlagret deterministiskt.

Rapporter får aldrig vara fria sammanställningar ovanpa delvis stale data. De ska alltid kunna ledas tillbaka till:
- canonical ledger truth
- canonical subledger truth
- canonical AGI truth
- canonical VAT truth
- canonical period truth

## Omfattning

Detta dokument omfattar:
- rapportgenerering
- report snapshots
- filing-ready rapportunderlag
- aging reports
- huvudbok och verifikationslista
- balans- och resultatrapport
- regulatorisk mappning mellan source truth och rapportutdata

Detta dokument omfattar inte:
- själva momslogiken
- själva AGI-faltlogiken
- själva kund- eller leverantörsreskontralogiken
- själva voucherbokforingen

## Absoluta principer

- Ingen rapport får bygga på osignerad draft-data.
- Ingen rapport får blanda committed och uncommitted truth.
- Filing-ready rapporter måste bindas till snapshot, period och regelversion.
- Momsrapport får inte definiera box mapping själv; den ska låsa den från momsbibeln.
- AGI-underlag får inte definiera faltlogik själv; den ska låsa den från AGI-biblarna.
- Huvudbok och grundbok får inte vara UI-derivat; de ska genereras från ledger truth.
- Aging reports får inte räkna på fakturadokument; de ska räkna på open items/subledger truth.

## Bindande dokumenthierarki för rapporter, moms, AGI, reskontra och huvudbok

- `MOMSFLODET_BINDANDE_SANNING.md` äger all momsbox-truth och periodisk sammanställningstruth som rapportlagret ska låsa.
- `AGI_FLODET_BINDANDE_SANNING.md` och `AGI_FALTKARTA_OCH_RATTELSER_BINDANDE_SANNING.md` äger all AGI-truth som rapportlagret ska låsa.
- `KUNDINBETALNINGAR_OCH_KUNDRESKONTRA_BINDANDE_SANNING.md` äger kundreskontra truth.
- `LEVERANTORSBETALNINGAR_OCH_LEVERANTORSRESKONTRA_BINDANDE_SANNING.md` och `LEVFAKTURAFLODET_BINDANDE_SANNING.md` äger leverantörsreskontra truth.
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` äger voucher, huvudbok, grundbok och trial-balance truth.
- `PERIODISERING_OCH_BOKSLUTSOMFORINGAR_BINDANDE_SANNING.md` äger cutoff och close adjustment truth som rapporter ska respektera.
- Domän 6, 10, 15 och 27 får inte definiera avvikande rapporttruth utan att detta dokument skrivs om samtidigt.

## Kanoniska objekt

- `ReportSnapshot`
  - bar company, period scope, close state, source refs och digest
- `ReportPackage`
  - bar en sammanhangen leverans av rapporter för ett syfte, t.ex. month-end eller filing-prep
- `VatReportView`
  - bar box values och filing metadata, inte ny momslogik
- `PeriodicSummaryView`
  - bar sammanställning av relevanta EU-transaktioner
- `AgiReportView`
  - bar AGI huvuduppgift, individsummor, receipt refs och correction lineage
- `CustomerAgingView`
  - bar öppna kundposter och aging buckets
- `SupplierAgingView`
  - bar öppna leverantörsposter och aging buckets
- `GeneralLedgerReport`
  - bar konto, verifikationsserier, debet/kredit och saldo per rapportprofil
- `DaybookReport`
  - bar verifikationer i registreringsordning
- `FinancialStatementView`
  - bar balans- och resultatsammanställning utifran canonical kontoprofiler

## Kanoniska state machines

- `ReportSnapshot`
  - `draft -> frozen -> superseded`
- `ReportPackage`
  - `draft -> generated -> signed_off | superseded | failed`
- `VatReportView`
  - `generated -> filing_ready | blocked`
- `AgiReportView`
  - `generated -> filing_ready | blocked`
- `CustomerAgingView`
  - `generated -> stale | superseded`
- `GeneralLedgerReport`
  - `generated -> signed_off | superseded`

## Kanoniska commands

- `CreateReportSnapshot`
- `GenerateVatReportView`
- `GeneratePeriodicSummaryView`
- `GenerateAgiReportView`
- `GenerateCustomerAgingView`
- `GenerateSupplierAgingView`
- `GenerateGeneralLedgerReport`
- `GenerateDaybookReport`
- `GenerateFinancialStatementView`
- `SignOffReportPackage`

## Kanoniska events

- `ReportSnapshotCreated`
- `VatReportViewGenerated`
- `PeriodicSummaryViewGenerated`
- `AgiReportViewGenerated`
- `CustomerAgingViewGenerated`
- `SupplierAgingViewGenerated`
- `GeneralLedgerReportGenerated`
- `DaybookReportGenerated`
- `FinancialStatementViewGenerated`
- `ReportPackageSignedOff`

## Kanoniska route-familjer

- `/api/reports/vat/*`
- `/api/reports/agi/*`
- `/api/reports/är/*`
- `/api/reports/ap/*`
- `/api/reports/ledger/*`
- `/api/reports/financial-statements/*`

## Kanoniska permissions och review boundaries

- `accounting.read` får se huvudbok, reskontra och financial statements
- `tax.read` får se momsrapport och periodisk sammanställning
- `payroll.read` får se AGI-underlag
- `accounting.close` eller motsvarande får frysa report snapshots för filing-ready paket
- `support` får inte generera filing-ready regulatoriska views utan masking och audit
- report sign-off krävs för month-end, filing-prep och audit packages

## Nummer-, serie-, referens- och identitetsregler

- Varje rapportsnapshot ska ha unik identity per bolag, report family, period och source digest.
- Momsrapport och periodisk sammanställning ska vara bundna till exakt redovisningsperiod.
- AGI-view ska vara bunden till exakt redovisningsmanad och specifikationsnummer/receipt lineage.
- Kund- och leverantörsaging ska vara bunden till exakt as-of date.
- Huvudbok och verifikationslista ska kunna referera till verifikationsserie och vernr utan transformation.

## Valuta-, avrundnings- och omräkningsregler

- Rapporter ska visas i ledgerns redovisningsvaluta.
- Momsrapport och AGI-underlag ska följa respektive regelkarnors rounding regler; rapportlagret får inte avrunda om dem på nytt.
- Aging ska baseras på canonical open-item amounts i redovisningsvaluta.
- Om valutaexponering visas ska den vara supplemental och aldrig ersätta bokförd reporting currency.

## Replay-, correction-, recovery- och cutover-regler

- Rapporter ska kunna regenereras byte-likt för samma frozen snapshot, profile och output format.
- Correction i ledger, VAT eller AGI ska ge nytt report snapshot; gammal rapport får inte muteras.
- Cutover och migration ska kunna generera parity reports för före- och efterbild.
- Recovery efter felgenerering ska skapa ny report artifact med nytt id men samma source digest om datat är oforandrat.

## Huvudflödet

1. systemet skapar `ReportSnapshot`
2. snapshot fryser source digest och period state
3. vald rapportfamilj genereras mot sina bindande underlagsbiblar
4. blockerregler kontrollerar att underlaget är filing-ready eller analysis-only
5. report artifacts skapas
6. sign-off kan laggas på report package
7. vid correction genereras ny snapshot och nytt package

## Bindande scenarioaxlar

- filing-ready vs analysis-only
- month-end vs year-end vs ad-hoc as-of
- original vs corrected period
- closed period vs open period
- VAT vs AGI vs subledger vs ledger vs financial statements
- customer aging vs supplier aging
- cash method vs invoice method where source truths differ
- migration parity vs native reporting

## Bindande policykartor

- `RPT-POL-001`: momsboxar kommer endast från momsbibeln
- `RPT-POL-002`: AGI-fält och summor kommer endast från AGI-biblarna
- `RPT-POL-003`: ÄR aging kommer endast från canonical ÄR open items
- `RPT-POL-004`: AP aging kommer endast från canonical AP open items
- `RPT-POL-005`: huvudbok och grundbok kommer endast från canonical vouchers
- `RPT-POL-006`: financial statements bygger på canonical kontoklassificering, inte UI-gruppering
- `RPT-POL-007`: filing-ready rapporter måste bindas till frozen snapshot

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `RPT-P0001`
  - momsrapport
  - utfall: box values ska låsas från `MOMSFLODET_BINDANDE_SANNING.md`
- `RPT-P0002`
  - periodisk sammanställning
  - utfall: endast transaktioner som momsbibeln markerar som list-eligible får inga
- `RPT-P0003`
  - AGI-view
  - utfall: fält och summor ska låsas från AGI-biblarna
- `RPT-P0004`
  - customer aging
  - utfall: buckets 0-30, 31-60, 61-90, 90+ mot canonical open items
- `RPT-P0005`
  - supplier aging
  - utfall: samma bucketlogik mot canonical AP open items
- `RPT-P0006`
  - huvudbok
  - utfall: konto, datum, vernr, debet, kredit, löpande saldo från ledger truth
- `RPT-P0007`
  - grundbok/verifikationslista
  - utfall: registreringsordning och voucher identity från ledger truth
- `RPT-P0008`
  - balans- och resultatrapport
  - utfall: kontoklass-summering utan att bryta mot kontopolicyn
- `RPT-P0009`
  - report snapshot digest
  - utfall: exact source refs och reproducibility evidence

## Bindande rapport-, export- och myndighetsmappning

- momsrapport -> momsdeklarationens boxar enligt momsbibeln
- periodisk sammanställning -> EU varor/tjänster enligt momsbibeln
- AGI-view -> Skatteverkets huvuduppgift och individuppgifter enligt AGI-biblarna
- customer aging -> intern finans- och kreditkontroll, inte myndighetsfil
- supplier aging -> intern AP-kontroll, inte myndighetsfil
- huvudbok/grundbok -> revisions- och bokföringsunderlag
- balans/resultat -> arsavslut, uppföljning och deklarationsunderlag

## Bindande scenariofamilj till proof-ledger och rapportspar

- `RPT-A001` momsrapport original -> `RPT-P0001`
- `RPT-A002` momsrapport replacement/correction -> `RPT-P0001`
- `RPT-A003` periodisk sammanställning -> `RPT-P0002`
- `RPT-B001` AGI reporting month -> `RPT-P0003`
- `RPT-C001` customer aging as-of -> `RPT-P0004`
- `RPT-C002` supplier aging as-of -> `RPT-P0005`
- `RPT-D001` huvudbok period -> `RPT-P0006`
- `RPT-D002` grundbok/verifikationslista -> `RPT-P0007`
- `RPT-E001` balans/resultat month-end -> `RPT-P0008`
- `RPT-Z001` report reproducibility -> `RPT-P0009`

## Tvingande dokument- eller indataregler

- filing-ready rapporter måste ha frozen snapshot
- periodgrans måste vara explicit
- as-of date måste vara explicit för aging
- rapportprofil måste vara explicit: `analysis_only` eller `filing_ready`
- correction profile måste vara explicit där regulatoriska rapporter rattas

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `RPT-R001` open_period_not_filing_ready
- `RPT-R002` stale_snapshot
- `RPT-R003` vat_truth_missing
- `RPT-R004` agi_truth_missing
- `RPT-R005` subledger_truth_missing
- `RPT-R006` ledger_not_closed_for_scope
- `RPT-R007` correction_lineage_missing
- `RPT-R008` report_profile_conflict

## Bindande faltspec eller inputspec per profil

- `vat_filing_ready`
  - company id
  - VAT period
  - frozen snapshot ref
  - filing method metadata
- `agi_filing_ready`
  - company id
  - AGI month
  - frozen payroll/AGI snapshot ref
  - receipt lineage if corrected
- `aging_analysis`
  - company id
  - as-of date
  - subledger snapshot
- `ledger_audit`
  - company id
  - period or as-of range
  - ledger snapshot

## Scenariofamiljer som hela systemet måste tacka

- original momsrapport
- replacement momsrapport
- periodisk sammanställning
- original AGI month
- corrected AGI month
- customer aging with partial payments and credits
- supplier aging with partial settlements and holds
- huvudbok för closed period
- grundbok/verifikationslista för audit
- balans/resultat month-end
- balans/resultat year-end
- migration parity report package

## Scenarioregler per familj

- momsrapport får aldrig genereras filing-ready från oklad period
- replacement momsrapport måste peka på corrected source truth
- AGI corrected month måste peka på correction lineage
- aging får aldrig räkna drafts eller deleted/open correction shadows
- huvudbok får aldrig presentera annan kontoordning eller totalsanning an ledger truth
- balans/resultat får aldrig flytta konton mellan resultat och balans utifran UI-behov
- migration parity package måste visa före- och efterbild på samma scope

## Blockerande valideringar

- frozen snapshot saknas för filing-ready rapport
- momsboxar kan inte beräknas för scope
- AGI-fält saknas eller unsupported mapping finns kvar
- subledger snapshot saknas för aging
- period lock/reclose conflict för ledger reports
- report package blandar flera correction generations
- open items reconcile inte mot control accounts där profil kraver parity

## Rapport- och exportkonsekvenser

- report artifacts ska kunna laddas ner, sign-offas och refereras i audit/evidence
- filing-ready moms/AGI views ska kunna binda vidare till faktiska filings men är inte i sig submission
- aging och huvudbok ska vara sparbara tillbaka till vouchers/open items
- balans/resultat ska kunna användas som slutligt underlag för årsbokslutspaket

## Förbjudna förenklingar

- rekalkylera moms eller AGI i rapportlagret
- bygga aging direkt på fakturastatus i stallet för open items
- generera huvudbok från search index eller cache
- visa analysis-only som filing-ready
- blanda data från flera snapshots i samma paket

## Fler bindande proof-ledger-regler för specialfall

- `RPT-P0010`
  - customer aging must reflect overpayments as liabilities, not negative receivables
- `RPT-P0011`
  - supplier aging must reflect holds and approved-but-unpaid items separately when profile requests it
- `RPT-P0012`
  - financial statements must respect periodisering and close adjustments from the canonical close package
- `RPT-P0013`
  - migration parity package must expose difference buckets, not only totals

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `RPT-P0001-P0003` skapar inga nya regulatoriska skyldigheter; de speglar bestaende VAT/AGI-truth
- `RPT-P0004-P0005` skapar inga nya open items; de speglar bestaende subledger truth
- `RPT-P0006-P0008` skapar inga nya vouchers; de speglar bestaende ledger truth
- `RPT-P0009-P0013` skapar endast evidence, package refs och diff artifacts

## Bindande verifikations-, serie- och exportregler

- huvudbok och grundbok måste bevara serie och vernr exakt som i ledger truth
- report exports får inte renummerera eller renamngiva vouchers
- filing-ready packages ska baras av frozen snapshot id och artifact digest
- om PDF, CSV eller XLSX erbjuds ska alla format bygga på samma snapshot och samma totalsanning

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- filing_ready vs analysis_only
- original vs corrected
- closed vs open period
- monthly vs quarterly vs annual
- as_of vs date_range
- native vs migration parity
- ÄR vs AP vs VAT vs AGI vs ledger vs financial statements

## Bindande fixture-klasser för rapporter, moms, AGI, reskontra och huvudbok

- `RPT-FXT-001` closed month-end VAT package
- `RPT-FXT-002` corrected VAT period
- `RPT-FXT-003` AGI month original
- `RPT-FXT-004` AGI month corrected
- `RPT-FXT-005` ÄR aging with partials/credits
- `RPT-FXT-006` AP aging with holds/fees
- `RPT-FXT-007` ledger package closed period
- `RPT-FXT-008` year-end financial statements
- `RPT-FXT-009` migration parity package

## Bindande expected outcome-format per scenario

Varje scenario ska minst ange:
- scenario id
- fixture class
- report family
- source snapshot
- filing readiness verdict
- expected totals, boxes eller fält
- expected reconciliation status
- expected artifact refs

## Bindande canonical verifikationsseriepolicy

- rapportlagret arver voucher series från ledger truth
- inga rapporter får skapa egen serie
- verifikationslista måste visa exakt serie och vernr som i canonical ledger

## Bindande expected outcome per central scenariofamilj

- `RPT-A001`
  - verdict: filing_ready only if frozen VAT snapshot exists
  - output: canonical box values, no recomputation drift
- `RPT-B001`
  - verdict: filing_ready only if AGI field map resolves fully
  - output: huvuduppgift plus individuppgiftssummor per AGI truth
- `RPT-C001`
  - verdict: generated
  - output: ÄR aging buckets against open items, no draft contamination
- `RPT-D001`
  - verdict: generated
  - output: full huvudbok with account, voucher, debit, credit and running balance
- `RPT-E001`
  - verdict: generated or signed_off
  - output: balans och resultat based on canonical account classes and close package

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `RPT-A001` -> `RPT-P0001` -> momsrapport original
- `RPT-A002` -> `RPT-P0001` -> momsrapport correction
- `RPT-A003` -> `RPT-P0002` -> periodisk sammanställning
- `RPT-B001` -> `RPT-P0003` -> AGI original
- `RPT-C001` -> `RPT-P0004` -> customer aging
- `RPT-C002` -> `RPT-P0005` -> supplier aging
- `RPT-D001` -> `RPT-P0006` -> huvudbok
- `RPT-D002` -> `RPT-P0007` -> verifikationslista
- `RPT-E001` -> `RPT-P0008` -> balans/resultat
- `RPT-Z001` -> `RPT-P0009` -> reproducibility evidence

## Bindande testkrav

- moms report snapshot reproducibility test
- replacement VAT report lineage test
- AGI report package original/correction parity test
- ÄR aging bucket test with partial payment, overpayment and credit
- AP aging bucket test with payment hold and partial settlement
- huvudbok regeneration test from frozen ledger snapshot
- verifikationslista order test
- balans/resultat test against canonical account classes
- migration parity package diff test

## Källor som styr dokumentet

- Skatteverket: [Fylla i momsdeklarationen](https://www.skatteverket.se/foretag/moms/deklareramoms/fyllaimomsdeklarationen.4.3a2a542410ab40a421c80004214.html)
- Skatteverket: [Periodisk sammanställning](https://skatteverket.se/foretag/moms/deklareramoms/periodisksammanstallning.4.3dfca4f410f4fc63c8680004088.html)
- Skatteverket: [Teknisk beskrivning och testtjänst för AGI](https://www.skatteverket.se/foretag/arbetsgivare/lamnaarbetsgivardeklaration/tekniskbeskrivningochtesttjanst.4.309a41aa1672ad0c8377c8b.html)
- Riksdagen: [Bokföringslag (1999:1078)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/bokforingslag-19991078_sfs-1999-1078/)
- BAS: [Kontoplan BAS 2025](https://www.bas.se/wp-content/uploads/2025/01/Kontoplan-BAS-2025.pdf)
