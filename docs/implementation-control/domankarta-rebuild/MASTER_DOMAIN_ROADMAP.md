# MASTER_DOMAIN_ROADMAP

## Roll

Detta dokument är den enda aktiva master-roadmapen. Det är inte en sammanfattning av gamla planer. Det är arbetsordningen som nu styr rebuilden domän för domän.

## Globala regler

- [ ] Enda aktiva sanningen finns under `docs/implementation-control/domankarta-rebuild/`
- [ ] Inga gamla `FINAL`-, `Binding`-, `master-control`-, `policy`-, `domain`-, `compliance`-, `test-plan`- eller `ui`-dokument får styra något beslut
- [ ] Varje domän måste läsas i ordningen: `prompt -> analysis -> roadmap -> library`
- [ ] Efter varje domän förs allt som faktiskt måste fixas över hit
- [ ] Master-libraryt måste spegla denna roadmap 1:1
- [ ] Inga stubbar, fake-live paths, simulatorer eller vi ordnar riktiga konton senare får räknas som färdig implementation
- [ ] Bindande dokument får inte innehålla mojibake, replacement-tecken eller odefinierade `?` mitt i ord; URL-frågor och uttryckligt valfria fält är de enda tillåtna undantagen
- [ ] `BINDANDE_SANNING_INDEX.md` måste alltid parsea till samma antal poster som faktiska `_BINDANDE_SANNING.md`-filer på disk
- [ ] Varje `_BINDANDE_SANNING.md` måste fortsatt ha 39 sektionsrubriker och följa `BINDANDE_SANNING_STANDARD.md`

## Bindande tvärdomänsdokument

- [ ] `BINDANDE_SANNING_INDEX.md` ska vara den fullständiga listan över alla bindande sanningsdokument, deras byggordning och deras status; ingen sanningsbibel får finnas utanför indexet
- [ ] `BINDANDE_SANNING_STANDARD.md` ska styra exakt hur varje nytt `_BINDANDE_SANNING.md` måste skrivas; inga nya sanningsdokument får vara tunnare eller vagare an fakturabibeln
- [ ] `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör dokumentingest, original binary capture, OCR, AI fallback, confidence, review, duplicate detection, downstream routing och unknown-document blocking
- [ ] `UTLAGG_OCH_VIDAREFAKTURERING_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör anställdsutlägg, reseforskott, kundutlägg, vidarefakturering av eget inköp, employee reimbursement liability, owner-related claims och invoice handoff mellan utlägg och seller-side faktura
- [ ] `KUNDINBETALNINGAR_OCH_KUNDRESKONTRA_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör kundreskontra, inkommande betalningar, överbetalningar, customer advances, refunds, PSP-fordringar, factoring och payment allocation
- [ ] `FAKTURAFLODET_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör kundfaktura, kundreskontra, kredit, betalallokering, momsutfall på säljsidan, rapport/export och exhaustiv scenariobevisning
- [ ] `LEVFAKTURAFLODET_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör leverantörsfaktura, leverantörskredit, PO/receipt-matchning, purchase-side momsutfall och skapandet av AP-open-items på köpsidan
- [ ] `LEVERANTORSBETALNINGAR_OCH_LEVERANTORSRESKONTRA_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör leverantörsreskontra efter posting, supplier advances, AP-betalningar, AP-returer, netting, payment holds, fees, FX och supplier settlement
- [ ] `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör bankkonto, statementimport, bankline identity, owner binding, bankavstämning, bankavgifter, ränteposter, interna överföringar, duplicate replay och bank-owned legal effect
- [ ] `MOMSFLODET_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör momsscenariokoder, momsrutor, periodisk sammanställning, OSS, avdragsrätt, importmoms, replacement declarations, period locks och all slutlig momsrapporterings-truth
- [ ] `SKATTEKONTOFLODET_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör skattekonto, `1630`-mirror, inbetalningar, debiteringar, återbetalningar, ränta, anstånd, utbetalningsspärr, authority receipts och all slutlig tax-account-truth
- [ ] `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör verifikationer, grundbok, huvudbok, verifikationsserier, kontrollkonton, correction chains, period locks, öppningsbalanser, SIE4-vouchers och all slutlig ledger-truth
- [ ] `PERIODISERING_OCH_BOKSLUTSOMFORINGAR_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör upplupet, förutbetalt, bokslutscutoff, interimskonton, closing adjustments, reversal schedules och all slutlig periodiserings-truth
- [ ] `ANLAGGNINGSTILLGANGAR_OCH_AVSKRIVNINGAR_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör asset capitalization, pågående nyanläggning, avskrivningsplaner, nedskrivning, utrangering, disposal och all slutlig fixed-asset-truth
- [ ] `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör inventory ownership, valuation method, count sessions, inkurans, varukostnad, stock adjustments, closing snapshots och all slutlig inventory carrying-value-truth
- [ ] `INKOP_VARUMOTTAG_OCH_LEVERANSMATCHNING_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör procurement request, purchase order, supplier commitment, goods receipt, putaway, ownership acceptance, receipt variances och 2-way/3-way match
- [ ] `ORDER_OFFERT_AVTAL_TILL_FAKTURA_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör quote, agreement, order, change order, billing trigger, cancellation och commercial handoff till fakturaflödet
- [ ] `ABONNEMANG_OCH_ATERKOMMANDE_FAKTURERING_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör recurring charge schedules, renewals, proration, paus, termination och recurring handoff till fakturaflödet
- [ ] `PROJEKT_WIP_INTAKTSAVRAKNING_OCH_LONSAMHET_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör project roots, WIP, intäktsavräkning, billable readiness och lönsamhet
- [ ] `ARBETSORDER_TID_MATERIAL_OCH_FAKTURERBARHET_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör work orders, time capture, material consumption, customer signoff, billable evidence och invoice handoff
- [ ] `KVITTOFLODET_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör company-paid receipts, receipt capture, receipt-driven kostnadsbokning, representation på köparsidan, personbilskvitton, digitalt bevarande, gross-cost-only fall och receipt-driven momsutfall på köpsidan
- [ ] `LONEFLODET_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör pay calendars, immutable payroll input snapshots, pay runs, payslips, corrections, final pay, employee receivables, payroll posting handoff, payout readiness och payroll replay/cutover truth
- [ ] `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör canonical pay item catalog, line effect classes, BAS-lönekonton, liability anchors, deduction anchors, employee receivable anchors, accrual anchors och payroll account-profile truth
- [ ] `PRELIMINARSKATT_OCH_SKATTETABELLER_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör ordinarie tabellskatt, engångsskatt, jämkning, SINK, A-SINK, no-tax certificates, emergency-manual-tax och frozen tax-decision truth
- [ ] `ARBETSGIVARAVGIFTER_OCH_SPECIALREGLER_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör arbetsgivaravgifter, 67+, 1937-, tillfälliga nedsättningar, växa-stöd, contribution basis och frozen contribution-decision truth
- [ ] `FORMANER_OCH_FORMANSBESKATTNING_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör benefit classification, taxable vs tax-free benefits, valuation evidence, no-double-booking mellan receipt/AP och payroll, benefit payroll handoff och förmånsspecifik replay truth
- [ ] `RESOR_TRAKTAMENTE_OCH_MILERSATTNING_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör tjänsteresa, traktamente, nattraktamente, måltidsreduktion, tremånadersreduktion, milersättning, tax-free vs taxable travel replacement och travel payroll handoff
- [ ] `PENSION_OCH_LONEVAXLING_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör pensionspremier, salary exchange, top-up policy, special löneskatt på pensionskostnader och pension payroll handoff
- [ ] `SEMESTER_SEMESTERSKULD_OCH_SEMESTERERSATTNING_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör semesterårslogik, intjänande, betalda och obetalda dagar, sparade dagar, sammalöneregeln, procentregeln, semesterlön, semesterersättning, förskottssemester och semesterskuld
- [ ] `SJUKLON_KARENS_OCH_FRANVARO_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör sjukperiod dag 1-14, karensavdrag, deltidsfrånvaro, läkarintyg, högriskskydd, övergång dag 15 till Försäkringskassan och payroll handoff för sjuklön
- [ ] `LONEUTMATNING_OCH_ANDRA_MYNDIGHETSAVDRAG_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör löneutmatning, myndighetsbeslut, remittering, oregelbundna utbetalningar under beslut och liability-truth mot myndighet
- [ ] `NEGATIV_NETTOLON_OCH_EMPLOYEE_RECEIVABLE_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör negativ nettolön, employee receivable, payroll settlement, bankåterbetalning och blockerad kvittning
- [ ] `LONEUTBETALNING_OCH_BANKRETURER_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör payout batch, settlement receipt, partial batch, bankretur, reopened payroll liability och reissue-truth
- [ ] `AGI_FLODET_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör AGI-period, huvuduppgift, individuppgifter, specifikationsnummer, receipt, correction, removal och frånvarouppgiftens transportgräns
- [ ] `AGI_FALTKARTA_OCH_RATTELSER_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör AGI-faltrutor, skattefalt, huvuduppgiftssummor, fuel-benefit-logik, checkbox-rutor, correction på faltniva och blockerad unsupported AGI-mappning
- [ ] `ROT_RUT_HUS_FLODET_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör HUS-overlay, delad faktura, elektronisk kundbetalning, claim-version, beslut, state payout eller tax-account-offset, delavslag, avslag och recovery
- [ ] `GRON_TEKNIK_FLODET_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör grön-teknik-overlay, split invoice, installationstyper, rulepack-satser, elektronisk kundbetalning, claim-version, beslut, payout eller tax-account-offset, cash-method VAT och recovery
- [ ] `ARSBOKSLUT_ARSREDOVISNING_OCH_INK2_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör hard close, årsredovisningspaket, K2/K3-klassning, årsredovisning, fastställelseintyg, INK2, INK2R, INK2S, uppskjuten skatt, skatt på årets resultat och filing-truth mot Bolagsverket och Skatteverket
- [ ] `AGARUTTAG_UTDELNING_KU31_OCH_KUPONGSKATT_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör utdelningsbeslut, eget kapital-källor, skuld till ägare, utbetalning, KU31, kupongskatt, kupongskatteinbetalning, avstämningsbolag och owner-distribution-truth
- [ ] `SIE4_IMPORT_OCH_EXPORT_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör SIE typ 4, voucherexport, voucherimport, `#RAR`, `#KONTO`, `#VER`, `#TRANS`, dimensionsmetadata, migration via SIE4 och roundtrip/parity-evidence
- [ ] `DIMENSIONER_OBJEKT_OCH_SIE_MAPPNING_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör dimensionstyper, objekttyper, obligatoriska dimensionsregler, objektmappning, SIE-objektfamiljer och roundtrip utan informationsförlust
- [ ] `RAPPORTER_MOMS_AGI_RESKONTRA_HUVUDBOK_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör momsrapport, periodisk sammanställning, AGI-underlag, kundreskontra, leverantörsreskontra, huvudbok, grundbok, verifikationslista, balansrapport och resultatrapport
- [ ] `PEPPOL_EDI_OCH_OFFENTLIG_EFAKTURA_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör Peppol BIS Billing 3, offentlig e-faktura, endpoint binding, structured inbound invoice, transport receipts, duplicate control och offentlig-sektor-delivery blockers
- [ ] `OCR_REFERENSER_OCH_BETALFORMAT_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör OCR-referenser, 10-modul, hard eller soft OCR-kontroll, variabel eller fast längd, Bg Max, incoming payment files, supplier payment files, salary payment files och provider-versionerade bankformat
- [ ] `PARTNER_API_WEBHOOKS_OCH_ADAPTERKONTRAKT_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör partner-API, adapterkontrakt, outbound partner requests, inbound webhooks, signature verification, idempotency, duplicate control och command-path-only routing
- [ ] `IDENTITET_AUTH_MFA_OCH_BEHORIGHET_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör lokal auth, MFA, step-up, passkeys, OIDC, SAML, sessioner, permission boundaries, support reveal och high-risk access
- [ ] `SECRETS_KMS_HSM_OCH_KRYPTERING_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör secrets, key lineage, KMS, HSM, envelope encryption, rotation, decrypt boundaries och cryptographic evidence
- [ ] `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör audit events, evidence artifacts, evidence bundles, approval requests, sign-off packages, break-glass receipts, support reveal, filing evidence och operatorbeslut med legal eller security effekt
- [ ] `MIGRATION_PARALLELLKORNING_CUTOVER_OCH_ROLLBACK_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör source bindings, capability receipts, extract manifests, canonical datasets, import batches, parallel run, cutover, watch window, rollback, fail-forward och migration parity
- [ ] `SCENARIOPROOF_OCH_BOKFORINGSBEVIS_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör scenario registry, fixture classes, expected outcomes, proof bundles, mismatch findings, release gates och accounting proof signoff
- [ ] `STRESS_CHAOS_RECOVERY_OCH_ADVERSARIAL_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör load profiles, chaos experiments, recovery drills, adversarial scenarios, stop conditions, readiness verdicts och prod-like resilience proof
- [ ] `SEARCH_ACTIVITY_NOTIFICATIONS_OCH_WORKBENCHES_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör projection-driven search, activity timelines, notifications, saved views, workbench rows, freshness checkpoints och masking i läsytor
- [ ] `BOKFORINGSSIDA_OCH_FINANCIAL_WORKBENCH_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör bokföringssidan, financial workbench, snapshot-/as-of-val, state badges, freshness badges, drilldowns, exportknappar, masking, reveal och command-CTA på accounting-sidan
- [ ] `SUPPORT_BACKOFFICE_INCIDENTS_OCH_REPLAY_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör support cases, incidenter, dead letters, replay requests, correction orchestration, no-go board, quarantine och operatorstyrd recovery
- [ ] `KONCERN_INTERCOMPANY_OCH_SHARED_SERVICES_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör group hierarchy, intercompany counterparties, intercompany settlements, shared-service allocations, treasury visibility och elimination inputs
- [ ] `PORTALER_SIGNERING_INTAKE_OCH_EXTERN_SELVSERVICE_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör externa portaler, public forms, uploads, intake routing, signing envelopes, portal status och self-service actions
- [ ] `BAS_KONTOPOLICY_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör canonical BAS-kontofamiljer, defaultkonton, control accounts, blocked overrides och konto-lineage för icke-löneposter
- [ ] `BAS_KONTOPLAN_SOKFRASER_OCH_BOKNINGSINTENTION_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör account search, flerordsfraser, OCR-candidate generation, workbench-kandidater, manual kontosok och blocked auto-select vid tvetydig BAS-tolkning
- [ ] `BAS_LONEKONTOPOLICY_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör BAS-lönekonton, payroll liabilities, accrual anchors, employee receivables och blocked payroll account overrides
- [ ] `MOMSRUTEKARTA_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör momsrutor, box mapping, reverse-charge-boxar, importboxar, replacement declarations och VAT box lineage
- [ ] `AGI_FALTKARTA_OCH_RATTELSER_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör AGI-faltrutor, skattefalt, huvuduppgiftssummor, checkbox-rutor, drivmedelsforman, correction på faltniva och blockerad unsupported AGI-mappning
- [ ] `SKATTEKONTOMAPPNING_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör `1630`-mirror, authority-event-klassning, moms- och payroll-clearing mot skattekontot, HUS/grön-teknik-offset och blocked unknown authority events
- [ ] `VERIFIKATIONSSERIER_OCH_BOKFORINGSPOLICY_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör verifikationsserier, voucher identity, reservationsluckor, correction policy, posting date policy och SIE4-serieparitet
- [ ] `VALUTA_OMRAKNING_OCH_KURSDIFFERENS_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör redovisningsvaluta, valutakurskallor, omräkningsdatum, FX gain/loss, rounding och blocked missing rate lineage
- [ ] `LEGAL_REASON_CODES_OCH_SPECIALTEXTPOLICY_BINDANDE_SANNING.md` ska användas som bindande tvärdomänssanning i alla delfaser som rör 0%-anledningar, undantag från momsplikt, omvänd betalningsskyldighet, EU/exportreferenser, HUS/grön-teknik-specialtexter och blockerad issuance utan legal basis
- [ ] Fas 5, 7, 13, 21, 27 och 28 får inte definiera avvikande scanning-, OCR-, klassnings- eller review truth
- [ ] Fas 4, 6, 11, 13, 15, 18 och 27 får inte definiera avvikande invoice truth
- [ ] Fas 10, 15 och 27 får inte definiera avvikande payroll core truth eller avvikande BAS-lönekontotolkning utan att `LONEFLODET_BINDANDE_SANNING.md` och `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 10, 15 och 27 får inte definiera avvikande preliminarskatte-, SINK-, A-SINK- eller jamkningstruth utan att `PRELIMINARSKATT_OCH_SKATTETABELLER_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 10, 15 och 27 får inte definiera avvikande arbetsgivaravgifts-, 67+-, youth-, växa- eller contribution-basis-truth utan att `ARBETSGIVARAVGIFTER_OCH_SPECIALREGLER_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 5, 10, 15 och 27 får inte definiera avvikande benefitklassning, förmånsvardering eller no-double-booking-truth utan att `FORMANER_OCH_FORMANSBESKATTNING_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 5, 10, 15 och 27 får inte definiera avvikande traktamente-, milersättnings-, måltidsreduktions- eller travel-handoff-truth utan att `RESOR_TRAKTAMENTE_OCH_MILERSATTNING_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 10, 15 och 27 får inte definiera avvikande pensionspremie-, salary-exchange-, top-up- eller pension-tax-truth utan att `PENSION_OCH_LONEVAXLING_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 10, 15 och 27 får inte definiera avvikande semesterårslogik, intjänande, sammaloneregel, procentregel, förskottssemester eller semesterskuldstruth utan att `SEMESTER_SEMESTERSKULD_OCH_SEMESTERERSATTNING_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 10, 15 och 27 får inte definiera avvikande sjukloneperiod, karens, läkarintyg, högriskskydd eller sjuk-payroll-handoff-truth utan att `SJUKLON_KARENS_OCH_FRANVARO_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 10, 15 och 27 får inte definiera avvikande löneutmatnings-, myndighetsavdrags- eller authority-remittance-truth utan att `LONEUTMATNING_OCH_ANDRA_MYNDIGHETSAVDRAG_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 10, 15 och 27 får inte definiera avvikande AGI-faltrutekarta, correction på faltniva eller unsupported-field-truth utan att `AGI_FALTKARTA_OCH_RATTELSER_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 10, 15 och 27 får inte definiera avvikande negativ-netto-, employee-receivable- eller kvittningstruth utan att `NEGATIV_NETTOLON_OCH_EMPLOYEE_RECEIVABLE_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 10, 15 och 27 får inte definiera avvikande payroll-payout-, settlement- eller bankreturtruth utan att `LONEUTBETALNING_OCH_BANKRETURER_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 10, 15 och 27 får inte definiera avvikande AGI-period-, receipt-, correction- eller removal-truth utan att `AGI_FLODET_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 10, 15 och 27 får inte definiera avvikande AGI-faltrutor, skattefalt, huvuduppgiftssummor eller specialrutekarta utan att `AGI_FALTKARTA_OCH_RATTELSER_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 4, 11, 15 och 27 får inte definiera avvikande HUS-overlay-, claim-, payout-, denial- eller recovery-truth utan att `ROT_RUT_HUS_FLODET_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 4, 11, 15 och 27 får inte definiera avvikande grön-teknik-overlay-, claim-, payout-, cash-method-VAT- eller recovery-truth utan att `GRON_TEKNIK_FLODET_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 11, 15 och 27 får inte definiera avvikande hard-close-, årsredovisnings-, uppskjuten-skatt-, INK2-, fastställelseintygs- eller filing-truth utan att `ARSBOKSLUT_ARSREDOVISNING_OCH_INK2_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 11, 15 och 27 får inte definiera avvikande utdelningsbeslut-, owner-equity-source-, KU31-, kupongskatte-, avstämningsbolags- eller owner-payout-truth utan att `AGARUTTAG_UTDELNING_KU31_OCH_KUPONGSKATT_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 6, 15 och 27 får inte definiera avvikande SIE4-, voucherexport-, voucherimport-, `#RAR`-, `#KONTO`-, `#VER`-, `#TRANS`- eller roundtrip-truth utan att `SIE4_IMPORT_OCH_EXPORT_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 3, 6, 13, 15 och 27 får inte definiera avvikande dimensions-, objekt-, SIE-objekt- eller roundtrip-truth utan att `DIMENSIONER_OBJEKT_OCH_SIE_MAPPNING_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 6, 10, 15 och 27 får inte definiera avvikande momsrapport-, periodisk-sammanställnings-, AGI-underlags-, reskontra-, huvudboks-, grundboks- eller financial-statement-truth utan att `RAPPORTER_MOMS_AGI_RESKONTRA_HUVUDBOK_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 4, 6, 7 och 27 får inte definiera avvikande Peppol-, offentlig-e-faktura-, endpoint-, delivery-receipt-, structured-inbound- eller duplicate-truth utan att `PEPPOL_EDI_OCH_OFFENTLIG_EFAKTURA_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 4, 6, 10 och 27 får inte definiera avvikande OCR-, reference-, Bg Max-, supplier-payment-file-, salary-payment-file- eller payment-format-truth utan att `OCR_REFERENSER_OCH_BETALFORMAT_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 2, 5, 6, 7 och 27 får inte definiera avvikande partner-API-, webhook-, signature-, duplicate-, schema-version- eller adapterkontrakts-truth utan att `PARTNER_API_WEBHOOKS_OCH_ADAPTERKONTRAKT_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 2 och 27 får inte definiera avvikande auth-, MFA-, session-, passkey-, OIDC-, SAML-, permission- eller step-up-truth utan att `IDENTITET_AUTH_MFA_OCH_BEHORIGHET_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 2, 5, 7 och 27 får inte definiera avvikande secrets-, key-, KMS-, HSM-, envelope-encryption-, decrypt-boundary- eller rotation-truth utan att `SECRETS_KMS_HSM_OCH_KRYPTERING_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 5, 10, 11, 15 och 27 får inte definiera avvikande audit-, evidence-, approval-, sign-off-, support-reveal- eller break-glass-truth utan att `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 13, 15 och 27 får inte definiera avvikande source-binding-, cutover-, watch-window-, rollback-, fail-forward- eller migration-parity-truth utan att `MIGRATION_PARALLELLKORNING_CUTOVER_OCH_ROLLBACK_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 27 får inte definiera avvikande scenario-registry-, fixture-, expected-outcome-, mismatch- eller proof-bundle-truth utan att `SCENARIOPROOF_OCH_BOKFORINGSBEVIS_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 27 och 28 får inte definiera avvikande load-profile-, chaos-, recovery-, adversarial- eller readiness-truth utan att `STRESS_CHAOS_RECOVERY_OCH_ADVERSARIAL_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 13, 16 och 27 får inte definiera avvikande projection-, freshness-, notification-, activity- eller workbench-truth utan att `SEARCH_ACTIVITY_NOTIFICATIONS_OCH_WORKBENCHES_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 13, 15, 17 och 27 får inte definiera avvikande bokföringssida-, financial-workbench-, snapshot-badge-, drilldown-, export- eller reveal-truth utan att `BOKFORINGSSIDA_OCH_FINANCIAL_WORKBENCH_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 16 och 27 får inte definiera avvikande support-, incident-, replay-, dead-letter-, no-go- eller quarantine-truth utan att `SUPPORT_BACKOFFICE_INCIDENTS_OCH_REPLAY_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 11, 15, 24 och 27 får inte definiera avvikande group-, intercompany-, shared-service-, treasury- eller elimination-input-truth utan att `KONCERN_INTERCOMPANY_OCH_SHARED_SERVICES_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 22 och 27 får inte definiera avvikande portal-, signerings-, upload-, intake- eller self-service-truth utan att `PORTALER_SIGNERING_INTAKE_OCH_EXTERN_SELVSERVICE_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 4, 5, 6, 11, 15 och 27 får inte definiera avvikande BAS-kontofamiljer, defaultkonton, control-account-ankare eller overridepolicy utan att `BAS_KONTOPOLICY_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 5, 6, 7, 15, 21 och 27 får inte definiera avvikande BAS-sökfras-, candidate ranking- eller konto-intention-truth utan att `BAS_KONTOPLAN_SOKFRASER_OCH_BOKNINGSINTENTION_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 10, 15 och 27 får inte definiera avvikande BAS-lönekonton, payroll-liability-ankare, accrual anchors eller employee-receivable-kontoankare utan att `BAS_LONEKONTOPOLICY_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 4, 5, 6, 11, 15 och 27 får inte definiera avvikande momsrutekarta, reverse-charge-boxmappning, replacement-lineage eller VAT-box-truth utan att `MOMSRUTEKARTA_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 6, 10, 11, 15 och 27 får inte definiera avvikande `1630`-mirror, authority-event-klassning eller HUS/grön-offset-mappning utan att `SKATTEKONTOMAPPNING_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 4, 6, 10, 15 och 27 får inte definiera avvikande verifikationsserie-, voucher identity- eller reservationslucke-truth utan att `VERIFIKATIONSSERIER_OCH_BOKFORINGSPOLICY_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 4, 5, 6, 13, 15 och 27 får inte definiera avvikande redovisningsvaluta-, rate-source-, kursdifferens- eller rounding-truth utan att `VALUTA_OMRAKNING_OCH_KURSDIFFERENS_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] Fas 4, 6, 11, 22 och 27 får inte definiera avvikande legal reason-code-, specialtext- eller structured legal-basis-truth utan att `LEGAL_REASON_CODES_OCH_SPECIALTEXTPOLICY_BINDANDE_SANNING.md` skrivs om samtidigt
- [ ] inga nya bindande sanningsdokument får skapas eller hoppas över utan att `BINDANDE_SANNING_INDEX.md` uppdateras i samma ändringsset

