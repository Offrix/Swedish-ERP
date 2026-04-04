# DOMAIN_14_IMPLEMENTATION_LIBRARY

## mål

Fas 14 ska byggas så att:
- integrations control plane äger all canonical integrationssanning
- varje providerbunden operation går via baseline-, mode-, enablement- och mutation-scope-gates
- public API, partner API, callbacks, webhook deliveries och jobs följer samma identitets- och replaymodell
- secrets, callbacks, tokens och provider refs skyddas och spåras på bank-grade nivå
- endast verkliga adapters kan märkas live-ready

## Fas 14

### Delfas 14.1 phase5 dependency / baseline-governance hardening

- bygg:
  - `ProviderBaselineSelection`
  - `ProviderPublicationReceipt`
  - `ProviderSchemaSelection`
  - `IntegrationBaselineRequirement`
- commands:
  - `selectIntegrationProviderBaseline`
  - `verifyIntegrationBaselineRequirement`
- invariants:
  - varje providerbundet kommando måste resolva baseline via central registry när policy kräver det
  - baseline id, version, checksum och effective date måste bäras i operationer, jobs, callbacks och receipts
- blockerande valideringar:
  - deny runtime om baseline saknas där policy kräver baseline
- tester:
  - baseline missing deny
  - checksum drift deny

### Delfas 14.2 integrations control-plane / connection-profile hardening

- bygg:
  - `IntegrationConnection`
  - `IntegrationConnectionProfile`
  - `IntegrationConnectionStatus`
  - `IntegrationEnablementDecision`
  - `IntegrationStalenessState`
- state machines:
  - `IntegrationConnectionStatus: draft -> validated -> enabled | disabled | revoked`
- commands:
  - `createIntegrationConnection`
  - `updateIntegrationConnectionProfile`
  - `decideIntegrationEnablement`
- invariants:
  - control plane är enda primära skrivyta för connection truth
  - partner/public/webhook/job-moduler får inte äga egen canonical connection-status
- blockerande valideringar:
  - deny dispatch om connection saknar canonical status eller enablement decision
- tester:
  - control-plane-only mutation tests
  - partner-state backfill deny tests

### Delfas 14.3 credential / secret-ref / consent / expiry hardening

- bygg:
  - `CredentialSetMetadata`
  - `CredentialSetLifecycle`
  - `ConsentGrant`
  - `CredentialExpiryBlocker`
  - `SecretRotationReceipt`
- state machines:
  - `CredentialSetLifecycle: active -> expiring | expired | revoked | rotated`
  - `ConsentGrant: pending -> authorized | expired | revoked`
- commands:
  - `recordCredentialSetMetadata`
  - `authorizeConsent`
  - `revokeCredentialSet`
  - `recordSecretRotationReceipt`
- invariants:
  - durable state får bara bära refs, fingerprints, previews, key version och posture metadata
  - rå secrets, access tokens och callback secrets får aldrig hamna i DB, exports eller logs
- blockerande valideringar:
  - deny dispatch om credential eller consent är expired/revoked
- tester:
  - masking and isolation tests
  - expiry/revoke blocking tests

### Delfas 14.4 capability-manifest / mode-matrix / receipt-mode hardening

- bygg:
  - `CapabilityManifest`
  - `CapabilityManifestVersion`
  - `ModeMatrix`
  - `ReceiptModePolicy`
  - `ProviderRealityClass`
- commands:
  - `publishCapabilityManifestVersion`
  - `classifyProviderReality`
- invariants:
  - manifest måste vara publicerat artefaktobjekt, inte bara runtime helper-data
  - `supportsLegalEffect=false` blockerar live enablement alltid
  - `fake-live` eller `sandbox only` får aldrig bära production/legal-effect flagga
- blockerande valideringar:
  - deny enablement om manifestets reality class och mode matrix inte tillåter miljön
- tester:
  - manifest/mode drift tests
  - fake-live deny tests

### Delfas 14.5 public-api / oauth / compatibility-baseline / sandbox hardening

- bygg:
  - `PublicApiSpec`
  - `PublicApiClient`
  - `PublicApiToken`
  - `PublicApiCompatibilityBaseline`
  - `PublicApiSandboxPolicy`
- state machines:
  - `PublicApiClient: active | revoked`
  - `PublicApiCompatibilityBaseline: recorded -> current | superseded | blocked`
- commands:
  - `recordPublicApiCompatibilityBaseline`
  - `createPublicApiClient`
  - `exchangePublicApiClientCredentials`
  - `revokePublicApiClient`
- invariants:
  - endast versionsatt canonical public surface är tillåten
  - compatibility baseline måste härledas från faktisk router/spec
  - sandbox måste vara tydligt vattenmärkt och isolerad
- blockerande valideringar:
  - deny spec release om route/spec hash driver
- officiella regler och källor:
  - [RFC 6749 OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)
- tester:
  - token issue/revoke tests
  - route hash drift tests

### Delfas 14.6 partner-api / contract-test / operation hardening

