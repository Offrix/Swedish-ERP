# Master metadata

- Document ID: SE-CMP-003
- Title: Person Linked Document Classification Engine
- Status: Binding
- Owner: Compliance architecture for documents, payroll and benefits
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated classification engine document
- Approved by: User directive, MCP-001 and ADR-0024
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - documents
  - document classification
  - benefits
  - payroll
  - ledger
  - review center
- Related code areas:
  - `packages/document-engine/*`
  - `packages/domain-document-classification/*`
  - `packages/domain-benefits/*`
  - `packages/domain-payroll/*`
  - `packages/domain-ledger/*`
  - `apps/api/*`
- Related future documents:
  - `docs/adr/ADR-0024-document-person-payroll-chain-architecture.md`
  - `docs/policies/document-review-and-economic-decision-policy.md`
  - `docs/test-plans/document-person-payroll-agi-tests.md`

# Purpose

Definiera motorn som avgör hur dokument med faktisk eller möjlig personpåverkan ska klassas innan de får påverka bokföring, förmåner, nettolöneavdrag, utlägg eller AGI.

# Scope

Ingår:

- privata köp på företagskort
- utlägg som ska ersättas
- förmåner
- nettolöneavdrag
- friskvård
- blandade dokument som måste splitas
- dokument som kan vara tillgång, kostnad eller privat del

Ingår inte:

- OCR-extraktion i sig
- slutlig förmånsvärdering som ägs av benefits
- slutlig löneberäkning som ägs av payroll

# Non-negotiable rules

1. OCR eller AI får aldrig vara slutligt klassningsbeslut.
2. Ett dokument med personpåverkan får inte bokföras direkt till slutligt ekonomiskt utfall utan klassningskedja.
3. Klassning ska ske på rad-, del- eller split-nivå när dokumentet innehåller blandade behandlingar.
4. Friskvårdsbidrag får bara behandlas som skattefri personalvårdsförmån när underlaget tydligt visar godkänd aktivitet och alla övriga villkor är uppfyllda.
5. Friskvårdsbidrag över 5 000 kronor per år och anställd ska inte behandlas som skattefri förmån.
6. För aktiviteter utan motionsinslag får kostnaden inte överstiga 1 000 kronor per tillfälle om skattefriheten ska bestå.
7. Privata köp på företagskort får aldrig klassas som bolagskostnad.
8. Dokument som inte kan klassas deterministiskt ska gå till review center.

# Definitions

- `Classification case`: sammanhållet beslutsobjekt för dokumentets behandling.
- `Treatment line`: en del av dokumentet som får egen behandling.
- `Person link`: koppling mellan treatment line och berörd fysisk person.
- `Treatment intent`: föreslaget eller godkänt downstream-resultat, till exempel benefit intent, reimbursement intent eller direct cost intent.
- `Review gate`: blockerande punkt där mänskligt beslut krävs.

# Object model

## ClassificationCase

Fält:

- `classification_case_id`
- `document_id`
- `company_id`
- `status`
- `source_channel`
- `confidence_class`
- `requires_review`
- `created_at`

## TreatmentLine

Fält:

- `treatment_line_id`
- `classification_case_id`
- `line_type`
- `gross_amount`
- `vat_amount`
- `currency`
- `candidate_treatment_code`
- `approved_treatment_code`

## PersonLink

Fält:

- `person_link_id`
- `treatment_line_id`
- `person_id`
- `employment_id`
- `relation_code`

## TreatmentIntent

Fält:

- `treatment_intent_id`
- `treatment_line_id`
- `intent_type`
- `target_domain`
- `ready_for_dispatch`
- `dispatch_status`

# Required fields

- document identity
- treatment lines
- amount basis
- candidate treatment
- review requirement
- person link when personpåverkan finns
- supporting evidence reference

# State machines

## ClassificationCase

- `ingested`
- `suggested`
- `under_review`
- `approved`
- `dispatched`
- `corrected`
- `closed`

## TreatmentIntent

- `draft`
- `approved`
- `dispatched`
- `realized`
- `reversed`

