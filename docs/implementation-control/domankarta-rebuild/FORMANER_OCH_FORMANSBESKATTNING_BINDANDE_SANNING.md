# FÖRMÅNER_OCH_FORMANSBESKATTNING_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för förmåner och förmånsbeskattning i svensk payroll och expense-truth.

Detta dokument ska styra:
- benefit classification
- taxable vs non-taxable benefit truth
- valuation source and evidence
- upstream-cost-owned vs payroll-owned benefit handling
- no-double-booking between receipt/AP and payroll
- car benefit, fuel benefit, meal benefit, parking, housing, loan, gifts, health care, arbetsredskap, arbetsklader, personalvardsformaner, hushallsnara tjänster och trangselskatt benefit truth
- exclusion and reroute för parkeringsboter, kontrollavgifter, ändra personliga sanktioner, privata avgifter och ändra employee-personal liabilities that are not true benefit families

## Syfte

Detta dokument finns för att:
- systemet aldrig ska förväxla receiptkostnad med taxable benefit
- samma benefit aldrig ska bokas som ny kostnad i payroll om kostnaden redan är bokad i AP/receipt/asset flow
- skattefria personalvards- och arbetsredskapsfall ska blockera felaktig förmånsbeskattning
- benefit valuation och payroll handoff ska vara deterministisk och replaybar
- parkeringsboter, kontrollavgifter och ändra personliga sanktioner inte ska kunna glida igenom som vanlig kostnad eller falsk benefit

## Omfattning

Detta dokument omfattar:
- canonical benefit families
- taxability rules
- valuation evidence
- upstream owner and downstream owner boundaries
- payroll handoff and contribution basis flags
- gift, friskvard, arbetsredskap, arbetsklader, bil, drivmedel, parkering, trangselskatt, bostad, lan, sjukvard och hushallsnara tjänster
- exclusion-paths för personliga avgifter, boter, kontrollavgifter, privata abonnemang och ändra employee-personal liabilities

Detta dokument omfattar inte:
- slutlig payroll account mapping
- AGI-faltkoder i detalj
- travel allowance rates
- pension valuation

## Absoluta principer

- benefit classification must happen before payroll posting
- taxable benefit value får aldrig uppsta utan valuation evidence or explicit official schablonbasis
- skattefri personalvardsforman får aldrig routas till taxable benefit payroll line
- arbetsredskap som uppfyller skattefrihetsvillkoren får aldrig routas till taxable benefit
- om kostnaden redan är bokad upstream får payroll normalt bara konsumera benefit value, inte skapa ny kostnad
- cash reimbursement för private purchase is never automatically skattefri benefit; it may instead be taxable cash compensation
- gifts in cash are never skattefri gift
- if criteria för skattefrihet are not fully met, default is taxable or blocked review, never silent green
- parkeringsboter, felparkeringsavgifter, kontrollavgifter och liknande personliga sanktioner är inte skattefria benefits; om arbetsgivaren betalar dem är det normalt skattepliktig ersättning/lön eller owner/private, inte tax-free benefit
- privata avgifter och personliga sanktioner får aldrig auto-bokas som driftkostnad eller tax-free benefit

## Bindande dokumenthierarki för förmåner och förmånsbeskattning

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
- `LONEFLODET_BINDANDE_SANNING.md`
- `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md`
- Skatteverkets förmånssidor
- official annual value pages where applicable

## Kanoniska objekt

- `BenefitCase`
- `BenefitClassificationDecision`
- `BenefitValuationSnapshot`
- `BenefitEvidenceBundle`
- `BenefitOwnershipDecision`
- `BenefitPayrollHandoff`
- `BenefitReviewCase`
- `GiftPolicyCase`
- `PersonalvardsCase`
- `VehicleBenefitCase`

## Kanoniska state machines

### `BenefitCase`

- `draft`
- `classified`
- `valued`
- `ready_for_payroll`
- `closed`
- `blocked`

### `BenefitReviewCase`

