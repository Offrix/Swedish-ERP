export type SubmissionEnvelopeState =
  | "draft"
  | "locked"
  | "queued"
  | "submitted"
  | "awaiting_receipts"
  | "technically_accepted"
  | "technically_rejected"
  | "materially_accepted"
  | "materially_rejected"
  | "corrected"
  | "abandoned";

export type SubmissionAttemptStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped";

export type SubmissionTransportScenario =
  | "technical_ack"
  | "technical_nack"
  | "transport_failed"
  | "queued_only";

export interface SubmissionAttemptRef {
  readonly submissionAttemptId: string;
  readonly submissionId: string;
  readonly companyId: string;
  readonly submissionAttemptNo: number;
  readonly attemptStageCode: "transport" | "receipt_collection";
  readonly triggerCode: "initial_dispatch" | "replay" | "manual_receipt";
  readonly status: SubmissionAttemptStatus;
  readonly mode: string | null;
  readonly legalEffect: boolean;
  readonly watermarkCode?: string | null;
  readonly simulationProfileCode?: string | null;
  readonly simulationStepCode?: string | null;
  readonly simulatedByPolicyCode?: string | null;
  readonly payloadHash: string;
  readonly providerKey: string;
  readonly providerReference: string | null;
  readonly transportAdapterCode?: string | null;
  readonly transportRouteCode?: string | null;
  readonly officialChannelCode?: string | null;
  readonly fallbackCode?: string | null;
  readonly fallbackActivated?: boolean;
  readonly transportScenarioCode?: SubmissionTransportScenario | null;
  readonly receiptType: string | null;
  readonly queuedJobId: string | null;
  readonly replayReasonCode: string | null;
  readonly actorId: string;
  readonly requestedAt: string;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
}

export interface SubmissionEvidencePackRef {
  readonly submissionEvidencePackId: string;
  readonly submissionId: string;
  readonly companyId: string;
  readonly checksum: string | null;
  readonly status: string | null;
  readonly frozenAt: string | null;
  readonly archivedAt: string | null;
  readonly watermark?: Record<string, unknown> | null;
  readonly trialSimulation?: Record<string, unknown> | null;
}
