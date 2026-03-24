# Master metadata

- Document ID: RB-003
- Title: Incident Response and Production Hotfix
- Status: Binding
- Owner: Platform operations and security operations
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/runbooks/incident-response-and-production-hotfix.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-policy-matrix.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-rebuild-control.md`
- Related domains:
  - incident management
  - backoffice
  - emergency disable
- Related code areas:
  - `apps/backoffice/*`
  - `apps/api/*`
  - `apps/worker/*`
- Related future documents:
  - `docs/policies/emergency-disable-policy.md`
  - `docs/runbooks/backup-restore-and-disaster-recovery.md`

# Purpose

Beskriva hur incidenter startas, stabiliseras, hotfixas och stängs utan att audit, SoD eller återställningsförmåga förloras.

# When to use

- produktionsincident
- säkerhetsincident
- akut hotfix
- break-glass-läge

# Preconditions

- incidentkanal och kontaktväg finns
- observability och deploypipeline är tillgängliga
- emergency-disable-funktioner är kända

# Required roles

- incident lead
- technical lead
- communications owner
- scribe
- domain owner vid reglerade flöden

# Inputs

- incident id
- severity
- initial impact statement
- systemscope

# Step-by-step procedure

1. Starta incident och tilldela roller.
2. Samla första fakta: starttid, kundpåverkan, datapåverkan, regulatorisk risk.
3. Aktivera freeze eller emergency disable vid behov.
4. Bestäm om hotfix, rollback eller restore är rätt väg.
5. Om hotfix behövs:
   - begränsa scope till minsta möjliga fix
   - kör riktade tester
   - deploya med tydlig rollback-plan
6. Om manuellt prod-ingrepp krävs:
   - logga allt
   - stoppa konkurrerande workers om data riskerar att bli inkonsistent
7. Verifiera resultat med smoke tests och observability.
8. Stäng incident först efter dokumenterad stabilitet och uppföljningsplan.

# Verification

- impact är uppdaterad
- mitigering eller fix fungerar
- inga oklara manuella prod-ingrepp finns
- uppföljning är skapad

# Retry/replay behavior where relevant

- replay ska ske först efter att incidentorsaken är åtgärdad
- submission- eller betalningsreplay kräver särskild kontroll

# Rollback/recovery

- rollback av deploy går före improviserad kodpatch om det snabbare återställer säkert läge
- dataåterställning följer separat DR-runbook

# Incident threshold

Incidentnivå ska höjas när:

- pengarisk eller regulatorisk påverkan finns
- flera tenants påverkas
- datakvalitet eller auditspår riskeras

# Audit and receipts

Audit ska visa:

- incident id
- aktiverade kill switches
- hotfix release id
- manuella prod-åtgärder
- godkännanden

# Exit gate

- [ ] incident är stabiliserad eller stängd
- [ ] hotfix eller rollback är verifierad
- [ ] manuella åtgärder är dokumenterade
- [ ] efterarbete och dokumentuppdatering är skapad
