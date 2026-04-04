# DOMAIN_21_ROADMAP

## mål

Göra Domän 21 till företagets gemensamma operativa arbetsyta så att tasks, approvals, requests, inbox, beslut och uppföljning sker i samma plattform i stället för att spridas över sidoverktyg.

## varför domänen behövs

Utan denna domän blir systemet fortfarande något man bokför, rapporterar och administrerar i, men inte något man faktiskt driver företaget i varje dag.

## faser

- Fas 21.1 unified workspace object-model / route truth
- Fas 21.2 inbox / request / task hardening
- Fas 21.3 approval / delegation / decision hardening
- Fas 21.4 ownership / deadline / reminder hardening
- Fas 21.5 exception-center / workbench hardening
- Fas 21.6 calendar / mail integration boundary hardening
- Fas 21.7 cross-domain activity / search / action hardening
- Fas 21.8 doc / runbook / legacy purge

## dependencies

- Domän 2 för auth, step-up och sessiontrust.
- Domän 13 för reporting/search/notifiering.
- Domän 16 för support/ops approvals och exportgränser.
- Domän 18–20 för att bära riktiga commercial-, delivery- och supply-work items.

## vad som får köras parallellt

- 21.2 och 21.3 kan köras parallellt när workspace root är låst.
- 21.4 och 21.5 kan köras parallellt när tasks och approvals finns.
- 21.6 kan byggas parallellt efter att ownership- och decision-objekten är definierade.

## vad som inte får köras parallellt

- 21.2 får inte markeras klar före 21.1.
- 21.3 får inte markeras klar före 21.1.
- 21.5 får inte markeras klar före 21.2, 21.3 och 21.4.
- 21.7 får inte markeras klar före 21.5.

## exit gates

- workspace core är canonical truth för tasks, requests, approvals och ownership
- workbench och exception center är riktig runtime, inte bara docs eller UI-koncept
- kalender/mail är tydlig integrationsgräns och inte odefinierad sidologik
- cross-domain action-länkar går via canonical objects och receipts

## test gates

- request/task lifecycle tests
- approval/delegation/escalation tests
- ownership/deadline/reminder tests
- exception-center tests
- calendar/mail sync boundary tests

## delfaser

### Delfas 21.1 unified workspace object-model / route truth
- [ ] bygg `WorkspaceItem`, `OperationalRequest`, `Task`, `ApprovalRequest`, `DecisionLogEntry`, `WorkbenchProfile`
- [ ] skapa canonical route family `/v1/workspace/*`
- [ ] flytta primärsanning ur split mellan inbox, notification och domänspecifika request-spår
- [ ] verifiera route truth lint och repository truth

### Delfas 21.2 inbox / request / task hardening
- [ ] bygg first-class requests, tasks, task groups och inbox-materialisering
- [ ] gör create, assign, accept, snooze, complete och reopen first-class
- [ ] bind inbox till workspace items i stället för fristående mail-ingest-spår
- [ ] verifiera lifecycle, dedupe och reopen

### Delfas 21.3 approval / delegation / decision hardening
- [ ] bygg `ApprovalStep`, `DelegationGrant`, `DecisionReceipt`, `ApprovalEscalation`
- [ ] gör approvals cross-domain och receipt-drivna
- [ ] stöd delegation, fallback och escalation policy
- [ ] verifiera step order, separation of duties och escalation

### Delfas 21.4 ownership / deadline / reminder hardening
- [ ] bygg `OwnershipAssignment`, `DeadlineProfile`, `ReminderSchedule`, `OverdueSignal`
- [ ] gör owner, due date och overdue status first-class
- [ ] blockera oägda kritiska work items där policy kräver det
- [ ] verifiera ownership enforcement och reminder flow

### Delfas 21.5 exception-center / workbench hardening
- [ ] bygg `ExceptionCase`, `WorkbenchQueue`, `WorkbenchFilterProfile`, `ActionShortcut`
- [ ] gör exception center och workbench till riktig runtime
- [ ] bind exception cases till source objects, severity och required next action
- [ ] verifiera queue truth, filter profiles och action shortcuts

### Delfas 21.6 calendar / mail integration boundary hardening
- [ ] bygg `CalendarLink`, `MailThreadRef`, `OutboundReminderReceipt`, `ScheduleSyncReceipt`
- [ ] lås tydlig integrationsgräns mot Microsoft 365/Google i stället för att bygga egen mailklient
- [ ] stöd möteskoppling, kalenderblocker och reminder-export
- [ ] verifiera sync boundary och ownership-safe calendar linkage

### Delfas 21.7 cross-domain activity / search / action hardening
- [ ] bygg `WorkspaceActivityRef`, `WorkspaceSearchResult`, `CrossDomainActionReceipt`
- [ ] gör cross-domain navigation, action och historik first-class
- [ ] blockera att search och workbench hittar på egen object truth
- [ ] verifiera search/action lineage

### Delfas 21.8 doc / runbook / legacy purge
- [ ] skriv explicit keep/rewrite/archive/remove-beslut för inbox-, notification- och workbench-docs
- [ ] skapa canonical runbooks för workspace approvals, request operations och exception handling
- [ ] flytta gamla docs från målbild till consumer/reference där de inte längre är sanningen
- [ ] verifiera docs truth lint och legacy archive receipts
