# DOMAIN_27_ROADMAP

## mal

Bygg Domän 27 till den bindande sanningsdomän som exhaustivt bevisar att varje supportat affärs- och regelverksscenario ger:
- rätt objekttillstand
- rätt verifikat
- rätt BAS-konton
- rätt moms-/AGI-/skattekontoeffekt
- rätt rapport- och exportutfall
- rätt correction-/replay-/reversal-beteende

## varfor domänen behovs

Utan denna domän kan plattformen se korrekt ut i enskilda motorer men ando vara fel i verkliga kedjor. Resultatet blir:
- kundfakturor som fungerar funktionellt men bokfars på fel konto eller med fel moms
- levfakturor och kvitton som passerar review men ger fel AP-/kostnads-/momsutfall
- lanekorningar som ser grana ut men ger fel AGI-fält, fel BAS-lanekonto eller fel receivable-/garnishmentutfall
- exports och rapporter som inte exakt matchar intern ledger truth
- corrections, credits, replay och migration som skapar tyst drift

## bindande tvärdomänsunderlag

- `UTLAGG_OCH_VIDAREFAKTURERING_BINDANDE_SANNING.md` är canonical source för alla employee outlay-, customer disbursement-, reinvoice-, advance-, owner-related- och reimbursementscenarier som Domän 27 ska exekvera och verifiera.
- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` är canonical source för alla evidence bundles, approvals, sign-off packages, support reveal, break-glass events och operatorbeslut som Domän 27 måste verifiera.
- `MIGRATION_PARALLELLKORNING_CUTOVER_OCH_ROLLBACK_BINDANDE_SANNING.md` är canonical source för alla source-binding-, importbatch-, parallel-run-, cutover-, watch-window-, rollback- och fail-forward-scenarier som Domän 27 måste verifiera.
- `SCENARIOPROOF_OCH_BOKFORINGSBEVIS_BINDANDE_SANNING.md` är canonical source för scenario registry, fixtureklasser, expected outcomes, mismatch governance, proof bundles och accounting signoff i Domän 27.
- `STRESS_CHAOS_RECOVERY_OCH_ADVERSARIAL_BINDANDE_SANNING.md` är canonical source för load profiles, chaos experiments, recovery drills, adversarial scenarios, stop conditions och readiness verdicts i Domän 27 och 28.
- `SEARCH_ACTIVITY_NOTIFICATIONS_OCH_WORKBENCHES_BINDANDE_SANNING.md` är canonical source för search/workbench visibility, activity timelines, notifications och freshnessproof som Domän 27 måste verifiera.
- `BOKFORINGSSIDA_OCH_FINANCIAL_WORKBENCH_BINDANDE_SANNING.md` är canonical source för bokföringssidan, financial workbench, snapshot-/as-of-scope, state badges, drilldowns, export-CTA, masking, reveal och accounting-sidans expected read behavior som Domän 27 måste verifiera.
- `DIMENSIONER_OBJEKT_OCH_SIE_MAPPNING_BINDANDE_SANNING.md` är canonical source för dimensionstyper, objekttyper, obligatoriska dimensionsregler, objektmappning, SIE-objektfamiljer och roundtrip utan informationsförlust som Domän 27 måste verifiera.
- `SUPPORT_BACKOFFICE_INCIDENTS_OCH_REPLAY_BINDANDE_SANNING.md` är canonical source för support, incident, replay, dead-letter, no-go och quarantine-scenarier som Domän 27 måste verifiera.
- `BAS_KONTOPOLICY_BINDANDE_SANNING.md` är canonical source för BAS-kontofamiljer, defaultkonton, control accounts och blocked overrides som Domän 27 måste verifiera.
- `BAS_LONEKONTOPOLICY_BINDANDE_SANNING.md` är canonical source för BAS-lönekonton, payroll-liability-ankare, accrual anchors och employee-receivable-kontoankare som Domän 27 måste verifiera.
- `MOMSRUTEKARTA_BINDANDE_SANNING.md` är canonical source för momsrutekarta, reverse-charge box mapping, importboxar, replacement declarations och VAT box lineage som Domän 27 måste verifiera.
- `SKATTEKONTOMAPPNING_BINDANDE_SANNING.md` är canonical source för `1630`-mirror, authority-event-klassning, payroll/VAT-clearing mot skattekonto, HUS/grön-offsets och blocked unknown authority events som Domän 27 måste verifiera.
- `VERIFIKATIONSSERIER_OCH_BOKFORINGSPOLICY_BINDANDE_SANNING.md` är canonical source för verifikationsserier, voucher identity, reservationsluckor, correction policy, posting date policy och SIE4-serieparitet som Domän 27 måste verifiera.
- `VALUTA_OMRAKNING_OCH_KURSDIFFERENS_BINDANDE_SANNING.md` är canonical source för redovisningsvaluta, rate-source policy, omräkningsdatum, FX gain/loss, period-end valuation och rounding som Domän 27 måste verifiera.
- `LEGAL_REASON_CODES_OCH_SPECIALTEXTPOLICY_BINDANDE_SANNING.md` är canonical source för legal reason codes, specialtexter, 0%-anledningar, reverse-charge-texter, HUS/grön claim-basis och blocked issuance utan legal basis som Domän 27 måste verifiera.
- `KUNDINBETALNINGAR_OCH_KUNDRESKONTRA_BINDANDE_SANNING.md` är canonical source för alla customer open-item-, incoming payment-, overpayment-, customer advance-, PSP-, factoring-, dispute- och refundscenarier som Domän 27 ska exekvera och verifiera.
- `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md` är canonical source för alla ingest-, OCR-, classification-, duplicate-, routing- och review-scenarier som Domän 27 ska exekvera och verifiera.

- `FAKTURAFLODET_BINDANDE_SANNING.md` är canonical source för alla invoice-scenarier som Domän 27 ska exekvera och verifiera.
- `LEVFAKTURAFLODET_BINDANDE_SANNING.md` är canonical source för alla supplier-invoice-, supplier-credit-, import- och purchase-VAT-scenarier som Domän 27 ska exekvera och verifiera.
- `LEVERANTORSBETALNINGAR_OCH_LEVERANTORSRESKONTRA_BINDANDE_SANNING.md` är canonical source för alla leverantörsreskontra-, supplier-advance-, AP-payment-, AP-return-, fee-, FX-, netting- och other supplier-settlement-scenarier som Domän 27 ska exekvera och verifiera.
- `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md` är canonical source för alla bankkonto-, statementimport-, owner-binding-, bankavstämnings-, fee-, interest-, internal-transfer-, duplicate- och blocked-bankline-scenarier som Domän 27 ska exekvera och verifiera.
- `MOMSFLODET_BINDANDE_SANNING.md` är canonical source för alla momsscenarier som Domän 27 ska exekvera och verifiera, inklusive box truth, periodisk sammanställning, OSS, replacement declarations, importmoms, avdragsrätt och `BOX49`-integritet.
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` är canonical source för alla voucher-, grundbok-, huvudbok-, verifikationsserie-, kontrollkonto-, correction chain-, period lock- och SIE4-voucherscenarier som Domän 27 ska exekvera och verifiera.
- `PERIODISERING_OCH_BOKSLUTSOMFORINGAR_BINDANDE_SANNING.md` är canonical source för alla upplupet-, förutbetalt-, cutoff-, closing-adjustment-, reversal- och simplification-scenarier som Domän 27 ska exekvera och verifiera.
- `ANLAGGNINGSTILLGANGAR_OCH_AVSKRIVNINGAR_BINDANDE_SANNING.md` är canonical source för alla capitalization-, depreciation-, impairment-, disposal-, CIP- och fixed-asset-note-scenarier som Domän 27 ska exekvera och verifiera.
- `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md` är canonical source för alla inventory valuation-, count shortage/surplus-, inkurans-, ownership boundary-, varukostnads- och blocked LIFO/negative-stock-scenarier som Domän 27 ska exekvera och verifiera.
- `INKOP_VARUMOTTAG_OCH_LEVERANSMATCHNING_BINDANDE_SANNING.md` är canonical source för alla procurement request-, PO-, goods receipt-, ownership acceptance-, 2-way/3-way match-, invoice-before-receipt-, damaged receipt- och duplicate receipt-scenarier som Domän 27 ska exekvera och verifiera.
- `ORDER_OFFERT_AVTAL_TILL_FAKTURA_BINDANDE_SANNING.md` är canonical source för alla quote-, agreement-, order-, change-order-, billing-trigger-, cancellation- och invoice-handoff-scenarier som Domän 27 ska exekvera och verifiera.
- `PROJEKT_WIP_INTAKTSAVRAKNING_OCH_LONSAMHET_BINDANDE_SANNING.md` är canonical source för alla project root-, WIP-, recognition-, billable readiness- och profitability-scenarier som Domän 27 ska exekvera och verifiera.
- `ARBETSORDER_TID_MATERIAL_OCH_FAKTURERBARHET_BINDANDE_SANNING.md` är canonical source för alla work-order-, time capture-, material capture-, signoff-, billable evidence- och invoice-handoff-scenarier som Domän 27 ska exekvera och verifiera.
- `KVITTOFLODET_BINDANDE_SANNING.md` är canonical source för alla receipt-scenarier som Domän 27 ska exekvera och verifiera, inklusive receipt-driven momsavdrag, gross-cost-only-fall, representation, personbil, digitalt bevarande, duplicate detection och merchant refunds.
- `LONEFLODET_BINDANDE_SANNING.md` är canonical source för alla pay calendar-, payroll input snapshot-, pay run-, payslip-, correction-, final pay-, employee receivable-, payout readiness- och payroll replay-scenarier som Domän 27 ska exekvera och verifiera.
- `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md` är canonical source för alla pay item catalog-, line effect class-, BAS-lönekonto-, liability anchor-, deduction anchor-, receivable anchor- och payroll accrual-scenarier som Domän 27 ska exekvera och verifiera.
- `PRELIMINARSKATT_OCH_SKATTETABELLER_BINDANDE_SANNING.md` är canonical source för alla ordinary table-, one-time tax-, jämkning-, SINK-, A-SINK-, no-tax certificate- och emergency-manual-scenarier som Domän 27 ska exekvera och verifiera.
- `ARBETSGIVARAVGIFTER_OCH_SPECIALREGLER_BINDANDE_SANNING.md` är canonical source för alla full-rate-, 67+-, 1937- eller tidigare-, youth-reduction-, växa- och international-special-case-scenarier som Domän 27 ska exekvera och verifiera.
- `FORMANER_OCH_FORMANSBESKATTNING_BINDANDE_SANNING.md` är canonical source för alla benefit classification-, taxable-vs-tax-free-, valuation-, ownership- och no-double-booking-scenarier som Domän 27 ska exekvera och verifiera.
- `RESOR_TRAKTAMENTE_OCH_MILERSATTNING_BINDANDE_SANNING.md` är canonical source för alla tjänsterese-, traktaments-, meal-reduction-, tremanaders-, milersättnings- och travel-handoff-scenarier som Domän 27 ska exekvera och verifiera.
- `PENSION_OCH_LONEVAXLING_BINDANDE_SANNING.md` är canonical source för alla pensionspremie-, salary-exchange-, top-up-, special-pension-tax- och pension-handoff-scenarier som Domän 27 ska exekvera och verifiera.
- `SEMESTER_SEMESTERSKULD_OCH_SEMESTERERSATTNING_BINDANDE_SANNING.md` är canonical source för alla semesterårs-, intjänings-, sparad-dag-, sammalon-, procentregel-, förskottssemester-, semesterersättnings- och semesterskuldsscenarier som Domän 27 ska exekvera och verifiera.
- `SJUKLON_KARENS_OCH_FRANVARO_BINDANDE_SANNING.md` är canonical source för alla sjukperiod-, karens-, deltidsfrånvaro-, läkarintyg-, högriskskydds- och dag-15-transition-scenarier som Domän 27 ska exekvera och verifiera.
- `LONEUTMATNING_OCH_ANDRA_MYNDIGHETSAVDRAG_BINDANDE_SANNING.md` är canonical source för alla löneutmatnings-, authority-order-, remittance-, irregular-payout- och blocked-authority-scenarier som Domän 27 ska exekvera och verifiera.
- `NEGATIV_NETTOLON_OCH_EMPLOYEE_RECEIVABLE_BINDANDE_SANNING.md` är canonical source för alla negativ-netto-, employee-receivable-, payroll-settlement-, bankrepayment- och blocked-setoff-scenarier som Domän 27 ska exekvera och verifiera.
- `LONEUTBETALNING_OCH_BANKRETURER_BINDANDE_SANNING.md` är canonical source för alla payout-batch-, settlement-, partial-batch-, bankretur- och liability-reopen-scenarier som Domän 27 ska exekvera och verifiera.
- `AGI_FLODET_BINDANDE_SANNING.md` är canonical source för alla AGI-period-, huvuduppgifts-, individuppgifts-, receipt-, correction-, removal- och absence-transfer-scenarier som Domän 27 ska exekvera och verifiera.
- `AGI_FALTKARTA_OCH_RATTELSER_BINDANDE_SANNING.md` är canonical source för alla AGI-faltrute-, skattefalta-, huvuduppgiftssumme-, fuel-benefit-, checkbox- och unsupported-mapping-scenarier som Domän 27 ska exekvera och verifiera.
- `ROT_RUT_HUS_FLODET_BINDANDE_SANNING.md` är canonical source för alla HUS-overlay-, split-invoice-, payment-gate-, claim-, decision-, payout-, tax-account-offset-, denial- och recovery-scenarier som Domän 27 ska exekvera och verifiera.
- `GRON_TEKNIK_FLODET_BINDANDE_SANNING.md` är canonical source för alla grön-teknik-overlay-, split-invoice-, installationstype-, payment-gate-, claim-, payout-, tax-account-offset-, cash-method-VAT-, denial- och recovery-scenarier som Domän 27 ska exekvera och verifiera.
- `ARSBOKSLUT_ARSREDOVISNING_OCH_INK2_BINDANDE_SANNING.md` är canonical source för alla hard-close-, årsredovisnings-, fastställelseintygs-, INK2-, uppskjuten-skatt- och filing-scenarier som Domän 27 ska exekvera och verifiera.
- `AGARUTTAG_UTDELNING_KU31_OCH_KUPONGSKATT_BINDANDE_SANNING.md` är canonical source för alla utdelningsbesluts-, owner-equity-source-, KU31-, kupongskatte-, avstämningsbolags- och owner-payout-scenarier som Domän 27 ska exekvera och verifiera.
- `SIE4_IMPORT_OCH_EXPORT_BINDANDE_SANNING.md` är canonical source för alla SIE type 4-, voucherexport-, voucherimport-, `#RAR`-, `#KONTO`-, `#VER`-, `#TRANS`-, dimensionsmetadata- och parity-evidence-scenarier som Domän 27 ska exekvera och verifiera.
- `RAPPORTER_MOMS_AGI_RESKONTRA_HUVUDBOK_BINDANDE_SANNING.md` är canonical source för alla momsrapport-, periodisk-sammanställnings-, AGI-underlags-, reskontra-, huvudboks-, verifikationsliste- och financial-statement-scenarier som Domän 27 ska exekvera och verifiera.
- `PEPPOL_EDI_OCH_OFFENTLIG_EFAKTURA_BINDANDE_SANNING.md` är canonical source för alla Peppol BIS Billing 3-, offentlig-e-faktura-, endpoint-, transport-receipt-, duplicate- och structured-inbound-scenarier som Domän 27 ska exekvera och verifiera.
- `OCR_REFERENSER_OCH_BETALFORMAT_BINDANDE_SANNING.md` är canonical source för alla OCR-, checksiffre-, Bg Max-, incoming-payment-file-, supplier-payment-file-, salary-payment-file- och provider-version-scenarier som Domän 27 ska exekvera och verifiera.
- `PARTNER_API_WEBHOOKS_OCH_ADAPTERKONTRAKT_BINDANDE_SANNING.md` är canonical source för alla partner-API-, adapterkontrakts-, webhook-, callback-, signature-, duplicate- och schema-versionsscenarier som Domän 27 ska exekvera och verifiera.
- `IDENTITET_AUTH_MFA_OCH_BEHORIGHET_BINDANDE_SANNING.md` är canonical source för alla auth-, MFA-, session-, passkey-, OIDC-, SAML-, permission-, support-reveal- och step-up-scenarier som Domän 27 ska exekvera och verifiera.
- `SECRETS_KMS_HSM_OCH_KRYPTERING_BINDANDE_SANNING.md` är canonical source för alla secrets-, key-lineage-, KMS-, HSM-, envelope-encryption-, decrypt-boundary- och rotation-scenarier som Domän 27 ska exekvera och verifiera.

