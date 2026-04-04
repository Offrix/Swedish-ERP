# GRÖN_TEKNIK_FLÖDET_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för claim-lifecyclen för skattereduktion för installation av grön teknik, från delad faktura till kundbetalning, ansokan, beslut, utbetalning, delavslag och återkrav.

Detta dokument ska styra:
- grön-teknik-overlay på faktura
- split invoice mellan kunddel och statlig del
- eligibilitet för solceller, batteri och laddningspunkt
- elektronisk kundbetalning
- ansokan om utbetalning
- state payout eller skattekontooffset
- momstidpunkt under faktureringsmetoden och bokslutsmetoden
- återkrav

## Syfte

Detta dokument finns för att:
- grön teknik aldrig ska behandlas som ROT/RUT med fel underlag
- reduktionssats alltid ska vara versionerad per installationstyp och datum
- arbete och material ska skiljas från övriga kostnader
- momsredovisning enligt bokslutsmetoden inte ska bli fel när statlig del betalas senare

## Omfattning

Detta dokument omfattar:
- solcellssystem
- system för lagring av egenproducerad elenergi
- laddningspunkt till elfordon
- split invoice under grön teknik
- claim, payout, offset och recovery
- momsutfall för faktureringsmetoden och bokslutsmetoden

Detta dokument omfattar inte:
- ROT/RUT
- mikroproduktionsskattereduktion
- generell kundfakturering utan grön teknik

## Absoluta principer

- grön teknik bygger på kostnad för arbete och material, inte bara arbete
- elektronisk betalning är bindande krav
- installationen måste vara pabörjad, utford och betald inom regelverket
- reduktionssats måste styras av versionerat rulepack och installationstyp
- solcellsinstallationer med betalning efter 1 juli 2025 ska defaulta till 15 procent enligt gällande regel
- batteri och laddningspunkt ska defaulta till 50 procent enligt gällande regel
- faktureringsmetoden och bokslutsmetoden får aldrig ge samma momsutfall av ren bekvamlighet

## Bindande dokumenthierarki för grön teknik-flödet

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- `DOMAIN_11_ROADMAP.md`
- `DOMAIN_11_IMPLEMENTATION_LIBRARY.md`
- detta dokument

Detta dokument lutar på:
- `FAKTURAFLODET_BINDANDE_SANNING.md`
- `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md`
- `MOMSFLODET_BINDANDE_SANNING.md`
- Skatteverkets regler om grön teknik

## Kanoniska objekt

- `GreenTechCase`
- `GreenTechInstallationLine`
- `GreenTechClaimVersion`
- `GreenTechDecision`
- `GreenTechRecoveryCase`
- `GreenTechPaymentEvidence`
- `GreenTechVatTimingDecision`
- `GreenTechBlocker`

## Kanoniska state machines

### `GreenTechCase`

- `draft`
- `classified`
- `invoiced`
- `customer_partially_paid`
- `customer_paid`
- `claim_ready`
- `claim_submitted`
- `accepted`
- `partially_accepted`
- `rejected`
- `recovery_pending`
- `closed`
- `blocked`

### `GreenTechClaimVersion`

- `draft`
- `ready`
- `submitted`
- `accepted`
- `rejected`
- `superseded`

### `GreenTechVatTimingDecision`

- `draft`
- `resolved`
- `applied`
- `superseded`

## Kanoniska commands

- `RegisterGreenTechCase`
- `ClassifyGreenTechInstallationLine`
- `LockGreenTechInvoiceOverlay`
- `RegisterGreenTechPaymentEvidence`
- `ResolveGreenTechVatTimingDecision`
- `CreateGreenTechClaimVersion`
- `SubmitGreenTechClaimVersion`
- `RegisterGreenTechDecision`
- `OpenGreenTechRecoveryCase`
- `BlockGreenTechCase`

## Kanoniska events

- `GreenTechCaseRegistered`
- `GreenTechInstallationLineClassified`
- `GreenTechInvoiceOverlayLocked`
- `GreenTechPaymentEvidenceRegistered`
- `GreenTechVatTimingDecisionResolved`
- `GreenTechClaimVersionCreated`
- `GreenTechClaimSubmitted`
- `GreenTechDecisionRegistered`
- `GreenTechRecoveryCaseOpened`
- `GreenTechCaseBlocked`

## Kanoniska route-familjer

