import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Step 19 end-to-end flow imports payroll history with evidence mapping and preserves it through cutover", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-28T12:30:00Z")
  });
  const balanceTypeCode = "VACATION_DAYS_PHASE19_E2E";
  const employee = platform.createEmployee({
    companyId: DEMO_IDS.companyId,
    givenName: "Hanna",
    familyName: "History",
    identityType: "other",
    actorId: DEMO_IDS.userId
  });
  const employment = platform.createEmployment({
    companyId: DEMO_IDS.companyId,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Payroll coordinator",
    payModelCode: "monthly_salary",
    startDate: "2026-01-01",
    actorId: DEMO_IDS.userId
  });
  platform.createBalanceType({
    companyId: DEMO_IDS.companyId,
    balanceTypeCode,
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
        requiredBalanceTypeCodes: [balanceTypeCode],
        requiredApprovalRoleCodes: ["PAYROLL_OWNER"],
        sourceSnapshotRef: {
          system: "legacy_payroll",
          reportedThroughPeriod: "2026-03"
        }
      }
    });

    const imported = await requestJson(baseUrl, `/v1/payroll/migrations/${batch.payrollMigrationBatchId}/import-records`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        records: [
          {
            personId: "legacy-hanna-001",
            employeeId: employee.employeeId,
            employmentId: employment.employmentId,
            employeeMasterSnapshot: {
              sourceEmployeeNumber: "3001",
              displayName: "Hanna History",
              taxProfileCode: "TABLE_32"
            },
            employmentHistory: [
              {
                startDate: "2026-01-01",
                employmentTypeCode: "permanent",
                jobTitle: "Payroll coordinator",
                payModelCode: "monthly_salary",
                salaryBasisCode: "monthly",
                salaryAmountSek: 39000
              }
            ],
            ytdBasis: {
              grossCompensationSek: 117000,
              preliminaryTaxSek: 31500,
              employerContributionBasisSek: 117000,
              taxableBenefitsSek: 900,
              reportedThroughPeriod: "2026-03"
            },
            priorPayslipSummary: {
              lastNetPaySek: 27500
            },
            agiCarryForwardBasis: {
              reportedThroughPeriod: "2026-03",
              submissionReferences: ["AGI-HANNA-2026-03"]
            },
            benefitHistory: [
              {
                benefitTypeCode: "MEAL",
                reportedPeriod: "2026-03",
                taxableAmountSek: 900,
                netDeductionSek: 0,
                sourceRecordRef: "benefit-hanna-2026-03"
              }
            ],
            travelHistory: [
              {
                travelTypeCode: "MILEAGE",
                reportedPeriod: "2026-03",
                taxFreeAmountSek: 1120,
                taxableAmountSek: 0,
                mileageKm: 224,
                sourceRecordRef: "travel-hanna-2026-03"
              }
            ],
            evidenceMappings: [
              {
                targetAreaCode: "employee_master",
                sourceRecordRef: "employee-master-hanna",
                artifactType: "legacy_employee_export",
                artifactRef: "evidence://employee-master-hanna"
              },
              {
                targetAreaCode: "employment_history",
                sourceRecordRef: "employment-history-hanna",
                artifactType: "legacy_employment_export",
                artifactRef: "evidence://employment-history-hanna"
              },
              {
                targetAreaCode: "ytd_basis",
                sourceRecordRef: "ytd-hanna-2026-03",
                artifactType: "legacy_payroll_summary",
                artifactRef: "evidence://ytd-hanna-2026-03"
              },
              {
                targetAreaCode: "agi_history",
                sourceRecordRef: "agi-hanna-2026-03",
                artifactType: "agi_receipt",
                artifactRef: "evidence://agi-hanna-2026-03"
              },
              {
                targetAreaCode: "benefit_history",
                sourceRecordRef: "benefit-hanna-2026-03",
                artifactType: "benefit_register",
                artifactRef: "evidence://benefit-hanna-2026-03"
              },
              {
                targetAreaCode: "travel_history",
                sourceRecordRef: "travel-hanna-2026-03",
                artifactType: "travel_claim",
                artifactRef: "evidence://travel-hanna-2026-03"
              }
            ]
          }
        ]
      }
    });
    assert.equal(imported.historyEvidenceBundle.artifactCount, 6);

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
            balanceTypeCode,
            openingQuantity: 14,
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
    assert.equal(validated.validationSummary.blockingIssueCount, 0);

    await requestJson(baseUrl, `/v1/payroll/migrations/${batch.payrollMigrationBatchId}/diffs`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        sourceTotals: {
          netPaySek: 27500,
          preliminaryTaxSek: 31500
        },
        targetTotals: {
          netPaySek: 27500,
          preliminaryTaxSek: 31500
        }
      }
    });

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
    assert.ok(finalized.executionReceipt.historyEvidenceBundleId);

    const summary = await requestJson(baseUrl, `/v1/payroll/migrations/${batch.payrollMigrationBatchId}/employees?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(summary.items.length, 1);
    assert.equal(summary.items[0].historyCoverage.missingRequiredEvidenceAreas.length, 0);
    assert.equal(summary.items[0].historyCoverage.benefitHistoryItemCount, 1);
    assert.equal(summary.items[0].historyCoverage.travelHistoryItemCount, 1);
  } finally {
    await stopServer(server);
  }
});
