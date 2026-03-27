> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# OPERATIONS_REVIEW_NOTIFICATIONS_ACTIVITY_WORK_ITEMS

Status: Bindande operations- och operatörsspecifikation.

Detta dokument definierar review center, notifications, activity, work items, support operations, audit explorer, replay operations, incident handling, recovery operations, dead-letter operations och submission monitoring.

## 1. Kärnprinciper

1. Review items, work items, notifications, activity och audit är fem separata objektfamiljer.
2. Review item = blockerande mänskligt beslut.
3. Work item = ansvarsbärande uppgift eller förpliktelse.
4. Notification = uppmärksamhetssignal.
5. Activity = historik/timeline.
6. Audit = juridiskt/tekniskt spår.
7. Ingen av dessa objektfamiljer får återanvända de andras status som primär sanning.
8. Support/backoffice får aldrig bli genväg runt ordinarie domänkommandon.
9. Replay och dead-letter är operativa verktyg, inte affärsbeslut.

## 2. Review center

### 2.1 Objektmodell
- `ReviewQueue`
- `ReviewItem`
- `ReviewDecision`
- `ReviewAssignment`
- `ReviewEscalation`
- `ReviewEvidenceBundle`

### 2.2 State machine
`open -> claimed -> in_review -> waiting_input -> approved | rejected | escalated -> closed`

### 2.3 Commands
- `create_review_item`
- `claim_review_item`
- `request_additional_input`
- `approve_review_item`
- `reject_review_item`
- `escalate_review_item`
- `close_review_item`

### 2.4 Events
- `review_item.created`
- `review_item.claimed`
- `review_item.waiting_input`
- `review_item.approved`
- `review_item.rejected`
- `review_item.escalated`
- `review_item.closed`

### 2.5 Reviewgränser
Review item måste skapas när:
- rulepack kräver review
- economic risk är hög
- personpåverkan finns
- tax/VAT/HUS ambiguity finns
- correction påverkar låst eller inlämnad period
- credentials, identity eller ID06-bevis saknas i kontrollerat flöde

## 3. Work items

### 3.1 Objektmodell
- `WorkItem`
- `WorkItemAssignment`
- `WorkItemDeadline`
- `WorkItemDependency`
- `WorkItemCompletionRecord`

### 3.2 State machine
`open -> claimed -> waiting_dependency -> in_progress -> resolved -> closed`

### 3.3 Regler
- work item skapas när någon måste göra något, oavsett om review krävs
- work item kan länkas till review item men är inte samma objekt
- SLA och deadline tillhör work item, inte notification

## 4. Notification center

### 4.1 Objektmodell
- `Notification`
- `NotificationDelivery`
- `NotificationAction`
- `NotificationPreference`
- `NotificationDigestWindow`

### 4.2 State machine
`created -> queued -> delivered -> read -> acknowledged | snoozed | expired | cancelled`

### 4.3 Regler
- notification är recipient-specifik
- notification kan peka på object profile, review item eller work item
- notification får dedupas, work item får inte försvinna vid dedupe

## 5. Activity feed

### 5.1 Objektmodell
- `ActivityEntry`
- `ActivityRelation`
- `ActivityActorRef`
- `ActivityObjectRef`

### 5.2 Regler
- activity är historik och timeline
- activity kan materialiseras från affärsevents och review decisions
- activity har ingen ack-status
- activity har ingen assignment

## 6. Audit explorer

### 6.1 Objektmodell
- `AuditSearchQuery`
- `AuditEventProjection`
- `AuditEvidenceLink`
- `AuditCorrelationChain`

### 6.2 Funktion
- söka på correlation id, object id, actor, period, queue, provider, submission
- visa full chain från command -> events -> jobs -> attempts -> receipts -> decisions

### 6.3 Begränsningar
- audit explorer är read-only
- support kan se endast scope-bundna events
- security admin kan se globalt men inte mutera affärsobjekt

## 7. Replay operations

### 7.1 Objektmodell
- `ReplayPlan`
- `ReplayTarget`
- `ReplayApproval`
- `ReplayExecution`
- `ReplayOutcome`

### 7.2 State machine
`draft -> pending_approval -> approved -> scheduled -> running -> completed | failed | cancelled`

### 7.3 Regler
- replay av reglerad submission kräver domain approval
- replay av samma payloadversion måste vara idempotent
- replay får inte användas för att maskera fel source data
- nytt affärsobjekt kräver correction/new version, inte replay

## 8. Dead-letter operations

### 8.1 Objektmodell
- `DeadLetterCase`
- `DeadLetterReason`
- `DeadLetterTriage`
- `DeadLetterResolution`

### 8.2 State machine
`open -> triaged -> replay_ready | manual_fix_required | waived -> resolved -> closed`

### 8.3 Regler
- dead-letter används för tekniskt stoppade jobb
- dead-letter case ska länka till source operation, source object, retry history och provider health
- manual fix får endast vara av typen “rätta metadata, skapa ny operation, replay”; aldrig direkt databaspatch

