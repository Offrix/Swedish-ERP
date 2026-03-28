import test from "node:test";
import assert from "node:assert/strict";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 7.3 direct platform enforces signal completeness, manager approval, history and AGI locks", () => {
  const hrPlatform = createHrPlatform({
    clock: () => new Date("2026-03-10T08:00:00Z")
  });
  const timePlatform = createTimePlatform({
    clock: () => new Date("2026-03-10T08:00:00Z"),
    hrPlatform
  });

  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Elsa",
    familyName: "Portal",
    workEmail: "elsa.portal@example.com",
    actorId: "unit-test"
  });
  const employeeEmployment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Consultant",
    payModelCode: "monthly_salary",
    startDate: "2026-01-01",
    actorId: "unit-test"
  });

  const manager = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Maja",
    familyName: "Chef",
    workEmail: "maja.chef@example.com",
    actorId: "unit-test"
  });
  const managerEmployment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: manager.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Team lead",
    payModelCode: "monthly_salary",
    startDate: "2024-01-01",
    actorId: "unit-test"
  });

  hrPlatform.assignEmploymentManager({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employeeEmployment.employmentId,
    managerEmploymentId: managerEmployment.employmentId,
    validFrom: "2026-01-01",
    actorId: "unit-test"
  });

  const parentalLeave = timePlatform.createLeaveType({
    companyId: COMPANY_ID,
    leaveTypeCode: "PARENTAL_UNIT",
    displayName: "Parental unit leave",
    signalType: "parental_benefit",
    actorId: "unit-test"
  });
  assert.throws(
    () =>
      timePlatform.createLeaveEntry({
        companyId: COMPANY_ID,
        employmentId: employeeEmployment.employmentId,
        leaveTypeId: parentalLeave.leaveTypeId,
        reportingPeriod: "202603",
        days: [
          {
            date: "2026-04-01",
            extentPercent: 100
          }
        ],
        actorId: "unit-test"
      }),
    /reporting period/i
  );

  const incompleteEntry = timePlatform.createLeaveEntry({
    companyId: COMPANY_ID,
    employmentId: employeeEmployment.employmentId,
    leaveTypeId: parentalLeave.leaveTypeId,
    days: [
      {
        date: "2026-03-11",
        extentPercent: 100
      }
    ],
    actorId: "unit-test"
  });
  assert.equal(incompleteEntry.signalCompleteness.complete, false);
  assert.deepEqual(incompleteEntry.signalCompleteness.missingFields, ["reportingPeriod"]);
  assert.throws(
    () =>
      timePlatform.submitLeaveEntry({
        companyId: COMPANY_ID,
        leaveEntryId: incompleteEntry.leaveEntryId,
        actorId: "unit-test"
      }),
    /incomplete/i
  );

  const approvedEntry = timePlatform.createLeaveEntry({
    companyId: COMPANY_ID,
    employmentId: employeeEmployment.employmentId,
    leaveTypeId: parentalLeave.leaveTypeId,
    reportingPeriod: "202603",
    days: [
      {
        date: "2026-03-12",
        extentPercent: 100
      },
      {
        date: "2026-03-13",
        extentPercent: 50
      }
    ],
    note: "Approved parental leave",
    actorId: "unit-test"
  });
  const submittedEntry = timePlatform.submitLeaveEntry({
    companyId: COMPANY_ID,
    leaveEntryId: approvedEntry.leaveEntryId,
    actorId: "employee-user"
  });
  assert.equal(submittedEntry.status, "submitted");
  assert.equal(submittedEntry.managerEmploymentId, managerEmployment.employmentId);
  assert.equal(submittedEntry.events.length, 2);

  const finalEntry = timePlatform.approveLeaveEntry({
    companyId: COMPANY_ID,
    leaveEntryId: approvedEntry.leaveEntryId,
    actorId: "manager-user"
  });
  assert.equal(finalEntry.status, "approved");
  assert.equal(finalEntry.events.length, 3);
  assert.equal(finalEntry.events.at(-1).eventType, "approved");
  assert.equal(finalEntry.signals.length, 2);
  assert.equal(finalEntry.signals[0].signalType, "parental_benefit");
  const approvedAbsenceDecisions = timePlatform.listAbsenceDecisions({
    companyId: COMPANY_ID,
    employmentId: employeeEmployment.employmentId,
    reportingPeriod: "202603"
  });
  assert.equal(approvedAbsenceDecisions.length, 1);
  assert.equal(approvedAbsenceDecisions[0].decisionStatus, "approved");
  assert.equal(approvedAbsenceDecisions[0].boundaryValidated, true);

  const lateDraft = timePlatform.createLeaveEntry({
    companyId: COMPANY_ID,
    employmentId: employeeEmployment.employmentId,
    leaveTypeId: parentalLeave.leaveTypeId,
    reportingPeriod: "202603",
    days: [
      {
        date: "2026-03-14",
        extentPercent: 100
      }
    ],
    actorId: "unit-test"
  });

  const lock = timePlatform.lockLeaveSignals({
    companyId: COMPANY_ID,
    employmentId: employeeEmployment.employmentId,
    reportingPeriod: "202603",
    lockState: "signed",
    sourceReference: "agi:202603:unit",
    actorId: "unit-test"
  });
  assert.equal(lock.lockState, "signed");

  assert.throws(
    () =>
      timePlatform.updateLeaveEntry({
        companyId: COMPANY_ID,
        leaveEntryId: lateDraft.leaveEntryId,
        note: "Late edit after sign-off",
        actorId: "unit-test"
      }),
    /locked/i
  );
  assert.throws(
    () =>
      timePlatform.submitLeaveEntry({
        companyId: COMPANY_ID,
        leaveEntryId: lateDraft.leaveEntryId,
        actorId: "unit-test"
      }),
    /locked/i
  );
  const rejectedEntry = timePlatform.createLeaveEntry({
    companyId: COMPANY_ID,
    employmentId: employeeEmployment.employmentId,
    leaveTypeId: parentalLeave.leaveTypeId,
    reportingPeriod: "202604",
    days: [
      {
        date: "2026-04-10",
        extentPercent: 100
      }
    ],
    actorId: "unit-test"
  });
  timePlatform.submitLeaveEntry({
    companyId: COMPANY_ID,
    leaveEntryId: rejectedEntry.leaveEntryId,
    actorId: "employee-user"
  });
  timePlatform.rejectLeaveEntry({
    companyId: COMPANY_ID,
    leaveEntryId: rejectedEntry.leaveEntryId,
    reason: "Need corrected medical evidence",
    actorId: "manager-user"
  });
  const allAbsenceDecisions = timePlatform.listAbsenceDecisions({
    companyId: COMPANY_ID,
    employmentId: employeeEmployment.employmentId
  });
  assert.equal(allAbsenceDecisions.length, 2);
  assert.equal(allAbsenceDecisions.some((decision) => decision.decisionStatus === "rejected"), true);

  const adminView = timePlatform.getLeaveEntry({
    companyId: COMPANY_ID,
    leaveEntryId: approvedEntry.leaveEntryId
  });
  assert.equal(adminView.events.some((event) => event.eventType === "created"), true);
  assert.equal(adminView.events.some((event) => event.eventType === "submitted"), true);
  assert.equal(adminView.events.some((event) => event.eventType === "approved"), true);
});
