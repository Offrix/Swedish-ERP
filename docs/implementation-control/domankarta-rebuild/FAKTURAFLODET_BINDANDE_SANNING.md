# FAKTURAFLÖDET_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för hela fakturaflödet.

Detta dokument ska styra:
- repo-arkitektur
- domänmodell
- bokföringsmodell
- reskontra
- momslogik på säljsidan
- kanal- och distributionslogik
- kredit- och korrektionslogik
- kundförlust och tvist
- rapportering
- export
- testmatriser

Ingen kod, inget test, ingen route, ingen migration och ingen runbook får avvika från detta dokument utan att detta dokument skrivs om först.

## Syfte

Fakturaflödet är inte bara:
- skapa faktura
- skicka faktura
- markera betald

Fakturaflödet är hela den bindande sanningen för:
- vad företaget har säljt
- när fordran uppstår
- hur intäkt och moms uppstår
- hur betalningar allokeras
- hur fel korrigeras
- hur kundförluster, tvister, överbetalningar och återbetalningar hanteras
- hur rapporter, momsdeklaration, periodisk sammanställning, huvudbok och SIE4 måste spegla samma sanning

## Omfattning

Detta dokument omfattar minst:
- kundfaktura
- kreditnota
- ändringsfaktura
- samlingsfaktura
- förskottsfaktura
- slutfaktura
- abonnemangsfaktura
- återkommande faktura
- projektfaktura
- milstolpefaktura
- e-faktura
- räntefaktura
- påminnelseavgift
- överbetalning
- underbetalning
- delbetalning
- write-off
- tvistig kundfordran
- befarad förlust
- konstaterad kundförlust
- återvinning av tidigare kundförlust
- kort-/betalmedelsfordran
- factoring/belanad kundfordran
- valutafaktura
- utlägg
- vidarefakturering
- offentlig sektor och Peppol
- svensk omvänd moms
- EU-B2B vara
- EU-B2B tjänst
- tredjelandsexport
- HUS-faktura på seller-sidan
- bokslutsmetodens arsjusteringar för kundfordringar och förskott

Detta dokument omfattar inte:
- hur kundens leverantörsreskontra bokförs
- hur kunden självbeskattar omvänd moms, importmoms eller unionsinterna inköp
- hur kundens ingående moms, utgående moms på köparsidan eller avdragsrätt bokförs
- hur kundens AP-betalning, AP-matchning eller AP-kreditnota bokförs

Kanonisk agarskapsregel:
- `FAKTURAFLODET_BINDANDE_SANNING.md` äger bara säljarens verklighet
- säljarens dokumentkrav, intäkt, kundfordran, seller-side momskonton, distributionskanal, kredit och kundreskontra ska definieras har
- `MOMSFLODET_BINDANDE_SANNING.md` äger slutlig box mapping, periodisk sammanställning, OSS, replacement declarations och all slutlig momsrapporterings-truth för samma seller-side source effects
- all efterföljande incoming payment-, open-item-, overpayment-, customer advance-, PSP-, factoring- och refundtruth efter issue ägs av `KUNDINBETALNINGAR_OCH_KUNDRESKONTRA_BINDANDE_SANNING.md`
- klassningen mellan verkligt kundutlägg och vidarefakturering av bolagets eget inköp på buyer- eller claim-sidan ägs av `UTLAGG_OCH_VIDAREFAKTURERING_BINDANDE_SANNING.md`; detta dokument äger bara seller-side invoiceutfallet efter handoff
- köparens bokföring får aldrig definieras har som bindande konton, proof-ledger eller AP-poster
- all köparsidesbokforing för omvänd moms, importmoms, unionsinterna inköp och vanlig AP ligger enbart i `LEVFAKTURAFLODET_BINDANDE_SANNING.md`

## Absoluta principer

- En utfardad faktura är append-only.
- En utfardad faktura får aldrig raderas.
- En utfardad faktura får aldrig skrivas över.
- Alla rättelser efter utfardande ska ske som egna förändringsobjekt.
- Proforma får aldrig bokföra intäkt, kundfordran eller moms.
- Fakturasystemet får aldrig gissa momsklass efter utfardande.
- Fakturasystemet får aldrig blanda ihop kundfordran med förskott från kund.
- Fakturasystemet får aldrig blanda ihop överbetalning med intäkt.
- Fakturasystemet får aldrig blanda ihop tvistig kundfordran med kundförlust.
- Fakturasystemet får aldrig blanda ihop utlägg med vidarefakturering.
- Fakturasystemet får aldrig blanda ihop kreditnota med betalning.
- Fakturasystemet får aldrig blanda ihop offentlig e-faktura med PDF via e-post.
- Fakturasystemet får aldrig dolja valutadifferenser i vanliga intäkts- eller bankposter.
- Fakturasystemet får aldrig tillata att momsrapport, huvudbok och kundreskontra visar olika sanning.
- Fakturasystemet får aldrig modellera eller implicit anta köparens AP-bokföring som en del av säljarens proof-ledger.
- Fakturasystemet får aldrig innehålla konton för köparens självbeskattning, till exempel `2614`, `2615`, `2624`, `2625`, `2634`, `2635`, `2645` eller `2647`, som bindande säljarlogik.

## Bindande dokumenthierarki för fakturaflödet

Detta dokument är overordnat:
- gamla ÄR-dokument
- gamla faktureringsrunbooks
- gamla quote-to-cash-skisser
- gamla routebeskrivningar
- gamla testnamn som paminner om fakturering
- gamla green-markeringar

Domäner som måste underordna sig detta dokument:
- kundfakturering och kundreskontra
- moms / bank / betalning
- HUS på kundsidan
- export / SIE4 / rapporter
- migration / replay / correction
- exhaustiv scenarioverifiering

Detta dokument måste samtidigt underordna sig `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` för all voucher creation, seriesattning, kontrollkonton, correction chains, period locks och SIE4-vouchertruth.
Detta dokument måste samtidigt underordna sig `PERIODISERING_OCH_BOKSLUTSOMFORINGAR_BINDANDE_SANNING.md` när revenue timing, upplupen intäkt eller förutbetald intäkt korsar periodgranser och seller-side issue alone inte får vara sista timingtruth.

## Kanoniska objekt

- `InvoiceRoot`
- `InvoiceSeries`
- `InvoiceNumberReservation`
- `InvoiceDocument`
- `InvoiceLine`
- `InvoiceLineTaxClass`
- `InvoiceIssueDecision`
- `InvoiceIssueReceipt`
- `InvoiceDeliveryReceipt`
- `InvoiceChannelEnvelope`
- `InvoiceReminderDecision`
- `InvoiceInterestDecision`
- `InvoicePaymentAllocation`
- `InvoiceOverpaymentRecord`
- `InvoiceUnderpaymentRecord`
- `InvoiceCreditNote`
- `InvoiceAdjustment`
- `InvoiceRefundDecision`
- `InvoiceDisputeDecision`
- `InvoiceWriteOffDecision`
- `InvoiceBadDebtDecision`
- `InvoiceRecoveryDecision`
- `InvoiceFactoringTransfer`
- `InvoiceCardSettlement`
- `InvoiceFxValuation`
- `InvoiceExportReceipt`
- `InvoiceReportReceipt`

## Kanoniska state machines

### `InvoiceDocument`

- `draft`
- `tax_classified`
- `approval_pending`
- `approved`
- `issued`
- `delivered`
- `partially_settled`
- `fully_settled`
- `partially_credited`
- `fully_credited`
- `disputed`
- `written_off_partial`
- `written_off_full`
- `bad_debt_confirmed`
- `closed`

### `InvoicePaymentAllocation`

- `draft`
- `matched`
- `partially_applied`
- `fully_applied`
- `overpaid`
- `underpaid`
- `reversed`
- `refunded`

### `InvoiceCreditNote`

- `draft`
- `issued`
- `applied_partial`
- `applied_full`
- `settled`
- `closed`

### `InvoiceDisputeDecision`

- `open`
- `under_review`
- `accepted`
- `rejected`
- `escalated`
- `resolved`

### `InvoiceBadDebtDecision`

- `draft`
- `evidence_pending`
- `confirmed`
- `recovered_partial`
- `recovered_full`
- `closed`

## Kanoniska commands

- `CreateInvoiceDraft`
- `ClassifyInvoiceTax`
- `ApproveInvoiceIssue`
- `IssueInvoice`
- `DispatchInvoice`
- `RecordInvoiceDeliveryReceipt`
- `AllocateIncomingPayment`
- `RegisterOverpayment`
- `RefundCustomerBalance`
- `IssueCreditNote`
- `IssueAdjustmentInvoice`
- `MoveInvoiceToDispute`
- `ReserveExpectedBadDebt`
- `ConfirmBadDebt`
- `RecoverWrittenOffInvoice`
- `TransferInvoiceToFactoring`
- `RecordCardSettlement`
- `RecordFxRevaluation`
- `LockInvoiceExport`

## Kanoniska events

- `InvoiceDraftCreated`
- `InvoiceTaxClassified`
- `InvoiceApproved`
- `InvoiceIssued`
- `InvoiceDelivered`
- `InvoicePaymentAllocated`
- `InvoiceOverpaymentRegistered`
- `InvoiceRefundExecuted`
- `InvoiceCreditNoteIssued`
- `InvoiceAdjustmentIssued`
- `InvoiceMovedToDispute`
- `InvoiceExpectedBadDebtReserved`
- `InvoiceBadDebtConfirmed`
- `InvoiceBadDebtRecovered`
- `InvoiceTransferredToFactoring`
- `InvoiceCardSettlementRecorded`
- `InvoiceFxDifferenceRecorded`
- `InvoiceExportLocked`

## Kanoniska route-familjer

Canonical route family för fakturasystemet ska vara:
- `/v1/är/invoices/*`
- `/v1/är/credits/*`
- `/v1/är/payments/*`
- `/v1/är/disputes/*`
- `/v1/är/bad-debts/*`
- `/v1/är/exports/*`

Ingen route utanfÃ¶r dessa familjer fÃ¥r skapa eller Ã¤ndra legal-effect invoice truth.

## Kanoniska permissions och review boundaries

- lÃ¥g risk lÃ¤sning:
  - `ar.read`
- fakturautkast:
  - `ar.draft.manage`
- issue och kanalutskick:
  - `ar.issue`
- kredit och ändringsfaktura:
  - `ar.credit.issue`
- write-off:
  - `ar.writeoff.manage`
- kundförlust:
  - `ar.baddebt.confirm`
- Ã¥terbetalning:
  - `ar.refund.execute`
- tvist:
  - `ar.dispute.manage`
- export / e-faktura:
  - `ar.export.manage`

Step-up eller second review krÃ¤vs minst fÃ¶r:
- helkredit efter full betalning
- write-off Ã¶ver policygrÃ¤ns
- konstaterad kundfÃ¶rlust
- Ã¥terbetalning till kund
- omklassning frÃ¥n EU-/exportscenario till svensk momspliktig omsÃ¤ttning eller tvÃ¤rtom

## Nummer-, serie-, referens- och identitetsregler

- varje utfÃ¤rdad faktura ska fÃ¥ lÃ¶pnummer ur explicit serie
- varje kreditnota ska ha egen lÃ¶pnummerlogik men peka pÃ¥ ursprungsfaktura
- ett reserverat nummer fÃ¥r aldrig Ã¥teranvÃ¤ndas tyst
- luckor i nummerserie mÃ¥ste fÃ¥ explicit reason code och receipt
- OCR-referens, kundreferens, orderreferens och Peppol-referenser mÃ¥ste vara first-class fields, inte fria textfÃ¤lt om de anvÃ¤nds fÃ¶r legal-effect distribution eller betalallokering

### OCR- och betalreferensregler

- om OCR anvÃ¤nds mÃ¥ste referensen vara validerad innan issue
- OCR-referensens kontrollsiffra eller motsvarande kontrollregel mÃ¥ste verifieras
- saknad eller ogiltig OCR fÃ¥r inte presenteras som giltig betalreferens
- inbetalningar utan matchbar referens fÃ¥r inte autoallokeras som full sanning utan explicit matchningsregel eller review

## Valuta-, avrundnings- och omräkningsregler

- nÃ¤r svensk moms ska redovisas i SEK mÃ¥ste momsbeloppet uttryckas i SEK Ã¤ven om fakturan Ã¤r i annan valuta
- issue-kurs och payment-kurs mÃ¥ste lagras separat
- valutadifferens ska uppstÃ¥ fÃ¶rst nÃ¤r fordran regleras eller omvÃ¤rderas enligt uttrycklig policy

## Replay-, correction-, recovery- och cutover-regler

- replay av samma source data och samma rulepack fÃ¥r aldrig skapa en ändra issued invoice
- correction efter issue ska alltid skapa ny korrektionstransaktion, aldrig skriva Ã¶ver issue record
- migrerad historisk faktura ska importeras med issue-status, inte rekonstrueras som nytt utkast
- migrerad kreditnota mÃ¥ste peka pÃ¥ ursprungsfaktura Ã¤ven om legacy-kÃ¤llan saknar perfekt relation; dÃ¥ ska explicit migration-link skapas
- cutover fÃ¥r aldrig skapa dubbel kundfordran fÃ¶r samma legacy-faktura
- rollback av issue Ã¤r fÃ¶rbjudet; endast kredit/ändring/kompensation Ã¤r tillÃ¥ten Ã¥tervÃ¤g

## Huvudflödet

1. kommersiell eller operativ grund uppstår
2. fakturabarhet valideras
3. kund, motpartstyp, leveransgrund, leveransdatum och betalvillkor lases
4. revenue class faststalls
5. momsklass, beskattningsland och dokumenttyp faststalls
6. fakturalinjer byggs med radklass, belopp, referenser och dimensioner
7. kanal och obligatoriska metadata valideras
8. intern approval kor om policy kraver det
9. nummer reserveras och faktura utfardas
10. kundreskontra och huvudbok uppdateras
11. distribution sker
12. betalningar eller ändra regleringar allokeras
13. avvikelser hanteras genom påminnelse, ränta, kredit, write-off, tvist, kundförlust, återbetalning eller annan reglerad korrektion
14. rapporter, momsutfall och exporter uppdateras
15. fakturan stangs först när alla sidoeffekter är konsekventa

## Bindande scenarioaxlar

Alla fakturascenarier ska beskrivas som en kombination av scenarioaxlar. Inga testfall får hoppa över axlarna och bara kalla ett scenario "faktura 1".

### A. Affärsgrund

- engångsforsäljning
- abonnemang
- retainer
- serviceavtal
- arbetsorder
- projekt löpande räkning
- projekt fast pris
- milstolpe
- förskott / a conto
- slutfaktura
- internfaktura / intercompany

### B. Motpart

- svensk B2B
- svensk B2C
- offentlig sektor
- koncernbolag
- EU-B2B
- EU-B2C
- tredjeland företag
- tredjeland konsument

### C. Skatte- och momsregim

- svensk 25 procent
- svensk 12 procent
- svensk 6 procent
- blandad moms
- momsfri / undantagen omsattning
- svensk omvänd betalningsskyldighet
- unionsintern varuforsäljning
- unionsintern tjänst enligt huvudregeln
- export utanför EU
- OSS/distansforsäljning där systemet stödjer det
- HUS/ROT/RUT där systemet stödjer det

### D. Dokumenttyp

