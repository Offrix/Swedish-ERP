> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: TP-008
- Title: HUS Edge Case Tests
- Status: Binding
- Owner: QA architecture and finance compliance testing
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated HUS edge-case test plan
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - HUS
  - AR
  - integrations
- Related code areas:
  - `packages/domain-hus/*`
  - `packages/domain-ar/*`
  - `packages/domain-integrations/*`
- Related future documents:
  - `docs/compliance/se/hus-invoice-and-claim-gates.md`

# Purpose

Bevisa att HUS-kedjan hanterar blockerare, delgodkännande, recovery och replay korrekt.

# Scope

- invoice gates
- payment gates
- claim versions
- partial acceptance
- recovery

# Blocking risk

Fel här ger felaktig skattereduktion, kundkrav eller återkrav mot bolaget.

# Golden scenarios covered

- HUS accepted
- HUS partially accepted
- HUS recovery

# Fixtures/golden data

- HUS-faktura med köparsplit
- kundbetalning med payment evidence
- delgodkännande från myndighet

# Unit tests

- labor-only calculations
- buyer split
- claim readiness checks

# Integration tests

- AR invoice -> HUS case
- customer payment -> claim ready
- claim decision -> recovery path

# E2E tests

- accepted full claim
- partially accepted claim with customer delta
- post-payout credit triggering recovery

# Property-based tests where relevant

- buyer allocations får aldrig överstiga case total

# Replay/idempotency tests where relevant

- replay av samma claim version skapar inte dubbla materiella utfall

# Failure-path tests

- missing payment evidence
- missing buyer identity
- stale claim payload

# Performance expectations where relevant

- batch av claims ska kunna valideras inom normal submissionskörning

# Acceptance criteria

- issue blockers fungerar
- claim/recovery chain är tydlig
- receipt chain är komplett

# Exit gate

- [ ] edge cases runt delgodkännande och recovery är gröna
- [ ] replay är idempotent och receipt-säker
- [ ] blockerande datafel stoppas innan submission

