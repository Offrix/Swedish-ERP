# AGI_FLÖDET_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för arbetsgivardeklaration på individniva som process, inklusive periodlasing, individuppgiftsbyggnad, huvuduppgift, rättelser, borttag, transport, kvittens och blockerregler.

Detta dokument ska styra:
- byggnad av AGI per redovisningsperiod
- huvuduppgift och individuppgifter
- specifikationsnummer
- submission och kvittens
- rättelse och borttag
- frånvarouppgift som skickas vidare till Försäkringskassan
- blockerregler för live submission

## Syfte

Detta dokument finns för att:
- AGI aldrig ska reduceras till grova buckets
- varje redovisningsperiod ska ge exakt en canonical AGI-sanning
- correction och borttag alltid ska ske med samma identifikatorer och korrekt periodlogik
- tekniskt godkänd inlamning och regulatoriskt korrekt innehåll inte ska blandas ihop

## Omfattning

Detta dokument omfattar:
- AGI-period
- huvuduppgift
- individuppgift
- submission package
- teknisk inlamning
- receipt och kontrollresultat
- rattad AGI
- borttag av individuppgift
- frånvarouppgift kopplad till AGI

Detta dokument omfattar inte:
- exakt fältruta-för-ruta-mappning av alla individuppgifter, den ägs av `AGI_FALTKARTA_OCH_RATTELSER_BINDANDE_SANNING.md`
- preliminarskatteberakning
- arbetsgivaravgiftsberakning
- pensionsutbetalning utanför arbetsgivarflödet

## Absoluta principer

- en AGI bestar av en huvuduppgift per redovisningsperiod och en eller flera individuppgifter för varje betalningsmottagare
- varje individuppgift måste ha exakt ett skattefalt ifyllt eller kryssat; fler an ett skattefalt är otillatet
- om en betalningsmottagare omfattas av olika skatteregimer under samma period ska flera individuppgifter skapas med olika specifikationsnummer
- alla belopp ska redovisas i heltal
- rättelse ska skickas som ny rattad AGI för samma period
- när individuppgift rattas ska samma identifikatorer och samma specifikationsnummer användas för att ersätta tidigare uppgift
- frånvarouppgifter som redan lamnats till Skatteverket för vidarebefordran till Försäkringskassan kan inte rattas där efter inlamning; rättning sker hos Försäkringskassan
- live AGI-submission får aldrig markeras grön utan riktig receipt från Skatteverket eller verifierad transportpartner

## Bindande dokumenthierarki för AGI-flödet

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
- `PRELIMINARSKATT_OCH_SKATTETABELLER_BINDANDE_SANNING.md`
- `ARBETSGIVARAVGIFTER_OCH_SPECIALREGLER_BINDANDE_SANNING.md`
- `AGI_FALTKARTA_OCH_RATTELSER_BINDANDE_SANNING.md`
- Skatteverkets tekniska beskrivning för arbetsgivardeklaration

## Kanoniska objekt

- `AgiPeriodReturn`
- `AgiMainReturn`
- `AgiIndividualReturn`
- `AgiSubmissionPackage`
- `AgiTechnicalReceipt`
- `AgiCorrectionCase`
- `AgiRemovalCase`
- `AgiAbsenceTransferCase`
- `AgiSubmissionBlocker`

## Kanoniska state machines

### `AgiPeriodReturn`

- `draft`
- `built`
- `review_pending`
- `submitted`
- `accepted`
- `partially_rejected`
- `rejected`
- `corrected`
- `closed`

### `AgiCorrectionCase`

- `draft`
- `review_pending`
- `submitted`
- `accepted`
- `rejected`

### `AgiTechnicalReceipt`

- `pending`
- `accepted`
- `rejected`
- `partially_accepted`

## Kanoniska commands

