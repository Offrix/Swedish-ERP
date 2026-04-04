# PARTNER_API_WEBHOOKS_OCH_ADAPTERKONTRAKT_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för partner-API:er, adapters och webhooks.

## Syfte

Detta dokument ska låsa externa kontrakt sa att callbacks, retries, schemaandringar och signatures inte kan skapa falsk legal effect.

## Omfattning

Detta dokument omfattar:
- outbound partner requests
- inbound webhooks och callbacks
- adapter contracts
- schema/versionering
- signature verification
- duplicate control

Detta dokument omfattar inte:
- Peppol-specifika kontrakt
- scanning/OCR
- bankfilformat

## Absoluta principer

- inbound webhook får aldrig skapa legal effect utan verifierad autenticitetskontroll
- inbound webhook får aldrig skriva direkt till business state utan command path
- alla externa kontrakt måste vara versionsatta
- alla deliveries måste vara idempotenta
- original payload måste lagras immutabelt

## Bindande dokumenthierarki för partner API, webhooks och adapterkontrakt

- `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md` äger scanningrelaterade callbacks
- `PEPPOL_EDI_OCH_OFFENTLIG_EFAKTURA_BINDANDE_SANNING.md` äger Peppol-specifika kontrakt
- `IDENTITET_AUTH_MFA_OCH_BEHORIGHET_BINDANDE_SANNING.md` ska agera overordnad sanning för authn/authz runt partner access
- `SECRETS_KMS_HSM_OCH_KRYPTERING_BINDANDE_SANNING.md` ska agera overordnad sanning för signing keys och trust material
- Domän 2, 5, 6, 7 och 27 får inte definiera avvikande webhook- eller adaptertruth utan att detta dokument skrivs om samtidigt

## Kanoniska objekt

- `PartnerContract`
- `PartnerEndpointBinding`
- `OutboundPartnerRequest`
- `InboundWebhookDelivery`
- `WebhookSignatureEvidence`
- `PartnerSchemaVersion`
- `PartnerDeliveryIssue`

## Kanoniska state machines

- `OutboundPartnerRequest`: `draft -> signed -> sent -> acknowledged | failed | superseded`
- `InboundWebhookDelivery`: `received -> verified -> routed -> consumed | blocked | rejected`
- `PartnerDeliveryIssue`: `open -> triaged -> resolved | blocking`

## Kanoniska commands

- `BindPartnerEndpoint`
- `CreateOutboundPartnerRequest`
- `SignOutboundPartnerRequest`
- `SendOutboundPartnerRequest`
- `ReceiveInboundWebhookDelivery`
- `VerifyInboundWebhookSignature`
- `RouteInboundWebhookDelivery`
- `RejectInboundWebhookDelivery`

## Kanoniska events

- `PartnerEndpointBound`
- `OutboundPartnerRequestCreated`
- `OutboundPartnerRequestSigned`
- `OutboundPartnerRequestSent`
- `InboundWebhookDeliveryReceived`
- `InboundWebhookSignatureVerified`
- `InboundWebhookDeliveryRouted`
- `InboundWebhookDeliveryRejected`

## Kanoniska route-familjer

- `/api/partners/outbound/*`
- `/api/partners/webhooks/*`
- `/api/partners/contracts/*`
- `/api/partners/receipts/*`

## Kanoniska permissions och review boundaries

- `integration.manage` får binda partner endpoints
- `integration.send` får skapa outbound requests
- `support` får se deliveries men får inte overstyra signature verdict
- review krävs för schema drift, unknown event type, signature mismatch och duplicate-with-different-payload

## Nummer-, serie-, referens- och identitetsregler

- varje outbound request ska ha idempotency key
- varje inbound delivery ska ha immutable delivery id, received-at och payload digest
- varje partner contract ska ha explicit contract version och schema version
- webhook signatures ska referera key id eller verifieringskontext

## Valuta-, avrundnings- och omräkningsregler

- payloads får inte avrunda om reglerade belopp utan overordnad domäntruth
- inbound payload med oklar amount encoding ska blockeras eller routas till review

## Replay-, correction-, recovery- och cutover-regler

- duplicate with same digest = no-op eller idempotent confirmation
- duplicate with changed digest = hard block
- outbound resend ska peka på tidigare request lineage
- cutover får inte reemitera gamla webhooks som nya business events

## Huvudflödet

1. partner contract och endpoint binding faststalls
2. outbound payload skapas eller inbound delivery tas emot
3. signering eller signaturverifiering sker
4. schema/version valideras
5. routing till command path sker
6. receipts och evidence sparas

