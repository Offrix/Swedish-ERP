# Master metadata

- Document ID: SE-CMP-002
- Title: Fiscal Year and Period Engine
- Status: Binding
- Owner: Finance compliance architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated fiscal-year document
- Approved by: User directive, MCP-001 and ADR-0022
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - fiscal year
  - ledger
  - reporting
  - annual reporting
  - close
- Related code areas:
  - `packages/domain-fiscal-year/*`
  - `packages/domain-ledger/*`
  - `packages/domain-reporting/*`
  - `packages/domain-annual-reporting/*`
  - `packages/db/migrations/*`
- Related future documents:
  - `docs/adr/ADR-0022-accounting-method-and-fiscal-year-architecture.md`
  - `docs/compliance/se/legal-form-and-declaration-engine.md`
  - `docs/test-plans/fiscal-year-and-broken-year-tests.md`
  - `docs/runbooks/fiscal-year-change-runbook.md`

# Purpose

Detta dokument definierar den bindande motorn för räkenskapsår, periodgenerering, omläggning, brutet räkenskapsår, short year och extended year.

# Scope

Ingår:

- företagets tillåtna räkenskapsår
- legal-form- och ägarrelaterade begränsningar
- periodgenerering
- year change requests
- same-year constraints för flera verksamheter och koncerner
- lock-underlag för close och reporting

Ingår inte:

- årsredovisningsblanketter
- momsperioder i sig
- UI-layout

# Non-negotiable rules

1. Ett normalt räkenskapsår ska omfatta tolv kalendermånader.
2. Fysiska personer ska ha kalenderår som räkenskapsår.
3. Handelsbolag där fysisk person ska beskattas för hela eller del av inkomsten ska ha kalenderår som räkenskapsår.
4. Andra företag får ha brutet räkenskapsår om ingen annan spärr träffar.
5. Förkortat eller förlängt räkenskapsår får bara användas när bokföringsskyldigheten inträder, upphör eller räkenskapsåret läggs om.
6. Förlängt räkenskapsår får aldrig överstiga arton månader.
7. Omläggning kräver tillstånd från Skatteverket utom när undantag i lagen uttryckligen gäller.
8. Samma företag får inte ha två överlappande räkenskapsår.
9. Samma verksamhetsmassa ska inte bära olika räkenskapsår i strid med lagens krav på gemensamt år.

# Definitions

- `Fiscal year`: den lagligt giltiga tolvmånaders-, förkortade eller förlängda perioden som utgör företagets räkenskapsår.
- `Broken fiscal year`: annat räkenskapsår än kalenderår.
- `Short year`: räkenskapsår kortare än tolv månader.
- `Extended year`: räkenskapsår längre än tolv men högst arton månader.
- `Year change request`: begäran om omläggning eller initial fastställning.
- `Period`: underperiod inom ett fiscal year som används för bokföring, close och rapportering.

# Object model

## FiscalYearProfile

Fält:

- `fiscal_year_profile_id`
- `company_id`
- `legal_form_code`
- `must_use_calendar_year`
- `group_alignment_required`
- `rulepack_version`

## FiscalYear

Fält:

- `fiscal_year_id`
- `company_id`
- `start_date`
- `end_date`
- `year_kind`
- `approval_basis_code`
- `status`
- `prior_fiscal_year_id`
- `next_fiscal_year_id`

## FiscalPeriod

Fält:

- `period_id`
- `fiscal_year_id`
- `period_code`
- `start_date`
- `end_date`
- `lock_state`
- `close_state`

## FiscalYearChangeRequest

Fält:

- `change_request_id`
- `company_id`
- `requested_start_date`
- `requested_end_date`
- `reason_code`
- `tax_agency_permission_required`
- `permission_reference`
- `status`
- `approved_by`
- `approved_at`

# Required fields

- legal form
- ownership/taxation basis where relevant
- start date
- end date
- year kind
- approval basis
- rulepack version

# State machines

## FiscalYear

- `planned`
- `active`
- `closing`
- `closed`
- `historical`

Tillåtna övergångar:

- `planned -> active`
- `active -> closing`
- `closing -> closed`
- `closed -> historical`

## FiscalYearChangeRequest

- `draft`
- `submitted`
- `under_review`
- `approved`
- `rejected`
- `implemented`

