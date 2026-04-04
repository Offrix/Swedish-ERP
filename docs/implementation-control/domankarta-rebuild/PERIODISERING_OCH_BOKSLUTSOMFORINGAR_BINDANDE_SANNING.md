# PERIODISERING_OCH_BOKSLUTSOMFORINGAR_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för hela periodiserings- och bokslutsomforingsflödet.

Detta dokument ska styra:
- periodisering av kostnader och intäkter över periodgranser
- upplupna kostnader
- upplupna intäkter
- förutbetalda kostnader
- förutbetalda intäkter
- bokslutstransaktioner och cutoff
- reversering eller konsumtion i efterföljande period
- materialitets- och förenklingsregler där regelverk uttryckligen tillater det
- export, audit och replay för periodiseringsverifikationer

Ingen kod, inget test, ingen bokslutsrutin, ingen rapport, ingen UI-vy och ingen migration får definiera avvikande truth för periodiseringskedjan utan att detta dokument skrivs om först.

## Syfte

Detta dokument finns för att läsaren ska kunna bygga hela periodiseringskedjan utan att gissa:
- när en utgift ska stanna i innevarande period och när den ska flyttas
- när en inkomst är upplupen respektive förutbetald
- vilka konton som får bara interimsposter
- hur bokslutsomforingar ska reverseras eller förbrukas
- hur K1/K2/K3 och årsbokslutsregler får paverka graden av periodisering
- hur moms, AP, ÄR och huvudbok ska samspela utan dubbelbokning eller för tidig effekttagning

## Omfattning

Detta dokument omfattar:
- periodisering av ordinary operating expenses och operating revenue
- cutoff när prestation eller förbrukning stracker sig över balansdagen
- upplupen kostnad utan mottagen faktura
- upplupen intäkt utan utskickad faktura
- förutbetald kostnad som avser kommande period
- förutbetald intäkt för ej utford prestation
- reversal eller konsumtion i efterföljande period
- materialitetsbedomning och förenklingsregler enligt relevant K-regelverk
- year-end closing adjustments som inte ägs av anläggningstillgangar, lager eller skatt
- migration och replay av historiska periodiseringar

Detta dokument omfattar inte:
- avskrivningar på anläggningstillgangar
- lagervardering eller COGS-cutoff
- slutlig skatt, bokslutsdispositioner eller årsredovisningens fulla upprattande
- seller-side invoice issue i sig
- supplier invoice issue i sig
- payrollspecifika semester- eller lönereserver utom när framtida lönedok explicit lutar på denna mekanism

Kanonisk agarskapsregel:
- detta dokument äger när en post ska flyttas mellan perioder via interimskonto eller bokslutsomforing
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` äger själva voucher-karnan, seriepolicy, period locks och export av dessa verifikationer
- flödesbiblar för faktura, levfaktura, bank, moms och payroll äger sina affärshandelser men inte periodiseringsbeslutet när cutoff-logik tar över

## Absoluta principer

- periodisering får aldrig användas för att dolja felklassad affärshandelse
- en periodiseringsverifikation får aldrig ersätta saknad legal source truth; den får bara flytta timing
- avdragsgill ingående moms får inte lyftas tidigare an vad AP-/momsreglerna tillater
- periodisering får aldrig skapa eller doda reskontra; den ska bara justera periodens resultat och balans
- bokslutsomforingar får aldrig skrivas över i efterhand; rättelse ska ske med correction chain
- om förenklingsregel används måste regelverket, beloppsgrans och motivering vara explicit dokumenterad
- faktiska prestationer och förbrukning styr periodisering, inte betalningsdatum i sig
- samma ekonomiska verklighet får aldrig periodiseras dubbelt via flera parallella rulesets

## Bindande dokumenthierarki för periodiserings- och bokslutsomforingsflödet

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- detta dokument
- `Bokföringslag (1999:1078)` hos Sveriges riksdag
- Bokföringsnamndens vägledning om bokföring
- tillämpligt K-regelverk enligt Bokföringsnamnden

Detta dokument lutar på:
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` för vouchers, serier, kontrollkonton, correction chains, period locks och SIE4-vouchertruth
- `FAKTURAFLODET_BINDANDE_SANNING.md` för seller-side source truth när periodisering utgar från issued eller ej issued revenue events
- `LEVFAKTURAFLODET_BINDANDE_SANNING.md` för supplier-side source truth när periodisering utgar från supplier expense events
- `MOMSFLODET_BINDANDE_SANNING.md` för VAT-side effect och blockerregler när input/output VAT annars riskerar hamna i fel period
- `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md` endast för cash timing evidence när bokslutscutoff behover bankunderlag

