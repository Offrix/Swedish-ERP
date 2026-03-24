# Master metadata

- Document ID: POL-BRIDGE-002
- Title: Accounting Close Correction and Lock Policy
- Status: Superseded compatibility bridge
- Owner: Finance governance
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior primary `docs/policies/accounting-close-correction-and-lock-policy.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-document-manifest.md`
  - `docs/master-control/master-policy-matrix.md`
  - `docs/master-control/master-rebuild-control.md`
- Related domains:
  - close
  - ledger
  - annual reporting
- Related code areas:
  - `packages/domain-ledger/*`
  - `packages/domain-reporting/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/policies/close-correction-and-reopen-policy.md`

# Purpose

Denna fil finns kvar endast som kompatibilitetsbrygga för äldre close-referenser. Den är inte längre primär policykälla.

# Scope

Omfattar:

- mappning från äldre close/lock-termer till den nya primära policyn
- förklaring av hur äldre beskrivningar ska tolkas

Omfattar inte:

- nya close-regler
- nya reopen-regler

# Why it exists

Efter master-control-omtaget ligger den bindande close-regleringen i `docs/policies/close-correction-and-reopen-policy.md`. Den gamla filen måste finnas kvar som spårbar brygga tills alla historiska referenser fasats ut.

# Non-negotiable rules

1. Den nya bindande policyn för close, correction, reopen och lock är `docs/policies/close-correction-and-reopen-policy.md`.
2. Denna fil får inte användas som primär källa för ny implementation.
3. Alla nya lock-, reopen- och correctionflöden ska följa den nya policyn.
4. Historiska referenser i docs eller kod ska tolkas via den nya policyn.

# Allowed actions

- använda filen för att förstå äldre språkbruk
- använda filen som ompekning till den nya policyn

# Forbidden actions

- definiera nya reopen-regler här
- skapa runtime enforcement mot denna fil
- använda denna fil som källa för close workbench eller backoffice-beslut

# Approval model

Godkännandekedjor för close och reopen ägs nu av `docs/policies/close-correction-and-reopen-policy.md` och relevant SoD-policy.

# Segregation of duties where relevant

SoD för close-signoff och reopen styrs av:

- `docs/policies/close-correction-and-reopen-policy.md`
- `docs/policies/signoff-and-segregation-of-duties-policy.md`

# Audit and evidence requirements

- nya auditscheman ska peka på den nya policyn
- historiska referenser får bevaras för revisionsspår

# Exceptions handling

Inga nya undantag får definieras här.

# Backoffice/support restrictions where relevant

Backoffice får inte skapa egna close-undantag genom att hänvisa till denna fil.

# Runtime enforcement expectations

Runtime enforcement ska ligga i close- och ledgerdomänerna och följa den nya primära policyn.

# Test/control points

- verifiera att close implementation använder ny policy
- verifiera att reopen-logik inte längre hänvisar till denna fil som primär källa

# Exit gate

- [ ] denna fil används endast som historisk brygga
- [ ] ny close-logik och nya tester använder primärpolicy
