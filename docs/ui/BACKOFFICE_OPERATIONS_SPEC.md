> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: UI-006
- Title: Backoffice Operations Spec
- Status: Binding
- Owner: Enterprise UX architecture and operations architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated backoffice operations spec
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-ui-reset-spec.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-domain-map.md`
- Related domains:
  - backoffice
  - support
  - audit
  - replay
- Related code areas:
  - `apps/backoffice/*`
  - `packages/ui-desktop/*`
  - `packages/domain-core/*`
- Related future documents:
  - `docs/domain/audit-review-support-and-admin-backoffice.md`
  - `docs/policies/support-access-and-impersonation-policy.md`

# Purpose

Låsa den separata backoffice-ytan för support, audit, replay, incident och tenant-operationer.

# Product position

Backoffice är inte en dold adminflik i desktop. Det är en separat operatörsyta med egna regler, egna verktyg och striktare behörighet.

# Anti-goals

- supportverktyg i vanliga arbetsytor
- direktdatabastänk i UI
- blandning av support, kundarbete och development diagnostics i samma vy

# User roles

- support admin
- support lead
- security admin
- incident operator
- backoffice auditor

# Information architecture

Primära områden:

- Case Desk
- Audit Explorer
- Replay and Jobs
- Tenant Setup
- Feature Flags
- Security and Access
- Incidents

# Navigation model

- vänster rail med få, tydliga operatörsområden
- global search scoped till backoffice-objekt
- varje område har egna tabeller och drilldown-paneler

# Surface responsibilities

- Case Desk: supportärenden och scoped diagnostics
- Audit Explorer: sökning och drilldown i audit chains
- Replay and Jobs: retry, replay, dead-letter och workerstatus
- Tenant Setup: modulaktivering, onboardingkorrigering och tenantmetadata
- Feature Flags: scoped flags och emergency disable
- Security and Access: impersonation, access reviews, device/session diagnostics
- Incidents: incidentjournal, timeline och åtgärdsspår

# Object profile rules

- varje backoffice-objekt ska visa ticket/reference, scope, approvals, senaste actions och evidence links

# Workbench rules

- Case Desk, Replay and Jobs och Audit Explorer är fulla workbenches
- Tenant Setup och Feature Flags är kontrollerade adminytor med extra approvals

# Lists/tables

- högt informationsinnehåll
- tydliga filter på tenant, riskklass, status och owner
- bulk actions bara där policy tillåter

# Detail views

- ska visa receipts, approvals, scope och senaste relaterade events
- känsliga actions ska ligga bakom tydlig riskmarkering

# Preview panes

- standard i case desk, replay och audit explorer

# Search behavior

- scoped to backoffice objects only
- får inte ge bred kunddatainsyn utanför ticket eller approval scope

# Notifications/activity/work items behavior

- backoffice-notifieringar ska vara tydligt separerade från produktens ordinarie användarnotifieringar
- activity feed visar operatörshistorik inom backoffice-scope

# States: empty/loading/error/success/blocked/warning

- `empty`: inga öppna fall eller inga poster i vald scope
- `loading`: progressivt men stabilt grid
- `error`: tydlig orsak och incident reference
- `success`: diskret bekräftelse med receipt id
- `blocked`: policy eller approval saknas
- `warning`: högriskaction, brett scope eller gammal receipt

# Desktop vs mobile split

- backoffice finns bara på desktop
- inga backoffice-actions i field-mobile

# Accessibility expectations

- fullt tangentbordsstöd
- tydlig logg- och tabellhierarki

# Visual language

- sober, teknisk, operatörsinriktad
- mer verktygskänsla än marknads- eller primärproduktkänsla
- riskfärger ska användas sparsamt men tydligt

# Design system dependencies

- `docs/ui/DESIGN_SYSTEM_AND_OBJECT_PROFILE_SPEC.md`
- delade data-table-, log-viewer- och diff-komponenter

# Exit gate

- [ ] backoffice är en separat surface med egen IA
- [ ] support, audit, replay och security har tydligt skilda workbenches
- [ ] policy- och approvalgränser kan implementeras direkt mot denna ytspec

