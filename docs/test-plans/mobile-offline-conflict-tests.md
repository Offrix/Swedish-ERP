> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: TP-011
- Title: Mobile Offline Conflict Tests
- Status: Binding
- Owner: QA architecture and mobile field testing
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated mobile offline conflict test plan
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-golden-scenario-catalog.md`
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
  - `packages/domain-personalliggare/*`
- Related future documents:
  - `docs/domain/offline-sync-and-conflict-resolution.md`
  - `docs/runbooks/mobile-offline-conflict-repair.md`

# Purpose

Bevisa att pending state, retry, conflict resolution och repair fungerar i mobile utan dold dataförlust.

# Scope

- offline queue
- sync retry
- conflict resolution
- duplicate protection
- device revoke

# Blocking risk

Fel här ger dubbletter, tappad fältdata eller felaktiga attendance/work-order outcomes.

# Golden scenarios covered

- personalliggare kiosk offline
- mobile work order offline mutation

# Fixtures/golden data

- offline device
- stale server version
- duplicate client mutation id
- revoked device

# Unit tests

- queue status transitions
- conflict strategy evaluation
- duplicate detection

# Integration tests

- offline submit -> server ack
- conflict detection -> repair flow
- device revoke -> blocked sync

# E2E tests

- field user completes job offline then syncs
- personalliggare check-in offline then reconnects
- manual conflict resolution path

# Property-based tests where relevant

- same mutation id never yields more than one accepted server-side effect

# Replay/idempotency tests where relevant

- repeated retry after timeout remains idempotent

# Failure-path tests

- corrupted queue entry
- obsolete pending state
- revoked device attempting sync

# Performance expectations where relevant

- queue replay after reconnect should complete within mobile recovery budget

# Acceptance criteria

- conflicts are visible
- repair path is explicit
- data loss is prevented or made explicit with audit

# Exit gate

- [ ] offline queue, retry and conflict behaviors are green
- [ ] idempotency holds under retry and reconnect
- [ ] repair flow is test-backed and operationally usable

