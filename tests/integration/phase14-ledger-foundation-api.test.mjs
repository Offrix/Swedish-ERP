import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 14.1 API exposes ledger journals with fiscal year, fiscal period and accounting method bindings", async () => {
  const now = new Date("2026-03-24T09:30:00Z");
  const platform = createApiPlatform({
    clock: () => now
  });
  const server = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase2DocumentArchiveEnabled: true,
      phase2CompanyInboxEnabled: true,
      phase2OcrReviewEnabled: true,
      phase3LedgerEnabled: true
    }
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminSession = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    await requestJson(`${baseUrl}/v1/ledger/chart/install`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID
      }
    });

    const periods = await requestJson(`${baseUrl}/v1/ledger/accounting-periods?companyId=${COMPANY_ID}`, {
      token: adminSession.sessionToken
    });
    const marchPeriod = periods.items.find((period) => period.startsOn === "2026-03-01");
    assert.ok(marchPeriod);
    assert.equal(typeof marchPeriod.fiscalYearId, "string");
    assert.equal(typeof marchPeriod.fiscalPeriodId, "string");

    const draft = await requestJson(`${baseUrl}/v1/ledger/journal-entries`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        journalDate: "2026-03-21",
        voucherSeriesCode: "A",
        sourceType: "MANUAL_JOURNAL",
        sourceId: "phase14-ledger-api-001",
        idempotencyKey: "phase14-ledger-api-001",
        description: "Ledger foundation bridge",
        lines: [
          { accountNumber: "1110", debitAmount: 1900 },
          { accountNumber: "2010", creditAmount: 1900 }
        ]
      }
    });

    assert.equal(draft.journalEntry.fiscalYearId, marchPeriod.fiscalYearId);
    assert.equal(draft.journalEntry.fiscalPeriodId, marchPeriod.fiscalPeriodId);
    assert.equal(typeof draft.journalEntry.accountingMethodProfileId, "string");

    const fetched = await requestJson(
      `${baseUrl}/v1/ledger/journal-entries/${draft.journalEntry.journalEntryId}?companyId=${COMPANY_ID}`,
      {
        token: adminSession.sessionToken
      }
    );

    assert.equal(fetched.fiscalYearId, draft.journalEntry.fiscalYearId);
    assert.equal(fetched.fiscalPeriodId, draft.journalEntry.fiscalPeriodId);
    assert.equal(fetched.accountingMethodProfileId, draft.journalEntry.accountingMethodProfileId);
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
  await requestJson(`${baseUrl}/v1/auth/bankid/collect`, {
    method: "POST",
    token: started.sessionToken,
    body: {
      orderRef: bankidStart.orderRef,
      completionToken: platform.getBankIdCompletionTokenForTesting(bankidStart.orderRef)
    }
  });

  return {
    sessionToken: started.sessionToken
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
