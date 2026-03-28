import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 15.5 mission control exposes project, close, payroll, cutover and trial dashboards", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T09:30:00Z")
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
    const preparer = platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "phase15-close-preparer@example.test",
      displayName: "Phase 15 Close Preparer",
      roleCode: "bureau_user",
      requiresMfa: false
    });
    const preparerToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: preparer.user.email
    });
    platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "phase15-field@example.test",
      displayName: "Phase 15 Field User",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase15-field@example.test"
    });

    seedProjectPortfolio(platform);
    seedPayrollSubmission(platform);
    seedCutoverControl(platform, adminToken);
    seedTrialConversion(platform, adminToken);
    seedFinanceClose(platform, adminToken, preparerToken, preparer.companyUserId);

    const forbidden = await requestJson(
      baseUrl,
      `/v1/mission-control/dashboards?companyId=${DEMO_IDS.companyId}&bureauOrgId=${DEMO_IDS.companyId}`,
      {
        token: fieldToken,
        expectedStatus: 403
      }
    );
    assert.equal(forbidden.error, "desktop_surface_role_forbidden");

    const list = await requestJson(
      baseUrl,
      `/v1/mission-control/dashboards?companyId=${DEMO_IDS.companyId}&bureauOrgId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );
    assert.deepEqual(
      list.items.map((item) => item.dashboardCode),
      ["project_portfolio", "finance_close", "payroll_submission", "cutover_control", "trial_conversion"]
    );

    const projectDashboard = await requestJson(
      baseUrl,
      `/v1/mission-control/dashboards/project_portfolio?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );
    assert.equal(projectDashboard.counters.totalProjects >= 1, true);
    assert.equal(projectDashboard.counters.atRiskProjects >= 1, true);
    assert.equal(projectDashboard.rows.some((row) => row.statusCode === "critical"), true);

    const closeDashboard = await requestJson(
      baseUrl,
      `/v1/mission-control/dashboards/finance_close?companyId=${DEMO_IDS.companyId}&bureauOrgId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );
    assert.equal(closeDashboard.counters.totalChecklists >= 1, true);
    assert.equal(closeDashboard.rows.some((row) => row.openHardStopBlockerCount > 0), true);

    const payrollDashboard = await requestJson(
      baseUrl,
      `/v1/mission-control/dashboards/payroll_submission?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );
    assert.equal(payrollDashboard.counters.totalSubmissions >= 1, true);
    assert.equal(payrollDashboard.rows.some((row) => row.authoritySubmissionId != null), true);

    const cutoverDashboard = await requestJson(
      baseUrl,
      `/v1/mission-control/dashboards/cutover_control?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );
    assert.equal(cutoverDashboard.counters.totalPlans >= 1, true);
    assert.equal(cutoverDashboard.rows.some((row) => row.validationGateStatus === "pending"), true);

    const trialDashboard = await requestJson(
      baseUrl,
      `/v1/mission-control/dashboards/trial_conversion?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );
    assert.equal(trialDashboard.counters.activeTrials >= 1, true);
    assert.equal(trialDashboard.rows.some((row) => row.promotionStatus != null), true);
    assert.equal(trialDashboard.rows.some((row) => row.parallelRunStatus != null), true);
  } finally {
    await stopServer(server);
  }
});

function seedProjectPortfolio(platform) {
  const project = platform.createProject({
    companyId: DEMO_IDS.companyId,
    projectCode: "P-MC-155",
    projectReferenceCode: "mission-control-155",
    displayName: "Mission control portfolio project",
    startsOn: "2026-03-01",
    status: "active",
    billingModelCode: "retainer_capacity",
    revenueRecognitionModelCode: "over_time",
    contractValueAmount: 175000,
    actorId: "phase15-mission-control"
  });
  platform.createProjectStatusUpdate({
    companyId: DEMO_IDS.companyId,
    projectId: project.projectId,
    statusDate: "2026-03-20",
    healthCode: "amber",
    progressPercent: 48,
    blockerCodes: ["client_dependency_pending"],
    atRiskReason: "Client dependency is still open.",
    actorId: "phase15-mission-control"
  });
  platform.createProjectRisk({
    companyId: DEMO_IDS.companyId,
    projectId: project.projectId,
    title: "Delivery dependency at risk",
    categoryCode: "delivery",
    severityCode: "critical",
    probabilityCode: "high",
    mitigationPlan: "Escalate with steering group",
    dueDate: "2026-03-25",
    actorId: "phase15-mission-control"
  });
}

function seedPayrollSubmission(platform) {
  const agiSubmission = platform.createAgiSubmission({
    companyId: DEMO_IDS.companyId,
    reportingPeriod: "202603",
    actorId: "phase15-mission-control"
  });
  const authoritySubmission = platform.prepareAuthoritySubmission({
    companyId: DEMO_IDS.companyId,
    submissionType: "agi_monthly",
    sourceObjectType: "agi_submission",
    sourceObjectId: agiSubmission.agiSubmissionId,
    payloadVersion: "phase15.5",
    providerKey: "skatteverket",
    recipientId: "skatteverket:agi",
    payload: {
      sourceObjectVersion: agiSubmission.currentVersion?.agiSubmissionVersionId || agiSubmission.reportingPeriod
    },
    actorId: "phase15-mission-control",
    signedState: "not_required"
  });
  platform.executeAuthoritySubmissionTransport({
    companyId: DEMO_IDS.companyId,
    submissionId: authoritySubmission.submissionId,
    actorId: "phase15-mission-control",
    mode: "trial"
  });
}

