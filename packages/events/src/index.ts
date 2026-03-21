export interface EventEnvelope<TPayload> {
  readonly eventId: string;
  readonly eventType: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly occurredAt: string;
  readonly recordedAt: string;
  readonly companyId: string;
  readonly actorId: string;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly idempotencyKey?: string;
  readonly payload: TPayload;
}

export interface AuditEvent {
  readonly auditId: string;
  readonly action: string;
  readonly result: "success" | "blocked" | "failed";
  readonly actorId: string;
  readonly companyId: string;
  readonly recordedAt: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly explanation: string;
  readonly correlationId: string;
}

