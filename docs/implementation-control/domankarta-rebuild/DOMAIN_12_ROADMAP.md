# DOMAIN_12_ROADMAP

## mål

Göra Domän 12 till en verklig svensk project-/field-/compliance-kärna där:
- project commercial core är generell, cutoff-säker och immutabel
- kalkyl, quote, agreement, budget, revenue plan och billing plan bildar en revisionssäker kedja
- WIP och revenue recognition styrs av explicit svensk redovisningspolicy och bokför verkligt
- field, personalliggare och ID06 aldrig skapar egen ekonomisk sanning
- trial, import, parallel run och live conversion är separerade, mätbara och rollbackbara
- support, masking, exports, audit och operatorflöden håller samma nivå som finance och payroll

## varför domänen behövs

Utan Domän 12 kan plattformen inte vara trovärdig för:
- konsult- och uppdragsverksamhet
- service- och field-bolag
- bygg och byggnära vertikaler
- controllerdriven projektuppföljning
- WIP/intäktsredovisning
- personalliggare- och ID06-krav

Domänen avgör om offert, avtal, utförande, fakturering, WIP, lönsamhet och byggcompliance hänger ihop utan att skapa fel ekonomi eller falsk kontroll.

## faser

- Fas 12.1 truth-mode / persistence / classification hardening
- Fas 12.2 project commercial lineage / immutable supersession
- Fas 12.3 kalkyl / quote / project-budget chain
- Fas 12.4 invoice-readiness / waiver / commercial decision
- Fas 12.5 period-control / close / reopen / rerun
- Fas 12.6 WIP / revenue-recognition / accounting-policy
- Fas 12.7 build-VAT / omvänd byggmoms
- Fas 12.8 profitability / allocation / mission-control
- Fas 12.9 field operational / offline / conflict
- Fas 12.10 personalliggare rule-catalog / kiosk / correction
- Fas 12.11 personalliggare XML / export / secure transfer
- Fas 12.12 ID06 provider / workplace / evidence
- Fas 12.13 route / support boundary / masking
- Fas 12.14 import / live-conversion / parallel-run
- Fas 12.15 runbook / seed / fake-live / legacy purge

## dependencies

- Domän 1 för canonical repository- och truth-regler.
- Domän 2 för trust level, MFA, secrets och masking.
- Domän 3 för BAS-/ledger-/period-/dimensionregler.
- Domän 4 för evidence/artifact-policy.
- Domän 5 för provider baselines och capability manifests.
- Domän 6 för VAT/tax-account/betalningslogik.
- Domän 8 för HR/time/balances som projektkostnader bygger på.
- Domän 10 för payroll-cost allocations och cost-source lineage.
- Domän 16 för support/backoffice/replay/runbook-driven operations.

## vad som får köras parallellt

- 12.1 kan köras parallellt med design av 12.10 och 12.13 när class-mask och trust boundaries låses centralt.
- 12.2 kan köras parallellt med 12.3 när commercial lineage-kontraktet är definierat.
- 12.6 kan köras parallellt med 12.8 när accounting-policy profile och ledger-dimensioner är låsta.
- 12.10 kan köras parallellt med 12.12 efter att workplace-registry-gränsen har låsts.
- 12.15 kan påbörjas parallellt med sena verifieringar, men purge får inte slutföras innan ersättningsrunbooks finns.

## vad som inte får köras parallellt

- 12.2 får inte markeras klar före 12.1.
- 12.4 får inte markeras klar före 12.2 och 12.3.
- 12.6 får inte markeras klar före 12.5.
- 12.7 får inte markeras klar före 12.6 om build-VAT påverkar WIP/fakturering.
- 12.11 får inte markeras klar före 12.10.
- 12.12 får inte markeras klar före 12.10 om workplace-registry fortfarande är hard-coded eller syntetisk.
- 12.14 får inte markeras klar före 12.2, 12.6, 12.10 och 12.12.
- 12.15 får inte slutföras före alla replacement docs finns.

## exit gates

