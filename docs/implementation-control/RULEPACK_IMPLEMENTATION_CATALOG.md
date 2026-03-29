> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# RULEPACK_IMPLEMENTATION_CATALOG

Status: Bindande implementeringskatalog för alla rulepacks som krävs före UI.

## Global rulepack rules

1. Varje rulepack publiceras i registry med immutable version.
2. Varje regelutvärdering ska spara:
   - `rulepackCode`
   - `rulepackVersion`
   - `effectiveDate`
   - `inputHash`
   - `outputHash`
   - `evaluationRef`
3. Historiska affärsobjekt är pinade till sin utvärderade rulepack-version.
4. Rollback publicerar ny version eller re-aktiverar äldre publicerad version; den skriver aldrig om gammal version.
5. Tenant override får bara ske där override-modell uttryckligen tillåter det.
6. Replay ska återanvända historisk rulepack-version om replay avser historiskt beslut, annars explicit correction-flow.

## Standard rulepack metadata

Varje rulepack ska definiera:

- `rulepackCode`
- `owningDomain`
- `purpose`
- `inputs`
- `outputs`
- `effectiveDatingRules`
- `versioningRules`
- `overrideModel`
- `historicalPinningRules`
- `replayBehavior`
- `reviewBoundaries`
- `blockingValidations`
- `testRequirements`
- `goldenScenarios`
- `rollbackModel`
- `publicationModel`
- `externalBaselineDependencies`

## Rulepacks

### 1. SE-ACCOUNTING-METHOD

- Owning domain: `accountingMethod`
- Purpose: Styr kontantmetod, faktureringsmetod, årsskiftescatch-up och blockerad metodswitch
- Inputs:
  - company profile
  - legal form
  - VAT registration state
  - fiscal year
  - source document timing
  - payment timing
- Outputs:
  - posting timing
  - VAT timing
  - allowed method change decision
  - year-end catch-up requirements
- Effective dating rules:
  - future-dated activation only
  - historical switch forbidden after posted journals without approved correction plan
- Override model: none
- Historical pinning rules: journal entry stores resolved method profile version
- Replay behavior: replay uses stored method profile unless correction request explicitly changes method
- Review boundaries:
  - method change request
  - year-end catch-up
- Blocking validations:
  - incompatible legal form
  - active VAT periods unresolved
- Test requirements:
  - cash method domestic
  - invoice method domestic
  - year-end unpaid invoices
  - method switch denial
- Golden scenarios:
  - supplier invoice under cash method paid next period
  - customer invoice under invoice method before payment
- Rollback model: publish superseding method profile, never mutate prior
- Publication model: domain owner + finance compliance approval
- External baseline dependencies: Swedish accounting method rules

### 2. SE-FISCAL-YEAR

- Owning domain: `fiscalYear`
- Purpose: Styr brutet räkenskapsår, kort/långt år, periodgenerering och reopen-gränser
- Inputs:
  - legal form
  - requested start/end
  - current fiscal history
- Outputs:
  - fiscal year profile
  - accounting periods
  - reopen eligibility
- Effective dating rules:
  - active year immutable after first posted journal in year
- Override model: none
- Historical pinning rules: every posting references fiscalYearId and periodId
- Replay behavior: replay uses original period mapping
- Review boundaries:
  - fiscal year change request
  - reopen of period in closed year
- Blocking validations:
  - overlapping years
  - illegal period lengths
- Test requirements:
  - calendar year
  - broken year
  - short first year
  - reopen with close blockers
- Golden scenarios:
  - limited company with broken year
  - transition to new fiscal year
- Rollback model: corrected successor request only
- Publication model: finance owner approval
- External baseline dependencies: Swedish fiscal year norms

### 3. SE-VAT-CORE

- Owning domain: `vat`
- Purpose: VAT decisioning, box mapping, reverse charge, OSS/IOSS, import/export treatment
- Inputs:
  - transaction attributes
  - buyer/seller country
  - VAT numbers/status
  - supply type
  - dates
  - accounting method timing
