# MOMSFLÖDET_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för hela momsflödet.

Detta dokument ska styra:
- momsbeslut och momsscenariokoder
- boxmappning till svensk momsdeklaration
- periodisk sammanställning
- OSS-spor där produkten uttryckligen stödjer OSS
- avdragsrätt, delvis avdragsrätt och blockerad avdragsrätt
- momsperioder, deklarationsversioner, receipts och supersession
- koppling mellan source effects, momskonton, momsrutor och exportkanaler

Ingen kod, inget test, ingen route, ingen export, ingen XML-upload, ingen reviewyta och ingen statusmarkering får definiera avvikande truth för momsflödet utan att detta dokument skrivs om först.

## Syfte

Detta dokument finns för att läsaren ska kunna bygga hela momsflödet utan att gissa:
- vilken scenariofamilj som leder till vilken ruta eller rapportkanal
- vilka momskonton som är tillåtna som canonical source anchors
- när moms ska redovisas i ordinarie svensk momsdeklaration, periodisk sammanställning, OSS eller inte alls
- när avdragsrätt finns helt, delvis eller inte alls
- hur ersättningsdeklarationer och rättelser ska byggas
- hur perioder, frekvens, lasning och upplasning styrs
- hur box 49 ska derivaras i stallet för att lagras som los post
- hur hela repo:t ska luta sig mot samma momssanning utan att faktura-, AP-, kvitto- eller rapportlagret hittar på egna variationer

## Omfattning

Detta dokument omfattar:
- ordinarie svensk momsdeklaration
- utgående moms på svensk momspliktig omsattning och uttag
- VMB-beskattningsunderlag i den utstrackning plattformen uttryckligen stödjer VMB
- unionsinterna förvärv och omvänd skattskyldighet på inköp
- unionsinterna varuforsäljningar och B2B-tjänsteforsäljningar enligt huvudregeln
- export och annan omsattning utanför Sverige
- omvänd skattskyldighet i Sverige
- avdragsrätt, delvis avdragsrätt och blockerad avdragsrätt
- periodisk sammanställning
- OSS-spor där plattformen stödjer OSS
- momsperioder, deklarationsversioner, receipts och supersession
- importmoms som redovisas till Skatteverket

Detta dokument omfattar inte:
- seller-side invoice layout eller issue-truth
- purchase-side AP-posting eller receipt-posting i sig
- skattekontots legal effect efter inlamning, vilket ägs av `SKATTEKONTOFLODET_BINDANDE_SANNING.md`
- HUS-, green-tech- eller payroll-specifik legal truth utom där den paverkar momsrapporteringen

Kanonisk agarskapsregel:
- `FAKTURAFLODET_BINDANDE_SANNING.md` äger seller-side issue-truth och invoice-ledger för säljsidan
- `LEVFAKTURAFLODET_BINDANDE_SANNING.md` äger purchase-side invoice-truth, self-assessment posting och input side coding
- `KVITTOFLODET_BINDANDE_SANNING.md` äger receipt-driven avdragsrätt och blockerregler på underlagsniva
- `UTLAGG_OCH_VIDAREFAKTURERING_BINDANDE_SANNING.md` äger om och när inköp eller utlägg ska fora moms vidare till kund eller stanna internt
- detta dokument äger scenariokod, box mapping, declaration versioning, period locking, periodisk sammanställning och OSS reporting truth

## Absoluta principer

- exakt en giltig momsscenariofamilj måste finnas per momspliktig legal effect eller blocked review
- ingen ruta får fyllas utan bindande scenario och legal basis
- ingen scenariofamilj får sakna explicit rapportkanal eller explicit `no_report`
- unsupported momsfall får aldrig autoaccepteras
- box 49 får aldrig vara fri inmatning; den ska derivaras
- ersättningsdeklaration ska vara ny full version, aldrig tyst overwrite
- periodisk sammanställning får aldrig blandas ihop med vanlig momsdeklaration
- OSS-försäljning får aldrig smygas in i svensk ordinarie ruta om specialordningen är vald för den transaktionen
- delvis eller blockerad avdragsrätt får aldrig overkorras av generell `fält 48`-logik
- utlandsk moms får aldrig bokas som svensk `2641`, `2645` eller `2647`
- momsflödet får inte skapa ny seller- eller buyer-posting; det ska klassa, verifiera, mappa och deklarera source truth från upstream flows
- alla deklarationsbelopp ska internt vara ore-exakta, men deklarations- och filsparet ska avrundas enligt Skatteverkets kanalregler
- inget scenario får rapporteras till flera oforenliga kanaler samtidigt

## Bindande dokumenthierarki för momsflödet

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- detta dokument

