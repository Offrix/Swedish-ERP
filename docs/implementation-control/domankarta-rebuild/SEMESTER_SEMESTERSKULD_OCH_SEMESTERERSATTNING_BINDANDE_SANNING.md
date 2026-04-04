# SEMESTER_SEMESTERSKULD_OCH_SEMESTERERSÄTTNING_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för semester, semesterskuld, semesterlön, semestertillagg, sparade dagar, semesterersättning och förskottssemester i svensk payroll.

Detta dokument ska styra:
- semesterår och intjänandear
- betalda och obetalda semesterdagar
- sparade dagar
- sammalöneregeln och procentregeln
- semestertillagg
- semesterersättning vid avslut och ändra reglerade situationer
- förskottssemester och avräkning
- semesterskuld och upplupna avgifter

## Syfte

Detta dokument finns för att:
- semesterdagar och semesterlön aldrig ska beräknas med grova eller lokala tumregler
- slutlon, semesterersättning och semesterskuld ska kunna förklaras och replayas
- sammalöneregeln, procentregeln och kollektiv-/policyoverlays inte ska blandas ihop
- sparade dagar, semesteruttag och förskottssemester ska ha riktig lineage

## Omfattning

Detta dokument omfattar:
- semestergrundande anstallningstid
- semesterlonegrundande frånvaro enligt lagen
- paid/unpaid day calculation
- sammalöneregeln
- procentregeln
- semesterlön för rorliga delar
- semestertillagg
- sparade dagar
- semesterersättning
- semesterlön som inte kunnat laggas ut
- förskottssemester och avräkning
- semesterskuld and accrued social charges

Detta dokument omfattar inte:
- sjuklonelogik i sig
- kollektivavtalsspecifika extra semesterformaner utover explicit overlay
- AGI faltkoder i detalj
- payout file formats

## Absoluta principer

- varje semesterutfall måste förklaras från canonical anstallningsperiod, sysselsattningsgrad, frånvaro och regelprofil
- semesterberakning får aldrig ske på frihand per payslip
- sammalöneregeln och procentregeln får aldrig blandas på samma semesterkomponent utan explicit legal basis
- sparade dagar får bara byggas från dagar över tjugo betalda dagar
- sparade dagar får inte sparas under är da sparade dagar tas ut, om inte uttrycklig lag/avtalsoverlay sager annat
- semesterersättning vid avslut måste beräknas med samma canonical rules som om dagarna tagits ut
- förskottssemester får aldrig avräknas utanför de lagliga gränserna

## Bindande dokumenthierarki för semester, semesterskuld och semesterersättning

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
- Semesterlag (1977:480)
- Skatteverkets regler för skatt och arbetsgivaravgifter på semesterersättning

## Kanoniska objekt

- `VacationRuleProfile`
- `VacationYearPolicy`
- `VacationAccrualSnapshot`
- `VacationDayBalance`
- `SavedVacationDayLot`
- `VacationPayComputation`
- `VacationDebtSnapshot`
- `AdvanceVacationCase`
- `VacationSettlementCase`

## Kanoniska state machines

### `VacationAccrualSnapshot`

- `draft`
- `calculated`
- `verified`
- `frozen`
- `superseded`

### `SavedVacationDayLot`

- `active`
- `scheduled`
- `consumed`
- `expired`
- `transferred`

### `AdvanceVacationCase`

- `draft`
- `approved`
- `active`
- `partially_recovered`
- `closed`
- `written_off`

## Kanoniska commands

- `CreateVacationRuleProfile`
- `CalculateVacationAccrualSnapshot`
- `FreezeVacationAccrualSnapshot`
- `CreateSavedVacationDayLot`
- `ScheduleVacationDays`
- `CreateAdvanceVacationCase`
- `SettleVacationAtTermination`
- `CreateVacationDebtSnapshot`

## Kanoniska events

- `VacationAccrualCalculated`
- `VacationAccrualFrozen`
- `SavedVacationDayLotCreated`
- `VacationDaysScheduled`
- `AdvanceVacationCaseApproved`
- `VacationSettlementCreated`
- `VacationDebtSnapshotCreated`

