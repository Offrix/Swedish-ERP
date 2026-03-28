import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { loginWithStrongAuthOnPlatform } from "../helpers/platform-auth.mjs";

test("Step 19 payroll migration validates YTD and balances, gates cutover and supports rollback", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T19:30:00Z")
  });
  const balanceTypeCode = "VACATION_DAYS_PHASE19";
  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });

  const employee = platform.createEmployee({
    companyId: DEMO_IDS.companyId,
    givenName: "Paula",
    familyName: "Payroll",
    identityType: "other",
    actorId: DEMO_IDS.userId
  });
  const employment = platform.createEmployment({
    companyId: DEMO_IDS.companyId,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Payroll specialist",
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
  const family = platform.createAgreementFamily({
    companyId: DEMO_IDS.companyId,
    code: "ALMEGA_TEST",
    name: "Almega Test",
    sectorCode: "PRIVATE",
    actorId: DEMO_IDS.userId
  });
  const version = platform.publishAgreementVersion({
    companyId: DEMO_IDS.companyId,
    agreementFamilyId: family.agreementFamilyId,
    versionCode: "ALMEGA_TEST_2026_01",
    effectiveFrom: "2026-01-01",
    rulepackVersion: "2026.1",
    ruleSet: {
      overtimeMultiplier: 1.5
    },
    actorId: DEMO_IDS.userId
  });
  const catalogEntry = platform.publishAgreementCatalogEntry({
    companyId: DEMO_IDS.companyId,
    agreementVersionId: version.agreementVersionId,
    dropdownLabel: "Almega Test 2026",
    actorId: DEMO_IDS.userId
  });

  const mappingSet = platform.createMappingSet({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    sourceSystem: "legacy_payroll",
    domainScope: "payroll",
    versionNo: 1,
    mappings: [
      { sourceField: "employee_no", targetField: "employeeId", transformCode: "identity" },
      { sourceField: "vacation_days", targetField: balanceTypeCode, transformCode: "identity" }
    ]
  });
  platform.approveMappingSet({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    mappingSetId: mappingSet.mappingSetId
  });

  const batch = platform.createPayrollMigrationBatch({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    sourceSystemCode: "legacy_payroll",
    migrationMode: "live",
    effectiveCutoverDate: "2026-04-01",
    firstTargetReportingPeriod: "2026-04",
    mappingSetId: mappingSet.mappingSetId,
    requiredBalanceTypeCodes: [balanceTypeCode],
    requiredApprovalRoleCodes: ["PAYROLL_OWNER"]
  });
  assert.equal(batch.status, "draft");

  const imported = platform.importEmployeeMigrationRecords({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    payrollMigrationBatchId: batch.payrollMigrationBatchId,
    records: [
      {
        personId: "legacy-employee-001",
        employeeId: employee.employeeId,
        employmentId: employment.employmentId,
        employeeMasterSnapshot: {
          sourceEmployeeNumber: "1001",
          displayName: "Paula Payroll",
          givenName: "Paula",
          familyName: "Payroll",
          taxProfileCode: "TABLE_32"
        },
        employmentHistory: [
          {
            startDate: "2026-01-01",
            employmentTypeCode: "permanent",
            jobTitle: "Payroll specialist",
            payModelCode: "monthly_salary",
            salaryBasisCode: "monthly",
            salaryAmountSek: 42000
          }
        ],
        ytdBasis: {
          grossCompensationSek: 120000,
          preliminaryTaxSek: 34000,
          employerContributionBasisSek: 120000,
          taxableBenefitsSek: 2200,
          pensionBasisSek: 120000,
          reportedThroughPeriod: "2026-03"
        },
        priorPayslipSummary: {
          lastNetPaySek: 28400
        },
        agiCarryForwardBasis: {
          reportedThroughPeriod: "2026-03",
          submissionReferences: ["AGI-2026-03"]
        },
        benefitHistory: [
          {
            benefitTypeCode: "CAR",
            reportedPeriod: "2026-03",
            taxableAmountSek: 2200,
            netDeductionSek: 0,
            sourceRecordRef: "benefit-row-2026-03"
          }
        ],
        travelHistory: [
          {
            travelTypeCode: "MILEAGE",
            reportedPeriod: "2026-03",
            taxFreeAmountSek: 1850,
            taxableAmountSek: 0,
            mileageKm: 370,
            sourceRecordRef: "travel-row-2026-03"
          }
        ],
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
            targetAreaCode: "benefit_history",
            sourceRecordRef: "benefit-row-2026-03",
            artifactType: "benefit_register",
            artifactRef: "evidence://benefit-row-2026-03"
          },
          {
            targetAreaCode: "travel_history",
            sourceRecordRef: "travel-row-2026-03",
            artifactType: "travel_claim",
            artifactRef: "evidence://travel-row-2026-03"
          }
        ],
        agreementCatalogEntryId: catalogEntry.agreementCatalogEntryId
      }
    ]
  });
  assert.equal(imported.employeeRecordCount, 1);
  assert.equal(imported.historyImportSummary.employeeCount, 1);
  assert.equal(imported.historyImportSummary.benefitHistoryItemCount, 1);
  assert.equal(imported.historyImportSummary.travelHistoryItemCount, 1);
  assert.equal(imported.historyEvidenceBundle.artifactCount, 6);

  platform.registerBalanceBaselines({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    payrollMigrationBatchId: batch.payrollMigrationBatchId,
    baselines: [
      {
        employeeId: employee.employeeId,
        employmentId: employment.employmentId,
        balanceTypeCode,
        openingQuantity: 12,
        effectiveDate: "2026-04-01"
      }
    ]
  });

  const validated = platform.validatePayrollMigrationBatch({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    payrollMigrationBatchId: batch.payrollMigrationBatchId
  });
  assert.equal(validated.status, "validated");
  assert.equal(validated.validationSummary.blockingIssueCount, 0);
  assert.equal(validated.historyImportSummary.employeesMissingEvidenceMappingCount, 0);
  assert.equal(validated.historyEvidenceBundle.status, "frozen");

  const diffResult = platform.calculatePayrollMigrationDiff({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    payrollMigrationBatchId: batch.payrollMigrationBatchId,
    sourceTotals: {
      netPaySek: 28400,
      preliminaryTaxSek: 34000
    },
    targetTotals: {
      netPaySek: 28350,
      preliminaryTaxSek: 34000
    },
    toleranceSek: 0
  });
  assert.equal(diffResult.summary.blockingCount, 1);

  const openDiffs = platform.getOpenPayrollMigrationDiffs({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    payrollMigrationBatchId: batch.payrollMigrationBatchId
  });
  assert.equal(openDiffs.length, 1);

  platform.decidePayrollMigrationDiff({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    payrollMigrationBatchId: batch.payrollMigrationBatchId,
    payrollMigrationDiffId: openDiffs[0].payrollMigrationDiffId,
    decision: "accepted",
    explanation: "Approved variance after signed source reconciliation."
  });

  const approved = platform.approvePayrollMigrationBatch({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    payrollMigrationBatchId: batch.payrollMigrationBatchId,
    approvalRoleCode: "payroll_owner"
  });
  assert.equal(approved.status, "approved_for_cutover");

  const executed = platform.executePayrollMigrationBatch({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    payrollMigrationBatchId: batch.payrollMigrationBatchId
  });
  assert.equal(executed.status, "cutover_executed");
  assert.equal(executed.executionReceipt.realizedBalanceTransactions.length, 1);
  assert.equal(executed.executionReceipt.historyImportSummary.agiSubmissionReferenceCount, 1);
  assert.ok(executed.executionReceipt.historyEvidenceBundleId);

  const account = platform
    .listBalanceAccounts({
      companyId: DEMO_IDS.companyId,
      balanceTypeCode,
      ownerTypeCode: "employment",
      employmentId: employment.employmentId
    })
    .at(0);
  const snapshotBeforeRollback = platform.getBalanceSnapshot({
    companyId: DEMO_IDS.companyId,
    balanceAccountId: account.balanceAccountId,
    cutoffDate: "2026-04-01"
  });
  assert.equal(snapshotBeforeRollback.currentQuantity, 12);

  const rolledBack = platform.rollbackPayrollMigrationBatch({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    payrollMigrationBatchId: batch.payrollMigrationBatchId,
    reasonCode: "parallel_run_mismatch"
  });
  assert.equal(rolledBack.status, "rolled_back");

  const snapshotAfterRollback = platform.getBalanceSnapshot({
    companyId: DEMO_IDS.companyId,
    balanceAccountId: account.balanceAccountId,
    cutoffDate: "2026-04-02"
  });
  assert.equal(snapshotAfterRollback.currentQuantity, 0);
});

