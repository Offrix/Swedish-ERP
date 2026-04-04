# MASTER_DOMAIN_IMPLEMENTATION_LIBRARY

## Syfte

Detta dokument ska spegla `MASTER_DOMAIN_ROADMAP.md` 1:1.
Varje fas och delfas ska beskriva exakt vad som ska byggas, i vilken modell, med vilka invariants och med vilka beviskrav.

## Globala byggregler

- varje domän måste ha entydig source of truth
- reglerade beräkningar ska versioneras med rulepacks och provider baselines
- trial/live/support/migration ska hållas isär i execution boundaries
- high-risk writes ska vara command-only, auditkritiska och replaybara
- UI för aldrig röra domänlogik
- snapshots för aldrig uppgraderas till primär truth om canonical model krävs
- stubbar, simulatorer och fake-live paths för aldrig räknas som färdig implementation
- bindande dokumenttext måste vara fri från mojibake, replacement-tecken och odefinierade `?` mitt i ord
- indexparitet mellan `BINDANDE_SANNING_INDEX.md` och faktiska `_BINDANDE_SANNING.md`-filer måste verifieras efter varje ny bibel eller varje borttagning
- varje bindande sanningsbibel måste fortsatt validera mot 39-sektionsstandarden i `BINDANDE_SANNING_STANDARD.md`

## Bindande tvärdomänsdokument

- `BINDANDE_SANNING_INDEX.md` är bindande totalindex för alla sanningsbiblar; ingen fas eller delfas får luta på en bibel som inte finns i indexet.
- `BINDANDE_SANNING_STANDARD.md` är bindande meta-sanning för varje nytt `_BINDANDE_SANNING.md`; alla nya flödesbiblar måste ha samma sektionsordning, samma proof-nivå, samma blockerregler och samma expected-outcome-hardhet som fakturabibeln.
- `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md` är bindande tvärdomänssanning för all dokumentingest, original binary capture, OCR, AI fallback, confidence, review, duplicate detection, downstream routing och unknown-document blocking.
- `UTLAGG_OCH_VIDAREFAKTURERING_BINDANDE_SANNING.md` är bindande tvärdomänssanning för anställdsutlägg, reseforskott, kundutlägg, vidarefakturering av eget inköp, employee reimbursement liability, owner-related claims och invoice handoff mellan utlägg och seller-side faktura.
- `KUNDINBETALNINGAR_OCH_KUNDRESKONTRA_BINDANDE_SANNING.md` är bindande tvärdomänssanning för kundreskontra, incoming payments, overpayments, customer advances, refunds, PSP-fordringar, factoring och payment allocation.
- `FAKTURAFLODET_BINDANDE_SANNING.md` är bindande tvärdomänssanning för alla issue-, kundreskontra-, kredit-, betalallokerings-, momsrapporterings-, export- och scenarioverifieringsspar som rör kundfakturor.
- `LEVFAKTURAFLODET_BINDANDE_SANNING.md` är bindande tvärdomänssanning för alla ingest-, coding-, matchnings-, AP-postings-, purchase-side momsrapporteringsspar och skapandet av AP-open-items som rör leverantörsfakturor.
- `LEVERANTORSBETALNINGAR_OCH_LEVERANTORSRESKONTRA_BINDANDE_SANNING.md` är bindande tvärdomänssanning för leverantörsreskontra efter posting, supplier advances, AP-betalningar, AP-returer, netting, fees, FX och annan supplier settlement-truth.
- `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md` är bindande tvärdomänssanning för bankkonto, statementimport, bankline identity, owner binding, bankavstämning, bankavgifter, ränteposter, interna överföringar, duplicate replay och bank-owned legal effect.
- `MOMSFLODET_BINDANDE_SANNING.md` är bindande tvärdomänssanning för momsscenariokoder, momsrutor, periodisk sammanställning, OSS, avdragsrätt, importmoms, replacement declarations, period locks och all slutlig momsrapporterings-truth.
- `SKATTEKONTOFLODET_BINDANDE_SANNING.md` är bindande tvärdomänssanning för skattekonto, `1630`-mirror, inbetalningar, debiteringar, återbetalningar, ränta, anstånd, utbetalningsspärr, authority receipts och all slutlig tax-account-truth.
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` är bindande tvärdomänssanning för verifikationer, grundbok, huvudbok, verifikationsserier, kontrollkonton, correction chains, period locks, öppningsbalanser, SIE4-vouchers och all slutlig ledger-truth.
- `PERIODISERING_OCH_BOKSLUTSOMFORINGAR_BINDANDE_SANNING.md` är bindande tvärdomänssanning för upplupet, förutbetalt, bokslutscutoff, interimskonton, closing adjustments, reversal schedules och all slutlig periodiserings-truth.
- `ANLAGGNINGSTILLGANGAR_OCH_AVSKRIVNINGAR_BINDANDE_SANNING.md` är bindande tvärdomänssanning för asset capitalization, pågående nyanläggning, avskrivningsplaner, nedskrivning, utrangering, disposal och all slutlig fixed-asset-truth.
- `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md` är bindande tvärdomänssanning för inventory ownership, valuation method, count sessions, inkurans, varukostnad, stock adjustments, closing snapshots och all slutlig inventory carrying-value-truth.
- `INKOP_VARUMOTTAG_OCH_LEVERANSMATCHNING_BINDANDE_SANNING.md` är bindande tvärdomänssanning för procurement request, purchase order, supplier commitment, goods receipt, putaway, ownership acceptance, receipt variances och 2-way/3-way match.
- `ORDER_OFFERT_AVTAL_TILL_FAKTURA_BINDANDE_SANNING.md` är bindande tvärdomänssanning för quote, agreement, order, change order, billing trigger, cancellation och commercial handoff till fakturaflödet.
- `ABONNEMANG_OCH_ATERKOMMANDE_FAKTURERING_BINDANDE_SANNING.md` är bindande tvärdomänssanning för recurring charge schedules, renewals, proration, paus, termination och recurring handoff till fakturaflödet.
- `PROJEKT_WIP_INTAKTSAVRAKNING_OCH_LONSAMHET_BINDANDE_SANNING.md` är bindande tvärdomänssanning för project roots, WIP, intäktsavräkning, billable readiness och lönsamhet.
- `ARBETSORDER_TID_MATERIAL_OCH_FAKTURERBARHET_BINDANDE_SANNING.md` är bindande tvärdomänssanning för work orders, time capture, material consumption, customer signoff, billable evidence och invoice handoff.
- `KVITTOFLODET_BINDANDE_SANNING.md` är bindande tvärdomänssanning för all receipt capture, receipt-ingest, receipt-driven kostnadsbokning, company-card/cash/debit-receipts, representation på köparsidan, personbilskvitton, gross-cost-only-fall, digitalt receipt-bevarande och receipt-driven momsrapportering.
- `LONEFLODET_BINDANDE_SANNING.md` är bindande tvärdomänssanning för pay calendars, immutable payroll input snapshots, pay runs, payslips, corrections, final pay, employee receivables, payroll posting handoff, payout readiness och payroll replay/cutover truth.
- `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md` är bindande tvärdomänssanning för canonical pay item catalog, line effect classes, BAS-lönekonton, liability anchors, deduction anchors, employee receivable anchors, accrual anchors och payroll account-profile truth.
- `PRELIMINARSKATT_OCH_SKATTETABELLER_BINDANDE_SANNING.md` är bindande tvärdomänssanning för ordinarie tabellskatt, engångsskatt, jämkning, SINK, A-SINK, no-tax certificates, emergency-manual-tax och frozen tax-decision truth.
- `ARBETSGIVARAVGIFTER_OCH_SPECIALREGLER_BINDANDE_SANNING.md` är bindande tvärdomänssanning för arbetsgivaravgifter, 67+-, 1937- eller tidigare, tillfälliga nedsättningar, växa-stöd, contribution basis och frozen contribution-decision truth.
- `FORMANER_OCH_FORMANSBESKATTNING_BINDANDE_SANNING.md` är bindande tvärdomänssanning för benefit classification, taxable vs tax-free benefits, valuation evidence, no-double-booking mellan receipt/AP och payroll, benefit payroll handoff och förmånsspecifik replay truth.
- `RESOR_TRAKTAMENTE_OCH_MILERSATTNING_BINDANDE_SANNING.md` är bindande tvärdomänssanning för tjänsteresa, traktamente, nattraktamente, måltidsreduktion, tremånadersreduktion, milersättning, tax-free vs taxable travel replacement och travel payroll handoff.
- `PENSION_OCH_LONEVAXLING_BINDANDE_SANNING.md` är bindande tvärdomänssanning för pensionspremier, salary exchange, top-up policy, special löneskatt på pensionskostnader och pension payroll handoff.
- `SEMESTER_SEMESTERSKULD_OCH_SEMESTERERSATTNING_BINDANDE_SANNING.md` är bindande tvärdomänssanning för semesterårslogik, intjänande, betalda och obetalda dagar, sparade dagar, sammalöneregeln, procentregeln, semesterlön, semesterersättning, förskottssemester och semesterskuld.
- `SJUKLON_KARENS_OCH_FRANVARO_BINDANDE_SANNING.md` är bindande tvärdomänssanning för sjukperiod dag 1-14, karensavdrag, deltidsfrånvaro, läkarintyg, högriskskydd, övergång dag 15 till Försäkringskassan och payroll handoff för sjuklön.
- `LONEUTMATNING_OCH_ANDRA_MYNDIGHETSAVDRAG_BINDANDE_SANNING.md` är bindande tvärdomänssanning för löneutmatning, myndighetsbeslut, remittering, oregelbundna utbetalningar under beslut och liability-truth mot myndighet.
- `NEGATIV_NETTOLON_OCH_EMPLOYEE_RECEIVABLE_BINDANDE_SANNING.md` är bindande tvärdomänssanning för negativ nettolön, employee receivable, payroll settlement, bankåterbetalning och blockerad kvittning.
- `LONEUTBETALNING_OCH_BANKRETURER_BINDANDE_SANNING.md` är bindande tvärdomänssanning för payout batch, settlement receipt, partial batch, bankretur, reopened payroll liability och reissue-truth.
- `AGI_FLODET_BINDANDE_SANNING.md` är bindande tvärdomänssanning för AGI-period, huvuduppgift, individuppgifter, specifikationsnummer, receipt, correction, removal och frånvarouppgiftens transportgräns.
- `AGI_FALTKARTA_OCH_RATTELSER_BINDANDE_SANNING.md` är bindande tvärdomänssanning för AGI-faltrutor, skattefalt, huvuduppgiftssummor, fuel-benefit-logik, checkbox-rutor, correction på faltniva och blockerad unsupported AGI-mappning.
- `ROT_RUT_HUS_FLODET_BINDANDE_SANNING.md` är bindande tvärdomänssanning för HUS-overlay, delad faktura, elektronisk kundbetalning, claim-version, beslut, state payout eller tax-account-offset, delavslag, avslag och recovery.
- `GRON_TEKNIK_FLODET_BINDANDE_SANNING.md` är bindande tvärdomänssanning för grön-teknik-overlay, split invoice, installationstyper, rulepack-satser, elektronisk kundbetalning, claim-version, beslut, payout eller tax-account-offset, cash-method VAT och recovery.
- `ARSBOKSLUT_ARSREDOVISNING_OCH_INK2_BINDANDE_SANNING.md` är bindande tvärdomänssanning för hard close, årsredovisningspaket, K2/K3-klassning, årsredovisning, fastställelseintyg, INK2, INK2R, INK2S, uppskjuten skatt, skatt på årets resultat och filing-truth mot Bolagsverket och Skatteverket.
- `AGARUTTAG_UTDELNING_KU31_OCH_KUPONGSKATT_BINDANDE_SANNING.md` är bindande tvärdomänssanning för utdelningsbeslut, eget kapital-källor, skuld till ägare, utbetalning, KU31, kupongskatt, kupongskatteinbetalning, avstämningsbolag och owner-distribution-truth.
- `SIE4_IMPORT_OCH_EXPORT_BINDANDE_SANNING.md` är bindande tvärdomänssanning för SIE typ 4, voucherexport, voucherimport, `#RAR`, `#KONTO`, `#VER`, `#TRANS`, dimensionsmetadata, migration via SIE4 och roundtrip/parity-evidence.
- `DIMENSIONER_OBJEKT_OCH_SIE_MAPPNING_BINDANDE_SANNING.md` är bindande tvärdomänssanning för dimensionstyper, objekttyper, obligatoriska dimensionsregler, objektmappning, SIE-objektfamiljer och roundtrip utan informationsförlust.
- `RAPPORTER_MOMS_AGI_RESKONTRA_HUVUDBOK_BINDANDE_SANNING.md` är bindande tvärdomänssanning för momsrapport, periodisk sammanställning, AGI-underlag, kundreskontra, leverantörsreskontra, huvudbok, grundbok, verifikationslista, balansrapport och resultatrapport.
- `PEPPOL_EDI_OCH_OFFENTLIG_EFAKTURA_BINDANDE_SANNING.md` är bindande tvärdomänssanning för Peppol BIS Billing 3, offentlig e-faktura, endpoint binding, structured inbound invoice, transport receipts, duplicate control och offentlig-sektor-delivery blockers.
- `OCR_REFERENSER_OCH_BETALFORMAT_BINDANDE_SANNING.md` är bindande tvärdomänssanning för OCR-referenser, 10-modul, hard eller soft OCR-kontroll, variabel eller fast längd, Bg Max, incoming payment files, supplier payment files, salary payment files och provider-versionerade bankformat.
- `PARTNER_API_WEBHOOKS_OCH_ADAPTERKONTRAKT_BINDANDE_SANNING.md` är bindande tvärdomänssanning för partner-API, adapterkontrakt, outbound partner requests, inbound webhooks, signature verification, idempotency, duplicate control och command-path-only routing.
- `IDENTITET_AUTH_MFA_OCH_BEHORIGHET_BINDANDE_SANNING.md` är bindande tvärdomänssanning för lokal auth, MFA, step-up, passkeys, OIDC, SAML, sessioner, permission boundaries, support reveal och high-risk access.
- `SECRETS_KMS_HSM_OCH_KRYPTERING_BINDANDE_SANNING.md` är bindande tvärdomänssanning för secrets, key lineage, KMS, HSM, envelope encryption, rotation, decrypt boundaries och cryptographic evidence.
- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` är bindande tvärdomänssanning för audit events, evidence artifacts, evidence bundles, approval requests, sign-off packages, break-glass receipts, support reveal, filing evidence och operatorbeslut med legal eller security effect.
- `MIGRATION_PARALLELLKORNING_CUTOVER_OCH_ROLLBACK_BINDANDE_SANNING.md` är bindande tvärdomänssanning för source bindings, capability receipts, extract manifests, canonical datasets, import batches, parallel run, cutover, watch window, rollback, fail-forward och migration parity.
- `SCENARIOPROOF_OCH_BOKFORINGSBEVIS_BINDANDE_SANNING.md` är bindande tvärdomänssanning för scenario registry, fixture classes, expected outcomes, proof bundles, mismatch findings, release gates och accounting proof signoff.
- `STRESS_CHAOS_RECOVERY_OCH_ADVERSARIAL_BINDANDE_SANNING.md` är bindande tvärdomänssanning för load profiles, chaos experiments, recovery drills, adversarial scenarios, stop conditions, readiness verdicts och prod-like resilience proof.
- `SEARCH_ACTIVITY_NOTIFICATIONS_OCH_WORKBENCHES_BINDANDE_SANNING.md` är bindande tvärdomänssanning för projection-driven search, activity timelines, notifications, saved views, workbench rows, freshness checkpoints och masking i läsytor.
- `BOKFORINGSSIDA_OCH_FINANCIAL_WORKBENCH_BINDANDE_SANNING.md` är bindande tvärdomänssanning för bokföringssidan, financial workbench, snapshot-/as-of-val, state badges, freshness badges, drilldowns, exportknappar, masking, reveal och command-CTA på accounting-sidan.
- `SUPPORT_BACKOFFICE_INCIDENTS_OCH_REPLAY_BINDANDE_SANNING.md` är bindande tvärdomänssanning för support cases, incidenter, dead letters, replay requests, correction orchestration, no-go board, quarantine och operatorstyrd recovery.
- `KONCERN_INTERCOMPANY_OCH_SHARED_SERVICES_BINDANDE_SANNING.md` är bindande tvärdomänssanning för group hierarchy, intercompany counterparties, intercompany settlements, shared-service allocations, treasury visibility och elimination inputs.
- `PORTALER_SIGNERING_INTAKE_OCH_EXTERN_SELVSERVICE_BINDANDE_SANNING.md` är bindande tvärdomänssanning för externa portaler, public forms, uploads, intake routing, signing envelopes, portal status och self-service actions.
- `BAS_KONTOPOLICY_BINDANDE_SANNING.md` är bindande tvärdomänssanning för canonical BAS-kontofamiljer, defaultkonton, control accounts, blocked overrides och konto-lineage för icke-löneposter.
- `BAS_KONTOPLAN_SOKFRASER_OCH_BOKNINGSINTENTION_BINDANDE_SANNING.md` är bindande tvärdomänssanning för account search, flerordsfraser, OCR-candidate generation, workbench-kandidater, manual kontosok och blocked auto-select vid tvetydig BAS-tolkning.
- `BAS_LONEKONTOPOLICY_BINDANDE_SANNING.md` är bindande tvärdomänssanning för BAS-lönekonton, payroll liabilities, accrual anchors, employee receivables och blocked payroll account overrides.
- `MOMSRUTEKARTA_BINDANDE_SANNING.md` är bindande tvärdomänssanning för momsrutor, box mapping, reverse-charge-boxar, importboxar, replacement declarations och VAT box lineage.
- `AGI_FALTKARTA_OCH_RATTELSER_BINDANDE_SANNING.md` är bindande tvärdomänssanning för AGI-faltrutor, skattefalt, huvuduppgiftssummor, checkbox-rutor, drivmedelsforman, correction på faltniva och blockerad unsupported AGI-mappning.
- `SKATTEKONTOMAPPNING_BINDANDE_SANNING.md` är bindande tvärdomänssanning för `1630`-mirror, authority-event-klassning, moms- och payroll-clearing mot skattekontot, HUS/grön-teknik-offset och blocked unknown authority events.
- `VERIFIKATIONSSERIER_OCH_BOKFORINGSPOLICY_BINDANDE_SANNING.md` är bindande tvärdomänssanning för verifikationsserier, voucher identity, reservationsluckor, correction policy, posting date policy och SIE4-serieparitet.
- `VALUTA_OMRAKNING_OCH_KURSDIFFERENS_BINDANDE_SANNING.md` är bindande tvärdomänssanning för redovisningsvaluta, valutakurskallor, omräkningsdatum, FX gain/loss, rounding och blocked missing rate lineage.
- `LEGAL_REASON_CODES_OCH_SPECIALTEXTPOLICY_BINDANDE_SANNING.md` är bindande tvärdomänssanning för 0%-anledningar, undantag från momsplikt, omvänd betalningsskyldighet, EU/exportreferenser, HUS/grön-teknik-specialtexter och blockerad issuance utan legal basis.
- Fas 5, 7, 13, 21, 27 och 28 får inte definiera egen avvikande scanning truth.
- Fas 4, 6, 11, 13, 15, 18 och 27 får inte definiera egen avvikande invoice truth.
- Fas 5, 6, 7, 15, 21 och 27 får inte definiera egen avvikande BAS-sökfras- eller candidate-ranking-truth.
- Fas 10, 15 och 27 får inte definiera egen avvikande payroll core truth eller egen avvikande BAS-lönekontotolkning.
- Fas 10, 15 och 27 får inte definiera egen avvikande preliminarskatte-, SINK-, A-SINK- eller jamkningstruth.
- Fas 10, 15 och 27 får inte definiera egen avvikande arbetsgivaravgifts-, youth-, växa- eller contribution-basis-truth.
- Fas 5, 10, 15 och 27 får inte definiera egen avvikande benefitklassning, förmånsvardering eller no-double-booking-truth.
- Fas 5, 10, 15 och 27 får inte definiera egen avvikande traktamente-, milersättnings-, måltidsreduktions- eller travel-handoff-truth.
- Fas 10, 15 och 27 får inte definiera egen avvikande pensionspremie-, salary-exchange-, top-up- eller pension-tax-truth.
- Fas 10, 15 och 27 får inte definiera egen avvikande semesterårslogik, intjänande, sammaloneregel, procentregel, förskottssemester eller semesterskuldstruth.
- Fas 10, 15 och 27 får inte definiera egen avvikande sjukloneperiod, karens, läkarintyg, högriskskydd eller sjuk-payroll-handoff-truth.
- Fas 10, 15 och 27 får inte definiera egen avvikande löneutmatnings-, myndighetsavdrags- eller authority-remittance-truth.
- Fas 10, 15 och 27 får inte definiera egen avvikande AGI-faltrutekarta, correction på faltniva eller unsupported-field-truth.
- Fas 10, 15 och 27 får inte definiera egen avvikande negativ-netto-, employee-receivable- eller kvittningstruth.
- Fas 10, 15 och 27 får inte definiera egen avvikande payroll-payout-, settlement- eller bankreturtruth.
- Fas 10, 15 och 27 får inte definiera egen avvikande AGI-period-, receipt-, correction- eller removal-truth.
- Fas 10, 15 och 27 får inte definiera egen avvikande AGI-faltrutor, skattefalt, huvuduppgiftssummor eller specialrutekarta.
- Fas 4, 11, 15 och 27 får inte definiera egen avvikande HUS-overlay-, claim-, payout-, denial- eller recovery-truth.
- Fas 4, 11, 15 och 27 får inte definiera egen avvikande grön-teknik-overlay-, claim-, payout-, cash-method-VAT- eller recovery-truth.
- Fas 11, 15 och 27 får inte definiera egen avvikande hard-close-, årsredovisnings-, uppskjuten-skatt-, INK2-, fastställelseintygs- eller filing-truth.
- Fas 11, 15 och 27 får inte definiera egen avvikande utdelningsbeslut-, owner-equity-source-, KU31-, kupongskatte-, avstämningsbolags- eller owner-payout-truth.
- Fas 6, 15 och 27 får inte definiera egen avvikande SIE4-, voucherexport-, voucherimport-, `#RAR`-, `#KONTO`-, `#VER`-, `#TRANS`- eller roundtrip-truth.
- Fas 3, 6, 13, 15 och 27 får inte definiera egen avvikande dimensions-, objekt-, SIE-objekt- eller roundtrip-truth.
- Fas 6, 10, 15 och 27 får inte definiera egen avvikande momsrapport-, periodisk-sammanställnings-, AGI-underlags-, reskontra-, huvudboks-, grundboks- eller financial-statement-truth.
- Fas 4, 6, 7 och 27 får inte definiera egen avvikande Peppol-, offentlig-e-faktura-, endpoint-, delivery-receipt-, structured-inbound- eller duplicate-truth.
- Fas 4, 6, 10 och 27 får inte definiera egen avvikande OCR-, reference-, Bg Max-, supplier-payment-file-, salary-payment-file- eller payment-format-truth.
- Fas 2, 5, 6, 7 och 27 får inte definiera egen avvikande partner-API-, webhook-, signature-, duplicate-, schema-version- eller adapterkontrakts-truth.
- Fas 2 och 27 får inte definiera egen avvikande auth-, MFA-, session-, passkey-, OIDC-, SAML-, permission- eller step-up-truth.
- Fas 2, 5, 7 och 27 får inte definiera egen avvikande secrets-, key-, KMS-, HSM-, envelope-encryption-, decrypt-boundary- eller rotation-truth.
- Fas 5, 10, 11, 15 och 27 får inte definiera egen avvikande audit-, evidence-, approval-, sign-off-, support-reveal- eller break-glass-truth.
- Fas 13, 15 och 27 får inte definiera egen avvikande source-binding-, cutover-, watch-window-, rollback-, fail-forward- eller migration-parity-truth.
- Fas 27 får inte definiera egen avvikande scenario-registry-, fixture-, expected-outcome-, mismatch- eller proof-bundle-truth.
- Fas 27 och 28 får inte definiera egen avvikande load-profile-, chaos-, recovery-, adversarial- eller readiness-truth.
- Fas 13, 16 och 27 får inte definiera egen avvikande projection-, freshness-, notification-, activity- eller workbench-truth.
- Fas 13, 15, 17 och 27 får inte definiera egen avvikande bokföringssida-, financial-workbench-, snapshot-badge-, drilldown-, export- eller reveal-truth.
- Fas 16 och 27 får inte definiera egen avvikande support-, incident-, replay-, dead-letter-, no-go- eller quarantine-truth.
- Fas 11, 15, 24 och 27 får inte definiera egen avvikande group-, intercompany-, shared-service-, treasury- eller elimination-input-truth.
- Fas 22 och 27 får inte definiera egen avvikande portal-, signerings-, upload-, intake- eller self-service-truth.
- Fas 4, 5, 6, 11, 15 och 27 får inte definiera egen avvikande BAS-kontofamiljer, defaultkonton, control-account-ankare eller overridepolicy.
- Fas 10, 15 och 27 får inte definiera egen avvikande BAS-lönekonton, payroll-liability-ankare, accrual anchors eller employee-receivable-kontoankare.
- Fas 4, 5, 6, 11, 15 och 27 får inte definiera egen avvikande momsrutekarta, reverse-charge-boxmappning, replacement-lineage eller VAT-box-truth.
- Fas 6, 10, 11, 15 och 27 får inte definiera egen avvikande `1630`-mirror, authority-event-klassning eller HUS/grön-offset-mappning.
- Fas 4, 6, 10, 15 och 27 får inte definiera egen avvikande verifikationsserie-, voucher identity- eller reservationslucke-truth.
- Fas 4, 5, 6, 13, 15 och 27 får inte definiera egen avvikande redovisningsvaluta-, rate-source-, kursdifferens- eller rounding-truth.
- Fas 4, 6, 11, 22 och 27 får inte definiera egen avvikande legal reason-code-, specialtext- eller structured legal-basis-truth.
- om en ny sanningsbibel tillkommer eller delas måste `BINDANDE_SANNING_INDEX.md` uppdateras innan libraryt får betrakta den som bindande.

## Tvargaende objekt

- `EvidenceBundle`
- `RulePackRegistry`
- `ProviderBaselineRegistry`
- `ExecutionBoundary`
- `ReplayReceipt`
- `SupportMaskingPolicy`

## Fas 0

### Delfas 0.1 Documentation Truth Lock

- bygg en enda aktiv sanningskedja under `docs/implementation-control/domankarta-rebuild/`
- alla gamla docs ska klassas, migreras, arkiveras eller raderas
- inget gammalt FINAL eller master-control för längre styra ett beslut

#### Exakt modell

