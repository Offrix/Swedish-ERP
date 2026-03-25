# Master metadata

- Document ID: SE-CMP-016
- Title: Payroll Engine
- Status: Binding
- Owner: Payroll compliance architecture
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/compliance/se/payroll-engine.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rulepack-register.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - payroll
  - balances
  - agreements
  - AGI
  - banking
- Related code areas:
  - `packages/domain-payroll/*`
  - `packages/domain-balances/*`
  - `packages/domain-collective-agreements/*`
  - `packages/domain-ledger/*`
  - `apps/api/*`
- Related future documents:
  - `docs/compliance/se/payroll-migration-and-balances-engine.md`
  - `docs/compliance/se/collective-agreements-engine.md`
  - `docs/domain/payroll-workbench-and-ops.md`

# Purpose

Definiera den bindande lönekärnan för beräkning, pay runs, AGI-underlag, bokföringsintents, nettolön och rättelser.

# Scope

Ingår:

- pay calendars and pay periods
- pay runs and extra runs
- pay lines and payroll outcomes
- skatt, SINK och arbetsgivaravgifter
- balances and agreements handoff
- AGI constituents
- payment batches

Ingår inte:

- generella HR-register
- pensionsprodukt i detalj utöver payroll impact
- field/mobile UI

# Non-negotiable rules

1. Samma underlag och samma rulepackversion ska ge samma pay-run-resultat.
2. Alla beräkningssteg ska vara historiskt reproducerbara.
3. Payroll är enda ägare av AGI constituents.
4. Balances och agreements ska läsas server-side; UI får inte räkna avtal eller saldon.
5. Postad pay run får inte muteras tyst; rättelse ska ske via correction pay run eller explicit reversal chain.
6. Arbetsgivaravgifter ska styras av utbetalningsdatum, personstatus och aktivt rulepack.
7. För ersättningar under SINK ska särskild källskatt enligt giltigt beslut användas; från inkomstår 2026 är huvudnivån 22,5 procent enligt Skatteverket.
8. För 2026 ska full arbetsgivaravgift behandlas som 31,42 procent och reducerad nivå som 10,21 procent i de fall regelpaketen anger det.

9. FÃ¶r utbetalningsdatum 1 april 2026 till och med 30 september 2027 ska rulepacken ocksÃ¥ kunna tillÃ¤mpa den tillfÃ¤lliga ungdomsnedsÃ¤ttningen fÃ¶r personer som Ã¤r 19 till 23 Ã¥r under utbetalningsÃ¥ret: 20,81 procent pÃ¥ ersÃ¤ttning upp till 25 000 kr per mÃ¥nad och full nivÃ¥ pÃ¥ ersÃ¤ttning dÃ¤rutÃ¶ver.

# Definitions

- `Pay run`: låst beräkning för viss period och population.
- `Pay line`: enskilt löneutfall med type, amount och tax treatment.
- `AGI constituent`: payrollgenererat rapportobjekt till arbetsgivardeklaration.
- `Correction pay run`: rättelsekörning som bevarar tidigare historik.
- `Balance snapshot`: låst bild av semester-, komp-, flex- eller andra banker vid körning.

# Object model

## PayRun

Fält:

- `pay_run_id`
- `company_id`
- `pay_period_id`
- `run_type_code`
- `status`
- `rulepack_version_set`
- `calculated_at`
- `approved_at`

## PayLine

Fält:

- `pay_line_id`
- `pay_run_id`
- `employee_id`
- `pay_item_code`
- `amount`
- `tax_treatment_code`
- `employer_contribution_treatment_code`
- `agi_box_code`
- `source_object_type`
- `source_object_id`

## AgiConstituent

Fält:

- `agi_constituent_id`
- `pay_run_id`
- `employee_id`
- `income_period`
- `box_code`
- `amount`
- `status`

# Required fields

- employee identity
- pay period
- pay item code
- calculation inputs
- active rulepack set
- agreement and balance snapshots when relevant
- approval metadata before payment

# State machines

## PayRun

- `draft`
- `calculating`
- `calculated`
- `approved`
- `posted`
- `payment_prepared`
- `closed`
- `corrected`

