# DOMAIN_18_IMPLEMENTATION_LIBRARY

## mål

Fas 18 ska bygga en riktig commercial core som bär företagets kommersiella sanning före fakturering och leverans.

## bindande tvärdomänsunderlag

- `ORDER_OFFERT_AVTAL_TILL_FAKTURA_BINDANDE_SANNING.md` är bindande kommersiell root för quote, agreement, order, change order, billing trigger, cancellation och invoice handoff.
- `ABONNEMANG_OCH_ATERKOMMANDE_FAKTURERING_BINDANDE_SANNING.md` är bindande recurring root för schedules, renewals, proration, paus, termination och recurring invoice handoff.
- `PROJEKT_WIP_INTAKTSAVRAKNING_OCH_LONSAMHET_BINDANDE_SANNING.md` är bindande project root för WIP, billable readiness, intäktsavräkning och lönsamhet när commercial objects gar vidare till projekt.
- `ARBETSORDER_TID_MATERIAL_OCH_FAKTURERBARHET_BINDANDE_SANNING.md` är bindande work-order root för tid, material, signoff och billable evidence när commercial objects gar vidare till delivery.
- `FAKTURAFLODET_BINDANDE_SANNING.md` är overordnad all invoice truth efter att ett kommersiellt objekt blivit fakturabar.
- Domän 18 får definiera quote, avtal, order och abonnemang, men får inte definiera eller overrida canonical issue-, kredit-, moms-, reskontra- eller betalallokeringslogik.

## Fas 18

### Delfas 18.1 commercial object-model / canonical route truth

- bygg:
  - `CommercialAccount`
  - `CommercialContact`
  - `CommercialOpportunity`
  - `CommercialQuote`
  - `CommercialQuoteVersion`
  - `CommercialContract`
  - `CommercialSubscription`
  - `CommercialOrder`
  - `CommercialHandoffReceipt`
- state machines:
  - `CommercialOpportunity: open -> qualified -> proposal -> committed | lost | archived`
  - `CommercialQuote: draft -> pending_approval -> approved -> sent -> accepted | expired | rejected | superseded`
  - `CommercialContract: draft -> active -> paused | amended | terminated | expired`
  - `CommercialSubscription: draft -> active -> pending_renewal | paused | terminated | expired`
  - `CommercialOrder: draft -> committed -> released | partially_released | cancelled | completed`
- commands:
  - `createCommercialAccount`
  - `createCommercialOpportunity`
  - `createCommercialQuote`
  - `createCommercialContract`
  - `createCommercialSubscription`
  - `createCommercialOrder`
- invariants:
  - commercial core äger primärsanningen för vad som sålts, till vem, till vilket pris och på vilka villkor
  - ÄR och projekt får konsumera commercial refs men inte ersätta commercial truth
  - canonical route family är `/v1/commercial/*`
- tester:
  - object creation and lifecycle suite
  - route truth suite

### Delfas 18.2 account / contact / relationship / ownership hardening

- bygg:
  - `CommercialAccountOwner`
  - `CommercialRelationshipRole`
  - `CommercialContactChannel`
  - `CommercialMergeDecision`
- commands:
  - `assignCommercialAccountOwner`
  - `attachCommercialContact`
  - `mergeCommercialAccount`
- invariants:
  - account och contact måste kunna leva utan att först bli fakturakund
  - merge kräver review receipt och audit lineage
  - primary contact, billing contact och signer contact är separata roller
- blockerande valideringar:
  - deny merge utan separat reviewer
  - deny duplicate canonical external identity per account/contact där policyn kräver det
- tester:
  - dedupe tests
  - merge review tests
  - role separation tests

### Delfas 18.3 lead / opportunity / pipeline hardening

- bygg:
  - `Lead`
  - `Opportunity`
  - `PipelineStage`
  - `OpportunityStageReceipt`
  - `OpportunityLossDecision`
  - `OpportunityWinReceipt`
- commands:
  - `createLead`
  - `qualifyLead`
  - `createOpportunity`
  - `transitionOpportunityStage`
  - `closeOpportunityWon`
  - `closeOpportunityLost`
- invariants:
  - stage history är append-only
  - win kräver account och minst en downstream commercial artifact
  - lost kräver loss reason
- tester:
  - stage transition tests
  - win/loss validation tests

### Delfas 18.4 quote / pricing / discount / approval hardening

- bygg:
  - `CommercialPricingProfile`
  - `CommercialDiscountDecision`
  - `CommercialQuoteApproval`
  - `CommercialQuoteAcceptanceReceipt`
