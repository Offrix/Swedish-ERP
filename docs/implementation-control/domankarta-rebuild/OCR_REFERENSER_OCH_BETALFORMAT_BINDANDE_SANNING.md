# OCR_REFERENSER_OCH_BETALFORMAT_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för:
- OCR-referenser
- OCR-kontrollnivaer
- betalningsreferenser på kundfaktura
- Bankgiro Inbetalningar och Bg Max som incoming payment-format
- Leverantörsbetalningar och Lönefil till Bankgirot som outgoing payment-format

## Syfte

Detta dokument ska göra referens- och betalformatslagret deterministiskt.

Systemet ska kunna:
- generera korrekta OCR-referenser
- validera inkommande OCR-referenser mot avtalad kontrollprofil
- serialisera och tolka bankfiler enligt versionerade provider-manualer
- hindra felaktiga referenser från att smitta reskontra, bankavstämning, leverantörsbetalningar eller löner

## Omfattning

Detta dokument omfattar:
- OCR-referensgenerering och validering
- mjuk, hard, variabel längd- och fast langdkontroll
- checksiffra enligt 10-modul
- incoming payments via Bankgiro Inbetalningar och Bg Max
- outgoing supplier payment files
- outgoing salary payment files där Bankgiro-format används

Detta dokument omfattar inte:
- bankavstämningslogiken i sig
- kundreskontrans open-item-sanning i sig
- payroll liability truth i sig

## Absoluta principer

- OCR-referens får aldrig vara fri text eller icke-validerad metadata.
- OCR-referens får aldrig auto-normaliseras till nytt nummer efter att kundfakturan utfardats.
- Betalformat får aldrig byggas utan provider-versionerad layoutbaseline.
- Bg Max, leverantörsbetalningsfil och lönefil får aldrig tolkas heuristiskt.
- Om avtalad OCR-kontrollprofil saknas eller är oklar ska systemet blockera hard automation som beror referensvalidering.
- Formatlaget får serialisera och tolka; legal effect uppstår först i kundreskontra, bankflöde, AP eller payroll enligt deras bindande sanningar.

## Bindande dokumenthierarki för OCR-referenser och betalformat

- `FAKTURAFLODET_BINDANDE_SANNING.md` äger seller-side invoice truth som OCR-referensen knyts till.
- `KUNDINBETALNINGAR_OCH_KUNDRESKONTRA_BINDANDE_SANNING.md` äger kundreskontraeffekten av incoming payments.
- `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md` äger bankkonto och settlement truth.
- `LEVERANTORSBETALNINGAR_OCH_LEVERANTORSRESKONTRA_BINDANDE_SANNING.md` äger supplier payment truth efter payment file send och receipt.
- `LONEUTBETALNING_OCH_BANKRETURER_BINDANDE_SANNING.md` äger payroll payout truth efter salary payment file send och receipt.
- Domän 4, 6, 10 och 27 får inte definiera avvikande OCR- eller bankformatstruth utan att detta dokument skrivs om samtidigt.

## Kanoniska objekt

- `PaymentReferencePolicy`
  - bar vald OCR-kontrollprofil, langdregler, checksum policy och owning bankgiro
- `PaymentReference`
  - bar referensnummer, profile id, checksum status och source document id
- `IncomingPaymentFormatFile`
  - bar original Bg Max eller annan canonical incoming file artifact
- `OutgoingPaymentFormatFile`
  - bar original supplier-payment file eller salary-payment file artifact
- `PaymentFormatValidationIssue`
  - bar layoutfel, checksumfel, profile mismatch eller duplicate issues
- `PaymentFormatReceipt`
  - bar provider receipt, processed status, avvisning eller återrapportering

## Kanoniska state machines

- `PaymentReference`
  - `generated -> issued -> settled | superseded | invalidated`
- `IncomingPaymentFormatFile`
  - `received -> parsed -> validated -> routed | blocked`
- `OutgoingPaymentFormatFile`
  - `draft -> validated -> sent -> accepted | rejected | failed`
- `PaymentFormatReceipt`
  - `pending -> accepted | rejected | applied`
- `PaymentFormatValidationIssue`
  - `open -> triaged -> resolved | blocking`

## Kanoniska commands

- `GeneratePaymentReference`
- `ValidatePaymentReference`
- `ReceiveIncomingPaymentFormatFile`
- `ParseIncomingPaymentFormatFile`
- `ValidateIncomingPaymentFormatFile`
- `CreateOutgoingPaymentFormatFile`
- `ValidateOutgoingPaymentFormatFile`
- `SendOutgoingPaymentFormatFile`
- `RegisterPaymentFormatReceipt`

