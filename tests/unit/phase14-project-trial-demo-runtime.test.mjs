import test from "node:test";
import assert from "node:assert/strict";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";
import { createVatPlatform } from "../../packages/domain-vat/src/index.mjs";
import { createArPlatform } from "../../packages/domain-ar/src/index.mjs";
import { createProjectsPlatform } from "../../packages/domain-projects/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 14.7 project trial scenarios, imports, invoice simulation and live conversion are first-class runtime objects", () => {
  const { projectsPlatform, arPlatform } = createFixture();

  const scenarios = projectsPlatform.listProjectTrialScenarios({
    companyId: COMPANY_ID
  });
  assert.equal(scenarios.some((scenario) => scenario.scenarioCode === "consulting_time_and_milestone"), true);
  assert.equal(scenarios.some((scenario) => scenario.scenarioCode === "retainer_capacity_agency"), true);

  const scenarioRun = projectsPlatform.materializeProjectTrialScenario({
    companyId: COMPANY_ID,
    scenarioCode: "consulting_time_and_milestone",
    startsOn: "2026-06-01",
    actorId: "unit-test"
  });

  assert.equal(scenarioRun.status, "materialized");
  assert.equal(scenarioRun.supportsLegalEffect, false);
  assert.equal(scenarioRun.project.displayName, "Consulting delivery demo");
  assert.equal(scenarioRun.project.customerId != null, true);
  assert.equal(scenarioRun.billingPlan.status, "active");
  const trialCustomer = arPlatform.getCustomer({
    companyId: COMPANY_ID,
    customerId: scenarioRun.project.customerId
  });
  assert.match(trialCustomer.organizationNumber, /^\d{10}$/);

  const simulation = projectsPlatform.createProjectInvoiceSimulation({
    companyId: COMPANY_ID,
    projectId: scenarioRun.project.projectId,
    cutoffDate: "2026-06-20",
    actorId: "unit-test"
  });

  assert.equal(simulation.legalEffectFlag, false);
  assert.equal(simulation.providerDispatchAllowedFlag, false);
  assert.equal(simulation.totals.totalAmount, 85000);
  assert.equal(simulation.lines.length > 0, true);

  const liveConversionPlan = projectsPlatform.createProjectLiveConversionPlan({
    companyId: COMPANY_ID,
    projectId: scenarioRun.project.projectId,
    projectTrialScenarioRunId: scenarioRun.projectTrialScenarioRunId,
    projectInvoiceSimulationId: simulation.projectInvoiceSimulationId,
    trialEnvironmentProfileId: "trial-env-14-7",
    actorId: "unit-test"
  });

  assert.equal(liveConversionPlan.status, "ready");
  assert.equal(liveConversionPlan.requiresTrialPromotion, true);
  assert.equal(liveConversionPlan.portableDataBundle.projectMasterdata.projectId, scenarioRun.project.projectId);
  assert.equal(liveConversionPlan.forbiddenArtifactCodes.includes("project_invoice_simulation"), true);

  const batch = projectsPlatform.createProjectImportBatch({
    companyId: COMPANY_ID,
    sourceSystemCode: "hubspot",
    batchTypeCode: "project_migration",
    importModeCode: "trial_seed",
    sourcePayload: [
      {
        sourceSystemCode: "hubspot",
        externalProjectId: "deal-147",
        displayName: "Imported CRM project",
        customerLegalName: "Imported CRM Customer AB",
        workModelCode: "time_only",
        billingModelCode: "time_and_material",
        revenueRecognitionModelCode: "billing_equals_revenue",
        startsOn: "2026-06-10",
        contractValueAmount: 45000,
        externalOpportunityId: "hubspot-deal-147",
        externalOpportunityRef: "Deal 147",
        billingPlanLines: [
          {
            plannedInvoiceDate: "2026-06-30",
            amount: 45000,
            triggerCode: "manual",
            note: "Imported CRM invoice line"
          }
        ]
      }
    ],
    actorId: "unit-test"
  });

  const committed = projectsPlatform.commitProjectImportBatch({
    companyId: COMPANY_ID,
    projectImportBatchId: batch.projectImportBatchId,
    actorId: "unit-test"
  });

  assert.equal(committed.status, "committed");
  assert.equal(committed.importedProjectIds.length, 1);
  const importedProject = projectsPlatform.getProject({
    companyId: COMPANY_ID,
    projectId: committed.importedProjectIds[0]
  });
  assert.equal(importedProject.displayName, "Imported CRM project");

  const workspace = projectsPlatform.getProjectWorkspace({
    companyId: COMPANY_ID,
    projectId: scenarioRun.project.projectId,
    cutoffDate: "2026-06-20"
  });
  assert.equal(workspace.trialScenarioRunCount, 1);
  assert.equal(workspace.invoiceSimulationCount, 1);
  assert.equal(workspace.liveConversionPlanCount, 1);
  assert.equal(workspace.currentProjectLiveConversionPlan.status, "ready");

  const auditActions = projectsPlatform.listProjectAuditEvents({
    companyId: COMPANY_ID,
    projectId: scenarioRun.project.projectId
  }).map((event) => event.action);
  for (const action of [
    "project.trial_scenario.materialized",
    "project.invoice_simulation.materialized",
    "project.live_conversion_plan.created"
  ]) {
    assert.equal(auditActions.includes(action), true, `${action} should be audited`);
  }
});

function createFixture() {
  const clock = () => new Date("2026-06-01T08:00:00Z");
  const ledgerPlatform = createLedgerPlatform({ clock });
  ledgerPlatform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "unit-test"
  });
  const vatPlatform = createVatPlatform({
    clock,
    bootstrapScenarioCode: "test_default_demo",
    ledgerPlatform
  });
  const arPlatform = createArPlatform({
    clock,
    vatPlatform,
    ledgerPlatform
  });
  const projectsPlatform = createProjectsPlatform({
    clock,
    seedDemo: false,
    arPlatform
  });
  return {
    projectsPlatform,
    arPlatform
  };
}
