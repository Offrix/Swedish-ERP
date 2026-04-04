# LÖNEARTER_OCH_LONEKONTON_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för hela katalogen av lönearter, line effect-klasser och BAS-mappningen för payroll.

Detta dokument ska styra:
- canonical pay item catalog
- gross addition, gross deduction, net deduction, reimbursement och reporting-only-klasser
- BAS-kostnadskonton för lön och lönenara ersättningar
- BAS-skuldkonton och fordringskonton för löneeffekter
- löneartsflaggor för skatt, arbetsgivaravgift, semestergrundande lön, pensionsgrundande lön och AGI-anchor
- blocked free-form accounts och blocked ad hoc lönearter

Ingen kod, inget test, ingen UI-form, ingen importkedja, ingen payslip renderer och ingen posting-bundle får definiera avvikande truth för lönearter och lönekonton utan att detta dokument skrivs om först.

## Syfte

Detta dokument finns för att läsaren ska kunna bygga payroll line classification och payroll posting utan att gissa:
- vilken löneart som är tillaten
- vilken line effect en löneart har
- vilket BAS-konto som är canonical default för en löneart
- när kostnad ska uppsta, när skuld ska uppsta och när payroll inte får skapa egen kostnad
- hur bruttoloneavdrag skiljs från nettoloneavdrag
- hur reserakningar, benefits, pensioner, utmatning och employee receivable binds till rätt kontoankare

## Omfattning

Detta dokument omfattar:
- canonical pay item catalog för svensk payroll
- default BAS-konton och konto-familjer per löneartsfamilj
- canonical liability anchors
- canonical deduction anchors
- canonical employee receivable anchors
- canonical accrued payroll anchors
- basis flags för tax, employer contribution, semester och pension
- blocked coarse mappings och blocked placeholder accounts

Detta dokument omfattar inte:
- tax rate calculation
- employer contribution rate calculation
- final AGI field mapping
- benefit valuation amounts
- travel policy rates
- pension agreement content
- sickness- och semesterberakning i sig
- payout file format

Kanonisk agarskapsregel:
- detta dokument äger exakt vilken löneart som får ge vilken kontoeffekt
- `LONEFLODET_BINDANDE_SANNING.md` äger pay run, payslip, correction och final pay runtime
- kommande skatt-, avgifts-, benefits-, travel-, pension-, sjuk- och semesterbiblar äger respektive beslutsmotor men får inte ersätta kontoankarna har
- `BAS_LONEKONTOPOLICY_BINDANDE_SANNING.md` kommer senare agera central produktpolicy för kontoplan-override, men tills dess är detta dokument bindande payrollspecifik kontosanning

## Absoluta principer

- varje `PayRunLine` måste ha exakt en canonical `payItemCode`
- varje `payItemCode` måste ha exakt en canonical `lineEffectClass`
- varje `payItemCode` måste ha exakt en canonical default `costAccountNumber` eller explicit `no_direct_payroll_cost_posting`
- varje `payItemCode` måste ha exakt en canonical `liabilityAccountNumber`, `deductionAccountNumber` eller explicit downstream owner
- fri inmatning av BAS-konto i live payroll är förbjuden
- `manual_account_override` får inte vara normal live-vag
- bruttoloneavdrag får aldrig bokföras som nettolonavdrag
- taxable benefit får aldrig dubbelbokas som ny kostnad i payroll om kostnaden redan är bokad i upstream flow; canonical taxability, valuation och ownership för benefitfallet ägs av `FORMANER_OCH_FORMANSBESKATTNING_BINDANDE_SANNING.md`
- expense reimbursement får aldrig skapa ny kostnad i payroll när kostnaden redan är bokad via receipt eller outlay truth
- `GARNISHMENT` får aldrig använda generiskt konto för övriga löneavdrag
- employee receivable får aldrig ligga kvar på generiskt `1300` om canonical konto är mer precis
- unsupported löneart får aldrig mappas till `7090` eller annat restkonto i live path

