# SKATTEKONTOFLÖDET_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för hela skattekontoflödet.

Detta dokument ska styra:
- canonical mirror av företagets skattekonto
- inbetalningar till och utbetalningar från skattekontot
- clearing mellan skattekonto och källskulder eller källfordringar
- kostnadsränta, intäktsränta och ändra skattekontotransaktioner
- anstånd, avbetalningsplaner och utbetalningsspärr där produkten uttryckligen stödjer dem
- receipts, authority-sync, periodisk avstämning och supersession
- tillaten integration mot Skatteverkets skattekonto-API

Skattekontot får aldrig modelleras som open banking. Ingen bankprovider, PSD2-kanal eller statementparser får aga legal truth för skattekontot.

## Syfte

Detta dokument finns för att läsaren ska kunna bygga hela skattekontoflödet utan att gissa:
- när `1630` ska debiteras eller krediteras
- vilka källsaldon som får clearas mot skattekontot
- hur moms, AGI, personalskatt, arbetsgivaravgifter, debiterad preliminarskatt och slutlig skatt ska speglas mot skattekontot
- hur ränta, anstånd, återbetalning, kvittning och utbetalningsspärr ska fungera
- hur receipts, myndighetsbeslut och API-hamtade transaktioner ska bevisas
- hur skattekontoimport och skattekontoavstämning ska byggas utan falsk realism

## Omfattning

Detta dokument omfattar:
- inbetalning till skattekontot
- utbetalning från skattekontot
- månatliga eller ändra debiteringar på skattekontot
- momsdebitering och momsaterbetalning mot `2650`
- personalskatt mot `2710`
- arbetsgivaravgifter mot `2731` eller uttryckligt underkonto i 2730-familjen
- debiterad preliminarskatt mot `2518`
- slutlig skatt och ändra skattebeslut mot `2510` eller uttryckligt beslutskonto enligt policy
- kostnadsränta och intäktsränta
- beviljat anstånd och återforing av anstånd
- utbetalningsspärr
- skattekonto-API, receipts och authority-transaktioner
- replay, correction, migration och audit

Detta dokument omfattar inte:
- beräkning av moms i sig
- beräkning av AGI, arbetsgivaravgifter eller preliminarskatt i sig
- bankens egen statement-truth
- Kronofogdens externa indrivningssystem utom den del som materialiseras som faktisk skattekontotransaktion eller blockerande state

## Absoluta principer

- skattekonto får aldrig synkas via open banking eller bankstatement som om det vore ett vanligt bankkonto
- `1630` får aldrig bokas fritt utan bindning till authority transaction eller explicit outgoing payment to tax account
- varje skattekontotransaktion måste ha exakt en owner category eller blocked review
- varje authority transaction måste kunna bindas till ett källsaldo, en räntepost, ett anstandsbeslut eller ett explicit other-tax decision
- moms, AGI och F-skatt får aldrig clearas mot skattekontot innan deras källbeslut är finalized
- utbetalningsspärr får aldrig fejkstyras via lokal flagga utan faktisk authority state
- anstånd får aldrig bokas som vanlig betalning eller vanlig skuldreduktion
- intäktsränta och kostnadsränta får aldrig blandas ihop med bankränta
- skattekontot får aldrig ha hidden adjustments utan authority evidence

## Bindande dokumenthierarki för skattekontoflödet

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- detta dokument