- Outputs:
  - VAT code
  - report boxes
  - review flag
  - ledger posting template ref
- Effective dating rules:
  - yearly or mid-year official change based
- Override model:
  - no override on tax logic
  - allowed override only on fact correction of input fields
- Historical pinning rules: VAT decision stores rulepack version
- Replay behavior: uses historical version unless correction of facts
- Review boundaries:
  - missing VAT number validation
  - property-related ambiguity
  - mixed supply
- Blocking validations:
  - missing mandatory fields
  - unsupported scenario
- Test requirements:
  - domestic 25/12/6
  - EU B2B goods/services
  - non-EU exports
  - construction reverse charge
  - import goods
  - credit notes
- Golden scenarios:
  - AP import with reverse charge
  - AR export service zero-rated
- Rollback model: superseding rulepack version
- Publication model: VAT owner + compliance signoff
- External baseline dependencies:
  - VAT return form mapping
  - official VAT law changes

### 4. SE-PAYROLL-TAX

- Owning domain: `payroll`
- Purpose: Preliminary tax, tax table lookup, jämkning, engångsskatt, SINK and special tax modes
- Inputs:
  - employee statutory profile
  - tax table
  - jämkning decision
  - SINK decision
  - pay items
  - payout date
- Outputs:
  - preliminary tax amount
  - tax basis
  - decision code
  - AGI tax fields
- Effective dating rules:
  - yearly publication
  - mid-year only when official changes require
- Override model:
  - no override on statutory formulas
  - manual correction allowed only through correction run with reason
- Historical pinning rules: pay run employee result stores rulepack version and tax table baseline
- Replay behavior: replay uses stored baseline
- Review boundaries:
  - missing tax table
  - conflicting SINK and ordinary tax profile
  - incomplete jämkning
- Blocking validations:
  - no valid tax profile at payout date
- Test requirements:
  - tax table ordinary salary
  - engångsskatt
  - jämkning
  - SINK 22.5%
- Golden scenarios:
  - ordinary monthly pay
  - SINK employee
- Rollback model: superseding version
- Publication model: payroll compliance approval
- External baseline dependencies:
  - official tax tables for the active income year
  - official SINK rate 22.5% from 2026-01-01 until superseded

### 5. SE-EMPLOYER-CONTRIBUTIONS

- Owning domain: `payroll`
- Purpose: Employer contribution classes by age/status and temporary reliefs
- Inputs:
  - birth date
  - payout date
  - income amount
  - statutory exemptions
- Outputs:
  - contribution class
  - rate schedule
  - ledger basis
  - AGI employer contribution fields
- Effective dating rules:
  - explicit effective windows for temporary reductions
  - baseline `SE-EMPLOYER-CONTRIBUTIONS-2026.1` must include:
    - full rate 31.42%
    - pension-only rate 10.21%
    - no-contribution rate 0%
    - temporary youth reduction 20.81% on compensation up to 25 000 SEK per month for employees who fall within the officially published 2026 age cohort, with full 31.42% on the excess and outside the active window
- Override model: none
- Historical pinning rules: pay run stores contribution class and rulepack version
- Replay behavior: historical version pinned
- Review boundaries:
  - conflicting exemption evidence
- Blocking validations:
  - missing birth date where age class required
- Test requirements:
  - full rate
  - reduced pension-only
  - no contribution
  - 2026 temporary reduced youth contribution
- Golden scenarios:
  - employee born 2004 with compensation under and over threshold
- Rollback model: new version only
- Publication model: payroll compliance approval
- External baseline dependencies:
  - official employer contribution percentages and temporary law changes
  - age-cohort and effective-window publication for the temporary 2026-2027 youth reduction

### 6. SE-AGI-TRANSPORT

