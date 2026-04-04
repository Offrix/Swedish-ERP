# DOMAIN_09_ROADMAP

## Mål

Fas 9 ska göra kollektivavtalsdomänen till verklig svensk avtalsruntime. Efter fasen får payroll, time, migration, support och audit inte längre bygga på tunna JSON-overlays, seedade demoavtal eller självsignerade overrides. Varje lönedel som påstås vara avtalsstyrd måste kunna härledas från rätt avtalskälla, rätt version, rätt employment-binding, rätt eventDate, rätt beräkningssteg och rätt reviewkedja.

## Varför domänen behövs

Om Domän 09 är fel blir följande fel:
- OB
- jour
- beredskap
- övertid
- semesterpåslag
- pension additions
- retrokorrigeringar
- payroll snapshots
- payslips
- supportförklaringar
- audit och tvistbevis

Domänen måste därför bära körbar och spårbar avtalslogik, inte bara katalogmetadata.

## Dependencies

- Fas 1 måste ha låst source of truth, replay och persistensdisciplin.
- Fas 2 måste ha låst security-, step-up- och SoD-gränser för high-risk writes.
- Fas 8 måste ha låst employment truth, approved time sets, leave truth och migration truth.
- Fas 10 får inte hårdna färdigt innan Domän 09 levererar riktig avtalsupplösning per eventDate och line trace.

## Vad som får köras parallellt

- `9.2` och `9.3` får köras parallellt först när `9.1` har definierat canonical object model.
- `9.4` och `9.5` får köras parallellt först när `9.2-9.3` har låst version- och assignment-sanningen.
- `9.7` och `9.8` får köras parallellt först när source-artifact- och compiler-modellen i `9.6` är låst.
- `9.11` och `9.12` får köras parallellt först när `9.9-9.10` har låst executable rule model.
- `9.16` och `9.17` får köras parallellt först när `9.4-9.6` har definierat vilka actions som är high-risk.

## Vad som inte får köras parallellt

- `9.6` får inte hoppas över; parser/normalization måste finnas före coverage, publication och go-live-claims.
- `9.10` får inte färdigställas innan `9.4-9.5` säkrat supplement/override-governance.
- `9.11` får inte gå live innan `9.13-9.15` har byggt traceability, golden scenarios och retro-kedja.
- `9.18` får inte avslutas innan `9.1-9.17` definierat vilka objekt som faktiskt ska migreras, seed-isoleras eller tas bort.

## Fas 9

### Delfas 9.1 Agreement family/version/catalog truth hardening
- status: `rewrite`
- dependencies:
  - Fas 1
  - Fas 2
- bygg:
  - inför canonical objekt för `AgreementFamily`, `AgreementVersion`, `AgreementCatalogEntry`
  - separera `draft`, `compiled`, `review_pending`, `approved`, `published`, `superseded`, `retired`
  - kräv compiler receipt och evidence ref innan `published`
  - bind varje catalog entry till exakt source artifact och compiled version
- dokument och filer:
  - `rewrite`: `packages/domain-collective-agreements/src/engine.mjs`
  - `rewrite`: `packages/db/migrations/20260324170000_phase18_collective_agreements.sql`
  - `rewrite`: `tests/unit/phase18-collective-agreements.test.mjs`
  - `archive`: `docs/runbooks/collective-agreement-activation.md`
- exit gate:
  - ingen version får bli `published` utan compile receipt och coverage receipt
  - `AgreementCatalogEntry` måste peka på exakt `agreementVersionId` och exakt source receipt
- konkreta verifikationer:
  - publicera version utan compile receipt och verifiera blocker
  - publicera ny version och verifiera att äldre catalog entry blir `superseded` med lineage
- konkreta tester:
  - unit: state-machine för family/version/catalog
  - integration: publish kräver compile receipt
  - integration: supersession receipt skrivs korrekt
- konkreta kontroller vi måste kunna utföra:
  - visa exakt vilken publicerad version en dropdownrad kommer från
  - visa vilken signed source artifact och compiler-output som ligger bakom

