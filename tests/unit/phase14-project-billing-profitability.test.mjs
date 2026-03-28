import test from "node:test";
import assert from "node:assert/strict";
import { createProjectsPlatform } from "../../packages/domain-projects/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 14.3 profitability snapshots unify AP, HUS and manual adjustments with invoice readiness", () => {
  const { projectsPlatform, project } = createProjectProfitabilityFixture();

  const revenueAdjustment = projectsPlatform.createProjectProfitabilityAdjustment({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    impactCode: "revenue",
    amount: 1000,
    effectiveDate: "2026-04-10",
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
    amount: 500,
    effectiveDate: "2026-04-11",
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

  const pendingAdjustment = projectsPlatform.createProjectProfitabilityAdjustment({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    impactCode: "margin",
    amount: 250,
    effectiveDate: "2026-04-12",
    reasonCode: "manual_margin_review",
    actorId: "unit-test"
  });

  const costSnapshot = projectsPlatform.materializeProjectCostSnapshot({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-04-15",
    actorId: "unit-test"
  });
  assert.equal(costSnapshot.costBreakdown.materialAmount, 4000);
  assert.equal(costSnapshot.costBreakdown.subcontractorAmount, 2000);
  assert.equal(costSnapshot.actualCostAmount, 6500);
  assert.equal(costSnapshot.sourceCounts.supplierInvoices, 1);
  assert.equal(costSnapshot.sourceCounts.supplierInvoiceLines, 2);
  assert.equal(costSnapshot.sourceCounts.profitabilityAdjustments, 2);
  assert.equal(costSnapshot.sourceCounts.husCases, 1);

  const profitabilitySnapshot = projectsPlatform.materializeProjectProfitabilitySnapshot({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-04-15",
    actorId: "unit-test"
  });
  assert.equal(profitabilitySnapshot.recognizedRevenueAmount, 22000);
  assert.equal(profitabilitySnapshot.actualCostAmount, 6500);
  assert.equal(profitabilitySnapshot.currentMarginAmount, 15500);

  const readinessAssessment = projectsPlatform.materializeProjectInvoiceReadinessAssessment({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-04-15",
    actorId: "unit-test"
  });
  assert.equal(readinessAssessment.status, "review_required");
  assert.equal(readinessAssessment.reviewCodes.includes("profitability_adjustment_pending_review"), true);
  assert.equal(readinessAssessment.blockerCodes.length, 0);
  assert.equal(readinessAssessment.invoiceReadyAmount, 20000);

  const workspace = projectsPlatform.getProjectWorkspace({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-04-15"
  });
  assert.equal(workspace.currentInvoiceReadinessAssessment.status, "review_required");
  assert.equal(workspace.warningCodes.includes("invoice_readiness_review_required"), true);
  assert.equal(workspace.projectProfitabilityAdjustments.length, 3);
  assert.equal(workspace.projectInvoiceReadinessAssessments.length, 1);

  const evidenceBundle = projectsPlatform.exportProjectEvidenceBundle({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-04-15",
    actorId: "unit-test"
  });
  assert.equal(evidenceBundle.projectProfitabilityAdjustments.length, 3);
  assert.equal(evidenceBundle.projectInvoiceReadinessAssessments.length, 1);
  assert.equal(evidenceBundle.currentInvoiceReadinessAssessment.status, "review_required");
  assert.equal(
    evidenceBundle.projectProfitabilityAdjustments.some(
      (record) => record.projectProfitabilityAdjustmentId === pendingAdjustment.projectProfitabilityAdjustmentId
    ),
    true
  );
});

test("Phase 14.3 applied change orders supersede commercial chain and create hybrid billing", () => {
  const { projectsPlatform, project } = createProjectProfitabilityFixture({
    billingModelCode: "fixed_price",
    contractValueAmount: 100000,
    billingPlanAmount: 100000
  });

  const originalApprovedRevenuePlan = projectsPlatform
    .listProjectRevenuePlans({ companyId: COMPANY_ID, projectId: project.projectId, status: "approved" })
    .at(-1);
  const originalActiveBillingPlan = projectsPlatform
    .listProjectBillingPlans({ companyId: COMPANY_ID, projectId: project.projectId, status: "active" })
    .at(-1);

  const changeOrder = projectsPlatform.createProjectChangeOrder({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    scopeCode: "addition",
    title: "Expanded retainer scope",
    revenueImpactAmount: 3000,
    costImpactAmount: 1000,
    scheduleImpactMinutes: 240,
    customerApprovalRequiredFlag: true,
    actorId: "unit-test"
  });

  projectsPlatform.transitionProjectChangeOrderStatus({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectChangeOrderId: changeOrder.projectChangeOrderId,
    nextStatus: "priced",
    actorId: "unit-test"
  });
  projectsPlatform.transitionProjectChangeOrderStatus({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectChangeOrderId: changeOrder.projectChangeOrderId,
    nextStatus: "approved",
    customerApprovedAt: "2026-04-18",
    actorId: "unit-test"
  });
  const applied = projectsPlatform.transitionProjectChangeOrderStatus({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectChangeOrderId: changeOrder.projectChangeOrderId,
    nextStatus: "applied",
    effectiveDate: "2026-04-20",
    billingPlanFrequencyCode: "monthly",
    billingPlanTriggerCode: "change_order_approval",
    actorId: "unit-test"
  });

  assert.equal(applied.status, "applied");
  assert.ok(applied.appliedRevenuePlanId);
  assert.ok(applied.appliedBillingPlanId);

  const refreshedProject = projectsPlatform.getProject({
    companyId: COMPANY_ID,
    projectId: project.projectId
  });
  assert.equal(refreshedProject.billingModelCode, "hybrid_change_order");
  assert.equal(refreshedProject.contractValueAmount, 103000);

  const approvedRevenuePlans = projectsPlatform.listProjectRevenuePlans({
    companyId: COMPANY_ID,
    projectId: project.projectId
  });
  const activeBillingPlans = projectsPlatform.listProjectBillingPlans({
    companyId: COMPANY_ID,
    projectId: project.projectId
  });
  assert.equal(
    approvedRevenuePlans.some(
      (record) => record.projectRevenuePlanId === originalApprovedRevenuePlan.projectRevenuePlanId && record.status === "superseded"
    ),
    true
  );
  assert.equal(
    activeBillingPlans.some(
      (record) => record.projectBillingPlanId === originalActiveBillingPlan.projectBillingPlanId && record.status === "superseded"
    ),
    true
  );
  assert.equal(
    approvedRevenuePlans.some(
      (record) => record.projectRevenuePlanId === applied.appliedRevenuePlanId && record.status === "approved"
    ),
    true
  );
  assert.equal(
    activeBillingPlans.some(
      (record) => record.projectBillingPlanId === applied.appliedBillingPlanId && record.status === "active"
    ),
    true
  );

  const auditActions = projectsPlatform
    .listProjectAuditEvents({
      companyId: COMPANY_ID,
      projectId: project.projectId
    })
    .map((event) => event.action);
  assert.equal(auditActions.includes("project.change_order.approved"), true);
  assert.equal(auditActions.includes("project.change_order.applied"), true);
});

function createProjectProfitabilityFixture({
  billingModelCode = "retainer_capacity",
  contractValueAmount = 20000,
  billingPlanAmount = 20000
} = {}) {
  let projectId = null;
  let projectReferenceCode = null;
  const arPlatform = {
    listInvoices: () =>
      projectId
        ? [
            {
              invoiceId: "ar-invoice-1",
              status: "issued",
              issueDate: "2026-04-12",
              lines: [
                {
                  invoiceLineId: "ar-line-1",
                  projectId,
                  lineAmount: 5000
                }
              ]
            }
          ]
        : []
  };
  const apPlatform = {
    listSupplierInvoices: () =>
      projectId
        ? [
            {
              supplierInvoiceId: "ap-1",
              status: "posted",
              invoiceType: "invoice",
              invoiceDate: "2026-04-08",
              lines: [
                {
                  supplierInvoiceLineId: "ap-line-1",
                  netAmount: 4000,
                  expenseAccountNumber: "4010",
                  dimensionsJson: { projectId }
                },
                {
                  supplierInvoiceLineId: "ap-line-2",
                  netAmount: 2000,
                  expenseAccountNumber: "4420",
                  dimensionsJson: { projectId: projectReferenceCode }
                }
              ]
            }
          ]
        : []
  };
  const husPlatform = {
    listHusCases: () =>
      projectId
        ? [
            {
              husCaseId: "hus-1",
              projectId,
              payouts: [{ payoutDate: "2026-04-09", payoutAmount: 1200 }],
              recoveries: [{ recoveryDate: "2026-04-11", recoveryAmount: 200 }]
            }
          ]
        : []
  };
  const evidencePlatform = {
    createFrozenEvidenceBundleSnapshot({ sourceObjectId }) {
      return {
        evidenceBundleId: `bundle-${sourceObjectId}`,
        checksum: `checksum-${sourceObjectId}`,
        status: "frozen",
        frozenAt: "2026-04-15T09:00:00.000Z",
        archivedAt: null
      };
    }
  };
  const projectsPlatform = createProjectsPlatform({
    clock: () => new Date("2026-04-15T09:00:00Z"),
    seedDemo: false,
    arPlatform,
    apPlatform,
    husPlatform,
    evidencePlatform
  });

  const project = projectsPlatform.createProject({
    companyId: COMPANY_ID,
    projectCode: "P-14-3-UNIT",
    projectReferenceCode: "phase14-3-unit",
    displayName: "Phase 14.3 profitability project",
    startsOn: "2026-04-01",
    status: "active",
    billingModelCode,
    revenueRecognitionModelCode: "over_time",
    contractValueAmount,
    actorId: "unit-test"
  });
  projectId = project.projectId;
  projectReferenceCode = project.projectReferenceCode;

  const revenuePlan = projectsPlatform.createProjectRevenuePlan({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    versionLabel: "baseline",
    lines: [
      {
        recognitionDate: "2026-04-10",
        triggerTypeCode: "manual",
        amount: contractValueAmount,
        note: "baseline"
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
    startsOn: "2026-04-01",
    status: "active",
    lines: [
      {
        plannedInvoiceDate: "2026-04-10",
        amount: billingPlanAmount,
        triggerCode: "manual",
        note: "baseline"
      }
    ],
    actorId: "unit-test"
  });

  return {
    projectsPlatform,
    project
  };
}
