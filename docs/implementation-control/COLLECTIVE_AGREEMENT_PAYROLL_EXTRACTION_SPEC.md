> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# COLLECTIVE_AGREEMENT_PAYROLL_EXTRACTION_SPEC

Status: Fullständig omskriven och bindande specifikation för hur kollektivavtal ska bli korrekt, kostnadseffektivt och återanvändbart underlag för svensk lönekörning.

## Icke-förhandlingsbara regler

1. Kunder ska inte ladda upp kollektivavtal i ordinarie produkt-UI.
2. Standardmodellen är ett centralt förvaltat avtalsbibliotek.
3. Kund väljer avtal från publicerad dropdown-katalog med godkända avtalsfamiljer och versioner.
4. Om avtal saknas kontaktar kund support; support/backoffice äger intake.
5. AI används internt för extraktion, normalisering och klausulklassning.
6. AI får aldrig ensam avgöra slutlig löne- eller avtalslogik.
7. Human payroll-review och compliance-approval krävs innan en avtalsversion får publiceras eller aktiveras.
8. Om ett nytt avtal är generellt användbart ska det publiceras i centralt bibliotek och återanvändas av flera kunder.
9. Tenant-specifika lokala tillägg eller avvikelser får bara skapas genom support/backoffice-flöde med audit, approval och egen versionering.
10. Fokus är korrekt lönekörning. Allmän HR-administration ligger utanför detta dokument.

## Purpose

Detta dokument definierar hur kollektivavtal går från källa till körbar, testad och versionsstyrd payroll-logik utan att varje kund tvingar fram egen extraction-pipeline.

## Canonical object model

### AgreementCatalogFamily

- `agreementCatalogFamilyId`
- `familyCode`
- `displayName`
- `marketCoverageTier`
- `sectorClassCode`
- `employmentPopulationCode`
- `status`
- `defaultPayrollTaxonomyCode`
- `maintainedByTeam`

State: `draft -> internal_review -> published -> retired`

### AgreementCatalogVersion

- `agreementCatalogVersionId`
- `agreementCatalogFamilyId`
- `sourceLabel`
- `displayLabel`
- `effectiveFrom`
- `effectiveTo`
- `sourceBundleId`
- `canonicalOutputId`
- `rulepackBuildId`
- `status`
- `approvedByPayroll`
- `approvedByCompliance`
- `publishedAt`

State: `draft -> extracted -> payroll_review -> compliance_review -> approved -> compiled -> tested -> published -> superseded -> retired`

### AgreementSourceBundle

- `agreementSourceBundleId`
- `sourceType` (`central_agreement`, `appendix`, `salary_table`, `clarification`, `local_supplement_request`)
- `publisherRef`
- `documentHashes[]`
- `effectiveDateHints[]`
- `languageCodes[]`
- `status`

State: `received -> normalized -> extraction_ready -> archived`

### AgreementExtractionRun

- `agreementExtractionRunId`
- `agreementSourceBundleId`
- `extractorModelVersion`
- `status`
- `confidenceSummary`
- `candidateCount`
- `reviewRequiredCount`
- `startedAt`
- `completedAt`

State: `queued -> running -> completed | failed -> reviewed`

### AgreementClauseCandidate

- `agreementClauseCandidateId`
- `agreementExtractionRunId`
- `clauseCategoryCode`
- `canonicalFieldPath`
- `proposedValue`
- `supportingEvidenceRefs[]`
- `confidenceScore`
- `status`
- `reviewRequired`

State: `proposed -> accepted | rejected | amended -> closed`

### AgreementCanonicalOutput

- `canonicalOutputId`
- `agreementCatalogFamilyId`
- `agreementCatalogVersionId`
- `effectiveFrom`
- `effectiveTo`
- `employmentClassifications`
- `workingTimeRules`
- `payElementRules`
- `balanceRules`
- `roundingRules`
- `retroRules`
- `priorityRules`
- `reviewNotes`
- `status`

State: `draft -> payroll_review -> compliance_review -> approved -> frozen`

