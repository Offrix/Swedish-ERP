import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_APPROVER_EMAIL, DEMO_APPROVER_IDS, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { loginWithStrongAuthOnPlatform, loginWithTotpOnPlatform } from "../helpers/platform-auth.mjs";

test("Phase 17.1 replay operations are first-class backoffice objects bound to support and dead-letter flows", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T10:00:00Z")
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
    scopeCode: "support_case",
    permissionCode: "company.manage"
  });

  const supportCase = platform.createSupportCase({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    category: "submission_transport_failure",
    severity: "high",
    approvedActions: ["plan_job_replay", "execute_job_replay"],
    relatedObjectRefs: [{ objectType: "submission", objectId: "phase17-unit-submission" }]
  });
  platform.approveSupportCaseActions({
    sessionToken: approverToken,
    companyId: DEMO_IDS.companyId,
    supportCaseId: supportCase.supportCaseId,
    approvedActions: ["plan_job_replay", "execute_job_replay"]
  });

  const job = await platform.enqueueRuntimeJob({
    companyId: DEMO_IDS.companyId,
    jobType: "submission.transport",
    sourceObjectType: "submission",
    sourceObjectId: "phase17-unit-submission",
    payload: { submissionId: "phase17-unit-submission" },
    riskClass: "medium",
    actorId: "phase17-unit"
  });
  const claimedJobs = await platform.claimAvailableRuntimeJobs({ workerId: "phase17-unit-worker" });
  const claimedJob = claimedJobs.find((candidate) => candidate.jobId === job.jobId);
  const started = await platform.startRuntimeJobAttempt({
    jobId: job.jobId,
    claimToken: claimedJob.claimToken,
    workerId: "phase17-unit-worker"
  });
  await platform.failRuntimeJob({
    jobId: job.jobId,
    claimToken: claimedJob.claimToken,
    workerId: "phase17-unit-worker",
    attemptId: started.attempt.jobAttemptId,
    errorClass: "persistent_technical",
    errorMessage: "transport outage",
    replayAllowed: true
  });
  const deadLetter = (await platform.listRuntimeDeadLetters({ companyId: DEMO_IDS.companyId }))
    .find((candidate) => candidate.jobId === job.jobId);

  const replayPlan = await platform.planRuntimeJobReplay({
    jobId: job.jobId,
    plannedByUserId: DEMO_IDS.userId,
    reasonCode: "phase17_unit_repair",
    plannedPayloadStrategy: "reuse"
  });
  const replayOperation = await platform.registerReplayOperation({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    replayPlan,
    supportCaseId: supportCase.supportCaseId,
    deadLetterId: deadLetter.deadLetterId
  });
  assert.equal(replayOperation.replayPlanId, replayPlan.replayPlanId);
  assert.equal(replayOperation.supportCaseId, supportCase.supportCaseId);
  assert.equal(replayOperation.deadLetterId, deadLetter.deadLetterId);
  assert.equal(replayOperation.status, "pending_approval");

  const approvedReplayPlan = await platform.approveRuntimeJobReplay({
    replayPlanId: replayPlan.replayPlanId,
    approvedByUserId: "phase17-approver"
  });
  const approvedOperation = await platform.recordReplayOperationApproval({
    sessionToken: approverToken,
    companyId: DEMO_IDS.companyId,
    replayPlan: approvedReplayPlan,
    supportCaseId: supportCase.supportCaseId
  });
  assert.equal(approvedOperation.status, "approved");
  assert.equal(approvedOperation.approvedByUserId, "phase17-approver");

  const executedReplay = await platform.executeRuntimeJobReplay({
    replayPlanId: replayPlan.replayPlanId,
    actorId: DEMO_IDS.userId
  });
  const executedOperation = await platform.recordReplayOperationExecution({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    replayPlan: executedReplay.replayPlan,
    replayJob: executedReplay.replayJob,
    deadLetterId: deadLetter.deadLetterId,
    supportCaseId: supportCase.supportCaseId
  });
  assert.equal(executedOperation.status, "scheduled");
  assert.equal(executedOperation.replayJobId, executedReplay.replayJob.jobId);

  const replayOperations = await platform.listReplayOperations({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId
  });
  const listedOperation = replayOperations.find((candidate) => candidate.replayOperationId === replayOperation.replayOperationId);
  assert.ok(listedOperation);
  assert.equal(listedOperation.replayPlanId, replayPlan.replayPlanId);
  assert.equal(listedOperation.deadLetterId, deadLetter.deadLetterId);
  assert.equal(listedOperation.jobId, job.jobId);
});
