# Master metadata

- Document ID: SE-CMP-019
- Title: ROT RUT Engine
- Status: Binding
- Owner: Finance compliance architecture
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/compliance/se/rot-rut-engine.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rulepack-register.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - HUS
  - AR
  - integrations
- Related code areas:
  - `packages/domain-hus/*`
  - `packages/domain-ar/*`
  - `packages/domain-integrations/*`
- Related future documents:
  - `docs/compliance/se/hus-invoice-and-claim-gates.md`
  - `docs/policies/hus-signing-and-submission-policy.md`

# Purpose

Definiera regelmotorn för ROT och RUT som materiell klassning, procentberäkning, köparfördelning och claim-underlag ovanpå HUS-lifecyclen.

# Scope

Ingår:

- ROT/RUT service classification
- labor share
- buyer split
- reduction percent and yearly cap
- claim materialization

Ingår inte:

- teknisk submissiontransport
- allmän AR-fakturering

# Non-negotiable rules

1. ROT och RUT är skattereduktioner, inte vanliga rabatter.
2. Endast arbetskostnad får ligga till grund för reduktion.
3. Kunden ska betala sin del innan utföraren kan begära utbetalning.
4. Utföraren måste uppfylla F-skatt- och övriga behörighetskrav enligt rulepack.
5. För 2026 ska regelpaketen stödja 30 procent för ROT och 50 procent för RUT.
6. För 2026 ska gemensamt tak stödja 75 000 kr per person och år, varav högst 50 000 kr får avse ROT.
7. Flera köpare ska kunna dela arbetskostnad och preliminär reduktion utan att totalsumman överskrider tillåtet utrymme i rulepacklogiken.

# Definitions

- `ROT service`: reparation, underhåll, ombyggnad eller tillbyggnad som omfattas av rulepack.
- `RUT service`: hushållsnära tjänst som omfattas av rulepack.
- `Preliminary reduction`: avdrag som visas på faktura före myndighetsbeslut.

# Object model

## RotRutClassificationDecision

Fält:

- `rot_rut_classification_decision_id`
- `hus_service_line_id`
- `service_family_code`
- `eligible_labor_amount`
- `reduction_percent`
- `rulepack_version`
- `status`

## RotRutBuyerYearUsage

Fält:

- `rot_rut_buyer_year_usage_id`
- `buyer_person_id`
- `tax_year`
- `rot_amount`
- `rut_amount`
- `combined_amount`
- `status`

# Required fields

- buyer identity
- service family
- labor amount
- work performed dates
- property or household relation
- customer payment status

# State machines

## RotRutClassificationDecision

- `draft`
- `eligible`
- `partially_eligible`
- `ineligible`
- `superseded`

# Validation rules

1. Service line utan särskild arbetskostnad får inte bli `eligible`.
2. Kundens betalning måste vara registrerad innan claim-underlag får gå vidare.
3. Köparandel får inte leda till preliminär reduktion över aktiv rulepackgräns.
4. Osäker serviceklassning ska gå till review.

# Deterministic decision rules

## Rule RR-001: Service family

Varje HUS-rad ska klassas som `ROT`, `RUT` eller `NONE` enligt aktiv servicekatalog i rulepack.

## Rule RR-002: Reduction percent

För 2026 ska preliminär reduktion beräknas med 30 procent för ROT och 50 procent för RUT på godkänd arbetskostnad.

## Rule RR-003: Annual cap

Årsutnyttjande per köpare ska följa combined cap 75 000 kr och ROT-del 50 000 kr enligt 2026 års rulepack.

## Rule RR-004: Claim eligibility

Ingen claim får byggas om inte arbetskostnad, köparidentitet, utfört arbete och kundbetalning är låsta och godkända.

# Rulepack dependencies

- `RP-HUS-SE`
- `RP-ROT-SE`
- `RP-RUT-SE`
- `RP-PAYMENT-EVIDENCE-SE`

# VAT impact where relevant

- ROT/RUT påverkar inte vem som äger momsbeslutet; VAT-domänen ligger kvar som källägare för momsbehandling av fakturaraden

# HUS impact where relevant

- ROT/RUT-motorn levererar materiell klassning och preliminär reduktion till HUS-lifecyclen

# Submission/receipt behavior where relevant

- claim payload ska bära service family, labor amount, buyer split och reduction percent från låst classification decision

# Review requirements

Review krävs vid:

- oklar tjänsteklassning
- oklar köparrelation
- delad köparandel med konflikter
- efterföljande kredit eller delgodkännande

# Correction model

- ny classification decision version
- ny claim version eller recovery chain i HUS

# Audit requirements

Audit ska visa:

- service family decision
- labor share
- reduction percent
- buyer split
- yearly cap evaluation snapshot

# Golden scenarios covered

- HUS accepted
- HUS partially accepted
- HUS recovery

# API implications

- classify_rot_rut_service
- calculate_preliminary_reduction
- update_buyer_split
- recalculate_after_credit

# Test implications

- yearly cap behavior
- buyer split
- partial eligibility
- credit and recovery handoff

# Exit gate

- [ ] ROT/RUT-klassning är deterministisk och versionerad
- [ ] yearly caps och procentregler styrs av rulepacks
- [ ] HUS-kedjan får komplett och låst material för claim
