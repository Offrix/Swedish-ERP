# Master metadata

- Document ID: DOM-BRIDGE-001
- Title: Work Items, Deadlines and Notifications
- Status: Split-replaced compatibility bridge
- Owner: Core product architecture
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior primary `docs/domain/work-items-deadlines-notifications.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-document-manifest.md`
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-ui-reset-spec.md`
- Related domains:
  - review center
  - notifications
  - activity
  - work items
- Related code areas:
  - `packages/domain-core/*`
  - `packages/domain-review-center/*`
  - `packages/domain-notifications/*`
  - `packages/domain-activity/*`
- Related future documents:
  - `docs/domain/review-center.md`
  - `docs/domain/notification-center.md`
  - `docs/domain/activity-feed.md`
  - `docs/domain/audit-review-support-and-admin-backoffice.md`

# Purpose

Denna fil finns kvar endast som split-replace-brygga så att äldre referenser kan mappas till de nya separerade domändokumenten.

# Scope

Omfattar:

- historisk mappning från ett överlastat dokument till flera nya primärdokument
- vilka ansvar som flyttats vart

Omfattar inte:

- ny primär domänmodell för review, notifications eller activity

# Roles

- dokumentägare och utvecklare använder denna fil för migrering av gamla referenser
- ny implementation ska i stället läsa respektive primärdokument

# Source of truth

Source of truth är nu uppdelad så här:

- review queues, review decisions och review UI-kontrakt: `docs/domain/review-center.md`
- delivery notifications, channel policy och notification UI: `docs/domain/notification-center.md`
- activity streams, event feed och observerbar händelsehistorik: `docs/domain/activity-feed.md`
- work-item- och backofficeanknytning som fortfarande lever i core/ops-kontrakt: `docs/domain/audit-review-support-and-admin-backoffice.md`

# Object model

Legacyobjekt i denna fil ska tolkas enligt följande mappning:

- äldre `review task` -> `review item` i `review-center.md`
- äldre `notification` -> `notification delivery` i `notification-center.md`
- äldre `activity log` -> `activity event` i `activity-feed.md`
- äldre generellt `work item` -> work-itemansvar i core/backoffice och review-center när det gäller faktisk review

# State machines

Den primära state-logiken finns nu i:

- review states i `review-center.md`
- notification delivery states i `notification-center.md`
- activity event append-only-regler i `activity-feed.md`

Denna fil definierar inga nya bindande state machines.

# Commands

Nya kommandon ska inte hämtas härifrån. De ska hämtas från respektive primärdokument.

# Events

Eventansvar är nu separerat:

- review events -> review center
- notification delivery events -> notification center
- activity append events -> activity feed

# Cross-domain dependencies

- review center konsumerar domänhändelser som kräver mänskligt beslut
- notification center konsumerar beslutade notifieringsuppdrag
- activity feed konsumerar append-only operativa händelser

# Forbidden couplings

- review får inte längre gömmas i samma modell som ren aktivitet
- notification delivery får inte längre vara source of truth för mänskligt ansvar
- activity feed får inte längre användas som to-do-lista

# Search ownership

Sökindex ska indexera respektive objekttyp men search får aldrig bli source of truth för dem.

# UI ownership

- review UI ägs av review center-specen
- notification UI ägs av notification center-specen
- activity UI ägs av activity feed-specen

# Permissions

Behörighetsregler ska nu hämtas från respektive primärdokument och från auth/SoD-policies.

# Failure and conflict handling

Failure- och konfliktregler ska nu hämtas från respektive primärdokument.

# Notifications/activity/work-item interaction where relevant

Interactionen är nu uttryckligen separerad:

- review center skapar eller konsumerar reviewansvar
- notification center levererar meddelanden
- activity feed visar append-only händelser

# API implications

Nya API-kontrakt får inte definieras från denna fil.

# Worker/job implications where relevant

Jobb och dispatchlogik ska implementeras mot notification center och review center, inte mot detta legacy-dokument.

# Projection/read-model requirements

Read models ska byggas per bounded context och inte från en gemensam "allt-i-ett"-modell.

# Test implications

- verifiera att inga nya tester använder denna fil som primär källa
- verifiera att split-replace är fullbordad i dokumentation och implementation

# Exit gate

- [ ] gamla referenser är mappade till rätt primärdokument
- [ ] ingen ny implementation använder denna fil som primär spec
