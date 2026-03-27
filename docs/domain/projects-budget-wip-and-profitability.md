> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: DOM-011
- Title: Projects Budget WIP and Profitability
- Status: Binding
- Owner: Project product architecture and finance architecture
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/domain/projects-budget-wip-and-profitability.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - projects
  - payroll
  - AR
  - reporting
- Related code areas:
  - `packages/domain-projects/*`
  - `packages/domain-payroll/*`
  - `packages/domain-ar/*`
  - `apps/desktop-web/*`
- Related future documents:
  - `docs/domain/projects-workspace.md`
  - `docs/compliance/se/project-billing-and-revenue-recognition-engine.md`

# Purpose

Definiera hur projektbudget, actuals, WIP, forecast och lönedriven projektkostnad materialiseras och följs upp.

# Scope

Omfattar:

- budgetversioner
- actual cost snapshots
- billed vs approved value
- WIP and deferred revenue
- forecast at completion

Omfattar inte:

- dispatch och fältlogik
- generell huvudboksrapportering

# Roles

- project manager
- controller
- finance operator

# Source of truth

`projects` äger budget, WIP- och forecastsnapshots. `AR` äger issued invoices. `payroll` äger actual payroll cost. `ledger` äger bokföring.

# Object model

## ProjectBudgetVersion

Fält:

- `project_budget_version_id`
- `project_id`
- `version_no`
- `status`
- `valid_from`
- `totals`

## ProjectActualCostSnapshot

Fält:

- `project_actual_cost_snapshot_id`
- `project_id`
- `cutoff_date`
- `actual_cost_amount`
- `actual_minutes`
- `source_hash`

## ProjectWipSnapshot

Fält:

- `project_wip_snapshot_id`
- `project_id`
- `cutoff_date`
- `approved_value_amount`
- `billed_amount`
- `wip_amount`
- `deferred_revenue_amount`

## ProjectForecastSnapshot

Fält:

- `project_forecast_snapshot_id`
- `project_id`
- `cutoff_date`
- `forecast_cost_at_completion_amount`
- `forecast_revenue_at_completion_amount`
- `forecast_margin_amount`

# State machines

## ProjectBudgetVersion

- `draft`
- `approved`
- `superseded`

## Project snapshots

- `materialized`
- `review_required`
- `superseded`

# Commands

- `approve_project_budget_version`
- `materialize_project_actual_cost_snapshot`
- `materialize_project_wip_snapshot`
- `materialize_project_forecast_snapshot`

# Events

- `project_budget_version_approved`
- `project_actual_cost_snapshot_materialized`
- `project_wip_snapshot_materialized`
- `project_forecast_snapshot_materialized`

# Cross-domain dependencies

- payroll cost allocation
- AR billed revenue
- field and projects completion data
- HUS billed overlays where relevant

# Forbidden couplings

- desktop får inte räkna WIP eller forecast
- projects får inte skriva om issued invoice outcomes
- payroll får inte skriva projektets snapshots direkt utan officiell handoff

# Search ownership

Search får indexera projektsammanfattningar och snapshots men projects äger state och beräkning.

# UI ownership

Desktop-web projects workspace äger presentation och drilldown.

# Permissions

- budgetapproval kräver högre roll än vanlig projekttillgång
- forecast materialization kan vara systemjobb men ska vara tenant- och rollstyrd

# Failure and conflict handling

- saknad budgetversion ger review-required på forecast
- saknad payroll cost allocation ger warning eller blocker enligt policy
- negativa WIP-utfall får inte döljas; de ska visas som deferred revenue eller avvikelse

# Notifications/activity/work-item interaction

- större WIP-avvikelser skapar work items
- nya snapshotar skapar activity
- blockerande forecastbrister kan skapa notification till controller

# API implications

- budget CRUD and approval
- snapshot materialization endpoints
- project financial drilldown endpoints

# Worker/job implications where relevant

- scheduled snapshot materialization
- anomaly detection jobs

# Projection/read-model requirements

- budget vs actual
- billed vs approved value
- current WIP
- forecast at completion

# Test implications

- payroll cost rollup
- invoice tie-out
- WIP and deferred revenue behavior
- forecast with missing budget

# Exit gate

- [ ] projektbudget, actuals, WIP och forecast materialiseras server-side
- [ ] payroll cost allocation och AR-tie-out ingår i samma kontrollkedja
- [ ] workspace kan bygga vidare på låsta snapshots i stället för UI-kalkyl