## Kanoniska route-familjer

- `/v1/payroll/vacation/*`
- `/v1/payroll/vacation-liability/*`
- `/v1/payroll/final-pay/*`

## Kanoniska permissions och review boundaries

- `payroll.vacation.manage`
- `payroll.vacation.approve`
- `payroll.vacation_liability.manage`

Review boundaries:
- new vacation rule profiles require payroll review
- advance vacation and unusual transfer cases require review

## Nummer-, serie-, referens- och identitetsregler

- each `VacationAccrualSnapshot` must have immutable `vacationAccrualSnapshotId`
- each `SavedVacationDayLot` must retain save-year and expiry-year
- each `AdvanceVacationCase` must retain original grant and recovery lineage

## Valuta-, avrundnings- och omräkningsregler

- all vacation values are stored in `SEK`
- paid-day rounding follows statutory day formulas
- amounts are ore-rounded after legal formula and overlay application

## Replay-, correction-, recovery- och cutover-regler

- replay must load original vacation rule profile and frozen accrual snapshot
- correction creates new snapshots, never mutates consumed ones
- imported historical day balances and saved-day lots must map to canonical objects before live use

## Huvudflödet

1. vacation year policy and rule profile are resolved
2. accrual base is built from employment time and lawful vacation-pay-qualifying absence
3. paid and unpaid days are calculated
4. vacation pay is calculated under correct rule
5. saved-day lots are created or consumed
6. vacation liability snapshot is created
7. final pay or year-end processes consume frozen truth

## Bindande scenarioaxlar

- `vacationRuleFamily`
  - `sammaloneregeln`
  - `procentregeln`
  - `agreement_overlay`

- `vacationEventFamily`
  - `accrual`
  - `withdrawal`
  - `save`
  - `carry_forward`
  - `termination_settlement`
  - `advance_vacation`
  - `liability_snapshot`

- `absenceFamily`
  - `ordinary_worked_time`
  - `sick_leave_qualifying`
  - `parental_leave_qualifying`
  - `other_qualifying_leave`
  - `non_qualifying_leave`

## Bindande policykartor

### Statutory base policy

- annual statutory vacation right: `25 days`
- saved days may only come from paid days above `20`
- saved days normally expire within `5 years`, with possible sixth-year placement only where law allows

### Sammalöneregeln statutory values

- monthly-paid semestertillagg per paid day: `0.43%` of monthly salary
- weekly-paid semestertillagg per paid day: `1.82%` of weekly salary
- variable salary part vacation pay: `12%` of qualifying variable salary under statutory rule

### Procentregeln statutory value

- vacation pay under percent rule: `12%` of qualifying earned salary in accrual year

### Payment timing policy

- vacation pay on leave is paid in connection with leave
- vacation pay för leave that could not be laid out is paid no låter than one month after vacation year end where law says so
- vacation compensation at termination is paid without undue delay and no låter than one month after termination unless lawful calculation hindrance remains

## Bindande canonical proof-ledger med exakta konton eller faltutfall

This document owns vacation semantics and field outcome; payroll account mapping is owned by payroll account truth.

### VAC-P0001 Paid days accrual

- `paidVacationDaysCalculated`
- `unpaidVacationDaysCalculated`

### VAC-P0002 Sammalöneregeln monthly supplement

- `vacationRuleFamily = sammalöneregeln`
- `dailySupplementRate = 0.43%`

### VAC-P0003 Sammalöneregeln weekly supplement

- `vacationRuleFamily = sammalöneregeln`
- `dailySupplementRate = 1.82%`

### VAC-P0004 Variable salary vacation pay

- `variableVacationPayRate = 12%`

### VAC-P0005 Procentregeln

- `vacationPayRate = 12%`

### VAC-P0006 Saved day creation

- `savedDayLotCreated`
- only from paid days above 20

### VAC-P0007 Saved day withdrawal

- `savedDayLotConsumed`

### VAC-P0008 Vacation compensation on termination

- `terminationSettlementCreated`

### VAC-P0009 Advance vacation grant

- `advanceVacationCaseCreated`

### VAC-P0010 Advance vacation recovery

