import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

test("Phase 7.2 API allocates voucher numbers on post and requires dual control for manual journals", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-31T10:30:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const token = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });

    await requestJson(baseUrl, "/v1/ledger/chart/install", {
      method: "POST",
      token,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });

    const created = await requestJson(baseUrl, "/v1/ledger/journal-entries", {
      method: "POST",
      token,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        journalDate: "2026-03-31",
        voucherSeriesCode: "A",
        sourceType: "MANUAL_JOURNAL",
        sourceId: "phase7-2-api-manual",
        idempotencyKey: "phase7-2-api-manual",
        description: "API manual journal",
        lines: [
          { accountNumber: "1110", debitAmount: 800 },
          { accountNumber: "2010", creditAmount: 800 }
        ]
      }
    });
    assert.equal(created.journalEntry.voucherNumber, null);

    const approved = await requestJson(baseUrl, `/v1/ledger/journal-entries/${created.journalEntry.journalEntryId}/validate`, {
      method: "POST",
      token,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(approved.journalEntry.status, "approved_for_post");

    const blocked = await requestJson(baseUrl, `/v1/ledger/journal-entries/${created.journalEntry.journalEntryId}/post`, {
      method: "POST",
      token,
      expectedStatus: 400,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(blocked.error, "dual_control_required");

    const posted = await requestJson(baseUrl, `/v1/ledger/journal-entries/${created.journalEntry.journalEntryId}/post`, {
      method: "POST",
      token,
      body: {
        companyId: DEMO_IDS.companyId,
        approvedByActorId: "finance-approver",
        approvedByRoleCode: "finance_manager"
      }
    });
    assert.equal(posted.journalEntry.status, "posted");
    assert.equal(posted.journalEntry.voucherNumber, 1);
  } finally {
    await stopServer(server);
  }
});

test("Phase 7.2 API requires real dual control for soft-lock overrides", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-31T11:00:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const token = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });

    await requestJson(baseUrl, "/v1/ledger/chart/install", {
      method: "POST",
      token,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });

    const januaryPeriod = await requestJson(baseUrl, `/v1/ledger/accounting-periods?companyId=${DEMO_IDS.companyId}`, {
      token
    });
    const targetPeriod = januaryPeriod.items.find((candidate) => candidate.startsOn === "2026-01-01");
    await requestJson(baseUrl, `/v1/ledger/accounting-periods/${targetPeriod.accountingPeriodId}/lock`, {
      method: "POST",
      token,
      body: {
        companyId: DEMO_IDS.companyId,
        status: "soft_locked",
        reasonCode: "month_close"
      }
    });

    const blocked = await requestJson(baseUrl, "/v1/ledger/journal-entries", {
      method: "POST",
      token,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        journalDate: "2026-01-15",
        voucherSeriesCode: "A",
        sourceType: "MANUAL_JOURNAL",
        sourceId: "phase7-2-api-soft-lock-blocked",
        idempotencyKey: "phase7-2-api-soft-lock-blocked",
        description: "Blocked manual journal",
        lines: [
          { accountNumber: "1110", debitAmount: 500 },
          { accountNumber: "2010", creditAmount: 500 }
        ]
      }
    });
    assert.equal(blocked.error, "period_locked");

    const created = await requestJson(baseUrl, "/v1/ledger/journal-entries", {
      method: "POST",
      token,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        journalDate: "2026-01-15",
        voucherSeriesCode: "A",
        sourceType: "MANUAL_JOURNAL",
        sourceId: "phase7-2-api-soft-lock-approved",
        idempotencyKey: "phase7-2-api-soft-lock-approved",
        description: "Approved soft-lock override",
        periodLockOverrideApprovedByActorId: "finance-approver",
        periodLockOverrideApprovedByRoleCode: "finance_manager",
        periodLockOverrideReasonCode: "urgent_adjustment",
        lines: [
          { accountNumber: "1110", debitAmount: 500 },
          { accountNumber: "2010", creditAmount: 500 }
        ]
      }
    });
    assert.equal(created.journalEntry.status, "draft");
  } finally {
    await stopServer(server);
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
