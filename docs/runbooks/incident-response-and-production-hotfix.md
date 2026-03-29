> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: RB-003
- Title: Incident Response and Production Hotfix
- Status: Binding
- Owner: Platform operations and security operations
- Version: 2.1.0
- Effective from: 2026-03-26
- Supersedes: Prior `docs/runbooks/incident-response-and-production-hotfix.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-26
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

Beskriva hur incidenter startas, triageras, stabiliseras, hotfixas, post-reviewas och stangs utan att audit, SoD eller aterstallningsformaga forloras.

# When to use

- produktionsincident
- sakerhetsincident
- akut hotfix
- break-glass-lage

# Preconditions

- incidentkanal och kontaktvag finns
- observability och deploypipeline ar tillgangliga
- emergency-disable-funktioner ar kanda

# Required roles

- incident lead
- technical lead
- communications owner
- scribe
- domain owner vid reglerade floden

# Inputs

- incident id
- severity
- initial impact statement
- systemscope

# Step-by-step procedure

1. Starta incident och tilldela roller.
2. Samla forsta fakta: starttid, kundpaverkan, datapaverkan, regulatorisk risk.
3. Triagera incidenten och faststall impacted scope.
4. Aktivera freeze eller emergency disable vid behov.
5. Bestam om hotfix, rollback eller restore ar ratt vag.
6. Om hotfix behovs:
   - begransa scope till minsta mojliga fix
   - kor riktade tester
   - deploya med tydlig rollback-plan
7. Om manuellt prod-ingrepp kravs:
   - logga allt
   - stoppa konkurrerande workers om data riskerar att bli inkonsistent
8. Verifiera resultat med smoke tests och observability.
9. Markera incident som resolved nar stabilitet och omedelbar mitigering ar verifierad.
10. Genomfor post-review med root cause, impact scope, corrective/preventive actions och uttrycklig break-glass-genomgang om break-glass anvandes.
11. Stang incident forst efter dokumenterad post-review och uppfoljningsplan.

# Verification

- impact ar uppdaterad
- mitigering eller fix fungerar
- inga oklara manuella prod-ingrepp finns
- post-review finns nar incidenten har stangts
- uppfoljning ar skapad

# Retry/replay behavior where relevant

- replay ska ske forst efter att incidentorsaken ar atgardad
- submission- eller betalningsreplay kraver sarskild kontroll

# Rollback/recovery

- rollback av deploy gar fore improviserad kodpatch om det snabbare aterstaller sakert lage
- dataaterstallning foljer separat DR-runbook

# Incident threshold

Incidentniva ska hojas nar:

- pengarisk eller regulatorisk paverkan finns
- flera tenants paverkas
- datakvalitet eller auditspor riskeras

# Audit and receipts

Audit ska visa:

- incident id
- aktiverade kill switches
- hotfix release id
- manuella prod-atgarder
- godkannanden
- post-review och break-glass-spor

# Exit gate

- [ ] incident ar stabiliserad eller stangd
- [ ] hotfix eller rollback ar verifierad
- [ ] manuella atgarder ar dokumenterade
- [ ] post-review ar genomford och dokumenterad
- [ ] efterarbete och dokumentuppdatering ar skapad

