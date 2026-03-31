import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

test("Phase 3.1 ledger routes can be disabled and enabled flow allocates deterministic voucher numbers on post", async () => {
  const now = new Date("2026-03-21T19:00:00Z");
  const enabledPlatform = createApiPlatform({
    clock: () => now
  });
  const enabledServer = createApiServer({
    platform: enabledPlatform,
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase2DocumentArchiveEnabled: true,
      phase2CompanyInboxEnabled: true,
      phase2OcrReviewEnabled: true,
      phase3LedgerEnabled: true
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
      phase2OcrReviewEnabled: true,
      phase3LedgerEnabled: false
    }
  });

  await new Promise((resolve) => enabledServer.listen(0, resolve));
  await new Promise((resolve) => disabledServer.listen(0, resolve));
  const enabledBaseUrl = `http://127.0.0.1:${enabledServer.address().port}`;
  const disabledBaseUrl = `http://127.0.0.1:${disabledServer.address().port}`;

  try {
    const root = await requestJson(enabledBaseUrl, "/");
    assert.equal(root.phase3LedgerEnabled, true);
    assert.equal(root.routes.includes("/v1/ledger/journal-entries"), true);

    const disabledAttempt = await fetch(`${disabledBaseUrl}/v1/ledger/accounts?companyId=00000000-0000-4000-8000-000000000001`);
    const disabledPayload = await disabledAttempt.json();
    assert.equal(disabledAttempt.status, 503);
    assert.equal(disabledPayload.error, "feature_disabled");

    const sessionToken = await loginWithStrongAuth({
      baseUrl: enabledBaseUrl,
      platform: enabledPlatform,
      companyId: "00000000-0000-4000-8000-000000000001",
      email: DEMO_ADMIN_EMAIL
    });

    await requestJson(enabledBaseUrl, "/v1/ledger/chart/install", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001"
      }
    });

    const first = await requestJson(enabledBaseUrl, "/v1/ledger/journal-entries", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        journalDate: "2026-03-21",
        voucherSeriesCode: "A",
        sourceType: "MANUAL_JOURNAL",
        sourceId: "phase3-e2e-001",
        idempotencyKey: "phase3-e2e-001",
        description: "phase3 e2e journal 1",
        lines: [
          { accountNumber: "1110", debitAmount: 700 },
          { accountNumber: "2010", creditAmount: 700 }
        ]
      }
    });

    const second = await requestJson(enabledBaseUrl, "/v1/ledger/journal-entries", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        journalDate: "2026-03-22",
        voucherSeriesCode: "A",
        sourceType: "MANUAL_JOURNAL",
        sourceId: "phase3-e2e-002",
        idempotencyKey: "phase3-e2e-002",
        description: "phase3 e2e journal 2",
        lines: [
          { accountNumber: "1110", debitAmount: 900 },
          { accountNumber: "2010", creditAmount: 900 }
        ]
      }
    });

    assert.equal(first.journalEntry.voucherNumber, null);
    assert.equal(second.journalEntry.voucherNumber, null);

    const firstApproved = await requestJson(enabledBaseUrl, `/v1/ledger/journal-entries/${first.journalEntry.journalEntryId}/validate`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001"
      }
    });
    assert.equal(firstApproved.journalEntry.status, "approved_for_post");
    const firstPosted = await requestJson(enabledBaseUrl, `/v1/ledger/journal-entries/${first.journalEntry.journalEntryId}/post`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        approvedByActorId: "finance-approver",
        approvedByRoleCode: "finance_manager"
      }
    });
    const secondApproved = await requestJson(enabledBaseUrl, `/v1/ledger/journal-entries/${second.journalEntry.journalEntryId}/validate`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001"
      }
    });
    assert.equal(secondApproved.journalEntry.status, "approved_for_post");
    const secondPosted = await requestJson(enabledBaseUrl, `/v1/ledger/journal-entries/${second.journalEntry.journalEntryId}/post`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        approvedByActorId: "finance-approver-2",
        approvedByRoleCode: "finance_manager"
      }
    });

    assert.equal(firstPosted.journalEntry.voucherNumber, 1);
    assert.equal(secondPosted.journalEntry.voucherNumber, 2);
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
