# LEVERANTÖRSBETALNINGAR_OCH_LEVERANTÖRSRESKONTRA_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för leverantörsbetalnings- och leverantörsreskontraflödet efter att upstream AP-truth redan har skapat `ApOpenItem`.

Detta dokument ska styra:
- open-item settlement efter posting
- leverantörsreskontra, aging och outstanding balances
- payment holds, proposals, approval, submit och execution receipts
- delbetalning, överbetalning, underbetalning och split settlement
- supplier advances, avräkning och supplier refunds
- netting mellan leverantörsfaktura och leverantörskreditnota
- rejected, cancelled och returned supplier payments
- bankavgifter och valutadifferenser på settlement
- disputed payable reclassification
- intercompany- och associated-supplier settlement
- cash-method payment-side handoff till upstream AP/VAT truth
- SIE4-, reskontra- och exporteffekter för supplier settlement

## Syfte

Läsaren ska kunna bygga hela settlement- och leverantörsreskontrakarnan utan att gissa:
- när en leverantörsskuld fortfarande är öppen
- när en utbetalning är riktig betalning respektive bara future proposal
- hur supplier advance ska bara tillgang i stallet för falsk skuldstangning
- hur returns skiljs från rejects
- hur netting sker utan falska bankbokningar
- hur FX och bank fees bokas explicit

## Omfattning

Detta dokument omfattar:
- ordinary domestic supplier payments
- partial settlements
- split settlement across multiple open items för same supplier
- overpayment and residual payable
- supplier advance before invoice
- advance apply against låter invoice
- supplier refund of advance or overpayment
- credit-note netting and deduction-backed payment reduction
- returned payment after booked execution
- rejected or cancelled payment before booked execution
- bank fee on payment
- foreign-currency settlement with realized FX gain/loss
- disputed payable and class-specific supplier liabilities
- cash-method payment-side settlement handoff
- replay, correction, migration and rollback för supplier payment chains

Detta dokument omfattar inte:
- ingest, OCR, duplicate detection eller upstream routing
- leverantörsfakturans issue-/postingtruth och purchase-side VAT coding
- teknisk file transport eller provider auth
- bank statement identity och reconciliationrails
- seller-side kundinbetalningar
- lön, benefits eller employee reimbursements

Kanonisk agarskapsregel:
- `LEVFAKTURAFLODET_BINDANDE_SANNING.md` äger leverantörsfaktura, leverantörskreditnota, coding, momsprofil, approval och skapandet av `ApOpenItem`
- detta dokument äger `ApOpenItem` och leverantörsreskontra efter posting
- `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md` äger bankradens tekniska sanning
- `MOMSFLODET_BINDANDE_SANNING.md` ska aga momsrutor och reporting truth

## Absoluta principer

- ingen leverantörsbetalning får bokas utan bindande open-item- eller approved-advance-truth
- rejected payment får aldrig bokföras som om pengar lamnat banken
- returned payment får aldrig behandlas som reject; den ska återöppna skuld eller tillgang efter att faktisk utbetalning redan bokats
- överbetalning får aldrig bokas som kostnad eller gommas i `2440`; overskottet ska bli leverantörsfordran på canonical tillgangskonto
- supplier advance innan leverantörsfaktura finns får aldrig bokas mot `2440`
- netting utan bankrorelse får aldrig skapa `1930`-post
- bankavgift får aldrig dorras igenom genom att minska leverantörsskulden
- valutadifferens får aldrig gommas i `2440` eller `1930`; den ska ga explicit till canonical FX gain/loss account
- samma execution receipt får aldrig kunna settle samma open item flera ganger
- bokslutsmetod får aldrig skapa dubbel AP-posting och dubbel settlement

## Bindande dokumenthierarki för leverantörsbetalnings- och leverantörsreskontraflödet

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- detta dokument

