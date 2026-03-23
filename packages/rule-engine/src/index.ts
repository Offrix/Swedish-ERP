export interface RulePackRef {
  readonly rulePackId: string;
  readonly domain: string;
  readonly jurisdiction: string;
  readonly version: string;
  readonly effectiveFrom: string;
  readonly effectiveTo?: string | null;
  readonly checksum: string;
  readonly sourceSnapshotDate: string;
  readonly semanticChangeSummary: string;
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
  readonly warnings: readonly RuleWarning[];
  readonly needsManualReview: boolean;
  readonly generatedAt: string;
}

export interface RuleEvaluator<TContext, TDecision> {
  evaluate(context: TContext): RuleDecision<TDecision>;
}

export interface RulePackDefinition {
  readonly rulePackId: string;
  readonly domain: string;
  readonly jurisdiction: string;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly version: string;
  readonly checksum: string;
  readonly sourceSnapshotDate: string;
  readonly semanticChangeSummary: string;
  readonly machineReadableRules: Record<string, unknown>;
  readonly humanReadableExplanation: readonly string[];
  readonly testVectors: readonly Record<string, unknown>[];
  readonly migrationNotes: readonly string[];
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
