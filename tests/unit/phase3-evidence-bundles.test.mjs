import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_APPROVER_EMAIL,
  DEMO_APPROVER_IDS,
  DEMO_IDS
} from "../../packages/domain-org-auth/src/index.mjs";
import {
  loginWithStrongAuthOnPlatform,
  loginWithTotpOnPlatform
} from "../helpers/platform-auth.mjs";

test("Phase 3.2 central evidence bundles cover annual reporting and regulated submissions", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-26T10:30:00Z")
  });

  platform.installLedgerCatalog({
    companyId: DEMO_IDS.companyId,
    actorId: "phase3-2-unit"
  });
  const period = platform.ensureAccountingYearPeriod({
    companyId: DEMO_IDS.companyId,
    fiscalYear: 2026,
    actorId: "phase3-2-unit"
  });
  const created = platform.createJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalDate: "2026-01-20",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "phase3-2-income",
    actorId: "phase3-2-unit",
    idempotencyKey: "phase3-2-income",
    lines: [
      { accountNumber: "1510", debitAmount: 6400 },
      { accountNumber: "3010", creditAmount: 6400 }
    ]
  });
  platform.validateJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase3-2-unit"
  });
  platform.postJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase3-2-unit"
  });
  platform.lockAccountingPeriod({
    companyId: DEMO_IDS.companyId,
    accountingPeriodId: period.accountingPeriodId,
    status: "hard_closed",
    actorId: "phase3-2-requester",
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
      management_report: "Phase 3.2 evidence baseline"
    }
  });
  const annualEvidence = platform.getEvidenceBundle({
    companyId: DEMO_IDS.companyId,
    evidenceBundleId: annualPackage.currentEvidencePack.evidencePackId
  });
  assert.equal(annualEvidence.bundleType, "annual_reporting_package");
  assert.equal(annualEvidence.status, "frozen");

  const submission = platform.prepareAuthoritySubmission({
    companyId: DEMO_IDS.companyId,
    submissionType: "income_tax_return",
    sourceObjectType: "annual_report_package",
    sourceObjectId: annualPackage.packageId,
    sourceObjectVersion: annualPackage.currentVersion.versionId,
    payloadVersion: "phase3.2",
    providerKey: "skatteverket",
    recipientId: "skatteverket:income-tax",
    evidencePackId: annualPackage.currentEvidencePack.evidencePackId,
    payload: {
      annualReportVersionId: annualPackage.currentVersion.versionId
    },
    actorId: DEMO_IDS.userId
  });
  const initialSubmissionEvidence = platform.getSubmissionEvidencePack({
    companyId: DEMO_IDS.companyId,
    submissionId: submission.submissionId
  });
  assert.equal(initialSubmissionEvidence.sourceEvidenceBundleId, annualPackage.currentEvidencePack.evidencePackId);
  assert.equal(initialSubmissionEvidence.status, "frozen");

  platform.signAuthoritySubmission({
    companyId: DEMO_IDS.companyId,
    submissionId: submission.submissionId,
    actorId: DEMO_IDS.userId
  });
  platform.executeAuthoritySubmissionTransport({
    companyId: DEMO_IDS.companyId,
    submissionId: submission.submissionId,
    actorId: DEMO_IDS.userId,
    simulatedTransportOutcome: "technical_ack"
  });
  const progressedSubmissionEvidence = platform.getSubmissionEvidencePack({
    companyId: DEMO_IDS.companyId,
    submissionId: submission.submissionId
  });
  assert.notEqual(progressedSubmissionEvidence.evidenceBundleId, initialSubmissionEvidence.evidenceBundleId);
  const archivedSubmissionEvidence = platform.getEvidenceBundle({
    companyId: DEMO_IDS.companyId,
    evidenceBundleId: initialSubmissionEvidence.evidenceBundleId
  });
  assert.equal(archivedSubmissionEvidence.status, "archived");
  assert.equal(progressedSubmissionEvidence.receiptRefs.length, 1);
});

