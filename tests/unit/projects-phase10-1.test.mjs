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
import { buildTestCompanyProfile } from "../helpers/company-profiles.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const AR_TEST_PLATFORM_OPTIONS = {
  companyProfilesById: {
    [COMPANY_ID]: buildTestCompanyProfile(COMPANY_ID)
  }
};
let employeeEmailCounter = 0;

test("Phase 10.1 combines salary, benefits, pension and travel into project actuals, WIP and forecast", () => {
  const {
    arPlatform,
    employee,
    employment,
    item,
    project,
    projectsPlatform,
    payrollPlatform
  } = createProjectsFixture();

  projectsPlatform.createProjectBudgetVersion({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    budgetName: "Baseline budget",
    validFrom: "2026-03-01",
    lines: [
      { lineKind: "cost", categoryCode: "labor", reportingPeriod: "202603", amount: 40000, employmentId: employment.employmentId },
      { lineKind: "revenue", categoryCode: "revenue", reportingPeriod: "202603", amount: 8000 },
      { lineKind: "cost", categoryCode: "labor", reportingPeriod: "202604", amount: 25000, employmentId: employment.employmentId },
      { lineKind: "revenue", categoryCode: "revenue", reportingPeriod: "202604", amount: 18000 }
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
    costRateAmount: 600,
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

  const invoice = arPlatform.createInvoice({
    companyId: COMPANY_ID,
    customerId: project.customerId,
    invoiceType: "standard",
    issueDate: "2026-03-20",
    dueDate: "2026-04-19",
    lines: [
      {
        itemId: item.arItemId,
        quantity: 1,
        unitPrice: 3000,
        projectId: project.projectId
      }
    ],
    actorId: "unit-test"
  });
  arPlatform.issueInvoice({
    companyId: COMPANY_ID,
    customerInvoiceId: invoice.customerInvoiceId,
    actorId: "unit-test"
  });

  const costSnapshot = projectsPlatform.materializeProjectCostSnapshot({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-03-31",
    actorId: "unit-test"
  });
  const payrollAllocations = projectsPlatform.listProjectPayrollCostAllocations({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectCostSnapshotId: costSnapshot.projectCostSnapshotId
  });
  const wipSnapshot = projectsPlatform.materializeProjectWipSnapshot({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-03-31",
    actorId: "unit-test"
  });
  const forecastSnapshot = projectsPlatform.materializeProjectForecastSnapshot({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-03-31",
    actorId: "unit-test"
  });

  assert.equal(costSnapshot.actualMinutes, 480);
  assert.equal(costSnapshot.billedRevenueAmount, 3000);
  assert.equal(costSnapshot.recognizedRevenueAmount, 3000);
  assert.equal(costSnapshot.costBreakdown.salaryAmount > 0, true);
  assert.equal(costSnapshot.costBreakdown.benefitAmount > 0, true);
  assert.equal(costSnapshot.costBreakdown.pensionAmount > 0, true);
  assert.equal(costSnapshot.costBreakdown.travelAmount > 0, true);
  assert.equal(costSnapshot.costBreakdown.employerContributionAmount > 0, true);
  assert.equal(costSnapshot.sourceCounts.payRuns, 1);
  assert.equal(costSnapshot.sourceCounts.payRunLines > 0, true);
  assert.equal(costSnapshot.sourceCounts.payrollAllocations, payrollAllocations.length);
  assert.equal(
    payrollAllocations.some((allocation) => allocation.costBucketCode === "employer_contribution"),
    true
  );
  assert.equal(
    payrollAllocations.some((allocation) => allocation.costBucketCode === "salary"),
    true
  );
  assert.equal(
    payrollAllocations.every((allocation) => allocation.projectCostSnapshotId === costSnapshot.projectCostSnapshotId),
    true
  );

  assert.equal(wipSnapshot.approvedValueAmount, 8000);
  assert.equal(wipSnapshot.billedAmount, 3000);
  assert.equal(wipSnapshot.wipAmount, 5000);
  assert.equal(wipSnapshot.deferredRevenueAmount, 0);
  assert.equal(wipSnapshot.status, "materialized");

  assert.equal(forecastSnapshot.remainingBudgetCostAmount, 25000);
  assert.equal(forecastSnapshot.remainingBudgetRevenueAmount, 18000);
  assert.equal(
    forecastSnapshot.forecastCostAtCompletionAmount,
    Number((costSnapshot.actualCostAmount + 25000).toFixed(2))
  );
  assert.equal(
    forecastSnapshot.forecastRevenueAtCompletionAmount,
    Number((costSnapshot.recognizedRevenueAmount + 18000).toFixed(2))
  );
  assert.equal(forecastSnapshot.resourceLoadPercent, 50);

  const auditEvents = projectsPlatform.listProjectAuditEvents({
    companyId: COMPANY_ID,
    projectId: project.projectId
  });
  const replaySnapshot = projectsPlatform.materializeProjectCostSnapshot({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-03-31",
    actorId: "unit-test"
  });
  const replayAllocations = projectsPlatform.listProjectPayrollCostAllocations({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectCostSnapshotId: replaySnapshot.projectCostSnapshotId
  });
  assert.equal(replaySnapshot.projectCostSnapshotId, costSnapshot.projectCostSnapshotId);
  assert.equal(replayAllocations.length, payrollAllocations.length);
  assert.equal(auditEvents.some((event) => event.action === "project.budget.approved"), true);
  assert.equal(auditEvents.some((event) => event.action === "project.cost_snapshot.materialized"), true);
  assert.equal(auditEvents.some((event) => event.action === "project.wip_snapshot.materialized"), true);
  assert.equal(auditEvents.some((event) => event.action === "project.forecast_snapshot.materialized"), true);
});

test("Phase 10.1 project payroll allocation keeps implicit time-share traceability", () => {
  const { employment, project, projectsPlatform, payrollPlatform, timePlatform } = createProjectsFixture();

  projectsPlatform.createProjectResourceAllocation({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    employmentId: employment.employmentId,
    reportingPeriod: "202603",
    plannedMinutes: 960,
    billableMinutes: 960,
    billRateAmount: 1000,
    costRateAmount: 600,
    actorId: "unit-test"
  });
  const payCalendar = payrollPlatform.listPayCalendars({ companyId: COMPANY_ID })[0];

  timePlatform.createTimeEntry({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    workDate: "2026-03-13",
    projectId: null,
    activityCode: "INTERNAL",
    workedMinutes: 480,
    actorId: "unit-test"
  });

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

  const costSnapshot = projectsPlatform.materializeProjectCostSnapshot({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-03-31",
    actorId: "unit-test"
  });
  const implicitAllocations = projectsPlatform
    .listProjectPayrollCostAllocations({
      companyId: COMPANY_ID,
      projectId: project.projectId,
      projectCostSnapshotId: costSnapshot.projectCostSnapshotId
    })
    .filter((allocation) => allocation.allocationBasisCode === "implicit_time_share");
  const allAllocations = projectsPlatform.listProjectPayrollCostAllocations({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectCostSnapshotId: costSnapshot.projectCostSnapshotId
  });

  assert.equal(implicitAllocations.length > 0, true);
  assert.equal(implicitAllocations.some((allocation) => allocation.allocationShare === 0.5), true);
  assert.equal(
    implicitAllocations.some(
      (allocation) => allocation.projectMinutes === 480 && allocation.totalMinutes === 960
    ),
    true
  );
  assert.equal(
    allAllocations.some(
      (allocation) =>
        allocation.costBucketCode === "employer_contribution" &&
        allocation.allocationBasisCode === "mixed_project_basis" &&
        allocation.allocationShare > 0.5 &&
        allocation.allocationShare < 0.51 &&
        allocation.sourceLineIds.length >= 2
    ),
    true
  );
});

function createProjectsFixture() {
  const fixedNow = new Date("2026-03-22T12:00:00Z");
  const hrPlatform = createHrPlatform({
    clock: () => fixedNow
  });
  const timePlatform = createTimePlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const benefitsPlatform = createBenefitsPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    hrPlatform
  });
  const travelPlatform = createTravelPlatform({
    clock: () => fixedNow,
    hrPlatform
  });
  const pensionPlatform = createPensionPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    hrPlatform
  });
  const ledgerPlatform = createLedgerPlatform({
    clock: () => fixedNow
  });
  ledgerPlatform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "unit-test"
  });
  ledgerPlatform.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "unit-test"
  });
  const vatPlatform = createVatPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    ledgerPlatform
  });
  const arPlatform = createArPlatform({
    clock: () => fixedNow,
    vatPlatform,
    ledgerPlatform,
    ...AR_TEST_PLATFORM_OPTIONS
  });
  const payrollPlatform = createPayrollPlatform({
    clock: () => fixedNow,
    bootstrapScenarioCode: "test_default_demo",
    hrPlatform,
    timePlatform,
    benefitsPlatform,
    travelPlatform,
    pensionPlatform,
    ledgerPlatform
  });
  const projectsPlatform = createProjectsPlatform({
    clock: () => fixedNow,
    seedDemo: false,
    arPlatform,
    hrPlatform,
    timePlatform,
    payrollPlatform
  });

  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Petra",
    familyName: "Project",
    workEmail: `petra.project.${String(++employeeEmailCounter).padStart(4, "0")}@example.com`,
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
    monthlySalary: 40000,
    actorId: "unit-test"
  });
  hrPlatform.addEmployeeBankAccount({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    payoutMethod: "domestic_account",
    accountHolderName: "Petra Project",
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
    legalName: "Project Customer AB",
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
  const item = arPlatform.createItem({
    companyId: COMPANY_ID,
    itemCode: "PROJECT-UNIT",
    description: "Project service",
    itemType: "service",
    unitCode: "hour",
    standardPrice: 1000,
    revenueAccountNumber: "3010",
    vatCode: "VAT_SE_DOMESTIC_25",
    projectBoundFlag: true,
    actorId: "unit-test"
  });

  const project = projectsPlatform.createProject({
    companyId: COMPANY_ID,
    projectCode: "P-UNIT",
    projectReferenceCode: "project-unit",
    displayName: "Project Unit",
    customerId: customer.customerId,
    projectManagerEmployeeId: employee.employeeId,
    startsOn: "2026-03-01",
    billingModelCode: "time_and_material",
    revenueRecognitionModelCode: "billing_equals_revenue",
    status: "active",
    contractValueAmount: 100000,
    actorId: "unit-test"
  });

  timePlatform.createTimeEntry({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    workDate: "2026-03-12",
    projectId: project.projectId,
    activityCode: "CONSULTING",
    workedMinutes: 480,
    actorId: "unit-test"
  });
  const projectBenefit = benefitsPlatform.createBenefitEvent({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    benefitCode: "HEALTH_INSURANCE",
    reportingPeriod: "202603",
    occurredOn: "2026-03-09",
    sourceId: "project-benefit-202603",
    sourcePayload: {
      insurancePremium: 1000
    },
    dimensionJson: {
      projectId: project.projectId
    },
    actorId: "unit-test"
  });
  benefitsPlatform.approveBenefitEvent({
    companyId: COMPANY_ID,
    benefitEventId: projectBenefit.benefitEventId,
    actorId: "unit-test"
  });
  travelPlatform.createTravelClaim({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    purpose: "Project site visit",
    startAt: "2026-03-10T08:15:00+01:00",
    endAt: "2026-03-11T20:30:00+01:00",
    homeLocation: "Uppsala",
    regularWorkLocation: "Uppsala",
    firstDestination: "Malmo",
    distanceFromHomeKm: 620,
    distanceFromRegularWorkKm: 620,
    requestedAllowanceAmount: 700,
    mealEvents: [
      {
        date: "2026-03-11",
        lunchProvided: true
      }
    ],
    expenseReceipts: [
      {
        date: "2026-03-10",
        expenseType: "parking",
        paymentMethod: "private_card",
        amount: 140,
        currencyCode: "SEK"
      }
    ],
    dimensionJson: {
      projectId: project.projectId
    },
    actorId: "unit-test"
  });
  pensionPlatform.createPensionEnrollment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    planCode: "ITP1",
    startsOn: "2025-01-01",
    contributionMode: "rate_percent",
    contributionRatePercent: 4.5,
    dimensionJson: {
      projectId: project.projectId
    },
    actorId: "unit-test"
  });

  return {
    arPlatform,
    employee,
    employment,
    item,
    project,
    projectsPlatform,
    payrollPlatform,
    timePlatform
  };
}
