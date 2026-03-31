import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";

test("Phase 11.3 closes a month with checklist, blocks on hard stop, preserves reports and versions reopen", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T13:00:00Z")
  });

  const adminToken = loginWithStrongAuth(platform, DEMO_IDS.companyId, DEMO_ADMIN_EMAIL);
  const preparer = platform.createCompanyUser({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    email: "close-unit-preparer@example.test",
    displayName: "Close Unit Preparer",
    roleCode: "bureau_user",
    requiresMfa: false
  });
  const preparerToken = loginWithTotpOnly(platform, DEMO_IDS.companyId, preparer.user.email);

  const client = platform.createCompany({
    legalName: "Close Unit Client AB",
    orgNumber: "559900-4339",
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
    clientCompanyId: client.companyId,
    responsibleConsultantId: preparer.companyUserId,
    activeFrom: "2026-01-01"
  });
  const eligibilityAssessment = platform.assessCashMethodEligibility({
    companyId: client.companyId,
    annualNetTurnoverSek: 420000,
    legalFormCode: "AB",
    actorId: "phase11-3-unit"
  });
  const methodProfile = platform.createMethodProfile({
    companyId: client.companyId,
    methodCode: "FAKTURERINGSMETOD",
    effectiveFrom: "2026-01-01",
    fiscalYearStartDate: "2026-01-01",
    eligibilityAssessmentId: eligibilityAssessment.assessmentId,
    onboardingOverride: true,
    actorId: "phase11-3-unit"
  });
  platform.activateMethodProfile({
    companyId: client.companyId,
    methodProfileId: methodProfile.methodProfileId,
    actorId: "phase11-3-unit"
  });
  const fiscalYearProfile = platform.createFiscalYearProfile({
    companyId: client.companyId,
    legalFormCode: "AKTIEBOLAG",
    actorId: "phase11-3-unit"
  });
  const fiscalYear = platform.createFiscalYear({
    companyId: client.companyId,
    fiscalYearProfileId: fiscalYearProfile.fiscalYearProfileId,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    approvalBasisCode: "BASELINE",
    actorId: "phase11-3-unit"
  });
  platform.activateFiscalYear({
    companyId: client.companyId,
    fiscalYearId: fiscalYear.fiscalYearId,
    actorId: "phase11-3-unit"
  });
  platform.installLedgerCatalog({
    companyId: client.companyId,
    actorId: "phase11-3-unit"
  });
  const period = platform.ensureAccountingYearPeriod({
    companyId: client.companyId,
    fiscalYear: 2026,
    actorId: "phase11-3-unit"
  });
  const posted = createPostedJournal({
    platform,
    companyId: client.companyId,
    sourceId: "phase11-3-unit-income",
    lines: [
      { accountNumber: "1510", debitAmount: 4200 },
      { accountNumber: "3010", creditAmount: 4200 }
    ]
  });
  const reportBeforeClose = platform.runReportSnapshot({
    companyId: client.companyId,
    reportCode: "income_statement",
    fromDate: "2026-01-01",
    toDate: "2026-01-31",
    actorId: "phase11-3-unit"
  });
  const reconciliationRuns = createSignedReconciliations(platform, client.companyId, period.accountingPeriodId);

  const checklist = platform.instantiateCloseChecklist({
    sessionToken: preparerToken,
    bureauOrgId: DEMO_IDS.companyId,
    clientCompanyId: client.companyId,
    accountingPeriodId: period.accountingPeriodId,
    reportSnapshotId: reportBeforeClose.reportSnapshotId,
    signoffChain: [
      { companyUserId: preparer.companyUserId, roleCode: "close_preparer" },
      { companyUserId: DEMO_IDS.companyUserId, roleCode: "close_signatory" }
    ]
  });

  for (const step of checklist.steps) {
    const payload = step.reconciliationAreaCode
      ? { reconciliationRunId: reconciliationRuns[step.reconciliationAreaCode] }
      : step.evidenceType === "report_snapshot"
        ? { evidenceRefs: [{ reportSnapshotId: reportBeforeClose.reportSnapshotId }] }
        : { evidenceRefs: [{ note: `${step.stepCode} complete` }] };
    platform.completeCloseChecklistStep({
      sessionToken: preparerToken,
      bureauOrgId: DEMO_IDS.companyId,
      checklistId: checklist.checklistId,
      stepCode: step.stepCode,
      ...payload
    });
  }

  const blocker = platform.openCloseBlocker({
    sessionToken: preparerToken,
    bureauOrgId: DEMO_IDS.companyId,
    checklistId: checklist.checklistId,
    stepCode: "document_queue_review",
    severity: "hard_stop",
    reasonCode: "missing_inbox_evidence",
    comment: "Inbox evidence needs explicit waiver."
  });
  assert.equal(blocker.severity, "hard_stop");

  assert.throws(
    () => {
      platform.signOffCloseChecklist({
        sessionToken: preparerToken,
        bureauOrgId: DEMO_IDS.companyId,
        checklistId: checklist.checklistId
      });
    },
    (error) => error.code === "close_blocker_open"
  );

  const waivedBlocker = platform.approveCloseOverride({
    sessionToken: adminToken,
    bureauOrgId: DEMO_IDS.companyId,
    blockerId: blocker.blockerId,
    waiverUntil: "2026-04-30",
    comment: "Approved waiver for documented exception."
  });
  assert.equal(waivedBlocker.status, "waived");

  const firstSignoff = platform.signOffCloseChecklist({
    sessionToken: preparerToken,
    bureauOrgId: DEMO_IDS.companyId,
    checklistId: checklist.checklistId,
    comment: "Prepared for hard close."
  });
  assert.equal(firstSignoff.status, "signoff_pending");
  assert.ok(firstSignoff.closeEvidenceBundleId);
  assert.equal(firstSignoff.closeEvidenceBundle?.status, "frozen");
  assert.equal(firstSignoff.signoffs[0]?.evidenceBundleId, firstSignoff.closeEvidenceBundleId);

  const closedChecklist = platform.signOffCloseChecklist({
    sessionToken: adminToken,
    bureauOrgId: DEMO_IDS.companyId,
    checklistId: checklist.checklistId,
    comment: "Approved and hard closed."
  });
  assert.equal(closedChecklist.status, "closed");
  assert.equal(closedChecklist.closeState, "hard_closed");
  assert.equal(closedChecklist.signoffs.length, 2);
  assert.ok(closedChecklist.closeEvidenceBundleId);
  assert.equal(closedChecklist.closeEvidenceBundle?.status, "frozen");
  assert.notEqual(closedChecklist.closeEvidenceBundleId, firstSignoff.closeEvidenceBundleId);
  assert.equal(closedChecklist.signoffs[1]?.evidenceBundleId, closedChecklist.closeEvidenceBundleId);

  const reportAfterClose = platform.runReportSnapshot({
    companyId: client.companyId,
    reportCode: "income_statement",
    fromDate: "2026-01-01",
    toDate: "2026-01-31",
    actorId: "phase11-3-unit"
  });
  assert.deepEqual(
    reportAfterClose.lines.map((line) => ({ key: line.lineKey, metrics: line.metricValues })),
    reportBeforeClose.lines.map((line) => ({ key: line.lineKey, metrics: line.metricValues }))
  );

  const reopened = platform.requestCloseReopen({
    sessionToken: preparerToken,
    bureauOrgId: DEMO_IDS.companyId,
    checklistId: checklist.checklistId,
    reasonCode: "material_reporting_error",
    impactSummary: "Reported close package must be rerun because evidence changed.",
    impactAnalysis: {
      affectedAreaCodes: ["ledger", "vat", "annual_reporting"],
      requiresCorrectionReplacement: true,
      correctionPlanSummary: "Revenue entry must be reversed and replaced before close can be rerun.",
      relockTargetStatus: "soft_locked",
      affectedObjectRefs: [
        {
          sourceDomain: "ledger",
          sourceObjectType: "journal_entry",
          sourceObjectId: posted.journalEntry.journalEntryId,
          sourceObjectVersion: posted.journalEntry.updatedAt
        }
      ]
    },
    approvedByCompanyUserId: DEMO_IDS.companyUserId
  });
  assert.equal(reopened.successorChecklist.checklistVersion, 2);
  assert.equal(reopened.successorChecklist.status, "in_progress");
  assert.equal(reopened.supersededChecklist.status, "reopened");
  assert.equal(reopened.supersededChecklist.signoffs.every((record) => typeof record.supersededAt === "string"), true);
  assert.equal(reopened.reopenRequest.status, "executed");
  assert.ok(reopened.reopenRequest.reopenEvidenceBundleId);
  assert.equal(reopened.reopenRequest.reopenEvidenceBundle?.status, "frozen");
  assert.ok(reopened.supersededChecklist.closeEvidenceBundleId);
  assert.equal(reopened.supersededChecklist.closeEvidenceBundle?.status, "frozen");
  assert.notEqual(reopened.supersededChecklist.closeEvidenceBundleId, closedChecklist.closeEvidenceBundleId);

  const closeAdjustment = platform.createCloseAdjustment({
    sessionToken: preparerToken,
    bureauOrgId: DEMO_IDS.companyId,
    reopenRequestId: reopened.reopenRequest.reopenRequestId,
    adjustmentType: "correction_replacement",
    journalEntryId: posted.journalEntry.journalEntryId,
    reasonCode: "close_reporting_fix",
    correctionKey: "phase11-3-close-replacement",
    approvedByCompanyUserId: DEMO_IDS.companyUserId,
    lines: [
      { accountNumber: "1510", debitAmount: 4200 },
      { accountNumber: "3010", creditAmount: 4200 }
    ],
    comment: "Replace original revenue classification before relock."
  });
  assert.equal(closeAdjustment.adjustmentType, "correction_replacement");
  assert.equal(closeAdjustment.status, "posted");
  assert.ok(closeAdjustment.reversalJournalEntry);
  assert.ok(closeAdjustment.replacementJournalEntry);

  const reopenAfterAdjustment = platform.getCloseReopenRequest({
    sessionToken: preparerToken,
    bureauOrgId: DEMO_IDS.companyId,
    reopenRequestId: reopened.reopenRequest.reopenRequestId
  });
  assert.ok(reopenAfterAdjustment.reopenEvidenceBundleId);
  assert.notEqual(reopenAfterAdjustment.reopenEvidenceBundleId, reopened.reopenRequest.reopenEvidenceBundleId);

  const relocked = platform.relockCloseReopenRequest({
    sessionToken: preparerToken,
    bureauOrgId: DEMO_IDS.companyId,
    reopenRequestId: reopened.reopenRequest.reopenRequestId,
    reasonCode: "close_adjustments_completed",
    approvedByCompanyUserId: DEMO_IDS.companyUserId
  });
  assert.equal(relocked.status, "relocked");
  assert.ok(relocked.reopenEvidenceBundleId);
  assert.equal(relocked.reopenEvidenceBundle?.status, "frozen");
  assert.notEqual(relocked.reopenEvidenceBundleId, reopenAfterAdjustment.reopenEvidenceBundleId);
  const relockedPeriod = platform
    .listAccountingPeriods({ companyId: client.companyId })
    .find((candidate) => candidate.accountingPeriodId === period.accountingPeriodId);
  assert.equal(relockedPeriod.status, "soft_locked");
  const successorWorkbench = platform.getCloseWorkbench({
    sessionToken: preparerToken,
    bureauOrgId: DEMO_IDS.companyId,
    checklistId: reopened.successorChecklist.checklistId
  });
  assert.equal(successorWorkbench.closeState, "subledger_locked");
});

