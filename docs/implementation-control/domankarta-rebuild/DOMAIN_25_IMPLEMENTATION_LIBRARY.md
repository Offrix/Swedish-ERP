# DOMAIN_25_IMPLEMENTATION_LIBRARY

## mål

Fas 25 ska bygga en riktig commerce-channel-kärna för POS, e-handel, marketplace och omnichannel så att säljkanalen blir first-class och inte bara ett downstream-resultat i ÄR eller inventory.

## Fas 25

### Delfas 25.1 sales-channel / catalog / route truth

- bygg:
  - `SalesChannel`
  - `ChannelCatalog`
  - `ChannelAvailability`
  - `ChannelCustomerLink`
- state machines:
  - `SalesChannel: draft -> active | paused | archived`
- commands:
  - `createSalesChannel`
  - `publishChannelCatalog`
  - `setChannelAvailability`
- invariants:
  - channel truth måste vara egen object family
  - canonical route family är `/v1/commerce/*`
- tester:
  - sales channel lifecycle
  - route truth suite

### Delfas 25.2 POS session / checkout / receipt hardening

- bygg:
  - `PosSession`
  - `PosCart`
  - `StoreReceipt`
  - `CashDrawerEvent`
  - `CashierAssignment`
- commands:
  - `openPosSession`
  - `addPosCartLine`
  - `checkoutPosCart`
  - `closePosSession`
- invariants:
  - cashier, device, session och receipt måste vara explicit
  - receipt får inte kunna skrivas om tyst efter checkout
- tester:
  - POS checkout tests
  - session close balancing tests

### Delfas 25.3 ecommerce / marketplace order capture hardening

- bygg:
  - `ChannelOrder`
  - `ChannelOrderImportReceipt`
  - `ChannelCustomerIdentity`
  - `ChannelPaymentReference`
- commands:
  - `ingestChannelOrder`
  - `dedupeChannelOrder`
  - `linkChannelOrderToCommercialOrder`
- invariants:
  - channel order capture måste bära source channel, source order id, payment ref och customer mapping
  - channel orders får inte skapa egna tysta customer truths
- tester:
  - order dedupe tests
  - payment reference lineage tests

### Delfas 25.4 omnichannel inventory / allocation / sync hardening

- bygg:
  - `ChannelInventorySnapshot`
  - `ChannelAllocationDecision`
  - `ChannelSyncReceipt`
  - `OversellConflict`
- commands:
  - `materializeChannelInventorySnapshot`
  - `allocateChannelOrderInventory`
  - `syncChannelInventory`
- invariants:
  - channel stock får bara härledas från supply core
  - oversell och stale sync måste vara first-class blockerare
- officiella källor:
  - [Shopify: POS inventory management](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/inventory-management/stocky/pos-inventory-management)
  - [Shopify: Product inventory tracking](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/inventory-management/products)
- tester:
  - inventory sync tests
  - oversell conflict tests

### Delfas 25.5 pickup / ship-from-store / store-fulfillment hardening

- bygg:
  - `PickupRequest`
  - `ShipFromStoreDecision`
  - `StoreFulfillmentOrder`
  - `CollectionReceipt`
- commands:
  - `requestPickup`
  - `approveShipFromStore`
  - `completeCollection`
- invariants:
  - pickup och ship-from-store måste vara explicit kopplade till reservation, fulfillment och customer identity
- officiella källor:
  - [Shopify: Pickup in store för online orders](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/order-management/pickup-in-store-for-online-orders)
- tester:
  - pickup readiness tests
  - ship-from-store tests

### Delfas 25.6 return / exchange / store-credit hardening

- bygg:
  - `ChannelReturn`
  - `ExchangeDecision`
  - `StoreCredit`
  - `RefundDecision`
- commands:
  - `openChannelReturn`
  - `decideExchange`
  - `issueStoreCredit`
  - `issueChannelRefund`
- invariants:
  - returns och exchanges måste påverka inventory, payment och channel/customer truth deterministiskt
  - store credit får inte vara fri manuell balans
- tester:
  - return/exchange tests
  - store-credit lifecycle tests

### Delfas 25.7 channel pricing / promo / tax hardening

- bygg:
  - `ChannelPricingProfile`
  - `PromotionRule`
  - `ChannelTaxProfile`
  - `PricePublicationReceipt`
- commands:
  - `publishChannelPricingProfile`
  - `publishPromotionRule`
  - `publishChannelTaxProfile`
- invariants:
  - channel price och promo får inte driva från commercial core utan explicit publication
  - channel tax profile måste vara first-class där regler kräver det
- tester:
  - channel pricing tests
  - promotion eligibility tests

### Delfas 25.8 doc / runbook / legacy purge

- bygg:
  - `CommerceDocTruthDecision`
  - `CommerceLegacyArchiveReceipt`
  - `CommerceRunbookExecution`
- dokumentbeslut:
  - create: `docs/runbooks/pos-operations.md`
  - create: `docs/runbooks/channel-order-sync.md`
  - create: `docs/runbooks/channel-returns-and-exchanges.md`
- invariants:
  - inga ÄR- eller inventory-docs får fortsätta låtsas att channel core redan finns
- tester:
  - docs truth lint
  - runbook existence lint
