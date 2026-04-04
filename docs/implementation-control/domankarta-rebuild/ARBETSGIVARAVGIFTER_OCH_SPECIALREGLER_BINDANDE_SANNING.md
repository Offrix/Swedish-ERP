# ARBETSGIVARAVGIFTER_OCH_SPECIALREGLER_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för arbetsgivaravgifter och narliggande specialregler i svensk payroll.

Detta dokument ska styra:
- full arbetsgivaravgift
- age-67-plus-regim
- fodda 1937 eller tidigare
- tillfälliga nedsättningar som är official-source-pinnade
- växa-stöd
- special payroll contribution basis per line family
- blocked unsupported or unverified specialfall

## Syfte

Detta dokument finns för att:
- varje payroll run ska kunna förklara exakt varfor en viss avgiftsregim valdes
- arbetsgivaravgifter aldrig ska beräknas med för grova bucketmodeller
- växa-stöd och tillfälliga nedsättningar inte ska maskeras som vanlig avgiftsprocent
- replay, correction och migration ska kunna läsa samma contribution decision truth

## Omfattning

Detta dokument omfattar:
- contribution decision classes
- contribution year and legal period baselines
- contribution basis by line family
- age-related regimes
- växa-stöd treatment
- temporary youth reduction treatment when official and effective
- international or treaty-based specialfall as explicit evidence paths or blocked scenarios

Detta dokument omfattar inte:
- preliminarskatt
- AGI faltkoder i detalj
- postingkonton
- pensionsarskild löneskatt
- benefit valuation

## Absoluta principer

- arbetsgivaravgift får aldrig beräknas utan pinned legal period och official-source baseline
- samma löneart får aldrig samtidigt ligga i full, 67+, youth reduction och no-contribution regime
- växa-stöd får aldrig maskeras som om grundavgiften inte uppstöd om official process kraver återbetalning i efterhand
- unsupported internationella socialforsakringsspecialfall får aldrig autopostas som full svensk avgift utan explicit policy
- aged-based regimes måste avgoras av alder vid årets ingang när official rules sager det
- line basis för contribution must come from canonical pay item and benefit truth, never fri UI-tolkning

## Bindande dokumenthierarki för arbetsgivaravgifter och specialregler

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
- Socialavgiftslagen
- Skatteverkets arbetsgivaravgiftsregler
- official 2026-belopp-och-procent
- official växa-stöd pages

## Kanoniska objekt

- `EmployerContributionDecision`
- `ContributionRulepackVersion`
- `ContributionBasisProfile`
- `ContributionEligibilityEvidence`
- `VaxaSupportCase`
- `TemporaryReductionCase`
- `InternationalContributionCase`
- `EmployerContributionReceipt`

## Kanoniska state machines

### `EmployerContributionDecision`

- `draft`
- `verified`
- `active`
- `superseded`
- `expired`

### `VaxaSupportCase`

- `draft`
- `eligible`
- `applied`
- `refund_pending`
- `refund_received`
- `rejected`

### `InternationalContributionCase`

- `draft`
- `review_pending`
- `approved`
- `blocked`

## Kanoniska commands

- `RegisterEmployerContributionDecision`
- `VerifyEmployerContributionDecision`
- `ActivateEmployerContributionDecision`
- `OpenVaxaSupportCase`
- `ApplyTemporaryReductionCase`
- `ApproveInternationalContributionCase`
- `FreezeEmployerContributionDecisionIntoPayRun`

## Kanoniska events

- `EmployerContributionDecisionRegistered`
- `EmployerContributionDecisionVerified`
- `EmployerContributionDecisionActivated`
- `VaxaSupportCaseOpened`
- `TemporaryReductionApplied`
- `InternationalContributionCaseApproved`
- `EmployerContributionDecisionFrozenIntoPayRun`

## Kanoniska route-familjer

- `/v1/payroll/employer-contribution-decisions/*`
- `/v1/payroll/växa-support/*`
- `/v1/payroll/contribution-special-cases/*`