## Bindande scenarioaxlar

- inbound vs outbound
- signed vs mutually authenticated
- valid signature vs invalid
- first delivery vs duplicate
- same digest vs changed digest
- known event type vs unknown
- inside replay window vs outside replay window
- contract-required idempotency key present vs absent
- schema supported vs deprecated vs blocked
- mTLS identity match vs identity mismatch
- sync ack only vs async business completion

## Bindande policykartor

- `API-POL-001`: inbound webhook must be signed or authenticated according to contract
- `API-POL-002`: verification before business routing
- `API-POL-003`: original payload immutable
- `API-POL-004`: explicit contract version
- `API-POL-005`: routing only to command path
- `API-POL-006`: replay protection window or equivalent nonce/timestamp control mandatory where contract says so
- `API-POL-007`: partner signing keys and mTLS identities must be versioned and overlap-gated during rotation
- `API-POL-008`: transport-level ack is never equal to business consumption verdict
- `API-POL-009`: required idempotency key, event id or delivery id must be present before business routing
- `API-POL-010`: deprecated or downgraded schema versions may be accepted only via explicit compatibility policy; annars block

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `API-P0001` endpoint binding with contract version
- `API-P0002` outbound request signed and sent
- `API-P0003` inbound delivery received and digest computed
- `API-P0004` inbound signature verified
- `API-P0005` inbound duplicate same digest no-op
- `API-P0006` inbound duplicate changed digest blocked
- `API-P0007` unknown event type review/block
- `API-P0008` routed to command path only
- `API-P0009` replay-window or nonce verification executed before business routing
- `API-P0010` required idempotency key verified before consume attempt
- `API-P0011` mTLS identity bound to expected partner contract
- `API-P0012` transport ack persisted separately from downstream business consume verdict
- `API-P0013` deprecated or unsupported schema version blocked or quarantined under explicit policy

## Bindande rapport-, export- och myndighetsmappning

- partner payloads är integrations- och audit-evidence
- inga partner payloads är myndighetsrapport i sig utan overordnad domänbinding

## Bindande scenariofamilj till proof-ledger och rapportspar

- `API-A001` outbound signed request -> `API-P0001`,`API-P0002`
- `API-B001` inbound verified webhook -> `API-P0003`,`API-P0004`,`API-P0008`
- `API-B002` inbound duplicate same digest -> `API-P0005`
- `API-B003` inbound duplicate changed digest -> `API-P0006`
- `API-B004` unknown event -> `API-P0007`
- `API-B005` replay outside allowed window -> `API-P0009`
- `API-B006` missing required idempotency key -> `API-P0010`
- `API-B007` mTLS identity mismatch -> `API-P0011`
- `API-B008` async ack without business consume -> `API-P0012`
- `API-B009` deprecated or unsupported schema -> `API-P0013`

## Tvingande dokument- eller indataregler

- contract version required
- schema version required
- original payload required
- payload digest required
- verification material required för signed flows
- delivery timestamp or replay token required where replay policy says so
- idempotency key or delivery id required where contract says so
- partner key version or transport identity binding required för rotated-trust scenarios

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `API-R001` missing_contract_version
- `API-R002` missing_signature
- `API-R003` invalid_signature
- `API-R004` unknown_schema_version
- `API-R005` duplicate_changed_payload
- `API-R006` unknown_event_type
- `API-R007` replay_window_violation
- `API-R008` missing_idempotency_key
- `API-R009` mtls_identity_mismatch
- `API-R010` transport_ack_without_business_verdict

## Bindande faltspec eller inputspec per profil

- `signed_webhook`: signature, payload, payload digest, key ref, timestamp or equivalent
- `mutual_auth_callback`: verified transport identity, payload, request id
- `outbound_partner_request`: contract version, schema version, idempotency key, payload digest
- `signed_webhook_with_replay_guard`: signature, payload, payload digest, timestamp, replay window profile, key version ref
- `mutual_auth_callback_with_contract_binding`: verified transport identity, contract version, payload, request id, expected counterparty id
- `async_partner_callback`: transport ack ref, delivery id, consume verdict ref, downstream command ref or quarantine ref

## Scenariofamiljer som hela systemet måste tacka

- signed outbound request
- valid signed webhook
- invalid signature
- duplicate same payload
- duplicate changed payload
- unknown schema version
- unknown event type
- replay attack outside allowed window
- missing required idempotency key
- mTLS identity mismatch
- async ack without downstream consume
- deprecated schema downgrade attempt

