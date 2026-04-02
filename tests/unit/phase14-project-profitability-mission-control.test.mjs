import test from "node:test";
import assert from "node:assert/strict";
import { createProjectsPlatform } from "../../packages/domain-projects/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 14.3 materializes profitability mission control across finance buckets, blockers and risks", () => {
  const { projectsPlatform, project } = createMissionControlFixture();

  const firstSnapshot = projectsPlatform.materializeProjectProfitabilityMissionControlSnapshot({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-05-20",
    actorId: "unit-test"
  });
  assert.equal(firstSnapshot.revenueSummary.approvedValueAmount, 25000);
  assert.equal(firstSnapshot.revenueSummary.invoiceReadyAmount, 25000);
  assert.equal(firstSnapshot.revenueSummary.billedRevenueAmount, 15000);
  assert.equal(firstSnapshot.revenueSummary.recognizedRevenueAmount, 26500);
  assert.equal(firstSnapshot.revenueSummary.wipAmount, 10000);
  assert.equal(firstSnapshot.revenueSummary.deferredRevenueAmount, 0);
  assert.equal(firstSnapshot.sourceAmountSummary.payrollAmount, 14442);
  assert.equal(firstSnapshot.sourceAmountSummary.travelAmount, 1850);
  assert.equal(firstSnapshot.sourceAmountSummary.materialAmount, 4000);
  assert.equal(firstSnapshot.sourceAmountSummary.overheadAmount, 900);
  assert.equal(firstSnapshot.sourceAmountSummary.husAdjustmentAmount, 1000);
  assert.equal(firstSnapshot.sourceAmountSummary.manualRevenueAdjustmentAmount, 500);
  assert.equal(firstSnapshot.sourceAmountSummary.manualCostAdjustmentAmount, 250);
  assert.equal(firstSnapshot.costBreakdown.salaryAmount, 10000);
  assert.equal(firstSnapshot.costBreakdown.benefitAmount, 600);
  assert.equal(firstSnapshot.costBreakdown.pensionAmount, 700);
  assert.equal(firstSnapshot.costBreakdown.travelAmount, 1850);
  assert.equal(firstSnapshot.costBreakdown.employerContributionAmount, 3142);
  assert.equal(firstSnapshot.costBreakdown.materialAmount, 4000);
  assert.equal(firstSnapshot.costBreakdown.overheadAmount, 900);
  assert.equal(firstSnapshot.sourceCounts.payRuns, 1);
  assert.equal(firstSnapshot.sourceCounts.payRunLines, 4);
  assert.equal(firstSnapshot.sourceCounts.invoices, 1);
  assert.equal(firstSnapshot.sourceCounts.supplierInvoices, 1);
  assert.equal(firstSnapshot.sourceCounts.husCases, 1);
  assert.equal(firstSnapshot.blockerCodes.includes("CUSTOMER_SIGNOFF_PENDING"), true);
  assert.equal(firstSnapshot.reviewCodes.includes("profitability_adjustment_pending_review"), true);
  assert.equal(firstSnapshot.reviewCodes.includes("project_risk_attention_required"), true);
  assert.equal(firstSnapshot.reviewCodes.includes("ap_costs_included"), true);
  assert.equal(firstSnapshot.healthCode, "red");
  assert.equal(firstSnapshot.atRiskFlag, true);
  assert.equal(firstSnapshot.atRiskReason, "Customer signoff is delayed");
  assert.equal(firstSnapshot.riskSummary.blockerCount, 1);
  assert.equal(firstSnapshot.riskSummary.criticalRiskCount, 1);
  assert.equal(firstSnapshot.riskSummary.overdueRiskCount, 1);

  const replaySnapshot = projectsPlatform.materializeProjectProfitabilityMissionControlSnapshot({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-05-20",
    actorId: "unit-test"
  });
  assert.equal(
    replaySnapshot.projectProfitabilityMissionControlSnapshotId,
    firstSnapshot.projectProfitabilityMissionControlSnapshotId
  );

  const listedSnapshots = projectsPlatform.listProjectProfitabilityMissionControlSnapshots({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    reportingPeriod: "202605"
  });
  assert.equal(listedSnapshots.length, 1);

  const workspace = projectsPlatform.getProjectWorkspace({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-05-20"
  });
  assert.equal(
    workspace.currentProjectProfitabilityMissionControlSnapshot.projectProfitabilityMissionControlSnapshotId,
    firstSnapshot.projectProfitabilityMissionControlSnapshotId
  );
  assert.equal(workspace.profitabilityMissionControlSnapshotCount, 1);
  assert.equal(workspace.warningCodes.includes("profitability_mission_control_missing"), false);

  const evidenceBundle = projectsPlatform.exportProjectEvidenceBundle({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-05-20",
    actorId: "unit-test"
  });
  assert.equal(
    evidenceBundle.currentProjectProfitabilityMissionControlSnapshot.projectProfitabilityMissionControlSnapshotId,
    firstSnapshot.projectProfitabilityMissionControlSnapshotId
  );
  assert.equal(evidenceBundle.projectProfitabilityMissionControlSnapshots.length, 1);
});

