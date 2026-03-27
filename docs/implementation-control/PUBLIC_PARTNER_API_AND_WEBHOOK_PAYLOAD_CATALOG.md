> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# PUBLIC_PARTNER_API_AND_WEBHOOK_PAYLOAD_CATALOG

Status: Bindande katalog för public API control-plane, public API data-plane, partner control-plane, partner runtime ingress/egress och webhook-payloads.

## Global API rules

1. Inga externa payload shapes får uppfinnas i implementation. Endast payloads i denna katalog är tillåtna.
2. Alla muterande anrop kräver `Idempotency-Key`.
3. Alla anrop ska bära `X-Correlation-Id`. Om klient inte skickar ett ska servern skapa ett och returnera det.
4. Alla svar ska använda standard envelopes.
5. Alla webhooks ska vara signerade och sekvensierade.
6. External API får aldrig exponera intern persistence-form eller osaniterad audit.
7. Partner ingress för högriskflöden ska stödja mTLS eller signerad bearer-token beroende på providerklass.
8. `sandbox`, `test` och `production` ska vara explicit separerade i credentials, webhook destinations och sequence spaces.

## Standard request headers

- `Authorization: Bearer <token>`
- `Idempotency-Key: <opaque-key>` för muterande calls
- `X-Correlation-Id: <uuid>`
- `X-Request-Timestamp: <iso8601>`
- `X-Client-Version: <string>`
- `X-Signature: <hmac-or-detached-signature>` endast för partner ingress där required

## Standard success envelope

- `meta`
  - `requestId`
  - `correlationId`
  - `apiVersion`
  - `mode`
  - `idempotencyKey`
  - `page` när listning används
- `data`
- `receipts`
- `links`

## Standard error envelope

- `meta`
  - `requestId`
  - `correlationId`
  - `apiVersion`
  - `mode`
- `error`
  - `code`
  - `message`
  - `classification` (`validation`, `permission`, `conflict`, `technical`, `rate_limited`, `downstream`)
  - `retryable`
  - `reviewRequired`
  - `details[]`
  - `denialReasonCode`
  - `supportRef`

## Pagination contract

Listningar använder:

- query params:
  - `cursor`
  - `limit`
  - `sort`
  - `direction`
  - objekt-specifika filter
- `meta.page`
  - `limit`
  - `nextCursor`
  - `hasMore`
  - `sort`
  - `direction`
  - `appliedFilters`

## Public API scope catalog

- `apiSpec.read`
- `reporting.read`
- `submission.read`
- `taxAccount.read`
- `annualReporting.read`
- `legalForm.read`
- `webhook.manage`

## Partner API scope catalog

- `partner.catalog.read`
- `partner.connection.manage`
- `partner.connection.read`
- `partner.operation.write`
- `partner.operation.read`
- `partner.contractTest.write`
- `partner.webhook.read`
- `partner.ingress.write`

## Public API control-plane

### 1. Create public API client

- Route: `POST /v1/public-api/clients`
- Permission: tenant admin with `api_client.manage`
- Request payload:
  - `companyId`
  - `displayName`
  - `mode` (`sandbox` or `production`)
  - `scopes[]`
  - `description`
- Response payload:
  - `clientId`
  - `companyId`
  - `displayName`
  - `mode`
  - `scopes[]`
  - `status`
  - `clientSecret` (returned exactly once)
  - `createdAt`
- Idempotency: required on create
- Audit class: `external_access_admin`

### 2. List public API clients

- Route: `GET /v1/public-api/clients`
- Query:
  - `companyId`
  - `mode`
  - `status`
- Response items:
  - `clientId`
  - `displayName`
  - `mode`
  - `scopes[]`
  - `status`
  - `createdAt`
  - `updatedAt`
  - `secretPresent`

### 3. Rotate client secret

- Route: `POST /v1/public-api/clients/:clientId/rotate-secret`
- Request:
  - `companyId`
  - `reasonCode`
