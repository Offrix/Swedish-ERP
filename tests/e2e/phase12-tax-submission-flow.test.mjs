import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { runWorkerBatch } from "../../apps/worker/src/worker.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

test("Phase 12.2 end-to-end flow exposes declaration and submission routes and drives queue workflow", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T17:20:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const root = await requestJson(baseUrl, "/");
    assert.equal(root.routes.includes("/v1/annual-reporting/packages/:packageId/authority-overview"), true);
    assert.equal(root.routes.includes("/v1/annual-reporting/packages/:packageId/tax-declarations"), true);
    assert.equal(root.routes.includes("/v1/submissions"), true);
    assert.equal(root.routes.includes("/v1/submissions/action-queue"), true);

    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });

    const annualPackage = prepareAnnualPackage(platform);
    const taxPackage = await requestJson(baseUrl, `/v1/annual-reporting/packages/${annualPackage.packageId}/tax-declarations`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });

    const queuedSubmission = await requestJson(baseUrl, "/v1/submissions", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        submissionType: "income_tax_return",
        sourceObjectType: "tax_declaration_package",
        sourceObjectId: taxPackage.taxDeclarationPackageId,
        providerKey: "skatteverket",
        recipientId: "skatteverket:income-tax",
        retryClass: "manual_only",
        idempotencyKey: "phase12-2-e2e"
      }
    });

    await requestJson(baseUrl, `/v1/submissions/${queuedSubmission.submissionId}/sign`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    const failedDispatch = await requestJson(baseUrl, `/v1/submissions/${queuedSubmission.submissionId}/submit`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        simulatedTransportOutcome: "transport_failed"
      }
    });
    assert.equal(failedDispatch.transportQueued, true);
    await runWorkerBatch({
      platform,
      logger: () => {},
      workerId: "phase12-e2e-failed-submission"
    });

    const openQueue = await requestJson(baseUrl, `/v1/submissions/action-queue?companyId=${DEMO_IDS.companyId}&status=open`, {
      token: adminToken
    });
    const queueItem = openQueue.items.find((item) => item.submissionId === queuedSubmission.submissionId);
    assert.equal(queueItem.ownerQueue, "tax_operator");

    const retried = await requestJson(baseUrl, `/v1/submissions/${queuedSubmission.submissionId}/retry`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(retried.previousSubmission.status, "retry_pending");
    assert.equal(retried.submission.attemptNo, 2);

    const retriedDispatch = await requestJson(baseUrl, `/v1/submissions/${retried.submission.submissionId}/submit`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        simulatedTransportOutcome: "technical_ack"
      }
    });
    assert.equal(retriedDispatch.transportQueued, true);
    await runWorkerBatch({
      platform,
      logger: () => {},
      workerId: "phase12-e2e-retried-submission"
    });
    await requestJson(baseUrl, `/v1/submissions/${retried.submission.submissionId}/receipts`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        receiptType: "business_ack",
        rawReference: "phase12-2-e2e-business"
      }
    });
    await requestJson(baseUrl, `/v1/submissions/${retried.submission.submissionId}/receipts`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        receiptType: "final_ack",
        rawReference: "phase12-2-e2e-final"
      }
    });

    const finalized = await requestJson(baseUrl, `/v1/submissions/${retried.submission.submissionId}?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(finalized.status, "finalized");
    assert.deepEqual(
      finalized.receipts.map((receipt) => receipt.receiptType),
      ["technical_ack", "business_ack", "final_ack"]
    );
    const receiptListing = await requestJson(
      baseUrl,
      `/v1/submissions/${retried.submission.submissionId}/receipts?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );
    assert.equal(receiptListing.items.length, 3);
    const evidencePack = await requestJson(
      baseUrl,
      `/v1/submissions/${retried.submission.submissionId}/evidence-pack?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );
    assert.equal(evidencePack.receiptRefs.length, 3);
  } finally {
    await stopServer(server);
  }
});

function prepareAnnualPackage(platform) {
  platform.installLedgerCatalog({
    companyId: DEMO_IDS.companyId,
    actorId: "phase12-2-e2e"
  });
  const period = platform.ensureAccountingYearPeriod({
    companyId: DEMO_IDS.companyId,
    fiscalYear: 2026,
    actorId: "phase12-2-e2e"
  });
  const created = platform.createJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalDate: "2026-01-19",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "phase12-2-e2e-income",
    actorId: "phase12-2-e2e",
    idempotencyKey: "phase12-2-e2e-income",
    lines: [
      { accountNumber: "1510", debitAmount: 8700 },
      { accountNumber: "3010", creditAmount: 8700 }
    ]
  });
  platform.validateJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase12-2-e2e"
  });
  platform.postJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase12-2-e2e"
  });
  platform.lockAccountingPeriod({
    companyId: DEMO_IDS.companyId,
    accountingPeriodId: period.accountingPeriodId,
    status: "hard_closed",
    actorId: "phase12-2-e2e-close-requester",
    reasonCode: "annual_reporting_ready",
    approvedByActorId: DEMO_IDS.userId,
    approvedByRoleCode: "company_admin"
  });
  return platform.createAnnualReportPackage({
    companyId: DEMO_IDS.companyId,
    accountingPeriodId: period.accountingPeriodId,
    profileCode: "k2",
    actorId: DEMO_IDS.userId,
    textSections: {
      management_report: "Phase 12.2 E2E package",
      accounting_policies: "K2 baseline"
    },
    noteSections: {
      notes_bundle: "Phase 12.2 E2E notes",
      simplified_notes: "Simplified notes"
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
  const response = await fetch(`${baseUrl}${path}`, {
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
