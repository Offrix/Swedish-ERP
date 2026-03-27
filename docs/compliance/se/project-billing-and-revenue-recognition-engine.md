> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: SE-CMP-020
- Title: Project Billing and Revenue Recognition Engine
- Status: Binding
- Owner: Finance compliance architecture
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/compliance/se/project-billing-and-revenue-recognition-engine.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - projects
  - AR
  - reporting
- Related code areas:
  - `packages/domain-projects/*`
  - `packages/domain-ar/*`
  - `packages/domain-reporting/*`
- Related future documents:
  - `docs/domain/projects-budget-wip-and-profitability.md`
  - `docs/domain/kalkyl.md`

# Purpose

Definiera hur projekt kopplar offert, order, budget, deldebitering, slutfakturering och revenue recognition snapshots.

# Scope

Ingår:

- billing models
- billing readiness
- invoice generation from project milestones or T&M
- recognized revenue handoff
- WIP/deferred revenue relations

Ingår inte:

- generell AR issue logic
- general ledger close mechanics

# Non-negotiable rules

1. Projekt får inte fakturera utan definierad billing model.
2. Revenue recognition snapshot får inte mutera historiska project actuals eller issued invoices.
3. T&M måste ha spårbara tid- och/eller materialunderlag.
4. Fastpris och milestone måste ha låst budget- eller leveransgrund innan fakturering.

# Definitions

- `Billing model`: T&M, fixed price, milestone eller hybrid.
- `Revenue recognition snapshot`: den periodiserade intäktsbild som projects levererar vidare.
- `Billing readiness`: server-side bedömning att projektet får skapa invoice proposal.

# Object model

## ProjectBillingProfile

Fält:

- `project_billing_profile_id`
- `project_id`
- `billing_model_code`
- `revenue_recognition_model_code`
- `status`

## ProjectBillingProposal

Fält:

- `project_billing_proposal_id`
- `project_id`
- `proposal_type_code`
- `proposal_amount`
- `source_snapshot_id`
- `status`

# State machines

## ProjectBillingProposal

- `draft`
- `ready`
- `approved`
- `converted_to_invoice`
- `cancelled`

# Validation rules

1. Project billing proposal måste peka på låst source snapshot eller annan godkänd underlagskedja.
2. Proposal får inte överstiga tillåtet kvarvarande värde utan review.
3. Hybridmodell måste bryta ut sina delkomponenter tydligt.

# Deterministic decision rules

## Rule PBR-001: T&M

T&M-proposal bygger på godkända timmar och fakturerbara material enligt låst snapshot.

## Rule PBR-002: Fixed price

Fastprisproposal bygger på kontraktslogik och budget-/milstolpsstatus enligt vald modell, inte på fri manuell summa.

## Rule PBR-003: Revenue recognition

Recognized revenue ska materialiseras i snapshot och användas som kontrollpunkt för WIP/deferred revenue, inte räknas i UI.

# Rulepack dependencies

- `RP-VAT-SE`
- `RP-HUS-SE` where relevant
- `RP-ACCOUNTING-METHOD-SE`

# Posting/accounting impact

- issue sker i AR
- revenue recognition snapshots används i reporting och close

# VAT impact where relevant

- VAT ligger kvar i AR/VAT-domänerna men project billing måste leverera korrekt scenario och källobjekt

# HUS impact where relevant

- projekt med HUS-kopplade arbeten måste bära HUS references till AR/HUS overlay

# Review requirements

- overbilling risk
- missing milestone evidence
- inconsistent hybrid profile

# Correction model

- ny billing proposal version
- credit chain i AR
- ny revenue recognition snapshot

# Audit requirements

- source snapshot
- billing profile
- approvals
- conversion to invoice

# Golden scenarios covered

- project cost from payroll
- HUS accepted in project context

# API implications

- create billing proposal
- approve/cancel proposal
- convert to AR invoice

# Test implications

- T&M rollup
- fixed price readiness
- hybrid model control

# Exit gate

- [ ] projektfakturering bygger på låsta underlag
- [ ] revenue recognition materialiseras server-side
- [ ] AR och projects har tydlig ansvarsfördelning