## Kanoniska permissions och review boundaries

- `payroll.contribution.manage`
- `payroll.contribution.approve`
- `payroll.contribution.special_case.review`

Review boundaries:
- ordinary full and 67+ regimes require payroll review
- temporary reduction cases require payroll + finance review
- växa-stöd requires payroll + finance review
- international specialfall require regulatory review

## Nummer-, serie-, referens- och identitetsregler

- varje `EmployerContributionDecision` måste ha globalt unikt `contributionDecisionId`
- samma employment får inte ha mer an en aktiv contribution decision för samma effective period
- every special-case regime must carry evidence ref and rulepack version

## Valuta-, avrundnings- och omräkningsregler

- contribution basis and contribution amount are calculated in `SEK`
- foreign source amounts must be converted before contribution calculation
- oreavrundning follows official contribution calculation chain

## Replay-, correction-, recovery- och cutover-regler

- replay must load same contribution decision and same rulepack version as original run
- correction får inte läsa dagens avgiftsregim om historisk period hade annan regel
- imported contribution histories must map to canonical decision classes

## Huvudflödet

1. canonical contribution basis is resolved from pay items and benefit truth
2. eligibility för standard or reduced regime is checked
3. official rulepack för legal period is loaded
4. contribution decision is frozen into pay run
5. calculation receipt is built
6. downstream posting and AGI consume frozen result

## Bindande scenarioaxlar

- `contributionRegime`
  - `full_rate`
  - `age_67_plus`
  - `born_1937_or_earlier`
  - `temporary_youth_reduction`
  - `vaxa_support_refund_model`
  - `international_special_case`

- `basisFamily`
  - `cash_salary_basis`
  - `benefit_basis`
  - `taxable_allowance_basis`
  - `gross_salary_deduction_basis`
  - `no_contribution_basis`

- `effectivePeriodFamily`
  - `calendar_year_static`
  - `mid_year_statutory_change`
  - `temporary_measure_window`

## Bindande policykartor

### Canonical official baseline 2026

- full arbetsgivaravgift: `31.42%`
- 67+ vid årets ingang: `10.21%`
- fodda 1937 eller tidigare: `0%`
- temporary youth reduction 1 april 2026 till 30 september 2027:
  - `20.81%`
  - lönetak `25 000 SEK` per manad

### Växa-stöd policy

- from redovisningsperiod januari 2026:
  - systemet ska behandla växa-stöd som refund-based support path when official process requires application för refund
  - contribution basis uppstår först enligt official contribution regime
  - support effect redovisas via separat evidence and refund path, not by silently replacing liability truth

### International special-case policy

- if social insurance conventions, utsandningsfall or foreign social-security certificates are not fully evidenced:
  - `blocked_international_contribution_case`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

Detta dokument äger frozen contribution outcome, inte final postingkonto.

### AGA-P0001 Full rate

- fields:
  - `contributionRegime = full_rate`
  - `contributionRate = 31.42%`

### AGA-P0002 Age 67 plus

- fields:
  - `contributionRegime = age_67_plus`
  - `contributionRate = 10.21%`

### AGA-P0003 Born 1937 or earlier

- fields:
  - `contributionRegime = born_1937_or_earlier`
  - `contributionRate = 0%`

### AGA-P0004 Temporary youth reduction

- fields:
  - `contributionRegime = temporary_youth_reduction`
  - `contributionRate = 20.81%`
  - `monthlyCap = 25000`

### AGA-P0005 Växa support refund model

- fields:
  - `contributionRegime = vaxa_support_refund_model`
  - `baseContributionCalculated = true`
  - `refundPathRequired = true`

### AGA-P0006 International special case approved

- fields:
  - `contributionRegime = international_special_case`
  - explicit evidence required

### AGA-P0007 Invalid or unsupported special case

- result:
  - `blocked_contribution_decision`

## Bindande rapport-, export- och myndighetsmappning

