# SCENARIOPROOF_OCH_BOKFORINGSBEVIS_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för scenario proof, expected outcomes, bokföringsbevis, rapportparitet och mismatch-hantering.

## Syfte

Detta dokument ska låsa hur hela plattformen bevisar att varje supportat scenario ger exakt rätt objekttillstand, exakt rätt BAS-konto eller faltutfall, exakt rätt rapport och exakt rätt correction/replay-beteende.

## Omfattning

Detta dokument omfattar:
- scenariofamiljer
- variantmatriser
- fixtureklasser
- expected outcomes
- proof-ledgers
- mismatch-findingar
- waiver-förbud och accepted-risk-granser
- execution receipts

Detta dokument omfattar inte:
- själva detaljreglerna i varje affärsflöde
- load testing eller chaos experiments som egen disciplin

## Absoluta principer

- inget supportat scenario får sakna explicit expected outcome
- bokföringsdrivande scenarier får aldrig valideras med "ungefar rätt"
- ett scenario är inte grönt för att API:t svarade; det är grönt för att full outcome matchar facit
- unknown scenario får inte autopostas eller greenmarkeras
- mismatch får inte dorras i dashboards; den måste vara receipt-sakrad, triagerad och stangd
- accepted risk får aldrig ersätta bokföringsfel, myndighetsfel eller ledger drift

## Bindande dokumenthierarki för scenario proof och bokföringsbevis

- alla `_BINDANDE_SANNING.md` för affärsflöden äger sin egen facitlogik
- detta dokument äger hur facit modelleras, exekveras, bevisas och granskas i Domän 27
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` äger slutlig vouchertruth
- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` äger evidence bundles, sign-off packages och approvals
- Domän 27 får inte definiera avvikande proof-, fixture-, expected-outcome- eller mismatchtruth utan att detta dokument skrivs om samtidigt

## Kanoniska objekt

- `ScenarioFamily`
- `ScenarioVariant`
- `FixtureClass`
- `FixtureSet`
- `ExpectedOutcome`
- `LedgerExpectation`
- `ReportExpectation`
- `ExecutionReceipt`
- `MismatchFinding`
- `ScenarioVerdict`
- `ProofBundle`

## Kanoniska state machines

- `ScenarioVariant`: `draft -> approved -> executable -> deprecated | superseded`
- `ExecutionReceipt`: `queued -> running -> passed | failed | blocked`
- `MismatchFinding`: `open -> triaged -> fixed | waived | rejected`
- `ProofBundle`: `draft -> frozen -> signed_off | superseded`

## Kanoniska commands

- `RegisterScenarioFamily`
- `ApproveScenarioVariant`
- `FreezeFixtureSet`
- `FreezeExpectedOutcome`
- `ExecuteScenarioVariant`
- `RecordMismatchFinding`
- `FreezeProofBundle`
- `SignOffProofBundle`

## Kanoniska events

- `ScenarioFamilyRegistered`
- `ScenarioVariantApproved`
- `FixtureSetFrozen`
- `ExpectedOutcomeFrozen`
- `ScenarioExecuted`
- `MismatchFindingRecorded`
- `ProofBundleFrozen`
- `ProofBundleSignedOff`

## Kanoniska route-familjer

- `POST /scenario-families`
- `POST /scenario-variants`
- `POST /fixture-sets`
- `POST /expected-outcomes`
- `POST /scenario-executions`
- `POST /mismatch-findings`
- `POST /proof-bundles`
- `POST /proof-bundles/{id}/signoff`

## Kanoniska permissions och review boundaries

- bara domain owners eller scenario leads får skapa eller deprecate scenariofamiljer
- expected outcomes för bokföringsdrivande scenarier får inte godkännas av samma person som skapade dem
- mismatch waiver får inte tillatas för ledger, moms, AGI, HUS eller filing errors
- sign-off på proof bundles kraver SoD mellan builder och approver

## Nummer-, serie-, referens- och identitetsregler

