> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: DOM-004
- Title: Activity Feed
- Status: Binding
- Owner: Product architecture and collaboration architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated activity-feed document
- Approved by: User directive, ADR-0023 and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-ui-reset-spec.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - activity
  - notifications
  - review center
  - work items
- Related code areas:
  - `packages/domain-activity/*`
  - `packages/domain-core/*`
  - `apps/desktop-web/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/ui/WORKBENCH_CATALOG.md`
  - `docs/domain/notification-center.md`

# Purpose

Definiera activity feed som den läsbara, tidsordnade berättelsen om vad som har hänt med objekt, utan att activity feed blir ansvarslager, auditlogg eller notifieringsmotor.

# Scope

Omfattar:

- activity entries
- actor snapshots
- related object references
- filters per objekt, team och tenant
- system and human actions

Omfattar inte:

- rättsligt bindande auditlogg
- notifieringsstatus
- review decisions som källa

# Roles

- end user
- manager
- backoffice operator
- auditor in read-only mode

# Source of truth

`activity-feed` är source of truth för presenterad aktivitetshistorik och användarvänliga sammanfattningar. Sakdomänerna och auditlagret förblir source of truth för juridiskt bindande händelser.

# Object model

## ActivityEntry

Fält:

- `activity_entry_id`
- `tenant_id`
- `object_type`
- `object_id`
- `activity_type`
- `actor_type`
- `actor_snapshot`
- `summary`
- `occurred_at`
- `source_event_id`
- `visibility_scope`

## ActivityRelation

Fält:

- `activity_relation_id`
- `activity_entry_id`
- `related_object_type`
- `related_object_id`
- `relation_code`

# State machines

Activity entries är append-only. Statusflöde:

- `projected`
- `visible`
- `hidden_by_policy`

# Commands

- `project_activity_entry`
- `hide_activity_entry_by_policy`
- `rebuild_activity_projection`

# Events

- `activity_entry_projected`
- `activity_entry_hidden`
- `activity_projection_rebuilt`

# Cross-domain dependencies

- review center publicerar beslutshändelser till activity feed
- notifications publicerar inte statusbyten till activity feed om inte de har affärsvärde
- payroll, HUS, AR, AP, projects och close publicerar affärshändelser

# Forbidden couplings

- activity feed får inte användas som uppgiftssystem
- activity feed får inte vara enda auditkälla
- notifieringar får inte utledas genom att läsa activity feed i klienten

# Search ownership

Search får indexera activity entries som read model men äger inte projektionen.

# UI ownership

Desktop-web äger full aktivitetsyta på objektprofiler och arbetsytor. Backoffice får använda samma feed med utökade filter.

# Permissions

- feed ska trimmas efter objektbehörighet
- dolda eller känsliga activity entries får inte exponeras till obehörig läsare

# Failure and conflict handling

- om source event återspelas ska samma activity entry dedupliceras via stabil projektionnyckel
- activity projection rebuild får inte skapa dubbla entries

# Notifications/activity/work-item interaction

- activity feed förklarar historik
- notification center kräver uppmärksamhet
- work items kräver ansvar
- audit logg ger bevis

# API implications

- list activity by object
- list team/tenant activity
- cursor pagination and filtering

# Worker/job implications where relevant

- projection rebuild jobs
- backfill jobs vid nya feeds eller nya relationer

# Projection/read-model requirements

- object timeline
- user/team scoped feed
- related-object rollups

# Test implications

- permission trimming
- deduplication on replay
- relation rendering

# Exit gate

- [ ] activity feed är append-only och skild från notifieringar och audit
- [ ] projektioner kan återbyggas utan dubbletter
- [ ] objektprofiler kan visa begriplig historik utan att bära affärslogik

