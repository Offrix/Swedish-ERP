# Go-Live No-Go Enforcement

## Syfte

Denna runbook operationaliserar `docs/implementation-control/GO_LIVE_NO_GO_POLICY.md` och ska användas innan någon:

- markerar en gate som grön för live
- påstår competitor parity
- påstår competitor advantage
- godkänner trial->live promotion
- godkänner live migration/cutover

## Förberedelser

1. Läs aktuella delar av:
   - `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md`
   - `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`
   - `docs/implementation-control/GO_LIVE_NO_GO_POLICY.md`
2. Bekräfta att blockerregister och waiverregister är uppdaterade.
3. Kör fas-0-verifieringen.

## Minsta kontrollsekvens

1. Kontrollera att inga öppna CRITICAL/HIGH blockers finns för scope.
2. Kontrollera att scope inte bygger på seed/stub/simulerad coverage.
3. Kontrollera att secrets, auth factors och protected identifiers inte läcker i vanlig durable state eller snapshots.
4. Kontrollera att alla kräva roadmap-subfaser för scope faktiskt är gröna i aktuell kod, inte bara i historiska dokument.
5. Kontrollera att golden scenarios för scope är gröna.
6. Kontrollera att migrations-/rollback-krav är uppfyllda om scope innehåller migration, promotion eller cutover.
7. Kontrollera att operator path, replay, audit och evidence pack finns där scope kräver det.

## Tillåtna utfall

- `blocked`
- `conditionally_blocked`
- `passed_for_scope`

Om utfallet inte är `passed_for_scope` får scope inte marknadsföras eller användas som live/parity/advantage-bevis.

## Waivers

Waiver får bara användas för tidsbegränsade avvikelser under HIGH.

Waiver måste innehålla:

- scope
- blocker/regelkod
- orsak
- kompensationskontroller
- expiration
- evidence refs
- rollback path
- godkännare: `platform_owner`, `security_admin`, `finance_owner`

## Evidence refs som alltid ska bifogas

- `docs/implementation-control/GOVERNANCE_SUPERSESSION_DECISION.md`
- `docs/implementation-control/BLOCKER_TRACEABILITY_MATRIX_FINAL.md`
- `docs/implementation-control/LIVE_COVERAGE_NO_GO_RULES.md`
- `docs/implementation-control/MANDATORY_CAPABILITY_LOCKS.md`
- `docs/implementation-control/GO_LIVE_NO_GO_POLICY.md`

## Förbjudet

- att använda demo eller seed som live-bevis
- att kalla pilot för live
- att kalla delvis vendor-specifik migration för generell parity
- att kalla manuell operatörsinsats för produktfördel om den inte är first-class runtime
- att skriva över no-go-utfall i release notes eller säljspråk
