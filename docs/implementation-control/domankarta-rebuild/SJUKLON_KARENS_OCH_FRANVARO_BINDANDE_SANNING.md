# SJUKLON_KARENS_OCH_FRÅNVARO_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för sjuklön, karensavdrag, frånvarograd, återinsjuknande, läkarintyg, sarskilt högriskskydd och payroll-handoff för sjukfrånvaro i svensk anstallning.

Detta dokument ska styra:
- sjukperiod dag 1-14 hos arbetsgivaren
- karensavdrag
- heltids- och deltidsfrånvaro
- återinsjuknande inom samma sjukloneperiod
- elfte sjuktillfallet inom tolvmadersperiod
- läkarintygskrav
- sarskilt högriskskydd
- övergång till Försäkringskassan efter arbetsgivarperioden
- payroll line- och account-profile-handoff för sjuklön

## Syfte

Detta dokument finns för att:
- sjukfrånvaro aldrig ska blandas ihop med vanlig oplanerad frånvaro eller manuell lönejustering
- karensavdrag aldrig ska modelleras som gammal karensdag eller som ett fritt procenttal
- arbetsgivarens sjukloneansvar och Försäkringskassans ansvar aldrig ska blandas ihop
- deltidsfrånvaro, återinsjuknande, högriskskydd och läkarintyg alltid ska fa samma deterministiska utfall
- sjuklön ska ge korrekt payroll-, AGI-, semester- och bokföringshändelse utan ad hoc-logik

## Omfattning

Detta dokument omfattar:
- sjukloneperiod hos arbetsgivaren
- karensavdrag
- heltid och partiell sjukfrånvaro
- återinsjuknande inom fem kalenderdagar
- elfte sjuktillfallet inom tolvmadersperiod
- läkarintyg dag 8 och framåt
- sarskilt högriskskydd
- sjuklonens payroll handoff
- sjukfallsspecifik review, blocking och replay

Detta dokument omfattar inte:
- sjukpenningutbetalning från Försäkringskassan efter dag 14
- kollektivavtalad kompletterande sjuklön utanför verifierad modell
- rehabiliteringskedjan i stort
- arbetsskadeersättning

## Absoluta principer

- arbetsgivaren betalar sjuklön för de första 14 kalenderdagarna i sjukperioden när arbetstagaren har rätt till sjuklön
- sjuklön ska beräknas på 80 procent av lön och ändra anstallningsformaner som arbetstagaren gar miste om under sjukperioden
- karensavdrag ska alltid modelleras som 20 procent av genomsnittlig veckosjuklon, aldrig som en gammal karensdag
- återinsjuknande inom fem kalenderdagar får aldrig skapa ny sjukloneperiod eller nytt karensavdrag
- från och med det elfte sjuktillfallet inom en tolvmadersperiod får inget nytt karensavdrag göras
- läkarintyg är bindande krav för fortsatt sjuklön från och med dag 8, om inte tidigare intygskrav finns
- om arbetstagaren omfattas av sarskilt högriskskydd för ofta återkommande sjukdom ska inget karensavdrag göras
- detta dokument får inte uppfinna egen semesterberakning; semestergrundande effekter ska emit tas vidare till semesterbibeln

## Bindande dokumenthierarki för sjuklön, karens och frånvaro

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
- `SEMESTER_SEMESTERSKULD_OCH_SEMESTERERSATTNING_BINDANDE_SANNING.md`
- lag (1991:1047) om sjuklön
- Försäkringskassans arbetsgivarregler om sjuklön, karensavdrag och sarskilt högriskskydd

## Kanoniska objekt

- `SickLeaveCase`
- `SickLeavePeriod`
- `SickPayDecision`
- `QualifyingDeductionDecision`
- `RecurrenceDecision`
- `MedicalCertificateReceipt`
- `HighRiskProtectionDecision`
- `AbsenceFractionDecision`
- `SickPayrollHandoff`
- `SickReviewCase`

## Kanoniska state machines

### `SickLeaveCase`

- `draft`
- `reported`
- `classified`
- `valued`
- `ready_for_payroll`
- `closed`
- `blocked`

### `MedicalCertificateReceipt`