function seedCutoverControl(platform, adminToken) {
  const cutoverPlan = platform.createCutoverPlan({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    freezeAt: "2026-04-01T00:00:00Z",
    rollbackPointRef: "snapshot://phase15-mission-control",
    acceptedVarianceThresholds: {
      amountSek: 0
    },
    stabilizationWindowHours: 24,
    signoffChain: [
      {
        userId: DEMO_IDS.userId,
        roleCode: "cutover_owner",
        label: "Demo Admin"
      }
    ],
    goLiveChecklist: [
      {
        itemCode: "final_backup",
        label: "Final backup",
        required: true
      }
    ]
  });
  platform.createMigrationAcceptanceRecord({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    acceptanceType: "cutover_readiness",
    cutoverPlanId: cutoverPlan.cutoverPlanId,
    sourceParitySummary: {
      status: "matched",
      blockingDifferenceCount: 0,
      warningDifferenceCount: 0,
      openingBalanceParityPassed: true,
      openReceivablesParityPassed: true,
      openPayablesParityPassed: true,
      payrollYtdParityPassed: true,
      agiHistoryParityPassed: true,
      taxAccountParityPassed: true
    },
    signoffRefs: [
      {
        userId: DEMO_IDS.userId,
        roleCode: "cutover_owner",
        label: "Demo Admin",
        decidedAt: "2026-03-29T09:30:00Z",
        approvedAt: "2026-03-29T09:30:00Z"
      }
    ],
    rollbackPointRef: "snapshot://phase15-mission-control"
  });
}

function seedTrialConversion(platform, adminToken) {
  const trialEnvironment = platform.createTrialEnvironment({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    label: "Mission control trial"
  });
  platform.promoteTrialToLive({
    sessionToken: adminToken,
    trialEnvironmentProfileId: trialEnvironment.trialEnvironmentProfileId
  });
  platform.startParallelRun({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    trialEnvironmentProfileId: trialEnvironment.trialEnvironmentProfileId,
    runWindowDays: 14
  });
}

function seedFinanceClose(platform, adminToken, preparerToken, responsibleConsultantId) {
  const clientCompany = platform.createCompany({
    legalName: "Mission Control Close Client AB",
    orgNumber: "5599004315",
    settingsJson: {
      bureauDelivery: {
        closeLeadBusinessDays: 3,
        reportingLeadBusinessDays: 2,
        submissionLeadBusinessDays: 2,
        generalLeadBusinessDays: 1,
        approvalLeadBusinessDays: 2,
        reminderProfile: "standard"
      }
    }
  });
  platform.createPortfolioMembership({
    sessionToken: adminToken,
    bureauOrgId: DEMO_IDS.companyId,
    clientCompanyId: clientCompany.companyId,
    responsibleConsultantId,
    activeFrom: "2026-01-01"
  });
  const eligibilityAssessment = platform.assessCashMethodEligibility({
    companyId: clientCompany.companyId,
    annualNetTurnoverSek: 350000,
    legalFormCode: "AB",
    actorId: "phase15-mission-control"
  });
  const methodProfile = platform.createMethodProfile({
    companyId: clientCompany.companyId,
    methodCode: "FAKTURERINGSMETOD",
    effectiveFrom: "2026-01-01",
    fiscalYearStartDate: "2026-01-01",
    eligibilityAssessmentId: eligibilityAssessment.assessmentId,
    onboardingOverride: true,
    actorId: "phase15-mission-control"
  });
  platform.activateMethodProfile({
    companyId: clientCompany.companyId,
    methodProfileId: methodProfile.methodProfileId,
    actorId: "phase15-mission-control"
  });
  const fiscalYearProfile = platform.createFiscalYearProfile({
    companyId: clientCompany.companyId,
    legalFormCode: "AKTIEBOLAG",
    actorId: "phase15-mission-control"
  });
  const fiscalYear = platform.createFiscalYear({
    companyId: clientCompany.companyId,
    fiscalYearProfileId: fiscalYearProfile.fiscalYearProfileId,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    approvalBasisCode: "BASELINE",
    actorId: "phase15-mission-control"
  });
  platform.activateFiscalYear({
    companyId: clientCompany.companyId,
    fiscalYearId: fiscalYear.fiscalYearId,
    actorId: "phase15-mission-control"
  });
  platform.installLedgerCatalog({
    companyId: clientCompany.companyId,
    actorId: "phase15-mission-control"
  });
  const period = platform.ensureAccountingYearPeriod({
    companyId: clientCompany.companyId,
    fiscalYear: 2026,
    actorId: "phase15-mission-control"
  });
  const checklist = platform.instantiateCloseChecklist({
    sessionToken: preparerToken,
    bureauOrgId: DEMO_IDS.companyId,
    clientCompanyId: clientCompany.companyId,
    accountingPeriodId: period.accountingPeriodId,
    signoffChain: [
      { companyUserId: responsibleConsultantId, roleCode: "close_preparer" },
      { companyUserId: DEMO_IDS.companyUserId, roleCode: "close_signatory" }
    ]
  });
  platform.openCloseBlocker({
    sessionToken: preparerToken,
    bureauOrgId: DEMO_IDS.companyId,
    checklistId: checklist.checklistId,
    stepCode: "document_queue_review",
    severity: "hard_stop",
    reasonCode: "mission_control_attachment_gap",
    comment: "Mission control should show the open close blocker."
  });
}
