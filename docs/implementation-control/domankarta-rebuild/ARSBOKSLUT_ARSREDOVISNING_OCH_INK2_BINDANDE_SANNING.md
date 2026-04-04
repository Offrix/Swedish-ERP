# ÅRSBOKSLUT_ARSREDOVISNING_OCH_INK2_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för årsbokslut, årsredovisning, fastställelse, digital eller manuell inlamning till Bolagsverket samt inkomstdeklaration 2 med INK2R och INK2S.

Detta dokument ska styra:
- hard close
- val av K2 eller K3
- annual package
- underskriftskedja
- Bolagsverkets inlamningskedja
- INK2, INK2R och INK2S
- bokslutsskatt, bokslutsdispositioner och declared tax pack

## Syfte

Detta dokument finns för att:
- close aldrig ska reduceras till “exportera pdf”
- K2/K3-val ska vara explicit och styrt av företagsprofil, inte valfritt per modul
- årsredovisning, fastställelse och INK2 alltid ska bygga på samma ledger truth
- skattemassiga justeringar aldrig ska ligga som fria excel-differenser

## Omfattning

Detta dokument omfattar:
- hard close av räkenskapsar
- annual reporting package
- årsredovisning enligt K2 eller K3
- signering och inlamning till Bolagsverket
- INK2, INK2R och INK2S
- bokslutsskatt och bolagsskattsskuld
- bokslutsdispositioner och deklarationsposter

Detta dokument omfattar inte:
- utdelningsbeslut efter faststalld årsredovisning
- koncernspecifik IFRS
- personligt beskattningsunderlag för ägare

## Absoluta principer

- varje close ska bygga på last period- och ledger truth
- samma företag får inte blanda K2 och K3 i samma årsredovisning
- årsredovisning och INK2 får aldrig bygga på olika resultat- eller balanssiffror
- årsredovisning får inte markeras inlamnad utan Bolagsverkets riktiga receipt
- INK2 får inte markeras inlamnad utan Skatteverkets riktiga receipt eller verifierad ombudsreceipt
- uppskjuten skatt får inte uppsta i K2-path
- bokslutsskatt för aktiebolag ska som canonical policy bokas `8910 -> 2512`

## Bindande dokumenthierarki för årsbokslut, årsredovisning och INK2

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- `DOMAIN_11_ROADMAP.md`
- `DOMAIN_11_IMPLEMENTATION_LIBRARY.md`
- detta dokument

