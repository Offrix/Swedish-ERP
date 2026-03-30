# Security Incident Response

## Purpose

This runbook is the binding security-incident procedure for phases `3.2` through `3.6`.
It covers secret exposure, auth abuse, anomalous provider callbacks, suspicious exports, key compromise and containment.

## Scope

- secret leakage or suspected leakage
- brute-force or credential stuffing against login or MFA
- suspicious BankID, passkey or federation activity
- webhook replay or signing secret compromise
- provider credential exposure
- plaintext leakage into snapshot, export, log or projection
- unauthorized support access or break-glass misuse

## Severity Model

- `SEV-1`: confirmed compromise of S4/S5 data, signing keys, provider credentials or production auth boundary
- `SEV-2`: suspected compromise or repeated high-confidence abuse with possible tenant impact
- `SEV-3`: contained exposure or policy breach without confirmed secret disclosure

## Immediate Containment

1. Open an incident id and assign:
   - incident commander
   - security owner
   - technical lead
   - communications owner
2. Freeze risky actions where needed:
   - login
   - MFA enrollment
   - provider callbacks
   - webhook dispatch
   - exports
   - support impersonation
   - break-glass
3. Identify affected class:
   - S3
   - S4
   - S5
4. Determine scope:
   - tenant
   - provider
   - environment mode
   - object family
5. Revoke or rotate exposed material immediately if S4/S5 is implicated.

## Investigation Checklist

- confirm whether plaintext entered:
  - durable state
  - snapshot/export
  - logs
  - search/activity projections
  - support views
- confirm whether affected sessions or tokens were already used
- confirm whether replay or callback forgery succeeded
- confirm whether evidence bundles remain intact
- confirm whether regulated flows or payouts must be halted

## Required Containment Actions

### Secret or credential exposure

- rotate the affected secret class
- revoke old tokens and sessions
- freeze dependent adapters until smoke verification passes
- if managed secrets, callback secrets or certificate chains are compromised, execute the matching `/v1/ops/*/revoke` route and record `mitigation_started` on the incident

### Auth or MFA abuse

- force lockout on targeted identities
- revoke active sessions
- escalate anomaly thresholds
- require fresh step-up before privileged actions resume

### Snapshot or export leakage

- stop export paths immediately
- invalidate affected artifacts
- open remediation work to purge leaked copies
- create a breach evidence bundle

### Support or break-glass misuse

- end impersonation or break-glass sessions
- isolate involved operator accounts
- preserve audit trail and access review artifacts

## Verification Before Recovery

- rotated secrets verified
- compromised sessions revoked
- masked projections rechecked
- no plaintext remains in regenerated snapshots or exports
- callback, webhook and provider abuse paths blocked
- evidence bundle frozen

## Required Evidence

- incident id
- severity
- affected class and objects
- containment timestamps
- revoked sessions or credentials
- rotation ids
- revoke route targets and related object refs
- verification results
- customer or regulator notification decision
- post-incident corrective actions

## Post-Incident Requirements

1. Document root cause.
2. Record every containment and recovery step.
3. Link all rotations, revocations and evidence bundles.
4. Add a preventive engineering action if policy or runtime allowed the incident.
5. Re-run the affected security tests before closing.

## Required Tests

- `node --test tests/unit/phase3-secret-store-runtime.test.mjs`
- `node --test tests/unit/phase6-auth-hardening.test.mjs`
- `node --test tests/unit/phase13-public-api.test.mjs`
- `node --test tests/integration/api-route-metadata.test.mjs`

## Exit Gate

The incident is not closed until:

- containment is complete
- exposed material is rotated or revoked
- plaintext leakage paths are closed
- affected evidence bundles are frozen
- follow-up engineering actions exist