- commands:
  - `reviseCommercialQuote`
  - `requestCommercialQuoteApproval`
  - `approveCommercialQuote`
  - `acceptCommercialQuote`
- invariants:
  - quote versioner är immutabla efter supersession
  - quote acceptance fryser line items, discount basis, validity och acceptance timestamp
  - rabatt över policygräns kräver approval
- routes:
  - `/v1/commercial/quotes`
  - `/v1/commercial/quotes/:quoteId/approve`
  - `/v1/commercial/quotes/:quoteId/accept`
- officiella källor:
  - [HubSpot: Create and send quotes](https://knowledge.hubspot.com/quotes/create-and-send-quotes)
  - [HubSpot: Create and manage products](https://knowledge.hubspot.com/products/how-do-i-use-products)
- tester:
  - quote revision tests
  - discount approval tests
  - acceptance freeze tests

### Delfas 18.5 contract / subscription / renewal / termination hardening

- bygg:
  - `SubscriptionPlan`
  - `SubscriptionInstance`
  - `RenewalDecision`
  - `ContractAmendment`
  - `TerminationDecision`
  - `CommercialNoticeWindow`
- commands:
  - `activateCommercialContract`
  - `startCommercialSubscription`
  - `renewCommercialSubscription`
  - `amendCommercialContract`
  - `terminateCommercialContract`
- invariants:
  - renewal, amendment och termination är egna receipts
  - notice period, bindningstid och indexation måste vara explicit i modellen
  - subscription kan inte leva som fri metadata på kontrakt
- routes:
  - `/v1/commercial/contracts`
  - `/v1/commercial/subscriptions`
  - `/v1/commercial/subscriptions/:subscriptionId/renew`
- officiella källor:
  - [HubSpot: Create subscriptions](https://knowledge.hubspot.com/subscriptions/manage-subscriptions-for-recurring-payments)
  - [HubSpot: Set up the subscriptions tool](https://knowledge.hubspot.com/subscriptions/set-up-the-hubspot-subscriptions-tool)
- tester:
  - renewal lifecycle tests
  - termination notice tests
  - amendment lineage tests

### Delfas 18.6 order / amendment / cancellation hardening

- bygg:
  - `CommercialOrderLine`
  - `OrderAmendment`
  - `OrderCancellationReceipt`
  - `OrderCommitmentWindow`
  - `OrderReleaseDecision`
- commands:
  - `createCommercialOrderFromContract`
  - `amendCommercialOrder`
  - `cancelCommercialOrder`
  - `releaseCommercialOrder`
- invariants:
  - order är kommersiellt commit-objekt och får inte reduceras till invoice-prep
  - cancellation måste bära reason, timing och compensation basis
  - release till projekt eller field måste vara explicit
- tester:
  - amendment tests
  - cancellation compensation tests
  - release gating tests

### Delfas 18.7 downstream handoff / SLA / support / project / field hardening

- bygg:
  - `ProjectCommercialHandoff`
  - `FieldCommercialHandoff`
  - `BillingEntitlement`
  - `SupportEntitlement`
  - `CommercialSlaProfile`
- commands:
  - `createProjectCommercialHandoff`
  - `createFieldCommercialHandoff`
  - `grantSupportEntitlement`
  - `grantBillingEntitlement`
- invariants:
  - downstream-domäner får bara läsa kommersiell rättighet via handoff receipts
  - SLA, supportnivå, leveransvillkor och billing rights måste kunna härledas till contract/order
- tester:
  - handoff lineage tests
  - entitlement enforcement tests

### Delfas 18.8 doc / runbook / legacy purge

- bygg:
  - `CommercialDocTruthDecision`
  - `CommercialLegacyArchiveReceipt`
  - `CommercialRunbookExecution`
- dokumentbeslut:
  - rewrite: `docs/domain/projects-workspace.md`
  - rewrite: `docs/runbooks/fas-14-1-project-commercial-core-verification.md`
  - rewrite: `docs/runbooks/fas-14-2-project-crm-handoff-verification.md`
  - migrate to integration boundary: `docs/runbooks/phase16-hubspot-crm-handoff-verification.md`
  - create: `docs/runbooks/commercial-quote-approval.md`
  - create: `docs/runbooks/commercial-contract-activation.md`
  - create: `docs/runbooks/commercial-renewal-and-termination.md`
- invariants:
  - projekt- eller integrationsdocs får inte fortsätta bära canonical commercial truth
- tester:
  - docs truth lint
  - runbook existence lint
