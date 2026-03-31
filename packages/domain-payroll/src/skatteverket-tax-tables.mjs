import fs from "node:fs";

const MONTHLY_TABLE_2026_SOURCE_URL =
  "https://www.skatteverket.se/download/18.1522bf3f19aea8075ba5af/1765287119989/allmanna-tabeller-manad.txt";
const MONTHLY_TABLE_2026_SOURCE_SNAPSHOT_DATE = "2025-12-10";
const MONTHLY_TABLE_2026_SOURCE_SHA256 = "769a4d510d07ef9d8259d267a378e1cbd8ede89102b5dce4258c01d78aebd932";
const MONTHLY_TABLE_2026_FILE_URL = new URL("./data/skatteverket-allmanna-tabeller-manad-2026.txt", import.meta.url);
const TAX_TABLE_ROW_WIDTHS = Object.freeze([5, 7, 7, 5, 5, 5, 5, 5, 5]);

let monthlyTableIndexCache = null;

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function splitFixedWidthRow(row) {
  const parts = [];
  let cursor = 0;
  for (const width of TAX_TABLE_ROW_WIDTHS) {
    parts.push(row.slice(cursor, cursor + width).trim());
    cursor += width;
  }
  return parts;
}

function parseMonthlyTableRow(row) {
  if (!row || row.length < 49) {
    return null;
  }
  const [rawCode, lowerBound, upperBound, ...columnValues] = splitFixedWidthRow(row);
  if (!rawCode || !lowerBound || !upperBound || columnValues.some((value) => value === "")) {
    return null;
  }
  const codeMatch = /^30([B%])(\d{2})$/u.exec(rawCode);
  if (!codeMatch) {
    return null;
  }
  return Object.freeze({
    rowCode: rawCode,
    tableCode: codeMatch[2],
    valueMode: codeMatch[1] === "B" ? "fixed_amount" : "percentage",
    lowerBound: Number.parseInt(lowerBound, 10),
    upperBound: Number.parseInt(upperBound, 10),
    columnValues: Object.freeze(columnValues.map((value) => Number.parseInt(value, 10)))
  });
}

function loadMonthlyTaxTableIndex() {
  if (monthlyTableIndexCache) {
    return monthlyTableIndexCache;
  }
  const rowsByTableCode = new Map();
  const fileContent = fs.readFileSync(MONTHLY_TABLE_2026_FILE_URL, "utf8");
  for (const rawRow of fileContent.split(/\r?\n/u)) {
    const parsedRow = parseMonthlyTableRow(rawRow);
    if (!parsedRow) {
      continue;
    }
    if (!rowsByTableCode.has(parsedRow.tableCode)) {
      rowsByTableCode.set(parsedRow.tableCode, []);
    }
    rowsByTableCode.get(parsedRow.tableCode).push(parsedRow);
  }
  for (const rows of rowsByTableCode.values()) {
    rows.sort((left, right) => left.lowerBound - right.lowerBound);
  }
  monthlyTableIndexCache = Object.freeze({
    sourceUrl: MONTHLY_TABLE_2026_SOURCE_URL,
    sourceSnapshotDate: MONTHLY_TABLE_2026_SOURCE_SNAPSHOT_DATE,
    sourceSha256: MONTHLY_TABLE_2026_SOURCE_SHA256,
    rowsByTableCode
  });
  return monthlyTableIndexCache;
}

function normalizeTableCode(tableCode) {
  const normalized = String(tableCode ?? "").trim();
  const numericCode = Number.parseInt(normalized, 10);
  if (!Number.isInteger(numericCode) || numericCode < 29 || numericCode > 42) {
    return null;
  }
  return String(numericCode).padStart(2, "0");
}

function normalizeColumnCode(columnCode) {
  const normalized = String(columnCode ?? "").trim();
  const numericCode = Number.parseInt(normalized, 10);
  if (!Number.isInteger(numericCode) || numericCode < 1 || numericCode > 6) {
    return null;
  }
  return numericCode;
}

export function getSkatteverketMonthlyTaxTable2026Meta() {
  const index = loadMonthlyTaxTableIndex();
  return Object.freeze({
    sourceUrl: index.sourceUrl,
    sourceSnapshotDate: index.sourceSnapshotDate,
    sourceSha256: index.sourceSha256
  });
}

export function lookupSkatteverketMonthlyTaxTable2026({ tableCode, columnCode, grossMonthlyAmount }) {
  const normalizedTableCode = normalizeTableCode(tableCode);
  const normalizedColumnCode = normalizeColumnCode(columnCode);
  if (!normalizedTableCode || !normalizedColumnCode) {
    return null;
  }
  const normalizedGrossMonthlyAmount = Math.max(0, Math.floor(Number(grossMonthlyAmount || 0)));
  const index = loadMonthlyTaxTableIndex();
  const rows = index.rowsByTableCode.get(normalizedTableCode) || [];
  const matchedRow = rows.find((row) => normalizedGrossMonthlyAmount >= row.lowerBound && normalizedGrossMonthlyAmount <= row.upperBound);
  if (!matchedRow) {
    return null;
  }
  const sourceValue = matchedRow.columnValues[normalizedColumnCode - 1];
  if (!Number.isFinite(sourceValue)) {
    return null;
  }
  const withholdingAmount =
    matchedRow.valueMode === "percentage"
      ? roundMoney(normalizedGrossMonthlyAmount * (sourceValue / 100))
      : roundMoney(sourceValue);
  return Object.freeze({
    tableCode: normalizedTableCode,
    columnCode: String(normalizedColumnCode),
    grossMonthlyAmount: normalizedGrossMonthlyAmount,
    withholdingAmount,
    sourceValue,
    valueMode: matchedRow.valueMode,
    rowCode: matchedRow.rowCode,
    lowerBound: matchedRow.lowerBound,
    upperBound: matchedRow.upperBound,
    sourceUrl: index.sourceUrl,
    sourceSnapshotDate: index.sourceSnapshotDate,
    sourceSha256: index.sourceSha256
  });
}