- varje scenariofamilj ska ha stabilt id som `SCN-AAA999`
- varje fixtureklass ska ha stabilt id som `FXT-999`
- varje expected outcome ska ha stabilt id som `EXP-99999`
- varje execution receipt ska ha stabilt id som `EXE-YYYY-NNNNN`
- varje mismatch finding ska ha stabilt id som `MM-YYYY-NNNNN`
- varje proof bundle ska ha stabilt id som `PRF-YYYY-NNNNN`

## Valuta-, avrundnings- och omräkningsregler

- varje bokföringsdrivet scenario måste tala om source amount, tax amount, total amount och rounding mode
- valutascenarier måste alltid ange source currency, source rate, target amount och expected FX effect
- fixtureklasser ska innehålla orekansliga och avrundningskansliga variationer

## Replay-, correction-, recovery- och cutover-regler

- samma scenario med samma fixture set ska alltid ge samma resultat
- correction-scenarier måste testas som egna expected outcomes, inte som fotnoter
- migrated scenarios måste kunna koras bade före och efter cutover
- failed execution får inte overskriva tidigare frozen expected outcome

## Huvudflödet

1. scenariofamilj registreras med bindande ägande flödesbibel
2. variantmatris definieras och fixtureklass fryses
3. expected outcome fryses med konto-, fält-, rapport- och stateeffekt
4. execution kor mot verklig runtime
5. mismatch lagras receipt-sakrat och routes till ägare
6. proof bundle fryses och signeras för release gate

## Bindande scenarioaxlar

- document type
- legal form
- accounting method
- tax profile
- VAT profile
- payment profile
- correction profile
- currency profile
- integration profile
- timing profile
- migration vs native-origin profile

## Bindande policykartor

- `PRF-POL-001 flow_to_required_expected_outcome_dimensions`
- `PRF-POL-002 scenario_family_to_fixture_classes`
- `PRF-POL-003 mismatch_type_to_blocking_severity`
- `PRF-POL-004 waiver_forbidden_matrix`
- `PRF-POL-005 release_gate_to_required_proof_bundle`
- `PRF-POL-006 scenario_family_to_minimum_variant_coverage`
- `PRF-POL-007 golden_outcome_freeze_and_supersession_policy`
- `PRF-POL-008 unknown_reachable_path_to_blocking_decision`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `PRF-P0001` invoice scenario exact ledger lines matched
- `PRF-P0002` AP scenario exact VAT boxes and AP open-item state matched
- `PRF-P0003` payroll scenario exact BAS payroll accounts and AGI fields matched
- `PRF-P0004` HUS scenario exact customer share, claim share and authority-state outcome matched
- `PRF-P0005` migration scenario exact parity and lineage receipts matched
- `PRF-P0006` mismatch blocked release because `severity=blocking`
- `PRF-P0007` unknown scenario blocked because no approved expected outcome exists
- `PRF-P0008` accepted risk refused because mismatch class belongs to forbidden matrix
- `PRF-P0009` scenario family coverage gate failed because required variant axes were not frozen and executed
- `PRF-P0010` frozen expected outcome superseded only through explicit lineage, never by silent golden update

## Bindande rapport-, export- och myndighetsmappning

- varje scenario ska mappa till berörda rapporter, exporter och myndighetsutfall
- bokföringsscenarier ska mappa till huvudbok, reskontror, momsrutor, AGI-fält eller HUS/grön-teknik status där relevant
- filing-driven scenarier ska mappa till receipt eller return evidence

## Bindande scenariofamilj till proof-ledger och rapportspar

- `SCN-AR001` seller invoice family -> `PRF-P0001`
- `SCN-AP001` supplier invoice family -> `PRF-P0002`
- `SCN-PAY001` payroll family -> `PRF-P0003`
- `SCN-HUS001` HUS family -> `PRF-P0004`
- `SCN-MIG001` migration parity family -> `PRF-P0005`
- `SCN-UNK001` unknown scenario -> `PRF-P0007`

