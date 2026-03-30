import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

test("Phase 2.2 migration adds inbox channels, message routing and attachment quarantine fields", async () => {
  const migration = await readText("packages/db/migrations/20260321030000_phase2_company_inbox.sql");
  for (const fragment of [
    "CREATE TABLE IF NOT EXISTS inbox_channels",
    "ALTER TABLE email_ingest_messages",
    "ADD COLUMN IF NOT EXISTS inbox_channel_id",
    "DROP CONSTRAINT IF EXISTS email_ingest_messages_company_id_message_id_key",
    "CREATE TABLE IF NOT EXISTS email_ingest_attachments",
    "CREATE UNIQUE INDEX IF NOT EXISTS ux_email_ingest_messages_company_channel_message",
    "CREATE INDEX IF NOT EXISTS ix_email_ingest_attachments_company_status"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }
});

test("Phase 2.2 API routes inbox messages, deduplicates message ids and flags invalid attachments", async () => {
  const now = new Date("2026-03-21T14:30:00Z");
  const platform = createApiPlatform({
    clock: () => now
  });
  const server = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase2DocumentArchiveEnabled: true,
      phase2CompanyInboxEnabled: true
    }
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminSession = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: "00000000-0000-4000-8000-000000000001",
      email: DEMO_ADMIN_EMAIL
    });

    const channel = await requestJson(`${baseUrl}/v1/inbox/channels`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        channelCode: "ap_inbox",
        inboundAddress: "ap@inbound.example.test",
        useCase: "supplier_invoice_inbox",
        allowedMimeTypes: ["application/pdf", "image/png"],
        maxAttachmentSizeBytes: 1048576,
        defaultDocumentType: "supplier_invoice"
      }
    });
    assert.equal(channel.channelCode, "ap_inbox");

    const created = await requestJson(`${baseUrl}/v1/inbox/messages`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        recipientAddress: "ap@inbound.example.test",
        messageId: "<phase2-inbox-api-001@inbound.example.test>",
        rawStorageKey: "raw-mail/company/phase2-inbox-api-001.eml",
        senderAddress: "supplier@example.test",
        subject: "Invoice set",
        attachments: [
          {
            filename: "invoice-1.pdf",
            mimeType: "application/pdf",
            storageKey: "documents/originals/invoice-1.pdf",
            contentText: "invoice one"
          },
          {
            filename: "invoice-2.png",
            mimeType: "image/png",
            storageKey: "documents/originals/invoice-2.png",
            contentText: "invoice two"
          },
          {
            filename: "malware.exe",
            mimeType: "application/x-msdownload",
            storageKey: "documents/quarantine/malware.exe",
            contentText: "bad attachment",
            scanResult: "malware"
          }
        ]
      }
    });

    assert.equal(created.message.status, "accepted");
    assert.equal(created.message.routedDocumentCount, 2);
    assert.equal(created.message.quarantinedAttachmentCount, 1);
    assert.equal(created.attachments.filter((attachment) => attachment.status === "queued").length, 2);
    assert.equal(created.attachments.filter((attachment) => attachment.status === "quarantined").length, 1);
    assert.equal(created.routedDocuments.length, 2);

    const fetched = await requestJson(
      `${baseUrl}/v1/inbox/messages/${created.message.emailIngestMessageId}?companyId=${created.message.companyId}`,
      {
        token: adminSession.sessionToken
      }
    );
    assert.equal(fetched.message.emailIngestMessageId, created.message.emailIngestMessageId);
    assert.equal(fetched.attachments.length, 3);

    const duplicate = await requestJson(`${baseUrl}/v1/inbox/messages`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 200,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        recipientAddress: "ap@inbound.example.test",
        messageId: "<phase2-inbox-api-001@inbound.example.test>",
        rawStorageKey: "raw-mail/company/phase2-inbox-api-001-retry.eml",
        attachments: [
          {
            filename: "invoice-1.pdf",
            mimeType: "application/pdf",
            storageKey: "documents/originals/invoice-1.pdf",
            contentText: "invoice one"
          }
        ]
      }
    });

    assert.equal(duplicate.duplicateDetected, true);
    assert.equal(duplicate.message.emailIngestMessageId, created.message.emailIngestMessageId);
  } finally {
    await stopServer(server);
  }
});

async function loginWithStrongAuth({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(`${baseUrl}/v1/auth/login`, {
    method: "POST",
    body: {
      companyId,
      email
    }
  });

  const totpCode = platform.getTotpCodeForTesting({ companyId, email });
  await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: totpCode
    }
  });

  const bankidStart = await requestJson(`${baseUrl}/v1/auth/bankid/start`, {
    method: "POST",
    token: started.sessionToken
  });
  const completed = await requestJson(`${baseUrl}/v1/auth/bankid/collect`, {
    method: "POST",
    token: started.sessionToken,
    body: {
      orderRef: bankidStart.orderRef,
      completionToken: platform.getBankIdCompletionTokenForTesting(bankidStart.orderRef)
    }
  });

  return {
    sessionToken: started.sessionToken,
    session: completed.session
  };
}

async function requestJson(url, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const mutationIdempotencyKey = ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase()) ? crypto.randomUUID() : null;
  const response = await fetch(url, {
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
