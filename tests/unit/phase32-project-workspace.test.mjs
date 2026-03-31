import test from "node:test";
import assert from "node:assert/strict";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";
import { createBenefitsPlatform } from "../../packages/domain-benefits/src/index.mjs";
import { createTravelPlatform } from "../../packages/domain-travel/src/index.mjs";
import { createPensionPlatform } from "../../packages/domain-pension/src/index.mjs";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";
import { createVatPlatform } from "../../packages/domain-vat/src/index.mjs";
import { createArPlatform } from "../../packages/domain-ar/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";
import { createProjectsPlatform } from "../../packages/domain-projects/src/index.mjs";
import { createFieldPlatform } from "../../packages/domain-field/src/index.mjs";
import { createHusPlatform } from "../../packages/domain-hus/src/index.mjs";
import { createPersonalliggarePlatform } from "../../packages/domain-personalliggare/src/index.mjs";
import { createEgenkontrollPlatform } from "../../packages/domain-egenkontroll/src/index.mjs";
import { createKalkylPlatform } from "../../packages/domain-kalkyl/src/index.mjs";
import { buildTestCompanyProfile } from "../helpers/company-profiles.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const AR_TEST_PLATFORM_OPTIONS = {
  companyProfilesById: {
    [COMPANY_ID]: buildTestCompanyProfile(COMPANY_ID)
  }
};
let employeeEmailCounter = 0;

