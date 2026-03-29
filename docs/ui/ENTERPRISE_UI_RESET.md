> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: UI-001
- Title: Enterprise UI Reset
- Status: Binding
- Owner: Enterprise UX architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: Old UI direction and `docs/ui/ENTERPRISE_UI_PLAN.md` as controlling strategy
- Approved by: User directive, MCP-001 and ADR-0029
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-ui-reset-spec.md`
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-domain-map.md`
- Related domains:
  - public web
  - auth
  - desktop
  - field mobile
  - backoffice
- Related code areas:
  - `apps/public-web/*`
  - `apps/desktop-web/*`
  - `apps/field-mobile/*`
  - `apps/backoffice/*`
  - `packages/ui-core/*`
- Related future documents:
  - `docs/ui/DESIGN_SYSTEM_AND_OBJECT_PROFILE_SPEC.md`
  - `docs/ui/DESKTOP_INFORMATION_ARCHITECTURE.md`
  - `docs/ui/FIELD_MOBILE_SPEC.md`
  - `docs/ui/PUBLIC_SITE_AND_AUTH_SPEC.md`
  - `docs/ui/BACKOFFICE_OPERATIONS_SPEC.md`

# Purpose

Detta dokument är den bindande berättelsen och riktningen för hela UI-omtaget. Det ska göra det omöjligt att återgå till gamla shell-antaganden eller bygga “snyggare versioner” av en struktur som redan är för svag.

# Product position

Produkten ska kännas som ett sammanhängande premium-ERP för svenska företag och byråer. Den ska signalera kontroll, precision och tydlig arbetsledning, inte AI-demo eller generisk SaaS-startup.

# Anti-goals

- ingen chatliknande huvudupplevelse
- inga wizardkedjor som ersätter riktiga arbetsytor
- ingen modulspretighet där varje del känns som egen mikroprodukt
- ingen mobile-first prioritering av funktioner som kräver desktopdensitet

# User roles

- företagare
- ekonomi/redo
- lön
- controller
- projektledning
- fältpersonal
- support/backoffice

# Information architecture

IA ska bygga på:

- workbenches för återkommande arbete
- object profiles för djup per objekt
- global search som primär orienteringsyta
- tydlig separation mellan review, notifications, activity och work items

# Navigation model

- desktop: vänsternavigering för huvudområden, global command bar och sök i toppnivå
- mobile: få huvudflikar och tydlig dagens arbetslista
- backoffice: separat navigation för audit, replay, incidenter och tenantkontroll

# Surface responsibilities

- public web: trust, produkt, säkerhet, köp och positionering
- auth: login, challenges, onboarding, tenant bootstrap
- desktop: full arbetsyta för alla professionella roller
- field mobile: check-in, tid, material, foto, signatur, enklare åtgärder
- backoffice: drift, support, audit, replay

# Object profile rules

- varje kärnobjekt ska ha konsekvent profilstruktur
- sammanfattning, status, ansvar, relaterade objekt, historik och åtgärder ska ligga på förväntad plats
- kritiska blockerare ska vara synliga utan extra klick

# Workbench rules

- frekventa operatörsflöden ska ske i workbenches
- review, AP, AR, payroll, bank och close ska ha egna arbetsytor
- bulk actions ska vara tydliga och säkra

# Lists/tables

- datatäta tabeller är förstaklassmedborgare
- sortering, filter, sparade vyer och tydliga statuskolumner är obligatoriska
- beslutskritisk data får inte gömmas i hover eller overflow

# Detail views

- detaljvyer ska ge sammanhang, historik och nästa åtgärd i samma yta
- listor och detaljer ska kunna leva i split view när arbetstypen kräver hög genomströmning

# Preview panes

- preview panes används för dokument, fakturor, review fall och andra objekt där snabb granskning är central
- preview får aldrig ersätta full profil där djup behövs

# Search behavior

- global search ska vara snabb, rolltrimmad och objektmedveten
- sök får inte bli source of truth men måste vara förstaklassigt navigationsverktyg

# Notifications/activity/work items behavior

- notifications: uppmärksamma
- activity: visa historik
- work items: visa ansvar och deadline
- review center: visa blockerande beslutsfall

# States: empty/loading/error/success/blocked/warning

- tomt läge ska vara informativt, inte dekorativt
- loading ska visa struktur, inte hopplösa spinners
- error ska vara begripligt och opererbart
- blocked ska förklara exakt varför användaren stoppas
- warning ska vara tydlig men inte alarmistisk

# Desktop vs mobile split

- desktop är full arbetsyta
- mobile är stödprodukt
- allt som kräver tät data, komplex attest eller bred kontext hör hemma i desktop

# Accessibility expectations

- tangentbordsnavigering i desktop
- god kontrast
- semantiska statusindikatorer
- tydliga fokuslägen

# Visual language

- sober, modern och premium
- hög precision i typografi och spacing
- tydligt status- och riskfärgspråk
- inga generiska lila startupmönster

# Design system dependencies

- centralt tokensystem
- gemensam tabellmodell
- gemensam object-profile anatomi
- gemensamma state-komponenter

# Exit gate

- [ ] gamla shell-antaganden är nedgraderade
- [ ] desktop, mobile och backoffice har tydligt separerade ansvar
- [ ] workbench-first och object-profile-first är bindande
- [ ] UI-omtaget kan nu brytas ned i de mer precisa UI-specarna

