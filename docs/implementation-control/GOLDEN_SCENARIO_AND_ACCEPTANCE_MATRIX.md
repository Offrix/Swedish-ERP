> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# GOLDEN_SCENARIO_AND_ACCEPTANCE_MATRIX

Status: Bindande pass/fail-matris för hela plattformen. Inget capability area får anses klart utan att tillämpliga scenarier passerar.

## Acceptance rules

1. Ett scenario passerar bara om alla förväntade commands, events, ledger impacts, receipts, permissions och audit evidence stämmer.
2. Ett scenario får inte anses passerat om UI skulle behöva kompensera för backend-brist.
3. Replay, retry och correction är del av acceptance där relevant.
4. Alla scenarier ska kunna köras deterministiskt med versionspinade rulepacks och provider baselines.

## Scenario template

Varje scenario innehåller:

- Capability area
- Scenario name
- Source objects
- Rulepacks involved
- Expected commands/events
- Expected ledger impact
- Expected tax/AGI/VAT/HUS impact
- Expected receipts
- Expected recovery/correction behavior
- Expected permissions and review path
- Expected audit evidence
- Acceptance criteria
- Exit gate linkage

## Scenarios

### GS-001 — Tenant setup to finance-ready

- Capability area: tenant setup
- Scenario name: New Swedish AB from bootstrap to finance-ready core
- Source objects: TenantBootstrap, CompanySetupProfile, LegalFormProfile, FiscalYearProfile, AccountingMethodProfile, ModuleActivationProfile
- Rulepacks involved:
  - SE-ACCOUNTING-METHOD
  - SE-FISCAL-YEAR
  - SE-LEGAL-FORM-DECLARATION
  - TENANT-MODULE-ACTIVATION-POLICY
- Expected commands/events:
  - tenant bootstrap create
  - legal form activate
  - accounting method activate
  - fiscal year activate
  - finance modules activate
- Expected ledger impact: none
- Expected tax/AGI/VAT/HUS impact: VAT obligations resolved but no return yet
- Expected receipts:
  - activation receipts
  - signoff receipts
- Expected recovery/correction behavior: failed activation produces no partial active module state
- Expected permissions and review path: tenantAdmin initiates; privileged approver approves high-risk activations
- Expected audit evidence: full activation chain
- Acceptance criteria: no hidden manual state; activation dependencies enforced
- Exit gate linkage: tenant setup, module activation

### GS-002 — Supplier invoice import to AP, payment and VAT

- Capability area: procure-to-pay
- Scenario name: OCR document becomes AP invoice, is approved, paid, reconciled and reported in VAT
- Source objects: Document, OcrRun, ImportCase, ApInvoice, PaymentOrder, StatementLine, VatReturn
- Rulepacks involved:
  - SE-VAT-CORE
  - SE-ACCOUNTING-METHOD
  - SE-INVOICE-LEGAL-FIELDS implicit via AP policy
- Expected commands/events:
  - document ocr run
  - import case approve
  - AP invoice create
  - payment order create
  - bank match complete
  - VAT decision create
- Expected ledger impact:
  - AP liability
  - cost/asset
  - input VAT
  - bank clearing/payment
- Expected tax/AGI/VAT/HUS impact: deductible VAT in correct box and period
- Expected receipts:
  - OCR receipt
  - AP approval receipt
  - bank export receipt
  - bank statement import receipt
- Expected recovery/correction behavior: duplicate document blocked; wrong VAT code requires correction chain
- Expected permissions and review path: documentReviewer -> financeApprover
- Expected audit evidence: document hash, review decision, voucher refs
- Acceptance criteria: exact one AP invoice, no duplicate postings, VAT box values correct
- Exit gate linkage: documents, AP, banking, VAT

### GS-003 — Sales quote to invoice to collection to VAT

