# Master metadata

- Document ID: TP-013
- Title: Annual Reporting by Legal Form Tests
- Status: Binding
- Owner: QA architecture and finance compliance verification
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated annual-reporting-by-legal-form test plan
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-rulepack-register.md`
- Related domains:
  - annual reporting
  - legal form
  - reporting
  - fiscal year
- Related code areas:
  - `packages/domain-annual-reporting/*`
  - `packages/domain-legal-form/*`
  - `packages/domain-reporting/*`
  - `tests/*`
- Related future documents:
  - `docs/compliance/se/legal-form-and-declaration-engine.md`
  - `docs/compliance/se/annual-reporting-engine.md`
  - `docs/runbooks/annual-close-and-filing-by-legal-form.md`

# Purpose

Definiera den bindande testplanen för annual reporting per företagsform så att filing profile, reporting obligation, signatory chain och correction chain blir reproducerbara.

# Scope

Omfattar:

- AB
- enskild näringsverksamhet
- handelsbolag
- kommanditbolag
- ekonomisk förening
- short year och broken year där formens regler tillåter det

Omfattar inte:

- allmän ledger foundation
- generiska UI-komponenttester som redan täcks i andra testplaner

# Blocking risk

Fel här ger:

- fel annual package family
- fel deklarationspaket
- fel signatory chain
- fel receipt- och correctionkedja
- fel lagkravsbild vid close

# Golden scenarios covered

- GS-022 annual close AB
- GS-023 annual close sole trader
- GS-024 annual close HB/KB
- annual close economic association
- annual correction after reopen
- short-year filing profile selection

# Fixtures and golden data

Följande golden families ska finnas:

- `GD-ANNUAL-AB-K2`
- `GD-ANNUAL-AB-K3`
- `GD-ANNUAL-EF`
- `GD-ANNUAL-HB-KB-INK4`
- `GD-ANNUAL-HB-KB-WITH-ANNUAL-REPORT`
- `GD-ANNUAL-SOLE-TRADER-NE`
- `GD-ANNUAL-SHORT-YEAR`
- `GD-ANNUAL-CORRECTION-CHAIN`

Varje fixture ska bära:

- fiscal-year snapshot
- legal-form snapshot
- reporting-obligation profile
- declaration profile
- close evidence
- expected package family
- expected receipt behavior

# Unit tests

- legal-form-to-package-family mapping
- reporting-obligation branching
- signatory class selection per form
- source-fingerprint change detection
- correction-chain version increment

# Integration tests

- annual package build from locked reportsnapshots
- evidence pack composition
- signatory chain persistence
- technical vs domain receipt persistence
- correction package supersede links

# E2E tests

- AB year-end to signed annual package and accepted receipt
- economic association year-end to signed annual package and accepted receipt
- sole trader year-end to declaration package without forced AB annual-report path
- HB/KB year-end to Inkomstdeklaration 4 path
- HB/KB with annual-report obligation to dual-path readiness where rulepack requires it
- reopen after close resulting in correction package, not overwrite

# Property-based tests where relevant

- identical source fingerprint must yield identical package hash
- changed source fingerprint must force new package version
- package family must never resolve to an incompatible legal form

# Replay/idempotency tests where relevant

- repeated submit with same package version does not create duplicate package
- technical receipt replay does not mutate original receipt
- correction package creation is idempotent by correction key

# Failure-path tests

- missing legal-form snapshot blocks package build
- mismatched reporting-obligation profile blocks signoff
- wrong signatory class blocks submission
- receipt linked to wrong package version is rejected
- legal-form change after package build forces correction or rebuild path

# Performance expectations where relevant

- package build for standard annual fixture completes within agreed batch budget
- evidence pack rebuild for unchanged source fingerprint uses cached/read-model-safe path and remains deterministic

# Acceptance criteria

- all legal forms resolve correct package families
- all fixtures produce deterministic package and evidence hashes
- signatory and receipt chains remain append-only
- correction path never overwrites prior package version

# Exit gate

- [ ] AB, EF, HB/KB and sole trader all have passing annual flows
- [ ] short year and correction chain are covered
- [ ] receipt separation between technical and domain acceptance is verified
- [ ] package family resolution is deterministic and form-safe