## Fas 0

### Delfas 0.1 Documentation Truth Lock
- [ ] skriv om `README.md` sa att bara rebuild-kedjan anges som sanning
- [ ] skriv om `scripts/lib/repo.mjs` sa att gamla docs inte längre är mandatory truth
- [ ] verifiera att `AGENTS.md`, settings-prompt, master-roadmap och master-library pekar på samma sanningskedja
- [ ] dokumentera vilka gamla styrdokument som nu är legacy/raw material

### Delfas 0.2 Legacy Binding Downgrade
- [ ] klassificera hela `docs/implementation-control/*` utanför rebuild-tradet
- [ ] klassificera hela `docs/master-control/*`
- [ ] klassificera hela `docs/compliance/se/*`
- [ ] klassificera hela `docs/domain/*`
- [ ] klassificera hela `docs/policies/*`
- [ ] klassificera hela `docs/test-plans/*`
- [ ] klassificera hela `docs/ui/*`
- [ ] klassificera alla gamla runbooks som `migrate/archive/rewrite/remove`

### Delfas 0.3 Surface Reality Map
- [ ] las faktisk appkarta till `api`, `desktop-web`, `field-mobile`, `worker`
- [ ] dokumentera alla gamla referenser till `apps/backoffice`
- [ ] dokumentera alla gamla referenser till `apps/public-web`
- [ ] mark varje sadan referens som `missing planned surface`, `historical` eller `rewrite required`

### Delfas 0.4 Code And Runtime Classification
- [ ] klassificera aktiva entrypoints
- [ ] klassificera placeholderkod och scaffolds
- [ ] klassificera `scripts/lib/repo.mjs`
- [ ] klassificera `integration-core`, `test-fixtures`, Python-spar och placeholder-infra

### Delfas 0.5 Runtime Blocker Register
- [ ] kor honesty-scan i production-lage
- [ ] registrera persistence-blockers
- [ ] registrera flat-merge-collisions
- [ ] registrera map-only-truth
- [ ] registrera stub-provider och secret-runtime-blockers
- [ ] koppla varje blocker till senare domäner som inte får passera farbi den

### Delfas 0.6 Test Truth Classification
- [ ] räkna alla demo-platformtester
- [ ] mark alla demo-familjer som `demo/test-only`
- [ ] hitta och skriva om hardkodade lokala repo-paths i tester
- [ ] skilj `runtime`, `demo`, `smoke`, `metadata`, `environment-blocked`

### Delfas 0.7 Script And Runbook Truth Classification
- [ ] klassificera `lint`, `typecheck`, `build`, `security` efter faktiskt bevisvarde
- [ ] klassificera hela `verify-*.ps1`-familjen
- [ ] rensa eller arkivera runbooks med absoluta lokala paths
- [ ] bygg en portabel verifierings- och runbookklassificering

### Delfas 0.8 False Completeness Map
- [ ] lista alla grana signaler som bara är strukturgrant
- [ ] lista alla docs som antar saknade ytor
- [ ] lista alla testsignaler som bara är demo/runtime-light
- [ ] lista alla placeholders som fortfarande hålls required

### Delfas 0.9 Repo Prune And Supersession Map
- [ ] skriv och las `DOMAIN_00_REPO_PRUNE_MAP.md`
- [ ] markera vad som ska `keep/harden/rewrite/replace/migrate/archive/remove`
- [ ] skilj på vad som ska `archive` och vad som ska `remove`
- [ ] peka ut vart innehåll måste migreras innan gamla docs kan arkiveras

### Delfas 0.10 Low-Risk Cleanup Execution
- [ ] arkivera gamla styrdokument som inte längre får styra
- [ ] arkivera uppenbara placeholderkluster
- [ ] ta bort lokala absoluta paths i aktivt kvarvarande material
- [ ] uppdatera root-manifest och root-readme efter cleanup

### Delfas 0.11 Domain Input Export
- [ ] bygg capability-kluster från kod, routes, worker och migrations
- [ ] dokumentera tvärdomänsblocker
- [ ] skriv overfaringen till Domän 1-starten

### Delfas 0.12 External Audit Reconciliation
- [ ] läs `C:\Users\snobb\Downloads\bokforing_rebuild_issue_register.json` som verifieringsunderlag, aldrig som bindande sanning
- [ ] läs `C:\Users\snobb\Downloads\bokforing_rebuild_audit_report.md` som verifieringsunderlag, aldrig som bindande sanning
- [ ] skriv och läs `BOKFORING_REBUILD_AUDIT_RECONCILIATION_2026-04-04.md` som rekonsileringskvitto
- [ ] jämför auditpaketets direkta corpusclaims mot nuvarande rebuild-läge och markera stale counts som stale eller stängda
- [ ] håll kvar verkligt öppna docs-hygienfynd för UTF-8 BOM, absoluta lokala paths och dokumentportabilitet
- [ ] mappa varje importerad `issue_ref` till exakt en disposition: `closed_stale`, `closed_already_implemented`, `open_doc_hygiene`, `carry_forward_existing_phase`, `carry_forward_new_blocker`
- [ ] verifiera att Domän 00, master-roadmapen och master-libraryt bär samma carry-forward-kluster utan dubbelregistrering

## Fas 1

### Delfas 1.1 Source-Of-Truth Consolidation
- [ ] flytta kritiska writes från `decorateCriticalDomainPersistence(...)` till canonical command runtime
- [ ] definiera aggregate-katalog per kritisk domän
- [ ] mappa varje write-metod till explicit `commandType`, `aggregateType`, `aggregateId`
- [ ] degradera `critical_domain_state_snapshots` till sekundar checkpoint/export-roll
- [ ] verifiera att faktisk runtime utanför tester anropar `createCommandMutationRuntime(...)`

### Delfas 1.2 Repository And Persistence Correction
- [ ] infor riktig canonical repository bootstrap i API och worker
- [ ] förbjud protected runtime utan explicit canonical repository store
- [ ] las startup till schema verifiering för canonical repo, critical state och async jobs
- [ ] migrera från domain-snapshot-truth till aggregate rows
- [ ] skilj primara tabeller från checkpoint- och transition-tabeller

### Delfas 1.3 Atomic Mutation Path Hardening
- [ ] gör command runtime till enda lagliga write path för kritiska mutationer
- [ ] skriv explicita domain events i mutation-koden
- [ ] skriv explicita outbox rows i mutation-koden
- [ ] skriv explicita evidence refs i mutation-koden
- [ ] ta bort generiska `domain.method.committed` som primär audit-/replay-modell

### Delfas 1.4 Outbox / Inbox / Journal Hardening
- [ ] las `outbox_events` som enda dispatch-kalla för kritiska side effects
- [ ] infor inbox-dedupe på alla inbound paths som kan ändra kritiska domäner
- [ ] bygg receipt-kedja mellan command, event, outbox och evidence
- [ ] förbjud direkta provider-anrop från kritiska mutationsvagar
- [ ] verifiera publish/retry/dead-letter utan dubbel affärseffekt

### Delfas 1.5 Idempotency And Concurrency Hardening
- [ ] flytta `expectedObjectVersion` till aggregate rows
- [ ] behall duplicate suppression på `(company_id, command_type, command_id)` och `(company_id, idempotency_key)`
- [ ] infor retry-policy för serialization failure och concurrency conflicts
- [ ] separera versionshistorik för olika aggregat i samma domän
- [ ] verifiera att duplicate command aldrig ger dubbel outbox/evidence

### Delfas 1.6 Worker Lifecycle Hardening
- [ ] gör job store till operativ state, inte business truth
- [ ] koppla jobbskapande till outbox eller explicit ops-command
- [ ] bind replay plan och dead letters till source command receipt och aggregate refs
- [ ] verifiera claim/heartbeat/finalize/replay utan dold write path

### Delfas 1.7 Replay / Restore / Projection Rebuild Hardening
- [ ] gör snapshots till checkpoint-artifacts, inte primär sanning
- [ ] bygg projection rebuild från canonical command/event truth
- [ ] las replay-modellen sa att correction och replay inte blandas ihop
- [ ] verifiera restore drills, replay drills och projection rebuild från canonical truth

### Delfas 1.8 Import / Cutover / Rollback Hardening
- [ ] las import till canonical commands
- [ ] förbjud snapshot overwrite som normal migreringsvag
- [ ] bygg rollback checkpoints mot aggregate/evidence refs
- [ ] bygg parallel-run receipts och cutover evidence på samma truth-modell som live

### Delfas 1.9 Environment Isolation Hardening
- [ ] förbjud implicit `memory` i protected runtime redan vid platform bootstrap
- [ ] förbjud implicit fallback till `test` i alla icke-testade entrypoints
- [ ] mark `createApiServer(...)` och liknande helpers som test-only eller ge dem samma startup blockers
- [ ] las `pilot_parallel` och `production` till explicit store, explicit mode och explicit no-seed policy

### Delfas 1.10 Bootstrap / Config / Diagnostics / Observability Hardening
- [ ] gör canonical repository blocker till förstaklassig runtime finding
- [ ] gör API och worker lika hårda i startup-blocking
- [ ] logga och exponera mode/store/schema/lag/replay-status explicit
- [ ] verifiera att diagnostics ensamt racker för att avgöra deploybarhet

## Fas 2

### Delfas 2.1 Security Truth Lock And Fake-Live Demotion
- [ ] mark passkeys, BankID och federation sanningsenligt som `stub`, `fake-live` eller `partial`
- [ ] mark OCR-provider-callback som operator collect path om den inte är riktig extern callback
- [ ] sank gamla live-ansprak i diagnostics, docs och readinessstatus
- [ ] blockera go-live-claims som bygger på gamla phase6-markeringar
- [ ] för in Domän 2:s öppna critical blockers i masterblockerlistan

### Delfas 2.2 Secret Inventory And Classification
- [ ] bygg komplett secret- och key-register för auth-, provider-, callback-, webhook-, signing- och recovery-hemligheter
- [ ] klassificera varje typ till sakerhetsklass, ägare, tillaten lagring, exportpolicy, rotationspolicy och revokeringspolicy
- [ ] sak igenom repo efter alla secretborare och stoppa oklassificerade traffar
- [ ] dokumentera vilka hemligheter som kraver verkliga externa konton, nycklar eller certifikat

### Delfas 2.3 Secret Storage, Import And Export Hardening
- [ ] ta bort fallback till ra `snapshot.authBroker`
- [ ] flytta legacy secret sealer ur normal runtime
- [ ] blockera osanerad import av gamla auth snapshots
- [ ] blockera export av hoga sakerhetsklasser utan extern KMS/HSM och explicit policy
- [ ] mark enrollment-, callback- och providerhemligheter som non-loggable

### Delfas 2.4 KMS/HSM/Envelope And Artifact-Integrity Hardening
- [ ] hard-faila bootstrap i `protected`, `pilot_parallel` och `production` utan extern KMS/HSM
- [ ] separera envelope-, blind-index-, artifact-integrity- och webhook-signing-nycklar
- [ ] skriv key-version i posture, audit, exports och diagnostics
- [ ] signera eller MAC:a snapshot- och evidence-artifacts
- [ ] infor rotationsmodell med `current`, `previous`, staged activation och revocation

### Delfas 2.5 Login Root, Session Root And Transport Hardening
- [ ] ersätt `companyId + email -> sessionToken` med kortlivad auth transaction
- [ ] skapa eller rotera sessiontoken farst efter verifierad första faktor
- [ ] infor `issuedAt`, `lastUsedAt`, `idleExpiresAt`, `absoluteExpiresAt` och `rotationCounter`
- [ ] rotera token vid första faktor, step-up och privileged access
- [ ] förbjud `body.sessionToken` på auth-kansliga och high-risk-routes
- [ ] bind `x-forwarded-for` till trusted-proxy-regel

### Delfas 2.6 TOTP, Device Trust And Fresh-Trust Hardening
- [ ] infor persistent replay-ledger för TOTP timestep/counter
- [ ] infor lockout och throttling i delad persistent state
- [ ] infor riktig device trust-record med TTL och revocation
- [ ] knyt fresh-trust till action class och TTL med hard runtime enforcement

### Delfas 2.7 Passkey Hardening
- [ ] infor riktig WebAuthn serververifiering för challenge, RP ID, origin, signatur, user verification och signCount
- [ ] bygg challenge-ledger med en-gangs-konsumtion och expiry
- [ ] definiera exakt när passkey får räknas som stark faktor
- [ ] stoppa syntetiska assertionstrangar permanent

### Delfas 2.8 BankID Hardening
- [ ] ersätt lokal `orderRef`- och `completionToken`-simulering med riktig BankID-broker/provider
- [ ] infor environment-isolerad credentialmodell och transkriptbindning
- [ ] bind sessiontrust till verklig providerrespons
- [ ] hall capability blockerad tills riktiga externa konton, credentials och certifikat finns

### Delfas 2.9 Federation Hardening
- [ ] ersätt lokal authorization-code-simulering med verklig OIDC/SAML-kedja
- [ ] verifiera state, nonce, issuer, audience, expiry, signatur och JWKS eller SAML-certifikatkedja
- [ ] separera identitetsbevis från intern affärsrollsmappning
- [ ] hall capability blockerad tills riktiga externa providerkonton finns

### Delfas 2.10 Callback, Webhook And Provider-Boundary Hardening
- [ ] separera riktiga provider-callbacks från operatars-collect-routes
- [ ] infor verifieringsmetod per provider: signatur, token exchange, JWT/JWS, SAML eller verifierad poll
- [ ] infor persistent replay-ledger för callback delivery ids och tokens
- [ ] bind callback-domain, path, environment och credential-set till rätt providerenvironment
- [ ] lista exakt vilka callbacks som är externa, interna eller operatarsdrivna

### Delfas 2.11 Permission, Boundary And Privileged-Access Enforcement
- [ ] bygg central authz-gate före handlern som kombinerar permission, company boundary, trust, action class och fresh-trust
- [ ] gör samma gate obligatorisk för impersonation, break-glass, access reviews och high-risk business writes
- [ ] blockera TOTP-only-approvers där policy kraver starkare trust
- [ ] bind support/backoffice-routes till striktare trust an vanlig `company.manage`
- [ ] verifiera att metadata i route contracts och verklig route ger samma beslut

### Delfas 2.12 Audit, Evidence And Production Security Gate
- [ ] infor signerad eller MAC:ad security evidence
- [ ] infor first-class audit för factor enrollment, factor revoke, session rotate, provider callback, credential change, key rotation, impersonation och break-glass
- [ ] infor production gate som blockerar live om extern KMS/HSM saknas, fake-live-provider finns kvar, central trust-enforcement saknas eller persistent security state saknas
- [ ] dokumentera exakta externa blockerare där användaren måste ge riktiga konton, nycklar, secrets eller certifikat

## Fas 3

### Delfas 3.1 Legal-Form Hardening
- [ ] bygg en central `legalAccountingContext` som resolver legal form, reporting-obligation-profile, signatory class och package family per bokföringsdatum
- [ ] ta bort `monthly_standard`-fallback för fiscal-year-end i `packages/domain-core/src/close.mjs`
- [ ] gör aktiv legal-form-binding obligatorisk för close, year-end, annual/export och ändra bokföringsnara mutationer
- [ ] lagra legal-form-snapshot per rakenskapsar sa att historisk företagsform inte kan muteras i efterhand
- [ ] verifiera att AB och enskild naringsverksamhet för olika close-/package-paths

### Delfas 3.2 Fiscal-Year Governance Hardening
- [ ] bygg en maskinläsbar legality-matris för kalenderar, brutet är, kort är och farlangt är
- [ ] bind fiscal-year-change till tillstandsreferens, approvalklass och impacted-scope-analys
- [ ] blockera aktivering av nytt är innan föregående ars close/result-transfer/opening-balance-kedja är verifierad
- [ ] ta bort förenklad omlaggningslogik som ersätter verklig laglighetsbedomning
- [ ] verifiera att otillåtna omlaggningar blockerar med reason code och evidence-krav

### Delfas 3.3 Accounting-Method Governance Hardening
- [ ] gör `AccountingMethodEligibilityAssessment` till first-class objekt
- [ ] bygg om metodbyte till legalitetsstyrd change request med evidencepaket
- [ ] flytta year-end catch-up från request-supplied `openItems` till verkligt ÄR/AP-underlag
- [ ] bind aktiv metod till bokföringsdatum och rakenskapsar
- [ ] verifiera att mittarsbyte blockerar och att catch-up bara kan koras från lasta subledgers

### Delfas 3.4 Change-Legality Enforcement Hardening
- [ ] bygg en central legality-matris för legal form, fiscal year, accounting method, reopen och importpolicy
- [ ] använd samma legality-matris från API, batch, import och intern runtime
- [ ] logga `ruleId`, `requiredApproval` och `requiredEvidence` för varje tillaten eller blockerad mutation
- [ ] se till att gamla runbooks aldrig för oversälja vad runtime faktiskt tillater

### Delfas 3.5 BAS/Chart Governance Hardening
- [ ] infor versionsstyrd kontokatalog med source reference, checksumma och diff
- [ ] separera officiell BAS-derivatkedja från engine-required konton och kundspecifika overrides
- [ ] bind journalrader till exakt `catalogVersionId`
- [ ] aligna dimensionnycklar och statusvarden mellan runtime och Postgres-schema
- [ ] verifiera att konto-klass och dimensionskrav inte kan muteras fel efter användning

### Delfas 3.6 Voucher/Journal Integrity Hardening
- [ ] bygg riskklassad approvalmatris per source type, belopp, periodstatus och correction-scope
- [ ] gör evidence refs obligatoriska för high-risk-postningar
- [ ] gör correction- och reversal-länkar förstaklassiga i journalmodellen
- [ ] verifiera att varje postad journal kan sparas till kalla, approver, idempotency key och evidence bundle

### Delfas 3.7 Immutability/Number-Series Hardening
- [ ] infor append-only voucher sequence ledger
- [ ] blockera mutation av `nextNumber`, `status`, `locked` och importsekvenspolicy efter första postade användning
- [ ] ta bort canonical delete för bokföringskritiska objekt
- [ ] blockera snapshot-import i protected/live för Domän 3
- [ ] verifiera att postad journal inte kan raderas eller omnumreras

### Delfas 3.8 Period-Lock/Close/Reopen/Year-End Hardening
- [ ] gör close utan legal-form-/reporting-obligation-binding blockerande
- [ ] bind reopen till correction-case, separat approver och impacted-artifact-lista
- [ ] bind close-state till year-end-transfer och exportbuild
- [ ] sakerstall att lockade perioder inte kan fa ny postning utan reopen-chain
- [ ] verifiera close -> reopen -> correction -> re-close med full audit trail

### Delfas 3.9 Opening-Balance/Result-Transfer Hardening
- [ ] bygg opening-balance artifact med source scope-hash och evidence refs
- [ ] bygg result-transfer och retained-earnings-transfer som egna artefakter i rätt ordning
- [ ] bind fiscal-year activation till full arsskifteskedja
- [ ] verifiera att dubbel opening balance blockeras och att retained earnings-transfer kraver föregående result-transfer

### Delfas 3.10 Depreciation-Method/Depreciation/Accrual Hardening
- [ ] publicera explicit metodregister för avskrivning och periodisering
- [ ] blockera otillåtna metodbyten och retroaktiva batchomrakningar utan correction chain
- [ ] gör batchar idempotenta och evidensbundna
- [ ] verifiera att varje batch pekar på kalla, metod, period och journal entry

### Delfas 3.11 Main-Ledger/Verification-List/Export-Package Hardening
- [ ] bygg immutable artifacts för huvudbok, verifikationslista, audit export och year-end package
- [ ] lagra included journal ids, sorteringsregel, scope-hash, checksumma och generated-by/generated-at
- [ ] sakerstall att samma scope alltid ger samma artifact-hash
- [ ] verifiera att revision och byrahandoff kan ske från artifacts i stallet för ra list-lasning

### Delfas 3.12 SIE Import/Export Hardening
- [ ] exportera verklig objektlista i `#TRANS` från `dimensionJson`
- [ ] bygg explicit importpolicy för kontoetablering: `match-only`, `allow-derived-create`, `manual-review-required`
- [ ] bind SIE-export till exakt fiscal-year-scope och journalmangd
- [ ] bygg roundtrip-evidence med checksumma och scope-hash
- [ ] verifiera objekt/dimensionsroundtrip och policylogg vid import

### Delfas 3.13 Retention/Archive/Delete Hardening
- [ ] ta bort `ON DELETE CASCADE` från bokföringskritiska kedjor
- [ ] ta bort generisk delete från canonical repositories för bokföringsobjekt
- [ ] infor retentionklass, legal hold och arkivstatus på journaler, snapshots och exportartefakter
- [ ] blockera purge när legal hold finns
- [ ] verifiera att bokföringsmaterial inte kan farsvinna genom teknisk delete

## Fas 4

### Delfas 4.1 Customer Masterdata Hardening
- [ ] bygg canonical `customer_party_identity` med normaliserat organisationsnummer, VAT-nummer och importalias
- [ ] blockera dubbla aktiva kunder med samma legal identity utan godkänd orsakskod
- [ ] infor `customer_merge_record` och `customer_split_record` med full audit trail
- [ ] infor styrda kontaktroller för billing, delivery, collections och refund
- [ ] infor verifierad billing-kanal och blockerflaggor för billing, delivery och collections

### Delfas 4.2 Quote / Contract / Billing-Trigger Hardening
- [ ] bygg `billing_obligation`, `billing_obligation_line` och `billing_consumption`
- [ ] bind varje issued invoice line till consumption record eller explicit `manual_ad_hoc`
- [ ] blockera dubbelkonsumtion av samma trigger-rad
- [ ] skilj readiness/simulation från legal-effect billing source
- [ ] bygg residualmodell för partial consumption och credit reopening

### Delfas 4.3 Invoice Timing / Content / Delivery Hardening
- [ ] separera `issue_date`, `tax_date`, `supply_date`, `delivery_date`, `prepayment_date` och `due_date`
- [ ] separera legal completeness från commercial completeness
- [ ] infor explicit legal scenario code för export, reverse charge, EU, HUS och momsbefrielse
- [ ] bygg `invoice_delivery_evidence` med dispatch id, provider payload och acceptance status
- [ ] blockera `delivered` på prepare-only delivery

### Delfas 4.4 Invoice Series And Lifecycle Hardening
- [ ] flytta nummerreservation till repository/sequence-lager i samma transaktion som issue/open-item/journal
- [ ] bygg separata statuskedjor för invoice, delivery, receivable och revenue
- [ ] infor `invoice_status_history` med actor, reason code och impacted artifacts
- [ ] infor imported sequence reservation och kollisionsregister
- [ ] verifiera replay-saker issue-idempotens under samtidighet

### Delfas 4.5 Credit-Note / Partial-Credit / Reversal Hardening
- [ ] infor `credit_adjustment`, `invoice_reversal` och `writeoff_reversal`
- [ ] tillat kredit av försäljning även när fakturan redan är helt eller delvis betald
- [ ] bygg residualkedja till kundkredit eller refund exposure
- [ ] blockera writeoff som surrogat för prisnedsattning eller vanlig kredit
- [ ] gör reversal till egen eventkedja, aldrig direkt mutation

### Delfas 4.6 Open-Item / Allocation / Prepayment / Overpayment / Refund Hardening
- [ ] infor `customer_prepayment` som kan uppsta utan open item
- [ ] infor `customer_credit_balance` för överbetalning och kreditresidual
- [ ] bygg `refund_request`, `refund_execution` och `refund_reconciliation`
- [ ] sluta använda unmatched receipt som surrogat för kundkredit
- [ ] gör nettoexponering mot kund beräkningsbar från open items, kundkrediter och refunds

