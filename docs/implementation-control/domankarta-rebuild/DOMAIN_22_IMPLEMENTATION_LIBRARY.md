# DOMAIN_22_IMPLEMENTATION_LIBRARY

## mål

Fas 22 ska bygga företagets externa portal- och intake-kärna så att externa parter kan agera i plattformen genom säkra, auditbara och tenant-isolerade flows.

## bindande tvärdomänsunderlag

- `PORTALER_SIGNERING_INTAKE_OCH_EXTERN_SELVSERVICE_BINDANDE_SANNING.md` är obligatorisk canonical source för externa portaler, public forms, uploads, intake routing, signing envelopes, portal status och self-service actions i denna domän.
- `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md` är obligatorisk canonical source för scanning, OCR, AI fallback, duplicate detection och routed ingest efter externa uppladdningar.
- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` är obligatorisk canonical source för signeringsevidence, sign-off, approvals och externa audit receipts i denna domän.
- `LEGAL_REASON_CODES_OCH_SPECIALTEXTPOLICY_BINDANDE_SANNING.md` är obligatorisk canonical source för extern rendering av legal basis, specialtexter, 0%-anledningar, reverse-charge-texter, HUS/grön-specialtext och blockerad portalvisning utan canonical reason code i denna domän.

## Fas 22

### Delfas 22.1 portal object-model / route truth

- bygg:
  - `PortalAccount`
  - `PortalIdentity`
  - `PortalSession`
  - `PortalRequest`
  - `PortalStatusView`
  - `PortalAccessGrant`
- state machines:
  - `PortalAccount: invited -> active | suspended | revoked`
  - `PortalRequest: open -> processing -> completed | rejected | cancelled`
- commands:
  - `createPortalAccount`
  - `grantPortalAccess`
  - `createPortalRequest`
- invariants:
  - portal är egen extern domän, inte en specialkolumn på interna objekt
  - canonical route family är `/v1/portal/*`
  - grants måste styra exakt vilka objekt som får ses eller påverkas
- tester:
  - portal root lifecycle
  - route truth suite

### Delfas 22.2 public form / intake / onboarding hardening

- bygg:
  - `PublicForm`
  - `FormSchemaVersion`
  - `FormSubmission`
  - `IntakePacket`
  - `OnboardingFlow`
- commands:
  - `publishPublicForm`
  - `submitPublicForm`
  - `materializeIntakePacket`
  - `startOnboardingFlow`
- invariants:
  - public forms måste ha versionerat schema
  - submission dedupe, evidence hash och tenant routing måste vara first-class
- tester:
  - form schema version tests
  - submission dedupe tests
  - onboarding handoff tests

### Delfas 22.3 external account / session / access grant hardening

- bygg:
  - `PortalRoleBinding`
  - `PortalInvite`
  - `PortalAccessGrant`
  - `PortalSessionReceipt`
- commands:
  - `invitePortalIdentity`
  - `bindPortalRole`
  - `revokePortalAccessGrant`
- invariants:
  - externa sessions och grants får inte luta på interna company-roles
  - grant, expiry och revoke måste vara explicit och auditbart
- tester:
  - invite/grant lifecycle
  - expiry and revoke tests

### Delfas 22.4 portal document / message / status hardening

- bygg:
  - `PortalDocumentGrant`
  - `PortalMessageThread`
  - `PortalStatusFeed`
  - `PortalUploadReceipt`
- commands:
  - `grantPortalDocumentAccess`
  - `postPortalMessage`
  - `uploadPortalDocument`
  - `materializePortalStatusFeed`
- invariants:
  - dokument, status och meddelanden måste vara grant-styrda
  - uploads måste bära retention, malware-scan och source actor
- tester:
  - document grant tests
  - upload lifecycle tests
  - status feed visibility tests

### Delfas 22.5 signing / signature evidence / reminder hardening

- bygg:
  - `SignatureRequest`
  - `SignerJourney`
  - `SignatureReminder`
  - `SignatureEvidenceRef`
  - `SignatureExpiryDecision`
- commands:
  - `createSignatureRequest`
  - `sendSignatureReminder`
  - `recordSignatureEvidenceRef`
  - `expireSignatureRequest`
- invariants:
  - signature archive är evidenslager, inte hela request-livscykeln
  - signering måste bära inviterad signer, deadlines, reminder och revoke/expiry policy
- officiella källor:
  - [Scrive e-signature](https://www.scrive.com/e-sign/)
- tester:
  - signature request lifecycle
  - evidence linkage tests
  - expiry/reminder tests

### Delfas 22.6 booking / request / self-service action hardening

- bygg:
  - `PortalBookingRequest`
  - `PortalRescheduleRequest`
  - `PortalStatusAction`
  - `PortalCancellationDecision`
- commands:
  - `requestPortalBooking`
  - `requestPortalReschedule`
  - `requestPortalCancellation`
  - `executePortalStatusAction`
- invariants:
  - externa actions får inte skriva direkt till delivery eller commercial truth utan via receipts
  - booking/reschedule måste följa delivery policies
- tester:
  - booking request lineage
  - reschedule/cancel policy tests

### Delfas 22.7 tenant isolation / branding / fraud / rate-limit hardening

- bygg:
  - `PortalBrandProfile`
  - `PortalRateLimitPolicy`
  - `PortalFraudSignal`
  - `PortalIsolationReceipt`
- commands:
  - `publishPortalBrandProfile`
  - `raisePortalFraudSignal`
  - `recordPortalIsolationReceipt`
- invariants:
  - tenant isolation och rate limiting är blockerande säkerhetskrav
  - branding måste vara separerad från access control och grants
- tester:
  - isolation tests
  - rate limit tests
  - fraud escalation tests

### Delfas 22.8 doc / runbook / legacy purge

- bygg:
  - `PortalDocTruthDecision`
  - `PortalLegacyArchiveReceipt`
  - `PortalRunbookExecution`
- dokumentbeslut:
  - rewrite: `docs/runbooks/fas-7-absence-portal-verification.md`
  - rewrite: `docs/runbooks/phase16-auth-signing-adapters-verification.md`
  - harden: signing archive docs till consumer docs
  - create: `docs/runbooks/portal-form-intake.md`
  - create: `docs/runbooks/portal-access-and-grants.md`
  - create: `docs/runbooks/portal-signing-and-self-service.md`
- invariants:
  - absence portal och signing archive får inte fortsätta vara falsk ersättning för portal core
- tester:
  - docs truth lint
  - runbook existence lint
