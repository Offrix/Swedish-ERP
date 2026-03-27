import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_APPROVER_IDS,
  DEMO_IDS
} from "../../packages/domain-org-auth/src/index.mjs";
import {
  loginWithStrongAuthOnPlatform,
  loginWithTotpOnPlatform
} from "../helpers/platform-auth.mjs";

test("Phase 14.2 resilience records flag metadata, audit correlations and control-plane signals", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T20:00:00Z")
  });
  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  const releaseApprover = platform.createCompanyUser({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    email: "phase14-release-approver@example.test",
    displayName: "Phase 14 Release Approver",
    roleCode: "approver",
    requiresMfa: false
  });
  platform.createObjectGrant({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    companyUserId: releaseApprover.companyUserId,
    permissionCode: "company.manage",
    objectType: "resilience",
    objectId: DEMO_IDS.companyId
  });
  const releaseApproverToken = loginWithTotpOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: "phase14-release-approver@example.test"
  });
  platform.createObjectGrant({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    companyUserId: DEMO_APPROVER_IDS.companyUserId,
    permissionCode: "company.manage",
    objectType: "feature_flag",
    objectId: DEMO_IDS.companyId
  });

  const correlationId = "corr-phase14-feature-flag";
  assert.throws(
    () =>
      platform.upsertFeatureFlag({
        sessionToken: adminToken,
        companyId: DEMO_IDS.companyId,
        flagKey: "payments.kill_switch",
        description: "Stops outgoing payment exports.",
        flagType: "kill_switch",
        scopeType: "company",
        scopeRef: DEMO_IDS.companyId,
        defaultEnabled: false,
        enabled: true,
        ownerUserId: DEMO_IDS.userId,
        riskClass: "high",
        sunsetAt: "2026-12-31"
      }),
    (error) => error?.code === "feature_flag_approval_required"
  );
  const featureFlag = platform.upsertFeatureFlag({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    flagKey: "payments.kill_switch",
    description: "Stops outgoing payment exports.",
    flagType: "kill_switch",
    scopeType: "company",
    scopeRef: DEMO_IDS.companyId,
    defaultEnabled: false,
    enabled: true,
    ownerUserId: DEMO_IDS.userId,
    riskClass: "high",
    sunsetAt: "2026-12-31",
    changeReason: "Payment exports are entering staged rollout.",
    approvalActorIds: [DEMO_APPROVER_IDS.userId],
    correlationId
  });
  assert.equal(featureFlag.flagType, "kill_switch");
  assert.equal(featureFlag.ownerUserId, DEMO_IDS.userId);
  assert.equal(featureFlag.sunsetAt, "2026-12-31");
  assert.deepEqual(featureFlag.approvalActorIds, [DEMO_APPROVER_IDS.userId]);
  assert.equal(featureFlag.changeReason, "Payment exports are entering staged rollout.");

  platform.upsertFeatureFlag({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    flagKey: "payments.kill_switch",
    description: "Global default.",
    flagType: "kill_switch",
    scopeType: "global",
    defaultEnabled: false,
    enabled: false,
    ownerUserId: DEMO_IDS.userId,
    riskClass: "high",
    sunsetAt: "2026-12-31",
    changeReason: "Global default stays disabled until staged rollout is complete.",
    approvalActorIds: [DEMO_APPROVER_IDS.userId]
  });
  platform.upsertFeatureFlag({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    flagKey: "payments.kill_switch",
    description: "User override.",
    flagType: "kill_switch",
    scopeType: "company_user",
    scopeRef: DEMO_IDS.companyUserId,
    defaultEnabled: false,
    enabled: false,
    ownerUserId: DEMO_IDS.userId,
    riskClass: "high",
    sunsetAt: "2026-12-31",
    changeReason: "User override remains disabled for finance reviewer.",
    approvalActorIds: [DEMO_APPROVER_IDS.userId]
  });
  platform.upsertFeatureFlag({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    flagKey: "reports.legacy_export",
    description: "Legacy export path pending cleanup.",
    flagType: "ops",
    scopeType: "company",
    scopeRef: DEMO_IDS.companyId,
    defaultEnabled: false,
    enabled: true,
    ownerUserId: DEMO_IDS.userId,
    riskClass: "medium",
    sunsetAt: "2026-03-21",
    changeReason: "Cleanup validation for expired flags."
  });

  assert.equal(platform.resolveRuntimeFlags({ companyId: DEMO_IDS.companyId })[featureFlag.flagKey], true);
  assert.equal(platform.resolveRuntimeFlags({ companyId: DEMO_IDS.companyId, companyUserId: DEMO_IDS.companyUserId })[featureFlag.flagKey], false);
  assert.equal(platform.resolveRuntimeFlags({ companyId: DEMO_IDS.companyId }).reports?.legacy_export, undefined);
  assert.equal(platform.resolveRuntimeFlags({ companyId: DEMO_IDS.companyId })["reports.legacy_export"], false);
  assert.throws(
    () =>
      platform.requestEmergencyDisable({
        sessionToken: adminToken,
        companyId: DEMO_IDS.companyId,
        flagKey: featureFlag.flagKey,
        reasonCode: "incident_lockdown",
        expiresInMinutes: 30
      }),
    (error) => error?.code === "feature_flag_scope_required"
  );

  const disable = platform.requestEmergencyDisable({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    flagKey: featureFlag.flagKey,
    scopeType: "company",
    scopeRef: DEMO_IDS.companyId,
    reasonCode: "incident_lockdown",
    expiresInMinutes: 30,
    correlationId
  });
  assert.equal(disable.featureFlag.emergencyDisabled, true);
  assert.equal(platform.resolveRuntimeFlags({ companyId: DEMO_IDS.companyId })[featureFlag.flagKey], false);
  assert.throws(
    () =>
      platform.releaseEmergencyDisable({
        sessionToken: adminToken,
        companyId: DEMO_IDS.companyId,
        emergencyDisableId: disable.emergencyDisable.emergencyDisableId,
        verificationSummary: "Self release should be blocked for high-risk disable."
      }),
    (error) => error?.code === "emergency_disable_self_release_forbidden"
  );
  const releasedDisable = platform.releaseEmergencyDisable({
    sessionToken: releaseApproverToken,
    companyId: DEMO_IDS.companyId,
    emergencyDisableId: disable.emergencyDisable.emergencyDisableId,
    verificationSummary: "Queue health and payment adapter probes are green again."
  });
  assert.equal(releasedDisable.featureFlag.emergencyDisabled, false);
  assert.equal(releasedDisable.emergencyDisable.status, "released");
  assert.equal(platform.resolveRuntimeFlags({ companyId: DEMO_IDS.companyId })[featureFlag.flagKey], true);

  const loadProfile = platform.recordLoadProfile({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    profileCode: "pilot_target",
    targetThroughputPerMinute: 1200,
    observedP95Ms: 180,
    queueRecoverySeconds: 45,
    status: "passed",
    correlationId
  });
  const restoreDrill = platform.recordRestoreDrill({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    drillCode: "nightly_restore",
    targetRtoMinutes: 60,
    targetRpoMinutes: 15,
    actualRtoMinutes: 42,
    actualRpoMinutes: 10,
    status: "passed",
    evidence: { restorePoint: "snapshot://phase14-unit" },
    correlationId
  });
  const chaosScenario = platform.recordChaosScenario({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    scenarioCode: "worker_restart",
    failureMode: "worker_process_crash",
    queueRecoverySeconds: 35,
    impactSummary: "Recovered within target window.",
    status: "executed",
    evidence: { deadLetterBacklog: 0 },
    correlationId
  });

  const correlations = platform.listRuntimeAuditCorrelations({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId
  });
  const featureFlagCorrelation = platform.getRuntimeAuditCorrelation({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    correlationId
  });
  const featureFlagAudit = platform.listAuditTrail({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    correlationId
  }).find((entry) => entry.action === "resilience.feature_flag.upserted");
  const controlPlane = platform.getRuntimeControlPlaneSummary({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId
  });
  const incidentSignals = platform.listRuntimeIncidentSignals({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId
  });

  assert.equal(loadProfile.status, "passed");
  assert.equal(restoreDrill.actualRtoMinutes <= restoreDrill.targetRtoMinutes, true);
  assert.equal(chaosScenario.queueRecoverySeconds <= 35, true);
  assert.equal(correlations.length >= 1, true);
  assert.equal(featureFlagCorrelation.actionCount >= 3, true);
  assert.equal(featureFlagCorrelation.relatedEntities.some((entry) => entry.entityType === "feature_flag"), true);
  assert.deepEqual(featureFlagAudit.metadata.approvalActorIds, [DEMO_APPROVER_IDS.userId]);
  assert.equal(featureFlagAudit.metadata.changeReason, "Payment exports are entering staged rollout.");
  assert.equal(controlPlane.activeEmergencyDisableCount, 0);
  assert.equal(controlPlane.expiredFeatureFlagCount, 1);
  assert.equal(controlPlane.expiredFeatureFlags[0].flagKey, "reports.legacy_export");
  assert.equal(controlPlane.openIncidentSignalCount, 1);
  assert.equal(incidentSignals.some((signal) => signal.signalType === "emergency_disable_activated"), true);
});