- ingen legal-effect-miljö får köra projects/field/personalliggare/id06/kalkyl på `memory`
- domänen har explicita `S3`- eller strängare klassmasker
- commercial lineage är immutabel och cutoff-säker
- estimate -> quote -> agreement -> project -> budget -> revenue plan -> billing plan kan traverseras utan luckor
- invoice readiness har blocker-, review- och waiver-objekt
- WIP och revenue recognition är policybundna och replaybara
- build-VAT använder svensk byggmomskatalog och inte bara boolska flaggor
- profitability kan förklara varje belopp till source type, source id och allocation basis
- personalliggare regelår kan ändras utan kodändring
- personalliggare export har officiell artifact family
- ID06 kan inte ge live-status utan provider och kan inte använda syntetiskt workplace
- seeds, demo-spår och runbooks som skapar falsk live-känsla är borttagna, arkiverade eller omskrivna

## test gates

- unit för varje ny state machine, resolver, policyprofil och blockerregel
- integration för repository round-trip, route authz, evidence, exports och replay/rerun
- e2e för quote->project, WIP-posting, field-offline, personalliggare capture/export, ID06 binding/evidence, import/live conversion
- regulatoriska golden tests mot BFN-regler, Skatteverket personalliggare/byggmoms och ID06-officiella krav där sådana finns

## markeringar

- `keep`: generell project core, quote handoff, WIP-ledger-bridge, field candidate handoff, trusted kiosk checks, central route trust
- `harden`: profitability source coverage, offline conflict governance, support/masking boundaries, lifecycle receipts
- `rewrite`: truth mode requirements, commercial lineage, project budgets, WIP policy profile, personalliggare exports
- `replace`: fake-live ID06 verification, synthetic workplace fallback
- `migrate`: relationella schema-spår som låtsas vara canonical runtime
- `archive`: historiska fas-runbooks och demo-seeds som felaktigt ser live ut
- `remove`: implicit live-claims, syntetiska workplace paths i legal-effect-mode, legacy docs som beskriver direkt field-fakturering

## delfaser

### Delfas 12.1 truth-mode / persistence / classification hardening
- status: `replace`
- dependencies:
  - Domän 1
  - Domän 2
- vad som får köras parallellt:
  - design av 12.10 och 12.13
- vad som inte får köras parallellt:
  - legal-effect rollout av project workspace eller personalliggare/id06
- arbete:
  - gör repository-backed legal-effect store obligatorisk för `projects`, `field`, `personalliggare`, `id06`, `kalkyl`
  - införa explicit truth-mode health för varje deldomän
  - inför class-mask overrides minst `S3` för alla fem deldomäner
  - förbjud startup i `protected`, `pilot_parallel` och `production` om store kind är `memory`
- exit gate:
  - startup fail-fast i alla legal-effect-miljöer utan explicit durable store
  - class-mask policy visar explicit klassning för varje deldomän
- test gate:
  - startup-test som failar utan `ERP_CRITICAL_DOMAIN_STATE_URL`
  - restart-test som bevarar commercial/project/personalliggare/id06-state
- konkreta verifikationer:
  - starta protected runtime utan durable store och verifiera hard fail
  - starta med postgres-backed store, skapa project + site + binding, starta om, läs tillbaka samma ids och snapshot hashes
- konkreta tester:
  - integration: legal-effect boot deny on memory store
  - integration: durable restart round-trip för all domain keys
- konkreta kontroller vi måste kunna utföra:
  - fråga runtime om `truthMode`, `storeKind`, `classMask`, `legalEffectAllowed` per domännyckel
- markering: `replace`

### Delfas 12.2 project commercial lineage / immutable supersession
- status: `rewrite`
- dependencies:
  - 12.1
- vad som får köras parallellt:
  - 12.3
- vad som inte får köras parallellt:
  - live conversion av gamla project commercial records
- arbete:
  - införa immutabel lineage för quote link, agreement, change order, revenue plan och billing plan
  - ersätta statusmutation som supersessionmekanism
  - bygga governing cutoff-resolver
  - kräva explicit `effectiveFrom`, `effectiveTo`, `supersedesId`, `supersededById`
- exit gate:
  - alla commercial beslut kan förklaras per cutoff utan mutation av historiska records
- test gate:
  - cutoff före och efter change order måste ge olika governing refs utan att gamla records ändras
- konkreta verifikationer:
  - skapa quote handoff, amendment och change order; fråga workspace på tre olika cutoff-datum; lineage måste stämma
- konkreta tester:
  - unit: commercial lineage resolver
  - integration: immutable supersession persistence
- konkreta kontroller vi måste kunna utföra:
  - exportera full lineage med `effectiveFrom`, `effectiveTo`, `supersedesId`, `supersededById`, `governingAtCutoff`
- markering: `rewrite`

