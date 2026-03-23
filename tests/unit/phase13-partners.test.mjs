import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";

test("Phase 13.2 partner adapters expose contract tests, fallback and replay-safe jobs", () => {
  let currentTime = new Date("2026-03-22T18:30:00Z");
  const platform = createApiPlatform({
    clock: () => currentTime
  });

  const connections = platform.partnerConnectionTypes.map((connectionType) =>
    platform.createPartnerConnection({
      companyId: DEMO_IDS.companyId,
      connectionType,
      partnerCode: `${connectionType}_partner`,
      displayName: `${connectionType} partner`,
      mode: "sandbox",
      rateLimitPerMinute: connectionType === "bank" ? 1 : 60,
      fallbackMode: "queue_retry",
      credentialsRef: `secret://${connectionType}`,
      actorId: "phase13-2-unit"
    })
  );

  const contractResults = connections.map((connection) =>
    platform.runAdapterContractTest({
      companyId: DEMO_IDS.companyId,
      connectionId: connection.connectionId,
      actorId: "phase13-2-unit"
    })
  );
  assert.equal(contractResults.length, platform.partnerConnectionTypes.length);
  assert.equal(contractResults.every((result) => result.result === "passed"), true);
  assert.equal(contractResults.every((result) => result.assertions.length > 0), true);

  const bankConnection = connections.find((connection) => connection.connectionType === "bank");
  const succeeded = platform.dispatchPartnerOperation({
    companyId: DEMO_IDS.companyId,
    connectionId: bankConnection.connectionId,
    operationCode: "statement_sync",
    payload: { cursor: "cursor-1" },
    actorId: "phase13-2-unit"
  });
  assert.equal(succeeded.status, "succeeded");

  const rateLimited = platform.dispatchPartnerOperation({
    companyId: DEMO_IDS.companyId,
    connectionId: bankConnection.connectionId,
    operationCode: "statement_sync",
    payload: { cursor: "cursor-2" },
    actorId: "phase13-2-unit"
  });
  assert.equal(rateLimited.status, "rate_limited");
  assert.ok(rateLimited.jobId);

  const deadLettered = platform.failAsyncJobAttempt({
    companyId: DEMO_IDS.companyId,
    jobId: rateLimited.jobId,
    errorClass: "persistent_technical",
    errorMessage: "schema drift",
    replayAllowed: true
  });
  assert.equal(deadLettered.status, "dead_lettered");
  assert.equal(deadLettered.deadLetter.replayAllowed, true);
  assert.throws(
    () =>
      platform.planJobReplay({
        companyId: DEMO_IDS.companyId,
        jobId: rateLimited.jobId,
        actorId: "phase13-2-unit",
        approvedByActorId: "phase13-2-unit"
      }),
    (error) => error?.code === "job_replay_self_approval_forbidden"
  );

  const replayPlan = platform.planJobReplay({
    companyId: DEMO_IDS.companyId,
    jobId: rateLimited.jobId,
    actorId: "phase13-2-unit",
    approvedByActorId: DEMO_IDS.userId
  });
  assert.equal(replayPlan.status, "replay_planned");

  const replayed = platform.executeJobReplay({
    companyId: DEMO_IDS.companyId,
    jobId: rateLimited.jobId,
    actorId: "phase13-2-unit"
  });
  assert.equal(replayed.originalJob.status, "replayed");
  assert.equal(replayed.replayJob.replayOfJobId, rateLimited.jobId);

  const retryJob = platform.enqueueAsyncJob({
    companyId: DEMO_IDS.companyId,
    jobType: "crm.customer_sync",
    payloadRef: "phase13-retry",
    payload: { customerId: "retry-1" },
    actorId: "phase13-2-unit"
  });
  platform.claimAsyncJob({
    companyId: DEMO_IDS.companyId,
    jobId: retryJob.jobId,
    workerId: "crm-worker"
  });
  const scheduledRetry = platform.failAsyncJobAttempt({
    companyId: DEMO_IDS.companyId,
    jobId: retryJob.jobId,
    errorClass: "transient_technical",
    errorMessage: "temporary outage"
  });
  assert.equal(scheduledRetry.status, "retry_scheduled");
  assert.throws(
    () =>
      platform.claimAsyncJob({
        companyId: DEMO_IDS.companyId,
        jobId: retryJob.jobId,
        workerId: "crm-worker"
      }),
    (error) => error?.code === "job_retry_not_ready"
  );
  currentTime = new Date("2026-03-22T18:36:00Z");
  const claimedRetry = platform.claimAsyncJob({
    companyId: DEMO_IDS.companyId,
    jobId: retryJob.jobId,
    workerId: "crm-worker"
  });
  assert.equal(claimedRetry.status, "claimed");
});
