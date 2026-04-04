# PRELIMINARSKATT_OCH_SKATTETABELLER_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för hela preliminarskatteflödet i svensk payroll.

Detta dokument ska styra:
- ordinarie skatteavdrag enligt skattetabell
- engångsskatt
- jämkning med fast belopp eller procentsats
- SINK
- A-SINK
- intyg eller beslut om att skatteavdrag inte ska göras
- emergency-manual-tax som strikt undantagsfall
- effective dating, beslutsevidens och replaybar tax truth

Ingen kod, ingen import, ingen payslip, ingen AGI-bygga, ingen payroll-ui och ingen posting-bundle får definiera avvikande skatteavdragstruth utan att detta dokument skrivs om först.

## Syfte

Detta dokument finns för att:
- varje pay run ska kunna förklara exakt varfor ett visst skatteavdrag blev som det blev
- vanlig tabellskatt, engångsskatt, jämkning, SINK och A-SINK aldrig ska blandas ihop
- historiska och framtida lönekorningar ska ga att replaya med samma beslut, samma tabellversion och samma effective date
- manual rates och ändra grova genvagar ska bort ur live payroll

## Omfattning

Detta dokument omfattar:
- canonical tax modes
- tax decision snapshots
- tax year, tabell, kolumn och decision evidence
- one-time tax basis
- fixed and percentage adjustment decisions
- SINK and A-SINK decision handling
- no-tax certificates and low-income certificate handling
- emergency manual tax governance
- field-level tax outcome truth innan AGI-faltmappning

Detta dokument omfattar inte:
- arbetsgivaravgifter
- special payroll tax
- benefit valuation
- AGI faltkoder i detalj
- payroll posting accounts för withheld tax
- travel, pension, semester eller sjuklonelogik i sig

Kanonisk agarskapsregel:
- detta dokument äger hur skatteavdraget bestams
- `LONEFLODET_BINDANDE_SANNING.md` äger pay run lifecycle och kalkylsnapshot
- `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md` äger BAS-lönekontotolkning
- kommande `AGI_FALTKARTA_OCH_RATTELSER_BINDANDE_SANNING.md` äger slutlig AGI-faltmappning

## Absoluta principer

- ordinarie svensk preliminarskatt får aldrig beräknas utan pinned tax year, table, column och official table basis
- `manual_rate` får aldrig vara normal live-vag för ordinarie skatteavdrag
- engångsskatt får aldrig återanvända ordinarie table path
- fast jämkning och procentjamkning får aldrig modelleras som samma beslutsklass
- SINK får aldrig användas utan uttryckligt beslut eller annan explicit legal basis som systemet har verifierat
- A-SINK får aldrig användas utan uttryckligt artistskattsspår
- no-tax certificate får aldrig användas utan bevarad evidens och effective period
- samma lönerad får aldrig samtidigt vara ordinary table, engångsskatt, jämkning och SINK/A-SINK
- tax decision som gäller i pay run måste frysas i immutable payrollsnapshot

## Bindande dokumenthierarki för preliminarskatt och skattetabeller

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
- `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md`
- Skatteverkets tekniska beskrivning för skattetabeller
- Skatteverkets vägledning om jämkning, SINK och A-SINK
- Skatteverkets belopp- och procentsatssidor för aktuellt tax year

Detta dokument får inte overstyras av:
- runtime-fallback till `manual_rate`
- UI-inmatad procent utan decision evidence
- importerade legacy-tax profiles som inte mappats till canonical modes
- gamla demonstrationer eller seeddata

## Kanoniska objekt

- `TaxDecisionSnapshot`
  - fryst beslut som payroll konsumerar

- `TaxMode`
  - sluten klassificering:
    - `ordinary_table`
    - `one_time_tax`
    - `adjustment_fixed`
    - `adjustment_percentage`
    - `sink`
    - `a_sink`
    - `no_tax_certificate`
    - `emergency_manual`

