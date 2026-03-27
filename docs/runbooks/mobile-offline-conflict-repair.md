> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: RB-011
- Title: Mobile Offline Conflict Repair
- Status: Binding
- Owner: Field operations and support operations
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/runbooks/mobile-offline-conflict-repair.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - offline
  - field
  - personalliggare
- Related code areas:
  - `apps/field-mobile/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/domain/offline-sync-and-conflict-resolution.md`
  - `docs/ui/FIELD_MOBILE_SPEC.md`

# Purpose

Beskriva hur mobile offline-konflikter isoleras, åtgärdas och verifieras utan att förstöra auditkedjan.

# When to use

- sync conflict
- duplicate client mutation
- corrupted local queue
- obsolete pending state

# Preconditions

- conflict id eller affected object är identifierat
- device och user scope är känt

# Required roles

- support operator
- field lead where business choice behövs
- backoffice operator for scoped repair

# Inputs

- conflict record
- sync envelopes
- server object version

# Step-by-step procedure

1. Verifiera konfliktens typ och vilket objekt som berörs.
2. Kontrollera om policyn säger server wins, local wins eller manual resolution.
3. För duplicate envelopes: bekräfta idempotent serverutfall och markera lokalt envelope `obsolete`.
4. För versionkonflikt: skapa resolution record och välj godkänt utfall enligt policy.
5. För korrupt lokal kö: isolera skadad post, synka resterande kö och dokumentera separat repair.
6. Bekräfta för användaren vilket utfall som gäller och vilken data som eventuellt gick förlorad.

# Verification

- affected object har ett tydligt slutligt serverläge
- local pending state stämmer med servern
- auditkedjan visar både konflikt och resolution

# Retry/replay behavior where relevant

- replay av envelope får bara ske när conflict record tillåter det

# Rollback/recovery

- felaktig resolution kräver ny resolution chain eller correction i källdomän

# Incident threshold

masskonflikt, upprepad queue corruption eller dataförlust är incident

# Audit and receipts

- conflict record
- repair action
- final server receipt

# Exit gate

- [ ] varje konflikt får tydlig resolution
- [ ] lokal och serverbaserad status är synkad efter repair
- [ ] support kan reparera utan att manipulera rådata osynligt

