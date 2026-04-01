# Agreement Overlay Verification

## Mål

Verifiera att kollektivavtalsoverlayn är den körbara sanningen för payroll och att statiska pay-item-defaults inte används när overlayn ska styra utfallet.

## Förutsättningar

- En aktiv `AgreementAssignment` för anställningen.
- En publicerad `AgreementVersion` med antingen legacy-regler (`overtimeMultiplier`, `obCategoryA`, `jourUnitRate`, `standbyUnitRate`, `vacationSupplementRate`) eller explicita `rateComponents`.
- Payroll körs i en period där overlayn är giltig.
- Om time-driven linjer ska verifieras måste perioden ha ett godkänt `ApprovedTimeSet`.

## Verifieringskedja

1. Skapa eller publicera en avtalversion med:
   - `OVERTIME`
   - `OB`
   - `JOUR`
   - `STANDBY`
   - `VACATION_SUPPLEMENT`
   - eventuella `pensionAdditions`
2. Kontrollera att `GET /v1/time/employment-base` visar:
   - `agreementOverlayId`
   - `agreementCode`
   - `validFrom`
   - `validTo`
   - `rateComponents.payItemRates`
   - `rateComponents.pensionAdditions`
3. Kör en payroll-preview eller pay run med:
   - approved time entries som innehåller övertid/OB/jour/beredskap
   - minst en vacation supplement-line via leave mapping eller step-4 manual input
4. Bekräfta att payroll-linjerna använder overlayn:
   - `OVERTIME` = overlay-multiplikator på kontrakts- eller härledd timbasis
   - `OB` = overlay-enhetsrate eller overlay-multiplikator
   - `JOUR` = overlay-enhetsrate eller overlay-multiplikator
   - `STANDBY` = overlay-enhetsrate eller overlay-multiplikator
   - `VACATION_SUPPLEMENT` = overlay-procent på angiven bas
5. Kör med en avsiktligt ofullständig overlay och bekräfta:
   - `agreement_overlay_rate_missing`
   - linjen blir `rate_required`
   - ingen statisk pay-item-default används som tyst fallback
6. Om overlayn innehåller `pensionAdditions`, bekräfta att:
   - riktiga `pension_event` skapas med `eventCode = agreement_pension_premium`
   - rätt `payItemCode` materialiseras i payroll
   - `PENSION_SPECIAL_PAYROLL_TAX` räknas på total pensionskostnad inklusive overlay-drivna tillägg
   - `payrollDispatchStatus` uppdateras när pay run godkänns

## Godkända utfall

- Overlayns `rateComponents` finns i time base och används i payroll.
- Time-driven premiums får rätt belopp från overlayn.
- Vacation supplement kan härledas från overlayns procentregel.
- Agreement-driven pension additions blir riktiga pension events och reporting-only pay lines.
- Saknade overlay-komponenter ger varning och `rate_required`, inte tyst fallback.

## Blockerande avvikelser

- Payroll använder kontrakts- eller pay-item-default när overlayn borde vara authoritative.
- `ApprovedTimeSet` saknas för perioden och payroll försöker ändå konsumera approved time som om den vore låst.
- Overlay saknar körbara `rateComponents` men payroll producerar ändå ett skarpt belopp.
- Agreement-driven pensiontillägg hamnar i payroll utan att pensionskedjan får spårbara events eller särskild löneskatt.
