> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: DOM-014
- Title: Search Indexing and Global Search
- Status: Binding
- Owner: Search architecture
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/domain/search-indexing-and-global-search.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-ui-reset-spec.md`
- Related domains:
  - search
  - all indexed business domains
- Related code areas:
  - `packages/domain-search/*`
  - `apps/desktop-web/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/domain/saved-views-dashboards-and-personalization.md`
  - `docs/ui/DESKTOP_INFORMATION_ARCHITECTURE.md`

# Purpose

Definiera global search som read-only index och navigationslager med strikt permission trimming och reproducerbar reindex.

# Scope

Omfattar:

- indexed search documents
- query parsing
- ranking
- permission trimming
- reindex and tombstones

Omfattar inte:

- source of truth för affärsdata
- fri indexering av förbjudna eller känsliga råfält

# Roles

- end user
- company admin
- bureau user
- search operator

# Source of truth

Källdomänerna äger sakdata. Search äger endast read-optimized documents och query/resultrendering.

# Object model

## SearchDocument

Fält:

- `search_document_id`
- `object_type`
- `object_id`
- `company_id`
- `display_title`
- `status`
- `search_text`
- `filter_payload`
- `permission_scope`
- `source_version`
- `indexed_version`

## SavedSearchReference

Fält:

- `saved_search_reference_id`
- `owner_scope`
- `query_json`
- `visibility_code`
- `status`

# State machines

## SearchDocument

- `queued`
- `indexed`
- `stale`
- `tombstoned`
- `purged`

## SavedSearchReference

- `active`
- `broken`
- `archived`

# Commands

- `upsert_search_document`
- `tombstone_search_document`
- `request_reindex`
- `repair_saved_search_reference`

# Events

- `search_document_upserted`
- `search_document_tombstoned`
- `search_reindex_requested`
- `saved_search_reference_broken`

# Cross-domain dependencies

- every indexed domain publishes outbox changes
- desktop and backoffice consume search results

# Forbidden couplings

- decisions may not be made from search index alone
- UI may not infer permissions by hiding results client-side only

# Search ownership

`search` äger query semantics, ranking and trimming. It does not own any business status.

# UI ownership

Desktop-web owns global search UI. Backoffice has scoped diagnostics and support-search.

# Permissions

- results must be filtered by tenant, role and object scope
- snippets may only use permitted fields

# Failure and conflict handling

- stale index must be marked, not silently ignored
- missing document should create reindex signal
- broken saved search should be explicit, not silently degraded

# Notifications/activity/work-item interaction

- broken saved searches may notify owners
- reindex incidents may create work items for search operators

# API implications

- global query endpoint
- saved search CRUD
- reindex endpoints

# Worker/job implications where relevant

- upsert worker
- reindex worker
- tombstone cleanup

# Projection/read-model requirements

- search result cards
- result type grouping
- stale markers
- scoped diagnostics

# Test implications

- exact id ranking
- permission trimming
- reindex idempotency
- broken saved search handling

# Exit gate

- [ ] global search is read-only and permission-safe
- [ ] reindex and tombstone semantics are explicit
- [ ] desktop and backoffice can consume one stable search domain

