> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: SE-CMP-017
- Title: Benefits Engine
- Status: Binding
- Owner: Payroll and finance compliance architecture
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/compliance/se/benefits-engine.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rulepack-register.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - benefits
  - documents
  - payroll
  - AGI
- Related code areas:
  - `packages/domain-benefits/*`
  - `packages/document-engine/*`
  - `packages/domain-payroll/*`
- Related future documents:
  - `docs/compliance/se/person-linked-document-classification-engine.md`
  - `docs/policies/benefits-pension-travel-company-policy.md`

# Purpose

Definiera den bindande motorn för skattepliktiga och skattefria förmåner, egen betalning, nettolöneavdrag och payroll/AGI-handoff.

# Scope

Ingår:

- bilförmån och drivmedelsförmån
- kostförmån
- friskvård
- gåvor
- privata köp på företagskort
- egen betalning och nettolöneavdrag

Ingår inte:

- full pensionsprodukt
- full reseersättningsprodukt utanför benefits bridge

# Non-negotiable rules

1. Varje förmånshändelse måste kunna knytas till person, period och underlag.
2. Förmånsvärde får aldrig gissas; värdering ska komma från deterministisk regel eller review.
3. Egen betalning eller nettolöneavdrag får bara reducera förmånsvärde där regelpaket uttryckligen tillåter det.
4. Friskvårdsbidrag ska bara behandlas som skattefritt när villkoren för skattefri motion/friskvård är uppfyllda.
5. Gåvogränser som är allt-eller-inget får inte behandlas proportionellt.
6. Förmånshändelse som påverkar skatt eller AGI får inte lämna benefits-domänen utan auditbar valuation explanation.

# Definitions

- `Benefit event`: grundhändelse som beskriver vad den anställda har fått eller nyttjat.
- `Benefit valuation`: beräknat skattepliktigt eller skattefritt utfall.
- `Employee contribution`: anställds betalning som kan minska förmånsvärde.
- `Net deduction`: nettolöneavdrag som kan påverka slutligt skattepliktigt värde.

# Object model

## BenefitEvent

Fält:

- `benefit_event_id`
- `employee_id`
- `benefit_type_code`
- `event_date`
- `source_document_id`
- `source_object_type`
- `source_object_id`
- `status`

## BenefitValuation

Fält:

- `benefit_valuation_id`
- `benefit_event_id`
- `valuation_method_code`
- `market_value_amount`
- `taxable_value_amount`
- `employee_payment_amount`
- `net_deduction_amount`
- `rulepack_version`
- `status`

# Required fields

- employee identity
- benefit type
- event date
- valuation basis
- supporting document or source object
- policy and rulepack version

# State machines

## BenefitEvent

- `draft`
- `classified`
- `valued`
- `approved`
- `dispatched_to_payroll`
- `corrected`
- `closed`

## BenefitValuation

- `proposed`
- `approved`
- `superseded`

# Validation rules

1. Privat köp på företagskort får inte skickas som bolagskostnad utan benefit/outlay-beslut.
2. Friskvård som saknar tydligt underlag eller avser presentkort ska blockeras från skattefri behandling.
3. För 2026 ska friskvårdsbidrag bara behandlas som skattefritt upp till 5 000 kr per anställd och år när övriga villkor är uppfyllda.
4. För 2026 ska skattefria gåvor behandlas enligt regelpaketens gränser: julgåva 600 kr, jubileumsgåva 1 800 kr och minnesgåva 15 000 kr; överskrids allt-eller-inget-gränsen blir hela gåvan skattepliktig där regeln kräver det.
5. För 2026 ska kostförmånsvärde stödja 62 kr för frukost, 124 kr för lunch eller middag och 310 kr för fri kost per dag.
6. Bilförmån som påstås vara ringa privat användning måste stödjas av korrekt underlag; gränsen behandlas som högst tio tillfällen och högst 100 mil per år.

# Deterministic decision rules

## Rule BEN-001: Wellness

Friskvård behandlas som skattefri endast om:

- aktiviteten är godkänd i rulepack
- underlag visar aktivitet och leverantör
- policy tillämpas lika
- årsgränsen inte överskrids

## Rule BEN-002: Gifts

Gåvotyp styr om gränsen är skattefri. Om beloppet överskrider tillåten gräns där allt-eller-inget gäller ska hela gåvan bli skattepliktig.

## Rule BEN-003: Employee payment

Egen betalning och nettolöneavdrag får bara minska förmånsvärde om rulepacken för aktuell förmån uttryckligen medger det.

## Rule BEN-004: Document-driven benefit

Dokument med personpåverkan får bara skapa benefit event efter godkänd klassning i person-linked document engine.

# Rulepack dependencies

- `RP-BENEFITS-SE`
- `RP-WELLNESS-SE`
- `RP-GIFTS-SE`
- `RP-MEAL-BENEFITS-SE`
- `RP-CAR-BENEFITS-SE`

# Posting/accounting impact

- benefits ska skapa payroll handoff, AGI mapping och bokföringsintents för förmånskostnad, motkonto och eventuellt nettolöneavdrag

# Payroll impact where relevant

- benefit valuation blir pay lines eller motsvarande payroll outcomes

# AGI impact where relevant

- skattepliktiga förmåner ska mappas till rätt AGI-box genom payroll

# Review requirements

Review krävs vid:

- blandade dokumentfall
- oklar gåvotyp
- osäker friskvårdsaktivitet
- car-benefit edge cases

# Correction model

- ny valuation version
- nytt payroll handoff
- AGI correction via payroll, aldrig overwrite

# Audit requirements

Audit ska visa:

- source document
- benefit type
- valuation method
- employee payment
- final taxable value

# Golden scenarios covered

- taxable benefit
- net salary deduction
- wellness within threshold
- wellness over threshold
- private spend on company card

# API implications

- create and approve benefit event
- recalculate valuation
- dispatch to payroll
- correction commands

# Test implications

- wellness threshold
- gift threshold behavior
- meal benefit values
- employee payment offsets

# Exit gate

- [ ] alla förmånsutfall är spårbara och förklarbara
- [ ] policy- och rulepackgränser styr skattefritt kontra skattepliktigt utfall
- [ ] payroll och AGI får bara godkända benefit valuations

