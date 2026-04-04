# DOMAIN_19_ROADMAP

## mål

Göra Domän 19 till företagets generella leveransmotor så att uppdrag, arbetsorder, bokning, dispatch, utförande och kundsignoff kan drivas i samma system utan extern planeringsprodukt.

## varför domänen behövs

Utan denna domän måste service-, konsult-, byrå-, installations-, field- och uppdragsbolag fortfarande leva i externa planerings- och dispatchverktyg för att:
- boka resurser
- skicka ut personal
- följa SLA
- signera utfört arbete
- samla materialåtgång och fakturerbar leverans

## faser

- Fas 19.1 unified delivery object-model / route truth
- Fas 19.2 resource / booking / capacity hardening
- Fas 19.3 delivery-order / service-order / work-order hardening
- Fas 19.4 dispatch / execution / checklist / evidence hardening
- Fas 19.5 recurring service / SLA / revisit hardening
- Fas 19.6 completion / signoff / finance handoff hardening
- Fas 19.7 mobile / offline / conflict / exception hardening
- Fas 19.8 doc / runbook / legacy purge

## dependencies

- `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md` äger materialreservation, stock ownership och return-to-stock-value där delivery domänen paverkar lager.
- `PROJEKT_WIP_INTAKTSAVRAKNING_OCH_LONSAMHET_BINDANDE_SANNING.md` äger project root, WIP, intäktsavräkning, profitability och project-level billable readiness.
- `ARBETSORDER_TID_MATERIAL_OCH_FAKTURERBARHET_BINDANDE_SANNING.md` äger work-order-level tid, material, signoff och billable evidence.

- Domän 10 för projekt och profitability-koppling.
- Domän 18 för kommersiell handoff, SLA-profiler och leveransvillkor.
- Domän 20 för artiklar, lager, reservationer och fulfillment.
- Domän 21 för workbench, tasks, approvals och exceptions.
- Domän 22 för kundbokning och extern signoff/self-service.

## vad som får köras parallellt

- 19.2 och 19.3 kan köras parallellt när unified delivery root är låst.
- 19.4 och 19.5 kan köras parallellt när booking och delivery-order finns.
- 19.7 kan påbörjas när execution-objekt och evidenceformat är låsta.

## vad som inte får köras parallellt

- 19.3 får inte markeras klar före 19.1.
- 19.4 får inte markeras klar före 19.2 och 19.3.
- 19.5 får inte markeras klar före 19.3.
- 19.6 får inte markeras klar före 19.4 och 19.5.
- 19.7 får inte markeras klar före 19.4.

## exit gates

- delivery root bär all leveranssanning
- resource booking och dispatch är first-class
- completion kräver rätt signoff, evidence och finance handoff där policy kräver det
- recurring service, SLA och revisit flows är first-class
- commercial core och inventory kopplas via receipts, inte fria metadatafält

## test gates

- booking, rebokning och kapacitetskonflikt-tester
- dispatch- och execution-tester
- signoff- och completion-blocker-tester
- recurring service- och SLA-breach-tester
- offline- och conflict-replay-tester

## delfaser

### Delfas 19.1 unified delivery object-model / route truth
- [ ] bygg `DeliveryOrder`, `ServiceOrder`, `WorkOrder`, `DeliveryPlan`, `DeliveryHandoffReceipt`
- [ ] skapa canonical route family `/v1/delivery/*`
- [ ] flytta primär leveranssanning ur split mellan project och field
- [ ] verifiera route truth lint och repository truth

### Delfas 19.2 resource / booking / capacity hardening
- [ ] bygg `ResourcePool`, `ResourceBooking`, `CapacityWindow`, `BookingConflict`, `RebookingReceipt`
- [ ] gör företagsgemensam schemaläggning first-class
- [ ] blockera dubbelbokning, otillåten överbokning och fel resursprofil
- [ ] verifiera booking, rebooking och conflict resolution

### Delfas 19.3 delivery-order / service-order / work-order hardening
- [ ] separera generellt `DeliveryOrder` från field-specifik `WorkOrder`
- [ ] bygg `ServicePlan`, `VisitWindow`, `InstructionSet`, `DeliveryDependency`
- [ ] lås hur kommersiell order översätts till leveransobjekt
- [ ] verifiera order-to-delivery lineage

### Delfas 19.4 dispatch / execution / checklist / evidence hardening
- [ ] bygg `DispatchBoard`, `DispatchAssignment`, `ExecutionChecklist`, `ExecutionEvidence`, `ExceptionCase`
- [ ] gör on_route, on_site, blocked, resumed och completed first-class
- [ ] bind checklistor, foton, signaturer och materialåtgång till exekveringen
- [ ] verifiera dispatch lifecycle och evidence completeness

### Delfas 19.5 recurring service / SLA / revisit hardening
- [ ] bygg `RecurringServicePlan`, `SlaProfile`, `VisitRecurrence`, `SlaBreachSignal`, `RevisitDecision`
- [ ] stöd återkommande tjänster, serviceavtal och SLA-baserad återplanering
- [ ] blockera green completion när revisit eller SLA-brott kräver uppföljning
- [ ] verifiera recurrence, SLA timers och breach flow

### Delfas 19.6 completion / signoff / finance handoff hardening
- [ ] bygg `CustomerSignoff`, `CompletionReceipt`, `FinanceHandoffReceipt`, `BillableReadinessDecision`
- [ ] gör completion blockerande på rätt signoff, material, tid och konfliktstatus
- [ ] underordna tid, material, signoff, billable evidence och work-order invoice handoff under `ARBETSORDER_TID_MATERIAL_OCH_FAKTURERBARHET_BINDANDE_SANNING.md`
- [ ] underordna project-level WIP, profitability och billable readiness under `PROJEKT_WIP_INTAKTSAVRAKNING_OCH_LONSAMHET_BINDANDE_SANNING.md`
- [ ] förhindra att ekonomi eller projekt hittar på completion själva
- [ ] verifiera completion gates och finance handoff lineage

### Delfas 19.7 mobile / offline / conflict / exception hardening
- [ ] bygg `MobileExecutionSession`, `OfflineOperation`, `SyncConflictCase`, `DispatchExceptionReceipt`
- [ ] stöd verklig mobil exekvering med konfliktupplösning och replaybar sync
- [ ] blockera tyst overwrite av fältdata vid offline-synk
- [ ] verifiera offline sync, conflict handling och replay

### Delfas 19.8 doc / runbook / legacy purge
- [ ] skriv explicit keep/rewrite/archive/remove-beslut för field- och project-delivery-docs
- [ ] skapa canonical runbooks för dispatch operations, recurring service och delivery completion
- [ ] håll field-vertikalen som vertikal pack och inte generell leveranssanning
- [ ] verifiera docs truth lint och legacy archive receipts
