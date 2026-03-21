import crypto from "node:crypto";
import { createLedgerEngine } from "../../domain-ledger/src/index.mjs";
import { createDocumentArchiveEngine } from "../../document-engine/src/index.mjs";

export const REPORT_CODES = Object.freeze(["trial_balance", "income_statement", "balance_sheet"]);
export const REPORT_VIEW_MODES = Object.freeze(["transactions", "period", "rolling_12", "fiscal_year"]);
export const RECONCILIATION_RUN_STATES = Object.freeze([
  "draft",
  "in_progress",
  "ready_for_signoff",
  "signed",
  "closed",
  "reopened"
]);
export const DIFFERENCE_ITEM_STATES = Object.freeze([
  "open",
  "investigating",
  "proposed_adjustment",
  "resolved",
  "waived"
]);
export const RECONCILIATION_AREA_CODES = Object.freeze([
  "bank",
  "ar",
  "ap",
  "vat",
  "tax_and_social_fees",
  "payroll",
  "pension",
  "accruals",
  "assets",
  "project_wip",
  "suspense"
]);

const REPORT_DEFINITIONS = Object.freeze([
  {
    reportCode: "trial_balance",
    name: "Trial balance",
    purpose: "Account-level debit, credit and balance movements with report-to-journal-to-document drilldown.",
    versionNo: 1,
    defaultViewMode: "period",
    allowedViewModes: ["transactions", "period", "rolling_12", "fiscal_year"],
    classFilter: ["1", "2", "3", "4", "5", "6", "7", "8"],
    drilldownMode: "journal_to_document",
    metricCatalog: [
      { metricCode: "total_debit", name: "Total debit", ownerRoleCode: "finance_manager", versionNo: 1, drilldownLevel: "journal_entry" },
      { metricCode: "total_credit", name: "Total credit", ownerRoleCode: "finance_manager", versionNo: 1, drilldownLevel: "journal_entry" },
      { metricCode: "balance_amount", name: "Balance amount", ownerRoleCode: "finance_manager", versionNo: 1, drilldownLevel: "journal_entry" }
    ],
    status: "active"
  },
  {
    reportCode: "income_statement",
    name: "Income statement",
    purpose: "Baseline revenue and cost report grouped by P&L accounts with deterministic drilldown.",
    versionNo: 1,
    defaultViewMode: "period",
    allowedViewModes: ["transactions", "period", "rolling_12", "fiscal_year"],
    classFilter: ["3", "4", "5", "6", "7", "8"],
    drilldownMode: "journal_to_document",
    metricCatalog: [
      { metricCode: "pl_debit", name: "P&L debit", ownerRoleCode: "finance_manager", versionNo: 1, drilldownLevel: "journal_entry" },
      { metricCode: "pl_credit", name: "P&L credit", ownerRoleCode: "finance_manager", versionNo: 1, drilldownLevel: "journal_entry" },
      { metricCode: "pl_net_amount", name: "P&L net amount", ownerRoleCode: "finance_manager", versionNo: 1, drilldownLevel: "journal_entry" }
    ],
    status: "active"
  },
  {
    reportCode: "balance_sheet",
    name: "Balance sheet",
    purpose: "Baseline balance sheet accounts with reproducible drilldown to voucher and document evidence.",
    versionNo: 1,
    defaultViewMode: "period",
    allowedViewModes: ["transactions", "period", "rolling_12", "fiscal_year"],
    classFilter: ["1", "2"],
    drilldownMode: "journal_to_document",
    metricCatalog: [
      { metricCode: "bs_debit", name: "Balance sheet debit", ownerRoleCode: "finance_manager", versionNo: 1, drilldownLevel: "journal_entry" },
      { metricCode: "bs_credit", name: "Balance sheet credit", ownerRoleCode: "finance_manager", versionNo: 1, drilldownLevel: "journal_entry" },
      { metricCode: "bs_net_amount", name: "Balance sheet net amount", ownerRoleCode: "finance_manager", versionNo: 1, drilldownLevel: "journal_entry" }
    ],
    status: "active"
  }
]);

export function createReportingPlatform(options = {}) {
  return createReportingEngine(options);
}