- Owning domain: `payroll`
- Purpose: AGI payload generation, validation and receipt classification
- Inputs:
  - pay run
  - employee tax outputs
  - employer contribution outputs
  - company legal identity
  - transport baseline
- Outputs:
  - AGI envelope
  - validation issues
  - receipt classification
- Effective dating rules: tied to official AGI transport version
- Override model: none
- Historical pinning rules: submission stores transport baseline version
- Replay behavior: same payload on technical replay; corrected payload only through correction chain
- Review boundaries:
  - employee line mismatch
  - transport validation warnings
- Blocking validations:
  - missing legal identity
  - missing employee mandatory fields
- Test requirements:
  - initial submission
  - corrected submission
  - technical reject
  - material reject
- Golden scenarios:
  - payroll-to-AGI
- Rollback model: transport replay or correction only
- Publication model: payroll + integration owner
- External baseline dependencies:
  - AGI technical description and schemas

### 7. SE-BENEFITS-CORE

- Owning domain: `benefits`
- Purpose: Taxability and valuation of benefits
- Inputs:
  - benefit type
  - document evidence
  - company policy overlay
  - dates
- Outputs:
  - taxable / non-taxable decision
  - valuation
  - payroll routing
  - ledger routing
- Effective dating rules: yearly publication or when official change occurs
- Override model:
  - company policy overlay for stricter treatment only where allowed
- Historical pinning rules: treatment decision stores rulepack version
- Replay behavior: historical version unless new facts
- Review boundaries:
  - car benefit
  - housing benefit
  - gifts threshold
  - wellness ambiguity
- Blocking validations:
  - missing evidence
  - missing private-use assessment
- Test requirements:
  - wellness
  - gifts
  - car benefit
  - subsidized meal
- Golden scenarios:
  - private spend vs benefit
  - cost benefit in payroll
- Rollback model: new version
- Publication model: compliance approval
- External baseline dependencies: official benefit rules

### 8. SE-TRAVEL-MILEAGE

- Owning domain: `travel`
- Purpose: Domestic/international travel allowance, mileage, taxable excess and evidence boundaries
- Inputs:
  - itinerary
  - departure/return times
  - country timeline
  - kilometers
  - vehicle type
- Outputs:
  - tax-free amount
  - taxable excess
  - payroll routing
  - ledger routing
- Effective dating rules: yearly publication
- Override model: company may pay more, but excess becomes taxable automatically
- Historical pinning rules: claim stores rates and rulepack version
- Replay behavior: historical version pinned
- Review boundaries:
  - unclear itinerary
  - mixed domestic/foreign segments
- Blocking validations:
  - missing time basis
  - missing distance basis
- Test requirements:
  - domestic one-day
  - overnight domestic
  - long assignment reduction
  - mileage private car
- Golden scenarios:
  - travel claim to payroll
- External baseline dependencies:
  - official domestic and international travel allowance amounts and mileage rates for the active income year

### 9. SE-PENSION-SALARY-EXCHANGE

- Owning domain: `pension`
- Purpose: Salary exchange, pension basis, special payroll tax basis and posting outputs
- Inputs:
  - employment
  - salary exchange agreement
  - pay run outputs
  - pension plan
- Outputs:
  - pension basis
  - employer pension contribution
  - special payroll tax basis
  - ledger template ref
- Effective dating rules: effective by agreement and official tax year
- Override model:
  - tenant-specific plan mapping allowed
- Historical pinning rules: pay run stores selected pension baseline and agreement ref
- Replay behavior: pinned
- Review boundaries:
  - salary floor breach
  - conflicting plan selection
- Blocking validations:
  - missing approved salary exchange agreement
- Test requirements:
  - standard pension contribution
  - salary exchange
- Golden scenarios:
  - payroll with salary exchange
- External baseline dependencies:
  - official tax handling of salary exchange and pension taxes

### 10. SE-KRONOFOGDEN-PROTECTED-AMOUNT

