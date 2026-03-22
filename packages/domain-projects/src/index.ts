export type ProjectStatus = "draft" | "active" | "on_hold" | "closed" | "archived";
export type ProjectBillingModelCode = "time_and_material" | "fixed_price" | "milestone";
export type ProjectRevenueRecognitionModelCode = "billing_equals_revenue" | "over_time" | "deferred_until_milestone";
export type ProjectBudgetLineKind = "cost" | "revenue";
export type ProjectBudgetCategoryCode =
  | "labor"
  | "benefits"
  | "pension"
  | "travel"
  | "material"
  | "subcontractor"
  | "other_cost"
  | "revenue";
export type ProjectBudgetVersionStatus = "approved";
export type ProjectResourceAllocationStatus = "planned" | "confirmed" | "released";
export type ProjectSnapshotStatus = "materialized" | "review_required";

export interface ProjectRef {
  readonly projectId: string;
  readonly companyId: string;
  readonly projectCode: string;
  readonly projectReferenceCode: string;
  readonly displayName: string;
  readonly customerId: string | null;
  readonly projectManagerEmployeeId: string | null;
  readonly startsOn: string;
  readonly endsOn: string | null;
  readonly currencyCode: string;
  readonly status: ProjectStatus;
  readonly billingModelCode: ProjectBillingModelCode | null;
  readonly revenueRecognitionModelCode: ProjectRevenueRecognitionModelCode | null;
  readonly contractValueAmount: number;
  readonly dimensionJson: Record<string, unknown>;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectBudgetLineRef {
  readonly projectBudgetLineId: string;
  readonly lineKind: ProjectBudgetLineKind;
  readonly categoryCode: ProjectBudgetCategoryCode;
  readonly reportingPeriod: string;
  readonly amount: number;
  readonly employmentId: string | null;
  readonly activityCode: string | null;
  readonly note: string | null;
}

export interface ProjectBudgetVersionRef {
  readonly projectBudgetVersionId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly versionNo: number;
  readonly budgetName: string;
  readonly validFrom: string;
  readonly status: ProjectBudgetVersionStatus;
  readonly totals: {
    readonly costAmount: number;
    readonly revenueAmount: number;
  };
  readonly lines: readonly ProjectBudgetLineRef[];
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface ProjectResourceAllocationRef {
  readonly projectResourceAllocationId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly employmentId: string;
  readonly reportingPeriod: string;
  readonly plannedMinutes: number;
  readonly billableMinutes: number;
  readonly billRateAmount: number;
  readonly costRateAmount: number;
  readonly activityCode: string | null;
  readonly status: ProjectResourceAllocationStatus;
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface ProjectCostSnapshotRef {
  readonly projectCostSnapshotId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly cutoffDate: string;
  readonly reportingPeriod: string;
  readonly actualCostAmount: number;
  readonly actualMinutes: number;
  readonly billedRevenueAmount: number;
  readonly recognizedRevenueAmount: number;
  readonly costBreakdown: {
    readonly salaryAmount: number;
    readonly benefitAmount: number;
    readonly pensionAmount: number;
    readonly travelAmount: number;
    readonly otherAmount: number;
  };
  readonly sourceCounts: {
    readonly payRuns: number;
    readonly timeEntries: number;
    readonly invoices: number;
  };
  readonly snapshotHash: string;
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface ProjectWipSnapshotRef {
  readonly projectWipSnapshotId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly cutoffDate: string;
  readonly reportingPeriod: string;
  readonly approvedValueAmount: number;
  readonly billedAmount: number;
  readonly wipAmount: number;
  readonly deferredRevenueAmount: number;
  readonly status: ProjectSnapshotStatus;
  readonly explanationCodes: readonly string[];
  readonly snapshotHash: string;
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface ProjectForecastSnapshotRef {
  readonly projectForecastSnapshotId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly cutoffDate: string;
  readonly reportingPeriod: string;
  readonly actualCostAmount: number;
  readonly remainingBudgetCostAmount: number;
  readonly forecastCostAtCompletionAmount: number;
  readonly billedRevenueAmount: number;
  readonly remainingBudgetRevenueAmount: number;
  readonly forecastRevenueAtCompletionAmount: number;
  readonly currentMarginAmount: number;
  readonly forecastMarginAmount: number;
  readonly resourceLoadPercent: number;
  readonly snapshotHash: string;
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface ProjectAuditEventRef {
  readonly auditEventId: string;
  readonly companyId: string;
  readonly actorId: string;
  readonly correlationId: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly projectId: string | null;
  readonly createdAt: string;
  readonly explanation: string;
}
