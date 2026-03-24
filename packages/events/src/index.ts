export const EVENT_ENVELOPE_VERSION = 1;
export const AUDIT_EVENT_VERSION = 1;

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

export interface CreateEventEnvelopeInput<TPayload> {
  readonly eventId?: string;
  readonly eventType: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly occurredAt?: string | Date;
  readonly recordedAt?: string | Date;
  readonly companyId: string;
  readonly actorId: string;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly idempotencyKey?: string;
  readonly payload: TPayload;
}

export interface CreateAuditEnvelopeInput {
  readonly auditId?: string;
  readonly action: string;
  readonly result: "success" | "blocked" | "failed";
  readonly actorId: string;
  readonly companyId: string;
  readonly recordedAt?: string | Date;
  readonly entityType: string;
  readonly entityId: string;
  readonly explanation: string;
  readonly correlationId: string;
}

export declare function createEventEnvelope<TPayload>(input: CreateEventEnvelopeInput<TPayload>): EventEnvelope<TPayload>;
export declare function createAuditEnvelope(input: CreateAuditEnvelopeInput): AuditEvent;
export declare function isEventEnvelope(value: unknown): value is EventEnvelope<unknown>;
export declare function isAuditEnvelope(value: unknown): value is AuditEvent;