- `CreateAgiPeriodReturn`
- `BuildAgiMainReturn`
- `BuildAgiIndividualReturn`
- `CreateAgiSubmissionPackage`
- `SubmitAgiPackage`
- `RegisterAgiReceipt`
- `CreateAgiCorrectionCase`
- `CreateAgiRemovalCase`
- `BlockAgiSubmission`

## Kanoniska events

- `AgiPeriodReturnCreated`
- `AgiMainReturnBuilt`
- `AgiIndividualReturnBuilt`
- `AgiPackageSubmitted`
- `AgiReceiptRegistered`
- `AgiCorrectionCaseCreated`
- `AgiRemovalCaseCreated`
- `AgiSubmissionBlocked`

## Kanoniska route-familjer

- `POST /v1/payroll/agi/period-returns`
- `POST /v1/payroll/agi/period-returns/{id}/build`
- `POST /v1/payroll/agi/period-returns/{id}/submit`
- `POST /v1/payroll/agi/period-returns/{id}/receipts`
- `POST /v1/payroll/agi/corrections`
- `POST /v1/payroll/agi/removals`

## Kanoniska permissions och review boundaries

- live submission kraver step-up och dual review
- support får inte skapa AGI-rättelser utan explicit payroll-approver
- tekniskt avvisad AGI får inte dorras om till accepted manuellt

## Nummer-, serie-, referens- och identitetsregler

- identifikatorer för individuppgift är arbetsgivarens organisationsnummer, redovisningsperiod, specifikationsnummer och betalningsmottagarens identitet
- samma specifikationsnummer ska användas vid rättelse av existerande individuppgift
- nytt specifikationsnummer ska användas när samma person måste redovisas i flera skattefalt samma period
- borttag ska ske med samma identifikatorer som felaktig individuppgift

## Valuta-, avrundnings- och omräkningsregler

- AGI ska redovisas i heltal
- AGI byggs i SEK
- decimaler i payroll får aldrig skickas direkt till individuppgift

## Replay-, correction-, recovery- och cutover-regler

- varje AGI-package ska vara reproducibelt från immutabla payroll snapshots och field map version
- correction skapar ny submission package för samma period; gammal package skrivs inte om
- borttag får inte radera historik internt utan skapa eget correction/removal case
- cutover mellan system får bevara period, specifikationsnummer och receipt lineage

## Huvudflödet

1. AGI-period skapas för redovisningsperioden
2. huvuduppgift byggs
3. individuppgifter byggs från canonical payroll truth
4. validation mot teknisk och regulatorisk regelkarta kor
5. submission package byggs
6. package skickas till Skatteverket eller verifierad transport
7. technical receipt registreras
8. eventuella rättelser eller borttag skapas separat

## Bindande scenarioaxlar

- period state: `original`, `correction`
- submission state: `draft`, `submitted`, `accepted`, `rejected`
- recipient multiplicity: `single_iu`, `multiple_iu_same_period`
- tax regime: `preliminar`, `SINK`, `A-SINK`, `no_tax_reason`
- transport mode: `direct_skv`, `verified_transport_partner`
- absence state: `none`, `absence_transfer_present`

## Bindande policykartor

- one-main-return-per-period: `true`
- one-tax-field-per-individual-return: `true`
- amounts-in-whole-kronor: `true`
- same-specification-number-on-correction: `true`
- absence-correction-after-submission-in-skv: `forbidden`
- live-submission-without-real-provider: `forbidden`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

### AGI-P0001 Original accepted AGI period return

- periodState: `original`
- receiptState: `accepted`
- createsRegulatorySnapshot: `true`

### AGI-P0002 Corrected AGI period return

- periodState: `correction`
- samePeriodAsOriginal: `true`
- receiptState: `accepted`

### AGI-P0003 Removed individual return

- removalCase: `true`
- sameIdentifiersRequired: `true`
- route205OrServiceEquivalent: `true`

### AGI-P0004 Multiple individuppgifter same employee same period

- allowedOnlyWhenDifferentTaxField: `true`
- requiresDifferentSpecificationNumbers: `true`

### AGI-P0005 Blocked AGI submission

