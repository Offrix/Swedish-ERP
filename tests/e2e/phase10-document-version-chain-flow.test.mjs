import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

test("Phase 10.1 e2e keeps original/derivative chain, evidence refs and read routes aligned", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-28T09:00:00Z")
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
    const { sessionToken } = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: "00000000-0000-4000-8000-000000000001",
      email: DEMO_ADMIN_EMAIL
    });

    const document = await requestJson(`${baseUrl}/v1/documents`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        documentType: "supplier_invoice",
        sourceChannel: "manual",
        sourceReference: "phase10-e2e-001",
        retentionPolicyCode: "supplier_invoice_standard",
        metadataJson: {
          filename: "phase10-e2e-001.pdf"
        }
      }
    });

    const original = await requestJson(`${baseUrl}/v1/documents/${document.documentId}/versions`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: document.companyId,
        variantType: "original",
        storageKey: "documents/originals/phase10-e2e-001.pdf",
        mimeType: "application/pdf",
        contentText: "phase10 e2e original"
      }
    });

    const derivative = await requestJson(`${baseUrl}/v1/documents/${document.documentId}/versions`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: document.companyId,
        variantType: "rendered_pdf",
        storageKey: "documents/rendered/phase10-e2e-001.pdf",
        mimeType: "application/pdf",
        contentText: "phase10 e2e rendered",
        derivesFromDocumentVersionId: original.version.documentVersionId
      }
    });

    const fetched = await requestJson(
      `${baseUrl}/v1/documents/${document.documentId}?companyId=${document.companyId}`,
      { token: sessionToken }
    );
    const versions = await requestJson(
      `${baseUrl}/v1/documents/${document.documentId}/versions?companyId=${document.companyId}`,
      { token: sessionToken }
    );
    const exported = await requestJson(
      `${baseUrl}/v1/documents/${document.documentId}/export?companyId=${document.companyId}`,
      { token: sessionToken }
    );

    assert.equal(fetched.originalDocumentVersionId, original.version.documentVersionId);
    assert.equal(fetched.latestDocumentVersionId, derivative.version.documentVersionId);
    assert.equal(versions.versions.length, 2);
    assert.equal(
      versions.versions.every((version) => version.evidenceRefs.includes(`document_version:${version.documentVersionId}`)),
      true
    );
    assert.equal(exported.document.evidenceRefs.includes(`original_version:${original.version.documentVersionId}`), true);
    assert.equal(exported.document.evidenceRefs.includes(`latest_version:${derivative.version.documentVersionId}`), true);
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