function createMissionControlFixture() {
  let projectId = null;
  let projectReferenceCode = null;
  const arPlatform = {
    listInvoices() {
      if (!projectId) {
        return [];
      }
      return [
        {
          invoiceId: "mission-ar-1",
          status: "issued",
          issueDate: "2026-05-10",
          lines: [
            {
              invoiceLineId: "mission-ar-line-1",
              projectId,
              lineAmount: 15000
            }
          ]
        }
      ];
    }
  };
  const apPlatform = {
    listSupplierInvoices() {
      if (!projectId) {
        return [];
      }
      return [
        {
          supplierInvoiceId: "mission-ap-1",
          status: "posted",
          invoiceType: "invoice",
          invoiceDate: "2026-05-08",
          lines: [
            {
              supplierInvoiceLineId: "mission-ap-line-1",
              netAmount: 1500,
              expenseAccountNumber: "5800",
              dimensionsJson: { projectId }
            },
            {
              supplierInvoiceLineId: "mission-ap-line-2",
              netAmount: 4000,
              expenseAccountNumber: "4010",
              dimensionsJson: { projectId: projectReferenceCode }
            },
            {
              supplierInvoiceLineId: "mission-ap-line-3",
              netAmount: 900,
              expenseAccountNumber: "6991",
              dimensionsJson: { projectId }
            }
          ]
        }
      ];
    }
  };
  const payrollPlatform = {
    listPayRuns() {
      if (!projectId) {
        return [];
      }
      return [
        {
          payRunId: "mission-payrun-1",
          reportingPeriod: "202605",
          payDate: "2026-05-15",
          status: "approved",
          lines: [
            {
              payRunLineId: "mission-payrun-line-1",
              employmentId: "employment-1",
              amount: 10000,
              payItemCode: "SALARY",
              sourceType: "payroll_line",
              dimensionJson: { projectId },
              reportingOnly: false,
              compensationBucket: "cash_salary",
              employerContributionTreatmentCode: "included"
            },
            {
              payRunLineId: "mission-payrun-line-2",
              employmentId: "employment-1",
              amount: 600,
              payItemCode: "CAR_BENEFIT",
              sourceType: "benefit_event",
              dimensionJson: { projectId },
              reportingOnly: false,
              compensationBucket: "benefit",
              employerContributionTreatmentCode: "included"
            },
            {
              payRunLineId: "mission-payrun-line-3",
              employmentId: "employment-1",
              amount: 700,
              payItemCode: "PENSION_PREMIUM",
              sourceType: "payroll_line",
              dimensionJson: { projectId },
              reportingOnly: true,
              compensationBucket: "pension",
              employerContributionTreatmentCode: "excluded"
            },
            {
              payRunLineId: "mission-payrun-line-4",
              employmentId: "employment-1",
              amount: 350,
              payItemCode: "TRAVEL_ALLOWANCE",
              sourceType: "travel_claim",
              dimensionJson: { projectId },
              reportingOnly: false,
              compensationBucket: "expense",
              employerContributionTreatmentCode: "excluded"
            }
          ],
          payslips: [
            {
              payslipId: "mission-payslip-1",
              employmentId: "employment-1",
              totals: {
                employerContributionPreviewAmount: 3142
              }
            }
          ]
        }
      ];
    }
  };
  const husPlatform = {
    listHusCases() {
      if (!projectId) {
        return [];
      }
      return [
        {
          husCaseId: "mission-hus-1",
          projectId,
          payouts: [{ payoutDate: "2026-05-09", payoutAmount: 1200 }],
          recoveries: [{ recoveryDate: "2026-05-11", recoveryAmount: 200 }]
        }
      ];
    }
  };
  const evidencePlatform = {
    createFrozenEvidenceBundleSnapshot({ sourceObjectId }) {
      return {
        evidenceBundleId: `bundle-${sourceObjectId}`,
        checksum: `checksum-${sourceObjectId}`,
        status: "frozen",
        frozenAt: "2026-05-20T09:00:00.000Z",
        archivedAt: null
      };
    }
  };
  const projectsPlatform = createProjectsPlatform({
    clock: () => new Date("2026-05-20T09:00:00Z"),
    seedDemo: false,
    arPlatform,
    apPlatform,
    payrollPlatform,
    husPlatform,
    evidencePlatform
  });

  const project = projectsPlatform.createProject({
    companyId: COMPANY_ID,
    projectCode: "P-14-3-MC",
    projectReferenceCode: "phase14-mission-control",
    displayName: "Phase 14.3 mission control project",
    startsOn: "2026-05-01",
    status: "active",
    billingModelCode: "retainer_capacity",
    revenueRecognitionModelCode: "over_time",
    contractValueAmount: 25000,
    actorId: "unit-test"
  });
  projectId = project.projectId;
  projectReferenceCode = project.projectReferenceCode;

  projectsPlatform.createProjectAgreement({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    agreementNo: "AGR-MC-143",
    title: "Mission control agreement",
    status: "signed",
    commercialModelCode: "project_core_generic",
    billingModelCode: "retainer_capacity",
    revenueRecognitionModelCode: "over_time",
    signedOn: "2026-05-01",
    effectiveFrom: "2026-05-01",
    contractValueAmount: 25000,
    actorId: "unit-test"
  });
  const revenuePlan = projectsPlatform.createProjectRevenuePlan({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    versionLabel: "baseline",
    lines: [
      {
        recognitionDate: "2026-05-10",
        triggerTypeCode: "manual",
        amount: 25000,
        note: "mission-control baseline"
      }
    ],
    actorId: "unit-test"
  });
  projectsPlatform.approveProjectRevenuePlan({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectRevenuePlanId: revenuePlan.projectRevenuePlanId,
    actorId: "unit-test"
  });
  projectsPlatform.createProjectBillingPlan({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    frequencyCode: "monthly",
    triggerCode: "manual",
    startsOn: "2026-05-01",
    status: "active",
    lines: [
      {
        plannedInvoiceDate: "2026-05-10",
        amount: 25000,
        triggerCode: "manual",
        note: "mission-control baseline"
      }
    ],
    actorId: "unit-test"
  });

  const statusUpdate = projectsPlatform.createProjectStatusUpdate({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    statusDate: "2026-05-18",
    healthCode: "amber",
    progressPercent: 55,
    blockerCodes: ["customer_signoff_pending"],
    atRiskReason: "Customer signoff is delayed",
    note: "Weekly steering update",
    actorId: "unit-test"
  });

  const revenueAdjustment = projectsPlatform.createProjectProfitabilityAdjustment({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    impactCode: "revenue",
    amount: 500,
    effectiveDate: "2026-05-12",
    reasonCode: "upsell",
    actorId: "unit-test"
  });
  projectsPlatform.decideProjectProfitabilityAdjustment({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectProfitabilityAdjustmentId: revenueAdjustment.projectProfitabilityAdjustmentId,
    decision: "approved",
    actorId: "unit-test"
  });

  const costAdjustment = projectsPlatform.createProjectProfitabilityAdjustment({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    impactCode: "cost",
    amount: 250,
    effectiveDate: "2026-05-13",
    reasonCode: "subcontractor_trueup",
    actorId: "unit-test"
  });
  projectsPlatform.decideProjectProfitabilityAdjustment({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectProfitabilityAdjustmentId: costAdjustment.projectProfitabilityAdjustmentId,
    decision: "approved",
    actorId: "unit-test"
  });

  projectsPlatform.createProjectProfitabilityAdjustment({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    impactCode: "margin",
    amount: 100,
    effectiveDate: "2026-05-14",
    reasonCode: "manual_review",
    actorId: "unit-test"
  });

  projectsPlatform.createProjectRisk({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    title: "Customer signoff delay",
    description: "Final signoff has slipped past plan",
    categoryCode: "schedule",
    severityCode: "critical",
    probabilityCode: "high",
    mitigationPlan: "Escalate to sponsor",
    dueDate: "2026-05-19",
    sourceProjectStatusUpdateId: statusUpdate.projectStatusUpdateId,
    actorId: "unit-test"
  });

  return {
    projectsPlatform,
    project
  };
}
