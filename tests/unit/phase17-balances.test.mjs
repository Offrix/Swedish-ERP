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
