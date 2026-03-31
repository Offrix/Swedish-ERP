import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";

test("Phase 7.5 API posts, lists and reverses year-end transfer batches", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2029-01-05T09:00:00Z")
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

    const fiscalYear2028 = await requestJson(baseUrl, "/v1/fiscal-years", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        startDate: "2028-01-01",
        endDate: "2028-12-31",
        approvalBasisCode: "BOOKKEEPING_ENTRY"
      }
    });
    await requestJson(baseUrl, `/v1/fiscal-years/${fiscalYear2028.fiscalYearId}/activate`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    const fiscalYear2029 = await requestJson(baseUrl, "/v1/fiscal-years", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        startDate: "2029-01-01",
        endDate: "2029-12-31",
        approvalBasisCode: "BOOKKEEPING_ENTRY"
      }
    });
    await requestJson(baseUrl, `/v1/fiscal-years/${fiscalYear2029.fiscalYearId}/activate`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });

    postJournal(platform, {
      journalDate: "2028-06-15",
      sourceId: "phase7-api-year-end-revenue",
      idempotencyKey: "phase7-api-year-end-revenue",
      lines: [
        { accountNumber: "1110", debitAmount: 1000 },
        { accountNumber: "3010", creditAmount: 1000 }
      ]
    });
    postJournal(platform, {
      journalDate: "2028-09-20",
      sourceId: "phase7-api-year-end-expense",
      idempotencyKey: "phase7-api-year-end-expense",
      lines: [
        { accountNumber: "4010", debitAmount: 400 },
        { accountNumber: "2410", creditAmount: 400 }
      ]
    });

    const resultHeaders = {
      "idempotency-key": "phase7-api-result-transfer"
    };
    const resultTransfer = await requestJson(baseUrl, "/v1/ledger/year-end-transfers", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      headers: resultHeaders,
      body: {
        companyId: DEMO_IDS.companyId,
        fiscalYearId: fiscalYear2028.fiscalYearId,
        transferKind: "RESULT_TRANSFER",
        sourceCode: "year_end_close"
      }
    });
    const replay = await requestJson(baseUrl, "/v1/ledger/year-end-transfers", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      headers: resultHeaders,
      body: {
        companyId: DEMO_IDS.companyId,
        fiscalYearId: fiscalYear2028.fiscalYearId,
        transferKind: "RESULT_TRANSFER",
        sourceCode: "year_end_close"
      }
    });
    const retainedTransfer = await requestJson(baseUrl, "/v1/ledger/year-end-transfers", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      headers: {
        "idempotency-key": "phase7-api-retained-transfer"
      },
      body: {
        companyId: DEMO_IDS.companyId,
        fiscalYearId: fiscalYear2028.fiscalYearId,
        transferKind: "RETAINED_EARNINGS_TRANSFER",
        transferDate: "2029-01-01",
        sourceCode: "annual_result_disposition"
      }
    });
    const listed = await requestJson(baseUrl, `/v1/ledger/year-end-transfers?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    const fetched = await requestJson(
      baseUrl,
      `/v1/ledger/year-end-transfers/${retainedTransfer.yearEndTransferBatchId}?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );
    const reversed = await requestJson(
      baseUrl,
      `/v1/ledger/year-end-transfers/${retainedTransfer.yearEndTransferBatchId}/reverse`,
      {
        method: "POST",
        token: adminToken,
        body: {
          companyId: DEMO_IDS.companyId,
          reasonCode: "board_restate",
          approvedByActorId: "finance-approver",
          approvedByRoleCode: "finance_manager"
        }
      }
    );

    assert.equal(resultTransfer.yearEndTransferBatchId, replay.yearEndTransferBatchId);
    assert.equal(resultTransfer.transferKind, "RESULT_TRANSFER");
    assert.equal(retainedTransfer.transferKind, "RETAINED_EARNINGS_TRANSFER");
    assert.equal(retainedTransfer.resultTransferBatchId, resultTransfer.yearEndTransferBatchId);
    assert.equal(listed.items.some((item) => item.yearEndTransferBatchId === retainedTransfer.yearEndTransferBatchId), true);
    assert.equal(fetched.yearEndTransferBatchId, retainedTransfer.yearEndTransferBatchId);
    assert.equal(reversed.status, "reversed");
    assert.equal(typeof reversed.reversalJournalEntryId, "string");
  } finally {
    await stopServer(server);
  }
});

function postJournal(platform, { journalDate, sourceId, idempotencyKey, lines }) {
  const created = platform.createJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalDate,
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId,
    actorId: "phase7-api",
    idempotencyKey,
    description: sourceId,
    lines
  });
  platform.validateJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase7-api"
  });
  platform.postJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase7-api",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });
}
