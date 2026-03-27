> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: DOM-012
- Title: Field Work Order Service Order and Material Flow
- Status: Binding
- Owner: Field product architecture
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/domain/field-work-order-service-order-and-material-flow.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - field
  - projects
  - mobile
- Related code areas:
  - `packages/domain-field/*`
  - `packages/domain-projects/*`
  - `apps/field-mobile/*`
  - `apps/desktop-web/*`
- Related future documents:
  - `docs/ui/FIELD_MOBILE_SPEC.md`
  - `docs/domain/offline-sync-and-conflict-resolution.md`

# Purpose

Definiera arbetsorder, serviceorder, dispatch, materialuttag, foton och kundsignatur som sammanhängande field-domän.

# Scope

Omfattar:

- work orders
- service orders
- dispatch assignments
- material usage
- photos and notes
- customer signature

Omfattar inte:

- AP inventory purchasing
- personalliggare rules
- allmän project profitability

# Roles

- dispatcher
- field worker
- field lead
- project manager

# Source of truth

`field` äger work orders, dispatch, material usage, signature status och photos/notes inom uppdraget. `projects` äger övergripande projektstatus.

# Object model

## WorkOrder

Fält:

- `work_order_id`
- `project_id`
- `customer_id`
- `status`
- `priority_code`
- `planned_start_at`
- `planned_end_at`
- `actual_start_at`
- `actual_end_at`
- `signature_required`
- `signature_status`

## DispatchAssignment

Fält:

- `dispatch_assignment_id`
- `work_order_id`
- `employment_id`
- `starts_at`
- `ends_at`
- `status`

## MaterialUsage

Fält:

- `material_usage_id`
- `work_order_id`
- `inventory_item_id`
- `quantity`
- `source_location_id`
- `status`

# State machines

## WorkOrder

- `draft`
- `ready_for_dispatch`
- `dispatched`
- `in_progress`
- `completed`
- `invoiced`
- `cancelled`

## DispatchAssignment

- `planned`
- `accepted`
- `en_route`
- `on_site`
- `completed`
- `cancelled`

# Commands

- `create_work_order`
- `assign_dispatch`
- `start_work_order`
- `record_material_usage`
- `capture_customer_signature`
- `complete_work_order`

# Events

- `work_order_created`
- `dispatch_assigned`
- `work_order_started`
- `material_usage_recorded`
- `customer_signature_captured`
- `work_order_completed`

# Cross-domain dependencies

- projects for project linkage
- offline domain for mobile sync envelopes
- AR for invoicing handoff

# Forbidden couplings

- mobile får inte besluta om fakturerbarhet eller slutlig invoice issue
- projects får inte äga dispatchstatus

# Search ownership

Search får indexera work orders och service orders men field äger status.

# UI ownership

Field-mobile äger executionflöden. Desktop-web äger dispatchöversikt, planering och uppföljning.

# Permissions

- dispatch kräver desktop-behörighet
- work order execution kräver tilldelning eller relevant field role

# Failure and conflict handling

- work order kan inte bli `completed` om signatur krävs men saknas
- material usage över tillåten balans eller policygräns ska blockeras eller gå till review
- offline conflicts går genom offline-domänen

# Notifications/activity/work-item interaction

- nya dispatch assignments skapar notifications
- completed jobs skapar activity
- blockerade jobb kan skapa work items

# API implications

- work-order CRUD
- dispatch endpoints
- material usage endpoints
- signature capture endpoints

# Worker/job implications where relevant

- dispatch reminders
- stale in-progress detection

# Projection/read-model requirements

- dispatch board
- today jobs list
- material usage summary
- completed-but-unbilled queue

# Test implications

- status transitions
- signature blocker
- material usage linkage
- invoicing handoff

# Exit gate

- [ ] arbetsorder, dispatch och materialflöde är låsta som egen domän
- [ ] mobile och desktop arbetar mot samma statusmodell
- [ ] fakturering och signaturkrav kan verkställas utan UI-speciallogik