test("Step 32 project workspace aggregates field, HUS, personalliggare, egenkontroll and kalkyl signals", () => {
  const {
    employee,
    employment,
    project,
    projectsPlatform,
    payrollPlatform,
    fieldPlatform,
    husPlatform,
    personalliggarePlatform,
    egenkontrollPlatform,
    kalkylPlatform
  } = createProjectWorkspaceFixture();

  projectsPlatform.createProjectBudgetVersion({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    budgetName: "Workspace baseline",
    validFrom: "2026-03-01",
    lines: [
      {
        lineKind: "cost",
        categoryCode: "labor",
        reportingPeriod: "202603",
        amount: 42000,
        employmentId: employment.employmentId
      },
      {
        lineKind: "revenue",
        categoryCode: "revenue",
        reportingPeriod: "202603",
        amount: 90000
      }
    ],
    actorId: "unit-test"
  });

  projectsPlatform.createProjectResourceAllocation({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    employmentId: employment.employmentId,
    reportingPeriod: "202603",
    plannedMinutes: 960,
    billableMinutes: 960,
    billRateAmount: 1000,
    costRateAmount: 650,
    activityCode: "INSTALLATION",
    actorId: "unit-test"
  });
  const reservation = projectsPlatform.createProjectCapacityReservation({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    employmentId: employment.employmentId,
    roleCode: "project_consultant",
    skillCodes: ["installation"],
    startsOn: "2026-03-01",
    endsOn: "2026-03-31",
    reservedMinutes: 960,
    billableMinutes: 960,
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
    employmentId: employment.employmentId,
    projectCapacityReservationId: reservation.projectCapacityReservationId,
    roleCode: "project_consultant",
    skillCodes: ["installation"],
    startsOn: "2026-03-10",
    endsOn: "2026-03-25",
    plannedMinutes: 900,
    billableMinutes: 900,
    actorId: "unit-test"
  });
  projectsPlatform.transitionProjectAssignmentPlanStatus({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectAssignmentPlanId: assignmentPlan.projectAssignmentPlanId,
    nextStatus: "approved",
    actorId: "unit-test"
  });
  projectsPlatform.createProjectStatusUpdate({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    statusDate: "2026-03-21",
    healthCode: "amber",
    progressPercent: 55,
    blockerCodes: ["field_material_pending"],
    actorId: "unit-test"
  });
  projectsPlatform.createProjectRisk({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    title: "Field evidence may delay closure",
    categoryCode: "delivery",
    severityCode: "high",
    probabilityCode: "medium",
    ownerEmployeeId: employee.employeeId,
    mitigationPlan: "Daily sync with field team",
    dueDate: "2026-03-28",
    actorId: "unit-test"
  });

  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];
  const payRun = payrollPlatform.createPayRun({
    companyId: COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [employment.employmentId],
    actorId: "unit-test"
  });
  payrollPlatform.approvePayRun({
    companyId: COMPANY_ID,
    payRunId: payRun.payRunId,
    actorId: "unit-test"
  });

  projectsPlatform.materializeProjectCostSnapshot({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-03-31",
    actorId: "unit-test"
  });
  projectsPlatform.materializeProjectWipSnapshot({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-03-31",
    actorId: "unit-test"
  });
  projectsPlatform.materializeProjectForecastSnapshot({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-03-31",
    actorId: "unit-test"
  });

  const workOrder = fieldPlatform.createWorkOrder({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    displayName: "Workspace installation",
    description: "Operational workspace signal",
    serviceTypeCode: "service",
    priorityCode: "high",
    laborRateAmount: 950,
    actorId: "unit-test"
  });

  const husCase = husPlatform.createHusCase({
    companyId: COMPANY_ID,
    customerId: project.customerId,
    projectId: project.projectId,
    serviceTypeCode: "rot",
    workCompletedOn: "2026-03-18",
    housingFormCode: "smallhouse",
    propertyDesignation: "UPPSALA SUNNERSTA 1:24",
    serviceAddressLine1: "Projektgatan 10",
    postalCode: "75320",
    city: "Uppsala",
    executorFskattApproved: true,
    executorFskattValidatedOn: "2026-03-01",
    actorId: "unit-test"
  });
  husPlatform.classifyHusCase({
    companyId: COMPANY_ID,
    husCaseId: husCase.husCaseId,
    buyers: [
      {
        displayName: "Anna Andersson",
        personalIdentityNumber: "197501019991",
        allocationPercent: 100
      }
    ],
    serviceLines: [
      {
        description: "ROT labor and material",
        serviceTypeCode: "rot",
        workedHours: 8,
        laborCostAmount: 10000,
        materialAmount: 5000
      }
    ],
    actorId: "unit-test"
  });

  personalliggarePlatform.createConstructionSite({
    companyId: COMPANY_ID,
    siteCode: "SITE-32-UNIT-001",
    siteName: "Workspace site",
    siteAddress: "Projektgatan 10",
    builderOrgNo: "5561234567",
    estimatedTotalCostExVat: 250000,
    startDate: "2026-03-20",
    projectId: project.projectId,
    actorId: "unit-test"
  });

  const checklistTemplate = egenkontrollPlatform.createChecklistTemplate({
    companyId: COMPANY_ID,
    templateCode: "EK-32-UNIT",
    displayName: "Workspace checklist",
    sections: [
      {
        sectionCode: "install",
        label: "Installation",
        points: [
          {
            pointCode: "photo_marking",
            label: "Fotodokumentation",
            evidenceRequiredFlag: true
          }
        ]
      }
    ],
    requiredSignoffRoleCodes: ["site_lead"],
    actorId: "unit-test"
  });
  const activeTemplate = egenkontrollPlatform.activateChecklistTemplate({
    companyId: COMPANY_ID,
    checklistTemplateId: checklistTemplate.checklistTemplateId,
    actorId: "unit-test"
  });
  const checklistInstance = egenkontrollPlatform.createChecklistInstance({
    companyId: COMPANY_ID,
    checklistTemplateId: activeTemplate.checklistTemplateId,
    projectId: project.projectId,
    workOrderId: workOrder.workOrderId,
    assignedToUserId: "field-user-1",
    actorId: "unit-test"
  });
  egenkontrollPlatform.raiseChecklistDeviation({
    companyId: COMPANY_ID,
    checklistInstanceId: checklistInstance.checklistInstanceId,
    pointCode: "photo_marking",
    severityCode: "major",
    title: "Saknar foto",
    description: "Fältteamet laddade inte upp fotobevis.",
    actorId: "unit-test"
  });

  const estimate = kalkylPlatform.createEstimateVersion({
    companyId: COMPANY_ID,
    customerId: project.customerId,
    projectId: project.projectId,
    title: "Workspace estimate",
    validFrom: "2026-03-20",
    validTo: "2026-04-20",
    actorId: "unit-test"
  });
  kalkylPlatform.addEstimateLine({
    companyId: COMPANY_ID,
    estimateVersionId: estimate.estimateVersionId,
    lineTypeCode: "labor",
    description: "Installation labor",
    quantity: 16,
    unitCode: "hour",
    costAmount: 8000,
    salesAmount: 16000,
    projectPhaseCode: "INSTALL",
    actorId: "unit-test"
  });
  kalkylPlatform.reviewEstimateVersion({
    companyId: COMPANY_ID,
    estimateVersionId: estimate.estimateVersionId,
    actorId: "unit-test"
  });
  kalkylPlatform.approveEstimateVersion({
    companyId: COMPANY_ID,
    estimateVersionId: estimate.estimateVersionId,
    actorId: "unit-test"
  });

  const workspace = projectsPlatform.getProjectWorkspace({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-03-31"
  });

  assert.equal(workspace.openWorkOrderCount, 1);
  assert.equal(workspace.husCaseCount, 1);
  assert.equal(workspace.personalliggareAlertCount, 1);
  assert.equal(workspace.egenkontrollSummary.openDeviationCount, 1);
  assert.equal(workspace.kalkylSummary.estimateCount, 1);
  assert.equal(workspace.kalkylSummary.latestEstimateStatus, "approved");
  assert.equal(workspace.payrollActuals.actualCostAmount > 0, true);
  assert.equal(workspace.payrollActuals.payrollAllocationCount > 0, true);
  assert.equal(workspace.currentBudgetVersion !== null, true);
  assert.equal(workspace.currentCostSnapshot !== null, true);
  assert.equal(workspace.currentWipSnapshot !== null, true);
  assert.equal(workspace.currentForecastSnapshot !== null, true);
  assert.equal(workspace.capacityReservationCount, 1);
  assert.equal(workspace.assignmentPlanCount, 1);
  assert.equal(workspace.openProjectRiskCount, 1);
  assert.equal(workspace.currentPortfolioNode.atRiskFlag, true);
  assert.equal(workspace.resourceCapacitySummary.reservedMinutes, 960);
  assert.equal(workspace.projectDeviations.length, 0);
  assert.equal(workspace.warningCodes.includes("field_pending_signatures"), true);
  assert.equal(workspace.warningCodes.includes("personalliggare_attention_required"), true);
  assert.equal(workspace.warningCodes.includes("project_risk_attention_required"), true);
  assert.equal(workspace.warningCodes.includes("egenkontroll_open_deviations"), true);
  assert.equal(
    workspace.complianceIndicatorStrip.some(
      (indicator) => indicator.indicatorCode === "personalliggare" && indicator.status === "warning" && indicator.count === 1
    ),
    true
  );
  assert.equal(
    workspace.complianceIndicatorStrip.some(
      (indicator) => indicator.indicatorCode === "kalkyl" && indicator.status === "ok" && indicator.count === 1
    ),
    true
  );
});

