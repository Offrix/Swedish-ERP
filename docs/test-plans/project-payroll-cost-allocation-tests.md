> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: TP-009
- Title: Project Payroll Cost Allocation Tests
- Status: Binding
- Owner: QA architecture and project/payroll testing
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated project payroll cost allocation test plan
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - projects
  - payroll
  - reporting
- Related code areas:
  - `packages/domain-projects/*`
  - `packages/domain-payroll/*`
- Related future documents:
  - `docs/compliance/se/payroll-engine.md`
  - `docs/domain/projects-budget-wip-and-profitability.md`

# Purpose

Bevisa att lön, förmåner och relaterade kostnader fördelas korrekt till projekt och period.

# Scope

- explicit project dimension
- proportional allocation
- benefits and payroll tax cost
- WIP tie-out

# Blocking risk

Fel här förstör projektens actual cost, forecast och marginal.

# Golden scenarios covered

- project cost from payroll

# Fixtures/golden data

- anställd med timmar på flera projekt
- payroll outcomes inklusive förmån och AG
- project budget and WIP snapshots

# Unit tests

- direct project dimension allocation
- proportional fallback allocation
- employer contribution add-on

# Integration tests

- payroll -> project cost snapshot
- project cost snapshot -> WIP

# E2E tests

- mixed-project pay run with benefits and net deductions

# Property-based tests where relevant

- sum allocated cost equals source payroll cost within tolerated rounding

# Replay/idempotency tests where relevant

- replay av samma payroll outcome skapar inte dubbla project actuals

# Failure-path tests

- missing project dimension with no fallback basis
- stale payroll outcome after correction

# Performance expectations where relevant

- snapshot materialization ska klara normal projektportfölj inom nattfönster

# Acceptance criteria

- allokerad total följer källpayroll
- corrections reflekteras utan dubbelräkning
- WIP och forecast får rätt actual cost

# Exit gate

- [ ] projektactuals stämmer mot payroll source
- [ ] replay och correction fungerar utan dubbelkostnad
- [ ] WIP-fel på grund av kostnadsallokering upptäcks i test

