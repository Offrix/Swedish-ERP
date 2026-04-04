# DOMAIN_10_ROADMAP

## mål

Domän 10 ska bli en full svensk payroll-, AGI-, skatt-, arbetsgivaravgifts-, receivable-, payout- och bankreturdomän där varje lönekörning är reproducerbar, regulatoriskt korrekt, ledger-riktig, bankmatchningsbar och revisionssäker.

## varför domänen behövs

Fel i payroll kan inte repareras med “nästan rätt”. Domänen bär:
- anställdas nettolön
- arbetsgivaravgifter
- preliminärskatt
- AGI
- semesterersättning
- sjuklön
- pensionskostnader
- receivables
- löneutmätning
- bankutbetalning
- bokföringsposter

Om något här är fel blir både anställd, myndighet, bank, ledger och support sanningsmässigt fel.

## bindande tvärdomänsunderlag

- `LONEFLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör pay calendars, immutable payroll input snapshots, pay runs, payslips, corrections, final pay, employee receivables, payroll posting handoff, payout readiness, bankreturklassning och payroll replay/cutover truth.
- `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör canonical pay item catalog, line effect classes, BAS-lönekonton, liability anchors, deduction anchors, employee receivable anchors, accrual anchors och payroll account-profile truth.
- `PRELIMINARSKATT_OCH_SKATTETABELLER_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör ordinary table tax, one-time tax, jämkning, SINK, A-SINK, no-tax certificates, emergency-manual-tax och frozen tax decision truth.
- `ARBETSGIVARAVGIFTER_OCH_SPECIALREGLER_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör arbetsgivaravgifter, 67+-, 1937- eller tidigare, tillfälliga nedsättningar, växa-stöd, contribution basis och frozen contribution-decision truth.
- `FORMANER_OCH_FORMANSBESKATTNING_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör benefit classification, valuation, no-double-booking mellan kvitto/AP och payroll, taxable-vs-tax-free truth och payroll handoff för förmåner.
- `RESOR_TRAKTAMENTE_OCH_MILERSATTNING_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör tjänsteresa, traktamente, nattraktamente, måltidsreduktion, tremånadersreduktion, milersättning, tax-free vs taxable travel replacement och travel payroll handoff.
- `PENSION_OCH_LONEVAXLING_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör pensionspremier, salary exchange, top-up policy, special löneskatt på pensionskostnader och pension payroll handoff.
- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör payroll approvals, AGI sign-off, payout approval, support reveal, break-glass och filing evidence.
- `BAS_LONEKONTOPOLICY_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör BAS-lönekonton, payroll-liability-ankare, accrual anchors och employee-receivable-kontoankare.
- `SEMESTER_SEMESTERSKULD_OCH_SEMESTERERSATTNING_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör semesterår, intjänande, betalda/obetalda dagar, sparade dagar, sammalöneregeln, procentregeln, förskottssemester, semesterersättning och semesterskuld.
- `SJUKLON_KARENS_OCH_FRANVARO_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör sjukperiod dag 1-14, karensavdrag, deltidsfrånvaro, läkarintyg, högriskskydd, dag-15-övergång till Försäkringskassan och payroll handoff för sjuklön.
- `LONEUTMATNING_OCH_ANDRA_MYNDIGHETSAVDRAG_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör löneutmatning, myndighetsbeslut, remittering, oregelbundna utbetalningar under beslut och liability-truth mot myndighet.
- `NEGATIV_NETTOLON_OCH_EMPLOYEE_RECEIVABLE_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör negativ nettolön, employee receivable, legal kvittning, payroll settlement och bankåterbetalning av anstalldskuld.
- `LONEUTBETALNING_OCH_BANKRETURER_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör payout batch, settlement receipt, partial batch, bankretur, reopened employee liability och reissue-truth.
- `AGI_FLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör AGI-period, huvuduppgift, individuppgifter, specifikationsnummer, receipt, correction, removal och frånvarouppgiftens transportgräns.
- `AGI_FALTKARTA_OCH_RATTELSER_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör AGI-faltrutor, skattefalt, huvuduppgiftssummor, fuel-benefit-logik, checkbox-rutor, correction på faltniva och blockerad unsupported AGI-mappning.
- `SKATTEKONTOMAPPNING_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör payroll liabilities när de materialiseras på skattekontot, `1630`-mirror, payroll tax/employer contribution owner binding och blocked authority mismatch.
- `VERIFIKATIONSSERIER_OCH_BOKFORINGSPOLICY_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör löneverifikationsserier, voucher identity, correction policy, posting date policy och export parity för payroll vouchers.
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör payroll vouchers, verifikationsserier, kontrollkonton och slutlig ledger-truth.
- `RAPPORTER_MOMS_AGI_RESKONTRA_HUVUDBOK_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör AGI-underlag, payroll-linked huvudbok, verifikationslista, report snapshots och filing-ready report packages för payroll och AGI.
- `OCR_REFERENSER_OCH_BETALFORMAT_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör salary payment files, provider-versionerade payroll-bankformat, payout references och formatbinding mellan payroll payout batch och bankrail.
- `PERIODISERING_OCH_BOKSLUTSOMFORINGAR_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör accrued wages, accrued vacation pay, accrued statutory charges och ändra payroll-related periodiseringar.

