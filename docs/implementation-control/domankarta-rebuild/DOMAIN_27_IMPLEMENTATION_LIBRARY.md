# DOMAIN_27_IMPLEMENTATION_LIBRARY

## mal

Fas 27 ska bygga den canonical verifieringsdomän som gör att systemet inte bara fungerar i kod utan är bevisat korrekt i varje supportat scenario med exakt bokföring, exakt regulatoriskt utfall och exakt rapport-/exportparitet.

Libraryt speglar roadmapen 1:1 och definierar exakt hur scenario-sanning, expected outcomes, execution, mismatch-hantering och signoff ska byggas.

## bindande tvärdomänsunderlag

- `UTLAGG_OCH_VIDAREFAKTURERING_BINDANDE_SANNING.md` är obligatorisk canonical source för alla employee outlay-, customer disbursement-, reinvoice-, advance-, owner-related- och reimbursementscenarier i Domän 27.
- `KUNDINBETALNINGAR_OCH_KUNDRESKONTRA_BINDANDE_SANNING.md` är obligatorisk canonical source för alla customer open-item-, incoming payment-, overpayment-, customer advance-, PSP-, factoring-, dispute- och refundscenarier i Domän 27.
- `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md` är obligatorisk canonical source för alla ingest-, OCR-, duplicate-, routing-, confidence- och reviewscenarier i Domän 27.
- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` är obligatorisk canonical source för evidence bundles, approvals, sign-off packages, support reveal, break-glass events och operatorbeslut i Domän 27.
- `MIGRATION_PARALLELLKORNING_CUTOVER_OCH_ROLLBACK_BINDANDE_SANNING.md` är obligatorisk canonical source för source bindings, capability receipts, extract manifests, import batches, parallel run, cutover, watch window, rollback och fail-forward i Domän 27.
- `SCENARIOPROOF_OCH_BOKFORINGSBEVIS_BINDANDE_SANNING.md` är obligatorisk canonical source för scenario registry, fixtureklasser, expected outcomes, mismatch governance, proof bundles och accounting signoff i Domän 27.
- `STRESS_CHAOS_RECOVERY_OCH_ADVERSARIAL_BINDANDE_SANNING.md` är obligatorisk canonical source för load profiles, chaos experiments, recovery drills, adversarial scenarios, stop conditions och readiness verdicts i Domän 27 och 28.
- `SEARCH_ACTIVITY_NOTIFICATIONS_OCH_WORKBENCHES_BINDANDE_SANNING.md` är obligatorisk canonical source för search/workbench visibility, activity timelines, notifications och freshnessproof i Domän 27.
- `BOKFORINGSSIDA_OCH_FINANCIAL_WORKBENCH_BINDANDE_SANNING.md` är obligatorisk canonical source för bokföringssidan, financial workbench, snapshot-/as-of-scope, state badges, drilldowns, export-CTA, masking, reveal och accounting-sidans expected read behavior i Domän 27.
- `DIMENSIONER_OBJEKT_OCH_SIE_MAPPNING_BINDANDE_SANNING.md` är obligatorisk canonical source för dimensionstyper, objekttyper, obligatoriska dimensionsregler, objektmappning, SIE-objektfamiljer och roundtrip utan informationsförlust i Domän 27.
- `SUPPORT_BACKOFFICE_INCIDENTS_OCH_REPLAY_BINDANDE_SANNING.md` är obligatorisk canonical source för support, incident, replay, dead-letter, no-go och quarantine-scenarier i Domän 27.
- `BAS_KONTOPOLICY_BINDANDE_SANNING.md` är obligatorisk canonical source för BAS-kontofamiljer, defaultkonton, control accounts och blocked overrides i Domän 27.
- `BAS_LONEKONTOPOLICY_BINDANDE_SANNING.md` är obligatorisk canonical source för BAS-lönekonton, payroll-liability-ankare, accrual anchors och employee-receivable-kontoankare i Domän 27.
- `MOMSRUTEKARTA_BINDANDE_SANNING.md` är obligatorisk canonical source för momsrutekarta, reverse-charge box mapping, importboxar, replacement declarations och VAT box lineage i Domän 27.
- `SKATTEKONTOMAPPNING_BINDANDE_SANNING.md` är obligatorisk canonical source för `1630`-mirror, authority-event-klassning, payroll/VAT-clearing mot skattekonto, HUS/grön-offsets och blocked unknown authority events i Domän 27.
- `VERIFIKATIONSSERIER_OCH_BOKFORINGSPOLICY_BINDANDE_SANNING.md` är obligatorisk canonical source för verifikationsserier, voucher identity, reservationsluckor, correction policy, posting date policy och SIE4-serieparitet i Domän 27.
- `VALUTA_OMRAKNING_OCH_KURSDIFFERENS_BINDANDE_SANNING.md` är obligatorisk canonical source för redovisningsvaluta, rate-source policy, omräkningsdatum, FX gain/loss, period-end valuation och rounding i Domän 27.
- `LEGAL_REASON_CODES_OCH_SPECIALTEXTPOLICY_BINDANDE_SANNING.md` är obligatorisk canonical source för legal reason codes, specialtexter, 0%-anledningar, reverse-charge-texter, HUS/grön claim-basis och blocked issuance utan legal basis i Domän 27.

- `FAKTURAFLODET_BINDANDE_SANNING.md` är obligatorisk canonical source för alla invoice-scenarier i Domän 27.
- `LEVFAKTURAFLODET_BINDANDE_SANNING.md` är obligatorisk canonical source för alla supplier-invoice-, supplier-credit-, import- och purchase-VAT-scenarier i Domän 27.
- `LEVERANTORSBETALNINGAR_OCH_LEVERANTORSRESKONTRA_BINDANDE_SANNING.md` är obligatorisk canonical source för alla leverantörsreskontra-, supplier-advance-, AP-payment-, AP-return-, fee-, FX-, netting- och other supplier-settlement-scenarier i Domän 27.
- `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md` är obligatorisk canonical source för alla bankkonto-, statementimport-, owner-binding-, bankavstämnings-, fee-, interest-, internal-transfer-, duplicate- och blocked-bankline-scenarier i Domän 27.
- `MOMSFLODET_BINDANDE_SANNING.md` är obligatorisk canonical source för alla momsscenarier i Domän 27, inklusive box truth, periodisk sammanställning, OSS, replacement declarations, importmoms, avdragsrätt och `BOX49`-integritet.
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` är obligatorisk canonical source för alla voucher-, grundbok-, huvudbok-, verifikationsserie-, kontrollkonto-, correction chain-, period lock- och SIE4-voucherscenarier i Domän 27.
- `PERIODISERING_OCH_BOKSLUTSOMFORINGAR_BINDANDE_SANNING.md` är obligatorisk canonical source för alla upplupet-, förutbetalt-, cutoff-, closing-adjustment-, reversal- och simplification-scenarier i Domän 27.
- `ANLAGGNINGSTILLGANGAR_OCH_AVSKRIVNINGAR_BINDANDE_SANNING.md` är obligatorisk canonical source för alla capitalization-, depreciation-, impairment-, disposal-, CIP- och fixed-asset-note-scenarier i Domän 27.
- `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md` är obligatorisk canonical source för alla inventory valuation-, count shortage/surplus-, inkurans-, ownership boundary-, varukostnads- och blocked LIFO/negative-stock-scenarier i Domän 27.
- `INKOP_VARUMOTTAG_OCH_LEVERANSMATCHNING_BINDANDE_SANNING.md` är obligatorisk canonical source för alla procurement request-, PO-, goods receipt-, ownership acceptance-, 2-way/3-way match-, invoice-before-receipt-, damaged receipt- och duplicate receipt-scenarier i Domän 27.
- `ORDER_OFFERT_AVTAL_TILL_FAKTURA_BINDANDE_SANNING.md` är obligatorisk canonical source för alla quote-, agreement-, order-, change-order-, billing-trigger-, cancellation- och invoice-handoff-scenarier i Domän 27.
- `PROJEKT_WIP_INTAKTSAVRAKNING_OCH_LONSAMHET_BINDANDE_SANNING.md` är obligatorisk canonical source för alla project root-, WIP-, recognition-, billable readiness- och profitability-scenarier i Domän 27.
- `ARBETSORDER_TID_MATERIAL_OCH_FAKTURERBARHET_BINDANDE_SANNING.md` är obligatorisk canonical source för alla work-order-, time capture-, material capture-, signoff-, billable evidence- och invoice-handoff-scenarier i Domän 27.
- `KVITTOFLODET_BINDANDE_SANNING.md` är obligatorisk canonical source för alla receipt capture-, receipt posting-, representation-, personbil-, duplicate-, refund- och receipt-VAT-scenarier i Domän 27.
- `LONEFLODET_BINDANDE_SANNING.md` är obligatorisk canonical source för alla pay calendar-, payroll input snapshot-, pay run-, payslip-, correction-, final pay-, employee receivable-, payout readiness- och payroll replay-scenarier i Domän 27.
- `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md` är obligatorisk canonical source för alla pay item catalog-, line effect class-, BAS-lönekonto-, liability anchor-, deduction anchor-, receivable anchor- och payroll accrual-scenarier i Domän 27.
- `PRELIMINARSKATT_OCH_SKATTETABELLER_BINDANDE_SANNING.md` är obligatorisk canonical source för alla ordinary table-, one-time tax-, jämkning-, SINK-, A-SINK-, no-tax certificate- och emergency-manual-scenarier i Domän 27.
- `ARBETSGIVARAVGIFTER_OCH_SPECIALREGLER_BINDANDE_SANNING.md` är obligatorisk canonical source för alla full-rate-, 67+-, 1937- eller tidigare-, youth-reduction-, växa- och international-special-case-scenarier i Domän 27.
- `FORMANER_OCH_FORMANSBESKATTNING_BINDANDE_SANNING.md` är obligatorisk canonical source för alla benefit classification-, taxable-vs-tax-free-, valuation-, ownership- och no-double-booking-scenarier i Domän 27.
- `RESOR_TRAKTAMENTE_OCH_MILERSATTNING_BINDANDE_SANNING.md` är obligatorisk canonical source för alla tjänsterese-, traktaments-, meal-reduction-, tremanaders-, milersättnings- och travel-handoff-scenarier i Domän 27.
- `PENSION_OCH_LONEVAXLING_BINDANDE_SANNING.md` är obligatorisk canonical source för alla pensionspremie-, salary-exchange-, top-up-, special-pension-tax- och pension-handoff-scenarier i Domän 27.
- `SEMESTER_SEMESTERSKULD_OCH_SEMESTERERSATTNING_BINDANDE_SANNING.md` är obligatorisk canonical source för alla semesterårs-, intjänings-, sparad-dag-, sammalon-, procentregel-, förskottssemester-, semesterersättnings- och semesterskuldsscenarier i Domän 27.
- `SJUKLON_KARENS_OCH_FRANVARO_BINDANDE_SANNING.md` är obligatorisk canonical source för alla sjukperiod-, karens-, deltidsfrånvaro-, läkarintyg-, högriskskydds- och dag-15-transition-scenarier i Domän 27.
- `LONEUTMATNING_OCH_ANDRA_MYNDIGHETSAVDRAG_BINDANDE_SANNING.md` är obligatorisk canonical source för alla löneutmatnings-, authority-order-, remittance-, irregular-payout- och blocked-authority-scenarier i Domän 27.
- `NEGATIV_NETTOLON_OCH_EMPLOYEE_RECEIVABLE_BINDANDE_SANNING.md` är obligatorisk canonical source för alla negativ-netto-, employee-receivable-, payroll-settlement-, bankrepayment- och blocked-setoff-scenarier i Domän 27.
- `LONEUTBETALNING_OCH_BANKRETURER_BINDANDE_SANNING.md` är obligatorisk canonical source för alla payout-batch-, settlement-, partial-batch-, bankretur- och liability-reopen-scenarier i Domän 27.
- `AGI_FLODET_BINDANDE_SANNING.md` är obligatorisk canonical source för alla AGI-period-, huvuduppgifts-, individuppgifts-, receipt-, correction-, removal- och absence-transfer-scenarier i Domän 27.
- `AGI_FALTKARTA_OCH_RATTELSER_BINDANDE_SANNING.md` är obligatorisk canonical source för alla AGI-faltrute-, skattefalta-, huvuduppgiftssumme-, fuel-benefit-, checkbox- och unsupported-mapping-scenarier i Domän 27.
- `ROT_RUT_HUS_FLODET_BINDANDE_SANNING.md` är obligatorisk canonical source för alla HUS-overlay-, split-invoice-, payment-gate-, claim-, decision-, payout-, tax-account-offset-, denial- och recovery-scenarier i Domän 27.
- `GRON_TEKNIK_FLODET_BINDANDE_SANNING.md` är obligatorisk canonical source för alla grön-teknik-overlay-, split-invoice-, installationstype-, payment-gate-, claim-, payout-, tax-account-offset-, cash-method-VAT-, denial- och recovery-scenarier i Domän 27.
- `ARSBOKSLUT_ARSREDOVISNING_OCH_INK2_BINDANDE_SANNING.md` är obligatorisk canonical source för alla hard-close-, årsredovisnings-, fastställelseintygs-, INK2-, uppskjuten-skatt- och filing-scenarier i Domän 27.
- `AGARUTTAG_UTDELNING_KU31_OCH_KUPONGSKATT_BINDANDE_SANNING.md` är obligatorisk canonical source för alla utdelningsbesluts-, owner-equity-source-, KU31-, kupongskatte-, avstämningsbolags- och owner-payout-scenarier i Domän 27.
- `SIE4_IMPORT_OCH_EXPORT_BINDANDE_SANNING.md` är obligatorisk canonical source för alla SIE type 4-, voucherexport-, voucherimport-, `#RAR`-, `#KONTO`-, `#VER`-, `#TRANS`-, dimensionsmetadata- och parity-evidence-scenarier i Domän 27.
- `RAPPORTER_MOMS_AGI_RESKONTRA_HUVUDBOK_BINDANDE_SANNING.md` är obligatorisk canonical source för alla momsrapport-, periodisk-sammanställnings-, AGI-underlags-, reskontra-, huvudboks-, verifikationsliste- och financial-statement-scenarier i Domän 27.
- `PEPPOL_EDI_OCH_OFFENTLIG_EFAKTURA_BINDANDE_SANNING.md` är obligatorisk canonical source för alla Peppol BIS Billing 3-, offentlig-e-faktura-, endpoint-, transport-receipt-, duplicate- och structured-inbound-scenarier i Domän 27.
- `OCR_REFERENSER_OCH_BETALFORMAT_BINDANDE_SANNING.md` är obligatorisk canonical source för alla OCR-, checksiffre-, Bg Max-, incoming-payment-file-, supplier-payment-file-, salary-payment-file- och provider-version-scenarier i Domän 27.
- `PARTNER_API_WEBHOOKS_OCH_ADAPTERKONTRAKT_BINDANDE_SANNING.md` är obligatorisk canonical source för alla partner-API-, adapterkontrakts-, webhook-, callback-, signature-, duplicate- och schema-versionsscenarier i Domän 27.
- `IDENTITET_AUTH_MFA_OCH_BEHORIGHET_BINDANDE_SANNING.md` är obligatorisk canonical source för alla auth-, MFA-, session-, passkey-, OIDC-, SAML-, permission-, support-reveal- och step-up-scenarier i Domän 27.
- `SECRETS_KMS_HSM_OCH_KRYPTERING_BINDANDE_SANNING.md` är obligatorisk canonical source för alla secrets-, key-lineage-, KMS-, HSM-, envelope-encryption-, decrypt-boundary- och rotation-scenarier i Domän 27.
- Domän 27 får inte uppfinna egna fakturascenarier, egna kontoutfall eller egna momsutfall som avviker från fakturabibeln; den får bara bryta ned, exekvera och verifiera dem.

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
  - frånvaro av scenario för en supportad capability är en blockerande coverage gap, inte en neutral status
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
  - scenario får inte ga till `ready` utan expected journal lines där bokföring ska ske
  - expected journal line måste röra konto, debet/kredit, belopp, period, currency och lineage ref
  - toleranspolicy för aldrig dolja konto- eller faltfel; endast uttryckligt tillåtna avrundningsregler för finnas
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
  - ÄR-scenario måste röra expected customer balance, revenue recognition, VAT outcome, payment settlement och residual status
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
  - AP-scenario måste röra expected supplier balance, cost posting, VAT treatment, accrual/prepaid handling och review lineage
  - OCR confidence för aldrig ersätta explicit review decision där policy kraver review
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
  - varje payrollscenario måste röra expected gross/net, tax, employer contribution, AGI fields, payout outcome och BAS-lanekonton
  - SINK, A-SINK och jämkning måste vara separata scenariofamiljer
  - slutlan, negative net pay och bankretur får inte lamnas som fria manuella efterflöden