Detta dokument får inte overstyras av:
- gamla boksluts-excelfiler
- gamla manuella periodiseringsjournaler
- gamla antäganden om att belopp under en viss grans alltid får hoppas över oavsett regelverk
- gamla supportknappar som förbrukar periodisering genom direkt DB-update

## Kanoniska objekt

- `PeriodizationDecision`
  - bar bindande beslut om att intäkt eller kostnad ska flyttas över periodgranser
  - innehåller source scope, periodization class, covered period, amount basis, framework basis och reversal policy

- `CutoffEvidenceSet`
  - bar de underlag som visar när prestation eller förbrukning hor hemma
  - innehåller service period, delivery period, contract period, supporting documents och reviewer verdict

- `DeferredExpenseAsset`
  - bar förutbetald kostnad som ska kostnadsforas i senare period
  - canonical balansfamilj är `17xx`

- `AccruedExpenseLiability`
  - bar upplupen kostnad för prestation som hor till perioden men där full AP-truth inte finns per balansdag
  - canonical balansfamilj är `29xx`

- `AccruedIncomeAsset`
  - bar upplupen intäkt för prestation som hor till perioden men som inte fakturerats eller reglerats fullt ut
  - canonical balansfamilj är `17xx`

- `DeferredIncomeLiability`
  - bar förutbetald intäkt för prestation som annu inte utforts
  - canonical balansfamilj är `29xx`

- `ClosingAdjustmentVoucher`
  - bar canonical bokslutsomforing created from a `PeriodizationDecision`

- `ReversalSchedule`
  - bar hur periodiseringsverifikation ska återforas eller förbrukas i efterföljande period

- `ClosingCutoffWindow`
  - bar periodens cutoff state, tillaten bokslutsomforing och approval boundary

- `ClosingChecklistItem`
  - bar auditbar kontrollpunkt per periodiseringstyp

- `PeriodizationMigrationRecord`
  - bar historisk periodisering imported from previous system

## Kanoniska state machines

### `PeriodizationDecision`

- `draft`
- `evidence_ready`
- `review_pending`
- `approved`
- `posted`
- `reversed`
- `consumed`
- `superseded`

### `ReversalSchedule`

- `planned`
- `ready_for_posting`
- `posted`
- `skipped_with_reason`
- `invalidated`

### `ClosingCutoffWindow`

- `open`
- `review_only`
- `closing_locked`
- `reopened_for_correction`
- `closed`

### `ClosingChecklistItem`

- `open`
- `evidence_attached`
- `approved`
- `waived_with_reason`
- `failed`

## Kanoniska commands

- `AssessPeriodizationNeed`
- `AttachCutoffEvidence`
- `ApprovePeriodizationDecision`
- `PostClosingAdjustmentVoucher`
- `ScheduleReversal`
- `PostScheduledReversal`
- `ConsumeDeferredBalance`
- `LockClosingCutoffWindow`
- `ReopenClosingCutoffWindowForCorrection`
- `RegisterPeriodizationMigrationRecord`
- `InvalidateDuplicatePeriodization`

## Kanoniska events

- `PeriodizationNeedAssessed`
- `CutoffEvidenceAttached`
- `PeriodizationApproved`
- `ClosingAdjustmentVoucherPosted`
- `ReversalScheduled`
- `ReversalPosted`
- `DeferredBalanceConsumed`
- `ClosingCutoffWindowLocked`
- `ClosingCutoffWindowReopened`
- `PeriodizationMigrationRegistered`
- `DuplicatePeriodizationBlocked`

