# @swedish-erp/rule-engine

Phase 0 and Phase 13.3 rule engine contracts for VAT, payroll, AGI, HUS, automation and other regulated decisions.

## Scope

- Versioned rule packs.
- Deterministic rule evaluation context.
- Explainable decision output.
- Warning/error channel for review queues.
- Rule-pack resolution by jurisdiction and effective date.
- No-code automation rule packs for posting suggestions, classifications and anomaly detection.
- Human override path that preserves original decision history.

## Constraints

- Rule packs are data and versioned code, never UI logic.
- Every decision must include reason and trace fields.
- Automation suggestions can never post directly to ledger without manual review.
