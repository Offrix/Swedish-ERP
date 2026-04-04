# AGARUTTAG_UTDELNING_KU31_OCH_KUPONGSKATT_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för beslut om vinstutdelning, skuld till aktieagare, utbetalning, KU31, kupongskatt och redovisning av utdelning till svenska och utlandska mottagare.

Detta dokument ska styra:
- bolagsstammobeslut om utdelning
- equity-source selection för utdelning
- skuld till aktieagare
- utbetalning
- KU31
- kupongskatt
- skillnaden mellan kupongbolag och avstämningsbolag

## Syfte

Detta dokument finns för att:
- utdelning aldrig ska betalas utan faststalld och utdelningsbar kapitalbas
- utbetald men inte uttagen vinstutdelning alltid ska spåras som egen skuld
- svenska fysiska personer och begränsat skattskyldiga mottagare ska ga genom olika korrekta kontroll- och skatteflöden
- kupongskatt aldrig ska blandas ihop med personalskatt eller bolagsskatt

## Omfattning

Detta dokument omfattar:
- beslut om vinstutdelning i aktiebolag
- bokning av utdelningsskuld
- utbetalning av utdelning
- KU31
- kupongskatt för begränsat skattskyldiga
- redovisning i kupongbolag och avstämningsbolag

Detta dokument omfattar inte:
- lön till ägare
- aktieagartillskott
- lan till aktieagare
- aktiebok och corporate actions utanför utdelning

## Absoluta principer

- utdelning får aldrig betalas utan verifierat bolagsstammobeslut eller motsvarande legal beslutsgrund
- current-year result på `2099` får inte delas ut innan faststalld årsredovisning och dispositionsbeslut
- utdelning ska som canonical policy bokas som skuld på `2898` när beslut fattats men innan utbetalning
- kupongskatt får aldrig bokas som personalskatt
- kupongskatt eller svensk källs katteregim ska bara innehållas när regel och mottagarprofil kraver det
- KU31 och kupongskatteredovisning får aldrig markeras klara utan riktig filing evidence

## Bindande dokumenthierarki för agaruttag, utdelning, KU31 och kupongskatt

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- `DOMAIN_11_ROADMAP.md`
- `DOMAIN_11_IMPLEMENTATION_LIBRARY.md`
- detta dokument

Detta dokument lutar på:
- `ARSBOKSLUT_ARSREDOVISNING_OCH_INK2_BINDANDE_SANNING.md`
- Skatteverkets regler om KU31 och kupongskatt
- kupongskattelagen
- BAS-kontoplanen

## Kanoniska objekt

- `DividendResolution`
- `DividendEntitlement`
- `DividendPayoutBatch`
- `DividendTaxProfileDecision`
- `Ku31Package`
- `KupongTaxReturn`
- `DividendFilingReceipt`
- `DividendBlocker`

## Kanoniska state machines

### `DividendResolution`

- `draft`
- `approved`
- `liability_booked`
- `partially_paid`
- `paid`
- `closed`
- `blocked`

### `Ku31Package`

- `draft`
- `built`
- `submitted`
- `accepted`
- `rejected`

### `KupongTaxReturn`

- `draft`
- `built`
- `submitted`
- `accepted`
- `rejected`
- `corrected`

## Kanoniska commands

- `CreateDividendResolution`
- `ApproveDividendResolution`
- `BookDividendLiability`
- `CreateDividendPayoutBatch`
- `ResolveDividendTaxProfile`
- `BuildKu31Package`
- `BuildKupongTaxReturn`
- `SubmitDividendFiling`
- `RegisterDividendFilingReceipt`
- `BlockDividendResolution`

## Kanoniska events

- `DividendResolutionCreated`
- `DividendResolutionApproved`
- `DividendLiabilityBooked`
- `DividendPayoutBatchCreated`
- `DividendTaxProfileResolved`
- `Ku31PackageBuilt`
- `KupongTaxReturnBuilt`
- `DividendFilingSubmitted`
- `DividendFilingReceiptRegistered`
- `DividendResolutionBlocked`

