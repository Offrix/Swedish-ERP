# DOMAIN_10_ANALYSIS

## Scope

Granskningen täcker verifierad runtime-, API-, DB-, test- och runbook-verklighet för:
- pay item catalog
- pay calendars
- statutory profiles
- pay runs
- final pay
- tax decision snapshots
- skattetabeller
- engångsskatt
- jämkning
- SINK
- A-SINK
- employer contribution decisions
- benefits
- travel reimbursements
- pension premiums
- salary exchange
- sjuklön
- karensavdrag
- semesterlön
- semestertillägg
- semesterskuld
- negative net pay
- employee receivables
- returned salary payments
- garnishment
- AGI versions
- AGI-fältnivåmappning
- correction chains
- payroll postings
- payout batches
- bank match
- payroll migration

Verifierade kärnspår:
- `packages/domain-payroll/src/index.mjs`
- `packages/domain-payroll/src/skatteverket-tax-tables.mjs`
- `packages/domain-benefits/src/index.mjs`
- `packages/domain-travel/src/index.mjs`
- `packages/domain-pension/src/index.mjs`
- `packages/domain-hr/src/index.mjs`
- `packages/domain-time/src/index.mjs`
- `packages/domain-balances/src/engine.mjs`
- `packages/domain-collective-agreements/src/engine.mjs`
- `packages/domain-banking/src/index.mjs`
- `packages/domain-ledger/`
- `packages/domain-regulated-submissions/`
- `apps/api/src/server.mjs`
- `apps/api/src/route-contracts.mjs`
- `packages/db/migrations/20260321200000_phase8_payroll_core.sql`
- `packages/db/migrations/20260321210000_phase8_payroll_tax_agi.sql`
- `packages/db/migrations/20260321220000_phase8_payroll_posting_payout.sql`
- `packages/db/migrations/20260325033000_phase8_payroll_placeholder_cleanup.sql`
- relevanta runbooks under `docs/runbooks/`
- relevanta enhets-, integrations- och e2e-tester under `tests/`

