# Master metadata

- Document ID: TP-016
- Title: Golden Data Catalog
- Status: Binding
- Owner: QA architecture and domain verification
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/test-plans/golden-data-catalog.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-rulepack-register.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - all regulated domains
- Related code areas:
  - `tests/golden/*`
  - `packages/*`
  - `apps/*`
- Related future documents:
  - all domain-specific test plans

# Purpose

Lista de bindande golden datasets som krävs för reproducerbar verifiering av reglerade flöden, replay, rulepack-ändringar och pilot readiness.

# Scope

Omfattar:

- datasetfamiljer
- versioneringsregler
- required outputs
- mapping till testplaner och verification gates

Omfattar inte:

- rå implementationsdetalj för fixtures eller generatorskript

# Blocking risk

Utan golden data uppstår:

- oklara expected outcomes
- omöjlig diff mellan regelversioner
- svag replay- och restoreverifiering

# Golden scenarios covered

Varje dataset ska mappa till minst ett scenario i master golden scenario-katalogen och till minst en testplan.

# Fixtures and golden data

Varje dataset måste innehålla:

- input fixtures
- relevant rulepack version
- expected state transitions
- expected postings or reports
- expected review and blocker outcomes
- expected receipts där externa flöden finns

# Unit tests

Golden data får användas som unit-fixtures där domänregler kräver exakt utfall.

# Integration tests

Golden data ska köras i integrationstester för att verifiera persistence, projections, receipts och cross-domain chains.

# E2E tests

Utvalda golden datasets ska exponeras som E2E-scenarier för desktop, mobile och backoffice där UI spelar roll.

# Property-based tests where relevant

Golden data kompletterar men ersätter inte property-based tests.

# Replay/idempotency tests where relevant

Varje golden dataset som passerar queue, submission, import eller annual package build måste kunna replayas med identiskt utfall eller definierad no-op.

# Failure-path tests

Varje kritisk datasetfamilj ska ha minst en failure-variant som visar blocker, review eller transportfel.

# Performance expectations where relevant

Stora golden families ska kunna köras i batch utan att överskrida definierad CI- eller stagingbudget.

# Catalog

| Dataset ID | Domain | Versioning family | Primary expected outputs | Related scenarios | Related test plans | Blocks |
| --- | --- | --- | --- | --- | --- | --- |
| `GD-DOC-INBOX` | documents | semantic | routing, OCR split, review handoff | document intake flows | document classification, AI boundary | V3 |
| `GD-ACCOUNTING-METHOD` | accounting method | semantic | posting timing by method | cash vs invoice method | accounting-method-tests | V2 |
| `GD-FISCAL-YEAR` | fiscal year | semantic | period generation, short year, broken year | broken fiscal year | fiscal-year-and-broken-year-tests | V2 |
| `GD-LEDGER-CORE` | ledger | semantic | balanced journals, correction chain, locks | locked period correction | core finance suites | V2 |
| `GD-VAT-SE` | VAT | semantic | declaration boxes, review branches, import/reverse charge | VAT reverse charge, VAT import, VAT credit note | VAT and HUS suites | V2 |
| `GD-IMPORT-CASE` | import case | semantic | multi-document linkage, import VAT, freight/spedition allocation | import with later customs, import with later freight | import-case and AP tests | V3 |
| `GD-AR-INVOICE-GATES` | AR | semantic | invoice issue blockers, credit chains, HUS-compatible outputs | HUS accepted, partial accepted | HUS and AR suites | V3 |
| `GD-AP-OPERATIONS` | AP | semantic | invoice ingest, approvals, payment readiness | AP high-risk flows | AP and review-center suites | V3 |
| `GD-TAX-ACCOUNT` | tax account | semantic | tax subledger import, offset, interest/fees handling | tax account offset | tax-account-offset-tests | V3/V5 |
| `GD-PAYROLL-CORE` | payroll | semantic | gross-to-net, AGI outputs, postings | payroll standard, AGI correction | payroll suites | V3 |
| `GD-PAYROLL-MIGRATION` | payroll migration | semantic | YTD import, balances, diff report, cutover | payroll migration with balances | payroll-migration-and-balance-tests | V3 |
| `GD-BENEFITS-BRIDGE` | benefits | semantic | benefit classification, net deduction and payroll linkage | taxable benefit, net salary deduction, wellness threshold | benefits and AI boundary suites | V3 |
| `GD-HUS-CHAIN` | HUS | semantic | invoice gate, payment gate, claim and recovery chain | HUS accepted, partial accepted, recovery | hus-edge-case-tests | V4 |
| `GD-PERSONALLIGGARE` | personalliggare | semantic | kiosk offline, correction chain, employer/contractor snapshots | personalliggare kiosk offline | personalliggare-industry-tests, mobile-offline-conflict-tests | V4 |
| `GD-PROJEKT-KOSTNAD` | projects | semantic | payroll-driven actuals, WIP and budget compare | project cost from payroll | project-payroll-cost-allocation-tests | V4 |
| `GD-ANNUAL-AB-K2` | annual reporting | semantic | AB annual package, signoff, receipts | annual close AB | annual-reporting-by-legal-form-tests | V5 |
| `GD-ANNUAL-AB-K3` | annual reporting | semantic | AB annual package K3 path | annual close AB advanced | annual-reporting-by-legal-form-tests | V5 |
| `GD-ANNUAL-EF` | annual reporting | semantic | economic association annual path | annual close economic association | annual-reporting-by-legal-form-tests | V5 |
| `GD-ANNUAL-HB-KB-INK4` | annual reporting | semantic | HB/KB declaration path | annual close HB/KB | annual-reporting-by-legal-form-tests | V5 |
| `GD-ANNUAL-HB-KB-WITH-ANNUAL-REPORT` | annual reporting | semantic | HB/KB annual-report obligation path with dual filing readiness | annual close HB/KB with annual-report obligation | annual-reporting-by-legal-form-tests | V5 |
| `GD-ANNUAL-SOLE-TRADER-NE` | annual reporting | semantic | sole trader declaration/year-end path | annual close sole trader | annual-reporting-by-legal-form-tests | V5 |
| `GD-ANNUAL-SHORT-YEAR` | annual reporting | semantic | short-year package selection, declaration profile continuity and blocked sole-trader short-year variants | short-year filing profile selection | annual-reporting-by-legal-form-tests, fiscal-year-and-broken-year-tests | V2/V5 |
| `GD-ANNUAL-CORRECTION-CHAIN` | annual reporting | semantic | superseding package, preserved receipts | annual correction after reopen | annual-reporting-by-legal-form-tests | V5 |
| `GD-DR-RESTORE` | resilience | semantic | restore, replay and reconciliation after recovery | restore/replay scenarios | resilience suites | V7 |

# Versioning rules

- patch version: metadata or non-semantic fixture cleanup
- minor version: new edge cases without changing expected outcomes for prior scenarios
- major version: changed expected outcome because rules, policy or accounting interpretation changed

# Required contents per dataset

- input fixtures or generator
- expected outputs
- related rulepack versions
- related scenarios
- failure-path variant where applicable
- mapping to verification gates

# Acceptance criteria

- varje blockerande domän har minst en golden family
- high-risk flows har explicit golden coverage
- annual/legal-form datasets finns för AB, EF, HB/KB och sole trader
- replay-sensitive datasets kan köras om deterministiskt

# Exit gate

- [ ] varje blockerande domän har minst ett golden dataset
- [ ] datasetversion och expected outcomes är dokumenterade
- [ ] rulepackändringar skapar ny datasetversion när utfall ändras
- [ ] restore och replay av golden data kan köras i tom miljö