## faser

- Fas 10.1 Pay item / calendar / pay run / final pay hardening
- Fas 10.2 Tax table / tax decision / engångsskatt / SINK / A-SINK hardening
- Fas 10.3 Employer contribution / age transition hardening
- Fas 10.4 Benefits / travel / pension / salary exchange classification hardening
- Fas 10.5 Sick pay / qualifying deduction / vacation hardening
- Fas 10.6 Negative net pay / employee receivable hardening
- Fas 10.7 Returned salary payment / bank return hardening
- Fas 10.8 Garnishment / remittance hardening
- Fas 10.9 AGI build / field mapping / correction / submission hardening
- Fas 10.10 Payroll posting / payout / bank match / BAS hardening
- Fas 10.11 Payroll input snapshot / dependency consumption hardening
- Fas 10.12 Payroll migration / history import / parallel run hardening
- Fas 10.13 Security / review / step-up / trial guard hardening
- Fas 10.14 Runbook / seed / fake-live / legacy cleanup

## dependencies

- Domän 6 för bank rails, bank match semantics, tax-account truth och payment return semantics.
- Domän 8 för HR-, time-, leave-, balance- och employment truth.
- Domän 9 för kollektivavtal, supplements, event-date resolution och payroll line trace.
- Domän 12 för regulated submission transport, receipt-ingest och provider-backed AGI live submit.
- Domän 16 för support, replay, incident och payroll backoffice-gränser.

## vad som får köras parallellt

- Fas 10.4 och 10.5 efter att canonical pay item catalog och statutory profile model låsts i 10.1 och 10.2.
- Fas 10.6 och 10.8 efter att signed net pay, debt truth och liability trace låsts i 10.1.
- Fas 10.9 och 10.10 efter att pay run, line trace och decision snapshots låsts i 10.1-10.4.
- Fas 10.12 och 10.14 efter att canonical objects i 10.1-10.11 är definierade.

## vad som inte får köras parallellt

- 10.2 får inte avslutas innan 10.1 låst pay run-, fingerprint- och final pay-modell.
- 10.7 får inte påbörjas som live path innan 10.10 definierat payout batch, rail, bank match och suspense/receivable-ledger.
- 10.9 får inte märkas grön innan 10.2 och 10.3 låst tax/contribution canonical objects.
- 10.10 får inte märkas grön innan BAS-/postingreglerna är bredare än nuvarande placeholder cleanup.
- 10.12 får inte märkas grön innan 10.1-10.11 har fasta canonical modeller.

## exit gates

- ingen live ordinary tax via `manual_rate`
- ingen coarse AGI bucket-model kvar som slutlig sanning
- final pay är first-class
- payroll-specifik returned salary payment finns
- BAS-/lönekontomodell är regelstyrd och verifierad
- riktig AGI live submit finns eller är explicit blockerad av extern åtkomst
- payout batch använder verifierad svensk rail-spec
- payroll high-risk routes kräver rätt permissions och step-up

## test gates

- unit för green path, fail path, retro/correction path och replay/determinism path
- integration för API, authz, receipts, immutable snapshots, migration, AGI-versioner och payout/bank-match
- e2e för payroll run, AGI-flow, benefit/travel/pension, garnishment, migration
- regulatoriska vektortester mot official 2026-regler där det krävs

## tax/decision/contribution/age-transition gates

- official skattetabell, engångsskatt, SINK och A-SINK måste vara pinned per tax year
- municipality/table/column, beslutstyp och evidence måste vara synligt per anställd och pay run
- employer contribution rulepack måste bära full rate, 67+, youth, 1937-or-earlier, växa och specialfall
- mid-year age transitions måste ge rätt regim från rätt datum

