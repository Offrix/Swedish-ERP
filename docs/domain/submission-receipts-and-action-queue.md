> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: DOM-003
- Title: Submission Receipts and Action Queue
- Status: Binding
- Owner: Integration architecture and operations architecture
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/domain/submission-receipts-and-action-queue.md`
- Approved by: User directive, ADR-0017 and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - submissions
  - receipts
  - action queue
  - integrations
- Related code areas:
  - `packages/domain-integrations/*`
  - `apps/api/*`
  - `apps/worker/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/runbooks/hus-submission-replay-and-recovery.md`
  - `docs/runbooks/review-center-operations.md`

# Purpose

Definiera den generiska domänmodellen för externa submissions, receiptkedjor och operativ action queue.

# Scope

Omfattar:

- submission envelopes
- receipt chain
- provider-normalisering
- action queue
- retry/replay handoff

Omfattar inte:

- payloadinnehåll per enskild myndighet eller partner

# Roles

- submission operator
- domain operator
- signatory
- backoffice escalator

# Source of truth

Submissionsdomänen är source of truth för attempts, receipts, normalized status och action queue för externa leveranser.

# Object model

## SubmissionEnvelope

Fält:

- `submission_id`
- `submission_type`
- `company_id`
- `source_object_type`
- `source_object_id`
- `payload_version`
- `idempotency_key`
- `status`
- `provider_key`

## SubmissionReceipt

Fält:

- `submission_receipt_id`
- `submission_id`
- `sequence_no`
- `provider_status`
- `normalized_status`
- `received_at`
- `is_final`

## SubmissionActionQueueItem

Fält:

- `submission_action_queue_item_id`
- `submission_id`
- `action_type`
- `priority`
- `status`
- `owner_queue`

# State machines

## SubmissionEnvelope

- `draft`
- `ready`
- `signed`
- `submitted`
- `received`
- `accepted`
- `finalized`
- `transport_failed`
- `domain_rejected`
- `action_required`
- `superseded`

## SubmissionActionQueueItem

- `open`
- `claimed`
- `waiting_input`
- `resolved`
- `closed`

# Commands

- `prepare_submission`
- `sign_submission`
- `submit_payload`
- `register_receipt`
- `create_submission_action_item`
- `resolve_submission_action_item`
- `supersede_submission`

# Events

- `submission_ready`
- `submission_submitted`
- `submission_receipt_recorded`
- `submission_transport_failed`
- `submission_domain_rejected`
- `submission_finalized`

# Cross-domain dependencies

- VAT
- payroll/AGI
- HUS
- annual reporting
- Peppol

# Forbidden couplings

- provideradapter får inte definiera intern slutstatus utan normalisering
- backoffice får inte ändra receipt history direkt

# Search ownership

Search får indexera submission state men äger inte receiptkedjan.

# UI ownership

Desktop och backoffice får konsumera status- och actionqueueprojektioner, men submissionsdomänen äger transitionreglerna.

# Permissions

- submit kräver rätt signoff där policy kräver det
- retry och supersede styrs av domain policy och riskklass

# Failure and conflict handling

- duplicate receipt hanteras idempotent
- orphan receipt går till review
- motstridig final receipt skapar incident

# Notifications/activity/work-item interaction

- notifications signalerar blockerande submissionavvikelse
- activity visar receiptkedja
- work-items kan bära operativt ansvar för action queue items

# API implications

- generiska endpoints för envelopes, receipts och action queue
- provider-specific adapters normaliserar innan write

# Worker/job implications where relevant

- dispatch worker
- receipt ingest worker
- retry scheduler
- SLA monitor

# Projection/read-model requirements

- queue projections
- per-submission timeline
- per-provider backlog

# Test implications

- transport vs domain error
- duplicate receipt
- supersede chain
- idempotent retry

# Exit gate

- [ ] generic submission/receipt/action queue model används tvärgående
- [ ] receipts är append-only
- [ ] provider logic är normaliserad före intern status

