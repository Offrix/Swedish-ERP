# DOMAIN_19_ANALYSIS

## Scope

Domän 19 täcker den operativa leveransen i vardagen:
- uppdrag, serviceorder, arbetsorder och återkommande serviceplaner
- bokning, ombokning, resursplanering, dispatch och kapacitetsstyrning
- checklistor, mobil exekvering, materialåtgång, kundsignoff och finance handoff
- SLA, besöksfönster, leveransstatus och återöppning

Verifierad repo-evidens:
- `packages/domain-field/src/index.mjs:437-542`
- `packages/domain-field/src/index.mjs:545-632`
- `packages/domain-field/src/index.mjs:672-730`
- `packages/domain-field/src/index.mjs:748-823`
- `packages/domain-field/src/index.mjs:854-934`
- `packages/domain-field/src/index.mjs:950-1020`
- `packages/domain-projects/src/index.mjs:2555-2555`
- `packages/domain-projects/src/index.mjs:3776-3776`
- `packages/domain-projects/src/index.mjs:3909-3909`
- `apps/api/src/server.mjs:17572-17692`
- `apps/api/src/server.mjs:17922-18217`
- `docs/domain/field-work-order-service-order-and-material-flow.md`
- `docs/runbooks/fas-10-field-verification.md`
- `docs/runbooks/fas-14-5-field-operational-pack-verification.md`

Officiella källor låsta för domänen:
- [ServiceM8: Job management and scheduling](https://www.servicem8.com/us/)
- [Shopify POS: Pickup in store för online orders](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/order-management/pickup-in-store-for-online-orders)

Domslut:
- Repo:t innehåller verkliga field/service-fragment för work orders, dispatch, materialreservation, signatur och finance handoff.
- Repo:t saknar fortfarande en generell leveransdomän som fungerar för både service, uppdrag, återkommande åtäganden och bred resursplanering.
- Total klassning: `partial reality`.
- Kritiska blockerare: ingen unified delivery root, ingen riktig schedule/capacity engine, ingen recurring service-lifecycle och ingen canonical leveransroutefamilj.

## Verified Reality

- `verified reality` operational case och work order finns som riktiga runtimeobjekt. Proof: `packages/domain-field/src/index.mjs:437-585`.
- `verified reality` dispatch assignment finns med statusar för planned, en_route och on_site. Proof: `packages/domain-field/src/index.mjs:587-669`.
- `verified reality` materialreservation och materialuttag finns i runtime. Proof: `packages/domain-field/src/index.mjs:672-823`.
- `verified reality` kundsignatur och completion-blockers finns i work order-flödet. Proof: `packages/domain-field/src/index.mjs:839-934`.
- `verified reality` finance handoff från work order till vidare ekonomisk behandling finns som first-class objekt. Proof: `packages/domain-field/src/index.mjs:937-1020`.

## Partial Reality

- `partial reality` projektkapacitet, assignment-planer och change orders finns, men de utgör inte en generell leveransmodell. Proof: `packages/domain-projects/src/index.mjs:2555`, `3776`, `3909`.
- `partial reality` field-routes finns, men leveransdomänen är fortfarande specialiserad mot field/work order och inte företagets generella operations delivery. Proof: `apps/api/src/server.mjs:17922-18217`.

## Legacy

- `legacy` projekt och field bär varsin del av leveranssanningen i stället för en gemensam delivery root. Riktning: `rewrite`.
- `legacy` `docs/domain/field-work-order-service-order-and-material-flow.md` beskriver en vertikal, inte företagets generella delivery core. Riktning: `rewrite`.

## Dead Code

- `dead` ingen separat dead-code-yta är verifierad, men dagens split mellan project- och field-objekt gör att flera närliggande objekt riskerar att bli falska ersättare för en saknad delivery core.

## Misleading / False Completeness

- `misleading` field runtime kan se ut som generell operations delivery, men den bär inte recurring service, bred schemaläggning eller tvärgående kapacitetsstyrning.
- `misleading` project assignment-planer kan se ut som bokningsmotor, men de är projektbundna och saknar företagets generella dispatch-sanning.

## Delivery Findings

- `critical` unified delivery source of truth saknas mellan project och field. Farligt eftersom bokning, dispatch, material, signoff och fakturerbar leverans annars sprids över flera deldomäner. Riktning: `replace`.
- `high` ingen first-class resource booking- och capacity engine finns på företagsnivå. Farligt eftersom resurser, kapacitet och ombokning annars måste lösas utanför plattformen. Riktning: `create`.
- `high` recurring service och service-planer saknas som egen lifecycle. Farligt eftersom återkommande serviceåtäganden inte kan styras säkert. Riktning: `create`.
- `high` ingen generell leveransmodell för `DeliveryOrder` eller `ServiceOrder` finns. Farligt eftersom work order blir felaktig universallösning även när verksamheten inte är ren field. Riktning: `create`.
- `medium` auth-boundaries är generiska och saknar finare dispatch- och completion-approval. Riktning: `harden`.

## Doc / Runbook Findings

- `high` `docs/runbooks/fas-10-field-verification.md` och `docs/runbooks/fas-14-5-field-operational-pack-verification.md` ska inte längre sälja in field som hela leveransdomänen. Riktning: `rewrite`.
- `medium` `docs/domain/projects-budget-wip-and-profitability.md` och `docs/domain/projects-workspace.md` måste hållas på project-nivå och inte bära generell leveranssanning. Riktning: `harden`.

## Go-Live Blockers

- Ingen canonical delivery object family för booking, dispatch, delivery order, recurring service och signoff.
- Ingen företagsgemensam resurs- och kapacitetsmodell.
- Ingen återkommande service-lifecycle.
- Ingen canonical handoff mellan commercial core, delivery, inventory och fakturering.
