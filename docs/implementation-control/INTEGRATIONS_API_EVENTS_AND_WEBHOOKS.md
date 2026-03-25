# INTEGRATIONS_API_EVENTS_AND_WEBHOOKS

Status: Bindande integrations-, API-, event- och webhookspecifikation.

Detta dokument definierar allt integrationslager som måste finnas för att plattformen ska kunna driva ett helt bolag och slå Fortnox, Visma, Bokio, Wint, Byggdagboken och Bygglet.

## 1. Globala integrationsregler

1. Varje integration använder samma kärnobjekt:
   - `IntegrationConnection`
   - `CredentialSetMetadata`
   - `ConsentGrant`
   - `CapabilityDescriptor`
   - `ProviderHealthRecord`
   - `IntegrationOperation`
   - `OperationAttempt`
   - `OperationReceipt`
   - `SyncCursor`
   - `WebhookSubscription`
   - `WebhookDelivery`
2. Alla integrationer måste ha sandbox/test/prod-separation.
3. Alla muterande integrationer ska vara idempotenta.
4. Alla outbound operationer ska vara asynkrona om de kan nätverksfelas, timeouta eller ge senare receipt.
5. Integrationsdomänen äger teknisk transport, credentials, consent, provider health och attempt chain. Källdomänen äger affärsutfallet.
6. Webhooks får aldrig markeras levererade utan faktisk HTTP-transport.
7. Credentials får aldrig lagras i read models eller exponeras i audit. Audit lagrar endast referenser, scopes, certifikatversion och provider metadata.
8. Varje adapter måste passera contract tests mot både sandbox och prod-simulator innan den aktiveras.
9. Fallback får aldrig dölja att realtidssynk saknas; systemet ska uttryckligen växla till filimport, manuell stegning eller degraded mode.
10. Integrationsfel ska alltid materialisera operatorvänliga work items eller action queue items när retry inte räcker.

## 2. Standardobjekt

### 2.1 IntegrationConnection
- `integration_connection_id`
- `tenant_id`
- `integration_area`
- `provider_code`
- `environment`
- `status`
- `capability_profile`
- `created_at`
- `activated_at`
- `revoked_at`

### 2.2 CredentialSetMetadata
- `credential_set_id`
- `integration_connection_id`
- `credential_type`
- `secret_provider_ref`
- `certificate_version`
- `expires_at`
- `rotation_due_at`
- `status`

### 2.3 ConsentGrant
- `consent_grant_id`
- `integration_connection_id`
- `scope_list`
- `granted_at`
- `expires_at`
- `refreshable`
- `status`

### 2.4 IntegrationOperation
- `integration_operation_id`
- `integration_connection_id`
- `operation_type`
- `source_object_type`
- `source_object_id`
- `payload_hash`
- `idempotency_key`
- `status`
- `retry_class`
- `next_attempt_at`

### 2.5 OperationReceipt
- `operation_receipt_id`
- `integration_operation_id`
- `attempt_no`
- `provider_status`
- `normalized_status`
- `response_hash`
- `http_status`
- `latency_ms`
- `received_at`
- `is_terminal`

### 2.6 WebhookSubscription
- `webhook_subscription_id`
- `tenant_id`
- `consumer_type`
- `signing_key_version`
- `endpoint_url`
- `event_filter`
- `status`
- `secret_rotation_due_at`

### 2.7 WebhookDelivery
- `webhook_delivery_id`
- `webhook_subscription_id`
- `event_id`
- `sequence_no`
- `status`
- `attempt_no`
- `next_attempt_at`
- `response_hash`
- `dead_letter_reason_code`

## 3. Standardroutefamiljer

### 3.1 Integrationskärna
- `POST /v1/integrations/connections`
- `GET /v1/integrations/connections`
- `GET /v1/integrations/connections/:id`
- `POST /v1/integrations/connections/:id/authorize`
- `POST /v1/integrations/connections/:id/refresh-consent`
- `POST /v1/integrations/connections/:id/revoke`
- `GET /v1/integrations/connections/:id/health`
- `POST /v1/integrations/connections/:id/contract-tests`
- `GET /v1/integrations/operations`
- `GET /v1/integrations/operations/:id`
- `POST /v1/integrations/operations/:id/replay`
- `POST /v1/integrations/operations/:id/cancel`
- `GET /v1/integrations/dead-letters`

