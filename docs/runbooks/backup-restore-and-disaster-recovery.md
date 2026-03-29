> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: RB-002
- Title: Backup, Restore and Disaster Recovery
- Status: Binding
- Owner: Platform operations and resilience engineering
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/runbooks/backup-restore-and-disaster-recovery.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-gap-register.md`
- Related domains:
  - runtime
  - persistence
  - recovery
- Related code areas:
  - `packages/db/*`
  - `apps/api/*`
  - `apps/worker/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/domain/async-jobs-retry-replay-and-dead-letter.md`
  - `docs/runbooks/incident-response-and-production-hotfix.md`

# Purpose

Beskriva hur databaser, objektlagring, jobb och härledda index återställs kontrollerat efter dataförlust, korruption eller större driftincident.

# When to use

- dataförlust
- misstänkt datakorruption
- återställning till tidigare tidpunkt
- full DR-övning

# Preconditions

- backup-policyer är definierade
- PITR eller motsvarande finns där det krävs
- isolerad återställningsmiljö kan skapas

# Required roles

- incident lead
- database operator
- platform operator
- relevant domain owner vid reglerade data

# Inputs

- incident id
- restore target timestamp
- scope för data och system
- godkänd restore plan

# Step-by-step procedure

1. Frys skrivande trafik och riskfyllda workers.
2. Identifiera restore point och vilket datafönster som påverkas.
3. Återställ först till isolerad miljö.
4. Verifiera schema, migrationsnivå, datavolymer och kritiska tabeller.
5. Återställ objektlagring och andra binära underlag.
6. Rebuild index, caches och read models från återställd källa.
7. Replaya endast idempotenta jobb eller outbox-händelser som behöver återskapas.
8. Kör smoke tests innan trafik öppnas.

# Verification

- återställd miljö är konsistent
- kritiska flöden kan läsas och verifieras
- inga oplanerade dubletter uppstår från replay

# Retry/replay behavior where relevant

- replay efter restore ska ske i kontrollerade batcher
- jobb med okänt slututfall får inte replayas blint

# Rollback/recovery

- om restorepunkt visar sig vara fel ska ny restore göras från annan tidpunkt
- skrivande trafik får förbli blockerad tills konsistens är verifierad

# Incident threshold

Alla återställningar utanför övningsmiljö ska behandlas som incident eller change av hög prioritet.

# Audit and receipts

Följande ska sparas:

- restorepoint
- scope
- operatörer
- verifieringsprotokoll
- tid till återställning

# Exit gate

- [ ] restorepoint är dokumenterad
- [ ] isolerad verifiering är gjord
- [ ] smoke tests är gröna
- [ ] återöppning av trafik är godkänd

