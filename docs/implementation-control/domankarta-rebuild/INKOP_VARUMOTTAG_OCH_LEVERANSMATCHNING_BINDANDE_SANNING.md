# INKÖP_VARUMOTTAG_OCH_LEVERANSMATCHNING_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för hela flödet för inköpsbehov, purchase orders, supplier commitments, varumottag, putaway, leveransavvikelser, ownership acceptance och 2-way/3-way match.

Detta dokument ska styra:
- inköpsbehov och procurement request
- purchase order och supplier commitment
- goods receipt och putaway
- ownership acceptance
- quantity-, price- och amount variance
- 2-way match för uttryckligt tillåtna tjänsteprofiler
- 3-way match för stock- och receipt-drivna profiler
- routing till inventory, AP, asset eller blocked review

Ingen PO-screen, ingen receipt-import, ingen AP-ingest, ingen supplier portal och ingen inventory movement får definiera avvikande truth för purchase receipt och matching utan att detta dokument skrivs om först.

## Syfte

Detta dokument finns för att läsaren ska kunna bygga inköp, varumottag och leveransmatchning utan att gissa:
- när ett inköpsbehov blir request, PO och supplier commitment
- när ett mottag får accepteras som owned receipt
- när ett dokument ska vidare till inventory, AP, asset eller blocked review
- när 3-way match måste passera innan AP-open-item får slappas igenom
- vilka avvikelser som får tolereras och vilka som måste blockeras
- hur non-stock, service, dropship och consignment ska skiljas från vanligt lagermottag

## Omfattning

Detta dokument omfattar:
- `ProcurementRequest`
- `PurchaseOrder`
- `PurchaseOrderApproval`
- `SupplierOrderConfirmation`
- `GoodsReceipt`
- `PutawayDecision`
- `ReceiptVariance`
- `OwnershipAcceptanceDecision`
- `ThreeWayMatchDecision`
- `ReturnToVendorDecision`
- routing av purchases till inventory, AP, asset eller blocked review

Detta dokument omfattar inte:
- slutlig AP-posting, supplier open item, purchase-side moms eller supplier settlement
- slutlig inventory valuation och carrying value
- fakturainnehåll på leverantörens dokument utover vilka faltsignaler vi måste kunna verifiera
- lease accounting, customs debt eller importmoms i sig

Kanonisk agarskapsregel:
- detta dokument äger PO, receipt, ownership acceptance och match-truth
- `LEVFAKTURAFLODET_BINDANDE_SANNING.md` äger supplier invoice coding, purchase-side moms och skapandet av AP-open-items efter passad match-gate
- `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md` äger quantity ownership efter accepted owned receipt samt carrying value och valuation method
- `ANLAGGNINGSTILLGANGAR_OCH_AVSKRIVNINGAR_BINDANDE_SANNING.md` äger fixed-asset route efter capitalization decision

## Absoluta principer

- stock receipt får aldrig bokas som owned inventory utan explicit ownership acceptance
- supplier invoice får aldrig ensam skapa owned stock
- duplicate goods receipt är förbjuden
- stock purchase profile får aldrig tillatas passera till AP-open-item utan match mot receipt eller uttryckligt blockerbeslut
- service profile får bara fa 2-way match om policy uttryckligen tillater det
- vendor-owned consignment får aldrig bli owned inventory i detta flöde
- dropship får aldrig skapa owned inventory i detta flöde
- över receipt utan tolerance eller review är förbjuden
- damaged receipt får aldrig tyst ga till owned stock utan disposition decision
- non-stock route får aldrig skapa inventory movement
- asset candidate får aldrig stanna i vanlig expense- eller stockroute utan explicit routing decision

## Bindande dokumenthierarki för inköp, varumottag och leveransmatchning

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- detta dokument
- Sveriges riksdag: bokföringslag och årsredovisningslag
- Bokföringsnamndens vägledning Bokföring
- Skatteverkets faktureringsregler för inkommande fakturakrav där det paverkar matchbarhet

