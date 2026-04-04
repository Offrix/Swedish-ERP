# DOMAIN_06_ROADMAP

## mal

Bygg om moms-, skattekonto-, bank- och betalningsdomänen sa att den bör verklig svensk deklarations-, skuld-, bank- och likviditetssanning utan falsk realism.

## varfor domänen behovs

- denna domän avgor om moms blir rätt deklarerad
- denna domän avgor om skattekontot är korrekt reconcilerat
- denna domän avgor om betalningar verkligen kan skickas, följas upp, returneras och bokas rätt
- denna domän avgor om bankhandelser kan återspelas utan dubbel effekt

## bindande tvärdomänsunderlag

- `FAKTURAFLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör seller-side momsutfall, betalallokering, över-/underbetalning, kredit, kundförlust och valutautfall på kundfaktura.
- `LEVFAKTURAFLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör purchase-side momsutfall, leverantörsfaktura, reverse-charge-inköp, importmoms, avdragsrätt på köpsidan och skapandet av AP-open-items.
- `INKOP_VARUMOTTAG_OCH_LEVERANSMATCHNING_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör PO/receipt/ownership acceptance, 2-way/3-way match, invoice-before-receipt-holds och AP release gates för stock- och receipt-drivna inköp.
- `LEVERANTORSBETALNINGAR_OCH_LEVERANTORSRESKONTRA_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör leverantörsreskontra efter posting, AP-betalning, AP-retur, supplier advances, netting, payment hold, fees, FX och annan supplier settlement-truth.
- `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör bankkonto, statementimport, bankline identity, owner binding, bankavstämning, bankavgifter, ränteposter, interna överföringar, duplicate replay och bank-owned legal effect.
- `MOMSFLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör momsscenariokoder, momsrutor, periodisk sammanställning, OSS, avdragsrätt, importmoms, replacement declarations, period locks och all slutlig momsrapporterings-truth.
- `SKATTEKONTOFLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör skattekonto, `1630`-mirror, inbetalningar, debiteringar, återbetalningar, ränta, anstånd, utbetalningsspärr, authority receipts och all slutlig tax-account-truth.
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör vouchers, kontrollkonton, bank- och tax-ledger, correction chains, period locks och slutlig ledger-truth.
- `SIE4_IMPORT_OCH_EXPORT_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör SIE type 4 export/import, voucher serialization, `#RAR`, `#KONTO`, `#VER`, `#TRANS`, dimensionsmetadata och parity-evidence mot finance-ledger truth.
- `RAPPORTER_MOMS_AGI_RESKONTRA_HUVUDBOK_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör momsrapport, periodisk sammanställning, customer och supplier aging, huvudbok, verifikationslista samt filing-ready report packages.
- `PEPPOL_EDI_OCH_OFFENTLIG_EFAKTURA_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör structured inbound supplier invoices via Peppol, transport receipts, duplicate control, public-sector delivery gates och AP-routing för structured e-faktura.
- `OCR_REFERENSER_OCH_BETALFORMAT_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör OCR-matchning, Bg Max, incoming payment files, supplier payment files, provider-versionerade bankformat och referensbaserad settlement-routing mellan reskontra och bank.
- `PARTNER_API_WEBHOOKS_OCH_ADAPTERKONTRAKT_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör generiska partner-API:er, adapterkontrakt, webhook- och callbackverifiering, duplicate control och command-path-only routing för externa finance-adapters.
- `KVITTOFLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör receipt-driven input VAT, gross-cost-only-fall, representation på köparsidan, personbilskvitton, digitala kvitton, payment-proof-blockers och receipt-driven export till momsrapport/SIE4.
- `BAS_KONTOPOLICY_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör canonical BAS-kontofamiljer, control accounts, bank/tax anchors och blocked overrides i finance-ledgern.
- `MOMSRUTEKARTA_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör momsrutor, reverse-charge box mapping, importboxar, replacement declarations och VAT box lineage.
- `SKATTEKONTOMAPPNING_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör `1630`-mirror, authority-event-klassning, moms- och payroll-clearing mot skattekontot, HUS/grön-teknik-offset och blocked unknown authority events.
- `VERIFIKATIONSSERIER_OCH_BOKFORINGSPOLICY_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör verifikationsserier, voucher identity, reservationsluckor, correction policy, posting date policy och SIE4-serieparitet för moms-, bank- och skattekontovouchers.
- `VALUTA_OMRAKNING_OCH_KURSDIFFERENS_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör redovisningsvaluta, bank- och AP-related FX, omräkningsdatum, rate-source policy, rounding och blocked missing rate lineage.
- `LEGAL_REASON_CODES_OCH_SPECIALTEXTPOLICY_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör legal basis för 0%-moms, reverse-charge-texter, EU/exportreferenser och structured legal-basis lineage mot momsrapport och e-faktura.

## faser

- Fas 6.1 VAT rule/scenario hardening
- Fas 6.2 VAT period/frequency/lock governance hardening
- Fas 6.3 declaration/periodic-statement/correction/posting hardening
- Fas 6.4 Skatteverket transport hardening
- Fas 6.5 VAT clearing/reversal hardening
- Fas 6.6 tax-account mirror/reconciliation hardening
- Fas 6.7 discrepancy-case/offset/refund/correction hardening
- Fas 6.8 bank-account/provider wiring hardening
- Fas 6.9 payment proposal/batch/order/SoD hardening
- Fas 6.10 payment lifecycle/cut-off/settlement hardening
- Fas 6.11 statement import/reference-matching/reconciliation hardening
- Fas 6.12 fee/interest/settlement bridge hardening
- Fas 6.13 FX/exchange-rate/date control hardening
- Fas 6.14 transport/API/file/manual runtime hardening

## dependencies

- 6.1 måste vara klar före 6.3 och 6.4
- 6.2 måste vara klar före 6.3 och 6.5
- 6.3 måste vara klar före 6.4 och 6.5
- 6.6 måste vara klar före 6.7
- 6.8 måste vara klar före 6.9 och 6.11
- 6.11 måste vara klar före 6.10 och 6.12
- 6.13 måste vara klar före 6.14

## vad som för koras parallellt

- 6.1 och 6.6
- 6.2 och 6.8
- 6.7 och 6.12
- 6.10 och 6.13 när reference- och railmodellen redan är last

## vad som inte för koras parallellt

- 6.4 får inte koras parallellt med ändringar i VAT payloadmodell
- 6.10 får inte koras parallellt med ombyggnad av statement identity
- 6.14 får inte marka capability som live innan 6.1-6.13 är verifierade

## exit gates

- inga prepared-only eller fake-live paths för presenteras som live
- inga schema/runtime-drifter kvar i banking statement-kornan
- momsfrekvens, periodlas, replacement declarations och filing chain är first-class
- tax-account-emission, reconciliation, offset och correction är first-class
- payment rails, SoD, cut-off och settlement är verkligt modellerade
- statement import är replay-saker med structured references
- canonical date/FX-governance används av VAT, bank, tax-account och ledger

## test gates

- varje delfas måste ha minst:
  - ett green-path-test
  - ett fail-path-test
  - ett replay/idempotens-test där relevant
  - ett correction/reversal-test där relevant
- standardformat ska verifieras mot officiella källor eller officiella schemas där sadana finns

## VAT gates

- varje stödd VAT-situation ska ha legal basis, scenario code, box mapping och reporting channel
- review queue får inte kunna forca inkompatibel VAT-kod
- unsupported VAT-scenario ska ga till blockerad review, aldrig autoaccept

## period/frequency/box/declaration/correction gates

- momsfrekvens ska vara first-class objekt
- perioder ska skapas från frekvensprofil, inte fria datum
- ersättningsdeklaration ska vara ny full submission-version
- signerad/finaliserad filing-historik ska vara immutable

## Skatteverket transport gates

- varje capability ska klassas som exakt en av:
  - `real_api`
  - `real_file`
  - `manual_controlled`
  - `prepared_only`
  - `stub`
- `prepared_only` får inte kallas live
- `manual_controlled` måste ha exportartefakt, operatorssteg och receipt capture

## tax-account mirror/offset/refund/correction gates

- expected liabilities ska komma från källdomän eller kontrollerad migration/admin-kanal
- offset priority ska vara samstammig i rulepack och runtime
- reversal och correction ska vara egna objekt, inte dold edit

## banking/payment/reference/SOD gates

- create/approve/export/sign/cancel/reopen ska vara tekniskt separerade
- rails ska ha korrekt teknisk klassning och verkligt formatnamn
- bankkonto- och providerwiring ska skilja security posture från legal/live readiness

## statement/reconciliation/refund/replay gates

- statement line identity ska vara line-level stark
- OCR/BG/PG/EndToEndId/entry refs ska vara first-class
- ambiguity ska bli review case, inte auto-match
- returned/rejected payments ska länka till order, residual och ombokning

## FX/exchange-rate/date/cut-off gates

- canonical controlling-date-policy ska vara gemensam
- OSS/IOSS ska använda explicita period- eller regelstyrda ECB-kurser
- bank cut-off och bankdag ska styra execution/settlement-datum

## markeringar

- keep:
  - bankkontosecrets och masking
  - tax-account discrepancy cases som objekt
  - bank statement approval-gate för fee/interest/settlement
  - VAT review queue som koncept
- harden:
  - VAT box/scenario-matris
  - VAT unlock-policy
  - provider capability manifest
  - VAT clearing bindning till filing truth
- rewrite:
  - momsfrekvens och periodgovernance
  - replacement declarations
  - tax-account matching, offsets och reversals
  - SoD
  - cut-off/settlement lifecycle
  - statement identity och reference model
  - canonical date/FX-governance
- replace:
  - prepared-only VAT-transport som utger sig för live
  - tax-account sync via open banking
  - custom exportformat som utger sig för `pain.001`/Bankgiro/live rails
- migrate:
  - expected liabilities till riktiga source-domain events
- archive:
  - gamla VAT/banking/tax-account runbooks som beskriver mer an runtime
- remove:
  - falska live claims i capabilitynamn och providerprofiler

## delfaser

### VAT rule/scenario hardening
- mal:
  - läsa canonical VAT-scenarier, reporting channels och boxmatris
  - ta bort breda samlingsscenarier som doljer juridiska skillnader
- arbete:
  - dela upp `VAT_SE_EXEMPT` i separata scenariofamiljer
  - flytta IOSS ut ur generell EU B2C-gren
  - bind manual review till samma compatibility-motor som auto-derivationen
  - skapa legal evidence-matris per scenario
- exit gate:
  - inget unsupported scenario autoaccepteras
  - varje scenario bör legal basis, allowed inputs och box mapping
- konkreta verifikationer:
  - verifiera att review-resolution av inkompatibel kod ger 409
  - verifiera att IOSS kraver importkriterier och consignmentsgrans
  - verifiera att varje scenario producerar exakt tillåtna boxar
- konkreta tester:
  - unit-test för inkompatibel manual VAT review
  - unit-test för IOSS utan importflagga
  - integrationstest för byggmoms och reverse charge
- konkreta kontroller vi måste kunna utfora för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - skriva ut kodgenererad scenario->box-matris och jamfora mot legal matris
  - visa för varje scenario vilken officiell källa som stöder det

### VAT period/frequency/lock governance hardening
- mal:
  - göra momsfrekvens, perioder, byte och las first-class
- arbete:
  - bygg `VatFrequencyElection`, `VatFrequencyChangeRequest`, `VatPeriodProfile`, `VatPeriodLock`
  - gör declaration runs beroende av periodprofil
  - bygg historik för frekvensbyte och spärr mot otillaten retroaktiv ändring
- exit gate:
  - inga fria VAT-perioder utan koppling till gallande frekvensprofil
  - lasta perioder kan bara öppnas enligt correctionpolicy
- konkreta verifikationer:
  - verifiera att bolagets aktiva frekvens kan listas per datum
  - verifiera att otillatet frekvensbyte blockeras när filing eller lock redan finns
  - verifiera att perioder genereras från profile, inte från fria datumintervall
- konkreta tester:
  - integrationstest för frekvensval och frekvensbyte
  - negativt test för retroaktivt byte över last period
  - e2e-test för las -> filing -> nekad retroaktiv ändring
- konkreta kontroller vi måste kunna utfora för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - visa aktiv och historisk VAT-frekvens med effective dates och blockerorsak
  - visa varfor en viss manad/kvartal/är-period finns eller inte finns

### declaration/periodic-statement/correction/posting hardening
- mal:
  - göra VAT filing truth immutable och replacement-saker
- arbete:
  - bygg `VatSubmission`, `VatSubmissionVersion`, `VatSubmissionSupersedeLink`
  - skilj submission state från posting state
  - koppla decision `declared` till faktisk submission-version
- exit gate:
  - finaliserad submission kan inte muteras
  - replacement declaration blir ny full version för samma period
- konkreta verifikationer:
  - verifiera att tidigare filing inte kan skrivas över
  - verifiera att unchanged boxes följer med i replacement chain
  - verifiera att declared-status utan submission-version blockeras
- konkreta tester:
  - immutability-test
  - supersede-test med två generationer
  - integrationstest för replacement declaration och periodic statement correction
- konkreta kontroller vi måste kunna utfora för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - kunna lista originalsubmission, replacement, receipt refs och hashkedja för en period

### Skatteverket transport hardening
- mal:
  - ersätta falsk live-transport med sann runtimeklassning och verkligt kontrollerad filing path
- arbete:
  - bygg capabilityklassning per submission capability
  - mark nuvarande vag som `prepared_only`
  - om live API saknas: bygg `manual_controlled` med exportartefakt, operatorssteg och receipt capture
- exit gate:
  - ingen VAT capability är felklassad som live
  - varje submission har transportklass, payload hash, evidence och receiptkedja
- konkreta verifikationer:
  - verifiera att prepared-only inte längre presenteras som API/XML-live
  - verifiera att manual path har export + sign-off + receipt capture
- konkreta tester:
  - integrationstest för `manual_controlled` filing
  - kontraktstest för payload artifact
  - negativt test som förbjuder `real_api` utan riktig adapter
- konkreta kontroller vi måste kunna utfora för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - visa för extern granskare exakt vilket filing mode som används och vilken receiptkedja som finns

### VAT clearing/reversal hardening
- mal:
  - binda VAT-clearing till godkänd filing truth
- arbete:
  - bygg `VatClearingRun` och `VatClearingReversal`
  - blockera clearing mot preliminara eller blockerade filingversioner
- exit gate:
  - clearing och reversal bör source submission, approval och evidence
- konkreta verifikationer:
  - verifiera att clearing inte kan koras på icke-final filing
  - verifiera att reversal länkar till originalrun
- konkreta tester:
  - replay-test för clearing
  - reversal-test med audit chain
- konkreta kontroller vi måste kunna utfora för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - visa vilken filingversion och vilket periodlas en clearing kom från

### tax-account mirror/reconciliation hardening
- mal:
  - göra skattekontospegeln deterministisk utan fake-live sync
- arbete:
  - ta bort tax-account från Enable Banking-profile
  - bygg `TaxAccountImportBatch`, `TaxAccountEvent`, `ExpectedTaxLiability`, `TaxAccountMirrorJournal`
  - gör liability-emission från källdomäner first-class
- exit gate:
  - tax-account har egen import-/syncmodell
  - expected liabilities kommer från auktoritativa källdomäner
- konkreta verifikationer:
  - verifiera att `prepareTaxAccountSync` inte längre gör via open banking
  - verifiera att VAT filing emitterar expected VAT liability
  - verifiera att ambiguity i reconciliation inte auto-stangs
- konkreta tester:
  - integrationstest för VAT -> tax-account liability emission
  - unit-test för ambiguity när flera liabilities har samma belopp
  - replay-test för authority import batch
- konkreta kontroller vi måste kunna utfora för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - kunna spara ett tax-account event till authority ref, source domain och liability object

### discrepancy-case/offset/refund/correction hardening
- mal:
  - göra kvittning, återbetalning och rättelser first-class
- arbete:
  - bygg `TaxAccountOffsetReversal`, `TaxAccountRefundDecision`
  - bind rulepack-prioritet till runtime-ordning
  - bygg resolutionkedja för discrepancy cases
- exit gate:
  - varje offset, reversal, refund och waiver är egen handelse med lineage
- konkreta verifikationer:
  - verifiera att offsetordning i rulepack och runtime matchar exakt
  - verifiera att offset kan reverseras utan dold edit
  - verifiera att discrepancy case inte kan stangas utan resolutionkod
- konkreta tester:
  - unit-test för offset priority parity
  - integrationstest för offset reversal
  - test för refund mot flera liabilities
- konkreta kontroller vi måste kunna utfora för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - kunna lista full correctionkedja för ett tax-account credit-event

### bank-account/provider wiring hardening
- mal:
  - skilja banksekretess, provider security posture och faktisk livekapabilitet
- arbete:
  - bygg `ProviderCapabilityManifest`
  - mark custom rails som interna tills verkliga adapters finns
  - hall bank account secrets och masking ofarandrat starka
- exit gate:
  - inga provider claims oversäljer faktisk live-nivå
- konkreta verifikationer:
  - verifiera att `supportsLegalEffectInProduction` inte används utan bevisad capability
  - verifiera att custom rails inte bör officiella namn utan substans
- konkreta tester:
  - unit-test för provider capability manifest
  - negativt test för railklassning utan adapter
- konkreta kontroller vi måste kunna utfora för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - kunna visa för varje provider om den är `real`, `manual`, `prepared_only` eller `stub`

### payment proposal/batch/order/SoD hardening
- mal:
  - göra SoD tekniskt tvingande i betalningskedjan
- arbete:
  - bygg `PaymentApprovalPolicy`, `DutySeparationRule`, `PaymentSignatureSession`
  - bör actor chain i proposal, batch och order
  - blockera self-approval, self-export och otillaten reopen
- exit gate:
  - create/approve/export/sign/cancel/reopen är separata transitions med policykontroll
- konkreta verifikationer:
  - verifiera att samma aktor nekas när policy kraver separation
  - verifiera att reopen efter export kraver ny approvalkedja
- konkreta tester:
  - integrationstest för same-actor denial
  - e2e-test för dual approval och cancel/reopen
- konkreta kontroller vi måste kunna utfora för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - kunna visa full actor chain per batch och order

### payment lifecycle/cut-off/settlement hardening
- mal:
  - modellera execution, settlement, reject och return banknara
- arbete:
  - bygg `PaymentExecutionWindow`, `PaymentExecutionEvent`, `PaymentSettlementEvent`, `PaymentReturnEvent`
  - separera requested date, submission date, execution date och settlement date
  - bygg partial settlement och residualmodell
- exit gate:
  - batch och proposal harleds från orderutfall, inte bara kommando
- konkreta verifikationer:
  - verifiera att betalning efter cut-off flyttas enligt railpolicy
  - verifiera att delutfarda batchar inte blir fullsettled
  - verifiera att return skapar korrekt residual och ombokning
- konkreta tester:
  - unit-test för cut-off och bankdag
  - integrationstest för partial settlement
  - integrationstest för returned payment
- konkreta kontroller vi måste kunna utfora för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - kunna jamfora requested och actual execution/settlement för varje order

### statement import/reference-matching/reconciliation hardening
- mal:
  - göra statement-import replay-saker och referenssaker
- arbete:
  - bygg `StatementImport`, `BankStatementLineIdentity`, `StructuredPaymentReference`, `BankReconciliationCase`
  - infor first-class OCR/BG/PG/EndToEndId/entry refs
  - gör ambiguity till review case
- exit gate:
  - line identity är starkare an datum+belopp+referens
- konkreta verifikationer:
  - verifiera att samma fil kan replays utan dubbel effekt
  - verifiera att två lika belopp med olika line identity inte kolliderar
  - verifiera att ambiguity inte auto-matchas
- konkreta tester:
  - duplicate same-file test
  - duplicate cross-file test
  - integrationstest för två lika belopp med olika entry refs
- konkreta kontroller vi måste kunna utfora för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - kunna visa exakt vilken line identity och vilken structured reference som styrde matchningen

### fee/interest/settlement bridge hardening
- mal:
  - göra statement-drivna bokningar persistenssakra och roundtrippbara
- arbete:
  - harmonisera DB och runtime för statement categories och match statuses
  - bygg `StatementPostingApproval`, `StatementPostingJournalLink`, `TaxAccountStatementBridge`
- exit gate:
  - runtime och schema erkanner samma kategorier och samma statusar
- konkreta verifikationer:
  - verifiera att `bank_fee`, `interest_income`, `interest_expense`, `settlement` och `matched_statement_posting` kan sparas och lasas tillbaka
  - verifiera att approved posting bör journal link efter persistens
- konkreta tester:
  - migration parity-test
  - persistence roundtrip test
  - bridge duplicate-guard test
- konkreta kontroller vi måste kunna utfora för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - kunna visa att samma bankrad efter persistens fortfarande pekar på rätt journal entry och rätt bridge target

### FX/exchange-rate/date control hardening
- mal:
  - infora gemensam controlling-date- och FX-policy
- arbete:
  - bygg `DateControlProfile`, `FxSource`, `FxRateLock`, `CrossDomainDateTrace`
  - bind VAT, tax-account, bank och ledger till samma date trace
  - bygg canonical OSS/IOSS-rate sourcing
- exit gate:
  - samma business event kan sparas över document/posting/tax/payment/settlement/declaration date
- konkreta verifikationer:
  - verifiera att controlling date är explicit per domänsteg
  - verifiera att kurskalla och kursdatum lagras och lases
  - verifiera att retroaktiv kursandring kraver correction chain
- konkreta tester:
  - cross-domain date consistency test
  - OSS/IOSS period-end rate test
  - realized FX test över invoice -> payment -> settlement
- konkreta kontroller vi måste kunna utfora för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - kunna visa exakt vilket datum och vilken kurs som styrde moms, bank och skattekonto för en given handelse

### transport/API/file/manual runtime hardening
- mal:
  - göra capabilityklassning sann och operativt användbar
- arbete:
  - bygg runtime-statuskatalog för VAT-, tax-account- och bankingtransporter
  - mark varje capability som `real_api`, `real_file`, `manual_controlled`, `prepared_only` eller `stub`
  - bind capabilityklassning till audit, docs och go-live gates
- exit gate:
  - inga falska live claims kvar
  - alla manual paths är receipt- och evidence-styrda
- konkreta verifikationer:
  - verifiera att varje capability i statusmatrisen kan bevisas i kod och test
  - verifiera att manual paths har operatorsteg och receipt capture
- konkreta tester:
  - capability manifest-test
  - smoke tests per capabilityklass
- konkreta kontroller vi måste kunna utfora för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - kunna visa en full runtime-statusmatris för extern granskare utan manuell tolkning




