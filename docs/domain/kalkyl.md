> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: DOM-009
- Title: Kalkyl
- Status: Binding
- Owner: Project product architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated kalkyl document
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - kalkyl
  - projects
  - AR
- Related code areas:
  - `packages/domain-kalkyl/*`
  - `packages/domain-projects/*`
  - `packages/domain-ar/*`
- Related future documents:
  - `docs/domain/projects-workspace.md`
  - `docs/compliance/se/project-billing-and-revenue-recognition-engine.md`

# Purpose

Definiera kalkyl som separat domän för offertunderlag, mängder, material, UE, riskpåslag och budgetkoppling.

# Scope

Omfattar:

- kalkylversioner
- mängdrader
- material och underentreprenör
- påslag och risk
- koppling till offert och projektbudget

Omfattar inte:

- leverantörsreskontra
- faktisk projektuppföljning efter produktion

# Roles

- estimator
- sales owner
- project manager

# Source of truth

`kalkyl` äger estimate versions, line items, markups och assumptions. `AR` äger kundoffert och `projects` äger faktisk budget efter konvertering.

# Object model

## EstimateVersion

Fält:

- `estimate_version_id`
- `estimate_no`
- `customer_id`
- `status`
- `currency_code`
- `valid_from`
- `valid_to`

## EstimateLine

Fält:

- `estimate_line_id`
- `estimate_version_id`
- `line_type_code`
- `quantity`
- `unit_code`
- `cost_amount`
- `sales_amount`
- `project_phase_code`
- `risk_class_code`

## EstimateAssumption

Fält:

- `estimate_assumption_id`
- `estimate_version_id`
- `assumption_code`
- `description`
- `impact_amount`

# State machines

## EstimateVersion

- `draft`
- `reviewed`
- `approved`
- `quoted`
- `converted`
- `superseded`

# Commands

- `create_estimate_version`
- `add_estimate_line`
- `approve_estimate_version`
- `convert_estimate_to_quote`
- `convert_estimate_to_project_budget`

# Events

- `estimate_version_created`
- `estimate_version_approved`
- `estimate_version_converted`

# Cross-domain dependencies

- quote i AR kan referera till estimate version
- project budget kan skapas från estimate version

# Forbidden couplings

- quote får inte bära egen kalkyllogik utanför estimate reference
- projects får inte ändra historisk estimate version efter konvertering

# Search ownership

Search får indexera estimate versions och line summaries men kalkyl äger status.

# UI ownership

Desktop-web äger hela kalkylarbetsytan.

# Permissions

- bara estimator/sales-roller får skapa och godkänna kalkyl enligt policy

# Failure and conflict handling

- konvertering blockerar om kalkyl saknar totalsammanhang eller nödvändig approval
- superseded estimate får inte konverteras igen

# Notifications/activity/work-item interaction

- review requests kan skapa work items
- godkänd eller konverterad kalkyl skapar activity

# API implications

- estimate CRUD
- review/approve/convert endpoints

# Worker/job implications where relevant

- inga kritiska bakgrundsjobb krävs för kärnflödet

# Projection/read-model requirements

- estimate summary
- margin breakdown
- conversion history

# Test implications

- versioning
- conversion to quote
- conversion to project budget
- assumption impact

# Exit gate

- [ ] kalkyl finns som separat versionsstyrd domän
- [ ] offert och projektbudget kan läsa kalkyl utan att äga den
- [ ] konvertering är spårbar och reproducerbar

