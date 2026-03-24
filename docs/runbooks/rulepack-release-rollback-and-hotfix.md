# Master metadata

- Document ID: RB-004
- Title: Rulepack Release, Rollback and Hotfix
- Status: Binding
- Owner: Platform operations and compliance operations
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated rulepack runbook
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rulepack-register.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-policy-matrix.md`
- Related domains:
  - rule-engine
  - all rulepack consumers
- Related code areas:
  - `packages/rule-engine/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/policies/rulepack-release-and-rollback-policy.md`

# Purpose

Beskriva den operativa processen för att publicera, framtidsdatera, rollbacka och hotfixa rulepacks.

# When to use

- normal release av rulepack
- rollback av felaktig version
- hotfix av kritisk regel

# Preconditions

- test evidence finns
- approvals enligt policy finns
- impact assessment är klar

# Required roles

- domain owner
- compliance owner vid högrisk
- operations owner

# Inputs

- rulepack code
- ny version
- effective date
- rollback plan
- test references

# Step-by-step procedure

1. Verifiera approvals och testbevis.
2. Verifiera effective date och att ingen overlap finns.
3. Publicera ny version som append-only record.
4. Om release är framtidsdaterad, verifiera att ingen aktiv version bryts.
5. Vid rollback:
   - stoppa fortsatt aktivering av fel version
   - aktivera tidigare eller korrigerad version
   - dokumentera replaybedömning
6. Vid hotfix:
   - skapa särskild change reference
   - använd snävt scope
   - kör efterkontroll direkt efter aktivering

# Verification

- aktiv version är korrekt
- historiska versioner är oförändrade
- konsumentdomäner kan läsa rätt version

# Retry/replay behavior where relevant

- bedöm om framtida objekt räcker eller om historiskt replay krävs
- massreplay får inte startas utan godkännande

# Rollback/recovery

- rollback skapar eller återaktiverar version, aldrig muterar gammal version
- om fel version hunnit påverka data krävs separat correction/replay-plan

# Incident threshold

Felaktig rulepack-release som påverkar reglerade utfall ska hanteras som incident.

# Audit and receipts

Spara:

- version
- approvals
- effective dates
- rollback reason
- replay decision

# Exit gate

- [ ] release eller rollback är auditloggad
- [ ] rätt aktiv version är verifierad
- [ ] replaybehov är dokumenterat
