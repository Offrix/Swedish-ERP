import test from "node:test";
import assert from "node:assert/strict";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createBalancesPlatform } from "../../packages/domain-balances/src/index.mjs";
import { createCollectiveAgreementsPlatform } from "../../packages/domain-collective-agreements/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000020";

test("Step 20 builds a unified people and time base with approvals, balance sync and agreement overlay", () => {
  const hrPlatform = createHrPlatform({
    clock: () => new Date("2026-03-24T19:00:00Z"),
    seedDemo: false
  });
  const balancesPlatform = createBalancesPlatform({
    clock: () => new Date("2026-03-24T19:00:00Z"),
    seedDemo: false,
    hrPlatform
  });
  const collectiveAgreementsPlatform = createCollectiveAgreementsPlatform({
    clock: () => new Date("2026-03-24T19:00:00Z"),
    seedDemo: false,
    hrPlatform
  });
  const timePlatform = createTimePlatform({
    clock: () => new Date("2026-03-24T19:00:00Z"),
    hrPlatform,
    balancesPlatform,
    collectiveAgreementsPlatform
  });

  for (const balanceTypeCode of ["FLEX_MINUTES", "COMP_MINUTES", "OVERTIME_MINUTES"]) {
    balancesPlatform.createBalanceType({
      companyId: COMPANY_ID,
      balanceTypeCode,
      label: balanceTypeCode,
      unitCode: "minutes",
      negativeAllowed: true,
      carryForwardModeCode: "full",
      expiryModeCode: "none",
      actorId: "payroll-admin"
    });
  }

  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Tora",
    familyName: "Tid",
    actorId: "hr-admin"
  });
  const manager = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Mats",
    familyName: "Chef",
    actorId: "hr-admin"
  });
  const managerEmployment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: manager.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Operationschef",
    payModelCode: "monthly_salary",
    startDate: "2025-01-01",
    actorId: "hr-admin"
  });
  const employment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Fälttekniker",
    payModelCode: "hourly_salary",
    workerCategoryCode: "blue_collar",
    externalContractorRef: "vendor-17",
    payrollMigrationAnchorRef: "migration-anchor-17",
    startDate: "2026-01-01",
    actorId: "hr-admin"
  });
  hrPlatform.addEmploymentContract({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    validFrom: "2026-01-01",
    salaryModelCode: "hourly_salary",
    hourlyRate: 250,
    collectiveAgreementCode: "ALMEGA_FIELD",
    actorId: "hr-admin"
  });
  hrPlatform.assignEmploymentManager({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    managerEmploymentId: managerEmployment.employmentId,
    validFrom: "2026-01-01",
    actorId: "hr-admin"
  });

  const family = collectiveAgreementsPlatform.createAgreementFamily({
    companyId: COMPANY_ID,
    code: "ALMEGA_FIELD",
    name: "Almega Field",
    actorId: "agreement-admin"
  });
  const version = collectiveAgreementsPlatform.publishAgreementVersion({
    companyId: COMPANY_ID,
    agreementFamilyId: family.agreementFamilyId,
    versionCode: "ALMEGA_FIELD_2026_01",
    effectiveFrom: "2026-01-01",
    rulepackVersion: "2026.1",
    ruleSet: {
      overtimeMultiplier: 1.75,
      flexExportCode: "FLEX"
    },
    actorId: "agreement-admin"
  });
  collectiveAgreementsPlatform.assignAgreementToEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    agreementVersionId: version.agreementVersionId,
    effectiveFrom: "2026-01-01",
    assignmentReasonCode: "HIRING",
    actorId: "agreement-admin"
  });

  const scheduleTemplate = timePlatform.createScheduleTemplate({
    companyId: COMPANY_ID,
    scheduleTemplateCode: "FIELD_STD",
    displayName: "Field standard",
    days: [
      {
        weekday: 2,
        plannedMinutes: 480,
        startTime: "08:00",
        endTime: "17:00",
        breakMinutes: 60
      }
    ],
    actorId: "time-admin"
  });
  timePlatform.assignScheduleTemplate({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    scheduleTemplateId: scheduleTemplate.scheduleTemplateId,
    validFrom: "2026-01-01",
    actorId: "time-admin"
  });

  const draftEntry = timePlatform.createTimeEntry({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    workDate: "2026-03-24",
    sourceType: "manual",
    workedMinutes: 510,
    overtimeMinutes: 30,
    approvalMode: "manual",
    allocationRefs: [
      {
        projectId: "project-1",
        activityCode: "installation",
        allocationMinutes: 300
      },
      {
        projectId: "project-2",
        activityCode: "service",
        allocationMinutes: 210
      }
    ],
    actorId: "employee-user"
  });
  assert.equal(draftEntry.status, "draft");

  const submittedEntry = timePlatform.submitTimeEntry({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    timeEntryId: draftEntry.timeEntryId,
    actorId: "employee-user"
  });
  assert.equal(submittedEntry.status, "submitted");
  assert.equal(submittedEntry.managerEmploymentId, managerEmployment.employmentId);

  const approvedEntry = timePlatform.approveTimeEntry({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    timeEntryId: draftEntry.timeEntryId,
    actorId: "manager-user"
  });
  assert.equal(approvedEntry.status, "approved");
  assert.equal(approvedEntry.events.at(-1).eventType, "approved");

  const snapshot = hrPlatform.getEmploymentSnapshot({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    snapshotDate: "2026-03-24"
  });
  assert.equal(snapshot.employment.workerCategoryCode, "blue_collar");
  assert.equal(snapshot.employment.payrollMigrationAnchorRef, "migration-anchor-17");
  assert.equal(snapshot.activeContract.collectiveAgreementCode, "ALMEGA_FIELD");
  assert.equal(snapshot.activeManagerAssignment.managerEmploymentId, managerEmployment.employmentId);

  const timeBase = timePlatform.getEmploymentTimeBase({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    workDate: "2026-03-24",
    cutoffDate: "2026-03-31"
  });
  assert.equal(timeBase.hrSnapshot.employment.externalContractorRef, "vendor-17");
  assert.equal(timeBase.activeScheduleAssignment.scheduleDay.plannedMinutes, 480);
  assert.equal(timeBase.approvedTimeEntries.length, 1);
  assert.equal(timeBase.pendingApprovalCount, 0);
  assert.equal(timeBase.agreementOverlay.agreementVersionCode, "ALMEGA_FIELD_2026_01");
  assert.equal(timeBase.agreementOverlay.ruleSet.overtimeMultiplier, 1.75);
  assert.equal(timeBase.timeBalances.balances.overtime_minutes, 30);

  const overtimeSnapshot = timeBase.balanceSnapshots.find((candidate) => candidate.account.balanceTypeCode === "OVERTIME_MINUTES");
  assert.equal(overtimeSnapshot.snapshot.currentQuantity, 30);
});
