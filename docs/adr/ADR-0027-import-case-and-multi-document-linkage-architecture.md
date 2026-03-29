> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: ADR-0027
- Title: Import Case and Multi Document Linkage Architecture
- Status: Accepted
- Owner: Finance architecture and document architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior ADR
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - import cases
  - AP
  - VAT
  - documents
- Related code areas:
  - `packages/domain-import-cases/*`
  - `packages/domain-ap/*`
  - `packages/domain-vat/*`
  - `packages/document-engine/*`
  - `apps/api/*`
- Related future documents:
  - `docs/compliance/se/import-case-engine.md`
  - `docs/compliance/se/ap-supplier-invoice-engine.md`
  - `docs/compliance/se/vat-engine.md`

# Purpose

Låsa att importflöden med tull, frakt, spedition, importmoms och flera dokument hanteras som sammanhållna case i stället för som isolerade verifikationer eller isolerade leverantörsfakturor.

# Status

Accepted.

# Context

Repo:t har bra dokument- och AP-grund samt momsdomän, men saknar ett egenägt import-case-bounded context. I praktiken kommer svenska importflöden ofta i flera delar:

- leverantörsfaktura
- tull- eller myndighetsunderlag
- speditörsfaktura
- senare frakt- eller avgiftsunderlag

Detta måste kunna bedömas gemensamt för rätt moms- och kostnadsutfall.

# Problem

Om varje dokument behandlas isolerat uppstår risk för:

- felaktig moms
- dubbel kostnadsföring
- fel periodisering
- förlorad koppling mellan varuanskaffning och senare tull/frakt

# Decision

1. `import-cases` införs som eget bounded context.
2. Importcase blir source of truth för dokumentkedjan kring samma importhändelse.
3. AP och VAT får konsumera importcase-status och klassning, inte gissa fram relationen per enskild faktura.
4. Samma importcase ska kunna bära flera dokument, flera avgiftskomponenter och flera reviewbeslut.

# Scope

Beslutet omfattar:

- importcase-identitet
- dokumentlänkning
- statuskedja
- kostnads- och momskomponenter
- reviewkrav

Beslutet omfattar inte:

- alla detaljer i tullregelverkets framtida utbyggnad
- UI-layout

# Boundaries

`import-cases` äger:

- importcase
- dokumentlänkning
- component classification
- case completeness
- reviewstate

`AP` äger:

- leverantörsreskontra
- betalning
- invoice lifecycle

`VAT` äger:

- momsbeslut och deklarationsmappning

`document-engine` äger:

- originaldokument och OCR

# Alternatives considered

## Keep import logic inside AP only

Avvisas eftersom vissa importhändelser omfattar fler dokument än AP ensamt bör äga och eftersom VAT behöver en gemensam case-sanning.

## Let users manually relate documents ad hoc

Avvisas eftersom det blir osäkert, svårt att testa och svårt att replaya.

# Consequences

- nytt bounded context behövs
- AP, VAT och document engine behöver nya länkkontrakt
- golden scenarios för import måste byggas ut

# Migration impact

- befintliga importrelaterade dokument kan behöva backfillas till case där historiken finns

# Verification impact

Verifiering måste visa att:

- flera dokument kan bindas till samma case
- VAT och AP får samma case-sanning
- sena dokument kan komplettera case utan att äldre historik skrivs över

# Exit gate

- [ ] import-cases finns som eget bounded context
- [ ] AP och VAT konsumerar case-sanning
- [ ] multi-document import scenarios är testade

