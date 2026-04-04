# AGI_FALTKARTA_OCH_RATTELSER_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för faltmappning mellan canonical payroll truth och Skatteverkets AGI-fält samt för detaljregler vid rättelser, borttag och specialrutor.

Detta dokument ska styra:
- individuppgiftsfalt
- huvuduppgiftens summor
- specialrutor för skattefri ersättning, benefits, SINK, A-SINK och internationella no-tax-beslut
- correction och removal på faltniva
- blockerregler för allt som saknar explicit faltmappning

## Syfte

Detta dokument finns för att:
- varje payroll line ska veta exakt vilken AGI-ruta den mappar till
- inga grova buckets eller fria texttolkningar ska kunna passera
- correction och borttag ska vara lika explicita på faltniva som på flödesniva
- unsupported AGI-fält ska blockeras i stallet för att approximera

## Omfattning

Detta dokument omfattar:
- individuppgiftsfalt för lön, förmåner, skatt och skattefria schablonersättningar
- huvuduppgiftsfalt som summeras från individuppgifter och huvudregelbeslut
- faltregler för SINK, A-SINK, skatteavtal, utlandsarbete och borttag
- bil- och drivmedelsforman inklusive nettoloneavdrag för drivmedel
- frånvarouppgifter på principiell nivå

Detta dokument omfattar inte:
- den overgripande submission-processen, som ägs av `AGI_FLODET_BINDANDE_SANNING.md`
- preliminarskattebeslutets sakliga beräkning
- arbetsgivaravgiftsbeslutets sakliga beräkning

## Absoluta principer

- varje payroll line eller decision som paverkar AGI måste ha exakt en explicit mappning eller uttrycklig blockerregel
- en individuppgift får bara ha ett skattefalt ifyllt eller kryssat
- när flera skattefalt är relevanta för samma person under samma period ska flera individuppgifter byggas
- ruta 018 ska alltid redovisa fullt uppraknat drivmedelsformansvarde; eventuell betalning redovisas separat i ruta 098
- skattefria bil- och traktamentsersättningar upp till schablon ska redovisas med kryss i ruta 050 respektive 051, inte som kontant lön
- belopp i AGI ska vara heltal
- allt som inte har explicit faltkarta är blockerat i live AGI

## Bindande dokumenthierarki för AGI-faltkarta och rättelser

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- `DOMAIN_10_ROADMAP.md`
- `DOMAIN_10_IMPLEMENTATION_LIBRARY.md`
- detta dokument

Detta dokument lutar på:
- `AGI_FLODET_BINDANDE_SANNING.md`
- `LONEFLODET_BINDANDE_SANNING.md`
- `PRELIMINARSKATT_OCH_SKATTETABELLER_BINDANDE_SANNING.md`
- `ARBETSGIVARAVGIFTER_OCH_SPECIALREGLER_BINDANDE_SANNING.md`
- `FORMANER_OCH_FORMANSBESKATTNING_BINDANDE_SANNING.md`
- `RESOR_TRAKTAMENTE_OCH_MILERSATTNING_BINDANDE_SANNING.md`

## Kanoniska objekt

- `AgiFieldMappingRule`
- `AgiIndividualFieldSet`
- `AgiMainReturnFieldSet`
- `AgiCorrectionFieldPlan`
- `AgiRemovalFieldPlan`
- `AgiFieldBlocker`

## Kanoniska state machines

### `AgiFieldMappingRule`

- `draft`
- `approved`
- `active`
- `superseded`

### `AgiCorrectionFieldPlan`

- `draft`
- `review_pending`
- `approved`
- `applied`
- `blocked`

### `AgiFieldBlocker`

- `open`
- `resolved`
- `waived`

## Kanoniska commands

- `RegisterAgiFieldMappingRule`
- `ApproveAgiFieldMappingRule`
- `BuildAgiIndividualFieldSet`
- `BuildAgiMainReturnFieldSet`
- `CreateAgiCorrectionFieldPlan`
- `CreateAgiRemovalFieldPlan`
- `BlockUnsupportedAgiFieldUsage`

## Kanoniska events

