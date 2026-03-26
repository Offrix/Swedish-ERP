import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { createDefaultJobHandlers, runWorkerBatch } from "../../apps/worker/src/worker.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Step 33 migration adds search projection registry and personalization schema", async () => {
  const migration = await readText("packages/db/migrations/20260325010000_phase14_search_projection_registry.sql");
  for (const fragment of [
    "CREATE TABLE IF NOT EXISTS search_projection_contracts",
    "CREATE TABLE IF NOT EXISTS search_documents",
    "CREATE TABLE IF NOT EXISTS saved_views",
    "CREATE TABLE IF NOT EXISTS dashboard_widgets",
    "phase14 search projection registry"
  ]) {
    assert.match(migration, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }
});

test("Phase 2.5 migration adds projection checkpoints and rebuild metadata", async () => {
  const migration = await readText("packages/db/migrations/20260326130000_phase2_projection_checkpoints.sql");
  for (const fragment of [
    "ALTER TABLE search_reindex_requests",
    "ADD COLUMN IF NOT EXISTS rebuild_mode",
    "ADD COLUMN IF NOT EXISTS purged_count",
    "CREATE TABLE IF NOT EXISTS search_projection_checkpoints",
    "phase2 projection checkpoints and rebuild metadata"
  ]) {
    assert.match(migration, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }
});

test("Step 33 API exposes reporting-backed search, saved views and dashboard widgets", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-25T10:15:00Z")
  });
  platform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "system"
  });
  seedLedger(platform);

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
    const sessionToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    const root = await requestJson(`${baseUrl}/`, { token: sessionToken });
    for (const route of [
      "/v1/search/contracts",
      "/v1/search/projection-checkpoints",
      "/v1/search/reindex",
      "/v1/search/documents",
      "/v1/saved-views",
      "/v1/dashboard/widgets"
    ]) {
      assert.equal(root.routes.includes(route), true);
    }

    const snapshot = await requestJson(`${baseUrl}/v1/reporting/report-snapshots`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportCode: "trial_balance",
        fromDate: "2026-03-01",
        toDate: "2026-03-31",
        viewMode: "period"
      }
    });
    assert.equal(snapshot.reportCode, "trial_balance");

    const contracts = await requestJson(`${baseUrl}/v1/search/contracts?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(contracts.items.some((item) => item.projectionCode === "reporting.report_snapshot"), true);

    const reindex = await requestJson(`${baseUrl}/v1/search/reindex`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(reindex.reindexRequest.status, "requested");
    assert.equal(typeof reindex.reindexRequest.jobId, "string");
    assert.equal(reindex.indexingSummary, null);

    const queuedRequests = await requestJson(`${baseUrl}/v1/search/reindex?companyId=${COMPANY_ID}&status=requested`, {
      token: sessionToken
    });
    assert.equal(queuedRequests.items.some((item) => item.searchReindexRequestId === reindex.reindexRequest.searchReindexRequestId), true);

    const processed = await runWorkerBatch({
      platform,
      handlers: createDefaultJobHandlers({ logger: () => {} }),
      logger: () => {},
      workerId: "worker-step33-search-reindex"
    });
    assert.equal(processed, 1);

    const completedRequests = await requestJson(`${baseUrl}/v1/search/reindex?companyId=${COMPANY_ID}&status=completed`, {
      token: sessionToken
    });
    const completedRequest = completedRequests.items.find((item) => item.searchReindexRequestId === reindex.reindexRequest.searchReindexRequestId);
    assert.equal(Boolean(completedRequest), true);
    assert.equal(completedRequest.indexedCount > 0, true);

    const checkpoints = await requestJson(`${baseUrl}/v1/search/projection-checkpoints?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(checkpoints.items.length > 0, true);
    assert.equal(checkpoints.items.some((item) => item.status === "completed"), true);

    const searchResults = await requestJson(`${baseUrl}/v1/search/documents?companyId=${COMPANY_ID}&query=trial`, {
      token: sessionToken
    });
    assert.equal(searchResults.items.some((item) => item.objectType === "report_snapshot"), true);

    const savedView = await requestJson(`${baseUrl}/v1/saved-views`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        surfaceCode: "desktop_reporting",
        title: "Trial balance snapshots",
        queryJson: {
          projectionCode: "reporting.report_snapshot",
          objectType: "report_snapshot"
        },
        sortJson: {
          field: "updatedAt",
          direction: "desc"
        }
      }
    });
    assert.equal(savedView.status, "active");

    const shared = await requestJson(`${baseUrl}/v1/saved-views/${savedView.savedViewId}/share`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        visibilityCode: "company"
      }
    });
    assert.equal(shared.visibilityCode, "company");

    const widget = await requestJson(`${baseUrl}/v1/dashboard/widgets`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        surfaceCode: "desktop_reporting",
        widgetTypeCode: "saved_view_results",
        layoutSlot: "home:1",
        settingsJson: {
          savedViewId: savedView.savedViewId
        }
      }
    });
    assert.equal(widget.status, "active");

    const widgets = await requestJson(`${baseUrl}/v1/dashboard/widgets?companyId=${COMPANY_ID}&surfaceCode=desktop_reporting`, {
      token: sessionToken
    });
    assert.equal(widgets.items.some((item) => item.dashboardWidgetId === widget.dashboardWidgetId), true);
  } finally {
    await stopServer(server);
  }
});

function seedLedger(platform) {
  const created = platform.createJournalEntry({
    companyId: COMPANY_ID,
    journalDate: "2026-03-10",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "phase33-api-journal",
    actorId: "seed",
    idempotencyKey: "phase33-api-journal",
    lines: [
      { accountNumber: "1110", debitAmount: 5000 },
      { accountNumber: "3010", creditAmount: 5000 }
    ]
  });
  platform.validateJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "seed"
  });
  platform.postJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "seed"
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

  return started.sessionToken;
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
