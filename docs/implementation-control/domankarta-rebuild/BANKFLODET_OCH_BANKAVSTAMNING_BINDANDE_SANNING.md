# BANKFLÖDET_OCH_BANKAVSTÄMNING_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för hela bankflödet och bankavstämningen.

Detta dokument ska styra:
- bankkonton och bankprofilers canonical truth
- statement ingest, statement line identity och balance snapshots
- booking date, value date och effective date i banknaraliga kedjor
- bank line classification, owner binding och bank-owned posting decisions
- bankavstämning, unmatched lines, duplicate replay och correction chains
- bank fees, ränteintäkter, räntekostnader och interna banköverföringar
- bindning mellan bankrad och owner flow för ÄR, AP, PSP, skattekonto och ändra downstreamdomäner
- reporting, SIE4, activity och audit för banknara legal effect

Ingen kod, inget test, ingen route, ingen provideradapter, ingen bankfeed, ingen statementimport, ingen replaykedja och ingen cockpitvy får definiera avvikande truth för bankflödet utan att detta dokument skrivs om först.

## Syfte

Detta dokument finns för att läsaren ska kunna bygga hela bankkarnan utan att gissa:
- vad som är ett bankkonto och vad som är ett bankfeedkonto
- hur statement lines identifieras deterministiskt
- när en bankline bara ska bindas till ÄR eller AP och när den ska skapa egen bokföring
- hur booking date och value date ska skiljas at
- hur fees, interest och interna överföringar ska bokföras
- hur duplicates, intraday feeds, corrections och reversed lines ska stoppas eller hanteras
- hur bankavstämningen ska kunna återspelas utan dubbel legal effect

## Omfattning

Detta dokument omfattar:
- svenska och ändra bankkonton i bolagets namn
- bankkonto-masterdata och bankprofilkopplingar
- statement ingest via fil, provider-API, Bankgiro redovisning, ISO 20022 camt och manual-controlled import
- line-level identity, duplicate detection och balance snapshots
- bank-owned postings för fees, interest och interna överföringar
- owner binding mot ÄR, AP, PSP, skattekonto och blocked review
- unmatched lines, ambiguous lines, duplicate lines och replay
- statement-driven avstämning mot huvudbok och subledger
- cutover och migration av bankhistorik

Detta dokument omfattar inte:
- ÄR-side legal effect för customer allocation
- AP-side legal effect för supplier settlement
- skattekontots egen legal truth
- payment file creation för supplier settlement
- OCR/AI dokumentklassning
- lön eller payrollutbetalningar som legal owner

Kanonisk agarskapsregel:
- `KUNDINBETALNINGAR_OCH_KUNDRESKONTRA_BINDANDE_SANNING.md` äger ÄR-side legal effect när en bankrad avser kundbetalning, överbetalning, refund, PSP eller factoring
- `LEVERANTORSBETALNINGAR_OCH_LEVERANTORSRESKONTRA_BINDANDE_SANNING.md` äger AP-side legal effect när en bankrad avser supplier payment, supplier return, supplier advance eller supplier refund
- `SKATTEKONTOFLODET_BINDANDE_SANNING.md` ska aga legal truth för skattekontot
- detta dokument äger bankradens tekniska identitet, bankkonto- och statement-truth, bank-owned standalone postings och owner binding/reconciliation

## Absoluta principer

- statement import får aldrig i sig skapa legal bokföring utan explicit owner binding eller bank-owned posting decision
- booking date och value date får aldrig blandas ihop eller skrivas över
- samma bankline får aldrig kunna skapa mer an en legal booking chain
- intraday eller not-booked notifications får aldrig behandlas som slutligt bokförd bankstatement utan explicit policy
- unmatched extern bankline får aldrig auto-postas till generiskt konto
- fee, interest och internal transfer får aldrig dorras igenom som owner lines för ÄR eller AP
- owner binding får aldrig ga enbart på fri text om annan strukturerad data motsager bindningen
- bankkontoidentitet får aldrig leva i UI eller i las text; den ska vara first-class domain truth
- duplicate statement imports och duplicate statement lines får aldrig ge dubbel legal effect
- bankavstämning får aldrig se grön ut om en line fortfarande är unmatched eller owner-binding saknas
- tax account och bank account får aldrig sammanblandas bara för att bada innehåller skatte- eller avgiftsbetalningar