- Response:
  - `clientId`
  - `rotatedAt`
  - `clientSecret`
  - `previousSecretRevokedAt`

### 4. Issue token

- Route: `POST /v1/public-api/tokens`
- Auth: client credentials
- Request:
  - `clientId`
  - `clientSecret`
  - `scopes[]` optional subset
- Response:
  - `accessToken`
  - `tokenType`
  - `expiresInSeconds`
  - `scope`
  - `mode`
  - `companyId`
  - `clientId`

### 5. Create webhook subscription

- Route: `POST /v1/public-api/webhooks`
- Request:
  - `companyId`
  - `clientId`
  - `mode`
  - `eventTypes[]`
  - `targetUrl`
  - `description`
  - `secretRotationPolicyCode`
- Response:
  - `subscriptionId`
  - `clientId`
  - `mode`
  - `eventTypes[]`
  - `targetUrl`
  - `signingSecret` (returned exactly once)
  - `status`
  - `createdAt`

### 6. List webhook subscriptions

- Route: `GET /v1/public-api/webhooks`
- Query:
  - `companyId`
  - `clientId`
  - `mode`
  - `status`
- Response items:
  - `subscriptionId`
  - `clientId`
  - `mode`
  - `eventTypes[]`
  - `targetUrl`
  - `status`
  - `latestSequenceNo`
  - `lastDeliveryAt`

### 7. Replay webhook sequence

- Route: `POST /v1/public-api/webhooks/:subscriptionId/replay`
- Request:
  - `companyId`
  - `fromSequenceNo`
  - `toSequenceNo` optional
  - `reasonCode`
- Response:
  - `replayPlanId`
  - `subscriptionId`
  - `fromSequenceNo`
  - `toSequenceNo`
  - `jobId`
  - `status`

### 8. List webhook events

- Route: `GET /v1/public-api/webhook-events`
- Query:
  - `companyId`
  - `subscriptionId`
  - `eventType`
  - `fromSequenceNo`
  - `toSequenceNo`
- Response items:
  - `eventId`
  - `sequenceNo`
  - `eventType`
  - `resource`
  - `occurredAt`
  - `deliveryStatusSummary`

### 9. List webhook deliveries

- Route: `GET /v1/public-api/webhook-deliveries`
- Query:
  - `companyId`
  - `subscriptionId`
  - `eventId`
  - `status`
- Response items:
  - `deliveryId`
  - `eventId`
  - `sequenceNo`
  - `attemptNo`
  - `status`
  - `responseCode`
  - `responseClass`
  - `deliveredAt`
  - `nextRetryAt`
  - `deadLetterReasonCode`

### 10. Record compatibility baseline

- Route: `POST /v1/public-api/compatibility-baselines`
- Request:
  - `companyId`
  - `version`
  - `routeHash`
  - `notes`
- Response:
  - `baselineId`
  - `version`
  - `routeHash`
  - `recordedAt`

## Public API data-plane

### 11. API spec

- Route: `GET /v1/public/spec`
- Scope: `apiSpec.read`
- Response:
  - `version`
  - `modes[]`
  - `scopes[]`
  - `resources[]`
  - `webhookEventTypes[]`
  - `backwardCompatibilityWindowDays`

### 12. Report snapshots

- Route: `GET /v1/public/report-snapshots`
- Scope: `reporting.read`
- Query:
  - `companyId`
  - `reportCode`
  - `periodKey`
  - `status`
- Response items:
  - `reportSnapshotId`
  - `reportCode`
  - `periodKey`
  - `status`
  - `generatedAt`
  - `currency`
  - `summary`
  - `downloadLinks`

### 13. Single report snapshot

- Route: `GET /v1/public/report-snapshots/:reportSnapshotId`
- Scope: `reporting.read`
- Response:
  - `reportSnapshotId`
  - `reportCode`
  - `periodKey`
  - `status`
  - `summary`
  - `lines[]`
  - `drilldownAvailability`
  - `receipts[]`

