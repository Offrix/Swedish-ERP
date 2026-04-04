# LEVFAKTURAFLÖDET_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för hela leverantörsfakturaflödet.

Det är inte en beskrivning av nuvarande runtime. Det är den canonical truth som hela repo:t ska byggas mot för:
- leverantörsmasterdata
- inköpsorder
- godsmottag
- leverantörsfakturor
- leverantörskreditnotor
- two-way och three-way matchning
- AP-posting
- AP-open items
- skapande av AP-open-items och bindande handoff till downstream settlementflow
- purchase-side payment blockers som måste finnas redan före handoff
- svensk moms på inköp
- import-, EU- och reverse-charge-kop
- cash method / kontantmetod
- replay, migration, correction och audit

## Syfte

Detta dokument ska ensam kunna styra hur levfakturaflödet byggs, bokförs, blockerar fel, rapporterar, exporterar och testas.

Läsaren ska kunna bygga hela AP-karnan utan att gissa:
- vilka objekt som finns
- hur state machines ser ut
- vilka commands och events som gäller
- hur olika inköpsscenarier bokförs
- hur moms och avdragsrätt styrs
- vilka fakturafalt som måste finnas på inkommande dokument
- vilka scenarier som måste blockeras
- vilka tester som måste passera

## Omfattning

Detta dokument omfattar:
- leverantörsfaktura som inkommer via API, e-post, OCR, Peppol eller integration
- leverantörskreditnota
- leverantör som svensk, EU- eller non-EU-motpart
- vanlig svensk leverantörsfaktura med 25/12/6/0
- blandade momssatser
- helt eller delvis icke avdragsgill moms
- svensk omvänd betalningsskyldighet på inköp
- EU-varukop
- EU-tjänstekop
- non-EU-tjänstekop
- varuimport med separat importmomsbeslut
- tillgangs-, lager-, projekt-, periodiserings- och kostnadsbokning
- invoice method / faktureringsmetod
- cash method / kontantmetod
- bindande handoff av postade open items till downstream settlementflow
- payment hold, import-case hold och classification hold

Detta dokument omfattar inte:
- kundfaktura
- lön
- HUS/ROT/RUT
- full asset-livscykel efter första bokning
- full lagerlivscykel efter första AP-recognition

Dessa omraden får inte definiera egen avvikande AP-truth.

Kanonisk agarskapsregel:
- `LEVFAKTURAFLODET_BINDANDE_SANNING.md` äger köparsidans invoice-, coding-, posting- och purchase-VAT-verklighet fram till att `ApOpenItem` är skapat
- all AP-bokföring, avdragsrätt, importmoms, unionsinterna inköp och svensk omvänd betalningsskyldighet på inköp ska definieras har fram till skapad open-item-truth
- `LEVERANTORSBETALNINGAR_OCH_LEVERANTORSRESKONTRA_BINDANDE_SANNING.md` äger all supplier settlement truth efter posting, inklusive supplier advances, AP-betalning, AP-retur, fees, FX, netting och leverantörsreskontra
- självbeskattning med `2614/2615/2624/2625/2634/2635` och avdragskonton `2645/2647` får bara definieras har eller i dokument som uttryckligen äger AP-specialregeln

## Absoluta principer

- ingen leverantörsfaktura får postas utan full coding, korrekt momsklass och stangd reviewstatus
- ingen leverantörsfaktura får betalas utan postad AP-truth, korrekt leverantörsbetaldata och fri payment hold
- ingen leverantörskreditnota får registreras utan korrekt originalkoppling, om inte uttrycklig policy för okopplad kreditnota finns
- inkommande dokument får aldrig skapa avdragsrätt utan tillrackliga fakturauppgifter
- `0 %` eller avsaknad av moms på leverantörsfaktura är aldrig tillatet utan laglig orsak, korrekt profilklassning och korrekt rapportmappning
- AP får aldrig dolja felklassning genom catch-all-konto, klumpsaldo eller metadataflaggor
- all AP-truth måste vara replaybar, auditbar och idempotent
- bankreservation får aldrig fejka slutlig reglering om pengar inte bokats ut
- importmoms får aldrig bokas som om den kom direkt på leverantörsfakturan om underlaget i verkligheten kommer från tull- eller importbeslut
- avdragsforbud, blandad verksamhet och begränsad avdragsrätt får aldrig overkorras av generell `2641`-logik
- detta dokument får inte bli tunnare an fakturabibeln och får inte ersättas av kodantäganden

## Bindande dokumenthierarki för levfakturaflödet

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- detta dokument

