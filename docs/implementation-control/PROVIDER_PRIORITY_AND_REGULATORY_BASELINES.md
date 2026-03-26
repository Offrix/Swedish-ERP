# PROVIDER_PRIORITY_AND_REGULATORY_BASELINES

Status: Bindande providerordning och bindande regulatoriska/specmässiga baselines för våg 1 och våg 2.

Supersession notice: Detta dokument är fortsatt användbart som provider- och baseline-input, men det är inte primär sanning om det krockar med `GO_LIVE_ROADMAP.md` eller `PHASE_IMPLEMENTATION_BIBLE.md`.

## Icke-förhandlingsbara regler

1. Reglerade myndighetsflöden ska gå direkt mot officiell transport när officiell transport finns.
2. Varje providerintegration ska ha en adapter med capability manifest, contract-test pack, health checks, retry policy, dead-letter policy, replay policy och provider swap-plan.
3. Provider-specifika id:n får aldrig vara source of truth för affärsobjekt; de sparas som adapter refs.
4. Samma affärskontrakt ska kunna köras i `sandbox`, `test` och `production`; provider-specifik skillnad kapslas i adapter.
5. Alla schema-, XML-, fil- och API-baselines ska pinas i provider registry med:
   - `baselineCode`
   - `officialVersion`
   - `documentVersion`
   - `effectiveFrom`
   - `effectiveTo`
   - `checksum`
   - `sourceSnapshotDate`
   - `changeClass`
6. Årliga regeländringar får aldrig rulla in via ad hoc-kodändring; de ska publiceras som ny baseline och nytt rulepack.

## Wave policy

### Wave 1

Wave 1 är minsta uppsättning som krävs för verklig drift, regulatorisk transport och competitor parity i Sverige.

### Wave 2

Wave 2 är nästa våg för kapacitet, redundans, regional utökning och högre partnerbredd.

## Provider priority by integration area

### 1. BankID och stark autentisering

- Baseline provider wave 1: Direktintegration mot BankID RP-API 6.0
- Baseline provider wave 2: Sekundär auth-broker med BankID-stöd endast som fallback för signeringsflöden, inte som primär login-kärna
- Official baseline:
  - RP-API version 6.0
  - Endast animerad QR är tillåten; statisk QR får inte implementeras
- Why first: Svensk bolagsprodukt utan BankID saknar både onboarding- och signeringsparitet
- Required objects:
  - `BankIdOrder`
  - `BankIdCollection`
  - `BankIdChallenge`
  - `StrongAuthReceipt`
- Source of truth: `auth-core`
- Required contracts:
  - `POST /v1/auth/bankid/start`
  - `POST /v1/auth/bankid/collect`
  - `POST /v1/auth/challenges/:challengeId/cancel`
- Failure model:
  - collect timeout -> retry within active order window
  - expired order -> terminal failure with new start required
  - provider unavailable -> fallback to TOTP/passkey only for non-regulated actions
- Provider swap rule: BankID semantics modelleras i `BankIdAdapter`; login/session semantics ligger i `auth-core`

### 2. Passkeys och TOTP

- Baseline provider wave 1: In-house WebAuthn/passkey och TOTP implementation i `auth-core`
- Baseline provider wave 2: Enterprise attestation enhancements, hardware key attestation allow-lists
- Official baseline:
  - WebAuthn Level 2 semantics
  - RFC 6238 för TOTP
- Why first: Krävs för step-up, admin controls och support/backoffice
- Source of truth: `auth-core`
- Required objects:
  - `PasskeyCredential`
  - `TotpEnrollment`
  - `StepUpChallenge`
- Provider swap rule: Ingen extern vendor bindning till kärnobjekten

### 3. SSO, SAML, OIDC och SCIM

- Baseline provider wave 1: WorkOS som broker för SAML, OIDC och SCIM/directory sync
- Baseline provider wave 2: Direkt-adaptrar för utvalda enterprise-idp:er där kundkrav motiverar det
- Official baseline:
  - SAML 2.0
  - OIDC
  - SCIM 2.0
- Why first: Enterprise-kunder kräver federation, JIT provisioning och deprovisioning
- Required objects:
  - `SsoConnection`
  - `DirectorySyncConnection`
  - `ScimProvisioningReceipt`
  - `FederatedDomainClaim`
