import test from "node:test";
import assert from "node:assert/strict";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";
import { createProjectsPlatform } from "../../packages/domain-projects/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 14.2 posts over-time contract assets via project WIP ledger bridge and stays idempotent per period", () => {
  const clock = () => new Date("2026-04-30T09:00:00Z");
  const invoiceState = [];
  const evidencePlatform = createEvidencePlatform();
  const ledgerPlatform = createLedgerPlatform({ clock, seedDemo: false });
  ledgerPlatform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "phase14-2-unit"
  });
  ledgerPlatform.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "phase14-2-unit"
  });
  const projectsPlatform = createProjectsPlatform({
    clock,
    seedDemo: false,
    ledgerPlatform,
    evidencePlatform,
    arPlatform: {
      listInvoices() {
        return invoiceState.map((record) => structuredClone(record));
      }
    }
  });

  const project = createProjectFinanceBaseline({
    projectsPlatform,
    billingModelCode: "fixed_price",
    revenueRecognitionModelCode: "over_time"
  });
  projectsPlatform.createProjectBudgetVersion({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    budgetName: "Baseline",
    validFrom: "2026-04-01",
    lines: [
      { lineKind: "revenue", categoryCode: "revenue", reportingPeriod: "202604", amount: 60000 },
      { lineKind: "cost", categoryCode: "other_cost", reportingPeriod: "202604", amount: 12000 }
    ],
    actorId: "phase14-2-unit"
  });
  const revenuePlan = projectsPlatform.createProjectRevenuePlan({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    versionLabel: "baseline",
    lines: [
      {
        recognitionDate: "2026-04-30",
        triggerTypeCode: "manual",
        amount: 60000,
        note: "April recognition"
      }
    ],
    actorId: "phase14-2-unit"
  });
  projectsPlatform.approveProjectRevenuePlan({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectRevenuePlanId: revenuePlan.projectRevenuePlanId,
    actorId: "phase14-2-unit"
  });

  const dimensions = ledgerPlatform.listLedgerDimensions({ companyId: COMPANY_ID });
  assert.equal(dimensions.projects.some((entry) => entry.code === project.projectId && entry.sourceDomain === "projects"), true);

  const recognitionPlan = projectsPlatform.createProjectRevenueRecognitionPlan({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    actorId: "phase14-2-unit"
  });
  const activePlan = projectsPlatform.activateRevenueRecognitionPlan({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectRevenueRecognitionPlanId: recognitionPlan.projectRevenueRecognitionPlanId,
    actorId: "phase14-2-unit"
  });
  assert.equal(activePlan.status, "active");

  const firstBridge = projectsPlatform.bridgeProjectWipToLedger({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-04-30",
    actorId: "phase14-2-unit"
  });
  assert.equal(firstBridge.status, "posted");
  assert.equal(firstBridge.recognizedRevenueTargetAmount, 60000);
  assert.equal(firstBridge.targetContractAssetAmount, 60000);
  assert.equal(firstBridge.deltaContractAssetAmount, 60000);
  assert.equal(firstBridge.targetDeferredRevenueAmount, 0);
  assert.equal(firstBridge.targetCostWipAmount, 0);

  const firstJournal = ledgerPlatform.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: firstBridge.journalEntryId
  });
  assert.equal(firstJournal.lines.some((line) => line.accountNumber === "1620" && line.debitAmount === 60000), true);
  assert.equal(firstJournal.lines.some((line) => line.accountNumber === "3090" && line.creditAmount === 60000), true);
  assert.equal(firstJournal.lines.every((line) => line.dimensionJson?.projectId === project.projectId), true);

  const replayBridge = projectsPlatform.bridgeProjectWipToLedger({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-04-30",
    actorId: "phase14-2-unit"
  });
  assert.equal(replayBridge.projectWipLedgerBridgeId, firstBridge.projectWipLedgerBridgeId);

  invoiceState.push({
    invoiceId: "invoice-phase14-2-1",
    status: "issued",
    issueDate: "2026-05-15",
    lines: [
      {
        invoiceLineId: "invoice-line-phase14-2-1",
        projectId: project.projectId,
        lineAmount: 20000
      }
    ]
  });

  const secondBridge = projectsPlatform.bridgeProjectWipToLedger({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-05-31",
    actorId: "phase14-2-unit"
  });
  assert.notEqual(secondBridge.projectWipLedgerBridgeId, firstBridge.projectWipLedgerBridgeId);
  assert.equal(secondBridge.targetContractAssetAmount, 40000);
  assert.equal(secondBridge.deltaContractAssetAmount, -20000);
  const secondJournal = ledgerPlatform.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: secondBridge.journalEntryId
  });
  assert.equal(secondJournal.lines.some((line) => line.accountNumber === "3090" && line.debitAmount === 20000), true);
  assert.equal(secondJournal.lines.some((line) => line.accountNumber === "1620" && line.creditAmount === 20000), true);

  const workspace = projectsPlatform.getProjectWorkspace({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-05-31"
  });
  assert.equal(workspace.currentProjectRevenueRecognitionPlan.projectRevenueRecognitionPlanId, recognitionPlan.projectRevenueRecognitionPlanId);
  assert.equal(workspace.currentProjectWipLedgerBridge.projectWipLedgerBridgeId, secondBridge.projectWipLedgerBridgeId);
  assert.equal(workspace.warningCodes.includes("revenue_recognition_plan_missing"), false);
  assert.equal(workspace.warningCodes.includes("wip_ledger_bridge_missing"), false);

  const evidence = projectsPlatform.exportProjectEvidenceBundle({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-05-31",
    actorId: "phase14-2-unit"
  });
  assert.equal(evidence.currentProjectRevenueRecognitionPlan.projectRevenueRecognitionPlanId, recognitionPlan.projectRevenueRecognitionPlanId);
  assert.equal(evidence.currentProjectWipLedgerBridge.projectWipLedgerBridgeId, secondBridge.projectWipLedgerBridgeId);
  assert.equal(evidence.projectWipLedgerBridges.length, 2);
});