- `POST /v1/green-tech/cases`
- `POST /v1/green-tech/cases/{id}/lock-invoice-overlay`
- `POST /v1/green-tech/cases/{id}/register-payment-evidence`
- `POST /v1/green-tech/cases/{id}/claims`
- `POST /v1/green-tech/claims/{id}/submit`
- `POST /v1/green-tech/decisions`

## Kanoniska permissions och review boundaries

- live claim submission kraver dual review
- ratepack override kraver legal/compliance review
- bokslutsmetodens VAT timing override får inte ske utan explicit review

## Nummer-, serie-, referens- och identitetsregler

- varje `GreenTechCase` ska ha unikt `greenTechCaseId`
- varje claim-version ska ha `versionNo` och `payloadHash`
- varje installation line ska ha `installationTypeCode`
- varje beslut ska knytas till exakt claim-version

## Valuta-, avrundnings- och omräkningsregler

- grön teknik ska byggas i SEK
- reduktionen ska beräknas på arbets- och materialkostnad inklusive moms enligt Skatteverkets modell
- om utlandsk aktor ansoker ska beloppen omräknas till SEK på kursen dagen da kunden betalade

## Replay-, correction-, recovery- och cutover-regler

- replay ska återbygga claim readiness från invoice snapshot, installation classification, payment evidence och vat-timing decision
- ny claim-version ska superseda tidigare version utan att ta bort historik
- återkrav ska skapa separat recovery chain
- migration måste landa accepted amounts, paid amounts, VAT timing basis och recovery separat

## Huvudflödet

1. grön-teknik-klassade rader laggs på faktura
2. reduktionsbar kostnad och sats faststalls
3. delad faktura byggs
4. kunden betalar sin del elektroniskt
5. claim-version skapas och skickas
6. beslut registreras
7. utbetalning, kvittning, delavslag eller återkrav registreras
8. momsutfallet följer accounting method-regeln

## Bindande scenarioaxlar

- installation type: `solar`, `battery_storage`, `ev_charger`
- accounting method: `invoice_method`, `cash_method`
- decision outcome: `accepted`, `partial`, `rejected`, `recovered`
- payout mode: `bank`, `tax_account_offset`
- ratepack profile: `solar_15`, `battery_50`, `ev_charger_50`, `historical_ratepack`

## Bindande policykartor

- customer receivable account: `1510`
- split-invoice state receivable account: `1513`
- bank cash account: `1930`
- tax account offset account: `1630`
- direct recovery liability pending repayment: `2890`
- solar baseline rate from 2025-07-01 onward: `15%`
- battery baseline rate: `50%`
- ev charger baseline rate: `50%`
- totalentreprenad schablon för work+material: `97%`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

### GT-P0001 Issue green-tech invoice with split receivable

- debit `1510` för customer payable portion
- debit `1513` för state claim portion
- credit underlying revenue account according to revenue class
- credit underlying output VAT account according to VAT class

### GT-P0002 Customer payment of customer share

- debit `1930`
- credit `1510`
- paymentEvidenceRequired: `true`

### GT-P0003 State payout accepted to bank

- debit `1930`
- credit `1513`

### GT-P0004 State payout offset against skattekonto debt

- debit `1630`
- credit `1513`

### GT-P0005 Partial or denied claim before payout with customer recourse

- debit `1510`
- credit `1513`

### GT-P0006 Recovery after prior payout

- credit `2890`
- recoveryPending: `true`

### GT-P0007 Recovery repayment

- debit `2890`
- credit `1930`

### GT-P0008 Cash-method VAT step 1 customer payment

- vatTimingPhase: `customer_share_only`
- onlyVatOnCustomerPaidPortion: `true`

### GT-P0009 Cash-method VAT step 2 state payout

- vatTimingPhase: `state_share_completion`
- remainingVatRecognizedOnStatePayout: `true`

### GT-P0010 Blocked green-tech claim

- claimState: `blocked`
- blockCode: `missing_required_fields_or_payment_evidence`

## Bindande rapport-, export- och myndighetsmappning

- claim package ska bygga på lockad claim-version
- besluts- och utbetalningsbesked ska bevaras som audit evidence
- VAT evidence ska visa steg 1 och steg 2 under bokslutsmetoden

## Bindande scenariofamilj till proof-ledger och rapportspar

