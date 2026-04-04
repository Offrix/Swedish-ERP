# DOMAIN_24_ANALYSIS

## Scope

Domän 24 täcker bolagsgrupp och ägarstyrning:
- koncernstruktur, flera bolag och cross-company governance
- intercompany counterparties, interna order, interna fakturor och settlement
- shared services, treasury, cash governance och interna allokeringar
- ägarbeslut, utdelningsstyrning, styrelse-/stämmoartefakter med ekonomisk effekt

Verifierad repo-evidens:
- `packages/domain-owner-distributions/src/index.mjs:120-430`
- `apps/api/src/server.mjs:7917-8364`
- `docs/runbooks/owner-distributions-and-ku31.md`

Officiella källor låsta för domänen:
- [Odoo 18 Multi-company](https://www.odoo.com/documentation/18.0/applications/general/companies/multi_company.html)
- [Odoo multi-company guidelines](https://www.odoo.com/documentation/16.0/developer/howtos/company.html)

Domslut:
- Repo:t har verklig owner distribution-/utdelningskärna med shareholder snapshots, free-equity snapshots, dividend decisions, KU31 och kupongskattspår.
- Repo:t saknar fortfarande en generell koncern-, intercompany- och treasury-domän.
- Total klassning: `partial reality`.
- Kritiska blockerare: ingen group hierarchy, ingen intercompany transaction core, ingen treasury runtime och ingen canonical multi-company governance surface.

## Verified Reality

- `verified reality` share classes, shareholder holding snapshots och free-equity snapshots finns i owner-distributions. Proof: `packages/domain-owner-distributions/src/index.mjs:120-150`, `343-430`.
- `verified reality` dividend decision-, payout-, KU31- och kupongskatt-routes finns i API:t. Proof: `apps/api/src/server.mjs:7917-8364`.

## Partial Reality

- `partial reality` owner governance finns, men den bär bara utdelningsnära bolagslogik och inte generell koncernstyrning.
- `partial reality` repo:t har flera tenants/företag, men saknar first-class group hierarchy och intercompany transaction truth.

## Legacy

- `legacy` flera tenants kan feltolkas som multi-company-domän. Riktning: `rewrite`.
- `legacy` owner distributions riskerar att säljas in som tillräcklig ägar-/koncerndomän. Riktning: `harden`.

## Dead Code

- `dead` ingen separat dead-code-yta är verifierad, men dagens owner-distribution-flöden får inte maskera frånvaro av intercompany och treasury.

## Misleading / False Completeness

- `misleading` owner-distribution-routes kan få repo:t att se koncernredo ut trots att intercompany, treasury och multi-company access-regler saknas.

## Group / Intercompany Findings

- `critical` group hierarchy och multi-company root saknas. Farligt eftersom växande bolag fortfarande måste byta system när de går från ett bolag till flera. Riktning: `create`.
- `critical` intercompany orders, invoices och settlements saknas som first-class runtime. Riktning: `create`.
- `high` treasury/cash governance saknas. Riktning: `create`.
- `high` shared-service allocations och elimination inputs saknas. Riktning: `create`.
- `medium` owner distribution-domänen ska behållas men länkas in som consumer av en större group-governance core. Riktning: `migrate`.

## Doc / Runbook Findings

- `medium` `docs/runbooks/owner-distributions-and-ku31.md` ska behållas men hållas till owner distribution och inte bära hela group/intercompany-sanningen. Riktning: `harden`.
- `high` nya runbooks för intercompany, treasury och group governance måste skapas. Riktning: `create`.

## Go-Live Blockers

- Ingen canonical koncern- och multi-company object family.
- Ingen intercompany order/invoice/settlement-kärna.
- Ingen treasury runtime.
- Ingen shared services/allocation/elimination-kärna.
