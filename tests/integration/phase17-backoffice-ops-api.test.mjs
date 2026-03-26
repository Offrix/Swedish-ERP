import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Step 17 API exposes backoffice jobs, dead-letter triage, submission monitoring and incident creation", async () => {
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

    const triaged = await requestJson(baseUrl, `/v1/backoffice/dead-letters/${deadLetter.deadLetterId}/triage`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        operatorState: "acknowledged"
      }
    });
    assert.equal(triaged.operatorState, "acknowledged");

    const replayPlanned = await requestJson(baseUrl, `/v1/backoffice/jobs/${job.jobId}/replay`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "phase17_ops_repair"
      }
    });
    assert.equal(replayPlanned.replayPlan.status, "planned");
    assert.equal(replayPlanned.deadLetter.operatorState, "replay_planned");

    const replayDeadLetters = await requestJson(baseUrl, `/v1/backoffice/dead-letters?companyId=${DEMO_IDS.companyId}&operatorState=replay_planned`, {
      token: adminToken
    });
    assert.equal(replayDeadLetters.items.some((item) => item.deadLetterId === deadLetter.deadLetterId), true);

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
    await requestJson(baseUrl, `/v1/submissions/${submission.submissionId}/submit`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        simulatedTransportOutcome: "technical_ack"
      }
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
    const submissionRow = submissionMonitor.items.find((item) => item.submissionId === submission.submissionId);
    assert.equal(submissionRow.receiptClasses.technical, "received");
    assert.equal(submissionRow.receiptClasses.business, "rejected");
    assert.equal(submissionRow.lagAlerts.some((alert) => alert.alertCode === "business_rejection"), true);
    assert.equal(submissionMonitor.counters.materialPending >= 1, true);

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
  } finally {
    await stopServer(server);
  }
});
