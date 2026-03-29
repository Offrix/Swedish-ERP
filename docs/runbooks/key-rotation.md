# Key Rotation

## Purpose

This runbook is the binding operational procedure for phase `3.2` and `3.6` key lifecycle control.
It governs KEK rotation, blind-index key rotation, secret re-wrap, overlap windows and retirement evidence.

## Scope

- mode root keys
- service KEKs
- blind-index keys
- secret-store envelope keys
- session signing keys
- webhook secrets and provider credentials when they are rotated through the same evidence chain

## Preconditions

- a published `RotationPlan` exists
- impacted secret classes and object families are identified
- dual-running support is confirmed where overlap is required
- incident commander and security owner are assigned for emergency rotation

## Required Inputs

- `rotationId`
- `secretClass`
- `environmentMode`
- `oldKeyVersion`
- `newKeyVersion`
- `overlapUntil`
- affected stores or object families
- rollback owner

## Procedure

1. Verify the rotation reason:
   - scheduled lifecycle rotation
   - provider policy rotation
   - security incident
   - certificate expiry
2. Confirm scope:
   - auth factors
   - provider credentials
   - webhook secrets
   - payroll/tax/HUS protected data
   - document artifacts
   - session signing
3. Freeze a `RotationPlan` with:
   - old key version
   - new key version
   - overlap strategy
   - affected services
   - rollback plan
   - signoffs
4. Create the new key version in the external KMS/HSM or approved key manager.
5. Enable dual-read or dual-verify if the rotated class requires overlap.
6. Re-wrap existing protected entries in batches and record progress.
7. Run smoke verification:
   - new writes use `newKeyVersion`
   - old protected entries can still be read during overlap
   - masked projections remain stable
   - blind-index lookups still resolve correctly
8. Cut over all writes to the new key version.
9. Re-run coverage checks until the old key version has no active protected payloads left except explicitly approved overlap objects.
10. Retire the old key version only after:
   - overlap window ended
   - coverage is complete
   - rollback window closed
   - evidence bundle frozen

## Mandatory Verification

- no plaintext secret material appears in durable exports
- all rotated secret metadata points at `newKeyVersion`
- old key version remains readable only during approved overlap
- protected payload counts before and after rotation match
- no tenant or mode crossed key boundaries during re-wrap

## Evidence Bundle

The evidence bundle must contain:

- `rotationId`
- reason code
- old/new key versions
- overlap window
- coverage summary
- failed items and retry status
- rollback decision
- approving actors
- timestamps for start, cutover and retirement

## Rollback

Rollback is allowed only before old key retirement.

1. Stop new batch re-wrap work.
2. Restore write target to `oldKeyVersion`.
3. Keep dual-read enabled until verification completes.
4. Record rollback reason in the same evidence chain.
5. Open a security incident if rollback was caused by integrity or exposure risk.

## Emergency Rotation

Use emergency rotation when:

- a secret class is suspected exposed
- a signing or session key is compromised
- webhook secret replay is detected
- provider credential leakage is suspected

Emergency rotation requires:

- security owner approval
- incident id
- rollback owner
- post-incident review

## Required Tests

- `node --test tests/unit/phase3-secret-store-runtime.test.mjs`
- `node --test tests/unit/phase3-security-classification.test.mjs`
- `node --test tests/unit/phase6-auth-hardening.test.mjs`
- `node --test tests/unit/phase13-public-api.test.mjs`

## Exit Gate

Phase `3.2` / `3.6` key rotation is green only when:

- an explicit rotation plan exists
- secret re-wrap coverage is complete
- overlap behavior is verified
- retirement evidence is frozen
- no plaintext secret leaked into durable export, logs or support projections
