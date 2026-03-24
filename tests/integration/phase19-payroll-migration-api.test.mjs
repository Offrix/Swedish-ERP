import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Step 19 API exposes payroll migration creation, validation, diff gating and finalize", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T19:45:00Z")
  });
  const employee = platform.createEmployee({
    companyId: DEMO_IDS.companyId,
    givenName: "Mikael",
    familyName: "Migration",
    identityType: "other",
    actorId: DEMO_IDS.userId
  });
  const employment = platform.createEmployment({
    companyId: DEMO_IDS.companyId,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Consultant",
    payModelCode: "monthly_salary",
    startDate: "2026-01-01",
    actorId: DEMO_IDS.userId
  });
  platform.createBalanceType({
    companyId: DEMO_IDS.companyId,
    balanceTypeCode: "VACATION_DAYS",
    label: "Vacation days",
    unitCode: "days",
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

    const mappingSet = platform.createMappingSet({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      sourceSystem: "legacy_payroll",
      domainScope: "payroll",
      versionNo: 1,
      mappings: [{ sourceField: "employee_no", targetField: "employeeId", transformCode: "identity" }]
    });
    platform.approveMappingSet({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      mappingSetId: mappingSet.mappingSetId
    });

    const batch = await requestJson(baseUrl, "/v1/payroll/migrations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        sourceSystemCode: "legacy_payroll",
        migrationMode: "live",
        effectiveCutoverDate: "2026-04-01",
        firstTargetReportingPeriod: "2026-04",
        mappingSetId: mappingSet.mappingSetId,
        requiredBalanceTypeCodes: ["VACATION_DAYS"],
        requiredApprovalRoleCodes: ["PAYROLL_OWNER"]
      }
    });
    assert.equal(batch.status, "draft");

    const imported = await requestJson(baseUrl, `/v1/payroll/migrations/${batch.payrollMigrationBatchId}/import-records`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        records: [
          {
            personId: "legacy-emp-002",
            employeeId: employee.employeeId,
            employmentId: employment.employmentId,
            ytdBasis: {
              grossCompensationSek: 100000,
              preliminaryTaxSek: 30000,
              employerContributionBasisSek: 100000,
              reportedThroughPeriod: "2026-03"
            },
            priorPayslipSummary: {
              lastNetPaySek: 24000
            },
            agiCarryForwardBasis: {
              reportedThroughPeriod: "2026-03",
              submissionReferences: ["AGI-2026-03"]
            }
          }
        ]
      }
    });
    assert.equal(imported.employeeRecordCount, 1);

    await requestJson(baseUrl, `/v1/payroll/migrations/${batch.payrollMigrationBatchId}/balance-baselines`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        baselines: [
          {
            employeeId: employee.employeeId,
            employmentId: employment.employmentId,
            balanceTypeCode: "VACATION_DAYS",
            openingQuantity: 10,
            effectiveDate: "2026-04-01"
          }
        ]
      }
    });

    const validated = await requestJson(baseUrl, `/v1/payroll/migrations/${batch.payrollMigrationBatchId}/validate`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(validated.status, "validated");

    const diffResult = await requestJson(baseUrl, `/v1/payroll/migrations/${batch.payrollMigrationBatchId}/diffs`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        sourceTotals: {
          netPaySek: 24000,
          preliminaryTaxSek: 30000
        },
        targetTotals: {
          netPaySek: 23975,
          preliminaryTaxSek: 30000
        }
      }
    });
    assert.equal(diffResult.summary.blockingCount, 1);

    const diffList = await requestJson(baseUrl, `/v1/payroll/migrations/${batch.payrollMigrationBatchId}/diffs?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(diffList.items.length, 1);

    await requestJson(
      baseUrl,
      `/v1/payroll/migrations/${batch.payrollMigrationBatchId}/diffs/${diffList.items[0].payrollMigrationDiffId}/decide`,
      {
        method: "POST",
        token: adminToken,
        expectedStatus: 200,
        body: {
          companyId: DEMO_IDS.companyId,
          decision: "accepted",
          explanation: "Signed reconciliation approves the net pay variance."
        }
      }
    );

    const approved = await requestJson(baseUrl, `/v1/payroll/migrations/${batch.payrollMigrationBatchId}/approve`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        approvalRoleCode: "payroll_owner"
      }
    });
    assert.equal(approved.status, "approved_for_cutover");

    const finalized = await requestJson(baseUrl, `/v1/payroll/migrations/${batch.payrollMigrationBatchId}/finalize`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(finalized.status, "cutover_executed");

    const stored = await requestJson(baseUrl, `/v1/payroll/migrations/${batch.payrollMigrationBatchId}?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(stored.balanceBaselines.length, 1);
    assert.equal(stored.executionReceipt.realizedBalanceTransactions.length, 1);
  } finally {
    await stopServer(server);
  }
});
