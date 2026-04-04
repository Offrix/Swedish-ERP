# DOMAIN_14_ROADMAP

## mål

Göra integrationsdomänen till en verklig svensk integrations control plane med:
- en canonical source of truth för connections, credentials, consents, baselines, enablement, health och staleness
- säkert separerade inbound callbacks och outbound webhook deliveries
- versionsatta och blockerande public/partner API-kontrakt
- connection-aware jobs, replay, dead-letter och backpressure
- verkliga adapters i rätt svensk prioriteringsordning
- full rensning av fake-live providers, legacy migrations och osanna runbooks

## varför domänen behövs

Utan denna domän kan plattformen inte säkert:
- ansluta banker, myndigheter, identitetsleverantörer, e-faktura, kommunikation och partnerverktyg
- skydda secrets, tokens, callbacks och deliveries
- hålla isär trial, sandbox, pilot_parallel och production
- ge support och drift en sann bild av vad som faktiskt är live

## faser

- Fas 14.1 phase5 dependency / baseline-governance hardening
- Fas 14.2 integrations control-plane / connection-profile hardening
- Fas 14.3 credential / secret-ref / consent / expiry hardening
- Fas 14.4 capability-manifest / mode-matrix / receipt-mode hardening
- Fas 14.5 public-api / oauth / compatibility-baseline / sandbox hardening
- Fas 14.6 partner-api / contract-test / operation hardening
- Fas 14.7 route / contract / surface drift hardening
- Fas 14.8 inbound-webhook / callback-security hardening
- Fas 14.9 outbound-webhook / delivery-security hardening
- Fas 14.10 async-job / dead-letter / replay / backpressure hardening
- Fas 14.11 health / enablement / staleness hardening
- Fas 14.12 trial / sandbox / production isolation hardening
- Fas 14.13 provider-reference-boundary hardening
- Fas 14.14 mutation-scope hardening
- Fas 14.15 provider-baseline / schema-governance hardening
- Fas 14.16 provider reality classification / fake-live removal hardening
- Fas 14.17 Swedish adapter priority hardening

## dependencies

- Domän 1 för canonical persistence, event lineage och replay-safe runtime.
- Domän 2 för secrets, KMS/HSM, auth, callback trust och watermark/approval.
- Domän 5 för provider baseline registry, rulepack registry och official publication pipeline.
- Domän 6, 10, 11 och 12 för de domänobjekt som adapters faktiskt ska bära.
- Domän 16 för replay, dead letters, support/backoffice och incidentstyrda integrationsåtgärder.

## vad som får köras parallellt

- 14.2 kan köras parallellt med 14.3 när connection-id och repository truth är låsta.
- 14.5 kan köras parallellt med 14.6 efter att surface-familjerna fryses i 14.7.
- 14.8 och 14.9 kan köras parallellt när secret/version- och idempotency-modellen är låst.
- 14.11 och 14.12 kan köras parallellt när canonical enablement objects finns.
- 14.16 och 14.17 kan köras parallellt efter att baseline- och route-governance är låst.

## vad som inte får köras parallellt

- 14.2 får inte markeras klar före 14.1.
- 14.5 och 14.6 får inte markeras klara före 14.2, 14.3 och 14.4.
- 14.8 och 14.9 får inte markeras klara före 14.3.
- 14.10 får inte markeras klar före 14.2 och 14.6.
- 14.11 får inte markeras klar före 14.2, 14.3 och 14.10.
- 14.12 får inte markeras klar före 14.2, 14.3, 14.4 och 14.11.
- 14.16 får inte markeras klar före 14.15.
- 14.17 får inte markeras klar före 14.16.

## exit gates

- integrations control plane är ensam source of truth
- alla providerbundna operationer kräver central baseline/schema selection när policy kräver det
- public API, partner API, inbound callbacks och outbound webhooks har separerade och bevisade secret- och replaymodeller
- jobs, dead letters och replay är connection-aware och source-surface-aware
- health, enablement och staleness är separata first-class objekt
- fake-live providers är ersätta, nedklassade eller borttagna
- svensk prioriteringsvåg är låst mot officiellt verifierbara ekosystembehov

## test gates

- regressionstest för dubbel-submit på alla skrivytor med exakt ett utfall
- callbacktest för signatur, nonce/replay-window och separat business idempotency
- replaytest som bevisar oförändrad `connectionId`, `providerCode`, `mode` och `sourceSurfaceCode`
- restoretest som nekar cross-environment import av credentials och callback secrets
- deploytest som misslyckas om provider baseline, route hash eller spec hash driver
- provider reality tests som nekar legal-effect enablement för stateless adapters

## delfaser

