# Master metadata

- Document ID: ADR-0024
- Title: Document, Person, Payroll and Ledger Chain Architecture
- Status: Accepted
- Owner: Compliance architecture for documents, payroll and benefits
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior ADR
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - documents
  - document classification
  - benefits
  - payroll
  - AGI
  - ledger
- Related code areas:
  - `packages/document-engine/*`
  - `packages/domain-document-classification/*`
  - `packages/domain-benefits/*`
  - `packages/domain-payroll/*`
  - `packages/domain-ledger/*`
  - `apps/api/*`
- Related future documents:
  - `docs/compliance/se/person-linked-document-classification-engine.md`
  - `docs/policies/document-review-and-economic-decision-policy.md`
  - `docs/test-plans/document-person-payroll-agi-tests.md`
  - `docs/test-plans/document-classification-ai-boundary-tests.md`

# Purpose

Låsa den bindande arkitekturen för hur ett dokument kan få personpåverkan och därifrån påverka review, förmån, nettolöneavdrag, utlägg, AGI och ledger utan att någon del avgörs implicit i UI eller OCR.

# Status

Accepted.

# Context

Repo:t har bra dokumentingest, OCR och AP/benefits/payroll-bitar men saknar en full kedja för dokument som:

- avser privat köp på företagskort
- är utlägg som ska ersättas
- blir skattepliktig förmån
- blir nettolöneavdrag
- innehåller friskvård inom eller över policygräns
- behöver split mellan kostnad, tillgång, förmån och privat del

Detta är en av de högsta riskerna i hela systemet eftersom samma underlag kan påverka både bokföring, lön, skatt och revision.

# Problem

Utan explicit arkitektur riskerar systemet att:

- bokföra först och förstå personpåverkan senare
- låta OCR eller AI fatta slutligt ekonomiskt beslut
- missa AGI- eller payrollpåverkan
- sakna correction chain mellan dokumentbeslut och senare lön eller ledger

# Decision

1. Ett nytt bounded context, `document-classification`, införs mellan dokumentmotorn och downstream-domäner.
2. Ett dokument får aldrig påverka payroll, AGI eller ledger direkt från OCR-resultat.
3. Klassningsobjektet blir källan till dokumentets ekonomiska och personrelaterade behandling.
4. Resultatet av klassning uttrycks som explicit treatment intents, inte som direkt bokföring.
5. `benefits`, `payroll` och `ledger` konsumerar intents genom egna application services.
6. Tvetydiga eller riskfyllda fall måste gå via review center innan slutlig downstream-påverkan.

# Scope

Beslutet omfattar document classification cases, person links, split cases, payroll intents, benefit intents, expense reimbursement intents och correction/replay chain. Det omfattar inte själva OCR-extraktionen eller slutliga UI-mockar.

# Boundaries

`document-engine` äger råfiler, OCR runs, document identity och immutable archive.

`document-classification` äger classification case, suggested and approved treatments, person links, cost share split, required review och treatment history.

`benefits` äger förmånsvärdering, policygränser och benefit events.

`payroll` äger payroll entries, AGI payload constituents och net deduction realization.

`ledger` äger journals och postings som skapas först när treatment chain är godkänd.

# Alternatives considered

## Let AP and benefits classify documents directly

Avvisas eftersom samma dokument då får olika ägare beroende på kanal i stället för på faktisk behandling.

## Let OCR classification be final when confidence is high

Avvisas eftersom confidence aldrig ersätter bindande ekonomiskt ansvar.

## Handle person-related documents only inside payroll

Avvisas eftersom många beslut måste tas redan innan ett underlag får bli lönepåverkan.

# Consequences

- nytt bounded context och nya case-objekt krävs
- benefits och payroll måste läsa treatment intents i stället för råa dokument
- AP och bankflöden behöver koppling till classification cases när dokumentet också påverkar person

# Migration impact

- existerande dokumentflöden behöver ett nytt handoff-steg
- gamla direkta kopplingar mellan OCR och bokföringsförslag måste brytas
- benefits- och payrollhändelser behöver referenser tillbaka till classification case

# Verification impact

Verifiering måste visa att:

- privat köp aldrig bokas som bolagskostnad utan explicit policybeslut
- dokument kan splitas i flera behandlingar med separata downstream-effekter
- review och override är fullt auditerade
- payroll och AGI bara bygger på godkända treatment intents

# Exit gate

ADR:n är uppfylld först när:

- `packages/domain-document-classification` finns
- inga dokument längre går direkt från OCR till slutlig bokföring eller payroll
- golden tests för document -> person -> payroll -> AGI är skrivna
