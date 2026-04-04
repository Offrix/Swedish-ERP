# DOMAIN_18_ANALYSIS

## Scope

Domän 18 täcker den kommersiella kärnan före faktura:
- konton, kunder, relationer och kontaktpersoner
- leads, opportunities, pipeline och kommersiell ägarstruktur
- offerter, prislistor, rabatter och CPQ-light
- avtal, abonnemang, retainer, renewal, uppsägning och ändringsorder
- order, kommersiell commit, SLA/leveransvillkor och handoff till projekt, arbetsorder, support och ÄR

Verifierad repo-evidens:
- `packages/domain-ar/src/index.mjs:560-840`
- `packages/domain-projects/src/index.mjs:1843-2015`
- `packages/domain-projects/src/index.mjs:2555-2555`
- `packages/domain-projects/src/index.mjs:3776-3776`
- `packages/domain-projects/src/index.mjs:3909-3909`
- `packages/domain-projects/src/index.mjs:4678-4678`
- `apps/api/src/server.mjs:7293-7488`
- `apps/api/src/server.mjs:13966-15683`
- `docs/domain/projects-workspace.md`
- `docs/runbooks/fas-14-1-project-commercial-core-verification.md`
- `docs/runbooks/fas-14-2-project-crm-handoff-verification.md`
- `docs/runbooks/phase16-hubspot-crm-handoff-verification.md`

Officiella källor låsta för domänen:
- [HubSpot: Create and send quotes](https://knowledge.hubspot.com/quotes/create-and-send-quotes)
- [HubSpot: Create subscriptions](https://knowledge.hubspot.com/subscriptions/manage-subscriptions-for-recurring-payments)
- [HubSpot: Create and manage products](https://knowledge.hubspot.com/products/how-do-i-use-products)

Domslut:
- Repo:t innehåller verkliga runtimeobjekt för prislistor, offerter, kontrakt och projektkommersiella handoff-spår.
- Repo:t saknar fortfarande en sammanhållen kommersiell source of truth som bär hela kedjan från relation till offert, avtal, abonnemang, order och renewal.
- Total klassning: `partial reality`.
- Kritiska blockerare: ingen first-class account/contact/opportunity-modell, ingen riktig subscription-lifecycle, ingen generell ordermodell och ingen canonical commercial route-familj.

## Verified Reality

- `verified reality` prislistor finns som first-class runtime i ÄR. Proof: `packages/domain-ar/src/index.mjs:560-588`.
- `verified reality` offerter med versionering, statusövergångar och revision finns i runtime. Proof: `packages/domain-ar/src/index.mjs:591-729`, `apps/api/src/server.mjs:7293-7392`.
- `verified reality` kontrakt med datumintervall, frekvens, indexering och quote-conversion finns i runtime. Proof: `packages/domain-ar/src/index.mjs:731-840`, `apps/api/src/server.mjs:7395-7488`.
- `verified reality` projektdomänen har kommersiella delobjekt för agreement, engagement, billing plan, capacity reservation, assignment plan och change order. Proof: `packages/domain-projects/src/index.mjs:1843-2015`, `2555`, `3776`, `3909`, `4678`.

## Partial Reality

- `partial reality` kund finns i ÄR, men account/contact/opportunity-lagret före quote är inte first-class. Proof: `packages/domain-ar/src/index.mjs`, ingen egen kommersiell package eller route-familj hittad.
- `partial reality` kontrakt finns, men abonnemang, renewal, uppsägning, paus och kommersiella amendment-flöden är inte egen livscykel. Proof: `packages/domain-ar/src/index.mjs:744-840`.
- `partial reality` projektkommersiella spår finns, men de är projektcentrerade och kan inte ensam bära företagets generella säljkärna. Proof: `packages/domain-projects/src/index.mjs:1843-2015`, `2555`, `3909`, `4678`.

## Legacy

- `legacy` kommersiell sanning är splittrad mellan ÄR och projektdomänen i stället för att ägas av en dedikerad commercial core. Riktning: `rewrite`.
- `legacy` runbooks och projektdokument beskriver CRM-handoff som om den vore tillräcklig kommersiell kärna. Proof: `docs/runbooks/fas-14-2-project-crm-handoff-verification.md`. Riktning: `rewrite`.

## Dead Code

- `dead` ingen separat dead-code-yta är verifierad i den här domänen, men frånvaro av dedikerad kommersiell root gör att project-handoff-routes felaktigt riskerar att användas som ersättning för commercial core.

## Misleading / False Completeness

- `misleading` quote och contract-routes kan få domänen att se kommersiellt komplett ut fast lead/opportunity/account/contact/renewal/order saknas.
- `misleading` projektagreement och change-order kan se ut som generiska commercial objects men är i praktiken projektspår, inte företagets universella kommersiella sanning.

## Commercial Core Findings

- `critical` en sammanhållen kommersiell source of truth saknas mellan relation, offert, avtal, abonnemang och order. Farligt eftersom säljsanning, prisbindning och leveranscommit annars splittras mellan ÄR, projekt och manuella processer. Proof: `packages/domain-ar/src/index.mjs:591-840`, `packages/domain-projects/src/index.mjs:1843-2015`. Riktning: `replace`.
- `high` account, contact, opportunity och pipeline saknas som first-class runtime. Farligt eftersom användaren fortfarande måste leva i extern CRM-yta före quote. Riktning: `create`.
- `high` ingen first-class subscription- och renewal-lifecycle finns. Farligt eftersom återkommande tjänster, retainer och serviceavtal inte kan styras säkert över tid. Proof: kontrakt finns men inte subscription runtime i `packages/domain-ar/src/index.mjs:744-840`. Riktning: `create`.
- `high` ingen generell commercial ordermodell finns. Farligt eftersom orderhändelser, ändringar, cancellation och downstream handoff saknar ett tydligt kommersiellt nav. Riktning: `create`.
- `medium` auth-boundaries är generiska `company.read`/`company.manage` på ÄR-routes. Farligt eftersom kommersiell approval, rabattstyrning och avtalsrättigheter behöver finare gränser. Proof: `apps/api/src/server.mjs:7293-7488`. Riktning: `harden`.

## Doc / Runbook Findings

- `high` `docs/domain/projects-workspace.md` ska inte fortsätta bära kommersiell grundsanning. Riktning: `rewrite`.
- `high` `docs/runbooks/fas-14-1-project-commercial-core-verification.md` och `docs/runbooks/fas-14-2-project-crm-handoff-verification.md` är för smala för verklig commercial core. Riktning: `rewrite`.
- `medium` `docs/runbooks/phase16-hubspot-crm-handoff-verification.md` kan behållas som integrationsverifiering men inte som canonical kommersiell sanning. Riktning: `migrate`.

## Go-Live Blockers

- Ingen canonical kommersiell object family för account/contact/opportunity/quote/contract/subscription/order.
- Ingen first-class renewal, amendment och cancellation-lifecycle.
- Ingen approval-styrd rabatt- och prisgovernance.
- Ingen canonical routefamilj för commercial core.
- Ingen enhetlig handoff från commercial core till projekt, arbetsorder, support och ÄR.
