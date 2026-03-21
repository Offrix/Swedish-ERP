export interface SubmissionRequest {
  readonly companyId: string;
  readonly channel: string;
  readonly payloadType: string;
  readonly payloadVersion: string;
  readonly payload: unknown;
  readonly correlationId: string;
}

export interface SubmissionReceipt {
  readonly receiptId: string;
  readonly externalReference?: string;
  readonly status: "accepted" | "rejected" | "queued";
  readonly receivedAt: string;
  readonly rawSnapshotRef?: string;
}

export interface SubmissionPort {
  submit(request: SubmissionRequest): Promise<SubmissionReceipt>;
}

