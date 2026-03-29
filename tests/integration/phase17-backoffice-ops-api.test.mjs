import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { runWorkerBatch } from "../../apps/worker/src/worker.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Step 17 API exposes backoffice jobs, SLA escalations, submission monitoring and incident creation", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-26T00:30:00Z")
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
      email: "phase17-first-approver@example.test",
      displayName: "Phase 17 First Approver",
      roleCode: "company_admin",
      requiresMfa: false
    });
    const approverToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase17-first-approver@example.test"
    });
    platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "phase17-second-approver@example.test",
      displayName: "Phase 17 Second Approver",
      roleCode: "company_admin",
      requiresMfa: false
    });
    const secondApproverToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase17-second-approver@example.test"
    });

    platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "phase17-field@example.test",
      displayName: "Phase 17 Field User",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase17-field@example.test"
    });
    platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "phase17-payroll@example.test",
      displayName: "Phase 17 Payroll Admin",
      roleCode: "payroll_admin",
      requiresMfa: false
    });
    const payrollAdminToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase17-payroll@example.test"
    });

    const job = await platform.enqueueRuntimeJob({
      companyId: DEMO_IDS.companyId,
      jobType: "submission.transport",
      sourceObjectType: "submission",
      sourceObjectId: "phase17-submission",
      payload: { submissionId: "phase17-submission" },
      riskClass: "medium",
      actorId: "phase17-api"
    });
    const claimedJobs = await platform.claimAvailableRuntimeJobs({
      workerId: "phase17-worker"
    });
    const claimedJob = claimedJobs.find((candidate) => candidate.jobId === job.jobId);
    const attempt = await platform.startRuntimeJobAttempt({
      jobId: job.jobId,
      claimToken: claimedJob.claimToken,
      workerId: "phase17-worker"
    });
    await platform.failRuntimeJob({
      jobId: job.jobId,
      claimToken: claimedJob.claimToken,
      workerId: "phase17-worker",
      attemptId: attempt.attempt.jobAttemptId,
      errorClass: "persistent_technical",
      errorMessage: "transport failed",
      replayAllowed: true
    });

    const fieldUserBackofficeDenied = await requestJson(baseUrl, `/v1/backoffice/jobs?companyId=${DEMO_IDS.companyId}`, {
      token: fieldUserToken,
      expectedStatus: 403
    });
    assert.equal(fieldUserBackofficeDenied.error, "backoffice_role_forbidden");

    const supportCase = await requestJson(baseUrl, "/v1/backoffice/support-cases", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        category: "submission_transport_failure",
        severity: "high",
        requester: {
          channel: "email",
          requesterId: "customer-raw-001",
          email: "customer@example.test"
        },
        relatedObjectRefs: [
          { objectType: "submission", objectId: "phase17-submission-sensitive" }
        ]
      }
    });
    assert.equal(supportCase.masking.masked, true);
    assert.notEqual(supportCase.requester.requesterId, "customer-raw-001");
    assert.notEqual(supportCase.relatedObjectRefs[0].objectId, "phase17-submission-sensitive");

    const supportCases = await requestJson(baseUrl, `/v1/backoffice/support-cases?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    const listedSupportCase = supportCases.items.find((item) => item.supportCaseId === supportCase.supportCaseId);
    assert.equal(listedSupportCase.masking.masked, true);
    assert.notEqual(listedSupportCase.requester.email, "customer@example.test");

    const jobs = await requestJson(baseUrl, `/v1/backoffice/jobs?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    const jobRow = jobs.items.find((item) => item.jobId === job.jobId);
    assert.equal(jobRow.deadLetter.operatorState, "pending_triage");
    assert.equal(jobs.counters.deadLetterOpen >= 1, true);

    const deadLetters = await requestJson(baseUrl, `/v1/backoffice/dead-letters?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    const deadLetter = deadLetters.items.find((item) => item.jobId === job.jobId);
    assert.equal(deadLetter.operatorState, "pending_triage");
    const missingDeadLetterBinding = await requestJson(baseUrl, `/v1/backoffice/dead-letters/${deadLetter.deadLetterId}/triage`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 400,
      body: {
        companyId: DEMO_IDS.companyId,
        operatorState: "acknowledged"
      }
    });
    assert.equal(missingDeadLetterBinding.error, "backoffice_operator_binding_required");

    const opsIncident = await requestJson(baseUrl, "/v1/backoffice/incidents", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        title: "Phase 17 async dead letter",
        summary: "Anchor replay and dead-letter handling to an active incident.",
        severity: "high",
        relatedObjectRefs: [
          { objectType: "async_job", objectId: job.jobId },
          { objectType: "async_dead_letter", objectId: deadLetter.deadLetterId }
        ]
      }
    });

    const triaged = await requestJson(baseUrl, `/v1/backoffice/dead-letters/${deadLetter.deadLetterId}/triage`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        incidentId: opsIncident.incident.incidentId,
        operatorState: "acknowledged"
      }
    });
    assert.equal(triaged.operatorState, "acknowledged");

    const missingReplayBinding = await requestJson(baseUrl, `/v1/backoffice/jobs/${job.jobId}/replay`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 400,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "phase17_ops_repair"
      }
    });
    assert.equal(missingReplayBinding.error, "backoffice_operator_binding_required");

    const replayPlanned = await requestJson(baseUrl, `/v1/backoffice/jobs/${job.jobId}/replay`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        incidentId: opsIncident.incident.incidentId,
        reasonCode: "phase17_ops_repair"
      }
    });
    assert.equal(replayPlanned.replayPlan.status, "pending_approval");
    assert.equal(replayPlanned.deadLetter.operatorState, "replay_planned");
    assert.equal(typeof replayPlanned.replayOperation.replayOperationId, "string");
    assert.equal(replayPlanned.replayOperation.supportCaseId, null);
    assert.equal(replayPlanned.replayOperation.incidentId, opsIncident.incident.incidentId);

    const replayDeadLetters = await requestJson(baseUrl, `/v1/backoffice/dead-letters?companyId=${DEMO_IDS.companyId}&operatorState=replay_planned`, {
      token: adminToken
    });
    assert.equal(replayDeadLetters.items.some((item) => item.deadLetterId === deadLetter.deadLetterId), true);
    const replayDeadLetterRow = replayDeadLetters.items.find((item) => item.deadLetterId === deadLetter.deadLetterId);
    assert.equal(replayDeadLetterRow.replayOperation.replayOperationId, replayPlanned.replayOperation.replayOperationId);

    const overdueReview = platform.createReviewItem({
      companyId: DEMO_IDS.companyId,
      queueCode: "DOCUMENT_REVIEW",
      reviewTypeCode: "DOCUMENT_AMBIGUITY",
      sourceDomainCode: "DOCUMENTS",
      sourceObjectType: "document",
      sourceObjectId: "phase17-review-sla",
      requiredDecisionType: "classification",
      riskClass: "high",
      title: "Phase 17 overdue review item",
      summary: "SLA scan should create a backoffice work item and reopen it on recurring breach.",
      slaDueAt: "2026-03-25T10:00:00Z",
      actorId: DEMO_IDS.userId
    });

    const firstSlaScan = await requestJson(baseUrl, "/v1/backoffice/review-center/sla-scan", {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        asOf: "2026-03-26T00:30:00Z"
      }
    });
    assert.equal(firstSlaScan.scan.totalEscalationCount, 1);
    assert.equal(firstSlaScan.workItems.length, 1);
    assert.equal(firstSlaScan.notifications.length, 1);
    assert.equal(firstSlaScan.activityEntries.length, 1);
    assert.equal(firstSlaScan.incidentSignals.length, 0);
    assert.equal(firstSlaScan.scan.escalations[0].reviewItemId, overdueReview.reviewItemId);

    const operationalWorkItems = await requestJson(baseUrl, `/v1/work-items?companyId=${DEMO_IDS.companyId}&sourceType=review_center_sla_breach`, {
      token: adminToken
    });
    const slaWorkItem = operationalWorkItems.items.find((item) => item.sourceId === overdueReview.reviewItemId);
    assert.equal(typeof slaWorkItem?.workItemId, "string");
    assert.equal(slaWorkItem.status, "open");

    const payrollOperationalWorkItems = await requestJson(baseUrl, `/v1/work-items?companyId=${DEMO_IDS.companyId}&sourceType=review_center_sla_breach`, {
      token: payrollAdminToken
    });
    assert.equal(payrollOperationalWorkItems.items.some((item) => item.workItemId === slaWorkItem.workItemId), false);

    const payrollClaimForbidden = await requestJson(baseUrl, `/v1/work-items/${slaWorkItem.workItemId}/claim`, {
      method: "POST",
      token: payrollAdminToken,
      expectedStatus: 403,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(payrollClaimForbidden.error, "missing_permission");

    const claimedSlaWorkItem = await requestJson(baseUrl, `/v1/work-items/${slaWorkItem.workItemId}/claim`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(claimedSlaWorkItem.status, "acknowledged");

    const resolvedSlaWorkItem = await requestJson(baseUrl, `/v1/work-items/${slaWorkItem.workItemId}/resolve`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        resolutionCode: "phase17_sla_handled",
        completionNote: "Initial SLA breach reviewed by backoffice."
      }
    });
    assert.equal(resolvedSlaWorkItem.status, "resolved");

    const payrollResolveForbidden = await requestJson(baseUrl, `/v1/work-items/${slaWorkItem.workItemId}/resolve`, {
      method: "POST",
      token: payrollAdminToken,
      expectedStatus: 403,
      body: {
        companyId: DEMO_IDS.companyId,
        resolutionCode: "phase17_sla_handled"
      }
    });
    assert.equal(payrollResolveForbidden.error, "missing_permission");

    const recurringSlaScan = await requestJson(baseUrl, "/v1/backoffice/review-center/sla-scan", {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        asOf: "2026-03-26T09:00:00Z"
      }
    });
    assert.equal(recurringSlaScan.scan.totalEscalationCount, 1);
    assert.equal(recurringSlaScan.scan.escalations[0].escalationKind, "recurring_sla_breach");
    assert.equal(recurringSlaScan.workItems.length, 1);
    assert.equal(recurringSlaScan.workItems[0].workItemId, slaWorkItem.workItemId);
    assert.equal(recurringSlaScan.workItems[0].status, "open");
    assert.equal(recurringSlaScan.incidentSignals.length, 1);
    assert.equal(recurringSlaScan.incidentSignals[0].signalType, "review_queue_sla_breach");

    const submission = await requestJson(baseUrl, "/v1/submissions", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        submissionType: "agi_monthly",
        sourceObjectType: "agi_submission_period",
        sourceObjectId: "agi-period-2026-03",
        providerKey: "skatteverket",
        recipientId: "skatteverket:agi",
        retryClass: "manual_only",
        payload: {
          periodCode: "2026-03",
          companyTaxIdentity: "556677-8899",
          employeeCount: 1,
          payRuns: ["PR-2026-03"]
        }
      }
    });
    await requestJson(baseUrl, `/v1/submissions/${submission.submissionId}/sign`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    const dispatchedSubmission = await requestJson(baseUrl, `/v1/submissions/${submission.submissionId}/submit`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        simulatedTransportOutcome: "technical_ack"
      }
    });
    assert.equal(dispatchedSubmission.transportQueued, true);
    await runWorkerBatch({
      platform,
      logger: () => {},
      workerId: "phase17-submission-worker"
    });
    await requestJson(baseUrl, `/v1/submissions/${submission.submissionId}/receipts`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        receiptType: "business_nack",
        rawReference: "phase17-business-nack",
        requiredInput: ["correct_agi_values"]
      }
    });

    const submissionMonitor = await requestJson(baseUrl, `/v1/backoffice/submissions/monitor?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    const submissionRow = submissionMonitor.items.find(
      (item) => item.objectType === "authoritySubmission" && item.submissionId === submission.submissionId
    );
    assert.ok(submissionRow);
    assert.equal(submissionRow.receiptClasses.technical, "received");
    assert.equal(submissionRow.receiptClasses.business, "rejected");
    assert.equal(submissionRow.lagAlerts.some((alert) => alert.alertCode === "business_rejection"), true);
    const submissionDeadLetterRow = submissionMonitor.items.find(
      (item) => item.objectType === "submissionDeadLetter" && item.deadLetterId === deadLetter.deadLetterId
    );
    assert.ok(submissionDeadLetterRow);
    assert.equal(submissionDeadLetterRow.job.jobId, job.jobId);
    assert.equal(submissionDeadLetterRow.deadLetter.operatorState, "replay_planned");
    assert.equal(submissionDeadLetterRow.replayPlan.status, "pending_approval");
    assert.equal(submissionDeadLetterRow.replayOperation.replayOperationId, replayPlanned.replayOperation.replayOperationId);
    assert.equal(submissionDeadLetterRow.escalationPolicyCode, "submission_monitor.dead_letter_replay");
    assert.equal(typeof submissionDeadLetterRow.oldestOpenAgeMinutes, "number");
    assert.equal(submissionDeadLetterRow.lagAlerts.some((alert) => alert.alertCode === "dead_letter_open"), true);
    assert.equal(submissionDeadLetterRow.replayEligible, true);
    assert.equal(submissionMonitor.counters.materialPending >= 1, true);
    assert.equal(submissionMonitor.counters.deadLettered >= 1, true);
    assert.equal(submissionMonitor.counters.replayPlanned >= 1, true);
    assert.equal(submissionMonitor.counters.lagging >= 2, true);
    assert.equal(submissionRow.queueItems[0].slaDueAt, submissionRow.queueItems[0].createdAt);
    const submissionMonitorQueue = submissionMonitor.queueSummary.find((queue) => queue.ownerQueue === "tax_operator");
    assert.ok(submissionMonitorQueue);
    assert.equal(submissionMonitorQueue.escalationPolicyCode, "submission_monitor.default");
    assert.equal(typeof submissionMonitorQueue.oldestOpenAgeHours, "number");

    const submissionMonitorScan = await requestJson(baseUrl, "/v1/backoffice/submissions/monitor/scan", {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        asOf: "2026-03-26T00:30:00Z"
      }
    });
    assert.equal(submissionMonitorScan.scan.laggingRowCount >= 2, true);
    assert.equal(submissionMonitorScan.workItems.length >= 2, true);
    assert.equal(submissionMonitorScan.notifications.length >= 2, true);
    assert.equal(submissionMonitorScan.activityEntries.length >= 2, true);
    const submissionAlertWorkItem = submissionMonitorScan.workItems.find((item) => item.sourceType === "authoritySubmission" && item.sourceId === submission.submissionId);
    assert.ok(submissionAlertWorkItem);
    assert.equal(submissionAlertWorkItem.queueCode, "SUBMISSION_MONITORING");
    assert.equal(submissionAlertWorkItem.metadataJson.alertCodes.includes("business_rejection"), true);
    assert.equal(submissionAlertWorkItem.metadataJson.alertCodes.includes("correction_required"), true);
    const deadLetterAlertWorkItem = submissionMonitorScan.workItems.find((item) => item.sourceType === "submissionDeadLetter" && item.sourceId === deadLetter.deadLetterId);
    assert.ok(deadLetterAlertWorkItem);
    assert.equal(deadLetterAlertWorkItem.metadataJson.alertCodes.includes("dead_letter_open"), true);

    const incident = await requestJson(baseUrl, "/v1/backoffice/incidents", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        title: "Phase 17 submission outage",
        summary: "Backoffice raised incident from submission monitoring.",
        severity: "high",
        relatedObjectRefs: [
          { objectType: "submission", objectId: submission.submissionId },
          { objectType: "async_job", objectId: job.jobId }
        ]
      }
    });
    assert.equal(incident.incident.status, "open");
    assert.equal(incident.incident.relatedObjectRefs.length, 2);
    assert.equal(incident.incident.masking.masked, true);
    assert.notEqual(incident.incident.relatedObjectRefs[0].objectId, submission.submissionId);

    const incidentList = await requestJson(baseUrl, `/v1/backoffice/incidents?companyId=${DEMO_IDS.companyId}&status=open`, {
      token: adminToken
    });
    assert.equal(incidentList.items.some((item) => item.incidentId === incident.incident.incidentId), true);
    const incidentListRow = incidentList.items.find((item) => item.incidentId === incident.incident.incidentId);
    assert.equal(incidentListRow.masking.masked, true);

    const incidentEvent = await requestJson(baseUrl, `/v1/backoffice/incidents/${incident.incident.incidentId}/events`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        eventType: "mitigation_started",
        note: "Containment started for transport outage."
      }
    });
    assert.equal(incidentEvent.event.eventType, "mitigation_started");

    const incidentEvents = await requestJson(baseUrl, `/v1/backoffice/incidents/${incident.incident.incidentId}/events?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(incidentEvents.items.some((item) => item.eventType === "mitigation_started"), true);

    const triagedIncident = await requestJson(baseUrl, `/v1/backoffice/incidents/${incident.incident.incidentId}/status`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        status: "triaged",
        note: "Incident triaged for regulated submission outage."
      }
    });
    assert.equal(triagedIncident.incident.status, "triaged");

    const incidentStatus = await requestJson(baseUrl, `/v1/backoffice/incidents/${incident.incident.incidentId}/status`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        status: "mitigating",
        note: "Mitigation in progress."
      }
    });
    assert.equal(incidentStatus.incident.status, "mitigating");

    const breakGlass = await requestJson(baseUrl, "/v1/backoffice/break-glass", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        incidentId: incident.incident.incidentId,
        purposeCode: "incident_investigation",
        requestedActions: ["list_submission_queue"]
      }
    });
    const firstBreakGlassApproval = await requestJson(baseUrl, `/v1/backoffice/break-glass/${breakGlass.breakGlassId}/approve`, {
      method: "POST",
      token: approverToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(firstBreakGlassApproval.status, "requested");
    const secondBreakGlassApproval = await requestJson(baseUrl, `/v1/backoffice/break-glass/${breakGlass.breakGlassId}/approve`, {
      method: "POST",
      token: secondApproverToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(secondBreakGlassApproval.status, "dual_approved");
    const startedBreakGlass = await requestJson(baseUrl, `/v1/backoffice/break-glass/${breakGlass.breakGlassId}/start`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(startedBreakGlass.status, "active");
    const reviewedBreakGlass = await requestJson(baseUrl, `/v1/backoffice/break-glass/${breakGlass.breakGlassId}/close`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "incident_resolved"
      }
    });
    assert.equal(reviewedBreakGlass.status, "ended");
    const closedBreakGlass = await requestJson(baseUrl, `/v1/backoffice/break-glass/${breakGlass.breakGlassId}/close`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(closedBreakGlass.status, "ended");

    const stabilizedIncident = await requestJson(baseUrl, `/v1/backoffice/incidents/${incident.incident.incidentId}/status`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        status: "stabilized",
        note: "Transport queue stabilized after operator intervention."
      }
    });
    assert.equal(stabilizedIncident.incident.status, "stabilized");

    const resolvedIncident = await requestJson(baseUrl, `/v1/backoffice/incidents/${incident.incident.incidentId}/status`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        status: "resolved",
        note: "Submission transport restored and verified."
      }
    });
    assert.equal(resolvedIncident.incident.status, "resolved");

    const closeBeforeReview = await requestJson(baseUrl, `/v1/backoffice/incidents/${incident.incident.incidentId}/status`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        status: "closed"
      }
    });
    assert.equal(closeBeforeReview.error, "runtime_incident_post_review_required");

    const postReview = await requestJson(baseUrl, `/v1/backoffice/incidents/${incident.incident.incidentId}/post-review`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        summary: "Submission outage post-review completed with break-glass chain reviewed.",
        rootCauseSummary: "Dead-lettered submission transport path lacked earlier operator escalation.",
        impactScope: {
          customerVisible: true,
          regulatoryRisk: true,
          systems: ["submission_monitoring", "worker_runtime"],
          regulatedDomains: ["agi"]
        },
        correctiveActions: [
          {
            actionCode: "submission_monitor_scan",
            summary: "Materialize lagging submission monitor alerts into work items."
          }
        ],
        preventiveActions: [
          {
            actionCode: "incident_post_review_enforcement",
            summary: "Require post-review before closing regulated incidents."
          }
        ],
        reviewedBreakGlassIds: [breakGlass.breakGlassId],
        evidenceRefs: [
          { objectType: "submission", objectId: submission.submissionId },
          { objectType: "async_dead_letter", objectId: deadLetter.deadLetterId }
        ]
      }
    });
    assert.equal(postReview.incident.status, "post_review");
    assert.equal(postReview.postIncidentReview.reviewedBreakGlassIds.includes(breakGlass.breakGlassId), true);

    const fetchedPostReview = await requestJson(baseUrl, `/v1/backoffice/incidents/${incident.incident.incidentId}/post-review?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(fetchedPostReview.postIncidentReview.postIncidentReviewId, postReview.postIncidentReview.postIncidentReviewId);

    const closedIncident = await requestJson(baseUrl, `/v1/backoffice/incidents/${incident.incident.incidentId}/status`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        status: "closed",
        note: "Post-review completed and follow-up actions assigned."
      }
    });
    assert.equal(closedIncident.incident.status, "closed");

    const auditCorrelations = await requestJson(baseUrl, `/v1/backoffice/audit-correlations?companyId=${DEMO_IDS.companyId}&entityType=runtime_incident&entityId=${incident.incident.incidentId}`, {
      token: adminToken
    });
    assert.equal(auditCorrelations.items.length >= 1, true);
    const incidentCorrelation = auditCorrelations.items[0];
    assert.equal(incidentCorrelation.relatedEntities.some((entry) => entry.entityType === "runtime_incident" && entry.entityId === incident.incident.incidentId), true);

    const auditCorrelation = await requestJson(baseUrl, `/v1/backoffice/audit-correlations/${incidentCorrelation.correlationId}?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(auditCorrelation.correlation.correlationId, incidentCorrelation.correlationId);
    assert.equal(auditCorrelation.correlation.relatedEntities.some((entry) => entry.entityType === "runtime_incident"), true);

    const replayListBeforeApproval = await requestJson(baseUrl, `/v1/backoffice/replays?companyId=${DEMO_IDS.companyId}&status=pending_approval`, {
      token: adminToken
    });
    assert.equal(replayListBeforeApproval.items.some((item) => item.replayPlanId === replayPlanned.replayPlan.replayPlanId), true);
    const replayListRow = replayListBeforeApproval.items.find((item) => item.replayPlanId === replayPlanned.replayPlan.replayPlanId);
    assert.equal(replayListRow.replayOperationId, replayPlanned.replayOperation.replayOperationId);
    assert.equal(replayListRow.incidentId, opsIncident.incident.incidentId);
    assert.equal(replayListRow.deadLetter.deadLetterId, deadLetter.deadLetterId);

    const selfApprovalDenied = await requestJson(baseUrl, `/v1/backoffice/replays/${replayPlanned.replayPlan.replayPlanId}/approve`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        incidentId: opsIncident.incident.incidentId
      }
    });
    assert.equal(selfApprovalDenied.error, "async_job_replay_self_approval_forbidden");

    const approvedReplay = await requestJson(baseUrl, `/v1/backoffice/replays/${replayPlanned.replayPlan.replayPlanId}/approve`, {
      method: "POST",
      token: approverToken,
      body: {
        companyId: DEMO_IDS.companyId,
        incidentId: opsIncident.incident.incidentId
      }
    });
    assert.equal(approvedReplay.replayPlan.status, "approved");
    assert.equal(approvedReplay.replayOperation.approvedByUserId, approvedReplay.replayPlan.approvedByUserId);

    const executedReplay = await requestJson(baseUrl, `/v1/backoffice/replays/${replayPlanned.replayPlan.replayPlanId}/execute`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        incidentId: opsIncident.incident.incidentId
      }
    });
    assert.equal(executedReplay.replayPlan.status, "scheduled");
    assert.equal(executedReplay.deadLetter.operatorState, "resolved");
    assert.equal(executedReplay.replayOperation.replayOperationId, replayPlanned.replayOperation.replayOperationId);
    assert.equal(executedReplay.replayOperation.replayJobId, executedReplay.replayJob.jobId);
  } finally {
    await stopServer(server);
  }
});

test("Step 15.4 API hardens operational queue grants, assignment, escalation and dual-control work items", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-27T14:00:00Z")
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

    const secondAdmin = platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "phase15-second-admin@example.test",
      displayName: "Phase 15 Second Admin",
      roleCode: "company_admin",
      requiresMfa: false
    });
    const secondAdminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase15-second-admin@example.test"
    });

    const payrollAdmin = platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "phase15-payroll-admin@example.test",
      displayName: "Phase 15 Payroll Admin",
      roleCode: "payroll_admin",
      requiresMfa: false
    });

    const queueWorkItem = platform.upsertOperationalWorkItem({
      companyId: DEMO_IDS.companyId,
      queueCode: "PAYROLL_EXCEPTION_QUEUE",
      ownerTeamId: "payroll_ops",
      sourceType: "payroll_exception",
      sourceId: "phase15-queue-1",
      title: "Payroll exception requires operator view",
      summary: "Grant-managed queue should surface only to explicitly granted operators.",
      priority: "high",
      deadlineAt: "2026-03-27T13:00:00Z",
      actorId: DEMO_IDS.userId
    });

    const hiddenBeforeGrant = await requestJson(
      baseUrl,
      `/v1/work-items?companyId=${DEMO_IDS.companyId}&queueCode=PAYROLL_EXCEPTION_QUEUE`,
      { token: adminToken }
    );
    assert.equal(hiddenBeforeGrant.items.length, 0);

    for (const grant of [
      { companyUserId: DEMO_IDS.companyUserId, permissionCode: "company.read" },
      { companyUserId: DEMO_IDS.companyUserId, permissionCode: "company.manage" },
      { companyUserId: payrollAdmin.companyUserId, permissionCode: "company.read" },
      { companyUserId: payrollAdmin.companyUserId, permissionCode: "company.manage" }
    ]) {
      await requestJson(baseUrl, "/v1/org/object-grants", {
        method: "POST",
        token: adminToken,
        expectedStatus: 201,
        body: {
          companyId: DEMO_IDS.companyId,
          companyUserId: grant.companyUserId,
          permissionCode: grant.permissionCode,
          objectType: "operational_queue",
          objectId: "PAYROLL_EXCEPTION_QUEUE"
        }
      });
    }

    const visibleAfterGrant = await requestJson(
      baseUrl,
      `/v1/work-items?companyId=${DEMO_IDS.companyId}&queueCode=PAYROLL_EXCEPTION_QUEUE`,
      { token: adminToken }
    );
    assert.equal(visibleAfterGrant.items.length, 1);
    assert.equal(visibleAfterGrant.items[0].workItemId, queueWorkItem.workItemId);
    assert.equal(visibleAfterGrant.items[0].queueGrantManaged, true);
    assert.equal(visibleAfterGrant.items[0].isOverdue, true);

    const queueViews = await requestJson(
      baseUrl,
      `/v1/work-items/queues?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    const payrollQueueView = queueViews.items.find((item) => item.queueCode === "PAYROLL_EXCEPTION_QUEUE");
    assert.ok(payrollQueueView);
    assert.equal(payrollQueueView.queueGrantManaged, true);
    assert.equal(payrollQueueView.openCount, 1);
    assert.equal(payrollQueueView.overdueCount, 1);

    const assignWithoutGrant = await requestJson(baseUrl, `/v1/work-items/${queueWorkItem.workItemId}/assign`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        ownerCompanyUserId: secondAdmin.companyUserId
      }
    });
    assert.equal(assignWithoutGrant.error, "operational_work_item_queue_grant_required");

    const assigned = await requestJson(baseUrl, `/v1/work-items/${queueWorkItem.workItemId}/assign`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        ownerCompanyUserId: payrollAdmin.companyUserId,
        reasonCode: "grant_based_assignment"
      }
    });
    assert.equal(assigned.ownerCompanyUserId, payrollAdmin.companyUserId);
    assert.equal(assigned.status, "open");

    const escalated = await requestJson(baseUrl, `/v1/work-items/${queueWorkItem.workItemId}/escalate`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "operator_backlog",
        escalationNote: "Payroll queue breached operator SLA."
      }
    });
    assert.equal(escalated.status, "escalated");
    assert.equal(escalated.escalationCount, 1);

    const queueViewsAfterEscalation = await requestJson(
      baseUrl,
      `/v1/work-items/queues?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    const escalatedQueueView = queueViewsAfterEscalation.items.find((item) => item.queueCode === "PAYROLL_EXCEPTION_QUEUE");
    assert.ok(escalatedQueueView);
    assert.equal(escalatedQueueView.escalatedCount, 1);
    assert.equal(escalatedQueueView.assignedCount, 1);

    const dualControlItem = platform.upsertOperationalWorkItem({
      companyId: DEMO_IDS.companyId,
      queueCode: "CUTOVER_APPROVAL_QUEUE",
      ownerTeamId: "finance_ops",
      ownerCompanyUserId: DEMO_IDS.companyUserId,
      sourceType: "cutover",
      sourceId: "phase15-dual-control-1",
      title: "Cutover approval requires dual control",
      priority: "critical",
      deadlineAt: "2026-03-27T18:00:00Z",
      blockerScope: "dual_control",
      actorId: DEMO_IDS.userId
    });

    const claimed = await requestJson(baseUrl, `/v1/work-items/${dualControlItem.workItemId}/claim`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(claimed.status, "acknowledged");
    assert.equal(claimed.dualControlBlocked, true);

    const selfDualApproveForbidden = await requestJson(baseUrl, `/v1/work-items/${dualControlItem.workItemId}/dual-approve`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        note: "Self approval is forbidden."
      }
    });
    assert.equal(selfDualApproveForbidden.error, "operational_work_item_dual_control_self_approval_forbidden");

    const resolveBeforeApproval = await requestJson(baseUrl, `/v1/work-items/${dualControlItem.workItemId}/resolve`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        resolutionCode: "cutover_ready"
      }
    });
    assert.equal(resolveBeforeApproval.error, "operational_work_item_dual_control_required");

    const dualApproved = await requestJson(baseUrl, `/v1/work-items/${dualControlItem.workItemId}/dual-approve`, {
      method: "POST",
      token: secondAdminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        note: "Independent reviewer approved cutover."
      }
    });
    assert.equal(dualApproved.dualControlStatus, "approved");
    assert.equal(dualApproved.dualApprovedByCompanyUserId, secondAdmin.companyUserId);

    const resolved = await requestJson(baseUrl, `/v1/work-items/${dualControlItem.workItemId}/resolve`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        resolutionCode: "cutover_ready",
        completionNote: "Dual-control gate passed."
      }
    });
    assert.equal(resolved.status, "resolved");
  } finally {
    await stopServer(server);
  }
});
