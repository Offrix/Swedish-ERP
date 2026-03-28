# domain-regulated-submissions

Canonical package boundary for regulated filing lifecycle.

This package owns the shared transport/runtime model for:

- `SubmissionEnvelope`
- `SubmissionAttempt`
- `SubmissionReceipt`
- `SubmissionActionQueueItem`
- `SubmissionCorrectionLink`
- `SubmissionEvidencePack`

Business domains still own payload truth. This boundary owns dispatch, receipts, replay, correction and recovery metadata.

The canonical regulated-submissions runtime now lives in this package.
`packages/domain-integrations/src/regulated-submissions.mjs` is only a compatibility shim for older imports.
