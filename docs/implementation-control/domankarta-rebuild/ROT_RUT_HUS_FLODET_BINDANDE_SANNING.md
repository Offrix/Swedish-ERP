# ROT_RUT_HUS_FLÖDET_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för HUS-flödet under fakturamodellen, vilket i denna produkt betyder ROT och RUT som claim-lifecycle från HUS-klassad faktura till kundbetalning, ansokan, beslut, utbetalning, delavslag och återkrav.

Detta dokument ska styra:
- HUS-overlay på kundfaktura
- delad faktura mellan kundens andel och statlig fordran
- kundbetalningsgate
- ansokan om utbetalning till Skatteverket
- XML/importregler
- delgodkännande, avslag och återkrav
- bokföring av kunddel, statlig fordran och recovery

## Syfte

Detta dokument finns för att:
- HUS aldrig ska bli en fri rabattmotor
- bara arbetskostnad ska ge underlag för preliminar skattereduktion
- kundbetalning, ansokan, beslut och utbetalning alltid ska ga att spåra
- delad faktura och state receivable ska bokföras exakt
- delavslag och återkrav aldrig ska forsvinna i vanlig kundreskontra eller bankdiff

## Omfattning

Detta dokument omfattar:
- ROT
- RUT
- HUS case lifecycle under fakturamodellen
- kundfaktura med preliminar reduktion
- ansokan om utbetalning
- myndighetsbeslut
- utbetalning eller kvittning
- delavslag, avslag och återkrav

Detta dokument omfattar inte:
- grön teknik, som ägs av separat dokument
- allman kundfakturering utan HUS
- validering av fakturans allmanna fakturakrav, som ägs av fakturabibeln

## Absoluta principer

- HUS får bara beräknas på arbetskostnad
- material, resor, maskinhyra, administration och ändra icke-arbetskostnader får aldrig inga i HUS-underlaget
- arbetet måste vara utfort och kunden måste ha betalat sin del innan ansokan om utbetalning får skickas
- elektronisk betalning är bindande krav för ROT och RUT under fakturamodellen
- delad faktura måste visa total arbetskostnad, preliminar skattereduktion och kundens betalningsandel
- claim får aldrig skickas om köparidentitet, arbetsandel, bostads-/fastighetsuppgifter eller betalningsbevis saknas
- om claim avslas eller godkänns delvis ska differensen explicit flyttas till kundfordran, recovery liability eller blockerfall; den får aldrig forsvinna
- grön teknik får aldrig blandas i samma sanningslager som ROT/RUT

## Bindande dokumenthierarki för ROT, RUT och HUS-flödet

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
- `KUNDINBETALNINGAR_OCH_KUNDRESKONTRA_BINDANDE_SANNING.md`
- `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md`
- Skatteverkets regler om ROT och RUT för utforare
- BAS-kontoplanens delad-faktura-konto `1513`

## Kanoniska objekt

- `HusCase`
- `HusServiceLine`
- `HusBuyerAllocation`
- `HusClaimVersion`
- `HusDecision`
- `HusRecoveryCase`
- `HusPaymentEvidence`
- `HusClaimBlocker`

## Kanoniska state machines

### `HusCase`

- `draft`
- `classified`
- `invoiced`
- `customer_partially_paid`
- `customer_paid`
- `claim_ready`
- `claim_submitted`
- `partially_accepted`
- `accepted`
- `rejected`
- `recovery_pending`
- `closed`
- `blocked`

### `HusClaimVersion`

- `draft`
- `ready`
- `submitted`
- `accepted`
- `rejected`
- `superseded`

### `HusRecoveryCase`

- `open`
- `review_pending`
- `customer_recourse_opened`
- `state_repayment_pending`
- `closed`
- `blocked`

## Kanoniska commands

- `RegisterHusCase`
- `ClassifyHusServiceLine`
- `CreateHusBuyerAllocation`
- `LockHusInvoiceOverlay`
- `RegisterHusCustomerPaymentEvidence`
- `CreateHusClaimVersion`
- `SubmitHusClaimVersion`
- `RegisterHusDecision`
- `OpenHusRecoveryCase`
- `BlockHusCase`

## Kanoniska events

- `HusCaseRegistered`
- `HusServiceLineClassified`
- `HusBuyerAllocationCreated`
- `HusInvoiceOverlayLocked`
- `HusCustomerPaymentEvidenceRegistered`
- `HusClaimVersionCreated`
- `HusClaimSubmitted`
- `HusDecisionRegistered`
- `HusRecoveryCaseOpened`
- `HusCaseBlocked`

