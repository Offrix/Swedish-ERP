> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är operativt stöddokument och får inte överstyra dem.

# Ledger close and reopen

## Syfte

Verifiera och driva close, reopen, correction replacement och återlåsning utan att mutera bokföringshistorik tyst.

## När den används

- efter implementation eller ändring av fas 8.5
- vid regressionskontroll efter ändringar i ledger, close eller route-kontrakt
- vid operativ hantering av en återöppnad period i test, pilot eller produktion

## Förkrav

- repo är bootstrapat
- ledger-katalog och periodsstruktur finns för bolaget
- berörd close checklist är signerad eller stängd
- senior finance-approver finns tillgänglig för dual control

## Steg för steg

1. Kör `node scripts/lint.mjs`.
2. Kör `node scripts/typecheck.mjs`.
3. Kör `node scripts/build.mjs`.
4. Kör `node scripts/run-tests.mjs all`.
5. Kör `node scripts/security-scan.mjs`.
6. Kör `node --test tests/unit/core-phase11-3.test.mjs`.
7. Kör `node --test tests/integration/phase11-close-api.test.mjs`.
8. Kör `node --test tests/integration/api-route-metadata.test.mjs`.
9. Identifiera berörd close checklist och period.
10. Skapa reopen-begäran med strukturerad `impactAnalysis`:
    - `affectedAreaCodes`
    - `impactSummary`
    - `requiresCorrectionReplacement`
    - `correctionPlanSummary` där relevant
    - `relockTargetStatus`
    - `affectedObjectRefs`
11. Säkerställ att approver är annan användare med senior finance-roll.
12. Kör close adjustment via:
    - `reversal` för full omkastning
    - `correction_replacement` för reversal plus replacement-journal
13. Verifiera att nya journaler bär:
    - `closeReopenRequestId`
    - `closeAdjustmentType`
    - correction/reversal metadata
14. Kontrollera att reopen request nu har länkade adjustments.
15. Kör relock på reopen request när alla adjustments är postade.
16. Verifiera att perioden är `soft_locked` igen.
17. Fortsätt därefter vanlig close-signoff på successor checklist om perioden ska hard-close igen.

## Verifiering

- reopen kräver strukturerad impact analysis
- dual control krävs för reopen, adjustment och relock
- close adjustment får bara rikta sig mot journaler inom den återöppnade close-periodens fönster
- `correction_replacement` skapar både reversal och replacement-journal
- reopen request går från `executed` till `relocked`
- successor checklist får `closeState = subledger_locked` efter relock
- root metadata visar:
  - `/v1/close/reopen-requests/:reopenRequestId/adjustments`
  - `/v1/close/reopen-requests/:reopenRequestId/relock`
  - `/v1/close/adjustments`

## Vanliga fel

- `reopen_impact_analysis_required`: begäran saknar strukturerad impact analysis
- `reopen_affected_areas_required`: inga affected areas angivna
- `reopen_correction_plan_required`: correction replacement krävs men plan saknas
- `close_adjustment_period_mismatch`: journalen ligger utanför återöppnat close-fönster
- `close_adjustment_lines_required`: replacement-linjer saknas
- `close_relock_adjustment_required`: relock försöks utan nödvändig adjustment
- `dual_control_required`: requester och approver är samma användare
- `senior_finance_role_required`: approver har inte senior finance-roll

## Återställning

- rulla inte tillbaka historik manuellt
- om fel reopen request skapats: skapa ny correction/reopen-kedja och dokumentera varför
- om fel adjustment postats: använd ny reversal/correction replacement, inte datamutation

## Rollback

- rulla tillbaka kodcommit om regressionen ligger i runtime
- rulla inte tillbaka postade journaler eller signerad historik i data; använd alltid correction objects

## Ansvarig

- huvudagenten som levererar fas 8.5
- finance close owner vid operativ användning

## Exit gate

- riktade 8.5-sviter gröna
- fullsvit grön
- reopen, adjustment och relock bevisade i både domän- och API-flöde
- runbooken kan användas utan muntliga antaganden
