# Project Profitability

## Scope

This runbook covers the canonical profitability chain for project core:

- agreement-backed commercial truth
- approved revenue-plan truth
- cost, WIP and forecast snapshot materialization
- profitability snapshot materialization by project and cutoff
- blocker handling before downstream ledger effect

## Preconditions

- the project must exist and be active for the selected cutoff
- at least one signed project agreement should cover the cutoff date
- at least one approved revenue plan should exist for the project
- upstream finance sources must be available:
  - AR for billed revenue
  - AP and payroll for actual cost
  - time/HR where staffing and labor cost evidence is part of the model

## Operating sequence

1. Confirm the signed agreement that governs the cutoff date.
2. Confirm the approved revenue plan that governs the cutoff date.
3. Materialize or refresh project cost and WIP snapshots at the target cutoff.
4. Materialize the profitability snapshot for the same cutoff.
5. Review the resulting values:
   - `plannedRevenueAmount`
   - `billedRevenueAmount`
   - `recognizedRevenueAmount`
   - `actualCostAmount`
   - `currentMarginAmount`
   - `forecastMarginAmount`
6. Review `blockerRefs` before any downstream WIP bridge or invoice readiness decision.

## Control points

- `agreement_missing` blocks regulated downstream use of the snapshot.
- `approved_revenue_plan_missing` blocks regulated downstream use of the snapshot.
- Snapshot materialization is idempotent by content hash. Re-running the same cutoff with the same finance truth must return the same logical snapshot outcome instead of creating silent drift.
- Profitability is always derived from canonical project and finance truth; no vertical pack may invent ledger effect without this chain.

## Evidence and audit

- every materialized snapshot stores:
  - cutoff date and reporting period
  - agreement and approved revenue-plan references
  - source snapshot references for cost, WIP and forecast
  - a deterministic snapshot hash
- every materialization emits `project.profitability.materialized` audit evidence

## Recovery

- if a blocker is present, correct the underlying agreement or revenue-plan chain first and re-materialize
- if upstream AR, AP, payroll or time truth changes, re-run profitability for the affected cutoff
- do not patch profitability snapshots manually; rebuild from corrected source truth
