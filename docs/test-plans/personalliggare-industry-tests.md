# Master metadata

- Document ID: TP-007
- Title: Personalliggare Industry Tests
- Status: Binding
- Owner: QA architecture and field compliance testing
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated personalliggare industry test plan
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - personalliggare
  - field
  - mobile
- Related code areas:
  - `packages/domain-personalliggare/*`
  - `apps/field-mobile/*`
- Related future documents:
  - `docs/compliance/se/personalliggare-engine.md`
  - `docs/domain/personalliggare-industry-packs.md`

# Purpose

Bevisa att personalliggare fungerar med industry packs, identity snapshots, kiosk och offlineflöden.

# Scope

- workplace threshold
- identity snapshots
- kiosk
- mobile
- corrections

# Blocking risk

Fel här ger direkt kontrollrisk och kan göra närvarospåret oanvändbart vid kontroll.

# Golden scenarios covered

- personalliggare kiosk offline
- personalliggare multi-contractor workplace

# Fixtures/golden data

- workplace med tröskel över regelgräns
- flera arbetsgivare och entreprenörer
- offline device queue

# Unit tests

- threshold evaluation
- identity snapshot selection
- correction chain logic

# Integration tests

- kiosk capture -> sync
- mobile capture -> export
- correction -> control report

# E2E tests

- offline kiosk on construction workplace
- device revoke and reenroll

# Property-based tests where relevant

- append-only attendance chain bevarar alltid originalevent

# Replay/idempotency tests where relevant

- samma offline event skapar inte dubblett vid återanslutning

# Failure-path tests

- missing identity snapshot
- conflicting employer snapshot
- corrupted offline queue

# Performance expectations where relevant

- normal arbetsplatsvolym ska kunna synkas inom acceptabelt kontrollfönster

# Acceptance criteria

- industry packs styr regler utan klientlogik
- identity snapshots är spårbara
- kiosk/offline/correction-kedjan håller auditkrav

# Exit gate

- [ ] workplace, identity och kioskflöden är gröna
- [ ] offline replay är idempotent
- [ ] correctioner bevarar originalspår