- officiella regler och källor:
  - [Skatteverket: Arbetsgivardeklaration inlamning, teknisk tjänstebeskrivning](https://www7.skatteverket.se/portal-wapi/open/apier-och-oppna-data/utvecklarportalen/v1/getFile/tjanstebeskrivning-agd-inlamning)
  - [Skatteverket: Teknisk beskrivning för skattetabeller](https://www.skatteverket.se/foretag/arbetsgivare/arbetsgivaravgifterochskatteavdrag/skattetabeller/tekniskbeskrivningforskattetabeller.4.319dc1451507f2f99e86ee.html)
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
  - owner distribution måste röra governance lineage, KU31/kupongskatt where relevant och ledger outcome
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
  - lokal tolkning utan kalla eller tydlig interpretation note är förbjuden
- officiella regler och källor:
  - [Skatteverket: Bokföring, bokslut och deklaration SKV 282](https://www.skatteverket.se/download/18.4a4d586616058d860bcc3a8/1708607396861/bokforing-bokslut-och-deklaration-skv282utgava08.pdf)
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
  - green readiness kraver att hela obligatoriska coverage matrix är gran
  - proof bundle måste röra build ref, source pack ref, scenario ids, artifact hashes och verdict
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
  - final signoff måste röra named reviewers från finance, tax, payroll och operations där scenariofamiljen kraver det
  - green doc-status utan scenario refs är förbjuden
- tester:
  - docs truth lint
  - runbook existence lint
  - signoff completeness tests


