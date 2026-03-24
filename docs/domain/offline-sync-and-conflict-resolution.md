# Master metadata

- Document ID: DOM-013
- Title: Offline Sync and Conflict Resolution
- Status: Binding
- Owner: Mobile architecture and platform architecture
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/domain/offline-sync-and-conflict-resolution.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - offline
  - mobile
  - field
  - personalliggare
- Related code areas:
  - `apps/field-mobile/*`
  - `packages/domain-core/*`
  - `packages/domain-field/*`
- Related future documents:
  - `docs/ui/FIELD_MOBILE_SPEC.md`
  - `docs/runbooks/mobile-offline-conflict-repair.md`

# Purpose

Definiera den bindande offline-modellen för tillåtna mobila objekt, idempotens, pending state, conflict detection och repair.

# Scope

Omfattar:

- offline queue
- sync envelopes
- pending state
- retry and backoff
- conflict detection
- repair flow

Omfattar inte:

- offline för reglerade ekonomiobjekt som kräver omedelbar central validering
- peer-to-peer sync

# Roles

- field worker
- field lead
- support operator
- backoffice operator

# Source of truth

Servern är slutlig source of truth. Offline-domänen äger sync envelopes, lokal pending representation och conflict records.

# Object model

## SyncEnvelope

Fält:

- `sync_envelope_id`
- `client_mutation_id`
- `client_device_id`
- `client_user_id`
- `object_type`
- `mutation_type`
- `base_server_version`
- `payload_hash`
- `status`

## ConflictRecord

Fält:

- `conflict_record_id`
- `sync_envelope_id`
- `object_type`
- `server_object_id`
- `conflict_type_code`
- `merge_strategy_code`
- `status`

# State machines

## SyncEnvelope

- `queued`
- `sending`
- `synced`
- `conflicted`
- `failed_terminal`
- `obsolete`

## ConflictRecord

- `detected`
- `triaged`
- `resolved`
- `closed`

# Commands

- `submit_sync_envelope`
- `acknowledge_sync_envelope`
- `create_conflict_record`
- `resolve_conflict_record`
- `revoke_offline_access`

# Events

- `sync_envelope_received`
- `sync_envelope_synced`
- `sync_conflict_detected`
- `sync_conflict_resolved`

# Cross-domain dependencies

- field and personalliggare decide which objects may mutate offline
- core auth decides device and user validity

# Forbidden couplings

- client får inte markera mutation som permanent godkänd innan server receipt finns
- offline-domänen får inte tillåta objekt utanför capability policy

# Search ownership

Search får indexera sync errors i backoffice men offline-domänen äger state.

# UI ownership

Field-mobile visar pending, sync och conflict-status. Backoffice och desktop äger repair views.

# Permissions

- bara registrerade enheter och roller med offline capability får skapa offline envelopes
- manual conflict resolution kräver rätt domän- och supportbehörighet

# Failure and conflict handling

- duplicate `client_mutation_id` ska vara idempotent
- version mismatch skapar conflict eller obsolete enligt policy
- terminala valideringsfel ska stoppa retry och öppna repair path

# Notifications/activity/work-item interaction

- conflict eller repeated failure kan skapa notifications och work items
- synced events får skapa activity i källdomänen

# API implications

- sync submit
- sync status query
- conflict resolution
- capability policy fetch

# Worker/job implications where relevant

- retry scheduler
- conflict cleanup
- stale queue monitor

# Projection/read-model requirements

- device queue overview
- conflict list
- synced/pending counts

# Test implications

- idempotent replay
- version conflicts
- terminal failure handling
- revoke device behavior

# Exit gate

- [ ] offline mutationer följer explicit capability policy
- [ ] pending, sync och conflict är tydliga states i både API och UI
- [ ] idempotens och repair path är definierade server-side
