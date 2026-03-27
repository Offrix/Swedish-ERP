import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 14.3 API tracks mapping, imports, diffs, cutover and rollback end-to-end", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T21:50:00Z")
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
      email: "phase14-migration-field@example.test",
      displayName: "Phase 14 Migration Field",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase14-migration-field@example.test"
    });

    const mappingSet = await requestJson(baseUrl, "/v1/migration/mapping-sets", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        sourceSystem: "legacy_erp",
        domainScope: "finance",
        versionNo: 1,
        mappings: [{ sourceField: "account_no", targetField: "accountNumber", transformCode: "identity" }]
      }
    });
    const approvedMappingSet = await requestJson(baseUrl, `/v1/migration/mapping-sets/${mappingSet.mappingSetId}/approve`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        batchIds: []
      }
    });
    assert.equal(approvedMappingSet.status, "approved");

    const batch = await requestJson(baseUrl, "/v1/migration/import-batches", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        sourceSystem: "legacy_erp",
        batchType: "chart_of_accounts",
        recordCount: 42,
        hash: "phase14-import-hash",
        scope: { companyId: DEMO_IDS.companyId },
        mappingSetId: mappingSet.mappingSetId,
        objectRefs: [{ sourceObjectId: "1000", targetObjectId: "1000", objectType: "ledger_account" }]
      }
    });
    const importedBatch = await requestJson(baseUrl, `/v1/migration/import-batches/${batch.importBatchId}/run`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        autoAccept: true
      }
    });
    assert.equal(importedBatch.status, "accepted");

    const correction = await requestJson(baseUrl, `/v1/migration/import-batches/${batch.importBatchId}/corrections`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        sourceObjectId: "1000",
        targetObjectId: "1000",
        reasonCode: "manual_mapping_fix",
        comment: "Verified legacy mapping."
      }
    });
    assert.equal(correction.importBatchId, batch.importBatchId);
    const correctedBatch = await requestJson(baseUrl, `/v1/migration/import-batches/${batch.importBatchId}/run`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        autoAccept: true
      }
    });
    assert.equal(correctedBatch.status, "accepted");

    const diffReport = await requestJson(baseUrl, "/v1/migration/diff-reports", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        comparisonScope: "parallel_run_finance",
        sourceSnapshotRef: { system: "legacy_erp", period: "2026-03" },
        targetSnapshotRef: { system: "swedish_erp", period: "2026-03" },
        differenceItems: [
          { objectType: "trial_balance", sourceObjectId: "tb-2026-03", targetObjectId: "tb-2026-03", differenceClass: "material", comment: "temporary mismatch" }
        ]
      }
    });
    assert.equal(diffReport.status, "remediation_required");

    const acceptedDiff = await requestJson(baseUrl, `/v1/migration/diff-reports/${diffReport.diffReportId}/items/${diffReport.differenceItems[0].itemId}`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        decision: "accepted",
        comment: "Parallel run confirmed."
      }
    });
    assert.equal(acceptedDiff.status, "accepted");

    const cutoverPlan = await requestJson(baseUrl, "/v1/migration/cutover-plans", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        freezeAt: "2026-03-23T08:00:00.000Z",
        rollbackPointRef: "snapshot://phase14-api",
        acceptedVarianceThresholds: {
          countDelta: 0,
          amountDelta: 0
        },
        stabilizationWindowHours: 24,
        signoffChain: [{ userId: DEMO_IDS.userId, roleCode: "migration_lead", label: "Migration lead" }],
        goLiveChecklist: [{ itemCode: "support_staffed", label: "Support staffed" }]
      }
    });
    assert.equal(cutoverPlan.rollbackPointRef, "snapshot://phase14-api");
    assert.equal(cutoverPlan.stabilizationWindowHours, 24);
    assert.equal(cutoverPlan.acceptedVarianceThresholds.amountDelta, 0);
    await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/signoffs`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/checklist/support_staffed`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        status: "completed"
      }
    });

    await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/start`, {
      method: "POST",
      token: adminToken,
      body: { companyId: DEMO_IDS.companyId }
    });
    await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/final-extract`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        lastExtractAt: "2026-03-23T08:10:00.000Z"
      }
    });
    await requestJson(baseUrl, "/v1/migration/acceptance-records", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        acceptanceType: "go_live_readiness",
        cutoverPlanId: cutoverPlan.cutoverPlanId,
        importBatchIds: [batch.importBatchId],
        diffReportIds: [diffReport.diffReportId],
        sourceParitySummary: {
          countParity: { passed: true, sourceCount: 42, targetCount: 42, delta: 0 },
          amountParity: { passed: true, sourceCount: 1, targetCount: 1, delta: 0 },
          unresolvedMaterialDifferences: 0,
          openingBalanceParityPassed: true,
          openReceivablesParityPassed: true,
          openPayablesParityPassed: true,
          payrollYtdParityPassed: true,
          agiHistoryParityPassed: true,
          taxAccountParityPassed: true
        }
      }
    });
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
      sourceObjectId: "phase14-cutover-submission",
      payload: { submissionId: "phase14-cutover-submission" },
      riskClass: "medium",
      actorId: "phase14-api"
    });
    const claimedJobs = await platform.claimAvailableRuntimeJobs({
      workerId: "phase14-cutover-worker"
    });
    const claimedJob = claimedJobs.find((candidate) => candidate.jobId === deadLetterJob.jobId);
    const attempt = await platform.startRuntimeJobAttempt({
      jobId: deadLetterJob.jobId,
      claimToken: claimedJob.claimToken,
      workerId: "phase14-cutover-worker"
    });
    await platform.failRuntimeJob({
      jobId: deadLetterJob.jobId,
      claimToken: claimedJob.claimToken,
      workerId: "phase14-cutover-worker",
      attemptId: attempt.attempt.jobAttemptId,
      errorClass: "persistent_technical",
      errorMessage: "submission transport dead-lettered",
      replayAllowed: true
    });
    const blockedValidation = await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/validate`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        contractTestsPassed: true,
        goldenScenariosPassed: true,
        runbooksAcknowledged: true,
        restoreDrillFreshnessDays: 30
      }
    });
    assert.equal(blockedValidation.error, "cutover_validation_blocked");

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

    await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/validate`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        contractTestsPassed: true,
        goldenScenariosPassed: true,
        runbooksAcknowledged: true,
        restoreDrillFreshnessDays: 30
      }
    });
    await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/switch`, {
      method: "POST",
      token: adminToken,
      body: { companyId: DEMO_IDS.companyId }
    });
    const acceptanceRecord = await requestJson(baseUrl, "/v1/migration/acceptance-records", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        acceptanceType: "go_live_readiness",
        cutoverPlanId: cutoverPlan.cutoverPlanId,
        importBatchIds: [batch.importBatchId],
        diffReportIds: [diffReport.diffReportId],
        sourceParitySummary: {
          countParity: { passed: true, sourceCount: 42, targetCount: 42, delta: 0 },
          amountParity: { passed: true, sourceCount: 1, targetCount: 1, delta: 0 },
          unresolvedMaterialDifferences: 0,
          openingBalanceParityPassed: true,
          openReceivablesParityPassed: true,
          openPayablesParityPassed: true,
          payrollYtdParityPassed: true,
          agiHistoryParityPassed: true,
          taxAccountParityPassed: true
        }
      }
    });
    assert.equal(acceptanceRecord.status, "accepted");
    const listedAcceptanceRecords = await requestJson(baseUrl, `/v1/migration/acceptance-records?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(listedAcceptanceRecords.items.length, 2);

    const stabilized = await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/stabilize`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        close: false
      }
    });
    assert.equal(stabilized.status, "stabilized");

    const rollbackStarted = await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/rollback`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "parallel_run_mismatch",
        rollbackOwnerUserId: DEMO_IDS.userId,
        supportSignoffRef: "support-signoff:phase14-api",
        securitySignoffRef: "security-signoff:phase14-api",
        suspendIntegrationCodes: ["AUTHORITY_TRANSPORTS"],
        freezeOperationalIntake: true
      }
    });
    assert.equal(rollbackStarted.status, "rollback_in_progress");
    assert.equal(rollbackStarted.rollbackPlan.rollbackExecutionMode, "post_switch_compensation");

    const correctionCase = await requestJson(baseUrl, "/v1/migration/post-cutover-correction-cases", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        cutoverPlanId: cutoverPlan.cutoverPlanId,
        reasonCode: "source_error_after_cutover",
        acceptanceReportDelta: {
          impactClass: "material",
          summary: "Rollback investigation opened."
        }
      }
    });
    assert.equal(correctionCase.status, "open");

    const rollbackCompleted = await requestJson(baseUrl, `/v1/migration/cutover-plans/${cutoverPlan.cutoverPlanId}/rollback/complete`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        integrationsSuspended: true,
        switchMarkersReversed: true,
        auditEvidencePreserved: true,
        immutableReceiptsPreserved: true
      }
    });
    assert.equal(rollbackCompleted.status, "rolled_back");

    const correctionCases = await requestJson(baseUrl, `/v1/migration/post-cutover-correction-cases?companyId=${DEMO_IDS.companyId}&cutoverPlanId=${cutoverPlan.cutoverPlanId}`, {
      token: adminToken
    });
    assert.equal(correctionCases.items.length, 1);

    const cockpit = await requestJson(baseUrl, `/v1/migration/cockpit?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    for (const path of [
      `/v1/migration/mapping-sets?companyId=${DEMO_IDS.companyId}`,
      `/v1/migration/import-batches?companyId=${DEMO_IDS.companyId}`,
      `/v1/migration/diff-reports?companyId=${DEMO_IDS.companyId}`,
      `/v1/migration/cutover-plans?companyId=${DEMO_IDS.companyId}`,
      `/v1/migration/acceptance-records?companyId=${DEMO_IDS.companyId}`,
      `/v1/migration/cockpit?companyId=${DEMO_IDS.companyId}`
    ]) {
      await requestJson(baseUrl, path, {
        token: fieldUserToken,
        expectedStatus: 403
      });
    }
    assert.equal(cockpit.mappingSets.length, 1);
    assert.equal(cockpit.importBatches.length, 1);
    assert.equal(cockpit.corrections.length, 1);
    assert.equal(cockpit.diffReports.length, 1);
    assert.equal(cockpit.cutoverPlans.length, 1);
    assert.equal(cockpit.acceptanceRecords.length, 2);
    assert.equal(cockpit.postCutoverCorrectionCases.length, 1);
    assert.equal(cockpit.datasetSummary.acceptedImportBatchCount, 1);
    assert.equal(cockpit.cutoverBoard.boardCode, "MigrationCutoverCockpit");
    assert.equal(cockpit.cutoverBoard.items.length, 1);
    assert.equal(cockpit.cutoverBoard.counters.rolledBack, 1);
    assert.equal(cockpit.cutoverBoard.queueSummary[0].queueCode, "MIGRATION_CUTOVER");
    assert.equal(cockpit.cutoverBoard.items[0].rollbackExecutionMode, "post_switch_compensation");
    assert.equal(cockpit.cutoverBoard.items[0].postCutoverCorrectionOpenCount, 1);
    assert.equal(cockpit.acceptanceBoard.boardCode, "MigrationAcceptanceBoard");
    assert.equal(cockpit.acceptanceBoard.items.length, 2);
    assert.equal(cockpit.acceptanceBoard.counters.accepted, 2);
    assert.equal(cockpit.acceptanceBoard.items[0].objectType, "migrationAcceptanceRecord");
  } finally {
    await stopServer(server);
  }
});
