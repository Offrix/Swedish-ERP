import test from "node:test";
import assert from "node:assert/strict";
import {
  SUBMISSION_ATTEMPT_STATUSES,
  SUBMISSION_ENVELOPE_STATES,
  SUBMISSION_RECEIPT_TYPES,
  SUBMISSION_STATUSES,
  SUBMISSION_TRANSPORT_SCENARIOS,
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
  assert.equal(SUBMISSION_TRANSPORT_SCENARIOS.includes("technical_ack"), true);
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
  assert.equal(submission.currentEvidencePack.signatureArchiveRefs.length, 1);
  assert.equal(typeof submission.currentEvidencePack.signatureArchiveRefs[0].signatureArchiveRef, "string");
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

test("Phase 13.3 submission transport resolves adapter metadata instead of live-path synthetic outcome injection", async () => {
  const platform = createIntegrationPlatform({
    clock: () => new Date("2026-03-28T12:30:00Z")
  });

  let submission = platform.prepareAuthoritySubmission({
    companyId: "company-13-3",
    submissionType: "agi_monthly",
    sourceObjectType: "agi_submission_period",
    sourceObjectId: "agi-period-2026-03",
    payloadVersion: "phase13.3",
    providerKey: "skatteverket",
    recipientId: "skatteverket:agi",
    payload: {
      sourceObjectVersion: "agi-period-2026-03:v1"
    },
    actorId: "phase13-3-unit",
    signedState: "not_required"
  });

  submission = await platform.submitAuthoritySubmission({
    companyId: "company-13-3",
    submissionId: submission.submissionId,
    actorId: "phase13-3-unit",
    mode: "test",
    transportScenarioCode: "technical_ack"
  });

  assert.equal(submission.lastTransportPlan.transportAdapterCode, "skatteverket_agi_adapter");
  assert.equal(submission.lastTransportPlan.transportRouteCode, "official_api");
  assert.equal(submission.lastTransportPlan.fallbackActivated, false);
  assert.equal(submission.attempts[0].transportAdapterCode, "skatteverket_agi_adapter");
  assert.equal(submission.attempts[0].transportScenarioCode, "technical_ack");
  assert.equal(submission.receipts[0].receiptType, "technical_ack");
});

test("Phase 13.3 production dispatch queues official fallback instead of fabricating technical receipts", async () => {
  const platform = createIntegrationPlatform({
    clock: () => new Date("2026-03-28T12:45:00Z")
  });

  let submission = platform.prepareAuthoritySubmission({
    companyId: "company-13-3-live",
    submissionType: "income_tax_return",
    sourceObjectType: "tax_declaration_package",
    sourceObjectId: "tax-package-13-3-live",
    payloadVersion: "phase13.3-live",
    providerKey: "skatteverket",
    recipientId: "skatteverket:income-tax",
    payload: {
      sourceObjectVersion: "tax-package-13-3-live:v1"
    },
    providerBaselineRefs: [
      {
        providerBaselineId: "annual-sru-export-se-2026.1",
        providerCode: "skatteverket",
        baselineCode: "SE-SRU-FILE",
        providerBaselineVersion: "2026.1",
        providerBaselineChecksum: "annual-sru-export-se-2026.1"
      }
    ],
    actorId: "phase13-3-unit",
    signedState: "signed"
  });

  submission = await platform.submitAuthoritySubmission({
    companyId: "company-13-3-live",
    submissionId: submission.submissionId,
    actorId: "phase13-3-unit",
    mode: "production"
  });

  assert.equal(submission.status, "submitted");
  assert.equal(submission.receipts.length, 0);
  assert.equal(submission.canonicalEnvelope.envelopeState, "awaiting_receipts");
  assert.equal(submission.lastTransportPlan.fallbackActivated, true);
  assert.equal(submission.lastTransportPlan.fallbackCode, "signed_sru_upload");
  assert.equal(submission.actionQueueItems.some((item) => item.actionType === "contact_provider"), true);
  assert.equal(submission.attempts[0].fallbackActivated, true);
});

test("Phase 13.6 trial mode auto-simulates deterministic regulated receipts with watermark and no legal effect", async () => {
  const platform = createIntegrationPlatform({
    clock: () => new Date("2026-03-28T13:10:00Z")
  });

  let submission = platform.prepareAuthoritySubmission({
    companyId: "company-13-6",
    submissionType: "agi_monthly",
    sourceObjectType: "agi_submission_period",
    sourceObjectId: "agi-period-2026-04",
    payloadVersion: "phase13.6",
    providerKey: "skatteverket",
    recipientId: "skatteverket:agi",
    payload: {
      sourceObjectVersion: "agi-period-2026-04:v1"
    },
    actorId: "phase13-6-unit",
    signedState: "not_required"
  });

  submission = await platform.submitAuthoritySubmission({
    companyId: "company-13-6",
    submissionId: submission.submissionId,
    actorId: "phase13-6-unit",
    mode: "trial"
  });

  assert.equal(submission.status, "accepted");
  assert.deepEqual(
    submission.receipts.map((receipt) => receipt.receiptType),
    ["technical_ack", "business_ack"]
  );
  assert.equal(submission.attempts.length, 2);
  assert.equal(submission.attempts.every((attempt) => attempt.legalEffect === false), true);
  assert.equal(submission.attempts.every((attempt) => attempt.watermarkCode === "TRIAL"), true);
  assert.equal(submission.receipts.every((receipt) => receipt.legalEffect === false), true);
  assert.equal(submission.receipts.every((receipt) => receipt.watermarkCode === "TRIAL"), true);
  assert.equal(submission.currentEvidencePack.watermark.watermarkCode, "TRIAL");
  assert.equal(submission.currentEvidencePack.trialSimulation.simulationProfileCode, "trial_agi_regulated_v1");
  assert.equal(submission.reconciliation.legalEffect, false);
  assert.equal(submission.reconciliation.watermarkCode, "TRIAL");

  assert.throws(() => {
    platform.executeSubmissionReceiptCollection({
      companyId: "company-13-6",
      submissionId: submission.submissionId,
      actorId: "phase13-6-unit",
      simulatedReceiptType: "business_nack"
    });
  }, (error) => error?.code === "submission_trial_receipt_override_forbidden");
});

test("Phase 13.6 annual trial simulation finalizes deterministically and forbids manual scenario override", async () => {
  const platform = createIntegrationPlatform({
    clock: () => new Date("2026-03-28T13:25:00Z")
  });

  let submission = platform.prepareAuthoritySubmission({
    companyId: "company-13-6-annual",
    submissionType: "income_tax_return",
    sourceObjectType: "tax_declaration_package",
    sourceObjectId: "tax-package-13-6",
    payloadVersion: "phase13.6-annual",
    providerKey: "skatteverket",
    recipientId: "skatteverket:income-tax",
    payload: {
      sourceObjectVersion: "tax-package-13-6:v1"
    },
    providerBaselineRefs: [
      {
        providerBaselineId: "annual-sru-export-se-2026.1",
        providerCode: "skatteverket",
        baselineCode: "SE-SRU-FILE",
        providerBaselineVersion: "2026.1",
        providerBaselineChecksum: "annual-sru-export-se-2026.1"
      }
    ],
    actorId: "phase13-6-unit",
    signedState: "signed"
  });

  submission = await platform.submitAuthoritySubmission({
    companyId: "company-13-6-annual",
    submissionId: submission.submissionId,
    actorId: "phase13-6-unit",
    mode: "trial"
  });

  assert.equal(submission.status, "finalized");
  assert.deepEqual(
    submission.receipts.map((receipt) => receipt.receiptType),
    ["technical_ack", "business_ack", "final_ack"]
  );
  assert.equal(submission.currentEvidencePack.trialSimulation.simulationProfileCode, "trial_annual_regulated_v1");

  let overrideCandidate = platform.prepareAuthoritySubmission({
    companyId: "company-13-6-annual",
    submissionType: "vat_declaration",
    sourceObjectType: "vat_return",
    sourceObjectId: "vat-return-13-6-override",
    payloadVersion: "phase13.6-override",
    providerKey: "skatteverket",
    recipientId: "skatteverket:vat",
    payload: {
      sourceObjectVersion: "vat-return-13-6-override:v1"
    },
    actorId: "phase13-6-unit"
  });
  overrideCandidate = platform.signAuthoritySubmission({
    companyId: "company-13-6-annual",
    submissionId: overrideCandidate.submissionId,
    actorId: "phase13-6-unit"
  });

  await assert.rejects(
    platform.submitAuthoritySubmission({
      companyId: "company-13-6-annual",
      submissionId: overrideCandidate.submissionId,
      actorId: "phase13-6-unit",
      mode: "trial",
      transportScenarioCode: "technical_nack"
    }),
    (error) => error?.code === "submission_trial_scenario_override_forbidden"
  );
});