## Kanoniska route-familjer

- `/v1/closing/periodizations/*`
  - får skapa beslut, review och posting commands

- `/v1/closing/cutoff/*`
  - får läsa och läsa cutoff windows

- `/v1/closing/reversals/*`
  - får skapa och exekvera reversal schedules

- `/v1/closing/checklists/*`
  - får läsa och kvittera checklist items med evidence

Förbjudna route-monstrar:
- direktpatch mot postad periodiseringsverifikation
- UI-driven override som hoppar över cutoff evidence
- adminvag som markerar periodisering som konsumerad utan voucher eller uttrycklig skip-reason

## Kanoniska permissions och review boundaries

- `closing.periodization.read`
- `closing.periodization.prepare`
- `closing.periodization.approve`
- `closing.periodization.post`
- `closing.cutoff.lock`
- `closing.cutoff.reopen`
- `closing.reversal.post`

Review boundaries:
- periodiseringar som paverkar balanskonton i `17xx` eller `29xx` krav er finance review
- förenklingsregel under K2/årsbokslut krav er explicit framework flag och motivering
- support/backoffice får aldrig skapa eller posta bokslutsomforing
- återöppning av stangd cutoff window krav er dubbelreview

## Nummer-, serie-, referens- och identitetsregler

- periodiseringsverifikationer ska som canonical policy ligga i serie `D` eller `M` beroende på om de är live-closing eller migration
- varje `PeriodizationDecision` ska ha eget immutable id
- varje `ClosingAdjustmentVoucher` ska peka på exakt en `PeriodizationDecision`
- varje `ReversalSchedule` ska peka på exakt en periodiseringsverifikation eller ett explicit consumed-balance-spor
- samma source scope får aldrig ge flera öppna periodiseringsbeslut för samma covered period och samma rule profile

## Valuta-, avrundnings- och omräkningsregler

- periodisering sker i redovisningsvaluta
- source-belopp i annan valuta får endast periodiseras efter omräkning enligt canonical FX-regel
- avrundning får inte skapa dold resultatpost; avrundningsdifferens ska hanteras enligt bokföringskarnans rounding policy
- om source-belopp senare faktureras eller fakturerats i annan kurs ska FX-effekten ligga i respektive owner flow, inte i periodiseringsbeslutets grundlogik

## Replay-, correction-, recovery- och cutover-regler

- replay får aldrig skapa ny periodisering om samma source scope och covered period redan har aktivt beslut
- correction av periodisering ska ske via ny verifikation, inte overwrite
- periodiseringar importerade vid migration måste markeras som `migration`
- reversal schedules får inte genereras dubbelt efter replay
- när invoice eller AP senare anlader efter bokslut ska original periodisering reverseras eller konsumeras explicit innan owner flow tar full effekt

## Huvudflödet

1. source scope identifieras som kandidat för cutoff eller periodisering
2. serviceperiod, prestationsperiod eller förbrukningsperiod faststalls
3. relevant framework och eventuell förenklingsregel kontrolleras
4. periodization class valjs: förutbetald kostnad, upplupen kostnad, upplupen intäkt eller förutbetald intäkt
5. `PeriodizationDecision` reviewas och godkänns
6. `ClosingAdjustmentVoucher` postas
7. `ReversalSchedule` eller consumption path skapas
8. cutoff window stangs
9. i efterföljande period postas reversal eller konsumtion innan full normal source effect dubblas

## Bindande scenarioaxlar

- framework:
  - K1_simplified
  - K2_annual_accounts
  - K3_or_full_ruleset

- source family:
  - expense_with_invoice
  - expense_without_invoice
  - revenue_not_invoiced
  - revenue_prebilled
  - bank_evidence_only
  - migration_historic

- period relation:
  - within_same_period
  - crosses_year_end
  - crosses_month_end
  - multi_period

- VAT profile:
  - deductible_vat_exists
  - no_vat
  - vat_not_yet_deductible
  - non_deductible_vat

