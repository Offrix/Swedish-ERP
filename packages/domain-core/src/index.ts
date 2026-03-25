export interface DomainEnvelope {
  readonly companyId: string;
  readonly correlationId: string;
  readonly createdAt: string;
}

export interface BureauPortfolioMembership {
  readonly portfolioId: string;
  readonly bureauOrgId: string;
  readonly clientCompanyId: string;
  readonly responsibleConsultantId: string;
  readonly backupConsultantId: string | null;
  readonly statusProfile: string;
  readonly criticality: string;
  readonly activeFrom: string;
  readonly activeTo: string | null;
}

export interface BureauClientRequest {
  readonly requestId: string;
  readonly bureauOrgId: string;
  readonly portfolioId: string;
  readonly clientCompanyId: string;
  readonly requestType: string;
  readonly deadlineAt: string;
  readonly blockerScope: string;
  readonly status: string;
}

export interface BureauApprovalPackage {
  readonly approvalPackageId: string;
  readonly bureauOrgId: string;
  readonly portfolioId: string;
  readonly clientCompanyId: string;
  readonly approvalType: string;
  readonly approvalDeadlineAt: string;
  readonly status: string;
}

export interface CoreWorkItem {
  readonly workItemId: string;
  readonly bureauOrgId: string;
  readonly portfolioId: string;
  readonly clientCompanyId: string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly ownerCompanyUserId: string;
  readonly deadlineAt: string;
  readonly blockerScope: string;
  readonly status: string;
}

export interface CloseChecklistStep {
  readonly stepId: string;
  readonly stepCode: string;
  readonly title: string;
  readonly mandatory: boolean;
  readonly status: string;
  readonly ownerCompanyUserId: string;
  readonly deadlineAt: string;
  readonly evidenceType: string;
  readonly reconciliationAreaCode: string | null;
}

export interface CloseChecklist {
  readonly checklistId: string;
  readonly bureauOrgId: string;
  readonly portfolioId: string;
  readonly clientCompanyId: string;
  readonly accountingPeriodId: string;
  readonly checklistVersion: number;
  readonly status: string;
  readonly closeState: string;
  readonly ownerCompanyUserId: string;
  readonly deadlineAt: string;
  readonly signoffChain: readonly {
    readonly sequence: number;
    readonly companyUserId: string;
    readonly userId: string;
    readonly roleCode: string;
    readonly label: string;
  }[];
  readonly steps: readonly CloseChecklistStep[];
}

export interface CloseBlocker {
  readonly blockerId: string;
  readonly bureauOrgId: string;
  readonly checklistId: string;
  readonly stepId: string;
  readonly severity: string;
  readonly reasonCode: string;
  readonly status: string;
  readonly overrideState: string;
}

export interface CloseSignoffRecord {
  readonly signoffId: string;
  readonly checklistId: string;
  readonly sequence: number;
  readonly signatoryRole: string;
  readonly signatoryCompanyUserId: string;
  readonly signatoryUserId: string;
  readonly decision: string;
  readonly decisionAt: string;
}

export interface CloseReopenRequest {
  readonly reopenRequestId: string;
  readonly checklistId: string;
  readonly successorChecklistId: string;
  readonly requestedByUserId: string;
  readonly approvedByUserId: string;
  readonly approvedByRoleCode: string;
  readonly reasonCode: string;
  readonly impactSummary: string;
  readonly createdAt: string;
}

export interface SupportCase {
  readonly supportCaseId: string;
  readonly companyId: string;
  readonly category: string;
  readonly severity: string;
  readonly status: string;
  readonly policyScope: string;
  readonly approvedActions: readonly string[];
}

export interface AccessReviewBatch {
  readonly reviewBatchId: string;
  readonly companyId: string;
  readonly scopeType: string;
  readonly status: string;
  readonly generatedAt: string;
  readonly dueAt: string;
}

export interface FeatureFlagRecord {
  readonly featureFlagId: string;
  readonly companyId: string;
  readonly flagKey: string;
  readonly description: string;
  readonly flagType: string;
  readonly scopeType: string;
  readonly scopeRef: string | null;
  readonly defaultEnabled: boolean;
  readonly enabled: boolean;
  readonly ownerUserId: string;
  readonly riskClass: string;
  readonly sunsetAt: string;
  readonly emergencyDisabled: boolean;
  readonly emergencyReasonCode: string | null;
  readonly changeReason?: string | null;
  readonly approvalActorIds?: readonly string[];
  readonly changedByUserId?: string | null;
}

export interface EmergencyDisableRecord {
  readonly emergencyDisableId: string;
  readonly companyId: string;
  readonly flagKey: string;
  readonly scopeType: string;
  readonly scopeRef: string | null;
  readonly reasonCode: string;
  readonly requestedByUserId: string;
  readonly status: "active" | "released";
  readonly previousEnabled: boolean;
  readonly activatedAt: string;
  readonly expiresAt: string;
  readonly releasedByUserId: string | null;
  readonly releasedAt: string | null;
  readonly verificationSummary: string | null;
}

export interface MigrationImportBatch {
  readonly importBatchId: string;
  readonly companyId: string;
  readonly sourceSystem: string;
  readonly batchType: string;
  readonly status: string;
  readonly recordCount: number;
}

export interface PayrollMigrationBatch {
  readonly payrollMigrationBatchId: string;
  readonly companyId: string;
  readonly sourceSystemCode: string;
  readonly migrationMode: "test" | "live";
  readonly migrationScope: string;
  readonly status: string;
  readonly effectiveCutoverDate: string;
  readonly firstTargetReportingPeriod: string;
  readonly mappingSetId: string | null;
  readonly cutoverPlanId: string | null;
  readonly requiredBalanceTypeCodes: readonly string[];
  readonly requiredApprovalRoleCodes: readonly string[];
  readonly approvedForCutover: boolean;
  readonly approvedForCutoverAt: string | null;
  readonly approvedForCutoverByUserId: string | null;
  readonly executedAt: string | null;
  readonly rolledBackAt: string | null;
}

export interface PayrollEmployeeMigrationRecord {
  readonly employeeMigrationRecordId: string;
  readonly payrollMigrationBatchId: string;
  readonly companyId: string;
  readonly personId: string;
  readonly employeeId: string;
  readonly employmentId: string;
  readonly ytdBasis: Record<string, unknown>;
  readonly priorPayslipSummary: Record<string, unknown>;
  readonly agiCarryForwardBasis: Record<string, unknown>;
  readonly validationState: "pending" | "valid" | "blocking";
}

export interface PayrollMigrationBalanceBaseline {
  readonly balanceBaselineId: string;
  readonly payrollMigrationBatchId: string;
  readonly companyId: string;
  readonly employeeId: string | null;
  readonly employmentId: string | null;
  readonly ownerTypeCode: "company" | "employee" | "employment";
  readonly balanceTypeCode: string;
  readonly openingQuantity: number;
  readonly openingValue: number | null;
  readonly effectiveDate: string;
  readonly explicitZeroConfirmation: boolean;
}

export interface PayrollMigrationDiff {
  readonly payrollMigrationDiffId: string;
  readonly payrollMigrationBatchId: string;
  readonly companyId: string;
  readonly differenceType: string;
  readonly sourceValue: number;
  readonly targetValue: number;
  readonly differenceAmount: number;
  readonly status: "open" | "explained" | "accepted" | "blocking" | "resolved";
  readonly differenceDescription: string;
}
