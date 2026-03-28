export type ProjectStatus = "draft" | "active" | "on_hold" | "closed" | "archived";
export type ProjectBillingModelCode =
  | "time_and_material"
  | "fixed_price"
  | "milestone"
  | "retainer_capacity"
  | "subscription_service"
  | "advance_invoice"
  | "hybrid_change_order";
export type ProjectRevenueRecognitionModelCode = "billing_equals_revenue" | "over_time" | "deferred_until_milestone";
export type ProjectEngagementStatus = "draft" | "active" | "paused" | "closed" | "cancelled";
export type ProjectWorkModelCode =
  | "time_only"
  | "milestone_only"
  | "retainer_capacity"
  | "fixed_scope"
  | "subscription_service"
  | "field_service_optional"
  | "service_order"
  | "work_order"
  | "construction_stage"
  | "internal_delivery";
export type ProjectWorkPackageStatus = "draft" | "active" | "completed" | "cancelled";
export type ProjectDeliveryMilestoneStatus = "planned" | "ready" | "achieved" | "accepted" | "cancelled";
export type ProjectWorkLogStatus = "recorded" | "approved" | "rejected";
export type ProjectRevenuePlanStatus = "draft" | "approved" | "superseded";
export type ProjectBillingPlanStatus = "draft" | "active" | "superseded" | "cancelled";
export type ProjectStatusUpdateHealthCode = "green" | "amber" | "red";
export type ProjectProfitabilityAdjustmentStatus = "pending_review" | "approved" | "rejected";
export type ProjectProfitabilityAdjustmentImpactCode = "revenue" | "cost" | "margin";
export type ProjectInvoiceReadinessStatus = "ready" | "review_required" | "blocked";
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
export type ProjectCapacityReservationStatus = "draft" | "approved" | "released" | "cancelled";
export type ProjectAssignmentPlanStatus = "draft" | "approved" | "in_progress" | "completed" | "cancelled";
export type ProjectRiskStatus = "open" | "mitigating" | "accepted" | "closed";
export type ProjectRiskSeverityCode = "low" | "medium" | "high" | "critical";
export type ProjectRiskProbabilityCode = "low" | "medium" | "high";
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