- aktiva styrdokument i root ska vara:
  - `AGENTS.md`
  - `README.md`
  - `MASTER_DOMAIN_ROADMAP.md`
  - `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
  - `CODEX_SETTINGS_PROMPT.md`
- varje sadant dokument ska peka på samma rebuild-kedja
- inga gamla truth-dokument får ligga kvar som implicit defaultlasning

#### Invariansregler

- bara rebuild-dokument får ha aktiv styrningsroll
- root-dokument får inte peka på gammal sanning
- docs-truth-farandringar ska göras i samma ändringsset för root-dokumenten

### Delfas 0.2 Legacy Binding Downgrade

- klassificera hela gamla docs-tradet i kluster
- varje gammal bindningskalla ska fa exakt en reality-klass och exakt en atgardsstatus
- inga gamla docs för lamnas i halvt bindande lage

#### Exakt modell

- bygg `DocCluster(clusterId, pathPattern, realityClass, actionStatus)`
- bygg `BindingClaim(path, line, claimType, replacementPath)`
- klassificera minst:
  - `docs/implementation-control/*` utanför rebuild
  - `docs/master-control/*`
  - `docs/compliance/se/*`
  - `docs/domain/*`
  - `docs/policies/*`
  - `docs/test-plans/*`
  - `docs/ui/*`
  - `docs/runbooks/*`

#### Invariansregler

- inga gamla docs-kluster för röra aktiv bindningsstatus efter sanering
- alla gamla `Status: Binding/Bindande` ska antingen migreras, arkiveras eller tas bort

### Delfas 0.3 Surface Reality Map

- bygg en canonical surface map som skiljer mellan:
  - `verified runtime surface`
  - `verified shell surface`
  - `missing planned surface`
  - `historical imagined surface`

#### Exakt modell

- bygg `SurfaceRecord(surfaceCode, actualPath, surfaceClass, truthStatus, notes)`
- bygg `SurfaceReference(docPath, referencedSurface, actualExists)`
- las faktisk appkarta till:
  - `apps/api`
  - `apps/worker`
  - `apps/desktop-web`
  - `apps/field-mobile`

#### Invariansregler

- aktiv dokumentation får inte beskriva saknade appytor som verkliga
- shellar får inte kallas full produkt

### Delfas 0.4 Code And Runtime Classification

- klassificera alla starre kodkluster med reality-klass och atgardsstatus
- ingen kod för klassas som aktiv utan konkret koppling

#### Exakt modell

- bygg `CodeCluster(path, entrypointLinks, runtimeRole, realityClass, actionStatus)`
- bygg `RuntimeDependency(path, dependencyType, proof)`
- klassificera sarskilt:
  - `apps/api/src/platform.mjs`
  - `apps/api/src/server.mjs`
  - `apps/worker/src/worker.mjs`
  - `packages/domain-org-auth/src/index.mjs`
  - `packages/domain-core/src/crypto.mjs`
  - `packages/domain-core/src/secrets.mjs`
  - `scripts/lib/repo.mjs`
  - `packages/integration-core`
  - `packages/test-fixtures`
  - `src/swedish_erp_python`
  - `infra/terraform`
  - `infra/ecs`

#### Invariansregler

- placeholderkod får inte ligga kvar som `required` utan sarskild etikett
- dead kod får inte behallas utan retention- eller migrationsskal

### Delfas 0.5 Runtime Blocker Register

- bygg ett blockerregister som bör vidare protected/live-hinder till senare domäner

#### Exakt modell

- bygg `RuntimeBlocker(blockerCode, category, severity, fileRefs, remediation, domainImpact)`
- använd runtime honesty-scan som grund
- varje blocker ska peka på:
  - finding code
  - konkret kodfil
  - rekommenderad domänagare

#### Invariansregler

- inga senare domäner för ignorera öppna runtime-blockers som skor genom deras sanning
- blockerregistret ska bygga på faktisk kod och scan, inte bara dokumenttext

### Delfas 0.6 Test Truth Classification

- bygg ett test-truth-register för att skilja verklig runtime-signal från demo-, smoke- och stale-signal

#### Exakt modell

- bygg `TestTruthRecord(testPath, truthClass, runtimeMode, environmentSensitivity, actionStatus)`
- bygg `DemoRuntimeFamily(pattern, count, allowedUse, forbiddenUse)`
- skilj minst mellan:
  - `runtime`
  - `demo/test`
  - `smoke`
  - `metadata`
  - `environment-blocked`
  - `stale`

#### Invariansregler

- demo-runtime för aldrig räknas som protected/live-sanning
- stale path-tester för aldrig ligga i officiell readiness-kedja
- environment-blocked ska vara egen klass, inte samma som repo-fel

### Delfas 0.7 Script And Runbook Truth Classification

- bygg ett script/runbook truth registry

#### Exakt modell

- bygg `ScriptTruthRecord(path, scriptFamily, evidenceLevel, portabilityClass, actionStatus)`
- bygg `RunbookTruthRecord(path, runbookClass, pathPortability, truthStatus, actionStatus)`
- klassificera:
  - `lint`, `typecheck`, `build`, `security`
  - hela `verify-*.ps1`
  - runbooks med absoluta paths
  - runbooks med falskt bindningssprak

#### Invariansregler

- namn får inte oversälja bevisvarde
- aktiva runbooks måste vara repo-relativa och sanningsmassigt riktiga

### Delfas 0.8 False Completeness Map

- bygg en explicit karta över falska grana signaler

#### Exakt modell

- bygg `FalseCompletenessRecord(sourcePath, sourceType, illusionType, actualReality, requiredFix)`
- false completeness ska fangas i:
  - docs
  - kod
  - tester
  - scripts
  - runbooks

#### Invariansregler

- varje falsk signal måste ha minst en konkret motatgard i roadmap eller prune-map
- ingen grön signal för sta kvar utan etikett för bevisvarde

### Delfas 0.9 Repo Prune And Supersession Map

- bygg den faktiska prune-mapen och supersession-kartan

#### Exakt modell

- bygg `PruneDecisionRecord(path, pathClass, realityClass, actionStatus, why, riskIfLeft, targetIfMigrated)`
- bygg `SupersessionRecord(oldPath, newPath, migrationNeeded, finalStatus)`
- skilj strikt mellan:
  - `migrate`
  - `archive`
  - `remove`

#### Invariansregler

- `remove` kraver starkare bevis an `archive`
- `migrate` kraver explicit malplats
- `archive` används när historiskt värde finns men aktiv sanning ska bort

### Delfas 0.10 Low-Risk Cleanup Execution

- verkstall sakra cleanup-beslut från prune-mapen

#### Exakt modell

- arkivera gamla styrdokument som inte längre får styra
- arkivera uppenbara placeholderkluster
- ta bort lokala absoluta paths i aktivt kvarvarande material
- uppdatera root-manifest och root-readme efter cleanup

#### Invariansregler

- inget för tas bort för att det kanns gammalt
- varje borttagning kraver referensscan eller annan konkret bevisning

### Delfas 0.11 Domain Input Export

- bygg sakert startunderlag till Domän 1-17

#### Exakt modell

- bygg `CapabilityCluster(clusterCode, evidencePaths, blockers, confidenceLevel)`
- bygg `DomainInputRecord(domainCode, knownScope, mandatoryPrerequisites, openRisks)`
- capability-kluster ska harledas från:
  - kod
  - appar
  - routes
  - worker
  - migrations
  - verkliga tester

### Delfas 0.12 External Audit Reconciliation

- bygg en explicit rekonsileringskedja för externa auditpaket som verifieringsunderlag, aldrig som bindande sanning

#### Exakt modell

- bygg `ExternalAuditPackage(packageCode, sourceFiles, reviewedAt, evidenceScope, trustBoundary)`
- bygg `AuditDirectClaim(claimCode, claimFamily, auditValue, currentValue, disposition, evidenceRefs)`
- bygg `AuditIssueCarryForward(issueRef, domainCode, mappedPhase, mappedDelfas, disposition, notes)`
- bygg `AuditDispositionReceipt(receiptCode, packageCode, staleClaims, openClaims, carryForwardRefs)`
- `trustBoundary` ska alltid vara `verification_only`
- `sourceFiles` ska minst innehålla:
  - `C:\Users\snobb\Downloads\bokforing_rebuild_issue_register.json`
  - `C:\Users\snobb\Downloads\bokforing_rebuild_audit_report.md`
  - `BOKFORING_REBUILD_AUDIT_RECONCILIATION_2026-04-04.md`

#### Invariansregler

- extern audit får aldrig överrida nuvarande rebuild-sanning
- inget gammalt count-värde får kopieras in som öppen blocker utan jämförelse mot aktuell repomätning
- ingen importerad `issue_ref` får försvinna utan explicit disposition
- stale direkta corpusclaims får inte återintroduceras som öppna blockers i masterkedjan

#### Valideringar

- varje `AuditDirectClaim` måste ha:
  - auditvärde
  - aktuellt uppmätt värde
  - disposition
  - evidensreferens
- `UTF-8 BOM`, absoluta lokala paths och dokumentportabilitet ska bara hållas öppna om de fortfarande är mätbara i nuvarande rebuild
- carry-forward-kluster för Domän 00, 03, 13, 15, 17, 27 och 28 ska vara explicit namngivna i rekonsileringskvittot

#### Tester

- jämför auditpaketets `152 markdownfiler` mot aktuell mätning i rebuild-katalogen
- jämför auditpaketets `59 bindande dokument` mot aktuell mätning i rebuild-katalogen
- verifiera att stale count-claims markeras `closed_stale` eller `closed_already_implemented`
- verifiera att verkligt öppna hygiene-fynd fortfarande mappar till Fas 0

#### Invariansregler

- senare domäner får inte starta i gammal docs-sanning
- cluster-input måste bygga på faktisk repo-reality, inte gamla docs eller gamla statusmarkeringar

## Fas 1

### Delfas 1.1 Source-Of-Truth Consolidation

- kritiska writes ska använda canonical repositories som primär truth
- `critical_domain_state_snapshots` ska inte längre röra primär affärssanning
- varje write ska bli:
  - explicit command
  - explicit aggregate target
  - explicit expected/resulting object version

### Delfas 1.2 Repository And Persistence Correction

- wirea canonical repository store i faktisk API- och worker-runtime
- protected runtime ska krava explicit persistent canonical store
- canonical repository schema contract ska vara blockerande startup-krav
- domain snapshots ska degraderas till checkpoint/export/import-lager

### Delfas 1.3 Atomic Mutation Path Hardening

- commit path ska vara:
  - repository mutation
  - command receipt
  - explicit domain events
  - explicit outbox
  - explicit evidence refs
  - commit
- inga kritiska writes för bygga på generic method committed

### Delfas 1.4 Outbox / Inbox / Journal Hardening

- outbox ska vara enda dispatch-kalla för kritiska side effects
- inbox ska vara enda dedupe-kalla för inbound kritiska meddelanden
- receipt/event/outbox/evidence ska vara sparbara med samma command/correlation context

### Delfas 1.5 Idempotency And Concurrency Hardening

- duplicate suppression ska ske på command-nivå
- concurrency ska ske på aggregate-nivå
- retry-policy ska skilja:
  - duplicate
  - optimistic conflict
  - serialization failure
  - permanent validation failure

### Delfas 1.6 Worker Lifecycle Hardening

- job store ska vara operativ state
- business truth ska alltid ga via canonical command/runtime
- replay, dead letters och poison semantics ska peka tillbaka till command truth

### Delfas 1.7 Replay / Restore / Projection Rebuild Hardening

- replay ska ga från canonical truth
- snapshots ska vara checkpoints
- projections ska vara rebuildbara från command/event-lager

### Delfas 1.8 Import / Cutover / Rollback Hardening

- import ska skriva commands
- parallel run ska jamfora canonical outputs
- rollback ska använda checkpoint/evidence/aggregate refs

### Delfas 1.9 Environment Isolation Hardening

- `pilot_parallel` och `production` ska krava:
  - explicit runtime mode
  - explicit persistent stores
  - explicit no-seed policy
- implicit `memory` ska bort ur protected runtime

### Delfas 1.10 Bootstrap / Config / Diagnostics / Observability Hardening

- diagnostics ska blockera unsafe runtime
- API och worker ska ha samma hardhet
- metrics ska visa:
  - receipt lag
  - outbox lag
  - projection lag
  - replay backlog

## Fas 1 exakt modell

### Source-of-truth-modell

- primär truth:
  - canonical repository rows
  - command receipts
  - domain events
  - outbox
  - evidence refs
- sekundar truth:
  - snapshots
  - projection checkpoints

### Repository-modell

- repository row är scoped på:
  - bounded context
  - object type
  - company id
  - object id
- varje row har egen `objectVersion`
- delete kraver rätt `expectedObjectVersion`

### Transaction boundary model

- en kritisk command = en databastransaktion
- transaktionen måste omfatta hela affärscommitkedjan
- externa side effects sker farst efter commit via outbox/worker

### Command journal model

- accepted receipt = committad mutation
- duplicate receipt = suppressed duplicate
- payload hash måste vara deterministisk
- metadata för aldrig röra ra secrets

### Event model

- eventtyp måste vara explicit
- eventpayload måste racka för replay, audit och correction

### Outbox / inbox model

- outbox = dispatch truth
- inbox = inbound dedupe truth

### Idempotency model

- `commandType + commandId + companyId` och `idempotencyKey + companyId` ska vara unika
- retries får inte skapa dubbel mutation

### Concurrency model

- concurrency sker per aggregate, inte per domänsnapshot
- Serializable/retry-regel ska användas där multi-row invariants kraver det

### Worker lifecycle model

- worker processar operativ state
- worker skapar inte affärssanning direkt

### Replay / recovery model

- replay återkor commands eller harledda operativa steg från canonical truth
- restore använder checkpoint-artifacts

### Snapshot role and limits

- snapshot = checkpoint, forensic artifact, snabb bootstrap
- snapshot != primär truth

### Projection rebuild model

- projections är harledda och rebuildbara
- projection checkpoints är operativ state

### Import / cutover / rollback / parallel-run model

- import = commands
- cutover = evidence + acceptance
- rollback = checkpoint + aggregate refs + evidence
- parallel run = canonical comparison

### Bootstrap / config / diagnostics model

- explicit mode
- explicit stores
- explicit schema contracts
- explicit blockers

### Observability model

- logga och exponera:
  - runtime mode
  - canonical repo store kind
  - critical state store kind
  - async job store kind
  - blocker findings
  - lag metrics

## Fas 2

### Delfas 2.1 Security Truth Lock And Fake-Live Demotion

- bygg `SecurityCapabilityStatus(capabilityCode, runtimeClass, liveAllowed, blockerCodes, proofPaths)`
- varje capability måste ha sann klassificering:
  - `verified_reality`
  - `partial_reality`
  - `fake_live`
  - `stub`
  - `legacy`
- docs, diagnostics och go-live gate ska låsa samma statusobjekt
- capabilityn `liveAllowed=true` är förbjuden om verklig providerkedja, verklig WebAuthn eller verklig extern KMS saknas

### Delfas 2.2 Secret Inventory And Classification

- bygg `SecretTypeRecord(secretType, securityClass, ownerDomain, storagePolicy, exportPolicy, rotationPolicy, revocationPolicy, providerBound)`
- bygg `SecretUsageRecord(secretType, runtimePath, stateCarrier, allowedRawPresence, proofPath)`
- sakerhetsklasser:
  - `S0` publik
  - `S1` intern lag kanslighet
  - `S2` integritetskanslig men inte hemlig
  - `S3` skyddsvard authmetadata
  - `S4` operativ hemlighet
  - `S5` root-of-trust
- S4/S5 för aldrig ligga i vanlig domänstate eller i ra export

### Delfas 2.3 Secret Storage, Import And Export Hardening

- alla S4-hemligheter ska skrivas via en enda secret-store-adapter
- domänobjekt ska bara röra `secretRef`, `keyVersion`, `fingerprint`, `providerEnvironmentRef`, `maskedValue`
- import av aldre authsnapshots måste ga genom explicit migrator
- runtime får inte läsa ra `snapshot.authBroker`
- export av securitykritiska artifacts kraver explicit export-policy och extern KMS/HSM
- responses som temporart innehåller ra secret måste klassas `nonLoggable=true`

### Delfas 2.4 KMS/HSM/Envelope And Artifact-Integrity Hardening

- bygg `SecurityKeySlot(environment, purpose, alias, status, currentVersion, previousVersion)`
- minst följande syften måste finnas:
  - `data_envelope`
  - `blind_index`
  - `artifact_integrity`
  - `webhook_signing`
  - `provider_secret_wrap`
- protected bootstrap ska krava extern KMS/HSM
- snapshot- och evidence-artifacts ska röra algoritm, key-version, digest och signatur/MAC
- `artifact_integrity`-nyckel får inte återanvändas som `data_envelope`-nyckel

### Delfas 2.5 Login Root, Session Root And Transport Hardening

- bygg `AuthTransaction(authTransactionId, companyId, identifier, requestedFirstFactor, createdAt, expiresAt, status, correlationId)`
- bygg `AuthSession(sessionId, tokenHash, companyId, userId, issuedAt, lastUsedAt, idleExpiresAt, absoluteExpiresAt, trustLevel, rotationCounter, amr, deviceTrustId, freshTrustByActionClass, revokedAt)`
- användbar session för uppsta farst efter verifierad första faktor
- sessiontoken ska roteras vid första faktor, step-up och privileged access
- auth-kansliga routes får bara acceptera bearer-token
- `x-forwarded-for` får bara användas via trusted-proxy-konfiguration

### Delfas 2.6 TOTP, Device Trust And Fresh-Trust Hardening

- bygg `TotpReplayRecord(factorId, timeStep, acceptedAt, sessionId, consumedByAction)`
- bygg `SecurityThrottleRecord(scopeType, scopeId, failureSeries, lockedUntil, lastFailureAt, lastIp, lastDeviceRef)`
- bygg `DeviceTrustRecord(deviceTrustId, companyId, userId, deviceFingerprint, issuedAt, expiresAt, revokedAt, trustClass)`
- bygg `FreshTrustRecord(sessionId, actionClass, gräntedAt, expiresAt, factorSet, sourceEvidenceRef)`
- samma accepterade TOTP-timestep för aldrig kunna användas igen
- lockout och replay-skydd måste ligga i delad persistent state

### Delfas 2.7 Passkey Hardening

- bygg `WebAuthnRegistrationChallenge(...)`
- bygg `PasskeyCredential(...)`
- bygg `WebAuthnAssertionReceipt(...)`
- assertionverifiering måste kontrollera challenge, RP ID, origin, authenticatorData, signatur, user verification och signCount
- strangsubstitut som `passkey:<credentialId>` för aldrig kunna passera

### Delfas 2.8 BankID Hardening

- bygg `BankIdAuthTransaction(...)`
- bygg `BankIdProofReceipt(...)`
- provideradapter ska röra verklig credential-set, verklig endpoint-konfiguration och environment-bound callback/poll policy
- sessiontrust får bara hojas när `BankIdProofReceipt` skrivits från verklig providerrespons
- lokalt genererade completion tokens får inte accepteras i liveklassad capability

### Delfas 2.9 Federation Hardening

- bygg `FederationAuthRequest(...)`
- bygg `FederationIdentityProof(...)`
- OIDC måste verifiera state, nonce, issuer, audience, expiry och JWKS-signatur
- SAML måste verifiera signerad assertion, audience restriction, recipient och giltighetsfanster
- federationidentitet får inte automatiskt ge affärsroll

### Delfas 2.10 Callback, Webhook And Provider-Boundary Hardening

- bygg `ProviderCallbackLedger(providerCode, environmentRef, deliveryId, externalOperationId, verificationMethod, verifiedAt, replayWindowUntil, status, correlationId)`
- bygg `ProviderVerificationPolicy(providerCode, environmentRef, callbackDomain, callbackPath, verificationMethod, credentialRef, replayMode, operatorOnly)`
- varje callbackroute ska klassas som:
  - verklig extern callback
  - verifierad poll-completion
  - intern operatarscollect
- samma delivery-id får inte kunna konsumeras två ganger
- callback från fel environment ska blockeras

### Delfas 2.11 Permission, Boundary And Privileged-Access Enforcement

- bygg `RouteSecurityDecision(routeId, principalId, companyId, permissionCode, requiredTrustLevel, currentTrustLevel, actionClass, freshTrustSatisfied, objectScopeSatisfied, allowed, reasonCode, evidenceRef)`
- varje routebeslut ska koras innan handlern
- beslutet ska kombinera:
  - session
  - principal
  - company boundary
  - permission
  - trust
  - action class
  - fresh trust
  - privileged allowlist
- bygg `PrivilegedSessionGrant(...)` för impersonation och break-glass
- rätt permission men fel trust ska ge avslag
- rätt trust men fel bolag ska ge avslag

### Delfas 2.12 Audit, Evidence And Production Security Gate

- bygg `SecurityEvidenceRecord(evidenceId, eventType, actorId, companyId, sessionId, trustLevel, payloadDigest, integrityKeyVersion, createdAt)`
- bygg `SecurityReadinessGate(gateId, blockerCodes, kmsReady, providerRealityReady, routeTrustReady, persistentSecurityStateReady, auditIntegrityReady, decision, evaluatedAt)`
- följande events måste vara first-class audit:
  - factor enrollment
  - factor revoke
  - session create
  - session rotate
  - session revoke
  - provider callback verified
  - credential change
  - key rotation
  - impersonation start/stop
  - break-glass request/approve/start/stop
- readiness gate får inte bli gran om extern KMS/HSM saknas, fake-live-provider finns kvar, central trust-enforcement saknas eller persistent security state saknas

## Fas 3

### Delfas 3.1 Legal-Form Hardening

- bygg `LegalFormProfile`, `ReportingObligationProfile` och `LegalAccountingContext` som first-class bokföringsgovernors
- `LegalAccountingContext` ska resolve:a:
  - legal form code
  - reporting obligation
  - signatory class
  - filing package family
  - close-template-scope
- fiscal-year-end-close får inte använda fallback när `LegalAccountingContext` saknas
- aktiv legal-form-binding måste finnas innan:
  - close
  - year-end-transfer
  - annual/export package
  - filingnara bokföringsmutation

### Delfas 3.2 Fiscal-Year Governance Hardening

- bygg `FiscalYearProfile`, `FiscalYear`, `AccountingPeriod` och `FiscalYearChangeRequest` med tydliga state machines
- lagg legality-matris på:
  - legal form
  - current year kind
  - requested year kind
  - short/farlangt är
  - tillstandskrav
- aktivering av nytt är ska krava verifierad close/result-transfer/opening-balance-kedja
- reopen ska bara kunna ske via explicit correction-case

### Delfas 3.3 Accounting-Method Governance Hardening

- bygg `AccountingMethodEligibilityAssessment`, `AccountingMethodProfile`, `AccountingMethodChangeRequest` och `AccountingMethodYearEndCatchUpRun`
- aktiv metod ska vara bunden till bokföringsdatum och rakenskapsar
- `runYearEndCatchUp` ska materialisera underlaget från lasta subledgers
- request-body får bara ange scope/trigger, aldrig ekonomiskt facit
- method-change ska röra:
  - eligibility evidence
  - fiscal-year binding
  - decision memo
  - approval class

### Delfas 3.4 Change-Legality Enforcement Hardening

- bygg en central `ChangeLegalityRule`-modell med:
  - `ruleId`
  - `entityType`
  - `requestedMutation`
  - `legalContext`
  - `requiredApproval`
  - `requiredEvidence`
  - `allowed`
  - `blockerReasonCode`
- samma legality engine ska anropas från API, batch, import och intern runtime
- varje mutation ska logga vilken legality-regel som användes

### Delfas 3.5 BAS/Chart Governance Hardening

- bygg `ChartCatalogVersion`, `ChartCatalogEntry`, `ChartCatalogDiff` och `ChartOverride`
- varje publicerad katalogversion ska röra:
  - source reference
  - checksum
  - diff från föregående
  - approved by
- varje journalrad ska röra `catalogVersionId`
- dimensionnycklar och statusvarden måste vara identiska mellan runtime och Postgres

### Delfas 3.6 Voucher/Journal Integrity Hardening

- bygg `VoucherSeries`, `VoucherSequenceReservation`, `JournalEntry`, `JournalLine` och `JournalCorrectionLink`
- approvalniva ska bestammas av:
  - source type
  - amount class
  - period status
  - close proximity
  - correction scope
- postad journal ska alltid röra:
  - source type
  - source id
  - idempotency key
  - actor
  - approval chain
  - evidence refs

### Delfas 3.7 Immutability/Number-Series Hardening

- bygg append-only sequence ledger för voucherserier
- förbjud mutation av sekvensrelaterade fält efter första postade användning
- canonical repositories för Domän 3 ska inte exponera delete
- snapshot-import ska blockeras i protected/live och flyttas till offline recovery-only
- postad journal ska ha fingerprint/hash sa att efterhandsfarandring blir detekterbar

### Delfas 3.8 Period-Lock/Close/Reopen/Year-End Hardening

- bygg `ClosePackage`, `CloseSignOff`, `PeriodLockRecord`, `ReopenCaseLink` och `YearEndExecution`
- close-template ska alltid komma från `LegalAccountingContext`
- reopen ska invalidiera berarda close-, year-end- och exportartefakter
- ny bokning i hard-locked period får bara ske via reopen-chain
- year-end-exekvering ska vara separat artefaktkedja med eget state

### Delfas 3.9 Opening-Balance/Result-Transfer Hardening

- bygg `OpeningBalanceBatch`, `ResultTransferBatch` och `RetainedEarningsTransferBatch`
- varje batch ska röra:
  - source scope hash
  - source journal set
  - evidence refs
  - approval chain
- aktivering av nytt är ska blockeras tills artifact-kedjan är komplett
- reversal ska ske via ny batch och ny journal, aldrig via mutation

### Delfas 3.10 Depreciation-Method/Depreciation/Accrual Hardening

- bygg `DepreciationMethodProfile`, `DepreciationSchedule`, `DepreciationBatch`, `AccrualSchedule` och `AccrualBatch`
- metodregister ska publicera:
  - metodkod
  - tillatet scope
  - tillaten ändringspunkt
  - required evidence
  - transition rules
- batchar ska vara idempotenta och peka på journal entry id samt reversal journal entry id när relevant

### Delfas 3.11 Main-Ledger/Verification-List/Export-Package Hardening

- bygg `GeneralLedgerArtifact`, `VerificationListArtifact`, `AuditExportArtifact` och `YearEndPackageArtifact`
- varje artifact ska röra:
  - scope-hash
  - included journal ids
  - sorteringsregel
  - checksum
  - generatedBy/generatedAt
- artifacts ska vara immutabla och ersättas via superseding chain, inte mutation

### Delfas 3.12 SIE Import/Export Hardening

- bygg `SieExportJob`, `SieImportJob` och `SieRoundtripEvidence`
- `#TRANS` ska skriva verkliga objekt från `dimensionJson`, inte tomma `{}` när data finns
- import ska följa explicit policy för kontoetablering
- export- och importjobb ska röra scope-hash, checksumma, fiscal-year-binding och included journal set
- roundtrip-evidence ska kunna visa att objekt och dimensioner bevarades

### Delfas 3.13 Retention/Archive/Delete Hardening

- bygg `RetentionClass`, `LegalHoldRecord`, `ArchiveArtifact` och `DeleteDenyRule`
- bokföringskritiska objekt får inte ha fysisk delete-vag i normal runtime
- `ON DELETE CASCADE` ska ersättas av restrict- eller arkivlogik där bokföringskedjan annars kan farstaras
- varje journal, snapshot och exportartefakt ska röra:
  - retention class
  - legal hold
  - archive status
  - purge eligibility

## Fas 4

### Delfas 4.1 Customer Masterdata Hardening

- bygg `Customer`, `CustomerPartyIdentity`, `CustomerImportAlias`, `CustomerContact`, `CustomerMergeRecord` och `CustomerStatusRecord`
- organisationsnummer och VAT-nummer ska normaliseras före dedupe
- `customerNo` för vara visningsnyckel men aldrig legal identitetsnyckel
- merge för aldrig skriva om historiska invoices, open items eller journals
- bygg commands för `CreateCustomer`, `ImportCustomerAlias`, `MergeCustomers`, `SplitMergedCustomer` och blockerstatusandringar
- kontaktroller ska vara styrd enum och fakturerbar kund ska ha verifierad billing-kanal eller blockerflagga
- merge, split och blockerfarandringar ska ge receipt med impacted object counts, approval chain och correlation id

### Delfas 4.2 Quote / Contract / Billing-Trigger Hardening

- bygg `BillingObligation`, `BillingObligationLine`, `BillingConsumption` och `BillingSourceSnapshot`
- varje issued invoice line ska peka på exakt consumption record eller `manual_ad_hoc`
- quote-version, contract-plan-version och project-milestone-version ska hashbindas i billing source snapshot
- simulation/readiness för aldrig konsumeras som legal-effect billing source
- bygg commands för att skapa, konsumera och cancelera obligation lines
- residual kvantitet och residual belopp ska vara first-class data som overlever credit och replay

### Delfas 4.3 Invoice Timing / Content / Delivery Hardening

- bygg `CustomerInvoice`, `InvoiceLegalEvaluation`, `InvoicePolicyEvaluation`, `InvoiceDelivery` och `InvoiceDeliveryEvidence`
- separera `issue_date`, `tax_date`, `supply_date`, `delivery_date`, `prepayment_date` och `due_date`
- legal completeness och commercial completeness ska vara separata statusdimensioner
- ändringsfaktura måste röra otvetydig referens till originalfaktura
- `delivered` får bara användas när dispatch/provider-accept eller receipt-bevis finns
- bygg commands för legal/policy-evaluering, delivery-prepare, dispatch och provider-event-registrering
- legal scenario code ska styra sarskilda hanvisningar, inte fria textmanster i VAT-kod
- officiell källa: Skatteverket `Momslagens regler om fakturering`

### Delfas 4.4 Invoice Series And Lifecycle Hardening

- bygg `InvoiceSeries`, `InvoiceNumberReservation`, `InvoiceIssueRecord` och `InvoiceStatusHistory`
- reservera nummer i samma transaktion som issue/open-item/journal
- hall invoice-, delivery-, receivable- och revenue-status som separata fält/aggregat
- importerat historiskt nummer ska reserveras i sarskilt kollisionsregister innan native issue tillats
- `IssueInvoice`, `CancelInvoiceBeforeIssue`, `ReverseIssuedInvoice`, `MarkInvoiceDisputed` och `ResolveInvoiceDispute` ska vara first-class commands
- replay av samma issue-key för aldrig skapa nytt nummer

### Delfas 4.5 Credit-Note / Partial-Credit / Reversal Hardening

- bygg `CreditAdjustment`, `CreditNote`, `InvoiceReversal` och `WriteoffReversal`
- kredit av försäljning ska vara separat från reglering av kundfordran
- kredit på betald faktura måste kunna ge kundkredit eller refund exposure
- reversal ska vara ny handelsekedja med ny audit- och evidence-trail
- `IssueCreditNote`, `IssuePartialCredit`, `ReverseIssuedInvoice` och `ReverseWriteoff` ska vara explicita commands
- originalreferens, reason code, residualeffekt och VAT-delta ska vara obligatoriska evidencefalt

### Delfas 4.6 Open-Item / Allocation / Prepayment / Overpayment / Refund Hardening

- bygg `ArOpenItem`, `ArAllocation`, `CustomerPrepayment`, `CustomerCreditBalance`, `RefundRequest`, `RefundExecution` och `RefundReconciliation`
- farskott ska kunna uppsta utan open item
- överbetalning mot kand kund ska skapa kundkredit, inte unmatched receipt
- refund ska bara ske mot definierad kundkredit eller verifierad felbetalning
- `CreateCustomerPrepayment`, `CreateCustomerCreditFromOverpayment`, `RequestRefund`, `ApproveRefund`, `ExecuteRefund` och `ReconcileRefund` ska vara first-class commands
- open item och customer credit ska vara separata sanningsobjekt som tillsammans visar nettoexponering mot kund

### Delfas 4.7 Payment-Link / Matching / Unmatched-Receipt Hardening

- bygg `InvoicePaymentLink`, `PaymentLinkProviderEvent`, `ArUnmatchedReceipt` och `ReceiptMatchDecision`
- payment link ska vara betalinitiering, aldrig betalningssanning
- verifierat provider- eller bankreceipt-event ska vara enda vagen till settlement
- runtime ska uppratthalla hogst en aktiv payment link per invoice och syfte om inte explicit policy sager annat
- osaker matchning ska ga till review queue i stallet för auto-allokering
- payment-link- och bankevent ska vara idempotenta på externa ids

### Delfas 4.8 Reminder-Fee / Late-Interest / Dunning / Aging Hardening

- bygg `DunningRulePack`, `DunningRun`, `DunningCharge`, `LateInterestCalculation` och `AgingSnapshot`
- påminnelseavgift kraver lag- och avtalsstöd
- drajsmalsränta ska använda effective-dated referensränta per halvar
- 450-kronors B2B-farseningsersättning ska vara explicit charge med legal basis
- disputed eller held items får inte dunnas automatiskt
- varje charge ska röra rulepack version, calculation trace och legal basis code
- officiella källor: Riksdagen `Räntelag (1975:635)`, Riksdagen `Lag (1981:739) om ersättning för inkassokostnader m.m.`, Riksbanken `Referensrantan`

### Delfas 4.9 Revenue / Ledger / VAT Bridge Hardening

- bygg `ArJournalProjection`, `VatDecisionLink`, `RevenueRecognitionRecord`, `BadDebtReliefRecord` och `BadDebtRecoveryRecord`
- varje ÄR-handelse ska ha definierad ledger- och VAT-effekt eller explicit `not_applicable`
- account mapping ska vara extern, versionsstyrd och bolagsspecifik
- legal scenario code ska styra VAT-bridge i stallet för strangmatchning på VAT-kod
- prepayment, customer credit, refund, bad-debt relief och bad-debt recovery ska ha egna bryggor
- postingreplay ska vara idempotent på source event id

### Delfas 4.10 Project / Field / HUS Invoice Bridge Hardening

- bygg `ProjectBillingObligation`, `FieldBillingObligation`, `HusInvoiceGate`, `HusArBridgeEvent` och `HusCustomerShareExposure`
- project och field ska producera auktoritativa billing obligations, inte bara readiness/simulation
- HUS-tagad faktura får inte issue:as utan passerad HUS gate
- HUS customer payment och credit adjustment måste skapa ÄR-events som poverkar open items, customer credits eller refunds
- myndighetsutfall efter utbetalning måste kunna skapa recovery eller kundresidual i ÄR
- bridge events ska vara idempotenta på upstream event id och röra source version hash

### Delfas 4.11 Export / Evidence Hardening

- bygg `ArCutoffExport`, `ArEvidencePackage`, `ArTieOutArtifact` och `ArParallelRunDiffArtifact`
- samma cutoff och samma scope ska alltid ge samma hash
- exporterna ska omfatta invoices, open items, allocations, unmatched receipts, customer credits, refunds, dunning charges, delivery evidence och aging
- varje artifact ska röra included ids, source versions, actor, generatedAt och ledger/VAT tie-out
- support- och auditexports ska ha egna masking- och permissiongranser
- parallel-run diff ska peka ut exakt avvikande post och orsak

## Fas 5

### Delfas 5.1 Supplier Masterdata Hardening

- bygg `Supplier`, `SupplierIdentity`, `SupplierImportAlias`, `SupplierBankRelation` och `SupplierStatusRecord`
- canonical identity ska konflikttesta orgnr, VAT, bankrelation och importalias
- leverantör får inte arkiveras med öppen AP-risk eller aktiv betalorder
- bankandring ska satta payment block tills verifierad release
- counterparty type och tax profile måste vara explicit och sparbar

### Delfas 5.2 Purchase-Order / Receipt Hardening

- bygg `PurchaseOrder`, `PurchaseOrderLine`, `ReceiptEvent` och `ReceiptCorrection`
- ny PO skapas alltid i `draft`
- receipt ska vara immutable event med idempotent replay
- cumulative receipt får inte overskrida tolerans
- correction sker via ny eventkedja, aldrig overwrite

### Delfas 5.3 Target-Type Routing Hardening

- bygg `ReceiptTargetRoute` och `PostingTargetProfile`
- target types `expense`, `asset`, `inventory`, `project_material` måste styra coding, dimensions, approval scope och downstream command
- icke-`expense` ska blockera hart om downstream saknas
- target type för aldrig tyst nedgraderas till `expense`

### Delfas 5.4 OCR / Document-Intake Hardening

- bygg AP som konsument av `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md`; scanninglagret äger `DocumentEnvelope`, `OriginalBinaryCapture`, `OcrExecution`, `ExtractionFieldCandidate`, `DeterministicClassificationDecision`, `AiClassificationSuggestion`, `ReviewRequirementDecision` och `DownstreamRoutingDecision`
- bygg bara AP-specifika projections och handoff-objekt ovanpa scanninglagret, inte en konkurrerande OCR-truth i AP
- bygg `Document`, `DocumentVersion`, `OcrRun`, `ExtractionProjection`, `FieldLineage` och `ReviewTask`
- OCR för aldrig bli bokföringssanning utan explicit accept eller deterministisk policy
- AP-kritiska fält med lag confidence eller svag lineage ska alltid skapa review
- OCR-rerun ska skapa ny version, inte mutation
- runtime och runbooks måste peka på samma OCR-baseline

### Delfas 5.5 Classification / Review / Import-Case Hardening

- bygg `ClassificationCase`, `ReviewDecision`, `ImportCase` och `ImportApplyRecord` som downstream-konsumenter av scanninglagrets family-, confidence-, owner- och blockerbeslut
- bygg `ClassificationCase`, `ReviewDecision`, `ImportCase` och `ImportApplyRecord`
- person-linked documents får inte passera till normal AP utan explicit handoff
- import case måste vara precondition där policy kraver det
- direct document ingest ska blockeras när classification/import-case är obligatorisk
- review/apply-effekt ska vara sparbar hela vagen till AP-fakturan

### Delfas 5.6 Supplier-Invoice-Ingest And Multi-Channel Duplicate Hardening

- bygg `SupplierInvoice`, `SupplierInvoiceSourceSnapshot` och AP-side duplicate receipts ovanpa scanninglagrets `DuplicateDecision`; AP får inte definiera egen avvikande duplicate-sanning
- bygg `SupplierInvoice`, `SupplierInvoiceSourceSnapshot` och `DuplicateDecision`
- hard duplicate får inte luta på samma `documentHash`
- tvetydig supplier match från OCR ska alltid ga till review
- source channel-taxonomin ska omfatta `ocr_inbox`, `email_attachment`, `migration`, `partner_api`, `import_repair`
- summary-line fallback får inte bli bokningsbar standardvag

### Delfas 5.7 Credit-Note Hardening

- bygg `SupplierCreditNote`, `ApCreditEffect` och `PayabilityRecord`
- runtime och DB måste stödja samma credit/open-item-modell
- linked credit note måste ha originalfakturalänk eller explicit policy
- credit note får inte bli betalbar i payment proposal
- readiness och payability för credits ska vara first-class och samstammiga

### Delfas 5.8 Matching / Tolerance / Variance Hardening

- bygg `ToleranceProfile`, `MatchDecision`, `VarianceRecord` och `VarianceResolution`
- tolerance profiles ska vara persistenta, effective-dated och bolagsspecifika
- quantityTolerancePercent måste poverka matchutfallet i runtime
- variances för quantity, price, total, date, coding och tax måste vara first-class
- resolution, approval och reclose ska vara auditbara

### Delfas 5.9 Approval / SoD Hardening

- bygg `ApprovalPolicy`, `ApprovalStep`, `DutySeparationRule` och `OverrideApproval`
- samma person får inte vara preparer och final approver utan explicit dual control
- samma person får inte vara creator och payment exporter under normal policy
- riskklass, belopp och leverantörstyp ska kunna hoja antal steg
- overrides måste vara auditloggade med second approver

### Delfas 5.10 Date-Control Hardening

- bygg explicit datumuppsattning för invoice, posting, delivery, tax point, due, receipt, payment booked on, customs och FX rate
- inga styrande datum för kollapsas tyst
- VAT decision ska använda policy-rätt datum
- accounting method för valja recognition policy utan att skriva över grunddatum
- import- och tullscenarier måste kunna använda egna datumfalt

### Delfas 5.11 Posting / Open-Item / Payment-Preparation Hardening

- bygg `ApOpenItem`, `ApPostingRecord`, `PaymentPreparationRecord` och `PayabilityRecord`
- runtime och DB måste tillata samma tecken och statusar
- signed credit eller separat credit-balance-modell måste vara fullt genomfard
- `paymentReadinessStatus` och `payabilityStatus` måste vara semantiskt entydiga
- standardfaktura, credit note och reservation ska persistera utan schemafel

### Delfas 5.12 Payment-Lifecycle / Settlement / Reopen Hardening

- bygg `PaymentProposal`, `PaymentOrder`, `SettlementEvent`, `ReturnEvent` och `SupplierCreditExposure`
- stöd partial reserve, partial settle, partial return och reopen
- cash-method reject path får inte krascha på null journal
- settlement state måste spegla verklig residual skuld
- supplier overpayment/refund måste ha egen path

### Delfas 5.13 Ledger / VAT / FX Bridge Hardening

- bygg `ApJournalProjection`, `VatDecisionLink` och `FxRealizationRecord`
- account mapping får inte vara hardkodad
- goods/services måste vara explicit i utlandsflöden
- domestic, EU goods, EU services, non-EU services, import goods och byggmoms ska stödjas
- invoice rate och settlement rate måste skiljas och realized FX måste fungera även vid partial settlement

### Delfas 5.14 AI-Boundary Cost / Correctness Hardening

- bygg `AiDecisionRecord`, `AiBudgetPolicy` och `AiKillSwitch`
- AI för föreslå, inte besluta bokföringssanning
- deterministiska regler ska användas före AI när det racker
- tenant kill switch måste kunna stanga AI utan att stoppa AP-kornan
- AI-anrop måste vara auditbara med modell/version/kostnad

### Delfas 5.15 Migration / Import-Intake Hardening

- bygg `MigrationBatch`, `SourceSnapshot`, `AppliedMapping` och `ParallelRunDiff`
- supplier-, PO- och invoice migration ska vara idempotent på batch- och objektniva
- migrerad AP-post måste röra source snapshot och duplicate decision
- parallel-run diff ska mata skuld, moms, payment readiness och FX
- cutover rehearsal ska kunna återkoras utan dubbletter

## Fas 6

### Delfas 6.1 VAT Rule / Scenario Hardening

- bygg `VatScenarioDefinition`, `VatLegalBasisLink`, `VatScenarioInputProfile`, `VatDecision`, `VatEvidenceBundle` och `VatReviewDecision`
- varje `VatDecision` ska peka på exakt ett scenario och exakt en reporting channel
- separera exempt, zero-rated export, outside scope och ändra no-VAT-fall från generisk samlingskod
- flytta IOSS ut ur generell EU B2C-gren och krav importkriterier, goods-only och consignmentsgrans
- review override ska använda samma compatibility-motor som auto-derivationen

### Delfas 6.2 VAT Period / Frequency / Lock Governance Hardening

- bygg `VatFrequencyElection`, `VatFrequencyChangeRequest`, `VatPeriodProfile`, `VatPeriodLock` och `VatPeriodUnlockApproval`
- ett bolag ska ha exakt en aktiv VAT-frekvens per datum
- declaration periods ska komma från frekvensprofil, inte från fria datumintervall
- retroaktivt frekvensbyte får bara ske via correction governance
- unlock av VAT-period ska krava reason, approval och evidence

### Delfas 6.3 Declaration / Periodic-Statement / Correction / Posting Hardening

- bygg `VatSubmission`, `VatSubmissionVersion`, `VatPeriodicStatementSubmission`, `VatSubmissionSupersedeLink` och `VatPostingLink`
- finaliserad filingversion ska vara immutable
- replacement declaration ska vara ny full filingversion för samma period
- `declared` ska bara sattas genom bindning till faktisk filingversion
- filing state och posting state ska kunna skiljas i runtime och audit

### Delfas 6.4 Skatteverket Transport Hardening

- bygg capabilityklassning `real_api`, `real_file`, `manual_controlled`, `prepared_only`, `stub`
- prepared-only VAT transport för aldrig presenteras som live
- `manual_controlled` måste röra exportartefakt, operatorssteg, signeringsbevis och receipt capture
- `real_api` får bara användas när verklig adapter, authmodell och receipt mapping finns
- varje filingversion ska röra transportklass, payload hash och receiptkedja

### Delfas 6.5 VAT Clearing / Reversal Hardening

- bygg `VatClearingRun` och `VatClearingReversal`
- clearing ska bara fa koras mot finaliserad filingversion och last period
- reversal ska krava explicit approval och lineage till originalrun
- clearing-idempotens ska vara filingversionsbunden
- clearing ska kunna sparas till submission hash, period och journal

### Delfas 6.6 Tax-Account Mirror / Reconciliation Hardening

- bygg `TaxAccountImportBatch`, `TaxAccountEvent`, `ExpectedTaxLiability` och `TaxAccountMirrorJournal`
- skattekonto får inte synkas via open banking-provider
- expected liabilities ska emitteras från VAT, payroll, HUS eller kontrollerad migration/admin-kanal
- varje tax-account-event ska röra authority reference eller tydlig source reference
- amount-only match får inte vara production-primär vag

### Delfas 6.7 Discrepancy-Case / Offset / Refund / Correction Hardening

- bygg `TaxAccountReconciliationRun`, `TaxAccountDiscrepancyCase`, `TaxAccountOffset`, `TaxAccountOffsetReversal` och `TaxAccountRefundDecision`
- rulepack-prioritet och runtime-prioritet ska vara identiska
- offset, reversal och refund ska vara egna first-class handelser
- discrepancy case ska inte kunna stangas utan resolution path
- correctionkedjan för ett credit-event ska vara fullständigt sparbar

### Delfas 6.8 Bank-Account / Provider Wiring Hardening

- bygg `ProviderCapabilityManifest` som skiljer security posture från live/legal readiness
- bankkonton ska fortsatta röra masking, secret refs och separerad credentialhantering
- falska rail- och providerclaims ska rensas bort
- custom rails ska inte fa heta `pain.001`, `bankgiro` eller `open_banking` utan verklig adapter
- live capability kraver verifierad proof path

### Delfas 6.9 Payment Proposal / Batch / Order / SoD Hardening

- bygg `PaymentProposal`, `PaymentBatch`, `PaymentOrder`, `PaymentApprovalPolicy`, `DutySeparationRule` och `PaymentSignatureSession`
- create, approve, export, sign, submit, cancel och reopen ska vara separata transitions
- same-actor-kombinationer ska blockeras när policy kraver separation
- batchstatus ska harledas från orderstatusar och bankfeedback
- actor chain ska vara auditbar per batch och order

### Delfas 6.10 Payment Lifecycle / Cut-Off / Settlement Hardening

- bygg `PaymentExecutionWindow`, `PaymentExecutionEvent`, `PaymentSettlementEvent`, `PaymentReturnEvent` och `BankHolidayCalendarRef`
- separera requested payment date, submission date, execution date och settlement date
- accepted-by-bank är inte samma sak som settled
- partial settlement ska röra restbelopp och line-level status
- returned och rejected payments ska skapa korrekt residual och ombokningsspar

### Delfas 6.11 Statement Import / Reference-Matching / Reconciliation Hardening

- bygg `StatementImport`, `BankStatementLineIdentity`, `StructuredPaymentReference` och `BankReconciliationCase`
- line identity ska vara line-level stark och inkludera source hash/entry refs där de finns
- OCR, BG/PG, EndToEndId och annan strukturerad remittance ska modelleras first-class
- ambiguity ska ga till review case, inte auto-match
- same-file och cross-file replay ska vara idempotenta

### Delfas 6.12 Fee / Interest / Settlement Bridge Hardening

- bygg `StatementPostingApproval`, `StatementPostingJournalLink` och `TaxAccountStatementBridge`
- runtime och DB ska erkanna samma statement categories och matchstatusar
- bankavgift, ränta och settlement ska kunna persisteras och roundtrippas utan semantisk drift
- journalposting ska krava explicit approval
- statement-event får inte kunna skapa dubbel journal eller dubbel tax-account-bridge

### Delfas 6.13 FX / Exchange-Rate / Date-Control Hardening

- bygg `DateControlProfile`, `FxSource`, `FxRateLock` och `CrossDomainDateTrace`
- samma business event ska kunna sparas över document, posting, tax, payment, settlement och declaration date
- controlling date ska vara explicit per domänsteg
- rate source och rate date ska lagras och lasas
- OSS/IOSS ska använda canonical period- eller regelstyrd ECB-kalla där regelverket kraver det

### Delfas 6.14 Transport / API / File / Manual Runtime Hardening

- bygg gemensam capabilitykatalog för VAT-, tax-account- och bankingtransport
- varje capability ska klassas exakt som `real_api`, `real_file`, `manual_controlled`, `prepared_only` eller `stub`
- manual paths ska vara receipt- och evidence-styrda
- prepared-only och stub ska vara synliga i operatorvy och go-live gates
- capabilitystatus ska vara append-only och auditbar

## Fas 7

### Delfas 7.1 Inbox / Email-Ingest Hardening

- bygg `InboxTransportReceipt`, `InboundMailProviderProfile`, `InboundMessageEnvelope`, `InboundMessageAcquisition` och `RawMailStorageReceipt`
- varje meddelande måste röra acquisition source, raw mail receipt och transportklass
- teknisk transportsignal får inte förväxlas med affärsverifiering
- intern POST-ingest ska klassas som `internal_intake_api` tills verklig providerkedja finns
- inga dokument för se ut att vara intagna via verklig mailbox om transportreceipt saknas

### Delfas 7.2 Attachment / Malware / Quarantine Hardening

- bygg `AttachmentScanReceipt`, `AttachmentThreatAssessment`, `AttachmentContainerInspection`, `QuarantineDecision` och `QuarantineRelease`
- scanner provider, scanner version, verdict och evidence refs ska vara obligatoriska
- default `clean` är förbjudet
- encrypted archives, nested archives och archive bombs ska blockeras eller quarantinas first-class
- attachment får inte routas till document utan verifierad clean receipt

### Delfas 7.3 Source-Fingerprint / Duplicate / Chain-Of-Custödy Hardening

- bygg `MessageIdentity`, `AttachmentIdentity`, `DocumentIdentity`, `DuplicateDecision` och `ProvenanceReceipt`
- duplicate detection måste fungera över inbox, upload, migration och partner-API
- sender, recipient, inbound address, raw mail hash och attachment identity måste följa med in i document truth
- teknisk avsandarsignal ska lagras separat från business verification
- duplicate lineage måste vara append-only och auditbar

### Delfas 7.4 Original-Binary / Hash / Provenance Hardening

- bygg `ContentIdentityRecord`, `StorageReceipt`, `HashPolicy`, `HashRotationRecord` och `OriginalBinaryCapture`
- originalhash och storlek ska beräknas i plattformen från verkliga bytes
- lagra `hashAlgorithm`, `hashVersion`, `capturedAt`, `capturedBy` och `storageReceiptRef`
- storage migration ska röra verifierbar continuity
- supplied hash eller size får inte vara tillaten för productionoriginal

### Delfas 7.5 Document-Record / Version-Chain / Redaction / Export Hardening

- bygg `DocumentChainStatus`, `DocumentVariantPolicy`, `RedactionVariant`, `DocumentExportPackage` och `DocumentExportManifest`
- canonical variant registry ska omfatta `original`, `ocr`, `classification`, `rendered_pdf`, `thumbnail` och `redaction`
- redaction ska vara separat variant med egen provenance och egen hash
- export ska röra manifest, artifactlista, checksummor, varianttyper och chain-of-custödy refs
- original för aldrig muteras av redaction eller export

### Delfas 7.6 OCR Runtime / Callback / Capability Hardening

- bygg `OcrCapabilityRecord`, `OcrProviderReceipt`, `OcrCallbackProfile`, `OcrProviderAuthPolicy` och `OcrBaselineRef`
- nuvarande Google Document AI-provider ska klassas sanningsenligt som `stub` eller `fake_live` tills verklig liveadapter finns
- providercallback ska ha exakt en authmodell och får inte blandas med användarsession
- provider request/response receipts måste finnas per OCR-run
- live claims är förbjudna utan verklig adapter, authmodell och receiptkedja

### Delfas 7.7 OCR Threshold / Rerun / Review-Task Hardening

- bygg `OcrThresholdPolicy`, `ReviewRequirementDecision`, `ReviewTaskLifecycle`, `OcrRerunDecision` och `ReviewTaskDecisionReceipt`
- review-task state machine ska vara `open -> claimed -> corrected -> approved | rejected | requeued`
- varje reviewkrav ska kunna farklaras med policyversion och confidence data
- rerun ska skapa ny versionkedja och ny provider receipt
- reject och requeue ska vara first-class, inte bara enumvarden

### Delfas 7.8 Classification / Extraction / Search-Boundary Hardening

- bygg `ClassificationPolicyRecord`, `ExtractionLineageRecord`, `SearchExposureProfile`, `ReviewQueueRegistry` och `DispatchIntent`
- queue codes ska komma från canonical registry och vara konsekventa över classification, review-center och tenant defaults
- extraction lineage måste följa med till dispatch intent
- masked search och export exposure ska dela samma policykalla
- classification får inte dispatcha till downstream utan lineage och canonical queue code

### Delfas 7.9 Review-Center / Decision-Effect Hardening

- bygg `ReviewDecisionEffect`, `ReviewOutcomeReceipt`, `ReviewRequeueReason`, `ReviewEscalationReceipt` och `ReviewCloseReceipt`
- varje finalt reviewbeslut ska röra explicit effect record
- close får inte ske utan final outcome och effect lineage
- operatorreceipts ska finnas för approve, reject, escalate och close
- SLA-breach och escalationer ska vara sparbara och exportbara

### Delfas 7.10 Import-Case / Cross-Domain Link Hardening

- bygg `ImportApplyExecution`, `ImportApplyReceipt`, `DownstreamCommandDispatch`, `ImportApplyFailure` och `TargetObjectSnapshot`
- applied import case ska innebora verklig downstream command dispatch och verkligt target snapshot
- payload-hash-only apply är förbjuden som green path
- idempotens ska baseras på execution receipt
- import-casekedjan ska kunna följas hela vagen till maldomänsobjekt

### Delfas 7.11 Evidence-Bundle / Snapshot / Export / Manifest Hardening

- bygg `EvidenceExportPackage`, `EvidenceExportManifest`, `EvidenceArtifactDigest`, `EvidenceVerificationReceipt` och `EvidenceArchiveLineage`
- intern bundle-freeze racker inte; extern export måste vara verifierbar offline
- manifestet ska lista artifacts, checksummor, source refs, signoff refs och export actor
- exportpaketets digest ska vara deterministisk
- checksum mismatch ska kunna upptackas utan intern stateatkomst

### Delfas 7.12 Retention / 7-Year / Legal-Hold / Deletion Hardening

- bygg `RetentionPolicyRecord`, `RetentionSchedule`, `LegalHoldRecord`, `DeletionCase`, `ArchiveDisposition` och `RetentionBlockReason`
- bokföringsnara dokument måste ha explicit retention class
- `under_legal_hold`, `deletion_pending` och `deleted` ska bli verkliga transitions med enforcement
- legal hold ska blockera delete och blockerad export där policy kraver det
- 7-arsbevarande ska vara hart bundet till dokumentklass och underlagstyp

### Delfas 7.13 Security-Classification / Access / Redaction Hardening

- bygg `DocumentAccessPolicy`, `DocumentExposureBoundary`, `DocumentExportProfile`, `SupportDocumentView` och `RedactionReleaseApproval`
- samma policykalla ska styra sak, lasning, supportview och export
- supportexport får inte kringga redactionvariant eller retentionblock
- reveal/release ska vara receipt- och approvalstyrt där policy kraver det
- payroll-, benefits- och travelkansligt material ska ha stramare boundary an generiska dokument

### Delfas 7.14 Runbook / Legacy-Doc / False-Claim Cleanup Hardening

- arkivera:
  - `docs/runbooks/ocr-malware-scanning-operations.md`
  - `docs/runbooks/evidence-bundle-export.md`
  - `docs/policies/data-retention-gdpr-and-legal-hold-policy.md`
  - `docs/runbooks/support-backoffice-and-audit-review.md`
  - `docs/runbooks/fas-2-company-inbox-verification.md`
  - `docs/runbooks/fas-2-ocr-review-verification.md`
  - `docs/runbooks/fas-2-document-archive-verification.md`
- skriv om:
  - `docs/runbooks/inbound-email-inbox-setup.md`
  - `docs/runbooks/import-case-review.md`
  - `docs/runbooks/review-center-operations.md`
  - `docs/runbooks/document-person-payroll-incident-and-repair.md`
- ta bort alla falska live claims om OCR, malware scanning, evidence export och legal hold
- rebuild-dokumenten ska vara enda sanning för Domän 7

## Fas 8

### Delfas 8.1 Employee-master and employment-scope model

- bygg `Employee`, `EmployeeIdentity`, `EmployeeAlias`, `EmploymentTruth`, `LegalConcurrencyProfile`, `EmploymentTruthStatus`
- `EmploymentTruth` måste röra `legalEmployerId`, `employmentStatus`, `payrollEligibility`, `orgUnitId`, `workplaceId`, `managerChainRef`, `validFrom`, `validTo`, `supersedesRef`
- `EmploymentTruth` state machine:
  - `draft -> active -> superseded | terminated | archived`
- `EmploymentTruthStatus` state machine:
  - `incomplete -> review_required -> payroll_ready | blocked`
- commands:
  - `createEmployee`
  - `registerEmployeeIdentity`
  - `mergeEmployeeAlias`
  - `createEmploymentTruth`
  - `supersedeEmploymentTruth`
  - `terminateEmploymentTruth`
  - `setLegalConcurrencyProfile`
  - `recomputeEmploymentTruthStatus`
- invariants:
  - ingen aktiv employment truth utan legal employer eller payroll eligibility
  - samtidiga employments kraver explicit concurrency profile
  - `employmentId` är immutabelt
- blockerande valideringar:
  - deny saknad `legalEmployerId`
  - deny saknad `payrollEligibility`
  - deny overlap utan concurrency profile
- routes:
  - `POST /v1/hr/employees`
  - `POST /v1/hr/employees/{employeeId}/identities`
  - `POST /v1/hr/employments`
  - `POST /v1/hr/employments/{employmentId}/supersede`
- receipts:
  - varje create/supersede/terminate ska ge evidence ref och correlation id
- tester:
  - overlap deny/allow
  - readiness status
  - alias lineage

### Delfas 8.2 Employment-contract/addendum/lifecycle model

- bygg `EmploymentContract`, `EmploymentAddendum`, `EmploymentLifecycleEvent`, `RetroactiveEmploymentChangeRequest`
- contracts state machine:
  - `draft -> signed -> active -> superseded | expired | terminated`
- retro change state machine:
  - `draft -> review_pending -> approved | rejected -> executed`
- commands:
  - `createEmploymentContract`
  - `signEmploymentContract`
  - `addEmploymentAddendum`
  - `extendEmployment`
  - `requestRetroactiveEmploymentChange`
  - `approveRetroactiveEmploymentChange`
- invariants:
  - kontraktsoverlap inom lineage är förbjudet
  - retro ändring efter freeze för aldrig skriva om gammal version
- blockerande valideringar:
  - deny unsigned contract i `signed` state
  - deny retroandring mot last payrollperiod utan correction lane
- receipts:
  - signeringsref, document ref, lifecycle receipt, impact preview receipt
- tester:
  - lifecycle transitions
  - retro freeze deny
  - approval/evidence chain

### Delfas 8.3 Placement/salary-basis/manager/payout-account model

- bygg `EmploymentPlacement`, `SalaryBasisDecision`, `ManagerAssignmentEdge`, `EmploymentPayoutInstruction`
- `EmploymentPayoutInstruction` state machine:
  - `pending_verification -> scheduled -> active -> superseded | revoked`
- commands:
  - `recordEmploymentPlacement`
  - `recordSalaryBasisDecision`
  - `assignEmploymentManager`
  - `scheduleEmploymentPayoutInstruction`
  - `activateEmploymentPayoutInstruction`
  - `revokeEmploymentPayoutInstruction`
- invariants:
  - exakt en aktiv payout instruction per pay date
  - managergrafen får inte innehålla cykel
- blockerande valideringar:
  - deny payout-aktivering innanfar cutoff utan step-up
  - deny manager-cycle
  - deny placement overlap utan supersession
- routes:
  - `POST /v1/hr/employments/{employmentId}/placements`
  - `POST /v1/hr/employments/{employmentId}/salary-bases`
  - `POST /v1/hr/employments/{employmentId}/manager-assignments`
  - `POST /v1/hr/employments/{employmentId}/payout-instructions`
- receipts:
  - bankkonto-read/write receipt
  - manager lineage receipt
- tester:
  - payout activation window
  - manager graph cycle
  - read-audit

### Delfas 8.4 Time-entry/schedule/night-shift/DST/approved-time-set/period-lock model

- bygg `TimeEntry`, `ClockEvent`, `WorkScheduleAssignment`, `ApprovedTimeSet`, `ApprovedTimeSetLock`
- state machines:
  - `TimeEntry: draft -> submitted -> approved -> locked | rejected`
  - `ApprovedTimeSet: draft -> approved -> locked -> superseded`
- commands:
  - `recordClockEvent`
  - `createTimeEntry`
  - `submitTimeEntry`
  - `approveTimeEntry`
  - `materializeApprovedTimeSet`
  - `lockApprovedTimeSet`
- invariants:
  - nattpass för korsa midnatt
  - local zone måste lagras
  - payroll för aldrig läsa olast `ApprovedTimeSet`
- blockerande valideringar:
  - deny schedule overlap
  - deny saknad local zone
  - deny auto-approval där policy kraver attest
- routes:
  - `POST /v1/time/entries`
  - `POST /v1/time/entries/{id}/approve`
  - `POST /v1/time/approved-sets/materialize`
  - `POST /v1/time/approved-sets/{id}/lock`
- receipts:
  - fingerprint receipt
  - payroll boundary receipt
- tester:
  - cross-midnight
  - DST forward/backward
  - locked-ref enforcement

### Delfas 8.5 Absence/leave-signal/correction/reopen/portal model

- bygg `AbsenceRequest`, `AbsenceDecision`, `LeaveSignalLock`, `AbsenceCorrectionCase`
- state machines:
  - `AbsenceRequest: draft -> submitted -> approved | rejected`
  - `AbsenceDecision: pending -> approved -> locked -> superseded`
  - `AbsenceCorrectionCase: draft -> review_pending -> approved | rejected -> executed`
- commands:
  - `createAbsenceRequest`
  - `submitAbsenceRequest`
  - `approveAbsenceRequest`
  - `lockLeaveSignals`
  - `requestAbsenceCorrection`
  - `approveAbsenceCorrection`
- invariants:
  - portal får bara skriva request
  - leave och time får inte overlappa utan policy
  - last decision får inte muteras
- blockerande valideringar:
  - deny portalpath som farsaker skapa `AbsenceDecision`
  - deny leave/time overlap
  - deny correction utan impact preview
- routes:
  - `POST /v1/time/leave-requests`
  - `POST /v1/time/leave-locks`
  - `POST /v1/time/absence-corrections`
- receipts:
  - approval receipt
  - correction receipt
- tester:
  - overlap deny
  - correction versioning
  - portal request vs payroll-ready decision

### Delfas 8.6 Termination/final-period/final-freeze model

- bygg `TerminationDecision`, `FinalPeriodPolicy`, `FinalFreezeRecord`
- state machines:
  - `TerminationDecision: draft -> approved -> executed`
  - `FinalFreezeRecord: scheduled -> active -> reopened -> reclosed`
- commands:
  - `terminateEmployment`
  - `defineFinalPeriodPolicy`
  - `activateFinalFreeze`
  - `requestPostTerminationCorrection`
- invariants:
  - avslutad employment får inte auto-återaktiveras
  - final freeze krävs före final pay snapshot
- blockerande valideringar:
  - deny ny time/absence efter final freeze utan correction lane
- routes:
  - `POST /v1/hr/employments/{employmentId}/terminate`
  - `POST /v1/hr/employments/{employmentId}/final-period-policy`
  - `POST /v1/hr/employments/{employmentId}/final-freeze`
- receipts:
  - termination reason/doc receipt
  - freeze receipt med snapshot refs
- tester:
  - termination timeline
  - final freeze deny
  - post-termination correction

### Delfas 8.7 Balance-type/account/vacation-profile model

- bygg `BalanceType`, `BalanceAccount`, `BalanceTransaction`, `VacationProfile`
- invariants:
  - owner type och owner id måste vara konsistenta
  - vacation account för employment får inte delas tyst med annan employment
- blockerande valideringar:
  - deny employment-owned saldo utan `employmentId`
  - deny close/expiry utan profile
- routes:
  - `POST /v1/balances/types`
  - `POST /v1/balances/accounts`
  - `POST /v1/balances/transactions`
  - `POST /v1/balances/vacation-profiles`
- receipts:
  - source ref + idempotency key på varje transaktion
  - auditbar profile-version
- tester:
  - owner separation
  - idempotent transaction posting
  - profile-resolved reads

### Delfas 8.8 Carry-forward/expiry/vacation-year-close model

- bygg `VacationYearCloseRun`, `CarryForwardDecision`, `ExpiryDecision`
- state machine:
  - `planned -> running -> completed | failed | replay_blocked`
- commands:
  - `planVacationYearClose`
  - `executeVacationYearClose`
  - `replayVacationYearClose`
- invariants:
  - samma `employmentId + profileId + yearKey` får bara ha en komplett close-run
  - 20-dagarsgolv får inte tas bort
- blockerande valideringar:
  - deny saknad profile
  - deny dubbel close-run med samma checksum
  - deny otillaten carry-forward
- routes:
  - `POST /v1/balances/vacation-year-close`
  - `GET /v1/balances/vacation-year-close/{runId}`
- receipts:
  - före/efter snapshot refs
  - checksum
- tester:
  - 20-dagarsgolv
  - max sparbara dagar
  - replay guard

### Delfas 8.9 Identity-merge/split/immutable-employment model

- bygg `IdentityMergeDecision`, `IdentitySplitDecision`, `EmployeeAliasGraph`
- state machine:
  - `IdentityMergeDecision: draft -> review_pending -> approved | rejected -> executed`
- commands:
  - `requestEmployeeMerge`
  - `approveEmployeeMerge`
  - `executeEmployeeMerge`
  - `requestEmployeeSplit`
- invariants:
  - `employmentId` för aldrig bytas
  - historiska refs för aldrig skrivas om tyst
- blockerande valideringar:
  - deny merge som skapar kolliderande aktiva employments
  - deny split utan full objektlista
- routes:
  - `POST /v1/hr/identity-merges`
  - `POST /v1/hr/identity-merges/{id}/approve`
  - `POST /v1/hr/identity-splits`
- receipts:
  - merge/split lineage receipts
- tester:
  - immutable refs efter merge
  - alias lookup

### Delfas 8.10 Payroll-input snapshot/people-time-base model

- bygg `PayrollInputSnapshot`, `PeopleTimeBaseProjection`
- state machine:
  - `PayrollInputSnapshot: draft -> finalized -> superseded`
- commands:
  - `buildPayrollInputSnapshot`
  - `finalizePayrollInputSnapshot`
  - `rebuildPeopleTimeBaseProjection`
- invariants:
  - snapshot får inte finaliseras från olasta refs
  - projection får inte användas som primär truth
- blockerande valideringar:
  - deny `ApprovedTimeSet.lockState != locked`
  - deny ofullständig `EmploymentTruthStatus`
- routes:
  - `POST /v1/payroll/input-snapshots`
  - `POST /v1/payroll/input-snapshots/{id}/finalize`
  - `GET /v1/time/employment-base`
- receipts:
  - fingerprint
  - source refs
- tester:
  - fingerprint stability
  - locked-ref enforcement
  - blockerad fallback-path

### Delfas 8.11 People migration intake/diff/cutover model

- bygg `PeopleMigrationBatch`, `EmployeeMigrationSnapshot`, `EmploymentMigrationSnapshot`, `PeopleMigrationDiff`, `PeopleCutoverDecision`
- state machine:
  - `received -> imported -> validated -> diff_open -> approved_for_cutover -> cutover_executed | rolled_back`
- commands:
  - `importPeopleMigrationBatch`
  - `validatePeopleMigrationBatch`
  - `computePeopleMigrationDiff`
  - `approvePeopleCutover`
  - `executePeopleCutover`
  - `rollbackPeopleCutover`
- invariants:
  - diff måste vara entity-aware
  - cutover får inte godkännas med blockerande diff kvar
- blockerande valideringar:
  - deny saknad legal employer i canonical import
  - deny blockerande diff vid cutover
- routes:
  - `POST /v1/payroll/migrations`
  - `POST /v1/payroll/migrations/{id}/diff`
  - `POST /v1/payroll/migrations/{id}/approve-cutover`
  - `POST /v1/payroll/migrations/{id}/execute-cutover`
- receipts:
  - diff checksum
  - signoff chain
- tester:
  - entity-aware diff
  - blockerad cutover
  - execute/rollback

### Delfas 8.12 Security/privacy/masked-support/read-audit model

- bygg `SensitiveReadReceipt`, `HrRevealGrant`, `MaskedHrProjection`
- state machine:
  - `HrRevealGrant: requested -> approved -> active -> expired | revoked`
- commands:
  - `readSensitiveHrObject`
  - `requestHrRevealGrant`
  - `approveHrRevealGrant`
  - `revokeHrRevealGrant`
- invariants:
  - kanslig HR-read ska alltid skapa receipt
  - masked projection är default
- blockerande valideringar:
  - deny reveal utan giltig grant
  - deny reveal utan step-up när policy kraver det
- routes:
  - `GET /v1/hr/support-view/{objectType}/{objectId}`
  - `POST /v1/hr/reveal-grants`
  - `POST /v1/hr/reveal-grants/{id}/approve`
- receipts:
  - read receipt
  - TTL, watermark och step-up ref
- tester:
  - masked support view
  - reveal TTL
  - append-only read receipts

## Fas 9

### Delfas 9.1 Agreement family/version/catalog truth model
- bygg `AgreementFamily`, `AgreementVersion`, `AgreementCatalogEntry`, `AgreementPublicationReceipt`
- state machine:
  - `AgreementVersion: draft -> compiled -> review_pending -> approved -> published -> superseded | retired`
  - `AgreementCatalogEntry: draft -> verified -> published -> superseded | retired`
- commands:
  - `createAgreementFamily`
  - `createAgreementVersionDraft`
  - `attachAgreementCompileReceipt`
  - `submitAgreementVersionForReview`
  - `approveAgreementVersion`
  - `publishAgreementCatalogEntry`
- invariants:
  - ingen publicerad version utan compile receipt, coverage receipt och review decision
  - catalog entry måste peka på publicerad version
- blockerande valideringar:
  - deny publicering utan receipts
  - deny direkt hopp från `draft` till `published`
- routes:
  - `POST /v1/collective-agreements/families`
  - `POST /v1/collective-agreements/versions/drafts`
  - `POST /v1/collective-agreements/catalog`
- receipts:
  - publication receipt med source, compile, coverage och review refs
- tester:
  - version/catalog-state machine
  - publish blocker utan receipts

### Delfas 9.2 Effective-dating/overlap/supersede model
- bygg `VersionSupersessionPlan`, `AgreementEffectiveWindow`, `AgreementWindowConflict`
- state machine:
  - `VersionSupersessionPlan: draft -> validated -> executed | cancelled`
- commands:
  - `validateAgreementWindow`
  - `createVersionSupersessionPlan`
  - `executeVersionSupersessionPlan`
- invariants:
  - samma family får inte ha två publicerade versioner som overlappar
- blockerande valideringar:
  - deny overlap
  - deny split-period utan policy
- receipts:
  - conflict receipt
  - supersession receipt
- tester:
  - overlap deny
  - supersession lineage

### Delfas 9.3 Assignment/employment-binding model
- bygg `AgreementBindingDecision`, `AgreementAssignment`, `AgreementAssignmentReview`
- state machine:
  - `AgreementAssignment: planned -> active -> historical | superseded`
- commands:
  - `decideAgreementBinding`
  - `assignAgreementToEmployment`
  - `requestAgreementAssignmentReview`
- invariants:
  - assignment måste peka på binding decision
  - active assignment måste vara farenlig med employment truth
- blockerande valideringar:
  - deny employmentklass som inte matchar binding decision
  - deny assignment utanför version window
- routes:
  - `POST /v1/collective-agreements/assignments`
- receipts:
  - assignment receipt med employment refs
- tester:
  - binding mismatch blocker
  - rebinding efter employment change

### Delfas 9.4 Local-supplement model
- bygg `AgreementLocalSupplement`, `AgreementLocalSupplementScope`, `AgreementLocalSupplementReview`
- state machine:
  - `AgreementLocalSupplement: draft -> review_pending -> approved -> active -> superseded | retired`
- commands:
  - `createLocalSupplementDraft`
  - `submitLocalSupplementForReview`
  - `approveLocalSupplement`
  - `supersedeLocalSupplement`
- invariants:
  - två supplements får aldrig dela identity
  - supplement måste vara giltigt får `eventDate`
- blockerande valideringar:
  - deny scope mismatch
  - deny supplement utanför eget datumfanster
- routes:
  - `POST /v1/collective-agreements/local-supplements/drafts`
  - `POST /v1/backoffice/collective-agreements/local-supplements/{id}/approve`
- receipts:
  - supplement approval receipt med scope och coverage diff
- tester:
  - multi-supplement same version
  - supplement validity gating

### Delfas 9.5 Override/exception governance model
- bygg `AgreementOverrideRequest`, `AgreementOverrideApproval`, `AgreementOverrideActivation`
- state machine:
  - `AgreementOverrideRequest: draft -> review_pending -> approved -> active -> retired | rejected`
- commands:
  - `requestAgreementOverride`
  - `approveAgreementOverride`
  - `activateAgreementOverride`
- invariants:
  - requester och approver får inte vara samma actor
  - override måste vara typad på clause-nivå
- blockerande valideringar:
  - deny self-approval
  - deny payload som inte matchar typad override family
  - deny fresh trust saknas
- routes:
  - `POST /v1/collective-agreements/assignments/{id}/override-requests`
  - `POST /v1/backoffice/collective-agreements/override-requests/{id}/approve`
- receipts:
  - request, approval och activation receipts
- tester:
  - dual control deny
  - typed payload validation

### Delfas 9.6 Intake/extraction/review/publication model
- bygg `AgreementIntakeCase`, `AgreementSourceArtifact`, `AgreementIntakeExtraction`, `AgreementReviewDecision`
- state machine:
  - `AgreementIntakeCase: received -> extraction_in_progress -> review_pending -> approved_for_publication | approved_for_local_supplement | rejected`
- commands:
  - `submitAgreementIntakeCase`
  - `registerAgreementSourceArtifact`
  - `startAgreementIntakeExtraction`
  - `completeAgreementIntakeExtraction`
  - `reviewAgreementIntakeCase`
- invariants:
  - intake case måste peka på source artifact
  - extraction och review måste vara separata receipts
- blockerande valideringar:
  - deny review utan source artifact eller extraction output
- routes:
  - `POST /v1/backoffice/agreement-intake/cases`
  - `POST /v1/backoffice/agreement-intake/cases/{id}/review`
- receipts:
  - correlation id och evidence refs per steg
- tester:
  - artifact-required intake flow
  - publish vs local supplement separation

### Delfas 9.7 Agreement-source parsing/normalization model
- bygg `AgreementClauseExtractionArtifact`, `CanonicalAgreementClause`, `AgreementCompilationReceipt`
- state machine:
  - `AgreementCompilationReceipt: draft -> compiled -> failed`
- commands:
  - `extractAgreementClauses`
  - `normalizeAgreementClauses`
  - `compileAgreementVersion`
- invariants:
  - compiled version måste bygga på canonical clauses
- blockerande valideringar:
  - deny publish utan compiler path
  - deny oklassade clauses
- receipts:
  - parser version, compiler version, source checksum, diagnostics
- tester:
  - parser edge cases
  - deterministic compile output

### Delfas 9.8 Clause-coverage/unsupported-clause model
- bygg `AgreementClauseCoverage`, `UnsupportedAgreementClause`, `AgreementCoverageReceipt`
- state machine:
  - `AgreementClauseCoverage: unmapped -> partial -> supported | blocked`
- commands:
  - `recordClauseCoverage`
  - `markUnsupportedClause`
  - `finalizeCoverageReceipt`
- invariants:
  - publicering farbjuden utan coverage receipt
- blockerande valideringar:
  - deny publish när unsupported blocker count > 0
- receipts:
  - coverage receipt och blocker inventory
- tester:
  - coverage transitions
  - unsupported publish blocker

### Delfas 9.9 Executable-overlay/rate-component model
- bygg `CompiledAgreementOverlay`, `AgreementRateComponent`, `AgreementConflictDiagnostic`
- state machine:
  - `CompiledAgreementOverlay: compiled -> activated -> superseded`
- commands:
  - `buildCompiledAgreementOverlay`
  - `activateCompiledAgreementOverlay`
- invariants:
  - compiled overlay måste vara immutable
- blockerande valideringar:
  - deny activation vid blockerande diagnostics
- receipts:
  - compiled hash och diagnostics receipt
- tester:
  - compiled hash determinism
  - diagnostics blocker

### Delfas 9.10 Pay-component execution model
- bygg `AgreementPayComponentExecution`, `AgreementBasisSnapshot`
- state machine:
  - `AgreementPayComponentExecution: calculated -> materialized -> explained`
- commands:
  - `calculateAgreementPayComponent`
  - `materializeAgreementPayLine`
- invariants:
  - inget agreement-driven belopp utan basis snapshot
- blockerande valideringar:
  - deny unknown basis code
  - deny quantity source saknas
- receipts:
  - execution receipt kopplad till line trace
- tester:
  - calculation modes
  - basis resolution vectors

### Delfas 9.11 Payroll/time-consumption and event-date model
- bygg gemensam `AgreementResolutionService` och `AgreementResolutionResult`
- commands:
  - `resolveAgreementForEventDate`
- invariants:
  - payroll och time måste använda samma resolution algorithm
- blockerande valideringar:
  - deny single-overlay-per-period när flera resolution windows finns
- routes:
  - `GET /v1/collective-agreements/active`
- receipts:
  - resolution receipt i snapshot och line trace
- tester:
  - split-period scenarios
  - supplement end-date scenarios
  - time/payroll parity

### Delfas 9.12 Payslip-traceability/explainability model
- bygg `AgreementLineTrace`, `AgreementExplainabilityView`
- commands:
  - `attachAgreementLineTrace`
  - `renderAgreementExplainability`
- invariants:
  - varje agreement-driven pay line måste ha trace row
- blockerande valideringar:
  - deny pay run approval om trace saknas
- routes:
  - `GET /v1/payroll/payslips/{id}/agreement-trace`
  - `GET /v1/backoffice/payroll/payslips/{id}/agreement-trace`
- receipts:
  - trace-read audit receipt
- tester:
  - explainability route
  - trace serialization

### Delfas 9.13 Golden-scenario and expected-outcome model
- bygg `AgreementGoldenScenario`, `AgreementExpectedOutcome`
- state machine:
  - `AgreementGoldenScenario: draft -> verified -> stale -> retired`
- commands:
  - `registerAgreementGoldenScenario`
  - `verifyAgreementGoldenScenario`
- invariants:
  - varje publicerad version måste ha required scenario set
- blockerande valideringar:
  - deny publish utan golden scenarios
- receipts:
  - scenario verification receipt per karning
- tester:
  - golden scenario suite per clause family

### Delfas 9.14 Retro/delta/correction model
- bygg `AgreementRetroImpactCase`, `AgreementDeltaComputation`
- state machine:
  - `AgreementRetroImpactCase: detected -> review_pending -> approved -> executed | rejected`
- commands:
  - `detectAgreementRetroImpact`
  - `approveAgreementRetroImpact`
  - `executeAgreementRetroDelta`
- invariants:
  - historiska lines får inte skrivas över
- blockerande valideringar:
  - deny silent recompute of historical payslip
- receipts:
  - delta receipt med original och ny line trace
- tester:
  - retro delta
  - no silent overwrite

### Delfas 9.15 Durable persistence/audit/replay model
- bygg full persistent store-adapter och `AgreementMutationJournalEntry`
- invariants:
  - ingen in-memory-only live truth
- blockerande valideringar:
  - protected/live boot deny om agreement repository saknas
- receipts:
  - receipt + journal entry per mutation
- tester:
  - restart och replay determinism
  - idempotent mutation lineage

### Delfas 9.16 Backoffice/security/SoD/audit model
- bygg `AgreementHighRiskActionReceipt`, `AgreementSupportProjection`
- commands:
  - `approveHighRiskAgreementAction`
  - `renderAgreementSupportProjection`
- invariants:
  - support får inte mutera agreement truth
- blockerande valideringar:
  - deny high-risk action utan fresh trust
  - deny same-actor dual control
- receipts:
  - trust level, second approver, watermark
- tester:
  - route trust boundaries
  - masked support read

### Delfas 9.17 Seed/bootstrap/fake-live removal model
- bygg test-only `AgreementFixtureBundle`
- invariants:
  - inga fixture bundles i protected/live
- blockerande valideringar:
  - deny startup om `seedDemo` eller seed-SQL används i protected/live
- receipts:
  - bootstrap diagnostics får seed state
- tester:
  - protected-mode seed deny

### Delfas 9.18 Migration/snapshot-consistency model
- bygg `ImportedAgreementObject`, `AgreementImportMappingReceipt`
- state machine:
  - `imported -> mapped -> verified`
- commands:
  - `importAgreementHistory`
  - `verifyImportedAgreementMappings`
- invariants:
  - imported agreement history måste kunna resolvas per datum i canonical engine
- blockerande valideringar:
  - deny cutover när imported agreement snapshot saknar canonical mapping
- receipts:
  - mapping receipt med evidence refs
- tester:
  - imported agreement resolution
  - cutover blocker på missing mapping
## Fas 10

### Delfas 10.1 Pay item / calendar / pay run / final pay model
- bygg `PayItemCatalogEntry`, `PayCalendar`, `PayRun`, `PayRunFingerprint`, `PayRunCorrectionCase`, `FinalPayCase`, `FinalPayFreeze`, `FinalPaySettlementLine`, `BenefitsStopDecision`
- state machine:
  - `PayRun: draft -> calculated -> approved -> posted -> payout_prepared -> paid | corrected | reversed`
  - `FinalPayCase: draft -> frozen -> calculated -> approved -> posted -> settled | corrected | cancelled`
- commands:
  - `createPayRun`
  - `approvePayRun`
  - `postPayRun`
  - `createFinalPayCase`
  - `freezeFinalPayCase`
  - `executeFinalPaySettlement`
- invariants:
  - ingen pay run utan fingerprint
  - final pay får inte leva som läsa adjustment-rader
  - posted pay run får inte muteras tyst
- blockerande valideringar:
  - deny final pay utan freeze context
  - deny post utan full line trace, tax decision och contribution decision
- routes:
  - `POST /v1/payroll/pay-runs`
  - `POST /v1/payroll/pay-runs/{id}/post`
  - `POST /v1/payroll/final-pay-cases`
- receipts:
  - calculation, approval, posting, freeze och final settlement receipts
- tester:
  - pay run-state suite
  - final pay lifecycle

### Delfas 10.2 Tax table / tax decision / engångsskatt / SINK / A-SINK model
- bygg `TaxDecisionSnapshot`, `TaxDecisionEvidence`, `TaxModePolicy`, `TaxRulepackVersion`
- state machine:
  - `TaxDecisionSnapshot: draft -> verified -> active -> superseded | expired`
- commands:
  - `registerTaxDecisionSnapshot`
  - `verifyTaxDecisionSnapshot`
  - `activateTaxDecisionSnapshot`
  - `approveEmergencyManualTax`
- invariants:
  - `manual_rate` farbjuden i protected/live ordinary tax
  - `sink` och `a_sink` ska vara separata regulatoriska modes
- blockerande valideringar:
  - deny ordinary tax utan municipality/table/column
  - deny emergency manual tax utan dual review
- routes:
  - `POST /v1/payroll/tax-decisions`
  - `POST /v1/payroll/tax-decisions/{id}/activate`
- receipts:
  - decision receipt med municipality, table, column, rulepack checksum och evidence ref
- officiella källor:
  - Skatteverket skattetabeller
  - SKV 401
  - Skatteverket SINK
  - Skatteverket A-SINK
- tester:
  - official table vectors
  - engångsskatt vectors
  - SINK/A-SINK vectors
  - deny live `manual_rate`

### Delfas 10.3 Employer contribution / age transition model
- bygg `EmployerContributionRulepackVersion`, `EmployerContributionDecisionSnapshot`, `EmployerContributionEligibilityProfile`, `AgeTransitionBoundary`
- commands:
  - `registerEmployerContributionDecision`
  - `verifyEmployerContributionDecision`
  - `resolveEmployerContributionForPayRun`
- invariants:
  - avgiftsrad måste bara decision snapshot ref
  - procentsatser kommer bara från pinned rulepack
- blockerande valideringar:
  - deny contribution calculation utan rulepack version
  - deny växa-stöd utan eligibility profile
- receipts:
  - contribution receipt med rate, threshold och legal basis
- officiella källor:
  - Skatteverket arbetsgivaravgifter
  - Skatteverket växa-stöd
  - SKV 401
- tester:
  - age-transition vectors
  - växa/youth/no-contribution vectors

### Delfas 10.4 Benefits / travel / pension / salary exchange classification model
- bygg `BenefitValuationDecision`, `BenefitValuationRulepackVersion`, `TravelTaxRulepackVersion`, `PensionContributionProfile`, `SalaryExchangeAgreement`
- commands:
  - `registerBenefitValuationDecision`
  - `registerTravelTaxRulepackVersion`
  - `signSalaryExchangeAgreement`
- invariants:
  - `manual_taxable_value` är inte normal live-path
  - expense reimbursement och receipt VAT får inte ge taxable benefit
  - special payroll tax får pension kommer från pinned rulepack
- blockerande valideringar:
  - deny taxable benefit line utan valuation method ref
  - deny salary exchange utan signed agreement
- receipts:
  - valuation receipt
  - salary exchange agreement receipt
- officiella källor:
  - Skatteverket farmansregler
  - Skatteverket friskvard
  - Skatteverket bilfarman/drivmedel
  - SKV 401 får kostnadsersättningar
- tester:
  - valuation vectors
  - travel allowance vectors
  - pension/salary exchange vectors

### Delfas 10.5 Sick pay / qualifying deduction / vacation model
- bygg `SickPayDecisionTrace`, `QualifyingDeductionTrace`, `VacationDecisionTrace`, `VacationLiabilitySnapshot`
- commands:
  - `calculateSickPay`
  - `calculateQualifyingDeduction`
  - `calculateVacationPay`
  - `calculateVacationLiability`
- invariants:
  - varje sjuk- och semesterlinje måste kunna sparas till leave/schedule/agreement truth
  - final pay semesterersättning följer semesterlagen
- blockerande valideringar:
  - deny sick-pay line utan leave truth
  - deny vacation liability posting utan approved snapshot
- receipts:
  - sick pay receipt
  - vacation receipt
  - liability receipt
- officiella källor:
  - sjuklanelagen
  - semesterlagen
- tester:
  - sick pay vectors
  - vacation vectors
  - final pay vacation settlement vectors

### Delfas 10.6 Negative net pay / employee receivable model
- bygg `SignedNetPayView`, `EmployeeReceivable`, `ReceivableSettlementPlan`, `ReceivableOffsetDecision`, `ReceivableWriteOffDecision`
- state machine:
  - `EmployeeReceivable: open -> scheduled_offset -> partially_settled -> settled | written_off`
- commands:
  - `openEmployeeReceivable`
  - `scheduleReceivableOffset`
  - `approveReceivableWriteOff`
- invariants:
  - signed net pay får aldrig doljas
  - receivable måste bara source pay run ref och posting ref
- blockerande valideringar:
  - deny write-off utan rätt review lane
- receipts:
  - receivable receipt
  - offset receipt
  - write-off receipt
- tester:
  - multi-run settlement
  - write-off governance

### Delfas 10.7 Returned salary payment / bank return model
- bygg `ReturnedSalaryPayment`, `PayrollBankReturn`, `PayoutFailureDecision`, `RepayoutRequest`, `ReturnedPayoutLedgerBridge`
- state machine:
  - `ReturnedSalaryPayment: detected -> classified -> posted -> settled | repaid | written_off`
- commands:
  - `detectReturnedSalaryPayment`
  - `classifyPayrollBankReturn`
  - `createRepayoutRequest`
- invariants:
  - payroll return måste peka på original payout batch och employee line
- blockerande valideringar:
  - deny repayout utan failure classification
- receipts:
  - bank return receipt
  - repayout approval receipt
- officiella källor:
  - Bankgirot teknisk manual får Laner/Bg Lan
- tester:
  - return-to-receivable
  - return-to-repayout

### Delfas 10.8 Garnishment / remittance model
- bygg `GarnishmentDecisionSnapshot`, `GarnishmentPriorityProfile`, `GarnishmentRemittance`, `GarnishmentReturnCase`
- commands:
  - `registerGarnishmentDecisionSnapshot`
  - `createGarnishmentRemittance`
  - `correctGarnishmentRemittance`
- invariants:
  - `manual_override` bara i emergency-lane
  - remittance måste bara authority case ref och farbehallsbelopp baseline
- blockerande valideringar:
  - deny remittance utan active decision snapshot
- receipts:
  - decision receipt
  - remittance receipt
  - correction receipt
- officiella källor:
  - Kronofogdens allmanna rad 2026
- tester:
  - priority vectors
  - protected amount vectors
  - remittance correction flow

### Delfas 10.9 AGI build / field mapping / correction / submission model
- bygg `AgiFieldMappingBaseline`, `AgiSubmission`, `AgiSubmissionVersion`, `AgiCorrectionCase`, `AgiReplacementReference`, `AgiRemovalReference`
- state machine:
  - `AgiSubmission: draft -> validated -> ready_for_sign -> signed -> submitted -> accepted | partially_rejected | rejected | superseded`
- commands:
  - `buildAgiSubmissionVersion`
  - `validateAgiSubmissionVersion`
  - `markAgiReadyForSign`
  - `submitAgiVersion`
  - `submitAgiCorrection`
- invariants:
  - varje AGI-belopp måste sparas till exakt faltkod och source line
  - live submit kraver provider-backed transport
- blockerande valideringar:
  - deny submit utan `ready_for_sign`
  - deny mapping om pay item outcome saknar exakt faltkod
- receipts:
  - payload hash
  - signature receipt
  - provider receipt
  - correction receipt
- officiella källor:
  - Skatteverket AGI teknisk beskrivning
  - Skatteverkets faltkoder och kontroller
- tester:
  - field-code mapping suite
  - correction replace/remove suite
  - provider receipt ingest

### Delfas 10.10 Payroll posting / payout / bank match / BAS model
- bygg `PayrollPostingProfile`, `PayrollPostingBundle`, `PayrollPayoutBatch`, `PayrollRailProfile`, `PayrollBankMatch`
- state machine:
  - `PayrollPostingBundle: draft -> approved -> posted | reversed`
  - `PayrollPayoutBatch: draft -> approved -> exported -> bank_acknowledged -> settled | returned | cancelled`
  - `PayrollBankMatch: pending -> matched | mismatched | partially_matched | repaired`
- commands:
  - `buildPayrollPostingBundle`
  - `createPayrollPayoutBatch`
  - `exportPayrollPayoutBatch`
  - `registerPayrollBankMatch`
- invariants:
  - posting profile måste peka på rätt BAS-konto, skuldkonto och laneartsklass
  - payout batch skapas bara från posted truth
- blockerande valideringar:
  - deny posting bundle om placeholder cleanup-mapping fortfarande används
  - deny payout export om rail profile saknas
- receipts:
  - posting receipt
  - export receipt
  - bank-match receipt
- officiella källor:
  - BAS kontogrupper 70-76
  - Bankgirot teknisk information får Laner/Bg Lan
- tester:
  - BAS mapping suite
  - rail export checksum suite
  - bank-match repair suite

### Delfas 10.11 Payroll input snapshot / dependency consumption model
- bygg `PayrollInputSnapshot`, `PayrollInputConsumptionTrace`, `PayrollDependencyResolutionReceipt`
- commands:
  - `capturePayrollInputSnapshot`
  - `attachPayrollInputConsumptionTrace`
- invariants:
  - varje payroll line måste visa HR/time/balances/agreement/benefit/travel/pension refs
- blockerande valideringar:
  - deny pay run approval om dependency trace saknas
- receipts:
  - input capture receipt
  - trace read audit
- tester:
  - line-level trace suite
  - deny missing dependency trace

### Delfas 10.12 Payroll migration / history import / parallel run model
- bygg `PayrollMigrationBatch`, `PayrollHistoryImportReceipt`, `PayrollCutoverBaseline`, `PayrollParallelRunDiffProfile`, `AcceptedVariancePolicy`
- state machine:
  - `PayrollMigrationBatch: draft -> imported -> validated -> parallel_run_ready -> finalized | rejected | rolled_back`
- commands:
  - `importPayrollHistory`
  - `runPayrollParallelDiff`
  - `finalizePayrollCutover`
  - `rollbackPayrollCutover`
- invariants:
  - finalize bara efter accepted variance policy
  - rollback måste peka på pre-cutover evidence refs
- blockerande valideringar:
  - deny finalize med unresolved diffs
- receipts:
  - import receipt
  - diff receipt
  - finalize receipt
  - rollback receipt
- tester:
  - import validation
  - parallel diff
  - finalize/rollback suite

### Delfas 10.13 Security / review / step-up / trial-guard model
- bygg `PayrollHighRiskActionPolicy`, `PayrollApprovalReceipt`, `PayrollStepUpSession`, `PayrollTrialGuardReceipt`
- commands:
  - `requirePayrollStepUp`
  - `approvePayrollHighRiskAction`
  - `recordPayrollTrialGuardReceipt`
- invariants:
  - `company.manage` racker inte får high-risk payrollmutation
  - samma aktar får inte bade skapa och godkänna där SoD krävs
  - trial receipts får inte se ut som live receipts
- blockerande valideringar:
  - deny AGI submit utan `payroll.agi.submit` och fresh step-up
  - deny receivable write-off utan ändra godkännare där policy kraver det
- receipts:
  - actor
  - trust level
  - approver 2
  - reason code
- tester:
  - authz deny matrix
  - SoD suite
  - trial/live receipt separation

### Delfas 10.14 Runbook / seed / fake-live / legacy cleanup model
- bygg `PayrollRunbookClassification`, `PayrollSeedClassification`, `PayrollLegacyArtifactDecision`
- klassificera uttryckligen dessa runbooks:
  - `docs/runbooks/payroll-tax-decisions-verification.md`
  - `docs/runbooks/payroll-employer-contribution-decisions-verification.md`
  - `docs/runbooks/payroll-input-snapshots-verification.md`
  - `docs/runbooks/employee-receivables.md`
  - `docs/runbooks/garnishment-remittance.md`
  - `docs/runbooks/payroll-history-import-verification.md`
  - `docs/runbooks/payroll-migration-cutover.md`
  - `docs/runbooks/payroll-correction-and-agi-replay.md`
  - `docs/runbooks/fas-8-payroll-core-verification.md`
  - `docs/runbooks/fas-8-payroll-posting-verification.md`
  - `docs/runbooks/fas-8-payroll-tax-agi-verification.md`
  - `docs/runbooks/fas-9-benefits-verification.md`
  - `docs/runbooks/fas-9-travel-verification.md`
  - `docs/runbooks/fas-9-pension-verification.md`
  - `docs/runbooks/fas-11-travel-receipt-vat-verification.md`
  - `docs/runbooks/document-person-payroll-incident-and-repair.md`
- klassificera uttryckligen dessa demo seeds:
  - `packages/db/seeds/20260321201000_phase8_payroll_core_demo_seed.sql`
  - `packages/db/seeds/20260321211000_phase8_payroll_tax_agi_demo_seed.sql`
  - `packages/db/seeds/20260321221000_phase8_payroll_posting_payout_demo_seed.sql`
  - `packages/db/seeds/20260321231000_phase9_benefits_engine_demo_seed.sql`
  - `packages/db/seeds/20260322001000_phase9_travel_expenses_demo_seed.sql`
  - `packages/db/seeds/20260322011000_phase9_pension_salary_exchange_demo_seed.sql`
  - `packages/db/seeds/20260322151000_phase12_tax_submission_demo_seed.sql`
- state machine:
  - `PayrollLegacyArtifactDecision: identified -> classified -> archived | removed | rewritten`
- commands:
  - `classifyPayrollRunbook`
  - `classifyPayrollSeed`
  - `archivePayrollLegacyArtifact`
  - `removePayrollLegacyArtifact`
- invariants:
  - inga legacy runbooks får se bindande ut
  - inga demo seeds får tillatas i protected/live
- blockerande valideringar:
  - deny protected boot om demo payroll seed används
- receipts:
  - classification receipt med action `keep/harden/rewrite/replace/migrate/archive/remove`
- tester:
  - docs consistency check
  - protected-mode demo-seed deny

## Fas 11

### Delfas 11.1 HUS truth / secrecy / canonical persistence
- bygg `HusCaseRecord`, `HusBuyerRecord`, `HusServiceLineRecord`, `HusCustomerPaymentRecord`, `HusReadinessSnapshot`, `HusClaimRecord`, `HusAuthorityReceivableRecord`
- state machines:
  - `HusCase: draft -> invoiced -> payment_recorded -> claim_ready -> claimed -> decision_received -> reconciled | recovery_open | written_off`
  - `HusBuyerValidation: draft -> internally_validated -> externally_verified | externally_rejected`
- commands:
  - `registerHusCase`
  - `registerHusServiceLine`
  - `registerHusBuyer`
  - `recordHusCustomerPayment`
  - `materializeHusReadinessSnapshot`
  - `submitHusClaimRecord`
- invariants:
  - `laborCostInclVatAmount = laborCostExVatAmount + vatAmount`
  - `workedHours > 0` får avdragsgrundande line
  - `sum(allocationPercent) = 100`
  - full identitet får inte ligga i vanlig snapshot eller vanlig SQL-rad
- blockerande valideringar:
  - deny readiness om buyer allocation inte summerar till 100
  - deny persistence av ra identitet
  - deny claim om line-model saknar canonical separation av labor/material/travel/admin/other
- receipts:
  - buyer validation receipt
  - readiness materialization receipt
  - canonical snapshot checksum
- tester:
  - golden tests får labor inkl moms, hours, allocation, delbetalning och arsskifte
  - repository round-trip test
  - secret-state test

### Delfas 11.2 HUS XML / official channel / receipt model
- bygg `HusOfficialArtifact`, `HusXmlVersion`, `HusSubmissionChannel`, `HusSubmissionReceipt`, `HusOfficialDecisionFile`
- state machines:
  - `HusOfficialArtifact: draft -> schema_validated -> ready_for_manual_official_send | disabled`
  - `HusSubmissionReceipt: expected -> imported -> mapped | rejected`
- commands:
  - `generateHusOfficialArtifact`
  - `validateHusXmlAgainstSchema`
  - `registerHusManualOfficialDispatch`
  - `importHusOfficialReceipt`
- invariants:
  - en XML-fil får inte blanda ROT och RUT
  - en XML-fil får inte blanda betalningsar
  - `sent` får inte sattas utan dispatch receipt eller manual official dispatch record
- blockerande valideringar:
  - deny generation om faktiskt antal arbetade timmar saknas
  - deny generation om laborbase innehåller material/resa/admin/other
  - deny `direct_api` som live capability utan officiell adapter
- receipts:
  - schema-validation receipt
  - artifact checksum
  - dispatch evidence
  - imported official decision/receipt file ref
- tester:
  - XSD validation suite
  - negative tests får blandade claim types
  - manual official receipt import tests

### Delfas 11.3 HUS decision import / payout / recovery / tax-account offset
- bygg `HusAuthorityDecisionImportBatch`, `HusAuthorityDecisionReceipt`, `HusDecisionDifferenceRecord`, `HusPayoutSettlement`, `HusRecoveryCase`, `HusTaxAccountOffset`
- state machines:
  - `HusDecisionDifference: open -> reviewed -> settled | written_off`
  - `HusRecoveryCase: draft -> review_pending -> approved -> recovered | offset | written_off`
- commands:
  - `importHusAuthorityDecisionBatch`
  - `openHusDecisionDifference`
  - `recordHusPayoutSettlement`
  - `approveHusRecoveryCase`
  - `recordHusTaxAccountOffset`
- invariants:
  - myndighetsbeslut får inte skriva över ursprunglig claim
  - recovery får aldrig vara tyst mutation av payout
  - tax-account offset måste bara authority reference
- blockerande valideringar:
  - deny payout-settlement utan decision state
  - deny write-off utan review chain
  - deny offset utan tax-account source ref
- receipts:
  - decision-import receipt
  - payout settlement receipt
  - recovery approval receipt
- tester:
  - partial acceptance golden test
  - payout-via-tax-account test
  - recovery and offset reconciliation test

### Delfas 11.4 regulated submission repository / envelope / attempt / receipt durability
- bygg `SubmissionEnvelopeRecord`, `SubmissionAttemptRecord`, `SubmissionReceiptRecord`, `SubmissionCorrectionLinkRecord`, `SubmissionEvidencePackRecord`, `SubmissionActionQueueItemRecord`
- state machines:
  - `SubmissionEnvelope: draft -> signed -> queued | submitted -> acknowledged -> accepted | domain_rejected | transport_failed | superseded`
  - `SubmissionAttempt: queued -> started -> provider_acknowledged | failed | timed_out`
- commands:
  - `createSubmissionEnvelope`
  - `appendSubmissionAttempt`
  - `appendSubmissionReceipt`
  - `linkSubmissionCorrection`
  - `updateSubmissionQueueItem`
- invariants:
  - payload hash + source version + idempotency key får hogst ge en aktiv envelope
  - receipts är append-only
  - correction skapar ny envelope, aldrig overwrite
- blockerande valideringar:
  - deny `accepted` utan mapped receipt
  - deny `finalized` utan required receipt family
- receipts:
  - command receipt per state change
  - evidence pack ref per envelope
  - external provider reference family
- tester:
  - crash/restart tests
  - duplicate send tests
  - correction-link persistence tests

### Delfas 11.5 regulated transport capability / send / poll / finalize hardening
- bygg `SubmissionTransportCapability`, `SubmissionTransportPlan`, `SubmissionDispatchReceipt`, `SubmissionReceiptPollPlan`, `SubmissionFinalizationDecision`
- state machines:
  - `SubmissionTransportCapability: disabled -> manual_official | live_provider | trial_only`
  - `SubmissionFinalizationDecision: pending -> ready_to_finalize -> finalized | blocked`
- commands:
  - `prepareSubmissionTransportPlan`
  - `dispatchSubmissionEnvelope`
  - `pollSubmissionReceipt`
  - `finalizeSubmissionEnvelope`
- invariants:
  - `prepareTransport` är aldrig liktydigt med live submit
  - live_provider kraver riktig credential class, provider environment och receipt mapping
- blockerande valideringar:
  - deny live dispatch får capability `manual_official`, `trial_only` eller `disabled`
  - deny finalize utan mapped receipt
- receipts:
  - dispatch receipt
  - receipt poll receipt
  - finalization receipt
- tester:
  - capability manifest tests
  - dispatch/finalize deny tests
  - live/manual/trial separation tests

### Delfas 11.6 manual receipt / correction / replay / dead-letter hardening
- bygg `SubmissionDeadLetterCase`, `SubmissionReplayPolicy`, `SubmissionManualReceiptImport`, `SubmissionRecoveryDecision`, `SubmissionCorrectionCase`
- state machines:
  - `SubmissionDeadLetterCase: open -> triaged -> replay_planned | correction_required | closed`
  - `SubmissionCorrectionCase: open -> prepared -> signed -> submitted | abandoned`
- commands:
  - `openSubmissionDeadLetterCase`
  - `planSubmissionReplay`
  - `openSubmissionCorrectionCase`
  - `importManualOfficialReceipt`
- invariants:
  - replay får inte användas där correction juridiskt krävs
  - manual receipt import är append-only
- blockerande valideringar:
  - deny replay om receipt/error klassas material reject
  - deny manual receipt overwrite
- receipts:
  - operator evidence ref per manual receipt
  - replay approval receipt
- tester:
  - replay vs correction policy tests
  - append-only manual receipt tests
  - dead-letter lifecycle tests

### Delfas 11.7 annual package / hard-close / version / evidence hardening
- bygg `AnnualPackageRecord`, `AnnualVersionRecord`, `AnnualEvidencePackRecord`, `AnnualSubmissionEventRecord`, `AnnualSourceFingerprint`
- state machines:
  - `AnnualVersion: draft -> locked_for_sign -> signed -> filing_ready | superseded`
- commands:
  - `createAnnualPackage`
  - `createAnnualVersion`
  - `lockAnnualVersionForSign`
  - `supersedeAnnualVersion`
- invariants:
  - source snapshot måste vara hard-closed
  - signerad version får aldrig skrivas över
  - supersede måste skapa ny version, inte mutation
- blockerande valideringar:
  - deny annual version om accounting period inte är `hard_closed`
  - deny sign/filing om checksum/signoff hash inte matchar
- receipts:
  - annual evidence pack
  - source fingerprint
  - signoff hash
- tester:
  - supersede chain tests
  - hard-close requirement tests
  - checksum/signoff consistency tests

### Delfas 11.8 annual signatory chain / legal completeness / annual sign security
- bygg `AnnualSignatoryRosterSnapshot`, `AnnualSignatoryPerson`, `AnnualSignoffRequirement`, `AnnualSignSession`, `AnnualSignApprovalReceipt`
- state machines:
  - `AnnualSignSession: opened -> step_up_verified -> signed | expired | rejected`
- commands:
  - `materializeAnnualSignatoryRoster`
  - `openAnnualSignSession`
  - `signAnnualVersion`
- invariants:
  - AB kraver samtliga styrelseledamoter och VD om sadan finns
  - sign får inte baseras på rollklass ensam
  - varje signering måste knytas till specific person och fresh step-up
- blockerande valideringar:
  - deny sign om roster är ofullständig
  - deny sign om required person saknas eller step-up är stale
- receipts:
  - step-up receipt
  - sign session receipt
  - signer identity receipt
- tester:
  - legal-form signatory matrix tests
  - stale step-up deny tests
  - full roster sign e2e

### Delfas 11.9 corporate tax declaration / SRU / iXBRL / taxonomy hardening
- bygg `CorporateTaxDeclarationPackage`, `SruArtifactFamily`, `IxbrlArtifactFamily`, `TaxonomyVersion`, `TaxDeclarationSubmissionCase`, `CurrentTaxComputationRecord`
- state machines:
  - `CorporateTaxDeclarationPackage: draft -> artifact_ready -> signing_ready -> filing_ready | superseded`
- commands:
  - `buildCorporateTaxDeclarationPackage`
  - `materializeSruArtifacts`
  - `materializeIxbrlArtifacts`
  - `markTaxDeclarationFilingReady`
- invariants:
  - tax pack måste peka på exakt annual version checksum
  - SRU artifacts ska ha INFO.SRU och BLÄNKETTER.SRU som separata artifacts
  - taxonomy/version får inte vara last metadatafalt
- blockerande valideringar:
  - deny filing-ready om annual version inte är signed
  - deny filing-ready om SRU/iXBRL family saknar baseline och checksum
- receipts:
  - taxonomy baseline ref
  - SRU artifact checksums
  - annual version checksum
- tester:
  - SRU artifact tests
  - taxonomy version tests
  - filing-ready gating tests

### Delfas 11.10 owner-distribution repository / snapshot / free-equity hardening
- bygg `ShareClassRecord`, `ShareholderHoldingSnapshotRecord`, `FreeEquitySnapshotRecord`, `DividendDecisionRecord`, `DividendPaymentInstructionRecord`, `Ku31DraftRecord`, `KupongskattRecord`
- state machines:
  - `DividendDecision: draft -> review_pending -> stamma_ready -> resolved -> payout_scheduled -> paid | reversed`
- commands:
  - `registerShareClass`
  - `captureShareholderHoldingSnapshot`
  - `captureFreeEquitySnapshot`
  - `createDividendDecision`
  - `resolveDividendAtStamma`
- invariants:
  - snapshot på beslutsdatum får aldrig muteras
  - free-equity proof måste vara sparbar till annual/interimsbalans
- blockerande valideringar:
  - deny stammobeslut utan snapshot
  - deny payout scheduling utan resolved decision
- receipts:
  - board/stamma evidence ref
  - free-equity proof ref
  - approval receipt
- tester:
  - immutable snapshot tests
  - decision repository tests
  - annual/free-equity linkage tests

### Delfas 11.11 dividend payout / KU31 / kupongskatt / residency hardening
- bygg `ResidencyEvidenceCase`, `BeneficialOwnerEvidenceCase`, `TreatyReductionReview`, `Ku31FilingCase`, `KupongskattFilingCase`, `DividendWithholdingProfile`
- state machines:
  - `TreatyReductionReview: draft -> review_pending -> approved | rejected`
  - `Ku31FilingCase: draft -> artifact_ready -> submitted | corrected | removed`
  - `KupongskattFilingCase: draft -> filing_ready -> submitted | corrected`
- commands:
  - `registerDividendRecipientTaxProfile`
  - `approveTreatyReductionReview`
  - `buildKu31FilingCase`
  - `buildKupongskattFilingCase`
  - `recordDividendPayout`
- invariants:
  - reducerad kupongskatt kraver treaty evidence och separat approval
  - svensk fysisk person med utdelning kraver KU31-path
  - due dates måste baras per filing case
- blockerande valideringar:
  - deny reduced withholding utan hemvist-/beneficial-owner evidence
  - deny payout utan recipient tax profile
- receipts:
  - residency evidence receipt
  - treaty approval receipt
  - filing artifact receipt
  - payment receipt
- tester:
  - withholding profile tests
  - KU31 due-date tests
  - kupongskatt reduction tests

### Delfas 11.12 provider / signing archive / external receipt hardening
- bygg `ProviderCapabilityManifest`, `ProviderCredentialClass`, `ExternalReferenceFamily`, `SigningArchiveReceipt`, `ProviderFailureClass`
- state machines:
  - `ProviderCapabilityManifest: draft -> verified -> active | revoked`
- commands:
  - `registerProviderCapabilityManifest`
  - `verifyProviderCapabilityManifest`
  - `archiveSignedEvidenceExternally`
- invariants:
  - provider manifest måste bara capability class, credential class och receipt family
  - signing archive får inte vara lokal Map i live/pilot
- blockerande valideringar:
  - deny live manifest utan external reference family
  - deny sign archive success utan archive receipt
- receipts:
  - provider verification receipt
  - external archive receipt
- tester:
  - manifest validation tests
  - archive receipt tests
  - false-live deny tests

### Delfas 11.13 regulated route security / strong_mfa / dual-control hardening
- bygg `RequiredTrustLevelPolicy`, `FreshStepUpSession`, `HighRiskApprovalReceipt`, `RouteEnforcementDecision`
- state machines:
  - `FreshStepUpSession: opened -> active -> expired | revoked`
- commands:
  - `openFreshStepUpSession`
  - `recordHighRiskApproval`
  - `enforceRouteTrustLevel`
- invariants:
  - `strong_mfa` i route-contract måste enforce:as i server
  - `annual_operations` och ändra surface policies ersätter inte trust enforcement
- blockerande valideringar:
  - deny annual sign/send/payout om required trust level saknas
  - deny same-actor flows där dual control krävs
- receipts:
  - route enforcement receipt
  - step-up receipt
  - approval receipt
- tester:
  - deny matrix tests
  - session TTL tests
  - dual-control tests

### Delfas 11.14 migration / import / cutover / replay hardening
- bygg `HusHistoryImportBatch`, `AnnualImportBatch`, `OwnerDistributionImportBatch`, `RegulatedHistoryVarianceReport`, `RegulatedCutoverBlocker`
- state machines:
  - `RegulatedImportBatch: draft -> validated -> applied | blocked | rejected`
- commands:
  - `validateRegulatedImportBatch`
  - `applyRegulatedImportBatch`
  - `openRegulatedCutoverBlocker`
- invariants:
  - regulated history utan receipts/evidence måste markas som legacy eller blockerad, inte tyst accepterad
- blockerande valideringar:
  - deny cutover om open filing cases eller unexplained authority liabilities finns
- receipts:
  - import batch receipt
  - variance report
  - cutover blocker receipt
- tester:
  - import validation tests
  - cutover blocker tests
  - variance report tests

### Delfas 11.15 runbook / seed / fake-live / legacy purge
- bygg `RunbookCapabilityRecord`, `SeedIsolationDecision`, `LegacyTruthClassification`
- state machines:
  - `RunbookCapabilityRecord: drafted -> verified -> active | archived`
- commands:
  - `classifyRunbookCapability`
  - `archiveLegacyRunbook`
  - `isolateRegulatedDemoSeed`
- invariants:
  - inga runbooks får pasta live capability som provider manifest inte stöder
  - demo seeds får inte na protected/live bootstrap
- blockerande valideringar:
  - deny protected/live boot om regulated demo seed aktiveras
- receipts:
  - runbook classification receipt
  - seed isolation receipt
- tester:
  - protected/live seed deny tests
  - docs capability lint

## Fas 12

### Delfas 12.1 truth-mode / persistence / classification hardening

- bygg:
  - `ProjectDomainRepository`
  - `FieldDomainRepository`
  - `PersonalliggareDomainRepository`
  - `Id06DomainRepository`
  - `KalkylDomainRepository`
  - `DomainTruthModeStatus`
  - `DomainClassMaskPolicy`
- commands:
  - `requireLegalEffectRepositoryMode`
  - `publishDomainClassMaskPolicy`
  - `verifyDomainTruthMode`
- invariants:
  - legal-effect mode får aldrig karas på `memory`
  - `projects`, `field`, `personalliggare`, `id06`, `kalkyl` får aldrig falla tillbaka till `S2`
- blockerande valideringar:
  - deny boot i `protected`, `pilot_parallel`, `production` om `storeKind !== postgres`
  - deny publish av route contracts om class-mask saknas
- routes/API-kontrakt:
  - intern truth-mode health route
- audit/evidence/receipt-krav:
  - truth-mode verification receipt
  - class-mask publication receipt
- tester:
  - boot deny on memory store
  - durable restart round-trip

### Delfas 12.2 project commercial lineage / immutable supersession

- bygg:
  - `ProjectCommercialLineage`
  - `ProjectCommercialVersionNode`
  - `ProjectCommercialSupersessionLink`
  - `ProjectCommercialCutoffResolver`
- state machines:
  - `ProjectCommercialVersionNode: draft -> approved -> active | superseded | retired`
- commands:
  - `registerProjectCommercialVersionNode`
  - `approveProjectCommercialVersionNode`
  - `linkProjectCommercialSupersession`
  - `resolveProjectCommercialCutoff`
- invariants:
  - historiska commercial records får aldrig skrivas över får att markera ny governing version
  - cutoff-resolver måste ge exakt en governing version per family
- blockerande valideringar:
  - deny overlapping active intervals
  - deny supersession utan `effectiveFrom`
- tester:
  - immutable lineage tests
  - cutoff resolver tests

### Delfas 12.3 kalkyl / quote / project-budget chain

- bygg:
  - `EstimateVersion`
  - `EstimateReviewDecision`
  - `EstimateApprovalDecision`
  - `EstimateQuoteConversionReceipt`
  - `ProjectBudgetVersion`
  - `ProjectBudgetApprovalDecision`
- state machines:
  - `EstimateVersion: draft -> reviewed -> approved -> quoted -> converted | superseded`
  - `ProjectBudgetVersion: draft -> review_pending -> approved | rejected | superseded`
- commands:
  - `reviewEstimateVersion`
  - `approveEstimateVersion`
  - `convertEstimateToCanonicalQuote`
  - `convertEstimateToProjectBudgetDraft`
  - `approveProjectBudgetVersion`
- invariants:
  - `quoted` kraver verklig `quoteId`
  - `approved` budget kraver separat approval-beslut
- blockerande valideringar:
  - deny same-actor approve där SoD-policy kraver separat approver
  - deny budget approval utan source trace
- routes/API-kontrakt:
  - nya approval routes får project budget
- tester:
  - estimate -> quote -> project chain
  - budget approval SoD tests

### Delfas 12.4 invoice-readiness / waiver / commercial decision

- bygg:
  - `ProjectInvoiceReadinessAssessment`
  - `ProjectInvoiceReadinessWaiver`
  - `ProjectInvoiceReadinessReceipt`
  - `ProjectCommercialExceptionDecision`
- state machines:
  - `ProjectInvoiceReadinessAssessment: calculated -> blocked | review_required | ready | ready_by_waiver`
  - `ProjectInvoiceReadinessWaiver: requested -> approved -> active -> expired | revoked`
- commands:
  - `materializeProjectInvoiceReadinessAssessment`
  - `requestProjectInvoiceReadinessWaiver`
  - `approveProjectInvoiceReadinessWaiver`
- invariants:
  - `ready_by_waiver` kraver aktiv waiver
  - waiver får aldrig vara tyst mutation
- blockerande valideringar:
  - deny waiver utan support/incident/reference chain
  - deny waive av blocker som policy farbjuder
- audit/evidence/receipt-krav:
  - waiver receipt med expiry och approver chain
- tester:
  - waiver expiry and blocker reset

### Delfas 12.5 period-control / close / reopen / rerun

- bygg:
  - `ProjectPeriodControl`
  - `ProjectCloseReceipt`
  - `ProjectReopenRequest`
  - `ProjectReopenImpact`
  - `ProjectRebridgePlan`
- state machines:
  - `ProjectPeriodControl: open -> soft_closed -> hard_closed -> reopened`
  - `ProjectReopenRequest: draft -> review_pending -> approved | rejected -> executed`
- commands:
  - `materializeProjectPeriodControl`
  - `requestProjectReopen`
  - `approveProjectReopen`
  - `executeProjectRerunPlan`
- invariants:
  - project runtime får inte ignorera ledger hard close
  - reopen måste skapa affected object list
- blockerande valideringar:
  - deny WIP rebridge i hard-closed period utan reopen receipt
  - deny green status när reopen impact är aktiv
- tester:
  - reopen impact tests
  - rerun requirement tests

### Delfas 12.6 WIP / revenue-recognition / accounting-policy

- bygg:
  - `ProjectAccountingPolicyProfile`
  - `ProjectRevenueRecognitionPolicyDecision`
  - `ProjectWipSnapshot`
  - `ProjectWipLedgerBridge`
  - `ProjectWipLedgerBridgeLine`
  - `ProjectWipCorrectionChain`
- state machines:
  - `ProjectAccountingPolicyProfile: draft -> approved -> active | superseded`
  - `ProjectWipLedgerBridge: draft -> posted -> reversed | superseded`
- commands:
  - `approveProjectAccountingPolicyProfile`
  - `materializeProjectWipSnapshot`
  - `bridgeProjectWipToLedger`
  - `reverseProjectWipLedgerBridge`
- invariants:
  - bridge får inte postas utan aktiv policy profile
  - bridge line måste bara dimensioner och source snapshot hash
- blockerande valideringar:
  - deny bridge om required accounts/policyrefs saknas
  - deny overwrite av posted bridge
- audit/evidence/receipt-krav:
  - bridge receipt med policy profile id, snapshot hash och journalEntryId
- officiella regler och källor:
  - BFN K2/K3 och svensk redovisningsvägledning får uppdrag/WIP/intäktsredovisning
- tester:
  - policy selection tests
  - bridge idempotency and reversal tests

### Delfas 12.7 build-VAT / omvänd byggmoms

- bygg:
  - `ProjectBuildVatServiceClassification`
  - `ProjectBuildVatDecisionBasis`
  - `ProjectBuildVatAssessment`
  - `ProjectBuildVatReceipt`
  - `ProjectBuildVatServiceCatalog`
- state machines:
  - `ProjectBuildVatAssessment: draft -> auto_decided | review_required -> approved | rejected`
- commands:
  - `classifyProjectBuildVatService`
  - `createProjectBuildVatAssessment`
  - `approveProjectBuildVatAssessment`
- invariants:
  - omvänd byggmoms får bara sattas med explicit decision basis
  - review-required får inte falla igenom till auto-green
- blockerande valideringar:
  - deny auto decision om tjänsteklass eller köparstatus är ofullständig
- officiella regler och källor:
  - [Skatteverket: farteckning över bygg- och anläggningstjänster vid omvänd byggmoms](https://skatteverket.se/foretag/moms/sarskildamomsregler/byggverksamhet/omvandbetalningsskyldighetinombyggsektorn/forteckningoverbyggochanlaggningstjanster/b.4.b1014b415f3321c0de37c1.html)
- tester:
  - build-VAT classification tests

### Delfas 12.8 profitability / allocation / mission-control

- bygg:
  - `ProjectProfitabilitySnapshot`
  - `ProjectProfitabilitySourceCoverage`
  - `ProjectAllocationBatch`
  - `ProjectAllocationLine`
  - `ProjectAllocationCorrection`
  - `ProjectProfitabilityAdjustment`
  - `ProjectMissionControlSnapshot`
- state machines:
  - `ProjectAllocationBatch: draft -> posted -> corrected | reversed`
  - `ProjectProfitabilityAdjustment: draft -> pending_review -> approved | rejected`
- commands:
  - `materializeProjectProfitabilitySnapshot`
  - `postProjectAllocationBatch`
  - `correctProjectAllocationBatch`
  - `decideProjectProfitabilityAdjustment`
- invariants:
  - varje belopp i snapshot ska ha source coverage
  - correction får aldrig skriva över tidigare allocation batch
- blockerande valideringar:
  - deny mission-control green om source coverage är ofullständig över policygröns
- audit/evidence/receipt-krav:
  - allocation batch receipt
  - source coverage receipt
- tester:
  - source coverage tests
  - allocation correction tests

### Delfas 12.9 field operational / offline / conflict

- bygg:
  - `OperationalCase`
  - `WorkOrder`
  - `FieldSyncEnvelope`
  - `FieldOfflinePolicyMatrix`
  - `FieldConflictRecord`
  - `FieldConflictResolutionReceipt`
  - `FieldFinanceHandoff`
- state machines:
  - `FieldSyncEnvelope: pending -> synced | conflicted | failed_terminal`
  - `FieldConflictRecord: open -> review_pending -> resolved | dismissed`
- commands:
  - `syncOfflineEnvelope`
  - `resolveFieldConflictRecord`
  - `createFieldFinanceHandoff`
- invariants:
  - `financeTruthOwner` måste vara `projects`
  - open conflict ska kunna blockera finance handoff
- blockerande valideringar:
  - deny unsupported offline mutation
  - deny finance handoff on open conflicts
- testers:
  - duplicate mutation tests
  - conflict and handoff blocking tests

### Delfas 12.10 personalliggare rule-catalog / kiosk / correction

- bygg:
  - `PersonalliggareRuleCatalog`
  - `PersonalliggareRuleVersion`
  - `ConstructionSite`
  - `AttendanceEvent`
  - `AttendanceCorrection`
  - `KioskDevice`
  - `KioskDeviceAttestationReceipt`
- state machines:
  - `ConstructionSiteThreshold: threshold_pending -> threshold_not_met | registration_required | active`
  - `KioskDevice: pending -> trusted | revoked`
  - `AttendanceEvent: captured -> synced -> corrected | voided_by_correction`
- commands:
  - `publishPersonalliggareRuleVersion`
  - `evaluateConstructionSiteThreshold`
  - `trustKioskDevice`
  - `correctAttendanceEvent`
- invariants:
  - threshold måste kunna harledas till rule version och source ref
  - correction får aldrig radera originalevent
- blockerande valideringar:
  - deny kiosk attendance without trusted device
  - deny registration-required site from bypassing registration status
- officiella regler och källor:
  - [Skatteverket: personalliggare i byggbranschen](https://skatteverket.se/foretag/arbetsgivare/personalliggare/personalliggarebyggbranschen.4.7be5268414bea0646949797.html)
- tester:
  - threshold-by-year tests
  - kiosk trust and correction chain tests

### Delfas 12.11 personalliggare XML / export / secure transfer

- bygg:
  - `PersonalliggareXmlArtifact`
  - `PersonalliggareXsdValidationResult`
  - `PersonalliggareTransferProfile`
  - `PersonalliggareTransferReceipt`
- state machines:
  - `PersonalliggareXmlArtifact: draft -> schema_validated -> ready_for_transfer | rejected`
  - `PersonalliggareTransferReceipt: expected -> imported -> mapped | rejected`
- commands:
  - `buildPersonalliggareXmlArtifact`
  - `validatePersonalliggareXml`
  - `registerPersonalliggareTransfer`
  - `importPersonalliggareTransferReceipt`
- invariants:
  - official export och internal audit export får inte blandas ihop
  - schema validation måste vara versionbunden
- blockerande valideringar:
  - deny transfer om XML inte är validerad
- officiella regler och källor:
  - [Skatteverket: schema/XML får personalliggare i byggbranschen](https://www.skatteverket.se/foretag/etjansterochblanketter/allaetjanster/schemalagerxml/personalliggareibyggbranschen.4.5a85666214dbad743ff34e0.html)
- tester:
  - XML serialization tests
  - schema validation and transfer receipt tests

### Delfas 12.12 ID06 provider / workplace / evidence

- bygg:
  - `Id06ProviderCapabilityManifest`
  - `Id06CompanyVerificationRequest`
  - `Id06PersonVerificationRequest`
  - `Id06CardStatusReceipt`
  - `Id06WorkplaceRegistryLink`
  - `Id06WorkplaceBinding`
  - `Id06EvidenceBundle`
  - `Id06BindingRevocationEvent`
- state machines:
  - `Id06CompanyVerificationRequest: draft -> dispatched -> verified | failed | expired`
  - `Id06PersonVerificationRequest: draft -> dispatched -> verified | failed | expired`
  - `Id06WorkplaceBinding: pending -> active | suspended | revoked | expired`
- commands:
  - `dispatchId06CompanyVerification`
  - `dispatchId06PersonVerification`
  - `importId06CardStatusReceipt`
  - `createId06WorkplaceBinding`
  - `revokeId06WorkplaceBinding`
- invariants:
  - live verification får aldrig uppsta utan provider receipt
  - workplace måste finnas i verkligt workplace registry
- blockerande valideringar:
  - deny synthetic workplace in legal-effect mode
  - deny active binding om receipt saknas eller är expired
- officiella regler och källor:
  - [ID06: ID06-kort](https://id06.se/id06-kort/)
  - [ID06: ID06 loggningsindex](https://id06.se/id06-loggningsindex/)
- tester:
  - provider contract tests
  - revocation and expiry tests

### Delfas 12.13 route / support boundary / masking

- bygg:
  - `Domain12SupportMaskPolicy`
  - `Domain12ReadSurfacePolicy`
  - `Domain12HighRiskReviewReceipt`
  - `Domain12ExportApproval`
- commands:
  - `publishDomain12SupportMaskPolicy`
  - `approveDomain12Export`
  - `expireDomain12ExportApproval`
- invariants:
  - support får bara se maskad version av personalliggare/ID06-identiteter och kansliga project refs
  - export kraver approval där policy kraver det
- blockerande valideringar:
  - deny export utan approval
  - deny read surface utan required trust level
- audit/evidence/receipt-krav:
  - export approval receipt
  - masked-view receipt
- tester:
  - support masking tests
  - route trust regression tests

### Delfas 12.14 import / live-conversion / parallel-run

- bygg:
  - `ProjectImportBatch`
  - `ProjectImportCollision`
  - `CommercialDiffReport`
  - `ProjectLiveConversionApproval`
  - `ProjectRollbackReceipt`
- state machines:
  - `ProjectImportBatch: draft -> imported -> diff_ready -> conversion_pending -> converted | rejected`
  - `ProjectRollbackReceipt: drafted -> approved -> executed`
- commands:
  - `importProjectBatch`
  - `materializeCommercialDiffReport`
  - `approveProjectLiveConversion`
  - `executeProjectRollback`
- invariants:
  - imported truth får inte bli governing utan diff signoff
  - rollback måste kunna peka på exakt conversion approval
- blockerande valideringar:
  - deny live conversion om collisions eller unresolved diffs finns
  - deny rollback om snapshot baseline saknas
- testers:
  - import collision tests
  - conversion and rollback tests

### Delfas 12.15 runbook / seed / fake-live / legacy purge

- bygg:
  - `Domain12RunbookClassification`
  - `Domain12LegacyTruthRecord`
  - `Domain12SeedIsolationReceipt`
- commands:
  - `classifyDomain12Runbook`
  - `archiveDomain12LegacyDocument`
  - `removeDomain12FakeLiveClaim`
  - `isolateDomain12Seed`
- invariants:
  - ingen doc eller seed får pasta live capability som runtime inte stödjer
  - demo seeds får aldrig na protected/live bootstrap
- blockerande valideringar:
  - deny legal-effect boot om domain-12 demo seed aktiveras
  - deny docs release om fake-live claim hittas
- tester:
  - docs capability lint
  - seed isolation boot deny tests

## Fas 13

### Delfas 13.1 reporting truth / persistence / classification

- bygg:
  - `ReportingDomainRepository`
  - `ReportDefinition`
  - `ReportSnapshot`
  - `ReportingTruthModeStatus`
  - `ReportingClassificationPolicy`
- state machines:
  - `ReportingTruthModeStatus: unresolved -> repository_required -> repository_active | blocked`
- commands:
  - `requireReportingRepositoryMode`
  - `publishReportingClassificationPolicy`
  - `verifyReportingTruthMode`
- invariants:
  - legal-effect reporting får aldrig karas på `memory`
  - reportingklassning måste skilja BFL-bevarande från cache/read-model-data
- tester:
  - boot deny on memory store
  - repository round-trip för definitions and snapshots

### Delfas 13.2 locked snapshot / preliminary / supersession

- bygg:
  - `ReportSnapshotLifecycle`
  - `ReportSnapshotLockReceipt`
  - `ReportSnapshotSupersession`
  - `ReportSnapshotReopenRequest`
- state machines:
  - `ReportSnapshot: draft -> preliminary -> locked -> superseded | reopened`
- commands:
  - `createPreliminaryReportSnapshot`
  - `lockReportSnapshot`
  - `supersedeReportSnapshot`
  - `requestReportSnapshotReopen`
- invariants:
  - last snapshot får aldrig skrivas över
  - supersession och reopen måste skapa explicit lineage
- blockerande valideringar:
  - deny export, signoff och drilldown när last snapshot krävs men saknas
- tester:
  - snapshot immutability tests
  - reopen and supersession lineage tests

### Delfas 13.3 snapshot-scopad drilldown / journal search

- bygg:
  - `ReportLineDrilldownArtifact`
  - `ReportJournalScope`
  - `SnapshotBoundSearchRequest`
  - `SnapshotBoundSearchReceipt`
- commands:
  - `buildReportLineDrilldown`
  - `searchSnapshotBoundJournalEntries`
- invariants:
  - drilldown och journal search får bara läsa snapshot-bundna refs
  - efterföljande ledgerfarandringar får inte ändra last drilldown
- blockerande valideringar:
  - deny live lookup om `snapshotScopeRef` saknas
- tester:
  - locked snapshot drilldown stability
  - journal search before/after ledger mutation

### Delfas 13.4 reconciliation / signoff / close binding

- bygg:
  - `ReconciliationRun`
  - `ReconciliationDifferenceItem`
  - `ReconciliationCloseReceipt`
  - `ReconciliationCorrectionRequest`
  - `ReconciliationRerunRequirement`
- state machines:
  - `ReconciliationRun: draft -> open -> reviewed -> signed -> closed | reopened | correction_required`
- commands:
  - `reviewReconciliationRun`
  - `signOffReconciliationRun`
  - `closeReconciliationRun`
  - `reopenReconciliationRun`
- invariants:
  - signoff racker inte får close
  - close måste binda till locked snapshot och close checklist
- blockerande valideringar:
  - deny close om öppna difference items eller saknade signoffs finns
- tester:
  - signoff/close/reopen chain
  - correction-required rerun

### Delfas 13.5 report export / artifact / distribution

- bygg:
  - `ReportExportArtifact`
  - `ReportExportStorageProfile`
  - `ReportExportDistributionReceipt`
  - `ReportExportWatermarkDecision`
  - `ReportExportApproval`
- state machines:
  - `ReportExportArtifact: requested -> built -> stored -> distributed | failed | revoked`
- commands:
  - `requestReportExport`
  - `buildReportExportArtifact`
  - `registerReportExportDistributionReceipt`
- invariants:
  - artifact content, hash, mime type och storage ref måste vara first-class
  - fake bytes eller `memory://` får aldrig användas i legal-effect mode
- blockerande valideringar:
  - deny distribution om artifact hash, storage ref eller approval saknas
- tester:
  - artifact hash reproducibility
  - distribution receipt import

### Delfas 13.6 search projection contract / masking / retention

- bygg:
  - `SearchProjectionContractVersion`
  - `SearchProjectionFieldPolicy`
  - `SearchMaskPolicy`
  - `SearchRetentionProfile`
  - `SearchProjectionDocumentReceipt`
- state machines:
  - `SearchProjectionContractVersion: draft -> approved -> active | superseded | revoked`
- commands:
  - `publishSearchProjectionContractVersion`
  - `indexProjectionDocument`
  - `purgeSearchProjectionDocument`
- invariants:
  - sakindex får bara innehålla kontraktsgodkanda projected fields
  - raw source payload får aldrig lagras som index-truth
  - retention får index/cache måste kunna vara kortare an BFL-bevarande får canonical truth
- officiella regler och källor:
  - [Bokfaringslag (1999:1078)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/bokforingslag-19991078_sfs-1999-1078/)
  - [IMY: grundlaggande principer enligt GDPR](https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/grundlaggande-principer/)
- tester:
  - projected-field-only tests
  - retention and purge safety tests

### Delfas 13.7 search query / snippet / ranking governance

- bygg:
  - `SearchQueryContract`
  - `SearchFilterPolicy`
  - `SearchSnippetPolicy`
  - `SearchRankingProfile`
- commands:
  - `executeGovernedSearchQuery`
  - `previewSearchSnippet`
  - `publishSearchRankingProfile`
- invariants:
  - queryable fields, filter operators och sort orders måste vara deklarativa
  - snippets får aldrig innehålla maskade fält eller oexplicit payload
- blockerande valideringar:
  - deny unsupported query/filter/sort
  - deny snippet generation får fält utanför policy
- tester:
  - deterministic ranking
  - snippet masking

### Delfas 13.8 reindex / checkpoints / replay / repair

- bygg:
  - `SearchCheckpointState`
  - `SearchReplayPlan`
  - `SearchRepairRun`
  - `SearchProjectionFreshnessReceipt`
- state machines:
  - `SearchCheckpointState: pending -> caught_up | stale | blocked | replay_required`
  - `SearchRepairRun: planned -> started -> completed | failed`
- commands:
  - `requestSearchReindex`
  - `planSearchReplay`
  - `executeSearchRepairRun`
- invariants:
  - freshness måste harledas från explicit checkpoint, inte från `now`
  - replay och repair ska lamna receipts med source version range
- blockerande valideringar:
  - deny `fresh` status om checkpoint ligger efter senaste source version
- tester:
  - full rebuild
  - stale-to-fresh transition

### Delfas 13.9 object profiles / freshness / action contracts

- bygg:
  - `ObjectProfileContract`
  - `ObjectProfileFreshnessState`
  - `ObjectProfileActionContract`
  - `ObjectProfileAvailabilityReason`
- state machines:
  - `ObjectProfileFreshnessState: missing_projection -> stale | fresh | blocked`
- commands:
  - `materializeObjectProfile`
  - `publishObjectProfileActionContract`
- invariants:
  - `targetVersion` måste vara verklig projected version
  - action availability måste vara kontrakts- och permissionbunden
- blockerande valideringar:
  - deny `fresh` när source version > projected version
  - deny actionable profile när contract version mismatch finns
- tester:
  - stale/fresh/object-missing
  - permission-reason rendering

### Delfas 13.10 workbenches / saved views / widgets

- bygg:
  - `WorkbenchContract`
  - `WorkbenchFreshnessState`
  - `SavedViewLifecycle`
  - `WidgetContractVersion`
  - `SavedViewInvalidationReceipt`
- state machines:
  - `SavedViewLifecycle: draft -> active | invalidated | superseded | archived`
- commands:
  - `publishWorkbenchContract`
  - `createSavedView`
  - `invalidateSavedView`
  - `publishWidgetContractVersion`
- invariants:
  - saved views får inte fortsatta som aktiva efter brytande kontraktsdrift
  - widgets måste bara checkpoint ref, contract ref och permission summary
- blockerande valideringar:
  - deny widget render om freshness state är `blocked`
- tester:
  - saved-view invalidation
  - widget contract migration

### Delfas 13.11 mission control / cockpit snapshots

- bygg:
  - `CockpitSnapshot`
  - `CockpitBlocker`
  - `CockpitFreshnessState`
  - `CockpitGenerationReceipt`
- state machines:
  - `CockpitSnapshot: pending -> generated -> fresh | stale | blocked | superseded`
- commands:
  - `generateCockpitSnapshot`
  - `markCockpitSnapshotStale`
  - `acknowledgeCockpitBlocker`
- invariants:
  - cockpit får aldrig utge sig får att vara live truth utan freshness proof
  - blocker inheritance från underliggande queues/checkpoints måste vara explicit
- blockerande valideringar:
  - deny go/no-go-beslut på cockpit utan `fresh` eller explicit override receipt
- tester:
  - cockpit stale/blocker
  - snapshot supersession

### Delfas 13.12 notifications / digest / provider delivery

- bygg:
  - `NotificationOutboxRecord`
  - `NotificationDeliveryAttempt`
  - `NotificationProviderReceipt`
  - `NotificationDigest`
  - `NotificationEscalationDecision`
- state machines:
  - `NotificationOutboxRecord: queued -> dispatched -> delivered | retry_scheduled | dead_letter`
  - `NotificationDigest: draft -> ready -> delivered | superseded | failed`
- commands:
  - `queueNotification`
  - `dispatchNotificationOutboxRecord`
  - `importNotificationProviderReceipt`
  - `buildNotificationDigest`
- invariants:
  - varje leveransfarsak måste ha idempotency key
  - provider receipt måste knytas till exakt delivery attempt
- blockerande valideringar:
  - deny provider-level `delivered` utan receipt import
- tester:
  - single-send and retry
  - digest supersession

### Delfas 13.13 activity / replay / visibility decisions

- bygg:
  - `ActivityProjectionEvent`
  - `ActivityReplayRun`
  - `ActivityVisibilityDecision`
  - `ActivityRetentionRule`
- state machines:
  - `ActivityReplayRun: planned -> started -> completed | failed`
  - `ActivityVisibilityDecision: proposed -> approved -> active | expired | revoked`
- commands:
  - `projectActivityEvent`
  - `replayActivityProjection`
  - `approveActivityVisibilityDecision`
- invariants:
  - hide/unhide ska vara separat policyobjekt, inte mutation av källaktiviteten
  - activity feed måste kunna återbyggas från source events och receipts
- blockerande valideringar:
  - deny destructive hide som raderar original activity proof
- tester:
  - replay determinism
  - hide/unhide decision

### Delfas 13.14 route / surface / support boundary / audit

- bygg:
  - `MissionControlSurfacePolicy`
  - `ReportingExportApproval`
  - `WorkbenchExportApproval`
  - `ReadSurfaceAuditReceipt`
  - `SurfacePermissionReason`
- commands:
  - `publishMissionControlSurfacePolicy`
  - `approveReportingExport`
  - `approveWorkbenchExport`
- invariants:
  - mission control måste ha egen surface family
  - exports från reporting/search/workbench/cockpit kraver watermark och actor receipt där policy kraver det
- blockerande valideringar:
  - deny export utan approval/watermark
  - deny support read utanför mask policy
- tester:
  - route trust regression
  - support/export boundary

### Delfas 13.15 runbook / seed / fake-live / legacy purge

- bygg:
  - `Domain13RunbookClassification`
  - `Domain13LegacyTruthRecord`
  - `Domain13SeedIsolationReceipt`
- commands:
  - `classifyDomain13Runbook`
  - `archiveDomain13LegacyDocument`
  - `isolateDomain13DemoSeed`
  - `removeDomain13FakeLiveClaim`
- invariants:
  - ingen doc, seed eller demo artifact får pasta live capability som runtime inte stödjer
  - demo seeds får aldrig na protected/live bootstrap
- blockerande valideringar:
  - deny docs release om gamla bindningspastaenden återstar
  - deny protected boot om demo seed ingar i legal-effect config
- tester:
  - docs capability lint
  - seed isolation boot deny

## Fas 14

### Delfas 14.1 phase5 dependency / baseline-governance hardening

- bygg:
  - `ProviderBaselineSelection`
  - `ProviderPublicationReceipt`
  - `ProviderSchemaSelection`
  - `IntegrationBaselineRequirement`
- commands:
  - `selectIntegrationProviderBaseline`
  - `verifyIntegrationBaselineRequirement`
- invariants:
  - varje providerbundet kommando måste resolva baseline via central registry när policy kraver det
  - baseline id, version, checksum och effective date måste baras i operationer, jobs, callbacks och receipts
- blockerande valideringar:
  - deny runtime om baseline saknas där policy kraver det
- tester:
  - baseline missing deny
  - checksum drift deny

### Delfas 14.2 integrations control-plane / connection-profile hardening

- bygg:
  - `IntegrationConnection`
  - `IntegrationConnectionProfile`
  - `IntegrationConnectionStatus`
  - `IntegrationEnablementDecision`
  - `IntegrationStalenessState`
- state machines:
  - `IntegrationConnectionStatus: draft -> validated -> enabled | disabled | revoked`
- commands:
  - `createIntegrationConnection`
  - `updateIntegrationConnectionProfile`
  - `decideIntegrationEnablement`
- invariants:
  - control plane är enda primara skrivyta får connection truth
  - partner/public/webhook/job-moduler får inte aga egen canonical connection-status
- blockerande valideringar:
  - deny dispatch om connection saknar canonical status eller enablement decision
- tester:
  - control-plane-only mutation
  - partner-state backfill deny

### Delfas 14.3 credential / secret-ref / consent / expiry hardening

- bygg:
  - `CredentialSetMetadata`
  - `CredentialSetLifecycle`
  - `ConsentGrant`
  - `CredentialExpiryBlocker`
  - `SecretRotationReceipt`
- state machines:
  - `CredentialSetLifecycle: active -> expiring | expired | revoked | rotated`
  - `ConsentGrant: pending -> authorized | expired | revoked`
- commands:
  - `recordCredentialSetMetadata`
  - `authorizeConsent`
  - `revokeCredentialSet`
  - `recordSecretRotationReceipt`
- invariants:
  - durable state får bara bara refs, fingerprints, previews, key version och posture metadata
  - ra secrets, access tokens och callback secrets får aldrig hamna i DB, exports eller logs
- blockerande valideringar:
  - deny dispatch om credential eller consent är expired/revoked
- tester:
  - masking and isolation
  - expiry/revoke blocking

### Delfas 14.4 capability-manifest / mode-matrix / receipt-mode hardening

- bygg:
  - `CapabilityManifest`
  - `CapabilityManifestVersion`
  - `ModeMatrix`
  - `ReceiptModePolicy`
  - `ProviderRealityClass`
- commands:
  - `publishCapabilityManifestVersion`
  - `classifyProviderReality`
- invariants:
  - manifest måste vara publicerat artefaktobjekt, inte bara runtime helper-data
  - `supportsLegalEffect=false` blockerar live enablement alltid
  - `fake-live` eller `sandbox only` får aldrig bara production/legal-effect flagga
- blockerande valideringar:
  - deny enablement om manifestets reality class och mode matrix inte tillater miljan
- tester:
  - manifest/mode drift
  - fake-live deny

### Delfas 14.5 public-api / oauth / compatibility-baseline / sandbox hardening

- bygg:
  - `PublicApiSpec`
  - `PublicApiClient`
  - `PublicApiToken`
  - `PublicApiCompatibilityBaseline`
  - `PublicApiSandboxPolicy`
- state machines:
  - `PublicApiClient: active | revoked`
  - `PublicApiCompatibilityBaseline: recorded -> current | superseded | blocked`
- commands:
  - `recordPublicApiCompatibilityBaseline`
  - `createPublicApiClient`
  - `exchangePublicApiClientCredentials`
  - `revokePublicApiClient`
- invariants:
  - endast versionsatt canonical public surface är tillaten
  - compatibility baseline måste harledas från faktisk router/spec
  - sandbox måste vara tydligt vattenmarkt och isolerad
- blockerande valideringar:
  - deny spec release om route/spec hash driver
- officiella regler och källor:
  - [RFC 6749 OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)
- tester:
  - token issue/revoke
  - route hash drift

### Delfas 14.6 partner-api / contract-test / operation hardening

- bygg:
  - `ContractTestPack`
  - `ContractTestPackVersion`
  - `ContractTestResult`
  - `PartnerOperation`
  - `PartnerOperationPolicy`
  - `PartnerOperationReceipt`
- state machines:
  - `ContractTestPackVersion: draft -> published | superseded | revoked`
  - `PartnerOperation: queued -> running -> succeeded | failed | fallback | rate_limited`
- commands:
  - `publishContractTestPackVersion`
  - `runAdapterContractTest`
  - `dispatchPartnerOperation`
  - `recordPartnerOperationReceipt`
- invariants:
  - production dispatch kraver passing pack får exakt connection, provider och baseline
  - `dryRun` får aldrig masquerada som riktig operation
- blockerande valideringar:
  - deny production dispatch utan passing immutable contract test result
- tester:
  - dispatch gate
  - contract-pack lineage

### Delfas 14.7 route / contract / surface drift hardening

- bygg:
  - `IntegrationRouteContract`
  - `IntegrationSurfaceMap`
  - `RouteContractManifest`
  - `RouteDriftReceipt`
- commands:
  - `publishIntegrationRouteContractManifest`
  - `verifyIntegrationRouteDrift`
- invariants:
  - docs, router och generated contract manifest måste matcha exakt
  - split mellan `/v1/public/*` och `/v1/public-api/*` får inte leva kvar som oklar sanning
- blockerande valideringar:
  - deny release om route drift finns
- tester:
  - route contract hash
  - prefix consistency

### Delfas 14.8 inbound-webhook / callback-security hardening

- bygg:
  - `ProviderCallbackProfile`
  - `ProviderCallbackAttempt`
  - `CallbackReplayLease`
  - `BusinessIdempotencyRecord`
  - `CallbackSecretVersion`
- state machines:
  - `ProviderCallbackAttempt: received -> signature_verified | rejected -> handled | dead_lettered`
- commands:
  - `registerProviderCallbackProfile`
  - `recordProviderCallbackAttempt`
  - `verifyProviderCallbackSignature`
  - `claimCallbackReplayLease`
- invariants:
  - signaturkontroll och business idempotency är två separata kontroller
  - callback secret rotation måste vara versionsbunden och auditbar
- blockerande valideringar:
  - deny business handling om signature verification eller replay lease saknas
- tester:
  - signature replay window
  - duplicate callback idempotency

### Delfas 14.9 outbound-webhook / delivery-security hardening

- bygg:
  - `WebhookSubscription`
  - `WebhookSigningKeyVersion`
  - `WebhookDelivery`
  - `WebhookDeliveryAttempt`
  - `WebhookDeliveryDeadLetter`
- state machines:
  - `WebhookDelivery: queued -> running -> sent | failed | rate_limited | suppressed | disabled | dead_lettered`
- commands:
  - `createWebhookSubscription`
  - `emitWebhookEvent`
  - `dispatchWebhookDeliveries`
  - `rotateWebhookSigningKey`
- invariants:
  - varje delivery attempt måste bara signing key version, idempotency key och provider reference när sadan finns
  - legacy `subscription.secret` får inte finnas kvar i canonical live path
- blockerande valideringar:
  - deny live dispatch om subscription fortfarande beror på legacy secret path
- tester:
  - key rotation
  - delivery retry/dead-letter

### Delfas 14.10 async-job / dead-letter / replay / backpressure hardening

- bygg:
  - `IntegrationAsyncJob`
  - `IntegrationDeadLetterCase`
  - `IntegrationReplayPlan`
  - `IntegrationBackpressureState`
  - `CircuitBreakerState`
- state machines:
  - `IntegrationAsyncJob: queued -> claimed -> running -> succeeded | failed | retry_scheduled | dead_lettered | replay_planned | replayed`
- commands:
  - `enqueueIntegrationJob`
  - `planIntegrationReplay`
  - `executeIntegrationReplay`
  - `updateIntegrationBackpressureState`
- invariants:
  - replay måste bara `connectionId`, `providerCode`, `mode`, `sourceSurfaceCode` och `baselineRef`
  - backpressure och circuit breaker måste vara connection policy, inte ad hoc-status
- blockerande valideringar:
  - deny replay om connection-aware metadata inte kan återstallas
- tester:
  - replay metadata preservation
  - circuit-breaker/backpressure

### Delfas 14.11 health / enablement / staleness hardening

- bygg:
  - `IntegrationHealthSnapshot`
  - `IntegrationEnablementDecision`
  - `IntegrationFreshnessState`
  - `IntegrationHealthEvidence`
- state machines:
  - `IntegrationEnablementDecision: pending -> approved | denied | suspended`
  - `IntegrationFreshnessState: fresh | stale | blocked`
- commands:
  - `recordIntegrationHealthSnapshot`
  - `decideIntegrationEnablement`
  - `markIntegrationFreshnessState`
- invariants:
  - health, enablement och staleness får aldrig kollapsas till en enda grön indikator
  - credential expiry, consent expiry, baseline drift och receipt lag måste vara egna checks
- blockerande valideringar:
  - deny live use om enablement saknas även när health är grön
- tester:
  - health vs enablement separation
  - stale-state blocking

### Delfas 14.12 trial / sandbox / production isolation hardening

- bygg:
  - `IntegrationEnvironmentIsolationPolicy`
  - `RuntimeModeBoundary`
  - `PromotionReceipt`
  - `CrossModeReuseViolation`
- commands:
  - `verifyIntegrationEnvironmentIsolation`
  - `promoteIntegrationEnvironment`
- invariants:
  - credentials, callbacks, receipts och provider refs får inte återanvändas över farbjudna modes
  - trial/sandbox/live måste vara hart separerade i state och restore
- blockerande valideringar:
  - deny cross-mode replay, import och promotion utan explicit receipt
- tester:
  - cross-mode deny
  - promotion receipt

### Delfas 14.13 provider-reference-boundary hardening

- bygg:
  - `ExternalReferenceLink`
  - `ProviderReferencePolicy`
  - `ProviderReferenceReceipt`
- commands:
  - `linkExternalProviderReference`
  - `verifyProviderReferenceBoundary`
- invariants:
  - provider-specifika ids får aldrig bli canonical business ids
  - varje external ref måste mappas till ett internt canonical object id
- blockerande valideringar:
  - deny writes som farsaker använda provider ref som primary domain id
- tester:
  - external-reference mapping
  - provider swap survivability

### Delfas 14.14 mutation-scope hardening

- bygg:
  - `IntegrationMutationScope`
  - `IntegrationWriteApproval`
  - `SurfaceMutationReceipt`
- commands:
  - `publishIntegrationMutationScope`
  - `approveIntegrationWrite`
- invariants:
  - public API, partner API, callbacks och jobs får bara skriva inom explicit mutation scope
  - integrationsytor får inte kringga källdomänernas riktiga commands
- blockerande valideringar:
  - deny write utanför mutation scope eller object family
- tester:
  - över-broad mutation deny
  - source-domain bypass

### Delfas 14.15 provider-baseline / schema-governance hardening

- bygg:
  - `ProviderSchemaSelection`
  - `ProviderSchemaCompatibilityGate`
  - `ProviderPublicationArtifact`
  - `ProviderRollbackReceipt`
- commands:
  - `publishProviderSchemaSelection`
  - `verifyProviderSchemaCompatibilityGate`
  - `rollbackProviderPublication`
- invariants:
  - schema-byte kraver ny publication, ny checksum och nytt contract-test-pack
  - route/spec/job/callback-runtime måste bara samma schema/baseline truth
- blockerande valideringar:
  - deny schema drift i runtime
- tester:
  - schema drift deny
  - rollback receipt

### Delfas 14.16 provider reality classification / fake-live removal hardening

- bygg:
  - `ProviderRealityClassification`
  - `ProviderEvidenceBundle`
  - `ProviderFakeLiveRemovalReceipt`
- commands:
  - `classifyProviderReality`
  - `removeFakeLiveProviderClaim`
- invariants:
  - stateless providers utan verklig adapterruntime får inte markas `legal_effect_ready`
  - docs och tester får inte pasta mer an provider reality class tillater
- blockerande valideringar:
  - deny enablement om provider reality class är `fake_live`
- tester:
  - fake-live denial
  - doc/runtime reality lint

### Delfas 14.17 Swedish adapter priority hardening

- bygg:
  - `AdapterPriorityWave`
  - `AdapterMarketEvidence`
  - `AdapterBacklogDecision`
- commands:
  - `publishAdapterPriorityWave`
  - `recordAdapterMarketEvidence`
- invariants:
  - svenska wave-1 adapters måste styras av officiellt dokumenterade ekosystembehov
  - long-tail adapters får inte prioriteras fare svenska go-livekritiska behov
- officiella regler och källor:
  - [OpenPeppol BIS Billing 3.0](https://docs.peppol.eu/poacc/billing/3.0/)
  - [Fortnox Developer Portal](https://www.fortnox.se/en/developer/developer-portal)
  - [Visma Developer](https://developer.visma.com/)
  - [Bokio API / integrationer](https://www.bokio.se/hjalp/integrationer/bokio-api/automatisera-bokforingen-i-bokio-med-api-sa-gor-du/)
- tester:
  - priority-wave policy
  - backlog ordering

## Fas 15

### Delfas 15.1 source-discovery / family-detection hardening

- bygg:
  - `SourceSystemProfile`
  - `SourceFamilyDetectionReceipt`
  - `SourceArtifactFingerprint`
  - `SourceDiscoveryBlocker`
- state machines:
  - `SourceSystemProfile: discovered -> classified | blocked | superseded`
- commands:
  - `discoverSourceSystem`
  - `classifySourceSystemFamily`
  - `attachSourceDiscoveryEvidence`
  - `blockSourceSystemProfile`
- invariants:
  - one-click får bara kara discovery och skapa ett dry-run-startobjekt
  - `familyCode` får inte sattas utan evidens
  - `documents_only` får aldrig ge `economicTruth=true`
- blockerande valideringar:
  - deny extract om family är `unknown`, `ambiguous` eller `documents_only`
- officiella regler och källor:
  - [Fareningen SIE-Gruppen: format](https://sie.se/format/)
- tester:
  - SIE header detection
  - CSV/Excel fingerprint detection
  - ambiguous family blocking

### Delfas 15.2 source-connection / consent / capability-detection hardening

- bygg:
  - `SourceConnection`
  - `ConsentGrant`
  - `CapabilitySnapshot`
  - `SourceConnectionHealthState`
  - `SourceConnectionExpiryBlocker`
- state machines:
  - `SourceConnection: draft -> authorized | expired | revoked | blocked`
  - `ConsentGrant: pending -> granted | expired | revoked`
- commands:
  - `registerSourceConnection`
  - `grantSourceConsent`
  - `revokeSourceConsent`
  - `deriveCapabilitySnapshot`
- invariants:
  - migrationsdomänen får inte läsa raa secrets; bara secret refs och trust posture
  - extract kraver effektivt giltig consent
  - capability snapshot ska versioneras när auth scopes eller provider baseline ändras
- blockerande valideringar:
  - deny extract när required scopes eller capabilities saknas
- officiella regler och källor:
  - [Fortnox: scopes](https://www.fortnox.se/en/developer/guides-and-good-to-know/scopes)
  - [Visma Developer: authentication](https://developer.vismaonline.com/docs/authentication)
- tester:
  - consent expiry blocking
  - scope change -> capability snapshot rotation
  - file-only bundle path without OAuth

### Delfas 15.3 cutoff-basis / date-hierarchy hardening

- bygg:
  - `CutoffBasis`
  - `CutoffBinding`
  - `CutoffConflictReceipt`
- state machines:
  - `CutoffBasis: draft -> frozen | superseded | blocked`
- commands:
  - `createCutoffBasis`
  - `freezeCutoffBasis`
  - `bindCutoffBasisToDataset`
  - `blockCutoffConflict`
- invariants:
  - ett cutover-plan får bara använda en aktiv cutoff-basis-version
  - opening balances, journal history, open items, payroll YTD och AGI history måste bara explicita cutofffalt
  - diff, parallel run, import och switch måste använda samma basis-hash
- blockerande valideringar:
  - deny acceptance om dataset i samma plan bar olika cutoff-basis-versioner
- officiella regler och källor:
  - [Bokfaringsnamnden: arkivering](https://www.bfn.se/fragor-och-svar/arkivering/)
  - [Skatteverket: när ska arbetsgivardeklaration lamnas](https://www.skatteverket.se/foretag/arbetsgivare/lamnaarbetsgivardeklaration/narskajaglamnaarbetsgivardeklaration.4.361dc8c15312eff6fd13c11.html)
- tester:
  - opening balance date validation
  - journal/open-item overlap blocking
  - payroll/AGI period mismatch blocking

### Delfas 15.4 wave-1 ingress canonicalization hardening

- bygg:
  - `ExtractManifest`
  - `ExtractArtifactRef`
  - `IngressFamilyPolicy`
  - `IngressSchemaVersion`
- state machines:
  - `ExtractManifest: requested -> extracted -> frozen | blocked | superseded`
- commands:
  - `extractFromApiSource`
  - `extractFromSie4`
  - `extractFromCsvTemplate`
  - `extractFromExcelTemplate`
  - `extractFromBureauBundle`
- invariants:
  - alla wave-1-ingressvagar måste producera samma manifestmodell
  - SIE4 får inte behandlas som speciallane utanför canonical path
  - unsupported format eller unknown tags får inte tyst ignoreras
- blockerande valideringar:
  - deny extract utan source profile, connection och cutoff basis
- officiella regler och källor:
  - [Fareningen SIE-Gruppen: format](https://sie.se/format/)
  - [Bokio: importera bokfaring](https://www.bokio.se/hjalp/komma-igang/importera-bokforing/importera-bokforing-steg-for-steg/)
  - [Bokio: exportera bokfaring](https://www.bokio.se/hjalp/bokforing/exportera-bokforing/hur-exporterar-jag-bokforing-fran-bokio/)
- tester:
  - strict SIE parsing
  - CSV/Excel schema enforcement
  - bureau manifest requirement

### Delfas 15.5 canonical-dataset / lineage / raw-artifact governance hardening

- bygg:
  - `CanonicalDataset`
  - `CanonicalDatasetFamily`
  - `DatasetLineageEdge`
  - `RawSourceArtifact`
  - `RawArtifactAccessPolicy`
  - `RawArtifactRetentionProfile`
- state machines:
  - `CanonicalDataset: built -> frozen | superseded | blocked`
  - `RawSourceArtifact: registered -> sealed | archived | purged`
- commands:
  - `registerRawSourceArtifact`
  - `buildCanonicalDataset`
  - `freezeCanonicalDataset`
  - `archiveRawSourceArtifact`
- invariants:
  - varje dataset måste ha schemaVersion, checksum, lineageRefs och coverage class
  - raartefakter måste vara krypterade, hashade och accessstyrda
  - saknat kritiskt dataset är blocker, inte warning
- blockerande valideringar:
  - deny import, variance och cutover om obligatorisk dataset family saknas
- officiella regler och källor:
  - [Bokfaringsnamnden: arkivering](https://www.bfn.se/fragor-och-svar/arkivering/)
  - [Bokfaringsnamnden: overfaring av rakenskapsinformation](https://www.bfn.se/vad-innebar-den-andrade-regeln-om-overforing-av-rakenskapsinformation-i-bokforingslagen/)
- tester:
  - dataset checksum stability
  - lineage traceability
  - raw artifact retention/access policy enforcement

### Delfas 15.6 mapping / auto-mapping / confidence / blocker-code hardening

- bygg:
  - `MappingSet`
  - `AutoMappingCandidate`
  - `MappingConfidenceScore`
  - `BlockedFieldDecision`
  - `FieldCoverageReceipt`
- state machines:
  - `MappingSet: draft -> reviewed -> approved | blocked | superseded`
  - `AutoMappingCandidate: proposed -> accepted | rejected | superseded`
- commands:
  - `generateAutoMappingCandidates`
  - `approveMappingSet`
  - `rejectMappingCandidate`
  - `recordFieldCoverageDecision`
- invariants:
  - mapping approval kraver coverage- och blocker-status
  - manual override måste bara explanation, actor och source lineage
  - blocked field får inte doljas i approved mapping set
- blockerande valideringar:
  - deny import om required sourcefalt saknar resolved mapping
- tester:
  - confidence scoring
  - blocked field persistence
  - override receipt immutability

### Delfas 15.7 variance / materiality / waiver / signoff hardening

- bygg:
  - `VarianceReport`
  - `VarianceItem`
  - `MaterialityDecision`
  - `WaiverRecord`
  - `VarianceSignoff`
- state machines:
  - `VarianceReport: generated -> reviewed -> accepted | remediation_required | superseded`
  - `WaiverRecord: proposed -> approved | expired | revoked`
- commands:
  - `generateVarianceReport`
  - `decideVarianceItem`
  - `approveVarianceWaiver`
  - `signVarianceReport`
- invariants:
  - variance måste räknas av motorn från canonical source + target truth
  - material diff får inte accepteras utan signoff eller waiver där policy kraver det
  - waiver måste vara tidsboxad och scopead till specifika variance items
- blockerande valideringar:
  - deny acceptance om blockerande variance item saknar resolved state
- tester:
  - materiality classification
  - waiver expiry
  - engine-generated diff only

### Delfas 15.8 target-write / identity-resolution / duplicate / double-count hardening

- bygg:
  - `TargetWritePolicy`
  - `IdentityResolutionRule`
  - `DuplicateDetectionReceipt`
  - `DoubleCountGuard`
  - `TargetWriteReceipt`
- state machines:
  - `TargetWriteReceipt: planned -> written | blocked | replayed`
- commands:
  - `planTargetWrites`
  - `resolveCanonicalIdentity`
  - `enforceDoubleCountGuard`
  - `writeTargetObjects`
- invariants:
  - varje object family måste ha explicit create/merge/replace/block-policy
  - provider/source refs får inte bli canonical ids
  - samma ekonomiska sanning får inte kunna landa två ganger genom olika ingressvagar
- blockerande valideringar:
  - deny import om identity resolution är ambiguous eller double-count guard traffar
- tester:
  - duplicate customer/vendor tests
  - open-item double-count tests
  - external-ref isolation tests

### Delfas 15.9 import-execution / domain-landing / idempotency hardening

- bygg:
  - `ImportBatchExecution`
  - `ImportWriteReceipt`
  - `LandingFailureRecord`
  - `ImportReplayReceipt`
- state machines:
  - `ImportBatchExecution: received -> validated -> landing -> landed | blocked | replay_required`
- commands:
  - `executeImportBatch`
  - `replayFailedImportLanding`
  - `recordLandingFailure`
- invariants:
  - import får bara landa via riktiga targetdomän-kommandon
  - status får inte hoppa direkt till `reconciled` utan target receipts
  - idempotency gäller bade batch och per target object
- blockerande valideringar:
  - deny accepted batch om target receipts saknas
- tester:
  - batch idempotency
  - object-level replay
  - failure receipts

### Delfas 15.10 parallel-run / parity / threshold hardening

- bygg:
  - `ParallelRunPlan`
  - `ParallelRunMeasurement`
  - `ParallelRunThresholdProfile`
  - `ParityDecision`
  - `ParallelRunAcceptanceReceipt`
- state machines:
  - `ParallelRunPlan: planned -> running -> completed | manual_review_required | blocked | accepted`
- commands:
  - `startParallelRunPlan`
  - `computeParallelRunMeasurements`
  - `acceptParallelRunPlan`
- invariants:
  - measurements måste komma från source + target receipts och shared cutoff basis
  - caller får inte injecta metrics
  - manual acceptance får bara ske inom policygrönser
- blockerande valideringar:
  - deny acceptance när hard block-threshold eller basis mismatch finns
- tester:
  - threshold evaluation
  - shared cutoff-basis enforcement
  - manual review policy

### Delfas 15.11 cutover-plan / final-extract / delta-extract / switch hardening

- bygg:
  - `CutoverPlan`
  - `FreezeWindowState`
  - `FinalExtractArtifact`
  - `DeltaExtractArtifact`
  - `SwitchReceipt`
  - `CutoverValidationReceipt`
- state machines:
  - `CutoverPlan: planned -> freeze_started -> final_extract_done -> validation_passed -> switched -> stabilized -> closed | rollback_in_progress | rolled_back | aborted`
- commands:
  - `startCutoverFreeze`
  - `completeFinalExtract`
  - `computeDeltaExtract`
  - `validateCutoverPlan`
  - `switchCutoverTruth`
- invariants:
  - final extract måste ge manifest, checksum, dataset refs och actor receipt
  - delta extract måste vara explicit skillnad efter freeze
  - switch får inte vara ren statustransition
- blockerande valideringar:
  - deny switch om final extract artifact eller parity acceptance saknas
- tester:
  - final extract artifact creation
  - delta extract correctness
  - switch receipt generation

### Delfas 15.12 rollback / restore / checkpoint / compensation hardening

- bygg:
  - `CutoverCheckpoint`
  - `RollbackPlan`
  - `RollbackExecutionReceipt`
  - `RollbackCompensationPlan`
  - `RollbackModeDecision`
- state machines:
  - `RollbackPlan: planned -> executing -> completed | blocked`
- commands:
  - `createCutoverCheckpoint`
  - `decideRollbackMode`
  - `executeRestoreBackedRollback`
  - `executeCompensationRollback`
- invariants:
  - rollback måste explicit vara `restore_backed` eller `post_switch_compensation`
  - restore-backed rollback kraver checkpoint lineage och godkänd restore drill
  - compensation-mode kraver explicit policy får regulated filings
- blockerande valideringar:
  - deny rollback om checkpoint eller compensation plan saknas får valt mode
- tester:
  - rollback mode selection
  - restore-backed rollback
  - regulated compensation requirements

### Delfas 15.13 post-cutover correction / watch-window hardening

- bygg:
  - `PostCutoverCorrectionCase`
  - `WatchWindowState`
  - `WatchSignal`
  - `CorrectionClosureReceipt`
- state machines:
  - `PostCutoverCorrectionCase: open -> approved -> implemented -> closed | reopened`
  - `WatchWindowState: active -> stable | blocked | closed`
- commands:
  - `openPostCutoverCorrectionCase`
  - `recordWatchSignal`
  - `closeWatchWindow`
- invariants:
  - cutover close får inte ske medan watch window är blockerad
  - correction lane måste bara owner, SLA och signoff där policy kraver det
- blockerande valideringar:
  - deny cutover close om correction cases eller watch blockers är öppna
- tester:
  - watch-window blocker propagation
  - correction reopen
  - cutover close denial

### Delfas 15.14 payroll-history / YTD / AGI / balance landing hardening

- bygg:
  - `PayrollMigrationBatch`
  - `EmployeeMigrationRecord`
  - `PayrollHistoryLandingReceipt`
  - `YtdCarryForwardReceipt`
  - `AgiCarryForwardReceipt`
  - `PayrollMigrationExecutionReceipt`
- state machines:
  - `PayrollMigrationBatch: draft -> imported -> validated -> diff_open -> approved_for_cutover -> cutover_executed | rolled_back | blocked`
- commands:
  - `importPayrollHistoryRecords`
  - `validatePayrollHistoryCoverage`
  - `finalizePayrollMigrationLanding`
  - `rollbackPayrollMigrationLanding`
- invariants:
  - finalize får inte reduceras till balance baseline-posting
  - YTD/AGI carry-forward måste kunna lasas av riktig payrollruntime efter migration
  - history evidence bundle måste tacka varje required evidence area
- blockerande valideringar:
  - deny finalize om landing receipt saknas får required payrollomraden
- officiella regler och källor:
  - [Skatteverket: när ska arbetsgivardeklaration lamnas](https://www.skatteverket.se/foretag/arbetsgivare/lamnaarbetsgivardeklaration/narskajaglamnaarbetsgivardeklaration.4.361dc8c15312eff6fd13c11.html)
  - [Skatteverket: ratta en arbetsgivardeklaration](https://www.skatteverket.se/foretag/arbetsgivare/lamnaarbetsgivardeklaration/rattaenarbetsgivardeklaration.4.2cf1b5cd163796a5c8b6698.html)
- tester:
  - payroll evidence coverage
  - YTD/AGI landing semantics
  - finalize/rollback receipts

### Delfas 15.15 bureau-portfolio / delegated-approval / cohort hardening

- bygg:
  - `BureauMigrationPortfolio`
  - `ClientMigrationScope`
  - `DelegatedMigrationApproval`
  - `MigrationCohortDashboard`
  - `ClientScopeIsolationReceipt`
- state machines:
  - `DelegatedMigrationApproval: requested -> approved | rejected | revoked`
- commands:
  - `createBureauMigrationPortfolio`
  - `delegateMigrationApproval`
  - `buildMigrationCohortDashboard`
- invariants:
  - byra och klientdata får aldrig bloda mellan scopes
  - dashboard måste bygga på riktiga plan-, dataset- och cutoverobjekt
- blockerande valideringar:
  - deny delegated signoff om actor scope inte matchar klientscope
- tester:
  - multi-client isolation
  - delegated approval boundary
  - cohort dashboard truth

### Delfas 15.16 trial-live-promotion / non-in-place isolation hardening

- bygg:
  - `PromotionMigrationLink`
  - `PromotionIsolationReceipt`
  - `ForbiddenCarryOverDecision`
- state machines:
  - `PromotionMigrationLink: drafted -> validated -> executed | blocked`
- commands:
  - `linkPromotionToMigrationCutover`
  - `verifyPromotionIsolation`
- invariants:
  - copy-to-new-live-tenant är enda tillåtna promotion mode där promotion används
  - migration cutover och promotion får inte skapa två oberoende live-sanningar
- blockerande valideringar:
  - deny promotion om forbidden carry-över refs eller artifacts finns
- tester:
  - copy-not-mutate enforcement
  - forbidden carry-över blocking
  - promotion/migration evidence linkage

### Delfas 15.17 route / surface / runbook / seed / legacy purge

- bygg:
  - `MigrationRouteContract`
  - `MigrationSurfaceMap`
  - `RunbookTruthReceipt`
  - `MigrationSeedScopePolicy`
  - `LegacyMigrationClaimRemovalReceipt`
- invariants:
  - `/v1/sie/*`, `/v1/migration/*`, `/v1/import-cases/*`, `/v1/payroll/migrations/*` och trial-promotion surfaces måste ha tydligt separerade syften
  - runbooks får inte beskriva cockpitmetadata som teknisk migrationsmotor
  - demo seeds får inte finnas i protected/livevagar
- blockerande valideringar:
  - deny release om route contract och runbook truth driver från rebuild-sanningen
- tester:
  - route truth lint
  - runbook truth lint
  - protected-mode demo-seed deny

### Delfas 15.18 Swedish source priority / competitor migration friction hardening

- bygg:
  - `SourcePriorityWave`
  - `MigrationMarketEvidence`
  - `SourceFrictionDecision`
- invariants:
  - svenska wave-1-källor måste prioriteras fare long-tail adapters
  - varje prioriterad source family måste ha officiell auth/export/import-evidens
  - unsupported high-friction source måste klassas explicit, inte antydas som klar
- blockerande valideringar:
  - deny wave-1-ready claim om official-source evidence saknas
- officiella regler och källor:
  - [Fortnox: scopes](https://www.fortnox.se/en/developer/guides-and-good-to-know/scopes)
  - [Visma Developer: authentication](https://developer.vismaonline.com/docs/authentication)
  - [Bokio: importera bokfaring](https://www.bokio.se/hjalp/komma-igang/importera-bokforing/importera-bokforing-steg-for-steg/)
  - [Bokio: exportera bokfaring](https://www.bokio.se/hjalp/bokforing/exportera-bokforing/hur-exporterar-jag-bokforing-fran-bokio/)
- tester:
  - source-priority lint
  - wave-1 evidence completeness

## Fas 16

### Delfas 16.1 support-case / masked-view / reveal hardening
- bygg `SupportCase`, `SupportCaseTransitionReceipt`, `MaskedProjectionPolicy`, `RevealRequest`, `RevealApproval`, `RevealSession`, `RevealExpiryReceipt`
- commands: `createSupportCase`, `triageSupportCase`, `transitionSupportCase`, `requestReveal`, `approveReveal`, `activateRevealSession`, `expireRevealSession`
- invariants:
  - support read är maskad som default
  - full read kraver aktiv reveal-session med scope, reason, approver, watermark och TTL
  - close kraver closure receipt
- routes:
  - `/v1/backoffice/support-cases`
  - `/v1/backoffice/reveal-requests`
  - `/v1/backoffice/reveal-sessions`
- tester:
  - masked read by default
  - reveal approval flow
  - auto-expiry and remasking

### Delfas 16.2 support-write / diagnostics / mutation-scope hardening
- bygg `BackofficeMutationScope`, `BackofficeMutationScopeVersion`, `SupportMutationReceipt`, `AdminDiagnosticExecution`, `StepUpReceipt`
- commands: `publishBackofficeMutationScope`, `runAdminDiagnostic`, `recordSupportMutationReceipt`, `verifyStepUpReceipt`
- invariants:
  - varje support-write bar support-case-id, approval ref, mutation-scope ref och trust-level receipt
  - allowlist publiceras som first-class scope-version, inte bara som kodkonstant
  - support-write får inte skriva affärssanning direkt
- routes:
  - `/v1/backoffice/support-cases/:supportCaseId/diagnostics`
  - `/v1/backoffice/mutation-scopes`
- tester:
  - diagnostic allow/deny
  - self-approval deny
  - step-up expiry

### Delfas 16.3 impersonation hardening
- bygg `ImpersonationSession`, `ImpersonationActionScopeReceipt`, `ImpersonationTerminationReceipt`, `ImpersonationEvidenceBundle`
- commands: `requestImpersonation`, `approveImpersonation`, `activateImpersonation`, `terminateImpersonation`
- invariants:
  - read-only och limited-write är separata modes
  - limited-write måste matcha aktiv mutation-scope-version
  - watermark och expiry krävs alltid
- routes:
  - `/v1/backoffice/impersonations/*`
- tester:
  - read-only deny on writes
  - limited-write scope enforcement
  - expiry and evidence export

### Delfas 16.4 break-glass / emergency-access hardening
- bygg `BreakGlassGrant`, `BreakGlassApprovalReceipt`, `EmergencyAccessAccountProfile`, `EmergencyAccessUsageAlert`, `BreakGlassReviewReceipt`
- commands: `requestBreakGlass`, `approveBreakGlass`, `activateBreakGlass`, `closeBreakGlassSession`, `recordEmergencyAccessUsageAlert`
- invariants:
  - incidentId krävs
  - två olika approvers krävs
  - emergency access-konton och larm är first-class
- routes:
  - `/v1/backoffice/break-glass/*`
  - `/v1/ops/emergency-access-accounts`
  - `/v1/ops/emergency-access-alerts`
- tester:
  - dual approval
  - usage alert generation
  - post-review blocker

### Delfas 16.5 access-review / SoD hardening
- bygg `AccessReviewCase`, `SoDViolationRecord`, `DelegationRemediation`, `AccessReviewSignoff`
- commands: `generateAccessReview`, `recordSoDViolation`, `remediateDelegation`, `signAccessReview`
- invariants:
  - stale delegations och SoD-fynd är first-class
  - same actor cannot both create and sign where separation krävs
- routes:
  - `/v1/backoffice/access-reviews*`
  - `/v1/backoffice/sod-violations`
- tester:
  - stale delegation detection
  - signoff separation

### Delfas 16.6 replay / dead-letter / correction-orchestration hardening
- bygg `ReplayOperation`, `ReplayApprovalReceipt`, `ReplayExecutionReceipt`, `ReplayOutcomeVerification`, `DeadLetterCase`, `DeadLetterResolutionReceipt`, `CorrectionCaseLink`, `ReconciliationRerunRequest`
- commands: `registerReplayOperation`, `approveReplayOperation`, `executeReplayOperation`, `verifyReplayOutcome`, `linkCorrectionCase`, `requestReconciliationRerun`
- invariants:
  - replay completion är inte samma sak som verifierad återstallning
  - dead-letter får inte hoppa direkt till slutligt resolved
  - correction case får inte maskeras som replay
- routes:
  - `/v1/backoffice/replays/*`
  - `/v1/backoffice/dead-letters/*`
  - `/v1/ops/corrections/*`
- tester:
  - dead-letter transition suite
  - replay verification suite
  - correction-vs-replay separation

### Delfas 16.7 incident-signal / incident / post-review / blast-radius hardening
- bygg `IncidentSignal`, `RuntimeIncident`, `IncidentImpactGraph`, `IncidentAffectedDependency`, `IncidentContainmentDecision`, `IncidentPostReview`, `CorrectiveActionReceipt`, `PreventiveActionReceipt`
- commands: `recordIncidentSignal`, `openIncident`, `recordIncidentEvent`, `updateIncidentStatus`, `recordIncidentPostReview`, `recordContainmentDecision`
- invariants:
  - close kraver post-review
  - linked break-glass måste vara reviewed fare close
  - impact graph måste bara tenant, provider, job, release, cutover och secret/cert-referenser
- routes:
  - canonical `/v1/ops/incidents/*`
- tester:
  - incident close blocker
  - blast radius materialization
  - corrective/preventive action receipts

### Delfas 16.8 queue / SLA / escalation / submission-monitor hardening
- bygg `OpsQueueAggregate`, `SlaScanExecution`, `EscalationDecision`, `SubmissionMonitorFreshnessState`, `QueueOwnerAssignment`
- commands: `runSlaScan`, `recordEscalationDecision`, `materializeOpsQueueAggregate`
- invariants:
  - queue aggregate måste bara owner och freshness
  - stale monitor får inte se grön ut
- routes:
  - `/v1/ops/queues`
  - `/v1/ops/escalations`
  - `/v1/backoffice/submissions/monitor`
- tester:
  - stale queue detection
  - escalation flow

### Delfas 16.9 checkpoint / restore-drill / replay-drill hardening
- bygg `RollbackCheckpoint`, `RestoreDrillExecution`, `ReplayDrillExecution`, `DrillVerificationReceipt`
- commands: `createRollbackCheckpoint`, `sealRollbackCheckpoint`, `startRestoreDrill`, `completeRestoreDrill`, `startReplayDrill`, `completeReplayDrill`
- invariants:
  - drills måste bara checkpoint, plan, actor och verification summary
  - failed drills skapar incident signal eller no-go blocker
- routes:
  - canonical `/v1/ops/drills/*`
- officiella källor:
  - [NIST SP 800-34](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final)
- tester:
  - checkpoint seal suite
  - restore/replay drill lifecycle

### Delfas 16.10 ops-feature-flag / emergency-disable / rotation / revoke hardening
- bygg `FeatureFlag`, `EmergencyDisable`, `GlobalKillSwitch`, `SecretRotationPlan`, `SecretRotationExecution`, `CallbackSecretRevocation`, `CertificateRevocationDecision`
- commands: `upsertFeatureFlag`, `requestEmergencyDisable`, `activateGlobalKillSwitch`, `planSecretRotation`, `executeSecretRotation`, `revokeCallbackSecret`, `revokeCertificateChain`
- invariants:
  - feature rollout är inte samma objekt som kill switch
  - global kill switch bar platform scope och incident/containment ref
  - rotation måste vara verifierbar
- routes:
  - `/v1/ops/feature-flags/*`
  - `/v1/ops/emergency-disables/*`
  - `/v1/super-admin/kill-switches/*`
  - `/v1/ops/secrets/*`
- officiella källor:
  - [AWS Secrets Manager rotation](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html)
- tester:
  - dual control suite
  - rotation lifecycle suite
  - kill-switch activation suite

### Delfas 16.11 platform-control-plane / super-admin / tenant-registry / quarantine / kill-switch hardening
- bygg `TenantRegistryEntry`, `TenantBlockerSnapshot`, `TenantFreezeDecision`, `TenantQuarantineProfile`, `NoGoBoardSnapshot`, `ProviderRuntimeHealth`, `PlatformControlPlaneSnapshot`
- commands: `registerTenantRegistryEntry`, `materializeNoGoBoard`, `freezeTenantScope`, `liftTenantFreeze`, `recordProviderRuntimeHealth`
- invariants:
  - varje tenant har registry entry
  - no-go board är global och inte bara faretagsscope
  - cross-tenant actions är masked-by-default och auditade
- routes:
  - `/v1/super-admin/tenants`
  - `/v1/super-admin/tenants/:tenantId/freeze`
  - `/v1/super-admin/no-go-board`
  - `/v1/super-admin/providers/health`
- tester:
  - freeze scope enforcement
  - no-go board aggregation
  - provider-health aggregation

### Delfas 16.12 freshness / staleness / rebuild-control / cross-tenant-search hardening
- bygg `FreshnessSnapshot`, `ReadModelLagRecord`, `RebuildExecution`, `CrossTenantSearchAudit`, `SearchRevealRequest`
- commands: `materializeFreshnessSnapshot`, `startRebuildExecution`, `recordCrossTenantSearch`, `requestSearchReveal`
- invariants:
  - operator views visar explicit freshness state
  - cross-tenant search returnerar maskat resultat utan approved reveal
- routes:
  - `/v1/super-admin/freshness`
  - `/v1/super-admin/rebuilds`
  - `/v1/super-admin/search`
- tester:
  - freshness classification
  - rebuild lifecycle
  - masked cross-tenant search

### Delfas 16.13 route / surface / policy / auth-boundary hardening
- bygg `RouteFamilyManifest`, `SurfacePolicyBindingReceipt`, `OperationTrustRequirement`, `BackofficeRoleGrant`
- commands: `publishRouteFamilyManifest`, `bindSurfacePolicy`, `verifyOperationTrustRequirement`
- invariants:
  - canonical families är `/v1/backoffice/*`, `/v1/ops/*`, `/v1/super-admin/*`
  - ingen high-risk route får luta enbart på `company.manage`
- tester:
  - route truth lint
  - policy drift lint
  - trust-level enforcement

### Delfas 16.14 support-export / audit / watermark / retention hardening
- bygg `SupportExportRequest`, `AuditExportRequest`, `WatermarkedExportReceipt`, `OpsArtifactRetentionPolicy`, `LegalHoldDecision`
- commands: `requestSupportExport`, `approveSupportExport`, `applyLegalHold`, `generateWatermarkedExport`
- invariants:
  - varje export bar watermark id, retention profile och actor chain
  - legal hold blockerar purge
- routes:
  - `/v1/backoffice/exports/support`
  - `/v1/backoffice/exports/audit`
  - `/v1/ops/legal-holds`
- tester:
  - export approval suite
  - retention/legal hold suite

### Delfas 16.15 runbook / release-evidence / provenance / hermetic-ci hardening
- bygg `RunbookExecution`, `RunbookExecutionStep`, `RunbookEvidenceAttachment`, `ReleaseEvidenceBundleRef`, `ReleaseProvenanceReceipt`
- commands: `startRunbookExecution`, `attachRunbookEvidence`, `completeRunbookExecution`, `linkReleaseEvidenceBundle`
- invariants:
  - `incident-response.md` och `release-evidence.md` är canonical runbooks
  - release evidence måste bara build ref, artifact digest, environment manifest, approvals och rollback path
- routes:
  - `/v1/ops/runbook-executions`
  - `/v1/ops/release-evidence`
- officiella källor:
  - [NIST SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final)
  - [SLSA Provenance](https://slsa.dev/spec/v1.0/provenance)
- tester:
  - runbook execution lifecycle
  - release provenance mismatch blocker

### Delfas 16.16 doc / seed / duplicate-runbook / legacy purge
- bygg `LegacyArtifactDecision`, `LegacyArtifactArchiveReceipt`, `DemoSeedIsolationReceipt`
- commands: `archiveLegacyRunbook`, `markDemoSeedTestOnly`, `recordLegacyArtifactDecision`
- invariants:
  - duplicate runbooks får inte vara canonical
  - demo seeds får inte laddas i protected eller live mode
- dokumentbeslut:
  - keep/harden: `support-case-and-replay.md`, `support-impersonation.md`, `restore-drill.md`, `feature-flag-rollout-and-emergency-disable.md`, `secrets-certificates-and-key-rotation.md`
  - rewrite: `support-backoffice-and-audit-review.md`, `security-incident-response.md`, `incident-response-and-production-hotfix.md`
  - replace/create: `incident-response.md`, `release-evidence.md`
  - archive/merge: de tre duplicerade replay/dead-letter-runbooks
  - migrate to test-only or archive: phase14 demo seeds
- tester:
  - docs truth lint
  - demo-seed deny in protected mode

## Fas 17

### Delfas 17.1 route / object / state-machine drift hardening
- bygg `GoLiveDecision`, `AdvantageScorecard`, `GovernanceRouteManifest`, `GovernancePermissionProfile`, `GovernanceStateTransitionReceipt`
- commands: `publishGovernanceRouteManifest`, `recordAdvantageScorecard`, `createGoLiveDecision`, `transitionGoLiveDecision`
- invariants:
  - canonical governance-route-family är enda sanningen
  - GA får inte vara binar `approved|blocked`
  - named signers måste vara bindbara på objektniva
- tester:
  - route truth lint
  - deny direct approve from draft

### Delfas 17.2 pilot-execution hardening
- bygg ut `PilotExecution` med `customerRef`, `sourceSystemRefs`, `providerRealismRefs`, `buildRef`, `artifactDigest`, `environmentManifestRef`, `rulepackRefs`, `providerBaselineRefs`
- bygg `PilotExecutionScenarioOutcome` och `PilotExecutionProvenanceReceipt`
- invariants:
  - pilot completion kraver provenance och provider realism
  - fria textspar ersätter inte first-class scenario outcomes
- tester:
  - deny completion without provenance
  - evidence export includes digest and manifest

### Delfas 17.3 pilot-cohort / representativeness / anti-cherry-pick hardening
- bygg `PilotRepresentativenessEvaluation` och `PilotCoverageReceipt`
- invariants:
  - `minimumPilotCount: 1` är farbjudet där bredd krävs
  - hard-case och rollback readiness kan vara blockerande
- tester:
  - deny cohort pass with only easy cases
  - deny cohort pass with missing rollback readiness

### Delfas 17.4 zero-blocker / waiver-hygiene hardening
- bygg `FindingRecord`, `WaiverDecision`, `WaiverExpiryReceipt`, `GateFindingSnapshot`
- invariants:
  - öppna `critical`, `high` och `unclassified` blockerar GA
  - waiver över `medium` är farbjuden
- tester:
  - deny GA with high finding
  - deny waiver above severity ceiling

### Delfas 17.5 negative-evidence / gate-invalidation hardening
- bygg `NegativeEvidenceRecord`, `GateInvalidationRecord`, `GateSupersessionLink`
- invariants:
  - negativ evidens är append-only
  - artifact-, route-, config-, provider- och rulepack-drift kan invalidiera green gates
- tester:
  - append-only history
  - invalidation on drift

### Delfas 17.6 deploy-equality / artifact-provenance hardening
- bygg `DeployEquivalenceRecord`, `ReleaseProvenanceReceipt`, `DeployAttestation`, `EnvironmentManifestSnapshot`
- invariants:
  - `pilot_parallel` får inte vara substitut får production deploy-equality
  - samma digest och manifest måste kunna bindas till alla relevanta gates
- officiella källor:
  - [SLSA Provenance](https://slsa.dev/spec/v1.0/provenance)
  - [NIST SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final)
- tester:
  - deny GA on digest mismatch
  - provenance verification

### Delfas 17.7 parity-scorecard / competitor-evidence hardening
- bygg `OfficialCompetitorEvidenceRef` och `ParityCriterionOutcome`
- invariants:
  - parity kraver officiell källa, datum, plan och marknadssegment
  - svensk marknadsrelevans måste vara explicit
- officiella källor:
  - [Fortnox](https://www.fortnox.se/)
  - [Teamleader](https://www.teamleader.eu/en/)
  - [Bygglet](https://www.bygglet.com/)
  - [Bokio](https://www.bokio.se/)
- tester:
  - deny parity without official source
  - deny stale comparison date

### Delfas 17.8 advantage-scorecard / differentiator hardening
- bygg differentiatorvisa `AdvantageScorecard`, `DifferentiatorRuntimeRef`, `DifferentiatorValueProof`
- invariants:
  - bundle-only green är farbjuden
  - varje differentiator kraver egen evidens, egen review och egna runtime refs
- tester:
  - deny advantage with missing differentiator
  - deny advantage without runtime refs

### Delfas 17.9 provider-realism hardening
- bygg `ProviderRealismRecord`, `ProviderRealismMatrix`, `ProviderRealismPolicy`
- invariants:
  - varje externt beroende klassas `real|sandbox|simulated|fallback`
  - reglerade green paths får inte vara `simulated`
- tester:
  - provider realism matrix suite
  - deny gate on simulated regulated dependency

### Delfas 17.10 marketed-capability-coverage hardening
- bygg `MarketedCapabilityCoverageRecord`, `CapabilityOwnerSignoff`, `CapabilityEvidenceLink`
- invariants:
  - varje live-marknadsfard capability måste ha coverage och owner signoff
- tester:
  - deny marketed capability without owner signoff
  - deny GA-ready claim if required capability lacks coverage

### Delfas 17.11 UI-contract-freeze / consumer-contract / compatibility-policy hardening
- bygg ut `UiContractFreezeRecord` med `compatibilityPolicyRef`, `consumerBaselineRefs`, `consumerDriftScanRef`
- bygg `CompatibilityPolicy`, `ConsumerDriftScan`, `FreezeInvalidationReceipt`
- invariants:
  - freeze bygger från runtime contracts
  - route- och permissiondrift kan invalidiera freeze
  - governance-surface ska ha egen kontraktspolicy
- tester:
  - invalidate freeze on route drift
  - consumer drift detection

### Delfas 17.12 go-live-decision / signoff / legal-readiness hardening
- bygg `GoLiveDecisionApproval`, `LegalApprovalRef`, `SecurityReadinessApproval`, `OperationsReadinessApproval`, `FinanceReadinessApproval`
- invariants:
  - `approvedBy[]` och `approvedAt` är obligatoriska
  - legal, security, operations och finance måste delta där policy kraver det
- tester:
  - deny approval without full signer chain
  - deny direct approve from draft

### Delfas 17.13 golden-scenario / migration / rollback-rehearsal hardening
- bygg `GoldenScenarioRun`, `GoldenScenarioOutcome`, `GoldenScenarioFreshnessPolicy`, `MigrationRehearsalRecord`, `RollbackRehearsalRecord`
- invariants:
  - varje obligatoriskt golden scenario måste vara first-class outcome
  - migration och rollback rehearsal får inte bara vara runbooktext
- tester:
  - deny GA on stale golden scenario
  - deny GA on missing rollback rehearsal

### Delfas 17.14 non-functional-ga-gate / no-go / staged-rollout / post-ga-watch hardening
- bygg `NonFunctionalGateRecord`, `NoGoTrigger`, `RolloutStage`, `WatchWindow`, `WatchSignal`, `RolloutPauseDecision`
- invariants:
  - latency, throughput, queue lag, support load och operator effort kan blockera rollout
  - watch window måste vara first-class och blockerande tills exit criteria är uppfyllda
- tester:
  - stage blocker suite
  - watch window exit suite

### Delfas 17.15 kill-switch / on-call / rollback-path hardening
- bygg `KillSwitchCoverageRef`, `OnCallReadinessRef`, `RollbackPathRef`, `GoLiveOpsReadinessSnapshot`
- invariants:
  - kill switch, on-call och rollback path måste vara aktiva och frascha
- tester:
  - deny GA without on-call
  - deny GA without kill-switch coverage
  - deny GA without rollback path

### Delfas 17.16 runbook / legacy / doc purge och slutlig GA re-verification
- bygg `RunbookTruthDecision`, `LegacyArtifactDecision`, `FinalGaReverificationReceipt`
- invariants:
  - `pilot-readiness.md` och `general-availability.md` är canonical
  - gamla phase18-ansprak som inte längre är sanna ska arkiveras eller markas som legacy
  - slutlig GA re-verification måste karas på samma artifact som ska ga live
- dokumentbeslut:
  - keep/harden: `pilot-cohorts.md`, `pilot-execution.md`, `parity-scorecards.md`, `phase18-ui-contract-freeze-verification.md`
  - rewrite: `advantage-release-bundles.md`, `general-availability-decision.md`, `pilot-migration-and-cutover.md`
  - replace/create: `pilot-readiness.md`, `general-availability.md`
  - archive/remove från Domän 17-sanning: irrelevanta `phase18_collective_agreements`-migreringar och seedspar
- tester:
  - docs truth lint
  - runbook existence lint
  - final GA re-verification suite

## Fas 18

### Delfas 18.1 commercial object-model / canonical route truth

- bygg:
  - `CommercialAccount`
  - `CommercialContact`
  - `CommercialOpportunity`
  - `CommercialQuote`
  - `CommercialQuoteVersion`
  - `CommercialContract`
  - `CommercialSubscription`
  - `CommercialOrder`
  - `CommercialHandoffReceipt`
- state machines:
  - `CommercialOpportunity: open -> qualified -> proposal -> committed | lost | archived`
  - `CommercialQuote: draft -> pending_approval -> approved -> sent -> accepted | expired | rejected | superseded`
  - `CommercialContract: draft -> active -> paused | amended | terminated | expired`
  - `CommercialSubscription: draft -> active -> pending_renewal | paused | terminated | expired`
  - `CommercialOrder: draft -> committed -> released | partially_released | cancelled | completed`
- commands:
  - `createCommercialAccount`
  - `createCommercialOpportunity`
  - `createCommercialQuote`
  - `createCommercialContract`
  - `createCommercialSubscription`
  - `createCommercialOrder`
- invariants:
  - commercial core äger primarsanningen får vad som salts, till vem, till vilket pris och på vilka villkor
  - ÄR och projekt får konsumera commercial refs men inte ersätta commercial truth
  - canonical route family är `/v1/commercial/*`
- tester:
  - object creation and lifecycle suite
  - route truth suite

### Delfas 18.2 account / contact / relationship / ownership hardening

- bygg:
  - `CommercialAccountOwner`
  - `CommercialRelationshipRole`
  - `CommercialContactChannel`
  - `CommercialMergeDecision`
- commands:
  - `assignCommercialAccountOwner`
  - `attachCommercialContact`
  - `mergeCommercialAccount`
- invariants:
  - account och contact måste kunna leva utan att farst bli fakturakund
  - merge kraver review receipt och audit lineage
  - primary contact, billing contact och signer contact är separata roller
- blockerande valideringar:
  - deny merge utan separat reviewer
  - deny duplicate canonical external identity per account/contact där policyn kraver det
- tester:
  - dedupe tests
  - merge review tests
  - role separation tests

### Delfas 18.3 lead / opportunity / pipeline hardening

- bygg:
  - `Lead`
  - `Opportunity`
  - `PipelineStage`
  - `OpportunityStageReceipt`
  - `OpportunityLossDecision`
  - `OpportunityWinReceipt`
- commands:
  - `createLead`
  - `qualifyLead`
  - `createOpportunity`
  - `transitionOpportunityStage`
  - `closeOpportunityWon`
  - `closeOpportunityLost`
- invariants:
  - stage history är append-only
  - win kraver account och minst en downstream commercial artifact
  - lost kraver loss reason
- tester:
  - stage transition tests
  - win/loss validation tests

### Delfas 18.4 quote / pricing / discount / approval hardening

- bygg:
  - `CommercialPricingProfile`
  - `CommercialDiscountDecision`
  - `CommercialQuoteApproval`
  - `CommercialQuoteAcceptanceReceipt`
- commands:
  - `reviseCommercialQuote`
  - `requestCommercialQuoteApproval`
  - `approveCommercialQuote`
  - `acceptCommercialQuote`
- invariants:
  - quote versioner är immutabla efter supersession
  - quote acceptance fryser line items, discount basis, validity och acceptance timestamp
  - rabatt över policygröns kraver approval
- routes:
  - `/v1/commercial/quotes`
  - `/v1/commercial/quotes/:quoteId/approve`
  - `/v1/commercial/quotes/:quoteId/accept`
- officiella källor:
  - [HubSpot: Create and send quotes](https://knowledge.hubspot.com/quotes/create-and-send-quotes)
  - [HubSpot: Create and manage products](https://knowledge.hubspot.com/products/how-do-i-use-products)
- tester:
  - quote revision tests
  - discount approval tests
  - acceptance freeze tests

### Delfas 18.5 contract / subscription / renewal / termination hardening

- bygg:
  - `SubscriptionPlan`
  - `SubscriptionInstance`
  - `RenewalDecision`
  - `ContractAmendment`
  - `TerminationDecision`
  - `CommercialNoticeWindow`
- commands:
  - `activateCommercialContract`
  - `startCommercialSubscription`
  - `renewCommercialSubscription`
  - `amendCommercialContract`
  - `terminateCommercialContract`
- invariants:
  - renewal, amendment och termination är egna receipts
  - notice period, bindningstid och indexation måste vara explicit i modellen
  - subscription kan inte leva som fri metadata på kontrakt
- routes:
  - `/v1/commercial/contracts`
  - `/v1/commercial/subscriptions`
  - `/v1/commercial/subscriptions/:subscriptionId/renew`
- officiella källor:
  - [HubSpot: Create subscriptions](https://knowledge.hubspot.com/subscriptions/manage-subscriptions-for-recurring-payments)
  - [HubSpot: Set up the subscriptions tool](https://knowledge.hubspot.com/subscriptions/set-up-the-hubspot-subscriptions-tool)
- tester:
  - renewal lifecycle tests
  - termination notice tests
  - amendment lineage tests

### Delfas 18.6 order / amendment / cancellation hardening

- bygg:
  - `CommercialOrderLine`
  - `OrderAmendment`
  - `OrderCancellationReceipt`
  - `OrderCommitmentWindow`
  - `OrderReleaseDecision`
- commands:
  - `createCommercialOrderFromContract`
  - `amendCommercialOrder`
  - `cancelCommercialOrder`
  - `releaseCommercialOrder`
- invariants:
  - order är kommersiellt commit-objekt och får inte reduceras till invoice-prep
  - cancellation måste bara reason, timing och compensation basis
  - release till projekt eller field måste vara explicit
- tester:
  - amendment tests
  - cancellation compensation tests
  - release gating tests

### Delfas 18.7 downstream handoff / SLA / support / project / field hardening

- bygg:
  - `ProjectCommercialHandoff`
  - `FieldCommercialHandoff`
  - `BillingEntitlement`
  - `SupportEntitlement`
  - `CommercialSlaProfile`
- commands:
  - `createProjectCommercialHandoff`
  - `createFieldCommercialHandoff`
  - `grantSupportEntitlement`
  - `grantBillingEntitlement`
- invariants:
  - downstream-domäner får bara läsa kommersiell rattighet via handoff receipts
  - SLA, supportniva, leveransvillkor och billing rights måste kunna harledas till contract/order
- tester:
  - handoff lineage tests
  - entitlement enforcement tests

### Delfas 18.8 doc / runbook / legacy purge

- bygg:
  - `CommercialDocTruthDecision`
  - `CommercialLegacyArchiveReceipt`
  - `CommercialRunbookExecution`
- dokumentbeslut:
  - rewrite: `docs/domain/projects-workspace.md`
  - rewrite: `docs/runbooks/fas-14-1-project-commercial-core-verification.md`
  - rewrite: `docs/runbooks/fas-14-2-project-crm-handoff-verification.md`
  - migrate to integration boundary: `docs/runbooks/phase16-hubspot-crm-handoff-verification.md`
  - create: `docs/runbooks/commercial-quote-approval.md`
  - create: `docs/runbooks/commercial-contract-activation.md`
  - create: `docs/runbooks/commercial-renewal-and-termination.md`
- invariants:
  - projekt- eller integrationsdocs får inte fortsatta bara canonical commercial truth
- tester:
  - docs truth lint
  - runbook existence lint

## Fas 19

### Delfas 19.1 unified delivery object-model / route truth

- bygg:
  - `DeliveryOrder`
  - `ServiceOrder`
  - `WorkOrder`
  - `DeliveryPlan`
  - `DeliveryHandoffReceipt`
- state machines:
  - `DeliveryOrder: draft -> planned -> dispatched -> in_progress -> completed | cancelled | blocked`
  - `ServiceOrder: draft -> scheduled -> active -> completed | failed | cancelled`
  - `WorkOrder: ready_for_dispatch -> dispatched -> in_progress -> completed | blocked | cancelled`
- commands:
  - `createDeliveryOrder`
  - `createServiceOrder`
  - `createWorkOrder`
  - `linkCommercialOrderToDelivery`
- invariants:
  - leveransdomänen äger sanningen får utfarandet
  - project och field får vara konsumenter eller vertikala paket, inte universell root
  - canonical route family är `/v1/delivery/*`
- tester:
  - route truth suite
  - root-object lineage suite

### Delfas 19.2 resource / booking / capacity hardening

- bygg:
  - `ResourcePool`
  - `ResourceProfile`
  - `ResourceBooking`
  - `CapacityWindow`
  - `BookingConflict`
  - `RebookingReceipt`
- commands:
  - `reserveResourceBooking`
  - `rebookDelivery`
  - `resolveBookingConflict`
- invariants:
  - dubbelbokning och overbokning styrs via explicit policy
  - resurskrav, geografi och kompetens måste vara del av bokningen
- blockerande valideringar:
  - deny booking utanför capacity policy
  - deny dispatch utan bokad resurs där policy kraver det
- tester:
  - booking conflict tests
  - rebooking receipt tests

### Delfas 19.3 delivery-order / service-order / work-order hardening

- bygg:
  - `ServicePlan`
  - `VisitWindow`
  - `InstructionSet`
  - `DeliveryDependency`
  - `ServiceEntitlementRef`
- commands:
  - `createServicePlan`
  - `scheduleVisitWindow`
  - `attachInstructionSet`
- invariants:
  - recurring service och ad hoc work orders får inte blandas utan egen typ
  - commercial SLA och servicevillkor måste vara sparbara på leveransobjektet
- tester:
  - service plan lifecycle
  - commercial handoff linkage tests

### Delfas 19.4 dispatch / execution / checklist / evidence hardening

- bygg:
  - `DispatchBoard`
  - `DispatchAssignment`
  - `ExecutionChecklist`
  - `ExecutionEvidence`
  - `DispatchException`
- commands:
  - `createDispatchAssignment`
  - `startExecution`
  - `recordExecutionChecklistStep`
  - `recordExecutionEvidence`
  - `raiseDispatchException`
- invariants:
  - dispatch, execution och evidence är separata men länkade objekt
  - checklist completion och required evidence kan blockera close
- tester:
  - dispatch lifecycle tests
  - checklist completeness tests
  - exception flow tests

### Delfas 19.5 recurring service / SLA / revisit hardening

- bygg:
  - `RecurringServicePlan`
  - `SlaProfile`
  - `SlaClock`
  - `SlaBreachSignal`
  - `RevisitDecision`
- commands:
  - `startRecurringServicePlan`
  - `recordSlaClock`
  - `raiseSlaBreachSignal`
  - `scheduleRevisit`
- invariants:
  - SLA-brott och revisit är first-class och får inte lasas genom fria kommentarer
  - recurrence måste bara start, cadence, stop rule och entitlement source
- tester:
  - recurrence generation tests
  - SLA breach tests
  - revisit gating tests

### Delfas 19.6 completion / signoff / finance handoff hardening

- bygg:
  - `CustomerSignoff`
  - `CompletionReceipt`
  - `FinanceHandoffReceipt`
  - `BillableReadinessDecision`
- commands:
  - `captureCustomerSignoff`
  - `completeDeliveryOrder`
  - `createDeliveryFinanceHandoff`
- invariants:
  - completion kraver rätt signoff, material och tidsdata där policy kraver det
  - finance handoff måste vara replaybar och immutable
- routes:
  - `/v1/delivery/completions`
  - `/v1/delivery/signoffs`
  - `/v1/delivery/finance-handoffs`
- tester:
  - signoff blocker tests
  - finance handoff immutability tests

### Delfas 19.7 mobile / offline / conflict / exception hardening

- bygg:
  - `MobileExecutionSession`
  - `OfflineOperation`
  - `SyncConflictCase`
  - `DispatchExceptionReceipt`
- commands:
  - `startMobileExecutionSession`
  - `recordOfflineOperation`
  - `replayOfflineOperations`
  - `resolveSyncConflict`
- invariants:
  - offline change sets måste vara replaybara
  - tyst overwrite av dispatch- eller completiondata är farbjuden
- tester:
  - offline replay tests
  - sync conflict tests

### Delfas 19.8 doc / runbook / legacy purge

- bygg:
  - `DeliveryDocTruthDecision`
  - `DeliveryLegacyArchiveReceipt`
  - `DeliveryRunbookExecution`
- dokumentbeslut:
  - rewrite: `docs/domain/field-work-order-service-order-and-material-flow.md`
  - harden: `docs/domain/projects-budget-wip-and-profitability.md`
  - harden: `docs/domain/projects-workspace.md`
  - rewrite: `docs/runbooks/fas-10-field-verification.md`
  - rewrite: `docs/runbooks/fas-14-5-field-operational-pack-verification.md`
  - create: `docs/runbooks/delivery-dispatch-operations.md`
  - create: `docs/runbooks/recurring-service-operations.md`
  - create: `docs/runbooks/delivery-completion-and-signoff.md`
- invariants:
  - field docs får inte fortsatta latsas vara hela leveransdomänen
- tester:
  - docs truth lint
  - runbook existence lint

## Fas 20

### Delfas 20.1 item master / SKU / route truth

- bygg:
  - `ItemMaster`
  - `SkuVariant`
  - `InventoryLocation`
  - `InventoryUnitProfile`
  - `ItemLifecycleDecision`
- commands:
  - `createItemMaster`
  - `createSkuVariant`
  - `createInventoryLocation`
  - `transitionItemLifecycle`
- invariants:
  - samma item-id måste kunna användas av commercial, procurement, inventory och delivery
  - tjänsteartikel, materialartikel och lagervara är olika typer i samma item master
  - canonical route family är `/v1/supply/*`
- tester:
  - canonical item lookup suite
  - route truth suite

### Delfas 20.2 procurement request / PO / approval hardening

- bygg:
  - `ProcurementRequest`
  - `PurchaseOrder`
  - `PurchaseOrderApproval`
  - `SupplierCommitmentReceipt`
- state machines:
  - `ProcurementRequest: draft -> requested -> approved | rejected -> converted`
  - `PurchaseOrder: draft -> approved -> sent -> partially_received | received | closed | cancelled`
- commands:
  - `createProcurementRequest`
  - `approveProcurementRequest`
  - `createPurchaseOrderFromRequest`
  - `approvePurchaseOrder`
- invariants:
  - PO måste kunna harledas till behov eller explicit manual justification
  - approval policy måste vara first-class
- tester:
  - procurement-to-po lineage
  - approval enforcement

### Delfas 20.3 receipt / putaway / 3-way-match hardening

- bygg:
  - `GoodsReceipt`
  - `ReceiptLine`
  - `PutawayDecision`
  - `ReceiptVariance`
  - `ThreeWayMatchDecision`
- commands:
  - `recordGoodsReceipt`
  - `completePutaway`
  - `recordThreeWayMatchDecision`
- invariants:
  - mottag, putaway och matchning är separata steg
  - partial receipts och restorder måste vara first-class
  - avvikelse kraver explicit receipt-variance receipt
- tester:
  - partial receipt tests
  - variance and 3-way-match tests

### Delfas 20.4 inventory ledger / reservation / transfer / count hardening

- bygg:
  - `InventoryLedgerEntry`
  - `InventoryReservation`
  - `InventoryTransfer`
  - `InventoryCountSession`
  - `InventoryAdjustmentReceipt`
- commands:
  - `reserveInventory`
  - `transferInventory`
  - `startInventoryCountSession`
  - `postInventoryAdjustment`
- invariants:
  - ledgern är den enda sanningen får lageräntal
  - on hand, reserved, committed, in transit och consumed ska vara harledbara från ledger entries
  - inventory count kraver las eller definierad conflict policy
- tester:
  - stock math tests
  - reservation/transfer tests
  - count adjustment tests

### Delfas 20.5 fulfillment / shipment / return / RMA hardening

- bygg:
  - `FulfillmentOrder`
  - `Shipment`
  - `ReturnOrder`
  - `RmaCase`
  - `StorePickupDecision`
- commands:
  - `createFulfillmentOrder`
  - `shipFulfillmentOrder`
  - `recordStorePickup`
  - `openRmaCase`
  - `receiveReturnOrder`
- invariants:
  - fulfillment måste kunna harledas till commercial order eller service demand
  - returns kraver disposition, reason och lagerpaverkan
- officiella källor:
  - [Shopify: POS inventory management](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/inventory-management/stocky/pos-inventory-management)
  - [Shopify: Pickup in store för online orders](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/order-management/pickup-in-store-for-online-orders)
- tester:
  - shipment tests
  - pickup tests
  - return and RMA tests

### Delfas 20.6 valuation / cost layer / ledger bridge hardening

- bygg:
  - `InventoryCostLayer`
  - `CostingMethodDecision`
  - `CogsPostingReceipt`
  - `InventoryValuationSnapshot`
- commands:
  - `createInventoryCostLayer`
  - `materializeInventoryValuationSnapshot`
  - `postInventoryCogsReceipt`
- invariants:
  - varje receipt som ändrar värde måste skriva cost layer
  - fulfillment och return måste kunna spara exakt kostbas
  - ledger posting får inte ske utan cost-layer lineage
- tester:
  - cost layer calculation tests
  - ledger bridge tests

### Delfas 20.7 replenishment / supplier catalog / reorder hardening

- bygg:
  - `ReorderPolicy`
  - `ReplenishmentSuggestion`
  - `SupplierCatalog`
  - `SupplierPriceAgreement`
- commands:
  - `upsertReorderPolicy`
  - `generateReplenishmentSuggestions`
  - `publishSupplierCatalog`
- invariants:
  - reorder ska bygga på item master, demand signal, lead time och inventory state
  - supplier catalog får inte vara fria prislistor utan lineage
- officiella källor:
  - [Shopify: Purchase orders in Stocky](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/inventory-management/stocky/inventory-management/purchase-orders)
- tester:
  - reorder generation tests
  - supplier price selection tests

### Delfas 20.8 doc / runbook / legacy purge

- bygg:
  - `SupplyDocTruthDecision`
  - `SupplyLegacyArchiveReceipt`
  - `SupplyRunbookExecution`
- dokumentbeslut:
  - rewrite: `docs/compliance/se/ap-supplier-invoice-engine.md`
  - rewrite: AP-centrerade mottags- och inköpsbeskrivningar som idag oversäljer supply-karnan
  - harden: field inventory-relaterade verifieringsdocs sa de blir consumer docs
  - create: `docs/runbooks/procurement-operations.md`
  - create: `docs/runbooks/warehouse-operations.md`
  - create: `docs/runbooks/fulfillment-and-returns.md`
- invariants:
  - AP och field får inte fortsatta säljas in som supply-karna
- tester:
  - docs truth lint
  - runbook existence lint

## Fas 21

### Delfas 21.1 unified workspace object-model / route truth

- bygg:
  - `WorkspaceItem`
  - `OperationalRequest`
  - `Task`
  - `ApprovalRequest`
  - `DecisionLogEntry`
  - `WorkbenchProfile`
- state machines:
  - `OperationalRequest: open -> in_review -> approved | rejected | cancelled | completed`
  - `Task: open -> accepted -> in_progress -> blocked | completed | cancelled`
  - `ApprovalRequest: pending -> approved | rejected | expired | escalated`
- commands:
  - `createWorkspaceItem`
  - `createOperationalRequest`
  - `createTask`
  - `createApprovalRequest`
- invariants:
  - workspace core äger tasks, requests och approvals tvars över domänerna
  - inbox, notifications och activity är presentations- eller receiptlager ovanpa workspace truth
  - canonical route family är `/v1/workspace/*`
- tester:
  - workspace root lifecycle
  - route truth suite

### Delfas 21.2 inbox / request / task hardening

- bygg:
  - `InboxMaterialization`
  - `TaskGroup`
  - `RequestComment`
  - `TaskAssignmentReceipt`
- commands:
  - `assignTask`
  - `acceptTask`
  - `snoozeWorkspaceItem`
  - `reopenWorkspaceItem`
- invariants:
  - email ingress eller domänhandelse får aldrig vara den enda sanningen får ett task/request-objekt
  - reopen måste vara explicit och auditbar
- tester:
  - request/task lifecycle tests
  - dedupe/reopen tests

### Delfas 21.3 approval / delegation / decision hardening

- bygg:
  - `ApprovalStep`
  - `DelegationGrant`
  - `DecisionReceipt`
  - `ApprovalEscalation`
- commands:
  - `delegateApprovalAuthority`
  - `approveWorkspaceRequest`
  - `rejectWorkspaceRequest`
  - `escalateApprovalRequest`
- invariants:
  - approvals måste kunna bara ordered steps, delegation och escalation
  - separation of duties måste vara first-class
  - domäner får länka in approvals men inte uppfinna egna osynliga approval-spar
- officiella källor:
  - [Microsoft Approvals](https://support.microsoft.com/en-us/office/what-is-approvals-a9a01c95-e0bf-4d20-9ada-f7be3fc283d3)
  - [Microsoft Create an approval](https://support.microsoft.com/en-us/office/create-an-approval-6548a338-f837-4e3c-ad02-8214fc165c84)
- tester:
  - delegation and escalation tests
  - separation-of-duties tests

### Delfas 21.4 ownership / deadline / reminder hardening

- bygg:
  - `OwnershipAssignment`
  - `DeadlineProfile`
  - `ReminderSchedule`
  - `OverdueSignal`
- commands:
  - `assignWorkspaceOwner`
  - `setWorkspaceDeadline`
  - `scheduleWorkspaceReminder`
  - `raiseOverdueSignal`
- invariants:
  - kritiska workspace items får inte vara ownerless om policy farbjuder det
  - due date och overdue måste vara first-class, inte bara beräknad UI-status
- tester:
  - ownership enforcement tests
  - deadline/reminder tests

### Delfas 21.5 exception-center / workbench hardening

- bygg:
  - `ExceptionCase`
  - `WorkbenchQueue`
  - `WorkbenchFilterProfile`
  - `ActionShortcut`
- commands:
  - `materializeWorkbenchQueue`
  - `openExceptionCase`
  - `recordActionShortcut`
- invariants:
  - workbench måste materialiseras från workspace truth och domänreceipts
  - exception center får inte bara vara lista utan måste bara severity, owner och next action
- tester:
  - queue materialization tests
  - exception lifecycle tests

### Delfas 21.6 calendar / mail integration boundary hardening

- bygg:
  - `CalendarLink`
  - `MailThreadRef`
  - `OutboundReminderReceipt`
  - `ScheduleSyncReceipt`
- commands:
  - `linkWorkspaceItemToCalendar`
  - `linkWorkspaceItemToMailThread`
  - `emitOutboundReminder`
- invariants:
  - plattformen ska koppla mot extern kalender/mail, inte latsas vara full ersättare
  - calendar/mail refs får inte bli canonical task truth
- officiella källor:
  - [Microsoft Tasks in Teams](https://support.microsoft.com/en-us/office/use-the-tasks-app-in-teams-e32639f3-2e07-4b62-9a8c-fd706c12c070)
- tester:
  - sync boundary tests
  - duplicate reminder suppression tests

### Delfas 21.7 cross-domain activity / search / action hardening

- bygg:
  - `WorkspaceActivityRef`
  - `WorkspaceSearchResult`
  - `CrossDomainActionReceipt`
- commands:
  - `linkWorkspaceItemToDomainObject`
  - `recordCrossDomainActionReceipt`
  - `materializeWorkspaceSearchResult`
- invariants:
  - workspace får navigera och agera på ändra domäner men inte skriva deras sanning direkt
  - every shortcut action must end in source-domain command receipt
- tester:
  - search lineage tests
  - cross-domain action routing tests

### Delfas 21.8 doc / runbook / legacy purge

- bygg:
  - `WorkspaceDocTruthDecision`
  - `WorkspaceLegacyArchiveReceipt`
  - `WorkspaceRunbookExecution`
- dokumentbeslut:
  - rewrite: `docs/domain/activity-feed.md`
  - rewrite: `docs/domain/notification-center.md`
  - rewrite: `docs/domain/work-items-deadlines-notifications.md`
  - rewrite: `docs/domain/bureau-portfolio-client-requests-and-approvals.md`
  - rewrite: `docs/runbooks/fas-2-company-inbox-verification.md`
  - rewrite: `docs/runbooks/notifications-activity-operations.md`
  - rewrite: `docs/runbooks/work-item-queue-operations.md`
  - create: `docs/runbooks/workspace-approvals.md`
  - create: `docs/runbooks/workspace-request-operations.md`
  - create: `docs/runbooks/workspace-exception-center.md`
- invariants:
  - workbench- och notification-docs får inte fortsatta vara falsk ersättning får saknad runtime
- tester:
  - docs truth lint
  - runbook existence lint

## Fas 22

### Delfas 22.1 portal object-model / route truth

- bygg:
  - `PortalAccount`
  - `PortalIdentity`
  - `PortalSession`
  - `PortalRequest`
  - `PortalStatusView`
  - `PortalAccessGrant`
- state machines:
  - `PortalAccount: invited -> active | suspended | revoked`
  - `PortalRequest: open -> processing -> completed | rejected | cancelled`
- commands:
  - `createPortalAccount`
  - `grantPortalAccess`
  - `createPortalRequest`
- invariants:
  - portal är egen extern domän, inte en specialkolumn på interna objekt
  - canonical route family är `/v1/portal/*`
  - grants måste styra exakt vilka objekt som får ses eller paverkas
- tester:
  - portal root lifecycle
  - route truth suite

### Delfas 22.2 public form / intake / onboarding hardening

- bygg:
  - `PublicForm`
  - `FormSchemaVersion`
  - `FormSubmission`
  - `IntakePacket`
  - `OnboardingFlow`
- commands:
  - `publishPublicForm`
  - `submitPublicForm`
  - `materializeIntakePacket`
  - `startOnboardingFlow`
- invariants:
  - public forms måste ha versionerat schema
  - submission dedupe, evidence hash och tenant routing måste vara first-class
- tester:
  - form schema version tests
  - submission dedupe tests
  - onboarding handoff tests

### Delfas 22.3 external account / session / access grant hardening

- bygg:
  - `PortalRoleBinding`
  - `PortalInvite`
  - `PortalAccessGrant`
  - `PortalSessionReceipt`
- commands:
  - `invitePortalIdentity`
  - `bindPortalRole`
  - `revokePortalAccessGrant`
- invariants:
  - externa sessions och grants får inte luta på interna company-roles
  - grant, expiry och revoke måste vara explicit och auditbart
- tester:
  - invite/grant lifecycle
  - expiry and revoke tests

### Delfas 22.4 portal document / message / status hardening

- bygg:
  - `PortalDocumentGrant`
  - `PortalMessageThread`
  - `PortalStatusFeed`
  - `PortalUploadReceipt`
- commands:
  - `grantPortalDocumentAccess`
  - `postPortalMessage`
  - `uploadPortalDocument`
  - `materializePortalStatusFeed`
- invariants:
  - dokument, status och meddelanden måste vara grant-styrda
  - uploads måste bara retention, malware-scan och source actor
- tester:
  - document grant tests
  - upload lifecycle tests
  - status feed visibility tests

### Delfas 22.5 signing / signature evidence / reminder hardening

- bygg:
  - `SignatureRequest`
  - `SignerJourney`
  - `SignatureReminder`
  - `SignatureEvidenceRef`
  - `SignatureExpiryDecision`
- commands:
  - `createSignatureRequest`
  - `sendSignatureReminder`
  - `recordSignatureEvidenceRef`
  - `expireSignatureRequest`
- invariants:
  - signature archive är evidenslager, inte hela request-livscykeln
  - signering måste bara inviterad signer, deadlines, reminder och revoke/expiry policy
- officiella källor:
  - [Scrive e-signature](https://www.scrive.com/e-sign/)
- tester:
  - signature request lifecycle
  - evidence linkage tests
  - expiry/reminder tests

### Delfas 22.6 booking / request / self-service action hardening

- bygg:
  - `PortalBookingRequest`
  - `PortalRescheduleRequest`
  - `PortalStatusAction`
  - `PortalCancellationDecision`
- commands:
  - `requestPortalBooking`
  - `requestPortalReschedule`
  - `requestPortalCancellation`
  - `executePortalStatusAction`
- invariants:
  - externa actions får inte skriva direkt till delivery eller commercial truth utan via receipts
  - booking/reschedule måste följa delivery policies
- tester:
  - booking request lineage
  - reschedule/cancel policy tests

### Delfas 22.7 tenant isolation / branding / fraud / rate-limit hardening

- bygg:
  - `PortalBrandProfile`
  - `PortalRateLimitPolicy`
  - `PortalFraudSignal`
  - `PortalIsolationReceipt`
- commands:
  - `publishPortalBrandProfile`
  - `raisePortalFraudSignal`
  - `recordPortalIsolationReceipt`
- invariants:
  - tenant isolation och rate limiting är blockerande sakerhetskrav
  - branding måste vara separerad från access control och grants
- tester:
  - isolation tests
  - rate limit tests
  - fraud escalation tests

### Delfas 22.8 doc / runbook / legacy purge

- bygg:
  - `PortalDocTruthDecision`
  - `PortalLegacyArchiveReceipt`
  - `PortalRunbookExecution`
- dokumentbeslut:
  - rewrite: `docs/runbooks/fas-7-absence-portal-verification.md`
  - rewrite: `docs/runbooks/phase16-auth-signing-adapters-verification.md`
  - harden: signing archive docs till consumer docs
  - create: `docs/runbooks/portal-form-intake.md`
  - create: `docs/runbooks/portal-access-and-grants.md`
  - create: `docs/runbooks/portal-signing-and-self-service.md`
- invariants:
  - absence portal och signing archive får inte fortsatta vara falsk ersättning får portal core
- tester:
  - docs truth lint
  - runbook existence lint

## Fas 23

### Delfas 23.1 asset / fleet object-model / route truth

- bygg:
  - `OperationalAsset`
  - `FleetVehicle`
  - `EquipmentUnit`
  - `AssetLifecycleDecision`
  - `AssetFinancialLink`
- state machines:
  - `OperationalAsset: draft -> active -> in_service | under_maintenance | reserved | retired | disposed`
  - `FleetVehicle: active | blocked | under_service | retired`
- commands:
  - `registerOperationalAsset`
  - `registerFleetVehicle`
  - `linkOperationalAssetToAssetCard`
- invariants:
  - operativ asset och finansiellt asset card är separata objekt
  - canonical route family är `/v1/assets/*`
- tester:
  - asset root lifecycle
  - asset-financial link tests

### Delfas 23.2 assignment / location / lifecycle hardening

- bygg:
  - `AssetAssignment`
  - `AssetLocation`
  - `AssetStatusReceipt`
  - `AssetAvailabilityWindow`
- commands:
  - `assignAsset`
  - `moveAssetLocation`
  - `setAssetAvailability`
- invariants:
  - ansvarig, plats och status måste vara explicit
  - transfers och relocation kraver receipt
- tester:
  - assignment/location tests
  - lifecycle transition tests

### Delfas 23.3 maintenance plan / inspection / fault hardening

- bygg:
  - `MaintenancePlan`
  - `InspectionChecklist`
  - `FaultCase`
  - `MaintenanceOrder`
  - `MaintenanceCompletionReceipt`
- commands:
  - `createMaintenancePlan`
  - `openFaultCase`
  - `createMaintenanceOrder`
  - `completeMaintenanceOrder`
- invariants:
  - preventive maintenance, inspection och fault måste vara first-class
  - maintenance completion måste bara evidence och downtime-resultat
- tester:
  - maintenance lifecycle tests
  - inspection and fault tests

### Delfas 23.4 vehicle / fleet / usage / compliance hardening

- bygg:
  - `VehicleProfile`
  - `UsageLog`
  - `FleetComplianceRecord`
  - `ServiceIntervalSignal`
- commands:
  - `registerVehicleUsage`
  - `recordFleetCompliance`
  - `raiseServiceIntervalSignal`
- invariants:
  - vehicle compliance och usage måste blockera otillaten bokning där policy kraver det
- tester:
  - usage log tests
  - fleet compliance blocking tests

### Delfas 23.5 reservation / booking / allocation hardening

- bygg:
  - `AssetReservation`
  - `EquipmentBooking`
  - `AllocationDecision`
  - `ConflictReceipt`
- commands:
  - `reserveAsset`
  - `allocateAssetToDelivery`
  - `resolveAssetBookingConflict`
- invariants:
  - dubbelbokning och fel allokering måste blockeras
  - allocation till delivery eller project måste vara receipt-buren
- tester:
  - asset reservation tests
  - allocation conflict tests

### Delfas 23.6 asset cost / depreciation / ledger bridge hardening

- bygg:
  - `AssetCostSnapshot`
  - `AssetExpenseReceipt`
  - `AssetDepreciationBridge`
  - `AssetValuationSnapshot`
- commands:
  - `materializeAssetCostSnapshot`
  - `linkAssetToDepreciationBridge`
- invariants:
  - operativa asset-events får inte implicit skriva finansiell ledger
  - finansiell bridge måste vara explicit och auditbar
- tester:
  - asset cost snapshot tests
  - depreciation bridge tests

### Delfas 23.7 vendor service / history / evidence hardening

- bygg:
  - `VendorServiceEvent`
  - `WarrantyProfile`
  - `AssetEvidenceRef`
  - `ExternalServiceReceipt`
- commands:
  - `recordVendorServiceEvent`
  - `attachAssetEvidenceRef`
- invariants:
  - extern servicehistorik och garanti måste kunna länkas till maintenance och kostnad
- tester:
  - vendor service history tests
  - warranty and evidence tests

### Delfas 23.8 doc / runbook / legacy purge

- bygg:
  - `AssetDocTruthDecision`
  - `AssetLegacyArchiveReceipt`
  - `AssetRunbookExecution`
- dokumentbeslut:
  - harden: `docs/compliance/se/fixed-assets-and-depreciation-engine.md`
  - create: `docs/runbooks/asset-maintenance-operations.md`
  - create: `docs/runbooks/fleet-operations.md`
  - create: `docs/runbooks/equipment-allocation.md`
- invariants:
  - finansiella anläggningsdocs får inte fortsatta vara hela asset-domänen
- tester:
  - docs truth lint
  - runbook existence lint

## Fas 24

### Delfas 24.1 group hierarchy / multi-company root / route truth

- bygg:
  - `CompanyGroup`
  - `GroupMembership`
  - `IntercompanyPolicy`
  - `GroupGovernanceReceipt`
- state machines:
  - `CompanyGroup: draft -> active | suspended | archived`
- commands:
  - `createCompanyGroup`
  - `addCompanyToGroup`
  - `publishIntercompanyPolicy`
- invariants:
  - bolagsgrupp måste vara first-class och inte harledas last från tenantlistor
  - canonical route family är `/v1/group/*`
- tester:
  - group hierarchy tests
  - route truth suite

### Delfas 24.2 intercompany counterparties / policy hardening

- bygg:
  - `IntercompanyCounterparty`
  - `IntercompanyAgreement`
  - `IntercompanyPricingPolicy`
  - `IntercompanyApprovalProfile`
- commands:
  - `registerIntercompanyCounterparty`
  - `createIntercompanyAgreement`
  - `approveIntercompanyPricingPolicy`
- invariants:
  - interna relationer måste ha policy, godkännande och prissattningsregel
  - inga cross-company writes utan explicit counterparty relation
- tester:
  - counterparty policy tests
  - approval profile tests

### Delfas 24.3 intercompany order / invoice / settlement hardening

- bygg:
  - `IntercompanyOrder`
  - `IntercompanyInvoice`
  - `IntercompanySettlement`
  - `IntercompanyMismatchCase`
- commands:
  - `createIntercompanyOrder`
  - `issueIntercompanyInvoice`
  - `settleIntercompanyBalance`
  - `openIntercompanyMismatchCase`
- invariants:
  - order, invoice och settlement måste kunna länkas till varandra deterministiskt
  - mismatch måste vara first-class och blockerande får close där policy kraver det
- tester:
  - intercompany lifecycle tests
  - mismatch handling tests

### Delfas 24.4 treasury / cash position / payment governance hardening

- bygg:
  - `TreasuryAccount`
  - `CashPositionSnapshot`
  - `IntercompanyLoan`
  - `TreasuryTransferDecision`
- commands:
  - `materializeCashPositionSnapshot`
  - `createIntercompanyLoan`
  - `approveTreasuryTransfer`
- invariants:
  - treasury actions måste vara explicit owner- och approval-styrda
  - cash position måste vara first-class snapshot, inte bara rapportfraga
- tester:
  - cash position tests
  - treasury approval tests

### Delfas 24.5 shared services / allocation / elimination input hardening

- bygg:
  - `SharedServiceAllocationPlan`
  - `AllocationExecutionReceipt`
  - `EliminationInput`
  - `ConsolidationBridgeRef`
- commands:
  - `createSharedServiceAllocationPlan`
  - `executeAllocationPlan`
  - `recordEliminationInput`
- invariants:
  - allocations måste bara bas, owner, period och evidence
  - elimination inputs får inte vara fria anteckningar
- tester:
  - allocation lineage tests
  - elimination input completeness tests

### Delfas 24.6 owner governance / board / dividend bridge hardening

- bygg:
  - `BoardResolution`
  - `OwnerDecision`
  - `DividendGovernanceBridge`
  - `HoldingStructureSnapshot`
- commands:
  - `recordBoardResolution`
  - `recordOwnerDecision`
  - `linkDividendDecisionToGovernance`
- invariants:
  - owner distribution-domänen bar payout och KU31 men inte hela owner/governance root
  - board/stamma lineage måste vara first-class där utdelning eller agarbeslut kraver det
- tester:
  - owner-governance linkage tests
  - dividend bridge tests

### Delfas 24.7 auth / search / reporting boundary hardening

- bygg:
  - `GroupRoleGrant`
  - `CrossCompanySearchGrant`
  - `GroupReportingBoundary`
  - `CompanyScopeReceipt`
- commands:
  - `grantGroupRole`
  - `grantCrossCompanySearch`
  - `materializeGroupReportingBoundary`
- invariants:
  - cross-company read och write måste vara explicit godkända
  - reporting aggregation är inte samma sak som sak- eller mutationsratt
- tester:
  - cross-company grant tests
  - reporting boundary tests

### Delfas 24.8 doc / runbook / legacy purge

- bygg:
  - `GroupDocTruthDecision`
  - `GroupLegacyArchiveReceipt`
  - `GroupRunbookExecution`
- dokumentbeslut:
  - harden: `docs/runbooks/owner-distributions-and-ku31.md`
  - create: `docs/runbooks/intercompany-operations.md`
  - create: `docs/runbooks/treasury-operations.md`
  - create: `docs/runbooks/shared-service-allocations.md`
- invariants:
  - owner-distribution-doc får inte fortsatta bara group/intercompany-sanning
- tester:
  - docs truth lint
  - runbook existence lint

## Fas 25

### Delfas 25.1 sales-channel / catalog / route truth

- bygg:
  - `SalesChannel`
  - `ChannelCatalog`
  - `ChannelAvailability`
  - `ChannelCustomerLink`
- state machines:
  - `SalesChannel: draft -> active | paused | archived`
- commands:
  - `createSalesChannel`
  - `publishChannelCatalog`
  - `setChannelAvailability`
- invariants:
  - channel truth måste vara egen object family
  - canonical route family är `/v1/commerce/*`
- tester:
  - sales channel lifecycle
  - route truth suite

### Delfas 25.2 POS session / checkout / receipt hardening

- bygg:
  - `PosSession`
  - `PosCart`
  - `StoreReceipt`
  - `CashDrawerEvent`
  - `CashierAssignment`
- commands:
  - `openPosSession`
  - `addPosCartLine`
  - `checkoutPosCart`
  - `closePosSession`
- invariants:
  - cashier, device, session och receipt måste vara explicit
  - receipt får inte kunna skrivas om tyst efter checkout
- tester:
  - POS checkout tests
  - session close balancing tests

### Delfas 25.3 ecommerce / marketplace order capture hardening

- bygg:
  - `ChannelOrder`
  - `ChannelOrderImportReceipt`
  - `ChannelCustomerIdentity`
  - `ChannelPaymentReference`
- commands:
  - `ingestChannelOrder`
  - `dedupeChannelOrder`
  - `linkChannelOrderToCommercialOrder`
- invariants:
  - channel order capture måste bara source channel, source order id, payment ref och customer mapping
  - channel orders får inte skapa egna tysta customer truths
- tester:
  - order dedupe tests
  - payment reference lineage tests

### Delfas 25.4 omnichannel inventory / allocation / sync hardening

- bygg:
  - `ChannelInventorySnapshot`
  - `ChannelAllocationDecision`
  - `ChannelSyncReceipt`
  - `OversellConflict`
- commands:
  - `materializeChannelInventorySnapshot`
  - `allocateChannelOrderInventory`
  - `syncChannelInventory`
- invariants:
  - channel stock får bara harledas från supply core
  - oversell och stale sync måste vara first-class blockerare
- officiella källor:
  - [Shopify: POS inventory management](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/inventory-management/stocky/pos-inventory-management)
  - [Shopify: Product inventory tracking](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/inventory-management/products)
- tester:
  - inventory sync tests
  - oversell conflict tests

### Delfas 25.5 pickup / ship-from-store / store-fulfillment hardening

- bygg:
  - `PickupRequest`
  - `ShipFromStoreDecision`
  - `StoreFulfillmentOrder`
  - `CollectionReceipt`
- commands:
  - `requestPickup`
  - `approveShipFromStore`
  - `completeCollection`
- invariants:
  - pickup och ship-from-store måste vara explicit kopplade till reservation, fulfillment och customer identity
- officiella källor:
  - [Shopify: Pickup in store för online orders](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/order-management/pickup-in-store-for-online-orders)
- tester:
  - pickup readiness tests
  - ship-from-store tests

### Delfas 25.6 return / exchange / store-credit hardening

- bygg:
  - `ChannelReturn`
  - `ExchangeDecision`
  - `StoreCredit`
  - `RefundDecision`
- commands:
  - `openChannelReturn`
  - `decideExchange`
  - `issueStoreCredit`
  - `issueChannelRefund`
- invariants:
  - returns och exchanges måste paverka inventory, payment och channel/customer truth deterministiskt
  - store credit får inte vara fri manuell balans
- tester:
  - return/exchange tests
  - store-credit lifecycle tests

### Delfas 25.7 channel pricing / promo / tax hardening

- bygg:
  - `ChannelPricingProfile`
  - `PromotionRule`
  - `ChannelTaxProfile`
  - `PricePublicationReceipt`
- commands:
  - `publishChannelPricingProfile`
  - `publishPromotionRule`
  - `publishChannelTaxProfile`
- invariants:
  - channel price och promo får inte driva från commercial core utan explicit publication
  - channel tax profile måste vara first-class där regler kraver det
- tester:
  - channel pricing tests
  - promotion eligibility tests

### Delfas 25.8 doc / runbook / legacy purge

- bygg:
  - `CommerceDocTruthDecision`
  - `CommerceLegacyArchiveReceipt`
  - `CommerceRunbookExecution`
- dokumentbeslut:
  - create: `docs/runbooks/pos-operations.md`
  - create: `docs/runbooks/channel-order-sync.md`
  - create: `docs/runbooks/channel-returns-and-exchanges.md`
- invariants:
  - inga ÄR- eller inventory-docs får fortsatta latsas att channel core redan finns
- tester:
  - docs truth lint
  - runbook existence lint

## Fas 26

### Delfas 26.1 BOM / recipe / route truth

- bygg:
  - `BillOfMaterials`
  - `BomVersion`
  - `RecipeVariant`
  - `AssemblyProfile`
- state machines:
  - `BomVersion: draft -> approved -> active | superseded | retired`
- commands:
  - `createBillOfMaterials`
  - `publishBomVersion`
- invariants:
  - BOM måste vara versionerat och immutable efter publication
  - canonical route family är `/v1/production/*`
- tester:
  - BOM version tests
  - route truth suite

### Delfas 26.2 MRP / material requirements / planning hardening

- bygg:
  - `MaterialRequirementPlan`
  - `DemandSignal`
  - `SupplyProposal`
  - `ProductionPlanningWindow`
- commands:
  - `generateMaterialRequirementPlan`
  - `publishSupplyProposal`
  - `rescheduleProductionWindow`
- invariants:
  - MRP måste bygga på demand signals, BOM och inventory state
  - planering utan material- eller kapacitetsbas är farbjuden
- tester:
  - MRP generation tests
  - planning window reschedule tests

### Delfas 26.3 manufacturing order / routing / work center hardening

- bygg:
  - `ManufacturingOrder`
  - `RoutingVersion`
  - `WorkCenter`
  - `ProductionOperation`
- state machines:
  - `ManufacturingOrder: draft -> released -> in_progress -> completed | blocked | cancelled`
  - `ProductionOperation: planned -> started -> completed | failed | blocked`
- commands:
  - `releaseManufacturingOrder`
  - `startProductionOperation`
  - `completeProductionOperation`
- invariants:
  - released MO måste vara last mot BOM-version, routing och plan
  - work center-kapacitet måste vara first-class
- tester:
  - MO lifecycle tests
  - routing/work-center tests

### Delfas 26.4 material issue / yield / scrap hardening

- bygg:
  - `ProductionMaterialIssue`
  - `YieldReceipt`
  - `ScrapDecision`
  - `ByproductReceipt`
- commands:
  - `issueProductionMaterial`
  - `recordProductionYield`
  - `recordScrapDecision`
- invariants:
  - material issue måste skriva inventory lineage
  - yield och scrap måste vara explicit i stallet får att doljas i lagerjustering
- tester:
  - material issue tests
  - yield/scrap tests

### Delfas 26.5 quality / deviation / hold hardening

- bygg:
  - `QualityCheck`
  - `QualityDeviation`
  - `ProductionHold`
  - `ReleaseDecision`
- commands:
  - `recordQualityCheck`
  - `raiseQualityDeviation`
  - `placeProductionHold`
  - `releaseProductionHold`
- invariants:
  - quality hold blockerar release där policy kraver det
  - deviations måste vara first-class och auditbara
- officiella källor:
  - [Odoo Quality](https://www.odoo.com/app/quality)
- tester:
  - quality hold tests
  - deviation lifecycle tests

### Delfas 26.6 production cost / WIP / ledger bridge hardening

- bygg:
  - `ProductionCostSnapshot`
  - `ProductionWipReceipt`
  - `ManufacturingLedgerBridge`
  - `VariancePostingReceipt`
- commands:
  - `materializeProductionCostSnapshot`
  - `postProductionWipReceipt`
  - `postProductionVariance`
- invariants:
  - produktionens kostnad och WIP måste kunna harledas till supply core och ledgern
  - inga fria manuella WIP-postningar utan production lineage
- tester:
  - production cost tests
  - WIP/variance ledger tests

### Delfas 26.7 subcontracting / kitting / assembly hardening

- bygg:
  - `SubcontractingOrder`
  - `KitAssembly`
  - `AssemblyCompletionReceipt`
  - `ExternalProductionReceipt`
- commands:
  - `createSubcontractingOrder`
  - `completeKitAssembly`
  - `recordExternalProductionReceipt`
- invariants:
  - kitting och assembly får inte reduceras till fria inventory writes
  - extern produktion måste ha explicit receipt och quality bridge
- officiella källor:
  - [Odoo Manufacturing](https://www.odoo.com/app/manufacturing)
  - [Odoo Bill of Materials](https://www.odoo.com/app/bill-of-materials)
- tester:
  - subcontracting tests
  - kit assembly tests

### Delfas 26.8 doc / runbook / legacy purge

- bygg:
  - `ProductionDocTruthDecision`
  - `ProductionLegacyArchiveReceipt`
  - `ProductionRunbookExecution`
- dokumentbeslut:
  - create: `docs/runbooks/mrp-operations.md`
  - create: `docs/runbooks/shop-floor-operations.md`
  - create: `docs/runbooks/production-quality-and-close.md`
- invariants:
  - kalkyl- eller field-docs får inte fortsatta latsas vara produktionsdomän
- tester:
  - docs truth lint
  - runbook existence lint

## Fas 27

### Delfas 27.1 invariant catalog / scenario registry hardening

- bygg:
  - `SystemInvariant`
  - `ScenarioCatalog`
  - `ScenarioFamily`
  - `ScenarioCase`
  - `ScenarioCoverageMatrix`
  - `ScenarioSeverityPolicy`
- state machines:
  - `ScenarioCase: draft -> ready -> running -> passed | failed | blocked | invalidated`
  - `ScenarioCoverageMatrix: draft -> review_pending -> approved | rejected`
- commands:
  - `registerSystemInvariant`
  - `registerScenarioFamily`
  - `registerScenarioCase`
  - `classifyScenarioSeverity`
  - `publishScenarioCoverageMatrix`
- invariants:
  - varje supportad capability måste kunna harledas till minst ett `ScenarioCase`
  - scenario-id måste vara immutable och globalt unikt
  - frånvaro av scenario får en supportad capability är en blockerande coverage gap, inte en neutral status
- tester:
  - duplicate scenario id deny tests
  - missing capability coverage tests
  - scenario family completeness tests

### Delfas 27.2 accounting proof ledger / expected outcome model hardening

- bygg:
  - `AccountingProofLedger`
  - `ExpectedObjectStateSet`
  - `ExpectedJournalSet`
  - `ExpectedJournalLine`
  - `ExpectedRegulatoryOutcome`
  - `ExpectedReportOutcome`
  - `ExpectedExportOutcome`
  - `OutcomeTolerancePolicy`
- commands:
  - `createAccountingProofLedger`
  - `attachExpectedObjectStateSet`
  - `attachExpectedJournalSet`
  - `attachExpectedRegulatoryOutcome`
  - `attachExpectedReportOutcome`
  - `attachExpectedExportOutcome`
- invariants:
  - scenario får inte ga till `ready` utan expected journal lines där bokfaring ska ske
  - expected journal line måste bara konto, debet/kredit, belopp, period, currency och lineage ref
  - toleranspolicy får aldrig dolja konto- eller faltfel; endast uttryckligt tillåtna avrundningsregler får finnas
- tester:
  - expected-journal completeness tests
  - account-direction mismatch tests
  - zero-tolerance field mismatch tests

### Delfas 27.3 accounts receivable scenario matrix hardening

- bygg:
  - `ArScenarioProfile`
  - `InvoiceLifecycleScenario`
  - `ReceivableSettlementScenario`
  - `ArCreditScenario`
  - `RecurringBillingScenario`
  - `ForeignCurrencyInvoiceScenario`
- commands:
  - `registerArScenarioProfile`
  - `recordExpectedInvoiceLifecycle`
  - `recordExpectedReceivableSettlement`
  - `recordExpectedArCreditOutcome`
- invariants:
  - ÄR-scenario måste bara expected customer balance, revenue recognition, VAT outcome, payment settlement och residual status
  - partial payment, overpayment, underpayment och write-off får inte vara specialfall utanför catalog
  - HUS invoice måste vara egen scenariofamilj när skatteeffekt skiljer sig från vanlig faktura
- tester:
  - invoice issue/send/pay/credit suites
  - recurring invoice proof suites
  - foreign currency invoice accounting suites

### Delfas 27.4 accounts payable / receipts / OCR scenario matrix hardening

- bygg:
  - `ApScenarioProfile`
  - `ReceiptScenario`
  - `OcrReviewScenario`
  - `ExpenseReimbursementScenario`
  - `AccrualScenario`
  - `AssetPurchaseScenario`
- commands:
  - `registerApScenarioProfile`
  - `recordExpectedApOutcome`
  - `recordExpectedReceiptOutcome`
  - `recordExpectedOcrReviewOutcome`
- invariants:
  - AP-scenario måste bara expected supplier balance, cost posting, VAT treatment, accrual/prepaid handling och review lineage
  - OCR confidence får aldrig ersätta explicit review decision där policy kraver review
  - company-paid och employee reimbursement måste vara separata scenariofamiljer
- tester:
  - PO-versus-non-PO suites
  - OCR reclassification suites
  - mixed VAT receipt suites

### Delfas 27.5 VAT / banking / tax account scenario matrix hardening

- bygg:
  - `VatScenarioProfile`
  - `BankSettlementScenario`
  - `TaxAccountScenario`
  - `PaymentFeeScenario`
  - `RefundReturnScenario`
  - `OcrSettlementScenario`
- commands:
  - `registerVatScenarioProfile`
  - `recordExpectedVatBoxOutcome`
  - `recordExpectedBankSettlement`
  - `recordExpectedTaxAccountOutcome`
- invariants:
  - varje bank- eller tax-account-scenario måste peka på exakt ledger lineage
  - VAT outcome måste specificera expected momsrutor, period och correction behavior
  - fees, refunds, returns och split settlements får inte doljas i nettoposter
- tester:
  - VAT box mapping suites
  - bank reconciliation suites
  - tax account event suites

### Delfas 27.6 payroll / AGI / benefits / travel / pension / garnishment scenario matrix hardening

- bygg:
  - `PayrollScenarioProfile`
  - `PayRunScenario`
  - `AgiOutcomeSet`
  - `PayrollPostingSet`
  - `BenefitTreatmentScenario`
  - `TravelTreatmentScenario`
  - `FinalPayScenario`
  - `GarnishmentScenario`
  - `EmployeeReceivableScenario`
- commands:
  - `registerPayrollScenarioProfile`
  - `recordExpectedPayRunOutcome`
  - `recordExpectedAgiOutcome`
  - `recordExpectedPayrollPostingSet`
  - `recordExpectedFinalPayOutcome`
- invariants:
  - varje payrollscenario måste bara expected gross/net, tax, employer contribution, AGI fields, payout outcome och BAS-lanekonton
  - SINK, A-SINK och jämkning måste vara separata scenariofamiljer
  - slutlan, negative net pay och bankretur får inte lamnas som fria manuella efterflöden
- officiella regler och källor:
  - [Skatteverket: Arbetsgivardeklaration inlamning, teknisk tjänstebeskrivning](https://www7.skatteverket.se/portal-wapi/open/apier-och-oppna-data/utvecklarportalen/v1/getFile/tjanstebeskrivning-agd-inlamning)
  - [Skatteverket: Teknisk beskrivning får skattetabeller](https://www.skatteverket.se/foretag/arbetsgivare/arbetsgivaravgifterochskatteavdrag/skattetabeller/tekniskbeskrivningforskattetabeller.4.319dc1451507f2f99e86ee.html)
- tester:
  - exhaustive payrun scenario suites
  - AGI field-level proof suites
  - payroll posting parity suites

### Delfas 27.7 HUS / annual / corporate tax / owner distributions scenario matrix hardening

- bygg:
  - `HusScenarioProfile`
  - `AnnualReportingScenario`
  - `CorporateTaxScenario`
  - `OwnerDistributionScenario`
  - `GovernanceReportingScenario`
- commands:
  - `registerHusScenarioProfile`
  - `recordExpectedHusOutcome`
  - `recordExpectedAnnualOutcome`
  - `recordExpectedOwnerDistributionOutcome`
- invariants:
  - HUS full payment, partial payment, credit, reject och post-SKV correction måste vara separata scenarier
  - owner distribution måste bara governance lineage, KU31/kupongskatt where relevant och ledger outcome
  - annual/corporate-tax-scenarier får inte reduceras till bara exportfiler
- tester:
  - HUS lifecycle proof suites
  - annual reporting input suites
  - owner distribution governance suites

### Delfas 27.8 project / field / WIP / profitability scenario matrix hardening

- bygg:
  - `ProjectScenarioProfile`
  - `FieldCompletionScenario`
  - `WipScenario`
  - `ProfitabilityScenario`
  - `MaterialConsumptionScenario`
  - `CommercialHandoffScenario`
- commands:
  - `registerProjectScenarioProfile`
  - `recordExpectedWipOutcome`
  - `recordExpectedProfitabilityOutcome`
  - `recordExpectedFieldCompletionOutcome`
- invariants:
  - projekt- och field-scenario måste visa exakt var tid, material, travel, AP, payroll och ÄR slar igenom
  - dubbelrakning mellan projekt, inventory, AP, payroll och ÄR är blockerande fail
  - profitability outcome måste ga att harleda till samma source events som ledgern
- tester:
  - WIP proof suites
  - field-to-invoice suites
  - profitability reconciliation suites

### Delfas 27.9 export / report / SIE4 parity hardening

- bygg:
  - `ReportParitySuite`
  - `ExportParitySuite`
  - `SieProofBundle`
  - `ArtifactHashSet`
  - `ReportLineExpectation`
- commands:
  - `recordExpectedReportLine`
  - `recordExpectedSieArtifact`
  - `verifyExportParity`
  - `verifyReportParity`
- invariants:
  - rapport eller export får inte markas korrekt utan exact match mot expected outcome
  - SIE4 måste verifieras mot officiell filspecifikation och intern ledger truth samtidigt
  - samma scenario ska kunna peka ut exakt vilka rapportrader och exportartefakter som farvantas
- officiella regler och källor:
  - [SIE Gruppen: SIE filformat ver 4C](https://sie.se/wp-content/uploads/2026/02/SIE_filformat_ver_4C_2025-08-06.pdf)
- tester:
  - SIE4 generation proof suites
  - report line parity suites
  - export artifact checksum suites

### Delfas 27.10 migration / correction / replay parity hardening

- bygg:
  - `MigrationScenarioReplay`
  - `CutoverParityOutcome`
  - `CorrectionOutcomeSet`
  - `ReplayParityBundle`
  - `PostCutoverMismatch`
- commands:
  - `executeScenarioOnMigratedData`
  - `recordCutoverParityOutcome`
  - `recordCorrectionOutcomeSet`
  - `verifyReplayParity`
- invariants:
  - samma scenario-id måste kunna användas på native, migrated, corrected och replayed data
  - correction och replay får inte skapa ny canonical truth utanför proof ledgern
  - post-cutover mismatch måste vara first-class och blockerande
- tester:
  - migration parity suites
  - correction proof suites
  - replay parity suites

### Delfas 27.11 official-source baseline / BAS-account mapping hardening

- bygg:
  - `OfficialSourcePack`
  - `BasAccountMappingSet`
  - `RegulatoryFieldMappingSet`
  - `SourceVersionReceipt`
  - `RuleInterpretationNote`
- commands:
  - `publishOfficialSourcePack`
  - `publishBasAccountMappingSet`
  - `publishRegulatoryFieldMappingSet`
  - `supersedeSourcePack`
- invariants:
  - varje scenariofamilj måste länka till ett source pack med datum och version
  - BAS-lanekonton, AGI-fält, momsrutor och tax-field mappings måste vara explicit publicerade
  - lokal tolkning utan kalla eller tydlig interpretation note är farbjuden
- officiella regler och källor:
  - [Skatteverket: Bokfaring, bokslut och deklaration SKV 282](https://www.skatteverket.se/download/18.4a4d586616058d860bcc3a8/1708607396861/bokforing-bokslut-och-deklaration-skv282utgava08.pdf)
  - [BAS: Chart of account](https://www.bas.se/english/chart-of-account/)
  - [BAS: The Accounting Manual](https://www.bas.se/produkter/the-accounting-manual/)
  - [Bankgirot: OCR-referenskontroll](https://www.bankgirot.se/tjanster/inbetalningar/bankgiro-inbetalningar/ocr-referenskontroll/)
  - [Bankgirot: Bankgiro Receivables technical information](https://www.bankgirot.se/en/services/incoming-payments/bankgiro-receivables/technical-information/)
- tester:
  - missing source-pack deny tests
  - missing BAS mapping deny tests
  - mapping supersession tests

### Delfas 27.12 execution harness / blocker governance / coverage gates hardening

- bygg:
  - `ScenarioExecutionRun`
  - `ScenarioExecutionStep`
  - `ScenarioFailureRecord`
  - `CoverageGapRecord`
  - `ScenarioReadinessVerdict`
  - `ScenarioProofBundle`
- state machines:
  - `ScenarioExecutionRun: queued -> in_progress -> completed | failed | aborted`
  - `ScenarioReadinessVerdict: draft -> review_pending -> approved | rejected`
- commands:
  - `queueScenarioExecutionRun`
  - `recordScenarioExecutionStep`
  - `recordScenarioFailure`
  - `raiseCoverageGap`
  - `issueScenarioReadinessVerdict`
- invariants:
  - failed scenario eller missing coverage måste propagateras till blocker severity
  - green readiness kraver att hela obligatoriska coverage matrix är grön
  - proof bundle måste bara build ref, source pack ref, scenario ids, artifact hashes och verdict
- tester:
  - execution orchestration suites
  - blocker severity propagation suites
  - readiness deny suites

### Delfas 27.13 doc / runbook / legacy purge och slutlig scenario signoff

- bygg:
  - `ScenarioDocTruthDecision`
  - `ScenarioRunbookExecution`
  - `ScenarioSignoffReceipt`
  - `LegacyVerificationArchiveReceipt`
- commands:
  - `recordScenarioDocTruthDecision`
  - `executeScenarioRunbook`
  - `recordScenarioSignoff`
  - `archiveLegacyVerificationDoc`
- invariants:
  - aldre verification-docs får bara leva som consumers eller archive
  - final signoff måste bara named reviewers från finance, tax, payroll och operations där scenariofamiljen kraver det
  - green doc-status utan scenario refs är farbjuden
- tester:
  - docs truth lint
  - runbook existence lint
  - signoff completeness tests

## Fas 28

### Delfas 28.1 stress invariant catalog / peak-window profiles hardening

- bygg:
  - `StressScenarioCatalog`
  - `PeakWindowProfile`
  - `InvariantSuite`
  - `TenantMixProfile`
  - `DeadlinePressureProfile`
- commands:
  - `registerStressScenario`
  - `publishPeakWindowProfile`
  - `publishInvariantSuite`
  - `publishTenantMixProfile`
- invariants:
  - varje peakprofil måste bara exakt vilka invariants som aldrig får brytas
  - regulatoriska peakprofiler måste finnas får momsdag, AGI-dag, lanekarningsdag, HUS-peak, annual close och migreringshelg
  - peakprofil utan severity-klassade invariants är farbjuden
- tester:
  - peak-profile completeness tests
  - invariant registration tests
  - duplicate stress scenario deny tests

### Delfas 28.2 load / concurrency / contention harness hardening

- bygg:
  - `LoadProfile`
  - `ConcurrencyProfile`
  - `ContentionPlan`
  - `LoadExecution`
  - `ThroughputObservation`
  - `LatencyObservation`
- state machines:
  - `LoadExecution: queued -> in_progress -> completed | failed | aborted`
- commands:
  - `queueLoadExecution`
  - `recordThroughputObservation`
  - `recordLatencyObservation`
  - `recordContentionOutcome`
- invariants:
  - concurrency-sviter måste mata bade correctness och timing; snabbhet utan truth räknas inte
  - duplicate writes, duplicate payouts, duplicate submissions eller duplicate payroll outputs är blockerande fail
  - contention mot periodlasning, numbering, settlement och review-state måste vara explicit
- tester:
  - concurrent mutation suites
  - idempotency under retry suites
  - contention deny suites

### Delfas 28.3 financial and regulatory truth under load hardening

- bygg:
  - `PeakFinancialScenario`
  - `PeakRegulatoryScenario`
  - `TruthUnderLoadOutcome`
  - `LedgerDriftFinding`
  - `RegulatoryDriftFinding`
- commands:
  - `executePeakFinancialScenario`
  - `executePeakRegulatoryScenario`
  - `recordTruthUnderLoadOutcome`
  - `raiseLedgerDriftFinding`
- invariants:
  - Domän 27:s expected outcomes måste vara referensen även under peak
  - ledger, report, export, AGI, VAT och tax account får inte driva under load
  - success rate utan truth match är fail, inte warning
- tester:
  - payroll peak suites
  - VAT and banking peak suites
  - HUS and annual peak suites
  - export parity under load suites

### Delfas 28.4 provider / network / callback / worker chaos hardening

- bygg:
  - `FailureInjectionPlan`
  - `ProviderChaosProfile`
  - `CallbackDuplicatePlan`
  - `WorkerCrashPlan`
  - `QueueBacklogProfile`
  - `ChaosOutcome`
- commands:
  - `publishFailureInjectionPlan`
  - `injectProviderFailure`
  - `injectCallbackDuplicate`
  - `injectWorkerCrash`
  - `recordChaosOutcome`
- invariants:
  - provider timeout, 429, partial success och callback duplicate måste vara first-class chaos cases
  - queue backlog och worker crash får inte skapa orphan truth eller osynlig datafarlust
  - chaos måste kunna karas utan att dolja varfar en suite failade
- tester:
  - provider timeout suites
  - duplicate callback suites
  - worker crash suites
  - queue backlog suites

### Delfas 28.5 replay / restore / rebuild / recovery under load hardening

- bygg:
  - `RecoveryStressRun`
  - `ReplayUnderLoadProfile`
  - `RestoreUnderLoadProfile`
  - `RebuildUnderLoadProfile`
  - `RecoveryDriftFinding`
- commands:
  - `executeRecoveryStressRun`
  - `recordReplayUnderLoadOutcome`
  - `recordRestoreUnderLoadOutcome`
  - `recordRebuildUnderLoadOutcome`
- invariants:
  - replay, restore och rebuild under load måste verifiera samma truth som normallaget
  - stale checkpoints, lagging projections och duplicate replay effects är blockerande fail
  - recovery time är viktig men får aldrig prioriteras över truth correctness
- tester:
  - replay under load suites
  - restore under load suites
  - rebuild under backlog suites

### Delfas 28.6 adversarial security / abuse / cross-tenant resistance hardening

- bygg:
  - `AdversarialScenario`
  - `AbuseProfile`
  - `IsolationAttackCase`
  - `ApprovalBypassCase`
  - `PortalAbuseCase`
  - `WebhookAbuseCase`
- commands:
  - `registerAdversarialScenario`
  - `executeIsolationAttackCase`
  - `executeApprovalBypassCase`
  - `executePortalAbuseCase`
  - `executeWebhookAbuseCase`
- invariants:
  - cross-tenant read/write-farsak måste vara blockerande testfall
  - reveal misuse, break-glass misuse, stale session reuse och brute-force måste vara blockerande testfall
  - abuse under load är inte samma sak som abuse i vila; bada måste verifieras
- officiella regler och källor:
  - [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)
  - [OWASP API Security Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- tester:
  - cross-tenant abuse suites
  - rate-limit and brute-force suites
  - approval/reveal misuse suites
  - webhook abuse suites

### Delfas 28.7 operational overload / incident storm / no-go board hardening

- bygg:
  - `OperationalStormProfile`
  - `OperatorLoadBudget`
  - `NoGoDecisionExercise`
  - `IncidentStormOutcome`
  - `OperatorActionError`
- commands:
  - `executeOperationalStormProfile`
  - `recordOperatorLoadBudget`
  - `executeNoGoDecisionExercise`
  - `recordOperatorActionError`
- invariants:
  - systemet måste visa att operatorer kan fatta rätt beslut utan heroisk manuell drift
  - no-go board måste halla prioritetsordning, agarskap och nasta sakra action under storm
  - overload får inte reduceras till CPU/RAM; den måste matas i besluts- och queuekapacitet ocksa
- tester:
  - multi-incident storm suites
  - operator overload suites
  - no-go exercise suites

### Delfas 28.8 degradation / quarantine / kill-switch / safe-mode hardening

- bygg:
  - `DegradationDecision`
  - `SafeModeProfile`
  - `KillSwitchExercise`
  - `QuarantineExercise`
  - `ProtectedCapabilityMatrix`
- commands:
  - `activateSafeModeProfile`
  - `executeKillSwitchExercise`
  - `executeQuarantineExercise`
  - `recordProtectedCapabilityMatrix`
- invariants:
  - varje safe mode måste uttryckligen saga vad som fortsatter, vad som stoppas och hur truth skyddas
  - kill switch får inte skapa ny datafarlust eller tvetydighet om state
  - quarantine måste kunna isolera tenant eller flow utan cross-tenant collateral leakage
- tester:
  - safe-mode transition suites
  - kill-switch integrity suites
  - quarantine boundary suites

### Delfas 28.9 migration / cutover / rollback under stress hardening

- bygg:
  - `CutoverStressProfile`
  - `RollbackStressProfile`
  - `ParallelRunStressProfile`
  - `MigrationPressureOutcome`
  - `RollbackDriftFinding`
- commands:
  - `executeCutoverStressProfile`
  - `executeRollbackStressProfile`
  - `executeParallelRunStressProfile`
  - `recordMigrationPressureOutcome`
- invariants:
  - cutover och rollback måste klara extern eventtrafik, callback duplication och queue backlog samtidigt
  - rollback utan deterministic diff-verdict är farbjuden
  - migrated truth får inte driva från native truth under stress om Domän 27 sager att de ska matcha
- tester:
  - cutover under load suites
  - rollback under load suites
  - parallel-run under pressure suites

### Delfas 28.10 evidence / readiness verdict / doc purge och slutlig stress signoff

- bygg:
  - `StressProofBundle`
  - `StressReadinessVerdict`
  - `StressDocTruthDecision`
  - `StressRunbookExecution`
  - `LegacyStressArchiveReceipt`
- state machines:
  - `StressReadinessVerdict: draft -> review_pending -> approved | rejected`
- commands:
  - `issueStressReadinessVerdict`
  - `recordStressProofBundle`
  - `executeStressRunbook`
  - `archiveLegacyStressDoc`
- invariants:
  - readiness verdict måste bara build ref, artifact digest, stress profiles, failed findings och explicit signers
  - gamla resilience- eller restore-green-statusar får inte användas utan explicit ref till stress proof bundle
  - canonical runbooks får load, chaos, overload, degradation och recovery måste finnas
- officiella regler och källor:
  - [NIST SP 800-34 Rev. 1 Contingency Planning Guide](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-34r1.pdf)
  - [NIST SP 800-61 Rev. 2 Computer Security Incident Handling Guide](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf)
  - [NIST SP 800-218 SSDF](https://csrc.nist.gov/pubs/sp/800/218/final)
  - [SLSA Provenance v1.0](https://slsa.dev/spec/v1.0/provenance)
- tester:
  - proof bundle completeness suites
  - readiness verdict suites
  - docs truth lint

## Minimikrav innan något marks som klart

- runtime finns
- durable modell finns där den måste vara durable
- tester finns för green path, fail path och replay path
- officiella källor är lasta där regulatorik eller DB-semantik kraver det
- runbooks finns för drift, replay, rollback och corrections
- inga placeholders eller tomma rubriker återstar


