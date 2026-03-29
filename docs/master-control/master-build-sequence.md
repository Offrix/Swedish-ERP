> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: MCP-010
- Title: Master Build Sequence
- Status: Historical control baseline superseded by go-live roadmap and implementation bible
- Owner: Product architecture, engineering architecture and delivery control
- Version: 1.0.0
- Effective from: 2026-03-23
- Supersedes: No prior master build sequence
- Approved by: User directive in this control phase
- Last reviewed: 2026-03-23
- Related master docs:
  - docs/master-control/master-rebuild-control.md
  - docs/master-control/master-gap-register.md
  - docs/master-control/master-code-impact-map.md
  - docs/master-control/master-domain-map.md
  - docs/master-control/master-rulepack-register.md
  - docs/master-control/master-ui-reset-spec.md
  - docs/master-control/master-golden-scenario-catalog.md
  - docs/master-control/master-policy-matrix.md
  - docs/master-control/master-document-manifest.md
- Related domains:
  - all domains and surfaces
- Related code areas:
  - all apps, packages, migrations, rulepacks and tests
- Related future documents:
  - all W1 and W2 documents listed in the manifest

# Supersession Notice

Detta dokument är nu en historisk kontrollbaslinje.

Bindande byggordning och bindande implementationssanning ligger i:

- `docs/implementation-control/GO_LIVE_ROADMAP.md`
- `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`

Detta dokument får endast användas som historiskt inputmaterial när det inte krockar med dokumenten ovan.

# Purpose

Detta dokument var den exakta byggordning som Codex skulle följa för att nå korrekt, komplett och enterprise-mässigt slutresultat så snabbt och säkert som möjligt utan att tappa kontroll.

Detta dokument är inte en lös rekommendation. Det är genomförandeordningen.

# Sequence rules

1. Bygg motorer före ytor som är beroende av dem.
2. Bygg tvärgående runtime-härdning före högriskautomation.
3. Bygg rulepack-bas före domäner som kräver effektiva datum och historik.
4. Bygg fiscal year och accounting method före close, VAT-hardening och annual reporting-hardening.
5. Bygg person-linked document classification före full AP/benefit/payroll-dokumentkedja.
6. Bygg balances, agreements och payroll migration före full payroll-pilot.
7. Bygg HUS gates före slutlig HUS UI och claim-automation.
8. Bredda personalliggare före final mobile check-in- och kiosk-UX.
9. Bygg design system och IA efter att domänkontrakt låsts, men före slutlig UI-implementation.
10. Ingen yta får markeras klar innan dess underliggande policy, rulepacks, tester och runbooks finns eller är låsta som W1/W2-dokument.
11. Parallelisering får bara ske där detta dokument uttryckligen säger att den är säker.
12. Om ett tidigare steg ändrar ett centralt domänkontrakt ska beroende UI-ytor pausas tills kontraktet är fryst igen.

# Exact build order for Codex

## Step 1 — Freeze the rebuild control baseline

- Innehåll:
  - acceptera MCP-001 till MCP-010 som styrande
  - skapa nya ADR- och dokumentstommar enligt manifestets W1-lista
- Required before:
  - all implementation
- Produces:
  - officiell styrbas
- Parallel allowed:
  - none

## Step 2 — Add the new architecture ADRs

- Innehåll:
  - ADR-0022
  - ADR-0023
  - ADR-0024
  - ADR-0025
  - ADR-0026
  - ADR-0027
  - ADR-0029
- Required before:
  - new packages for accounting method, fiscal year, review center, document classification
  - tax account bounded context
  - balances bounded context
  - collective agreements bounded context
  - payroll migration engine
  - import-case bounded context
- Produces:
  - arkitekturlås
- Parallel allowed:
  - preparation of W1 compliance and policy docs only
  - ADR-0028 drafting may begin, but ADR-0028 must be frozen before Step 29

## Step 3 — Harden the shared platform composition root

