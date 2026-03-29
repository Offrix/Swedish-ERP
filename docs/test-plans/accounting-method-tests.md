> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: TP-001
- Title: Accounting Method Tests
- Status: Binding
- Owner: QA architecture and finance compliance testing
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated accounting-method test plan
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-rulepack-register.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - accounting method
  - ledger
  - AR
  - AP
  - VAT
- Related code areas:
  - `packages/domain-accounting-method/*`
  - `packages/domain-ledger/*`
  - `packages/domain-ar/*`
  - `packages/domain-ap/*`
  - `packages/domain-vat/*`
- Related future documents:
  - `docs/compliance/se/accounting-method-engine.md`
  - `docs/compliance/se/accounting-foundation.md`

# Purpose

Säkerställa att kontantmetod och faktureringsmetod ger deterministiskt, reproducerbart och lagligt korrekt timingutfall i ledger, AR, AP och VAT.

# Scope

- active method selection
- eligibility for cash method
- year-end catch-up
- method change at fiscal-year boundary
- VAT handoff timing

# Blocking risk

Fel här ger direkt risk för fel bokföring, fel moms och fel årsutfall.

# Golden scenarios covered

- cash accounting method
- invoice accounting method
- method change at new fiscal year
- ineligible cash method request

# Fixtures/golden data

- bolag under tre miljoner nettoomsättning
- bolag över tre miljoner nettoomsättning
- kundfaktura obetald vid årsskifte
- leverantörsfaktura obetald vid årsskifte

# Unit tests

- eligibility assessment
- active method lookup by date
- year-end catch-up selection

# Integration tests

- ledger integration
- AR/AP timing
- VAT handoff

# E2E tests

- byt metod inför nytt räkenskapsår
- kör årsskifte under kontantmetod

# Property-based tests where relevant

- ingen dag får ha två aktiva metodprofiler
- year-end catch-up väljer exakt öppna poster en gång

# Replay/idempotency tests where relevant

- omkörning av year-end catch-up skapar inte dubbel fångst

# Failure-path tests

- otillåtet cash-method bolag blockeras
- överlappande profil blockeras

# Performance expectations where relevant

- year-end catch-up ska skala över hela öppna poster-mängden utan dubbletter

# Acceptance criteria

- alla golden cases ger förväntat ledger- och VAT-timingutfall
- replay av samma körning är idempotent
- otillåtna profiländringar stoppas

# Exit gate

- [ ] testsviten täcker båda metoderna och årsskifte
- [ ] replay/idempotens är verifierad
- [ ] blockerande felvägar är gröna

