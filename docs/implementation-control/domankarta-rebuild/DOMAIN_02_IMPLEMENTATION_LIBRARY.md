# DOMAIN_02_IMPLEMENTATION_LIBRARY

- `IDENTITET_AUTH_MFA_OCH_BEHORIGHET_BINDANDE_SANNING.md` är obligatorisk canonical source för lokal auth, MFA, step-up, passkeys, OIDC, SAML, sessioner, permissions, support reveal och high-risk access i denna domän.
- `SECRETS_KMS_HSM_OCH_KRYPTERING_BINDANDE_SANNING.md` är obligatorisk canonical source för secrets, key lineage, KMS, HSM, envelope encryption, rotation, decrypt boundaries och cryptographic evidence i denna domän.

## mål

Detta dokument definierar exakt hur Domän 2 ska byggas så att auth-, identity-, secret- och privileged-access-kedjan blir verklig, verifierbar och go-live-säker.

## Fas 2

### Delfas 2.1 Security Truth Lock And Fake-Live Demotion

#### Vad som ska byggas

Det ska finnas en enda sann klassificering av varje auth- och securitycapability.

#### Exakt modell

- bygg `SecurityCapabilityStatus(capabilityCode, runtimeClass, liveAllowed, blockerCodes, proofPaths)`
- varje capability ska ha en av:
  - `verified_reality`
  - `partial_reality`
  - `fake_live`
  - `stub`
  - `legacy`
- minst följande capabilitykoder ska finnas:
  - `totp`
  - `passkeys`
  - `bankid`
  - `federation`
  - `kms_hsm`
  - `callback_verification`
  - `route_trust_enforcement`
  - `impersonation`
  - `break_glass`

#### Invariansregler

- `liveAllowed=true` får aldrig sättas om capabilityn kräver extern verifieringskedja som inte finns
- docs, diagnostics och go-live gate måste läsa samma capabilitystatus
- capabilitystatus får inte sättas manuellt utan repo-bevis

### Delfas 2.2 Secret Inventory And Classification

#### Vad som ska byggas

Ett komplett secret- och key-register för hela auth- och providerdomänen.

#### Exakt modell

- bygg `SecretTypeRecord(secretType, securityClass, ownerDomain, storagePolicy, exportPolicy, rotationPolicy, revocationPolicy, providerBound)`
- bygg `SecretUsageRecord(secretType, runtimePath, stateCarrier, allowedRawPresence, proofPath)`
- säkerhetsklasser:
  - `S0` publik
  - `S1` intern låg känslighet
  - `S2` integritetskänslig men inte hemlig
  - `S3` skyddsvärd authmetadata
  - `S4` operativ hemlighet
  - `S5` root-of-trust eller juridiskt starkt material
- alla S4/S5 ska bära:
  - `ownerDomain`
  - `rotationOwner`
  - `currentKeyVersion`
  - `allowedEnvironments`
  - `recoveryMode`

#### Invariansregler

- S4/S5 får aldrig lagras i vanlig domänstate
- varje ny secret-typ måste registreras innan den får användas
- okänd secret-typ ska vara build- och readiness-blocker

### Delfas 2.3 Secret Storage, Import And Export Hardening

#### Vad som ska byggas

En enda tillåten write- och read-modell för hemligheter.

#### Exakt modell

- alla S4-hemligheter ska skrivas via `SecretStore.write(secretType, value, keyVersion, metadata)`
- alla domänobjekt ska bära endast:
  - `secretRef`
  - `keyVersion`
  - `fingerprint`
  - `providerEnvironmentRef`
  - `maskedValue`
- import av äldre snapshots ska gå genom explicit migrator:
  - `AuthSecretMigrationInput`
  - `LegacyBrokerSnapshot`
  - `MigrationDecision`
- runtime får inte direkt läsa rå `snapshot.authBroker`
- export av securitykritiska artifacts ska gå genom explicit export-policy:
  - `allowSecurityExport`
  - `requiredKmsClass`
  - `requiredApproval`