## faser

- Fas 27.1 invariant catalog / scenario registry hardening
- Fas 27.2 accounting proof ledger / expected outcome model hardening
- Fas 27.3 accounts receivable scenario matrix hardening
- Fas 27.4 accounts payable / receipts / OCR scenario matrix hardening
- Fas 27.5 VAT / banking / tax account scenario matrix hardening
- Fas 27.6 payroll / AGI / benefits / travel / pension / garnishment scenario matrix hardening
- Fas 27.7 HUS / annual / corporate tax / owner distributions scenario matrix hardening
- Fas 27.8 project / field / WIP / profitability scenario matrix hardening
- Fas 27.9 export / report / SIE4 parity hardening
- Fas 27.10 migration / correction / replay parity hardening
- Fas 27.11 official-source baseline / BAS-account mapping hardening
- Fas 27.12 execution harness / blocker governance / coverage gates hardening
- Fas 27.13 doc / runbook / legacy purge och slutlig scenario signoff

## dependencies

- Domän 3 för ledger foundation, BAS, legal form, fiscal year, accounting method och SIE4
- Domän 4 för ÄR
- Domän 5 för AP, kvitton, OCR och expense intake
- Domän 6 för VAT, banking och tax account
- Domän 10 för payroll och AGI
- Domän 11 för HUS, annual, corporate tax och owner distributions
- Domän 14 för projekt, WIP, field och profitability
- Domän 15 för migration, cutover, replay och rollback
- Domän 16 för support, replay, dead letters och runbook execution

