> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Evidence Bundle Export

Den här runbooken används när operator, support eller verifiering behöver exportera ett immutabelt evidence bundle från systemet.

## Syfte

- bevisa vilka källobjekt, receipts, approvals och artefakter ett utfall byggde på
- kunna lämna ut ett deterministiskt checksum-bundet underlag vid audit, support eller cutover
- skilja bundle-status från källobjektets affärsstatus

## Bundle-typer i fas 3.2

- `annual_reporting_package`
- `regulated_submission`
- `support_case`
- `break_glass`
- `cutover_acceptance`
- `project_workspace`

## Minimikrav

- bundle måste vara `frozen` före export
- `checksum` måste finnas
- source object, source object version och relaterade objekt måste kunna läsas i payloaden
- alla receipts, approvals eller snapshot-referenser som bundletypen kräver måste finnas

## Årsredovisning / annual reporting

1. Hämta package och aktuell version.
2. Bekräfta att current evidence pack finns.
3. Exportera bundle via annual-reporting-evidence-kedjan.
4. Verifiera:
   - `reportSnapshotRefs`
   - `closeSnapshotRefs`
   - `rulepackRefs`
   - `documentChecksums`
   - `checksum`

## Regulated submission

1. Hämta submission.
2. Exportera current submission evidence pack.
3. Verifiera:
   - payload-artifact
   - signature refs
   - receipt refs
   - correction links
   - operator actions
   - eventuell `sourceEvidenceBundleId`
4. Om ny receipt eller ny correction kommit in ska tidigare bundle vara `archived` och ny bundle `frozen`.

## Support case

1. Hämta support case.
2. Exportera support case evidence bundle.
3. Verifiera:
   - requested/approved actions
   - action approvals
   - related object refs
   - admin diagnostic refs
   - resolution data

## Break-glass

1. Hämta break-glass session.
2. Exportera break-glass evidence bundle.
3. Verifiera:
   - incident ref
   - approvals
   - requested actions
   - lifecycle timestamps

## Cutover acceptance

1. Hämta acceptance record.
2. Exportera cutover evidence bundle.
3. Verifiera:
   - accepted variance reports
   - signoff refs
   - source parity summary
   - rollback point ref
   - checksum

## Project workspace

1. Hämta project workspace för relevant cutoff.
2. Exportera project evidence bundle.
3. Verifiera:
   - workspace warning codes
   - compliance strip
   - deviations
   - snapshot refs för budget/cost/WIP/forecast när de finns

## Incidentregler

- export får aldrig ändra affärsdata
- export får skapa ny frozen bundle och arkivera tidigare bundle för samma källobjekt om innehållet ändrats
- archived bundle får inte muteras
- checksum mismatch ska behandlas som incident