### Delfas 14.1 phase5 dependency / baseline-governance hardening
- [ ] gör phase5-baseline selection blockerande på alla providerbundna writes
- [ ] förbjud direct connection, public API och partner operation utan styrd baseline där policy kräver det
- [ ] bär baseline id, version, checksum och effective date i receipts, jobs och callbacks
- [ ] verifiera deploy deny när baseline saknas eller checksum driver

### Delfas 14.2 integrations control-plane / connection-profile hardening
- [ ] bygg `IntegrationConnectionProfile`, `IntegrationConnectionStatus`, `IntegrationEnablementDecision`, `IntegrationStalenessState`
- [ ] gör control plane till enda primära skrivyta för connection state
- [ ] migrera bort att partnerstatus läses som governing truth från äldre state
- [ ] verifiera att partner/public/webhook/job paths bara läser eller skriver via control plane-kommandon

### Delfas 14.3 credential / secret-ref / consent / expiry hardening
- [ ] bygg `CredentialSetLifecycle`, `ConsentGrantLifecycle`, `SecretRotationReceipt`, `CredentialExpiryBlocker`
- [ ] gör expiry, revoke och reauth-required till first-class blockerobjekt
- [ ] förbjud rå secrets/tokens i DB, exports och snapshots
- [ ] verifiera rotation, revoke, expiry och read-model masking

### Delfas 14.4 capability-manifest / mode-matrix / receipt-mode hardening
- [ ] bygg publicerade manifestobjekt med signerad reality class, mode matrix och receipt mode policy
- [ ] bind `supportsLegalEffect`, `sandboxSupported`, `trialSafe` och `receiptMode` till verkliga enablementbeslut
- [ ] förbjud att fake-live providers bär legal-effect manifest
- [ ] verifiera deny på mode/receipt-drift

### Delfas 14.5 public-api / oauth / compatibility-baseline / sandbox hardening
- [ ] enhetliggör public API-surface och lås slutlig routefamilj
- [ ] gör compatibility baselines blockerande för release och spec-publicering
- [ ] bygg rotation/revoke/owner approvals för OAuth client credentials
- [ ] verifiera sandbox watermark, route hash, spec hash och drift deny

### Delfas 14.6 partner-api / contract-test / operation hardening
- [ ] bygg first-class `ContractTestPack`, `ContractTestPackVersion`, `PartnerOperationPolicy`, `PartnerOperationReceipt`
- [ ] förbjud produktionsexekvering utan passing pack för exakt connection och baseline
- [ ] ta bort dött `dryRun`-spår eller gör det till isolerat icke-live testmode
- [ ] verifiera dispatch deny, fallback policy och contract-pack lineage

### Delfas 14.7 route / contract / surface drift hardening
- [ ] lås canonical `/v1/integrations/*`, `/v1/public/*`, `/v1/partners/*`, `/v1/jobs/*`-modell eller explicit beslutad ersättning
- [ ] generera contract manifest från faktisk router och bind docs till samma hash
- [ ] förhindra split mellan `/v1/public/*` och `/v1/public-api/*`
- [ ] verifiera route-contract hash drift gating

### Delfas 14.8 inbound-webhook / callback-security hardening
- [ ] bygg `ProviderCallbackProfile`, `ProviderCallbackAttempt`, `CallbackReplayLease`, `BusinessIdempotencyRecord`
- [ ] centralisera inbound callback security över auth, OCR och övriga provider-callbacks
- [ ] separera signaturvalidering från business idempotency
- [ ] verifiera replay-window, nonce lease, key rotation och masked callback logging

### Delfas 14.9 outbound-webhook / delivery-security hardening
- [ ] bygg `WebhookDeliveryPolicy`, `WebhookSigningKeyVersion`, `WebhookDeliveryDeadLetter`, `WebhookDeliveryReceipt`
- [ ] ersätt legacy secret-migration med en enda canonical secretmodell
- [ ] bind deliveries till idempotency key, signing key version och provider receipts
- [ ] verifiera retries, dead letters, key rotation och duplicate suppression

### Delfas 14.10 async-job / dead-letter / replay / backpressure hardening
- [ ] bygg `IntegrationJobPolicy`, `IntegrationReplayPlan`, `IntegrationBackpressureState`, `IntegrationDeadLetterCase`
- [ ] gör replay connection-aware, provider-aware och source-surface-aware
- [ ] bind backpressure och circuit-breaker till connection policy
- [ ] verifiera dead-letter -> replay-plan -> replay utan förlorad connection identity

### Delfas 14.11 health / enablement / staleness hardening
- [ ] bygg `IntegrationHealthSnapshot`, `IntegrationEnablementDecision`, `IntegrationFreshnessState`, `IntegrationHealthEvidence`
- [ ] separera health, enablement och staleness till egna objekt
- [ ] gör receipt-lag, credential expiry, consent expiry och baseline drift first-class
- [ ] verifiera att grön health aldrig betyder live enablement utan egen receipt