test("Phase 14.2 resilience turns runtime job failures into signals, incidents and restore plans", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T21:00:00Z")
  });
  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  const restoreApprover = platform.createCompanyUser({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    email: "restore-approver@example.test",
    displayName: "Restore Approver",
    roleCode: "approver"
  });
  platform.createObjectGrant({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    companyUserId: restoreApprover.companyUserId,
    permissionCode: "company.manage",
    objectType: "resilience",
    objectId: DEMO_IDS.companyId
  });
  const approverToken = loginWithTotpOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: "restore-approver@example.test"
  });

  const job = await platform.enqueueRuntimeJob({
    companyId: DEMO_IDS.companyId,
    jobType: "system.noop",
    sourceObjectType: "runtime_check",
    sourceObjectId: "runtime-check-001",
    payload: { noop: true },
    metadata: { source: "unit-test" },
    riskClass: "high",
    actorId: DEMO_IDS.userId,
    correlationId: "corr-phase14-dead-letter"
  });
  const [claimedJob] = await platform.claimAvailableRuntimeJobs({
    workerId: "worker-test",
    limit: 1,
    claimTtlSeconds: 120
  });
  assert.equal(claimedJob.jobId, job.jobId);

  const started = await platform.startRuntimeJobAttempt({
    jobId: job.jobId,
    claimToken: claimedJob.claimToken,
    workerId: "worker-test"
  });
  const failed = await platform.failRuntimeJob({
    jobId: job.jobId,
    claimToken: claimedJob.claimToken,
    workerId: "worker-test",
    attemptId: started.attempt.jobAttemptId,
    errorClass: "persistent_technical",
    errorCode: "downstream_timeout",
    errorMessage: "Dead-letter the job for operator triage.",
    terminalReason: "worker_terminal_failure",
    replayAllowed: true
  });
  assert.equal(failed.job.status, "dead_lettered");

  const signals = platform.listRuntimeIncidentSignals({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    signalType: "async_job_dead_letter"
  });
  assert.equal(signals.length, 1);

  const acknowledgedSignal = platform.acknowledgeRuntimeIncidentSignal({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    incidentSignalId: signals[0].incidentSignalId,
    note: "Operator acknowledged runtime failure.",
    correlationId: "corr-phase14-ack"
  });
  assert.equal(acknowledgedSignal.state, "acknowledged");

  const openedIncident = platform.openRuntimeIncident({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    title: "Dead-lettered high-risk worker job",
    summary: "Replay and restore controls are required before the queue can be trusted again.",
    severity: "critical",
    sourceSignalId: signals[0].incidentSignalId,
    linkedCorrelationId: signals[0].correlationId,
    relatedObjectRefs: [{ objectType: "async_job_dead_letter", objectId: failed.deadLetter.deadLetterId }],
    correlationId: signals[0].correlationId
  });
  assert.equal(openedIncident.incident.status, "open");

  const restorePlan = platform.createRuntimeRestorePlan({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    incidentId: openedIncident.incident.incidentId,
    restoreScope: "jobs_and_queue",
    targetTimestamp: "2026-03-22T20:45:00Z",
    planSummary: "Restore queue metadata in isolation and replay only approved dead letters.",
    relatedObjectRefs: [{ objectType: "async_job", objectId: failed.job.jobId }],
    linkedCorrelationId: signals[0].correlationId,
    correlationId: signals[0].correlationId
  });
  assert.throws(
    () =>
      platform.approveRuntimeRestorePlan({
        sessionToken: adminToken,
        companyId: DEMO_IDS.companyId,
        restorePlanId: restorePlan.restorePlanId
      }),
    (error) => error?.code === "runtime_restore_plan_self_approval_forbidden"
  );

  const approvedRestorePlan = platform.approveRuntimeRestorePlan({
    sessionToken: approverToken,
    companyId: DEMO_IDS.companyId,
    restorePlanId: restorePlan.restorePlanId,
    correlationId: "corr-phase14-restore-approval"
  });
  const startedRestorePlan = platform.startRuntimeRestorePlan({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    restorePlanId: restorePlan.restorePlanId,
    correlationId: "corr-phase14-restore-start"
  });
  const completedRestorePlan = platform.completeRuntimeRestorePlan({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    restorePlanId: restorePlan.restorePlanId,
    verificationSummary: "Isolation restore verified, replay risk contained and queue health restored.",
    correlationId: "corr-phase14-restore-complete"
  });

  const incidentEvent = platform.recordRuntimeIncidentEvent({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    incidentId: openedIncident.incident.incidentId,
    eventType: "restore_completed",
    note: "Restore plan completed with verified queue consistency.",
    relatedObjectRefs: [{ objectType: "runtime_restore_plan", objectId: restorePlan.restorePlanId }],
    linkedCorrelationId: signals[0].correlationId,
    correlationId: signals[0].correlationId
  });
  const triagedIncident = platform.updateRuntimeIncidentStatus({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    incidentId: openedIncident.incident.incidentId,
    status: "triaged",
    note: "Queue outage triaged for runtime containment.",
    correlationId: signals[0].correlationId
  });
  const mitigatingIncident = platform.updateRuntimeIncidentStatus({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    incidentId: openedIncident.incident.incidentId,
    status: "mitigating",
    note: "Queue mitigation started.",
    correlationId: signals[0].correlationId
  });
  const stabilizedIncident = platform.updateRuntimeIncidentStatus({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    incidentId: openedIncident.incident.incidentId,
    status: "stabilized",
    note: "Queue stabilized after restore completion.",
    correlationId: signals[0].correlationId
  });
  const resolvedIncident = platform.updateRuntimeIncidentStatus({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    incidentId: openedIncident.incident.incidentId,
    status: "resolved",
    note: "Queue repaired and replay path validated.",
    correlationId: signals[0].correlationId
  });
  const runtimeControlPlane = platform.getRuntimeControlPlaneSummary({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId
  });
  assert.throws(
    () =>
      platform.updateRuntimeIncidentStatus({
        sessionToken: adminToken,
        companyId: DEMO_IDS.companyId,
        incidentId: openedIncident.incident.incidentId,
        status: "closed"
      }),
    (error) => error?.code === "runtime_incident_post_review_required"
  );
  const postReview = platform.recordRuntimeIncidentPostReview({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    incidentId: openedIncident.incident.incidentId,
    summary: "Queue outage reviewed after restore verification.",
    rootCauseSummary: "Transport lane entered persistent technical failure without immediate operator handoff.",
    correctiveActions: [
      {
        actionCode: "document_submission_triage",
        summary: "Document submission triage for dead-lettered authority transports.",
        ownerTeamId: "platform-ops"
      }
    ],
    preventiveActions: [
      {
        actionCode: "tighten_submission_sla",
        summary: "Promote lagging submission queues into explicit monitor scans.",
        ownerTeamId: "platform-ops"
      }
    ]
  });
  const closedIncident = platform.updateRuntimeIncidentStatus({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    incidentId: openedIncident.incident.incidentId,
    status: "closed",
    note: "Post-review completed and follow-up actions assigned.",
    correlationId: signals[0].correlationId
  });
  const correlation = platform.getRuntimeAuditCorrelation({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    correlationId: signals[0].correlationId
  });

  assert.equal(approvedRestorePlan.status, "approved");
  assert.equal(startedRestorePlan.status, "executing");
  assert.equal(completedRestorePlan.status, "completed");
  assert.equal(incidentEvent.event.eventType, "restore_completed");
  assert.equal(triagedIncident.incident.status, "triaged");
  assert.equal(mitigatingIncident.incident.status, "mitigating");
  assert.equal(stabilizedIncident.incident.status, "stabilized");
  assert.equal(resolvedIncident.incident.status, "resolved");
  assert.equal(postReview.incident.status, "post_review");
  assert.equal(postReview.postIncidentReview.status, "completed");
  assert.equal(closedIncident.incident.status, "closed");
  assert.equal(runtimeControlPlane.openIncidentCount, 0);
  assert.equal(runtimeControlPlane.pendingRestorePlanCount, 0);
  assert.equal(correlation.relatedEntities.some((entry) => entry.entityType === "incident_signal"), true);
  assert.equal(correlation.relatedEntities.some((entry) => entry.entityType === "runtime_incident"), true);
  assert.equal(correlation.relatedEntities.some((entry) => entry.entityType === "runtime_restore_plan"), true);
});
