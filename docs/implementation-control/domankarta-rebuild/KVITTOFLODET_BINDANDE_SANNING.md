# KVITTOFLÖDET_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för hela kvittoflödet.

Detta dokument ska styra:
- receipt capture
- receipt ingestion
- company-paid small purchases
- cash-register receipts
- digital receipts
- card-receipts and merchant receipts
- receipt classification
- deductible and non-deductible input VAT on receipt-driven purchases
- receipt-driven booking to expense, asset or inventory
- representation receipts on buyer side
- personbil-related receipt handling
- correction, refund and merchant-credit handling för receipts
- reporting
- export
- testmatriser

Ingen kod, inget test, ingen route, ingen migration och ingen runbook får avvika från detta dokument utan att detta dokument skrivs om först.

## Syfte

Kvittoflödet är inte bara:
- fota ett kvitto
- OCR-läsa belopp
- bokföra ett inköp

Kvittoflödet är hela den bindande sanningen för:
- när ett kvitto är tillräckligt underlag för bokföring
- när ett kvitto är tillräckligt underlag för momsavdrag
- när ett kvitto måste behandlas som förenklad faktura
- när ett kvitto inte racker och måste ersättas med fullständig faktura eller annat kompletterande underlag
- när ett kvitto ska ge direkt kostnadsbokning
- när ett kvitto ska ge tillgangs-, lager- eller periodiseringsbokning
- när ett kvitto måste stoppas för att det i själva verket är utlägg, lön, förmån, AP eller privatkostnad
- hur kvittots dokumentprofil, betalprofil, momsprofil och verksamhetssamband måste styra samma bokföringssanning
- hur momsdeklaration, huvudbok, verifikationer, receipts, activity log och SIE4 måste spegla samma sanning

## Omfattning

Detta dokument omfattar minst:
- kassakvitto
- digitalt kvitto
- e-postkvitto
- PDF-kvitto
- merchant-portal receipt
- papperskvitto
- receipt med 25 procent moms
- receipt med 12 procent moms
- receipt med 6 procent moms
- receipt utan moms
- receipt med blandade momssatser
- receipt med delvis avdragsgill moms
- receipt med helt icke avdragsgill moms
- company-card receipt
- bank/debit receipt
- cash receipt
- hotel receipt
- taxi and travel receipt
- office-supplies receipt
- low-value equipment receipt
- inventory-like small-purchase receipt
- representation receipt
- parking receipt
- toll or congestion-charge evidence
- fuel receipt
- merchant refund
- merchant credit
- voided purchase
- duplicate receipt
- split business/private receipt
- foreign-currency receipt
- foreign receipt without Swedish VAT deduction
- import-like customs or fee receipt när ingen leverantörsfaktura finns som primary source
- correction, replay, migration and audit för receipt-driven postings

Detta dokument omfattar inte:
- leverantörsfaktura
- leverantörskreditnota
- vanlig AP-matchning och AP-betalning
- employee outlay reimbursement
- vidarefaktureringstruth
- lön
- förmån på lönesidan
- traktamente
- milersättning
- full importmomsprocess som bygger på tullbeslut
- HUS/ROT/RUT

Kanonisk agarskapsregel:
- `KVITTOFLODET_BINDANDE_SANNING.md` äger bara receipt-driven buyer-side truth för direkta inköp och kostnader
- om betalaren är bolaget och kvittot är primart underlag för affärshandelsen ska sanning definieras har
- `MOMSFLODET_BINDANDE_SANNING.md` äger slutlig box mapping, replacement declarations, importmomsrapportering, periodisk sammanställning, OSS och all slutlig momsrapporterings-truth för receipt-driven source effects
- om den anställde lagt ut privata medel och fordran ska uppsta mot bolaget ligger sanningen i `UTLAGG_OCH_VIDAREFAKTURERING_BINDANDE_SANNING.md`
- om underlaget är en full leverantörsfaktura eller krediteringsnota ligger sanningen i `LEVFAKTURAFLODET_BINDANDE_SANNING.md`
- om kostnaden skapar eller ändrar skattepliktig förmåns- eller löneffekt ligger downstream-sanning i löne- eller förmånsdokument, men receipt intake och initial blockerlogik definieras har

## Absoluta principer

- ett kvitto får aldrig bokföras utan verifierat verksamhetssamband
- ett kvitto får aldrig ge momsavdrag utan tillräckligt dokumentunderlag
- ett kvitto får aldrig behandlas som förenklad faktura om villkoren för förenklad faktura inte är uppfyllda
- ett kvitto får aldrig ensamt skapa momsavdrag om det bara är ett betalningsbevis utan säljaruppgifter och transaktionsinnehåll
- ett kortslip, banknotis eller Swish-bekraeftelse är aldrig ensam bindande verifikation för momsavdrag
- ett kvitto får aldrig dolja att det i själva verket är privat konsumtion, lön, förmån eller ej avdragsgill kostnad
- ett kvitto får aldrig ge full `2641` om avdragsrätt är begränsad, blandad eller blockerad
- ett kvitto får aldrig delas upp i business/private med fria procentsatser utan uttrycklig klassning, policygrund och bevis
- ett kvitto får aldrig posta direkt till catch-all-konto för att slippa klassning
- ett kvitto får aldrig skapa AP-open-item, leverantörsreskontra eller AP-betalningstruth
- ett kvitto får aldrig raderas efter att bokföring skett; correction ska ske med separat correction object
- elektroniskt mottaget kvitto ska bevaras i mottagen form och mottaget format
- papperskvitto som utgor företagets mottagna rakenskapsinformation får inte smygas om till elektronisk sanning utan att bevaranderegeln är uppfylld
- receipt flow får aldrig definiera seller-side ÄR-truth eller köparsidans AP-truth
- detta dokument får inte bli tunnare an faktura- eller AP-bibeln
- ett kvitto som inte kan klassas till exakt en bindande scenariofamilj och exakt en downstream owner får aldrig bokföras
- unknown scenario är alltid blockerande tills ny bindande regel finns eller dokumentet routes till annan redan bindande sanning
- förmånsklassning och förmånsbeskattning ägs av `FORMANER_OCH_FORMANSBESKATTNING_BINDANDE_SANNING.md`; kvittoflödet får bara routa dit och får inte uppfinna egen benefit truth

## Bindande dokumenthierarki för kvittoflödet

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- detta dokument

