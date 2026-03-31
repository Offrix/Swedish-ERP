import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";

test("Phase 7.5 API posts, lists and reverses opening balance batches", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2027-01-05T09:00:00Z")
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

    const fiscalYear = await requestJson(baseUrl, "/v1/fiscal-years", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        startDate: "2027-01-01",
        endDate: "2027-12-31",
        approvalBasisCode: "BOOKKEEPING_ENTRY"
      }
    });
    await requestJson(baseUrl, `/v1/fiscal-years/${fiscalYear.fiscalYearId}/activate`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });

    const createHeaders = {
      "idempotency-key": "phase7-opening-balance-api"
    };
    const batch = await requestJson(baseUrl, "/v1/ledger/opening-balances", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      headers: createHeaders,
      body: {
        companyId: DEMO_IDS.companyId,
        fiscalYearId: fiscalYear.fiscalYearId,
        openingDate: "2027-01-01",
        sourceCode: "migration_cutover",
        externalReference: "bokio-cutover-2027",
        evidenceRefs: ["sie4://demo/2027-opening"],
        lines: [
          { accountNumber: "1110", debitAmount: 1500 },
          { accountNumber: "2010", creditAmount: 1200 },
          { accountNumber: "2990", creditAmount: 300 }
        ]
      }
    });
    const replay = await requestJson(baseUrl, "/v1/ledger/opening-balances", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      headers: createHeaders,
      body: {
        companyId: DEMO_IDS.companyId,
        fiscalYearId: fiscalYear.fiscalYearId,
        openingDate: "2027-01-01",
        sourceCode: "migration_cutover",
        externalReference: "bokio-cutover-2027",
        evidenceRefs: ["sie4://demo/2027-opening"],
        lines: [
          { accountNumber: "1110", debitAmount: 1500 },
          { accountNumber: "2010", creditAmount: 1200 },
          { accountNumber: "2990", creditAmount: 300 }
        ]
      }
    });
    const listed = await requestJson(baseUrl, `/v1/ledger/opening-balances?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    const fetched = await requestJson(
      baseUrl,
      `/v1/ledger/opening-balances/${batch.openingBalanceBatchId}?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );
    const reversed = await requestJson(
      baseUrl,
      `/v1/ledger/opening-balances/${batch.openingBalanceBatchId}/reverse`,
      {
        method: "POST",
        token: adminToken,
        body: {
          companyId: DEMO_IDS.companyId,
          reasonCode: "migration_restate",
          approvedByActorId: "finance-approver",
          approvedByRoleCode: "finance_manager"
        }
      }
    );

    assert.equal(batch.openingBalanceBatchId, replay.openingBalanceBatchId);
    assert.equal(batch.status, "posted");
    assert.equal(typeof batch.journalEntryId, "string");
    assert.equal(listed.items.some((item) => item.openingBalanceBatchId === batch.openingBalanceBatchId), true);
    assert.equal(fetched.openingBalanceBatchId, batch.openingBalanceBatchId);
    assert.equal(reversed.status, "reversed");
    assert.equal(typeof reversed.reversalJournalEntryId, "string");
  } finally {
    await stopServer(server);
  }
});