## vad som för koras parallellt

- 27.3-27.8 kan delvis byggas parallellt när 27.1-27.2 är lasta.
- 27.9 kan ga parallellt med 27.3-27.8 när proof ledger-formatet är last.
- 27.10 kan ga parallellt med 27.9 efter att scenario-id och expected-outcome-format är lasta.
- 27.11 kan ga parallellt med hela scenariomatriskedjan när source-pack-formatet är last.

## vad som inte för koras parallellt

- 27.3-27.13 får inte markas klara före 27.1 och 27.2.
- 27.9 får inte markas klar före att varje tidigare scenariofamilj har expected postings.
- 27.10 får inte markas klar före 27.3-27.9.
- 27.12 får inte markas klar före att alla scenariofamiljer är materialiserade.
- 27.13 får inte markas klar före alla tidigare delfaser.

## exit gates

- canonical `ScenarioCatalog` finns
- canonical `AccountingProofLedger` finns
- varje supportad funktion är mappad till minst ett scenario och alla kanda edge cases
- green status kraver exakt match mellan expected och actual accounting/report/export outcome
- scenario coverage, missing coverage och blocker severity är first-class
- canonical runbooks för scenario execution, mismatch review och signoff finns

## test gates

- scenario får inte bli gran utan expected journal lines
- scenario får inte bli gran utan expected BAS account mapping
- scenario får inte bli gran utan expected VAT/AGI/report/export fields där relevant
- scenario får inte bli gran om actual och expected skiljer på konto, belopp, riktning, period eller tax field
- hela scenariofamiljer ska faila om coverage eller edge-case-krav inte uppfylls

