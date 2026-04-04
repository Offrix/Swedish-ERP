# DOMAIN_18_ROADMAP

## mål

Göra Domän 18 till företagets verkliga kommersiella kärna så att plattformen bär hela kedjan från relation och säljmöjlighet till offert, avtal, abonnemang, order och styrd handoff till leverans och fakturering.

## varför domänen behövs

Utan denna domän finns bara ekonomi efter affären. Företaget måste fortfarande leva i externa CRM-, offert- eller avtalsverktyg för att:
- sälja
- prissätta
- godkänna rabatter
- skriva avtal
- hantera renewals
- ändra eller avsluta kommersiella åtäganden

## bindande tvärdomänsunderlag

- `ORDER_OFFERT_AVTAL_TILL_FAKTURA_BINDANDE_SANNING.md` är bindande kommersiell root för quote, agreement, order, change order, billing trigger, cancellation och invoice handoff.
- `ABONNEMANG_OCH_ATERKOMMANDE_FAKTURERING_BINDANDE_SANNING.md` är bindande recurring root för schedules, renewals, proration, paus, termination och recurring invoice handoff.
- `PROJEKT_WIP_INTAKTSAVRAKNING_OCH_LONSAMHET_BINDANDE_SANNING.md` är bindande project root för WIP, billable readiness, intäktsavräkning och lönsamhet när commercial objects gar vidare till projekt.
- `ARBETSORDER_TID_MATERIAL_OCH_FAKTURERBARHET_BINDANDE_SANNING.md` är bindande work-order root för tid, material, signoff och billable evidence när commercial objects gar vidare till delivery.
- `FAKTURAFLODET_BINDANDE_SANNING.md` är overordnad när kommersiella objekt blir fakturabara. Domän 18 får inte definiera egen invoice truth.

## faser

- Fas 18.1 commercial object-model / canonical route truth
- Fas 18.2 account / contact / relationship / ownership hardening
- Fas 18.3 lead / opportunity / pipeline hardening
- Fas 18.4 quote / pricing / discount / approval hardening
- Fas 18.5 contract / subscription / renewal / termination hardening
- Fas 18.6 order / amendment / cancellation hardening
- Fas 18.7 downstream handoff / SLA / support / project / field hardening
- Fas 18.8 doc / runbook / legacy purge

## dependencies

- Domän 3 för canonical ledger, dimensioner, serie- och bokföringsregler.
- Domän 5 för ÄR-objekt, kunder, artiklar och fakturalänk.
- Domän 10 för projekt, change orders och lönsamhetskoppling.
- Domän 14 för externa CRM- och partneradapters.
- Domän 16 för support/backoffice, approvals, audit och masking.

## vad som får köras parallellt

- 18.2 och 18.3 kan köras parallellt när canonical commercial root är låst.
- 18.4 och 18.5 kan köras parallellt när account/contact/opportunity finns.
- 18.7 kan påbörjas när 18.4 och 18.5 har låst objektreferenser och receipts.

## vad som inte får köras parallellt

- 18.4 får inte markeras klar före 18.1, 18.2 och 18.3.
- 18.5 får inte markeras klar före 18.4.
- 18.6 får inte markeras klar före 18.5.
- 18.7 får inte markeras klar före 18.6.
- 18.8 får inte markeras klar före att nya canonical docs finns.

## exit gates

- commercial core är egen canonical source of truth
- account, contact, opportunity, quote, contract, subscription och order är first-class objects
- rabatt, pris, avtalsändring och renewal är approval-styrda där policy kräver det
- projekt, field, support och ÄR läser kommersiell sanning via receipts och handoff-objekt, inte fria metadatafält

## test gates

- quote versioning, approval och acceptance tests
- subscription renewal, pause, change och termination tests
- order amendment och cancellation tests
- commercial-to-project, commercial-to-field och commercial-to-ÄR handoff tests
- auth- och approval-tester för rabatt, avtal och orderändring

## delfaser

### Delfas 18.1 commercial object-model / canonical route truth
- [ ] bygg `CommercialAccount`, `CommercialContact`, `CommercialOpportunity`, `CommercialQuote`, `CommercialContract`, `CommercialSubscription`, `CommercialOrder` och `CommercialHandoffReceipt`
- [ ] skapa canonical route family `/v1/commercial/*`
- [ ] flytta kommersiell primärsanning ur ren ÄR- och project-fragmentering
- [ ] verifiera route truth lint och repository truth

### Delfas 18.2 account / contact / relationship / ownership hardening
- [ ] bygg account hierarchy, relation roller, primärkontakt, kundansvarig och owner assignment
- [ ] bär customer-to-account mapping explicit i stället för lösa kundfält
- [ ] blockera dubbletter och osäkra merge paths utan review
- [ ] verifiera dedupe, merge och owner receipts

### Delfas 18.3 lead / opportunity / pipeline hardening
- [ ] bygg `Lead`, `Opportunity`, `PipelineStage`, `LossReason`, `WinReceipt`
- [ ] gör stage history, owner changes och close reasons first-class
- [ ] koppla opportunity till account, contacts, quote och order
- [ ] verifiera stage gates, reopen rules och win/loss evidence

### Delfas 18.4 quote / pricing / discount / approval hardening
- [ ] gör prislista, rabatter, quote approvals och quote validity first-class i commercial core
- [ ] bygg tydlig CPQ-light för line items, tiered pricing, minimum fee och special terms
- [ ] bind rabatt- och avvikelsefall till explicit approval policy
- [ ] verifiera quote revision, approval, acceptance och expiry

### Delfas 18.5 contract / subscription / renewal / termination hardening
- [ ] bygg `SubscriptionPlan`, `SubscriptionInstance`, `RenewalDecision`, `ContractAmendment`, `TerminationDecision`
- [ ] gör renewals, uppsägning, paus, prisindexering och bindningstid first-class
- [ ] blockera renewal utan korrekt pricing, notice period och approval där policy kräver det
- [ ] verifiera renewal, pause, change, cancel och indexation

### Delfas 18.6 order / amendment / cancellation hardening
- [ ] bygg `CommercialOrder`, `OrderLine`, `OrderAmendment`, `OrderCancellationReceipt`, `OrderCommitmentWindow`
- [ ] lås order som separat commit-objekt från quote och contract
- [ ] gör ändringsorder och cancellation receipts first-class
- [ ] verifiera order freeze, amendment lineage och cancel compensation

### Delfas 18.7 downstream handoff / SLA / support / project / field hardening
- [ ] bygg `ProjectCommercialHandoff`, `FieldCommercialHandoff`, `SupportEntitlement`, `BillingEntitlement`, `CommercialSlaProfile`
- [ ] bind SLA, supportnivå, leveransvillkor och faktureringsrätt till kommersiell sanning
- [ ] förhindra att projekt eller field hittar på egen kommersiell truth
- [ ] verifiera handoff lineage till projekt, arbetsorder, support och ÄR

### Delfas 18.8 doc / runbook / legacy purge
- [ ] skriv explicit keep/rewrite/archive/remove-beslut för project-commercial- och CRM-handoff-docs
- [ ] skapa canonical commercial runbooks för quote approval, contract activation, renewal och amendment
- [ ] flytta integrationsspecifika CRM runbooks till Domän 14-gränsen
- [ ] verifiera docs truth lint och legacy archive receipts