test("Step 32 project deviation lifecycle supports assignment and close-out", () => {
  const { project, projectsPlatform } = createProjectWorkspaceFixture();

  const deviation = projectsPlatform.createProjectDeviation({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    deviationTypeCode: "safety",
    severityCode: "critical",
    title: "Open trench without barrier",
    description: "Barrier was missing during morning inspection.",
    sourceDomainCode: "field",
    sourceObjectId: "wo-32-001",
    actorId: "unit-test"
  });
  assert.equal(deviation.status, "open");

  const assigned = projectsPlatform.assignProjectDeviation({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectDeviationId: deviation.projectDeviationId,
    ownerUserId: "project-manager-1",
    actorId: "unit-test"
  });
  assert.equal(assigned.ownerUserId, "project-manager-1");

  const inProgress = projectsPlatform.transitionProjectDeviationStatus({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectDeviationId: deviation.projectDeviationId,
    nextStatus: "in_progress",
    actorId: "unit-test"
  });
  assert.equal(inProgress.status, "in_progress");

  const resolved = projectsPlatform.transitionProjectDeviationStatus({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectDeviationId: deviation.projectDeviationId,
    nextStatus: "resolved",
    resolutionNote: "Temporary barriers installed and checked by site lead.",
    actorId: "unit-test"
  });
  assert.equal(resolved.status, "resolved");
  assert.match(resolved.resolutionNote, /Temporary barriers installed/);

  const closed = projectsPlatform.transitionProjectDeviationStatus({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectDeviationId: deviation.projectDeviationId,
    nextStatus: "closed",
    resolutionNote: "Permanent fix verified and closed.",
    actorId: "unit-test"
  });
  assert.equal(closed.status, "closed");

  const listed = projectsPlatform.listProjectDeviations({
    companyId: COMPANY_ID,
    projectId: project.projectId
  });
  assert.equal(listed.length, 1);
  assert.equal(listed[0].status, "closed");
  assert.equal(listed[0].ownerUserId, "project-manager-1");

  const workspace = projectsPlatform.getProjectWorkspace({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-03-31"
  });
  assert.equal(workspace.openProjectDeviationCount, 0);
  assert.equal(workspace.projectDeviations.length, 0);
});