- Capability area: lead-to-cash
- Scenario name: Domestic B2B sale from invoice issue to bank collection
- Source objects: Customer, SalesDocument, ArInvoice, PaymentLink or BankMatch, VatReturn
- Rulepacks involved:
  - SE-VAT-CORE
  - SE-INVOICE-LEGAL-FIELDS
- Expected commands/events:
  - invoice issue
  - delivery/send
  - payment status receive or bank match
- Expected ledger impact:
  - revenue
  - output VAT
  - customer receivable
  - bank receipt
- Expected tax/AGI/VAT/HUS impact: output VAT in correct box
- Expected receipts:
  - invoice delivery receipt
  - payment or bank receipt
- Expected recovery/correction behavior: credit note produces correction chain and linked VAT correction
- Expected permissions and review path: financeOperator draft, financeApprover issue
- Expected audit evidence: issue approval, invoice version chain
- Acceptance criteria: issue blockers enforce mandatory fields; collection closes receivable
- Exit gate linkage: AR, VAT, payments

### GS-004 — Employee private spend becomes receivable or net deduction

- Capability area: benefits/expense-to-payroll
- Scenario name: Company card private purchase
- Source objects: CardTransaction, Document, BenefitTreatment, PayrollAdjustment
- Rulepacks involved:
  - SE-BENEFITS-CORE
  - SE-PAYROLL-TAX when waived becomes taxable
- Expected commands/events:
  - spend ingest
  - classification decide
  - receivable create or payroll deduction route
- Expected ledger impact:
  - card clearing
  - employee receivable or net deduction clearing
- Expected tax/AGI/VAT/HUS impact: no deductible VAT when private
- Expected receipts: review receipt, settlement receipt
- Expected recovery/correction behavior: waived receivable creates taxable correction route
- Expected permissions and review path: documentReviewer + financeApprover
- Expected audit evidence: private-spend decision reason and evidence
- Acceptance criteria: no company cost booking accepted
- Exit gate linkage: spend, documents, benefits, payroll

### GS-005 — Travel claim with taxable excess

- Capability area: travel
- Scenario name: Domestic overnight trip with taxable excess allowance
- Source objects: TravelClaim, Itinerary, PayrollAdjustment
- Rulepacks involved:
  - SE-TRAVEL-MILEAGE
  - SE-PAYROLL-TAX
- Expected commands/events:
  - travel claim calculate
  - approve
  - route to payroll
- Expected ledger impact:
  - travel reimbursement liability
  - taxable portion payroll posting
- Expected tax/AGI/VAT/HUS impact:
  - tax-free and taxable portions separated
  - AGI taxable fields include taxable excess
- Expected receipts: calculation receipt, approval receipt
- Expected recovery/correction behavior: itinerary correction re-evaluates claim and emits correction line only
- Expected permissions and review path: payrollOperator prepares, payrollApprover approves
- Expected audit evidence: itinerary evidence refs
- Acceptance criteria: exact split between tax-free and taxable
- Exit gate linkage: travel, payroll, AGI

### GS-006 — Monthly payroll with tax table and youth contribution reduction

- Capability area: hire-to-pay
- Scenario name: Ordinary monthly payroll with employee eligible for temporary 2026 contribution reduction
- Source objects: Employment, TimeEntries, TenantAgreementSelection, PayRun
- Rulepacks involved:
  - SE-PAYROLL-TAX
  - SE-EMPLOYER-CONTRIBUTIONS
  - collective agreement rulepack
- Expected commands/events:
  - pay run calculate
  - approve
  - create postings
  - create bank payment preview
- Expected ledger impact:
  - gross salary
  - withheld tax
  - employer contributions
  - net salary liability
- Expected tax/AGI/VAT/HUS impact:
  - correct preliminary tax
  - temporary youth employer contribution 20.81% applied only on compensation up to 25 000 SEK per month when employee falls inside the active statutory age cohort and date window
  - full 31.42% applied on compensation above threshold and outside the active statutory window
  - AGI preview correct