## Scenarioregler per familj

- valid inbound signed webhook får routas
- invalid signature ska blockeras hard
- duplicate same payload ska vara no-op eller idempotent confirmation
- changed payload under same delivery id ska blockeras hard
- unknown event type ska aldrig auto-routas till business command
- replay outside allowed window ska blockeras före parse-to-command
- kontraktskravd idempotency key ska blockera om den saknas
- mTLS identity mismatch ska blockeras hard även om payloadsignatur ser giltig ut
- async ack får endast skapa transportevidence och får aldrig markeras som business success

## Blockerande valideringar

- missing contract version
- missing schema version
- missing signature where required
- invalid signature
- stale replay window
- duplicate with different payload digest
- route attempts directly to business state without command path
- missing contract-required idempotency key
- mTLS identity mismatch
- schema downgrade without explicit compatibility policy
- transport ack without låter business verdict in flows där consumption verdict är obligatorisk

## Rapport- och exportkonsekvenser

- all webhook and partner traffic must yield immutable evidence artifacts
- delivery status and verification verdict must be visible in ops/support views

## Förbjudna förenklingar

- unsigned production webhooks where signed contract is required
- direct webhook to ledger mutation
- implicit schema migration on receive
- dropping original payload after parse
- treating mTLS alone as enough när kontraktet ocksa kraver message signature
- treating transport-level `200 OK` som business consumption receipt

## Fler bindande proof-ledger-regler för specialfall

- `API-P0009` async ack without låter business confirmation does not equal consumed
- `API-P0010` mutual TLS-only contract still requires immutable delivery evidence
- `API-P0011` rotated key id accepted only if trust store says so
- `API-P0012` missing required idempotency key blocks before business routing
- `API-P0013` deprecated schema version may only pass via explicit compatibility verdict and evidence
- `API-P0014` mTLS identity mismatch creates quarantine receipt, never business command

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `API-P0001-P0011` create transport, verification and routing evidence only
- any business effect happens only in downstream canonical command paths

## Bindande verifikations-, serie- och exportregler

- partner contracts own no accounting series
- partner delivery ids and request ids are transport references, not ledger identity

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- inbound vs outbound
- signed vs mutually authenticated
- first vs duplicate
- same vs changed digest
- sync ack vs async receipt
- inside vs outside replay window
- key rotation overlap vs stale trust material
- required vs absent idempotency key

## Bindande fixture-klasser för partner API, webhooks och adapterkontrakt

- `API-FXT-001` signed outbound request
- `API-FXT-002` valid signed webhook
- `API-FXT-003` invalid signature
- `API-FXT-004` duplicate same digest
- `API-FXT-005` duplicate changed digest
- `API-FXT-006` unknown event or schema
- `API-FXT-007` replay-window violation
- `API-FXT-008` missing idempotency key
- `API-FXT-009` mTLS identity mismatch
- `API-FXT-010` async ack without business consume

## Bindande expected outcome-format per scenario

Varje scenario ska minst ange:
- scenario id
- fixture class
- contract version
- expected verification verdict
- expected routing verdict
- expected evidence artifacts

## Bindande canonical verifikationsseriepolicy

- transport contracts own no accounting series
- business identity comes from downstream canonical domains only

## Bindande expected outcome per central scenariofamilj

- `API-A001`: sent only after signing and contract validation
- `API-B001`: routed only after signature verification
- `API-B003`: blocked on changed payload duplicate
- `API-B005`: blocked before business routing on replay-window violation
- `API-B007`: blocked and quarantined on mTLS identity mismatch
- `API-B008`: transport evidence only, not business consumed

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `API-A001` -> `API-P0001,P0002` -> outbound sent
- `API-B001` -> `API-P0003,P0004,P0008` -> inbound routed
- `API-B002` -> `API-P0005` -> duplicate no-op
- `API-B003` -> `API-P0006` -> blocked changed payload
- `API-B004` -> `API-P0007` -> unknown event review/block

## Bindande testkrav

- signature verification test
- replay-window test
- duplicate same digest idempotency test
- duplicate changed digest blocker test
- command-path-only routing test
- schema-version mismatch test

## Källor som styr dokumentet

- IETF: [RFC 9421 HTTP Message Signatures](https://www.rfc-editor.org/rfc/rfc9421.html)
- OpenID Foundation: [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-18.html)
