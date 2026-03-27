import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";

test("Phase 3.3 observability runtime records structured logs, trace chains and invariant alarms", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-27T08:00:00Z")
  });

  const traceSpan = platform.startTraceSpan({
    companyId: DEMO_IDS.companyId,
    traceCode: "phase3.unit",
    traceId: "phase3-trace-unit",
    correlationId: "phase3-correlation-unit",
    sourceObjectType: "unit_test",
    sourceObjectId: "phase3-observability",
    actorId: DEMO_IDS.userId,
    attributes: {
      surfaceCode: "worker"
    }
  });
  platform.recordStructuredLog({
    companyId: DEMO_IDS.companyId,
    surfaceCode: "worker",
    severity: "warn",
    eventCode: "phase3.unit.warning",
    message: "Unit-level observability smoke event.",
    traceId: traceSpan.traceId,
    spanId: traceSpan.spanId,
    correlationId: "phase3-correlation-unit",
    sourceObjectType: "unit_test",
    sourceObjectId: "phase3-observability",
    actorId: DEMO_IDS.userId
  });
  platform.completeTraceSpan({
    spanId: traceSpan.spanId,
    outcomeCode: "completed"
  });

  const raisedAlarm = platform.synchronizeInvariantAlarm({
    companyId: DEMO_IDS.companyId,
    alarmCode: "provider_health_unhealthy",
    sourceObjectType: "partner_connection",
    sourceObjectId: "conn-unit-1",
    severity: "high",
    summary: "Unit provider degraded.",
    actorId: DEMO_IDS.userId,
    active: true
  });
  assert.equal(raisedAlarm.state, "open");
  assert.equal(raisedAlarm.occurrenceCount, 1);

  const logs = platform.listStructuredLogs({
    companyId: DEMO_IDS.companyId,
    limit: 10
  });
  assert.equal(logs.some((record) => record.eventCode === "phase3.unit.warning"), true);

  const traces = platform.listTraceChains({
    companyId: DEMO_IDS.companyId,
    limit: 10
  });
  const trace = traces.find((candidate) => candidate.traceId === "phase3-trace-unit");
  assert.ok(trace);
  assert.equal(trace.spanCount, 1);
  assert.equal(trace.logCount, 1);
  assert.equal(trace.status, "completed");

  const resolvedAlarm = platform.synchronizeInvariantAlarm({
    companyId: DEMO_IDS.companyId,
    alarmCode: "provider_health_unhealthy",
    sourceObjectType: "partner_connection",
    sourceObjectId: "conn-unit-1",
    actorId: DEMO_IDS.userId,
    active: false
  });
  assert.equal(resolvedAlarm.state, "resolved");

  const alarms = platform.listInvariantAlarms({
    companyId: DEMO_IDS.companyId,
    limit: 10
  });
  assert.equal(alarms.some((candidate) => candidate.invariantAlarmId === raisedAlarm.invariantAlarmId), true);
});
