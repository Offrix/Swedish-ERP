> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: RB-013
- Title: Annual Close and Filing by Legal Form
- Status: Binding
- Owner: Finance operations and annual reporting operations
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated annual close and filing by legal form runbook
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-policy-matrix.md`
- Related domains:
  - annual reporting
  - legal form
  - close
  - reporting
  - fiscal year
- Related code areas:
  - `packages/domain-annual-reporting/*`
  - `packages/domain-legal-form/*`
  - `packages/domain-reporting/*`
  - `packages/domain-fiscal-year/*`
- Related future documents:
  - `docs/compliance/se/legal-form-and-declaration-engine.md`
  - `docs/compliance/se/annual-reporting-engine.md`
  - `docs/test-plans/annual-reporting-by-legal-form-tests.md`

# Purpose

Beskriva den operativa körordningen för annual close, package build, signoff och filing per företagsform.

# When to use

- vid ordinarie årsstängning
- vid correction package efter omprövning eller reopen
- när legal-form profile eller reporting-obligation profile ändrats för aktuellt år

# Preconditions

- räkenskapsår är låst i relevant close state
- annual blockers är genomgångna
- legal-form snapshot är aktivt och godkänt
- reporting-obligation profile är beräknad och godkänd
- deklarationsprofil är vald
- alla receipts från tidigare submissions för samma år är hämtade och registrerade

# Required roles

- finance owner
- close signatory
- annual reporting operator
- tax signatory där skattepaket kräver det
- backoffice support endast för teknisk replay, aldrig för affärsbeslut

# Inputs

- fiscal-year snapshot
- legal-form snapshot
- reporting-obligation profile
- declaration profile
- close checklist outcome
- reportsnapshot package
- signatory profile

# Step-by-step procedure

1. Verifiera att close-status, fiscal-year state och legal-form snapshot avser samma räkenskapsår.
2. Kör formspecifik readiness-kontroll:
   - AB: årsredovisningskrav, signatory chain, Inkomstdeklaration 2-profile
   - ekonomisk förening: årsredovisningskrav, signatory chain, Inkomstdeklaration 2-profile
   - HB/KB: Inkomstdeklaration 4-profile och separat kontroll av eventuell årsredovisningsskyldighet
   - enskild näringsverksamhet: NE-/NEA-path, årsbokslutsprofil och kalenderårs-/undantagskontroll
3. Bygg annual package och evidence pack från låsta snapshots.
4. Kontrollera att package family stämmer med legal-form och reporting-obligation profile.
5. Starta signoff-kedjan med rätt signatory class för formen.
6. När signoff är komplett:
   - skapa filing submission för relevant family
   - skicka package eller markera ready-for-external-filing beroende på adapterstöd
7. Vänta in teknisk kvittens och därefter domänkvittens eller annan operatorbekräftelse.
8. Om teknisk eller domänmässig avvikelse uppstår:
   - skapa incident eller correction path
   - öppna ny package version endast om source data eller package contents ändrats
9. Lås packageversion och uppdatera annual completion state.

# Verification

- packageversionen är byggd från rätt snapshots
- legal-form path är korrekt vald
- signatory chain är fullständig
- receiptkedjan är komplett
- correction chain saknas eller är korrekt länkad

# Retry/replay behavior where relevant

- tekniska submissions får replayas utan att packageversion skrivs om
- ny packageversion får bara skapas när source fingerprint ändrats eller correction krävs

# Rollback/recovery

- rollback av transport sker via replay eller ny attempt
- rollback av affärsbeslut sker via correction package, aldrig genom mutation av skickad package

# Incident threshold

Incident utlöses om:

- fel legal-form path valts
- package family inte matchar reporting-obligation profile
- signatory chain blivit fel
- receipt saknas eller kopplats till fel packageversion

# Audit and receipts

- readiness check snapshot
- package hash
- evidence pack hash
- signatory chain
- submission attempts
- technical and domain receipts
- correction links

# Exit gate

- [ ] varje företagsform följer rätt package family
- [ ] signatory chain och receipt chain är komplett
- [ ] replay och correction skiljs åt
- [ ] annual completion state speglar verklig package- och receiptstatus

