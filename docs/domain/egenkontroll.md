# Master metadata

- Document ID: DOM-008
- Title: Egenkontroll
- Status: Binding
- Owner: Project and field product architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated egenkontroll document
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - egenkontroll
  - projects
  - field
- Related code areas:
  - `packages/domain-egenkontroll/*`
  - `packages/domain-projects/*`
  - `apps/field-mobile/*`
- Related future documents:
  - `docs/domain/projects-workspace.md`
  - `docs/ui/FIELD_MOBILE_SPEC.md`

# Purpose

Definiera egenkontroll som separat domän för checklistmallar, instanser, avvikelser, foton, sign-off och projektkoppling.

# Scope

Omfattar:

- mallar
- checklistinstanser
- kontrollpunkter
- avvikelser
- foto- och dokumentbevis
- sign-off

Omfattar inte:

- personalliggare
- allmän dokumentarkivering utanför kontrollobjektet

# Roles

- field worker
- site lead
- project manager
- reviewer

# Source of truth

`egenkontroll` äger checklistmallar, instanser, punktutfall och sign-off. Dokumentmotorn äger filerna som länkas som evidence.

# Object model

## ChecklistTemplate

Fält:

- `checklist_template_id`
- `template_code`
- `industry_pack_code`
- `version`
- `sections`
- `status`

## ChecklistInstance

Fält:

- `checklist_instance_id`
- `checklist_template_id`
- `project_id`
- `work_order_id`
- `status`
- `assigned_to`
- `started_at`
- `completed_at`

## ChecklistPointOutcome

Fält:

- `checklist_point_outcome_id`
- `checklist_instance_id`
- `point_code`
- `result_code`
- `note`
- `document_ids`

# State machines

## ChecklistInstance

- `draft`
- `assigned`
- `in_progress`
- `review_required`
- `signed_off`
- `closed`

# Commands

- `create_checklist_template`
- `start_checklist_instance`
- `record_checklist_point_outcome`
- `raise_checklist_deviation`
- `sign_off_checklist`

# Events

- `checklist_instance_started`
- `checklist_point_recorded`
- `checklist_deviation_raised`
- `checklist_signed_off`

# Cross-domain dependencies

- projects levererar projekt- och arbetsorderkontext
- field-mobile levererar råinmatning
- documents levererar evidence references

# Forbidden couplings

- field-mobile får inte definiera egna checklistregler i klienten
- projects får inte äga punktutfall eller sign-off-status

# Search ownership

Search får indexera mallar, öppna instanser och avvikelser men egenkontrolldomänen äger status.

# UI ownership

Field-mobile äger snabb ifyllnad. Desktop-web äger malladministration, översikt och avvikelseuppföljning.

# Permissions

- malladministration kräver högre roll än fältutförande
- sign-off kan kräva separat reviewer beroende på mall och riskklass

# Failure and conflict handling

- ofullständig checklista kan inte bli `signed_off`
- konflikt mellan offlineutfall och serverversion ska använda offline-domänens correction/merge-flöde

# Notifications/activity/work-item interaction

- avvikelse kan skapa work item eller review item
- slutförd checklista skapar activity

# API implications

- template CRUD
- instance CRUD
- sign-off endpoints

# Worker/job implications where relevant

- reminder-jobs för försenade egenkontroller
- periodic compliance summary jobs

# Projection/read-model requirements

- open checklist dashboard
- deviation list
- project/work-order checklist overview

# Test implications

- template versioning
- incomplete sign-off blocker
- evidence linkage
- deviation escalation

# Exit gate

- [ ] egenkontroll finns som egen domän med mall, instans och sign-off
- [ ] field och desktop arbetar mot samma serverregler
- [ ] avvikelser och evidence är spårbara
