import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

test("Phase 2.3 migration adds OCR runs, review tasks and channel thresholds", async () => {
  const migration = await readText("packages/db/migrations/20260321040000_phase2_ocr_review.sql");
  for (const fragment of [
    "ALTER TABLE inbox_channels",
    "ADD COLUMN IF NOT EXISTS classification_confidence_threshold",
    "CREATE TABLE IF NOT EXISTS ocr_runs",
    "CREATE TABLE IF NOT EXISTS review_tasks",
    "CREATE INDEX IF NOT EXISTS ix_review_tasks_company_queue_status"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }
});

test("Phase 2.3 API runs OCR, opens review tasks, accepts manual correction and preserves rerun versions", async () => {
  const now = new Date("2026-03-21T17:00:00Z");
  const platform = createApiPlatform({
    clock: () => now
  });
  const server = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase2DocumentArchiveEnabled: true,
      phase2CompanyInboxEnabled: true,
      phase2OcrReviewEnabled: true
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

    await requestJson(`${baseUrl}/v1/inbox/channels`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        channelCode: "docs_inbox",
        inboundAddress: "docs@inbound.example.test",
        useCase: "documents_inbox",
        allowedMimeTypes: ["application/pdf"],
        maxAttachmentSizeBytes: 1048576,
        classificationConfidenceThreshold: 0.9,
        fieldConfidenceThreshold: 0.9
      }
    });

    const invoiceDocumentId = (await ingestSingleDocument({
      baseUrl,
      token: adminSession.sessionToken,
      companyId: "00000000-0000-4000-8000-000000000001",
      recipientAddress: "docs@inbound.example.test",
      messageId: "<phase2-ocr-api-invoice-001>",
      filename: "invoice.pdf",
      contentText: "Invoice: INV-1001 Supplier: Demo Leverantor AB Total: 1250.00 OCR: 12345"
    })).documentId;
    const receiptDocumentId = (await ingestSingleDocument({
      baseUrl,
      token: adminSession.sessionToken,
      companyId: "00000000-0000-4000-8000-000000000001",
      recipientAddress: "docs@inbound.example.test",
      messageId: "<phase2-ocr-api-receipt-001>",
      filename: "receipt.pdf",
      contentText: "Kvitto Butik: Centralbutiken Total: 250.00 Datum: 2026-03-21"
    })).documentId;
    const contractDocumentId = (await ingestSingleDocument({
      baseUrl,
      token: adminSession.sessionToken,
      companyId: "00000000-0000-4000-8000-000000000001",
      recipientAddress: "docs@inbound.example.test",
      messageId: "<phase2-ocr-api-contract-001>",
      filename: "contract.pdf",
      contentText: "Agreement: Serviceavtal Party: Customer AB Effective date: 2026-03-21"
    })).documentId;

    const invoiceRun = await runOcr(baseUrl, adminSession.sessionToken, invoiceDocumentId);
    const receiptRun = await runOcr(baseUrl, adminSession.sessionToken, receiptDocumentId);
    const contractRun = await runOcr(baseUrl, adminSession.sessionToken, contractDocumentId);

    assert.equal(invoiceRun.ocrRun.suggestedDocumentType, "supplier_invoice");
    assert.equal(receiptRun.ocrRun.suggestedDocumentType, "expense_receipt");
    assert.equal(contractRun.ocrRun.suggestedDocumentType, "contract");

    const ambiguousDocumentId = (await ingestSingleDocument({
      baseUrl,
      token: adminSession.sessionToken,
      companyId: "00000000-0000-4000-8000-000000000001",
      recipientAddress: "docs@inbound.example.test",
      messageId: "<phase2-ocr-api-review-001>",
      filename: "mystery.pdf",
      contentText: "Document total 100.00"
    })).documentId;

    const reviewRun = await runOcr(baseUrl, adminSession.sessionToken, ambiguousDocumentId);
    assert.equal(reviewRun.reviewTask.taskType, "document_review");
    assert.equal(reviewRun.reviewTask.status, "open");

    const claimed = await requestJson(`${baseUrl}/v1/review-tasks/${reviewRun.reviewTask.reviewTaskId}/claim`, {
      method: "POST",
      token: adminSession.sessionToken,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001"
      }
    });
    assert.equal(claimed.task.status, "claimed");

    const corrected = await requestJson(`${baseUrl}/v1/review-tasks/${reviewRun.reviewTask.reviewTaskId}/correct`, {
      method: "POST",
      token: adminSession.sessionToken,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        correctedDocumentType: "contract",
        correctedFieldsJson: {
          contractTitle: {
            value: "Manual service agreement",
            confidence: 1
          }
        },
        correctionComment: "Corrected by reviewer."
      }
    });
    assert.equal(corrected.task.status, "corrected");

    const approved = await requestJson(`${baseUrl}/v1/review-tasks/${reviewRun.reviewTask.reviewTaskId}/approve`, {
      method: "POST",
      token: adminSession.sessionToken,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001"
      }
    });
    assert.equal(approved.task.status, "approved");
    assert.equal(approved.document.documentType, "contract");

    await requestJson(`${baseUrl}/v1/documents/${invoiceDocumentId}/ocr/runs`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        reasonCode: "model_upgrade"
      }
    });

    const invoiceRuns = await requestJson(
      `${baseUrl}/v1/documents/${invoiceDocumentId}/ocr/runs?companyId=00000000-0000-4000-8000-000000000001`,
      {
        token: adminSession.sessionToken
      }
    );
    assert.equal(invoiceRuns.ocrRuns.length, 2);
  } finally {
    await stopServer(server);
  }
});

async function ingestSingleDocument({ baseUrl, token, companyId, recipientAddress, messageId, filename, contentText }) {
  const ingested = await requestJson(`${baseUrl}/v1/inbox/messages`, {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId,
      recipientAddress,
      messageId,
      rawStorageKey: `raw-mail/${messageId}.eml`,
      attachments: [
        {
          filename,
          mimeType: "application/pdf",
          storageKey: `documents/originals/${filename}`,
          contentText
        }
      ]
    }
  });
  return {
    documentId: ingested.routedDocuments[0].documentId
  };
}

async function runOcr(baseUrl, token, documentId) {
  return requestJson(`${baseUrl}/v1/documents/${documentId}/ocr/runs`, {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId: "00000000-0000-4000-8000-000000000001"
    }
  });
}

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
  const response = await fetch(url, {
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