## Kanoniska route-familjer

- `POST /v1/hus/cases`
- `POST /v1/hus/cases/{id}/lock-invoice-overlay`
- `POST /v1/hus/cases/{id}/register-payment-evidence`
- `POST /v1/hus/cases/{id}/claims`
- `POST /v1/hus/claims/{id}/submit`
- `POST /v1/hus/decisions`
- `POST /v1/hus/recovery-cases`

## Kanoniska permissions och review boundaries

- live claim submission kraver dual review
- delavslag, avslag och återkrav kraver finance/legal review
- support får inte skapa HUS claim utan verifierad kundbetalning

## Nummer-, serie-, referens- och identitetsregler

- varje `HusCase` ska ha unikt `husCaseId`
- varje claim-version ska ha `versionNo` och `payloadHash`
- varje buyer allocation ska innehålla personnummer
- ROT- och RUT-ansokningar får inte blandas i samma XML-importfil

## Valuta-, avrundnings- och omräkningsregler

- HUS ska byggas i SEK
- preliminar skattereduktion ska beräknas på arbetskostnad enligt rate pack för betalningsdatum
- claim amount får aldrig overstiga betalt belopp för arbetskostnad som ansokan avser

## Replay-, correction-, recovery- och cutover-regler

- HUS replay ska återbygga claim readiness från invoice snapshot, payment evidence och buyer allocation
- ny claim-version ska superseda tidigare version utan att ta bort historik
- återkrav efter tidigare utbetalning ska skapa separat recovery chain
- migration måste landa claim state, beslut, utbetalning och eventuellt återkrav separat

## Huvudflödet

1. HUS-klassade arbetsrader skapas på faktura
2. kundens andel och statlig andel delas upp
3. kunden betalar sin del elektroniskt
4. betalningsbevis registreras
5. claim-version byggs och skickas
6. Skatteverket beslutar
7. utbetalning, kvittning, delavslag eller avslag registreras
8. vid efterföljande kredit eller beslutsoandring öppnas recovery case

## Bindande scenarioaxlar

- service type: `rot`, `rut`
- payment state: `none`, `partial`, `full`
- decision outcome: `accepted`, `partial`, `rejected`, `recovered`
- recovery settlement: `customer_recourse`, `state_offset_1630`, `direct_repayment_liability`
- rate profile: `rot_30`, `rut_50`, `historical_ratepack`

## Bindande policykartor

- customer receivable account: `1510`
- split-invoice state receivable account: `1513`
- bank cash account: `1930`
- tax account offset account: `1630`
- direct recovery liability pending repayment: `2890`
- customer payment gate: `must_be_electronic`
- mixed rot and rut in same import file: `forbidden`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

### HUS-P0001 Issue HUS invoice with split receivable

- debit `1510` för customer payable portion
- debit `1513` för state claim portion
- credit underlying revenue account according to invoice revenue class
- credit underlying output VAT account according to invoice VAT class

### HUS-P0002 Customer payment of customer share

- debit `1930`
- credit `1510`
- paymentEvidenceRequired: `true`

### HUS-P0003 State payout accepted

- debit `1930`
- credit `1513`

### HUS-P0004 State payout offset against skattekonto debt

- debit `1630`
- credit `1513`
- offsetInsteadOfBankPayment: `true`

### HUS-P0005 Partial or denied claim before payout with customer recourse

- debit `1510`
- credit `1513`
- createsSupplementaryCustomerClaim: `true`

### HUS-P0006 Recovery after prior payout with direct repayment pending

- credit `2890`
- customerRecourseOrApprovedAbsorptionRequired: `true`

### HUS-P0007 Repayment of recovery liability

- debit `2890`
- credit `1930`

### HUS-P0008 Blocked HUS claim

- claimState: `blocked`
- blockCode: `missing_required_fields_or_payment_evidence`

## Bindande rapport-, export- och myndighetsmappning

- claim XML/import package ska bara bygga på lockad claim-version
- beslutskvittenser och utbetalningsbesked ska bevaras som audit evidence
- partial acceptance ska ge explicit differensrapport mellan begart och beviljat belopp

## Bindande scenariofamilj till proof-ledger och rapportspar