- submissionState: `blocked`
- blockCode: `agi_validation_failed_or_live_transport_missing`

## Bindande rapport-, export- och myndighetsmappning

- AGI receipt archive ska bevaras som audit evidence
- varje AGI period ska kunna kopplas till de pay runs som ingar
- absence transfer ska markeras som separat dataflöde till Försäkringskassan

## Bindande scenariofamilj till proof-ledger och rapportspar

- `AGI-A001 original_period_submission -> AGI-P0001 -> accepted`
- `AGI-A002 corrected_period_submission -> AGI-P0002 -> corrected`
- `AGI-A003 remove_wrong_individual_return -> AGI-P0003 -> corrected`
- `AGI-B001 multiple_tax_regimes_same_person -> AGI-P0004 -> accepted`
- `AGI-Z001 blocked_submission -> AGI-P0005 -> blocked`

## Tvingande dokument- eller indataregler

- `organizationNumber`
- `reportingPeriod`
- `specificationNumber`
- `recipientIdentity`
- `fieldMapVersion`
- `submissionPackageDigest`
- `technicalReceiptRef`
- `absenceTransferState`

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `AGI-R001 original_submission`
- `AGI-R002 corrected_submission_same_period`
- `AGI-R003 removed_wrong_individual_return`
- `AGI-R004 multiple_tax_fields_same_period`
- `AGI-R005 blocked_missing_transport_or_validation`

## Bindande faltspec eller inputspec per profil

- `agiPeriodReturnId`
- `periodCode`
- `isCorrection`
- `mainReturnRef`
- `individualReturnRefs`
- `receiptState`
- `transportProviderRef`
- `fieldMapVersion`
- `builtFromPayrollSnapshotRef`

## Scenariofamiljer som hela systemet måste tacka

- original AGI för period
- correction of previously submitted period
- remove wrong individual return
- same person with multiple tax regimes same period
- technical reject from Skatteverket
- accepted technical receipt but låter business correction
- absence transfer present

## Scenarioregler per familj

- `AGI-A001`: original period return måste ha exakt en huvuduppgift för perioden
- `AGI-A002`: correction måste byggas som ny package för samma period
- `AGI-A003`: borttag måste använda samma identifikatorer som felaktig individuppgift
- `AGI-B001`: olika skattefalt samma period kraver flera individuppgifter med olika specifikationsnummer
- `AGI-Z001`: saknad live transport eller failed validation blockerar submission

## Blockerande valideringar

- deny submission om individuppgift saknar skattefalt
- deny submission om individuppgift har fler an ett skattefalt
- deny submission om belopp inte är heltal
- deny correction om specifikationsnummer inte matchar tidigare uppgift som ska ersättas
- deny absence-correction-in-skv after accepted submission

## Rapport- och exportkonsekvenser

- accepted AGI ska fa immutable submission receipt
- corrected AGI ska ge tydlig supersession-chain
- rejected AGI ska skapa blockerfall och inte markeras regulatoriskt skickad

## Förbjudna förenklingar

- inga grova AGI-buckets utan faltkarta
- ingen enda individuppgift som blandar flera skattefalt
- ingen live submission via stub eller fake receipt
- ingen tyst omskrivning av redan skickad AGI

## Fler bindande proof-ledger-regler för specialfall

- om skatteregim ändras inom perioden ska flera individuppgifter byggas för samma person
- absence transfer data ska inte tappas bort bara för att lönesummor är noll
- tekniskt accepted package utan full payroll lineage är inte tillräckligt för grön status

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `AGI-P0001` skapar regulatoriskt snapshot för period
- `AGI-P0002` superseder earlier regulatory snapshot utan att ta bort historik
- `AGI-P0005` skapar blockerfall utan accepted receipt

## Bindande verifikations-, serie- och exportregler