- Innehåll:
  - refactor `apps/api/src/platform.mjs`
  - establish explicit domain registration
  - add shared event envelope contract
- Required before:
  - new bounded contexts and route families
- Produces:
  - cleaner platform composition
- Parallel allowed:
  - none

## Step 4 — Build persistent outbox, jobs, attempts, replay and dead-letter runtime

- Innehåll:
  - rewrite `apps/worker/src/worker.mjs`
  - add job persistence schema
  - add replay plan model
  - add dead-letter handling
- Required before:
  - OCR expansion
  - submission hardening
  - notification dispatch
  - search reindex
- Produces:
  - operational async runtime
- Parallel allowed:
  - Step 5 may start once job schema contract is frozen

## Step 5 — Harden the shared audit and resilience layer

- Innehåll:
  - extend `packages/domain-core/src/resilience.mjs`
  - wire audit correlation, incident hooks, restore drill registry
- Required before:
  - backoffice ops
  - replay UI
- Produces:
  - hardened runtime control plane
- Parallel allowed:
  - limited work on backoffice contracts only

## Step 6 — Rewrite the rulepack registry contract

- Innehåll:
  - separate rulepack registry from AI automation
  - implement effective dating, version pinning, rollback model
- Required before:
  - all new rulepack-driven engines
- Produces:
  - canonical rulepack runtime
- Parallel allowed:
  - writing of rulepack-related docs and tests

## Step 7 — Add the accounting method bounded context

- Innehåll:
  - create `packages/domain-accounting-method`
  - add migrations and routes
- Required before:
  - ledger timing changes
  - VAT timing changes
  - year-end method handling
- Produces:
  - method profile and change requests
- Parallel allowed:
  - none

## Step 8 — Add the fiscal year bounded context

- Innehåll:
  - create `packages/domain-fiscal-year`
  - implement broken year, period generation and year change requests
- Required before:
  - close hardening
  - annual reporting hardening
  - reporting hardening
- Produces:
  - fiscal year source of truth
- Parallel allowed:
  - none

## Step 9 — Integrate ledger with accounting method and fiscal year

- Innehåll:
  - update `packages/domain-ledger`
  - integrate period logic, series flexibility and method references
- Required before:
  - full VAT hardening
  - annual and close hardening
- Produces:
  - canonical accounting backbone
- Parallel allowed:
  - voucher series flexibility work inside same step

## Step 10 — Build configurable voucher and invoice series

- Innehåll:
  - replace fixed A-Z assumptions with tenant-configurable series
  - preserve imported series
- Required before:
  - AR/AP migration and production-quality imports
- Produces:
  - flexible numbering model
- Parallel allowed:
  - none

## Step 11 — Add the tax account bounded context

- Innehåll:
  - create `packages/domain-tax-account`
  - add event import, mapping and offset records
- Required before:
  - full close
  - full annual reconciliation
- Produces:
  - tax account subledger
- Parallel allowed:
  - none

## Step 12 — Add the review center bounded context

- Innehåll:
  - create `packages/domain-review-center`
  - define canonical review item model
- Required before:
  - cross-domain review UI
  - document classification ops
  - VAT review refactor
- Produces:
  - shared review model
- Parallel allowed:
  - Step 13 can start after review item schema is frozen

## Step 13 — Split notifications, activity and work items

- Innehåll:
  - create `packages/domain-notifications`
  - create `packages/domain-activity`
  - retain work items in core with explicit boundaries
- Required before:
  - final desktop shell
  - final backoffice
- Produces:
  - clean operator experience model
- Parallel allowed:
  - limited UI contract work for notification and activity panels

## Step 14 — Add the document classification bounded context

- Innehåll:
  - create `packages/domain-document-classification`
  - add classification cases, splits, person links, payroll intents
- Required before:
  - full private spend
  - wellness and benefit intake from documents
  - AP/person-linked scenarios
