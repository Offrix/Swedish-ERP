# DOMAIN_20_IMPLEMENTATION_LIBRARY

## mål

Fas 20 ska bygga en sammanhållen supply- och inventory-kärna som kan bära inköp, lager, leverans, retur och lagerkostnad utan att AP eller field tvingas vara ersättare för sanningen.

## bindande tvärdomänsunderlag

- `INKOP_VARUMOTTAG_OCH_LEVERANSMATCHNING_BINDANDE_SANNING.md` äger procurement request, PO, supplier commitment, goods receipt, ownership acceptance och 2-way/3-way match.
- `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md` äger inventory ownership, valuation method, count sessions, inkurans, varukostnad, stock adjustments och carrying value.
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` äger voucher materialization, seriepolicy, locked periods och SIE4-export.

## Fas 20

### Delfas 20.1 item master / SKU / route truth

- bygg:
  - `ItemMaster`
  - `SkuVariant`
  - `InventoryLocation`
  - `InventoryUnitProfile`
  - `ItemLifecycleDecision`
- commands:
  - `createItemMaster`
  - `createSkuVariant`
  - `createInventoryLocation`
  - `transitionItemLifecycle`
- invariants:
  - samma item-id måste kunna användas av commercial, procurement, inventory och delivery
  - tjänsteartikel, materialartikel och lagervara är olika typer i samma item master
  - canonical route family är `/v1/supply/*`
- tester:
  - canonical item lookup suite
  - route truth suite

### Delfas 20.2 procurement request / PO / approval hardening

- bygg:
  - `ProcurementRequest`
  - `PurchaseOrder`
  - `PurchaseOrderApproval`
  - `SupplierCommitmentReceipt`
- state machines:
  - `ProcurementRequest: draft -> requested -> approved | rejected -> converted`
  - `PurchaseOrder: draft -> approved -> sent -> partially_received | received | closed | cancelled`
- commands:
  - `createProcurementRequest`
  - `approveProcurementRequest`
  - `createPurchaseOrderFromRequest`
  - `approvePurchaseOrder`
- invariants:
  - PO måste kunna härledas till behov eller explicit manual justification
  - approval policy måste vara first-class
  - request, PO, supplier commitment och route profiles styrs av `INKOP_VARUMOTTAG_OCH_LEVERANSMATCHNING_BINDANDE_SANNING.md`
- tester:
  - procurement-to-po lineage
  - approval enforcement

### Delfas 20.3 receipt / putaway / 3-way-match hardening

- bygg:
  - `GoodsReceipt`
  - `ReceiptLine`
  - `PutawayDecision`
  - `ReceiptVariance`
  - `ThreeWayMatchDecision`
- commands:
  - `recordGoodsReceipt`
  - `completePutaway`
  - `recordThreeWayMatchDecision`
- invariants:
  - mottag, putaway och matchning är separata steg
  - partial receipts och restorder måste vara first-class
  - ownership acceptance, tolerance, duplicate receipt blocking, service 2-way profile och stock 3-way gate styrs av `INKOP_VARUMOTTAG_OCH_LEVERANSMATCHNING_BINDANDE_SANNING.md`
  - avvikelse kräver explicit receipt-variance receipt
- tester:
  - partial receipt tests
  - variance and 3-way-match tests

### Delfas 20.4 inventory ledger / reservation / transfer / count hardening

- bygg:
  - `InventoryLedgerEntry`
  - `InventoryReservation`
  - `InventoryTransfer`
  - `InventoryCountSession`
  - `InventoryAdjustmentReceipt`
- commands:
  - `reserveInventory`
  - `transferInventory`
  - `startInventoryCountSession`
  - `postInventoryAdjustment`
- invariants:
  - ledgern är den enda sanningen för lageräntal
  - on hand, reserved, committed, in transit och consumed ska vara härledbara från ledger entries
  - ownership profile, valuation method, count blockers och negative-stock-förbud styrs av `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md`
  - inventory count kräver lås eller definierad conflict policy
- tester:
  - stock math tests
  - reservation/transfer tests
  - count adjustment tests

### Delfas 20.5 fulfillment / shipment / return / RMA hardening

- bygg:
  - `FulfillmentOrder`
  - `Shipment`
  - `ReturnOrder`
  - `RmaCase`
  - `StorePickupDecision`
- commands:
  - `createFulfillmentOrder`
  - `shipFulfillmentOrder`
  - `recordStorePickup`
  - `openRmaCase`
  - `receiveReturnOrder`
- invariants:
  - fulfillment måste kunna härledas till commercial order eller service demand
  - returns kräver disposition, reason och lagerpåverkan
- officiella källor:
  - [Shopify: POS inventory management](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/inventory-management/stocky/pos-inventory-management)
  - [Shopify: Pickup in store för online orders](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/order-management/pickup-in-store-for-online-orders)
- tester:
  - shipment tests
  - pickup tests
  - return and RMA tests

### Delfas 20.6 valuation / cost layer / ledger bridge hardening

- bygg:
  - `InventoryCostLayer`
  - `CostingMethodDecision`
  - `CogsPostingReceipt`
  - `InventoryValuationSnapshot`
- commands:
  - `createInventoryCostLayer`
  - `materializeInventoryValuationSnapshot`
  - `postInventoryCogsReceipt`
- invariants:
  - varje receipt som ändrar värde måste skriva cost layer
  - fulfillment och return måste kunna spåra exakt kostbas
  - FIFO, weighted average, specific identification, fixed quantity constant value, inkurans, NRV-cap och blocked LIFO styrs av `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md`
  - ledger posting får inte ske utan cost-layer lineage
- tester:
  - cost layer calculation tests
  - ledger bridge tests

### Delfas 20.7 replenishment / supplier catalog / reorder hardening

- bygg:
  - `ReorderPolicy`
  - `ReplenishmentSuggestion`
  - `SupplierCatalog`
  - `SupplierPriceAgreement`
- commands:
  - `upsertReorderPolicy`
  - `generateReplenishmentSuggestions`
  - `publishSupplierCatalog`
- invariants:
  - reorder ska bygga på item master, demand signal, lead time och inventory state
  - supplier catalog får inte vara fria prislistor utan lineage
- officiella källor:
  - [Shopify: Purchase orders in Stocky](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/inventory-management/stocky/inventory-management/purchase-orders)
- tester:
  - reorder generation tests
  - supplier price selection tests

### Delfas 20.8 doc / runbook / legacy purge

- bygg:
  - `SupplyDocTruthDecision`
  - `SupplyLegacyArchiveReceipt`
  - `SupplyRunbookExecution`
- dokumentbeslut:
  - rewrite: `docs/compliance/se/ap-supplier-invoice-engine.md`
  - rewrite: AP-centrerade mottags- och inköpsbeskrivningar som idag översäljer supply-kärnan
  - harden: field inventory-relaterade verifieringsdocs så de blir consumer docs
  - create: `docs/runbooks/procurement-operations.md`
  - create: `docs/runbooks/warehouse-operations.md`
  - create: `docs/runbooks/fulfillment-and-returns.md`
- invariants:
  - AP och field får inte fortsätta säljas in som supply-kärna
- tester:
  - docs truth lint
  - runbook existence lint
