# Master metadata

- Document ID: SE-CMP-004
- Title: Tax Account and Offset Engine
- Status: Binding
- Owner: Finance compliance architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated tax-account engine document
- Approved by: User directive, MCP-001 and ADR-0025
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - tax account
  - banking
  - VAT
  - payroll
  - close
- Related code areas:
  - `packages/domain-tax-account/*`
  - `packages/domain-banking/*`
  - `packages/domain-vat/*`
  - `packages/domain-payroll/*`
  - `packages/domain-reporting/*`
- Related future documents:
  - `docs/adr/ADR-0025-tax-account-and-offset-architecture.md`
  - `docs/domain/tax-account-reconciliation-and-settlement.md`
  - `docs/runbooks/tax-account-reconciliation.md`
  - `docs/test-plans/tax-account-offset-tests.md`

# Purpose

Definiera motorn för skattekontohändelser, kvittningar, ränta, avgifter, återbetalningar och avstämning mot huvudbok.

# Scope

Ingår:

- import av skattekontohändelser
- event mapping
- offset chains
- interest and fee events
- refund handling
- discrepancy cases

Ingår inte:

- själva inlämningen av moms- eller AGI-filer
- privatpersoners slutskattelogik utanför företagsdomänen

# Non-negotiable rules

1. Skattekontot är en egen operativ subledger.
2. En inbetalning till skattekontot kan inte styras till en enskild skatt eller avgift; den ska behandlas mot det sammanlagda underskottet.
3. Räntor, avgifter, beslut och återbetalningar ska hanteras som explicita tax-account events.
4. Intäktsränta och kostnadsränta ska registreras som egna händelser.
5. Bokföringsspegeln i huvudboken får inte ersätta den operativa skattekontohistoriken.

# Definitions

- `Tax account event`: importerad eller registrerad skattekontohändelse.
- `Offset chain`: explicit koppling mellan händelser som avräknar eller reglerar varandra.
- `Discrepancy case`: avvikelse mellan skattekonto, deklarationsunderlag, bank och ledger.
- `Reconciliation snapshot`: sammanfattning av skattekontoläge vid viss tidpunkt.

# Object model

## TaxAccountEvent

Fält:

- `tax_account_event_id`
- `company_id`
- `event_date`
- `posting_date`
- `event_type`
- `amount`
- `currency`
- `source_reference`
- `import_batch_id`
- `rulepack_version`

## OffsetRelation

Fält:

- `offset_relation_id`
- `from_event_id`
- `to_event_id`
- `offset_amount`
- `offset_date`
- `offset_reason_code`

## DiscrepancyCase

Fält:

- `discrepancy_case_id`
- `company_id`
- `status`
- `detected_at`
- `difference_type`
- `difference_amount`
- `review_required`

# Required fields

- event type
- amount
- event date
- source reference
- import source or manual registration basis
- mapping status

# State machines

## TaxAccountEvent

- `imported`
- `mapped`
- `posted_to_ledger`
- `reconciled`
- `corrected`

## DiscrepancyCase

- `open`
- `under_review`
- `resolved`
- `escalated`

# Validation rules

1. Samma externa händelse får inte importeras dubbelt.
2. Event type måste mappas mot tillåten tax-account taxonomy.
3. Offset får inte överstiga tillgängligt eventbelopp.
4. Manuala justeringar kräver reason code och review.
5. Ledger-spegling får inte ske innan event mapping är klar.

# Deterministic decision rules

## Rule TAX-001: Event import

Varje skattekontohändelse ska importeras som separat event med oförändrad källidentitet.

## Rule TAX-002: Payment handling

Inbetalningar till skattekontot ska behandlas som betalning mot skattekontots samlade saldo, inte som användarstyrd betalning av en viss enskild skatt eller avgift.

## Rule TAX-003: Interest handling

Intäktsränta och kostnadsränta ska skapas som egna event och bokföras via explicit mapping, inte som dold differens i reconciliation.

## Rule TAX-004: Discrepancy creation

Om imported skattekontoevent inte kan mappas mot väntad deklarations- eller betalningskedja ska discrepancy case skapas.

# Rulepack dependencies

- `RP-TAX-ACCOUNT-MAPPING-SE`
- `RP-TAX-ACCOUNT-OFFSET-SE`
- `RP-CLOSE-LOCK-SE`

# Posting/accounting impact

- mapped events skapar ledger-spegling enligt policy
- offset chains ska kunna härledas till vilka skatter eller avgifter som faktiskt reglerats
- discrepancy cases ska inte tvinga bokföring utan review

# Payroll impact where relevant

- AGI-relaterade skulder och betalningar ska kunna följas från payroll till skattekonto

# VAT impact where relevant

- momsrelaterade skulder, betalningar eller återbetalningar ska kunna följas från VAT till skattekonto

# Submission/receipt behavior where relevant

- event mapping ska kunna länka till deklarations- eller beslutskedja när sådan finns

# Review requirements

Review krävs när:

- event inte kan mappas deterministiskt
- belopp avviker från väntat deklarationsunderlag
- återbetalning eller ränta saknar förväntad kedja

# Correction model

- felaktig mapping rättas genom ny mapping- eller correction chain
- ursprungliga imported events ska aldrig muteras bort

# Audit requirements

Audit ska visa:

- källhändelse
- mappingregel
- ledger-spegling
- offset chain
- discrepancy resolution

# Golden scenarios covered

- tax account offset
- tax account refund
- interest event
- mismatch between tax account and declaration

# API implications

Kommandon:

- `import_tax_account_events`
- `map_tax_account_event`
- `create_offset_relation`
- `open_discrepancy_case`
- `resolve_discrepancy_case`

Queries:

- `get_tax_account_balance`
- `get_tax_account_event_history`
- `get_open_discrepancy_cases`

# Test implications

Måste täckas av:

- `docs/test-plans/tax-account-offset-tests.md`

# Exit gate

- [ ] skattekontohändelser finns som egen domänhistorik
- [ ] offset och räntor är explicita objekt
- [ ] mismatch faller ut i discrepancy cases
- [ ] bank, VAT och payroll kan avstämmas mot skattekonto
