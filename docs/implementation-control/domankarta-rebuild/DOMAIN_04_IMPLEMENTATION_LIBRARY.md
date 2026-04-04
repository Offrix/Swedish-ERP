# DOMAIN_04_IMPLEMENTATION_LIBRARY

Datum: 2026-04-02  
Domän: Accounts Receivable, Customer Billing, Revenue Flows

## mål

Detta dokument är targetmodellen för Domän 4. Det ska gå att bygga kundfakturering, kundreskontra, kundkrediter, refunds, dunning, HUS/project-bryggor och ÄR-evidence direkt från detta dokument utan att uppfinna egna mellanmodeller.

## bindande tvärdomänsunderlag

- `BAS_KONTOPOLICY_BINDANDE_SANNING.md` är overordnad canonical sanning för BAS-kontofamiljer, defaultkonton, control accounts och kontooverridegranser i denna domän.
- `MOMSRUTEKARTA_BINDANDE_SANNING.md` är overordnad canonical sanning för seller-side momsrutor, reverse-charge box mapping, replacement lineage och VAT-facing report truth i denna domän.
- `KUNDINBETALNINGAR_OCH_KUNDRESKONTRA_BINDANDE_SANNING.md` är overordnad canonical sanning för alla open-item-, incoming payment-, overpayment-, customer advance-, PSP-, factoring- och refundkedjor efter issue.
- `FAKTURAFLODET_BINDANDE_SANNING.md` är overordnad canonical sanning för hela issue-, reskontra-, kredit-, betalallokerings- och exportlogiken i denna domän.
- `PEPPOL_EDI_OCH_OFFENTLIG_EFAKTURA_BINDANDE_SANNING.md` är obligatorisk canonical source för utgående Peppol BIS Billing 3, offentlig e-faktura, endpoint binding, delivery receipts, outbound credit notes och blockerad PDF-fallback mot offentlig sektor.
- `OCR_REFERENSER_OCH_BETALFORMAT_BINDANDE_SANNING.md` är obligatorisk canonical source för OCR-referenser på kundfaktura, hard eller soft OCR-profil, variabel eller fast längd, checksiffra, customer-facing payment references och provider-bindning till incoming payment matching.
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` är overordnad canonical sanning för vouchers, serier, kontrollkonton, correction chains, period locks, opening balances och all legal ledger-truth i denna domän.
- `VERIFIKATIONSSERIER_OCH_BOKFORINGSPOLICY_BINDANDE_SANNING.md` är overordnad canonical sanning för verifikationsserier, voucher identity, reservationsluckor, owner-flow-serier, correction policy och SIE4-serieparitet i denna domän.
- `VALUTA_OMRAKNING_OCH_KURSDIFFERENS_BINDANDE_SANNING.md` är overordnad canonical sanning för redovisningsvaluta, invoice-date conversion, settlement-date FX, rounding och blocked missing rate lineage i denna domän.
- `LEGAL_REASON_CODES_OCH_SPECIALTEXTPOLICY_BINDANDE_SANNING.md` är overordnad canonical sanning för 0%-anledningar, undantag från momsplikt, reverse-charge-texter, EU/exportreferenser, HUS-grundorsaker och blockerad issuance utan legal basis i denna domän.
- Om Domän 4 och fakturabibeln krockar vinner fakturabibeln.

## Fas 4

### Delfas 4.1 Customer Masterdata Hardening

#### Vad som ska byggas

- ett canonical kundregister där juridisk identitet är separerad från visningsnummer
- ett aliaslager för importerade kundnycklar
- merge/split-historik som inte förstör fakturahistorik
- blockerflaggor för billing, delivery, collections, refund

#### Objekt

- `Customer`
- `CustomerPartyIdentity`
- `CustomerImportAlias`
- `CustomerContact`
- `CustomerMergeRecord`
- `CustomerStatusRecord`

#### State machines

- `CustomerStatus`: `active` -> `hold_billing` -> `hold_delivery` -> `credit_review` -> `closed`
- `CustomerMergeRecord`: `proposed` -> `approved` -> `executed` -> `rolled_back`

#### Commands

- `CreateCustomer`
- `ImportCustomerAlias`
- `MergeCustomers`
- `SplitMergedCustomer`
- `BlockCustomerForBilling`
- `BlockCustomerForDelivery`
- `SetCreditReviewStatus`

#### Events

- `CustomerCreated`
- `CustomerAliasBound`
- `CustomerMergeProposed`
- `CustomerMergeExecuted`
- `CustomerStatusChanged`
- `CustomerContactVerified`

#### Invariants

- ett bolag får inte ha två aktiva kundidentiteter med samma normaliserade organisationsnummer utan godkänd orsakskod
- `customerNo` är aldrig legal identitetsnyckel
- merge får aldrig skriva om historiska invoices, open items eller journals
- fakturerbar kund måste ha verifierad billing-kanal eller blockerflagga

#### Valideringar

- organisationsnummer, VAT-nummer och namn/adress normaliseras före dedupe
- kontaktroll måste vara styrd enum
- merge blockeras om två kunder har aktiva oförenliga identiteter utan manuell review

#### Routes / API-kontrakt

- `POST /v1/är/customers`
- `POST /v1/är/customers/import-aliases`
- `POST /v1/är/customers/:customerId/merge`
- `POST /v1/är/customers/:customerId/status`

#### Permissions / review-boundaries

- `company.manage` räcker inte för merge
- merge, split och blockerändring kräver `finance_admin` eller likvärdig roll
- merge kräver second-review när båda kunderna har issued invoices eller open items

#### Audit / evidence / receipt

- merge receipt måste bära gammal och ny identitet, actor, approver, impacted object counts och correlation id

#### Replay / recovery / dead-letter

- merge och split ska vara replaybara som append-only commands
- rollback av merge ska ske via explicit `SplitMergedCustomer`, inte via direkt mutation

#### Migration / cutover / rollback

- legacy customers importeras först till `CustomerImportAlias`
- dublettkluster måste lösas före go-live

#### Officiella regler och källor

- ingen extern lag styr dedupe exakt, men detta är nödvändig intern kontroll för att övriga svenska ÄR-regler ska bli rätt

#### Tester

- duplicate org-number blocked
- import alias remap preserves canonical customer
- merge preserves invoices/open items/journals

### Delfas 4.2 Quote / Contract / Billing-Trigger Hardening

#### Vad som ska byggas

- ett obligationslager som är enda auktoritativa källan för fakturering utöver explicit manuell ad hoc-fakturering

#### Objekt

- `BillingObligation`
- `BillingObligationLine`
- `BillingConsumption`
- `BillingSourceSnapshot`

#### State machines

- `BillingObligationLineStatus`: `planned` -> `partially_consumed` -> `consumed` -> `cancelled`

#### Commands

- `CreateBillingObligationFromQuote`
- `CreateBillingObligationFromContractPlan`
- `CreateBillingObligationFromProjectMilestone`
- `ConsumeBillingObligationLine`
- `CancelBillingObligationLine`

#### Events

- `BillingObligationCreated`
- `BillingObligationLineConsumed`
- `BillingObligationLinePartiallyConsumed`
- `BillingObligationCancelled`

#### Invariants

- varje issued invoice line måste peka på en consumption record eller explicit `manual_ad_hoc`
- samma obligation line får inte konsumeras två gånger
- residual kvantitet och residual belopp måste vara spårbara

#### Valideringar

- quote-version, contract-plan-version eller project-snapshot måste hashbindas
- simulation/readiness får aldrig konsumeras som legal-effect billing source

#### Routes / API-kontrakt

- `POST /v1/är/billing-obligations`
- `POST /v1/är/billing-obligations/:lineId/consume`
- `POST /v1/är/billing-obligations/:lineId/cancel`

#### Permissions / review-boundaries

- skapande från upstream-domäner sker systemiskt
- manuell `manual_ad_hoc` kräver approval med reason code

#### Audit / evidence / receipt

- varje consumption receipt ska bära source object id, source version hash, invoice id, amount, quantity och residual

#### Replay / recovery / dead-letter

- replay ska vara idempotent på consumption-key
- dead-letterad consumption får aldrig kunna skapa dubbel issue

#### Migration / cutover / rollback

- befintliga kontraktsplaner och accepted quotes måste migreras till obligationslager före liveaktivering

#### Officiella regler och källor

- intern kontrollmodell, men krävs för att svensk fakturering inte ska ge dubbel- eller underfakturering

#### Tester

- double consume blocked
- partial consume leaves residual
- invoice issue requires obligation or `manual_ad_hoc`

### Delfas 4.3 Invoice Timing / Content / Delivery Hardening

#### Vad som ska byggas

- en fakturamodell som skiljer mellan legala krav, kommersiella policykrav och distributionsbevis

#### Objekt

- `CustomerInvoice`
- `InvoiceLegalEvaluation`
- `InvoicePolicyEvaluation`
- `InvoiceDelivery`
- `InvoiceDeliveryEvidence`

#### State machines

- `InvoiceDeliveryStatus`: `not_prepared` -> `prepared` -> `dispatched` -> `provider_accepted` -> `receipt_confirmed` eller `failed`

#### Commands

- `CreateInvoiceDraft`
- `EvaluateInvoiceLegality`
- `EvaluateInvoicePolicy`
- `PrepareInvoiceDelivery`
- `RecordInvoiceDispatch`
- `RecordInvoiceDeliveryReceipt`

#### Events

- `InvoiceDraftCreated`
- `InvoiceLegalEvaluationCompleted`
- `InvoicePolicyEvaluationCompleted`
- `InvoiceDeliveryPrepared`
- `InvoiceDispatched`
- `InvoiceDeliveryFailed`
- `InvoiceReceiptConfirmed`

#### Invariants

- legal completeness och commercial completeness är separata statusdimensioner
- `due_date` får aldrig vara generellt lagkrav
- ändringsfaktura måste bära otvetydig referens till originalfaktura
- `delivered` får aldrig användas på prepare-only steg

#### Valideringar

- obligatoriska fakturauppgifter ska följa Skatteverkets faktureringsregler
- särskilda hänvisningar måste styras av legal scenario code
- vid svensk moms i utländsk valuta ska moms i SEK och kurskälla kunna visas

#### Routes / API-kontrakt

- `POST /v1/är/invoices`
- `POST /v1/är/invoices/:invoiceId/legal-evaluate`
- `POST /v1/är/invoices/:invoiceId/policy-evaluate`
- `POST /v1/är/invoices/:invoiceId/delivery/prepare`
- `POST /v1/är/invoices/:invoiceId/delivery/provider-events`

#### Permissions / review-boundaries

- draft/issue skiljs från delivery-dispatch
- manuell override av legal blocker kräver särskild approval och evidence

#### Audit / evidence / receipt

- varje dispatch och provideracceptans måste ge receipt med provider payload, dispatch id och signature-validation result när relevant

#### Replay / recovery / dead-letter

- provider events måste vara idempotenta på provider event id
- dead-letterade delivery events får inte sätta fakturan som levererad

#### Migration / cutover / rollback

- gamla invoices utan tillräckliga legala data måste märkas `policy_incomplete` eller `migration_review_required`

#### Officiella regler och källor

- Skatteverket `Momslagens regler om fakturering`

#### Tester

- full invoice legal completeness
- due date absent but policy incomplete
- reverse charge/export/HUS references enforced
- prepare-only delivery remains non-delivered

### Delfas 4.4 Invoice Series And Lifecycle Hardening

#### Vad som ska byggas

- en transaktionell issue-kedja där nummerreservation, issue, journal och open item sker atomiskt

#### Objekt

- `InvoiceSeries`
- `InvoiceNumberReservation`
- `InvoiceIssueRecord`
- `InvoiceStatusHistory`

#### State machines

- `InvoiceStatus`: `draft` -> `approved` -> `issued` -> `reversed` eller `cancelled`
- `ReceivableStatus`: `not_opened` -> `open` -> `partially_settled` -> `settled` -> `credited_partial` -> `credited_full` -> `written_off_partial` -> `written_off_full` -> `disputed`

#### Commands

- `ApproveInvoiceDraft`
- `IssueInvoice`
- `CancelInvoiceBeforeIssue`
- `ReverseIssuedInvoice`
- `MarkInvoiceDisputed`
- `ResolveInvoiceDispute`

#### Events

- `InvoiceApproved`
- `InvoiceNumberReserved`
- `InvoiceIssued`
- `InvoiceCancelled`
- `InvoiceReversed`
- `InvoiceDisputed`

#### Invariants

- fakturanummer tilldelas bara på issue
- nummer återanvänds aldrig
- invoice-, delivery-, receivable- och revenue-status är separata

#### Valideringar

- imported sequence reservation får inte kollidera
- replay måste vara idempotent på issue-key

#### Routes / API-kontrakt

- `POST /v1/är/invoices/:invoiceId/approve`
- `POST /v1/är/invoices/:invoiceId/issue`
- `POST /v1/är/invoices/:invoiceId/cancel`
- `POST /v1/är/invoices/:invoiceId/reverse`
- `POST /v1/är/invoices/:invoiceId/disputes`

#### Permissions / review-boundaries

- issue kräver finance-operativ roll
- reversal efter extern leverans kräver högre approvalklass

#### Audit / evidence / receipt

- statusbyten ska bära actor, approval chain, correlation id, reason code och impacted artifacts

#### Replay / recovery / dead-letter

- issue replay får aldrig skapa nytt nummer om samma issue-key redan finns

#### Migration / cutover / rollback

- imported history måste reservera sina nummer före native issue

#### Officiella regler och källor

- Skatteverket `Momslagens regler om fakturering` för krav på unikt löpnummer

#### Tester

- concurrent issue uniqueness
- replay-safe idempotency
- imported number collision detection

### Delfas 4.5 Credit-Note / Partial-Credit / Reversal Hardening

#### Vad som ska byggas

- en korrekt korrigeringsmodell för försäljning, kundfordran och moms

#### Objekt

- `CreditAdjustment`
- `CreditNote`
- `InvoiceReversal`
- `WriteoffReversal`

#### Commands

- `IssueCreditNote`
- `IssuePartialCredit`
- `ReverseIssuedInvoice`
- `ReverseWriteoff`

#### Events

- `CreditNoteIssued`
- `PartialCreditIssued`
- `InvoiceReversalIssued`
- `WriteoffReversed`

#### Invariants

- kredit av försäljning är separat från reglering av fordran
- kredit på betald faktura ska kunna skapa kundkredit eller refund exposure
- reversal sker via ny händelse, aldrig mutation av gammal faktura

#### Valideringar

- originalreferens måste vara otvetydig
- closed periods och VAT-effekter måste kontrolleras före reversal

#### Routes / API-kontrakt

- `POST /v1/är/invoices/:invoiceId/credit-notes`
- `POST /v1/är/invoices/:invoiceId/reverse`
- `POST /v1/är/writeoffs/:writeoffId/reverse`

#### Permissions / review-boundaries

- kredit över policygräns kräver second review
- writeoff reversal kräver finance + ledger approval

#### Audit / evidence / receipt

- correction receipt måste bära originalreferens, reason code, impacted revenue/VAT delta och residualeffekt

#### Replay / recovery / dead-letter

- correction commands måste vara idempotenta på correction key

#### Migration / cutover / rollback

- äldre manuella kreditjournaler måste mappas till nya correction objects där det går

#### Officiella regler och källor

- Skatteverket `Momslagens regler om fakturering`
- Skatteverket `Kundförluster – om kunden inte kan betala` där tvist/kundförlust skiljs från prisnedsättning

#### Tester

- credit after full payment
- partial credit after partial payment
- writeoff reversal with låter payment

### Delfas 4.6 Open-Item / Allocation / Prepayment / Overpayment / Refund Hardening

#### Vad som ska byggas

- en sanningsmodell där kundfordran, kundskuld, förskott, kundkredit och refundkedja är separata men kopplade objekt

#### Objekt

- `ArOpenItem`
- `ArAllocation`
- `CustomerPrepayment`
- `CustomerCreditBalance`
- `RefundRequest`
- `RefundExecution`
- `RefundReconciliation`

#### State machines

- `CustomerCreditStatus`: `available` -> `applied` -> `refund_pending` -> `refunded` eller `held_for_review`
- `RefundRequestStatus`: `requested` -> `approved` -> `executed` -> `reconciled` eller `cancelled`

#### Commands

- `CreateOpenItemAllocation`
- `CreateCustomerPrepayment`
- `CreateCustomerCreditFromOverpayment`
- `RequestRefund`
- `ApproveRefund`
- `ExecuteRefund`
- `ReconcileRefund`

#### Events

- `OpenItemAllocated`
- `OpenItemAllocationReversed`
- `CustomerPrepaymentCreated`
- `CustomerCreditCreated`
- `RefundRequested`
- `RefundApproved`
- `RefundExecuted`
- `RefundReconciled`

#### Invariants

- förskott kan uppstå utan open item
- överbetalning mot känd kund får inte gömmas i unmatched receipt
- refund måste peka på kundkredit eller verifierad felbetalning

#### Valideringar

- känd kund krävs för customer credit balance
- refund blockeras utan payout reference och approval chain

#### Routes / API-kontrakt

- `POST /v1/är/open-items/:openItemId/allocations`
- `POST /v1/är/customer-prepayments`
- `POST /v1/är/customer-credits/:creditId/refund-requests`
- `POST /v1/är/refund-requests/:refundRequestId/approve`
- `POST /v1/är/refund-requests/:refundRequestId/execute`

#### Permissions / review-boundaries

- refund execution kräver dual control eller motsvarande high-risk approval

#### Audit / evidence / receipt

- refund receipt måste bära bankrail reference, approval chain och reconciliation link

#### Replay / recovery / dead-letter

- allocation, credit och refund ska vara replaybara och idempotenta
- dead-letterade payout events får inte markera refund som executed

#### Migration / cutover / rollback

- legacy unmatched receipts med känd kund måste omklassificeras till customer credits före go-live

#### Officiella regler och källor

- Skatteverket `Momslagens regler om fakturering`

#### Tester

- prepayment before invoice
- overpayment becomes credit
- refund request/approval/execute/reconcile

### Delfas 4.7 Payment-Link / Matching / Unmatched-Receipt Hardening

#### Vad som ska byggas

- en settlementmodell där provider events och bank receipts skiljs från receivable truth

#### Objekt

- `InvoicePaymentLink`
- `PaymentLinkProviderEvent`
- `ArUnmatchedReceipt`
- `ReceiptMatchDecision`

#### Commands

- `CreateInvoicePaymentLink`
- `RegisterPaymentLinkProviderEvent`
- `RegisterBankReceipt`
- `RunReceiptMatching`
- `ApproveReceiptMatch`

#### Invariants

- payment link är betalinitiering, inte betalning
- aktiv unik länk per faktura och syfte måste upprätthållas i runtime
- unmatched receipt används bara när motparten verkligen är okänd eller matchningen är osäker

#### Valideringar

- provider callback måste vara verifierad
- settlement utan bank/provider receipt blockeras

#### Routes / API-kontrakt

- `POST /v1/är/invoices/:invoiceId/payment-links`
- `POST /v1/är/payment-links/provider-events`
- `POST /v1/är/bank-receipts`
- `POST /v1/är/receipt-matches/:matchId/approve`

#### Permissions / review-boundaries

- osäker match kräver operator review

#### Audit / evidence / receipt

- provider payload, callback-signatur och bank receipt ref måste sparas

#### Replay / recovery / dead-letter

- provider events och bank receipts måste vara idempotenta på externa ids

#### Migration / cutover / rollback

- existerande payment links migreras som initiationsmetadata, inte settlement truth

#### Officiella regler och källor

- officiell providerdokumentation för vald payment-link/provider

#### Tester

- callback without receipt does not settle
- active payment-link uniqueness
- ambiguous matching goes to review

### Delfas 4.8 Reminder-Fee / Late-Interest / Dunning / Aging Hardening

#### Vad som ska byggas

- en regelpacksstyrd charge-motor för dunning, avgifter, ränta och aging

#### Objekt

- `DunningRulePack`
- `DunningRun`
- `DunningCharge`
- `LateInterestCalculation`
- `AgingSnapshot`

#### Commands

- `RunDunningPreview`
- `RunDunningExecution`
- `GenerateLateInterestCharge`
- `GenerateLateCompensationCharge`
- `BuildAgingSnapshot`

#### Invariants

- påminnelseavgift kräver lag- och avtalsstöd
- referensränta måste vara effective-dated
- 450-kronorsersättning måste vara explicit B2B-charge, inte gömd i fri text

#### Valideringar

- disputed eller held items får inte dunnas automatiskt
- varje charge måste bära legal basis code och rulepack version

#### Routes / API-kontrakt

- `POST /v1/är/dunning-runs/preview`
- `POST /v1/är/dunning-runs`
- `GET /v1/är/aging-snapshots`

#### Permissions / review-boundaries

- live dunning execution kräver collections- eller finance-roll

#### Audit / evidence / receipt

- varje avgifts- eller räntepost måste bära calculation trace, reference-rate source och agreement evidence när avgift kräver avtal

#### Replay / recovery / dead-letter

- dunning runs ska vara idempotenta på cutoff + rulepack version

#### Migration / cutover / rollback

- äldre öppna avgifter måste migreras till explicita charge objects

#### Officiella regler och källor

- Riksdagen `Räntelag (1975:635)`
- Riksdagen `Lag (1981:739) om ersättning för inkassokostnader m.m.`
- Riksbanken `Referensräntan`

#### Tester

- reminder fee requires agreement
- reference-rate change across half-year
- B2B 450-kronorsersättning only when rules allow

### Delfas 4.9 Revenue / Ledger / VAT Bridge Hardening

#### Vad som ska byggas

- full ledger- och VAT-brygga för alla ÄR-händelser

#### Objekt

- `ArJournalProjection`
- `VatDecisionLink`
- `RevenueRecognitionRecord`
- `BadDebtReliefRecord`
- `BadDebtRecoveryRecord`

#### Commands

- `PostInvoiceIssue`
- `PostPaymentSettlement`
- `PostPrepaymentReceipt`
- `PostCreditAdjustment`
- `PostRefund`
- `PostBadDebtRelief`
- `PostBadDebtRecovery`

#### Invariants

- varje ÄR-händelse har definierad ledger- och VAT-effekt eller explicit `not_applicable`
- account mapping är extern och versionsstyrd
- legal scenario code styr VAT-bridge, inte substrings i VAT-kod

#### Valideringar

- konto måste finnas i account mapping profile
- SEK-momsbelopp måste kunna visas när moms redovisas i Sverige

#### Routes / API-kontrakt

- inga UI- eller ad hoc-rutter ska få skapa bokföring utanför dessa commands

#### Permissions / review-boundaries

- high-risk manual overrides kräver ledger review

#### Audit / evidence / receipt

- varje posting receipt ska bära journal id, account mapping profile id, VAT rulepack version och source event id

#### Replay / recovery / dead-letter

- postingreplay måste vara idempotent på source event id

#### Migration / cutover / rollback

- gamla hårdkodade kontoflöden måste migreras till mappingprofiler

#### Officiella regler och källor

- Skatteverket `Momslagens regler om fakturering`
- Skatteverket `Kundförluster – om kunden inte kan betala`

#### Tester

- prepayment VAT
- bad debt relief and låter recovery
- refund ledger/VAT tie-out

### Delfas 4.10 Project / Field / HUS Invoice Bridge Hardening

#### Vad som ska byggas

- first-class broar mellan ÄR och upstream-domäner som påverkar kundfordran

#### Objekt

- `ProjectBillingObligation`
- `FieldBillingObligation`
- `HusInvoiceGate`
- `HusArBridgeEvent`
- `HusCustomerShareExposure`

#### Commands

- `CreateProjectBillingObligation`
- `CreateFieldBillingObligation`
- `ValidateHusInvoiceGateForArIssue`
- `RecordHusCustomerPaymentToAr`
- `RecordHusCreditAdjustmentToAr`

#### Invariants

- HUS-tagad faktura får inte issue:as utan passerad HUS gate
- HUS customer payment får inte stanna i HUS-domänen utan ÄR-exponering
- project/field readiness får inte tolkas som legal-effect billing source

#### Routes / API-kontrakt

- `POST /v1/projects/billing-obligations`
- `POST /v1/field/billing-obligations`
- `POST /v1/hus/cases/:husCaseId/är-payment-events`
- `POST /v1/hus/cases/:husCaseId/är-credit-events`

#### Permissions / review-boundaries

- HUS- och project-bridge events är systemiska, men manuella overrides kräver finance- och domain-review

#### Audit / evidence / receipt

- varje bridge event ska bära source domain id, version hash, target ÄR object och residualeffekt

#### Replay / recovery / dead-letter

- bridge events måste vara idempotenta på upstream event id

#### Migration / cutover / rollback

- existerande HUS-fall med kundbetalningar måste mappas till ÄR exposure före go-live

#### Officiella regler och källor

- HUS-regler verifieras i egen domän, men ÄR-kopplingen måste vara intern sanningskedja

#### Tester

- HUS gate blocks issue
- HUS customer payment updates ÄR
- project obligation consumed once

### Delfas 4.11 Export / Evidence Hardening

#### Vad som ska byggas

- deterministiska ÄR-artifacts för revision, migration, support, inkasso och parallel run

#### Objekt

- `ArCutoffExport`
- `ArEvidencePackage`
- `ArTieOutArtifact`
- `ArParallelRunDiffArtifact`

#### Commands

- `BuildArCutoffExport`
- `BuildArEvidencePackage`
- `BuildArTieOutArtifact`
- `BuildArParallelRunDiff`

#### Invariants

- samma cutoff och samma scope ska alltid ge samma hash
- exports får aldrig läsa från icke-auktoritativa mellanlager när canonical ÄR finns

#### Valideringar

- included ids, cutoff timestamp och rulepack/account mapping versions måste vara låsta

#### Routes / API-kontrakt

- `POST /v1/är/exports/cutoff`
- `POST /v1/är/exports/evidence-packages`
- `POST /v1/är/exports/parallel-run-diffs`

#### Permissions / review-boundaries

- support exports ska vara maskade
- revisions- och cutoverexports kräver finance/auditor-behörighet

#### Audit / evidence / receipt

- varje artifact ska bära scope-hash, included ids, actor, generatedAt och tie-out-resultat

#### Replay / recovery / dead-letter

- exportjobb ska vara replaybara och ge samma hash för samma scope

#### Migration / cutover / rollback

- exportpaket används som cutoff-bevis och rollback-verifikation under cutover

#### Officiella regler och källor

- inga särskilda externa källor utöver att artifacts måste kunna bära svensk revisions- och bokföringsbevisning

#### Tester

- deterministic export hash
- export/import round-trip
- parallel-run diff pinpoints exact deviation

## Vilka bevis som krävs innan något märks som reskontramässigt korrekt eller production-ready

- repository-grade ÄR truth finns
- issue, payment, credit, prepayment, overpayment, refund, writeoff och recovery har verkliga runtime paths
- ledger/VAT tie-out är noll mot ÄR cutoff
- dunning/ränta/avgifter bygger på effective-dated rulepacks
- HUS/project/field skapar inte shadow receivable truth
- export/evidence packages kan återgenereras med samma hash

## Vilka risker som kräver mänsklig flaggning

- merge av kunder med öppna poster eller issued invoices
- reversal över stängd period
- refund till konto som inte kan kopplas till ursprunglig betalning
- HUS-kredit eller myndighetsutfall som ändrar kundandel efter tidigare betalning
- imported sequence collision eller serienummergap utan orsakskod
- tvist, kundförlust och prisnedsättning som riskerar att blandas ihop
