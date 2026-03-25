# REGULATED_SUBMISSIONS_RECEIPTS_AND_RECOVERY

Status: Bindande transport-, receipt- och recoverymodell för AGI, VAT, HUS och annual filing/declarations.

Detta dokument definierar den gemensamma submissionmodellen. Ingen myndighetsinlämning får byggas utanför denna modell.

## 1. Syfte

Skilja affärsdomänens payload och versioner från integrationsdomänens transport, receipts, retries, replay, dead-letter och recovery.

## 2. Objektmodell

### 2.1 SubmissionEnvelope
- `submission_envelope_id`
- `submission_type`
- `tenant_id`
- `source_domain`
- `source_object_type`
- `source_object_id`
- `source_object_version`
- `payload_hash`
- `payload_schema_code`
- `transport_mode`
- `signing_requirement_code`
- `status`
- `idempotency_key`

### 2.2 SubmissionAttempt
- `submission_attempt_id`
- `submission_envelope_id`
- `attempt_no`
- `trigger_type`
- `started_at`
- `completed_at`
- `status`
- `provider_ref`
- `response_hash`

### 2.3 SubmissionReceipt
- `submission_receipt_id`
- `submission_envelope_id`
- `receipt_class`
- `provider_status`
- `normalized_status`
- `received_at`
- `is_terminal`
- `raw_payload_hash`
- `decision_amounts_when_relevant`

### 2.4 SubmissionActionQueueItem
- `submission_action_queue_item_id`
- `submission_envelope_id`
- `action_type`
- `priority`
- `status`
- `owner_queue`
- `sla_due_at`

### 2.5 SubmissionCorrectionLink
- `submission_correction_link_id`
- `original_submission_envelope_id`
- `correcting_submission_envelope_id`
- `reason_code`

### 2.6 SubmissionEvidencePack
- `submission_evidence_pack_id`
- `submission_envelope_id`
- `submitted_artifact_refs`
- `signature_refs`
- `receipt_refs`
- `operator_actions`
- `audit_refs`

## 3. Receipt classes

Systemet måste explicit skilja:

- `prepared`
- `validated`
- `signed`
- `submitted`
- `technical_acknowledgement`
- `business_acknowledgement`
- `final_outcome`
- `retry_required`
- `correction_required`
- `closed`

Ytterligare normalized statuses:
- `transport_failed`
- `schema_rejected`
- `business_rejected`
- `manual_intervention_required`
- `dead_lettered`

## 4. Regler per submissiontyp

### 4.1 AGI
- source object = `AgiSubmissionPeriod`
- correction kräver ny periodversion
- technical receipt kan komma från testtjänst eller teknisk filuppladdning
- business acknowledgement avser faktisk inlämning/acceptans
- reconciliation måste ske mot payroll state och tax account liabilities

### 4.2 VAT
- source object = `VatDeclarationVersion`
- correction sker genom ny full deklaration
- reconciliation måste ske mot VAT decision base och tax account liabilities

### 4.3 HUS
- source object = `HusClaimVersion`
- business decision måste kunna vara partial acceptance eller rejection
- reconciliation måste ske mot HUS-state, AR och ledger

### 4.4 Annual filing / declarations
- source object = `AnnualPackage` eller legal-form-specific declaration package
- technical validation och final filing decision måste skiljas åt
- reconciliation måste ske mot annual package chain och legal-form obligation profile

## 5. State machine

`draft -> validated -> signed -> submitted -> technical_acknowledgement -> business_acknowledgement -> final_outcome | retry_required | correction_required | transport_failed -> closed`

Ytterligare branch:
- `dead_lettered` kan inträffa från `submitted` eller `technical_acknowledgement` när tekniska försök fastnar och manuell operatör krävs

## 6. Commands

- `prepare_submission_envelope`
- `validate_submission_payload`
- `sign_submission`
- `submit_submission`
- `record_submission_receipt`
- `open_submission_action_queue_item`
- `request_submission_replay`
- `open_submission_correction`
- `close_submission`

## 7. Events

