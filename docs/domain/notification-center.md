> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: DOM-003
- Title: Notification Center
- Status: Binding
- Owner: Product architecture and operations architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated notification-center document
- Approved by: User directive, ADR-0023 and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-ui-reset-spec.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - notifications
  - review center
  - activity
  - work items
- Related code areas:
  - `packages/domain-notifications/*`
  - `packages/domain-core/*`
  - `apps/desktop-web/*`
  - `apps/field-mobile/*`
- Related future documents:
  - `docs/ui/WORKBENCH_CATALOG.md`
  - `docs/ui/DESKTOP_INFORMATION_ARCHITECTURE.md`

# Purpose

Definiera notification center som bounded context för riktade uppmärksamhetssignaler till användare och team, skilt från activity feed, audit log och review center.

# Scope

Omfattar:

- notifieringsobjekt
- leveranskanaler
- läst/oläst/kvitterad status
- prioritet och snooze
- deep-linking till källobjekt

Omfattar inte:

- beslutsobjekt i review center
- aktivitetsflöde
- auditlogg

# Roles

- end user
- team lead
- backoffice operator
- system scheduler

# Source of truth

`notification-center` är source of truth för notifieringars status, leveransförsök och användaråtgärder. Källdomänen äger alltid själva sakobjektet som notifieringen pekar på.

# Object model

## Notification

Fält:

- `notification_id`
- `recipient_type`
- `recipient_id`
- `category_code`
- `priority_code`
- `source_domain`
- `source_object_id`
- `title`
- `body`
- `status`
- `created_at`
- `expires_at`

## NotificationDelivery

Fält:

- `notification_delivery_id`
- `notification_id`
- `channel_code`
- `attempt_no`
- `status`
- `delivered_at`
- `failure_reason_code`

## NotificationAction

Fält:

- `notification_action_id`
- `notification_id`
- `action_code`
- `acted_by`
- `acted_at`
- `result_code`

# State machines

## Notification

- `created`
- `queued`
- `delivered`
- `read`
- `acknowledged`
- `snoozed`
- `expired`
- `cancelled`

# Commands

- `create_notification`
- `deliver_notification`
- `mark_notification_read`
- `acknowledge_notification`
- `snooze_notification`
- `cancel_notification`

# Events

- `notification_created`
- `notification_delivered`
- `notification_read`
- `notification_acknowledged`
- `notification_snoozed`
- `notification_cancelled`

# Cross-domain dependencies

- review center kan trigga notifiering om ny queue ownership eller SLA-brott
- payroll, HUS, VAT och close kan trigga notifiering om blockerande driftfall
- work items kan använda notifiering för deadline eller omfördelning

# Forbidden couplings

- notifiering får inte bära den enda källan till ansvar eller beslut
- UI får inte skapa lokal notifieringsstatus utan domänkommando
- activity feed får inte återanvändas som notifieringsmodell

# Search ownership

Search får indexera notifieringar för användarens inkorg men äger inte notifieringens status.

# UI ownership

Desktop-web äger full notification center-yta. Field-mobile får bara visa begränsade, handlingsnära notifieringar.

# Permissions

- användare ser bara notifieringar som är adresserade till dem eller deras team
- backoffice får endast läsa eller återköa notifieringar enligt policy

# Failure and conflict handling

- dubbla leveranser till samma kanal ska vara idempotenta
- notifiering som pekar på borttaget objekt ska markeras `cancelled` eller `expired`, inte hänga kvar som okänd länk
- snooze får aldrig dölja blockerande regulatory incident över policygräns

# Notifications/activity/work-item interaction

- notification center signalerar att något kräver uppmärksamhet
- activity feed visar vad som har hänt
- work item visar ansvar och deadline
- review center visar blockerande beslutsfall

# API implications

- recipient inbox queries
- bulk mark-read / acknowledge
- delivery retry endpoints för backoffice

# Worker/job implications where relevant

- reminder-jobs och kanalretry körs i worker
- expirations och digest-sammanställning körs som schemalagda jobb

# Projection/read-model requirements

- unread counters per user/team
- grouped inbox by category and priority
- channel delivery history per notification

# Test implications

- permission trimming
- deduplication
- snooze rules
- retry behavior

# Exit gate

- [ ] notification center är separat från activity feed, work items och review center
- [ ] leveransstatus och läst-status ägs server-side
- [ ] desktop och mobile konsumerar samma notifieringsdomän med olika yträttigheter

