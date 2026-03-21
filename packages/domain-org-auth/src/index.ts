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