### Delfas 4.7 Payment-Link / Matching / Unmatched-Receipt Hardening
- [ ] gör payment link till betalinitiering, inte settlement truth
- [ ] gör verifierat receipt-event till enda vagen till allocation och settlement
- [ ] uppratthall aktiv unik payment link per invoice och syfte i runtime
- [ ] bygg matchningsmotor med OCR, kundhint, valuta, historik och review queue
- [ ] sakerstall att osakra matchningar inte auto-settlar fakturor

### Delfas 4.8 Reminder-Fee / Late-Interest / Dunning / Aging Hardening
- [ ] bygg `dunning_rulepack`, `dunning_charge` och `late_interest_calculation`
- [ ] använd effective-dated referensränta per halvar
- [ ] krav verifierat avtalsstöd för påminnelseavgift
- [ ] bygg explicit B2B-farseningsersättning 450 kr när lagvillkoren är uppfyllda
- [ ] gör aging netto efter customer credits och refunds samt exkludera disputed/held items enligt policy

### Delfas 4.9 Revenue / Ledger / VAT Bridge Hardening
- [ ] externalisera account mapping per bolag och regelpack
- [ ] bygg explicita bryggor för prepayment, overpayment, customer credit, refund, bad-debt relief och bad-debt recovery
- [ ] använd legal scenario code i stallet för VAT-kodsubstrings
- [ ] sakerstall att varje ÄR-handelse har ledger- och VAT-effekt eller explicit `not_applicable`
- [ ] eliminera hardkodade ÄR-konton ur domänkoden

### Delfas 4.10 Project / Field / HUS Invoice Bridge Hardening
- [ ] gör project och field till producenter av auktoritativa billing obligations
- [ ] blockera issue av HUS-tagad faktura utan passerad HUS gate
- [ ] bygg explicita ÄR-events för HUS customer payment och HUS credit adjustment
- [ ] gör myndighetsutfall efter utbetalning till recovery/refund/customer-share-justering i ÄR
- [ ] bind project/HUS residualer till samma kundexponering som ÄR visar

### Delfas 4.11 Export / Evidence Hardening
- [ ] bygg first-class exports för invoices, open items, allocations, unmatched receipts, customer credits, refunds, dunning charges, delivery evidence och aging
- [ ] bygg cutoff-hash, included ids och ledger/VAT tie-out metadata
- [ ] sakerstall att samma cutoff och samma scope alltid ger samma export-hash
- [ ] bygg parallel-run diff artifact som pekar ut exakt avvikande post och orsak
- [ ] gör ÄR evidence package obligatoriskt före cutover och go-live

## Fas 5

### Delfas 5.1 Supplier Masterdata Hardening
- [ ] bygg canonical supplier identity med orgnr, VAT, bankrelation och importalias
- [ ] blockera dubbla leverantörer på legal identity eller skicka dem till conflict queue
- [ ] blockera supplier-arkivering när öppen AP-risk eller aktiv betalorder finns
- [ ] infor verifierad bankandring med payment block tills release
- [ ] gör counterparty type och tax profile explicit och versionsbar

### Delfas 5.2 Purchase-Order / Receipt Hardening
- [ ] tvinga ny PO till `draft`
- [ ] gör receipt-idempotens och correction chain first-class
- [ ] blockera overleverans utanför tolerans
- [ ] gör ordered, received och remaining quantities deterministiskt sparbara
- [ ] bygg receipt cancellation/reversal utan overwrite

### Delfas 5.3 Target-Type Routing Hardening
- [ ] bygg explicit routing för `expense`, `asset`, `inventory`, `project_material`
- [ ] lat target type styra coding defaults, dimensions, approval scope och posting recipe
- [ ] blockera icke-`expense` när downstream saknas
- [ ] förbjud tyst nedgradering till `expense`
- [ ] gör routing beslutbar och auditbar per receipt-rad

### Delfas 5.4 OCR / Document-Intake Hardening
- [ ] underordna hela delfasen `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md`; AP får konsumera scanningutfall men får inte aga OCR- eller AI-sanning
- [ ] gör AP-kritiska fält review-obligatoriska vid lag confidence eller svag lineage
- [ ] las en enda bindande OCR-baseline mellan runtime och runbooks
- [ ] gör OCR-rerun till versionskedja, aldrig mutation
- [ ] bygg capability-manifest med kostnads- och kvalitetsprofil
- [ ] blockera go-live av auto-AP-draft tills extraction boundary är hardnad

### Delfas 5.5 Classification / Review / Import-Case Hardening
- [ ] underordna document family, confidence, AI fallback och downstream owner under `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md`
- [ ] gör classification/review/import-case obligatoriska där policy kraver det
- [ ] blockera person-linked documents från vanlig AP utan explicit handoff
- [ ] gör import case till precondition får definierade tull-/importscenarier
- [ ] stoppa direct document ingest när required review/import saknas
- [ ] gör applied review/import effects sparbara till AP-fakturan

### Delfas 5.6 Supplier-Invoice-Ingest And Multi-Channel Duplicate Hardening
- [ ] lat duplicate-policy, source channel-taxonomi och OCR/providerlineage agas av scanninglagret; AP får bara konvertera godkända scanningresultat till AP-truth
- [ ] bygg hard duplicate-policy över OCR/inbox, e-post, API, partner, Peppol och migration
- [ ] sluta krava samma `documentHash` för hard duplicate
- [ ] ta bort fuzzy-autoaccept av leverantör från OCR counterparty
- [ ] gör source channel-taxonomi explicit för `ocr_inbox`, `email_attachment`, `migration`, `partner_api`, `import_repair`
- [ ] gör summary-line fallback blockerad tills manuell coding godkants

### Delfas 5.7 Credit-Note Hardening
- [ ] las en enda schema/runtime-modell för supplier credit notes
- [ ] stöd linked credit notes utan schemafel
- [ ] gör payment readiness/payability explicit för credits
- [ ] blockera credit notes från payment proposal
- [ ] stöd originalreferens eller uttrycklig policy för orelaterade leverantörskrediter

### Delfas 5.8 Matching / Tolerance / Variance Hardening
- [ ] flytta tolerance profiles från hardkodad konstant till persistenta effective-dated profiler
- [ ] gör quantityTolerancePercent verkligt verkstallande
- [ ] bygg first-class variances för quantity, price, total, date, coding och tax
- [ ] gör variance resolution, approval och reclose auditbara
- [ ] gör matchningsutfall datastyrt per bolag och period

### Delfas 5.9 Approval / SoD Hardening
- [ ] infor policy för preparer, approver, payment exporter, payment releaser och exception approver
- [ ] blockera self-approval och creator-to-payment-export under normal policy
- [ ] hoj approvalsteg vid riskklass, belopp eller leverantörstyp
- [ ] gör dual control obligatorisk för overrides
- [ ] bör hela approval chain i audit receipts

### Delfas 5.10 Date-Control Hardening
- [ ] separera `invoiceDate`, `postingDate`, `deliveryDate`, `taxPointDate`, `dueDate`, `receiptDate`, `paymentBookedOn`, `customsDate` och `fxRateDate`
- [ ] förbjud tyst kollaps av styrande datum
- [ ] lat VAT decision använda policy-rätt datum
- [ ] lat cash-method recognition styras av settlement-/bookingdatum
- [ ] stöd import- och tullscenarier med egna datumfalt

### Delfas 5.11 Posting / Open-Item / Payment-Preparation Hardening
- [ ] las ett enda schema/runtime-kontrakt för AP-open-items
- [ ] stöd signed credits eller separat credit-balance-modell fullt ut
- [ ] synka paymentReadiness och payability mellan runtime och DB
- [ ] gör `reserved`, `partially_paid`, `paid`, `returned`, `reopened` eller motsvarande samstammiga i runtime och DB
- [ ] eliminera schemafel för standardfaktura, credit note och reservation

### Delfas 5.12 Payment-Lifecycle / Settlement / Reopen Hardening
- [ ] bygg partial reserve och partial settle
- [ ] bygg partial return och reopen på residualbelopp
- [ ] stöd supplier refund/overpayment-path
- [ ] fixa cash-method reject path sa att den inte kraschar på null journal
- [ ] koppla settlement state till verklig open-item residual

### Delfas 5.13 Ledger / VAT / FX Bridge Hardening
- [ ] externalisera liability- och VAT-account mapping
- [ ] krav explicit goods/services i utlandsflöden och VAT-kritiska scenarier
- [ ] stöd domestic, EU goods, EU services, non-EU services, import goods och byggmoms
- [ ] skilj invoice rate från settlement rate
- [ ] gör realized FX korrekt även vid partial settlement

### Delfas 5.14 AI-Boundary Cost / Correctness Hardening
- [ ] hall AI som farslagsmotor, aldrig bokföringssanning
- [ ] infor tenant kill switch för AI-klassning
- [ ] använd deterministiska regler före AI när det racker
- [ ] gör AI-anrop auditbara med modell/version/kostnad
- [ ] blockera `safeToPost=true` för AI-only AP-beslut

### Delfas 5.15 Migration / Import-Intake Hardening
- [ ] bygg separata migration/intake-kanaler för supplier invoices
- [ ] gör invoice migration idempotent på batch- och objektniva
- [ ] bygg parallel-run diff för skuld, moms, payment hold/readiness och FX
- [ ] gör cutover rehearsal replaybar utan dubbletter
- [ ] gör source snapshot, duplicate decision och sign-off obligatoriska för migrerad AP-post

## Fas 6

### Delfas 6.1 VAT Rule / Scenario Hardening
- [ ] dela upp breda VAT-koder sa att exempt, zero-rated export, outside scope och ändra no-VAT-fall inte blandas i samma samlingskod
- [ ] flytta IOSS till egen importdistansforsäljningsmodell och blockera IOSS utan importflagga, goods-only och consignmentsgrans
- [ ] bind manuell VAT-review till samma compatibility-motor som automatisk derivation
- [ ] bygg kodgenererad scenario->box->reporting-channel-matris med legal basis per scenario
- [ ] blockera unsupported VAT-scenario från autoaccept

### Delfas 6.2 VAT Period / Frequency / Lock Governance Hardening
- [ ] bygg `VatFrequencyElection`, `VatFrequencyChangeRequest`, `VatPeriodProfile` och `VatPeriodLock`
- [ ] sluta lata VAT-perioder styras av fria datumintervall utan canonical frekvensprofil
- [ ] bygg historik och spärregler för frekvensbyte
- [ ] bygg unlock-policy som kraver correction governance, approval och evidence
- [ ] gör det möjligt att farklara varfor en viss momsperiod finns eller inte finns för ett bolag

### Delfas 6.3 Declaration / Periodic-Statement / Correction / Posting Hardening
- [ ] bygg immutable `VatSubmission`, `VatSubmissionVersion` och `VatSubmissionSupersedeLink`
- [ ] gör ersättningsdeklaration till ny full filingversion, aldrig mutation av gammal filing
- [ ] skilj filing state från posting state
- [ ] blockera `declared` utan faktisk submissionversion
- [ ] bygg diff, receiptkedja och supersede chain per period

### Delfas 6.4 Skatteverket Transport Hardening
- [ ] nedgradera nuvarande VAT-transport till sann klassning `prepared_only`
- [ ] bygg capabilityklassning `real_api | real_file | manual_controlled | prepared_only | stub`
- [ ] om live API saknas: bygg `manual_controlled` med exportartefakt, signeringsbevis, operatorssteg och receipt capture
- [ ] blockera falska `API`-/`XML fallback`-claims i capabilitynamn och docs
- [ ] knyt filingstatus till faktisk transportklass och faktisk receiptkedja

### Delfas 6.5 VAT Clearing / Reversal Hardening
- [ ] bind VAT-clearing till finaliserad filingversion och last period
- [ ] bygg `VatClearingRun` och `VatClearingReversal`
- [ ] blockera clearing mot preliminar eller blockerad filing
- [ ] gör reversal first-class med approval, reason code och lineage
- [ ] gör clearing idempotent per filingversion

### Delfas 6.6 Tax-Account Mirror / Reconciliation Hardening
- [ ] ta bort tax-account-sync från open-banking-provider och bygg separat skattekontoimportmodell
- [ ] bygg `TaxAccountImportBatch`, `TaxAccountEvent`, `ExpectedTaxLiability` och `TaxAccountMirrorJournal`
- [ ] gör liability-emission från VAT, payroll och HUS first-class
- [ ] blockera amount-only confidence som primär matchningsvag
- [ ] gör authority reference och source lineage obligatoriskt för spegelhandelser

### Delfas 6.7 Discrepancy-Case / Offset / Refund / Correction Hardening
- [ ] bygg `TaxAccountOffsetReversal` och `TaxAccountRefundDecision`
- [ ] las rulepack-prioritet och runtime-prioritet till samma ordning
- [ ] gör offset, reversal, refund och waiver till egna first-class handelser
- [ ] blockera stangning av discrepancy case utan resolution path
- [ ] bygg full correction chain för ett tax-account credit-event

### Delfas 6.8 Bank-Account / Provider Wiring Hardening
- [ ] bygg `ProviderCapabilityManifest` som skiljer security posture från live/legal readiness
- [ ] mark custom rails som interna tills verkliga railadapters finns
- [ ] behall stark secret-separation och masking för bankkonton
- [ ] blockera `supportsLegalEffectInProduction` utan verklig proof path
- [ ] rensa bort falska rail- och providerclaims från runtime och docs

### Delfas 6.9 Payment Proposal / Batch / Order / SoD Hardening
- [ ] bygg `PaymentApprovalPolicy`, `DutySeparationRule` och `PaymentSignatureSession`
- [ ] gör create, approve, export, sign, cancel och reopen tekniskt separerade
- [ ] blockera same-actor-kombinationer när policy kraver separation
- [ ] bind batchstatus till orderutfall och bankfeedback, inte bara till senaste kommando
- [ ] bör full actor chain i audit receipts

### Delfas 6.10 Payment Lifecycle / Cut-Off / Settlement Hardening
- [ ] bygg `PaymentExecutionWindow`, `PaymentExecutionEvent`, `PaymentSettlementEvent` och `PaymentReturnEvent`
- [ ] separera requested payment date, submission date, execution date och settlement date
- [ ] modellera cut-off, bankdag och partial settlement som first-class
- [ ] modellera returned/rejected payment med residual och ombokning
- [ ] blockera att `accepted_by_bank` eller delutfart flöde behandlas som full settlement

### Delfas 6.11 Statement Import / Reference-Matching / Reconciliation Hardening
- [ ] bygg `StatementImport`, `BankStatementLineIdentity`, `StructuredPaymentReference` och `BankReconciliationCase`
- [ ] infor first-class OCR/BG/PG/EndToEndId/entry refs
- [ ] ersätt tunn identity key med line-level identity och source-hash
- [ ] gör ambiguity till review case, inte auto-match
- [ ] gör same-file och cross-file replay idempotenta

### Delfas 6.12 Fee / Interest / Settlement Bridge Hardening
- [ ] harmonisera runtime och DB för statement categories och matchstatusar
- [ ] bygg `StatementPostingApproval`, `StatementPostingJournalLink` och `TaxAccountStatementBridge`
- [ ] gör bankavgift, ränta och settlement roundtrippbara efter persistens
- [ ] blockera journalposting utan approval
- [ ] sakra att samma statementevent inte kan skapa dubbel journal eller dubbel tax-account-bridge

### Delfas 6.13 FX / Exchange-Rate / Date-Control Hardening
- [ ] bygg `DateControlProfile`, `FxSource`, `FxRateLock` och `CrossDomainDateTrace`
- [ ] gör controlling date explicit för VAT, tax-account, bank och ledger
- [ ] bygg canonical rate sourcing för OSS/IOSS och ändra VAT-/bank-/skattekontokansliga flöden
- [ ] blockera retroaktiv kursandring utan correction lineage
- [ ] gör samma affärshandelse sparbar över document date, posting date, tax date, payment date, settlement date och declaration date

### Delfas 6.14 Transport / API / File / Manual Runtime Hardening
- [ ] bygg sann capabilitykatalog för VAT-, tax-account- och bankingtransport
- [ ] mark varje capability som `real_api`, `real_file`, `manual_controlled`, `prepared_only` eller `stub`
- [ ] gör manual paths receipt- och evidence-styrda
- [ ] blockera alla falska live claims i operatorvy, docs och go-live gates
- [ ] gör det möjligt att visa en full runtime-statusmatris för extern granskare

## Fas 7

### Delfas 7.1 Inbox / Email-Ingest Hardening
- [ ] bygg `InboxTransportReceipt`, `InboundMailProviderProfile`, `InboundMessageEnvelope` och `InboundMessageAcquisition`
- [ ] skilj verklig mailprovider från `internal_intake_api`
- [ ] bind varje meddelande till ramailreceipt och acquisition source
- [ ] blockera att intern POST-ingest presenteras som live mailtransport
- [ ] verifiera att samma ramail inte kan sakna acquisition lineage

### Delfas 7.2 Attachment / Malware / Quarantine Hardening
- [ ] bygg `AttachmentScanReceipt`, `AttachmentThreatAssessment`, `AttachmentContainerInspection`, `QuarantineDecision`
- [ ] gör scanner provider/version/verdict obligatoriska
- [ ] förbjud default `clean`
- [ ] blockera encrypted archive, nested archive och archive bomb som vanliga attachments
- [ ] verifiera att dokument inte kan skapas från attachment utan clean receipt

### Delfas 7.3 Source-Fingerprint / Duplicate / Chain-Of-Custödy Hardening
- [ ] bygg `MessageIdentity`, `AttachmentIdentity`, `DocumentIdentity`, `DuplicateDecision`, `ProvenanceReceipt`
- [ ] infor multikanals dedupe över message-id, raw mail hash, attachment identity och document identity
- [ ] gör sender/inbound provenance obligatorisk i inboxvagen
- [ ] skilj teknisk avsandarsignal från affärsverifiering
- [ ] gör duplicate lineage append-only och auditbar

### Delfas 7.4 Original-Binary / Hash / Provenance Hardening
- [ ] bygg `ContentIdentityRecord`, `StorageReceipt`, `HashPolicy`, `HashRotationRecord`, `OriginalBinaryCapture`
- [ ] beräkna hash i plattformen från faktiska bytes
- [ ] lagra `hashAlgorithm`, `hashVersion`, `capturedAt`, `capturedBy`, `storageReceiptRef`
- [ ] blockera callerstyrd originalhash och storlek i skyddade lagen
- [ ] verifiera att storage migration inte bryter content identity

### Delfas 7.5 Document-Record / Version-Chain / Redaction / Export Hardening
- [ ] bygg `DocumentChainStatus`, `DocumentVariantPolicy`, `RedactionVariant`, `DocumentExportPackage`, `DocumentExportManifest`
- [ ] infor canonical variant registry inklusive `redaction`
- [ ] blockera mutation av original vid redaction
- [ ] blockera export utan manifest och chain completeness där policy kraver det
- [ ] verifiera att exportmanifest listar alla artefakter och checksummor

### Delfas 7.6 OCR Runtime / Callback / Capability Hardening
- [ ] bygg `OcrCapabilityRecord`, `OcrProviderReceipt`, `OcrCallbackProfile`, `OcrProviderAuthPolicy`
- [ ] nedgradera nuvarande Google Document AI-provider till sann klassning `stub` eller `fake_live`
- [ ] separera providercallback från användarsession
- [ ] fanga provider request/response receipts och baseline refs
- [ ] blockera alla live claims utan verklig adapter och authmodell

### Delfas 7.7 OCR Threshold / Rerun / Review-Task Hardening
- [ ] bygg `OcrThresholdPolicy`, `ReviewRequirementDecision`, `ReviewTaskLifecycle`, `OcrRerunDecision`
- [ ] infor full `claim -> correct -> approve | reject | requeue`
- [ ] bind reviewkrav till policyversion, field confidence och classification confidence
- [ ] gör rerun lineage first-class
- [ ] verifiera att low confidence inte kan glida igenom utan review

### Delfas 7.8 Classification / Extraction / Search-Boundary Hardening
- [ ] bygg `ClassificationPolicyRecord`, `ExtractionLineageRecord`, `SearchExposureProfile`, `ReviewQueueRegistry`, `DispatchIntent`
- [ ] las canonical queue codes och ta bort drift mellan `FINANCE_REVIEW` och ändra varianter
- [ ] gör extraction lineage obligatorisk för kritiska fält
- [ ] bind search masking och export exposure till samma policy
- [ ] verifiera att dispatch intent inte kan ske utan canonical queue och lineage

### Delfas 7.9 Review-Center / Decision-Effect Hardening
- [ ] bygg `ReviewDecisionEffect`, `ReviewOutcomeReceipt`, `ReviewRequeueReason`, `ReviewEscalationReceipt`, `ReviewCloseReceipt`
- [ ] gör decision effects obligatoriska för finala utfall
- [ ] blockera close utan full effect record
- [ ] gör reject, escalate och close fullt receipt- och auditstyrda
- [ ] verifiera SLA breach, close och effect lineage

### Delfas 7.10 Import-Case / Cross-Domain Link Hardening
- [ ] bygg `ImportApplyExecution`, `ImportApplyReceipt`, `DownstreamCommandDispatch`, `ImportApplyFailure`, `TargetObjectSnapshot`
- [ ] ersätt metadata-only apply med verklig downstream command dispatch
- [ ] bind apply till target snapshot och downstream receipt
- [ ] gör apply replay-sakert på execution receipt
- [ ] verifiera att applicerat importcase verkligen skapar maldomänsobjekt

### Delfas 7.11 Evidence-Bundle / Snapshot / Export / Manifest Hardening
- [ ] bygg `EvidenceExportPackage`, `EvidenceExportManifest`, `EvidenceArtifactDigest`, `EvidenceVerificationReceipt`, `EvidenceArchiveLineage`
- [ ] skilj intern freeze/checksumma från extern exportverifiering
- [ ] gör manifest med artifactlista, checksummor, refs och export actor obligatoriskt
- [ ] bygg offline verify
- [ ] verifiera att extern part kan kontrollera bundle utan intern stateatkomst

### Delfas 7.12 Retention / 7-Year / Legal-Hold / Deletion Hardening
- [ ] bygg `RetentionPolicyRecord`, `RetentionSchedule`, `LegalHoldRecord`, `DeletionCase`, `ArchiveDisposition`, `RetentionBlockReason`
- [ ] gör retention class obligatorisk för bokföringsnara och reglerade dokument
- [ ] bygg verklig legal hold och delete blocking
- [ ] gör `deletion_pending` och `deleted` till riktiga transitions med approvals och receipts
- [ ] verifiera 7-arsbevarande mot BFL/BFN

### Delfas 7.13 Security-Classification / Access / Redaction Hardening
- [ ] bygg `DocumentAccessPolicy`, `DocumentExposureBoundary`, `DocumentExportProfile`, `SupportDocumentView`, `RedactionReleaseApproval`
- [ ] bind sak, read och export till samma policy
- [ ] las supportexporter till maskad profil eller redactionvariant
- [ ] infor reveal/release-gate där policy kraver det
- [ ] verifiera att support/export inte kringgor masking eller holds

### Delfas 7.14 Runbook / Legacy-Doc / False-Claim Cleanup Hardening
- [ ] arkivera:
  - `docs/runbooks/ocr-malware-scanning-operations.md`
  - `docs/runbooks/evidence-bundle-export.md`
  - `docs/policies/data-retention-gdpr-and-legal-hold-policy.md`
  - `docs/runbooks/support-backoffice-and-audit-review.md`
  - `docs/runbooks/fas-2-company-inbox-verification.md`
  - `docs/runbooks/fas-2-ocr-review-verification.md`
  - `docs/runbooks/fas-2-document-archive-verification.md`
- [ ] skriv om:
  - `docs/runbooks/inbound-email-inbox-setup.md`
  - `docs/runbooks/import-case-review.md`
  - `docs/runbooks/review-center-operations.md`
  - `docs/runbooks/document-person-payroll-incident-and-repair.md`
- [ ] ta bort falska live claims om OCR, malware scanning, evidence export och legal hold från kvarvarande dokument
- [ ] verifiera att rebuild-dokumenten är enda sanning för Domän 7

## Fas 8