function createSignedReconciliations(platform, companyId, accountingPeriodId) {
  const result = {};
  for (const areaCode of ["bank", "ar", "ap", "vat"]) {
    const run = platform.createReconciliationRun({
      companyId,
      accountingPeriodId,
      areaCode,
      cutoffDate: "2026-12-31",
      differenceItems: [],
      actorId: "phase11-3-unit"
    });
    platform.signOffReconciliationRun({
      companyId,
      reconciliationRunId: run.reconciliationRun.reconciliationRunId,
      actorId: "phase11-3-unit",
      signatoryRole: "close_signatory"
    });
    result[areaCode] = run.reconciliationRun.reconciliationRunId;
  }
  return result;
}

function createPostedJournal({ platform, companyId, sourceId, lines }) {
  const created = platform.createJournalEntry({
    companyId,
    journalDate: "2026-01-10",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId,
    actorId: "phase11-3-unit",
    idempotencyKey: sourceId,
    lines
  });
  platform.validateJournalEntry({
    companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase11-3-unit"
  });
  const posted = platform.postJournalEntry({
    companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase11-3-unit",
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });
  return posted;
}

function loginWithStrongAuth(platform, companyId, email) {
  const started = platform.startLogin({ companyId, email });
  platform.verifyTotp({
    sessionToken: started.sessionToken,
    code: platform.getTotpCodeForTesting({ companyId, email })
  });
  const bankIdStart = platform.startBankIdAuthentication({
    sessionToken: started.sessionToken
  });
  platform.collectBankIdAuthentication({
    sessionToken: started.sessionToken,
    orderRef: bankIdStart.orderRef,
    completionToken: platform.getBankIdCompletionTokenForTesting(bankIdStart.orderRef)
  });
  return started.sessionToken;
}

function loginWithTotpOnly(platform, companyId, email) {
  const started = platform.startLogin({ companyId, email });
  platform.verifyTotp({
    sessionToken: started.sessionToken,
    code: platform.getTotpCodeForTesting({ companyId, email })
  });
  return started.sessionToken;
}