## Tvingande dokument- eller indataregler

- varje scenariofamilj måste peka på exakt en ägande bindande bibel
- varje expected outcome måste ha explicit fixtureklass
- varje execution receipt måste lagra runtime build ref, rulepack versions och provider baselines där relevant
- mismatch måste innehålla exact diff payload, inte bara screenshots eller fri text
- varje regulated scenario måste peka på officiell regel- eller formatkalla där det är relevant
- varje scenariofamilj måste lagra coverage dimensions och minimum variantkrav

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `PRF-R001 missing_expected_outcome`
- `PRF-R002 unsupported_variant`
- `PRF-R003 ledger_mismatch`
- `PRF-R004 tax_or_filing_mismatch`
- `PRF-R005 forbidden_waiver_class`
- `PRF-R006 state_transition_mismatch`
- `PRF-R007 report_or_export_mismatch`
- `PRF-R008 insufficient_variant_coverage`
- `PRF-R009 silent_expected_outcome_mutation`

## Bindande faltspec eller inputspec per profil

- scenario family: `scenario_family_id`, `owner_truth_doc`, `state_scope`, `report_scope`
- scenario variant: `variant_axes`, `fixture_class_id`, `supported=true|false`
- expected outcome: `ledger_expectations[]`, `state_effects[]`, `report_effects[]`, `export_effects[]`, `blockers[]`
- expected outcome: `official_source_refs[]`, `coverage_dimensions[]`, `minimum_variant_count`, `frozen_hash`
- execution receipt: `build_ref`, `rulepack_versions[]`, `provider_modes[]`, `actual_outcomes[]`, `verdict`
- mismatch finding: `reason_code`, `diff_payload`, `blocking=true|false`, `owner`

## Scenariofamiljer som hela systemet måste tacka

- invoice
- customer payment
- supplier invoice
- supplier payment
- receipt
- outlay and reinvoice
- VAT
- tax account
- ledger core
- accruals
- fixed assets
- inventory
- payroll
- AGI
- HUS and green tech
- annual filing and owner distributions
- migration and cutover
- auth/security and partner integration

## Scenarioregler per familj

- varje familj måste ha minst en normal, en edge, en correction och en blocked variant
- varje familj måste ha unknown-case policy
- bokföringsfamiljer måste ha explicit konton eller faltutfall
- icke-bokföringsfamiljer måste ha explicit state- och security-effects

## Blockerande valideringar

- execution blocked om expected outcome saknas
- release blocked om blocking mismatch är öppen
- release blocked om proof bundle saknas för release gate
- waiver blocked om mismatch tillhor forbidden matrix
- scenario blocked om fixtureklass inte korsar hela variantmatrisen
- release blocked om minimum variant coverage inte är uppfylld
- release blocked om frozen expected outcome muterats utan supersession lineage

## Rapport- och exportkonsekvenser

- proof bundles ska kunna exporteras till release evidence, audit pack och customer-facing cutover proof
- mismatch findings ska kunna brytas ned per flow, rulepack, build och provider mode

## Förbjudna förenklingar

- enstaka happy-path tests som ersätter scenario matrix
- handskriven "expected" text utan explicit konton/fält
- mismatch som bara visas i CI-logg
- waiver som används för att kringga fel BAS-konto, momsruta, AGI-fält eller filingutfall
- silent update av golden outcomes efter rod korning utan ny frozen lineage
- att markera scenariofamilj grön trots att en känd variantaxel fortfarande är otestad

## Fler bindande proof-ledger-regler för specialfall

- `PRF-P0009` mixed-currency invoice scenario must compare FX lines and VAT rounding separately
- `PRF-P0010` migrated-origin scenario must compare lineage receipts in addition to business outcome
- `PRF-P0011` security scenario must compare permission and audit evidence instead of ledger only
- `PRF-P0012` filing scenario must compare generated payload, receipt and internal state together

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `PRF-P0001` must assert customer open-item state
- `PRF-P0002` must assert AP open-item state
- `PRF-P0003` must assert pay-run and payroll-liability state
- `PRF-P0004` must assert HUS/grön-teknik claim state
- `PRF-P0005` must assert migration lineage and cutover state
- `PRF-P0006` must assert release gate blocked
- `PRF-P0007` must assert unknown scenario blocked

