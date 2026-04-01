import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { loginWithStrongAuthOnPlatform } from "../helpers/platform-auth.mjs";

function createEmployeeContext(platform) {
  const employee = platform.createEmployee({
    companyId: DEMO_IDS.companyId,
    givenName: "Mira",
    familyName: "Migration",
    identityType: "other",
    actorId: DEMO_IDS.userId
  });
  const employment = platform.createEmployment({
    companyId: DEMO_IDS.companyId,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Payroll consultant",
    payModelCode: "monthly_salary",
    startDate: "2026-01-01",
    actorId: DEMO_IDS.userId
  });
  return { employee, employment };
}

test("Phase 10.5 defines canonical migration intake snapshots for absence, pension and agreement state", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-04-01T08:00:00Z")
  });
  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  const { employee, employment } = createEmployeeContext(platform);
  const batch = platform.createPayrollMigrationBatch({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    sourceSystemCode: "legacy_payroll",
    migrationMode: "live",
    effectiveCutoverDate: "2026-04-01",
    firstTargetReportingPeriod: "2026-04"
  });

  const imported = platform.importEmployeeMigrationRecords({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    payrollMigrationBatchId: batch.payrollMigrationBatchId,
    records: [
      {
        personId: "legacy-hr-001",
        employeeId: employee.employeeId,
        employmentId: employment.employmentId,
        employeeMasterSnapshot: {
          sourceEmployeeNumber: "1001",
          displayName: "Mira Migration"
        },
        employmentHistory: [
          {
            startDate: "2026-01-01",
            employmentTypeCode: "permanent",
            jobTitle: "Payroll consultant",
            payModelCode: "monthly_salary",
            salaryBasisCode: "monthly",
            salaryAmountSek: 43000
          }
        ],
        ytdBasis: {
          grossCompensationSek: 129000,
          preliminaryTaxSek: 38700,
          employerContributionBasisSek: 129000,
          taxableBenefitsSek: 2200,
          pensionBasisSek: 129000,
          reportedThroughPeriod: "2026-03"
        },
        agiCarryForwardBasis: {
          reportedThroughPeriod: "2026-03",
          submissionReferences: ["AGI-2026-03-1001"]
        },
        absenceHistory: [
          {
            absenceTypeCode: "VACATION",
            reportedPeriod: "2026-03",
            fromDate: "2026-03-10",
            toDate: "2026-03-12",
            payrollImpactCode: "FULL_ABSENCE",
            sourceRecordRef: "absence-1001-2026-03"
          }
        ],
        benefitHistory: [
          {
            benefitTypeCode: "CAR",
            reportedPeriod: "2026-03",
            taxableAmountSek: 2200,
            netDeductionSek: 0,
            sourceRecordRef: "benefit-1001-2026-03"
          }
        ],
        travelHistory: [
          {
            travelTypeCode: "MILEAGE",
            reportedPeriod: "2026-03",
            taxFreeAmountSek: 925,
            taxableAmountSek: 0,
            mileageKm: 185,
            sourceRecordRef: "travel-1001-2026-03"
          }
        ],
        pensionHistory: [
          {
            reportedPeriod: "2026-03",
            pensionPlanCode: "ITP1",
            providerCode: "collectum",
            pensionBasisSek: 129000,
            premiumAmountSek: 5810,
            specialPayrollTaxAmountSek: 1409.51,
            sourceRecordRef: "pension-1001-2026-03"
          }
        ],
        agreementSnapshot: {
          snapshotDate: "2026-04-01",
          agreementCode: "BYGGAVTAL_2026",
          rulepackVersion: "2026.1",
          ruleSet: {
            overtimeMultiplier: 2
          },
          rateComponents: {
            payItemRates: {
              OVERTIME: {
                calcMode: "multiplier",
                multiplier: 2,
                basisCode: "derived_hourly_rate"
              }
            }
          },
          sourceRecordRef: "agreement-1001-2026-04"
        },
        evidenceMappings: [
          {
            targetAreaCode: "employee_master",
            sourceRecordRef: "employee-master-1001",
            artifactType: "legacy_employee_export",
            artifactRef: "evidence://employee-master-1001"
          },
          {
            targetAreaCode: "employment_history",
            sourceRecordRef: "employment-history-1001",
            artifactType: "legacy_employment_export",
            artifactRef: "evidence://employment-history-1001"
          },
          {
            targetAreaCode: "ytd_basis",
            sourceRecordRef: "ytd-1001-2026-03",
            artifactType: "legacy_payroll_summary",
            artifactRef: "evidence://ytd-1001-2026-03"
          },
          {
            targetAreaCode: "agi_history",
            sourceRecordRef: "agi-1001-2026-03",
            artifactType: "agi_receipt",
            artifactRef: "evidence://agi-1001-2026-03"
          },
          {
            targetAreaCode: "absence_history",
            sourceRecordRef: "absence-1001-2026-03",
            artifactType: "absence_export",
            artifactRef: "evidence://absence-1001-2026-03"
          },
          {
            targetAreaCode: "benefit_history",
            sourceRecordRef: "benefit-1001-2026-03",
            artifactType: "benefit_register",
            artifactRef: "evidence://benefit-1001-2026-03"
          },
          {
            targetAreaCode: "travel_history",
            sourceRecordRef: "travel-1001-2026-03",
            artifactType: "travel_claim",
            artifactRef: "evidence://travel-1001-2026-03"
          },
          {
            targetAreaCode: "pension_history",
            sourceRecordRef: "pension-1001-2026-03",
            artifactType: "pension_basis",
            artifactRef: "evidence://pension-1001-2026-03"
          },
          {
            targetAreaCode: "agreement_snapshot",
            sourceRecordRef: "agreement-1001-2026-04",
            artifactType: "agreement_snapshot_export",
            artifactRef: "evidence://agreement-1001-2026-04"
          }
        ]
      }
    ]
  });

  const record = imported.employeeRecords[0];
  assert.equal(imported.historyImportSummary.absenceHistoryItemCount, 1);
  assert.equal(imported.historyImportSummary.pensionHistoryItemCount, 1);
  assert.equal(imported.historyImportSummary.agreementSnapshotCount, 1);
  assert.equal(record.absenceHistory.length, 1);
  assert.equal(record.pensionHistory.length, 1);
  assert.equal(record.agreementSnapshot.agreementCode, "BYGGAVTAL_2026");
  assert.equal(record.historyCoverage.requiredEvidenceAreas.includes("ABSENCE_HISTORY"), true);
  assert.equal(record.historyCoverage.requiredEvidenceAreas.includes("PENSION_HISTORY"), true);
  assert.equal(record.historyCoverage.requiredEvidenceAreas.includes("AGREEMENT_SNAPSHOT"), true);
  assert.deepEqual(record.historyCoverage.missingRequiredEvidenceAreas, []);

  const validated = platform.validatePayrollMigrationBatch({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    payrollMigrationBatchId: batch.payrollMigrationBatchId
  });
  assert.equal(validated.validationSummary.blockingIssueCount, 0);
  assert.equal(validated.historyEvidenceBundle.requiredEvidenceAreas.includes("ABSENCE_HISTORY"), true);
  assert.equal(validated.historyEvidenceBundle.requiredEvidenceAreas.includes("PENSION_HISTORY"), true);
  assert.equal(validated.historyEvidenceBundle.requiredEvidenceAreas.includes("AGREEMENT_SNAPSHOT"), true);
});