test("Phase 14.2 capitalizes deferred-until-milestone project costs as cost WIP before revenue is recognized", () => {
  const clock = () => new Date("2026-04-30T10:00:00Z");
  let projectId = null;
  const ledgerPlatform = createLedgerPlatform({ clock, seedDemo: false });
  ledgerPlatform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "phase14-2-unit"
  });
  ledgerPlatform.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "phase14-2-unit"
  });
  const projectsPlatform = createProjectsPlatform({
    clock,
    seedDemo: false,
    ledgerPlatform,
    apPlatform: {
      listSupplierInvoices() {
        if (!projectId) {
          return [];
        }
        return [
          {
            supplierInvoiceId: "ap-phase14-2-1",
            status: "posted",
            invoiceType: "invoice",
            invoiceDate: "2026-04-20",
            lines: [
              {
                supplierInvoiceLineId: "ap-phase14-2-line-1",
                netAmount: 15000,
                expenseAccountNumber: "4090",
                dimensionsJson: {
                  projectId
                }
              }
            ]
          }
        ];
      }
    }
  });

  const project = createProjectFinanceBaseline({
    projectsPlatform,
    billingModelCode: "milestone",
    revenueRecognitionModelCode: "deferred_until_milestone"
  });
  projectId = project.projectId;
  projectsPlatform.createProjectBudgetVersion({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    budgetName: "Milestone budget",
    validFrom: "2026-04-01",
    lines: [
      { lineKind: "cost", categoryCode: "material", reportingPeriod: "202604", amount: 15000 },
      { lineKind: "revenue", categoryCode: "revenue", reportingPeriod: "202606", amount: 50000 }
    ],
    actorId: "phase14-2-unit"
  });
  const revenuePlan = projectsPlatform.createProjectRevenuePlan({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    versionLabel: "milestone",
    lines: [
      {
        recognitionDate: "2026-06-30",
        triggerTypeCode: "milestone_acceptance",
        amount: 50000,
        note: "Milestone acceptance"
      }
    ],
    actorId: "phase14-2-unit"
  });
  projectsPlatform.approveProjectRevenuePlan({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectRevenuePlanId: revenuePlan.projectRevenuePlanId,
    actorId: "phase14-2-unit"
  });
  const recognitionPlan = projectsPlatform.createProjectRevenueRecognitionPlan({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    actorId: "phase14-2-unit"
  });
  projectsPlatform.activateRevenueRecognitionPlan({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectRevenueRecognitionPlanId: recognitionPlan.projectRevenueRecognitionPlanId,
    actorId: "phase14-2-unit"
  });

  const bridge = projectsPlatform.bridgeProjectWipToLedger({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-04-30",
    actorId: "phase14-2-unit"
  });
  assert.equal(bridge.recognizedRevenueTargetAmount, 0);
  assert.equal(bridge.targetContractAssetAmount, 0);
  assert.equal(bridge.targetDeferredRevenueAmount, 0);
  assert.equal(bridge.targetCostWipAmount, 15000);
  assert.equal(bridge.deltaCostWipAmount, 15000);

  const journal = ledgerPlatform.getJournalEntry({
    companyId: COMPANY_ID,
    journalEntryId: bridge.journalEntryId
  });
  assert.equal(journal.lines.some((line) => line.accountNumber === "1440" && line.debitAmount === 15000), true);
  assert.equal(journal.lines.some((line) => line.accountNumber === "4070" && line.creditAmount === 15000), true);
  assert.equal(journal.lines.every((line) => line.dimensionJson?.projectId === project.projectId), true);

  const workspace = projectsPlatform.getProjectWorkspace({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-04-30"
  });
  assert.equal(workspace.currentProjectWipLedgerBridge.projectWipLedgerBridgeId, bridge.projectWipLedgerBridgeId);
  assert.equal(workspace.currentProjectRevenueRecognitionPlan.projectRevenueRecognitionPlanId, recognitionPlan.projectRevenueRecognitionPlanId);
});

