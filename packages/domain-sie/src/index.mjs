import crypto from "node:crypto";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";
import { applyDurableStateSnapshot, serializeDurableState } from "../../domain-core/src/state-snapshots.mjs";

export const SIE_FORMAT_CODE = "SIE4";
export const SIE_EXPORT_JOB_STATUSES = Object.freeze(["completed"]);
export const SIE_IMPORT_JOB_STATUSES = Object.freeze(["applied"]);
export const SIE_IMPORT_MODE_CODES = Object.freeze(["opening_balance_batch", "journal_history"]);

export function createSiePlatform(options = {}) {
  return createSieEngine(options);
}

export function createSieEngine({
  clock = () => new Date(),
  ledgerPlatform,
  fiscalYearPlatform,
  orgAuthPlatform,
  seedDemo = false
} = {}) {
  assertDependency(ledgerPlatform, "ledgerPlatform");
  assertDependency(fiscalYearPlatform, "fiscalYearPlatform");
  assertDependency(orgAuthPlatform, "orgAuthPlatform");

  const state = createInitialState();

  if (seedDemo) {
    seedDemoState(state);
  }

  return {
    exportSie4,
    listSieExportJobs,
    getSieExportJob,
    importSie4,
    listSieImportJobs,
    getSieImportJob,
    snapshotSie,
    exportDurableState,
    importDurableState
  };

  function exportSie4({
    companyId,
    fiscalYearId = null,
    fromDate = null,
    toDate = null,
    fileName = null,
    actorId,
    idempotencyKey,
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedIdempotencyKey = requireText(idempotencyKey, "idempotency_key_required");
    const replayKey = toCompanyScopedKey(resolvedCompanyId, resolvedIdempotencyKey);
    const existingJobId = state.sieExportJobIdsByCompanyKey.get(replayKey);
    if (existingJobId) {
      return copy(requireSieExportJob(state, resolvedCompanyId, existingJobId));
    }

    const companyProfile = orgAuthPlatform.getCompanyProfile({ companyId: resolvedCompanyId });
    const fiscalYears = resolveExportFiscalYears({
      companyId: resolvedCompanyId,
      fiscalYearId,
      fromDate,
      toDate,
      fiscalYearPlatform
    });
    const journalEntries = ledgerPlatform.listJournalEntries({
      companyId: resolvedCompanyId,
      fiscalYearId,
      fromDate,
      toDate,
      statuses: ["posted", "reversed"]
    });
    const openingBalanceBatches = ledgerPlatform
      .listOpeningBalanceBatches({ companyId: resolvedCompanyId })
      .filter((batch) => fiscalYears.some((fiscalYear) => fiscalYear.fiscalYearId === batch.fiscalYearId))
      .filter((batch) => batch.status === "posted");
    const ledgerAccounts = ledgerPlatform.listLedgerAccounts({ companyId: resolvedCompanyId });
    const rendered = renderSie4Export({
      companyProfile,
      fiscalYears,
      openingBalanceBatches,
      journalEntries,
      ledgerAccounts,
      generatedAt: nowIso(clock),
      generatedBy: resolvedActorId
    });
    const createdAt = nowIso(clock);
    const sieExportJobId = crypto.randomUUID();
    const job = {
      sieExportJobId,
      companyId: resolvedCompanyId,
      status: "completed",
      formatCode: SIE_FORMAT_CODE,
      fiscalYearId: fiscalYearId == null ? null : requireText(fiscalYearId, "fiscal_year_id_required"),
      fromDate: fromDate == null ? null : normalizeDate(fromDate, "from_date_invalid"),
      toDate: toDate == null ? null : normalizeDate(toDate, "to_date_invalid"),
      fileName: normalizeOptionalText(fileName) || `${resolvedCompanyId}-${createdAt.slice(0, 10).replaceAll("-", "")}.se`,
      checksumAlgorithm: "sha256",
      checksum: sha256(rendered.content),
      lineCount: rendered.lineCount,
      companyProfile: {
        legalName: companyProfile.legalName || null,
        orgNumber: companyProfile.orgNumber || null
      },
      scope: {
        fiscalYearIds: fiscalYears.map((fiscalYear) => fiscalYear.fiscalYearId),
        journalEntryCount: journalEntries.length,
        openingBalanceBatchCount: openingBalanceBatches.length,
        accountCount: ledgerAccounts.length
      },
      content: rendered.content,
      createdByActorId: resolvedActorId,
      createdAt,
      completedAt: createdAt,
      correlationId
    };

    state.sieExportJobs.set(sieExportJobId, job);
    state.sieExportJobIdsByCompanyKey.set(replayKey, sieExportJobId);
    appendToIndex(state.sieExportJobIdsByCompany, resolvedCompanyId, sieExportJobId);
    return copy(job);
  }

  function listSieExportJobs({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return [...state.sieExportJobs.values()]
      .filter((job) => job.companyId === resolvedCompanyId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map(copy);
  }

  function getSieExportJob({ companyId, sieExportJobId } = {}) {
    return copy(requireSieExportJob(state, requireText(companyId, "company_id_required"), sieExportJobId));
  }

  function importSie4({
    companyId,
    modeCode,
    content,
    fileName = null,
    fiscalYearId = null,
    openingDate = null,
    sourceCode = null,
    externalReference = null,
    evidenceRefs = [],
    actorId,
    idempotencyKey,
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedModeCode = assertOneOf(modeCode, SIE_IMPORT_MODE_CODES, "sie_import_mode_invalid");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedIdempotencyKey = requireText(idempotencyKey, "idempotency_key_required");
    const resolvedContent = requireText(content, "sie_content_required");
    const replayKey = toCompanyScopedKey(resolvedCompanyId, resolvedIdempotencyKey);
    const existingJobId = state.sieImportJobIdsByCompanyKey.get(replayKey);
    if (existingJobId) {
      return copy(requireSieImportJob(state, resolvedCompanyId, existingJobId));
    }

    const parsed = parseSie4Payload(resolvedContent);
    ensureImportedAccounts({
      companyId: resolvedCompanyId,
      parsed,
      actorId: resolvedActorId,
      correlationId,
      ledgerPlatform
    });

    let openingBalanceBatchId = null;
    let importedJournalEntryIds = [];

    if (resolvedModeCode === "opening_balance_batch") {
      const resolvedFiscalYear = resolveImportFiscalYear({
        companyId: resolvedCompanyId,
        requestedFiscalYearId: fiscalYearId,
        parsed,
        fiscalYearPlatform
      });
      const resolvedOpeningDate = openingDate == null ? resolvedFiscalYear.startDate : normalizeDate(openingDate, "opening_date_invalid");
      const batch = ledgerPlatform.createOpeningBalanceBatch({
        companyId: resolvedCompanyId,
        fiscalYearId: resolvedFiscalYear.fiscalYearId,
        openingDate: resolvedOpeningDate,
        sourceCode: normalizeOptionalText(sourceCode) || "SIE4_IMPORT",
        externalReference: normalizeOptionalText(externalReference) || normalizeOptionalText(parsed.programName),
        description: `SIE4 opening balance import ${normalizeSieDate(resolvedOpeningDate)}`,
        evidenceRefs: normalizeEvidenceRefs(evidenceRefs),
        lines: buildOpeningBalanceLines(parsed),
        actorId: resolvedActorId,
        idempotencyKey: `${resolvedIdempotencyKey}:opening-balance`,
        correlationId
      });
      openingBalanceBatchId = batch.openingBalanceBatchId;
    } else {
      importedJournalEntryIds = applyJournalHistoryImport({
        companyId: resolvedCompanyId,
        parsed,
        actorId: resolvedActorId,
        idempotencyKey: resolvedIdempotencyKey,
        correlationId,
        ledgerPlatform
      });
    }

    const createdAt = nowIso(clock);
    const sieImportJobId = crypto.randomUUID();
    const job = {
      sieImportJobId,
      companyId: resolvedCompanyId,
      status: "applied",
      modeCode: resolvedModeCode,
      formatCode: SIE_FORMAT_CODE,
      fileName: normalizeOptionalText(fileName),
      fiscalYearId: fiscalYearId == null ? null : requireText(fiscalYearId, "fiscal_year_id_required"),
      checksumAlgorithm: "sha256",
      checksum: sha256(resolvedContent),
      summary: {
        accountCount: parsed.accounts.size,
        rangeCount: parsed.ranges.size,
        openingBalanceLineCount: parsed.openingBalances.length,
        voucherCount: parsed.vouchers.length,
        importedJournalEntryCount: importedJournalEntryIds.length
      },
      openingBalanceBatchId,
      importedJournalEntryIds,
      sourceCode: normalizeOptionalText(sourceCode) || "SIE4_IMPORT",
      externalReference: normalizeOptionalText(externalReference),
      parsedProgramName: parsed.programName,
      createdByActorId: resolvedActorId,
      createdAt,
      completedAt: createdAt,
      correlationId
    };

    state.sieImportJobs.set(sieImportJobId, job);
    state.sieImportJobIdsByCompanyKey.set(replayKey, sieImportJobId);
    appendToIndex(state.sieImportJobIdsByCompany, resolvedCompanyId, sieImportJobId);
    return copy(job);
  }

  function listSieImportJobs({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return [...state.sieImportJobs.values()]
      .filter((job) => job.companyId === resolvedCompanyId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map(copy);
  }

  function getSieImportJob({ companyId, sieImportJobId } = {}) {
    return copy(requireSieImportJob(state, requireText(companyId, "company_id_required"), sieImportJobId));
  }

  function snapshotSie() {
    return copy({
      sieExportJobs: [...state.sieExportJobs.values()],
      sieImportJobs: [...state.sieImportJobs.values()]
    });
  }

  function exportDurableState() {
    return serializeDurableState(state);
  }

  function importDurableState(snapshot) {
    applyDurableStateSnapshot(state, snapshot);
  }
}

function createInitialState() {
  return {
    sieExportJobs: new Map(),
    sieExportJobIdsByCompany: new Map(),
    sieExportJobIdsByCompanyKey: new Map(),
    sieImportJobs: new Map(),
    sieImportJobIdsByCompany: new Map(),
    sieImportJobIdsByCompanyKey: new Map()
  };
}

function seedDemoState() {}

function renderSie4Export({
  companyProfile,
  fiscalYears,
  openingBalanceBatches,
  journalEntries,
  ledgerAccounts,
  generatedAt,
  generatedBy
}) {
  const rangeIndexByFiscalYearId = new Map(fiscalYears.map((fiscalYear, index) => [fiscalYear.fiscalYearId, index]));
  const lines = [
    "#FLAGGA 0",
    `#PROGRAM ${quoteSieText("Swedish ERP")} ${quoteSieText("go-live")}`,
    "#FORMAT PC8",
    `#GEN ${normalizeSieDate(generatedAt.slice(0, 10))} ${quoteSieText(generatedBy)}`,
    "#SIETYP 4",
    `#FNAMN ${quoteSieText(companyProfile.legalName || "Unknown company")}`
  ];
  if (companyProfile.orgNumber) {
    lines.push(`#ORGNR ${companyProfile.orgNumber}`);
  }

  for (const [index, fiscalYear] of fiscalYears.entries()) {
    lines.push(`#RAR ${index} ${normalizeSieDate(fiscalYear.startDate)} ${normalizeSieDate(fiscalYear.endDate)}`);
  }
  for (const account of [...ledgerAccounts].sort((left, right) => left.accountNumber.localeCompare(right.accountNumber))) {
    lines.push(`#KONTO ${account.accountNumber} ${quoteSieText(account.accountName)}`);
  }

  const openingBalanceByRangeAndAccount = new Map();
  for (const batch of openingBalanceBatches) {
    const rangeIndex = rangeIndexByFiscalYearId.get(batch.fiscalYearId);
    if (rangeIndex == null) {
      continue;
    }
    for (const line of batch.lines) {
      const key = `${rangeIndex}:${line.accountNumber}`;
      const nextAmount = (openingBalanceByRangeAndAccount.get(key) || 0) + Number(line.debitAmount || 0) - Number(line.creditAmount || 0);
      openingBalanceByRangeAndAccount.set(key, roundMoney(nextAmount));
    }
  }
  for (const [key, amount] of [...openingBalanceByRangeAndAccount.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const [rangeIndex, accountNumber] = key.split(":");
    lines.push(`#IB ${rangeIndex} ${accountNumber} ${formatSieAmount(amount)}`);
  }

  for (const entry of journalEntries) {
    lines.push(
      `#VER ${entry.voucherSeriesCode || "A"} ${entry.voucherNumber || 0} ${normalizeSieDate(entry.journalDate)} ${quoteSieText(
        entry.description || ""
      )}`
    );
    lines.push("{");
    for (const line of entry.lines) {
      const amount = roundMoney(Number(line.debitAmount || 0) - Number(line.creditAmount || 0));
      lines.push(
        `#TRANS ${line.accountNumber} {} ${formatSieAmount(amount)} ${normalizeSieDate(entry.journalDate)} ${quoteSieText(
          entry.description || ""
        )}`
      );
    }
    lines.push("}");
  }

  return {
    content: `${lines.join("\r\n")}\r\n`,
    lineCount: lines.length
  };
}

function parseSie4Payload(content) {
  const lines = stripBom(content)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");
  const ranges = new Map();
  const accounts = new Map();
  const openingBalances = [];
  const vouchers = [];
  let currentVoucher = null;
  let programName = null;
  let generatedAt = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    if (line === "{") {
      continue;
    }
    if (line === "}") {
      if (currentVoucher) {
        vouchers.push(finalizeVoucher(currentVoucher));
        currentVoucher = null;
      }
      continue;
    }
    if (!line.startsWith("#")) {
      continue;
    }

    const firstSpace = line.indexOf(" ");
    const tag = (firstSpace === -1 ? line.slice(1) : line.slice(1, firstSpace)).toUpperCase();
    const rest = firstSpace === -1 ? "" : line.slice(firstSpace + 1);
    const tokens = tokenizeSieLine(rest);

    if (tag === "PROGRAM") {
      programName = tokens[0] || null;
      continue;
    }
    if (tag === "GEN") {
      generatedAt = tokens[0] ? denormalizeSieDate(tokens[0]) : null;
      continue;
    }
    if (tag === "RAR" && tokens.length >= 3) {
      ranges.set(tokens[0], {
        yearIndex: tokens[0],
        startDate: denormalizeSieDate(tokens[1]),
        endDate: denormalizeSieDate(tokens[2])
      });
      continue;
    }
    if (tag === "KONTO" && tokens.length >= 1) {
      accounts.set(tokens[0], {
        accountNumber: tokens[0],
        accountName: tokens[1] || `Imported account ${tokens[0]}`
      });
      continue;
    }
    if (tag === "IB" && tokens.length >= 3) {
      openingBalances.push({
        yearIndex: tokens[0],
        accountNumber: tokens[1],
        amount: normalizeAmountToken(tokens[2])
      });
      continue;
    }
    if (tag === "VER" && tokens.length >= 3) {
      if (currentVoucher) {
        vouchers.push(finalizeVoucher(currentVoucher));
      }
      currentVoucher = {
        seriesCode: tokens[0],
        voucherNumber: normalizePositiveInteger(tokens[1], "sie_voucher_number_invalid"),
        journalDate: denormalizeSieDate(tokens[2]),
        description: tokens[3] || "",
        lines: []
      };
      continue;
    }
    if (tag === "TRANS" && currentVoucher) {
      currentVoucher.lines.push(parseTransTokens(tokens));
    }
  }

  if (currentVoucher) {
    vouchers.push(finalizeVoucher(currentVoucher));
  }

  return {
    programName,
    generatedAt,
    ranges,
    accounts,
    openingBalances,
    vouchers
  };
}

function parseTransTokens(tokens) {
  if (tokens.length < 2) {
    throw httpError(400, "sie_trans_invalid", "SIE transaction line is incomplete.");
  }
  const accountNumber = requireText(tokens[0], "sie_trans_account_required");
  let cursor = 1;
  let objectJson = {};
  if (tokens[cursor] === "{") {
    const objectTokens = [];
    cursor += 1;
    while (cursor < tokens.length && tokens[cursor] !== "}") {
      objectTokens.push(tokens[cursor]);
      cursor += 1;
    }
    if (tokens[cursor] !== "}") {
      throw httpError(400, "sie_trans_object_list_invalid", "SIE object list must end with }.");
    }
    objectJson = parseObjectTokens(objectTokens);
    cursor += 1;
  }
  if (cursor >= tokens.length) {
    throw httpError(400, "sie_trans_amount_missing", "SIE transaction amount is required.");
  }
  return {
    accountNumber,
    objectJson,
    amount: normalizeAmountToken(tokens[cursor])
  };
}

function parseObjectTokens(tokens) {
  if (tokens.length === 0) {
    return {};
  }
  const values = [];
  for (let index = 0; index < tokens.length; index += 2) {
    values.push({
      dimension: tokens[index],
      value: tokens[index + 1] || null
    });
  }
  return { sieObjects: values };
}

function buildOpeningBalanceLines(parsed) {
  if (parsed.openingBalances.length === 0) {
    throw httpError(409, "sie_opening_balance_missing", "SIE payload does not contain any #IB opening-balance rows.");
  }
  const totalsByAccount = new Map();
  for (const openingBalance of parsed.openingBalances) {
    const nextAmount = (totalsByAccount.get(openingBalance.accountNumber) || 0) + openingBalance.amount;
    totalsByAccount.set(openingBalance.accountNumber, roundMoney(nextAmount));
  }
  return [...totalsByAccount.entries()].map(([accountNumber, amount]) => ({
    accountNumber,
    debitAmount: amount > 0 ? amount : 0,
    creditAmount: amount < 0 ? Math.abs(amount) : 0,
    dimensionJson: {},
    sourceType: "HISTORICAL_IMPORT",
    sourceId: `sie4:opening-balance:${accountNumber}`
  }));
}

function ensureImportedAccounts({ companyId, parsed, actorId, correlationId, ledgerPlatform }) {
  const existingAccounts = new Set(ledgerPlatform.listLedgerAccounts({ companyId }).map((account) => account.accountNumber));
  const requiredAccountNumbers = new Set(parsed.accounts.keys());
  for (const openingBalance of parsed.openingBalances) {
    requiredAccountNumbers.add(openingBalance.accountNumber);
  }
  for (const voucher of parsed.vouchers) {
    for (const line of voucher.lines) {
      requiredAccountNumbers.add(line.accountNumber);
    }
  }
  for (const accountNumber of requiredAccountNumbers) {
    if (existingAccounts.has(accountNumber)) {
      continue;
    }
    const accountDefinition = parsed.accounts.get(accountNumber);
    ledgerPlatform.upsertLedgerAccount({
      companyId,
      accountNumber,
      accountName: accountDefinition?.accountName || `Imported account ${accountNumber}`,
      accountClass: normalizeAccountClass(accountNumber),
      locked: false,
      allowManualPosting: false,
      actorId,
      changeReasonCode: "historical_import",
      correlationId
    });
    existingAccounts.add(accountNumber);
  }
}

function applyJournalHistoryImport({ companyId, parsed, actorId, idempotencyKey, correlationId, ledgerPlatform }) {
  const importedJournalEntryIds = [];
  for (const voucher of parsed.vouchers) {
    const voucherSeriesCode = voucher.seriesCode || "A";
    ledgerPlatform.upsertVoucherSeries({
      companyId,
      seriesCode: voucherSeriesCode,
      description: `Imported SIE series ${voucherSeriesCode}`,
      importedSequencePreservationEnabled: true,
      actorId,
      changeReasonCode: "historical_import",
      correlationId
    });
    const created = ledgerPlatform.createJournalEntry({
      companyId,
      journalDate: voucher.journalDate,
      voucherSeriesCode,
      sourceType: "HISTORICAL_IMPORT",
      sourceId: `sie4:${voucherSeriesCode}:${voucher.voucherNumber}:${voucher.journalDate}`,
      description: voucher.description || `Imported voucher ${voucherSeriesCode}${voucher.voucherNumber}`,
      actorId,
      idempotencyKey: `${idempotencyKey}:voucher:${voucherSeriesCode}:${voucher.voucherNumber}`,
      lines: voucher.lines.map((line, index) => ({
        accountNumber: line.accountNumber,
        debitAmount: line.amount > 0 ? line.amount : 0,
        creditAmount: line.amount < 0 ? Math.abs(line.amount) : 0,
        dimensionJson: line.objectJson || {},
        sourceType: "HISTORICAL_IMPORT",
        sourceId: `sie4:${voucherSeriesCode}:${voucher.voucherNumber}:line:${index + 1}`
      })),
      importedFlag: true,
      metadataJson: {
        importSourceType: "sie4",
        importFileProgramName: parsed.programName || null,
        importVoucherSeriesCode: voucherSeriesCode,
        importVoucherNumber: voucher.voucherNumber,
        importGeneratedAt: parsed.generatedAt || null,
        pipelineStage: "sie4_import"
      },
      correlationId
    });
    const validated = ledgerPlatform.validateJournalEntry({
      companyId,
      journalEntryId: created.journalEntry.journalEntryId,
      actorId,
      correlationId
    });
    const posted = ledgerPlatform.postJournalEntry({
      companyId,
      journalEntryId: validated.journalEntry.journalEntryId,
      actorId,
      importedVoucherNumber: voucher.voucherNumber,
      correlationId
    });
    importedJournalEntryIds.push(posted.journalEntry.journalEntryId);
  }
  return importedJournalEntryIds;
}

function resolveExportFiscalYears({ companyId, fiscalYearId, fromDate, toDate, fiscalYearPlatform }) {
  if (fiscalYearId) {
    return [requireFiscalYearRecord(companyId, fiscalYearId, fiscalYearPlatform)];
  }
  const fiscalYears = fiscalYearPlatform.listFiscalYears({ companyId });
  const resolvedFromDate = fromDate == null ? null : normalizeDate(fromDate, "from_date_invalid");
  const resolvedToDate = toDate == null ? null : normalizeDate(toDate, "to_date_invalid");
  const filtered = fiscalYears.filter((fiscalYear) => {
    if (resolvedFromDate && fiscalYear.endDate < resolvedFromDate) {
      return false;
    }
    if (resolvedToDate && fiscalYear.startDate > resolvedToDate) {
      return false;
    }
    return true;
  });
  if (filtered.length > 0) {
    return filtered;
  }
  throw httpError(404, "sie_export_scope_empty", "No fiscal years matched the requested SIE export scope.");
}

function resolveImportFiscalYear({ companyId, requestedFiscalYearId, parsed, fiscalYearPlatform }) {
  if (requestedFiscalYearId) {
    return requireFiscalYearRecord(companyId, requestedFiscalYearId, fiscalYearPlatform);
  }
  if (parsed.ranges.size === 1) {
    const [range] = parsed.ranges.values();
    const matched = fiscalYearPlatform
      .listFiscalYears({ companyId })
      .find((fiscalYear) => fiscalYear.startDate === range.startDate && fiscalYear.endDate === range.endDate);
    if (matched) {
      return matched;
    }
  }
  throw httpError(
    409,
    "sie_import_fiscal_year_required",
    "SIE import requires a fiscalYearId unless the file maps cleanly to exactly one fiscal year."
  );
}

function finalizeVoucher(voucher) {
  if (!Array.isArray(voucher.lines) || voucher.lines.length === 0) {
    throw httpError(400, "sie_voucher_lines_missing", "Each SIE voucher must contain at least one transaction.");
  }
  const totalAmount = roundMoney(voucher.lines.reduce((sum, line) => sum + Number(line.amount || 0), 0));
  if (Math.abs(totalAmount) > 0.01) {
    throw httpError(409, "sie_voucher_not_balanced", `SIE voucher ${voucher.seriesCode}${voucher.voucherNumber} is not balanced.`);
  }
  return voucher;
}

function requireFiscalYearRecord(companyId, fiscalYearId, fiscalYearPlatform) {
  return fiscalYearPlatform.getFiscalYear({
    companyId,
    fiscalYearId: requireText(fiscalYearId, "fiscal_year_id_required")
  });
}

function requireSieExportJob(state, companyId, sieExportJobId) {
  const job = state.sieExportJobs.get(requireText(sieExportJobId, "sie_export_job_id_required"));
  if (!job || job.companyId !== companyId) {
    throw httpError(404, "sie_export_job_not_found", "SIE export job was not found for the company.");
  }
  return job;
}

function requireSieImportJob(state, companyId, sieImportJobId) {
  const job = state.sieImportJobs.get(requireText(sieImportJobId, "sie_import_job_id_required"));
  if (!job || job.companyId !== companyId) {
    throw httpError(404, "sie_import_job_not_found", "SIE import job was not found for the company.");
  }
  return job;
}

function assertDependency(value, name) {
  if (!value || typeof value !== "object") {
    throw new TypeError(`${name} is required.`);
  }
}

function appendToIndex(indexMap, companyId, value) {
  const existing = indexMap.get(companyId) || [];
  indexMap.set(companyId, [...existing, value]);
}

function stripBom(value) {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function quoteSieText(value) {
  return `"${String(value || "").replaceAll("\"", "\"\"")}"`;
}

function normalizeSieDate(value) {
  return requireText(value, "sie_date_required").replaceAll("-", "");
}

function denormalizeSieDate(value) {
  const normalized = requireText(value, "sie_date_required");
  if (!/^\d{8}$/.test(normalized)) {
    throw httpError(400, "sie_date_invalid", "SIE date must use YYYYMMDD.");
  }
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`;
}

function tokenizeSieLine(value) {
  const tokens = [];
  let current = "";
  let inQuote = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const nextCharacter = value[index + 1];
    if (inQuote) {
      if (character === "\"" && nextCharacter === "\"") {
        current += "\"";
        index += 1;
        continue;
      }
      if (character === "\"") {
        tokens.push(current);
        current = "";
        inQuote = false;
        continue;
      }
      current += character;
      continue;
    }
    if (character === "\"") {
      if (current) {
        tokens.push(current);
        current = "";
      }
      inQuote = true;
      continue;
    }
    if (character === "{" || character === "}") {
      if (current) {
        tokens.push(current);
        current = "";
      }
      tokens.push(character);
      continue;
    }
    if (/\s/.test(character)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += character;
  }
  if (current) {
    tokens.push(current);
  }
  return tokens;
}

function normalizeAmountToken(value) {
  const normalized = requireText(value, "sie_amount_required").replaceAll(" ", "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw httpError(400, "sie_amount_invalid", "SIE amount must be numeric.");
  }
  return roundMoney(parsed);
}

function formatSieAmount(value) {
  return roundMoney(value).toFixed(2);
}

function normalizeEvidenceRefs(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string" && entry.trim()) : [];
}

function normalizeAccountClass(accountNumber) {
  const normalized = requireText(accountNumber, "account_number_required").replace(/\D/g, "");
  return normalized.slice(0, 1) || "0";
}

function normalizeDate(value, code) {
  const normalized = requireText(value, code);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw httpError(400, code, "Date must use ISO format YYYY-MM-DD.");
  }
  return normalized;
}

function normalizeOptionalText(value) {
  if (value == null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function normalizePositiveInteger(value, code) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw httpError(400, code, "Value must be a positive integer.");
  }
  return normalized;
}

function requireText(value, code) {
  if (value == null) {
    throw httpError(400, code, `${code.replaceAll("_", " ")}.`);
  }
  const normalized = String(value).trim();
  if (!normalized) {
    throw httpError(400, code, `${code.replaceAll("_", " ")}.`);
  }
  return normalized;
}

function assertOneOf(value, allowedValues, code) {
  const normalized = requireText(value, code);
  if (!allowedValues.includes(normalized)) {
    throw httpError(400, code, `${normalized} is not allowed.`);
  }
  return normalized;
}

function httpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

function toCompanyScopedKey(companyId, idempotencyKey) {
  return `${companyId}::${idempotencyKey}`;
}

function nowIso(clock) {
  return new Date(clock()).toISOString();
}
