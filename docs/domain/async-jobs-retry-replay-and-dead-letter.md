> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: DOM-001
- Title: Async Jobs, Retry, Replay and Dead Letter
- Status: Binding
- Owner: Platform architecture and operations architecture
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/domain/async-jobs-retry-replay-and-dead-letter.md`
- Approved by: User directive, ADR-0015 and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-code-impact-map.md`
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-policy-matrix.md`
- Related domains:
  - worker runtime
  - jobs
  - replay
  - dead letter
  - backoffice
- Related code areas:
  - `apps/worker/*`
  - `packages/domain-core/*`
  - `apps/backoffice/*`
  - `apps/api/*`
- Related future documents:
  - `docs/runbooks/async-job-retry-replay-and-dead-letter.md`
  - `docs/runbooks/backup-restore-and-disaster-recovery.md`
  - `docs/policies/emergency-disable-policy.md`

# Purpose

Definiera den permanenta jobbdomänen för all asynkron behandling med attempts, retry, replay, dead-letter och operativt ägarskap.

# Scope

Omfattar:

- jobbobjekt
- attempt-historik
- retry policy
- dead-letter
- replay plan
- korrelationskedja
- operatörsgränser

Omfattar inte:

- submission-specifik kvittenslogik
- klientlokala UI-jobb utan server-side lifecycle

# Roles

- `job_producer`
- `worker_runtime`
- `operator`
- `security_admin`
- `domain_owner`

# Source of truth

`domain-jobs` är source of truth för:

- jobbstatus
- attempt-historik
- dead-letter-status
- replayplan

Producerande domän är source of truth för affärsintentionen bakom jobbet.

# Object model

## Job

Fält:

- `job_id`
- `job_type`
- `tenant_id`
- `source_event_id`
- `source_object_type`
- `source_object_id`
- `idempotency_key`
- `payload_hash`
- `status`
- `risk_class`
- `priority`
- `available_at`

## JobAttempt

Fält:

- `job_attempt_id`
- `job_id`
- `attempt_no`
- `worker_id`
- `started_at`
- `finished_at`
- `result_code`
- `error_class`
- `next_retry_at`

## DeadLetterEntry

Fält:

- `dead_letter_id`
- `job_id`
- `terminal_reason`
- `entered_at`
- `operator_state`
- `replay_allowed`

## ReplayPlan

Fält:

- `replay_plan_id`
- `job_id`
- `planned_by`
- `reason_code`
- `planned_payload_strategy`
- `approved_by`
- `executed_at`

# State machines

## Job

- `queued`
- `claimed`
- `running`
- `retry_scheduled`
- `succeeded`
- `dead_lettered`
- `cancelled`

## Replay

- `planned`
- `approved`
- `executed`
- `rejected`

# Commands

- `enqueue_job`
- `claim_job`
- `complete_job`
- `fail_job_attempt`
- `schedule_retry`
- `move_job_to_dead_letter`
- `plan_job_replay`
- `approve_job_replay`
- `execute_job_replay`
- `cancel_job`

# Events

- `job_enqueued`
- `job_claimed`
- `job_attempt_started`
- `job_attempt_failed`
- `job_retry_scheduled`
- `job_dead_lettered`
- `job_replay_planned`
- `job_replay_executed`
- `job_cancelled`

# Cross-domain dependencies

- documents producerar OCR- och klassningsjobb
- integrations producerar submission- och importjobb
- search producerar indexjobb
- notifications producerar deliveryjobb

# Forbidden couplings

- producerande domän får inte skriva attempt-historik direkt
- UI får inte ändra jobbstatus utan serverkommandon
- replay får inte ske genom direkt mutation av gamla attempts

# Search ownership

Jobs får indexeras för operatörssök men search äger inte job state.

# UI ownership

Backoffice och reviewnära operatörsytor får konsumera jobbdata, men jobbdomänen äger status och tillåtna transitions.

# Permissions

- enqueuing styrs av producerande domän
- retry och replay styrs av ops- och säkerhetspolicy
- massåtgärder kräver högre behörighet

# Failure and conflict handling

- dubbelclaim ska nekas eller annulleras via claim token
- downstream unknown ska dead-letteras eller manuellt triageras
- superseded jobs ska kunna cancel:as med audit

# Notifications/activity/work-item interaction

- dead-letter och stuck backlog kan skapa notifications
- activity ska visa operativ historik
- work-items kan skapas för manuell åtgärd, men blir aldrig source of truth för job state

# API implications

- jobb kräver läs- och operatörs-API
- replay-API måste bära reason code, approval metadata och correlation chain

# Worker/job implications where relevant

- worker ska claim:a via domänkommandon
- timeout, retry och dead-letter ska beslutas av policy och job type

# Projection/read-model requirements

- read model för jobbkö
- read model för dead-letter
- read model för replay history

# Test implications

- idempotens
- retry/backoff
- replay safety
- dead-letter triage
- stuck job recovery

# Exit gate

- [ ] persistent job runtime är source of truth
- [ ] replay, attempts och dead-letter är append-only
- [ ] UI använder bara serverkommandon
- [ ] operatörsvyer och runbooks är synkade mot domänmodellen

