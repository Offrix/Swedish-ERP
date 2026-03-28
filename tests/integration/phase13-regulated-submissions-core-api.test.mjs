import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { runWorkerBatch } from "../../apps/worker/src/worker.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 13.2 API exposes canonical submission attempts and evidence-pack state", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-28T15:00:00Z")
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

    const created = await requestJson(baseUrl, "/v1/submissions", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        submissionType: "vat_declaration",
        sourceObjectType: "vat_return",
        sourceObjectId: "vat-return-phase13-2",
        payloadVersion: "phase13.2",
        providerKey: "skatteverket",
        recipientId: "skatteverket:vat",
        payload: {
          sourceObjectVersion: "vat-return-phase13-2:v1",
          vatDecisionId: "vat-decision-phase13-2"
        }
      }
    });

    await requestJson(baseUrl, `/v1/submissions/${created.submissionId}/sign`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    const queued = await requestJson(baseUrl, `/v1/submissions/${created.submissionId}/submit`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        simulatedTransportOutcome: "technical_ack"
      }
    });
    assert.equal(queued.transportQueued, true);

    await runWorkerBatch({
      platform,
      logger: () => {},
      workerId: "phase13-2-regulated-submission-core"
    });

    const submission = await requestJson(baseUrl, `/v1/submissions/${created.submissionId}?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(submission.canonicalEnvelope.envelopeState, "technically_accepted");
    assert.equal(submission.attempts.length, 1);
    assert.equal(submission.attempts[0].attemptStageCode, "transport");
    assert.equal(submission.attempts[0].status, "succeeded");

    const attempts = await requestJson(
      baseUrl,
      `/v1/submissions/${created.submissionId}/attempts?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );
    assert.equal(attempts.items.length, 1);
    assert.equal(attempts.items[0].submissionAttemptNo, 1);
    assert.equal(attempts.items[0].legalEffect, true);

    const evidencePack = await requestJson(
      baseUrl,
      `/v1/submissions/${created.submissionId}/evidence-pack?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );
    assert.equal(evidencePack.envelopeState, "technically_accepted");
    assert.equal(evidencePack.attemptRefs.length, 1);
    assert.equal(evidencePack.attemptRefs[0].attemptStageCode, "transport");
  } finally {
    await stopServer(server);
  }
});

test("Phase 13.3 API keeps production transport on official fallback path without synthetic technical receipts", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-28T15:20:00Z")
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
    const taxPackage = prepareSignedTaxDeclarationPackage(platform);

    const created = await requestJson(baseUrl, "/v1/submissions", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        submissionType: "income_tax_return",
        sourceObjectType: "tax_declaration_package",
        sourceObjectId: taxPackage.taxDeclarationPackageId,
        providerKey: "skatteverket",
        recipientId: "skatteverket:income-tax"
      }
    });

    await requestJson(baseUrl, `/v1/submissions/${created.submissionId}/sign`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });

    const queued = await requestJson(baseUrl, `/v1/submissions/${created.submissionId}/submit`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        mode: "production"
      }
    });
    assert.equal(queued.transportQueued, true);

    await runWorkerBatch({
      platform,
      logger: () => {},
      workerId: "phase13-3-regulated-submission-core"
    });

    const submission = await requestJson(baseUrl, `/v1/submissions/${created.submissionId}?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(submission.status, "submitted");
    assert.equal(submission.canonicalEnvelope.envelopeState, "awaiting_receipts");
    assert.equal(submission.receipts.length, 0);
    assert.equal(submission.lastTransportPlan.fallbackActivated, true);
    assert.equal(submission.attempts[0].fallbackActivated, true);
    assert.equal(submission.actionQueueItems.some((item) => item.actionType === "contact_provider"), true);
  } finally {
    await stopServer(server);
  }
});

function prepareSignedTaxDeclarationPackage(platform) {
  platform.installLedgerCatalog({
    companyId: DEMO_IDS.companyId,
    actorId: "phase13-3-api"
  });
  const period = platform.ensureAccountingYearPeriod({
    companyId: DEMO_IDS.companyId,
    fiscalYear: 2026,
    actorId: "phase13-3-api"
  });
  const created = platform.createJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalDate: "2026-01-20",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "phase13-3-api-income",
    actorId: "phase13-3-api",
    idempotencyKey: "phase13-3-api-income",
    lines: [
      { accountNumber: "1510", debitAmount: 9400 },
      { accountNumber: "3010", creditAmount: 9400 }
    ]
  });
  platform.validateJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase13-3-api"
  });
  platform.postJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase13-3-api"
  });
  platform.lockAccountingPeriod({
    companyId: DEMO_IDS.companyId,
    accountingPeriodId: period.accountingPeriodId,
    status: "hard_closed",
    actorId: "phase13-3-close-requester",
    reasonCode: "annual_reporting_ready",
    approvedByActorId: DEMO_IDS.userId,
    approvedByRoleCode: "company_admin"
  });
  const annualPackage = platform.createAnnualReportPackage({
    companyId: DEMO_IDS.companyId,
    accountingPeriodId: period.accountingPeriodId,
    profileCode: "k2",
    actorId: DEMO_IDS.userId,
    textSections: {
      management_report: "Phase 13.3 API package",
      accounting_policies: "K2 baseline"
    },
    noteSections: {
      notes_bundle: "Phase 13.3 notes",
      simplified_notes: "Phase 13.3 simplified notes"
    }
  });
  platform.inviteAnnualReportSignatory({
    companyId: DEMO_IDS.companyId,
    packageId: annualPackage.packageId,
    versionId: annualPackage.currentVersion.versionId,
    companyUserId: DEMO_IDS.companyUserId,
    signatoryRole: "ceo"
  });
  const signedPackage = platform.signAnnualReportVersion({
    companyId: DEMO_IDS.companyId,
    packageId: annualPackage.packageId,
    versionId: annualPackage.currentVersion.versionId,
    actorId: DEMO_IDS.userId,
    comment: "Signed annual package for regulated submission fallback."
  });
  return platform.createTaxDeclarationPackage({
    companyId: DEMO_IDS.companyId,
    packageId: signedPackage.packageId,
    actorId: DEMO_IDS.userId
  });
}
