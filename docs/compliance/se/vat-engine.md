> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: SE-CMP-010
- Title: VAT Engine
- Status: Binding
- Owner: VAT compliance architecture
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/compliance/se/vat-engine.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-rulepack-register.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - VAT
  - ledger
  - AR
  - AP
  - import cases
  - HUS
- Related code areas:
  - `packages/domain-vat/*`
  - `packages/domain-ledger/*`
  - `packages/domain-ar/*`
  - `packages/domain-ap/*`
  - `packages/domain-import-cases/*`
- Related future documents:
  - `docs/compliance/se/import-case-engine.md`
  - `docs/compliance/se/ar-customer-invoicing-engine.md`
  - `docs/compliance/se/ap-supplier-invoice-engine.md`

# Purpose

Definiera den bindande momsmotorn för svensk momsredovisning med deklarationsmappning, reviewgränser, importmoms, reverse charge och credit-note-spegelregler.

# Scope

Ingår:

- VAT treatment classification
- declaration mapping
- reverse charge
- importmoms
- credit notes
- review boundaries

Ingår inte:

- full internationell momsplattform utanför definierade svenska kärnscenarier

# Non-negotiable rules

1. VAT-motorn är ensam ägare av momsbeslut.
2. Momsbeslut får inte gissas i AR, AP eller UI.
3. Importmoms ska behandlas utifrån importmomsens egna regler och importcase-underlag.
4. Bikostnader som ska ingå i importmomsens beskattningsunderlag måste kunna särskiljas från vanliga inköp.
5. Reverse charge-scenarier ska vara explicit regelstyrda.
6. Kreditfakturor ska spegla eller korrekt korrigera tidigare momsutfall, inte skapa frikopplad momslogik.

# Definitions

- `VAT treatment`
- `VAT declaration line`
- `Reverse charge`
- `Import VAT`
- `Credit-note mirror`
- `VAT review case`

# Object model

## VatDecision

Fält:

- `vat_decision_id`
- `source_domain`
- `source_object_id`
- `vat_treatment_code`
- `tax_point_date`
- `rulepack_version`
- `review_required`

## VatDeclarationMapping

Fält:

- `vat_declaration_mapping_id`
- `vat_decision_id`
- `declaration_box_code`
- `taxable_amount`
- `vat_amount`

## VatReviewCase

Fält:

- `vat_review_case_id`
- `vat_decision_id`
- `reason_code`
- `status`

# Required fields

- source object
- tax point date
- VAT treatment code
- declaration mapping
- rulepack version

# State machines

## VatDecision

- `draft`
- `calculated`
- `under_review`
- `approved`
- `reported`
- `corrected`

# Validation rules

1. Ett VAT-beslut måste mappa till deklarationsrutor eller uttryckligen gå till review.
2. Importmoms får inte behandlas som vanlig leverantörsmoms.
3. Reverse charge-fall får inte issue:as eller bokas utan rätt scenarioidentitet.
4. Kreditfaktura måste kunna hänföras till tidigare momsutfall eller ha tydlig korrigeringsgrund.

# Deterministic decision rules

## Rule VAT-001: Source of truth

AR, AP, import cases och HUS levererar källfakta, men VAT väljer treatment och declaration mapping.

## Rule VAT-002: Import VAT

När vara importeras från land utanför EU ska VAT-motorn kunna använda beskattningsunderlag som omfattar tullvärde, tull/andra statliga avgifter samt relevanta bikostnader till första eller annan känd bestämmelseort där reglerna kräver det.

## Rule VAT-003: Reverse charge

Reverse charge tillämpas endast när scenario, motpart och tjänste-/varutyp träffar regelpaketet. Felaktigt debiterad moms i reverse-charge-fall ska korrigeras genom rätt kredit- eller ändringskedja.

## Rule VAT-004: Credit note mirror

Kredit ska spegla eller korrigera momsutfallet från ursprunglig affär på ett spårbart sätt.

# Rulepack dependencies

- `RP-VAT-SE`
- `RP-VAT-IMPORT-SE`
- `RP-VAT-REVERSE-CHARGE-SE`
- `RP-INVOICE-FIELD-RULES-SE`

# Posting/accounting impact

- VAT-beslut ska kunna skapa eller styra momsrelaterade ledger-poster
- momskonton och deklarationsunderlag ska vara härledbara från `VatDecision`

# Payroll impact where relevant

- normalt ingen direkt payrollpåverkan, men moms på förmåns- eller kostnadsrelaterade underlag måste fortfarande bedömas via rätt källdomän

# AGI impact where relevant

- ingen direkt AGI-påverkan

# HUS impact where relevant

- HUS-fall kan kräva särskild faktura- och momshantering och måste därför bära explicit scenarioidentitet

# Submission/receipt behavior where relevant

- VAT-deklaration ska kunna härleda varje rapporterat belopp till approved `VatDecision`-objekt

# Review requirements

Review krävs när:

- treatment inte kan mappas säkert
- importcase är ofullständigt
- reverse-charge-kriterier är oklara
- kreditkedja saknar tillräcklig koppling

# Correction model

- fel momsbeslut rättas via ny `VatDecision`-kedja och eventuellt korrigeringsrapportering
- historiskt utfall skrivs inte över

# Audit requirements

Audit ska visa:

- källobjekt
- VAT treatment
- rulepack version
- declaration mapping
- reviewbeslut
- corrections

# Golden scenarios covered

- VAT reverse charge
- VAT import
- VAT credit note
- mixed import case

# API implications

Kommandon:

- `calculate_vat_decision`
- `approve_vat_decision`
- `correct_vat_decision`
- `build_vat_declaration_snapshot`

Queries:

- `get_vat_decision`
- `get_vat_declaration_mapping`
- `get_vat_review_cases`

# Test implications

- importmoms
- reverse charge
- credit note mirror
- declaration mapping

# Exit gate

- [ ] VAT är enda ägaren av momsbeslut
- [ ] import- och reverse-charge-fall är explicit modellerade
- [ ] kreditkedjor är spårbara
- [ ] review fångar osäkra scenarier

