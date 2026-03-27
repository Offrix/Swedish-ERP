> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: TP-005
- Title: Payroll Migration and Balance Tests
- Status: Binding
- Owner: QA architecture and payroll compliance testing
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated payroll migration and balance test plan
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - payroll
  - balances
  - migration
- Related code areas:
  - `packages/domain-payroll/*`
  - `packages/domain-balances/*`
- Related future documents:
  - `docs/compliance/se/payroll-migration-and-balances-engine.md`

# Purpose

Bevisa att lönecutover, YTD-import och balansbanker blir reproducerbara och korrekta.

# Scope

- employee import
- YTD import
- balances import
- cutover locking
- diff control

# Blocking risk

Fel här gör löneinförandet oanvändbart och kan ge fel nettolön, fel AGI och fel skuldnivåer.

# Golden scenarios covered

- payroll migration with balances
- collective agreement edge case
- project cost from payroll

# Fixtures/golden data

- känt källsystemutdrag
- YTD med redan rapporterad AGI
- saldo för semester, komp och flex

# Unit tests

- mapping rules
- balance carry logic
- YTD aggregate validation

# Integration tests

- import -> preview
- preview -> pay run
- pay run -> AGI constituents

# E2E tests

- full cutover with first pay run preview
- rollback before lock

# Property-based tests where relevant

- summa imported balances ska bevaras under omräkning och periodisering

# Replay/idempotency tests where relevant

- återimport av samma migration version skapar inte dubbla saldon

# Failure-path tests

- saknad personmapping
- negativt otillåtet saldo
- mismatch mellan YTD och pay-item totals

# Performance expectations where relevant

- import av normal lönestyrka ska slutföras inom avtalat cutover-fönster

# Acceptance criteria

- diff mot signoffmall ligger inom godkänd tolerans
- lock skapar stabil opening balance state
- första målperiod kan köras utan manuella specialhack

# Exit gate

- [ ] YTD och saldon är reproducerbara
- [ ] cutover lock och rollback beter sig korrekt
- [ ] första pay-run preview stämmer mot godkänd diff

