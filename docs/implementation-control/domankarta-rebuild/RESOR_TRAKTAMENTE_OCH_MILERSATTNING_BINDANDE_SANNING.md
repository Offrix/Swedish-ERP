# RESOR_TRAKTAMENTE_OCH_MILERSÄTTNING_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för resor, traktamente och milersättning i svensk payroll och expense-truth.

Detta dokument ska styra:
- tjänsteresa vs ej tjänsteresa
- traktamente inrikes och utrikes
- hel dag, halv dag och nattraktamente
- tremånadersreduktion
- måltidsreduktion
- egen bil, förmånsbil och eldriven förmånsbil
- tax-free vs taxable travel replacement
- routing mellan kvitto/outlay/travel/payroll

## Syfte

Detta dokument finns för att:
- traktamente utan overnattning aldrig ska smygas igenom som skattefritt
- inrikes och utrikes schabloner ska vara official-source-pinnade
- maltider under resa ska reducera traktamentet korrekt och vid behov utlosa kostforman
- milersättning och traktamente inte ska blandas ihop med receipt reimbursement eller vanlig lön

## Omfattning

Detta dokument omfattar:
- travel-case classification
- tax-free and taxable travel allowances
- inrikes and utrikes traktamente
- mileage allowances
- overnight requirement
- free-meal reduction logic
- three-month and long-duration travel reduction logic

Detta dokument omfattar inte:
- ordinary receipts booked as company costs
- taxable benefits unrelated to travel
- pension
- collective-agreement top-ups unless explicitly modeled as separate non-tax-free line

## Absoluta principer

- traktamente utan overnattning är alltid skattepliktigt fullt ut
- skattefritt traktamente får aldrig ges utan verifierad tjänsteresa och overnattning
- om arbetsgivaren betalar maltider ska skattefritt traktamente reduceras enligt official rules
- maltider som obligatoriskt ingar i biljettpriset får inte reducera traktamentet och får inte skapa kostforman
- milersättning får aldrig behandlas som traktamente
- overstigande belopp över official schablon är lön, inte skattefri kostnadsersättning
- country normalbelopp för utrikes resa får aldrig hardkodas utan pinned annual source

## Bindande dokumenthierarki för resor, traktamente och milersättning

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- `DOMAIN_10_ROADMAP.md`
- `DOMAIN_10_IMPLEMENTATION_LIBRARY.md`
- detta dokument

Detta dokument lutar på:
- `KVITTOFLODET_BINDANDE_SANNING.md`
- `UTLAGG_OCH_VIDAREFAKTURERING_BINDANDE_SANNING.md`
- `LONEFLODET_BINDANDE_SANNING.md`
- `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md`
- Skatteverkets traktamente- och bilersättningsregler

## Kanoniska objekt

- `TravelCase`
- `TravelItinerarySnapshot`
- `TravelAllowanceDecision`
- `PerDiemRateReference`
- `MealReductionDecision`
- `MileageAllowanceDecision`
- `TravelPayrollHandoff`
- `TravelReviewCase`

## Kanoniska state machines

### `TravelCase`

- `draft`
- `classified`
- `valued`
- `ready_for_payroll`
- `closed`
- `blocked`

### `TravelReviewCase`

- `open`
- `review_pending`
- `approved`
- `rejected`
- `blocked`

### `TravelPayrollHandoff`

- `draft`
- `ready`
- `consumed`
- `superseded`

## Kanoniska commands

- `RegisterTravelCase`
- `ClassifyTravelCase`
- `ResolvePerDiemRate`
- `ApplyMealReductionDecision`
- `ResolveMileageAllowance`
- `CreateTravelPayrollHandoff`
- `BlockTravelCase`

## Kanoniska events

- `TravelCaseRegistered`
- `TravelCaseClassified`
- `PerDiemRateResolved`
- `MealReductionApplied`
- `MileageAllowanceResolved`
- `TravelPayrollHandoffCreated`
- `TravelCaseBlocked`

## Kanoniska route-familjer

- `/v1/payroll/travel/*`
- `/v1/expenses/travel-review/*`

## Kanoniska permissions och review boundaries

- `payroll.travel.manage`
- `payroll.travel.approve`
- `expenses.travel.review`

Review boundaries:
- unclear overnight, country, meal or private-use split requires review
- foreign travel with missing normalbelopp ref is blocked