### Delfas 9.2 Effective-dating/overlap/supersede hardening
- status: `rewrite`
- dependencies:
  - `9.1`
- bygg:
  - inför explicit `VersionSupersessionPlan`
  - inför no-gap/no-overlap-policy per agreement family
  - inför warnings och blockers för split-perioder där två versioner påverkar samma payrollperiod
  - lagra `supersedesVersionId`, `replacedByVersionId` och publish window
- dokument och filer:
  - `rewrite`: `packages/domain-collective-agreements/src/engine.mjs`
  - `rewrite`: `tests/unit/phase18-collective-agreements.test.mjs`
- exit gate:
  - inga dolda överlapp får kunna publiceras
  - varje supersession måste vara auditad och spårbar
- konkreta verifikationer:
  - försök publicera överlappande version och verifiera blocker
  - skapa ny version med senare startdatum och verifiera `supersedes`/`replacedBy`
- konkreta tester:
  - unit: overlap deny
  - unit: split-period resolution metadata
  - integration: superseded catalog rows blir icke valbara
- konkreta kontroller vi måste kunna utföra:
  - förklara vilken version som gäller ett visst datum
  - förklara vilken version som gällde före och efter en supersession

### Delfas 9.3 Assignment/employment-binding hardening
- status: `harden`
- dependencies:
  - `9.1`
  - Fas 8
- bygg:
  - inför `AgreementBindingDecision`
  - koppla binding till employment class, legal employer, kollektivavtalsklass och work location
  - bygg rebind-policy när employment truth ändras
  - blockera assignment mot fel employment-scope
- dokument och filer:
  - `rewrite`: `packages/domain-collective-agreements/src/engine.mjs`
  - `rewrite`: `packages/domain-hr/src/index.mjs`
  - `rewrite`: `tests/integration/phase18-collective-agreements-api.test.mjs`
- exit gate:
  - assignment måste kunna motiveras av binding decision
  - employmentändringar som påverkar avtalsklass måste skapa review
- konkreta verifikationer:
  - ändra employment class och verifiera att tidigare binding blir review-required
  - försök assignment mot employment i fel scope och verifiera blocker
- konkreta tester:
  - integration: rebinding workflow
  - unit: employment-boundary validation
  - integration: historical binding resolution per datum
- konkreta kontroller vi måste kunna utföra:
  - visa varför en employment tilldelats en viss avtalsfamilj
  - visa när ny review krävs

### Delfas 9.4 Local-supplement hardening
- status: `rewrite`
- dependencies:
  - `9.2`
  - `9.3`
- bygg:
  - ersätt `localAgreementSupplementIdByVersion` med riktig supplement-entitet per scope
  - gör supplements first-class per employment, site, org unit eller tenant-scope
  - tvinga supplement-validity mot `eventDate`
  - bygg `superseded`/`retired` även för supplements
- dokument och filer:
  - `rewrite`: `packages/domain-collective-agreements/src/engine.mjs`
  - `rewrite`: `packages/db/migrations/20260324170000_phase18_collective_agreements.sql`
  - `rewrite`: `tests/unit/phase18-collective-agreements.test.mjs`
- exit gate:
  - två supplements på samma version får aldrig dela identitet
  - supplement utanför eget datumfönster får aldrig påverka overlay
- konkreta verifikationer:
  - skapa två supplements för samma version och olika employments och verifiera två olika ids
  - resolva overlay efter supplementets slutdatum och verifiera att supplementet inte påverkar resultatet
- konkreta tester:
  - unit: multi-supplement same version
  - unit: supplement validity gating
  - integration: scope mismatch blocker
- konkreta kontroller vi måste kunna utföra:
  - lista alla aktiva supplements per datum och scope
  - visa varför ett supplement gäller eller inte gäller för en viss rad

### Delfas 9.5 Override/exception governance hardening
- status: `replace`
- dependencies:
  - `9.2`
  - `9.3`