## Bindande dokumenthierarki för lönearter och lönekonton

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
- `FORMANER_OCH_FORMANSBESKATTNING_BINDANDE_SANNING.md`
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md`
- `PERIODISERING_OCH_BOKSLUTSOMFORINGAR_BINDANDE_SANNING.md`
- BAS-kontoplanen och BAS stödmaterial
- Skatteverkets arbetsgivarvägledning och AGI-vägledning

Detta dokument får inte overstyras av:
- nuvarande `resolveDefaultLedgerAccountCode` i runtime
- gamla grova mappingar till `7090`, `7290`, `7310`, `7330` eller `2790`
- gamla `agi_mapping_code` bucket-koder
- gamla seeds eller demo-lönearter

## Kanoniska objekt

- `PayItemCatalogEntry`
  - canonical löneart med kod, display name, line effect class och basis flags

- `PayrollLineEffectClass`
  - sluten klassificering:
    - `gross_addition`
    - `gross_deduction`
    - `net_deduction`
    - `reporting_only`
    - `reimbursement_clearing`
    - `liability_only`

- `PayrollAccountProfile`
  - binder `payItemCode`, employee remuneration profile och default konton

- `PayrollLiabilityAnchor`
  - anger vilket skuldkonto eller fordringskonto payroll line ska landa på

- `PayrollBasisProfile`
  - anger om lönearten är skattepliktig, avgiftspliktig, semestergrundande och pensionsgrundande

- `PayrollAgiAnchor`
  - anger vilken AGI-ankarklass lönearten tillhor innan full fältmappning sker

- `PayrollAccrualAnchor`
  - anger vilka konton som ska användas för upplupna löner, semesterloneskuld och upplupna avgifter

## Kanoniska state machines

### `PayItemCatalogEntry`

- `draft`
- `approved`
- `active`
- `superseded`
- `retired`

### `PayrollAccountProfile`

- `draft`
- `approved`
- `active`
- `superseded`

### `PayrollBasisProfile`

- `draft`
- `approved`
- `active`
- `superseded`

## Kanoniska commands

- `RegisterPayItemCatalogEntry`
- `ApprovePayItemCatalogEntry`
- `ActivatePayItemCatalogEntry`
- `RegisterPayrollAccountProfile`
- `ApprovePayrollAccountProfile`
- `AssignPayItemToAccountProfile`
- `SupersedePayItemCatalogEntry`
- `RetirePayItemCatalogEntry`

## Kanoniska events

- `PayItemCatalogEntryRegistered`
- `PayItemCatalogEntryApproved`
- `PayItemCatalogEntryActivated`
- `PayrollAccountProfileApproved`
- `PayItemAccountProfileAssigned`
- `PayItemCatalogEntrySuperseded`

## Kanoniska route-familjer

- `/v1/payroll/pay-items/*`
- `/v1/payroll/posting-profiles/*`
- `/v1/payroll/account-profiles/*`

Förbjudna route-monster:
- fri patch av konto per enskild live-payrunline
- UI-vag som skapar ny löneart utan approval
- generic route som låter operator skriva in valfritt BAS-konto

## Kanoniska permissions och review boundaries

- `payroll.pay_item.read`
- `payroll.pay_item.manage`
- `payroll.pay_item.approve`
- `payroll.posting_profile.manage`
- `payroll.posting_profile.approve`

Review boundaries:
- ny löneart krav er payroll + finance review
- ny kontoankare krav er finance review
- byte av canonical konto på aktiv löneart krav er supersession, aldrig overwrite

## Nummer-, serie-, referens- och identitetsregler

- varje `payItemCode` är immutable
- varje `PayrollAccountProfile` måste ha immutable `accountProfileCode`
- samma `payItemCode` får inte vara aktivt i mer an en aktiv profil per employee remuneration profile och effective period
- pay item versioning måste vara effective-dated

## Valuta-, avrundnings- och omräkningsregler

- canonical postingvaluta är `SEK`
- line classification sker före valutahantering; foreign source amounts måste vara omräknade innan löneartspost skapas
- rounding till ore sker före posting-bundle build

## Replay-, correction-, recovery- och cutover-regler

- postingmappning måste replayas från `payItemCode`, `employeeRemunerationProfile` och effective-dated `PayrollAccountProfile`
- correction får aldrig läsa dagens konto om historisk effective profile gallde vid ursprungsrun
- migration av gamla lönearter måste mappas till canonical `payItemCode` innan live cutover
- retiread löneart får inte användas i ny live run men måste kunna replayas historiskt

## Huvudflödet

1. en canonical `PayItemCatalogEntry` skapas, granskas och aktiveras
2. lönearten binds till exakt en `PayrollLineEffectClass`
3. lönearten binds till exakt en `PayrollBasisProfile`
4. lönearten binds till exakt en `PayrollAgiAnchor`
5. lönearten binds till exakt en eller flera effective-dated `PayrollAccountProfile` per remuneration profile
6. pay run-motorn skapar `PayRunLine` med `payItemCode`, basis flags, amount och remuneration profile
7. posting resolution slar upp canonical profile och bygger deterministic journal bundle
8. downstream AGI-, payout-, receivable-, garnishment- och accrual-lager får bara konsumera de redan lasta anchorsen

Huvudflödet får aldrig hoppas över genom:
- fritextkonto i UI
- ad hoc löneart utan approval
- generisk fallback till `7090`, `7290`, `7310`, `7330` eller `2790`
- import av legacy löneart som inte först mappas till canonical `payItemCode`

## Bindande scenarioaxlar

Varje lönearts- och lönekontoscenario måste korsas mot dessa axlar:

- `employeeRemunerationProfile`
  - `collective_domestic`
  - `collective_foreign`
  - `salaried_domestic`
  - `executive_domestic`
  - `salaried_or_executive_foreign`
  - `board_member`

- `lineEffectClass`
  - `gross_addition`
  - `gross_deduction`
  - `net_deduction`
  - `reporting_only`
  - `reimbursement_clearing`
  - `liability_only`

- `taxBasis`
  - `taxable_cash`
  - `taxable_benefit`
  - `tax_free_reimbursement`
  - `not_taxable`

- `employerContributionBasis`
  - `full_basis`
  - `benefit_basis`
  - `cost_allowance_basis`
  - `not_contribution_basis`

- `workPatternFamily`
  - `worked_time`
  - `non_worked_time`
  - `travel`
  - `benefit`
  - `pension`
  - `deduction`
  - `accrual_only`

- `costOwnership`
  - `payroll_owned_cost`
  - `upstream_cost_already_booked`
  - `no_cost_posting_allowed`

- `settlementFamily`
  - `normal_cash_pay`
  - `cashless_taxable`
  - `deduct_from_net`
  - `settle_existing_liability`
  - `settle_existing_receivable`
  - `accrual_only`

## Bindande policykartor

### Canonical remuneration profile till kostnadskontofamilj

- `collective_domestic`
  - worked-time gross lön: `7010`
  - sick pay: `7081`
  - vacation pay: `7082`
  - parental compensation: `7083`
  - vacation liability delta: `7090`
  - gross salary deduction: `7018`
  - accrued wage anchor: `7019`

- `collective_foreign`
  - worked-time gross lön: `7030`
  - severance: `7037`
  - gross salary deduction: `7038`
  - accrued wage anchor: `7039`

- `salaried_domestic`
  - worked-time gross lön: `7210`
  - gross salary deduction: `7218`
  - accrued wage anchor: `7219`
  - sick pay: `7281`
  - vacation pay: `7285`
  - parental compensation: `7283`
  - vacation liability delta: `7291`

- `executive_domestic`
  - worked-time gross lön: `7220`
  - tantiem: `7222`
  - gross salary deduction: `7228`
  - accrued wage anchor: `7229`
  - sick pay: `7282`
  - vacation pay: `7286`
  - parental compensation: `7284`
  - vacation liability delta: `7292`

- `salaried_or_executive_foreign`
  - worked-time gross lön: `7230`
  - gross salary deduction: `7238`
  - accrued wage anchor: `7239`

- `board_member`
  - board fee: `7240`
  - tantiem/gratification liability anchor: `2823`

### Canonical liability och receivable anchors

- cash payroll liability: `2821`
- travel- och reimbursement liability: `2822`
- tantiem/gratification liability: `2823`
- other employee short-term liability: `2829`
- employee travel advance receivable: `1611`
- employee cash advance receivable: `1612`
- employee temporary loan receivable: `1614`
- employee other receivable / negative net carry-forward: `1619`
- personnel tax withheld: `2710`
- statutory social charges liability: `2731`
- special payroll tax liability: `2732`
- agreed social charges / pension premium liability: `2740`
- garnishment liability: `2750`
- union-fee-like net deduction liability: `2794`
- generic other net deduction liability: `2790`
- accrued wage liability: `2910`
- accrued vacation pay liability: `2920`
- accrued statutory social charge liability: `2941`

### Canonical extra ersättnings- och förmånskonton

- generic cash extra compensation: `7310`
- tax-free domestic travel allowance: `7321`
- taxable domestic travel allowance: `7322`
- tax-free foreign travel allowance: `7323`
- taxable foreign travel allowance: `7324`
- tax-free mileage: `7331`
- taxable mileage: `7332`
- benefit meal cost anchor: `7382`
- benefit car cost anchor: `7385`
- other benefit cost anchor: `7389`
- congestion-tax benefit cost anchor: `7391`
- household-service benefit cost anchor: `7392`
- collective pension premium cost: `7411`
- individual pension premium cost: `7412`
- employer contribution on cash salary: `7511`
- employer contribution on benefit values: `7512`
- employer contribution on taxable cost allowances: `7515`
- employer contribution on gross salary deductions: `7518`
- employer contribution on vacation and wage liabilities: `7519`
- special payroll tax on pension cost: `7533`
- labour-market insurance premium: `7571`

### Canonical ownership boundaries

- `BENEFIT_*` har default `no_direct_payroll_cost_posting` om den underliggande kostnaden redan är bokad i benefit-, vehicle-, receipt- eller AP-sanning
- `EXPENSE_REIMBURSEMENT_CLEARING` har alltid default `reimbursement_clearing`; den får inte skapa ny kostnad i payroll
- `TRAVEL_ALLOWANCE_*` och `MILEAGE_*` är payroll-owned cost lines om de inte redan bokats upstream som annan legal truth
- `NET_DEDUCTION_*`, `GARNISHMENT`, `UNION_FEE`, `RECLAIM_OFFSET` och `ADVANCE_OFFSET` är aldrig kostnadslinjer

## Bindande canonical proof-ledger med exakta konton eller faltutfall

### LAK-P0001 Monthly salary, collective domestic

- debit `7010`
- credit `2821`
- effect class: `gross_addition`
- basis:
  - taxable
  - employer contribution basis
  - vacation basis according to upstream leave/agreement truth

### LAK-P0002 Monthly salary, salaried domestic

- debit `7210`
- credit `2821`

### LAK-P0003 Monthly salary, executive domestic

- debit `7220`
- credit `2821`

### LAK-P0004 Monthly salary, foreign salaried/executive

- debit `7230`
- credit `2821`

### LAK-P0005 Board fee / styrelsearvode

- debit `7240`
- credit `2823`

### LAK-P0006 Sick pay, collective domestic

- debit `7081`
- credit `2821`

### LAK-P0007 Sick pay, salaried domestic

- debit `7281`
- credit `2821`

### LAK-P0008 Sick pay, executive domestic

- debit `7282`
- credit `2821`

### LAK-P0009 Vacation pay, collective domestic

- debit `7082`
- credit `2821`

### LAK-P0010 Vacation pay, salaried domestic

- debit `7285`
- credit `2821`

### LAK-P0011 Vacation pay, executive domestic

- debit `7286`
- credit `2821`

### LAK-P0012 Parental compensation, collective domestic

- debit `7083`
- credit `2821`

### LAK-P0013 Parental compensation, salaried domestic

- debit `7283`
- credit `2821`

### LAK-P0014 Parental compensation, executive domestic

- debit `7284`
- credit `2821`

### LAK-P0015 Vinstandel / bonus, collective domestic

- debit `7012`
- credit `2821`

### LAK-P0016 Vinstandel / bonus, salaried domestic

- debit `7212`
- credit `2821`

### LAK-P0017 Tantiem to executive

- debit `7222`
- credit `2823`

### LAK-P0018 Gross salary deduction, collective domestic

- debit `2821`
- credit `7018`

### LAK-P0019 Gross salary deduction, salaried domestic

- debit `2821`
- credit `7218`

### LAK-P0020 Gross salary deduction, executive domestic

- debit `2821`
- credit `7228`

### LAK-P0021 Gross salary deduction, foreign employee

- debit `2821`
- credit `7238`

### LAK-P0022 Tax-free domestic travel allowance

- debit `7321`
- credit `2821`

### LAK-P0023 Taxable domestic travel allowance

- debit `7322`
- credit `2821`

### LAK-P0024 Tax-free foreign travel allowance

- debit `7323`
- credit `2821`

### LAK-P0025 Taxable foreign travel allowance

- debit `7324`
- credit `2821`

### LAK-P0026 Tax-free mileage reimbursement

- debit `7331`
- credit `2821`

### LAK-P0027 Taxable mileage reimbursement

- debit `7332`
- credit `2821`

### LAK-P0028 Payroll-owned cash extra compensation

- debit `7310`
- credit `2821`

### LAK-P0029 Expense reimbursement clearing from receipt/outlay truth

- debit `2822`
- credit `2821`
- direct payroll cost posting: forbidden

### LAK-P0030 Prelim tax withholding

- debit `2821`
- credit `2710`

### LAK-P0031 Generic net deduction

- debit `2821`
- credit `2790`

### LAK-P0032 Union fee

- debit `2821`
- credit `2794`

### LAK-P0033 Garnishment

- debit `2821`
- credit `2750`

### LAK-P0034 Employee receivable offset

- debit `2821`
- credit `1619`

### LAK-P0035 Travel advance offset

- debit `2821`
- credit `1611`

### LAK-P0036 Cash advance offset

- debit `2821`
- credit `1612`

### LAK-P0037 Temporary employee loan offset

- debit `2821`
- credit `1614`

### LAK-P0038 Employer contribution on cash salary

- debit `7511`
- credit `2731`

### LAK-P0039 Employer contribution on benefit value

- debit `7512`
- credit `2731`

### LAK-P0040 Employer contribution on taxable cost allowance

- debit `7515`
- credit `2731`

### LAK-P0041 Employer contribution on gross salary deduction basis

- debit `7518`
- credit `2731`

### LAK-P0042 Collective pension premium

- debit `7411`
- credit `2740`

### LAK-P0043 Individual pension premium

- debit `7412`
- credit `2740`

### LAK-P0044 Special payroll tax on pension cost

- debit `7533`
- credit `2732`

### LAK-P0045 Labour-market insurance premium

- debit `7571`
- credit `2740`

### LAK-P0046 Vacation liability increase, collective domestic

- debit `7090`
- credit `2920`

### LAK-P0047 Vacation liability increase, salaried domestic

- debit `7291`
- credit `2920`

### LAK-P0048 Vacation liability increase, executive domestic

- debit `7292`
- credit `2920`

### LAK-P0049 Accrued wages at period end, collective domestic

- debit `7019`
- credit `2910`

### LAK-P0050 Accrued wages at period end, salaried domestic

- debit `7219`
- credit `2910`

### LAK-P0051 Accrued wages at period end, executive domestic

- debit `7229`
- credit `2910`

### LAK-P0052 Accrued wages at period end, foreign salaried or executive

- debit `7239`
- credit `2910`

### LAK-P0053 Accrued statutory charges on wage or vacation liability

- debit `7519`
- credit `2941`

### LAK-P0054 Taxable benefit with upstream-owned cost

- no direct payroll cost posting
- no direct payroll liability posting beyond tax and contribution basis effects
- mandatory downstream owner:
  - `FORMANER_OCH_FORMANSBESKATTNING_BINDANDE_SANNING.md`

### LAK-P0055 Payroll-native meal benefit cost

- debit `7382`
- credit `2821`
- allowed only if upstream cost booking does not exist and benefit policy explicitly declares payroll-owned cost

### LAK-P0056 Payroll-native car benefit cost

- debit `7385`
- credit `2821`
- allowed only if upstream cost booking does not exist and payroll-native benefit policy is explicitly activated

### LAK-P0057 Payroll-native other benefit cost

- debit `7389`
- credit `2821`
- allowed only under same restriction as `LAK-P0055`

### LAK-P0058 Congestion-tax benefit cost

- debit `7391`
- credit `2821`
- allowed only if payroll-owned benefit path is explicitly approved

### LAK-P0059 Household-service benefit cost

- debit `7392`
- credit `2821`
- this proof-ledger is forbidden unless it is a real payroll-side benefit and not the seller-side HUS flow

### LAK-P0060 Unsupported line classification

- posting: blocked
- fallback account: forbidden
- result state: `blocked_unknown_pay_item_mapping`

## Bindande rapport-, export- och myndighetsmappning

- `cash_compensation`
  - all `gross_addition` cash lines that increase taxable cash salary

- `taxable_benefit`
  - all `reporting_only` or `liability_only` benefit lines with taxable benefit basis

- `tax_free_allowance`
  - `7321`, `7323`, `7331` and other explicitly tax-free payroll-owned cost allowances

- `pension_premium`
  - `7411`, `7412` and associated special payroll tax anchors

- `net_deduction_only`
  - `2790`, `2794`, `2750`, `1611`, `1612`, `1614`, `1619` settlement lines

- `accrual_only`
  - `2910`, `2920`, `2941`

Detta dokument äger inte slutlig AGI-faltkod. Det äger bara den canonical line anchor som senare AGI-biblar måste utga ifran.

## Bindande scenariofamilj till proof-ledger och rapportspar

- `LAK-A001 monthly_salary_collective_domestic -> LAK-P0001 -> cash_compensation`
- `LAK-A002 monthly_salary_salaried_domestic -> LAK-P0002 -> cash_compensation`
- `LAK-A003 monthly_salary_executive_domestic -> LAK-P0003 -> cash_compensation`
- `LAK-A004 monthly_salary_foreign -> LAK-P0004 -> cash_compensation`
- `LAK-A005 board_fee -> LAK-P0005 -> cash_compensation`
- `LAK-B001 sick_pay_collective -> LAK-P0006 -> cash_compensation`
- `LAK-B002 sick_pay_salaried -> LAK-P0007 -> cash_compensation`
- `LAK-B003 sick_pay_executive -> LAK-P0008 -> cash_compensation`
- `LAK-B004 vacation_pay_collective -> LAK-P0009 -> cash_compensation`
- `LAK-B005 vacation_pay_salaried -> LAK-P0010 -> cash_compensation`
- `LAK-B006 vacation_pay_executive -> LAK-P0011 -> cash_compensation`
- `LAK-B007 parental_comp_collective -> LAK-P0012 -> cash_compensation`
- `LAK-B008 parental_comp_salaried -> LAK-P0013 -> cash_compensation`
- `LAK-B009 parental_comp_executive -> LAK-P0014 -> cash_compensation`
- `LAK-C001 bonus_collective -> LAK-P0015 -> cash_compensation`
- `LAK-C002 bonus_salaried -> LAK-P0016 -> cash_compensation`
- `LAK-C003 tantiem_executive -> LAK-P0017 -> cash_compensation`
- `LAK-D001 salary_exchange_collective -> LAK-P0018 -> net_effect_reduced_cash`
- `LAK-D002 salary_exchange_salaried -> LAK-P0019 -> net_effect_reduced_cash`
- `LAK-D003 salary_exchange_executive -> LAK-P0020 -> net_effect_reduced_cash`
- `LAK-D004 salary_exchange_foreign -> LAK-P0021 -> net_effect_reduced_cash`
- `LAK-E001 tax_free_travel_domestic -> LAK-P0022 -> tax_free_allowance`
- `LAK-E002 taxable_travel_domestic -> LAK-P0023 -> cash_compensation`
- `LAK-E003 tax_free_travel_foreign -> LAK-P0024 -> tax_free_allowance`
- `LAK-E004 taxable_travel_foreign -> LAK-P0025 -> cash_compensation`
- `LAK-E005 tax_free_mileage -> LAK-P0026 -> tax_free_allowance`
- `LAK-E006 taxable_mileage -> LAK-P0027 -> cash_compensation`
- `LAK-E007 extra_cash_allowance -> LAK-P0028 -> cash_compensation`
- `LAK-E008 reimbursement_clearing -> LAK-P0029 -> reimbursement_only`
- `LAK-F001 tax_withholding -> LAK-P0030 -> tax_withheld`
- `LAK-F002 generic_net_deduction -> LAK-P0031 -> net_deduction_only`
- `LAK-F003 union_fee -> LAK-P0032 -> net_deduction_only`
- `LAK-F004 garnishment -> LAK-P0033 -> net_deduction_only`
- `LAK-F005 employee_receivable_offset -> LAK-P0034 -> receivable_settlement`
- `LAK-F006 travel_advance_offset -> LAK-P0035 -> receivable_settlement`
- `LAK-F007 cash_advance_offset -> LAK-P0036 -> receivable_settlement`
- `LAK-F008 temporary_loan_offset -> LAK-P0037 -> receivable_settlement`
- `LAK-G001 employer_contribution_cash_salary -> LAK-P0038 -> employer_contribution`
- `LAK-G002 employer_contribution_benefit -> LAK-P0039 -> employer_contribution`
- `LAK-G003 employer_contribution_taxable_allowance -> LAK-P0040 -> employer_contribution`
- `LAK-G004 employer_contribution_gross_deduction -> LAK-P0041 -> employer_contribution`
- `LAK-G005 collective_pension_premium -> LAK-P0042 -> pension_premium`
- `LAK-G006 individual_pension_premium -> LAK-P0043 -> pension_premium`
- `LAK-G007 special_payroll_tax_pension -> LAK-P0044 -> pension_premium`
- `LAK-G008 labour_market_insurance -> LAK-P0045 -> pension_premium`
- `LAK-H001 vacation_liability_collective -> LAK-P0046 -> accrual_only`
- `LAK-H002 vacation_liability_salaried -> LAK-P0047 -> accrual_only`
- `LAK-H003 vacation_liability_executive -> LAK-P0048 -> accrual_only`
- `LAK-H004 accrued_wage_collective -> LAK-P0049 -> accrual_only`
- `LAK-H005 accrued_wage_salaried -> LAK-P0050 -> accrual_only`
- `LAK-H006 accrued_wage_executive -> LAK-P0051 -> accrual_only`
- `LAK-H007 accrued_wage_foreign -> LAK-P0052 -> accrual_only`
- `LAK-H008 accrued_social_charges -> LAK-P0053 -> accrual_only`
- `LAK-I001 taxable_benefit_upstream_owned -> LAK-P0054 -> taxable_benefit`
- `LAK-I002 payroll_native_meal_benefit -> LAK-P0055 -> taxable_benefit`
- `LAK-I003 payroll_native_car_benefit -> LAK-P0056 -> taxable_benefit`
- `LAK-I004 payroll_native_other_benefit -> LAK-P0057 -> taxable_benefit`
- `LAK-I005 congestion_tax_benefit -> LAK-P0058 -> taxable_benefit`
- `LAK-I006 household_service_benefit -> LAK-P0059 -> taxable_benefit`
- `LAK-Z001 unsupported_mapping -> LAK-P0060 -> blocked`

## Tvingande dokument- eller indataregler

Varje aktiv `PayItemCatalogEntry` måste minst ha:
- `payItemCode`
- `displayName`
- `lineEffectClass`
- `employeeRemunerationProfileScope`
- `basisProfileCode`
- `agiAnchorCode`
- `costOwnershipPolicy`
- `settlementFamily`
- `defaultCostAccountNumber` eller uttryckligt `no_direct_payroll_cost_posting`
- `defaultLiabilityOrReceivableAccountNumber` när line effect kraver settlement anchor
- `effectiveFrom`
- `reviewReceiptRef`

Ingen löneart får publiceras utan full konto- och basisprofil.

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `LAK-R001 salary_exchange`
  - bruttoloneavdrag med reducerad kontant lön och fortsatt pensions-/benefitsgrund där policy tillater

- `LAK-R002 payroll_native_benefit_cost`
  - används endast när benefitkostnaden inte redan är bokad upstream

- `LAK-R003 reimbursement_clearing_only`
  - payroll reglerar en redan bokad skuld till anställd, men får inte skapa ny kostnad

- `LAK-R004 statutory_withholding`
  - personalskatt eller myndighetsanknuten net deduction

- `LAK-R005 employee_receivable_recovery`
  - negativ nettolön eller annan fordran mot anställd regleras via payroll

- `LAK-R006 accrual_only`
  - bokning av upplupen lön, semesterlön eller social avgift utan kontant nettopayout

- `LAK-R007 blocked_unknown_mapping`
  - lönearten får inte användas i live payroll innan canonical mapping finns

## Bindande faltspec eller inputspec per profil

### Domestic collective profile

- required wage account family:
  - `7010`, `7081`, `7082`, `7083`, `7090`, `7018`, `7019`

### Domestic salaried profile

- required wage account family:
  - `7210`, `7218`, `7219`, `7281`, `7283`, `7285`, `7291`

### Domestic executive profile

- required wage account family:
  - `7220`, `7222`, `7228`, `7229`, `7282`, `7284`, `7286`, `7292`

### Foreign employment profile

- required wage account family:
  - `7030`, `7038`, `7039` för collective foreign
  - `7230`, `7238`, `7239` för salaried/executive foreign

### Board-member profile

- required wage account family:
  - `7240`, `2823`

## Scenariofamiljer som hela systemet måste tacka

- worked-time wages
- non-worked-time wages
- variable pay
- board/tantiem
- gross salary deductions
- taxable and tax-free travel allowances
- taxable and tax-free mileage
- company-paid receipt reimbursement clearing
- tax withholding and net deductions
- garnishment
- employee receivable recovery
- travel and cash advances
- pension premiums and special payroll tax
- vacation and wage accruals
- taxable benefits with upstream-owned cost
- payroll-native benefits that are explicitly approved
- blocked unsupported mappings

## Scenarioregler per familj

- worked-time wages måste alltid ge kostnad + payroll liability
- non-worked-time wages måste använda ej-arbetad-tid-konton, inte vanliga worked-time-konton
- gross salary deductions måste reducera löneskuld och kreditera korrekt bruttoloneavdragskonto
- tax-free travel och mileage måste aldrig landa på taxable cash anchors
- reimbursement clearing måste aldrig skapa ny kostnad
- benefit lines måste defaulta till `no_direct_payroll_cost_posting` när upstream already-booked cost exists
- union fee och garnishment måste aldrig dela samma konto
- negative-net recovery måste defaulta till `1619` om inte receivabletypen är reseforskott, kassaforskott eller tillfalligt lan
- accrued wage och vacation-liability lines måste vara `accrual_only`

## Blockerande valideringar

- deny activation om `payItemCode` saknar canonical kontoankare
- deny live payroll om löneart hamnar på generiskt fallbackkonto
- deny live payroll om benefit line med `upstream_cost_already_booked` försöker skapa ny kostnad
- deny travel reimbursement om line effect inte uttryckligen är `reimbursement_clearing` eller payroll-owned allowance
- deny gross salary deduction om canonical remuneration profile inte har verifierat `7018`, `7218`, `7228` eller `7238`
- deny receivable offset om receivabletyp inte är kland och entydig
- deny activation om löneart saknar AGI anchor eller basis flags

## Rapport- och exportkonsekvenser

- varje löneart måste kunna förklaras i payslip trace
- varje löneart måste kunna förklaras i posting-bundle trace
- varje löneart måste kunna förklaras i AGI pre-mapping trace
- exported payroll journal får aldrig ha ospecificerade payrollkonton
- SIE4-voucher för payroll måste kunna förklaras till `payItemCode`

## Förbjudna förenklingar

- alla löner på `7010`
- alla deductions på `2790`
- alla benefits som ny payrollkostnad
- alla reimbursements som ny payrollkostnad
- alla receivables på `1300`
- alla accrued wages på samma generiska konto oavsett profile
- fri kontooverride på payslip line i live mode

## Fler bindande proof-ledger-regler för specialfall

- retroaktiv lön använder samma canonical kostnadsfamilj som ursprunglig lönerad, men med correction lineage
- final-pay-lönerad använder samma canonical löneartsfamilj som underliggande komponent; final-pay runtime får inte uppfinna eget konto
- employee receivable write-off får inte agas av detta dokument; det ägs av `LONEFLODET_BINDANDE_SANNING.md` och senare receivable/write-off-truth
- benefit reversal måste använda samma benefit-anchor som ursprunglig line

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `LAK-P0001-LAK-P0028`
  - okar payroll cash liability på `2821` eller `2823`

- `LAK-P0029`
  - minskar skuld på `2822` och flyttar till cash payroll liability `2821`

- `LAK-P0030-LAK-P0037`
  - minskar `2821`
  - okar relevant tax-, deduction- eller receivable-anchor

- `LAK-P0038-LAK-P0045`
  - paverkar inte nettolön direkt
  - okar arbetsgivarens skuld till stat eller avtalad motpart

- `LAK-P0046-LAK-P0053`
  - paverkar inte cash payout
  - okar accrued liabilities

- `LAK-P0054-LAK-P0059`
  - paverkar skattegrund och AGI-anchor enligt downstream rules
  - cash payout effect är normalt noll

## Bindande verifikations-, serie- och exportregler

- payroll vouchers ska ligga i egen verifikationsserie eller tydligt markerad payrollseriepolicy
- en voucher får aldrig blanda payroll och icke-payroll line origins utan explicit cross-domain evidence
- export måste ba ra:
  - `payItemCode`
  - `lineEffectClass`
  - `accountProfileCode`
  - `sourcePayRunId`
  - `sourcePayRunLineId`

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- domestic vs foreign
- collective vs salaried vs executive vs board
- taxable vs tax-free
- payroll-owned cost vs upstream-owned cost
- immediate payout vs accrual-only
- normal run vs correction vs final pay
- positive amount vs reversal amount

## Bindande fixture-klasser för lönearter och lönekonton

- `LAK-FXT-001` normal month salary
- `LAK-FXT-002` sick-pay line
- `LAK-FXT-003` vacation-pay line
- `LAK-FXT-004` gross salary deduction
- `LAK-FXT-005` tax-free allowance
- `LAK-FXT-006` taxable allowance
- `LAK-FXT-007` benefit with upstream-owned cost
- `LAK-FXT-008` reimbursement clearing
- `LAK-FXT-009` net deduction and garnishment
- `LAK-FXT-010` employee receivable offset
- `LAK-FXT-011` pension and special payroll tax
- `LAK-FXT-012` accrual posting

## Bindande expected outcome-format per scenario

Varje scenario måste minst ha:
- `scenarioId`
- `payItemCode`
- `employeeRemunerationProfile`
- `basisProfile`
- `expectedLineEffectClass`
- `expectedCostAccountNumber`
- `expectedLiabilityOrReceivableAccountNumber`
- `expectedAgiAnchor`
- `expectedBlockedOrAllowedStatus`
- `expectedJournalLines`
- `expectedCashPayoutEffect`

## Bindande canonical verifikationsseriepolicy

- payroll cost and liability postings: `LON`
- payroll accrual vouchers: `LON-INT`
- payroll correction vouchers: `LON-RATT`
- payroll migration-created historical vouchers måste markas separat och får aldrig se ut som native live payroll

## Bindande expected outcome per central scenariofamilj

- `LAK-A001`
  - expected ledger:
    - debit `7010`
    - credit `2821`
  - allowed

- `LAK-D002`
  - expected ledger:
    - debit `2821`
    - credit `7218`
  - allowed

- `LAK-E001`
  - expected ledger:
    - debit `7321`
    - credit `2821`
  - AGI anchor: `tax_free_allowance`

- `LAK-E008`
  - expected ledger:
    - debit `2822`
    - credit `2821`
  - direct cost posting forbidden

- `LAK-F004`
  - expected ledger:
    - debit `2821`
    - credit `2750`
  - generic `2790` forbidden

- `LAK-F005`
  - expected ledger:
    - debit `2821`
    - credit `1619`
  - used för negative net recovery unless more specific receivable type exists

- `LAK-G007`
  - expected ledger:
    - debit `7533`
    - credit `2732`

- `LAK-H002`
  - expected ledger:
    - debit `7291`
    - credit `2920`
  - payout effect zero

- `LAK-I001`
  - expected ledger:
    - no direct payroll cost posting
  - downstream benefit truth mandatory

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- all `LAK-A*` -> worked-time cash pay with wage-family account + `2821` or `2823`
- all `LAK-B*` -> non-worked-time cash pay with sick/vacation/parental account + `2821`
- all `LAK-C*` -> variable pay / board / tantiem with bonus/tantiem account + employee liability
- all `LAK-D*` -> gross salary deduction reduces liability and credits dedicated bruttoloneavdragskonto
- all `LAK-E*` -> allowance or reimbursement according to taxability and ownership boundary
- all `LAK-F*` -> withholding, net deduction or receivable settlement; never payroll cost
- all `LAK-G*` -> employer-side cost and contribution liability, not employee cash liability
- all `LAK-H*` -> accrual-only entries
- all `LAK-I*` -> taxable benefit routing with strict no-double-booking rule
- all `LAK-Z*` -> blocked

## Bindande testkrav

- unit tests för every `payItemCode` to account-profile resolution
- unit tests för every remuneration profile mapping
- unit tests för gross deduction vs net deduction separation
- unit tests för reimbursement-clearing no-new-cost invariant
- unit tests för benefit no-double-booking invariant
- unit tests för receivable-type specific account selection
- integration tests för pay item catalog approval and effective dating
- integration tests för posting bundle trace to `payItemCode`
- migration tests för legacy pay item to canonical pay item mapping
- parity tests against BAS account expectations in this document

## Källor som styr dokumentet

- `DOMAIN_10_ROADMAP.md`
- `DOMAIN_10_IMPLEMENTATION_LIBRARY.md`
- `LONEFLODET_BINDANDE_SANNING.md`
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md`
- `PERIODISERING_OCH_BOKSLUTSOMFORINGAR_BINDANDE_SANNING.md`
- `packages/domain-payroll/src/index.mjs`
- `tests/unit/phase21-payroll-core.test.mjs`
- `tests/unit/phase12-payrun-engine-agi-immutability.test.mjs`
- `tests/unit/phase12-benefits-travel-hardening.test.mjs`
- `tests/unit/phase12-pension-salary-exchange-hardening.test.mjs`
- `tests/unit/phase12-sick-pay-automation.test.mjs`
- `tests/unit/phase12-vacation-automation.test.mjs`
- `tests/unit/phase12-employee-receivables.test.mjs`
- `tests/unit/phase12-garnishment-remittances.test.mjs`
- [BAS 2025 kontoplan](https://www.bas.se/wp-content/uploads/2025/01/Kontoplan-BAS-2025.pdf)
- [Riksdagen: Semesterlag (1977:480)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/semesterlag-1977480_sfs-1977-480/)
- [Riksdagen: Lag (1991:1047) om sjuklön](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-19911047-om-sjuklon_sfs-1991-1047/)
- [Riksdagen: Socialavgiftslag (2000:980)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/socialavgiftslag-2000980_sfs-2000-980/)
- [Skatteverket: Arbetsgivardeklaration](https://www.skatteverket.se/foretag/arbetsgivare/lamnaarbetsgivardeklaration.4.361dc8c15312eff6fd13c6.html)
- [Skatteverket: Förmåner](https://www.skatteverket.se/foretag/arbetsgivare/lonochersattning/formaner.4.3016b5d91791bf5467915db.html)
