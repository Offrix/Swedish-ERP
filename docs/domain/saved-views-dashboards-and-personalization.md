# Master metadata

- Document ID: DOM-015
- Title: Saved Views Dashboards and Personalization
- Status: Binding
- Owner: Desktop product architecture
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/domain/saved-views-dashboards-and-personalization.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-ui-reset-spec.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - search
  - desktop personalization
- Related code areas:
  - `apps/desktop-web/*`
  - `packages/ui-desktop/*`
  - `packages/domain-search/*`
- Related future documents:
  - `docs/domain/search-indexing-and-global-search.md`
  - `docs/ui/DESKTOP_INFORMATION_ARCHITECTURE.md`

# Purpose

Definiera sparade vyer, dashboards och användarinställningar utan att göra dem till egen affärslogik.

# Scope

Omfattar:

- saved views
- dashboard widgets
- default scopes
- user personalization

Omfattar inte:

- domänstatus
- behörighetsmodell

# Roles

- end user
- company admin
- bureau user

# Source of truth

Denna domän äger användarens sparade vyinställningar och layoutval. Sakdomänerna äger underliggande data.

# Object model

## SavedView

Fält:

- `saved_view_id`
- `owner_scope`
- `surface_code`
- `query_json`
- `sort_json`
- `visibility_code`
- `status`

## DashboardWidget

Fält:

- `dashboard_widget_id`
- `owner_scope`
- `widget_type_code`
- `settings_json`
- `layout_slot`
- `status`

# State machines

## SavedView

- `active`
- `broken`
- `archived`

# Commands

- `create_saved_view`
- `update_saved_view`
- `share_saved_view`
- `archive_saved_view`
- `repair_saved_view`

# Events

- `saved_view_created`
- `saved_view_updated`
- `saved_view_broken`
- `saved_view_archived`

# Cross-domain dependencies

- search query model
- workbench filters
- desktop home and dashboards

# Forbidden couplings

- saved views får inte bära otillåtna filterfält
- dashboards får inte räkna egna affärsmått i klienten

# Search ownership

Search äger själva query semantics. Saved views äger referensen till query och ytinställning.

# UI ownership

Desktop-web äger saved views och dashboards.

# Permissions

- delning av vyer kräver rätt scope och policy
- personliga vyer är privata som standard

# Failure and conflict handling

- trasig vy ska markeras `broken`, inte tyst förenklas
- saknat widgetunderlag ska visa degraded state, inte null-data som sanning

# Notifications/activity/work-item interaction

- trasiga delade vyer kan skapa notification till ägare
- delning och arkivering skapar activity

# API implications

- saved view CRUD
- widget layout CRUD
- repair endpoints

# Worker/job implications where relevant

- compatibility scan jobs

# Projection/read-model requirements

- home dashboard
- workbench saved view list
- broken state and repair hints

# Test implications

- broken view detection
- sharing scopes
- widget fallback behavior

# Exit gate

- [ ] saved views och dashboards är egna, tydliga ytkontrakt
- [ ] trasiga vyer hanteras explicit
- [ ] personalization kan byggas utan att bära domänlogik
