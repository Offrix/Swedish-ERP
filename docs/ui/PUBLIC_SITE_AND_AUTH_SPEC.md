> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: UI-002
- Title: Public Site and Auth Spec
- Status: Binding
- Owner: Enterprise UX architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated public/auth spec
- Approved by: User directive, ADR-0029 and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-ui-reset-spec.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-rebuild-control.md`
- Related domains:
  - public site
  - auth
  - onboarding
  - org-auth
- Related code areas:
  - `apps/public-web/*`
  - `apps/desktop-web/*`
  - `packages/ui-core/*`
  - `packages/domain-org-auth/*`
- Related future documents:
  - `docs/policies/module-activation-and-tenant-setup-policy.md`
  - `docs/policies/signoff-and-segregation-of-duties-policy.md`

# Purpose

Låsa publika ytans och auth/onboarding-ytans informationsarkitektur, ansvar och upplevelse innan full UI-implementation startar.

# Product position

Publika ytan ska sälja ett premium-ERP för kontroll, spårbarhet och operativ styrka. Auth-ytan ska kännas säker, sober och snabb, inte som separat lågstatusverktyg.

# Anti-goals

- generiska startup-claims
- en auth-upplevelse som känns som “administrativ eftertanke”
- långa onboarding-wizards utan tydlig struktur
- otydlig skillnad mellan inloggning, step-up och onboarding

# User roles

- ny prospektkund
- befintlig kund
- inbjuden användare
- första tenant-admin
- enterprise-SSO-användare
- support/backoffice med separat ingång

# Information architecture

## Public site

- Home
- Product
- By role
- Trust and security
- Integrations
- Contact/demo

## Auth and onboarding

- Sign in
- Invite accept
- Create organization
- Join existing tenant
- Challenge center
- Recovery
- First admin setup

# Navigation model

Public site ska ha tydlig toppnavigering med korta primära sektioner, tydlig CTA och ingen tunn hamburgermeny på desktop.

Auth ska ha en avskalad men tydlig navigationsmodell:

- stegindikator när onboarding pågår
- tydlig separation mellan inloggning och tenant setup
- ingen marknadsnavigering som stör kritiska authsteg

# Surface responsibilities

Public site ansvarar för:

- förtroende
- produktposition
- rollsegmentering
- inbound conversion

Auth ansvarar för:

- identitetsverifiering
- tenantval
- utmaningar
- första åtkomst

Onboarding ansvarar för:

- första admin
- företagets grundprofil
- första modulbaslinje enligt policy

# Object profile rules

Public/auth bygger inte tunga object profiles, men tenant, organization invite, device trust och auth challenge ska ha konsekventa detaljerade vyer i samma visual language som resten av produkten.

# Workbench rules

Public site har inga workbenches.

Auth har ett “challenge center”-mönster för:

- step-up
- device trust
- stark autentisering
- signoff-liknande authsteg

# Lists/tables

Endast sparsamt i public/auth. Enterprise SSO connections, trusted devices och invite history kan visas i tabellform för admins.

# Detail views

Detail views behövs för:

- device trust
- active sessions
- invite details
- SSO connection details

# Preview panes

Inte centralt för public/auth.

# Search behavior

Public site använder inte global produktsök.

Auth har endast begränsad sök eller lookup där tenantval och enterprise connection kräver det.

# Notifications/activity/work items behavior

- auth-ytan kan visa blockerande auth notices
- vanliga produktnotiser hör inte hemma i auth
- step-up- och invite-status får ha egen lättviktsaktivitetshistorik

# States: empty/loading/error/success/blocked/warning

- `empty`: informativ för första admin utan data
- `loading`: snabb och sober skeleton
- `error`: tydlig förklaring utan teknisk dump för slutanvändare
- `success`: tydlig nästa åtgärd
- `blocked`: används hårt vid policy- eller trust-blockering
- `warning`: när användaren är nära men inte fullt verifierad

# Desktop vs mobile split

Public site ska vara responsiv.

Auth måste fungera väl på mobil för inloggning och challenge, men full tenant setup förväntas ge bäst upplevelse på desktop.

# Accessibility expectations

- tydlig formulärsemantik
- hög kontrast
- tydliga felmeddelanden
- fokusordning och tangentbordsstöd

# Visual language

- sober premium enterprise
- stora rubriker men stram typografisk disciplin
- trygg säkerhetskänsla
- inte futuristisk eller AI-blank

# Design system dependencies

- typography scale
- form system
- button hierarchy
- status language
- auth-specific state components

# Exit gate

- [ ] public site har tydlig trust- och produktstruktur
- [ ] auth, onboarding och challenge center är tydligt separerade
- [ ] tenant setup följer policy och kan inte hamna i odefinierat mellanläge
- [ ] upplevelsen känns som samma premiumprodukt som desktopen