export interface ProjectEngagementRef {
  readonly projectEngagementId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly engagementCode: string;
  readonly displayName: string;
  readonly customerId: string | null;
  readonly workModelCode: ProjectWorkModelCode;
  readonly startsOn: string;
  readonly endsOn: string | null;
  readonly status: ProjectEngagementStatus;
  readonly externalOpportunityRef: string | null;
  readonly externalQuoteRef: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectOpportunityLinkRef {
  readonly projectOpportunityLinkId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly customerId: string | null;
  readonly externalSystemCode: string;
  readonly externalOpportunityId: string;
  readonly externalOpportunityRef: string | null;
  readonly stageCode: string;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectQuoteLinkRef {
  readonly projectQuoteLinkId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly customerId: string | null;
  readonly sourceQuoteId: string | null;
  readonly sourceQuoteVersionId: string | null;
  readonly quoteNo: string | null;
  readonly quoteTitle: string | null;
  readonly quoteStatus: string | null;
  readonly acceptedOn: string | null;
  readonly externalSystemCode: string;
  readonly externalQuoteRef: string | null;
  readonly totalAmount: number | null;
  readonly currencyCode: string;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectWorkModelRef {
  readonly projectWorkModelId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly projectEngagementId: string | null;
  readonly modelCode: ProjectWorkModelCode;
  readonly title: string;
  readonly operationalPackCode: string;
  readonly requiresWorkOrders: boolean;
  readonly requiresMilestones: boolean;
  readonly requiresAttendance: boolean;
  readonly requiresId06: boolean;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectWorkPackageRef {
  readonly projectWorkPackageId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly projectEngagementId: string | null;
  readonly projectWorkModelId: string | null;
  readonly workPackageCode: string;
  readonly title: string;
  readonly description: string | null;
  readonly startsOn: string;
  readonly endsOn: string | null;
  readonly status: ProjectWorkPackageStatus;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectDeliveryMilestoneRef {
  readonly projectDeliveryMilestoneId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly projectWorkPackageId: string | null;
  readonly title: string;
  readonly targetDate: string;
  readonly plannedRevenueAmount: number;
  readonly status: ProjectDeliveryMilestoneStatus;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectWorkLogRef {
  readonly projectWorkLogId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly projectWorkPackageId: string | null;
  readonly projectDeliveryMilestoneId: string | null;
  readonly employmentId: string | null;
  readonly workDate: string;
  readonly minutes: number;
  readonly description: string;
  readonly billableFlag: boolean;
  readonly status: ProjectWorkLogStatus;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectRevenuePlanLineRef {
  readonly projectRevenuePlanLineId: string;
  readonly recognitionDate: string;
  readonly triggerTypeCode: string;
  readonly amount: number;
  readonly note: string | null;
  readonly projectWorkPackageId: string | null;
  readonly projectDeliveryMilestoneId: string | null;
}

export interface ProjectRevenuePlanRef {
  readonly projectRevenuePlanId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly versionNo: number;
  readonly versionLabel: string;
  readonly status: ProjectRevenuePlanStatus;
  readonly lines: readonly ProjectRevenuePlanLineRef[];
  readonly totals: {
    readonly plannedRevenueAmount: number;
  };
  readonly approvedAt: string | null;
  readonly approvedByActorId: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectBillingPlanLineRef {
  readonly projectBillingPlanLineId: string;
  readonly plannedInvoiceDate: string;
  readonly amount: number;
  readonly triggerCode: string;
  readonly note: string | null;
  readonly projectWorkPackageId: string | null;
  readonly projectDeliveryMilestoneId: string | null;
  readonly sourceQuoteVersionId: string | null;
}

export interface ProjectBillingPlanRef {
  readonly projectBillingPlanId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly projectQuoteLinkId: string | null;
  readonly frequencyCode: string;
  readonly triggerCode: string;
  readonly startsOn: string;
  readonly endsOn: string | null;
  readonly status: ProjectBillingPlanStatus;
  readonly currencyCode: string;
  readonly lines: readonly ProjectBillingPlanLineRef[];
  readonly totalPlannedAmount: number;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectStatusUpdateRef {
  readonly projectStatusUpdateId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly statusDate: string;
  readonly healthCode: ProjectStatusUpdateHealthCode;
  readonly progressPercent: number;
  readonly blockerCodes: readonly string[];
  readonly atRiskReason: string | null;
  readonly note: string | null;
  readonly sourceSystemCode: string;
  readonly externalStatusRef: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectCustomerContextRef {
  readonly customerId: string | null;
  readonly customerNo: string | null;
  readonly customerName: string | null;
  readonly activeOpportunityRef: string | null;
  readonly activeQuoteRef: string | null;
}

export interface ProjectProfitabilityAdjustmentRef {
  readonly projectProfitabilityAdjustmentId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly impactCode: ProjectProfitabilityAdjustmentImpactCode;
  readonly amount: number;
  readonly effectiveDate: string;
  readonly reasonCode: string;
  readonly note: string | null;
  readonly status: ProjectProfitabilityAdjustmentStatus;
  readonly approvedAt: string | null;
  readonly approvedByActorId: string | null;
  readonly rejectedAt: string | null;
  readonly rejectedByActorId: string | null;
  readonly rejectionReason: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectInvoiceReadinessAssessmentRef {
  readonly projectInvoiceReadinessAssessmentId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly cutoffDate: string;
  readonly status: ProjectInvoiceReadinessStatus;
  readonly blockerCodes: readonly string[];
  readonly reviewCodes: readonly string[];
  readonly approvedRevenuePlanId: string | null;
  readonly activeBillingPlanId: string | null;
  readonly invoiceReadyAmount: number;
  readonly eligibleBillingPlanAmount: number;
  readonly unbilledApprovedValueAmount: number;
  readonly approvedValueAmount: number;
  readonly billedRevenueAmount: number;
  readonly actualCostAmount: number;
  readonly currentMarginAmount: number;
  readonly pendingManualAdjustmentCount: number;
  readonly unresolvedChangeOrderCount: number;
  readonly snapshotHash: string;
  readonly assessedByActorId: string;
  readonly assessedAt: string;
}

export interface ProjectProfitabilitySnapshotRef {
  readonly projectProfitabilitySnapshotId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly cutoffDate: string;
  readonly reportingPeriod: string;
  readonly plannedRevenueAmount: number;
  readonly billedRevenueAmount: number;
  readonly recognizedRevenueAmount: number;
  readonly actualCostAmount: number;
  readonly currentMarginAmount: number;
  readonly forecastMarginAmount: number;
  readonly workPackageCount: number;
  readonly deliveryMilestoneCount: number;
  readonly openDeviationCount: number;
  readonly approvedRevenuePlanId: string | null;
  readonly sourceSnapshotRefs: {
    readonly costSnapshotId: string | null;
    readonly wipSnapshotId: string | null;
    readonly forecastSnapshotId: string | null;
  };
  readonly snapshotHash: string;
  readonly createdByActorId: string;
  readonly createdAt: string;
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

export interface ProjectCapacityReservationRef {
  readonly projectCapacityReservationId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly employmentId: string | null;
  readonly roleCode: string;
  readonly skillCodes: readonly string[];
  readonly startsOn: string;
  readonly endsOn: string;
  readonly reservedMinutes: number;
  readonly billableMinutes: number;
  readonly note: string | null;
  readonly status: ProjectCapacityReservationStatus;
  readonly approvedAt: string | null;
  readonly approvedByActorId: string | null;
  readonly releasedAt: string | null;
  readonly releasedByActorId: string | null;
  readonly cancelledAt: string | null;
  readonly cancelledByActorId: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectAssignmentPlanRef {
  readonly projectAssignmentPlanId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly employmentId: string | null;
  readonly projectWorkPackageId: string | null;
  readonly projectCapacityReservationId: string | null;
  readonly roleCode: string;
  readonly skillCodes: readonly string[];
  readonly startsOn: string;
  readonly endsOn: string;
  readonly plannedMinutes: number;
  readonly billableMinutes: number;
  readonly deliveryModeCode: string;
  readonly note: string | null;
  readonly status: ProjectAssignmentPlanStatus;
  readonly approvedAt: string | null;
  readonly approvedByActorId: string | null;
  readonly startedAt: string | null;
  readonly startedByActorId: string | null;
  readonly completedAt: string | null;
  readonly completedByActorId: string | null;
  readonly cancelledAt: string | null;
  readonly cancelledByActorId: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectRiskRef {
  readonly projectRiskId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly title: string;
  readonly description: string | null;
  readonly categoryCode: string;
  readonly severityCode: ProjectRiskSeverityCode;
  readonly probabilityCode: ProjectRiskProbabilityCode;
  readonly status: ProjectRiskStatus;
  readonly ownerEmployeeId: string | null;
  readonly mitigationPlan: string | null;
  readonly dueDate: string | null;
  readonly identifiedOn: string;
  readonly sourceProjectStatusUpdateId: string | null;
  readonly acceptedAt: string | null;
  readonly closedAt: string | null;
  readonly closedByActorId: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
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
    readonly employerContributionAmount: number;
    readonly materialAmount: number;
    readonly subcontractorAmount: number;
    readonly equipmentAmount: number;
    readonly overheadAmount: number;
    readonly otherAmount: number;
  };
  readonly sourceCounts: {
    readonly payRuns: number;
    readonly payRunLines: number;
    readonly payrollAllocations: number;
    readonly timeEntries: number;
    readonly invoices: number;
    readonly supplierInvoices: number;
    readonly supplierInvoiceLines: number;
    readonly profitabilityAdjustments: number;
    readonly husCases: number;
  };
  readonly snapshotHash: string;
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface ProjectPayrollCostAllocationRef {
  readonly projectPayrollCostAllocationId: string;
  readonly companyId: string;
  readonly projectId: string;
  readonly projectCostSnapshotId: string;
  readonly payRunId: string;
  readonly payRunLineId: string | null;
  readonly employmentId: string;
  readonly reportingPeriod: string;
  readonly payDate: string;
  readonly payItemCode: string | null;
  readonly sourceType: string;
  readonly sourceId: string | null;
  readonly processingStep: number | null;
  readonly costBucketCode: string;
  readonly allocationBasisCode: string;
  readonly allocationShare: number;
  readonly allocatedAmount: number;
  readonly sourceLineAmount: number | null;
  readonly contributionBaseAmount: number | null;
  readonly projectMinutes: number | null;
  readonly totalMinutes: number | null;
  readonly sourceLineIds: readonly string[];
  readonly dimensionJson: Record<string, unknown>;
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
