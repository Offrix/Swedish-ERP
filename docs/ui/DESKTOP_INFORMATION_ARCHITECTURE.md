> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: UI-004
- Title: Desktop Information Architecture
- Status: Binding
- Owner: Enterprise UX architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated desktop IA document
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-ui-reset-spec.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-domain-map.md`
- Related domains:
  - desktop surface
  - all operator workbenches
- Related code areas:
  - `apps/desktop-web/*`
  - `packages/ui-desktop/*`
  - `packages/ui-core/*`
- Related future documents:
  - `docs/ui/WORKBENCH_CATALOG.md`
  - `docs/ui/BACKOFFICE_OPERATIONS_SPEC.md`

# Purpose

Låsa den slutliga informationsarkitekturen för desktop-web som enda fullständiga yta för alla professionella roller.

# Product position

Desktop-web är produktens primära kontrollcenter. Den ska bära hela arbetsdagen för ekonomi, lön, projekt, fältstyrning, close och supportnära operatörsarbete.

# Anti-goals

- modulöar utan sammanhang
- dashboards som ersätter riktiga arbetsytor
- dubbla navigationshierarkier
- mobile-liknande förenkling i desktop

# User roles

- company admin
- finance operator
- payroll operator
- project manager
- review operator
- backoffice operator in separate surface context

# Information architecture

Primära desktop-domäner:

- Home
- Search
- Work
- Finance
- Payroll
- Projects
- Field control
- Close and annual
- Settings

Sekundär struktur sker via workbenches och objektprofiler, inte via separata mikromoduler.

# Navigation model

- vänster rail för huvudområden
- övre command bar för global search och actions
- workbench-specifik sekundär navigering i innehållsytan
- objektprofil öppnas som primär detail view eller split view beroende på arbetsyta

# Surface responsibilities

- Home: personligt startläge med work items, blockerare och senaste aktivitet
- Search: global sök, saved views och snabba hopp
- Work: review center, work items, notifications och activity
- Finance: AR, AP, bank, VAT, HUS, tax account
- Payroll: pay runs, balances, AGI, migration
- Projects: kalkyl, projektkontroll, budget, WIP, field linkage
- Field control: dispatch, arbetsorder, personalliggare, egenkontroller
- Close and annual: månadsstängning, skattekonto, filing workspace

# Object profile rules

Varje objektprofil ska ha:

- identity block
- status and blockers
- related actions
- activity summary
- related objects
- audit or evidence entrypoint

# Workbench rules

- varje högfrekvent arbetsområde ska ha egen workbench
- list + detail + preview är standardmönstret
- batch actions ska ligga i workbench, inte i objektprofil som primär väg

# Lists/tables

- hög datadensitet
- frusna nyckelkolumner där det behövs
- bulk select
- sparade filter och vyer
- tydliga blocker/status-kolumner

# Detail views

- detaljvy ska ge full kontext utan modalberoende
- edit ska ske i kontrollerade panels eller egna formulärvyer, inte i slumpmässiga inlinehack

# Preview panes

- standard i dokument, review, AR/AP och search
- preview ska visa tillräcklig kontext för första beslutet utan att öppna ny route

# Search behavior

- global search i command bar
- objektgenvägar via keyboard
- saved views knyts till workbench och objekttyp

# Notifications/activity/work items behavior

- notifications visar att något kräver uppmärksamhet
- activity visar vad som hänt
- work items visar ansvar och deadline
- review center visar blockerande beslutsfall

# States: empty/loading/error/success/blocked/warning

- `empty`: nästa bästa action och exempeldata, aldrig tom dekor
- `loading`: skelett med riktig layout
- `error`: tydlig felorsak, retry och referensid
- `success`: diskret bekräftelse, inte stora celebratory mönster
- `blocked`: röd eller amber blocker med exakt varför
- `warning`: tydlig men icke-blockerande riskindikator

# Desktop vs mobile split

- desktop bär hela besluts- och kontrollkedjan
- mobile bär snabb fältinteraktion och begränsade lokala arbetsflöden

# Accessibility expectations

- full keyboard navigation
- tydlig fokusordning
- tabeller och lists ska vara läsbara med skärmläsare
- färg får inte vara enda bärare av status

# Visual language

- sober, tät, kontrollerad
- premium enterprise före “vänlig app”
- tydliga statusbadges
- objektidentitet och blockerare måste synas direkt

# Design system dependencies

- `docs/ui/DESIGN_SYSTEM_AND_OBJECT_PROFILE_SPEC.md`
- gemensamma tabell-, filter- och shell-komponenter i `ui-core` och `ui-desktop`

# Exit gate

- [ ] desktop-ytan har en enda tydlig huvud-IA
- [ ] varje huvudområde mappar till workbenches och objektprofiler, inte till gamla shell-vyer
- [ ] global search, work, finance, payroll, projects och close kan implementeras utan nya strukturfrågor

