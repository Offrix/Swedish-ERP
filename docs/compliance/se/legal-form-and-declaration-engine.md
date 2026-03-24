# Master metadata

- Document ID: SE-CMP-021
- Title: Legal Form and Declaration Engine
- Status: Binding
- Owner: Finance compliance architecture
- Version: 1.1.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated legal-form engine document
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-rulepack-register.md`
  - `docs/master-control/master-domain-map.md`
- Related domains:
  - legal form
  - annual reporting
  - reporting
  - fiscal year
  - close
- Related code areas:
  - `packages/domain-legal-form/*`
  - `packages/domain-annual-reporting/*`
  - `packages/domain-reporting/*`
  - `packages/domain-fiscal-year/*`
- Related future documents:
  - `docs/adr/ADR-0030-legal-form-and-annual-filing-architecture.md`
  - `docs/compliance/se/annual-reporting-engine.md`
  - `docs/runbooks/annual-close-and-filing-by-legal-form.md`
  - `docs/test-plans/annual-reporting-by-legal-form-tests.md`

# Purpose

Definiera den bindande motorn för företagsform, deklarationsprofil, reporting-obligation profile och formspecifika blockerare.

# Scope

Ingår:

- företagsform
- legal-form snapshot
- filing profile
- declaration profile
- reporting-obligation profile
- close prerequisites per form
- signatory class requirements

Ingår inte:

- teknisk transport av årsredovisning eller deklarationsfiler
- allmän ledgerlogik
- allmän close-checklistelogik som inte är formspecifik

# Non-negotiable rules

1. Ett företag ska ha en explicit och historiskt låst företagsform.
2. Filing och close får aldrig anta att alla former beter sig lika.
3. Enskild näringsverksamhet ska stödja kalenderår som normalmodell, NE-/NEA-baserad deklarationsprofil och rätt bokslutsform enligt aktuell storleks- och regelbild.
4. Aktiebolag ska stödja årsredovisnings-, signatory- och Inkomstdeklaration 2-profil som skiljer sig från enskild näringsverksamhet.
5. Ekonomisk förening ska ha egen filingprofil, signatory class och deklarationsprofil även om delar av skatteprofilen liknar aktiebolag.
6. Handelsbolag och kommanditbolag ska ha Inkomstdeklaration 4-profil och separat regelstyrd prövning av årsredovisningsskyldighet.
7. Företagsform, deklarationsprofil och filing profile får aldrig härledas från UI-val eller från vilka blanketter som råkar finnas i en tidigare package version.
8. Formskifte får aldrig mutera historiska annual packages eller tidigare close-readiness.
9. Declaration outputs ska alltid vara bundna till fiscal-year snapshot, legal-form snapshot och rulepack-version.

# Definitions

- `Legal form snapshot`: låst företagsform för visst räkenskapsår eller filingpackage.
- `Filing profile`: formspecifikt paket av regler, krav, outputs och signatory classes.
- `Declaration profile`: vilka deklarations- eller bilagefamiljer som ska stödjas för formen.
- `Reporting obligation profile`: om bolaget för aktuellt år kräver årsredovisning, årsbokslut, förenklat årsbokslut eller annan formspecifik utdata.
- `Signatory class`: definierad rollklass som måste fullgöra signering eller attest före submissionberedskap.

# Object model

## LegalFormProfile

Fält:

- `legal_form_profile_id`
- `company_id`
- `legal_form_code`
- `effective_from`
- `effective_to`
- `is_default_profile`
- `filing_profile_code`
- `reporting_obligation_profile_code`
- `rulepack_version`
- `status`

## DeclarationProfile

Fält:

- `declaration_profile_id`
- `legal_form_code`
- `tax_year`
- `required_package_codes`
- `supplement_package_codes`
- `signatory_class_code`
- `submission_family_code`
- `status`

## ReportingObligationProfile

Fält:

- `reporting_obligation_profile_id`
- `legal_form_code`
- `fiscal_year_id`
- `requires_annual_report`
- `requires_year_end_accounts`
- `allows_simplified_year_end`
- `requires_bolagsverket_filing`
- `requires_tax_declaration_package`
- `status`

# Required fields

- company identity
- legal form code
- effective period
- fiscal year reference
- filing profile
- declaration profile
- reporting obligation profile
- signatory class
- rulepack version

# State machines

## LegalFormProfile

- `planned`
- `active`
- `superseded`
- `historical`

## DeclarationProfile

- `draft`
- `active`
- `superseded`
- `historical`

## ReportingObligationProfile

- `draft`
- `calculated`
- `approved`
- `historical`

# Validation rules

1. Överlappande legal-form-profiler är förbjudna.
2. Filing package får inte starta utan aktiv legal-form snapshot.
3. Reporting-obligation profile måste finnas innan annual readiness kan beräknas.
4. Signatory class måste finnas innan annual filing kan gå till submissionberedskap.
5. Sole-trader profile får inte använda AB- eller EF-signatory class.
6. AB- eller EF-profile får inte använda NE-/NEA-baserad declaration profile.
7. HB/KB-profile får inte använda AB:s Inkomstdeklaration 2-path.
8. Reporting obligation som kräver årsredovisning måste blockera filing om årsredovisningspaket saknas.
9. Avvikelse mellan registrerad form och lokal tenant-konfiguration måste skicka ärendet till review.

# Deterministic decision rules

## Rule LF-001: Filing profile selection

Varje filing package ska använda den legal-form profile som är aktiv för aktuellt räkenskapsår och closing snapshot.

## Rule LF-002: Sole trader path

Enskild näringsverksamhet ska gå genom NE-/NEA-baserad deklarationsprofil och årsbokslutsprofil enligt aktuell storleks- och regelbild. Bolagsverksårsredovisning får inte antas som default-path.

## Rule LF-003: AB path

Aktiebolag ska använda AB-filprofil med årsredovisningskrav, formspecifik signatory chain och Inkomstdeklaration 2-profil.

## Rule LF-004: Economic association path

Ekonomisk förening ska använda EF-filprofil med egen signatory class och Inkomstdeklaration 2-profil. Den får inte behandlas som synonym till aktiebolag även om deklarationsfamiljen sammanfaller.

## Rule LF-005: HB/KB path

Handelsbolag och kommanditbolag ska använda Inkomstdeklaration 4-profil. Reporting-obligation profile ska avgöra om årsbokslut eller årsredovisning krävs för aktuellt år.

## Rule LF-006: Snapshot immutability

När annual package byggts ska legal-form snapshot, declaration profile och reporting-obligation profile låsas till package version och aldrig muteras i efterhand.

# Rulepack dependencies

- `RP-LEGAL-FORM-SE`
- `RP-FISCAL-YEAR-SE`
- `RP-ANNUAL-FILING-SE`
- `RP-SIGNATORY-SE`

# Submission/receipt behavior where relevant

- filing package och receipt chain ska bära legal-form snapshot, declaration profile snapshot och reporting-obligation profile snapshot
- receipt payload ska kunna visa om package avsåg Bolagsverket-filing, skattedeklaration eller båda

# Review requirements

Review krävs vid:

- formskifte
- oklar registrerad företagsform
- avvikelse mellan tenant setup och extern registreringsbild
- oklar årsredovisningsskyldighet för HB/KB
- ändring av signatory class nära filingfönster

# Correction model

- ny legal-form profile version
- ny reporting-obligation profile
- package rebuild med ny snapshot
- correction filing path via annual reporting

# Audit requirements

Audit ska visa:

- legal form decision
- filing profile
- declaration profile
- reporting-obligation profile
- signatory class
- applicable tax year
- source of external/legal review where such review was required

# Golden scenarios covered

- annual close AB
- annual close sole trader
- annual close HB/KB
- annual close economic association

# API implications

- `set_legal_form_profile`
- `resolve_declaration_profile`
- `resolve_reporting_obligation_profile`
- `validate_filing_readiness_by_legal_form`

# Test implications

- legal-form transitions
- filing profile selection
- reporting-obligation selection
- signatory prerequisites
- HB/KB annual-report obligation branching

# Exit gate

- [ ] företagsform är explicit och historiskt låst
- [ ] filing profile styr close och filing-gates
- [ ] reporting-obligation profile finns och används
- [ ] olika bolagsformer behandlas olika utan generiska genvägar