### 3.2 Webhooks
- `POST /v1/public-api/webhook-subscriptions`
- `GET /v1/public-api/webhook-subscriptions`
- `PATCH /v1/public-api/webhook-subscriptions/:id`
- `POST /v1/public-api/webhook-subscriptions/:id/rotate-secret`
- `GET /v1/public-api/webhook-events`
- `GET /v1/public-api/webhook-deliveries`
- `POST /v1/public-api/webhook-deliveries/:id/redeliver`
- `POST /v1/public-api/webhook-subscriptions/:id/replay-from-sequence`

### 3.3 Public API
- `POST /v1/public/oauth/token`
- `GET /v1/public/spec`
- `GET /v1/public/sandbox/catalog`
- `GET /v1/public/object-profiles/:type/:id`
- `GET /v1/public/report-snapshots`
- `GET /v1/public/submissions`
- `GET /v1/public/search`

### 3.4 Partner API
- `POST /v1/partners/connections`
- `GET /v1/partners/catalog`
- `POST /v1/partners/contract-tests`
- `POST /v1/partners/operations`
- `GET /v1/partners/operations/:id`
- `POST /v1/partners/operations/:id/replay`

## 4. Standardevents

- `integration.connection.created`
- `integration.connection.authorized`
- `integration.connection.revoked`
- `integration.health.changed`
- `integration.consent.expiring`
- `integration.operation.created`
- `integration.operation.succeeded`
- `integration.operation.failed`
- `integration.operation.dead_lettered`
- `webhook.subscription.created`
- `webhook.delivery.attempted`
- `webhook.delivery.delivered`
- `webhook.delivery.dead_lettered`
- `submission.receipt.recorded`

## 5. Standard failure model

### Retry classes
- `safe_retry_immediate`
- `safe_retry_backoff`
- `manual_review_required`
- `credential_issue`
- `provider_outage`
- `consumer_bug`
- `permanent_schema_mismatch`
- `business_rejection_no_retry`

### Dead-letter rules
- hamnar i dead-letter efter max attempts eller permanent schema/credential-fel
- dead-letter kräver action queue item
- replay kräver reason code
- replay av reglerad submission kräver domain approval

### Health checks
Varje adapter måste exponera:
- auth validity
- credential expiry
- provider reachability
- capability version
- last successful operation
- error-rate window
- lag window eller cursor freshness

## 6. Integrationsområden

### 6.1 Bankanslutning och statement import

**Klass**
- Must-have

**Varför**
- bankavstämning, kundinbetalningar, leverantörsbetalningar, löneutbetalningar och close kräver verkliga bankhändelser

**Riktning**
- bidirectional

**Source of truth**
- banken för råa transaktioner och saldon
- banking-domänen för matchning och settlementstatus

**Required objects**
- `BankConnection`
- `BankAccount`
- `StatementBatch`
- `StatementLine`
- `BankBalanceSnapshot`
- `BankReconciliationCase`

**Required API**
- `POST /v1/banking/connections`
- `POST /v1/banking/statements/import-jobs`
- `GET /v1/banking/accounts/:id/statements`
- `GET /v1/banking/reconciliation-cases`

**Required events**
- `bank.connection.authorized`
- `bank.statement.imported`
- `bank.statement.import_failed`
- `bank.transaction.matched`
- `bank.transaction.unmatched`

**Onboarding**
- OAuth/open banking consent där det finns
- file-channel setup för CAMT053/BGMax/Plusgiro där det krävs
- bankkonto-verifiering per tenant
- sandbox med syntetiska statements

**Retry/replay/fallback/audit**
- cursor-based replay
- duplicate line dedupe på provider transaction id + amount + date + account
- fallback till filimport när realtidskoppling saknas
- full import receipts och reconciliation audit

**Operativt ansvar**
- integrations + banking