function createProjectFinanceBaseline({
  projectsPlatform,
  billingModelCode,
  revenueRecognitionModelCode
}) {
  const project = projectsPlatform.createProject({
    companyId: COMPANY_ID,
    projectCode: `P-${billingModelCode}-${revenueRecognitionModelCode}`.replaceAll("_", "-").toUpperCase(),
    projectReferenceCode: `phase14-2-${billingModelCode}-${revenueRecognitionModelCode}`.replaceAll("_", "-"),
    displayName: `Phase 14.2 ${billingModelCode}`,
    startsOn: "2026-04-01",
    status: "active",
    billingModelCode,
    revenueRecognitionModelCode,
    contractValueAmount: 100000,
    actorId: "phase14-2-unit"
  });
  projectsPlatform.createProjectAgreement({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    agreementNo: `AGR-${project.projectCode}`,
    title: "Signed baseline agreement",
    status: "signed",
    commercialModelCode: "project_core_generic",
    billingModelCode,
    revenueRecognitionModelCode,
    signedOn: "2026-04-01",
    effectiveFrom: "2026-04-01",
    contractValueAmount: 100000,
    actorId: "phase14-2-unit"
  });
  return project;
}

function createEvidencePlatform() {
  return {
    createFrozenEvidenceBundleSnapshot({ sourceObjectId, metadata }) {
      return {
        evidenceBundleId: `bundle-${sourceObjectId}`,
        checksum: `checksum-${sourceObjectId}-${JSON.stringify(metadata).length}`,
        status: "frozen",
        frozenAt: "2026-05-31T10:00:00.000Z",
        archivedAt: null
      };
    }
  };
}
