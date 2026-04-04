# PENSION_OCH_LONEVAXLING_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för tjänstepensionspremier, pensionskostnader och lönevaxling i svensk payroll.

Detta dokument ska styra:
- kollektiv och individuell pensionspremie
- salary exchange / lönevaxling
- arbetsgivarens extra pensionstillagg vid lönevaxling when policy applies
- sarskild löneskatt på pensionskostnader
- blocked pension paths that do not have proper legal or accounting support

## Syfte

Detta dokument finns för att:
- pension inte ska blandas ihop med vanlig lön eller benefit
- lönevaxling aldrig ska bokas som vanligt nettolonavdrag
- för lag lön efter lönevaxling ska blockeras
- pensionspremie, salary exchange och sarskild löneskatt ska ha entydiga handoff- och bokföringsankare

## Omfattning

Detta dokument omfattar:
- tjänstepensionspremier
- salary exchange / lönevaxling
- employer top-up policy on salary exchange
- special payroll tax on pension costs
- direct insured pension premium paths
- blocked direct-pension-like or unsupported setups

Detta dokument omfattar inte:
- allman pension
- final income-tax calculation on pension payouts
- pension provider file formats
- detailed collective agreement contribution engines

## Absoluta principer

- pensionspremie får aldrig modelleras som vanlig lön
- lönevaxling är ett bruttoloneavdrag plus separat pensionspremie, inte ett nettolonavdrag
- lönevaxling får aldrig tillatas om lön efter vaxling understiger official safe threshold policy
- special löneskatt på pensionskostnader måste vara egen decision path
- employer top-up on salary exchange is product policy, not legal default; if used, it must be explicit and evidenced
- unsupported pension setups får aldrig grönmarkeras

## Bindande dokumenthierarki för pension och lönevaxling

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
- Skatteverkets regler om pensionskostnader och sarskild löneskatt
- Pensionsmyndighetens officiella vägledning om lönevaxling

## Kanoniska objekt

- `PensionArrangement`
- `PensionPremiumDecision`
- `SalaryExchangeAgreement`
- `SalaryExchangeTopUpPolicy`
- `PensionPayrollHandoff`
- `SpecialPayrollTaxOnPensionDecision`
- `UnsupportedPensionCase`

## Kanoniska state machines

### `PensionArrangement`

- `draft`
- `approved`
- `active`
- `superseded`
- `terminated`

### `SalaryExchangeAgreement`

- `draft`
- `review_pending`
- `approved`
- `active`
- `paused`
- `terminated`

### `PensionPayrollHandoff`

- `draft`
- `ready`
- `consumed`
- `superseded`

## Kanoniska commands

- `RegisterPensionArrangement`
- `ApprovePensionArrangement`
- `CreateSalaryExchangeAgreement`
- `ApproveSalaryExchangeAgreement`
- `CreatePensionPayrollHandoff`
- `CreateSpecialPayrollTaxOnPensionDecision`
- `BlockUnsupportedPensionCase`

## Kanoniska events

- `PensionArrangementRegistered`
- `PensionArrangementApproved`
- `SalaryExchangeAgreementApproved`
- `PensionPayrollHandoffCreated`
- `SpecialPayrollTaxOnPensionDecisionCreated`
- `UnsupportedPensionCaseBlocked`

## Kanoniska route-familjer

- `/v1/payroll/pension/*`
- `/v1/payroll/salary-exchange/*`

## Kanoniska permissions och review boundaries

- `payroll.pension.manage`
- `payroll.pension.approve`
- `payroll.salary_exchange.manage`
- `payroll.salary_exchange.approve`

Review boundaries:
- new salary exchange agreements require payroll + finance review
- unsupported or nonstandard pension structures require finance review

## Nummer-, serie-, referens- och identitetsregler

- every `PensionArrangement` must have immutable `pensionArrangementId`
- every salary exchange agreement must have immutable `salaryExchangeAgreementId`
- one employee may not have conflicting active salary exchange agreements för the same effective period

## Valuta-, avrundnings- och omräkningsregler