- Produces:
  - document-to-person decision chain
- Parallel allowed:
  - Step 15 may start once classification case model is frozen

## Step 15 — Add the import-case bounded context

- Innehåll:
  - create `packages/domain-import-cases`
  - implement multi-document import cases
- Required before:
  - import-safe AP and VAT
- Produces:
  - import multi-document chain
- Parallel allowed:
  - none

## Step 16 — Enforce AI decision boundary in automation routes and rule engine

- Innehåll:
  - implement policy hooks
  - forbid autonomous economic posting or submission
  - require review where mandated
- Required before:
  - any further automation expansion
- Produces:
  - safe automation boundary
- Parallel allowed:
  - none

## Step 17 — Add the balances bounded context

- Innehåll:
  - create `packages/domain-balances`
  - model balance types, transactions, carry-forward and expiry
- Required before:
  - payroll migration
  - agreement-driven payroll
- Produces:
  - generic balance engine
- Parallel allowed:
  - Step 18 may start after balance contract is frozen

## Step 18 — Add the collective agreements bounded context

- Innehåll:
  - create `packages/domain-collective-agreements`
  - implement agreement families and versions
- Required before:
  - advanced payroll calculation
- Produces:
  - agreement rule overlay engine
- Parallel allowed:
  - Step 19 may start after agreement mapping contract is frozen

## Step 19 — Add the payroll migration engine

- Innehåll:
  - extend or add payroll migration package and routes
  - handle YTD, balances, mapping sets, diff reports and signoffs
- Required before:
  - payroll pilot
- Produces:
  - serious payroll cutover capability
- Parallel allowed:
  - none

## Step 20 — Integrate HR, time, balances and agreements

- Innehåll:
  - update `packages/domain-hr`
  - update `packages/domain-time`
  - connect employments, schedules, time approvals and balances
- Required before:
  - payroll engine finalization
  - project labour costing
- Produces:
  - unified people and time base
- Parallel allowed:
  - none

## Step 21 — Extend payroll with balances, agreements and migration

- Innehåll:
  - update `packages/domain-payroll`
  - add stronger exceptions, correction flows and migration hooks
- Required before:
  - AGI hardening
  - project payroll costing
- Produces:
  - production-grade payroll core
- Parallel allowed:
  - Step 22 may start after pay run and pay item contracts are frozen

## Step 22 — Extend benefits, travel and pension bridge into payroll

- Innehåll:
  - update benefits, travel and pension packages
  - connect document-driven events and payroll consumption
- Required before:
  - full benefit and travel pilot
- Produces:
  - complete payroll-adjacent compensation chain
- Parallel allowed:
  - none

## Step 23 — Implement project cost allocation from payroll

- Innehåll:
  - extend payroll and projects
  - derive project cost snapshots with traceability
- Required before:
  - final project control workspace
- Produces:
  - exact payroll-driven project costing
- Parallel allowed:
  - none

## Step 24 — Build invoice legal field rules engine

- Innehåll:
  - add scenario field matrix
  - wire EU/export/reverse-charge/HUS blockers into AR issue path
- Required before:
  - final billing UI
  - HUS gate hardening
- Produces:
  - correct invoice issue gating
- Parallel allowed:
  - none

## Step 25 — Harden AR around issue gates, quote immutability and project links

- Innehåll:
  - update `packages/domain-ar`
  - strengthen quote versioning, order/project linkage and invoice state flow
- Required before:
  - final AR workbench
- Produces:
  - trustworthy billing core
- Parallel allowed:
  - Step 26 may start after AR issue contract is frozen

## Step 26 — Harden AP around import cases, person-linked docs and payments readiness

- Innehåll:
  - update `packages/domain-ap`
  - integrate document classification and import cases
- Required before:
  - final AP workbench
- Produces:
  - trustworthy purchasing core
- Parallel allowed:
  - Step 27 may start after AP payment readiness contract is frozen

## Step 27 — Harden banking and money movement runtime

