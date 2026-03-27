export const EVENT_ENVELOPE_VERSION = 1;
export const AUDIT_EVENT_VERSION = 2;

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
  readonly auditEventId: string;
  readonly auditEnvelopeVersion: number;
  readonly action: string;
  readonly result: "success" | "blocked" | "failed";
  readonly actorId: string;
  readonly actorType: string;
  readonly sessionId?: string;
  readonly companyId: string;
  readonly recordedAt: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly explanation: string;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly auditClass: string;
  readonly metadata: Record<string, unknown>;
  readonly integrityHash: string;
  readonly [key: string]: unknown;
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
  readonly result?: string;
  readonly actorId: string;
  readonly actorType?: "user" | "system" | "support" | "service";
  readonly sessionId?: string;
  readonly companyId: string;
  readonly recordedAt?: string | Date;
  readonly entityType: string;
  readonly entityId: string;
  readonly explanation: string;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly auditClass?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface CreateAuditEnvelopeFromLegacyEventInput {
  readonly event: Record<string, unknown>;
  readonly clock?: () => string | Date;
  readonly auditClass?: string;
  readonly actorType?: "user" | "system" | "support" | "service";
  readonly sessionId?: string;
}

export declare function createEventEnvelope<TPayload>(input: CreateEventEnvelopeInput<TPayload>): EventEnvelope<TPayload>;
export declare function createAuditEnvelope(input: CreateAuditEnvelopeInput): AuditEvent;
export declare function createAuditEnvelopeFromLegacyEvent(input: CreateAuditEnvelopeFromLegacyEventInput): AuditEvent;
export declare function isEventEnvelope(value: unknown): value is EventEnvelope<unknown>;
export declare function isAuditEnvelope(value: unknown): value is AuditEvent;