- Source of truth: `org-auth` för tenant-mapping, `auth-core` för sessions
- Required contracts:
  - `/v1/auth/sso/connections`
  - `/v1/auth/sso/test`
  - `/v1/auth/scim/provisioning`
- Failure model:
  - inbound identity accepted only after verified domain claim
  - SCIM failures create work items; they do not silently diverge
- Provider swap rule: Employer/tenant membership får aldrig ligga i WorkOS som source of truth; WorkOS levererar federation och sync-händelser

### 4. Bank/open banking

- Baseline provider wave 1: Enable Banking för AIS/PIS/open banking account connectivity
- Baseline provider wave 2: Sekundär aggregator för redundans och utökad banktäckning
- Official baseline:
  - Provider API capability snapshot per bank
  - PSD2/Open Banking account, balance, transaction och payment-initiation capability manifest
- Why first: Statement import, kontobalans och återkommande synk krävs för bankavstämning och betalningsstatus
- Required objects:
  - `BankConnection`
  - `BankConsent`
  - `BankAccountLink`
  - `StatementImport`
  - `StatementLine`
  - `PaymentInitiation`
- Source of truth: `banking` för statements och balances; `integrations` för consent, credentials och provider refs
- Required contracts:
  - `/v1/banking/connections`
  - `/v1/banking/consents`
  - `/v1/banking/statement-imports`
  - `/v1/partners/operations` with `statement_sync`
- Failure model:
  - expired consent blocks next sync and creates review/work item
  - duplicated statement lines dedupas by provider ref + line hash + booking date + amount
- Provider swap rule: Business objects store canonical account refs; aggregator account ids stored only in adapter state

### 5. Bankfiler, betalningar och Autogiro

- Baseline provider wave 1:
  - ISO 20022 `pain.001` for payment export
  - ISO 20022 `camt.053` and `camt.054` for statements/advices
  - Bankgirot technical manuals för Bankgiro/Autogiro där open banking inte räcker
- Baseline provider wave 2: Bank-specifika host-to-host adapters där bank och kundvolym kräver det
- Official baseline:
  - `pain.001`
  - `camt.053`
  - `camt.054`
  - Aktuell Bankgirot-manual för Autogiro/Bankgirobetalningar
- Why first: Svensk SMB/enterprise måste kunna köra betalningar även när open banking inte bär hela flödet
- Required objects:
  - `PaymentOrder`
  - `PaymentBatch`
  - `BankFileExport`
  - `BankFileImport`
  - `AutogiroMandate`
- Source of truth: `banking`
- Required contracts:
  - `/v1/banking/payment-orders`
  - `/v1/banking/payment-batches`
  - `/v1/banking/file-imports`
- Failure model:
  - fil avvisad av bank -> `technical_rejected`
  - fil accepterad men betalning senare avvisad -> `material_rejected`
- Provider swap rule: File layout capability binds to bank profile, not to payment order object

### 6. PSP och payment links

- Baseline provider wave 1: Stripe Payment Links + Payments API
- Baseline provider wave 2: PSP nummer två för redundans eller lokal betalmetodstäckning
- Official baseline:
  - Stripe Payment Links current API family
- Why first: Behövs för enkel AR-insamling, HUS-förbetalningar och self-service betalning
- Required objects:
  - `PaymentLink`
  - `PaymentIntentMirror`
  - `CollectionReceipt`
- Source of truth: `ar` för fakturastatus, `integrations` för provider refs
- Required contracts:
  - `/v1/ar/payment-links`
  - `/v1/partner-api/inbound/payment-statuses`
- Failure model:
  - webhook-driven state changes måste vänta på signature verification
  - PSP settlement är inte samma sak som bank match
- Provider swap rule: Payment link object pekar på canonical invoice/claim, aldrig direkt på PSP semantics

### 7. Peppol och e-faktura

- Baseline provider wave 1: Pagero Online API som access point/provider
- Baseline provider wave 2: Sekundär access point eller direkt-AP för högvolymkunder
- Official baseline:
  - Peppol BIS Billing 3.0 release 2025-Q2
  - EN16931 compliant CustomizationID