- `GT-A001 issued_solar_invoice -> GT-P0001 -> invoiced`
- `GT-A002 customer_paid_share -> GT-P0002 -> customer_paid`
- `GT-A003 accepted_claim_bank_payout -> GT-P0003 -> accepted`
- `GT-A004 accepted_claim_tax_account_offset -> GT-P0004 -> accepted`
- `GT-B001 partial_or_denied_claim_before_payout -> GT-P0005 -> customer_recourse`
- `GT-B002 recovery_after_prior_payout -> GT-P0006 -> recovery_pending`
- `GT-B003 repayment_of_recovery -> GT-P0007 -> closed`
- `GT-C001 cash_method_customer_payment_vat -> GT-P0008 -> vat_step_1`
- `GT-C002 cash_method_state_payout_vat -> GT-P0009 -> vat_step_2`
- `GT-Z001 blocked_missing_fields_or_payment -> GT-P0010 -> blocked`

## Tvingande dokument- eller indataregler

- `installationTypeCode`
- `buyerPersonnummer`
- `buyerName`
- `propertyOrResidenceIdentity`
- `workAmount`
- `materialAmount`
- `otherCostAmount`
- `reductionRate`
- `paymentDate`
- `paymentAmount`
- `paymentEvidenceRef`

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `GT-R001 solar_installation`
- `GT-R002 battery_storage_installation`
- `GT-R003 ev_charger_installation`
- `GT-R004 state_offset_against_tax_account`
- `GT-R005 denied_or_partial_claim_customer_recourse`
- `GT-R006 recovery_after_prior_payout`
- `GT-R007 blocked_missing_payment_or_identity`

## Bindande faltspec eller inputspec per profil

### Solar

- `installationTypeCode = solar`
- `rate = 15%` from rulepack where applicable
- `eligibleBase = work + material`

### Battery storage

- `installationTypeCode = battery_storage`
- `rate = 50%`
- `eligibleBase = work + material`

### EV charger

- `installationTypeCode = ev_charger`
- `rate = 50%`
- `eligibleBase = work + material`

## Scenariofamiljer som hela systemet måste tacka

- issued solar invoice
- issued battery invoice
- issued EV charger invoice
- partial customer payment
- full customer payment and claim-ready
- accepted payout to bank
- accepted payout offset to skattekonto
- partial claim
- denied claim
- cash-method VAT two-step recognition
- blocked non-electronic payment

## Scenarioregler per familj

- `GT-A001-GT-A003`: delad faktura ska alltid skapa `1510` + `1513`
- `GT-A003`: bankutbetalning ska stanga `1513`
- `GT-A004`: offset mot skattekonto ska använda `1630`
- `GT-B001`: nekad eller reducerad andel före payout ska flyttas från `1513` till `1510`
- `GT-B002`: återkrav efter tidigare payout ska skapa recovery liability på `2890`
- `GT-C001-GT-C002`: vid bokslutsmetoden ska moms redovisas i två steg; vid faktureringsmetoden redovisas hela momsen vid issue
- `GT-Z001`: claim utan elektronisk betalning eller utan kravfalten ska blockeras

## Blockerande valideringar

- deny green-tech claim om installationen inte är utförd
- deny green-tech claim om kunden inte betalat sin del
- deny green-tech claim om betalningen inte är elektronisk
- deny claim om arbete och material inte kan separeras från övriga kostnader eller totalentreprenadschablon inte är korrekt tillämpad
- deny rate selection som inte matchar installationstyp och datum

## Rapport- och exportkonsekvenser

- invoice preview ska visa customer share och preliminar reduktion separat
- claim export ska visa installationstyp och ratepack
- VAT report under bokslutsmetoden ska kunna visa steg 1 och steg 2

## Förbjudna förenklingar

- ingen rot/rut-rate på grön teknik
- ingen claim före betalning
- ingen kontantbetalning
- ingen helmomsredovisning vid bokslutsmetoden före state payout
- ingen tyst write-off av nekad eller recovered state portion

## Fler bindande proof-ledger-regler för specialfall

- om totalkostnad faktureras som totalentreprenad får endast 97 procent av totalpriset behandlas som arbete+material
- om resor inte debiteras separat kan de anses ingå i kostnaden för arbete/material och darfor ge lagre utbetalning; case ska markeras review-sensitive
- om bolaget har skatteskuld och utbetalningen kvittas mot skattekontot ska bankutbetalning inte skapas

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `GT-P0001` öppnar kundfordran och state receivable samtidigt
- `GT-P0003` stanger state receivable via bank
- `GT-P0004` stanger state receivable via `1630`
- `GT-P0005` öppnar eller okar kundfordran igen
- `GT-P0006` skapar recovery liability