- fullständig faktura
- förenklad faktura
- ändringsfaktura
- kreditnota
- samlingsfaktura
- självfaktura
- förskottsfaktura
- slutfaktura
- abonnemangsfaktura
- e-faktura
- räntefaktura
- proforma

### E. Kanal

- PDF
- e-post
- print
- portal
- Peppol BIS Billing 3
- annan EDI-kanal
- factoringkanal

### F. Valuta

- SEK
- EUR
- annan affärsvaluta med SEK-redovisning

### G. Betalutfall

- obetald
- fullt betald
- delbetald
- överbetald
- underbetald
- avbetalningsplan
- kortreglerad
- factoringreglerad
- återbetald
- write-off
- kundförlust

### H. Korrektionsutfall

- ändrad före utfardande
- makulerad före utfardande
- helkredit före betalning
- delkredit före betalning
- helkredit efter betalning
- delkredit efter betalning
- prisnedsattning i efterhand
- retur
- felaktig momsbedomning
- tvist
- kundförlust
- återvinning efter kundförlust

### I. Redovisningsmetod

- faktureringsmetoden
- bokslutsmetoden

## Bindande policykartor

### Bindande kontoplanpolicy

Systemet får inte använda ett enda "fakturakonto". Fakturasystemet måste arbeta mot tydliga BAS-familjer.

### Fordringar och narliggande konton

- `1510` Kundfordringar
- `1512` Belanade kundfordringar
- `1513` Kundfordringar - delad faktura
- `1516` Tvistiga kundfordringar
- `1519` Nedskrivning av kundfordringar
- `1686` kort- och PSP-fordringar; canonical konto för fordran mot kort- eller betalmedelsforetag
- `1620` Upparbetad men ej fakturerad intäkt
- `1630` Skattekonto där fakturasidan paverkar skattekonto via ändra domäner
- `1650` Momsfordran där säljarlogik och momslogik moter varandra i rapportering
- `1681` Utlägg för kunder
- `1689` Övriga kortfristiga fordringar
- `1930` Företagskonto

### Kundskulder och förskott

- `2420` Förskott från kunder
- `2421` Ej inlosta presentkort eller motsvarande om produkten stödjer det
- annat explicit kundskuld-/avräkningskonto enligt policy för överbetalningar och tillgodon

### Pågående arbete och intäktsnara skuld/intäktsposter

- `2431` Pågående arbeten, fakturering
- `2970` Förutbetalda intäkter i de fall policy och redovisningsmodell kraver det

### Momsfamiljer på säljsidan

- `2611` Utgående moms 25 %
- `2621` Utgående moms 12 %
- `2631` Utgående moms 6 %
- ändra 26xx-konton för sarskilda momsregimer när policy uttryckligen kraver dem

### Kundförlust, write-off och återvinning

- `6351` Konstaterade förluster på kundfordringar
- `6352` Befarade förluster på kundfordringar
- `3950` Återvunna, tidigare avskrivna kundfordringar

### Valutadifferenser

- `3960` Valutakursvinster på fordringar och skulder av rörelsekaraktar
- `7960` Valutakursförluster på fordringar och skulder av rörelsekaraktar

### Ränta och avgifter

- `831x` Ränteintäkter för dröjsmålsränta enligt policy
- separat icke-momspliktigt avgiftskonto för påminnelseavgift och förseningsersättning enligt policy

### Intäktsfamiljer

Revenue class måste styra explicit till en vald BAS-familj. Systemet får inte anta att allt är `3001`.

Minimikrav på revenue classes:
- svensk vara 25 %
- svensk tjänst 25 %
- svensk 12 %
- svensk 6 %
- svensk momsfri/undantagen
- omvänd moms Sverige
- EU-vara
- EU-tjänst
- export tredjeland
- HUS/ROT/RUT
- frakt
- avgift/tillagg
- rabattreducering
- ränteintäkt

### Bindande defaultkonton per revenue class och radklass

Detta är systemets canonical defaultmapping. Avvikelser får bara ske genom uttrycklig, versionsstyrd konteringspolicy.

- `RC001` svensk momspliktig standard 25 % -> `3001`
- `RC002` svensk momspliktig standard 12 % -> `3002`
- `RC003` svensk momspliktig standard 6 % -> `3003`
- `RC004` svensk momsfri / undantagen omsattning -> `3004`
- `RC005` vara till annat EU-land, svensk momspliktig när sa faktiskt gäller -> `3106`
- `RC006` vara till annat EU-land, momsfri B2B -> `3108`
- `RC007` export av varor utanför EU -> `3105`
- `RC008` tjänster till land utanför EU -> `3305`
- `RC009` tjänster till annat EU-land, omvänd skattskyldighet hos köparen -> `3308`
- `RC010` svensk omvänd moms bygg -> `3231`
- `RC011` fakturerad frakt inom Sverige -> `3520`
- `RC012` fakturerad frakt till annat EU-land -> `3521`
- `RC013` fakturerad frakt export -> `3522`
- `RC014` faktureringsavgift inom Sverige -> `3540`
- `RC015` faktureringsavgift till annat EU-land -> `3541`
- `RC016` faktureringsavgift export -> `3542`
- `RC017` vidarefakturerade resekostnader -> `3550`
- `RC018` övriga fakturerade kostnader -> `3590`
- `RC019` lamnade kassarabatter -> `3731`
- `RC020` ores- och kronutjamning -> `3740`
- `RC021` dröjsmålsränta -> `8313`

Kundtillgodohavande, överbetalningar och kreditobalanser ska som canonical default ligga på `2420` tills de antingen:
- allokeras mot ny faktura
- kvittas mot kreditnota
- återbetalas

## Bindande canonical proof-ledger med exakta konton eller faltutfall

Varje `P000x` nedan är en bindande canonical posting rule. Kod, tester och replay verifiering ska bygga mot dessa regler.

### P0001 Svensk standardfaktura 25 %

Vid utfardande:
- debet `1510` Kundfordringar = brutto
- kredit `3001` Försäljning inom Sverige, 25 % = netto
- kredit `2611` Utgående moms, 25 % = moms

### P0002 Svensk standardfaktura 12 %

Vid utfardande:
- debet `1510` = brutto
- kredit `3002` Försäljning inom Sverige, 12 % = netto
- kredit `2621` = moms

### P0003 Svensk standardfaktura 6 %

Vid utfardande:
- debet `1510` = brutto
- kredit `3003` Försäljning inom Sverige, 6 % = netto
- kredit `2631` = moms

### P0004 Svensk momsfri / undantagen faktura

Vid utfardande:
- debet `1510` = brutto
- kredit `3004` = netto

Ingen utgående moms får bokas.

### P0005 Faktura med blandade momssatser

Vid utfardande:
- debet `1510` = total brutto
- kredit `3001` = summa netto 25 %-rader
- kredit `3002` = summa netto 12 %-rader
- kredit `3003` = summa netto 6 %-rader
- kredit `2611` = moms 25 %-rader
- kredit `2621` = moms 12 %-rader
- kredit `2631` = moms 6 %-rader

### P0006 Frakt på svensk faktura

Vid utfardande:
- debet `1510`
- kredit `3520` = fraktnetto
- kredit relevant momsfamilj = fraktmoms

Frakten får inte blandas in i huvudintäktskontot om policy sager separat fraktspÃ¥r.

### P0007 Faktureringsavgift inom Sverige

Vid utfardande:
- debet `1510`
- kredit `3540` = avgiftsnetto
- kredit `2611` = moms på avgiften när svensk 25 % moms ska tas ut

### P0008 Export av varor utanför EU

Vid utfardande:
- debet `1510` = brutto
- kredit `3105` = netto

Ingen svensk moms.

### P0009 Vara till annat EU-land, momsfri B2B

Vid utfardande:
- debet `1510` = brutto
- kredit `3108` = netto

Ingen svensk moms.

Giltigt VAT-nummer och unionsintern bevisning är obligatorisk.

### P0010 Tjänst till annat EU-land, huvudregeln B2B

Vid utfardande:
- debet `1510` = brutto
- kredit `3308` = netto

Ingen svensk moms.

### P0011 Tjänst till land utanför EU

Vid utfardande:
- debet `1510` = brutto
- kredit `3305` = netto

Ingen svensk moms när regelverket ger den behandlingen.

### P0012 Svensk omvänd moms, bygg

Vid utfardande:
- debet `1510` = brutto
- kredit `3231` = netto

Ingen kredit på `2611`, `2621` eller `2631`.

### P0013 Förskott från kund innan slutlig faktura

Vid betalning:
- debet `1930` = mottaget belopp
- kredit `2420` = mottaget belopp

Ingen kundfordran och ingen slutlig intäkt får uppsta har.

### P0014 Slutfaktura som avräknar förskott

Vid utfardande:
- debet `1510` = brutto slutlig faktura
- kredit relevant revenue class-konto = netto
- kredit relevant momsfamilj = moms

Vid avräkning av tidigare förskott:
- debet `2420` = avräknat förskott
- kredit `1510` = avräknat förskott

### P0015 Full betalning till bank

Vid betalning:
- debet `1930` = mottaget belopp
- kredit `1510` = allokerat belopp

### P0016 Kortbetalning med inlosenavgift

Vid allokering mot faktura:
- debet `1686` = reglerat fakturabelopp
- kredit `1510` = reglerat fakturabelopp

Vid avräkning från inlosenforetag:
- debet `1930` = utbetalt nettobelopp
- debet `6570` = kort- eller bankavgift
- kredit `1686` = ursprungligt belopp

### P0017 Delbetalning

Vid varje delbetalning:
- debet `1930` = mottaget delbelopp
- kredit `1510` = allokerat delbelopp

Restbelopp kvarstar på `1510`.

### P0018 Underbetalning

Vid betalning:
- debet `1930` = mottaget belopp
- kredit `1510` = mottaget belopp

Kvarvarande saldo är fortsatt kundfordran på `1510`.

### P0019 Överbetalning

Vid betalning:
- debet `1930` = mottaget belopp
- kredit `1510` = fakturans slutliga saldo
- kredit `2420` = överbetalning eller kundtillgodohavande

### P0020 Återbetalning av överbetalning

Vid återbetalning:
- debet `2420` = återbetalt belopp
- kredit `1930` = återbetalt belopp

### P0021 Helkredit av obetald svensk 25 %-faktura

Vid kreditnota:
- debet `3001` = krediterat netto
- debet `2611` = krediterad moms
- kredit `1510` = krediterat brutto

### P0022 Delkredit av obetald svensk 25 %-faktura

Vid delkredit:
- debet `3001` = krediterat delnetto
- debet `2611` = krediterad delmoms
- kredit `1510` = krediterat delbrutto

### P0023 Helkredit efter full betalning

Vid kreditnota:
- debet `3001` = krediterat netto
- debet `2611` = krediterad moms
- kredit `2420` = kundtillgodohavande

Vid återbetalning:
- debet `2420`
- kredit `1930`

### P0024 Delkredit efter full betalning

Vid delkredit:
- debet `3001` = delnetto
- debet `2611` = delmoms
- kredit `2420` = delbrutto

### P0025 Kassarabatt i efterhand

Vid rabattkreditering:
- debet `3731` = rabattnetto
- debet relevant momsfamilj = rabattmoms
- kredit `1510` eller `2420` beroende på om fakturan är obetald eller redan betald

### P0026 Ores- och kronutjamning

Vid godkänd avrundningsdifferens:
- debet eller kredit `3740`
- motpost på `1510`

Annan write-off-logik får inte doljas som oresavrundning.

### P0027 Tvistig kundfordran

Vid omklassning till tvist:
- debet `1516` = tvistigt belopp
- kredit `1510` = tvistigt belopp

### P0028 Befarad kundförlust

Vid reservering:
- debet `6352` = reservbelopp
- kredit `1519` = reservbelopp

### P0029 Konstaterad kundförlust på momspliktig svensk faktura

Vid konstaterad kundförlust:
- debet `6351` = netto
- debet relevant momsfamilj = moms som får minskas
- kredit `1510` = brutto

### P0030 Återvunnen tidigare avskriven kundfordran

Vid återvinning:
- debet `1930` = återvunnet brutto
- kredit `3950` = återvunnet netto
- kredit relevant momsfamilj = moms som ska redovisas igen

### P0031 DrÃ¶jsmalsränta

Vid utfardad räntefaktura:
- debet `1510` = räntebelopp
- kredit `8313` = räntebelopp

Ingen moms.

### P0032 Påminnelseavgift eller förseningsersättning

Vid utfardad avgiftsfaktura:
- debet `1510` = avgiftsbelopp
- kredit policyvalt icke-momspliktigt avgiftskonto = avgiftsbelopp

Ingen moms.

### P0033 Utlägg för kund

När utlägget uppstår:
- debet `1681` = utläggsbelopp
- kredit bank eller leverantörsskuld = utläggsbelopp

När utlägget tas upp på kundfaktura:
- debet `1510` = utläggsbelopp
- kredit `1681` = utläggsbelopp

Ingen egen moms på utläggsdelen.

### P0034 Vidarefakturering av kostnad

När kostnaden vidarefaktureras som egen omsattning:
- debet `1510` = brutto
- kredit `3550` eller `3590` enligt radklass = netto
- kredit relevant momsfamilj = moms

### P0035 Factoring eller belaning av kundfordran

Vid flytt:
- debet `1512` = flyttat belopp
- kredit `1510` = flyttat belopp

Vid slutlig reglering:
- debet `1930` = utbetalt nettobelopp
- debet avgiftskonto för factoringavgift
- kredit `1512` = reglerat bruttobelopp

### P0036 Valutafaktura med kursvinst

Vid utfardande:
- debet `1510` = fakturans SEK-värde på fakturadagen
- kredit relevant revenue class-konto = SEK-netto
- kredit relevant momsfamilj eller ingen moms enligt scenario

Vid betalning:
- debet `1930` = slutligt SEK-inflöde
- kredit `1510` = ursprungligt bokfört SEK-belopp
- kredit `3960` = kursvinst

### P0037 Valutafaktura med kursförlust

Vid betalning:
- debet `1930` = slutligt SEK-inflöde
- debet `7960` = kursförlust
- kredit `1510` = ursprungligt bokfört SEK-belopp

### P0038 Bokslutsmetoden, arsjustering av obetalda kundfakturor

Vid bokslut för obetalda utfardade kundfakturor som ska bokas upp:
- debet `1510` = brutto
- kredit relevant revenue class-konto = netto
- kredit relevant momsfamilj = moms

### P0039 Bokslutsmetoden, arsjustering av förskott från kunder

Vid bokslut ska kundforskjutna belopp ligga kvar på `2420` tills de är slutligt reglerade mot faktura eller annan korrekt intäktslogik.

### P0040 Offentlig e-faktura med Peppol

Bokföringsposten följer underliggande fakturascenario, normalt `P0001`-`P0012`.

Det bindande tillagget är:
- ingen utskickskanal får nedgraderas till PDF om offentlig e-faktura krävs
- `InvoiceDeliveryReceipt` måste visa godkänd elektronisk kanal

## Bindande rapport-, export- och myndighetsmappning

### Bindande momsrutekarta för fakturaflödet

Detta är canonical rapportmappning för säljsidan. Varje scenario ska explicit peka på en eller flera av dessa rutor eller uttryckligen markeras som "inte i svensk momsdeklaration".

