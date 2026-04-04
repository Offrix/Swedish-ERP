# DOMAIN_14_ANALYSIS

## Scope

Domän 14 täcker den verkliga integrationskärnan för:
- integrations control plane, connection profiles, credential metadata, secret refs och consent grants
- provider capability manifests, mode matrix, receipt mode och provider baseline refs
- public API, partner API, OAuth client-credentials, compatibility baselines och sandbox catalogs
- inbound callbacks, outbound webhook deliveries, signature metadata och replay windows
- partner operations, contract tests, adapter dispatch, health checks, enablement och staleness
- async jobs, dead letters, replay plans, replay execution och mutation scope
- provider realism, svenska adapterprioriteringar och fake-live-rensning

Verifierad repo-evidens:
- `packages/domain-integrations/src/control-plane.mjs`
- `packages/domain-integrations/src/partners.mjs`
- `packages/domain-integrations/src/public-api.mjs`
- `packages/domain-integrations/src/providers/provider-runtime-helpers.mjs`
- `packages/domain-integrations/src/providers/*.mjs`
- `packages/rule-engine/src/index.mjs`
- `apps/api/src/route-contracts.mjs`
- `apps/api/src/server.mjs`
- `packages/db/migrations/20260322160000_phase13_public_api_webhooks.sql`
- `packages/db/migrations/20260322170000_phase13_partner_integrations.sql`
- `tests/unit/phase13-partners.test.mjs`
- `tests/unit/phase13-public-api.test.mjs`
- `tests/unit/phase16-integration-core.test.mjs`
- `tests/unit/phase16-public-api-catalog.test.mjs`
- `tests/unit/phase16-partner-api-hardening.test.mjs`
- `tests/integration/phase13-partner-integrations-api.test.mjs`
- `tests/integration/phase13-public-api-api.test.mjs`
- `tests/integration/phase16-integration-core-api.test.mjs`
- `tests/integration/phase16-partner-api-hardening-api.test.mjs`
- `tests/integration/phase16-provider-wave1-api.test.mjs`

