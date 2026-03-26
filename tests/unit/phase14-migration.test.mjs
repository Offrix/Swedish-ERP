import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { loginWithStrongAuthOnPlatform } from "../helpers/platform-auth.mjs";

test("Phase 14.3 migration cockpit tracks import, diff, cutover and rollback deterministically", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T20:30:00Z")
  });
  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });

  const mappingSet = platform.createMappingSet({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    sourceSystem: "legacy_erp",
    domainScope: "finance",
    versionNo: 1,
    mappings: [{ sourceField: "account_no", targetField: "accountNumber", transformCode: "identity" }]
  });
  const approvedMappingSet = platform.approveMappingSet({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    mappingSetId: mappingSet.mappingSetId
  });
  assert.equal(approvedMappingSet.status, "approved");

  const batch = platform.registerImportBatch({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    sourceSystem: "legacy_erp",
    batchType: "chart_of_accounts",
    recordCount: 42,
    hash: "phase14-import-hash",
    scope: { companyId: DEMO_IDS.companyId },
    mappingSetId: mappingSet.mappingSetId,
    objectRefs: [{ sourceObjectId: "1000", targetObjectId: "1000", objectType: "ledger_account" }]
  });
  const importedBatch = platform.runImportBatch({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    importBatchId: batch.importBatchId,
    autoAccept: true
  });
  assert.equal(importedBatch.status, "accepted");

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
  assert.equal(diffReport.status, "remediation_required");
  const acceptedDiff = platform.recordDifferenceDecision({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    diffReportId: diffReport.diffReportId,
    itemId: diffReport.differenceItems[0].itemId,
    decision: "accepted",
    comment: "parallel run confirmed"
  });
  assert.equal(acceptedDiff.status, "accepted");

  const cutoverPlan = platform.createCutoverPlan({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    freezeAt: "2026-03-23T08:00:00.000Z",
    rollbackPointRef: "snapshot://phase14-unit",
    acceptedVarianceThresholds: {
      countDelta: 0,
      amountDelta: 0
    },
    stabilizationWindowHours: 24,
    signoffChain: [{ userId: DEMO_IDS.userId, roleCode: "migration_lead", label: "Migration lead" }],
    goLiveChecklist: [{ itemCode: "support_staffed", label: "Support staffed" }]
  });
  assert.equal(cutoverPlan.rollbackPointRef, "snapshot://phase14-unit");
  assert.equal(cutoverPlan.stabilizationWindowHours, 24);
  platform.recordCutoverSignoff({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId
  });
  platform.updateCutoverChecklistItem({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId,
    itemCode: "support_staffed",
    status: "completed"
  });
  platform.startCutover({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId
  });
  platform.completeFinalExtract({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId,
    lastExtractAt: "2026-03-23T08:10:00.000Z"
  });
  const acceptanceRecord = platform.createMigrationAcceptanceRecord({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    acceptanceType: "go_live_readiness",
    cutoverPlanId: cutoverPlan.cutoverPlanId,
    importBatchIds: [batch.importBatchId],
    diffReportIds: [diffReport.diffReportId],
    sourceParitySummary: {
      countParity: { passed: true, sourceCount: 42, targetCount: 42, delta: 0 },
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
  assert.equal(acceptanceRecord.status, "accepted");
  platform.recordRestoreDrill({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    drillCode: "phase14-cutover-restore",
    targetRtoMinutes: 60,
    targetRpoMinutes: 15,
    actualRtoMinutes: 42,
    actualRpoMinutes: 10,
    status: "passed",
    verificationSummary: "Phase 14 migration restore drill verified."
  });
  const deadLetterJob = await platform.enqueueRuntimeJob({
    companyId: DEMO_IDS.companyId,
    jobType: "submission.transport",
    sourceObjectType: "submission",
    sourceObjectId: "phase14-unit-submission",
    payload: { submissionId: "phase14-unit-submission" },
    actorId: "phase14-unit"
  });
  const claimedJobs = await platform.claimAvailableRuntimeJobs({
    workerId: "phase14-unit-worker"
  });
  const claimedJob = claimedJobs.find((candidate) => candidate.jobId === deadLetterJob.jobId);
  const attempt = await platform.startRuntimeJobAttempt({
    jobId: deadLetterJob.jobId,
    claimToken: claimedJob.claimToken,
    workerId: "phase14-unit-worker"
  });
  await platform.failRuntimeJob({
    jobId: deadLetterJob.jobId,
    claimToken: claimedJob.claimToken,
    workerId: "phase14-unit-worker",
    attemptId: attempt.attempt.jobAttemptId,
    errorClass: "persistent_technical",
    errorMessage: "submission transport dead-lettered",
    replayAllowed: true
  });
  await assert.rejects(
    () =>
      platform.passCutoverValidation({
        sessionToken: adminToken,
        companyId: DEMO_IDS.companyId,
        cutoverPlanId: cutoverPlan.cutoverPlanId,
        contractTestsPassed: true,
        goldenScenariosPassed: true,
        runbooksAcknowledged: true,
        restoreDrillFreshnessDays: 30
      }),
    (thrown) => thrown?.code === "cutover_validation_blocked"
  );
  const deadLetters = await platform.listRuntimeDeadLetters({
    companyId: DEMO_IDS.companyId
  });
  const submissionDeadLetter = deadLetters.find((candidate) => candidate.jobId === deadLetterJob.jobId);
  await platform.triageRuntimeDeadLetter({
    companyId: DEMO_IDS.companyId,
    deadLetterId: submissionDeadLetter.deadLetterId,
    actorId: DEMO_IDS.userId,
    operatorState: "resolved"
  });
  await platform.passCutoverValidation({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId,
    contractTestsPassed: true,
    goldenScenariosPassed: true,
    runbooksAcknowledged: true,
    restoreDrillFreshnessDays: 30
  });
  platform.switchCutover({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId
  });
  const rollbackStarted = platform.startRollback({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId,
    reasonCode: "parallel_run_mismatch",
    rollbackOwnerUserId: DEMO_IDS.userId,
    supportSignoffRef: "support-signoff:phase14-unit",
    securitySignoffRef: "security-signoff:phase14-unit",
    suspendIntegrationCodes: ["AUTHORITY_TRANSPORTS"],
    freezeOperationalIntake: true
  });
  assert.equal(rollbackStarted.status, "rollback_in_progress");
  assert.equal(rollbackStarted.rollbackPlan.rollbackExecutionMode, "post_switch_compensation");
  const rollbackCompleted = platform.completeRollback({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId,
    integrationsSuspended: true,
    switchMarkersReversed: true,
    auditEvidencePreserved: true,
    immutableReceiptsPreserved: true
  });
  assert.equal(rollbackCompleted.status, "rolled_back");

  const cockpit = platform.getMigrationCockpit({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId
  });
  assert.equal(cockpit.mappingSets.length, 1);
  assert.equal(cockpit.importBatches.length, 1);
  assert.equal(cockpit.diffReports.length, 1);
  assert.equal(cockpit.cutoverPlans.length, 1);
  assert.equal(cockpit.acceptanceRecords.length, 1);
  assert.equal(cockpit.acceptanceRecords[0].migrationAcceptanceRecordId, acceptanceRecord.migrationAcceptanceRecordId);
  assert.equal(cockpit.datasetSummary.acceptedImportBatchCount, 1);
  assert.equal(cockpit.cutoverBoard.items.length, 1);
  assert.equal(cockpit.cutoverBoard.counters.rolledBack, 1);
  assert.equal(cockpit.cutoverBoard.items[0].objectType, "migrationCutover");
  assert.equal(cockpit.cutoverBoard.items[0].rollbackExecutionMode, "post_switch_compensation");
  assert.equal(cockpit.cutoverBoard.items[0].requiresAttention, false);
});

test("Phase 14.3 rollback requires recovery plan when regulated filing was submitted after switch and closed cutover uses correction case", async () => {
  let currentTime = new Date("2026-03-23T20:30:00Z");
  const platform = createApiPlatform({
    clock: () => currentTime
  });
  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });

  const cutoverPlan = platform.createCutoverPlan({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    freezeAt: "2026-03-24T08:00:00.000Z",
    rollbackPointRef: "snapshot://phase14-recovery-unit",
    acceptedVarianceThresholds: {
      countDelta: 0,
      amountDelta: 0
    },
    stabilizationWindowHours: 24,
    signoffChain: [{ userId: DEMO_IDS.userId, roleCode: "migration_lead", label: "Migration lead" }],
    goLiveChecklist: [{ itemCode: "parallel_run_green", label: "Parallel run green" }]
  });
  platform.recordCutoverSignoff({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId
  });
  platform.generateDiffReport({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    comparisonScope: "parallel_run_finance_recovery",
    sourceSnapshotRef: { system: "legacy_erp", period: "2026-03" },
    targetSnapshotRef: { system: "swedish_erp", period: "2026-03" },
    differenceItems: []
  });
  platform.updateCutoverChecklistItem({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId,
    itemCode: "parallel_run_green",
    status: "completed"
  });
  platform.startCutover({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId
  });
  platform.completeFinalExtract({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId,
    lastExtractAt: "2026-03-24T08:10:00.000Z"
  });
  platform.createMigrationAcceptanceRecord({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    acceptanceType: "go_live_readiness",
    cutoverPlanId: cutoverPlan.cutoverPlanId,
    sourceParitySummary: {
      countParity: { passed: true, sourceCount: 1, targetCount: 1, delta: 0 },
      amountParity: { passed: true, sourceCount: 1, targetCount: 1, delta: 0 },
      unresolvedMaterialDifferences: 0,
      openingBalanceParityPassed: true,
      openReceivablesParityPassed: true,
      openPayablesParityPassed: true,
      taxAccountParityPassed: true
    }
  });
  platform.recordRestoreDrill({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    drillCode: "phase14-recovery-restore",
    targetRtoMinutes: 60,
    targetRpoMinutes: 15,
    actualRtoMinutes: 40,
    actualRpoMinutes: 10,
    status: "passed",
    verificationSummary: "Phase 14 recovery restore drill verified."
  });
  await platform.passCutoverValidation({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId,
    contractTestsPassed: true,
    goldenScenariosPassed: true,
    runbooksAcknowledged: true,
    restoreDrillFreshnessDays: 30
  });
  platform.switchCutover({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId
  });

  let submission = platform.prepareAuthoritySubmission({
    companyId: DEMO_IDS.companyId,
    submissionType: "vat_return",
    sourceObjectType: "vat_report",
    sourceObjectId: "vat-report-phase14",
    payloadVersion: "phase14",
    providerKey: "skatteverket",
    recipientId: "skatteverket:vat",
    payload: { checksum: "phase14-vat" },
    actorId: DEMO_IDS.userId
  });
  submission = platform.signAuthoritySubmission({
    companyId: DEMO_IDS.companyId,
    submissionId: submission.submissionId,
    actorId: DEMO_IDS.userId
  });
  submission = await platform.submitAuthoritySubmission({
    companyId: DEMO_IDS.companyId,
    submissionId: submission.submissionId,
    actorId: DEMO_IDS.userId,
    simulatedTransportOutcome: "technical_ack"
  });

  assert.equal(typeof submission.submittedAt, "string");
  assert.throws(
    () =>
      platform.startRollback({
        sessionToken: adminToken,
        companyId: DEMO_IDS.companyId,
        cutoverPlanId: cutoverPlan.cutoverPlanId,
        reasonCode: "filing_after_switch_requires_recovery",
        rollbackOwnerUserId: DEMO_IDS.userId,
        supportSignoffRef: "support-signoff:phase14-recovery",
        securitySignoffRef: "security-signoff:phase14-recovery",
        suspendIntegrationCodes: ["AUTHORITY_TRANSPORTS"],
        freezeOperationalIntake: true
      }),
    (thrown) => thrown?.code === "cutover_rollback_recovery_plan_required"
  );

  const rollbackStarted = platform.startRollback({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId,
    reasonCode: "filing_after_switch_requires_recovery",
    rollbackOwnerUserId: DEMO_IDS.userId,
    supportSignoffRef: "support-signoff:phase14-recovery",
    securitySignoffRef: "security-signoff:phase14-recovery",
    complianceSignoffRef: "compliance-signoff:phase14-recovery",
    suspendIntegrationCodes: ["AUTHORITY_TRANSPORTS", "DOCUMENT_INGEST"],
    freezeOperationalIntake: true,
    recoveryPlanCode: "RECOVERY-PLAN-14A",
    recoveryPlanNote: "Protect filing history and run correction chain."
  });
  assert.equal(rollbackStarted.rollbackPlan.regulatedSubmissionRecoveryPlan.protectedSubmissionRefs.length, 1);

  const correctionCase = platform.createPostCutoverCorrectionCase({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId,
    reasonCode: "source_error_after_cutover",
    regulatedSubmissionRefs: [{
      submissionId: submission.submissionId,
      submissionType: submission.submissionType,
      submittedAt: submission.submittedAt
    }],
    acceptanceReportDelta: {
      impactClass: "material",
      summary: "VAT return requires correction."
    }
  });
  assert.equal(correctionCase.status, "open");

  const rollbackCompleted = platform.completeRollback({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: cutoverPlan.cutoverPlanId,
    integrationsSuspended: true,
    switchMarkersReversed: true,
    auditEvidencePreserved: true,
    immutableReceiptsPreserved: true,
    recoveryPlanActivated: true
  });
  assert.equal(rollbackCompleted.status, "rolled_back");
  const cockpit = platform.getMigrationCockpit({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId
  });
  const recoveryRow = cockpit.cutoverBoard.items.find((item) => item.cutoverPlanId === cutoverPlan.cutoverPlanId);
  assert.equal(recoveryRow.regulatedSubmissionRecoveryRequired, true);
  assert.equal(recoveryRow.postCutoverCorrectionOpenCount, 1);
  assert.equal(recoveryRow.attentionReasonCodes.includes("post_cutover_correction_open"), true);

  const secondCutoverPlan = platform.createCutoverPlan({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    freezeAt: "2026-03-25T08:00:00.000Z",
    rollbackPointRef: "snapshot://phase14-closed",
    acceptedVarianceThresholds: {
      countDelta: 0,
      amountDelta: 0
    },
    stabilizationWindowHours: 1,
    signoffChain: [{ userId: DEMO_IDS.userId, roleCode: "migration_lead", label: "Migration lead" }],
    goLiveChecklist: [{ itemCode: "cutover_done", label: "Cutover done" }]
  });
  platform.recordCutoverSignoff({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: secondCutoverPlan.cutoverPlanId
  });
  platform.updateCutoverChecklistItem({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: secondCutoverPlan.cutoverPlanId,
    itemCode: "cutover_done",
    status: "completed"
  });
  platform.startCutover({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: secondCutoverPlan.cutoverPlanId
  });
  platform.completeFinalExtract({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: secondCutoverPlan.cutoverPlanId,
    lastExtractAt: "2026-03-25T08:10:00.000Z"
  });
  platform.createMigrationAcceptanceRecord({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    acceptanceType: "go_live_readiness",
    cutoverPlanId: secondCutoverPlan.cutoverPlanId,
    sourceParitySummary: {
      countParity: { passed: true, sourceCount: 1, targetCount: 1, delta: 0 },
      amountParity: { passed: true, sourceCount: 1, targetCount: 1, delta: 0 },
      unresolvedMaterialDifferences: 0,
      openingBalanceParityPassed: true,
      openReceivablesParityPassed: true,
      openPayablesParityPassed: true,
      taxAccountParityPassed: true
    }
  });
  await platform.passCutoverValidation({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: secondCutoverPlan.cutoverPlanId,
    contractTestsPassed: true,
    goldenScenariosPassed: true,
    runbooksAcknowledged: true,
    restoreDrillFreshnessDays: 30
  });
  platform.switchCutover({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: secondCutoverPlan.cutoverPlanId
  });
  platform.stabilizeCutover({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: secondCutoverPlan.cutoverPlanId,
    close: false
  });
  currentTime = new Date("2026-03-23T21:31:00Z");
  platform.stabilizeCutover({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    cutoverPlanId: secondCutoverPlan.cutoverPlanId,
    close: true
  });
  assert.throws(
    () =>
      platform.startRollback({
        sessionToken: adminToken,
        companyId: DEMO_IDS.companyId,
        cutoverPlanId: secondCutoverPlan.cutoverPlanId,
        reasonCode: "too_late"
      }),
    (thrown) => thrown?.code === "cutover_rollback_window_closed"
  );
});