## Kanoniska events

- `PaymentReferenceGenerated`
- `PaymentReferenceValidated`
- `IncomingPaymentFormatFileReceived`
- `IncomingPaymentFormatFileParsed`
- `IncomingPaymentFormatFileValidated`
- `OutgoingPaymentFormatFileCreated`
- `OutgoingPaymentFormatFileValidated`
- `OutgoingPaymentFormatFileSent`
- `PaymentFormatReceiptRegistered`

## Kanoniska route-familjer

- `/api/payments/references/*`
- `/api/payments/formats/incoming/*`
- `/api/payments/formats/outgoing/*`
- `/api/payments/formats/receipts/*`

## Kanoniska permissions och review boundaries

- `ar.manage` får generera OCR-referenser kopplade till kundfaktura
- `ap.manage` får skapa leverantörsbetalningsfiler
- `payroll.manage` får skapa lönefiler
- `banking.manage` eller `treasury.manage` får registrera provider receipts
- review krävs för:
  - okand OCR-profil
  - invalid checksiffra
  - inkommande fil med okand version
  - outgoing file validation failure
  - duplicate file

## Nummer-, serie-, referens- och identitetsregler

- OCR-referens ska vara numerisk.
- Sista siffran ska vara checksiffra enligt 10-modul.
- Vid variabel langdkontroll är nast sista siffran langdsiffra som anger referensens totala längd inklusive checksiffra.
- Vid fast langdkontroll ska referensens längd matcha nagon av de i avtalet valda langderna, maximalt två valda langder.
- Referensen ska vara stabilt kopplad till canonical source document eller settlement target.
- Filidentity ska bestA av provider format, version, bankgirorelation, created-at och checksumma.

## Valuta-, avrundnings- och omräkningsregler

- OCR-referensen bar ingen valuta i sig.
- Betalformat får inte avrunda om belopp utanför vad källsystemet redan beslutat.
- Amount formatting ska följa respektive provider manual och version.
- Om belopp eller datum inte kan serialiseras enligt formatprofil ska filskapande blockeras.

## Replay-, correction-, recovery- och cutover-regler

- Samma incoming file får aldrig ge dubbel settlement.
- Samma outgoing file får inte skickas om som nytt business command utan explicit resend eller new batch logic.
- OCR-referens får inte regenereras för utfardad faktura annat an genom legitim ny seller-side document chain.
- Recovery efter parsefel ska ske på samma immutabla filartifact.
- Migration får importera historiska OCR-referenser och formatreceipts som evidence men får inte hitta på avtalad kontrollprofil i efterhand.

## Huvudflödet

1. systemet faststaller OCR- eller filprofil
2. referens eller file layout genereras enligt provider-version
3. checksumma, längd och obligatoriska fält valideras
4. outgoing file skickas eller incoming file tas emot
5. provider receipt eller incoming parse-resultat registreras
6. downstream routing sker till kundreskontra, AP, payroll eller bankflöde

## Bindande scenarioaxlar

- OCR soft vs hard vs variable length vs fixed length
- incoming vs outgoing
- ÄR reference vs AP payment file vs payroll payment file
- accepted vs rejected file
- correct checksum vs invalid checksum
- known format version vs unknown version
- first file vs duplicate file

## Bindande policykartor

- `OCR-POL-001`: OCR checksiffra = 10-modul
- `OCR-POL-002`: OCR variable-length profile kraver langdsiffra som nast sista siffra
- `OCR-POL-003`: OCR fixed-length profile får ha max två avtalade langder
- `OCR-POL-004`: hard OCR profile får inte acceptera fri alternativ referens
- `OCR-POL-005`: incoming Bankgiro Inbetalningar canonical file = Bg Max enligt provider manual
- `OCR-POL-006`: outgoing supplier payment file och outgoing salary file får bara genereras med explicit provider-manual version

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `OCR-P0001`
  - OCR generation
  - krav: numerisk referens, sista siffra 10-modul checksiffra
- `OCR-P0002`
  - variable-length OCR
  - krav: nast sista siffra = langdsiffra, total längd reconcile
- `OCR-P0003`
  - fixed-length OCR
  - krav: referenslangd matchar nagon av avtalade langder
