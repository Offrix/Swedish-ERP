export interface RulePackRef {
  readonly packId: string;
  readonly version: string;
  readonly validFrom: string;
  readonly validTo?: string;
}

export interface RuleWarning {
  readonly code: string;
  readonly message: string;
}

export interface RuleDecision<TDecision> {
  readonly decision: TDecision;
  readonly explanation: string;
  readonly rulePack: RulePackRef;
  readonly warnings: readonly RuleWarning[];
  readonly needsManualReview: boolean;
}

export interface RuleEvaluator<TContext, TDecision> {
  evaluate(context: TContext): RuleDecision<TDecision>;
}