Detta dokument lutar på:
- `LEVFAKTURAFLODET_BINDANDE_SANNING.md`
- `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md`
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md`
- `DOMAIN_20_ROADMAP.md`
- `DOMAIN_20_IMPLEMENTATION_LIBRARY.md`

Detta dokument får inte overstyras av:
- gamla AP-docs som låter supplier invoice skapa stock ownership utan receipt
- gamla warehouse-rutiner som låter mottag ske utan immutable receipt
- gamla integrationsjobb som låter invoice-first auto-match slappa igenom lager

## Kanoniska objekt

- `ProcurementRequest`
  - behovsobjekt före PO

- `PurchaseOrder`
  - legal och operativt bestallningsobjekt

- `PurchaseOrderLine`
  - specifik rad med quantity, expected price, item profile och route profile

- `SupplierOrderConfirmation`
  - supplier commitment receipt

- `GoodsReceipt`
  - immutable mottagsobjekt

- `PutawayDecision`
  - explicit beslut om var mottaget gods placeras och när det blir tillgangligt

- `ReceiptVariance`
  - quantity-, price-, amount- eller quality-avvikelse

- `OwnershipAcceptanceDecision`
  - explicit beslut om mottag ska bli owned, vendor-owned, customer-owned eller blocked

- `ThreeWayMatchDecision`
  - explicit match mellan PO, receipt och supplier invoice

- `NonStockRoutingDecision`
  - route till AP-expense, asset candidate, utlägg blocker eller annan downstream owner

- `ReturnToVendorDecision`
  - styr retur till leverantör efter mottag

## Kanoniska state machines

### `ProcurementRequest`

- `draft`
- `requested`
- `approved`
- `rejected`
- `converted`

### `PurchaseOrder`

- `draft`
- `approved`
- `sent`
- `partially_confirmed`
- `confirmed`
- `partially_received`
- `received`
- `closed`
- `cancelled`

### `GoodsReceipt`

- `draft`
- `received`
- `quality_hold`
- `accepted`
- `rejected`
- `returned_to_vendor`

### `ThreeWayMatchDecision`

- `pending`
- `passed`
- `review_required`
- `blocked`
- `released_after_review`

## Kanoniska commands

- `CreateProcurementRequest`
- `ApproveProcurementRequest`
- `CreatePurchaseOrder`
- `ApprovePurchaseOrder`
- `RecordSupplierOrderConfirmation`
- `RecordGoodsReceipt`
- `ApproveOwnershipAcceptance`
- `RecordReceiptVariance`
- `ApprovePutawayDecision`
- `RunThreeWayMatch`
- `ApproveMatchOverride`
- `CreateReturnToVendorDecision`

## Kanoniska events

- `ProcurementRequestApproved`
- `PurchaseOrderApproved`
- `SupplierOrderConfirmed`
- `GoodsReceiptRecorded`
- `OwnershipAccepted`
- `ReceiptVarianceRecorded`
- `PutawayApproved`
- `ThreeWayMatchPassed`
- `ThreeWayMatchBlocked`
- `ReturnToVendorApproved`

## Kanoniska route-familjer

- `/v1/supply/procurement-requests/*`
- `/v1/supply/purchase-orders/*`
- `/v1/supply/supplier-confirmations/*`
- `/v1/supply/goods-receipts/*`
- `/v1/supply/putaway/*`
- `/v1/supply/receipt-variances/*`
- `/v1/supply/match-decisions/*`
- `/v1/supply/returns-to-vendor/*`

Folkjande får inte skriva legal truth:
- receipt preview
- OCR extraction
- inbox triage
- AP coding draft
- warehouse UI-local cache

## Kanoniska permissions och review boundaries

- `procurement.read`
- `procurement.manage`
- `procurement.approve`
- `procurement.receive`
- `procurement.match_review`
- `procurement.high_risk_override`

Support/backoffice:
- får läsa
- får inte godkänna ownership acceptance eller match override

## Nummer-, serie-, referens- och identitetsregler

- varje `PurchaseOrder` ska ha unik `po_id`
- varje `PurchaseOrderLine` ska ha unik `po_line_id`
- varje `GoodsReceipt` ska ha unik `goods_receipt_id`
- varje mottagen rad ska ha `goods_receipt_line_id`
- varje supplier reference får bara kopplas en gang till samma PO line om inte explicit split tillats
- duplicate receipt detection ska bygga på leverantör, referens, datum, item, quantity och binary/document fingerprint där dokument finns

## Valuta-, avrundnings- och omräkningsregler

- PO får ligga i supplier currency
- receipt quantity är alltid quantity-truth, inte valutatruth
- 3-way match price comparison ska kunna jamfora PO, invoice och receipt i canonical comparison currency
- upstream kursomrakning får inte flyta fritt mellan AP och procurement; comparison snapshot måste sparas

## Replay-, correction-, recovery- och cutover-regler

- replay måste kunna återskapa request, PO, receipt, variance och match verdict
- mottag får aldrig overwriteas; korrektion ska ske via ny variance, new receipt eller return-to-vendor
- cutover måste frysa:
  - open PO
  - confirmed-but-not-received quantity
  - received-but-not-invoiced quantity
  - invoice-before-receipt holds
- recovery måste kunna återskapa match status per line

## Huvudflödet

1. behov skapar `ProcurementRequest`
2. request godkänns eller avvisas
3. request konverteras till `PurchaseOrder`
4. supplier confirmation registreras om tillämpligt
5. goods receipt registreras
6. ownership acceptance avgor om mottaget gods är owned, blocked eller icke-owned
7. putaway godkänner tillganglighet
8. supplier invoice kommer in och klassas i AP-flödet
9. 2-way eller 3-way match kor
10. matchen slapper vidare till AP-open-item eller blockerar review

## Bindande scenarioaxlar

- purchase profile
  - `stock_goods`
  - `nonstock_goods`
  - `service_purchase`
  - `asset_candidate`
  - `dropship`
  - `vendor_owned_consignments`

- receipt status
  - `none`
  - `partial`
  - `full`
  - `damaged`
  - `rejected`

- match profile
  - `three_way_required`
  - `two_way_allowed`
  - `blocked_until_receipt`

- variance type
  - `none`
  - `quantity`
  - `price`
  - `amount`
  - `quality`

- ownership verdict
  - `owned`
  - `vendor_owned`
  - `customer_owned`
  - `blocked_unknown`

## Bindande policykartor

### Route policy per purchase profile

- `stock_goods`
  - receipt required
  - ownership acceptance required
  - `three_way_required`
  - downstream inventory owner

- `nonstock_goods`
  - receipt optional by policy
  - route to AP expense

- `service_purchase`
  - no inventory ownership
  - `two_way_allowed` only if explicit profile enabled

- `asset_candidate`
  - no expense finalization before asset routing decision
  - downstream owner `ANLAGGNINGSTILLGANGAR...`

- `dropship`
  - no owned inventory
  - AP allowed after document and commercial cross-link

- `vendor_owned_consignments`
  - no owned inventory
  - inventory route only as vendor-owned visibility

### Variance tolerance policy

- `quantity_variance`
  - tolerance percent or absolute unit policy required

- `price_variance`
  - tolerance amount or percent policy required

- `amount_variance`
  - document total tolerance required

- `quality_variance`
  - auto-pass forbidden

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `PUR-P0001` procurement request approved
  - state: request becomes `approved`
  - no_gl

- `PUR-P0002` purchase order approved
  - state: PO becomes `approved`
  - no_gl

- `PUR-P0003` stock goods receipt accepted owned
  - state:
    - `GoodsReceipt=accepted`
    - `OwnershipAcceptanceDecision=owned`
    - downstream owner `LAGER_VARUKOSTNAD...`
  - voucher owner: inventory bridge profile

- `PUR-P0004` stock goods partial receipt
  - state:
    - `GoodsReceipt=accepted`
    - PO remains `partially_received`
  - voucher owner: inventory bridge profile

- `PUR-P0005` över receipt within tolerance
  - state:
    - receipt accepted
    - `ReceiptVariance=recorded`
    - review may be skipped if policy allows

- `PUR-P0006` över receipt outside tolerance blocked
  - state:
    - `ReceiptVariance=recorded`
    - `GoodsReceipt=quality_hold`
    - `ThreeWayMatchDecision=blocked`

- `PUR-P0007` nonstock goods route to AP
  - state:
    - `NonStockRoutingDecision=ap_expense`
    - no inventory owner

- `PUR-P0008` service purchase two-way allowed
  - state:
    - `match_profile=two_way_allowed`
    - no inventory owner

- `PUR-P0009` asset candidate route
  - state:
    - `NonStockRoutingDecision=asset_candidate`
    - downstream owner `ANLAGGNINGSTILLGANGAR...`

- `PUR-P0010` vendor-owned consignment
  - state:
    - `OwnershipAcceptanceDecision=vendor_owned`
    - no owned inventory

- `PUR-P0011` dropship no inventory
  - state:
    - `purchase_profile=dropship`
    - no owned inventory

- `PUR-P0012` invoice before receipt hold
  - state:
    - `ThreeWayMatchDecision=blocked`
    - AP hold remains active

- `PUR-P0013` three-way match passed
  - state:
    - `ThreeWayMatchDecision=passed`
    - AP may create open item

- `PUR-P0014` price variance review required
  - state:
    - `ThreeWayMatchDecision=review_required`

- `PUR-P0015` quantity variance review required
  - state:
    - `ThreeWayMatchDecision=review_required`

- `PUR-P0016` duplicate goods receipt blocked
  - state:
    - blocked
    - no downstream owner

- `PUR-P0017` damaged receipt quality hold
  - state:
    - `GoodsReceipt=quality_hold`
    - no owned inventory until disposition

- `PUR-P0018` return to vendor
  - state:
    - `ReturnToVendorDecision=approved`
    - downstream corrections required

## Bindande rapport-, export- och myndighetsmappning

- procurement audit trail ska visa request -> PO -> receipt -> match -> AP release
- open PO report ska spegla remaining quantity
- received not invoiced report ska kunna byggas deterministiskt
- invoice before receipt hold report ska kunna byggas deterministiskt
- blocked receipts ska ingA i audit export

## Bindande scenariofamilj till proof-ledger och rapportspar

- `PUR-A001` approved procurement request -> `PUR-P0001`
- `PUR-A002` approved purchase order -> `PUR-P0002`
- `PUR-B001` full stock receipt accepted owned -> `PUR-P0003`
- `PUR-B002` partial stock receipt -> `PUR-P0004`
- `PUR-B003` över receipt within tolerance -> `PUR-P0005`
- `PUR-B004` över receipt blocked -> `PUR-P0006`
- `PUR-C001` nonstock route to AP -> `PUR-P0007`
- `PUR-C002` service purchase two-way -> `PUR-P0008`
- `PUR-C003` asset candidate routing -> `PUR-P0009`
- `PUR-C004` vendor-owned consignment -> `PUR-P0010`
- `PUR-C005` dropship no inventory -> `PUR-P0011`
- `PUR-D001` invoice before receipt hold -> `PUR-P0012`
- `PUR-D002` three-way match pass -> `PUR-P0013`
- `PUR-D003` price variance review -> `PUR-P0014`
- `PUR-D004` quantity variance review -> `PUR-P0015`
- `PUR-E001` duplicate receipt blocked -> `PUR-P0016`
- `PUR-E002` damaged receipt hold -> `PUR-P0017`
- `PUR-E003` return to vendor -> `PUR-P0018`

## Tvingande dokument- eller indataregler

- stock goods profile måste ha PO line, item, quantity, uom och supplier identity
- supplier invoice måste kunna knytas till PO line eller annan explicit manual justification
- receipt måste ha datum, mottagare, quantity, item och location
- quality-hold måste ha reason code
- return-to-vendor måste ha original receipt reference

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `RECEIPT_ACCEPTED`
- `RECEIPT_PARTIAL`
- `OVER_RECEIPT_WITHIN_TOLERANCE`
- `OVER_RECEIPT_REVIEW_REQUIRED`
- `INVOICE_BEFORE_RECEIPT_HOLD`
- `TWO_WAY_SERVICE_PROFILE`
- `NONSTOCK_ROUTE_TO_AP`
- `ASSET_ROUTE_REQUIRED`
- `CONSIGNMENT_NOT_OWNED`
- `DROPSHIP_NO_INVENTORY`
- `DUPLICATE_RECEIPT_BLOCK`
- `DAMAGED_RECEIPT_HOLD`
- `RETURN_TO_VENDOR`

## Bindande faltspec eller inputspec per profil

### stock_goods

- item id
- expected quantity
- uom
- supplier id
- po line ref
- receipt quantity
- location
- ownership verdict

### service_purchase

- supplier id
- po or contract ref
- service period or service description
- invoice amount
- explicit `two_way_allowed` policy ref

### asset_candidate

- supplier id
- item or asset descriptor
- capitalization candidate ref
- route decision

## Scenariofamiljer som hela systemet måste tacka

- request approved
- PO approved
- partial supplier confirmation
- partial receipt
- full receipt
- över receipt
- under receipt/backorder
- nonstock routing
- service 2-way match
- asset candidate route
- consignment not owned
- dropship no inventory
- invoice before receipt
- three-way match pass
- price variance review
- quantity variance review
- duplicate receipt
- damaged receipt
- return to vendor

## Scenarioregler per familj

- stock goods måste passera receipt och ownership acceptance innan AP release
- nonstock goods får inte skapa inventory owner
- service purchase får använda 2-way match bara om explicit policy aktiverats
- asset candidate får inte förbrukas som vanlig kostnad utan capitalization route decision
- damaged receipt får inte bli owned inventory utan disposition decision
- duplicate receipt får alltid blockeras
- över receipt får bara passera utan review inom explicit tolerance
- dropship får aldrig skapa owned inventory

## Blockerande valideringar

- supplier invoice without linkable PO or manual justification
- stock purchase without receipt when `three_way_required`
- unknown ownership verdict
- duplicate receipt fingerprint
- price variance outside tolerance without review
- quantity variance outside tolerance without review
- asset candidate without route decision
- service profile lacking explicit `two_way_allowed`

## Rapport- och exportkonsekvenser

- blocked match cases ska synas i AP hold reports
- accepted receipts ska synas i receiving and open commitment reports
- return-to-vendor ska synas i supplier claim and correction reports
- no_gl states ska fortfarande exporteras till audit/evidence packs

## Förbjudna förenklingar

- invoice-first stock recognition
- treating every supplier invoice as receipt evidence
- skipping PO för profiles that require approval and lineage
- auto-passing quality variance
- routing asset candidates directly to ordinary expense
- treating consignment as owned stock

## Fler bindande proof-ledger-regler för specialfall

- `PUR-P0019` under receipt backorder
  - state:
    - PO remains open
    - remaining quantity tracked

- `PUR-P0020` receipt before invoice allowed
  - state:
    - receipt accepted
    - AP hold remains pending invoice

- `PUR-P0021` manual match override after review
  - state:
    - `ThreeWayMatchDecision=released_after_review`
    - requires review evidence

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `PUR-P0001-P0002`
  - procurement pipeline state only

- `PUR-P0003-P0006`
  - receipt and ownership state

- `PUR-P0007-P0011`
  - downstream owner routing state

- `PUR-P0012-P0015`
  - AP release gate state

- `PUR-P0016-P0021`
  - block, hold, correction or override state

## Bindande verifikations-, serie- och exportregler

- detta dokument skapar normalt inte huvudboksverifikation i sig
- när downstream owner materialiserar voucher måste audit trail peka tillbaka till `po_id`, `goods_receipt_id` och `three_way_match_decision_id`
- blocked och no_gl cases ska exporteras i audit/evidence, inte i SIE4-vouchers

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- purchase profile
- receipt status
- match profile
- variance type
- ownership verdict
- domestic/eu/import profile only where downstream moms/AP profile requires it

## Bindande fixture-klasser för inköp, varumottag och leveransmatchning

- `PUR-FXT-001`
  - normal stock goods with PO, receipt and invoice

- `PUR-FXT-002`
  - partial receipt with remaining quantity

- `PUR-FXT-003`
  - service purchase 2-way

- `PUR-FXT-004`
  - asset candidate route

- `PUR-FXT-005`
  - damaged receipt and return to vendor

## Bindande expected outcome-format per scenario

- scenario id
- fixture class
- purchase profile
- receipt status
- ownership verdict
- match verdict
- downstream owner
- blocked reason if any
- voucher owner

## Bindande canonical verifikationsseriepolicy

- `none`
  - för state-only cases in this document

- `delegated`
  - voucher owner lies in AP, inventory or asset truth

## Bindande expected outcome per central scenariofamilj

- `PUR-B001`
  - fixture minimum: `PUR-FXT-001`
  - expected ownership verdict: `owned`
  - expected downstream owner: `LAGER_VARUKOSTNAD...`
  - expected proof: `PUR-P0003`

- `PUR-C002`
  - fixture minimum: `PUR-FXT-003`
  - expected match verdict: `two_way_allowed`
  - expected downstream owner: AP
  - expected proof: `PUR-P0008`

- `PUR-D001`
  - fixture minimum: `PUR-FXT-001`
  - expected match verdict: blocked
  - expected downstream owner: none
  - expected proof: `PUR-P0012`

- `PUR-E002`
  - fixture minimum: `PUR-FXT-005`
  - expected receipt status: `quality_hold`
  - expected downstream owner: none until disposition
  - expected proof: `PUR-P0017`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `PUR-A001` -> `PUR-P0001`
- `PUR-A002` -> `PUR-P0002`
- `PUR-B001` -> `PUR-P0003`
- `PUR-B002` -> `PUR-P0004`
- `PUR-B003` -> `PUR-P0005`
- `PUR-B004` -> `PUR-P0006`
- `PUR-C001` -> `PUR-P0007`
- `PUR-C002` -> `PUR-P0008`
- `PUR-C003` -> `PUR-P0009`
- `PUR-C004` -> `PUR-P0010`
- `PUR-C005` -> `PUR-P0011`
- `PUR-D001` -> `PUR-P0012`
- `PUR-D002` -> `PUR-P0013`
- `PUR-D003` -> `PUR-P0014`
- `PUR-D004` -> `PUR-P0015`
- `PUR-E001` -> `PUR-P0016`
- `PUR-E002` -> `PUR-P0017`
- `PUR-E003` -> `PUR-P0018`

## Bindande testkrav

- request-to-po lineage suite
- receipt ownership acceptance suite
- three-way match suite
- service 2-way suite
- duplicate receipt block suite
- damaged receipt hold suite
- asset candidate routing suite
- return-to-vendor suite

## Källor som styr dokumentet

- Sveriges riksdag: Bokföringslag (1999:1078)
- Sveriges riksdag: Årsredovisningslag (1995:1554)
- Bokföringsnamnden: Vägledning Bokföring
- Skatteverket: momslagens regler om fakturering
- BAS 2025 kontoplan

