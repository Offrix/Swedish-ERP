> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: RB-001
- Title: Async Job Retry, Replay and Dead Letter
- Status: Binding
- Owner: Platform operations
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/runbooks/async-job-retry-replay-and-dead-letter.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-policy-matrix.md`
  - `docs/master-control/master-domain-map.md`
- Related domains:
  - jobs
  - replay
  - backoffice
- Related code areas:
  - `apps/worker/*`
  - `apps/backoffice/*`
  - `packages/domain-core/*`
- Related future documents:
  - `docs/domain/async-jobs-retry-replay-and-dead-letter.md`
  - `docs/policies/emergency-disable-policy.md`

# Purpose

Beskriva hur asynkrona jobb övervakas, återförsöks, replayas och hanteras när de når dead-letter utan att skapa dubbel effekt eller förlorad spårbarhet.

# When to use

- när jobb fastnar i `retry_scheduled`, `running`, `dead_lettered` eller `downstream_unknown`
- när extern adapter varit nere
- när en release kräver kontrollerad omkörning

# Preconditions

- operator har åtkomst till jobboperatörsyta, audit explorer och relevanta domänloggar
- jobbtypens retry-, timeout- och riskklasspolicy finns
- relevant domänägare är informerad om jobbet kan påverka pengarisk eller myndighetsflöde

# Required roles

- operator
- domain owner
- security or compliance approver för högriskreplay

# Inputs

- job id eller avgränsad jobbgrupp
- correlation id
- felklass
- incident- eller change reference

# Step-by-step procedure

1. Identifiera scope:
   - filtrera på jobbtyp, tenant, korrelations-id och felklass
2. Klassificera felet:
   - `transient_technical`
   - `persistent_technical`
   - `business_input`
   - `downstream_unknown`
3. Pausa massfel:
   - stoppa eller degrade:a jobbklass om systemiskt fel pågår
4. Verifiera idempotens:
   - kontrollera om side effects redan finns
   - kontrollera om samma idempotensnyckel redan lyckats
5. Välj åtgärd:
   - enkel retry
   - replay from source
   - cancel superseded
   - manual action
6. Utför åtgärden via officiella kommandon, aldrig via direkt statusmutation
7. Verifiera nytt utfall och stäng eller eskalera fallet

# Verification

- jobb är tillbaka i stabil terminal state
- inga dubbla side effects finns
- eventuell incident är uppdaterad med utfall och orsak

# Retry/replay behavior where relevant

- retry ska använda befintlig policy och inte nollställa attempt-historik
- replay ska alltid länka till ursprungsjobb och bära reason code
- högriskreplay kräver godkännande

# Rollback/recovery

- om replay skapar felaktig effekt ska respektive domäns correction chain användas
- vid systemiskt fel ska jobbklassen disable:as via policy innan ny replay görs

# Incident threshold

Incident ska öppnas när:

- samma jobbklass dead-letteras i serie
- okänt utfall riskerar pengarisk eller submission
- ködjup eller timeout-rate passerar definierad tröskel

# Audit and receipts

Audit ska visa:

- ursprungsjobb
- operatör
- replay reason
- approval
- resultat

# Exit gate

- [ ] alla berörda jobb är triagerade
- [ ] replay eller cancel är auditloggat
- [ ] inga kvarvarande högriskjobb saknar owner