test("Phase 10.5 blocks live migration intake when new snapshot evidence mappings are missing", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-04-01T09:00:00Z")
  });
  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  const { employee, employment } = createEmployeeContext(platform);
  const batch = platform.createPayrollMigrationBatch({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    sourceSystemCode: "legacy_payroll",
    migrationMode: "live",
    effectiveCutoverDate: "2026-04-01",
    firstTargetReportingPeriod: "2026-04"
  });

  const imported = platform.importEmployeeMigrationRecords({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    payrollMigrationBatchId: batch.payrollMigrationBatchId,
    records: [
      {
        personId: "legacy-hr-002",
        employeeId: employee.employeeId,
        employmentId: employment.employmentId,
        employeeMasterSnapshot: {
          sourceEmployeeNumber: "1002",
          displayName: "Mira Migration"
        },
        employmentHistory: [
          {
            startDate: "2026-01-01",
            employmentTypeCode: "permanent",
            jobTitle: "Payroll consultant",
            payModelCode: "monthly_salary"
          }
        ],
        ytdBasis: {
          grossCompensationSek: 90000,
          preliminaryTaxSek: 27000,
          employerContributionBasisSek: 90000,
          reportedThroughPeriod: "2026-03"
        },
        agiCarryForwardBasis: {
          reportedThroughPeriod: "2026-03",
          submissionReferences: ["AGI-2026-03-1002"]
        },
        absenceHistory: [
          {
            absenceTypeCode: "SICKNESS",
            reportedPeriod: "2026-03",
            fromDate: "2026-03-05",
            toDate: "2026-03-05",
            payrollImpactCode: "SICKNESS_DAY",
            sourceRecordRef: "absence-1002-2026-03"
          }
        ],
        pensionHistory: [
          {
            reportedPeriod: "2026-03",
            pensionPlanCode: "ITP1",
            pensionBasisSek: 90000,
            premiumAmountSek: 4050,
            sourceRecordRef: "pension-1002-2026-03"
          }
        ],
        agreementSnapshot: {
          snapshotDate: "2026-04-01",
          agreementCode: "BYGGAVTAL_2026",
          rateComponents: {
            payItemRates: {
              OVERTIME: {
                calcMode: "multiplier",
                multiplier: 2
              }
            }
          }
        },
        evidenceMappings: [
          {
            targetAreaCode: "employee_master",
            sourceRecordRef: "employee-master-1002",
            artifactType: "legacy_employee_export",
            artifactRef: "evidence://employee-master-1002"
          },
          {
            targetAreaCode: "employment_history",
            sourceRecordRef: "employment-history-1002",
            artifactType: "legacy_employment_export",
            artifactRef: "evidence://employment-history-1002"
          },
          {
            targetAreaCode: "ytd_basis",
            sourceRecordRef: "ytd-1002-2026-03",
            artifactType: "legacy_payroll_summary",
            artifactRef: "evidence://ytd-1002-2026-03"
          },
          {
            targetAreaCode: "agi_history",
            sourceRecordRef: "agi-1002-2026-03",
            artifactType: "agi_receipt",
            artifactRef: "evidence://agi-1002-2026-03"
          }
        ]
      }
    ]
  });

  const record = imported.employeeRecords[0];
  assert.equal(record.validationState, "blocking");
  assert.equal(
    record.validationErrors.some((error) => error.code === "payroll_migration_evidence_mapping_missing"),
    true
  );
  assert.deepEqual(record.historyCoverage.missingRequiredEvidenceAreas, [
    "ABSENCE_HISTORY",
    "PENSION_HISTORY",
    "AGREEMENT_SNAPSHOT"
  ]);
});