- `AgiFieldMappingRuleRegistered`
- `AgiFieldMappingRuleApproved`
- `AgiIndividualFieldSetBuilt`
- `AgiMainReturnFieldSetBuilt`
- `AgiCorrectionFieldPlanCreated`
- `AgiRemovalFieldPlanCreated`
- `AgiFieldUsageBlocked`

## Kanoniska route-familjer

- `POST /v1/payroll/agi/field-maps`
- `POST /v1/payroll/agi/field-sets/build`
- `POST /v1/payroll/agi/field-corrections`
- `POST /v1/payroll/agi/field-removals`

## Kanoniska permissions och review boundaries

- endast payroll/AGI-specialist får godkänna ny eller ändrad faltmappning
- support får inte handeditera AGI-rutor
- removal av individuppgift kraver dual review

## Nummer-, serie-, referens- och identitetsregler

- varje `AgiFieldMappingRule` ska ha `mappingRuleCode`
- varje individuppgift ska ha `specificationNumber`
- correction ska referera till tidigare `specificationNumber`
- removal ska referera till exakt period, person och specnummer

## Valuta-, avrundnings- och omräkningsregler

- samtliga numeriska AGI-belopp ska avrundas till hela kronor
- skattefria kryssrutor får inte kombineras med decimalbelopp

## Replay-, correction-, recovery- och cutover-regler

- faltmappningsversion ska frysas per AGI-package
- correction ska använda samma mapping version eller explicit supersession receipt
- migrerade historiska AGI-rättelser måste bevara gamla field outcomes

## Huvudflödet

1. payroll lines klassificeras till AGI field groups
2. skattefalt valjs
3. individuppgift byggs med explicit fältmappning
4. huvuduppgift summeras
5. correction eller removal plan byggs vid behov
6. package skickas genom AGI-flödet

## Bindande scenarioaxlar

- skattefalt: `001`, `114`, `274`, `275`, `276`
- ersättningstyp: `cash`, `benefit`, `tax_free_allowance`, `correction`, `removal`
- internationell profil: `domestic`, `sink`, `a_sink`, `tax_treaty_exempt`, `work_abroad_no_tax`
- benefit profile: `other_benefit`, `car_benefit`, `fuel_benefit`, `adjusted_benefit`
- main return profile: `ordinary`, `sick_pay_cost_present`

## Bindande policykartor

- `cash_compensation -> 011`
- `other_taxable_benefit -> 012`
- `car_benefit -> 013`
- `fuel_benefit_grossed_up -> 018`
- `expense_deduction_from_compensation -> 019`
- `benefit_adjusted_checkbox -> 048`
- `tax_free_car_allowance_checkbox -> 050`
- `tax_free_travel_allowance_checkbox -> 051`
- `employee_paid_fuel_benefit_via_net_deduction -> 098`
- `underlag_hus_benefit -> blocked_until_hus_doc`
- `preliminary_tax_withheld -> 001`
- `tax_exempt_under_tax_treaty -> 114`
- `sink_tax_withheld -> 274`
- `a_sink_tax_withheld -> 275`
- `decision_no_tax_due_to_non_swedish_taxation -> 276`
- `utsand_under_tid_required_with_276 -> 091`
- `main_return_total_employer_contributions -> 487`
- `main_return_total_tax_withheld -> 497`
- `main_return_sick_pay_cost -> 499`
- `remove_individual_return -> 205_or_service_equivalent`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

### AGIF-P0001 Ordinary taxable salary line

- sourceClass: `cash_compensation`
- field: `011`
- taxField: `001`

### AGIF-P0002 Other taxable benefit

- sourceClass: `other_taxable_benefit`
- field: `012`
- taxField: `001`

### AGIF-P0003 Car benefit

- sourceClass: `car_benefit`
- field: `013`
- taxField: `001`

### AGIF-P0004 Fuel benefit with employee payment

- sourceClass: `fuel_benefit`
- field: `018`
- offsetField: `098`
- taxField: `001`

### AGIF-P0005 Expense deduction from compensation

