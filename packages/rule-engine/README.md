# @swedish-erp/rule-engine

Phase 0 and Phase 13.3 rule engine contracts for VAT, payroll, AGI, HUS, automation and other regulated decisions.

## Scope

- Versioned rule packs.
- Effective-dated selection with inclusive `effectiveFrom` and exclusive `effectiveTo`.
- Explicit rule-pack codes and immutable version identifiers.
- Draft, validation, approval, publish and retire transitions.
- Rollback override records that redirect future evaluations without rewriting historical decisions.
- Deterministic rule evaluation context.
- Explainable decision output.
- Warning/error channel for review queues.
- Rule-pack resolution by jurisdiction and effective date.
- No-code automation rule packs for posting suggestions, classifications and anomaly detection.
- Human override path that preserves original decision history.

## Constraints

- Rule packs are data and versioned code, never UI logic.
- Every decision must include reason and trace fields.
- Published rule-pack versions are append-only from a business-history perspective.
- Historical decisions stay pinned to the version that produced them.
- Automation suggestions can never post directly to ledger without manual review.
