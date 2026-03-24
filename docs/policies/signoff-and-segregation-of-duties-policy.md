# Master metadata

- Document ID: POL-004
- Title: Signoff and Segregation of Duties Policy
- Status: Binding
- Owner: Security architecture and compliance governance
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: Informal signoff model and the older access attestation policy
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-policy-matrix.md`
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-ui-reset-spec.md`
- Related domains:
  - auth
  - approvals
  - close
  - payroll
  - HUS
  - annual reporting
- Related code areas:
  - `packages/domain-org-auth/*`
  - `packages/domain-core/*`
  - `packages/domain-payroll/*`
  - `packages/domain-hus/*`
  - `packages/domain-annual-reporting/*`
- Related future documents:
  - `docs/policies/access-attestation-and-signoff-policy.md`
  - `docs/policies/close-correction-and-reopen-policy.md`
  - `docs/policies/hus-signing-and-submission-policy.md`

# Purpose

Säkerställa att högriskbeslut i systemet har rätt attestkedja och att samma person inte både initierar och ensam godkänner kritiska åtgärder när det skulle skapa otillåten koncentration av makt.

# Scope

Policyn gäller:

- close och reopen
- payroll finalize och AGI signoff
- HUS submit
- annual filing
- emergency operations med ekonomisk eller regulatorisk effekt

# Why it exists

ERP:t ska kunna användas av enskilda företag, byråer och operatörsteam. Därför måste systemet skilja på teknisk behörighet och tillåten beslutsroll.

# Non-negotiable rules

1. Högriskåtgärder ska ha definierad signoff class.
2. Signoff class ska styra om en eller flera personer krävs.
3. Den som skapat ett underlag får inte ensam godkänna vissa högrisksteg om SoD-regel kräver separerad attest.
4. Override av SoD-regel måste vara explicit, ovanlig och fullt auditerad.

# Allowed actions

- enkel attest av låg risk
- fyrögonsgodkännande av medel- och högrisksteg
- delegationsflöde där policy tillåter det

# Forbidden actions

- dold självgodkännande av högriskflöden
- support- eller backoffice-åtgärd som ersätter affärsattest utan särskild policy
- efterhandsändring av signoff-historik

# Approval model

Systemet ska minst stödja:

- `SOLOW` för låg risk
- `DUAL` för medel- och högrisk
- `DUAL_PLUS_DOMAIN_OWNER` för regulatoriskt eller ekonomiskt kritiska steg

# Segregation of duties where relevant

SoD ska tillämpas på:

- payroll finalize kontra AGI sign
- HUS claim build kontra submit
- close corrections kontra reopen approval
- emergency disable kontra återaktivering

# Audit and evidence requirements

Audit ska visa:

- initiator
- approver(s)
- signoff class
- beslutsorsak
- tidpunkt
- påverkade objekt

# Exceptions handling

Break-glass-undantag får endast användas vid incident eller juridiskt tvingande läge och måste följas av post-event review.

# Backoffice/support restrictions where relevant

- backoffice får inte agera affärsattestant om inte separat policy uttryckligen tillåter det
- support-impersonation får inte användas för att maskera vem som faktiskt godkände

# Runtime enforcement expectations

- signoff class ska beräknas server-side
- UI ska blockera submit/finalize när rätt signoff saknas
- override ska kräva särskild reason code och audit

# Test/control points

- självgodkännande på blockerade steg nekas
- dual signoff krävs i högriskscenarier
- audit visar full godkännandekedja

# Exit gate

- [ ] högrisksteg har signoff class
- [ ] SoD-regler verkställs server-side
- [ ] override är strikt, sällsynt och auditerad
