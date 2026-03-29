> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: TP-004
- Title: Document Person Payroll AGI Tests
- Status: Binding
- Owner: QA architecture and payroll compliance testing
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated test plan
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - documents
  - classification
  - benefits
  - payroll
  - AGI
- Related code areas:
  - `packages/document-engine/*`
  - `packages/domain-document-classification/*`
  - `packages/domain-benefits/*`
  - `packages/domain-payroll/*`
- Related future documents:
  - `docs/compliance/se/person-linked-document-classification-engine.md`

# Purpose

Bevisa att dokument med personpåverkan går korrekt från intake till klassning, payrollpåverkan och AGI utan att AI eller OCR blir slutlig beslutsmotor.

# Scope

- privata köp
- utlägg
- förmåner
- nettolöneavdrag
- friskvård
- split cases

# Blocking risk

Fel här ger direkt risk för fel lön, fel AGI och fel bokföring.

# Golden scenarios covered

- private spend on company card
- reimbursable outlay
- taxable benefit
- net salary deduction
- wellness within threshold
- wellness over threshold
- mixed document split

# Fixtures/golden data

- företagskortsköp privat
- utlägg med korrekt underlag
- friskvård inom och över gräns
- dokument med både privat och bolagsdel

# Unit tests

- treatment-line split
- person-link validation
- review trigger rules

# Integration tests

- document -> classification
- classification -> benefits
- classification -> payroll
- payroll -> AGI constituent

# E2E tests

- privatköp via företagskort till nettolöneavdrag
- friskvård som passerar review och blir korrekt utfall

# Property-based tests where relevant

- samma line kan inte bli två inkompatibla treatment types

# Replay/idempotency tests where relevant

- omdispatch av approved intent skapar inte dubbla payroll outcomes

# Failure-path tests

- saknad personlink blockerar
- låg confidence går till review
- AI-förslag utan approval når inte payroll

# Performance expectations where relevant

- batchklassning ska klara stora intakevolymer utan förlorad auditkedja

# Acceptance criteria

- hela kedjan är spårbar
- inga otillåtna direkthopp från OCR till payroll
- review fångar tvetydiga fall

# Exit gate

- [ ] golden cases är gröna
- [ ] replay och idempotens fungerar
- [ ] AGI byggs bara på godkända intents

