> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: POL-003
- Title: Module Activation and Tenant Setup Policy
- Status: Binding
- Owner: Product governance and platform architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: Informal feature-flag and onboarding assumptions
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-policy-matrix.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-ui-reset-spec.md`
- Related domains:
  - org-auth
  - tenant setup
  - feature flags
  - backoffice
- Related code areas:
  - `packages/domain-org-auth/*`
  - `packages/domain-core/*`
  - `apps/api/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/policies/emergency-disable-policy.md`
  - `docs/ui/PUBLIC_SITE_AND_AUTH_SPEC.md`
  - `docs/ui/BACKOFFICE_OPERATIONS_SPEC.md`

# Purpose

Styra hur ett företag aktiverar moduler, vilka kombinationer som är tillåtna och hur tenant setup går till utan att lämna systemet i odefinierat delkonfigurerat läge.

# Scope

Policyn gäller:

- första tenant-setup
- senare modulaktivering
- irreversibla eller högriskaktiveringar
- disable och suspend där separat policy inte redan tar över

# Why it exists

Ett ERP med reglerade kärnflöden kan inte tillåta fri modulaktivering utan beroendekontroll. Fel kombinationer leder till brutna arbetsflöden, osäkra UI-ytor och felaktig data.

# Non-negotiable rules

1. Varje tenant ska ha en explicit module-activation profile.
2. Kärnberoenden får inte kringgås av UI eller manuella databasändringar.
3. Ingen modul får aktiveras om dess blockerande policy- eller rulepackkrav saknas.
4. Högriskmoduler ska kräva godkänd tenant setup innan användning.
5. Aktivering ska vara auditloggad och effective-dated.

# Allowed actions

- skapa tenant i `setup_pending`
- aktivera låg- eller medelriskmodul när alla beroenden är gröna
- schemalägga framtida aktivering
- sätta modul i `suspended` enligt policy

# Forbidden actions

- hoppa över nödvändiga beroenden
- aktivera moduler genom dold feature-flag utan tenantprofil
- markera modul som aktiv när migrations- eller policykrav saknas

# Approval model

- låg risk: tenant admin + systemvalidering
- medelrisk: tenant admin + backoffice-verifiering
- hög risk: tenant admin + operativ godkännare + eventuell compliance signoff

# Segregation of duties where relevant

- samma aktör får inte både beställa och ensam godkänna högriskaktivering om den påverkar reglerade flöden

# Audit and evidence requirements

Audit ska visa:

- vilken modul som aktiverades
- beroenden som validerades
- vem som godkände
- effective date
- eventuell anledning till suspension eller disable

# Exceptions handling

Enda tillåtna undantaget är akut suspend/disable via särskild incident- eller emergency-disable-policy. Det får inte användas för att smyga in otillåten aktivering.

# Backoffice/support restrictions where relevant

- support får inte aktivera högriskmoduler utan godkänd tenantprofil
- backoffice får inte kringgå modulberoenden genom direkt flaggsättning

# Runtime enforcement expectations

- activation profile ska ligga server-side
- varje modul måste deklarera dependencies, incompatible states och required policies
- UI får bara spegla serverbeslut om aktivering

# Test/control points

- dependency graph testas
- irreversibla aktiveringar kräver kontrollpunkter
- felaktiga kombinationer blockeras innan save

# Exit gate

- [ ] tenant-setup och modulaktivering är serverstyrd
- [ ] beroenden och godkännanden valideras före aktivering
- [ ] audit och rollback/suspend-spår finns