function createProjectWorkspaceFixture() {
  const fixedNow = new Date("2026-03-25T08:00:00Z");
  const clock = () => fixedNow;
  const hrPlatform = createHrPlatform({ clock });
  const timePlatform = createTimePlatform({ clock, hrPlatform });
  const benefitsPlatform = createBenefitsPlatform({
    clock,
    bootstrapScenarioCode: "test_default_demo",
    hrPlatform
  });
  const travelPlatform = createTravelPlatform({ clock, hrPlatform });
  const pensionPlatform = createPensionPlatform({
    clock,
    bootstrapScenarioCode: "test_default_demo",
    hrPlatform
  });
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
    benefitsPlatform,
    travelPlatform,
    pensionPlatform,
    ledgerPlatform
  });

  let fieldPlatform;
  let husPlatform;
  let personalliggarePlatform;
  let egenkontrollPlatform;
  let kalkylPlatform;

  const projectsPlatform = createProjectsPlatform({
    clock,
    seedDemo: false,
    arPlatform,
    hrPlatform,
    timePlatform,
    payrollPlatform,
    getFieldPlatform: () => fieldPlatform,
    getHusPlatform: () => husPlatform,
    getPersonalliggarePlatform: () => personalliggarePlatform,
    getEgenkontrollPlatform: () => egenkontrollPlatform,
    getKalkylPlatform: () => kalkylPlatform
  });
  fieldPlatform = createFieldPlatform({
    clock,
    seedDemo: false,
    arPlatform,
    hrPlatform,
    projectsPlatform
  });
  husPlatform = createHusPlatform({
    clock,
    arPlatform,
    projectsPlatform
  });
  personalliggarePlatform = createPersonalliggarePlatform({
    clock,
    hrPlatform,
    projectsPlatform
  });
  egenkontrollPlatform = createEgenkontrollPlatform({
    clock,
    projectsPlatform,
    fieldPlatform
  });
  kalkylPlatform = createKalkylPlatform({
    clock,
    arPlatform,
    projectsPlatform
  });

  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Petra",
    familyName: "Workspace",
    workEmail: `petra.workspace.${String(++employeeEmailCounter).padStart(4, "0")}@example.com`,
    actorId: "unit-test"
  });
  const employment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Project consultant",
    payModelCode: "monthly_salary",
    startDate: "2025-01-01",
    actorId: "unit-test"
  });
  hrPlatform.addEmploymentContract({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    validFrom: "2025-01-01",
    salaryModelCode: "monthly_salary",
    monthlySalary: 42000,
    actorId: "unit-test"
  });
  hrPlatform.addEmployeeBankAccount({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    payoutMethod: "domestic_account",
    accountHolderName: "Petra Workspace",
    clearingNumber: "5000",
    accountNumber: "1234567890",
    bankName: "Unit Test Bank",
    primaryAccount: true,
    actorId: "unit-test"
  });
  payrollPlatform.upsertEmploymentStatutoryProfile({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    taxMode: "manual_rate",
    manualRateReasonCode: "emergency_manual_transition",
    taxRatePercent: 30,
    contributionClassCode: "full",
    actorId: "unit-test"
  });

  const customer = arPlatform.createCustomer({
    companyId: COMPANY_ID,
    legalName: "Workspace Customer AB",
    organizationNumber: "5566778899",
    countryCode: "SE",
    languageCode: "SV",
    currencyCode: "SEK",
    paymentTermsCode: "NET30",
    invoiceDeliveryMethod: "pdf_email",
    reminderProfileCode: "standard",
    billingAddress: {
      line1: "Projektgatan 1",
      postalCode: "11157",
      city: "Stockholm",
      countryCode: "SE"
    },
    deliveryAddress: {
      line1: "Projektgatan 1",
      postalCode: "11157",
      city: "Stockholm",
      countryCode: "SE"
    },
    actorId: "unit-test"
  });

  const project = projectsPlatform.createProject({
    companyId: COMPANY_ID,
    projectCode: "P-WS-001",
    projectReferenceCode: "workspace-project",
    displayName: "Workspace Project",
    customerId: customer.customerId,
    projectManagerEmployeeId: employee.employeeId,
    startsOn: "2026-03-01",
    billingModelCode: "time_and_material",
    revenueRecognitionModelCode: "billing_equals_revenue",
    status: "active",
    contractValueAmount: 160000,
    actorId: "unit-test"
  });

  timePlatform.createTimeEntry({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    workDate: "2026-03-12",
    projectId: project.projectId,
    activityCode: "INSTALLATION",
    workedMinutes: 480,
    actorId: "unit-test"
  });

  return {
    employee,
    employment,
    project,
    projectsPlatform,
    payrollPlatform,
    fieldPlatform,
    husPlatform,
    personalliggarePlatform,
    egenkontrollPlatform,
    kalkylPlatform
  };
}
