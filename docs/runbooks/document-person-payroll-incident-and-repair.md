# Master metadata

- Document ID: RB-006
- Title: Document Person Payroll Incident and Repair
- Status: Binding
- Owner: Payroll operations and review operations
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated document-person-payroll incident runbook
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-policy-matrix.md`
- Related domains:
  - documents
  - review center
  - payroll
  - AGI
- Related code areas:
  - `packages/document-engine/*`
  - `packages/domain-payroll/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/compliance/se/person-linked-document-classification-engine.md`
  - `docs/policies/document-review-and-economic-decision-policy.md`

# Purpose

Beskriva hur fel i kedjan dokument -> person -> payroll -> AGI ska isoleras, rättas och verifieras.

# When to use

- felklassat privatköp eller förmån
- fel personkoppling
- felaktigt payroll outcome från dokument
- AGI constituent byggd på fel underlag

# Preconditions

- incident är registrerad
- source document och affected payroll objects är identifierade

# Required roles

- review operator
- payroll operator
- compliance owner vid högrisk

# Inputs

- document id
- classification decision history
- payroll outcome ids
- AGI constituent ids

# Step-by-step procedure

1. Frys vidare dispatch från berört dokument.
2. Identifiera senaste godkända classification decision och eventuella overrides.
3. Kartlägg alla payroll outcomes och AGI constituents som härstammar från dokumentet.
4. Avgör om felet kräver ny classification decision, payroll correction eller både och.
5. Skapa correction chain i källdomänerna; skriv inte över historik.
6. Kör targeted replay för affected downstream objects.
7. Verifiera att nya payroll outcomes och AGI constituents ersätter felaktiga utfall enligt policy.
8. Stäng incident först när differens mot tidigare felutslag är dokumenterad.

# Verification

- originaldokument finns kvar
- correction chain är komplett
- gamla och nya utfall går att jämföra
- AGI är korrekt rättad eller markerad för nästa rättelsefönster

# Retry/replay behavior where relevant

- replay ska vara scoped till berört dokument och efterföljande objekt
- bred massreplay kräver separat godkännande

# Rollback/recovery

- felaktig ny replay öppnar ny correction version, aldrig overwrite

# Incident threshold

fel som påverkar AGI, nettolön eller skattepliktig förmån är blockerande incident

# Audit and receipts

- incident id
- correction ids
- replay ids
- comparison report old vs new

# Exit gate

- [ ] dokumentkedjan är reparerad via correction chain
- [ ] replay är scoped, auditbar och verifierad
- [ ] AGI- och payrolldifferenser är dokumenterade
