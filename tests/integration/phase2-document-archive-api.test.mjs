import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

test("Phase 2.1 migration adds archive hardening fields and indexes", async () => {
  const migration = await readText("packages/db/migrations/20260321020000_phase2_document_archive.sql");
  for (const fragment of [
    "ALTER TABLE documents",
    "ADD COLUMN IF NOT EXISTS received_at",
    "ADD COLUMN IF NOT EXISTS duplicate_of_document_id",
    "ADD COLUMN IF NOT EXISTS is_immutable",
    "ADD COLUMN IF NOT EXISTS derives_from_document_version_id",
    "CREATE UNIQUE INDEX IF NOT EXISTS ux_document_versions_original_per_document",
    "CREATE INDEX IF NOT EXISTS ix_document_versions_company_hash",
    "CREATE UNIQUE INDEX IF NOT EXISTS ux_document_links_document_target"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }
});

test("Phase 2.1 API stores document versions, links them and exports audit trail", async () => {
  const now = new Date("2026-03-21T12:15:00Z");
  const platform = createApiPlatform({
    clock: () => now
  });
  const server = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase2DocumentArchiveEnabled: true
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

    const created = await requestJson(`${baseUrl}/v1/documents`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        documentType: "supplier_invoice",
        sourceChannel: "manual",
        sourceReference: "phase2-api-001",
        retentionPolicyCode: "supplier_invoice_standard",
        metadataJson: {
          mailboxCode: "manual"
        }
      }
    });
    assert.equal(created.status, "received");

    const original = await requestJson(`${baseUrl}/v1/documents/${created.documentId}/versions`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: created.companyId,
        variantType: "original",
        storageKey: "documents/originals/phase2-api-001.pdf",
        mimeType: "application/pdf",
        contentText: "phase2 invoice original"
      }
    });
    assert.equal(original.duplicateDetected, false);
    assert.equal(original.document.status, "stored");

    const derivative = await requestJson(`${baseUrl}/v1/documents/${created.documentId}/versions`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: created.companyId,
        variantType: "ocr",
        storageKey: "documents/ocr/phase2-api-001.txt",
        mimeType: "text/plain",
        contentText: "OCR text for invoice",
        derivesFromDocumentVersionId: original.version.documentVersionId
      }
    });
    assert.equal(derivative.version.derivesFromDocumentVersionId, original.version.documentVersionId);

    const linked = await requestJson(`${baseUrl}/v1/documents/${created.documentId}/links`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: created.companyId,
        targetType: "supplier_invoice",
        targetId: "SUP-INV-2001"
      }
    });
    assert.equal(linked.document.status, "linked");

    const duplicateDocument = await requestJson(`${baseUrl}/v1/documents`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: created.companyId,
        documentType: "supplier_invoice",
        sourceChannel: "manual",
        sourceReference: "phase2-api-duplicate-001"
      }
    });
    const duplicateOriginal = await requestJson(`${baseUrl}/v1/documents/${duplicateDocument.documentId}/versions`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: created.companyId,
        variantType: "original",
        storageKey: "documents/originals/phase2-api-duplicate-001.pdf",
        mimeType: "application/pdf",
        contentText: "phase2 invoice original"
      }
    });
    assert.equal(duplicateOriginal.duplicateDetected, true);
    assert.equal(duplicateOriginal.duplicateOfDocumentIds.includes(created.documentId), true);

    const exported = await requestJson(
      `${baseUrl}/v1/documents/${created.documentId}/export?companyId=${created.companyId}`,
      {
        token: adminSession.sessionToken
      }
    );
    assert.equal(exported.versions.length, 2);
    assert.equal(exported.links.length, 1);
    assert.equal(exported.auditTrail.some((event) => event.action === "document.exported"), true);
    assert.equal(exported.auditTrail.some((event) => event.action === "document.linked"), true);
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