- svensk momspliktig försäljning och förskott som ska momsredovisas i Sverige:
  - beskattningsunderlag i `fält 05`
  - utgående moms i `fält 10`, `11` eller `12`
- uttag:
  - beskattningsunderlag i `fält 06`
  - utgående moms i `fält 10`, `11` eller `12`
- VMB:
  - beskattningsunderlag i `fält 07`
  - utgående moms i `fält 10`, `11` eller `12`
- frivilligt momspliktig uthyrning:
  - beskattningsunderlag i `fält 08`
  - utgående moms i `fält 10`, `11` eller `12`
- unionsintern varuforsäljning B2B:
  - beskattningsunderlag i `fält 35`
  - dessutom periodisk sammanställning
- export av varor utanför EU:
  - beskattningsunderlag i `fält 36`
- tjänster till beskattningsbar person i annat EU-land enligt huvudregeln:
  - beskattningsunderlag i `fält 39`
  - dessutom periodisk sammanställning när skatteplikt och VAT-nummerkrav är uppfyllda
- övriga tjänster tillhandahallna utomlands:
  - beskattningsunderlag i `fält 40`
- svensk omvänd betalningsskyldighet där köparen är betalningsskyldig i Sverige:
  - beskattningsunderlag i `fält 41`
- momsfri/undantagen försäljning som inte hor hemma i annat fält:
  - beskattningsunderlag i `fält 42`
- OSS-försäljning som redovisas i sarskild momsdeklaration:
  - ska inte redovisas i svensk ordinarie momsdeklaration för samma omsattning

Om en kreditnota, kundförlust eller prisnedsattning minskar tidigare redovisad försäljning ska motsvarande minskning ske i samma ruta som den ursprungliga omsattningen tillhor.

## Bindande scenariofamilj till proof-ledger och rapportspar

Varje scenariofamilj nedan måste implementeras sa att den landar i exakt proof-ledger och exakt rapportspÃ¥r.

### Grundfakturering

- `INV-A001` -> `P0001`, `RC001`, momsruta `05/10`, reskontra `1510`, export `SIE4 + ÄR + huvudbok`
- `INV-A002` -> `P0002`, `RC002`, momsruta `05/11`, reskontra `1510`, export `SIE4 + ÄR + huvudbok`
- `INV-A003` -> `P0003`, `RC003`, momsruta `05/12`, reskontra `1510`, export `SIE4 + ÄR + huvudbok`
- `INV-A004` -> `P0001`, `RC001`, momsruta `05/10`, reskontra `1510`, export `SIE4 + ÄR + huvudbok`
- `INV-A005` -> `P0002`, `RC002`, momsruta `05/11`, reskontra `1510`, export `SIE4 + ÄR + huvudbok`
- `INV-A006` -> `P0003`, `RC003`, momsruta `05/12`, reskontra `1510`, export `SIE4 + ÄR + huvudbok`
- `INV-A007` -> `P0005`, blandade `RC001/RC002/RC003`, momsruta `05/10/11/12`, reskontra `1510`
- `INV-A008` -> `P0005` + `P0004`, kombinerad momsruta `05` och eventuellt `42` för undantagen del enligt policy, reskontra `1510`
- `INV-A009` -> `P0004`, `RC004`, momsruta `42` när undantagsfallet inte hor hemma i annat fält, reskontra `1510`
- `INV-A010` -> arver `P0001/P0002/P0003/P0004` beroende på skattespÃ¥r men måste dessutom klara dokumentregler för förenklad faktura
- `INV-A011` -> arver underliggande `P0001-P0012` per rad men måste kunna summera flera leveransgrunder på samma dokument utan att tappa radvis moms- eller intäktsklass
- `INV-A012` -> arver underliggande `P0001-P0012`, men self-billing-bevis och motpartsaccept måste finnas
- `INV-A013` -> ingen `P000x`, ingen huvudbok, ingen momsruta, ingen reskontra

### Kanal och distribution

- `INV-B001` -> arver underliggande `P000x`, kanalreceipt `PDF`
- `INV-B002` -> arver underliggande `P000x`, kanalreceipt `EMAIL`
- `INV-B003` -> arver underliggande `P000x`, kanalreceipt `PORTAL`
- `INV-B004` -> arver underliggande `P000x`, kanalreceipt `PRINT`
- `INV-B005` -> `P0040` + underliggande `P000x`, kanalreceipt `PEPPOL`, offentlig e-faktura-policy blockerande
- `INV-B006` -> `P0040` + underliggande `P000x` eller annan explicit EDI-policy
- `INV-B007` -> ingen ny bokföring; kanalbyte är tillatet endast före `issued`
- `INV-B008` -> ingen ny bokföring; ny kanalreceipt får skapas men ursprunglig issue receipt måste bevaras

### Förskott, milstolpar och abonnemang

- `INV-C001` -> `P0013`, ingen momsruta om inte förskottet enligt scenario ska momsredovisas direkt; annars `05/10-12` enligt Skatteverkets regel för förskott i svensk momspliktig omsattning
- `INV-C002` -> `P0014`, momsruta enligt slutlig underliggande omsattning, reskontra `1510` efter avräkning
- `INV-C003` -> flera `P0013` + en `P0014`
- `INV-C004` -> underliggande `P0001-P0012` per milstolpe, eventuellt `1513` om delad faktura-policy används
- `INV-C005` -> underliggande `P0001-P0012` med `1513` i stallet för `1510` där canonical policy uttryckligen valt delad faktura
- `INV-C006` -> underliggande `P0001-P0004` beroende på momsklass
- `INV-C007` -> samma som `INV-C006` men med fornyelse- och indexbevis
- `INV-C008` -> kan krava `P0021-P0025` för pro rata-kredit/ändring plus ny utstallning
- `INV-C009` -> slutreglering med `P0021-P0025` och/eller `P0014` beroende på förskott och förutbetalda delar

### Projekt och uppdrag

- `INV-D001` -> underliggande `P0001-P0005` plus projektdimensioner
- `INV-D002` -> underliggande `P0001-P0014` beroende på a conto/slutfaktura
- `INV-D003` -> underliggande `P0001-P0005` med arbetsorderreferens
- `INV-D004` -> `P0005` + eventuellt `P0033/P0034` för utlägg/vidarefakturering
- `INV-D005` -> `P0033`, ingen egen moms på utläggsdelen
- `INV-D006` -> `P0034`, egen moms enligt vidarefakturerad prestation
- `INV-D007` -> `1620` som separat projekt-/WIP-spÃ¥r och sedan underliggande `P0001-P0014` när faktura utfardas

### Betalutfall

- `INV-E001` -> `P0015`
- `INV-E002` -> två iterationer av `P0017`
- `INV-E003` -> flera iterationer av `P0017`
- `INV-E004` -> `P0018`
- `INV-E005` -> `P0019`
- `INV-E006` -> `P0019` + `P0020`
- `INV-E007` -> upprepad `P0017` under avbetalningsplan
- `INV-E008` -> `P0016`
- `INV-E009` -> underliggande `P0015` men med kanalmarkering för direktbetalning
- `INV-E010` -> `P0035`

### Kredit och ändra korrektioner

- `INV-F001` -> `P0021`
- `INV-F002` -> `P0022`
- `INV-F003` -> `P0023`
- `INV-F004` -> `P0024`
- `INV-F005` -> `P0024` eller `P0025` beroende på om korrektionen är rabatt eller ren prisreduktion
- `INV-F006` -> `P0021-P0024` beroende på hel/del och betalstatus, plus lager/returflöde i annan domän
- `INV-F007` -> kredit enligt `P0021-P0024` + ny korrekt utstallning via relevant `P000x`
- `INV-F008` -> kredit enligt `P0021-P0024` + ny korrekt utstallning via relevant `P000x`
- `INV-F009` -> kredit av fel konto-spÃ¥r + ny korrekt utstallning; fel revenue class får aldrig rattas tyst
- `INV-F010` -> kredit/ändringsfaktura som reverserar fel moms i samma ruta som ursprunglig omsattning och ny korrekt utstallning
- `INV-F011` -> `P0026` eller `P0013` beroende på om det är avrundning eller policytillaten write-off

### Fordransproblem

- `INV-G001` -> `P0032`, ingen momsruta
- `INV-G002` -> `P0031`, ingen momsruta
- `INV-G003` -> `P0027`, ingen ny momsruta, reskontra flytt till `1516`
- `INV-G004` -> `P0028`, ingen momsreversering, huvudbok `6352/1519`
- `INV-G005` -> `P0029`, minska ursprunglig moms- och försäljningsruta proportionellt
- `INV-G006` -> `P0030`, återlagg moms i relevant momsruta
- `INV-G007` -> arver underliggande fordrans- och avgiftsspÃ¥r, ingen automatisk kundförlust
- `INV-G008` -> arver underliggande fordrans- och avgiftsspÃ¥r, ingen automatisk kundförlust

### Svensk sarskild moms

- `INV-H001` -> `P0012`, momsruta `41`
- `INV-H002` -> `P0012`, momsruta `41`
- `INV-H003` -> `P0012` eller annan explicit reverse-charge policy, momsruta `41`
- `INV-H004` -> `P0034`, momsruta normalt `05/10-12`
- `INV-H005` -> `P0033`, normalt ingen moms på utläggsdelen
- `INV-H006` -> `P0031` eller `P0032`, ingen moms

### EU och internationellt

- `INV-I001` -> `P0009`, momsruta `35`, periodisk sammanställning ja
- `INV-I002` -> `P0010`, momsruta `39`, periodisk sammanställning ja när VAT-nummerkrav är uppfyllt
- `INV-I003` -> blockerad tills VAT-krav är uppfyllt eller omklassad till svensk momspliktig försäljning `P0001-P0003`
- `INV-I004` -> svensk moms eller annan policy beroende på faktiskt regelverk; om OSS anvÃ¤nds ska inte svensk ordinarie momsdeklaration belastas för samma omsattning
- `INV-I005` -> `P0008`, momsruta `36`
- `INV-I006` -> `P0011`, momsruta `40`
- `INV-I007` -> `P0036` eller `P0037` beroende på kursutfall
- `INV-I008` -> `P0036` eller `P0037` beroende på kursutfall
- `INV-I009` -> `P0036/P0037`

### Offentlig sektor

- `INV-J001` -> `P0040` + relevant underliggande `P000x`
- `INV-J002` -> underliggande `P000x`, men utfardande blockeras utan obligatorisk referens
- `INV-J003` -> `P0040` + underliggande `P000x`; ny kanalreceipt men ingen ny intäkt bara för omdistribution

### HUS

- `INV-K001` -> seller-side kunddel enligt relevant `P0001-P0004`; statlig anspraksdel måste hanteras i HUS-domän med separat fordran
- `INV-K002` -> kundens del regleras enligt `P0015` eller annan betalallokering; anspraksdelen följer HUS-domänens ersättningsspÃ¥r
- `INV-K003` -> delbetalning enligt `P0017` på kunddelen
- `INV-K004` -> kredit på kundfakturan enligt `P0021-P0024` beroende på status innan HUS-ansokan
- `INV-K005` -> kredit/korrektion på kundsidan enligt `P0021-P0024` plus separat HUS-ersättningskorrektion i HUS-domän

### Redovisningsmetod och bokslut

- `INV-L001` -> alla relevanta `P0001-P0037` under faktureringsmetoden
- `INV-L002` -> samma affärslogik som `INV-L001` men arsjusteringar enligt K1/BFN
- `INV-L003` -> `P0038`
- `INV-L004` -> `P0039`
- `INV-L005` -> periodgranskontroll; om faktura är utfardad ska den bokas i rätt period enligt faktureringsreglerna, distributionstidpunkt får inte skapa annan redovisningssanning

## Tvingande dokument- eller indataregler

Varje `InvoiceDocument` måste klassas till exakt en dokumenttyp innan `IssueInvoice`.

Detta är bindande:
- ett scenario får aldrig issue:as på en "nastan korrekt" faktura
- om Skatteverket eller annan officiell källtext anger att uppgifter "bör finnas" för att ett skattereduktions- eller specialregimflöde ska godkännas, upphöjer canonical produktpolicy dessa uppgifter till blockerande minimum för de berörda flödena
- `0 % moms` är aldrig ett tillatet tillstand utan laglig orsakskod, korrekt hansvisningstext och korrekt scenariofamilj
- buyer/seller identity, VAT-status, legal reason code och dokumenttyp måste alltid vara konsistenta med samma `P00xx`-ledgerregel
- en faktura som saknar kravda fält får aldrig utfardas, exporteras, skickas till Peppol eller ligga till grund för moms-, HUS- eller periodisk-sammanställningsutfall

### Fullständig faktura

För fullständig faktura gäller detta som legal minimum och canonical product policy:
- utfardandedatum är obligatoriskt
- unikt lopnummer i godkänd serie är obligatoriskt
- säljarens namn och adress är obligatoriskt
- säljarens momsregistreringsnummer är obligatoriskt
- köparens namn och adress är obligatoriskt
- köparens momsregistreringsnummer är obligatoriskt när köparen är betalningsskyldig för förvärvet eller när annat specialfall uttryckligen kraver detta
- varornas mangd och art eller tjänsternas omfattning och art är obligatoriskt
- leverans-/tillhandahallandedatum eller förskottsdatum är obligatoriskt när det kan faststallas och skiljer sig från fakturadatum
- beskattningsunderlag per momssats eller undantag är obligatoriskt
- enhetspris exklusive moms är obligatoriskt
- prissankning eller rabatt som inte ingar i enhetspriset är obligatoriskt
- tillämpad momssats är obligatorisk när omsattningen inte är undantagen eller seller-side reverse charge gäller
- momsbelopp är obligatoriskt när svensk moms debiteras på säljarens sida
- sarskild hansvisning eller specialtext är obligatorisk när undantag, reverse charge, export, unionsintern handel, VMB eller självfakturering gäller
- ursprungsfakturareferens är obligatorisk på ändringsfaktura och kreditnota

Canonical product policy har dessutom dessa hårda tillagg:
- svensk juridisk person på B2B-faktura ska, när uppgift finns i masterdata, presenteras med organisationsnummer utover namn och adress
- faktura i annan valuta med svensk utgående moms måste visa momsbelopp i SEK och ange använd omräkningsgrund
- varje faktura måste lagra ett explicit `invoice_form_profile` som minst har ett av:
  - `full_standard`
  - `full_reverse_charge_domestic`
  - `full_eu_goods_b2b`
  - `full_eu_services_b2b`
  - `full_export_goods`
  - `full_export_service`
  - `full_rot`
  - `full_rut`
  - `full_green_tech`
  - `full_vmb`
  - `full_public_peppol`

### Förenklad faktura

Förenklad faktura får bara användas när minst ett av dessa villkor är sant:
- totalbeloppet overstiger inte `4 000 SEK` inklusive moms
- handelsbruk, administrativ praxis eller tekniska förutsattningar gör fullständig faktura oskalig
- dokumentet är en ändringsfaktura
- säljaren är momsbefriad på grund av arsomsattning som omfattas av undantaget i `18 kap. 4 ML`

Förenklad faktura får inte användas:
- till köpare i annat EU-land när köparen är skyldig att redovisa och betala moms på inköpet i sitt land
- för offentlig e-faktura där mottagaren eller kanalprofilen kraver full struktur
- för ROT, RUT eller grön teknik
- för svensk reverse charge
- för unionsintern vara B2B
- för unionsintern tjänst B2B
- för exportscenarier som kraver sarskild hansvisning och full sparbarhet

