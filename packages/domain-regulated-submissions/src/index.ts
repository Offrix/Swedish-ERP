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
  readonly payloadHash: string;
  readonly providerKey: string;
  readonly providerReference: string | null;
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
}