- Innehåll:
  - update `packages/domain-banking`
  - add return handling, tax account bridge and failure states
- Required before:
  - final banking workbench
  - payroll payout hardening
- Produces:
  - trustworthy payment runtime
- Parallel allowed:
  - none

## Step 28 — Harden HUS invoice, payment, claim and recovery gates

- Innehåll:
  - update `packages/domain-hus`
  - enforce buyer/property/payment blockers and recovery chain
- Required before:
  - final HUS workbench
  - HUS submission automation
- Produces:
  - production-grade HUS chain
- Parallel allowed:
  - none

## Step 29 — Broaden personalliggare to industry packs and identity graph

- Innehåll:
  - update `packages/domain-personalliggare`
  - add workplace abstraction, device trust, contractor snapshots
- Required before:
  - final field-mobile attendance flows
- Produces:
  - broader compliance-ready personalliggare
- Parallel allowed:
  - none

## Step 30 — Add egenkontroll bounded context

- Innehåll:
  - create `packages/domain-egenkontroll`
  - add templates, checklist instances, deviations and sign-off
- Required before:
  - final project and field quality flows
- Produces:
  - quality control module
- Parallel allowed:
  - Step 31 may start after checklist and deviation contracts are frozen

## Step 31 — Add kalkyl bounded context

- Innehåll:
  - create `packages/domain-kalkyl`
  - add estimate versions, quantities and cost models
- Required before:
  - final quote/order/project budget link
- Produces:
  - estimate engine
- Parallel allowed:
  - none

## Step 32 — Extend projects and field to full workspace contract

- Innehåll:
  - update `packages/domain-projects`
  - update `packages/domain-field`
  - connect payroll actuals, HUS, personalliggare, egenkontroll, kalkyl
- Required before:
  - final project workspace
  - field-mobile rebuild
- Produces:
  - complete operational project model
- Parallel allowed:
  - none

## Step 33 — Harden reporting and search contracts

- Innehåll:
  - update `packages/domain-reporting`
  - establish projection contracts for search and saved views
- Required before:
  - final desktop shell and reports
- Produces:
  - stable read-model layer
- Parallel allowed:
  - none

## Step 34 — Add legal-form and declaration engine

- Innehåll:
  - extend annual/reporting stack with legal-form-specific package composition
- Required before:
  - annual reporting hardening
- Produces:
  - explicit legal-form-aware annual domain
- Parallel allowed:
  - none

## Step 35 — Harden annual reporting and submission chains

- Innehåll:
  - update `packages/domain-annual-reporting`
  - extend `packages/domain-integrations`
  - standardize filing receipts, correction chains and evidence packs
- Required before:
  - final annual workbench
- Produces:
  - filing-safe annual reporting product
- Parallel allowed:
  - Step 36 may start after annual package contracts are frozen

## Step 36 — Build the final design-system contracts and object profile standard

- Innehåll:
  - rewrite `packages/ui-core`
  - freeze object profile anatomy, table system, status language
- Required before:
  - all major surface rewrites
- Produces:
  - shared UI contract
- Parallel allowed:
  - limited public/auth visual work

## Step 37 — Freeze desktop IA and workbench topology

- Innehåll:
  - lock navigation tree
  - lock route tree and workspace shells
- Required before:
  - desktop UI implementation
- Produces:
  - stable desktop information architecture
- Parallel allowed:
  - Step 38 and Step 39 can proceed in parallel after this step

## Step 38 — Build public site

- Innehåll:
  - create `apps/public-web`
  - implement premium landing, role pages, trust and integrations pages
- Required before:
  - public launch
- Produces:
  - public enterprise presence
- Parallel allowed:
  - parallel with Step 39

## Step 39 — Rebuild auth and onboarding surfaces

- Innehåll:
  - auth entry, challenge center, device and session management, onboarding
- Required before:
  - desktop shell rollout
