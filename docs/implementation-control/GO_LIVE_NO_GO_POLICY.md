# Go-Live No-Go Policy

Status: support document for `GO_LIVE_ROADMAP_FINAL.md` phase `0.6`.  
This document is not a new source of truth. It operationalizes the final roadmap rule that live, parity and advantage claims must be blocked by default unless the required gates and evidence are explicitly green.

## Scope and precedence

This policy applies to:

- live customer onboarding and live tenant promotion
- trial to live promotion
- pilot expansion beyond explicitly approved cohorts
- release notes and sales claims
- parity and advantage statements
- partner, bureau and provider enablement claims

No narrative statement, green test run, demo, seeded scenario or historical `[x]` marker may override a failed no-go rule in this policy.

## Absolute live no-go rules

The platform, a capability family or a tenant segment must be treated as **not live-ready** if any one of the following is true:

| Rule ID | Live no-go condition | Required evidence to clear |
| --- | --- | --- |
| L-001 | Any required roadmap subphase for the marketed capability is still open, waived above allowed policy, or only represented by historical docs. | Final roadmap gate green, matching runtime coverage, current tests and current runbooks. |
| L-002 | Any CRITICAL or HIGH blocker from `GO_LIVE_BLOCKERS_AND_FIXES.md` or subsequent blocker intake remains open, untriaged or only partially mitigated. | Closed blocker record with evidence refs and replacement tests. |
| L-003 | The only proof for a capability depends on demo seeds, stub providers, simulated receipts, phasebucket routes, shell surfaces or `supportsLegalEffect=false` adapters. | Real legal-effect runtime path, provider-backed evidence and operator runbook. |
| L-004 | A regulated or economic write path still lacks atomic persistence, idempotency, evidence refs, durable replay or recovery-safe commit boundaries. | Transaction boundary proof, replay drill evidence and green recovery tests. |
| L-005 | Secrets, auth factors, provider credentials or protected identities still exist in ordinary durable state, snapshots, logs or shared trial/live storage. | Secret store refs, KMS/HSM-backed rotation evidence and masking verification. |
| L-006 | Trial and live still share credentials, receipts, provider refs, sequences, legal-effect providers or promotion shortcuts that bypass cutover policy. | Isolation proof, promotion plan evidence and separate secret lineage. |
| L-007 | A live migration or cutover path lacks rollback checkpoint, watch-window runbook, acceptance record or signoff chain. | Checkpoint artifact, rollback drill and signed cutover evidence bundle. |
| L-008 | A marketed AB flow still lacks owner distributions, corporate tax/tax declaration pack or SIE4 where the final roadmap marks them as mandatory. | Green phase gates for `7.6`, `12.4`, `12.5` and matching golden scenarios. |
| L-009 | Support or backoffice requires direct database intervention, uncontrolled impersonation or broad privileged reads to operate the capability. | Controlled command path, action class enforcement and audited operator workflows. |
| L-010 | A capability has not passed the relevant golden scenario chain end to end with current rulepacks, current contracts and current evidence. | Green golden scenario evidence with pinned versions and current receipts. |

## Absolute parity no-go rules

The platform, a module or a marketed package must be treated as **not parity-ready** if any one of the following is true:

| Rule ID | Parity no-go condition | Required evidence to clear |
| --- | --- | --- |
| P-001 | Any live no-go rule remains true for the claimed category. | All relevant live no-go rules cleared first. |
| P-002 | `18.3` parity scorecard is not green for the claimed category and competitor family. | Signed parity scorecard with evidence bundle. |
| P-003 | The claimed category is missing any minimum market chain that the final roadmap and library mark as mandatory: accounting, VAT, payroll, AGI, HUS, banking, migration, annual reporting, SIE4 or operator support. | Green end-to-end chain evidence for the category. |
| P-004 | Migration/import works only for a narrow hardcoded source while the claim is phrased as generic Swedish bookkeeping or bureau migration. | Source-family coverage, adapter manifests and documented fallback path across the declared source class. |
| P-005 | Operator workbenches, audit trails, replay or evidence packs are weaker than what is needed to safely operate the category in production. | Workbench, audit and replay evidence for the category. |
| P-006 | The capability is only comparable in UI shape or demo flow, but not in legal-effect runtime behavior. | Runtime evidence and real object lifecycle proof, not UI parity alone. |