- `not_required_yet`
- `required`
- `received`
- `late`
- `waived_by_rule`
- `blocked`

### `SickPayrollHandoff`

- `draft`
- `ready`
- `consumed`
- `superseded`

## Kanoniska commands

- `RegisterSickLeaveCase`
- `OpenSickLeavePeriod`
- `ResolveRecurrenceDecision`
- `ResolveQualifyingDeductionDecision`
- `ResolveAbsenceFractionDecision`
- `RegisterMedicalCertificateReceipt`
- `ResolveHighRiskProtectionDecision`
- `CreateSickPayrollHandoff`
- `BlockSickLeaveCase`

## Kanoniska events

- `SickLeaveCaseRegistered`
- `SickLeavePeriodOpened`
- `RecurrenceDecisionResolved`
- `QualifyingDeductionDecisionResolved`
- `AbsenceFractionDecisionResolved`
- `MedicalCertificateReceiptRegistered`
- `HighRiskProtectionDecisionResolved`
- `SickPayrollHandoffCreated`
- `SickLeaveCaseBlocked`

## Kanoniska route-familjer

- `POST /v1/payroll/sick-leave/cases`
- `POST /v1/payroll/sick-leave/cases/{id}/classify`
- `POST /v1/payroll/sick-leave/cases/{id}/resolve-karens`
- `POST /v1/payroll/sick-leave/cases/{id}/register-medical-certificate`
- `POST /v1/payroll/sick-leave/cases/{id}/create-payroll-handoff`
- `POST /v1/payroll/sick-leave/cases/{id}/block`

## Kanoniska permissions och review boundaries

- endast payroll-risk-roll får approvera `HighRiskProtectionDecision`
- endast verifierad payroll-roll får overridea sjukfrånvarograd efter review
- support/backoffice får aldrig skapa eller ta bort sjukperiod utan auditerad command path
- läkarintyg och medicinsk metadata ska maskas enligt minimal exposure policy

## Nummer-, serie-, referens- och identitetsregler

- varje `SickLeaveCase` ska ha globalt unikt `sickLeaveCaseId`
- varje sjukperiod ska ha `periodStartDate`, `periodEndDate` och `reportedAt`
- varje läkarintyg ska ha separat `certificateReceiptId`
- varje payroll handoff ska peka på exakt ett `SickLeaveCase`

## Valuta-, avrundnings- och omräkningsregler

- alla sjuklonebelopp ska räknas i SEK
- avrundning ska följa payrolls globala rulepack för line amounts
- karensavdrag ska räknas på genomsnittlig veckosjuklon i samma regelmotor som sjuklonen

## Replay-, correction-, recovery- och cutover-regler

- sjukfall ska vara replaybara från sjukanmalan, schedule snapshot och salary basis snapshot
- retroaktiv ändring av sjukgrad eller läkarintyg ska skapa correction chain, aldrig tyst mutation
- migrerad sjukhistorik får inte skapa nya karensavdrag vid replay
- cutover får inte nollstalla rullande räkning av sjuktillfallen senaste tolv manaderna

## Huvudflödet

1. arbetstagaren sjukanmals och `SickLeaveCase` öppnas
2. schedule snapshot och salary basis snapshot fryses
3. systemet avgor om det är nytt sjukfall eller återinsjuknande
4. systemet avgor om karensavdrag ska göras eller blockeras av regel
5. frånvarograd och dagintervall faststalls
6. läkarintygskrav bevakas
7. sjuklön beräknas för arbetsgivarperioden
8. payroll handoff skapas med canonical pay item och basis flags
9. efter dag 14 stoppas arbetsgivarens sjukloneutbetalning och handoff till Försäkringskassan-path markeras

## Bindande scenarioaxlar

- anstallningsprofil: `collective_domestic`, `salaried_domestic`, `executive_domestic`
- frånvarograd: `25`, `50`, `75`, `100`
- scheduletyp: `fixed_hours`, `variable_hours`, `shift_based`
- periodtyp: `new_period`, `recurring_within_5_days`, `continued_same_period`
- karensprofil: `ordinary`, `eleventh_occurrence_no_karens`, `high_risk_no_karens`
- certificate state: `not_required_yet`, `required_and_received`, `required_missing`
- authority boundary: `employer_day_1_14`, `forsakringskassan_day_15_plus`

