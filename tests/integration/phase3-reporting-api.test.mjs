import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 3.3 migration creates reporting snapshots and reconciliation tables", async () => {
  const migration = await readText("packages/db/migrations/20260321070000_phase3_reporting_reconciliation.sql");
  for (const fragment of [
    "CREATE TABLE IF NOT EXISTS report_definitions",
    "CREATE TABLE IF NOT EXISTS report_snapshots",
    "CREATE TABLE IF NOT EXISTS reconciliation_runs",
    "CREATE TABLE IF NOT EXISTS reconciliation_difference_items",
    "CREATE TABLE IF NOT EXISTS reconciliation_signoffs"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }
});

test("Phase 3.3 API materializes reports with drilldown, journal search and reconciliation sign-off", async () => {
  const now = new Date("2026-03-21T22:45:00Z");
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
    const januaryPeriod = periods.items.find((period) => period.startsOn === "2026-01-01");
    assert.ok(januaryPeriod);

    const origin = await createPostedJournal({
      baseUrl,
      token: adminSession.sessionToken,
      companyId: COMPANY_ID,
      journalDate: "2026-01-15",
      idempotencyKey: "phase3-3-api-origin",
      sourceId: "phase3-3-api-origin",
      lines: [
        { accountNumber: "1110", debitAmount: 1000 },
        { accountNumber: "3010", creditAmount: 1000 }
      ]
    });

    const document = await requestJson(`${baseUrl}/v1/documents`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        documentType: "customer_invoice",
        sourceChannel: "manual",
        sourceReference: "phase3-3-api-origin"
      }
    });
    await requestJson(`${baseUrl}/v1/documents/${document.documentId}/links`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        targetType: "journal_entry",
        targetId: origin.journalEntry.journalEntryId
      }
    });

    const snapshot = await requestJson(`${baseUrl}/v1/reporting/report-snapshots`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportCode: "trial_balance",
        accountingPeriodId: januaryPeriod.accountingPeriodId
      }
    });
    assert.equal(snapshot.reportCode, "trial_balance");

    const drilldown = await requestJson(
      `${baseUrl}/v1/reporting/report-snapshots/${snapshot.reportSnapshotId}/drilldown?companyId=${COMPANY_ID}&lineKey=1110`,
      {
        token: adminSession.sessionToken
      }
    );
    assert.equal(drilldown.line.sourceDocumentCount, 1);
    assert.equal(drilldown.line.drilldownEntries[0].linkedDocuments[0].documentId, document.documentId);

    await createPostedJournal({
      baseUrl,
      token: adminSession.sessionToken,
      companyId: COMPANY_ID,
      journalDate: "2026-01-20",
      idempotencyKey: "phase3-3-api-later",
      sourceId: "phase3-3-api-later",
      lines: [
        { accountNumber: "1110", debitAmount: 500 },
        { accountNumber: "3010", creditAmount: 500 }
      ]
    });

    const historicalSnapshot = await requestJson(
      `${baseUrl}/v1/reporting/report-snapshots/${snapshot.reportSnapshotId}?companyId=${COMPANY_ID}`,
      {
        token: adminSession.sessionToken
      }
    );
    assert.equal(
      historicalSnapshot.lines.find((line) => line.lineKey === "1110").totalDebit,
      1000
    );

    const search = await requestJson(
      `${baseUrl}/v1/reporting/journal-search?companyId=${COMPANY_ID}&reportSnapshotId=${snapshot.reportSnapshotId}&query=phase3-3-api-origin`,
      {
        token: adminSession.sessionToken
      }
    );
    assert.equal(search.totalEntries, 1);
    assert.equal(search.items[0].journalEntryId, origin.journalEntry.journalEntryId);

    const reconciliation = await requestJson(`${baseUrl}/v1/reporting/reconciliations`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        accountingPeriodId: januaryPeriod.accountingPeriodId,
        areaCode: "bank",
        ledgerAccountNumbers: ["1110"],
        subledgerBalanceAmount: 1500,
        checklistSnapshotRef: "close-snapshot-phase3-3-api"
      }
    });
    assert.equal(reconciliation.reconciliationRun.status, "ready_for_signoff");

    const signoff = await requestJson(
      `${baseUrl}/v1/reporting/reconciliations/${reconciliation.reconciliationRun.reconciliationRunId}/signoff`,
      {
        method: "POST",
        token: adminSession.sessionToken,
        body: {
          companyId: COMPANY_ID,
          signatoryRole: "close_signatory",
          evidenceRefs: ["close-snapshot-phase3-3-api"]
        }
      }
    );
    assert.equal(signoff.reconciliationRun.status, "signed");
    assert.equal(signoff.signOff.evidenceSnapshotRef, reconciliation.reconciliationRun.snapshotHash);
  } finally {
    await stopServer(server);
  }
});

async function createPostedJournal({ baseUrl, token, companyId, journalDate, idempotencyKey, sourceId, lines }) {
  const created = await requestJson(`${baseUrl}/v1/ledger/journal-entries`, {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId,
      journalDate,
      voucherSeriesCode: "A",
      sourceType: "MANUAL_JOURNAL",
      sourceId,
      idempotencyKey,
      lines
    }
  });
  await requestJson(`${baseUrl}/v1/ledger/journal-entries/${created.journalEntry.journalEntryId}/validate`, {
    method: "POST",
    token,
    body: { companyId }
  });
  return requestJson(`${baseUrl}/v1/ledger/journal-entries/${created.journalEntry.journalEntryId}/post`, {
    method: "POST",
    token,
    body: { companyId }
  });
}

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
