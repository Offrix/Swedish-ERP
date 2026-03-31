import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 3.3 end-to-end flow exposes reporting routes, drilldown and signed reconciliation evidence", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-21T23:00:00Z")
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
    assert.equal(root.routes.includes("/v1/reporting/report-snapshots"), true);
    assert.equal(root.routes.includes("/v1/reporting/reconciliations/:reconciliationRunId/signoff"), true);

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

    const periods = await requestJson(baseUrl, `/v1/ledger/accounting-periods?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    const januaryPeriod = periods.items.find((period) => period.startsOn === "2026-01-01");

    const posted = await createPostedJournal({
      baseUrl,
      token: sessionToken,
      companyId: COMPANY_ID,
      journalDate: "2026-01-18",
      idempotencyKey: "phase3-3-e2e-origin",
      sourceId: "phase3-3-e2e-origin",
      lines: [
        { accountNumber: "1110", debitAmount: 700 },
        { accountNumber: "3010", creditAmount: 700 }
      ]
    });

    const document = await requestJson(baseUrl, "/v1/documents", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        documentType: "customer_invoice",
        sourceChannel: "manual",
        sourceReference: "phase3-3-e2e-origin"
      }
    });
    await requestJson(baseUrl, `/v1/documents/${document.documentId}/links`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        targetType: "journal_entry",
        targetId: posted.journalEntry.journalEntryId
      }
    });

    const snapshot = await requestJson(baseUrl, "/v1/reporting/report-snapshots", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportCode: "balance_sheet",
        accountingPeriodId: januaryPeriod.accountingPeriodId
      }
    });
    const drilldown = await requestJson(
      baseUrl,
      `/v1/reporting/report-snapshots/${snapshot.reportSnapshotId}/drilldown?companyId=${COMPANY_ID}&lineKey=1110`,
      {
        token: sessionToken
      }
    );
    assert.equal(drilldown.line.drilldownEntries[0].linkedDocuments.length, 1);

    const reconciliation = await requestJson(baseUrl, "/v1/reporting/reconciliations", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        accountingPeriodId: januaryPeriod.accountingPeriodId,
        areaCode: "bank",
        ledgerAccountNumbers: ["1110"],
        subledgerBalanceAmount: 700,
        checklistSnapshotRef: snapshot.reportSnapshotId
      }
    });
    const signed = await requestJson(
      baseUrl,
      `/v1/reporting/reconciliations/${reconciliation.reconciliationRun.reconciliationRunId}/signoff`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID,
          evidenceRefs: [snapshot.reportSnapshotId]
        }
      }
    );
    assert.equal(signed.reconciliationRun.status, "signed");
    assert.equal(signed.signOff.evidenceRefs[0], snapshot.reportSnapshotId);
  } finally {
    await stopServer(server);
  }
});

async function createPostedJournal({ baseUrl, token, companyId, journalDate, idempotencyKey, sourceId, lines }) {
  const created = await requestJson(baseUrl, "/v1/ledger/journal-entries", {
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
  await requestJson(baseUrl, `/v1/ledger/journal-entries/${created.journalEntry.journalEntryId}/validate`, {
    method: "POST",
    token,
    body: { companyId }
  });
  return requestJson(baseUrl, `/v1/ledger/journal-entries/${created.journalEntry.journalEntryId}/post`, {
    method: "POST",
    token,
    body: {
      companyId,
      approvedByActorId: "finance-approver",
      approvedByRoleCode: "finance_manager"
    }
  });
}

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