## Nummer-, serie-, referens- och identitetsregler

- every `TravelCase` must have immutable `travelCaseId`
- every per-diem and mileage resolution must retain rate-year and source ref
- same employee and travel interval may not create duplicate active handoffs för same compensation family

## Valuta-, avrundnings- och omräkningsregler

- payroll handoff is stored in `SEK`
- foreign travel normalbelopp are converted according to official annual reference table when source is not already in `SEK`
- oreavrundning follows official chain and must happen after reduction logic

## Replay-, correction-, recovery- och cutover-regler

- replay must load original itinerary, rate table and meal-reduction decisions
- correction must create new valuation snapshot, never mutate consumed one
- imported historical travel cases must map to canonical travel family before live payroll use

## Huvudflödet

1. travel evidence and itinerary are captured
2. deterministic rules classify whether this is service travel with or without overnight
3. per-diem and mileage rates are resolved from official annual references
4. meal reduction and long-duration reduction are applied
5. tax-free and taxable portions are split
6. travel payroll handoff is created
7. payroll consumes handoff without inventing travel logic

## Bindande scenarioaxlar

- `travelFamily`
  - `domestic_per_diem`
  - `foreign_per_diem`
  - `night_allowance`
  - `mileage_own_car`
  - `mileage_company_car`
  - `mileage_company_car_electric`
  - `taxable_allowance_only`
  - `expense_reimbursement`

- `overnightStatus`
  - `overnight_yes`
  - `overnight_no`

- `mealProfile`
  - `no_free_meals`
  - `breakfast`
  - `lunch_or_dinner`
  - `lunch_and_dinner`
  - `all_meals`
  - `meal_included_in_ticket_only`

- `durationProfile`
  - `normal_period`
  - `after_three_months`

## Bindande policykartor

### 2026 inrikes traktamente

- hel dag: `300 SEK`
- halv dag: `150 SEK`
- efter tre manader hel dag: `210 SEK`
- nattraktamente: `150 SEK`

### 2026 inrikes måltidsreduktion

- all meals:
  - normal: `270 SEK`
  - after three months: `189 SEK`
- lunch and dinner:
  - normal: `210 SEK`
  - after three months: `147 SEK`
- lunch or dinner:
  - normal: `105 SEK`
  - after three months: `74 SEK`
- breakfast:
  - normal: `60 SEK`
  - after three months: `42 SEK`

### 2026 skattefri milersättning

- own car: `25 SEK per mil`
- company car: `12 SEK per mil`
- fully electric company car: `9.50 SEK per mil`
- plugin hybrid treated as ordinary company car: `12 SEK per mil`

### Utrikes policy

- country-specific normalbelopp must be loaded from official annual table för 2026
- meal reduction percentages:
  - all meals: `85%`
  - lunch and dinner: `70%`
  - lunch or dinner: `35%`
  - breakfast: `15%`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

### TRV-P0001 Domestic per diem full tax-free

- `travelFamily = domestic_per_diem`
- `taxFreeAmount = 300`
- `taxableAmount = 0`

### TRV-P0002 Domestic per diem half day tax-free

- `travelFamily = domestic_per_diem`
- `taxFreeAmount = 150`
- `taxableAmount = 0`

### TRV-P0003 Domestic per diem after three months

- `travelFamily = domestic_per_diem`
- `taxFreeAmount = 210`
- `taxableAmount = 0`

### TRV-P0004 Domestic night allowance

- `travelFamily = night_allowance`
- `taxFreeAmount = 150`

### TRV-P0005 Domestic per diem without overnight

- `travelFamily = taxable_allowance_only`
- `taxFreeAmount = 0`
- `taxableAmount = full_paid_amount`

### TRV-P0006 Domestic per diem reduced för meals

- `taxFreeAmount = official_reduced_amount`
- `taxableAmount = 0`

### TRV-P0007 Foreign per diem

- `travelFamily = foreign_per_diem`
- `taxFreeAmount = official_country_amount_after_reduction`

### TRV-P0008 Own-car mileage

- `travelFamily = mileage_own_car`
- `taxFreeAmount = 25 * mil`

### TRV-P0009 Company-car mileage

- `travelFamily = mileage_company_car`
- `taxFreeAmount = 12 * mil`