- `TaxTableReference`
  - `taxYear`, `tableNumber`, `columnCode`, `incomeBandVersion`, `sourceArtifactRef`

- `OneTimeTaxReference`
  - official engångsskatt basis med tax year och rate schedule ref

- `AdjustmentDecisionSnapshot`
  - Skatteverkets beslut om jämkning eller ändra avvikande skatteavdragsinstruktioner

- `SinkDecisionSnapshot`
  - SINK-beslut med rate, scope och effective period

- `ASinkDecisionSnapshot`
  - A-SINK-beslut med rate, category och effective period

- `NoTaxCertificateSnapshot`
  - intyg eller annat giltigt underlag för att inte göra skatteavdrag

- `TaxDecisionEvidence`
  - dokument, certifikat, myndighetsbeslut eller partner-API-svar som styr beslutet

- `TaxCalculationReceipt`
  - immutable output med taxable basis, selected mode och withheld amount

## Kanoniska state machines

### `TaxDecisionSnapshot`

- `draft`
- `verified`
- `active`
- `superseded`
- `expired`

### `AdjustmentDecisionSnapshot`

- `draft`
- `verified`
- `active`
- `expired`

### `NoTaxCertificateSnapshot`

- `draft`
- `verified`
- `active`
- `expired`
- `revoked`

### `EmergencyManualTaxCase`

- `detected`
- `review_pending`
- `approved`
- `applied`
- `rejected`

## Kanoniska commands

- `RegisterTaxDecisionSnapshot`
- `VerifyTaxDecisionSnapshot`
- `ActivateTaxDecisionSnapshot`
- `RegisterAdjustmentDecision`
- `RegisterSinkDecision`
- `RegisterASinkDecision`
- `RegisterNoTaxCertificate`
- `ApproveEmergencyManualTaxCase`
- `FreezeTaxDecisionIntoPayRun`

## Kanoniska events

- `TaxDecisionSnapshotRegistered`
- `TaxDecisionSnapshotVerified`
- `TaxDecisionSnapshotActivated`
- `AdjustmentDecisionRegistered`
- `SinkDecisionRegistered`
- `ASinkDecisionRegistered`
- `NoTaxCertificateRegistered`
- `EmergencyManualTaxApproved`
- `TaxDecisionFrozenIntoPayRun`

## Kanoniska route-familjer

- `/v1/payroll/tax-decisions/*`
- `/v1/payroll/tax-adjustments/*`
- `/v1/payroll/tax-certificates/*`
- `/v1/payroll/pay-runs/*/tax/*`

Förbjudna route-monster:
- fri patch av skatteprocent på live pay run
- UI-vag som låter operator skriva `manual_rate` utan decision receipt
- generic importroute som låter okand tax mode passera som ordinary table

## Kanoniska permissions och review boundaries

- `payroll.tax.manage`
- `payroll.tax.approve`
- `payroll.tax.emergency_manual`

Review boundaries:
- ordinary table profiles krav er payroll review
- jamkningsbeslut krav er payroll review + evidence validation
- SINK och A-SINK krav er explicit international/regulatory review
- emergency manual tax krav er dual review

## Nummer-, serie-, referens- och identitetsregler

- varje `TaxDecisionSnapshot` måste ha globalt unikt `taxDecisionId`
- table references måste vara effective-dated per tax year
- samma employment får inte ha mer an en aktiv ordinary-table decision för samma effective period
- varje SINK/A-SINK beslut måste ha myndighetsref eller motsvarande canonical evidence ref

## Valuta-, avrundnings- och omräkningsregler

- skatteavdrag beräknas i `SEK`
- foreign source payroll amounts måste vara omräknade före tax calculation
- oreavrundning måste följa official calculation chain och inte göras godtyckligt per line

## Replay-, correction-, recovery- och cutover-regler

