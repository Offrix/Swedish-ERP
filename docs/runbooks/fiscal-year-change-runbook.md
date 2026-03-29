> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: RB-012
- Title: Fiscal Year Change Runbook
- Status: Binding
- Owner: Finance operations
- Version: 1.1.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated fiscal year change runbook
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-policy-matrix.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - fiscal year
  - ledger
  - reporting
  - annual reporting
- Related code areas:
  - `packages/domain-fiscal-year/*`
  - `packages/domain-ledger/*`
  - `packages/domain-reporting/*`
- Related future documents:
  - `docs/compliance/se/fiscal-year-and-period-engine.md`
  - `docs/compliance/se/legal-form-and-declaration-engine.md`
  - `docs/runbooks/annual-close-and-filing-by-legal-form.md`

# Purpose

Beskriva hur omläggning eller ändring av räkenskapsår genomförs utan att förstöra periodkalender, locks, declaration profiles eller annual snapshots.

# When to use

- byte mellan kalenderår och brutet år
- kort eller förlängt räkenskapsår
- initial setup correction
- legal-form-driven ändring där filing profile påverkas av ny year shape

# Preconditions

- relevant godkännande finns
- öppna close blockers är kända
- påverkat år och efterföljande perioder är identifierade
- legal-form och declaration profile-konsekvenser är analyserade
- pågående annual packages för berört scope är identifierade

# Required roles

- finance owner
- controller
- compliance owner vid reglerad ändring
- annual reporting owner om annual package finns eller planeras

# Inputs

- current fiscal year profile
- requested new year boundaries
- lock state
- annual filing state
- legal-form profile
- active reporting obligation profile

# Step-by-step procedure

1. Verifiera att omläggning är tillåten enligt rulepack, legal form och aktuell extern regelbild.
2. Identifiera om ändringen påverkar öppna perioder, filings, tax packages, annual packages eller receipt chains.
3. Frys ny periodgenerering och markera change window för berörda bolag.
4. Skapa fiscal-year change request med nytt start- och slutdatum, change reason och effective-from.
5. Beräkna om ändringen skapar kort år, förlängt år eller endast framtida boundary-förskjutning.
6. Kör formspecifik konsekvenskontroll:
   - enskild näringsverksamhet: kontrollera att kalenderårsregeln fortfarande respekteras eller att tillåten undantagsväg används
   - AB och ekonomisk förening: kontrollera filing window och annual-report prerequisites
   - HB/KB: kontrollera om declaration profile eller reporting obligation påverkas
7. Skapa ny fiscal-year profile och regenerera periodkalender för framtida scope utan att skriva över historisk profil.
8. Kör downstream-rebuild för reporting calendars, close calendars och annual readiness projections.
9. Verifiera att locks, reporting periods, declaration profiles och annual prerequisites följer ny modell.
10. Publicera ändringen, aktivera ny profile och dokumentera om kort eller förlängt räkenskapsår skapats.

# Verification

- historiskt år ligger kvar oförändrat
- nya perioder har rätt gränser
- reporting och annual dependencies pekar på rätt fiscal-year profile
- legal-form-specific filing profile har räknats om där så krävs
- inga gamla packages eller receipts har muterats

# Retry/replay behavior where relevant

- pre-activation kan ändringen ersättas av ny request version
- efter aktivering krävs ny correction/change chain
- projektioner och read models får replayas, men historiska snapshots får inte skrivas om

# Rollback/recovery

- rollback sker genom ny fiscal-year profile, inte genom mutation av aktiverad historik
- om ny profile aktiverats felaktigt ska correction request öppnas och impacted annual readiness markeras invalid tills omräkning är klar

# Incident threshold

Följande är incident:

- felaktig periodkalender
- ändring som krockar med filing
- ändring som flyttar historiska close locks
- ändring som orsakar fel declaration profile eller fel annual package readiness

# Audit and receipts

- change request
- approvals
- old/new year profile
- generated periods
- consequence analysis snapshot
- impacted package list

# Exit gate

- [ ] ändringen är historiskt spårbar
- [ ] nya perioder och locks är verifierade
- [ ] annual, reporting och declaration profiles pekar på rätt räkenskapsårsprofil
- [ ] inga historiska packages eller receipts har muterats