### Delfas 12.3 kalkyl / quote / project-budget chain
- status: `rewrite`
- dependencies:
  - 12.1
  - 12.2
- vad som får köras parallellt:
  - design av 12.8
- vad som inte får köras parallellt:
  - sälja kalkyl som komplett offertmotor
- arbete:
  - koppla `convertEstimateToQuote` till verklig canonical ÄR-quote
  - bind estimate review/approve till SoD
  - gör project budget conversion draft-first med separat approval
  - koppla estimate, quote och budget med traverserbara refs åt båda håll
- exit gate:
  - estimate kan inte få status `quoted` utan `quoteId`
  - project budget kan inte bli styrande utan separat approval
- test gate:
  - same actor create+approve måste blockeras där SoD krävs
  - budget conversion måste skapa `projectBudgetVersionId` i draft/review path, inte direkt approved
- konkreta verifikationer:
  - skapa estimate, review, approve, convert to quote, acceptera quote, handoff till project, convert to project budget, approve budget separat
- konkreta tester:
  - integration: estimate -> ÄR quote -> project chain
  - integration: budget approval with separate approver
- konkreta kontroller vi måste kunna utföra:
  - fråga på `estimateVersionId` och få tillbaka `quoteId`, `quoteVersionId`, `projectId`, `projectBudgetVersionId`, `approvedByActorId`
- markering: `rewrite`

### Delfas 12.4 invoice-readiness / waiver / commercial decision
- status: `harden`
- dependencies:
  - 12.2
  - 12.3
- vad som får köras parallellt:
  - 12.5
- vad som inte får köras parallellt:
  - broad invoicing rollout
- arbete:
  - behåll readiness-gaten men bygg first-class waiver- och override-objekt
  - koppla blocker/review/waiver till support case, approval chain, expiry och evidence refs
  - gör change-order pending apply och conflict-waiver explicit i readiness path
- exit gate:
  - readiness kan alltid förklara varför ett projekt är `blocked`, `review_required`, `ready` eller `ready_by_waiver`
- test gate:
  - waiver måste löpa ut automatiskt och återblockera readiness
- konkreta verifikationer:
  - skapa readiness-blocker, godkänn waiver, låt expiry passera, verifiera blocker-reset
- konkreta tester:
  - unit: readiness decision reducer with waiver rules
  - integration: waiver approval, expiry and evidence receipts
- konkreta kontroller vi måste kunna utföra:
  - exportera readiness-beslut med blocker codes, review codes, waiver refs, approver refs och expiry
- markering: `harden`

### Delfas 12.5 period-control / close / reopen / rerun
- status: `rewrite`
- dependencies:
  - 12.1
  - 12.2
  - 12.4
- vad som får köras parallellt:
  - 12.6
- vad som inte får köras parallellt:
  - production rerun automation
- arbete:
  - införa first-class project period control kopplad till ledger period status
  - modellera reopen impact på WIP, profitability, mission control, invoice readiness och evidence
  - bygga stale snapshot detection och required rerun-plan
- exit gate:
  - reopen skapar deterministisk påverkan och rerun-plan
- test gate:
  - correction efter hard close måste antingen öppna reopen path eller bokas till nästa öppna period enligt policy
- konkreta verifikationer:
  - posta WIP i stängd period, begär correction, verifiera block; reopena, kör rerun, verifiera stale snapshot cleanup
- konkreta tester:
  - e2e: hard-close -> reopen -> rerun
  - integration: project reopen impact report
- konkreta kontroller vi måste kunna utföra:
  - fråga project om `periodStatus`, `reopenImpact`, `staleSnapshotIds`, `requiredRerunSet`
- markering: `rewrite`

### Delfas 12.6 WIP / revenue-recognition / accounting-policy
- status: `rewrite`
- dependencies:
  - 12.5
- vad som får köras parallellt:
  - 12.8
- vad som inte får köras parallellt:
  - automated WIP production posting
- arbete:
  - införa `ProjectAccountingPolicyProfile`
  - koppla policyprofil till K2/K3, fixed price vs running account, principal revenue-recognition method och loss recognition
  - göra WIP bridge policy-bound, dimension-rich och correction-chain-safe
  - definiera canonical journal account selection som pekar mot ledger/BAS-domain i stället för hard-coded spridda regler
- exit gate:
  - inget projekt kan bokföra WIP utan aktiv accounting policy profile
  - bridge bär policyref, dimensioner och correction lineage