test("Step 19 payroll migration blocks live validation when required history evidence mapping is missing", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T20:00:00Z")
  });
  const adminToken = loginWithStrongAuthOnPlatform({
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });

  const employee = platform.createEmployee({
    companyId: DEMO_IDS.companyId,
    givenName: "Elsa",
    familyName: "Evidence",
    identityType: "other",
    actorId: DEMO_IDS.userId
  });
  const employment = platform.createEmployment({
    companyId: DEMO_IDS.companyId,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Administrator",
    payModelCode: "monthly_salary",
    startDate: "2026-01-01",
    actorId: DEMO_IDS.userId
  });

  const batch = platform.createPayrollMigrationBatch({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    sourceSystemCode: "legacy_payroll",
    migrationMode: "live",
    effectiveCutoverDate: "2026-04-01",
    firstTargetReportingPeriod: "2026-04"
  });

  platform.importEmployeeMigrationRecords({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    payrollMigrationBatchId: batch.payrollMigrationBatchId,
    records: [
      {
        personId: "legacy-employee-002",
        employeeId: employee.employeeId,
        employmentId: employment.employmentId,
        employeeMasterSnapshot: {
          sourceEmployeeNumber: "1002",
          displayName: "Elsa Evidence"
        },
        employmentHistory: [
          {
            startDate: "2026-01-01",
            employmentTypeCode: "permanent",
            jobTitle: "Administrator",
            payModelCode: "monthly_salary"
          }
        ],
        ytdBasis: {
          grossCompensationSek: 80000,
          preliminaryTaxSek: 20000,
          employerContributionBasisSek: 80000,
          reportedThroughPeriod: "2026-03"
        },
        agiCarryForwardBasis: {
          reportedThroughPeriod: "2026-03",
          submissionReferences: ["AGI-2026-03-B"]
        }
      }
    ]
  });

  const validated = platform.validatePayrollMigrationBatch({
    sessionToken: adminToken,
    companyId: DEMO_IDS.companyId,
    payrollMigrationBatchId: batch.payrollMigrationBatchId
  });

  assert.equal(validated.validationSummary.blockingIssueCount, 1);
  assert.match(validated.validationSummary.issues[0].code, /payroll_migration_evidence_mapping_missing/);
});