### 6.2 Betalningsordrar, Bankgiro, Plusgiro, Autogiro och payout runtime

**Klass**
- Must-have

**Varför**
- konkurrenterna erbjuder verkliga betalflöden; utan detta är plattformen inte primär arbetsplats

**Riktning**
- export och callback/import

**Source of truth**
- banking-domänen för order
- banken/BG/PG för teknisk settlement
- AP, payroll och AR för affärsunderlag

**Required objects**
- `PaymentOrder`
- `PayoutBatch`
- `PaymentReturn`
- `Mandate`
- `CollectionRun`

**Required API**
- `POST /v1/banking/payment-orders`
- `POST /v1/banking/payout-batches`
- `POST /v1/banking/autogiro/mandates`
- `POST /v1/banking/payment-orders/:id/cancel`

**Required events**
- `bank.payment_order.submitted`
- `bank.payment_order.returned`
- `bank.payment_order.settled`
- `autogiro.mandate.activated`
- `collection.run.completed`

**Onboarding**
- file credentials, certificates och account authorization
- payment role approvals
- per-bank capability descriptor

**Retry/replay/fallback/audit**
- idempotent by payment order id + payload hash
- retry endast när provider ej slutligt tagit emot ordern
- manual recovery via bank file import om callback saknas
- evidence: order file hash, receipt, signer, bank response

**Operativt ansvar**
- banking + integrations + finance ops

### 6.3 Payment links och kundbetalning online

**Klass**
- Should-have

**Varför**
- accelererar field-to-invoice och SMB collection

**Riktning**
- export + webhook return

**Source of truth**
- AR för fakturan
- payment provider för payment session
- banking/AR för settlement

**Required objects**
- `PaymentLinkSession`
- `PaymentLinkReceipt`
- `PaymentLinkRefund`

**Required API**
- `POST /v1/ar/invoices/:id/payment-links`
- `POST /v1/public-api/payment-webhooks/provider`
- `GET /v1/ar/payment-links/:id`

**Required events**
- `payment_link.created`
- `payment_link.paid`
- `payment_link.expired`
- `payment_link.refunded`

**Onboarding**
- PSP credentials
- brand profile
- callback secret
- sandbox merchant account

**Retry/replay/fallback/audit**
- webhook signature verification
- replay from provider event id
- fallback till manuell inbetalningsregistrering om session saknas
- evidence pack med provider event receipts

### 6.4 Skattekontoimport

**Klass**
- Must-have

**Varför**
- close, AGI, moms och deklarationer kräver faktiskt skattekontoutfall

**Riktning**
- import

**Source of truth**
- Skatteverkets skattekonto för råhändelser
- tax-account-domänen för klassning och settlement

**Required objects**
- `TaxAccountImportBatch`
- `TaxAccountEvent`
- `OffsetRelation`
- `TaxDiscrepancyCase`

**Required API**
- `POST /v1/tax-account/imports`
- `GET /v1/tax-account/events`
- `POST /v1/tax-account/offsets`
- `GET /v1/tax-account/reconciliations`

**Required events**
- `tax_account.import.completed`
- `tax_account.event.classified`
- `tax_account.offset.applied`
- `tax_account.discrepancy.opened`

**Onboarding**
- file import support som baseline
- official channel adapter när tillgänglig
- tenant mapping of tax identifiers

**Retry/replay/fallback/audit**
- idempotent import på statement fingerprint
- fallback till manuell import
- audit på klassificering och offset approval

### 6.5 AGI transport

**Klass**
- Must-have

**Varför**
- payroll är inte produktionsklar utan faktisk AGI-kedja

**Riktning**
- export/submission + receipt import

**Source of truth**
- payroll för AGI payload semantics
- integrations för teknisk transport
- submission receipts för kvittenser

**Required objects**
- `AgiSubmissionPeriod`
- `SubmissionEnvelope`
- `SubmissionReceipt`

**Required API**
- `POST /v1/payroll/agi/periods/:id/submit`
- `GET /v1/public/submissions?type=agi`
- `POST /v1/integrations/submissions/:id/replay`