### AgreementRulepackBuild

- `agreementRulepackBuildId`
- `agreementCatalogVersionId`
- `rulepackCode`
- `rulepackVersion`
- `buildHash`
- `testSuiteHash`
- `status`
- `publishedAt`

State: `draft -> compiled -> tested -> published -> superseded`

### PublishedAgreementCatalogEntry

- `publishedAgreementCatalogEntryId`
- `agreementCatalogFamilyId`
- `agreementCatalogVersionId`
- `selectionLabel`
- `dropdownGroup`
- `effectiveFrom`
- `effectiveTo`
- `status`

State: `pending_publication -> published -> withdrawn -> archived`

### TenantAgreementSelection

- `tenantAgreementSelectionId`
- `tenantId`
- `companyId`
- `agreementCatalogVersionId`
- `selectionScope`
- `effectiveFrom`
- `effectiveTo`
- `status`
- `activatedBy`
- `activatedAt`

State: `draft -> pending_activation_review -> active -> superseded -> retired`

### LocalSupplementCase

- `localSupplementCaseId`
- `tenantId`
- `companyId`
- `agreementCatalogVersionId`
- `caseReasonCode`
- `sourceBundleId`
- `status`
- `approvalChain`
- `compiledRulepackBuildId`

State: `requested -> intake -> extracted -> payroll_review -> compliance_review -> approved -> compiled -> active -> superseded -> retired`

### LocalAgreementOverlay

- `localAgreementOverlayId`
- `localSupplementCaseId`
- `canonicalFieldPath`
- `overrideTypeCode`
- `overrideValue`
- `justificationCode`
- `status`

State: `draft -> approved -> active -> superseded`

## Source of truth

- Central agreement text and appendices: `AgreementSourceBundle`
- Canonical payroll semantics: `AgreementCanonicalOutput`
- Executable payroll logic: `AgreementRulepackBuild`
- Published customer-selectable catalog: `PublishedAgreementCatalogEntry`
- Tenant use of a published agreement: `TenantAgreementSelection`
- Tenant-specific local deviation: `LocalSupplementCase` + `LocalAgreementOverlay`
- AI output: never source of truth

## Published catalog and dropdown selection model

### Product rule

The only standard customer-visible contract for collective agreements is:

- choose `agreementCatalogVersionId` from published dropdown
- map it to employment scopes
- activate after validation

### Dropdown payload

Every dropdown entry must include:

- `agreementCatalogVersionId`
- `selectionLabel`
- `familyCode`
- `marketCoverageTier`
- `employmentPopulationCode`
- `effectiveFrom`
- `effectiveTo`
- `supportedSalaryModels[]`
- `supportedWorkingTimeModels[]`

### Selection scope model

`selectionScope` may target:

- all employments in a company
- a company legal entity
- a cost center group
- an employment category
- an explicit employment set

### Activation rules

1. Activation requires active published catalog entry.
2. Activation effective date must fall within catalog version validity.
3. Overlapping tenant selections for same employment scope are forbidden.
4. Historical pay runs stay pinned to the version effective on payout date.

## Support-managed agreement intake

### When used

Used only when:

- required agreement family/version is not in published catalog
- published catalog exists but tenant has a local supplement need
- published catalog requires industry or employer-organization clarification before activation

### Intake flow

1. Customer opens support request referencing desired agreement.
2. Backoffice creates `LocalSupplementCase` or new central `AgreementSourceBundle`.
3. Source bundle is received, hashed and normalized.
4. Internal extraction pipeline runs.
5. Payroll-review resolves semantic candidates.
6. Compliance-review approves legal/payroll interpretation boundaries.
7. Canonical output freezes.
8. Rulepack compiles and all tests pass.
9. Decision:
   - generally reusable -> publish in central catalog
   - tenant-specific -> activate only as local supplement case

### Forbidden actions

- customer self-upload to production catalog
- direct tenant creation of agreement family/version
- AI auto-publication
- local supplement activation without human approval

## Internal AI extraction pipeline

