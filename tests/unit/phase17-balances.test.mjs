import test from "node:test";
import assert from "node:assert/strict";
import { createBalancesEngine } from "../../packages/domain-balances/src/index.mjs";
import { createHrEngine } from "../../packages/domain-hr/src/index.mjs";

test("Step 17 balances models typed accounts, idempotent transactions, carry-forward and expiry", () => {
  const hr = createHrEngine({
    clock: () => new Date("2026-03-24T16:00:00Z"),
    seedDemo: false
  });
  const companyId = "company_balances_1";
  const employee = hr.createEmployee({
    companyId,
    givenName: "Anna",
    familyName: "Andersson",
    identityType: "other",
    actorId: "hr_admin"
  });
  const employment = hr.createEmployment({
    companyId,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Consultant",
    payModelCode: "monthly_salary",
    startDate: "2026-01-01",
    actorId: "hr_admin"
  });

  const engine = createBalancesEngine({
    clock: () => new Date("2026-03-24T16:00:00Z"),
    seedDemo: false,
    hrPlatform: hr
  });

  const balanceType = engine.createBalanceType({
    companyId,
    balanceTypeCode: "VACATION_DAYS",
    label: "Vacation days",
    unitCode: "days",
    carryForwardModeCode: "cap",
    carryForwardCapQuantity: 5,
    expiryModeCode: "rolling_days",
    expiryDays: 365,
    actorId: "payroll_admin"
  });

  const account = engine.openBalanceAccount({
    companyId,
    balanceTypeCode: balanceType.balanceTypeCode,
    ownerTypeCode: "employment",
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    actorId: "payroll_admin"
  });

  const baseline = engine.recordBalanceTransaction({
    companyId,
    balanceAccountId: account.balanceAccountId,
    effectiveDate: "2026-01-01",
    transactionTypeCode: "baseline",
    quantityDelta: 12,
    sourceDomainCode: "PAYROLL_MIGRATION",
    sourceObjectType: "migration_batch",
    sourceObjectId: "migration_1",
    idempotencyKey: "baseline-1",
    actorId: "payroll_admin"
  });
  assert.equal(baseline.quantityAfter, 12);

  const duplicateBaseline = engine.recordBalanceTransaction({
    companyId,
    balanceAccountId: account.balanceAccountId,
    effectiveDate: "2026-01-01",
    transactionTypeCode: "baseline",
    quantityDelta: 12,
    sourceDomainCode: "PAYROLL_MIGRATION",
    sourceObjectType: "migration_batch",
    sourceObjectId: "migration_1",
    idempotencyKey: "baseline-1",
    actorId: "payroll_admin"
  });
  assert.equal(duplicateBaseline.balanceTransactionId, baseline.balanceTransactionId);

  engine.recordBalanceTransaction({
    companyId,
    balanceAccountId: account.balanceAccountId,
    effectiveDate: "2026-03-01",
    transactionTypeCode: "spend",
    quantityDelta: -4,
    sourceDomainCode: "PAYROLL",
    sourceObjectType: "leave_payout",
    sourceObjectId: "leave_1",
    actorId: "payroll_admin"
  });

  const snapshotBeforeCarry = engine.getBalanceSnapshot({
    companyId,
    balanceAccountId: account.balanceAccountId,
    cutoffDate: "2026-12-31"
  });
  assert.equal(snapshotBeforeCarry.currentQuantity, 8);

  const carryForwardRun = engine.runBalanceCarryForward({
    companyId,
    sourceDate: "2026-12-31",
    targetDate: "2027-01-01",
    balanceTypeCode: "VACATION_DAYS",
    actorId: "payroll_admin"
  });
  assert.equal(carryForwardRun.processedCount, 1);
  assert.equal(carryForwardRun.processedItems[0].carriedQuantity, 5);
  assert.equal(carryForwardRun.processedItems[0].droppedQuantity, 3);

  const snapshotAfterCarry = engine.getBalanceSnapshot({
    companyId,
    balanceAccountId: account.balanceAccountId,
    cutoffDate: "2027-01-02"
  });
  assert.equal(snapshotAfterCarry.currentQuantity, 5);

  const expiringAccount = engine.openBalanceAccount({
    companyId,
    balanceTypeCode: "VACATION_DAYS",
    ownerTypeCode: "employee",
    employeeId: employee.employeeId,
    actorId: "payroll_admin"
  });
  engine.recordBalanceTransaction({
    companyId,
    balanceAccountId: expiringAccount.balanceAccountId,
    effectiveDate: "2025-01-01",
    transactionTypeCode: "baseline",
    quantityDelta: 3,
    sourceDomainCode: "PAYROLL_MIGRATION",
    sourceObjectType: "migration_batch",
    sourceObjectId: "migration_2",
    actorId: "payroll_admin"
  });

  const expiryRun = engine.runBalanceExpiry({
    companyId,
    runDate: "2026-03-24",
    balanceAccountId: expiringAccount.balanceAccountId,
    actorId: "payroll_admin"
  });
  assert.equal(expiryRun.processedCount, 1);

  const expiredSnapshot = engine.getBalanceSnapshot({
    companyId,
    balanceAccountId: expiringAccount.balanceAccountId,
    cutoffDate: "2026-03-24"
  });
  assert.equal(expiredSnapshot.currentQuantity, 0);
});