- bygg:
  - ersätt direkt override-create med `AgreementOverrideRequest`, `AgreementOverrideApproval`, `AgreementOverrideActivation`
  - inför typed override families
  - inför mandatory impact preview
  - blockera self-approval, kräva second approver och step-up
- dokument och filer:
  - `rewrite`: `packages/domain-collective-agreements/src/constants.mjs`
  - `rewrite`: `packages/domain-collective-agreements/src/engine.mjs`
  - `rewrite`: `apps/api/src/phase14-collective-agreements-routes.mjs`
  - `rewrite`: `tests/integration/phase18-collective-agreements-api.test.mjs`
- exit gate:
  - inget override får aktiveras av samma actor som begär det
  - inga fria JSON-payloads får nå live runtime
- konkreta verifikationer:
  - försök självsignera override och verifiera blocker
  - försök skicka okänd override-nyckel och verifiera schema-blocker
- konkreta tester:
  - integration: dual control required
  - unit: typed payload validation
  - integration: impact preview receipt required
- konkreta kontroller vi måste kunna utföra:
  - visa vem som begärde, godkände och aktiverade ett override
  - visa exakt vilken klausul som override:as

### Delfas 9.6 Intake/extraction/review/publication hardening
- status: `rewrite`
- dependencies:
  - `9.1`
  - `9.5`
- bygg:
  - inför `AgreementSourceArtifact`, `AgreementIntakeExtraction`, `AgreementReviewDecision`
  - bind `sourceDocumentRef` till verkligt artifact register
  - separera extraction från review och publication
  - kräv publication target-specifik gate för `catalog` respektive `local_supplement`
- dokument och filer:
  - `rewrite`: `packages/domain-collective-agreements/src/engine.mjs`
  - `rewrite`: `apps/api/src/phase14-collective-agreements-routes.mjs`
  - `rewrite`: `docs/runbooks/collective-agreement-intake.md`
- exit gate:
  - review får inte direkt konsumera request-body som körbar regelmodell
  - varje publicering måste kunna spåras till source artifact
- konkreta verifikationer:
  - skapa intake case utan source artifact och verifiera blocker
  - försök reviewa direkt till publicering utan extraction receipt och verifiera blocker
- konkreta tester:
  - integration: intake/extraction/review/publication lineage
  - unit: publication-target-specific validators
  - integration: rejected intake ger inga aktiverbara objekt
- konkreta kontroller vi måste kunna utföra:
  - visa hela kedjan från intake till publicering
  - visa skillnaden mellan central publicering och lokalt supplement

### Delfas 9.7 Agreement-source parsing/normalization hardening
- status: `replace`
- dependencies:
  - `9.6`
- bygg:
  - inför parser- och normalizer-kedja från signed agreement artifact till canonical clauses
  - inför `AgreementClauseExtractionArtifact`
  - inför `CanonicalAgreementClause`
  - stoppa manuella sidokanaler som hoppar direkt till `ruleSet`
- dokument och filer:
  - `replace`: `packages/domain-collective-agreements/src/engine.mjs`
  - `add`: ny compiler/normalizer-modul under `packages/domain-collective-agreements/src/`
  - `rewrite`: tester för intake och publication
- exit gate:
  - varje publicerad version måste vara kompilerad från canonical clauses
  - direkt JSON-publicering får inte vara möjlig
- konkreta verifikationer:
  - mata in source artifact och verifiera canonical clause output
  - försök publicera rå `ruleSet` utan compiler och verifiera blocker
- konkreta tester:
  - unit: parser/normalizer edge cases
  - integration: compiler receipt required
  - regression: no bypass from request body to live rule set
- konkreta kontroller vi måste kunna utföra:
  - visa varje canonical clause som genererats från källavtalet
  - visa vilka delar som krävde manuell review

### Delfas 9.8 Clause-coverage/unsupported-clause hardening
- status: `replace`
- dependencies:
  - `9.7`