- reversal mode:
  - full_auto_reversal
  - staged_consumption
  - no_reversal_allowed_blocked

## Bindande policykartor

### Canonical interim account families

- förutbetalda kostnader -> `17xx`, canonical default `1730`
- upplupna intäkter -> `17xx`, canonical default `1790`
- förutbetalda intäkter -> `29xx`, canonical default `2970`
- upplupna kostnader -> `29xx`, canonical default `2990`

### Framework-driven simplification policy

- K1/K2/förenklat årsbokslut får endast använda förenklingsregel om entity profile uttryckligen tillater det
- artificiell uppdelning för att hamna under gransvarde är absolut förbjuden
- om framework inte är explicit satt ska systemet bete sig som om full periodisering krävs

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `PRD-P0001` förutbetald kostnad vid bokslut
  - debet `1730` `9 000`
  - kredit `6310` `9 000`

- `PRD-P0002` reversal av `PRD-P0001` i nasta period
  - debet `6310` `9 000`
  - kredit `1730` `9 000`

- `PRD-P0003` upplupen kostnad utan mottagen faktura
  - debet `5010` `15 000`
  - kredit `2990` `15 000`

- `PRD-P0004` supplier invoice i nasta period som konsumerar upplupen kostnad
  - debet `2990` `15 000`
  - debet `2641` `3 750`
  - kredit `2440` `18 750`

- `PRD-P0005` upplupen intäkt utan utskickad faktura
  - debet `1790` `20 000`
  - kredit `3041` `20 000`

- `PRD-P0006` reversal av `PRD-P0005` innan eller i samband med ordinarie invoice issue
  - debet `3041` `20 000`
  - kredit `1790` `20 000`

- `PRD-P0007` förutbetald intäkt vid bokslut
  - debet `3041` `30 000`
  - kredit `2970` `30 000`

- `PRD-P0008` intäktsforing av tidigare förutbetald intäkt
  - debet `2970` `30 000`
  - kredit `3041` `30 000`

- `PRD-P0009` non-deductible VAT följer med förutbetald kostnad
  - debet `1730` `12 500`
  - kredit `6072` `12 500`

- `PRD-P0010` blocked attempt to lyfta input VAT via periodisering utan AP/VAT-underlag
  - utfall: blocked review

- `PRD-P0011` blocked duplicate periodisering för samma source scope och samma covered period
  - utfall: ingen ny voucher

- `PRD-P0012` blocked simplification misuse via artificial split
  - utfall: full periodisering krävs

## Bindande rapport-, export- och myndighetsmappning

- varje periodiseringsverifikation ska synas i:
  - grundbok
  - huvudbok
  - provbalans
  - SIE4
- periodisering får inte direkt mappas till momsdeklaration om den inte samtidigt har giltig moms-side source enligt `MOMSFLODET_BINDANDE_SANNING.md`
- closing checklist ska kunna visa vilka interimposter som är öppna vid periodslut

## Bindande scenariofamilj till proof-ledger och rapportspar

- `PRD-A001` förutbetald kostnad -> `PRD-P0001` + `PRD-P0002` -> huvudbok, provbalans, SIE4
- `PRD-A002` upplupen kostnad -> `PRD-P0003` + `PRD-P0004` -> huvudbok, provbalans, AP handoff
- `PRD-A003` upplupen intäkt -> `PRD-P0005` + `PRD-P0006` -> huvudbok, provbalans, ÄR handoff
- `PRD-A004` förutbetald intäkt -> `PRD-P0007` + `PRD-P0008` -> huvudbok, provbalans, revenue recognition
- `PRD-B001` non-deductible VAT in prepaid expense -> `PRD-P0009`
- `PRD-B002` forbidden early VAT lift -> `PRD-P0010`
- `PRD-C001` duplicate periodization blocked -> `PRD-P0011`
- `PRD-C002` simplification misuse blocked -> `PRD-P0012`

## Tvingande dokument- eller indataregler

