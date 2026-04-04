# LÖNEFLÖDET_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för hela löneflödet.

Detta dokument ska styra:
- pay calendars
- payroll periods
- pay runs
- payroll input snapshots
- payroll calculation receipts
- payroll approval och freeze
- payslips
- corrections
- final pay
- posting handoff
- payout readiness handoff
- migration av historiska lönekorningar

Ingen kod, inget test, ingen route, ingen payslipvy, ingen supportyta, ingen runbook och ingen statusmarkering får definiera avvikande truth för löneflödet utan att detta dokument skrivs om först.

## Syfte

Detta dokument finns för att läsaren ska kunna bygga hela löneflödet utan att gissa:
- när en lönekorning får skapas
- när en lönekorning får räknas om
- när en lönekorning blir juridiskt eller bokföringsmassigt bindande
- hur payslip och pay run ska frysa samma sanning
- hur correction och final pay skiljs från vanliga korningar
- hur payroll ska förbli deterministiskt trots HR-, time-, leave-, benefit-, travel- och pensionsberoenden
- hur hela repo:t ska luta sig mot samma pay-run- och payslip-truth

## Omfattning

Detta dokument omfattar:
- ordinarie pay runs
- extra pay runs
- correction pay runs
- final pay
- pay calendars och payout windows
- immutable payroll input snapshots
- payroll line trace
- payroll exceptions
- approval, freeze och issue
- payslip generation och supersession
- posting handoff
- payout readiness handoff
- replay, correction och migration av payroll truth

Detta dokument omfattar inte:
- exakta BAS-lönekonton per löneart, vilket ägs av `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md`
- preliminarskatt, skattetabell, engångsskatt, jämkning, SINK och A-SINK, vilket ägs av kommande skattebiblar
- arbetsgivaravgiftsregler och specialregler, vilket ägs av kommande avgiftsbibel
- förmåner, traktamente, milersättning, pension och lönevaxling, vilket ägs av egna kommande biblar
- sjuklön, karens, semester och semesterskuld i detalj, vilket ägs av egna kommande biblar
- löneutmatning, employee receivable, returned salary payment, payout rails och bankretur, vilket ägs av egna kommande biblar
- AGI-fält och submit-transport, vilket ägs av egna kommande biblar

Kanonisk agarskapsregel:
- detta dokument äger pay run-state, payslip-state, freeze, correction, final pay-case och immutable payroll runtime
- `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md` äger pay item-katalogen, line effect-klasserna och BAS-mappningen
- `PRELIMINARSKATT_OCH_SKATTETABELLER_BINDANDE_SANNING.md` äger tax decision truth
- `ARBETSGIVARAVGIFTER_OCH_SPECIALREGLER_BINDANDE_SANNING.md` äger avgiftsbeslut och avgiftsprofil
- `FORMANER_OCH_FORMANSBESKATTNING_BINDANDE_SANNING.md` äger taxable benefits
- `RESOR_TRAKTAMENTE_OCH_MILERSATTNING_BINDANDE_SANNING.md` äger travel reimbursement och allowance truth
- `PENSION_OCH_LONEVAXLING_BINDANDE_SANNING.md` äger pension premium och salary exchange truth
- `SEMESTER_SEMESTERSKULD_OCH_SEMESTERERSATTNING_BINDANDE_SANNING.md` äger vacation calculation truth
- `SJUKLON_KARENS_OCH_FRANVARO_BINDANDE_SANNING.md` äger sick pay truth
- `NEGATIV_NETTOLON_OCH_EMPLOYEE_RECEIVABLE_BINDANDE_SANNING.md` äger negative-net och employee receivable truth
- `LONEUTBETALNING_OCH_BANKRETURER_BINDANDE_SANNING.md` äger payout rail, bank ack och bankreturtruth
- `AGI_FLODET_BINDANDE_SANNING.md` och `AGI_FALTKARTA_OCH_RATTELSER_BINDANDE_SANNING.md` äger AGI-truth

## Absoluta principer

- exakt en canonical `PayRun` måste finnas per bolag, reporting period, run type och frozen input scope
- ingen lönekorning får fa legal effect utan immutable `PayrollInputSnapshot`, `PayRunFingerprint` och `PayrollCalculationReceipt`
- inga upstream beroenden får lasas live vid payslip-regenerering; payslip måste byggas om från frozen snapshot, inte från nutida HR- eller leave-truth
- `approved` eller senare `PayRun` får aldrig tyst muteras
- correction får aldrig skriva över original run; correction måste skapa ny lineage
- final pay får aldrig vara en los array av adjustments inne i vanlig run-truth
- signed net pay och cash net pay måste alltid exponeras separat
- payroll runtime får aldrig anta att negativ nettolön är lika med nollproblem
- payroll legal effect får aldrig uppsta i UI eller i projections utan command- och receipt-kedja
- trial och live får aldrig dela payout, submit, receipt eller hidden-fallback-truth
- payslip måste vara ett immutable snapshot av issue-time truth, inte en vag vy över nuvarande state
- unsupported payroll scenario får aldrig autoaccepteras som `correction` eller `manual line`

