> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# PAYROLL_GARNISHMENT_AND_KRONOFOGDEN_SPEC

Status: Bindande specifikation för löneutmätning och Kronofogden-flöde.

Detta dokument definierar en separat payroll-motor för löneutmätning. Source of truth är Kronofogdens beslut. Ingen fri intern tolkning får ersätta beslutssnapshoten.

## 1. Syfte och icke-förhandlingsbara regler

1. Löneutmätning ska beräknas efter preliminär skatt, inte före.
2. Source of truth är ett versionerat `GarnishmentDecisionSnapshot` från Kronofogden.
3. Skyddat belopp/förbehållsbelopp ska bestå av:
   - normalbelopp enligt årsspecifikt rulepack
   - boendekostnad
   - särskilt godkända tillägg enligt beslut eller dokumenterat regelstöd
4. Löneutmätning får aldrig döljas inne i allmän nettolöneavdragslogik.
5. Varje remittering till Kronofogden ska kunna spåras från beslut -> payslip -> liability -> payment order -> banksettlement -> evidence.
6. Ändrat beslut får endast påverka framtida eller explicit omräknade perioder; historik skrivs aldrig över.
7. Bonus, semesterersättning, retroaktiv lön och engångsutbetalningar ska behandlas enligt aktivt beslut; systemet får inte anta att allt följer vanlig månadslön.
8. Om beslut saknas eller är otydligt får systemet inte gissa; lönespecifik review krävs.

## 2. Objektmodell

### 2.1 GarnishmentDecisionSnapshot

Fält:
- `garnishment_decision_id`
- `employee_id`
- `employer_org_no`
- `decision_reference`
- `decision_version`
- `effective_from`
- `effective_to`
- `decision_status`
- `decision_source`
- `decision_received_at`
- `protected_amount_rulepack_version`
- `adult_household_type`
- `child_count_by_age_bucket`
- `housing_cost_amount`
- `special_allowance_amount`
- `special_allowance_reason`
- `reference_number_for_payment`
- `notes_structured`
- `source_document_ref`
- `payload_hash`

### 2.2 ProtectedAmountSnapshot

Fält:
- `protected_amount_snapshot_id`
- `garnishment_decision_id`
- `period_code`
- `normal_amount_adults`
- `normal_amount_children`
- `housing_cost_amount`
- `commuting_or_work_cost_amount`
- `childcare_amount`
- `special_allowance_amount`
- `total_protected_amount`
- `rulepack_code`
- `rulepack_version`

### 2.3 GarnishmentDeductionResult

Fält:
- `garnishment_deduction_result_id`
- `pay_run_id`
- `employee_id`
- `garnishment_decision_id`
- `protected_amount_snapshot_id`
- `net_pay_before_garnishment`
- `seizable_net_amount`
- `protected_amount`
- `deduction_amount`
- `carry_forward_amount`
- `decision_treatment_code`
- `calculation_fingerprint`
- `status`

### 2.4 GarnishmentRemittanceBatch

Fält:
- `garnishment_remittance_batch_id`
- `period_code`
- `decision_reference`
- `reference_number_for_payment`
- `total_remittance_amount`
- `status`
- `payment_order_id`
- `bank_settlement_ref`
- `reported_to_kronofogden_at`
- `evidence_pack_ref`

### 2.5 GarnishmentCorrectionCase

Fält:
- `garnishment_correction_case_id`
- `employee_id`
- `original_result_id`
- `correction_reason_code`
- `decision_version_used`
- `status`
- `impact_amount`
- `approval_ref`

### 2.6 EmployerReportingMessage

Fält:
- `employer_reporting_message_id`
- `decision_reference`
- `message_type`
- `period_code`
- `content_structured`
- `status`
- `submission_ref`
- `receipt_ref`

## 3. Source of truth

- Kronofogdens beslut: source of truth för att utmätning finns, från när den gäller, referensnummer och eventuella särskilda villkor.
- `ProtectedAmountSnapshot`: systemets beräknade och låsta periodtolkning av beslut + årsspecifikt normalbelopp.
- Payroll: source of truth för nettolön före utmätning och faktiskt draget belopp på lönekörningen.
- Banking: source of truth för att remittering faktiskt betalats.
- Integrations: source of truth för tekniska receipts för e-tjänstmeddelanden när sådana används.