- Why first: E-faktura är hygienfaktor mot Fortnox/Visma och enterprise-kunder
- Required objects:
  - `PeppolParticipant`
  - `EInvoiceEnvelope`
  - `InvoiceDeliveryReceipt`
  - `InboundPeppolDocument`
- Source of truth: `ar` och `ap`; `integrations` äger transport receipts
- Required contracts:
  - `/v1/ar/einvoice/participants`
  - `/v1/ar/einvoice/envelopes`
  - `/v1/partner-api/inbound/peppol-documents`
- Failure model:
  - schema-invalid -> hard fail before send
  - delivery accepted but business rejected -> material status on invoice envelope
- Provider swap rule: Canonical invoice payload byggs innan provider-specific serialization

### 8. OCR och dokumentklassning

- Baseline provider wave 1: Google Document AI Invoice Parser + generell OCR
- Baseline provider wave 2: Specialiserad leverantör för kvitton eller löneunderlag om precision kräver det
- Official baseline:
  - Invoice Parser GA
  - Svenskt språkstöd
- Why first: Dokument -> OCR -> review -> AP/AR/payroll/benefit är kärnflöde
- Required objects:
  - `OcrRun`
  - `OcrDocumentProjection`
  - `ClassifierInputEnvelope`
  - `DocumentEvidenceHash`
- Source of truth: `documents` äger original och versionskedja; OCR är härledd data
- Required contracts:
  - `/v1/documents/:documentId/ocr/runs`
  - `/v1/partner-api/inbound/document-results`
- Failure model:
  - låg confidence ger review, aldrig auto-booking
- Provider swap rule: OCR output normaliseras till canonical extraction model

### 9. E-post, SMS och push

- Baseline provider wave 1:
  - Postmark för e-post
  - Twilio för SMS
  - Direkt FCM/APNs genom intern push-broker
- Baseline provider wave 2: Sekundär e-post- och SMS-provider för redundans
- Official baseline:
  - Provider API current stable at activation
- Why first: Notifications, verification, submission alerts och supportkommunikation kräver pålitliga kanaler
- Required objects:
  - `NotificationDispatch`
  - `DeliveryReceipt`
  - `TemplateVersion`
  - `PushDeviceToken`
- Source of truth: `notifications`
- Required contracts:
  - `/v1/notifications/templates`
  - `/v1/notifications/dispatches`
  - `/v1/partner-api/inbound/notification-receipts`
- Failure model:
  - kanalavbrott skapar fallback-route men inte duplicerad notification object
- Provider swap rule: Kanal-specific receipt normaliseras till canonical delivery receipt

### 10. Cards/spend

- Baseline provider wave 1: Pleo current REST/OpenAPI surface, inte legacy API
- Baseline provider wave 2: Sekundär spend-provider eller generisk card feed
- Official baseline:
  - Pleo current API family
- Why first: Expense-to-payroll och document-to-decision kräver korttransaktioner
- Required objects:
  - `CardAccount`
  - `CardTransaction`
  - `SpendReceiptLink`
  - `SpendSettlementCase`
- Source of truth: `benefits`/`travel`/`documents` för behandling; `integrations` för provider refs
- Required contracts:
  - `/v1/spend/connections`
  - `/v1/spend/transactions`
  - `/v1/partner-api/inbound/spend-transactions`
- Failure model:
  - transaktion utan kvitto skapar review item
- Provider swap rule: Spend semantics normaliseras till canonical card transaction model

### 11. AGI transport

- Baseline provider wave 1: Direkt mot Skatteverket AGI-transport
- Baseline provider wave 2: Ingen annan provider; endast transport- och signeringsstöd runt officiell kanal
- Official baseline:
  - AGI technical description version 1.1.18.1
  - tillhörande XML/schema-baselines för arbetsgivardeklaration
- Why first: Lön utan AGI-kedja är inte svensk drift
- Required objects:
  - `AgiSubmission`
  - `AgiTransportEnvelope`
  - `TechnicalReceipt`
  - `MaterialReceipt`
  - `CorrectionChain`
- Source of truth: `payroll` för AGI-sakdata; `integrations` för transport/receipts
- Required contracts:
  - `/v1/payroll/agi/submissions`
  - `/v1/payroll/agi/submissions/:submissionId/submit`
  - `/v1/payroll/agi/submissions/:submissionId/collect-receipts`