- Owning domain: `payroll`
- Purpose: Förbehållsbelopp/protected amount logic for garnishment
- Inputs:
  - Kronofogden decision snapshot
  - net pay
  - decision effective period
  - protected amount
  - bonus/holiday pay flags
- Outputs:
  - attachable amount
  - remittance amount
  - payroll deduction line
  - ledger remittance basis
- Effective dating rules: decision-dated
- Override model: none
- Historical pinning rules: pay run stores decision snapshot id
- Replay behavior: uses stored decision snapshot
- Review boundaries:
  - changed decision mid-period
  - bonus handling
- Blocking validations:
  - missing active decision snapshot
- Test requirements:
  - ordinary month
  - changed decision
  - release
  - holiday pay
  - bonus
- Golden scenarios:
  - garnishment payroll scenario
- External baseline dependencies:
  - Kronofogden decision and protected amount basis

### 11. SE-HUS-CORE

- Owning domain: `hus`
- Purpose: Eligibility, amount caps, labour/material split, XML transport lock and recovery mapping
- Inputs:
  - invoice
  - payment evidence
  - buyer identity
  - property/BRF details
  - labour hours and amount
  - prior claims
- Outputs:
  - claim readiness
  - locked submission fields
  - requested amount
  - decision reconciliation
- Effective dating rules:
  - yearly publication and explicit mid-year changes
- Override model: none
- Historical pinning rules: claim stores rulepack version and buyer cap snapshot
- Replay behavior: replay transport only; changed facts require correction claim
- Review boundaries:
  - uncertain property basis
  - payment evidence mismatch
  - prior claims ambiguity
- Blocking validations:
  - no verified payment
  - missing mandatory identity/property data
  - labour amount inconsistency
- Test requirements:
  - ROT accepted
  - RUT accepted
  - partial denial
  - recovery
- Golden scenarios:
  - HUS case to payout/recovery
- External baseline dependencies:
  - official HUS caps, percentages and XML baseline

### 12. SE-TAX-ACCOUNT-MAPPING

- Owning domain: `taxAccount`
- Purpose: Mapping from skattekonto event types to obligations, offsets and reconciliation states
- Inputs:
  - statement event type
  - amount
  - date
  - external ref
  - open obligations
- Outputs:
  - target obligation class
  - offset suggestion
  - review flag
- Effective dating rules: yearly or when statement semantics change
- Override model: none
- Historical pinning rules: imported event stores mapping baseline version
- Replay behavior: re-map using stored baseline for historical event
- Review boundaries:
  - unknown event code
  - duplicate debit/credit
- Blocking validations:
  - conflicting obligation match
- Test requirements:
  - AGI payment
  - VAT payment
  - final tax
  - interest and fee
- Golden scenarios:
  - tax account reconciliation
- External baseline dependencies:
  - official skattekonto semantics

### 13. SE-PERSONALLIGGARE-CORE

- Owning domain: `personalliggare`
- Purpose: Threshold, workplace registration, attendance events, correction rules and export content
- Inputs:
  - workplace type
  - industry pack
  - contract value
  - employer snapshot
  - attendance event
  - device trust
- Outputs:
  - registration required flag
  - allowed event status
  - export payload
  - correction eligibility
- Effective dating rules: yearly and industry-pack versioned
- Override model: none
- Historical pinning rules: attendance export stores industry pack version
- Replay behavior: historical export reuses original event chain; correction creates new chain node
- Review boundaries:
  - offline conflict
  - employer mismatch
- Blocking validations:
  - untrusted device
  - missing workplace registration when required
- Test requirements:
  - threshold met/not met
  - correction chain
  - export generation
- Golden scenarios:
  - workplace to export
- External baseline dependencies:
  - official personalliggare obligations

### 14. SE-ID06-VALIDATION

- Owning domain: `id06Pack`
- Purpose: Company/person/card/workplace validation and allowed action boundaries
- Inputs:
  - card data
  - person identity
  - employer relation
  - workplace binding
  - provider status