## 4. Tillståndsmaskiner

### 4.1 GarnishmentDecisionSnapshot
`received -> validated -> active -> superseded | paused | expired | revoked`

### 4.2 GarnishmentDeductionResult
`draft -> calculated -> approved -> posted -> remitted -> corrected | waived`

### 4.3 GarnishmentRemittanceBatch
`draft -> ready_for_payment -> submitted -> technically_acknowledged -> settled | failed | cancelled`

### 4.4 GarnishmentCorrectionCase
`open -> in_review -> approved -> executed | rejected -> closed`

### 4.5 EmployerReportingMessage
`draft -> submitted -> technically_acknowledged -> closed | failed`

## 5. Commands

- `ingest_garnishment_decision`
- `validate_garnishment_decision`
- `activate_garnishment_decision`
- `pause_garnishment_decision`
- `supersede_garnishment_decision`
- `materialize_protected_amount_snapshot`
- `calculate_garnishment_for_pay_run`
- `approve_garnishment_override`
- `create_garnishment_remittance_batch`
- `submit_garnishment_payment_order`
- `record_garnishment_bank_settlement`
- `open_garnishment_correction_case`
- `submit_employer_reporting_message`
- `close_garnishment_case`

## 6. Events

- `garnishment.decision.received`
- `garnishment.decision.validated`
- `garnishment.decision.activated`
- `garnishment.decision.superseded`
- `garnishment.protected_amount.materialized`
- `garnishment.calculated`
- `garnishment.review_required`
- `garnishment.posted`
- `garnishment.remittance.created`
- `garnishment.remittance.submitted`
- `garnishment.remittance.settled`
- `garnishment.correction.opened`
- `garnishment.correction.executed`
- `garnishment.reporting.submitted`

## 7. Beräkningslogik

### 7.1 Beräkningsordning

1. lås aktivt `GarnishmentDecisionSnapshot` på betalningsdatum
2. materialisera `ProtectedAmountSnapshot` för löneperioden
3. beräkna ordinarie payroll inkl preliminär skatt utan utmätningsdrag
4. identifiera nettobelopp som är utmätningsbart enligt beslutets treatment code
5. exkludera icke utmätningsbara ersättningar om beslut eller rulepack kräver det
6. jämför utmätningsbart nettobelopp med total protected amount
7. `deduction_amount = max(0, seizable_net_amount - protected_amount)`
8. avrunda enligt payroll rounding policy
9. skapa `GarnishmentDeductionResult`
10. skapa payroll liability till Kronofogden
11. minska utbetald nettolön med exakt `deduction_amount`

### 7.2 Protected amount logic

`ProtectedAmountSnapshot.total_protected_amount` ska bestå av:
- vuxenkomponent från årligt Kronofogden-rulepack
- barnkomponenter från årligt Kronofogden-rulepack
- faktisk godkänd boendekostnad
- arbetsresor, barnomsorg och andra tillägg när beslut eller dokumenterat underlag kräver det
- eventuellt särskilt tillägg från beslut

Årsversionerade normalbelopp ska lagras i `SE-KFM-PROTECTED-AMOUNT`. För 2026 ska rulepacket innehålla:
- ensamstående vuxen: 6 243 kronor
- sammanlevande makar/sambor tillsammans: 10 314 kronor
- barn 0–6 år: 3 336 kronor
- barn 7–10 år: 4 004 kronor
- barn 11–14 år: 4 672 kronor
- barn 15 år eller äldre: 5 339 kronor

### 7.3 Bonus, semesterersättning och engångsbelopp

- särskilt treatment code i beslutet ska styra om hela eller del av engångsutbetalning är utmätningsbar
- om beslutet inte särskilt undantar bonus eller semesterersättning ska dessa ingå i utmätningsbar nettolön
- systemet måste kunna köra separat `GarnishmentDeductionResult` för extraordinär utbetalning och länka den till samma beslutsversion

### 7.4 Retroaktiv lön

- retroaktiv lön ska följa aktivt beslut på faktisk utbetalningsdag
- om retro korrigerar tidigare period ska payroll correction chain visa skillnaden mellan tidigare draget belopp och nytt draget belopp
- negativ retro som minskar tidigare seizable net ska öppna correction case; systemet får inte automatiskt återbetala utan beslut eller definierad policy

