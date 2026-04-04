# DOMAIN_22_ROADMAP

## mål

Göra Domän 22 till företagets externa operativa yta så att kunder, leverantörer och ändra externa parter kan fylla i formulär, ladda upp underlag, boka, signera och följa status utan att lämna plattformen.

## varför domänen behövs

Utan denna domän är systemet fortfarande internt. Företaget måste fortfarande ha separata verktyg för formulär, onboarding, signering, extern dokumentdelning och status/self-service.

## bindande tvärdomänsunderlag

- `PORTALER_SIGNERING_INTAKE_OCH_EXTERN_SELVSERVICE_BINDANDE_SANNING.md` styr externa portaler, public forms, uploads, intake routing, signing envelopes, portal status och self-service actions i denna domän.
- `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md` styr scanning, OCR, AI fallback, duplicate detection och routed ingest efter externa uppladdningar.
- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` styr signeringsevidence, sign-off, approvals och externa audit receipts i denna domän.
- `LEGAL_REASON_CODES_OCH_SPECIALTEXTPOLICY_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör extern rendering av legal basis, specialtexter, 0%-anledningar, reverse-charge-texter, HUS/grön-specialtext och blockerad portalvisning utan canonical reason code.

## faser

- Fas 22.1 portal object-model / route truth
- Fas 22.2 public form / intake / onboarding hardening
- Fas 22.3 external account / session / access grant hardening
- Fas 22.4 portal document / message / status hardening
- Fas 22.5 signing / signature evidence / reminder hardening
- Fas 22.6 booking / request / self-service action hardening
- Fas 22.7 tenant isolation / branding / fraud / rate-limit hardening
- Fas 22.8 doc / runbook / legacy purge

## dependencies

- Domän 2 för extern auth, MFA, session och trust.
- Domän 7 för dokument, archive och export.
- Domän 18 för kundonboarding och kommersiell intake.
- Domän 19 för bokning och leveransstatus.
- Domän 21 för requests, approvals och workspace handoff.

## vad som får köras parallellt

- 22.2 och 22.3 kan köras parallellt när portal root är låst.
- 22.4 och 22.5 kan köras parallellt när account/session/access grants finns.
- 22.6 kan köras parallellt när form/intake och self-service status finns.

## vad som inte får köras parallellt

- 22.2 får inte markeras klar före 22.1.
- 22.3 får inte markeras klar före 22.1.
- 22.4 och 22.5 får inte markeras klara före 22.3.
- 22.6 får inte markeras klar före 22.4.
- 22.7 får inte markeras klar före 22.2–22.6.

## exit gates

- portal är en first-class extern yta med egen access- och grantsanning
- forms, uploads, signing, status och self-service actions är first-class runtime
- externa dokument och statusvyer är tenant-säkra, auditade och rate-limitade
- extern request/bokning går via canonical intake objects och receipts

## test gates

- public form and intake tests
- external account/session/access-grant tests
- signing request and evidence tests
- portal document/status permission tests
- booking/self-service action tests
- fraud/rate-limit/isolation tests

## delfaser

### Delfas 22.1 portal object-model / route truth
- [ ] bygg `PortalAccount`, `PortalSession`, `PortalRequest`, `PortalStatusView`, `PortalAccessGrant`
- [ ] skapa canonical route family `/v1/portal/*`
- [ ] separera portal root från specialfallsportaler som frånvaroportal
- [ ] verifiera route truth lint och repository truth

### Delfas 22.2 public form / intake / onboarding hardening
- [ ] bygg `PublicForm`, `FormSubmission`, `IntakePacket`, `OnboardingFlow`
- [ ] gör lead intake, dokumentintake och onboarding first-class
- [ ] bind formulär till schema, evidence och handoff till workspace/commercial core
- [ ] verifiera schema locking, submission dedupe och intake lineage

### Delfas 22.3 external account / session / access grant hardening
- [ ] bygg `PortalIdentity`, `PortalSession`, `PortalAccessGrant`, `PortalRoleBinding`, `PortalInvite`
- [ ] gör extern auth, grants och document/status-access first-class
- [ ] blockera oscopead extern åtkomst och delad tenant-sanning
- [ ] verifiera grants, expiry och revoke

### Delfas 22.4 portal document / message / status hardening
- [ ] bygg `PortalDocumentGrant`, `PortalMessageThread`, `PortalStatusFeed`, `PortalUploadReceipt`
- [ ] stöd dokumentdelning, meddelanden och statusvyer per extern part
- [ ] bind allt till explicit access grant och retention policy
- [ ] verifiera masking, revoke och audit trail

### Delfas 22.5 signing / signature evidence / reminder hardening
- [ ] bygg `SignatureRequest`, `SignerJourney`, `SignatureReminder`, `SignatureEvidenceRef`, `SignatureExpiryDecision`
- [ ] gör signering och signeringsevidens till first-class portalflöde
- [ ] bind signature archive till riktig request-lifecycle med reminder, expiry och revoke
- [ ] verifiera signing lineage, evidence linkage och expiry

### Delfas 22.6 booking / request / self-service action hardening
- [ ] bygg `PortalBookingRequest`, `PortalRescheduleRequest`, `PortalStatusAction`, `PortalCancellationDecision`
- [ ] stöd extern bokning, ombokning, avbokning och self-service requests
- [ ] lås hur externa actions översätts till delivery/workspace commands
- [ ] verifiera action lineage och policy block

### Delfas 22.7 tenant isolation / branding / fraud / rate-limit hardening
- [ ] bygg `PortalBrandProfile`, `PortalRateLimitPolicy`, `PortalFraudSignal`, `PortalIsolationReceipt`
- [ ] gör branding, rate limiting och fraud detection first-class
- [ ] blockera cross-tenant leakage, brute force och massupload abuse
- [ ] verifiera isolation, rate limit och fraud escalation

### Delfas 22.8 doc / runbook / legacy purge
- [ ] skriv explicit keep/rewrite/archive/remove-beslut för absence-portal- och signing-docs
- [ ] skapa canonical runbooks för form intake, portal access och signing
- [ ] håll signing archive och specialfallsportaler som consumers till portal core
- [ ] verifiera docs truth lint och legacy archive receipts