### Delfas 8.1 Employee-master and employment-scope hardening
- [ ] infor `Employee`, `EmployeeIdentity`, `EmployeeAlias`, `EmploymentTruth`, `LegalConcurrencyProfile`, `EmploymentTruthStatus`
- [ ] gör `legalEmployerId`, `employmentStatus`, `payrollEligibility`, `orgUnitId`, `workplaceId`, `managerChainRef`, `validFrom`, `validTo`, `supersedesRef` obligatoriska
- [ ] ersätt `readyForPayrollInputs` med blockerande `employmentTruthStatus`
- [ ] skriv om `packages/db/migrations/20260321170000_phase7_hr_master.sql`
- [ ] skriv om `tests/unit/hr-phase7-1.test.mjs`
- [ ] arkivera `docs/runbooks/fas-7-hr-master-verification.md`
- [ ] verifiera overlap deny/allow med explicit concurrency profile
- [ ] verifiera att varje aktiv anstallning kan harledas till legal employer och workplace

### Delfas 8.2 Employment-contract/addendum/lifecycle hardening
- [ ] infor `EmploymentContract`, `EmploymentAddendum`, `EmploymentLifecycleEvent`, `RetroactiveEmploymentChangeRequest`
- [ ] bygg command-only lifecycle för `start`, `extend`, `supersede`, `terminate`, `reopen`, `retroactively_amend`
- [ ] knyt signed document refs och evidence refs till varje kontraktsfarandring
- [ ] skriv om `packages/domain-hr/src/index.mjs`
- [ ] skriv om `tests/integration/phase7-hr-master-api.test.mjs`
- [ ] skriv om `docs/runbooks/hr-masterdata-cutover.md`
- [ ] verifiera att retroaktiv ändring efter freeze kraver correction lane
- [ ] verifiera full versionskedja per contract/addendum

### Delfas 8.3 Placement/salary-basis/manager/payout-account hardening
- [ ] infor `EmploymentPlacement`, `SalaryBasisDecision`, `ManagerAssignmentGraph`, `EmploymentPayoutInstruction`
- [ ] ersätt employee-owned bankkonto som laneinstruktion
- [ ] infor effect-date, activation window, cutoff guard, step-up och dual control för payout
- [ ] skriv om `packages/domain-hr/src/index.mjs`
- [ ] skriv om `apps/api/src/server.mjs`
- [ ] verifiera managerkedja per historiskt datum
- [ ] verifiera blockerad eller framtidsdaterad payout-aktivering nara cutoff

### Delfas 8.4 Time-entry/schedule/night-shift/DST/approved-set/period-lock hardening
- [ ] infor first-class `ApprovedTimeSet` och `ApprovedTimeSetLock`
- [ ] blockera schedule overlaps eller infor supersession-policy
- [ ] modellera nattpass, lokal tidszon, dygnsgrans och DST explicit
- [ ] skriv om `packages/domain-time/src/index.mjs`
- [ ] skriv om `packages/db/migrations/20260321180000_phase7_time_reporting_schedules.sql`
- [ ] skriv om `tests/unit/time-phase7-2.test.mjs`
- [ ] arkivera `docs/runbooks/fas-7-time-reporting-verification.md`
- [ ] verifiera att payroll snapshot avvisar olasta approved sets
- [ ] verifiera DST- och cross-midnight-vektorer

### Delfas 8.5 Absence/leave-signal/correction/reopen/portal hardening
- [ ] infor `AbsenceRequest`, `AbsenceDecision`, `LeaveSignalLock`, `AbsenceCorrectionCase`
- [ ] separera portalrequest från payroll-klar frånvarosanning
- [ ] infor overlap-engine mellan leave och time
- [ ] skriv om `packages/domain-time/src/index.mjs`
- [ ] skriv om `packages/db/migrations/20260321190000_phase7_absence_portal.sql`
- [ ] skriv om `tests/unit/time-phase7-3.test.mjs`
- [ ] skriv om `tests/integration/phase7-absence-api.test.mjs`
- [ ] arkivera `docs/runbooks/fas-7-absence-portal-verification.md`
- [ ] verifiera att portal inte kan skapa payroll-ready frånvaro
- [ ] verifiera correction/reopen som ny version, inte overwrite

### Delfas 8.6 Termination/final-period/final-freeze hardening
- [ ] infor `TerminationDecision`, `FinalPeriodPolicy`, `FinalFreezeRecord`
- [ ] bind termination till sista attestperiod och final pay-input freeze
- [ ] skriv om `packages/domain-hr/src/index.mjs`
- [ ] skriv om `packages/domain-time/src/index.mjs`
- [ ] skriv om `packages/domain-payroll/src/index.mjs`
- [ ] skriv om `docs/runbooks/hr-time-cutover.md`
- [ ] verifiera att avslutad employment inte kan återaktiveras implicit
- [ ] verifiera att sena ändringar gör till correction lane

### Delfas 8.7 Balance-type/account/vacation-profile hardening
- [ ] infor owner-styrda `BalanceAccount` och svensk `VacationProfile`
- [ ] separera paid, unpaid, saveable, saved och expiring semantics
- [ ] skriv om `packages/domain-balances/src/engine.mjs`
- [ ] skriv om `packages/db/migrations/20260324160000_phase17_balances.sql`
- [ ] skriv om `tests/unit/phase17-balances.test.mjs`
- [ ] arkivera `docs/runbooks/fas-10-3-vacation-balances-verification.md`
- [ ] verifiera separata vacationsaldon per employment

### Delfas 8.8 Carry-forward/expiry/vacation-year-close hardening
- [ ] infor `VacationYearCloseRun`, `CarryForwardDecision`, `ExpiryDecision`
- [ ] skriv om year-close enligt svensk semesterlag
- [ ] gör close-run idempotent och evidence-bunden
- [ ] skriv om `packages/domain-balances/src/engine.mjs`
- [ ] skriv om `tests/unit/phase17-balances.test.mjs`
- [ ] skriv ny runbook för vacation year close och balance repair
- [ ] verifiera 20-dagarsgolv, spärregler och replay guard

### Delfas 8.9 Identity-merge/split/immutable-employment hardening
- [ ] infor `IdentityMergeDecision`, `IdentitySplitDecision`, `EmployeeAliasGraph`
- [ ] gör `employmentId` immutabelt över merge/split
- [ ] skriv om `packages/domain-hr/src/index.mjs`
- [ ] skriv om `tests/unit/hr-phase7-1.test.mjs`
- [ ] skriv ny runbook för people merge/split
- [ ] verifiera alias lookup och immutable refs efter merge

### Delfas 8.10 Payroll-input snapshot/people-time-base hardening
- [ ] gör `PayrollInputSnapshot` till explicit artifact över locked refs
- [ ] gör `PeopleTimeBase` till read-model, aldrig source of truth
- [ ] blockera fallback till tunn HR/time-bas i protected/live
- [ ] skriv om `packages/domain-time/src/index.mjs`
- [ ] skriv om `packages/domain-payroll/src/index.mjs`
- [ ] skriv om `tests/unit/phase11-payroll-input-snapshots.test.mjs`
- [ ] skriv om `tests/unit/phase20-people-time-base.test.mjs`
- [ ] arkivera `docs/runbooks/payroll-input-snapshots-verification.md`
- [ ] verifiera fingerprint stability och locked-ref enforcement

### Delfas 8.11 People migration intake/diff/cutover hardening
- [ ] infor `PeopleMigrationBatch`, `EmployeeMigrationSnapshot`, `EmploymentMigrationSnapshot`, `PeopleMigrationDiff`, `PeopleCutoverDecision`
- [ ] gör diff entity-aware per employee, employment, balance type, YTD source, absence source och time source
- [ ] bind cutover-gate till canonical diff-set och signoff
- [ ] skriv om `packages/domain-core/src/migration.mjs`
- [ ] skriv om `tests/unit/phase19-payroll-migration.test.mjs`
- [ ] skriv om `tests/integration/phase19-payroll-migration-api.test.mjs`
- [ ] skriv om `tests/e2e/phase19-payroll-migration-flow.test.mjs`
- [ ] arkivera `docs/runbooks/payroll-migration-cutover.md`
- [ ] arkivera `docs/runbooks/fas-14-migration-go-live-verification.md`
- [ ] skriv om `docs/runbooks/hr-masterdata-cutover.md`
- [ ] skriv om `docs/runbooks/hr-time-cutover.md`
- [ ] skriv om `docs/runbooks/migration-cutover.md`
- [ ] skriv om `docs/runbooks/migration-cutover-concierge.md`
- [ ] skriv om `docs/runbooks/pilot-migration-and-cutover.md`
- [ ] verifiera blockerad cutover på öppen people-diff

### Delfas 8.12 Security/privacy/masked-support/read-audit hardening
- [ ] infor `SensitiveReadReceipt`, `HrRevealGrant`, `MaskedHrProjection`
- [ ] gör masked-by-default till standard för HR/payrollnara supportread
- [ ] infor reveal workflow med reason code, step-up, TTL, watermark och read receipt
- [ ] skriv om `packages/domain-hr/src/index.mjs`
- [ ] skriv om `apps/api/src/server.mjs`
- [ ] skriv om `apps/api/src/platform-method-intents.mjs`
- [ ] skriv om `apps/api/src/route-contracts.mjs`
- [ ] skriv ny runbook för HR-sensitive read and reveal
- [ ] verifiera masked support view, reveal TTL och append-only read receipts

### Fas 8 exit gates
- [ ] `EmploymentTruth` är entydig, effective-dated och legal-employer-bunden
- [ ] contracts och addenda är lifecycle-styrda och auditbara
- [ ] payout instructions är employment-bundna, effect-dated och step-up-styrda
- [ ] payroll laser bara locked approved time, versionerade absence decisions och verifierade balances
- [ ] termination och final freeze blockerar sena mutationer utan correction lane
- [ ] vacation profile, carry-forward, expiry och year close följer svensk semesterlogik
- [ ] people migration diff är entity-aware och blockerar cutover vid oklara avvikelser
- [ ] kansliga HR/payroll reads är masked-by-default och read-auditade

### Fas 8 test gates
- [ ] overlap-vectors för employments, placements, managerkedjor och schedules
- [ ] retroaktiva HR-ändringar efter freeze
- [ ] cross-midnight-, timezone- och DST-vectors
- [ ] leave/time-overlap, reopen och correction-vectors
- [ ] termination/final-freeze-vectors
- [ ] vacation carry-forward-, expiry- och year-close-vectors
- [ ] immutable snapshot- och alias/merge-vectors
- [ ] entity-aware people migration diff- och cutover-vectors
- [ ] support masking, reveal och read-audit-vectors

## Fas 9

### Delfas 9.1 Agreement family/version/catalog truth hardening
- [ ] infar `AgreementFamily`, `AgreementVersion`, `AgreementCatalogEntry` och `AgreementPublicationReceipt` som canonical objekt
- [ ] ersätt direkt `active`/`published` med state machines `draft -> compiled -> review_pending -> approved -> published`
- [ ] blockera publicering utan compile receipt, coverage receipt och review decision
- [ ] skriv om `packages/domain-collective-agreements/src/engine.mjs`
- [ ] skriv om `packages/db/migrations/20260324170000_phase18_collective_agreements.sql`
- [ ] skriv om `tests/unit/phase18-collective-agreements.test.mjs`
- [ ] arkivera `docs/runbooks/collective-agreement-activation.md`
- [ ] verifiera att varje dropdownrad kan harledas till exakt version och source receipt

### Delfas 9.2 Effective-dating/overlap/supersede hardening
- [ ] infar `VersionSupersessionPlan`, `AgreementEffectiveWindow` och `AgreementWindowConflict`
- [ ] blockera alla dolda overlap och gap
- [ ] lagra `supersedesVersionId` och `replacedByVersionId`
- [ ] bygg split-period-policy när versionbyte sker mitt i laneperiod
- [ ] verifiera att overlappande versioner nekas
- [ ] verifiera att supersession receipt skrivs deterministiskt

### Delfas 9.3 Assignment/employment-binding hardening
- [ ] infar `AgreementBindingDecision` som grund får assignment
- [ ] bind assignment till employment class, legal employer och kollektivavtalsklass
- [ ] bygg review-triggad rebinding när employment truth ändras
- [ ] skriv om HR- och agreement-kopplingen där den idag är tunn
- [ ] verifiera att assignment kan motiveras av binding decision

### Delfas 9.4 Local-supplement hardening
- [ ] ersätt `localAgreementSupplementIdByVersion` med first-class supplement per scope
- [ ] bygg separata supplement-ids får olika employments/scopes
- [ ] blockera supplement utanför eget datumfanster
- [ ] infar supplement-lifecycle `draft -> review_pending -> approved -> active -> superseded`
- [ ] skriv regressionsfall får den verifierade overwrite-buggen
- [ ] skriv regressionsfall får supplement som lacker efter `effectiveTo`

### Delfas 9.5 Override/exception governance hardening
- [ ] ersätt direkt override-create med request/approve/activate-kedja
- [ ] ta bort fri JSON som live payload
- [ ] blockera self-approval och krav second approver
- [ ] krav step-up/fresh trust får high-risk overrides
- [ ] skriv om `apps/api/src/phase14-collective-agreements-routes.mjs`
- [ ] verifiera att samma actor inte kan begara och godkänna override

### Delfas 9.6 Intake/extraction/review/publication hardening
- [ ] infar `AgreementSourceArtifact`, `AgreementIntakeExtraction` och `AgreementReviewDecision`
- [ ] stoppa direktpublicering från request-body `ruleSet` och `overlayRuleSet`
- [ ] bygg separata publiceringsgater får `catalog` och `local_supplement`
- [ ] skriv om `docs/runbooks/collective-agreement-intake.md`
- [ ] verifiera att review utan extraction receipt blockeras

### Delfas 9.7 Agreement-source parsing/normalization hardening
- [ ] bygg parser/normalizer/compiler från signed agreement artifact till canonical clauses
- [ ] infar `AgreementClauseExtractionArtifact`, `CanonicalAgreementClause` och `AgreementCompilationReceipt`
- [ ] stoppa alla sidokanaler som hoppar direkt till karbar overlay
- [ ] skriv nya compiler-moduler under `packages/domain-collective-agreements/src/`
- [ ] verifiera deterministisk compile output får samma artifact checksum

### Delfas 9.8 Clause-coverage/unsupported-clause hardening
- [ ] infar `AgreementClauseCoverage`, `UnsupportedAgreementClause` och `AgreementCoverageReceipt`
- [ ] gar unsupported clauses blockerande får publish och go-live
- [ ] gar coverage summary synlig i backoffice och audit
- [ ] skriv tester får `unsupported`, `partial` och `supported`
- [ ] verifiera att repo:t inte längre kan pasta stöd utan matbar coverage

### Delfas 9.9 Executable-overlay/rate-component hardening
- [ ] ersätt tunn JSON-overlay med typed compiled overlay
- [ ] bygg `AgreementRateComponent` och `AgreementConflictDiagnostic`
- [ ] stöd intervall, trasklar, tidsband och typed precedence
- [ ] blockera tyst `Object.assign` som conflict policy
- [ ] verifiera compiled hash och diagnostics

### Delfas 9.10 Pay-component execution hardening
- [ ] infar `AgreementPayComponentExecution` och `AgreementBasisSnapshot`
- [ ] materialisera agreement-driven lines via explicit execution step fare `createPayLine(...)`
- [ ] blockera unknown basis code och saknad quantity source
- [ ] skriv om payrolls agreement-consumer-paths
- [ ] verifiera execution receipts får OVERTIME, OB, JOUR, STANDBY, VACATION_SUPPLEMENT och pension additions

### Delfas 9.11 Payroll/time-consumption and event-date hardening
- [ ] bygg gemensam `AgreementResolutionService`
- [ ] ersätt `period.endsOn`-resolution i payroll med event-scoped resolution
- [ ] lat time och payroll använda samma resolution algorithm
- [ ] blockera single-overlay-per-period när flera resolution windows finns
- [ ] verifiera split-period där version eller supplement byts mitt i perioden

### Delfas 9.12 Payslip-traceability/explainability hardening
- [ ] infar `AgreementLineTrace` och `AgreementExplainabilityView`
- [ ] lagg `agreementVersionId`, `assignmentId`, `supplementId`, `overrideId`, `clauseCode`, `basisSnapshotRef` och `executionRef` på agreement-driven lines
- [ ] blockera godkänd lanekarning utan line trace
- [ ] bygg maskad supportvy och full auditvy
- [ ] verifiera full rad-får-rad-farklaring får support, revisor och kund

### Delfas 9.13 Golden-scenario and expected-outcome hardening
- [ ] bygg `AgreementGoldenScenario` och `AgreementExpectedOutcome`
- [ ] krava golden scenarios per publicerad version och clause family
- [ ] lagg till scenarios får split-period, supplementslut, override, pension additions och vacation supplement
- [ ] gar golden scenarios till publish-gate
- [ ] verifiera att nytt scenario receipt skapas vid rerun

### Delfas 9.14 Retro/delta/correction hardening
- [ ] bygg `AgreementRetroImpactCase` och `AgreementDeltaComputation`
- [ ] skapa delta lines i stallet får tyst omskrivning av historiska payslips
- [ ] bind retroaktiv avtalsandring till correction chain och review
- [ ] verifiera att historisk payslip farblir immutabel

### Delfas 9.15 Durable persistence/audit/replay hardening
- [ ] bygg riktig store-adapter och full persistent modell får alla agreement-objekt
- [ ] infar `AgreementMutationJournalEntry`
- [ ] gar protected/live-start blockerad utan agreement-repository
- [ ] verifiera restart, replay och idempotent mutation lineage

### Delfas 9.16 Backoffice/security/SoD/audit hardening
- [ ] dela upp permissions får read, publish, supplement, override-request, override-approve och retro-correction
- [ ] krav strong MFA och fresh trust får high-risk writes
- [ ] vattenmark och auditera alla high-risk actions
- [ ] skriv om `apps/api/src/route-contracts.mjs` och `apps/api/src/surface-policies.mjs`
- [ ] verifiera masked support read och dual-control deny

### Delfas 9.17 Seed/bootstrap/fake-live removal hardening
- [ ] isolera seedade demoavtal till test-only fixtures
- [ ] blockera seed bootstrap i protected/live
- [ ] arkivera eller ta bort `packages/db/seeds/20260324170010_phase18_collective_agreements_seed.sql` från livekedjan
- [ ] verifiera att varje live-avtal kommer från riktig publication path

### Delfas 9.18 Migration/snapshot-consistency hardening
- [ ] bygg first-class importobjekt får agreement history och mapping receipts
- [ ] ersätt last `agreementSnapshot` i migration med canonical agreement mapping
- [ ] skriv om `packages/domain-import-cases/src/index.mjs` och `tests/e2e/phase19-payroll-migration-flow.test.mjs`
- [ ] blockera cutover när agreement snapshot saknar canonical mapping
- [ ] verifiera att imported agreement history kan resolvas per datum
## Fas 10

### Delfas 10.1 Pay item / calendar / pay run / final pay hardening
- [ ] ersätt `finalPayAdjustments[]` som payrolltruth med `FinalPayCase`
- [ ] bygg `PayRun` state machine `draft -> calculated -> approved -> posted -> payout_prepared -> paid | corrected | reversed`
- [ ] bygg `PayRunFingerprint` som blockerande grund får calculate/post/correct
- [ ] bygg `FinalPayFreeze`, `FinalPaySettlementLine` och `BenefitsStopDecision`
- [ ] skriv om `packages/domain-payroll/src/index.mjs`
- [ ] skriv om DB-statusar i `packages/db/migrations/20260321200000_phase8_payroll_core.sql`
- [ ] blockera ordinary pay run från att maskera final pay
- [ ] verifiera final pay, correction lineage och posted/paid state

### Delfas 10.2 Tax table / tax decision / engångsskatt / SINK / A-SINK hardening
- [ ] ta bort `manual_rate` som normal live-vag får ordinary tax
- [ ] bygg canonical tax-mode-model får `ordinary_table`, `engangsskatt`, `jamkning_fixed`, `jamkning_percentage`, `sink`, `a_sink`
- [ ] bygg `TaxDecisionSnapshot` med evidence ref, rulepack checksum, municipality, table och column
- [ ] skriv om `packages/domain-payroll/src/index.mjs`
- [ ] skriv om schema i `packages/db/migrations/20260321210000_phase8_payroll_tax_agi.sql`
- [ ] bind AGI-semantik till tax mode och beslutstyp
- [ ] verifiera 2026 official vectors mot Skatteverket

### Delfas 10.3 Employer contribution / age transition hardening
- [ ] bygg `EmployerContributionRulepackVersion`
- [ ] bygg `EmployerContributionDecisionSnapshot` med legal basis och eligibility profile
- [ ] las rate och threshold till pinned official sources
- [ ] verifiera 67+, youth, 1937-or-earlier och växa
- [ ] verifiera mid-year age transitions från rätt datum
- [ ] skriv om contribution governance i `packages/domain-payroll/src/index.mjs`

### Delfas 10.4 Benefits / travel / pension / salary exchange classification hardening
- [ ] ersätt `manual_taxable_value` som normal live-vag i benefits
- [ ] bygg `BenefitValuationDecision`, `TravelTaxRulepackVersion`, `PensionContributionProfile`, `SalaryExchangeAgreement`
- [ ] separera taxable benefits från tax-free reimbursements i canonical model
- [ ] flytta special payroll tax får pension till pinned rulepack
- [ ] skriv om `packages/domain-benefits/src/index.mjs`
- [ ] skriv om `packages/domain-travel/src/index.mjs`
- [ ] skriv om `packages/domain-pension/src/index.mjs`
- [ ] verifiera bilfarman, drivmedel, sjukvardsfarsakring, friskvard, traktamente och mileage

### Delfas 10.5 Sick pay / qualifying deduction / vacation hardening
- [ ] bygg `SickPayDecisionTrace`, `QualifyingDeductionTrace`, `VacationDecisionTrace`, `VacationLiabilitySnapshot`
- [ ] knyt leave truth, schedule truth, agreement truth och payroll lines till samma lineage
- [ ] sakra semesterersättning i final pay
- [ ] skriv om explainability får sjuklan och semester i payroll
- [ ] verifiera sjuklanelagen och semesterlagen mot runtime

### Delfas 10.6 Negative net pay / employee receivable hardening
- [ ] exponera `SignedNetPayView` sa att negativ nettolan inte doljs
- [ ] bygg `EmployeeReceivable`, `ReceivableSettlementPlan`, `ReceivableOffsetDecision`, `ReceivableWriteOffDecision`
- [ ] las offset-prioritet, aging och stop-regler
- [ ] skriv om receivable projections och APIs
- [ ] verifiera multi-run settlement, offset och write-off-governance

### Delfas 10.7 Returned salary payment / bank return hardening
- [ ] bygg `ReturnedSalaryPayment`, `PayrollBankReturn`, `PayoutFailureDecision`, `RepayoutRequest`
- [ ] koppla bankretur till original payout batch och original employee line
- [ ] bygg canonical receivable-, suspense- och repayout-paths
- [ ] skriv om payroll/banking-bridge sa att payroll äger sin returtruth
- [ ] verifiera return-to-receivable och return-to-repayout

### Delfas 10.8 Garnishment / remittance hardening
- [ ] bygg `GarnishmentDecisionSnapshot`, `GarnishmentPriorityProfile`, `GarnishmentRemittance`, `GarnishmentReturnCase`
- [ ] isolera `manual_override` till emergency-lane med dual review
- [ ] las farbehallsbelopp och prioritetsordning mot official baseline
- [ ] skriv om garnishment governance i `packages/domain-payroll/src/index.mjs`
- [ ] verifiera prioritet, remittance, return och correction

### Delfas 10.9 AGI build / field mapping / correction / submission hardening
- [ ] ersätt bucket-baserad `agi_mapping_code` med full `AgiFieldMappingBaseline`
- [ ] bygg `AgiSubmission`, `AgiSubmissionVersion`, `AgiCorrectionCase`, `AgiReplacementReference`, `AgiRemovalReference`
- [ ] bygg riktig provider-backed live submit genom regulated submissions
- [ ] skriv om `packages/domain-payroll/src/index.mjs`
- [ ] skriv om `packages/db/migrations/20260321210000_phase8_payroll_tax_agi.sql`
- [ ] verifiera faltkod, ruta, correction, ready-för-sign, receipt och submit

### Delfas 10.10 Payroll posting / payout / bank match / BAS hardening
- [ ] ersätt grov placeholder cleanup-mapping med regelstyrd `PayrollPostingProfile`
- [ ] bygg rail-specifik `PayrollPayoutBatch`
- [ ] bygg `PayrollBankMatch` med mismatch- och repair-path
- [ ] skriv om `packages/db/migrations/20260325033000_phase8_payroll_placeholder_cleanup.sql`
- [ ] skriv om payout export i `packages/domain-payroll/src/index.mjs`
- [ ] verifiera svenska BAS-lanekonton och svensk banklanefil

### Delfas 10.11 Payroll input snapshot / dependency consumption hardening
- [ ] bygg `PayrollInputConsumptionTrace`
- [ ] knyt HR, time, leave, balances, agreements, benefits, travel och pension till line-level trace
- [ ] blockera pay run approval om dependency trace saknas
- [ ] verifiera explainability får varje payroll line