#### Invariansregler

- rå broker-state får inte laddas i normal runtime
- enrollment- och callback-svar med rå hemlighet måste flaggas `nonLoggable=true`
- secret reads ska vara kortlivade och inte serialiseras vidare

### Delfas 2.4 KMS/HSM/Envelope And Artifact-Integrity Hardening

#### Vad som ska byggas

Extern root-of-trust och riktig artifactintegritet.

#### Exakt modell

- bygg `SecurityKeySlot(environment, purpose, alias, status, currentVersion, previousVersion)`
- syften som minst måste finnas:
  - `data_envelope`
  - `blind_index`
  - `artifact_integrity`
  - `webhook_signing`
  - `provider_secret_wrap`
- protected bootstrap ska kräva:
  - extern `providerKind`
  - aktiv keyslot för varje obligatoriskt syfte
  - policy som förbjuder software fallback
- snapshot- och evidence-artifacts ska bära:
  - `integrityAlgorithm`
  - `integrityKeyVersion`
  - `integrityDigest`
  - `integritySignatureOrMac`

#### Invariansregler

- protected/pilot_parallel/production får aldrig falla tillbaka till software-kms
- `artifact_integrity`-nyckel får inte återanvändas som `data_envelope`-nyckel
- key rotation måste kunna läsa `previousVersion` under övergång men inte skriva ny data med utgången nyckel

### Delfas 2.5 Login Root, Session Root And Transport Hardening

#### Vad som ska byggas

Ny auth-root där sessionen uppstår först efter verifierad första faktor.

#### Exakt modell

- bygg `AuthTransaction(authTransactionId, companyId, identifier, requestedFirstFactor, createdAt, expiresAt, status, correlationId)`
- bygg `AuthSession(sessionId, tokenHash, companyId, userId, issuedAt, lastUsedAt, idleExpiresAt, absoluteExpiresAt, trustLevel, rotationCounter, amr, deviceTrustId, freshTrustByActionClass, revokedAt)`
- `/v1/auth/login` ska skapa eller returnera `AuthTransaction`, inte användbar session
- första faktor får vara:
  - verifierad passkey assertion
  - verifierad BankID-auth
  - verifierad federation
  - annat uttryckligen definierat proof-of-possession-flöde
- sessiontoken ska:
  - skapas efter första faktor
  - roteras vid varje trusteskalering
  - aldrig accepteras i request body på auth-känsliga routes

#### Invariansregler

- ren identifierare får aldrig bli session
- pending auth transaction får inte ge bolagsåtkomst
- gammalt token måste dö direkt efter rotation
- `x-forwarded-for` får bara användas via trusted-proxy-konfiguration

### Delfas 2.6 TOTP, Device Trust And Fresh-Trust Hardening

#### Vad som ska byggas

Persistent faktor- och replay-kontroll för TOTP och privileged operations.

#### Exakt modell

- bygg `TotpReplayRecord(factorId, timeStep, acceptedAt, sessionId, consumedByAction)`
- bygg `SecurityThrottleRecord(scopeType, scopeId, failureSeries, lockedUntil, lastFailureAt, lastIp, lastDeviceRef)`
- bygg `DeviceTrustRecord(deviceTrustId, companyId, userId, deviceFingerprint, issuedAt, expiresAt, revokedAt, trustClass)`
- bygg `FreshTrustRecord(sessionId, actionClass, gräntedAt, expiresAt, factorSet, sourceEvidenceRef)`
- TOTP-verifiering ska:
  - validera tidsfönster
  - kontrollera att timestep inte redan konsumerats
  - skriva replay-ledger i persistent store

#### Invariansregler

- samma accepterade TOTP-timestep får inte användas igen
- lockout får inte vara processlokal
- fresh trust måste vara action-class-bunden och tidsbegränsad

### Delfas 2.7 Passkey Hardening

