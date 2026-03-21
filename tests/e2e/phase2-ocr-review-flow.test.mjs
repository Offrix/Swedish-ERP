import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
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

    await requestJson(enabledBaseUrl, `/v1/review-tasks/${reviewRun.reviewTask.reviewTaskId}/claim`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001"
      }
    });

    await requestJson(enabledBaseUrl, `/v1/review-tasks/${reviewRun.reviewTask.reviewTaskId}/correct`, {
      method: "POST",
      token: sessionToken,
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

    const approved = await requestJson(enabledBaseUrl, `/v1/review-tasks/${reviewRun.reviewTask.reviewTaskId}/approve`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001"
      }
    });
    assert.equal(approved.document.documentType, "contract");
    assert.equal(approved.document.status, "reviewed");

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
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus);
  return payload;
}
