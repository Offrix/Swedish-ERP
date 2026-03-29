> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: ADR-0023
- Title: Review Center, Notification and Activity Separation
- Status: Accepted
- Owner: Product architecture and operator experience architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior ADR
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-ui-reset-spec.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - review center
  - work items
  - notifications
  - activity
  - backoffice
- Related code areas:
  - `packages/domain-core/*`
  - `packages/domain-review-center/*`
  - `packages/domain-notifications/*`
  - `packages/domain-activity/*`
  - `apps/desktop-web/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/domain/review-center.md`
  - `docs/domain/notification-center.md`
  - `docs/domain/activity-feed.md`
  - `docs/ui/WORKBENCH_CATALOG.md`

# Purpose

Låsa att review, notifications, activity och work items är fyra skilda begrepp med olika source-of-truth, olika UI-ytor och olika livscykler.

# Status

Accepted.

# Context

Repo:t har redan work-item- och notification-tänk men den nuvarande modellen är för sammansmält för att bära en premiumprodukt. I ett reglerat ERP måste operatören kunna skilja på något som kräver beslut, något som bara informerar, något som beskriver historik och något som är personligt eller teammässigt ansvar.

# Problem

Den gamla modellen riskerar att:

- blanda review med allmän aktivitet
- göra compliance-beslut svåra att hitta och äga
- använda notifications som ersättning för arbetsköer
- göra auditspår beroende av UI-komposition i stället för domänkontrakt

# Decision

1. `review-center` blir eget bounded context för beslutskrävande granskningsobjekt.
2. `notifications` blir eget bounded context för leverans av signaler till användare eller team.
3. `activity` blir eget bounded context för append-only händelsesammanfattningar.
4. `work-items` stannar i core som ansvarsbärare, deadlines och ägandeskap, men får inte vara container för review, notifications eller activity.
5. UI måste ge separata ytor för review center, notification center och activity feed.

# Scope

Beslutet omfattar begreppsseparation, datamodellsgränser, UI-ytor, queue ownership, SLA och escalation hooks. Det omfattar inte slutlig visuell design eller exakta listkolumner per workbench.

# Boundaries

`review-center` äger review item, decision state, required evidence, assignee, escalation och review outcome.

`notifications` äger notification message, channel intent, delivery state, read/unread och digesting.

`activity` äger actor-attributed event summaries, timelineunderlag och immutable feed records.

`work-items` äger owner, due date, status, routing och operational accountability.

# Alternatives considered

## Keep one unified inbox

Avvisas eftersom det gör produktupplevelsen snabb att skissa men svag i verklig drift.

## Make notifications the main task system

Avvisas eftersom notifieringar är transport och uppmärksamhet, inte beslutsstyrning.

## Let each domain own its own review queue in isolation

Avvisas eftersom operatörerna då förlorar en gemensam arbetsryggrad.

# Consequences

- nya packages behövs för review, notifications och activity
- work-items-dokumentet måste split-replace:as
- desktop, mobile och backoffice får olika konsumtionsmönster
- search och personalization måste känna till fler objektfamiljer

# Migration impact

- existerande work-item- och notification-liknande objekt måste remappas
- äldre UI-flöden som använder “notifications” för beslutsköer måste skrivas om
- audit explorers måste kunna länka från review outcome till activity och notiser utan att blanda objekten

# Verification impact

Verifiering måste visa att:

- review kräver explicit beslut
- notifications kan markeras lästa utan att beslut försvinner
- activity är append-only och förändras inte av att en notification läses
- work-item ownership kan bytas utan att historisk activity skrivs över

# Exit gate

ADR:n är uppfylld först när:

- `review-center`, `notifications` och `activity` finns som separata domänkontrakt
- den gamla överlastade modellen i `docs/domain/work-items-deadlines-notifications.md` har ersatts enligt manifestet
- UI-kontrakten för de tre ytorna är skrivna

