# BAS_LONEKONTOPOLICY_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för BAS-lönekontopolicy i plattformen.

## Syfte

Detta dokument ska låsa hur canonical pay item families mappas till BAS-lönekonton, liabilities, receivables och accrual anchors sa att payrollruntime, AGI, payout och bokslut inte bygger på lokala kontoantäganden.

## Omfattning

Detta dokument omfattar:
- payroll expense account families
- liability anchors för personalskatt, arbetsgivaravgifter, löneskulder och övriga löneavdrag
- receivable anchors för negativ nettolön och ändra anställdfordringar
- accrual anchors för semester, upplupna löner och upplupna arbetsgivaravgifter eller sarskild löneskatt
- benefit subtype account anchors
- blocked payroll account uses

Detta dokument omfattar inte:
- full löneartslogik per löneart, som ägs av `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md`
- AGI-faltlogik, som ägs av `AGI_FALTKARTA_OCH_RATTELSER_BINDANDE_SANNING.md`
- bankutbetalningslogik, som ägs av `LONEUTBETALNING_OCH_BANKRETURER_BINDANDE_SANNING.md`

## Absoluta principer

- varje löneart eller pay item family måste ha canonical BAS-kontoankare
- payrollkonton får inte spridas som fri konfig eller hardkodning i varje flow
- liabilities, receivables och accruals måste vara first-class anchors
- employer contributions and tax accounts remain distinct from payroll expense lines
- cash payroll liability får inte blandas ihop med periodiserade upplupna löner
- benefit families får inte kollapsas till ett enda BAS-konto utan måste valjas per faktisk förmånstyp
- negativ nettolön får inte forsvinna i payoutdiff eller dolda avstämningsposter

## Bindande dokumenthierarki för BAS-lönekontopolicy

- detta dokument äger BAS-lönekontopolicy
- `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md` äger löneartskatalogen och måste peka hit för alla kontoankare
- `LONEFLODET_BINDANDE_SANNING.md`, `PRELIMINARSKATT_OCH_SKATTETABELLER_BINDANDE_SANNING.md`, `ARBETSGIVARAVGIFTER_OCH_SPECIALREGLER_BINDANDE_SANNING.md`, `FORMANER_OCH_FORMANSBESKATTNING_BINDANDE_SANNING.md`, `SJUKLON_KARENS_OCH_FRANVARO_BINDANDE_SANNING.md`, `SEMESTER_SEMESTERSKULD_OCH_SEMESTERERSATTNING_BINDANDE_SANNING.md`, `LONEUTMATNING_OCH_ANDRA_MYNDIGHETSAVDRAG_BINDANDE_SANNING.md`, `NEGATIV_NETTOLON_OCH_EMPLOYEE_RECEIVABLE_BINDANDE_SANNING.md` och `LONEUTBETALNING_OCH_BANKRETURER_BINDANDE_SANNING.md` måste peka hit för kontoankare
- Domän 10, 15 och 27 får inte definiera avvikande BAS-lönekontopolicy utan att detta dokument skrivs om samtidigt

## Kanoniska objekt

- `PayrollAccountFamily`
- `PayrollAccountPolicyProfile`
- `PayrollAccountOverridePolicy`
- `BlockedPayrollAccountUse`
- `PayrollAccountLineageReceipt`
- `PayrollLiabilityAnchor`
- `PayrollAccrualAnchor`
- `BenefitAccountAnchor`

## Kanoniska state machines

- `PayrollAccountPolicyProfile`: `draft -> active | superseded | retired`
- `PayrollAccountOverridePolicy`: `draft -> active | revoked`
- `PayrollLiabilityAnchor`: `draft -> active | blocked | retired`
- `PayrollAccrualAnchor`: `draft -> active | blocked | retired`

## Kanoniska commands

- `PublishPayrollAccountPolicyProfile`
- `PublishPayrollAccountOverridePolicy`
- `PublishPayrollLiabilityAnchor`
- `PublishPayrollAccrualAnchor`
- `BlockPayrollAccountUse`
- `RecordPayrollAccountLineageReceipt`

## Kanoniska events

- `PayrollAccountPolicyProfilePublished`
- `PayrollAccountOverridePolicyPublished`
- `PayrollLiabilityAnchorPublished`
- `PayrollAccrualAnchorPublished`
- `PayrollAccountUseBlocked`
- `PayrollAccountLineageReceiptRecorded`

## Kanoniska route-familjer