Officiella källor låsta för denna domän:
- [Skatteverket: teknisk beskrivning för skattetabeller](https://www.skatteverket.se/foretag/arbetsgivare/arbetsgivaravgifterochskatteavdrag/skattetabeller/tekniskbeskrivningforskattetabeller.4.319dc1451507f2f99e86ee.html)
- [Skatteverket: SKV 401 Skatteavdrag och arbetsgivaravgifter](https://www.skatteverket.se/download/18.262c54c219391f2e9634df4/1736339078938/skatteavdrag-och-arbetsgivaravgifter-skv401-utgava30.pdf)
- [Skatteverket: AGI teknisk beskrivning 1.1.18.1](https://www.skatteverket.se/foretag/arbetsgivare/lamnaarbetsgivardeklaration/tekniskbeskrivningochtesttjanst/tekniskbeskrivning11181.4.7eada0316ed67d7282a791.html?q=arbetsgivardeklaration+p%C3%A5+individniv%C3%A5)
- [Skatteverket: SINK 22,5 procent från 1 januari 2026](https://www.skatteverket.se/privat/internationellt/bosattutomlands/sinksarskildinkomstskattforutomlandsbosatta.4.6fdde64a12cc4eee23080002583.html)
- [Skatteverket: A-SINK 15 procent](https://www.skatteverket.se/foretag/etjansterochblanketter/svarpavanligafragor/asink/foretagsinkfaq/vilkaartisterochidrottsutovareskabetalasarskildinkomstskattsakalladartistskattasinkochhurhogarskatten.5.1f4b0dc10351b8449e8000491.html)
- [Skatteverket: arbetsgivaravgifter 31,42 procent](https://www.skatteverket.se/arbetsgivaravgifter)
- [Skatteverket: växa-stöd 10,21 procent](https://www.skatteverket.se/foretag/arbetsgivare/arbetsgivaravgifterochskatteavdrag/vaxastod/reglerforvaxastod.4.361dc8c15312eff6fd37447.html)
- [Riksdagen: lag (1991:1047) om sjuklön](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-19911047-om-sjuklon_sfs-1991-1047/)
- [Riksdagen: semesterlag (1977:480)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/semesterlag-1977480_sfs-1977-480wa/)
- [Kronofogden: förbehållsbelopp vid löneutmätning 2026](https://kronofogden.se/download/18.5c4ba41019aea6f4b848e49/1765269231911/Kronofogdemyndighetens-allmanna-rad-om-bestammande-av-forbehallsbeloppet-vid-loneutmatning-under-ar-2026.pdf)
- [Bankgirot: teknisk information om tjänsten Löner/Bg Lön](https://www.bankgirot.se/tjanster/utbetalningar/loner/teknisk-information/)
- [BAS: kontogrupper 70-76 personalkostnader](https://www.bas.se/wp-content/uploads/2017/06/Bokslutsboken_Provlas.pdf)
- [Skatteverket: försäkringar och sjukvårdsförsäkring som skattepliktig förmån](https://www.skatteverket.se/foretag/arbetsgivare/lonochersattning/formaner/forsakringar.4.3016b5d91791bf546791aa9.html)
- [Skatteverket: personalvårdsförmån, motion och friskvård](https://www.skatteverket.se/foretag/arbetsgivare/lonochersattning/formaner/personalvardsformanmotionochfriskvard.4.3016b5d91791bf546791431.html)

## Verified Reality

- `verified reality` Payroll bygger immutable input snapshots och fingerprints i runtime. Proof: `packages/domain-payroll/src/index.mjs:2137-2255`, `2322-2335`.
- `verified reality` Official 2026 skattetabeller och engångsskatt är inlästa i runtime via `packages/domain-payroll/src/skatteverket-tax-tables.mjs`.
- `verified reality` Tax decision snapshots och employer contribution decision snapshots finns som verkliga runtime-objekt. Proof: `packages/domain-payroll/src/index.mjs:904-1031`, `1033-1233`, `10067-10238`.
- `verified reality` Benefits, travel och pension konsumeras in i payrollkedjan och blir payroll lines. Proof: `packages/domain-payroll/src/index.mjs:7034-7159`.
- `verified reality` Expense reimbursement hålls isär från travel receipt VAT och travel allowance-spår. Proof: `packages/domain-travel/src/index.mjs:537-555`, `773-840`.
- `verified reality` Sjuklön dag 2-14 och karensavdrag finns i runtime. Proof: `packages/domain-payroll/src/index.mjs:7787-7910`.
- `verified reality` Semesterregler, semestertillägg och semesterskuld finns i runtime. Proof: `packages/domain-payroll/src/index.mjs:8148-8851`.
- `verified reality` Negative net pay blir explicit receivable i stället för att tappas bort helt. Proof: `packages/domain-payroll/src/index.mjs:10702-10713`.
- `verified reality` Employee receivable settlement, offset och write-off finns i runtime. Proof: `packages/domain-payroll/src/index.mjs:1512-1740`, `4140-4218`.
- `verified reality` Payroll migration, validation, diff gating och finalize har verkliga testade paths. Proof: `tests/unit/phase19-payroll-migration.test.mjs`, `tests/integration/phase19-payroll-migration-api.test.mjs`.
- `verified reality` Trial guards finns och blockerar live AGI-submit utan provider-backed transport. Proof: `tests/unit/phase12-payroll-trial-guards.test.mjs`, `tests/integration/phase12-payroll-trial-guards-api.test.mjs`.

## Partial Reality

- `partial reality` Repo:t innehåller en verklig payrollmotor, inte bara en previewmotor, men flera live-kritiska kedjor är fortfarande för grunda.
- `partial reality` Municipality/table-bäring finns, men canonical governance för municipality -> table -> kolumn -> beslut -> AGI-fält -> ledger är inte tillräckligt låst.
- `partial reality` Employer contribution-motorn hanterar viktiga regimer, men fler specialfall, date cutovers och rulepack-linjer behöver hårdare legal låsning.
- `partial reality` Benefits/travel/pension är verkliga konsumtionskedjor, men liveklassning tillåter fortfarande manuella värderingsvägar.
- `partial reality` Payout, bank match och migration fungerar tekniskt, men svensk banklönefil, payroll-specific bankretur och slutlig BAS-fördelning är inte go-live-säkra.

## Legacy

- `legacy` Gamla fas-8/9/12-runbooks och seed/demo-artifacts beskriver delar av payroll som om de vore bindande sanning. De är nu bara verifieringsunderlag.
- `legacy` `manual_rate` och ändra fallbackmönster lever kvar i schema, runtime och testspår från äldre designbeslut.
- `legacy` Placeholder cleanup-migrationen innehåller grovkornig kontoallokering som ser färdig ut men bara ersätter äldre placeholders.

## Dead Code

- `dead` Ingen payrollspecifik `ReturnedSalaryPayment`- eller `PayrollBankReturn`-domänkedja hittades. Endast generisk banking-return finns i `packages/domain-banking/src/index.mjs:1732-1779`.
- `dead` Ingen förstaklassig `FinalPayCase`-modell finns; final pay är fortfarande ett justeringsfält i ordinär pay run.
- `dead` Ingen verifierad live transportkedja för AGI submit finns i protected runtime; nuvarande live path kastar explicit fel.

## Misleading / False Completeness

- `misleading` `PAY_RUN_STATUSES` i runtime är bara `calculated` och `approved`, medan DB och runtime i övrigt antyder en längre produktionskedja. Proof: `packages/domain-payroll/src/index.mjs:25`.
- `misleading` `PAYROLL_TAX_MODES` tillåter fortfarande `manual_rate` i live-affärsmodellen. Proof: `packages/domain-payroll/src/index.mjs:29`, `13793-13815`.
- `misleading` AGI build-kedjan ser versionsstyrd ut men mappingen i DB är fortfarande grova buckets i stället för full fältkodsrad. Proof: `packages/db/migrations/20260321210000_phase8_payroll_tax_agi.sql:30-43`.
- `misleading` `regeneratePaySlip` låter som regenerering från immutable truth men återanvänder lagrad render payload. Proof: `packages/domain-payroll/src/index.mjs:2365-2382`.
- `misleading` placeholder cleanup-migrationen ser ut som slutlig BAS-mappning men hårdkodar ett fåtal konton för ett mycket större payrolluniversum. Proof: `packages/db/migrations/20260325033000_phase8_payroll_placeholder_cleanup.sql:25-43`.
- `misleading` payrollmutationer körs i API huvudsakligen bakom `company.manage`, trots att domänen i prompt och tester beskriver high-risk-review, dual control och step-up. Proof: `apps/api/src/server.mjs:2581-4710`, `11860-19103`.

## Pay Item / Calendar / Pay Run / Final Pay Findings

### D10-001
- severity: critical
- kategori: pay_run / final_pay
- exakt problem: final pay är fortfarande `finalPayAdjustments[]` i ordinär pay run i stället för en förstaklassig slutlönekedja.
- varför det är farligt: semesterersättning, benefits stop, kvarstående avdrag, receivable-offset, AGI-effekt och payout kan inte styras, granskas och rättas som en separat regulatorisk kedja.
- exakt filpath: `packages/domain-payroll/src/index.mjs`
- radreferens om möjligt: `2018`, `2060`, `2144`, `2208`, `8911-8969`, `12818-12846`
- rekommenderad riktning: bygg `FinalPayCase`, `FinalPayFreeze`, `FinalPaySettlementLine`, `BenefitsStopDecision`, `FinalPayAgiTreatment`.
- status: rewrite

### D10-002
- severity: high
- kategori: pay_run / state_machine
- exakt problem: runtime exporterar bara `calculated` och `approved` som pay run-statusar.
- varför det är farligt: posting, payout, bankretur, correction och paid-state kan inte verifieras som canonical pay-run truth.
- exakt filpath: `packages/domain-payroll/src/index.mjs`
- radreferens om möjligt: `25`
- rekommenderad riktning: normalisera `PayRun: draft -> calculated -> approved -> posted -> payout_prepared -> paid | corrected | reversed`.
- status: rewrite

### D10-003
- severity: medium
- kategori: payslip / reproducibility
- exakt problem: payslip-regenerering bygger inte upp från immutabel input truth.
- varför det är farligt: gamla eller manipulerade render payloads kan se ut som sann lönespecifikation utan att kunna reproduceras från source snapshots.
- exakt filpath: `packages/domain-payroll/src/index.mjs`
- radreferens om möjligt: `2365-2382`
- rekommenderad riktning: regenerera från pay-run fingerprint, upstream snapshots, rulepacks och line-trace.
- status: rewrite

## Tax Decision / Tax Table / Engångsskatt / SINK / A-SINK Findings

### D10-004
- severity: critical
- kategori: tax_mode / live_path
- exakt problem: ordinary tax kan fortfarande köras via `manual_rate` och fallback `manual_rate`.
- varför det är farligt: live-lön kan få fel skatt utan pinned official table, decision eller jämkningsbeslut.
- exakt filpath: `packages/domain-payroll/src/index.mjs`
- radreferens om möjligt: `29`, `333`, `9225-9275`, `9374`, `13793-13815`
- rekommenderad riktning: förbjud `manual_rate` i protected/live ordinary tax; tillåt bara dual-reviewed emergency lane med incident/support-case/evidence.
- status: rewrite

### D10-005
- severity: critical
- kategori: agi / field_mapping
- exakt problem: AGI mapping i DB och runtime är bucket-baserad i stället för fältkod-/rutbaserad.
- varför det är farligt: samma bucket kan motsvara flera juridiskt olika AGI-fält med olika validerings- och rättelsekrav.
- exakt filpath: `packages/db/migrations/20260321210000_phase8_payroll_tax_agi.sql`
- radreferens om möjligt: `7-43`
- rekommenderad riktning: bygg `AgiFieldMappingBaseline` med fältkod, ruta, giltighetsfönster, beloppstyp, jämförelseregler och correction lineage.
- status: rewrite

### D10-006
- severity: high
- kategori: sink / a_sink
- exakt problem: tax-mode-modellen särskiljer inte full canonical SINK och A-SINK-modell i profile/schema.
- varför det är farligt: beslut, procentsats, AGI-spår och audit kan bli sammanblandade eller reducerade till generell specialskatt.
- exakt filpath: `packages/domain-payroll/src/index.mjs`
- radreferens om möjligt: `29`, `13793-13815`
- rekommenderad riktning: separera `ordinary_table`, `engangsskatt`, `jamkning_fixed`, `jamkning_percentage`, `sink`, `a_sink`.
- status: rewrite

## Employer Contribution / Age Transition Findings

### D10-007
- severity: high
- kategori: contribution / rulepack
- exakt problem: motorn stöder flera regimer men governance mot official rate set, year cutover och employer-category lineage är inte komplett låst i DB och API.
- varför det är farligt: mid-year age transitions, youth restart och växa-stöd kan beräknas rätt i vissa tester men inte vara revisionssäkra över hela kedjan.
- exakt filpath: `packages/domain-payroll/src/index.mjs`
- radreferens om möjligt: `10067-10238`, `13316-13558`
- rekommenderad riktning: bygg pinned `EmployerContributionRulepackVersion`, explicit date cutover tables och receipt med legal basis.
- status: harden

### D10-008
- severity: medium
- kategori: pension / special_payroll_tax
- exakt problem: särskild löneskatt för pensionskostnader ligger kvar som hårdkodad procentsats i runtime.
- varför det är farligt: rate drift mellan tax year och runtime kan ge fel kostnad och fel BAS/AGI-linjering.
- exakt filpath: `packages/domain-pension/src/index.mjs`
- radreferens om möjligt: `25`, `337`, `418`, `739`, `912-917`
- rekommenderad riktning: flytta procentsatsen till official rulepack med tax-year pinning och evidence ref.
- status: harden

## Benefits / Travel / Pension / Salary Exchange Findings

### D10-009
- severity: high
- kategori: benefits / classification
- exakt problem: centrala benefits stödjer fortfarande `manual_taxable_value` som normal metod.
- varför det är farligt: bilförmån, drivmedelsförmån, sjukvårdsförsäkring, gåvor och friskvård kan bli manuellt värderade i live utan pinned official värderingsregel.
- exakt filpath: `packages/domain-benefits/src/index.mjs`
- radreferens om möjligt: `89-94`, `734`, `858`, `942`, `1018`, `1098`, `1165`
- rekommenderad riktning: gör official formula/policy path obligatorisk i live och isolera manuellt värde till exception lane.
- status: rewrite

### D10-010
- severity: medium
- kategori: travel / reimbursement
- exakt problem: travelkedjan separerar kostnadsersättning från VAT, men official schablon- och maxgränser är inte visade som pinned rulepack i runtime evidence.
- varför det är farligt: traktamente, milersättning och utlägg kan bli tekniskt separerade men ändå skattemässigt fel över tid.
- exakt filpath: `packages/domain-travel/src/index.mjs`
- radreferens om möjligt: `537-555`, `773-840`
- rekommenderad riktning: bygg `TravelTaxRulepackVersion` med schabloner, land/period-regler, tidsgränser och evidensrefs.
- status: harden

## Sick Pay / Qualifying Deduction / Vacation Findings

### D10-011
- severity: medium
- kategori: sick_pay / vacation
- exakt problem: sjuklön och semester är verklig runtime men line trace mot legal basis, HR-snapshot, agreement-resolution och ledger-effect är inte fullständigt förstaklassig.
- varför det är farligt: rättelser och supportförklaringar blir svagare än regelkedjan kräver.
- exakt filpath: `packages/domain-payroll/src/index.mjs`
- radreferens om möjligt: `7787-7910`, `8148-8851`
- rekommenderad riktning: lägg till canonical line trace med legal basis, input refs, agreement refs, leave refs och posting refs.
- status: harden

## Negative Net Pay / Employee Receivable / Returned Payment Findings

### D10-012
- severity: high
- kategori: receivable / transparency
- exakt problem: `cashNetPayAmount` klipper nettolönen till minst noll samtidigt som receivable skapas.
- varför det är farligt: negativ nettolön döljs i vissa ytor om receivable-truth inte följer med överallt, vilket kan skapa felaktig support- och anställdbild.
- exakt filpath: `packages/domain-payroll/src/index.mjs`
- radreferens om möjligt: `10702-10713`
- rekommenderad riktning: exponera signed net pay, receivable share, recovery-plan och settlement status i samma canonical projection.
- status: harden

### D10-013
- severity: critical
- kategori: bank_return / payout_failure
- exakt problem: payroll saknar egen returned salary payment- och bankreturmodell.
- varför det är farligt: returer efter lönutbetalning kan inte bokas, remitteras, återkrävas eller köras om via kontrollerad payroll truth.
- exakt filpath: `packages/domain-payroll/src/index.mjs`
- radreferens om möjligt: ingen träff för payrollspecifik modell; endast generiskt banking-spår i `packages/domain-banking/src/index.mjs:1732-1779`
- rekommenderad riktning: bygg `ReturnedSalaryPayment`, `PayoutFailureDecision`, `RepayoutRequest`, `ReceivableFromReturnedPayout`.
- status: rewrite

## Garnishment / Remittance Findings

### D10-014
- severity: high
- kategori: garnishment / override
- exakt problem: garnishment decision types tillåter `manual_override`.
- varför det är farligt: löneutmätning och prioritetsordning får inte kunna styras av vanlig manuallane utan strikt authority snapshot, second review och evidence.
- exakt filpath: `packages/domain-payroll/src/index.mjs`
- radreferens om möjligt: `51`, `1215`
- rekommenderad riktning: isolera manual override till emergency lane, knyt till beslut, incident, ändra granskarens receipt och tydlig reason code.
- status: harden

## AGI Build / Field Mapping / Correction / Submission Findings

### D10-015
- severity: critical
- kategori: agi / submit_transport
- exakt problem: protected/live AGI submit är inte implementerad mot riktig provider-backed transport.
- varför det är farligt: hela AGI-kedjan kan se klar ut i UI och tests utan att inlämning till Skatteverket existerar i produktion.
- exakt filpath: `packages/domain-payroll/src/index.mjs`
- radreferens om möjligt: `2553-2558`
- rekommenderad riktning: bygg riktig regulated-submission transport med signering, receipt-ingest, statuspolling, error classes och correction linkage.
- status: replace

### D10-016
- severity: high
- kategori: agi / corrections
- exakt problem: correctionkedjan finns, men fältnivårättelser och borttag/rätt-igen-spår mot Skatteverkets specifikationsnummer och individuppgift är inte modellat som canonical object.
- varför det är farligt: rättelser kan bli payload-versioner utan exakt regulatorisk semantik för borttag, ersättning och impact på totalsummor.
- exakt filpath: `packages/domain-payroll/src/index.mjs`
- radreferens om möjligt: `2480-2670`, `5714-5739`
- rekommenderad riktning: bygg `AgiCorrectionCase`, `AgiFieldDelta`, `AgiReplacementReference`, `AgiRemovalReference`.
- status: rewrite

## Payroll Posting / Payout / Bank Match Findings

### D10-017
- severity: critical
- kategori: posting / bas_mapping
- exakt problem: BAS-/ledger-mappningen i cleanup-migrationen är för grov och blandar många rättsligt olika lönefall på samma konton.
- varför det är farligt: bokföring, avstämning, AGI-förklaring, semester- och skuldspår samt årsavslut kan bli fel trots att runtime verkar fungera.
- exakt filpath: `packages/db/migrations/20260325033000_phase8_payroll_placeholder_cleanup.sql`
- radreferens om möjligt: `25-43`, `50-68`
- rekommenderad riktning: ersätt med regelstyrd `PayrollPostingProfile` per legal form, löneart, motkonto, skuldtyp, semesterfall, förmånstyp och pensionstyp.
- status: replace

### D10-018
- severity: high
- kategori: payout / bank_format
- exakt problem: payout batch export är inte verifierad som svensk banklönefil enligt Bankgirots tekniska manual.
- varför det är farligt: utbetalningsfil kan fungera i tester men vara ogiltig eller ofullständig mot faktisk bankkanal.
- exakt filpath: `packages/domain-payroll/src/index.mjs`
- radreferens om möjligt: `3761-3768`
- rekommenderad riktning: bygg rail-specifik export per betalrail, börja med riktig Bg Lön-fil med formatvalidering och exempelfilstester.
- status: replace

## Payroll Input Snapshot / Dependency Consumption Findings

### D10-019
- severity: medium
- kategori: dependency_consumption / traceability
- exakt problem: payroll konsumerar snapshots från HR/time/balances/agreements/benefits/travel/pension men all downstream trace till varje payroll line är inte fullständig.
- varför det är farligt: support, audit, retro diff och parallel-run blir svårare att förklara och kontrollera.
- exakt filpath: `packages/domain-payroll/src/index.mjs`
- radreferens om möjligt: `7034-7159`, `2137-2255`
- rekommenderad riktning: bygg line-level `PayrollInputConsumptionTrace`.
- status: harden

## Migration / Parallel Run / Diff Findings

### D10-020
- severity: medium
- kategori: migration / proof_depth
- exakt problem: migration och parallel-run har verkliga testade paths, men full coverage för YTD, semester, receivable, garnishment och AGI-diff är inte tydligt låst i en enda canonical cutoff-modell.
- varför det är farligt: go-live kan få green migration trots luckor i historik eller diff-regler.
- exakt filpath: `tests/unit/phase19-payroll-migration.test.mjs`, `tests/integration/phase19-payroll-migration-api.test.mjs`
- radreferens om möjligt: verifierat via testutfall 2026-04-02
- rekommenderad riktning: bygg `PayrollCutoverBaseline`, `PayrollParallelRunDiffProfile`, `AcceptedVariancePolicy`.
- status: harden

## Security / Review / Step-Up / Trial Guard Findings

### D10-021
- severity: critical
- kategori: authz / step_up
- exakt problem: payroll high-risk mutation routes använder i huvudsak `permissionCode: "company.manage"` utan tydligt krav på fresh step-up eller dual control i route-lagret.
- varför det är farligt: kritiska mutationer som tax decisions, receivable write-off, garnishment override, payout batch och AGI-state kan göras med för bred åtkomstmodell.
- exakt filpath: `apps/api/src/server.mjs`
- radreferens om möjligt: `2581-4710`, `11860-19103`
- rekommenderad riktning: inför explicit `payroll.high_risk.manage`, `payroll.approve`, `payroll.garnishment.manage`, `payroll.agi.submit`, `payroll.payout.manage` med step-up och SoD-gates.
- status: rewrite

### D10-022
- severity: medium
- kategori: trial_guard / fake_live
- exakt problem: trial guards fungerar, men domänen innehåller fortfarande seed/demo- och fake-live-spår i runbooks och seeds som kan förväxlas med bindande produktionssanning.
- varför det är farligt: green test paths kan feltolkas som verklig live readiness.
- exakt filpath: `packages/db/seeds/*phase8*`, `packages/db/seeds/*phase9*`, `docs/runbooks/fas-8-*`, `docs/runbooks/fas-9-*`
- radreferens om möjligt: domänövergripande spår
- rekommenderad riktning: klassificera, isolera och arkivera alla demo/seed-sanningar som inte är explicit test-only.
- status: archive

## Concrete Payroll Verification Matrix

| capability | claimed payroll/tax/AGI rule | actual runtime path | proof in code/tests | official source used where needed | status | blocker |
|---|---|---|---|---|---|---|
| ordinary tax tables | official tabellskatt ska drivas av rätt municipality/table/column | `packages/domain-payroll/src/skatteverket-tax-tables.mjs`, tax resolver i `packages/domain-payroll/src/index.mjs:9225-9383` | `tests/unit/phase12-tax-decision-snapshots.test.mjs` | Skatteverket skattetabeller, SKV 401 | partial reality | `manual_rate` finns kvar |
| engångsskatt | engångsskatt ska vara separat från ordinary table tax | same tax resolver + baseline file | `tests/unit/phase12-tax-decision-snapshots.test.mjs` | Skatteverket skattetabeller, SKV 401 | partial reality | AGI-fältkedjan inte full |
| SINK | 22,5 procent från 2026 med beslutsstyrning | statutory profile / tax snapshot path | ingen full canonical SINK-chain verifierad | Skatteverket SINK | partial reality | schema särskiljer inte fullt |
| A-SINK | 15 procent för artist/idrottsmän | ingen full explicit A-SINK-object model hittad | ingen direkt A-SINK-test funnen | Skatteverket A-SINK | partial reality | separat modell saknas |
| arbetsgivaravgifter | full avgift 31,42 procent och reduceringar efter regelmodell | `packages/domain-payroll/src/index.mjs:10067-10238`, `13316-13558` | `tests/unit/phase12-employer-contribution-decisions.test.mjs`, API-test | Skatteverket arbetsgivaravgifter, SKV 401, växa-stöd | partial reality | rulepack/durable basis behöver hårdnas |
| växa-stöd | 10,21 procent upp till rätt gräns och period | employer contribution decision path | samma tester som ovan | Skatteverket växa-stöd, SKV 401 | partial reality | tax-account lifecycle ej full |
| sjuklön/karens | sjuklön dag 2-14 och karensavdrag ska följa lag | `packages/domain-payroll/src/index.mjs:7787-7910` | `tests/unit/phase12-sick-pay-automation.test.mjs` | Sjuklönelagen | verified reality | line trace saknas |
| semester | semesterlön, ersättning, sparade dagar, skuld | `packages/domain-payroll/src/index.mjs:8148-8851` | `tests/unit/phase12-vacation-automation.test.mjs` | Semesterlagen | partial reality | final pay-kedja saknas |
| receivable | negative net pay ska skapa receivable | `packages/domain-payroll/src/index.mjs:10702-10713`, `1512-1740` | `tests/unit/phase12-employee-receivables.test.mjs`, API-test | ingen extern källa behövs utöver bokförings-/arbetsrättslig korrekthet | verified reality | signed net pay måste visas tydligare |
| bankretur | returned salary payment ska bli skuld/ny payout/ombokning | ingen payrollspecifik path | inget payrollspecifikt test funnet | Bankgirot teknisk manual | misleading | saknas helt |
| garnishment | beslut, förbehållsbelopp, remittering och korrigering | `packages/domain-payroll/src/index.mjs`, garnishment-paths | `tests/unit/phase12-garnishment-remittances.test.mjs`, API-test | Kronofogden 2026 | partial reality | manual_override finns kvar |
| AGI build | AGI måste vara fältkodsriktig och korrigerbar | `packages/domain-payroll/src/index.mjs`, migration `20260321210000...sql` | `tests/unit/phase12-agi-hardening.test.mjs`, e2e `phase8-payroll-tax-agi-flow` | Skatteverket AGI teknisk beskrivning | partial reality | field-level model saknas |
| AGI submit | live submit måste gå via riktig transport | live path kastar fel i `packages/domain-payroll/src/index.mjs:2553-2558` | `tests/unit/phase12-payroll-trial-guards.test.mjs` visar block | Skatteverket AGI teknisk beskrivning | misleading | riktig transport saknas |
| payout export | svensk banklönefil måste vara railspecifik | `packages/domain-payroll/src/index.mjs:3761-3768` | inga formatvaliderade bankfiltester | Bankgirot teknisk manual | partial reality | riktig filspec saknas |
| migration/parallel run | YTD, diff, rollback och finalize ska vara säkra | migration runtime + phase19 tests | `tests/unit/phase19-payroll-migration.test.mjs`, `tests/integration/phase19-payroll-migration-api.test.mjs` | inga externa källor krävs | verified reality | diffprofil behöver breddas |

## Critical Findings

- D10-001 final pay är inte first-class.
- D10-004 ordinary tax tillåter `manual_rate` i live-modellen.
- D10-005 AGI mapping är bucket-baserad i stället för fältkodsriktig.
- D10-013 payrollspecifik returned salary payment/bankretur saknas.
- D10-015 riktig AGI submit-transport saknas.
- D10-017 BAS-/ledger-mappningen är för grov.
- D10-021 payroll high-risk routes saknar tydligt step-up-/SoD-lager.

## High Findings

- D10-002 pay run-state machine är för grund.
- D10-006 SINK/A-SINK-modellen är inte tillräckligt explicit.
- D10-007 employer contribution governance behöver hårdnas.
- D10-009 benefits tillåter `manual_taxable_value`.
- D10-012 signed negative net pay riskerar att döljas i vissa projections.
- D10-014 garnishment har `manual_override`.
- D10-016 AGI-correction saknar full canonical modell.
- D10-018 payout export är inte verifierad som svensk banklönefil.

## Medium Findings

- D10-003 payslip regeneration bygger inte från immutable truth.
- D10-008 special payroll tax för pension är hårdkodad.
- D10-010 travel tax rulepack är inte pinned som official truth.
- D10-011 line-level legal trace saknas för sjuklön/semester.
- D10-019 dependency consumption trace är inte fullständig.
- D10-020 migration/cutover-diffprofil behöver breddas.
- D10-022 seed/demo/runbook-sanningar måste arkiveras eller märkas test-only.

## Low Findings

- Payout/posting statusmaskiner i DB är för korta och bör normaliseras.
- Runbooks bör delas i bindande rebuild-runbooks och legacy-runbooks för att minska falsk trygghet.

## Cross-Domain Blockers

- Domän 6 måste leverera riktig bank- och tax-account-truth för payout/bankretur.
- Domän 8 måste leverera låsta HR/time/balance snapshots för semester, sjuklön och final pay.
- Domän 9 måste leverera agreement-resolution per datum med payroll line trace.
- Domän 12 måste leverera riktig regulated-submission transport för AGI live submit.
- Domän 16 måste leverera support/replay- och incidentgränser för payroll corrections, AGI replay och bankreturärenden.

## Go-Live Blockers

- ordinary tax kan fortfarande gå via `manual_rate`
- AGI fältkodsriktig modell saknas
- riktig AGI live submit saknas
- first-class final pay saknas
- payrollspecifik bankretur/returned salary payment saknas
- BAS-/lönekontomodellen är för grov
- payroll high-risk authz/step-up är för svag
- svensk banklönefil är inte verifierad

## Repo Reality Vs Intended Payroll Model

Repo:t innehåller en verklig svensk lönekärna med riktiga snapshots, tax decisions, employer contribution decisions, semester, sjuklön, receivables, AGI-versioner och migration. Det är mer än en teknisk approximation.

Repo:t är ändå inte go-live-säkert för svensk lön, skatt, AGI och bokföring. De största orsakerna är att live paths fortfarande tillåter manuella fallbackmönster, att AGI inte är modellerad på fältkods-/rutnivå, att slutlön och bankreturer inte är förstaklassiga payrollkedjor, att BAS-/lönekontomappningen är för grov och att high-risk payrollmutationer inte har tillräckligt tydligt step-up-/SoD-skydd i route-lagret.

Total klassning: `partial reality`.