## Kanoniska route-familjer

- `POST /v1/dividends/resolutions`
- `POST /v1/dividends/resolutions/{id}/approve`
- `POST /v1/dividends/resolutions/{id}/book-liability`
- `POST /v1/dividends/ku31-packages`
- `POST /v1/dividends/kupong-tax-returns`
- `POST /v1/dividends/filings/{id}/submit`

## Kanoniska permissions och review boundaries

- utdelningsbeslut kraver legal/company-admin review
- kupongskatt och KU31 filing kraver finance/legal review
- support får inte boka utdelningsskuld eller markera KU31 skickad

## Nummer-, serie-, referens- och identitetsregler

- varje resolution ska ha unikt `dividendResolutionId`
- varje mottagare ska ha unikt `dividendEntitlementId`
- varje KU31-package ska ha `ku31PackageId`
- varje kupongskatteredovisning ska ha `kupongTaxReturnId`
- varje mottagare ska ha korrekt skatteresidensprofil

## Valuta-, avrundnings- och omräkningsregler

- utdelning ska defaulta till SEK
- kupongskatt ska beräknas på skattepliktigt utdelningsunderlag enligt aktuell sats eller skatteavtal
- KU31 belopp ska följa Skatteverkets regler för kontrolluppgifter

## Replay-, correction-, recovery- och cutover-regler

- replay får inte skapa nytt utdelningsbeslut
- korrigerad KU31 eller kupongskatteredovisning ska bevara ursprunglig filing lineage
- migration måste landa utdelningsskuld, utbetalning, KU31 och kupongskatt separat

## Huvudflödet

1. årsredovisning faststalls
2. utdelningsbeslut fattas
3. utdelningsskuld bokas
4. utbetalning sker
5. KU31 och/eller kupongskatteredovisning byggs
6. filing receipt registreras

## Bindande scenarioaxlar

- shareholder tax profile: `swedish_unlimited`, `limited_tax_liability`, `unknown`
- company type: `kupongbolag`, `avstamningsbolag`
- equity source: `2098`, `2091`
- payout state: `unpaid`, `paid`, `partially_paid`
- tax outcome: `no_kupong_tax`, `kupong_tax_withheld`, `blocked`

## Bindande policykartor

- unresolved annual close before dividend: `blocked`
- dividend liability account: `2898`
- dividend payment cash account: `1930`
- withheld kupong tax liability canonical product policy: `2890`
- use of `2098` when previous-year result not yet transferred according to equity chain
- use of `2091` för retained earnings distribution according to approved equity source decision

## Bindande canonical proof-ledger med exakta konton eller faltutfall

### DIV-P0001 Book dividend liability from previous-year result

- debit `2098`
- credit `2898`

### DIV-P0002 Book dividend liability from retained earnings

- debit `2091`
- credit `2898`

### DIV-P0003 Pay dividend without kupong tax

- debit `2898`
- credit `1930`

### DIV-P0004 Withhold kupong tax on dividend

- debit `2898`
- credit `2890`
- netPayoutReduced: `true`

### DIV-P0005 Pay net dividend when kupong tax withheld

- debit `2898`
- credit `1930`
- amount: `net_after_withholding`

### DIV-P0006 Remit kupong tax

- debit `2890`
- credit `1930`

### DIV-P0007 KU31 filed för Swedish resident recipient

- filingType: `KU31`
- receiptRequired: `true`

### DIV-P0008 Kupong tax return filed

- filingType: `kupongskatt`
- receiptRequired: `true`

### DIV-P0009 Blocked dividend flow

- state: `blocked`
- blockCode: `missing_resolution_or_tax_profile`

## Bindande rapport-, export- och myndighetsmappning

- svenska fysiska personer och dodsbon ska normalt ga till KU31
- kupongbolag ska alltid redovisa utdelning och kupongskatt via relevant kupongskatteredovisning och bilagor enligt Skatteverket
- avstämningsbolag kan redovisa kupongskatt via KU31/3715-flödet enligt Skatteverkets regler