### AI may extract

- agreement family identity and version labels
- effective dates
- employment categories and pay groups
- ordinary working time models
- overtime triggers and multipliers
- OB windows and rates
- jour/beredskap structures where relevant
- vacation earning and deduction formulas that affect payroll
- saved days / carry-forward rules that affect balance accrual
- compensation priority rules
- rounding rules
- retro and recalculation rules
- salary step tables and rate tables
- local supplement candidates

### AI may not decide

- whether contradictory clauses should override one another
- whether local supplement is legally valid against central agreement
- whether ambiguous text should become executable rule
- whether a new agreement should be published
- whether a tenant-specific exception is allowed
- final payroll semantics for taxable vs non-taxable company payments

### Internal pipeline stages

- document normalization
- clause segmentation
- clause classification
- canonical field candidate extraction
- evidence linking
- candidate confidence scoring
- review queue generation

## Human review and approval chain

### Payroll review

Payroll reviewers must approve:

- employment classification model
- overtime logic
- OB logic
- balance-affecting vacation/saved day logic
- rounding rules
- retro logic
- salary table parsing

### Compliance review

Compliance must approve:

- legal interpretation boundaries
- conflict resolution choices
- publication eligibility
- local supplement validity
- effective dating and supersession chain

### Approval invariants

- no version reaches `approved` without two explicit approvals
- same reviewer may not perform both payroll and compliance approval on same version
- local supplement approval requires tenant-specific reason code and evidence bundle

## Canonical payroll output model

Every approved agreement version must materialize the same canonical output structure.

### 1. Employment classification

- `classificationCode`
- `salaryModelCode`
- `workingTimeModelCode`
- `apprenticeFlag`
- `ageBandCode`
- `probationRuleCode`

### 2. Working time rules

- `ordinaryHoursPerWeek`
- `ordinaryHoursPattern`
- `partTimeFactorRules`
- `unsocialHourWindows[]`
- `restRuleFlags`

### 3. Overtime and additional time

- `overtimeTriggerRules[]`
- `additionalTimeRules[]`
- `multiplierRules[]`
- `compensationPriorityRules[]`
- `minimumCallOutRules[]`

### 4. OB, jour and standby

- `obWindows[]`
- `obRates[]`
- `jourRates[]`
- `standbyRates[]`
- `rateCombinationRules[]`

### 5. Salary and rate tables

- `monthlySalaryTables[]`
- `hourlyRateTables[]`
- `skillStepMappings[]`
- `minimumRateRules[]`

### 6. Vacation and balance rules

- `vacationEarningRules`
- `vacationDeductionRules`
- `vacationSupplementRules`
- `savedDaysRules`
- `balanceCarryForwardRules`
- `negativeBalancePolicy`

### 7. Rounding rules

- `timeRoundingRules`
- `amountRoundingRules`
- `cutoffRules`

### 8. Retro and recalculation

- `retroWindowRules`
- `recalculationPriorityRules`
- `effectiveDatingCollisionRules`

### 9. Local supplement hooks

- allowed overridable canonical paths only
- local supplement precedence rules
- audit class for each allowed override path

## Compile to rulepack

### Compile rules

1. Every `AgreementCanonicalOutput` compiles to one or more payroll-consumable rulepacks.
2. Rulepack code must be stable by family and version lineage:
   - `CA.<familyCode>.<versionCode>`
3. Build must emit:
   - machine-readable rules
   - explanation pack
   - test suite hash
   - publication metadata

### Compile blockers

- unresolved clause candidates
- missing salary/rate tables
- ambiguous retro logic
- overlapping effective dates
- local supplement referencing non-overridable path

## Test requirements

Every agreement rulepack build must pass:

- happy path vectors
- negative vectors
- boundary vectors
- rounding vectors
- retro vectors
- overtime/OB interaction vectors
- vacation and saved-day vectors
- historical pinning vectors
- local supplement precedence vectors
- payroll-to-AGI smoke vectors where relevant pay items change AGI basis

## Versioning and supersession

