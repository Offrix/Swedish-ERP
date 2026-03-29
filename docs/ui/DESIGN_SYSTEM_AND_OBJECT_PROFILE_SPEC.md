> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: UI-003
- Title: Design System and Object Profile Spec
- Status: Binding
- Owner: Enterprise UX architecture and design systems architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated design-system spec
- Approved by: User directive, ADR-0029 and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-ui-reset-spec.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-domain-map.md`
- Related domains:
  - all surfaces
- Related code areas:
  - `packages/ui-core/*`
  - `packages/ui-desktop/*`
  - `packages/ui-mobile/*`
- Related future documents:
  - `docs/ui/ENTERPRISE_UI_RESET.md`
  - `docs/ui/DESKTOP_INFORMATION_ARCHITECTURE.md`
  - `docs/ui/WORKBENCH_CATALOG.md`

# Purpose

Definiera det gemensamma designsystemet, object-profile-anatomin och de återkommande mönstren som ska användas över desktop, mobile och backoffice.

# Product position

Designsystemet ska stödja en datatung, precis och premium enterprise-upplevelse. Det ska inte efterlikna generiska consumer dashboards eller AI-verktyg.

# Anti-goals

- inkonsekventa komponentfamiljer per modul
- cards som ersätter riktiga datatabeller
- för mjuk, lekfull eller “appig” enterprise-estetik
- separata visuella språk för desktop och backoffice

# User roles

Designsystemet ska bära alla professionella roller, från ekonomi och lön till projekt och support, utan att varje roll får eget visuellt system.

# Information architecture

Designsystemet definierar inte hela IA:n men måste stödja:

- side navigation
- top command/search bar
- workbench layouts
- object profiles
- dense tables
- preview panes
- side panels för sekundär information

# Navigation model

Komponentstöd krävs för:

- primary nav
- section nav
- tab strips
- breadcrumb or context header
- command bar

# Surface responsibilities

- `ui-core` äger tokens, typografi, statusspråk, formulär, tabeller och grundmönster
- `ui-desktop` äger desktopspecifika layouter och interaktioner
- `ui-mobile` äger mobilanpassade mönster ovanpå samma tokens

# Object profile rules

Varje object profile ska följa samma huvudanatomi:

1. Header med namn, status, critical badges och primary actions
2. Snapshot-rad med de viktigaste affärs- och ansvarsfälten
3. Huvudinnehåll uppdelat i logiska sektioner
4. Relaterade objekt
5. Historik, activity och audit där relevant

Kritiska blockerare ska synas i profilen utan att användaren måste öppna sekundära dialoger.

# Workbench rules

Workbench ska använda:

- queue/list till vänster eller center
- preview/detail till höger eller nedanför beroende på kontext
- bulk action toolbar
- saved views
- inline status filtering

# Lists/tables

Tabeller ska stödja:

- densitet i flera nivåer
- sticky headers
- tydlig sort/filter
- bulk select
- statusbadges
- inline metadata utan att bli plottrigt

Tabeller ska vara en kärnkomponent, inte en nödvändig restprodukt.

# Detail views

Detaljvyer ska vara läsbara men fortfarande täta. De ska inte andas “marketing whitespace”. De ska hjälpa professionellt arbete.

# Preview panes

Preview panes ska användas för:

- dokument
- fakturor
- review items
- submissions
- order/work orders

Preview ska ge snabb läsning, inte slutligt djup.

# Search behavior

Designsystemet ska innehålla komponenter för:

- global search input
- result list with object typing
- keyboard navigation
- empty/no access/no result states

# Notifications/activity/work items behavior

Varje objektfamilj ska ha egen visuellt tydlig behandling:

- notifications är korta signalobjekt
- activity är tidslinje
- work items visar ansvar och deadline
- review items visar blockerande beslut

# States: empty/loading/error/success/blocked/warning

Designsystemet ska ge återanvändbara state-komponenter för alla dessa lägen. `Blocked` måste vara extra tydligt och pedagogiskt.

# Desktop vs mobile split

Samma tokens och statusspråk används överallt, men:

- desktop prioriterar densitet
- mobile prioriterar enfingersnavigation och kortare uppgiftsdjup

# Accessibility expectations

- fokusindikatorer
- tangentbordsstöd på desktop
- läsbara tabellrubriker
- semantiska formulär och felmeddelanden

# Visual language

- sober färgpalett
- stark typografisk hierarki
- tydliga statuses för risk, varning, blockering och framgång
- inga modetrender som snabbt åldras

# Design system dependencies

Kärnkomponentfamiljer:

- typography
- color/status tokens
- spacing scale
- forms
- buttons
- badges
- tables
- panels
- modals
- command/search
- object profile shell
- timeline/activity

# Exit gate

- [ ] alla ytor kan byggas ovanpå samma centrala system
- [ ] object profile-anatomin är låst
- [ ] tabelldensitet och statusspråk är definierade
- [ ] desktop, mobile och backoffice delar samma visuella ryggrad