- Expected receipts: pay run approval receipt
- Expected recovery/correction behavior: recalculation after changed time entry creates corrected pay run version
- Expected permissions and review path: payrollOperator -> payrollApprover
- Expected audit evidence: rulepack versions, agreement version, tax profile
- Acceptance criteria: pay run stores tax table baseline and contribution class
- Exit gate linkage: payroll core

### GS-007 — SINK payroll

- Capability area: payroll
- Scenario name: Foreign employee paid under active SINK decision
- Source objects: Employment, SINK decision snapshot, PayRun, AgiSubmission
- Rulepacks involved:
  - SE-PAYROLL-TAX
  - SE-AGI-TRANSPORT
- Expected commands/events:
  - calculate pay
  - approve run
  - create AGI draft
  - submit AGI
- Expected ledger impact:
  - gross pay
  - SINK withholding
  - no ordinary tax table path
- Expected tax/AGI/VAT/HUS impact:
  - SINK 22.5% when applicable
  - AGI reflects SINK treatment
- Expected receipts: AGI technical and material receipts
- Expected recovery/correction behavior: expired SINK decision blocks approval
- Expected permissions and review path: payrollApprover and compliance review when tax profile unusual
- Expected audit evidence: decision snapshot ref
- Acceptance criteria: no ordinary tax path is used
- Exit gate linkage: payroll, AGI

### GS-008 — Garnishment remittance

- Capability area: payroll/Kronofogden
- Scenario name: Active Kronofogden decision reduces net pay and creates remittance
- Source objects: KronofogdenDecisionSnapshot, PayRun, PaymentOrder
- Rulepacks involved:
  - SE-KRONOFOGDEN-PROTECTED-AMOUNT
  - SE-PAYROLL-TAX
- Expected commands/events:
  - calculate protected amount
  - create garnishment deduction
  - create remittance payment order
- Expected ledger impact:
  - garnishment liability
  - remittance clearing
- Expected tax/AGI/VAT/HUS impact: none beyond normal payroll tax
- Expected receipts: remittance export receipt
- Expected recovery/correction behavior: changed decision produces corrected deduction and remittance delta
- Expected permissions and review path: payrollApprover + dual control on changed decision handling
- Expected audit evidence: decision snapshot, remittance receipt
- Acceptance criteria: attachable amount never exceeds allowed amount
- Exit gate linkage: garnishment engine

### GS-009 — AGI correction chain

- Capability area: AGI
- Scenario name: Approved pay run corrected after initial AGI submission
- Source objects: PayRun, AgiSubmission initial, CorrectionRun, AgiSubmission corrected
- Rulepacks involved:
  - SE-AGI-TRANSPORT
  - SE-PAYROLL-TAX
- Expected commands/events:
  - create correction pay run
  - create corrected AGI submission
  - collect receipts
- Expected ledger impact: correction postings only
- Expected tax/AGI/VAT/HUS impact: corrected AGI line set replaces prior through correction chain
- Expected receipts: initial and corrected technical/material receipts
- Expected recovery/correction behavior: no mutation of first submission; chain preserved
- Expected permissions and review path: payrollApprover + compliance signoff
- Expected audit evidence: correction reason and chain id
- Acceptance criteria: both receipts visible and reconciled to payroll state
- Exit gate linkage: AGI correction

### GS-010 — HUS accepted

- Capability area: HUS/ROT/RUT
- Scenario name: ROT invoice paid by customer, claim submitted and accepted
- Source objects: ArInvoice, CustomerPaymentEvidence, HusClaim
- Rulepacks involved:
  - SE-HUS-CORE
  - SE-VAT-CORE
- Expected commands/events:
  - validate payment
  - lock claim
  - export XML / submit direct
  - collect technical receipt
  - collect decision receipt
- Expected ledger impact:
  - customer receivable cleared by payment
  - HUS receivable created
  - upon decision, HUS receivable settled
- Expected tax/AGI/VAT/HUS impact:
  - HUS requested amount matches rulepack
