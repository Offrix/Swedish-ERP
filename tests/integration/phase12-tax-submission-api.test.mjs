import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { runWorkerBatch } from "../../apps/worker/src/worker.mjs";
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
    assert.deepEqual(
      taxPackage.rulepackRefs.map((entry) => entry.rulepackCode).sort(),
      ["RP-ANNUAL-FILING-SE", "RP-LEGAL-FORM-SE"]
    );

    const forbiddenTaxDeclarations = await fetch(
      `${baseUrl}/v1/annual-reporting/packages/${annualPackage.packageId}/tax-declarations?companyId=${DEMO_IDS.companyId}`,
      {
        headers: {
          authorization: `Bearer ${fieldUserToken}`
        }
      }
    );
    assert.equal(forbiddenTaxDeclarations.status, 403);
    const forbiddenTaxDeclarationsPayload = await forbiddenTaxDeclarations.json();
    assert.equal(forbiddenTaxDeclarationsPayload.error, "annual_operations_role_forbidden");

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
        retryClass: "manual_only",
        rulepackRefs: taxPackage.rulepackRefs,
        providerBaselineRefs: taxPackage.providerBaselineRefs,
        decisionSnapshotRefs: [
          {
            decisionSnapshotId: "phase12-api-annual-decision-1",
            snapshotTypeCode: "annual_tax_decision",
            sourceDomain: "annual_reporting",
            sourceObjectId: taxPackage.taxDeclarationPackageId,
            sourceObjectVersion: taxPackage.annualReportVersionId,
            decisionHash: "phase12-api-annual-decision-1",
            rulepackCode: "RP-ANNUAL-FILING-SE",
            rulepackVersion: "2026.1"
          }
        ]
      }
    });

    await requestJson(`${baseUrl}/v1/submissions/${finalizedSubmission.submissionId}/sign`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    const finalizedDispatch = await requestJson(`${baseUrl}/v1/submissions/${finalizedSubmission.submissionId}/submit`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        simulatedTransportOutcome: "technical_ack"
      }
    });
    assert.equal(finalizedDispatch.transportQueued, true);
    await runWorkerBatch({
      platform,
      logger: () => {},
      workerId: "phase12-api-finalized-submission"
    });
    const businessReplay = await requestJson(`${baseUrl}/v1/submissions/${finalizedSubmission.submissionId}/replay`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "collect_missing_business_receipt",
        simulatedReceiptType: "business_ack",
        idempotencyKey: "phase12-2-business-ack-replay"
      }
    });
    assert.equal(businessReplay.replayQueued, true);
    assert.equal(businessReplay.replayTarget, "submission.receipt.collect");
    await runWorkerBatch({
      platform,
      logger: () => {},
      workerId: "phase12-api-business-receipt"
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
      finalizedRecord.rulepackRefs.map((entry) => entry.rulepackCode).sort(),
      ["RP-ANNUAL-FILING-SE", "RP-LEGAL-FORM-SE"]
    );
    assert.deepEqual(
      finalizedRecord.receipts.map((receipt) => receipt.receiptType),
      ["technical_ack", "business_ack", "final_ack"]
    );
    const finalizedReceipts = await requestJson(
      `${baseUrl}/v1/submissions/${finalizedSubmission.submissionId}/receipts?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );
    assert.equal(finalizedReceipts.items.length, 3);
    const finalizedEvidencePack = await requestJson(
      `${baseUrl}/v1/submissions/${finalizedSubmission.submissionId}/evidence-pack?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );
    assert.equal(finalizedEvidencePack.receiptRefs.length, 3);
    assert.equal(finalizedEvidencePack.signatureRefs.length, 1);
    assert.equal(finalizedEvidencePack.providerBaselineRefs.length >= 1, true);
    assert.equal(finalizedEvidencePack.decisionSnapshotRefs[0].snapshotTypeCode, "annual_tax_decision");

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
        idempotencyKey: "phase12-2-annual-report-submission",
        rulepackRefs: annualPackage.currentVersion.rulepackRefs,
        providerBaselineRefs: annualPackage.currentVersion.providerBaselineRefs,
        decisionSnapshotRefs: [
          {
            decisionSnapshotId: "phase12-api-annual-report-decision-1",
            snapshotTypeCode: "annual_report_filing_decision",
            sourceDomain: "annual_reporting",
            sourceObjectId: annualPackage.packageId,
            sourceObjectVersion: annualPackage.currentVersion.versionId,
            decisionHash: "phase12-api-annual-report-decision-1",
            rulepackCode: "RP-ANNUAL-FILING-SE",
            rulepackVersion: "2026.1"
          }
        ]
      }
    });

    const failedDispatch = await requestJson(`${baseUrl}/v1/submissions/${queuedSubmission.submissionId}/submit`, {
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
      workerId: "phase12-api-queued-submission"
    });

    const retried = await requestJson(`${baseUrl}/v1/submissions/${queuedSubmission.submissionId}/retry`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(retried.submission.attemptNo, 2);
    assert.deepEqual(
      retried.submission.rulepackRefs.map((entry) => entry.rulepackCode).sort(),
      ["RP-ANNUAL-FILING-SE", "RP-LEGAL-FORM-SE"]
    );
    assert.equal(retried.submission.providerBaselineRefs[0].baselineCode, "SE-IXBRL-FILING");

    const retriedDispatch = await requestJson(`${baseUrl}/v1/submissions/${retried.submission.submissionId}/submit`, {
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
      workerId: "phase12-api-retried-submission"
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

    const reconciliation = await requestJson(
      `${baseUrl}/v1/submissions/${retried.submission.submissionId}/reconciliation?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );
    assert.equal(reconciliation.materialReceiptStateCode, "rejected");
    assert.equal(reconciliation.correctionRequired, true);
    assert.equal(reconciliation.replayAllowed, false);

    const recoveries = await requestJson(
      `${baseUrl}/v1/submissions/${retried.submission.submissionId}/recoveries?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );
    assert.equal(recoveries.items.length, 1);
    assert.equal(recoveries.items[0].requiredActionCode, "collect_more_data");

    const replayAfterReject = await requestJson(`${baseUrl}/v1/submissions/${retried.submission.submissionId}/replay`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "illegal_retry_after_material_reject",
        simulatedReceiptType: "business_ack"
      }
    });
    assert.equal(replayAfterReject.error, "submission_replay_requires_correction");

    const resolvedRecovery = await requestJson(
      `${baseUrl}/v1/submissions/${retried.submission.submissionId}/recoveries/${recoveries.items[0].submissionRecoveryId}/resolve`,
      {
        method: "POST",
        token: adminToken,
        body: {
          companyId: DEMO_IDS.companyId,
          resolutionCode: "manual_investigation_opened",
          note: "Operator anchored the recovery to a manual correction track."
        }
      }
    );
    assert.equal(resolvedRecovery.status, "resolved");

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

test("Phase 12.2 API opens submission corrections with preserved receipt evidence", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T17:20:00Z")
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
    const annualPackage = prepareAnnualPackage(platform);

    const taxPackage = await requestJson(`${baseUrl}/v1/annual-reporting/packages/${annualPackage.packageId}/tax-declarations`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        versionId: annualPackage.currentVersion.versionId
      }
    });

    const originalSubmission = await requestJson(`${baseUrl}/v1/submissions`, {
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
        idempotencyKey: "phase12-api-correction-original"
      }
    });

    await requestJson(`${baseUrl}/v1/submissions/${originalSubmission.submissionId}/sign`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    await requestJson(`${baseUrl}/v1/submissions/${originalSubmission.submissionId}/submit`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        simulatedTransportOutcome: "technical_ack"
      }
    });
    await runWorkerBatch({
      platform,
      logger: () => {},
      workerId: "phase12-api-correction-transport"
    });
    await requestJson(`${baseUrl}/v1/submissions/${originalSubmission.submissionId}/receipts`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        receiptType: "business_ack",
        rawReference: "phase12-api-correction-business-ack"
      }
    });
    await requestJson(`${baseUrl}/v1/submissions/${originalSubmission.submissionId}/receipts`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        receiptType: "final_ack",
        rawReference: "phase12-api-correction-final-ack"
      }
    });

    const correction = await requestJson(`${baseUrl}/v1/submissions/${originalSubmission.submissionId}/corrections`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "period_reopened",
        sourceObjectVersion: "api-tax-package:v2",
        payloadVersion: "phase12.2-correction",
        payload: {
          exportCode: "ink2_support_json",
          sourceObjectVersion: "api-tax-package:v2",
          checksum: "api-tax-package-checksum-v2"
        },
        idempotencyKey: "phase12-api-correction-v2"
      }
    });

    assert.equal(correction.previousSubmission.status, "superseded");
    assert.equal(correction.submission.correctionOfSubmissionId, originalSubmission.submissionId);
    assert.equal(correction.submission.correctionChainId, originalSubmission.submissionId);
    assert.equal(correction.submission.sourceObjectVersion, "api-tax-package:v2");
    assert.equal(correction.correctionLink.reasonCode, "period_reopened");

    const repeated = await requestJson(`${baseUrl}/v1/submissions/${originalSubmission.submissionId}/corrections`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "period_reopened",
        sourceObjectVersion: "api-tax-package:v2",
        payloadVersion: "phase12.2-correction",
        payload: {
          exportCode: "ink2_support_json",
          sourceObjectVersion: "api-tax-package:v2",
          checksum: "api-tax-package-checksum-v2"
        },
        idempotencyKey: "phase12-api-correction-v2"
      }
    });
    assert.equal(repeated.idempotentReplay, true);
    assert.equal(repeated.submission.submissionId, correction.submission.submissionId);

    const correctionEvidence = await requestJson(
      `${baseUrl}/v1/submissions/${correction.submission.submissionId}/evidence-pack?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );
    assert.equal(correctionEvidence.correctionLinks.length, 1);
    assert.equal(correctionEvidence.preservedPriorReceiptRefs.length, 3);
  } finally {
    await stopServer(server);
  }
});

test("Phase 13.4 API blocks unsigned and stale annual filing payloads", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-28T09:30:00Z")
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
    const unsignedPackage = prepareUnsignedAnnualPackage(platform);

    const unsignedResponse = await fetch(`${baseUrl}/v1/submissions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        companyId: DEMO_IDS.companyId,
        submissionType: "annual_report_submission",
        sourceObjectType: "annual_report_package",
        sourceObjectId: unsignedPackage.packageId,
        providerKey: "bolagsverket",
        recipientId: "bolagsverket:annual-report",
        signedState: "not_required",
        retryClass: "manual_only"
      })
    });
    const unsignedPayload = await unsignedResponse.json();
    assert.equal(unsignedResponse.status, 409);
    assert.equal(unsignedPayload.error, "annual_report_version_not_locked_for_submission");

    const annualPackage = signAnnualPackage(platform, unsignedPackage);
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
        idempotencyKey: "phase13-4-annual-report-stale"
      }
    });
    assert.equal(queuedSubmission.payloadJson.signoffHash, annualPackage.currentVersion.checksum);

    const revisedPackage = platform.createAnnualReportVersion({
      companyId: DEMO_IDS.companyId,
      packageId: annualPackage.packageId,
      actorId: DEMO_IDS.userId,
      textSections: {
        management_report: "Phase 13.4 revised management report",
        accounting_policies: "K3 policies",
        material_events: "Updated note"
      },
      noteSections: {
        notes_bundle: "Phase 13.4 revised notes",
        cash_flow_commentary: "Cashflow note",
        related_party_commentary: "Related party note"
      }
    });
    signAnnualPackage(platform, revisedPackage);

    const staleSubmit = await fetch(`${baseUrl}/v1/submissions/${queuedSubmission.submissionId}/submit`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        companyId: DEMO_IDS.companyId,
        simulatedTransportOutcome: "technical_ack"
      })
    });
    const stalePayload = await staleSubmit.json();
    assert.equal(staleSubmit.status, 409);
    assert.equal(stalePayload.error, "annual_report_submission_version_mismatch");
  } finally {
    await stopServer(server);
  }
});

function prepareAnnualPackage(platform) {
  return signAnnualPackage(platform, prepareUnsignedAnnualPackage(platform));
}

function prepareUnsignedAnnualPackage(platform) {
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

function signAnnualPackage(platform, annualPackage) {
  platform.inviteAnnualReportSignatory({
    companyId: DEMO_IDS.companyId,
    packageId: annualPackage.packageId,
    versionId: annualPackage.currentVersion.versionId,
    companyUserId: DEMO_IDS.companyUserId,
    signatoryRole: "ceo"
  });
  return platform.signAnnualReportVersion({
    companyId: DEMO_IDS.companyId,
    packageId: annualPackage.packageId,
    versionId: annualPackage.currentVersion.versionId,
    actorId: DEMO_IDS.userId,
    comment: "Signed annual package for API flow."
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
