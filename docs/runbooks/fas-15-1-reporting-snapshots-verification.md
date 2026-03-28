# Fas 15.1 Reporting Snapshots Verification

## Scope

Fas 15.1 är inte klar förrän reportingmotorn materialiserar:

- `trial_balance`
- `income_statement`
- `balance_sheet`
- `cashflow`
- `ar_open_items`
- `ap_open_items`
- `project_portfolio`
- `payroll_summary`
- `tax_account_summary`
- `submission_dashboard`

med riktiga domänkällor i runtime, inte syntetiska placeholdervärden.

## Required checks

1. Kör riktade tester:
   - `node --test tests/unit/phase15-reporting-metrics.test.mjs`
   - `node --test tests/integration/phase15-reporting-api.test.mjs`
2. Kör full gates:
   - `node scripts/run-tests.mjs all`
   - `node scripts/lint.mjs`
   - `node scripts/typecheck.mjs`
   - `node scripts/build.mjs`
   - `node scripts/security-scan.mjs`
3. Bekräfta i snapshotpayload att:
   - payroll-summary bär riktiga pay runs, AGI-submissions och vacation-liability snapshots
   - tax-account-summary bär riktig balance, event inventory och discrepancy pressure
   - submission-dashboard bär riktiga submissions, attempts, receipts, recoveries och queue pressure
4. Bekräfta att `GO_LIVE_ROADMAP.md` markerar `15.1` klar först efter gröna gates.

## Failure conditions

- reporting använder inte payroll/tax-account/integrations som källa
- metrics saknas för payroll, tax account eller submission dashboard
- snapshot kan bara materialiseras i demo men inte via API
- roadmap är markerad klar utan att riktade phase 15.1-tester finns
