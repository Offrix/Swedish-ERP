# Master metadata

- Document ID: RB-009
- Title: Personalliggare Kiosk Device Trust
- Status: Binding
- Owner: Field compliance operations
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated personalliggare kiosk/device-trust runbook
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - personalliggare
  - field
  - mobile
- Related code areas:
  - `packages/domain-personalliggare/*`
  - `apps/field-mobile/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/compliance/se/personalliggare-engine.md`
  - `docs/policies/personalliggare-correction-policy.md`

# Purpose

Beskriva hur kiosk-enheter registreras, betros, spärras och återställs för personalliggare.

# When to use

- ny kioskaktivering
- device replacement
- offline incident
- suspected compromise

# Preconditions

- workplace är aktivt
- industry pack är aktiverat
- ansvarig operator är utsedd

# Required roles

- site owner
- compliance operator
- backoffice operator vid spärr eller återställning

# Inputs

- workplace id
- device identifier
- enrollment token

# Step-by-step procedure

1. Verifiera workplace, ansvarig organisation och industry pack.
2. Registrera enheten med unikt device id och enrollment metadata.
3. Aktivera device trust och knyt enheten till exakt workplace.
4. Kör verifierad test check-in/check-out.
5. Vid device byte eller incident: spärra gammal enhet innan ny aktiveras.
6. Vid offline-incident: säkra lokal kö, synka kontrollerat och öppna correction-fall om kollision upptäcks.

# Verification

- enheten är knuten till rätt workplace
- testevent synkar korrekt
- spärrad enhet kan inte fortsätta registrera godkända events

# Retry/replay behavior where relevant

- offlinekö får återförsökas idempotent
- samma attendance event får inte dubbelskapas när enhet kommer online

# Rollback/recovery

- felaktig device enrollment återtas genom device revoke och ny enrollment

# Incident threshold

misstänkt komprometterad kiosk eller oklar offlinekö är incident

# Audit and receipts

- enrollment record
- revoke record
- device trust status changes
- sync receipts

# Exit gate

- [ ] device trust är explicit och workplace-bundet
- [ ] revoke och reenroll fungerar utan dold state
- [ ] offline recovery är auditbar
