> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: ADR-0026
- Title: Payroll Migration, Balances and Collective Agreements Architecture
- Status: Accepted
- Owner: Payroll architecture and employment domain architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior ADR
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-rulepack-register.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - payroll
  - balances
  - collective agreements
  - HR
  - time
- Related code areas:
  - `packages/domain-payroll/*`
  - `packages/domain-balances/*`
  - `packages/domain-collective-agreements/*`
  - `packages/domain-hr/*`
  - `packages/domain-time/*`
  - `apps/api/*`
- Related future documents:
  - `docs/compliance/se/payroll-migration-and-balances-engine.md`
  - `docs/compliance/se/collective-agreements-engine.md`
  - `docs/policies/payroll-migration-policy.md`
  - `docs/test-plans/payroll-migration-and-balance-tests.md`

# Purpose

Låsa tre separata men tätt kopplade motorer: payroll migration, generic balances och collective agreements.

# Status

Accepted.

# Context

Repo:t har payroll-, HR- och time-domäner men saknar tre uttryckliga motorer som krävs för verklig svensk drift:

- migrering av historik, YTD, tidigare lönebesked och AGI-relaterade saldon
- generisk saldohantering för semester, komp, flex, ATF, sparade dagar och andra banker
- avtalsmotor för kollektivavtal, regler, överstyrningar och effective dating

Utan dessa blir löneområdet brett på pappret men praktiskt omöjligt att driftsätta korrekt.

# Problem

Om dessa delar lämnas inbyggda eller implicita uppstår:

- hårdkodade saldotyper
- ofullständig migrering
- otillförlitliga periodstarter
- svår reproducerbarhet av beräkningar över tid
- projektkostnader och frånvarosaldon som inte kan förklaras

# Decision

1. `balances` införs som eget bounded context.
2. `collective-agreements` införs som eget bounded context.
3. `payroll-migration` införs som tydlig motor ovanpå payroll, balances och agreements.
4. `payroll` får konsumera agreements och balances men inte äga deras fulla regelmodell.
5. Alla tre motorer ska vara effective-dated och rulepack-driven där det är relevant.

# Scope

Beslutet omfattar balance types, balance transactions, agreement families, agreement versions, migration batches, mapping, diff och cutover. Det omfattar inte full UI-design för lönearbetsytor eller alla bolagsspecifika policydetaljer.

# Boundaries

`balances` äger balance type, earning rules, spending rules, carry-forward, expiration och corrections.

`collective-agreements` äger agreement family, agreement version, pay rules, overtime/OB logic, rounding rules och agreement-specific balance behaviors.

`payroll-migration` äger migration batch, source mapping, import validation, cutover comparison och rollback readiness.

`payroll` äger pay runs, payslips, AGI objects och payouts.

# Alternatives considered

## Keep balances inside payroll only

Avvisas eftersom tid, HR och policy också behöver läsa och skriva saldohändelser på ett kontrollerat sätt.

## Encode agreements as scattered rule tables inside payroll

Avvisas eftersom versionering, historik och kundspecifika variationer blir ohanterliga.

## Handle migration as one-off scripts

Avvisas eftersom en seriös löneprodukt behöver kontrollerad cutover, diff och rollback.

# Consequences

- tre nya tydliga motorer måste införas
- payroll, HR och time måste byggas om mot deras kontrakt
- test och runbooks blir obligatoriska innan lönepilot

# Migration impact

- historiska saldon, YTD och tidigare AGI-relaterade totalsummor måste kunna baslinjeimporteras
- agreementless anställningar i äldre data måste få explicit defaultprofil eller blockeras

# Verification impact

Verifiering måste visa att:

- samma källdata ger samma saldon och samma lön över tid
- cutover-diff kan förklaras och godkännas
- agreement version changes inte muterar historiska beräkningar

# Exit gate

ADR:n är uppfylld först när:

- `packages/domain-balances` och `packages/domain-collective-agreements` finns
- payroll migration behandlas som egen motor och inte som ad hoc-import
- W1-dokument för migration, balances, agreements, policy och test är skrivna