- test gate:
  - samma cutoff utan ändrad state måste vara idempotent
  - policy change eller reopen måste skapa ny bridge, aldrig overwrite
- konkreta verifikationer:
  - skapa fixed-price-projekt med K3-profile, posta bridge, reopena, ändra policy, kör om; verifiera reversal/correction chain
- konkreta tester:
  - unit: policy selection and line-building
  - integration: bridge lines include dimensionJson and policyProfileId
- konkreta kontroller vi måste kunna utföra:
  - exportera `projectWipLedgerBridgeId`, `policyProfileId`, `balanceStateHash`, `reversalOfBridgeId`, `ledgerLineDimensions`
- markering: `rewrite`

### Delfas 12.7 build-VAT / omvänd byggmoms
- status: `rewrite`
- dependencies:
  - 12.2
  - 12.4
  - 12.6
- vad som får köras parallellt:
  - 12.10
- vad som inte får köras parallellt:
  - construction vertical go-live
- arbete:
  - bygg explicit svensk byggmoms-katalog
  - klassificera tjänster, köparstatus, vidareförsäljning, dokumentkrav och invoice text requirements
  - koppla assessment till canonical decision basis och Skatteverket-källa
- exit gate:
  - byggmomsbeslut går att förklara från tjänsteklass, köparprofil, VAT-status och source refs
- test gate:
  - mixed service och ej byggtjänst måste ge rätt reverse-charge-beslut
- konkreta verifikationer:
  - skapa tre cases: omvänd byggmoms, vanlig svensk moms, review-required; kontrollera boxar, textkrav och decision basis
- konkreta tester:
  - unit: service catalog classification
  - integration: build VAT assessment with official rule references
- konkreta kontroller vi måste kunna utföra:
  - exportera `buildVatDecisionBasis`, `serviceCatalogCode`, `officialSourceRef`, `reviewRequiredFlag`
- markering: `rewrite`

### Delfas 12.8 profitability / allocation / mission-control
- status: `harden`
- dependencies:
  - 12.3
  - 12.5
  - 12.6
- vad som får köras parallellt:
  - 12.9
- vad som inte får köras parallellt:
  - controller rollout baserat på mission control
- arbete:
  - göra source coverage first-class
  - bygga allocation batch, allocation lines, allocation corrections och adjustment governance
  - visa coverage gaps, stale cost sources och unallocated amounts i mission control
- exit gate:
  - varje summa i mission control kan härledas till source type, source id, allocation basis och correction chain
- test gate:
  - sena AP- eller payroll-kostnader måste skapa tydlig stale snapshot eller correction chain
- konkreta verifikationer:
  - kör profitability med payroll, AP, HUS, travel och manual adjustment; exportera breakdown och verifiera spårbarhet rad för rad
- konkreta tester:
  - integration: allocation correction after posted source
  - unit: source-coverage warning rules
- konkreta kontroller vi måste kunna utföra:
  - fråga mission control om `sourceCoverage`, `unallocatedAmount`, `staleSourceRefs`, `allocationCorrectionOpenFlag`
- markering: `harden`

### Delfas 12.9 field operational / offline / conflict
- status: `harden`
- dependencies:
  - 12.1
  - 12.4
  - 12.8
- vad som får köras parallellt:
  - 12.10
  - 12.12
- vad som inte får köras parallellt:
  - större mobil rollout
- arbete:
  - utöka offline matrix bortom tre mutationstyper
  - definiera merge-strategi per object type och mutation type
  - knyta conflicts till invoice readiness, dispatch policy och support resolution
- exit gate:
  - alla offline mutationer som marknadsförs är explicit stödjda i policy-matrisen
- test gate:
  - duplicate clientMutationId, version_conflict och apply_failure måste vara deterministiska
- konkreta verifikationer:
  - skapa offline duplicate, version conflict och manual resolution; finance handoff ska blockeras tills conflict är stängd
- konkreta tester:
  - e2e: offline replay/conflict matrix
  - integration: finance handoff blocked by open conflicts
- konkreta kontroller vi måste kunna utföra:
  - lista `objectType`, `mutationType`, `mergeStrategy`, `replayRule`, `financeBlockRule`
- markering: `harden`

### Delfas 12.10 personalliggare rule-catalog / kiosk / correction
- status: `rewrite`
- dependencies:
  - 12.1
  - 12.9
