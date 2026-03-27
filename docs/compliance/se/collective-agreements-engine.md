> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: SE-CMP-006
- Title: Collective Agreements Engine
- Status: Binding
- Owner: Payroll compliance architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated collective-agreements document
- Approved by: User directive, MCP-001 and ADR-0026
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-rulepack-register.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - collective agreements
  - payroll
  - time
  - HR
  - balances
- Related code areas:
  - `packages/domain-collective-agreements/*`
  - `packages/domain-payroll/*`
  - `packages/domain-time/*`
  - `packages/domain-balances/*`
- Related future documents:
  - `docs/adr/ADR-0026-payroll-migration-balances-and-agreements-architecture.md`
  - `docs/test-plans/payroll-migration-and-balance-tests.md`

# Purpose

Definiera den bindande motorn för versionerade kollektivavtal, avtalsfamiljer, överstyrningar och kopplingen till tid, lön och saldon.

# Scope

Ingår:

- agreement families
- agreement versions
- effective dating
- default rules för OB, övertid, avrundning och balanskoppling
- employee agreement assignment

Ingår inte:

- hela innehållet i varje enskilt kollektivavtal som standarddata från dag ett
- företagsspecifik policy som ligger utanför avtalets eller lagens område

# Non-negotiable rules

1. Avtalsregler ska vara versionerade och effektiva datumstyrda.
2. Historisk löneberäkning får inte förändras när ny avtalsversion publiceras.
3. Samma anställning får inte ha två oförenliga aktiva avtalsassignment för samma period.
4. Lön och tid får inte hårdkoda avtalsregler i applikationskod när motorn kan bära dem.
5. Avtalsöverstyrningar måste vara explicita och auditerade.

# Definitions

- `Agreement family`: avtalstyp eller avtalsfamilj.
- `Agreement version`: tidsbunden regelversion inom en avtalsfamilj.
- `Agreement assignment`: koppling mellan anställning och avtalsversion.
- `Agreement override`: begränsad avvikelse från standardregel med egen audit.

# Object model

## AgreementFamily

Fält:

- `agreement_family_id`
- `code`
- `name`
- `sector_code`
- `status`

## AgreementVersion

Fält:

- `agreement_version_id`
- `agreement_family_id`
- `effective_from`
- `effective_to`
- `rulepack_version`
- `status`

## AgreementAssignment

Fält:

- `agreement_assignment_id`
- `employment_id`
- `agreement_version_id`
- `effective_from`
- `effective_to`
- `assignment_reason_code`

## AgreementOverride

Fält:

- `agreement_override_id`
- `agreement_assignment_id`
- `override_type`
- `override_payload`
- `approved_by`
- `approved_at`

# Required fields

- agreement family
- agreement version
- effective dates
- employment assignment
- rulepack version

# State machines

## AgreementVersion

- `draft`
- `approved`
- `active`
- `historical`
- `retired`

## AgreementAssignment

- `planned`
- `active`
- `historical`

# Validation rules

1. Avtalsassignment får inte överlappa utan uttrycklig och konfliktfri ersättningskedja.
2. Avtalsversion måste ha rulepack-version och effective dating.
3. Override utan approval metadata är förbjudet.
4. Tid-, löne- och saldohändelser måste kunna härledas till aktiv avtalsversion.

# Deterministic decision rules

## Rule CA-001: Version selection

Aktiv avtalsversion för en händelse bestäms av anställningens assignment och händelsedatum.

## Rule CA-002: Historical pinning

När en löne- eller tidhändelse realiseras ska den peka på exakt avtalsversion och inte omberäknas mot nyare version utan särskild correction/replay.

## Rule CA-003: Overrides

Override får bara gälla definierat scope, definierad period och definierad anledning. Den får aldrig vara osynlig.

# Rulepack dependencies

- `RP-COLLECTIVE-AGREEMENTS-SE`
- `RP-BALANCES-SE`
- `RP-PAYROLL-SE`
- `RP-TIME-SE`

# Posting/accounting impact

- avtal kan påverka lönearter, semesterskuld, övertid, OB och därmed ledger-spegling via payroll

# Payroll impact where relevant

- payroll måste konsumera avtalets regler för beräkningskedja

# AGI impact where relevant

- AGI påverkas indirekt genom vilka lönekomponenter avtalet genererar

# Review requirements

Review krävs när:

- avtalsassignment byts bakåt i tiden
- override påverkar reglerat löneutfall
- historiskt replay skulle ändra utfall

# Correction model

- fel assignment rättas med ny assignment- eller overridekedja
- historiska utfall ändras endast via payroll correction

# Audit requirements

Audit ska visa:

- avtalsversion
- assignment
- overrides
- approval
- påverkade körningar

# Golden scenarios covered

- collective agreement edge case
- agreement version change between payroll periods
- audited override

# API implications

Kommandon:

- `create_agreement_family`
- `publish_agreement_version`
- `assign_agreement_to_employment`
- `create_agreement_override`

Queries:

- `get_active_agreement_for_employment`
- `get_agreement_version_history`

# Test implications

Måste täckas av:

- `docs/test-plans/payroll-migration-and-balance-tests.md`

# Exit gate

- [ ] agreements finns som egen motor
- [ ] assignments och overrides är effektiva datumstyrda
- [ ] historisk beräkning är pinad till avtalsversion
- [ ] payroll och time hårdkodar inte längre centrala avtalsregler