- AGI build får aldrig generera egen bokföringsverifikation
- AGI exportfile/XML ska versioneras med teknisk beskrivning-version
- receipt och kontrollresultat ska knytas till package digest

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- original vs correction
- accepted vs rejected
- single vs multiple individuppgifter per person
- preliminar vs SINK vs A-SINK vs no-tax reason
- with absence transfer vs without

## Bindande fixture-klasser för AGI-flödet

- `AGI-FXT-001` ordinary domestic payroll period
- `AGI-FXT-002` same employee with preliminar and SINK same period
- `AGI-FXT-003` corrected period with same specification number
- `AGI-FXT-004` wrong person removed
- `AGI-FXT-005` accepted absence transfer
- `AGI-FXT-006` technical reject

## Bindande expected outcome-format per scenario

- `scenarioId`
- `fixtureClass`
- `expectedProofLedger`
- `expectedReceiptState`
- `expectedIdentifierRule`
- `expectedBlockedOrAllowedStatus`

## Bindande canonical verifikationsseriepolicy

- AGI är regulatorisk export och får inte tilldelas separat bokföringsserie
- AGI receipt archive ska ha egen canonical evidence-serie

## Bindande expected outcome per central scenariofamilj

### `AGI-A001`

- fixture minimum: `AGI-FXT-001`
- expected proof-ledger: `AGI-P0001`
- expected receipt state: `accepted`
- expected status: `allowed`

### `AGI-A002`

- fixture minimum: `AGI-FXT-003`
- expected proof-ledger: `AGI-P0002`
- expected identifier rule: `same_specification_number`
- expected status: `allowed`

### `AGI-Z001`

- fixture minimum: `AGI-FXT-006`
- expected proof-ledger: `AGI-P0005`
- expected status: `blocked`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `AGI-A001 -> AGI-P0001 -> allowed`
- `AGI-A002 -> AGI-P0002 -> allowed`
- `AGI-A003 -> AGI-P0003 -> allowed`
- `AGI-B001 -> AGI-P0004 -> allowed`
- `AGI-Z001 -> AGI-P0005 -> blocked`

## Bindande testkrav

- unit tests för one-tax-field-per-individual-return
- unit tests för multi-IU same person with different specification numbers
- unit tests för same specification number on correction
- unit tests för whole-kronor enforcement
- unit tests blocking absence correction in Skatteverket after submission
- integration tests för XML build against technical schema version
- integration tests för accepted/rejected receipt flow

## Källor som styr dokumentet

- [Skatteverket: Teknisk beskrivning och testtjänst](https://www.skatteverket.se/foretag/arbetsgivare/lamnaarbetsgivardeklaration/tekniskbeskrivningochtesttjanst.4.309a41aa1672ad0c8377c8b.html)
- [Skatteverket: Teknisk beskrivning 1.1.18.1](https://www.skatteverket.se/foretagochorganisationer/arbetsgivare/lamnaarbetsgivardeklaration/tekniskbeskrivningochtesttjanst/tekniskbeskrivning116.4.7eada0316ed67d7282a791.html)
- [Skatteverket: Sa fyller du i arbetsgivardeklarationen](https://www.skatteverket.se/foretag/arbetsgivare/lamnaarbetsgivardeklaration/safyllerduiarbetsgivardeklarationen.4.2cf1b5cd163796a5c8b66a8.html)
- [Skatteverket: SKV 401 utgava 29](https://www.skatteverket.se/download/18.7da1d2e118be03f8e4f54f6/1711100186363/skatteavdrag-och-arbetsgivaravgifter-skv401-utgava29.pdf)
- [Skatteverket: Arbetsgivardeklaration Individuppgift (SKV 4788)](https://skatteverket.se/4.2cf1b5cd163796a5c8bd028.html)
- [Skatteverket: Nu ska uppgifter lamnas om föräldraledighet och vard av barn](https://www.skatteverket.se/omoss/pressochmedia/nyheter/2025/nyheter/nuskauppgifterlamnasomforaldraledighetochvardavbarn.5.262c54c219391f2e963554a.html)
