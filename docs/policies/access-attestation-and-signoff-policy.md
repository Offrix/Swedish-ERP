# Master metadata

- Document ID: POL-BRIDGE-001
- Title: Access Attestation and Signoff Policy
- Status: Superseded compatibility bridge
- Owner: Security governance and approval governance
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior primary `docs/policies/access-attestation-and-signoff-policy.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-document-manifest.md`
  - `docs/master-control/master-policy-matrix.md`
  - `docs/master-control/master-rebuild-control.md`
- Related domains:
  - auth
  - approvals
  - signoff
  - segregation of duties
- Related code areas:
  - `packages/domain-org-auth/*`
  - `packages/domain-core/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/policies/signoff-and-segregation-of-duties-policy.md`

# Purpose

Denna fil finns kvar endast som kompatibilitetsbrygga för historiska referenser. Den är inte längre primär policykälla.

# Scope

Omfattar:

- mappning från äldre begrepp i repo:t till den nya bindande SoD- och signoff-policyn
- förklaring av hur äldre referenser ska tolkas

Omfattar inte:

- nya behörighets- eller signoffregler
- nya SoD-krav

# Why it exists

Repo:t innehåller äldre hänvisningar till "access attestation" och "signoff" som tidigare låg samlat här. Efter master-control-omtaget ligger den bindande regleringen i:

- `docs/policies/signoff-and-segregation-of-duties-policy.md`
- `docs/policies/support-access-and-impersonation-policy.md`
- `docs/policies/security-admin-and-incident-policy.md`

# Non-negotiable rules

1. Den nya bindande policyn för signoff och SoD är `docs/policies/signoff-and-segregation-of-duties-policy.md`.
2. Denna fil får inte användas som primär källa för ny implementation.
3. Om äldre docs eller kod kommenterar "access attestation" ska tolkningen göras via ny SoD-policy och inte via historiska formuleringar här.
4. Historiska referenser får bevaras för spårbarhet men får inte styra nya UI-, API- eller policybeslut.

# Allowed actions

- använda filen som mappningstabell för äldre språkbruk
- använda filen för att förstå varför äldre referenser ersatts
- länka vidare internt till ny bindande policy

# Forbidden actions

- skapa nya regler utifrån denna fil
- citera denna fil som slutlig källa för signoffklasser
- bygga UI- eller behörighetslogik direkt från denna fil

# Approval model

Alla nya godkännandekrav ska hämtas från `docs/policies/signoff-and-segregation-of-duties-policy.md`.

# Segregation of duties where relevant

SoD-regler ägs nu helt av `docs/policies/signoff-and-segregation-of-duties-policy.md`.

# Audit and evidence requirements

- historiska referenser får finnas kvar
- alla nya auditscheman, reviewbeslut och runtime-enforcements ska peka på den nya primära policyn

# Exceptions handling

Inga nya undantag får definieras här.

# Backoffice/support restrictions where relevant

Support-, impersonation- och break-glass-regler ägs nu av:

- `docs/policies/support-access-and-impersonation-policy.md`
- `docs/policies/security-admin-and-incident-policy.md`

# Runtime enforcement expectations

Runtime enforcement ska implementeras mot den nya SoD-policyn, inte mot denna bryggfil.

# Test/control points

- verifiera att inga nya implementationer hänvisar till denna fil som primär policy
- verifiera att äldre referenser är ompekade i ny dokumentation

# Exit gate

- [ ] denna fil används endast som historisk brygga
- [ ] primär implementation använder den nya SoD-policyn