## Bindande verifikations-, serie- och exportregler

- green-tech issue posting ska ligga i invoice series
- state payout, tax-account-offset och recovery repayment ska ligga i settlement/tax-account series
- VAT timing decisions ska vara del av evidence bundle

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- solar vs battery vs ev charger
- invoice method vs cash method
- accepted vs partial vs rejected
- bank payout vs tax account offset
- pre-payout denial vs post-payout recovery

## Bindande fixture-klasser för grön teknik

- `GT-FXT-001` solar invoice accepted and paid
- `GT-FXT-002` battery invoice accepted and paid
- `GT-FXT-003` EV charger invoice accepted and paid
- `GT-FXT-004` partial customer payment
- `GT-FXT-005` partial claim acceptance
- `GT-FXT-006` accepted claim offset against tax account
- `GT-FXT-007` cash-method VAT two-step
- `GT-FXT-008` blocked non-electronic payment

## Bindande expected outcome-format per scenario

- `scenarioId`
- `fixtureClass`
- `expectedProofLedger`
- `expectedClaimState`
- `expectedVatTimingOutcome`
- `expectedStateReceivableOrLiabilityEffect`
- `expectedBlockedOrAllowedStatus`

## Bindande canonical verifikationsseriepolicy

- delad faktura ska journaliseras i invoice series
- state payout och recovery ska journaliseras i settlement/tax-account series
- VAT step 1 och step 2 får inte tappas bort i bokslutsmetoden

## Bindande expected outcome per central scenariofamilj

### `GT-A001`

- fixture minimum: `GT-FXT-001`
- expected proof-ledger: `GT-P0001`
- expected state receivable effect: `1513_open`
- expected status: `allowed`

### `GT-C001`

- fixture minimum: `GT-FXT-007`
- expected proof-ledger: `GT-P0008`
- expected vat timing outcome: `customer_share_only`
- expected status: `allowed`

### `GT-Z001`

- fixture minimum: `GT-FXT-008`
- expected proof-ledger: `GT-P0010`
- expected status: `blocked`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `GT-A001 -> GT-P0001 -> allowed`
- `GT-A002 -> GT-P0002 -> allowed`
- `GT-A003 -> GT-P0003 -> allowed`
- `GT-A004 -> GT-P0004 -> allowed`
- `GT-B001 -> GT-P0005 -> allowed`
- `GT-B002 -> GT-P0006 -> allowed_reviewed`
- `GT-B003 -> GT-P0007 -> allowed`
- `GT-C001 -> GT-P0008 -> allowed`
- `GT-C002 -> GT-P0009 -> allowed`
- `GT-Z001 -> GT-P0010 -> blocked`

## Bindande testkrav

- unit tests för split invoice `1510 + 1513`
- unit tests för ratepack by installation type and date
- unit tests för totalentreprenad 97-percent base
- unit tests för cash-method VAT step 1 and step 2
- unit tests för accepted payout to bank vs offset to `1630`
- unit tests för denied claim reclassifying `1513 -> 1510`
- integration tests för invoice -> payment -> claim -> decision -> payout chain

## Källor som styr dokumentet

- [Skatteverket: Sa fungerar skattereduktionen för grön teknik](https://www.skatteverket.se/foretag/skatterochavdrag/gronteknik/safungerarskattereduktionenforgronteknik.4.676f4884175c97df4192a52.html)
- [Skatteverket: Grön teknik](https://www.skatteverket.se/foretag/skatterochavdrag/gronteknik.4.676f4884175c97df4192a42.html)
- [Skatteverket: Godkända arbeten - grön teknik](https://www.skatteverket.se/privat/fastigheterochbostad/gronteknik/godkandaarbetengronteknik.4.676f4884175c97df419290e.html)
- [Skatteverket: Exempelfaktura grön teknik](https://www.skatteverket.se/download/18.1997e70d1848dabbac944d2/1708607900674/exempelfaktura-gron-teknik.pdf)
- [Skatteverket: Återbetalning - Installation av grön teknik, rot- eller rutarbete (SKV 4533)](https://www.skatteverket.se/foretag/etjansterochblanketter/blanketterbroschyrer/blanketter/info/4533.4.2ef18e6a125660db8b080003472.html)
- [Skatteverket: Nya lagar och regler från 1 juli 2025](https://skatteverket.se/omoss/pressochmedia/nyheter/2025/nyheter/nyalagarochreglerfran1juli2025.5.6e1dd38d196873bc1e15c36.html)