- `submission.prepared`
- `submission.validated`
- `submission.signed`
- `submission.submitted`
- `submission.receipt.recorded`
- `submission.retry.required`
- `submission.correction.required`
- `submission.dead_lettered`
- `submission.closed`

## 8. Retry, replay och correction

### 8.1 Retry
Retry används när:
- transportfel inträffat
- timeout inträffat
- provider explicit klassar felet som retryable

Retry får aldrig:
- skapa nytt source object
- ändra payload hash
- kringgå signoff expiry utan ny signoff om policy kräver det

### 8.2 Replay
Replay används när:
- samma payloadversion ska skickas om eller receipts ska hämtas igen
- operator har approval där regelverk kräver

Replay kräver:
- reason code
- replay plan
- audit
- same source object version

### 8.3 Correction
Correction används när:
- source data ändrats materiellt
- myndigheten kräver rättelse
- period reopen skett
- annual package eller HUS claim måste ersättas

Correction kräver:
- nytt source object version
- nytt payload hash
- correction link
- preserved prior receipts

## 9. Dead-letter

Dead-letter ska öppnas när:
- max retry attempts överskrids
- credentials eller schemafel kräver manuell åtgärd
- provider svarar inkonsistent eller utan korrelerbar receipt
- receipt saknas utanför definierad väntetid

Dead-letter case ska visa:
- source object
- source version
- attempts
- response hashes
- provider health
- recommended action
- replay eligibility

## 10. Operator intervention

Operator intervention krävs när:
- technical receipt saknas
- business receipt avvisar payload
- correction required är satt
- dead-letter öppnas
- replay kräver approval
- liability reconciliation misslyckas efter final outcome

Operator actions ska vara:
- `retry_same_payload`
- `replay_same_payload`
- `open_correction_case`
- `mark_business_rejected`
- `link_external_receipt`
- `waive_with_reason`

## 11. Evidence pack

Varje regulated submission ska ha evidence pack med:
- source snapshot reference
- payload hash
- rendered artifact hash
- signer identity
- signing time
- technical receipt hashes
- business decision hashes
- operator actions
- audit chain refs

## 12. Reconciliation rules

### 12.1 AGI
- final outcome ska matchas mot payroll period status
- liability ska kunna följas till tax account

### 12.2 VAT
- final outcome ska matchas mot VAT declaration version
- liability ska kunna följas till tax account

### 12.3 HUS
- final outcome ska matchas mot HUS claim version
- payout/rejection/recovery ska kunna följas till AR och ledger

### 12.4 Annual filing
- final outcome ska matchas mot annual package version
- obligation profile ska markeras uppfylld eller fortsatt blockerad

## 13. API-krav

- `POST /v1/submissions`
- `GET /v1/submissions`
- `GET /v1/submissions/:id`
- `POST /v1/submissions/:id/sign`
- `POST /v1/submissions/:id/submit`
- `POST /v1/submissions/:id/replay`
- `POST /v1/submissions/:id/corrections`
- `GET /v1/submissions/:id/receipts`
- `GET /v1/submissions/:id/evidence-pack`

Alla dessa rutter ska bära:
- idempotency
- correlation id
- permission enforcement
- receipt-aware error contract

## 14. Runtime-krav

- transport körs alltid via worker
- polling eller callback receipts körs via worker
- provider outages påverkar health status
- dead-letter och replay går via backoffice
- signature expiry ska stoppa resend om nytt signoff krävs

## 15. Testimplicationer

- duplicate submit same payload
- missing technical receipt
- technical receipt without business decision
- business rejection
- correction after submitted
- dead-letter and replay
- liability reconciliation success/failure
- evidence pack completeness
- restore drill with submission chain intact

## 16. Runbookimplicationer

Varje regulated submissiontyp måste ha runbook för:
- submit
- retry/replay
- correction
- dead-letter
- external receipt linking
- reconciliation failure
- incident escalation

## 17. Exit gate

Dokumentet är uppfyllt först när:
- AGI, VAT, HUS och annual filing använder samma envelope/receiptmodell
- technical receipt och business decision hålls isär
- retry, replay, correction och dead-letter är separata flöden
- evidence pack går att läsa för varje submission
- reconciliation till payroll, ledger, tax account och annual state är implementerad
