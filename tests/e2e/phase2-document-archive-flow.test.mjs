import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

test("Phase 2.1 document archive routes can be disabled and export a full chain when enabled", async () => {
  const now = new Date("2026-03-21T12:30:00Z");
  const platform = createApiPlatform({
    clock: () => now
  });
  const enabledServer = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase2DocumentArchiveEnabled: true
    }
  });
  const disabledServer = createApiServer({
    platform: createApiPlatform({
      clock: () => now
    }),
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase2DocumentArchiveEnabled: false
    }
  });

  await new Promise((resolve) => enabledServer.listen(0, resolve));
  await new Promise((resolve) => disabledServer.listen(0, resolve));
  const enabledBaseUrl = `http://127.0.0.1:${enabledServer.address().port}`;
  const disabledBaseUrl = `http://127.0.0.1:${disabledServer.address().port}`;

  try {
    const root = await requestJson(enabledBaseUrl, "/");
    assert.equal(root.phase2DocumentArchiveEnabled, true);
    assert.equal(root.routes.includes("/v1/documents"), true);

    const disabledAttempt = await fetch(`${disabledBaseUrl}/v1/documents`, {
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

    const document = await requestJson(enabledBaseUrl, "/v1/documents", {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        documentType: "supplier_invoice",
        sourceChannel: "manual",
        sourceReference: "phase2-e2e-001"
      }
    });

    const original = await requestJson(enabledBaseUrl, `/v1/documents/${document.documentId}/versions`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: document.companyId,
        variantType: "original",
        storageKey: "documents/originals/phase2-e2e-001.pdf",
        mimeType: "application/pdf",
        contentText: "phase2 e2e original bytes"
      }
    });
    await requestJson(enabledBaseUrl, `/v1/documents/${document.documentId}/versions`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: document.companyId,
        variantType: "rendered_pdf",
        storageKey: "documents/derived/phase2-e2e-001-rendered.pdf",
        mimeType: "application/pdf",
        contentText: "phase2 e2e rendered bytes",
        derivesFromDocumentVersionId: original.version.documentVersionId
      }
    });
    await requestJson(enabledBaseUrl, `/v1/documents/${document.documentId}/links`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: document.companyId,
        targetType: "journal_entry",
        targetId: "JE-3001"
      }
    });

    const exported = await requestJson(
      enabledBaseUrl,
      `/v1/documents/${document.documentId}/export?companyId=${document.companyId}`,
      {
        token: sessionToken
      }
    );
    assert.equal(exported.document.status, "linked");
    assert.equal(exported.versions.some((version) => version.variantType === "original"), true);
    assert.equal(exported.versions.some((version) => version.variantType === "rendered_pdf"), true);
    assert.equal(exported.links[0].targetId, "JE-3001");
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

async function requestJson(baseUrl, path, { method = "GET", body, token } = {}) {
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
  assert.equal(response.ok, true);
  return payload;
}
