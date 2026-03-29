import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ACCOUNT_CATALOG_VERSIONS,
  DEFAULT_CHART_TEMPLATE_ID,
  DSAM_ACCOUNTS,
  createLedgerEngine,
  getAccountCatalogVersion,
  listAccountCatalogVersions
} from "../../packages/domain-ledger/src/index.mjs";

const REPO_ROOT = path.resolve("C:/Users/snobb/Desktop/Swedish ERP");
const LEDGER_INDEX_PATH = path.join(REPO_ROOT, "packages/domain-ledger/src/index.mjs");
const CATALOG_DATA_PATH = path.join(REPO_ROOT, "packages/domain-ledger/src/data/dsam-2026.catalog.json");

test("Phase 1.3 publishes DSAM chart through a versioned account catalog", () => {
  const publishedVersions = listAccountCatalogVersions();
  const defaultCatalog = getAccountCatalogVersion();

  assert.equal(publishedVersions.length, 1);
  assert.equal(defaultCatalog.versionId, DEFAULT_CHART_TEMPLATE_ID);
  assert.equal(defaultCatalog.checksumAlgorithm, "sha256");
  assert.match(defaultCatalog.checksum, /^[0-9a-f]{64}$/);
  assert.equal(defaultCatalog.accountCount, DSAM_ACCOUNTS.length);
  assert.deepEqual(publishedVersions, ACCOUNT_CATALOG_VERSIONS);
});

test("Phase 1.3 installs chart metadata with checksum and source provenance", () => {
  const engine = createLedgerEngine({
    clock: () => new Date("2026-03-29T18:00:00Z")
  });

  const install = engine.installLedgerCatalog({
    companyId: "company-1",
    actorId: "user-1"
  });
  const firstAccount = engine.listLedgerAccounts({ companyId: "company-1" })[0];

  assert.equal(install.chartTemplateId, DEFAULT_CHART_TEMPLATE_ID);
  assert.match(install.chartTemplateChecksum, /^[0-9a-f]{64}$/);
  assert.equal(firstAccount.metadataJson.chartTemplateId, DEFAULT_CHART_TEMPLATE_ID);
  assert.equal(firstAccount.metadataJson.chartTemplateChecksum, install.chartTemplateChecksum);
  assert.equal(firstAccount.metadataJson.chartTemplateSourceName, "swedish_erp_dsam_curated_catalog");
  assert.equal(firstAccount.metadataJson.seedSource, "account_catalog_version");
});

test("Phase 1.3 removes embedded DSAM data from ledger runtime and keeps the catalog as data file", () => {
  const ledgerIndex = fs.readFileSync(LEDGER_INDEX_PATH, "utf8");
  const catalogData = JSON.parse(fs.readFileSync(CATALOG_DATA_PATH, "utf8"));

  assert.equal(ledgerIndex.includes("RAW_DSAM_ACCOUNTS"), false);
  assert.equal(Array.isArray(catalogData.accounts), true);
  assert.equal(catalogData.versionId, DEFAULT_CHART_TEMPLATE_ID);
  assert.equal(catalogData.accountCount, DSAM_ACCOUNTS.length);
});
