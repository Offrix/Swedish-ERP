> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: POL-014
- Title: Security Admin and Incident Policy
- Status: Binding
- Owner: Security governance
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/policies/security-admin-and-incident-policy.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-policy-matrix.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - auth
  - backoffice
  - worker
  - runtime operations
- Related code areas:
  - `packages/domain-org-auth/*`
  - `apps/backoffice/*`
  - `apps/worker/*`
- Related future documents:
  - `docs/runbooks/incident-response-and-production-hotfix.md`
  - `docs/runbooks/backup-restore-and-disaster-recovery.md`

# Purpose

Styra privilegierad säkerhetsadministration, incidenthantering, hotfix, sessionrisk och nyckelrotation.

# Scope

Policyn gäller:

- security admins
- privilegierade sessioner
- incidentklassning
- hotfix i produktion
- secrets och certifikat

# Why it exists

Säkerhetsadministration och incidentarbete är nödvändigt, men får inte ske utan stark autentisering, tydliga roller och bevarat bevismaterial.

# Non-negotiable rules

1. Alla privilegierade roller ska använda stark autentisering.
2. Högriskactions kräver färsk step-up.
3. Incidenter ska klassas och journalföras.
4. Hotfix i produktion kräver incident- eller riskärende.
5. Secrets och certifikat ska roteras enligt fast cadence eller omedelbart vid misstanke om kompromettering.
6. Bevismaterial får inte förstöras under incidenthantering.

# Allowed actions

- spärra eller begränsa access
- aktivera emergency disable enligt separat policy
- initiera hotfix enligt runbook
- rotera credentials och certifikat

# Forbidden actions

- permanent break-glass utan tidsgräns
- ologgad prod-hotfix
- borttagning av relevanta loggar före forensisk säkring

# Approval model

- standard security admin action: security admin
- prod-hotfix: incident owner plus reviewer
- break-glass och emergency disable: enligt respektive policy

# Segregation of duties where relevant

- den som utvecklar hotfix ska inte ensam slutgodkänna den i normalfallet

# Audit and evidence requirements

Spara:

- incident id
- klassning
- session logs
- approvals
- hotfix reference
- secret rotation evidence

# Exceptions handling

Nödlägen får tillfälligt förkorta approvals men aldrig eliminera eftergranskning.

# Backoffice/support restrictions where relevant

- support är inte security admin
- security actions ska ligga i särskilda verktyg och inte i vanliga operatörsytor

# Runtime enforcement expectations

- privilegierade sessioner ska ha kortare timeout
- riskflaggor ska kunna tvinga step-up eller block
- hotfix och emergency actions ska lämna tydligt receipt-spår

# Test/control points

- step-up krävs för privilegierad action
- incidentjournal kan inte kringgås
- secrets rotation är spårbar

# Exit gate

- [ ] privilegierade security actions är starkt autentiserade och auditbara
- [ ] incident och hotfix följer tydlig ansvarskedja
- [ ] rotationskrav och beviskrav är verkställda