- `advanceVacationRecoveryApplied`

### VAC-P0011 Vacation liability snapshot

- `vacationDebtSnapshotCreated`

### VAC-P0012 Blocked illegal vacation case

- blocked

## Bindande rapport-, export- och myndighetsmappning

- every vacation snapshot must publish:
  - `paidDays`
  - `unpaidDays`
  - `savedDays`
  - `vacationPayValue`
  - `vacationSupplementValue`
  - `vacationCompensationValue`
  - `advanceVacationBalance`

## Bindande scenariofamilj till proof-ledger och rapportspar

- `VAC-A001 accrual_paid_unpaid_days -> VAC-P0001`
- `VAC-A002 sammalon_monthly_supplement -> VAC-P0002`
- `VAC-A003 sammalon_weekly_supplement -> VAC-P0003`
- `VAC-A004 variable_salary_component -> VAC-P0004`
- `VAC-A005 percent_rule -> VAC-P0005`
- `VAC-B001 save_days -> VAC-P0006`
- `VAC-B002 withdraw_saved_days -> VAC-P0007`
- `VAC-C001 termination_compensation -> VAC-P0008`
- `VAC-D001 advance_vacation_grant -> VAC-P0009`
- `VAC-D002 advance_vacation_recovery -> VAC-P0010`
- `VAC-E001 liability_snapshot -> VAC-P0011`
- `VAC-Z001 illegal_or_unsupported_case -> VAC-P0012`

## Tvingande dokument- eller indataregler

Every vacation rule and snapshot must include:
- `employeeId`
- `vacationYearPolicyRef`
- `ruleFamily`
- `employmentPeriod`
- `absenceSourceRefs`
- `reviewReceiptRef`

Termination settlement must also include:
- `terminationDate`
- `remainingPaidDays`
- `remainingSavedDays`
- `advanceVacationBalance`

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `VAC-R001 statutory_accrual`
- `VAC-R002 sammalöneregeln`
- `VAC-R003 procentregeln`
- `VAC-R004 saved_days`
- `VAC-R005 termination_compensation`
- `VAC-R006 advance_vacation`
- `VAC-R007 blocked_illegal_case`

## Bindande faltspec eller inputspec per profil

### Sammalöneregeln profile

- current monthly or weekly salary
- fixed supplements
- variable salary component if any

### Procentregeln profile

- qualifying earned salary
- qualifying absence uplift when law requires

### Saved-day profile

- save year
- expiry year
- source accrual snapshot

### Advance-vacation profile

- gränted days
- gränted value
- recovery policy

## Scenariofamiljer som hela systemet måste tacka

- accrual of paid/unpaid days
- sammalöneregeln monthly
- sammalöneregeln weekly
- variable salary vacation pay
- procentregeln
- save days
- take saved days
- vacation compensation at termination
- vacation pay not laid out in year
- advance vacation grant and recovery
- transfer to near-connected new employment
- transfer to new employer in lawful cases
- blocked illegal vacation case

## Scenarioregler per familj

- paid days are calculated from employment time minus non-qualifying unpaid absence under statutory formula
- sickness qualifies only within statutory limits unless work injury or other special rule applies
- parental leave qualifies only within statutory limits
- saved days can only be created from paid days above 20
- saved days may not be saved in a year when saved days are taken out, unless explicit lawful exception or contract overlay exists
- termination compensation must include saved days as if taken in termination year
- advance vacation recovery must respect five-year and protected-termination exceptions

## Blockerande valideringar

- deny saving of days if paid days do not exceed 20
- deny save if saved days are already being withdrawn same year and no lawful overlay exists
- deny vacation compensation payout if frozen balance missing
- deny advance vacation recovery if protected exception applies
- deny use of static 12% shortcut where sammalöneregeln must be used

## Rapport- och exportkonsekvenser

- payslip and final-pay traces must show day balances and compensation source
- liability exports must preserve saved-day lots and advance-vacation balances
- migration export must preserve rule family and legal-year context

## Förbjudna förenklingar

- all vacation pay as `12%`
- ignoring saved-day expiry
- ignoring qualifying-absence caps
- treating vacation compensation as ordinary bonus
- erasing advance-vacation debt on termination without legal support

