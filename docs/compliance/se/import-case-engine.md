> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: SE-CMP-007
- Title: Import Case Engine
- Status: Binding
- Owner: Finance compliance architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated import-case document
- Approved by: User directive, MCP-001 and ADR-0027
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - import cases
  - AP
  - VAT
  - documents
  - ledger
- Related code areas:
  - `packages/domain-import-cases/*`
  - `packages/domain-ap/*`
  - `packages/domain-vat/*`
  - `packages/document-engine/*`
  - `packages/domain-ledger/*`
- Related future documents:
  - `docs/adr/ADR-0027-import-case-and-multi-document-linkage-architecture.md`
  - `docs/compliance/se/ap-supplier-invoice-engine.md`
  - `docs/compliance/se/vat-engine.md`

# Purpose

Definiera den bindande motorn för importfall där flera dokument tillsammans avgör kostnad, tullvärde, importmoms, frakt, spedition och periodisering.

# Scope

Ingår:

- importcase-identitet
- case-länkning mellan leverantörsfaktura, tullunderlag, speditörsfaktura och senare kompletterande avgifter
- completeness gates
- moms- och kostnadskomponenter
- reviewkrav

Ingår inte:

- full tulltaxeringsmotor
- alla framtida tullspecialfall utanför de här kärnkomponenterna

# Non-negotiable rules

1. Ett importrelaterat dokument får inte slutbehandlas isolerat om det uppenbart ingår i ett större importfall.
2. Importmoms ska beräknas mot beskattningsunderlaget vid import, inte bara mot leverantörsfakturans belopp.
3. Importcase ska kunna bära bikostnader som transport och försäkring till bestämmelseorten i EU när de ska ingå i importmomsunderlaget.
4. Tull, andra statliga avgifter än moms samt relevanta bikostnader ska kunna särskiljas.
5. Ofullständigt importcase ska gå till review när moms- eller kostnadsutfall annars skulle bli osäkert.

# Definitions

- `Import case`: sammanhållet case för en importhändelse.
- `Primary supplier document`: dokumentet som speglar inköpet av varan.
- `Customs evidence`: underlag med tullvärde, tull och andra importavgifter.
- `Forwarder/spedition document`: underlag för frakt, spedition eller relaterade avgifter.
- `Case completeness`: bedömning om caset har tillräckligt underlag för säkert bokförings- och momsutfall.

# Object model

## ImportCase

Fält:

- `import_case_id`
- `company_id`
- `case_reference`
- `status`
- `goods_origin_country`
- `customs_reference`
- `currency`
- `opened_at`

## ImportCaseDocumentLink

Fält:

- `import_case_document_link_id`
- `import_case_id`
- `document_id`
- `role_code`
- `linked_at`

## ImportCaseComponent

Fält:

- `import_case_component_id`
- `import_case_id`
- `component_type`
- `amount`
- `currency`
- `vat_relevance_code`
- `ledger_treatment_code`

## ImportCaseReview

Fält:

- `import_case_review_id`
- `import_case_id`
- `reason_code`
- `status`
- `assigned_queue`

# Required fields

- minst ett primary supplier document eller motsvarande varuanskaffningsunderlag
- importspecifik referens eller starkt samband mellan dokumenten
- komponentuppdelning för tull, importmoms och bikostnader när de finns

# State machines

## ImportCase

- `opened`
- `collecting_documents`
- `ready_for_review`
- `approved`
- `posted`
- `corrected`
- `closed`

## ImportCaseReview

- `open`
- `in_review`
- `approved`
- `rejected`
- `reopened`

# Validation rules

1. Samma dokument får inte vara primary supplier document i två aktiva importfall utan review.
2. Om tull- eller importmomsunderlag saknas i ett scenario där sådant borde finnas ska case completeness bli blockerande eller reviewkrävande.
3. Belopp för tull, importmoms och bikostnader ska kunna härledas till dokument eller explicit manuell registrering med audit.
4. Component types får inte dubbelräknas när flera dokument avser samma avgift.

# Deterministic decision rules

## Rule IC-001: Case formation

Dokument ska kopplas till importcase när minst ett av följande gäller:

- gemensam tull-/importreferens
- stark matchning på leverantör, transportör och tidsfönster
- explicit användarkoppling i review med audit

## Rule IC-002: Completeness gate

Case får inte dispatchas till slutligt moms- eller bokföringsutfall om case completeness är blockerande.

## Rule IC-003: Component separation

Varukostnad, tull, importmoms, transport, försäkring och spedition ska kunna lagras och bedömas som separata komponenter även när de kommer från olika dokument.

# Rulepack dependencies

- `RP-IMPORT-CASE-SE`
- `RP-VAT-IMPORT-SE`
- `RP-CAPITALIZATION-SE`

# Posting/accounting impact

- varukostnad, tull och frakt kan ge olika bokföringsbehandling
- importmoms ska kunna ledas till rätt momslogik utan att blandas ihop med leverantörsmoms

# VAT impact where relevant

- momsregistrerade företag ska kunna redovisa importmoms till Skatteverket
- beskattningsunderlaget ska kunna inkludera tullvärde, tull/andra statliga avgifter samt relevanta bikostnader

# Review requirements

Review krävs när:

- case completeness är osäker
- tullvärde eller bikostnader inte går att härleda säkert
- dokument verkar avse samma import men med motstridiga belopp

# Correction model

- felaktig casekoppling rättas via case correction chain
- redan postade downstream-effekter rättas i respektive domän via correction chain

# Audit requirements

Audit ska visa:

- vilka dokument som ingick i caset
- vilka komponenter som skapades
- vem som godkände review
- vilka downstream-effekter som skapades

# Golden scenarios covered

- import with later customs
- import with later freight/spedition
- late component added to existing case

# API implications

Kommandon:

- `open_import_case`
- `link_document_to_import_case`
- `add_import_case_component`
- `approve_import_case`
- `correct_import_case`

Queries:

- `get_import_case`
- `get_import_case_completeness`
- `get_import_case_components`

# Test implications

- täcks i kommande AP-, VAT- och import-case-testspår

# Exit gate

- [ ] importcase finns som eget bounded context
- [ ] flera dokument kan länkas till samma importcase
- [ ] completeness gate blockerar osäkra moms- och bokföringsutfall

