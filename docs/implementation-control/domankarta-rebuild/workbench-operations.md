# workbench-operations

## Syfte

Denna runbook äger workbenchens operativa readiness, rebuild, freshness, masking, reveal, export och incidenthantering.

## Absoluta regler

- workbench är projection, inte source of truth
- workbench måste kunna återskapas deterministiskt från canonical projections
- stale eller unknown freshness måste synas på raden och i ytan
- raw payload får inte lagras som canonical workbench truth
- masking får aldrig kringgas av search, saved views eller export

## Readiness-krav innan ytan är green

Operatorn måste kunna verifiera:
- aktiv `AccountingWorkbenchView` per vyfamilj
- freshness checkpoints per underliggande projection
- retentionklass för workbench-cache
- masking rules och reveal workflow
- exportpolicy för workbench-initierade exports
- incident- och rebuildvag

## Freshness-policy

Varje workbenchvy måste ha:
- `checkpointRef`
- `sourceVersion`
- `observedAt`
- `maxAgeForFresh`
- `maxAgeForLagging`

Freshnessutfall:
- inom `maxAgeForFresh` -> `fresh`
- inom `maxAgeForLagging` men över fresh -> `lagging`
- över `maxAgeForLagging` -> `stale`
- saknad checkpoint -> `blocked_unknown`

## Rebuild

Workbenchen ska kunna rebuildas via:
1. val av vyfamilj och scope
2. validering av canonical source projections
3. rebuild till ny version
4. checkpoint write
5. digest write för rowset
6. publish after validation

Regel:
- rebuild får aldrig bara skriva `rebuild completed`; ny rowsetversion måste materialiseras

## Saved views

- saved view får bara referera till tillåtna filters och sorteringar
- saved view får aldrig spara reveal state
- brutna saved views måste invalideras blockerande, inte bara flaggas i efterhand

## Masking och reveal

- masking måste ske före search snippet, detailpanel och exportpreview
- reveal måste vara tidsbegransad, approverad och vattenstamplad
- reveal måste ge eget receipt med actor, approver, scope och TTL

## Export från workbench

- workbench-exporter måste deklarera om de är `live_export` eller `request_locked_artifact`
- stale workbench får inte skapa legal export
- exporter måste laga receipt och digest

## Incidentklasser

Skapa incident om nagon av dessa intraffar:
- workbench visar `fresh` utan giltig checkpoint
- rad saknar proof binding men är grön
- searchindex levererar raw payload som canonical detail
- masking kringgas via saved view eller export
- rebuild lyckas utan ny rowsetversion

## No-go

Det är förbjudet att kalla workbenchen green om:
- freshness är falsk eller ad hoc
- reveal saknar approval och TTL
- retention mellan workbench-cache och bokföringsmassig truth inte är separerad
- saved views kan leva kvar trots brutna kontrakt
- export saknar digest och receipt