## Bindande policykartor

- arbetsgivarperiod: dag 1-14 i sjukperioden
- sjukloneprocent: `80%`
- karensavdrag: `20%` av genomsnittlig veckosjuklon
- återinsjuknandegrans: `5` kalenderdagar
- nytt karensavdrag stoppas: `11th_occurrence_within_12_months`
- läkarintygskrav: fortsatt sjuklön kraver intyg från och med dag `8`
- partiell frånvarograd: endast `25`, `50`, `75`, `100`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

### SJK-P0001 Sick pay collective domestic

- payrollProfile: `collective_domestic`
- payItemCode: `LAK-B001`
- debit `7081`
- credit `2821`
- AGI anchor: `cash_compensation`
- employerContributionBasis: `true`
- vacationBasisDelegated: `true`

### SJK-P0002 Sick pay salaried domestic

- payrollProfile: `salaried_domestic`
- payItemCode: `LAK-B002`
- debit `7281`
- credit `2821`
- AGI anchor: `cash_compensation`
- employerContributionBasis: `true`
- vacationBasisDelegated: `true`

### SJK-P0003 Sick pay executive domestic

- payrollProfile: `executive_domestic`
- payItemCode: `LAK-B003`
- debit `7282`
- credit `2821`
- AGI anchor: `cash_compensation`
- employerContributionBasis: `true`
- vacationBasisDelegated: `true`

### SJK-P0004 Qualifying deduction

- payrollEffect: `reduce_cash_salary`
- sign: `negative_cash_compensation`
- AGI anchor: `cash_compensation_reduction`
- mayNotCreateStandaloneCost: `true`
- sameCaseRefRequired: `true`

### SJK-P0005 Day-15-plus stop of employer sick pay

- payrollEffect: `no_new_employer_sick_pay_line`
- createsTransitionFlag: `forsakringskassan_day_15_plus`
- requiresEmployerNotificationPath: `true`

### SJK-P0006 High-risk protection no karens

- payrollEffect: `no_qualifying_deduction_line`
- highRiskProtectionDecisionRequired: `true`
- reimbursementFlagToEmployer: `true`

### SJK-P0007 Missing medical certificate block

- payrollEffect: `blocked_continued_sick_pay`
- blockCode: `medical_certificate_missing`
- noAutoGreen: `true`

## Bindande rapport-, export- och myndighetsmappning

- arbetsgivarens sjuklön ska landa i payrolls ordinarie kontantlon-/AGI-spår, inte i separat AGI-fält
- dag 15-plus ska skapa arbetsgivar-anmalningsflagga till Försäkringskassan-path
- högriskskydd ska markeras för arbetsgivarersättningsansokan

## Bindande scenariofamilj till proof-ledger och rapportspar

- `SJK-A001 collective_first_period_full -> SJK-P0001 -> employer_day_1_14`
- `SJK-A002 salaried_first_period_full -> SJK-P0002 -> employer_day_1_14`
- `SJK-A003 executive_first_period_full -> SJK-P0003 -> employer_day_1_14`
- `SJK-B001 ordinary_karens -> SJK-P0004 -> qualifying_deduction`
- `SJK-B002 eleventh_occurrence_no_karens -> SJK-P0006 -> no_karens`
- `SJK-B003 high_risk_no_karens -> SJK-P0006 -> no_karens`
- `SJK-C001 day15_transition -> SJK-P0005 -> authority_handoff`
- `SJK-C002 missing_medical_certificate -> SJK-P0007 -> blocked`

## Tvingande dokument- eller indataregler

- sjukanmalan måste ha startdatum och rapporteringstid
- salary basis snapshot måste vara fryst innan sjuklön beräknas
- läkarintyg receipt måste ha mottagningsdatum om intyg krävs
- högriskskydd får bara aktiveras med verifierat beslut

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `SJK-R001 ordinary_sick_pay_day_1_14`
- `SJK-R002 qualifying_deduction_applied`
- `SJK-R003 recurrence_within_5_days_no_new_karens`
- `SJK-R004 eleventh_occurrence_no_karens`
- `SJK-R005 high_risk_no_karens`
- `SJK-R006 medical_certificate_missing_block`
- `SJK-R007 day_15_forsakringskassan_transition`