- `open`
- `review_pending`
- `approved`
- `rejected`
- `blocked`

### `BenefitPayrollHandoff`

- `draft`
- `ready`
- `consumed`
- `superseded`

## Kanoniska commands

- `RegisterBenefitCase`
- `ClassifyBenefitCase`
- `ValueBenefitCase`
- `ApproveBenefitReviewCase`
- `CreateBenefitPayrollHandoff`
- `BlockBenefitCase`

## Kanoniska events

- `BenefitCaseRegistered`
- `BenefitCaseClassified`
- `BenefitCaseValued`
- `BenefitPayrollHandoffCreated`
- `BenefitCaseBlocked`

## Kanoniska route-familjer

- `/v1/payroll/benefits/*`
- `/v1/expenses/benefit-review/*`
- `/v1/vehicles/benefits/*`

## Kanoniska permissions och review boundaries

- `payroll.benefits.manage`
- `payroll.benefits.approve`
- `expenses.benefit.review`
- `vehicles.benefit.review`

Review boundaries:
- car, fuel, housing, loan and healthcare benefits require finance/payroll review
- personalvard, arbetsredskap and arbetsklader may auto-classify only when all skattefrihetskriterier are satisfied

## Nummer-, serie-, referens- och identitetsregler

- every `BenefitCase` must have immutable `benefitCaseId`
- one upstream source artifact may create one or more benefit cases, but each employee-benefit-period combination must be unique per source
- valuation snapshots are effective-dated and immutable once consumed by payroll

## Valuta-, avrundnings- och omräkningsregler

- benefit values are stored in `SEK`
- foreign-currency costs must be converted before valuation or payroll handoff
- annual or monthly schablonvarden must retain source year and source publication ref

## Replay-, correction-, recovery- och cutover-regler

- benefit replay must use original valuation snapshot and evidence
- correction must create new valuation snapshot, never mutate consumed one
- migration of legacy taxable benefits must map to canonical benefit families before live payroll use

## Huvudflödet

1. upstream receipt/AP/vehicle/contract signal creates benefit candidate
2. deterministic rules try to classify benefit family
3. if rules cannot fully classify, review case opens
4. valuation snapshot is created from official basis or explicit market-value evidence
5. ownership decision locks whether cost is upstream-owned or payroll-owned
6. payroll handoff is created with taxable/non-taxable flags and contribution basis flags
7. payroll consumes handoff without inventing new valuation logic

## Bindande scenarioaxlar

- `benefitFamily`
  - `car`
  - `fuel`
  - `meal`
  - `parking`
  - `housing`
  - `loan`
  - `gift`
  - `healthcare`
  - `work_equipment`
  - `work_clothing`
  - `personal_care_friskvard`
  - `household_service`
  - `congestion_tax`
  - `penalty_or_private_fee`
  - `other`

- `taxability`
  - `taxable`
  - `tax_free`
  - `blocked_review`

- `costOwnership`
  - `upstream_cost_already_booked`
  - `payroll_owned_cost`
  - `no_direct_cost_posting`

- `valuationMode`
  - `official_schablon`
  - `market_value`
  - `actual_cost_rule`
  - `zero_taxable_value`

## Bindande policykartor

### Canonical taxable families

- car benefit
- fuel benefit för private travel
- meal benefit unless exception applies
- free parking för private car at workplace when taxable
- housing benefit
- beneficial loan
- gifts that exceed skattefri conditions or are cash-equivalent
- employer-paid private healthcare where taxable
- household-service benefit to employee
- taxable congestion-tax benefit för private travel

### Canonical tax-free families

- qualifying personalvardsforman and friskvard within official limits
- arbetsredskap that meet all three conditions
- prescribed work clothes and protective clothes that qualify
- certain gifts that satisfy official conditions and value limits
- healthcare or prevention that is skattefri under official rules
- enklare fortaring/personalvard that is not a meal

### Canonical exclusion and reroute families

