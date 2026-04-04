# DOMAIN_20_ANALYSIS

## Scope

Domän 20 täcker företagets supply-, artikel-, lager- och fulfillment-kärna:
- artikelregister, SKU, tjänsteartiklar, material och variantstyrning
- inköpsbehov, inköpsorder, mottag, restorder och supplier commitments
- lagerplatser, stock ledger, reservationer, transfers, inventering och justering
- fulfillment, leverans, retur, reklamation, RMA och kostlager

Verifierad repo-evidens:
- `packages/domain-ap/src/index.mjs:568-860`
- `packages/db/migrations/20260321140000_phase6_ap_masterdata_po_receipts.sql`
- `packages/domain-field/src/index.mjs:680-823`
- `apps/api/src/server.mjs:9014-9205`
- `apps/api/src/server.mjs:17572-17692`
- `docs/compliance/se/ap-supplier-invoice-engine.md`

Officiella källor låsta för domänen:
- [Shopify: Purchase orders in Stocky](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/inventory-management/stocky/inventory-management/purchase-orders)
- [Shopify: POS inventory management](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/inventory-management/stocky/pos-inventory-management)
- [Shopify: Product inventory tracking](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/inventory-management/products)

Domslut:
- Repo:t innehåller verkliga inköpsorder, mottag och field inventory-fragment.
- Repo:t saknar fortfarande en generell item master, en riktig inventory ledger, fulfillment- och returns-domän samt kostlagerstyrning.
- Total klassning: `partial reality`.
- Kritiska blockerare: ingen unified item master, ingen generell inventory ledger, ingen fulfillment/RMA-runtime och ingen canonical supply route family.

## Verified Reality

- `verified reality` purchase orders finns som riktiga runtimeobjekt med status och importstöd. Proof: `packages/domain-ap/src/index.mjs:568-821`.
- `verified reality` receipts/mottag finns i AP-domänen. Proof: `packages/domain-ap/src/index.mjs:823-860`, `packages/db/migrations/20260321140000_phase6_ap_masterdata_po_receipts.sql`.
- `verified reality` field inventory-reservationer och materialuttag finns. Proof: `packages/domain-field/src/index.mjs:680-823`.

## Partial Reality

- `partial reality` inventory finns bara fragmenterat i field-pack och inköp. Det finns ingen företagsgemensam item master eller inventory ledger.
- `partial reality` inköp finns, men leverans, fulfillment, returer och reklamationer saknar egen kärnmodell.

## Legacy

- `legacy` AP purchase order- och receipt-flöden används som ersättning för bred supply core. Riktning: `rewrite`.
- `legacy` field inventory används som vertikal ersättare för generellt lager. Riktning: `rewrite`.

## Dead Code

- `dead` ingen separat dead-code-yta är verifierad, men avsaknaden av generellt lagerobjekt gör att field inventory riskerar att felaktigt växa till universell lagerkärna.

## Misleading / False Completeness

- `misleading` purchase orders och receipts kan få domänen att se komplett ut fast artiklar, lagerbok, fulfillment och returns saknas.
- `misleading` stock on hand i field är inte samma sak som företagets inventory truth.

## Supply / Inventory Findings

- `critical` unified item master saknas. Farligt eftersom samma vara/material annars får olika sanningar i AP, field, ÄR och kalkyl. Riktning: `replace`.
- `critical` inventory ledger saknas som first-class företagssanning. Farligt eftersom on hand, reserved, in transit, received och consumed annars inte kan avstämmas deterministiskt. Riktning: `create`.
- `high` fulfillment, shipping, delivery och return/RMA saknas. Farligt eftersom handel, service med material och grossistflöden fortfarande kräver externt system. Riktning: `create`.
- `high` cost layers och valuation governance saknas. Farligt eftersom lagerkostnad och COGS annars inte kan kopplas säkert till ledgern. Riktning: `create`.
- `medium` auth-boundaries är generiska på supply-routes och saknar inköps-, mottags- och lagergodkännanden med finare scope. Riktning: `harden`.

## Doc / Runbook Findings

- `high` AP-dokument ska inte längre bära hela supply-kärnan. Riktning: `rewrite`.
- `high` nya runbooks för procurement, warehouse operations och RMA måste skapas. Riktning: `create`.

## Go-Live Blockers

- Ingen canonical item master.
- Ingen inventory ledger och cost-layer truth.
- Ingen fulfillment/returns/RMA-kärna.
- Ingen canonical route family för supply/inventory.