#### Vad som ska byggas

Riktig WebAuthn-implementering.

#### Exakt modell

- bygg `WebAuthnRegistrationChallenge(challengeId, challenge, rpId, origin, userId, companyId, createdAt, expiresAt, consumedAt)`
- bygg `PasskeyCredential(credentialId, userId, companyId, publicKeyRef, aaguid, transports, signCount, userVerificationCapability, attestationClass, createdAt, revokedAt)`
- bygg `WebAuthnAssertionReceipt(assertionId, credentialId, challengeId, rpId, origin, signCountBefore, signCountAfter, uvSatisfied, acceptedAt, sessionId)`
- assertionverifiering måste kontrollera:
  - challenge
  - RP ID
  - origin
  - authenticatorData
  - signature
  - user presence
  - user verification när policy kräver det
  - signCount regression

#### Invariansregler

- strängsubstitut som `passkey:<credentialId>` får aldrig kunna passera
- challenge måste vara en-gångsbar
- credential clone-signal måste flaggas

### Delfas 2.8 BankID Hardening

#### Vad som ska byggas

Verklig BankID-kedja via riktig broker/provider.

#### Exakt modell

- bygg `BankIdAuthTransaction(bankIdAuthId, providerCode, providerEnvironmentRef, companyId, userIdHint, orderRef, startedAt, expiresAt, status, brokerCorrelationId)`
- bygg `BankIdProofReceipt(bankIdProofId, bankIdAuthId, providerSubject, completionEvidenceRef, legalEffectClass, acceptedAt, sessionId)`
- provideradapter ska bära:
  - riktig credential-set
  - riktig broker endpoint-konfiguration
  - environment-bound callback/poll policy
  - explicit `supportsLegalEffectInProduction`
- sessiontrust får bara höjas när `BankIdProofReceipt` skrivits från verklig providerrespons

#### Invariansregler

- lokalt genererade completion tokens får inte accepteras i liveklassad capability
- provider subject måste komma från verklig provider/broker
- sandbox och production får inte dela credentials, callback-domäner eller receipts

### Delfas 2.9 Federation Hardening

#### Vad som ska byggas

Verklig OIDC/SAML-federation med standardverifiering.

#### Exakt modell

- bygg `FederationAuthRequest(authRequestId, providerCode, protocol, state, nonce, issuerExpected, audienceExpected, redirectUri, companyId, createdAt, expiresAt, consumedAt)`
- bygg `FederationIdentityProof(federationProofId, authRequestId, providerSubject, issuer, audience, nonce, tokenRef, jwksRef, acceptedAt, sessionId)`
- OIDC verifiering måste kontrollera:
  - state
  - nonce
  - issuer
  - audience
  - expiry
  - signature mot JWKS
- SAML verifiering måste kontrollera:
  - signerad assertion
  - audience restriction
  - recipient
  - `NotBefore`
  - `NotOnOrAfter`
  - certifikatskedja eller explicit trust anchor

#### Invariansregler

- lokal authorization-code-simulering får inte användas i liveklassad capability
- federationidentitet får inte automatiskt ge affärsroll utan separat mappingbeslut

### Delfas 2.10 Callback, Webhook And Provider-Boundary Hardening

#### Vad som ska byggas

Riktig providerverifiering och replay-skydd för inkommande events.

#### Exakt modell

- bygg `ProviderCallbackLedger(providerCode, environmentRef, deliveryId, externalOperationId, verificationMethod, verifiedAt, replayWindowUntil, status, correlationId)`
- bygg `ProviderVerificationPolicy(providerCode, environmentRef, callbackDomain, callbackPath, verificationMethod, credentialRef, replayMode, operatorOnly)`
- varje providerroute ska vara en av:
  - verklig extern callback
  - verifierad poll-completion
  - intern operatörscollect