- `HUS-A001 issued_rot_invoice -> HUS-P0001 -> invoiced`
- `HUS-A002 customer_paid_share -> HUS-P0002 -> customer_paid`
- `HUS-A003 accepted_claim_bank_payout -> HUS-P0003 -> accepted`
- `HUS-A004 accepted_claim_tax_account_offset -> HUS-P0004 -> accepted`
- `HUS-B001 partial_or_denied_claim_before_payout -> HUS-P0005 -> customer_recourse`
- `HUS-B002 recovery_after_prior_payout -> HUS-P0006 -> recovery_pending`
- `HUS-B003 repayment_of_recovery -> HUS-P0007 -> closed`
- `HUS-Z001 blocked_missing_fields_or_payment -> HUS-P0008 -> blocked`

## Tvingande dokument- eller indataregler

- `serviceType`
- `buyerPersonnummer`
- `buyerName`
- `laborAmount`
- `nonLaborAmount`
- `preliminaryReductionAmount`
- `paymentDate`
- `paymentAmount`
- `paymentEvidenceRef`
- `workFromDate`
- `workToDate`
- `propertyOrResidenceIdentity`

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `HUS-R001 rot_standard`
- `HUS-R002 rut_standard`
- `HUS-R003 historical_ratepack`
- `HUS-R004 state_offset_against_tax_account`
- `HUS-R005 denied_or_partial_claim_customer_recourse`
- `HUS-R006 recovery_after_prior_payout`
- `HUS-R007 blocked_missing_payment_or_identity`

## Bindande faltspec eller inputspec per profil

### ROT

- `buyerPersonnummer`
- `buyerName`
- `propertyDesignation` eller `brfOrganizationNumber` + `apartmentNumber`
- `workAddress`
- `workFromDate`
- `workToDate`
- `laborAmount`
- `materialAndOtherAmount`
- `preliminaryReductionAmount`
- `customerShareAmount`

### RUT

- `buyerPersonnummer`
- `buyerName`
- `workAddress`
- `workFromDate`
- `workToDate`
- `laborAmount`
- `materialAndOtherAmount`
- `preliminaryReductionAmount`
- `customerShareAmount`

## Scenariofamiljer som hela systemet måste tacka

- issued ROT invoice
- issued RUT invoice
- partial customer payment
- full customer payment and claim-ready
- accepted payout to bank
- accepted payout offset to skattekonto
- partial claim
- denied claim
- post-payout credit or reduction triggering recovery
- blocked non-electronic payment
- blocked missing personnummer/property split

## Scenarioregler per familj

- `HUS-A001-HUS-A002`: delad faktura ska alltid skapa `1510` + `1513` med underliggande revenue/VAT intact
- `HUS-A003`: state payout till bank ska stanga `1513`
- `HUS-A004`: om Skatteverket kvittar mot bolagets skatteskuld ska `1630` användas i stallet för `1930`
- `HUS-B001`: delavslag eller avslag innan state payout ska flytta nekad andel från `1513` till `1510`
- `HUS-B002`: återkrav efter tidigare payout ska skapa recovery liability på `2890` tills reglering skett
- `HUS-Z001`: claim utan elektronisk betalning eller utan required identity split ska blockeras

## Blockerande valideringar

- deny HUS claim om arbetet inte är utfort
- deny HUS claim om kunden inte betalat sin del
- deny HUS claim om betalning inte är elektronisk
- deny HUS claim om arbetskostnad inte är separerad från övriga kostnader
- deny mixed ROT/RUT XML import file
- deny claim amount greater than paid labor amount eligible under rulepack

## Rapport- och exportkonsekvenser

- customer invoice preview ska visa customer share och preliminary reduction separat
- HUS-claim export ska visa buyer split per person
- recovery report ska visa outstanding `1513`, `2890` och eventuellt `1510` recourse

## Förbjudna förenklingar

- ingen HUS på material, resa eller administration
- ingen claim före betalning
- ingen claim före utfört arbete
- ingen blandning av rot och rut i samma importfil
- ingen tyst write-off av nekad eller recovered state portion

## Fler bindande proof-ledger-regler för specialfall

- partial customer payment får bara göra motsvarande andel claimable enligt betald arbetskostnad
- om kund redan utnyttjat maximalt avdrag ska HUS fall inte auto-grönmarkeras utan decisionsvar invantas
- om bolaget har skatteskuld och utbetalningen kvittas mot skattekontot ska bankutbetalning inte skapas

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `HUS-P0001` öppnar kundfordran och statlig split-receivable samtidigt
- `HUS-P0003` stanger statlig split-receivable via bank
- `HUS-P0004` stanger statlig split-receivable via `1630`
- `HUS-P0005` öppnar eller okar kundfordran igen
- `HUS-P0006` skapar recovery liability

## Bindande verifikations-, serie- och exportregler