## Bindande scenariofamilj till proof-ledger och rapportspar

- `DIV-A001 approved_dividend_from_2098 -> DIV-P0001 -> liability_booked`
- `DIV-A002 approved_dividend_from_2091 -> DIV-P0002 -> liability_booked`
- `DIV-A003 swedish_resident_dividend_paid -> DIV-P0003,DIV-P0007 -> accepted`
- `DIV-B001 limited_tax_liability_dividend -> DIV-P0004,DIV-P0005,DIV-P0008 -> accepted`
- `DIV-B002 remit_withheld_kupong_tax -> DIV-P0006 -> accepted`
- `DIV-Z001 missing_resolution_or_tax_profile -> DIV-P0009 -> blocked`

## Tvingande dokument- eller indataregler

- `generalMeetingDecisionRef`
- `equitySourceDecision`
- `shareholderIdentity`
- `taxResidenceProfile`
- `grossDividendAmount`
- `withholdingRate`
- `ku31OrKupongFilingMode`
- `filingReceiptRef`

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `DIV-R001 domestic_dividend_ku31`
- `DIV-R002 kupong_tax_withheld`
- `DIV-R003 kupongbolag_reporting`
- `DIV-R004 avstamningsbolag_reporting`
- `DIV-R005 blocked_missing_resolution_or_tax_profile`

## Bindande faltspec eller inputspec per profil

### Swedish resident

- `recipientType`
- `personalIdentityNumberOrEquivalent`
- `grossDividendAmount`
- `ku31Required = true`

### Limited tax liability

- `recipientType`
- `foreignIdentityData`
- `taxResidenceCountry`
- `withholdingRate`
- `kupongTaxRequired = true`

## Scenariofamiljer som hela systemet måste tacka

- approved dividend from previous-year result
- approved dividend from retained earnings
- Swedish resident payout with KU31
- limited taxpayer payout with kupong tax
- kupong tax remittance
- kupongbolag reporting path
- avstämningsbolag reporting path
- blocked missing resolution
- blocked unknown tax profile

## Scenarioregler per familj

- `DIV-A001`: debit `2098`, credit `2898` när utdelning bygger på föregående ars resultat
- `DIV-A002`: debit `2091`, credit `2898` när utdelning bygger på balanserade vinstmedel
- `DIV-A003`: svensk mottagare utan kupongskatt ska betalas från `2898` och fa KU31
- `DIV-B001`: begränsat skattskyldig mottagare ska som default fa kupongskatt enligt gällande regel eller avtal; withholding måste redovisas
- `DIV-B002`: innehållen kupongskatt ska remitteras och receipt registreras
- `DIV-Z001`: saknat stammobeslut eller okand skatteprofil blockerar flödet

## Blockerande valideringar

- deny liability booking without approved annual close and resolution
- deny payout before liability booked
- deny withholding path without verified limited-tax-liability profile
- deny KU31 complete without filing receipt
- deny kupong tax complete without filing receipt

## Rapport- och exportkonsekvenser

- owner ledger ska visa öppen utdelningsskuld per mottagare
- KU31 package ska vara spårbar per mottagare
- kupongskatteredovisning ska visa gross dividend, withheld tax and remittance state

## Förbjudna förenklingar

- ingen utdelning direkt från `2099`
- ingen kupongskatt på svenska obegransat skattskyldiga standardfall
- ingen sammanblandning av kupongskatt och personalskatt
- ingen utbetalning utan resolution

## Fler bindande proof-ledger-regler för specialfall

- om mottagarprofil är oklar ska kupongskattshantering blockeras tills profil verifierats
- kupongbolag ska alltid redovisa utdelning även om ingen kupongskatt innehållits
- corrected filing ska bevara tidigare receipt chain

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `DIV-P0001` och `DIV-P0002` öppnar utdelningsskuld
- `DIV-P0003` minskar utdelningsskuld med utbetalt belopp
- `DIV-P0004` flyttar del av utdelningsskuld till kupongskattsskuld
- `DIV-P0006` stanger kupongskattsskuld

