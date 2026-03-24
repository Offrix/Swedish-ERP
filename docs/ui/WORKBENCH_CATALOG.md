# Master metadata

- Document ID: UI-007
- Title: Workbench Catalog
- Status: Binding
- Owner: Enterprise UX architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated workbench catalog
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-ui-reset-spec.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - desktop surface
  - backoffice surface
- Related code areas:
  - `apps/desktop-web/*`
  - `apps/backoffice/*`
  - `packages/ui-desktop/*`
- Related future documents:
  - `docs/ui/DESKTOP_INFORMATION_ARCHITECTURE.md`
  - `docs/ui/BACKOFFICE_OPERATIONS_SPEC.md`

# Purpose

Lista och låsa vilka workbenches som ska finnas, vad de äger och vilka objekt de får arbeta på.

# Product position

Workbenches är produktens primära arbetsmönster. De ska samla listor, filter, preview, batchactions och beslutsytor för en hel arbetsklass.

# Anti-goals

- generiska dashboards som låtsas vara arbetsyta
- workbenches som bara är länksamlingar
- dubbletter av samma arbetsklass i flera områden

# User roles

- finance operator
- payroll operator
- review operator
- project manager
- support operator

# Information architecture

Desktop workbenches:

- Review Center
- Document Review
- AP
- AR and Billing
- Bank and Reconciliation
- Tax Account
- Payroll
- Balances and Agreements
- AGI Workspace
- Projects Control
- Close and Annual

Backoffice workbenches:

- Case Desk
- Audit Explorer
- Replay and Jobs
- Security and Access

# Navigation model

- workbench väljs via huvudområde
- lokala tabs inom workbench används bara för underköer eller perspektiv, inte som ersättning för hela workbenches

# Surface responsibilities

- Review Center: blockerande review items
- Document Review: dokument, OCR, klassning och handoff
- AP: supplier invoices, approvals, duplicates, import-case drilldown
- AR and Billing: quotes, orders, invoices, credits, HUS overlays
- Bank and Reconciliation: bank events, matches, payment outcomes
- Tax Account: skattekontoimport, offset och differenser
- Payroll: pay runs, exceptions, payments
- Balances and Agreements: saldo- och avtalsförklaringar
- AGI Workspace: AGI periods, receipts, corrections
- Projects Control: budget, WIP, forecast, billing, field linkage
- Close and Annual: close blockers, packages, filings

# Object profile rules

- workbench ska kunna öppna relaterad objektprofil utan att förlora listkontext
- preview ska räcka för första beslutet i minst 70 procent av standardfallen

# Workbench rules

- list + filters + preview + actions + batch operations är standard
- varje workbench ska definiera source objects, allowed actions och blocker states
- inga workbenches får äga egen domänlogik

# Lists/tables

- tabeller ska vara optimerade för hög frekvens
- standardkolumner: status, blocker, owner, updated, key identity
- användaren ska kunna spara vyer

# Detail views

- används när preview inte räcker
- ska vara routebar och delbar inom behörighetsscope

# Preview panes

- standard i Review Center, Document Review, AP, AR, Tax Account och Replay

# Search behavior

- varje workbench har lokala filter
- global search får kunna öppna workbench med förifyllt filter

# Notifications/activity/work items behavior

- notifications får öppna rätt workbench och filtrera listan
- activity ska vara tillgänglig i preview eller detail
- work items ska kunna bindas till objekt i workbench

# States: empty/loading/error/success/blocked/warning

- `empty`: visa hur arbetsytan fylls och nästa action
- `loading`: behåll kolumnstruktur
- `error`: visa tekniskt fel och återförsök
- `success`: batchutfall med receipt eller count
- `blocked`: tydlig blocker med policy eller dataskäl
- `warning`: delvis avvikelse, review eller risk

# Desktop vs mobile split

- fulla workbenches finns på desktop och backoffice
- mobile använder inga fulla workbenches

# Accessibility expectations

- bulk select och keyboard navigation måste fungera utan mus
- preview och tabeller ska vara skärmläsarvänliga

# Visual language

- datatätt, lugnt och konsekvent
- samma strukturella mönster mellan workbenches

# Design system dependencies

- table system
- filter chips
- preview pane
- command bar
- status badges

# Exit gate

- [ ] varje högfrekvent arbetsklass har en uttrycklig workbench
- [ ] inga dubbletter eller otydliga ägarskap finns mellan workbenches
- [ ] implementation kan börja mot en låst katalog i stället för ad hoc-ytor
