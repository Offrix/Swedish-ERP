import test from "node:test";
import assert from "node:assert/strict";
import {
  SUBMISSION_ATTEMPT_STATUSES,
  SUBMISSION_ENVELOPE_STATES,
  SUBMISSION_RECEIPT_TYPES,
  SUBMISSION_STATUSES,
  createRegulatedSubmissionsModule
} from "../../packages/domain-regulated-submissions/src/index.mjs";
import { createIntegrationPlatform } from "../../packages/domain-integrations/src/index.mjs";

test("Phase 13.2 exposes regulated submissions through canonical package boundary", () => {
  const module = createRegulatedSubmissionsModule({
    state: {
      submissions: new Map(),
      submissionIdsByCompany: new Map(),
      submissionIdsByReuseKey: new Map(),
      submissionAttempts: new Map(),
      submissionAttemptIdsBySubmission: new Map(),
      receipts: new Map(),
      receiptIdsBySubmission: new Map(),
      correctionLinks: new Map(),
      correctionLinkIdsByOriginalSubmission: new Map(),
      correctionLinkIdsByCorrectingSubmission: new Map(),
      submissionEvidencePacks: new Map(),
      queueItems: new Map(),
      queueItemIdsByCompany: new Map(),
      queueItemIdsBySubmission: new Map()
    },
    clock: () => new Date("2026-03-28T12:00:00Z")
  });

  assert.equal(Array.isArray(SUBMISSION_STATUSES), true);
  assert.equal(Array.isArray(SUBMISSION_ENVELOPE_STATES), true);
  assert.equal(Array.isArray(SUBMISSION_ATTEMPT_STATUSES), true);
  assert.equal(SUBMISSION_STATUSES.includes("submitted"), true);
  assert.equal(SUBMISSION_ENVELOPE_STATES.includes("queued"), true);
  assert.equal(SUBMISSION_ATTEMPT_STATUSES.includes("succeeded"), true);
  assert.equal(SUBMISSION_RECEIPT_TYPES.includes("technical_ack"), true);
  assert.equal(typeof module.prepareAuthoritySubmission, "function");
  assert.equal(typeof module.registerSubmissionReceipt, "function");
  assert.equal(typeof module.listSubmissionAttempts, "function");
});

test("Phase 13.2 integration platform composes regulated submissions via canonical package export", () => {
  const platform = createIntegrationPlatform({
    clock: () => new Date("2026-03-28T12:00:00Z")
  });

  assert.equal(Array.isArray(platform.submissionStatuses), true);
  assert.equal(platform.submissionStatuses.includes("submitted"), true);
  assert.equal(typeof platform.prepareAuthoritySubmission, "function");
  assert.equal(typeof platform.openSubmissionCorrection, "function");
  assert.equal(typeof platform.listSubmissionAttempts, "function");
});

test("Phase 13.2 canonical submission core persists attempts, canonical envelope and evidence-pack refs", async () => {
  const platform = createIntegrationPlatform({
    clock: () => new Date("2026-03-28T12:00:00Z")
  });

  let submission = platform.prepareAuthoritySubmission({
    companyId: "company-13-2",
    submissionType: "vat_declaration",
    sourceObjectType: "vat_return",
    sourceObjectId: "vat-return-1",
    payloadVersion: "phase13.2",
    providerKey: "skatteverket",
    recipientId: "skatteverket:vat",
    payload: {
      vatDecisionId: "vat-decision-1",
      sourceObjectVersion: "vat-return-1:v1"
    },
    actorId: "phase13-2-unit"
  });
  submission = platform.signAuthoritySubmission({
    companyId: "company-13-2",
    submissionId: submission.submissionId,
    actorId: "phase13-2-unit"
  });
  submission = await platform.submitAuthoritySubmission({
    companyId: "company-13-2",
    submissionId: submission.submissionId,
    actorId: "phase13-2-unit",
    mode: "test",
    simulatedTransportOutcome: "technical_ack"
  });

  assert.equal(submission.canonicalEnvelope.envelopeState, "technically_accepted");
  assert.equal(submission.attempts.length, 1);
  assert.equal(submission.attempts[0].attemptStageCode, "transport");
  assert.equal(submission.attempts[0].status, "succeeded");
  assert.equal(submission.attempts[0].legalEffect, true);

  submission = platform.registerSubmissionReceipt({
    companyId: "company-13-2",
    submissionId: submission.submissionId,
    receiptType: "business_ack",
    actorId: "phase13-2-unit"
  });

  assert.equal(submission.canonicalEnvelope.envelopeState, "materially_accepted");
  assert.equal(submission.attempts.length, 2);
  assert.equal(submission.attempts[1].attemptStageCode, "receipt_collection");
  assert.equal(submission.attempts[1].triggerCode, "manual_receipt");
  assert.equal(submission.currentEvidencePack.attemptRefs.length, 2);

  const attempts = platform.listSubmissionAttempts({
    companyId: "company-13-2",
    submissionId: submission.submissionId
  });
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0].submissionAttemptNo, 1);
  assert.equal(attempts[1].submissionAttemptNo, 2);
});