### Delfas 10.12 Payroll migration / history import / parallel run hardening
- [ ] bygg `PayrollCutoverBaseline`, `PayrollParallelRunDiffProfile`, `AcceptedVariancePolicy`
- [ ] bredda diffmodell får YTD, semester, receivables, garnishments, AGI-basis och tax decisions
- [ ] skriv om migrate/finalize/rollback-governance
- [ ] verifiera import, diff, finalize och rollback i phase19-tests och runtime

### Delfas 10.13 Security / review / step-up / trial guard hardening
- [ ] ersätt generell `company.manage`-styrning får high-risk payrollmutationer med granular permissions
- [ ] bygg `PayrollHighRiskActionPolicy`, `PayrollApprovalReceipt`, `PayrollStepUpSession`, `PayrollTrialGuardReceipt`
- [ ] las SoD får emergency manual tax, receivable write-off, garnishment override, payout batch och AGI submit
- [ ] skriv om relevanta payroll-routes i `apps/api/src/server.mjs`
- [ ] verifiera authz deny matrix, step-up och trial/live-separation

### Delfas 10.14 Runbook / seed / fake-live / legacy cleanup
- [ ] klassificera `docs/runbooks/payroll-tax-decisions-verification.md`, `docs/runbooks/payroll-employer-contribution-decisions-verification.md`, `docs/runbooks/payroll-input-snapshots-verification.md`, `docs/runbooks/employee-receivables.md`, `docs/runbooks/garnishment-remittance.md`, `docs/runbooks/payroll-history-import-verification.md`, `docs/runbooks/payroll-migration-cutover.md`, `docs/runbooks/payroll-correction-and-agi-replay.md` som `harden` eller `rewrite`
- [ ] klassificera `docs/runbooks/fas-8-payroll-core-verification.md`, `docs/runbooks/fas-8-payroll-posting-verification.md`, `docs/runbooks/fas-8-payroll-tax-agi-verification.md`, `docs/runbooks/fas-9-benefits-verification.md`, `docs/runbooks/fas-9-travel-verification.md`, `docs/runbooks/fas-9-pension-verification.md`, `docs/runbooks/fas-11-travel-receipt-vat-verification.md` som `archive` eller `rewrite`
- [ ] klassificera `docs/runbooks/document-person-payroll-incident-and-repair.md` tillsammans med Domän 16-grönser som `rewrite` eller `migrate`
- [ ] flytta `packages/db/seeds/20260321201000_phase8_payroll_core_demo_seed.sql`, `20260321211000_phase8_payroll_tax_agi_demo_seed.sql`, `20260321221000_phase8_payroll_posting_payout_demo_seed.sql`, `20260321231000_phase9_benefits_engine_demo_seed.sql`, `20260322001000_phase9_travel_expenses_demo_seed.sql`, `20260322011000_phase9_pension_salary_exchange_demo_seed.sql`, `20260322151000_phase12_tax_submission_demo_seed.sql` till test-only-klassning eller borttagning från protected/live
- [ ] verifiera att protected/live boot nekar demo payroll seed

## Fas 11

### Delfas 11.1 HUS truth / secrecy / canonical persistence
- [ ] skriv om HUS-persistence sa att den speglar canonical HUS amount-karna, inte grov SQL-modell
- [ ] ersätt `personal_identity_no` i `packages/db/migrations/20260322040000_phase10_build_rules_hus_personalliggare.sql` med secret ref, fingerprint och maskat värde
- [ ] bygg `HusCaseRecord`, `HusBuyerRecord`, `HusServiceLineRecord`, `HusPaymentAllocationRecord` och `HusReadinessSnapshot`
- [ ] knyt repository-readback till exakt samma readiness- och amount-truth som `packages/domain-hus/src/index.mjs`
- [ ] verifiera två köpare, delbetalning och arsskifte utan diff mellan runtime och repository
- [ ] verifiera att protected/live inte kan bara ra personidentitet i regulated durable state

### Delfas 11.2 HUS XML / official channel / receipt model
- [ ] bygg `HusOfficialArtifact`, `HusXmlVersion`, `HusSubmissionChannel` och `HusSubmissionReceipt`
- [ ] implementera XML-generation, XSD-validering, payment-year och claim-type blocking rules
- [ ] blockera blandade ROT/RUT-ansakningar i samma XML
- [ ] blockera blandade betalningsar i samma XML
- [ ] ta bort `direct_api` som live claim tills officiell API-path verkligen är verifierad
- [ ] verifiera att HUS-artifact aldrig kan markas `sent` utan dispatch-/receiptkedja

### Delfas 11.3 HUS decision import / payout / recovery / tax-account offset
- [ ] bygg `HusAuthorityDecisionImportBatch`, `HusAuthorityDecisionReceipt`, `HusPayoutSettlement`, `HusOffsetDecision` och `HusRecoveryCase`
- [ ] koppla HUS till tax-account mirror med explicit authority source refs
- [ ] importera delvis godkant beslut och verifiera att difference/recovery öppnas korrekt
- [ ] simulera kvittning mot skattekontoskuld och verifiera att ledger + tax-account speglar samma slutlage
- [ ] verifiera att HUS authority receivable saldo matchar ledger och tax-account mirror

### Delfas 11.4 regulated submission repository / envelope / attempt / receipt durability
- [ ] bygg tabellbackade repositories får `SubmissionEnvelope`, `SubmissionAttempt`, `SubmissionReceipt`, `SubmissionCorrectionLink`, `SubmissionEvidencePack` och queue items
- [ ] skriv om `packages/domain-regulated-submissions/src/module.mjs` sa att default-runtime inte längre bara är snapshot-/Map-buren
- [ ] koppla `packages/db/migrations/20260322150000_phase12_tax_submission_engine.sql` till verklig runtime
- [ ] verifiera crash/restart mellan dispatch och receiptimport utan state loss
- [ ] verifiera idempotency key, payload hash och source version som riktig uniqueness-regel

### Delfas 11.5 regulated transport capability / send / poll / finalize hardening
- [ ] bygg adapterkontrakt `prepare`, `dispatch`, `pollReceipt`, `importManualReceipt`, `mapReceipt`, `finalize`
- [ ] capabilityklassa varje family: AGI, VAT, HUS, annual, corporate tax
- [ ] ersätt metadata-only `prepareTransport(...)` som falsk live-transport i providerlagret
- [ ] bygg riktiga source-object bridges får HUS, VAT, annual och corporate tax där de saknas
- [ ] verifiera att `accepted` och `finalized` bara kan sattas via riktig receipt mapping

### Delfas 11.6 manual receipt / correction / replay / dead-letter hardening
- [ ] bygg `SubmissionDeadLetterCase`, `SubmissionReplayPolicy`, `SubmissionManualReceiptImport`, `SubmissionRecoveryDecision` och `SubmissionCorrectionCase`
- [ ] blockera replay när correction juridiskt krävs
- [ ] gar manual receipt import append-only och operator-signerad
- [ ] bygg queue/SLA får regulated dead letters
- [ ] verifiera transport timeout, manual receipt import, correction chain och replay-policy

### Delfas 11.7 annual package / hard-close / version / evidence hardening
- [ ] bygg first-class repository får annual packages, versions, evidence packs och submission events
- [ ] knyt annual package till hard-closed ledger/reporting snapshots och immutable source fingerprint
- [ ] farbjud overwrite av signerad eller superseded version
- [ ] verifiera version-supersede chain och bevarad historik
- [ ] verifiera att annual package aldrig kan skapas från icke hard-closed period

### Delfas 11.8 annual signatory chain / legal completeness / annual sign security
- [ ] ersätt rollklass-baserad signatorykedja med personkomplett signatory roster
- [ ] bygg `AnnualSignatoryRosterSnapshot`, `AnnualSignatoryPerson`, `AnnualSignoffRequirement`, `AnnualSignSession`
- [ ] skriv om annual sign-route sa att den kraver granular permission, fresh strong MFA och sign-specific receipt
- [ ] verifiera ARL 2 kap. 7  får AB: samtliga styrelseledamoter och VD om sadan finns
- [ ] verifiera att annual sign inte längre kan karas på `company.read`

### Delfas 11.9 corporate tax declaration / SRU / iXBRL / taxonomy hardening
- [ ] bygg `CorporateTaxDeclarationPackage`, `SruArtifactFamily`, `IxbrlArtifactFamily`, `TaxonomyVersion`, `TaxDeclarationSubmissionCase`
- [ ] bar INFO.SRU och BLÄNKETTER.SRU som riktiga artifacts med checksummor
- [ ] bind tax pack till annual version checksum, legal form och taxonomy/provider baseline
- [ ] capabilityklassa filing path sanningsenligt som live, manual official eller disabled
- [ ] verifiera SRU-artifact generation, taxonomy bytes och filing-ready-gate

### Delfas 11.10 owner-distribution repository / snapshot / free-equity hardening
- [ ] bygg first-class repository får share classes, holding snapshots, free-equity snapshots, decisions, payment instructions, KU31 drafts och kupongskatt records
- [ ] bind free-equity proof till signerad annual version eller explicit interimsbalans
- [ ] verifiera immutable snapshot på beslutsdatum
- [ ] verifiera att owner-distribution-kedjan overlever restart och export/import utan semantisk farlust

### Delfas 11.11 dividend payout / KU31 / kupongskatt / residency hardening
- [ ] bygg `ResidencyEvidenceCase`, `BeneficialOwnerEvidenceCase`, `TreatyReductionReview`, `Ku31FilingCase`, `KupongskattFilingCase`
- [ ] knyt payout, KU31 och kupongskatt till due-date monitor, filing receipt och correction chain
- [ ] blockera reduced kupongskatt utan hemvistintyg, beneficial-owner-underlag och separat approval
- [ ] verifiera svensk fysisk mottagare -> KU31-path
- [ ] verifiera utlandsk mottagare -> kupongskatt/treaty-path
- [ ] verifiera att KU31 och kupongskatt inte stannar som draft-only objekt

### Delfas 11.12 provider / signing archive / external receipt hardening
- [ ] bygg `ProviderCapabilityManifest`, `ProviderCredentialClass`, `ExternalReferenceFamily`, `SigningArchiveReceipt`
- [ ] ersätt lokal `signicat-signing-archive` Map-lasning med verklig extern eller HSM/KMS-bunden archive path
- [ ] ge varje provider family explicit capabilityklass, credentialklass och receipt family
- [ ] verifiera att ingen provider ser live ut utan external reference family och failure model

### Delfas 11.13 regulated route security / strong_mfa / dual-control hardening
- [ ] infar central enforcement av route-contract required trust level i `apps/api/src/server.mjs`
- [ ] bygg `FreshStepUpSession`, `HighRiskApprovalReceipt` och `RouteEnforcementDecision`
- [ ] ersätt generisk `company.manage`/`company.read` med granular permissions får HUS send/override, annual sign, submission sign/send, dividend payout, KU31 och kupongskatt reduction
- [ ] verifiera deny matrix, dual control och fresh-step-up-expiry
- [ ] verifiera att `annual_operations` inte längre används som enda skydd får high-risk regulated actions

### Delfas 11.14 migration / import / cutover / replay hardening
- [ ] bygg `HusHistoryImportBatch`, `AnnualImportBatch`, `OwnerDistributionImportBatch`, `RegulatedHistoryVarianceReport` och `RegulatedCutoverBlocker`
- [ ] definiera explicit per family om historik stöds, begrönsas eller blockeras
- [ ] blockera cutover när open filing cases, saknade receipts eller oklara authority liabilities finns
- [ ] verifiera import av HUS history, annual versions, shareholder snapshots och utdelningsskulder

### Delfas 11.15 runbook / seed / fake-live / legacy purge
- [ ] skriv om `docs/runbooks/hus-claim-recovery.md`
- [ ] skriv om eller arkivera `docs/runbooks/hus-submission-replay-and-recovery.md`
- [ ] skriv om eller arkivera `docs/runbooks/fas-12-annual-reporting-verification.md`
- [ ] skriv om eller arkivera `docs/runbooks/fas-12-tax-submission-verification.md`
- [ ] skriv om `docs/runbooks/annual-close-and-filing-by-legal-form.md`
- [ ] skriv om `docs/runbooks/annual-filing-correction.md`
- [ ] skriv om `docs/runbooks/owner-distributions-and-ku31.md`
- [ ] skriv om `docs/runbooks/submission-operations-and-retry.md`
- [ ] skriv om `docs/runbooks/submission-replay-and-recovery.md`
- [ ] skriv om eller arkivera `docs/runbooks/trial-regulated-submissions-verification.md`
- [ ] flytta `packages/db/seeds/20260322040010_phase10_build_rules_hus_personalliggare_seed.sql` till test-only eller archive
- [ ] flytta `packages/db/seeds/20260322041000_phase10_build_rules_hus_personalliggare_demo_seed.sql` till test-only eller remove
- [ ] flytta `packages/db/seeds/20260322141000_phase12_annual_reporting_demo_seed.sql` till test-only eller archive
- [ ] flytta `packages/db/seeds/20260322151000_phase12_tax_submission_demo_seed.sql` till test-only eller archive
- [ ] verifiera att protected/live boot nekar regulated demo seeds och falska live-capability claims

## Fas 12

### Delfas 12.1 truth-mode / persistence / classification hardening
- [ ] gar postgres-backed legal-effect-store obligatorisk får `projects`, `field`, `personalliggare`, `id06` och `kalkyl`
- [ ] bygg `DomainTruthModeStatus` och `DomainClassMaskPolicy`
- [ ] ersätt fallback till `S2` med explicita klassmasker minst `S3`
- [ ] blockera boot i `protected`, `pilot_parallel` och `production` om `storeKind = memory`
- [ ] verifiera restart-safe repository-readback får project/site/binding/estimate-state

### Delfas 12.2 project commercial lineage / immutable supersession
- [ ] bygg `ProjectCommercialLineage`, `ProjectCommercialVersionNode`, `ProjectCommercialSupersessionLink` och `ProjectCommercialCutoffResolver`
- [ ] ersätt statusmutation av gamla revenue/billing records med immutabel lineage
- [ ] gar governing commercial refs cutoff-sakra
- [ ] verifiera quote/amendment/change-order-resolver får flera cutoff-datum

### Delfas 12.3 kalkyl / quote / project-budget chain
- [ ] koppla `convertEstimateToQuote` till verklig canonical ÄR-quote
- [ ] bygg `EstimateQuoteConversionReceipt`, `ProjectBudgetVersion` och `ProjectBudgetApprovalDecision`
- [ ] ersätt auto-approved project budgets med draft/review/approve
- [ ] verifiera estimate -> quote -> project -> budget-kedjan med traverserbara refs

### Delfas 12.4 invoice-readiness / waiver / commercial decision
- [ ] bygg `ProjectInvoiceReadinessWaiver` och `ProjectCommercialExceptionDecision`
- [ ] bind blocker/review/waiver till support case, approver chain, expiry och evidence refs
- [ ] gar `ready_by_waiver` first-class i stallet får dold override
- [ ] verifiera waiver expiry och blocker-reset

### Delfas 12.5 period-control / close / reopen / rerun
- [ ] bygg `ProjectPeriodControl`, `ProjectCloseReceipt`, `ProjectReopenRequest`, `ProjectReopenImpact` och `ProjectRebridgePlan`
- [ ] koppla ledger close/reopen till project snapshots, readiness och WIP reruns
- [ ] markera stale snapshots och required reruns explicit
- [ ] verifiera hard-close -> reopen -> rerun utan dold mutation

### Delfas 12.6 WIP / revenue-recognition / accounting-policy
- [ ] bygg `ProjectAccountingPolicyProfile`, `ProjectRevenueRecognitionPolicyDecision` och `ProjectWipCorrectionChain`
- [ ] gar policyprofil obligatorisk fare legal-effect WIP
- [ ] utoka bridge-lines med policyref, dimensioner och correction lineage
- [ ] verifiera idempotent bridge, reversal chain och policy-driven rerun

### Delfas 12.7 build-VAT / omvänd byggmoms
- [ ] bygg `ProjectBuildVatServiceCatalog`, `ProjectBuildVatDecisionBasis` och `ProjectBuildVatReceipt`
- [ ] ersätt bool-baserad reverse-charge-logik med svensk byggmomskatalog
- [ ] bind assessment till officiell källa och review-policy
- [ ] verifiera omvänd byggmoms, vanlig moms och review-required cases

### Delfas 12.8 profitability / allocation / mission-control
- [ ] bygg `ProjectProfitabilitySourceCoverage`, `ProjectAllocationBatch`, `ProjectAllocationLine` och `ProjectAllocationCorrection`
- [ ] gar source coverage och unallocated amounts first-class i mission control
- [ ] bind manual adjustments till review/approval
- [ ] verifiera att varje profitability-belopp kan harledas till source type, source id och allocation basis

### Delfas 12.9 field operational / offline / conflict
- [ ] bygg `FieldOfflinePolicyMatrix`, `FieldConflictResolutionReceipt` och starkare `FieldFinanceHandoff`
- [ ] utoka offline-stöd bortom tre mutationstyper
- [ ] gar open conflicts till explicit blocker får finance handoff och invoice readiness
- [ ] verifiera duplicate mutations, version conflicts och manual resolution

### Delfas 12.10 personalliggare rule-catalog / kiosk / correction
- [ ] bygg `PersonalliggareRuleCatalog`, `PersonalliggareRuleVersion` och `KioskDeviceAttestationReceipt`
- [ ] ersätt hardkodad 2026-threshold med daterad regelkatalog
- [ ] hårda correction chain, retention och masking
- [ ] verifiera threshold per giltighetsdatum och trusted-kiosk-kedjan

### Delfas 12.11 personalliggare XML / export / secure transfer
- [ ] bygg `PersonalliggareXmlArtifact`, `PersonalliggareXsdValidationResult`, `PersonalliggareTransferProfile` och `PersonalliggareTransferReceipt`
- [ ] separera internal audit export från official export
- [ ] lagg till schema-version, payload hash och transfer receipt
- [ ] verifiera XML/XSD-validering och append-only receiptimport

### Delfas 12.12 ID06 provider / workplace / evidence
- [ ] ersätt inputdriven `verified`/`active` med provider-backed request/receipt model
- [ ] bygg `Id06ProviderCapabilityManifest`, `Id06CompanyVerificationRequest`, `Id06PersonVerificationRequest`, `Id06CardStatusReceipt`, `Id06WorkplaceRegistryLink`, `Id06EvidenceBundle` och `Id06BindingRevocationEvent`
- [ ] farbjud syntetiskt workplace i alla legal-effect-lagen
- [ ] verifiera provider receipt, expiry, refresh och revocation innan binding/export tillats

### Delfas 12.13 route / support boundary / masking
- [ ] bygg `Domain12SupportMaskPolicy`, `Domain12ReadSurfacePolicy`, `Domain12HighRiskReviewReceipt` och `Domain12ExportApproval`
- [ ] hoj attendance/export/id06/project-commercial routes till rätt trust- och maskingniva
- [ ] bind exports till watermark, actor receipt och approval där policy kraver det
- [ ] verifiera support deny matrix, maskning och export approvals

### Delfas 12.14 import / live-conversion / parallel-run
- [ ] bygg `ProjectImportBatch`, `ProjectImportCollision`, `CommercialDiffReport`, `ProjectLiveConversionApproval` och `ProjectRollbackReceipt`
- [ ] koppla import/live conversion till commercial lineage, WIP policy och compliance objects
- [ ] gar diff signoff och rollback receipt obligatoriskt fare live conversion
- [ ] verifiera import collision, parallel-run diff, approve och rollback

### Delfas 12.15 runbook / seed / fake-live / legacy purge
- [ ] skriv om `docs/runbooks/fas-10-projects-verification.md`
- [ ] skriv om eller arkivera `docs/runbooks/fas-10-field-verification.md`
- [ ] skriv om `docs/runbooks/fas-14-1-project-commercial-core-verification.md`
- [ ] skriv om `docs/runbooks/fas-14-2-project-crm-handoff-verification.md`
- [ ] skriv om `docs/runbooks/fas-14-3-project-billing-profitability-verification.md`
- [ ] skriv om `docs/runbooks/fas-14-4-resource-portfolio-risk-verification.md`
- [ ] skriv om `docs/runbooks/fas-14-5-field-operational-pack-verification.md`
- [ ] skriv om `docs/runbooks/fas-14-6-personalliggare-id06-egenkontroll-verification.md`
- [ ] skriv om eller arkivera `docs/runbooks/fas-14-7-project-trial-demo-verification.md`
- [ ] skriv om `docs/runbooks/project-profitability.md`
- [ ] skriv om `docs/runbooks/wip-revenue-recognition.md`
- [ ] skriv om `docs/runbooks/personalliggare-kiosk-device-trust.md`
- [ ] skriv om `docs/runbooks/mobile-offline-conflict-repair.md`
- [ ] skriv om `docs/runbooks/parallel-run-and-diff.md`
- [ ] flytta `packages/db/seeds/20260322020010_phase10_projects_budget_followup_seed.sql` till test-only, archive eller remove
- [ ] flytta `packages/db/seeds/20260322021000_phase10_projects_budget_followup_demo_seed.sql` till test-only, archive eller remove
- [ ] flytta `packages/db/seeds/20260322030010_phase10_field_work_orders_mobile_inventory_seed.sql` till test-only, archive eller remove
- [ ] flytta `packages/db/seeds/20260322031000_phase10_field_work_orders_mobile_inventory_demo_seed.sql` till test-only, archive eller remove
- [ ] flytta `packages/db/seeds/20260322040010_phase10_build_rules_hus_personalliggare_seed.sql` till test-only, archive eller remove
- [ ] flytta `packages/db/seeds/20260322041000_phase10_build_rules_hus_personalliggare_demo_seed.sql` till test-only, archive eller remove
- [ ] flytta `packages/db/seeds/20260325034010_phase14_id06_domain_seed.sql` till test-only, archive eller remove
- [ ] verifiera att protected/live boot nekar demo seeds och fake-live claims i Domän 12

## Fas 13

### Delfas 13.1 reporting truth / persistence / classification
- [ ] bygg `ReportingDomainRepository`, `ReportSnapshotStore`, `ReportDefinitionStore`, `ReportingTruthModeStatus` och `ReportingClassificationPolicy`
- [ ] ersätt in-memory reporting state som governing truth i `packages/domain-reporting/src/index.mjs`
- [ ] koppla startup deny till legal-effect-lagen om reporting store inte är durable
- [ ] klassificera reporting snapshots, exports och reconciliation artifacts mot rätt data- och retentionklass

### Delfas 13.2 locked snapshot / preliminary / supersession
- [ ] bygg `ReportSnapshotLifecycle`, `ReportSnapshotLockReceipt`, `ReportSnapshotSupersession`, `ReportSnapshotReopenRequest`
- [ ] infar state machine `draft -> preliminary -> locked -> superseded | reopened`
- [ ] farbjud dold statusmutation av tidigare aktiva definitions/snapshots
- [ ] verifiera reopen, supersession och immutable snapshot hash

### Delfas 13.3 snapshot-scopad drilldown / journal search
- [ ] bygg `ReportLineDrilldownArtifact`, `ReportJournalScope`, `SnapshotBoundSearchRequest`, `SnapshotBoundSearchReceipt`
- [ ] gar report drilldown och journal search strikt snapshot-scopeade
- [ ] farbjud live ledger/document lookup när snapshot-las krävs
- [ ] verifiera att drilldown fare och efter ledgerfarandring visar samma lasta sanning

### Delfas 13.4 reconciliation / signoff / close binding
- [ ] bygg `ReconciliationLifecycle`, `ReconciliationCloseReceipt`, `ReconciliationCorrectionRequest`, `ReconciliationRerunRequirement`
- [ ] utoka run lifecycle till `draft -> open -> reviewed -> signed -> closed | reopened | correction_required`
- [ ] bind reconciliation signoff till close/reopen-kedjan i close workbench
- [ ] verifiera correction, reopen och rerun utan dold mutation

### Delfas 13.5 report export / artifact / distribution
- [ ] bygg `ReportExportArtifact`, `ReportExportStorageProfile`, `ReportExportDistributionReceipt`, `ReportExportWatermarkDecision`
- [ ] ersätt `%PDF-FAKE-1.0`, `XLSX-FAKE-1.0` och `memory://` med riktig artifactmodell
- [ ] infar artifact hash, mime type, storage ref, actor receipt och delivery receipt
- [ ] verifiera export, re-download, watermark mode och receipt import

