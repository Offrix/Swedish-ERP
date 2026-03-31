import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

test("Phase 11.3 API exposes close workbench, blocker handling, sign-off and reopen", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T13:15:00Z")
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
    const preparer = platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "close-api-preparer@example.test",
      displayName: "Close API Preparer",
      roleCode: "bureau_user",
      requiresMfa: false
    });
    const preparerToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: preparer.user.email
    });

    const { clientCompany, period, sourceJournalEntryId, reportSnapshotId, reconciliationRuns } = seedClientCloseSetup(platform, adminToken, preparer.companyUserId);

    const checklist = await requestJson(`${baseUrl}/v1/close/checklists`, {
      method: "POST",
      token: preparerToken,
      expectedStatus: 201,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        clientCompanyId: clientCompany.companyId,
        accountingPeriodId: period.accountingPeriodId,
        reportSnapshotId,
        signoffChain: [
          { companyUserId: preparer.companyUserId, roleCode: "close_preparer" },
          { companyUserId: DEMO_IDS.companyUserId, roleCode: "close_signatory" }
        ]
      }
    });

    const workbenchList = await requestJson(`${baseUrl}/v1/close/workbench?bureauOrgId=${DEMO_IDS.companyId}&clientCompanyId=${clientCompany.companyId}`, {
      token: preparerToken
    });
    assert.equal(workbenchList.items.length, 1);

    for (const step of checklist.steps) {
      const body = step.reconciliationAreaCode
        ? { bureauOrgId: DEMO_IDS.companyId, reconciliationRunId: reconciliationRuns[step.reconciliationAreaCode] }
        : step.evidenceType === "report_snapshot"
          ? { bureauOrgId: DEMO_IDS.companyId, evidenceRefs: [{ reportSnapshotId }] }
          : { bureauOrgId: DEMO_IDS.companyId, evidenceRefs: [{ note: `${step.stepCode} complete` }] };
      await requestJson(`${baseUrl}/v1/close/checklists/${checklist.checklistId}/steps/${step.stepCode}/complete`, {
        method: "POST",
        token: preparerToken,
        body
      });
    }

    const blocker = await requestJson(`${baseUrl}/v1/close/checklists/${checklist.checklistId}/blockers`, {
      method: "POST",
      token: preparerToken,
      expectedStatus: 201,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        stepCode: "document_queue_review",
        severity: "hard_stop",
        reasonCode: "attachment_gap",
        comment: "Missing evidence attachment."
      }
    });
    assert.equal(blocker.status, "open");

    const blockedSignoff = await requestJson(`${baseUrl}/v1/close/checklists/${checklist.checklistId}/signoff`, {
      method: "POST",
      token: preparerToken,
      expectedStatus: 400,
      body: {
        bureauOrgId: DEMO_IDS.companyId
      }
    });
    assert.equal(blockedSignoff.error, "close_blocker_open");

    const override = await requestJson(`${baseUrl}/v1/close/blockers/${blocker.blockerId}/override`, {
      method: "POST",
      token: adminToken,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        waiverUntil: "2026-04-30",
        comment: "Waiver accepted."
      }
    });
    assert.equal(override.status, "waived");

    const pendingSignoff = await requestJson(`${baseUrl}/v1/close/checklists/${checklist.checklistId}/signoff`, {
      method: "POST",
      token: preparerToken,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        comment: "Prepared."
      }
    });
    assert.equal(pendingSignoff.status, "signoff_pending");
    assert.ok(pendingSignoff.closeEvidenceBundleId);
    assert.equal(pendingSignoff.closeEvidenceBundle?.status, "frozen");
    assert.equal(pendingSignoff.signoffs[0]?.evidenceBundleId, pendingSignoff.closeEvidenceBundleId);

    const closed = await requestJson(`${baseUrl}/v1/close/checklists/${checklist.checklistId}/signoff`, {
      method: "POST",
      token: adminToken,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        comment: "Approved."
      }
    });
    assert.equal(closed.status, "closed");
    assert.equal(closed.closeState, "hard_closed");
    assert.equal(closed.closedByUserId, DEMO_IDS.userId);
    assert.equal(closed.closedByCompanyUserId, DEMO_IDS.companyUserId);
    assert.ok(closed.hardCloseEvidenceRef);
    assert.equal(closed.accountingPeriod.lockedByActorId, DEMO_IDS.userId);
    assert.equal(closed.accountingPeriod.lockApprovalMode, "close_signoff_chain");
    assert.deepEqual(closed.accountingPeriod.lockApprovalActorIds, [preparer.user.userId]);
    assert.ok(closed.accountingPeriod.lockApprovalEvidenceRef);
    assert.ok(closed.closeEvidenceBundleId);
    assert.equal(closed.closeEvidenceBundle?.status, "frozen");
    assert.notEqual(closed.closeEvidenceBundleId, pendingSignoff.closeEvidenceBundleId);

    const reopened = await requestJson(`${baseUrl}/v1/close/checklists/${checklist.checklistId}/reopen`, {
      method: "POST",
      token: preparerToken,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        reasonCode: "external_reporting_change",
        impactSummary: "Close package must be rerun.",
        impactAnalysis: {
          affectedAreaCodes: ["ledger", "vat", "annual_reporting"],
          requiresCorrectionReplacement: true,
          correctionPlanSummary: "Source journal must be reversed and rebooked before relock.",
          relockTargetStatus: "soft_locked"
        },
        approvedByCompanyUserId: DEMO_IDS.companyUserId
      }
    });
    assert.equal(reopened.successorChecklist.checklistVersion, 2);
    assert.ok(reopened.reopenRequest.reopenEvidenceBundleId);
    assert.equal(reopened.reopenRequest.reopenEvidenceBundle?.status, "frozen");
    assert.ok(reopened.supersededChecklist.closeEvidenceBundleId);
    assert.notEqual(reopened.supersededChecklist.closeEvidenceBundleId, closed.closeEvidenceBundleId);

    const reopenRequests = await requestJson(`${baseUrl}/v1/close/reopen-requests?bureauOrgId=${DEMO_IDS.companyId}&clientCompanyId=${clientCompany.companyId}`, {
      token: preparerToken
    });
    assert.equal(reopenRequests.items.length, 1);

    const closeAdjustment = await requestJson(`${baseUrl}/v1/close/reopen-requests/${reopened.reopenRequest.reopenRequestId}/adjustments`, {
      method: "POST",
      token: preparerToken,
      expectedStatus: 201,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        adjustmentType: "correction_replacement",
        journalEntryId: sourceJournalEntryId,
        reasonCode: "close_reporting_fix",
        correctionKey: "phase11-close-api-adjustment",
        approvedByCompanyUserId: DEMO_IDS.companyUserId,
        lines: [
          { accountNumber: "1510", debitAmount: 4800 },
          { accountNumber: "3010", creditAmount: 4800 }
        ],
        comment: "Replacement entry before relock."
      }
    });
    assert.equal(closeAdjustment.adjustmentType, "correction_replacement");
    assert.ok(closeAdjustment.reversalJournalEntry);
    assert.ok(closeAdjustment.replacementJournalEntry);

    const reopenAfterAdjustment = await requestJson(`${baseUrl}/v1/close/reopen-requests/${reopened.reopenRequest.reopenRequestId}?bureauOrgId=${DEMO_IDS.companyId}`, {
      token: preparerToken
    });
    assert.ok(reopenAfterAdjustment.reopenEvidenceBundleId);
    assert.notEqual(reopenAfterAdjustment.reopenEvidenceBundleId, reopened.reopenRequest.reopenEvidenceBundleId);

    const relocked = await requestJson(`${baseUrl}/v1/close/reopen-requests/${reopened.reopenRequest.reopenRequestId}/relock`, {
      method: "POST",
      token: preparerToken,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        reasonCode: "close_adjustments_completed",
        approvedByCompanyUserId: DEMO_IDS.companyUserId
      }
    });
    assert.equal(relocked.status, "relocked");
    assert.ok(relocked.reopenEvidenceBundleId);
    assert.equal(relocked.reopenEvidenceBundle?.status, "frozen");
    assert.notEqual(relocked.reopenEvidenceBundleId, reopenAfterAdjustment.reopenEvidenceBundleId);

    const closeAdjustments = await requestJson(`${baseUrl}/v1/close/adjustments?bureauOrgId=${DEMO_IDS.companyId}&reopenRequestId=${reopened.reopenRequest.reopenRequestId}`, {
      token: preparerToken
    });
    assert.equal(closeAdjustments.items.length, 1);
  } finally {
    await stopServer(server);
  }
});