### 14. Submissions

- Route: `GET /v1/public/submissions`
- Scope: `submission.read`
- Query:
  - `companyId`
  - `submissionType` (`agi`, `vat`, `hus`, `annual_report`, `income_tax`)
  - `status`
  - `periodKey`
- Response items:
  - `submissionId`
  - `submissionType`
  - `periodKey`
  - `status`
  - `technicalReceiptStatus`
  - `materialReceiptStatus`
  - `latestReceiptAt`

### 15. Single submission

- Route: `GET /v1/public/submissions/:submissionId`
- Scope: `submission.read`
- Response:
  - `submissionId`
  - `submissionType`
  - `periodKey`
  - `status`
  - `baselineVersion`
  - `technicalReceipts[]`
  - `materialReceipts[]`
  - `correctionChain`
  - `links`

### 16. Legal form declaration profile

- Route: `GET /v1/public/legal-forms/declaration-profile`
- Scope: `legalForm.read`
- Query:
  - `companyId`
  - `asOfDate`
- Response:
  - `legalFormCode`
  - `filingProfileCode`
  - `declarationProfileCode`
  - `requiresAnnualReport`
  - `requiresTaxDeclarationPackage`
  - `signatoryClassCode`

### 17. Annual reporting packages

- Route: `GET /v1/public/annual-reporting/packages`
- Scope: `annualReporting.read`
- Query:
  - `companyId`
  - `fiscalYearKey`
  - `status`
- Response items:
  - `annualReportingPackageId`
  - `fiscalYearKey`
  - `status`
  - `bolagsverketStatus`
  - `skatteverketStatus`
  - `updatedAt`

### 18. Tax account summary

- Route: `GET /v1/public/tax-account/summary`
- Scope: `taxAccount.read`
- Query:
  - `companyId`
  - `asOfDate`
- Response:
  - `balance`
  - `openObligations[]`
  - `latestImportedEventAt`
  - `unresolvedDifferenceCount`

### 19. Tax account reconciliations

- Route: `GET /v1/public/tax-account/reconciliations`
- Scope: `taxAccount.read`
- Query:
  - `companyId`
  - `status`
  - `fromDate`
  - `toDate`
- Response items:
  - `reconciliationId`
  - `status`
  - `differenceAmount`
  - `statementDate`
  - `updatedAt`

## Partner control-plane

### 20. Partner catalog

- Route: `GET /v1/partners/catalog`
- Scope: `partner.catalog.read`
- Response items:
  - `connectionType`
  - `supportedProviders[]`
  - `supportedOperations[]`
  - `requiredCredentials[]`
  - `supportsSandbox`
  - `contractTestPackCode`

### 21. Create partner connection

- Route: `POST /v1/partners/connections`
- Scope: `partner.connection.manage`
- Request:
  - `companyId`
  - `connectionType`
  - `providerCode`
  - `displayName`
  - `mode`
  - `credentialsRef`
  - `fallbackMode`
  - `config`
- Response:
  - `connectionId`
  - `connectionType`
  - `providerCode`
  - `mode`
  - `status`
  - `credentialsPresent`
  - `healthStatus`
  - `createdAt`

### 22. List partner connections

- Route: `GET /v1/partners/connections`
- Scope: `partner.connection.read`
- Query:
  - `companyId`
  - `connectionType`
  - `providerCode`
  - `mode`
- Response items:
  - `connectionId`
  - `connectionType`
  - `providerCode`
  - `displayName`
  - `mode`
  - `status`
  - `healthStatus`
  - `latestReceiptAt`

### 23. Get connection capabilities

- Route: `GET /v1/partners/connections/:connectionId/capabilities`
- Scope: `partner.connection.read`
- Response:
  - `connectionId`
  - `providerCode`
  - `operationCodes[]`
  - `objectMappings[]`
  - `replaySafe`
  - `rateLimits`
  - `requiredEvents[]`

### 24. Run health check

