import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import {
  createPassingPartnerContractTestExecutors,
  createSuccessfulPartnerOperationExecutors
} from "../helpers/phase13-integrations-fixtures.mjs";

test("Phase 16.3 partner contract-test packs are first-class catalog objects", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T10:00:00Z")
  });

  const packs = platform.listAdapterContractTestPacks({});
  assert.equal(packs.some((pack) => pack.connectionType === "bank" && pack.providerCode === "enable_banking"), true);
  assert.equal(packs.some((pack) => pack.connectionType === "id06" && pack.supportedModes.includes("production")), true);
  assert.equal(packs.find((pack) => pack.connectionType === "id06").supportedModes.includes("sandbox"), false);
  assert.equal(packs.find((pack) => pack.connectionType === "peppol").assertions.includes("duplicate_delivery_guard"), true);
});

test("Phase 16.3 production partner dispatch requires a green contract test and exposes health summaries", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T10:05:00Z"),
    partnerContractTestExecutors: createPassingPartnerContractTestExecutors(),
    partnerOperationExecutors: createSuccessfulPartnerOperationExecutors()
  });

  const connection = platform.createPartnerConnection({
    companyId: DEMO_IDS.companyId,
    connectionType: "id06",
    providerCode: "official_id06_integration",
    displayName: "ID06 production adapter",
    mode: "production",
    credentialsRef: "secret://id06",
    actorId: "phase16-3-unit"
  });

  await assert.rejects(
    () =>
      platform.dispatchPartnerOperation({
        companyId: DEMO_IDS.companyId,
        connectionId: connection.connectionId,
        operationCode: "attendance_sync",
        payload: { attendanceBatchId: "id06-batch-1" },
        actorId: "phase16-3-unit"
      }),
    (error) => error?.code === "partner_contract_test_required"
  );

  const contractResult = await platform.runAdapterContractTest({
    companyId: DEMO_IDS.companyId,
    connectionId: connection.connectionId,
    actorId: "phase16-3-unit"
  });
  assert.equal(contractResult.status, "passed");

  const queued = await platform.dispatchPartnerOperation({
    companyId: DEMO_IDS.companyId,
    connectionId: connection.connectionId,
    operationCode: "attendance_sync",
    payload: { attendanceBatchId: "id06-batch-1" },
    actorId: "phase16-3-unit"
  });
  assert.equal(queued.status, "queued");
  const executed = await platform.executePartnerOperation({
    companyId: DEMO_IDS.companyId,
    operationId: queued.operationId,
    actorId: "phase16-3-unit"
  });
  assert.equal(executed.status, "succeeded");

  const healthCheck = platform.runPartnerHealthCheck({
    companyId: DEMO_IDS.companyId,
    connectionId: connection.connectionId,
    checkSetCode: "full",
    actorId: "phase16-3-unit"
  });
  const checks = platform.listPartnerHealthChecks({
    companyId: DEMO_IDS.companyId,
    connectionId: connection.connectionId
  });
  assert.equal(checks.length, 1);
  assert.equal(checks[0].healthCheckId, healthCheck.healthCheckId);

  const summary = platform.getPartnerHealthSummary({
    companyId: DEMO_IDS.companyId,
    connectionId: connection.connectionId
  });
  assert.equal(summary.contractTestGreen, true);
  assert.equal(summary.lastContractResultStatus, "passed");
  assert.equal(summary.latestHealthCheck.healthCheckId, healthCheck.healthCheckId);
  assert.equal(summary.lastSuccessfulOperationAt, executed.updatedAt);
});

test("Phase 16.3 connection-aware jobs expose adapter dead-letter and replay state", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T10:10:00Z"),
    partnerContractTestExecutors: createPassingPartnerContractTestExecutors()
  });

  const connection = platform.createPartnerConnection({
    companyId: DEMO_IDS.companyId,
    connectionType: "bank",
    providerCode: "enable_banking",
    displayName: "Bank sandbox adapter",
    mode: "sandbox",
    rateLimitPerMinute: 1,
    fallbackMode: "queue_retry",
    credentialsRef: "secret://bank",
    actorId: "phase16-3-unit"
  });

  await platform.dispatchPartnerOperation({
    companyId: DEMO_IDS.companyId,
    connectionId: connection.connectionId,
    operationCode: "statement_sync",
    operationKey: "phase16-3:bank:1",
    payload: { cursor: "cursor-1" },
    actorId: "phase16-3-unit"
  });
  const rateLimited = await platform.dispatchPartnerOperation({
    companyId: DEMO_IDS.companyId,
    connectionId: connection.connectionId,
    operationCode: "statement_sync",
    operationKey: "phase16-3:bank:2",
    payload: { cursor: "cursor-2" },
    actorId: "phase16-3-unit"
  });
  assert.equal(rateLimited.status, "rate_limited");

  const failedJob = platform.failAsyncJobAttempt({
    companyId: DEMO_IDS.companyId,
    jobId: rateLimited.jobId,
    errorClass: "persistent_technical",
    errorMessage: "schema drift",
    replayAllowed: true
  });
  assert.equal(failedJob.status, "dead_lettered");

  const jobs = platform.listAsyncJobs({
    companyId: DEMO_IDS.companyId,
    connectionId: connection.connectionId
  });
  assert.equal(jobs.every((job) => job.connectionId === connection.connectionId), true);

  const deadLetters = platform.listAsyncDeadLetters({
    companyId: DEMO_IDS.companyId,
    connectionId: connection.connectionId
  });
  assert.equal(deadLetters.length, 1);
  assert.equal(deadLetters[0].job.connectionId, connection.connectionId);

  platform.planJobReplay({
    companyId: DEMO_IDS.companyId,
    jobId: rateLimited.jobId,
    actorId: "phase16-3-unit",
    approvedByActorId: DEMO_IDS.userId
  });
  const summary = platform.getPartnerHealthSummary({
    companyId: DEMO_IDS.companyId,
    connectionId: connection.connectionId
  });
  assert.equal(summary.deadLetterCount, 0);
  assert.equal(summary.replayPlannedCount, 1);
  assert.equal(summary.rateLimitedOperationCount >= 1, true);
});