- bygg:
  - inför `AgreementClauseCoverage`
  - inför `UnsupportedAgreementClause`
  - inför blocking inventory per avtalsversion
  - gör publication och go-live beroende av coverage status
- dokument och filer:
  - `replace`: `packages/db/migrations/20260324170000_phase18_collective_agreements.sql`
  - `rewrite`: `packages/domain-collective-agreements/src/engine.mjs`
  - `rewrite`: `tests/unit/phase18-collective-agreements.test.mjs`
- exit gate:
  - `published` kräver coverage summary
  - unsupported clauses måste vara explicita och blockerande där avtalsstöd påstås
- konkreta verifikationer:
  - markera clause som `unsupported` och verifiera publish blocker
  - markera clause som `partial` och verifiera warning eller blocker enligt policy
- konkreta tester:
  - unit: coverage state transitions
  - integration: unsupported clauses stop publication
  - integration: coverage summary följer med catalog view
- konkreta kontroller vi måste kunna utföra:
  - visa vilka klausuler som stöds
  - visa vilka klausuler som saknas eller bara stöds delvis

### Delfas 9.9 Executable-overlay/rate-component hardening
- status: `rewrite`
- dependencies:
  - `9.7`
  - `9.8`
- bygg:
  - ersätt tunn JSON-overlay med typed DSL för pay components
  - stöd trösklar, intervall, tidsband, kategorier, multiplikatorer och procentregler
  - lägg in conflict diagnostics i merge-stegen
  - lagra compiled overlay separat från source clauses
- dokument och filer:
  - `rewrite`: `packages/domain-collective-agreements/src/engine.mjs`
  - `rewrite`: `tests/unit/phase10-4-collective-agreement-payroll-consumption.test.mjs`
- exit gate:
  - overlay måste kunna beskriva mer än dagens smala pay items
  - konflikt mellan clauses får aldrig vinna tyst
- konkreta verifikationer:
  - kompilera två kolliderande clauses och verifiera conflict diagnostics
  - kompilera OB med tidsband och verifiera typed output
- konkreta tester:
  - unit: merge/precedence matrix
  - unit: typed rate component serialization
  - integration: compiled overlay persisted with receipt
- konkreta kontroller vi måste kunna utföra:
  - visa exakt hur compiled overlay ser ut
  - visa vilken clause som gav vilken component

### Delfas 9.10 Pay-component execution hardening
- status: `rewrite`
- dependencies:
  - `9.9`
  - Fas 10 consumer paths
- bygg:
  - inför `AgreementPayComponentExecution`
  - beräkna per komponent med explicit basis snapshot, quantity source och calculation mode
  - lägg till agreement-driven execution metadata innan pay line skapas
  - blockera okända basis codes och tomma calculation modes
- dokument och filer:
  - `rewrite`: `packages/domain-payroll/src/index.mjs`
  - `rewrite`: `tests/unit/phase10-4-collective-agreement-payroll-consumption.test.mjs`
- exit gate:
  - varje agreement-driven pay line måste först passera explicit execution step
  - inget belopp får skapas utan basis snapshot
- konkreta verifikationer:
  - skapa OVERTIME/OB/JOUR/STANDBY/VACATION_SUPPLEMENT och verifiera execution receipts
  - skapa okänd basis code och verifiera blocker
- konkreta tester:
  - unit: execution per calculation mode
  - unit: basis resolution vectors
  - integration: rate-required lines när component saknas
- konkreta kontroller vi måste kunna utföra:
  - visa exakt bas, mängd, multiplikator och utfall för varje avtalsrad
  - visa var i körningen avtalsraden materialiserades

### Delfas 9.11 Payroll/time-consumption and event-date hardening
- status: `rewrite`
- dependencies:
  - `9.9`
  - `9.10`
- bygg:
  - ersätt `period.endsOn`-resolution med event-scoped agreement resolution i payroll
  - låt time, leave, manual inputs och retro inputs bära egen `eventDate`
  - bygg gemensam resolution service för time och payroll
  - stoppa single-overlay-per-period som authoritative modell