Detta dokument lutar på:
- `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md` för all upstream capture-, OCR-, AI fallback-, confidence-, duplicate-, review- och routing-sanning fram till att receipt flow får ta över
- `UTLAGG_OCH_VIDAREFAKTURERING_BINDANDE_SANNING.md` för alla fall där den anställde lagt ut privata medel och en fordran eller customer disbursement kan uppsta
- `FAKTURAFLODET_BINDANDE_SANNING.md` endast för regler om förenklad faktura, valuta, correction-symmetri och verifikationsdisciplin
- `LEVFAKTURAFLODET_BINDANDE_SANNING.md` endast för avgränsning mot AP och för specialfall där ett kvitto inte får vara primary source
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` för all voucherregler, kontrollkonton, correction chains, period locks och SIE4-vouchertruth när kvittoflödet skapar legal bokföring

Detta dokument får inte overstyras av:
- gamla expense-runbooks
- gamla travel docs
- gamla OCR-heuristiker
- gamla receipt pipelines
- gamla backloggnoteringar om att kvitton får sakna metadata

Fas 6, 9, 13, 15, 21, 27 och 28 får inte definiera avvikande receipt truth.

Upstream-agarskapsregel:
- hur kvittot tas emot, OCR-lasas, AI-klassas, confidence-satts, duplicate-testas och routas ägs av `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md`
- detta dokument äger först receipt-truth efter att scanninglagret gett dokumentet family, routing, blockerstatus, originalbinarylineage och reviewstatus

## Kanoniska objekt

- `ReceiptCapture`
  - bar primär capture-truth
  - innehåller source channel, media type, capture time, submitter, payer profile och original-format
  - är auditkritisk men inte bokföringsskapande i sig

- `ReceiptDocument`
  - bar legal och operativ truth för mottaget kvitto eller annan receipt-liknande verifikation
  - innehåller merchant identity, transaction date, receipt number, currency, total, tax breakdown, goods/service lines, payment evidence ref, original-media ref och legal profile
  - är bokföringsskapande först när posting decision sker

- `ReceiptProfileDecision`
  - bar bindande beslut om receipt profile
  - avgor om underlaget är:
    - fullgod förenklad faktura
    - receipts-only without VAT deduction
    - payment proof only
    - blocked and must be replaced
    - routed to AP
    - routed to outlay
    - routed to payroll/benefits

- `ReceiptClassificationDecision`
  - bar bindande kostnads-, tillgangs-, lager- eller specialklassning
  - innehåller target account class, VAT deductibility class, representation class, vehicle class, private-use risk class, downstream owner och unknown-scenario verdict

- `ReceiptReviewCase`
  - bar blockerande reviewtruth
  - måste kunna hållas öppen för:
    - missing fields
    - duplicate suspicion
    - mixed private/business
    - non-deductible risk
    - representation annotation missing
    - personbil restriction
    - foreign VAT ambiguity
    - employee-private-payment ambiguity
    - payroll-or-benefit ambiguity
    - unknown scenario classification

- `ReceiptRoutingDecision`
  - bar bindande beslut om vilken sanningsbibel som äger nasta steg
  - tillåtna downstream owners är endast:
    - `receipt_flow`
    - `outlay_flow`
    - `ap_flow`
    - `payroll_flow`
    - `benefit_flow`
    - `asset_flow`
    - `travel_flow`
    - `owner_private_flow`
    - `blocked_unknown`
  - om ingen owner kan faststallas är dokumentet blockerad legal truth

- `ReceiptPaymentEvidence`
  - bar bevis för hur kvittot betalades
  - får aldrig ensam vara moms- eller bokföringsgrund
  - innehåller payment medium, transaction ref, last4 where allowed, settlement date and payer identity class

- `ReceiptPostingDecision`
  - bar den bindande bokföringssanningen
  - innehåller proof-ledger id, target account mapping, VAT treatment, payment offset account, report effect, export effect och correction policy

- `ReceiptCorrection`
  - bar reversal, merchant refund, merchant credit, duplicate nullification och mistaken classification correction
  - får aldrig skriva över original posting decision

- `ReceiptExportReceipt`
  - bar bevis för att receipt-driven posting exporterats till verifikation, SIE4, rapport eller audit bundle

## Kanoniska state machines

### `ReceiptCapture`

- `draft`
- `submitted`
- `ingested`
- `rejected`
- `closed`

Tillåtna övergångar:
- `draft -> submitted`
- `submitted -> ingested | rejected`
- `ingested -> closed`

Otillåtna övergångar:
- `submitted -> closed`
- `rejected -> ingested` utan ny capture

### `ReceiptDocument`

- `ingested`
- `profile_pending`
- `profiled`
- `classification_pending`
- `review_pending`
- `blocked_unknown_scenario`
- `approved`
- `posted`
- `corrected`
- `voided`
- `closed`

Tillåtna övergångar:
- `ingested -> profile_pending`
- `profile_pending -> profiled | review_pending`
- `profiled -> classification_pending`
- `classification_pending -> review_pending | approved | blocked_unknown_scenario`
- `review_pending -> approved | voided`
- `blocked_unknown_scenario -> review_pending | voided`
- `approved -> posted`
- `posted -> corrected | closed`
- `corrected -> closed`

Otillåtna övergångar:
- `ingested -> posted`
- `profile_pending -> posted`
- `review_pending -> posted`
- `blocked_unknown_scenario -> posted`
- `voided -> posted`

### `ReceiptReviewCase`

- `open`
- `evidence_requested`
- `under_review`
- `unknown_scenario`
- `resolved`
- `rejected`

### `ReceiptPostingDecision`

- `draft`
- `approved`
- `posted`
- `reversed`
- `superseded`

### `ReceiptCorrection`

- `draft`
- `approved`
- `posted`
- `closed`

### `ReceiptRoutingDecision`

- `draft`
- `resolved`
- `blocked_unknown`
- `executed`

## Kanoniska commands

- `CreateReceiptCapture`
- `IngestReceiptDocument`
- `AssignReceiptProfile`
- `RequestReceiptEvidence`
- `ClassifyReceipt`
- `RouteReceiptToDownstreamOwner`
- `EscalateUnknownReceiptScenario`
- `ApproveReceiptPosting`
- `PostReceipt`
- `VoidReceipt`
- `CorrectReceiptPosting`
- `RegisterMerchantRefund`
- `RegisterMerchantCredit`
- `LockReceiptExport`

## Kanoniska events

- `ReceiptCaptured`
- `ReceiptDocumentIngested`
- `ReceiptProfileAssigned`
- `ReceiptEvidenceRequested`
- `ReceiptClassified`
- `ReceiptRoutedToDownstreamOwner`
- `ReceiptScenarioEscalated`
- `ReceiptPostingApproved`
- `ReceiptPosted`
- `ReceiptVoided`
- `ReceiptPostingCorrected`
- `MerchantRefundRegistered`
- `MerchantCreditRegistered`
- `ReceiptExportLocked`

## Kanoniska route-familjer

Canonical route family för kvittoflödet ska vara:
- `/v1/expenses/receipts/*`
- `/v1/expenses/receipt-reviews/*`
- `/v1/expenses/receipt-postings/*`
- `/v1/expenses/receipt-exports/*`

Följande får aldrig skriva legal truth:
- `/v1/ui/*`
- `/v1/search/*`
- `/v1/reports/*`
- `/v1/import-preview/*`

Command-only operations:
- create capture
- assign profile
- classify receipt
- approve posting
- post receipt
- void receipt
- correct receipt
- register merchant refund
- register merchant credit

## Kanoniska permissions och review boundaries

- `receipt.capture`
  - får skapa receipt capture men inte posta

- `receipt.classify`
  - får satt receipt profile och cost class
  - får inte overstyra blockerande tax/review rules

- `receipt.review`
  - får losa blockerare, intyga verksamhetssamband och komplettera metadata
  - får inte skriva bokföring utan posting approval

- `receipt.post`
  - får issue legal posting
  - får bara användas efter slutford review och blockerfri klassning

- `receipt.correct`
  - får skapa correction eller merchant refund posting
  - får aldrig skriva över originalet

- `receipt.audit_read`
  - får läsa allt, aldrig mutera

- `support.backoffice`
  - får se review state och receipts enligt policy
  - får aldrig tvinga igenom momsavdrag eller non-deductible override utan explicit approval path

High-risk review boundaries:
- representation
- personbil
- mixed private/business
- foreign VAT
- employee-private-payment ambiguity
- missing legal fields
- duplicate suspicion

## Nummer-, serie-, referens- och identitetsregler

- varje `ReceiptCapture` ska ha ett internt `receipt_capture_id`
- varje `ReceiptDocument` ska ha ett internt `receipt_document_id`
- mottagen extern receipt-identifierare ska sparas som:
  - `merchant_receipt_number`
  - `terminal_receipt_number`
  - `order_reference`
  - `transaction_reference`
  - `merchant_org_or_vat_id` när det finns
- om kvittot saknar externt lopnummer får systemet inte hitta på ett externt receipt number; det interna id:t är inte en ersättning för mottaget nummer
- verifikationsnummer ska skapas endast i posting-ledet
- samma kvitto får aldrig fa flera olika canonical identity fingerprints
- duplicate detection fingerprint måste minst inkludera:
  - merchant identity
  - date/time
  - gross amount
  - currency
  - payment evidence ref where available
  - receipt number where available

## Valuta-, avrundnings- och omräkningsregler

- kvittots originalvaluta ska alltid bevaras
- functional amount i SEK ska alltid lagras om bolaget har SEK som redovisningsvaluta
- valutaomrakning ska baseras på canonical rate source policy i master docs
- momsavdrag i svensk momsredovisning får bara uppsta om svensk moms faktiskt debiterats eller svensk regel uttryckligen medger det
- foreign VAT på hotell, taxi, restaurang eller ändra utlandskvitton får inte bokas som svensk `2641`
- foreign VAT ska som default ingA i kostnaden om inte separat foreign-VAT-reclaim flow äger underlaget
- avrundning ska sparas i egen round-difference field; receipt lines får inte manipuleras för att passa totalsumman
- receipt with mixed rates ska bevara radvis eller tax-bucket-wise tax base and tax amount

## Replay-, correction-, recovery- och cutover-regler

- receipt capture och original media ska vara append-only
- correction får aldrig mutera original `ReceiptDocument`
- replay måste skapa identiskt `ReceiptProfileDecision` och `ReceiptPostingDecision` om indata och policyversion är samma
- receipt import i cutover får aldrig auto-posta receipts som redan resulterat i verifikation i legacy
- migration måste markera:
  - imported-only evidence
  - imported-and-posted in legacy
  - imported-and-reposted in new system
- duplicate receipts vid migration får inte skapa dubbel kostnad eller dubbel moms
- merchant refund efter cutover måste kunna kopplas till pre-cutover receipt

## Huvudflödet

1. receipt capture skapas
2. original media lagras med original-format och source channel
3. merchant, amount, date, currency och payment evidence extraheras
4. receipt profile bestams
5. blockerande fält och legal minima verifieras
6. verksamhetssamband verifieras
7. receipt klassas till:
   - expense
   - asset
   - inventory
   - representation
   - vehicle
   - blocked to outlay
   - blocked to AP
   - blocked to payroll/benefits
8. momsavdrag och non-deductible rules bestams
9. posting approval sker
10. posting issueas med canonical proof-ledger
11. export, report and audit receipts lAses
12. correction, refund eller merchant credit hanteras separat om behov uppstår

## Bindande scenarioaxlar

Varje scenario måste korsas mot minst dessa axlar:

- payer profile
  - company cash
  - company debit/bank
  - company card
  - employee private funds
  - unknown

- supplier identity profile
  - Swedish seller with org/VAT id
  - Swedish seller without complete identity
  - foreign seller
  - platform/intermediary seller
  - machine-generated anonymous receipt

- document profile
  - valid simplified invoice
  - receipt plus supplemental evidence
  - payment proof only
  - replacement invoice required
  - blocked

- tax profile
  - 25
  - 12
  - 6
  - 0 with legal reason
  - mixed
  - foreign VAT only
  - no VAT because tax/fee/toll

- business relation
  - pure business
  - mixed business/private
  - employee private consumption
  - representation external
  - representation internal
  - vehicle operation
  - payroll/benefit risk
  - friskvard or personalvardsforman risk
  - gift/gava risk
  - healthcare risk
  - work-clothes versus private-clothes risk
  - work-tool versus private-use-equipment risk
  - subscription or recurring-service risk
  - unknown

- booking target
  - operating expense
  - low-value equipment
  - inventory purchase
  - fixed asset
  - prepaid expense
  - blocked/no posting

- correction outcome
  - no correction
  - merchant refund
  - merchant credit
  - duplicate reversal
  - wrong classification correction

- reporting outcome
  - field 48 only
  - no Swedish VAT field
  - audit only
  - blocked from export

## Bindande policykartor

### Bindande dokumentprofilkarta

- `RDP001` valid simplified invoice receipt
- `RDP002` receipt with missing VAT minima but enough för gross-cost booking only
- `RDP003` payment proof only
- `RDP004` hotel folio
- `RDP005` fuel receipt
- `RDP006` parking receipt
- `RDP007` toll or congestion-charge evidence
- `RDP008` restaurant/representation receipt
- `RDP009` mixed-rate retail receipt
- `RDP010` foreign receipt with foreign VAT
- `RDP011` employee-private-payment receipt, route to outlay
- `RDP012` full invoice disguised as receipt, route to AP where policy requires

### Bindande kostnadsklasskarta

- `KRC001` office supplies -> `6110`
- `KRC002` consumables/material -> `5460`
- `KRC003` low-value equipment -> `5410`
- `KRC004` inventory-like goods för resale -> `4010`
- `KRC005` hotel/logi -> `5831`
- `KRC006` travel/taxi/public transport -> `5800`
- `KRC007` vehicle operating cost -> `5610`
- `KRC008` parking and similar vehicle charges -> `5619`
- `KRC009` external representation deductible basis -> `6071`
- `KRC010` external representation non-deductible basis -> `6072`
- `KRC011` internal representation deductible basis -> `7631`
- `KRC012` internal representation non-deductible basis -> `7632`
- `KRC013` software/digital minor purchase -> `6540`
- `KRC014` fixed asset machinery/equipment -> `1220`
- `KRC015` fixed asset vehicles where allowed -> `1240`
- `KRC016` fixed asset tools/installations -> `1250`
- `KRC017` tax/fee/no-VAT public charge -> `6991`

### Bindande betalprofilkarta

- `PAY001` company cash -> credit `1910`
- `PAY002` direct bank/debit -> credit `1930`
- `PAY003` company card issuer clearing -> credit `2890`
- `PAY004` employee private funds -> blocked from direct receipt posting, route to outlay truth

### Bindande avdragsrättskarta

- `VATD001` full Swedish input VAT -> debit `2641`
- `VATD002` no Swedish VAT deduction, gross to cost/tillgang
- `VATD003` partial deduction, deductible part to `2641`, non-deductible part to cost
- `VATD004` blocked until evidence or split exists

### Bindande downstream-owner-matris

- `OWN001` `receipt_flow`
  - company-paid
  - pure business
  - receipt underlag tillräckligt
  - ingen payroll-, benefit-, outlay- eller AP-risk

- `OWN002` `outlay_flow`
  - employee private funds
  - fordran mot bolaget ska uppsta
  - receipt flow får inte issue slutlig legal posting

- `OWN003` `ap_flow`
  - full invoice/AP-truth krävs
  - recurring supplier relation
  - leverantörsskuld eller importmomsprocess är verklig primary source

- `OWN004` `payroll_flow`
  - kostnadsersättning, reseersättning eller lönekoppling är den verkliga effekten

- `OWN005` `benefit_flow`
  - receipt kan ge kostforman, drivmedelsforman, privat konsumtion, gava, sjukvard eller annan skattepliktig/bedomningskravande förmån

- `OWN006` `asset_flow`
  - asset truth äger fortsatt livscykel efter initial recognition

- `OWN007` `travel_flow`
  - receipt är rese- eller traktamentenara och måste underordna sig travel policy

- `OWN008` `owner_private_flow`
  - receipt avser privat kostnad eller eget uttag för ägare/delAgare

- `OWN009` `blocked_unknown`
  - scenariofamilj saknas
  - downstream owner oklart
  - legal/tax outcome oklart
  - ingen posting, ingen moms, ingen export

## Bindande canonical proof-ledger med exakta konton eller faltutfall

### KVT-P0001 Svenskt receipt, 25 % moms, bolagsbetalt, vanlig kostnad

- debet `6110` eller annan `KRC00x` target = netto
- debet `2641` = moms
- kredit `1910`, `1930` eller `2890` enligt `PAY00x` = brutto

### KVT-P0002 Svenskt receipt, 12 % moms, bolagsbetalt

- debet `5831` eller annan target = netto
- debet `2641` = moms
- kredit payment account = brutto

### KVT-P0003 Svenskt receipt, 6 % moms, bolagsbetalt

- debet `5800` eller annan target = netto
- debet `2641` = moms
- kredit payment account = brutto

### KVT-P0004 Svenskt mixed-rate receipt

- debet target accounts = respektive netto per rad/tax bucket
- debet `2641` = summerad avdragsgill svensk moms
- kredit payment account = brutto

### KVT-P0005 Svenskt receipt utan moms med laglig orsak

- debet target account = brutto
- ingen debet `2641`
- kredit payment account = brutto

### KVT-P0006 Receipt saknar VAT-minima, gross-cost only

- debet target account = brutto
- ingen debet `2641`
- kredit payment account = brutto

### KVT-P0007 Office supplies receipt 25 %

- debet `6110` = netto
- debet `2641` = moms
- kredit payment account = brutto

### KVT-P0008 Consumables receipt 25 %

- debet `5460` = netto
- debet `2641` = moms
- kredit payment account = brutto

### KVT-P0009 Low-value equipment receipt

- debet `5410` = netto
- debet `2641` = moms när avdragsgill
- kredit payment account = brutto

### KVT-P0010 Inventory-like small purchase

- debet `4010` = netto
- debet `2641` = moms
- kredit payment account = brutto

### KVT-P0011 Fixed asset receipt, machine/equipment

- debet `1220` = netto
- debet `2641` = moms endast när avdragsgill
- kredit payment account = brutto

### KVT-P0012 Hotel receipt Sweden

- debet `5831` = netto logi-del
- debet `2641` = avdragsgill svensk moms på avdragsgill del
- kredit payment account = brutto

### KVT-P0013 Taxi/public transport receipt Sweden

- debet `5800` = netto
- debet `2641` = moms
- kredit payment account = brutto

### KVT-P0014 Parking receipt with Swedish VAT

- debet `5619` = netto
- debet `2641` = moms när avdragsgill för verksamheten
- kredit payment account = brutto

### KVT-P0015 Toll or congestion-charge evidence

- debet `6991` eller `5619` enligt canonical policy = brutto
- ingen debet `2641`
- kredit payment account = brutto

### KVT-P0016 Fuel receipt för company-owned or company-leased personbil

- debet `5610` = netto
- debet `2641` = avdragsgill del enligt verksamhetsandel och canonical policy
- kredit payment account = brutto

### KVT-P0017 Fuel receipt för employee-owned private car

- posting blocked i kvittoflödet
- route to lön/travel reimbursement policy
- ingen debet `2641`

### KVT-P0018 External representation, within deductible VAT cap

- debet `6071` = avdragsgill momsgrundande del exklusive moms
- debet `6072` = overskjutande eller icke avdragsgill del exklusive moms samt icke avdragsgill momsdel
- debet `2641` = avdragsgill momsdel enligt representation rules
- kredit payment account = brutto

### KVT-P0019 Internal representation, within deductible VAT cap

- debet `7631` = avdragsgill momsgrundande del exklusive moms
- debet `7632` = overskjutande eller icke avdragsgill del och icke avdragsgill momsdel
- debet `2641` = avdragsgill momsdel enligt personalfest/kringkostnad rule
- kredit payment account = brutto

### KVT-P0020 Representation receipt without participants or purpose

- posting blocked
- ingen legal posting innan annotation completion eller explicit downgrade to no-deduction path

### KVT-P0021 Foreign receipt with foreign VAT

- debet target account = brutto inklusive foreign VAT
- ingen debet `2641`
- kredit payment account = brutto

### KVT-P0022 Foreign receipt without VAT but with business use

- debet target account = brutto
- ingen svensk momsbokning
- kredit payment account = brutto

### KVT-P0023 Foreign receipt requiring AP/import process

- posting blocked in kvittoflödet
- route to AP/import truth

### KVT-P0024 Mixed private/business receipt with exact split and evidence

- debet business target = business net or business gross according to VAT class
- debet `2641` = endast business-deductible VAT
- kredit payment account = full gross
- privat del får inte postas har; receipt flow ska blockera tills korrekt downstream owner valts

### KVT-P0025 Pure private cost on company payment instrument

- posting blocked to payroll/benefits or owner-draw owner
- receipt flow får inte issue ordinary cost posting

### KVT-P0026 Merchant refund för earlier deductible receipt

- debet payment account = återbetalt belopp
- kredit ursprungligt target account = netto-del enligt original
- kredit `2641` = momsdel enligt original avdragsrätt

### KVT-P0027 Merchant credit note för earlier receipt

- debet payment account eller offset account = enligt faktisk reglering
- kredit ursprungligt target account = netto-del enligt original
- kredit `2641` = momsdel enligt original

### KVT-P0028 Duplicate receipt reversal

- spegelvand reversering av ursprungligt `KVT-P00xx`

### KVT-P0029 Wrong cost-class correction

- kredit fel target account = netto
- debet korrekt target account = netto
- ingen ny `2641` om momsbehandling inte ändras

### KVT-P0030 Wrong VAT-deduction correction

- kredit `2641` = felaktigt avdragen momsdel
- debet target cost account = samma belopp

### KVT-P0031 Digital receipt, original electronic

- underliggande posting följer relevant `KVT-P0001-KVT-P0030`
- original format måste bevaras elektroniskt

### KVT-P0032 Paper receipt, paper original

- underliggande posting följer relevant `KVT-P0001-KVT-P0030`
- bevarandeform styrs av mottagen form enligt bokföringsregler

### KVT-P0033 Payment proof only, no purchase proof

- posting blocked

### KVT-P0034 Receipt över simplified-invoice threshold without full invoice data

- gross-cost posting only om annan verifikation är tillracklig enligt bokföringsregler och VAT deduction inte yrkas
- annars blocked pending replacement invoice

### KVT-P0035 Personbil purchase receipt where input VAT is blocked

- debet `1240` eller annan target = brutto
- ingen debet `2641`
- kredit payment account = brutto

### KVT-P0036 Personbil leasing downpayment or buyout disguised as receipt

- route to AP eller asset truth
- ingen receipt posting i normalfallet

### KVT-P0037 Representation gift receipt

- debet `6071` eller `6072` enligt deductible basis and cap
- debet `2641` endast på avdragsgill momsdel
- kredit payment account = brutto

### KVT-P0038 Personal meal receipt with payroll/benefit risk

- posting blocked to payroll/benefit review

### KVT-P0039 Combined hotel and breakfast receipt requiring split

- debet `5831` = logi net
- debet relevant meal/representation/travel target för breakfast/service portion = net
- debet `2641` = avdragsgill del enligt split
- kredit payment account = brutto

### KVT-P0040 Public fee/no-VAT authority receipt

- debet `6991` eller annan explicit fee target = brutto
- ingen debet `2641`
- kredit payment account = brutto

### KVT-P0041 Payroll or benefit routing

- ingen legal cost posting i kvittoflödet
- downstream owner = `OWN004` eller `OWN005`
- receipt status = `review_pending` tills downstream owner resolverats

### KVT-P0042 Outlay routing

- ingen legal posting i kvittoflödet
- downstream owner = `OWN002`
- receipt flow får bara läsa capture, profile, evidence och routing decision

### KVT-P0043 AP routing

- ingen receipt-driven posting
- downstream owner = `OWN003`
- AP truth måste ta över innan legal posting får issueas

### KVT-P0044 Owner/private blocking

- ingen legal business posting
- downstream owner = `OWN008`
- VAT deduction blocked

### KVT-P0045 Unknown scenario blocking

- ingen posting
- ingen VAT deduction
- ingen export
- receipt status = `blocked_unknown_scenario`
- downstream owner = `OWN009`

## Bindande rapport-, export- och myndighetsmappning

- svensk avdragsgill input VAT från kvittopostningar ska till momsdeklarationens fält `48`
- kvitton utan svensk avdragsgill moms får inte belasta fält `48`
- foreign VAT får inte till svensk momsdeklaration
- receipts med representation ska fortfarande till `48` endast för avdragsgill momsdel
- receipts med non-deductible VAT måste visa non-deductible portion i audit/export
- SIE4-export måste visa:
  - verifikationsserie
  - verifikationsnummer
  - verifikationsdatum
  - konteringsrader
  - original receipt reference
- audit export måste visa:
  - receipt profile
  - cost class
  - VAT deductibility class
  - blocker history
  - review resolution

## Bindande scenariofamilj till proof-ledger och rapportspar

### A. Svenskt standardkvitto

- `KVT-A001` -> `KVT-P0001`, field `48` ja
- `KVT-A002` -> `KVT-P0002`, field `48` ja
- `KVT-A003` -> `KVT-P0003`, field `48` ja
- `KVT-A004` -> `KVT-P0004`, field `48` ja
- `KVT-A005` -> `KVT-P0005`, field `48` nej
- `KVT-A006` -> `KVT-P0006`, field `48` nej

### B. Klassning och target account

- `KVT-B001` -> `KVT-P0007`
- `KVT-B002` -> `KVT-P0008`
- `KVT-B003` -> `KVT-P0009`
- `KVT-B004` -> `KVT-P0010`
- `KVT-B005` -> `KVT-P0011`

### C. Resa och logi

- `KVT-C001` -> `KVT-P0012`
- `KVT-C002` -> `KVT-P0013`
- `KVT-C003` -> `KVT-P0039`
- `KVT-C004` -> `KVT-P0021`

### D. Fordon

- `KVT-D001` -> `KVT-P0014`
- `KVT-D002` -> `KVT-P0015`
- `KVT-D003` -> `KVT-P0016`
- `KVT-D004` -> `KVT-P0017`
- `KVT-D005` -> `KVT-P0035`
- `KVT-D006` -> `KVT-P0036`

### E. Representation

- `KVT-E001` -> `KVT-P0018`
- `KVT-E002` -> `KVT-P0019`
- `KVT-E003` -> `KVT-P0020`
- `KVT-E004` -> `KVT-P0037`
- `KVT-E005` -> `KVT-P0038`

### F. Betalprofil och dokumentprofil

- `KVT-F001` -> underliggande `KVT-P0001-P0040` med `PAY001`
- `KVT-F002` -> underliggande `KVT-P0001-P0040` med `PAY002`
- `KVT-F003` -> underliggande `KVT-P0001-P0040` med `PAY003`
- `KVT-F004` -> blocked to outlay with `PAY004`
- `KVT-F005` -> `KVT-P0031`
- `KVT-F006` -> `KVT-P0032`
- `KVT-F007` -> `KVT-P0033`
- `KVT-F008` -> `KVT-P0034`

### G. Correction

- `KVT-G001` -> `KVT-P0026`
- `KVT-G002` -> `KVT-P0027`
- `KVT-G003` -> `KVT-P0028`
- `KVT-G004` -> `KVT-P0029`
- `KVT-G005` -> `KVT-P0030`

### H. Foreign and special

- `KVT-H001` -> `KVT-P0021`
- `KVT-H002` -> `KVT-P0022`
- `KVT-H003` -> `KVT-P0023`
- `KVT-H004` -> `KVT-P0040`

### I. Förmån, lön, utlägg och okanda scenarier

- `KVT-I001` personal meal / kostformansrisk -> `KVT-P0041`
- `KVT-I002` friskvard eller personalvardsformansrisk -> `KVT-P0041`
- `KVT-I003` gava till anställd -> `KVT-P0041`
- `KVT-I004` arbetsgivarbetald halso- eller sjukvard -> `KVT-P0041`
- `KVT-I005` arbetsklader kontra privata klader -> `KVT-P0041` eller underliggande `KVT-P0001-P0040`
- `KVT-I006` arbetsredskap kontra privat utrustning, till exempel mobil/internet/hemarbetsutrustning -> `KVT-P0041` eller underliggande `KVT-P0001-P0040`
- `KVT-I007` laddning eller drivmedel med drivmedelsformansrisk -> `KVT-P0041`
- `KVT-I008` subscription eller recurring service bought on receipt -> `KVT-P0043`
- `KVT-I009` employee-private-payment or reimbursement ambiguity -> `KVT-P0042`
- `KVT-I010` owner/private purchase on company funds -> `KVT-P0044`
- `KVT-I011` okand eller otackad scenariofamilj -> `KVT-P0045`

## Tvingande dokument- eller indataregler

- ett kvitto som ska ge momsavdrag måste minst ha de uppgifter som krävs för underlaget att behandlas som förenklad faktura eller annars ge tydlig, verifierbar tax breakdown
- merchant name eller identifierbar säljaridentitet måste finnas
- transaktionsdatum måste finnas
- vad inköpet avser måste framga
- totalbelopp måste framga
- momsbelopp eller uppgifter som gör momsbeloppet bestambart måste finnas när momsavdrag ska yrkas
- om kvittot är elektroniskt ska original elektronisk form bevaras
- om kvittot är pappersbaserat ska bevarande ske enligt reglerna för mottagen rakenskapsinformation
- representation måste kompletteras med:
  - syfte
  - deltagare
  - intern eller extern representation
  - headcount för moms cap
- fuel/personbil måste kompletteras med:
  - vehicle relation
  - business-use basis where needed
- foreign receipt måste kompletteras med:
  - land
  - valuta
  - VAT type

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `RR001` Swedish standard taxable supply 25 %
- `RR002` Swedish standard taxable supply 12 %
- `RR003` Swedish standard taxable supply 6 %
- `RR004` no VAT because seller exempt under Swedish small-turnover exemption or other legal exemption stated on document
- `RR005` no VAT because receipt avser tax, public fee or other non-VAT charge
- `RR006` foreign receipt with foreign VAT only
- `RR007` foreign receipt with no VAT charged under local rule
- `RR008` no VAT deduction because receipt lacks deductible VAT minima
- `RR009` no VAT deduction because purchase has no direct and immediate connection to taxable business
- `RR010` no VAT deduction because personbil restriction blocks deduction
- `RR011` no VAT deduction because private-consumption or payroll/benefit risk not resolved
- `RR012` no direct receipt posting because employee private funds -> outlay truth
- `RR013` no direct receipt posting because full invoice/AP flow required

## Bindande faltspec eller inputspec per profil

### Profil `RDP001` valid simplified invoice receipt

Måste innehålla:
- seller name
- transaction date
- goods/service description sufficient för tax class
- total amount
- tax rate or tax amount enabling tax determination
- currency
- receipt or transaction reference if available

### Profil `RDP002` gross-cost-only receipt

Måste innehålla:
- enough data to identify affärshandelsen enligt bokföringsregler
- merchant or counterparty indicator
- date
- amount
- what the purchase concerns at a usable minimum level

### Profil `RDP004` hotel folio

Måste innehålla:
- hotel identity
- guest name or company traveller link
- stay dates
- room/logi amount
- breakfast or other meal split if bundled
- VAT breakdown
- currency

### Profil `RDP005` fuel receipt

Måste innehålla:
- station identity
- date/time
- fuel type
- volume and/or quantity
- amount
- VAT breakdown
- payment evidence ref
- vehicle relation or fuel-card relation where available

### Profil `RDP006` parking receipt

Måste innehålla:
- parking provider identity or location
- date/time or parking period
- amount
- VAT info where applicable
- vehicle relation where available

### Profil `RDP008` representation receipt

Måste innehålla:
- restaurant/event/provider identity
- date
- total amount
- VAT breakdown
- enough detail to identify meal/event/gift type

Och måste kompletteras i systemet med:
- purpose
- participants
- internal/external flag
- person count

### Profil `RDP010` foreign receipt

Måste innehålla:
- seller identity
- country
- date
- amount
- currency
- foreign VAT indication or no-VAT indication where possible

### Profil `RDP011` employee-private-payment receipt

Måste innehålla:
- allt som krävs av relevant receipt profile
- payer profile = employee private funds
- downstream owner = outlay truth

## Scenariofamiljer som hela systemet måste tacka

- `KVT-A001` standard Swedish 25 % office receipt
- `KVT-A002` standard Swedish 12 % receipt
- `KVT-A003` standard Swedish 6 % receipt
- `KVT-A004` mixed-rate receipt
- `KVT-A005` 0 %-receipt with lawful reason
- `KVT-A006` receipt without deductible VAT minima
- `KVT-B001` office supplies
- `KVT-B002` consumables
- `KVT-B003` low-value equipment
- `KVT-B004` inventory-like retail purchase
- `KVT-B005` fixed asset threshold purchase
- `KVT-C001` hotel in Sweden
- `KVT-C002` taxi/public transport in Sweden
- `KVT-C003` hotel with breakfast or bundled services needing split
- `KVT-C004` foreign travel receipt
- `KVT-D001` parking with Swedish VAT
- `KVT-D002` congestion tax or other non-VAT road charge
- `KVT-D003` fuel för company or leased personbil
- `KVT-D004` fuel för employee-owned private car
- `KVT-D005` personbil purchase where VAT blocked
- `KVT-D006` leasing buyout/downpayment disguised as receipt
- `KVT-E001` external representation meal
- `KVT-E002` internal representation/personalfest
- `KVT-E003` representation missing purpose or participants
- `KVT-E004` representation gift
- `KVT-E005` personal meal / benefit-risk receipt
- `KVT-F001` company cash payment
- `KVT-F002` direct bank/debit payment
- `KVT-F003` company-card payment
- `KVT-F004` employee private payment
- `KVT-F005` electronic original receipt
- `KVT-F006` paper original receipt
- `KVT-F007` payment proof only
- `KVT-F008` receipt över threshold without full invoice data
- `KVT-G001` merchant refund
- `KVT-G002` merchant credit
- `KVT-G003` duplicate receipt
- `KVT-G004` wrong cost-class correction
- `KVT-G005` wrong VAT-deduction correction
- `KVT-H001` foreign receipt with foreign VAT
- `KVT-H002` foreign receipt with no VAT
- `KVT-H003` import-like receipt that must route to AP/import truth
- `KVT-H004` authority fee/no-VAT receipt
- `KVT-I001` personal meal / kostformansrisk
- `KVT-I002` friskvard eller personalvardsformansrisk
- `KVT-I003` gava till anställd
- `KVT-I004` arbetsgivarbetald halso- eller sjukvard
- `KVT-I005` arbetsklader kontra privata klader
- `KVT-I006` arbetsredskap kontra privat utrustning, till exempel mobil/internet/hemarbetsutrustning
- `KVT-I007` laddning eller drivmedel med drivmedelsformansrisk
- `KVT-I008` subscription eller recurring service bought on receipt
- `KVT-I009` employee-private-payment or reimbursement ambiguity
- `KVT-I010` owner/private purchase on company funds
- `KVT-I011` okand eller otackad scenariofamilj

## Scenarioregler per familj

- `KVT-A001`
  - måste ge `KVT-P0001`
  - får inte boka gross to cost if deductible Swedish VAT is complete

- `KVT-A004`
  - måste splitta tax buckets
  - får inte bokas som en enda 25 %-rad om receipt har 12/6/25 mix

- `KVT-A006`
  - får bara ge gross-cost booking eller block
  - får aldrig ge `2641`

- `KVT-B005`
  - måste prova asset threshold and useful-life rules
  - får inte defaulta till `5410` om canonical policy sager fixed asset

- `KVT-C003`
  - måste splitta bundled hotel/logi and breakfast/servering where required
  - får inte behandla hela receiptsumman som en enda VAT class om underlaget visar flera prestationer

- `KVT-D003`
  - måste verifiera vehicle relation
  - måste tillämpa personbil restriction and business-use basis

- `KVT-D004`
  - ska stoppas från direct receipt posting
  - ska rutas till lön/travel reimbursement truth

- `KVT-D005`
  - får inte ge `2641` om personbilsforvarv omfattas av avdragsforbud

- `KVT-E001`
  - måste ha purpose, participants and person count
  - momsavdrag får bara ske inom representation cap och enligt aktuell momsblandning

- `KVT-E003`
  - ska blockeras tills annotation finns eller explicit no-deduction path valts

- `KVT-E005`
  - får inte bokas som vanlig driftkostnad
  - ska rutas till payroll/benefit review

- `KVT-F004`
  - får inte skapa direct payment credit to `1910`, `1930` eller `2890`
  - måste foras till outlay truth

- `KVT-F007`
  - får aldrig ge VAT deduction eller cost posting ensam

- `KVT-F008`
  - får inte ge VAT deduction om full invoice data krävs och saknas

- `KVT-G001`
  - måste reversera original VAT treatment proportionellt

- `KVT-H001`
  - får aldrig debitera `2641`
  - foreign VAT ska normalt ligga kvar i kostnaden

- `KVT-H003`
  - ska blockeras när customs or import decision är det egentliga tax-underlaget

- `KVT-I001`
  - får inte bokas som vanlig driftkostnad om arbetsgivarbetald maltid kan ge kostforman
  - ska rutas till payroll/benefit review

- `KVT-I002`
  - får inte bokas som vanlig driftkostnad utan verifierad friskvards- eller personalvardsklass
  - employee-private-payment version ska normalt rutas till outlay/benefit, inte till direct receipt posting

- `KVT-I003`
  - gavor till anställda får inte passera som vanlig omkostnad utan benefit/gift-policy review

- `KVT-I004`
  - sjukvard eller liknande receipt får inte auto-bokas som vanlig driftskostnad om förmåns- eller skatteregler kan paverkas

- `KVT-I005`
  - arbetsklader receipt får inte auto-bokas som business om privat användbarhet inte är utesluten eller policybedomd

- `KVT-I006`
  - mobil, internet eller hemarbetsutrustning får inte auto-bokas som ren business expense om privat nytta eller benefit risk är oklad

- `KVT-I007`
  - laddning eller drivmedel får inte auto-bokas som vanlig vehicle expense om drivmedelsforman eller privatkorning kan foreligga

- `KVT-I008`
  - receipt på subscription eller recurring service får inte ligga kvar i kvittoflödet om canonical truth ska agas av AP eller recurring vendor relation

- `KVT-I009`
  - employee-private-payment ambiguity ska alltid blockera tills korrekt downstream owner satts

- `KVT-I010`
  - owner/private purchase på company funds får aldrig ge business posting eller `2641`

- `KVT-I011`
  - okand eller otackad scenariofamilj ska alltid landa i `blocked_unknown_scenario`
  - ny automatisk regel får inte uppfinnas i runtime; dokumentet eller annan bindande sanning måste utokas först

## Blockerande valideringar

- merchant identity saknas för deductible VAT scenario
- transaction date saknas
- total amount saknas
- tax amount or rate saknas för deductible VAT scenario
- receipt profile undefined
- payer profile undefined
- employee private funds upptackt i receipt flow
- representation selected but purpose saknas
- representation selected but participants saknas
- representation selected but person count saknas
- mixed private/business without exact split
- personbil-related receipt without vehicle relation
- personbil purchase trying to claim `2641` in forbidden scenario
- fuel receipt för private car trying to claim business input VAT in direct receipt flow
- payment proof only without merchant receipt
- duplicate suspicion unresolved
- foreign receipt trying to claim Swedish `2641`
- receipt över full-invoice threshold attempting deductible VAT without sufficient data
- bundled hotel/breakfast receipt not split where split is required
- asset-threshold receipt trying to post to cost without classification approval
- import-like receipt trying to bypass AP/import truth
- payroll- eller benefit-risk oklart
- owner/private-risk oklart
- downstream owner unresolved
- scenariofamilj saknas i bindande katalog
- unknown scenario verdict = unresolved

## Rapport- och exportkonsekvenser

- endast avdragsgill svensk input VAT får till momsfaltet `48`
- non-deductible VAT ska inte till `48`, utan till kostnad
- gross-cost-only receipts ska inte skapa VAT export lines
- receipt-driven postings ska med egna verifikationsserier kunna skiljas från AP och utlägg
- audit export måste visa om receipt bokats:
  - med full VAT deduction
  - med partial VAT deduction
  - utan VAT deduction
  - blockerad
  - routed away

## Förbjudna förenklingar

- att alltid boka kvitton på ett enda omkostnadskonto
- att alltid boka moms på `2641` när `moms` ordet förekommer i OCR
- att anta att alla restaurangkvitton är representation
- att anta att alla hotellkvitton är fullt avdragsgilla på all moms
- att behandla kortslip som receipt
- att behandla banknotis som receipt
- att anta att employee-paid receipt = bolagsbetalt inköp
- att blanda trangselskatt och parkering som samma VAT-klass
- att anta att utlandskvitto med foreign VAT är svensk input VAT
- att posta personbilskop på vanliga driftkostnader med `2641`
- att anta att arbetsgivarbetald mat, gava, sjukvard, laddning eller friskvard är vanlig driftkostnad utan payroll/benefit review
- att anta att arbetsklader, mobil, internet eller hemarbetsutrustning är ren business kostnad utan privatnyttebedomning
- att auto-bokföra receipts som inte matchar en bindande scenariofamilj
- att skapa ad hoc-konton eller ad hoc-regler för receipts som inte passar

## Fler bindande proof-ledger-regler för specialfall

- representation över cap måste splitta deductible and non-deductible part i samma canonical posting
- partial deductibility måste alltid visa vilken momsdel som flyttats till kostnad
- duplicate reversal måste spegla originalets target account, VAT account och payment account
- merchant refund måste kopplas till original receipt id
- correction av fel target account får inte rubba payment evidence lineage
- original receipt media måste fortsatt vara kopplat efter correction
- routed or blocked receipts måste ha explicit `KVT-P0041-KVT-P0045` outcome, aldrig implicit "ingen bokning bara"

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `KVT-P0001-KVT-P0025`, `KVT-P0030`, `KVT-P0035`, `KVT-P0039`, `KVT-P0040`
  - ingen leverantörsreskontra får uppsta
  - ingen kundreskontra får uppsta
  - receipt status -> `posted`

- `KVT-P0026-KVT-P0028`
  - original receipt status -> `corrected`
  - correction object -> `posted`

- `KVT-P0033`, `KVT-P0034`, `KVT-P0036`, `KVT-P0038`, `KVT-P0041`, `KVT-P0042`, `KVT-P0043`, `KVT-P0044`
  - receipt status -> `review_pending` eller `voided`, aldrig `posted` som vanlig driftkostnad

- `KVT-P0045`
  - receipt status -> `blocked_unknown_scenario`
  - ingen leverantörsreskontra
  - ingen kundreskontra
  - ingen verifikation
  - ingen momsrapport

## Bindande verifikations-, serie- och exportregler

- kvittopostningar ska ga i separat verifikationsserie, canonical prefix `KVT`
- correction ska ga i separat eller tydligt markerad correctionserie, canonical prefix `KVC`
- merchant refunds får inte dela verifikationsnummer med originalpostningen
- export till SIE4 måste bevara receipt reference i transaktionstext eller verifikationsmetadata enligt exportpolicy
- same receipt id får aldrig mappas till flera verifikationsnummer utan correction lineage

## Bindande variantmatris som måste korsas mot varje scenariofamilj

Varje scenariofamilj ska provas mot:
- `PAY001-PAY004`
- `RDP001-RDP012`
- `VATD001-VATD004`
- svensk eller foreign seller
- SEK eller foreign currency
- pure business, mixed private/business, benefit risk
- original electronic eller original paper
- no correction, refund, duplicate, wrong VAT correction

Minimikrav:
- varje scenariofamilj måste ha minst en standardfixture
- varje scenariofamilj som paverkar moms måste ha minst en granskorrigeringsfixture
- varje scenariofamilj med mixed/private risk måste ha en blockerfixture

## Bindande fixture-klasser för kvittoflödet

- `KFXT-001` standard Swedish 25 %
- `KFXT-002` standard Swedish 12 %
- `KFXT-003` standard Swedish 6 %
- `KFXT-004` mixed-rate receipt
- `KFXT-005` gross-cost-only receipt
- `KFXT-006` representation över cap
- `KFXT-007` fuel/vehicle receipt
- `KFXT-008` hotel with split
- `KFXT-009` foreign-currency receipt
- `KFXT-010` duplicate/correction fixture
- `KFXT-011` employee-private-payment fixture
- `KFXT-012` asset-threshold fixture
- `KFXT-013` unknown or unmatched scenario fixture

## Bindande expected outcome-format per scenario

Varje scenario måste minst redovisa:
- scenario id
- fixture class
- payer profile
- document profile
- legal reason code
- target cost/asset class
- proof-ledger id
- exact debet/kredit
- exact VAT effect
- field 48 yes/no
- SIE4 effect
- blocker yes/no
- downstream owner if routed away

## Bindande canonical verifikationsseriepolicy

- `KVT` = ordinarie receipt posting
- `KVC` = receipt correction
- `KVR` = merchant refund/credit if separated by canonical policy

Ingen annan serie får skapa kvittodriven legal truth utan explicit policyandring i detta dokument.

## Bindande expected outcome per central scenariofamilj

### `KVT-A001`

- fixture minimum: `KFXT-001`
- payer profile: `PAY002`
- document profile: `RDP001`
- legal reason code: `RR001`
- proof-ledger: `KVT-P0001`
- expected posting:
  - debet `6110` = netto
  - debet `2641` = moms
  - kredit `1930` = brutto
- field 48: ja
- blocker: nej

### `KVT-C003`

- fixture minimum: `KFXT-008`
- proof-ledger: `KVT-P0039`
- expected outcome:
  - logi-del till `5831`
  - frukost/serveringsdel till separat target according to classification
  - `2641` endast på avdragsgill del
  - no single-rate shortcut

### `KVT-D003`

- fixture minimum: `KFXT-007`
- proof-ledger: `KVT-P0016`
- expected outcome:
  - debit `5610`
  - debit `2641` endast på avdragsgill verksamhetsdel
  - private-use ambiguity -> blocker

### `KVT-E001`

- fixture minimum: `KFXT-006`
- proof-ledger: `KVT-P0018`
- expected outcome:
  - split between `6071`, `6072`, `2641`
  - participants and purpose mandatory
  - field 48 endast på avdragsgill momsdel

### `KVT-F004`

- fixture minimum: `KFXT-011`
- proof-ledger: none
- expected outcome:
  - blocked from direct receipt posting
  - downstream owner = outlay truth

### `KVT-H001`

- fixture minimum: `KFXT-009`
- proof-ledger: `KVT-P0021`
- expected outcome:
  - gross cost booking only
  - no `2641`
  - no field 48

### `KVT-I011`

- fixture minimum: `KFXT-013`
- proof-ledger: `KVT-P0045`
- expected outcome:
  - receipt status = `blocked_unknown_scenario`
  - no posting
  - no VAT deduction
  - no export
  - downstream owner = `OWN009`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `KVT-A001`: `KVT-P0001`; `KFXT-001`; field 48 `ja`; SIE4 `6110,2641,1930/2890/1910`
- `KVT-A002`: `KVT-P0002`; `KFXT-002`; field 48 `ja`
- `KVT-A003`: `KVT-P0003`; `KFXT-003`; field 48 `ja`
- `KVT-A004`: `KVT-P0004`; `KFXT-004`; field 48 `ja split`
- `KVT-A005`: `KVT-P0005`; `KFXT-005`; field 48 `nej`
- `KVT-A006`: `KVT-P0006`; `KFXT-005`; field 48 `nej`
- `KVT-B001`: `KVT-P0007`; `KFXT-001`; target `6110`
- `KVT-B002`: `KVT-P0008`; `KFXT-001`; target `5460`
- `KVT-B003`: `KVT-P0009`; `KFXT-012`; target `5410`
- `KVT-B004`: `KVT-P0010`; `KFXT-001`; target `4010`
- `KVT-B005`: `KVT-P0011`; `KFXT-012`; target `1220/1240/1250`
- `KVT-C001`: `KVT-P0012`; `KFXT-002`; field 48 `ja eller delvis`
- `KVT-C002`: `KVT-P0013`; `KFXT-003`; field 48 `ja`
- `KVT-C003`: `KVT-P0039`; `KFXT-008`; field 48 `split`
- `KVT-C004`: `KVT-P0021`; `KFXT-009`; field 48 `nej`
- `KVT-D001`: `KVT-P0014`; `KFXT-001`; field 48 `ja när verksamhetskoppling finns`
- `KVT-D002`: `KVT-P0015`; `KFXT-005`; field 48 `nej`
- `KVT-D003`: `KVT-P0016`; `KFXT-007`; field 48 `delvis eller ja enligt policy`
- `KVT-D004`: blocked; `KFXT-011`; downstream `travel/payroll`
- `KVT-D005`: `KVT-P0035`; `KFXT-012`; field 48 `nej`
- `KVT-D006`: blocked to AP/asset
- `KVT-E001`: `KVT-P0018`; `KFXT-006`; field 48 `delvis`
- `KVT-E002`: `KVT-P0019`; `KFXT-006`; field 48 `delvis`
- `KVT-E003`: blocked
- `KVT-E004`: `KVT-P0037`; `KFXT-006`; field 48 `delvis`
- `KVT-E005`: blocked to payroll/benefits
- `KVT-F001`: underliggande `KVT-Pxxxx`; payment `1910`
- `KVT-F002`: underliggande `KVT-Pxxxx`; payment `1930`
- `KVT-F003`: underliggande `KVT-Pxxxx`; payment `2890`
- `KVT-F004`: blocked to outlay
- `KVT-F005`: `KVT-P0031`; original electronic retained
- `KVT-F006`: `KVT-P0032`; original paper retention rule
- `KVT-F007`: `KVT-P0033`; blocked
- `KVT-F008`: `KVT-P0034`; field 48 `nej eller blocked`
- `KVT-G001`: `KVT-P0026`; reverse original
- `KVT-G002`: `KVT-P0027`; reverse original
- `KVT-G003`: `KVT-P0028`; reverse duplicate
- `KVT-G004`: `KVT-P0029`; target correction only
- `KVT-G005`: `KVT-P0030`; VAT correction only
- `KVT-H001`: `KVT-P0021`; field 48 `nej`
- `KVT-H002`: `KVT-P0022`; field 48 `nej`
- `KVT-H003`: blocked to AP/import
- `KVT-H004`: `KVT-P0040`; field 48 `nej`
- `KVT-I001`: `KVT-P0041`; downstream `payroll/benefit`
- `KVT-I002`: `KVT-P0041`; downstream `benefit/outlay`
- `KVT-I003`: `KVT-P0041`; downstream `benefit`
- `KVT-I004`: `KVT-P0041`; downstream `benefit/payroll`
- `KVT-I005`: `KVT-P0041` eller underliggande `KVT-Pxxxx`; blocker tills privatnytta utretts
- `KVT-I006`: `KVT-P0041` eller underliggande `KVT-Pxxxx`; blocker tills privatnytta utretts
- `KVT-I007`: `KVT-P0041`; downstream `benefit/payroll`
- `KVT-I008`: `KVT-P0043`; downstream `ap_flow`
- `KVT-I009`: `KVT-P0042`; downstream `outlay_flow`
- `KVT-I010`: `KVT-P0044`; downstream `owner_private_flow`
- `KVT-I011`: `KVT-P0045`; downstream `blocked_unknown`

## Bindande testkrav

- varje `KVT-*` scenariofamilj ska ha minst ett integrationstest
- varje `KVT-*` scenariofamilj som paverkar moms ska ha assertions på:
  - target account
  - `2641` yes/no
  - field `48`
  - export effect
- duplicate detection ska ha egna tester
- representation ska ha egna tester för:
  - under cap
  - över cap
  - missing participants
  - missing purpose
  - mixed food/alcohol
- personbil ska ha egna tester för:
  - driftkostnad
  - private car
  - purchase blocked
  - no-VAT toll/congestion
- hotel split ska ha tester för:
  - room only
  - room plus breakfast
  - foreign hotel
- employee-private-payment ska alltid ha blocker test
- payment-proof-only ska alltid ha blocker test
- correction tests ska bevisa replayable reversal and no double counting
- payroll/benefit-risk ska ha egna tester för:
  - kostforman
  - friskvard/personAvard
  - gava
  - sjukvard
  - drivmedelsforman risk
- mixed-use equipment ska ha egna tester för:
  - arbetsklader kontra privata klader
  - mobil/internet/hemarbetsutrustning
- unknown scenario ska alltid ha blocker test som bevisar `blocked_unknown_scenario`

## Källor som styr dokumentet

- [Skatteverket: Momslagens regler om fakturering](https://skatteverket.se/foretag/moms/saljavarorochtjanster/momslagensregleromfakturering.4.58d555751259e4d66168000403.html)
- [Skatteverket: Kopa varor och tjänster](https://www.skatteverket.se/foretag/moms/kopavarorochtjanster.4.18e1b10334ebe8bc80005374.html)
- [Skatteverket: Kopa varor eller tjänster till företaget](https://www.skatteverket.se/foretag/moms/kopavarorochtjanster/kopavarorellertjanstertillforetaget.4.7459477810df5bccdd480005156.html)
- [Skatteverket: Avdrag för moms vid representation](https://www.skatteverket.se/foretag/moms/kopavarorochtjanster/representation.4.15532c7b1442f256baec84b.html)
- [Skatteverket: Bokföring, bokslut och deklaration (SKV 282)](https://skatteverket.se/download/18.9567cda19bf6c0027216f6/1770379535285/bokforing-bokslut-och-deklaration-skv282utgava09.pdf)
- [Bokföringsnamnden: Brevsvar 2017-03-20 om verifikationer när anställda betalar](https://www.bfn.se/wp-content/uploads/2020/06/brevsvar-verifikationer-nar-anstallda-betalar.pdf)
- [Skatteverket: Bilar, bussar och motorcyklar, avsnitt 24](https://www.skatteverket.se/download/18.18e1b10334ebe8bc8000114469/kap24.pdf)
- [Skatteverket: Traktamenten och ändra kostnadsersättningar, SKV 354](https://www.skatteverket.se/download/18.7da1d2e118be03f8e4f36f2/1708607303743/traktamenten-och-andra-kostnadsersattningar-skv354-utgava-34.pdf)
- [Skatteverket: Kostforman](https://www.skatteverket.se/foretag/arbetsgivare/lonochersattning/formaner/kostforman.4.3016b5d91791bf546791816.html)
- [Skatteverket: Personalvard, motion och friskvard](https://www.skatteverket.se/privat/skatter/arbeteochinkomst/formaner/personalvardmotionochfriskvard.4.7459477810df5bccdd4800014540.html)
- [Skatteverket: Gavor](https://www.skatteverket.se/privat/skatter/arbeteochinkomst/formaner/gavor.4.7459477810df5bccdd4800014379.html)
- [Skatteverket: Arbetsredskap](https://www.skatteverket.se/foretag/arbetsgivare/lonochersattning/formaner/arbetsredskap.4.3016b5d91791bf546791ad4.html)
- [Skatteverket: Arbetsklader](https://skatteverket.se/privat/skatter/arbeteochinkomst/formaner/arbetsklader.4.7459477810df5bccdd480008466.html)
- [Kontoplan BAS 2025](https://www.bas.se/wp-content/uploads/2025/01/Kontoplan-BAS-2025.pdf)


