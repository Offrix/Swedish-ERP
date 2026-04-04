# LÖNEUTBETALNING_OCH_BANKRETURER_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för löneutbetalning, payout readiness, payout dispatch, settlement confirmation och bankreturer för lön.

Detta dokument ska styra:
- skapande av löneutbetalningsbatch
- provider- eller railspecifik dispatch
- skillnaden mellan `prepared`, `submitted`, `settled` och `returned`
- partial success i batch
- bankretur på individniva
- återöppning av löneansvar när lön inte faktiskt kommit fram

## Syfte

Detta dokument finns för att:
- en skapad lonfil aldrig ska likställas med betald lön
- bankreturer aldrig ska forsvinna som odefinierade bankposter
- pay run, cash liability och bankhändelser alltid ska kunna stamma exakt
- misslyckad eller returnerad lön ska ge riktig liability- eller incident-effekt

## Omfattning

Detta dokument omfattar:
- payout-batch för lön
- dispatch till bank/provider
- settlement confirmation
- batch rejection
- individual payment return
- reopening av employee cash liability vid return

Detta dokument omfattar inte:
- beräkning av nettolön
- employee receivable som uppstår av annan anledning an faktisk bankretur
- generell bankimport utanför payrollkontext
- provideruppsattning utan verklig extern atkomst

## Absoluta principer

- pay run får aldrig markeras `paid` bara för att fil skapats
- settlement av lön får bara ske när bank/provider-receipt visar verkligt utfall
- bankretur måste skapa eget `PayrollBankReturnCase`
- returnerad lön ska som default återöppna skuld till anställd, inte skapa receivable
- payout flow får aldrig bygga på generisk CSV i live mode
- provider- och railspecifik sanning får aldrig ersättas av demo eller fake-live

## Bindande dokumenthierarki för löneutbetalning och bankreturer

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- `DOMAIN_10_ROADMAP.md`
- `DOMAIN_10_IMPLEMENTATION_LIBRARY.md`
- detta dokument