- vad som får köras parallellt:
  - 12.11
  - 12.12
- vad som inte får köras parallellt:
  - bygg-go-live utan rule catalog
- arbete:
  - ersätta hårdkodad 2026-threshold med daterad regelkatalog
  - modellera kiosk device lifecycle, attestation, revoke och trust evidence
  - stärka correction chain, retention och identity masking
- exit gate:
  - nytt år eller nytt prisbasbelopp kräver bara regelkatalogsbyte, inte kodändring
- test gate:
  - samma site med olika rule date ska ge olika threshold outcome enligt giltighetsintervall
- konkreta verifikationer:
  - skapa site runt threshold, byt applied rule version, verifiera registreringsplikt och export payload
- konkreta tester:
  - unit: threshold resolution by effective date
  - integration: kiosk trust and correction chain export
- konkreta kontroller vi måste kunna utföra:
  - fråga site om `appliedRuleVersion`, `thresholdAmountExVat`, `deviceTrustStatus`, `correctionChainHash`
- markering: `rewrite`

### Delfas 12.11 personalliggare XML / export / secure transfer
- status: `rewrite`
- dependencies:
  - 12.10
- vad som får köras parallellt:
  - 12.13
- vad som inte får köras parallellt:
  - personalliggare compliance claims i go-live-material
- arbete:
  - bygg officiell artifact family för personalliggare-export
  - implementera XML/XSD validation, transfer profile och receipt/evidence path
  - separera internal audit export från official export
- exit gate:
  - official export kan identifieras med schema version, payload hash, transfer profile och validation result
- test gate:
  - invalid XML eller fel schema-version måste hard-faila
- konkreta verifikationer:
  - generera daily export, validera mot schema, registrera transfer receipt, kontrollera append-only evidence
- konkreta tester:
  - unit: XML serializer and XSD validation
  - integration: official export receipt import
- konkreta kontroller vi måste kunna utföra:
  - exportera `artifactType`, `schemaVersion`, `controlChainHash`, `validationResult`, `transferReceiptId`
- markering: `rewrite`

### Delfas 12.12 ID06 provider / workplace / evidence
- status: `replace`
- dependencies:
  - 12.1
  - 12.10
- vad som får köras parallellt:
  - 12.13
- vad som inte får köras parallellt:
  - alla live- eller pilotpåståenden om ID06-stöd
- arbete:
  - ersätta inputdriven verify/validate med provider-backed request/receipt model
  - ta bort syntetiskt workplace i legal-effect mode
  - lägga till expiry, refresh, revocation, evidence bundle och capability manifest
- exit gate:
  - varje aktiv verification, card status och binding har provider receipt, giltighet och refresh-regel
- test gate:
  - revoked kort eller expired verification måste blockera nya work passes och exports
- konkreta verifikationer:
  - skapa provider-backed company/person verification, validera kort, bind workplace, importera revoked-status, verifiera block
- konkreta tester:
  - adapter contract tests
  - integration: binding and revocation lifecycle
- konkreta kontroller vi måste kunna utföra:
  - fråga binding om `providerCode`, `receiptRef`, `status`, `validUntil`, `refreshDueAt`, `revocationSourceRef`
- markering: `replace`

### Delfas 12.13 route / support boundary / masking
- status: `harden`
- dependencies:
  - 12.1
  - 12.10
  - 12.12
- vad som får köras parallellt:
  - 12.11
- vad som inte får köras parallellt:
  - support/backoffice rollout för domänen
- arbete:
  - skärpa route trust för attendance, exports, ID06 och project commercial high-risk mutationer
  - införa domänspecifika support-mask policies
  - koppla exports till watermark, actor receipts och support/export approvals
- exit gate:
  - inga domän 12-ytor kan visa omaskad känslig data utan policygodkänd reveal path
- test gate:
  - support/session med fel trustnivå eller roll ska nekas läsning/export/mutation
- konkreta verifikationer:
  - försök läsa/exportera personalliggare- eller ID06-data med otillräcklig roll/trust; verifiera deny och audit trail
- konkreta tester:
  - integration: support masking and export authorization
  - integration: route trust regression suite
- konkreta kontroller vi måste kunna utföra:
  - exportera route contract, trust level, permission code, mask policy och last approval receipt
- markering: `harden`

### Delfas 12.14 import / live-conversion / parallel-run
- status: `harden`
- dependencies:
  - 12.2
  - 12.6
  - 12.10
  - 12.12