## accounting-proof gates

- varje scenario måste ha immutable `scenarioId`
- varje scenario måste röra source data pack
- varje scenario måste röra expected object-state outcome
- varje scenario måste röra expected ledger lines
- varje scenario måste röra expected regulatory outcome
- varje scenario måste röra expected report/export outcome
- avvikelse i nagon del blockerar green

## bas / regulatoriska kall-gates

- varje scenariofamilj måste peka på officiell källa eller officiell vägledning
- BAS-kontomappning måste vara uttrycklig per scenariofamilj
- lanekonton och AGI-fält måste vara explicit mappade i payrollscenarier
- SIE4-export måste verifieras mot officiell filspecifikation

## markeringar

- keep
- harden
- rewrite
- replace
- migrate
- archive
- remove

## delfaser

### Delfas 27.1 invariant catalog / scenario registry hardening
- markering: create
- dependencies:
  - blockerar hela resten av Fas 27
- exit gates:
  - `ScenarioCatalog`, `ScenarioFamily`, `ScenarioCase`, `ScenarioCoverageMatrix` finns
- konkreta verifikationer:
  - varje supportad capability är mappad till scenariofamilj
  - varje scenario har severity om det saknas eller fallerar
- konkreta tester:
  - registry completeness tests
  - duplicate scenario id deny tests
  - coverage matrix generation tests