- every contribution outcome must publish:
  - `contributionRegime`
  - `contributionRate`
  - `basisAmount`
  - `rulepackVersion`
  - `specialCaseEvidenceRef`

## Bindande scenariofamilj till proof-ledger och rapportspar

- `AGA-A001 full_rate_cash_salary -> AGA-P0001`
- `AGA-A002 full_rate_benefit -> AGA-P0001`
- `AGA-B001 age_67_plus -> AGA-P0002`
- `AGA-C001 born_1937_or_earlier -> AGA-P0003`
- `AGA-D001 temporary_youth_reduction -> AGA-P0004`
- `AGA-E001 vaxa_support_refund -> AGA-P0005`
- `AGA-F001 international_special_case -> AGA-P0006`
- `AGA-Z001 invalid_or_unsupported -> AGA-P0007`

## Tvingande dokument- eller indataregler

Every active contribution decision must at least have:
- `employmentId`
- `contributionRegime`
- `effectiveFrom`
- `effectiveTo` when relevant
- `legalPeriodRef`
- `rulepackVersion`
- `reviewReceiptRef`

Temporary reduction cases must also have:
- statutory window evidence
- age eligibility evidence
- monthly cap handling policy

Växa support must also have:
- support eligibility evidence
- support start and end
- refund path linkage

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `AGA-R001 full_rate`
- `AGA-R002 age_67_plus`
- `AGA-R003 born_1937_or_earlier`
- `AGA-R004 temporary_youth_reduction`
- `AGA-R005 vaxa_support`
- `AGA-R006 international_special_case`
- `AGA-R007 blocked_invalid_case`

## Bindande faltspec eller inputspec per profil

### Full-rate profile

- `basisAmount`
- `legalPeriodRef`
- `rulepackVersion`

### 67-plus profile

- `yearStartAgeEvidence`
- `legalPeriodRef`

### 1937-or-earlier profile

- `birthYearEvidence`
- `legalPeriodRef`

### Temporary youth reduction profile

- `birthYearEvidence`
- `reductionWindowRef`
- `monthlyCapPolicy`

### Växa support profile

- `supportEligibilityEvidence`
- `supportMonthCounter`
- `refundWorkflowBinding`

## Scenariofamiljer som hela systemet måste tacka

- full contribution on cash salary
- full contribution on benefit basis
- age 67 plus
- born 1937 or earlier
- temporary youth reduction 2026 window
- växa-support refund path
- international special-case with evidence
- blocked unsupported special case

## Scenarioregler per familj

- full rate uses official full baseline
- 67+ uses age-at-start-of-year rule
- 1937-or-earlier gives zero
- temporary youth reduction only within official period and cap
- växa-support cannot silently replace ordinary contribution truth after january 2026
- international cases require explicit evidence or block

## Blockerande valideringar

- deny reduced regime if evidence does not match legal period
- deny youth reduction above cap without split logic
- deny växa support if eligibility evidence saknas
- deny international special case if certificate or convention basis saknas
- deny conflicting regimes on same basis amount

## Rapport- och exportkonsekvenser

- AGI and payroll traces must show selected contribution regime
- support and migration traces must preserve evidence refs

## Förbjudna förenklingar

- one generic contribution rate för all employees
- age check on payment date when law says start-of-year age
- växa support as hidden reduced rate without refund lane
- unsupported international cases defaulting to green

## Fler bindande proof-ledger-regler för specialfall

- temporary youth reduction must split capped and uncapped basis when amount exceeds threshold
- växa support must show both base contribution and support refund linkage
- if official temporary measures expire, replay must still use historical legal period

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `AGA-P0001-AGA-P0006`
  - affect employer contribution outcome only
  - final posting to payroll liability accounts is owned by payroll account truth

- `AGA-P0007`
  - blocked

## Bindande verifikations-, serie- och exportregler

