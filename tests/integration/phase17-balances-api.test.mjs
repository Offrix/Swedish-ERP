import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Step 17 API creates balance types, accounts, transactions, carry-forward and expiry runs", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T17:00:00Z")
  });
  const employee = platform.createEmployee({
    companyId: DEMO_IDS.companyId,
    givenName: "Lina",
    familyName: "Lund",
    identityType: "other",
    actorId: DEMO_IDS.userId
  });
  const employment = platform.createEmployment({
    companyId: DEMO_IDS.companyId,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Analyst",
    payModelCode: "monthly_salary",
    startDate: "2026-01-01",
    actorId: DEMO_IDS.userId
  });

  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });
    platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "balances-field@example.test",
      displayName: "Balances Field",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "balances-field@example.test"
    });

    const balanceType = await requestJson(baseUrl, "/v1/balances/types", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        balanceTypeCode: "FLEX_MINUTES",
        label: "Flex minutes",
        unitCode: "minutes",
        negativeAllowed: true,
        carryForwardModeCode: "full",
        expiryModeCode: "none"
      }
    });
    assert.equal(balanceType.balanceTypeCode, "FLEX_MINUTES");

    const fieldUserTypesForbidden = await requestJson(baseUrl, `/v1/balances/types?companyId=${DEMO_IDS.companyId}`, {
      token: fieldUserToken,
      expectedStatus: 403
    });
    assert.equal(fieldUserTypesForbidden.error, "payroll_operations_role_forbidden");

    const account = await requestJson(baseUrl, "/v1/balances/accounts", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        balanceTypeCode: "FLEX_MINUTES",
        ownerTypeCode: "employment",
        employeeId: employee.employeeId,
        employmentId: employment.employmentId
      }
    });
    assert.equal(account.ownerTypeCode, "employment");

    const transaction = await requestJson(baseUrl, `/v1/balances/accounts/${account.balanceAccountId}/transactions`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        effectiveDate: "2026-03-20",
        transactionTypeCode: "earn",
        quantityDelta: 180,
        sourceDomainCode: "TIME",
        sourceObjectType: "time_entry",
        sourceObjectId: "entry_1",
        idempotencyKey: "flex-earn-1"
      }
    });
    assert.equal(transaction.quantityAfter, 180);

    await requestJson(baseUrl, `/v1/balances/accounts/${account.balanceAccountId}/transactions`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        effectiveDate: "2026-03-21",
        transactionTypeCode: "spend",
        quantityDelta: -60,
        sourceDomainCode: "TIME",
        sourceObjectType: "time_entry",
        sourceObjectId: "entry_2"
      }
    });

    const snapshot = await requestJson(
      baseUrl,
      `/v1/balances/accounts/${account.balanceAccountId}/snapshot?companyId=${DEMO_IDS.companyId}&cutoffDate=2026-03-24`,
      { token: adminToken }
    );
    assert.equal(snapshot.currentQuantity, 120);

    const carryForwardRun = await requestJson(baseUrl, "/v1/balances/carry-forwards", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        sourceDate: "2026-12-31",
        targetDate: "2027-01-01",
        balanceAccountId: account.balanceAccountId,
        idempotencyKey: "flex-carry-1"
      }
    });
    assert.equal(carryForwardRun.processedCount, 1);

    const carryForwardRuns = await requestJson(
      baseUrl,
      `/v1/balances/carry-forwards?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(carryForwardRuns.items.length >= 1, true);

    const expiringType = await requestJson(baseUrl, "/v1/balances/types", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        balanceTypeCode: "COMP_DAYS",
        label: "Comp days",
        unitCode: "days",
        negativeAllowed: false,
        carryForwardModeCode: "full",
        expiryModeCode: "rolling_days",
        expiryDays: 30
      }
    });
    assert.equal(expiringType.expiryModeCode, "rolling_days");

    const expiringAccount = await requestJson(baseUrl, "/v1/balances/accounts", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        balanceTypeCode: "COMP_DAYS",
        ownerTypeCode: "employee",
        employeeId: employee.employeeId
      }
    });

    await requestJson(baseUrl, `/v1/balances/accounts/${expiringAccount.balanceAccountId}/transactions`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        effectiveDate: "2026-01-01",
        transactionTypeCode: "baseline",
        quantityDelta: 2,
        sourceDomainCode: "PAYROLL_MIGRATION",
        sourceObjectType: "migration_batch",
        sourceObjectId: "batch_1"
      }
    });

    const expiryRun = await requestJson(baseUrl, "/v1/balances/expiry-runs", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        runDate: "2026-03-24",
        balanceAccountId: expiringAccount.balanceAccountId
      }
    });
    assert.equal(expiryRun.processedCount, 1);

    const expiredSnapshot = await requestJson(
      baseUrl,
      `/v1/balances/accounts/${expiringAccount.balanceAccountId}/snapshot?companyId=${DEMO_IDS.companyId}&cutoffDate=2026-03-24`,
      { token: adminToken }
    );
    assert.equal(expiredSnapshot.currentQuantity, 0);

    await requestJson(baseUrl, "/v1/balances/types", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        balanceTypeCode: "VACATION_PAID_DAYS",
        label: "Vacation paid days",
        unitCode: "days",
        negativeAllowed: false,
        carryForwardModeCode: "none",
        expiryModeCode: "none"
      }
    });
    await requestJson(baseUrl, "/v1/balances/types", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        balanceTypeCode: "VACATION_SAVED_DAYS",
        label: "Vacation saved days",
        unitCode: "days",
        negativeAllowed: false,
        carryForwardModeCode: "none",
        expiryModeCode: "fixed_date",
        expiryMonthDay: "03-31",
        expiryYearOffset: 5
      }
    });
    const vacationProfile = await requestJson(baseUrl, "/v1/balances/vacation-profiles", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        vacationBalanceProfileCode: "SEMESTERLAGEN",
        label: "Semesterlagen",
        paidDaysBalanceTypeCode: "VACATION_PAID_DAYS",
        savedDaysBalanceTypeCode: "VACATION_SAVED_DAYS",
        vacationYearStartMonthDay: "04-01",
        minimumPaidDaysToRetain: 20,
        maxSavedDaysPerYear: 5
      }
    });
    assert.equal(vacationProfile.minimumPaidDaysToRetain, 20);

    const vacationProfiles = await requestJson(
      baseUrl,
      `/v1/balances/vacation-profiles?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(vacationProfiles.items.some((item) => item.vacationBalanceProfileCode === "SEMESTERLAGEN"), true);

    const vacationPaidAccount = await requestJson(baseUrl, "/v1/balances/accounts", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        balanceTypeCode: "VACATION_PAID_DAYS",
        ownerTypeCode: "employment",
        employeeId: employee.employeeId,
        employmentId: employment.employmentId
      }
    });
    const vacationSavedAccount = await requestJson(baseUrl, "/v1/balances/accounts", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        balanceTypeCode: "VACATION_SAVED_DAYS",
        ownerTypeCode: "employment",
        employeeId: employee.employeeId,
        employmentId: employment.employmentId
      }
    });
    await requestJson(baseUrl, `/v1/balances/accounts/${vacationPaidAccount.balanceAccountId}/transactions`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        effectiveDate: "2025-04-01",
        transactionTypeCode: "baseline",
        quantityDelta: 24,
        sourceDomainCode: "PAYROLL_MIGRATION",
        sourceObjectType: "migration_batch",
        sourceObjectId: "vacation-baseline-1"
      }
    });
    await requestJson(baseUrl, `/v1/balances/accounts/${vacationSavedAccount.balanceAccountId}/transactions`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        effectiveDate: "2021-04-01",
        transactionTypeCode: "baseline",
        quantityDelta: 2,
        sourceDomainCode: "PAYROLL_MIGRATION",
        sourceObjectType: "migration_batch",
        sourceObjectId: "vacation-baseline-2"
      }
    });

    const vacationBalanceBeforeClose = await requestJson(
      baseUrl,
      `/v1/balances/vacation-balances?companyId=${DEMO_IDS.companyId}&employmentId=${employment.employmentId}&snapshotDate=2026-03-31`,
      { token: adminToken }
    );
    assert.equal(vacationBalanceBeforeClose.paidDays, 24);
    assert.equal(vacationBalanceBeforeClose.savedDays, 2);

    const yearCloseRun = await requestJson(baseUrl, "/v1/balances/vacation-year-closes", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        snapshotDate: "2026-03-31",
        employmentId: employment.employmentId,
        vacationBalanceProfileCode: "SEMESTERLAGEN",
        idempotencyKey: "vacation-year-close-1"
      }
    });
    assert.equal(yearCloseRun.processedCount, 1);
    assert.equal(yearCloseRun.processedItems[0].carriedPaidDays, 4);
    assert.equal(yearCloseRun.processedItems[0].expiredSavedDays, 2);

    const yearCloseRuns = await requestJson(
      baseUrl,
      `/v1/balances/vacation-year-closes?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(yearCloseRuns.items.length >= 1, true);

    const vacationBalanceAfterClose = await requestJson(
      baseUrl,
      `/v1/balances/vacation-balances?companyId=${DEMO_IDS.companyId}&employmentId=${employment.employmentId}&snapshotDate=2026-04-01`,
      { token: adminToken }
    );
    assert.equal(vacationBalanceAfterClose.paidDays, 0);
    assert.equal(vacationBalanceAfterClose.savedDays, 4);
  } finally {
    await stopServer(server);
  }
});