**Required events**
- `payroll.agi.submission.ready`
- `submission.receipt.recorded`
- `payroll.agi.business_decision.recorded`

**Onboarding**
- xml serializer pinned to official technical description
- test service integration
- signing provider hookup

**Retry/replay/fallback/audit**
- upload/test service support
- replay of same version idempotent
- correction creates new version
- evidence: xml hash, signature, technical receipt, business response

### 6.6 Momsdeklaration

**Klass**
- Must-have

**Varför**
- svensk redovisningsplattform måste kunna lämna moms eller skapa fullständig inlämningskedja

**Riktning**
- export/submission + receipt import

**Source of truth**
- VAT-domänen för declaration semantics
- integrations för transport

**Required objects**
- `VatDeclarationVersion`
- `SubmissionEnvelope`
- `SubmissionReceipt`

**Required API**
- `POST /v1/vat/declarations/:id/submit`
- `GET /v1/public/submissions?type=vat`

**Required events**
- `vat.declaration.submission.ready`
- `submission.receipt.recorded`
- `vat.declaration.business_decision.recorded`

**Onboarding**
- direct digital filing adapter där officiellt stöd finns
- annars controlled sign-and-send via official service
- sandbox and test mode

**Retry/replay/fallback/audit**
- new full version on correction
- no overwrite
- technical and business receipt separation

### 6.7 Annual filing och deklarationer

**Klass**
- Must-have

**Varför**
- årsrapportering och deklaration är central konkurrenspunkt

**Riktning**
- export/submission + technical receipt + sign flow

**Source of truth**
- annual-reporting-domänen för package semantics
- legal-form-domänen för obligation profile
- integrations för transport

**Required objects**
- `AnnualPackage`
- `AnnualFilingSubmission`
- `SubmissionReceipt`

**Required API**
- `POST /v1/annual-reporting/packages/:id/submit`
- `GET /v1/public/submissions?type=annual`

**Required events**
- `annual.package.signed`
- `annual.filing.submitted`
- `submission.receipt.recorded`

**Onboarding**
- Bolagsverket adapter med token/endpoint support
- signatory binding
- package family contract tests

**Retry/replay/fallback/audit**
- technical validation receipt must persist
- correction creates new package version
- evidence pack stores submitted document hashes

### 6.8 HUS/ROT/RUT

**Klass**
- Must-have

**Varför**
- kritiskt för svenska bygg-, service- och hemnära bolag

**Riktning**
- export/submission + decision import

**Source of truth**
- HUS-domänen för affärslogik
- integrations för XML generation, transport och decision intake

**Required objects**
- `HusClaimVersion`
- `SubmissionEnvelope`
- `SubmissionReceipt`
- `HusDecision`

**Required API**
- `POST /v1/hus/cases/:id/claims/:claim_version_id/submit`
- `GET /v1/public/submissions?type=hus`
- `POST /v1/hus/decisions/imports`

**Required events**
- `hus.claim.submission.ready`
- `submission.receipt.recorded`
- `hus.claim.decided`

**Onboarding**
- XML schema package pinned to current official version
- e-service import workflow baseline
- optional direct channel only when official supported channel exists

**Retry/replay/fallback/audit**
- same payload replay idempotent
- correction by new claim version
- fallback = XML download for controlled import
- evidence: xml hash, import receipt, submission receipt, decision JSON/XML, recovery refs

### 6.9 Peppol och e-faktura

**Klass**
- Must-have

**Varför**
- hygienfaktor för svensk/nordisk SMB och offentlig sektor

**Riktning**
- bidirectional

**Source of truth**
- AR för outbound invoice semantics
- AP/import cases för inbound semantics
- integrations för transport

**Required objects**
- `PeppolDocument`
- `PeppolParticipant`
- `PeppolDeliveryReceipt`

**Required API**
- `POST /v1/ar/invoices/:id/send-peppol`
- `POST /v1/ap/peppol/inbound`
- `GET /v1/ar/peppol-deliveries/:id`

**Required events**
- `peppol.invoice.sent`
- `peppol.invoice.delivered`
- `peppol.invoice.failed`
- `peppol.invoice.received`