- employer-paid parkeringsboter and kontrollavgifter för employee-personal liability
- other fines, sanctions and employee-private fees
- private subscriptions, memberships and similar personal costs paid by employer
- private congestion or road charges outside verified service-travel or company-car-benefit path

Default reroute:
- employee-personal liability paid by employer:
  - `taxable_cash_compensation`
- owner/private:
  - `owner_private_flow`
- unresolved:
  - `blocked_review`

### Ownership policy

- if company paid receipt/AP already carries cost, `costOwnership = upstream_cost_already_booked`
- payroll then receives only benefit value and basis flags
- `payroll_owned_cost` is allowed only in explicitly approved payroll-native benefit cases

## Bindande canonical proof-ledger med exakta konton eller faltutfall

This document primarily owns field outcome and ownership truth.

### BNF-P0001 Taxable car benefit

- `benefitFamily = car`
- `taxability = taxable`
- `valuationMode = official_schablon`
- `costOwnership = upstream_cost_already_booked` by default

### BNF-P0002 Taxable fuel benefit

- `benefitFamily = fuel`
- `taxability = taxable`
- `valuationMode = actual_cost_rule`

### BNF-P0003 Taxable meal benefit

- `benefitFamily = meal`
- `taxability = taxable`
- `valuationMode = official_schablon`

### BNF-P0004 Tax-free personalvardsforman

- `benefitFamily = personal_care_friskvard`
- `taxability = tax_free`
- `valuationMode = zero_taxable_value`

### BNF-P0005 Tax-free work equipment

- `benefitFamily = work_equipment`
- `taxability = tax_free`
- three-condition test must pass

### BNF-P0006 Tax-free work clothing

- `benefitFamily = work_clothing`
- `taxability = tax_free`

### BNF-P0007 Taxable parking benefit

- `benefitFamily = parking`
- `taxability = taxable`
- `valuationMode = market_value`

### BNF-P0008 Taxable congestion-tax benefit

- `benefitFamily = congestion_tax`
- `taxability = taxable`
- `valuationMode = actual_cost_rule`

### BNF-P0009 Taxable housing benefit

- `benefitFamily = housing`
- `taxability = taxable`
- `valuationMode = official_schablon` or explicit official method

### BNF-P0010 Beneficial loan

- `benefitFamily = loan`
- `taxability = taxable`
- `valuationMode = official_interest_difference`

### BNF-P0011 Tax-free qualifying gift

- `benefitFamily = gift`
- `taxability = tax_free`
- official gift condition and value-limit evidence required

### BNF-P0012 Taxable gift

- `benefitFamily = gift`
- `taxability = taxable`

### BNF-P0013 Employer-paid private healthcare taxable

- `benefitFamily = healthcare`
- `taxability = taxable`

### BNF-P0014 Employer-paid healthcare tax-free

- `benefitFamily = healthcare`
- `taxability = tax_free`

### BNF-P0015 Household-service benefit

- `benefitFamily = household_service`
- `taxability = taxable`

### BNF-P0016 Blocked unclear benefit

- `taxability = blocked_review`

### BNF-P0017 Employer-paid parkeringsbot eller kontrollavgift

- `benefitFamily = penalty_or_private_fee`
- classification outcome:
  - `not_benefit_taxable_cash_compensation`
- payroll handoff required as taxable cash compensation, not taxable benefit

### BNF-P0018 Other employee-personal penalty or private fee

- `benefitFamily = penalty_or_private_fee`
- classification outcome:
  - `not_benefit_taxable_cash_compensation`
  - or `owner_private_flow` when owner/private boundary says so

## Bindande rapport-, export- och myndighetsmappning

- every taxable benefit must publish:
  - `benefitFamily`
  - `taxableBenefitValue`
  - `contributionBasisFlag`
  - `valuationSourceRef`
  - `ownershipDecision`

- every rerouted non-benefit personal liability must publish:
  - `rerouteOutcome`
  - `whyNotBenefit`
  - `targetFlow`