- `OCR-P0004`
  - Bg Max incoming file
  - krav: provider-version, start/slut-struktur enligt manual, parsebar fil
- `OCR-P0005`
  - outgoing supplier payment file
  - krav: provider-version, legal payer account binding, payment refs, amount/date formatting
- `OCR-P0006`
  - outgoing salary payment file
  - krav: provider-version, payroll batch binding, employee payout refs och amount/date formatting
- `OCR-P0007`
  - invalid checksum or format mismatch
  - utfall: blocked or review_required

## Bindande rapport-, export- och myndighetsmappning

- OCR-referensen ska bindas till kundfakturaexport, kundreskontra och incoming payment matching
- Bg Max incoming file ska bindas till kundreskontra- och bankflödevidence
- supplier payment file ska bindas till AP payment batch och bankevidence
- salary payment file ska bindas till payroll payout batch och bankevidence

## Bindande scenariofamilj till proof-ledger och rapportspar

- `OCR-A001` generated fixed-length invoice OCR -> `OCR-P0001`,`OCR-P0003`
- `OCR-A002` generated variable-length OCR -> `OCR-P0001`,`OCR-P0002`
- `OCR-B001` incoming Bg Max file -> `OCR-P0004`
- `OCR-C001` outgoing supplier payment file -> `OCR-P0005`
- `OCR-D001` outgoing salary payment file -> `OCR-P0006`
- `OCR-Z001` invalid checksum or mismatch -> `OCR-P0007`

## Tvingande dokument- eller indataregler

- OCR-profile måste vara explicit bunden till bankgiro och bolag.
- Invoice-side OCR får bara genereras efter att canonical invoice id och payment target är faststallda.
- Incoming file ska lagras immutabelt i original.
- Outgoing file ska lagras immutabelt tillsammans med versionerad formatprofil.
- Om provider-manual version saknas ska filgenerering blockeras.

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `OCR-R001` missing_reference_policy
- `OCR-R002` invalid_mod10_checksum
- `OCR-R003` invalid_variable_length_digit
- `OCR-R004` invalid_fixed_length
- `OCR-R005` unknown_file_version
- `OCR-R006` duplicate_file
- `OCR-R007` amount_format_mismatch
- `OCR-R008` date_format_mismatch

## Bindande faltspec eller inputspec per profil

- `ocr_soft`
  - required: numeric base reference, provider profile, source document id
- `ocr_hard`
  - required: same as soft plus explicit hard-control agreement binding
- `ocr_variable_length`
  - required: same as hard plus generated length digit
- `ocr_fixed_length`
  - required: same as hard plus allowed length set
- `bgmax_incoming`
  - required: original file, provider version, receiving bankgiro agreement, checksum
- `supplier_payment_outbound`
  - required: provider version, debit account binding, settlement date, payment rows, supplier refs
- `salary_payment_outbound`
  - required: provider version, payroll batch ref, settlement date, employee payout rows

## Scenariofamiljer som hela systemet måste tacka

- fixed-length OCR on customer invoice
- variable-length OCR on customer invoice
- hard-control OCR agreement
- soft-control OCR agreement
- incoming Bg Max file with valid OCR
- incoming Bg Max file with invalid OCR
- outgoing supplier payment file accepted
- outgoing supplier payment file rejected
- outgoing salary payment file accepted
- outgoing salary payment file rejected
- duplicate incoming file
- unknown provider version

## Scenarioregler per familj

- fixed-length OCR måste passera avtalad längd och mod10
- variable-length OCR måste passera langdsiffra och mod10
- hard-control OCR får inte tillata osakrad alternativ referens som canonical match key
- incoming invalid OCR får inte auto-matcha till kundreskontra utan reviewregel
- outgoing supplier payment file måste binda till canonical AP batch innan send
- outgoing salary payment file måste binda till canonical payroll payout batch innan send
- duplicate file får aldrig skapa dubbel legal effect

## Blockerande valideringar

- OCR-policy saknas
- checksiffra fel
- variabel längd-detalj fel
- fast längd avviker från avtalad längd
- incoming eller outgoing file version okand
- format artefact saknar checksumma
- outgoing file saknar legal owner binding till bankkonto eller betalbatch

## Rapport- och exportkonsekvenser

- OCR-referensen ska visas i seller-side invoice artifacts och kundreskontra views
- incoming Bg Max parse ska skapa routing- och evidence artifacts till kundreskontra och bankavstämning
- outgoing files ska skapa send- och receipt-evidence till AP eller payroll

