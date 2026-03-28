import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { runWorkerBatch } from "../../apps/worker/src/worker.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 13.2 API exposes canonical submission attempts and evidence-pack state", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-28T15:00:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });

    const created = await requestJson(baseUrl, "/v1/submissions", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        submissionType: "vat_declaration",
        sourceObjectType: "vat_return",
        sourceObjectId: "vat-return-phase13-2",
        payloadVersion: "phase13.2",
        providerKey: "skatteverket",
        recipientId: "skatteverket:vat",
        payload: {
          sourceObjectVersion: "vat-return-phase13-2:v1",
          vatDecisionId: "vat-decision-phase13-2"
        }
      }
    });

    await requestJson(baseUrl, `/v1/submissions/${created.submissionId}/sign`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    const queued = await requestJson(baseUrl, `/v1/submissions/${created.submissionId}/submit`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        simulatedTransportOutcome: "technical_ack"
      }
    });
    assert.equal(queued.transportQueued, true);

    await runWorkerBatch({
      platform,
      logger: () => {},
      workerId: "phase13-2-regulated-submission-core"
    });

    const submission = await requestJson(baseUrl, `/v1/submissions/${created.submissionId}?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(submission.canonicalEnvelope.envelopeState, "technically_accepted");
    assert.equal(submission.attempts.length, 1);
    assert.equal(submission.attempts[0].attemptStageCode, "transport");
    assert.equal(submission.attempts[0].status, "succeeded");

    const attempts = await requestJson(
      baseUrl,
      `/v1/submissions/${created.submissionId}/attempts?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );
    assert.equal(attempts.items.length, 1);
    assert.equal(attempts.items[0].submissionAttemptNo, 1);
    assert.equal(attempts.items[0].legalEffect, true);

    const evidencePack = await requestJson(
      baseUrl,
      `/v1/submissions/${created.submissionId}/evidence-pack?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );
    assert.equal(evidencePack.envelopeState, "technically_accepted");
    assert.equal(evidencePack.attemptRefs.length, 1);
    assert.equal(evidencePack.attemptRefs[0].attemptStageCode, "transport");
  } finally {
    await stopServer(server);
  }
});

test("Phase 13.3 API keeps production transport on official fallback path without synthetic technical receipts", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-28T15:20:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });

    const created = await requestJson(baseUrl, "/v1/submissions", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        submissionType: "income_tax_return",
        sourceObjectType: "tax_declaration_package",
        sourceObjectId: "tax-package-phase13-3",
        payloadVersion: "phase13.3",
        providerKey: "skatteverket",
        recipientId: "skatteverket:income-tax",
        providerBaselineRefs: [
          {
            providerBaselineId: "annual-sru-export-se-2026.1",
            providerCode: "skatteverket",
            baselineCode: "SE-SRU-FILE",
            providerBaselineVersion: "2026.1",
            providerBaselineChecksum: "annual-sru-export-se-2026.1"
          }
        ],
        payload: {
          sourceObjectVersion: "tax-package-phase13-3:v1"
        }
      }
    });

    await requestJson(baseUrl, `/v1/submissions/${created.submissionId}/sign`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });

    const queued = await requestJson(baseUrl, `/v1/submissions/${created.submissionId}/submit`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        mode: "production"
      }
    });
    assert.equal(queued.transportQueued, true);

    await runWorkerBatch({
      platform,
      logger: () => {},
      workerId: "phase13-3-regulated-submission-core"
    });

    const submission = await requestJson(baseUrl, `/v1/submissions/${created.submissionId}?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(submission.status, "submitted");
    assert.equal(submission.canonicalEnvelope.envelopeState, "awaiting_receipts");
    assert.equal(submission.receipts.length, 0);
    assert.equal(submission.lastTransportPlan.fallbackActivated, true);
    assert.equal(submission.attempts[0].fallbackActivated, true);
    assert.equal(submission.actionQueueItems.some((item) => item.actionType === "contact_provider"), true);
  } finally {
    await stopServer(server);
  }
});
