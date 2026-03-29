import crypto from "node:crypto";
import fs from "node:fs";

const ACCOUNT_NUMBER_PATTERN = /^[1-8][0-9]{3}$/;
const ACCOUNT_CLASS_PATTERN = /^[1-8]$/;
const CATALOG_PATH = new URL("./data/dsam-2026.catalog.json", import.meta.url);

function requireText(value, errorCode) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(errorCode);
  }
  return value.trim();
}

function normalizeAccountNumber(value) {
  const normalized = requireText(value, "account_catalog_account_number_required");
  if (!ACCOUNT_NUMBER_PATTERN.test(normalized)) {
    throw new Error(`account_catalog_account_number_invalid:${normalized}`);
  }
  return normalized;
}

function normalizeAccountClass(value) {
  const normalized = requireText(value, "account_catalog_account_class_required");
  if (!ACCOUNT_CLASS_PATTERN.test(normalized)) {
    throw new Error(`account_catalog_account_class_invalid:${normalized}`);
  }
  return normalized;
}

function canonicalizeAccountDefinition(definition) {
  const accountNumber = normalizeAccountNumber(definition?.accountNumber);
  const accountName = requireText(definition?.accountName, "account_catalog_account_name_required");
  const derivedAccountClass = accountNumber.charAt(0);
  const accountClass = normalizeAccountClass(definition?.accountClass ?? derivedAccountClass);
  if (accountClass !== derivedAccountClass) {
    throw new Error(`account_catalog_account_class_mismatch:${accountNumber}`);
  }
  return Object.freeze({
    accountNumber,
    accountName,
    accountClass
  });
}

function computeCatalogChecksum({ versionId, templateKind, sourceName, sourceDocumentName, effectiveFrom, publishedAt, checksumAlgorithm, accounts }) {
  const canonicalPayload = JSON.stringify({
    versionId,
    templateKind,
    sourceName,
    sourceDocumentName,
    effectiveFrom,
    publishedAt,
    checksumAlgorithm,
    accounts: accounts.map((account) => ({
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      accountClass: account.accountClass
    }))
  });
  return crypto.createHash("sha256").update(canonicalPayload).digest("hex");
}

function freezeCatalogVersion(rawCatalog) {
  const versionId = requireText(rawCatalog?.versionId, "account_catalog_version_id_required");
  const templateKind = requireText(rawCatalog?.templateKind, "account_catalog_template_kind_required");
  const sourceName = requireText(rawCatalog?.sourceName, "account_catalog_source_name_required");
  const sourceDocumentName = requireText(rawCatalog?.sourceDocumentName, "account_catalog_source_document_name_required");
  const effectiveFrom = requireText(rawCatalog?.effectiveFrom, "account_catalog_effective_from_required");
  const publishedAt = requireText(rawCatalog?.publishedAt, "account_catalog_published_at_required");
  const checksumAlgorithm = requireText(rawCatalog?.checksumAlgorithm, "account_catalog_checksum_algorithm_required");
  if (checksumAlgorithm !== "sha256") {
    throw new Error(`account_catalog_checksum_algorithm_unsupported:${checksumAlgorithm}`);
  }
  if (!Array.isArray(rawCatalog?.accounts) || rawCatalog.accounts.length === 0) {
    throw new Error("account_catalog_accounts_required");
  }

  const seenNumbers = new Set();
  const accounts = rawCatalog.accounts.map((definition) => {
    const normalized = canonicalizeAccountDefinition(definition);
    if (seenNumbers.has(normalized.accountNumber)) {
      throw new Error(`account_catalog_duplicate_account_number:${normalized.accountNumber}`);
    }
    seenNumbers.add(normalized.accountNumber);
    return normalized;
  });

  const checksum = computeCatalogChecksum({
    versionId,
    templateKind,
    sourceName,
    sourceDocumentName,
    effectiveFrom,
    publishedAt,
    checksumAlgorithm,
    accounts
  });
  const declaredChecksum = requireText(rawCatalog?.checksum, "account_catalog_checksum_required");
  if (declaredChecksum !== checksum) {
    throw new Error(`account_catalog_checksum_mismatch:${versionId}`);
  }
  const declaredAccountCount = Number(rawCatalog?.accountCount);
  if (!Number.isInteger(declaredAccountCount) || declaredAccountCount !== accounts.length) {
    throw new Error(`account_catalog_account_count_mismatch:${versionId}`);
  }

  return Object.freeze({
    versionId,
    templateKind,
    sourceName,
    sourceDocumentName,
    effectiveFrom,
    publishedAt,
    checksumAlgorithm,
    checksum,
    accountCount: accounts.length,
    accounts: Object.freeze(accounts)
  });
}

function loadCatalogFromDisk() {
  const rawText = fs.readFileSync(CATALOG_PATH, "utf8");
  const parsed = JSON.parse(rawText);
  return freezeCatalogVersion(parsed);
}

const loadedCatalog = loadCatalogFromDisk();

export const DSAM_2026_ACCOUNT_CATALOG = loadedCatalog;
export const ACCOUNT_CATALOG_VERSIONS = Object.freeze([DSAM_2026_ACCOUNT_CATALOG]);
const ACCOUNT_CATALOGS_BY_ID = new Map(ACCOUNT_CATALOG_VERSIONS.map((catalog) => [catalog.versionId, catalog]));
export const DEFAULT_ACCOUNT_CATALOG_VERSION = DSAM_2026_ACCOUNT_CATALOG;
export const DEFAULT_CHART_TEMPLATE_ID = DEFAULT_ACCOUNT_CATALOG_VERSION.versionId;
export const DSAM_ACCOUNTS = DEFAULT_ACCOUNT_CATALOG_VERSION.accounts;

export function listAccountCatalogVersions() {
  return ACCOUNT_CATALOG_VERSIONS.slice();
}

export function getAccountCatalogVersion(chartTemplateId = DEFAULT_CHART_TEMPLATE_ID) {
  const normalizedTemplateId = requireText(chartTemplateId, "account_catalog_version_required");
  const catalog = ACCOUNT_CATALOGS_BY_ID.get(normalizedTemplateId);
  if (!catalog) {
    throw new Error(`account_catalog_not_found:${normalizedTemplateId}`);
  }
  return catalog;
}
