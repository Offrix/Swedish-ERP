> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# TENANT_SETUP_MODULE_ACTIVATION_AND_GO_LIVE_EXECUTION_SPEC

Status: Bindande exekveringsspec för tenant bootstrap, company setup, module activation, pilot, parallel run, go-live, cutover och rollback.

## Icke-förhandlingsbara regler

1. Ingen tenant får gå live i delkonfigurerat läge.
2. Core-finance setup måste vara färdig före reglerade moduler.
3. Modulaktivering är serverstyrd, effective-dated och auditad.
4. Irreversibla val får aldrig aktiveras utan explicit signoff.
5. Go-live kräver objektivt passerade gates, inte subjektiv känsla.
6. Rollback får aldrig ske genom rå dataradering efter att affärshändelser publicerats.

## Core setup objects

### TenantBootstrap

- `tenantBootstrapId`
- `tenantId`
- `status`
- `createdAt`
- `createdBy`
- `activationProfileId`
- `goLivePlanId`

State machine: `draft -> companyConfigured -> financeConfigured -> identityConfigured -> modulesActivated -> pilotReady -> liveReady -> live`

### CompanySetupProfile

- `companySetupProfileId`
- `tenantId`
- `companyId`
- `legalName`
- `orgNo`
- `legalFormCode`
- `vatRegistrationStatus`
- `employerRegistrationStatus`
- `fiscalYearPolicy`
- `accountingMethodCode`
- `currencyCode`
- `countryCode`
- `status`

State machine: `draft -> validated -> approved -> active`

### ModuleActivationProfile

- `activationProfileId`
- `tenantId`
- `companyId`
- `moduleStates[]`
- `approvalChain`
- `effectiveFrom`
- `status`

State machine: `draft -> approved -> effective -> superseded`

### GoLivePlan

- `goLivePlanId`
- `tenantId`
- `companyId`
- `pilotMode`
- `parallelRunRequired`
- `cutoverStrategyCode`
- `freezeAt`
- `rollbackPointRef`
- `status`

State machine: `planned -> pilot -> parallelRun -> cutoverReady -> switched -> stabilized -> closed`
Rollback branch: `parallelRun -> rollback` or `switched -> rollback`

## Module catalog and dependency rules

### Core mandatory modules

These are mandatory for every tenant before any optional vertical module can activate:

- `orgAuth`
- `documents`
- `reviewCenter`
- `activity`
- `notifications`
- `ledger`
- `accountingMethod`
- `fiscalYear`
- `legalForm`
- `reporting`
- `search`
- `core`

### Regulated finance modules

- `vat` depends on: `ledger`, `accountingMethod`, `fiscalYear`, `legalForm`
- `banking` depends on: `ledger`
- `taxAccount` depends on: `banking`, `ledger`, `vat`
- `ar` depends on: `ledger`, `vat`
- `ap` depends on: `ledger`, `vat`, `documents`, `reviewCenter`

### Payroll stack

- `hr` depends on: `orgAuth`
- `balances` depends on: `hr`
- `time` depends on: `hr`, `balances`
- `collectiveAgreements` depends on: `hr`
- `benefits` depends on: `hr`, `documents`, `reviewCenter`
- `travel` depends on: `hr`, `documents`, `reviewCenter`
- `pension` depends on: `payroll`, `hr`
- `payroll` depends on: `hr`, `balances`, `time`, `collectiveAgreements`, `ledger`, `benefits`, `travel`

### Operations stack

- `projects` depends on: `ledger`, `reporting`
- `field` depends on: `projects`
- `hus` depends on: `ar`, `vat`, `ledger`, `projects`
- `personalliggare` depends on: `projects`, `orgAuth`
- `egenkontroll` depends on: `projects`, `field`
- `id06Pack` depends on: `personalliggare`, `field`, `projects`
- `annualReporting` depends on: `ledger`, `legalForm`, `fiscalYear`, `reporting`, `taxAccount`

## Irreversible vs reversible decisions

### Irreversible after first posted journal

- legal form historical start date
- accounting method historical start date
- fiscal year start/end for active historical periods
- chart structure deletion
- voucher series deletion

### Reversible before first regulated artifact only

- payroll activation
- HUS activation
- annual reporting activation
- personalliggare activation
- ID06 pack activation

### Suspend-only after live use

- field
- personalliggare
- ID06 pack
- HUS
- payroll

## Setup sequence

### Step 1: Tenant bootstrap

Commands:

- `createTenantBootstrap`
- `createCompanyDraft`
- `assignInitialTenantAdmin`

Blocking validations:

- unique org number
- verified company identity
- verified primary admin identity

Exit gate:

- tenant exists
- company draft exists
- initial admin exists

### Step 2: Legal and finance foundation

Commands:

- `createLegalFormProfile`
- `createAccountingMethodProfile`
- `createFiscalYearProfile`
- `installChartTemplate`
- `installVatBaseline`
- `createVoucherSeries`
- `approveReportingObligationProfile`

Blocking validations:

- legal form compatible with accounting method
- fiscal year dates valid
- chart template compatible with legal form and industry profile
- VAT registration state resolved

Exit gate:

- legal form active
- accounting method active
- fiscal year active
- chart and voucher series installed
- reporting obligations approved

### Step 3: Identity and access foundation

Commands:

