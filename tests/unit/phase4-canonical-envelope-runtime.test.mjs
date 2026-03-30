import test from "node:test";
import assert from "node:assert/strict";
import {
  createCommandEnvelope,
  createErrorEnvelope,
  createEventEnvelope,
  createReceiptEnvelope,
  isCommandEnvelope,
  isErrorEnvelope,
  isEventEnvelope,
  isReceiptEnvelope
} from "../../packages/events/src/index.mjs";

test("Phase 4.1 canonical envelope factories emit immutable command, event, receipt and error envelopes", () => {
  const commandEnvelope = createCommandEnvelope({
    commandId: "command_1",
    commandType: "payroll.tax_decision.approve",
    aggregateType: "tax_decision",
    aggregateId: "decision_1",
    companyId: "company_1",
    actorId: "user_1",
    sessionRevision: 8,
    correlationId: "corr_1",
    idempotencyKey: "idem_1",
    recordedAt: "2026-03-30T09:00:00.000Z",
    commandPayload: {
      decisionId: "decision_1",
      decisionType: "tabell"
    },
    metadata: {
      surfaceCode: "api"
    }
  });
  const eventEnvelope = createEventEnvelope({
    eventId: "event_1",
    eventType: "payroll.tax_decision.approved",
    aggregateType: "tax_decision",
    aggregateId: "decision_1",
    occurredAt: "2026-03-30T09:00:01.000Z",
    companyId: "company_1",
    actorId: "user_1",
    correlationId: "corr_1",
    causationId: commandEnvelope.commandId,
    idempotencyKey: "idem_1",
    payload: {
      decisionId: "decision_1"
    }
  });
  const receiptEnvelope = createReceiptEnvelope({
    receiptId: "receipt_1",
    receiptType: "command_receipt",
    status: "accepted",
    companyId: "company_1",
    actorId: "user_1",
    correlationId: "corr_1",
    causationId: commandEnvelope.commandId,
    idempotencyKey: "idem_1",
    commandId: commandEnvelope.commandId,
    commandType: commandEnvelope.commandType,
    aggregateType: "tax_decision",
    aggregateId: "decision_1",
    recordedAt: "2026-03-30T09:00:02.000Z",
    payload: {
      commandReceiptId: "receipt_1",
      resultingObjectVersion: 3
    }
  });
  const errorEnvelope = createErrorEnvelope({
    errorId: "error_1",
    errorCode: "tax_decision_denied",
    message: "Tax decision cannot be approved twice.",
    httpStatus: 409,
    classification: "validation",
    retryable: false,
    reviewRequired: true,
    denialReasonCode: "tax_decision_denied",
    supportRef: "support_1",
    details: [
      {
        code: "already_approved",
        field: "taxDecisionId",
        message: "Decision already approved."
      }
    ],
    correlationId: "corr_1",
    causationId: commandEnvelope.commandId,
    idempotencyKey: "idem_1",
    surfaceCode: "api",
    recordedAt: "2026-03-30T09:00:03.000Z"
  });

  assert.equal(Object.isFrozen(commandEnvelope), true);
  assert.equal(Object.isFrozen(eventEnvelope), true);
  assert.equal(Object.isFrozen(receiptEnvelope), true);
  assert.equal(Object.isFrozen(errorEnvelope), true);
  assert.equal(isCommandEnvelope(commandEnvelope), true);
  assert.equal(isEventEnvelope(eventEnvelope), true);
  assert.equal(isReceiptEnvelope(receiptEnvelope), true);
  assert.equal(isErrorEnvelope(errorEnvelope), true);
  assert.equal(commandEnvelope.commandEnvelopeVersion, 1);
  assert.equal(eventEnvelope.eventEnvelopeVersion, 1);
  assert.equal(receiptEnvelope.receiptEnvelopeVersion, 1);
  assert.equal(errorEnvelope.errorEnvelopeVersion, 1);
  assert.equal(errorEnvelope.code, "tax_decision_denied");
});