- Failure model:
  - technical error -> retryable
  - accepted technical receipt but business error -> review required correction
- Provider swap rule: Ingen vendor swap; endast versionerad official baseline swap

### 12. Moms transport

- Baseline provider wave 1: Direkt mot Skatteverket Moms API version 1.0
- Baseline provider wave 2: XML-uppladdningsgenerator för e-tjänst som fallback
- Official baseline:
  - Skatteverket API för Momsdeklaration version 1.0
  - XML upload format för momsdeklaration
- Why first: Reglerad inlämning måste kunna ske utan manuell copy-paste
- Required objects:
  - `VatReturn`
  - `VatDraftTransport`
  - `VatSubmissionReceipt`
  - `VatDecisionReceipt`
- Source of truth: `vat`
- Required contracts:
  - `/v1/vat/returns`
  - `/v1/vat/returns/:vatReturnId/lock`
  - `/v1/vat/returns/:vatReturnId/submit`
  - `/v1/vat/returns/:vatReturnId/receipts`
- Failure model:
  - locked draft can only be changed by explicit unlock/correction flow
- Provider swap rule: Official API first, XML fallback second; both driven by same canonical VAT payload

### 13. HUS / ROT / RUT transport

- Baseline provider wave 1: Direkt mot Skatteverket Rot/Rut transport
- Baseline provider wave 2: Ingen alternativ vendor; endast fallback till signed downloadable XML när direkttransport är spärrad
- Official baseline:
  - Rot och Rut XML version 6
  - Beslutshämtning via Skatteverkets beslutsexport i JSON-format
- Why first: HUS måste kunna gå hela vägen till beslut och återkrav
- Required objects:
  - `HusClaim`
  - `HusSubmissionEnvelope`
  - `HusTechnicalReceipt`
  - `HusDecisionReceipt`
  - `HusRecoveryCase`
- Source of truth: `hus`
- Required contracts:
  - `/v1/hus/claims`
  - `/v1/hus/claims/:husClaimId/lock`
  - `/v1/hus/claims/:husClaimId/export-xml`
  - `/v1/hus/claims/:husClaimId/submit`
  - `/v1/hus/claims/:husClaimId/receipts`
- Failure model:
  - claim cannot submit without verified payment evidence and locked mandatory fields
- Provider swap rule: Ingen alternativ affärsleverantör; endast transportvariant

### 14. Annual filing och declarations

- Baseline provider wave 1:
  - Skatteverket Inkomstdeklaration 2-4 API version 1.0
  - SRU file transfer som fallback
  - Bolagsverket API för digital årsredovisning version 2.1
  - Bolagsverket kontrollsumme-API 1.0 för iXBRL
- Baseline provider wave 2: Ytterligare legal-form packages när fler bolagsformer öppnas
- Official baseline:
  - Inkomstdeklaration 2-4 API version 1.0
  - SRU file baseline (`INFO.SRU`, `BLANKETTER.SRU`)
  - Bolagsverket `lamna-in-arsredovisning` API 2.1
  - Bolagsverket checksum API 1.0
- Why first: Record-to-report utan faktiskt filing-stöd räcker inte
- Required objects:
  - `AnnualReportingPackage`
  - `DeclarationPackage`
  - `BolagsverketSubmission`
  - `SkatteverketDeclarationSubmission`
  - `AnnualReceipt`
- Source of truth: `annual-reporting` och `legal-form`
- Required contracts:
  - `/v1/annual-reporting/packages`
  - `/v1/annual-reporting/packages/:packageId/validate`
  - `/v1/annual-reporting/packages/:packageId/submit-bolagsverket`
  - `/v1/declarations/packages/:packageId/submit-skatteverket`
  - `/v1/declarations/packages/:packageId/export-sru`
- Failure model:
  - technical receipt != signed/accepted filing
- Provider swap rule: canonical package persists independent of filing channel

### 15. ID06

- Baseline provider wave 1: Officiell ID06-koppling via avtalad integration för company validation, card validation, worker-employer relation och workplace attendance/access semantics
- Baseline provider wave 2: Sekundär branschadapter endast för kompletterande accesskontroll, inte för source-of-truth
- Official baseline:
  - ID06 card/work-pass validation
  - company/person linkage and employer verification
  - attendance/access support tied to ID06 card ecosystem
