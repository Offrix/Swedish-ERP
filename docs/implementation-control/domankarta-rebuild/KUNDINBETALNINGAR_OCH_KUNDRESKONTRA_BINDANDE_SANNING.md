# KUNDINBETALNINGAR_OCH_KUNDRESKONTRA_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för hela kundinbetalnings- och kundreskontraflödet.

Detta dokument ska styra:
- ÄR-open-items efter att faktura eller kredit skapats
- inbetalningar via bank, BG, PG, OCR, EndToEndId, kort, PSP och ändra rails
- payment allocation mot en eller flera kundfakturor
- delbetalning, överbetalning, underbetalning och customer advance
- refunds till kund
- card- och PSP-fordringar
- factoring och belanade kundfordringar
- disputed receivables, write-off handoff och bad debt handoff
- reskontraaging, payment status, dunning payment impact och export

Ingen kod, inget test, ingen route, ingen migration, ingen runbook och ingen bankkoppling får avvika från detta dokument utan att detta dokument skrivs om först.

## Syfte

Detta flöde är inte bara:
- matcha bankrad mot faktura
- markera betald
- stanga kundreskontran

Detta dokument är den bindande sanningen för:
- när kundfordran fortfarande är kundfordran och när den i stallet blivit PSP-fordran, factoringfordran, tvistig fordran eller skuld till kund
- hur OCR/BG/PG/referenser får användas
- hur en betalning får delas upp mellan flera invoices
- hur överbetalningar och kundforskott får ligga som skuld till kund
- hur refunds får ske utan att förstora reskontran
- hur kundreskontra, huvudbok, bankbokning, reminder status och SIE4 måste spegla samma sanning

Läsaren ska kunna bygga hela payment-allocation- och kundreskontrakarnan utan att gissa:
- vilket konto som ska bara vilken fordran
- hur payment matching får ske
- när ett kortkop är kundfordran respektive PSP-fordran
- hur chargeback och retur ska öppna eller flytta fordran
- hur customer advance ska användas mot framtida invoice

## Omfattning

Detta dokument omfattar minst:
- vanlig bankinbetalning mot kundfaktura
- OCR-betalning
- BG- och PG-betalning
- manuell inbetalning utan OCR
- delbetalning
- överbetalning
- underbetalning
- split payment över flera invoices
- payment allocation med valuta
- customer advance innan invoice
- kundrefund
- kort- och PSP-betalning
- kort-/PSP-fee på settlement
- chargeback eller reverserad kortbetalning
- factoring och belanade kundfordringar
- disputed receivable reclassification
- handoff till bad debt / write-off
- replay, duplicate, correction och migration

Detta dokument omfattar inte:
- seller-side issue av faktura eller kreditnota
- seller-side momsklassning vid issue
- AP-betalningar
- payroll- eller benefitutbetalningar
- skattekonto

Kanonisk agarskapsregel:
- `FAKTURAFLODET_BINDANDE_SANNING.md` äger invoice issue, credit note issue och seller-side momsutfall
- detta dokument äger all efterföljande open-item, settlement, payment allocation, customer advance, PSP-fordran, refund och reskontraaging truth
- `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md` äger banktransaktionens tekniska sanning, men detta dokument äger ÄR-side legal effect när en bankhandelse binds till kundreskontran

## Absoluta principer

- en kundfordran får aldrig stangas utan bindande allocation receipt
- en kort- eller PSP-fordran får aldrig bokas som vanlig kundfordran efter att kundens betalning är definitivt auktoriserad och fordran flyttat till PSP
- `1580` får inte användas som canonical default för kort-/PSP-fordringar; canonical konto är `1686`
- överbetalning får aldrig bokas som intäkt
- customer advance får aldrig bokas som intäkt innan issue/allocation
- disputed receivable får aldrig behandlas som bad debt utan separat beslut
- underbetalning får aldrig dorras igenom som full settlement
- chargeback får aldrig dorras igenom som bankavgift eller write-off
- payment match får aldrig bara ga på OCR om annan data motsager matchen
- samma payment receipt får aldrig skapa flera allocation outcomes

## Bindande dokumenthierarki för kundinbetalnings- och kundreskontraflödet

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- detta dokument

