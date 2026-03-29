# Governance Supersession Decision

- Decision ID: `governance-supersession-2026-03-29`
- Effective from: `2026-03-29`
- Status: `active`
- Type: `supersession`

## Bindande dokument

Från och med detta beslut är endast följande dokument bindande styrning före UI:

- `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md`
- `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`

## Dokument som uttryckligen nedgraderas

Följande dokument är historiska input och får inte användas som acceptansbevis:

- `docs/implementation-control/GO_LIVE_ROADMAP.md`
- `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`

## Skäl

- Historiska `[x]`-markeringar i äldre roadmap och bible kan inte behandlas som leveransbevis.
- Finaldokumenten definierar ny fasordning, nya blocker-traces och nya bindande krav för security, migration, SIE4, corporate tax och owner distributions.
- Repo-root och historiska stöddokument måste därför peka på finaldokumenten som enda current guidance.

## Bevarade styrprinciper

Följande delar från tidigare styrning är uttryckligen bevarade och får inte tappas bort bara för att gamla acceptansmarkeringar ogiltigförklaras:

- generell svensk företagsplattform, inte byggcentrerad produktkärna
- finance/payroll före general project core och vertikala packs
- trial/live-separation som eget tekniskt och operativt problem
- rulepack/provider-baseline-tänk med publicering, pinning och rollback
- operator-first support/backoffice
- unified receipts/recovery som bärande driftprincip

Den bindande carry-forward-matrisen finns i `docs/implementation-control/GOVERNANCE_CARRY_FORWARD_MATRIX.md`.

## Evidence refs

- `docs/runbooks/governance-supersession.md`
- `docs/runbooks/go-live-no-go-enforcement.md`
- `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md`
- `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`
- `docs/implementation-control/GOVERNANCE_CARRY_FORWARD_MATRIX.md`
- `docs/implementation-control/GO_LIVE_NO_GO_POLICY.md`
- commit som inför denna fil och supersession-notiserna i repo:t

## No-go effekt

Följande är förbjudet efter detta beslut:

- att behandla gamla `[x]` som acceptansbevis
- att peka repo-root-current guidance mot gamla roadmap/bible
- att markera delfaser klara mot gamla fasstrukturer i stället för final-roadmapen
- att göra live-, parity- eller advantage-claim utan att `docs/implementation-control/GO_LIVE_NO_GO_POLICY.md` är grön för scope