## 9. Submission monitoring

### 9.1 Objektmodell
- `SubmissionMonitorCase`
- `SubmissionLagAlert`
- `SubmissionReceiptProjection`
- `SubmissionFailureWindow`

### 9.2 Funktion
- visa status för AGI, VAT, HUS och annual filings
- skilja technical receipt, business decision och final outcome
- eskalera saknad receipt, domänavslag, långa lags och correction required

## 10. Recovery operations

### 10.1 Objektmodell
- `RecoveryCase`
- `RecoveryDecision`
- `RecoveryExecution`
- `RecoveryEvidencePack`

### 10.2 Gäller för
- HUS återkrav
- bank returer
- annual filing correction
- AGI correction
- VAT resubmission
- felaktig replay

### 10.3 Regler
- recovery ska alltid peka på originalbeslut
- recovery får inte radera historiken
- ekonomisk effekt ska kunna följas till ledger

## 11. Incident handling

### 11.1 Objektmodell
- `IncidentCase`
- `IncidentImpactScope`
- `MitigationAction`
- `IncidentTimelineEntry`
- `PostIncidentReview`

### 11.2 State machine
`open -> triaged -> mitigating -> stabilized -> resolved -> post_review -> closed`

### 11.3 Regler
- incident måste kunna kopplas till emergency disable, break-glass och replay decisions
- post-review krävs för varje break-glass

## 12. Queue ownership och SLA

### 12.1 Queuetyper
- finance review
- payroll review
- HUS review
- tax account discrepancies
- submission monitoring
- integration dead-letter
- support cases
- access reviews
- field sync conflicts
- personalliggare compliance

### 12.2 Obligatoriska queuefält
- `queue_code`
- `owner_team_id`
- `priority`
- `sla_due_at`
- `oldest_open_age`
- `open_count`
- `blocked_count`
- `escalation_policy_code`

### 12.3 Escalation
- överskriden SLA skapar work item + notification + activity
- återkommande breach skapar incident signal

## 13. Operatorroller

- queue operator
- queue owner
- compliance reviewer
- finance approver
- payroll manager
- HUS operator
- integration operator
- support admin
- security admin
- incident commander

Varje roll ska ha:
- explicit queue grants
- action allowlist
- review approval scope
- backoffice visibility scope

## 14. Support/backoffice-gränser

- vanliga användare ser inte backoffice-objekt
- backoffice-operatör får se operativa projections men inte kringgå affärsdomäner
- support kan skapa replayplan men inte köra reglerad replay utan domain approval
- support kan läsa audit men inte skapa reviewbeslut i kundens namn
- break-glass och impersonation har egna queues och SLA

## 15. API-rutter

### Review center
- `GET /v1/review-center/queues`
- `GET /v1/review-center/items`
- `POST /v1/review-center/items/:id/claim`
- `POST /v1/review-center/items/:id/approve`
- `POST /v1/review-center/items/:id/reject`
- `POST /v1/review-center/items/:id/escalate`

### Work items
- `GET /v1/work-items`
- `POST /v1/work-items/:id/claim`
- `POST /v1/work-items/:id/resolve`

### Notifications
- `GET /v1/notifications`
- `POST /v1/notifications/:id/read`
- `POST /v1/notifications/:id/acknowledge`
- `POST /v1/notifications/:id/snooze`

### Activity
- `GET /v1/activity`
- `GET /v1/activity/object/:type/:id`

### Backoffice
- `GET /v1/backoffice/support-cases`
- `POST /v1/backoffice/support-cases`
- `GET /v1/backoffice/audit-events`
- `GET /v1/backoffice/jobs`
- `POST /v1/backoffice/jobs/:id/replay`
- `GET /v1/backoffice/dead-letters`
- `POST /v1/backoffice/dead-letters/:id/triage`
- `GET /v1/backoffice/submissions/monitor`
- `POST /v1/backoffice/incidents`

## 16. Read models som måste finnas före UI

- review queue list
- review item object profile
- work item list with SLA
- notifications list and per-recipient counters
- activity timeline per object
- submission monitor board
- dead-letter board
- replay plan board
- incident board
- support case object profile
- audit explorer search results

## 17. Testkrav

- queue visibility trimming
- claim/approve segregation
- notification dedupe without work-item loss
- activity immutability
- replay approval enforcement
- dead-letter triage workflow
- submission monitor lag detection
- incident -> break-glass -> post-review chain
- SLA breach escalation
- audit explorer correlation chain

## 18. Exit gate

Dokumentet är uppfyllt först när:
- alla fem objektfamiljer är separata i data, API och read models
- review, work, notification, activity och audit inte delar status
- replay, dead-letter och submission monitoring kan användas utan DB-ingrepp
- support/backoffice-boundaries verkställs tekniskt
- queue ownership och SLA är mätbara i backend

