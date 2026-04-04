# DOMAIN_23_ANALYSIS

## Scope

Domän 23 täcker operativa tillgångar:
- maskiner, fordon, utrustning, verktyg och annan företagsasset
- placering, ansvarig, reservation, status och användning
- serviceintervall, underhåll, inspektion och felanmälan
- kostnader, avskrivningskoppling och operationshistorik

Verifierad repo-evidens:
- `packages/domain-ledger/src/index.mjs:1718-1905`
- `apps/api/src/server.mjs:3550-3610`
- `packages/domain-benefits/src/index.mjs`
- `packages/domain-travel/src/index.mjs`
- `packages/domain-personalliggare/src/index.mjs`
- `docs/compliance/se/fixed-assets-and-depreciation-engine.md`

Domslut:
- Repo:t har verklig finansiell fixed-asset-kärna för anläggningskort och avskrivning.
- Repo:t saknar fortfarande en operativ asset/fleet/maintenance-domän.
- Total klassning: `partial reality`.
- Kritiska blockerare: asset cards är finansiella objekt, inte operativa assets; ingen maintenance-lifecycle; ingen fleet/equipment reservation; ingen asset-to-delivery/runtime-koppling.

## Verified Reality

- `verified reality` asset cards kan registreras med kostnad, livslängd, konton och avskrivningsmetod. Proof: `packages/domain-ledger/src/index.mjs:1718-1840`.
- `verified reality` depreciation batches finns som runtime. Proof: `packages/domain-ledger/src/index.mjs:1856-1905`.
- `verified reality` asset card-routes finns i API:t. Proof: `apps/api/src/server.mjs:3550-3610`.

## Partial Reality

- `partial reality` vehicle- och benefit-fragment finns i benefits/travel, men de utgör inte en operativ fleet-domän.
- `partial reality` personalliggare och field kan bära viss utrustningskoppling, men utan canonical asset runtime.

## Legacy

- `legacy` fixed asset cards används som närmaste approximation för operativa assets. Riktning: `rewrite`.
- `legacy` asset-related fragments ligger spridda över benefits, travel, personalliggare och field. Riktning: `rewrite`.

## Dead Code

- `dead` ingen separat dead-code-yta är verifierad, men dagens finansiella asset-kort får inte fortsätta säljas in som full asset operations-domän.

## Misleading / False Completeness

- `misleading` asset cards och avskrivning kan få repo:t att se “asset-ready” ut trots att operativt ägande, underhåll, reservation och servicehistorik saknas.

## Asset / Maintenance Findings

- `critical` operativ asset core saknas. Farligt eftersom företag med fordon, maskiner och verktyg fortfarande måste driva detta i ändra system. Riktning: `create`.
- `high` maintenance plans, inspections och fault cases saknas. Riktning: `create`.
- `high` asset assignment, location, availability och booking saknas. Riktning: `create`.
- `medium` finansiell asset-koppling till operativ asset saknas. Riktning: `create`.

## Doc / Runbook Findings

- `high` `docs/compliance/se/fixed-assets-and-depreciation-engine.md` ska hållas som finansiell consumer doc, inte som hela asset-domänen. Riktning: `harden`.
- `high` nya runbooks för maintenance, fleet och equipment allocation måste skapas. Riktning: `create`.

## Go-Live Blockers

- Ingen canonical operational asset object family.
- Ingen maintenance/inspection/fault lifecycle.
- Ingen fleet/equipment booking och availability truth.
- Ingen asset-to-delivery/project linkage.
