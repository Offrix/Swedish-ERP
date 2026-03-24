# Master metadata

- Document ID: POL-010
- Title: Capitalization Policy
- Status: Binding
- Owner: Finance compliance governance
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated capitalization policy
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-policy-matrix.md`
  - `docs/master-control/master-rulepack-register.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - AP
  - ledger
  - documents
  - assets
- Related code areas:
  - `packages/domain-ap/*`
  - `packages/domain-ledger/*`
  - `packages/domain-document-classification/*`
- Related future documents:
  - `docs/compliance/se/accounting-foundation.md`
  - `docs/compliance/se/person-linked-document-classification-engine.md`

# Purpose

Styra när en anskaffning ska behandlas som anläggningstillgång och när den får kostnadsföras direkt.

# Scope

Policyn gäller:

- inventarier
- naturligt samband mellan flera anskaffningar
- inventarier av mindre värde
- inventarier med kort ekonomisk livslängd

# Why it exists

Felaktig gränsdragning mellan direkt kostnad och aktivering ger fel resultat, fel balansräkning och fel skattemässig behandling.

# Non-negotiable rules

1. En anskaffning ska inte direktkostnadsföras om den enligt policy och regelpack ska aktiveras.
2. Inventarier av mindre värde får bara direktkostnadsföras inom tillåten gräns.
3. Tillgångar med ekonomisk livslängd högst tre år får behandlas som korttidsinventarier.
4. Flera anskaffningar med naturligt samband eller som är del av större investering ska bedömas tillsammans.
5. Klassning till kostnad eller tillgång ska vara spårbar och auditbar.

# Allowed actions

- direktkostnadsföra mindre värde eller kort livslängd när villkoren är uppfyllda
- aktivera tillgång när livslängd eller värde kräver det
- skicka osäkra fall till review

# Forbidden actions

- splittra naturligt sammanhängande inköp för att kringgå aktiveringsgräns
- aktivera eller kostnadsföra utan dokumenterat beslutsunderlag i osäkra fall
- ändra redan beslutad klassning tyst

# Approval model

- standardfall via deterministisk regel
- gränsfall eller större investeringar via review och godkänd policykedja

# Segregation of duties where relevant

- högriskomklassning från kostnad till tillgång eller tvärtom efter bokföring kräver separat godkännare

# Audit and evidence requirements

Audit ska visa:

- anskaffningsvärde
- livslängdsbedömning
- naturligt samband
- beslutad behandling
- regelversion

# Exceptions handling

Osäkra fall ska gå till review. Undantag får inte lösas genom fri handsättning i AP eller UI.

# Backoffice/support restrictions where relevant

- support får inte själv omklassificera kostnad/tillgång utanför ordinarie correctionkedja

# Runtime enforcement expectations

- kapitaliseringsregeln ska köras server-side
- policygränser ska ligga i rulepacks
- systemet ska kunna visa varför direktavdrag eller aktivering valdes

# Test/control points

- mindre värde inom gräns går till direkt kostnad
- kort livslängd går till direkt kostnad
- naturligt samband blockerar uppdelad kringgående hantering
- gränsfall går till review

# Exit gate

- [ ] kapitaliseringsgränser och treårsregeln är modellerade
- [ ] naturligt samband beaktas
- [ ] osäkra fall går till review