## Absolute advantage no-go rules

The platform, a package or a sales motion must be treated as **not advantage-ready** if any one of the following is true:

| Rule ID | Advantage no-go condition | Required evidence to clear |
| --- | --- | --- |
| A-001 | Any parity no-go rule remains true for the claimed differentiator. | All relevant parity rules cleared first. |
| A-002 | `18.4` advantage scorecard is not green for the differentiator being claimed. | Signed advantage scorecard with evidence bundle. |
| A-003 | The differentiator is still a manual service promise, operator workaround or roadmap narrative rather than a first-class runtime capability. | Runtime object model, command path, tests and runbook proving the differentiator is real. |
| A-004 | The differentiator does not measurably improve onboarding, migration, control, auditability, supportability or profitability versus market minimum. | Benchmark evidence, acceptance metrics and customer-ready operator flow. |
| A-005 | The differentiator depends on insecure shortcuts, shared trial/live state, waived blockers or unproven providers. | Security-cleared implementation and provider-backed evidence. |
| A-006 | The claim cannot survive a skeptical operator, auditor or bureau review without verbal explanation. | Self-contained evidence pack, runbook and scorecard proof. |

## Non-waivable no-go conditions

The following may not be waived for live, parity or advantage:

- open CRITICAL or HIGH blocker
- legal-effect claim backed only by seeds, stubs, simulated receipts or shell surfaces
- secrets or strong auth factors in ordinary durable state or snapshots
- missing receipts or evidence chain for regulated flows
- shared trial/live credentials or legal-effect providers
- missing rollback checkpoint for live migration or trial-to-live promotion
- missing owner distributions, corporate tax pack or SIE4 for marketed AB scope where the final roadmap marks them mandatory
- direct database writes as required operator procedure

## Waiver policy

Only bounded, time-boxed waivers below HIGH severity are allowed.

- Required approvers: `platform_owner` + `security_admin` + `finance_owner`
- Required contents: scope, reason, expiration timestamp, compensating controls, evidence refs, rollback path
- Forbidden waiver targets:
  - any non-waivable condition listed above
  - any rule that would create a false live, parity or advantage claim

Expired waivers immediately reactivate the related no-go condition.

## Evidence bundle required before any live, parity or advantage claim

The minimum evidence bundle must include:

- `docs/implementation-control/GOVERNANCE_SUPERSESSION_DECISION.md`
- `docs/implementation-control/GOVERNANCE_CARRY_FORWARD_MATRIX.md`
- `docs/implementation-control/BLOCKER_TRACEABILITY_MATRIX_FINAL.md`
- `docs/implementation-control/LIVE_COVERAGE_NO_GO_RULES.md`
- `docs/implementation-control/MANDATORY_CAPABILITY_LOCKS.md`
- this policy document
- current roadmap gate status
- current blocker status export
- current waiver register, if any

Later phases add scorecards, pilot evidence, go-live decisions and GA runbooks. Those later artifacts do not replace this policy; they build on it.

## Operational verdicts

The allowed verdicts are:

- `blocked`
- `conditionally_blocked`
- `passed_for_scope`

`passed_for_scope` may only be used when the exact capability scope is named and all relevant no-go rules are cleared for that scope.

## Binding interpretation

1. No customer, partner, bureau or internal stakeholder may be told that a capability is live-ready, parity-ready or advantage-ready while a matching no-go rule is still red.
2. Pilot is not the same as live. Pilot evidence may help clear later gates, but it does not override live no-go rules by itself.
3. Sales wording must follow the same policy as engineering wording.
4. If scope is narrower than the general product claim, the wording must stay narrow.