## benefits/travel/pension classification gates

- taxable benefit, tax-free reimbursement, travel allowance, mileage, pension premium och salary exchange måste vara separata canonical kategorier
- `manual_taxable_value` får inte vara normal live-väg
- special payroll tax för pension måste komma från official rulepack

## sick-pay/vacation/final-pay/liability gates

- sjuklön och karens måste kunna förklaras från leave/schedule truth
- semesterlön, semestertillägg, sparade dagar, skuld och slutlön måste kunna förklaras och reproducera samma resultat
- final pay måste bära egen state machine och receivable-/benefits-/AGI-effekt

## receivable/returned-payment/garnishment gates

- signed net pay, receivable, offset plan och write-off måste vara sammanhängande
- returned salary payment måste kunna skapa receivable, suspense eller repayout via canonical workflow
- garnishment måste styras av authority snapshot, förbehållsbelopp, prioritet, remittance och correction workflow

## AGI/field-mapping/submission gates

- varje pay item outcome som påverkar AGI ska vara spårbar till exakt fältkod/ruta
- AGI correction måste modellera replace/remove semantics
- live submit får inte vara fake-live eller “kastar fel men UI finns”

## posting/payout/bank-match gates

- posting måste vara balanserad, dimensionerad och legal-form-aware
- BAS-/lönekonton måste vara granulära nog för svensk lön och årsavslut
- payout export måste vara rail-specifik
- bank match måste hantera salary payout, bankretur, suspense, repayout och reconciliation

## migration/parallel-run gates

- YTD, semester, receivables, garnishments, AGI-basis, skatt- och avgiftsbeslut måste kunna importeras
- parallel run måste jämföra canonical diff per område
- finalize/cutover får inte ske utan accepted variance policy

## security/review gates

- high-risk payroll actions måste kräva rätt permission, step-up och SoD
- emergency manual tax, garnishment override, receivable write-off, payout batch approval och AGI submit måste vara auditkritiska
- trial/live isolation måste vara verklig

## markeringar

- `keep`: immutable input snapshots, tax decision snapshots, employer contribution decisions, sickness/vacation core, receivable runtime, migration core
- `harden`: employer contribution governance, travel tax rulepacks, sickness/vacation line trace, migration diff profile, trial guards
- `rewrite`: final pay, tax-mode schema, AGI field mapping, benefits classification, authz/step-up, correction model
- `replace`: AGI live submit transport, BAS posting profile, banklönefil/export
- `migrate`: legacy tax/profile schema, posting cleanup mapping, old runbooks into rebuild-truth
- `archive`: legacy demo seeds, legacy phase runbooks as truth claims
- `remove`: live `manual_rate` ordinary tax path after replacement, fake-live docs, dead payroll bank-return assumptions

## delfaser

### Delfas 10.1 Pay item / calendar / pay run / final pay hardening
- status: `rewrite`
- mål:
  - pay item catalog ska vara canonical och legal-form-aware
  - pay calendar ska bära cutoff, payout date, bank cutoff, AGI period och correction window
  - pay run ska bära full state machine och correction lineage
  - final pay ska vara förstaklassig domänkedja
- arbete:
  - bygg `PayItemCatalogEntry`, `PayCalendar`, `PayRun`, `PayRunFingerprint`, `PayRunCorrectionCase`
  - bygg `FinalPayCase`, `FinalPayFreeze`, `FinalPaySettlementLine`, `BenefitsStopDecision`
  - utöka pay run-state och DB-statusar
- exit gate:
  - `finalPayAdjustments[]` är inte längre payrolltruth
  - pay run kan bära `posted`, `payout_prepared`, `paid`, `corrected`, `reversed`
- konkreta verifikationer:
  - en final pay ska ha eget case-id, freeze-ref och settlement line trace
  - en vanlig pay run får inte kunna masquerada som final pay
- konkreta tester:
  - unit: pay run-state machine
  - unit: final pay-case lifecycle
  - integration: final pay create/approve/post
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - visa i API när en run gick från `approved` till `posted`
  - visa i payslip/final-pay view vilka lines som kommer från slutlönecase

### Delfas 10.2 Tax table / tax decision / engångsskatt / SINK / A-SINK hardening
- status: `rewrite`
- mål:
  - ordinary tax ska drivas av pinned official tax tables
  - engångsskatt ska vara separat canonical mode
  - SINK och A-SINK ska vara separata regulatoriska modes
