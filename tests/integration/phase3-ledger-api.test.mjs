import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

test("Phase 3.1 migration hardens journal tables for numbering, idempotency and line ordering", async () => {
  const migration = await readText("packages/db/migrations/20260321050000_phase3_ledger_foundation.sql");
  for (const fragment of [
    "ALTER TABLE journal_entries",
    "ADD COLUMN IF NOT EXISTS idempotency_key",
    "ADD COLUMN IF NOT EXISTS validated_at",
    "ALTER TABLE journal_lines",
    "ADD COLUMN IF NOT EXISTS line_number",
    "CREATE UNIQUE INDEX IF NOT EXISTS ux_journal_entries_company_idempotency_key",
    "CREATE UNIQUE INDEX IF NOT EXISTS ux_journal_lines_entry_line_number"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }
});

test("Phase 3.1 API installs ledger catalog, validates balanced journals and preserves idempotent posting", async () => {
  const now = new Date("2026-03-21T18:30:00Z");
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
      companyId: "00000000-0000-4000-8000-000000000001",
      email: DEMO_ADMIN_EMAIL
    });

    const install = await requestJson(`${baseUrl}/v1/ledger/chart/install`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001"
      }
    });
    assert.equal(install.totalVoucherSeries, 26);
    assert.ok(install.totalAccounts > 150);

    const accounts = await requestJson(
      `${baseUrl}/v1/ledger/accounts?companyId=00000000-0000-4000-8000-000000000001`,
      {
        token: adminSession.sessionToken
      }
    );
    assert.equal(accounts.items.some((account) => account.accountNumber === "1110"), true);

    const draft = await requestJson(`${baseUrl}/v1/ledger/journal-entries`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        journalDate: "2026-03-21",
        voucherSeriesCode: "A",
        sourceType: "MANUAL_JOURNAL",
        sourceId: "phase3-api-manual-001",
        idempotencyKey: "phase3-api-manual-001",
        description: "API manual journal",
        lines: [
          { accountNumber: "1110", debitAmount: 1500 },
          { accountNumber: "2010", creditAmount: 1500 }
        ]
      }
    });
    assert.equal(draft.journalEntry.status, "draft");
    assert.equal(draft.journalEntry.voucherNumber, 1);

    const replay = await requestJson(`${baseUrl}/v1/ledger/journal-entries`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        journalDate: "2026-03-21",
        voucherSeriesCode: "A",
        sourceType: "MANUAL_JOURNAL",
        sourceId: "phase3-api-manual-001",
        idempotencyKey: "phase3-api-manual-001",
        lines: [
          { accountNumber: "1110", debitAmount: 1500 },
          { accountNumber: "2010", creditAmount: 1500 }
        ]
      }
    });
    assert.equal(replay.idempotentReplay, true);
    assert.equal(replay.journalEntry.journalEntryId, draft.journalEntry.journalEntryId);

    const validated = await requestJson(`${baseUrl}/v1/ledger/journal-entries/${draft.journalEntry.journalEntryId}/validate`, {
      method: "POST",
      token: adminSession.sessionToken,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001"
      }
    });
    assert.equal(validated.journalEntry.status, "validated");

    const posted = await requestJson(`${baseUrl}/v1/ledger/journal-entries/${draft.journalEntry.journalEntryId}/post`, {
      method: "POST",
      token: adminSession.sessionToken,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001"
      }
    });
    assert.equal(posted.journalEntry.status, "posted");

    const imported = await requestJson(`${baseUrl}/v1/ledger/journal-entries`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        journalDate: "2026-03-22",
        voucherSeriesCode: "A",
        sourceType: "MANUAL_JOURNAL",
        sourceId: "phase3-api-import-001",
        idempotencyKey: "phase3-api-import-001",
        importedFlag: true,
        lines: [
          { accountNumber: "1110", debitAmount: 500 },
          { accountNumber: "2650", creditAmount: 500 }
        ]
      }
    });
    assert.equal(imported.journalEntry.voucherNumber, 2);
    assert.equal(imported.journalEntry.importedFlag, true);
    assert.equal(imported.journalEntry.metadataJson.importSourceType, "historical_import");

    const fetched = await requestJson(
      `${baseUrl}/v1/ledger/journal-entries/${draft.journalEntry.journalEntryId}?companyId=00000000-0000-4000-8000-000000000001`,
      {
        token: adminSession.sessionToken
      }
    );
    assert.equal(fetched.lines.length, 2);
    assert.equal(fetched.totalDebit, 1500);
    assert.equal(fetched.totalCredit, 1500);
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
