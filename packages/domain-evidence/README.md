# @swedish-erp/domain-evidence

Central evidence-bundle boundary for frozen, checksum-backed export packs across regulated submissions, annual reporting, support operations, cutover and project workspaces.

## Scope

- create central evidence bundles bound to source objects and bundle types
- append deterministic artifacts and related references before freeze
- freeze immutable bundle snapshots with checksums and integrity hashes
- archive superseded bundles when source evidence changes
- expose audit events and durability-friendly export/import state
- support compatibility adapters for older annual-reporting and submission evidence surfaces

## Guarantees

- frozen bundles are immutable and checksum-backed
- source objects can be indexed to the latest evidence bundle without mutating historical snapshots
- changed payloads create new bundle snapshots instead of rewriting prior evidence
- exported evidence can be replayed into durable state stores without losing lineage