- konkreta kontroller vi måste kunna utfora:
  - skriva ut alla supportade scenarier och alla saknade scenarier utan manuell sammanställning

### Delfas 27.2 accounting proof ledger / expected outcome model hardening
- markering: create
- dependencies:
  - 27.1
- exit gates:
  - `AccountingProofLedger`, `ExpectedJournalSet`, `ExpectedRegulatoryOutcome`, `ExpectedExportOutcome` finns
- konkreta verifikationer:
  - green scenario nekas utan expected ledger lines
  - mismatch på konto eller belopp blockerar green
- konkreta tester:
  - expected-versus-actual ledger diff tests
  - rounding tolerance deny tests
  - report/export mismatch tests
- konkreta kontroller vi måste kunna utfora:
  - ta ett scenario-id och se exakt expected vs actual journal/ruta/fält/exportrad

### Delfas 27.3 accounts receivable scenario matrix hardening
- markering: rewrite
- dependencies:
  - 27.1
  - 27.2
- exit gates:
  - komplett ÄR-scenariomatriz finns för draft, issue, send, partial payment, overpayment, underpayment, credit, partial credit, cancellation, write-off, recurring, project invoice, HUS invoice, foreign currency
- konkreta verifikationer:
  - varje scenario har expected ÄR, revenue, VAT, rounding och settlement outcome
  - credits och write-offs ger exakt expected reversals
