# Payroll Input Snapshots Verification

## Scope

This runbook verifies roadmap subphase `11.5 Payroll input snapshots`.

The gate is only green when:

- every created pay run locks a first-class payroll input snapshot object
- the pay run exposes immutable `payrollInputSnapshotId`, `payrollInputFingerprint` and `payRunFingerprint`
- rereads of the same pay run return the same locked snapshot and the same fingerprints
- downstream payroll artifacts carry the locked fingerprint chain:
  - payroll posting
  - payout batch
  - AGI materialization

## Targeted verification

Run:

```powershell
node --test C:\Users\snobb\Desktop\Swedish ERP\tests\unit\phase11-payroll-input-snapshots.test.mjs
node --test C:\Users\snobb\Desktop\Swedish ERP\tests\unit\payroll-phase8-3.test.mjs
node --test C:\Users\snobb\Desktop\Swedish ERP\tests\integration\phase11-payroll-input-snapshots-api.test.mjs
node --test C:\Users\snobb\Desktop\Swedish ERP\tests\integration\phase8-payroll-posting-api.test.mjs
```

Expected:

- all tests green
- pay run responses include embedded `payrollInputSnapshot`
- posting and payout payloads expose the same locked snapshot identifiers
- AGI payload carries `payrollInputSnapshotRefs`

## Full verification

Run:

```powershell
node scripts/run-tests.mjs all
node scripts/lint.mjs
node scripts/typecheck.mjs
node scripts/build.mjs
node scripts/security-scan.mjs
```

Expected:

- full suite green
- no lint violations
- no type errors
- build green
- security scan green

## Failure handling

- If `payrollInputSnapshotId` or `payrollInputFingerprint` is missing on a pay run, the subphase is not complete.
- If `payRunFingerprint` changes between rereads without recalculation, treat that as an integrity failure.
- If downstream posting, payout or AGI output loses the locked fingerprint chain, do not mark `11.5` complete.
