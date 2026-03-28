# Payroll Trial Guards Verification

## Mål

Verifiera att payroll i `trial`-läge kan köra hela kedjan utan legal effect och utan live bank rails.

## Steg

1. Starta plattformen i `trial` runtime mode.
2. Skapa eller återanvänd ett bolag med payroll aktiverat.
3. Kör en pay run för minst en anställd utan krav på live bankkonto.
4. Verifiera att pay run och payslip bär:
   - `executionBoundary.modeCode = trial`
   - `watermark.watermarkCode = TRIAL`
   - `bankPaymentPreview.bankRailMode = trial_non_live`
5. Godkänn lönekörningen och skapa AGI-submission.
6. Verifiera att submit med `mode=live` blockeras med `agi_submission_live_mode_blocked`.
7. Submit utan live mode och verifiera:
   - `submissionMode = trial`
   - receipt code `trial:*`
   - `payloadJson.legalEffect = false`
   - evidence bundle skapad
8. Skapa payroll posting och payout batch.
9. Verifiera att payout-batch:
   - använder `bankRailMode = trial_non_live`
   - har `TRIAL-` i filnamn
   - bär syntetiska payout targets
   - har evidence bundle
10. Försök matcha batchen mot live-lik bankhändelse och verifiera block med `trial_bank_event_non_live_required`.
11. Matcha mot `trial:`-prefixed bank event och verifiera att batchen blir `matched`.

## Exit gate

- Trial payroll producerar inga live receipts.
- Trial payroll producerar inga live bank rails.
- Trial payroll bär watermark på payslip och evidence.
- Trial payroll blockerar live-lika bank match events.
- Full pay-run till AGI till payout-batch fungerar i trial utan legal effect.
