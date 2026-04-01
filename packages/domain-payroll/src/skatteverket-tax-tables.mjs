import fs from "node:fs";
import crypto from "node:crypto";

const MONTHLY_TABLE_2026_SOURCE_URL =
  "https://www.skatteverket.se/download/18.1522bf3f19aea8075ba5af/1765287119989/allmanna-tabeller-manad.txt";
const MONTHLY_TABLE_2026_SOURCE_SNAPSHOT_DATE = "2025-12-10";
const MONTHLY_TABLE_2026_SOURCE_SHA256 = "769a4d510d07ef9d8259d267a378e1cbd8ede89102b5dce4258c01d78aebd932";
const ONE_TIME_TABLE_2026_SOURCE_URL =
  "https://www.skatteverket.se/download/18.1522bf3f19aea8075ba55c/1765284655603/teknisk-beskrivning-skv-433-2026-utgava-36.pdf";
const ONE_TIME_TABLE_2026_SOURCE_SNAPSHOT_DATE = "2025-12-10";
const MONTHLY_TABLE_2026_FILE_URL = new URL("./data/skatteverket-allmanna-tabeller-manad-2026.txt", import.meta.url);
const TAX_TABLE_ROW_WIDTHS = Object.freeze([5, 7, 7, 5, 5, 5, 5, 5, 5]);
function createOneTimeTaxBand(rowCode, lowerBound, upperBound, ratePercent) {
  return Object.freeze({ rowCode, lowerBound, upperBound, ratePercent });
}

function createOneTimeTaxProfile(profileCode, columnCode, description, bands) {
  return Object.freeze({
    profileCode,
    columnCode,
    description,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    thresholdBands: Object.freeze(bands)
  });
}

