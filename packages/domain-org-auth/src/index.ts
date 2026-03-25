export interface OrganizationScope {
  readonly companyId: string;
  readonly roleCodes: readonly string[];
  readonly delegationIds: readonly string[];
}

export interface OnboardingChecklistStep {
  readonly stepCode: string;
  readonly status: "pending" | "completed";
  readonly completedAt?: string;
}

export interface OnboardingRunSummary {
  readonly runId: string;
  readonly companyId: string;
  readonly status: "in_progress" | "completed";
  readonly currentStep: string;
  readonly checklist: readonly OnboardingChecklistStep[];
}

export interface TenantSetupProfile {
  readonly tenantSetupProfileId: string;
  readonly companyId: string;
  readonly onboardingRunId: string | null;
  readonly status: "setup_pending" | "active" | "suspended";
  readonly onboardingCompletedAt: string | null;
  readonly approvedAt: string | null;
  readonly suspendedAt: string | null;
  readonly suspendedReasonCode: string | null;
}

export interface ModuleDefinition {
  readonly moduleDefinitionId: string;
  readonly companyId: string;
  readonly moduleCode: string;
  readonly label: string;
  readonly riskClass: "low" | "medium" | "high";
  readonly coreModule: boolean;
  readonly dependencyModuleCodes: readonly string[];
  readonly requiredPolicyCodes: readonly string[];
  readonly requiredRulepackCodes: readonly string[];
  readonly requiresCompletedTenantSetup: boolean;
  readonly allowSuspend: boolean;
}

export interface ModuleActivation {
  readonly moduleActivationId: string;
  readonly companyId: string;
  readonly moduleCode: string;
  readonly status: "scheduled" | "active" | "suspended";
  readonly effectiveFrom: string;
  readonly activationReason: string;
  readonly approvalActorIds: readonly string[];
  readonly requestedByUserId: string;
  readonly activatedAt: string | null;
  readonly suspendedAt: string | null;
  readonly suspendedReasonCode: string | null;
}