- operatörscollect får inte kallas provider-callback
- callbackverifieringsmetoder som minst ska kunna stödjas:
  - webhook-signatur
  - token exchange
  - JWT/JWS-verifiering
  - SAML assertion-verifiering
  - verifierad providerpoll

#### Invariansregler

- samma delivery-id får inte kunna konsumeras två gånger
- callback från fel environment ska blockeras
- callback utan verifieringsmetod ska blockeras

### Delfas 2.11 Permission, Boundary And Privileged-Access Enforcement

#### Vad som ska byggas

Central enforcement för alla high-risk-routes.

#### Exakt modell

- bygg `RouteSecurityDecision(routeId, principalId, companyId, permissionCode, requiredTrustLevel, currentTrustLevel, actionClass, freshTrustSatisfied, objectScopeSatisfied, allowed, reasonCode, evidenceRef)`
- varje routebeslut ska köras innan handlern
- beslutsmotorn ska använda:
  - session
  - principal
  - company boundary
  - permission resolution
  - required trust
  - action class
  - fresh trust
  - privileged session allowlist
- impersonation och break-glass ska ha egna `PrivilegedSessionGrant`-objekt med:
  - `grantId`
  - `scope`
  - `approvedBy`
  - `approvedAt`
  - `requiredTrustLevel`
  - `freshTrustExpiresAt`
  - `allowlistedActions`
  - `watermark`

#### Invariansregler

- metadata i `route-contracts.mjs` utan runtime enforcement räknas inte
- rätt permission men fel trust ska ge avslag
- rätt trust men fel bolag ska ge avslag
- TOTP-only får inte uppfylla `strong_mfa` där policy kräver starkare faktoruppsättning

### Delfas 2.12 Audit, Evidence And Production Security Gate

#### Vad som ska byggas

Tamper-evident security evidence och hård production gate.

#### Exakt modell

- bygg `SecurityEvidenceRecord(evidenceId, eventType, actorId, companyId, sessionId, trustLevel, payloadDigest, integrityKeyVersion, createdAt)`
- bygg `SecurityReadinessGate(gateId, blockerCodes, kmsReady, providerRealityReady, routeTrustReady, persistentSecurityStateReady, auditIntegrityReady, decision, evaluatedAt)`
- följande events måste vara first-class audit:
  - factor enrollment
  - factor revoke
  - session create
  - session rotate
  - session revoke
  - provider callback verified
  - credential change
  - key rotation
  - impersonation start/stop
  - break-glass request/approve/start/stop

#### Invariansregler

- evidence som ligger till grund för security-go-live måste vara signerad eller MAC:ad
- readiness gate får inte bli grön om öppna critical security blockers finns
- externa blockerare som saknade providerkonton eller KMS-nycklar måste stå kvar som blockerare tills användaren faktiskt ger dem

## vilka bevis som krävs innan något märks som bank-grade eller production-ready

- extern KMS/HSM aktiv i skyddad drift
- inga rå S4/S5-hemligheter i state, snapshots, logs eller exports
- första faktor verifierad innan session skapas
- tokenrotation och idle timeout verifierade
- TOTP replay blockerad i persistent ledger
- passkey verifierad enligt riktig WebAuthn
- BankID verifierad via riktig providerkedja
- federation verifierad via riktig OIDC/SAML-kedja
- callback- och webhook-verifiering verklig och replay-säker
- central route-enforcement aktiv på verkliga handlers
- privileged access kräver rätt trust och fresh-trust
- security evidence signerad eller MAC:ad

## vilka risker som kräver mänsklig flaggning

- val och etablering av faktisk KMS/HSM-provider och produktionsnycklar
- etablering av riktiga Signicat/BankID-konton, WorkOS eller annan federation-provider
- val av verkliga callback-domäner, certifikat, secrets och trust anchors
- policyval för vilka faktoruppsättningar som får räknas som `strong_mfa`
- eventuella regulatoriska krav på legal effect, signering och identitetsklassning som kräver affärsägarbeslut
