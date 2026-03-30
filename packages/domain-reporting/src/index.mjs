import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";
import { createLedgerEngine, REQUIRED_ENGINE_ACCOUNTS } from "../../domain-ledger/src/index.mjs";
import { createDocumentArchiveEngine } from "../../document-engine/src/index.mjs";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";

export const REPORT_CODES = Object.freeze([
  "trial_balance",
  "income_statement",
  "balance_sheet",
  "cashflow",
  "ar_open_items",
  "ap_open_items",
  "project_portfolio",
  "payroll_summary",
  "tax_account_summary",
  "submission_dashboard"
]);
export const REPORT_VIEW_MODES = Object.freeze(["transactions", "period", "rolling_12", "fiscal_year"]);
export const REPORT_EXPORT_FORMATS = Object.freeze(["excel", "pdf"]);
export const REPORT_EXPORT_JOB_STATES = Object.freeze([
  "queued",
  "running",
  "materialized",
  "delivered",
  "failed",
  "retry_pending",
  "superseded"
]);
export const REPORT_WATERMARK_MODES = Object.freeze(["none", "preliminary", "superseded"]);
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

const REPORT_DEFINITION_KINDS = Object.freeze(["official", "light_builder"]);
const REPORT_SOURCE_TYPES = Object.freeze([
  "ledger",
  "cashflow",
  "ar_open_items",
  "ap_open_items",
  "project_portfolio",
  "payroll_summary",
  "tax_account_summary",
  "submission_dashboard"
]);
const CASHFLOW_BUCKET_CODES = Object.freeze(["operating", "investing", "financing", "unclassified"]);
const CASHFLOW_BUCKET_LABELS = Object.freeze({
  operating: "Operating cashflow",
  investing: "Investing cashflow",
  financing: "Financing cashflow",
  unclassified: "Unclassified cashflow"
});
const REPORT_EXPORT_REQUEST_LIMIT = 10;
const REPORT_EXPORT_REQUEST_WINDOW_MS = 15 * 60 * 1000;

const REPORT_METRIC_DEFINITIONS = Object.freeze([
  createMetricDefinition("total_debit", "Total debit", "finance_manager", "journal_entry", "sum(journal_line.debit_amount)", ["ledger"]),
  createMetricDefinition("total_credit", "Total credit", "finance_manager", "journal_entry", "sum(journal_line.credit_amount)", ["ledger"]),
  createMetricDefinition("balance_amount", "Balance amount", "finance_manager", "journal_entry", "sum(debit-credit)", ["ledger"]),
  createMetricDefinition("pl_debit", "P&L debit", "finance_manager", "journal_entry", "sum(pl_account.debit_amount)", ["ledger"]),
  createMetricDefinition("pl_credit", "P&L credit", "finance_manager", "journal_entry", "sum(pl_account.credit_amount)", ["ledger"]),
  createMetricDefinition("pl_net_amount", "P&L net amount", "finance_manager", "journal_entry", "sum(pl_debit-pl_credit)", ["ledger"]),
  createMetricDefinition("bs_debit", "Balance sheet debit", "finance_manager", "journal_entry", "sum(bs_account.debit_amount)", ["ledger"]),
  createMetricDefinition("bs_credit", "Balance sheet credit", "finance_manager", "journal_entry", "sum(bs_account.credit_amount)", ["ledger"]),
  createMetricDefinition("bs_net_amount", "Balance sheet net amount", "finance_manager", "journal_entry", "sum(bs_debit-bs_credit)", ["ledger"]),
  createMetricDefinition("cash_inflow_amount", "Cash inflow", "finance_manager", "journal_entry", "sum(positive_cash_movements)", ["ledger"]),
  createMetricDefinition("cash_outflow_amount", "Cash outflow", "finance_manager", "journal_entry", "sum(abs(negative_cash_movements))", ["ledger"]),
  createMetricDefinition("net_cash_movement_amount", "Net cash movement", "finance_manager", "journal_entry", "sum(cash_inflow-cash_outflow)", ["ledger"]),
  createMetricDefinition("ar_open_amount", "AR open amount", "finance_manager", "ar_open_item", "sum(ar_open_item.open_amount)", ["ar"]),
  createMetricDefinition("ar_overdue_amount", "AR overdue amount", "finance_manager", "ar_open_item", "sum(ar_open_item.open_amount where due_on < cutoff)", ["ar"]),
  createMetricDefinition("ar_invoice_count", "AR invoice count", "finance_manager", "ar_open_item", "count(distinct ar_open_item.customer_invoice_id)", ["ar"]),
  createMetricDefinition("ap_open_amount", "AP open amount", "finance_manager", "ap_open_item", "sum(ap_open_item.open_amount)", ["ap"]),
  createMetricDefinition("ap_overdue_amount", "AP overdue amount", "finance_manager", "ap_open_item", "sum(ap_open_item.open_amount where due_on < cutoff)", ["ap"]),
  createMetricDefinition("ap_invoice_count", "AP invoice count", "finance_manager", "ap_open_item", "count(distinct ap_open_item.supplier_invoice_id)", ["ap"]),
  createMetricDefinition("project_actual_cost_amount", "Project actual cost", "project_controller", "project_snapshot", "project_cost_snapshot.actual_cost_amount", ["projects"]),
  createMetricDefinition("project_billed_revenue_amount", "Project billed revenue", "project_controller", "project_snapshot", "project_cost_snapshot.billed_revenue_amount", ["projects", "ar"]),
  createMetricDefinition("project_wip_amount", "Project WIP", "project_controller", "project_snapshot", "project_wip_snapshot.wip_amount", ["projects"]),
  createMetricDefinition("project_forecast_margin_amount", "Project forecast margin", "project_controller", "project_snapshot", "project_forecast_snapshot.forecast_margin_amount", ["projects"]),
  createMetricDefinition("payroll_gross_earnings_amount", "Payroll gross earnings", "payroll_controller", "pay_run", "sum(pay_run.payslip.totals.grossEarnings)", ["payroll"]),
  createMetricDefinition("payroll_gross_deductions_amount", "Payroll gross deductions", "payroll_controller", "pay_run", "sum(pay_run.payslip.totals.grossDeductions)", ["payroll"]),
  createMetricDefinition("payroll_preliminary_tax_amount", "Payroll preliminary tax", "payroll_controller", "pay_run", "sum(pay_run.payslip.totals.preliminaryTax)", ["payroll"]),
  createMetricDefinition("payroll_employer_contribution_amount", "Payroll employer contributions", "payroll_controller", "pay_run", "sum(pay_run.payslip.totals.employerContributionPreviewAmount)", ["payroll"]),
  createMetricDefinition("payroll_net_pay_amount", "Payroll net pay", "payroll_controller", "pay_run", "sum(pay_run.payslip.totals.netPay)", ["payroll"]),
  createMetricDefinition("payroll_vacation_liability_amount", "Payroll vacation liability", "payroll_controller", "vacation_liability_snapshot", "sum(vacation_liability_snapshot.totals.liabilityAmount)", ["payroll"]),
  createMetricDefinition("payroll_exception_count", "Payroll exception count", "payroll_controller", "pay_run", "count(pay_run.exceptionSummary.totalCount)", ["payroll"]),
  createMetricDefinition("payroll_agi_submission_count", "AGI submission count", "payroll_controller", "agi_submission", "count(agi_submission)", ["payroll"]),
  createMetricDefinition("payroll_run_count", "Payroll run count", "payroll_controller", "pay_run", "count(pay_run)", ["payroll"]),
  createMetricDefinition("tax_account_net_balance_amount", "Tax account net balance", "tax_operator", "tax_account_snapshot", "tax_account_snapshot.balance.netBalance", ["taxAccount"]),
  createMetricDefinition("tax_account_open_credit_amount", "Tax account open credit", "tax_operator", "tax_account_snapshot", "tax_account_snapshot.balance.openCreditAmount", ["taxAccount"]),
  createMetricDefinition("tax_account_open_settlement_amount", "Tax account open settlement", "tax_operator", "tax_account_snapshot", "tax_account_snapshot.balance.openSettlementAmount", ["taxAccount"]),
  createMetricDefinition("tax_account_open_difference_case_count", "Tax account open difference cases", "tax_operator", "tax_account_snapshot", "count(tax_account_snapshot.discrepancies where open)", ["taxAccount"]),
  createMetricDefinition("tax_account_event_count", "Tax account event count", "tax_operator", "tax_account_event", "count(tax_account_event)", ["taxAccount"]),
  createMetricDefinition("tax_account_import_batch_count", "Tax account import batch count", "tax_operator", "tax_account_import_batch", "count(tax_account_import_batch)", ["taxAccount"]),
  createMetricDefinition("submission_total_count", "Submission count", "compliance_operator", "authority_submission", "count(authority_submission)", ["integrations"]),
  createMetricDefinition("submission_accepted_count", "Accepted submissions", "compliance_operator", "authority_submission", "count(authority_submission where accepted)", ["integrations"]),
  createMetricDefinition("submission_failed_count", "Failed submissions", "compliance_operator", "authority_submission", "count(authority_submission where failed)", ["integrations"]),
  createMetricDefinition("submission_open_recovery_count", "Open submission recoveries", "compliance_operator", "submission_recovery", "count(submission_recovery where open)", ["integrations"]),
  createMetricDefinition("submission_open_action_count", "Open submission actions", "compliance_operator", "submission_action_queue_item", "count(submission_action_queue_item where open)", ["integrations"]),
  createMetricDefinition("submission_attempt_count", "Submission attempt count", "compliance_operator", "submission_attempt", "count(submission_attempt)", ["integrations"]),
  createMetricDefinition("submission_receipt_count", "Submission receipt count", "compliance_operator", "submission_receipt", "count(submission_receipt)", ["integrations"])
]);

