> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: SE-CMP-011
- Title: Bank and Payments Engine
- Status: Binding
- Owner: Banking architecture and finance compliance architecture
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/compliance/se/bank-and-payments-engine.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - banking
  - payments
  - tax account
  - AR
  - AP
  - payroll
- Related code areas:
  - `packages/domain-banking/*`
  - `packages/domain-tax-account/*`
  - `packages/domain-ar/*`
  - `packages/domain-ap/*`
  - `packages/domain-payroll/*`
- Related future documents:
  - `docs/compliance/se/tax-account-and-offset-engine.md`
  - `docs/domain/tax-account-reconciliation-and-settlement.md`

# Purpose

Definiera den bindande bank- och betalningsmotorn för inbetalningar, utbetalningar, returer, matchning och operativ avstämning.

# Scope

Ingår:

- bank accounts and statements
- payment orders
- payment returns
- settlement events
- reconciliation
- tax-account relation

Ingår inte:

- klientmedelshantering som kräver separat reglerad lösning
- full PSP-plattform

# Non-negotiable rules

1. Pengarörelser ska vara spårbara från källa till reglering.
2. Betalningsorder och bankretur ska vara explicita objekt.
3. Okänd bankhändelse ska inte bokas som om den vore löst affärsfall.
4. Matchning ska vara deterministisk eller gå till review/reconciliation workbench.
5. Skattekontoinbetalningar ska kunna särskiljas från övriga betalningar men skattekontoäventyret ägs av tax-account-domänen.

# Definitions

- `Bank account`
- `Bank statement event`
- `Payment order`
- `Payment return`
- `Settlement`
- `Reconciliation case`

# Object model

## BankStatementEvent

Fält:

- `bank_statement_event_id`
- `bank_account_id`
- `booking_date`
- `amount`
- `currency`
- `counterparty`
- `reference_text`
- `match_status`

## PaymentOrder

Fält:

- `payment_order_id`
- `company_id`
- `payment_type`
- `amount`
- `currency`
- `scheduled_date`
- `status`
- `source_object_ref`

## PaymentReturn

Fält:

- `payment_return_id`
- `payment_order_id`
- `return_code`
- `returned_at`
- `amount`

## ReconciliationCase

Fält:

- `reconciliation_case_id`
- `company_id`
- `case_type`
- `status`
- `difference_amount`

# Required fields

- bank account identity
- amount
- date
- source or counterparty reference
- match status

# State machines

## PaymentOrder

- `draft`
- `scheduled`
- `submitted`
- `booked`
- `returned`
- `cancelled`

## ReconciliationCase

- `open`
- `in_review`
- `resolved`
- `written_off`

# Validation rules

1. Samma bankhändelse får inte importeras dubbelt.
2. Payment return måste peka på payment order eller uttryckligen skapa reviewfall.
3. Matchning som inte är säker får inte auto-bokas som slutligt reglerad.
4. Oidentifierad betalning får inte döljas som “övrigt” utan review- eller settlement-case.

# Deterministic decision rules

## Rule BAP-001: Statement import

Varje bankhändelse ska importeras med stabil extern referens och idempotensskydd.

## Rule BAP-002: Matching

Matchning ska primärt använda referens, motpart, belopp, datumfönster och känt öppet objekt. När flera rimliga kandidater finns ska review eller reconciliation case skapas.

## Rule BAP-003: Returns

Bankretur ska skapa explicit return-händelse och återöppna eller korrigera källa enligt domänregler, inte bara sätta osynlig misslyckad status.

# Rulepack dependencies

- `RP-BANK-MATCHING-SE`
- `RP-TAX-ACCOUNT-MAPPING-SE`
- `RP-CLOSE-LOCK-SE`

# Posting/accounting impact

- bankhändelser och betalningsorder ska kunna speglas i ledger
- returer och mismatch ska kunna skapa correction- eller reviewflöden

# Payroll impact where relevant

- payroll payouts och returer ska kunna härledas via payment order och return chain

# VAT impact where relevant

- momsdeklaration påverkas inte direkt av bankmotorn, men felaktig matchning av momsbetalningar eller återbetalningar kan skapa close- och tax-account-avvikelser

# Submission/receipt behavior where relevant

- externa bankadaptrar ska bära tekniska kvittenser eller motsvarande statuskedja där sådan finns

# Review requirements

Review krävs när:

- matchning är osäker
- returkod kräver manuell tolkning
- bankevent inte kan bindas till källa eller skattekonto

# Correction model

- felmatchning rättas genom settlement/reconciliation correction chain
- historiska bankevent skrivs inte över

# Audit requirements

Audit ska visa:

- bankevent
- matchningsgrund
- operatorbeslut
- return chain
- ledger-spegling

# Golden scenarios covered

- unmatched bank receipt
- payment return
- tax account payment
- duplicate import prevented

# API implications

Kommandon:

- `import_bank_statement_events`
- `create_payment_order`
- `book_payment_order`
- `register_payment_return`
- `resolve_reconciliation_case`

Queries:

- `get_bank_statement_events`
- `get_payment_order`
- `get_open_reconciliation_cases`

# Test implications

- statement import idempotency
- payment return handling
- reconciliation branching
- tax-account linked payment flows

# Exit gate

- [ ] bank events, payment orders and returns är explicita objekt
- [ ] osäkra matchningar går till review eller reconciliation
- [ ] tax-account-flöden kan särskiljas och härledas