- Outputs:
  - validation status
  - action eligibility
  - evidence refs
- Effective dating rules: provider baseline versioned
- Override model: none
- Historical pinning rules: validation action stores provider baseline version
- Replay behavior: re-validate only through explicit refresh command; historical action evidence immutable
- Review boundaries:
  - employer mismatch
  - card inactive
- Blocking validations:
  - invalid card
  - unbound workplace
- Test requirements:
  - valid card
  - inactive card
  - employer mismatch
- Golden scenarios:
  - ID06 workplace access scenario
- External baseline dependencies:
  - official ID06 validation semantics

### 15. SE-LEGAL-FORM-DECLARATION

- Owning domain: `legalForm`
- Purpose: Reporting obligations, package family selection and signatory class rules
- Inputs:
  - legal form
  - fiscal year
  - company status
  - accounting method
- Outputs:
  - reporting obligation profile
  - declaration package family
  - signatory class
- Effective dating rules: yearly and legal-form-specific
- Override model: none
- Historical pinning rules: annual package stores reporting obligation version
- Replay behavior: historical package revalidation pinned unless correction due to changed facts
- Review boundaries:
  - changed legal form around fiscal year end
- Blocking validations:
  - unsupported combination
- Test requirements:
  - AB
  - economic association
  - sole trader where relevant
- Golden scenarios:
  - close to annual package
- External baseline dependencies:
  - official filing obligations per legal form

### 16. SE-PROJECT-COST-ALLOCATION

- Owning domain: `projects`
- Purpose: Labour, material, subcontractor and overhead allocation into profitability
- Inputs:
  - project type
  - time logs
  - payroll outputs
  - AP lines
  - material usage
  - billing model
- Outputs:
  - actual cost allocation
  - WIP basis
  - profitability snapshot inputs
- Effective dating rules: versioned by costing policy
- Override model:
  - tenant may choose approved overhead model
- Historical pinning rules: snapshot stores allocation rulepack version
- Replay behavior: re-materialization uses same version unless approved policy change
- Review boundaries:
  - missing source allocation
  - negative margin anomaly
- Blocking validations:
  - project missing commercial model
- Test requirements:
  - consulting
  - retainer
  - field job
  - construction job
- Golden scenarios:
  - project-to-profitability
- External baseline dependencies:
  - none external; internal approved policy only

### 17. TENANT-MODULE-ACTIVATION-POLICY

- Owning domain: `orgAuth`
- Purpose: Rule-based activation eligibility
- Inputs:
  - tenant state
  - configured dependencies
  - signoff state
  - provider readiness
- Outputs:
  - module allowed/blocked
  - approval class
  - irreversible flag
- Effective dating rules: active immediately on publication
- Override model: none
- Historical pinning rules: activation decision stores rulepack version
- Replay behavior: historical activation decisions remain pinned
- Review boundaries:
  - high-risk module activation
- Blocking validations:
  - missing dependencies
  - missing signoff
- Test requirements:
  - finance core
  - payroll activation
  - HUS activation
  - personalliggare activation
- Golden scenarios:
  - tenant setup to go-live

## Rulepack publication process

1. Create candidate version with external baseline snapshot.
2. Execute unit vectors, negative vectors, boundary vectors, historical pinning vectors and golden scenarios.
3. Review domain semantics and policy impact.
4. Approve publication.
5. Schedule `effectiveFrom`.
6. Mark previous version `superseded` only after new version active.
7. Preserve rollback eligibility through approved predecessor.

## Exit gate

- [ ] Alla nödvändiga rulepacks är katalogiserade.
- [ ] Inputs/outputs, override rules och replay semantics är låsta.
- [ ] Historisk pinning är definierad.
- [ ] External baseline dependencies är explicita.
- [ ] Implementation kan börja utan att hitta på rulepack ownership eller lifecycle.
