> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: POL-013
- Title: Support Access and Impersonation Policy
- Status: Binding
- Owner: Support governance and security governance
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/policies/support-access-and-impersonation-policy.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-policy-matrix.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-domain-map.md`
- Related domains:
  - backoffice
  - auth
  - support
  - audit
- Related code areas:
  - `packages/domain-org-auth/*`
  - `packages/domain-core/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/domain/audit-review-support-and-admin-backoffice.md`
  - `docs/policies/security-admin-and-incident-policy.md`

# Purpose

Styra när supportåtkomst, impersonation och break-glass får användas och vilka gränser som gäller för att skydda kunddata, SoD och revisionsspår.

# Scope

Policyn gäller:

- supportärenden
- read-only impersonation
- write-capable impersonation
- break-glass
- supportdiagnostik och replay via officiella verktyg

# Why it exists

Support behöver ibland se eller reproducera kundproblem, men får inte bli en genväg runt ordinarie behörighet, attest eller domänkommandon.

# Non-negotiable rules

1. All supportåtkomst måste vara kopplad till ett spårbart ärende.
2. Read-only är standard; skrivande access är undantag.
3. Support får inte fatta ekonomiska beslut eller signera reglerade flöden i kundens namn.
4. Direkt databasändring är förbjuden utanför särskild incidentrunbook.
5. Break-glass får bara användas vid aktiv incident eller uppenbar driftskada.
6. Alla supportsessioner, approvals och åtgärder ska auditloggas.

# Allowed actions

- läsa auditspår, jobs, errors och read models inom ärendets scope
- starta officiell replay eller retry när runbook tillåter det
- genomföra read-only impersonation enligt approval model

# Forbidden actions

- använda delade credentials
- utföra kundens affärsgodkännanden
- maskera eller radera auditspår
- kringgå server-side policy genom direkt adminskrivning

# Approval model

- vanlig diagnostics: support admin inom ticket scope
- read-only impersonation: support lead
- write-capable impersonation: support lead plus security admin
- break-glass: incident commander plus separat godkännare

# Segregation of duties where relevant

- samma person ska inte både godkänna och utföra högrisk-impersonation när separat granskning är möjlig

# Audit and evidence requirements

Audit ska visa:

- ärende-id
- måltenant och målidentitet
- sessionstyp
- approvals
- start/slut
- utförda actions

# Exceptions handling

Akuta undantag ska vara tidsbegränsade, ha tydlig skälkod och eftergranskas nästa arbetsdag.

# Backoffice/support restrictions where relevant

- support får bara använda officiella backoffice-funktioner
- break-glass-session ska ha hård timeout och särskild visuell markering

# Runtime enforcement expectations

- impersonation ska vara server-side markerad och sessionbunden
- write-capable mode ska kräva färsk stark autentisering
- action allowlist ska verkställas tekniskt

# Test/control points

- read-only session kan inte skriva
- write-mode kräver dubbelapproval
- audit finns för varje session

# Exit gate

- [ ] supportåtkomst är ticket-bunden och auditbar
- [ ] impersonation och break-glass följer tydliga approvals
- [ ] support kan inte kringgå ordinarie domänkommandon

