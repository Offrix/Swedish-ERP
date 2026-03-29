# Governance Supersession

## Syfte

Denna runbook styr hur historiska styrdokument nedgraderas när nya bindande dokument publiceras.

## Bindande sanning

Från och med denna supersession är endast följande dokument bindande före UI:

- `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md`
- `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`

## Historiska dokument

Följande dokument är historiska input och får inte användas som acceptansbevis:

- `docs/implementation-control/GO_LIVE_ROADMAP.md`
- `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`
- äldre master-control-, implementation-control-, ADR-, runbook- och analysdokument som fortfarande pekar bakåt

Historiska `[x]`-markeringar är uttryckligen icke-bindande.

## Operativa regler

1. Repo-root och release notes får bara peka på finaldokumenten som current.
2. Historiska dokument måste bära tydlig statusnotis om att de inte är primär sanning.
3. Nya byggbeslut måste placeras i final-roadmapen och implementationsbiblioteket, inte i äldre roadmap/bible.
4. Om ett äldre dokument innehåller korrekt bakgrund får det bara användas som stödunderlag när det inte krockar med finaldokumenten.
5. Inga historiska `[x]` får användas som leveransbevis, go-live-bevis eller parity-/advantage-bevis.
6. Det som fortfarande är rätt i tidigare styrning måste bevaras uttryckligen via `docs/implementation-control/GOVERNANCE_CARRY_FORWARD_MATRIX.md`, inte via fortsatt beroende på gamla acceptansmarkeringar.

## Evidence

Supersession ska alltid kunna bevisas med:

- commit som introducerar finaldokumenten
- commit som nedgraderar gamla roadmap/bible
- commit som låser carry-forward-matrisen
- repo-root-referenser som pekar på finaldokumenten
- komplett blocker-traceability i fas 0.3

## Kontrollista

- README pekar på finaldokumenten
- README pekar även på carry-forward-matrisen
- gamla roadmap/bible har explicit historisk statusnotis
- carry-forward-matrisen finns och täcker generell plattform, finance/payroll före projects, trial/live, provider baselines och operator-first support
- historiska statusnotiser i docs pekar på finaldokumenten
- inga release-noter eller root-dokument pekar ut gamla roadmap/bible som bindande
