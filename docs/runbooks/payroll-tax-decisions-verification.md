# Payroll Tax Decisions Verification

## Scope

This runbook verifies roadmap subphase `11.1 Build the payroll tax table engine`.

The gate is only green when:

- payroll can consume approved `TaxDecisionSnapshot` objects
- supported decision types work:
  - `tabell`
  - `jamkning_fast`
  - `jamkning_procent`
  - `engangsskatt`
  - `sink`
  - `asink`
  - `emergency_manual`
- `emergency_manual` requires approval by a different actor
- pay runs no longer depend on free-form manual rate as the primary happy path

## Official baseline

Validate against official Skatteverket guidance before changing decision semantics:

- ordinary salary uses tax table or adjustment decision
- one-time payouts use one-time tax rules
- one-time payouts must resolve from the official 2026 one-time tax baseline by annual income basis and column code, not from inline withholding percentages
- SINK requires a valid decision; SINK is 22.5 percent from the current official baseline
- A-SINK requires a valid decision; A-SINK is 15 percent from the current official baseline
- AGI must keep A-SINK tax separate from ordinary preliminary tax and ordinary SINK tax
- table tax decisions must resolve from the official Skatteverket 2026 monthly tax-table baseline, not from inline withholding values

## Targeted verification

Run:

```powershell
node --test C:\Users\snobb\Desktop\Swedish ERP\tests\unit\phase12-tax-decision-snapshots.test.mjs
node --test C:\Users\snobb\Desktop\Swedish ERP\tests\integration\phase12-tax-decision-snapshots-api.test.mjs
```

Expected:

- all tests green
- regular pay run can resolve `tabell`
- `tabell` resolves from official monthly table data for both fixed-amount rows and percentage rows over SEK 80,000
- fixed and percentage adjustment decisions can resolve `jamkning_fast` and `jamkning_procent`
- extra pay run can resolve `engangsskatt` from the official one-time tax baseline
- A-SINK decision resolves `a_sink_tax` and is reported on the AGI A-SINK field instead of ordinary preliminary tax
- `emergency_manual` is created as `draft` and same-actor approval is rejected

## Full verification

Run:

```powershell
node scripts/run-tests.mjs all
node scripts/lint.mjs
node scripts/typecheck.mjs
node scripts/build.mjs
node scripts/security-scan.mjs
```

Expected:

- full suite green
- lint green
- typecheck green
- build green
- security green

## Failure handling

- If pay runs still require legacy `manual_rate` on the primary path, do not mark `11.1` complete.
- If `tabell` accepts inline withholding amounts instead of the official baseline lookup, treat that as a blocker.
- If `engangsskatt` accepts inline withholding percentages instead of the official one-time tax baseline, treat that as a blocker.
- If `emergency_manual` can be self-approved, treat that as a blocker.
- If a decision snapshot is not time-bound or evidence-linked, treat the implementation as incomplete.
