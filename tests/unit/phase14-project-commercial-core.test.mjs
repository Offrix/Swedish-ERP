import test from "node:test";
import assert from "node:assert/strict";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";
import { createVatPlatform } from "../../packages/domain-vat/src/index.mjs";
import { createArPlatform } from "../../packages/domain-ar/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";
import { createEvidencePlatform } from "../../packages/domain-evidence/src/index.mjs";
import { createProjectsPlatform } from "../../packages/domain-projects/src/index.mjs";
import { buildTestCompanyProfile } from "../helpers/company-profiles.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const AR_TEST_PLATFORM_OPTIONS = {
  companyProfilesById: {
    [COMPANY_ID]: buildTestCompanyProfile(COMPANY_ID)
  }
};

test("Phase 14.1 project commercial core materializes engagement, revenue plan and profitability chain", () => {
  const { projectsPlatform, project } = createCommercialCoreFixture();

  for (const requiredWorkModelCode of [
    "time_only",
    "milestone_only",
    "retainer_capacity",
    "subscription_service",
    "service_order",
    "work_order",
    "construction_stage",
    "internal_delivery"
  ]) {
    assert.equal(
      projectsPlatform.projectWorkModelCodes.includes(requiredWorkModelCode),
      true,
      `${requiredWorkModelCode} should be supported by the general project-commercial core`
    );
  }

  const initialWorkspace = projectsPlatform.getProjectWorkspace({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-04-30"
  });
  assert.equal(initialWorkspace.warningCodes.includes("engagement_missing"), true);
  assert.equal(initialWorkspace.warningCodes.includes("work_model_missing"), true);
  assert.equal(initialWorkspace.warningCodes.includes("approved_revenue_plan_missing"), true);

  const engagement = projectsPlatform.createProjectEngagement({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    displayName: "Consulting engagement",
    workModelCode: "time_only",
    startsOn: "2026-04-01",
    actorId: "unit-test"
  });

  const workModel = projectsPlatform.createProjectWorkModel({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectEngagementId: engagement.projectEngagementId,
    modelCode: "time_only",
    title: "Consulting delivery model",
    actorId: "unit-test"
  });

  const workPackage = projectsPlatform.createProjectWorkPackage({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectEngagementId: engagement.projectEngagementId,
    projectWorkModelId: workModel.projectWorkModelId,
    title: "Discovery sprint",
    startsOn: "2026-04-01",
    endsOn: "2026-04-15",
    status: "active",
    actorId: "unit-test"
  });

  const milestone = projectsPlatform.createProjectDeliveryMilestone({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectWorkPackageId: workPackage.projectWorkPackageId,
    title: "Discovery accepted",
    targetDate: "2026-04-15",
    plannedRevenueAmount: 25000,
    actorId: "unit-test"
  });

  const workLog = projectsPlatform.recordProjectWorkLog({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectWorkPackageId: workPackage.projectWorkPackageId,
    projectDeliveryMilestoneId: milestone.projectDeliveryMilestoneId,
    workDate: "2026-04-10",
    minutes: 480,
    description: "Discovery workshop and customer summary",
    actorId: "unit-test"
  });
  assert.equal(workLog.status, "approved");

  const revenuePlan = projectsPlatform.createProjectRevenuePlan({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    versionLabel: "Baseline commercial plan",
    lines: [
      {
        recognitionDate: "2026-04-15",
        triggerTypeCode: "milestone_acceptance",
        amount: 25000,
        projectWorkPackageId: workPackage.projectWorkPackageId,
        projectDeliveryMilestoneId: milestone.projectDeliveryMilestoneId
      },
      {
        recognitionDate: "2026-04-30",
        triggerTypeCode: "manual",
        amount: 15000,
        projectWorkPackageId: workPackage.projectWorkPackageId
      }
    ],
    actorId: "unit-test"
  });
  const approvedRevenuePlan = projectsPlatform.approveProjectRevenuePlan({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectRevenuePlanId: revenuePlan.projectRevenuePlanId,
    actorId: "unit-test"
  });
  assert.equal(approvedRevenuePlan.status, "approved");

  const profitabilitySnapshot = projectsPlatform.materializeProjectProfitabilitySnapshot({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-04-30",
    actorId: "unit-test"
  });
  assert.equal(profitabilitySnapshot.approvedRevenuePlanId, approvedRevenuePlan.projectRevenuePlanId);
  assert.equal(profitabilitySnapshot.workPackageCount, 1);
  assert.equal(profitabilitySnapshot.deliveryMilestoneCount, 1);

  const workspace = projectsPlatform.getProjectWorkspace({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-04-30"
  });
  assert.equal(workspace.projectEngagements.length, 1);
  assert.equal(workspace.projectWorkModels.length, 1);
  assert.equal(workspace.projectWorkPackages.length, 1);
  assert.equal(workspace.projectDeliveryMilestones.length, 1);
  assert.equal(workspace.projectRevenuePlans.length, 1);
  assert.equal(workspace.currentProfitabilitySnapshotId, profitabilitySnapshot.projectProfitabilitySnapshotId);
  assert.equal(workspace.warningCodes.includes("engagement_missing"), false);
  assert.equal(workspace.warningCodes.includes("work_model_missing"), false);
  assert.equal(workspace.warningCodes.includes("approved_revenue_plan_missing"), false);
  assert.equal(
    workspace.complianceIndicatorStrip.some(
      (indicator) => indicator.indicatorCode === "commercial_core" && indicator.status === "ok" && indicator.count === 2
    ),
    true
  );

  const evidenceBundle = projectsPlatform.exportProjectEvidenceBundle({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-04-30",
    actorId: "unit-test"
  });
  assert.equal(evidenceBundle.projectEngagements.length, 1);
  assert.equal(evidenceBundle.projectWorkModels.length, 1);
  assert.equal(evidenceBundle.projectWorkPackages.length, 1);
  assert.equal(evidenceBundle.projectDeliveryMilestones.length, 1);
  assert.equal(evidenceBundle.projectRevenuePlans[0].status, "approved");
  assert.equal(
    evidenceBundle.currentProfitabilitySnapshot.projectProfitabilitySnapshotId,
    profitabilitySnapshot.projectProfitabilitySnapshotId
  );

  const auditActions = projectsPlatform
    .listProjectAuditEvents({
      companyId: COMPANY_ID,
      projectId: project.projectId
    })
    .map((event) => event.action);
  for (const requiredAction of [
    "project.engagement.created",
    "project.work_model.created",
    "project.work_package.created",
    "project.delivery_milestone.created",
    "project.work_log.recorded",
    "project.revenue_plan.created",
    "project.revenue_plan.approved",
    "project.profitability.materialized"
  ]) {
    assert.equal(auditActions.includes(requiredAction), true, `${requiredAction} should be audited`);
  }
});