- replay måste läsa samma tax mode, samma table reference och samma decision evidence som ursprungsrun
- correction får aldrig läsa dagens tax decision om historisk decision gäller för ursprungsperioden
- migration av tax decisions måste mappa till canonical `TaxMode`
- no-tax certificate som inte är effective på payment date får inte konsumeras

## Huvudflödet

1. tax evidence eller decision registreras
2. canonical `TaxMode` faststalls
3. decision snapshot verifieras och aktiveras
4. pay run beräknar taxable basis
5. tax engine slar upp pinned official basis
6. `TaxCalculationReceipt` byggs
7. beslutet fryses in i payroll snapshot
8. downstream posting, AGI och payslip får bara konsumera det frysta resultatet

## Bindande scenarioaxlar

- `taxMode`
  - `ordinary_table`
  - `one_time_tax`
  - `adjustment_fixed`
  - `adjustment_percentage`
  - `sink`
  - `a_sink`
  - `no_tax_certificate`
  - `emergency_manual`

- `decisionEvidenceFamily`
  - `official_table_pack`
  - `official_adjustment_decision`
  - `official_sink_decision`
  - `official_a_sink_decision`
  - `employee_certificate`
  - `emergency_manual_receipt`

- `incomeProfile`
  - `regular_cash_salary`
  - `one_time_payment`
  - `taxable_benefit`
  - `mixed_cash_and_benefit`
  - `nonresident_short_term`
  - `artist_or_athlete_nonresident`

- `effectiveDating`
  - `whole_year`
  - `mid_year_change`
  - `single_run_only`

## Bindande policykartor

### Canonical tax-mode policy

- `ordinary_table`
  - krav:
    - official table basis
    - tax year
    - table number
    - column code
    - effective date

- `one_time_tax`
  - krav:
    - official one-time tax basis för tax year
    - payment classified as one-time per payroll policy

- `adjustment_fixed`
  - krav:
    - explicit myndighetsbeslut
    - fixed amount logic exactly as decision states

- `adjustment_percentage`
  - krav:
    - explicit myndighetsbeslut
    - percentage logic exactly as decision states

- `sink`
  - krav:
    - SINK-beslut eller annan explicit verified basis
    - rate pinned by tax year and legal regime
  - current official baseline:
    - 2026 ordinary SINK: `22.5%`
    - 2026 sea-income SINK: `15%`

- `a_sink`
  - krav:
    - artist/idrottsutovare-spår
    - A-SINK evidence
  - current official baseline:
    - `15%`

- `no_tax_certificate`
  - krav:
    - explicit intyg eller beslut
    - effective period
    - income-threshold governance

### Forbidden mixes

- ordinary table + SINK
- ordinary table + A-SINK
- ordinary table + no-tax certificate
- one-time tax + SINK
- adjustment percentage + adjustment fixed on same basis
- emergency manual + unresolved official decision conflict

## Bindande canonical proof-ledger med exakta konton eller faltutfall

Detta dokument äger frysta tax outcomes, inte slutlig payrollposting.

### TAX-P0001 Ordinary table calculation

- fields:
  - `taxMode = ordinary_table`
  - `taxYear` pinned
  - `tableNumber` pinned
  - `columnCode` pinned
  - `withheldTaxAmount > 0` according to official table

### TAX-P0002 One-time tax calculation

- fields:
  - `taxMode = one_time_tax`
  - `oneTimeTaxReference` pinned
  - `withheldTaxAmount` from official one-time schedule

### TAX-P0003 Adjustment fixed amount

- fields:
  - `taxMode = adjustment_fixed`
  - `adjustmentDecisionRef` pinned
  - `withheldTaxAmount` modified by fixed-decision logic

### TAX-P0004 Adjustment percentage

- fields:
  - `taxMode = adjustment_percentage`
  - `adjustmentDecisionRef` pinned
  - `withheldTaxAmount` modified by decision percentage

### TAX-P0005 SINK ordinary nonresident

- fields:
  - `taxMode = sink`
  - `sinkRate = 22.5%`
  - `taxYear = 2026`