- dokument och filer:
  - `rewrite`: `packages/domain-payroll/src/index.mjs`
  - `rewrite`: `packages/domain-time/src/index.mjs`
  - `rewrite`: `tests/unit/phase10-4-collective-agreement-payroll-consumption.test.mjs`
- exit gate:
  - split-perioder med versionsbyte måste ge korrekt split i pay lines
  - time och payroll måste visa samma active agreement för samma datum
- konkreta verifikationer:
  - kör period där avtal byts mitt i månaden och verifiera två olika line traces
  - kör period där supplement slutar mitt i perioden och verifiera att senare rader inte använder supplementet
- konkreta tester:
  - unit: event-date resolution matrix
  - integration: time/payroll parity på samma eventDate
  - integration: split-period payroll output
- konkreta kontroller vi måste kunna utföra:
  - visa vilket avtal som användes för varje tidsgrupp
  - visa att två datum i samma period kan använda olika versioner

### Delfas 9.12 Payslip-traceability/explainability hardening
- status: `replace`
- dependencies:
  - `9.10`
  - `9.11`
- bygg:
  - inför `AgreementLineTrace`
  - lägg `agreementVersionId`, `assignmentId`, `supplementId`, `overrideId`, `clauseCode`, `basisSnapshotRef`, `executionRef` på pay lines
  - exponera explainability i payslip, audit och support-read model
- dokument och filer:
  - `replace`: `packages/domain-payroll/src/index.mjs`
  - `rewrite`: `tests/unit/phase21-payroll-core.test.mjs`
  - `rewrite`: `tests/integration/phase21-payroll-core-api.test.mjs`
- exit gate:
  - varje agreement-driven pay line måste kunna spåras bakåt hela vägen
  - support måste kunna läsa maskad explainability utan rå pay-rule mutation
- konkreta verifikationer:
  - öppna en OB-rad och verifiera full trace till avtalsklausul och input
  - öppna en semesterpåslagsrad och verifiera basis snapshot och auto-generation source
- konkreta tester:
  - integration: payslip explainability payload
  - unit: line trace serialization
  - integration: masked support view
- konkreta kontroller vi måste kunna utföra:
  - förklara varje avtalsrad för support, revisor och kund
  - visa vilka inputs som gav just det beloppet

### Delfas 9.13 Golden-scenario and expected-outcome hardening
- status: `rewrite`
- dependencies:
  - `9.9`
  - `9.10`
  - `9.11`
- bygg:
  - skapa golden scenarios per avtalsfamilj, version och clause family
  - definiera expected outcomes för split-period, supplement, override, pension additions och vacation supplement
  - gör scenarios obligatoriska för publish och change approval
- dokument och filer:
  - `rewrite`: `tests/unit/phase18-collective-agreements.test.mjs`
  - `rewrite`: `tests/unit/phase10-4-collective-agreement-payroll-consumption.test.mjs`
  - `rewrite`: runbook för agreement verification
- exit gate:
  - varje publicerad version måste ha minst ett golden scenario per stödd klausulklass
  - split-period och retro scenarios måste finnas
- konkreta verifikationer:
  - kör scenario före och efter versionsbyte i samma månad
  - kör scenario med override-request och separat approver
- konkreta tester:
  - golden scenario suite i unit/integration
  - snapshot diff tests för expected outcomes
  - regression tests mot historiska buggar
- konkreta kontroller vi måste kunna utföra:
  - jämföra väntat och faktiskt utfall per scenario
  - spåra när ett scenario slutade vara grönt

### Delfas 9.14 Retro/delta/correction hardening
- status: `replace`
- dependencies:
  - `9.11`
  - `9.12`
- bygg:
  - inför `AgreementRetroImpactCase`
  - beräkna delta lines när version, supplement eller override påverkar historiska perioder
  - förbjud tyst omtolkning av historiska payslips
  - kräva review och evidence för retroaktiv avtalskorrigering