test("Phase 3.2 central evidence bundles cover support, break-glass, cutover and project exports", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-26T11:15:00Z")
  });
  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  const approverToken = loginWithTotpOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_APPROVER_EMAIL
  });
  const secondApprover = platform.createCompanyUser({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    email: "phase3-2-second-approver@example.test",
    displayName: "Phase 3.2 Second Approver",
    roleCode: "approver",
    requiresMfa: false
  });
  const secondApproverToken = loginWithTotpOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: "phase3-2-second-approver@example.test"
  });
  platform.createDelegation({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    fromCompanyUserId: DEMO_IDS.companyUserId,
    toCompanyUserId: DEMO_APPROVER_IDS.companyUserId,
    scopeCode: "backoffice",
    permissionCode: "company.manage"
  });
  platform.createDelegation({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    fromCompanyUserId: DEMO_IDS.companyUserId,
    toCompanyUserId: DEMO_APPROVER_IDS.companyUserId,
    scopeCode: "break_glass_session",
    permissionCode: "company.manage"
  });
  platform.createDelegation({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    fromCompanyUserId: DEMO_IDS.companyUserId,
    toCompanyUserId: secondApprover.companyUserId,
    scopeCode: "backoffice",
    permissionCode: "company.manage"
  });
  platform.createDelegation({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    fromCompanyUserId: DEMO_IDS.companyUserId,
    toCompanyUserId: secondApprover.companyUserId,
    scopeCode: "break_glass_session",
    permissionCode: "company.manage"
  });

  const supportCase = platform.createSupportCase({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    category: "regulated_submission_outage",
    severity: "high",
    approvedActions: ["plan_job_replay"],
    relatedObjectRefs: [{ objectType: "submission", objectId: "submission-x" }]
  });
  platform.approveSupportCaseActions({
    sessionToken: approverToken,
    companyId: DEMO_IDS.companyId,
    supportCaseId: supportCase.supportCaseId,
    approvedActions: ["plan_job_replay"]
  });
  const supportEvidence = platform.exportSupportCaseEvidenceBundle({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    supportCaseId: supportCase.supportCaseId
  });
  assert.equal(supportEvidence.status, "frozen");
  assert.ok(supportEvidence.checksum);

  const breakGlass = platform.requestBreakGlass({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    incidentId: "incident-phase3-2",
    purposeCode: "investigate_outage",
    requestedActions: ["list_submission_queue"]
  });
  platform.approveBreakGlass({
    sessionToken: approverToken,
    companyId: DEMO_IDS.companyId,
    breakGlassId: breakGlass.breakGlassId
  });
  platform.approveBreakGlass({
    sessionToken: secondApproverToken,
    companyId: DEMO_IDS.companyId,
    breakGlassId: breakGlass.breakGlassId
  });
  platform.closeBreakGlassSession({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    breakGlassId: breakGlass.breakGlassId
  });
  platform.closeBreakGlassSession({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    breakGlassId: breakGlass.breakGlassId
  });
  const breakGlassEvidence = platform.exportBreakGlassEvidenceBundle({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    breakGlassId: breakGlass.breakGlassId
  });
  assert.equal(breakGlassEvidence.status, "frozen");
  assert.equal(breakGlassEvidence.approvals.length, 2);

  const mappingSet = platform.createMappingSet({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    sourceSystem: "legacy_erp",
    domainScope: "finance",
    versionNo: 1,
    mappings: [{ sourceField: "account_no", targetField: "accountNumber", transformCode: "identity" }]
  });
  platform.approveMappingSet({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    mappingSetId: mappingSet.mappingSetId
  });
  const batch = platform.registerImportBatch({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    sourceSystem: "legacy_erp",
    batchType: "chart_of_accounts",
    recordCount: 4,
    hash: "phase3-2-batch",
    scope: { companyId: DEMO_IDS.companyId },
    mappingSetId: mappingSet.mappingSetId,
    objectRefs: [{ sourceObjectId: "1000", targetObjectId: "1000", objectType: "ledger_account" }]
  });
  platform.runImportBatch({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    importBatchId: batch.importBatchId,
    autoAccept: true
  });
  const diffReport = platform.generateDiffReport({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    comparisonScope: "parallel_run_finance",
    sourceSnapshotRef: { system: "legacy_erp", period: "2026-03" },
    targetSnapshotRef: { system: "swedish_erp", period: "2026-03" },
    differenceItems: [
      { objectType: "trial_balance", sourceObjectId: "tb-2026-03", targetObjectId: "tb-2026-03", differenceClass: "material", comment: "temporary mismatch" }
    ]
  });
  platform.recordDifferenceDecision({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    diffReportId: diffReport.diffReportId,
    itemId: diffReport.differenceItems[0].itemId,
    decision: "accepted",
    comment: "accepted for rehearsal"
  });
  const cutoverPlan = platform.createCutoverPlan({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    freezeAt: "2026-03-27T08:00:00.000Z",
    rollbackPointRef: "snapshot://phase3-2",
    acceptedVarianceThresholds: {
      countDelta: 0,
      amountDelta: 0
    },
    stabilizationWindowHours: 24,
    signoffChain: [{ userId: DEMO_IDS.userId, roleCode: "migration_lead", label: "Migration lead" }],
    goLiveChecklist: [{ itemCode: "support_staffed", label: "Support staffed" }]
  });
  const acceptanceRecord = platform.createMigrationAcceptanceRecord({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    acceptanceType: "go_live_readiness",
    cutoverPlanId: cutoverPlan.cutoverPlanId,
    importBatchIds: [batch.importBatchId],
    diffReportIds: [diffReport.diffReportId],
    sourceParitySummary: {
      countParity: { passed: true, sourceCount: 4, targetCount: 4, delta: 0 },
      amountParity: { passed: true, sourceCount: 1, targetCount: 1, delta: 0 },
      unresolvedDifferenceCount: 0,
      unresolvedMaterialDifferences: 0,
      openingBalanceParityPassed: true,
      openReceivablesParityPassed: true,
      openPayablesParityPassed: true,
      payrollYtdParityPassed: true,
      agiHistoryParityPassed: true,
      taxAccountParityPassed: true
    }
  });
  assert.ok(acceptanceRecord.cutoverEvidenceBundle.checksum);
  const exportedCutoverEvidence = platform.exportCutoverEvidenceBundle({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    migrationAcceptanceRecordId: acceptanceRecord.migrationAcceptanceRecordId
  });
  assert.equal(exportedCutoverEvidence.cutoverEvidenceBundleId, acceptanceRecord.cutoverEvidenceBundle.cutoverEvidenceBundleId);

  const project = platform.createProject({
    companyId: DEMO_IDS.companyId,
    projectCode: "P3-2-EVIDENCE",
    displayName: "Phase 3.2 Evidence Project",
    startsOn: "2026-03-01",
    actorId: DEMO_IDS.userId
  });
  const projectEvidence = platform.exportProjectEvidenceBundle({
    companyId: DEMO_IDS.companyId,
    projectId: project.projectId,
    actorId: DEMO_IDS.userId
  });
  assert.equal(projectEvidence.status, "frozen");
  assert.equal(projectEvidence.projectId, project.projectId);
});