- bygg:
  - `ContractTestPack`
  - `ContractTestPackVersion`
  - `ContractTestResult`
  - `PartnerOperation`
  - `PartnerOperationPolicy`
  - `PartnerOperationReceipt`
- state machines:
  - `ContractTestPackVersion: draft -> published | superseded | revoked`
  - `PartnerOperation: queued -> running -> succeeded | failed | fallback | rate_limited`
- commands:
  - `publishContractTestPackVersion`
  - `runAdapterContractTest`
  - `dispatchPartnerOperation`
  - `recordPartnerOperationReceipt`
- invariants:
  - production dispatch kräver passing pack för exakt connection, provider och baseline
  - `dryRun` får aldrig masquerada som riktig operation
- blockerande valideringar:
  - deny production dispatch utan passing immutable contract test result
- tester:
  - dispatch gate tests
  - contract-pack lineage tests

### Delfas 14.7 route / contract / surface drift hardening

- bygg:
  - `IntegrationRouteContract`
  - `IntegrationSurfaceMap`
  - `RouteContractManifest`
  - `RouteDriftReceipt`
- commands:
  - `publishIntegrationRouteContractManifest`
  - `verifyIntegrationRouteDrift`
- invariants:
  - docs, router och generated contract manifest måste matcha exakt
  - split mellan `/v1/public/*` och `/v1/public-api/*` får inte leva kvar som oklar sanning
- blockerande valideringar:
  - deny release om route drift finns
- tester:
  - route contract hash tests
  - prefix consistency tests

### Delfas 14.8 inbound-webhook / callback-security hardening

- bygg:
  - `ProviderCallbackProfile`
  - `ProviderCallbackAttempt`
  - `CallbackReplayLease`
  - `BusinessIdempotencyRecord`
  - `CallbackSecretVersion`
- state machines:
  - `ProviderCallbackAttempt: received -> signature_verified | rejected -> handled | dead_lettered`
- commands:
  - `registerProviderCallbackProfile`
  - `recordProviderCallbackAttempt`
  - `verifyProviderCallbackSignature`
  - `claimCallbackReplayLease`
- invariants:
  - signaturkontroll och business idempotency är två separata kontroller
  - callback secret rotation måste vara versionsbunden och auditbar
- blockerande valideringar:
  - deny business handling om signature verification eller replay lease saknas
- tester:
  - signature replay window tests
  - duplicate callback idempotency tests

### Delfas 14.9 outbound-webhook / delivery-security hardening

- bygg:
  - `WebhookSubscription`
  - `WebhookSigningKeyVersion`
  - `WebhookDelivery`
  - `WebhookDeliveryAttempt`
  - `WebhookDeliveryDeadLetter`
- state machines:
  - `WebhookDelivery: queued -> running -> sent | failed | rate_limited | suppressed | disabled | dead_lettered`
- commands:
  - `createWebhookSubscription`
  - `emitWebhookEvent`
  - `dispatchWebhookDeliveries`
  - `rotateWebhookSigningKey`
- invariants:
  - varje delivery attempt måste bära signing key version, idempotency key och provider reference när sådan finns
  - legacy `subscription.secret` får inte finnas kvar i canonical live path
- blockerande valideringar:
  - deny live dispatch om subscription fortfarande beror på legacy secret path
- tester:
  - key rotation tests
  - delivery retry/dead-letter tests

### Delfas 14.10 async-job / dead-letter / replay / backpressure hardening

- bygg:
  - `IntegrationAsyncJob`
  - `IntegrationDeadLetterCase`
  - `IntegrationReplayPlan`
  - `IntegrationBackpressureState`
  - `CircuitBreakerState`
- state machines:
  - `IntegrationAsyncJob: queued -> claimed -> running -> succeeded | failed | retry_scheduled | dead_lettered | replay_planned | replayed`
- commands:
  - `enqueueIntegrationJob`
  - `planIntegrationReplay`
  - `executeIntegrationReplay`
  - `updateIntegrationBackpressureState`
- invariants:
  - replay måste bära `connectionId`, `providerCode`, `mode`, `sourceSurfaceCode` och `baselineRef`
  - backpressure och circuit breaker måste vara connection policy, inte ad hoc-status
- blockerande valideringar:
  - deny replay om connection-aware metadata inte kan återställas
- tester:
  - replay metadata preservation
  - circuit-breaker/backpressure tests

### Delfas 14.11 health / enablement / staleness hardening

- bygg:
  - `IntegrationHealthSnapshot`
  - `IntegrationEnablementDecision`
  - `IntegrationFreshnessState`
  - `IntegrationHealthEvidence`
- state machines:
  - `IntegrationEnablementDecision: pending -> approved | denied | suspended`
  - `IntegrationFreshnessState: fresh | stale | blocked`
- commands:
  - `recordIntegrationHealthSnapshot`
  - `decideIntegrationEnablement`
  - `markIntegrationFreshnessState`
- invariants:
  - health, enablement och staleness får aldrig kollapsas till en enda grön indikator
  - credential expiry, consent expiry, baseline drift och receipt lag måste vara egna checks