- sourceClass: `expense_deduction_from_compensation`
- grossField: `011`
- deductionField: `019`

### AGIF-P0006 Tax-free car allowance

- sourceClass: `tax_free_mileage`
- checkboxField: `050`
- noAmountField: `true`

### AGIF-P0007 Tax-free travel allowance

- sourceClass: `tax_free_travel_allowance`
- checkboxField: `051`
- noAmountField: `true`

### AGIF-P0008 SINK individual return

- sourceClass: `cash_or_benefit_sink`
- taxField: `274`

### AGIF-P0009 A-SINK individual return

- sourceClass: `cash_or_benefit_a_sink`
- taxField: `275`
- requiresField112WhenApplicable: `true`

### AGIF-P0010 Tax treaty exemption

- sourceClass: `tax_treaty_exempt_income`
- taxField: `114`

### AGIF-P0011 No-tax due to work abroad decision

- sourceClass: `work_abroad_no_tax`
- taxField: `276`
- requiresField091: `true`

### AGIF-P0012 Benefit adjusted by Skatteverket decision

- sourceClass: `adjusted_benefit`
- checkboxField: `048`
- targetFieldDependsOnBenefitType: `true`

### AGIF-P0013 Main return totals

- mainField487: `summa_arbetsgivaravgifter_och_slf`
- mainField497: `summa_skatteavdrag`
- mainField499: `sjuklonekostnad`

### AGIF-P0014 Removal of individual return

- removalField: `205_or_service_equivalent`
- sameIdentifiersRequired: `true`

### AGIF-P0015 Unsupported field usage blocked

- blockCode: `unsupported_agi_field_usage`

## Bindande rapport-, export- och myndighetsmappning

- individuppgifter ska kunna visas med faltkod per line origin
- huvuduppgift ska kunna visa exakt hur 487, 497 och 499 summerats
- correction export ska visa vilka fält som ersätts eller tagits bort

## Bindande scenariofamilj till proof-ledger och rapportspar

- `AGIF-A001 ordinary_salary -> AGIF-P0001 -> accepted`
- `AGIF-A002 other_taxable_benefit -> AGIF-P0002 -> accepted`
- `AGIF-A003 car_benefit -> AGIF-P0003 -> accepted`
- `AGIF-A004 fuel_benefit_with_employee_payment -> AGIF-P0004 -> accepted`
- `AGIF-A005 compensation_with_cost_deduction -> AGIF-P0005 -> accepted`
- `AGIF-A006 tax_free_mileage -> AGIF-P0006 -> accepted`
- `AGIF-A007 tax_free_travel_allowance -> AGIF-P0007 -> accepted`
- `AGIF-B001 sink -> AGIF-P0008 -> accepted`
- `AGIF-B002 a_sink -> AGIF-P0009 -> accepted`
- `AGIF-B003 tax_treaty_exempt -> AGIF-P0010 -> accepted`
- `AGIF-B004 work_abroad_no_tax -> AGIF-P0011 -> accepted`
- `AGIF-C001 adjusted_benefit -> AGIF-P0012 -> accepted`
- `AGIF-D001 main_return_totals -> AGIF-P0013 -> accepted`
- `AGIF-E001 removal -> AGIF-P0014 -> accepted`
- `AGIF-Z001 unsupported_field_usage -> AGIF-P0015 -> blocked`

## Tvingande dokument- eller indataregler

- `mappingRuleCode`
- `sourceLineClass`
- `targetFieldCode`
- `targetTaxFieldCode`
- `specificationNumber`
- `correctionReference`
- `removalReference`
- `mappingVersion`

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `AGIF-R001 ordinary_taxed_salary`
- `AGIF-R002 sink_tax`
- `AGIF-R003 a_sink_tax`
- `AGIF-R004 tax_treaty_exemption`
- `AGIF-R005 no_tax_work_abroad_decision`
- `AGIF-R006 adjusted_benefit`
- `AGIF-R007 removal`
- `AGIF-R008 unsupported_field_usage_block`

## Bindande faltspec eller inputspec per profil