## Bindande faltspec eller inputspec per profil

- `employeeId`
- `employmentId`
- `payrollProfileCode`
- `periodStartDate`
- `periodEndDate`
- `reportedAt`
- `absenceFraction`
- `workScheduleSnapshotRef`
- `salaryBasisSnapshotRef`
- `medicalCertificateRequiredFromDate`
- `medicalCertificateReceiptRef`
- `highRiskProtectionDecisionRef`
- `recurrenceWindowRef`
- `sickOccurrenceCount12Months`

## Scenariofamiljer som hela systemet måste tacka

- ny sjukperiod heltid
- ny sjukperiod deltid
- variabelt schema
- återinsjuknande inom fem dagar
- elfte sjuktillfallet inom tolv manader
- sarskilt högriskskydd
- läkarintyg dag 8
- saknat läkarintyg
- övergång dag 15 till Försäkringskassan
- okand eller otillaten frånvarograd

## Scenarioregler per familj

- `SJK-A001-A003`: nytt sjukfall ska skapa sjukperiod, sjuklön och eventuell karens enligt ordinarie regler
- `SJK-B001`: återinsjuknande inom fem kalenderdagar ska fortsatta samma sjukloneperiod utan nytt karensavdrag
- `SJK-B002`: elfte sjuktillfallet inom tolvmadersperiod ska ge sjuklön från första dagen utan karensavdrag
- `SJK-B003`: verifierat högriskskydd ska ge sjuklön utan karensavdrag enligt beslutad profil
- `SJK-C001`: fortsatt sjukdom efter dag 14 ska inte skapa ny arbetsgivar-sjukloneline
- `SJK-C002`: fortsatt sjuklön utan kravt läkarintyg ska blockeras

## Blockerande valideringar

- deny sjuklön om `absenceFraction` inte är `25`, `50`, `75` eller `100`
- deny high-risk no-karens om beslut saknas eller är utgatt
- deny fortsatt sjuklön från dag 8 om läkarintyg krävs och receipt saknas
- deny nytt karensavdrag om recurrence inom fem dagar är verifierad
- deny arbetsgivar-sjuklön efter dag 14 utan separat verifierad specialregel

## Rapport- och exportkonsekvenser

- sjuklonelines ska till AGI-flödet som kontant ersättning via payroll core
- karensavdrag ska minska kontant ersättning i pay run men vara spårbart som separat decision
- dag-15-plus ska exponeras i myndighets-/arbetsgivarflödet som sjukanmalan till Försäkringskassan
- semesterflödet ska fa separat feed för semestergrundande sjukfrånvarodagar

## Förbjudna förenklingar

- ingen gammal karensdag
- inget fritt manuellt karensbelopp
- ingen automatisk fortsatt sjuklön efter dag 14
- inget antägande att deltidsfrånvaro alltid är 50 procent
- inget antägande att läkarintyg får komma när som helst utan blocker

## Fler bindande proof-ledger-regler för specialfall

- recurrence-fall ska återanvända samma sjukperiodslinje för karenslogik
- högriskskydd ska inte ta bort sjuklonen, bara karensavdraget
- saknat läkarintyg ska blockera fortsatt sjuklön men inte retroaktivt radera redan verifierade dagar

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `SJK-P0001-SJK-P0003` okar `2821` via payroll liability path
- `SJK-P0004` minskar nettolön och ska peka på samma `SickLeaveCase`
- `SJK-P0005` skapar ingen ny arbetsgivarliability utan bara myndighetshandoff
- `SJK-P0007` skapar blocked state, inte bokföring

## Bindande verifikations-, serie- och exportregler

- slutlig journalisering ska ske via payrolls verifikationsserie, inte i separat sjukloneserie
- varje sjukloneline ska kunna traced via `sickLeaveCaseId` till `payItemCode`
- exported payroll evidence ska innehålla `absenceFraction`, `karensRuleCode` och `medicalCertificateState`

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- profile x absence fraction
- profile x karens profile
- recurring vs non-recurring
- medical certificate received vs missing
- high-risk vs ordinary
- day 1-14 vs day 15+

