> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# ADR-0012 — Observability, secrets and environment strategy

Status: Accepted  
Date: 2026-03-21

## Context

- Produkten ska köra i flera miljöer och hantera känslig ekonomisk data, dokument, identitetsflöden och externa adapterintegrationer.
- Det krävs ett sammanhållet beslut om metrics, logs, traces, felrapportering, feature flags, secrets och certifikat för att undvika driftglapp.

## Decision

- Applikationer instrumenteras med OpenTelemetry och skickar metrics, logs och traces till Grafana Cloud som primärt driftobservability-lager.
- Sentry används för applikationsfel, exceptions, release health och användarnära felspårning.
- PostHog EU används för produktanalys och feature flags. Feature flags måste ha ägare, syfte och utgångsdatum.
- Maskinhemligheter lagras i AWS Secrets Manager med KMS-kryptering. Inga hemligheter får lagras i repo eller i statiska miljöfiler i produktion.
- Publika TLS-certifikat på AWS-tjänster hanteras via ACM. Edge/TLS på Cloudflare hanteras i Cloudflare. Leverantörsspecifika signerings- eller mutual-TLS-hemligheter lagras krypterat i Secrets Manager med tydliga rotationsrutiner.
- Miljöseparation är minst dev, staging och prod med separata databaser, buckets, köer, webhooks och tredjepartskredentialer. Där budget och riskbild tillåter ska prod ligga i separat AWS-konto.
- Loggar får inte innehålla fullständiga personnummer, bankuppgifter, autentiseringstokens eller råa dokumentpayloads. Redigering ska ske vid källan, inte först i observability-lagret.
- Trace-policy för högriskflöden är korrelations-id hela vägen från extern adapter till ledgerposting, men utan att läcka hemligheter eller full PII.

## Why

- Grafana Cloud passar byggplanens driftmönster och samlar metrics, logs och traces i samma operativa vy.
- Sentry kompletterar genom att vara bättre på exception- och release-fokuserad felsökning.
- AWS Secrets Manager och KMS passar den valda AWS-plattformen och förenklar minst-behörighet samt rotation.
- Tydlig feature-flag-policy minskar risken att temporära flags blir permanenta och svåra att revidera.

## Consequences

- All utveckling måste följa loggredigeringsregler och använda centrala helper-funktioner för strukturerad loggning.
- Nya integrationer måste få egen secret namespace, egen telemetry-tagging och egen alertingprofil.
- Prod-separation kräver mer kontohantering men minskar blast radius vid fel.
- Support och drift får bättre spårbarhet men också större krav på disciplin kring loggning och persondata.

## Out of scope

- Godtyckliga print-loggar i produktion utan struktur.
- Samma tredjepartskredential i flera miljöer.

## Exit gate

- [ ] alla kritiska flöden har metrics, logs, traces och Sentry-rapportering
- [ ] secrets och certifikat har tydlig ägare, naming och rotation
- [ ] dev, staging och prod är tydligt separerade i data och credentials
- [ ] feature flags har policy, ägare och borttagningsdatum

