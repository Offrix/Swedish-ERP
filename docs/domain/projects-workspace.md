> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: DOM-010
- Title: Projects Workspace
- Status: Binding
- Owner: Project product architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated projects workspace document
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-ui-reset-spec.md`
- Related domains:
  - projects
  - field
  - payroll
  - HUS
- Related code areas:
  - `packages/domain-projects/*`
  - `apps/desktop-web/*`
- Related future documents:
  - `docs/domain/projects-budget-wip-and-profitability.md`
  - `docs/domain/field-work-order-service-order-and-material-flow.md`

# Purpose

Definiera projects workspace som den sammanhållna desktop-ytan för projektkontroll, budget, forecast, field linkage, HUS och personalliggareöversikt.

# Scope

Omfattar:

- project overview
- budget/WIP/forecast
- work orders and field status
- payroll actuals
- HUS and personalliggare indicators
- own controls and deviations

Omfattar inte:

- full payroll workbench
- AP/AR workbenches

# Roles

- project manager
- controller
- field lead
- finance operator

# Source of truth

`projects` äger projektets arbetsyta och sammanställda projections. Underliggande domäner äger sina respektive råobjekt.

# Object model

## ProjectWorkspaceView

Fält:

- `project_id`
- `project_status`
- `budget_version_id`
- `current_wip_snapshot_id`
- `current_forecast_snapshot_id`
- `open_work_order_count`
- `hus_case_count`
- `personalliggare_alert_count`

## ProjectDeviation

Fält:

- `project_deviation_id`
- `project_id`
- `deviation_type_code`
- `severity_code`
- `status`
- `owner_user_id`

# State machines

## ProjectDeviation

- `open`
- `acknowledged`
- `in_progress`
- `resolved`
- `closed`

# Commands

- `open_project_workspace`
- `create_project_deviation`
- `assign_project_deviation`
- `close_project_deviation`

# Events

- `project_workspace_opened`
- `project_deviation_created`
- `project_deviation_resolved`

# Cross-domain dependencies

- projects budget/WIP
- field work orders
- payroll cost allocation
- HUS summaries
- personalliggare workplace alerts
- egenkontroll status

# Forbidden couplings

- workspace får inte räkna om payroll cost allocation eller HUS utfall i UI
- projektobjekt får inte kopiera underliggande domäners fulla statusmaskiner

# Search ownership

Search får indexera projekt, avvikelser och sammanfattningar men projektdomänen äger workspace state.

# UI ownership

Desktop-web äger projects workspace. Mobile visar bara jobbrelaterade utsnitt.

# Permissions

- projektåtkomst styrs av projektroll, bolag och eventuellt byråscope

# Failure and conflict handling

- saknade snapshots ska markeras tydligt
- stale underlag från underdomän ska visa warning, inte tyst nollställas

# Notifications/activity/work-item interaction

- deviations skapar work items
- större budget-/HUS-/personalliggareavvikelser kan skapa notifications
- activity visar viktiga projekthändelser

# API implications

- workspace summary endpoints
- deviation endpoints
- cross-domain drilldown endpoints

# Worker/job implications where relevant

- nightly project summary projections
- deviation detection jobs

# Projection/read-model requirements

- project control dashboard
- cost and revenue rollup
- field status rollup
- compliance indicator strip

# Test implications

- rollup correctness
- permission trimming
- deviation lifecycle
- stale warning behavior

# Exit gate

- [ ] projects workspace binder ihop ekonomi, field och compliance utan att ta över deras logik
- [ ] projekthändelser, avvikelser och drilldowns är tydligt definierade
- [ ] desktop kan byggas mot ett stabilt workspace-kontrakt

