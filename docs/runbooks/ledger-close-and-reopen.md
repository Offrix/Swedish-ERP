> Statusnotis: Detta dokument Ã¤r inte primÃ¤r sanning. Bindande styrning fÃ¶re UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument Ã¤r operativt stÃ¶ddokument och fÃ¥r inte Ã¶verstyra dem.

# Ledger close and reopen

## Syfte

Verifiera och driva close, reopen, correction replacement och Ã¥terlÃ¥sning utan att mutera bokfÃ¶ringshistorik tyst.

## NÃ¤r den anvÃ¤nds

- efter implementation eller Ã¤ndring av fas 8.5
- vid regressionskontroll efter Ã¤ndringar i ledger, close eller route-kontrakt
- vid operativ hantering av en Ã¥terÃ¶ppnad period i test, pilot eller produktion

## FÃ¶rkrav

- repo Ã¤r bootstrapat
- ledger-katalog och periodsstruktur finns fÃ¶r bolaget
- berÃ¶rd close checklist Ã¤r signerad eller stÃ¤ngd
- senior finance-approver finns tillgÃ¤nglig fÃ¶r dual control

## Steg fÃ¶r steg

1. KÃ¶r `node scripts/lint.mjs`.
2. KÃ¶r `node scripts/typecheck.mjs`.
3. KÃ¶r `node scripts/build.mjs`.
4. KÃ¶r `node scripts/run-tests.mjs all`.
5. KÃ¶r `node scripts/security-scan.mjs`.
6. KÃ¶r `node --test tests/unit/core-phase11-3.test.mjs`.
7. KÃ¶r `node --test tests/integration/phase11-close-api.test.mjs`.
8. KÃ¶r `node --test tests/integration/api-route-metadata.test.mjs`.
9. Identifiera berÃ¶rd close checklist och period.
10. Skapa reopen-begÃ¤ran med strukturerad `impactAnalysis`:
    - `affectedAreaCodes`
    - `impactSummary`
    - `requiresCorrectionReplacement`
    - `correctionPlanSummary` dÃ¤r relevant
    - `relockTargetStatus`
    - `affectedObjectRefs`
11. SÃ¤kerstÃ¤ll att approver Ã¤r annan anvÃ¤ndare med senior finance-roll.
12. KÃ¶r close adjustment via:
    - `reversal` fÃ¶r full omkastning
    - `correction_replacement` fÃ¶r reversal plus replacement-journal
13. Verifiera att nya journaler bÃ¤r:
    - `closeReopenRequestId`
    - `closeAdjustmentType`
    - correction/reversal metadata
14. Kontrollera att reopen request nu har lÃ¤nkade adjustments.
15. KÃ¶r relock pÃ¥ reopen request nÃ¤r alla adjustments Ã¤r postade.
16. Verifiera att perioden Ã¤r `soft_locked` igen.
17. FortsÃ¤tt dÃ¤refter vanlig close-signoff pÃ¥ successor checklist om perioden ska hard-close igen.

## Verifiering

- reopen krÃ¤ver strukturerad impact analysis
- dual control krÃ¤vs fÃ¶r reopen, adjustment och relock
- close adjustment fÃ¥r bara rikta sig mot journaler inom den Ã¥terÃ¶ppnade close-periodens fÃ¶nster
- `correction_replacement` skapar bÃ¥de reversal och replacement-journal
- reopen request gÃ¥r frÃ¥n `executed` till `relocked`
- successor checklist fÃ¥r `closeState = subledger_locked` efter relock
- root metadata visar:
  - `/v1/close/reopen-requests/:reopenRequestId/adjustments`
  - `/v1/close/reopen-requests/:reopenRequestId/relock`
  - `/v1/close/adjustments`

## Vanliga fel

- `reopen_impact_analysis_required`: begÃ¤ran saknar strukturerad impact analysis
- `reopen_affected_areas_required`: inga affected areas angivna
- `reopen_correction_plan_required`: correction replacement krÃ¤vs men plan saknas
- `close_adjustment_period_mismatch`: journalen ligger utanfÃ¶r Ã¥terÃ¶ppnat close-fÃ¶nster
- `close_adjustment_lines_required`: replacement-linjer saknas
- `close_relock_adjustment_required`: relock fÃ¶rsÃ¶ks utan nÃ¶dvÃ¤ndig adjustment
- `dual_control_required`: requester och approver Ã¤r samma anvÃ¤ndare
- `senior_finance_role_required`: approver har inte senior finance-roll

## Ã…terstÃ¤llning

- rulla inte tillbaka historik manuellt
- om fel reopen request skapats: skapa ny correction/reopen-kedja och dokumentera varfÃ¶r
- om fel adjustment postats: anvÃ¤nd ny reversal/correction replacement, inte datamutation

## Rollback

- rulla tillbaka kodcommit om regressionen ligger i runtime
- rulla inte tillbaka postade journaler eller signerad historik i data; anvÃ¤nd alltid correction objects

## Ansvarig

- huvudagenten som levererar fas 8.5
- finance close owner vid operativ anvÃ¤ndning

## Exit gate

- riktade 8.5-sviter grÃ¶na
- fullsvit grÃ¶n
- reopen, adjustment och relock bevisade i bÃ¥de domÃ¤n- och API-flÃ¶de
- runbooken kan anvÃ¤ndas utan muntliga antaganden
