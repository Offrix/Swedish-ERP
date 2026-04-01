import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 10.5 API exposes canonical HR migration intake snapshots and coverage", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-04-01T10:00:00Z")
  });
  const employee = platform.createEmployee({
    companyId: DEMO_IDS.companyId,
    givenName: "Ayla",
    familyName: "Api",
    identityType: "other",
    actorId: DEMO_IDS.userId
  });
  const employment = platform.createEmployment({
    companyId: DEMO_IDS.companyId,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Payroll analyst",
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

    const batch = await requestJson(baseUrl, "/v1/payroll/migrations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        sourceSystemCode: "legacy_payroll",
        migrationMode: "live",
        effectiveCutoverDate: "2026-04-01",
        firstTargetReportingPeriod: "2026-04"
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
            personId: "legacy-api-001",
            employeeId: employee.employeeId,
            employmentId: employment.employmentId,
            employeeMasterSnapshot: {
              sourceEmployeeNumber: "2001",
              displayName: "Ayla Api"
            },
            employmentHistory: [
              {
                startDate: "2026-01-01",
                employmentTypeCode: "permanent",
                jobTitle: "Payroll analyst",
                payModelCode: "monthly_salary"
              }
            ],
            ytdBasis: {
              grossCompensationSek: 111000,
              preliminaryTaxSek: 33300,
              employerContributionBasisSek: 111000,
              reportedThroughPeriod: "2026-03"
            },
            agiCarryForwardBasis: {
              reportedThroughPeriod: "2026-03",
              submissionReferences: ["AGI-2026-03-2001"]
            },
            absenceHistory: [
              {
                absenceTypeCode: "VACATION",
                reportedPeriod: "2026-03",
                fromDate: "2026-03-21",
                toDate: "2026-03-25",
                payrollImpactCode: "FULL_ABSENCE",
                sourceRecordRef: "absence-api-2001"
              }
            ],
            pensionHistory: [
              {
                reportedPeriod: "2026-03",
                pensionPlanCode: "ITP1",
                providerCode: "collectum",
                pensionBasisSek: 111000,
                premiumAmountSek: 4995,
                sourceRecordRef: "pension-api-2001"
              }
            ],
            agreementSnapshot: {
              snapshotDate: "2026-04-01",
              agreementCode: "BYGGAVTAL_2026",
              ruleSet: {
                overtimeMultiplier: 2
              },
              rateComponents: {
                payItemRates: {
                  OVERTIME: {
                    calcMode: "multiplier",
                    multiplier: 2
                  }
                }
              },
              sourceRecordRef: "agreement-api-2001"
            },
            evidenceMappings: [
              {
                targetAreaCode: "employee_master",
                sourceRecordRef: "employee-master-2001",
                artifactType: "legacy_employee_export",
                artifactRef: "evidence://employee-master-2001"
              },
              {
                targetAreaCode: "employment_history",
                sourceRecordRef: "employment-history-2001",
                artifactType: "legacy_employment_export",
                artifactRef: "evidence://employment-history-2001"
              },
              {
                targetAreaCode: "ytd_basis",
                sourceRecordRef: "ytd-2001-2026-03",
                artifactType: "legacy_payroll_summary",
                artifactRef: "evidence://ytd-2001-2026-03"
              },
              {
                targetAreaCode: "agi_history",
                sourceRecordRef: "agi-2001-2026-03",
                artifactType: "agi_receipt",
                artifactRef: "evidence://agi-2001-2026-03"
              },
              {
                targetAreaCode: "absence_history",
                sourceRecordRef: "absence-api-2001",
                artifactType: "absence_export",
                artifactRef: "evidence://absence-api-2001"
              },
              {
                targetAreaCode: "pension_history",
                sourceRecordRef: "pension-api-2001",
                artifactType: "pension_basis",
                artifactRef: "evidence://pension-api-2001"
              },
              {
                targetAreaCode: "agreement_snapshot",
                sourceRecordRef: "agreement-api-2001",
                artifactType: "agreement_snapshot_export",
                artifactRef: "evidence://agreement-api-2001"
              }
            ]
          }
        ]
      }
    });

    assert.equal(imported.historyImportSummary.absenceHistoryItemCount, 1);
    assert.equal(imported.historyImportSummary.pensionHistoryItemCount, 1);
    assert.equal(imported.historyImportSummary.agreementSnapshotCount, 1);

    const employees = await requestJson(
      baseUrl,
      `/v1/payroll/migrations/${batch.payrollMigrationBatchId}/employees?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken,
        expectedStatus: 200
      }
    );

    assert.equal(employees.items.length, 1);
    assert.equal(employees.items[0].absenceHistory.length, 1);
    assert.equal(employees.items[0].pensionHistory.length, 1);
    assert.equal(employees.items[0].agreementSnapshot.agreementCode, "BYGGAVTAL_2026");
    assert.deepEqual(employees.items[0].historyCoverage.missingRequiredEvidenceAreas, []);

    const validated = await requestJson(baseUrl, `/v1/payroll/migrations/${batch.payrollMigrationBatchId}/validate`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(validated.validationSummary.blockingIssueCount, 0);
    assert.equal(validated.historyEvidenceBundle.requiredEvidenceAreas.includes("AGREEMENT_SNAPSHOT"), true);
  } finally {
    await stopServer(server);
  }
});