- Expected receipts: technical receipt, decision receipt
- Expected recovery/correction behavior: if duplicate payment evidence or changed labour split, claim blocks and requires correction
- Expected permissions and review path: financeApprover + compliance
- Expected audit evidence: locked submission field snapshot, payment evidence hash
- Acceptance criteria: locked fields cannot change after lock
- Exit gate linkage: HUS

### GS-011 — HUS partial denial and customer debt recovery

- Capability area: HUS/AR
- Scenario name: Claimed amount partially denied and residual debt returned to customer receivable
- Source objects: HusClaim, DecisionReceipt, ArInvoice
- Rulepacks involved:
  - SE-HUS-CORE
- Expected commands/events:
  - decision ingest
  - recovery case create
  - customer debt reopen or debit note create
- Expected ledger impact:
  - reduce expected HUS receivable
  - reopen customer receivable for denied amount
- Expected tax/AGI/VAT/HUS impact: HUS decision recorded as partial denial
- Expected receipts: decision receipt, recovery receipt
- Expected recovery/correction behavior: correction claim possible if facts were wrong
- Expected permissions and review path: financeApprover/compliance
- Expected audit evidence: decision payload hash and recovery link
- Acceptance criteria: customer debt and HUS state reconcile exactly
- Exit gate linkage: HUS recovery

### GS-012 — Tax account reconciliation

- Capability area: tax account
- Scenario name: Imported tax account event matches AGI and VAT obligations
- Source objects: TaxAccountEvent, TaxAccountReconciliation, AgiSubmission, VatReturn
- Rulepacks involved:
  - SE-TAX-ACCOUNT-MAPPING
- Expected commands/events:
  - tax account import
  - reconciliation suggest
  - offset approve
- Expected ledger impact:
  - tax account ledger mirror entries if configured
- Expected tax/AGI/VAT/HUS impact: obligations marked settled
- Expected receipts: import receipt, reconciliation approval receipt
- Expected recovery/correction behavior: unknown event type creates review item instead of silent unmatched state
- Expected permissions and review path: financeOperator -> financeApprover
- Expected audit evidence: mapping baseline version
- Acceptance criteria: unmatched differences visible and explicit
- Exit gate linkage: tax account

### GS-013 — Close to annual reporting package

- Capability area: close and annual
- Scenario name: Closed fiscal year becomes annual reporting package and declaration package
- Source objects: CloseControlSet, LegalFormProfile, AnnualReportingPackage, DeclarationPackage
- Rulepacks involved:
  - SE-FISCAL-YEAR
  - SE-LEGAL-FORM-DECLARATION
- Expected commands/events:
  - close validation
  - annual package create
  - package validate
  - submit Bolagsverket and Skatteverket declaration
- Expected ledger impact: none new except approved adjustments if corrections required
- Expected tax/AGI/VAT/HUS impact: declaration package reflects final balances
- Expected receipts: checksum receipt, technical receipts, filing receipts
- Expected recovery/correction behavior: close reopen creates new package version, not mutation
- Expected permissions and review path: financeApprover + compliance + signatory chain
- Expected audit evidence: signoff chain and package hashes
- Acceptance criteria: package family and legal form obligations match
- Exit gate linkage: annual reporting

### GS-014 — Migration cutover

- Capability area: migration
- Scenario name: Imported finance and payroll data reaches accepted cutover
- Source objects: ImportBatch, VarianceReport, CutoverPlan, PayRun parity set
- Rulepacks involved:
  - TENANT-MODULE-ACTIVATION-POLICY
  - relevant finance and payroll rulepacks
- Expected commands/events:
  - batch import
  - variance generate
  - signoff
  - cutover switch
