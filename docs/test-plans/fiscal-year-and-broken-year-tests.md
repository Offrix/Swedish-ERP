# Master metadata

- Document ID: TP-002
- Title: Fiscal Year and Broken Year Tests
- Status: Binding
- Owner: QA architecture and finance compliance testing
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated fiscal-year test plan
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-rulepack-register.md`
- Related domains:
  - fiscal year
  - ledger
  - reporting
  - annual reporting
- Related code areas:
  - `packages/domain-fiscal-year/*`
  - `packages/domain-ledger/*`
  - `packages/domain-reporting/*`
- Related future documents:
  - `docs/compliance/se/fiscal-year-and-period-engine.md`
  - `docs/runbooks/fiscal-year-change-runbook.md`

# Purpose

Säkerställa att räkenskapsår, brutet år, short year, extended year och periodkalender fungerar korrekt och förblir reproducerbara.

# Scope

- legal-form-based year eligibility
- broken year
- short and extended year
- year change requests
- period generation and period locks

# Blocking risk

Fel här smittar close, reporting, VAT, annual reporting och i vissa fall payroll.

# Golden scenarios covered

- broken fiscal year
- short year at onboarding
- extended year at change
- sole trader forced to calendar year
- group alignment

# Fixtures/golden data

- enskild näringsverksamhet
- aktiebolag med brutet år
- koncern med gemensamt år
- årsomläggning med godkänt undantag

# Unit tests

- legal-form validation
- length validation
- permission-required decision
- period generator

# Integration tests

- ledger/period binding
- close/lock integration
- reporting calendar reads

# E2E tests

- skapa brutet år i tillåtet bolag
- försök skapa brutet år i otillåten bolagsform
- lägg om år med korrekt tillståndsstatus

# Property-based tests where relevant

- perioder täcker hela året utan luckor eller överlapp
- extended year överstiger aldrig 18 månader

# Replay/idempotency tests where relevant

- omkörning av periodgenerering ger samma periodkalender

# Failure-path tests

- överlappande fiscal years nekas
- otillåten omläggning nekas

# Performance expectations where relevant

- periodgenerering och lookup ska vara stabil även för långa historikkedjor

# Acceptance criteria

- lagliga begränsningar följs
- periodkalendern är deterministisk
- close och reporting läser rätt år och period

# Exit gate

- [ ] alla årstyper och blockerande felvägar är testade
- [ ] periodgeneratorn är idempotent
- [ ] legal-form-regler är verifierade
