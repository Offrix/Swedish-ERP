# DOMAIN_22_ANALYSIS

## Scope

Domän 22 täcker företagets yttre operativa yta:
- publika formulär, intake och onboarding
- kundportal, leverantörsportal light och extern status/self-service
- signering, signeringsevidens, dokumentåtkomst och uppladdningar
- extern bokning, requests och ärendestatus

Verifierad repo-evidens:
- `packages/db/migrations/20260321190000_phase7_absence_portal.sql:1-104`
- `packages/domain-integrations/src/providers/signicat-signing-archive.mjs:13-136`
- `packages/domain-annual-reporting/src/index.mjs:536-550`
- `packages/domain-integrations/src/providers/zoho-crm-projects.mjs:182-183`
- `packages/domain-integrations/src/providers/zoho-crm-projects.mjs:231-234`
- `docs/runbooks/fas-7-absence-portal-verification.md`
- `docs/runbooks/phase16-auth-signing-adapters-verification.md`

Officiella källor låsta för domänen:
- [Scrive e-signature](https://www.scrive.com/e-sign/)
- [Shopify customer accounts](https://help.shopify.com/en/manual/online-store/storefront-search/search-behavior)  
  Not: Shopify official help surfaced weakly in search för customer accounts; portal/self-service-domänen måste därför verifieras extra hårt mot faktiska providerkrav när leverantör väljs.

Domslut:
- Repo:t har smala portalfragment för frånvaroportal och signing archive.
- Repo:t saknar en generell portal-, form-, self-service- och extern request-kärna.
- Total klassning: `partial reality`.
- Kritiska blockerare: ingen portal object family, ingen extern account/session-modell, ingen self-service status/document access-governance och ingen canonical portal route family.

## Verified Reality

- `verified reality` leave/absence-pathen bär `source_channel='employee_portal'` och portalnära metadata i DB. Proof: `packages/db/migrations/20260321190000_phase7_absence_portal.sql:1-104`.
- `verified reality` signing archive provider finns med credential kinds, baseline refs och archive records. Proof: `packages/domain-integrations/src/providers/signicat-signing-archive.mjs:13-136`.
- `verified reality` annual reporting använder signing archive för versionssignering. Proof: `packages/domain-annual-reporting/src/index.mjs:536-550`.

## Partial Reality

- `partial reality` Zoho-adaptern bär `clientPortalEnabled`, men det är adaptermetadata, inte plattformens egen portal core. Proof: `packages/domain-integrations/src/providers/zoho-crm-projects.mjs:182-183`, `231-234`.
- `partial reality` frånvaroportal finns som smal specialväg, men inte som generisk extern portalmodell.

## Legacy

- `legacy` portalbegreppet är bundet till enstaka specialfall i stället för en gemensam portal core. Riktning: `rewrite`.
- `legacy` signing archive används som evidensdel men kan inte ersätta full signeringsdomän för bred extern self-service. Riktning: `harden`.

## Dead Code

- `dead` ingen separat dead-code-yta är verifierad, men dagens specialfallsportal får inte fortsätta maskera att generell portal saknas.

## Misleading / False Completeness

- `misleading` frånvaroportal och signing archive kan få repo:t att se portal- och signeringsklart ut trots att externa konton, sessions, document grants, form intake och self-service saknas.
- `misleading` `clientPortalEnabled` i Zoho-adaptern är inte plattformens portal.

## Portal / Self-Service Findings

- `critical` generell portal object family saknas. Farligt eftersom kunder, leverantörer och externa parter fortfarande måste använda ändra verktyg för intake, signering och status. Riktning: `create`.
- `high` extern account/session/access-grant-modell saknas. Farligt eftersom dokumentåtkomst och self-service annars blir osäker eller ad hoc. Riktning: `create`.
- `high` public forms/intake saknas som canonical runtime. Riktning: `create`.
- `high` extern statusvy, meddelanden och self-service actions saknas. Riktning: `create`.
- `medium` signing finns som evidensarkiv men inte som full portal/signeringskedja med request, reminder, revoke och expiry. Riktning: `harden`.

## Doc / Runbook Findings

- `high` `docs/runbooks/fas-7-absence-portal-verification.md` ska inte längre sälja in portal som bred domän. Riktning: `rewrite`.
- `high` canonical portal runbooks för form intake, self-service och e-sign måste skapas. Riktning: `create`.

## Go-Live Blockers

- Ingen canonical portal object family.
- Ingen extern account/session/access-grant-kärna.
- Ingen generisk forms/intake-kärna.
- Ingen riktig self-service- och document-access-governance.
