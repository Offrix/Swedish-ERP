import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly } from "../helpers/api-helpers.mjs";

test("Phase 12.2 API builds declaration packages, logs receipts and routes failures into action queue", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T17:00:00Z")
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
    platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "submission-field@example.test",
      displayName: "Submission Field",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "submission-field@example.test"
    });
    const annualPackage = prepareAnnualPackage(platform);

    const authorityOverview = await requestJson(`${baseUrl}/v1/annual-reporting/packages/${annualPackage.packageId}/authority-overview?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(authorityOverview.companyId, DEMO_IDS.companyId);
    assert.equal(authorityOverview.fiscalYear, "2026");

    const taxPackage = await requestJson(`${baseUrl}/v1/annual-reporting/packages/${annualPackage.packageId}/tax-declarations`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        versionId: annualPackage.currentVersion.versionId
      }
    });
    assert.equal(taxPackage.exports.every((entry) => entry.allChecksPassed), true);
    assert.equal(taxPackage.exports.some((entry) => entry.exportCode === "sru_rows_csv"), true);

    const finalizedSubmission = await requestJson(`${baseUrl}/v1/submissions`, {
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
        retryClass: "manual_only"
      }
    });

    await requestJson(`${baseUrl}/v1/submissions/${finalizedSubmission.submissionId}/sign`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    await requestJson(`${baseUrl}/v1/submissions/${finalizedSubmission.submissionId}/submit`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        simulatedTransportOutcome: "technical_ack"
      }
    });
    await requestJson(`${baseUrl}/v1/submissions/${finalizedSubmission.submissionId}/receipts`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        receiptType: "business_ack",
        rawReference: "phase12-2-business-ack"
      }
    });
    await requestJson(`${baseUrl}/v1/submissions/${finalizedSubmission.submissionId}/receipts`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        receiptType: "final_ack",
        rawReference: "phase12-2-final-ack"
      }
    });

    const finalizedRecord = await requestJson(`${baseUrl}/v1/submissions/${finalizedSubmission.submissionId}?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(finalizedRecord.status, "finalized");
    assert.deepEqual(
      finalizedRecord.receipts.map((receipt) => receipt.receiptType),
      ["technical_ack", "business_ack", "final_ack"]
    );

    const queuedSubmission = await requestJson(`${baseUrl}/v1/submissions`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        submissionType: "annual_report_submission",
        sourceObjectType: "annual_report_package",
        sourceObjectId: annualPackage.packageId,
        providerKey: "bolagsverket",
        recipientId: "bolagsverket:annual-report",
        signedState: "not_required",
        retryClass: "manual_only",
        idempotencyKey: "phase12-2-annual-report-submission"
      }
    });

    await requestJson(`${baseUrl}/v1/submissions/${queuedSubmission.submissionId}/submit`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        simulatedTransportOutcome: "transport_failed"
      }
    });

    const retried = await requestJson(`${baseUrl}/v1/submissions/${queuedSubmission.submissionId}/retry`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(retried.submission.attemptNo, 2);

    await requestJson(`${baseUrl}/v1/submissions/${retried.submission.submissionId}/submit`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        simulatedTransportOutcome: "technical_ack"
      }
    });
    await requestJson(`${baseUrl}/v1/submissions/${retried.submission.submissionId}/receipts`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        receiptType: "business_nack",
        rawReference: "phase12-2-business-nack",
        requiredInput: ["correct_attachment_metadata"]
      }
    });

    const queue = await requestJson(`${baseUrl}/v1/submissions/action-queue?companyId=${DEMO_IDS.companyId}&status=open`, {
      token: adminToken
    });
    const queueItem = queue.items.find((item) => item.submissionId === retried.submission.submissionId);
    assert.equal(queueItem.actionType, "collect_more_data");
    assert.equal(queueItem.ownerQueue, "tax_operator");

    const resolved = await requestJson(`${baseUrl}/v1/submissions/action-queue/${queueItem.queueItemId}/resolve`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        resolutionCode: "manual_follow_up_started"
      }
    });
    assert.equal(resolved.status, "resolved");

    const forbiddenSubmissions = await fetch(`${baseUrl}/v1/submissions?companyId=${DEMO_IDS.companyId}`, {
      headers: {
        authorization: `Bearer ${fieldUserToken}`
      }
    });
    assert.equal(forbiddenSubmissions.status, 403);
    await forbiddenSubmissions.json();
  } finally {
    await stopServer(server);
  }
});

function prepareAnnualPackage(platform) {
  platform.installLedgerCatalog({
    companyId: DEMO_IDS.companyId,
    actorId: "phase12-2-api"
  });
  const period = platform.ensureAccountingYearPeriod({
    companyId: DEMO_IDS.companyId,
    fiscalYear: 2026,
    actorId: "phase12-2-api"
  });
  const created = platform.createJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalDate: "2026-01-18",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "phase12-2-api-income",
    actorId: "phase12-2-api",
    idempotencyKey: "phase12-2-api-income",
    lines: [
      { accountNumber: "1510", debitAmount: 9100 },
      { accountNumber: "3010", creditAmount: 9100 }
    ]
  });
  platform.validateJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase12-2-api"
  });
  platform.postJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase12-2-api"
  });
  platform.lockAccountingPeriod({
    companyId: DEMO_IDS.companyId,
    accountingPeriodId: period.accountingPeriodId,
    status: "hard_closed",
    actorId: "phase12-2-api-close-requester",
    reasonCode: "annual_reporting_ready",
    approvedByActorId: DEMO_IDS.userId,
    approvedByRoleCode: "company_admin"
  });
  return platform.createAnnualReportPackage({
    companyId: DEMO_IDS.companyId,
    accountingPeriodId: period.accountingPeriodId,
    profileCode: "k3",
    actorId: DEMO_IDS.userId,
    textSections: {
      management_report: "Phase 12.2 API package",
      accounting_policies: "K3 policies",
      material_events: "No material events"
    },
    noteSections: {
      notes_bundle: "Phase 12.2 notes",
      cash_flow_commentary: "Cashflow note",
      related_party_commentary: "Related party note"
    }
  });
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