- Route: `POST /v1/partners/connections/:connectionId/health-checks`
- Scope: `partner.connection.manage`
- Request:
  - `companyId`
  - `checkSetCode`
- Response:
  - `healthCheckId`
  - `connectionId`
  - `status`
  - `results[]`
  - `executedAt`

### 25. Run contract tests

- Route: `POST /v1/partners/connections/:connectionId/contract-tests`
- Scope: `partner.contractTest.write`
- Request:
  - `companyId`
  - `testPackCode`
  - `mode`
- Response:
  - `contractResultId`
  - `connectionId`
  - `testPackCode`
  - `status`
  - `assertions[]`
  - `executedAt`

### 26. List contract tests

- Route: `GET /v1/partners/contract-tests`
- Scope: `partner.connection.read`
- Query:
  - `companyId`
  - `connectionId`
  - `status`
- Response items:
  - `contractResultId`
  - `connectionId`
  - `status`
  - `executedAt`

### 27. Dispatch partner operation

- Route: `POST /v1/partners/operations`
- Scope: `partner.operation.write`
- Request:
  - `companyId`
  - `connectionId`
  - `operationCode`
  - `operationKey`
  - `payload`
  - `dryRun`
- Response:
  - `operationId`
  - `connectionId`
  - `operationCode`
  - `status`
  - `jobId`
  - `receiptRefs[]`
  - `fallbackTriggered`

### 28. List partner operations

- Route: `GET /v1/partners/operations`
- Scope: `partner.operation.read`
- Query:
  - `companyId`
  - `connectionId`
  - `status`
  - `operationCode`
- Response items:
  - `operationId`
  - `operationCode`
  - `status`
  - `createdAt`
  - `updatedAt`
  - `providerReference`

### 29. Get partner operation

- Route: `GET /v1/partners/operations/:operationId`
- Scope: `partner.operation.read`
- Response:
  - `operationId`
  - `connectionId`
  - `operationCode`
  - `payloadHash`
  - `status`
  - `attempts[]`
  - `receipts[]`
  - `fallbackTriggered`

### 30. Replay partner operation

- Route: `POST /v1/partners/operations/:operationId/replay`
- Scope: `partner.operation.write`
- Request:
  - `companyId`
  - `reasonCode`
- Response:
  - `replayPlanId`
  - `operationId`
  - `jobId`
  - `status`

## Partner runtime ingress

### 31. Statement import ingress

- Route: `POST /v1/partner-api/inbound/statements`
- Scope: `partner.ingress.write`
- Auth: signed bearer token; mTLS for bank-class connections where available
- Request:
  - `connectionId`
  - `providerStatementRef`
  - `bankAccountRef`
  - `statementPeriod`
  - `lines[]`
- Required line fields:
  - `providerLineRef`
  - `bookingDate`
  - `valueDate`
  - `amount`
  - `currency`
  - `counterpartyName`
  - `message`
  - `balanceAfterLine` optional
- Response:
  - `statementImportId`
  - `status`
  - `acceptedLineCount`
  - `duplicateLineCount`
  - `rejectedLineCount`

### 32. Payment status ingress

- Route: `POST /v1/partner-api/inbound/payment-statuses`
- Request:
  - `connectionId`
  - `providerPaymentRef`
  - `statusCode`
  - `occurredAt`
  - `amount`
  - `currency`
  - `reasonCode`
- Response:
  - `paymentStatusReceiptId`
  - `matchedPaymentOrderId`
  - `status`

### 33. Peppol document ingress

- Route: `POST /v1/partner-api/inbound/peppol-documents`
- Request:
  - `connectionId`
  - `documentType`
  - `participantSender`
  - `participantReceiver`
  - `envelopeRef`
  - `payloadFormat`
  - `payload`
  - `documentHash`
- Response:
  - `inboundDocumentId`
  - `status`
  - `reviewRequired`

### 34. OCR result ingress