## Bindande dokumenthierarki för bankflödet och bankavstämningen

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- detta dokument

Detta dokument lutar på:
- `KUNDINBETALNINGAR_OCH_KUNDRESKONTRA_BINDANDE_SANNING.md` för ÄR-side settlement truth
- `LEVERANTORSBETALNINGAR_OCH_LEVERANTORSRESKONTRA_BINDANDE_SANNING.md` för AP-side settlement truth
- `SKATTEKONTOFLODET_BINDANDE_SANNING.md` för tax account legal effect, `1630`-mirror, refunds, ränta, anstånd, utbetalningsspärr och authority receipts
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` för vouchers, serier, kontrollkonton, correction chains, period locks och SIE4-vouchertruth för bank-owned posting och owner-bound legal effect
- `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md` endast där upstream artifacts eller remittance-underlag passerar genom scanning

Detta dokument får inte overstyras av:
- gamla bank sync runbooks
- gamla open banking-antäganden
- gamla `mark as reconciled`-genvagar
- gamla custom statement-format som låter sig utges för Bankgiro eller ISO 20022

## Kanoniska objekt

- `BankAccountMaster`
  - bar juridisk och operativ truth för bolagets bankkonto
  - innehåller account family, legal owner, bank account identifier, currency, activation state, statement source profiles och allowed owner bindings

- `BankConnectionProfile`
  - bar runtime truth för hur bankinformation hamtas eller tas emot
  - innehåller source class, provider identity, capability class, auth posture och statement format profile

- `BankStatementImport`
  - bar immutable ingest receipt för en statementfil eller providerpayload
  - innehåller artifact hash, source profile, import period, import timestamp och duplicate verdict

- `BankStatementLine`
  - bar line-level truth för bokad eller notifierad bankhandelse
  - innehåller line identity, amount, direction, booking date, value date, remittance data, source account, counterparty hints, owner binding och raw refs

- `BankBalanceSnapshot`
  - bar ingående och utgående balances per statement scope eller point-in-time payload

- `BankOwnerBindingDecision`
  - bar bindande beslut om att bankline tillhor ÄR, AP, tax, bank-owned posting eller blocked review

- `BankStandalonePostingDecision`
  - bar beslut att bankline ska skapa egen huvudboksbokning i bankflödet
  - gäller endast fees, interest, internal transfer, bank correction eller annan uttryckligen bank-owned familj

- `BankReconciliationCase`
  - bar mismatch, ambiguity, duplicate, missing owner binding eller balance drift

- `InternalTransferDecision`
  - bar bindande pairing mellan två banklines som är samma legala bolags interna överföring

## Kanoniska state machines

### `BankConnectionProfile`
- `draft`
- `verified`
- `restricted`
- `blocked`
- `retired`

### `BankStatementImport`
- `received`
- `parsed`
- `deduplicated`
- `accepted`
- `partially_blocked`
- `rejected`

### `BankStatementLine`
- `ingested`
- `classified`
- `owner_bound`
- `standalone_booked`
- `reconciled`
- `blocked`
- `duplicate_replayed`
- `superseded`

### `BankOwnerBindingDecision`
- `pending`
- `bound_to_ar`
- `bound_to_ap`
- `bound_to_tax`
- `bound_to_bank_owned`
- `blocked`

### `BankReconciliationCase`
- `open`
- `investigating`
- `resolved`
- `waived`
- `reopened`

## Kanoniska commands

- `RegisterBankAccount`
- `VerifyBankConnectionProfile`
- `IngestBankStatementImport`
- `ClassifyBankStatementLine`
- `BindBankLineToOwner`
- `CreateBankStandalonePostingDecision`
- `BookBankStandaloneLine`
- `CreateInternalTransferDecision`
- `ResolveInternalTransferDecision`
- `OpenBankReconciliationCase`
- `ResolveBankReconciliationCase`
- `ReplayBankStatementImport`
- `SupersedeBankStatementLine`

## Kanoniska events

- `bank.account.registered`
- `bank.connection.verified`
- `bank.statement.imported`
- `bank.statement.import.duplicate_detected`
- `bank.line.classified`
- `bank.line.owner_bound`
- `bank.line.standalone_booked`
- `bank.line.reconciled`
- `bank.line.duplicate_replayed`
- `bank.reconciliation.opened`
- `bank.reconciliation.resolved`
- `bank.internal_transfer.bound`

## Kanoniska route-familjer

Canonical route family för bankflödet ska vara:
- `/v1/bank/accounts/*`
- `/v1/bank/connections/*`
- `/v1/bank/statements/*`
- `/v1/bank/lines/*`
- `/v1/bank/reconciliation/*`
- `/v1/bank/internal-transfers/*`
- `/v1/bank/standalone-postings/*`

Följande routefamiljer får aldrig skriva legal truth i detta flöde:
- rena `/v1/ui/*`-routes
- rena `/v1/search/*`- eller workbench-read-model-routes
- generiska import routes utan statement source profile

## Kanoniska permissions och review boundaries

- `bank_account.manage`
- `bank_connection.verify`
- `bank_statement.import`
- `bank_line.bind_owner`
- `bank_line.book_standalone`
- `bank_reconciliation.resolve`
- `bank_internal_transfer.approve`
- `bank_audit.read`

Hårda review boundaries:
- samma person får inte verifiera bankconnection, binda owner på high-risk line och godkänna standalone booking i samma kedja
- internal transfer pairing med saknad motrad kraver review
- blocked unmatched external lines får inte bokas utan explicit standalone policy eller owner binding
- change av bank account profile eller source class efter verifiering kraver ny verification chain

## Nummer-, serie-, referens- och identitetsregler

- `bankStatementImportId`, `bankLineId`, `bankReconciliationCaseId` och `internalTransferDecisionId` måste vara globalt unika
- line identity måste minst bygga på: source account id, source class, statement or report id, line sequence or entry ref, amount, currency, booking date och debit/credit direction
- `bookingDate`, `valueDate`, `entryReference`, `statementReference`, `remittanceReference`, `OCR`, `EndToEndId` och `bankTransactionCode` måste vara first-class när källsystemet levererar dem
- samma line identity får aldrig re-hashas på ett satt som forlorar original source lineage

## Valuta-, avrundnings- och omräkningsregler

- huvudbok ska alltid bara SEK
- bankkonto i annan valuta måste bevara original amount och currency på line level
- booking date styr legal booking för bank-owned posting lines
- value date måste bevaras separat och får användas av liquidity-, cut-off- och interestlogik men får aldrig ersätta booking date tyst
- foreign-currency lines får aldrig auto-postas till FX gain/loss utan explicit owner binding eller bank-owned decision

## Replay-, correction-, recovery- och cutover-regler

- samma statement artifact hash och source profile får aldrig ge mer an en accepted import chain
- replay av samma bankline identity ska ge `duplicate_replayed` och ingen ny legal effect
- correction line eller reversal line ska skapa ny lineage, aldrig overwrite av tidigare bankline
- migration måste bevara original bankline identity, booking/value dates, source statement refs och reconciliation outcome
- imported historical statement line får aldrig låter se ut som live-received line utan explicit provenance flag

## Huvudflödet

1. bankkonto och bankconnection verifieras mot canonical source class
2. statement eller notification importeras som immutable artifact
3. lines normaliseras och får canonical identity
4. duplicate detection kor
5. varje line klassas till owner family eller bank-owned posting family
6. owner-bound line skickas till ÄR, AP, tax eller blocked review
7. bank-owned line bokas enligt canonical proof-ledger
8. reconciliation case stangs först när line har owner binding eller standalone booking och bankkonto/balance matchar

## Bindande scenarioaxlar

Varje scenario i detta dokument måste korsas mot minst dessa axlar:
- source class:
  - `bankgiro_inbetalningar`
  - `leverantorsbetalningar_return_feed`
  - `camt052_intraday`
  - `camt053_booked_statement`
  - `camt054_notification`
  - `open_banking_transactions_api`
  - `manual_controlled_statement`
- line owner class:
  - `ar`
  - `ap`
  - `tax`
  - `bank_owned`
  - `blocked`
- line family:
  - `customer_incoming`
  - `supplier_outgoing`
  - `supplier_return`
  - `bank_fee`
  - `interest_income`
  - `interest_expense`
  - `internal_transfer`
  - `unknown_external`
- timing class:
  - `booked`
  - `intraday_only`
  - `returned_after_booking`
  - `reversal_correction`
- currency class:
  - `sek`
  - `foreign`

## Bindande policykartor

### BNK-POL-001 canonical account map för bank-owned lines

- `1930` = canonical operating bank account
- `1940` = canonical secondary bank account family för internal transfer examples
- `6570` = canonical bank fees
- `8311` = canonical ränteintäkter från bankmedel
- `8421` = canonical räntekostnader till kreditinstitut

Policy:
- ÄR/AP owner-bound lines får inte bokas direkt av bankflödet bara för att de rör `1930`
- `1630` tillhor skattekontoflödet och får inte agas har
- `1686` tillhor ÄR/PSP owner flow och får inte agas har

### BNK-POL-002 source capability classes

- `real_file`
- `real_api`
- `manual_controlled`
- `prepared_only`
- `stub`

Bankflödet får aldrig kalla `prepared_only` eller `stub` för live banking.

### BNK-POL-003 date policy

- bank-owned posting lines bokas på `bookingDate`
- `valueDate` bevaras som separat liquidity datum
- `camt052_intraday` eller annan non-booked feed får inte boka legal truth innan booked equivalent eller manual-controlled receipt finns

## Bindande canonical proof-ledger med exakta konton eller faltutfall

### BNK-P0001 Bank fee
- debet `6570`
- kredit `1930`

### BNK-P0002 Interest income on bank account
- debet `1930`
- kredit `8311`

### BNK-P0003 Interest expense to credit institution
- debet `8421`
- kredit `1930`

### BNK-P0004 Internal transfer from operating bank to secondary bank
- debet `1940`
- kredit `1930`

### BNK-P0005 Internal transfer from secondary bank to operating bank
- debet `1930`
- kredit `1940`

### BNK-P0006 Customer incoming line already owned by ÄR
- ingen ny huvudbokspost i bankflödet
- line binds to ÄR owner receipt

### BNK-P0007 Supplier outgoing line already owned by AP
- ingen ny huvudbokspost i bankflödet
- line binds to AP execution receipt

### BNK-P0008 Supplier return line already owned by AP
- ingen ny huvudbokspost i bankflödet
- line binds to AP return receipt

### BNK-P0009 Customer chargeback or payment return already owned by ÄR
- ingen ny huvudbokspost i bankflödet
- line binds to ÄR correction chain

### BNK-P0010 Duplicate statement line replay
- ingen huvudbokspost

### BNK-P0011 Unmatched external line blocked
- ingen huvudbokspost

### BNK-P0012 Fee reversal or correction line
- debet `1930`
- kredit `6570`

### BNK-P0013 Interest income correction reversal
- debet `8311`
- kredit `1930`

### BNK-P0014 Interest expense correction reversal
- debet `1930`
- kredit `8421`

### BNK-P0015 Intraday-only line without booked confirmation
- ingen huvudbokspost
- line blocks to review or waits för booked equivalent

## Bindande rapport-, export- och myndighetsmappning

- bank-owned postings ska synas i huvudbok och SIE4 med canonical verifikationsserie enligt detta dokument
- owner-bound lines ska inte skapa extra bank-owned journal lines i SIE4
- bankavstämningsgrad ska kunna redovisas per bankkonto, statement import och line family
- intraday-only lines får inte räknas som bokförd likvid i legal reports
- balance snapshots ska kunna jamforas mot huvudbok per booking date

## Bindande scenariofamilj till proof-ledger och rapportspar

- `BNK-A001` -> `BNK-P0006` -> ÄR owner binding, no new huvudbok
- `BNK-A002` -> `BNK-P0007` -> AP owner binding, no new huvudbok
- `BNK-A003` -> `BNK-P0008` -> AP return binding, no new huvudbok
- `BNK-A004` -> `BNK-P0009` -> ÄR return binding, no new huvudbok
- `BNK-B001` -> `BNK-P0001` -> huvudbok, SIE4, bankreconciliation
- `BNK-B002` -> `BNK-P0002` -> huvudbok, SIE4, bankreconciliation
- `BNK-B003` -> `BNK-P0003` -> huvudbok, SIE4, bankreconciliation
- `BNK-B004` -> `BNK-P0004` -> huvudbok, SIE4, bankreconciliation
- `BNK-B005` -> `BNK-P0005` -> huvudbok, SIE4, bankreconciliation
- `BNK-C001` -> `BNK-P0010` -> duplicate replay, no huvudbok
- `BNK-C002` -> `BNK-P0011` -> blocked, no huvudbok
- `BNK-C003` -> `BNK-P0015` -> blocked or waiting, no huvudbok
- `BNK-C004` -> `BNK-P0012` -> huvudbok, SIE4
- `BNK-C005` -> `BNK-P0013` -> huvudbok, SIE4
- `BNK-C006` -> `BNK-P0014` -> huvudbok, SIE4

## Tvingande dokument- eller indataregler

- statement import måste minst bara source profile, bank account, artifact hash, import timestamp och original artifact ref
- varje bankline måste minst bara account id, amount, direction, booking date, currency och stable source reference set
- om line saknar minimum identity fields ska den blockeras som invalid import
- ifall source class är `camt053_booked_statement` eller `camt054_notification` måste original message identifiers bevaras
- ifall source class är Bankgirot-reporting måste original Bankgiro report refs och OCR/remittance data bevaras när de finns

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `BNK-R001` = `duplicate_statement_import`
- `BNK-R002` = `duplicate_statement_line`
- `BNK-R003` = `missing_minimum_line_identity`
- `BNK-R004` = `owner_binding_missing`
- `BNK-R005` = `owner_binding_ambiguous`
- `BNK-R006` = `internal_transfer_counterline_missing`
- `BNK-R007` = `intraday_only_not_booked`
- `BNK-R008` = `unsupported_source_format`
- `BNK-R009` = `bank_owned_family_not_supported`
- `BNK-R010` = `manual_high_risk_review`

## Bindande faltspec eller inputspec per profil

### Profil `bankgiro_inbetalningar_line`
- `bankAccountId`
- `reportId`
- `reportLineSequence`
- `bookingDate`
- `amount`
- `currency`
- `ocrOrStructuredReference` när tillgangligt

### Profil `camt053_booked_line`
- `bankAccountId`
- `statementId`
- `entryReference`
- `bookingDate`
- `valueDate`
- `amount`
- `currency`
- `creditDebitIndicator`

### Profil `camt054_notification_line`
- `bankAccountId`
- `messageId`
- `entryReference` eller motsvarande provider line id
- `bookingDate` eller provider effective date
- `amount`
- `currency`
- `creditDebitIndicator`

### Profil `manual_controlled_statement_line`
- `bankAccountId`
- `artifactRef`
- `operatorReceiptId`
- `bookingDate`
- `amount`
- `currency`
- `operatorClassificationReason`

## Scenariofamiljer som hela systemet måste tacka

### BNK-A Owner-bound settlement family
- `BNK-A001` customer incoming line binds to ÄR
- `BNK-A002` supplier outgoing line binds to AP
- `BNK-A003` supplier return line binds to AP return
- `BNK-A004` customer payment return binds to ÄR correction

### BNK-B Bank-owned posting family
- `BNK-B001` bank fee
- `BNK-B002` interest income
- `BNK-B003` interest expense
- `BNK-B004` internal transfer out
- `BNK-B005` internal transfer back

### BNK-C Blocked, duplicate and correction family
- `BNK-C001` duplicate line replay
- `BNK-C002` unmatched external line blocked
- `BNK-C003` intraday-only line without booked confirmation
- `BNK-C004` fee correction reversal
- `BNK-C005` interest income correction reversal
- `BNK-C006` interest expense correction reversal

## Scenarioregler per familj

### BNK-A Owner-bound settlement family
- bankflödet äger line identity och owner binding men får inte skapa extra huvudbok när ÄR/AP redan äger legal effect
- owner-bound line får inte marks `reconciled` innan owner receipt faktiskt finns

### BNK-B Bank-owned posting family
- fee, interest och internal transfer får bara bokas genom `BankStandalonePostingDecision`
- internal transfer kraver pairad motrad eller explicit approved one-sided correction policy
- bank-owned posting får aldrig använda generiskt suspense-konto som slutlig sanning

### BNK-C Blocked, duplicate and correction family
- duplicate replay = no-op med receipt
- unmatched external line = blocked review
- intraday-only line = ingen huvudbok före booked equivalent
- correction line ska peka på exakt tidigare bank-owned ledger lineage

## Blockerande valideringar

- blockera import om source profile är `stub` eller `prepared_only` i legal-effect mode
- blockera line om minimum identity fields saknas
- blockera owner binding om flera owner candidates finns utan deterministisk vinnare
- blockera internal transfer booking om motrad saknas och policy inte tillater one-sided correction
- blockera standalone booking om line family egentligen tillhor ÄR, AP eller skattekonto
- blockera replay om line identity redan har gett legal effect

## Rapport- och exportkonsekvenser

- bankkontosaldo i rapporter ska kunna förankras mot summan av bank-owned ledger lines och owner-bound reconciliation state
- SIE4 ska bara inkludera bank-owned journal lines, aldrig rena owner bindings
- bankreconciliation rapport ska kunna visa `matched_owner`, `standalone_booked`, `blocked` och `duplicate`

## Förbjudna förenklingar

- ingen `mark as reconciled` utan owner binding eller standalone booking
- ingen direct-posting av customer/supplier lines i bankflödet om ÄR/AP redan äger dem
- ingen auto-booking av unknown external line till generiskt konto
- ingen intraday notification som låter sig utges för booked statement line
- ingen tyst sammanslagning av flera banklines till en line identity

## Fler bindande proof-ledger-regler för specialfall

### BNK-P0016 Internal transfer pair missing
- ingen huvudbokspost
- reconciliation case öppnas med `BNK-R006`

### BNK-P0017 Manual-controlled line approved as bank fee
- debet `6570`
- kredit `1930`
- måste bara operator receipt och artifact lineage

### BNK-P0018 Manual-controlled line approved as interest income
- debet `1930`
- kredit `8311`

### BNK-P0019 Manual-controlled line approved as interest expense
- debet `8421`
- kredit `1930`

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `BNK-P0001-BNK-P0005` skapar eller reverserar endast bank-owned huvudbok och markerar line `standalone_booked`
- `BNK-P0006-BNK-P0009` skapar ingen egen huvudbok utan satter `owner_bound` och `reconciled` när owner receipt finns
- `BNK-P0010` ger `duplicate_replayed`
- `BNK-P0011` och `BNK-P0015` ger `blocked`
- `BNK-P0012-BNK-P0014` reverserar tidigare bank-owned posting line
- `BNK-P0016` öppnar reconciliation case utan ledger effect
- `BNK-P0017-BNK-P0019` får bara skapa legal effect i `manual_controlled` source class med operator receipt

## Bindande verifikations-, serie- och exportregler

- bank-owned fees ska ha voucher series purpose `BANK_FEE`
- bank-owned interest income ska ha voucher series purpose `BANK_INT_IN`
- bank-owned interest expense ska ha voucher series purpose `BANK_INT_OUT`
- internal transfers ska ha voucher series purpose `BANK_TRANSFER`
- correction lines ska ha voucher series purpose `BANK_CORR`
- owner-bound lines ska inte skapa ny voucher series i bankflödet

## Bindande variantmatris som måste korsas mot varje scenariofamilj

Varje scenariofamilj måste korsas mot minst:
- source class: `bankgiro_inbetalningar`, `leverantorsbetalningar_return_feed`, `camt053_booked_statement`, `camt054_notification`, `manual_controlled_statement`
- owner class: `ar`, `ap`, `bank_owned`, `blocked`
- currency: `sek`, `foreign`
- timing: `booked`, `intraday_only`, `reversal_correction`
- migration mode: `native`, `historical_imported`

## Bindande fixture-klasser för bankflödet och bankavstämningen

- `BNK-FXT-001` = SEK booked customer line with ÄR owner receipt
- `BNK-FXT-002` = SEK booked supplier payment line with AP execution receipt
- `BNK-FXT-003` = SEK bank fee line
- `BNK-FXT-004` = SEK interest income line
- `BNK-FXT-005` = SEK interest expense line
- `BNK-FXT-006` = pairad intern överföring mellan 1930 och 1940
- `BNK-FXT-007` = duplicate replay of booked line
- `BNK-FXT-008` = unmatched external line blocked
- `BNK-FXT-009` = intraday-only line without booked confirmation

## Bindande expected outcome-format per scenario

Varje scenario måste minst ange:
- `scenarioId`
- `fixtureClass`
- `sourceClass`
- `lineFamily`
- `ownerClass`
- `expectedProofLedgerIds`
- `expectedJournalLines`
- `expectedBankLineState`
- `expectedReconciliationOutcome`
- `expectedSIE4Accounts`
- `expectedBlockingRuleIfAny`
- `officialSourceRefs`

## Bindande canonical verifikationsseriepolicy

- `BNKFEE` = bank fees and fee reversals
- `BNKINT` = interest income and expense plus reversals
- `BNKTRF` = internal transfers
- `BNKCOR` = other bank-owned corrections

No-journal scenarios:
- owner-bound ÄR/AP/tax lines
- duplicate replay
- blocked unmatched line
- intraday-only line without booked confirmation

## Bindande expected outcome per central scenariofamilj

- `BNK-A001`: `BNK-P0006`, no new journal, bank line owner-bound to ÄR and reconciled when ÄR receipt exists
- `BNK-A002`: `BNK-P0007`, no new journal, bank line owner-bound to AP and reconciled when AP execution receipt exists
- `BNK-B001`: `BNK-P0001`, journal `6570/1930`, line `standalone_booked`
- `BNK-B002`: `BNK-P0002`, journal `1930/8311`, line `standalone_booked`
- `BNK-B003`: `BNK-P0003`, journal `8421/1930`, line `standalone_booked`
- `BNK-B004`: `BNK-P0004`, journal `1940/1930`, paired transfer resolved
- `BNK-C001`: `BNK-P0010`, no journal, line `duplicate_replayed`
- `BNK-C002`: `BNK-P0011`, no journal, line `blocked`, reconciliation case open
- `BNK-C003`: `BNK-P0015`, no journal, line blocked until booked equivalent

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `BNK-A001` -> `BNK-P0006` -> owner-bound ÄR -> no new huvudbok
- `BNK-A002` -> `BNK-P0007` -> owner-bound AP -> no new huvudbok
- `BNK-A003` -> `BNK-P0008` -> owner-bound AP return -> no new huvudbok
- `BNK-A004` -> `BNK-P0009` -> owner-bound ÄR return -> no new huvudbok
- `BNK-B001` -> `BNK-P0001` -> `6570/1930`
- `BNK-B002` -> `BNK-P0002` -> `1930/8311`
- `BNK-B003` -> `BNK-P0003` -> `8421/1930`
- `BNK-B004` -> `BNK-P0004` -> `1940/1930`
- `BNK-B005` -> `BNK-P0005` -> `1930/1940`
- `BNK-C001` -> `BNK-P0010` -> duplicate no-op
- `BNK-C002` -> `BNK-P0011` -> blocked unmatched
- `BNK-C003` -> `BNK-P0015` -> intraday blocked
- `BNK-C004` -> `BNK-P0012` -> `1930/6570`
- `BNK-C005` -> `BNK-P0013` -> `8311/1930`
- `BNK-C006` -> `BNK-P0014` -> `1930/8421`

## Bindande testkrav

- varje proof-ledger `BNK-P0001-BNK-P0019` ska ha minst ett positivt testfall eller no-journal-test
- duplicate statement import och duplicate line replay ska ha idempotencytest
- intraday-only line ska ha negativt test som bevisar att ingen legal booking skapas före booked equivalent
- owner-bound ÄR/AP lines ska ha integrationstester som bevisar att bankflödet inte skapar dubbel bokföring
- bank fee, interest income, interest expense och internal transfer ska ha integrations- och SIE4-tester
- migration av historical lines ska ha provenance- och duplicate-guard-test

## Källor som styr dokumentet

- `https://www.bankgirot.se/globalassets/dokument/tekniska-manualer/bankgiroinbetalningar_tekniskmanual_sv.pdf`
  - styr svenska Bankgiro Inbetalningar, redovisningsfiler och strukturerade referenser
- `https://www.bankgirot.se/globalassets/dokument/tekniska-manualer/leverantorsbetalningar_tekniskmanual_sv.pdf`
  - styr svenska leverantörsbetalningar, återredovisning, returer och avdrag
- `https://www.iso20022.org/iso-20022-message-definitions?business-domain%5B0%5D=21`
  - styr officiella ISO 20022 camt-meddelanden för bank-to-customer statement och notifications
- `https://www.bas.se/wp-content/uploads/2025/01/Kontoplan-BAS-2025.pdf`
  - styr canonical BAS-kontofamiljer för bankkonto, bankavgifter och ränteposter

