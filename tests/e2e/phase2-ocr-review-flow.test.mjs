import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

test("Phase 2.3 OCR routes can be disabled and support review-driven correction with rerun history", async () => {
  const now = new Date("2026-03-21T17:30:00Z");
  const platform = createApiPlatform({
    clock: () => now
  });
  const enabledServer = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase2DocumentArchiveEnabled: true,
      phase2CompanyInboxEnabled: true,
      phase2OcrReviewEnabled: true
    }
  });
  const disabledServer = createApiServer({
    platform: createApiPlatform({
      clock: () => now
    }),
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase2DocumentArchiveEnabled: true,
      phase2CompanyInboxEnabled: true,
      phase2OcrReviewEnabled: false
    }
  });

  await new Promise((resolve) => enabledServer.listen(0, resolve));
  await new Promise((resolve) => disabledServer.listen(0, resolve));
  const enabledBaseUrl = `http://127.0.0.1:${enabledServer.address().port}`;
  const disabledBaseUrl = `http://127.0.0.1:${disabledServer.address().port}`;

  try {
    const root = await requestJson(enabledBaseUrl, "/");
    assert.equal(root.phase2OcrReviewEnabled, true);
    assert.equal(root.routes.includes("/v1/documents/:documentId/ocr/runs"), true);

    const disabledAttempt = await fetch(`${disabledBaseUrl}/v1/documents/doc-1/ocr/runs`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        companyId: "00000000-0000-4000-8000-000000000001"
      })
    });
    const disabledPayload = await disabledAttempt.json();
    assert.equal(disabledAttempt.status, 503);
    assert.equal(disabledPayload.error, "feature_disabled");

    const sessionToken = await loginWithStrongAuth({
      baseUrl: enabledBaseUrl,
      platform,
      companyId: "00000000-0000-4000-8000-000000000001",
      email: DEMO_ADMIN_EMAIL
    });

    await requestJson(enabledBaseUrl, "/v1/inbox/channels", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        channelCode: "ocr_inbox",
        inboundAddress: "ocr@inbound.example.test",
        useCase: "documents_inbox",
        allowedMimeTypes: ["application/pdf"],
        maxAttachmentSizeBytes: 1048576,
        classificationConfidenceThreshold: 0.9,
        fieldConfidenceThreshold: 0.9
      }
    });

    const ingested = await requestJson(enabledBaseUrl, "/v1/inbox/messages", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        recipientAddress: "ocr@inbound.example.test",
        messageId: "<phase2-ocr-e2e-001@inbound.example.test>",
        rawStorageKey: "raw-mail/phase2-ocr-e2e-001.eml",
        attachments: [
          {
            filename: "mystery.pdf",
            mimeType: "application/pdf",
            storageKey: "documents/originals/mystery.pdf",
            contentText: "Document total 100.00"
          }
        ]
      }
    });
    const documentId = ingested.routedDocuments[0].documentId;

    const reviewRun = await requestJson(enabledBaseUrl, `/v1/documents/${documentId}/ocr/runs`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001"
      }
    });
    assert.equal(reviewRun.reviewTask.status, "open");
    assert.equal(typeof reviewRun.reviewTask.reviewItemId, "string");

    await requestJson(enabledBaseUrl, `/v1/review-tasks/${reviewRun.reviewTask.reviewTaskId}/claim`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 409,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001"
      }
    });

    const claimed = await requestJson(enabledBaseUrl, `/v1/review-center/items/${reviewRun.reviewTask.reviewItemId}/claim`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001"
      }
    });
    assert.equal(claimed.status, "claimed");
    assert.equal(claimed.sourceObjectSnapshot?.task?.status, "claimed");

    const directCorrectionBlocked = await requestJson(enabledBaseUrl, `/v1/review-tasks/${reviewRun.reviewTask.reviewTaskId}/correct`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 409,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        correctedDocumentType: "contract",
        correctedFieldsJson: {
          contractTitle: {
            value: "Manual service agreement",
            confidence: 1
          }
        }
      }
    });
    assert.equal(directCorrectionBlocked.error, "review_task_review_center_required");

    const corrected = await requestJson(enabledBaseUrl, `/v1/review-center/items/${reviewRun.reviewTask.reviewItemId}/source-action`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        actionCode: "correct",
        actionPayload: {
          correctedDocumentType: "contract",
          correctedFieldsJson: {
            contractTitle: {
              value: "Manual service agreement",
              confidence: 1
            }
          }
        }
      }
    });
    assert.equal(corrected.sourceObjectSnapshot?.task?.status, "corrected");

    await requestJson(enabledBaseUrl, `/v1/review-tasks/${reviewRun.reviewTask.reviewTaskId}/approve`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 409,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001"
      }
    });

    const approved = await requestJson(enabledBaseUrl, `/v1/review-center/items/${reviewRun.reviewTask.reviewItemId}/approve`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001"
      }
    });
    assert.equal(approved.status, "approved");
    assert.equal(approved.sourceObjectSnapshot?.document?.documentType, "contract");
    assert.equal(approved.sourceObjectSnapshot?.document?.status, "reviewed");

    await requestJson(enabledBaseUrl, `/v1/documents/${documentId}/ocr/runs`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        reasonCode: "model_upgrade"
      }
    });

    const runs = await requestJson(
      enabledBaseUrl,
      `/v1/documents/${documentId}/ocr/runs?companyId=00000000-0000-4000-8000-000000000001`,
      {
        token: sessionToken
      }
    );
    assert.equal(runs.ocrRuns.length, 2);
    assert.equal(runs.ocrRuns[0].status, "superseded");

    const asyncIngested = await requestJson(enabledBaseUrl, "/v1/inbox/messages", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        recipientAddress: "ocr@inbound.example.test",
        messageId: "<phase10-ocr-e2e-async-001@inbound.example.test>",
        rawStorageKey: "raw-mail/phase10-ocr-e2e-async-001.eml",
        attachments: [
          {
            filename: "invoice-large.pdf",
            mimeType: "application/pdf",
            storageKey: "documents/originals/invoice-large.pdf",
            contentText: "[OCR_LOW_CONFIDENCE] Invoice: INV-5001 Supplier: Demo Leverantor AB Total: 8900.00",
            pageCount: 20
          }
        ]
      }
    });
    const asyncDocumentId = asyncIngested.routedDocuments[0].documentId;

    const asyncAccepted = await requestJson(enabledBaseUrl, `/v1/documents/${asyncDocumentId}/ocr/runs`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 202,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        callbackMode: "manual_provider_callback"
      }
    });
    assert.equal(asyncAccepted.ocrRun.processingMode, "batch_lro");
    assert.equal(typeof asyncAccepted.providerCallbackToken, "string");
    assert.equal("callbackToken" in asyncAccepted.ocrRun.metadataJson, false);

    const asyncCompleted = await requestJson(
      enabledBaseUrl,
      `/v1/documents/${asyncDocumentId}/ocr/runs/${asyncAccepted.ocrRun.ocrRunId}/provider-callback`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: "00000000-0000-4000-8000-000000000001",
          callbackToken: asyncAccepted.providerCallbackToken
        }
      }
    );
    assert.equal(asyncCompleted.ocrRun.status, "completed");
    assert.equal(asyncCompleted.reviewTask.status, "open");
    assert.equal(typeof asyncCompleted.reviewTask.reviewItemId, "string");
  } finally {
    await stopServer(disabledServer);
    await stopServer(enabledServer);
  }
});

async function loginWithStrongAuth({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(baseUrl, "/v1/auth/login", {
    method: "POST",
    body: {
      companyId,
      email
    }
  });

  const totpCode = platform.getTotpCodeForTesting({ companyId, email });
  await requestJson(baseUrl, "/v1/auth/mfa/totp/verify", {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: totpCode
    }
  });

  const bankidStart = await requestJson(baseUrl, "/v1/auth/bankid/start", {
    method: "POST",
    token: started.sessionToken
  });
  await requestJson(baseUrl, "/v1/auth/bankid/collect", {
    method: "POST",
    token: started.sessionToken,
    body: {
      orderRef: bankidStart.orderRef,
      completionToken: platform.getBankIdCompletionTokenForTesting(bankidStart.orderRef)
    }
  });

  return started.sessionToken;
}

async function requestJson(baseUrl, path, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const mutationIdempotencyKey = ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase()) ? crypto.randomUUID() : null;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(mutationIdempotencyKey ? { "idempotency-key": mutationIdempotencyKey } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus);
  return payload;
}
