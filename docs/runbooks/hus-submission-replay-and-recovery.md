> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: RB-010
- Title: HUS Submission Replay and Recovery
- Status: Binding
- Owner: Finance operations
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated HUS replay and recovery runbook
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-policy-matrix.md`
- Related domains:
  - HUS
  - integrations
  - AR
- Related code areas:
  - `packages/domain-hus/*`
  - `packages/domain-integrations/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/compliance/se/hus-invoice-and-claim-gates.md`
  - `docs/policies/hus-signing-and-submission-policy.md`

# Purpose

Beskriva hur HUS-claims replayas, rättas och återvinns efter tekniskt fel, delgodkännande eller återkravsscenario.

# When to use

- tekniskt submissionsfel
- saknad receipt
- delgodkännande
- recovery efter kredit eller korrigering

# Preconditions

- relevant claim version är identifierad
- policygodkännande finns för replay eller recovery

# Required roles

- HUS operator
- compliance approver vid högrisk
- backoffice operator för replay

# Inputs

- hus_case_id
- claim_version_id
- receipt chain
- decision details

# Step-by-step procedure

1. Verifiera att rätt claim version och payload hash är vald.
2. Avgör om felet är tekniskt, materiellt eller efterföljande ekonomiskt.
3. Vid tekniskt fel utan beslut: använd kontrollerad replay av samma claim version.
4. Vid materiell avvikelse: skapa ny claim version eller recovery candidate enligt HUS policy.
5. Vid delgodkännande eller recovery: öppna differensärende, bokför korrekt beloppsskillnad och dokumentera kundutfall.
6. Stäng ärendet först när receipt chain, beslut och ekonomisk konsekvens är kompletta.

# Verification

- replay riktar sig mot rätt version
- nytt eller gammalt receipt-spår är begripligt
- recovery-belopp matchar korrekt differens

# Retry/replay behavior where relevant

- replay av samma claim version ska vara idempotent mot transporten
- ny claim version får inte skickas som “replay”

# Rollback/recovery

- felaktig replay öppnar ny incident och kräver särskild correction chain

# Incident threshold

saknat beslutsspår, fel recovery-belopp eller dubbelsubmission är incident

# Audit and receipts

- selected claim version
- replay id
- decision evidence
- recovery evidence

# Exit gate

- [ ] replay och new-version paths hålls tydligt isär
- [ ] delgodkännande och recovery ger full ekonomisk och auditbar konsekvens
- [ ] HUS-operatören kan följa receipt chain från början till slut