Detta dokument lutar på:
- `LEVFAKTURAFLODET_BINDANDE_SANNING.md` för skapandet av `ApOpenItem`, leverantörskreditnotor och purchase-side VAT/posting truth
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` för vouchers, serier, kontrollkonton, correction chains, period locks och SIE4-vouchertruth för supplier settlement
- `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md` för upstream capture, OCR, duplicate detection och routing av leverantörsunderlag
- `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md` för bankradens tekniska identitet, statement import, payment transport, provider status och reconciliation
- `MOMSFLODET_BINDANDE_SANNING.md` för reporting-side VAT truth

Payment-supersession-regel:
- om `LEVFAKTURAFLODET_BINDANDE_SANNING.md` fortfarande innehåller gamla AP-payment- eller AP-return-sektioner är de supersedade av detta dokument sa fort de rör settlement efter posting

## Kanoniska objekt

- `ApOpenItem`
  - bar juridisk och operativ leverantörsskuld eller leverantörskredit efter posting
  - innehåller open amount, settled amount, reserved amount, currency, functional amount, due date, dispute flag och owner supplier

- `SupplierAdvanceAsset`
  - bar tillgangstruth när bolaget har betalat leverantör innan relevant skuld eller kreditfull avräkning finns
  - canonical konto är `1684`

- `SupplierPaymentHold`
  - bar blockertruth för supplier payment

- `SupplierPaymentProposal`
  - bar planerad betalningsmangd innan execution

- `SupplierPaymentBatch`
  - bar frozen submissionmangd för en betalningskorning

- `SupplierPaymentInstruction`
  - bar en enskild betalorder mot en eller flera open items för samma supplier

- `SupplierPaymentExecutionReceipt`
  - bar bindande evidence för accepted, booked, returned eller rejected outcome

- `SupplierNettingDecision`
  - bar bindande beslut att positivt och negativt AP-open item ska regleras mot varandra utan bankrorelse

- `SupplierDisputeReclassification`
  - bar omklassning mellan ordinary supplier payable och disputed supplier payable

## Kanoniska state machines

### `ApOpenItem`
- `open`
- `on_hold`
- `scheduled`
- `partially_settled`
- `settled`
- `netted`
- `returned`
- `reopened`
- `disputed`
- `closed`

### `SupplierAdvanceAsset`
- `recognized`
- `partially_applied`
- `fully_applied`
- `refunded`
- `written_off`
- `closed`

### `SupplierPaymentProposal`
- `draft`
- `frozen`
- `approved`
- `superseded`
- `cancelled`

### `SupplierPaymentBatch`
- `draft`
- `approved`
- `exported`
- `accepted`
- `partially_executed`
- `executed`
- `returned`
- `rejected`
- `cancelled`

### `SupplierPaymentInstruction`
- `draft`
- `approved`
- `exported`
- `accepted`
- `booked`
- `returned`
- `rejected`
- `cancelled`

## Kanoniska commands

- `CreateSupplierPaymentHold`
- `ReleaseSupplierPaymentHold`
- `CreateSupplierAdvanceAsset`
- `ApplySupplierAdvanceAsset`
- `RefundSupplierAdvanceAsset`
- `CreateSupplierPaymentProposal`
- `FreezeSupplierPaymentProposal`
- `ApproveSupplierPaymentProposal`
- `SupersedeSupplierPaymentProposal`
- `CreateSupplierPaymentBatch`
- `ApproveSupplierPaymentBatch`
- `ExportSupplierPaymentBatch`
- `RegisterSupplierPaymentExecutionReceipt`
- `BookSupplierPayment`
- `RejectSupplierPayment`
- `ReturnSupplierPayment`
- `CancelSupplierPaymentBeforeExecution`
- `ChangeSupplierPaymentDate`
- `CreateSupplierNettingDecision`
- `ApplySupplierNettingDecision`
- `ReclassifySupplierPayableAsDisputed`
- `ReleaseDisputedSupplierPayable`

## Kanoniska events

- `ap.payment_hold.created`
- `ap.payment_hold.released`
- `ap.advance.recognized`
- `ap.advance.applied`
- `ap.advance.refunded`
- `ap.payment_proposal.created`
- `ap.payment_proposal.frozen`
- `ap.payment_proposal.approved`
- `ap.payment_batch.created`
- `ap.payment_batch.exported`
- `ap.payment_batch.accepted`
- `ap.payment.execution.received`
- `ap.payment.booked`
- `ap.payment.rejected`
- `ap.payment.returned`
- `ap.payment.cancelled`
- `ap.netting.approved`
- `ap.netting.applied`
- `ap.payable.dispute_marked`
- `ap.payable.dispute_released`

## Kanoniska route-familjer

Canonical route family för leverantörsbetalnings- och leverantörsreskontraflödet ska vara:
- `/v1/ap/open-items/*`
- `/v1/ap/payment-holds/*`
- `/v1/ap/advances/*`
- `/v1/ap/payment-proposals/*`
- `/v1/ap/payment-batches/*`
- `/v1/ap/payment-instructions/*`
- `/v1/ap/payment-receipts/*`
- `/v1/ap/netting/*`
- `/v1/ap/disputes/*`

## Kanoniska permissions och review boundaries

- `ap_open_item.read`
- `ap_open_item.schedule_payment`
- `ap_payment_proposal.freeze`
- `ap_payment_proposal.approve`
- `ap_payment_batch.export`
- `ap_payment_return.resolve`
- `ap_payment_hold.manage`
- `ap_supplier_advance.create`
- `ap_supplier_advance.apply`
- `ap_netting.approve`
- `ap_dispute.reclassify`
- `ap_audit.read`

Hårda review boundaries:
- samma person får inte skapa, approve och exportera samma payment batch
- samma person får inte markera bankdetaljandring och sedan godkänna utbetalning utan separat review
- överbetalning, supplier advance och supplier refund kraver explicit approval om beloppet overstiger low-risk policy
- disputed payable får inte frislappas och betalas i samma godkännande utan dubbel kontroll

## Nummer-, serie-, referens- och identitetsregler

- `supplierPaymentProposalId`, `supplierPaymentBatchId`, `supplierPaymentInstructionId` och `supplierPaymentExecutionReceiptId` måste vara globalt unika
- varje instruction måste bara en stabil lista med `apOpenItemId`
- varje supplier advance måste bara `supplierAdvanceAssetId`
- `EndToEndId` eller motsvarande railreferens måste vara first-class när railen stödjer det
- supplier bankgiro, plusgiro, IBAN eller domestic account profile får aldrig lagras som fri text utan verifierad payment profile
- cancelled payment och date-change måste referera exakt original instruction id
- reject och return måste referera exakt execution receipt lineage eller provider return reference

## Valuta-, avrundnings- och omräkningsregler

- huvudbok ska alltid bara SEK
- `ApOpenItem.originalCurrency` och `SupplierPaymentInstruction.paymentCurrency` måste bevaras
- realized FX gain eller loss på leverantörsbetalning ska bokas explicit till `3960` eller `7960`
- betalning i annan valuta får aldrig forcera `ApOpenItem` till att se fullt reglerad ut om residual uppstår genom rate- eller fee-drift
- bank fee i annan valuta får aldrig gommas i FX-differensen

## Replay-, correction-, recovery- och cutover-regler

- samma execution receipt får aldrig kunna skapa mer an en booking chain
- correction får aldrig overwrite tidigare payment status; ny lineage måste skapas
- migration måste bevara öppna `ApOpenItem`, outstanding `SupplierAdvanceAsset`, payment holds och exporterade men ej bokade batchar som `blocked_for_reauthorization`
- rollback får aldrig autoateruppvacka redan bokade supplier payments utan explicit reversal plan
- returned payment efter execution måste skapa egen return chain, inte mutation av original payment receipt
- replay av bank/provider receipt med samma hash ska ge `replayed_duplicate` och ingen ny ledger effect

## Huvudflödet

1. upstream AP-truth skapar `ApOpenItem` eller negativt open item för kreditnota
2. eligibla open items klassas mot hold, due date, rail profile, supplier payment data och approval policy
3. `SupplierPaymentProposal` byggs och fryses
4. proposal approvas och materialiseras till `SupplierPaymentBatch`
5. batch exporteras eller manuellt kontrollerad rail receipt skapas
6. provider/bank ackar, rejectar eller returnerar instruction
7. booked execution receipt skapar settlement i reskontra och vid behov huvudboksverifikat
8. returns, rejects, netting, advances och disputes driver egna correctionkedjor
9. reporting, SIE4 och leverantörsreskontraaging uppdateras

## Bindande scenarioaxlar

Varje scenario i detta dokument måste korsas mot minst dessa axlar:
- motpartsklass: `external_supplier`, `group_supplier`, `associate_supplier`, `approved_one_time_payee`
- liability source: `ordinary_supplier_invoice`, `supplier_credit_note`, `supplier_advance`, `disputed_payable`, `overpayment_receivable`
- accounting method: `invoice_method`, `cash_method`
- rail class: `domestic_bankgiro`, `domestic_plusgiro`, `domestic_account_transfer`, `sepa_credit_transfer`, `international_wire`, `manual_controlled_payment`
- currency profile: `sek`, `foreign_same_functional_day_rate`, `foreign_multi_day_rate_difference`
- settlement pattern: `full_payment`, `partial_payment`, `split_payment`, `overpayment`, `netting`, `advance_apply`, `refund_from_supplier`
- execution outcome: `accepted`, `booked`, `rejected_before_booking`, `returned_after_booking`, `cancelled_before_execution`, `blocked_unknown`
- period profile: `normal_period`, `month_end`, `fiscal_year_cutover`, `migrated_open_item`

## Bindande policykartor

### LPR-POL-001 canonical account map för supplier settlement

- `2440` = canonical ordinary supplier payable
- `2445` = canonical disputed supplier payable
- `2460` = canonical group supplier payable family
- `2470` = canonical associated supplier payable family
- `1684` = canonical short-term receivable from supplier, including overpayment and supplier advance asset
- `1930` = canonical bank account för settlement examples
- `6570` = canonical bank fee or payment service fee
- `3960` = canonical realized FX gain on supplier settlement
- `7960` = canonical realized FX loss on supplier settlement

Productpolicy:
- bolag får ha smalare underkonton inom samma BAS-familj
- `2999`, `3790`, `6999`, `6991` och ändra catch-all-konton är förbjudna som default i detta flöde
- `2893` får inte användas som canonical supplier settlement account; owner-related claims ägs av `UTLAGG_OCH_VIDAREFAKTURERING_BINDANDE_SANNING.md`

### LPR-POL-002 rail policy

- `domestic_bankgiro` är canonical för svenska SEK-betalningar via Bankgirots leverantörsbetalningskedja
- `domestic_plusgiro` och `domestic_account_transfer` får användas bara om provider profile uttryckligen har verifierad capability
- `sepa_credit_transfer` och `international_wire` får inte lata sig utges för svensk leverantörsbetalningsfil utan separat provider capability
- railval får aldrig ske via OCR- eller invoice-scan-heuristik ensam

### LPR-POL-003 hold policy

- `missing_bank_data`
- `supplier_blocked`
- `duplicate_instruction_candidate`
- `disputed_payable`
- `netting_requires_credit`
- `bank_detail_recently_changed`
- `manual_high_risk_review`
- `cash_method_upstream_not_materialized`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

### LPR-P0001 Full betalning av ordinary supplier payable
- debet `2440`
- kredit `1930`

### LPR-P0002 Delbetalning av ordinary supplier payable
- debet `2440` = betald del
- kredit `1930` = betald del

### LPR-P0003 Överbetalning till leverantör
- debet `2440` = ursprunglig skuld
- debet `1684` = overskjutande belopp
- kredit `1930` = total utbetalning

### LPR-P0004 Supplier advance innan invoice posting
- debet `1684`
- kredit `1930`

### LPR-P0005 Avräkning av supplier advance mot senare postad leverantörsfaktura
- debet `2440`
- kredit `1684`

### LPR-P0006 Supplier refund av tidigare advance eller overpayment
- debet `1930`
- kredit `1684`

### LPR-P0007 Netting mellan leverantörsfaktura och leverantörskreditnota
- ingen ny huvudbokspost
- settlement sker i reskontran genom bindande `SupplierNettingDecision`

### LPR-P0008 Bankavgift på supplier payment
- debet `6570`
- kredit `1930`

### LPR-P0009 Foreign-currency settlement med realiserad FX-förlust
- debet `2440` = functional amount
- debet `7960` = FX-förlust
- kredit `1930` = faktisk SEK-utbetalning

### LPR-P0010 Foreign-currency settlement med realiserad FX-vinst
- debet `2440` = functional amount
- kredit `1930` = faktisk SEK-utbetalning
- kredit `3960` = FX-vinst

### LPR-P0011 Rejected payment före booked execution
- ingen huvudbokspost

### LPR-P0012 Returned payment efter booked execution
- debet `1930`
- kredit `2440` eller annat canonical payable-konto som ursprungligen stangdes

### LPR-P0013 Cancelled eller date-shifted payment före execution
- ingen huvudbokspost

### LPR-P0014 Full betalning av group supplier payable
- debet `2460`
- kredit `1930`

### LPR-P0015 Full betalning av associated supplier payable
- debet `2470`
- kredit `1930`

### LPR-P0016 Disputed payable reclassification
- debet `2440`
- kredit `2445`

### LPR-P0017 Release disputed payable tillbaka till ordinary payable
- debet `2445`
- kredit `2440`

### LPR-P0018 Payment reduction backed by posted credit note in same batch
- ingen ny huvudbokspost utover upstream credit-note-posting
- settlement sker via `SupplierNettingDecision`

### LPR-P0019 Cash-method settlement handoff
- ingen standalone payment-proof-ledger får bokas innan upstream cash-method recognition kedja har materialiserats
- canonical effect är atomisk kombination av upstream AP/VAT recognition och settlement enligt relevant payment proof

### LPR-P0020 Unmatched supplier refund eller unmatched outgoing execution
- ingen legal huvudbokspost får skapas i detta flöde
- scenario ska blockeras till bank- eller reviewkedja tills exakt supplier/open-item-link finns

## Bindande rapport-, export- och myndighetsmappning

- supplier payment booking ska synas i huvudbok och SIE4 med canonical verifikationsserie enligt detta dokument
- supplier open-item settlement ska uppdatera leverantörsreskontra aging
- overpayment och supplier advance ska synas som kortfristig fordran på leverantör, inte som negativ skuld
- rejected payment före booked execution får inte synas som bokförd bankrorelse i rapporter
- returned payment efter booking ska synas som reversal/återöppning och ny öppen skuld
- cash-method-scenarier får bara paverka momsrapport genom upstream AP/VAT truth
- payment batch export artifact och provider receipt är evidence artifacts, inte huvudboksverifikat

## Bindande scenariofamilj till proof-ledger och rapportspar

- `LPR-A001` -> `LPR-P0001` -> leverantörsreskontra, huvudbok, SIE4
- `LPR-A002` -> `LPR-P0002` -> leverantörsreskontra, huvudbok, SIE4
- `LPR-A003` -> `LPR-P0002` -> leverantörsreskontra, huvudbok, SIE4
- `LPR-A004` -> `LPR-P0003` -> leverantörsreskontra, leverantörsfordran, huvudbok, SIE4
- `LPR-A005` -> `LPR-P0002` -> leverantörsreskontra residual, huvudbok, SIE4
- `LPR-B001` -> `LPR-P0004` -> leverantörsfordran, huvudbok, SIE4
- `LPR-B002` -> `LPR-P0005` -> leverantörsreskontra, leverantörsfordran, SIE4
- `LPR-B003` -> `LPR-P0006` -> leverantörsfordran, bank, SIE4
- `LPR-C001` -> `LPR-P0007` -> leverantörsreskontra, no new huvudbok
- `LPR-C002` -> `LPR-P0018` -> leverantörsreskontra, no new huvudbok
- `LPR-C003` -> `LPR-P0018` -> leverantörsreskontra, payment artifact, no new huvudbok
- `LPR-D001` -> `LPR-P0011` -> payment status only
- `LPR-D002` -> `LPR-P0013` -> payment status only
- `LPR-D003` -> `LPR-P0012` -> leverantörsreskontra, huvudbok, SIE4
- `LPR-D004` -> `LPR-P0020` -> blocked, no huvudbok
- `LPR-D005` -> `LPR-P0008` -> huvudbok, SIE4
- `LPR-E001` -> `LPR-P0016` -> leverantörsreskontra reclass, huvudbok, SIE4
- `LPR-E002` -> `LPR-P0017` + `LPR-P0001` -> leverantörsreskontra, huvudbok, SIE4
- `LPR-E003` -> `LPR-P0014` -> huvudbok, SIE4
- `LPR-E004` -> `LPR-P0015` -> huvudbok, SIE4
- `LPR-E005` -> `LPR-P0019` -> upstream AP/VAT + settlement chain
- `LPR-F001` -> `LPR-P0009` -> huvudbok, SIE4
- `LPR-F002` -> `LPR-P0010` -> huvudbok, SIE4
- `LPR-F003` -> `LPR-P0020` -> blocked, no legal posting

## Tvingande dokument- eller indataregler

- supplier payment proposal får bara byggas från posted `ApOpenItem`, approved `SupplierAdvanceAsset` eller approved `SupplierNettingDecision`
- supplier payment execution receipt måste bara batch/instruction id, provider/bank receipt id, supplier/payee identity, booked or returned amount, effective date och reason/status code
- return receipt utan original booking link får inte settle eller reverse något
- reject receipt utan instruction lineage får inte autoappliceras mot batch
- bank detail change på supplier efter att proposal frysts ska tvinga ny freeze- och approvalkedja
- settlement mot group supplier eller associated supplier får bara ske när supplier profile uttryckligen har liability class `group` eller `associate`

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `LPR-R001` = `missing_bank_data`
- `LPR-R002` = `supplier_blocked`
- `LPR-R003` = `duplicate_instruction_candidate`
- `LPR-R004` = `disputed_payable`
- `LPR-R005` = `netting_requires_posted_credit`
- `LPR-R006` = `rejected_before_booking`
- `LPR-R007` = `returned_after_booking`
- `LPR-R008` = `advance_without_upstream_support`
- `LPR-R009` = `cash_method_upstream_not_materialized`
- `LPR-R010` = `unmatched_supplier_refund`
- `LPR-R011` = `bank_detail_recently_changed`
- `LPR-R012` = `manual_high_risk_review`

## Bindande faltspec eller inputspec per profil

### Profil `ordinary_supplier_payment`
- `supplierId`
- `apOpenItemIds[]`
- `settlementAmount`
- `paymentCurrency`
- `scheduledPaymentDate`
- `railClass`
- `payeeProfileId`
- `proposalId`
- `approvalReceiptId`

### Profil `supplier_advance_payment`
- `supplierId`
- `advancePurposeCode`
- `approvedAdvanceAmount`
- `paymentCurrency`
- `scheduledPaymentDate`
- `payeeProfileId`
- `approvalReceiptId`

### Profil `credit_netting`
- `supplierId`
- `positiveApOpenItemId`
- `negativeApOpenItemId`
- `nettingAmount`
- `nettingDecisionReason`
- `approvalReceiptId`

### Profil `returned_payment_receipt`
- `supplierPaymentExecutionReceiptId`
- `originalInstructionId`
- `returnAmount`
- `returnDate`
- `providerReturnCode`

### Profil `rejected_payment_receipt`
- `supplierPaymentInstructionId`
- `rejectDate`
- `providerRejectCode`
- `rejectStage`

### Profil `foreign_currency_settlement`
- `supplierId`
- `apOpenItemIds[]`
- `originalCurrency`
- `functionalAmountSek`
- `bookedBankAmountSek`
- `rateSource`
- `rateDate`

## Scenariofamiljer som hela systemet måste tacka

### LPR-A Ordinary payment family
- `LPR-A001` full ordinary payment
- `LPR-A002` partial ordinary payment
- `LPR-A003` one payment settles multiple invoices för same supplier
- `LPR-A004` overpayment creates supplier receivable
- `LPR-A005` underpayment leaves residual payable

### LPR-B Advance and refund family
- `LPR-B001` supplier advance before invoice
- `LPR-B002` apply supplier advance to låter invoice
- `LPR-B003` supplier refunds prior advance or overpayment

### LPR-C Credit, deduction and netting family
- `LPR-C001` credit note fully offsets invoice
- `LPR-C002` credit note partially offsets invoice before payment
- `LPR-C003` payment file deduction backed by posted credit or approved deduction decision

### LPR-D Rejection, cancellation and return family
- `LPR-D001` rejected before booked execution
- `LPR-D002` cancelled or date-changed before execution
- `LPR-D003` returned after booked execution
- `LPR-D004` duplicate return or duplicate receipt replay
- `LPR-D005` bank fee recorded separately from payment

### LPR-E Dispute and supplier-class family
- `LPR-E001` disputed payable reclassification
- `LPR-E002` release disputed payable and then pay
- `LPR-E003` group supplier settlement
- `LPR-E004` associated supplier settlement
- `LPR-E005` cash-method atomic settlement handoff

### LPR-F Blocked and exceptional family
- `LPR-F001` FX loss on settlement
- `LPR-F002` FX gain on settlement
- `LPR-F003` unmatched supplier refund or unmatched outgoing execution blocked
- `LPR-F004` bank data changed after proposal freeze -> block
- `LPR-F005` payment proposal blocked by hold or missing approval

## Scenarioregler per familj

### LPR-A Ordinary payment family
- full, partial, split, över- och underbetalning får bara settle already posted `ApOpenItem`
- överbetalning ska alltid skapa `SupplierAdvanceAsset` eller annan canonical supplier receivable
- underbetalning får aldrig stanga open item helt

### LPR-B Advance and refund family
- supplier advance utan invoice posting ska ga till `1684`, aldrig till `2440`
- när senare invoice postas får advance bara avräknas mot samma supplier och kompatibel valuta/legal entity
- supplier refund ska minska `1684`, aldrig skapa negativ kostnad

### LPR-C Credit, deduction and netting family
- netting får bara ske mot already posted supplier credit note eller approved deduction decision
- netting utan bankrorelse får aldrig skapa `1930`-post
- payment reduction i batch får bara referera posted credit lineage

### LPR-D Rejection, cancellation and return family
- rejected before booking = ingen huvudbok
- cancelled/date change before execution = ingen huvudbok
- returned after booking = reversal av settlementkedjan
- duplicate receipts = no-op med replay receipt
- bank fee = separat journal

### LPR-E Dispute and supplier-class family
- dispute reclassification ska frysa straight-through payment
- release from dispute måste skapa nytt approval-spor
- group supplier och associated supplier ska använda canonical payable family `2460` respektive `2470`
- cash-method scenario får bara ga igenom om upstream AP/VAT truth materialiseras atomiskt

### LPR-F Blocked and exceptional family
- unmatched supplier refund eller unmatched outgoing execution får inte bokföras i detta flöde
- saknade bankdetaljer, recent bank change och supplier block ska alltid blockera batch export
- FX-scenario får aldrig använda generic difference account utan `3960/7960`

## Blockerande valideringar

- blockera payment proposal om något `ApOpenItem` inte är `open`, `disputed` med release receipt, eller `partially_settled` med fortsatt debt
- blockera payment proposal om `SupplierPaymentHold` finns och inte är released
- blockera payment proposal om supplier saknar verifierad payee profile för vald rail
- blockera booked settlement om execution receipt inte kan bindas till exakt instruction lineage
- blockera overpayment om policy inte uttryckligen tillater supplier receivable creation
- blockera supplier advance om required approval eller purpose code saknas
- blockera credit netting om credit lineage eller approved deduction decision saknas
- blockera FX settlement om rate source eller rate date saknas
- blockera cash-method payment om upstream AP/VAT recognition inte är materialized i samma command chain
- blockera replay om samma execution receipt redan gett legal effect
- blockera unmatched return/refund till review eller bankflöde, aldrig auto-posting

## Rapport- och exportkonsekvenser

- `ApOpenItem.openAmount`, `settledAmount` och `reservedAmount` ska vara deterministiskt derivabla från payment- och nettingchain
- leverantörsreskontra aging ska minska bara vid `booked`, `returned`, `netted`, `advance_applied` eller explicit reclass/reopen
- returned payment ska oka leverantörsreskontran igen
- supplier advance och supplier overpayment ska visas separat från leverantörsskulder
- SIE4 ska innehålla exakta verifikationsserier och konton enligt proof-ledger
- payment batch export artifact får vara evidence men får inte ersätta huvudboksverifikat

## Förbjudna förenklingar

- ingen `mark as paid` utan execution receipt
- ingen payment reservation som ser bokförd ut
- ingen negativ leverantörsskuld som ersättning för supplier receivable
- ingen catch-all `misc difference` i stallet för `3960/7960` eller `6570`
- ingen användning av `1930` som placeholder för provider-held medel om banken inte faktiskt flyttat likviden
- ingen netting utan credit lineage
- ingen reject som behandlas som return eller vice versa
- ingen unmatched supplier refund till direkt intäkt eller kostnadsreduktion

## Fler bindande proof-ledger-regler för specialfall

### LPR-P0021 Residual after underpayment
- använd `LPR-P0002`
- residual skuld ligger kvar på `2440`, `2460`, `2470` eller `2445` enligt open-item class

### LPR-P0022 Bank detail change after proposal freeze
- ingen ledgerpost
- proposal måste supersedas och nytt approval receipt skapas

### LPR-P0023 Hold-based block
- ingen ledgerpost
- item status blir `on_hold`

### LPR-P0024 Duplicate execution receipt replay
- ingen ledgerpost
- receipt status blir `replayed_duplicate`

### LPR-P0025 Returned group supplier payment
- debet `1930`
- kredit `2460`

### LPR-P0026 Returned associated supplier payment
- debet `1930`
- kredit `2470`

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `LPR-P0001`: `ApOpenItem.openAmount = 0`, `status = settled`
- `LPR-P0002`: `ApOpenItem.openAmount` minskar proportionellt, `status = partially_settled`
- `LPR-P0003`: relevant `ApOpenItem` stangs, ny `SupplierAdvanceAsset` skapas
- `LPR-P0004`: ny `SupplierAdvanceAsset` skapas och blir `recognized`
- `LPR-P0005`: `SupplierAdvanceAsset` minskar, relevant `ApOpenItem.openAmount` minskar
- `LPR-P0006`: `SupplierAdvanceAsset` minskar eller stangs
- `LPR-P0007`: positivt och negativt open item minskar eller stangs utan bankrorelse
- `LPR-P0008`: ingen open-item-effekt
- `LPR-P0009` och `LPR-P0010`: `ApOpenItem` stangs eller minskar, FX-resultat registreras
- `LPR-P0011`: reskontra oforandrad, instruction `rejected`
- `LPR-P0012`: relevant `ApOpenItem.openAmount` återokas, status blir `returned` eller `reopened`
- `LPR-P0013`: ingen reskontraeffekt
- `LPR-P0014` och `LPR-P0015`: open item stangs på respektive liability class
- `LPR-P0016`: skuld flyttas till `disputed`, straight-through payment stoppas
- `LPR-P0017`: skuld flyttas tillbaka till ordinary payable
- `LPR-P0018`: open item och credit open item minskar eller stangs
- `LPR-P0019`: settlement får bara ske tillsammans med upstream AP/VAT recognition chain
- `LPR-P0020`: ingen reskontraeffekt, review case skapas

## Bindande verifikations-, serie- och exportregler

- booked supplier payment ska ha voucher series purpose `AP_PAYMENT`
- returned booked supplier payment ska ha voucher series purpose `AP_PAYMENT_RETURN`
- supplier advance ska ha voucher series purpose `AP_ADVANCE`
- advance application ska ha voucher series purpose `AP_ADVANCE_APPLY`
- dispute reclassification ska ha voucher series purpose `AP_RECLASS`
- bank fee booking ska ha voucher series purpose `AP_PAYMENT_FEE`
- netting utan ny huvudbok ska fortfarande ge immutable settlement receipt och exportable subledger evidence
- SIE4-export får inte utelamna `1684`, `2445`, `2460`, `2470`, `1930`, `3960`, `7960`, `6570` när de används av settlementkedjan

## Bindande variantmatris som måste korsas mot varje scenariofamilj

Varje scenariofamilj måste korsas mot minst:
- supplier class: `external`, `group`, `associate`
- accounting method: `invoice`, `cash`
- currency: `sek`, `foreign`
- execution result: `booked`, `rejected`, `returned`, `cancelled`
- evidence strength: `straight-through machine receipt`, `manual controlled receipt`, `blocked missing receipt`
- migration mode: `native`, `imported historical open item`, `imported exported-but-not-booked batch`

## Bindande fixture-klasser för leverantörsbetalnings- och leverantörsreskontraflödet

- `LPR-FXT-001` = SEK, one invoice, full payment, no fee
- `LPR-FXT-002` = SEK, one invoice, partial payment
- `LPR-FXT-003` = SEK, one invoice, overpayment
- `LPR-FXT-004` = SEK, advance then låter apply
- `LPR-FXT-005` = SEK, credit note netting
- `LPR-FXT-006` = SEK, returned payment after booking
- `LPR-FXT-007` = foreign currency, FX loss
- `LPR-FXT-008` = foreign currency, FX gain
- `LPR-FXT-009` = group supplier payable
- `LPR-FXT-010` = cash-method payment-side atomic handoff

## Bindande expected outcome-format per scenario

Varje scenario måste minst ange:
- `scenarioId`
- `fixtureClass`
- `supplierClass`
- `sourceOpenItemType`
- `accountingMethod`
- `railClass`
- `paymentOutcome`
- `expectedProofLedgerIds`
- `expectedJournalLines`
- `expectedApOpenItemState`
- `expectedSupplierAdvanceState`
- `expectedSIE4Accounts`
- `expectedBlockingRuleIfAny`
- `officialSourceRefs`

## Bindande canonical verifikationsseriepolicy

- `APBET` = ordinary supplier payments and FX settlements
- `APADV` = supplier advances and supplier advance refunds/applications
- `APRET` = returned booked supplier payments
- `APOMK` = dispute reclassifications and related reopening entries
- `APFEE` = bank fees tied to supplier payment chain

No-journal scenarios:
- rejects before booking
- cancelled or date-shifted before execution
- netting without ny huvudbok

## Bindande expected outcome per central scenariofamilj

- `LPR-A001`: `LPR-P0001`, journal `2440/1930`, `ApOpenItem.status = settled`
- `LPR-A004`: `LPR-P0003`, journal `2440/1684/1930`, payable closed + supplier receivable recognized
- `LPR-B001`: `LPR-P0004`, journal `1684/1930`, `SupplierAdvanceAsset.status = recognized`
- `LPR-B002`: `LPR-P0005`, journal `2440/1684`, advance reduced and invoice reduced
- `LPR-C001`: `LPR-P0007`, ingen ny huvudbok, positive and negative open items netted
- `LPR-D001`: `LPR-P0011`, ingen huvudbok, instruction `rejected`
- `LPR-D003`: `LPR-P0012`, journal `1930` mot relevant liability family, open item reopened
- `LPR-E001`: `LPR-P0016`, journal `2440/2445`, open item becomes disputed
- `LPR-E005`: `LPR-P0019`, upstream AP/VAT recognition plus settlement atomically
- `LPR-F001`: `LPR-P0009`, journal `2440/7960/1930`
- `LPR-F002`: `LPR-P0010`, journal `2440/1930/3960`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `LPR-A001` -> `LPR-P0001` -> `2440/1930` -> open item settled
- `LPR-A002` -> `LPR-P0002` -> `2440/1930` -> open item partial
- `LPR-A003` -> `LPR-P0002` -> multi-item settlement
- `LPR-A004` -> `LPR-P0003` -> `2440/1684/1930` -> supplier receivable created
- `LPR-A005` -> `LPR-P0002` -> residual payable remains
- `LPR-B001` -> `LPR-P0004` -> `1684/1930` -> advance recognized
- `LPR-B002` -> `LPR-P0005` -> `2440/1684` -> advance applied
- `LPR-B003` -> `LPR-P0006` -> `1930/1684` -> advance refunded
- `LPR-C001` -> `LPR-P0007` -> no new huvudbok -> full netting
- `LPR-C002` -> `LPR-P0018` -> no new huvudbok -> partial netting
- `LPR-C003` -> `LPR-P0018` -> payment reduction backed by credit
- `LPR-D001` -> `LPR-P0011` -> rejected pre-booking
- `LPR-D002` -> `LPR-P0013` -> cancelled or rescheduled pre-execution
- `LPR-D003` -> `LPR-P0012` -> reopened payable after return
- `LPR-D004` -> `LPR-P0024` -> duplicate replay no-op
- `LPR-D005` -> `LPR-P0008` -> `6570/1930` -> fee only
- `LPR-E001` -> `LPR-P0016` -> `2440/2445` -> disputed
- `LPR-E002` -> `LPR-P0017` + payment proof -> dispute released then paid
- `LPR-E003` -> `LPR-P0014` -> `2460/1930` -> group payable settled
- `LPR-E004` -> `LPR-P0015` -> `2470/1930` -> associate payable settled
- `LPR-E005` -> `LPR-P0019` -> cash-method atomic settlement
- `LPR-F001` -> `LPR-P0009` -> `2440/7960/1930` -> FX loss
- `LPR-F002` -> `LPR-P0010` -> `2440/1930/3960` -> FX gain
- `LPR-F003` -> `LPR-P0020` -> blocked -> no legal posting
- `LPR-F004` -> `LPR-P0022` -> blocked -> new proposal required
- `LPR-F005` -> `LPR-P0023` -> blocked -> no export or booking

## Bindande testkrav

- varje proof-ledger `LPR-P0001-LPR-P0026` ska ha minst ett positivt testfall
- alla blocked/no-journal-scenarier ska ha negativa testfall som bevisar att ingen ledgerpost skapas
- full, partial, overpayment, advance, credit netting, reject, return, dispute, FX gain och FX loss ska ha integrationstester
- duplicate execution receipt ska ha idempotencytest
- cancelled/date-changed payment före execution ska ha no-ledger-test
- cash-method handoff ska ha atomictest som failar om upstream AP/VAT recognition saknas
- migrated exported-but-not-booked batch ska ha cutover blockertest
- SIE4 export ska verifiera konton `1684`, `2440`, `2445`, `2460`, `2470`, `1930`, `3960`, `7960`, `6570` när de används

## Källor som styr dokumentet

- `https://www.bankgirot.se/globalassets/dokument/tekniska-manualer/leverantorsbetalningar_tekniskmanual_sv.pdf`
  - styr svenska leverantörsbetalningar via Bankgirot, inklusive paymentuppdrag, avdrag, kreditfaktura, status, återredovisning och returer
- `https://skatteverket.se/foretag/moms/saljavarorochtjanster/momslagensregleromfakturering.4.58d555751259e4d66168000403.html`
  - styr när fakturaunderlag krävs för momsavdrag på köpsidan; payment får inte hitta på upstream invoice truth
- `https://skatteverket.se/download/18.9567cda19bf6c0027216f6/1770379535285/bokforing-bokslut-och-deklaration-skv282utgava09.pdf`
  - styr bokslutsmetodens payment-side samband med leverantörsfaktura och moms
- `https://www.bas.se/wp-content/uploads/2025/01/Kontoplan-BAS-2025.pdf`
  - styr canonical BAS-kontofamiljer för leverantörsskulder, kortfristiga fordringar hos leverantörer, bank, bankavgifter och valutadifferenser