### Delfas 13.6 search projection contract / masking / retention
- [ ] bygg `SearchProjectionContractVersion`, `SearchMaskPolicy`, `SearchRetentionProfile`, `SearchProjectionDocumentReceipt`
- [ ] farbjud ra `detailPayload`, `workbenchPayload`, `snippet` och `searchText` utan kontraktsstyrd projection builder
- [ ] separera canonical truth från index/cache-lager
- [ ] verifiera att index kan rensas och byggas om utan informationsfarlust eller lackage

### Delfas 13.7 search query / snippet / ranking governance
- [ ] bygg `SearchQueryContract`, `SearchFilterPolicy`, `SearchSnippetPolicy`, `SearchRankingProfile`
- [ ] ersätt ad hoc-`includes()`-styrning med kontraktsstyrda queryfalt, filter och sort
- [ ] farbjud snippets som lacker maskade eller irrelevanta fält
- [ ] verifiera deterministisk ranking, team-scope och deny på otillåtna querykombinationer

### Delfas 13.8 reindex / checkpoints / replay / repair
- [ ] bygg `SearchCheckpointState`, `SearchReplayPlan`, `SearchRepairRun`, `SearchProjectionFreshnessReceipt`
- [ ] gar reindex requests, rebuilds och replay first-class med explicit checkpoint lineage
- [ ] farbjud att workbenches/object profiles visar fresh när checkpoint ligger efter source truth
- [ ] verifiera full rebuild, partial replay, poison-case och repair receipts

### Delfas 13.9 object profiles / freshness / action contracts
- [ ] bygg `ObjectProfileContract`, `ObjectProfileFreshnessState`, `ObjectProfileActionContract`, `ObjectProfileAvailabilityReason`
- [ ] ersätt fallback `contract_defined` och syntetisk `targetVersion` med verkliga statusobjekt
- [ ] gar action-knappar och deny reasons kontraktsbundna till projection readiness
- [ ] verifiera `fresh`, `stale`, `blocked`, `missing_projection`

### Delfas 13.10 workbenches / saved views / widgets
- [ ] bygg `WorkbenchContract`, `WorkbenchFreshnessState`, `SavedViewLifecycle`, `WidgetContractVersion`
- [ ] gar saved views invalidationsstyrda vid kontraktsdrift
- [ ] gar widgets beroende av explicit data contract, checkpoint och permission summary
- [ ] verifiera saved-view migration, invalidation och widget rebuild efter kontraktsbyte

### Delfas 13.11 mission control / cockpit snapshots
- [ ] bygg `CockpitSnapshot`, `CockpitBlocker`, `CockpitFreshnessState`, `CockpitGenerationReceipt`
- [ ] ersätt request-time aggregation som governing cockpit truth
- [ ] gar finance close, payroll submission, cutover control och trial conversion till first-class cockpit snapshots
- [ ] verifiera stale cockpit, blocker inheritance och rebuild receipts

### Delfas 13.12 notifications / digest / provider delivery
- [ ] bygg `NotificationOutboxRecord`, `NotificationDeliveryAttempt`, `NotificationProviderReceipt`, `NotificationDigestLifecycle`
- [ ] ersätt in-memory delivery med durable outbox och provider receipt chain
- [ ] bind escalations till operator ownership, retry policy och dead-letter state
- [ ] verifiera single-send, retry, digest supersession och receipt import

### Delfas 13.13 activity / replay / visibility decisions
- [ ] bygg `ActivityProjectionEvent`, `ActivityReplayRun`, `ActivityVisibilityDecision`, `ActivityRetentionRule`
- [ ] separera visibility/hide-policy från själva activity entryn
- [ ] gar rebuild till riktig replay från source events med receipts
- [ ] verifiera replay, dedupe, hide/unhide och retention cutoff

### Delfas 13.14 route / surface / support boundary / audit
- [ ] bygg `MissionControlSurfacePolicy`, `ReportingExportApproval`, `WorkbenchExportApproval`, `ReadSurfaceAuditReceipt`
- [ ] lagg mission control i egen surface-policy-familj
- [ ] bind reporting/search/workbench/cockpit exports till approval, watermark och actor receipt
- [ ] verifiera support deny matrix, export approvals och permission reasons end-to-end

### Delfas 13.15 runbook / seed / fake-live / legacy purge
- [ ] skapa `docs/runbooks/locked-reporting.md`
- [ ] skapa `docs/runbooks/workbench-operations.md`
- [ ] skriv om `docs/runbooks/fas-11-reporting-verification.md`
- [ ] skriv om `docs/runbooks/fas-15-1-reporting-snapshots-verification.md`
- [ ] skriv om `docs/runbooks/search-index-rebuild-and-repair.md`
- [ ] skriv om `docs/runbooks/notifications-activity-operations.md`
- [ ] skriv om `docs/runbooks/workbench-compatibility.md`
- [ ] skriv om `docs/runbooks/phase15-mission-control-verification.md`
- [ ] flytta `packages/db/seeds/20260321071000_phase3_reporting_reconciliation_demo_seed.sql` till test-only, archive eller remove
- [ ] flytta `packages/db/seeds/20260322111000_phase11_reporting_exports_demo_seed.sql` till test-only, archive eller remove
- [ ] flytta `packages/db/seeds/20260322131000_phase11_close_workbench_demo_seed.sql` till test-only, archive eller remove
- [ ] migrera bort legacy `core_work_items` från close/reporting-paths

## Fas 14

### Delfas 14.1 phase5 dependency / baseline-governance hardening
- [ ] gar phase5-baseline selection blockerande på alla providerbundna writes
- [ ] farbjud direct connection, public API och partner operation utan styrd baseline där policy kraver det
- [ ] bar baseline id, version, checksum och effective date i receipts, jobs och callbacks
- [ ] verifiera deploy deny när baseline saknas eller checksum driver

### Delfas 14.2 integrations control-plane / connection-profile hardening
- [ ] bygg `IntegrationConnectionProfile`, `IntegrationConnectionStatus`, `IntegrationEnablementDecision`, `IntegrationStalenessState`
- [ ] gar control plane till enda primara skrivyta får connection state
- [ ] migrera bort att partnerstatus lases som governing truth från aldre state
- [ ] verifiera att partner/public/webhook/job paths bara laser eller skriver via control plane-kommandon

### Delfas 14.3 credential / secret-ref / consent / expiry hardening
- [ ] bygg `CredentialSetLifecycle`, `ConsentGrantLifecycle`, `SecretRotationReceipt`, `CredentialExpiryBlocker`
- [ ] gar expiry, revoke och reauth-required till first-class blockerobjekt
- [ ] farbjud ra secrets/tokens i DB, exports och snapshots
- [ ] verifiera rotation, revoke, expiry och read-model masking

### Delfas 14.4 capability-manifest / mode-matrix / receipt-mode hardening
- [ ] bygg publicerade manifestobjekt med signerad reality class, mode matrix och receipt mode policy
- [ ] bind `supportsLegalEffect`, `sandboxSupported`, `trialSafe` och `receiptMode` till verkliga enablementbeslut
- [ ] farbjud att fake-live providers bar legal-effect manifest
- [ ] verifiera deny på mode/receipt-drift

### Delfas 14.5 public-api / oauth / compatibility-baseline / sandbox hardening
- [ ] enhetliggar public API-surface och las slutlig routefamilj
- [ ] gar compatibility baselines blockerande får release och spec-publicering
- [ ] bygg rotation/revoke/owner approvals får OAuth client credentials
- [ ] verifiera sandbox watermark, route hash, spec hash och drift deny

### Delfas 14.6 partner-api / contract-test / operation hardening
- [ ] bygg first-class `ContractTestPack`, `ContractTestPackVersion`, `PartnerOperationPolicy`, `PartnerOperationReceipt`
- [ ] farbjud produktionsexekvering utan passing pack får exakt connection och baseline
- [ ] ta bort dott `dryRun`-spar eller gar det till isolerat icke-live testmode
- [ ] verifiera dispatch deny, fallback policy och contract-pack lineage

### Delfas 14.7 route / contract / surface drift hardening
- [ ] las canonical `/v1/integrations/*`, `/v1/public/*`, `/v1/partners/*`, `/v1/jobs/*`-modell eller explicit beslutad ersättning
- [ ] generera contract manifest från faktisk router och bind docs till samma hash
- [ ] farhindra split mellan `/v1/public/*` och `/v1/public-api/*`
- [ ] verifiera route-contract hash drift gating

### Delfas 14.8 inbound-webhook / callback-security hardening
- [ ] bygg `ProviderCallbackProfile`, `ProviderCallbackAttempt`, `CallbackReplayLease`, `BusinessIdempotencyRecord`
- [ ] centralisera inbound callback security över auth, OCR och övriga provider-callbacks
- [ ] separera signaturvalidering från business idempotency
- [ ] verifiera replay-window, nonce lease, key rotation och masked callback logging

### Delfas 14.9 outbound-webhook / delivery-security hardening
- [ ] bygg `WebhookDeliveryPolicy`, `WebhookSigningKeyVersion`, `WebhookDeliveryDeadLetter`, `WebhookDeliveryReceipt`
- [ ] ersätt legacy secret-migration med en enda canonical secretmodell
- [ ] bind deliveries till idempotency key, signing key version och provider receipts
- [ ] verifiera retries, dead letters, key rotation och duplicate suppression

### Delfas 14.10 async-job / dead-letter / replay / backpressure hardening
- [ ] bygg `IntegrationJobPolicy`, `IntegrationReplayPlan`, `IntegrationBackpressureState`, `IntegrationDeadLetterCase`
- [ ] gar replay connection-aware, provider-aware och source-surface-aware
- [ ] bind backpressure och circuit-breaker till connection policy
- [ ] verifiera dead-letter -> replay-plan -> replay utan farlorad connection identity

### Delfas 14.11 health / enablement / staleness hardening
- [ ] bygg `IntegrationHealthSnapshot`, `IntegrationEnablementDecision`, `IntegrationFreshnessState`, `IntegrationHealthEvidence`
- [ ] separera health, enablement och staleness till egna objekt
- [ ] gar receipt-lag, credential expiry, consent expiry och baseline drift first-class
- [ ] verifiera att grön health aldrig betyder live enablement utan egen receipt

### Delfas 14.12 trial / sandbox / production isolation hardening
- [ ] bygg `IntegrationEnvironmentIsolationPolicy`, `PromotionReceipt`, `CrossModeReuseViolation`, `RuntimeModeBoundary`
- [ ] farbjud promotion och replay som blandar trial/sandbox/live refs
- [ ] bind callbacks, credentials, receipts och provider refs till environment boundary
- [ ] verifiera deny på cross-mode import, replay och callback processing

### Delfas 14.13 provider-reference-boundary hardening
- [ ] bygg `ProviderReferencePolicy`, `ProviderReferenceReceipt`, `ExternalReferenceLink`
- [ ] hindra att provider-specifika ids lacker in som canonical affärs-id
- [ ] krav explicit mapping mellan external refs och canonical domain objects
- [ ] verifiera att canonical ids overlever providerbyte och replay

### Delfas 14.14 mutation-scope hardening
- [ ] bygg `IntegrationMutationScope`, `IntegrationWriteApproval`, `SurfaceMutationReceipt`
- [ ] begrönsa public API, partner API, callback och jobb till explicit mutation scope
- [ ] blockera writes som kringgar source-domänernas riktiga commands
- [ ] verifiera deny på overbred mutation och felaktig object family

### Delfas 14.15 provider-baseline / schema-governance hardening
- [ ] bygg `ProviderSchemaSelection`, `ProviderSchemaCompatibilityGate`, `ProviderPublicationReceipt`
- [ ] bind schema- och baseline-selection till route/spec/job/callback-runtime
- [ ] farbjud schema-byte utan ny publication, ny checksum och nytt contract-test-pack
- [ ] verifiera schema drift deny och rollback receipt

### Delfas 14.16 provider reality classification / fake-live removal hardening
- [ ] klassificera varje provider som `verified reality`, `partial reality`, `sandbox only`, `trial only`, `fake-live`, `remove`
- [ ] ta bort eller nedklassa stateless providers som saknar verklig extern runtime
- [ ] skriv om osanna docs och tester som marknadsfar fake-live
- [ ] verifiera att legal-effect enablement nekar `fake-live`

### Delfas 14.17 Swedish adapter priority hardening
- [ ] prioritera svenska wave-1 adapters mot officiellt dokumenterade ekosystembehov
- [ ] fokusera på bank, Peppol, Fortnox/Visma/Bokio-nara import- och exportbehov, identitet och kommunikation i rätt ordning
- [ ] stoppa long-tail adapters som inte starker svensk go-live
- [ ] verifiera att roadmap och provider backlog följer prioriteringsregeln

## Fas 15

### Delfas 15.1 source-discovery / family-detection hardening
- [ ] bygg `SourceSystemProfile`, `SourceFamilyDetectionReceipt`, `SourceArtifactFingerprint` och `SourceDiscoveryBlocker`
- [ ] klassificera minst `api_gl`, `sie4_file`, `csv_template`, `excel_template`, `bureau_bundle`, `documents_only`
- [ ] blockera ambiguous family i stallet får fallback
- [ ] verifiera strict discovery får SIE header, CSV fingerprint och bundle manifest

### Delfas 15.2 source-connection / consent / capability-detection hardening
- [ ] bygg `SourceConnection`, `ConsentGrant`, `CapabilitySnapshot`, `SourceConnectionHealthState` och `SourceConnectionExpiryBlocker`
- [ ] gar expiry och revocation blockerande får extract
- [ ] harled capabilities från discovery, auth scopes och provider metadata
- [ ] verifiera scope change, expiry och file-only bundle path

### Delfas 15.3 cutoff-basis / date-hierarchy hardening
- [ ] bygg `CutoffBasis`, `CutoffBinding` och `CutoffConflictReceipt`
- [ ] bind samma basis-version till extract, dataset, parity, import och switch
- [ ] blockera periodmismatch mellan opening balance, journal history, open items, payroll YTD och AGI
- [ ] verifiera cutoff precedence och basis-hash genom hela cutoverkedjan

### Delfas 15.4 wave-1 ingress canonicalization hardening
- [ ] las SIE4, API GL, CSV template, Excel template och bureau bundle till samma `ExtractManifest`-modell
- [ ] farbjud unsupported format och unknown tags att glida igenom som warnings
- [ ] ersätt baseline claims utan riktiga adapters med verklig ingress eller blocker
- [ ] verifiera SIE4/API/CSV/bundle mot samma canonical extract-path

### Delfas 15.5 canonical-dataset / lineage / raw-artifact governance hardening
- [ ] bygg `CanonicalDataset`, `DatasetLineageEdge`, `RawSourceArtifact`, `RawArtifactAccessPolicy` och `RawArtifactRetentionProfile`
- [ ] gar schemaVersion, checksum, lineageRefs och coverage class first-class
- [ ] gar raartefakter krypterade, hashade, accessstyrda och retentionstyrda
- [ ] verifiera lineage tillbaka från target object till source artifact

### Delfas 15.6 mapping / auto-mapping / confidence / blocker-code hardening
- [ ] bygg `AutoMappingCandidate`, `MappingConfidenceScore`, `BlockedFieldDecision` och `FieldCoverageReceipt`
- [ ] farbjud approved mapping set utan coverage och blocker-status
- [ ] gar manuella overrides explicita och evidensburna
- [ ] verifiera confidence scoring, blocked fields och override receipts

### Delfas 15.7 variance / materiality / waiver / signoff hardening
- [ ] bygg `VarianceReport`, `VarianceItem`, `MaterialityDecision`, `WaiverRecord` och `VarianceSignoff`
- [ ] ersätt caller-supplied diff items med motorberaknade diffar
- [ ] gar waivers tidsboxade, signerade och item-scopeade
- [ ] verifiera materiality, waiver expiry och engine-generated diff only

### Delfas 15.8 target-write / identity-resolution / duplicate / double-count hardening
- [ ] bygg `TargetWritePolicy`, `IdentityResolutionRule`, `DuplicateDetectionReceipt`, `DoubleCountGuard` och `TargetWriteReceipt`
- [ ] las create/merge/replace/block per object family
- [ ] stoppa provider/source refs från att bli canonical ids
- [ ] verifiera duplicate resolution och double-count blocking över source families

### Delfas 15.9 import-execution / domain-landing / idempotency hardening
- [ ] bygg `ImportBatchExecution`, `ImportWriteReceipt`, `LandingFailureRecord` och `ImportReplayReceipt`
- [ ] ersätt statushopp i `runImportBatch` med riktiga target receipts
- [ ] gar landing replaybar per object family
- [ ] verifiera batch-idempotency, failed landing och replay receipts

### Delfas 15.10 parallel-run / parity / threshold hardening
- [ ] bygg `ParallelRunPlan`, `ParallelRunMeasurement`, `ParallelRunThresholdProfile`, `ParityDecision` och `ParallelRunAcceptanceReceipt`
- [ ] lat motorn själv räkna metrics från source + target receipts
- [ ] blockera basis mismatch och hard-threshold overskridanden
- [ ] verifiera threshold evaluation och manual-review-policy

### Delfas 15.11 cutover-plan / final-extract / delta-extract / switch hardening
- [ ] bygg `CutoverPlan`, `FinalExtractArtifact`, `DeltaExtractArtifact`, `SwitchReceipt` och `FreezeWindowState`
- [ ] gar final extract immutable med manifest, checksum och dataset refs
- [ ] gar switch till verklig truth handoff med receipt
- [ ] verifiera final extract, delta extract och switch receipt

### Delfas 15.12 rollback / restore / checkpoint / compensation hardening
- [ ] bygg `CutoverCheckpoint`, `RollbackPlan`, `RollbackExecutionReceipt`, `RollbackCompensationPlan` och `RollbackModeDecision`
- [ ] skilj explicit mellan `restore_backed` och `post_switch_compensation`
- [ ] blockera rollback utan checkpoint eller compensation plan
- [ ] verifiera restore-backed rollback och regulated compensation path

### Delfas 15.13 post-cutover correction / watch-window hardening
- [ ] bygg `PostCutoverCorrectionCase`, `WatchWindowState`, `WatchSignal` och `CorrectionClosureReceipt`
- [ ] bind correction lane till owner, SLA, reopen rules och rollback mode
- [ ] blockera close av cutover med öppna watch blockers
- [ ] verifiera watch-window exit och correction reopen

### Delfas 15.14 payroll-history / YTD / AGI / balance landing hardening
- [ ] bygg `PayrollHistoryLandingReceipt`, `YtdCarryForwardReceipt`, `AgiCarryForwardReceipt` och full `PayrollMigrationExecutionReceipt`
- [ ] sluta lata finalize bara skriva balances
- [ ] gar rollback bredare an compensating balance transactions
- [ ] verifiera riktig payroll landing, finalize och rollback

### Delfas 15.15 bureau-portfolio / delegated-approval / cohort hardening
- [ ] bygg `BureauMigrationPortfolio`, `DelegatedMigrationApproval`, `MigrationCohortDashboard` och `ClientScopeIsolationReceipt`
- [ ] gar multi-client discovery, extract, cutover och watch-window verkliga
- [ ] blockera delegated signoff över fel klientscope
- [ ] verifiera multi-client isolation och cohort dashboard truth

### Delfas 15.16 trial-live-promotion / non-in-place isolation hardening
- [ ] bygg `PromotionMigrationLink`, `PromotionIsolationReceipt` och `ForbiddenCarryOverDecision`
- [ ] bind promotion till migration receipts utan att skapa dubbla live-sanningar
- [ ] las `promotionMode=copy_to_new_live_tenant`
- [ ] verifiera forbidden carry-över, copy-not-mutate och promotion evidence linkage

### Delfas 15.17 route / surface / runbook / seed / legacy purge
- [ ] separera tydligt `sie`, `migration`, `import_cases`, `payroll_migration` och `trial_promotion`
- [ ] skriv om eller arkivera osanna migrationrunbooks och skapa de saknade tre nya runbooks
- [ ] flytta demo seeds till test-only, archive eller remove
- [ ] verifiera route truth lint, runbook truth lint och protected-mode demo-seed deny

### Delfas 15.18 Swedish source priority / competitor migration friction hardening
- [ ] las wave 1 till Fortnox, Visma, Bokio, SIE4, CSV/Excel och bureau bundle
- [ ] bind varje prioriterad source family till official-source evidence får auth/export/import
- [ ] stoppa long-tail adapters från att tranga undan svensk migrationsfriktion
- [ ] verifiera source-priority lint och wave-1 evidence completeness

## Fas 16

### Delfas 16.1 support-case / masked-view / reveal hardening
- [ ] bygg `SupportCase`, `MaskedProjectionPolicy`, `RevealRequest`, `RevealSession` och `RevealExpiryReceipt`
- [ ] las masked-by-default som enda normala backoffice-read-path
- [ ] blockera full read utan godkänd reveal
- [ ] verifiera reveal request, approval, TTL och remasking

### Delfas 16.2 support-write / diagnostics / mutation-scope hardening
- [ ] bygg `BackofficeMutationScope`, `SupportMutationReceipt`, `AdminDiagnosticExecution` och `StepUpReceipt`
- [ ] bind varje support-write till support case, approval och trust-level receipt
- [ ] publicera diagnostic allowlists som first-class governance
- [ ] verifiera deny på action utanför scope eller utan step-up

### Delfas 16.3 impersonation hardening
- [ ] bygg `ImpersonationActionScopeReceipt`, `ImpersonationTerminationReceipt` och full evidencekedja
- [ ] skilj read-only och limited-write i runtime, exports och policy
- [ ] bind limited-write till publicerad mutation-scope-version
- [ ] verifiera scope enforcement, expiry och evidence export

### Delfas 16.4 break-glass / emergency-access hardening
- [ ] bygg `EmergencyAccessAccountProfile`, `EmergencyAccessUsageAlert` och `BreakGlassReviewReceipt`
- [ ] bind break-glass till incident, dual approval, TTL och reviewed close
- [ ] skapa larm- och drillkedja får emergency access
- [ ] verifiera dual approval, incident-binding och reviewed close blocker

### Delfas 16.5 access-review / SoD hardening
- [ ] bygg `SoDViolationRecord`, `DelegationRemediation` och `AccessReviewSignoff`
- [ ] gar stale delegations och SoD-fynd first-class
- [ ] blockera signoff med öppna kritiska violations
- [ ] verifiera self-signoff deny och remediation receipts

### Delfas 16.6 replay / dead-letter / correction-orchestration hardening
- [ ] bygg `ReplayOutcomeVerification`, `DeadLetterResolutionReceipt`, `CorrectionCaseLink` och `ReconciliationRerunRequest`
- [ ] ersätt får tidig dead-letter-resolve med verification-stage
- [ ] separera replay från correction orchestration
- [ ] verifiera `awaiting_verification -> verified_resolved`

### Delfas 16.7 incident-signal / incident / post-review / blast-radius hardening
- [ ] bygg `IncidentImpactGraph`, `IncidentContainmentDecision`, `CorrectiveActionReceipt` och `PreventiveActionReceipt`
- [ ] gar blast radius över tenant, provider, release, secret/cert och cutover first-class
- [ ] fortsatt blockera close utan post-review och reviewed break-glass
- [ ] verifiera full incident-livscykel med graph och post-review

### Delfas 16.8 queue / SLA / escalation / submission-monitor hardening
- [ ] bygg `OpsQueueAggregate`, `SlaScanExecution`, `EscalationDecision` och `SubmissionMonitorFreshnessState`
- [ ] gar queue owner, freshness och escalation receipt first-class
- [ ] aggregera queue- och monitorstatus till global no-go-board
- [ ] verifiera stale-state och escalation flow

### Delfas 16.9 checkpoint / restore-drill / replay-drill hardening
- [ ] bygg `RestoreDrillExecution`, `ReplayDrillExecution` och `DrillVerificationReceipt`
- [ ] bind drills till checkpoint, verification summary och runbook execution
- [ ] gar failed drills blockerande får no-go-board
- [ ] verifiera restore/replay drill lifecycle och incident signal on fail

### Delfas 16.10 ops-feature-flag / emergency-disable / rotation / revoke hardening
- [ ] skilj `GlobalKillSwitch` från `FeatureFlag` och `EmergencyDisable`
- [ ] bygg `SecretRotationPlan`, `CallbackSecretRevocation` och `CertificateRevocationDecision`
- [ ] bind globala actions till dual control och incident/containment receipts
- [ ] verifiera kill-switch, revoke och rotation lifecycle

### Delfas 16.11 platform-control-plane / super-admin / tenant-registry / quarantine / kill-switch hardening
- [ ] bygg `TenantRegistryEntry`, `TenantFreezeDecision`, `TenantQuarantineProfile`, `NoGoBoardSnapshot`, `ProviderRuntimeHealth` och `PlatformControlPlaneSnapshot`
- [ ] skapa separat `/v1/super-admin/*`-surface
- [ ] gar tenant freeze, quarantine och global blockeraggregering first-class
- [ ] verifiera global registry, no-go-board och freeze enforcement

