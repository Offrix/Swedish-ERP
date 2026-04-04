# RELEASE_GATES_OCH_ACCEPTANSKRAV_FOR_BOKFORINGSSIDAN

## Status

Detta dokument är bindande no-go- och acceptansspec för bokföringssidan.

## Byggspec-klar kontra live-klar

Detta dokument skiljer mellan:
- `byggspec_klar`
  - dokumenten är tillräckligt hårda för implementation
- `release_klar`
  - implementationen har passerat blockerande proof och invariants

## Byggspec_klar krav

För att kalla dokumentpaketet byggspec-klar måste allt nedan vara sant:
- detta paket ligger före gamla dokument i precedence
- direkta errata är tillämpade
- bokföringssidan har egen bindande ytspec
- dimensions-/objektstyrning har egen bindande sanning
- locked-reporting och workbench-operations finns
- externa källor styrs via effective-date-regel

## Release_klar krav

För att kalla implementationen release-klar måste allt nedan vara sant:
- scenario catalog finns
- accounting proof ledger finns
- scenario coverage matrix finns
- invariant suite finns
- stress scenario catalog finns
- provider realism och deploy equivalence finns om externa providers är inblandade
- export artifacts är verkliga och digest-bundna
- stale/unknown freshness kan inte ga grönt
- SIE roundtrip passerar blockerande test
- close/reopen passerar blockerande governance- och artifacttester

## Blockerande bevis

Minst följande bevis måste finnas för grön release:
- `ScenarioCatalog`
- `ScenarioCoverageMatrix`
- `AccountingProofLedger`
- `InvariantSuite`
- `StressScenarioCatalog`
- artifact equality proof för locked reporting
- roundtrip equality proof för SIE objects/dimensions
- masking/reveal proof
- permission boundary proof
- deploy equivalence proof för same build artifacts

## No-go gates

Release ska stoppas om nagon av dessa är sann:
- ett scenario kan ge annat konto, annat orel eller annan momsruta an expected outcome
- posted truth kan muteras eller raderas
- locked reporting saknar digest eller snapshot drilldown
- SIE export tappar object list
- search/workbench är shadow database
- stale data kan bli grön
- fake export artifacts finns kvar i runtime
- reopen saknar correction-case och impact analysis
- legal accounting context är optional i bokföringsnara mutationer

## Signoff-kedja

Minst följande signoff måste finnas för release:
- accounting/legal owner
- security owner
- operations owner
- product owner för bokföringssidan
- on-call owner

## Slutlig regel

Inget team får beskriva bokföringssidan som perfekt, fullständigt korrekt eller regulatoriskt saker utan att bade dokument- och runtimekraven i detta dokument är uppfyllda med verifierbar evidence.