## Bindande verifikations-, serie- och exportregler

- bokföringsscenarier ska explicit tala om verifikationsserie eller seriepolicy som forvantas enligt owning truth doc
- exportdrivna scenarier ska explicit tala om vilken export receipt eller file family som måste matcha

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- tax profile x legal form
- VAT profile x accounting method
- payment profile x correction profile
- currency profile x rounding profile
- integration profile x fallback profile
- native-origin x migrated-origin

## Bindande fixture-klasser för scenario proof och bokföringsbevis

- `FXT-CORE-001` normal domestic flow
- `FXT-CORE-002` ore-sensitive flow
- `FXT-CORE-003` mixed-rate or mixed-rule flow
- `FXT-CORE-004` correction and reversal flow
- `FXT-CORE-005` blocked/unsupported flow
- `FXT-CORE-006` migrated-origin flow

## Bindande expected outcome-format per scenario

- `scenario_family_id`
- `variant_id`
- `fixture_class_id`
- `ledger_expectations[]`
- `state_effects[]`
- `report_effects[]`
- `export_effects[]`
- `audit_effects[]`
- `allowed_mismatch_classes[]`
- `blocking_mismatch_classes[]`

## Bindande canonical verifikationsseriepolicy

- seriestruthor ägs av respektive flödesbibel eller `VERIFIKATIONSSERIER_OCH_BOKFORINGSPOLICY_BINDANDE_SANNING.md`
- detta dokument äger att varje scenario måste peka på sin seriepolicy, inte serienamnen i sig

## Bindande expected outcome per central scenariofamilj

- `SCN-AR001` must match invoice ledger, ÄR state, VAT boxes, export family and audit bundle
- `SCN-AP001` must match AP ledger, supplier open-item state, VAT boxes and payment readiness
- `SCN-PAY001` must match payroll lines, liabilities, AGI fields and payout readiness
- `SCN-HUS001` must match split receivable, claim state and authority receipt effects
- `SCN-MIG001` must match parity outputs and lineage receipts

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- invoice -> exact seller outcome
- customer payment -> exact settlement outcome
- supplier invoice -> exact buyer outcome
- supplier payment -> exact AP settlement outcome
- receipt -> exact receipt routing outcome
- payroll -> exact pay-run outcome
- AGI -> exact field and receipt outcome
- migration -> exact parity outcome
- security -> exact permission and audit outcome

## Bindande testkrav

- every created flow truth doc must have scenario families registered here
- every release gate must require signed proof bundle
- every mismatch class must be testable in isolation
- every unknown scenario must prove blocked outcome
- every corrected scenario must prove before and after state
- every scenario family must prove minimum variant coverage against frozen matrix
- every frozen expected outcome mutation must create supersession receipt and rerun evidence

## Källor som styr dokumentet

- [Föreningen SIE-Gruppen: SIE filformat](https://sie.se/wp-content/uploads/2026/02/SIE_filformat_ver_4C_2025-08-06.pdf)
- [Skatteverket: Fylla i momsdeklarationen](https://www.skatteverket.se/foretag/moms/deklareramoms/fyllaimomsdeklarationen.4.3a2a542410ab40a421c80004214.html)
- [Skatteverket: Teknisk beskrivning och testtjänst för AGI](https://www.skatteverket.se/foretag/arbetsgivare/lamnaarbetsgivardeklaration/tekniskbeskrivningochtesttjanst.4.309a41aa1672ad0c8377c8b.html)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [PostgreSQL 17: Transaction Isolation](https://www.postgresql.org/docs/17/transaction-iso.html)