- HUS issue posting ska ligga i samma invoice/voucher chain som fakturan
- state payout, tax-account offset och recovery repayment ska ligga i bank/tax-account settlement series
- varje claim-version ska knytas till payload hash och receipt chain

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- ROT vs RUT
- accepted vs partial vs rejected
- bank payout vs tax account offset
- pre-payout denial vs post-payout recovery
- single buyer vs multi-buyer allocation

## Bindande fixture-klasser för ROT/RUT/HUS

- `HUS-FXT-001` standard rot invoice fully paid and accepted
- `HUS-FXT-002` standard rut invoice fully paid and accepted
- `HUS-FXT-003` partial customer payment
- `HUS-FXT-004` partial claim acceptance
- `HUS-FXT-005` denied claim
- `HUS-FXT-006` accepted claim offset against tax account
- `HUS-FXT-007` post-payout credit triggering recovery
- `HUS-FXT-008` blocked non-electronic payment

## Bindande expected outcome-format per scenario

- `scenarioId`
- `fixtureClass`
- `expectedProofLedger`
- `expectedClaimState`
- `expectedCustomerReceivableEffect`
- `expectedStateReceivableOrLiabilityEffect`
- `expectedBlockedOrAllowedStatus`

## Bindande canonical verifikationsseriepolicy

- delad faktura ska journaliseras i invoice series
- state payout och recovery ska journaliseras i settlement/tax-account series
- manual journal utan husCase-ref är förbjuden

## Bindande expected outcome per central scenariofamilj

### `HUS-A001`

- fixture minimum: `HUS-FXT-001`
- expected proof-ledger: `HUS-P0001`
- expected customer receivable effect: `1510_open`
- expected state receivable effect: `1513_open`
- expected status: `allowed`

### `HUS-A004`

- fixture minimum: `HUS-FXT-006`
- expected proof-ledger: `HUS-P0004`
- expected state receivable effect: `1513_closed_via_1630`
- expected status: `allowed`

### `HUS-Z001`

- fixture minimum: `HUS-FXT-008`
- expected proof-ledger: `HUS-P0008`
- expected status: `blocked`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `HUS-A001 -> HUS-P0001 -> allowed`
- `HUS-A002 -> HUS-P0002 -> allowed`
- `HUS-A003 -> HUS-P0003 -> allowed`
- `HUS-A004 -> HUS-P0004 -> allowed`
- `HUS-B001 -> HUS-P0005 -> allowed`
- `HUS-B002 -> HUS-P0006 -> allowed_reviewed`
- `HUS-B003 -> HUS-P0007 -> allowed`
- `HUS-Z001 -> HUS-P0008 -> blocked`

## Bindande testkrav

- unit tests för split invoice `1510 + 1513`
- unit tests för partial customer payment gate
- unit tests för mixed rot/rut XML import blocking
- unit tests för accepted payout to bank vs offset to `1630`
- unit tests för denied claim reclassifying `1513 -> 1510`
- unit tests för recovery liability `2890`
- integration tests för full invoice -> payment -> claim -> decision -> payout chain

## Källor som styr dokumentet

- [Skatteverket: Rot och rut](https://www.skatteverket.se/foretag/skatterochavdrag/rotochrut.4.2ef18e6a125660db8b080002674.html)
- [Skatteverket: Sa fungerar rotavdraget](https://skatteverket.se/foretag/skatterochavdrag/rotochrut/safungerarrotavdraget.4.2ef18e6a125660db8b080002709.html)
- [Skatteverket: Rotarbete och rutarbete](https://skatteverket.se/privat/fastigheterochbostad/rotarbeteochrutarbete.4.2e56d4ba1202f95012080002966.html)
- [Skatteverket: Requesting payment](https://skatteverket.se/servicelankar/otherlanguages/englishengelska/businessesandemployers/startingandrunningaswedishbusiness/declaringtaxesbusinesses/rotandrutwork/payment/requestingpayment.4.8dcbbe4142d38302d7cdc.html)
- [Skatteverket: Regler för att importera fil till Rot och rut](https://skatteverket.se/foretag/etjansterochblanketter/allaetjanster/tjanster/rotochrutforetag/reglerforattimporterafiltillrotochrut.4.76a43be412206334b89800033198.html)
- [BAS 2025: konto 1513 Kundfordringar - delad faktura](https://www.bas.se/wp-content/uploads/2025/01/Kontoplan-BAS-2025.pdf)
- [FAKTURAFLÖDET_BINDANDE_SANNING.md](C:/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/domankarta-rebuild/FAKTURAFLODET_BINDANDE_SANNING.md)
