import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { runWorkerBatch } from "../../apps/worker/src/worker.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 3.3 API exposes observability metrics, alarms, provider health, queue age, logs and traces", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-26T00:00:00Z")
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
      email: "phase3-field@example.test",
      displayName: "Phase 3 Field User",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase3-field@example.test"
    });

    const connection = platform.createPartnerConnection({
      companyId: DEMO_IDS.companyId,
      connectionType: "bank",
      providerCode: "enable_banking",
      displayName: "Enable Banking Primary",
      mode: "production",
      credentialsRef: "vault://production/bank/enable-banking",
      actorId: DEMO_IDS.userId
    });
    platform.setPartnerConnectionHealth({
      companyId: DEMO_IDS.companyId,
      connectionId: connection.connectionId,
      status: "outage"
    });

    platform.createReviewQueue({
      companyId: DEMO_IDS.companyId,
      queueCode: "OPS_OBSERVABILITY",
      label: "Ops observability",
      actorId: DEMO_IDS.userId
    });
    platform.createReviewItem({
      companyId: DEMO_IDS.companyId,
      queueCode: "OPS_OBSERVABILITY",
      reviewTypeCode: "OPS_CHECK",
      sourceDomainCode: "OPS",
      sourceObjectType: "runtime_check",
      sourceObjectId: "phase3-review-overdue",
      requiredDecisionType: "generic_review",
      title: "Phase 3 overdue ops review",
      summary: "Observability route should surface overdue review queues.",
      slaDueAt: "2026-03-25T10:00:00Z",
      actorId: DEMO_IDS.userId
    });

    await platform.enqueueRuntimeJob({
      companyId: DEMO_IDS.companyId,
      jobType: "system.noop",
      sourceObjectType: "observability_check",
      sourceObjectId: "phase3-job-processed",
      payload: {},
      actorId: DEMO_IDS.userId,
      correlationId: "phase3-worker-correlation"
    });
    await runWorkerBatch({
      platform,
      logger: () => {},
      batchSize: 1,
      workerId: "phase3-observability-worker"
    });
    await platform.enqueueRuntimeJob({
      companyId: DEMO_IDS.companyId,
      jobType: "system.noop",
      sourceObjectType: "observability_check",
      sourceObjectId: "phase3-job-lag",
      payload: {},
      actorId: DEMO_IDS.userId
    });

    const traceSpan = platform.startTraceSpan({
      companyId: DEMO_IDS.companyId,
      traceCode: "phase3.integration",
      traceId: "phase3-trace-api",
      correlationId: "phase3-correlation-api",
      sourceObjectType: "integration_test",
      sourceObjectId: "phase3-observability",
      actorId: DEMO_IDS.userId,
      attributes: {
        surfaceCode: "api"
      }
    });
    platform.recordStructuredLog({
      companyId: DEMO_IDS.companyId,
      surfaceCode: "api",
      severity: "warn",
      eventCode: "phase3.integration.warning",
      message: "Observability integration smoke event.",
      correlationId: "phase3-correlation-api",
      traceId: traceSpan.traceId,
      spanId: traceSpan.spanId,
      sourceObjectType: "integration_test",
      sourceObjectId: "phase3-observability",
      actorId: DEMO_IDS.userId
    });
    platform.completeTraceSpan({
      spanId: traceSpan.spanId,
      outcomeCode: "integration_completed"
    });

    const fieldDenied = await requestJson(baseUrl, `/v1/ops/observability?companyId=${DEMO_IDS.companyId}`, {
      token: fieldUserToken,
      expectedStatus: 403
    });
    assert.equal(fieldDenied.error, "backoffice_role_forbidden");

    const payload = await requestJson(
      baseUrl,
      `/v1/ops/observability?companyId=${DEMO_IDS.companyId}&asOf=2026-03-27T12:00:00Z&logLimit=25&traceLimit=10`,
      {
        token: adminToken
      }
    );

    assert.equal(payload.providerHealth.counters.outage, 1);
    assert.equal(payload.providerHealth.items.some((item) => item.connectionId === connection.connectionId), true);
    assert.equal(payload.projectionLag.items.length > 0, true);
    assert.equal(payload.queueAgeAlerts.some((item) => item.alertCode === "review_queue_overdue"), true);
    assert.equal(payload.queueAgeAlerts.some((item) => item.alertCode === "async_job_queue_lag"), true);
    assert.equal(payload.invariantAlarms.some((item) => item.alarmCode === "provider_health_unhealthy"), true);
    assert.equal(payload.structuredLogs.some((item) => item.eventCode === "phase3.integration.warning"), true);
    assert.equal(payload.structuredLogs.some((item) => item.eventCode === "worker.job.completed"), true);
    assert.equal(payload.traceChains.some((item) => item.traceId === "phase3-trace-api"), true);
    assert.equal(payload.traceChains.some((item) => item.traceCodes.includes("worker.job")), true);
    assert.equal(payload.metrics.openInvariantAlarmCount >= 1, true);
    assert.equal(payload.metrics.queueAgeAlertCount >= 2, true);
  } finally {
    await stopServer(server);
  }
});