- Produces:
  - coherent auth experience
- Parallel allowed:
  - parallel with Step 38

## Step 40 — Rebuild the desktop shell

- Innehåll:
  - global nav
  - command bar
  - search entry
  - notification panel
  - activity panel
  - task center entry
- Required before:
  - detailed workbench implementation
- Produces:
  - new product frame
- Parallel allowed:
  - Step 41 and Step 42 can proceed in parallel after shell contracts are frozen

## Step 41 — Build finance workbenches

- Innehåll:
  - AP
  - AR and billing
  - banking
  - VAT
  - ledger and close
  - tax account
- Required before:
  - finance pilot
- Produces:
  - new finance operating surface
- Parallel allowed:
  - parallel with Step 42 only

## Step 42 — Build payroll, people and AGI workbenches

- Innehåll:
  - people
  - payroll calendar
  - balances
  - agreements
  - AGI
  - migration cockpit
- Required before:
  - payroll pilot
- Produces:
  - new payroll operating surface
- Parallel allowed:
  - parallel with Step 41 only

## Step 43 — Build project, field, HUS and quality workbenches

- Innehåll:
  - project control workspace
  - HUS workbench
  - field operations desktop support
  - egenkontroll workspace
  - kalkyl links
- Required before:
  - field-mobile rebuild finalization
- Produces:
  - complete operational workspace
- Parallel allowed:
  - none

## Step 44 — Build annual, submission and shared operations workbenches in desktop context

- Innehåll:
  - annual workspace
  - submissions workspace
  - review center final view
  - desktop-visible operational views that ordinary authorized users need
- Required before:
  - separate backoffice app finalization
- Produces:
  - complete compliance-operational desktop set
- Parallel allowed:
  - Step 45 may start after shared backoffice component contracts are frozen

Rules:
- inga supportfall, impersonationflöden, break glass-flöden eller audit-explorer-kärnflöden får räknas som klara i desktop vid detta steg
- detta steg får bara bygga de operativa ytor som hör till den vanliga inloggade produkten
- backoffice-specifika ytor färdigställs först i Step 45

## Step 45 — Build separate backoffice application

- Innehåll:
  - support cases
  - impersonation
  - access reviews
  - break glass
  - audit explorer
  - replay and jobs
  - flag operations
  - tenant diagnostics
- Required before:
  - ops pilot
- Produces:
  - support and operations surface
- Parallel allowed:
  - none

## Step 46 — Rebuild field-mobile from the new domain contracts

- Innehåll:
  - today
  - jobs
  - check-in
  - time
  - materials
  - photos
  - signatures
  - self-checks
  - expenses
  - sync health
- Required before:
  - field pilot
- Produces:
  - final field-mobile
- Parallel allowed:
  - none

## Step 47 — Extend and align public API, partner integrations and webhooks

- Innehåll:
  - update phase13 routes and contracts
  - ensure new domains expose safe integration points
- Required before:
  - external integrator pilot
- Produces:
  - aligned external surface
- Parallel allowed:
  - none

## Step 48 — Expand test suites using golden scenario catalog

- Innehåll:
  - add new unit, integration and E2E families
  - update golden data catalog
- Required before:
  - validation checkpoints 5 through final
- Produces:
  - real verification matrix
- Parallel allowed:
  - this step should run continuously after Step 6, but must be completed formally here before final validation

## Step 49 — Run checkpoint V1: platform and rulepack verification

- Verify:
  - worker runtime
  - replay
  - rulepack versioning
  - audit envelope
- Must pass before:
  - higher-volume domain work continues
- Parallel allowed:
  - none

## Step 50 — Run checkpoint V2: finance and tax foundation verification

- Verify:
  - accounting method
  - fiscal year
  - ledger series
  - tax account
  - VAT hardening
- Must pass before:
  - annual reporting and finance UI go-live testing
- Parallel allowed:
  - none

## Step 51 — Run checkpoint V3: document and payroll chain verification

