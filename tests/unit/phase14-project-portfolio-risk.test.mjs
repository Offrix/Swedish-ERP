import test from "node:test";
import assert from "node:assert/strict";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createArPlatform } from "../../packages/domain-ar/src/index.mjs";
import { createProjectsPlatform } from "../../packages/domain-projects/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
let employeeCounter = 0;

test("Phase 14.4 builds capacity, assignment, risk and portfolio views from canonical project objects", () => {
  const clock = () => new Date("2026-05-04T08:30:00Z");
  const hrPlatform = createHrPlatform({ clock, bootstrapMode: "none" });
  const arPlatform = createArPlatform({ clock, bootstrapMode: "none" });
  const projectsPlatform = createProjectsPlatform({
    clock,
    bootstrapMode: "none",
    hrPlatform,
    arPlatform
  });

  const employee = createEmployeeWithEmployment({ hrPlatform });
  const customer = arPlatform.createCustomer({
    companyId: COMPANY_ID,
    legalName: "Portfolio Customer AB",
    organizationNumber: "5566778811",
    countryCode: "SE",
    languageCode: "SV",
    currencyCode: "SEK",
    paymentTermsCode: "NET30",
    invoiceDeliveryMethod: "pdf_email",
    reminderProfileCode: "standard",
    billingAddress: {
      line1: "Portfolio street 1",
      postalCode: "11157",
      city: "Stockholm",
      countryCode: "SE"
    },
    deliveryAddress: {
      line1: "Portfolio street 1",
      postalCode: "11157",
      city: "Stockholm",
      countryCode: "SE"
    },
    actorId: "unit-test"
  });

  const project = projectsPlatform.createProject({
    companyId: COMPANY_ID,
    projectCode: "P-PORT-144",
    projectReferenceCode: "phase14-portfolio-144",
    displayName: "Phase 14.4 portfolio project",
    customerId: customer.customerId,
    projectManagerEmployeeId: employee.employee.employeeId,
    startsOn: "2026-05-01",
    status: "active",
    billingModelCode: "retainer_capacity",
    revenueRecognitionModelCode: "over_time",
    contractValueAmount: 180000,
    actorId: "unit-test"
  });

  projectsPlatform.createProjectBudgetVersion({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    budgetName: "Portfolio baseline",
    validFrom: "2026-05-01",
    lines: [
      { lineKind: "cost", categoryCode: "labor", reportingPeriod: "202605", amount: 85000, employmentId: employee.employment.employmentId },
      { lineKind: "revenue", categoryCode: "revenue", reportingPeriod: "202605", amount: 145000 }
    ],
    actorId: "unit-test"
  });

  projectsPlatform.createProjectResourceAllocation({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    employmentId: employee.employment.employmentId,
    reportingPeriod: "202605",
    plannedMinutes: 4800,
    billableMinutes: 4200,
    billRateAmount: 1250,
    costRateAmount: 700,
    activityCode: "CONSULTING",
    actorId: "unit-test"
  });

  projectsPlatform.materializeProjectForecastSnapshot({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-05-31",
    actorId: "unit-test"
  });

  const statusUpdate = projectsPlatform.createProjectStatusUpdate({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    statusDate: "2026-05-10",
    healthCode: "amber",
    progressPercent: 42,
    blockerCodes: ["customer_input_pending"],
    atRiskReason: "Timeline depends on delayed customer workshop",
    note: "Weekly steering update",
    actorId: "unit-test"
  });

  const reservation = projectsPlatform.createProjectCapacityReservation({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    employmentId: employee.employment.employmentId,
    roleCode: "solution_consultant",
    skillCodes: ["erp_delivery", "payroll"],
    startsOn: "2026-05-01",
    endsOn: "2026-05-31",
    reservedMinutes: 4800,
    billableMinutes: 4200,
    note: "Reserved for May delivery",
    actorId: "unit-test"
  });
  projectsPlatform.transitionProjectCapacityReservationStatus({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectCapacityReservationId: reservation.projectCapacityReservationId,
    nextStatus: "approved",
    actorId: "unit-test"
  });

  const assignmentPlan = projectsPlatform.createProjectAssignmentPlan({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    employmentId: employee.employment.employmentId,
    projectCapacityReservationId: reservation.projectCapacityReservationId,
    roleCode: "solution_consultant",
    skillCodes: ["erp_delivery", "payroll"],
    startsOn: "2026-05-05",
    endsOn: "2026-05-28",
    plannedMinutes: 4200,
    billableMinutes: 3900,
    deliveryModeCode: "hybrid",
    note: "Client delivery plan",
    actorId: "unit-test"
  });
  projectsPlatform.transitionProjectAssignmentPlanStatus({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectAssignmentPlanId: assignmentPlan.projectAssignmentPlanId,
    nextStatus: "approved",
    actorId: "unit-test"
  });
  projectsPlatform.transitionProjectAssignmentPlanStatus({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectAssignmentPlanId: assignmentPlan.projectAssignmentPlanId,
    nextStatus: "in_progress",
    actorId: "unit-test"
  });

  projectsPlatform.createProjectRisk({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    title: "Customer workshop may slip",
    description: "Decision workshop has not been confirmed",
    categoryCode: "schedule",
    severityCode: "critical",
    probabilityCode: "high",
    ownerEmployeeId: employee.employee.employeeId,
    mitigationPlan: "Escalate with sponsor and book backup slot",
    dueDate: "2026-05-12",
    sourceProjectStatusUpdateId: statusUpdate.projectStatusUpdateId,
    actorId: "unit-test"
  });

  const workspace = projectsPlatform.getProjectWorkspace({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-05-31"
  });

  assert.equal(workspace.capacityReservationCount, 1);
  assert.equal(workspace.assignmentPlanCount, 1);
  assert.equal(workspace.openProjectRiskCount, 1);
  assert.equal(workspace.criticalProjectRiskCount, 1);
  assert.equal(workspace.latestStatusUpdate.projectStatusUpdateId, statusUpdate.projectStatusUpdateId);
  assert.equal(workspace.resourceCapacitySummary.reservedMinutes, 4800);
  assert.equal(workspace.resourceCapacitySummary.assignedMinutes, 4200);
  assert.equal(workspace.budgetActualForecastSummary.budgetRevenueAmount, 145000);
  assert.equal(workspace.currentPortfolioNode.healthCode, "red");
  assert.equal(workspace.currentPortfolioNode.atRiskFlag, true);
  assert.equal(workspace.warningCodes.includes("project_risk_attention_required"), true);
  assert.equal(workspace.projectCapacityReservations.length, 1);
  assert.equal(workspace.projectAssignmentPlans.length, 1);
  assert.equal(workspace.projectRisks.length, 1);

  const nodes = projectsPlatform.listProjectPortfolioNodes({
    companyId: COMPANY_ID,
    cutoffDate: "2026-05-31"
  });
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].criticalRiskCount, 1);
  assert.equal(nodes[0].roleDemand[0].roleCode, "SOLUTION_CONSULTANT");
  assert.equal(nodes[0].skillDemand.some((item) => item.skillCode === "ERP_DELIVERY"), true);

  const summary = projectsPlatform.getProjectPortfolioSummary({
    companyId: COMPANY_ID,
    cutoffDate: "2026-05-31"
  });
  assert.equal(summary.totalProjectCount, 1);
  assert.equal(summary.atRiskProjectCount, 1);
  assert.equal(summary.totalCriticalRiskCount, 1);
  assert.equal(summary.totalReservedMinutes, 4800);
  assert.equal(summary.roleDemand[0].assignedMinutes, 4200);
});

function createEmployeeWithEmployment({ hrPlatform }) {
  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Porter",
    familyName: "Risk",
    workEmail: `phase14.portfolio.${String(++employeeCounter).padStart(4, "0")}@example.com`,
    actorId: "unit-test"
  });
  const employment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Solution consultant",
    payModelCode: "monthly_salary",
    startDate: "2026-01-01",
    actorId: "unit-test"
  });
  return { employee, employment };
}
