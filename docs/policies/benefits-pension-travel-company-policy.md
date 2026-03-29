> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: POL-015
- Title: Benefits, Pension, Travel and Company Policy
- Status: Binding
- Owner: HR governance and finance governance
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/policies/benefits-pension-travel-company-policy.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-policy-matrix.md`
  - `docs/master-control/master-rulepack-register.md`
- Related domains:
  - benefits
  - pension
  - travel
  - payroll
- Related code areas:
  - `packages/domain-benefits/*`
  - `packages/domain-payroll/*`
  - `packages/domain-travel/*`
- Related future documents:
  - `docs/compliance/se/benefits-engine.md`
  - `docs/compliance/se/payroll-engine.md`

# Purpose

Styra bolagets valbara policygränser inom friskvård, gåvor, pension, löneväxling, resor och utlägg där compliance-reglerna tillåter företagsval.

# Scope

Policyn gäller:

- friskvårdsersättning
- gåvor
- löneväxling
- pension
- resor och utlägg

# Why it exists

Många ersättningsflöden är delvis regelstyrda och delvis bolagsvalda. Policyn gör de valbara gränserna tekniskt verkställbara.

# Non-negotiable rules

1. Skattefria tak i regelpaket får aldrig överskridas utan att flödet växlar till skattepliktigt utfall.
2. Friskvård ska erbjudas på lika villkor inom den grupp som policyn omfattar.
3. Gåvetyper ska lagras med korrekt kategori och gränslogik.
4. Löneväxling får inte godkännas om kontantlönen efter växling underskrider bolagets definierade säkerhetsgräns.
5. Utlägg och resekostnader kräver underlag och attest.

# Allowed actions

- utbetala friskvård inom policytak
- ge gåva inom tillåten kategori
- aktivera löneväxling inom bolagets ramar
- ersätta resa och utlägg enligt attestkedja

# Forbidden actions

- ersätta friskvård utan underlag
- behandla förbjuden gåva som skattefri
- godkänna löneväxling som bryter minimikrav

# Approval model

- standardersättningar: chef eller budgetägare enligt beloppsgräns
- undantag från reseklass eller högre förmånsvärde: högre chef eller CFO

# Segregation of duties where relevant

- utlägg som gäller närmaste chef eller HR-ägare ska attesteras av annan behörig person

# Audit and evidence requirements

Spara:

- underlag
- attest
- policyversion
- undantagsbeslut

# Exceptions handling

Undantag från policygränser ska vara tidsbundna, dokumenterade och kunna särskiljas från standardutfall.

# Backoffice/support restrictions where relevant

- support får inte skapa eller godkänna ekonomiska policyundantag

# Runtime enforcement expectations

- bolagets policytak ska konfigureras server-side och läsas tillsammans med regelpaket
- utfall över skattefri gräns ska automatiskt gå till skattepliktig hantering eller review

# Test/control points

- friskvård över tak växlar till review eller skattepliktigt utfall
- gåvogränser fungerar som allt-eller-inget där regelpaket kräver det
- löneväxling under säkerhetsgräns blockeras

# Exit gate

- [ ] bolagets policyval är tekniskt verkställbara
- [ ] utlägg, gåvor och friskvård är auditbara
- [ ] undantag kräver dokumenterat beslut