## Bindande verifikations-, serie- och exportregler

- liability booking ska journaliseras i owner-equity/annual decision series
- payout och kupongskattebetalning ska journaliseras i bank/payment series
- KU31 och kupongskatt filings ska ha egen evidence series

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- 2098 vs 2091 source
- Swedish resident vs limited tax liability
- kupongbolag vs avstämningsbolag
- unpaid vs paid vs withheld tax remitted

## Bindande fixture-klasser för utdelning, KU31 och kupongskatt

- `DIV-FXT-001` domestic dividend from previous-year result
- `DIV-FXT-002` domestic dividend from retained earnings
- `DIV-FXT-003` limited-tax-liability dividend with withholding
- `DIV-FXT-004` kupong tax remittance
- `DIV-FXT-005` blocked unknown tax profile

## Bindande expected outcome-format per scenario

- `scenarioId`
- `fixtureClass`
- `expectedProofLedger`
- `expectedFilingType`
- `expectedBlockedOrAllowedStatus`

## Bindande canonical verifikationsseriepolicy

- resolutions and liability bookings ska ligga i equity/declaration decision series
- payouts and remittances ska ligga i bank/payment series
- KU31 and kupong filings ska ligga i owner-tax evidence series

## Bindande expected outcome per central scenariofamilj

### `DIV-A001`

- fixture minimum: `DIV-FXT-001`
- expected proof-ledger: `DIV-P0001,DIV-P0003,DIV-P0007`
- expected filing type: `KU31`
- expected status: `allowed`

### `DIV-B001`

- fixture minimum: `DIV-FXT-003`
- expected proof-ledger: `DIV-P0004,DIV-P0005,DIV-P0008`
- expected filing type: `kupongskatt`
- expected status: `allowed`

### `DIV-Z001`

- fixture minimum: `DIV-FXT-005`
- expected proof-ledger: `DIV-P0009`
- expected status: `blocked`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `DIV-A001 -> DIV-P0001,DIV-P0003,DIV-P0007 -> allowed`
- `DIV-A002 -> DIV-P0002,DIV-P0003,DIV-P0007 -> allowed`
- `DIV-B001 -> DIV-P0004,DIV-P0005,DIV-P0008 -> allowed`
- `DIV-B002 -> DIV-P0006 -> allowed`
- `DIV-Z001 -> DIV-P0009 -> blocked`

## Bindande testkrav

- unit tests för `2098 -> 2898`
- unit tests för `2091 -> 2898`
- unit tests för payout from `2898 -> 1930`
- unit tests för kupong tax withheld to `2890`
- unit tests för remittance `2890 -> 1930`
- integration tests för KU31 filing receipt handling
- integration tests för kupongbolag vs avstämningsbolag filing mode

## Källor som styr dokumentet

- [Skatteverket: Kontrolluppgift om utdelning med mera på delagarratt (KU31)](https://www.skatteverket.se/foretag/skatterochavdrag/kontrolluppgifter/kontrolluppgiftomutdelningmedmerapadelagarratt.4.96cca41179bad4b1aaa568.html)
- [Skatteverket: För dig som lamnat utdelning från ditt aktiebolag (kupongbolag)](https://www.skatteverket.se/foretag/internationellt/kupongskatt/fordigsomlamnatutdelningfrandittaktiebolagkupongbolag.4.6e8a1495181dad540842ee.html)
- [Skatteverket: Exempel på hur du fyller i KU31](https://skatteverket.se/foretag/skatterochavdrag/kontrolluppgifter/kontrolluppgiftomutdelningmedmerapadelagarrattku31/exempelpahurdufyllerikontrolluppgiftenomutdelningmmpadelagarratt.4.3810a01c150939e893f289fc.html)
- [BAS 2025 kontoplan](https://www.bas.se/wp-content/uploads/2025/01/Kontoplan-BAS-2025.pdf)