- vad som får köras parallellt:
  - 12.15
- vad som inte får köras parallellt:
  - broad go-live of project/field/build vertical
- arbete:
  - definiera import batch, collision, diff report, conversion approval och rollback receipt
  - knyta import/live conversion till canonical lineage och policy profiles
  - göra parallel run-utfall och diff obligatoriska för migrerade projekt
- exit gate:
  - live conversion kan förklara varje importerad commercial/compliance post och rollbacka deterministiskt
- test gate:
  - import same source twice får inte skapa dubbla canonical objects
  - conversion utan diff signoff måste blockeras
- konkreta verifikationer:
  - importera projekt, quote, site och ID06-like worker set; kör diff; godkänn live conversion; simulera rollback
- konkreta tester:
  - integration: import collision and diff report
  - e2e: live conversion approval and rollback receipt
- konkreta kontroller vi måste kunna utföra:
  - exportera `importBatchId`, `collisionCount`, `diffSummary`, `conversionApprovalId`, `rollbackReceiptId`
- markering: `harden`

### Delfas 12.15 runbook / seed / fake-live / legacy purge
- status: `rewrite`
- dependencies:
  - 12.1-12.14
- vad som får köras parallellt:
  - endast dokumentklassning och archive-skrivning
- vad som inte får köras parallellt:
  - fysisk borttagning av gamla filer innan replacement docs finns
- arbete:
  - skriv om eller ersätt:
    - `docs/runbooks/fas-10-projects-verification.md`
    - `docs/runbooks/fas-10-field-verification.md`
    - `docs/runbooks/fas-14-1-project-commercial-core-verification.md`
    - `docs/runbooks/fas-14-2-project-crm-handoff-verification.md`
    - `docs/runbooks/fas-14-3-project-billing-profitability-verification.md`
    - `docs/runbooks/fas-14-4-resource-portfolio-risk-verification.md`
    - `docs/runbooks/fas-14-5-field-operational-pack-verification.md`
    - `docs/runbooks/fas-14-6-personalliggare-id06-egenkontroll-verification.md`
    - `docs/runbooks/fas-14-7-project-trial-demo-verification.md`
    - `docs/runbooks/project-profitability.md`
    - `docs/runbooks/wip-revenue-recognition.md`
    - `docs/runbooks/personalliggare-kiosk-device-trust.md`
    - `docs/runbooks/mobile-offline-conflict-repair.md`
    - `docs/runbooks/parallel-run-and-diff.md`
  - flytta till test-only, archive eller remove:
    - `packages/db/seeds/20260322020010_phase10_projects_budget_followup_seed.sql`
    - `packages/db/seeds/20260322021000_phase10_projects_budget_followup_demo_seed.sql`
    - `packages/db/seeds/20260322030010_phase10_field_work_orders_mobile_inventory_seed.sql`
    - `packages/db/seeds/20260322031000_phase10_field_work_orders_mobile_inventory_demo_seed.sql`
    - `packages/db/seeds/20260322040010_phase10_build_rules_hus_personalliggare_seed.sql`
    - `packages/db/seeds/20260322041000_phase10_build_rules_hus_personalliggare_demo_seed.sql`
    - `packages/db/seeds/20260325034010_phase14_id06_domain_seed.sql`
  - skriv replacement-runbooks för:
    - project commercial lineage
    - WIP/revenue-recognition policy execution
    - field offline/conflict repair
    - personalliggare yearly rule update + official export
    - ID06 provider lifecycle + revocation
    - import/live conversion/rollback
- exit gate:
  - inga runbooks, seeds eller docs skapar falsk live-bild eller motsäger rebuild-sanningen
- test gate:
  - docs lint för förbjudna live-claims
  - startup deny om demo seeds aktiveras i legal-effect-mode
- konkreta verifikationer:
  - sök igenom repo efter gamla fas-10/fas-14-påståenden om direkt field-fakturering, officiell ID06-verifiering eller personalliggare-live-export och verifiera att de är arkiverade, omskrivna eller borttagna
- konkreta tester:
  - docs capability lint
  - legal-effect seed deny tests
- konkreta kontroller vi måste kunna utföra:
  - lista alla domän 12-dokument med klassning `keep`, `rewrite`, `archive`, `remove`
  - lista alla seeds med klassning `test-only`, `archive` eller `remove`
- markering: `rewrite`