Detta dokument lutar på:
- `FAKTURAFLODET_BINDANDE_SANNING.md` för seller-side invoice categories och seller-side VAT source accounts
- `LEVFAKTURAFLODET_BINDANDE_SANNING.md` för purchase-side reverse-charge, importmoms och input-VAT source posting
- `KVITTOFLODET_BINDANDE_SANNING.md` för receipt-driven deductible eller blocked input VAT
- `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md` för booking/value dates och bank-side receipts där period/cut-off berors
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` för vouchers, serier, kontrollkonton, correction chains, period locks och SIE4-vouchertruth för all VAT-carrying postings
- `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md` för ingest evidence och routing av källsidor

Detta dokument får inte overstyras av:
- gamla VAT box matrices
- gamla phase 6-texter
- gamla XML-exportmallar
- gamla review queues som kunde tvinga inkompatibel ruta
- gamla importer som lagrade box 49 eller momsfordran som fri metadata

## Kanoniska objekt

- `VatScenarioDefinition`
  - bar canonical scenario code, legal basis family, rate profile, report channels och box map

- `VatSourceLink`
  - binder momsbeslut till exakt source object, source posting, source account family och evidence refs

- `VatDecision`
  - bar bindande momsbeslut för en specifik source effect
  - innehåller scenario code, functional amount, rate, deduction profile, review status och report channel refs

- `VatPeriodProfile`
  - bar bolagets frekvens, redovisningsmetod, sign-off policy och tillåtna rapportkanaler

- `VatPeriod`
  - bar en konkret redovisningsperiod med start/slut, lock-status, declaration refs och version lineage

- `VatDeclarationVersion`
  - bar fullständig momsdeklaration för en period och en version
  - ska innehålla alla fält 05-12, 20-24, 30-32, 35-42, 48-50, 60-62 samt derivat för fält 49

- `VatPeriodicStatementVersion`
  - bar fullständig periodisk sammanställning för en period och en version

- `VatOssReturnVersion`
  - bar fullständig specialdeklaration för OSS när plattformen stödjer det

- `VatReviewCase`
  - bar blocked eller ambiguous momsfall

- `VatSubmissionReceipt`
  - bar kvittens, kanal, receipt id, submitted-at, signer identity och checksum för faktisk inlamning

## Kanoniska state machines

### `VatDecision`
- `derived`
- `review_required`
- `approved`
- `reported`
- `superseded`

### `VatPeriod`
- `open`
- `prepared`
- `locked`
- `reopened_via_correction`
- `closed`

### `VatDeclarationVersion`
- `draft`
- `review_pending`
- `finalized`
- `submitted`
- `receipt_recorded`
- `superseded`

### `VatPeriodicStatementVersion`
- `draft`
- `finalized`
- `submitted`
- `receipt_recorded`
- `superseded`

### `VatOssReturnVersion`
- `draft`
- `finalized`
- `submitted`
- `receipt_recorded`
- `superseded`

### `VatReviewCase`
- `open`
- `resolved`
- `approved_override`
- `rejected_override`

## Kanoniska commands

- `DeriveVatDecision`
- `RequireVatReview`
- `ApproveVatDecision`
- `RejectVatDecision`
- `OpenVatPeriod`
- `PrepareVatDeclarationVersion`
- `FinalizeVatDeclarationVersion`
- `SubmitVatDeclarationVersion`
- `RecordVatDeclarationReceipt`
- `PreparePeriodicStatementVersion`
- `SubmitPeriodicStatementVersion`
- `RecordPeriodicStatementReceipt`
- `PrepareOssReturnVersion`
- `SubmitOssReturnVersion`
- `RecordOssReceipt`
- `SupersedeVatVersion`
- `ReopenVatPeriodViaCorrection`
- `LockVatPeriod`
- `MigrateHistoricVatDecision`

## Kanoniska events

- `VatDecisionDerived`
- `VatReviewRequired`
- `VatDecisionApproved`
- `VatDecisionRejected`
- `VatPeriodOpened`
- `VatDeclarationPrepared`
- `VatDeclarationFinalized`
- `VatDeclarationSubmitted`
- `VatDeclarationReceiptRecorded`
- `VatPeriodicStatementPrepared`
- `VatPeriodicStatementSubmitted`
- `VatPeriodicStatementReceiptRecorded`
- `VatOssReturnPrepared`
- `VatOssReturnSubmitted`
- `VatOssReceiptRecorded`
- `VatVersionSuperseded`
- `VatPeriodReopened`
- `VatPeriodLocked`
- `HistoricVatDecisionMigrated`

## Kanoniska route-familjer

- `/v1/vat/scenarios/*`
  - read-only metadata och policy, aldrig fri runtime editing i produktion

- `/v1/vat/decisions/*`
  - review, trace, drilldown och evidence

- `/v1/vat/periods/*`
  - period management, preparation, locking och reopening

- `/v1/vat/declarations/*`
  - draft, finalize, submit och receipt

- `/v1/vat/periodic-statements/*`
  - periodisk sammanställning

- `/v1/vat/oss/*`
  - OSS flows där produkten uttryckligen stödjer dem

- `/v1/vat/reviews/*`
  - blocked och manual-review fall

Förbjudet:
- UI-direktmutation av box values
- fri `PATCH` av godkänd momsruta
- fri overwrite av submitted version
- routes som skriver momssanning utan command boundary

## Kanoniska permissions och review boundaries

- `vat.read`
  - läsa beslut, perioder, versioner och receipts

- `vat.prepare`
  - skapa draft-versioner, men inte signera eller submit

- `vat.review`
  - losa blocked eller ambiguous scenarios

- `vat.finalize`
  - flytta draft till finalized efter kontroll

- `vat.submit`
  - initiera faktisk inlamning

- `vat.reopen_high_risk`
  - öppna period via correction efter lock

- `vat.audit`
  - läsa receipts, supersession lineage och raw evidence

Support/backoffice får aldrig:
- direktjustera box values utan review path
- skriva under eller markera falsk receipt
- kringga blocked avdragsrätt

## Nummer-, serie-, referens- och identitetsregler

- `VatDecisionId` ska vara immutable och globally unique inom bolaget
- `VatPeriodId` ska vara `company + tax regime + frequency + period key`
- `VatDeclarationVersionId`, `VatPeriodicStatementVersionId` och `VatOssReturnVersionId` ska vara monotont versionsokande inom respektive period
- `VatSubmissionReceiptId` ska lagra provider/Skatteverket receipt id och intern checksum
- `VatSourceLink` ska peka till exakt source object id, source journal id och source line fingerprint
- en `VatDecision` får aldrig flyttas till annan period utan correction event och ny lineage

## Valuta-, avrundnings- och omräkningsregler

- intern momsberakning ska vara ore-exakt i SEK
- foreign-currency sources ska först oversättas till SEK enligt source flowets bindande valuta- och kursregel
- momsrutor ska exporteras i hela kronor enligt Skatteverkets kanalregler
- `fält 49` ska alltid derivaras som summan av utgående moms minus `fält 48`
- periodisk sammanställning ska innehålla SEK-belopp enligt svensk rapportkanal
- OSS ska lagra source-currency, tax-currency och settlement-currency när specialordningen kraver det

## Replay-, correction-, recovery- och cutover-regler

- momsbeslut ska kunna rederiveras från source truth utan att nya source journals skapas
- correction får skapa ny deklarationsversion, aldrig overwrite av submitted version
- migrerad historik ska markeras med `historic_imported` men måste fortfarande ha box truth och evidence
- restore eller replay får aldrig dubblera periodisk sammanställning eller OSS return
- om en source correction ändrar momsutfall i en redan locked period ska systemet skapa `reopened_via_correction` och ny version lineage
- receipts får aldrig tappas vid replay eller restore

## Huvudflödet

1. source effect skapas i faktura-, AP-, kvitto- eller utläggsflöde
2. source effect klassas till exakt momsscenario eller blocked review
3. `VatDecision` derivaras med box map, rate profile, deduction profile och report channels
4. ambiguous eller unsupported scenario skapar `VatReviewCase`
5. godkända `VatDecision` akkumuleras i öppen `VatPeriod`
6. systemet bygger `VatDeclarationVersion` för ordinarie momsdeklaration
7. systemet bygger `VatPeriodicStatementVersion` för de decisions som kraver det
8. systemet bygger `VatOssReturnVersion` där produkten uttryckligen stödjer OSS och scenario faktiskt ligger i OSS
9. box arithmetic, channel exclusivity, evidence completeness och period locks valideras
10. version finalizeas
11. version skickas via tillaten kanal eller marks klar för manuell digital underskrift
12. receipt registreras
13. period lockas
14. senare rättelser skapar ny full version och supersederar tidigare version

## Bindande scenarioaxlar

Varje momsscenario måste korsas mot följande axlar:
- side: seller / buyer / receipt / outlay / import / correction
- geography: Sverige / annat EU-land / land utanför EU
- supply type: vara / tjänst / uttag / VMB / hyra / bidrag / export / import
- counterparty type: momsregistrerad beskattningsbar person / icke beskattningsbar person / offentlig kund / mellanman
- rate profile: 25 / 12 / 6 / 0-undantag / VMB / no_swedish_vat / OSS
- reverse-charge profile: none / domestic_goods / domestic_services / eu_goods / eu_services / non_eu_services / import_goods
- deduction profile: full / partial / blocked / no_input_vat
- period model: monthly / quarterly / yearly / OSS-quarterly / OSS-monthly
- correction state: original / corrected_before_submit / replacement_after_submit / migrated_historic
- reporting channel: ordinary_vat / periodic_statement / oss / no_report

## Bindande policykartor

### Canonical box map för ordinarie momsdeklaration

- `BOX05`
  - svensk momspliktig försäljning som inte är uttag, VMB eller frivilligt beskattad hyra

- `BOX06`
  - momspliktiga uttag

- `BOX07`
  - beskattningsunderlag vid VMB

- `BOX08`
  - hyresinkomster vid frivillig beskattning för uthyrning av verksamhetslokal

- `BOX10`
  - utgående moms 25 procent på box 05-08

- `BOX11`
  - utgående moms 12 procent på box 05-08

- `BOX12`
  - utgående moms 6 procent på box 05-08

- `BOX20`
  - inköp av varor från annat EU-land

- `BOX21`
  - inköp av tjänster från annat EU-land enligt huvudregeln

- `BOX22`
  - inköp av tjänster från land utanför EU enligt huvudregeln

- `BOX23`
  - inköp av varor i Sverige där köparen är betalningsskyldig

- `BOX24`
  - övriga inköp av tjänster i Sverige där köparen är betalningsskyldig

- `BOX30`
  - utgående moms 25 procent på box 20-24

- `BOX31`
  - utgående moms 12 procent på box 20-24

- `BOX32`
  - utgående moms 6 procent på box 20-24

- `BOX35`
  - försäljning av varor till annat EU-land

- `BOX36`
  - försäljning av varor utanför EU

- `BOX37`
  - mellanmans inköp av varor vid trepartshandel

- `BOX38`
  - mellanmans försäljning av varor vid trepartshandel

- `BOX39`
  - försäljning av tjänster till beskattningsbar person i annat EU-land enligt huvudregeln

- `BOX40`
  - övrig försäljning av tjänster som tillhandahallits utomlands och inte ska till `BOX39`

- `BOX41`
  - försäljning när köparen är betalningsskyldig i Sverige

- `BOX42`
  - övrig försäljning med mera, undantagen från moms eller övrigt rapporteringskrav

- `BOX48`
  - avdragsgill ingående moms att dra av

- `BOX49`
  - derivat: `BOX10 + BOX11 + BOX12 + BOX30 + BOX31 + BOX32 + BOX60 + BOX61 + BOX62 - BOX48`

- `BOX50`
  - beskattningsunderlag vid import

- `BOX60`
  - utgående moms 25 procent på importunderlag i `BOX50`

- `BOX61`
  - utgående moms 12 procent på importunderlag i `BOX50`

- `BOX62`
  - utgående moms 6 procent på importunderlag i `BOX50`

### Canonical VAT account policy

- `2611`
  - utgående moms 25 procent på svensk omsattning och uttag
- `2621`
  - utgående moms 12 procent på svensk omsattning och uttag
- `2631`
  - utgående moms 6 procent på svensk omsattning och uttag
- `2614`
  - utgående moms på omvänd skattskyldighet och unionsinterna/non-EU förvärv, 25 procent
- `2624`
  - utgående moms på omvänd skattskyldighet och unionsinterna/non-EU förvärv, 12 procent
- `2634`
  - utgående moms på omvänd skattskyldighet och unionsinterna/non-EU förvärv, 6 procent
- `2615`
  - utgående moms import av varor, 25 procent
- `2625`
  - utgående moms import av varor, 12 procent
- `2635`
  - utgående moms import av varor, 6 procent
- `2641`
  - debiterad svensk ingående moms
- `2645`
  - beräknad ingående moms på förvärv från utlandet och import
- `2647`
  - ingående moms på omvänd skattskyldighet i Sverige
- `2650`
  - redovisningskonto för moms, endast i den del skattekontoflödet uttryckligen äger omforing mot skattekonto

### Canonical report channel map

- `ordinary_vat`
  - svensk momsdeklaration
- `periodic_statement`
  - periodisk sammanställning
- `oss_union`
  - OSS unionsordning
- `oss_non_union`
  - OSS tredjelandsordning
- `oss_import`
  - IOSS/importordning
- `no_report`
  - ingen svensk momsrapportkanal

## Bindande canonical proof-ledger med exakta konton eller faltutfall
### VAT-P0001 Svensk momspliktig försäljning 25 procent
- source accounts must include credit `2611`
- declaration: `BOX05` + `BOX10`
- periodic statement: none
- OSS: none
- `BOX49` effect: positive via `BOX10`

### VAT-P0002 Svensk momspliktig försäljning 12 procent
- source accounts must include credit `2621`
- declaration: `BOX05` + `BOX11`
- periodic statement: none
- OSS: none
- `BOX49` effect: positive via `BOX11`

### VAT-P0003 Svensk momspliktig försäljning 6 procent
- source accounts must include credit `2631`
- declaration: `BOX05` + `BOX12`
- periodic statement: none
- OSS: none
- `BOX49` effect: positive via `BOX12`

### VAT-P0004 Momspliktigt uttag
- source accounts must include credit `2611`, `2621` eller `2631` enligt skattesats
- declaration: `BOX06` + relevant `BOX10/11/12`
- periodic statement: none
- OSS: none

### VAT-P0005 VMB-beskattningsunderlag
- source accounts must include relevant output VAT account för faktisk VMB-skattesats
- declaration: `BOX07` + relevant `BOX10/11/12`
- periodic statement: none
- OSS: none

### VAT-P0006 Frivilligt beskattad uthyrning
- source accounts must include credit `2611`
- declaration: `BOX08` + `BOX10`
- periodic statement: none
- OSS: none

### VAT-P0007 Unionsintern varuforsäljning B2B
- source accounts must not include svensk output VAT account
- declaration: `BOX35`
- periodic statement: `periodic_statement.goods`
- OSS: none

### VAT-P0008 Export av varor
- source accounts must not include svensk output VAT account
- declaration: `BOX36`
- periodic statement: none
- OSS: none

### VAT-P0009 Mellanmans inköp vid trepartshandel
- source accounts: no Swedish output VAT account
- declaration: `BOX37`
- periodic statement: none
- OSS: none

### VAT-P0010 Mellanmans försäljning vid trepartshandel
- source accounts: no Swedish output VAT account
- declaration: `BOX38`
- periodic statement: `periodic_statement.triangular`
- OSS: none

### VAT-P0011 Tjänsteforsäljning till EU-köpare enligt huvudregeln
- source accounts: no Swedish output VAT account
- declaration: `BOX39`
- periodic statement: `periodic_statement.service` när köparen har giltigt VAT-nummer och tjänsten är skattepliktig i destinationslandet
- OSS: none

### VAT-P0012 Övrig tjänst tillhandahallen utomlands
- source accounts: no Swedish output VAT account
- declaration: `BOX40`
- periodic statement: none, utom där Skatteverkets regel uttryckligen kraver periodisk sammanställning trots svensk undantagskaraktar
- OSS: none

### VAT-P0013 Försäljning när köparen är betalningsskyldig i Sverige
- source accounts must not include seller-side output VAT account för same transaction
- declaration: `BOX41`
- periodic statement: none
- OSS: none

### VAT-P0014 Övrig momsfri eller undantagen försäljning
- source accounts: no Swedish output VAT account
- declaration: `BOX42`
- periodic statement: none eller explicit service statement när scenariofamiljen kraver det
- OSS: none

### VAT-P0015 Svensk ingående moms fullt avdragsgill
- source accounts must include debit `2641`
- declaration: `BOX48`
- periodic statement: none
- OSS: none
- `BOX49` effect: negative via `BOX48`

### VAT-P0016 Svensk ingående moms delvis avdragsgill
- source accounts must include debit `2641` endast för avdragsgill del
- declaration: `BOX48` med endast avdragsgill andel
- non-deductible del får aldrig till `BOX48`

### VAT-P0017 Svensk ingående moms blockerad
- source accounts must not map any amount to `BOX48`
- declaration: no ordinary VAT deduction
- periodic statement: none
- OSS: none

### VAT-P0018 EU-varuinköp 25 procent
- source accounts must include debit `2645` and credit `2614`
- declaration: `BOX20` + `BOX30` + avdragsgill andel i `BOX48`

### VAT-P0019 EU-varuinköp 12 procent
- source accounts must include debit `2645` and credit `2624`
- declaration: `BOX20` + `BOX31` + avdragsgill andel i `BOX48`

### VAT-P0020 EU-varuinköp 6 procent
- source accounts must include debit `2645` and credit `2634`
- declaration: `BOX20` + `BOX32` + avdragsgill andel i `BOX48`

### VAT-P0021 EU-tjänstekop enligt huvudregeln 25 procent
- source accounts must include debit `2645` and credit `2614`
- declaration: `BOX21` + `BOX30` + avdragsgill andel i `BOX48`

### VAT-P0022 Non-EU-tjänstekop enligt huvudregeln 25 procent
- source accounts must include debit `2645` and credit `2614`
- declaration: `BOX22` + `BOX30` + avdragsgill andel i `BOX48`

### VAT-P0023 Svensk reverse-charge varukop 25 procent
- source accounts must include debit `2647` and credit `2614`
- declaration: `BOX23` + `BOX30` + avdragsgill andel i `BOX48`

### VAT-P0024 Svensk reverse-charge tjänstekop 25 procent
- source accounts must include debit `2647` and credit `2614`
- declaration: `BOX24` + `BOX30` + avdragsgill andel i `BOX48`

### VAT-P0025 Import av varor 25 procent
- source accounts must include debit `2645` and credit `2615`
- declaration: `BOX50` + `BOX60` + avdragsgill andel i `BOX48`

### VAT-P0026 Import av varor 12 procent
- source accounts must include debit `2645` and credit `2625`
- declaration: `BOX50` + `BOX61` + avdragsgill andel i `BOX48`

### VAT-P0027 Import av varor 6 procent
- source accounts must include debit `2645` and credit `2635`
- declaration: `BOX50` + `BOX62` + avdragsgill andel i `BOX48`

### VAT-P0028 Delvis avdragsrätt i blandad verksamhet
- source accounts: original input VAT account according to upstream flow
- declaration: endast den beslutade avdragsgilla andelen får till `BOX48`
- review may be mandatory

### VAT-P0029 OSS-unionsforsäljning
- declaration: no ordinary Swedish VAT box
- periodic statement: none
- OSS: `oss_union`

### VAT-P0030 IOSS/importordning
- declaration: no ordinary Swedish VAT box
- periodic statement: none
- OSS: `oss_import`

### VAT-P0031 Kredit, kundförlust eller annan source correction som minskar säljsidesmoms
- source accounts: reversal på samma VAT account family som original
- declaration: negativ eller reducerad effekt på originalruta och original VAT box
- ny version required om perioden redan är submitted eller locked

### VAT-P0032 Correction som minskar eller korrigerar input-VAT
- source accounts: reversal eller non-deductible reclass enligt upstream flow
- declaration: reducerad `BOX48`
- ny version required om perioden redan är submitted eller locked

### VAT-P0033 Ersättningsdeklaration
- no new source posting
- declaration: ny fullständig version med komplett box set
- tidigare version becomes `superseded`

### VAT-P0034 Rattad periodisk sammanställning
- no new source posting
- periodic statement: ny fullständig version för samma period

### VAT-P0035 Tjänst som är undantagen från skatteplikt i Sverige men ska med i periodisk sammanställning
- declaration: `BOX42`
- periodic statement: `periodic_statement.service`
- source accounts: ingen svensk output VAT

### VAT-P0036 Utlandsk moms på inköp
- source accounts must not include Swedish input VAT accounts för utlandsk debiterad moms
- declaration: no `BOX48`
- report channel: `no_report`

### VAT-P0037 Sälj av anläggningstillgang utan tidigare avdragsrätt
- declaration: `BOX42`
- source accounts: no Swedish output VAT account

### VAT-P0038 `BOX49` derivat
- no source posting
- declaration: arithmetic only
- manual overwrite forbidden

## Bindande rapport-, export- och myndighetsmappning

- ordinarie momsdeklaration ska omfatta `BOX05-12`, `BOX20-24`, `BOX30-32`, `BOX35-42`, `BOX48-50`, `BOX60-62` och derivat `BOX49`
- periodisk sammanställning ska innehålla VAT-nummer, period, typkod och belopp enligt Skatteverkets format
- OSS ska ligga i separat kanal och får inte dubbleras i ordinarie momsdeklaration
- importmoms ska mappas till `BOX50` och `BOX60-62`, aldrig till `BOX30-32`
- tjänster enligt huvudregeln till beskattningsbar person i annat EU-land ska i normalfallet till `BOX39` och periodisk sammanställning
- om Skatteverket uttryckligen anger att tjänsten i stallet ska till `BOX42` men fortfarande periodisk sammanställning, ska den kombinationen tillatas endast för explicit scenariofamilj

## Bindande scenariofamilj till proof-ledger och rapportspar

### A. Svensk output VAT
- `VAT-A001` svensk momspliktig 25 -> `VAT-P0001`
- `VAT-A002` svensk momspliktig 12 -> `VAT-P0002`
- `VAT-A003` svensk momspliktig 6 -> `VAT-P0003`
- `VAT-A004` uttag -> `VAT-P0004`
- `VAT-A005` VMB -> `VAT-P0005`
- `VAT-A006` frivilligt beskattad lokalhyra -> `VAT-P0006`

### B. Cross-border seller scenarios
- `VAT-B001` EU-vara B2B -> `VAT-P0007`
- `VAT-B002` export vara -> `VAT-P0008`
- `VAT-B003` mellanmans inköp trepart -> `VAT-P0009`
- `VAT-B004` mellanmans försäljning trepart -> `VAT-P0010`
- `VAT-B005` EU-tjänst huvudregel -> `VAT-P0011`
- `VAT-B006` annan tjänst tillhandahallen utomlands -> `VAT-P0012`
- `VAT-B007` svensk omvänd skattskyldighet på säljsidan -> `VAT-P0013`
- `VAT-B008` övrig undantagen försäljning eller bidrag -> `VAT-P0014`

### C. Input VAT and reverse-charge purchase scenarios
- `VAT-C001` svensk input deductible -> `VAT-P0015`
- `VAT-C002` svensk input partial -> `VAT-P0016`, `VAT-P0028`
- `VAT-C003` svensk input blocked -> `VAT-P0017`
- `VAT-C004` EU-varuinköp 25 -> `VAT-P0018`
- `VAT-C005` EU-varuinköp 12 -> `VAT-P0019`
- `VAT-C006` EU-varuinköp 6 -> `VAT-P0020`
- `VAT-C007` EU-tjänstekop 25 -> `VAT-P0021`
- `VAT-C008` non-EU-tjänstekop 25 -> `VAT-P0022`
- `VAT-C009` svensk reverse-charge varor 25 -> `VAT-P0023`
- `VAT-C010` svensk reverse-charge tjänster 25 -> `VAT-P0024`
- `VAT-C011` import 25 -> `VAT-P0025`
- `VAT-C012` import 12 -> `VAT-P0026`
- `VAT-C013` import 6 -> `VAT-P0027`
- `VAT-C014` utlandsk debiterad moms -> `VAT-P0036`

### D. Versioning and special channels
- `VAT-D001` OSS unionsordning -> `VAT-P0029`
- `VAT-D002` IOSS/importordning -> `VAT-P0030`
- `VAT-D003` säljcorrection -> `VAT-P0031`
- `VAT-D004` input correction -> `VAT-P0032`
- `VAT-D005` ersättningsdeklaration -> `VAT-P0033`
- `VAT-D006` rattad periodisk sammanställning -> `VAT-P0034`
- `VAT-D007` undantagen tjänst i Sverige men PS-pliktig -> `VAT-P0035`
- `VAT-D008` `BOX49` derivat -> `VAT-P0038`

## Tvingande dokument- eller indataregler

- varje momsbeslut måste ha source object, source date, source amount, rate profile, geography och legal basis
- sales-side scenarios som bygger på momsfri EU-leverans måste ha transportevidence och giltigt VAT-nummer där Skatteverkets regel kraver det
- importscenarier måste ha tull- eller importbeslut med beskattningsunderlag för `BOX50`
- partial deduction måste ha explicit avdragsandel och legal eller policygrund
- `BOX41` får bara användas om seller-side scenario faktiskt är omvänd skattskyldighet i Sverige
- `BOX42` får inte bli sopruta för allt som inte passar annanstans

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `VATR001` svensk momspliktig 25
- `VATR002` svensk momspliktig 12
- `VATR003` svensk momspliktig 6
- `VATR004` uttag
- `VATR005` VMB vara eller resetjänst
- `VATR006` frivillig beskattning lokalhyra
- `VATR007` unionsintern varuleverans
- `VATR008` export av vara
- `VATR009` tjänst till beskattningsbar person i annat EU-land enligt huvudregeln
- `VATR010` annan tjänst tillhandahallen utomlands
- `VATR011` omvänd skattskyldighet i Sverige på säljsidan
- `VATR012` undantagen omsattning eller bidrag till `BOX42`
- `VATR013` unionsinternt förvärv vara
- `VATR014` EU-tjänstekop huvudregeln
- `VATR015` non-EU-tjänstekop huvudregeln
- `VATR016` omvänd skattskyldighet i Sverige på köpsidan
- `VATR017` import av varor
- `VATR018` full avdragsrätt
- `VATR019` delvis avdragsrätt
- `VATR020` blockerad avdragsrätt
- `VATR021` OSS unionsordning
- `VATR022` OSS importordning

## Bindande faltspec eller inputspec per profil

### Seller domestic profile
- company VAT number
- source invoice id or seller journal id
- supply country = Sweden
- rate profile 25/12/6
- source VAT account 2611/2621/2631

### EU goods sale profile
- buyer VAT number
- transport evidence refs
- dispatch country = Sweden
- destination EU country
- no Swedish output VAT account

### EU service profile
- buyer VAT number där relevant
- main-rule confirmation
- destination country
- no Swedish output VAT account

### Input VAT profile
- source AP or receipt id
- source VAT account 2641/2645/2647
- deduction profile
- blocked reason om `BOX48` ej tillaten

### Import profile
- customs or import decision id
- tax base för `BOX50`
- source VAT account 2615/2625/2635 + 2645

### Declaration submission profile
- period id
- version id
- signer role
- submission channel
- receipt id

## Scenariofamiljer som hela systemet måste tacka

- svensk momspliktig försäljning 25/12/6
- uttag
- VMB
- frivillig beskattning lokalhyra
- EU-varuforsäljning B2B
- export av varor
- trepartshandel inköp och försäljning
- EU-tjänster enligt huvudregeln
- ändra tjänster tillhandahallna utomlands
- svensk omvänd skattskyldighet på säljsidan
- övrig momsfri eller undantagen försäljning
- svensk input VAT fullt avdragsgill
- svensk input VAT delvis avdragsgill
- svensk input VAT blockerad
- EU-varuinköp 25/12/6
- EU-tjänstekop
- non-EU-tjänstekop
- svensk reverse charge goods/services
- importmoms 25/12/6
- utlandsk moms utan svensk avdragsrätt
- OSS unionsordning
- IOSS/importordning
- säljcorrection, kundförlust och credit impact på moms
- input correction
- ersättningsdeklaration
- rattad periodisk sammanställning

## Scenarioregler per familj

- varje seller-source ska först provas mot `BOX05/06/07/08`, `BOX35-42` eller `no_report`
- varje buyer-source ska först provas mot `BOX20-24`, `BOX48`, `BOX50`, `BOX60-62` eller `no_report`
- `BOX35` kraver unionsintern varuleverans till VAT-registrerad köpare och transportevidence
- `BOX39` kraver huvudregelstjänst till beskattningsbar person i annat EU-land
- `BOX40` får bara användas om tjänsten tillhandahalls utomlands men inte hor hemma i `BOX39`
- `BOX41` får bara användas när köparen i Sverige är betalningsskyldig
- `BOX42` får bara användas för uttryckliga undantagsscenarier, bidrag eller ändra Skatteverket-uppraknade fall
- `BOX48` får bara innehålla avdragsgill svensk eller beräknad svensk input VAT
- `BOX49` får bara derivaras

## Blockerande valideringar

- missing or invalid scenario code -> blocker
- source effect without legal basis -> blocker
- `BOX35` without valid buyer VAT number or transportevidence -> blocker
- `BOX39` service without main-rule qualification -> blocker
- `BOX50` without customs/import evidence -> blocker
- attempt to put foreign VAT into `BOX48` -> blocker
- attempt to put OSS transaction into ordinary box -> blocker
- attempt to report same source to both `ordinary_vat` and `oss_*` -> blocker
- attempt to store `BOX49` as manual field -> blocker
- submitted period changed without replacement version -> blocker

## Rapport- och exportkonsekvenser

- varje `VatDecision` ska kunna förklara exakt vilken ruta, periodisk sammanställning eller OSS-ordning den traffar
- varje declaration version ska kunna exporteras som fullständig payload till Skatteverkets kanal
- varje periodisk sammanställning ska kunna exporteras med VAT-nummer, periodkod och typkod
- varje submitted version ska ha receipt och checksum
- ingen export får bygga belopp från fri UI-inmatning

## Förbjudna förenklingar

- att alltid lagga all momsfri försäljning i `BOX42`
- att alltid lagga alla utlandstjänster i `BOX40`
- att alltid boka all input VAT till `BOX48`
- att alltid använda `2614` för importmoms
- att alltid använda `2641` för all input VAT
- att anta att periodisk sammanställning och momsdeklaration alltid har samma belopp
- att lagra `BOX49` som vanlig databaspost utan derivation
- att lata review override skriva direkt i ruta utan scenario code
## Fler bindande proof-ledger-regler för specialfall

### VAT-P0039 Frivillig beskattning upphor eller saknar lagligt underlag
- no ordinary VAT reporting until nytt giltigt underlag finns
- scenario becomes review-required or corrected historical version depending on timing

### VAT-P0040 Unsupported import without tax base
- no `BOX50`
- no `BOX60/61/62`
- review required

### VAT-P0041 Partial deduction with annual or periodic adjustment
- no direct overwrite of historical `BOX48`
- adjustment must create explicit correction decision and ny version lineage

### VAT-P0042 Blandat source packet med flera momskanaler
- source packet must split into separate `VatDecision` rows per legal effect
- one packet may map to several boxes but never through one opaque row

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `VAT-P0001-P0014`
  - no new subledger state in momsflödet
  - effect is declaration-state only

- `VAT-P0015-P0028`
  - no new AP or receipt state created here
  - effect is deduction-state, declaration-state and review-state only

- `VAT-P0029-P0030`
  - no ordinary Swedish declaration effect
  - effect is OSS return state only

- `VAT-P0031-P0034`
  - effect is supersession lineage and replacement version state

- `VAT-P0038`
  - effect is arithmetic derivation only

## Bindande verifikations-, serie- och exportregler

- momsflödet får inte skapa egna verifikationsnummer för source journals
- momsflödet får skapa deklarationsversionsnummer och receiptserier
- varje declaration export måste kunna återkopplas till exakt version id
- varje periodisk sammanställning måste ha separat versionsserie per period
- varje OSS return måste ha separat versionsserie per ordning och period
- export till Skatteverkets API får bara ske för finalized version och behörig sign path
- digital underskrift och faktisk inlamning får bara ske via tillaten Skatteverkskanal eller annan uttryckligen bindande kanal

## Bindande variantmatris som måste korsas mot varje scenariofamilj

Varje scenariofamilj måste provas mot följande variantklasser där de är tillämpliga:
- `VAR001` original vs correction
- `VAR002` monthly vs quarterly vs yearly period
- `VAR003` invoice method vs cash method timing impact
- `VAR004` full deduction vs partial deduction vs blocked deduction
- `VAR005` Sweden vs EU vs non-EU geography
- `VAR006` rate 25 vs 12 vs 6
- `VAR007` ordinary VAT vs periodic statement vs OSS vs no report
- `VAR008` source from invoice vs AP vs receipt vs import decision
- `VAR009` open period vs submitted period vs locked period
- `VAR010` migrated historic vs native runtime-created

## Bindande fixture-klasser för momsflödet

- `VAT-FXT-001`
  - svensk inrikes 25 procent normal scenario
- `VAT-FXT-002`
  - svensk inrikes 12 procent
- `VAT-FXT-003`
  - svensk inrikes 6 procent
- `VAT-FXT-004`
  - EU-goods B2B with valid VAT number and transport evidence
- `VAT-FXT-005`
  - export goods outside EU
- `VAT-FXT-006`
  - EU purchase self-assessment 25 percent
- `VAT-FXT-007`
  - domestic reverse charge build/service 25 percent
- `VAT-FXT-008`
  - import goods 25 percent with customs base
- `VAT-FXT-009`
  - blocked foreign VAT
- `VAT-FXT-010`
  - partial deduction with explicit deductible ratio
- `VAT-FXT-011`
  - OSS union sale to EU consumer
- `VAT-FXT-012`
  - correction of previously submitted period

## Bindande expected outcome-format per scenario

Varje testbart momsscenario måste minst ange:
- scenario id
- source fixture class
- source flow owner
- source accounts
- expected box map
- expected periodic statement effect
- expected OSS effect
- expected review/block state
- expected declaration version effect
- expected receipt requirement

## Bindande canonical verifikationsseriepolicy

- source journals behaller sina serier från source flows
- declaration versions ska använda `VATDEC-<period>-v<nr>`
- periodisk sammanställning ska använda `VATPS-<period>-v<nr>`
- OSS return ska använda `VATOSS-<ordning>-<period>-v<nr>`
- receipts ska använda `VATRCPT-<channel>-<id>` eller provider-receipt som primart external id

## Bindande expected outcome per central scenariofamilj

### `VAT-A001` svensk momspliktig 25
- fixture minimum: `VAT-FXT-001`
- source accounts: credit `2611`
- expected boxes: `BOX05` = tax base, `BOX10` = output VAT
- expected periodic statement: none
- expected OSS: none
- expected block state: none

### `VAT-B001` EU-vara B2B
- fixture minimum: `VAT-FXT-004`
- source accounts: no Swedish output VAT account
- expected boxes: `BOX35`
- expected periodic statement: goods line with buyer VAT number
- expected OSS: none
- expected block state: if missing VAT number or transport evidence -> block

### `VAT-B005` EU-tjänst huvudregel
- fixture minimum: `VAT-FXT-004`
- source accounts: no Swedish output VAT account
- expected boxes: `BOX39`
- expected periodic statement: service line if buyer VAT number and taxability requirements are met
- expected block state: if main-rule qualification missing -> block

### `VAT-C001` svensk input deductible
- fixture minimum: `VAT-FXT-001`
- source accounts: debit `2641`
- expected boxes: `BOX48`
- expected block state: none

### `VAT-C004` EU-varuinköp 25
- fixture minimum: `VAT-FXT-006`
- source accounts: debit `2645`, credit `2614`
- expected boxes: `BOX20`, `BOX30`, deductible share in `BOX48`
- expected block state: if EU-goods criteria missing -> block

### `VAT-C010` svensk reverse-charge tjänster 25
- fixture minimum: `VAT-FXT-007`
- source accounts: debit `2647`, credit `2614`
- expected boxes: `BOX24`, `BOX30`, deductible share in `BOX48`
- expected block state: if Swedish buyer-liability criteria missing -> block

### `VAT-C011` import goods 25
- fixture minimum: `VAT-FXT-008`
- source accounts: debit `2645`, credit `2615`
- expected boxes: `BOX50`, `BOX60`, deductible share in `BOX48`
- expected block state: if customs base missing -> block

### `VAT-C014` utlandsk debiterad moms
- fixture minimum: `VAT-FXT-009`
- source accounts: no Swedish input VAT account allowed
- expected boxes: none
- expected block state: no Swedish deduction, explicit no-report

### `VAT-D001` OSS unionsordning
- fixture minimum: `VAT-FXT-011`
- source accounts: no ordinary Swedish output VAT box mapping
- expected boxes: none in ordinary VAT return
- expected OSS: union return line by destination country and rate
- expected block state: if same source also tries ordinary return -> block

### `VAT-D005` ersättningsdeklaration
- fixture minimum: `VAT-FXT-012`
- source accounts: no new source posting
- expected outcome: ny full declaration version, previous version superseded, receipt chain preserved

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `VAT-A001` -> `VAT-P0001`
- `VAT-A002` -> `VAT-P0002`
- `VAT-A003` -> `VAT-P0003`
- `VAT-A004` -> `VAT-P0004`
- `VAT-A005` -> `VAT-P0005`
- `VAT-A006` -> `VAT-P0006`
- `VAT-B001` -> `VAT-P0007`
- `VAT-B002` -> `VAT-P0008`
- `VAT-B003` -> `VAT-P0009`
- `VAT-B004` -> `VAT-P0010`
- `VAT-B005` -> `VAT-P0011`
- `VAT-B006` -> `VAT-P0012`
- `VAT-B007` -> `VAT-P0013`
- `VAT-B008` -> `VAT-P0014`
- `VAT-C001` -> `VAT-P0015`
- `VAT-C002` -> `VAT-P0016`, `VAT-P0028`
- `VAT-C003` -> `VAT-P0017`
- `VAT-C004` -> `VAT-P0018`
- `VAT-C005` -> `VAT-P0019`
- `VAT-C006` -> `VAT-P0020`
- `VAT-C007` -> `VAT-P0021`
- `VAT-C008` -> `VAT-P0022`
- `VAT-C009` -> `VAT-P0023`
- `VAT-C010` -> `VAT-P0024`
- `VAT-C011` -> `VAT-P0025`
- `VAT-C012` -> `VAT-P0026`
- `VAT-C013` -> `VAT-P0027`
- `VAT-C014` -> `VAT-P0036`
- `VAT-D001` -> `VAT-P0029`
- `VAT-D002` -> `VAT-P0030`
- `VAT-D003` -> `VAT-P0031`
- `VAT-D004` -> `VAT-P0032`
- `VAT-D005` -> `VAT-P0033`
- `VAT-D006` -> `VAT-P0034`
- `VAT-D007` -> `VAT-P0035`
- `VAT-D008` -> `VAT-P0038`

## Bindande testkrav

- varje proof-ledger `VAT-P0001-VAT-P0042` ska ha minst ett testfall
- varje scenariofamilj `VAT-A001-VAT-D008` ska ha minst ett positivt testfall
- varje blockerregel ska ha minst ett negativt testfall
- `BOX49` ska testas som derivat, aldrig som lagrad inmatning
- periodisk sammanställning ska testas separat från ordinarie momsdeklaration
- OSS ska testas med explicit no-double-report assertion
- correction efter submitted period ska testas som replacement version, inte overwrite
- importmoms ska testas med separat importbeslut som källunderlag
- partial deduction ska testas sa att endast den avdragsgilla andelen traffar `BOX48`
- foreign VAT ska testas sa att den aldrig traffar `BOX48`
- EU-goods sales ska testas med och utan giltigt VAT-nummer och med och utan transportevidence
- tjänster som är undantagna i Sverige men PS-pliktiga ska testas mot kombinationen `BOX42 + periodic_statement`

## Källor som styr dokumentet

- Skatteverket, Fylla i momsdeklarationen: https://www.skatteverket.se/foretag/moms/deklareramoms/fyllaimomsdeklarationen.4.3a2a542410ab40a421c80004214.html
- Skatteverket, Periodisk sammanställning för varor och tjänster: https://skatteverket.se/foretag/moms/deklareramoms/periodisksammanstallningforvarorochtjanster.4.58d555751259e4d661680001093.html
- Skatteverket, Lamna periodisk sammanställning med filöverföring: https://skatteverket.se/foretag/moms/deklareramoms/periodisksammanstallning/lamnaperiodisksammanstallningmedfiloverforing.4.7eada0316ed67d72822104.html
- Skatteverket, Deklarera och betala moms i One Stop Shop: https://skatteverket.se/foretag/moms/deklareramoms/ansokomattdeklareradistansforsaljningionestopshoposs/deklareraochbetalamomsionestopshop.4.40cab8f8197edf03e644dee.html
- Skatteverket, API för Momsdeklaration, tjänstebeskrivning: https://www7.skatteverket.se/portal-wapi/open/apier-och-oppna-data/utvecklarportalen/v1/getFile/tjanstebeskrivning-momsdeklaration-v1-0/pdf/1.0.5/Tjanstebeskrivning-Momsdeklaration-v1.pdf
- Skatteverket, Sälja varor till ändra EU-lander: https://skatteverket.se/foretag/moms/saljavarorochtjanster/forsaljningtillandraeulander/saljavarortillandraeulander.4.18e1b10334ebe8bc8000782.html
- Skatteverket, Moms- och arbetsgivardeklarationer SKV 409: https://skatteverket.se/download/18.4a4d586616058d860bcc0e3/1708610818566/moms-och-arbetsgivardeklarationer-skv409-utgava21.pdf
- BAS 2025: https://www.bas.se/wp-content/uploads/2025/01/Kontoplan-BAS-2025.pdf