Detta dokument lutar på:
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md`
- `PERIODISERING_OCH_BOKSLUTSOMFORINGAR_BINDANDE_SANNING.md`
- `ANLAGGNINGSTILLGANGAR_OCH_AVSKRIVNINGAR_BINDANDE_SANNING.md`
- BFN K2, K3 och Årsbokslut-vägledningar
- årsredovisningslagen
- bokföringslagen
- Skatteverkets INK2-regler
- Bolagsverkets digitala inlamning av årsredovisning

## Kanoniska objekt

- `AnnualCloseCase`
- `AnnualFrameworkDecision`
- `AnnualReportPackage`
- `AnnualSignatureCase`
- `AnnualFilingCase`
- `Ink2Package`
- `Ink2AdjustmentPlan`
- `AnnualCloseBlocker`

## Kanoniska state machines

### `AnnualCloseCase`

- `draft`
- `hard_closed`
- `annual_report_built`
- `signed`
- `filed`
- `accepted`
- `blocked`

### `Ink2Package`

- `draft`
- `built`
- `review_pending`
- `submitted`
- `accepted`
- `rejected`
- `corrected`

### `AnnualFilingCase`

- `draft`
- `submitted_to_bolagsverket`
- `awaiting_signatures`
- `received`
- `rejected`
- `blocked`

## Kanoniska commands

- `CreateAnnualCloseCase`
- `ResolveAnnualFrameworkDecision`
- `HardCloseFiscalYear`
- `BuildAnnualReportPackage`
- `CreateAnnualSignatureCase`
- `SubmitAnnualReportToBolagsverket`
- `BuildInk2Package`
- `SubmitInk2Package`
- `RegisterAnnualFilingReceipt`
- `RegisterInk2Receipt`
- `BlockAnnualCloseCase`

## Kanoniska events

- `AnnualCloseCaseCreated`
- `AnnualFrameworkDecisionResolved`
- `FiscalYearHardClosed`
- `AnnualReportPackageBuilt`
- `AnnualSignatureCaseCreated`
- `AnnualReportSubmitted`
- `Ink2PackageBuilt`
- `Ink2PackageSubmitted`
- `AnnualFilingReceiptRegistered`
- `Ink2ReceiptRegistered`
- `AnnualCloseCaseBlocked`

## Kanoniska route-familjer

- `POST /v1/annual/close-cases`
- `POST /v1/annual/close-cases/{id}/hard-close`
- `POST /v1/annual/close-cases/{id}/build-annual-report`
- `POST /v1/annual/close-cases/{id}/submit-bolagsverket`
- `POST /v1/annual/ink2-packages`
- `POST /v1/annual/ink2-packages/{id}/submit`

## Kanoniska permissions och review boundaries

- hard close kraver finance close-approver
- val mellan K2 och K3 kraver compliance/accounting review
- live inlamning till Bolagsverket och Skatteverket kraver dual control
- support får inte markera årsredovisning eller INK2 som inskickad utan receipt

## Nummer-, serie-, referens- och identitetsregler

- varje close ska ha `annualCloseCaseId`
- varje årsredovisning ska ha `annualReportPackageId` och `fiscalYearId`
- varje INK2-package ska ha `ink2PackageId`
- filing receipts och signature receipts ska sparas oforandrade

## Valuta-, avrundnings- och omräkningsregler

- årsredovisning och årsbokslut ska anges i SEK
- INK2 ska bygga på samma valutabaser som close-ledgern
- bokslutsskatt ska avrundas enligt skatteregler och canonical tax engine

## Replay-, correction-, recovery- och cutover-regler

- close replay får bygga om annual package från hard-closed ledger snapshot
- nytt annual package får superseda tidigare package utan att ta bort signatur- eller filinghistorik
- korrigerad INK2 ska skapas som ny package med correction lineage
- migration måste landa close state, filed state och receipt chain separat

## Huvudflödet

1. räkenskapsaret hard closes
2. annual framework K2 eller K3 lakses
3. annual package byggs
4. underskriftskedja startas
5. årsredovisning lämnas till Bolagsverket
6. INK2, INK2R och INK2S byggs
7. INK2 lämnas till Skatteverket
8. receipts arkiveras

## Bindande scenarioaxlar

- framework: `K2`, `K3`
- filing mode: `digital_bolagsverket`, `manual_pdf`
- ink2 mode: `e_service`, `file_via_partner`, `paper`
- tax profile: `ordinary_ab`, `special_adjustments_present`
- status: `original`, `corrected`

## Bindande policykartor

- annual result account: `8999`
- current year result equity account: `2099`
- estimated corporate income tax liability: `2512`
- tax expense account: `8910`
- deferred tax in K2: `forbidden`
- digital Bolagsverket filing receipt required för `filed=true`
- INK2 always consists of `INK2 + INK2R + INK2S`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

### ARS-P0001 Recognize annual tax expense and liability

- debit `8910`
- credit `2512`

### ARS-P0002 Close current year result

- debit_or_credit `8999`
- counterAccount `2099`
- signDependsOnProfitOrLoss: `true`

### ARS-P0003 K3 deferred tax allowed only in K3 path

- allowedFramework: `K3_only`
- K2Usage: `blocked`

### ARS-P0004 Annual report filing accepted

- bolagsverketReceiptRequired: `true`
- state: `received`

### ARS-P0005 INK2 filing accepted

- skatteverketReceiptRequired: `true`
- state: `accepted`

### ARS-P0006 Blocked annual close

- closeState: `blocked`
- blockCode: `framework_or_receipt_or_hard_close_missing`

## Bindande rapport-, export- och myndighetsmappning

- årsredovisning ska innehålla förvaltningsberattelse, resultat- och balansrakning samt noter enligt tillämpligt regelverk
- K3 kan krava kassaflödesanalys beroende på företagsklassning
- INK2R ska spegla räkenskapsschemat
- INK2S ska spegla skattemassiga justeringar

## Bindande scenariofamilj till proof-ledger och rapportspar

- `ARS-A001 k2_close_and_filing -> ARS-P0001,ARS-P0002,ARS-P0004,ARS-P0005 -> accepted`
- `ARS-A002 k3_close_with_allowed_deferred_tax -> ARS-P0001,ARS-P0002,ARS-P0003,ARS-P0004,ARS-P0005 -> accepted`
- `ARS-B001 corrected_ink2 -> ARS-P0005 -> corrected`
- `ARS-Z001 blocked_missing_hard_close_or_receipt -> ARS-P0006 -> blocked`

## Tvingande dokument- eller indataregler

- `fiscalYearStart`
- `fiscalYearEnd`
- `frameworkCode`
- `hardCloseSnapshotRef`
- `annualReportPackageDigest`
- `annualSignatureReceiptRefs`
- `bolagsverketFilingReceiptRef`
- `ink2PackageDigest`
- `ink2ReceiptRef`

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `ARS-R001 k2_annual_report`
- `ARS-R002 k3_annual_report`
- `ARS-R003 corrected_ink2`
- `ARS-R004 digital_bolagsverket_filing`
- `ARS-R005 blocked_missing_hard_close_or_receipt`

## Bindande faltspec eller inputspec per profil

### K2

- `frameworkCode = K2`
- `deferredTaxAllowed = false`
- `cashFlowStatementRequired = according_to_applicable_rule`

### K3

- `frameworkCode = K3`
- `deferredTaxAllowed = true_when_required`
- `cashFlowStatementRequired = according_to_classification`

### INK2

- `ink2Main`
- `ink2rSchema`
- `ink2sAdjustments`
- `attachments`

## Scenariofamiljer som hela systemet måste tacka

- K2 close and filing
- K3 close and filing
- digital filing to Bolagsverket
- manual filing fallback
- accepted INK2
- corrected INK2
- blocked close because hard close missing
- blocked K2 package trying to use K3-only logic

## Scenarioregler per familj

- `ARS-A001`: K2 close får inte innehålla uppskjuten skatt
- `ARS-A002`: K3 close får innehålla uppskjuten skatt när explicit K3-regel och data finns
- `ARS-B001`: corrected INK2 ska bevara tidigare filing lineage
- `ARS-Z001`: årsredovisning eller INK2 utan riktig receipt får inte markeras inlamnad

## Blockerande valideringar

- deny annual package build without hard close
- deny K2 if K3-only constructs remain unresolved
- deny `filed` status without Bolagsverket receipt
- deny `submitted` status för INK2 without full package `INK2+INK2R+INK2S`
- deny K2 deferred tax

## Rapport- och exportkonsekvenser

- close cockpit ska visa hard close, annual report, signatures, Bolagsverket receipt och INK2 receipt separat
- annual package export ska vara hashad och versionerad
- INK2 correction chain ska vara synlig per är

## Förbjudna förenklingar

- ingen annual green status utan riktig receipt
- ingen fri blandning av K2 och K3
- ingen manuell differens mellan årsredovisning och INK2
- ingen uppskjuten skatt i K2

## Fler bindande proof-ledger-regler för specialfall

- när bokslutsskatt justeras efter rattad deklaration ska ny correction chain skapas
- om Bolagsverket digital filing används ska status `received` inte sattas på bara teknisk upload utan mottagningsreceipt
- om manuell filing används ska produktstatus vara `manually_submitted_pending_external_receipt` tills receipt registrerats

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `ARS-P0001` öppnar eller justerar skatteskuld
- `ARS-P0002` flyttar resultat till `2099`
- `ARS-P0004` skapar external filing receipt state
- `ARS-P0005` skapar tax filing receipt state

## Bindande verifikations-, serie- och exportregler

- close voucher chain ska journaliseras i annual closing series
- annual report file, XBRL/PDF och INK2 payload ska ha separata evidence refs
- corrections får inte skriva över tidigare packages

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- K2 vs K3
- digital vs manual filing
- original vs corrected INK2
- ordinary AB vs special adjustments

## Bindande fixture-klasser för årsbokslut, årsredovisning och INK2

- `ARS-FXT-001` ordinary K2 small company
- `ARS-FXT-002` ordinary K3 company
- `ARS-FXT-003` K3 with deferred tax
- `ARS-FXT-004` corrected INK2 after initial filing
- `ARS-FXT-005` blocked close without hard close

## Bindande expected outcome-format per scenario

- `scenarioId`
- `fixtureClass`
- `expectedProofLedger`
- `expectedFrameworkOutcome`
- `expectedFilingState`
- `expectedBlockedOrAllowedStatus`

## Bindande canonical verifikationsseriepolicy

- annual close postings ska ligga i closing series
- filing receipts ska ligga i annual evidence series
- INK2 corrections ska ha egen correction series in evidence

## Bindande expected outcome per central scenariofamilj

### `ARS-A001`

- fixture minimum: `ARS-FXT-001`
- expected proof-ledger: `ARS-P0001,ARS-P0002,ARS-P0004,ARS-P0005`
- expected framework outcome: `K2_only`
- expected status: `allowed`

### `ARS-A002`

- fixture minimum: `ARS-FXT-003`
- expected proof-ledger: `ARS-P0001,ARS-P0002,ARS-P0003,ARS-P0004,ARS-P0005`
- expected framework outcome: `K3_with_deferred_tax`
- expected status: `allowed`

### `ARS-Z001`

- fixture minimum: `ARS-FXT-005`
- expected proof-ledger: `ARS-P0006`
- expected status: `blocked`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `ARS-A001 -> ARS-P0001,ARS-P0002,ARS-P0004,ARS-P0005 -> allowed`
- `ARS-A002 -> ARS-P0001,ARS-P0002,ARS-P0003,ARS-P0004,ARS-P0005 -> allowed`
- `ARS-B001 -> ARS-P0005 -> allowed`
- `ARS-Z001 -> ARS-P0006 -> blocked`

## Bindande testkrav

- unit tests för K2 deferred-tax blocking
- unit tests för `8910 -> 2512`
- unit tests för `8999 -> 2099`
- integration tests för digital Bolagsverket filing receipt handling
- integration tests för INK2 package completeness and correction chain
- scenario tests för annual package parity against ledger

## Källor som styr dokumentet

- [Bokföringsnämnden: Vägledningar](https://www.bfn.se/informationsmaterial/vagledningar/)
- [Årsredovisningslag (1995:1554)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/arsredovisningslag-19951554_sfs-1995-1554/)
- [Bokföringslag (1999:1078)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/bokforingslag-19991078_sfs-1999-1078/)
- [Skatteverket: Inkomstdeklaration 2](https://skatteverket.se/4.39f16f103821c58f680006188.html)
- [Skatteverket: Tjänstebeskrivning Inkomstdeklaration 2 inlamning](https://www7.skatteverket.se/portal-wapi/open/apier-och-oppna-data/utvecklarportalen/v1/getFile/tjanstebeskrivning-inkomstdeklaration2-inlamning-10-v056)
- [Bolagsverket: API för inlamning av digitala årsredovisningar](https://media.bolagsverket.se/diar/services/2.0/lamnaInArsredovisning-2.0.html)
- [BAS 2025 kontoplan](https://www.bas.se/wp-content/uploads/2025/01/Kontoplan-BAS-2025.pdf)