export function createReportingEngine({
  clock = () => new Date(),
  ledgerPlatform = null,
  documentPlatform = null,
  documentArchivePlatform = null
} = {}) {
  const ledger = ledgerPlatform || createLedgerEngine({ clock });
  const documents = documentPlatform || documentArchivePlatform || createDocumentArchiveEngine({ clock });
  const state = {
    reportSnapshots: new Map(),
    reportSnapshotIdsByCompany: new Map(),
    reconciliationRuns: new Map(),
    reconciliationRunIdsByCompany: new Map(),
    reconciliationVersionCounters: new Map(),
    auditEvents: []
  };

  return {
    reportCodes: REPORT_CODES,
    reportViewModes: REPORT_VIEW_MODES,
    reconciliationAreaCodes: RECONCILIATION_AREA_CODES,
    reconciliationRunStates: RECONCILIATION_RUN_STATES,
    differenceItemStates: DIFFERENCE_ITEM_STATES,
    listReportDefinitions,
    runReportSnapshot,
    getReportSnapshot,
    getReportLineDrilldown,
    searchJournalEntries,
    createReconciliationRun,
    listReconciliationRuns,
    getReconciliationRun,
    signOffReconciliationRun,
    snapshotReporting
  };

  function listReportDefinitions({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return REPORT_DEFINITIONS.map((definition) => ({
      companyId: resolvedCompanyId,
      ...copy(definition)
    }));
  }

  function runReportSnapshot({
    companyId,
    reportCode,
    accountingPeriodId = null,
    viewMode = null,
    fromDate = null,
    toDate = null,
    asOfDate = null,
    filters = {},
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const definition = requireReportDefinition(reportCode);
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const ledgerSnapshot = ledger.snapshotLedger();
    const documentSnapshot =
      typeof documents.snapshotDocumentArchive === "function"
        ? documents.snapshotDocumentArchive()
        : { documents: [], versions: [], links: [], auditEvents: [] };
    const window = resolveReportWindow({
      companyId: resolvedCompanyId,
      ledgerSnapshot,
      accountingPeriodId,
      viewMode: viewMode || definition.defaultViewMode,
      fromDate,
      toDate,
      asOfDate
    });
    const entries = filterJournalEntries({
      journalEntries: ledgerSnapshot.journalEntries,
      companyId: resolvedCompanyId,
      fromDate: window.fromDate,
      toDate: window.toDate
    });
    const linkedDocuments = indexLinkedDocuments({
      companyId: resolvedCompanyId,
      documentSnapshot
    });
    const { lines, totals } = buildReportLines({
      definition,
      accounts: ledgerSnapshot.accounts,
      entries,
      linkedDocuments,
      filters
    });
    const now = nowIso();
    const sourceSnapshotHash = hashObject({
      companyId: resolvedCompanyId,
      reportCode: definition.reportCode,
      fromDate: window.fromDate,
      toDate: window.toDate,
      journalEntries: entries.map((entry) => ({
        journalEntryId: entry.journalEntryId,
        status: entry.status,
        journalDate: entry.journalDate,
        voucherSeriesCode: entry.voucherSeriesCode,
        voucherNumber: entry.voucherNumber,
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
        lines: entry.lines.map((line) => ({
          accountNumber: line.accountNumber,
          debitAmount: roundMoney(line.debitAmount),
          creditAmount: roundMoney(line.creditAmount)
        }))
      })),
      linkedDocuments: flattenLinkedDocuments(linkedDocuments)
    });
    const snapshot = {
      reportSnapshotId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      reportCode: definition.reportCode,
      reportName: definition.name,
      reportVersionNo: definition.versionNo,
      reportDefinition: copy(definition),
      metricCatalog: copy(definition.metricCatalog),
      viewMode: window.viewMode,
      accountingPeriodId: window.accountingPeriodId,
      fromDate: window.fromDate,
      toDate: window.toDate,
      periodStatus: window.periodStatus,
      filters: copy(filters),
      drilldownMode: definition.drilldownMode,
      lineCount: lines.length,
      sourceSnapshotHash,
      contentHash: hashObject({
        reportCode: definition.reportCode,
        reportVersionNo: definition.versionNo,
        sourceSnapshotHash,
        viewMode: window.viewMode,
        lineSummary: lines.map((line) => ({
          lineKey: line.lineKey,
          totalDebit: line.totalDebit,
          totalCredit: line.totalCredit,
          balanceAmount: line.balanceAmount,
          sourceDocumentCount: line.sourceDocumentCount
        }))
      }),
      lines,
      totals,
      generatedAt: now,
      generatedByActorId: resolvedActorId
    };

    state.reportSnapshots.set(snapshot.reportSnapshotId, snapshot);
    ensureCompanyCollection(state.reportSnapshotIdsByCompany, resolvedCompanyId).push(snapshot.reportSnapshotId);
    pushAudit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: "reporting.report_snapshot.materialized",
      entityType: "report_snapshot",
      entityId: snapshot.reportSnapshotId,
      explanation: `Materialized ${definition.reportCode} snapshot for ${window.fromDate}..${window.toDate}.`
    });

    return copy(snapshot);
  }

  function getReportSnapshot({ companyId, reportSnapshotId } = {}) {
    return copy(requireReportSnapshot(requireText(companyId, "company_id_required"), reportSnapshotId));
  }

  function getReportLineDrilldown({ companyId, reportSnapshotId, lineKey } = {}) {
    const snapshot = requireReportSnapshot(requireText(companyId, "company_id_required"), reportSnapshotId);
    const resolvedLineKey = requireText(lineKey, "line_key_required");
    const line = snapshot.lines.find((candidate) => candidate.lineKey === resolvedLineKey);
    if (!line) {
      throw httpError(404, "report_line_not_found", "Report line was not found.");
    }

    return copy({
      reportSnapshotId: snapshot.reportSnapshotId,
      reportCode: snapshot.reportCode,
      line
    });
  }

  function searchJournalEntries({
    companyId,
    reportSnapshotId = null,
    query = null,
    accountNumber = null,
    sourceType = null,
    sourceId = null,
    status = null,
    voucherSeriesCode = null,
    journalDateFrom = null,
    journalDateTo = null,
    dimensionFilters = {}
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const ledgerSnapshot = ledger.snapshotLedger();
    const documentSnapshot =
      typeof documents.snapshotDocumentArchive === "function"
        ? documents.snapshotDocumentArchive()
        : { documents: [], versions: [], links: [], auditEvents: [] };
    const linkedDocuments = indexLinkedDocuments({
      companyId: resolvedCompanyId,
      documentSnapshot
    });
    const snapshotJournalIds = reportSnapshotId
      ? new Set(
          requireReportSnapshot(resolvedCompanyId, reportSnapshotId).lines.flatMap((line) =>
            line.drilldownEntries.map((entry) => entry.journalEntryId)
          )
        )
      : null;

    const items = ledgerSnapshot.journalEntries
      .filter((entry) => entry.companyId === resolvedCompanyId)
      .filter((entry) => (snapshotJournalIds ? snapshotJournalIds.has(entry.journalEntryId) : true))
      .filter((entry) => (status ? entry.status === status : true))
      .filter((entry) => (sourceType ? entry.sourceType === sourceType : true))
      .filter((entry) => (sourceId ? entry.sourceId === sourceId : true))
      .filter((entry) => (voucherSeriesCode ? entry.voucherSeriesCode === voucherSeriesCode : true))
      .filter((entry) => (journalDateFrom ? entry.journalDate >= normalizeDate(journalDateFrom, "journal_date_from_invalid") : true))
      .filter((entry) => (journalDateTo ? entry.journalDate <= normalizeDate(journalDateTo, "journal_date_to_invalid") : true))
      .filter((entry) => (accountNumber ? entry.lines.some((line) => line.accountNumber === String(accountNumber)) : true))
      .filter((entry) => matchesDimensionFilters(entry, dimensionFilters))
      .filter((entry) => matchesSearchQuery(entry, query))
      .sort(sortJournalEntries)
      .map((entry) => presentSearchEntry({ entry, linkedDocuments }));

    return {
      items,
      totalEntries: items.length
    };
  }

  function createReconciliationRun({
    companyId,
    accountingPeriodId,
    areaCode,
    cutoffDate = null,
    ledgerAccountNumbers = [],
    subledgerBalanceAmount = null,
    materialityThresholdAmount = 0,
    differenceItems = [],
    ownerUserId = null,
    signoffRequired = true,
    checklistSnapshotRef = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const accountingPeriod = requireAccountingPeriod({
      companyId: resolvedCompanyId,
      accountingPeriodId
    });
    const resolvedAreaCode = assertAllowedValue(areaCode, RECONCILIATION_AREA_CODES, "reconciliation_area_invalid");
    const resolvedLedgerAccountNumbers = normalizeLedgerAccountNumbers(ledgerAccountNumbers);
    const resolvedMaterialityThreshold = roundMoney(materialityThresholdAmount);
    const resolvedCutoffDate = cutoffDate
      ? normalizeDate(cutoffDate, "cutoff_date_invalid")
      : accountingPeriod.endsOn;
    const ledgerBalanceAmount = computeLedgerBalanceAmount({
      companyId: resolvedCompanyId,
      accountingPeriodId: accountingPeriod.accountingPeriodId,
      ledgerAccountNumbers: resolvedLedgerAccountNumbers
    });
    const normalizedDifferenceItems = normalizeDifferenceItems({
      differenceItems,
      areaCode: resolvedAreaCode
    });
    const resolvedSubledgerBalanceAmount =
      subledgerBalanceAmount === null || subledgerBalanceAmount === undefined
        ? null
        : roundMoney(subledgerBalanceAmount);
    const autoDifferenceAmount =
      resolvedSubledgerBalanceAmount === null
        ? 0
        : roundMoney(ledgerBalanceAmount - resolvedSubledgerBalanceAmount);
    const finalDifferenceItems =
      normalizedDifferenceItems.length > 0
        ? normalizedDifferenceItems
        : Math.abs(autoDifferenceAmount) > 0
          ? [
              {
                reconciliationDifferenceItemId: crypto.randomUUID(),
                state: "open",
                reasonCode: `${resolvedAreaCode}_tie_out_difference`,
                amount: autoDifferenceAmount,
                ownerUserId: ownerUserId || null,
                explanation: `Ledger balance ${ledgerBalanceAmount} differs from subledger balance ${resolvedSubledgerBalanceAmount}.`,
                createdAt: nowIso(),
                updatedAt: nowIso(),
                waivedUntil: null
              }
            ]
          : [];
    const versionKey = `${resolvedCompanyId}:${accountingPeriod.accountingPeriodId}:${resolvedAreaCode}`;
    const versionNo = (state.reconciliationVersionCounters.get(versionKey) || 0) + 1;
    state.reconciliationVersionCounters.set(versionKey, versionNo);
    const now = nowIso();
    const statusHistory = [
      createStatusTransition({ toStatus: "draft", actorId: resolvedActorId, reasonCode: "run_created", changedAt: now }),
      createStatusTransition({
        fromStatus: "draft",
        toStatus: "in_progress",
        actorId: resolvedActorId,
        reasonCode: "snapshot_materialized",
        changedAt: now
      })
    ];
    let status = "in_progress";
    if (finalDifferenceItems.every(isResolvedDifferenceItem)) {
      status = "ready_for_signoff";
      statusHistory.push(
        createStatusTransition({
          fromStatus: "in_progress",
          toStatus: "ready_for_signoff",
          actorId: resolvedActorId,
          reasonCode: "all_differences_resolved",
          changedAt: now
        })
      );
    }

    const reconciliationRun = {
      reconciliationRunId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      accountingPeriodId: accountingPeriod.accountingPeriodId,
      areaCode: resolvedAreaCode,
      versionNo,
      cutoffDate: resolvedCutoffDate,
      status,
      statusHistory,
      ledgerAccountNumbers: resolvedLedgerAccountNumbers,
      ledgerBalanceAmount,
      subledgerBalanceAmount: resolvedSubledgerBalanceAmount,
      differenceAmount: roundMoney(
        finalDifferenceItems.reduce((sum, item) => sum + Number(item.amount || 0), 0)
      ),
      materialityThresholdAmount: resolvedMaterialityThreshold,
      ownerUserId: ownerUserId || null,
      signoffRequired: signoffRequired !== false,
      checklistSnapshotRef: checklistSnapshotRef || null,
      snapshotHash: hashObject({
        companyId: resolvedCompanyId,
        accountingPeriodId: accountingPeriod.accountingPeriodId,
        areaCode: resolvedAreaCode,
        versionNo,
        cutoffDate: resolvedCutoffDate,
        ledgerAccountNumbers: resolvedLedgerAccountNumbers,
        ledgerBalanceAmount,
        subledgerBalanceAmount: resolvedSubledgerBalanceAmount,
        differenceItems: finalDifferenceItems
      }),
      evidenceSnapshotRef: null,
      differenceItems: finalDifferenceItems,
      signoffs: [],
      createdAt: now,
      updatedAt: now,
      createdByActorId: resolvedActorId
    };
    reconciliationRun.evidenceSnapshotRef = reconciliationRun.snapshotHash;

    state.reconciliationRuns.set(reconciliationRun.reconciliationRunId, reconciliationRun);
    ensureCompanyCollection(state.reconciliationRunIdsByCompany, resolvedCompanyId).push(
      reconciliationRun.reconciliationRunId
    );
    pushAudit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: "reporting.reconciliation_run.created",
      entityType: "reconciliation_run",
      entityId: reconciliationRun.reconciliationRunId,
      explanation: `Created ${resolvedAreaCode} reconciliation version ${versionNo} for period ${accountingPeriod.startsOn}..${accountingPeriod.endsOn}.`
    });

    return {
      reconciliationRun: copy(reconciliationRun)
    };
  }

  function listReconciliationRuns({ companyId, accountingPeriodId = null, areaCode = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return [...state.reconciliationRuns.values()]
      .filter((run) => run.companyId === resolvedCompanyId)
      .filter((run) => (accountingPeriodId ? run.accountingPeriodId === accountingPeriodId : true))
      .filter((run) => (areaCode ? run.areaCode === areaCode : true))
      .sort((left, right) => {
        const cutoffComparison = left.cutoffDate.localeCompare(right.cutoffDate);
        if (cutoffComparison !== 0) {
          return cutoffComparison;
        }
        const areaComparison = left.areaCode.localeCompare(right.areaCode);
        if (areaComparison !== 0) {
          return areaComparison;
        }
        return left.versionNo - right.versionNo;
      })
      .map((run) => copy(run));
  }

  function getReconciliationRun({ companyId, reconciliationRunId } = {}) {
    return copy(requireReconciliationRun(requireText(companyId, "company_id_required"), reconciliationRunId));
  }

  function signOffReconciliationRun({
    companyId,
    reconciliationRunId,
    actorId,
    signatoryRole = "close_signatory",
    comment = null,
    evidenceRefs = [],
    correlationId = crypto.randomUUID()
  } = {}) {
    const run = requireReconciliationRun(requireText(companyId, "company_id_required"), reconciliationRunId);
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedSignatoryRole = requireText(signatoryRole, "signatory_role_required");
    const now = nowIso();

    refreshReconciliationStatus(run, resolvedActorId, now);
    if (run.status === "signed") {
      return {
        reconciliationRun: copy(run),
        signOff: copy(run.signoffs[run.signoffs.length - 1] || null)
      };
    }
    if (run.status !== "ready_for_signoff") {
      throw httpError(
        409,
        "reconciliation_not_ready_for_signoff",
        "Reconciliation run is not ready for sign-off."
      );
    }

    const signOff = {
      reconciliationSignoffId: crypto.randomUUID(),
      reconciliationRunId: run.reconciliationRunId,
      companyId: run.companyId,
      signatoryRole: resolvedSignatoryRole,
      signatoryUserId: resolvedActorId,
      decision: "approved",
      comment: comment || null,
      evidenceSnapshotRef: run.snapshotHash,
      evidenceRefs: Array.isArray(evidenceRefs) ? copy(evidenceRefs) : [],
      signedAt: now
    };
    run.signoffs.push(signOff);
    run.status = "signed";
    run.updatedAt = now;
    run.statusHistory.push(
      createStatusTransition({
        fromStatus: "ready_for_signoff",
        toStatus: "signed",
        actorId: resolvedActorId,
        reasonCode: "manual_signoff",
        changedAt: now
      })
    );

    pushAudit({
      companyId: run.companyId,
      actorId: resolvedActorId,
      correlationId,
      action: "reporting.reconciliation_run.signed",
      entityType: "reconciliation_run",
      entityId: run.reconciliationRunId,
      explanation: `Signed ${run.areaCode} reconciliation version ${run.versionNo}.`
    });

    return {
      reconciliationRun: copy(run),
      signOff: copy(signOff)
    };
  }

  function snapshotReporting() {
    return copy({
      reportSnapshots: [...state.reportSnapshots.values()],
      reconciliationRuns: [...state.reconciliationRuns.values()],
      auditEvents: state.auditEvents
    });
  }

  function requireReportSnapshot(companyId, reportSnapshotId) {
    const snapshot = state.reportSnapshots.get(requireText(reportSnapshotId, "report_snapshot_id_required"));
    if (!snapshot || snapshot.companyId !== companyId) {
      throw httpError(404, "report_snapshot_not_found", "Report snapshot was not found.");
    }
    return snapshot;
  }

  function requireReconciliationRun(companyId, reconciliationRunId) {
    const run = state.reconciliationRuns.get(requireText(reconciliationRunId, "reconciliation_run_id_required"));
    if (!run || run.companyId !== companyId) {
      throw httpError(404, "reconciliation_run_not_found", "Reconciliation run was not found.");
    }
    return run;
  }

  function refreshReconciliationStatus(run, actorId, changedAt) {
    if (run.status === "signed" || run.status === "closed") {
      return;
    }
    const ready = run.differenceItems.every(isResolvedDifferenceItem);
    if (ready && run.status !== "ready_for_signoff") {
      run.status = "ready_for_signoff";
      run.updatedAt = changedAt;
      run.statusHistory.push(
        createStatusTransition({
          fromStatus: "in_progress",
          toStatus: "ready_for_signoff",
          actorId,
          reasonCode: "all_differences_resolved",
          changedAt
        })
      );
    }
  }

  function computeLedgerBalanceAmount({ companyId, accountingPeriodId, ledgerAccountNumbers }) {
    const snapshot = ledger.snapshotLedger();
    const period = requireAccountingPeriod({ companyId, accountingPeriodId, ledgerSnapshot: snapshot });
    const journalEntries = filterJournalEntries({
      journalEntries: snapshot.journalEntries,
      companyId,
      fromDate: period.startsOn,
      toDate: period.endsOn
    });
    const accountFilter = new Set(ledgerAccountNumbers);
    return roundMoney(
      journalEntries.reduce((sum, entry) => {
        return (
          sum +
          entry.lines.reduce((lineSum, line) => {
            if (accountFilter.size > 0 && !accountFilter.has(line.accountNumber)) {
              return lineSum;
            }
            return lineSum + Number(line.debitAmount || 0) - Number(line.creditAmount || 0);
          }, 0)
        );
      }, 0)
    );
  }

  function requireAccountingPeriod({ companyId, accountingPeriodId, ledgerSnapshot = ledger.snapshotLedger() } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedAccountingPeriodId = requireText(accountingPeriodId, "accounting_period_id_required");
    const accountingPeriod = (ledgerSnapshot.accountingPeriods || []).find(
      (candidate) =>
        candidate.companyId === resolvedCompanyId && candidate.accountingPeriodId === resolvedAccountingPeriodId
    );
    if (!accountingPeriod) {
      throw httpError(404, "accounting_period_not_found", "Accounting period was not found.");
    }
    return accountingPeriod;
  }

  function requireReportDefinition(reportCode) {
    const resolvedReportCode = requireText(reportCode, "report_code_required");
    const definition = REPORT_DEFINITIONS.find((candidate) => candidate.reportCode === resolvedReportCode);
    if (!definition) {
      throw httpError(404, "report_definition_not_found", `Report definition ${resolvedReportCode} was not found.`);
    }
    return definition;
  }

  function resolveReportWindow({ companyId, ledgerSnapshot, accountingPeriodId, viewMode, fromDate, toDate, asOfDate }) {
    const resolvedViewMode = assertAllowedValue(viewMode, REPORT_VIEW_MODES, "report_view_mode_invalid");
    const period = accountingPeriodId
      ? requireAccountingPeriod({
          companyId,
          accountingPeriodId,
          ledgerSnapshot
        })
      : null;

    if (resolvedViewMode === "period") {
      if (!period && (!fromDate || !toDate)) {
        throw httpError(400, "period_window_required", "Period view requires accountingPeriodId or fromDate/toDate.");
      }
      return {
        viewMode: resolvedViewMode,
        accountingPeriodId: period?.accountingPeriodId || null,
        fromDate: period?.startsOn || normalizeDate(fromDate, "report_from_date_invalid"),
        toDate: period?.endsOn || normalizeDate(toDate, "report_to_date_invalid"),
        periodStatus: period?.status || "custom_range"
      };
    }

    if (resolvedViewMode === "transactions") {
      const resolvedFromDate = period?.startsOn || normalizeDate(fromDate, "report_from_date_invalid");
      const resolvedToDate = period?.endsOn || normalizeDate(toDate, "report_to_date_invalid");
      return {
        viewMode: resolvedViewMode,
        accountingPeriodId: period?.accountingPeriodId || null,
        fromDate: resolvedFromDate,
        toDate: resolvedToDate,
        periodStatus: period?.status || "custom_range"
      };
    }

    if (resolvedViewMode === "rolling_12") {
      const anchorDate = period?.endsOn || normalizeDate(asOfDate || toDate, "report_as_of_date_invalid");
      const anchor = parseIsoDate(anchorDate);
      const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 11, 1));
      return {
        viewMode: resolvedViewMode,
        accountingPeriodId: period?.accountingPeriodId || null,
        fromDate: toIsoDate(start),
        toDate: anchorDate,
        periodStatus: period?.status || "custom_range"
      };
    }

    const fiscalAnchor = period?.startsOn || normalizeDate(asOfDate || fromDate, "report_as_of_date_invalid");
    const year = fiscalAnchor.slice(0, 4);
    return {
      viewMode: resolvedViewMode,
      accountingPeriodId: period?.accountingPeriodId || null,
      fromDate: `${year}-01-01`,
      toDate: `${year}-12-31`,
      periodStatus: period?.status || "custom_range"
    };
  }

  function buildReportLines({ definition, accounts, entries, linkedDocuments, filters }) {
    const accountMap = new Map((accounts || []).map((account) => [account.accountNumber, account]));
    const requestedAccountNumbers = new Set(
      Array.isArray(filters.accountNumbers) ? filters.accountNumbers.map((value) => String(value)) : []
    );
    const requestedClasses = new Set(
      Array.isArray(filters.accountClasses)
        ? filters.accountClasses.map((value) => String(value))
        : definition.classFilter
    );
    const grouped = new Map();

    for (const entry of entries) {
      const drilldownEntry = buildJournalDrilldownEntry({
        entry,
        linkedDocuments: findLinkedDocumentsForJournalEntry(entry, linkedDocuments)
      });

      for (const line of entry.lines) {
        const account = accountMap.get(line.accountNumber) || {
          accountNumber: line.accountNumber,
          accountName: `Account ${line.accountNumber}`,
          accountClass: String(line.accountNumber).slice(0, 1)
        };
        if (!requestedClasses.has(account.accountClass)) {
          continue;
        }
        if (requestedAccountNumbers.size > 0 && !requestedAccountNumbers.has(account.accountNumber)) {
          continue;
        }
        const key = account.accountNumber;
        if (!grouped.has(key)) {
          grouped.set(key, {
            lineKey: key,
            accountNumber: account.accountNumber,
            accountName: account.accountName,
            accountClass: account.accountClass,
            totalDebit: 0,
            totalCredit: 0,
            balanceAmount: 0,
            journalEntryCount: 0,
            sourceDocumentCount: 0,
            drilldownEntries: [],
            sourceDocumentRefs: []
          });
        }
        const bucket = grouped.get(key);
        bucket.totalDebit = roundMoney(bucket.totalDebit + Number(line.debitAmount || 0));
        bucket.totalCredit = roundMoney(bucket.totalCredit + Number(line.creditAmount || 0));
        bucket.balanceAmount = roundMoney(bucket.totalDebit - bucket.totalCredit);
        if (!bucket.drilldownEntries.some((candidate) => candidate.journalEntryId === drilldownEntry.journalEntryId)) {
          bucket.drilldownEntries.push(copy(drilldownEntry));
        }
      }
    }

    const lines = [...grouped.values()]
      .sort((left, right) => left.accountNumber.localeCompare(right.accountNumber))
      .map((line) => {
        const sourceDocumentRefs = dedupeByKey(
          line.drilldownEntries.flatMap((entry) => entry.linkedDocuments),
          (item) => `${item.documentId}:${item.targetType}:${item.targetId}`
        );
        return {
          ...line,
          journalEntryCount: line.drilldownEntries.length,
          sourceDocumentCount: sourceDocumentRefs.length,
          sourceDocumentRefs
        };
      });

    return {
      lines,
      totals: {
        totalDebit: roundMoney(lines.reduce((sum, line) => sum + Number(line.totalDebit || 0), 0)),
        totalCredit: roundMoney(lines.reduce((sum, line) => sum + Number(line.totalCredit || 0), 0)),
        balanceAmount: roundMoney(lines.reduce((sum, line) => sum + Number(line.balanceAmount || 0), 0))
      }
    };
  }

  function indexLinkedDocuments({ companyId, documentSnapshot }) {
    const documentsById = new Map(
      (documentSnapshot.documents || [])
        .filter((document) => document.companyId === companyId)
        .map((document) => [document.documentId, document])
    );
    const byJournalEntryId = new Map();
    const bySourceObjectKey = new Map();

    for (const link of documentSnapshot.links || []) {
      if (link.companyId !== companyId) {
        continue;
      }
      const document = documentsById.get(link.documentId);
      const reference = {
        documentId: link.documentId,
        documentType: document?.documentType || null,
        documentStatus: document?.status || null,
        sourceReference: document?.sourceReference || null,
        targetType: link.targetType,
        targetId: link.targetId,
        linkedAt: link.linkedAt
      };
      if (link.targetType === "journal_entry") {
        ensureMapArray(byJournalEntryId, link.targetId).push(reference);
      }
      ensureMapArray(bySourceObjectKey, `${link.targetType}:${link.targetId}`).push(reference);
    }

    return {
      byJournalEntryId,
      bySourceObjectKey
    };
  }

  function buildJournalDrilldownEntry({ entry, linkedDocuments }) {
    return {
      journalEntryId: entry.journalEntryId,
      journalDate: entry.journalDate,
      voucherSeriesCode: entry.voucherSeriesCode,
      voucherNumber: entry.voucherNumber,
      status: entry.status,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      description: entry.description || null,
      totalDebit: roundMoney(entry.lines.reduce((sum, line) => sum + Number(line.debitAmount || 0), 0)),
      totalCredit: roundMoney(entry.lines.reduce((sum, line) => sum + Number(line.creditAmount || 0), 0)),
      linkedDocuments: copy(linkedDocuments)
    };
  }

  function findLinkedDocumentsForJournalEntry(entry, linkedDocuments) {
    return dedupeByKey(
      [
        ...(linkedDocuments.byJournalEntryId.get(entry.journalEntryId) || []),
        ...(linkedDocuments.bySourceObjectKey.get(`${entry.sourceType}:${entry.sourceId}`) || [])
      ],
      (item) => `${item.documentId}:${item.targetType}:${item.targetId}`
    ).sort((left, right) => left.linkedAt.localeCompare(right.linkedAt));
  }

  function flattenLinkedDocuments(linkedDocuments) {
    return dedupeByKey(
      [
        ...[...linkedDocuments.byJournalEntryId.values()].flat(),
        ...[...linkedDocuments.bySourceObjectKey.values()].flat()
      ],
      (item) => `${item.documentId}:${item.targetType}:${item.targetId}`
    );
  }

  function presentSearchEntry({ entry, linkedDocuments }) {
    return {
      journalEntryId: entry.journalEntryId,
      journalDate: entry.journalDate,
      voucherSeriesCode: entry.voucherSeriesCode,
      voucherNumber: entry.voucherNumber,
      status: entry.status,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      description: entry.description || null,
      totalDebit: roundMoney(entry.lines.reduce((sum, line) => sum + Number(line.debitAmount || 0), 0)),
      totalCredit: roundMoney(entry.lines.reduce((sum, line) => sum + Number(line.creditAmount || 0), 0)),
      lines: copy(entry.lines),
      linkedDocuments: findLinkedDocumentsForJournalEntry(entry, linkedDocuments)
    };
  }

  function normalizeLedgerAccountNumbers(ledgerAccountNumbers) {
    return [...new Set((Array.isArray(ledgerAccountNumbers) ? ledgerAccountNumbers : []).map((value) => requireText(String(value), "ledger_account_number_invalid")))].sort();
  }

  function normalizeDifferenceItems({ differenceItems, areaCode }) {
    return (Array.isArray(differenceItems) ? differenceItems : []).map((item, index) => {
      const resolvedState = assertAllowedValue(
        item?.state || "open",
        DIFFERENCE_ITEM_STATES,
        "reconciliation_difference_state_invalid"
      );
      return {
        reconciliationDifferenceItemId: item?.reconciliationDifferenceItemId || crypto.randomUUID(),
        state: resolvedState,
        reasonCode: requireText(item?.reasonCode || `${areaCode}_difference_${index + 1}`, "difference_reason_code_required"),
        amount: roundMoney(item?.amount || 0),
        ownerUserId: item?.ownerUserId || null,
        explanation: item?.explanation || null,
        waivedUntil: item?.waivedUntil ? normalizeDate(item.waivedUntil, "difference_waived_until_invalid") : null,
        createdAt: item?.createdAt || nowIso(),
        updatedAt: item?.updatedAt || nowIso()
      };
    });
  }

  function filterJournalEntries({ journalEntries, companyId, fromDate, toDate }) {
    return (journalEntries || [])
      .filter((entry) => entry.companyId === companyId)
      .filter((entry) => entry.status === "posted" || entry.status === "reversed")
      .filter((entry) => entry.journalDate >= fromDate && entry.journalDate <= toDate)
      .sort(sortJournalEntries);
  }

  function matchesDimensionFilters(entry, dimensionFilters) {
    const filterKeys = Object.entries(dimensionFilters || {}).filter(([, value]) => value !== null && value !== undefined && value !== "");
    if (filterKeys.length === 0) {
      return true;
    }
    return entry.lines.some((line) =>
      filterKeys.every(([key, value]) => String(line.dimensionJson?.[key] || "") === String(value))
    );
  }

  function matchesSearchQuery(entry, query) {
    if (typeof query !== "string" || query.trim().length === 0) {
      return true;
    }
    const normalizedQuery = query.trim().toLowerCase();
    return [entry.description, entry.sourceType, entry.sourceId, `${entry.voucherSeriesCode}${entry.voucherNumber}`]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedQuery));
  }

  function sortJournalEntries(left, right) {
    const dateComparison = left.journalDate.localeCompare(right.journalDate);
    if (dateComparison !== 0) {
      return dateComparison;
    }
    const seriesComparison = left.voucherSeriesCode.localeCompare(right.voucherSeriesCode);
    if (seriesComparison !== 0) {
      return seriesComparison;
    }
    return Number(left.voucherNumber) - Number(right.voucherNumber);
  }

  function pushAudit({ companyId, actorId, correlationId, action, entityType, entityId, explanation }) {
    state.auditEvents.push({
      auditEventId: crypto.randomUUID(),
      companyId,
      actorId,
      correlationId,
      action,
      entityType,
      entityId,
      explanation,
      recordedAt: nowIso()
    });
  }

  function nowIso() {
    return new Date(clock()).toISOString();
  }
}

