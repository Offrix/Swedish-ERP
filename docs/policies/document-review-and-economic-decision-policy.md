> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: POL-006
- Title: Document Review and Economic Decision Policy
- Status: Binding
- Owner: Compliance governance and finance operations
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated policy
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-policy-matrix.md`
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - documents
  - review center
  - AP
  - benefits
  - payroll
- Related code areas:
  - `packages/document-engine/*`
  - `packages/domain-document-classification/*`
  - `packages/domain-review-center/*`
- Related future documents:
  - `docs/compliance/se/person-linked-document-classification-engine.md`
  - `docs/domain/review-center.md`

# Purpose

Styra när dokumentbeslut får fattas automatiskt, när review krävs och vem som får godkänna ekonomisk behandling av dokument.

# Scope

Policyn gäller:

- OCR-resultat
- dokumentklassning
- ekonomiska treatment-beslut
- AP-drafts från dokument
- personpåverkande dokument

# Why it exists

Dokument är ofta råunderlag till bokföring, moms, lön eller HUS. Därför får systemet inte låta teknisk extraktion glida över i obevakat ekonomiskt beslut.

# Non-negotiable rules

1. Låg confidence eller policyträff kräver review.
2. Dokument med personpåverkan kräver review om inte deterministisk regel ger säkert utfall.
3. Samma operatör får inte både skapa och ensam godkänna högriskbeslut när SoD kräver separat attest.
4. Ekonomiska reviewbeslut ska vara auditerade med beslutsorsak.
5. Manual override får inte radera maskinförslag eller tidigare bedömning.

# Allowed actions

- korrigera OCR-fält
- godkänna eller avvisa treatment lines
- skicka vidare godkänt utfall till downstream-domän

# Forbidden actions

- direktbokföra från review center utan domänkommandon
- kringgå policyspärrar genom fri text
- markera “granskat” utan faktiskt beslutsutfall

# Approval model

- låg risk: enkel review
- hög risk: dual signoff eller domänägargodkännande enligt SoD-policy

# Segregation of duties where relevant

- privat köp, förmån, nettolöneavdrag, HUS- eller stor momsavvikelse får inte ensamgodkännas där SoD-policy kräver separering

# Audit and evidence requirements

Audit ska visa:

- originaldokument
- OCR-förslag
- ändringar
- beslutsfattare
- beslutskod
- downstream-effekt

# Exceptions handling

Inga undantag får göra review osynlig. Akuta undantag måste gå via backoffice och post-review.

# Backoffice/support restrictions where relevant

- support får inte agera vanlig beslutsfattare i dokumentreview
- backoffice får bara initiera korrigeringskedja eller teknisk replay enligt egen policy

# Runtime enforcement expectations

- reviewkrav ska beräknas server-side
- downstream dispatch blockeras tills rätt beslut finns

# Test/control points

- låg confidence går till review
- manual override är fullt auditbar
- högriskbeslut kräver rätt attestklass

# Exit gate

- [ ] reviewkrav verkställs server-side
- [ ] ekonomiska dokumentbeslut är auditerade
- [ ] SoD fungerar för högriskfall