## AgiConstituent

- `draft`
- `ready`
- `submitted`
- `corrected`
- `closed`

# Validation rules

1. `approved` kräver att blockerande payroll exceptions är lösta.
2. Pay run får inte använda osignerad migration opening state.
3. Samma employee och pay item får inte dubbelskapas genom replay utan idempotency key.
4. Negativ nettolön eller otillåtet saldo ska blockera eller skicka till review enligt policy.
5. SINK, skattetabell eller särskild skatteinställning måste vara låst på pay-run snapshot innan beräkning.

# Deterministic decision rules

## Rule PAY-001: Calculation order

Beräkning ska ske i denna ordning:

1. load employee and period
2. load balances, agreements and attendance inputs
3. apply fixed pay items
4. apply variable items and document-driven benefits
5. apply gross deductions
6. calculate taxable income
7. calculate preliminary tax or SINK
8. calculate employer contributions
9. apply net deductions
10. create AGI constituents
11. create posting intents
12. create payment batch

## Rule PAY-002: Contributions

Arbetsgivaravgift ska för 2026 utgå från full nivå 31,42 procent eller reducerad nivå 10,21 procent när rulepacken för personens status medger det.

### Youth reduction overlay

FÃ¶r utbetalningsdatum 1 april 2026 till och med 30 september 2027 ska rulepacken dessutom kunna tillÃ¤mpa den tillfÃ¤lliga ungdomsnedsÃ¤ttningen fÃ¶r personer som Ã¤r 19 till 23 Ã¥r under utbetalningsÃ¥ret. Den ska berÃ¤knas som 20,81 procent pÃ¥ ersÃ¤ttning upp till 25 000 kr per mÃ¥nad och full nivÃ¥ pÃ¥ ersÃ¤ttning Ã¶ver taket. Detta ska behandlas som en egen deterministisk regel i employer-contribution-rulepacken, inte som manuell specialkod i UI eller ad hoc-override.

## Rule PAY-003: SINK

Vid giltigt SINK-beslut ska källskatt beräknas enligt aktivt beslut; från inkomstår 2026 är huvudnivån 22,5 procent.

## Rule PAY-004: Correction

Fel i tidigare pay run rättas genom correction pay run eller AGI-correction chain, aldrig genom att tidigare beräkningsresultat skrivs över.

# Rulepack dependencies

- `RP-PAYROLL-SE`
- `RP-EMPLOYER-CONTRIBUTIONS-SE`
- `RP-SINK-SE`
- `RP-COLLECTIVE-AGREEMENTS-SE`
- `RP-BALANCES-SE`

# Posting/accounting impact

- pay run ska generera bokföringsintents för bruttolön, skatt, arbetsgivaravgifter, nettolöneavdrag, förmåner, pensionspåverkan och nettolöneskuld
- payroll cost allocation till projekt ska ske från payroll outcome, inte från UI

# Payroll impact where relevant

- benefits, travel and pension handoffs ska bli pay lines eller separata payroll outcomes genom officiella kommandon

# AGI impact where relevant

- payroll skapar enda källan till individuppgifter och rättelser

# Review requirements

Review krävs vid:

- negativ nettolön
- saknat eller motsägelsefullt skattebeslut
- document-driven benefit with ambiguity
- migration diff over tolerance

# Correction model

- correction pay run
- AGI correction case
- reversal or replacement of payment batch when policy tillåter

# Audit requirements

Audit ska visa:

- input snapshots
- rulepack versions
- approvals
- AGI constituent lineage
- payment batch lineage

# Golden scenarios covered

- taxable benefit
- net salary deduction
- payroll migration with balances
- AGI correction
- project cost from payroll

# API implications

- pay-run calculate/approve commands
- exception queries
- AGI submission prep
- correction pay-run commands

# Test implications

- deterministic rerun
- contribution and SINK tests
- correction chains
- balance and agreement handoff tests

# Exit gate

- [ ] pay runs är reproducerbara och versionsstyrda
- [ ] payroll är enda source of truth för AGI constituents
- [ ] correction, balances och agreements fungerar utan tyst mutation