- `configureAuthPolicy`
- `enrollAdminFactors`
- `createTeamStructure`
- `assignRoleFamilies`
- `configureStepUpRules`
- `configureSupportRestrictions`
- `configurePublicApiPolicy` optional
- `configureSsoConnection` optional

Blocking validations:

- all tenant admins have strong auth
- no privileged role without step-up requirements
- support scope model configured

Exit gate:

- auth policy active
- admin factors verified
- role matrix effective

### Step 4: Document and review activation

Commands:

- `activateDocuments`
- `activateReviewCenter`
- `activateSearch`
- `activateNotifications`
- `activateActivity`

Blocking validations:

- archive storage configured
- OCR provider configured for tenants that need automated intake
- review queues configured

Exit gate:

- documents versioning active
- review queues active
- search indexing active

### Step 5: Banking and payment activation

Commands:

- `createBankConnection`
- `createPaymentRailProfile`
- `runBankContractTests`
- `activateBanking`

Blocking validations:

- credentials verified
- contract tests green
- fallback rail chosen
- reconciliation rules installed

Exit gate:

- bank connection healthy
- statement import green
- payment export dry-run green

### Step 6: AP/AR/VAT/tax account activation

Commands:

- `activateAr`
- `activateAp`
- `activateVat`
- `activateTaxAccount`
- `runFinanceGoldenScenarios`

Blocking validations:

- VAT baseline pinned
- invoice/legal fields policy active
- tax account mapping rulepack active

Exit gate:

- invoice issue and AP import pass
- VAT calculation pass
- tax account import/reconciliation pass

### Step 7: Payroll activation

Commands:

- `activateHr`
- `activateBalances`
- `activateTime`
- `activateCollectiveAgreements`
- `activateBenefits`
- `activateTravel`
- `activatePayroll`
- `activatePension` optional

Blocking validations:

- published collective agreement selection exists for each in-scope employment class
- tax tables and employer contribution rulepacks active
- pay item catalog approved
- payroll bank/export rail configured
- AGI transport configured

Exit gate:

- monthly payroll golden scenario pass
- AGI draft + submit + receipt pass
- payroll postings + payout matching pass

### Step 8: Projects and optional operations activation

Commands:

- `activateProjects`
- `activateField` optional
- `activateHus` optional
- `activatePersonalliggare` optional
- `activateId06Pack` optional
- `activateEgenkontroll` optional

Blocking validations:

- project cost allocation rulepack active
- field sync envelope configured before field activation
- HUS transport configured before HUS activation
- workplace model configured before personalliggare
- ID06 provider healthy before ID06 pack

Exit gate:

- project profitability scenario pass
- field scenario pass where activated
- HUS scenario pass where activated
- personalliggare export scenario pass where activated
- ID06 verification scenario pass where activated

### Step 9: Annual reporting activation

Commands:

- `activateAnnualReporting`
- `configureBolagsverketTransport`
- `configureSkatteverketDeclarationTransport`

Blocking validations:

- legal form reporting obligations active
- signatory policy active
- immutable archive configured

Exit gate:

- annual package validation pass
- declaration package export/submit pass

## Pilot and go-live

### Pilot mode

Pilot is allowed when:

- all activated modules have passed golden scenarios
- backoffice and support scopes are active
- rollback point is defined
- evidence bundle for activation is complete

### Parallel run

Parallel run is mandatory when any of these are true:

- existing payroll is migrated
- opening balances and open AP/AR are imported
- existing HUS claims exist
- existing tax account reconciliation history is imported

Parallel run acceptance requires:

- source parity checks passed
- no unresolved material variances
- pilot signoff
- rollback owner confirmed

### Cutover plan

Every cutover plan must lock:

- `freezeAt`
- `lastExtractAt`
- `acceptedVarianceThresholds`
- `rollbackPointRef`
- `signoffChain`
- `stabilizationWindowHours`

### Cutover commands

- `createCutoverPlan`
- `recordCutoverSignoff`
- `recordCutoverChecklistItem`
- `startCutover`
- `completeFinalExtract`
- `passCutoverValidation`
- `switchCutover`
- `stabilizeCutover`
- `startRollback`
- `completeRollback`

### Cutover blocking validations

- no open material migration variances
- no dead-lettered regulated submission jobs
- no unresolved privileged access findings
- all mandatory contract tests green
- all required golden scenarios green
- backup and restore drill fresh enough
- runbooks acknowledged

## Rollback rules

1. Before `switchCutover`, rollback may purge target-only imported staging objects.
2. After `switchCutover`, rollback must be compensation-driven:
   - suspend external transports
   - stop new document ingest where required
   - reverse switch markers
   - preserve audit
3. Post-switch rollback may not delete immutable receipts or audit evidence.
4. If any regulated filing has been submitted after switch, rollback scope must exclude filing history and instead create correction/recovery plan.

## Evidence and signoff

Every go-live package must contain:

- activation profile snapshot
- contract test results
- golden scenario report
- migration variance report
- rollback plan
- support model signoff
- security signoff
- compliance signoff where regulated modules are active

## Exit gate

- [ ] Tenant setup can run deterministically without hidden manual choices.
- [ ] Module activation order is locked and server-enforced.
- [ ] Go-live, pilot, parallel-run and cutover rules are explicit.
- [ ] Rollback rules preserve audit and regulatory evidence.
- [ ] Implementation can start without asking what is reversible, what is blocked and what signs off live.