## Bindande fixture-klasser för sjuklön

- `SJK-FXT-001` full-time salaried one-week sickness
- `SJK-FXT-002` collective worker partial sickness 50 percent
- `SJK-FXT-003` executive recurrence within five days
- `SJK-FXT-004` eleventh occurrence within twelve months
- `SJK-FXT-005` high-risk protection no karens
- `SJK-FXT-006` missing medical certificate after day 7

## Bindande expected outcome-format per scenario

- `scenarioId`
- `fixtureClass`
- `expectedKarensRule`
- `expectedPayItemCode`
- `expectedAccountOutcome`
- `expectedAgiAnchor`
- `expectedBlockedOrAllowedStatus`
- `expectedDay15Transition`

## Bindande canonical verifikationsseriepolicy

- sjuklön får aldrig skapa egen serie utan ska ga genom canonical payroll-voucher series
- blocked sjukfall ska inte exporteras som bokförd händelse

## Bindande expected outcome per central scenariofamilj

### `SJK-A002`

- fixture minimum: `SJK-FXT-001`
- expected pay item: `LAK-B002`
- expected proof-ledger: `SJK-P0002`
- expected karens: `SJK-R002`
- expected status: `ready_for_payroll`

### `SJK-B001`

- fixture minimum: `SJK-FXT-003`
- expected proof-ledger: `SJK-P0002`
- expected karens: `SJK-R003`
- expected status: `ready_for_payroll`

### `SJK-B002`

- fixture minimum: `SJK-FXT-004`
- expected proof-ledger: `SJK-P0002`
- expected karens: `SJK-R004`
- expected status: `ready_for_payroll`

### `SJK-C002`

- fixture minimum: `SJK-FXT-006`
- expected proof-ledger: `SJK-P0007`
- expected karens: `not_applicable`
- expected status: `blocked`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `SJK-A001 -> SJK-P0001 -> allowed`
- `SJK-A002 -> SJK-P0002 -> allowed`
- `SJK-A003 -> SJK-P0003 -> allowed`
- `SJK-B001 -> SJK-P0002 -> allowed_no_new_karens`
- `SJK-B002 -> SJK-P0006 -> allowed_no_karens`
- `SJK-B003 -> SJK-P0006 -> allowed_no_karens`
- `SJK-C001 -> SJK-P0005 -> handoff_to_forsakringskassan`
- `SJK-C002 -> SJK-P0007 -> blocked`

## Bindande testkrav

- unit tests för karens 20-percent calculation on variable schedule
- unit tests för recurrence within five days with no new karens
- unit tests för eleventh sick occasion within twelve months
- unit tests för high-risk protection no-karens path
- unit tests för day-8 medical certificate blocking
- integration tests för payroll handoff -> `LAK-B001`, `LAK-B002`, `LAK-B003`
- integration tests för day-15 transition flag to authority path

## Källor som styr dokumentet

- [Riksdagen: Lag (1991:1047) om sjuklön](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-19911047-om-sjuklon_sfs-1991-1047/)
- [Försäkringskassan: Sjuklön för arbetsgivare](https://www.forsakringskassan.se/arbetsgivare/sjukdom-och-skada/sjuklon)
- [Försäkringskassan: Om din medarbetare blir sjuk](https://www.forsakringskassan.se/arbetsgivare/sjukdom-och-skada/sjuk-medarbetare-dag-1-90)
- [Försäkringskassan: Karensavdrag](https://www.forsakringskassan.se/arbetsgivare/sjukdom-och-skada/om-din-medarbetare-blir-sjuk/karensavdrag)
- [Försäkringskassan: Sarskilt högriskskydd](https://www.forsakringskassan.se/arbetsgivare/ersattningar-och-bidrag/sjuk-ofta-eller-lange---sarskilt-hogriskskydd)
- [Verksamt: Sjukskrivning och sjukfrånvaro](https://verksamt.se/personal-rekrytering/nar-en-anstalld-blir-sjuk/sjukskrivning)
- [LÖNEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md](C:/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/domankarta-rebuild/LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md)