### TRV-P0010 Fully electric company-car mileage

- `travelFamily = mileage_company_car_electric`
- `taxFreeAmount = 9.50 * mil`

### TRV-P0011 Above-schablon excess

- tax-free portion = official limit
- excess = taxable cash compensation

### TRV-P0012 Meal included in ticket

- no meal reduction
- no kostforman

### TRV-P0013 Blocked unclear travel case

- `blocked_travel_case`

## Bindande rapport-, export- och myndighetsmappning

- every travel handoff must publish:
  - `travelFamily`
  - `taxFreeAmount`
  - `taxableAmount`
  - `countryOrDomesticFlag`
  - `durationProfile`
  - `mealReductionProfile`
  - `rateSourceRef`

## Bindande scenariofamilj till proof-ledger och rapportspar

- `TRV-A001 domestic_full_day -> TRV-P0001 -> tax_free_allowance`
- `TRV-A002 domestic_half_day -> TRV-P0002 -> tax_free_allowance`
- `TRV-A003 domestic_after_three_months -> TRV-P0003 -> tax_free_allowance`
- `TRV-A004 domestic_night_allowance -> TRV-P0004 -> tax_free_allowance`
- `TRV-A005 domestic_without_overnight -> TRV-P0005 -> taxable_allowance`
- `TRV-B001 domestic_meal_reduction -> TRV-P0006 -> tax_free_allowance`
- `TRV-C001 foreign_per_diem -> TRV-P0007 -> tax_free_allowance`
- `TRV-D001 own_car_mileage -> TRV-P0008 -> tax_free_allowance`
- `TRV-D002 company_car_mileage -> TRV-P0009 -> tax_free_allowance`
- `TRV-D003 electric_company_car_mileage -> TRV-P0010 -> tax_free_allowance`
- `TRV-E001 above_schablon_excess -> TRV-P0011 -> mixed_tax_free_and_taxable`
- `TRV-E002 meal_included_in_ticket -> TRV-P0012 -> tax_free_allowance`
- `TRV-Z001 unclear_or_missing_evidence -> TRV-P0013 -> blocked`

## Tvingande dokument- eller indataregler

Every travel case must include:
- `employeeId`
- `travelStart`
- `travelEnd`
- `overnightEvidence`
- `destination`
- `mealProfile`
- `travelFamily`
- `rateSourceRef`
- `reviewReceiptRef` when review required

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `TRV-R001 domestic_per_diem`
- `TRV-R002 foreign_per_diem`
- `TRV-R003 night_allowance`
- `TRV-R004 own_car_mileage`
- `TRV-R005 company_car_mileage`
- `TRV-R006 electric_company_car_mileage`
- `TRV-R007 no_overnight_taxable`
- `TRV-R008 meal_reduction_applied`
- `TRV-R009 meal_included_in_ticket`
- `TRV-R010 above_schablon_excess`
- `TRV-R011 blocked_travel_case`

## Bindande faltspec eller inputspec per profil

### Domestic per diem profile

- `travelStartTime`
- `travelEndTime`
- `overnightEvidence`
- `mealProfile`

### Foreign per diem profile

- all domestic fields plus:
- `countryCode`
- `countryNormalbeloppRef`

### Mileage profile

- `vehicleType`
- `distanceMil`
- `companyCarFlag`
- `electricFlag`

## Scenariofamiljer som hela systemet måste tacka

- inrikes hel dag
- inrikes halv dag
- inrikes efter tre manader
- nattraktamente
- utan overnattning
- måltidsreduktion
- utrikes traktamente
- milersättning egen bil
- milersättning förmånsbil
- milersättning eldriven förmånsbil
- över schablon
- blockerad oklar resa

## Scenarioregler per familj

- domestic per diem without overnight is always taxable
- meal reductions apply only when meals are employer-paid and not ticket-included
- foreign travel uses country normalbelopp and percentage reductions
- above-schablon excess becomes taxable salary
- mileage reimbursement only covers service travel and approved distance

## Blockerande valideringar

- deny tax-free per diem if overnight evidence missing
- deny foreign per diem if country normalbelopp missing
- deny mileage if distance proof missing
- deny half/full-day classification if times missing
- deny meal reduction exemption unless ticket-included evidence exists

## Rapport- och exportkonsekvenser

