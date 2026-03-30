# Provider Baseline Update

## Purpose

This runbook governs publication, retirement and rollback of provider-specific baselines such as BankID RP API, signing archives, Peppol BIS Billing, ISO20022 bank files, Bankgiro CSV files, SIE4 files, migration CSV/Excel templates, bureau handoff packages, payment link APIs, SRU exports and authority support formats.

## Preconditions

- Official source material is captured with URL, retrieval date and checksum.
- The affected provider baseline exists in `draft` or `validated`.
- Domain owner and integration/compliance owner are assigned.
- Sandbox or non-live verification path exists for the provider and format family.
- Historical pinning impact has been reviewed for affected submissions, deliveries, payment links, annual packages and auth flows.

## Required Baseline Fields

Every published provider baseline must contain:

- `providerBaselineId`
- `baselineCode`
- `providerCode`
- `domain`
- `jurisdiction`
- `formatFamily`
- `version`
- `specVersion`
- `effectiveFrom`
- `effectiveTo` where applicable
- `checksum`
- `sourceSnapshotDate`
- `semanticChangeSummary`

## Publication Flow

1. Create or update the draft baseline with all required fields plus source references.
2. Validate the baseline against:
   - provider contract tests
   - payload serialization tests
   - date-boundary selection tests
   - replay and historical reproduction scenarios
3. Record evidence:
   - official source references
   - checksum of captured spec artefacts
   - test output references
   - reviewer approvals
4. Approve with dual control:
   - owning domain or integration owner
   - compliance/security owner where the provider affects regulated or identity flows
5. Publish the baseline.
6. Verify consumers resolve the new version only on or after `effectiveFrom`.

## Mandatory Tests Before Publish

- effective date cutover test
- overlapping interval rejection test
- historical replay with prior pinned baseline
- payload generation test proving correct baseline id/checksum/version is emitted
- fallback/rollback verification where the provider has rollback support

## Rollback Rules

- Rollback is allowed only through explicit rollback activation.
- Historical objects keep their original pinned baseline reference.
- Rollback never rewrites historical payloads or receipts.
- Replay after rollback must use:
  - original pinned baseline for historical payloads
  - rollback target only for newly effective dates covered by the override

## Domain-Specific Verification

- BankID/auth:
  - start and collect flows must expose pinned `providerBaselineId`, `providerBaselineCode`, `providerBaselineVersion` and checksum
- Peppol and invoice delivery:
  - prepared delivery payload must include the pinned baseline reference
- Payment links:
  - created link must include pinned provider baseline reference
- Bank/open banking or bank file channels:
  - partner capabilities and connection metadata must expose the baseline reference
- ISO20022 and bank file families:
  - ISO20022 rails must pin a baseline distinct from Bankgiro CSV
  - statement imports must retain the pinned ISO20022 baseline used for camt imports
- SIE4 and migration file families:
  - SIE4 import/export, CSV/Excel templates and bureau packages must each resolve their own baseline family
  - source discovery must never infer a file family without an explicit pinned baseline on the prepared import artefact
- Annual reporting:
  - each export artefact must expose the baseline it was generated against
  - annual tax declaration package must retain deduplicated `providerBaselineRefs`

## Failure Handling

- If validation fails: keep the baseline in `draft` or `validated`, do not publish.
- If a provider regression is detected:
  - open incident
  - evaluate rollback override
  - capture evidence pack
  - block affected live submissions or auth flows if correctness or security is uncertain

## Post-Publish Checks

- Confirm resolution on:
  - prior date
  - boundary date
  - post-boundary date
- Confirm affected runtime objects now expose pinned baseline metadata.
- Confirm audit events were written for publication/retirement/rollback.
- Confirm no affected path still relies on hidden hardcoded provider spec selection.