function seedClientCloseSetup(platform, adminToken, responsibleConsultantId) {
  const clientCompany = platform.createCompany({
    legalName: "Close API Client AB",
    orgNumber: "559900-4313",
    settingsJson: {
      bureauDelivery: {
        closeLeadBusinessDays: 3,
        reportingLeadBusinessDays: 2,
        submissionLeadBusinessDays: 2,
        generalLeadBusinessDays: 1,
        approvalLeadBusinessDays: 2,
        reminderProfile: "standard"
      }
    }
  });
  platform.createPortfolioMembership({
    sessionToken: adminToken,
    bureauOrgId: DEMO_IDS.companyId,
    clientCompanyId: clientCompany.companyId,
    responsibleConsultantId,
    activeFrom: "2026-01-01"
  });
  const eligibilityAssessment = platform.assessCashMethodEligibility({
    companyId: clientCompany.companyId,
    annualNetTurnoverSek: 480000,
    legalFormCode: "AB",
    actorId: "phase11-close-api"
  });
  const methodProfile = platform.createMethodProfile({
    companyId: clientCompany.companyId,
    methodCode: "FAKTURERINGSMETOD",
    effectiveFrom: "2026-01-01",
    fiscalYearStartDate: "2026-01-01",
    eligibilityAssessmentId: eligibilityAssessment.assessmentId,
    onboardingOverride: true,
    actorId: "phase11-close-api"
  });
  platform.activateMethodProfile({
    companyId: clientCompany.companyId,
    methodProfileId: methodProfile.methodProfileId,
    actorId: "phase11-close-api"
  });
  const fiscalYearProfile = platform.createFiscalYearProfile({
    companyId: clientCompany.companyId,
    legalFormCode: "AKTIEBOLAG",
    actorId: "phase11-close-api"
  });
  const fiscalYear = platform.createFiscalYear({
    companyId: clientCompany.companyId,
    fiscalYearProfileId: fiscalYearProfile.fiscalYearProfileId,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    approvalBasisCode: "BASELINE",
    actorId: "phase11-close-api"
  });
  platform.activateFiscalYear({
    companyId: clientCompany.companyId,
    fiscalYearId: fiscalYear.fiscalYearId,
    actorId: "phase11-close-api"
  });
  platform.installLedgerCatalog({
    companyId: clientCompany.companyId,
    actorId: "phase11-close-api"
  });
  const period = platform.ensureAccountingYearPeriod({
    companyId: clientCompany.companyId,
    fiscalYear: 2026,
    actorId: "phase11-close-api"
  });
  const created = platform.createJournalEntry({
    companyId: clientCompany.companyId,
    journalDate: "2026-01-11",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "phase11-close-api-income",
    actorId: "phase11-close-api",
    idempotencyKey: "phase11-close-api-income",
    lines: [
      { accountNumber: "1510", debitAmount: 4800 },
      { accountNumber: "3010", creditAmount: 4800 }
    ]
  });
  platform.validateJournalEntry({
    companyId: clientCompany.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase11-close-api"
  });
  platform.postJournalEntry({
    companyId: clientCompany.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase11-close-api",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });
  const reportSnapshot = platform.runReportSnapshot({
    companyId: clientCompany.companyId,
    reportCode: "income_statement",
    fromDate: "2026-01-01",
    toDate: "2026-01-31",
    actorId: "phase11-close-api"
  });
  const reconciliationRuns = {};
  for (const areaCode of ["bank", "ar", "ap", "vat"]) {
    const run = platform.createReconciliationRun({
      companyId: clientCompany.companyId,
      accountingPeriodId: period.accountingPeriodId,
      areaCode,
      cutoffDate: "2026-12-31",
      differenceItems: [],
      actorId: "phase11-close-api"
    });
    platform.signOffReconciliationRun({
      companyId: clientCompany.companyId,
      reconciliationRunId: run.reconciliationRun.reconciliationRunId,
      actorId: "phase11-close-api",
      signatoryRole: "close_signatory"
    });
    reconciliationRuns[areaCode] = run.reconciliationRun.reconciliationRunId;
  }
  return {
    clientCompany,
    period,
    sourceJournalEntryId: created.journalEntry.journalEntryId,
    reportSnapshotId: reportSnapshot.reportSnapshotId,
    reconciliationRuns
  };
}

async function loginWithStrongAuth({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(`${baseUrl}/v1/auth/login`, {
    method: "POST",
    body: {
      companyId,
      email
    }
  });
  await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: platform.getTotpCodeForTesting({ companyId, email })
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

async function loginWithTotpOnly({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(`${baseUrl}/v1/auth/login`, {
    method: "POST",
    body: {
      companyId,
      email
    }
  });
  await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: platform.getTotpCodeForTesting({ companyId, email })
    }
  });
  return started.sessionToken;
}

async function requestJson(url, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const mutationIdempotencyKey = ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase()) ? crypto.randomUUID() : null;
  const response = await fetch(url, {
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
