import test from "node:test";
import assert from "node:assert/strict";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../packages/domain-time/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 7.2 direct platform records clock events, links time to project/activity and keeps balances reproducible", () => {
  const hrPlatform = createHrPlatform({
    clock: () => new Date("2026-03-02T08:00:00Z")
  });
  const timePlatform = createTimePlatform({
    clock: () => new Date("2026-03-02T08:00:00Z"),
    hrPlatform
  });

  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Tilde",
    familyName: "Time",
    actorId: "unit-test"
  });
  const employment = hrPlatform.createEmployment({
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
    familyName: "Tidchef",
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
    employmentId: employment.employmentId,
    managerEmploymentId: managerEmployment.employmentId,
    validFrom: "2026-01-01",
    actorId: "unit-test"
  });

  const scheduleTemplate = timePlatform.createScheduleTemplate({
    companyId: COMPANY_ID,
    scheduleTemplateCode: "FIELD_STD",
    displayName: "Field standard",
    days: [
      {
        weekday: 1,
        plannedMinutes: 480,
        startTime: "08:00",
        endTime: "17:00",
        breakMinutes: 60
      }
    ],
    actorId: "unit-test"
  });
  timePlatform.assignScheduleTemplate({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    scheduleTemplateId: scheduleTemplate.scheduleTemplateId,
    validFrom: "2026-01-01",
    actorId: "unit-test"
  });

  const clockIn = timePlatform.recordClockEvent({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    eventType: "clock_in",
    occurredAt: "2026-03-02T07:30:00Z",
    projectId: "project-7-2",
    activityCode: "onsite_service",
    actorId: "unit-test"
  });
  const clockOut = timePlatform.recordClockEvent({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    eventType: "clock_out",
    occurredAt: "2026-03-02T17:00:00Z",
    projectId: "project-7-2",
    activityCode: "onsite_service",
    actorId: "unit-test"
  });

  const entry = timePlatform.createTimeEntry({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    workDate: "2026-03-02",
    projectId: "project-7-2",
    activityCode: "onsite_service",
    sourceType: "clock",
    startsAt: "2026-03-02T07:30:00Z",
    endsAt: "2026-03-02T17:00:00Z",
    breakMinutes: 30,
    overtimeMinutes: 30,
    compDeltaMinutes: 15,
    sourceClockEventIds: [clockIn.timeClockEventId, clockOut.timeClockEventId],
    actorId: "unit-test"
  });

  assert.equal(entry.projectId, "project-7-2");
  assert.equal(entry.activityCode, "onsite_service");
  assert.equal(entry.scheduleTemplateCode, "FIELD_STD");
  assert.equal(entry.workedMinutes, 540);
  assert.equal(entry.scheduledMinutes, 480);
  assert.equal(entry.flexDeltaMinutes, 60);

  const pendingEntry = timePlatform.createTimeEntry({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    workDate: "2026-03-03",
    sourceType: "manual",
    workedMinutes: 480,
    approvalMode: "manual",
    actorId: "unit-test"
  });
  assert.equal(pendingEntry.status, "draft");
  assert.throws(
    () =>
      timePlatform.approveTimeSet({
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        startsOn: "2026-03-01",
        endsOn: "2026-03-31",
        actorId: "unit-test"
      }),
    (error) => {
      assert.equal(error.code, "approved_time_set_pending_entries");
      return true;
    }
  );
  timePlatform.approveTimeEntry({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    timeEntryId: pendingEntry.timeEntryId,
    actorId: "unit-test"
  });
  const approvedTimeSet = timePlatform.approveTimeSet({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    startsOn: "2026-03-01",
    endsOn: "2026-03-31",
    actorId: "unit-test"
  });
  assert.equal(approvedTimeSet.approvedEntryCount, 2);
  assert.equal(approvedTimeSet.status, "approved");
  const payrollInput = timePlatform.getPayrollInputPeriod({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    startsOn: "2026-03-01",
    endsOn: "2026-03-31",
    reportingPeriod: "202603"
  });
  assert.equal(payrollInput.approvedTimeSet.approvedTimeSetId, approvedTimeSet.approvedTimeSetId);
  assert.equal(payrollInput.approvedTimeEntries.length, 2);
  assert.equal(payrollInput.approvedTimeEntriesOutsideSet.length, 0);
  assert.equal(payrollInput.inputLocked, false);

  const firstBalance = timePlatform.listTimeBalances({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    cutoffDate: "2026-03-31"
  });
  const secondBalance = timePlatform.listTimeBalances({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    cutoffDate: "2026-03-31"
  });

  assert.equal(firstBalance.balances.flex_minutes, 540);
  assert.equal(firstBalance.balances.comp_minutes, 15);
  assert.equal(firstBalance.balances.overtime_minutes, 30);
  assert.equal(firstBalance.snapshotHash, secondBalance.snapshotHash);

  timePlatform.lockTimePeriod({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    startsOn: "2026-03-01",
    endsOn: "2026-03-31",
    reasonCode: "payroll_cutoff",
    actorId: "unit-test"
  });
  const approvedTimeSets = timePlatform.listApprovedTimeSets({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId
  });
  assert.equal(approvedTimeSets.length, 1);
  assert.equal(approvedTimeSets[0].status, "locked");
  const lockedPayrollInput = timePlatform.getPayrollInputPeriod({
    companyId: COMPANY_ID,
    employmentId: employment.employmentId,
    startsOn: "2026-03-01",
    endsOn: "2026-03-31",
    reportingPeriod: "202603"
  });
  assert.equal(lockedPayrollInput.inputLocked, true);

  assert.throws(
    () =>
      timePlatform.recordClockEvent({
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        eventType: "clock_in",
        occurredAt: "2026-03-03T08:00:00Z",
        actorId: "unit-test"
      }),
    /time period/i
  );
});
