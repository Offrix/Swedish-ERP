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

export interface OperationalWorkItemStatusTransition {
  readonly fromStatus: string | null;
  readonly toStatus: string;
  readonly actorId: string;
  readonly reasonCode: string;
  readonly changedAt: string;
}

export interface OperationalWorkItem {
  readonly workItemId: string;
  readonly companyId: string;
  readonly queueCode: string;
  readonly ownerTeamId: string | null;
  readonly ownerCompanyUserId: string | null;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly title: string;
  readonly summary: string | null;
  readonly priority: "low" | "medium" | "high" | "critical";
  readonly deadlineAt: string;
  readonly blockerScope: string;
  readonly status: string;
  readonly escalationPolicyCode: string | null;
  readonly escalationCount: number;
  readonly lastEscalatedAt: string | null;
  readonly lastEscalationReasonCode: string | null;
  readonly dualControlRequired: boolean;
  readonly dualControlStatus: "not_required" | "pending" | "approved";
  readonly dualApprovedAt: string | null;
  readonly dualApprovedByCompanyUserId: string | null;
  readonly claimedAt: string | null;
  readonly claimedByCompanyUserId: string | null;
  readonly resolvedAt: string | null;
  readonly resolvedByCompanyUserId: string | null;
  readonly resolutionCode: string | null;
  readonly completionNote: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly metadataJson: Record<string, unknown>;
  readonly slaDueAt?: string;
  readonly isOverdue?: boolean;
  readonly dualControlBlocked?: boolean;
  readonly queueGrantManaged?: boolean;
  readonly queueGrantCompanyUserIds?: readonly string[];
  readonly statusHistory: readonly OperationalWorkItemStatusTransition[];
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

export interface CloseRequirementStepBlueprint {
  readonly stepCode: string;
  readonly title: string;
  readonly mandatory: boolean;
  readonly evidenceType: string;
  readonly reconciliationAreaCode: string | null;
}

export interface CloseRequirementSnapshot {
  readonly companyId: string;
  readonly legalFormProfileId: string | null;
  readonly legalFormCode: string | null;
  readonly reportingObligationProfileId: string | null;
  readonly fiscalYearKey: string | null;
  readonly fiscalYearId: string | null;
  readonly accountingPeriodId: string | null;
  readonly declarationProfileCode: string | null;
  readonly filingProfileCode: string | null;
  readonly signatoryClassCode: string | null;
  readonly packageFamilyCode: string | null;
  readonly requiresAnnualReport: boolean;
  readonly requiresYearEndAccounts: boolean;
  readonly allowsSimplifiedYearEnd: boolean;
  readonly requiresBolagsverketFiling: boolean;
  readonly requiresTaxDeclarationPackage: boolean;
  readonly isFiscalYearEnd: boolean;
  readonly closeTemplateCode: string;
  readonly mandatoryStepBlueprints: readonly CloseRequirementStepBlueprint[];
}

export interface CloseChecklist {
  readonly checklistId: string;
  readonly bureauOrgId: string;
  readonly portfolioId: string;
  readonly clientCompanyId: string;
  readonly accountingPeriodId: string;
  readonly checklistTemplateCode: string;
  readonly checklistVersion: number;
  readonly status: string;
  readonly closeState: string;
  readonly ownerCompanyUserId: string;
  readonly deadlineAt: string;
  readonly closeRequirementSnapshot: CloseRequirementSnapshot;
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
  readonly expired?: boolean;
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
  readonly employeeMasterSnapshot: Record<string, unknown> | null;
  readonly employmentHistory: readonly Record<string, unknown>[];
  readonly absenceHistory: readonly Record<string, unknown>[];
  readonly ytdBasis: Record<string, unknown>;
  readonly priorPayslipSummary: Record<string, unknown>;
  readonly agiCarryForwardBasis: Record<string, unknown>;
  readonly benefitHistory: readonly Record<string, unknown>[];
  readonly travelHistory: readonly Record<string, unknown>[];
  readonly pensionHistory: readonly Record<string, unknown>[];
  readonly agreementSnapshot: Record<string, unknown> | null;
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

export interface CanonicalRepositoryRecord<TPayload = Record<string, unknown>> {
  readonly tableName: string;
  readonly boundedContextCode: string;
  readonly objectType: string;
  readonly companyId: string;
  readonly objectId: string;
  readonly status: string | null;
  readonly payload: TPayload;
  readonly objectVersion: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastActorId: string | null;
  readonly lastCorrelationId: string | null;
}

export interface CanonicalRepository<TPayload = Record<string, unknown>> {
  get(input: { readonly companyId: string; readonly objectId: string }): Promise<CanonicalRepositoryRecord<TPayload> | null>;
  list(input: { readonly companyId: string }): Promise<readonly CanonicalRepositoryRecord<TPayload>[]>;
  save(input: {
    readonly companyId: string;
    readonly objectId: string;
    readonly status?: string | null;
    readonly payload: TPayload;
    readonly expectedObjectVersion?: number | null;
    readonly actorId?: string | null;
    readonly correlationId?: string | null;
    readonly recordedAt?: string | Date | null;
  }): Promise<CanonicalRepositoryRecord<TPayload>>;
  delete(input: {
    readonly companyId: string;
    readonly objectId: string;
    readonly expectedObjectVersion: number;
  }): Promise<CanonicalRepositoryRecord<TPayload>>;
}

export interface CommandReceiptRecord<TPayload = Record<string, unknown>> {
  readonly commandReceiptId: string;
  readonly companyId: string;
  readonly commandType: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly expectedObjectVersion: number | null;
  readonly resultingObjectVersion: number | null;
  readonly actorId: string;
  readonly sessionRevision: number;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly payloadHash: string;
  readonly commandPayload: TPayload;
  readonly metadata: Record<string, unknown>;
  readonly status: string;
  readonly recordedAt: string;
  readonly processedAt: string;
}

export interface OutboxMessageRecord<TPayload = Record<string, unknown>> {
  readonly eventId: string;
  readonly companyId: string;
  readonly eventType: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly commandReceiptId: string | null;
  readonly payload: TPayload;
  readonly occurredAt: string;
  readonly recordedAt: string;
  readonly publishedAt: string | null;
  readonly actorId: string;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly idempotencyKey: string | null;
  readonly status: string;
}

export interface InboxMessageRecord<TPayload = Record<string, unknown>> {
  readonly inboxMessageId: string;
  readonly companyId: string;
  readonly sourceSystem: string;
  readonly messageId: string;
  readonly aggregateType: string | null;
  readonly aggregateId: string | null;
  readonly payloadHash: string;
  readonly payload: TPayload;
  readonly correlationId: string | null;
  readonly causationId: string | null;
  readonly actorId: string | null;
  readonly status: string;
  readonly receivedAt: string;
  readonly processedAt: string | null;
  readonly errorCode: string | null;
}

export interface MoneyAmount {
  readonly amountMinor: number;
  readonly currencyCode: string;
  readonly scale: number;
  readonly source: string;
  readonly amount: number;
}

export interface Rate {
  readonly numerator: number;
  readonly denominator: number;
  readonly precision: number;
  readonly source: string;
  readonly value: number;
}

export interface Quantity {
  readonly value: number;
  readonly precision: number;
  readonly source: string;
}

export interface FxRate {
  readonly baseCurrency: string;
  readonly quoteCurrency: string;
  readonly rate: number;
  readonly rateScale: number;
  readonly source: string;
  readonly observedAt: string | null;
}

export declare const VALUE_KERNEL_VERSION: string;

export declare function roundMoney(value: unknown): number;
export declare function normalizeAmount(value: unknown, code?: string): number;
export declare function normalizePositiveAmount(value: unknown, code?: string): number;
export declare function normalizeSignedAmount(value: unknown, code?: string): number;
export declare function roundRate(value: unknown, precision?: number): number;
export declare function roundQuantity(value: unknown, precision?: number): number;
export declare function amountToMinorUnits(value: unknown, scale?: number): number;
export declare function minorUnitsToAmount(value: unknown, scale?: number): number;
export declare function createValueKernelError(code: string, message: string): Error & { readonly code: string; readonly status: number };
export declare function createMoneyAmount(
  value: unknown,
  options?: {
    readonly currencyCode?: string;
    readonly scale?: number;
    readonly source?: string;
  }
): MoneyAmount;
export declare function createRate(
  value: unknown,
  options?: {
    readonly precision?: number;
    readonly source?: string;
  }
): Rate;
export declare function createQuantity(
  value: unknown,
  options?: {
    readonly precision?: number;
    readonly source?: string;
  }
): Quantity;
export declare function createFxRate(input: {
  readonly baseCurrency: string;
  readonly quoteCurrency: string;
  readonly rate: unknown;
  readonly rateScale?: number;
  readonly source?: string;
  readonly observedAt?: string | Date | null;
}): FxRate;

export declare function cloneValue<T>(value: T): T;
export declare function cloneSnapshotValue<T>(value: T): T;
export declare function serializeSnapshotValue(value: unknown): unknown;
export declare function deserializeSnapshotValue<T = unknown>(value: unknown): T;