## FiscalPeriod lock state

- `open`
- `soft_locked`
- `hard_locked`
- `reopened`

# Validation rules

1. `start_date` och `end_date` måste ligga på kalendermånadsgränser.
2. `end_date` får inte ligga före `start_date`.
3. Normal year måste vara exakt tolv kalendermånader.
4. Extended year måste vara högst arton månader.
5. Företag som enligt profile måste använda kalenderår får inte få brutet år.
6. Omläggning får inte implementeras utan laglig tillståndsgrund eller dokumenterat undantag.
7. Ett företag som bedriver flera verksamheter ska ha samma räkenskapsår för dessa, om inte särskilda skäl och god redovisningssed uttryckligen tillåter annat inom lagens ramar.
8. Koncernföretag ska ha gemensamt räkenskapsår om inte synnerliga skäl och tillstånd föreligger.

# Deterministic decision rules

## Rule FY-001: Calendar-year required

Om `FiscalYearProfile.must_use_calendar_year = true` ska motorn endast tillåta räkenskapsår 1 januari till 31 december.

## Rule FY-002: Broken-year eligibility

Brutet räkenskapsår får endast tilldelas företag som inte träffas av kalenderårskravet och där inga group-alignment-regler blockerar.

## Rule FY-003: Short and extended years

Short year eller extended year får bara skapas när:

- bokföringsskyldighet inträder
- bokföringsskyldighet upphör
- räkenskapsåret läggs om

## Rule FY-004: Change permission

Omläggning kräver tillståndsstatus `granted` om inte change request ligger i uttryckligt undantag:

- omläggning från brutet år till kalenderår
- omläggning till gemensamt räkenskapsår där lagen medger undantag från tillståndskravet

## Rule FY-005: Period generation

När ett fiscal year aktiveras ska motorn generera en komplett och deterministisk periodkalender som ledger, close, reporting och annual reporting måste konsumera i stället för egna datumantaganden.

# Rulepack dependencies

- `RP-FISCAL-YEAR-SE`
- `RP-LEGAL-FORM-SE`
- `RP-CLOSE-LOCK-SE`

# Posting/accounting impact

- ledger ska referera aktivt `fiscal_year_id` och `period_id`
- close och reopen måste använda periodernas lock state
- opening balance och year-end entries måste peka på rätt årskedja

# Payroll impact where relevant

- payroll periodisering och AGI-koppling får inte anta kalenderår om företaget rätteligen har brutet räkenskapsår, men AGI:s månadsrapportering ändras inte av att räkenskapsåret är brutet

# VAT impact where relevant

- momsperioder ägs fortsatt av VAT-motorn, men VAT får inte anta kalenderår för close eller årsavstämning när fiscal year är brutet

# Review requirements

Review krävs alltid när:

- year change request saknar tydlig tillståndsgrund
- group alignment bryts
- legal form eller ägarstruktur gör kalenderårskravet oklart

# Correction model

- felaktigt skapat fiscal year får inte skrivas över efter aktivering
- korrigering sker genom explicit year change chain, reopen eller ny godkänd baseline där historiken bevaras

# Audit requirements

Audit måste logga:

- legal-form- och owner-basis
- tillståndsreferens eller undantagsgrund
- vem som godkände
- när periodkalender genererades
- senare reopen- eller close-åtgärder

# Golden scenarios covered

- broken fiscal year
- short fiscal year at onboarding
- extended fiscal year at approved change
- calendar-year-forced sole trader
- group alignment

# API implications

Kommandon:

- `create_fiscal_year_profile`
- `submit_fiscal_year_change_request`
- `approve_fiscal_year_change_request`
- `activate_fiscal_year`
- `generate_periods`
- `reopen_period`

Queries:

- `get_active_fiscal_year_for_date`
- `get_period_for_date`
- `get_fiscal_year_history`

# Test implications

Måste täckas av:

- `docs/test-plans/fiscal-year-and-broken-year-tests.md`
- `docs/test-plans/rulepack-effective-dating-tests.md`

# Exit gate

- [ ] fiscal year finns som eget bounded context
- [ ] periodkalender genereras av motorn, inte av lokala hjälpfunktioner
- [ ] brutet år, short year och extended year valideras korrekt
- [ ] ledger, close och reporting läser från samma source of truth
