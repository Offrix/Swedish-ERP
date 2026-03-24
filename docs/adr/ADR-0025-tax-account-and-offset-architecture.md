# Master metadata

- Document ID: ADR-0025
- Title: Tax Account and Offset Architecture
- Status: Accepted
- Owner: Finance architecture and tax operations architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior ADR
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-gap-register.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - tax account
  - banking
  - VAT
  - payroll
  - reporting
  - close
- Related code areas:
  - `packages/domain-tax-account/*`
  - `packages/domain-banking/*`
  - `packages/domain-vat/*`
  - `packages/domain-payroll/*`
  - `packages/domain-reporting/*`
  - `apps/api/*`
- Related future documents:
  - `docs/compliance/se/tax-account-and-offset-engine.md`
  - `docs/domain/tax-account-reconciliation-and-settlement.md`
  - `docs/runbooks/tax-account-reconciliation.md`
  - `docs/test-plans/tax-account-offset-tests.md`

# Purpose

Låsa skattekonto som egen subledger och offset-motor i stället för som enkel kontospegling i den vanliga ledgern.

# Status

Accepted.

# Context

Repo:t har skattekonto i kontoplanstänk och vissa clearingmönster, men saknar en full motor för skattekontohändelser, avstämning mot huvudbok, kvittning mellan skatter och avgifter, räntor, avgifter och återbetalningar.

I svensk praktik utgör skattekontot ett egenartat flöde där moms, arbetsgivaravgifter, avdragen skatt, beslut, ränta och betalningar möts. Det får därför inte reduceras till ett konto med manuella avstämningsanteckningar.

# Problem

Utan egen domän blir close och tax reconciliation manuella och sköra, kvittningar svåra att spåra och rapportering beroende av speglingar i stället för av faktiska skattekontohändelser.

# Decision

1. `tax-account` införs som eget bounded context och subledger.
2. Skattekontohändelser importeras, mappas och versioneras som tax-account events.
3. Offset och avräkning modelleras explicit, inte som implicit följd av banktransaktioner.
4. Huvudboken fortsätter vara bokföringssanning men skattekonto blir sanningen för skattekontots operativa livscykel.
5. Banking, VAT, payroll och close får konsumera tax-account state via definierade kontrakt.

# Scope

Beslutet omfattar skattekontohändelser, import och matchning, offset chains, reconciliation state, interest and fee events, refund handling och discrepancy queues. Det omfattar inte själva inlämningslogiken för moms eller AGI.

# Boundaries

`tax-account` äger tax account event, import batch, offset relation, reconciliation status och discrepancy case.

`banking` äger bankbetalningar, bankreturer och cash movement visibility.

`VAT` och `payroll` äger deklarations- och AGI-underlag som ger upphov till skattekontorelaterade fordringar eller skulder.

`ledger` äger bokföringsposter som speglar tax-account-händelser enligt policy.

# Alternatives considered

## Keep skattekonto as ordinary ledger account only

Avvisas eftersom det inte räcker för kvittningskedjor, ränta, återbetalningar och driftmässig avstämning.

## Model tax account entirely inside banking

Avvisas eftersom skattekontot inte bara är en bankhändelsefråga utan också ett skattemässigt avräkningsobjekt.

# Consequences

- nya events, mapping rules och mismatch queues måste byggas
- close, reporting och bank reconciliation behöver nya UI-ytor och rapporter
- worker runtime behövs för imports, reconciliation och replay

# Migration impact

- existerande skattekontorelaterade ledgerposter måste mappas till den nya domänens baslinje
- eventimport och avstämningshistorik måste kunna backfill:as där underlag finns

# Verification impact

Verifiering måste visa att:

- skattekontohändelser kan importeras och matchas idempotent
- kvittningar och räntor blir spårbara kedjor
- mismatch queues fångar avvikelser utan att bokföring skrivs om

# Exit gate

ADR:n är uppfylld först när:

- `packages/domain-tax-account` finns
- skattekonto inte längre beskrivs som kontospegling i styrdokumenten
- reconciliation och offset har egna dokument, tester och runbooks
