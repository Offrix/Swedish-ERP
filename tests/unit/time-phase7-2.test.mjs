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

  assert.equal(firstBalance.balances.flex_minutes, 60);
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