Obligatoriska fält på förenklad faktura:
- utfardandedatum
- identifiering av säljaren genom momsregistreringsnummer, personnummer eller organisationsnummer
- identifiering av vilken typ av vara eller tjänst som säljts
- den moms som ska betalas eller uppgifter som gör den beräkningsbar
- vid ändringsfaktura: otvetydig referens till ursprungsfakturan och vilka uppgifter som ändrats
- vid momsbefrielse på grund av liten omsattning: text om undantag från momsplikt enligt `18 kap. 4 ML`

### Ändringsfaktura / kreditnota

Ändringsfaktura eller kreditnota måste:
- ha eget utfardandedatum samma dag som dokumentet faktiskt stalls ut
- referera otvetydigt till ursprungsfakturans lopnummer
- ange vilka uppgifter som ändras i forhallande till ursprungsfakturan
- innehålla samma baskrav som en fullständig eller förenklad faktura beroende på vilket ursprungsprofilfall som är tillatet
- aldrig radera, skriva över eller förstora ursprungsdokumentets legal-effect truth

Canonical product policy:
- kreditnota får aldrig skapas utan `original_invoice_id`
- kreditnota får aldrig issue:as om ursprungsfakturan är `draft` eller `approval_pending`
- prisnedsattning i efterhand utan momsandring får bara vara tillaten om separat regel finns för scenariot; annars måste moms paverkas via ändringsfaktura

### Proforma

Proforma måste vara icke-bokföringsdrivande och måste:
- ha ordet `PROFORMA` tydligt på dokumentet
- sakna reskontraeffekt
- sakna momsruteeffekt
- sakna kundfordran
- sakna SIE4-exporteffekt
- blockerad för `DispatchInvoice` på offentliga e-fakturakanaler

### Självfakturering

När köparen staller ut fakturan för säljarens räkning gäller:
- texten `Sjalvfakturering` måste sta på fakturan
- separat löpande nummerserie måste användas för säljaren
- det måste finnas ett gillt avtal om självfakturering
- det måste finnas ett verifierbart godkännandeförfarande mellan köpare och säljare
- samma fullständiga eller förenklade fakturakrav gäller som för motsvarande underliggande scenario

## Bindande legal reason-code-katalog eller specialorsakskatalog

### Fakturaflödets legal reason-code-katalog för 0 %, undantag och sarskilda hansvisningar

Systemet ska lagra en canonical `legal_reason_code` på varje fakturarad och summera till dokumentnivans `document_legal_reason_bundle`.

Följande reason codes är bindande minimum:

- `LR-SELF-001`
  - används för självfakturering
  - utskriftstext: `Sjalvfakturering`

- `LR-EXM-001`
  - generellt undantag från momsplikt när faktureringsskyldighet anda finns
  - tillaten utskriftstext:
    - `Undantag från momsplikt`
    - relevant bestammelse i ML
    - relevant bestammelse i mervardesskattedirektivet

- `LR-EXM-002`
  - momsbefrielse på grund av liten omsattning
  - canonical utskriftstext:
    - `Undantagen från momsplikt enligt 18 kap. 4 ML`

- `LR-RC-SE-001`
  - svensk omvänd betalningsskyldighet inom landet
  - canonical utskriftstext:
    - `Omvänd betalningsskyldighet`
    - alternativt `Reverse charge`

- `LR-EU-GOODS-001`
  - unionsintern varuforsäljning till momsregistrerad köpare
  - tillaten utskriftstext:
    - `10 kap. 42 ML`
    - `Artikel 138 i mervardesskattedirektivet`
    - `Article 138 of the VAT directive`
    - `Undantagen från skatteplikt`
    - `Exempt`

- `LR-EU-SERV-001`
  - tjänst till beskattningsbar person i annat EU-land enligt huvudregeln
  - canonical utskriftstext:
    - `Omvänd betalningsskyldighet`
    - alternativt `Reverse charge`

- `LR-EXP-GOODS-001`
  - export, säljaren transporterar själv ut varan
  - tillaten utskriftstext:
    - `10 kap. 64 1 ML`
    - `Article 146(1)(a) of the VAT directive`
    - `Undantagen från skatteplikt`
    - `Exempt`

- `LR-EXP-GOODS-002`
  - export, speditor/fraktforare för ut varan
  - tillaten utskriftstext:
    - `10 kap. 64 2 ML`
    - `Articles 146(1)(a) and (b) of the VAT directive`
    - `Undantagen från skatteplikt`
    - `Exempt`

- `LR-EXP-GOODS-003`
  - export, köpare utan etablering i Sverige hamtar varan för direkt utforsel
  - tillaten utskriftstext:
    - `10 kap. 64 3 ML`
    - `Article 146(1)(b) of the VAT directive`
    - `Undantagen från skatteplikt`
    - `Exempt`

- `LR-EXP-SERV-001`
  - tjänst med direkt samband med export eller viss import
  - tillaten utskriftstext:
    - `10 kap. 68 ML`
    - `Article 146(1)(e) of the VAT directive`
    - `Undantagen från skatteplikt`
    - `Exempt`

- `LR-VMB-001`
  - VMB begagnade varor
  - canonical utskriftstext:
    - `Vinstmarginalbeskattning för begagnade varor`
    - `Margin scheme - Second-hand goods`

- `LR-VMB-002`
  - VMB konstverk
  - canonical utskriftstext:
    - `Vinstmarginalbeskattning för konstverk`
    - `Margin scheme - Works of art`

- `LR-VMB-003`
  - VMB samlarforemal och antikviteter
  - canonical utskriftstext:
    - `Vinstmarginalbeskattning för samlarforemal och antikviteter`
    - `Margin scheme - Collector's items and antiques`

- `LR-VMB-004`
  - VMB resebyra
  - canonical utskriftstext:
    - `Vinstmarginalbeskattning för resebyraer`
    - `Margin scheme - Travel agents`

- `LR-ROT-001`
  - rotarbete med skattereduktion
  - canonical utskriftstext:
    - `ROT-avdrag`

- `LR-RUT-001`
  - rutarbete med skattereduktion
  - canonical utskriftstext:
    - `RUT-avdrag`

- `LR-GREEN-001`
  - installation av grön teknik med skattereduktion
  - canonical utskriftstext:
    - `Skattereduktion för grön teknik`

Varje `legal_reason_code` måste dessutom ha:
- `official_source_ref`
- `applies_to_invoice_profiles`
- `applies_to_scenario_families`
- `print_text_sv`
- `print_text_en` när EU-/internationellt scenario kraver det
- `requires_buyer_vat_number`
- `requires_no_vat_amount`
- `requires_special_property_identity`
- `requires_tax_reduction_split_per_person`

## Bindande faltspec eller inputspec per profil

### Bindande faltspec per fakturatyp

#### `full_standard`

Obligatoriska fält:
- `issue_date`
- `invoice_number`
- `seller_legal_name`
- `seller_address`
- `seller_vat_number`
- `buyer_legal_name`
- `buyer_address`
- `line_description`
- `line_quantity_or_scope`
- `line_unit_price_ex_vat`
- `line_discount_ex_vat` när rabatt finns
- `tax_base_per_rate_or_exemption`
- `vat_rate_per_line_group`
- `vat_amount`
- `gross_amount`
- `currency_code`
- `due_date` enligt policy
- `payment_reference`

#### `full_reverse_charge_domestic`

Gäller minst `INV-H001`, `INV-H002`, `INV-H003`.

Obligatoriska fält:
- alla fält från `full_standard` utom seller-side `vat_amount` på de reverse-charge-rader som inte ska debiteras med svensk moms
- `buyer_vat_number`
- `legal_reason_code = LR-RC-SE-001`
- utskriftstext `Omvänd betalningsskyldighet` eller `Reverse charge`
- `tax_base_per_reverse_charge_group`
- `seller_org_number` när säljaren är svensk juridisk person
- `buyer_org_number` när köparen är svensk juridisk person och organisationsnummer finns i masterdata

Hard regel:
- systemet får inte debitera svensk utgående moms på säljarens faktura i detta profilfall
- om scenario är byggtjänst inom byggsektorn måste byggklassning och köparens reverse-charge-behörighet vara verifierad före issue

#### `full_eu_goods_b2b`

Gäller minst `INV-I001`.

Obligatoriska fält:
- alla fält från `full_standard`
- `buyer_vat_number`
- `legal_reason_code = LR-EU-GOODS-001`
- en tillaten hansvisningstext enligt `LR-EU-GOODS-001`
- `dispatch_country`
- `destination_country`
- `goods_transport_evidence_ref`

Hard regel:
- svensk moms får inte debiteras
- periodisk sammanställning måste kunna byggas ur samma dokumenttruth

#### `full_eu_services_b2b`

Gäller minst `INV-I002`.

Obligatoriska fält:
- alla fält från `full_standard`
- `buyer_vat_number`
- `legal_reason_code = LR-EU-SERV-001`
- utskriftstext `Omvänd betalningsskyldighet` eller `Reverse charge`
- `service_place_of_supply_basis`

Hard regel:
- om giltigt VAT-nummer saknas ska fakturan blockeras eller omklassas enligt `INV-I003`; systemet får inte issue:a den som momsfri EU-B2B

#### `full_export_goods`

Gäller minst `INV-I005`.

Obligatoriska fält:
- alla fält från `full_standard`
- `legal_reason_code` med exakt exportvariant `LR-EXP-GOODS-001`, `002` eller `003`
- tillaten hansvisningstext för vald exportvariant
- `export_evidence_mode`
- `destination_country`

Hard regel:
- svensk moms får inte debiteras när exportundantaget är valt
- exportvariant får inte valjas utan att exakt transport-/utforselmodell är klassad

#### `full_export_service`

Gäller minst `INV-I006`.

Obligatoriska fält:
- alla fält från `full_standard`
- `legal_reason_code = LR-EXP-SERV-001`
- en tillaten hansvisningstext enligt `LR-EXP-SERV-001`
- `service_export_basis`

#### `full_new_transport_eu`

Gäller när unionsintern försäljning av nytt transportmedel aktiveras.

Obligatoriska fält:
- alla fält från `full_eu_goods_b2b` eller motsvarande unionsintern profil beroende på motpart
- `transport_first_in_use_date`
- `transport_distance_or_usage_metric`
- `transport_type`

Hard regel:
- nytt transportmedel får aldrig issue:as utan uppgift om första bruksdatum och korstracka/användningsmatt när regelverket kraver det

#### `full_vmb`

Gäller när `RC018-021` eller motsvarande VMB-spAr aktiveras.

Obligatoriska fält:
- alla fält från `full_standard` utom seller-side `vat_amount`
- `legal_reason_code` med exakt VMB-variant `LR-VMB-001` till `LR-VMB-004`
- utskriftstext för vald VMB-variant
- `vmb_category`

Hard regel:
- momsbelopp får inte anges på fakturan vid VMB
- vanlig momsrad, momsruta och line tax breakdown får inte presenteras som om vanlig utgående moms debiterats

#### `full_rot`

Gäller minst `INV-K001-K005` när kunddelen avser rotarbete.

Obligatoriska fält:
- alla fält från `full_standard`
- `legal_reason_code = LR-ROT-001`
- `seller_f_tax_status = approved`
- `customer_personnummer`
- `customer_name`
- `work_type_description`
- `work_location_text`
- `work_period_from`
- `work_period_to`
- `rot_property_type`
- vid smahus: `fastighetsbeteckning`
- vid bostadsratt: `brf_org_number`
- vid bostadsratt: `apartment_number`
- `labor_cost_ex_vat`
- `material_cost_ex_vat`
- `other_cost_ex_vat`
- `vat_rate`
- `vat_amount`
- `invoice_total_ex_vat`
- `invoice_total_inc_vat`
- `tax_reduction_amount`
- `customer_amount_to_pay`

När flera personer delar skattereduktionen är detta dessutom obligatoriskt:
- `tax_reduction_split[]` med personnummer, namn och avdragsbelopp per person

Canonical product policy:
- rot/rut FAQ anger att uppgifterna "bör finnas"; i denna produkt är de issue-blockerande för varje faktura som ska ligga till grund för utbetalningsansokan
- avdraget måste framga på varje förskotts-, a conto- eller delfaktura när avdraget ska nyttjas där
- om samma dokument innehåller bade ROT och RUT får det bara issue:as om arbetena redovisas var för sig och olika utbetalningsbegaran kan byggas ur samma dokumenttruth

#### `full_rut`

Gäller minst `INV-K001-K005` när kunddelen avser rutarbete.

Obligatoriska fält:
- alla fält från `full_standard`
- `legal_reason_code = LR-RUT-001`
- `seller_f_tax_status = approved`
- `customer_personnummer`
- `customer_name`
- `work_type_description`
- `work_location_text`
- `work_period_from`
- `work_period_to`
- `labor_cost_ex_vat`
- `material_cost_ex_vat`
- `other_cost_ex_vat`
- `vat_rate`
- `vat_amount`
- `invoice_total_ex_vat`
- `invoice_total_inc_vat`
- `tax_reduction_amount`
- `customer_amount_to_pay`

När flera personer delar skattereduktionen är detta dessutom obligatoriskt:
- `tax_reduction_split[]` med personnummer, namn och avdragsbelopp per person

Canonical product policy:
- om samma dokument innehåller bade ROT och RUT får det bara issue:as om arbetena redovisas var för sig och olika utbetalningsbegaran kan byggas ur samma dokumenttruth

#### `full_green_tech`

Gäller när grön teknik-stöd finns i HUS-domänen.

Obligatoriska fält:
- alla fält från `full_standard`
- `legal_reason_code = LR-GREEN-001`
- `seller_f_tax_status = approved`
- `customer_personnummer`
- `customer_name`
- `installation_type`
- `labor_cost_ex_vat`
- `material_cost_ex_vat`
- `other_cost_ex_vat`
- `tax_reduction_amount_inc_vat_basis`
- `invoice_total_amount`
- `customer_amount_to_pay`
- vid smahus: `fastighetsbeteckning`
- vid bostadsratt: `brf_org_number`
- vid bostadsratt: `apartment_number`

När flera personer delar skattereduktionen är detta dessutom obligatoriskt:
- `tax_reduction_split[]` med personnummer, namn och avdragsbelopp per person

Hard regel:
- skattereduktion får bara beräknas på arbete och material, aldrig på övriga kostnader
- kontantbetalning eller presentkort får aldrig godtas som kvalificerande betalning för detta flöde
- om samma kundaffar innehåller separat rotarbete eller annat HUS-nara arbete måste grön teknik-delen vara egen kostnads- och anspraksbucket; systemet får aldrig blanda underlagen

#### `full_public_peppol`

Gäller minst `INV-B005`, `INV-J001-J003`.

Obligatoriska fält:
- underliggande fullständig fakturaprofil
- mottagarens kravda referenser enligt avtal eller myndighetsprofil
- Peppol BIS Billing 3-kompatibla identiteter och delivery metadata

Hard regel:
- dokumentet får inte nedgraderas till PDF eller e-post när offentlig e-faktura krävs

### Bindande field-level blockers per fakturatyp

`IssueInvoice` ska blockeras om nagon av dessa regler bryts:

