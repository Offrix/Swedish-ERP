# Rulepack Publication

## Purpose

This runbook controls publication, rollback and emergency override of regulated rulepacks.
It applies to accounting method, fiscal year, legal form, annual filing, VAT, payroll, HUS and tax-account rulepacks.

## Preconditions

- Official source material is captured and stored with URL, retrieval date and checksum.
- Proposed rulepack version is in `draft` or `validated`.
- Domain owner and compliance owner are assigned.
- Sandbox verification data set exists for the effective period being published.
- Historical pinning impact has been reviewed for affected objects, submissions and annual packages.

## Publication Flow

1. Create or update the draft rulepack version with:
   - `rulePackCode`
   - `version`
   - `effectiveFrom`
   - `effectiveTo`
   - `checksum`
   - `sourceSnapshotDate`
   - machine-readable rules
   - human explanation
   - migration notes
2. Validate the pack against:
   - date-boundary test vectors
   - historical reproduction scenarios
   - negative review-boundary scenarios
3. Record evidence:
   - official source references
   - test output references
   - reviewer approvals
4. Approve the pack with dual control:
   - domain owner
   - compliance owner
5. Publish the pack.
6. Verify downstream consumers resolve the new version only on or after `effectiveFrom`.

## Mandatory Tests Before Publish

- date-cutover test
- historical replay with pinned prior version
- same-input deterministic reproduction
- correction flow against prior published version
- explanation payload snapshot

## Rollback Rules

- Rollback is allowed only through explicit rollback activation.
- Historical objects keep their original pinned rulepack reference.
- Rollback never rewrites historical decisions.
- Replay after rollback must use:
  - original pinned version for historical payloads
  - rollback target version only for new effective dates covered by the override

## Emergency Override Rules

- Emergency override requires dual control.
- Override must include:
  - reason code
  - requested by
  - approved by
  - start time
  - expiry time
  - replay requirement flag
- Override cannot be indefinite.
- Override must be followed by a normal published replacement or explicit cancellation.

## Post-Publish Checks

- Confirm resolution on:
  - prior date
  - boundary date
  - post-boundary date
- Confirm audit events were written for publication.
- Confirm affected domains return pinned `rulepackId`, `rulepackCode`, `rulepackVersion` and checksum where required.
- Confirm no forbidden hardcoded annual branches remain active in the affected path.

## Failure Handling

- If validation fails: keep the pack in `draft` or `validated`, do not publish.
- If sandbox results diverge from expected outcomes: open a regulatory review case.
- If production symptoms appear after publish:
  - evaluate rollback override
  - capture evidence pack
  - open incident
  - block affected live submissions if legal correctness is uncertain
