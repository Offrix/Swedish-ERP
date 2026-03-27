> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: UI-BRIDGE-001
- Title: Enterprise UI Plan
- Status: Historical bridge, not binding
- Owner: Product design governance
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior primary `docs/ui/ENTERPRISE_UI_PLAN.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-ui-reset-spec.md`
  - `docs/master-control/master-document-manifest.md`
  - `docs/master-control/master-rebuild-control.md`
- Related domains:
  - desktop web
  - field mobile
  - backoffice
  - public site
- Related code areas:
  - `apps/desktop-web/*`
  - `apps/field-mobile/*`
  - `apps/backoffice/*`
  - `packages/ui-core/*`
- Related future documents:
  - `docs/ui/ENTERPRISE_UI_RESET.md`
  - `docs/ui/DESKTOP_INFORMATION_ARCHITECTURE.md`
  - `docs/ui/FIELD_MOBILE_SPEC.md`
  - `docs/ui/BACKOFFICE_OPERATIONS_SPEC.md`
  - `docs/ui/PUBLIC_SITE_AND_AUTH_SPEC.md`
  - `docs/ui/DESIGN_SYSTEM_AND_OBJECT_PROFILE_SPEC.md`
  - `docs/ui/WORKBENCH_CATALOG.md`

# Purpose

Denna fil finns kvar endast som historisk brygga från äldre UI-riktning till de nya bindande UI-specarna.

# Product position

Den slutliga produktpositionen ägs nu av:

- `docs/ui/ENTERPRISE_UI_RESET.md`
- `docs/ui/PUBLIC_SITE_AND_AUTH_SPEC.md`
- `docs/ui/DESKTOP_INFORMATION_ARCHITECTURE.md`
- `docs/ui/FIELD_MOBILE_SPEC.md`
- `docs/ui/BACKOFFICE_OPERATIONS_SPEC.md`
- `docs/ui/DESIGN_SYSTEM_AND_OBJECT_PROFILE_SPEC.md`
- `docs/ui/WORKBENCH_CATALOG.md`

# Anti-goals

Denna fil får inte längre användas för att:

- styra slutlig informationsarkitektur
- styra slutlig navigationsmodell
- definiera slutlig desktopstruktur
- definiera slutlig mobile- eller backoffice-yta

# User roles

Rollmodeller för slutlig UI ägs nu av de nya primärspecarna.

# Information architecture

Den bindande informationsarkitekturen finns nu i `docs/ui/DESKTOP_INFORMATION_ARCHITECTURE.md`.

# Navigation model

Den bindande navigationsmodellen finns nu i:

- `docs/ui/DESKTOP_INFORMATION_ARCHITECTURE.md`
- `docs/ui/FIELD_MOBILE_SPEC.md`
- `docs/ui/BACKOFFICE_OPERATIONS_SPEC.md`

# Surface responsibilities

Surface-gränserna är nu:

- public site och auth: `docs/ui/PUBLIC_SITE_AND_AUTH_SPEC.md`
- full desktop-web: `docs/ui/DESKTOP_INFORMATION_ARCHITECTURE.md`
- field-mobile: `docs/ui/FIELD_MOBILE_SPEC.md`
- backoffice: `docs/ui/BACKOFFICE_OPERATIONS_SPEC.md`

# Object profile rules

Object profile-standard ägs nu av `docs/ui/DESIGN_SYSTEM_AND_OBJECT_PROFILE_SPEC.md`.

# Workbench rules

Workbench-katalogen ägs nu av `docs/ui/WORKBENCH_CATALOG.md`.

# Lists/tables

Tabell- och liststandard ägs nu av `docs/ui/DESIGN_SYSTEM_AND_OBJECT_PROFILE_SPEC.md`.

# Detail views

Detaljvyer och objektprofiler ägs nu av `docs/ui/DESIGN_SYSTEM_AND_OBJECT_PROFILE_SPEC.md`.

# Preview panes

Preview- och split-view-mönster ägs nu av `docs/ui/DESIGN_SYSTEM_AND_OBJECT_PROFILE_SPEC.md`.

# Search behavior

Search- och command-bar-beteende ägs nu av desktop IA och workbench-katalogen.

# Notifications/activity/work items behavior

Beteendet ägs nu av:

- `docs/domain/notification-center.md`
- `docs/domain/activity-feed.md`
- `docs/domain/review-center.md`
- `docs/ui/DESKTOP_INFORMATION_ARCHITECTURE.md`

# States: empty/loading/error/success/blocked/warning

State-design ägs nu av `docs/ui/ENTERPRISE_UI_RESET.md` och `docs/ui/DESIGN_SYSTEM_AND_OBJECT_PROFILE_SPEC.md`.

# Desktop vs mobile split

Den bindande uppdelningen är:

- desktop-web är enda fulla ytan
- field-mobile är stöd-yta
- backoffice är separat operatörsyta

# Accessibility expectations

Accessibilitykrav ägs nu av de nya primärspecarna.

# Visual language

Den bindande visuella riktningen finns nu i `docs/ui/ENTERPRISE_UI_RESET.md`.

# Design system dependencies

Det bindande designsystemet finns nu i `docs/ui/DESIGN_SYSTEM_AND_OBJECT_PROFILE_SPEC.md`.

# Exit gate

- [ ] denna fil används endast som historisk brygga
- [ ] inga nya implementationer hänvisar till denna fil som primär UI-spec

