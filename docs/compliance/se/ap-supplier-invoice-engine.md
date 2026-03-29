> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: SE-CMP-015
- Title: AP Supplier Invoice Engine
- Status: Binding
- Owner: Finance compliance architecture
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/compliance/se/ap-supplier-invoice-engine.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-rulepack-register.md`
- Related domains:
  - AP
  - documents
  - VAT
  - import cases
- Related code areas:
  - `packages/domain-ap/*`
  - `packages/document-engine/*`
  - `packages/domain-vat/*`
  - `packages/domain-import-cases/*`
  - `packages/domain-ledger/*`
- Related future documents:
  - `docs/compliance/se/import-case-engine.md`
  - `docs/compliance/se/person-linked-document-classification-engine.md`
  - `docs/compliance/se/document-inbox-and-ocr-engine.md`

# Purpose

Definiera den bindande motorn för inkommande leverantörsfakturor, dubblettskydd, attest, import-case-koppling och AP-reskontra.

# Scope

Ingår:

- leverantörsidentitet
- supplier invoice draft från dokument
- duplicate control
- coding and approval
- import-case linkage
- payment readiness

Ingår inte:

- bankexecution
- företagskort och privata utlägg
- generella asset-regler i detalj

# Non-negotiable rules

1. Supplier invoice får inte bokföras utan leverantörsidentitet, externt referensnummer eller säker alternativ identitet, fakturadatum, förfallodatum och minst en konteringsrad.
2. Exakt eller sannolik dubblett ska stoppas innan postning.
3. Postad AP-faktura får inte redigeras; rättelse sker via kredit, reversal eller ny faktura.
4. Import- och tullrelaterade dokument ska gå genom import-case där scenariot kräver fler dokument.
5. Personpåverkande dokument i AP-flödet får inte auto-kostas utan klassning genom document-person engine.

# Definitions

- `Supplier invoice draft`: AP-utkast skapat från dokument eller manuell registrering.
- `Duplicate suspect`: objekt som blockerar postning tills verifiering skett.
- `Coding line`: konteringsrad med konto, momsbeslut och dimensioner.
- `Import case linkage`: koppling mellan leverantörsfaktura, tull, spedition och senare avgifter.

# Object model

## SupplierInvoice

Fält:

- `supplier_invoice_id`
- `supplier_id`
- `external_invoice_ref`
- `invoice_date`
- `due_date`
- `currency_code`
- `gross_amount`
- `status`
- `document_id`
- `import_case_id`

## SupplierInvoiceCodingLine

Fält:

- `supplier_invoice_coding_line_id`
- `supplier_invoice_id`
- `account_code`
- `net_amount`
- `vat_decision_snapshot_id`
- `cost_center_id`
- `project_id`
- `person_link_id`

## SupplierLiabilityOpenItem

Fält:

- `supplier_liability_open_item_id`
- `supplier_invoice_id`
- `open_amount`
- `status`
- `scheduled_payment_batch_id`

# Required fields

- supplier identity
- invoice reference
- invoice date
- due date
- total amount
- coding lines
- VAT decision
- document reference or manual origin justification

# State machines

## SupplierInvoice

- `inbox_received`
- `draft`
- `duplicate_suspect`
- `pending_approval`
- `approved`
- `posted`
- `scheduled_for_payment`
- `paid`
- `credited`
- `reversed`

## SupplierLiabilityOpenItem

- `open`
- `reserved_for_payment`
- `settled`
- `reopened_by_reversal`

# Validation rules

1. Duplicate fingerprint blockeras före `approved`.
2. Invoice utan konto, VAT beslut eller supplier identity får inte nå `approved`.
3. Import-case-scenario med ofullständig tull- eller fraktkedja ska gå till review, inte autopostas.
4. Person-linked treatment från dokumentklassning måste vara låst innan AP-draft kan skickas vidare för kostnadsbokning där personpåverkan finns.

# Deterministic decision rules

## Rule AP-001: Draft creation

Dokument från inbox eller Peppol får skapa AP-draft men aldrig direkt postad faktura.

## Rule AP-002: Duplicate protection

Fingerprint på leverantör, referensnummer, datum, belopp, valuta och dokumenthash ska användas för att stoppa exakt dubblett och markera sannolik dubblett.

## Rule AP-003: Import-case handoff

Om scenario indikerar import, tull eller senare spedition ska fakturan länkas till `import_case_id` och väntas in som case, inte behandlas isolerat.

## Rule AP-004: Payment readiness

`scheduled_for_payment` får bara nås när approvallager, duplicate control, bankuppgifter och eventuella tax/import reviews är gröna.

# Rulepack dependencies

- `RP-VAT-SE`
- `RP-IMPORT-CASE-SE`
- `RP-CAPITALIZATION-SE`
- `RP-PERSON-LINKED-DOCUMENTS-SE`

# Posting/accounting impact

- `posted` skapar leverantörsskuld, kostnad eller tillgång samt moms enligt VAT-beslut
- kredit eller reversal skapar separat correction chain
- payment reservation ändrar öppen post-status men ersätter inte bankbekräftelse

# Payroll impact where relevant

- privat utlägg, förmånsfall eller nettolöneavdrag får inte slutbehandlas i AP utan handoff till relevant persondomän

# VAT impact where relevant

- VAT-domänen äger momsbeslut, avdragsrätt, omvänd moms och importmomslogik

# Review requirements

Review krävs vid:

- sannolik dubblett
- osäker supplier identity
- osäker moms eller importkedja
- personpåverkande dokument

# Correction model

- före postning: rätta draft
- efter postning: kredit, reversal eller ny faktura

# Audit requirements

Audit ska visa:

- source document
- duplicate evaluation
- approval chain
- VAT snapshot
- import-case linkage
- payment reservation and settlement

# Golden scenarios covered

- import with later customs
- import with later freight/spedition
- mixed document split

# API implications

- intake-to-draft commands
- duplicate evaluation endpoints
- approve/post/reverse commands
- import-case linkage endpoints

# Test implications

- duplicate control
- person-linked document handoff
- import-case gating
- payment readiness logic

# Exit gate

- [ ] leverantörsfaktura kan inte autopostas från dokument utan kontrollkedja
- [ ] import-case och personpåverkande scenarier stoppas korrekt
- [ ] AP-reskontra och correction chain är reproducerbar