### TAX-P0006 SINK sea income

- fields:
  - `taxMode = sink`
  - `sinkRate = 15%`
  - `seaIncomeFlag = true`

### TAX-P0007 A-SINK

- fields:
  - `taxMode = a_sink`
  - `aSinkRate = 15%`

### TAX-P0008 No-tax certificate valid

- fields:
  - `taxMode = no_tax_certificate`
  - `withheldTaxAmount = 0`
  - certificate evidence pinned

### TAX-P0009 Emergency manual tax

- fields:
  - `taxMode = emergency_manual`
  - dual review required
  - reason code required

### TAX-P0010 Missing decision or invalid mix

- result:
  - `blocked_tax_decision`

## Bindande rapport-, export- och myndighetsmappning

- all tax outcomes must publish:
  - `taxMode`
  - `taxYear`
  - `decisionRef`
  - `taxableBasisAmount`
  - `withheldTaxAmount`
  - `sinkOrASinkFlag`
  - `adjustmentFlag`

- AGI pre-anchor:
  - ordinary and adjusted withholding -> `preliminary_tax_withholding`
  - SINK/A-SINK -> `special_nonresident_withholding`
  - no-tax certificate -> `no_withholding_evidence_path`

## Bindande scenariofamilj till proof-ledger och rapportspar

- `TAX-A001 ordinary_table_regular_salary -> TAX-P0001 -> preliminary_tax_withholding`
- `TAX-A002 ordinary_table_mixed_cash_and_benefit -> TAX-P0001 -> preliminary_tax_withholding`
- `TAX-B001 one_time_tax_bonus -> TAX-P0002 -> preliminary_tax_withholding`
- `TAX-B002 one_time_tax_final_pay_component -> TAX-P0002 -> preliminary_tax_withholding`
- `TAX-C001 adjustment_fixed -> TAX-P0003 -> preliminary_tax_withholding`
- `TAX-C002 adjustment_percentage -> TAX-P0004 -> preliminary_tax_withholding`
- `TAX-D001 sink_nonresident_regular -> TAX-P0005 -> special_nonresident_withholding`
- `TAX-D002 sink_sea_income -> TAX-P0006 -> special_nonresident_withholding`
- `TAX-D003 a_sink_artist_athlete -> TAX-P0007 -> special_nonresident_withholding`
- `TAX-E001 no_tax_certificate_valid -> TAX-P0008 -> no_withholding_evidence_path`
- `TAX-Z001 invalid_missing_or_mixed_decision -> TAX-P0010 -> blocked`

## Tvingande dokument- eller indataregler

Varje aktivt taxbeslut måste minst ha:
- `employmentId` eller annan entydig subject ref
- `taxMode`
- `effectiveFrom`
- `effectiveTo` när relevant
- `taxYear`
- `decisionEvidenceRef`
- `sourceType`
- `reviewReceiptRef`

Ordinary table måste dessutom ha:
- `tableNumber`
- `columnCode`

SINK/A-SINK måste dessutom ha:
- `rate`
- `internationalStatusEvidence`

No-tax certificate måste dessutom ha:
- certificate type
- validity interval
- source artifact

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `TAX-R001 ordinary_table`
- `TAX-R002 one_time_tax`
- `TAX-R003 adjustment_fixed`
- `TAX-R004 adjustment_percentage`
- `TAX-R005 sink_nonresident`
- `TAX-R006 sink_sea_income`
- `TAX-R007 a_sink_artist_athlete`
- `TAX-R008 no_tax_certificate`
- `TAX-R009 emergency_manual`
- `TAX-R010 blocked_invalid_mix`

## Bindande faltspec eller inputspec per profil

### Ordinary table profile

- `taxYear`
- `tableNumber`
- `columnCode`
- `decisionEvidenceRef`

### One-time tax profile

- `taxYear`
- `oneTimeTaxReferenceRef`
- `decisionEvidenceRef` when external decision modifies standard treatment