- payroll and AGI traces must show tax-free vs taxable split
- travel export must preserve rate-year and country reference
- migration export must preserve original travel classification

## Förbjudna förenklingar

- all travel allowances as tax-free
- no difference between own car and company car
- no difference between ordinary meal reduction and ticket-included meals
- hardcoded single foreign rate för all countries

## Fler bindande proof-ledger-regler för specialfall

- if free meals also create kostforman, that downstream relation must be explicit and not silently inferred in payroll posting
- if same journey mixes domestic and foreign days, daily classification must split by official rule
- after three months reduction does not apply where official exemption says travel is continuously moving, unless explicit evidence says otherwise

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `TRV-P0001-TRV-P0012`
  - create travel payroll handoff
  - no ordinary AP or receipt posting mutation here unless expense flow owns cost separately

- `TRV-P0013`
  - blocked
  - no payroll handoff

## Bindande verifikations-, serie- och exportregler

- travel handoffs must export:
  - `travelCaseId`
  - `travelFamily`
  - `taxFreeAmount`
  - `taxableAmount`
  - `rateSourceRef`

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- domestic vs foreign
- overnight vs no overnight
- meal reduction vs no reduction
- normal period vs after three months
- own car vs company car vs electric company car

## Bindande fixture-klasser för resor

- `TRV-FXT-001` domestic full day
- `TRV-FXT-002` domestic half day
- `TRV-FXT-003` domestic after three months
- `TRV-FXT-004` meal reduction
- `TRV-FXT-005` foreign country normalbelopp
- `TRV-FXT-006` own car mileage
- `TRV-FXT-007` company car mileage
- `TRV-FXT-008` electric company car mileage

## Bindande expected outcome-format per scenario

Every scenario must include:
- `scenarioId`
- `travelFamily`
- `expectedTaxFreeAmount`
- `expectedTaxableAmount`
- `rateSourceRef`
- `expectedBlockedOrAllowedStatus`

## Bindande canonical verifikationsseriepolicy

- travel valuation and allowance receipts belong to payroll/travel evidence series
- imported historical travel cases must be tagged as imported and never masquerade as native live decisions

## Bindande expected outcome per central scenariofamilj

- `TRV-A001`
  - `taxFreeAmount = 300`
  - `taxableAmount = 0`

- `TRV-A005`
  - `taxFreeAmount = 0`
  - fully taxable

- `TRV-D001`
  - `taxFreeAmount = 25 * mil`

- `TRV-D003`
  - `taxFreeAmount = 9.50 * mil`

- `TRV-E001`
  - excess taxable

- `TRV-Z001`
  - blocked

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- all `TRV-A*` -> domestic per diem truth
- all `TRV-B*` -> meal-reduced domestic truth
- all `TRV-C*` -> foreign per diem truth
- all `TRV-D*` -> mileage truth
- all `TRV-E*` -> mixed travel/taxable edge truth
- all `TRV-Z*` -> blocked

## Bindande testkrav

- unit tests för overnight gating
- unit tests för domestic day classification
- unit tests för meal reductions
- unit tests för mileage vehicle-type split
- integration tests för expense/travel -> payroll handoff
- migration tests för historical travel cases

## Källor som styr dokumentet

- `DOMAIN_10_ROADMAP.md`
- `DOMAIN_10_IMPLEMENTATION_LIBRARY.md`
- `KVITTOFLODET_BINDANDE_SANNING.md`
- `UTLAGG_OCH_VIDAREFAKTURERING_BINDANDE_SANNING.md`
- `LONEFLODET_BINDANDE_SANNING.md`
- `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md`
- `tests/unit/phase12-benefits-travel-hardening.test.mjs`
- [Skatteverket: Traktamente och bilersättning](https://www.skatteverket.se/foretag/arbetsgivare/lonochersattning/traktamenteochbilersattning.4.361dc8c15312eff6fd1703e.html)
- [Skatteverket: Belopp och procent 2026](https://skatteverket.se/foretag/skatterochavdrag/beloppochprocent/2026.106.1522bf3f19aea8075ba3294.html)
- [Skatteverket: Traktamenten och ändra kostnadsersättningar SKV 354](https://www.skatteverket.se/download/18.7eada0316ed67d728264c/1708607302941/traktamenten-och-andra-kostnadsersattningar-skv354-utgava30.pdf)
