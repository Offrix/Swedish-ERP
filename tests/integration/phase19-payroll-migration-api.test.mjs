import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Step 19 API exposes payroll migration creation, validation, diff gating and finalize", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T19:45:00Z")
  });
  const balanceTypeCode = "VACATION_DAYS_PHASE19_API";
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
    const fieldUser = platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "payroll-migration-field@example.test",
      displayName: "Payroll Migration Field",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "payroll-migration-field@example.test"
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
        requiredApprovalRoleCodes: ["PAYROLL_OWNER"]
      }
    });
    assert.equal(batch.status, "draft");

    const fieldUserListForbidden = await requestJson(baseUrl, `/v1/payroll/migrations?companyId=${DEMO_IDS.companyId}`, {
      token: fieldUserToken,
      expectedStatus: 403
    });
    assert.equal(fieldUserListForbidden.error, "payroll_operations_role_forbidden");

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
            employeeMasterSnapshot: {
              sourceEmployeeNumber: "2002",
              displayName: "Mikael Migration",
              givenName: "Mikael",
              familyName: "Migration"
            },
            employmentHistory: [
              {
                startDate: "2026-01-01",
                employmentTypeCode: "permanent",
                jobTitle: "Consultant",
                payModelCode: "monthly_salary",
                salaryBasisCode: "monthly",
                salaryAmountSek: 40000
              }
            ],
            ytdBasis: {
              grossCompensationSek: 100000,
              preliminaryTaxSek: 30000,
              employerContributionBasisSek: 100000,
              taxableBenefitsSek: 1800,
              reportedThroughPeriod: "2026-03"
            },
            priorPayslipSummary: {
              lastNetPaySek: 24000
            },
            agiCarryForwardBasis: {
              reportedThroughPeriod: "2026-03",
              submissionReferences: ["AGI-2026-03"]
            },
            absenceHistory: [
              {
                absenceTypeCode: "SICK",
                reportedPeriod: "2026-03",
                fromDate: "2026-03-05",
                toDate: "2026-03-06",
                payrollImpactCode: "salary_deduction",
                sourceRecordRef: "absence-api-2026-03"
              }
            ],
            benefitHistory: [
              {
                benefitTypeCode: "MEAL",
                reportedPeriod: "2026-03",
                taxableAmountSek: 1800,
                netDeductionSek: 0,
                sourceRecordRef: "benefit-api-2026-03"
              }
            ],
            travelHistory: [
              {
                travelTypeCode: "MILEAGE",
                reportedPeriod: "2026-03",
                taxFreeAmountSek: 920,
                taxableAmountSek: 0,
                mileageKm: 184,
                sourceRecordRef: "travel-api-2026-03"
              }
            ],
            pensionHistory: [
              {
                reportedPeriod: "2026-03",
                pensionPlanCode: "ITP1",
                providerCode: "collectum",
                pensionBasisSek: 100000,
                premiumAmountSek: 4200,
                sourceRecordRef: "pension-api-2026-03"
              }
            ],
            agreementSnapshot: {
              snapshotDate: "2026-03-31",
              sourceRecordRef: "agreement-api-2026-03",
              agreementCode: "PAYROLL_MIGRATION_API_2026",
              validFrom: "2026-01-01"
            },
            evidenceMappings: [
              {
                targetAreaCode: "employee_master",
                sourceRecordRef: "employee-master-2002",
                artifactType: "legacy_employee_export",
                artifactRef: "evidence://employee-master-2002"
              },
              {
                targetAreaCode: "employment_history",
                sourceRecordRef: "employment-history-2002",
                artifactType: "legacy_employment_export",
                artifactRef: "evidence://employment-history-2002"
              },
              {
                targetAreaCode: "ytd_basis",
                sourceRecordRef: "ytd-2002-2026-03",
                artifactType: "legacy_payroll_summary",
                artifactRef: "evidence://ytd-2002-2026-03"
              },
              {
                targetAreaCode: "agi_history",
                sourceRecordRef: "agi-2002-2026-03",
                artifactType: "agi_receipt",
                artifactRef: "evidence://agi-2002-2026-03"
              },
              {
                targetAreaCode: "absence_history",
                sourceRecordRef: "absence-api-2026-03",
                artifactType: "absence_export",
                artifactRef: "evidence://absence-api-2026-03"
              },
              {
                targetAreaCode: "benefit_history",
                sourceRecordRef: "benefit-api-2026-03",
                artifactType: "benefit_register",
                artifactRef: "evidence://benefit-api-2026-03"
              },
              {
                targetAreaCode: "travel_history",
                sourceRecordRef: "travel-api-2026-03",
                artifactType: "travel_claim",
                artifactRef: "evidence://travel-api-2026-03"
              },
              {
                targetAreaCode: "pension_history",
                sourceRecordRef: "pension-api-2026-03",
                artifactType: "pension_report",
                artifactRef: "evidence://pension-api-2026-03"
              },
              {
                targetAreaCode: "agreement_snapshot",
                sourceRecordRef: "agreement-api-2026-03",
                artifactType: "agreement_export",
                artifactRef: "evidence://agreement-api-2026-03"
              }
            ]
          }
        ]
      }
    });
    assert.equal(imported.employeeRecordCount, 1);
    assert.equal(imported.historyImportSummary.absenceHistoryItemCount, 1);
    assert.equal(imported.historyImportSummary.pensionHistoryItemCount, 1);
    assert.equal(imported.historyImportSummary.agreementSnapshotCount, 1);
    assert.equal(imported.historyImportSummary.evidenceMappingCount, 9);
    assert.equal(imported.historyEvidenceBundle.artifactCount, 9);

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
    assert.equal(stored.employeeRecords[0].historyCoverage.missingRequiredEvidenceAreas.length, 0);
    assert.equal(stored.employeeRecords[0].historyCoverage.absenceHistoryItemCount, 1);
    assert.equal(stored.employeeRecords[0].historyCoverage.pensionHistoryItemCount, 1);
    assert.equal(stored.employeeRecords[0].historyCoverage.agreementSnapshotPresent, true);
    assert.equal(stored.employeeRecords[0].agreementSnapshot.agreementCode, "PAYROLL_MIGRATION_API_2026");
    assert.equal(stored.historyEvidenceBundle.status, "frozen");
    assert.equal(stored.executionReceipt.historyImportSummary.travelHistoryItemCount, 1);
    assert.equal(stored.executionReceipt.historyImportSummary.agreementSnapshotCount, 1);
  } finally {
    await stopServer(server);
  }
});