Officiella källor låsta för domänen:
- [RFC 6749 OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)
- [OpenPeppol BIS Billing 3.0](https://docs.peppol.eu/poacc/billing/3.0/)
- [Stripe Payment Links API](https://docs.stripe.com/payment-links/api)
- [Postmark API Overview](https://postmarkapp.com/developer/api/overview)
- [Signicat OIDC](https://developer.signicat.com/docs/eid-hub/oidc/)
- [WorkOS SSO](https://workos.com/docs/sso)
- [Fortnox Developer Portal](https://www.fortnox.se/en/developer/developer-portal)
- [Visma Developer](https://developer.visma.com/)
- [Bokio API / integrationer](https://www.bokio.se/hjalp/integrationer/bokio-api/automatisera-bokforingen-i-bokio-med-api-sa-gor-du/)

Domslut:
- Domänen innehåller verkliga kontrollplan- och routespår för integrationsanslutningar, public API, partneroperationer, webhook deliveries och jobb.
- Domänen är ändå inte go-live-klar.
- Total klassning: `partial reality`.
- Kritiska blockerare: control plane är inte ensam source of truth, de flesta providers är stateless fake-live adapters, replay är inte connection-aware, route/surface-modellen driver isär och legacy webhook-/partnermigreringar ligger kvar i vägen.

## Verified Reality

- `verified reality` phase5 provider baseline registry finns som riktig runtime i rule-engine. Proof: `packages/rule-engine/src/index.mjs:348-470`, `1803-1822`.
- `verified reality` `IntegrationConnection` finns som first-class objekt och materialiseras i control plane. Proof: `packages/domain-integrations/src/control-plane.mjs:59-113`, `564-585`.
- `verified reality` credential metadata maskeras i read model. Proof: `packages/domain-integrations/src/control-plane.mjs:587-608`, `tests/unit/phase16-integration-core.test.mjs`.
- `verified reality` cross-mode credential reuse blockeras. Proof: `packages/domain-integrations/src/control-plane.mjs:639-655`, `tests/unit/phase16-integration-core.test.mjs`.
- `verified reality` public API client credentials, token exchange och compatibility-baseline recording finns som riktiga runtimeobjekt. Proof: `packages/domain-integrations/src/public-api.mjs:323-375`, `378-490`.
- `verified reality` outbound webhook deliveries bär signaturmetadata, replay-window och delivery attempts. Proof: `packages/domain-integrations/src/public-api.mjs:569-783`, `1426-1480`.
- `verified reality` production partner dispatch blockerar utan passing contract test på den kodbanan. Proof: `packages/domain-integrations/src/partners.mjs:497-510`, `tests/unit/phase16-partner-api-hardening.test.mjs`.

## Partial Reality

- `partial reality` integrations control plane finns, men partnermodulen äger fortfarande central status- och health-sanning för partnerkopplingar. Proof: `packages/domain-integrations/src/control-plane.mjs:103-125`, `179-214`, `564-585`.
- `partial reality` compatibility baselines kan registreras, men de blockerar inte route/spec drift eller klientkompatibilitet i runtime. Proof: `packages/domain-integrations/src/public-api.mjs:354-375`, `apps/api/src/server.mjs`.
- `partial reality` health checks och enablement finns, men health, enablement, credential expiry, consent expiry och baseline-staleness är inte separata styrande sanningar. Proof: `packages/domain-integrations/src/control-plane.mjs:390-423`, `packages/domain-integrations/src/partners.mjs:1192-1281`.
- `partial reality` sandbox/trial/live-isolering finns i modefält och credential reuse-blocker, men promotion, replay och provider reality gör isoleringen ofullständig. Proof: `packages/domain-integrations/src/control-plane.mjs:67-90`, `639-655`, `packages/domain-integrations/src/providers/provider-runtime-helpers.mjs:56-137`.

## Legacy

- `legacy` partnerstatus backfylls in i control plane i stället för att control plane äger primär sanning. Proof: `packages/domain-integrations/src/control-plane.mjs:564-585`.
- `legacy` webhook secret-migration håller gamla `subscription.secret` och äldre envelope-paths vid liv. Proof: `packages/domain-integrations/src/public-api.mjs:942-1048`.
- `legacy` `20260322160000_phase13_public_api_webhooks.sql` bär gammal modell med `secret TEXT` och tunn delivery-schema. Proof: `packages/db/migrations/20260322160000_phase13_public_api_webhooks.sql`.
- `legacy` `20260322170000_phase13_partner_integrations.sql` bär äldre partner- och async-jobmodell som konkurrerar med senare replay-/ops-kedjor. Proof: `packages/db/migrations/20260322170000_phase13_partner_integrations.sql`.

## Dead Code

- `dead` `dryRun` lever i partneroperationer men styr inte dispatch/runtime på ett säkert sätt och rensas ur read model. Proof: `packages/domain-integrations/src/partners.mjs:491-526`, `1169-1173`.
- `dead` stateless provider snapshots som live-state är inte verkliga adapters. Proof: `packages/domain-integrations/src/providers/provider-runtime-helpers.mjs:334-337`.

## Misleading / False Completeness

- `misleading` providerfilerna ser live-kompatibla ut men nästan alla bygger bara på `createStatelessProvider`. Proof: `packages/domain-integrations/src/providers/*.mjs`, `packages/domain-integrations/src/providers/provider-runtime-helpers.mjs:251-337`.
- `misleading` public API ser versionsatt och kompatibilitetsstyrd ut, men route- och specdrift blockeras inte av compatibility baselines. Proof: `packages/domain-integrations/src/public-api.mjs:323-375`.
- `misleading` webhook security ser stark ut, men gammal secret-path och gammalt SQL-schema ligger kvar parallellt. Proof: `packages/domain-integrations/src/public-api.mjs:955-1048`, `packages/db/migrations/20260322160000_phase13_public_api_webhooks.sql`.
- `misleading` health summary ser enkel och grön/röd ut, men blandar credential validity, outage, receipt lag och capability drift till en tunn indikator. Proof: `packages/domain-integrations/src/partners.mjs:1192-1281`.

## Phase 5 / Baseline Findings

- `high` phase5-governance finns i rule-engine men bypassas på flera integrationsytor. Farligt eftersom providerbundna writes kan ske utan central baseline-pinning. Proof: `packages/rule-engine/src/index.mjs:348-470`, `packages/domain-integrations/src/control-plane.mjs:169`, `398`, `packages/domain-integrations/src/public-api.mjs:354-375`. Riktning: `rewrite`.
- `high` direct integration connections tillåter `providerBaselineRef = null` och health check ger bara warning. Farligt eftersom baseline governance blir rådgivande i stället för blockerande. Proof: `packages/domain-integrations/src/control-plane.mjs:169`, `398`. Riktning: `harden`.

## Control Plane / Credential / Consent Findings

- `critical` control plane är inte ensam source of truth; partnerstatus och health läses tillbaka från `state.partnerConnections`. Farligt eftersom control plane kan bli ett register ovanpå äldre sanning. Proof: `packages/domain-integrations/src/control-plane.mjs:564-585`. Riktning: `replace`.
- `medium` credential masking och reuse-isolation är verkliga styrkor som ska behållas. Proof: `packages/domain-integrations/src/control-plane.mjs:587-655`. Riktning: `keep`.
- `high` consent, expiry, enablement och liveCoverageEligible är metadata i samma connection-materialisering i stället för egen styrd lifecycle. Farligt eftersom enablementbeslut blir för tunna. Proof: `packages/domain-integrations/src/control-plane.mjs:155-170`, `390-423`. Riktning: `rewrite`.

## Public API / OAuth / Compatibility Findings

- `high` public API blandar `/v1/public/*` och `/v1/public-api/*`, vilket skapar route drift mellan läs- och mutationsytor. Farligt eftersom kontrakt, docs och klienter kan frysa mot fel modell. Proof: `apps/api/src/route-contracts.mjs:142`, `252-255`, `apps/api/src/server.mjs:1070-1076`, `19860`. Riktning: `rewrite`.
- `high` compatibility baseline i runtime är bara registrering av `routeHash`/`specHash`, inte blockerande governance. Farligt eftersom drift kan släppas trots inspelade baselines. Proof: `packages/domain-integrations/src/public-api.mjs:354-375`. Riktning: `harden`.
- `medium` public API OAuth ligger nära RFC 6749 client credentials, men rotation/revoke/compatibility måste bindas hårdare till deploy gates. Proof: `packages/domain-integrations/src/public-api.mjs:378-490`. Riktning: `harden`.

## Partner API / Contract Test / Operation Findings

- `high` `ContractTestPack` är katalogmetadata, inte förstaklassigt immutable runtimeobjekt. Farligt eftersom grön contract test kan sakna full pack-truth och versionering. Proof: `packages/domain-integrations/src/partners.mjs:185-220`. Riktning: `rewrite`.
- `medium` production dispatch gate på passing contract test är bra men måste bindas till explicit enablement och freshness. Proof: `packages/domain-integrations/src/partners.mjs:497-510`. Riktning: `harden`.
- `medium` `dryRun` är ett dött spår som inte ska få styra operativ policy. Proof: `packages/domain-integrations/src/partners.mjs:491-526`, `1169-1173`. Riktning: `remove`.

## Inbound Callback / Outbound Webhook Findings

- `high` inbound callback-governance är inte samlad i en enhetlig modell; callbackprofiler ligger fragmenterade över domäner och routeprofiler. Farligt eftersom replay-window, signing och business idempotency kan driva isär. Proof: `apps/api/src/server.mjs:20008-20020`, auth/OCR callback-profiler i edge policy. Riktning: `rewrite`.
- `high` outbound webhook deliveries är mer verkliga än inbound callbacks, men legacy secret-migration gör säkerhetsmodellen dubbel. Farligt eftersom gammal secret-path kan återintroducera osanna eller osäkra flows. Proof: `packages/domain-integrations/src/public-api.mjs:955-1048`. Riktning: `replace`.

## Job / Replay / Dead Letter Findings

- `critical` `executeJobReplay` skapar nytt jobb utan att föra vidare `connectionId`, `connectionType`, `providerCode` och `sourceSurfaceCode`. Farligt eftersom replay inte är connection-aware och kan tappa integrationssanning. Proof: `packages/domain-integrations/src/partners.mjs:969-993`. Riktning: `rewrite`.
- `high` async-jobmodellen är äldre och separerad från senare ops/replaymodeller i repo:t. Farligt eftersom integrationsjobb riskerar att följa en egen replay/dead-letter-sanning. Proof: `packages/db/migrations/20260322170000_phase13_partner_integrations.sql`, `packages/domain-integrations/src/partners.mjs:914-1012`. Riktning: `migrate`.

## Health / Enablement / Staleness Findings

- `high` health summary kollapsar flera olika problem till `healthy`, `degraded` eller `outage`. Farligt eftersom credential expiry, consent expiry, last receipt lag, baseline drift och capability drift inte blir separat styrande. Proof: `packages/domain-integrations/src/partners.mjs:1192-1281`. Riktning: `rewrite`.
- `high` live enablement, health och staleness är inte tre separata lifecycle-objekt. Farligt eftersom grön health kan misstas för live approval. Proof: kombinerad control-plane/partners-analys. Riktning: `rewrite`.

## Provider Reality / Swedish Priority Findings

- `critical` nästan alla providers är stateless deklarationer utan verklig adapterruntime. Farligt eftersom repo:t kan se integrationsrikt ut utan att vara live-kompatibelt. Proof: `packages/domain-integrations/src/providers/*.mjs`, `packages/domain-integrations/src/providers/provider-runtime-helpers.mjs:251-337`. Riktning: `replace`.
- `high` svensk adapterprioritet måste styras mot faktiska marknadsbehov och officiellt dokumenterade ekosystem. Fortnox, Visma, Bokio och Peppol är tydliga svenska integrationsytor i officiella källor. Riktning: `harden`.

## Runbook / Migration / Legacy Purge Findings

- `high` gamla runbooks `fas-13-public-api-verification.md` och `fas-13-partner-integrations-verification.md` översäljer modellen och måste skrivas om eller arkiveras. Riktning: `rewrite`.
- `high` runbooks för inbound callback security, outbound webhook delivery, partner enablement och control-plane governance saknas i sann rebuildform. Riktning: `create`.
- `medium` gamla migrations måste ersättas av ny canonical integrations-schemakedja i stället för att lappas vidare. Riktning: `replace`.

## Runtime Status Matrix

| capability | claimed runtime status | actual runtime status | proof in code/tests | blocker |
| --- | --- | --- | --- | --- |
| phase5 provider baseline registry | first-class | verified reality | `packages/rule-engine/src/index.mjs:348-470` | nej |
| integrations control plane | canonical truth | partial reality | `packages/domain-integrations/src/control-plane.mjs:564-585` | ja |
| credential masking / isolation | first-class | verified reality | `packages/domain-integrations/src/control-plane.mjs:587-655` | nej |
| public API client credentials | real | verified reality | `packages/domain-integrations/src/public-api.mjs:378-490` | nej |
| compatibility baseline | governing | partial reality | `packages/domain-integrations/src/public-api.mjs:354-375` | ja |
| partner contract tests | governing packs | partial reality | `packages/domain-integrations/src/partners.mjs:185-220` | ja |
| outbound webhook delivery | append-only | partial reality with legacy secret path | `packages/domain-integrations/src/public-api.mjs:569-783`, `955-1048` | ja |
| inbound callback security | unified | partial reality / fragmented | `apps/api/src/server.mjs:20008-20020` | ja |
| async replay | safe and connection-aware | false completeness | `packages/domain-integrations/src/partners.mjs:969-993` | ja |
| provider adapters | live-ready | fake-live / stateless | `packages/domain-integrations/src/providers/provider-runtime-helpers.mjs:251-337` | ja |

## Provider Reality Matrix

| provider area | actual runtime mode | proof | blocker |
| --- | --- | --- | --- |
| payment links | mostly stateless manifest + public API catalog | `packages/domain-integrations/src/providers/stripe-payment-links.mjs` | ja |
| sms/email | stateless provider declarations | `packages/domain-integrations/src/providers/twilio-sms.mjs`, `postmark-email.mjs` | ja |
| auth federation / BankID | stateless provider declarations | `packages/domain-integrations/src/providers/signicat-bankid.mjs`, `workos-federation.mjs` | ja |
| Peppol / SKV transport | stateless provider declarations | `packages/domain-integrations/src/providers/pagero-peppol.mjs`, `skatteverket-transport-provider-base.mjs` | ja |
| banking | stateless helper manifest | `packages/domain-integrations/src/providers/enable-banking.mjs` | ja |

## Surface / Route Drift Matrix

| surface | intended model problem | actual runtime path | blocker |
| --- | --- | --- | --- |
| public read contracts | split between `/v1/public/*` and `/v1/public-api/*` | `apps/api/src/server.mjs:1070-1076`, `19860` | ja |
| partner surfaces | `/v1/partners/*` and `/v1/jobs/*` together | `apps/api/src/server.mjs:1077-1095`, `19864` | ja |
| inbound callbacks | fragmented profile families | auth/OCR/public callback route profiles | ja |

## Critical Findings

- control plane måste bli ensam source of truth
- provider reality måste klassificeras och fake-live adapters ersättas
- replay måste bli connection-aware och bära full integrationsidentitet
- legacy webhook secret-migration och gammal SQL-modell måste bort

## High Findings

- baseline governance måste bli blockerande på alla providerbundna writes
- compatibility baselines måste binda release/runtime
- ContractTestPack måste bli first-class immutable runtimeobjekt
- inbound callback security måste centraliseras
- health, enablement och staleness måste separeras
- route drift mellan public/public-api/partner/jobs måste stängas
- runbooks och gamla migrations måste skrivas om eller ersättas

## Medium Findings

- credential masking och reuse isolation ska behållas men bindas till starkare enablement receipts
- `dryRun` ska bort som missvisande policyspår
- svensk adapterprioritet ska styras av officiell marknadsverklighet, inte katalogbredd

## Cross-Domain Blockers

- Domän 1 måste låsa canonical repository och event/replay truth för integrationsjobb.
- Domän 2 måste låsa secrets, MFA, callback protection och export boundaries.
- Domän 5 måste leverera universell baseline/schema governance som även integrationsytor måste följa.
- Domän 16 måste låsa replay, dead letters, incident och support operations för integrationskärnan.

## Go-Live Blockers

- inga adapters får kallas live-ready när de fortfarande är stateless deklarationer
- inga public/partner/webhook/job paths får gå live utan blockerande baseline governance
- replay får inte gå live förrän connection/provider/mode/source surface överlever replaykedjan
- legacy webhook secret paths och äldre SQL-modeller måste bort innan production

## Repo Reality Vs Intended Integrations Model

Repo:t har en verklig integrationsyta, men den är fortfarande ett blandat lager av ny control-plane-logik, äldre partner- och webhookmodeller, stateless providerdeklarationer och ofullständig baseline-/replaygovernance. Domän 14 ska därför behandlas som verkligt råmaterial med flera starka delar, men inte som en godkänd integrationskontrollplan för svensk go-live.