- `POST /payroll-account-policies`
- `POST /payroll-account-overrides`
- `POST /payroll-liability-anchors`
- `POST /payroll-accrual-anchors`
- `POST /blocked-payroll-account-uses`
- `POST /payroll-account-lineage-receipts`

## Kanoniska permissions och review boundaries

- endast payroll- och finance-governance får ändra payroll account policy
- support får aldrig overridea payrollkonton
- override policies require finance sign-off
- liability- och accrual-anchor changes are high-risk finance changes

## Nummer-, serie-, referens- och identitetsregler

- varje payroll account family ska ha `PAY-ACC-FAM-NNN`
- varje policyprofil ska ha `PAY-ACC-POL-NNN`
- varje liability anchor ska ha `PAY-LIA-NNN`
- varje accrual anchor ska ha `PAY-ACR-NNN`
- varje blocked use ska ha `PAY-ACC-BLK-NNN`

## Valuta-, avrundnings- och omräkningsregler

- payrollkonto policy does not override currency rules if foreign payroll is låter supported
- negative and positive values must still point to same family or explicit reversal family
- rounding får inte flytta löneskuld mellan `2821`, `2822`, `2823`, `1619` eller `291x`

## Replay-, correction-, recovery- och cutover-regler

- payrun replay must preserve payroll account policy version
- historical payroll postings may not be silently remapped when policy changes
- migration of payroll history must preserve source and canonical account lineage
- correction payruns must use the same anchor families as the original business event unless the correction explicitly changes liability class

## Huvudflödet

1. pay item family defined
2. payroll account family resolved
3. expense account branch chosen from the pay-item catalog
4. liability, receivable and accrual anchors resolved from this document
5. lineage receipt stored för payrun posting
6. payout, AGI and bokslut docs consume the same anchor truth

## Bindande scenarioaxlar

- pay item class
- taxable or tax-free
- cash, benefit, deduction or accrual
- positive, negative or reversal
- standard or override
- employee class: kollektivanstalld, tjänsteman, företagsledare
- earned vs accrued vs payable vs settled
- benefit subtype: meal, car, congestion, household service, generic other
- liability subtype: payroll cash, reserakning, tantiem, myndighetsavdrag, övrigt löneavdrag

## Bindande policykartor

- `PAY-BAS-POL-001 family_to_default_expense_branch`
- `PAY-BAS-POL-002 family_to_liability_anchor`
- `PAY-BAS-POL-003 family_to_accrual_anchor`
- `PAY-BAS-POL-004 blocked_payroll_account_use_matrix`
- `PAY-BAS-POL-005 migration_payroll_lineage_policy`
- `PAY-BAS-POL-006 cash_payroll_liability_policy`
- `PAY-BAS-POL-007 employee_receivable_default_policy`
- `PAY-BAS-POL-008 benefit_subtype_to_account_policy`
- `PAY-BAS-POL-009 accrued_vs_cash_boundary_policy`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `PAY-BAS-P0001` kollektivanstalld worked-time salary family -> `7011` eller när lönearten anger bruttoloneavdrag `7018`
- `PAY-BAS-P0002` tjänsteman worked-time salary family -> `7211` eller när lönearten anger bruttoloneavdrag `7218`
- `PAY-BAS-P0003` företagsledare worked-time salary family -> `7221` eller när lönearten anger bruttoloneavdrag `7228`
- `PAY-BAS-P0004` withheld preliminary tax liability -> `2710`
- `PAY-BAS-P0005` employer contribution liability -> `2731`
- `PAY-BAS-P0006` special payroll tax liability -> `2732`
- `PAY-BAS-P0007` payroll cash liability -> `2821`
- `PAY-BAS-P0008` expense claim or reserakning liability -> `2822`
- `PAY-BAS-P0009` tantiem or gratifikation liability -> `2823`
- `PAY-BAS-P0010` employee receivable default family -> `1619`
- `PAY-BAS-P0011` vacation accrual family -> `2920`
- `PAY-BAS-P0012` accrued salary liability at period close -> `2910`, `2911` eller `2919`
- `PAY-BAS-P0013` accrued statutory social charges -> `2941`
- `PAY-BAS-P0014` accrued special payroll tax on pensions -> `2943`
- `PAY-BAS-P0015` pension insurance premium family -> `7411` eller `7412`
- `PAY-BAS-P0016` pension special payroll tax cost family -> `7533`
- `PAY-BAS-P0017` meal benefit cost family -> `7382`
- `PAY-BAS-P0018` car benefit cost family -> `7385`
- `PAY-BAS-P0019` congestion tax benefit cost family -> `7391`
- `PAY-BAS-P0020` household-service benefit cost family -> `7392`
- `PAY-BAS-P0021` generic other benefit cost family -> `7389`