- konkreta tester:
  - exhaustive ÄR scenario suite
  - receivable aging parity suite
  - invoice-to-payment-to-credit proof suite
- konkreta kontroller vi måste kunna utfora:
  - valja ett fakturascenario och se exakt verifikatkedja, reskontraeffekt och momsutfall

### Delfas 27.4 accounts payable / receipts / OCR scenario matrix hardening
- markering: rewrite
- dependencies:
  - 27.1
  - 27.2
- exit gates:
  - komplett AP-/kvitto-/OCR-matriz finns för PO, non-PO, delmottag, differens, kreditnota, duplikat, mixed VAT, expense reimbursement, company-paid, periodisering, asset purchase, foreign currency
- konkreta verifikationer:
  - varje scenario har expected AP, expense, VAT, accrual och asset outcome
  - OCR-confidence och review-beslut poverkar inte ledgern tyst
- konkreta tester:
  - exhaustive AP scenario suite
  - OCR review and reclassification suite
  - receipt VAT and reimbursement separation suite
- konkreta kontroller vi måste kunna utfora:
  - ta ett kvitto eller levfakturascenario och se exakt kostnadskonto, moms, leverantörssaldo och review lineage

### Delfas 27.5 VAT / banking / tax account scenario matrix hardening
- markering: rewrite
- dependencies:
  - 27.1
  - 27.2
