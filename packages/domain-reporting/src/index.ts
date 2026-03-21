export interface ReportingMetricDefinition {
  readonly metricCode: string;
  readonly name: string;
  readonly ownerRoleCode: string;
  readonly versionNo: number;
  readonly drilldownLevel: string;
}

export interface ReportDefinition {
  readonly companyId: string;
  readonly reportCode: string;
  readonly name: string;
  readonly purpose: string;
  readonly versionNo: number;
  readonly defaultViewMode: string;
  readonly allowedViewModes: readonly string[];
  readonly classFilter: readonly string[];
  readonly drilldownMode: string;
  readonly metricCatalog: readonly ReportingMetricDefinition[];
  readonly status: string;
}

export interface ReportDrilldownDocumentRef {
  readonly documentId: string;
  readonly documentType: string | null;
  readonly documentStatus: string | null;
  readonly sourceReference: string | null;
  readonly targetType: string;
  readonly targetId: string;
  readonly linkedAt: string;
}

export interface ReportDrilldownEntry {
  readonly journalEntryId: string;
  readonly journalDate: string;
  readonly voucherSeriesCode: string;
  readonly voucherNumber: number;
  readonly status: string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly description: string | null;
  readonly totalDebit: number;
  readonly totalCredit: number;
  readonly linkedDocuments: readonly ReportDrilldownDocumentRef[];
}

export interface ReportSnapshotLine {
  readonly lineKey: string;
  readonly accountNumber: string;
  readonly accountName: string;
  readonly accountClass: string;
  readonly totalDebit: number;
  readonly totalCredit: number;
  readonly balanceAmount: number;
  readonly journalEntryCount: number;
  readonly sourceDocumentCount: number;
  readonly drilldownEntries: readonly ReportDrilldownEntry[];
  readonly sourceDocumentRefs: readonly ReportDrilldownDocumentRef[];
}

export interface ReportSnapshot {
  readonly reportSnapshotId: string;
  readonly companyId: string;
  readonly reportCode: string;
  readonly reportName: string;
  readonly reportVersionNo: number;
  readonly reportDefinition: ReportDefinition;
  readonly metricCatalog: readonly ReportingMetricDefinition[];
  readonly viewMode: string;
  readonly accountingPeriodId: string | null;
  readonly fromDate: string;
  readonly toDate: string;
  readonly periodStatus: string;
  readonly filters: Record<string, unknown>;
  readonly drilldownMode: string;
  readonly lineCount: number;
  readonly sourceSnapshotHash: string;
  readonly contentHash: string;
  readonly lines: readonly ReportSnapshotLine[];
  readonly totals: {
    readonly totalDebit: number;
    readonly totalCredit: number;
    readonly balanceAmount: number;
  };
  readonly generatedAt: string;
  readonly generatedByActorId: string;
}

export interface JournalSearchResult {
  readonly journalEntryId: string;
  readonly journalDate: string;
  readonly voucherSeriesCode: string;
  readonly voucherNumber: number;
  readonly status: string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly description: string | null;
  readonly totalDebit: number;
  readonly totalCredit: number;
  readonly lines: readonly Record<string, unknown>[];
  readonly linkedDocuments: readonly ReportDrilldownDocumentRef[];
}

export interface ReconciliationDifferenceItem {
  readonly reconciliationDifferenceItemId: string;
  readonly state: string;
  readonly reasonCode: string;
  readonly amount: number;
  readonly ownerUserId: string | null;
  readonly explanation: string | null;
  readonly waivedUntil: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ReconciliationSignoff {
  readonly reconciliationSignoffId: string;
  readonly reconciliationRunId: string;
  readonly companyId: string;
  readonly signatoryRole: string;
  readonly signatoryUserId: string;
  readonly decision: string;
  readonly comment: string | null;
  readonly evidenceSnapshotRef: string;
  readonly evidenceRefs: readonly string[];
  readonly signedAt: string;
}

export interface ReconciliationRun {
  readonly reconciliationRunId: string;
  readonly companyId: string;
  readonly accountingPeriodId: string;
  readonly areaCode: string;
  readonly versionNo: number;
  readonly cutoffDate: string;
  readonly status: string;
  readonly statusHistory: readonly {
    readonly fromStatus: string | null;
    readonly toStatus: string;
    readonly actorId: string;
    readonly reasonCode: string;
    readonly changedAt: string;
  }[];
  readonly ledgerAccountNumbers: readonly string[];
  readonly ledgerBalanceAmount: number;
  readonly subledgerBalanceAmount: number | null;
  readonly differenceAmount: number;
  readonly materialityThresholdAmount: number;
  readonly ownerUserId: string | null;
  readonly signoffRequired: boolean;
  readonly checklistSnapshotRef: string | null;
  readonly snapshotHash: string;
  readonly evidenceSnapshotRef: string;
  readonly differenceItems: readonly ReconciliationDifferenceItem[];
  readonly signoffs: readonly ReconciliationSignoff[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdByActorId: string;
}