- arbete:
  - ersätt `pending | manual_rate | sink` med explicit tax mode-model
  - förbjud `manual_rate` som normal live-väg
  - bygg `TaxDecisionSnapshot`, `TaxDecisionEvidence`, `TaxModePolicy`
- exit gate:
  - live ordinary tax med `manual_rate` nekas
  - SINK och A-SINK kan visas med beslut, procentsats, rätt period och AGI-semantik
- konkreta verifikationer:
  - ordinary tax ska alltid visa municipality, table, column, rulepack version och decision ref
  - engångsskatt ska inte återanvända ordinary table path
- konkreta tester:
  - unit: official tax table vectors
  - unit: engångsskatt vectors
  - unit: SINK/A-SINK vectors
  - integration: live deny på `manual_rate`
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - från API ska vi kunna läsa exakt tax basis och legal basis per anställd
  - AGI preview ska kunna visa vilka fält som påverkats av vald tax mode

### Delfas 10.3 Employer contribution / age transition hardening
- status: `harden`
- mål:
  - employer contribution ska vara rulepack-styrd och effective-dated
  - age transitions och specialregimer ska vara reproducerbara
- arbete:
  - bygg `EmployerContributionRulepackVersion`
  - bygg `EmployerContributionDecisionSnapshot` med legal basis och eligibility profile
  - lås age transition semantics mot payout date och tax year
- exit gate:
  - varje avgiftsberäkning kan visas med procentsats, kategori, threshold, årsgrund och evidence
- konkreta verifikationer:
  - 66/67-cutover mitt i kalenderår fungerar
  - youth reduction och växa-stöd får rätt tak och period
- konkreta tester:
  - unit: age transition vectors
  - unit: växa/youth/no-contribution vectors
  - integration: contribution preview receipt
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - jämför employer contribution receipt mot official rulepack för samma datum och profil

### Delfas 10.4 Benefits / travel / pension / salary exchange classification hardening
- status: `rewrite`
- mål:
  - alla benefit/travel/pension-flöden ska klassificeras rätt före skatt, AGI och posting
- arbete:
  - bygg `BenefitValuationDecision`, `TravelTaxRulepackVersion`, `PensionContributionProfile`, `SalaryExchangeAgreement`
  - flytta bort `manual_taxable_value` från normal live-väg
  - lås special payroll tax till official rulepack
- exit gate:
  - ingen central live-förmån kräver manuellt taxable value som normalläge
- konkreta verifikationer:
  - sjukvårdsförsäkring, bilförmån, drivmedel, gåva, friskvård, traktamente och mileage får rätt skatteklassning
- konkreta tester:
  - unit: benefit valuation vectors
  - unit: travel allowance and mileage vectors
  - unit: pension/salary exchange vectors
  - integration: payroll line classification trace
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - visa exakt vilken valuation method som använts för varje benefit line
  - visa att expense reimbursement och receipt VAT aldrig blandas ihop med taxable benefit

### Delfas 10.5 Sick pay / qualifying deduction / vacation hardening
- status: `harden`
- mål:
  - sjuklön, karens, semesterlön, semestertillägg, sparade dagar och semesterskuld ska vara legal- och snapshotspårbara
- arbete:
  - bygg `SickPayDecisionTrace`, `VacationDecisionTrace`, `VacationLiabilitySnapshot`
  - knyt leave truth, schedule truth, agreement truth och payroll lines till samma lineage
- exit gate:
  - varje sjuk- och semesterlinje kan förklaras från upstream truth
- konkreta verifikationer:
  - sjuklön dag 2-14 och karensavdrag förklaras från leave/schedule
  - semesterersättning vid final pay följer semesterlagen
- konkreta tester:
  - unit: sick pay vectors
  - unit: vacation liability vectors
  - integration: line trace / explainability
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - från supportvy ska vi kunna se exakt varför en semesterline uppstått utan att läsa rå kod

### Delfas 10.6 Negative net pay / employee receivable hardening
- status: `harden`
- mål:
  - signed net pay och receivable ska vara en enda sammanhängande truth
- arbete:
  - bygg `SignedNetPayView`, `EmployeeReceivable`, `ReceivableSettlementPlan`, `ReceivableWriteOffDecision`
  - lås offset-prioritet, aging, stop conditions och receipts
- exit gate:
  - negativ nettolön kan inte döljas av projections eller payoutvyer