- Route: `POST /v1/partner-api/inbound/document-results`
- Request:
  - `providerRunRef`
  - `documentId`
  - `modelVersion`
  - `fields[]`
  - `confidenceSummary`
  - `artifactRefs[]`
- Response:
  - `ocrRunId`
  - `status`
  - `reviewRequired`

### 35. Spend ingress

- Route: `POST /v1/partner-api/inbound/spend-transactions`
- Request:
  - `connectionId`
  - `providerTransactionRef`
  - `cardAccountRef`
  - `employeeExternalRef`
  - `occurredAt`
  - `amount`
  - `currency`
  - `merchantName`
  - `mcc`
- Response:
  - `cardTransactionId`
  - `status`
  - `receiptLinked`

### 36. ID06 ingress

- Route: `POST /v1/partner-api/inbound/id06/events`
- Request:
  - `connectionId`
  - `eventType`
  - `cardNo`
  - `personIdentityRef`
  - `workplaceExternalRef`
  - `occurredAt`
  - `status`
  - `payload`
- Response:
  - `id06IngressReceiptId`
  - `status`
  - `linkedObjectRefs[]`

## Webhook event type catalog

- `report.snapshot.ready`
- `submission.updated`
- `legalForm.profile.updated`
- `annualReporting.package.updated`
- `taxAccount.reconciliation.updated`
- `partner.connection.updated`
- `partner.contractTest.completed`
- `partner.operation.completed`
- `partner.operation.failed`
- `automation.decision.ready`
- `migration.diff.generated`
- `deadLetter.updated`
- `replay.plan.updated`

## Webhook payload contract

Varje webhook-body ska innehålla:

- `deliveryId`
- `subscriptionId`
- `sequenceNo`
- `eventId`
- `eventType`
- `mode`
- `companyId`
- `occurredAt`
- `resource`
  - `resourceType`
  - `resourceId`
  - `resourceVersion`
- `payload`
- `receipts[]`
- `correlationId`
- `causationId`
- `signatureVersion`

### Webhook headers

- `X-Webhook-Delivery-Id`
- `X-Webhook-Event-Id`
- `X-Webhook-Sequence-No`
- `X-Webhook-Timestamp`
- `X-Webhook-Signature`

### Webhook signature model

- `X-Webhook-Signature` = HMAC-SHA256 over:
  - timestamp
  - delivery id
  - event id
  - sequence no
  - raw body
- Secret rotation:
  - active secret
  - next secret overlap during rotation window
- Old secrets invalid after explicit rotation cutoff

## Sequencing and replay

1. Sequence number är monoton per subscription och mode.
2. Deliveries får komma om i retry; `deliveryId` är unik per attempt.
3. Konsumenter ska dedupa på `eventId` och tåla flera `deliveryId` för samma event.
4. Replay startar från `fromSequenceNo` och producerar nya `deliveryId`, aldrig nytt `eventId`.
5. Dead-lettered webhook events får bara replayas efter explicit replay-plan eller manual repair.

## Dead-letter behavior

- Efter max attempts eller permanent response class `terminal_client_error` flyttas delivery till dead-letter
- Dead-letter objekt måste innehålla:
  - `deadLetterId`
  - `subscriptionId`
  - `eventId`
  - `lastResponseCode`
  - `lastResponseBodyHash`
  - `terminalReasonCode`
  - `repairActions[]`

## Contract-test expectations

Minimikrav per external contract:

- exact payload fields
- unknown-field tolerance policy
- enum strictness
- signature verification
- cursor stability
- sequence monotonicity
- idempotent POST replay
- error envelope correctness
- permission/scope denial correctness

## Exit gate

- [ ] Public API control-plane och data-plane är skilda.
- [ ] Partner control-plane och runtime ingress är skilda.
- [ ] Alla muterande anrop kräver idempotency.
- [ ] Webhooks är signerade, sekvensierade och replaybara.
- [ ] Payload shapes är tillräckligt exakta för implementation utan gissning.