- `specificationNumber`
- `recipientIdentity`
- `taxFieldCode`
- `field011Amount`
- `field012Amount`
- `field013Amount`
- `field018Amount`
- `field019Amount`
- `field048Checked`
- `field050Checked`
- `field051Checked`
- `field098Amount`
- `field091Value`
- `field487Amount`
- `field497Amount`
- `field499Amount`

## Scenariofamiljer som hela systemet måste tacka

- vanlig beskattad lön
- övriga skattepliktiga förmån er
- bilforman
- drivmedelsforman med nettoloneavdrag
- kostnadsavdrag på ersättning
- skattefri bilersättning
- skattefritt traktamente
- SINK
- A-SINK
- skatteavtalsbefrielse
- beslut om inget skatteavdrag vid utlandsarbete
- justerad förmån
- removal
- unsupported AGI field

## Scenarioregler per familj

- `AGIF-A001`: vanlig beskattad lön ska ga till `011` med exakt ett skattefalt
- `AGIF-A004`: drivmedelsforman ska redovisa fullt uppraknat förmånsvarde i `018` och betalning i `098`
- `AGIF-A005`: kostnadsavdrag ska redovisas med bruttoersättning i `011` och avdrag i `019`
- `AGIF-A006`: skattefri bilersättning upp till schablon ska endast markeras i `050`
- `AGIF-A007`: skattefritt traktamente upp till schablon ska endast markeras i `051`
- `AGIF-B004`: `276` får bara användas med beslut och ska kombineras med `091`
- `AGIF-E001`: removal ska ske med samma identifikatorer som felaktig post
- `AGIF-Z001`: saknad explicit mappning blockerar hela individuppgiften

## Blockerande valideringar

- deny individuppgift med mer an ett skattefalt
- deny `050` eller `051` om ersättningen inte är schablon- och regelgodkand
- deny `098` utan samtidig `018`
- deny `276` utan beslut och `091`
- deny `048` utan justerat förmånvarde-beslut
- deny unsupported source line class without explicit rule

## Rapport- och exportkonsekvenser

- AGI preview ska visa faltkod och källsystem för varje individrad
- correction diff ska visa gamla vs nya faltutfall
- removed individuppgift ska vara synlig i audit men inte i aktuell active field set

## Förbjudna förenklingar

- inga frihandsmappningar till `011`
- ingen bucket `taxable_benefit` utan explicit fält
- inget reducerat drivmedelsformansvarde i `018` på grund av nettoloneavdrag; reduktionen redovisas i `098`
- ingen fallback till preliminarskatt `001` om SINK/A-SINK/114/276 egentligen gäller

## Fler bindande proof-ledger-regler för specialfall

- om bilforman justerats ska `048` sattas samtidigt som justerat värde landar i `013`
- om bara skattefri bilersättning eller traktamente finns ska AGI fortfarande kunna byggas med kryssfalt utan löneruta
- absence transfer fields ska byggas från separat absence object och får inte gissas från lönearter

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `AGIF-P0013` skapar huvuduppgifts snapshot
- `AGIF-P0014` superseder tidigare individuppgift på faltniva
- `AGIF-P0015` skapar blockerfall utan submission

## Bindande verifikations-, serie- och exportregler

- AGI-faltkarta får aldrig skapa egen bokföring
- exported XML ska kunna traced till varje `AgiFieldMappingRule`
- mapping version ska vara del av AGI evidence bundle

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- domestic vs SINK vs A-SINK vs treaty vs work-abroad
- benefit adjusted vs not adjusted
- amount field vs checkbox-only field
- original vs correction vs removal

## Bindande fixture-klasser för AGI-faltkartan

- `AGIF-FXT-001` ordinary monthly salary
- `AGIF-FXT-002` benefit package with car and fuel
- `AGIF-FXT-003` tax-free mileage and tractamente
- `AGIF-FXT-004` SINK employee
- `AGIF-FXT-005` A-SINK artist
- `AGIF-FXT-006` treaty exemption
- `AGIF-FXT-007` work-abroad no-tax decision
- `AGIF-FXT-008` correction removal

## Bindande expected outcome-format per scenario

