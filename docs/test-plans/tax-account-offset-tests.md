# Master metadata

- Document ID: TP-006
- Title: Tax Account Offset Tests
- Status: Binding
- Owner: QA architecture and finance compliance testing
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated tax account offset test plan
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - tax account
  - banking
  - close
- Related code areas:
  - `packages/domain-tax-account/*`
  - `packages/domain-banking/*`
- Related future documents:
  - `docs/compliance/se/tax-account-and-offset-engine.md`

# Purpose

Bevisa att skattekontohändelser importeras, matchas och kvittas korrekt utan dold manuell logik.

# Scope

- event import
- offset logic
- partial matching
- difference cases
- close blockers

# Blocking risk

Fel här ger fel skatteskuld, fel close och risk för felaktig manuell kvittning.

# Golden scenarios covered

- tax account offset
- locked period correction

# Fixtures/golden data

- imported skattekontohändelser
- expected AGI liability
- expected VAT liability

# Unit tests

- event classification
- offset priority
- difference thresholds

# Integration tests

- import -> match -> difference case
- tax account -> close blocker

# E2E tests

- mixed AGI and VAT period with partial offset
- manual difference resolution with approval

# Property-based tests where relevant

- offset sum får aldrig överstiga eventets tillgängliga belopp

# Replay/idempotency tests where relevant

- dubbelimport av samma skattekontohändelse skapar inte nytt öppet event

# Failure-path tests

- unmatched bank reference
- conflicting liability match
- stale difference case at close

# Performance expectations where relevant

- periodimport och auto-match ska klara normal månadsvolym utan timeout i close-fönster

# Acceptance criteria

- import är idempotent
- partial offset lämnar korrekt restbelopp
- close blocker skapas när differens kvarstår

# Exit gate

- [ ] import, offset och differenshantering är testade
- [ ] idempotens och close blocker-logik är grön
- [ ] manuell matchning kräver rätt approval