- Expected ledger impact: opening balances and imported open items only
- Expected tax/AGI/VAT/HUS impact: historical AGI and tax account imported as read-only parity objects
- Expected receipts: import receipts, signoff receipts, cutover receipt
- Expected recovery/correction behavior: rollback before/after switch follows cutover spec
- Expected permissions and review path: migrationLead + domainApprovers + rollbackOwner
- Expected audit evidence: source parity bundle
- Acceptance criteria: no material variance unresolved
- Exit gate linkage: migration and go-live

### GS-015 — Consulting project profitability without work orders

- Capability area: projects
- Scenario name: Consultancy project uses time logs, payroll cost allocation and milestone billing without field/order objects
- Source objects: Project, WorkLog, PayrollAllocation, MilestoneInvoice, ProfitabilitySnapshot
- Rulepacks involved:
  - SE-PROJECT-COST-ALLOCATION
- Expected commands/events:
  - project activate
  - work log approve
  - profitability snapshot materialize
  - invoice milestone
- Expected ledger impact:
  - labor cost allocation
  - revenue recognition basis
- Expected tax/AGI/VAT/HUS impact: output VAT on invoice only
- Expected receipts: snapshot receipt
- Expected recovery/correction behavior: changed time logs produce new profitability snapshot only
- Expected permissions and review path: projectManager + financeApprover for billing
- Expected audit evidence: allocation rulepack version
- Acceptance criteria: no work order object is required
- Exit gate linkage: general projects core

### GS-016 — Service order field-to-invoice

- Capability area: field
- Scenario name: On-site service order with dispatch, materials, signature and invoice
- Source objects: Project, OperationalCase, WorkOrder, DispatchAssignment, MaterialUsage, SignatureRecord, ArInvoice
- Rulepacks involved:
  - SE-PROJECT-COST-ALLOCATION
  - SE-VAT-CORE
- Expected commands/events:
  - dispatch assign
  - start work
  - record materials
  - capture signature
  - mark invoice ready
  - issue invoice
- Expected ledger impact:
  - material cost
  - labor allocation
  - revenue and VAT
- Expected tax/AGI/VAT/HUS impact: standard VAT and payroll cost allocation
- Expected receipts: sync receipts, signature evidence receipt
- Expected recovery/correction behavior: sync conflict blocks invoice-ready until resolved
- Expected permissions and review path: fieldOperator for field actions, financeApprover for invoicing
- Expected audit evidence: device id, timestamps, evidence hashes
- Acceptance criteria: material and labor hit profitability correctly
- Exit gate linkage: field and project coupling

### GS-017 — Personalliggare workplace export

- Capability area: personalliggare
- Scenario name: Construction workplace threshold triggers registration and export chain
- Source objects: Workplace, WorkplaceRegistration, AttendanceEvent, AttendanceExport
- Rulepacks involved:
  - SE-PERSONALLIGGARE-CORE
- Expected commands/events:
  - workplace create
  - threshold evaluate
  - registration record
  - attendance record
  - attendance export
- Expected ledger impact: none
- Expected tax/AGI/VAT/HUS impact: none
- Expected receipts: export receipt
- Expected recovery/correction behavior: correction event creates new chain node and new export
- Expected permissions and review path: personalliggareOperator with trusted device evidence
- Expected audit evidence: employer snapshot, device trust
- Acceptance criteria: construction-specific rules applied through pack, not hard-coded project type
- Exit gate linkage: personalliggare

### GS-018 — ID06 validation with workplace binding

- Capability area: ID06
- Scenario name: Worker card verified against employer and workplace before access-dependent action
- Source objects: Id06CompanyVerification, Id06PersonVerification, Id06CardStatus, WorkplaceBinding
- Rulepacks involved:
  - SE-ID06-VALIDATION
- Expected commands/events:
  - verify company
  - verify person
  - validate card
  - bind workplace
- Expected ledger impact: none
- Expected tax/AGI/VAT/HUS impact: none
- Expected receipts: provider validation receipts
- Expected recovery/correction behavior: stale card status creates refresh requirement, not silent pass
- Expected permissions and review path: id06Coordinator
- Expected audit evidence: validation refs and timestamps
- Acceptance criteria: invalid card blocks action and is visible in profile/workbench
- Exit gate linkage: ID06 pack