test("Phase 10.3 balances expose vacation profiles, carry only saveable days and expire saved days at year close", () => {
  const hr = createHrEngine({
    clock: () => new Date("2026-03-31T16:00:00Z"),
    seedDemo: false
  });
  const companyId = "company_balances_2";
  const employee = hr.createEmployee({
    companyId,
    givenName: "Vera",
    familyName: "Vacation",
    identityType: "other",
    actorId: "hr_admin"
  });
  const employment = hr.createEmployment({
    companyId,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Consultant",
    payModelCode: "monthly_salary",
    startDate: "2021-01-01",
    actorId: "hr_admin"
  });
  const engine = createBalancesEngine({
    clock: () => new Date("2026-03-31T16:00:00Z"),
    seedDemo: false,
    hrPlatform: hr
  });

  engine.createBalanceType({
    companyId,
    balanceTypeCode: "VACATION_PAID_DAYS",
    label: "Vacation paid days",
    unitCode: "days",
    negativeAllowed: false,
    carryForwardModeCode: "none",
    expiryModeCode: "none",
    actorId: "payroll_admin"
  });
  engine.createBalanceType({
    companyId,
    balanceTypeCode: "VACATION_SAVED_DAYS",
    label: "Vacation saved days",
    unitCode: "days",
    negativeAllowed: false,
    carryForwardModeCode: "none",
    expiryModeCode: "fixed_date",
    expiryMonthDay: "03-31",
    expiryYearOffset: 5,
    actorId: "payroll_admin"
  });
  const profile = engine.createVacationBalanceProfile({
    companyId,
    vacationBalanceProfileCode: "SEMESTERLAGEN",
    label: "Semesterlagen",
    paidDaysBalanceTypeCode: "VACATION_PAID_DAYS",
    savedDaysBalanceTypeCode: "VACATION_SAVED_DAYS",
    vacationYearStartMonthDay: "04-01",
    minimumPaidDaysToRetain: 20,
    maxSavedDaysPerYear: 5,
    actorId: "payroll_admin"
  });
  assert.equal(profile.minimumPaidDaysToRetain, 20);

  const paidAccount = engine.openBalanceAccount({
    companyId,
    balanceTypeCode: "VACATION_PAID_DAYS",
    ownerTypeCode: "employment",
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    actorId: "payroll_admin"
  });
  const savedAccount = engine.openBalanceAccount({
    companyId,
    balanceTypeCode: "VACATION_SAVED_DAYS",
    ownerTypeCode: "employment",
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    actorId: "payroll_admin"
  });

  engine.recordBalanceTransaction({
    companyId,
    balanceAccountId: paidAccount.balanceAccountId,
    effectiveDate: "2025-04-01",
    transactionTypeCode: "baseline",
    quantityDelta: 25,
    sourceDomainCode: "PAYROLL_MIGRATION",
    sourceObjectType: "migration_batch",
    sourceObjectId: "vacation-paid-baseline",
    actorId: "payroll_admin"
  });
  engine.recordBalanceTransaction({
    companyId,
    balanceAccountId: paidAccount.balanceAccountId,
    effectiveDate: "2026-02-15",
    transactionTypeCode: "spend",
    quantityDelta: -2,
    sourceDomainCode: "TIME",
    sourceObjectType: "leave_entry",
    sourceObjectId: "leave_1",
    actorId: "payroll_admin"
  });
  engine.recordBalanceTransaction({
    companyId,
    balanceAccountId: savedAccount.balanceAccountId,
    effectiveDate: "2021-04-01",
    transactionTypeCode: "baseline",
    quantityDelta: 2,
    sourceDomainCode: "PAYROLL_MIGRATION",
    sourceObjectType: "migration_batch",
    sourceObjectId: "vacation-saved-baseline",
    actorId: "payroll_admin"
  });

  const beforeClose = engine.getVacationBalance({
    companyId,
    employmentId: employment.employmentId,
    snapshotDate: "2026-03-31"
  });
  assert.equal(beforeClose.paidDays, 23);
  assert.equal(beforeClose.savedDays, 2);

  const closeRun = engine.runVacationYearClose({
    companyId,
    snapshotDate: "2026-03-31",
    employmentId: employment.employmentId,
    vacationBalanceProfileCode: "SEMESTERLAGEN",
    idempotencyKey: "vacation-close-2026",
    actorId: "payroll_admin"
  });
  assert.equal(closeRun.processedCount, 1);
  assert.equal(closeRun.processedItems[0].expiredSavedDays, 2);
  assert.equal(closeRun.processedItems[0].carriedPaidDays, 3);
  assert.equal(closeRun.processedItems[0].forfeitedPaidDays, 20);
  assert.equal(closeRun.processedItems[0].savedDaysAfterClose, 3);

  const duplicateCloseRun = engine.runVacationYearClose({
    companyId,
    snapshotDate: "2026-03-31",
    employmentId: employment.employmentId,
    vacationBalanceProfileCode: "SEMESTERLAGEN",
    idempotencyKey: "vacation-close-2026",
    actorId: "payroll_admin"
  });
  assert.equal(duplicateCloseRun.vacationYearCloseRunId, closeRun.vacationYearCloseRunId);

  const afterClose = engine.getVacationBalance({
    companyId,
    employmentId: employment.employmentId,
    snapshotDate: "2026-04-01"
  });
  assert.equal(afterClose.vacationYearStartDate, "2026-04-01");
  assert.equal(afterClose.paidDays, 0);
  assert.equal(afterClose.savedDays, 3);
  assert.equal(afterClose.totalDays, 3);
  assert.equal(afterClose.expiresAt, "2031-03-31");
});