- Why first: Krävs för stark bygg/field-konkurrenskraft och korrekt identity graph
- Required objects:
  - `Id06CompanyVerification`
  - `Id06PersonVerification`
  - `Id06CardStatus`
  - `Id06WorkplaceBinding`
  - `Id06AttendanceMirror`
- Source of truth: `id06` pack ovanpå `identity-graph` och `personalliggare`
- Required contracts:
  - `/v1/id06/companies/verify`
  - `/v1/id06/persons/verify`
  - `/v1/id06/cards/validate`
  - `/v1/id06/workplaces/:workplaceId/bindings`
- Failure model:
  - invalid or inactive card blocks ID06-dependent action but never mutates attendance history
- Provider swap rule: ID06 object model must survive any transport/partner change

### 16. Signering, evidence och arkiv

- Baseline provider wave 1:
  - Scrive Document API 2.0
  - Azure Blob immutable storage med WORM/legal hold
- Baseline provider wave 2: Sekundär signeringsprovider för redundans
- Official baseline:
  - Scrive API 2.0.0
  - Azure immutable storage current production capability
- Why first: Signoff, declarations och evidence preservation kräver verifierbar signering och oföränderligt arkiv
- Required objects:
  - `SignatureRequest`
  - `SignatureEvidence`
  - `EvidenceBundle`
  - `ImmutableArchivePointer`
  - `LegalHold`
- Source of truth: `annual-reporting`, `core`, `documents`; archive provider lagrar immutable copies
- Required contracts:
  - `/v1/signatures/requests`
  - `/v1/signatures/requests/:signatureRequestId/cancel`
  - `/v1/evidence/bundles`
  - `/v1/archive/legal-holds`
- Failure model:
  - failed signature invalidates submission readiness
- Provider swap rule: canonical signature state and evidence bundle are provider-neutral

## Baseline change policy

### Rule and schema timeline

1. Regulatorisk baseline publiceras först när officiell dokumentversion eller officiellt schema är känt.
2. Ny baseline får status:
   - `draft` efter officiell publicering
   - `approved` efter rulepack-test och golden scenario pass
   - `active` först när effective date inträffar
3. Historiska submissions, declarations, pay runs och HUS claims är permanent pinade till den baseline som gällde på sitt giltighetsdatum.
4. Mid-year lagändringar skapar ny baseline med ny `effectiveFrom`; historik skrivs aldrig om.
5. Årsbaslinje 2026 ska i provider registry minst pinna:
   - AGI technical description 1.1.18.1
   - Moms API 1.0
   - Inkomstdeklaration 2-4 API 1.0
   - Bolagsverket digital årsredovisning API 2.1
   - Bolagsverket checksum API 1.0
   - HUS XML version 6
   - BankID RP-API 6.0 med endast animerad QR
   - Svensk preliminärskatt enligt officiella 2026-tabeller
   - SINK 22.5% från 2026-01-01
   - Arbetsgivaravgiftsbaseline 2026.1 inklusive temporär ungdomsnedsättning 20.81% på ersättning upp till 25 000 SEK per månad inom officiellt fastställd åldersgrupp och aktiv period

### Provider lifecycle

- `candidate -> approved -> active -> degraded -> retiring -> retired`
- Providerbyte kräver:
  - capability manifest parity
  - gröna contract tests
  - dual-run på transportnivå där möjligt
  - replay plan
  - rollback plan
  - signoff från operations owner och domain owner

## Contract-test minimum per provider

Varje provideradapter måste ha gröna tester för:

- authentication
- create/read/update operation families
- error mapping
- duplicate/idempotency
- timeout/retry
- replay safety
- sandbox/test/prod routing
- receipt normalization
- health checks
- degraded/outage fallback

## Exit gate

- [ ] Wave 1-provider är låsta per integrationsområde.
- [ ] Officiella schema- och versionsbaselines är pinade.
- [ ] Provider swap-regler är fastställda.
- [ ] Inga regulated transports är beroende av syntetiska eller manuella mellanled som primär väg.
- [ ] Contract tests, health, retry, dead-letter och replay är definierade per providerklass.