- pension premiums and salary exchange values are stored in `SEK`
- annual or monthly provider references must carry source period and source ref

## Replay-, correction-, recovery- och cutover-regler

- replay must use original pension arrangement and salary exchange agreement
- correction creates new pension handoff, never mutates consumed handoff
- imported historical pension data must map to canonical pension families before live use

## Huvudflödet

1. pension arrangement or salary exchange agreement is approved
2. payroll line classification resolves gross deduction vs pension premium
3. special payroll tax on pension costs is resolved
4. pension payroll handoff is created
5. payroll consumes handoff and posts according to payroll account truth

## Bindande scenarioaxlar

- `pensionFamily`
  - `collective_premium`
  - `individual_premium`
  - `salary_exchange_premium`
  - `salary_exchange_top_up`
  - `special_payroll_tax`
  - `unsupported_pension_case`

- `ownership`
  - `employer_paid`
  - `salary_exchange`

- `taxTreatment`
  - `not_employee_cash_salary`
  - `special_payroll_tax_only`

## Bindande policykartor

### Salary exchange threshold policy 2026

- employee salary after exchange must not go below `56 050 SEK` per month
- if below threshold:
  - salary exchange must be blocked

### Special payroll tax baseline

- special payroll tax on pension costs: `24.26%`

### Employer top-up policy

- employer may choose to top up by the differential between employer contributions and special payroll tax
- this is explicit product policy only
- no default top-up without approved policy

## Bindande canonical proof-ledger med exakta konton eller faltutfall

### PEN-P0001 Collective pension premium

- `pensionFamily = collective_premium`
- payroll account mapping owned by payroll account truth

### PEN-P0002 Individual pension premium

- `pensionFamily = individual_premium`

### PEN-P0003 Salary exchange gross deduction

- `pensionFamily = salary_exchange_premium`
- paired with gross salary deduction in payroll account truth

### PEN-P0004 Salary exchange top-up

- `pensionFamily = salary_exchange_top_up`
- only if explicit policy exists

### PEN-P0005 Special payroll tax on pension cost

- `pensionFamily = special_payroll_tax`
- rate `24.26%`

### PEN-P0006 Blocked salary exchange below threshold

- blocked

### PEN-P0007 Unsupported pension structure

- blocked

## Bindande rapport-, export- och myndighetsmappning

- every pension handoff must publish:
  - `pensionFamily`
  - `salaryExchangeFlag`
  - `premiumAmount`
  - `specialPayrollTaxAmount`
  - `topUpAmount`
  - `arrangementRef`

## Bindande scenariofamilj till proof-ledger och rapportspar

- `PEN-A001 collective_premium -> PEN-P0001`
- `PEN-A002 individual_premium -> PEN-P0002`
- `PEN-B001 salary_exchange -> PEN-P0003`
- `PEN-B002 salary_exchange_with_top_up -> PEN-P0004`
- `PEN-C001 special_payroll_tax -> PEN-P0005`
- `PEN-Z001 below_threshold_or_unsupported -> PEN-P0006_or_P0007`

## Tvingande dokument- eller indataregler

Every active pension arrangement or salary exchange agreement must include:
- `employeeId`
- `effectiveFrom`
- `effectiveTo` when relevant
- `pensionFamily`
- `arrangementRef`
- `reviewReceiptRef`

Salary exchange agreement must also include:
- `grossDeductionAmount`
- `salaryAfterExchangeCheck`
- `topUpPolicyRef` when top-up exists

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `PEN-R001 collective_premium`
- `PEN-R002 individual_premium`
- `PEN-R003 salary_exchange`
- `PEN-R004 salary_exchange_top_up`
- `PEN-R005 special_payroll_tax`
- `PEN-R006 blocked_below_threshold`
- `PEN-R007 blocked_unsupported_pension`

## Bindande faltspec eller inputspec per profil

### Collective premium profile

- arrangement type
- premium amount or basis

### Individual premium profile

- arrangement type
- premium amount

### Salary exchange profile

- exchange amount
- post-exchange salary
- agreement ref

## Scenariofamiljer som hela systemet måste tacka

