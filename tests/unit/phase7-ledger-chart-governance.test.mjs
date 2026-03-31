import test from "node:test";
import assert from "node:assert/strict";
import {
  DSAM_ACCOUNTS,
  REQUIRED_ENGINE_ACCOUNTS,
  validateRequiredEngineAccounts
} from "../../packages/domain-ledger/src/index.mjs";
import { readText } from "../../scripts/lib/repo.mjs";

const LEDGER_SEED_PATH = "packages/db/seeds/20260321050010_phase3_ledger_foundation_seed.sql";
const PAYROLL_RUNTIME_PATH = "packages/domain-payroll/src/index.mjs";
const ACCOUNT_ROW_PATTERN =
  /\('00000000-0000-4000-8000-000000000001',\s*'(\d{4})',\s*'((?:''|[^'])*)',\s*'([1-8])',\s*'active',\s*jsonb_build_object\('chartTemplateId',\s*'DSAM-2026',\s*'seedSource',\s*'accounting_foundation_24_2'\)\)/g;

function parseSeedAccounts(seedSql) {
  const accounts = new Map();
  for (const match of seedSql.matchAll(ACCOUNT_ROW_PATTERN)) {
    accounts.set(match[1], {
      accountNumber: match[1],
      accountName: match[2].replaceAll("''", "'"),
      accountClass: match[3]
    });
  }
  return accounts;
}

test("Phase 7.3 keeps the SQL ledger seed synchronized with the published DSAM catalog", async () => {
  const seedSql = await readText(LEDGER_SEED_PATH);
  const seedAccounts = parseSeedAccounts(seedSql);

  assert.equal(seedAccounts.size, DSAM_ACCOUNTS.length);
  for (const catalogAccount of DSAM_ACCOUNTS) {
    const seededAccount = seedAccounts.get(catalogAccount.accountNumber);
    assert.deepEqual(seededAccount, catalogAccount, `Seed drift for ledger account ${catalogAccount.accountNumber}`);
  }
});

test("Phase 7.3 validates required ledger fallback account coverage against the published catalog", () => {
  assert.doesNotThrow(() =>
    validateRequiredEngineAccounts({
      accounts: DSAM_ACCOUNTS
    })
  );

  assert.throws(
    () =>
      validateRequiredEngineAccounts(
        {
          accounts: DSAM_ACCOUNTS.filter((account) => account.accountNumber !== "1110")
        },
        REQUIRED_ENGINE_ACCOUNTS
      ),
    /account_catalog_required_coverage_missing:bank:1110/
  );
});

test("Phase 7.3 removes the non-published 1930 payroll fallback from runtime", async () => {
  const payrollRuntime = await readText(PAYROLL_RUNTIME_PATH);

  assert.equal(payrollRuntime.includes('preferredAccount?.ledgerAccountNumber || "1930"'), false);
  assert.equal(payrollRuntime.includes('preferredAccount?.ledgerAccountNumber || "1110"'), true);
});