- `full_standard`
  - seller VAT-nummer saknas
  - buyer namn eller adress saknas
  - line description/scope saknas
  - beskattningsunderlag per skattesats eller undantag saknas
  - momsbelopp saknas trots seller-side momspliktig omsattning
  - valuta är annan an SEK och seller-side svensk moms finns men moms i SEK saknas

- `full_reverse_charge_domestic`
  - buyer VAT-nummer saknas
  - `legal_reason_code` saknas eller inte är `LR-RC-SE-001`
  - text `Omvänd betalningsskyldighet` eller `Reverse charge` saknas
  - seller-side moms debiteras trots reverse charge

- `full_eu_goods_b2b`
  - buyer VAT-nummer saknas
  - unionsintern hansvisning saknas
  - svensk moms debiteras
  - periodisk-sammanställningsidentitet inte kan byggas

- `full_eu_services_b2b`
  - buyer VAT-nummer saknas
  - `Reverse charge`-text saknas
  - place-of-supply basis saknas

- `full_export_goods`
  - exportvariant saknas
  - exporthansvisning saknas
  - svensk moms debiteras trots exportklassning

- `full_export_service`
  - `LR-EXP-SERV-001` saknas
  - exporttjänst-hansvisning saknas

- `full_new_transport_eu`
  - `transport_first_in_use_date` saknas
  - `transport_distance_or_usage_metric` saknas

- `full_vmb`
  - VMB-text saknas
  - momsbelopp anges på fakturan

- `full_rot`
  - kundens personnummer saknas
  - kundens namn saknas
  - arbetsbeskrivning saknas
  - arbetsplats eller tidsperiod saknas
  - fastighetsbeteckning saknas för smahus
  - BRF-orgnr eller lagenhetsnummer saknas för bostadsratt
  - fördelning mellan arbete, material och övrigt saknas
  - totalbelopp exkl/inkl moms eller momsens storlek/procentsats saknas
  - skattereduktionens storlek saknas
  - F-skattuppgift saknas
  - flera fördelningspersoner finns men `tax_reduction_split[]` saknas

- `full_rut`
  - kundens personnummer saknas
  - kundens namn saknas
  - arbetsbeskrivning saknas
  - arbetsplats eller tidsperiod saknas
  - fördelning mellan arbete, material och övrigt saknas
  - totalbelopp exkl/inkl moms eller momsens storlek/procentsats saknas
  - skattereduktionens storlek saknas
  - F-skattuppgift saknas
  - flera fördelningspersoner finns men `tax_reduction_split[]` saknas

- `full_green_tech`
  - kundens namn eller personnummer saknas
  - bostadsidentitet saknas
  - arbete/material/övrigt inte hålls isär
  - skattereduktionens storlek saknas
  - fakturan visar inte avdraget inklusive moms
  - flera fördelningspersoner finns men `tax_reduction_split[]` saknas

- `full_public_peppol`
  - offentlig kanalprofil saknas
  - obligatorisk referens saknas
  - validering mot Peppol BIS Billing 3 misslyckas

### Tvingande policy för 0 % moms

Följande gäller alltid:
- `0 %` får aldrig presenteras som fri text utan `legal_reason_code`
- `0 %` får aldrig användas för att bara "fa igenom" fakturan
- varje `0 %`-rad måste vara klassad som exakt ett av:
  - undantag från momsplikt
  - svensk reverse charge
  - unionsintern varuforsäljning
  - unionsintern tjänst med omvänd skattskyldighet hos köparen
  - export av vara
  - exportnara tjänst
  - VMB eller annat specialregimspAr som uttryckligen förbjuder vanlig momsrad
- om ingen giltig legal reason code finns ska scenariot omklassas till svensk momspliktig omsattning eller blockeras

## Scenariofamiljer som hela systemet måste tacka

Nedan är den bindande scenariofamiljekatalogen. Varje familj ska sedan korsas med alla logiskt giltiga scenarioaxlar.

### A. Grundfakturering

- `INV-A001` svensk B2B 25 % full faktura
- `INV-A002` svensk B2B 12 % full faktura
- `INV-A003` svensk B2B 6 % full faktura
- `INV-A004` svensk B2C 25 %
- `INV-A005` svensk B2C 12 %
- `INV-A006` svensk B2C 6 %
- `INV-A007` blandade momssatser på samma faktura
- `INV-A008` momspliktiga och momsfria rader på samma faktura
- `INV-A009` helt momsfri/undantagen omsattning
- `INV-A010` förenklad faktura
- `INV-A011` samlingsfaktura
- `INV-A012` självfakturering
- `INV-A013` proforma

### B. Kanal och distribution

- `INV-B001` PDF
- `INV-B002` e-post
- `INV-B003` portal
- `INV-B004` print
- `INV-B005` offentlig Peppol-faktura
- `INV-B006` annan EDI-kanal
- `INV-B007` kanalbyte efter skapande men före utfardande
- `INV-B008` kanalavvisning och re-sandning

### C. Förskott, milstolpar och abonnemang

- `INV-C001` förskott från kund
- `INV-C002` slutfaktura med avräknat förskott
- `INV-C003` flera förskott mot en slutlig faktura
- `INV-C004` milstolpefaktura 1 av n
- `INV-C005` delad faktura
- `INV-C006` abonnemang första period
- `INV-C007` abonnemangsfornyelse
- `INV-C008` abonnemangsandring mitt i period
- `INV-C009` abonnemangsavslut med slutreglering

### D. Projekt och uppdrag

- `INV-D001` projekt löpande räkning
- `INV-D002` projekt fast pris
- `INV-D003` arbetsorder till faktura
- `INV-D004` tid och material med blandade momssatser
- `INV-D005` utlägg i projekt
- `INV-D006` vidarefakturering i projekt
- `INV-D007` WIP / upparbetad men ej fakturerad intäkt

### E. Betalutfall

- `INV-E001` full betalning
- `INV-E002` delbetalning i två steg
- `INV-E003` delbetalning i flera steg
- `INV-E004` underbetalning
- `INV-E005` överbetalning
- `INV-E006` överbetalning och senare återbetalning
- `INV-E007` avbetalningsplan
- `INV-E008` kortbetalning
- `INV-E009` Swish/direktbetalning
- `INV-E010` factoring

### F. Kredit och ändra korrektioner

- `INV-F001` helkredit före betalning
- `INV-F002` delkredit före betalning
- `INV-F003` helkredit efter betalning
- `INV-F004` delkredit efter betalning
- `INV-F005` prisnedsattning i efterhand
- `INV-F006` retur
- `INV-F007` omfakturering efter fel på kunddata
- `INV-F008` omfakturering efter fel på pris
- `INV-F009` felaktigt vald revenue class
- `INV-F010` felaktigt debiterad moms
- `INV-F011` write-off av sma differenser

### G. Fordransproblem

- `INV-G001` påminnelseavgift
- `INV-G002` dröjsmålsränta
- `INV-G003` tvistig fordran
- `INV-G004` befarad kundförlust
- `INV-G005` konstaterad kundförlust
- `INV-G006` återvinning efter kundförlust
- `INV-G007` inkasso
- `INV-G008` Kronofogden betalningsforelaggande

### H. Svensk sarskild moms

- `INV-H001` svensk omvänd moms
- `INV-H002` reverse charge bygg
- `INV-H003` reverse charge övriga svenska specialfall som systemet stödjer
- `INV-H004` vidarefakturering med moms
- `INV-H005` utlägg utan moms
- `INV-H006` avgift/ränta utan moms

### I. EU och internationellt

- `INV-I001` unionsintern varuforsäljning B2B
- `INV-I002` unionsintern tjänst B2B
- `INV-I003` EU-B2B utan giltigt VAT-nummer ska blockeras eller omklassas
- `INV-I004` EU-B2C
- `INV-I005` tredjeland export vara
- `INV-I006` tredjeland export tjänst
- `INV-I007` valutafaktura EUR
- `INV-I008` valutafaktura annan valuta
- `INV-I009` valutadifferens vid betalning

### J. Offentlig sektor

- `INV-J001` offentlig kund med Peppolkrav
- `INV-J002` offentlig kund med obligatorisk referens/ordermatchning
- `INV-J003` avvisad e-faktura och korrigerad ny utsandning

### K. HUS

- `INV-K001` HUS-faktura med kundandel och ansokningsbar del
- `INV-K002` HUS-faktura fullt betald av kund
- `INV-K003` HUS-faktura delbetald av kund
- `INV-K004` HUS-kredit före ansokan
- `INV-K005` HUS-kredit efter ansokan

### L. Redovisningsmetod och bokslut

- `INV-L001` faktureringsmetoden, normalfall
- `INV-L002` bokslutsmetoden, normalfall
- `INV-L003` bokslutsmetoden med obetalda kundfordringar vid arsslut
- `INV-L004` bokslutsmetoden med förskott från kund vid arsslut
- `INV-L005` periodgrans med utstalld men ej distribuerad faktura

### M. Specialregimer som måste ha egen ledger eller blockeras

- `INV-M001` vinstmarginalbeskattning, vara
- `INV-M002` vinstmarginalbeskattning, resetjänst
- `INV-M003` frivillig beskattning av uthyrning av verksamhetslokal
- `INV-M004` trepartshandel, mellanmansforsäljning
- `INV-M005` monteringsleverans
- `INV-M006` nytt transportmedel till annat EU-land utan giltigt VAT-nummer hos köparen
- `INV-M007` flerfunktionsvoucher / presentkort
- `INV-M008` enfunktionsvoucher / presentkort
- `INV-M009` konsignationslager / call-off stock om fakturaflödet på staringsdatum berors
- `INV-M010` exportbutik / taxfree / sarskild exportforsäljning

## Scenarioregler per familj

### Grundfaktura

Alla scenarier i familj A ska:
- skapa kundfordran vid utfardande om det inte är förskottsscenario
- skapa explicit intäkt per revenue class
- skapa explicit moms per radklass
- uppdatera kundreskontra
- uppdatera huvudbok
- uppdatera rapportbaser

### Betalning

Alla scenarier i familj E ska:
- allokera mot exakt faktura eller kreditnota
- vara replaybara
- visa oallokerat overskott separat
- aldrig skapa dold automatisk write-off

### Kredit

Alla scenarier i familj F ska:
- bevara ursprungsfakturan
- skapa ny kredit-/ändringstransaktion
- justera moms proportionellt
- justera reskontra och rapporter i samma sanning

### Kundförlust

Alla scenarier i familj G ska:
- skilja tvist, befarad förlust och konstaterad förlust
- bara reducera moms när kundförlusten är konstaterad
- kunna reverseras med återvinning

### Internationellt

Alla scenarier i familj I ska:
- lagra bevis för VAT-nummer, export eller annan skattegrund
- driva periodisk sammanställning där sa krävs
- driva valutaomrakning och valutadifferens korrekt

### Specialregimer

Alla scenarier i familj M ska:
- blockeras om de saknar egen explicit `P00xx`-ledgerregel, egen revenue class och egen momsrutekarta
- aldrig autoomklassas till vanlig svensk standardfaktura bara för att systemet saknar korrekt modell
- bara kunna issue:as efter att dokument-, kanal- och rapportregler för respektive specialregim finns i canonical model

## Blockerande valideringar

Systemet måste stoppa utfardande eller reglering när:
- kundtyp saknas
- motpartens VAT-status saknas där den är kravande
- momsklass saknas
- revenue class saknas
- `invoice_form_profile` saknas
- `legal_reason_code` saknas på `0 %`, undantag, reverse charge, export, VMB eller självfakturering
- buyer namn eller adress saknas på fullständig faktura
- seller VAT-nummer saknas på fullständig faktura
- buyer VAT-nummer saknas i reverse charge-, unionsinterna eller ändra profiler där köparen är betalningsskyldig
- hansvisningstext saknas på undantag, reverse charge, export eller VMB
- moms i SEK saknas när fakturan är i annan valuta men svensk moms ska redovisas
- kanal är ogiltig för offentlig sektor
- kreditnota saknar ursprungsfakturareferens
- förenklad faktura valjs i otillaten situation
- överbetalning inte får ett eget skuld-/tillgodospAr
- utlägg felklassas som vidarefakturering eller tvartom
- kundförlust förbereds utan att vara konstaterad
- write-off overstiger policygranser utan approval
- valuta saknar omräkningsunderlag
- självfakturering saknar texten `Sjalvfakturering`, separat nummerserie eller godkännanderutin
- nytt transportmedel i EU-flöde saknar uppgift om första bruksdatum eller korstracka/användning
- ROT-faktura saknar personnummer, arbetsplats, tidsperiod, kostnadsfordelning, skattereduktionsbelopp eller fastighets-/bostadsrattsidentitet
- RUT-faktura saknar personnummer, arbetsplats, tidsperiod, kostnadsfordelning eller skattereduktionsbelopp
- grön teknik-faktura saknar namn/personnummer, bostadsidentitet, fördelning mellan arbete/material/övrigt eller skattereduktionsbelopp
- flera skattereduktionsmottagare finns men fördelning per person saknas på ROT, RUT eller grön teknik

## Rapport- och exportkonsekvenser

Varje scenariofamilj ska explicit bevisa:
- kundreskontra
- huvudbok
- momsrapport
- periodisk sammanställning där sa krävs
- SIE4
- kanal-/delivery-receipts
- export receipts
- audit/evidence receipts

## Förbjudna förenklingar

- ingen "mark as paid"-flagga utan betalallokering
- ingen "cancel invoice"-knapp efter utfardande som tar bort sanningen
- ingen generell "credit invoice" utan ursprungsref
- ingen generell "misc income" för felklassade fakturarader
- ingen dold autoavrundning som ändrar momsutfall
- ingen dold ihopslagning av olika momssatser
- ingen dold kundförlust på overskotts- eller restbelopp
- ingen dold kanalnedgradering från Peppol till PDF för offentlig sektor

## Fler bindande proof-ledger-regler för specialfall

### P0041 Förenklad faktura under tillaten grans

Den bokföringsmassiga effekten ska vara identisk med motsvarande fullständig faktura:
- svensk 25 % -> `P0001`
- svensk 12 % -> `P0002`
- svensk 6 % -> `P0003`
- momsfri -> `P0004`

Skillnaden ligger bara i dokumentkrav, aldrig i huvudbok eller reskontra.

### P0042 Samlingsfaktura med flera leveranser

Vid utfardande:
- debet `1510` med total brutto
- kredit relevanta revenue class-konton per radgrupp
- kredit relevanta momsfamiljer per radgrupp

Samlingsfaktura får aldrig ersätta radvis momsklassning eller leveransspÃ¥r.

### P0043 Självfakturering

Bokföring följer underliggande scenario `P0001-P0012`.

Det bindande tillagget är:
- sarskild self-billing-markering
- motpartsaccept
- separat dokumentklass

### P0044 Omfakturering efter fel kund

Steg 1:
- kreditera felaktig faktura enligt `P0021-P0024`

Steg 2:
- utfarda ny korrekt faktura enligt relevant `P0001-P0012`

Ingen tyst ändring av kundidentitet är tillaten efter utfardande.

### P0045 Omfakturering efter fel momsbedomning

Steg 1:
- kreditera felaktig faktura i samma momsruta som den ursprungligen redovisades i

Steg 2:
- utfarda ny korrekt faktura enligt rätt `P000x`

### P0046 HUS-faktura seller-side, kundandel

Vid utfardande av kundens egen del:
- debet `1510` med kundens bruttoandel
- kredit relevant HUS-revenue class-konto med netto
- kredit relevant momsfamilj med moms

