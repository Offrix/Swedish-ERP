> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: DOM-005
- Title: Personalliggare Industry Packs
- Status: Binding
- Owner: Field compliance architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated personalliggare industry-pack document
- Approved by: User directive, ADR-0028 and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - personalliggare
  - field
  - HR
  - identity
- Related code areas:
  - `packages/domain-personalliggare/*`
  - `packages/domain-hr/*`
  - `apps/field-mobile/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/compliance/se/personalliggare-engine.md`
  - `docs/runbooks/personalliggare-kiosk-device-trust.md`

# Purpose

Definiera hur personalliggare byggs som generell attendance-kärna med industry packs, workplace abstraction och identity graph.

# Scope

Omfattar:

- workplace model
- industry pack model
- employer and contractor snapshots
- attendance identity graph
- kiosk, mobile and backoffice interaction

Omfattar inte:

- ordinarie tidrapportering
- generella HR-register som source of truth

# Roles

- site owner
- kiosk operator
- field worker
- employer admin
- compliance operator

# Source of truth

`personalliggare` äger workplace, attendance event, attendance correction och industry-pack-regler. `HR` äger canonical person och anställningsrelation.

# Object model

## Workplace

Fält:

- `workplace_id`
- `industry_pack_code`
- `site_type_code`
- `name`
- `address_snapshot`
- `threshold_evaluation_status`
- `registration_status`
- `active_from`
- `active_to`

## IndustryPack

Fält:

- `industry_pack_code`
- `version`
- `attendance_requirements`
- `identity_requirements`
- `export_requirements`

## AttendanceIdentitySnapshot

Fält:

- `attendance_identity_snapshot_id`
- `person_id`
- `person_identifier_type`
- `person_identifier_value`
- `employer_org_no`
- `contractor_org_no`
- `role_at_workplace`
- `valid_from`
- `valid_to`

## AttendanceEvent

Fält:

- `attendance_event_id`
- `workplace_id`
- `attendance_identity_snapshot_id`
- `event_type`
- `event_timestamp`
- `source_channel`
- `device_id`
- `offline_flag`
- `status`

# State machines

## Workplace

- `draft`
- `threshold_pending`
- `registration_required`
- `active`
- `inactive`
- `archived`

## AttendanceEvent

- `captured`
- `synced`
- `corrected`
- `voided_by_correction`

# Commands

- `create_workplace`
- `evaluate_workplace_threshold`
- `activate_industry_pack`
- `capture_attendance_event`
- `correct_attendance_event`
- `register_workplace_snapshot`

# Events

- `workplace_created`
- `industry_pack_activated`
- `attendance_event_captured`
- `attendance_event_corrected`

# Cross-domain dependencies

- HR levererar canonical person och employment
- field levererar work-order context där det behövs
- backoffice använder personalliggare read models för kontroll och export

# Forbidden couplings

- field-mobile får inte själv tolka branschregler i klienten
- HR får inte äga attendance event-status
- tidrapportering får inte återanvända attendance events som om de vore arbetade timmar

# Search ownership

Search får indexera workplaces, devices och attendance entries men personalliggare äger status och correction chain.

# UI ownership

Field-mobile äger snabb check-in/check-out. Desktop-web och backoffice äger kontrollvyer, avvikelser, exports och administration.

# Permissions

- kiosk får bara registrera attendance
- employer admin får se sin personal
- site owner och backoffice får se hela workplace-scope enligt policy

# Failure and conflict handling

- offline entries måste kunna synkas idempotent
- correction får aldrig skriva över originalevent
- saknad identity snapshot blockerar `active` compliance-export

# Notifications/activity/work-item interaction

- misslyckad synk eller correction-konflikt kan skapa notification
- större avvikelser kan skapa work item eller review item
- normal check-in/check-out ger activity men inte nödvändigtvis notification

# API implications

- workplace CRUD
- attendance capture
- correction endpoints
- export endpoints

# Worker/job implications where relevant

- offline sync ingestion
- export generation
- nightly threshold and anomaly checks

# Projection/read-model requirements

- current on-site roster
- daily control list
- employer/contractor snapshots per workplace

# Test implications

- multi-contractor workplace
- offline capture and replay
- correction chain
- threshold and registration logic

# Exit gate

- [ ] workplace abstraction och industry packs finns som egen domänmodell
- [ ] identity graph binder attendance till rätt person, arbetsgivare och entreprenör
- [ ] kiosk, mobile och backoffice arbetar mot samma append-only kärna

