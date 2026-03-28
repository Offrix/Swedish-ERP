import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

test("Phase 10.1 migration adds document evidence-chain columns", async () => {
  const migration = await readText("packages/db/migrations/20260328101500_phase10_document_evidence_chain.sql");
  for (const fragment of [
    "ALTER TABLE documents",
    "ADD COLUMN IF NOT EXISTS retention_class_code",
    "ADD COLUMN IF NOT EXISTS source_fingerprint",
    "ADD COLUMN IF NOT EXISTS original_document_version_id",
    "ADD COLUMN IF NOT EXISTS latest_document_version_id",
    "ADD COLUMN IF NOT EXISTS evidence_refs_json",
    "ALTER TABLE document_versions",
    "ADD COLUMN IF NOT EXISTS checksum_algorithm",
    "ADD COLUMN IF NOT EXISTS checksum_sha256",
    "CREATE INDEX IF NOT EXISTS ix_documents_company_source_fingerprint",
    "CREATE INDEX IF NOT EXISTS ix_document_versions_company_checksum_sha256"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }
});

test("Phase 10.1 API exposes hardened document chain fields and read routes", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-28T08:30:00Z")
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
    const session = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: "00000000-0000-4000-8000-000000000001",
      email: DEMO_ADMIN_EMAIL
    });

    const created = await requestJson(`${baseUrl}/v1/documents`, {
      method: "POST",
      token: session.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        documentType: "supplier_invoice",
        sourceChannel: "email_inbox",
        sourceReference: "phase10-doc-001",
        retentionPolicyCode: "supplier_invoice_standard",
        retentionClassCode: "finance_source",
        metadataJson: {
          filename: "phase10-doc-001.pdf",
          senderAddress: "supplier@example.com",
          mailboxCode: "ap-inbox"
        }
      }
    });

    const original = await requestJson(`${baseUrl}/v1/documents/${created.documentId}/versions`, {
      method: "POST",
      token: session.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: created.companyId,
        variantType: "original",
        storageKey: "documents/originals/phase10-doc-001.pdf",
        mimeType: "application/pdf",
        contentText: "phase10 original content"
      }
    });

    const fetched = await requestJson(
      `${baseUrl}/v1/documents/${created.documentId}?companyId=${created.companyId}`,
      {
        token: session.sessionToken
      }
    );
    assert.equal(fetched.retentionClassCode, "finance_source");
    assert.equal(fetched.originalDocumentVersionId, original.version.documentVersionId);
    assert.equal(typeof fetched.sourceFingerprint, "string");
    assert.equal(fetched.evidenceRefs.includes(`document:${created.documentId}`), true);

    const versions = await requestJson(
      `${baseUrl}/v1/documents/${created.documentId}/versions?companyId=${created.companyId}`,
      {
        token: session.sessionToken
      }
    );
    assert.equal(versions.versions.length, 1);
    assert.equal(versions.versions[0].checksumAlgorithm, "sha256");
    assert.equal(versions.versions[0].checksumSha256, original.version.contentHash);
    assert.equal(
      versions.versions[0].evidenceRefs.includes(`checksum:sha256:${versions.versions[0].checksumSha256}`),
      true
    );
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
