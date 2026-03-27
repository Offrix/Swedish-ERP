> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: SE-CMP-014
- Title: AR Customer Invoicing Engine
- Status: Binding
- Owner: Finance compliance architecture
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/compliance/se/ar-customer-invoicing-engine.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-rulepack-register.md`
- Related domains:
  - AR
  - VAT
  - HUS
  - projects
- Related code areas:
  - `packages/domain-ar/*`
  - `packages/domain-vat/*`
  - `packages/domain-hus/*`
  - `packages/domain-ledger/*`
  - `apps/api/*`
- Related future documents:
  - `docs/compliance/se/invoice-legal-field-rules-engine.md`
  - `docs/compliance/se/hus-invoice-and-claim-gates.md`
  - `docs/compliance/se/project-billing-and-revenue-recognition-engine.md`

# Purpose

Definiera den bindande motorn för offert, order, faktura, kreditnota och kundreskontra med hårda issue-gates för svensk fakturering.

# Scope

Ingår:

- quote/order/invoice chain
- kundreskontra och öppna poster
- kreditnotor och ändringskedjor
- invoice field rules
- HUS-overlay
- project and order linkage

Ingår inte:

- peppol transport
- bankexekvering
- allmän project profitability-logik

# Non-negotiable rules

1. Faktura får inte utfärdas utan att invoice-field rules är gröna.
2. Unikt löpnummer ska låsas vid issue och får inte återanvändas.
3. HUS-faktura måste passera både AR-gates och HUS-gates.
4. Kreditnota eller ändringsfaktura får inte skriva över ursprungsfakturan; den ska skapa egen kedja.
5. Kundreskontra ska vara reproducerbar från append-only events, allokeringar och reverseringar.
6. Överbetalning är aldrig intäkt; den ska ligga som kundskuld eller ej allokerat belopp tills beslut finns.

# Definitions

- `Quote`: versionsstyrt försäljningsunderlag utan bokföring.
- `Order`: accepterat kommersiellt åtagande som kan generera leverans och fakturering.
- `Invoice`: utgående faktura med juridiskt och ekonomiskt låsta data.
- `Invoice amendment chain`: kredit- och ändringskedja som bevarar tidigare issue.
- `Receivable`: öppen kundfordran som regleras av betalning, kredit eller write-off enligt policy.

# Object model

## CustomerInvoice

Fält:

- `customer_invoice_id`
- `invoice_no`
- `invoice_type_code`
- `customer_id`
- `issue_date`
- `supply_date`
- `due_date`
- `currency_code`
- `status`
- `invoice_field_evaluation_id`
- `vat_decision_snapshot_id`
- `hus_case_id`

## InvoiceLine

Fält:

- `invoice_line_id`
- `customer_invoice_id`
- `line_type_code`
- `source_object_type`
- `source_object_id`
- `description`
- `quantity`
- `unit_price`
- `net_amount`
- `vat_code`
- `project_id`

## ReceivableOpenItem

Fält:

- `receivable_open_item_id`
- `customer_invoice_id`
- `customer_id`
- `open_amount`
- `currency_code`
- `status`
- `aging_bucket_code`

# Required fields

- kundidentitet
- issue date
- due date
- invoice number
- line descriptions
- taxable amount by line
- VAT decision per line
- payment reference
- explicit payment-link provider code när betalningslänk begärs
- source object or free-text justification

# State machines

## Quote

- `draft`
- `sent`
- `accepted`
- `rejected`
- `expired`
- `converted`

## CustomerInvoice

- `draft`
- `validated`
- `approved`
- `issued`
- `partially_paid`
- `paid`
- `disputed`
- `credited`
- `reversed`

## ReceivableOpenItem

- `open`
- `partially_settled`
- `settled`
- `written_down`
- `reopened_by_reversal`

# Validation rules

1. `approved` kräver att invoice-field-evaluation är `passed`.
2. Om `hus_case_id` finns krävs att HUS-overlay är grön innan `issued`.
3. Kreditnota kräver referens till ursprungsfaktura eller policytillåten fristående kreditorsak.
4. Deldeliverans får inte överfakturera källobjektet utan dokumenterad override.
5. Valuta, momsbeslut och kundtyp måste vara konsistenta med scenario- och rulepackval.
6. Betalningslänk får bara skapas för issued debiterbar faktura och måste bära explicit provider code; tyst demo-default är förbjuden.

# Deterministic decision rules

## Rule AR-001: Issue gate

Faktura får gå till `issued` först när:

- required fields finns
- invoice-field rules är godkända
- VAT beslut är låst
- HUS overlay är godkänd där relevant
- nödvändig approval finns

## Rule AR-002: Open item creation

Vid `issued` ska exakt en kundreskontrapost eller en definierad öppen post-kedja skapas per faktura, baserat på invoice type och accounting method.

## Rule AR-003: Credit chain

Kredit ska spegelvända eller justera öppna poster utan att redigera det ursprungliga issue-objektet.

## Rule AR-004: Payment allocation

Allokeringar ska vara idempotenta och får inte överskrida öppet belopp. Osäker matchning ska gå till review eller manuellt arbetsflöde.

# Rulepack dependencies

- `RP-INVOICE-FIELD-RULES-SE`
- `RP-VAT-SE`
- `RP-HUS-SE`
- `RP-ACCOUNTING-METHOD-SE`

# Posting/accounting impact

- `issued` skapar kundfordran, intäkt och moms enligt VAT-beslut och accounting method
- kredit och write-down skapar separat correction chain
- betalning reglerar kundfordran men skapas från banking allocation, inte från UI-status

# VAT impact where relevant

- VAT-domänen äger momssats, ruta och särskild text
- AR får inte issue:a om VAT beslut saknas eller är blockerande

# HUS impact where relevant

- HUS-klassade rader måste driva `hus_case_id` och claim-beredskap

# Review requirements

Review krävs vid:

- specialfaktura med osäker moms
- kredit över återstående tillåtet belopp
- HUS-avvikelse
- osäker kundidentitet eller köparfördelning

# Correction model

- före issue: rätta draft
- efter issue: kreditnota, ändringsfaktura, reversal eller ny faktura

# Audit requirements

Audit ska visa:

- issue approval
- invoice-field evaluation
- VAT snapshot
- HUS snapshot where relevant
- amendment chain
- allocations and reversals

# Golden scenarios covered

- standard full invoice
- amendment invoice with reference
- HUS accepted
- HUS partially accepted
- VAT credit note

# API implications

- quote/order/invoice commands
- issue and credit commands
- allocation and dispute endpoints
- invoice-field evaluation reads

# Test implications

- issue blockers
- credit chain
- HUS overlays
- customer allocation behavior

# Exit gate

- [ ] issue kan inte ske utan invoice-field rules och rätt approvals
- [ ] kundreskontra är append-only och reproducerbar
- [ ] HUS- och momsavvikelser fångas före ekonomisk effekt

