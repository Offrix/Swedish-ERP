# Master metadata

- Document ID: SE-CMP-005
- Title: Payroll Migration and Balances Engine
- Status: Binding
- Owner: Payroll compliance architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated migration-and-balances document
- Approved by: User directive, MCP-001 and ADR-0026
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-rulepack-register.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - payroll
  - balances
  - HR
  - time
- Related code areas:
  - `packages/domain-payroll/*`
  - `packages/domain-balances/*`
  - `packages/domain-hr/*`
  - `packages/domain-time/*`
- Related future documents:
  - `docs/adr/ADR-0026-payroll-migration-balances-and-agreements-architecture.md`
  - `docs/policies/payroll-migration-policy.md`
  - `docs/test-plans/payroll-migration-and-balance-tests.md`

# Purpose

Definiera den bindande motorn för lönecutover, historikimport, YTD, saldon och cutover-diff innan bolag går över till systemet.

# Scope

Ingår:

- migration batches
- source mapping
- YTD and prior-period carry-in
- balances baseline
- cutover diff
- rollback readiness

Ingår inte:

- full UI-design för migration cockpit
- avtalsregler som ägs av collective-agreements-motorn

# Non-negotiable rules

1. Lönemigrering får aldrig vara ett engångsskript utan auditbar motor.
2. Inget bolag får gå live på lön utan godkänd cutover-diff.
3. Saldon ska importeras som explicita balance baselines eller transactions.
4. Historiska AGI-relevanta totalsummor ska bevaras så att fortsatt rapportering inte bryts.
5. Migration får inte skapa dubbla lönerader, dubbla skulder eller förlorad historik.

# Definitions

- `Migration batch`: en sammanhållen körning av import och validering.
- `Cutover`: kontrollerad övergång från tidigare system till detta system.
- `YTD`: year-to-date totalsummor som måste bära med till nytt system.
- `Balance baseline`: startsaldo för viss saldofamilj.
- `Cutover diff`: jämförelse mellan förväntat och faktiskt utfall vid test- eller skarp migrering.

# Object model

## PayrollMigrationBatch

Fält:

- `payroll_migration_batch_id`
- `company_id`
- `source_system_code`
- `migration_scope`
- `status`
- `created_at`
- `approved_for_cutover`

## EmployeeMigrationRecord

Fält:

- `employee_migration_record_id`
- `migration_batch_id`
- `person_id`
- `employment_id`
- `ytd_basis`
- `prior_payslip_summary`
- `agi_carry_forward_basis`
- `validation_state`

## BalanceBaseline

Fält:

- `balance_baseline_id`
- `migration_batch_id`
- `person_id`
- `balance_type_code`
- `opening_quantity`
- `opening_value`
- `effective_date`

## CutoverDiff

Fält:

- `cutover_diff_id`
- `migration_batch_id`
- `difference_type`
- `difference_amount`
- `difference_description`
- `status`

# Required fields

- company and source system
- effective cutover date
- employee identity mapping
- YTD basis
- balance baseline or zero-confirmation
- approval metadata

# State machines

## PayrollMigrationBatch

- `draft`
- `imported`
- `validated`
- `diff_open`
- `approved_for_cutover`
- `cutover_executed`
- `rolled_back`

## CutoverDiff

- `open`
- `explained`
- `accepted`
- `blocking`
- `resolved`

# Validation rules

1. Varje anställd som ska ingå i första skarpa körningen måste ha identitetsmappning.
2. Saknat saldo måste vara explicit bekräftat som noll eller blockerande.
3. YTD totalsummor måste täcka alla skatte- och avgiftsrelevanta fält som krävs för fortsatt årsriktig lönehantering.
4. Första skarpa lön får inte öppnas förrän blockerande diff är löst eller uttryckligen avvisat enligt policy.

# Deterministic decision rules

## Rule PMB-001: Migration mode

Varje batch ska vara antingen testmigrering eller skarp migrering. Samma batch får inte växla mode efter start.

## Rule PMB-002: Balance realization

Baselines ska skrivas som balansobjekt eller balanshändelser, inte som osynliga justeringar direkt i lönelogiken.

## Rule PMB-003: Cutover gate

Cutover får inte släppas igenom om batchen har `blocking` diff eller oklassade valideringsfel.

# Rulepack dependencies

- `RP-BALANCES-SE`
- `RP-PAYROLL-MIGRATION-SE`
- `RP-AGI-SE`

# Posting/accounting impact

- ingångsskulder och semesterrelaterade saldoeffekter måste kunna speglas i ledger enligt policy
- skarp migrering får inte skapa historiska dubletter i löneskuld eller personalskulder

# Payroll impact where relevant

- YTD och tidigare skatteunderlag ska påverka fortsatta körningar, kontroller och AGI-beräkningar där det krävs

# AGI impact where relevant

- migreringen måste säkra att nästa AGI bara innehåller nya periodens faktiska förändringar, inte återrapportering av redan redovisad historik

# Review requirements

Review krävs när:

- identitetsmappning är osäker
- YTD saknar verifierbart underlag
- diff inte kan förklaras deterministiskt

# Correction model

- testmigrering korrigeras genom ny batch
- skarp migrering korrigeras genom explicit correction batch eller rollback enligt policy

# Audit requirements

Audit ska visa:

- källa
- mappning
- diff
- approvals
- cutover execution
- rollback om sådan sker

# Golden scenarios covered

- payroll migration with balances
- missing YTD field
- blocking cutover diff
- corrected migration batch

# API implications

Kommandon:

- `create_payroll_migration_batch`
- `import_employee_migration_records`
- `register_balance_baselines`
- `calculate_cutover_diff`
- `approve_cutover`
- `execute_cutover`

Queries:

- `get_migration_batch_status`
- `get_employee_migration_summary`
- `get_open_cutover_diffs`

# Test implications

Måste täckas av:

- `docs/test-plans/payroll-migration-and-balance-tests.md`

# Exit gate

- [ ] migration är egen motor, inte engångsskript
- [ ] saldon importeras explicit
- [ ] blockerande diff stoppar cutover
- [ ] audit och rollback-spår finns