- konkreta verifikationer:
  - receivable skapas alltid när nettolön blir negativ
  - nästa pay run kan visa hur mycket som offsettas och hur mycket som kvarstår
- konkreta tester:
  - unit: multi-run receivable settlement
  - integration: write-off governance
  - integration: receivable explainability
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - kunna läsa signed net pay, cash net pay och receivable amount i samma svar

### Delfas 10.7 Returned salary payment / bank return hardening
- status: `replace`
- mål:
  - payroll ska äga returned salary payment som förstaklassig kedja
- arbete:
  - bygg `ReturnedSalaryPayment`, `PayrollBankReturn`, `PayoutFailureDecision`, `RepayoutRequest`
  - bygg payrollspecifik bokning för retur, suspense, receivable och repayout
- exit gate:
  - bankretur är inte längre bara en generisk banking-notis
- konkreta verifikationer:
  - en retur kan ge receivable
  - en retur kan ge repayout efter godkännande
  - original payout och ny payout är länkade
- konkreta tester:
  - unit: bank return to receivable
  - unit: bank return to repayout
  - integration: payroll bank return API flow
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - visa original payout id, returorsak, ny skuld och eventuell ny payout chain i samma view

### Delfas 10.8 Garnishment / remittance hardening
- status: `harden`
- mål:
  - löneutmätning ska styras av canonical beslut, förbehållsbelopp, prioritet, remittance och correction workflow
- arbete:
  - bygg `GarnishmentDecisionSnapshot`, `GarnishmentPriorityProfile`, `GarnishmentRemittance`, `GarnishmentReturnCase`
  - isolera `manual_override` till emergency lane
- exit gate:
  - garnishment kan inte muteras via vanlig company-manage-lane
- konkreta verifikationer:
  - rätt prioritet används när flera beslut finns
  - remittance return/correction spåras till originalbeslut
- konkreta tester:
  - unit: prioritetsordning
  - unit: protected amount vectors
  - integration: remittance return/correction
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - kunna se vilket förbehållsbelopp och vilket myndighetsbeslut som användes för en remittering

### Delfas 10.9 AGI build / field mapping / correction / submission hardening
- status: `replace`
- mål:
  - AGI ska vara fältkodsriktig, versionsstyrd, korrigerbar och transportklar
- arbete:
  - bygg `AgiFieldMappingBaseline`, `AgiSubmission`, `AgiSubmissionVersion`, `AgiCorrectionCase`
  - bygg fältkod/ruta per payroll outcome
  - bygg riktig submit transport via regulated submissions
- exit gate:
  - AGI kan valideras och skickas med riktig receipt-chain
- konkreta verifikationer:
  - varje AGI-rad kan spåras till fältkod och source payroll lines
  - correction kan göra replace/remove enligt Skatteverkets modell
- konkreta tester:
  - unit: field-code mapping suite
  - unit: correction semantics
  - integration: ready-för-sign/submit/receipt flow
  - e2e: full AGI live-like flow
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - visa specifikationsnummer, payload hash, receipt, felklass och correction lineage i samma chain

### Delfas 10.10 Payroll posting / payout / bank match / BAS hardening
- status: `replace`
- mål:
  - payroll posting och payout ska vara svensk-bokföringsmässigt och bankmässigt korrekta
- arbete:
  - ersätt grov kontoallokering med `PayrollPostingProfile`
  - bygg rail-specifik `PayrollPayoutBatch`
  - bygg `PayrollBankMatch` med mismatch/repair-path
- exit gate:
  - ingen placeholder cleanup-mapping är kvar som slutlig sanning
  - payout export är verifierad mot svensk bankrail
- konkreta verifikationer:
  - lönearter går till rätt BAS-lönekonton och skuldkonton per scenario
  - bankfil validerar mot vald rail-spec
- konkreta tester:
  - unit: posting profile vectors
  - integration: payout export checksum
  - integration: bank match and mismatch repair
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - kunna härleda varje ledger line till pay item, liability type och source payroll line
  - kunna visa varför en bankmatch blev mismatch

### Delfas 10.11 Payroll input snapshot / dependency consumption hardening
- status: `harden`
- mål:
  - payroll ska kunna förklara exakt vilka upstream truths som konsumerades
- arbete:
  - bygg `PayrollInputConsumptionTrace`
  - knyt HR, time, leave, balances, agreements, benefits, travel och pension till line-level trace
- exit gate:
  - ingen payroll line utan source trace
- konkreta verifikationer:
  - varje pay line kan visa sin upstream-kedja