- Verify:
  - document classification
  - benefits bridge
  - balances
  - agreements
  - payroll migration
  - AGI correction
- Must pass before:
  - payroll pilot readiness
- Parallel allowed:
  - none

## Step 52 — Run checkpoint V4: project, HUS and personalliggare verification

- Verify:
  - HUS accepted/partial/recovery
  - project payroll cost allocation
  - personalliggare kiosk offline
  - field-mobile conflict handling
- Must pass before:
  - field and HUS pilot readiness
- Parallel allowed:
  - none

## Step 53 — Run checkpoint V5: annual and filing verification

- Verify:
  - AB close
  - sole trader close
  - HB/KB close
  - submission receipts
  - tax account reconciliation
- Must pass before:
  - annual pilot readiness
- Parallel allowed:
  - none

## Step 54 — Run checkpoint V6: surface and operations verification

- Verify:
  - public site
  - auth
  - desktop shell
  - finance workbenches
  - payroll workbenches
  - projects workspace
  - backoffice
  - field-mobile
- Must pass before:
  - pre-pilot UAT
- Parallel allowed:
  - none

## Step 55 — Run checkpoint V7: resilience, backup, replay and emergency disable verification

- Verify:
  - restore drills
  - replay safety
  - emergency disable
  - support impersonation restrictions
  - queue dead-letter handling
- Must pass before:
  - external pilot
- Parallel allowed:
  - none

## Step 56 — Run pilot parallel runs

- Innehåll:
  - payroll parallel run
  - finance reconciliation parallel run
  - personalliggare controlled pilot
  - HUS controlled pilot
- Required before:
  - final production readiness
- Produces:
  - actual variance and operator feedback
- Parallel allowed:
  - all pilot lanes may run in parallel if checkpoints V1–V7 are green

## Step 57 — Execute pilot variance fixes

- Innehåll:
  - fix only variance-backed defects
  - rerun impacted golden scenarios and replay tests
- Required before:
  - final signoff
- Produces:
  - stabilized pilot result
- Parallel allowed:
  - none

## Step 58 — Final readiness signoff

- Innehåll:
  - confirm all mandatory policies
  - confirm all W1/W2 docs
  - confirm all mandatory runbooks
  - confirm all verification gates
- Required before:
  - broader rollout
- Produces:
  - official release-ready state
- Parallel allowed:
  - none

# Dependencies and prerequisites

## Absolute prerequisites before UI-heavy work

- Steps 4 through 16 must be complete before substantial UI workbench implementation.
- Steps 17 through 23 must be complete before payroll and project workbenches are finalized.
- Steps 24 through 29 must be complete before AR/AP/HUS/personalliggare field UIs are finalized.
- Steps 34 through 35 must be complete before annual and filing UIs are finalized.

## Absolute prerequisites before pilot

- V1 through V7 green
- W1 and W2 documents written
- backoffice ready
- restore and replay proven
- emergency disable proven
- golden scenarios implemented in tests for all highest-risk flows

# What can be done in parallel without losing control

## Safe parallel window A
After Step 6:
- write W1 rulepack docs
- write accounting method and fiscal year test plans
- prepare migration skeletons

## Safe parallel window B
After Step 13:
- implement review-center UI contracts
- implement notification and activity UI contracts
- do not yet finalize desktop shell

## Safe parallel window C
After Step 21:
- benefits/travel/pension bridge work
- payroll workbench drafts
- migration cockpit UI drafts

## Safe parallel window D
After Step 37:
- Step 38 public site
- Step 39 auth/onboarding
- design QA on object profiles

## Safe parallel window E
After Step 40:
- Step 41 finance workbenches
- Step 42 payroll workbenches

## Safe parallel window F
After Step 43:
- Step 44 annual and submission views
- Step 45 backoffice build preparation
- Step 46 field-mobile implementation can begin once project/field/mobile contracts are frozen