### GS-019 — Public API webhook replay

- Capability area: public API
- Scenario name: External client misses webhook deliveries and replays from sequence
- Source objects: WebhookSubscription, WebhookEvent, WebhookDelivery, ReplayPlan
- Rulepacks involved: none
- Expected commands/events:
  - event emit
  - delivery attempts
  - dead-letter or success
  - replay plan create
- Expected ledger impact: none
- Expected tax/AGI/VAT/HUS impact: none
- Expected receipts: delivery receipts, replay receipts
- Expected recovery/correction behavior: replay emits new delivery ids but same event ids
- Expected permissions and review path: tenantAdmin manages subscription
- Expected audit evidence: subscription change and replay approvals
- Acceptance criteria: sequence monotonicity and signature correctness hold
- Exit gate linkage: public API and webhook engine

### GS-020 — Partner operation fallback and replay

- Capability area: integrations
- Scenario name: Payment export provider outage triggers fallback queue and later replay
- Source objects: PartnerConnection, PartnerOperation, AsyncJob, ReplayPlan
- Rulepacks involved: none
- Expected commands/events:
  - operation dispatch
  - outage detect
  - fallback mark
  - replay execution
- Expected ledger impact: none until payment outcome confirmed
- Expected tax/AGI/VAT/HUS impact: none
- Expected receipts: partner operation receipts, replay receipts
- Expected recovery/correction behavior: one final provider reference only after success
- Expected permissions and review path: backofficeAdmin or approved finance operator depending on operation class
- Expected audit evidence: outage and replay chain
- Acceptance criteria: no auto-success while provider down
- Exit gate linkage: partner adapters

### GS-021 — Backoffice impersonation with scope limits

- Capability area: support/backoffice
- Scenario name: Support reads a customer issue through approved read-only impersonation
- Source objects: SupportCase, ImpersonationSession, AuditEvent
- Rulepacks involved: none
- Expected commands/events:
  - support case create
  - approve actions
  - request impersonation
  - approve impersonation
  - terminate impersonation
- Expected ledger impact: none
- Expected tax/AGI/VAT/HUS impact: none
- Expected receipts: impersonation session receipt
- Expected recovery/correction behavior: session auto-terminates on expiry
- Expected permissions and review path: supportOperator request, supportLead/securityAdmin approve
- Expected audit evidence: full session chain and object scopes touched
- Acceptance criteria: no out-of-scope object access possible
- Exit gate linkage: backoffice and security

### GS-022 — Search result to object profile with stale projection repair

- Capability area: search/read-models
- Scenario name: Search hit opens profile and stale projection is rebuilt
- Source objects: SearchDocument, ObjectProfileProjection, RebuildJob
- Rulepacks involved: none
- Expected commands/events:
  - search query
  - detect stale projection
  - request rebuild
  - rebuild receipt
- Expected ledger impact: none
- Expected tax/AGI/VAT/HUS impact: none
- Expected receipts: rebuild receipt
- Expected recovery/correction behavior: repeated rebuild failure creates work item
- Expected permissions and review path: user sees stale marker; rebuild may require backoffice action if repeated failures
- Expected audit evidence: rebuild request and result
- Acceptance criteria: profile opens against correct source version after rebuild
- Exit gate linkage: UI-readiness, search

## Final acceptance rule

The platform is implementation-ready only when every scenario above is green for every active module profile relevant to a tenant category.

## Exit gate

- [ ] Finance, payroll, tax, annual, projects, field, personalliggare, ID06, integrations and backoffice all have golden scenarios.
- [ ] Every scenario defines ledger, receipt, audit and correction expectations.
- [ ] No scenario relies on hidden UI logic.
- [ ] Acceptance matrix can be used directly as CI/CD release gate.