- dokument och filer:
  - `replace`: `packages/domain-collective-agreements/src/engine.mjs`
  - `rewrite`: `packages/domain-payroll/src/index.mjs`
  - `rewrite`: tester för retro payroll
- exit gate:
  - historisk ändring måste skapa correction chain
  - ursprunglig payslip får inte skrivas om tyst
- konkreta verifikationer:
  - ändra avtal retroaktivt och verifiera delta-rader i ny körning
  - försök skriva om historisk payslip direkt och verifiera blocker
- konkreta tester:
  - unit: delta computation
  - integration: correction case creation
  - integration: original snapshot remains immutable
- konkreta kontroller vi måste kunna utföra:
  - visa skillnaden mellan gammal och ny avtalslogik
  - visa exakt vilken correction som skapades

### Delfas 9.15 Durable persistence/audit/replay hardening
- status: `replace`
- dependencies:
  - `9.1-9.14`
- bygg:
  - bygg riktig store-adapter och komplett tabellmodell
  - lagra intake, source artifacts, compiled overlays, coverage, supplements, overrides, line traces och retro cases
  - koppla audit receipts och replay references till varje mutation
  - bygg replay-safe idempotency
- dokument och filer:
  - `replace`: `packages/db/migrations/20260324170000_phase18_collective_agreements.sql`
  - `add`: store-adapter under `packages/domain-collective-agreements/src/`
  - `rewrite`: integrationstester för persistence/restart
- exit gate:
  - restart får inte tappa avtalssanning
  - replay får inte skapa dubbel publication eller dubbel override activation
- konkreta verifikationer:
  - starta om runtime och verifiera oförändrad avtalsstatus
  - kör replay på publish och verifiera att samma receipt återanvänds
- konkreta tester:
  - integration: persistent reload
  - integration: replay idempotency
  - integration: audit receipt lineage
- konkreta kontroller vi måste kunna utföra:
  - visa alla receipts för en version
  - återskapa overlay från persistent truth

### Delfas 9.16 Backoffice/security/SoD/audit hardening
- status: `replace`
- dependencies:
  - Fas 2
  - `9.5`
  - `9.6`
- bygg:
  - dela upp read, publish, supplement, override-request, override-approve och retro-correction i egna permission-klasser
  - kräv strong MFA/fresh trust för high-risk writes
  - vattenmärk och auditera alla backoffice actions
  - inför masked read models för support
- dokument och filer:
  - `rewrite`: `apps/api/src/phase14-collective-agreements-routes.mjs`
  - `rewrite`: `apps/api/src/route-contracts.mjs`
  - `rewrite`: `apps/api/src/surface-policies.mjs`
  - `rewrite`: säkerhets- och API-tester
- exit gate:
  - samma principal får inte begära och godkänna high-risk override
  - support-read får inte kunna publicera eller mutera avtal
- konkreta verifikationer:
  - kör TOTP-only principal mot high-risk route och verifiera blocker
  - kör supportprincipal mot publish route och verifiera blocker
- konkreta tester:
  - integration: high-risk trust enforcement
  - integration: SoD deny
  - integration: masked support projection
- konkreta kontroller vi måste kunna utföra:
  - visa vem som gjorde varje high-risk action
  - visa vilken trust level som användes

### Delfas 9.17 Seed/bootstrap/fake-live removal hardening
- status: `remove`
- dependencies:
  - `9.15`
- bygg:
  - isolera seedade demoavtal till test-only fixtures
  - blockera bootstrap av demoavtal i protected/live
  - ta bort eller arkivera live-liknande seed SQL från normal deploykedja
- dokument och filer:
  - `rewrite`: `packages/domain-collective-agreements/src/engine.mjs`
  - `archive/remove`: `packages/db/seeds/20260324170010_phase18_collective_agreements_seed.sql`
  - `archive`: gamla agreement-runbooks som beskriver seedad verification som live-proof