### Adjustment profile

- `adjustmentType`
- `adjustmentDecisionRef`
- `effectiveFrom`
- `effectiveTo`

### SINK / A-SINK profile

- `nonresidentFlag`
- `decisionRef`
- `rate`
- `effectivePeriod`

### No-tax certificate profile

- `certificateType`
- `sourceArtifactRef`
- `validityStart`
- `validityEnd`

## Scenariofamiljer som hela systemet måste tacka

- ordinary tabellskatt
- ordinary tabellskatt med mixed salary and benefit basis
- engångsskatt
- fast jämkning
- procentjamkning
- SINK 22.5
- SINK 15 för sjoinkomst
- A-SINK 15
- no-tax certificate
- emergency manual tax
- blocked mixed-mode scenarios
- blocked missing-decision scenarios

## Scenarioregler per familj

- ordinary table måste alltid läsa official table pack
- one-time tax måste alltid läsa official one-time basis
- jämkning måste alltid läsa explicit decision
- SINK måste alltid läsa nonresident decision path
- A-SINK måste alltid läsa artist/idrott decision path
- no-tax certificate får aldrig användas efter giltighetsperiod
- emergency manual får bara användas när official path är blockerad och dual review finns

## Blockerande valideringar

- deny ordinary-table calculation om table number eller column saknas
- deny one-time tax om payment family inte är classified as one-time
- deny jämkning om beslut saknas eller är utgatt
- deny SINK om beslut eller nonresident basis saknas
- deny A-SINK om artist/idrott evidence saknas
- deny no-tax certificate om certificate validity inte tacker payment date
- deny emergency manual om official decision path fortfarande är tillganglig och inte är felmarkerad

## Rapport- och exportkonsekvenser

- payslip måste visa selected tax mode
- audit trail måste visa decision evidence
- AGI build måste kunna läsa special nonresident withholding vs ordinary withholding
- migration/export måste kunna återge exact tax mode historically

## Förbjudna förenklingar

- en enda `manual_rate` för allt
- ordinary table without column
- SINK as free percentage field
- A-SINK as generic foreign tax mode
- intyg utan validity interval
- jämkning without explicit decision type

## Fler bindande proof-ledger-regler för specialfall

- mid-year change in tax decision must split receipts by effective date
- correction run must replay original decision and then apply correction-period decision only where legally correct
- negative withheld tax is forbidden unless explicit correction semantics say otherwise
- historical import without decision evidence must be marked `evidence_gap_imported`, never native green

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `TAX-P0001-TAX-P0009`
  - affect payroll tax outcome only
  - downstream payroll posting to `2710` is owned by payroll account truth

- `TAX-P0010`
  - blocked
  - no payroll finalization

## Bindande verifikations-, serie- och exportregler

- tax decision receipts must be exportable with:
  - `taxDecisionId`
  - `taxMode`
  - `taxYear`
  - `decisionEvidenceRef`
  - `effectiveFrom`
  - `effectiveTo`

- payroll voucher export får aldrig sakna decision lineage

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- tax year
- payment family regular vs one-time
- domestic vs nonresident
- employee certificate present vs absent
- mid-year change vs static whole year
- benefit-inclusive vs cash-only basis

## Bindande fixture-klasser för preliminarskatt

- `TAX-FXT-001` ordinary monthly salary
- `TAX-FXT-002` one-time bonus
- `TAX-FXT-003` fixed adjustment decision
- `TAX-FXT-004` percentage adjustment decision
- `TAX-FXT-005` SINK 22.5
- `TAX-FXT-006` SINK sea income 15
- `TAX-FXT-007` A-SINK 15
- `TAX-FXT-008` no-tax certificate
- `TAX-FXT-009` emergency manual

## Bindande expected outcome-format per scenario

Varje scenario måste minst ha:
- `scenarioId`
- `taxMode`
- `taxYear`
- `decisionEvidenceRef`
- `taxableBasisAmount`
- `expectedWithheldTaxAmount`
- `expectedBlockedOrAllowedStatus`
- `expectedSpecialFlags`

