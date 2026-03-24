export interface RulePackRef {
  readonly rulePackId: string;
  readonly rulePackCode: string;
  readonly immutableVersionId: string;
  readonly domain: string;
  readonly jurisdiction: string;
  readonly status: RulePackStatus;
  readonly version: string;
  readonly effectiveFrom: string;
  readonly effectiveTo?: string | null;
  readonly payloadSchemaVersion: string;
  readonly approvalRef?: string | null;
  readonly changeReason: string;
  readonly supersedesVersion?: string | null;
  readonly rollbackPolicy: string;
  readonly testVectorSetId?: string | null;
  readonly createdBy: string;
  readonly approvedBy?: string | null;
  readonly publishedAt?: string | null;
  readonly retiredAt?: string | null;
  readonly checksum: string;
  readonly sourceSnapshotDate: string;
  readonly semanticChangeSummary: string;
  readonly selectionMode?: RulePackSelectionMode | null;
  readonly rollbackId?: string | null;
}

export interface RuleWarning {
  readonly code: string;
  readonly message: string;
}

export interface RuleDecision<TDecision> {
  readonly decisionCode: string;
  readonly inputsHash: string;
  readonly effectiveDate: string;
  readonly outputs: TDecision;
  readonly explanation: readonly string[];
  readonly rulePackId: string;
  readonly rulePackCode: string;
  readonly rulePackVersion: string;
  readonly selectionMode: RulePackSelectionMode;
  readonly warnings: readonly RuleWarning[];
  readonly needsManualReview: boolean;
  readonly generatedAt: string;
}

export interface RuleEvaluator<TContext, TDecision> {
  evaluate(context: TContext): RuleDecision<TDecision>;
}

export interface RulePackDefinition {
  readonly rulePackId: string;
  readonly rulePackCode?: string;
  readonly immutableVersionId?: string;
  readonly domain: string;
  readonly jurisdiction: string;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly version: string;
  readonly status?: RulePackStatus;
  readonly payloadSchemaVersion?: string;
  readonly approvalRef?: string | null;
  readonly changeReason?: string;
  readonly supersedesVersion?: string | null;
  readonly rollbackPolicy?: string;
  readonly testVectorSetId?: string | null;
  readonly createdBy?: string;
  readonly approvedBy?: string | null;
  readonly publishedAt?: string | null;
  readonly retiredAt?: string | null;
  readonly checksum: string;
  readonly sourceSnapshotDate: string;
  readonly semanticChangeSummary: string;
  readonly machineReadableRules: Record<string, unknown>;
  readonly humanReadableExplanation: readonly string[];
  readonly testVectors: readonly Record<string, unknown>[];
  readonly migrationNotes: readonly string[];
  readonly companyTypes?: readonly string[];
  readonly registrationCodes?: readonly string[];
  readonly groupCodes?: readonly string[];
  readonly specialCaseCodes?: readonly string[];
}

export type RulePackStatus = "draft" | "validated" | "approved" | "published" | "retired" | "emergency_disabled";
export type RulePackSelectionMode = "effective_date" | "rollback_override" | "exact_version";
export type RulePackRollbackStatus = "planned" | "activated" | "superseded" | "cancelled";

export interface RulePackRollbackRecord {
  readonly rollbackId: string;
  readonly rulePackCode: string;
  readonly targetRulePackId: string;
  readonly domain: string;
  readonly jurisdiction: string;
  readonly effectiveFrom: string;
  readonly status: RulePackRollbackStatus;
  readonly actorId: string;
  readonly reasonCode: string;
  readonly replayRequired: boolean;
  readonly createdAt: string;
}

export type AutomationDecisionType = "posting_suggestion" | "classification" | "anomaly_detection";
export type AutomationDecisionState = "proposed" | "manual_override" | "accepted";

export interface AutomationDecision<TDecision> extends RuleDecision<TDecision> {
  readonly decisionId: string;
  readonly companyId: string;
  readonly decisionType: AutomationDecisionType;
  readonly state: AutomationDecisionState;
  readonly actorId: string;
  readonly confidence: number;
}