Varje periodiseringsbeslut måste ha:
- source scope
- covered period start/slut
- framework basis
- reason code
- amount basis
- reversal policy
- cutoff evidence

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `PRD-R001` deferred_expense
- `PRD-R002` accrued_expense
- `PRD-R003` accrued_income
- `PRD-R004` deferred_income
- `PRD-R005` auto_reversal
- `PRD-R006` staged_consumption
- `PRD-R007` simplification_allowed
- `PRD-R008` simplification_blocked

## Bindande faltspec eller inputspec per profil

### Deferred expense profile

Obligatoriska fält:
- `sourceVoucherId`
- `coveredFrom`
- `coveredTo`
- `netAmount`
- `frameworkProfile`
- `reversalMode`

### Accrued expense profile

Obligatoriska fält:
- `servicePeriod`
- `evidenceRefs[]`
- `netAmount`
- `expectedInvoiceWindow`
- `frameworkProfile`

### Accrued income profile

Obligatoriska fält:
- `performanceEvidence`
- `contractOrOrderRef`
- `amountBasis`
- `reversalMode`

### Deferred income profile

Obligatoriska fält:
- `receivedOrIssuedRef`
- `unperformedPortionBasis`
- `coveredFuturePeriod`
- `recognitionPlan`

## Scenariofamiljer som hela systemet måste tacka

- `PRD-A001` deferred_expense_year_end
- `PRD-A002` accrued_expense_no_invoice
- `PRD-A003` accrued_income_not_invoiced
- `PRD-A004` deferred_income_not_yet_performed
- `PRD-B001` non_deductible_vat_prepaid
- `PRD-B002` early_input_vat_blocked
- `PRD-C001` duplicate_periodization_blocked
- `PRD-C002` simplification_abuse_blocked
- `PRD-D001` migration_historic_deferred_expense
- `PRD-D002` migration_historic_accrued_expense

## Scenarioregler per familj

- `PRD-A001`
  - får bara skapa kostnadsflyttning, inte ny AP-skuld

- `PRD-A002`
  - får inte skapa input VAT innan AP/VAT-truth tillater det

- `PRD-A003`
  - får inte skapa ÄR-reskontra utan ska bara skapa interimstillgang tills invoice flow tar över

- `PRD-A004`
  - får inte skapa dubbel intäkt; normal intäkt måste vara flyttad till `2970`

- `PRD-B001-B002`
  - momslogik styrs av moms/AP docs; periodisering får inte overstyra dem

- `PRD-C001-C002`
  - ska blockera och skapa review case

- `PRD-D001-D002`
  - ska vara idempotenta över migration batch digest

## Blockerande valideringar

- service- eller prestationsperiod saknas
- framework profile saknas
- förenklingsregel anropas utan att entity profile tillater det
- deductible VAT ingar i periodiserat interimsaldo utan giltig moms-side rule
- duplicate open periodization exists för same source scope and same covered period
- hard-locked closing window utan explicit reopen approval

## Rapport- och exportkonsekvenser

- interimkonton ska kunna visas separat i provbalans och closing checklist
- öppna periodiseringar ska kunna visas per period och kommande reversal date
- SIE4-export ska inkludera periodiseringsverifikationer i samma serie/nummer som runtime

## Förbjudna förenklingar

- att alltid hoppa över periodisering under ett lokalt satt gransvarde utan framework support
- att periodisera bruttobelopp inklusive avdragsgill VAT när VAT egentligen tillhor AP/VAT truth
- att periodisering skapar reskontraobjekt
- att reversal sker genom overwrite av original

## Fler bindande proof-ledger-regler för specialfall

- `PRD-P0013` staged consumption of prepaid expense
  - debet relevant kostnadskonto
  - kredit `1730`

- `PRD-P0014` staged recognition of deferred income
  - debet `2970`
  - kredit relevant intäktskonto

- `PRD-P0015` blocked missing performance evidence för accrued income
  - utfall: ingen voucher

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `PRD-P0001-P0002` får inte skapa ÄR eller AP
- `PRD-P0003-P0004` skapar endast interim liability tills AP-event anlader
- `PRD-P0005-P0006` skapar endast interim asset tills ÄR/invoice-event anlader
- `PRD-P0007-P0008` skapar endast deferred revenue liability, inte ny kundfordran
- blocked proof-ledgers skapar endast review case