Statens potentiella ersättningsdel får inte bokas på `1510` som vanlig kundfordran.

### P0047 HUS-kredit före ansokan

Kunddel:
- kredit enligt `P0021-P0024` beroende på om fakturan är obetald eller betald

Ansokningsbar del får inte ligga kvar som oforandrad statlig fordran.

### P0048 HUS-kredit efter ansokan

Kunddel:
- kredit enligt `P0021-P0024`

Statlig del:
- separat HUS-korrektion i HUS-domänen

### P0049 Delad faktura

Vid utfardande när canonical policy valt delad kundfordran:
- debet `1513` med brutto
- kredit relevanta revenue class-konton med netto
- kredit relevanta momsfamiljer med moms

### P0050 Periodgrans, utfardad men ej distribuerad

Om fakturan är utfardad i perioden:
- bokföring följer relevant `P000x` i utfardandeperioden

Distributionsdatum får inte skapa annan redovisningsperiod för samma utstallning.

### P0051 Offentlig e-faktura avvisad av kanal

Ingen ny intäkt, ingen ny kundfordran och ingen ny moms får uppsta enbart för att kanalutskick avvisas.

Korrekt hantering:
- ursprunglig bokföring ligger kvar
- ny kanalreceipt eller nytt kanalutskick skapas
- eventuell ny utfardandehandling får bara ske om tidigare dokument juridiskt ersätts

### P0052 Kanalomdistribution utan ny utfardandehandling

Ingen ny bokföring.

Det enda tillåtna är ny `InvoiceDeliveryReceipt` eller nytt `InvoiceChannelEnvelope`.

### P0053 Policytillaten write-off av smadifferens

Vid write-off:
- debet explicit write-off-konto enligt policy
- kredit `1510`

Moms ska inte roras om differensen bara är betalregleringsdifferens och inte prisnedsattning eller kundförlust.

### P0054 EU-B2B utan giltigt VAT-nummer som omklassas till svensk momspliktig omsattning

Om scenario inte blockeras utan omklassas:
- bokför enligt `P0001-P0003` beroende på momssats
- redovisa i `fält 05` och `10/11/12`

### P0055 Exportforskott

När förskott tas emot för export av vara:
- debet `1930`
- kredit `2420`

När exportfaktura utfardas:
- bokför enligt `P0008`
- rapportspÃ¥r i `fält 36`

### P0056 Frakt till annat EU-land

Vid utfardande:
- debet `1510`
- kredit `3521` med netto
- ingen svensk moms när scenario faktiskt är momsfritt unionsinternt

### P0057 Frakt export

Vid utfardande:
- debet `1510`
- kredit `3522` med netto

Ingen svensk moms.

### P0058 Faktureringsavgift till annat EU-land eller export

Vid utfardande:
- debet `1510`
- kredit `3541` eller `3542` beroende på scenario
- moms enligt samma geografiska momsbedomning som avgiften faktiskt omfattas av

### P0059 Kombinerad faktura med huvudintäkt, frakt och rabatt

Vid utfardande:
- debet `1510` med slutligt brutto
- kredit huvudintäktskonto enligt `RC00x`
- kredit `3520/3521/3522` för fraktdel
- debet `3731` eller annan uttrycklig rabattpost om rabatten ska sarskiljas
- kredit relevant momsfamilj netto efter korrekt radvis momsberakning

### P0060 Ränta och påminnelse på separat dokument

Vid kombinerad reglering:
- faktura 1 bokas enligt underliggande `P000x`
- räntefaktura bokas enligt `P0031`
- påminnelseavgift bokas enligt `P0032`

De får aldrig gommas inne i ursprunglig momspliktig säljintäkt.

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

Detta är canonical reskontraeffekt som måste hållas lika i runtime, rapporter och export.

- `P0001-P0012`, `P0014`, `P0042`, `P0043`, `P0046`, `P0049`, `P0054`, `P0056`, `P0057`, `P0058`, `P0059`:
  - ny öppen reskontrapost skapas
- `P0013`, `P0039`, `P0019`, `P0023`, `P0024`:
  - kundskuld eller tillgodo ska inte ligga som öppen kundfordran
- `P0015-P0018`, `P0020`, `P0031`, `P0032`:
  - befintlig reskontrapost minskar eller ny separat avgifts-/räntepost skapas
- `P0021`, `P0022`:
  - reskontra minskar på ursprungsfakturan eller kvittas mot kreditnota
- `P0027`:
  - saldo flyttas från `1510` till `1516`
- `P0028`:
  - reskontraposten ligger kvar, men huvudbokens riskreservering uppdateras
- `P0029`:
  - reskontraposten stangs som konstaterad kundförlust
- `P0030`:
  - ny inbetalning allokeras mot tidigare avskriven fordran eller separat återvinningsspÃ¥r enligt policy
- `P0035`:
  - reskontraposten flyttas till factoring-/belaningsspÃ¥r

## Bindande verifikations-, serie- och exportregler

- varje utfardandehandling ska ge egen verifikation
- varje kreditnota ska ge egen verifikation
- varje betalallokering ska ge egen verifikation om bokföringsdatum skiljer sig från utfardandet
- varje write-off ska ge egen verifikation
- varje kundförlust ska ge egen verifikation
- varje återvinning ska ge egen verifikation
- varje factoringtransfer ska ge egen verifikation
- varje valutadifferens ska ge egen verifikation eller egen tydligt identifierbar verifikationsdel

SIE4-krav:
- verifikationsserie måste bevaras
- verifikationsdatum måste bevaras
- transaktionstext måste innehålla fakturareferens eller canonical invoice-id
- dimensionsspÃ¥r för kund, projekt, order, arbetsorder eller annan styrd dimension måste kunna exporteras
- kreditnota måste vara spÃ¥rbar till ursprungsfaktura i exporten
- betalverifikation får inte ersätta issue-verifikation

## Bindande variantmatris som måste korsas mot varje scenariofamilj

Varje scenariofamilj `INV-*` är ofullständig tills den korsats med alla logiskt giltiga varianter i denna matris.

### Beloppsvarianter

- helt krontal
- oresbelopp
- avrundningskansligt belopp
- hogt belopp
- belopp nara granser för förenklad faktura

### Radvarianter

- 1 rad
- 2 rader
- 10+ rader
- blandad moms
- rad med frakt
- rad med avgift
- rad med rabatt
- rad med utlägg
- rad med vidarefakturering

### Tidsvarianter

- samma dag issue/payment
- betalning dag 1 efter issue
- betalning efter forfallodatum
- kredit samma period
- kredit nasta period
- issue på periodens sista dag
- distribution efter periodgrans
- arsgrans med bokslutsmetoden

### Betalvarianter

- full bankbetalning
- full kortbetalning
- delbetalning
- underbetalning
- överbetalning
- återbetalning
- factoring

### Geografivariant

- Sverige
- annat EU-land med VAT-nummer
- annat EU-land utan VAT-nummer
- tredjeland
- offentlig sektor i Sverige

### Kanalvariant

- PDF
- e-post
- portal
- Peppol
- kanalavvisning och omutskick

### Korrektionsvariant

- ingen korrektion
- delkredit
- helkredit
- write-off
- kundförlust
- återvinning
- tvist

Ingen scenariofamilj får klassas som tackt utan att variantmatrisen uttryckligen markerats per scenario.

## Bindande fixture-klasser för fakturaflödet

Alla tester, proofs och replay-korningar för fakturaflödet ska använda en styrd fixture-katalog. Inga fria ad hoc-belopp får användas som enda bevis för ett scenario.

### Fasta beloppsklasser

- `FXT-001` helt krontal, enkel kontroll:
  - netto `10000.00`
  - moms 25 % `2500.00`
  - brutto `12500.00`
- `FXT-002` helt krontal, 12 %:
  - netto `10000.00`
  - moms `1200.00`
  - brutto `11200.00`
- `FXT-003` helt krontal, 6 %:
  - netto `10000.00`
  - moms `600.00`
  - brutto `10600.00`
- `FXT-004` oreskansligt belopp:
  - netto `999.99`
  - moms 25 % `250.00`
  - brutto `1249.99`
- `FXT-005` granskontroll för förenklad faktura:
  - brutto `4000.00`
- `FXT-006` över gransen för förenklad faktura:
  - brutto `4000.01`
- `FXT-007` stor faktura:
  - netto `1250000.00`
  - moms 25 % `312500.00`
  - brutto `1562500.00`
- `FXT-008` delkreditfall:
  - ursprunglig netto `10000.00`
  - delkredit netto `2000.00`
  - delkredit moms 25 % `500.00`
  - delkredit brutto `2500.00`
- `FXT-009` underbetalning:
  - brutto faktura `12500.00`
  - inbetalning `12000.00`
  - restsaldon `500.00`
- `FXT-010` överbetalning:
  - brutto faktura `12500.00`
  - inbetalning `13000.00`
  - overskott `500.00`
- `FXT-011` valutafall EUR:
  - fakturabelopp `1000.00 EUR`
  - bokfört SEK-värde enligt issue-kurs
  - slutligt SEK-värde enligt payment-kurs
- `FXT-012` fleradig radmix:
  - rad 1 netto `10000.00` 25 %
  - rad 2 netto `5000.00` 12 %
  - rad 3 netto `2000.00` 6 %

### Fixture-regler

- varje scenariofamilj ska ha minst en primär fixture-klass
- varje scenariofamilj med moms ska ha minst en oreskanslig fixture
- varje scenariofamilj med kredit ska ha minst en delkredit-fixture
- varje scenariofamilj med betalning ska ha minst en under- eller överbetalningsfixture om det är logiskt relevant
- varje scenariofamilj med valuta ska ha minst en kursvinst- och en kursförlustfixture

## Bindande expected outcome-format per scenario

Varje scenario i kod, test och beviskedja ska kunna uttryckas i exakt detta format:

- `scenario_id`
- `scenario_family`
- `fixture_class`
- `customer_type`
- `tax_regime`
- `channel`
- `currency`
- `payment_outcome`
- `correction_outcome`
- `accounting_method`
- `issue_entries`
- `settlement_entries`
- `correction_entries`
- `ar_effect`
- `vat_return_effect`
- `periodic_statement_effect`
- `sie4_effect`
- `delivery_receipt_required`
- `blocking_validations`
- `replay_expectation`

## Bindande canonical verifikationsseriepolicy

Fakturasystemet måste ha separata eller tydligt identifierbara canonical verifikationsspÃ¥r för minst:

- `AR-ISSUE`
- `AR-PAYMENT`
- `AR-CREDIT`
- `AR-WRITEOFF`
- `AR-BADDEBT`
- `AR-RECOVERY`
- `AR-FACTORING`
- `AR-FX`
- `AR-CHANNEL`

Regler:
- `AR-CHANNEL` får aldrig bara monetara poster
- `AR-ISSUE` får aldrig ersättas av `AR-PAYMENT`
- `AR-CREDIT` får aldrig blandas ihop med `AR-PAYMENT`
- `AR-BADDEBT` får aldrig blandas ihop med generell write-off
- `AR-FX` får aldrig blandas in i ordinarie intäktskonto eller bankkonto utan egen spÃ¥rbar rad

## Bindande expected outcome per central scenariofamilj

### `INV-A001`

- proof-ledger: `P0001`
- fixture-minimum: `FXT-001`, `FXT-004`
- ÄR-effekt:
  - öppen kundfordran på `1510`
- momsutfall:
  - `fält 05`
  - `fält 10`
- periodisk sammanställning:
  - nej
- SIE4:
  - en issue-verifikation med `1510`, `3001`, `2611`

### `INV-C001`

- proof-ledger: `P0013`
- fixture-minimum: `FXT-001`
- ÄR-effekt:
  - ingen öppen kundfordran
  - kundskuld/förskott på `2420`
- momsutfall:
  - enligt faktisk regel för förskott i just det scenariot
- SIE4:
  - en verifikation med `1930` och `2420`

### `INV-E005`

- proof-ledger: `P0019`
- fixture-minimum: `FXT-010`
- ÄR-effekt:
  - faktura stangs på `1510`
  - overskott på `2420`
- momsutfall:
  - ingen extra moms bara av overskottet
- SIE4:
  - betalverifikation som skiljer `1510` och `2420`

### `INV-F003`

- proof-ledger: `P0023`
- fixture-minimum: `FXT-001`
- ÄR-effekt:
  - kundtillgodohavande på `2420`
- momsutfall:
  - samma ruta som ursprungsfakturan men med negativ effekt
- SIE4:
  - kreditverifikation + eventuell återbetalningsverifikation

### `INV-G005`

- proof-ledger: `P0029`
- fixture-minimum: `FXT-001`
- ÄR-effekt:
  - kundfordran stangs
- momsutfall:
  - minskar samma ruta som ursprungsfakturan
- SIE4:
  - verifikation med `6351`, relevant momsfamilj och `1510`

### `INV-I001`

- proof-ledger: `P0009`
- fixture-minimum: `FXT-001`
- ÄR-effekt:
  - öppen kundfordran på `1510`
- momsutfall:
  - `fält 35`
- periodisk sammanställning:
  - ja
- SIE4:
  - issue-verifikation med `1510` och `3108`

### `INV-I002`

- proof-ledger: `P0010`
- fixture-minimum: `FXT-001`
- ÄR-effekt:
  - öppen kundfordran på `1510`
- momsutfall:
  - `fält 39`
- periodisk sammanställning:
  - ja, när villkoren är uppfyllda
- SIE4:
  - issue-verifikation med `1510` och `3308`

### `INV-H001`

- proof-ledger: `P0012`
- fixture-minimum: `FXT-001`
- ÄR-effekt:
  - öppen kundfordran på `1510`
- momsutfall:
  - `fält 41`
- periodisk sammanställning:
  - nej
- SIE4:
  - issue-verifikation med `1510` och `3231`

### `INV-L003`

- proof-ledger: `P0038`
- fixture-minimum: `FXT-001`
- ÄR-effekt:
  - kundfordran bokas upp vid bokslut
- momsutfall:
  - samma momsruta som omsattningen faktiskt hor till
- SIE4:
  - arsjusteringsverifikation, inte betalverifikation

### `INV-M001`

- proof-ledger: `blockerad tills separat VMB-ledger finns`
- fixture-minimum: `FXT-001`
- ÄR-effekt:
  - ingen issue tillaten utan separat VMB-modell
- momsutfall:
  - får inte gissas som `05/10-12`
- periodisk sammanställning:
  - enligt separat specialregim
- SIE4:
  - ingen legal-effect verifikation får skapas utan specialmodell

### `INV-M002`

- proof-ledger: `blockerad tills separat VMB-resetjänstmodell finns`
- fixture-minimum: `FXT-001`
- ÄR-effekt:
  - ingen issue tillaten utan specialmodell
- momsutfall:
  - får inte gissas
- periodisk sammanställning:
  - enligt specialregim
- SIE4:
  - ingen legal-effect verifikation utan specialmodell

### `INV-M003`

- proof-ledger: `blockerad tills separat frivillig-beskattning-ledger finns`
- fixture-minimum: `FXT-001`
- ÄR-effekt:
  - ingen legal-effect issue utan explicit hyresmodell
- momsutfall:
  - får inte gissas som vanlig `05`
- periodisk sammanställning:
  - nej
- SIE4:
  - ingen legal-effect verifikation utan specialmodell

### `INV-M004`