Detta dokument lutar på:
- `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md` för all upstream ingest-, OCR-, confidence-, duplicate-, review- och routing-sanning fram till att AP får ta över
- `INKOP_VARUMOTTAG_OCH_LEVERANSMATCHNING_BINDANDE_SANNING.md` för PO, goods receipt, ownership acceptance, 2-way/3-way match och invoice-before-receipt-holds innan AP-open-item får slappas vidare
- `FAKTURAFLODET_BINDANDE_SANNING.md` endast för tvärdomänsregler om dokumentprofil, valuta, replay och correction-symmetri
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` för all voucherregler, serier, kontrollkonton, correction chains, period locks och SIE4-vouchertruth när AP-source truth materialiseras som legal bokföring
- `PERIODISERING_OCH_BOKSLUTSOMFORINGAR_BINDANDE_SANNING.md` för upplupen kostnad, förutbetald kostnad, bokslutscutoff och låter invoice handoff när timingtruth gar ut över vanlig AP issue
- `MOMSFLODET_BINDANDE_SANNING.md` för slutlig box mapping, replacement declarations, periodisk sammanställning, OSS och all slutlig momsrapporterings-truth efter att AP-source truth skapats
- `LEVERANTORSBETALNINGAR_OCH_LEVERANTORSRESKONTRA_BINDANDE_SANNING.md` för downstream settlement truth efter att `ApOpenItem` är skapat

Detta dokument får inte overstyras av:
- gamla AP-runbooks
- gamla phase6-dokument
- gamla BAS-antäganden i runtime
- gamla tests som bygger på fel liability-konto eller fel momslogik

Fas 6, 13, 20, 27 och 28 får inte definiera avvikande AP-truth.

Upstream-agarskapsregel:
- hur inkommande dokument tas emot, OCR-lasas, AI-klassas, confidence-satts, duplicate-testas och routas ägs av `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md`
- detta dokument äger först AP-truth efter att scanninglagret gett dokumentet family, routing, blockerstatus och lineage

## Kanoniska objekt

- `SupplierMaster`
  - bar juridisk och operativ leverantörstruth
  - innehåller identitet, VAT-status, land, betaldata, F-skattstatus där relevant, payment blocking och attestkedja

- `PurchaseOrder`
  - bar bestallningstruth för two-way/three-way match
  - innehåller bestallda rader, priser, toleranser, leveranskrav och target-type

- `GoodsReceipt`
  - bar mottagningstruth
  - får aldrig ersättas av fri text på leverantörsfaktura

- `SupplierInvoiceDocument`
  - bar legal och operativ truth för inkommande leverantörsfaktura
  - innehåller extern fakturareferens, datum, valutainfo, line coding, momsprofil, matchresultat, reviewstatus, approvalstatus, postingstatus och open-item-länk

- `SupplierCreditNoteDocument`
  - bar legal och operativ truth för inkommande leverantörskreditnota
  - innehåller originalkoppling, reverseringsmodell, ap-open-item-effekt och eventuell offset-policy

- `SupplierInvoiceVariance`
  - bar bindande avvikelse mellan faktura, order, mottag eller skattelogik
  - får blockera posting eller betalning

- `ApOpenItem`
  - bar leverantörsskuldens regleringsstatus
  - innehåller originalbelopp, öppet belopp, reserverat belopp, betalt belopp, valuta, functional amount, payment-status och banklänkar

- `ApPaymentLifecycleReceipt`
  - bar bevis för reservation, accept, bankbokning, return eller rejection
  - får inte ersätta `ApOpenItem`, bara komplettera dess historik

- `ImportCaseLink`
  - binder leverantörsfaktura mot tull-, frakt-, importmoms- och customsunderlag
  - måste kunna blockera posting

- `ClassificationCaseLink`
  - binder dokumentklassning och review center till leverantörsfaktura
  - måste kunna blockera posting och betalning

## Kanoniska state machines

### `SupplierMaster`

- `draft`
- `active`
- `blocked`
- `archived`

### `PurchaseOrder`

- `draft`
- `approved`
- `sent`
- `partially_received`
- `fully_received`
- `closed`
- `cancelled`

### `GoodsReceipt`

- `draft`
- `registered`
- `reversed`
- `closed`

### `SupplierInvoiceDocument`

- `draft`
- `ingested`
- `matching`
- `pending_approval`
- `approved`
- `posted`
- `scheduled_for_payment`
- `partially_settled`
- `settled`
- `partially_credited`
- `fully_credited`
- `returned_to_open`
- `voided`
- `closed`

### `SupplierCreditNoteDocument`

- `draft`
- `ingested`
- `pending_approval`
- `approved`
- `posted`
- `applied_partial`
- `applied_full`
- `closed`

### `SupplierInvoiceVariance`

- `open`
- `accepted`
- `corrected`
- `closed`

### `ApOpenItem`

- `open`
- `reserved`
- `partially_settled`
- `settled`
- `returned`
- `reopened`
- `closed`

## Kanoniska commands

- `CreateSupplier`
- `ImportSupplierMaster`
- `UpdateSupplierPaymentDetails`
- `BlockSupplierPayments`
- `CreatePurchaseOrder`
- `ApprovePurchaseOrder`
- `SendPurchaseOrder`
- `RegisterGoodsReceipt`
- `ReverseGoodsReceipt`
- `IngestSupplierInvoice`
- `IngestSupplierCreditNote`
- `LinkImportCase`
- `LinkClassificationCase`
- `RunSupplierInvoiceMatch`
- `ApproveSupplierInvoice`
- `PostSupplierInvoice`
- `PostSupplierCreditNote`
- `ReserveApPayment`
- `BookApPayment`
- `RejectApPayment`
- `ReturnApPayment`
- `ReopenApOpenItem`
- `ApplySupplierCreditToOpenItem`
- `LockApExport`

## Kanoniska events

- `SupplierCreated`
- `SupplierPaymentDetailsChanged`
- `SupplierPaymentBlocked`
- `PurchaseOrderCreated`
- `PurchaseOrderApproved`
- `PurchaseOrderSent`
- `GoodsReceiptRegistered`
- `GoodsReceiptReversed`
- `SupplierInvoiceIngested`
- `SupplierCreditNoteIngested`
- `SupplierInvoiceMatched`
- `SupplierInvoiceApprovalCompleted`
- `SupplierInvoicePosted`
- `SupplierCreditNotePosted`
- `ApOpenItemCreated`
- `ApPaymentReserved`
- `ApPaymentBooked`
- `ApPaymentRejected`
- `ApPaymentReturned`
- `ApOpenItemReopened`
- `SupplierCreditApplied`
- `ApExportLocked`

## Kanoniska route-familjer

Canonical route family för levfakturaflödet ska vara:
- `/v1/ap/suppliers/*`
- `/v1/ap/purchase-orders/*`
- `/v1/ap/receipts/*`
- `/v1/ap/invoices/*`
- `/v1/ap/credits/*`
- `/v1/ap/open-items/*`
- `/v1/ap/import-cases/*`
- `/v1/ap/review/*`
- `/v1/ap/exports/*`

För reglering får dokumentet dessutom luta på:
- `/v1/banking/payment-proposals/*`
- `/v1/banking/payment-orders/*`

Ingen route utanför dessa familjer får skapa eller mutera legal-effect AP-truth.

## Kanoniska permissions och review boundaries

- lag risk lasning:
  - `ap.read`
- leverantörsmasterdata:
  - `ap.supplier.manage`
- purchase order och receipt:
  - `ap.procurement.manage`
- supplier invoice draft/ingest:
  - `ap.invoice.ingest`
- coding och tax review:
  - `ap.invoice.review`
- approval/attest:
  - `ap.invoice.approve`
- posting:
  - `ap.invoice.post`
- payment proposal/reservation:
  - `ap.payment.prepare`
- payment approve/submit:
  - `ap.payment.approve`
- bankretur/rejection/reopen:
  - `ap.payment.reconcile`
- support:
  - får se maskad dokumenttruth men får inte bypassa approval eller tax blockers

## Nummer-, serie-, referens- och identitetsregler

- intern leverantörs-id ska vara entydig per company
- `supplierNo` ska ha egen nummerserie
- `poNo` ska ha egen nummerserie
- `receiptNo` ska ha egen nummerserie
- intern `supplierInvoiceNo` ska ha egen nummerserie separat från leverantörens externa fakturanummer
- `externalInvoiceRef` är leverantörens fakturanummer och får aldrig tappas bort
- `originalSupplierInvoiceId` är obligatorisk för kopplad kreditnota
- `paymentReference` måste sparas separat från `externalInvoiceRef`
- OCR, KID, bankgiro, plusgiro, IBAN och BIC får inte blandas till ett fritt textfalt
- samma leverantör + samma externfakturaref + samma datum + samma belopp + samma valuta + samma dokumenthash ska trigga duplicate control

## Valuta-, avrundnings- och omräkningsregler

- funktionell redovisningsvaluta är SEK om inte annan canonical ledger currency uttryckligen satts
- inkommande leverantörsfaktura i annan valuta måste lagra:
  - dokumentvaluta
  - dokumentbelopp
  - exchange rate
  - functional SEK-belopp
- om leverantörsfakturan innehåller svensk moms i annan valuta måste momsbelopp i SEK framga på källsidan för att avdragsrätt ska kunna automatiseras
- AP-open-item ska alltid spara bade originalvaluta och functional valuta
- partial settlement i annan valuta måste kunna ge realiserad kursdifferens
- kreditnota i annan valuta måste spegla originalvalutans legal truth och korrekt functional effekt

## Replay-, correction-, recovery- och cutover-regler

- `IngestSupplierInvoice` måste vara idempotent på canonical fingerprint
- OCR- eller API-replay får inte skapa ny skuld om fingerprint är identiskt
- correction får aldrig radera original invoice truth
- supplier credit note är canonical korrektion när leverantör reverserar fakturan
- payment return och rejection måste skapa ny operational truth utan att förstora historiken
- cutoverimport av historiska leverantörsfakturor måste kunna markera:
  - already posted
  - already settled
  - still open
  - partially settled
- cash method-migrering måste skilja mellan:
  - öppna obetalda fakturor vid årets slut
  - redan betalda fakturor
- importcase, classificationcase och AP-open-item måste kunna replayas deterministiskt

## Huvudflödet

1. leverantör skapas eller valideras
2. purchase order och goods receipt finns när scenario kraver two-way eller three-way match
3. leverantörsfaktura eller kreditnota tas in via vald kanal
4. dokumentprofil, motpart, valuta, momsregim, matchmode och target-type klassas
5. coding lines och avdragsrätt klassas
6. duplicate-, import- och classification-kontroller kor
7. matching kor mot purchase order och receipt när scenario kraver det
8. approval/attest kor
9. posting skapar journal och AP-open-item, eller skjuts till payment-date vid cash method
10. payment proposal, reservation och bankflow kor
11. bankbokning, rejection eller return uppdaterar AP-open-item
12. rapport, moms, export och evidence lAses

## Bindande scenarioaxlar

### A. Dokument- och källsida

- API-ingest
- OCR/e-post-ingest
- Peppol/integration
- manuell registrering med källsidedokument
- self-billing / självfakturering

### B. Leverantörstyp

- svensk juridisk person
- svensk enskild naringsidkare
- svensk individ
- EU-företag med VAT-nummer
- EU-företag utan giltigt VAT-nummer
- non-EU-företag

### C. Matchmodell

- ingen PO
- two-way match
- three-way match
- importcase-linked
- classification-linked

### D. Kodningstyp

- kostnad klass 4-6
- anläggningstillgang
- lager-/materialspAr
- projektmaterial
- förutbetald kostnad
- delvis icke avdragsgill kostnad

### E. Momsregim

- svensk leverantör med debiterad moms 25
- svensk leverantör med debiterad moms 12
- svensk leverantör med debiterad moms 6
- svensk leverantör med `0 %` eller undantag
- svensk omvänd betalningsskyldighet varor
- svensk omvänd betalningsskyldighet tjänster
- svensk omvänd betalningsskyldighet bygg
- EU-varukop
- EU-tjänstekop
- non-EU-tjänstekop
- import av varor
- utlandsk debiterad moms utan svensk avdragsrätt
- blandad avdragsrätt

### F. Dokumenttyp

- leverantörsfaktura
- leverantörskreditnota
- debit note / tillaggsdebitering
- tull-/importunderlag som separat proof

### G. Betalutfall

- öppen
- reserverad
- delbetald
- fullt betald
- avvisad
- retur
- kreditmotad
- valutareglerad

### H. Redovisningsmetod

- faktureringsmetod
- kontantmetod löpande under aret
- kontantmetod bokslutsuppbokning

### I. Risk- och blockerstatus

- duplicate suspect
- coding missing
- tax review required
- price variance
- receipt variance
- import case incomplete
- person-linked blocked
- payment hold

## Bindande policykartor

### Canonical AP-kontopolicy för skuld- och momsnara konton

Följande konton är bindande default för AP-karnan:

- `2440`
  - leverantörsskulder
  - default skuldkonto för normal leverantörsfaktura och leverantörskreditnota

- `2641`
  - debiterad ingående moms
  - används för svensk leverantörs debiterade avdragsgilla moms

- `2645`
  - beräknad ingående moms på förvärv från utlandet
  - används för EU-kop, non-EU-tjänstekop och importmoms när svensk avdragsrätt finns

- `2647`
  - ingående moms, omvänd betalningsskyldighet varor och tjänster i Sverige
  - används för svensk reverse-charge på inköp i Sverige

- `2614`
  - utgående moms, omvänd betalningsskyldighet, 25 %

- `2624`
  - utgående moms, omvänd betalningsskyldighet, 12 %

- `2634`
  - utgående moms, omvänd betalningsskyldighet, 6 %

- `2615`
  - utgående moms import av varor, 25 %

- `2625`
  - utgående moms import av varor, 12 %

- `2635`
  - utgående moms import av varor, 6 %

- `1930`
  - företagskonto/checkkonto/affärskonto
  - default bankkonto för slutlig AP-reglering

Canonical product policy:
- AP får aldrig använda `2410/2420/2430` som default liability account för leverantörsskulder
- leverantörsskuld ska som huvudregel bokas på `2440` eller explicit underkonto till 2440-familjen
- payment reservation får inte skapa falsk ny skuldklass utan uttrycklig accounting policy

### Canonical AP-specialinköpskonton för momsdrivna kopscenarier

När det är inköpets momsprofil som driver kontovalet ska dessa BAS-konton användas:

- `4415`, `4416`, `4417`
  - inköpta varor i Sverige, omvänd betalningsskyldighet, 25/12/6

- `4425`, `4426`, `4427`
  - inköpta tjänster i Sverige, omvänd betalningsskyldighet, 25/12/6

- `4515`, `4516`, `4517`, `4518`
  - inköp av varor från annat EU-land, 25/12/6/momsfri

- `4531`, `4532`, `4533`
  - inköp av tjänster från land utanför EU, 25/12/6

- `4535`, `4536`, `4537`, `4538`
  - inköp av tjänster från annat EU-land, 25/12/6/momsfri

- `4545`, `4546`, `4547`
  - import av varor, 25/12/6

- `4730`, `4731`, `4732`
  - erhallna rabatter, kassarabatter och mangdrabatter

När inköpet är ett vanligt svenskt leverantörskop utan specialmomsregim ska radens exakta target account komma från godkänd line coding.

### Bindande momsrutekarta för levfakturaflödet

- svensk leverantör med debiterad avdragsgill moms:
  - ingående moms i `fält 48`

- inköp av varor från annat EU-land:
  - beskattningsunderlag i `fält 20`
  - utgående moms i `fält 30`, `31` eller `32`
  - avdragsgill ingående moms i `fält 48`

- inköp av tjänster från annat EU-land:
  - beskattningsunderlag i `fält 21`
  - utgående moms i `fält 30`, `31` eller `32`
  - avdragsgill ingående moms i `fält 48`

- inköp av tjänster från land utanför EU:
  - beskattningsunderlag i `fält 22`
  - utgående moms i `fält 30`, `31` eller `32`
  - avdragsgill ingående moms i `fält 48`

- inköp av varor i Sverige där köparen är betalningsskyldig:
  - beskattningsunderlag i `fält 23`
  - utgående moms i `fält 30`, `31` eller `32`
  - avdragsgill ingående moms i `fält 48`

- inköp av tjänster i Sverige där köparen är betalningsskyldig:
  - beskattningsunderlag i `fält 24`
  - utgående moms i `fält 30`, `31` eller `32`
  - avdragsgill ingående moms i `fält 48`

- import av varor:
  - beskattningsunderlag i `fält 50`
  - utgående moms i `fält 60`, `61` eller `62`
  - avdragsgill ingående moms i `fält 48`

- icke avdragsgill moms:
  - ingen andel av den icke avdragsgilla momsen får till `fält 48`

### Bindande källsideprofiler för inkommande leverantörsfaktura

- `supplier_standard_domestic`
- `supplier_reverse_charge_domestic`
- `supplier_eu_goods_purchase`
- `supplier_eu_services_purchase`
- `supplier_non_eu_service_purchase`
- `supplier_import_goods_customs`
- `supplier_credit_note`
- `supplier_self_billing`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

### AP-P0001 Svensk leverantörsfaktura 25 % avdragsgill

Vid posting:
- debet exakt line-coded target account = netto
- debet `2641` = moms
- kredit `2440` = brutto

### AP-P0002 Svensk leverantörsfaktura 12 % avdragsgill

Vid posting:
- debet exakt line-coded target account = netto
- debet `2641` = moms
- kredit `2440` = brutto

### AP-P0003 Svensk leverantörsfaktura 6 % avdragsgill

Vid posting:
- debet exakt line-coded target account = netto
- debet `2641` = moms
- kredit `2440` = brutto

### AP-P0004 Svensk leverantörsfaktura utan avdragsgill moms

Vid posting:
- debet exakt line-coded target account = brutto eller netto + icke avdragsgill moms enligt codingregel
- kredit `2440` = brutto

### AP-P0005 Svensk leverantörsfaktura med blandade momssatser

Vid posting:
- debet respektive exact line-coded target account per rad = netto
- debet `2641` per avdragsgill momssats
- kredit `2440` = total brutto

### AP-P0006 Delvis icke avdragsgill moms

Vid posting:
- debet exact line-coded target account = netto
- debet `2641` = avdragsgill momsandel
- debet exact non-deductible target account eller samma cost line = icke avdragsgill momsandel
- kredit `2440` = brutto

### AP-P0007 Helt icke avdragsgill moms

Vid posting:
- debet exact target account = brutto
- kredit `2440` = brutto

### AP-P0008 Anläggningstillgang med avdragsgill moms

Vid posting:
- debet exakt line-coded tillgangskonto i klass 1 = netto
- debet `2641` = moms
- kredit `2440` = brutto

### AP-P0009 Förutbetald kostnad med avdragsgill moms

Vid posting:
- debet exakt förutbetalt kostnadskonto i 17xx-familjen = netto
- debet `2641` = moms
- kredit `2440` = brutto

### AP-P0010 Svensk reverse charge varor 25 %

Vid posting:
- debet `4415` = beskattningsunderlag
- debet `2647` = avdragsgill ingående moms
- kredit `2614` = beräknad utgående moms
- kredit `2440` = leverantörsskuld

### AP-P0011 Svensk reverse charge tjänster 25 %

Vid posting:
- debet `4425` = beskattningsunderlag
- debet `2647` = avdragsgill ingående moms
- kredit `2614` = beräknad utgående moms
- kredit `2440` = leverantörsskuld

### AP-P0012 Svensk reverse charge 12 %

Vid posting:
- debet `4416` eller `4426` = beskattningsunderlag
- debet `2647` = avdragsgill ingående moms
- kredit `2624` = beräknad utgående moms
- kredit `2440` = leverantörsskuld

### AP-P0013 Svensk reverse charge 6 %

Vid posting:
- debet `4417` eller `4427` = beskattningsunderlag
- debet `2647` = avdragsgill ingående moms
- kredit `2634` = beräknad utgående moms
- kredit `2440` = leverantörsskuld

### AP-P0014 EU-varukop 25 %

Vid posting:
- debet `4515` = beskattningsunderlag
- debet `2645` = avdragsgill ingående moms
- kredit `2614` = beräknad utgående moms
- kredit `2440` = leverantörsskuld

### AP-P0015 EU-tjänstekop 25 %

Vid posting:
- debet `4535` = beskattningsunderlag
- debet `2645` = avdragsgill ingående moms
- kredit `2614` = beräknad utgående moms
- kredit `2440` = leverantörsskuld

### AP-P0016 Non-EU-tjänstekop 25 %

Vid posting:
- debet `4531` = beskattningsunderlag
- debet `2645` = avdragsgill ingående moms
- kredit `2614` = beräknad utgående moms
- kredit `2440` = leverantörsskuld

### AP-P0017 Varuimport, kommersiell leverantörsfaktura

Vid leverantörsfakturans posting:
- debet exakt importtargetkonto eller `4545/4546/4547` enligt policy = beskattningsunderlag för varan
- kredit `2440` = leverantörsskuld

### AP-P0018 Varuimport, separat importmomsbeslut 25 %

Vid importmomsposting:
- debet `2645` = avdragsgill ingående moms
- kredit `2615` = utgående moms import av varor

### AP-P0019 Leverantörskreditnota mot öppen skuld

Vid posting:
- debet `2440` = brutto
- kredit samma targetkonto(n) som ursprunget = netto
- kredit `2641`, `2645` eller `2647` beroende på ursprunglig momsmodell = momsandel

### AP-P0020 Leverantörskreditnota efter redan betald faktura

Vid posting:
- debet `2440` = brutto
- kredit ursprungliga targetkonton och moms

Vid reglering:
- negativ open item skapas eller separat offset-saldo
- kreditnota får aldrig ga in i vanlig utbetalningsproposal som positiv betalning

### AP-P0021 Felaktig eller okopplad kreditnota

Ingen posting.
Scenario blockeras till korrekt originalkoppling eller policygodkand okopplad kreditmodell.

### AP-P0022 Price variance

Ingen posting.
`SupplierInvoiceVariance(price_variance)` måste vara stangd innan posting.

### AP-P0023 Receipt variance

Ingen posting.
`SupplierInvoiceVariance(receipt_variance)` måste vara stangd innan posting.

### AP-P0024 Coding missing

Ingen posting.
Varje rad måste ha exact target account eller bindande target class som resolve:as till exact konto före posting.

### AP-P0025 Tax review required

Ingen posting.
Inget scenario med `VAT_REVIEW_REQUIRED` eller motsvarande review queue får bokföras.

### AP-P0026 Duplicate suspect

Ingen posting för duplicate replay.
Exakt fingerprint ska returnera idempotent replay, inte ny skuld.

### AP-P0027 Import case incomplete

Ingen posting när scenario kraver importcase men case inte är komplett eller godkant.

### AP-P0028 Person-linked or blocked document

Ingen posting och ingen betalning.

### AP-P0029 Faktureringsmetod, leverantörsfaktura bokas på fakturadatum

Vid posting:
- AP-P0001 till AP-P0020 gäller fullt ut på fakturadatum

### AP-P0030 Kontantmetod, ingen huvudbok på fakturadatum

Vid AP-post:
- ingen journalEntry
- inget momsutfall i huvudbok på fakturadatum
- `ApOpenItem` skapas operativt men utan invoice-date journal

### AP-P0031 Kontantmetod, reglering på betalningsdatum

Vid bankbokning:
- debet exact line-coded target account eller special purchase account = netto
- debet relevant ingående moms-konto = avdragsgill moms
- kredit `1930` = utbetalt belopp

### AP-P0032 Kontantmetod, bokslutsuppbokning av obetald leverantörsfaktura

Vid bokslut:
- debet samma target account-regler som vid vanlig posting
- debet relevant ingående moms-konto för den del som får dras av
- kredit `2440`

### AP-P0033 Full betalning av AP-open-item

Vid bankbokning under faktureringsmetoden:
- debet `2440`
- kredit `1930`

### AP-P0034 Delbetalning av AP-open-item

Vid bankbokning:
- debet `2440` = betald del
- kredit `1930` = betald del
- resterande belopp ligger kvar som `ApOpenItem.openAmount`

### AP-P0035 Bankretur efter bokd AP-betalning

Vid retur:
- debet `1930`
- kredit `2440`
- `ApOpenItem` återöppnas till korrekt open amount

### AP-P0036 Payment rejection före bankbokning

Ingen huvudboksreversal om ingen legal bankbokning skett.
Endast reservation eller proposal-status återtas.

### AP-P0037 Leverantörsrabatt / kassarabatt

Om rabatten ligger på kreditnota:
- följ `AP-P0019` eller `AP-P0020`

Om separat betalningsrabatt är canonical policy:
- debet `2440` = ursprunglig skuld
- kredit `1930` = faktiskt betalt belopp
- kredit `4731` eller `4732` = rabatt

### AP-P0038 Representation med delvis avdragsgill moms

Vid posting:
- debet representationkostnadskonto = netto + icke avdragsgill moms
- debet `2641` = avdragsgill momsandel
- kredit `2440` = brutto

### AP-P0039 Personbil eller annat explicit avdragsforbud

Vid posting:
- debet exact target account = netto + icke avdragsgill moms
- debet eventuellt `2641` endast för den del avdragsrätt uttryckligen finns
- kredit `2440` = brutto

### AP-P0040 Stadigvarande bostad / privat konsumtion / helt blockerad avdragsrätt

Vid posting:
- debet exact target account = brutto
- kredit `2440` = brutto

### AP-P0041 Utlansk moms felaktigt debiterad på utlandsinköp

Canonical default:
- ingen svensk ruta `48`
- ingen svensk reverse-charge-output om scenario inte samtidigt kraver svensk omvänd moms
- foreign VAT del måste antingen:
  - debiteras kostnadskontot
  - eller debiteras separat utlandsk momsfodran enligt uttrycklig refund policy
- kredit `2440` = brutto

### AP-P0042 Sjalfakturering på köparsidan

Bokföring följer underliggande kopscenario.
Det bindande tillagget är:
- separat löpande serie
- text `Sjalvfakturering`
- bevisat avtal

### AP-P0043 Tillaggsdebitering / debit note

Bokföring följer underliggande kopscenario.
Dokumentet måste dock ha egen extern referens och tydlig koppling till ursprunget.

### AP-P0044 AP-open-item med valutadifferens vid betalning

Vid settlement:
- debet `2440` = funktionell skuld enligt open item
- kredit `1930` = faktisk funktionell bankutbetalning
- mellanskillnad till kursvinst/kursförlust enligt bindande valutapolicy

### AP-P0045 AP-open-item med kreditnotaoffset

Vid offset:
- ingen bankrad
- `ApOpenItem` för ursprungsfaktura minskar
- negativt eller separat credit open item minskar motsvarande

## Bindande rapport-, export- och myndighetsmappning

- supplier charged avdragsgill svensk moms:
  - `fält 48`
  - huvudbok
  - AP-subledger
  - SIE4

- EU-goods purchase:
  - `fält 20`, `30/31/32`, `48`
  - huvudbok
  - momsrapport
  - SIE4

- EU-services purchase:
  - `fält 21`, `30/31/32`, `48`

- non-EU-services purchase:
  - `fält 22`, `30/31/32`, `48`

- domestic reverse charge goods:
  - `fält 23`, `30/31/32`, `48`

- domestic reverse charge services:
  - `fält 24`, `30/31/32`, `48`

- import goods:
  - `fält 50`, `60/61/62`, `48`
  - importcase receipt

- ej avdragsgill moms:
  - ingen 48 för ej avdragsgill andel

## Bindande scenariofamilj till proof-ledger och rapportspar

### A. Leverantör och ingest

- `AP-A001` svensk leverantör standard -> `AP-P0001-0009`
- `AP-A002` EU-leverantör -> `AP-P0014-0016`, `AP-P0041`
- `AP-A003` non-EU-leverantör -> `AP-P0016-0018`, `AP-P0041`
- `AP-A004` bankdetaljandring -> ingen journal, payment hold
- `AP-A005` duplicate supplier -> blocker

### B. Standard invoice posting

- `AP-B001` svensk 25 % fullt avdragsgill -> `AP-P0001`, ruta `48`
- `AP-B002` svensk 12 % fullt avdragsgill -> `AP-P0002`, ruta `48`
- `AP-B003` svensk 6 % fullt avdragsgill -> `AP-P0003`, ruta `48`
- `AP-B004` svensk `0 %`/undantag -> `AP-P0004`, ingen ruta `48`
- `AP-B005` blandade satser -> `AP-P0005`
- `AP-B006` delvis ej avdragsgill moms -> `AP-P0006`
- `AP-B007` helt ej avdragsgill moms -> `AP-P0007`
- `AP-B008` anläggning -> `AP-P0008`
- `AP-B009` förutbetald kostnad -> `AP-P0009`
- `AP-B010` självfakturering -> `AP-P0042`

### C. Match och review

- `AP-C001` no-PO standard -> underliggande `AP-P0001-0009`
- `AP-C002` two-way match exakt -> underliggande posting + match receipt
- `AP-C003` three-way match exakt -> underliggande posting + receipt proof
- `AP-C004` price variance -> `AP-P0022`
- `AP-C005` receipt variance -> `AP-P0023`
- `AP-C006` coding missing -> `AP-P0024`
- `AP-C007` tax review required -> `AP-P0025`
- `AP-C008` duplicate suspect -> `AP-P0026`
- `AP-C009` importcase incomplete -> `AP-P0027`
- `AP-C010` person-linked or classification blocked -> `AP-P0028`

### D. Cross-border och reverse charge

- `AP-D001` svensk RC varor 25 -> `AP-P0010`, ruta `23/30/48`
- `AP-D002` svensk RC tjänster 25 -> `AP-P0011`, ruta `24/30/48`
- `AP-D003` svensk RC bygg 25 -> `AP-P0011`, ruta `24/30/48`
- `AP-D004` svensk RC 12 -> `AP-P0012`
- `AP-D005` svensk RC 6 -> `AP-P0013`
- `AP-D006` EU-varor 25 -> `AP-P0014`, ruta `20/30/48`
- `AP-D007` EU-tjänster 25 -> `AP-P0015`, ruta `21/30/48`
- `AP-D008` non-EU-tjänster 25 -> `AP-P0016`, ruta `22/30/48`
- `AP-D009` import goods -> `AP-P0017` + `AP-P0018`
- `AP-D010` utlandsk moms felaktigt debiterad -> `AP-P0041`

### E. Kredit och korrektion

- `AP-E001` kreditnota mot öppen faktura -> `AP-P0019`
- `AP-E002` kreditnota efter betalning -> `AP-P0020`
- `AP-E003` okopplad kreditnota -> `AP-P0021`
- `AP-E004` rabatt/bonus -> `AP-P0037`
- `AP-E005` debit note -> `AP-P0043`

### F. Payment lifecycle

- `AP-F001` full betalning -> `AP-P0033`
- `AP-F002` delbetalning -> `AP-P0034`
- `AP-F003` bankretur -> `AP-P0035`
- `AP-F004` rejection före bokning -> `AP-P0036`
- `AP-F005` valutadifferens vid betalning -> `AP-P0044`
- `AP-F006` kreditnotaoffset -> `AP-P0045`

### G. Special deduction

- `AP-G001` representation -> `AP-P0038`
- `AP-G002` personbil/begränsad moms -> `AP-P0039`
- `AP-G003` stadigvarande bostad / privat -> `AP-P0040`
- `AP-G004` blandad verksamhet -> `AP-P0006`

### H. Accounting method

- `AP-H001` faktureringsmetod -> `AP-P0029`
- `AP-H002` kontantmetod invoice date -> `AP-P0030`
- `AP-H003` kontantmetod payment date -> `AP-P0031`
- `AP-H004` kontantmetod bokslutsuppbokning -> `AP-P0032`

## Tvingande dokument- eller indataregler

Varje inkommande leverantörsfaktura måste klassas till exakt en källsideprofil innan posting.

Detta är bindande:
- detta avsnitt styr inte hur leverantören ska designa sitt dokument; det styr vilka uppgifter vi måste kunna verifiera för att vi ska fa behandla den inkommande handlingen som ett visst AP-scenario
- om leverantören skickat ett bristfalligt dokument betyder det inte att leverantören följt eller brutit mot var produktpolicy; det betyder att vi måste blockera, nedklassa eller omrouta dokumentet enligt reglerna har
- AP får aldrig skapa avdragsrätt utan att källsidan innehåller tillrackliga uppgifter
- AP får aldrig anta att saknade uppgifter "finns i ordern" om lagkravet ligger på fakturan
- reverse charge, EU-kop, import, credit note och self-billing måste ha egna dokumentprofiler
- inkommande kreditnota får aldrig tolkas som vanlig faktura

### Standard leverantörsfaktura

För att vi ska fa behandla ett inkommande dokument som standard leverantörsfaktura med automatiserad avdragsrätt måste vi kunna verifiera:
- leverantörens namn och adress
- leverantörens momsregistreringsnummer när relevant
- fakturadatum
- leverantörens fakturanummer
- vad som kopts
- leverans- eller tillhandahallandedatum när relevant
- beskattningsunderlag
- momssats
- momsbelopp

### Reverse charge-domestic

För att vi ska fa behandla ett inkommande dokument som domestic reverse charge på köpsidan måste vi kunna verifiera:
- leverantörens namn och adress
- leverantörens momsregistreringsnummer
- var eller tjänst tydligt beskriven
- beskattningsunderlag
- köparens momsregistreringsnummer när regelverket kraver det
- text `Omvänd betalningsskyldighet` eller `Reverse charge`

### EU-goods purchase

För att vi ska fa behandla ett inkommande dokument som EU-goods purchase måste vi kunna verifiera:
- leverantörens VAT-nummer
- varubeskrivning
- beskattningsunderlag
- ingen svensk debiterad moms

### EU-services purchase

För att vi ska fa behandla ett inkommande dokument som EU-services purchase måste vi kunna verifiera:
- leverantörens VAT-nummer
- tjänstebeskrivning
- beskattningsunderlag
- ingen svensk debiterad moms
- text som stöder omvänd skattskyldighet hos köparen när det krävs

### Import goods customs

För att vi ska fa behandla ett inkommande underlag som import goods customs måste vi kunna verifiera:
- kommersiell leverantörsfaktura för varuvardet
- separat tull-/importmomsunderlag för svensk importmoms
- importcase-link som binder dem

### Supplier credit note

För att vi ska fa behandla ett inkommande dokument som supplier credit note måste vi kunna verifiera:
- eget dokumentdatum
- eget kreditfakturanummer
- referens till ursprunglig faktura
- vilka belopp som krediteras
- hur moms paverkas

### Self-billing

För att vi ska fa behandla ett inkommande dokument som self-billing måste vi kunna verifiera:
- text `Sjalvfakturering`
- separat serie
- verifierbart avtal

## Bindande legal reason-code-katalog eller specialorsakskatalog

Canonical `ap_legal_reason_code` måste finnas när källsidan eller intern klassning beror på specialorsak.

- `AP-LR-EXM-001`
  - undantag från momsplikt eller 0 % som inte är vanlig svensk debiterad moms

- `AP-LR-RC-SE-001`
  - svensk omvänd betalningsskyldighet på inköp i Sverige

- `AP-LR-EU-GOODS-001`
  - varukop från annat EU-land där köparen redovisar svensk moms

- `AP-LR-EU-SERV-001`
  - tjänstekop från annat EU-land där köparen redovisar svensk moms

- `AP-LR-NON-EU-SERV-001`
  - tjänstekop från land utanför EU där köparen redovisar svensk moms

- `AP-LR-IMPORT-001`
  - import av varor där svensk importmoms kommer från separat importunderlag

- `AP-LR-FOREIGN-VAT-001`
  - utlandsk moms debiterad på källsidan utan svensk `48`-avdragsrätt

- `AP-LR-SELF-001`
  - självfakturering

Varje kod måste ha:
- `official_source_ref`
- `invoice_profile_codes`
- `scenario_family_codes`
- `deduction_policy`
- `required_source_fields`

## Bindande faltspec eller inputspec per profil

### `supplier_standard_domestic`

Obligatoriska fält:
- `supplier_legal_name`
- `supplier_address`
- `supplier_invoice_number`
- `invoice_date`
- `line_description`
- `tax_base_per_rate`
- `vat_rate`
- `vat_amount`
- `gross_amount`
- `currency_code`

### `supplier_reverse_charge_domestic`

Obligatoriska fält:
- alla fält från `supplier_standard_domestic`
- `buyer_vat_number` när regelverket kraver det
- `ap_legal_reason_code = AP-LR-RC-SE-001`
- text `Omvänd betalningsskyldighet` eller `Reverse charge`
- `tax_base_per_reverse_charge_group`

### `supplier_eu_goods_purchase`

Obligatoriska fält:
- `supplier_vat_number`
- `supplier_invoice_number`
- `invoice_date`
- `goods_description`
- `tax_base`
- `currency_code`
- `ap_legal_reason_code = AP-LR-EU-GOODS-001`

### `supplier_eu_services_purchase`

Obligatoriska fält:
- `supplier_vat_number`
- `supplier_invoice_number`
- `invoice_date`
- `service_description`
- `tax_base`
- `currency_code`
- `ap_legal_reason_code = AP-LR-EU-SERV-001`

### `supplier_non_eu_service_purchase`

Obligatoriska fält:
- `supplier_legal_name`
- `supplier_invoice_number`
- `invoice_date`
- `service_description`
- `tax_base`
- `currency_code`
- `ap_legal_reason_code = AP-LR-NON-EU-SERV-001`

### `supplier_import_goods_customs`

Obligatoriska fält:
- kommersiell invoice profile för varan
- `import_case_id`
- `customs_or_import_vat_reference`
- `ap_legal_reason_code = AP-LR-IMPORT-001`

### `supplier_credit_note`

Obligatoriska fält:
- `credit_note_number`
- `credit_note_date`
- `original_supplier_invoice_ref`
- `credit_reason_text`
- `tax_base_reduction`
- `vat_reduction`
- `gross_reduction`

### `supplier_self_billing`

Obligatoriska fält:
- `self_billing_agreement_ref`
- text `Sjalvfakturering`
- egen serie

## Scenariofamiljer som hela systemet måste tacka

### A. Leverantör och ingest

- `AP-A001` svensk leverantör med svensk moms
- `AP-A002` svensk leverantör reverse charge
- `AP-A003` EU-leverantör varor
- `AP-A004` EU-leverantör tjänster
- `AP-A005` non-EU-leverantör tjänster
- `AP-A006` import goods med customslink
- `AP-A007` OCR-ingest
- `AP-A008` API-ingest
- `AP-A009` integration/Peppol-ingest
- `AP-A010` self-billing

### B. Standard supplier invoice

- `AP-B001` svensk 25 fullt avdragsgill
- `AP-B002` svensk 12 fullt avdragsgill
- `AP-B003` svensk 6 fullt avdragsgill
- `AP-B004` svensk 0/undantag
- `AP-B005` blandad moms
- `AP-B006` delvis ej avdragsgill moms
- `AP-B007` helt ej avdragsgill moms
- `AP-B008` anläggningstillgang
- `AP-B009` förutbetald kostnad
- `AP-B010` lager/material
- `AP-B011` projektmaterial

### C. Match och review

- `AP-C001` no-PO
- `AP-C002` two-way match
- `AP-C003` three-way match
- `AP-C004` price variance
- `AP-C005` receipt variance
- `AP-C006` coding missing
- `AP-C007` tax review required
- `AP-C008` duplicate suspect
- `AP-C009` import case incomplete
- `AP-C010` person-linked blocked

### D. Cross-border och reverse charge

- `AP-D001` svensk reverse charge goods 25
- `AP-D002` svensk reverse charge services 25
- `AP-D003` svensk reverse charge bygg 25
- `AP-D004` svensk reverse charge 12
- `AP-D005` svensk reverse charge 6
- `AP-D006` EU-varukop 25
- `AP-D007` EU-varukop 12
- `AP-D008` EU-varukop 6
- `AP-D009` EU-tjänstekop 25
- `AP-D010` non-EU-tjänstekop 25
- `AP-D011` import goods 25
- `AP-D012` utlandsk moms felaktigt debiterad

### E. Kredit och korrektion

- `AP-E001` hel kreditnota mot öppen faktura
- `AP-E002` delkreditnota mot öppen faktura
- `AP-E003` kreditnota efter betalning
- `AP-E004` rabattbonus
- `AP-E005` fel originalref
- `AP-E006` tillaggsdebitering

### F. Payment lifecycle

- `AP-F001` full betalning
- `AP-F002` delbetalning
- `AP-F003` reservation
- `AP-F004` bankbokning
- `AP-F005` bankretur
- `AP-F006` rejection
- `AP-F007` valutadifferens
- `AP-F008` kreditnotaoffset

### G. Avdragsforbud och specialfall

- `AP-G001` representation
- `AP-G002` personbil
- `AP-G003` stadigvarande bostad
- `AP-G004` blandad verksamhet / pro rata
- `AP-G005` foreign VAT no swedish deduction

### H. Redovisningsmetod

- `AP-H001` faktureringsmetod
- `AP-H002` kontantmetod invoice date
- `AP-H003` kontantmetod payment date
- `AP-H004` kontantmetod bokslutsuppbokning

## Scenarioregler per familj

### Standardregler

Alla scenarier i familj B ska:
- ha line coding innan posting
- skapa exakt AP-open-item om kreditnota inte helt offsetas direkt
- skapa momsutfall endast enligt vald momsprofil

### Matchregler

Alla scenarier i familj C ska:
- stoppa posting på öppna price- eller receipt variances
- inte autoaccepta över tolerans
- skapa auditbevis för varje acceptance eller correction

### Cross-border-regler

Alla scenarier i familj D ska:
- ha explicit regionklassning
- ha explicit VAT- och deduction-policy
- inte fa klassas som vanlig svensk debiterad moms om reverse-charge eller import gäller

### Kreditregler

Alla scenarier i familj E ska:
- reversera ursprungsklassningens targetkonto och momslogik
- aldrig skapa ny skuld som om kreditnotan vore en vanlig leverantörsfaktura

### Betalregler

Alla scenarier i familj F ska:
- utga från postad och payment-ready AP-open-item
- inte betala kreditnotor eller negativa open items som positiva betalningar
- bevara historik för reservation, accept, book, return och rejection

### Avdragsforbudsregler

Alla scenarier i familj G ska:
- uttryckligen ange vilken momsandel som är avdragsgill
- blockera generell `2641`-bokning för den icke avdragsgilla delen

### Accounting method-regler

Alla scenarier i familj H ska:
- skilja mellan operational open item och legal huvudbok
- inte skapa invoice-date journal under kontantmetod
- skapa bokslutsuppbokning av obetalda fakturor vid arsavslut

## Blockerande valideringar

Systemet måste stoppa ingest, posting eller payment när:
- `supplier_legal_name` saknas
- `supplier_invoice_number` saknas
- `invoice_date` saknas
- leverantörsdokument saknar tillrackliga fakturauppgifter för avdragsrätt
- `invoice_profile` saknas
- `ap_legal_reason_code` saknas på 0 %, reverse charge, import, self-billing eller foreign-VAT-scenario
- coding line saknar targetkonto
- momsprofil saknas
- fakturan kraver PO men `purchaseOrderId` saknas
- three-way scenario saknar tillracklig receipt quantity
- duplicate suspect inte är reviewad
- tax review fortfarande är öppen
- import case är ofullständigt
- document classification är person-linked eller blockerad
- leverantör saknar betaldata och scenario gar till payment proposal
- kreditnota saknar originalref när policy kraver det
- kreditnota overstiger originalets tillåtna restbelopp
- valuta saknar exchange rate när functional posting krävs
- kontantmetodscenario försöker skapa invoice-date huvudbok
- non-deductible eller mixed-deduction scenario försöker boka full moms till `2641`, `2645` eller `2647`

## Rapport- och exportkonsekvenser

Varje scenariofamilj ska explicit bevisa:
- leverantörsreskontra
- huvudbok
- momsrapport
- SIE4
- bank/payment receipts
- import/customs receipts där relevant
- audit/evidence receipts

## Förbjudna förenklingar

- ingen `mark as approved` utan stangda review queues
- ingen `mark as paid` utan bankbook eller explicit offset
- ingen generell `misc expense` som AP-default när exakt BAS-konto krävs
- ingen generell `2640`-bokning för all input VAT
- ingen generisk importmoms på leverantörsfaktura utan customsproof
- ingen auto-omklassning från reverse charge till vanlig svensk moms bara för att källsidan är ofullständig
- ingen kreditnota utan originalrelation
- ingen fake AP-payment reserve som låter open item se betalt ut innan bankbokning

## Fler bindande proof-ledger-regler för specialfall

### AP-P0046 Lager- eller materialtarget

Om line target type är `inventory` eller `project_material`:
- debet exact lager-/materialkonto eller projektmaterialkonto enligt target policy
- debet relevant moms-konto
- kredit `2440`

AP får inte tysta bokföra detta till allmant kostnadskonto om target type uttryckligen är material eller lager.

### AP-P0047 Payment hold på leverantörsniva

Ingen ledgerpost.
Scenario blockerar endast reservation, approve eller submit av betalning.

### AP-P0048 Bankdetaljandring på leverantör

Ingen ledgerpost i sig.
Payment hold måste sattas tills review och approval receipt finns.

### AP-P0049 Importfrakt och tullkostnader

Vid posting:
- debet exact frakt-/tulltargetkonto eller importkostnadskonto
- moms enligt faktisk momsregim
- kredit `2440`

### AP-P0050 AP-return under kontantmetod

Vid retur efter att kostnad erkant på betalningsdag:
- debet `1930`
- kredit samma kostnads-/moms-/targetkonton som erkant vid settlement i den omfattning returen reverserar recognition
- AP-open-item återöppnas

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `AP-P0001-0018`
  - skapar positiv `ApOpenItem` om dokumenttyp är leverantörsfaktura

- `AP-P0019-0020`
  - skapar negativ `ApOpenItem` eller minskar befintlig positiv skuld

- `AP-P0033`
  - minskar `ApOpenItem.openAmount` till `0` och stanger item

- `AP-P0034`
  - minskar `ApOpenItem.openAmount` proportionellt och satter status `partially_settled`

- `AP-P0035`
  - återöppnar `ApOpenItem` till korrekt restskuld

- `AP-P0045`
  - reglerar positivt och negativt open item utan bankbokning

## Bindande verifikations-, serie- och exportregler

- AP-invoice posting ska ha voucher series purpose `AP_INVOICE`
- AP-credit-note posting ska ha voucher series purpose `AP_CREDIT_NOTE`
- AP-payment settlement ska ha voucher series purpose `AP_PAYMENT`
- samma source object version får aldrig skapa två journaler i samma purpose-serie
- SIE4-export måste bevara:
  - verifikationsdatum
  - serie
  - verifikationsnummer
  - text
  - samtliga rader
  - dimensionsjson när exportformatet bar det eller separat evidencefile annars

## Bindande variantmatris som måste korsas mot varje scenariofamilj

### Motpartsvariant

- svensk juridisk person
- svensk individ
- EU med giltigt VAT
- EU utan giltigt VAT
- non-EU

### Dokumentvariant

- API
- OCR
- Peppol
- integration
- self-billing
- credit note

### Targetvariant

- kostnad
- anläggning
- förutbetalt
- lager
- projektmaterial
- blandad avdragsrätt

### Momsvariant

- 25
- 12
- 6
- 0/undantag
- domestic reverse charge
- EU-goods
- EU-services
- non-EU-services
- import goods
- foreign VAT

### Matchvariant

- none
- two_way
- three_way
- import_case

### Betalvariant

- open
- reserved
- partial
- full
- return
- rejection
- fx
- credit offset

Ingen scenariofamilj får markeras som tackt utan att variantmatrisen uttryckligen markerats.

## Bindande fixture-klasser för levfakturaflödet

Alla tester ska använda styrda fixtures.

- `AP-FXT-001`
  - enkelt helt krontal
  - netto `1 000`

- `AP-FXT-002`
  - oresscenario
  - netto `999.99`

- `AP-FXT-003`
  - blandade rader
  - tre rader med olika momssatser

- `AP-FXT-004`
  - stor faktura
  - netto `125 000`

- `AP-FXT-005`
  - delvis icke avdragsgill moms

- `AP-FXT-006`
  - EU-kop i EUR

- `AP-FXT-007`
  - non-EU-service i USD

- `AP-FXT-008`
  - import goods med separat customsunderlag

- `AP-FXT-009`
  - kreditnota hel

- `AP-FXT-010`
  - delkreditnota

- `AP-FXT-011`
  - delbetalning

- `AP-FXT-012`
  - bankretur

## Bindande expected outcome-format per scenario

Varje scenario måste minst ange:
- `scenario_id`
- `fixture_class`
- `invoice_profile`
- `source_document_requirements`
- `commands_run`
- `expected_state_per_step`
- `expected_proof_ledger`
- `expected_accounts`
- `expected_vat_boxes`
- `expected_open_item_effect`
- `expected_export_effect`
- `expected_blockers`

## Bindande canonical verifikationsseriepolicy

- AP-operational posting:
  - serie `E` eller uttrycklig AP-serie enligt master policy

- AP-payment:
  - egen AP-payment-serie eller explicit delserie under `E`

- cash method year-end accrual:
  - egen bokslutsserie eller explicit bokslutsmarkering i metadata

## Bindande expected outcome per central scenariofamilj

### `AP-B001`

- fixture minimum: `AP-FXT-001`
- input:
  - svensk leverantör
  - netto `1 000`
  - moms `250`
  - brutto `1 250`
  - targetkonto `5410`
- expected state:
  - invoice `posted`
  - open item `open`
- expected proof-ledger:
  - `AP-P0001`
- expected journal:
  - debet `5410` = `1 000`
  - debet `2641` = `250`
  - kredit `2440` = `1 250`
- expected VAT:
  - `48 = 250`

### `AP-C003`

- fixture minimum: `AP-FXT-001`
- input:
  - PO `10 st`
  - receipt `10 st`
  - invoice `10 st`
- expected state:
  - no open variances
  - invoice `approved` before posting
  - posting tillatet

### `AP-D003`

- fixture minimum: `AP-FXT-005`
- input:
  - svensk leverantör
  - byggtjänst som omfattas av omvänd betalningsskyldighet
  - beskattningsunderlag `1 000`
- expected proof-ledger:
  - `AP-P0011`
- expected journal:
  - debet `4425` = `1 000`
  - debet `2647` = `250`
  - kredit `2614` = `250`
  - kredit `2440` = `1 000`
- expected VAT:
  - `24 = 1 000`
  - `30 = 250`
  - `48 = 250`
- expected source requirements:
  - dokumentet måste kunna verifieras som domestic reverse charge
  - reverse-charge-text måste finnas på källsidan när regelverket kraver det
  - buyer VAT-nummer måste kunna verifieras när regelverket kraver det

### `AP-D006`

- fixture minimum: `AP-FXT-006`
- input:
  - EU-varukop 25
  - base `1 000`
- expected proof-ledger:
  - `AP-P0014`
- expected journal:
  - debet `4515` = `1 000`
  - debet `2645` = `250`
  - kredit `2614` = `250`
  - kredit `2440` = `1 000`
- expected VAT:
  - `20 = 1 000`
  - `30 = 250`
  - `48 = 250`

### `AP-D011`

- fixture minimum: `AP-FXT-008`
- input:
  - import goods 25
  - commercial invoice `1 000`
  - importmoms `250`
- expected proof-ledger:
  - `AP-P0017` + `AP-P0018`
- expected journal part 1:
  - debet importtarget = `1 000`
  - kredit `2440` = `1 000`
- expected journal part 2:
  - debet `2645` = `250`
  - kredit `2615` = `250`
- expected VAT:
  - `50 = 1 000`
  - `60 = 250`
  - `48 = 250`

### `AP-E001`

- fixture minimum: `AP-FXT-009`
- expected proof-ledger:
  - `AP-P0019`
- expected open item:
  - ursprunglig skuld minskar eller negativt credit open item skapas

### `AP-F005`

- fixture minimum: `AP-FXT-012`
- precondition:
  - `AP-P0033` har redan skett
- expected proof-ledger:
  - `AP-P0035`
- expected journal:
  - debet `1930`
  - kredit `2440`
- expected state:
  - open item `reopened`

### `AP-H002`

- fixture minimum: `AP-FXT-001`
- accounting method:
  - `kontantmetod`
- expected:
  - invoice `posted`
  - `journalEntryId = null`
  - `ApOpenItem.status = open`
  - ingen huvudbok på invoice date

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `AP-A001` -> `AP-P0001-0009` beroende på moms- och targetvariant
- `AP-A002` -> `AP-P0010-0013`
- `AP-A003` -> `AP-P0014-0016`, `AP-P0041`
- `AP-A004` -> `AP-P0048`
- `AP-A005` -> blocker utan ledger
- `AP-A006` -> `AP-P0017 + AP-P0018`
- `AP-A007` -> OCR ingest + underliggande `AP-P`
- `AP-A008` -> API ingest + underliggande `AP-P`
- `AP-A009` -> integration ingest + underliggande `AP-P`
- `AP-A010` -> `AP-P0042`

- `AP-B001` -> `AP-P0001`
- `AP-B002` -> `AP-P0002`
- `AP-B003` -> `AP-P0003`
- `AP-B004` -> `AP-P0004`
- `AP-B005` -> `AP-P0005`
- `AP-B006` -> `AP-P0006`
- `AP-B007` -> `AP-P0007`
- `AP-B008` -> `AP-P0008`
- `AP-B009` -> `AP-P0009`
- `AP-B010` -> `AP-P0046`
- `AP-B011` -> `AP-P0046`

- `AP-C001` -> underliggande `AP-P0001-0009`
- `AP-C002` -> underliggande `AP-P0001-0009`
- `AP-C003` -> underliggande `AP-P0001-0009`
- `AP-C004` -> `AP-P0022`
- `AP-C005` -> `AP-P0023`
- `AP-C006` -> `AP-P0024`
- `AP-C007` -> `AP-P0025`
- `AP-C008` -> `AP-P0026`
- `AP-C009` -> `AP-P0027`
- `AP-C010` -> `AP-P0028`

- `AP-D001` -> `AP-P0010`
- `AP-D002` -> `AP-P0011`
- `AP-D003` -> `AP-P0011`
- `AP-D004` -> `AP-P0012`
- `AP-D005` -> `AP-P0013`
- `AP-D006` -> `AP-P0014`
- `AP-D007` -> `AP-P0014` med 12 %
- `AP-D008` -> `AP-P0014` med 6 %
- `AP-D009` -> `AP-P0015`
- `AP-D010` -> `AP-P0016`
- `AP-D011` -> `AP-P0017 + AP-P0018`
- `AP-D012` -> `AP-P0041`

- `AP-E001` -> `AP-P0019`
- `AP-E002` -> `AP-P0019`
- `AP-E003` -> `AP-P0020`
- `AP-E004` -> `AP-P0037`
- `AP-E005` -> `AP-P0021`
- `AP-E006` -> `AP-P0043`

- `AP-F001` -> `AP-P0033`
- `AP-F002` -> `AP-P0034`
- `AP-F003` -> operational reserve only eller explicit reserve policy
- `AP-F004` -> `AP-P0033`
- `AP-F005` -> `AP-P0035`
- `AP-F006` -> `AP-P0036`
- `AP-F007` -> `AP-P0044`
- `AP-F008` -> `AP-P0045`

- `AP-G001` -> `AP-P0038`
- `AP-G002` -> `AP-P0039`
- `AP-G003` -> `AP-P0040`
- `AP-G004` -> `AP-P0006`
- `AP-G005` -> `AP-P0041`

- `AP-H001` -> `AP-P0029`
- `AP-H002` -> `AP-P0030`
- `AP-H003` -> `AP-P0031`
- `AP-H004` -> `AP-P0032`

## Bindande testkrav

Minst dessa testlager är obligatoriska:

- unit:
  - momsprofiler per kopscenario
  - proof-ledger per `AP-P`
  - duplicate fingerprint
  - match variances
  - partial/non-deductible VAT
  - cash method

- integration:
  - API-ingest
  - OCR-ingest
  - two-way match
  - three-way match
  - importcase blocking
  - payment proposal readiness

- e2e:
  - leverantörsfaktura -> approval -> posting -> payment -> return
  - leverantörskreditnota
  - cross-border VAT scenarios
  - cash method year-end scenario

- negative tests:
  - missing coding
  - missing VAT regime
  - missing reverse-charge text
  - invalid credit-link
  - duplicate suspect
  - payment without bank details
  - full `2641` booking despite blocked avdragsrätt

- release-gate tests:
  - kompakt register ska ha minst ett test per scenariofamilj
- centrala scenarier `AP-B001`, `AP-C003`, `AP-D003`, `AP-D006`, `AP-D011`, `AP-E001`, `AP-F005`, `AP-H002` måste ha fullt expected outcome-test

## Källor som styr dokumentet

- [Skatteverket: Momslagens regler om fakturering](https://skatteverket.se/foretag/moms/saljavarorochtjanster/momslagensregleromfakturering.4.58d555751259e4d66168000403.html)
- [Skatteverket: Fylla i momsdeklarationen](https://www.skatteverket.se/foretag/moms/deklareramoms/fyllaimomsdeklarationen.4.3a2a542410ab40a421c80004214.html)
- [Skatteverket: Moms vid utrikeshandel, SKV 560](https://www.skatteverket.se/download/18.361dc8c15312eff6fde93f/1461069599676/moms-vid-utrikeshandel-skv560-utgava7.pdf)
- [Skatteverket: Omvänd betalningsskyldighet inom byggsektorn](https://skatteverket.se/foretag/moms/sarskildamomsregler/byggverksamhet/omvandbetalningsskyldighetinombyggsektorn.4.47eb30f51122b1aaad28000545.html)
- [Skatteverket: Avdragsrätt, avsnitt 15](https://www.skatteverket.se/download/18.84f6651040cdcb1b480002480/1708608243558/kap15.pdf)
- [Skatteverket: Bilar, bussar och motorcyklar, avsnitt 24](https://www.skatteverket.se/download/18.84f6651040cdcb1b480002507/kap24.pdf)
- [BAS 2025](https://www.bas.se/kontoplaner/jamfor-kontoplaner/bas-2025/)
- [Kontoplan BAS 2025 v. 1.0](https://www.bas.se/wp-content/uploads/2025/01/Kontoplan-BAS-2025.pdf)
- [Bokföringsnamnden: BFNAR 2006:1 Bokföring](https://www.bfn.se/wp-content/uploads/2020/06/bfnar06-1-grund.pdf)
- [Bokföringsnamnden: K1-vägledning](https://www.bfn.se/wp-content/uploads/vl06-1-k1enskilda-kons2025.pdf)