- exit gate:
  - protected/live får inte kunna starta med demoavtal
  - inga seeds får kunna maskeras som publicerade live-avtal
- konkreta verifikationer:
  - starta protected runtime med seed flag och verifiera hard fail
  - verifiera att test-only fixtures inte laddas i live bootstrap
- konkreta tester:
  - unit: no-seed bootstrap in protected mode
  - integration: live startup blocker
  - regression: demo path impossible in production bootstrap
- konkreta kontroller vi måste kunna utföra:
  - visa att varje live-avtal kommer från riktig publication path
  - visa att seed-spår bara finns i testläge

### Delfas 9.18 Migration/snapshot-consistency hardening
- status: `harden`
- dependencies:
  - `9.12`
  - `9.15`
- bygg:
  - gör agreement-import till egen bounded-context-migration
  - ersätt löst `agreementSnapshot` med first-class import objects och mapping receipts
  - knyt payroll migration till canonical agreement objects, inte bara artefaktref
- dokument och filer:
  - `rewrite`: `packages/domain-import-cases/src/index.mjs`
  - `rewrite`: `tests/e2e/phase19-payroll-migration-flow.test.mjs`
  - `rewrite`: migration-runbooks
- exit gate:
  - import kan återskapa samma active agreement, same version lineage och same traces
  - payroll migration får inte bara säga `agreementSnapshotPresent`
- konkreta verifikationer:
  - migrera historik och verifiera att imported agreement binding går att resolva per datum
  - verifiera att imported pay line kan förklaras med imported clause mapping
- konkreta tester:
  - e2e: agreement-bound migration flow
  - integration: import receipts per agreement object
  - regression: imported snapshot without mapping blocks cutover
- konkreta kontroller vi måste kunna utföra:
  - visa exakt hur ett gammalt system mappades till canonical agreement objects
  - visa att imported historik går att förklara i support och audit

## Exit Gates

- ingen publicerad avtalsversion utan source artifact, compiler receipt och coverage receipt
- inga självsignerade overrides eller supplements
- payroll måste resolva avtal per faktisk eventDate
- varje avtalsdriven pay line måste ha full traceability
- seed/demo får inte kunna smyga in i protected/live

## Test Gates

- grön golden scenario-svit per stödd avtalsfamilj/version
- grön split-period-svit för versionsbyte, supplementbyte och overridebyte
- grön persistence/restart/replay-svit
- grön SoD/trust/step-up-svit för backoffice-ytor
- grön migration-svit som bevisar imported agreement truth

## Family/version/catalog gates

- family/version/catalog måste ha state machine, compiler receipt, source artifact ref och supersession lineage

## Assignment/precedence gates

- assignment måste ha binding decision, event-date resolution och typed precedence

## Override/review/publication gates

- override måste vara typed, dual-controlled och auditad
- publication måste vara build- och review-driven, inte body-driven

## Parsing/normalization/coverage gates

- parser/normalizer/compiler måste finnas
- unsupported clauses måste blockera

## Executable-engine/pay-component gates

- compiled overlay måste vara typed och diagnostic-driven
- pay component execution måste bära basis snapshot och execution ref

## Payroll-consumption/traceability/retro gates

- payroll måste använda rätt avtal per rad
- payslip måste kunna förklaras rad för rad
- retroändring måste skapa correction chain

## Backoffice/security gates

- high-risk agreement writes måste ha strong MFA, fresh trust och dual control
- support-read måste vara maskad och icke-muterande

## Markeringar

- `keep`: verkliga consumer-spår i payroll/time som kan återanvändas
- `harden`: assignment-binding, route contracts, migration parity
- `rewrite`: version/catalog/intake/overlay- och payroll-konsumtionsspår
- `replace`: parser/compiler, coverage, durable store, override governance, line trace
- `migrate`: import/migration och runbooks som behöver ny sanning
- `archive`: gamla runbooks och gamla verification claims
- `remove`: demo/bootstrap/live-liknande seeds
