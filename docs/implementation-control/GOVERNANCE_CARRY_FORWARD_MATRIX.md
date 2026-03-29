# Governance Carry-Forward Matrix

- Decision ID: `governance-carry-forward-2026-03-29`
- Effective from: `2026-03-29`
- Status: `active`
- Type: `carry-forward`

## Purpose

This document preserves the parts of the superseded roadmap/bible that were directionally correct without reviving their historical `[x]` markers as acceptance truth.

The only binding build truth remains:

- `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md`
- `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`

This matrix exists to prevent regressions back to construction-first scope, weak trial/live handling, vague provider governance, or thin operator support.

## Preserved principles

| Preserved principle | Why it remains binding | Final governing sections | Repo/runtime effect now | Anti-regression rule |
| --- | --- | --- | --- | --- |
| General Swedish company platform, not construction-first | Product scope must stay broad enough for all Swedish companies and not collapse into a construction product with accounting attached. | `GO_LIVE_ROADMAP_FINAL.md` sections `Det som behålls`, `Fas 13`; `PHASE_IMPLEMENTATION_LIBRARY_FINAL.md` sections `Det som behålls`, `Fas 13` | README, domain boundaries, project core, field/personalliggare/ID06 and future docs must describe construction/field as vertical packs above general finance/project truth. | No document, route, package or go-to-market artifact may redefine the product as construction-first or let field packs become financial source of truth. |
| Finance/payroll before general project core and vertical packs | Financial truth, payroll truth and regulated chains must be stable before projects, WIP, field or vertical extensions can depend on them. | `GO_LIVE_ROADMAP_FINAL.md` sections `Det som behålls`, `Fasberoenden i kortform`, `Fas 13`; `PHASE_IMPLEMENTATION_LIBRARY_FINAL.md` sections `Det som behålls`, `Fas 13` | Phase ordering, dependencies, acceptance gates and implementation sequencing must keep phases 7-12 ahead of general project core and all vertical packs. | No project/field/personalliggare/ID06 work may claim completion by bypassing ledger, VAT, payroll, HUS, annual or owner-distribution truth. |
| Trial/live separation is a first-class engineering problem | Trial safety is not a UX banner; it is a technical, cryptographic and operational isolation requirement. | `GO_LIVE_ROADMAP_FINAL.md` sections `Det som behålls`, `Fas 6`, `N-006`; `PHASE_IMPLEMENTATION_LIBRARY_FINAL.md` sections `Det som behålls`, `Trial/live separation`, `Fas 6`, `Fas 16` | Tenants, secrets, receipts, provider refs, sequences, evidence, dashboards, jobs and promotion paths must be modeled and operated as separated environments. | No shared credentials, sequences, receipts, provider refs, dashboards or in-place promotion between trial and live are allowed. |
| Rulepack and provider baseline governance | Regulatory values and provider contracts must be published, pinned and rollbackable instead of being embedded ad hoc in domain code. | `GO_LIVE_ROADMAP_FINAL.md` sections `Det som behålls`, `Fas 5`; `PHASE_IMPLEMENTATION_LIBRARY_FINAL.md` sections `Det som behålls`, `Regulatoriska ankare`, `Fas 5` | Rulepack/publication pipelines, provider baselines, effective dating and baseline references stay mandatory across finance, payroll, HUS, filings and integrations. | No live code path may hardcode regulated values or provider contract semantics when rulepack/baseline publication is the required mechanism. |
| Operator-first support and backoffice | Replay, incidents, masking, workbenches and controlled support actions are product capabilities, not afterthoughts. | `GO_LIVE_ROADMAP_FINAL.md` sections `Det som behålls`, `Fas 14`, `Fas 17`, `Fas 18`; `PHASE_IMPLEMENTATION_LIBRARY_FINAL.md` sections `Det som behålls`, `Fas 14`, `Fas 17`, `Fas 18` | Support/backoffice, operations workbenches, incident objects, replay and evidence packs must stay explicit build targets and acceptance gates. | No direct DB operations, hidden support-only behavior or unmasked privileged reads may replace controlled operator paths. |
| Unified receipts, evidence and recovery intuition | Regulated and integration-heavy flows need a common receipts/recovery model to be auditable, replayable and operable. | `GO_LIVE_ROADMAP_FINAL.md` sections `Det som behålls`, `Absoluta regler`, `Fas 4`, `Fas 12`, `Fas 15`, `Fas 17`; `PHASE_IMPLEMENTATION_LIBRARY_FINAL.md` sections `Det som behålls`, `Globala bindande invariants`, `Fas 4`, `Fas 12`, `Fas 15`, `Fas 17` | Submission, payroll, tax, HUS, migration and integration runtimes must emit receipts/evidence chains and support replay/recovery through canonical operational paths. | No regulated submission, provider send, replay or recovery path may exist without receipts, evidence refs, audit trail and operator-visible status. |

## Binding interpretation

1. The preserved principles above are valid only as carried forward into the final roadmap and final implementation library.
2. No historical `[x]` or superseded phase structure regains authority through this matrix.
3. Any new repo artifact that weakens one of these principles is a governance regression and must be treated as a blocker.

## Evidence refs

- `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md`
- `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`
- `docs/implementation-control/GOVERNANCE_SUPERSESSION_DECISION.md`
- `docs/runbooks/governance-supersession.md`