const ONE_TIME_TAX_TABLE_PROFILES_2026 = Object.freeze({
  column_1: createOneTimeTaxProfile("column_1", "1", "Arbetsinkomster, under 66 år vid årets ingång.", [
    createOneTimeTaxBand("ENG1-000000-025041", 0, 25041, 0),
    createOneTimeTaxBand("ENG1-025042-082800", 25042, 82800, 10),
    createOneTimeTaxBand("ENG1-082801-192000", 82801, 192000, 21),
    createOneTimeTaxBand("ENG1-192001-477600", 192001, 477600, 26),
    createOneTimeTaxBand("ENG1-477601-660000", 477601, 660000, 34),
    createOneTimeTaxBand("ENG1-660001-INF", 660001, null, 54)
  ]),
  column_2: createOneTimeTaxProfile("column_2", "2", "Pension m.m., 66 år eller äldre vid årets ingång.", [
    createOneTimeTaxBand("ENG2-000000-065800", 0, 65800, 0),
    createOneTimeTaxBand("ENG2-065801-477600", 65801, 477600, 26),
    createOneTimeTaxBand("ENG2-477601-660000", 477601, 660000, 34),
    createOneTimeTaxBand("ENG2-660001-INF", 660001, null, 55)
  ]),
  column_3: createOneTimeTaxProfile(
    "column_3",
    "3",
    "Löner, arvoden och liknande ersättningar, 66 år eller äldre vid årets ingång.",
    [
      createOneTimeTaxBand("ENG3-000000-025041", 0, 25041, 0),
      createOneTimeTaxBand("ENG3-025042-331200", 25042, 331200, 10),
      createOneTimeTaxBand("ENG3-331201-477600", 331201, 477600, 26),
      createOneTimeTaxBand("ENG3-477601-660000", 477601, 660000, 34),
      createOneTimeTaxBand("ENG3-660001-INF", 660001, null, 55)
    ]
  ),
  column_4: createOneTimeTaxProfile("column_4", "4", "Sjuk- och aktivitetsersättning, under 66 år vid årets ingång.", [
    createOneTimeTaxBand("ENG4-000000-025041", 0, 25041, 0),
    createOneTimeTaxBand("ENG4-025042-054000", 25042, 54000, 3),
    createOneTimeTaxBand("ENG4-054001-192000", 54001, 192000, 22),
    createOneTimeTaxBand("ENG4-192001-660000", 192001, 660000, 26),
    createOneTimeTaxBand("ENG4-660001-INF", 660001, null, 46)
  ]),
  column_5: createOneTimeTaxProfile(
    "column_5",
    "5",
    "Andra pensionsgrundande ersättningar än löner m.m., född 1938 eller senare.",
    [
      createOneTimeTaxBand("ENG5-000000-025041", 0, 25041, 0),
      createOneTimeTaxBand("ENG5-025042-032400", 25042, 32400, 10),
      createOneTimeTaxBand("ENG5-032401-160800", 32401, 160800, 29),
      createOneTimeTaxBand("ENG5-160801-184800", 160801, 184800, 34),
      createOneTimeTaxBand("ENG5-184801-660000", 184801, 660000, 38),
      createOneTimeTaxBand("ENG5-660001-INF", 660001, null, 54)
    ]
  ),
  column_6: createOneTimeTaxProfile("column_6", "6", "Pensioner och liknande inkomster, under 66 år vid årets ingång.", [
    createOneTimeTaxBand("ENG6-000000-025041", 0, 25041, 0),
    createOneTimeTaxBand("ENG6-025042-160800", 25042, 160800, 29),
    createOneTimeTaxBand("ENG6-160801-184800", 160801, 184800, 34),
    createOneTimeTaxBand("ENG6-184801-660000", 184801, 660000, 38),
    createOneTimeTaxBand("ENG6-660001-INF", 660001, null, 54)
  ]),
  sea_near_1: createOneTimeTaxProfile("sea_near_1", "1", "Sjöinkomst närfart, under 66 år vid årets ingång.", [
    createOneTimeTaxBand("ENGSEA-NEAR1-000000-025041", 0, 25041, 0),
    createOneTimeTaxBand("ENGSEA-NEAR1-025042-210000", 25042, 210000, 10),
    createOneTimeTaxBand("ENGSEA-NEAR1-210001-513600", 210001, 513600, 26),
    createOneTimeTaxBand("ENGSEA-NEAR1-513601-696000", 513601, 696000, 34),
    createOneTimeTaxBand("ENGSEA-NEAR1-696001-INF", 696001, null, 54)
  ]),
  sea_near_2: createOneTimeTaxProfile("sea_near_2", "2", "Sjöinkomst närfart, 66 år eller äldre vid årets ingång.", [
    createOneTimeTaxBand("ENGSEA-NEAR2-000000-025041", 0, 25041, 0),
    createOneTimeTaxBand("ENGSEA-NEAR2-025042-446400", 25042, 446400, 10),
    createOneTimeTaxBand("ENGSEA-NEAR2-446401-477600", 446401, 477600, 26),
    createOneTimeTaxBand("ENGSEA-NEAR2-477601-660000", 477601, 660000, 34),
    createOneTimeTaxBand("ENGSEA-NEAR2-660001-INF", 660001, null, 54)
  ]),
  sea_far_1: createOneTimeTaxProfile("sea_far_1", "1", "Sjöinkomst fjärrfart, under 66 år vid årets ingång.", [
    createOneTimeTaxBand("ENGSEA-FAR1-000000-025041", 0, 25041, 0),
    createOneTimeTaxBand("ENGSEA-FAR1-025042-246000", 25042, 246000, 10),
    createOneTimeTaxBand("ENGSEA-FAR1-246001-513600", 246001, 513600, 26),
    createOneTimeTaxBand("ENGSEA-FAR1-513601-696000", 513601, 696000, 34),
    createOneTimeTaxBand("ENGSEA-FAR1-696001-INF", 696001, null, 54)
  ]),
  sea_far_2: createOneTimeTaxProfile("sea_far_2", "2", "Sjöinkomst fjärrfart, 66 år eller äldre vid årets ingång.", [
    createOneTimeTaxBand("ENGSEA-FAR2-000000-025041", 0, 25041, 0),
    createOneTimeTaxBand("ENGSEA-FAR2-025042-477600", 25042, 477600, 10),
    createOneTimeTaxBand("ENGSEA-FAR2-477601-660000", 477601, 660000, 34),
    createOneTimeTaxBand("ENGSEA-FAR2-660001-INF", 660001, null, 54)
  ])
});

let monthlyTableIndexCache = null;
let oneTimeTableMetaCache = null;

function copyOneTimeTaxProfile(profile) {
  return {
    ...profile,
    thresholdBands: profile.thresholdBands.map((band) => ({ ...band }))
  };
}

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

