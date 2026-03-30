import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 3.2 migration adds dimension catalogs, accounting-period lock metadata and correction columns", async () => {
  const migration = await readText("packages/db/migrations/20260321060000_phase3_ledger_dimensions_locks.sql");
  for (const fragment of [
    "ALTER TABLE accounting_periods",
    "ADD COLUMN IF NOT EXISTS lock_reason_code",
    "CREATE TABLE IF NOT EXISTS ledger_dimension_values",
    "ADD COLUMN IF NOT EXISTS correction_of_journal_entry_id",
    "ADD COLUMN IF NOT EXISTS correction_key",
    "CREATE UNIQUE INDEX IF NOT EXISTS ux_journal_entries_company_correction_key"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }
});

test("Phase 3.2 API exposes dimensions and periods, blocks locked-period mutation and posts corrections into the next open period", async () => {
  const now = new Date("2026-03-21T20:30:00Z");
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

    const dimensions = await requestJson(`${baseUrl}/v1/ledger/dimensions?companyId=${COMPANY_ID}`, {
      token: adminSession.sessionToken
    });
    assert.equal(dimensions.projects.length > 0, true);
    assert.equal(dimensions.costCenters.length > 0, true);
    assert.equal(dimensions.businessAreas.length > 0, true);

    const periods = await requestJson(`${baseUrl}/v1/ledger/accounting-periods?companyId=${COMPANY_ID}`, {
      token: adminSession.sessionToken
    });
    const januaryPeriod = periods.items.find((period) => period.startsOn === "2026-01-01");
    assert.ok(januaryPeriod);

    const draft = await requestJson(`${baseUrl}/v1/ledger/journal-entries`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        journalDate: "2026-01-15",
        voucherSeriesCode: "A",
        sourceType: "MANUAL_JOURNAL",
        sourceId: "phase3-2-api-origin",
        idempotencyKey: "phase3-2-api-origin",
        lines: [
          { accountNumber: "1110", debitAmount: 1600 },
          { accountNumber: "2010", creditAmount: 1600 }
        ]
      }
    });

    await requestJson(`${baseUrl}/v1/ledger/journal-entries/${draft.journalEntry.journalEntryId}/validate`, {
      method: "POST",
      token: adminSession.sessionToken,
      body: { companyId: COMPANY_ID }
    });
    await requestJson(`${baseUrl}/v1/ledger/journal-entries/${draft.journalEntry.journalEntryId}/post`, {
      method: "POST",
      token: adminSession.sessionToken,
      body: { companyId: COMPANY_ID }
    });

    const hardClose = await requestJson(`${baseUrl}/v1/ledger/accounting-periods/${januaryPeriod.accountingPeriodId}/lock`, {
      method: "POST",
      token: adminSession.sessionToken,
      body: {
        companyId: COMPANY_ID,
        status: "hard_closed",
        reasonCode: "year_end_close",
        approvedByActorId: "finance-approver-1",
        approvedByRoleCode: "close_signatory"
      }
    });
    assert.equal(hardClose.accountingPeriod.status, "hard_closed");

    const lockedAttempt = await requestJson(`${baseUrl}/v1/ledger/journal-entries`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 409,
      body: {
        companyId: COMPANY_ID,
        journalDate: "2026-01-20",
        voucherSeriesCode: "A",
        sourceType: "MANUAL_JOURNAL",
        sourceId: "phase3-2-api-locked",
        idempotencyKey: "phase3-2-api-locked",
        lines: [
          { accountNumber: "1110", debitAmount: 500 },
          { accountNumber: "2010", creditAmount: 500 }
        ]
      }
    });
    assert.equal(lockedAttempt.error, "period_locked");

    const corrected = await requestJson(
      `${baseUrl}/v1/ledger/journal-entries/${draft.journalEntry.journalEntryId}/correct`,
      {
        method: "POST",
        token: adminSession.sessionToken,
        body: {
          companyId: COMPANY_ID,
          reasonCode: "project_reclass",
          correctionKey: "phase3-2-api-correction-001",
          reverseOriginal: true,
          lines: [
            {
              accountNumber: "5410",
              debitAmount: 450,
              dimensionJson: {
                projectId: "project-demo-alpha",
                costCenterCode: "CC-200",
                businessAreaCode: "BA-SERVICES"
              }
            },
            { accountNumber: "1110", creditAmount: 450 }
          ]
        }
      }
    );

    assert.equal(corrected.originalJournalEntry.status, "reversed");
    assert.equal(corrected.reversalJournalEntry.journalDate, "2026-02-01");
    assert.equal(corrected.correctedJournalEntry.journalDate, "2026-02-01");
    assert.equal(corrected.correctedJournalEntry.correctionType, "reversal_and_rebook");
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