- exit gates:
  - komplett matrix finns för VAT boxes, reporting periods, tax account events, bank matching, split/partial payments, fees, refunds, returns, OCR settlements, HUS tax-account effects
- konkreta verifikationer:
  - varje scenario har expected momsruta, bankhandelse, tax account outcome och ledger bridge
- konkreta tester:
  - VAT box parity suite
  - bank reconciliation scenario suite
  - tax account scenario suite
- konkreta kontroller vi måste kunna utfora:
  - ta ett bankscenario och se exakt bankmatch, fee handling, OCR reference och tax-account effect

### Delfas 27.6 payroll / AGI / benefits / travel / pension / garnishment scenario matrix hardening
- markering: rewrite
- dependencies:
  - 27.1
  - 27.2
- exit gates:
  - komplett payrollmatriz finns för manadslan, timlan, bonus, engångsskatt, retro, farmaner, pension, salary exchange, travel, sick pay, vacation, final pay, negative net pay, employee receivable, garnishment, SINK, A-SINK, jämkning, AGI original och rättelse
- konkreta verifikationer:
  - varje scenario har expected BAS-lanekonton, AGI-fält, tax decision outcome och bank/payout outcome
  - slutlan och bankretur är blockerande scenarier, inte optionella
- konkreta tester:
  - exhaustive payroll scenario suite
  - AGI field-level proof suite
  - payroll ledger and payout parity suite
- konkreta kontroller vi måste kunna utfora:
  - ta en lanekorning och skriva ut exakt laneart, konto, AGI-fält, skatt, avgift, receivable och payout outcome

### Delfas 27.7 HUS / annual / corporate tax / owner distributions scenario matrix hardening
- markering: rewrite
- dependencies:
  - 27.1
  - 27.2
- exit gates:
  - komplett matrix finns för HUS full/partial/credit/reject, annual inputs, corporate-tax inputs, owner distributions, KU31 och kupongskatt där relevant
- konkreta verifikationer:
  - varje scenario har expected receivable, liability, tax account, governance och reporting outcome
- konkreta tester:
  - exhaustive HUS lifecycle suite
  - owner distribution proof suite
  - annual/corporate-tax input suite
- konkreta kontroller vi måste kunna utfora:
  - ta ett HUS-scenario och se exakt kundfaktura, SKV-fordran, kredit- och skattekontoeffekt

### Delfas 27.8 project / field / WIP / profitability scenario matrix hardening
- markering: rewrite
- dependencies:
  - 27.1
  - 27.2
- exit gates:
  - komplett matrix finns för time/material/cost/revenue/WIP/change-order/field completion/profitability
- konkreta verifikationer:
  - inget scenario dubbelraknar kostnad eller intäkt mellan projekt, ÄR, AP, lan och lager