# Validation rules

1. Om treatment line gäller anställd, ägare eller annan identifierbar fysisk person måste `person_id` eller uttrycklig blockerare finnas.
2. Samma belopp får inte både gå till skattefri friskvård och till skattepliktig förmån.
3. Presentkort i sig får inte klassas som skattefri friskvård.
4. Dokumentets underlag måste visa vilken aktivitet eller vilken ekonomisk händelse som ersätts; annars krävs review.
5. En treatment line får inte dispatchas till payroll eller ledger innan approved treatment finns.

# Deterministic decision rules

## Rule DPC-001: Private spend

Om dokumentet avser privat köp på företagskort ska treatment line klassas som privat fordran, nettolöneavdrag eller annan policytillåten privatreglering. Direkt kostnadsbokning är förbjuden.

## Rule DPC-002: Reimbursable outlay

Om dokumentet avser ett verkligt utlägg för bolagets räkning och korrekt underlag finns ska treatment line skapa reimbursement intent och bokföras som bolagets kostnad eller tillgång enligt övriga policies.

## Rule DPC-003: Friskvård

Skattefri friskvård får endast föreslås när:

- aktiviteten tydligt framgår av underlaget
- den riktar sig inom ramen för personalvårdsförmån
- belopp och villkor inte överskrider tillåtna gränser

I övriga fall ska treatment line gå till review eller bli skattepliktig behandling.

## Rule DPC-004: Mixed document split

Om ett dokument innehåller både privat del, bolagskostnad och personpåverkan ska motorn splitta dokumentet i separata treatment lines med separata downstream intents.

# Rulepack dependencies

- `RP-DOCUMENT-CLASSIFICATION-SE`
- `RP-WELLNESS-SE`
- `RP-BENEFITS-SE`
- `RP-CAPITALIZATION-SE`
- `RP-VAT-TIMING-SE`

# Posting/accounting impact

- ledger ska bara få godkända treatment intents
- reimbursement ska skapa fordra/skuld-kedja enligt betalpolicy
- privata köp ska skapa privatregleringskedja, inte ren kostnad

# Payroll impact where relevant

- treatment lines kan skapa benefit intent eller net deduction intent
- payroll ska aldrig läsa råa OCR-fält som slutligt beslutsunderlag

# AGI impact where relevant

- endast approved och payroll-realized intents får bli AGI-underlag

# VAT impact where relevant

- VAT-klassning får inte fastställas slutligt utan dokumentets ekonomiska behandling
- blandade dokument måste kunna ha olika momsbehandling per treatment line

# Review requirements

Review krävs alltid när:

- privat kontra bolagsnytta inte är entydig
- friskvårdsunderlag saknar tydlig aktivitet
- dokumentet måste splitas men automatiken inte är säker
- treatment line kan ge AGI- eller HUS-påverkan

# Correction model

- felklassning rättas genom nytt klassningsbeslut och nya intents
- redan dispatchade downstream-effekter rättas via respektive domäns correction chain

# Audit requirements

Audit ska visa:

- originaldokument
- OCR/suggestion metadata
- godkänd treatment per line
- reviewbeslut
- downstream-dispatch och eventuell correction

# Golden scenarios covered

- private spend on company card
- reimbursable outlay
- taxable benefit
- net salary deduction
- wellness within threshold
- wellness over threshold
- mixed document split

# API implications

Kommandon:

- `create_classification_case`
- `propose_treatment_lines`
- `approve_classification_case`
- `dispatch_treatment_intents`
- `correct_classification_case`

Queries:

- `get_classification_case`
- `get_pending_review_cases`
- `get_dispatch_status`

# Test implications

Måste täckas av:

- `docs/test-plans/document-person-payroll-agi-tests.md`
- `docs/test-plans/document-classification-ai-boundary-tests.md`

# Exit gate

- [ ] dokument kan splitas i flera treatment lines
- [ ] personpåverkan är explicit länkad
- [ ] payroll och ledger tar bara emot godkända intents
- [ ] review center fångar tvetydiga fall
