import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 11.1 end-to-end flow exposes report builder, snapshots, drilldown and export jobs", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T11:30:00Z")
  });
  platform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "e2e"
  });
  seedCashflow(platform);

  const server = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase2DocumentArchiveEnabled: true,
      phase2CompanyInboxEnabled: true,
      phase2OcrReviewEnabled: true,
      phase3LedgerEnabled: true,
      phase10ProjectsEnabled: true
    }
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const root = await requestJson(baseUrl, "/");
    assert.equal(root.routes.includes("/v1/reporting/metric-definitions"), true);
    assert.equal(root.routes.includes("/v1/reporting/export-jobs"), true);

    const sessionToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    const customDefinition = await requestJson(baseUrl, "/v1/reporting/report-definitions", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        baseReportCode: "project_portfolio",
        reportCode: "project_portfolio_focus",
        name: "Project portfolio focus"
      }
    });
    assert.equal(customDefinition.reportCode, "project_portfolio_focus");

    const snapshot = await requestJson(baseUrl, "/v1/reporting/report-snapshots", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportCode: "cashflow",
        fromDate: "2026-01-01",
        toDate: "2026-01-31",
        viewMode: "period"
      }
    });
    const drilldown = await requestJson(
      baseUrl,
      `/v1/reporting/report-snapshots/${snapshot.reportSnapshotId}/drilldown?companyId=${COMPANY_ID}&lineKey=operating`,
      {
        token: sessionToken
      }
    );
    assert.equal(drilldown.line.metricValues.net_cash_movement_amount, 1800);

    const exportJob = await requestJson(baseUrl, "/v1/reporting/export-jobs", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportSnapshotId: snapshot.reportSnapshotId,
        format: "excel"
      }
    });
    assert.equal(exportJob.status, "delivered");
    assert.match(exportJob.artifactContent, /cash_inflow_amount/);
  } finally {
    await stopServer(server);
  }
});

function seedCashflow(platform) {
  const created = platform.createJournalEntry({
    companyId: COMPANY_ID,
    journalDate: "2026-01-03",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "phase11-e2e-cash",
    actorId: "e2e",
    idempotencyKey: "phase11-e2e-cash",
    lines: [
      { accountNumber: "1110", debitAmount: 1800 },
      { accountNumber: "3010", creditAmount: 1800 }
    ]
  });
  platform.validateJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "e2e"
  });
  platform.postJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "e2e",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
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

  await requestJson(baseUrl, "/v1/auth/mfa/totp/verify", {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: platform.getTotpCodeForTesting({ companyId, email })
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
