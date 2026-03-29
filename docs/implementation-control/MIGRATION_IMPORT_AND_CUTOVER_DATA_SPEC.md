> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# MIGRATION_IMPORT_AND_CUTOVER_DATA_SPEC

Status: Bindande dataspec för import, mapping, parity checks, cutover, rollback och post-cutover correction.

## Icke-förhandlingsbara regler

1. Alla importer ska vara spårbara till källsystem, batch, mapping set och target object.
2. Ingen historik får skapas utan källa, hash och load receipt.
3. Importerade historiska objekt är immutable; fel rättas genom correction records eller ny importbatch, inte genom tyst mutation.
4. Material varians stoppar go-live.
5. Efter cutover får inga importer ske direkt mot core-domäner utan migration/cutover context.

## Canonical migration objects

### ImportBatch

- `importBatchId`
- `companyId`
- `sourceSystemCode`
- `datasetCode`
- `batchHash`
- `rowCount`
- `status`
- `receivedAt`
- `mappingSetId`
- `validationSummary`
- `acceptedAt`

State: `received -> validated -> mapped -> imported -> reconciled -> accepted`
Failure branches: `validated -> rejected`, `imported -> correction_required`

### ImportRow

- `importRowId`
- `importBatchId`
- `sourceRowRef`
- `canonicalObjectType`
- `sourcePayloadHash`
- `normalizedPayload`
- `validationStatus`
- `targetObjectRef`
- `errorCodes[]`

### MappingSet

- `mappingSetId`
- `sourceSystemCode`
- `datasetCode`
- `version`
- `status`
- `fieldMappings[]`
- `approvedBy`
- `effectiveForBatches[]`

### VarianceReport

- `varianceReportId`
- `companyId`
- `comparisonScope`
- `differenceClass`
- `materialityLevel`
- `sourceSnapshotRef`
- `targetSnapshotRef`
- `metrics[]`
- `status`

### CutoverEvidenceBundle

- `cutoverEvidenceBundleId`
- `companyId`
- `cutoverPlanId`
- `acceptedVarianceReports[]`
- `signoffRefs[]`
- `sourceParitySummary`
- `rollbackPointRef`

## Dataset catalog

### 1. Company master import

Dataset code: `companyMaster`

Required fields:

- `sourceCompanyRef`
- `legalName`
- `orgNo`
- `registeredAddress`
- `legalFormCode`
- `vatRegistrationStatus`
- `employerRegistrationStatus`

Validation:

- org number format
- uniqueness
- legal form compatibility

Target objects:

- `CompanySetupProfile`
- `LegalFormProfile`

### 2. Chart of accounts import

Dataset code: `chartOfAccounts`

Required fields:

- `accountNo`
- `accountName`
- `accountClass`
- `vatMappingCode`
- `activeFlag`

Validation:

- no duplicate account number
- valid account class
- protected core accounts preserved

Target objects:

- `LedgerAccount`
- `VatMappingReference`

### 3. Dimension import

Dataset code: `dimensions`

Required fields:

- `dimensionType`
- `dimensionCode`
- `dimensionName`
- `activeFlag`

Target objects:

- `LedgerDimension`
- `ProjectDimension` where project dimension type maps

### 4. Opening balances import

Dataset code: `openingBalances`

Required fields:

- `balanceDate`
- `accountNo`
- `dimensionSet`
- `amount`
- `currency`
- `sourceBalanceClass`

Validation:

- sum to source trial balance
- supported currency
- period open for opening entry import

Target objects:

- `OpeningBalanceBatch`
- `JournalEntry` with source class `migration_opening_balance`

### 5. Open AP import

Dataset code: `openApInvoices`

Required fields:

- `supplierExternalRef`
- `invoiceNo`
- `invoiceDate`
- `dueDate`
- `remainingAmount`
- `currency`
- `vatSummary`
- `ledgerAccountMapping`
- `documentRef` optional

Validation:

- supplier exists or maps deterministically
- remaining amount positive
- no duplicate supplier+invoiceNo pair

Target objects:

- `Supplier`
- `ApInvoice`
- `ImportCase`

### 6. Open AR import

Dataset code: `openArInvoices`

Required fields:

- `customerExternalRef`
- `invoiceNo`
- `invoiceDate`
- `dueDate`
- `remainingAmount`
- `currency`
- `vatSummary`
- `husFlag`
- `paymentStatus`

Validation:

- customer map exists
- invoice number uniqueness
- HUS invoice requires labour split if `husFlag = true`

Target objects:

- `Customer`
- `ArInvoice`
- `HusCaseSeed` when relevant

### 7. Bank statement import baseline

Dataset code: `bankStatements`

Required fields:

- `bankAccountRef`
- `statementDate`
- `providerStatementRef`
- `lineRef`
- `bookingDate`
- `valueDate`
- `amount`
- `currency`
- `balanceAfterLine` optional
- `counterparty`
- `message`

Validation:

- line uniqueness
- statement date monotonicity per account
- currency compatible with account

Target objects:

- `StatementImport`
- `StatementLine`

### 8. Tax account history import

Dataset code: `taxAccountHistory`

Required fields:

- `eventDate`
- `eventTypeCode`
- `amount`
- `balanceAfterEvent`
- `externalRef`
- `description`

Validation:

- supported event type or review queue
- chronological consistency

Target objects:

- `TaxAccountEvent`
- `TaxAccountReconciliationSeed`

### 9. Employee master import

Dataset code: `employeeMaster`

Required fields:

- `employeeExternalRef`
- `personNoOrCoordNo`
- `firstName`
- `lastName`
- `employmentCountry`
- `taxResidenceHint`
- `bankAccountRef` optional

