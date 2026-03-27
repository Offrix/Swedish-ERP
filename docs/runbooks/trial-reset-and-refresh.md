# Trial Reset And Refresh

## Purpose

Run deterministic `trial reset` and `trial refresh` for isolated trial tenants without leaking live credentials, legal effect or stale trial process data into upgrade or pilot paths.

## Preconditions

- Trial environment mode is `trial`.
- Trial isolation status is `isolated`.
- Live credentials, live submissions, live bank rails and live economic effect remain blocked.
- Operator uses a strong session with `company.manage`.

## Seed scenarios

Supported canonical seed scenarios:

- `service_company_basic`
- `consulting_time_and_milestone`
- `salary_employer_with_agi`
- `hus_eligible_services_company`
- `project_service_with_field_pack`
- `construction_service_pack`
- `retainer_capacity_agency`
- `trade_and_supplier_invoices`

Legacy alias:

- `agency_trial_seed` -> `retainer_capacity_agency`

## Refresh

Use refresh when masterdata should remain but new process examples should be appended.

Current refresh packs:

- `documents_and_work_items`
- `bank_tax_and_receipts`

Refresh effects:

- preserves seed scenario and masterdata
- appends deterministic document and work item references
- increments `refreshCount`
- records refresh history
- freezes a `trial_refresh` evidence bundle

## Reset

Use reset when trial process data must be discarded and the scenario must be reseeded deterministically.

Reset effects:

- revokes all other open sessions in the tenant
- archives prior process-state metadata according to `trial_reset_archive_30d`
- reseeds the current seed scenario deterministically
- clears accumulated refresh history
- increments `resetCount`
- freezes a `trial_reset` evidence bundle

## Verification

After refresh or reset, verify:

- `trialIsolationStatus` is still `isolated`
- `supportsRealCredentials` is `false`
- `supportsLegalEffect` is `false`
- `latestRefreshEvidenceBundleId` or `latestResetEvidenceBundleId` is present
- seed scenario code and version are present
- refresh/reset history has the expected new entry

## Exit gate

Trial reset/refresh is acceptable only when:

- deterministic seed metadata is present
- route metadata publishes both reset and refresh
- evidence bundle creation succeeds or deterministic local fallback is emitted
- other open sessions were revoked during reset
- no live-path capability was enabled
