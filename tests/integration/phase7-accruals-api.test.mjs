import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";

test("Phase 7.6 API registers accrual schedules and posts, lists and reverses accrual batches", async () => {
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
    installAccrualAccounts(platform);

    const scheduleHeaders = {
      "idempotency-key": "phase7-api-accrual-schedule"
    };
    const schedule = await requestJson(baseUrl, "/v1/ledger/accrual-schedules", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      headers: scheduleHeaders,
      body: {
        companyId: DEMO_IDS.companyId,
        scheduleCode: "API-ACCRUAL-001",
        scheduleName: "Försäkring Q1",
        scheduleKind: "PREPAID_EXPENSE",
        startDate: "2026-01-01",
        endDate: "2026-03-31",
        totalAmount: 300,
        profitAndLossAccountNumber: "6110",
        balanceSheetAccountNumber: "1730"
      }
    });
    const scheduleReplay = await requestJson(baseUrl, "/v1/ledger/accrual-schedules", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      headers: scheduleHeaders,
      body: {
        companyId: DEMO_IDS.companyId,
        scheduleCode: "API-ACCRUAL-001",
        scheduleName: "Försäkring Q1",
        scheduleKind: "PREPAID_EXPENSE",
        startDate: "2026-01-01",
        endDate: "2026-03-31",
        totalAmount: 300,
        profitAndLossAccountNumber: "6110",
        balanceSheetAccountNumber: "1730"
      }
    });
    const listedSchedules = await requestJson(baseUrl, `/v1/ledger/accrual-schedules?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    const fetchedSchedule = await requestJson(
      baseUrl,
      `/v1/ledger/accrual-schedules/${schedule.accrualScheduleId}?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );

    const batchHeaders = {
      "idempotency-key": "phase7-api-accrual-batch"
    };
    const batch = await requestJson(baseUrl, "/v1/ledger/accrual-batches", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      headers: batchHeaders,
      body: {
        companyId: DEMO_IDS.companyId,
        throughDate: "2026-03-31"
      }
    });
    const batchReplay = await requestJson(baseUrl, "/v1/ledger/accrual-batches", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      headers: batchHeaders,
      body: {
        companyId: DEMO_IDS.companyId,
        throughDate: "2026-03-31"
      }
    });
    const listedBatches = await requestJson(baseUrl, `/v1/ledger/accrual-batches?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    const fetchedBatch = await requestJson(
      baseUrl,
      `/v1/ledger/accrual-batches/${batch.accrualBatchId}?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );
    const reversed = await requestJson(
      baseUrl,
      `/v1/ledger/accrual-batches/${batch.accrualBatchId}/reverse`,
      {
        method: "POST",
        token: adminToken,
        body: {
          companyId: DEMO_IDS.companyId,
          reasonCode: "month_end_restate",
          approvedByActorId: "finance-approver",
          approvedByRoleCode: "finance_manager"
        }
      }
    );

    const journal = platform.getJournalEntry({
      companyId: DEMO_IDS.companyId,
      journalEntryId: batch.journalEntryId
    });
    const restoredSchedule = platform.getAccrualSchedule({
      companyId: DEMO_IDS.companyId,
      accrualScheduleId: schedule.accrualScheduleId
    });

    assert.equal(scheduleReplay.accrualScheduleId, schedule.accrualScheduleId);
    assert.equal(listedSchedules.items.some((item) => item.accrualScheduleId === schedule.accrualScheduleId), true);
    assert.equal(fetchedSchedule.accrualScheduleId, schedule.accrualScheduleId);
    assert.equal(batchReplay.accrualBatchId, batch.accrualBatchId);
    assert.equal(batch.scheduleCount, 1);
    assert.equal(batch.items[0].recognitionAmount, 300);
    assert.equal(listedBatches.items.some((item) => item.accrualBatchId === batch.accrualBatchId), true);
    assert.equal(fetchedBatch.accrualBatchId, batch.accrualBatchId);
    assert.equal(journal.lines.some((line) => line.accountNumber === "6110" && Number(line.debitAmount) === 300), true);
    assert.equal(journal.lines.some((line) => line.accountNumber === "1730" && Number(line.creditAmount) === 300), true);
    assert.equal(reversed.status, "reversed");
    assert.equal(typeof reversed.reversalJournalEntryId, "string");
    assert.equal(restoredSchedule.status, "active");
    assert.equal(restoredSchedule.recognizedAmount, 0);
    assert.equal(restoredSchedule.nextRecognitionDate, "2026-01-31");
  } finally {
    await stopServer(server);
  }
});

function installAccrualAccounts(platform) {
  platform.upsertLedgerAccount({
    companyId: DEMO_IDS.companyId,
    accountNumber: "1730",
    accountName: "Förutbetalda kostnader",
    accountClass: "1",
    locked: false,
    allowManualPosting: false,
    actorId: "phase7-api"
  });
  platform.upsertLedgerAccount({
    companyId: DEMO_IDS.companyId,
    accountNumber: "6110",
    accountName: "Kontorsmaterial",
    accountClass: "6",
    locked: false,
    actorId: "phase7-api"
  });
}
