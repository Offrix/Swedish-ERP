> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: SE-CMP-001
- Title: Accounting Method Engine
- Status: Binding
- Owner: Finance compliance architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated accounting-method document
- Approved by: User directive, MCP-001 and ADR-0022
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-rulepack-register.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - accounting method
  - ledger
  - AR
  - AP
  - VAT
  - reporting
- Related code areas:
  - `packages/domain-accounting-method/*`
  - `packages/domain-ledger/*`
  - `packages/domain-ar/*`
  - `packages/domain-ap/*`
  - `packages/domain-vat/*`
  - `apps/api/*`
- Related future documents:
  - `docs/adr/ADR-0022-accounting-method-and-fiscal-year-architecture.md`
  - `docs/compliance/se/accounting-foundation.md`
  - `docs/test-plans/accounting-method-tests.md`

# Purpose

Detta dokument definierar den bindande compliance-motorn för bokföringsmetod: `KONTANTMETOD` kontra `FAKTURERINGSMETOD`.

Motorn ska styra:

- när affärshändelser bokförs
- när AR/AP skapas eller bara registreras som betalningshändelser
- hur årsbokslut fångar obetalda fordringar och skulder under kontantmetod
- vilken metodprofil som var aktiv vid en viss tidpunkt
- hur VAT-motorn ska tolka timingberoende underlag tillsammans med momsrulepacks

# Scope

Ingår:

- method profile per företag
- effective dating
- method change requests
- validations mot företags- och omsättningsregler
- downstream-kontrakt mot ledger, AR, AP, VAT och reporting

Ingår inte:

- själva momssatserna och deklarationsrutorna
- årsslutslogik som ägs av fiscal year och annual reporting
- UI-layout

# Non-negotiable rules

1. Ett företag ska alltid ha exakt en aktiv bokföringsmetod per räkenskapsdag.
2. Metoden ska vara explicit och historiskt reproducerbar.
3. `KONTANTMETOD` får bara användas när företaget är tillåtet att dröja med bokföring till betalningstidpunkten.
4. Företag vars årliga nettoomsättning normalt överstiger tre miljoner kronor får inte använda `KONTANTMETOD`.
5. Företag som omfattas av årsredovisningslagstiftningen för kreditinstitut, värdepappersbolag eller försäkringsföretag får inte använda `KONTANTMETOD`.
6. Vid `KONTANTMETOD` ska obetalda fordringar och skulder bokföras vid räkenskapsårets utgång.
7. Vid `FAKTURERINGSMETOD` ska kundfordringar och leverantörsskulder uppstå när affärshändelsen uppkommer, inte först vid betalning.
8. Metod får inte ändras retroaktivt genom tyst mutation.
9. VAT-timing får aldrig gissas; VAT-motorn ska läsa bokföringsmetod och momsperiod tillsammans.

# Definitions

- `KONTANTMETOD`: produktens term för bokföring enligt regeln att affärshändelser får bokföras när betalning sker, med bokslutsfångst av obetalda fordringar och skulder vid årsslut.
- `FAKTURERINGSMETOD`: produktens term för bokföring där fordringar och skulder bokförs när de uppkommer.
- `Method profile`: företagets aktiva metodprofil med effective dating och legal basis.
- `Method change request`: objekt för framtida metodbyte, inklusive validering och approval.
- `Year-end catch-up`: den obligatoriska bokföringen av obetalda fordringar och skulder vid årsslut under kontantmetod.

# Object model

## AccountingMethodProfile

Fält:

- `method_profile_id`
- `company_id`
- `method_code`
- `effective_from`
- `effective_to`
- `legal_basis_code`
- `eligibility_snapshot`
- `approved_by`
- `approved_at`
- `created_at`
- `superseded_by`

## MethodChangeRequest

Fält:

- `method_change_request_id`
- `company_id`
- `current_method_code`
- `requested_method_code`
- `requested_effective_from`
- `reason_code`
- `requested_by`
- `requested_at`
- `status`
- `decision_note`
- `approved_by`
- `approved_at`

## MethodEligibilityAssessment

Fält:

- `assessment_id`
- `company_id`
- `assessment_date`
- `net_turnover_basis`
- `entity_type_basis`
- `financial_entity_exclusion`
- `rulepack_version`
- `eligible_for_cash_method`
- `blocking_reasons`

# Required fields

Följande måste alltid finnas innan aktiv metod kan frysas:

- företagets juridiska form
- omsättningsbedömning för eligibility
- effective_from
- method_code
- rulepack version
- approval metadata

# State machines

## MethodChangeRequest

- `draft`
- `submitted`
- `under_review`
- `approved`
- `rejected`
- `superseded`
- `implemented`

Tillåtna övergångar:

- `draft -> submitted`
- `submitted -> under_review`
- `under_review -> approved | rejected`
- `approved -> implemented`
- `draft | submitted | under_review -> superseded`

## AccountingMethodProfile lifecycle

- `planned`
- `active`
- `historical`

Tillåtna övergångar:

- `planned -> active`
- `active -> historical`

# Validation rules

1. `effective_from` måste vara första dagen i ett räkenskapsår, utom vid onboarding eller första inträde i bokföringsskyldighet.
2. Overlap mellan två aktiva metodprofiler för samma företag är förbjudet.
3. `KONTANTMETOD` nekas om eligibility assessment visar otillåten omsättning eller förbjuden företagstyp.
4. Metodbyte får inte aktiveras om öppna year-end-catch-up-poster från föregående metodkedja inte är avklarade.
5. Metodbyte får inte aktiveras om tidigare räkenskapsår fortfarande saknar låst method snapshot.

# Deterministic decision rules

## Rule AM-001: Choose active method

Aktiv metod för en affärshändelse bestäms av den metodprofil vars effective interval innehåller affärshändelsens bokföringsdatum.

## Rule AM-002: `FAKTURERINGSMETOD`

Vid `FAKTURERINGSMETOD` ska:

- kundfaktura skapa kundfordran vid utfärdande
- leverantörsfaktura skapa leverantörsskuld vid mottagande/bokföringspliktig registrering
- betalning därefter reglera öppen post

## Rule AM-003: `KONTANTMETOD`

Vid `KONTANTMETOD` ska:

- kontanta in- och utbetalningar bokföras senast påföljande arbetsdag
- andra affärshändelser få bokföras när betalning sker
- obetalda kundfordringar och leverantörsskulder bokföras vid räkenskapsårets utgång

## Rule AM-004: Year-end catch-up under `KONTANTMETOD`

Vid årsslut ska motorn skapa en deterministisk fångst av samtliga obetalda fordringar och skulder som per balansdagen ännu inte bokförts fullt ut. Dessa poster ska därefter regleras mot betalningen i nästa period utan dubbel intäkts- eller kostnadsföring.

## Rule AM-005: VAT handoff

Accounting-method-motorn beslutar inte själv momsruta eller deklarationsperiod, men den måste lämna ett entydigt timingunderlag till VAT-motorn om huruvida en affärshändelse ska behandlas som uppkommen vid fakturatidpunkt, betalningstidpunkt eller year-end catch-up.

# Rulepack dependencies

- `RP-ACCOUNTING-METHOD-SE`
- `RP-FISCAL-YEAR-SE`
- `RP-VAT-TIMING-SE`
- `RP-LEGAL-FORM-SE`

# Posting/accounting impact

- ledger måste referera `method_profile_id` på journals som påverkas av method timing
- AR/AP måste kunna skapa olika flöden beroende på metod
- year-end catch-up ska skapa egna spårbara verifikationer
- method-driven omklassningar får inte skriva över äldre journals

# VAT impact

- VAT-motorn ska kunna läsa om underlaget kommer från fakturatidpunkt, betalningstidpunkt eller year-end catch-up
- momsrapportering får inte avvika från den metodprofil och den momsperiod som gällde då händelsen blev deklarationsrelevant

# Review requirements

Review krävs alltid när:

- eligibility assessment inte är entydig
- metodbyte föreslås mitt i aktivt räkenskapsår
- historiskt replay hade gett annat utfall efter regeluppdatering

# Correction model

- fel metodprofil rättas genom ny change request och nytt historiskt beslut, aldrig genom overwrite
- felaktig year-end catch-up rättas med correction chain i ledger och historisk omkörning i method engine

# Audit requirements

Audit måste logga:

- vem som begärde metodbyte
- vilken eligibility assessment som användes
- rulepack-version
- beslutstidpunkt
- vilka downstream-objekt som påverkades

# Golden scenarios covered

- cash accounting method
- invoice accounting method
- method change at new fiscal year
- year-end catch-up under cash method
- ineligible company requesting cash method

# API implications

Kommandon:

- `create_method_profile`
- `submit_method_change_request`
- `approve_method_change_request`
- `activate_method_profile`
- `run_year_end_catch_up`

Queries:

- `get_active_method_for_date`
- `get_method_history`
- `get_method_eligibility_assessment`

# Test implications

Måste täckas av:

- `docs/test-plans/accounting-method-tests.md`
- `docs/test-plans/rulepack-effective-dating-tests.md`

# Exit gate

- [ ] accounting method finns som eget bounded context
- [ ] eligibility, history och year-end catch-up är deterministiska
- [ ] ledger, AR, AP och VAT läser från motorn i stället för från implicit logik
- [ ] golden tests och replaytester finns