Detta dokument lutar på:
- `MOMSFLODET_BINDANDE_SANNING.md` för finalized momsbeslut och declaration receipts
- `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md` för bank-side payment initiation och bank receipt där pengar gar till eller från skattekontot
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` för vouchers, serier, kontrollkonton, correction chains, period locks och SIE4-vouchertruth för tax-account mirror och authority-ledger
- `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md` för ingest av myndighetsbrev, pdf-beslut och ändra supporting documents

Detta dokument får inte overstyras av:
- gamla open-banking-spar som kallat skattekonto för banking source
- gamla tax-account mirror scripts
- gamla saldoflaggor utan authority transaction ids
- gamla manuella excelfiler med justerade skatteposter

## Kanoniska objekt

- `TaxAccountAuthorityTransaction`
  - bar exakt transaktion som Skatteverket visar på skattekontot
  - innehåller transaction date, booking date, amount, sign, authority type code och authority reference

- `TaxAccountMirrorEntry`
  - bar den interna bokföringsspegeln mot `1630`

- `TaxAccountOwnerBinding`
  - binder authority transaction till owner category: VAT, AGI, preliminar tax, final tax, interest, respite, refund eller blocked review

- `TaxAccountReconciliationCase`
  - bar mismatch mellan authority view och intern mirror

- `TaxAccountPayoutBlockState`
  - bar authority-backed state för utbetalningsspärr

- `TaxAccountRespiteDecision`
  - bar beslut om anstånd eller återforing av anstånd

- `TaxAccountReceipt`
  - bar receipt, API correlation id, fetched-at, checksum och source channel

## Kanoniska state machines

### `TaxAccountAuthorityTransaction`
- `fetched`
- `classified`
- `bound`
- `posted`
- `reconciled`
- `superseded`

### `TaxAccountReconciliationCase`
- `open`
- `investigating`
- `resolved`
- `accepted_difference`
- `escalated`

### `TaxAccountPayoutBlockState`
- `not_blocked`
- `blocked_by_request`
- `blocked_by_authority_state`

### `TaxAccountRespiteDecision`
- `granted`
- `active`
- `reduced`
- `expired`
- `repaid`
- `cancelled`

## Kanoniska commands

- `ImportTaxAccountTransactions`
- `BindTaxAccountOwner`
- `PostTaxAccountMirror`
- `ReconcileTaxAccount`
- `RecordTaxAccountReceipt`
- `ApplyTaxAccountRefund`
- `ApplyTaxAccountInterest`
- `ApplyTaxAccountRespiteDecision`
- `ApplyTaxAccountRespiteRepayment`
- `SetTaxAccountPayoutBlockState`
- `MigrateHistoricTaxAccountTransaction`

## Kanoniska events

- `TaxAccountTransactionsImported`
- `TaxAccountOwnerBound`
- `TaxAccountMirrorPosted`
- `TaxAccountReconciliationOpened`
- `TaxAccountReconciled`
- `TaxAccountReceiptRecorded`
- `TaxAccountRefundApplied`
- `TaxAccountInterestApplied`
- `TaxAccountRespiteApplied`
- `TaxAccountPayoutBlockChanged`
- `HistoricTaxAccountTransactionMigrated`

## Kanoniska route-familjer

- `/v1/tax-account/transactions/*`
- `/v1/tax-account/reconciliation/*`
- `/v1/tax-account/payout-block/*`
- `/v1/tax-account/respite/*`
- `/v1/tax-account/receipts/*`

Förbjudet:
- routes som låter bankprovider skriva tax-account truth
- fri editing av `1630`-mirror utan authority transaction
- fri manuellt skapad tax account transaction i live path

## Kanoniska permissions och review boundaries

- `tax_account.read`
- `tax_account.import`
- `tax_account.reconcile`
- `tax_account.high_risk_adjustment`
- `tax_account.audit`

Support/backoffice får inte:
- skapa falska authority transactions
- markera payout block utan authority state
- cleara mismatch utan reconciliation note och evidence

## Nummer-, serie-, referens- och identitetsregler

- varje authority transaction måste ha unik authority transaction identity eller canonical composite key
- `TaxAccountMirrorEntry` måste peka på authority transaction id eller explicit outgoing payment id
- receipts måste lagra source channel: API, authority pdf eller annan tillaten kanal
- migration får inte skapa ny identity för historiska authority transactions om extern identity finns

## Valuta-, avrundnings- och omräkningsregler

- skattekontot är SEK-only i legal truth
- alla spegelposter mot `1630` ska vara ore-exakta internt
- inga valutakursdifferenser får uppsta inne i skattekontoflödet; de ska uppsta i upstream owner flow om nagon utlandsk komponent finns

## Replay-, correction-, recovery- och cutover-regler

- replay får aldrig duplicera authority transaction eller mirror entry
- correction får bara ske via ny authority transaction, nytt anstandsbeslut eller explicit reconciliation resolution
- restore får bevara payout-block-state, receipts och reconciliation lineage
- migration måste importera minst två och ett halvt ars authority transactions om API eller källsystem kan leverera det

## Huvudflödet

1. bolaget betalar till skattekontot eller hamtar authority transactions via tillaten kanal
2. varje authority transaction importeras
3. owner binding sker mot VAT, AGI, preliminar tax, final tax, interest, respite, refund eller blocked review
4. mirror posting mot `1630` och owner account byggs deterministiskt
5. reconciliation jamfor authority saldo mot intern `1630`
6. payouts, payout block, respite och interest behandlas i separata scenarioregler
7. mismatch skapar reconciliation case
8. receipts och evidence lagras

## Bindande scenarioaxlar

Varje scenario måste korsas mot:
- origin: bank payment / authority debit / authority credit / interest / respite / refund / block state
- owner: VAT / payroll tax / employer contributions / preliminary tax / final tax / other tax / interest / respite / unknown
- direction: debit from tax account / credit to tax account
- timing: booked date / value date / decision date / due date
- state: original / corrected / migrated
- channel: API / authority document / manual evidence review

## Bindande policykartor

### Canonical skattekontokonton

- `1630`
  - skattekonto, enda canonical balance account för tax account mirror

- `1930`
  - bankkonto, endast för in- och utbetalning mellan bank och skattekonto

- `2650`
  - redovisningskonto för moms, clearas mot skattekonto när momsbeslut materialiseras på skattekontot

- `2710`
  - personalskatt, clearas mot skattekonto när avdragen skatt debiteras på skattekontot

- `2731`
  - avräkning lagstadgade sociala avgifter, clearas mot skattekonto när arbetsgivaravgifter debiteras på skattekontot

- `2518`
  - betald F-skatt, clearas mot skattekonto när debiterad preliminarskatt debiteras på skattekontot

- `2510`
  - skatteskulder, används för slutlig skatt eller annat uttryckligt skattebeslut enligt policy

- `2852`
  - anstandsbelopp för moms, arbetsgivaravgifter och personalskatt, när anstånd uttryckligen beviljats

- `8314`
  - skattefria ränteintäkter

- `8423`
  - räntekostnader för skatter och avgifter

## Bindande canonical proof-ledger med exakta konton eller faltutfall
### TAX-P0001 Betalning från bank till skattekonto
- debet `1630`
- kredit `1930`
- owner category: `bank_to_tax_account_payment`

### TAX-P0002 Debiterad preliminarskatt på skattekontot
- debet `2518`
- kredit `1630`
- owner category: `preliminary_tax`

### TAX-P0003 Moms att betala bokas på skattekontot
- debet `2650`
- kredit `1630`
- owner category: `vat_debit`
- kraver finalized momsbeslut eller receipt-backed authority transaction

### TAX-P0004 Moms att fa tillbaka bokas på skattekontot
- debet `1630`
- kredit `2650`
- owner category: `vat_refund`

### TAX-P0005 Avdragen personalskatt bokas på skattekontot
- debet `2710`
- kredit `1630`
- owner category: `withheld_tax`

### TAX-P0006 Arbetsgivaravgifter bokas på skattekontot
- debet `2731`
- kredit `1630`
- owner category: `employer_contributions`

### TAX-P0007 Slutlig skatt att betala bokas på skattekontot
- debet `2510`
- kredit `1630`
- owner category: `final_tax_debit`

### TAX-P0008 Slutlig skatt att fa tillbaka bokas på skattekontot
- debet `1630`
- kredit `2510`
- owner category: `final_tax_refund`

### TAX-P0009 Återbetalning från skattekontot till bank
- debet `1930`
- kredit `1630`
- owner category: `tax_account_refund_payout`
- får blockeras av payout block state

### TAX-P0010 Intäktsränta på skattekontot
- debet `1630`
- kredit `8314`
- owner category: `interest_income`

### TAX-P0011 Kostnadsränta på skattekontot
- debet `8423`
- kredit `1630`
- owner category: `interest_expense`

### TAX-P0012 Beviljat anstånd
- debet `1630`
- kredit `2852`
- owner category: `respite_granted`

### TAX-P0013 Återforing eller betalning av anstånd
- debet `2852`
- kredit `1630`
- owner category: `respite_repaid_or_reversed`

### TAX-P0014 Utbetalningsspärr satt eller hamtad
- no GL posting
- state effect only
- owner category: `payout_block_state`

### TAX-P0015 Okand eller otillrackligt klassad authority transaction
- no GL posting
- blocked review
- owner category: `unknown`

### TAX-P0016 Correction av tidigare authority transaction
- no free manual journal
- ny authority transaction eller explicit correction lineage måste finnas

## Bindande rapport-, export- och myndighetsmappning

- skattekontoflödet ska kunna visa authority transaction history, current saldo, payout block state och receipts
- detta flöde skickar inte vanlig moms- eller AGI-deklaration, men det måste binda till receipts och beslut som kommer från de flödena
- Skatteverkets skattekonto-API är tillaten myndighetskanal för hamtning av saldo, transaktioner, utbetalningskonto och utbetalningsspärr

## Bindande scenariofamilj till proof-ledger och rapportspar

### A. Payment and clearing
- `TAX-A001` bank payment to tax account -> `TAX-P0001`
- `TAX-A002` preliminary tax debit -> `TAX-P0002`
- `TAX-A003` VAT debit -> `TAX-P0003`
- `TAX-A004` VAT refund -> `TAX-P0004`
- `TAX-A005` withheld tax debit -> `TAX-P0005`
- `TAX-A006` employer contribution debit -> `TAX-P0006`
- `TAX-A007` final tax debit -> `TAX-P0007`
- `TAX-A008` final tax refund -> `TAX-P0008`

### B. Refunds, interest and respite
- `TAX-B001` refund to bank -> `TAX-P0009`
- `TAX-B002` interest income -> `TAX-P0010`
- `TAX-B003` interest expense -> `TAX-P0011`
- `TAX-B004` respite gränted -> `TAX-P0012`
- `TAX-B005` respite repaid or reversed -> `TAX-P0013`
- `TAX-B006` payout block state -> `TAX-P0014`

### C. Blocked and correction
- `TAX-C001` unknown transaction -> `TAX-P0015`
- `TAX-C002` correction transaction -> `TAX-P0016`

## Tvingande dokument- eller indataregler

- authority transaction import måste minst ge booking date, amount, sign, balance after, authority text eller type code och extern identity eller canonical composite key
- bank payment to tax account måste ha bank evidence och OCR/reference enligt Skatteverkets inbetalningsregel
- payouts måste ha utbetalningskonto eller explicit payout-failure evidence
- respite scenario måste ha authority decision id, valid-from, valid-until och amount

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `TAXR001` bank payment to tax account
- `TAXR002` preliminary tax debit
- `TAXR003` VAT debit
- `TAXR004` VAT refund
- `TAXR005` withheld tax debit
- `TAXR006` employer contribution debit
- `TAXR007` final tax debit
- `TAXR008` final tax refund
- `TAXR009` interest income
- `TAXR010` interest expense
- `TAXR011` respite gränted
- `TAXR012` respite repaid or reversed
- `TAXR013` payout block state
- `TAXR014` unknown blocked

## Bindande faltspec eller inputspec per profil

### Bank payment profile
- bank payment id
- booking date
- OCR or tax payment reference
- amount
- source bank account

### Authority transaction profile
- authority transaction id or composite key
- booking date
- amount
- sign
- description or type code
- balance after

### Respite profile
- authority decision id
- decision date
- amount
- validity range
- affected tax category

### Payout block profile
- authority state
- fetched at
- evidence channel

## Scenariofamiljer som hela systemet måste tacka

- payment in to tax account
- preliminary tax debit
- VAT debit and VAT refund
- payroll tax debit
- employer contribution debit
- final tax debit and refund
- interest income and interest expense
- respite gränted and repaid
- payout block state
- unknown authority transaction
- correction transaction

## Scenarioregler per familj

- payment in får bara boka `1630/1930`
- VAT-related tax account movement får bara boka mot `2650` när momsbeslutet är finalized eller authority transaction explicit visar moms
- payroll-related tax account movement får bara boka mot `2710` eller `2731` efter bindande owner binding
- refund till bank får bara bokas när authority transaction och utbetalningskonto stammer
- payout block state ska blockera automatisk payout expectation men inte blockera import
- unknown authority transaction ska skapa review case och inte bokas

## Blockerande valideringar

- attempt to import skattekonto via open banking -> blocker
- authority transaction without identity or stable composite key -> blocker
- attempt to clear `1630` mot fel owner account -> blocker
- VAT debit without momsbeslut or authority evidence -> blocker
- payroll debit without owner binding -> blocker
- payout without authority transaction -> blocker
- unknown tax account transaction auto-posting -> blocker

## Rapport- och exportkonsekvenser

- tax account mirror ska kunna rapporteras som saldo, transaktionslista och avstämningsstatus
- systemet ska kunna visa skillnad mellan intern `1630` och authority saldo
- receipts ska kunna exporteras i auditpaket

## Förbjudna förenklingar

- att behandla skattekonto som vanligt bankkonto
- att boka allt på `1630` utan owner binding
- att laka mismatch genom manuell journal utan authority transaction
- att kalla utbetalningsspärr för lokal preferens
- att kalla open-banking-import för skattekontosync

## Fler bindande proof-ledger-regler för specialfall

### TAX-P0017 Intern omforing mellan owner categories är förbjuden
- no GL posting allowed
- correction måste ske via ny authority transaction eller upstream owner correction

### TAX-P0018 Migrerad historisk transaction
- posting according to original authority movement
- must be marked `historic_imported`

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `TAX-P0001-P0013`
  - no ÄR or AP subledger effect
  - effect is tax-account mirror and owner-clearing only

- `TAX-P0014`
  - state only

- `TAX-P0015`
  - reconciliation case required

## Bindande verifikations-, serie- och exportregler

- source journals för VAT or payroll remain in their source flows
- skattekontoflödet får skapa egen mirror journalserie, till exempel `SKT-<period>-<seq>`
- authority transaction import receipts ska ha egen receiptserie
- varje mirror entry måste peka på exakt authority transaction eller bank payment id

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- `TVAR001` debit vs credit
- `TVAR002` original vs correction
- `TVAR003` native runtime vs migrated historic
- `TVAR004` bank-originated vs authority-originated
- `TVAR005` blocked payout vs no payout block
- `TVAR006` same-day payment vs delayed booking

## Bindande fixture-klasser för skattekontoflödet

- `TAX-FXT-001` bank payment in
- `TAX-FXT-002` VAT debit from finalized VAT return
- `TAX-FXT-003` payroll debit from AGI period
- `TAX-FXT-004` preliminary tax debit
- `TAX-FXT-005` refund to bank
- `TAX-FXT-006` interest income
- `TAX-FXT-007` interest expense
- `TAX-FXT-008` respite gränted
- `TAX-FXT-009` payout block active
- `TAX-FXT-010` unknown transaction

## Bindande expected outcome-format per scenario

Varje scenario måste ange:
- scenario id
- fixture class
- authority input
- owner binding
- expected journal
- expected reconciliation outcome
- expected receipt requirement
- expected block state

## Bindande canonical verifikationsseriepolicy

- tax account mirror journals -> `SKT-YYYYMM-<seq>`
- tax account receipts -> `SKTRCPT-<channel>-<seq>`
- reconciliation cases -> `SKTREC-<period>-<seq>`

## Bindande expected outcome per central scenariofamilj

### `TAX-A001` bank payment to tax account
- fixture minimum: `TAX-FXT-001`
- expected journal: debet `1630`, kredit `1930`
- expected receipt: bank payment evidence required

### `TAX-A003` VAT debit
- fixture minimum: `TAX-FXT-002`
- expected journal: debet `2650`, kredit `1630`
- expected requirement: finalized VAT decision or authority transaction

### `TAX-A006` employer contribution debit
- fixture minimum: `TAX-FXT-003`
- expected journal: debet `2731`, kredit `1630`
- expected requirement: payroll owner binding required

### `TAX-B001` refund to bank
- fixture minimum: `TAX-FXT-005`
- expected journal: debet `1930`, kredit `1630`
- expected requirement: payout block must be false

### `TAX-B004` respite gränted
- fixture minimum: `TAX-FXT-008`
- expected journal: debet `1630`, kredit `2852`
- expected requirement: authority decision required

### `TAX-C001` unknown transaction
- fixture minimum: `TAX-FXT-010`
- expected journal: none
- expected outcome: blocked review and reconciliation case

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `TAX-A001` -> `TAX-P0001`
- `TAX-A002` -> `TAX-P0002`
- `TAX-A003` -> `TAX-P0003`
- `TAX-A004` -> `TAX-P0004`
- `TAX-A005` -> `TAX-P0005`
- `TAX-A006` -> `TAX-P0006`
- `TAX-A007` -> `TAX-P0007`
- `TAX-A008` -> `TAX-P0008`
- `TAX-B001` -> `TAX-P0009`
- `TAX-B002` -> `TAX-P0010`
- `TAX-B003` -> `TAX-P0011`
- `TAX-B004` -> `TAX-P0012`
- `TAX-B005` -> `TAX-P0013`
- `TAX-B006` -> `TAX-P0014`
- `TAX-C001` -> `TAX-P0015`
- `TAX-C002` -> `TAX-P0016`

## Bindande testkrav

- varje proof-ledger `TAX-P0001-TAX-P0018` ska ha minst ett testfall
- open-banking import för skattekonto ska ha negativt testfall
- payout block ska testas med authority-backed blockstate
- VAT debit ska testas mot finalized momsbeslut
- payroll debit ska testas mot owner binding från payroll
- unknown transaction ska testas som blocked review

## Källor som styr dokumentet

- Skatteverket, Skattekontobroschyren SKV 408: https://www.skatteverket.se/download/18.3810a01c150939e893f218a/1708609818155/40808.pdf
- Skatteverket, API-utveckling - Skattekonto: https://www.skatteverket.se/omoss/digitalasamarbeten/utvecklingsomraden/skattekonto.4.7eada0316ed67d72822728.html
- Skatteverket, Moms- och arbetsgivardeklarationer SKV 409: https://skatteverket.se/download/18.4a4d586616058d860bcc0e3/1708610818566/moms-och-arbetsgivardeklarationer-skv409-utgava21.pdf
- BAS 2025: https://www.bas.se/wp-content/uploads/2025/01/Kontoplan-BAS-2025.pdf
- BAS kontoexempel för anstånd och skatter: https://www.bas.se/wp-content/uploads/2023/10/NE_K1-201002.pdf
