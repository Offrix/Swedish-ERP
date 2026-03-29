> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: TP-010
- Title: UI Role Workbench Tests
- Status: Binding
- Owner: QA architecture and enterprise UX testing
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated UI role workbench test plan
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-ui-reset-spec.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - desktop
  - backoffice
  - workbenches
- Related code areas:
  - `apps/desktop-web/*`
  - `apps/backoffice/*`
  - `packages/ui-desktop/*`
- Related future documents:
  - `docs/ui/WORKBENCH_CATALOG.md`
  - `docs/ui/DESKTOP_INFORMATION_ARCHITECTURE.md`

# Purpose

Bevisa att workbenches fungerar för rätt roller, med rätt filter, blockers och drilldowns.

# Scope

- desktop workbenches
- backoffice workbenches
- role-based visibility
- list/preview/detail behaviors

# Blocking risk

Fel här gör att hela UI-reseten ser rätt ut visuellt men faller i verkligt operatörsarbete.

# Golden scenarios covered

- finance operator AP/AR flows
- payroll operator workbench
- review operator queue flow
- backoffice operator replay/audit flow

# Fixtures/golden data

- seeded workbench datasets
- users with distinct roles
- blocker and warning cases

# Unit tests

- component-level permissions
- table state behavior
- preview data integrity

# Integration tests

- workbench filters -> queries
- action buttons -> command calls
- route and object profile handoff

# E2E tests

- AP workbench full cycle
- review center claim and resolve
- payroll operator handling exception
- backoffice replay and audit drilldown

# Property-based tests where relevant

- none mandatory

# Replay/idempotency tests where relevant

- repeated workbench refresh must not duplicate activity or batch actions

# Failure-path tests

- unauthorized role sees no forbidden actions
- blocked item shows correct blocker state
- stale preview shows warning

# Performance expectations where relevant

- first workbench load and filter change must meet desktop performance budgets

# Acceptance criteria

- role visibility is correct
- key workbenches support real workflows
- blockers are visible early

# Exit gate

- [ ] workbenches are verified by role, not just by screen render
- [ ] list/preview/detail pattern works under real data
- [ ] forbidden actions stay forbidden in UI

