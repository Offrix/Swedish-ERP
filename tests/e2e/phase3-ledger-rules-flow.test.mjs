import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 3.2 end-to-end flow enforces dimension rules and supports hard-close correction", async () => {
  const now = new Date("2026-03-21T20:45:00Z");
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
    const root = await requestJson(baseUrl, "/");
    assert.equal(root.routes.includes("/v1/ledger/accounting-periods"), true);
    assert.equal(root.routes.includes("/v1/ledger/dimensions"), true);

    const sessionToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    await requestJson(baseUrl, "/v1/ledger/chart/install", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID
      }
    });

    const missingDimension = await requestJson(baseUrl, "/v1/ledger/journal-entries", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 400,
      body: {
        companyId: COMPANY_ID,
        journalDate: "2026-01-10",
        voucherSeriesCode: "A",
        sourceType: "PROJECT_WIP",
        sourceId: "phase3-2-e2e-missing-dimension",
        idempotencyKey: "phase3-2-e2e-missing-dimension",
        lines: [
          { accountNumber: "5410", debitAmount: 900 },
          { accountNumber: "1110", creditAmount: 900 }
        ]
      }
    });
    assert.equal(missingDimension.error, "project_dimension_required");

    const periods = await requestJson(baseUrl, `/v1/ledger/accounting-periods?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    const januaryPeriod = periods.items.find((period) => period.startsOn === "2026-01-01");

    const origin = await requestJson(baseUrl, "/v1/ledger/journal-entries", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        journalDate: "2026-01-12",
        voucherSeriesCode: "A",
        sourceType: "MANUAL_JOURNAL",
        sourceId: "phase3-2-e2e-origin",
        idempotencyKey: "phase3-2-e2e-origin",
        lines: [
          { accountNumber: "1110", debitAmount: 1800 },
          { accountNumber: "2010", creditAmount: 1800 }
        ]
      }
    });

    await requestJson(baseUrl, `/v1/ledger/journal-entries/${origin.journalEntry.journalEntryId}/validate`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    await requestJson(baseUrl, `/v1/ledger/journal-entries/${origin.journalEntry.journalEntryId}/post`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });

    await requestJson(baseUrl, `/v1/ledger/accounting-periods/${januaryPeriod.accountingPeriodId}/lock`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        status: "hard_closed",
        reasonCode: "year_end_close",
        approvedByActorId: "finance-approver-1",
        approvedByRoleCode: "finance_manager"
      }
    });

    const corrected = await requestJson(baseUrl, `/v1/ledger/journal-entries/${origin.journalEntry.journalEntryId}/correct`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        reasonCode: "project_reclass",
        correctionKey: "phase3-2-e2e-correction-001",
        reverseOriginal: true,
        lines: [
          {
            accountNumber: "5410",
            debitAmount: 900,
            dimensionJson: {
              projectId: "project-demo-alpha",
              costCenterCode: "CC-200",
              businessAreaCode: "BA-SERVICES"
            }
          },
          { accountNumber: "1110", creditAmount: 900 }
        ]
      }
    });

    assert.equal(corrected.originalJournalEntry.status, "reversed");
    assert.equal(corrected.reversalJournalEntry.journalDate, "2026-02-01");
    assert.equal(corrected.correctedJournalEntry.journalDate, "2026-02-01");
    assert.equal(corrected.correctedJournalEntry.lines[0].dimensionJson.projectId, "project-demo-alpha");
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