## Bindande canonical verifikationsseriepolicy

- tax decision receipts belong to payroll decision evidence series, not free-text notes
- import-created historical tax decisions must carry import-series marker and may not masquerade as native live decisions

## Bindande expected outcome per central scenariofamilj

- `TAX-A001`
  - `taxMode = ordinary_table`
  - `tableNumber` and `columnCode` required
  - allowed

- `TAX-B001`
  - `taxMode = one_time_tax`
  - official one-time basis required
  - allowed

- `TAX-C001`
  - `taxMode = adjustment_fixed`
  - explicit decision required
  - allowed

- `TAX-D001`
  - `taxMode = sink`
  - `rate = 22.5%`
  - allowed

- `TAX-D003`
  - `taxMode = a_sink`
  - `rate = 15%`
  - allowed

- `TAX-E001`
  - `taxMode = no_tax_certificate`
  - `withheldTaxAmount = 0`
  - certificate required

- `TAX-Z001`
  - blocked
  - no final payroll approval

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- all `TAX-A*` -> ordinary table outcome
- all `TAX-B*` -> official one-time outcome
- all `TAX-C*` -> adjustment decision outcome
- all `TAX-D*` -> nonresident special-tax outcome
- all `TAX-E*` -> explicit no-withholding outcome
- all `TAX-Z*` -> blocked

## Bindande testkrav

- unit tests för tax mode resolution
- unit tests för blocked mixed-mode decisions
- unit tests för ordinary table mandatory fields
- unit tests för one-time tax family separation
- unit tests för adjustment decision parsing
- unit tests för SINK/A-SINK rate and eligibility handling
- integration tests för tax decision lifecycle APIs
- integration tests för pay-run freeze of tax decision snapshots
- migration tests för imported tax decisions and evidence gaps
- parity tests against official table and rate baselines

## Källor som styr dokumentet

- `DOMAIN_10_ROADMAP.md`
- `DOMAIN_10_IMPLEMENTATION_LIBRARY.md`
- `LONEFLODET_BINDANDE_SANNING.md`
- `packages/domain-payroll/src/index.mjs`
- `tests/unit/phase12-tax-decision-snapshots.test.mjs`
- `tests/unit/phase21-payroll-core.test.mjs`
- `tests/integration/phase12-tax-decision-snapshots-api.test.mjs`
- `tests/e2e/phase8-payroll-tax-agi-flow.test.mjs`
- [Skatteverket: Teknisk beskrivning för skattetabeller](https://www.skatteverket.se/foretag/arbetsgivare/arbetsgivaravgifterochskatteavdrag/skattetabeller/tekniskbeskrivningforskattetabeller.4.319dc1451507f2f99e86ee.html)
- [Skatteverket: Jämkning](https://www.skatteverket.se/privat/etjansterochblanketter/allaetjanster/tjanster/jamkning.4.731e901069429e4958000460.html)
- [Skatteverket: SINK - sarskild inkomstskatt för utomlands bosatta](https://www.skatteverket.se/privat/internationellt/bosattutomlands/sinksarskildinkomstskattforutomlandsbosatta.4.6fdde64a12cc4eee23080002583.html)
- [Skatteverket: 2026 belopp och procent](https://www.skatteverket.se/privat/skatter/beloppochprocent/2026.4.1522bf3f19aea8075ba21.html)
- [Skatteverket: A-SINK för artister och idrottsutovare](https://www.skatteverket.se/foretag/internationellt/utomlandsbosattaartisterartistskatt.4.71004e4c133e23bf6db800028935.html)
- [Skatteverket: SKV 401 Skatteavdrag och arbetsgivaravgifter](https://www.skatteverket.se/download/18.262c54c219391f2e9634df4/1736339078938/skatteavdrag-och-arbetsgivaravgifter-skv401-utgava30.pdf)