- `scenarioId`
- `fixtureClass`
- `expectedProofLedger`
- `expectedFieldCodes`
- `expectedTaxFieldCode`
- `expectedBlockedOrAllowedStatus`

## Bindande canonical verifikationsseriepolicy

- AGI-faltkartan är exportmapping och får inte skapa egen verifikationsserie
- correction/removal plans ska ha separat evidence-serie

## Bindande expected outcome per central scenariofamilj

### `AGIF-A004`

- fixture minimum: `AGIF-FXT-002`
- expected proof-ledger: `AGIF-P0004`
- expected field codes: `018,098`
- expected status: `allowed`

### `AGIF-B004`

- fixture minimum: `AGIF-FXT-007`
- expected proof-ledger: `AGIF-P0011`
- expected field codes: `276,091`
- expected status: `allowed`

### `AGIF-Z001`

- fixture minimum: `AGIF-FXT-008`
- expected proof-ledger: `AGIF-P0015`
- expected status: `blocked`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `AGIF-A001 -> AGIF-P0001 -> allowed`
- `AGIF-A002 -> AGIF-P0002 -> allowed`
- `AGIF-A003 -> AGIF-P0003 -> allowed`
- `AGIF-A004 -> AGIF-P0004 -> allowed`
- `AGIF-A005 -> AGIF-P0005 -> allowed`
- `AGIF-A006 -> AGIF-P0006 -> allowed`
- `AGIF-A007 -> AGIF-P0007 -> allowed`
- `AGIF-B001 -> AGIF-P0008 -> allowed`
- `AGIF-B002 -> AGIF-P0009 -> allowed`
- `AGIF-B003 -> AGIF-P0010 -> allowed`
- `AGIF-B004 -> AGIF-P0011 -> allowed`
- `AGIF-C001 -> AGIF-P0012 -> allowed`
- `AGIF-D001 -> AGIF-P0013 -> allowed`
- `AGIF-E001 -> AGIF-P0014 -> allowed`
- `AGIF-Z001 -> AGIF-P0015 -> blocked`

## Bindande testkrav

- unit tests för each supported field mapping rule
- unit tests för `018` + `098` drivmedelslogik
- unit tests för checkbox-only `050` and `051`
- unit tests blocking unsupported source classes
- unit tests för `276` requiring `091`
- integration tests för main return totals `487`, `497`, `499`
- integration tests för correction and removal field plans

## Källor som styr dokumentet

- [Skatteverket: Sa fyller du i arbetsgivardeklarationen](https://www.skatteverket.se/foretag/arbetsgivare/lamnaarbetsgivardeklaration/safyllerduiarbetsgivardeklarationen.4.2cf1b5cd163796a5c8b66a8.html)
- [Skatteverket: Ratta en arbetsgivardeklaration](https://skatteverket.se/foretag/arbetsgivare/lamnaarbetsgivardeklaration/rattaenarbetsgivardeklaration.4.2cf1b5cd163796a5c8b6698.html)
- [Skatteverket: Traktamente och bilersättning](https://skatteverket.se/foretag/arbetsgivare/lonochersattning/traktamenteochbilersattning.4.361dc8c15312eff6fd1703e.html)
- [Skatteverket: Drivmedelsforman](https://skatteverket.se/foretag/arbetsgivare/lonochersattning/formaner/bilforman/drivmedelsforman.4.3016b5d91791bf546791a89.html)
- [Skatteverket: Uppgiftsskyldighet vid utlandsarbete](https://skatteverket.se/foretag/arbetsgivare/internationellanstallning/sandautpersonalforarbeteutomlands/uppgiftsskyldighetvidutlandsarbete.4.71004e4c133e23bf6db800032744.html)
- [Skatteverket: SKV 401 utgava 29](https://www.skatteverket.se/download/18.7da1d2e118be03f8e4f54f6/1711100186363/skatteavdrag-och-arbetsgivaravgifter-skv401-utgava29.pdf)
- [AGI_FLÖDET_BINDANDE_SANNING.md](C:/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/domankarta-rebuild/AGI_FLODET_BINDANDE_SANNING.md)
