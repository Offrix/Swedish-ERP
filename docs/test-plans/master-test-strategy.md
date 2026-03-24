# Master metadata

- Document ID: TP-014
- Title: Master Test Strategy
- Status: Binding
- Owner: QA architecture and delivery verification
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/test-plans/master-test-strategy.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-document-manifest.md`
  - `docs/master-control/master-rulepack-register.md`
- Related domains:
  - all regulated domains and surfaces
- Related code areas:
  - `tests/*`
  - `apps/*`
  - `packages/*`
- Related future documents:
  - all specific test plans listed in `docs/master-control/master-document-manifest.md`

# Purpose

Definiera den bindande teststrategin för hela systemet från plattform till pilot så att varje reglerat beslut, varje domänmotor och varje operatörsyta verifieras reproducerbart.

# Scope

Omfattar:

- testlager
- testägarskap
- golden-data-struktur
- environments
- releasekrav
- obligatoriska tvärgående testplaner

Omfattar inte:

- domänspecifika detaljer som redan ägs av separata testplaner

# Blocking risk

Otillräcklig teststrategi ger:

- regressionsfel i bokföring, moms, lön, AGI, HUS och annual filing
- falsk driftmognad
- okontrollerad AI-automation
- oförklarliga skillnader mellan gamla och nya rulepacks

# Golden scenarios covered

Masterstrategin täcker hela `docs/master-control/master-golden-scenario-catalog.md` genom att tvinga varje scenario till minst ett testlager och minst en golden-data-representation där det är reglerat eller finansiellt riskfyllt.

# Fixtures and golden data

Alla reglerade domäner ska ha:

- syntetiska men realistiska fixtures
- golden datasets med versionsnummer
- expected outputs för posting, receipts, review och blockers
- replaybara migrations- och integrationfixtures där det krävs

# Unit tests

Måste finnas för:

- rena domänfunktioner
- state-machine transitions
- deterministic decision rules
- field validation
- mapping- och splitlogik
- formattering endast där formattering påverkar contracts

# Integration tests

Måste finnas för:

- databas, migrations och projections
- queue/outbox/replay
- document ingest och OCR-handoff
- annual-reporting package build
- submission/receipt persistence
- bank/payments adapters
- search indexing
- mobile sync envelope handling

# E2E tests

Måste finnas för:

- desktop workbench-flöden för finance, payroll, review och annual
- field-mobile kärnflöden
- support/backoffice-kärnflöden
- high-risk close, HUS, AGI och filing flows

# Property-based tests where relevant

Måste finnas där invariants lämpar sig, särskilt för:

- ledger balance
- rulepack date selection
- payroll totals
- VAT mapping completeness
- idempotency keys
- package fingerprint consistency

# Replay/idempotency tests where relevant

Måste finnas för:

- worker jobs
- submissions
- receipts
- import batches
- payment exports
- annual package submissions
- mobile sync merges

# Failure-path tests

Måste finnas för:

- invalid state transitions
- missing required fields
- external adapter failures
- transport receipt without domain acceptance
- review-required branches
- replay after dead-letter

# Performance expectations where relevant

Prestandatest krävs för:

- dokumentingest
- AP/AR batchflöden
- stora lönesatser
- reporting/export
- search
- queue recovery
- annual package build

# Acceptance criteria

- varje blockerande domän har minst unit, integration och relevant golden coverage
- varje high-risk user flow har minst ett E2E-scenario
- varje release till reglerat område kör relevanta golden suites
- varje produktionsincident i reglerad kärna ger nytt regressionstest

# Test layers

## 1. Static analysis

- lint
- format
- typecheck
- dependency boundary checks
- secrets scanning
- migration consistency checks

## 2. Unit tests

Täcker deterministic rules, field validation, state machines och små rent funktionella komponenter.

## 3. Property-based tests

Täcker invariants, datumgränser, summaregler och replay-/idempotencyegenskaper.

## 4. Contract tests

Täcker API-kontrakt, adapters, file formats, submission payloads, webhook events och offline envelopes.

## 5. Golden-data tests

Täcker hela affärsfall med låsta indata och förväntat utfall för journaler, reports, receipts, blockers och review.

## 6. Integration tests

Täcker verkliga domänkedjor över databas, queue, object storage, adapters och projections.

## 7. E2E tests

Täcker UI till API till persistence till regulated outcome för de viktigaste operatörsflödena.

## 8. Performance and resilience tests

Täcker load, replay, restore, chaos och degraded external dependencies.

# Mandatory cross-cutting plans

Följande testplaner är obligatoriska när scopet berör området:

- `docs/test-plans/queue-resilience-and-replay-tests.md`
- `docs/test-plans/search-relevance-and-permission-trimming-tests.md`
- `docs/test-plans/mobile-offline-sync-tests.md`
- `docs/test-plans/migration-parallel-run-diff-tests.md`
- `docs/test-plans/audit-review-and-sod-tests.md`
- `docs/test-plans/feature-flag-rollback-and-disable-tests.md`
- `docs/test-plans/report-reproducibility-and-export-integrity-tests.md`

# Test data policy

- all testdata ska vara syntetisk eller avidentifierad
- samma dataset ska kunna användas i local, CI och staging om inte adaptersekretess hindrar det
- golden datasets ska vara versionsstyrda och append-only
- nytt reglerat produktionsfel kräver nytt regressionstest eller ny golden vector

# Environments

## local

- snabb feedback
- seed-data
- stubbar och lokala emulatorer

## ci

- rena containrar
- statisk analys
- unit, property och contract baseline
- utvalda integrationstester

## staging

- produktlik miljö
- adapter-sandboxar eller säkra stubbar
- restoretest
- belastningstest före större release

## pilot

- nära skarp datamängd
- daglig differenskontroll
- explicit incidentspårning och backoffice support

# Test ownership

- domänutvecklare äger unit- och integrationstester för sin domän
- integrationsägare äger adapter- och contracttester
- QA-ägare äger E2E och golden orchestration
- SRE/ops äger resilience, restore och chaos
- produkt- och complianceansvariga signerar acceptance för reglerade flöden

# Release policy

- reglerade domäner får inte deployas utan relevanta golden suites
- schemaändringar kräver migrations- och rollbackplan
- rulepackändringar kräver effective-dating-, rollback- och replaytester
- submissionformatändringar kräver contract tests och stagingkörning
- search, offline, queue och exportändringar kräver sina tvärgående testplaner

# Exit gate

- [ ] testlagren finns definierade och används
- [ ] golden data är versionsstyrd
- [ ] replay, restore och failure paths testas
- [ ] alla nya reglerade buggar genererar regressionstest
- [ ] tvärgående testplaner är kopplade till release- och pilotkrav
