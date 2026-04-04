# DOMAIN_21_IMPLEMENTATION_LIBRARY

## mål

Fas 21 ska bygga företagets gemensamma arbetsyta så att operativa uppgifter, approvals, begäranden, deadlines och workbench-köer kan ägas av plattformen i stället för av lösa dokument eller externa sidospår.

## Fas 21

### Delfas 21.1 unified workspace object-model / route truth

- bygg:
  - `WorkspaceItem`
  - `OperationalRequest`
  - `Task`
  - `ApprovalRequest`
  - `DecisionLogEntry`
  - `WorkbenchProfile`
- state machines:
  - `OperationalRequest: open -> in_review -> approved | rejected | cancelled | completed`
  - `Task: open -> accepted -> in_progress -> blocked | completed | cancelled`
  - `ApprovalRequest: pending -> approved | rejected | expired | escalated`
- commands:
  - `createWorkspaceItem`
  - `createOperationalRequest`
  - `createTask`
  - `createApprovalRequest`
- invariants:
  - workspace core äger tasks, requests och approvals tvärs över domänerna
  - inbox, notifications och activity är presentations- eller receiptlager ovanpå workspace truth
  - canonical route family är `/v1/workspace/*`
- tester:
  - workspace root lifecycle
  - route truth suite

### Delfas 21.2 inbox / request / task hardening

- bygg:
  - `InboxMaterialization`
  - `TaskGroup`
  - `RequestComment`
  - `TaskAssignmentReceipt`
- commands:
  - `assignTask`
  - `acceptTask`
  - `snoozeWorkspaceItem`
  - `reopenWorkspaceItem`
- invariants:
  - email ingress eller domänhändelse får aldrig vara den enda sanningen för ett task/request-objekt
  - reopen måste vara explicit och auditbar
- tester:
  - request/task lifecycle tests
  - dedupe/reopen tests

### Delfas 21.3 approval / delegation / decision hardening

- bygg:
  - `ApprovalStep`
  - `DelegationGrant`
  - `DecisionReceipt`
  - `ApprovalEscalation`
- commands:
  - `delegateApprovalAuthority`
  - `approveWorkspaceRequest`
  - `rejectWorkspaceRequest`
  - `escalateApprovalRequest`
- invariants:
  - approvals måste kunna bära ordered steps, delegation och escalation
  - separation of duties måste vara first-class
  - domäner får länka in approvals men inte uppfinna egna osynliga approval-spår
- officiella källor:
  - [Microsoft Approvals](https://support.microsoft.com/en-us/office/what-is-approvals-a9a01c95-e0bf-4d20-9ada-f7be3fc283d3)
  - [Microsoft Create an approval](https://support.microsoft.com/en-us/office/create-an-approval-6548a338-f837-4e3c-ad02-8214fc165c84)
- tester:
  - delegation and escalation tests
  - separation-of-duties tests

### Delfas 21.4 ownership / deadline / reminder hardening

- bygg:
  - `OwnershipAssignment`
  - `DeadlineProfile`
  - `ReminderSchedule`
  - `OverdueSignal`
- commands:
  - `assignWorkspaceOwner`
  - `setWorkspaceDeadline`
  - `scheduleWorkspaceReminder`
  - `raiseOverdueSignal`
- invariants:
  - kritiska workspace items får inte vara ownerless om policy förbjuder det
  - due date och overdue måste vara first-class, inte bara beräknad UI-status
- tester:
  - ownership enforcement tests
  - deadline/reminder tests

### Delfas 21.5 exception-center / workbench hardening

- bygg:
  - `ExceptionCase`
  - `WorkbenchQueue`
  - `WorkbenchFilterProfile`
  - `ActionShortcut`
- commands:
  - `materializeWorkbenchQueue`
  - `openExceptionCase`
  - `recordActionShortcut`
- invariants:
  - workbench måste materialiseras från workspace truth och domänreceipts
  - exception center får inte bara vara lista utan måste bära severity, owner och next action
- tester:
  - queue materialization tests
  - exception lifecycle tests

### Delfas 21.6 calendar / mail integration boundary hardening

- bygg:
  - `CalendarLink`
  - `MailThreadRef`
  - `OutboundReminderReceipt`
  - `ScheduleSyncReceipt`
- commands:
  - `linkWorkspaceItemToCalendar`
  - `linkWorkspaceItemToMailThread`
  - `emitOutboundReminder`
- invariants:
  - plattformen ska koppla mot extern kalender/mail, inte låtsas vara full ersättare
  - calendar/mail refs får inte bli canonical task truth
- officiella källor:
  - [Microsoft Tasks in Teams](https://support.microsoft.com/en-us/office/use-the-tasks-app-in-teams-e32639f3-2e07-4b62-9a8c-fd706c12c070)
- tester:
  - sync boundary tests
  - duplicate reminder suppression tests

### Delfas 21.7 cross-domain activity / search / action hardening

- bygg:
  - `WorkspaceActivityRef`
  - `WorkspaceSearchResult`
  - `CrossDomainActionReceipt`
- commands:
  - `linkWorkspaceItemToDomainObject`
  - `recordCrossDomainActionReceipt`
  - `materializeWorkspaceSearchResult`
- invariants:
  - workspace får navigera och agera på ändra domäner men inte skriva deras sanning direkt
  - every shortcut action must end in source-domain command receipt
- tester:
  - search lineage tests
  - cross-domain action routing tests

### Delfas 21.8 doc / runbook / legacy purge

- bygg:
  - `WorkspaceDocTruthDecision`
  - `WorkspaceLegacyArchiveReceipt`
  - `WorkspaceRunbookExecution`
- dokumentbeslut:
  - rewrite: `docs/domain/activity-feed.md`
  - rewrite: `docs/domain/notification-center.md`
  - rewrite: `docs/domain/work-items-deadlines-notifications.md`
  - rewrite: `docs/domain/bureau-portfolio-client-requests-and-approvals.md`
  - rewrite: `docs/runbooks/fas-2-company-inbox-verification.md`
  - rewrite: `docs/runbooks/notifications-activity-operations.md`
  - rewrite: `docs/runbooks/work-item-queue-operations.md`
  - create: `docs/runbooks/workspace-approvals.md`
  - create: `docs/runbooks/workspace-request-operations.md`
  - create: `docs/runbooks/workspace-exception-center.md`
- invariants:
  - workbench- och notification-docs får inte fortsätta vara falsk ersättning för saknad runtime
- tester:
  - docs truth lint
  - runbook existence lint
