import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Step 20 API exposes employment snapshots, manual time approvals and unified people/time base", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T19:30:00Z")
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

    for (const balanceTypeCode of ["FLEX_MINUTES", "COMP_MINUTES", "OVERTIME_MINUTES"]) {
      await requestJson(baseUrl, "/v1/balances/types", {
        method: "POST",
        token: adminToken,
        expectedStatus: 201,
        body: {
          companyId: DEMO_IDS.companyId,
          balanceTypeCode,
          label: balanceTypeCode,
          unitCode: "minutes",
          negativeAllowed: true,
          carryForwardModeCode: "full",
          expiryModeCode: "none"
        }
      });
    }
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
    await requestJson(baseUrl, "/v1/balances/vacation-profiles", {
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

    const employee = await requestJson(baseUrl, "/v1/hr/employees", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        givenName: "Tina",
        familyName: "Teknik"
      }
    });
    const manager = await requestJson(baseUrl, "/v1/hr/employees", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        givenName: "Mika",
        familyName: "Manager"
      }
    });
    const managerEmployment = await requestJson(baseUrl, `/v1/hr/employees/${manager.employeeId}/employments`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        employmentTypeCode: "permanent",
        jobTitle: "Operationschef",
        payModelCode: "monthly_salary",
        startDate: "2025-01-01"
      }
    });
    const employment = await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/employments`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        employmentTypeCode: "permanent",
        jobTitle: "FÃ¤lttekniker",
        payModelCode: "hourly_salary",
        workerCategoryCode: "blue_collar",
        externalContractorRef: "vendor-55",
        payrollMigrationAnchorRef: "migration-anchor-55",
        startDate: "2026-01-01"
      }
    });

    await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/contracts`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        employmentId: employment.employmentId,
        validFrom: "2026-01-01",
        salaryModelCode: "hourly_salary",
        hourlyRate: 245,
        collectiveAgreementCode: "ALMEGA_SERVICE"
      }
    });
    await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/placements`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        employmentId: employment.employmentId,
        validFrom: "2026-01-01",
        organizationUnitCode: "field-ops",
        businessUnitCode: "service",
        departmentCode: "field",
        costCenterCode: "CC-SERVICE",
        serviceLineCode: "SERVICE"
      }
    });
    await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/salary-bases`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        employmentId: employment.employmentId,
        validFrom: "2026-01-01",
        salaryBasisCode: "SERVICE_HOURLY_FULLTIME",
        payModelCode: "hourly_salary",
        employmentRatePercent: 100,
        standardWeeklyHours: 40,
        ordinaryHoursPerMonth: 173.33
      }
    });
    await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/manager-assignments`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        employmentId: employment.employmentId,
        managerEmploymentId: managerEmployment.employmentId,
        validFrom: "2026-01-01"
      }
    });
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
        sourceObjectId: "vacation-days-baseline"
      }
    });

    const family = await requestJson(baseUrl, "/v1/collective-agreements/families", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        code: "ALMEGA_SERVICE",
        name: "Almega Service"
      }
    });
    const version = await requestJson(baseUrl, "/v1/collective-agreements/versions", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        agreementFamilyId: family.agreementFamilyId,
        versionCode: "ALMEGA_SERVICE_2026_01",
        effectiveFrom: "2026-01-01",
        rulepackVersion: "2026.1",
        ruleSet: {
          overtimeMultiplier: 1.8
        }
      }
    });
    const catalogEntry = await requestJson(baseUrl, "/v1/collective-agreements/catalog", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        agreementVersionId: version.agreementVersionId,
        dropdownLabel: "Almega Service 2026"
      }
    });
    await requestJson(baseUrl, "/v1/collective-agreements/assignments", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        employeeId: employee.employeeId,
        employmentId: employment.employmentId,
        agreementCatalogEntryId: catalogEntry.agreementCatalogEntryId,
        effectiveFrom: "2026-01-01",
        assignmentReasonCode: "HIRING"
      }
    });

    const scheduleTemplate = await requestJson(baseUrl, "/v1/time/schedule-templates", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        scheduleTemplateCode: "SERVICE_STD",
        displayName: "Service standard",
        days: [
          {
            weekday: 2,
            plannedMinutes: 480,
            startTime: "08:00",
            endTime: "17:00",
            breakMinutes: 60
          }
        ]
      }
    });
    await requestJson(baseUrl, "/v1/time/schedule-assignments", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        employmentId: employment.employmentId,
        scheduleTemplateId: scheduleTemplate.scheduleTemplateId,
        validFrom: "2026-01-01"
      }
    });

    const draftEntry = await requestJson(baseUrl, "/v1/time/entries", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        employmentId: employment.employmentId,
        workDate: "2026-03-24",
        workedMinutes: 510,
        overtimeMinutes: 30,
        approvalMode: "manual",
        allocationRefs: [
          {
            projectId: "project-api-1",
            activityCode: "installation",
            allocationMinutes: 300
          },
          {
            projectId: "project-api-2",
            activityCode: "service",
            allocationMinutes: 210
          }
        ]
      }
    });
    assert.equal(draftEntry.status, "draft");

    const submittedEntry = await requestJson(baseUrl, `/v1/time/entries/${draftEntry.timeEntryId}/submit`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        employmentId: employment.employmentId
      }
    });
    assert.equal(submittedEntry.status, "submitted");

    const approvedEntry = await requestJson(baseUrl, `/v1/time/entries/${draftEntry.timeEntryId}/approve`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        employmentId: employment.employmentId
      }
    });
    assert.equal(approvedEntry.status, "approved");

    const employmentSnapshot = await requestJson(
      baseUrl,
      `/v1/hr/employees/${employee.employeeId}/employments/${employment.employmentId}/snapshot?companyId=${DEMO_IDS.companyId}&snapshotDate=2026-03-24`,
      {
        token: adminToken
      }
    );
    assert.equal(employmentSnapshot.employment.workerCategoryCode, "blue_collar");
    assert.equal(employmentSnapshot.activePlacement.costCenterCode, "CC-SERVICE");
    assert.equal(employmentSnapshot.activeSalaryBasis.salaryBasisCode, "SERVICE_HOURLY_FULLTIME");
    assert.equal(employmentSnapshot.activeContract.collectiveAgreementCode, "ALMEGA_SERVICE");
    assert.equal(employmentSnapshot.completeness.readyForPayrollInputs, true);

    const timeBase = await requestJson(
      baseUrl,
      `/v1/time/employment-base?companyId=${DEMO_IDS.companyId}&employmentId=${employment.employmentId}&workDate=2026-03-24&cutoffDate=2026-03-31`,
      {
        token: adminToken
      }
    );
    assert.equal(timeBase.activeScheduleAssignment.scheduleDay.plannedMinutes, 480);
    assert.equal(timeBase.pendingApprovalCount, 0);
    assert.equal(timeBase.approvedTimeEntries.length, 1);
    assert.equal(timeBase.agreementOverlay.agreementVersionCode, "ALMEGA_SERVICE_2026_01");
    assert.equal(timeBase.timeBalances.balances.overtime_minutes, 30);
    assert.equal(timeBase.vacationBalance.paidDays, 24);
    assert.equal(timeBase.vacationBalance.savedDays, 0);
    assert.equal(
      timeBase.balanceSnapshots.some(
        (candidate) =>
          candidate.account.balanceTypeCode === "OVERTIME_MINUTES" && candidate.snapshot.currentQuantity === 30
      ),
      true
    );
  } finally {
    await stopServer(server);
  }
});
