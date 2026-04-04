# DOMAIN_26_ANALYSIS

## Scope

Domän 26 täcker produktion och tillverkning light-to-mid:
- bill of materials, recept, kitting och assemblies
- MRP, materialbehov, orderrelease och shop-floor work orders
- work centers, routing, operationssteg och yield/scrap
- quality checks, avvikelser, batch/lot och produktionskostnad

Verifierad repo-evidens:
- ingen first-class package eller route family för produktion, BOM eller MRP hittad under `packages/` eller `apps/api/src/server.mjs`
- närliggande beroenden finns i:
  - `packages/domain-kalkyl/`
  - `packages/domain-field/`
  - `packages/domain-ap/`
  - `packages/domain-ar/`
  - `packages/domain-ledger/`

Officiella källor låsta för domänen:
- [Odoo Manufacturing](https://www.odoo.com/app/manufacturing)
- [Odoo Bill of Materials](https://www.odoo.com/app/bill-of-materials)
- [Odoo Quality](https://www.odoo.com/app/quality)

Domslut:
- Repo:t saknar en riktig produktionsdomän.
- Närliggande kalkyl-, lager- och materialfragment räcker inte för tillverkande eller assemblerande verksamheter.
- Total klassning: `missing`.
- Kritiska blockerare: ingen BOM-kärna, ingen MRP/materialbehovsplanering, ingen tillverkningsorder/work center-lifecycle och ingen quality/yield/scrap-kärna.

## Verified Reality

- `verified reality` ingen first-class produktion/BOM/MRP-runtime är verifierad i repo:t.

## Partial Reality

- `partial reality` kalkyl, materialreservationer och inventory-fragment kan användas som downstream consumers, men de utgör inte tillverkningskärna.

## Legacy

- `legacy` field/material- och kalkylfragment riskerar att feltolkas som tillräckligt för kitting eller produktion. Riktning: `rewrite`.

## Dead Code

- `dead` ingen separat dead-code-yta är verifierad; domänens problem är frånvaro.

## Misleading / False Completeness

- `misleading` artiklar, lager och kalkyl kan få systemet att se tillverkningsbart ut trots att BOM, work centers, routing, yield och quality saknas.

## Manufacturing Findings

- `critical` BOM och assembly truth saknas. Riktning: `create`.
- `critical` MRP/material requirements planning saknas. Riktning: `create`.
- `high` manufacturing orders, work centers och routing saknas. Riktning: `create`.
- `high` quality checks, deviation handling och scrap/yield runtime saknas. Riktning: `create`.
- `high` produktionskostnad och WIP-bridge till ledgern saknas som first-class produktionslogik. Riktning: `create`.

## Go-Live Blockers

- Ingen BOM/recipe-kärna.
- Ingen MRP eller materialbehovsplanering.
- Ingen manufacturing-order/work-center runtime.
- Ingen quality/yield/scrap-kärna.
- Ingen production-cost/WIP-bridge.
