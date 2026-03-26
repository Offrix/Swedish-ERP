import test from "node:test";
import assert from "node:assert/strict";
import { createSearchEngine } from "../../packages/domain-search/src/index.mjs";

test("Step 35 search exposes object profile and workbench contracts with normalized object types", async () => {
  const engine = createSearchEngine({
    clock: () => new Date("2026-03-25T12:00:00Z"),
    reportingPlatform: {
      listSearchProjectionContracts: () => [
        {
          projectionCode: "payroll.pay_run",
          objectType: "payRun",
          displayName: "Pay runs",
          sourceDomainCode: "reporting",
          visibilityScope: "company",
          surfaceCodes: ["desktop.search"],
          filterFieldCodes: ["reportingPeriod", "status"]
        }
      ],
      listSearchProjectionDocuments: () => [
        {
          projectionCode: "payroll.pay_run",
          objectId: "pr_1",
          objectType: "payRun",
          displayTitle: "Marslön 2026",
          displaySubtitle: "2026-03",
          documentStatus: "active",
          searchText: "Marslön 2026 payroll pay run",
          filterPayload: { reportingPeriod: "2026-03", status: "approved" },
          sourceVersion: "pay_run:pr_1:v1",
          sourceUpdatedAt: "2026-03-25T11:00:00Z"
        }
      ]
    }
  });

  const companyId = "company_phase35_1";
  const reindex = await engine.requestSearchReindex({
    companyId,
    actorId: "user_1"
  });
  assert.equal(reindex.reindexRequest.status, "completed");

  const profileContracts = engine.listObjectProfileContracts({ companyId });
  assert.equal(profileContracts.some((contract) => contract.objectType === "payRun"), true);
  assert.equal(profileContracts.some((contract) => contract.objectType === "project"), true);

  const payRunProfile = engine.getObjectProfile({
    companyId,
    objectType: "pay_run",
    objectId: "pr_1"
  });
  assert.equal(payRunProfile.profileType, "PayRunProfile");
  assert.equal(payRunProfile.objectType, "payRun");
  assert.equal(payRunProfile.header.title, "Marslön 2026");
  assert.equal(payRunProfile.projectionInfo.projectionCode, "payroll.pay_run");

  const workbenchContracts = engine.listWorkbenchContracts({ companyId });
  assert.equal(workbenchContracts.some((contract) => contract.workbenchCode === "PayrollWorkbench"), true);
  assert.equal(workbenchContracts.some((contract) => contract.workbenchCode === "ComplianceWorkbench"), true);

  const payrollWorkbench = engine.getWorkbench({
    companyId,
    workbenchCode: "PayrollWorkbench"
  });
  assert.equal(payrollWorkbench.workbenchCode, "PayrollWorkbench");
  assert.equal(payrollWorkbench.rows.length, 1);
  assert.equal(payrollWorkbench.rows[0].objectType, "payRun");
  assert.equal(payrollWorkbench.commandBar.availableCommands.some((command) => command.actionCode === "payroll.createRun"), true);
});