### Delfas 14.12 trial / sandbox / production isolation hardening
- [ ] bygg `IntegrationEnvironmentIsolationPolicy`, `PromotionReceipt`, `CrossModeReuseViolation`, `RuntimeModeBoundary`
- [ ] förbjud promotion och replay som blandar trial/sandbox/live refs
- [ ] bind callbacks, credentials, receipts och provider refs till environment boundary
- [ ] verifiera deny på cross-mode import, replay och callback processing

### Delfas 14.13 provider-reference-boundary hardening
- [ ] bygg `ProviderReferencePolicy`, `ProviderReferenceReceipt`, `ExternalReferenceLink`
- [ ] hindra att provider-specifika ids läcker in som canonical affärs-id
- [ ] kräv explicit mapping mellan external refs och canonical domain objects
- [ ] verifiera att canonical ids överlever providerbyte och replay

### Delfas 14.14 mutation-scope hardening
- [ ] bygg `IntegrationMutationScope`, `IntegrationWriteApproval`, `SurfaceMutationReceipt`
- [ ] begränsa public API, partner API, callback och jobb till explicit mutation scope
- [ ] blockera writes som kringgår source-domänernas riktiga commands
- [ ] verifiera deny på överbred mutation och felaktig object family

### Delfas 14.15 provider-baseline / schema-governance hardening
- [ ] bygg `ProviderSchemaSelection`, `ProviderSchemaCompatibilityGate`, `ProviderPublicationReceipt`
- [ ] bind schema- och baseline-selection till route/spec/job/callback-runtime
- [ ] förbjud schema-byte utan ny publication, ny checksum och nytt contract-test-pack
- [ ] verifiera schema drift deny och rollback receipt

### Delfas 14.16 provider reality classification / fake-live removal hardening
- [ ] klassificera varje provider som `verified reality`, `partial reality`, `sandbox only`, `trial only`, `fake-live`, `remove`
- [ ] ta bort eller nedklassa stateless providers som saknar verklig extern runtime
- [ ] skriv om osanna docs och tester som marknadsför fake-live
- [ ] verifiera att legal-effect enablement nekar `fake-live`

### Delfas 14.17 Swedish adapter priority hardening
- [ ] prioritera svenska wave-1 adapters mot officiellt dokumenterade ekosystembehov
- [ ] fokusera på bank, Peppol, Fortnox/Visma/Bokio-nära import- och exportbehov, identitet och kommunikation i rätt ordning
- [ ] stoppa long-tail adapters som inte stärker svensk go-live
- [ ] verifiera att roadmap och provider backlog följer prioriteringsregeln

## konkreta verifieringar

- skapa connection, rotera credential, låt expiry passera och verifiera att enablement blockeras utan att secret läcker
- kör partner dispatch i production utan grön contract test och verifiera hårt deny
- spela upp ett dead-letterat integrationsjobb och verifiera att `connectionId`, `providerCode`, `mode` och `sourceSurfaceCode` är oförändrade
- skicka samma callback två gånger och verifiera att signaturkontroll och business idempotency båda fångar fel i rätt ordning
- publicera ny compatibility baseline med ändrad route hash och verifiera att release gate blockeras

## konkreta tester

- unit: credential isolation, consent expiry, webhook signing, replay metadata preservation, provider reality gating
- integration: control-plane API, public API catalog/token/webhook API, partner operations API, provider wave API
- regression: route drift hash tests, cross-mode isolation tests, export/import of secret refs, callback replay tests
- failure: contract-test missing, baseline missing, connection disabled, provider outage, dead-letter replay approval

## konkreta kontroller vi måste kunna utföra

- kontrollera att ingen legal-effect adapter körs utan verklig provider reality class och blockerande baseline ref
- kontrollera att inga `secret TEXT`-kolumner eller legacy secret paths längre används i livekedjan
- kontrollera att replay inte tappar connection/provider/mode/source-surface
- kontrollera att public API, partner API och jobs inte driver på olika route- eller object-modeller
- kontrollera att svenska wave-1 adapters faktiskt är de som prioriteras i backlogg och manifests

## markeringar

- keep: baseline registry, credential masking, mode matrix-koncept, partner dispatch gate på contract test
- harden: compatibility baselines, health snapshots, enablement, mutation scope, route contracts
- rewrite: control plane ownership, callback governance, replay, provider baseline binding
- replace: legacy webhook secret-migration, gamla phase13 migrations, fake-live provider adapters
- migrate: partner/job legacy state till ny canonical integrationsmodell
- archive: gamla fas-13-verification docs och osanna provider wave claims
- remove: `dryRun` som död policy, stateless live-claims, gamla secret-textspår