## Bindande rapport-, export- och myndighetsmappning

- payroll account families must map to payroll journal, ledger export and scenario proof
- liabilities must preserve tax and contribution anchors to AGI and payout workflows
- cash payroll liabilities must reconcile to payout files and bank returns
- accrued accounts must reconcile to bokslut and reversal periods, not payout execution

## Bindande scenariofamilj till proof-ledger och rapportspar

- ordinary salary kollektivanstalld -> `PAY-BAS-P0001`, `PAY-BAS-P0004`, `PAY-BAS-P0005`, `PAY-BAS-P0007`
- ordinary salary tjänsteman -> `PAY-BAS-P0002`, `PAY-BAS-P0004`, `PAY-BAS-P0005`, `PAY-BAS-P0007`
- ordinary salary företagsledare -> `PAY-BAS-P0003`, `PAY-BAS-P0004`, `PAY-BAS-P0005`, `PAY-BAS-P0007`
- benefit meal -> `PAY-BAS-P0017`
- benefit car -> `PAY-BAS-P0018`
- benefit congestion -> `PAY-BAS-P0019`
- benefit household service -> `PAY-BAS-P0020`
- benefit generic other -> `PAY-BAS-P0021`
- special payroll tax on pension -> `PAY-BAS-P0006`, `PAY-BAS-P0016`
- employee receivable -> `PAY-BAS-P0010`
- vacation accrual -> `PAY-BAS-P0011`
- accrued payroll close -> `PAY-BAS-P0012`, `PAY-BAS-P0013`, `PAY-BAS-P0014`
- pension -> `PAY-BAS-P0015`, `PAY-BAS-P0016`
- reserakning -> `PAY-BAS-P0008`
- tantiem or gratifikation -> `PAY-BAS-P0009`

## Tvingande dokument- eller indataregler

- every pay item family must name payroll account family
- every liability line must name liability anchor
- every accrual line must name accrual anchor
- every benefit line must name benefit subtype account anchor
- every negative net line must name receivable subtype or default to `1619`

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `PAY-BAS-R001 missing_payroll_account_family`
- `PAY-BAS-R002 blocked_payroll_override`
- `PAY-BAS-R003 missing_liability_anchor`
- `PAY-BAS-R004 missing_lineage`
- `PAY-BAS-R005 forbidden_cash_to_accrual_substitution`
- `PAY-BAS-R006 forbidden_generic_benefit_account`
- `PAY-BAS-R007 invalid_employee_receivable_account`

## Bindande faltspec eller inputspec per profil

- pay family: `family_id`, `default_account_branch`, `liability_anchor`, `accrual_anchor`
- override policy: `family_id`, `allowed_accounts[]`, `approval_required`
- lineage receipt: `policy_id`, `account_used`, `pay_item_family`, `payrun_id`
- benefit subtype profile: `benefit_type`, `cost_account`, `agi_effect`, `contribution_effect`
- settlement profile: `liability_anchor`, `settlement_channel`, `payout_batch_ref`

## Scenariofamiljer som hela systemet måste tacka

- ordinary salary
- officer or manager salary
- taxable benefit by subtype
- deduction and withheld tax
- employer contributions
- employee receivable
- vacation accrual
- pension and special payroll tax
- reserakning
- tantiem or gratifikation
- accrued payroll close
- negative net payroll carry-forward

## Scenarioregler per familj

- liabilities must never collapse into expense lines
- benefits must remain separate from salary expense and split by subtype account family
- receivables must stay explicit
- vacation accruals must stay accrual-classed
- `2821` äger cash payroll liability fram till faktisk utbetalning eller retur
- `291x` får bara användas för upplupen lön vid periodstangning och får inte vara canonical payout liability
- negativ nettolön ska defaulta till `1619` om inte separat reseforskott, kassaforskott eller tillfalligt lan är uttryckligt scenario

## Blockerande valideringar

- payroll posting blocked om family saknas
- payroll posting blocked om liability anchor saknas
- payroll posting blocked om blocked override matchar
- payroll posting blocked om `2910/2911/2919` används som cash payout liability
- payroll posting blocked om benefit subtype saknas men benefit konto krävs
- payroll posting blocked om negativ nettolön bokas mot annat an uttrycklig receivable family

## Rapport- och exportkonsekvenser