## Bindande dokumenthierarki för löneflödet

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- `DOMAIN_10_ROADMAP.md`
- `DOMAIN_10_IMPLEMENTATION_LIBRARY.md`
- detta dokument

Detta dokument lutar på:
- `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md`
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md`
- `DOMAIN_08_*` för employment, HR, bankkonto, leave och balances truth
- `DOMAIN_09_*` för collective-agreement overlays
- `DOMAIN_12_*` för regulated submission transport
- `DOMAIN_15_*` för reporting projections
- `DOMAIN_16_*` för support, replay, incident och backoffice-boundaries
- `DOMAIN_27_*` för scenario proof

Detta dokument får inte overstyras av:
- gamla phase 8- eller phase 12-payroll docs
- gamla runbooks om payroll core, posting eller AGI
- gamla payslip regeneration paths
- gamla demo seeds
- gamla arrays som `finalPayAdjustments[]`
- gamla statusmarkeringar som att payroll är `klar`

## Kanoniska objekt

- `PayCalendar`
  - bolagsspecifik kalender med cutoff, pay date, reporting period, bank cutoff och AGI period
  - bar inte lönebelopp

- `PayrollInputSnapshot`
  - immutable snapshot av employment, time, leave, balances, agreements, benefits, travel och pension som konsumtionsgrund
  - bar source hashes och upstream refs

- `PayRun`
  - huvudobjekt för en lönekorning
  - bar period, run type, status, summary, lineage och handoff refs

- `PayRunFingerprint`
  - checksum över input snapshot, rulepack versions, line set och freeze context
  - blockerande för calculate, approve, correction och replay

- `PayRunLine`
  - immutable line under en calculated run
  - bar pay item code, quantity, amount, source trace, tax basis flags och downstream anchors

- `PayrollCalculationReceipt`
  - immutable receipt som bevisar vilka rulepacks, inputs, dependencies och calculation decisions som användes

- `PayrollExceptionCase`
  - blockerande eller reviewbar avvikelse i calculation path

- `PayrollApprovalReceipt`
  - immutable approval object med actor, trust level, second reviewer där policy krävs och evidence bundle ref

- `PayslipSnapshot`
  - immutable payslip representation av issue-time truth
  - måste kunna visas och exporteras utan att läsa nutida upstream state

- `PayRunCorrectionCase`
  - lineageobjekt som binder original run till correction run och explicit correction reason

- `FinalPayCase`
  - first-class objekt för slutlon, benefits stop, kvarvarande semester och recovery logic

- `FinalPayFreeze`
  - immutable freeze över termination context, balances, agreements och recoveries för final pay

- `BenefitsStopDecision`
  - explicit stop/start-beslut för benefits som inte får fortsatta efter termination/final pay

- `PayrollPostingHandoff`
  - immutable handoff till posting och lönekontobibeln
  - får inte själv skapa journal truth

- `PayrollPayoutReadinessReceipt`
  - immutable handoff till payout och bankreturbibeln
  - bar cash net, settlement identity och payout blockers

## Kanoniska state machines

### `PayCalendar`

- `draft`
- `published`
- `closed`

Tillåtna övergångar:
- `draft -> published`
- `published -> closed`

Otillåtna övergångar:
- `closed -> published`

### `PayRun`

- `draft`
- `calculated`
- `review_required`
- `approved`
- `posted`
- `payout_prepared`
- `paid`
- `corrected`
- `reversed`
- `cancelled_before_issue`

Tillåtna övergångar:
- `draft -> calculated`
- `calculated -> review_required`
- `calculated -> approved`
- `review_required -> approved`
- `approved -> posted`
- `posted -> payout_prepared`
- `payout_prepared -> paid`
- `posted -> corrected`
- `paid -> corrected`
- `posted -> reversed`
- `draft -> cancelled_before_issue`

Otillåtna övergångar:
- `approved -> calculated`
- `posted -> draft`
- `paid -> approved`

### `PayRunCorrectionCase`

- `draft`
- `review_pending`
- `approved`
- `executed`
- `rejected`
- `cancelled`

### `FinalPayCase`

- `draft`
- `frozen`
- `calculated`
- `review_required`
- `approved`
- `posted`
- `settled`
- `corrected`
- `cancelled`

### `PayslipSnapshot`

- `generated`
- `issued`
- `superseded_by_correction`
- `cancelled_before_issue`

## Kanoniska commands

- `CreatePayCalendar`
- `PublishPayCalendar`
- `CapturePayrollInputSnapshot`
- `CreatePayRun`
- `CalculatePayRun`
- `ResolvePayrollExceptionCase`
- `ApprovePayRun`
- `IssuePayslipSnapshots`
- `PostPayRun`
- `PreparePayrollPayout`
- `CreatePayRunCorrectionCase`
- `ApprovePayRunCorrectionCase`
- `ExecutePayRunCorrectionCase`
- `CreateFinalPayCase`
- `FreezeFinalPayCase`
- `CalculateFinalPayCase`
- `ApproveFinalPayCase`
- `PostFinalPayCase`
- `RegeneratePayslipFromFrozenTruth`
- `ReversePostedPayRun`
- `RegisterHistoricalImportedPayRun`

## Kanoniska events

- `PayCalendarPublished`
- `PayrollInputSnapshotCaptured`
- `PayRunCalculated`
- `PayrollExceptionCaseOpened`
- `PayRunApproved`
- `PayslipSnapshotsIssued`
- `PayRunPosted`
- `PayrollPayoutPrepared`
- `PayRunPaid`
- `PayRunCorrectionCaseApproved`
- `PayRunCorrectionExecuted`
- `FinalPayCaseFrozen`
- `FinalPayCaseApproved`
- `FinalPayCasePosted`
- `PayslipRegeneratedFromFrozenTruth`
- `HistoricalPayRunRegistered`

## Kanoniska route-familjer

- `/v1/payroll/pay-calendars/*`
- `/v1/payroll/pay-runs/*`
- `/v1/payroll/pay-runs/:payRunId/payslips/*`
- `/v1/payroll/final-pay-cases/*`
- `/v1/payroll/input-snapshots/*`
- `/v1/payroll/corrections/*`

Route-familjer som får läsa men inte skriva legal truth:
- reporting projections
- search/workbench projections
- support readonly explain views

Förbjudna route-monster:
- fri patch av posted pay run
- regeneration av payslip från nuvarande upstream data
- generic admin-route som markerar run som `paid`
- UI-direkt mutation av pay lines efter calculate

## Kanoniska permissions och review boundaries

- `payroll.read`
- `payroll.manage`
- `payroll.calculate`
- `payroll.approve`
- `payroll.post`
- `payroll.correct`
- `payroll.final_pay.manage`
- `payroll.final_pay.approve`
- `payroll.payslip.issue`
- `payroll.payslip.regenerate`

Review boundaries:
- `PayRun.approved` krav er minst en finance/payroll-approver
- `PayRunCorrectionCase.approved` krav er review när original run är `posted` eller senare
- `FinalPayCase.approved` krav er separat approval lane
- payslip regeneration efter issue får bara ske via correction lineage eller explicit frozen-truth regenerate receipt
- support/backoffice får aldrig skapa ny pay run-truth i vanlig support lane

## Nummer-, serie-, referens- och identitetsregler

- varje `PayCalendar` måste ha immutable `payCalendarId` och human-readable `payCalendarCode`
- varje `PayRun` måste ha immutable `payRunId`
- varje bolag får ha hogst en ordinarie `regular` run per `reportingPeriod` och `payCalendarId`
- `extra`, `correction` och `final` får bara samexistera med explicit lineage eller separate trigger receipt
- varje `PayRunFingerprint` måste ha checksum, input snapshot ref och rulepack digest
- varje `PayslipSnapshot` måste ha immutable `payslipId`, `payRunId`, `employmentId` och `issueSequenceNo`
- correction måste alltid bara `correctionCaseId`, `correctionOfPayRunId` och `correctionReasonCode`
- final pay måste alltid bara `finalPayCaseId`, `terminationDate` och `finalPayFreezeId`
- samma `employmentId` får inte förekomma dubbelt i samma pay run scope
- regeneration receipts måste alltid peka på original `payslipId`

## Valuta-, avrundnings- och omräkningsregler

- canonical payrollvaluta är `SEK`
- alla legal-effect amounts i löneflödet lagras och beräknas i ore
- quantity för timmar, dagar och procentsatser får lagras med högre precision, men monetary legal effect avrundas till ore
- utlandska receipt-, travel- eller benefitsbelopp måste vara omräknade innan de blir `PayRunLine`
- pay run får aldrig ha blandad utbetalningsvaluta
- payslip måste alltid visa `SEK` som legal payroll currency

## Replay-, correction-, recovery- och cutover-regler

- `CalculatePayRun` måste vara idempotent mot samma `PayrollInputSnapshot` och samma `PayRunFingerprint`
- correction får aldrig mutera original lines; ny run eller ny case måste skapas
- `RegeneratePayslipFromFrozenTruth` får bara läsa frozen `PayRun`, frozen `PayrollInputSnapshot`, frozen line set och frozen decision refs
- imported historical pay runs måste markeras `historical_imported` och får inte utges som ny live-run
- rollback av payroll migration får bara ske via migration receipts; inte genom manuell delete
- om upstream data ändras efter calculate måste gammalt fingerprint bli invalidated och run tillbaka till `draft`
- replay får aldrig skapa nya `PayslipSnapshot` utan ny `issueSequenceNo`
- dead-letter i downstream posting eller payout får aldrig skriva tillbaka ny lönesanning utan correction chain

## Huvudflödet

1. `PayCalendar` publiceras för bolaget.
2. `PayrollInputSnapshot` tas för reporting period och scoped employments.
3. `CreatePayRun` skapar run i `draft`.
4. `CalculatePayRun` bygger lines, line trace, totals, signed net och exception list.
5. `PayRunFingerprint` och `PayrollCalculationReceipt` fryses.
6. Om blockerande exceptions finns gar run till `review_required`.
7. `ApprovePayRun` eller `ApproveFinalPayCase` skapar immutable approval receipt.
8. `IssuePayslipSnapshots` skapar immutable payslips för issue-time truth.
9. `PostPayRun` skapar endast handoff till posting, inte fri journalmutation i UI.
10. `PreparePayrollPayout` skapar payout readiness handoff med cash net och blockers.
11. Downstream posting, payout, AGI och reporting tar över via egna bindande sanningar.
12. Eventuell correction sker via nytt `PayRunCorrectionCase`.
13. Original payslip supersederas av correction lineage i stallet för overwrite.
14. Final pay hanteras via `FinalPayCase`, inte via specialrad inne i vanlig run.
15. Historical import eller replay sker via explicit migration- eller replayreceipts.

## Bindande scenarioaxlar

- run type:
  - `regular`
  - `extra`
  - `correction`
  - `final`
  - `historical_imported`
- compensation model:
  - salaried
  - hourly
  - mixed
- employment status:
  - active
  - notice_period
  - terminated_pending_final_pay
  - terminated_historical
- upstream completeness:
  - full_snapshot
  - missing_time
  - missing_leave
  - missing_balance
  - missing_agreement
- review path:
  - no_exception
  - review_required
  - blocked
- settlement path:
  - normal_cash_net
  - zero_cash_net
  - negative_net_route
  - returned_payout_route
- correction timing:
  - before_post
  - after_post_before_payout
  - after_payout
  - after_agi_handoff
- origin:
  - native_live
  - migration_import
  - replay

## Bindande policykartor

- `PayrollRunTypePolicyMap`
  - `regular` = ordinarie lönemanad
  - `extra` = off-cycle utan correction lineage
  - `correction` = explicit rättelse av tidigare run
  - `final` = termination-driven slutlon

- `PayrollExceptionSeverityMap`
  - `info`
  - `warning`
  - `error`
  - `blocking_error`

- `PayrollEvidenceProfileMap`
  - `regular_run`
  - `correction_run`
  - `final_pay_run`
  - `historical_import`

- `PayslipProfileMap`
  - `regular_payslip`
  - `zero_cash_payslip`
  - `negative_net_payslip`
  - `final_pay_payslip`
  - `historical_import_payslip`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

Detta dokument använder exakta faltutfall som canonical proof eftersom detaljerad BAS-mappning ägs av `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md`.

- `PLN-P0001 regular_run_created`
  - outcome:
    - `PayRun.status = draft`
    - `runType = regular`
    - `payCalendarId` satt
    - `reportingPeriod` satt

- `PLN-P0002 run_calculated`
  - outcome:
    - `PayRun.status = calculated`
    - `payRunFingerprintId` satt
    - `payrollInputSnapshotId` satt
    - `calculationReceiptId` satt
    - `lineCount > 0` eller explicit `zero_line_reason_code`

- `PLN-P0003 review_required`
  - outcome:
    - `PayRun.status = review_required`
    - minst en `PayrollExceptionCase` i `open`

- `PLN-P0004 run_approved`
  - outcome:
    - `PayRun.status = approved`
    - `approvalReceiptId` satt
    - inga `blocking_error` öppna

- `PLN-P0005 payslips_issued`
  - outcome:
    - `PayslipSnapshot.status = issued`
    - `issueSequenceNo = 1`
    - `payslipHash` satt

- `PLN-P0006 run_posted_handoff_created`
  - outcome:
    - `PayRun.status = posted`
    - `postingHandoffId` satt
    - `postingProfileRef` satt

- `PLN-P0007 payout_readiness_created`
  - outcome:
    - `PayRun.status = payout_prepared`
    - `payoutReadinessReceiptId` satt
    - `cashNetPayAmount` synlig
    - `signedNetPayAmount` synlig

- `PLN-P0008 run_marked_paid`
  - outcome:
    - `PayRun.status = paid`
    - `payoutSettlementRef` satt

- `PLN-P0009 correction_case_executed`
  - outcome:
    - original `PayRun` bevarad
    - nytt `PayRun` eller ny correction lineage skapad
    - `correctionOfPayRunId` satt

- `PLN-P0010 final_pay_case_frozen`
  - outcome:
    - `FinalPayCase.status = frozen`
    - `finalPayFreezeId` satt
    - `terminationDate` satt

- `PLN-P0011 final_pay_posted`
  - outcome:
    - `FinalPayCase.status = posted`
    - `finalPaySettlementSummary` satt
    - `benefitsStopDecisionRef` satt eller explicit `not_applicable`

- `PLN-P0012 negative_net_routed`
  - outcome:
    - `cashNetPayAmount = 0`
    - `signedNetPayAmount < 0`
    - route till receivable truth skapad

- `PLN-P0013 blocked_missing_snapshot`
  - outcome:
    - no issue
    - no post
    - `blockCode = payroll_input_snapshot_missing`

- `PLN-P0014 blocked_overlapping_regular_run`
  - outcome:
    - ingen ändra `regular` run tillaten för samma scope

- `PLN-P0015 blocked_mutable_payslip_regeneration`
  - outcome:
    - `blockCode = mutable_payload_regeneration_forbidden`

## Bindande rapport-, export- och myndighetsmappning

- payslip PDF/JSON får genereras från `PayslipSnapshot`
- reporting projections får läsa `PayRun`, `PayslipSnapshot`, `PayrollCalculationReceipt` och `PayrollApprovalReceipt`
- AGI-handoff får bara ske från `posted` eller explicit AGI-ready payroll truth
- posting-handoff får bara ske från `posted`
- payout-handoff får bara ske från `posted` och med `cashNetPayAmount >= 0`
- historical imported pay runs får visas i reporting men får inte markeras som live-issued under innevarande period

## Bindande scenariofamilj till proof-ledger och rapportspar

- `PLN-A001` -> `PLN-P0002`, `PLN-P0004`, `PLN-P0005`, payslip projection
- `PLN-A002` -> `PLN-P0002`, `PLN-P0004`, `PLN-P0006`, posting handoff
- `PLN-A003` -> `PLN-P0002`, `PLN-P0004`, `PLN-P0007`, payout readiness
- `PLN-B001` -> `PLN-P0009`, correction lineage export
- `PLN-B002` -> `PLN-P0015`, blocked regenerate audit
- `PLN-C001` -> `PLN-P0010`, `PLN-P0011`, final-pay reporting
- `PLN-D001` -> `PLN-P0012`, receivable handoff
- `PLN-E001` -> `PLN-P0013`, blocked review queue
- `PLN-E002` -> `PLN-P0014`, duplicate scope audit
- `PLN-F001` -> `PLN-P0008`, bank/payout settlement reporting
- `PLN-G001` -> `PLN-P0003`, exception center projection
- `PLN-H001` -> `PLN-P0001`, `PLN-P0002`, historical import projection

## Tvingande dokument- eller indataregler

- `PayCalendar` måste ha:
  - `payCalendarCode`
  - `frequencyCode`
  - `reportingPeriodStart`
  - `reportingPeriodEnd`
  - `payDate`
  - `bankCutoffAt`
  - `agiPeriod`

- `PayrollInputSnapshot` måste ha:
  - `companyId`
  - `reportingPeriod`
  - `snapshotTakenAt`
  - `employmentRefs`
  - `timeEvidenceRefs`
  - `leaveEvidenceRefs`
  - `balanceEvidenceRefs`
  - `agreementEvidenceRefs`
  - `benefitEvidenceRefs`
  - `travelEvidenceRefs`
  - `pensionEvidenceRefs`

- `FinalPayCase` måste ha:
  - `employmentId`
  - `terminationDate`
  - `terminationReasonCode`
  - `finalPayFreezeId`

- `PayRunCorrectionCase` måste ha:
  - `correctionOfPayRunId`
  - `correctionReasonCode`
  - `reasonNarrative`

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `PAYROLL_CORR_RETRO`
- `PAYROLL_CORR_WRONG_TIME`
- `PAYROLL_CORR_WRONG_LEAVE`
- `PAYROLL_CORR_WRONG_BENEFIT`
- `PAYROLL_CORR_WRONG_TAX_DECISION`
- `PAYROLL_CORR_WRONG_AGI_SOURCE`
- `PAYROLL_FINAL_TERMINATION`
- `PAYROLL_FINAL_DEATH`
- `PAYROLL_FINAL_BANKRUPTCY`
- `PAYROLL_IMPORT_HISTORICAL`
- `PAYROLL_REPLAY_RECOVERY`

## Bindande faltspec eller inputspec per profil

### Profil `regular_monthly`

Måste ha:
- `runType = regular`
- `employment.payModel = salaried`
- `PayrollInputSnapshot`
- `PayRunFingerprint`

### Profil `regular_hourly`

Måste ha:
- `runType = regular`
- `employment.payModel = hourly` eller `mixed`
- approved time basis

### Profil `extra_run`

Måste ha:
- `runType = extra`
- explicit `triggerReasonCode`
- explicit scope över vilka employments som får inga

### Profil `correction_run`

Måste ha:
- `runType = correction`
- `correctionOfPayRunId`
- `correctionReasonCode`
- diff narrative

### Profil `final_pay`

Måste ha:
- `runType = final`
- `FinalPayCase`
- `FinalPayFreeze`
- explicit termination date

### Profil `historical_import`

Måste ha:
- `runType = historical_imported`
- migration receipt
- imported evidence refs

## Scenariofamiljer som hela systemet måste tacka

- `PLN-A001 regular salaried pay run`
- `PLN-A002 regular hourly pay run`
- `PLN-A003 extra pay run`
- `PLN-B001 correction of posted pay run`
- `PLN-B002 blocked mutable payslip regenerate`
- `PLN-C001 final pay with frozen termination context`
- `PLN-C002 final pay with remaining vacation settlement`
- `PLN-C003 final pay with advance recovery`
- `PLN-D001 zero cash net with nonzero signed net`
- `PLN-D002 negative net route to receivable`
- `PLN-E001 blocked missing input snapshot`
- `PLN-E002 blocked overlapping regular run`
- `PLN-E003 blocked missing approval evidence`
- `PLN-F001 posted and payout prepared`
- `PLN-F002 paid with payout settlement receipt`
- `PLN-G001 review_required because blocking exceptions exist`
- `PLN-H001 historical imported run`
- `PLN-H002 replayed run with same fingerprint`

## Scenarioregler per familj

- `PLN-A001`
  - måste ga `draft -> calculated -> approved -> posted`
  - får inte skapa correction lineage

- `PLN-A002`
  - måste konsumera approved time basis
  - får inte issueas utan line trace till tidgrund

- `PLN-A003`
  - måste ha explicit trigger reason
  - får inte masquerada som correction

- `PLN-B001`
  - original run bevaras
  - correction får bara ske via nytt case

- `PLN-B002`
  - regenerate får bara ske från frozen truth
  - blocker om payload skulle bygga på nuvarande upstream state

- `PLN-C001`
  - final pay måste ha eget case
  - vanlig run får inte bara `FINAL_PAY`-rad utan case

- `PLN-D001`
  - payslip måste visa `signedNetPayAmount` och `cashNetPayAmount`

- `PLN-D002`
  - route till receivable truth måste skapas
  - löneflödet får inte skriva debt policy självt

- `PLN-E001`
  - no calculate
  - no approve
  - no issue

- `PLN-H002`
  - samma fingerprint måste ge samma lines och totals

## Blockerande valideringar

- deny `CalculatePayRun` om `PayrollInputSnapshot` saknas
- deny `CalculatePayRun` om duplicate open run scope redan finns
- deny `ApprovePayRun` om blocking exceptions är öppna
- deny `PostPayRun` om payslip snapshots inte issueats eller explicit posting-without-issue policy saknas
- deny `PreparePayrollPayout` om `cashNetPayAmount < 0`
- deny `CreateFinalPayCase` om termination date saknas
- deny `FreezeFinalPayCase` om balances/agreement snapshots saknas
- deny `RegeneratePayslipFromFrozenTruth` om original snapshot/fingerprint saknas
- deny `HistoricalImportedPayRun` om source evidence eller migration receipt saknas

## Rapport- och exportkonsekvenser

- reporting ska kunna visa:
  - gross pay
  - signed net pay
  - cash net pay
  - receivable route flag
  - correction lineage
  - final pay flag
- payslip export får aldrig läsa nuvarande HR-data
- AGI build får inte ske för `draft` eller `review_required`
- payout export får inte ske för `negative_net_route`

## Förbjudna förenklingar

- att `approved` ses som samma sak som `posted`
- att correction betyder overwrite av original run
- att final pay bara är en vanlig run med extra rader
- att payslip kan regenereras från lagrad render-payload utan frozen input truth
- att negativ nettolön får dorras bort genom `Math.max(0, netPay)` utan receivable route
- att historical import och live run delar samma lineageflagga
- att review_required-runs får glida vidare till issue

## Fler bindande proof-ledger-regler för specialfall

- `PLN-P0016 review_resolved_and_reapproved`
  - `PayRun.status = approved`
  - alla blockerande exceptions `resolved`

- `PLN-P0017 correction_supersedes_payslip`
  - original `PayslipSnapshot.status = superseded_by_correction`
  - nytt `payslipId` skapas

- `PLN-P0018 final_pay_cancelled_before_issue`
  - `FinalPayCase.status = cancelled`
  - inga issued payslips

- `PLN-P0019 historical_import_registered`
  - `runType = historical_imported`
  - `liveIssueAllowed = false`

- `PLN-P0020 replay_proved_equal`
  - `fingerprintChecksum` samma
  - `lineSetChecksum` samma
  - `totalsChecksum` samma

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `PLN-P0002`
  - `PayRun` får frozen line set
  - `PayslipSnapshot` får inte issueas annu

- `PLN-P0005`
  - payslip becomes customer-facing employee document
  - supports export and archive retention

- `PLN-P0006`
  - posting handoff pending

- `PLN-P0007`
  - payout handoff pending

- `PLN-P0012`
  - receivable owner pending i downstream payroll debt truth

- `PLN-P0017`
  - old payslip remains readable but superseded

## Bindande verifikations-, serie- och exportregler

- pay-run receipts ska ha egen receipt-serie skild från huvudboksverifikationer
- payslip issue ska ha egen document-serie skild från journalserier
- correction case ska ha egen correction-serie
- final pay case ska ha egen final-pay-serie
- export av payslip får alltid bara på immutable snapshot
- export av payroll run overview får visa lineage men aldrig skriva om historiken

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- employment profile:
  - collective_worker
  - white_collar
  - executive
  - foreign_worker
- run type:
  - regular
  - extra
  - correction
  - final
- time basis:
  - none_required
  - approved_time_required
- termination:
  - no
  - yes
- output path:
  - payslip_only
  - payslip_plus_posting
  - payslip_plus_posting_plus_payout
- origin:
  - native
  - imported
  - replayed

## Bindande fixture-klasser för löneflödet

- `PAYFXT-001 salaried_regular_green`
- `PAYFXT-002 hourly_regular_green`
- `PAYFXT-003 mixed_with_overtime_green`
- `PAYFXT-004 final_pay_with_vacation_settlement`
- `PAYFXT-005 correction_after_post`
- `PAYFXT-006 negative_net_route`
- `PAYFXT-007 review_required_missing_leave`
- `PAYFXT-008 historical_import`
- `PAYFXT-009 replay_same_fingerprint`

## Bindande expected outcome-format per scenario

Varje payrollscenario måste minst beskriva:
- `scenarioId`
- `fixtureClass`
- `runType`
- `inputSnapshotRef`
- `fingerprintRef`
- `expectedRunStatusChain`
- `expectedPayslipOutcome`
- `expectedPostingHandoffOutcome`
- `expectedPayoutReadinessOutcome`
- `expectedCorrectionLineage`
- `expectedBlockCodes`

## Bindande canonical verifikationsseriepolicy

- `PAYRUN-*` för pay run receipts
- `PAYSLIP-*` för payslip issue receipts
- `PAYCORR-*` för correction cases
- `PAYFINAL-*` för final pay cases
- `PAYIMP-*` för historical import receipts

## Bindande expected outcome per central scenariofamilj

### `PLN-A001 regular salaried pay run`

- minimum fixture: `PAYFXT-001`
- expected:
  - `PayRun.statusChain = draft -> calculated -> approved -> posted`
  - `PayslipSnapshot.status = issued`
  - `postingHandoffId != null`
  - `payoutReadinessReceiptId != null`

### `PLN-B001 correction of posted pay run`

- minimum fixture: `PAYFXT-005`
- expected:
  - original run preserved
  - new correction case executed
  - original payslip superseded
  - new payslip issued

### `PLN-C001 final pay with frozen termination context`

- minimum fixture: `PAYFXT-004`
- expected:
  - `FinalPayCase.statusChain = draft -> frozen -> calculated -> approved -> posted`
  - `terminationDate` visible
  - `benefitsStopDecisionRef` explicit

### `PLN-D002 negative net route`

- minimum fixture: `PAYFXT-006`
- expected:
  - `cashNetPayAmount = 0`
  - `signedNetPayAmount < 0`
  - downstream receivable route created

### `PLN-H002 replayed run with same fingerprint`

- minimum fixture: `PAYFXT-009`
- expected:
  - same checksum
  - same lines
  - same totals
  - no duplicate issue receipts

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `PLN-A001` -> green regular salaried issue/post/payout-ready
- `PLN-A002` -> green hourly issue/post/payout-ready with approved time
- `PLN-A003` -> green extra run with explicit trigger reason
- `PLN-B001` -> correction lineage created and original preserved
- `PLN-B002` -> blocked mutable regenerate
- `PLN-C001` -> final pay case frozen and posted
- `PLN-C002` -> final pay includes vacation settlement component
- `PLN-C003` -> final pay includes advance recovery component
- `PLN-D001` -> zero cash but nonzero signed net visible
- `PLN-D002` -> negative net routed
- `PLN-E001` -> blocked missing snapshot
- `PLN-E002` -> blocked overlapping regular run
- `PLN-E003` -> blocked approval evidence missing
- `PLN-F001` -> posted and payout prepared
- `PLN-F002` -> paid with settlement receipt
- `PLN-G001` -> review required with open exception
- `PLN-H001` -> historical imported non-live run
- `PLN-H002` -> replay equality proven

## Bindande testkrav

- unit:
  - `phase21-payroll-core.test.mjs`
  - `phase12-payrun-engine-agi-immutability.test.mjs`
  - `phase12-payroll-input-consumption-hardening.test.mjs`
- integration:
  - `phase8-payroll-api.test.mjs`
  - `phase11-payroll-input-snapshots-api.test.mjs`
  - `phase21-payroll-core-api.test.mjs`
  - `phase19-payroll-migration-api.test.mjs`
- e2e:
  - `phase8-payroll-flow.test.mjs`
  - `phase19-payroll-migration-flow.test.mjs`
- mandatory assertions:
  - replay equality on same fingerprint
  - payslip regenerate only from frozen truth
  - final pay cannot exist without case and freeze
  - negative net remains visible
  - overlapping regular run blocked

## Källor som styr dokumentet

- `DOMAIN_10_ROADMAP.md`
- `DOMAIN_10_IMPLEMENTATION_LIBRARY.md`
- `packages/domain-payroll/src/index.mjs`
- `apps/api/src/server.mjs`
- `tests/unit/phase21-payroll-core.test.mjs`
- `tests/unit/phase12-payrun-engine-agi-immutability.test.mjs`
- `tests/unit/phase12-payroll-input-consumption-hardening.test.mjs`
- `tests/integration/phase8-payroll-api.test.mjs`
- `tests/integration/phase11-payroll-input-snapshots-api.test.mjs`
- `tests/integration/phase21-payroll-core-api.test.mjs`
- `tests/integration/phase19-payroll-migration-api.test.mjs`
- `tests/e2e/phase8-payroll-flow.test.mjs`
- `tests/e2e/phase19-payroll-migration-flow.test.mjs`
- Sveriges riksdag, Semesterlag (1977:480): https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/semesterlag-1977480_sfs-1977-480/
- Sveriges riksdag, Lag (1991:1047) om sjuklön: https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-19911047-om-sjuklon_sfs-1991-1047/
- Sveriges riksdag, Socialavgiftslag (2000:980): https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/socialavgiftslag-2000980_sfs-2000-980/
- Sveriges riksdag, Skatteforfarandelag (2011:1244): https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/skatteforfarandelag-20111244_sfs-2011-1244/
- Skatteverket, Skatteavdrag och arbetsgivaravgifter (SKV 401): https://www.skatteverket.se/servicelankar/otherlanguages/inenglishengelska/businessesandemployers/startingandrunningaswedishbusiness/declaringtaxesbusinesses/preliminarytaxandemployercontributions.4.676f4884175c97df41913f6.html
- Skatteverket, Arbetsgivardeklaration på individniva: https://www.skatteverket.se/foretag/arbetsgivare/lamnaarbetsgivardeklaration/arbetsgivardeklarationpaindividniva.4.361dc8c15312eff6fd36d7.html