### 7.5 Paus, release och avslut

- `paused` stoppar nya deductions men ändrar inte historik
- `revoked` eller `expired` stoppar framtida deductions
- varje state change kräver nytt decision snapshot eller formellt avslutsmeddelande

## 8. Ledger och payroll integration

### 8.1 Payroll pay lines

Payrun ska skapa separat lönerad:
- `line_type = garnishment_deduction`
- `beneficiary_type = kronofogden`
- `source_decision_ref = garnishment_decision_id`

### 8.2 Posting intents

Signal: `garnishment.calculated_and_payroll_posted`

Bokning:
- credit skuld till Kronofogden
- debit nettolöneskuld-clearing eller motsvarande payroll settlement account enligt posting recipe

### 8.3 Payment and settlement

Signal: `garnishment.remittance.settled`

Bokning:
- debit skuld till Kronofogden
- credit bankkonto

## 9. Arbetsgivarens rapporteringsskyldighet

Systemet ska stödja strukturerade employer reporting messages när:
- anställningen upphör
- lön uteblir eller blir väsentligt lägre än väntat
- extra ersättning utbetalas
- fel referens eller betalning måste rättas
- annan person eller annat beslut än referens behöver identifieras

Varje meddelande ska bära:
- decision reference
- employee identifier
- period
- deviation code
- belopp
- fri text endast som tillägg, inte som primär struktur

## 10. API och runtime

### 10.1 API-rutter

- `POST /v1/payroll/garnishments/decisions`
- `GET /v1/payroll/garnishments/decisions/:id`
- `POST /v1/payroll/garnishments/decisions/:id/activate`
- `POST /v1/payroll/garnishments/decisions/:id/pause`
- `POST /v1/payroll/garnishments/decisions/:id/supersede`
- `POST /v1/payroll/garnishments/calculations`
- `GET /v1/payroll/garnishments/results`
- `POST /v1/payroll/garnishments/remittance-batches`
- `POST /v1/payroll/garnishments/remittance-batches/:id/submit`
- `POST /v1/payroll/garnishments/corrections`
- `POST /v1/payroll/garnishments/reporting-messages`
- `GET /v1/payroll/garnishments/object-profiles/:employee_id`

### 10.2 Job types

- `garnishment-decision-parse`
- `garnishment-protected-amount-materialize`
- `garnishment-remittance-submit`
- `garnishment-reporting-submit`
- `garnishment-replay`

### 10.3 Idempotens

- ingest använder dokumentfingerprint och decision reference
- calculation använder `pay_run_id + decision_version`
- remittance submit använder `remittance_batch_id + payload_hash`

## 11. Reviewgränser

Review krävs när:
- decision document inte kan parseras strukturerat
- protected amount skulle bli negativt eller orimligt
- boendekostnad saknas eller är oförenlig med beslut
- bonus/engångsbelopp kräver manuell tolkning
- retroaktiv rättning minskar tidigare remitterat belopp
- write-capable replay behövs

## 12. Edge cases

- flera samtidiga beslut för samma person
- flera employments inom samma tenant
- byte av employer org number
- sjuklön eller nollutbetalning i period
- negativ nettolön
- delmånad med start eller avslut av beslut
- felaktigt referensnummer vid betalning
- semesterersättning efter avslutad anställning
- konkurs- eller lönegarantiliknande utbetalning som inte följer vanlig månadslön
- återbetalning efter felaktig remittering

## 13. Golden scenarios och testfall

- nytt beslut med normal månadslön
- beslut för gift/sambohushåll med två barn
- beslut med särskilt tillägg för arbetsresor
- bonusmånad
- semesterersättning
- retroaktiv rättelse uppåt
- retroaktiv rättelse nedåt
- pausat beslut
- nytt beslut som ersätter gammalt mitt i året
- nollutbetalning
- två samtidiga employments inom samma period
- banksettlement misslyckas efter posted payroll
- employer reporting message efter avslutad anställning

## 14. Exit gate

Dokumentet är uppfyllt först när:
- löneutmätning har egen objektmodell och motor
- protected amount rulepack är year-versioned
- remittering och settlement är separata steg
- correction chains fungerar utan overwrite
- employer reporting messages är strukturerade
- golden scenarios är gröna
- payroll, ledger, banking och backoffice kan spåra varje belopp från beslut till betalning

