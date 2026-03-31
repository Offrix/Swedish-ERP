import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";

test("Phase 7.6 API registers asset cards and posts, lists and reverses depreciation batches", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-04-05T09:00:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });
    installDepreciationAccounts(platform);

    const assetHeaders = {
      "idempotency-key": "phase7-api-asset-card"
    };
    const assetCard = await requestJson(baseUrl, "/v1/ledger/asset-cards", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      headers: assetHeaders,
      body: {
        companyId: DEMO_IDS.companyId,
        assetCode: "INV-API-001",
        assetName: "Datorer",
        acquisitionDate: "2026-01-15",
        inServiceDate: "2026-01-15",
        costAmount: 1200,
        usefulLifeMonths: 12,
        assetAccountNumber: "1260",
        accumulatedDepreciationAccountNumber: "1269",
        depreciationExpenseAccountNumber: "7830"
      }
    });
    const assetReplay = await requestJson(baseUrl, "/v1/ledger/asset-cards", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      headers: assetHeaders,
      body: {
        companyId: DEMO_IDS.companyId,
        assetCode: "INV-API-001",
        assetName: "Datorer",
        acquisitionDate: "2026-01-15",
        inServiceDate: "2026-01-15",
        costAmount: 1200,
        usefulLifeMonths: 12,
        assetAccountNumber: "1260",
        accumulatedDepreciationAccountNumber: "1269",
        depreciationExpenseAccountNumber: "7830"
      }
    });
    const listedAssets = await requestJson(baseUrl, `/v1/ledger/asset-cards?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    const fetchedAsset = await requestJson(
      baseUrl,
      `/v1/ledger/asset-cards/${assetCard.assetCardId}?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );

    const batchHeaders = {
      "idempotency-key": "phase7-api-depreciation-q1"
    };
    const batch = await requestJson(baseUrl, "/v1/ledger/depreciation-batches", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      headers: batchHeaders,
      body: {
        companyId: DEMO_IDS.companyId,
        throughDate: "2026-03-31"
      }
    });
    const batchReplay = await requestJson(baseUrl, "/v1/ledger/depreciation-batches", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      headers: batchHeaders,
      body: {
        companyId: DEMO_IDS.companyId,
        throughDate: "2026-03-31"
      }
    });
    const listedBatches = await requestJson(baseUrl, `/v1/ledger/depreciation-batches?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    const fetchedBatch = await requestJson(
      baseUrl,
      `/v1/ledger/depreciation-batches/${batch.depreciationBatchId}?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );
    const reversed = await requestJson(
      baseUrl,
      `/v1/ledger/depreciation-batches/${batch.depreciationBatchId}/reverse`,
      {
        method: "POST",
        token: adminToken,
        body: {
          companyId: DEMO_IDS.companyId,
          reasonCode: "asset_schedule_restate",
          approvedByActorId: "finance-approver",
          approvedByRoleCode: "finance_manager"
        }
      }
    );

    const journal = platform.getJournalEntry({
      companyId: DEMO_IDS.companyId,
      journalEntryId: batch.journalEntryId
    });
    const restoredAsset = platform.getAssetCard({
      companyId: DEMO_IDS.companyId,
      assetCardId: assetCard.assetCardId
    });

    assert.equal(assetReplay.assetCardId, assetCard.assetCardId);
    assert.equal(listedAssets.items.some((item) => item.assetCardId === assetCard.assetCardId), true);
    assert.equal(fetchedAsset.assetCardId, assetCard.assetCardId);
    assert.equal(batchReplay.depreciationBatchId, batch.depreciationBatchId);
    assert.equal(batch.assetCount, 1);
    assert.equal(batch.items[0].depreciationAmount, 300);
    assert.equal(listedBatches.items.some((item) => item.depreciationBatchId === batch.depreciationBatchId), true);
    assert.equal(fetchedBatch.depreciationBatchId, batch.depreciationBatchId);
    assert.equal(journal.lines.some((line) => line.accountNumber === "7830" && Number(line.debitAmount) === 300), true);
    assert.equal(journal.lines.some((line) => line.accountNumber === "1269" && Number(line.creditAmount) === 300), true);
    assert.equal(reversed.status, "reversed");
    assert.equal(typeof reversed.reversalJournalEntryId, "string");
    assert.equal(restoredAsset.bookedDepreciationAmount, 0);
    assert.equal(restoredAsset.nextDepreciationDate, "2026-01-31");
  } finally {
    await stopServer(server);
  }
});

function installDepreciationAccounts(platform) {
  platform.upsertLedgerAccount({
    companyId: DEMO_IDS.companyId,
    accountNumber: "1260",
    accountName: "Inventarier",
    accountClass: "1",
    locked: false,
    allowManualPosting: false,
    actorId: "phase7-api"
  });
  platform.upsertLedgerAccount({
    companyId: DEMO_IDS.companyId,
    accountNumber: "1269",
    accountName: "Ackumulerade avskrivningar inventarier",
    accountClass: "1",
    locked: false,
    allowManualPosting: false,
    actorId: "phase7-api"
  });
  platform.upsertLedgerAccount({
    companyId: DEMO_IDS.companyId,
    accountNumber: "7830",
    accountName: "Avskrivningar inventarier",
    accountClass: "7",
    locked: false,
    actorId: "phase7-api"
  });
}
