# Phase 18.5 UI Contract Freeze Verification

## Purpose

Verify that the backend contract baseline for desktop, backoffice and field is frozen from real runtime contracts and cannot be released from a blocked advantage state.

## Preconditions

- A company has completed the `18.1` pilot execution path.
- Accepted pilot cohorts exist for finance, project/service and field parity slices.
- A released `AdvantageReleaseBundle` exists for the same company.
- The API runtime starts in a non-demo protected mode.

## Verification steps

1. Create or confirm a released advantage bundle.
2. Call `POST /v1/release/ui-contract-freezes` with:
   - `companyId`
   - `advantageReleaseBundleId`
3. Verify the returned record has:
   - `status = frozen`
   - non-zero `objectProfileCount`
   - non-zero `workbenchCount`
   - non-zero `readRouteContractCount`
   - non-zero `actionRouteContractCount`
   - non-zero `commandCount`
   - non-zero `blockerCount`
   - non-zero `permissionReasonCount`
   - `surfaceFamilyCodes = ["backoffice", "desktop", "field"]`
4. Call `GET /v1/release/ui-contract-freezes?companyId=...` and confirm the record is listed.
5. Call `GET /v1/release/ui-contract-freezes/:uiContractFreezeRecordId` and confirm:
   - `contractSnapshot.objectProfileContracts` exists
   - `contractSnapshot.workbenchContracts` exists
   - `contractSnapshot.readRouteContracts` exists
   - `contractSnapshot.actionRouteContracts` exists
   - `contractSnapshot.permissionReasonCatalog` exists
   - `hashes.aggregateHash` is stable and 64 hex chars
6. Call `GET /v1/release/ui-contract-freezes/:uiContractFreezeRecordId/evidence` and confirm:
   - `bundleType = ui_contract_freeze_record`
   - evidence contains artifacts for:
     - object profiles
     - workbenches
     - commands
     - blockers
     - read routes
     - action routes
     - permission reasons
     - manifest
7. Attempt to create a freeze from a blocked advantage bundle and verify the call fails with:
   - `ui_contract_freeze_requires_released_advantage_bundle`

## Required test commands

```powershell
node --test tests/unit/phase18-ui-contract-freeze.test.mjs
node --test tests/integration/phase18-ui-contract-freeze-api.test.mjs
node --test tests/e2e/phase18-ui-contract-freeze-flow.test.mjs
node --test tests/integration/api-route-metadata.test.mjs
```

## Exit criteria

- UI contract freeze record is created only from a released advantage bundle.
- Freeze snapshot is deterministic for unchanged runtime contracts.
- Evidence bundle is exportable and hash-complete.
- API metadata exposes the release routes for the freeze record.