- payroll journal export must show used account and policy lineage
- scenario proof must show payroll account family and AGI linkage separately
- payout settlement reporting must separate `2821`, `2822`, `2823` och `1619`
- bokslutsrapporter måste separera `291x`, `2920`, `2941`, `2943` från cash settlement liabilities

## Förbjudna förenklingar

- hardcoded payroll accounts in payrun logic
- merging benefits into salary expense
- hiding employee receivable in net pay diff
- using `7385` as generic account för all benefits
- using `2910` as generic account för all net salary liabilities
- using `1610` as generic default för negative net pay när `1619` är canonical default

## Fler bindande proof-ledger-regler för specialfall

- `PAY-BAS-P0022` garnishment liabilities must use `2750` and may not collapse into `2821`
- `PAY-BAS-P0023` other payroll deductions must use `279x` anchor and remain distinct from tax or authority liabilities
- `PAY-BAS-P0024` special vacation payout must preserve vacation family, not ordinary salary by default
- `PAY-BAS-P0025` batch reversal of settled salary must reverse `2821`, not `291x`

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- cash payroll liabilities must tie to payout readiness
- employee receivables must tie to recovery workflow
- accrual anchors must tie to vacation balance truth
- authority liabilities must tie to AGI and remittance truth

## Bindande verifikations-, serie- och exportregler

- series governed elsewhere; this doc governs payroll account choice only

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- pay item class x taxable class
- benefit or deduction x liability anchor
- standard x override
- positive x reversal
- cash payout x accrual close
- employee class x salary family branch
- benefit subtype x benefit cost account

## Bindande fixture-klasser för BAS-lönekontopolicy

- `PAY-BAS-FXT-001` ordinary payroll
- `PAY-BAS-FXT-002` benefits and deductions
- `PAY-BAS-FXT-003` negative net and receivable
- `PAY-BAS-FXT-004` vacation and pension
- `PAY-BAS-FXT-005` accrued payroll close
- `PAY-BAS-FXT-006` reserakning and tantiem liabilities

## Bindande expected outcome-format per scenario

- `scenario_id`
- `fixture_class`
- `expected_payroll_account_family`
- `expected_account`
- `expected_liability_anchor`
- `expected_accrual_anchor`
- `expected_benefit_subtype_account`

## Bindande canonical verifikationsseriepolicy

- EJ TILLÄMPLIGT

## Bindande expected outcome per central scenariofamilj

- ordinary salary must resolve to salary expense, withheld tax, employer contribution and cash payroll liability `2821`
- taxable benefits must resolve to subtype-specific benefit account family and payroll side effects
- negative net pay must resolve to `1619`
- accrued payroll close must resolve to `291x` plus `2941` or `2943`, never `2821`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- salary -> `7011/7211/7221` or bruttoloneavdrag branch `7018/7218/7228`
- benefit meal -> `7382`
- benefit car -> `7385`
- benefit congestion -> `7391`
- benefit household service -> `7392`
- benefit other -> `7389`
- withheld tax -> `2710`
- employer contributions -> `2731`
- special payroll tax liability -> `2732`
- net salary cash liability -> `2821`
- reserakning -> `2822`
- tantiem -> `2823`
- receivable -> `1619`
- accrued payroll -> `291x`
- accrued statutory social charges -> `2941`
- accrued special payroll tax -> `2943`

## Bindande testkrav

- pay family completeness tests
- liability anchor tests
- blocked payroll override tests
- negative net lineage tests
- `2821` settlement-only tests
- `291x` accrual-only tests
- benefit subtype account split tests
- `1619` default-receivable tests

## Källor som styr dokumentet

- [BAS: Kontoplaner för 2026](https://www.bas.se/kontoplaner/)
- [BAS: Ändringar i kontoplanen 2026](https://www.bas.se/2025/12/04/andringar-i-kontoplanen-2026/)
- [BAS: Kontoplan BAS 2025 v. 1.0](https://www.bas.se/wp-content/uploads/2025/01/Kontoplan-BAS-2025.pdf)
- [Skatteverket: Teknisk beskrivning för skattetabeller 2026](https://www.skatteverket.se/download/18.1522bf3f19aea8075ba55c/1766385913260/teknisk-beskrivning-skv-433-2026-utgava-36.pdf)
- [Skatteverket: Arbetsgivardeklaration teknisk beskrivning och testtjänst](https://www.skatteverket.se/foretag/arbetsgivare/lamnaarbetsgivardeklaration/tekniskbeskrivningochtesttjanst.4.309a41aa1672ad0c8377c8b.html)
