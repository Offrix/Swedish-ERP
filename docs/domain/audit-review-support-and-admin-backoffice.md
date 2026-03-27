> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: DOM-004
- Title: Audit, Review, Support and Admin Backoffice
- Status: Binding
- Owner: Operations architecture and security architecture
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/domain/audit-review-support-and-admin-backoffice.md`
- Approved by: User directive, ADR-0023 and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-ui-reset-spec.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - backoffice
  - audit
  - support
  - impersonation
  - review escalation
- Related code areas:
  - `apps/backoffice/*`
  - `packages/domain-org-auth/*`
  - `packages/domain-core/*`
  - `packages/domain-review-center/*`
- Related future documents:
  - `docs/policies/support-access-and-impersonation-policy.md`
  - `docs/policies/security-admin-and-incident-policy.md`

# Purpose

Definiera backoffice som separat bounded context och yta för support, audit, replay, diagnostics, access review och incidentnära administration.

# Scope

Omfattar:

- support cases
- impersonation sessions
- audit explorer
- diagnostics
- access reviews
- replay access

Omfattar inte:

- ordinarie desktop-workbenches
- vanlig slutanvändaradministration

# Roles

- support admin
- support lead
- security admin
- compliance reviewer
- incident commander

# Source of truth

Backoffice-domänen är source of truth för supportärenden, admin diagnostics, impersonation sessions och access review batches. Audit explorer konsumerar audithändelser men äger inte källdomänernas affärsdata.

# Object model

## SupportCase

Fält:

- `support_case_id`
- `company_id`
- `category`
- `severity`
- `status`
- `owner_user_id`

## ImpersonationSession

Fält:

- `impersonation_session_id`
- `target_user_id`
- `requested_by`
- `approved_by`
- `mode`
- `started_at`
- `expires_at`

## AccessReviewBatch

Fält:

- `access_review_batch_id`
- `scope_type`
- `scope_ref`
- `generated_at`
- `status`

# State machines

## SupportCase

- `open`
- `triaged`
- `in_progress`
- `waiting_customer`
- `resolved`
- `closed`

## ImpersonationSession

- `requested`
- `approved`
- `active`
- `ended`
- `terminated`

# Commands

- `create_support_case`
- `assign_support_case`
- `request_impersonation`
- `approve_impersonation`
- `terminate_impersonation`
- `run_admin_diagnostic`
- `generate_access_review`

# Events

- `support_case_opened`
- `impersonation_started`
- `impersonation_ended`
- `access_review_generated`
- `diagnostic_executed`

# Cross-domain dependencies

- auth/org for permissions
- jobs for replay
- review center for escalations
- feature flags for emergency operations

# Forbidden couplings

- backoffice får inte skriva direkt i affärsdata
- support får inte använda fria SQL-kommandon via domänmodellen

# Search ownership

Backoffice-sök får indexera support- och auditobjekt men äger inte auditkällorna.

# UI ownership

Backoffice-appen äger sin egen yta och får inte döljas som en vanlig desktopsektion.

# Permissions

- stark roll- och scopekontroll
- session-bound och time-bound högre åtkomst

# Failure and conflict handling

- otillåtet diagnostics-scope blockeras
- impersonation utan approval nekas
- support case utanför scope eskaleras

# Notifications/activity/work-item interaction

- support backlog kan ge notifications
- activity loggar admin actions
- work-items kan bära uppföljning men äger inte supportstatus

# API implications

- egna backoffice-APIer för support, access review och diagnostics

# Worker/job implications where relevant

- access review snapshots
- impersonation timeout enforcement
- support SLA monitoring

# Projection/read-model requirements

- support queue
- audit explorer search index
- impersonation register

# Test implications

- scope enforcement
- impersonation approvals
- diagnostics allowlist
- audit traceability

# Exit gate

- [ ] backoffice är separat bounded context och separat yta
- [ ] support och audit sker via officiella kommandon
- [ ] impersonation och diagnostics är strikt kontrollerade

