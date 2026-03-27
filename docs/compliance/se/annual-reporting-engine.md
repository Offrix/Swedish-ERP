> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: SE-CMP-022
- Title: Annual Reporting Engine
- Status: Binding
- Owner: Finance compliance architecture
- Version: 2.1.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/compliance/se/annual-reporting-engine.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-rulepack-register.md`
  - `docs/master-control/master-domain-map.md`
- Related domains:
  - annual reporting
  - reporting
  - legal form
  - integrations
  - close
- Related code areas:
  - `packages/domain-annual-reporting/*`
  - `packages/domain-reporting/*`
  - `packages/domain-integrations/*`
  - `packages/domain-legal-form/*`
- Related future documents:
  - `docs/compliance/se/legal-form-and-declaration-engine.md`
  - `docs/runbooks/annual-close-and-filing-by-legal-form.md`
  - `docs/test-plans/annual-reporting-by-legal-form-tests.md`

# Purpose

Definiera den bindande motorn för annual packages, evidenspaket, signatory flow, filing readiness och receiptkedjor ovanpå legal-form- och fiscal-year-motorerna.

# Scope

Ingår:

- annual package
- evidence pack
- signatory flow
- filing readiness
- submission and receipt chain
- package versioning
- correction packages
- legal-form-specific outputs

Ingår inte:

- legal-form beslut
- generell close-motor
- UI-layout

# Non-negotiable rules

1. Annual package måste byggas från låsta snapshots av ledger, fiscal year, legal-form profile och reporting-obligation profile.
2. Filing readiness får inte vara grön om formspecifika blockerare kvarstår.
3. Submission, mottagen filing, materiell accept och efterföljande correction ska hållas isär.
4. Signatory flow måste vara formspecifik och auditbar.
5. Correction filing ska ske via explicit ny package version eller correction chain.
6. Package version ska vara immutabel efter signoff-start.
7. Sole trader packages får inte tvingas igenom AB-lik årsredovisningsflöde.
8. HB/KB packages ska stödja Inkomstdeklaration 4-familjen och separat prövning av årsredovisningsskyldighet.
9. Evidence pack ska kunna visa exakt vilka rapportsnapshots, rulepacks och close-signoffs som package byggdes från.

# Definitions

- `Annual package`: samlat slutdokumentpaket för close/filing.
- `Evidence pack`: underlag som binder package till dess källsnapshots.
- `Signatory flow`: den godkännandekedja som krävs innan filing.
- `Submission family`: vald submissionsväg, till exempel Bolagsverket-filing eller skattedeklarationsfamilj.
- `Correction package`: ny packageversion som ersätter tidigare package i en correction chain utan att mutera den gamla.

# Object model

## AnnualPackage

Fält:

- `annual_package_id`
- `company_id`
- `fiscal_year_id`
- `legal_form_profile_id`
- `reporting_obligation_profile_id`
- `status`
- `package_version_no`
- `package_family_code`
- `snapshot_hash`
- `source_fingerprint`

## AnnualEvidencePack

Fält:

- `annual_evidence_pack_id`
- `annual_package_id`
- `component_codes`
- `report_snapshot_refs`
- `close_snapshot_refs`
- `rulepack_refs`
- `status`

## AnnualFilingSubmission

Fält:

- `annual_filing_submission_id`
- `annual_package_id`
- `submission_family_code`
- `submission_id`
- `receipt_id`
- `technical_receipt_status`
- `domain_receipt_status`
- `status`

# Required fields

- fiscal-year snapshot
- legal-form profile
- reporting-obligation profile
- signatory profile
- package contents
- evidence hash
- source fingerprint
- package family

# State machines

## AnnualPackage

- `draft`
- `ready_for_signoff`
- `signoff_in_progress`
- `signed`
- `submitted`
- `receipt_received`
- `correction_required`
- `superseded`
- `closed`

## AnnualFilingSubmission

- `draft`
- `sent`
- `technical_receipt_received`
- `domain_accepted`
- `domain_rejected`
- `transport_failed`
- `superseded`

# Validation rules

1. Package får inte gå till `ready_for_signoff` utan låsta snapshots.
2. Package får inte gå till `submitted` utan komplett signatory chain.
3. Receipt måste kopplas till exakt packageversion.
4. Package family måste vara kompatibel med legal form och reporting-obligation profile.
5. Ny packageversion får inte återanvända gammal evidence hash om source fingerprint ändrats.
6. Correction package måste peka på vilket package den ersätter.

# Deterministic decision rules

## Rule ANR-001: Package build

Package build ska använda fiscal-year, legal-form, reporting-obligation och ledger snapshots som var aktiva vid buildtidpunkten.

## Rule ANR-002: Signatory gate

Filing submission blockeras tills formspecifik signatory flow är komplett.

## Rule ANR-003: Sole trader package family

Enskild näringsverksamhet ska använda declaration/year-end package family enligt legal-form-motorn och ska inte sättas i Bolagsverket-årsredovisningsläge utan explicit legal obligation profile.

## Rule ANR-004: HB/KB package family

HB/KB ska alltid kunna generera skattedeklarationsfamilj enligt Inkomstdeklaration 4-path och därutöver endast annual report package family när reporting-obligation profile kräver det.

## Rule ANR-005: Correction package

Rättelse ska ske genom ny package version eller correction flow, aldrig genom att tidigare submitted package skrivs över.

# Rulepack dependencies

- `RP-ANNUAL-FILING-SE`
- `RP-LEGAL-FORM-SE`
- `RP-FISCAL-YEAR-SE`
- `RP-SIGNATORY-SE`

# Submission/receipt behavior where relevant

- submission platform ska bära annual package version, filing profile, package family och receipt chain
- teknisk kvittens och domänmässigt godkännande ska lagras separat
- correction submissions ska länkas till ursprunglig chain, inte ersätta den

# Review requirements

Review krävs vid:

- formspecifik blocker
- mismatch between package and evidence
- failed receipt
- correction scenario
- avvikelse mellan reporting-obligation profile och package family

# Correction model

- new package version
- new signoff
- correction filing submission
- supersede old package only through explicit chain

# Audit requirements

Audit ska visa:

- package version
- evidence pack
- source fingerprint
- signatory chain
- submission and receipt chain
- correction links

# Golden scenarios covered

- annual close AB
- annual close sole trader
- annual close HB/KB
- annual close economic association

# API implications

- `build_annual_package`
- `sign_annual_package`
- `submit_annual_package`
- `open_correction_package`
- `get_annual_package_evidence`

# Test implications

- package build reproducibility
- signatory gating
- legal-form-specific package family selection
- correction path
- technical vs domain receipt separation

# Exit gate

- [ ] annual package bygger på låsta snapshots
- [ ] package family väljs deterministiskt per legal form och reporting obligation
- [ ] signatory flow och receipt chain är fulla och auditbara
- [ ] correction sker genom ny package/correction chain, aldrig overwrite