- proof-ledger: `blockerad tills separat trepartshandelsmodell finns`
- fixture-minimum: `FXT-001`
- ÄR-effekt:
  - ingen issue utan specialmodell
- momsutfall:
  - får inte gissas som vanlig EU-försäljning
- periodisk sammanställning:
  - enligt specialregim
- SIE4:
  - ingen legal-effect verifikation utan specialmodell

### `INV-M005`

- proof-ledger: `blockerad tills separat monteringsleveransmodell finns`
- fixture-minimum: `FXT-001`
- ÄR-effekt:
  - ingen issue utan specialmodell
- momsutfall:
  - får inte gissas som `35`
- periodisk sammanställning:
  - enligt specialregim
- SIE4:
  - ingen legal-effect verifikation utan specialmodell

### `INV-M006`

- proof-ledger: `blockerad tills separat nytt-transportmedel-modell finns`
- fixture-minimum: `FXT-001`
- ÄR-effekt:
  - ingen issue utan specialmodell
- momsutfall:
  - får inte gissas
- periodisk sammanställning:
  - enligt specialregim
- SIE4:
  - ingen legal-effect verifikation utan specialmodell

### `INV-M007`

- proof-ledger: `blockerad tills flerfunktionsvoucher-modell finns`
- fixture-minimum: `FXT-001`
- ÄR-effekt:
  - ingen vanlig invoice issue får ersätta voucherlogik
- momsutfall:
  - får inte gissas
- periodisk sammanställning:
  - enligt specialregim
- SIE4:
  - ingen legal-effect verifikation utan specialmodell

### `INV-M008`

- proof-ledger: `blockerad tills enfunktionsvoucher-modell finns`
- fixture-minimum: `FXT-001`
- ÄR-effekt:
  - ingen vanlig invoice issue får ersätta voucherlogik
- momsutfall:
  - får inte gissas
- periodisk sammanställning:
  - enligt specialregim
- SIE4:
  - ingen legal-effect verifikation utan specialmodell

### `INV-M009`

- proof-ledger: `blockerad tills call-off-stock / konsignationmodell finns`
- fixture-minimum: `FXT-001`
- ÄR-effekt:
  - ingen issue utan specialmodell
- momsutfall:
  - får inte gissas
- periodisk sammanställning:
  - enligt specialregim
- SIE4:
  - ingen legal-effect verifikation utan specialmodell

### `INV-M010`

- proof-ledger: `blockerad tills taxfree/exportbutikmodell finns`
- fixture-minimum: `FXT-001`
- ÄR-effekt:
  - ingen issue utan specialmodell
- momsutfall:
  - får inte gissas
- periodisk sammanställning:
  - enligt specialregim
- SIE4:
  - ingen legal-effect verifikation utan specialmodell

## Bindande kompakt expected outcome-register för alla scenariofamiljer

Varje rad nedan är bindande minimisanning. Testkatalogen får vara mer detaljerad, men aldrig mindre detaljerad an detta.

### A. Grundfakturering

- `INV-A001`: `P0001`; fixture `FXT-001`,`FXT-004`; ÄR `1510 öppen`; moms `05/10`; periodisk sammanställning `nej`; SIE4 `1510,3001,2611`
- `INV-A002`: `P0002`; fixture `FXT-002`; ÄR `1510 öppen`; moms `05/11`; periodisk sammanställning `nej`; SIE4 `1510,3002,2621`
- `INV-A003`: `P0003`; fixture `FXT-003`; ÄR `1510 öppen`; moms `05/12`; periodisk sammanställning `nej`; SIE4 `1510,3003,2631`
- `INV-A004`: `P0001`; fixture `FXT-001`,`FXT-004`; ÄR `1510 öppen`; moms `05/10`; periodisk sammanställning `nej`; SIE4 `1510,3001,2611`
- `INV-A005`: `P0002`; fixture `FXT-002`; ÄR `1510 öppen`; moms `05/11`; periodisk sammanställning `nej`; SIE4 `1510,3002,2621`
- `INV-A006`: `P0003`; fixture `FXT-003`; ÄR `1510 öppen`; moms `05/12`; periodisk sammanställning `nej`; SIE4 `1510,3003,2631`
- `INV-A007`: `P0005`; fixture `FXT-012`; ÄR `1510 öppen`; moms `05/10/11/12`; periodisk sammanställning `nej`; SIE4 `1510 + 3001/3002/3003 + 2611/2621/2631`
- `INV-A008`: `P0005 + P0004`; fixture `FXT-012`; ÄR `1510 öppen`; moms `05/10-12 + 42 för undantagen del enligt policy`; periodisk sammanställning `nej`; SIE4 `1510 + momspliktiga konton + momsfri rad`
- `INV-A009`: `P0004`; fixture `FXT-001`; ÄR `1510 öppen`; moms `42`; periodisk sammanställning `nej`; SIE4 `1510,3004`
- `INV-A010`: `P0001/P0002/P0003/P0004`; fixture `FXT-005`,`FXT-006`; ÄR `1510 öppen`; moms `samma som underliggande scenario`; periodisk sammanställning `nej eller enligt scenario`; SIE4 `samma som underliggande`
- `INV-A011`: `P0042`; fixture `FXT-012`; ÄR `1510 öppen`; moms `summa av underliggande rutor`; periodisk sammanställning `enligt rader`; SIE4 `en verifikation med radvis uppdelning`
- `INV-A012`: `P0043`; fixture `FXT-001`; ÄR `1510 öppen`; moms `enligt underliggande scenario`; periodisk sammanställning `enligt underliggande scenario`; SIE4 `underliggande konton + self-billing-bevis`
- `INV-A013`: `ingen P`; fixture `FXT-001`; ÄR `ingen`; moms `ingen`; periodisk sammanställning `nej`; SIE4 `ingen`

### B. Kanal och distribution

- `INV-B001`: `underliggande P`; fixture `FXT-001`; ÄR `ingen ytterligare effekt`; moms `ingen ytterligare effekt`; periodisk sammanställning `enligt underliggande`; SIE4 `ingen ny monetar verifikation`
- `INV-B002`: `underliggande P`; fixture `FXT-001`; ÄR `ingen ytterligare effekt`; moms `ingen ytterligare effekt`; periodisk sammanställning `enligt underliggande`; SIE4 `ingen ny monetar verifikation`
- `INV-B003`: `underliggande P`; fixture `FXT-001`; ÄR `ingen ytterligare effekt`; moms `ingen ytterligare effekt`; periodisk sammanställning `enligt underliggande`; SIE4 `ingen ny monetar verifikation`
- `INV-B004`: `underliggande P`; fixture `FXT-001`; ÄR `ingen ytterligare effekt`; moms `ingen ytterligare effekt`; periodisk sammanställning `enligt underliggande`; SIE4 `ingen ny monetar verifikation`
- `INV-B005`: `P0040 + underliggande P`; fixture `FXT-001`; ÄR `underliggande`; moms `underliggande`; periodisk sammanställning `enligt underliggande`; SIE4 `ingen ny monetar verifikation för kanal`
- `INV-B006`: `P0040 + underliggande P`; fixture `FXT-001`; ÄR `underliggande`; moms `underliggande`; periodisk sammanställning `enligt underliggande`; SIE4 `ingen ny monetar verifikation för kanal`
- `INV-B007`: `ingen ny P`; fixture `FXT-001`; ÄR `ingen ytterligare effekt`; moms `ingen`; periodisk sammanställning `ingen`; SIE4 `ingen`
- `INV-B008`: `P0051/P0052`; fixture `FXT-001`; ÄR `ingen ny ÄR`; moms `ingen`; periodisk sammanställning `ingen`; SIE4 `ingen ny monetar verifikation`

### C. Förskott, milstolpar och abonnemang

- `INV-C001`: `P0013`; fixture `FXT-001`; ÄR `2420 inte 1510`; moms `enligt scenario`; periodisk sammanställning `nej`; SIE4 `1930,2420`
- `INV-C002`: `P0014`; fixture `FXT-001`; ÄR `1510 efter avräkning`; moms `enligt slutlig omsattning`; periodisk sammanställning `enligt scenario`; SIE4 `issue + förskottsavräkning`
- `INV-C003`: `P0013 x n + P0014`; fixture `FXT-001`; ÄR `2420 till slutlig avräkning`; moms `enligt scenario`; periodisk sammanställning `enligt scenario`; SIE4 `flera förskottsverifikationer + en slutfaktura`
- `INV-C004`: `P0001-P0012`; fixture `FXT-001`; ÄR `1510 eller 1513 enligt policy`; moms `enligt milstolpens omsattning`; periodisk sammanställning `enligt scenario`; SIE4 `egen verifikation per milstolpe`
- `INV-C005`: `P0049`; fixture `FXT-001`; ÄR `1513 öppen`; moms `enligt underliggande omsattning`; periodisk sammanställning `enligt scenario`; SIE4 `1513 + intäkt + moms`
- `INV-C006`: `P0001-P0004`; fixture `FXT-001`; ÄR `1510 öppen`; moms `enligt abonnemangets momsklass`; periodisk sammanställning `enligt scenario`; SIE4 `issue-verifikation`
- `INV-C007`: `P0001-P0004`; fixture `FXT-001`; ÄR `1510 öppen`; moms `enligt abonnemangets momsklass`; periodisk sammanställning `enligt scenario`; SIE4 `issue-verifikation med renewal-referens`
- `INV-C008`: `P0021-P0025 + ny issue`; fixture `FXT-008`; ÄR `kredit/ny ÄR beroende på ändring`; moms `korrektionsruta samma som ursprung`; periodisk sammanställning `enligt scenario`; SIE4 `kredit + ny issue`
- `INV-C009`: `P0021-P0025` eller `P0014`; fixture `FXT-008`; ÄR `slutreglerad`; moms `enligt underliggande omsattning`; periodisk sammanställning `enligt scenario`; SIE4 `slutregleringsverifikationer`

### D. Projekt och uppdrag

- `INV-D001`: `P0001-P0005`; fixture `FXT-012`; ÄR `1510 öppen`; moms `enligt radmix`; periodisk sammanställning `enligt scenario`; SIE4 `issue med projektdimensioner`
- `INV-D002`: `P0013/P0014/P0001-P0005`; fixture `FXT-001`; ÄR `2420 och/eller 1510`; moms `enligt faktiska delsteg`; periodisk sammanställning `enligt scenario`; SIE4 `förskott/slutligt separata verifikationer`
- `INV-D003`: `P0001-P0005`; fixture `FXT-001`; ÄR `1510 öppen`; moms `enligt arbetsorderns radklass`; periodisk sammanställning `enligt scenario`; SIE4 `issue med arbetsorderref`
- `INV-D004`: `P0005 + P0033/P0034`; fixture `FXT-012`; ÄR `1510 öppen`; moms `mixade rutor inom svensk moms eller annan policy`; periodisk sammanställning `enligt scenario`; SIE4 `issue med tid/material/utlägg separerade`
- `INV-D005`: `P0033`; fixture `FXT-001`; ÄR `1510 öppen eller kvittad`; moms `ingen moms på utläggsdelen`; periodisk sammanställning `nej`; SIE4 `1510,1681`
- `INV-D006`: `P0034`; fixture `FXT-001`; ÄR `1510 öppen`; moms `05/10-12 normalt`; periodisk sammanställning `enligt scenario`; SIE4 `1510,3550/3590,moms`
- `INV-D007`: `WIP + P000x`; fixture `FXT-001`; ÄR `1620 före issue, 1510 efter issue`; moms `ingen moms på WIP i sig, moms vid faktura enligt scenario`; periodisk sammanställning `enligt scenario`; SIE4 `WIP-verifikation + issue-verifikation`

### E. Betalutfall

- `INV-E001`: `P0015`; fixture `FXT-001`; ÄR `1510 stangs`; moms `ingen ny moms`; periodisk sammanställning `ingen ny`; SIE4 `1930,1510`
- `INV-E002`: `P0017 x2`; fixture `FXT-001`; ÄR `1510 minskar i två steg`; moms `ingen ny moms`; periodisk sammanställning `ingen ny`; SIE4 `två betalverifikationer`
- `INV-E003`: `P0017 xn`; fixture `FXT-001`; ÄR `1510 minskar stegvis`; moms `ingen ny moms`; periodisk sammanställning `ingen ny`; SIE4 `flera betalverifikationer`
- `INV-E004`: `P0018`; fixture `FXT-009`; ÄR `restsaldo kvar på 1510`; moms `ingen ny moms`; periodisk sammanställning `ingen ny`; SIE4 `1930,1510`
- `INV-E005`: `P0019`; fixture `FXT-010`; ÄR `1510 stangs, overskott 2420`; moms `ingen ny moms`; periodisk sammanställning `ingen`; SIE4 `1930,1510,2420`
- `INV-E006`: `P0019 + P0020`; fixture `FXT-010`; ÄR `1510 stangs, 2420 stangs efter återbetalning`; moms `ingen ny moms`; periodisk sammanställning `ingen`; SIE4 `betalning + återbetalning`
- `INV-E007`: `P0017 xn`; fixture `FXT-001`; ÄR `1510 minskar enligt plan`; moms `ingen ny moms`; periodisk sammanställning `ingen`; SIE4 `en betalverifikation per plansteg`
- `INV-E008`: `P0016`; fixture `FXT-001`; ÄR `1510 stangs mot 1686, sedan 1686 mot 1930`; moms `ingen ny moms`; periodisk sammanställning `ingen`; SIE4 `1510,1686,1930,6570`
- `INV-E009`: `P0015`; fixture `FXT-001`; ÄR `1510 stangs`; moms `ingen ny moms`; periodisk sammanställning `ingen`; SIE4 `betalverifikation med direktbetalningsreceipt`
- `INV-E010`: `P0035`; fixture `FXT-001`; ÄR `1510 -> 1512`; moms `ingen ny moms`; periodisk sammanställning `ingen`; SIE4 `factoringtransfer + factoringreglering`

### F. Kredit och ändra korrektioner

