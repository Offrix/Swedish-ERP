# Opening Balances And SIE

## Purpose

This runbook is the binding operator procedure for phase `7.6` opening-balance intake and SIE4 import/export.
It defines how opening balances are loaded, how journal history is imported, how SIE4 exports are produced and how finance/support verifies the result before migration, audit or bureau handoff.

## Scope

- `packages/domain-ledger/src/index.mjs`
- `packages/domain-sie/src/index.mjs`
- opening balance batches
- SIE4 export jobs
- SIE4 import jobs
- journal-history preservation of voucher series and numbering

## Preconditions

- company, fiscal year and ledger chart exist
- accounting method and fiscal-year profile are configured for the target company
- voucher series policy is installed
- actor has `company.manage` for import and `company.read` for export
- source SIE4 payload has been reviewed for company identity, fiscal-year scope and import mode

## Opening Balance Import

1. Confirm target company and fiscal year.
2. Choose import mode `opening_balance_batch`.
3. Provide SIE4 content that contains `#RAR`, `#KONTO` and `#IB`.
4. Call `POST /v1/sie/imports` with:
   - `companyId`
   - `modeCode=opening_balance_batch`
   - `content`
   - `fiscalYearId` when target fiscal year is explicitly known
   - `openingDate` only when a non-default opening date is required
   - `actorId`
   - `idempotencyKey`
5. Verify the created import job has:
   - `status=applied`
   - `openingBalanceBatchId`
   - `importedJournalEntryIds=[]`
6. Inspect the created opening-balance batch in ledger and confirm status `posted`.

## Journal History Import

1. Confirm the import is historical and should preserve source voucher numbering.
2. Choose import mode `journal_history`.
3. Provide SIE4 content that contains `#VER` and `#TRANS`.
4. Call `POST /v1/sie/imports` with:
   - `companyId`
   - `modeCode=journal_history`
   - `content`
   - `actorId`
   - `idempotencyKey`
5. Verify the created import job has:
   - `status=applied`
   - populated `importedJournalEntryIds`
6. Confirm imported journals in ledger preserve:
   - voucher series
   - voucher number
   - posting date
   - journal description
   - imported history marker

## SIE4 Export

1. Confirm fiscal-year or date scope for the export.
2. Call `POST /v1/sie/exports` with:
   - `companyId`
   - optional `fiscalYearId`
   - optional `fromDate`
   - optional `toDate`
   - `actorId`
   - `idempotencyKey`
3. Verify export job fields:
   - `status=completed`
   - `formatCode=SIE4`
   - `checksumAlgorithm=sha256`
   - non-empty `checksum`
   - non-empty `content`
4. Confirm exported payload contains at least:
   - `#FLAGGA`
   - `#PROGRAM`
   - `#SIETYP`
   - `#FNAMN`
   - `#ORGNR`
   - `#RAR`
   - `#KONTO`
   - `#IB`
   - `#VER`
   - `#TRANS`

## Verification Checklist

1. Opening-balance import creates a posted opening-balance batch.
2. Journal-history import creates posted journals instead of detached metadata.
3. Imported journals preserve voucher series and voucher numbers without collisions.
4. Replaying the same import/export idempotency key returns the existing job instead of duplicating effects.
5. Export checksum is stable for unchanged source scope.
6. No secret material is present in SIE payloads or SIE durable snapshots.

## Failure Handling

If SIE import fails:

1. stop the import path
2. capture the error code and offending import mode
3. verify required sections exist in the source payload
4. verify the fiscal year exists and is open for posting when journal history is imported
5. verify voucher number conflicts before retry
6. retry only with a new idempotency key after the root cause is corrected

If SIE export fails:

1. capture the company, fiscal-year or date scope and error code
2. verify ledger access and fiscal-year selection
3. confirm source journals and opening balances exist for the requested scope
4. rerun only after the failure cause is corrected

## Required Tests

- `node --test tests/unit/phase7-sie4.test.mjs`
- `node --test tests/integration/phase7-sie4-api.test.mjs`
- `node --test tests/integration/api-route-metadata.test.mjs`
- `node scripts/run-tests.mjs all`

## Exit Gate

Phase `7.6` SIE/opening-balance coverage is green only when:

- opening-balance import creates a real posted batch
- journal-history import creates real posted journals
- voucher series and numbering are preserved for imported history
- export emits valid SIE4 structural markers with checksum metadata
- idempotency prevents duplicate import/export side effects
