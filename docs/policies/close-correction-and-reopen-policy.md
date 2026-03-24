# Master metadata

- Document ID: POL-008
- Title: Close Correction and Reopen Policy
- Status: Binding
- Owner: Finance compliance governance
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated reopen policy
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-policy-matrix.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-domain-map.md`
- Related domains:
  - close
  - ledger
  - annual reporting
  - backoffice
- Related code areas:
  - `packages/domain-ledger/*`
  - `packages/domain-reporting/*`
  - `packages/domain-annual-reporting/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/compliance/se/accounting-foundation.md`
  - `docs/runbooks/annual-close-and-filing-by-legal-form.md`

# Purpose

Styra hur låsta perioder får rättas, när reopen är tillåtet och hur correctionkedjor ska se ut.

# Scope

Policyn gäller:

- periodlås
- close corrections
- reopen
- backoffice-assisterade korrigeringar

# Why it exists

Utan hård reopen-policy blir periodlås symboliska och revisionsspåret skadas.

# Non-negotiable rules

1. Låsta perioder får inte muteras tyst.
2. Rättelse ska ske genom correction chain, reversal eller explicit reopen-beslut.
3. Reopen ska vara sällsynt, motiverad och auditerad.
4. Återöppning efter myndighetsinlämning eller efterföljande close-steg kräver högre kontrollnivå.

# Allowed actions

- correction without reopen när policy tillåter i senare period
- formell reopen med approval
- ny close efter rättelse

# Forbidden actions

- direkt edit av historisk journal
- backoffice-genväg som hoppar över correction chain
- reopen utan reason code och approval

# Approval model

- medelrisk: finance owner + approver
- hög risk: finance owner + compliance owner + eventuell signatory

# Segregation of duties where relevant

- den som upptäckt felet får inte ensam återöppna högriskperiod om SoD-regel kräver separat attest

# Audit and evidence requirements

Audit ska visa:

- period
- reason code
- approver
- correction chain
- eventuell påverkan på filing eller declarations

# Exceptions handling

Inga undantag får leda till silent mutation. Break-glass får bara användas för att nå officiell reopen-funktion, inte för att skriva direkt i data.

# Backoffice/support restrictions where relevant

- backoffice får inte själv skriva affärsdata i låst period
- stöd får endast assistera via officiella reopen- och correctionkommandon

# Runtime enforcement expectations

- lockstatus läses server-side
- UI ska blockera förbjudna ändringar och förklara varför

# Test/control points

- låst period blockerar förbjudna writes
- reopen kräver rätt approvals
- correction chain bevarar historik

# Exit gate

- [ ] silent mutation är tekniskt blockerad
- [ ] reopen kräver policykedja
- [ ] correction chain och audit är fullständig
