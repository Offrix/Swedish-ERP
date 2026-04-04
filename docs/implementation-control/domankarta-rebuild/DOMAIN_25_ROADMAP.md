# DOMAIN_25_ROADMAP

## mål

Göra Domän 25 till företagets channel commerce-kärna så att butik, e-handel och omnikanalflöden kan drivas i plattformen utan separat POS- eller channel-system.

## varför domänen behövs

Utan denna domän fungerar plattformen dåligt för retail, showroom, butik med lager, e-handel och flerkanalsförsäljning. Kunden måste då ha separat kassa- och e-handelssanning.

## faser

- Fas 25.1 sales-channel / catalog / route truth
- Fas 25.2 POS session / checkout / receipt hardening
- Fas 25.3 ecommerce / marketplace order capture hardening
- Fas 25.4 omnichannel inventory / allocation / sync hardening
- Fas 25.5 pickup / ship-from-store / store-fulfillment hardening
- Fas 25.6 return / exchange / store-credit hardening
- Fas 25.7 channel pricing / promo / tax hardening
- Fas 25.8 doc / runbook / legacy purge

## dependencies

- Domän 18 för commercial pricing, contracts och customer truth.
- Domän 20 för inventory, fulfillment och returns-grund.
- Domän 21 för cashier/workbench/exceptions.
- Domän 22 för customer self-service och orderstatus.

## vad som får köras parallellt

- 25.2 och 25.3 kan köras parallellt när channel root är låst.
- 25.4 kan köras parallellt med 25.7 när item/channel mapping finns.
- 25.5 och 25.6 kan köras parallellt efter att order och inventory sync finns.

## vad som inte får köras parallellt

- 25.2 och 25.3 får inte markeras klara före 25.1.
- 25.4 får inte markeras klar före 25.1 och 25.3.
- 25.5 får inte markeras klar före 25.4.
- 25.6 får inte markeras klar före 25.2, 25.3 och 25.4.

## exit gates

- sales channels, POS sessions och channel orders är first-class
- omnichannel inventory sync och allocation är first-class
- pickup, ship-from-store, returns och exchanges är first-class runtime
- kanalvis pricing, promo och tax governance är first-class

## test gates

- POS checkout tests
- ecommerce/marketplace order ingest tests
- omnichannel inventory sync tests
- pickup/ship-from-store tests
- returns/exchange/store-credit tests
- channel pricing/promo/tax tests

## delfaser

### Delfas 25.1 sales-channel / catalog / route truth
- [ ] bygg `SalesChannel`, `ChannelCatalog`, `ChannelAvailability`, `ChannelCustomerLink`
- [ ] skapa canonical route family `/v1/commerce/*`
- [ ] gör kanaltruth first-class i stället för implicit downstream i ÄR/inventory
- [ ] verifiera route truth lint och channel lineage

### Delfas 25.2 POS session / checkout / receipt hardening
- [ ] bygg `PosSession`, `PosCart`, `StoreReceipt`, `CashDrawerEvent`, `CashierAssignment`
- [ ] gör kassapass, checkout och receipts first-class
- [ ] blockera osäkra kassakorrigeringar och tyst receipt-omskrivning
- [ ] verifiera session lifecycle, checkout och receipt integrity

### Delfas 25.3 ecommerce / marketplace order capture hardening
- [ ] bygg `ChannelOrder`, `ChannelOrderImportReceipt`, `ChannelCustomerIdentity`, `ChannelPaymentReference`
- [ ] stöd e-handel och marketplace orders som first-class channel events
- [ ] bind channel order till commercial order och inventory allocation
- [ ] verifiera import lineage, dedupe och payment reference handling

### Delfas 25.4 omnichannel inventory / allocation / sync hardening
- [ ] bygg `ChannelInventorySnapshot`, `ChannelAllocationDecision`, `ChannelSyncReceipt`, `OversellConflict`
- [ ] stöd kanalvis tillgänglighet, allocation och inventory sync
- [ ] blockera oversell och stale channel stock
- [ ] verifiera sync, allocation och oversell handling

### Delfas 25.5 pickup / ship-from-store / store-fulfillment hardening
- [ ] bygg `PickupRequest`, `ShipFromStoreDecision`, `StoreFulfillmentOrder`, `CollectionReceipt`
- [ ] stöd butikshämtning, ship-from-store och store-based fulfillment
- [ ] bind pickup till inventory reservation, customer identity och completion
- [ ] verifiera pickup readiness och collection flow

### Delfas 25.6 return / exchange / store-credit hardening
- [ ] bygg `ChannelReturn`, `ExchangeDecision`, `StoreCredit`, `RefundDecision`
- [ ] gör returns, exchanges och store credits first-class
- [ ] bind dem till inventory, payment och commercial truth
- [ ] verifiera exchange, store credit och refund lineage

### Delfas 25.7 channel pricing / promo / tax hardening
- [ ] bygg `ChannelPricingProfile`, `PromotionRule`, `ChannelTaxProfile`, `PricePublicationReceipt`
- [ ] stöd kanalvis pris, kampanj och skatteprofil
- [ ] blockera otillåten pricing drift mellan kanal och commercial core
- [ ] verifiera pricing publication och promo eligibility

### Delfas 25.8 doc / runbook / legacy purge
- [ ] skriv explicit keep/rewrite/archive/remove-beslut för retail/ecommerce-spår när de skapas
- [ ] skapa canonical runbooks för POS operations, channel sync och returns/exchanges
- [ ] förhindra att ÄR eller inventory docs fortsätter maskera att channel core saknas
- [ ] verifiera docs truth lint och runbook existence lint