function ensureCompanyCollection(map, companyId) {
  if (!map.has(companyId)) {
    map.set(companyId, []);
  }
  return map.get(companyId);
}

function ensureMapArray(map, key) {
  if (!map.has(key)) {
    map.set(key, []);
  }
  return map.get(key);
}

function createStatusTransition({ fromStatus = null, toStatus, actorId, reasonCode, changedAt }) {
  return {
    fromStatus,
    toStatus,
    actorId,
    reasonCode,
    changedAt
  };
}

function isResolvedDifferenceItem(item) {
  return item.state === "resolved" || item.state === "waived";
}

function dedupeByKey(items, keySelector) {
  const seen = new Set();
  const results = [];
  for (const item of items) {
    const key = keySelector(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    results.push(copy(item));
  }
  return results;
}

function assertAllowedValue(value, allowedValues, code) {
  const resolvedValue = requireText(value, code);
  if (!allowedValues.includes(resolvedValue)) {
    throw httpError(400, code, `${resolvedValue} is not allowed.`);
  }
  return resolvedValue;
}

function normalizeDate(value, code) {
  const resolvedValue = requireText(value, code);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolvedValue)) {
    throw httpError(400, code, `${resolvedValue} must be an ISO date (YYYY-MM-DD).`);
  }
  return resolvedValue;
}

function parseIsoDate(value) {
  const [year, month, day] = normalizeDate(value, "date_invalid").split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function requireText(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw httpError(400, code, `${code} is required.`);
  }
  return value.trim();
}

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function hashObject(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