**Onboarding**
- participant lookup
- sender identity setup
- test transport certificates

**Retry/replay/fallback/audit**
- transport retry by document id
- dead-letter on schema mismatch
- evidence with UBL hash and transport receipt

### 6.10 OCR och dokumentleverantörer

**Klass**
- Must-have

**Varför**
- document-to-decision är central differentierare

**Riktning**
- import

**Source of truth**
- documents for archive
- document-classification for treatment
- OCR provider only for extracted content candidate

**Required objects**
- `OcrProviderJob`
- `OcrSnapshot`
- `ExtractionConfidenceSummary`

**Required API**
- `POST /v1/documents/:id/ocr`
- `GET /v1/documents/:id/ocr`
- `POST /v1/documents/:id/ocr/replay`

**Required events**
- `document.ocr.requested`
- `document.ocr.completed`
- `document.ocr.failed`

**Onboarding**
- provider API keys
- document retention and region controls
- sandbox documents

**Retry/replay/fallback/audit**
- idempotent by document version hash
- fallback to manual review
- evidence with OCR raw response hash

### 6.11 BankID, signering och stark identitet

**Klass**
- Must-have

**Varför**
- Sverige kräver stark identitet för känsliga handlingar och hög tillit

**Riktning**
- external auth/challenge/sign

**Source of truth**
- auth-core för auth state
- integrations för provider transport
- evidence store för signed artifacts

**Required objects**
- `BankIdChallenge`
- `SignatureRequest`
- `SignatureEvidence`
- `IdentityLink`

**Required API**
- `POST /v1/auth/bankid/challenges`
- `POST /v1/signatures/requests`
- `GET /v1/signatures/requests/:id`

**Required events**
- `bankid.challenge.started`
- `bankid.challenge.completed`
- `signature.request.completed`
- `signature.request.failed`

**Onboarding**
- separate sandbox/prod agreements
- relying party config
- certificate and callback setup

**Retry/replay/fallback/audit**
- no replay of completed signature
- new challenge required on expired session
- evidence stores provider transaction ids and signed hash

### 6.12 SSO, SAML och OIDC

**Klass**
- Enterprise-only men i praktiken must-have för enterprise-sälj

**Varför**
- krävs för större kunder och support/backoffice-kontroll

**Riktning**
- federation import + optional SCIM later

**Source of truth**
- org-auth för membership
- auth-core för session
- integration adapter for IdP transport

**Required objects**
- `FederationConnection`
- `FederatedIdentity`
- `JitProvisioningRecord`

**Required API**
- `POST /v1/auth/federation/connections`
- `POST /v1/auth/federation/test`
- `POST /v1/auth/federation/claims-mapping`

**Required events**
- `federation.connection.activated`
- `federation.login.succeeded`
- `federation.login.failed`

**Onboarding**
- metadata exchange
- claim mapping
- tenant domain verification
- sandbox tenant

**Retry/replay/fallback/audit**
- audit login claims
- fallback to local admin only for approved break-glass users
- no silent JIT role escalation

### 6.13 E-post, SMS och push

**Klass**
- Must-have

**Varför**
- notifications, approvals och incidenthantering kräver fler kanaler

**Riktning**
- outbound + callbacks for delivery where supported

**Source of truth**
- notification-center for intent
- provider for delivery status

**Required objects**
- `Notification`
- `NotificationDelivery`

**Required API**
- `POST /v1/notifications`
- `GET /v1/notifications/:id/deliveries`
- `POST /v1/notifications/:id/redeliver`

**Required events**
- `notification.created`
- `notification.delivered`
- `notification.bounced`
- `notification.dead_lettered`

**Onboarding**
- sender domains
- SMS sender IDs
- mobile push credentials

**Retry/replay/fallback/audit**
- dedupe by notification id + channel
- fallback channel rules
- evidence of delivery attempts

### 6.14 Cards, spend och expense

**Klass**
- Should-have

**Varför**
- Bokio, Wint och moderna finanssystem erbjuder detta

**Riktning**
- bidirectional