- blockerande valideringar:
  - deny live use om enablement saknas även när health är grön
- tester:
  - health vs enablement separation
  - stale-state blocking tests

### Delfas 14.12 trial / sandbox / production isolation hardening

- bygg:
  - `IntegrationEnvironmentIsolationPolicy`
  - `RuntimeModeBoundary`
  - `PromotionReceipt`
  - `CrossModeReuseViolation`
- commands:
  - `verifyIntegrationEnvironmentIsolation`
  - `promoteIntegrationEnvironment`
- invariants:
  - credentials, callbacks, receipts och provider refs får inte återanvändas över förbjudna modes
  - trial/sandbox/live måste vara hårt separerade i state och restore
- blockerande valideringar:
  - deny cross-mode replay, import och promotion utan explicit receipt
- tester:
  - cross-mode deny tests
  - promotion receipt tests

### Delfas 14.13 provider-reference-boundary hardening

- bygg:
  - `ExternalReferenceLink`
  - `ProviderReferencePolicy`
  - `ProviderReferenceReceipt`
- commands:
  - `linkExternalProviderReference`
  - `verifyProviderReferenceBoundary`
- invariants:
  - provider-specifika ids får aldrig bli canonical business ids
  - varje external ref måste mappas till ett internt canonical object id
- blockerande valideringar:
  - deny writes som försöker använda provider ref som primary domain id
- tester:
  - external-reference mapping tests
  - provider swap survivability tests

### Delfas 14.14 mutation-scope hardening

- bygg:
  - `IntegrationMutationScope`
  - `IntegrationWriteApproval`
  - `SurfaceMutationReceipt`
- commands:
  - `publishIntegrationMutationScope`
  - `approveIntegrationWrite`
- invariants:
  - public API, partner API, callbacks och jobs får bara skriva inom explicit mutation scope
  - integrationsytor får inte kringgå källdomänernas riktiga commands
- blockerande valideringar:
  - deny write utanför mutation scope eller object family
- tester:
  - över-broad mutation deny tests
  - source-domain bypass tests

### Delfas 14.15 provider-baseline / schema-governance hardening

- bygg:
  - `ProviderSchemaSelection`
  - `ProviderSchemaCompatibilityGate`
  - `ProviderPublicationArtifact`
  - `ProviderRollbackReceipt`
- commands:
  - `publishProviderSchemaSelection`
  - `verifyProviderSchemaCompatibilityGate`
  - `rollbackProviderPublication`
- invariants:
  - schema-byte kräver ny publication, ny checksum och nytt contract-test-pack
  - route/spec/job/callback-runtime måste bära samma schema/baseline truth
- blockerande valideringar:
  - deny schema drift i runtime
- tester:
  - schema drift deny
  - rollback receipt tests

### Delfas 14.16 provider reality classification / fake-live removal hardening

- bygg:
  - `ProviderRealityClassification`
  - `ProviderEvidenceBundle`
  - `ProviderFakeLiveRemovalReceipt`
- commands:
  - `classifyProviderReality`
  - `removeFakeLiveProviderClaim`
- invariants:
  - stateless providers utan verklig adapterruntime får inte märkas `legal_effect_ready`
  - docs och tester får inte påstå mer än provider reality class tillåter
- blockerande valideringar:
  - deny enablement om provider reality class är `fake_live`
- tester:
  - fake-live denial
  - doc/runtime reality lint

### Delfas 14.17 Swedish adapter priority hardening

- bygg:
  - `AdapterPriorityWave`
  - `AdapterMarketEvidence`
  - `AdapterBacklogDecision`
- commands:
  - `publishAdapterPriorityWave`
  - `recordAdapterMarketEvidence`
- invariants:
  - svenska wave-1 adapters måste styras av officiellt dokumenterade ekosystembehov
  - long-tail adapters får inte prioriteras före svenska go-livekritiska behov
- officiella regler och källor:
  - [OpenPeppol BIS Billing 3.0](https://docs.peppol.eu/poacc/billing/3.0/)
  - [Fortnox Developer Portal](https://www.fortnox.se/en/developer/developer-portal)
  - [Visma Developer](https://developer.visma.com/)
  - [Bokio API / integrationer](https://www.bokio.se/hjalp/integrationer/bokio-api/automatisera-bokforingen-i-bokio-med-api-sa-gor-du/)
- tester:
  - priority-wave policy tests
  - backlog ordering tests

## vilka bevis som krävs innan domän 14 märks som klar

- control plane äger ensam integrationssanning
- baseline, schema, connection, callback, delivery och replay använder samma canonical refs
- inga legacy secrets, fake-live providers eller route drifts återstår
- public/partner/webhook/job surfaces har blockerande security-, compatibility- och mutation-gates
- svenska wave-1 adapters är realistiska och prioriterade

## vilka risker som kräver mänsklig flaggning

- verkliga externa konton, credentials, certifikat och KMS/HSM-val
- irreversibel borttagning av gamla provider paths som fortfarande används i produktion
- prioritering mellan svenska adaptervågor när marknads- eller kundåtäganden krockar