Detta dokument lutar på:
- `LONEFLODET_BINDANDE_SANNING.md`
- `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md`
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md`
- Bankgirots tekniska dokumentation för Löner

## Kanoniska objekt

- `PayrollPayoutBatch`
- `PayrollPayoutInstruction`
- `PayrollPayoutDispatchReceipt`
- `PayrollSettlementReceipt`
- `PayrollBankReturnCase`
- `PayrollReturnReopenDecision`
- `PayrollPayoutBlocker`

## Kanoniska state machines

### `PayrollPayoutBatch`

- `draft`
- `prepared`
- `submitted`
- `partially_settled`
- `settled`
- `rejected`
- `returned`
- `blocked`

### `PayrollPayoutInstruction`

- `ready`
- `submitted`
- `settled`
- `returned`
- `failed`

### `PayrollBankReturnCase`

- `open`
- `review_pending`
- `liability_reopened`
- `reissued`
- `closed`
- `blocked`

## Kanoniska commands

- `CreatePayrollPayoutBatch`
- `SubmitPayrollPayoutBatch`
- `RegisterPayrollDispatchReceipt`
- `RegisterPayrollSettlementReceipt`
- `RegisterPayrollBankReturn`
- `ReopenPayrollLiabilityAfterReturn`
- `BlockPayrollPayoutBatch`

## Kanoniska events

- `PayrollPayoutBatchCreated`
- `PayrollPayoutBatchSubmitted`
- `PayrollDispatchReceiptRegistered`
- `PayrollSettlementReceiptRegistered`
- `PayrollBankReturnRegistered`
- `PayrollLiabilityReopenedAfterReturn`
- `PayrollPayoutBatchBlocked`

## Kanoniska route-familjer

- `POST /v1/payroll/payout-batches`
- `POST /v1/payroll/payout-batches/{id}/submit`
- `POST /v1/payroll/payout-batches/{id}/dispatch-receipts`
- `POST /v1/payroll/payout-batches/{id}/settlement-receipts`
- `POST /v1/payroll/bank-returns`

## Kanoniska permissions och review boundaries

- endast payment-approver med step-up får submitta live payroll payout
- bank return reopening kraver four-eyes om flera anställda paverkas
- support får inte markera lön som betald utan settlement receipt

## Nummer-, serie-, referens- och identitetsregler

- varje batch ska ha unikt `payrollPayoutBatchId`
- varje instruction ska ha unikt `instructionId`
- varje return case ska peka på exakt instruction
- provider receipt references ska sparas oforandrade

## Valuta-, avrundnings- och omräkningsregler

- löneutbetalning i denna produkt ska defaulta till SEK
- utbetalningsbelopp per instruction ska matcha godkänd nettopayout exakt
- payoutfil får inte avrunda bort oren som ingar i nettopayout

## Replay-, correction-, recovery- och cutover-regler

- replay av payout batch får inte skicka om utan explicit idempotency-guard
- bankretur ska vara replaybar från original instruction och return receipt
- migration av historiska payroll payouts ska skilja på `settled`, `failed` och `returned`
- batch rejection får inte skapa fejkad settlement history

## Huvudflödet

1. pay run blir payout-ready
2. canonical payout batch skapas
3. batch dispatchas till bank/provider
4. dispatch receipt registreras
5. settlement receipt registreras
6. instruktioner markeras `settled`
7. eventuell bankretur öppnar `PayrollBankReturnCase`
8. skuld till anställd återöppnas eller reissue-process startas

## Bindande scenarioaxlar

- payout rail: `bankgiro_loner`, `other_verified_payroll_rail`
- batch outcome: `rejected`, `submitted`, `partially_settled`, `settled`
- instruction outcome: `settled`, `returned`, `failed`
- return reason class: `invalid_account`, `closed_account`, `technical_reject`, `other_verified_reason`
- recovery path: `reopen_liability`, `reissue`, `blocked`

## Bindande policykartor

- payroll cash liability account: `2821`
- bank cash account: `1930`
- paid state without settlement receipt: `forbidden`
- returned salary default: `reopen_liability`
- generic live CSV payout: `forbidden`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

### PAYOUT-P0001 Settled payroll payout instruction

- debit `2821`
- credit `1930`
- instructionState: `settled`

### PAYOUT-P0002 Batch rejected before settlement

- payrollEffect: `no_settlement_posting`
- batchState: `rejected`

### PAYOUT-P0003 Returned salary payment after prior settlement

- debit `1930`
- credit `2821`
- instructionState: `returned`
- defaultResolution: `reopen_employee_liability`

### PAYOUT-P0004 Partial batch settlement

- payrollEffect: `per_instruction_truth`
- batchState: `partially_settled`

### PAYOUT-P0005 Unsupported live payout rail blocked

- payoutEffect: `blocked`
- blockCode: `unsupported_live_payroll_rail`

## Bindande rapport-, export- och myndighetsmappning

- payslip payout status ska skilja på `prepared`, `submitted`, `settled` och `returned`
- bankmatchning ska ske per instruction när railen medger det
- payout receipts ska bevaras som audit artifacts

## Bindande scenariofamilj till proof-ledger och rapportspar

- `PAYOUT-A001 settled_batch_instruction -> PAYOUT-P0001 -> paid`
- `PAYOUT-A002 rejected_batch -> PAYOUT-P0002 -> not_paid`
- `PAYOUT-A003 partial_batch -> PAYOUT-P0004 -> mixed`
- `PAYOUT-B001 returned_instruction_after_settlement -> PAYOUT-P0003 -> liability_reopened`
- `PAYOUT-Z001 unsupported_live_rail -> PAYOUT-P0005 -> blocked`

## Tvingande dokument- eller indataregler

- `payRunId`
- `batchId`
- `instructionId`
- `employeeId`
- `netAmount`
- `dispatchReceiptRef`
- `settlementReceiptRef`
- `returnReceiptRef`
- `railType`

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `PAYOUT-R001 batch_submitted_not_paid_yet`
- `PAYOUT-R002 instruction_settled`
- `PAYOUT-R003 instruction_returned_liability_reopened`
- `PAYOUT-R004 batch_rejected_no_settlement`
- `PAYOUT-R005 unsupported_live_rail_block`

## Bindande faltspec eller inputspec per profil

- `payrollPayoutBatchId`
- `railType`
- `providerConnectionRef`
- `instructionCount`
- `dispatchSubmittedAt`
- `dispatchReceiptRef`
- `settlementReceiptRef`
- `returnReceiptRef`
- `status`

## Scenariofamiljer som hela systemet måste tacka

- batch skapad men inte skickad
- batch skickad men inte settled
- batch rejected
- settled instruction
- partial batch settlement
- individual bank return
- reissue efter return
- unsupported live rail

## Scenarioregler per familj

- `PAYOUT-A001`: settled instruction ska debitera `2821` och kreditera `1930`
- `PAYOUT-A002`: rejected batch ska inte skapa settlement posting
- `PAYOUT-A003`: partial batch ska skapa sanningsstatus per instruction
- `PAYOUT-B001`: returned instruction efter settlement ska återöppna skuld till anställd genom `PAYOUT-P0003`
- `PAYOUT-Z001`: unsupported live rail ska blockeras innan submit

## Blockerande valideringar

- deny submit om rail inte är verifierad live rail
- deny paid-state utan settlement receipt
- deny batch-level green om nagon instruction är `returned` eller `failed`
- deny silent reissue utan öppet return case

## Rapport- och exportkonsekvenser

- payroll cockpit ska visa payout status på instruction-nivå
- bankflödet ska kunna mata tillbaka returned salary payments till payroll
- support/reporting ska kunna lista öppna bankreturer separat från öppna receivables

## Förbjudna förenklingar

- ingen `paid=true` vid filskapande
- ingen antagen settlement på hel batch när endast dispatch receipt finns
- ingen bankretur som manuell diff i bankavstämning
- ingen auto-omklassning till receivable utan explicit regel

## Fler bindande proof-ledger-regler för specialfall

- partial batch ska aldrig ge batchgrön status om en instruction returnerats
- returned salary payment får inte skriva om original pay run; den ska skapa separat return case och liability reopen decision
- batch rejection före settlement får inte skapa debit på `2821`

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `PAYOUT-P0001` stanger employee cash liability för instruction
- `PAYOUT-P0003` återöppnar employee cash liability
- `PAYOUT-P0002` behaller liability öppen
- `PAYOUT-P0005` skapar blockerfall utan dispatch

## Bindande verifikations-, serie- och exportregler

- settlement ska journaliseras i bank/payment settlement series
- liability reopen efter return ska journaliseras i samma bank-return-linked series eller canonical correction series enligt bankflödets policy
- varje payout receipt och return receipt ska kunna traced till instruction-id

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- bankgiro vs other verified rail
- settled vs rejected vs returned
- full batch vs partial batch
- ordinary payout vs final pay payout

## Bindande fixture-klasser för löneutbetalning och bankreturer

- `PAYOUT-FXT-001` settled full payroll batch
- `PAYOUT-FXT-002` rejected batch before settlement
- `PAYOUT-FXT-003` partial batch with one returned instruction
- `PAYOUT-FXT-004` single returned salary payment after prior settlement
- `PAYOUT-FXT-005` unsupported rail attempt

## Bindande expected outcome-format per scenario

- `scenarioId`
- `fixtureClass`
- `expectedProofLedger`
- `expectedPayoutState`
- `expectedLiabilityEffect`
- `expectedBlockedOrAllowedStatus`

## Bindande canonical verifikationsseriepolicy

- payroll posting series får inte markera lön som utbetald
- faktisk utbetalning och bankretur ska aga i payout/bank settlement series

## Bindande expected outcome per central scenariofamilj

### `PAYOUT-A001`

- fixture minimum: `PAYOUT-FXT-001`
- expected proof-ledger: `PAYOUT-P0001`
- expected payout state: `settled`
- expected status: `allowed`

### `PAYOUT-B001`

- fixture minimum: `PAYOUT-FXT-004`
- expected proof-ledger: `PAYOUT-P0003`
- expected payout state: `returned`
- expected liability effect: `reopened`

### `PAYOUT-Z001`

- fixture minimum: `PAYOUT-FXT-005`
- expected proof-ledger: `PAYOUT-P0005`
- expected status: `blocked`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `PAYOUT-A001 -> PAYOUT-P0001 -> allowed`
- `PAYOUT-A002 -> PAYOUT-P0002 -> allowed_not_paid`
- `PAYOUT-A003 -> PAYOUT-P0004 -> mixed`
- `PAYOUT-B001 -> PAYOUT-P0003 -> reopened`
- `PAYOUT-Z001 -> PAYOUT-P0005 -> blocked`

## Bindande testkrav

- unit tests för no `paid` status on created batch
- unit tests för `2821 -> 1930` only on settlement
- unit tests för `1930 -> 2821` on returned salary payment
- unit tests för partial batch per-instruction truth
- integration tests för payout receipt -> settlement -> return trace
- integration tests blocking unsupported live rail

## Källor som styr dokumentet

- [Bankgirot: Teknisk information](https://www.bankgirot.se/kundservice/teknisk-dokumentation/)
- [Bankgirot: Löner - Teknisk manual](https://www.bankgirot.se/globalassets/dokument/tekniska-manualer/lon_tekniskmanual_sv.pdf)
- [Bankgirot: Frågor och svar](https://www.bankgirot.se/kundservice/vanliga-fragor/)
- [BANKFLÖDET_OCH_BANKAVSTÄMNING_BINDANDE_SANNING.md](C:/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/domankarta-rebuild/BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md)