### Delfas 16.12 freshness / staleness / rebuild-control / cross-tenant-search hardening
- [ ] bygg `FreshnessSnapshot`, `ReadModelLagRecord`, `RebuildExecution`, `CrossTenantSearchAudit` och `SearchRevealRequest`
- [ ] exponera `fresh`, `stale`, `blocked` på operatorvyer
- [ ] gar cross-tenant search masked-by-default och fullauditad
- [ ] verifiera stale blockers, rebuild receipts och search reveal flow

### Delfas 16.13 route / surface / policy / auth-boundary hardening
- [ ] las canonical routefamiljer får `/v1/backoffice/*`, `/v1/ops/*` och `/v1/super-admin/*`
- [ ] generera route manifest från faktisk router
- [ ] ersätt ren `company.manage`-dependens med ops-trust receipts där det krävs
- [ ] verifiera route/policy drift lint och trust-level enforcement

### Delfas 16.14 support-export / audit / watermark / retention hardening
- [ ] bygg `SupportExportRequest`, `AuditExportRequest`, `WatermarkedExportReceipt`, `OpsArtifactRetentionPolicy` och `LegalHoldDecision`
- [ ] gar export requests approval-styrda, watermarkade och retentionstyrda
- [ ] blockera purge under legal hold
- [ ] verifiera export receipts, watermark visibility och legal hold

### Delfas 16.15 runbook / release-evidence / provenance / hermetic-ci hardening
- [ ] bygg `RunbookExecution`, `RunbookExecutionStep`, `RunbookEvidenceAttachment`, `ReleaseEvidenceBundleRef` och `ReleaseProvenanceReceipt`
- [ ] skapa canonical `docs/runbooks/incident-response.md` och `docs/runbooks/release-evidence.md`
- [ ] bind drills, incidents, break-glass och release artifacts till runbook execution
- [ ] verifiera provenance mismatch blocker och runbook execution lifecycle

### Delfas 16.16 doc / seed / duplicate-runbook / legacy purge
- [ ] skriv explicit keep/rewrite/archive/remove-beslut får Domän 16-runbooks och demo seeds
- [ ] flytta `packages/db/seeds/20260322191000_phase14_security_review_demo_seed.sql` och `packages/db/seeds/20260322201000_phase14_resilience_demo_seed.sql` till test-only eller archive
- [ ] sammanfar eller arkivera duplicerade replay/dead-letter-runbooks
- [ ] verifiera docs-truth lint, seed-truth lint och protected-mode demo-seed deny

## Fas 17

### Delfas 17.1 route / object / state-machine drift hardening
- [ ] bygg `GoLiveDecision`, `AdvantageScorecard`, `GovernanceRouteManifest` och `GovernanceStateTransitionReceipt`
- [ ] ersätt binar `approved|blocked`-semantik med full review- och invalidation-livscykel
- [ ] skapa canonical governance-route-family i stallet får split mellan `/v1/pilot/*` och `/v1/release/*`
- [ ] verifiera route truth lint och deny från `draft` direkt till `approved`

### Delfas 17.2 pilot-execution hardening
- [ ] bygg ut `PilotExecution` med `customerRef`, `sourceSystemRefs`, `providerRealismRefs`, `buildRef`, `artifactDigest`, `environmentManifestRef`, `rulepackRefs` och `providerBaselineRefs`
- [ ] gar scenario outcomes och provenance first-class
- [ ] blockera pilot completion utan artifact/provenance/provider realism
- [ ] verifiera evidence export med digest och manifest

### Delfas 17.3 pilot-cohort / representativeness / anti-cherry-pick hardening
- [ ] bygg `PilotRepresentativenessEvaluation` och `PilotCoverageReceipt`
- [ ] ersätt `minimumPilotCount: 1` med verkliga segmentkrav
- [ ] gar hard-case, source-system-bredd och rollback readiness blockerande
- [ ] verifiera deny på cohort med bara latta case

### Delfas 17.4 zero-blocker / waiver-hygiene hardening
- [ ] bygg `FindingRecord`, `WaiverDecision`, `WaiverExpiryReceipt` och `GateFindingSnapshot`
- [ ] blockera GA på öppna `critical`, `high` och `unclassified`
- [ ] farbjuda waivers utan expiry, owner och policy basis
- [ ] verifiera HIGH-finding blocker och waiver ceiling

### Delfas 17.5 negative-evidence / gate-invalidation hardening
- [ ] bygg `NegativeEvidenceRecord`, `GateInvalidationRecord` och `GateSupersessionLink`
- [ ] gar negativa utfall append-only
- [ ] invalidiera green gates på route/config/provider/rulepack/artifact-drift
- [ ] verifiera append-only historik och invalidation triggers

### Delfas 17.6 deploy-equality / artifact-provenance hardening
- [ ] bygg `DeployEquivalenceRecord`, `ReleaseProvenanceReceipt`, `DeployAttestation` och `EnvironmentManifestSnapshot`
- [ ] sluta lata `pilot_parallel` vara ersättning får production deploy-equality
- [ ] bind pilot, parity, advantage, freeze och GA till samma artifact digest när de gäller samma release
- [ ] verifiera deny på digest mismatch och provenance mismatch

### Delfas 17.7 parity-scorecard / competitor-evidence hardening
- [ ] bygg `OfficialCompetitorEvidenceRef` och `ParityCriterionOutcome`
- [ ] gar official source, comparison date, product plan och market segment obligatoriska
- [ ] las svensk marknadsrelevans i scorecards
- [ ] verifiera deny utan officiell källa eller gammalt jamforelsedatum

### Delfas 17.8 advantage-scorecard / differentiator hardening
- [ ] bygg differentiatorvisa `AdvantageScorecard` i stallet får bundle-only-grön status
- [ ] bind varje differentiator till runtime refs och value proofs
- [ ] blockera green advantage utan full differentiator coverage
- [ ] verifiera deny på saknad move eller saknad runtime ref

### Delfas 17.9 provider-realism hardening
- [ ] bygg `ProviderRealismRecord`, `ProviderRealismMatrix` och `ProviderRealismPolicy`
- [ ] klassificera varje externt beroende som `real|sandbox|simulated|fallback`
- [ ] blockera reglerade green paths med `simulated`
- [ ] verifiera provider realism matrix och GA deny på fel realism

### Delfas 17.10 marketed-capability-coverage hardening
- [ ] bygg `MarketedCapabilityCoverageRecord`, `CapabilityOwnerSignoff` och `CapabilityEvidenceLink`
- [ ] bind varje live-marknadsfard capability till pilot/parity/advantage/GA där det krävs
- [ ] blockera live claims utan coverage och owner signoff
- [ ] verifiera lookup får `SIE4`, `corporate_tax`, `payroll_full_chain` och ändra karncapabilities

### Delfas 17.11 UI-contract-freeze / consumer-contract / compatibility-policy hardening
- [ ] bygg `CompatibilityPolicy`, `ConsumerBaseline`, `ConsumerDriftScan` och `FreezeInvalidationReceipt`
- [ ] bind freeze till runtime contracts, compatibility policy och consumer drift detection
- [ ] ge governance-surface egen kontraktspolicy
- [ ] verifiera freeze invalidation på route- eller permissiondrift

### Delfas 17.12 go-live-decision / signoff / legal-readiness hardening
- [ ] bygg `GoLiveDecisionApproval`, `LegalApprovalRef`, `SecurityReadinessApproval`, `OperationsReadinessApproval` och `FinanceReadinessApproval`
- [ ] gar named signer chain blockerande
- [ ] las `approvedBy[]` och `approvedAt`
- [ ] verifiera deny utan full signer chain eller utan legal ref

### Delfas 17.13 golden-scenario / migration / rollback-rehearsal hardening
- [ ] bygg `GoldenScenarioRun`, `GoldenScenarioOutcome`, `MigrationRehearsalRecord` och `RollbackRehearsalRecord`
- [ ] bind golden scenarios, migration och rollback rehearsal direkt till GA
- [ ] blockera stale scenario outcomes och saknade rehearsals
- [ ] verifiera deny på missing rollback rehearsal och stale scenario

### Delfas 17.14 non-functional-ga-gate / no-go / staged-rollout / post-ga-watch hardening
- [ ] bygg `NonFunctionalGateRecord`, `NoGoTrigger`, `RolloutStage`, `WatchWindow`, `WatchSignal` och `RolloutPauseDecision`
- [ ] gar latency, throughput, queue lag, support load och operator effort blockerande där policy kraver det
- [ ] bygg staged rollout och post-GA watch som first-class runtime
- [ ] verifiera rollout pause på no-go trigger och deny på watch-window exit

### Delfas 17.15 kill-switch / on-call / rollback-path hardening
- [ ] bygg `KillSwitchCoverageRef`, `OnCallReadinessRef`, `RollbackPathRef` och `GoLiveOpsReadinessSnapshot`
- [ ] blockera GA utan kill-switch coverage, on-call readiness eller rollback path
- [ ] bind ops-readiness till samma artifact och samma GA decision
- [ ] verifiera deny när nagon ops-readiness-ref saknas eller är expired

### Delfas 17.16 runbook / legacy / doc purge och slutlig GA re-verification
- [ ] skapa canonical `pilot-readiness.md` och `general-availability.md`
- [ ] skriv explicita keep/rewrite/archive/remove-beslut får Domän 17-docs och irrelevanta phase18-spar
- [ ] arkivera Domän 17-irrelevanta `phase18_collective_agreements`-migreringar och seedspar från governance-sanningen
- [ ] verifiera docs truth lint, runbook existence lint och slutlig GA re-verification på samma artifact som ska ga live

## Fas 18

### Delfas 18.1 commercial object-model / canonical route truth
- [ ] bygg `CommercialAccount`, `CommercialContact`, `CommercialOpportunity`, `CommercialQuote`, `CommercialContract`, `CommercialSubscription`, `CommercialOrder` och `CommercialHandoffReceipt`
- [ ] skapa canonical route family `/v1/commercial/*`
- [ ] flytta kommersiell primarsanning ur ren ÄR- och project-fragmentering
- [ ] verifiera route truth lint och repository truth

### Delfas 18.2 account / contact / relationship / ownership hardening
- [ ] bygg account hierarchy, relation roller, primarkontakt, kundansvarig och owner assignment
- [ ] bar customer-to-account mapping explicit i stallet får läsa kundfalt
- [ ] blockera dubbletter och osakra merge paths utan review
- [ ] verifiera dedupe, merge och owner receipts

### Delfas 18.3 lead / opportunity / pipeline hardening
- [ ] bygg `Lead`, `Opportunity`, `PipelineStage`, `LossReason`, `WinReceipt`
- [ ] gar stage history, owner changes och close reasons first-class
- [ ] koppla opportunity till account, contacts, quote och order
- [ ] verifiera stage gates, reopen rules och win/loss evidence

### Delfas 18.4 quote / pricing / discount / approval hardening
- [ ] gar prislista, rabatter, quote approvals och quote validity first-class i commercial core
- [ ] bygg tydlig CPQ-light får line items, tiered pricing, minimum fee och special terms
- [ ] bind rabatt- och avvikelsefall till explicit approval policy
- [ ] verifiera quote revision, approval, acceptance och expiry

### Delfas 18.5 contract / subscription / renewal / termination hardening
- [ ] bygg `SubscriptionPlan`, `SubscriptionInstance`, `RenewalDecision`, `ContractAmendment`, `TerminationDecision`
- [ ] gar renewals, uppsagning, paus, prisindexering och bindningstid first-class
- [ ] blockera renewal utan korrekt pricing, notice period och approval där policy kraver det
- [ ] verifiera renewal, pause, change, cancel och indexation

### Delfas 18.6 order / amendment / cancellation hardening
- [ ] bygg `CommercialOrder`, `OrderLine`, `OrderAmendment`, `OrderCancellationReceipt`, `OrderCommitmentWindow`
- [ ] las order som separat commit-objekt från quote och contract
- [ ] gar ändringsorder och cancellation receipts first-class
- [ ] verifiera order freeze, amendment lineage och cancel compensation

### Delfas 18.7 downstream handoff / SLA / support / project / field hardening
- [ ] bygg `ProjectCommercialHandoff`, `FieldCommercialHandoff`, `SupportEntitlement`, `BillingEntitlement`, `CommercialSlaProfile`
- [ ] bind SLA, supportniva, leveransvillkor och faktureringsratt till kommersiell sanning
- [ ] farhindra att projekt eller field hittar på egen kommersiell truth
- [ ] verifiera handoff lineage till projekt, arbetsorder, support och ÄR

### Delfas 18.8 doc / runbook / legacy purge
- [ ] skriv explicit keep/rewrite/archive/remove-beslut får project-commercial- och CRM-handoff-docs
- [ ] skapa canonical commercial runbooks får quote approval, contract activation, renewal och amendment
- [ ] flytta integrationsspecifika CRM runbooks till Domän 14-grönsen
- [ ] verifiera docs truth lint och legacy archive receipts

## Fas 19

### Delfas 19.1 unified delivery object-model / route truth
- [ ] bygg `DeliveryOrder`, `ServiceOrder`, `WorkOrder`, `DeliveryPlan`, `DeliveryHandoffReceipt`
- [ ] skapa canonical route family `/v1/delivery/*`
- [ ] flytta primär leveranssanning ur split mellan project och field
- [ ] verifiera route truth lint och repository truth

### Delfas 19.2 resource / booking / capacity hardening
- [ ] bygg `ResourcePool`, `ResourceBooking`, `CapacityWindow`, `BookingConflict`, `RebookingReceipt`
- [ ] gar faretagsgemensam schemalaggning first-class
- [ ] blockera dubbelbokning, otillaten overbokning och fel resursprofil
- [ ] verifiera booking, rebooking och conflict resolution

### Delfas 19.3 delivery-order / service-order / work-order hardening
- [ ] separera generellt `DeliveryOrder` från field-specifik `WorkOrder`
- [ ] bygg `ServicePlan`, `VisitWindow`, `InstructionSet`, `DeliveryDependency`
- [ ] las hur kommersiell order oversätts till leveransobjekt
- [ ] verifiera order-to-delivery lineage

### Delfas 19.4 dispatch / execution / checklist / evidence hardening
- [ ] bygg `DispatchBoard`, `DispatchAssignment`, `ExecutionChecklist`, `ExecutionEvidence`, `ExceptionCase`
- [ ] gar on_route, on_site, blocked, resumed och completed first-class
- [ ] bind checklistor, foton, signaturer och materialatgang till exekveringen
- [ ] verifiera dispatch lifecycle och evidence completeness

### Delfas 19.5 recurring service / SLA / revisit hardening
- [ ] bygg `RecurringServicePlan`, `SlaProfile`, `VisitRecurrence`, `SlaBreachSignal`, `RevisitDecision`
- [ ] stöd återkommande tjänster, serviceavtal och SLA-baserad återplanering
- [ ] blockera green completion när revisit eller SLA-brott kraver uppföljning
- [ ] verifiera recurrence, SLA timers och breach flow

### Delfas 19.6 completion / signoff / finance handoff hardening
- [ ] bygg `CustomerSignoff`, `CompletionReceipt`, `FinanceHandoffReceipt`, `BillableReadinessDecision`
- [ ] gar completion blockerande på rätt signoff, material, tid och konfliktstatus
- [ ] farhindra att ekonomi eller projekt hittar på completion själva
- [ ] verifiera completion gates och finance handoff lineage

### Delfas 19.7 mobile / offline / conflict / exception hardening
- [ ] bygg `MobileExecutionSession`, `OfflineOperation`, `SyncConflictCase`, `DispatchExceptionReceipt`
- [ ] stöd verklig mobil exekvering med konfliktupplasning och replaybar sync
- [ ] blockera tyst overwrite av faltdata vid offline-synk
- [ ] verifiera offline sync, conflict handling och replay

### Delfas 19.8 doc / runbook / legacy purge
- [ ] skriv explicit keep/rewrite/archive/remove-beslut får field- och project-delivery-docs
- [ ] skapa canonical runbooks får dispatch operations, recurring service och delivery completion
- [ ] hall field-vertikalen som vertikal pack och inte generell leveranssanning
- [ ] verifiera docs truth lint och legacy archive receipts

## Fas 20

### Delfas 20.1 item master / SKU / route truth
- [ ] bygg `ItemMaster`, `SkuVariant`, `InventoryLocation`, `InventoryUnitProfile`, `ItemLifecycleDecision`
- [ ] skapa canonical route family `/v1/supply/*`
- [ ] flytta artikelsanning ur split mellan ÄR, AP och field
- [ ] verifiera route truth lint och canonical item lookup

### Delfas 20.2 procurement request / PO / approval hardening
- [ ] bygg `ProcurementRequest`, `PurchaseOrder`, `PurchaseOrderApproval`, `SupplierCommitmentReceipt`
- [ ] gar inköpsbehov, bestallning och godkännande first-class
- [ ] bind inköp till item master, behovssignal och approval policy
- [ ] verifiera request-to-PO lineage och approval gates

### Delfas 20.3 receipt / putaway / 3-way-match hardening
- [ ] bygg `GoodsReceipt`, `PutawayDecision`, `ReceiptVariance`, `ThreeWayMatchDecision`
- [ ] skilj mottag, leveransavvikelse och AP-matchning i separata receipts
- [ ] blockera bokning av receipt utanför tolerans utan review
- [ ] verifiera partial receipt, variance och 3-way-match

### Delfas 20.4 inventory ledger / reservation / transfer / count hardening
- [ ] bygg `InventoryLedgerEntry`, `InventoryReservation`, `InventoryTransfer`, `InventoryCountSession`, `InventoryAdjustmentReceipt`
- [ ] gar lagerbok first-class och replaybar
- [ ] stöd multi-location, reservation och internfarflyttning
- [ ] verifiera stock math, count lock och adjustment lineage

### Delfas 20.5 fulfillment / shipment / return / RMA hardening
- [ ] bygg `FulfillmentOrder`, `Shipment`, `ReturnOrder`, `RmaCase`, `StorePickupDecision`
- [ ] gar leverans och retur till first-class runtime
- [ ] bind returns till order, receipt, reason och inventory disposition
- [ ] verifiera partial shipment, return receipt och RMA close

### Delfas 20.6 valuation / cost layer / ledger bridge hardening
- [ ] bygg `InventoryCostLayer`, `CostingMethodDecision`, `CogsPostingReceipt`, `InventoryValuationSnapshot`
- [ ] las hur receipt, transfer, fulfillment och return paverkar kostlager och ledger
- [ ] blockera osaker lagerkostnad i live path
- [ ] verifiera cost-layer math och ledger bridge

### Delfas 20.7 replenishment / supplier catalog / reorder hardening
- [ ] bygg `ReorderPolicy`, `ReplenishmentSuggestion`, `SupplierCatalog`, `SupplierPriceAgreement`
- [ ] stöd lead time, min/max, reorder point och supplier catalog
- [ ] farhindra att procurement request skapas utan item- eller supplier-basis
- [ ] verifiera reorder generation och supplier price selection

### Delfas 20.8 doc / runbook / legacy purge
- [ ] skriv explicit keep/rewrite/archive/remove-beslut får AP- och field-inventory-docs
- [ ] skapa canonical runbooks får procurement, warehouse ops, fulfillment och returns
- [ ] hall AP och field som consumers av supply core i stallet får ersättare får den
- [ ] verifiera docs truth lint och legacy archive receipts

## Fas 21

### Delfas 21.1 unified workspace object-model / route truth
- [ ] bygg `WorkspaceItem`, `OperationalRequest`, `Task`, `ApprovalRequest`, `DecisionLogEntry`, `WorkbenchProfile`
- [ ] skapa canonical route family `/v1/workspace/*`
- [ ] flytta primarsanning ur split mellan inbox, notification och domänspecifika request-spar
- [ ] verifiera route truth lint och repository truth

### Delfas 21.2 inbox / request / task hardening
- [ ] bygg first-class requests, tasks, task groups och inbox-materialisering
- [ ] gar create, assign, accept, snooze, complete och reopen first-class
- [ ] bind inbox till workspace items i stallet får fristaende mail-ingest-spar
- [ ] verifiera lifecycle, dedupe och reopen

### Delfas 21.3 approval / delegation / decision hardening
- [ ] bygg `ApprovalStep`, `DelegationGrant`, `DecisionReceipt`, `ApprovalEscalation`
- [ ] gar approvals cross-domain och receipt-drivna
- [ ] stöd delegation, fallback och escalation policy
- [ ] verifiera step order, separation of duties och escalation

### Delfas 21.4 ownership / deadline / reminder hardening
- [ ] bygg `OwnershipAssignment`, `DeadlineProfile`, `ReminderSchedule`, `OverdueSignal`
- [ ] gar owner, due date och overdue status first-class
- [ ] blockera oagda kritiska work items där policy kraver det
- [ ] verifiera ownership enforcement och reminder flow

### Delfas 21.5 exception-center / workbench hardening
- [ ] bygg `ExceptionCase`, `WorkbenchQueue`, `WorkbenchFilterProfile`, `ActionShortcut`
- [ ] gar exception center och workbench till riktig runtime
- [ ] bind exception cases till source objects, severity och required next action
- [ ] verifiera queue truth, filter profiles och action shortcuts

### Delfas 21.6 calendar / mail integration boundary hardening
- [ ] bygg `CalendarLink`, `MailThreadRef`, `OutboundReminderReceipt`, `ScheduleSyncReceipt`
- [ ] las tydlig integrationsgröns mot Microsoft 365/Google i stallet får att bygga egen mailklient
- [ ] stöd moteskoppling, kalenderblocker och reminder-export
- [ ] verifiera sync boundary och ownership-safe calendar linkage

### Delfas 21.7 cross-domain activity / search / action hardening
- [ ] bygg `WorkspaceActivityRef`, `WorkspaceSearchResult`, `CrossDomainActionReceipt`
- [ ] gar cross-domain navigation, action och historik first-class
- [ ] blockera att search och workbench hittar på egen object truth
- [ ] verifiera search/action lineage

### Delfas 21.8 doc / runbook / legacy purge
- [ ] skriv explicit keep/rewrite/archive/remove-beslut får inbox-, notification- och workbench-docs
- [ ] skapa canonical runbooks får workspace approvals, request operations och exception handling
- [ ] flytta gamla docs från malbild till consumer/reference där de inte längre är sanningen
- [ ] verifiera docs truth lint och legacy archive receipts

## Fas 22

### Delfas 22.1 portal object-model / route truth
- [ ] bygg `PortalAccount`, `PortalSession`, `PortalRequest`, `PortalStatusView`, `PortalAccessGrant`
- [ ] skapa canonical route family `/v1/portal/*`
- [ ] separera portal root från specialfallsportaler som frånvaroportal
- [ ] verifiera route truth lint och repository truth

### Delfas 22.2 public form / intake / onboarding hardening
- [ ] bygg `PublicForm`, `FormSubmission`, `IntakePacket`, `OnboardingFlow`
- [ ] gar lead intake, dokumentintake och onboarding first-class
- [ ] bind formular till schema, evidence och handoff till workspace/commercial core
- [ ] verifiera schema locking, submission dedupe och intake lineage

### Delfas 22.3 external account / session / access grant hardening
- [ ] bygg `PortalIdentity`, `PortalSession`, `PortalAccessGrant`, `PortalRoleBinding`, `PortalInvite`
- [ ] gar extern auth, grants och document/status-access first-class
- [ ] blockera oscopead extern atkomst och delad tenant-sanning
- [ ] verifiera grants, expiry och revoke

### Delfas 22.4 portal document / message / status hardening
- [ ] bygg `PortalDocumentGrant`, `PortalMessageThread`, `PortalStatusFeed`, `PortalUploadReceipt`
- [ ] stöd dokumentdelning, meddelanden och statusvyer per extern part
- [ ] bind allt till explicit access grant och retention policy
- [ ] verifiera masking, revoke och audit trail

### Delfas 22.5 signing / signature evidence / reminder hardening
- [ ] bygg `SignatureRequest`, `SignerJourney`, `SignatureReminder`, `SignatureEvidenceRef`, `SignatureExpiryDecision`
- [ ] gar signering och signeringsevidens till first-class portalflöde
- [ ] bind signature archive till riktig request-lifecycle med reminder, expiry och revoke
- [ ] verifiera signing lineage, evidence linkage och expiry

### Delfas 22.6 booking / request / self-service action hardening
- [ ] bygg `PortalBookingRequest`, `PortalRescheduleRequest`, `PortalStatusAction`, `PortalCancellationDecision`
- [ ] stöd extern bokning, ombokning, avbokning och self-service requests
- [ ] las hur externa actions oversätts till delivery/workspace commands
- [ ] verifiera action lineage och policy block

