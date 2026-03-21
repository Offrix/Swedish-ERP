export type LedgerState = "draft" | "validated" | "posted" | "reversed" | "locked_by_period";

export interface PostingIntent {
  readonly sourceType: string;
  readonly sourceId: string;
  readonly companyId: string;
  readonly occurredAt: string;
  readonly idempotencyKey: string;
}

