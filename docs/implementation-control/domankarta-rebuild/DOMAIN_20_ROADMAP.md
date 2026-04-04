# DOMAIN_20_ROADMAP

## mål

Göra Domän 20 till företagets verkliga supply- och inventory-kärna så att inköp, artiklar, lager, fulfillment och returer kan drivas utan externt lagersystem.

## varför domänen behövs

Utan denna domän fungerar plattformen bara för rena tjänsteflöden. Handel, service med material, installation, grossist och lagerdrivna bolag måste annars fortfarande ha separata system för:
- artiklar
- inköp
- lager
- leverans
- retur
- kostlager

## faser

- Fas 20.1 item master / SKU / route truth
- Fas 20.2 procurement request / PO / approval hardening
- Fas 20.3 receipt / putaway / 3-way-match hardening
- Fas 20.4 inventory ledger / reservation / transfer / count hardening
- Fas 20.5 fulfillment / shipment / return / RMA hardening
- Fas 20.6 valuation / cost layer / ledger bridge hardening
- Fas 20.7 replenishment / supplier catalog / reorder hardening
- Fas 20.8 doc / runbook / legacy purge

## dependencies

- `INKOP_VARUMOTTAG_OCH_LEVERANSMATCHNING_BINDANDE_SANNING.md` äger procurement request, PO, supplier commitment, goods receipt, ownership acceptance och 2-way/3-way match.
- `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md` äger inventory ownership, valuation method, count, inkurans, stock adjustments och carrying value.
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` äger vouchers, seriepolicy och period locks när inventory slar mot huvudbok.
- Domän 5 för ÄR-items och downstream billing-koppling.
- Domän 6 för AP, leverantörer och betalningskoppling.
- Domän 10 och 19 för materialbehov i projekt och delivery.
- Domän 18 för commercial orders.
- Domän 25 för POS, e-handel och channel inventory.

## vad som får köras parallellt

- 20.2 och 20.4 kan köras parallellt när item master är låst.
- 20.5 kan köras parallellt med 20.6 efter att inventory ledger finns.
- 20.7 kan påbörjas när item master och receipts finns.

## vad som inte får köras parallellt

- 20.2 får inte markeras klar före 20.1.
- 20.3 får inte markeras klar före 20.2.
- 20.4 får inte markeras klar före 20.1 och 20.3.
- 20.5 får inte markeras klar före 20.4.
- 20.6 får inte markeras klar före 20.4 och 20.5.

## exit gates

- item master är canonical truth över alla varu- och materialflöden
- inventory ledger bär on hand, reserved, in transit, committed och consumed deterministiskt
- receipts, transfers, fulfillment och returns är first-class receipts
- valuation och COGS kan härledas från cost layers till ledgern

## test gates

- item-master- och varianttester
- PO/receipt/3-way-match-tester
- reservation/transfer/inventory-count-tester
- fulfillment/return/RMA-tester
- cost-layer- och ledger-bridge-tester

## delfaser

### Delfas 20.1 item master / SKU / route truth
- [ ] bygg `ItemMaster`, `SkuVariant`, `InventoryLocation`, `InventoryUnitProfile`, `ItemLifecycleDecision`
- [ ] skapa canonical route family `/v1/supply/*`
- [ ] flytta artikelsanning ur split mellan ÄR, AP och field
- [ ] verifiera route truth lint och canonical item lookup

### Delfas 20.2 procurement request / PO / approval hardening
- [ ] bygg `ProcurementRequest`, `PurchaseOrder`, `PurchaseOrderApproval`, `SupplierCommitmentReceipt`
- [ ] gör inköpsbehov, beställning och godkännande first-class
- [ ] underordna request, PO, approval, supplier commitment och route profiles under `INKOP_VARUMOTTAG_OCH_LEVERANSMATCHNING_BINDANDE_SANNING.md`
- [ ] bind inköp till item master, behovssignal och approval policy
- [ ] verifiera request-to-PO lineage och approval gates

### Delfas 20.3 receipt / putaway / 3-way-match hardening
- [ ] bygg `GoodsReceipt`, `PutawayDecision`, `ReceiptVariance`, `ThreeWayMatchDecision`
- [ ] skilj mottag, leveransavvikelse och AP-matchning i separata receipts
- [ ] underordna ownership acceptance, tolerance, duplicate receipt blocking, service 2-way profile och stock 3-way gate under `INKOP_VARUMOTTAG_OCH_LEVERANSMATCHNING_BINDANDE_SANNING.md`
- [ ] blockera bokning av receipt utanför tolerans utan review
- [ ] verifiera partial receipt, variance och 3-way-match

### Delfas 20.4 inventory ledger / reservation / transfer / count hardening
- [ ] bygg `InventoryLedgerEntry`, `InventoryReservation`, `InventoryTransfer`, `InventoryCountSession`, `InventoryAdjustmentReceipt`
- [ ] gör lagerbok first-class och replaybar
- [ ] underordna quantity ownership, valuation method, count blockers, write-downs och carrying-value-truth under `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md`
- [ ] stöd multi-location, reservation och internförflyttning
- [ ] verifiera stock math, count lock och adjustment lineage

### Delfas 20.5 fulfillment / shipment / return / RMA hardening
- [ ] bygg `FulfillmentOrder`, `Shipment`, `ReturnOrder`, `RmaCase`, `StorePickupDecision`
- [ ] gör leverans och retur till first-class runtime
- [ ] bind returns till order, receipt, reason och inventory disposition
- [ ] verifiera partial shipment, return receipt och RMA close

### Delfas 20.6 valuation / cost layer / ledger bridge hardening
- [ ] bygg `InventoryCostLayer`, `CostingMethodDecision`, `CogsPostingReceipt`, `InventoryValuationSnapshot`
- [ ] lås hur receipt, transfer, fulfillment och return påverkar kostlager och ledger
- [ ] underordna FIFO, weighted average, specific identification, fixed quantity constant value, inkurans, NRV-cap och blocked LIFO under `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md`
- [ ] blockera osäker lagerkostnad i live path
- [ ] verifiera cost-layer math och ledger bridge

### Delfas 20.7 replenishment / supplier catalog / reorder hardening
- [ ] bygg `ReorderPolicy`, `ReplenishmentSuggestion`, `SupplierCatalog`, `SupplierPriceAgreement`
- [ ] stöd lead time, min/max, reorder point och supplier catalog
- [ ] förhindra att procurement request skapas utan item- eller supplier-basis
- [ ] verifiera reorder generation och supplier price selection

### Delfas 20.8 doc / runbook / legacy purge
- [ ] skriv explicit keep/rewrite/archive/remove-beslut för AP- och field-inventory-docs
- [ ] skapa canonical runbooks för procurement, warehouse ops, fulfillment och returns
- [ ] håll AP och field som consumers av supply core i stället för ersättare för den
- [ ] verifiera docs truth lint och legacy archive receipts
