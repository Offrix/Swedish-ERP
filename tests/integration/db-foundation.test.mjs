import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { repoPath } from "../../scripts/lib/repo.mjs";

test("database foundation migration contains required baseline tables", async () => {
  const sql = await fs.readFile(repoPath("packages", "db", "migrations", "20260321000000_phase0_foundation.sql"), "utf8");
  for (const tableName of [
    "companies",
    "users",
    "company_users",
    "delegations",
    "accounts",
    "voucher_series",
    "journal_entries",
    "journal_lines",
    "documents",
    "document_versions",
    "customers",
    "suppliers",
    "employees",
    "projects",
    "vat_decisions",
    "agi_submissions",
    "hus_claims",
    "peppol_messages",
    "annual_report_packages",
    "audit_events"
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName}`));
  }
});
