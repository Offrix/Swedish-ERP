> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# ADR-0019 — Reporting, exports and metric governance strategy

Status: Accepted  
Date: 2026-03-21

## Context

- Officiella rapporter, dashboards och exports måste kunna förklaras och reproduceras.
- Mått ändras över tid och utan styrning riskerar olika ytor att visa olika sanning.
- Excel- och PDF-exporter används som beslutsunderlag och måste kunna härledas till exakt snapshot.

## Decision

- Vi inför central metric catalog med ägare, versionering och giltighetsintervall.
- Rapporter byggs som versionerade definitioner som refererar till metric-versioner.
- Varje rapportkörning skapar ett snapshot som används både för UI och export.
- Exporter körs asynkront och bär content hash, snapshot-id och watermark-läge.
- Ändras underlaget senare ska tidigare export ligga kvar historiskt men kunna markeras som ersatt eller preliminär.

## Alternatives considered

- Ad hoc-frågor per UI-sida avvisades eftersom de inte ger reproducerbarhet.
- Direkta exports från live-data utan snapshot avvisades eftersom samma export då kan ge olika resultat vid omkörning.
- Gemensamma mått utan utsedd ägare avvisades eftersom change management annars blir svag.

## Consequences

- Metric owners och report owners blir formella roller.
- Teststrategin måste täcka reproducerbarhet, drilldown och exportintegritet.
- Watermarking och supersede-regler måste definieras tydligt.

## Verification

- [ ] alla officiella mått har ägare och version
- [ ] rapporter kan reproduceras från snapshots
- [ ] exports bär spårbar metadata och content hash
- [ ] metricändringar påverkar inte historiska snapshots
- [ ] drilldown eller explicit avsaknad av drilldown är definierad