- konkreta tester:
  - WIP and profitability proof suite
  - field-to-invoice-to-ledger suite
  - change-order and commercial handoff suite
- konkreta kontroller vi måste kunna utfora:
  - ta ett projektjobb och se exakt hur tid, material, arbetsorder, faktura och WIP bokfars

### Delfas 27.9 export / report / SIE4 parity hardening
- markering: create
- dependencies:
  - 27.3
  - 27.4
  - 27.5
  - 27.6
  - 27.7
  - 27.8
- exit gates:
  - `ReportParitySuite`, `ExportParitySuite`, `SieProofBundle` finns
- konkreta verifikationer:
  - huvudbok, verifikationslista, momsrapport, reskontror, AGI-underlag och SIE4 matchar intern truth exakt
- konkreta tester:
  - SIE4 roundtrip proof suite
  - report-to-ledger parity suite
  - export artifact checksum suite
- konkreta kontroller vi måste kunna utfora:
  - ta ett scenario och se exakt vilka rapport- och exportartefakter som ska skapas och vad de måste innehålla

### Delfas 27.10 migration / correction / replay parity hardening
- markering: harden
- dependencies:
  - 27.3
  - 27.4
  - 27.5
  - 27.6
  - 27.7
  - 27.8
  - 27.9
- exit gates:
  - samma scenariomatriz kan koras på migrerad data, corrected data och replayed data
- konkreta verifikationer:
  - migrated and replayed outcomes match canonical proof ledger
  - correction skapar inte dubbla postings eller falsk report drift
- konkreta tester:
  - migration parity suite
  - correction and replay proof suite
  - post-cutover accounting parity suite
- konkreta kontroller vi måste kunna utfora:
  - jamfora pre-cutover, post-cutover och corrected scenario outcome utan manuell diffning

### Delfas 27.11 official-source baseline / BAS-account mapping hardening
- markering: create
- dependencies:
  - 27.1
  - 27.2
- exit gates:
  - `OfficialSourcePack`, `BasAccountMappingSet`, `RegulatoryFieldMappingSet` finns
- konkreta verifikationer:
  - varje scenariofamilj länkar till officiell källa
  - varje scenariofamilj har explicit BAS- och regulatorisk faltmappning
- konkreta tester:
  - source-pack completeness tests
  - missing-source deny tests
  - missing-account-map deny tests
- konkreta kontroller vi måste kunna utfora:
  - ta ett scenario och se exakt vilka officiella källor och vilka konton/fält som styr det

### Delfas 27.12 execution harness / blocker governance / coverage gates hardening
- markering: create
- dependencies:
  - 27.1-27.11
- exit gates:
  - `ScenarioExecutionRun`, `ScenarioFailureRecord`, `CoverageGapRecord`, `ScenarioReadinessVerdict` finns
- konkreta verifikationer:
  - missing scenario eller failed scenario ger blocker severity
  - green readiness nekas om coverage gap återstar
- konkreta tester:
  - full harness orchestration tests
  - severity propagation tests
  - readiness deny tests
- konkreta kontroller vi måste kunna utfora:
  - kora hela scenariofamiljer och fa exakt blockerlista, coverage gap och readiness verdict

### Delfas 27.13 doc / runbook / legacy purge och slutlig scenario signoff
- markering: rewrite
- dependencies:
  - 27.1-27.12
- exit gates:
  - canonical runbooks för scenario execution, mismatch triage, accounting signoff, export parity och replay parity finns
  - gamla verification-docs är nedgraderade till consumers eller archive
- konkreta verifikationer:
  - inga gamla grana phase-dokument används som primary truth
  - scenario signoff kraver named owners från finance, payroll, tax och operations där relevant
- konkreta tester:
  - docs truth lint
  - runbook existence lint
  - signoff completeness lint
- konkreta kontroller vi måste kunna utfora:
  - visa exakt vilka docs som är canonical, vilka som är consumers och vilka som ska bort


