# Master metadata

- Document ID: POL-005
- Title: Emergency Disable Policy
- Status: Binding
- Owner: Security architecture, platform operations and compliance governance
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: Informal kill-switch guidance
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-policy-matrix.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-ui-reset-spec.md`
- Related domains:
  - feature flags
  - worker runtime
  - integrations
  - backoffice
- Related code areas:
  - `packages/domain-core/*`
  - `apps/api/*`
  - `apps/backoffice/*`
  - `apps/worker/*`
- Related future documents:
  - `docs/policies/module-activation-and-tenant-setup-policy.md`
  - `docs/runbooks/incident-response-and-production-hotfix.md`

# Purpose

Definiera hur riskfyllda funktioner kan stängas av snabbt vid incident utan att skapa oöverblickbara sidoeffekter eller bryta audit.

# Scope

Policyn gäller:

- externa submissions
- AI-drivena förslag i högriskflöden
- worker-jobbklasser
- integrationsadaptrar
- tenant- eller systemglobal disable

# Why it exists

Vid incident måste systemet kunna begränsa skada snabbt. Samtidigt får emergency disable inte bli ett allmänt verktyg för att kringgå normal styrning.

# Non-negotiable rules

1. Emergency disable är till för riskreduktion, inte för vardagsdrift.
2. Varje kill switch ska ha definierat scope, owner och återaktiveringsregel.
3. Disable ska vara auditloggad med reason code.
4. Disable får inte radera eller mutera historisk data.
5. Återaktivering kräver verifiering och uttryckligt beslut.

# Allowed actions

- stänga av viss integration
- pausa viss jobbklass
- blockera submit i reglerade flöden
- stänga av AI-förslag i högriskmodul

# Forbidden actions

- använda emergency disable för att hoppa över policy- eller testkrav
- stänga av audit eller säkerhetsloggning
- återaktivera utan verifiering

# Approval model

- akut aktivering: driftansvarig eller incidentledare inom givet scope
- återaktivering: driftansvarig + relevant domänägare
- högriskscope: även compliance owner eller security owner

# Segregation of duties where relevant

- den som aktiverar systemglobal disable ska inte ensam få återaktivera samma scope om incidenten gällt pengarisk eller regulatorisk påverkan

# Audit and evidence requirements

Audit ska visa:

- scope
- owner
- reason code
- aktör
- starttid
- slut- eller återaktiveringstid

# Exceptions handling

Inga undantag får göra disable osynlig. Även akut CLI- eller backoffice-aktivering måste lämna auditspår.

# Backoffice/support restrictions where relevant

- support får bara använda tenant-lokala disables om policyn uttryckligen tillåter det
- systemglobal disable kräver operationsroll

# Runtime enforcement expectations

- disable ska läsas server-side och gälla innan riskfylld operation utförs
- UI ska visa blockerad status tydligt men inte bära själva beslutslogiken
- worker ska respektera disable innan claim eller exekvering

# Test/control points

- varje kill switch ska ha testat stoppläge
- återaktivering ska vara testad och auditerad
- disable ska inte skapa silent mutation i pågående objekt

# Exit gate

- [ ] kritiska scopes har kill switches
- [ ] aktivering och återaktivering är auditloggade
- [ ] disable fungerar utan deploy