- konkreta tester:
  - unit: input consumption trace
  - integration: explainability API
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - kunna fråga en line varför den finns och få ett deterministiskt svar

### Delfas 10.12 Payroll migration / history import / parallel run hardening
- status: `harden`
- mål:
  - migration och parallel run ska vara tillräckliga för svensk go-live
- arbete:
  - bygg `PayrollCutoverBaseline`, `PayrollParallelRunDiffProfile`, `AcceptedVariancePolicy`
  - bredda diffmodell för YTD, semester, receivables, garnishment och AGI-basis
- exit gate:
  - finalize får inte ske med oklassade diffar
- konkreta verifikationer:
  - imported history kan diffas mot canonical payroll truth
  - rollback kan återgå till pre-cutover receipts
- konkreta tester:
  - unit: diff classification
  - integration: cutover block on unresolved diffs
  - e2e: migration flow with finalize/rollback
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - kunna skriva ut exakt vilka diffar som accepterats och varför

### Delfas 10.13 Security / review / step-up / trial guard hardening
- status: `rewrite`
- mål:
  - payroll high-risk mutations ska vara step-up-, SoD- och dual-review-säkrade där policy kräver det
- arbete:
  - inför granular permissions för tax, garnishment, receivable, AGI, payout och posting
  - knyt route-layer till trust level och approval chain
- exit gate:
  - `company.manage` räcker inte för high-risk payrollaktioner
- konkreta verifikationer:
  - samma person kan inte både skapa och godkänna high-risk action där SoD krävs
  - trial/live guards skiljer receipt och submission paths
- konkreta tester:
  - integration: authz deny matrix
  - integration: step-up required paths
  - unit: SoD policy checks
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - från audit ska vi kunna se trust level, approver 2 och reason code för varje high-risk payrollaktion

### Delfas 10.14 Runbook / seed / fake-live / legacy cleanup
- status: `migrate`
- mål:
  - runbooks och seeds får inte låtsas vara bindande sanning
- arbete:
  - klassificera `docs/runbooks/payroll-tax-decisions-verification.md`, `docs/runbooks/payroll-employer-contribution-decisions-verification.md`, `docs/runbooks/payroll-input-snapshots-verification.md`, `docs/runbooks/employee-receivables.md`, `docs/runbooks/garnishment-remittance.md`, `docs/runbooks/payroll-history-import-verification.md`, `docs/runbooks/payroll-migration-cutover.md`, `docs/runbooks/payroll-correction-and-agi-replay.md` som `harden` eller `rewrite`
  - klassificera `docs/runbooks/fas-8-payroll-core-verification.md`, `docs/runbooks/fas-8-payroll-posting-verification.md`, `docs/runbooks/fas-8-payroll-tax-agi-verification.md`, `docs/runbooks/fas-9-benefits-verification.md`, `docs/runbooks/fas-9-travel-verification.md`, `docs/runbooks/fas-9-pension-verification.md`, `docs/runbooks/fas-11-travel-receipt-vat-verification.md` som `archive` eller `rewrite`
  - klassificera `docs/runbooks/document-person-payroll-incident-and-repair.md` tillsammans med Domän 16-gränser som `rewrite` eller `migrate`
  - flytta `packages/db/seeds/20260321201000_phase8_payroll_core_demo_seed.sql`, `20260321211000_phase8_payroll_tax_agi_demo_seed.sql`, `20260321221000_phase8_payroll_posting_payout_demo_seed.sql`, `20260321231000_phase9_benefits_engine_demo_seed.sql`, `20260322001000_phase9_travel_expenses_demo_seed.sql`, `20260322011000_phase9_pension_salary_exchange_demo_seed.sql`, `20260322151000_phase12_tax_submission_demo_seed.sql` till test-only-klassning eller borttagning från protected/live
  - skriv tydliga remove/archive-listor för legacy payroll docs, seeds och falska gröna statuspåståenden
- exit gate:
  - inga legacy payroll docs eller demo seeds ser ut som live-sanning
- konkreta verifikationer:
  - varje payroll-runbook har klassning och målstatus
  - varje demo-seed har test-only-markering eller borttagen status
- konkreta tester:
  - repo checks för protected/live deny på demo/seed boot
  - docs consistency checks
- konkreta kontroller vi måste kunna utföra för att bevisa att delfasen fungerar och för att vi inte ska kunna göra fel:
  - kunna lista exakt vilka payroll-dokument som ska arkiveras, skrivas om eller tas bort
