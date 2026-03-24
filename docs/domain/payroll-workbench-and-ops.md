# Master metadata

- Document ID: DOM-006
- Title: Payroll Workbench and Operations
- Status: Binding
- Owner: Payroll product architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated payroll-workbench document
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-ui-reset-spec.md`
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - payroll
  - balances
  - AGI
  - migration
- Related code areas:
  - `packages/domain-payroll/*`
  - `apps/desktop-web/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/compliance/se/payroll-engine.md`
  - `docs/policies/payroll-migration-policy.md`
  - `docs/runbooks/payroll-migration-cutover.md`

# Purpose

Definiera payroll-workbenchen som den fulla desktop-ytan för lön, AGI-ops, exceptions, balansgranskning och migration cockpit.

# Scope

Omfattar:

- pay-run workbench
- exception queue
- AGI submission workspace
- balances workspace
- migration cockpit

Omfattar inte:

- field-mobile
- generell HR-profile UI

# Roles

- payroll operator
- payroll reviewer
- payroll manager
- backoffice escalator

# Source of truth

`domain-payroll` äger pay runs, pay lines, AGI constituents och migration objects. Workbenchen är bara operatörsyta.

# Object model

## PayrollWorkbenchSession

Fält:

- `workbench_session_id`
- `user_id`
- `selected_company_id`
- `selected_pay_period_id`
- `active_queue_code`
- `filters`

## PayrollExceptionQueue

Fält:

- `payroll_exception_queue_id`
- `queue_code`
- `risk_class`
- `source_object_type`
- `source_object_id`
- `status`

## AgiWorkspaceCase

Fält:

- `agi_workspace_case_id`
- `agi_submission_id`
- `status`
- `period_code`
- `blocking_reason_codes`

# State machines

## PayrollExceptionQueue item

- `open`
- `claimed`
- `resolved`
- `escalated`
- `closed`

## AgiWorkspaceCase

- `draft`
- `ready`
- `submitted`
- `receipt_received`
- `correction_required`
- `closed`

# Commands

- `open_payroll_workbench`
- `claim_payroll_exception`
- `approve_pay_run`
- `submit_agi_period`
- `open_agi_correction_case`
- `lock_migration_cutover`

# Events

- `payroll_exception_created`
- `pay_run_approved`
- `agi_submission_opened`
- `migration_cutover_locked`

# Cross-domain dependencies

- balances engine levererar saldo projections
- agreements engine levererar förklaringar för avvikande lön
- tax account and submission platform levererar kvittenser

# Forbidden couplings

- workbenchen får inte räkna skatt eller avgifter i klienten
- AGI-ytan får inte bli source of truth för individuppgifter
- migration cockpit får inte skriva direkt till ledger eller AGI utan domänkommandon

# Search ownership

Search får indexera pay runs, employees och exceptions. Payroll domänen äger status och beslutslogik.

# UI ownership

Desktop-web äger hela payroll-workbenchen. Backoffice får läsa och assistera men inte ersätta ordinarie payroll-ops.

# Permissions

- approvals och AGI-signoff styrs av SoD-policy
- migration cutover kräver särskild behörighetsklass

# Failure and conflict handling

- pay run som ändras efter preview ska invalidera tidigare approval
- AGI correction case ska öppnas när redovisad period kräver rättelse
- migration cockpit ska blockera om diff och opening balances inte är låsta

# Notifications/activity/work-item interaction

- payroll exceptions skapar work items
- AGI-fel kan skapa notifications
- activity feed visar pay-run approvals och corrections

# API implications

- queue endpoints
- pay-run drill-down
- AGI status and correction endpoints
- migration diff endpoints

# Worker/job implications where relevant

- pay-run calculation jobs
- AGI file generation and submission jobs
- migration diff and replay jobs

# Projection/read-model requirements

- pay-run summary with blockers
- employee variance view
- balances delta view
- AGI period case view

# Test implications

- SoD around approval
- invalidation on changed inputs
- correction case opening
- migration cutover blocking

# Exit gate

- [ ] payroll workbench täcker pay runs, balances, AGI och migration utan att bära domänlogik i UI
- [ ] exceptions, approvals och corrections går via server-side commands
- [ ] backoffice och desktop har tydliga och separata roller
