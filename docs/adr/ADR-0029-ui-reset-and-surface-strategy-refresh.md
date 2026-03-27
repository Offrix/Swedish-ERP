> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: ADR-0029
- Title: UI Reset and Surface Strategy Refresh
- Status: Accepted
- Owner: Product architecture and enterprise UX architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: `docs/ui/ENTERPRISE_UI_PLAN.md` as controlling strategy
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-ui-reset-spec.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-domain-map.md`
- Related domains:
  - public web
  - auth
  - desktop web
  - field mobile
  - backoffice
- Related code areas:
  - `apps/public-web/*`
  - `apps/desktop-web/*`
  - `apps/field-mobile/*`
  - `apps/backoffice/*`
  - `packages/ui-core/*`
  - `packages/ui-desktop/*`
  - `packages/ui-mobile/*`
- Related future documents:
  - `docs/ui/ENTERPRISE_UI_RESET.md`
  - `docs/ui/DESIGN_SYSTEM_AND_OBJECT_PROFILE_SPEC.md`
  - `docs/ui/DESKTOP_INFORMATION_ARCHITECTURE.md`
  - `docs/ui/FIELD_MOBILE_SPEC.md`
  - `docs/ui/PUBLIC_SITE_AND_AUTH_SPEC.md`
  - `docs/ui/BACKOFFICE_OPERATIONS_SPEC.md`

# Purpose

Formellt ersätta det gamla UI-tänket med ett fullständigt surface reset-beslut som gör UI-omtaget bindande för hela implementationen.

# Status

Accepted.

# Context

Repo:t har shells och en äldre UI-plan, men de utgör inte tillräcklig grund för en enterprise-produkt på den nivå som målbilden kräver. Den tidigare planen blandar strategi, mock-tänk och flera ytantaganden som nu är underordnade master-control-paketet.

# Problem

Om den gamla planen fortsätter vara styrande riskerar systemet att:

- byggas vidare på för svag informationsarkitektur
- återanvända shells som om de vore produkt
- få otydliga gränser mellan desktop, mobile och backoffice
- kännas som demo eller AI-produkt i stället för premium-ERP

# Decision

1. Den gamla UI-planen förlorar status som styrande strategi.
2. All slutlig UI-implementation ska följa `master-ui-reset-spec` och nya UI-specar.
3. Produktytorna låses som fem separata ytor:
   - public site
   - auth/onboarding
   - desktop web
   - field mobile
   - backoffice
4. Desktop-web är enda fullständiga arbetsytan för alla roller.
5. Field-mobile är stödprodukt för fältflöden, inte en andra desktop.
6. Backoffice byggs som separat operatörs- och supportyta, inte som dold del av vanlig desktop.

# Scope

Beslutet omfattar surface boundaries, design authority, IA ownership, workbench-first modell och object profile standard. Det omfattar inte komponentnivåimplementering eller exakta route paths.

# Boundaries

Public site äger trust messaging, produktposition och offentliga produktsidor.

Auth/onboarding äger login, challenges och tenant bootstrap.

Desktop web äger alla fulla arbetsytor, workbenches, object profiles och global search.

Field mobile äger check-in, tid, material, bilder, signatur och offline-fältflöden.

Backoffice äger audit explorer, replay, support access och incidentverktyg.

# Alternatives considered

## Evolve the old UI plan incrementally

Avvisas eftersom det skulle låsa produkten i ett för svagt skal.

## Treat mobile and desktop as near-equal full products

Avvisas eftersom det ger fel prioritering, dubbla implementationer och för svag desktopkontroll.

## Put support tools inside ordinary desktop

Avvisas eftersom support, impersonation och replay kräver egen säkerhets- och behörighetsmodell.

# Consequences

- gamla shells får bara återanvändas som scaffolding
- nya UI-specar blir blockerande dokument
- design system och IA måste skrivas innan slutlig UI-implementation

# Migration impact

- existerande navigationsstrukturer måste omprövas
- äldre UI-dokument måste ersättas eller avpubliceras
- desktop- och mobile-komponenter behöver omfördelas under centralt designsystem

# Verification impact

Verifiering måste visa att:

- inga slutytor längre följer gamla UI-planen som primär källa
- desktop, mobile och backoffice har separata ansvar
- inga domänregler implementeras i klienten för att kompensera svag backend

# Exit gate

ADR:n är uppfylld först när:

- nya UI-specar är skrivna
- `docs/ui/ENTERPRISE_UI_PLAN.md` har ersatts eller degraderats till historiskt appendix
- byggsekvensen använder det nya surface-beslutet som enda styrande källa