- every tax-free benefit must publish:
  - `benefitFamily`
  - `taxFreeReasonCode`
  - `evidenceRef`

## Bindande scenariofamilj till proof-ledger och rapportspar

- `BNF-A001 car_benefit -> BNF-P0001 -> taxable_benefit`
- `BNF-A002 fuel_benefit_private_use -> BNF-P0002 -> taxable_benefit`
- `BNF-A003 meal_benefit -> BNF-P0003 -> taxable_benefit`
- `BNF-B001 friskvard_within_limit -> BNF-P0004 -> tax_free_benefit`
- `BNF-B002 work_equipment_three_tests_met -> BNF-P0005 -> tax_free_benefit`
- `BNF-B003 qualifying_work_clothing -> BNF-P0006 -> tax_free_benefit`
- `BNF-C001 parking_private_car -> BNF-P0007 -> taxable_benefit`
- `BNF-C002 congestion_tax_private_travel -> BNF-P0008 -> taxable_benefit`
- `BNF-D001 housing_benefit -> BNF-P0009 -> taxable_benefit`
- `BNF-D002 beneficial_loan -> BNF-P0010 -> taxable_benefit`
- `BNF-E001 qualifying_gift -> BNF-P0011 -> tax_free_benefit`
- `BNF-E002 taxable_gift -> BNF-P0012 -> taxable_benefit`
- `BNF-F001 taxable_private_healthcare -> BNF-P0013 -> taxable_benefit`
- `BNF-F002 tax_free_healthcare_case -> BNF-P0014 -> tax_free_benefit`
- `BNF-G001 household_service_benefit -> BNF-P0015 -> taxable_benefit`
- `BNF-H001 employer_paid_parking_fine -> BNF-P0017 -> taxable_cash_compensation`
- `BNF-H002 employer_paid_control_fee_or_private_penalty -> BNF-P0018 -> taxable_cash_compensation_or_owner_private`
- `BNF-Z001 unclear_or_unsupported -> BNF-P0016 -> blocked`

## Tvingande dokument- eller indataregler

Every benefit case must at least include:
- `employeeId`
- `benefitFamily`
- `sourceArtifactRef`
- `benefitPeriod`
- `classificationReason`
- `ownershipDecision`
- `valuationMode`
- `valuationSourceRef`
- `reviewReceiptRef` when review required

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `BNF-R001 taxable_car`
- `BNF-R002 taxable_fuel`
- `BNF-R003 taxable_meal`
- `BNF-R004 tax_free_personalvard`
- `BNF-R005 tax_free_work_equipment`
- `BNF-R006 tax_free_work_clothing`
- `BNF-R007 taxable_parking`
- `BNF-R008 taxable_congestion_tax`
- `BNF-R009 taxable_housing`
- `BNF-R010 taxable_loan`
- `BNF-R011 tax_free_gift`
- `BNF-R012 taxable_gift`
- `BNF-R013 taxable_healthcare`
- `BNF-R014 tax_free_healthcare`
- `BNF-R015 taxable_household_service`
- `BNF-R016 employer_paid_parking_fine_not_benefit`
- `BNF-R017 employer_paid_private_penalty_not_benefit`
- `BNF-R018 blocked_unclear_benefit`

## Bindande faltspec eller inputspec per profil

### Car benefit profile

- car identity
- private-use evidence
- value-year reference

### Fuel benefit profile

- vehicle ref
- private fuel usage basis
- cost evidence

### Friskvard / personalvard profile

- offered to all employees rule
- non-cash rule
- annual value or activity value

### Work equipment profile

- essential-för-work flag
- limited-value flag
- inseparable-from-employment-benefit flag

### Gift profile

- gift type
- cash or cash-equivalent flag
- occasion
- value

## Scenariofamiljer som hela systemet måste tacka

- taxable car and fuel
- taxable meal
- tax-free personalvard
- tax-free work equipment
- tax-free work clothing
- taxable parking and congestion tax
- taxable housing and loan
- gifts taxable and tax-free
- healthcare taxable and tax-free
- household-service benefit
- employer-paid fines, control fees and other personal penalties rerouted away from benefit green path
- blocked unclear benefit

