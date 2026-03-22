# @swedish-erp/domain-annual-reporting

Annual reporting boundary for K2/K3 package generation, version locking, signatory tracking and annual-package diffs.

## Scope

- build annual report packages from hard-closed accounting periods
- bind each package version to balance-sheet and income-statement report snapshots
- version text sections, note sections and derived tax-package outputs
- invite and track signatories per package version
- create superseding versions when accounting evidence changes after reopen
- derive INK/NE/SRU underlag plus VAT, AGI, HUS and SLP audit overviews from the locked annual-report version
- expose deterministic authority-overview fingerprints and reusable tax-declaration packages for later submission flows

## Guarantees

- no annual package can be created from a non-`hard_closed` period
- unchanged source fingerprints reuse the current package version instead of mutating history
- changed bookkeeping creates a new superseding version with preserved diff
- signatory status is tracked per version and package status moves through draft, ready-for-signature and signed
- tax-package exports carry internal checks bound to report snapshot hashes and underlag totals