function createCommercialCoreFixture() {
  const clock = () => new Date("2026-04-10T08:00:00Z");
  const hrPlatform = createHrPlatform({ clock });
  const timePlatform = createTimePlatform({ clock, hrPlatform });
  const ledgerPlatform = createLedgerPlatform({ clock });
  ledgerPlatform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "unit-test"
  });
  const vatPlatform = createVatPlatform({
    clock,
    bootstrapScenarioCode: "test_default_demo",
    ledgerPlatform
  });
  const arPlatform = createArPlatform({
    clock,
    vatPlatform,
    ledgerPlatform,
    ...AR_TEST_PLATFORM_OPTIONS
  });
  const payrollPlatform = createPayrollPlatform({
    clock,
    bootstrapScenarioCode: "test_default_demo",
    hrPlatform,
    timePlatform,
    ledgerPlatform
  });
  const evidencePlatform = createEvidencePlatform({ clock });
  const projectsPlatform = createProjectsPlatform({
    clock,
    seedDemo: false,
    hrPlatform,
    timePlatform,
    arPlatform,
    payrollPlatform,
    evidencePlatform
  });
  const project = projectsPlatform.createProject({
    companyId: COMPANY_ID,
    projectCode: "P-14-1-UNIT",
    projectReferenceCode: "phase14-unit-core",
    displayName: "Phase 14.1 unit project",
    startsOn: "2026-04-01",
    status: "active",
    billingModelCode: "fixed_price",
    revenueRecognitionModelCode: "over_time",
    contractValueAmount: 40000,
    actorId: "unit-test"
  });
  return {
    projectsPlatform,
    project
  };
}
