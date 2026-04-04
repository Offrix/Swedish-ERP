# DOMAIN_19_IMPLEMENTATION_LIBRARY

## mål

Fas 19 ska bygga företagets generella leveransdomän så att bokning, dispatch, uppdrag och completion inte längre är splittrade mellan projektfragment, field-specifika objekt och externa planeringsverktyg.

## bindande tvärdomänsunderlag

- `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md` äger reservation, ownership boundary, return-to-stock-value och blocker mot negativt lager.
- `PROJEKT_WIP_INTAKTSAVRAKNING_OCH_LONSAMHET_BINDANDE_SANNING.md` äger project root, WIP, intäktsavräkning, profitability och project-level billable readiness.
- `ARBETSORDER_TID_MATERIAL_OCH_FAKTURERBARHET_BINDANDE_SANNING.md` äger work-order-level tid, material, signoff och billable evidence.

## Fas 19

### Delfas 19.1 unified delivery object-model / route truth

- bygg:
  - `DeliveryOrder`
  - `ServiceOrder`
  - `WorkOrder`
  - `DeliveryPlan`
  - `DeliveryHandoffReceipt`
- state machines:
  - `DeliveryOrder: draft -> planned -> dispatched -> in_progress -> completed | cancelled | blocked`
  - `ServiceOrder: draft -> scheduled -> active -> completed | failed | cancelled`
  - `WorkOrder: ready_for_dispatch -> dispatched -> in_progress -> completed | blocked | cancelled`
- commands:
  - `createDeliveryOrder`
  - `createServiceOrder`
  - `createWorkOrder`
  - `linkCommercialOrderToDelivery`
- invariants:
  - leveransdomänen äger sanningen för utförandet
  - project och field får vara konsumenter eller vertikala paket, inte universell root
  - canonical route family är `/v1/delivery/*`
- tester:
  - route truth suite
  - root-object lineage suite

### Delfas 19.2 resource / booking / capacity hardening

- bygg:
  - `ResourcePool`
  - `ResourceProfile`
  - `ResourceBooking`
  - `CapacityWindow`
  - `BookingConflict`
  - `RebookingReceipt`
- commands:
  - `reserveResourceBooking`
  - `rebookDelivery`
  - `resolveBookingConflict`
- invariants:
  - dubbelbokning och överbokning styrs via explicit policy
  - resurskrav, geografi och kompetens måste vara del av bokningen
- blockerande valideringar:
  - deny booking utanför capacity policy
  - deny dispatch utan bokad resurs där policy kräver det
- tester:
  - booking conflict tests
  - rebooking receipt tests

### Delfas 19.3 delivery-order / service-order / work-order hardening

- bygg:
  - `ServicePlan`
  - `VisitWindow`
  - `InstructionSet`
  - `DeliveryDependency`
  - `ServiceEntitlementRef`
- commands:
  - `createServicePlan`
  - `scheduleVisitWindow`
  - `attachInstructionSet`
- invariants:
  - recurring service och ad hoc work orders får inte blandas utan egen typ
  - commercial SLA och servicevillkor måste vara spårbara på leveransobjektet
- tester:
  - service plan lifecycle
  - commercial handoff linkage tests

### Delfas 19.4 dispatch / execution / checklist / evidence hardening

- bygg:
  - `DispatchBoard`
  - `DispatchAssignment`
  - `ExecutionChecklist`
  - `ExecutionEvidence`
  - `DispatchException`
- commands:
  - `createDispatchAssignment`
  - `startExecution`
  - `recordExecutionChecklistStep`
  - `recordExecutionEvidence`
  - `raiseDispatchException`
- invariants:
  - dispatch, execution och evidence är separata men länkade objekt
  - checklist completion och required evidence kan blockera close
- tester:
  - dispatch lifecycle tests
  - checklist completeness tests
  - exception flow tests

### Delfas 19.5 recurring service / SLA / revisit hardening

- bygg:
  - `RecurringServicePlan`
  - `SlaProfile`
  - `SlaClock`
  - `SlaBreachSignal`
  - `RevisitDecision`
- commands:
  - `startRecurringServicePlan`
  - `recordSlaClock`
  - `raiseSlaBreachSignal`
  - `scheduleRevisit`
- invariants:
  - SLA-brott och revisit är first-class och får inte lösas genom fria kommentarer
  - recurrence måste bära start, cadence, stop rule och entitlement source
- tester:
  - recurrence generation tests
  - SLA breach tests
  - revisit gating tests

### Delfas 19.6 completion / signoff / finance handoff hardening

- bygg:
  - `CustomerSignoff`
  - `CompletionReceipt`
  - `FinanceHandoffReceipt`
  - `BillableReadinessDecision`
- commands:
  - `captureCustomerSignoff`
  - `completeDeliveryOrder`
  - `createDeliveryFinanceHandoff`
- invariants:
  - completion kräver rätt signoff, material och tidsdata där policy kräver det
  - finance handoff måste vara replaybar och immutable
  - tid, material, signoff, billable evidence och work-order invoice handoff styrs av `ARBETSORDER_TID_MATERIAL_OCH_FAKTURERBARHET_BINDANDE_SANNING.md`
  - project-level WIP, profitability och billable readiness styrs av `PROJEKT_WIP_INTAKTSAVRAKNING_OCH_LONSAMHET_BINDANDE_SANNING.md`
- routes:
  - `/v1/delivery/completions`
  - `/v1/delivery/signoffs`
  - `/v1/delivery/finance-handoffs`
- tester:
  - signoff blocker tests
  - finance handoff immutability tests

### Delfas 19.7 mobile / offline / conflict / exception hardening

- bygg:
  - `MobileExecutionSession`
  - `OfflineOperation`
  - `SyncConflictCase`
  - `DispatchExceptionReceipt`
- commands:
  - `startMobileExecutionSession`
  - `recordOfflineOperation`
  - `replayOfflineOperations`
  - `resolveSyncConflict`
- invariants:
  - offline change sets måste vara replaybara
  - tyst overwrite av dispatch- eller completiondata är förbjuden
- tester:
  - offline replay tests
  - sync conflict tests

### Delfas 19.8 doc / runbook / legacy purge

- bygg:
  - `DeliveryDocTruthDecision`
  - `DeliveryLegacyArchiveReceipt`
  - `DeliveryRunbookExecution`
- dokumentbeslut:
  - rewrite: `docs/domain/field-work-order-service-order-and-material-flow.md`
  - harden: `docs/domain/projects-budget-wip-and-profitability.md`
  - harden: `docs/domain/projects-workspace.md`
  - rewrite: `docs/runbooks/fas-10-field-verification.md`
  - rewrite: `docs/runbooks/fas-14-5-field-operational-pack-verification.md`
  - create: `docs/runbooks/delivery-dispatch-operations.md`
  - create: `docs/runbooks/recurring-service-operations.md`
  - create: `docs/runbooks/delivery-completion-and-signoff.md`
- invariants:
  - field docs får inte fortsätta låtsas vara hela leveransdomänen
- tester:
  - docs truth lint
  - runbook existence lint