const REPORT_DEFINITIONS = Object.freeze([
  {
    reportCode: "trial_balance",
    name: "Trial balance",
    purpose: "Account-level debit, credit and balance movements with report-to-journal-to-document drilldown.",
    versionNo: 1,
    definitionKind: "official",
    reportSourceType: "ledger",
    rowDimensionCode: "account",
    defaultViewMode: "period",
    allowedViewModes: ["transactions", "period", "rolling_12", "fiscal_year"],
    classFilter: ["1", "2", "3", "4", "5", "6", "7", "8"],
    drilldownMode: "journal_to_document",
    defaultFilters: {},
    metricCatalog: metricCatalog(["total_debit", "total_credit", "balance_amount"]),
    status: "active"
  },
  {
    reportCode: "income_statement",
    name: "Income statement",
    purpose: "Baseline revenue and cost report grouped by P&L accounts with deterministic drilldown.",
    versionNo: 1,
    definitionKind: "official",
    reportSourceType: "ledger",
    rowDimensionCode: "account",
    defaultViewMode: "period",
    allowedViewModes: ["transactions", "period", "rolling_12", "fiscal_year"],
    classFilter: ["3", "4", "5", "6", "7", "8"],
    drilldownMode: "journal_to_document",
    defaultFilters: {},
    metricCatalog: metricCatalog(["pl_debit", "pl_credit", "pl_net_amount"]),
    status: "active"
  },
  {
    reportCode: "balance_sheet",
    name: "Balance sheet",
    purpose: "Baseline balance sheet accounts with reproducible drilldown to voucher and document evidence.",
    versionNo: 1,
    definitionKind: "official",
    reportSourceType: "ledger",
    rowDimensionCode: "account",
    defaultViewMode: "period",
    allowedViewModes: ["transactions", "period", "rolling_12", "fiscal_year"],
    classFilter: ["1", "2"],
    drilldownMode: "journal_to_document",
    defaultFilters: {},
    metricCatalog: metricCatalog(["bs_debit", "bs_credit", "bs_net_amount"]),
    status: "active"
  },
  {
    reportCode: "cashflow",
    name: "Cashflow",
    purpose: "Deterministic cash movement report grouped by cashflow bucket with journal and document drilldown.",
    versionNo: 1,
    definitionKind: "official",
    reportSourceType: "cashflow",
    rowDimensionCode: "cashflow_bucket",
    defaultViewMode: "period",
    allowedViewModes: ["transactions", "period", "rolling_12", "fiscal_year"],
    classFilter: [],
    drilldownMode: "journal_to_document",
    defaultFilters: {},
    metricCatalog: metricCatalog(["cash_inflow_amount", "cash_outflow_amount", "net_cash_movement_amount"]),
    status: "active"
  },
  {
    reportCode: "ar_open_items",
    name: "AR open items",
    purpose: "Customer receivables report grouped by customer with deterministic open-amount and overdue drilldown.",
    versionNo: 1,
    definitionKind: "official",
    reportSourceType: "ar_open_items",
    rowDimensionCode: "customer",
    defaultViewMode: "period",
    allowedViewModes: ["transactions", "period", "rolling_12", "fiscal_year"],
    classFilter: [],
    drilldownMode: "journal_to_document",
    defaultFilters: {},
    metricCatalog: metricCatalog(["ar_open_amount", "ar_overdue_amount", "ar_invoice_count"]),
    status: "active"
  },
  {
    reportCode: "ap_open_items",
    name: "AP open items",
    purpose: "Supplier payables report grouped by supplier with deterministic open-amount and overdue drilldown.",
    versionNo: 1,
    definitionKind: "official",
    reportSourceType: "ap_open_items",
    rowDimensionCode: "supplier",
    defaultViewMode: "period",
    allowedViewModes: ["transactions", "period", "rolling_12", "fiscal_year"],
    classFilter: [],
    drilldownMode: "journal_to_document",
    defaultFilters: {},
    metricCatalog: metricCatalog(["ap_open_amount", "ap_overdue_amount", "ap_invoice_count"]),
    status: "active"
  },
  {
    reportCode: "project_portfolio",
    name: "Project portfolio",
    purpose: "Project-level cost, billed revenue, WIP and forecast margin report with snapshot drilldown.",
    versionNo: 1,
    definitionKind: "official",
    reportSourceType: "project_portfolio",
    rowDimensionCode: "project",
    defaultViewMode: "period",
    allowedViewModes: ["transactions", "period", "rolling_12", "fiscal_year"],
    classFilter: [],
    drilldownMode: "project_snapshot",
    defaultFilters: {},
    metricCatalog: metricCatalog([
      "project_actual_cost_amount",
      "project_billed_revenue_amount",
      "project_wip_amount",
      "project_forecast_margin_amount"
    ]),
    status: "active"
  },
  {
    reportCode: "payroll_summary",
    name: "Payroll summary",
    purpose: "Reporting-period payroll dashboard with pay runs, AGI readiness, exceptions and liability snapshots.",
    versionNo: 1,
    definitionKind: "official",
    reportSourceType: "payroll_summary",
    rowDimensionCode: "reporting_period",
    defaultViewMode: "period",
    allowedViewModes: ["period", "rolling_12", "fiscal_year"],
    classFilter: [],
    drilldownMode: "pay_run_snapshot",
    defaultFilters: {},
    metricCatalog: metricCatalog([
      "payroll_gross_earnings_amount",
      "payroll_gross_deductions_amount",
      "payroll_preliminary_tax_amount",
      "payroll_employer_contribution_amount",
      "payroll_net_pay_amount",
      "payroll_vacation_liability_amount",
      "payroll_exception_count",
      "payroll_agi_submission_count",
      "payroll_run_count"
    ]),
    status: "active"
  },
  {
    reportCode: "tax_account_summary",
    name: "Tax account summary",
    purpose: "Operational tax-account dashboard for balance, open settlement exposure and discrepancy pressure.",
    versionNo: 1,
    definitionKind: "official",
    reportSourceType: "tax_account_summary",
    rowDimensionCode: "summary_section",
    defaultViewMode: "period",
    allowedViewModes: ["period", "rolling_12", "fiscal_year"],
    classFilter: [],
    drilldownMode: "tax_account_snapshot",
    defaultFilters: {},
    metricCatalog: metricCatalog([
      "tax_account_net_balance_amount",
      "tax_account_open_credit_amount",
      "tax_account_open_settlement_amount",
      "tax_account_open_difference_case_count",
      "tax_account_event_count",
      "tax_account_import_batch_count"
    ]),
    status: "active"
  },
  {
    reportCode: "submission_dashboard",
    name: "Submission dashboard",
    purpose: "Compliance operations dashboard for regulated submissions, attempts, receipts and recovery pressure.",
    versionNo: 1,
    definitionKind: "official",
    reportSourceType: "submission_dashboard",
    rowDimensionCode: "submission_type",
    defaultViewMode: "period",
    allowedViewModes: ["period", "rolling_12", "fiscal_year"],
    classFilter: [],
    drilldownMode: "submission_operation",
    defaultFilters: {},
    metricCatalog: metricCatalog([
      "submission_total_count",
      "submission_accepted_count",
      "submission_failed_count",
      "submission_open_recovery_count",
      "submission_open_action_count",
      "submission_attempt_count",
      "submission_receipt_count"
    ]),
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
  documentArchivePlatform = null,
  arPlatform = null,
  apPlatform = null,
  projectsPlatform = null,
  payrollPlatform = null,
  taxAccountPlatform = null,
  integrationPlatform = null,
  securityRuntimePlatform = null
} = {}) {
  const ledger = ledgerPlatform || createLedgerEngine({ clock });
  const documents = documentPlatform || documentArchivePlatform || createDocumentArchiveEngine({ clock });
  const state = {
    reportDefinitions: new Map(),
    reportDefinitionIdsByCompany: new Map(),
    reportSnapshots: new Map(),
    reportSnapshotIdsByCompany: new Map(),
    reportExportJobs: new Map(),
    reportExportJobIdsByCompany: new Map(),
    reconciliationRuns: new Map(),
    reconciliationRunIdsByCompany: new Map(),
    reconciliationVersionCounters: new Map(),
    auditEvents: []
  };

  const engine = {
    reportCodes: REPORT_CODES,
    reportViewModes: REPORT_VIEW_MODES,
    reportExportFormats: REPORT_EXPORT_FORMATS,
    reportExportJobStates: REPORT_EXPORT_JOB_STATES,
    reportWatermarkModes: REPORT_WATERMARK_MODES,
    reconciliationAreaCodes: RECONCILIATION_AREA_CODES,
    reconciliationRunStates: RECONCILIATION_RUN_STATES,
    differenceItemStates: DIFFERENCE_ITEM_STATES,
    listMetricDefinitions,
    listReportDefinitions,
    createReportDefinition,
    runReportSnapshot,
    getReportSnapshot,
    getReportLineDrilldown,
    requestReportExportJob,
    listReportExportJobs,
    getReportExportJob,
    retryReportExportJob,
    searchJournalEntries,
    listSearchProjectionContracts,
    listSearchProjectionDocuments,
    createReconciliationRun,
    listReconciliationRuns,
    getReconciliationRun,
    signOffReconciliationRun,
    snapshotReporting
  };

  Object.defineProperty(engine, "__durableState", {
    value: state,
    enumerable: false
  });

  return engine;

  function consumeSecurityBudget(options = {}) {
    if (!securityRuntimePlatform?.consumeSecurityBudget) {
      return null;
    }
    return securityRuntimePlatform.consumeSecurityBudget(options);
  }

  function listMetricDefinitions({ companyId, reportCode = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    if (reportCode) {
      return copy(requireReportDefinition(resolvedCompanyId, reportCode).metricCatalog);
    }
    return REPORT_METRIC_DEFINITIONS.map((definition) => ({
      companyId: resolvedCompanyId,
      ...copy(definition)
    }));
  }

  function listReportDefinitions({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return listAllReportDefinitions(resolvedCompanyId).map(copy);
  }

  function createReportDefinition({
    companyId,
    baseReportCode,
    reportCode = null,
    name,
    purpose = null,
    metricCodes = [],
    defaultFilters = {},
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const baseDefinition = requireReportDefinition(resolvedCompanyId, baseReportCode);
    const resolvedActorId = requireText(actorId, "actor_id_required");
    if (baseDefinition.definitionKind !== "official") {
      throw httpError(409, "light_builder_base_invalid", "Light report builder must start from an official report.");
    }

    const selectedMetricCodes = dedupeStringValues(
      metricCodes.length > 0 ? metricCodes : baseDefinition.metricCatalog.map((metric) => metric.metricCode)
    );
    for (const metricCode of selectedMetricCodes) {
      if (!baseDefinition.metricCatalog.some((metric) => metric.metricCode === metricCode)) {
        throw httpError(400, "report_metric_not_allowed", `Metric ${metricCode} is not allowed for ${baseDefinition.reportCode}.`);
      }
    }

    const resolvedReportCode = normalizeReportCode(reportCode || `custom-${slugify(name)}`);
    const existingDefinitions = listAllReportDefinitions(resolvedCompanyId).filter(
      (candidate) => candidate.reportCode === resolvedReportCode
    );
    const versionNo = (existingDefinitions[existingDefinitions.length - 1]?.versionNo || 0) + 1;
    for (const definition of state.reportDefinitions.values()) {
      if (definition.companyId === resolvedCompanyId && definition.reportCode === resolvedReportCode && definition.status === "active") {
        definition.status = "superseded";
        definition.updatedAt = nowIso();
      }
    }

    const createdAt = nowIso();
    const definition = {
      reportDefinitionId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      reportCode: resolvedReportCode,
      baseReportCode: baseDefinition.reportCode,
      name: requireText(name, "report_name_required"),
      purpose: normalizeOptionalText(purpose) || `Light report built from ${baseDefinition.name}.`,
      versionNo,
      definitionKind: "light_builder",
      reportSourceType: baseDefinition.reportSourceType,
      rowDimensionCode: baseDefinition.rowDimensionCode,
      defaultViewMode: baseDefinition.defaultViewMode,
      allowedViewModes: copy(baseDefinition.allowedViewModes),
      classFilter: copy(baseDefinition.classFilter || []),
      drilldownMode: baseDefinition.drilldownMode,
      defaultFilters: copy(normalizePlainObject(defaultFilters, "report_default_filters_invalid")),
      metricCatalog: metricCatalog(selectedMetricCodes),
      status: "active",
      createdByActorId: resolvedActorId,
      createdAt,
      updatedAt: createdAt
    };

    state.reportDefinitions.set(definition.reportDefinitionId, definition);
    ensureCompanyCollection(state.reportDefinitionIdsByCompany, resolvedCompanyId).push(definition.reportDefinitionId);
    pushAudit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: "reporting.report_definition.created",
      entityType: "report_definition",
      entityId: definition.reportDefinitionId,
      explanation: `Created light report definition ${definition.reportCode} version ${definition.versionNo}.`
    });

    return copy(definition);
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
    const definition = requireReportDefinition(resolvedCompanyId, reportCode);
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
    const resolvedFilters = mergeFilterObjects(definition.defaultFilters || {}, filters);
    const { lines, totals, sourceSnapshotPayload } = buildReportLines({
      companyId: resolvedCompanyId,
      definition,
      accounts: ledgerSnapshot.accounts,
      entries,
      linkedDocuments,
      filters: resolvedFilters,
      window,
      actorId: resolvedActorId,
      ledgerSnapshot
    });
    const now = nowIso();
    const sourceSnapshotHash = hashObject(sourceSnapshotPayload);
    const snapshot = {
      reportSnapshotId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      reportDefinitionId: definition.reportDefinitionId || null,
      reportCode: definition.reportCode,
      reportName: definition.name,
      reportVersionNo: definition.versionNo,
      reportDefinitionKind: definition.definitionKind,
      reportSourceType: definition.reportSourceType,
      rowDimensionCode: definition.rowDimensionCode,
      reportDefinition: copy(definition),
      metricCatalog: copy(definition.metricCatalog),
      viewMode: window.viewMode,
      accountingPeriodId: window.accountingPeriodId,
      fromDate: window.fromDate,
      toDate: window.toDate,
      periodStatus: window.periodStatus,
      filters: copy(resolvedFilters),
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
          metricValues: line.metricValues,
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

  function requestReportExportJob({
    companyId,
    reportSnapshotId,
    format,
    watermarkMode = null,
    actorId = "system",
    requestIp = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const snapshot = requireReportSnapshot(resolvedCompanyId, reportSnapshotId);
    const resolvedActorId = requireText(actorId, "actor_id_required");
    consumeSecurityBudget({
      companyId: resolvedCompanyId,
      budgetCode: "report_export_request_actor",
      subjectKey: `user:${resolvedActorId}`,
      subjectType: "user",
      subjectId: resolvedActorId,
      actorId: resolvedActorId,
      ipAddress: normalizeOptionalText(requestIp),
      limit: REPORT_EXPORT_REQUEST_LIMIT,
      windowMs: REPORT_EXPORT_REQUEST_WINDOW_MS,
      lockoutMs: REPORT_EXPORT_REQUEST_WINDOW_MS,
      errorCode: "report_export_rate_limited",
      errorMessage: "Too many report exports were requested in a short time. Try again later.",
      alertCode: "report_export_mass_request",
      alertSeverity: "high",
      riskScore: 20,
      metadata: {
        reportCode: snapshot.reportCode
      }
    });
    const resolvedFormat = assertAllowedValue(format, REPORT_EXPORT_FORMATS, "report_export_format_invalid");
    const resolvedWatermarkMode = resolveWatermarkMode(snapshot, watermarkMode);
    const createdAt = nowIso();
    const job = {
      reportExportJobId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      reportSnapshotId: snapshot.reportSnapshotId,
      reportCode: snapshot.reportCode,
      reportVersionNo: snapshot.reportVersionNo,
      format: resolvedFormat,
      watermarkMode: resolvedWatermarkMode,
      requestedByActorId: resolvedActorId,
      status: "queued",
      artifactRef: null,
      artifactName: null,
      artifactContentType: null,
      artifactContent: null,
      contentHash: null,
      supersededByExportJobId: null,
      createdAt,
      updatedAt: createdAt,
      completedAt: null,
      failedAt: null,
      statusHistory: [createStatusTransition({ toStatus: "queued", actorId: resolvedActorId, reasonCode: "export_requested", changedAt: createdAt })]
    };
    state.reportExportJobs.set(job.reportExportJobId, job);
    ensureCompanyCollection(state.reportExportJobIdsByCompany, resolvedCompanyId).push(job.reportExportJobId);
    pushAudit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: "reporting.export_job.requested",
      entityType: "report_export_job",
      entityId: job.reportExportJobId,
      explanation: `Requested ${resolvedFormat} export for snapshot ${snapshot.reportSnapshotId}.`
    });

    processQueuedReportExportJobs({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      onlyJobId: job.reportExportJobId
    });
    return copy(state.reportExportJobs.get(job.reportExportJobId));
  }

  function listReportExportJobs({ companyId, reportSnapshotId = null, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = normalizeOptionalText(status);
    return (state.reportExportJobIdsByCompany.get(resolvedCompanyId) || [])
      .map((reportExportJobId) => state.reportExportJobs.get(reportExportJobId))
      .filter(Boolean)
      .filter((job) => (reportSnapshotId ? job.reportSnapshotId === reportSnapshotId : true))
      .filter((job) => (resolvedStatus ? job.status === resolvedStatus : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.reportExportJobId.localeCompare(right.reportExportJobId))
      .map(copy);
  }

  function getReportExportJob({ companyId, reportExportJobId } = {}) {
    return copy(requireReportExportJob(requireText(companyId, "company_id_required"), reportExportJobId));
  }

  function retryReportExportJob({
    companyId,
    reportExportJobId,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const job = requireReportExportJob(requireText(companyId, "company_id_required"), reportExportJobId);
    const resolvedActorId = requireText(actorId, "actor_id_required");
    if (!["failed", "retry_pending"].includes(job.status)) {
      throw httpError(409, "report_export_retry_invalid", "Only failed export jobs can be retried.");
    }
    const changedAt = nowIso();
    job.status = "retry_pending";
    job.updatedAt = changedAt;
    job.failedAt = null;
    job.statusHistory.push(
      createStatusTransition({
        fromStatus: "failed",
        toStatus: "retry_pending",
        actorId: resolvedActorId,
        reasonCode: "retry_requested",
        changedAt
      })
    );
    processQueuedReportExportJobs({
      companyId: job.companyId,
      actorId: resolvedActorId,
      correlationId,
      onlyJobId: job.reportExportJobId
    });
    return copy(job);
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
      reportDefinitions: [...state.reportDefinitions.values()],
      reportSnapshots: [...state.reportSnapshots.values()],
      reportExportJobs: [...state.reportExportJobs.values()],
      metricDefinitions: REPORT_METRIC_DEFINITIONS,
      reconciliationRuns: [...state.reconciliationRuns.values()],
      auditEvents: state.auditEvents
    });
  }

  function listSearchProjectionContracts({ companyId } = {}) {
    requireText(companyId, "company_id_required");
    return copy([
      {
        projectionCode: "reporting.report_definition",
        objectType: "report_definition",
        sourceDomainCode: "reporting",
        displayName: "Report definitions",
        projectionVersionNo: 1,
        visibilityScope: "company",
        supportsGlobalSearch: true,
        supportsSavedViews: true,
        surfaceCodes: ["desktop.search", "desktop.reporting"],
        filterFieldCodes: ["reportCode", "definitionKind", "reportSourceType", "status"]
      },
      {
        projectionCode: "reporting.report_snapshot",
        objectType: "report_snapshot",
        sourceDomainCode: "reporting",
        displayName: "Report snapshots",
        projectionVersionNo: 1,
        visibilityScope: "company",
        supportsGlobalSearch: true,
        supportsSavedViews: true,
        surfaceCodes: ["desktop.search", "desktop.reporting"],
        filterFieldCodes: ["reportCode", "viewMode", "periodStatus"]
      },
      {
        projectionCode: "reporting.report_export_job",
        objectType: "report_export_job",
        sourceDomainCode: "reporting",
        displayName: "Report exports",
        projectionVersionNo: 1,
        visibilityScope: "company",
        supportsGlobalSearch: true,
        supportsSavedViews: false,
        surfaceCodes: ["desktop.search", "desktop.reporting"],
        filterFieldCodes: ["reportCode", "format", "status"]
      },
      {
        projectionCode: "reporting.reconciliation_run",
        objectType: "reconciliation_run",
        sourceDomainCode: "reporting",
        displayName: "Reconciliation runs",
        projectionVersionNo: 1,
        visibilityScope: "company",
        supportsGlobalSearch: true,
        supportsSavedViews: true,
        surfaceCodes: ["desktop.search", "desktop.reporting"],
        filterFieldCodes: ["areaCode", "accountingPeriodId", "status"]
      },
      {
        projectionCode: "reporting.journal_entry",
        objectType: "journal_entry",
        sourceDomainCode: "reporting",
        displayName: "Journal entries",
        projectionVersionNo: 1,
        visibilityScope: "company",
        supportsGlobalSearch: true,
        supportsSavedViews: true,
        surfaceCodes: ["desktop.search", "desktop.reporting"],
        filterFieldCodes: ["voucherSeriesCode", "sourceType", "status"]
      }
    ]);
  }

  function listSearchProjectionDocuments({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const definitions = listAllReportDefinitions(resolvedCompanyId).map((definition) => ({
      projectionCode: "reporting.report_definition",
      objectId: definition.reportDefinitionId || `${definition.reportCode}:v${definition.versionNo}`,
      displayTitle: definition.name,
      displaySubtitle: `${definition.reportCode} v${definition.versionNo}`,
      documentStatus: definition.status,
      searchText: [definition.name, definition.purpose, definition.reportCode, definition.definitionKind, definition.reportSourceType, definition.rowDimensionCode, ...(definition.metricCatalog || []).map((metric) => metric.metricCode)].filter(Boolean).join(" "),
      filterPayload: {
        reportCode: definition.reportCode,
        definitionKind: definition.definitionKind,
        reportSourceType: definition.reportSourceType,
        status: definition.status
      },
      sourceVersion: `${definition.reportCode}:v${definition.versionNo}`,
      sourceUpdatedAt: definition.updatedAt || definition.createdAt || nowIso()
    }));
    const snapshots = [...state.reportSnapshots.values()]
      .filter((snapshot) => snapshot.companyId === resolvedCompanyId)
      .map((snapshot) => ({
        projectionCode: "reporting.report_snapshot",
        objectId: snapshot.reportSnapshotId,
        displayTitle: snapshot.reportName,
        displaySubtitle: `${snapshot.reportCode} ${snapshot.fromDate}..${snapshot.toDate}`,
        documentStatus: snapshot.periodStatus,
        searchText: [snapshot.reportName, snapshot.reportCode, snapshot.viewMode, snapshot.fromDate, snapshot.toDate, snapshot.reportDefinitionKind, snapshot.rowDimensionCode, snapshot.generatedByActorId].filter(Boolean).join(" "),
        filterPayload: {
          reportCode: snapshot.reportCode,
          viewMode: snapshot.viewMode,
          periodStatus: snapshot.periodStatus
        },
        sourceVersion: snapshot.contentHash,
        sourceUpdatedAt: snapshot.generatedAt
      }));
    const exportJobs = [...state.reportExportJobs.values()]
      .filter((job) => job.companyId === resolvedCompanyId)
      .map((job) => ({
        projectionCode: "reporting.report_export_job",
        objectId: job.reportExportJobId,
        displayTitle: `${job.reportCode} export`,
        displaySubtitle: `${job.format} ${job.status}`,
        documentStatus: job.status,
        searchText: [job.reportCode, job.format, job.status, job.watermarkMode, job.artifactName].filter(Boolean).join(" "),
        filterPayload: {
          reportCode: job.reportCode,
          format: job.format,
          status: job.status
        },
        sourceVersion: job.contentHash || `${job.reportExportJobId}:${job.updatedAt}`,
        sourceUpdatedAt: job.updatedAt
      }));
    const reconciliations = [...state.reconciliationRuns.values()]
      .filter((run) => run.companyId === resolvedCompanyId)
      .map((run) => ({
        projectionCode: "reporting.reconciliation_run",
        objectId: run.reconciliationRunId,
        displayTitle: `${run.areaCode} reconciliation`,
        displaySubtitle: `${run.accountingPeriodId} ${run.status}`,
        documentStatus: run.status,
        searchText: [run.areaCode, run.accountingPeriodId, run.status, run.cutoffDate, run.ownerUserId].filter(Boolean).join(" "),
        filterPayload: {
          areaCode: run.areaCode,
          accountingPeriodId: run.accountingPeriodId,
          status: run.status
        },
        sourceVersion: run.snapshotHash,
        sourceUpdatedAt: run.updatedAt
      }));
    const journalEntries = searchJournalEntries({ companyId: resolvedCompanyId }).items.map((entry) => ({
      projectionCode: "reporting.journal_entry",
      objectId: entry.journalEntryId,
      displayTitle: `${entry.voucherSeriesCode}${entry.voucherNumber}`,
      displaySubtitle: entry.description || entry.sourceType,
      documentStatus: entry.status,
      searchText: [entry.description, entry.sourceType, entry.sourceId, entry.voucherSeriesCode, String(entry.voucherNumber), entry.journalDate].filter(Boolean).join(" "),
      filterPayload: {
        voucherSeriesCode: entry.voucherSeriesCode,
        sourceType: entry.sourceType,
        status: entry.status
      },
      sourceVersion: hashObject(entry),
      sourceUpdatedAt: entry.journalDate
    }));
    return copy([...definitions, ...snapshots, ...exportJobs, ...reconciliations, ...journalEntries]);
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

  function requireReportExportJob(companyId, reportExportJobId) {
    const job = state.reportExportJobs.get(requireText(reportExportJobId, "report_export_job_id_required"));
    if (!job || job.companyId !== companyId) {
      throw httpError(404, "report_export_job_not_found", "Report export job was not found.");
    }
    return job;
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

  function listAllReportDefinitions(companyId) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const officialDefinitions = REPORT_DEFINITIONS.map((definition) => ({
      companyId: resolvedCompanyId,
      reportDefinitionId: null,
      baseReportCode: definition.baseReportCode || null,
      createdByActorId: "system",
      createdAt: null,
      updatedAt: null,
      ...copy(definition)
    }));
    const customDefinitions = (state.reportDefinitionIdsByCompany.get(resolvedCompanyId) || [])
      .map((reportDefinitionId) => state.reportDefinitions.get(reportDefinitionId))
      .filter(Boolean)
      .map(copy);
    return [...officialDefinitions, ...customDefinitions].sort(
      (left, right) =>
        left.reportCode.localeCompare(right.reportCode) ||
        Number(left.versionNo || 0) - Number(right.versionNo || 0)
    );
  }

  function requireReportDefinition(companyId, reportCode) {
    const resolvedReportCode = requireText(reportCode, "report_code_required");
    const definition = listAllReportDefinitions(companyId)
      .filter((candidate) => candidate.reportCode === resolvedReportCode)
      .sort((left, right) => Number(right.versionNo || 0) - Number(left.versionNo || 0))
      .find((candidate) => candidate.status === "active")
      || listAllReportDefinitions(companyId)
        .filter((candidate) => candidate.reportCode === resolvedReportCode)
        .sort((left, right) => Number(right.versionNo || 0) - Number(left.versionNo || 0))[0];
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

  function buildReportLines({ companyId, definition, accounts, entries, linkedDocuments, filters, window, actorId, ledgerSnapshot }) {
    if (definition.reportSourceType === "ledger") {
      return buildLedgerReportLines({ definition, accounts, entries, linkedDocuments, filters });
    }
    if (definition.reportSourceType === "cashflow") {
      return buildCashflowReportLines({ definition, accounts, entries, linkedDocuments, filters });
    }
    if (definition.reportSourceType === "ar_open_items") {
      return buildArReportLines({
        companyId,
        definition,
        filters,
        window,
        linkedDocuments,
        ledgerSnapshot
      });
    }
    if (definition.reportSourceType === "ap_open_items") {
      return buildApReportLines({
        companyId,
        definition,
        filters,
        window,
        linkedDocuments,
        ledgerSnapshot
      });
    }
    if (definition.reportSourceType === "project_portfolio") {
      return buildProjectReportLines({
        companyId,
        definition,
        filters,
        window,
        actorId
      });
    }
    if (definition.reportSourceType === "payroll_summary") {
      return buildPayrollReportLines({
        companyId,
        definition,
        filters,
        window
      });
    }
    if (definition.reportSourceType === "tax_account_summary") {
      return buildTaxAccountReportLines({
        companyId,
        definition,
        filters,
        window
      });
    }
    if (definition.reportSourceType === "submission_dashboard") {
      return buildSubmissionDashboardReportLines({
        companyId,
        definition,
        filters,
        window
      });
    }
    throw httpError(500, "report_source_type_invalid", `Unsupported report source ${definition.reportSourceType}.`);
  }

  function buildLedgerReportLines({ definition, accounts, entries, linkedDocuments, filters }) {
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
          grouped.set(key, createReportLineBucket({
            lineKey: key,
            lineType: "ledger_account",
            accountNumber: account.accountNumber,
            accountName: account.accountName,
            accountClass: account.accountClass,
            displayName: `${account.accountNumber} ${account.accountName}`,
            sectionCode: definition.reportCode
          }));
        }
        const bucket = grouped.get(key);
        bucket.totalDebit = roundMoney(bucket.totalDebit + Number(line.debitAmount || 0));
        bucket.totalCredit = roundMoney(bucket.totalCredit + Number(line.creditAmount || 0));
        bucket.balanceAmount = roundMoney(bucket.totalDebit - bucket.totalCredit);
        bucket.metricValues = {
          total_debit: bucket.totalDebit,
          total_credit: bucket.totalCredit,
          balance_amount: bucket.balanceAmount,
          ...(definition.reportCode === "income_statement"
            ? {
                pl_debit: bucket.totalDebit,
                pl_credit: bucket.totalCredit,
                pl_net_amount: bucket.balanceAmount
              }
            : {}),
          ...(definition.reportCode === "balance_sheet"
            ? {
                bs_debit: bucket.totalDebit,
                bs_credit: bucket.totalCredit,
                bs_net_amount: bucket.balanceAmount
              }
            : {})
        };
        pushUniqueDrilldownEntry(bucket, drilldownEntry);
      }
    }

    const lines = finalizeReportLines({
      lines: [...grouped.values()],
      sortKeySelector: (line) => `${line.accountNumber || ""}:${line.lineKey}`
    });
    return {
      lines,
      totals: buildReportTotals(lines),
      sourceSnapshotPayload: {
        sourceType: "ledger",
        reportCode: definition.reportCode,
        filters,
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
      }
    };
  }

  function buildCashflowReportLines({ definition, accounts, entries, linkedDocuments, filters }) {
    const accountMap = new Map((accounts || []).map((account) => [account.accountNumber, account]));
    const bankAccountNumbers = new Set(REQUIRED_ENGINE_ACCOUNTS.bank.map((accountNumber) => String(accountNumber)));
    const grouped = new Map();

    for (const entry of entries) {
      const cashDelta = roundMoney(
        entry.lines
          .filter((line) => bankAccountNumbers.has(String(line.accountNumber)))
          .reduce((sum, line) => sum + Number(line.debitAmount || 0) - Number(line.creditAmount || 0), 0)
      );
      if (cashDelta === 0) {
        continue;
      }
      const bucketCode = classifyCashflowBucket({ entry, accountMap, bankAccountNumbers });
      if (Array.isArray(filters.bucketCodes) && filters.bucketCodes.length > 0 && !filters.bucketCodes.includes(bucketCode)) {
        continue;
      }
      if (!grouped.has(bucketCode)) {
        grouped.set(
          bucketCode,
          createReportLineBucket({
            lineKey: bucketCode,
            lineType: "cashflow_bucket",
            accountNumber: bucketCode,
            accountName: CASHFLOW_BUCKET_LABELS[bucketCode],
            accountClass: "cashflow",
            displayName: CASHFLOW_BUCKET_LABELS[bucketCode],
            sectionCode: definition.reportCode
          })
        );
      }
      const bucket = grouped.get(bucketCode);
      const inflow = cashDelta > 0 ? cashDelta : 0;
      const outflow = cashDelta < 0 ? Math.abs(cashDelta) : 0;
      bucket.totalDebit = roundMoney(bucket.totalDebit + inflow);
      bucket.totalCredit = roundMoney(bucket.totalCredit + outflow);
      bucket.balanceAmount = roundMoney(bucket.totalDebit - bucket.totalCredit);
      bucket.metricValues = {
        cash_inflow_amount: bucket.totalDebit,
        cash_outflow_amount: bucket.totalCredit,
        net_cash_movement_amount: bucket.balanceAmount
      };
      pushUniqueDrilldownEntry(
        bucket,
        buildJournalDrilldownEntry({
          entry,
          linkedDocuments: findLinkedDocumentsForJournalEntry(entry, linkedDocuments)
        })
      );
    }

    const lines = finalizeReportLines({
      lines: [...grouped.values()],
      sortKeySelector: (line) => `${CASHFLOW_BUCKET_CODES.indexOf(line.lineKey)}:${line.lineKey}`
    });
    return {
      lines,
      totals: buildReportTotals(lines),
      sourceSnapshotPayload: {
        sourceType: "cashflow",
        filters,
        entryIds: entries.map((entry) => entry.journalEntryId),
        bankAccountNumbers: [...bankAccountNumbers]
      }
    };
  }

  function buildArReportLines({ companyId, definition, filters, window, linkedDocuments, ledgerSnapshot }) {
    if (!arPlatform || typeof arPlatform.snapshotAr !== "function") {
      throw httpError(500, "ar_platform_missing", "AR platform is required for AR reporting.");
    }
    const arSnapshot = arPlatform.snapshotAr();
    const customerMap = new Map(
      (arSnapshot.customers || [])
        .filter((customer) => customer.companyId === companyId)
        .map((customer) => [customer.customerId, customer])
    );
    const invoiceMap = new Map(
      (arSnapshot.invoices || [])
        .filter((invoice) => invoice.companyId === companyId)
        .map((invoice) => [invoice.customerInvoiceId, invoice])
    );
    const journalEntryMap = new Map(
      (ledgerSnapshot?.journalEntries || [])
        .filter((entry) => entry.companyId === companyId)
        .map((entry) => [entry.journalEntryId, entry])
    );
    const grouped = new Map();
    for (const openItem of (arSnapshot.openItems || []).filter((item) => item.companyId === companyId)) {
      if ((openItem.openedOn || "0000-00-00") > window.toDate) {
        continue;
      }
      if (Number(openItem.openAmount || 0) <= 0 || openItem.status === "reversed") {
        continue;
      }
      if (Array.isArray(filters.customerIds) && filters.customerIds.length > 0 && !filters.customerIds.includes(openItem.customerId)) {
        continue;
      }
      const customer = customerMap.get(openItem.customerId);
      const invoice = invoiceMap.get(openItem.customerInvoiceId);
      const lineKey = customer?.customerNo || openItem.customerId;
      if (!grouped.has(lineKey)) {
        grouped.set(
          lineKey,
          createReportLineBucket({
            lineKey,
            lineType: "customer_open_item",
            accountNumber: customer?.customerNo || openItem.customerId,
            accountName: customer?.legalName || `Customer ${openItem.customerId}`,
            accountClass: "ar",
            displayName: customer?.legalName || `Customer ${openItem.customerId}`,
            sectionCode: definition.reportCode
          })
        );
      }
      const bucket = grouped.get(lineKey);
      const openAmount = roundMoney(openItem.openAmount);
      const overdueAmount = openItem.dueOn && openItem.dueOn < window.toDate ? openAmount : 0;
      bucket.totalDebit = roundMoney(bucket.totalDebit + openAmount);
      bucket.balanceAmount = roundMoney(bucket.balanceAmount + openAmount);
      bucket.metricValues = {
        ar_open_amount: bucket.balanceAmount,
        ar_overdue_amount: roundMoney(Number(bucket.metricValues.ar_overdue_amount || 0) + overdueAmount),
        ar_invoice_count: Number(bucket.metricValues.ar_invoice_count || 0) + 1
      };
      const linkedForInvoice = invoice
        ? dedupeByKey(
            [
              ...(linkedDocuments.bySourceObjectKey.get(`ar_invoice:${invoice.customerInvoiceId}`) || []),
              ...(linkedDocuments.bySourceObjectKey.get(`customer_invoice:${invoice.customerInvoiceId}`) || [])
            ],
            (item) => `${item.documentId}:${item.targetType}:${item.targetId}`
          )
        : [];
      const journalEntry = invoice?.journalEntryId ? journalEntryMap.get(invoice.journalEntryId) : null;
      const drilldownEntry = journalEntry
        ? buildJournalDrilldownEntry({
            entry: journalEntry,
            linkedDocuments: dedupeByKey(
              [...findLinkedDocumentsForJournalEntry(journalEntry, linkedDocuments), ...linkedForInvoice],
              (item) => `${item.documentId}:${item.targetType}:${item.targetId}`
            )
          })
        : createSyntheticDrilldownEntry({
            journalEntryId: `ar-open-item:${openItem.arOpenItemId}`,
            journalDate: invoice?.issueDate || openItem.openedOn || window.toDate,
            sourceType: "AR_OPEN_ITEM",
            sourceId: openItem.arOpenItemId,
            description: invoice?.invoiceNumber || openItem.arOpenItemId,
            totalDebit: openAmount,
            totalCredit: 0,
            linkedDocuments: linkedForInvoice
          });
      pushUniqueDrilldownEntry(bucket, drilldownEntry);
    }

    const lines = finalizeReportLines({
      lines: [...grouped.values()],
      sortKeySelector: (line) => `${line.accountNumber || ""}:${line.lineKey}`
    });
    return {
      lines,
      totals: buildReportTotals(lines),
      sourceSnapshotPayload: {
        sourceType: "ar_open_items",
        filters,
        openItems: (arSnapshot.openItems || [])
          .filter((item) => item.companyId === companyId)
          .map((item) => ({
            arOpenItemId: item.arOpenItemId,
            customerId: item.customerId,
            customerInvoiceId: item.customerInvoiceId,
            openAmount: item.openAmount,
            dueOn: item.dueOn,
            updatedAt: item.updatedAt
          }))
      }
    };
  }

  function buildApReportLines({ companyId, definition, filters, window, linkedDocuments, ledgerSnapshot }) {
    if (!apPlatform || typeof apPlatform.snapshotAp !== "function") {
      throw httpError(500, "ap_platform_missing", "AP platform is required for AP reporting.");
    }
    const apSnapshot = apPlatform.snapshotAp();
    const supplierMap = new Map(
      (apSnapshot.suppliers || [])
        .filter((supplier) => supplier.companyId === companyId)
        .map((supplier) => [supplier.supplierId, supplier])
    );
    const invoiceMap = new Map(
      (apSnapshot.supplierInvoices || [])
        .filter((invoice) => invoice.companyId === companyId)
        .map((invoice) => [invoice.supplierInvoiceId, invoice])
    );
    const journalEntryMap = new Map(
      (ledgerSnapshot?.journalEntries || [])
        .filter((entry) => entry.companyId === companyId)
        .map((entry) => [entry.journalEntryId, entry])
    );
    const grouped = new Map();
    for (const openItem of (apSnapshot.apOpenItems || []).filter((item) => item.companyId === companyId)) {
      if (Number(openItem.openAmount || 0) <= 0) {
        continue;
      }
      const invoice = invoiceMap.get(openItem.supplierInvoiceId);
      const supplier = invoice ? supplierMap.get(invoice.supplierId) : null;
      if (Array.isArray(filters.supplierIds) && filters.supplierIds.length > 0 && (!supplier || !filters.supplierIds.includes(supplier.supplierId))) {
        continue;
      }
      const lineKey = supplier?.supplierNo || openItem.supplierInvoiceId;
      if (!grouped.has(lineKey)) {
        grouped.set(
          lineKey,
          createReportLineBucket({
            lineKey,
            lineType: "supplier_open_item",
            accountNumber: supplier?.supplierNo || openItem.supplierInvoiceId,
            accountName: supplier?.legalName || `Supplier ${openItem.supplierInvoiceId}`,
            accountClass: "ap",
            displayName: supplier?.legalName || `Supplier ${openItem.supplierInvoiceId}`,
            sectionCode: definition.reportCode
          })
        );
      }
      const bucket = grouped.get(lineKey);
      const openAmount = roundMoney(openItem.openAmount);
      const overdueAmount = openItem.dueOn && openItem.dueOn < window.toDate ? openAmount : 0;
      bucket.totalDebit = roundMoney(bucket.totalDebit + openAmount);
      bucket.balanceAmount = roundMoney(bucket.balanceAmount + openAmount);
      bucket.metricValues = {
        ap_open_amount: bucket.balanceAmount,
        ap_overdue_amount: roundMoney(Number(bucket.metricValues.ap_overdue_amount || 0) + overdueAmount),
        ap_invoice_count: Number(bucket.metricValues.ap_invoice_count || 0) + 1
      };
      const linkedForInvoice = invoice?.documentId
        ? dedupeByKey(
            [
              ...(linkedDocuments.bySourceObjectKey.get(`ap_supplier_invoice:${invoice.supplierInvoiceId}`) || []),
              ...(linkedDocuments.bySourceObjectKey.get(`document:${invoice.documentId}`) || [])
            ],
            (item) => `${item.documentId}:${item.targetType}:${item.targetId}`
          )
        : dedupeByKey(
            linkedDocuments.bySourceObjectKey.get(`ap_supplier_invoice:${openItem.supplierInvoiceId}`) || [],
            (item) => `${item.documentId}:${item.targetType}:${item.targetId}`
          );
      const journalEntry = openItem.journalEntryId ? journalEntryMap.get(openItem.journalEntryId) : null;
      const drilldownEntry = journalEntry
        ? buildJournalDrilldownEntry({
            entry: journalEntry,
            linkedDocuments: dedupeByKey(
              [...findLinkedDocumentsForJournalEntry(journalEntry, linkedDocuments), ...linkedForInvoice],
              (item) => `${item.documentId}:${item.targetType}:${item.targetId}`
            )
          })
        : createSyntheticDrilldownEntry({
            journalEntryId: `ap-open-item:${openItem.apOpenItemId}`,
            journalDate: invoice?.invoiceDate || openItem.dueOn || window.toDate,
            sourceType: "AP_OPEN_ITEM",
            sourceId: openItem.apOpenItemId,
            description: invoice?.externalInvoiceRef || openItem.apOpenItemId,
            totalDebit: openAmount,
            totalCredit: 0,
            linkedDocuments: linkedForInvoice
          });
      pushUniqueDrilldownEntry(bucket, drilldownEntry);
    }

    const lines = finalizeReportLines({
      lines: [...grouped.values()],
      sortKeySelector: (line) => `${line.accountNumber || ""}:${line.lineKey}`
    });
    return {
      lines,
      totals: buildReportTotals(lines),
      sourceSnapshotPayload: {
        sourceType: "ap_open_items",
        filters,
        openItems: (apSnapshot.apOpenItems || [])
          .filter((item) => item.companyId === companyId)
          .map((item) => ({
            apOpenItemId: item.apOpenItemId,
            supplierInvoiceId: item.supplierInvoiceId,
            openAmount: item.openAmount,
            dueOn: item.dueOn,
            updatedAt: item.updatedAt
          }))
      }
    };
  }

  function buildProjectReportLines({ companyId, definition, filters, window, actorId }) {
    if (!projectsPlatform) {
      throw httpError(500, "projects_platform_missing", "Projects platform is required for project reporting.");
    }
    const projects = projectsPlatform.listProjects({ companyId }).filter((project) => project.status !== "archived");
    const requestedProjectIds = new Set(Array.isArray(filters.projectIds) ? filters.projectIds : []);
    const lines = [];

    for (const project of projects) {
      if (requestedProjectIds.size > 0 && !requestedProjectIds.has(project.projectId)) {
        continue;
      }
      const costSnapshot = projectsPlatform.materializeProjectCostSnapshot({
        companyId,
        projectId: project.projectId,
        cutoffDate: window.toDate,
        actorId
      });
      const wipSnapshot = projectsPlatform.materializeProjectWipSnapshot({
        companyId,
        projectId: project.projectId,
        cutoffDate: window.toDate,
        actorId
      });
      const forecastSnapshot = projectsPlatform.materializeProjectForecastSnapshot({
        companyId,
        projectId: project.projectId,
        cutoffDate: window.toDate,
        actorId
      });
      lines.push(
        finalizeReportLine(
          {
            ...createReportLineBucket({
              lineKey: project.projectCode,
              lineType: "project_snapshot",
              accountNumber: project.projectCode,
              accountName: project.projectName,
              accountClass: "project",
              displayName: `${project.projectCode} ${project.projectName}`,
              sectionCode: definition.reportCode
            }),
            totalDebit: roundMoney(costSnapshot.actualCostAmount || 0),
            totalCredit: roundMoney(costSnapshot.billedRevenueAmount || 0),
            balanceAmount: roundMoney(Number(costSnapshot.billedRevenueAmount || 0) - Number(costSnapshot.actualCostAmount || 0)),
            metricValues: {
              project_actual_cost_amount: roundMoney(costSnapshot.actualCostAmount || 0),
              project_billed_revenue_amount: roundMoney(costSnapshot.billedRevenueAmount || 0),
              project_wip_amount: roundMoney(wipSnapshot.wipAmount || 0),
              project_forecast_margin_amount: roundMoney(forecastSnapshot.forecastMarginAmount || 0)
            },
            supportingSnapshots: [
              {
                snapshotType: "project_cost_snapshot",
                snapshotId: costSnapshot.projectCostSnapshotId,
                snapshotHash: costSnapshot.snapshotHash
              },
              {
                snapshotType: "project_wip_snapshot",
                snapshotId: wipSnapshot.projectWipSnapshotId,
                snapshotHash: wipSnapshot.snapshotHash
              },
              {
                snapshotType: "project_forecast_snapshot",
                snapshotId: forecastSnapshot.projectForecastSnapshotId,
                snapshotHash: forecastSnapshot.snapshotHash
              }
            ]
          },
          [
            createSyntheticDrilldownEntry({
              journalEntryId: `project-cost:${costSnapshot.projectCostSnapshotId}`,
              journalDate: costSnapshot.cutoffDate,
              sourceType: "PROJECT_COST_SNAPSHOT",
              sourceId: costSnapshot.projectCostSnapshotId,
              description: `${project.projectCode} cost snapshot`,
              totalDebit: costSnapshot.actualCostAmount,
              totalCredit: 0,
              linkedDocuments: []
            }),
            createSyntheticDrilldownEntry({
              journalEntryId: `project-wip:${wipSnapshot.projectWipSnapshotId}`,
              journalDate: wipSnapshot.cutoffDate,
              sourceType: "PROJECT_WIP_SNAPSHOT",
              sourceId: wipSnapshot.projectWipSnapshotId,
              description: `${project.projectCode} WIP snapshot`,
              totalDebit: wipSnapshot.approvedValueAmount,
              totalCredit: wipSnapshot.billedAmount,
              linkedDocuments: []
            }),
            createSyntheticDrilldownEntry({
              journalEntryId: `project-forecast:${forecastSnapshot.projectForecastSnapshotId}`,
              journalDate: forecastSnapshot.cutoffDate,
              sourceType: "PROJECT_FORECAST_SNAPSHOT",
              sourceId: forecastSnapshot.projectForecastSnapshotId,
              description: `${project.projectCode} forecast snapshot`,
              totalDebit: forecastSnapshot.forecastRevenueAtCompletionAmount,
              totalCredit: forecastSnapshot.forecastCostAtCompletionAmount,
              linkedDocuments: []
            })
          ]
        )
      );
    }

    const finalizedLines = finalizeReportLines({
      lines,
      sortKeySelector: (line) => `${line.accountNumber || ""}:${line.lineKey}`
    });
    return {
      lines: finalizedLines,
      totals: buildReportTotals(finalizedLines),
      sourceSnapshotPayload: {
        sourceType: "project_portfolio",
        filters,
        projects: finalizedLines.map((line) => ({
          lineKey: line.lineKey,
          metricValues: line.metricValues,
          supportingSnapshots: line.supportingSnapshots
        }))
      }
    };
  }

  function buildPayrollReportLines({ companyId, definition, filters, window }) {
    if (!payrollPlatform) {
      throw httpError(500, "payroll_platform_missing", "Payroll platform is required for payroll reporting.");
    }
    const requestedPeriods = new Set(normalizeReportingPeriods(filters.reportingPeriods));
    const requestedRunTypes = new Set(Array.isArray(filters.runTypes) ? filters.runTypes.map((value) => String(value)) : []);
    const resolvedPeriods = requestedPeriods.size > 0 ? [...requestedPeriods] : listReportingPeriodsInWindow(window);
    const payrollRuns = dedupeByKey(
      resolvedPeriods.flatMap((reportingPeriod) => payrollPlatform.listPayRuns({ companyId, reportingPeriod })),
      (payRun) => payRun.payRunId
    )
      .filter((payRun) => (requestedRunTypes.size > 0 ? requestedRunTypes.has(payRun.runType) : true))
      .filter((payRun) =>
        Array.isArray(filters.employmentIds) && filters.employmentIds.length > 0
          ? payRun.employmentIds.some((employmentId) => filters.employmentIds.includes(employmentId))
          : true
      );
    const agiSubmissions = dedupeByKey(
      resolvedPeriods.flatMap((reportingPeriod) => payrollPlatform.listAgiSubmissions({ companyId, reportingPeriod })),
      (submission) => submission.agiSubmissionId
    );
    const vacationSnapshots = dedupeByKey(
      resolvedPeriods.flatMap((reportingPeriod) => payrollPlatform.listVacationLiabilitySnapshots({ companyId, reportingPeriod })),
      (snapshot) => snapshot.vacationLiabilitySnapshotId
    );
    const buckets = new Map();

    for (const reportingPeriod of resolvedPeriods) {
      const periodRuns = payrollRuns.filter((payRun) => payRun.reportingPeriod === reportingPeriod);
      const periodAgiSubmissions = agiSubmissions.filter((submission) => submission.reportingPeriod === reportingPeriod);
      const periodVacationSnapshot =
        vacationSnapshots
          .filter((snapshot) => snapshot.reportingPeriod === reportingPeriod)
          .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
          .at(-1) || null;
      if (periodRuns.length === 0 && periodAgiSubmissions.length === 0 && !periodVacationSnapshot) {
        continue;
      }
      const lineKey = reportingPeriod;
      const grossEarningsAmount = roundMoney(
        periodRuns.reduce(
          (sum, payRun) =>
            sum +
            payRun.payslips.reduce((payslipSum, payslip) => payslipSum + Number(payslip.totals?.grossEarnings || 0), 0),
          0
        )
      );
      const grossDeductionsAmount = roundMoney(
        periodRuns.reduce(
          (sum, payRun) =>
            sum +
            payRun.payslips.reduce((payslipSum, payslip) => payslipSum + Number(payslip.totals?.grossDeductions || 0), 0),
          0
        )
      );
      const preliminaryTaxAmount = roundMoney(
        periodRuns.reduce(
          (sum, payRun) =>
            sum +
            payRun.payslips.reduce((payslipSum, payslip) => payslipSum + Number(payslip.totals?.preliminaryTax || 0), 0),
          0
        )
      );
      const employerContributionAmount = roundMoney(
        periodRuns.reduce(
          (sum, payRun) =>
            sum +
            payRun.payslips.reduce(
              (payslipSum, payslip) => payslipSum + Number(payslip.totals?.employerContributionPreviewAmount || 0),
              0
            ),
          0
        )
      );
      const netPayAmount = roundMoney(
        periodRuns.reduce(
          (sum, payRun) =>
            sum + payRun.payslips.reduce((payslipSum, payslip) => payslipSum + Number(payslip.totals?.netPay || 0), 0),
          0
        )
      );
      const exceptionCount = periodRuns.reduce((sum, payRun) => sum + Number(payRun.exceptionSummary?.totalCount || 0), 0);
      const vacationLiabilityAmount = roundMoney(Number(periodVacationSnapshot?.totals?.liabilityAmount || 0));
      const bucket = finalizeReportLine(
        {
          ...createReportLineBucket({
            lineKey,
            lineType: "payroll_reporting_period",
            accountNumber: reportingPeriod,
            accountName: `Payroll ${reportingPeriod}`,
            accountClass: "payroll",
            displayName: `Payroll ${reportingPeriod}`,
            sectionCode: definition.reportCode
          }),
          totalDebit: grossEarningsAmount,
          totalCredit: roundMoney(preliminaryTaxAmount + employerContributionAmount + grossDeductionsAmount),
          balanceAmount: netPayAmount,
          metricValues: {
            payroll_gross_earnings_amount: grossEarningsAmount,
            payroll_gross_deductions_amount: grossDeductionsAmount,
            payroll_preliminary_tax_amount: preliminaryTaxAmount,
            payroll_employer_contribution_amount: employerContributionAmount,
            payroll_net_pay_amount: netPayAmount,
            payroll_vacation_liability_amount: vacationLiabilityAmount,
            payroll_exception_count: exceptionCount,
            payroll_agi_submission_count: periodAgiSubmissions.length,
            payroll_run_count: periodRuns.length
          },
          supportingSnapshots: [
            ...(periodVacationSnapshot
              ? [
                  {
                    snapshotType: "vacation_liability_snapshot",
                    snapshotId: periodVacationSnapshot.vacationLiabilitySnapshotId,
                    snapshotHash: periodVacationSnapshot.snapshotHash
                  }
                ]
              : []),
            ...periodRuns
              .filter((payRun) => payRun.payrollInputSnapshotId)
              .map((payRun) => ({
                snapshotType: "payroll_input_snapshot",
                snapshotId: payRun.payrollInputSnapshotId,
                snapshotHash: payRun.payrollInputFingerprint || payRun.sourceSnapshotHash || null
              })),
            ...periodAgiSubmissions
              .filter((submission) => submission.currentVersionId)
              .map((submission) => ({
                snapshotType: "agi_submission_version",
                snapshotId: submission.currentVersionId,
                snapshotHash: submission.currentVersion?.contentHash || submission.currentVersion?.payloadHash || null
              }))
          ].filter((snapshot) => snapshot.snapshotHash != null)
        },
        periodRuns.map((payRun) =>
          createSyntheticDrilldownEntry({
            journalEntryId: `payrun:${payRun.payRunId}`,
            journalDate: payRun.payDate,
            sourceType: "PAY_RUN",
            sourceId: payRun.payRunId,
            description: `${payRun.reportingPeriod} ${payRun.runType}`,
            totalDebit: payRun.payslips.reduce((sum, payslip) => sum + Number(payslip.totals?.grossEarnings || 0), 0),
            totalCredit: payRun.payslips.reduce((sum, payslip) => sum + Number(payslip.totals?.preliminaryTax || 0), 0),
            linkedDocuments: []
          })
        )
      );
      buckets.set(lineKey, bucket);
    }

    const lines = finalizeReportLines({
      lines: [...buckets.values()],
      sortKeySelector: (line) => line.lineKey
    });
    return {
      lines,
      totals: buildReportTotals(lines),
      sourceSnapshotPayload: {
        sourceType: "payroll_summary",
        filters,
        reportingPeriods: resolvedPeriods,
        payRuns: payrollRuns.map((payRun) => ({
          payRunId: payRun.payRunId,
          reportingPeriod: payRun.reportingPeriod,
          runType: payRun.runType,
          status: payRun.status,
          exceptionSummary: payRun.exceptionSummary,
          payRunFingerprint: payRun.payRunFingerprint || null
        })),
        agiSubmissions: agiSubmissions.map((submission) => ({
          agiSubmissionId: submission.agiSubmissionId,
          reportingPeriod: submission.reportingPeriod,
          status: submission.status,
          currentVersionId: submission.currentVersionId
        })),
        vacationLiabilitySnapshots: vacationSnapshots.map((snapshot) => ({
          vacationLiabilitySnapshotId: snapshot.vacationLiabilitySnapshotId,
          reportingPeriod: snapshot.reportingPeriod,
          liabilityAmount: snapshot.totals?.liabilityAmount || 0,
          snapshotHash: snapshot.snapshotHash
        }))
      }
    };
  }

  function buildTaxAccountReportLines({ companyId, definition, filters, window }) {
    if (!taxAccountPlatform || typeof taxAccountPlatform.snapshotTaxAccount !== "function") {
      throw httpError(500, "tax_account_platform_missing", "Tax-account platform is required for tax-account reporting.");
    }
    const snapshot = taxAccountPlatform.snapshotTaxAccount({ companyId });
    const filteredEvents = (snapshot.events || []).filter((event) => isTimestampWithinWindow(event.eventDate || event.createdAt, window));
    const filteredImportBatches = (snapshot.importBatches || []).filter((batch) =>
      isTimestampWithinWindow(batch.statementDate || batch.importedAt, window)
    );
    const openDiscrepancies = (snapshot.discrepancies || []).filter((item) => item.status === "open" || item.status === "investigating");
    const line = finalizeReportLine(
      {
        ...createReportLineBucket({
          lineKey: "tax_account",
          lineType: "tax_account_summary",
          accountNumber: "tax_account",
          accountName: "Tax account",
          accountClass: "tax_account",
          displayName: "Tax account summary",
          sectionCode: definition.reportCode
        }),
        totalDebit: roundMoney(Number(snapshot.balance?.debitBalance || 0)),
        totalCredit: roundMoney(Number(snapshot.balance?.creditBalance || 0)),
        balanceAmount: roundMoney(Number(snapshot.balance?.netBalance || 0)),
        metricValues: {
          tax_account_net_balance_amount: roundMoney(Number(snapshot.balance?.netBalance || 0)),
          tax_account_open_credit_amount: roundMoney(Number(snapshot.balance?.openCreditAmount || 0)),
          tax_account_open_settlement_amount: roundMoney(Number(snapshot.balance?.openSettlementAmount || 0)),
          tax_account_open_difference_case_count: openDiscrepancies.length,
          tax_account_event_count: filteredEvents.length,
          tax_account_import_batch_count: filteredImportBatches.length
        },
        supportingSnapshots: (snapshot.reconciliations || []).map((reconciliation) => ({
          snapshotType: "tax_account_reconciliation_run",
          snapshotId: reconciliation.reconciliationRunId,
          snapshotHash: reconciliation.summary ? hashObject(reconciliation.summary) : hashObject(reconciliation)
        }))
      },
      [
        createSyntheticDrilldownEntry({
          journalEntryId: `tax-account:${companyId}`,
          journalDate: window.toDate,
          sourceType: "TAX_ACCOUNT_SUMMARY",
          sourceId: companyId,
          description: `Tax account summary through ${window.toDate}`,
          totalDebit: snapshot.balance?.debitBalance || 0,
          totalCredit: snapshot.balance?.creditBalance || 0,
          linkedDocuments: []
        })
      ]
    );
    return {
      lines: [line],
      totals: buildReportTotals([line]),
      sourceSnapshotPayload: {
        sourceType: "tax_account_summary",
        filters,
        balance: snapshot.balance || null,
        eventIds: filteredEvents.map((event) => event.taxAccountEventId),
        discrepancyCaseIds: openDiscrepancies.map((item) => item.discrepancyCaseId),
        importBatchIds: filteredImportBatches.map((batch) => batch.importBatchId)
      }
    };
  }

  function buildSubmissionDashboardReportLines({ companyId, definition, filters, window }) {
    if (!integrationPlatform || typeof integrationPlatform.listAuthoritySubmissions !== "function") {
      throw httpError(500, "integration_platform_missing", "Integration platform is required for submission dashboards.");
    }
    const requestedSubmissionTypes = new Set(Array.isArray(filters.submissionTypes) ? filters.submissionTypes.map((value) => String(value)) : []);
    const submissions = integrationPlatform
      .listAuthoritySubmissions({ companyId })
      .filter((submission) => (requestedSubmissionTypes.size > 0 ? requestedSubmissionTypes.has(submission.submissionType) : true))
      .filter((submission) => isTimestampWithinWindow(submission.submittedAt || submission.createdAt, window));
    const grouped = new Map();
    for (const submission of submissions) {
      const lineKey = submission.submissionType;
      if (!grouped.has(lineKey)) {
        grouped.set(
          lineKey,
          createReportLineBucket({
            lineKey,
            lineType: "submission_type_dashboard",
            accountNumber: submission.submissionType,
            accountName: submission.submissionType,
            accountClass: "submission",
            displayName: submission.submissionType,
            sectionCode: definition.reportCode
          })
        );
      }
      const bucket = grouped.get(lineKey);
      const isAccepted = ["accepted", "finalized"].includes(submission.status) || submission.materialReceiptStateCode === "accepted";
      const isFailed =
        ["transport_failed", "domain_rejected"].includes(submission.status) ||
        ["technical_nack", "business_nack"].includes(submission.latestReceiptType);
      const openRecoveryCount = (submission.recoveries || []).filter((recovery) => ["open", "monitoring"].includes(recovery.status)).length;
      const openActionCount = (submission.actionQueueItems || []).filter((item) => ["open", "claimed", "waiting_input"].includes(item.status)).length;
      bucket.totalDebit = roundMoney(bucket.totalDebit + 1);
      bucket.totalCredit = roundMoney(bucket.totalCredit + (isFailed ? 1 : 0));
      bucket.balanceAmount = roundMoney(bucket.balanceAmount + (isAccepted ? 1 : 0));
      bucket.metricValues = {
        submission_total_count: roundMoney(Number(bucket.metricValues.submission_total_count || 0) + 1),
        submission_accepted_count: roundMoney(Number(bucket.metricValues.submission_accepted_count || 0) + (isAccepted ? 1 : 0)),
        submission_failed_count: roundMoney(Number(bucket.metricValues.submission_failed_count || 0) + (isFailed ? 1 : 0)),
        submission_open_recovery_count: roundMoney(Number(bucket.metricValues.submission_open_recovery_count || 0) + openRecoveryCount),
        submission_open_action_count: roundMoney(Number(bucket.metricValues.submission_open_action_count || 0) + openActionCount),
        submission_attempt_count: roundMoney(Number(bucket.metricValues.submission_attempt_count || 0) + (submission.attempts || []).length),
        submission_receipt_count: roundMoney(Number(bucket.metricValues.submission_receipt_count || 0) + (submission.receipts || []).length)
      };
      pushUniqueDrilldownEntry(
        bucket,
        createSyntheticDrilldownEntry({
          journalEntryId: `submission:${submission.submissionId}`,
          journalDate: (submission.submittedAt || submission.createdAt || window.toDate).slice(0, 10),
          sourceType: submission.submissionType,
          sourceId: submission.submissionId,
          description: `${submission.status} ${submission.sourceObjectType}:${submission.sourceObjectId}`,
          totalDebit: 1,
          totalCredit: isFailed ? 1 : 0,
          linkedDocuments: []
        })
      );
    }

    const lines = finalizeReportLines({
      lines: [...grouped.values()],
      sortKeySelector: (line) => line.lineKey
    });
    return {
      lines,
      totals: buildReportTotals(lines),
      sourceSnapshotPayload: {
        sourceType: "submission_dashboard",
        filters,
        submissionIds: submissions.map((submission) => submission.submissionId),
        statuses: submissions.map((submission) => ({
          submissionId: submission.submissionId,
          submissionType: submission.submissionType,
          status: submission.status,
          latestReceiptType: submission.latestReceiptType || null,
          openRecoveryCount: (submission.recoveries || []).filter((recovery) => ["open", "monitoring"].includes(recovery.status)).length,
          openActionCount: (submission.actionQueueItems || []).filter((item) => ["open", "claimed", "waiting_input"].includes(item.status)).length
        }))
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

  function processQueuedReportExportJobs({ companyId = null, actorId = "system", correlationId = crypto.randomUUID(), onlyJobId = null } = {}) {
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const jobs = [...state.reportExportJobs.values()]
      .filter((job) => (companyId ? job.companyId === companyId : true))
      .filter((job) => (onlyJobId ? job.reportExportJobId === onlyJobId : true))
      .filter((job) => job.status === "queued" || job.status === "retry_pending")
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

    for (const job of jobs) {
      try {
        transitionExportJob(job, "running", resolvedActorId, "export_worker_started");
        const snapshot = requireReportSnapshot(job.companyId, job.reportSnapshotId);
        const artifact = renderReportExportArtifact(snapshot, job.format, job.watermarkMode);
        markSupersededExports(job, snapshot, resolvedActorId, correlationId);
        job.status = "materialized";
        job.artifactRef = artifact.artifactRef;
        job.artifactName = artifact.artifactName;
        job.artifactContentType = artifact.artifactContentType;
        job.artifactContent = artifact.artifactContent;
        job.contentHash = artifact.contentHash;
        job.updatedAt = nowIso();
        job.statusHistory.push(
          createStatusTransition({
            fromStatus: "running",
            toStatus: "materialized",
            actorId: resolvedActorId,
            reasonCode: "artifact_materialized",
            changedAt: job.updatedAt
          })
        );
        job.status = "delivered";
        job.completedAt = nowIso();
        job.updatedAt = job.completedAt;
        job.statusHistory.push(
          createStatusTransition({
            fromStatus: "materialized",
            toStatus: "delivered",
            actorId: resolvedActorId,
            reasonCode: "artifact_delivered",
            changedAt: job.completedAt
          })
        );
        pushAudit({
          companyId: job.companyId,
          actorId: resolvedActorId,
          correlationId,
          action: "reporting.export_job.completed",
          entityType: "report_export_job",
          entityId: job.reportExportJobId,
          explanation: `Materialized ${job.format} export for snapshot ${job.reportSnapshotId}.`
        });
      } catch (error) {
        job.status = "failed";
        job.failedAt = nowIso();
        job.updatedAt = job.failedAt;
        job.statusHistory.push(
          createStatusTransition({
            fromStatus: "running",
            toStatus: "failed",
            actorId: resolvedActorId,
            reasonCode: error.code || "export_failed",
            changedAt: job.failedAt
          })
        );
        pushAudit({
          companyId: job.companyId,
          actorId: resolvedActorId,
          correlationId,
          action: "reporting.export_job.failed",
          entityType: "report_export_job",
          entityId: job.reportExportJobId,
          explanation: `Export ${job.reportExportJobId} failed: ${error.message}`
        });
      }
    }
  }

  function transitionExportJob(job, nextStatus, actorId, reasonCode) {
    const changedAt = nowIso();
    const previousStatus = job.status;
    job.status = nextStatus;
    job.updatedAt = changedAt;
    job.statusHistory.push(
      createStatusTransition({
        fromStatus: previousStatus,
        toStatus: nextStatus,
        actorId,
        reasonCode,
        changedAt
      })
    );
  }

  function markSupersededExports(job, snapshot, actorId, correlationId) {
    for (const candidate of state.reportExportJobs.values()) {
      if (candidate.reportExportJobId === job.reportExportJobId) {
        continue;
      }
      if (candidate.companyId !== job.companyId || candidate.format !== job.format) {
        continue;
      }
      if (!["materialized", "delivered"].includes(candidate.status)) {
        continue;
      }
      const candidateSnapshot = state.reportSnapshots.get(candidate.reportSnapshotId);
      if (!candidateSnapshot || candidateSnapshot.reportCode !== snapshot.reportCode) {
        continue;
      }
      if (candidateSnapshot.contentHash === snapshot.contentHash) {
        continue;
      }
      const previousStatus = candidate.status;
      candidate.status = "superseded";
      candidate.watermarkMode = "superseded";
      candidate.supersededByExportJobId = job.reportExportJobId;
      candidate.updatedAt = nowIso();
      candidate.statusHistory.push(
        createStatusTransition({
          fromStatus: previousStatus,
          toStatus: "superseded",
          actorId,
          reasonCode: "newer_snapshot_exported",
          changedAt: candidate.updatedAt
        })
      );
      pushAudit({
        companyId: candidate.companyId,
        actorId,
        correlationId,
        action: "reporting.export_job.superseded",
        entityType: "report_export_job",
        entityId: candidate.reportExportJobId,
        explanation: `Export ${candidate.reportExportJobId} was superseded by ${job.reportExportJobId}.`
      });
    }
  }

  function renderReportExportArtifact(snapshot, format, watermarkMode) {
    const extension = format === "excel" ? "xlsx" : "pdf";
    const artifactName = `${snapshot.reportCode}_${snapshot.fromDate}_${snapshot.toDate}.${extension}`;
    const headerLines = [
      `reportCode=${snapshot.reportCode}`,
      `reportVersionNo=${snapshot.reportVersionNo}`,
      `snapshotId=${snapshot.reportSnapshotId}`,
      `generatedAt=${snapshot.generatedAt}`,
      `watermarkMode=${watermarkMode}`
    ];
    const metricColumns = snapshot.metricCatalog.map((metric) => metric.metricCode);
    const lineRows = snapshot.lines.map((line) =>
      [
        line.lineKey,
        line.displayName || line.accountName || line.lineKey,
        ...metricColumns.map((metricCode) => String(line.metricValues?.[metricCode] ?? ""))
      ].join("\t")
    );
    const artifactContent = [
      format === "pdf" ? "%PDF-FAKE-1.0" : "XLSX-FAKE-1.0",
      ...headerLines,
      ["lineKey", "displayName", ...metricColumns].join("\t"),
      ...lineRows
    ].join("\n");
    return {
      artifactRef: `memory://report-exports/${snapshot.reportSnapshotId}/${artifactName}`,
      artifactName,
      artifactContentType:
        format === "excel"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/pdf",
      artifactContent,
      contentHash: hashObject({
        format,
        watermarkMode,
        reportSnapshotId: snapshot.reportSnapshotId,
        content: artifactContent
      })
    };
  }

  function resolveWatermarkMode(snapshot, watermarkMode) {
    if (watermarkMode) {
      return assertAllowedValue(watermarkMode, REPORT_WATERMARK_MODES, "report_watermark_mode_invalid");
    }
    return snapshot.periodStatus === "hard_closed" ? "none" : "preliminary";
  }

  function classifyCashflowBucket({ entry, accountMap, bankAccountNumbers }) {
    const sourceType = normalizeOptionalText(entry.sourceType) || "MANUAL_JOURNAL";
    if (["AR_PAYMENT", "AP_PAYMENT", "PAYROLL_RUN", "PAYROLL_CORRECTION", "BENEFIT_EVENT", "TRAVEL_CLAIM", "VAT_SETTLEMENT", "ROT_RUT_CLAIM", "PENSION_REPORT", "BANK_IMPORT"].includes(sourceType)) {
      return "operating";
    }
    const counterpartClasses = dedupeStringValues(
      entry.lines
        .filter((line) => !bankAccountNumbers.has(String(line.accountNumber)))
        .map((line) => accountMap.get(line.accountNumber)?.accountClass || String(line.accountNumber).slice(0, 1))
    );
    if (counterpartClasses.some((accountClass) => accountClass === "1")) {
      return "investing";
    }
    if (counterpartClasses.some((accountClass) => accountClass === "2")) {
      return "financing";
    }
    if (counterpartClasses.some((accountClass) => ["3", "4", "5", "6", "7", "8"].includes(accountClass))) {
      return "operating";
    }
    return "unclassified";
  }

  function pushAudit(event) {
    state.auditEvents.push(
      createAuditEnvelopeFromLegacyEvent({
        clock,
        auditClass: "reporting_action",
        event
      })
    );
  }

  function nowIso() {
    return new Date(clock()).toISOString();
  }
}

function createMetricDefinition(metricCode, name, ownerRoleCode, drilldownLevel, formulaRef, sourceDomains) {
  return {
    metricCode,
    name,
    ownerRoleCode,
    versionNo: 1,
    drilldownLevel,
    formulaRef,
    sourceDomains,
    status: "active"
  };
}

function metricCatalog(metricCodes) {
  return metricCodes.map((metricCode) => copy(requireMetricDefinitionFromCatalog(metricCode)));
}

function requireMetricDefinitionFromCatalog(metricCode) {
  const resolvedMetricCode = requireText(metricCode, "metric_code_required");
  const definition = REPORT_METRIC_DEFINITIONS.find((candidate) => candidate.metricCode === resolvedMetricCode);
  if (!definition) {
    throw httpError(404, "metric_definition_not_found", `Metric definition ${resolvedMetricCode} was not found.`);
  }
  return definition;
}

function createReportLineBucket({ lineKey, lineType, accountNumber, accountName, accountClass, displayName, sectionCode }) {
  return {
    lineKey,
    lineType,
    accountNumber,
    accountName,
    accountClass,
    displayName,
    sectionCode,
    totalDebit: 0,
    totalCredit: 0,
    balanceAmount: 0,
    metricValues: {},
    journalEntryCount: 0,
    sourceDocumentCount: 0,
    drilldownEntries: [],
    sourceDocumentRefs: [],
    supportingSnapshots: []
  };
}

function finalizeReportLine(line, drilldownEntries = line.drilldownEntries || []) {
  const sourceDocumentRefs = dedupeByKey(
    drilldownEntries.flatMap((entry) => entry.linkedDocuments || []),
    (item) => `${item.documentId}:${item.targetType}:${item.targetId}`
  );
  return {
    ...line,
    drilldownEntries: copy(drilldownEntries),
    journalEntryCount: drilldownEntries.length,
    sourceDocumentCount: sourceDocumentRefs.length,
    sourceDocumentRefs
  };
}

function finalizeReportLines({ lines, sortKeySelector }) {
  return lines
    .map((line) => finalizeReportLine(line))
    .sort((left, right) => sortKeySelector(left).localeCompare(sortKeySelector(right)));
}

function buildReportTotals(lines) {
  const metricTotals = {};
  for (const line of lines) {
    for (const [metricCode, value] of Object.entries(line.metricValues || {})) {
      metricTotals[metricCode] = roundMoney(Number(metricTotals[metricCode] || 0) + Number(value || 0));
    }
  }
  return {
    totalDebit: roundMoney(lines.reduce((sum, line) => sum + Number(line.totalDebit || 0), 0)),
    totalCredit: roundMoney(lines.reduce((sum, line) => sum + Number(line.totalCredit || 0), 0)),
    balanceAmount: roundMoney(lines.reduce((sum, line) => sum + Number(line.balanceAmount || 0), 0)),
    metricTotals
  };
}

function pushUniqueDrilldownEntry(bucket, drilldownEntry) {
  if (!bucket.drilldownEntries.some((candidate) => candidate.journalEntryId === drilldownEntry.journalEntryId)) {
    bucket.drilldownEntries.push(copy(drilldownEntry));
  }
}

function createSyntheticDrilldownEntry({
  journalEntryId,
  journalDate,
  sourceType,
  sourceId,
  description = null,
  totalDebit = 0,
  totalCredit = 0,
  linkedDocuments = []
}) {
  return {
    journalEntryId,
    journalDate,
    voucherSeriesCode: "SYN",
    voucherNumber: 0,
    status: "materialized",
    sourceType,
    sourceId,
    description,
    totalDebit: roundMoney(totalDebit),
    totalCredit: roundMoney(totalCredit),
    linkedDocuments: copy(linkedDocuments)
  };
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

function isTimestampWithinWindow(value, window) {
  if (!value) {
    return false;
  }
  const normalizedDate = String(value).slice(0, 10);
  return normalizedDate >= window.fromDate && normalizedDate <= window.toDate;
}

function normalizeReportingPeriods(values) {
  return dedupeStringValues(
    (Array.isArray(values) ? values : []).map((value) => {
      const resolvedValue = requireText(String(value), "reporting_period_invalid");
      if (!/^\d{6}$/.test(resolvedValue)) {
        throw httpError(400, "reporting_period_invalid", `${resolvedValue} must use YYYYMM format.`);
      }
      return resolvedValue;
    })
  );
}

function listReportingPeriodsInWindow(window) {
  const startDate = parseIsoDate(window.fromDate);
  const endDate = parseIsoDate(window.toDate);
  const periods = [];
  let cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
  const endCursor = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));
  while (cursor <= endCursor) {
    periods.push(`${cursor.getUTCFullYear()}${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`);
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }
  return periods;
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function dedupeStringValues(values) {
  return [...new Set((values || []).map((value) => String(value)))];
}

function requireText(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw httpError(400, code, `${code} is required.`);
  }
  return value.trim();
}

function normalizeOptionalText(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePlainObject(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw httpError(400, code, `${code} must be an object.`);
  }
  return value;
}

function slugify(value) {
  const resolvedValue = requireText(value, "slug_value_required");
  return resolvedValue
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function normalizeReportCode(value) {
  const resolvedValue = requireText(value, "report_code_required")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (resolvedValue.length < 3) {
    throw httpError(400, "report_code_invalid", "Report code must contain at least three characters.");
  }
  return resolvedValue;
}

function mergeFilterObjects(defaultFilters, requestedFilters) {
  return {
    ...copy(defaultFilters || {}),
    ...copy(requestedFilters || {})
  };
}

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
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