- `INV-F001`: `P0021`; fixture `FXT-001`; ÄR `1510 minskar till noll`; moms `negativ effekt i ursprunglig ruta`; periodisk sammanställning `korrigeras om ursprunglig scenario kravde det`; SIE4 `300x/261x/1510`
- `INV-F002`: `P0022`; fixture `FXT-008`; ÄR `1510 minskar delvis`; moms `negativ effekt i ursprunglig ruta`; periodisk sammanställning `korrigeras proportionellt`; SIE4 `300x/261x/1510`
- `INV-F003`: `P0023`; fixture `FXT-001`; ÄR `2420 kundtillgodo`; moms `negativ effekt i ursprunglig ruta`; periodisk sammanställning `korrigeras om relevant`; SIE4 `300x/261x/2420`
- `INV-F004`: `P0024`; fixture `FXT-008`; ÄR `2420 eller delvis 1510 beroende på status`; moms `negativ effekt i ursprunglig ruta`; periodisk sammanställning `korrigeras proportionellt`; SIE4 `300x/261x/2420`
- `INV-F005`: `P0025`; fixture `FXT-008`; ÄR `1510 eller 2420 beroende på betalstatus`; moms `negativ effekt i ursprunglig ruta`; periodisk sammanställning `enligt ursprunglig regel`; SIE4 `3731,moms,1510/2420`
- `INV-F006`: `P0021-P0024`; fixture `FXT-008`; ÄR `minskar eller blir kundtillgodo`; moms `negativ effekt i ursprunglig ruta`; periodisk sammanställning `enligt ursprunglig regel`; SIE4 `kreditverifikation + ev lagerretur separat`
- `INV-F007`: `P0044`; fixture `FXT-001`; ÄR `felaktig ÄR stangs, ny ÄR skapas`; moms `ursprunglig ruta reverseras, ny ruta bokas`; periodisk sammanställning `enligt nytt scenario`; SIE4 `kredit + ny issue`
- `INV-F008`: `P0044`; fixture `FXT-008`; ÄR `felaktig ÄR stangs, ny ÄR skapas`; moms `ursprunglig ruta reverseras, ny ruta bokas`; periodisk sammanställning `enligt nytt scenario`; SIE4 `kredit + ny issue`
- `INV-F009`: `P0044/P0045`; fixture `FXT-001`; ÄR `underliggande ÄR korrigeras via kredit + ny issue`; moms `om revenue class paverkar ruta ska ruta korrigeras`; periodisk sammanställning `enligt nytt scenario`; SIE4 `kredit + ny issue`
- `INV-F010`: `P0045`; fixture `FXT-001`; ÄR `samma eller ny ÄR beroende på omfakturering`; moms `fel ruta reverseras, rätt ruta bokas`; periodisk sammanställning `enligt rätt klass`; SIE4 `kredit + ny issue`
- `INV-F011`: `P0026/P0053`; fixture `FXT-004`; ÄR `1510 minskar eller stangs`; moms `ingen ändring vid ren betalningsdifferens`; periodisk sammanställning `ingen`; SIE4 `3740 eller write-off-konto mot 1510`

### G. Fordransproblem

- `INV-G001`: `P0032`; fixture `FXT-009`; ÄR `ny separat ÄR-post eller utokad fordran enligt policy`; moms `ingen`; periodisk sammanställning `nej`; SIE4 `1510 + avgiftskonto`
- `INV-G002`: `P0031`; fixture `FXT-009`; ÄR `ny separat räntefordran`; moms `ingen`; periodisk sammanställning `nej`; SIE4 `1510,8313`
- `INV-G003`: `P0027`; fixture `FXT-001`; ÄR `1510 -> 1516`; moms `ingen ny`; periodisk sammanställning `ingen`; SIE4 `1516,1510`
- `INV-G004`: `P0028`; fixture `FXT-001`; ÄR `1510 kvar, reserv på 1519`; moms `ingen ny`; periodisk sammanställning `ingen`; SIE4 `6352,1519`
- `INV-G005`: `P0029`; fixture `FXT-001`; ÄR `1510 stangs`; moms `minskar ursprunglig ruta`; periodisk sammanställning `korrigeras om relevant`; SIE4 `6351,261x,1510`
- `INV-G006`: `P0030`; fixture `FXT-001`; ÄR `återvinningsspÃ¥r eller reglering av tidigare avskriven fordran`; moms `åter in i ursprunglig ruta`; periodisk sammanställning `enligt scenario`; SIE4 `1930,3950,261x`
- `INV-G007`: `underliggande P + avgiftsspÃ¥r`; fixture `FXT-009`; ÄR `fordran kvarstar eller flyttas enligt inkassopolicy`; moms `ingen automatisk kundförlust`; periodisk sammanställning `ingen`; SIE4 `avgifts-/ränteposter separata`
- `INV-G008`: `underliggande P + avgiftsspÃ¥r`; fixture `FXT-009`; ÄR `fordran kvarstar eller flyttas enligt process`; moms `ingen automatisk kundförlust`; periodisk sammanställning `ingen`; SIE4 `processspÃ¥r separata`

### H. Svensk sarskild moms

- `INV-H001`: `P0012`; fixture `FXT-001`; ÄR `1510 öppen`; moms `41`; periodisk sammanställning `nej`; SIE4 `1510,3231`
- `INV-H002`: `P0012`; fixture `FXT-001`; ÄR `1510 öppen`; moms `41`; periodisk sammanställning `nej`; SIE4 `1510,3231`
- `INV-H003`: `P0012 eller explicit specialpolicy`; fixture `FXT-001`; ÄR `1510 öppen`; moms `41`; periodisk sammanställning `nej`; SIE4 `1510,special revenue class`
- `INV-H004`: `P0034`; fixture `FXT-001`; ÄR `1510 öppen`; moms `05/10-12`; periodisk sammanställning `enligt geografi`; SIE4 `1510,3550/3590,261x`
- `INV-H005`: `P0033`; fixture `FXT-001`; ÄR `1510 öppen`; moms `ingen på utläggsdelen`; periodisk sammanställning `nej`; SIE4 `1510,1681`
- `INV-H006`: `P0031/P0032`; fixture `FXT-009`; ÄR `ny avgifts-/räntefordran`; moms `ingen`; periodisk sammanställning `nej`; SIE4 `1510 mot 8313 eller avgiftskonto`

### I. EU och internationellt

- `INV-I001`: `P0009`; fixture `FXT-001`; ÄR `1510 öppen`; moms `35`; periodisk sammanställning `ja`; SIE4 `1510,3108`
- `INV-I002`: `P0010`; fixture `FXT-001`; ÄR `1510 öppen`; moms `39`; periodisk sammanställning `ja när VAT-krav uppfylls`; SIE4 `1510,3308`
- `INV-I003`: `blockerad eller P0001-P0003`; fixture `FXT-001`; ÄR `1510 öppen om omklassad`; moms `05/10-12 eller block`; periodisk sammanställning `nej om omklassad till svensk moms`; SIE4 `svensk momsverifikation om inte block`
- `INV-I004`: `svensk moms eller OSS-policy`; fixture `FXT-001`; ÄR `1510 öppen`; moms `05/10-12 eller ej i svensk momsdeklaration vid OSS`; periodisk sammanställning `nej`; SIE4 `issue enligt faktisk modell`
- `INV-I005`: `P0008`; fixture `FXT-001`; ÄR `1510 öppen`; moms `36`; periodisk sammanställning `nej`; SIE4 `1510,3105`
- `INV-I006`: `P0011`; fixture `FXT-001`; ÄR `1510 öppen`; moms `40`; periodisk sammanställning `nej`; SIE4 `1510,3305`
- `INV-I007`: `P0036/P0037`; fixture `FXT-011`; ÄR `1510 öppen till betalning`; moms `35/39/40 eller 05/10-12 beroende på underliggande`; periodisk sammanställning `enligt underliggande`; SIE4 `issue + FX-verifikation`
- `INV-I008`: `P0036/P0037`; fixture `FXT-011`; ÄR `1510 öppen till betalning`; moms `enligt underliggande`; periodisk sammanställning `enligt underliggande`; SIE4 `issue + FX-verifikation`
- `INV-I009`: `P0036/P0037`; fixture `FXT-011`; ÄR `1510 stangs`; moms `ingen ny moms av kursdifferensen`; periodisk sammanställning `ingen ny`; SIE4 `1930,1510,3960/7960`

### J. Offentlig sektor

- `INV-J001`: `P0040`; fixture `FXT-001`; ÄR `underliggande`; moms `underliggande`; periodisk sammanställning `underliggande`; SIE4 `underliggande monetar verifikation + Peppol-receipt`
- `INV-J002`: `underliggande P`; fixture `FXT-001`; ÄR `ingen issue om referens saknas`; moms `ingen om blockerad`; periodisk sammanställning `ingen om blockerad`; SIE4 `ingen issue-verifikation för blockerad faktura`
- `INV-J003`: `P0051/P0052`; fixture `FXT-001`; ÄR `ingen ny ÄR`; moms `ingen ny moms`; periodisk sammanställning `ingen ny`; SIE4 `ingen ny monetar verifikation`

### K. HUS

- `INV-K001`: `P0046`; fixture `FXT-001`; ÄR `1510 endast för kundandel`; moms `05/10-12 på kundfakturan enligt underliggande momsmodell`; periodisk sammanställning `nej`; SIE4 `1510,HUS-revenue class,261x`
- `INV-K002`: `P0046 + P0015`; fixture `FXT-001`; ÄR `kundandel stangs när kunden betalar`; moms `ingen ny moms vid betalning`; periodisk sammanställning `nej`; SIE4 `issue + betalning`
- `INV-K003`: `P0046 + P0017`; fixture `FXT-001`; ÄR `rest på 1510 för kunddel`; moms `ingen ny moms vid betalning`; periodisk sammanställning `nej`; SIE4 `issue + delbetalning`
- `INV-K004`: `P0047`; fixture `FXT-008`; ÄR `1510 minskar eller stangs`; moms `negativ effekt i ursprunglig ruta`; periodisk sammanställning `nej`; SIE4 `kreditverifikation`
- `INV-K005`: `P0048`; fixture `FXT-008`; ÄR `kunddel kredit enligt status`; moms `negativ effekt i ursprunglig ruta`; periodisk sammanställning `nej`; SIE4 `kundkredit + separat HUS-korrektion i annan domän`

### L. Redovisningsmetod och bokslut

- `INV-L001`: `P0001-P0037`; fixture `FXT-001`,`FXT-004`,`FXT-011`; ÄR `enligt underliggande scenario`; moms `enligt underliggande scenario`; periodisk sammanställning `enligt underliggande scenario`; SIE4 `issue/payment/kredit enligt vanliga regler`
- `INV-L002`: `P0001-P0037 + arsjusteringsregler`; fixture `FXT-001`; ÄR `enligt underliggande under aret`; moms `enligt underliggande`; periodisk sammanställning `enligt underliggande`; SIE4 `plus bokslutsjusteringar`
- `INV-L003`: `P0038`; fixture `FXT-001`; ÄR `1510 bokas upp vid bokslut`; moms `samma ruta som underliggande omsattning`; periodisk sammanställning `enligt underliggande scenario`; SIE4 `arsjusteringsverifikation`
- `INV-L004`: `P0039`; fixture `FXT-001`; ÄR `ingen vanlig kundfordran för förskottet`; moms `enligt underliggande förskottsregel`; periodisk sammanställning `nej`; SIE4 `2420 kvar till slutlig reglering`
- `INV-L005`: `P0050`; fixture `FXT-001`; ÄR `issue styr period, inte distribution`; moms `issue-periodens ruta`; periodisk sammanställning `issue-period om relevant`; SIE4 `issue-verifikation i rätt period`

## Bindande testkrav

Fakturasystemet är inte redo för UI eller go-live forran följande finns:

- canonical scenario register för alla familjer `INV-A001` till `INV-L005`
- canonical scenario register för alla familjer `INV-A001` till `INV-M010`
- variantmatris som korsar varje scenario med alla logiskt giltiga scenarioaxlar
- explicit expected-booking-pattern per scenario
- explicit expected-reskontrautfall per scenario
- explicit expected-momsutfall per scenario
- explicit expected-exportutfall per scenario
- explicit expected-channel-behavior per scenario
- negativa tester som visar att blockerande valideringar stoppar fel
- replaytester som visar att utfardande, kredit, betalallokering och kundförlust är deterministiska

## Källor som styr dokumentet

- [Skatteverket: Momslagens regler om fakturering](https://skatteverket.se/foretag/moms/saljavarorochtjanster/momslagensregleromfakturering.4.58d555751259e4d66168000403.html)
- [Skatteverket: Kundförluster - om kunden inte kan betala](https://www.skatteverket.se/foretag/moms/sarskildamomsregler/kundforlusteromkundenintekanbetala.4.5c1163881590be297b58d10.html)
- [Skatteverket: Utlägg och vidarefakturering](https://www.skatteverket.se/foretag/moms/sarskildamomsregler/utlaggochvidarefakturering.4.3aa8c78a1466c58458747aa.html)
- [Skatteverket: Försäljning till ändra EU-lander](https://skatteverket.se/foretag/moms/saljavarorochtjanster/forsaljningtillandraeulander.4.18e1b10334ebe8bc80004737.html)
- [Skatteverket: Sälja varor till ändra EU-lander](https://www.skatteverket.se/foretag/moms/saljavarorochtjanster/forsaljningtillandraeulander/saljavarortillandraeulander.4.18e1b10334ebe8bc8000782.html)
- [Skatteverket: Periodisk sammanställning för varor och tjänster](https://www.skatteverket.se/foretag/moms/deklareramoms/periodisksammanstallningforvarorochtjanster.4.58d555751259e4d661680001093.html)
- [Skatteverket: Omvänd betalningsskyldighet](https://www.skatteverket.se/foretag/moms/sarskildamomsregler/omvandbetalningsskyldighet.4.47eb30f51122b1aaad28000258292.html)
- [Skatteverket: Omvänd betalningsskyldighet inom byggsektorn](https://skatteverket.se/foretag/moms/sarskildamomsregler/byggverksamhet/omvandbetalningsskyldighetinombyggsektorn.4.47eb30f51122b1aaad28000545.html)
- [Skatteverket: Hur ska en faktura för rot- eller rutarbete vara utformad](https://www.skatteverket.se/privat/etjansterochblanketter/svarpavanligafragor/rotochrutarbete/privatrotochrutarbetefaq/hurskaenfakturaforrotellerrutarbetevarautformad.5.383cc9f31134f01c98a800016094.html)
- [Skatteverket: ROT och RUT på samma faktura](https://www.skatteverket.se/foretag/etjansterochblanketter/svarpavanligafragor/rotochrutarbete/foretagrotochrutarbetefaq/omjagbadeutforettrotochettrutarbeteatenkundmastejagupprattatvafakturorochgoraenrotochenrutbegaran.5.361dc8c15312eff6fd23fad.html)
- [Skatteverket: Sa fungerar skattereduktionen för grön teknik](https://skatteverket.se/foretag/skatterochavdrag/gronteknik/safungerarskattereduktionenforgronteknik.4.676f4884175c97df4192a52.html)
- [BAS 2025 Kontoplan](https://www.bas.se/wp-content/uploads/2025/01/Kontoplan-BAS-2025.pdf)
- [Bokföringsnamnden: BFNAR 2006:1 Bokföring](https://www.bfn.se/wp-content/uploads/2020/06/bfnar06-1-grund.pdf)
- [Bokföringsnamnden: K1-vägledning, kontantmetod och arsjusteringar](https://www.bfn.se/wp-content/uploads/vagledningen-k1.pdf)
- [Digg: Lag, förordning och föreskrifter inom e-handel för leverantörer till offentlig sektor](https://www.digg.se/kunskap-och-stod/e-handel/lag-forordning-och-foreskrifter-for-e-handel/lag-forordning-och-foreskrifter-inom-e-handel-for-leverantorer-till-offentlig-sektor)
- [SFTI: Peppol BIS Billing 3](https://sfti.se/sfti/standarder/peppolbisehandel/peppolbisbilling3.49021.html)
- [Bankgirot: OCR-referenskontroll](https://www.bankgirot.se/tjanster/inbetalningar/bankgiro-inbetalningar/ocr-referenskontroll/)
- [Bankgirot: Rätt utformad faktura](https://www.bankgirot.se/ratt-utformad-faktura)
- [Verksamt: Betalningspåminnelse och dröjsmålsränta](https://verksamt.se/avtal-fakturering/betalningspaminnelse-och-drojsmalsranta)
- [Kronofogden: Betalningsforelaggande för företag](https://kronofogden.se/other-languages/english-engelska/debt-payment-relief-orders-and-enforcement-orders/payment-order)