### Family versioning

- family is stable market-level identity
- version is source/effective-dated semantic release
- publication to dropdown uses `PublishedAgreementCatalogEntry`

### Supersession rules

- new version may supersede only by later effective date or explicit corrective supersession
- pay runs remain pinned to historical version
- superseded versions stay searchable and auditable

## Local supplement process via support/backoffice

### Allowed use

- employer-specific local terms
- location-specific additions
- temporary negotiated deviations
- customer-specific pay code overlays where legally permitted

### Forbidden use

- replacing whole central agreement
- hiding unsupported agreement under local supplement
- bypassing central library for broad market agreements

### Approval chain

- support intake
- internal extraction
- payroll review
- compliance review
- tenant activation review
- final publish as local overlay

## Rulepack override model

Only these paths may be overridden locally:

- selected OB rate tables
- selected standby/jour rate tables
- selected skill-step tables
- selected local balance carry-forward limits
- selected schedule-specific ordinary hours

Override cannot touch:

- tax logic
- statutory leave logic
- mandatory legal blockers
- AGI mapping classes
- employer contribution logic

## API and runtime support

### Catalog routes

- `GET /v1/collective-agreements/catalog`
- `GET /v1/collective-agreements/catalog/:agreementCatalogVersionId`
- `POST /v1/collective-agreements/selections`
- `GET /v1/collective-agreements/selections`

### Backoffice routes

- `POST /v1/backoffice/collective-agreements/intake-cases`
- `POST /v1/backoffice/collective-agreements/source-bundles`
- `POST /v1/backoffice/collective-agreements/extraction-runs`
- `POST /v1/backoffice/collective-agreements/catalog-versions/:agreementCatalogVersionId/payroll-approve`
- `POST /v1/backoffice/collective-agreements/catalog-versions/:agreementCatalogVersionId/compliance-approve`
- `POST /v1/backoffice/collective-agreements/catalog-versions/:agreementCatalogVersionId/publish`
- `POST /v1/backoffice/collective-agreements/local-supplements/:localSupplementCaseId/approve`

### Runtime permissions

- tenants may read published catalog and create selections
- tenants may not create families, versions or extraction runs
- only backoffice payroll/compliance roles may approve or publish catalog versions

## Audit and evidence requirements

Every agreement lifecycle object must store:

- source bundle hashes
- extraction run model version
- candidate evidence refs
- payroll approval ref
- compliance approval ref
- rulepack build hash
- publication receipt
- tenant activation receipt

## Golden scenarios

Minimum scenarios:

1. Tenant selects published tjänstemanna family from dropdown and payroll calculates correctly.
2. Support intakes missing agreement, publishes central version and second tenant reuses it.
3. Local supplement overrides OB rates only and remains fully auditable.
4. Retro change in agreement version affects future pay runs only.
5. Historical pay run replay still uses old published version.

## Prioritized agreement families for broad market coverage

Priority is market coverage across all companies, not byggnärhet.

### Tier 1 — Highest initial coverage

- Private-sector general tjänstemanna families for office, consulting, tech, service and bureau-heavy employers
- Industrial/production worker families for manufacturing and mixed service/production employers
- Retail and warehouse families
- Transport and logistics families
- Service/facility/lokalvård/fastighetsnära families

### Tier 2 — Broad operational coverage

- Installation and electro/VVS families
- Hospitality/visitor-facing service families
- Construction craft families
- Painting/plumbing/ventilation-adjacent craft families

### Tier 3 — Specialized expansions

- Highly specialized sector agreements with lower installed base but high payroll complexity
- Customer-specific local supplement templates that recur often enough to productize

## Exit gate

- [ ] Customer self-service upload is removed from standard model.
- [ ] Published central catalog and dropdown model are the default.
- [ ] Internal AI extraction pipeline is defined with hard review boundaries.
- [ ] Human payroll and compliance approval are mandatory before activation.
- [ ] Canonical payroll output model and rulepack compile path are explicit.
- [ ] Broad market coverage is prioritized over construction proximity.