## Scenarioregler per familj

- bilforman requires private-use threshold analysis
- drivmedelsforman only on private use paid by employer
- friskvard över official thresholds becomes taxable
- work equipment reimbursed in cash is not tax-free work-equipment benefit
- cash gifts are always taxable
- free parking för private car is taxable when market value exists
- if surrounding parking has zero market value, taxable value may be zero only with evidence
- congestion tax benefit follows private-travel logic
- employer-paid parkeringsbot or kontrollavgift is not a skattefri benefit and is not a normal business cost; classify as taxable cash compensation or owner/private according to payer/beneficiary boundary
- employee-personal fees that are not true benefit families must reroute out of benefit flow

## Blockerande valideringar

- deny green classification if benefit family remains `other` without explicit approved policy
- deny tax-free work equipment if any of the three statutory tests fail
- deny tax-free gift if cash-equivalent flag is true
- deny tax-free friskvard if value or activity exceeds official rule set
- deny payroll handoff if valuation source missing för taxable benefit
- deny auto-classification if private/business split is unresolved
- deny benefit-green path för `penalty_or_private_fee`

## Rapport- och exportkonsekvenser

- payroll and AGI traces must show benefit family and taxable value
- tax-free cases must still retain evidence and reason code
- migration export must preserve benefit ownership and valuation lineage

## Förbjudna förenklingar

- all company-paid employee expenses = benefit
- all benefits = taxable
- all receipts with private-looking merchant = taxable benefit
- payroll auto-creating duplicate cost för upstream-booked benefit
- manual free-text taxable value without evidence

## Fler bindande proof-ledger-regler för specialfall

- if receipt already booked car lease or fuel cost, payroll may only take benefit value handoff
- if employee reimburses employer för benefit, reduction logic must be explicit and evidenced
- mixed business/private travel may require blocked review, not blind taxable full amount

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `BNF-P0001-BNF-P0015`
  - create benefit handoff to payroll
  - no direct payroll cost creation unless ownership policy explicitly says `payroll_owned_cost`

- `BNF-P0016`
  - blocked review
  - no payroll handoff

## Bindande verifikations-, serie- och exportregler

- benefit cases and valuation snapshots must be exportable with:
  - `benefitCaseId`
  - `benefitFamily`
  - `taxability`
  - `valuationSourceRef`
  - `ownershipDecision`

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- taxable vs tax-free
- company-paid vs reimbursed vs employee-paid
- upstream-booked cost vs payroll-owned cost
- annual schablon vs market value vs actual cost
- private-use clear vs unresolved

## Bindande fixture-klasser för förmåner

- `BNF-FXT-001` car benefit
- `BNF-FXT-002` fuel benefit
- `BNF-FXT-003` meal benefit
- `BNF-FXT-004` friskvard
- `BNF-FXT-005` work equipment
- `BNF-FXT-006` gift
- `BNF-FXT-007` parking/congestion
- `BNF-FXT-008` housing/loan
- `BNF-FXT-009` healthcare

## Bindande expected outcome-format per scenario

Every scenario must include:
- `scenarioId`
- `benefitFamily`
- `taxability`
- `ownershipDecision`
- `valuationMode`
- `expectedTaxableValue`
- `expectedBlockedOrAllowedStatus`

## Bindande canonical verifikationsseriepolicy

- benefit valuation receipts belong to payroll/benefit evidence series
- imported historical benefits must be tagged as imported and never masquerade as native live benefit decisions

## Bindande expected outcome per central scenariofamilj

- `BNF-A001`
  - taxable car benefit
  - payroll handoff required
  - upstream-owned cost by default

- `BNF-B001`
  - tax-free personalvard
  - payroll handoff with taxable value zero or no payroll handoff according to implementation path

- `BNF-B002`
  - tax-free work equipment
  - blocked if cash reimbursement instead of direct employer-provided equipment