Validation:

- identity uniqueness
- personal identity format where present
- masked handling for missing or foreign identity

Target objects:

- `Employee`

### 10. Employment master import

Dataset code: `employmentMaster`

Required fields:

- `employeeExternalRef`
- `employmentExternalRef`
- `employmentTypeCode`
- `startDate`
- `endDate` optional
- `salaryModel`
- `monthlySalary` or `hourlyRate`
- `scheduleRef`
- `agreementSelectionCode`
- `taxProfile`
- `costAllocationDefaults`

Validation:

- active overlap rules
- valid agreement selection
- tax profile completeness

Target objects:

- `Employment`
- `EmploymentContract`
- `TenantAgreementSelection`

### 11. Payroll history and YTD values

Dataset code: `payrollHistory`

Required fields:

- `employeeExternalRef`
- `year`
- `month`
- `grossPay`
- `taxWithheld`
- `employerContributions`
- `benefitAmounts`
- `netPay`
- `payItemBreakdown[]`

Validation:

- month uniqueness
- YTD sums tie to declared history
- benefit categories valid

Target objects:

- `PayrollHistorySnapshot`
- `YtdAccumulator`

### 12. AGI history import

Dataset code: `agiHistory`

Required fields:

- `periodKey`
- `employeeExternalRef`
- `submittedAt`
- `technicalReceiptRef`
- `materialReceiptRef`
- `lineTotals`

Validation:

- receipt references present
- period consistency with payroll history

Target objects:

- `AgiHistoricalSubmission`

Rule: Imported AGI history is read-only and may not be resubmitted; only displayed and used for parity.

### 13. Benefit and travel history import

Dataset codes:
- `benefitHistory`
- `travelHistory`

Required fields:

- employee ref
- decision date
- type code
- taxable/tax-free split
- source receipt ref
- ledger impact summary

Target objects:

- `HistoricalBenefitTreatment`
- `HistoricalTravelClaim`

### 14. Project import

Dataset codes:
- `projectMaster`
- `projectBudgets`
- `projectWipSnapshots`
- `projectOpenOperationalCases`

Required fields for `projectMaster`:

- `projectExternalRef`
- `projectType`
- `name`
- `customerRef` optional
- `commercialModelCode`
- `status`
- `startDate`
- `endDate` optional
- `dimensionSet`

Validation:

- unique project key
- commercial model mandatory
- linked customer exists when external project

Target objects:

- `Project`
- `ProjectBudgetVersion`
- `ProjectProfitabilitySeed`
- `OperationalCaseSeed`

### 15. Document import

Dataset code: `documentArchiveLinks`

Required fields:

- `documentExternalRef`
- `documentType`
- `sourceUri` or `binaryHash`
- `uploadedAt`
- `linkedObjectRefs[]`

Validation:

- hash required
- supported document type
- linked object must exist or be staged

Target objects:

- `Document`
- `DocumentVersion`
- `DocumentLink`

## Mapping rules

1. Every dataset requires approved `MappingSet`.
2. MappingSet stores source field, transform, target field and fallback rule.
3. Free-text manual mapping is forbidden in accepted imports; manual decisions must create explicit mapping rules or correction records.
4. Code translations must be versioned and attached to MappingSet.

## Import-case mapping

Every imported row that can affect regulated or financial outcome must materialize an `ImportCase` with:

- `importCaseId`
- `datasetCode`
- `objectType`
- `sourceRef`
- `status`
- `reviewReasonCodes[]`
- `linkedDocuments[]`
- `proposedTargetRefs[]`

State: `draft -> reviewed -> approved -> consumed` or `rejected`

## Acceptance reports

Every batch must produce:

- count parity
- amount parity
- duplicate summary
- rejected row summary
- review-required summary
- target object refs created
- unresolved material differences

## Variance handling

Difference classes:

- `cosmetic`
- `timing`
- `mapping_error`
- `missing_data`
- `material`

Rules:

- `cosmetic` and approved `timing` may pass pilot
- `mapping_error`, `missing_data` and `material` block go-live until resolved or formally waived if immaterial
- waiver of material differences is forbidden

## Manual review boundaries

Manual review is mandatory for:

- unknown account mapping
- unknown tax code
- duplicate supplier/customer entities
- HUS-linked invoices
- foreign tax profiles
- payroll history mismatch
- AGI receipt absence
- project commercial model ambiguity

## Cutover acceptance

Cutover may pass only when:

- all mandatory datasets accepted
- no material variances open
- opening balances tie to source signed totals
- open AP/AR totals tie
- payroll YTD ties to source
- AGI history parity confirmed where payroll imported
- tax account balance parity confirmed
- all required signoffs present

## Rollback handling

### Before switch

- drop staged target objects for non-accepted batches
- preserve audit and batch history

### After switch

- no deletion of posted journals, submissions or immutable receipts
- rollback implemented through:
  - suspension of integrations
  - reversal/correction entries
  - switch back markers
  - freeze of new operational intake if needed

## Post-cutover correction

All post-cutover discovered source errors must use:

- `postCutoverCorrectionCase`
- linked source batch
- target object correction chain
- acceptance report delta

## Test requirements

At minimum:

- one clean import per dataset
- one duplicate import per dataset
- one mapping error per dataset
- one material variance blocking cutover
- one rollback rehearsal
- one post-cutover correction case

## Exit gate

- [ ] Every import dataset is explicit.
- [ ] Validation rules, parity checks and review boundaries are explicit.
- [ ] Cutover acceptance and rollback rules are explicit.
- [ ] Imported historical data is immutable and traceable.
- [ ] Codex can implement import/cutover without inventing dataset shapes or acceptance logic.