### Delfas 22.7 tenant isolation / branding / fraud / rate-limit hardening
- [ ] bygg `PortalBrandProfile`, `PortalRateLimitPolicy`, `PortalFraudSignal`, `PortalIsolationReceipt`
- [ ] gar branding, rate limiting och fraud detection first-class
- [ ] blockera cross-tenant leakage, brute force och massupload abuse
- [ ] verifiera isolation, rate limit och fraud escalation

### Delfas 22.8 doc / runbook / legacy purge
- [ ] skriv explicit keep/rewrite/archive/remove-beslut får absence-portal- och signing-docs
- [ ] skapa canonical runbooks får form intake, portal access och signing
- [ ] hall signing archive och specialfallsportaler som consumers till portal core
- [ ] verifiera docs truth lint och legacy archive receipts

## Fas 23

### Delfas 23.1 asset / fleet object-model / route truth
- [ ] bygg `OperationalAsset`, `FleetVehicle`, `EquipmentUnit`, `AssetLifecycleDecision`, `AssetFinancialLink`
- [ ] skapa canonical route family `/v1/assets/*`
- [ ] separera operativa assets från finansiella asset cards
- [ ] verifiera route truth lint och asset-to-ledger linkage

### Delfas 23.2 assignment / location / lifecycle hardening
- [ ] bygg `AssetAssignment`, `AssetLocation`, `AssetStatusReceipt`, `AssetAvailabilityWindow`
- [ ] stöd ansvarig, plats, status och tillganglighet
- [ ] blockera oklara asset transfers utan receipt
- [ ] verifiera assignment, relocation och lifecycle transitions

### Delfas 23.3 maintenance plan / inspection / fault hardening
- [ ] bygg `MaintenancePlan`, `InspectionChecklist`, `FaultCase`, `MaintenanceOrder`, `MaintenanceCompletionReceipt`
- [ ] gar serviceintervall, inspektion och felanmalan first-class
- [ ] bind maintenance till asset, schedule och evidence
- [ ] verifiera plan generation, fault escalation och completion

### Delfas 23.4 vehicle / fleet / usage / compliance hardening
- [ ] bygg `VehicleProfile`, `UsageLog`, `FleetComplianceRecord`, `ServiceIntervalSignal`
- [ ] stöd fordonsspecifik compliance, usage och servicebehov
- [ ] blockera fordon som inte är compliance-klara från bokning där policy kraver det
- [ ] verifiera fleet compliance och usage lineage

### Delfas 23.5 reservation / booking / allocation hardening
- [ ] bygg `AssetReservation`, `EquipmentBooking`, `AllocationDecision`, `ConflictReceipt`
- [ ] stöd bokning av verktyg, fordon och utrustning till leverans- eller projektflöden
- [ ] blockera dubbelbokning och felaktig tilldelning
- [ ] verifiera reservation, allocation och conflict handling

### Delfas 23.6 asset cost / depreciation / ledger bridge hardening
- [ ] bygg `AssetCostSnapshot`, `AssetExpenseReceipt`, `AssetDepreciationBridge`, `AssetValuationSnapshot`
- [ ] länka operativa assets till finansiella asset cards där relevant
- [ ] skilj operativt asset-event från finansiell posting
- [ ] verifiera ledger bridge och avskrivningskoppling

### Delfas 23.7 vendor service / history / evidence hardening
- [ ] bygg `VendorServiceEvent`, `WarrantyProfile`, `AssetEvidenceRef`, `ExternalServiceReceipt`
- [ ] stöd extern servicehistorik, garanti och dokumentevidens
- [ ] bind vendor service till maintenance och cost lineage
- [ ] verifiera vendor history och evidence linkage

### Delfas 23.8 doc / runbook / legacy purge
- [ ] skriv explicit keep/rewrite/archive/remove-beslut får asset- och depreciation-docs
- [ ] skapa canonical runbooks får maintenance, fleet ops och equipment allocation
- [ ] hall fixed-assets-doc som finansiell consumer doc
- [ ] verifiera docs truth lint och legacy archive receipts

## Fas 24

### Delfas 24.1 group hierarchy / multi-company root / route truth
- [ ] bygg `CompanyGroup`, `GroupMembership`, `IntercompanyPolicy`, `GroupGovernanceReceipt`
- [ ] skapa canonical route family `/v1/group/*`
- [ ] gar bolagsgrupp first-class i stallet får implicit tenantlista
- [ ] verifiera route truth lint och group lineage

### Delfas 24.2 intercompany counterparties / policy hardening
- [ ] bygg `IntercompanyCounterparty`, `IntercompanyAgreement`, `IntercompanyPricingPolicy`, `IntercompanyApprovalProfile`
- [ ] gar relationen mellan bolag explicit och policyburen
- [ ] blockera fria interna transaktioner utan definierad counterparty-policy
- [ ] verifiera counterparty policy och approval gates

### Delfas 24.3 intercompany order / invoice / settlement hardening
- [ ] bygg `IntercompanyOrder`, `IntercompanyInvoice`, `IntercompanySettlement`, `IntercompanyMismatchCase`
- [ ] stöd order-to-invoice-to-settlement mellan bolag med receipt lineage
- [ ] gar mismatch och counterpart rejects first-class
- [ ] verifiera intercompany lifecycle och mismatch handling

### Delfas 24.4 treasury / cash position / payment governance hardening
- [ ] bygg `TreasuryAccount`, `CashPositionSnapshot`, `IntercompanyLoan`, `TreasuryTransferDecision`
- [ ] gar cash governance och interna pengaflöden first-class
- [ ] blockera treasury actions utan rätt owner/approval
- [ ] verifiera cash position, transfer och treasury approval

### Delfas 24.5 shared services / allocation / elimination input hardening
- [ ] bygg `SharedServiceAllocationPlan`, `AllocationExecutionReceipt`, `EliminationInput`, `ConsolidationBridgeRef`
- [ ] gar allokering och elimination inputs first-class
- [ ] bind shared service-costs till tydlig allocation policy
- [ ] verifiera allocation lineage och elimination input completeness

### Delfas 24.6 owner governance / board / dividend bridge hardening
- [ ] bygg `BoardResolution`, `OwnerDecision`, `DividendGovernanceBridge`, `HoldingStructureSnapshot`
- [ ] länka befintlig owner distribution-domän till group governance
- [ ] skilj bolagsbeslut från rena payout-events
- [ ] verifiera board/stamma lineage till dividend decision

### Delfas 24.7 auth / search / reporting boundary hardening
- [ ] bygg `GroupRoleGrant`, `CrossCompanySearchGrant`, `GroupReportingBoundary`, `CompanyScopeReceipt`
- [ ] las vad som får ses och garas över bolagsgrönser
- [ ] blockera tyst cross-company search och mutation
- [ ] verifiera boundary enforcement och audit trail

### Delfas 24.8 doc / runbook / legacy purge
- [ ] skriv explicit keep/rewrite/archive/remove-beslut får owner-distribution-docs och group-spar
- [ ] skapa canonical runbooks får intercompany, treasury och shared-service allocations
- [ ] hall owner-distribution-runbook på owner-distribution-nivå
- [ ] verifiera docs truth lint och legacy archive receipts

## Fas 25

### Delfas 25.1 sales-channel / catalog / route truth
- [ ] bygg `SalesChannel`, `ChannelCatalog`, `ChannelAvailability`, `ChannelCustomerLink`
- [ ] skapa canonical route family `/v1/commerce/*`
- [ ] gar kanaltruth first-class i stallet får implicit downstream i ÄR/inventory
- [ ] verifiera route truth lint och channel lineage

### Delfas 25.2 POS session / checkout / receipt hardening
- [ ] bygg `PosSession`, `PosCart`, `StoreReceipt`, `CashDrawerEvent`, `CashierAssignment`
- [ ] gar kassapass, checkout och receipts first-class
- [ ] blockera osakra kassakorrigeringar och tyst receipt-omskrivning
- [ ] verifiera session lifecycle, checkout och receipt integrity

### Delfas 25.3 ecommerce / marketplace order capture hardening
- [ ] bygg `ChannelOrder`, `ChannelOrderImportReceipt`, `ChannelCustomerIdentity`, `ChannelPaymentReference`
- [ ] stöd e-handel och marketplace orders som first-class channel events
- [ ] bind channel order till commercial order och inventory allocation
- [ ] verifiera import lineage, dedupe och payment reference handling

### Delfas 25.4 omnichannel inventory / allocation / sync hardening
- [ ] bygg `ChannelInventorySnapshot`, `ChannelAllocationDecision`, `ChannelSyncReceipt`, `OversellConflict`
- [ ] stöd kanalvis tillganglighet, allocation och inventory sync
- [ ] blockera oversell och stale channel stock
- [ ] verifiera sync, allocation och oversell handling

### Delfas 25.5 pickup / ship-from-store / store-fulfillment hardening
- [ ] bygg `PickupRequest`, `ShipFromStoreDecision`, `StoreFulfillmentOrder`, `CollectionReceipt`
- [ ] stöd butikshamtning, ship-from-store och store-based fulfillment
- [ ] bind pickup till inventory reservation, customer identity och completion
- [ ] verifiera pickup readiness och collection flow

### Delfas 25.6 return / exchange / store-credit hardening
- [ ] bygg `ChannelReturn`, `ExchangeDecision`, `StoreCredit`, `RefundDecision`
- [ ] gar returns, exchanges och store credits first-class
- [ ] bind dem till inventory, payment och commercial truth
- [ ] verifiera exchange, store credit och refund lineage

### Delfas 25.7 channel pricing / promo / tax hardening
- [ ] bygg `ChannelPricingProfile`, `PromotionRule`, `ChannelTaxProfile`, `PricePublicationReceipt`
- [ ] stöd kanalvis pris, kampanj och skatteprofil
- [ ] blockera otillaten pricing drift mellan kanal och commercial core
- [ ] verifiera pricing publication och promo eligibility

### Delfas 25.8 doc / runbook / legacy purge
- [ ] skriv explicit keep/rewrite/archive/remove-beslut får retail/ecommerce-spar när de skapas
- [ ] skapa canonical runbooks får POS operations, channel sync och returns/exchanges
- [ ] farhindra att ÄR eller inventory docs fortsatter maskera att channel core saknas
- [ ] verifiera docs truth lint och runbook existence lint

## Fas 26

### Delfas 26.1 BOM / recipe / route truth
- [ ] bygg `BillOfMaterials`, `BomVersion`, `RecipeVariant`, `AssemblyProfile`
- [ ] skapa canonical route family `/v1/production/*`
- [ ] gar BOM och recipe till egen object family
- [ ] verifiera route truth lint och BOM lineage

### Delfas 26.2 MRP / material requirements / planning hardening
- [ ] bygg `MaterialRequirementPlan`, `DemandSignal`, `SupplyProposal`, `ProductionPlanningWindow`
- [ ] stöd demand-driven materialbehov och supplyfarslag
- [ ] blockera produktion utan planerad material- och kapacitetsbas
- [ ] verifiera plan generation och rescheduling

### Delfas 26.3 manufacturing order / routing / work center hardening
- [ ] bygg `ManufacturingOrder`, `RoutingVersion`, `WorkCenter`, `ProductionOperation`
- [ ] gar manufacturing orders, routing och work centers first-class
- [ ] bind orderrelease till BOM-version, routing och materialplan
- [ ] verifiera MO lifecycle och routing execution

### Delfas 26.4 material issue / yield / scrap hardening
- [ ] bygg `ProductionMaterialIssue`, `YieldReceipt`, `ScrapDecision`, `ByproductReceipt`
- [ ] stöd issue, consumption, output och scrap i produktionen
- [ ] blockera close utan material/yield-redovisning där policy kraver det
- [ ] verifiera issue/yield/scrap lineage

### Delfas 26.5 quality / deviation / hold hardening
- [ ] bygg `QualityCheck`, `QualityDeviation`, `ProductionHold`, `ReleaseDecision`
- [ ] gar kvalitetskontroller och deviations first-class
- [ ] blockera release av batch eller order vid quality hold
- [ ] verifiera quality hold och release flow

### Delfas 26.6 production cost / WIP / ledger bridge hardening
- [ ] bygg `ProductionCostSnapshot`, `ProductionWipReceipt`, `ManufacturingLedgerBridge`, `VariancePostingReceipt`
- [ ] gar produktionskostnad, WIP och varians first-class
- [ ] bind produktion till inventory cost layers och ledger
- [ ] verifiera WIP/variance/ledger bridge

### Delfas 26.7 subcontracting / kitting / assembly hardening
- [ ] bygg `SubcontractingOrder`, `KitAssembly`, `AssemblyCompletionReceipt`, `ExternalProductionReceipt`
- [ ] stöd kitting, assembly och extern produktion
- [ ] farhindra att assembly lases som fria inventory writes
- [ ] verifiera subcontracting och kit completion

### Delfas 26.8 doc / runbook / legacy purge
- [ ] skriv explicit keep/rewrite/archive/remove-beslut får eventuella kalkyl-/materialdocs som felaktigt används som produktionstruth
- [ ] skapa canonical runbooks får MRP, shop floor, quality och production close
- [ ] verifiera docs truth lint och runbook existence lint

## Fas 27

### Delfas 27.1 invariant catalog / scenario registry hardening
- [ ] bygg `ScenarioCatalog`, `ScenarioFamily`, `ScenarioCase`, `ScenarioCoverageMatrix`
- [ ] gar varje supportad capability mappad till minst ett scenario och alla kanda edge cases
- [ ] blockera saknade scenarier som first-class coverage gaps
- [ ] verifiera registry completeness, duplicate-id deny och coverage matrix generation

### Delfas 27.2 accounting proof ledger / expected outcome model hardening
- [ ] bygg `AccountingProofLedger`, `ExpectedJournalSet`, `ExpectedRegulatoryOutcome`, `ExpectedReportOutcome`, `ExpectedExportOutcome`
- [ ] gar expected postings, expected regulatoriska fält och expected exportutfall blockerande
- [ ] blockera green status vid minsta mismatch i konto, belopp, riktning, period eller tax field
- [ ] verifiera expected-versus-actual diff, rounding deny och report/export mismatch

### Delfas 27.3 accounts receivable scenario matrix hardening
- [ ] bygg exhaustiv ÄR-scenariomatriz får draft, issue, send, partial payment, overpayment, underpayment, credit, partial credit, cancellation, write-off, recurring, project invoice, HUS invoice, foreign currency
- [ ] bind varje scenario till expected ÄR, revenue, VAT, rounding och settlement outcome
- [ ] blockera credits och write-offs utan exakt reversal- och residual-logik
- [ ] verifiera exhaustive ÄR suites, aging parity och invoice-to-payment-to-credit proof

### Delfas 27.4 accounts payable / receipts / OCR scenario matrix hardening
- [ ] bygg exhaustiv AP-/kvitto-/OCR-matriz får PO, non-PO, delmottag, differens, kreditnota, duplikat, mixed VAT, expense reimbursement, company-paid, periodisering, asset purchase, foreign currency
- [ ] bind varje scenario till expected AP, expense, VAT, accrual, asset och review outcome
- [ ] blockera OCR/review-flöden som paverkar ledgern tyst
- [ ] verifiera exhaustive AP suites, OCR review/reclassification och receipt VAT/reimbursement separation

### Delfas 27.5 VAT / banking / tax account scenario matrix hardening
- [ ] bygg komplett matrix får VAT boxes, reporting periods, tax account events, bank matching, split/partial payments, fees, refunds, returns, OCR settlements och HUS tax-account effects
- [ ] bind varje scenario till expected momsruta, bankhandelse, tax account outcome och ledger bridge
- [ ] blockera nettoposter som doljer fees, refunds eller returns
- [ ] verifiera VAT box parity, bank reconciliation och tax-account suites

### Delfas 27.6 payroll / AGI / benefits / travel / pension / garnishment scenario matrix hardening
- [ ] bygg komplett payrollmatriz får manadslan, timlan, bonus, engångsskatt, retro, farmaner, pension, salary exchange, travel, sick pay, vacation, final pay, negative net pay, employee receivable, garnishment, SINK, A-SINK, jämkning, AGI original och rättelse
- [ ] bind varje scenario till expected BAS-lanekonton, AGI-fält, tax decision outcome och bank/payout outcome
- [ ] blockera slutlan, bankretur och receivable-scenarier som saknar explicit proof
- [ ] verifiera exhaustive payroll suites, AGI field-level proof och payroll ledger/payout parity

### Delfas 27.7 HUS / annual / corporate tax / owner distributions scenario matrix hardening
- [ ] bygg komplett matrix får HUS full/partial/credit/reject, annual inputs, corporate-tax inputs, owner distributions, KU31 och kupongskatt där relevant
- [ ] bind varje scenario till expected receivable, liability, tax account, governance och reporting outcome
- [ ] blockera HUS- och owner-scenarier utan full ledger- och governance-proof
- [ ] verifiera exhaustive HUS suites, owner distribution proof och annual/corporate-tax suites

### Delfas 27.8 project / field / WIP / profitability scenario matrix hardening
- [ ] bygg komplett matrix får time/material/cost/revenue/WIP/change-order/field completion/profitability
- [ ] bind varje scenario till expected project, field, inventory, payroll, AP och ÄR lineage
- [ ] blockera dubbelrakning mellan projekt, lager, lan, AP och ÄR
- [ ] verifiera WIP/profitability proof, field-to-invoice-to-ledger och commercial handoff suites

### Delfas 27.9 export / report / SIE4 parity hardening
- [ ] bygg `ReportParitySuite`, `ExportParitySuite`, `SieProofBundle`
- [ ] gar huvudbok, verifikationslista, momsrapport, reskontror, AGI-underlag och SIE4 blockerande parity-artefakter
- [ ] blockera export eller rapport som inte exakt matchar intern truth
- [ ] verifiera SIE4 roundtrip proof, report-to-ledger parity och artifact checksums

### Delfas 27.10 migration / correction / replay parity hardening
- [ ] gar samma scenariomatriz karbar på native, migrerad, corrected och replayed data
- [ ] bind post-cutover diff, corrections och replay till canonical proof ledger
- [ ] blockera dubbla postings, falsk report drift och post-cutover mismatch
- [ ] verifiera migration parity, correction/replay proof och post-cutover accounting parity

### Delfas 27.11 official-source baseline / BAS-account mapping hardening
- [ ] bygg `OfficialSourcePack`, `BasAccountMappingSet`, `RegulatoryFieldMappingSet`
- [ ] las officiella källor, BAS-konton, lanekonton, AGI-fält, momsrutor och OCR-/bank-/SIE-regler per scenariofamilj
- [ ] blockera scenarier utan explicit source pack eller account map
- [ ] verifiera source-pack completeness, missing-source deny och mapping supersession

### Delfas 27.12 execution harness / blocker governance / coverage gates hardening
- [ ] bygg `ScenarioExecutionRun`, `ScenarioFailureRecord`, `CoverageGapRecord`, `ScenarioReadinessVerdict`, `ScenarioProofBundle`
- [ ] gar failed scenario eller missing coverage blockerande får readiness
- [ ] bind build ref, source-pack refs, scenario ids och artifact hashes till proof bundle
- [ ] verifiera harness orchestration, severity propagation och readiness deny

### Delfas 27.13 doc / runbook / legacy purge och slutlig scenario signoff
- [ ] skriv explicit keep/rewrite/archive/remove-beslut får aldre verification-docs och runbooks
- [ ] skapa canonical runbooks får scenario execution, mismatch triage, accounting signoff, export parity och replay parity
- [ ] blockera green status utan named signers från finance, payroll, tax och operations där relevant
- [ ] verifiera docs truth lint, runbook existence lint och signoff completeness

## Fas 28

### Delfas 28.1 stress invariant catalog / peak-window profiles hardening
- [ ] bygg `StressScenarioCatalog`, `PeakWindowProfile`, `InvariantSuite`, `TenantMixProfile`
- [ ] skapa peakprofiler får momsdag, AGI-dag, lanekarningsdag, HUS-peak, annual close, massimport och migreringshelg
- [ ] gar whole-system invariants blockerande under peak
- [ ] verifiera stress catalog completeness, peak-profile completeness och invariant registration

### Delfas 28.2 load / concurrency / contention harness hardening
- [ ] bygg `LoadProfile`, `ConcurrencyProfile`, `ContentionPlan`, `LoadExecution`
- [ ] gar samtidiga writes, numbering, settlements, reviews och payouts verifierbara under contention
- [ ] blockera duplicate writes, duplicate payouts, duplicate submissions och truth drift under concurrency
- [ ] verifiera concurrent mutation, idempotency under retry och contention deny suites

### Delfas 28.3 financial and regulatory truth under load hardening
- [ ] bygg peak-sviter får ÄR, AP, VAT, banking, payroll, AGI, HUS, annual och exports
- [ ] bind Domän 27:s expected outcomes som canonical referens även under load
- [ ] blockera ledger-, report-, export- eller regulatory drift under peak
- [ ] verifiera payroll peak, VAT/banking peak, HUS/annual peak och export parity under load

### Delfas 28.4 provider / network / callback / worker chaos hardening
- [ ] bygg `FailureInjectionPlan`, `ProviderChaosProfile`, `CallbackDuplicatePlan`, `WorkerCrashPlan`, `QueueBacklogProfile`
- [ ] injicera timeout, 429, partial success, duplicate callback, worker crash, queue lag och DB-/network-beteenden
- [ ] blockera orphan truth, osynlig datafarlust och tyst duplicate handling
- [ ] verifiera provider timeout, duplicate callback, worker crash och queue backlog suites

### Delfas 28.5 replay / restore / rebuild / recovery under load hardening
- [ ] bygg `RecoveryStressRun`, `ReplayUnderLoadProfile`, `RestoreUnderLoadProfile`, `RebuildUnderLoadProfile`
- [ ] bevisa replay, restore drill, projection rebuild och checkpoint recovery under press
- [ ] blockera stale checkpoints, duplicate replay effects och recovery drift
- [ ] verifiera replay under load, restore under load och rebuild under backlog suites

### Delfas 28.6 adversarial security / abuse / cross-tenant resistance hardening
- [ ] bygg `AdversarialScenario`, `AbuseProfile`, `IsolationAttackCase`, `ApprovalBypassCase`, `PortalAbuseCase`, `WebhookAbuseCase`
- [ ] gar cross-tenant read/write-farsak, reveal misuse, break-glass misuse, stale session reuse, brute-force och webhook abuse blockerande
- [ ] bind abuse under load och abuse i vila till samma readinessmodell
- [ ] verifiera cross-tenant abuse, rate-limit/brute-force, approval/reveal misuse och webhook abuse suites

### Delfas 28.7 operational overload / incident storm / no-go board hardening
- [ ] bygg `OperationalStormProfile`, `OperatorLoadBudget`, `NoGoDecisionExercise`
- [ ] simulera incident storms, dead-letter storms, support-case spikes och no-go-beslut under press
- [ ] blockera beroende av heroisk manuell drift
- [ ] verifiera multi-incident storm, operator overload och no-go exercise suites

### Delfas 28.8 degradation / quarantine / kill-switch / safe-mode hardening
- [ ] bygg `DegradationDecision`, `SafeModeProfile`, `KillSwitchExercise`, `QuarantineExercise`
- [ ] gar read-only, payout stop, submission stop, replay stop, migration hold och full quarantine first-class verifieringsobjekt
- [ ] blockera degradation som skapar tvetydig state eller collateral leakage
- [ ] verifiera safe-mode transitions, kill-switch integrity och quarantine boundaries

### Delfas 28.9 migration / cutover / rollback under stress hardening
- [ ] bygg `CutoverStressProfile`, `RollbackStressProfile`, `ParallelRunStressProfile`, `MigrationPressureOutcome`
- [ ] bevisa migration, cutover, rollback och parallel run under realistisk backlogg och extern eventtrafik
- [ ] blockera rollback utan deterministic diff-verdict eller med post-cutover drift
- [ ] verifiera cutover under load, rollback under load och parallel-run under pressure suites

### Delfas 28.10 evidence / readiness verdict / doc purge och slutlig stress signoff
- [ ] bygg `StressProofBundle`, `StressReadinessVerdict`, `StressRunbookExecution`
- [ ] bind build ref, artifact digest, stressprofiler, failed findings och signers till readiness verdict
- [ ] skriv explicit keep/rewrite/archive/remove-beslut får aldre resilience-, restore- och ops-docs
- [ ] verifiera proof-bundle completeness, readiness verdict och docs truth lint

## Definition Of Done

- [ ] Domen- och masterdokumenten speglar varandra 1:1
- [ ] inga gamla bindande docs styr längre
- [ ] alla cleanup-beslut är explicita
- [ ] inga placeholders eller falska green signals är omarkerade
- [ ] varje senare domän startar från verifierad Domän 0-sanning


