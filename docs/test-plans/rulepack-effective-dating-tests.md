# Master metadata

- Document ID: TP-003
- Title: Rulepack Effective Dating Tests
- Status: Binding
- Owner: QA architecture and compliance platform testing
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated rulepack effective-dating test plan
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rulepack-register.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - rule-engine
  - all rulepack consumers
- Related code areas:
  - `packages/rule-engine/*`
  - `packages/domain-*/*`
- Related future documents:
  - `docs/policies/rulepack-release-and-rollback-policy.md`

# Purpose

Bevisa att rulepacks väljs korrekt per datum, version och replay-situation utan att historiska beslut skrivs om.

# Scope

- effective-from/effective-to
- version selection
- historical pinning
- rollback
- replay after new rulepack release

# Blocking risk

Fel här gör hela complianceplattformen opålitlig.

# Golden scenarios covered

- future-dated release
- overlapping versions denied
- rollback to prior version
- replay under historical pinning

# Fixtures/golden data

- minst två versioner av samma rulepack
- framtidsdaterad release
- historiskt bedömt objekt

# Unit tests

- rule selection by date
- overlap validation
- rollback activation rules

# Integration tests

- domain consumer reads correct version
- audit stores selected version

# E2E tests

- publicera ny version och verifiera att äldre objekt inte ändras
- rollbacka aktiv version och verifiera nytt urval för framtida objekt

# Property-based tests where relevant

- det finns alltid högst en aktiv version per rulepack och datum

# Replay/idempotency tests where relevant

- replay med historiskt pinad version ger samma utfall
- replay med uttryckligt re-evaluate-läge ger nytt utfall bara där policy tillåter

# Failure-path tests

- överlappande effective dates nekas
- release utan approval eller test evidence nekas

# Performance expectations where relevant

- versionsval ska vara stabilt vid hög samtidighet och många tenants

# Acceptance criteria

- historiska beslut förblir reproducerbara
- rollback fungerar utan mutation av äldre versioner
- konsumentdomäner kan visa vald rulepack-version

# Exit gate

- [ ] effective-dating logik är verifierad
- [ ] rollback fungerar korrekt
- [ ] replay följer policy för historisk pinning