- contribution decision receipts must export:
  - `contributionDecisionId`
  - `contributionRegime`
  - `rulepackVersion`
  - `effectiveFrom`
  - `effectiveTo`
  - `evidenceRef`

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- legal period
- age cohort
- basis family
- support eligibility
- domestic standard vs international special case

## Bindande fixture-klasser för arbetsgivaravgifter

- `AGA-FXT-001` full-rate salary
- `AGA-FXT-002` 67-plus salary
- `AGA-FXT-003` 1937-or-earlier salary
- `AGA-FXT-004` youth reduction capped
- `AGA-FXT-005` youth reduction above cap
- `AGA-FXT-006` växa support
- `AGA-FXT-007` international special case

## Bindande expected outcome-format per scenario

Every scenario must include:
- `scenarioId`
- `contributionRegime`
- `basisAmount`
- `expectedContributionAmount`
- `expectedBlockedOrAllowedStatus`
- `evidenceRef`

## Bindande canonical verifikationsseriepolicy

- contribution decision receipts belong to payroll decision series
- imported historical contribution decisions must be marked as imported and never masquerade as native live decisions

## Bindande expected outcome per central scenariofamilj

- `AGA-A001`
  - `contributionRate = 31.42%`
  - allowed

- `AGA-B001`
  - `contributionRate = 10.21%`
  - allowed

- `AGA-C001`
  - `contributionRate = 0%`
  - allowed

- `AGA-D001`
  - `contributionRate = 20.81%`
  - cap handling required

- `AGA-E001`
  - base contribution truth + refund path
  - allowed only with support evidence

- `AGA-Z001`
  - blocked

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- all `AGA-A*` -> full rate
- all `AGA-B*` -> 67-plus reduced rate
- all `AGA-C*` -> zero rate
- all `AGA-D*` -> temporary reduction
- all `AGA-E*` -> växa support refund model
- all `AGA-F*` -> evidenced international special case
- all `AGA-Z*` -> blocked

## Bindande testkrav

- unit tests för regime resolution by age cohort
- unit tests för historical legal-period replay
- unit tests för temporary youth reduction cap handling
- unit tests för växa support support-vs-base logic
- integration tests för contribution decision APIs
- integration tests för pay run freezing of contribution decisions
- migration tests för imported contribution histories

## Källor som styr dokumentet

- `DOMAIN_10_ROADMAP.md`
- `DOMAIN_10_IMPLEMENTATION_LIBRARY.md`
- `LONEFLODET_BINDANDE_SANNING.md`
- `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md`
- `packages/domain-payroll/src/index.mjs`
- `tests/unit/phase12-employer-contribution-decisions.test.mjs`
- `tests/integration/phase12-tax-decision-snapshots-api.test.mjs`
- [Riksdagen: Socialavgiftslag (2000:980)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/socialavgiftslag-2000980_sfs-2000-980/)
- [Skatteverket: Arbetsgivaravgifter](https://www.skatteverket.se/foretag/arbetsgivare/arbetsgivaravgifterochskatteavdrag/arbetsgivaravgifter.4.233f91f71260075abe8800020817.html)
- [Skatteverket: 2026 belopp och procent](https://www.skatteverket.se/privat/skatter/beloppochprocent/2026.4.1522bf3f19aea8075ba21.html)
- [Skatteverket: Regler för växa-stöd](https://www.skatteverket.se/foretag/arbetsgivare/arbetsgivaravgifterochskatteavdrag/vaxastod/reglerforvaxastod.4.361dc8c15312eff6fd37447.html)
- [Skatteverket: Nytt satt att ansoka om växa-stöd](https://www.skatteverket.se/omoss/pressochmedia/nyheter/2025/nyheter/nyttsattattansokaomvaxastodet.5.4a54dc8b19aa6175a15246a.html)
- [Skatteverket: Tjänstebeskrivning AGI inlamning](https://www7.skatteverket.se/portal-wapi/open/apier-och-oppna-data/utvecklarportalen/v1/getFile/tjanstebeskrivning-agd-inlamning)
