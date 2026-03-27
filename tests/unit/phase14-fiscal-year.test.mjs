import test from "node:test";
import assert from "node:assert/strict";
import { createFiscalYearEngine } from "../../packages/domain-fiscal-year/src/index.mjs";

test("Step 8 fiscal year blocks broken year for calendar-year-bound profiles", () => {
  const engine = createFiscalYearEngine({
    seedDemo: false,
    clock: () => new Date("2026-06-01T09:00:00Z")
  });

  const soleTraderProfile = engine.createFiscalYearProfile({
    companyId: "company_sole_trader",
    legalFormCode: "ENSKILD_NARINGSVERKSAMHET",
    ownerTaxationCode: "PHYSICAL_PERSON_PARTICIPANT",
    actorId: "tester"
  });

  assert.equal(soleTraderProfile.mustUseCalendarYear, true);
  assert.throws(
    () =>
      engine.createFiscalYear({
        companyId: "company_sole_trader",
        fiscalYearProfileId: soleTraderProfile.fiscalYearProfileId,
        startDate: "2026-07-01",
        endDate: "2027-06-30",
        approvalBasisCode: "BASELINE",
        actorId: "tester"
      }),
    /calendar[- ]year/i
  );
});

test("Step 8 short fiscal year generation is deterministic and idempotent", () => {
  const engine = createFiscalYearEngine({
    seedDemo: false,
    clock: () => new Date("2026-12-15T09:00:00Z")
  });

  const profile = engine.createFiscalYearProfile({
    companyId: "company_short_year",
    legalFormCode: "AKTIEBOLAG",
    actorId: "tester"
  });
  const shortYear = engine.createFiscalYear({
    companyId: "company_short_year",
    fiscalYearProfileId: profile.fiscalYearProfileId,
    startDate: "2026-03-01",
    endDate: "2026-12-31",
    approvalBasisCode: "BOOKKEEPING_ENTRY",
    actorId: "tester"
  });
  const activatedShortYear = engine.activateFiscalYear({
    companyId: "company_short_year",
    fiscalYearId: shortYear.fiscalYearId,
    actorId: "tester"
  });
  const replayPeriods = engine.generatePeriods({
    companyId: "company_short_year",
    fiscalYearId: shortYear.fiscalYearId,
    actorId: "tester"
  });

  assert.equal(activatedShortYear.periods.length, 10);
  assert.equal(replayPeriods.length, 10);
  assert.equal(activatedShortYear.periods[0].periodCode, "202603");
  assert.equal(activatedShortYear.periods.at(-1).periodCode, "202612");
});

test("Step 8 change requests require permission where law requires it and activate extended year correctly", () => {
  const engine = createFiscalYearEngine({
    seedDemo: false,
    clock: () => new Date("2027-07-01T09:00:00Z")
  });

  const profile = engine.createFiscalYearProfile({
    companyId: "company_extended_year",
    legalFormCode: "AKTIEBOLAG",
    actorId: "tester"
  });
  const initialYear = engine.createFiscalYear({
    companyId: "company_extended_year",
    fiscalYearProfileId: profile.fiscalYearProfileId,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    approvalBasisCode: "BASELINE",
    actorId: "tester"
  });
  engine.activateFiscalYear({
    companyId: "company_extended_year",
    fiscalYearId: initialYear.fiscalYearId,
    actorId: "tester"
  });

  const pendingRequest = engine.submitFiscalYearChangeRequest({
    companyId: "company_extended_year",
    requestedStartDate: "2027-01-01",
    requestedEndDate: "2028-06-30",
    reasonCode: "YEAR_CHANGE",
    actorId: "tester"
  });
  assert.equal(pendingRequest.taxAgencyPermissionRequired, true);
  assert.throws(
    () =>
      engine.approveFiscalYearChangeRequest({
        companyId: "company_extended_year",
        changeRequestId: pendingRequest.changeRequestId,
        actorId: "approver"
      }),
    /permission/i
  );

  const grantedRequest = engine.submitFiscalYearChangeRequest({
    companyId: "company_extended_year",
    requestedStartDate: "2027-01-01",
    requestedEndDate: "2028-06-30",
    reasonCode: "YEAR_CHANGE",
    permissionReference: "SKV-2027-0001",
    actorId: "tester"
  });
  engine.approveFiscalYearChangeRequest({
    companyId: "company_extended_year",
    changeRequestId: grantedRequest.changeRequestId,
    actorId: "approver"
  });
  const extendedYear = engine.createFiscalYear({
    companyId: "company_extended_year",
    fiscalYearProfileId: profile.fiscalYearProfileId,
    startDate: "2027-01-01",
    endDate: "2028-06-30",
    approvalBasisCode: "YEAR_CHANGE",
    changeRequestId: grantedRequest.changeRequestId,
    actorId: "tester"
  });
  engine.activateFiscalYear({
    companyId: "company_extended_year",
    fiscalYearId: extendedYear.fiscalYearId,
    actorId: "approver"
  });

  const activeYear = engine.getActiveFiscalYearForDate({
    companyId: "company_extended_year",
    accountingDate: "2028-04-15"
  });
  assert.equal(activeYear.yearKind, "EXTENDED");
  assert.equal(activeYear.periods.length, 18);
});

test("Step 8 fiscal year status filtering accepts lowercase active status", () => {
  const engine = createFiscalYearEngine({
    seedDemo: false,
    clock: () => new Date("2026-06-01T09:00:00Z")
  });

  const profile = engine.createFiscalYearProfile({
    companyId: "company_status_filter",
    legalFormCode: "AKTIEBOLAG",
    actorId: "tester"
  });
  const fiscalYear = engine.createFiscalYear({
    companyId: "company_status_filter",
    fiscalYearProfileId: profile.fiscalYearProfileId,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    approvalBasisCode: "BOOKKEEPING_ENTRY",
    actorId: "tester"
  });
  engine.activateFiscalYear({
    companyId: "company_status_filter",
    fiscalYearId: fiscalYear.fiscalYearId,
    actorId: "tester"
  });

  const activeYears = engine.listFiscalYears({
    companyId: "company_status_filter",
    status: "active"
  });
  assert.equal(activeYears.length, 1);
  assert.equal(activeYears[0].status, "active");
});
