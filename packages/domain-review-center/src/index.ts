export type ReviewQueueStatus = "active" | "disabled";
export type ReviewQueuePriority = "low" | "medium" | "high" | "critical";
export type ReviewItemStatus =
  | "open"
  | "claimed"
  | "in_review"
  | "waiting_input"
  | "approved"
  | "rejected"
  | "escalated"
  | "closed";
export type ReviewDecisionCode = "approve" | "reject" | "escalate";
export type ReviewRiskClass = "low" | "medium" | "high" | "critical";
export type ReviewEscalationKind = "sla_breach" | "recurring_sla_breach";
export type ReviewRequiredDecisionType =
  | "classification"
  | "vat_treatment"
  | "payroll_treatment"
  | "tax_reconciliation"
  | "hus_outcome"
  | "generic_review";

export interface ReviewQueue {
  readonly reviewQueueId: string;
  readonly companyId: string;
  readonly queueCode: string;
  readonly label: string;
  readonly description: string | null;
  readonly ownerTeamId: string | null;
  readonly priority: ReviewQueuePriority;
  readonly escalationPolicyCode: string;
  readonly status: ReviewQueueStatus;
  readonly defaultRiskClass: ReviewRiskClass;
  readonly defaultSlaHours: number;
  readonly allowedSourceDomains: readonly string[];
  readonly requiredDecisionTypes: readonly ReviewRequiredDecisionType[];
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ReviewAssignment {
  readonly reviewAssignmentId: string;
  readonly companyId: string;
  readonly reviewItemId: string;
  readonly assignedUserId: string | null;
  readonly assignedTeamId: string | null;
  readonly assignedByActorId: string;
  readonly assignedAt: string;
  readonly reasonCode: string;
}

export interface ReviewDecision {
  readonly reviewDecisionId: string;
  readonly companyId: string;
  readonly reviewItemId: string;
  readonly queueCodeBeforeDecision: string;
  readonly decisionCode: ReviewDecisionCode;
  readonly resultingStatus: ReviewItemStatus;
  readonly decidedByActorId: string;
  readonly decidedAt: string;
  readonly reasonCode: string;
  readonly note: string | null;
  readonly overrideReasonCode: string | null;
  readonly decisionPayloadJson: Record<string, unknown>;
  readonly evidenceRefs: readonly string[];
  readonly resultingCommand: Record<string, unknown> | null;
  readonly targetQueueId: string | null;
  readonly targetQueueCode: string | null;
}

export interface ReviewItem {
  readonly reviewItemId: string;
  readonly companyId: string;
  readonly reviewQueueId: string;
  readonly queueCode: string;
  readonly reviewTypeCode: string;
  readonly sourceDomainCode: string;
  readonly sourceObjectType: string;
  readonly sourceObjectId: string;
  readonly sourceReference: string | null;
  readonly sourceObjectLabel: string | null;
  readonly requiredDecisionType: ReviewRequiredDecisionType;
  readonly riskClass: ReviewRiskClass;
  readonly title: string;
  readonly summary: string | null;
  readonly status: ReviewItemStatus;
  readonly policyCode: string | null;
  readonly requestedPayloadJson: Record<string, unknown>;
  readonly evidenceRefs: readonly string[];
  readonly actorContextJson: Record<string, unknown>;
  readonly claimedByActorId: string | null;
  readonly claimedAt: string | null;
  readonly waitingInputReasonCode: string | null;
  readonly waitingInputNote: string | null;
  readonly latestDecisionId: string | null;
  readonly latestAssignmentId: string | null;
  readonly escalationCount: number;
  readonly slaBreachCount: number;
  readonly lastSlaBreachAt: string | null;
  readonly lastEscalationId: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly slaDueAt: string;
  readonly closedAt: string | null;
  readonly closedByActorId: string | null;
  readonly metadataJson: Record<string, unknown>;
}

export interface ReviewEscalation {
  readonly reviewEscalationId: string;
  readonly companyId: string;
  readonly reviewItemId: string;
  readonly reviewQueueId: string;
  readonly queueCode: string;
  readonly escalationKind: ReviewEscalationKind;
  readonly escalationPolicyCode: string;
  readonly breachCount: number;
  readonly recurringBreach: boolean;
  readonly sourceStatus: ReviewItemStatus;
  readonly sourceSlaDueAt: string;
  readonly detectedAt: string;
  readonly actorId: string;
}
