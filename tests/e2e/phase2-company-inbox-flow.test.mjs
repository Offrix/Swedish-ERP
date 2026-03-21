import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

test("Phase 2.2 company inbox routes can be disabled and handle split, duplicate and quarantine flows", async () => {
  const now = new Date("2026-03-21T15:00:00Z");
  const platform = createApiPlatform({
    clock: () => now
  });
  const enabledServer = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase2DocumentArchiveEnabled: true,
      phase2CompanyInboxEnabled: true
    }
  });
  const disabledServer = createApiServer({
    platform: createApiPlatform({
      clock: () => now
    }),
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase2DocumentArchiveEnabled: true,
      phase2CompanyInboxEnabled: false
    }
  });

  await new Promise((resolve) => enabledServer.listen(0, resolve));
  await new Promise((resolve) => disabledServer.listen(0, resolve));
  const enabledBaseUrl = `http://127.0.0.1:${enabledServer.address().port}`;
  const disabledBaseUrl = `http://127.0.0.1:${disabledServer.address().port}`;

  try {
    const root = await requestJson(enabledBaseUrl, "/");
    assert.equal(root.phase2CompanyInboxEnabled, true);
    assert.equal(root.routes.includes("/v1/inbox/messages"), true);

    const disabledAttempt = await fetch(`${disabledBaseUrl}/v1/inbox/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        companyId: "00000000-0000-4000-8000-000000000001",
        recipientAddress: "ap@inbound.example.test"
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
        channelCode: "receipts_inbox",
        inboundAddress: "receipts@inbound.example.test",
        useCase: "receipt_inbox",
        allowedMimeTypes: ["application/pdf", "image/jpeg"],
        maxAttachmentSizeBytes: 1024,
        defaultDocumentType: "expense_receipt"
      }
    });

    const ingested = await requestJson(enabledBaseUrl, "/v1/inbox/messages", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        recipientAddress: "receipts@inbound.example.test",
        messageId: "<phase2-inbox-e2e-001@inbound.example.test>",
        rawStorageKey: "raw-mail/company/phase2-inbox-e2e-001.eml",
        attachments: [
          {
            filename: "receipt.pdf",
            mimeType: "application/pdf",
            storageKey: "documents/originals/receipt.pdf",
            contentText: "receipt"
          },
          {
            filename: "oversized.jpg",
            mimeType: "image/jpeg",
            storageKey: "documents/quarantine/oversized.jpg",
            fileSizeBytes: 4096,
            fileHash: "oversized-hash"
          }
        ]
      }
    });

    assert.equal(ingested.message.status, "accepted");
    assert.equal(ingested.message.routedDocumentCount, 1);
    assert.equal(ingested.message.quarantinedAttachmentCount, 1);
    assert.equal(ingested.attachments[0].status, "queued");
    assert.equal(ingested.attachments[1].quarantineReasonCode, "attachment_too_large");

    const duplicate = await requestJson(enabledBaseUrl, "/v1/inbox/messages", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 200,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        recipientAddress: "receipts@inbound.example.test",
        messageId: "<phase2-inbox-e2e-001@inbound.example.test>",
        rawStorageKey: "raw-mail/company/phase2-inbox-e2e-001-retry.eml",
        attachments: [
          {
            filename: "receipt.pdf",
            mimeType: "application/pdf",
            storageKey: "documents/originals/receipt.pdf",
            contentText: "receipt"
          }
        ]
      }
    });
    assert.equal(duplicate.duplicateDetected, true);
    assert.equal(duplicate.message.emailIngestMessageId, ingested.message.emailIngestMessageId);
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