**Source of truth**
- card provider for transactions
- documents for receipts
- document-classification and travel/benefits for treatment
- AP or payroll for settlement

**Required objects**
- `CardTransaction`
- `CardholderAssignment`
- `SpendReceiptLink`

**Required API**
- `POST /v1/spend/connections`
- `POST /v1/spend/transactions/imports`
- `GET /v1/spend/transactions`
- `POST /v1/spend/transactions/:id/link-document`

**Required events**
- `spend.transaction.imported`
- `spend.transaction.classification.required`
- `spend.transaction.settled`

**Onboarding**
- card issuer auth
- employee mapping
- policy mapping

**Retry/replay/fallback/audit**
- dedupe by issuer transaction id
- fallback to manual expense
- evidence link between receipt and transaction

### 6.15 Payroll import och migration

**Klass**
- Must-have

**Varför**
- go-live på lön kräver stark migration

**Riktning**
- import

**Source of truth**
- migration engine for imported state
- source system for raw export
- payroll for activated cutover state

**Required objects**
- `PayrollMigrationBatch`
- `MappingSet`
- `CutoverDiff`
- `MigrationAcceptanceRecord`

**Required API**
- `POST /v1/payroll/migrations/import-batches`
- `POST /v1/payroll/migrations/diff-reports`
- `POST /v1/payroll/migrations/cutover-plans`

**Required events**
- `migration.batch.imported`
- `migration.diff.generated`
- `migration.cutover.approved`
- `migration.cutover.completed`

**Onboarding**
- source-system-specific mapping packs
- secure upload
- test import environment

**Retry/replay/fallback/audit**
- import idempotent by batch fingerprint
- rollback plan mandatory
- evidence: source extracts, mappings, diff signoffs

### 6.16 ID06

**Klass**
- Must-have för bygg/field
- Differentiator när det kopplas till projects/payroll/compliance

**Varför**
- krävs för marknadsledande byggflöde

**Riktning**
- import/validation + export/control

**Source of truth**
- ID06 provider for card/company relation evidence
- domain-id06 for normalized identity graph and work passes
- personalliggare for attendance truth

**Required objects**
- `ID06Identity`
- `ID06Card`
- `EmployerBinding`
- `WorkplaceAssignment`
- `WorkPass`

**Required API**
- `POST /v1/id06/connections`
- `POST /v1/id06/validate-card`
- `GET /v1/id06/work-passes`
- `POST /v1/id06/exports`

**Required events**
- `id06.card.validated`
- `id06.work_pass.generated`
- `id06.binding.invalidated`

**Onboarding**
- provider contract
- workplace and company mapping
- device trust bootstrap

**Retry/replay/fallback/audit**
- cache only with explicit TTL and evidence
- fallback to manual exception flow, never silent success
- audit every card validation and work-pass derivation

### 6.17 Signering, evidence och arkiv

**Klass**
- Must-have

**Varför**
- filings, approvals och operatoransvar kräver robust beviskedja

**Riktning**
- outbound to signing/archive providers and inbound receipts

**Source of truth**
- källdomänen för signoff state
- evidence store for immutable artifacts
- integrations for transport

**Required objects**
- `SignatureRequest`
- `ArchiveSubmission`
- `ArchiveReceipt`

**Required API**
- `POST /v1/signatures/requests`
- `POST /v1/archive/submissions`
- `GET /v1/archive/submissions/:id`

**Required events**
- `signature.request.completed`
- `archive.submission.completed`

**Onboarding**
- signer profiles
- retention policies
- certificate configuration

**Retry/replay/fallback/audit**
- no silent resubmission
- archive receipts are immutable
- evidence pack includes signed artifact hash

### 6.18 BI/export ecosystem

**Klass**
- Should-have

**Varför**
- enterprise-kunder kräver export och analytics utan att skada source of truth

**Riktning**
- export

**Source of truth**
- reporting snapshots and approved read models

**Required objects**
- `ExportJob`
- `ExportSchemaVersion`
- `DataExtractionReceipt`

