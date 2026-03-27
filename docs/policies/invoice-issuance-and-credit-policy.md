> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: POL-009
- Title: Invoice Issuance and Credit Policy
- Status: Binding
- Owner: Finance compliance governance
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated invoice issuance policy
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-policy-matrix.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - AR
  - VAT
  - HUS
- Related code areas:
  - `packages/domain-ar/*`
  - `packages/domain-vat/*`
  - `packages/domain-hus/*`
- Related future documents:
  - `docs/compliance/se/invoice-legal-field-rules-engine.md`
  - `docs/compliance/se/ar-customer-invoicing-engine.md`

# Purpose

Styra när en faktura eller kreditfaktura får utfärdas och vilka minimikrav som måste vara uppfyllda innan systemet släpper igenom issue eller credit.

# Scope

Policyn gäller:

- kundfakturor
- kreditfakturor
- scenarioobligatoriska fakturafält
- specialuppgifter för vissa momsscenarier

# Why it exists

En faktura måste innehålla tillräckliga uppgifter för att kunna definieras och bedömas korrekt enligt momslagens faktureringskrav. Felaktigt utfärdade fakturor ger risk för fel moms, HUS-fel och kundtvister.

# Non-negotiable rules

1. Faktura får inte utfärdas om obligatoriska fakturauppgifter saknas.
2. Kreditfaktura får inte utfärdas utan tydlig koppling till ursprunglig faktura eller tydligt korrigeringsskäl.
3. Specialuppgifter som krävs för viss momsbehandling ska vara blockerande när scenariot träffar.
4. HUS-relaterad faktura får inte utfärdas om HUS-obligatoriska uppgifter saknas.
5. Ändringsfaktura ska tydligt visa ändringen av ursprungsfakturan.

# Allowed actions

- issue godkänd faktura
- issue kreditfaktura med korrekt referens
- skapa ny korrekt fullständig faktura när tidigare inte kan rättas via ändringsfaktura

# Forbidden actions

- issue med saknad motpart, datum, belopp eller identifiering
- kredit utan referens eller revisionsbar orsak
- kringgå blockerande fält med fri text eller UI-genväg

# Approval model

- standardfaktura följer ordinarie issuebehörighet
- högrisk eller policyträff kan kräva review enligt AR- och SoD-regler

# Segregation of duties where relevant

- större krediter, HUS- och specialmomsfall kan kräva separat attest där SoD-policy anger det

# Audit and evidence requirements

Audit ska visa:

- vem som utfärdade
- vilka blockerande regler som passerades
- vilken ursprungsfaktura som en kredit hänför sig till
- vilket scenario/rulepack som styrde särskilda fältkrav

# Exceptions handling

Det är tillåtet att i vissa felaktiga fall kräva helt ny faktura i stället för ändringsfaktura. Systemet ska då blockera otillåten “snabbrättning”.

# Backoffice/support restrictions where relevant

- support får inte issue:a eller kreditera i stället för ordinarie affärsflöde

# Runtime enforcement expectations

- fältkrav ska kontrolleras server-side före issue
- issue eller credit ska nekas med tydlig blockeringsorsak

# Test/control points

- standardfakturor med minimiuppgifter går igenom
- saknade obligatoriska uppgifter blockerar
- krediter utan referens blockerar
- specialscenarier kräver sina tilläggsfält

# Exit gate

- [ ] issue och credit blockerar på saknade krav
- [ ] specialscenarier kan inte smita förbi
- [ ] kreditkedjan är spårbar