function normalizeOneTimeTaxProfileCode({ profileCode = null, columnCode = null } = {}) {
  const normalizedProfileCode = String(profileCode ?? "").trim().toLowerCase();
  if (normalizedProfileCode) {
    const aliasMap = {
      "1": "column_1",
      "2": "column_2",
      "3": "column_3",
      "4": "column_4",
      "5": "column_5",
      "6": "column_6",
      column1: "column_1",
      column2: "column_2",
      column3: "column_3",
      column4: "column_4",
      column5: "column_5",
      column6: "column_6",
      near_1: "sea_near_1",
      near_2: "sea_near_2",
      narfart_1: "sea_near_1",
      narfart_2: "sea_near_2",
      far_1: "sea_far_1",
      far_2: "sea_far_2",
      fjarrfart_1: "sea_far_1",
      fjarrfart_2: "sea_far_2"
    };
    return aliasMap[normalizedProfileCode] || normalizedProfileCode;
  }
  const normalizedColumnCode = normalizeColumnCode(columnCode);
  return normalizedColumnCode == null ? null : `column_${normalizedColumnCode}`;
}

export function getSkatteverketMonthlyTaxTable2026Meta() {
  const index = loadMonthlyTaxTableIndex();
  return Object.freeze({
    sourceUrl: index.sourceUrl,
    sourceSnapshotDate: index.sourceSnapshotDate,
    sourceSha256: index.sourceSha256
  });
}

export function getSkatteverketOneTimeTaxTable2026Meta() {
  if (oneTimeTableMetaCache) {
    return oneTimeTableMetaCache;
  }
  const sourceSha256 = crypto
    .createHash("sha256")
    .update(JSON.stringify(ONE_TIME_TAX_TABLE_PROFILES_2026))
    .digest("hex");
  oneTimeTableMetaCache = Object.freeze({
    sourceUrl: ONE_TIME_TABLE_2026_SOURCE_URL,
    sourceSnapshotDate: ONE_TIME_TABLE_2026_SOURCE_SNAPSHOT_DATE,
    sourceSha256,
    profileCodes: Object.freeze(Object.keys(ONE_TIME_TAX_TABLE_PROFILES_2026))
  });
  return oneTimeTableMetaCache;
}

export function listSkatteverketOneTimeTaxProfiles2026() {
  return Object.values(ONE_TIME_TAX_TABLE_PROFILES_2026).map(copyOneTimeTaxProfile);
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

export function lookupSkatteverketOneTimeTaxTable2026({
  profileCode = null,
  columnCode = null,
  annualIncomeBasisAmount,
  oneTimeAmount
}) {
  const normalizedProfileCode = normalizeOneTimeTaxProfileCode({
    profileCode,
    columnCode
  });
  if (!normalizedProfileCode) {
    return null;
  }
  const profile = ONE_TIME_TAX_TABLE_PROFILES_2026[normalizedProfileCode] || null;
  if (!profile) {
    return null;
  }
  const normalizedAnnualIncomeBasisAmount = Math.max(0, Math.floor(Number(annualIncomeBasisAmount || 0)));
  const normalizedOneTimeAmount = roundMoney(Math.max(0, Number(oneTimeAmount || 0)));
  const matchedBand = profile.thresholdBands.find(
    (band) =>
      normalizedAnnualIncomeBasisAmount >= band.lowerBound &&
      (band.upperBound == null || normalizedAnnualIncomeBasisAmount <= band.upperBound)
  );
  if (!matchedBand) {
    return null;
  }
  const meta = getSkatteverketOneTimeTaxTable2026Meta();
  return Object.freeze({
    profileCode: profile.profileCode,
    columnCode: profile.columnCode,
    annualIncomeBasisAmount: normalizedAnnualIncomeBasisAmount,
    oneTimeAmount: normalizedOneTimeAmount,
    ratePercent: matchedBand.ratePercent,
    withholdingAmount: roundMoney(normalizedOneTimeAmount * (matchedBand.ratePercent / 100)),
    rowCode: matchedBand.rowCode,
    lowerBound: matchedBand.lowerBound,
    upperBound: matchedBand.upperBound,
    sourceUrl: meta.sourceUrl,
    sourceSnapshotDate: meta.sourceSnapshotDate,
    sourceSha256: meta.sourceSha256
  });
}