**Required API**
- `POST /v1/exports/jobs`
- `GET /v1/exports/jobs/:id`
- `GET /v1/exports/schemas`

**Required events**
- `export.job.created`
- `export.job.completed`
- `export.job.failed`

**Onboarding**
- schema catalog
- consumer credentials
- environment-specific endpoints

**Retry/replay/fallback/audit**
- export replay by snapshot id
- immutable schema version
- access-scoped and auditable downloads

### 6.19 CRM, e-handel och orderkällor

**Klass**
- Should-have

**Varför**
- lead-to-cash kräver koppling till orderkällor för parity

**Riktning**
- bidirectional

**Source of truth**
- CRM/e-commerce for lead/order pre-accounting
- AR/projects for downstream invoice and profitability

**Required objects**
- `ExternalCustomerRef`
- `ExternalOrderRef`
- `SyncCursor`
- `OrderImportCase`

**Required API**
- `POST /v1/integrations/crm/connections`
- `POST /v1/orders/imports`
- `GET /v1/orders/import-cases`

**Required events**
- `order.imported`
- `customer.synced`
- `order.sync.failed`

### 6.20 Field/service/material-adjacent integrations

**Klass**
- Should-have för servicebolag
- Differentiator i kombination med finance core

**Varför**
- operationskedjan blir starkare med material, fleet och scheduling-adapters

**Riktning**
- bidirectional

**Source of truth**
- projects/field for work order truth
- external systems for inventory or fleet truth when configured

**Required objects**
- `ExternalWorkOrderRef`
- `MaterialCatalogSync`
- `ScheduleSyncCursor`

**Required API**
- `POST /v1/field/integrations/connections`
- `POST /v1/field/material-syncs`
- `POST /v1/field/schedule-syncs`

## 7. Webhookkontrakt

### 7.1 Delivery lifecycle
`queued -> attempting -> delivered | retry_wait | dead_lettered | disabled`

### 7.2 Signature
- HMAC-SHA256 signatur med versionshanterad secret
- header:
  - `X-Webhook-Id`
  - `X-Webhook-Sequence`
  - `X-Webhook-Timestamp`
  - `X-Webhook-Signature`
  - `X-Webhook-Signature-Version`

### 7.3 Payload contract
- `event_id`
- `event_type`
- `occurred_at`
- `tenant_id`
- `object_type`
- `object_id`
- `object_version`
- `correlation_id`
- `payload`
- `links.object_profile_url`

### 7.4 Consumer expectations
- 2xx = levererat
- 4xx = permanent failure unless configured recoverable
- 5xx / timeout = retry according to class
- max replay window configurable per tenant
- replay-from-sequence supported

## 8. Sandbox, test och prod

- varje provideradapter måste ha explicit environment mode
- secrets, endpoints, certificates och callback URLs måste skiljas åt
- sandbox data får aldrig blandas med prod read models
- contract tests måste kunna köras i sandbox utan skarp affärseffekt
- reglerade providers ska ha dry-run eller test-mode där officiell kanal erbjuder detta

## 9. Contract tests

Varje adapter måste verifiera:
- auth handshake
- credential validity
- required scopes
- schema conformance
- happy path
- retryable failure
- permanent failure
- duplicate handling
- replay behavior
- webhook signature verification when relevant
- environment isolation

## 10. Prioritering

### P0
- bank statements
- payment orders
- AGI
- VAT
- annual filing
- HUS
- Peppol
- OCR
- BankID/signering
- SSO/OIDC/SAML
- public API/webhooks
- payroll migration

### P1
- cards/spend
- BI/export
- payment links
- ID06
- field/service integrations

### P2
- CRM/e-commerce
- wider ecosystem adapters

## 11. Exit gate

Detta dokument är uppfyllt först när:
- alla P0-områden har verkliga adapters eller verifierad file-based baseline
- webhooks gör faktisk leverans med receipts, retry och dead-letter
- contract tests finns för varje aktiv adapter
- sandbox/test/prod är strikt separerade
- public API och partner API har idempotens, auth, versionering och replay
- onboarding, secret rotation, health checks och operatoransvar är implementerade