## Bindande verifikations-, serie- och exportregler

- live periodiseringar ska defaulta till serie `D`
- migrerade historiska periodiseringar ska defaulta till serie `M`
- reversal ska peka på originalverifikation via `CorrectionVoucherLink` eller `ReversalSchedule`
- export scope för year-end måste kunna visa bade periodiseringsvoucher och senare reversal

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- framework x amount threshold
- source family x VAT profile
- year-end x month-end
- auto-reversal x staged-consumption
- migration x live runtime

## Bindande fixture-klasser för periodiserings- och bokslutsomforingsflödet

- `PRD-FXT-001` annual insurance prepaid
- `PRD-FXT-002` year-end accrued rent
- `PRD-FXT-003` performed service not invoiced
- `PRD-FXT-004` prepaid service contract not yet delivered
- `PRD-FXT-005` simplification-threshold edge case
- `PRD-FXT-006` duplicate periodization case
- `PRD-FXT-007` migrated historic accrual

## Bindande expected outcome-format per scenario

Varje scenario måste skriva ut:
- scenario-id
- fixture class
- framework
- period class
- proof-ledger ids
- interim account family
- reversal mode
- export effect
- blocker eller success verdict

## Bindande canonical verifikationsseriepolicy

- live-closing vouchers -> `D`
- migration historical closing vouchers -> `M`
- owner-flow serier får inte återanvändas för rena bokslutsomforingar om inte bokföringskarnan uttryckligen tillater det

## Bindande expected outcome per central scenariofamilj

### `PRD-A001`

- fixture: `PRD-FXT-001`
- expected:
  - `PRD-P0001` i closing period
  - `PRD-P0002` i efterföljande period eller staged consumption plan

### `PRD-A002`

- fixture: `PRD-FXT-002`
- expected:
  - `PRD-P0003` utan input VAT
  - `PRD-P0004` när faktura anlader

### `PRD-A003`

- fixture: `PRD-FXT-003`
- expected:
  - `PRD-P0005`
  - `PRD-P0006` innan normal invoice-posting ger full revenue effect

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `PRD-A001` -> success -> `PRD-P0001` + `PRD-P0002`
- `PRD-A002` -> success -> `PRD-P0003` + `PRD-P0004`
- `PRD-A003` -> success -> `PRD-P0005` + `PRD-P0006`
- `PRD-A004` -> success -> `PRD-P0007` + `PRD-P0008`
- `PRD-B001` -> success -> `PRD-P0009`
- `PRD-B002` -> blocked -> `PRD-P0010`
- `PRD-C001` -> blocked -> `PRD-P0011`
- `PRD-C002` -> blocked -> `PRD-P0012`
- `PRD-D001` -> success -> migration voucher
- `PRD-D002` -> success -> migration voucher

## Bindande testkrav

- varje scenariofamilj ska ha minst en deterministisk fixture
- threshold edge cases ska testas per framework profile
- deductible VAT får aldrig bli grön i accrued expense test utan relevant AP/VAT-handoff
- duplicate periodization ska testas via replay och dubbel cutoff-run
- reversal och staged consumption ska testas över period boundary

## Källor som styr dokumentet

- Sveriges riksdag: [Bokföringslag (1999:1078)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/bokforingslag-19991078_sfs-1999-1078/)
- Bokföringsnamnden: [Vägledning Bokföring till BFNAR 2013:2](https://www.bfn.se/wp-content/uploads/remiss-vagledning-bokforing-2024.pdf)
- Bokföringsnamnden: [K2 årsredovisning och årsbokslut](https://www.bfn.se/wp-content/uploads/2020/06/remiss-vagledning-k2arsbokslut-1.pdf)
- BAS: [Kontoplan BAS 2025](https://www.bas.se/wp-content/uploads/2025/01/Kontoplan-BAS-2025.pdf)
