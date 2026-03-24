# Master metadata

- Document ID: TP-015
- Title: Master Verification Gates
- Status: Binding
- Owner: Delivery verification and release control
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/test-plans/master-verification-gates.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-document-manifest.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - all domains and surfaces
- Related code areas:
  - `tests/*`
  - `apps/*`
  - `packages/*`
- Related future documents:
  - all verification-oriented runbooks and test plans in the manifest

# Purpose

Definiera de bindande grindar som måste passeras innan ett område, en fas, en pilot eller en release får betraktas som klar.

# Scope

Omfattar:

- cross-cutting verification packages
- V1 till V7 checkpoints från master build sequence
- release evidence
- gate ownership

Omfattar inte:

- detaljerad implementation av enskilda testfall

# Blocking risk

Utan bindande verification gates uppstår:

- otestade steg i byggordningen
- falsk pilot readiness
- release utan bevis för replay, restore och rulepack-stabilitet

# Golden scenarios covered

Varje V-gate måste explicit mappa till berörda golden scenarios i `docs/master-control/master-golden-scenario-catalog.md`.

# Fixtures and evidence

Varje gate kräver:

- testresultat
- build artifact references
- migrationslista
- replay/restore-resultat där relevant
- kända begränsningar
- rollback- eller correctionplan där relevant

# Unit tests

En gate får inte passera om en blockerande domän saknar gröna unit- och invariantsviter.

# Integration tests

En gate får inte passera om berörda integrationskedjor saknar gröna integrationstester.

# E2E tests

En gate som introducerar eller ändrar operatörsytor måste ha gröna E2E-flöden för berörda roller.

# Property-based tests where relevant

Gäller särskilt V1, V2, V3 och V5 där invariants kring regelval, posting och package-fingerprints är centrala.

# Replay/idempotency tests where relevant

Måste passera för V1, V3, V5 och V7.

# Failure-path tests

Måste passera för varje gate där externa adapters, signoff eller replay är involverade.

# Performance expectations where relevant

V4, V6 och V7 kräver att relevanta performance- och resilience-mål är gröna.

# Verification packages always required when scope applies

- `docs/test-plans/queue-resilience-and-replay-tests.md`
- `docs/test-plans/search-relevance-and-permission-trimming-tests.md`
- `docs/test-plans/mobile-offline-sync-tests.md`
- `docs/test-plans/migration-parallel-run-diff-tests.md`
- `docs/test-plans/audit-review-and-sod-tests.md`
- `docs/test-plans/feature-flag-rollback-and-disable-tests.md`
- `docs/test-plans/report-reproducibility-and-export-integrity-tests.md`

# Verification checkpoints

## V1 Platform and rulepack verification

Måste visa:

- worker runtime fungerar med persistent jobs
- replay och dead-letter fungerar
- rulepack effective dating, pinning och rollback fungerar
- audit envelope och correlation ids fungerar

## V2 Finance and tax foundation verification

Måste visa:

- accounting method fungerar
- fiscal year fungerar
- voucher/invoice series fungerar
- VAT och tax account foundation fungerar
- close-readiness inte bryts av nya foundation changes

## V3 Document and payroll chain verification

Måste visa:

- document classification fungerar
- review boundary fungerar
- balances, agreements och payroll migration fungerar
- AGI correction chain fungerar
- benefit bridge fungerar

## V4 Project, HUS and personalliggare verification

Måste visa:

- HUS accepted/partial/recovery fungerar
- payroll cost allocation till projekt fungerar
- personalliggare offline/kiosk fungerar
- field-mobile conflict handling fungerar

## V5 Annual and filing verification

Måste visa:

- AB annual path fungerar
- sole-trader annual/declaration path fungerar
- HB/KB path fungerar
- EF path fungerar
- technical vs domain receipts skiljs åt

## V6 Surface and operations verification

Måste visa:

- public site
- auth
- desktop shell
- finance workbenches
- payroll workbenches
- projects workspace
- backoffice
- field-mobile

## V7 Resilience and emergency verification

Måste visa:

- restore drills
- replay safety
- emergency disable
- support impersonation restrictions
- queue dead-letter handling

# Gate ownership

- engineering lead äger tekniskt bevis
- QA lead äger testbevis
- compliance owner äger reglerat godkännande
- product owner äger releasebeslut först efter att övriga tre signerat

# Acceptance criteria

- varje gate är mappad till build sequence
- varje gate har tydliga blockerande kriterier
- inget område kan hoppa över relevant gate
- gate evidence kan granskas i efterhand

# Exit gate

- [ ] ingen fas markeras klar utan dokumenterat bevis
- [ ] V1 till V7 är definierade och användbara
- [ ] gate-status kan granskas i efterhand
- [ ] pilot eller release kräver godkända relevanta gates