# When runtime hardening must happen

Runtime hardening must happen in three waves:

1. **Early hardening**  
   Steps 3 to 6.  
   This establishes platform, worker, rulepack and resilience base.

2. **Mid hardening**  
   Steps 27, 35 and 48.  
   This hardens banking, submissions and test coverage.

3. **Final hardening**  
   Steps 55 to 58.  
   This proves restore, replay, emergency disable and pilot stability.

# When rulepack work must happen

Rulepack work must happen in this order:

1. registry hardening at Step 6
2. accounting method and fiscal year packs before Steps 7 and 8
3. tax account, capitalization and document boundary packs before Steps 11, 14 and 15
4. balances and agreements packs before Steps 17 and 18
5. invoice legal field and HUS packs before Steps 24 and 28
6. personalliggare pack before Step 29
7. legal-form and close blocker packs before Steps 34 and 35
8. final vector completion before Step 48

# When document/person/payroll chain must happen

The chain must be built in this exact order:

1. document archive and OCR runtime hardened
2. document classification context created
3. review center available
4. benefits bridge integrated
5. payroll balances and agreements integrated
6. payroll consumes benefit and deduction intents
7. AGI correction path verified
8. golden scenarios GS-001 to GS-007 and GS-029 pass

# When HUS must be hardened

HUS must be hardened after invoice legal field rules but before final AR/HUS workbench completion:

1. invoice legal field rules engine
2. AR issue path hardening
3. HUS payment and claim gating
4. HUS partial acceptance and recovery handling
5. HUS receipts and replay ops
6. GS-015 to GS-017 pass

# When personalliggare must be broadened

Personalliggare broadening must happen before field-mobile finalization:

1. workplace and identity graph
2. contractor and employer snapshots
3. kiosk device trust
4. offline envelope ingest
5. correction policy
6. GS-021 passes

# When payroll migration and balances must be built

These must be complete before any payroll pilot:

1. balances engine
2. collective agreements engine
3. payroll migration engine
4. payroll integration with balances and agreements
5. migration cockpit UI
6. GS-018 and GS-019 pass

# When legal-form and annual reporting work must happen

Legal-form and annual work must happen after fiscal year, accounting method, tax account and close blocker work:

1. legal-form engine
2. annual reporting hardening
3. filing adapters and receipt normalization
4. annual workspace UI
5. GS-022 to GS-024 pass

# When UI reset must be integrated

UI reset integration points are fixed:

- Step 2: ADR and control acceptance
- Step 36: design system and object profile freeze
- Step 37: desktop IA freeze
- Steps 38 to 46: actual surface rebuilds
- Step 54: surface verification

No surface may be finalized outside this sequence.

# Validation checkpoints

## V1
Platform, jobs, rulepacks, resilience

## V2
Accounting method, fiscal year, ledger, VAT, tax account

## V3
Documents, classification, payroll, AGI, balances, agreements, migration

## V4
Projects, HUS, personalliggare, field-mobile

## V5
Close, legal forms, annual reporting, submissions

## V6
Public site, auth, desktop, mobile, backoffice

## V7
Restore, replay, emergency disable, support security

Each checkpoint is a hard gate. Failure at a checkpoint stops later rollout work until corrected.

# Exit gate

Detta dokument är uppfyllt först när följande gäller:

- byggordningen är exakt nog att följas steg för steg
- alla centrala beroenden är uttryckligen utskrivna
- all tillåten parallellisering är uttryckligen utskriven
- runtime hardening, rulepacks, document/person/payroll chain, HUS, personalliggare, payroll migration, annual work och UI-reset alla har exakt plats i ordningen
- inga kritiska områden lämnas som “kan tas senare”
- build sequence stämmer med gap-registret, code impact map, domain map och document manifest
- Codex kan följa denna sekvens direkt utan att behöva gissa vad som kommer först, vad som blockeras av vad eller när UI-arbetet får börja på allvar

