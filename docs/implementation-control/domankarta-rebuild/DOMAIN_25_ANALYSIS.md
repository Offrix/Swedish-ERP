# DOMAIN_25_ANALYSIS

## Scope

Domän 25 täcker commerce-kanaler:
- POS, butikskassa och kassapass
- e-handel, channel orders och channel inventory
- marketplace-ordering, butikshämtning, ship-from-store och omnikanal-returer
- store credit, exchange, returflöden och kanalvis prissättning

Verifierad repo-evidens:
- ingen first-class package eller route family för commerce channels hittad under `packages/` eller `apps/api/src/server.mjs`
- närliggande beroenden finns i:
  - `packages/domain-ar/`
  - `packages/domain-ap/`
  - `packages/domain-field/`
  - `packages/domain-projects/`

Officiella källor låsta för domänen:
- [Shopify: POS inventory management](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/inventory-management/stocky/pos-inventory-management)
- [Shopify: Product inventory tracking](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/inventory-management/products)
- [Shopify: Pickup in store för online orders](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/order-management/pickup-in-store-for-online-orders)

Domslut:
- Repo:t saknar en riktig commerce-channel-domän.
- Närliggande ÄR-, inventory- och delivery-fragment kan återanvändas som downstream consumers men utgör inte channel truth.
- Total klassning: `missing`.
- Kritiska blockerare: ingen sales-channel-kärna, ingen POS-session, ingen channel-order truth, ingen omnichannel inventory sync, inga store-credit/exchange-flöden.

## Verified Reality

- `verified reality` ingen first-class commerce channel runtime är verifierad i repo:t.

## Partial Reality

- `partial reality` order-, inventory- och delivery-fragment i ändra domäner kan bära downstream economics och fulfillment, men inte själva kanaltruth.

## Legacy

- `legacy` frånvaro av domänen innebär att ÄR eller inventory lätt feltolkas som e-handels- eller POS-stöd. Riktning: `rewrite`.

## Dead Code

- `dead` ingen separat dead-code-yta är verifierad; domänens problem är frånvaro, inte överflöd.

## Misleading / False Completeness

- `misleading` inventory och ÄR kan få systemet att se handelsredo ut trots att själva säljkanalen saknas.

## Commerce Findings

- `critical` sales channel root saknas. Farligt eftersom retail, e-handel och omnichannel-bolag fortfarande måste leva i annat system. Riktning: `create`.
- `critical` POS session, receipt, exchange och store-credit saknas. Riktning: `create`.
- `high` channel order capture och omnichannel inventory sync saknas. Riktning: `create`.
- `high` pickup in store, ship-from-store och kanalreturer saknas. Riktning: `create`.
- `medium` kanalvis pricing/promo/tax governance saknas. Riktning: `create`.

## Go-Live Blockers

- Ingen canonical sales-channel object family.
- Ingen POS/ecommerce/marketplace order runtime.
- Ingen omnichannel inventory- och fulfillment-kärna.
- Ingen return/exchange/store-credit-kärna.