- `BNF-E001`
  - tax-free gift only if official conditions met

- `BNF-Z001`
  - blocked

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- all `BNF-A*` -> taxable benefit handoff
- all `BNF-B*` -> tax-free evidence path
- all `BNF-C*` -> parking/congestion taxable path
- all `BNF-D*` -> housing/loan taxable path
- all `BNF-E*` -> gift path taxable or tax-free
- all `BNF-F*` -> healthcare path taxable or tax-free
- all `BNF-G*` -> household-service taxable path
- all `BNF-H*` -> rerouted non-benefit personal-liability path
- all `BNF-Z*` -> blocked

## Bindande testkrav

- unit tests för benefit family classification
- unit tests för work equipment three-test rule
- unit tests för personalvard/friskvard tax-free thresholds
- unit tests för cash gift block
- unit tests för no-double-booking ownership policy
- unit tests för parking fine and control-fee reroute
- integration tests för receipt/AP -> benefit -> payroll handoff
- migration tests för historical benefit import

## Källor som styr dokumentet

- `DOMAIN_10_ROADMAP.md`
- `DOMAIN_10_IMPLEMENTATION_LIBRARY.md`
- `KVITTOFLODET_BINDANDE_SANNING.md`
- `LONEFLODET_BINDANDE_SANNING.md`
- `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md`
- `packages/domain-payroll/src/index.mjs`
- `tests/unit/phase12-benefits-travel-hardening.test.mjs`
- [Skatteverket: Förmåner](https://skatteverket.se/foretag/arbetsgivare/lonochersattning/formaner.4.3810a01c150939e893f8557.html)
- [Skatteverket: Bilforman](https://www.skatteverket.se/foretag/arbetsgivare/lonochersattning/formaner/bilforman.4.3016b5d91791bf546791919.html)
- [Skatteverket: Drivmedelsforman](https://skatteverket.se/foretag/arbetsgivare/lonochersattning/formaner/bilforman/drivmedelsforman.4.3016b5d91791bf546791a89.html)
- [Skatteverket: Kostforman](https://www.skatteverket.se/foretag/arbetsgivare/lonochersattning/formaner/kostforman.4.3016b5d91791bf546791816.html)
- [Skatteverket: Parkering och garageplats](https://www.skatteverket.se/foretag/arbetsgivare/lonochersattning/formaner/bilforman/parkeringochgarageplats.4.3016b5d91791bf546791a2c.html)
- [Skatteverket: Min arbetsgivare har betalat parkeringsboter för mig - ska jag skatta för detta](https://www.skatteverket.se/privat/etjansterochblanketter/svarpavanligafragor/inkomstavtjanst/privattjansteinkomsterfaq/minarbetsgivareharbetalatparkeringsboterformigskajagskattafordetta.5.5fc8c94513259a4ba1d800022701.html)
- [Skatteverket: Personalvardsforman, motion och friskvard](https://www.skatteverket.se/foretag/arbetsgivare/lonochersattning/formaner/personalvardsformanmotionochfriskvard.4.3016b5d91791bf546791431.html)
- [Skatteverket: Arbetsredskap](https://www.skatteverket.se/foretag/arbetsgivare/lonochersattning/formaner/arbetsredskap.4.3016b5d91791bf546791ad4.html)
- [Skatteverket: Arbetsklader](https://skatteverket.se/foretag/arbetsgivare/lonochersattning/formaner/arbetsklader.4.3016b5d91791bf546791ac2.html)
- [Skatteverket: Rabatt, bonus och förmånliga lan](https://www.skatteverket.se/foretag/arbetsgivare/lonochersattning/formaner/rabattbonusochformanligalan.4.3016b5d91791bf5467913ee.html)
- [Skatteverket: SKV 401](https://www.skatteverket.se/download/18.262c54c219391f2e9634df4/1736339078938/skatteavdrag-och-arbetsgivaravgifter-skv401-utgava30.pdf)
