> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: TP-005
- Title: Document Classification AI Boundary Tests
- Status: Binding
- Owner: QA architecture and AI governance testing
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated test plan
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-policy-matrix.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - AI
  - documents
  - review center
- Related code areas:
  - `packages/rule-engine/*`
  - `packages/document-engine/*`
  - `packages/domain-review-center/*`
- Related future documents:
  - `docs/policies/ai-decision-boundary-policy.md`

# Purpose

Bevisa att AI-förslag i dokumentklassning aldrig blir slutliga ekonomiska beslut utan att policy och runtime gränsen håller.

# Scope

- OCR suggestions
- AI classification suggestions
- confidence thresholds
- mandatory review
- rulepack precedence

# Blocking risk

Fel här gör att AI riskerar att bli ekonomisk beslutsmotor.

# Golden scenarios covered

- low confidence classification
- conflicting rulepack vs AI suggestion
- high confidence but policy-blocked suggestion
- manual override with audit

# Fixtures/golden data

- dokument där AI föreslår fel privat/bolag
- dokument där rulepack och AI inte matchar
- dokument med osäker friskvård

# Unit tests

- confidence threshold
- rulepack precedence
- review trigger creation

# Integration tests

- AI suggestion -> review center
- override audit
- blocked dispatch to downstream domain

# E2E tests

- AI föreslår otillåten behandling och stoppas
- mänsklig godkänd override dispatchas korrekt

# Property-based tests where relevant

- utan godkänt reviewutfall får ingen AI-driven treatment nå final dispatch

# Replay/idempotency tests where relevant

- omspelning av samma AI-suggestion skapar inte dubbel review item eller dubbel downstream dispatch

# Failure-path tests

- missing model metadata blockerar suggestion acceptance
- hidden confidence blockerar UI-approval

# Performance expectations where relevant

- review creation ska hålla vid stora dokumentbatcher

# Acceptance criteria

- AI kan aldrig ensam fatta slutligt ekonomiskt beslut
- auditkedjan visar model/version/confidence
- rulepack vinner alltid över AI där konflikt finns

# Exit gate

- [ ] AI-boundary är verifierad i runtime
- [ ] reviewkrav fungerar
- [ ] downstream dispatch utan godkännande är blockerad