- collective premium
- individual premium
- salary exchange
- salary exchange with top-up
- special payroll tax on pension cost
- blocked below-threshold salary exchange
- blocked unsupported pension case

## Scenarioregler per familj

- collective and individual premium are employer-side pension costs
- salary exchange is gross deduction plus pension premium, never net deduction
- special payroll tax is separate from ordinary employer contributions
- below-threshold exchange blocks

## Blockerande valideringar

- deny salary exchange if post-exchange salary below threshold
- deny top-up if policy missing
- deny pension handoff if arrangement ref missing
- deny unsupported pension structures from green path

## Rapport- och exportkonsekvenser

- payroll traces must show salary exchange separately from ordinary deductions
- pension exports must preserve arrangement and top-up policy refs

## Förbjudna förenklingar

- treating salary exchange as net deduction
- auto top-up without policy
- folding special payroll tax into employer contribution rate

## Fler bindande proof-ledger-regler för specialfall

- correction of salary exchange must preserve original agreement and effective period
- paused or terminated salary exchange may not continue to generate premiums

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `PEN-P0001-PEN-P0005`
  - create pension payroll handoff

- `PEN-P0006-PEN-P0007`
  - blocked

## Bindande verifikations-, serie- och exportregler

- pension handoffs must export:
  - `pensionArrangementId`
  - `salaryExchangeAgreementId` when relevant
  - `pensionFamily`
  - `premiumAmount`
  - `specialPayrollTaxAmount`

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- collective vs individual
- employer-paid vs salary exchange
- with top-up vs without top-up
- above threshold vs below threshold

## Bindande fixture-klasser för pension

- `PEN-FXT-001` collective premium
- `PEN-FXT-002` individual premium
- `PEN-FXT-003` salary exchange
- `PEN-FXT-004` salary exchange top-up
- `PEN-FXT-005` special payroll tax

## Bindande expected outcome-format per scenario

Every scenario must include:
- `scenarioId`
- `pensionFamily`
- `premiumAmount`
- `topUpAmount`
- `specialPayrollTaxAmount`
- `expectedBlockedOrAllowedStatus`

## Bindande canonical verifikationsseriepolicy

- pension and salary exchange receipts belong to payroll/pension evidence series
- imported historical pension arrangements must be tagged as imported

## Bindande expected outcome per central scenariofamilj

- `PEN-A001`
  - premium handoff created
  - allowed

- `PEN-B001`
  - gross deduction + premium handoff
  - allowed only above threshold

- `PEN-C001`
  - special payroll tax computed separately

- `PEN-Z001`
  - blocked

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- all `PEN-A*` -> premium path
- all `PEN-B*` -> salary exchange path
- all `PEN-C*` -> special payroll tax path
- all `PEN-Z*` -> blocked

## Bindande testkrav

- unit tests för salary exchange threshold
- unit tests för top-up policy
- unit tests för separate special payroll tax
- integration tests för pension/salary exchange handoff
- migration tests för historical pension arrangements

## Källor som styr dokumentet

- `DOMAIN_10_ROADMAP.md`
- `DOMAIN_10_IMPLEMENTATION_LIBRARY.md`
- `LONEFLODET_BINDANDE_SANNING.md`
- `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md`
- `tests/unit/phase12-pension-salary-exchange-hardening.test.mjs`
- [Pensionsmyndigheten: Eget sparande till din pension - lönevaxling](https://www.pensionsmyndigheten.se/forsta-din-pension/sa-fungerar-pensionen/eget-sparande-till-din-pension)
- [Skatteverket: 2026 belopp och procent](https://skatteverket.se/privat/skatter/beloppochprocent/2026.4.1522bf3f19aea8075ba21.html)
- [Skatteverket: Arbetsgivares pensionskostnader och personalstiftelser](https://www.skatteverket.se/download/18.18e1b10334ebe8bc8000114427/kap11.pdf)
- [Skatteverket: Sarskild löneskatt på pensionskostnader](https://www.skatteverket.se/download/18.18e1b10334ebe8bc8000114983/1708608353172/kap12.pdf)