Detta dokument lutar på:
- `FAKTURAFLODET_BINDANDE_SANNING.md` för invoice issue, credits och ÄR-grundfordran
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` för vouchers, serier, kontrollkonton, correction chains, period locks och SIE4-vouchertruth
- `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md` för upstream OCR- och referensklassning där scanning spelar in för inbetalningsunderlag
- `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md` för bankradens tekniska sanning

Detta dokument får inte overstyras av:
- gamla ÄR-payment runbooks
- gamla OCR-matchningsheuristiker
- gamla kortinlosenantäganden om `1580`

Fas 4, 6, 15, 27 och 28 får inte definiera avvikande kundinbetalnings- eller kundreskontratruth.

## Kanoniska objekt

- `CustomerOpenItem`
  - bar reskontrasanning per invoice eller credit
  - innehåller original amount, open amount, allocated amount, currency och status

- `IncomingPaymentReceipt`
  - bar payment event truth
  - innehåller rail, date, amount, reference set, payer identity och source receipt ids

- `PaymentAllocationDecision`
  - bar bindande beslut om hur betalningen fördelas

- `CustomerAdvanceLiability`
  - bar skuld till kund för överbetalning eller förskott

- `CardPspReceivable`
  - bar fordran mot kort- eller betalmedelsforetag
  - är aldrig kundfordran

- `FactoredReceivableTransfer`
  - bar flytt från `1510` till `1512`

- `ReceivableDisputeDecision`
  - bar omklassning till tvistig fordran

- `RefundDecision`
  - bar beslut om återbetalning till kund

## Kanoniska state machines

### `CustomerOpenItem`

- `open`
- `partially_settled`
- `fully_settled`
- `overpaid_closed`
- `transferred_to_psp`
- `transferred_to_factoring`
- `disputed`
- `written_off`
- `bad_debt_confirmed`
- `closed`

### `IncomingPaymentReceipt`

- `received`
- `classified`
- `matched`
- `partially_allocated`
- `fully_allocated`
- `overallocated`
- `blocked`
- `reversed`

### `CustomerAdvanceLiability`

- `recognized`
- `partially_applied`
- `fully_applied`
- `refunded`
- `closed`

### `CardPspReceivable`

- `recognized`
- `partially_settled`
- `fully_settled`
- `charged_back`
- `closed`

## Kanoniska commands

- `RegisterIncomingPaymentReceipt`
- `AllocateIncomingPayment`
- `CreateCustomerAdvanceLiability`
- `ApplyCustomerAdvanceToInvoice`
- `RecognizeCardPspReceivable`
- `SettleCardPspReceivable`
- `TransferReceivableToFactoring`
- `MarkReceivableDisputed`
- `IssueCustomerRefund`
- `CorrectPaymentAllocation`

## Kanoniska events

- `ar.payment.received`
- `ar.payment.allocated`
- `ar.advance.recognized`
- `ar.advance.applied`
- `ar.psp_receivable.recognized`
- `ar.psp_receivable.settled`
- `ar.receivable.factored`
- `ar.receivable.disputed`
- `ar.customer.refunded`
- `ar.payment.corrected`

## Kanoniska route-familjer

- `/v1/är/payments/*`
- `/v1/är/open-items/*`
- `/v1/är/advances/*`
- `/v1/är/refunds/*`
- `/v1/är/psp/*`
- `/v1/är/factoring/*`

## Kanoniska permissions och review boundaries

- `ar_payment.register`
- `ar_payment.allocate`
- `ar_payment.override_match`
- `ar_refund.approve`
- `ar_dispute.mark`
- `ar_factoring.transfer`
- `ar_audit.read`

Hårda review boundaries:
- samma person får inte registrera manuell inbetalning, override-matcha och godkänna refund i samma kedja
- refund över överbetalt eller customer advance kraver explicit approval
- PSP/chargeback-kedjor får inte autocorrigeras utan receipt

## Nummer-, serie-, referens- och identitetsregler

- payment receipt id måste vara globalt unikt
- invoice allocation måste referera exakt `invoiceId` eller `creditId`
- OCR, BG, PG, EndToEndId, payer account, PSP settlement id och bank entry id måste vara first-class fields
- card- och PSP-handelser får aldrig lagras som fri textreferens

## Valuta-, avrundnings- och omräkningsregler

- allocation sker alltid i SEK för huvudboken
- original invoice currency och payment currency måste bevaras
- valutadifferens får aldrig gommas i allocation amount

## Replay-, correction-, recovery- och cutover-regler

- samma bank/payment receipt får aldrig ge dubbel allocation
- correction ska skapa ny allocation chain, aldrig overwrite
- migration måste bevara open items, overpayments, advances och PSP receivables som öppna poster

## Huvudflödet

1. payment receipt registreras
2. references och payer identity klassas
3. allocation policy utvarderas
4. payment allokeras till open items, advance liability eller PSP/factoring chain
5. reskontra uppdateras
6. refund/dispute/factoring/chargeback handteras som separat legal effect

## Bindande scenarioaxlar

- rail:
  - bank
  - ocr
  - bg_pg
  - card_psp
  - factoring
- allocation mode:
  - exact_single_invoice
  - split_multiple_invoices
  - partial
  - overpayment
  - advance
  - blocked
- receivable class:
  - `1510`
  - `1512`
  - `1516`
  - `1686`
  - `2420`

## Bindande policykartor

### Bindande canonical kontokarta

- `KIN-ACC001` `1510` kundfordringar
- `KIN-ACC002` `1512` belanade kundfordringar/factoring
- `KIN-ACC003` `1516` tvistiga kundfordringar
- `KIN-ACC004` `1519` nedskrivning av kundfordringar
- `KIN-ACC005` `1686` kort- och PSP-fordringar; canonical konto för kortinlosenfordran och liknande betalmedelsfordran
- `KIN-ACC006` `1930` bank
- `KIN-ACC007` `2420` förskott från kunder och överbetalningar
- `KIN-ACC008` `6570` bank- och betalningskostnader, canonical fee-konto om explicit mer exakt avgiftskonto inte styrs av produktpolicy

### Bindande rail-karta

- `KIN-RAIL001` banktransfer
- `KIN-RAIL002` OCR bankgiro
- `KIN-RAIL003` plusgiro
- `KIN-RAIL004` card/PSP
- `KIN-RAIL005` factoring settlement

## Bindande canonical proof-ledger med exakta konton eller faltutfall

### `KIN-P0001` full bankbetalning mot en invoice

- debet `1930`
- kredit `1510`

### `KIN-P0002` delbetalning mot en invoice

- debet `1930`
- kredit `1510` med mottaget belopp
- rest kvar på `1510`

### `KIN-P0003` överbetalning mot en invoice

- debet `1930` med hela inbetalningen
- kredit `1510` med fakturans sista öppna belopp
- kredit `2420` med överbetalningen

### `KIN-P0004` customer advance innan invoice

- debet `1930`
- kredit `2420`

### `KIN-P0005` apply customer advance mot invoice

- debet `2420`
- kredit `1510`

### `KIN-P0006` refund av överbetalning eller customer advance

- debet `2420`
- kredit `1930`

### `KIN-P0007` kund betalar med kort eller PSP, kundfordran flyttas till PSP-fordran

- debet `1686`
- kredit `1510`

### `KIN-P0008` PSP utbetalar nettobelopp med avgift

- debet `1930` med nettobelopp
- debet `6570` med avgiften
- kredit `1686` med bruttobeloppet

### `KIN-P0009` transfer till factoring

- debet `1512`
- kredit `1510`

### `KIN-P0010` tvistig kundfordran

- debet `1516`
- kredit `1510`

### `KIN-P0011` chargeback eller reverserad PSP-betalning

- debet `1510` eller `2420` enligt faktisk legal effekt
- kredit `1686` eller `1930` enligt var reverseringen traffar

### `KIN-P0012` felaktig eller oallokerad payment receipt

- ingen legal ÄR-posting utan bindande allocation
- blocked tills korrekt owner och allocation finns

## Bindande rapport-, export- och myndighetsmappning

- kundinbetalning i sig skapar ingen ny moms
- överbetalning och customer advance ska ligga som skuld i balans
- PSP-fordran ska exporteras som övrig kortfristig fordran, inte kundfordran

## Bindande scenariofamilj till proof-ledger och rapportspar

- `KIN-A001` full bank payment -> `KIN-P0001`
- `KIN-A002` partial payment -> `KIN-P0002`
- `KIN-A003` overpayment -> `KIN-P0003`
- `KIN-A004` customer advance before invoice -> `KIN-P0004`
- `KIN-A005` apply advance -> `KIN-P0005`
- `KIN-A006` refund customer advance/overpayment -> `KIN-P0006`
- `KIN-B001` card/PSP customer payment -> `KIN-P0007`
- `KIN-B002` PSP payout with fee -> `KIN-P0008`
- `KIN-C001` factoring transfer -> `KIN-P0009`
- `KIN-D001` disputed receivable -> `KIN-P0010`
- `KIN-E001` chargeback -> `KIN-P0011`
- `KIN-F001` blocked unmatched receipt -> `KIN-P0012`

## Tvingande dokument- eller indataregler

- payment receipt måste ha datum, belopp, rail och source id
- OCR-fält får aldrig behandlas som giltigt utan kontrollregel
- customer advance måste ha explicit customer identity
- PSP settlement måste ha settlement id och fee break-out

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `KIN-LR001` exact invoice settlement
- `KIN-LR002` partial settlement
- `KIN-LR003` overpayment or advance liability
- `KIN-LR004` PSP receivable
- `KIN-LR005` factoring transfer
- `KIN-LR006` dispute reclass
- `KIN-LR007` blocked unmatched receipt

## Bindande faltspec eller inputspec per profil

### Profil `bank_payment`

- amount
- booking date
- value date
- OCR or free reference
- payer identity if known
- bank entry id

### Profil `card_psp_payment`

- gross amount
- settlement id
- PSP/acquirer id
- fee amount if known
- invoice link or basket link

### Profil `customer_advance`

- customer id
- amount
- reason
- receipt id

## Scenariofamiljer som hela systemet måste tacka

- `KIN-A001` full bank payment
- `KIN-A002` partial payment
- `KIN-A003` overpayment
- `KIN-A004` customer advance before invoice
- `KIN-A005` apply advance
- `KIN-A006` refund advance
- `KIN-B001` card/PSP payment
- `KIN-B002` PSP payout with fee
- `KIN-C001` factoring transfer
- `KIN-D001` disputed receivable
- `KIN-E001` chargeback
- `KIN-F001` blocked unmatched receipt

## Scenarioregler per familj

- `KIN-A001-KIN-A003`
  - kundfordran ligger på `1510` tills allocation receipt flyttar den
- `KIN-A004-KIN-A006`
  - pengar från kund utan allokerad invoice ligger på `2420`
- `KIN-B001-KIN-B002`
  - efter definitiv card/PSP-betalning är fordran inte längre på kund utan på PSP/acquirer
  - canonical konto är `1686`, inte `1580`
- `KIN-C001`
  - factoring flyttar fordran från `1510` till `1512`
- `KIN-D001`
  - dispute flyttar fordran från `1510` till `1516`
- `KIN-F001`
  - ingen ÄR-posting utan bindande allocation

## Blockerande valideringar

- payment receipt utan tillracklig identitet eller source id
- OCR referens som inte passerar kontrollregel
- PSP payout utan settlement id
- attempt att boka PSP-fordran på `1580`
- refund utan bindande customer liability eller approval
- chargeback utan receiptkedja

## Rapport- och exportkonsekvenser

- `1510`, `1512`, `1516`, `1686` och `2420` måste kunna skiljas i huvudbok, aging och export
- överbetalning på `2420` får inte visas som stangd kundfordran utan skuld till kund

## Förbjudna förenklingar

- att alltid stanga `1510` direkt mot `1930`
- att boka kort-/PSP-fordringar på `1580` som default
- att bokföra överbetalning som intäkt
- att betrakta oallokerad inbetalning som full settlement

## Fler bindande proof-ledger-regler för specialfall

- `KIN-P0011` får bara användas när chargeback eller PSP-reversal faktiskt skett
- `KIN-P0012` betyder alltid blocked state tills riktig allocation finns

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `KIN-P0001-KIN-P0002`
  - minskar open item på `1510`
- `KIN-P0003-KIN-P0006`
  - skapar eller minskar skuld på `2420`
- `KIN-P0007-KIN-P0008`
  - flyttar fordran till eller från `1686`
- `KIN-P0009`
  - flyttar fordran till `1512`
- `KIN-P0010`
  - flyttar fordran till `1516`
- `KIN-P0012`
  - ingen legal subledger-effekt

## Bindande verifikations-, serie- och exportregler

- `KIN` serie för inkomna betalningar och allocations
- `KRF` serie för refunds
- `KPS` serie för PSP settlements
- `KFA` serie för factoring events

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- rail x allocation mode
- SEK/foreign x exact/partial/overpayment
- invoice/credit/open liability x refund yes/no
- PSP yes/no x fee yes/no x chargeback yes/no

## Bindande fixture-klasser för kundinbetalnings- och kundreskontraflödet

- `KIN-FXT001` enkel svensk invoice paid in full
- `KIN-FXT002` delbetalning
- `KIN-FXT003` överbetalning
- `KIN-FXT004` customer advance
- `KIN-FXT005` card/PSP settlement
- `KIN-FXT006` factoring
- `KIN-FXT007` dispute
- `KIN-FXT008` blocked unmatched receipt

## Bindande expected outcome-format per scenario

Varje scenario måste uttrycka:
- scenario id
- fixture class
- payment rail
- proof-ledger id
- open-item effect
- customer liability effect
- PSP/factoring/dispute effect

## Bindande canonical verifikationsseriepolicy

- payment allocation och refund får aldrig dela serie med invoice issue
- PSP settlement får aldrig dela serie med vanlig bankinbetalning

## Bindande expected outcome per central scenariofamilj

### `KIN-A001`

- fixture minimum: `KIN-FXT001`
- proof-ledger: `KIN-P0001`
- `1510` stangs
- ingen ny moms

### `KIN-A003`

- fixture minimum: `KIN-FXT003`
- proof-ledger: `KIN-P0003`
- `1510` stangs till sitt öppna belopp
- rest på `2420`

### `KIN-B001`

- fixture minimum: `KIN-FXT005`
- proof-ledger: `KIN-P0007`
- kundfordran flyttas till `1686`
- `1580` får inte användas

### `KIN-E001`

- fixture minimum: `KIN-FXT005`
- proof-ledger: `KIN-P0011`
- chargeback öppnar ny ÄR- eller liability-effekt enligt faktisk reversal

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `KIN-A001` -> `KIN-P0001`
- `KIN-A002` -> `KIN-P0002`
- `KIN-A003` -> `KIN-P0003`
- `KIN-A004` -> `KIN-P0004`
- `KIN-A005` -> `KIN-P0005`
- `KIN-A006` -> `KIN-P0006`
- `KIN-B001` -> `KIN-P0007`
- `KIN-B002` -> `KIN-P0008`
- `KIN-C001` -> `KIN-P0009`
- `KIN-D001` -> `KIN-P0010`
- `KIN-E001` -> `KIN-P0011`
- `KIN-F001` -> `KIN-P0012`

## Bindande testkrav

- unit:
  - OCR reference validation
  - overpayment to `2420`
  - `1686` enforced för PSP receivable
- integration:
  - bank payment full and partial
  - advance then apply to invoice
  - card settlement then PSP payout with fee
  - chargeback
  - factoring transfer
- negative:
  - unmatched receipt blocked
  - refund without liability blocked

## Källor som styr dokumentet

- [Bankgirot: OCR-referenskontroll](https://www.bankgirot.se/tjanster/inbetalningar/bankgiro-inbetalningar/ocr-referenskontroll/)
- [Verksamt: Om du inte får betalt](https://verksamt.se/avtal-fakturering/betalningspaminnelse-och-drojsmalsranta)
- [Skatteverket: Kundförluster - om kunden inte kan betala](https://www.skatteverket.se/foretag/moms/sarskildamomsregler/kundforlusteromkundenintekanbetala.4.5c1163881590be297b58d10.html)
- [BAS: Hur ska försäljning mot kontokort bokföras](https://www.bas.se/2025/10/30/hur-ska-forsaljning-mot-kontokort-bokforas/)
- [Kontoplan BAS 2025](https://www.bas.se/wp-content/uploads/2025/01/Kontoplan-BAS-2025.pdf)
