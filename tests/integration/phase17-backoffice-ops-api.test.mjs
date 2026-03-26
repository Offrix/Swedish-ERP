import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
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
    assert.equal(replayPlanned.replayPlan.status, "planned");
    assert.equal(replayPlanned.deadLetter.operatorState, "replay_planned");

    const replayDeadLetters = await requestJson(baseUrl, `/v1/backoffice/dead-letters?companyId=${DEMO_IDS.companyId}&operatorState=replay_planned`, {
      token: adminToken
    });
    assert.equal(replayDeadLetters.items.some((item) => item.deadLetterId === deadLetter.deadLetterId), true);

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
    assert.equal(submissionDeadLetterRow.replayPlan.status, "planned");
    assert.equal(submissionDeadLetterRow.lagAlerts.some((alert) => alert.alertCode === "dead_letter_open"), true);
    assert.equal(submissionDeadLetterRow.replayEligible, true);
    assert.equal(submissionMonitor.counters.materialPending >= 1, true);
    assert.equal(submissionMonitor.counters.deadLettered >= 1, true);
    assert.equal(submissionMonitor.counters.replayPlanned >= 1, true);
    assert.equal(submissionMonitor.counters.lagging >= 2, true);
    assert.equal(submissionRow.queueItems[0].slaDueAt, submissionRow.queueItems[0].createdAt);
    assert.equal(submissionMonitor.queueSummary.some((queue) => queue.ownerQueue === "tax_operator"), true);

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

    const incidentList = await requestJson(baseUrl, `/v1/backoffice/incidents?companyId=${DEMO_IDS.companyId}&status=open`, {
      token: adminToken
    });
    assert.equal(incidentList.items.some((item) => item.incidentId === incident.incident.incidentId), true);

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
    assert.equal(secondBreakGlassApproval.status, "active");
    const reviewedBreakGlass = await requestJson(baseUrl, `/v1/backoffice/break-glass/${breakGlass.breakGlassId}/close`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(reviewedBreakGlass.status, "reviewed");
    const closedBreakGlass = await requestJson(baseUrl, `/v1/backoffice/break-glass/${breakGlass.breakGlassId}/close`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(closedBreakGlass.status, "closed");

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

    const replayListBeforeApproval = await requestJson(baseUrl, `/v1/backoffice/replays?companyId=${DEMO_IDS.companyId}&status=planned`, {
      token: adminToken
    });
    assert.equal(replayListBeforeApproval.items.some((item) => item.replayPlanId === replayPlanned.replayPlan.replayPlanId), true);

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

    const executedReplay = await requestJson(baseUrl, `/v1/backoffice/replays/${replayPlanned.replayPlan.replayPlanId}/execute`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        incidentId: opsIncident.incident.incidentId
      }
    });
    assert.equal(executedReplay.replayPlan.status, "executed");
    assert.equal(executedReplay.deadLetter.operatorState, "resolved");
  } finally {
    await stopServer(server);
  }
});