## Förbjudna förenklingar

- OCR utan mod10
- anta hard-control när avtal inte verifierats
- fria textreferenser som canonical match key där OCR-profil gäller
- heuristisk tolkning av bankfiler utan explicit formatversion
- kasta originalfil efter parse

## Fler bindande proof-ledger-regler för specialfall

- `OCR-P0008`
  - incoming payment without OCR but with alternate reference -> review only, no canonical OCR match
- `OCR-P0009`
  - duplicate outgoing file send attempt -> no new business batch, explicit resend only
- `OCR-P0010`
  - salary file with mixed payroll batches -> blocker
- `OCR-P0011`
  - supplier payment file with mixed owner accounts -> blocker

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `OCR-P0001-P0003` skapar referens- och evidence truth, inte settlement i sig
- `OCR-P0004` skapar incoming payment-format evidence och routing till kundreskontra/bank
- `OCR-P0005` skapar supplier-payment send evidence och routing till AP/bank
- `OCR-P0006` skapar salary-payment send evidence och routing till payroll/bank
- `OCR-P0007-P0011` skapar blocking issues, resend refs eller review cases

## Bindande verifikations-, serie- och exportregler

- OCR-referensen får inte användas som verifikationsserie eller vernr.
- Betalformat artefakter ska ha egen filidentitet och checksumma.
- Resend ska peka på ursprunglig business batch och tidigare file artifact.

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- soft vs hard control
- variable length vs fixed length
- incoming vs outgoing
- ÄR vs AP vs payroll
- first file vs duplicate
- accepted vs rejected
- known version vs unknown version

## Bindande fixture-klasser för OCR-referenser och betalformat

- `OCR-FXT-001` fixed-length OCR
- `OCR-FXT-002` variable-length OCR
- `OCR-FXT-003` Bg Max incoming file
- `OCR-FXT-004` supplier payment outbound file
- `OCR-FXT-005` salary payment outbound file
- `OCR-FXT-006` invalid checksum
- `OCR-FXT-007` duplicate file

## Bindande expected outcome-format per scenario

Varje scenario ska minst ange:
- scenario id
- fixture class
- OCR or format profile
- expected validation verdict
- expected routing verdict
- expected evidence artifacts
- expected downstream owner

## Bindande canonical verifikationsseriepolicy

- verifikationsserier ägs av ledger truth, inte av referens- eller filformatlagret
- OCR-referensen är match key och customer-facing reference, inte voucher identity

## Bindande expected outcome per central scenariofamilj

- `OCR-A001`
  - verdict: generated
  - output: valid fixed-length OCR with mod10 checksum
- `OCR-B001`
  - verdict: routed
  - output: Bg Max evidence and downstream customer-payment routing
- `OCR-C001`
  - verdict: sent or accepted
  - output: supplier-payment artifact bound to AP batch
- `OCR-D001`
  - verdict: sent or accepted
  - output: salary-payment artifact bound to payroll batch
- `OCR-Z001`
  - verdict: blocked
  - reason: checksum or format mismatch

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `OCR-A001` -> `OCR-P0001,P0003` -> fixed-length OCR generated
- `OCR-A002` -> `OCR-P0001,P0002` -> variable-length OCR generated
- `OCR-B001` -> `OCR-P0004` -> Bg Max parsed and routed
- `OCR-C001` -> `OCR-P0005` -> supplier-payment file validated and sent
- `OCR-D001` -> `OCR-P0006` -> salary-payment file validated and sent
- `OCR-Z001` -> `OCR-P0007` -> blocked invalid OCR or format

## Bindande testkrav

- mod10 checksum generation test
- variable-length OCR generation test
- fixed-length OCR validation test
- hard/soft profile enforcement test
- Bg Max parse and duplicate-file test
- supplier payment format generation test
- salary payment format generation test
- rejected file receipt test

## Källor som styr dokumentet

- Bankgirot: [Bankgiro Inbetalningar Teknisk manual](https://www.bankgirot.se/globalassets/dokument/tekniska-manualer/bankgiroinbetalningar_tekniskmanual_sv.pdf)
- Bankgirot: [Bankgiro Inbetalningar Technical Manual](https://www.bankgirot.se/globalassets/dokument/tekniska-manualer/bankgiroreceivables_bankgiroinbetalningar_technicalmanual_en.pdf)
- Bankgirot: [Teknisk dokumentation](https://www.bankgirot.se/kundservice/teknisk-dokumentation/)