## Fler bindande proof-ledger-regler för specialfall

- vacation pay för leave that could not be laid out and is not saved must be paid per statutory timing and remain distinct from termination compensation
- connected new employment may transfer vacation rights instead of cash settlement only if legal conditions are met
- transfer within same group or lawful business transfer may carry vacation rights under legal conditions

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `VAC-P0001-VAC-P0011`
  - create or update canonical vacation balance truth
  - downstream payroll posting owned by payroll account truth

- `VAC-P0012`
  - blocked

## Bindande verifikations-, serie- och exportregler

- vacation snapshots and settlements must export:
  - `vacationAccrualSnapshotId`
  - `ruleFamily`
  - `paidDays`
  - `savedDays`
  - `vacationCompensationValue`
  - `advanceVacationBalance`

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- sammalon vs procentregeln
- monthly vs weekly
- with variable salary vs without
- with saved days vs without
- with qualifying absence vs without
- active employment vs termination

## Bindande fixture-klasser för semester

- `VAC-FXT-001` statutory accrual
- `VAC-FXT-002` sammalon_monthly
- `VAC-FXT-003` sammalon_weekly
- `VAC-FXT-004` variable salary component
- `VAC-FXT-005` percent rule
- `VAC-FXT-006` saved days
- `VAC-FXT-007` termination settlement
- `VAC-FXT-008` advance vacation

## Bindande expected outcome-format per scenario

Every scenario must include:
- `scenarioId`
- `ruleFamily`
- `expectedPaidDays`
- `expectedUnpaidDays`
- `expectedSavedDays`
- `expectedVacationPayValue`
- `expectedVacationCompensationValue`
- `expectedAdvanceVacationBalance`
- `expectedBlockedOrAllowedStatus`

## Bindande canonical verifikationsseriepolicy

- vacation liability and settlement receipts belong to payroll/vacation evidence series
- imported historical vacation balances must be tagged as imported

## Bindande expected outcome per central scenariofamilj

- `VAC-A001`
  - paid/unpaid days calculated under statutory formula

- `VAC-A002`
  - `dailySupplementRate = 0.43%`

- `VAC-A005`
  - `vacationPayRate = 12%`

- `VAC-C001`
  - compensation at termination based on remaining paid and saved days

- `VAC-D002`
  - advance vacation recovery only when legally allowed

- `VAC-Z001`
  - blocked

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- all `VAC-A*` -> accrual and vacation pay rule truth
- all `VAC-B*` -> saved-day truth
- all `VAC-C*` -> termination and non-laid-out leave settlement truth
- all `VAC-D*` -> advance-vacation truth
- all `VAC-E*` -> liability snapshot truth
- all `VAC-Z*` -> blocked

## Bindande testkrav

- unit tests för paid/unpaid day formula
- unit tests för qualifying absence caps
- unit tests för sammalöneregeln vs procentregeln
- unit tests för saved-day creation and expiry
- unit tests för advance-vacation recovery exceptions
- integration tests för vacation balances, liability snapshots and final-pay settlement
- migration tests för historical balances and saved-day lots

## Källor som styr dokumentet

- `DOMAIN_10_ROADMAP.md`
- `DOMAIN_10_IMPLEMENTATION_LIBRARY.md`
- `LONEFLODET_BINDANDE_SANNING.md`
- `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md`
- `tests/unit/phase12-vacation-automation.test.mjs`
- `tests/integration/phase12-vacation-api.test.mjs`
- [Riksdagen: Semesterlag (1977:480)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/semesterlag-1977480_sfs-1977-480/)
- [Skatteverket: SKV 401](https://www.skatteverket.se/download/18.262c54c219391f2e9634df4/1736339078938/skatteavdrag-och-arbetsgivaravgifter-skv401-utgava30.pdf)
- [Skatteverket: Bokföring, bokslut och deklaration SKV 282](https://www.skatteverket.se/download/18.4a4d586616058d860bcc3a8/1708607396861/bokforing-bokslut-och-deklaration-skv282utgava08.pdf)
