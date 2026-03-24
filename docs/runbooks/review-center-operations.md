# Master metadata

- Document ID: RB-008
- Title: Review Center Operations
- Status: Binding
- Owner: Operations architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated review center operations runbook
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-ui-reset-spec.md`
  - `docs/master-control/master-policy-matrix.md`
- Related domains:
  - review center
  - notifications
  - work items
- Related code areas:
  - `packages/domain-review-center/*`
  - `apps/desktop-web/*`
- Related future documents:
  - `docs/domain/review-center.md`
  - `docs/policies/document-review-and-economic-decision-policy.md`

# Purpose

Beskriva daglig drift av review center: queue ownership, claim/reassign, escalation och SLA-hantering.

# When to use

- daglig review-drift
- köbalansering
- eskalering av blockerade beslut

# Preconditions

- queue ownership är definierad
- review center-domänen är aktiv

# Required roles

- reviewer
- queue owner
- domain approver
- backoffice escalator

# Inputs

- review queue views
- SLA reports
- open escalation list

# Step-by-step procedure

1. Kontrollera öppna köer och SLA-brott.
2. Fördela eller omfördela oägda review items.
3. Säkerställ att högriskfall har rätt attestklass enligt policy.
4. Eskalera blockerade eller åldrande fall till rätt queue owner eller domain approver.
5. Stäng inte review item förrän source domain bekräftat downstream outcome när det krävs.

# Verification

- inga review items saknar ägare över policygräns
- högriskfall ligger inte hos fel roll
- stängda items har korrekt beslutskod

# Retry/replay behavior where relevant

- återöppning av felaktigt stängt review item ska ske via officiellt reopen-kommando

# Rollback/recovery

- felaktigt beslut rättas genom ny review decision chain eller correction i källdomän

# Incident threshold

felaktig massstängning eller borttappade högriskfall är incident

# Audit and receipts

- assignment history
- decision history
- escalation history

# Exit gate

- [ ] queue ownership och SLA-drift är tydlig
- [ ] högriskfall hanteras enligt SoD
- [ ] återöppning och eskalering är spårbar
