# Master metadata

- Document ID: SE-CMP-008
- Title: Document Inbox and OCR Engine
- Status: Binding
- Owner: Document architecture and compliance architecture
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/compliance/se/document-inbox-and-ocr-engine.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - documents
  - OCR
  - review center
  - document classification
- Related code areas:
  - `packages/document-engine/*`
  - `packages/domain-review-center/*`
  - `packages/domain-document-classification/*`
  - `apps/api/*`
  - `apps/worker/*`
- Related future documents:
  - `docs/compliance/se/person-linked-document-classification-engine.md`
  - `docs/domain/review-center.md`

# Purpose

Definiera den bindande intake- och OCR-motorn för dokument, inklusive arkivkedja, deduplicering, OCR-versioner, routing och handoff till review center och document-classification.

# Scope

Ingår:

- inboxkanaler
- intake events
- raw mail och attachments
- dokument och dokumentversioner
- OCR runs
- klassificeringsförslag
- karantän och felköer

Ingår inte:

- slutlig ekonomisk klassning
- bokföring
- slutlig löne- eller AGI-behandling

# Non-negotiable rules

1. Originalfil och råmeddelande får aldrig skrivas över.
2. Varje ny OCR-körning ska vara en ny version eller nytt derivat, inte mutation av tidigare resultat.
3. Deduplicering ska ske på minst meddelande-id, filhash och affärsidentitet där sådan finns.
4. Låg confidence får inte auto-dispatchas till ekonomiskt slutflöde.
5. Dokument med möjlig personpåverkan ska handoff:as till document-classification, inte direkt till AP eller ledger.

# Definitions

- `Inbox channel`
- `Intake event`
- `Raw message`
- `Document`
- `Document version`
- `OCR run`
- `Classification suggestion`
- `Quarantine`

# Object model

## IntakeEvent

Fält:

- `intake_event_id`
- `channel_id`
- `company_id`
- `received_at`
- `source_message_id`
- `status`

## Document

Fält:

- `document_id`
- `company_id`
- `document_type`
- `source_channel`
- `archive_state`
- `current_version_id`

## DocumentVersion

Fält:

- `document_version_id`
- `document_id`
- `version_no`
- `version_type`
- `storage_object_ref`
- `created_at`
- `reason_code`

## OcrRun

Fält:

- `ocr_run_id`
- `document_version_id`
- `model_version`
- `status`
- `field_confidence_map`
- `text_extract_ref`

# Required fields

- company
- source channel
- received timestamp
- document identity
- current archive location
- OCR model version where OCR is used

# State machines

## IntakeEvent

- `received`
- `accepted`
- `quarantined`
- `rejected`

## Document

- `created`
- `classified`
- `extracted`
- `linked`
- `archived`

## OcrRun

- `requested`
- `processing`
- `completed`
- `failed`

# Validation rules

1. Samma filhash inom samma bolag och relevant tidsfönster ska ge duplicate detection.
2. Okänd eller otillåten filtyp ska stoppas före OCR.
3. Dokument utan säker bolagsrouting får inte gå vidare till downstream-domän.
4. `unknown` document_type får inte auto-dispatchas till AP, AR eller payroll.

# Deterministic decision rules

## Rule DOC-001: Archive first

Varje intake ska först arkiveras och få stabil dokumentidentitet innan OCR eller routing får påverka arbetsflöden.

## Rule DOC-002: Versioned OCR

Ny OCR-modell, ny korrigering eller omkörning ska skapa ny `OcrRun` och vid behov ny dokumentversion eller derivat, men aldrig skriva över äldre körning.

## Rule DOC-003: Review handoff

Låg confidence, dokumentkonflikt, osäker bolagsrouting eller personpåverkande behandling ska skapa review- eller classification handoff, inte direkt ekonomiskt utfall.

# Rulepack dependencies

- `RP-DOCUMENT-CLASSIFICATION-SE`
- `RP-AI-BOUNDARY-SE`
- `RP-INVOICE-FIELD-RULES-SE`

# Posting/accounting impact

- dokumentmotorn skapar inga slutliga ledger-postings
- dokument kan endast generera intents eller handoff till downstream-domäner

# Payroll impact where relevant

- dokument med möjlig personpåverkan ska dispatchas till classification-motorn

# VAT impact where relevant

- OCR och dokumenttyp kan ge VAT-relevant underlag men inga slutliga momsbeslut

# Review requirements

Review krävs när:

- bolag eller kanal är osäker
- dubblett är sannolik men inte säker
- OCR eller dokumenttyp är osäker
- dokumentet ser ut att kunna påverka person, lön eller HUS

# Correction model

- korrigering av OCR-fält eller routing sker som ny auditbar korrigering
- gamla OCR-resultat bevaras

# Audit requirements

Audit ska visa:

- intake chain
- raw source
- document versions
- OCR runs
- manuella korrigeringar
- handoff till review eller downstream-domän

# Golden scenarios covered

- duplicate upload
- low-confidence OCR
- mixed attachments in one email
- person-impact document handoff

# API implications

Kommandon:

- `register_intake_event`
- `create_document`
- `run_ocr`
- `rerun_ocr`
- `route_document`
- `quarantine_document`

Queries:

- `get_document`
- `get_document_versions`
- `get_ocr_runs`

# Test implications

- duplicate detection
- versioned OCR reruns
- archive integrity
- review handoff

# Exit gate

- [ ] archive, OCR och versioner är append-only
- [ ] dokument går inte direkt till slutlig bokföring
- [ ] review/classification handoff fungerar
