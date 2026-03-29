import test from "node:test";
import assert from "node:assert/strict";
import {
  createIntegrationEngine,
  MONDAY_WORK_MANAGEMENT_PROVIDER_CODE
} from "../../packages/domain-integrations/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 16.6 exposes monday work management manifest and prepares governed project import batches", () => {
  const platform = createIntegrationEngine({
    clock: () => new Date("2026-03-29T20:10:00Z")
  });

  const manifests = platform.listAdapterCapabilityManifests({
    surfaceCode: "crm_handoff"
  });
  const manifest = manifests.find((item) => item.providerCode === MONDAY_WORK_MANAGEMENT_PROVIDER_CODE);
  assert.ok(manifest);
  assert.equal(manifest.connectionType, "crm_handoff");
  assert.equal(manifest.trialSafe, true);
  assert.equal(manifest.sandboxSupported, true);

  const connection = platform.createIntegrationConnection({
    companyId: COMPANY_ID,
    surfaceCode: "crm_handoff",
    connectionType: "crm_handoff",
    providerCode: MONDAY_WORK_MANAGEMENT_PROVIDER_CODE,
    displayName: "monday.com work management",
    environmentMode: "production",
    credentialsRef: "secret://monday/prod",
    secretManagerRef: "vault://monday/prod",
    actorId: "phase16-6-unit"
  });

  const healthCheck = platform.runIntegrationHealthCheck({
    companyId: COMPANY_ID,
    connectionId: connection.connectionId,
    actorId: "phase16-6-unit"
  });
  assert.equal(healthCheck.results.some((result) => result.status === "failed"), false);
  assert.equal(healthCheck.results.find((result) => result.checkCode === "credentials_configured")?.status, "passed");

  const preparedBatch = platform.prepareProjectImportBatchFromAdapter({
    companyId: COMPANY_ID,
    connectionId: connection.connectionId,
    providerCode: MONDAY_WORK_MANAGEMENT_PROVIDER_CODE,
    payload: {
      boards: [
        {
          id: "monday-board-16-6",
          name: "Portfolio delivery board",
          url: "https://example.monday.com/boards/16-6",
          portfolioId: "portfolio-16-6",
          customer: {
            name: "monday Customer AB",
            organization_number: "5561122334"
          },
          billingModel: "fixed_price",
          contractValue: 145000,
          startDate: "2026-04-01",
          endDate: "2026-06-30",
          healthStatus: "at_risk"
        }
      ],
      portfolios: [
        {
          id: "portfolio-16-6",
          name: "Q2 enterprise delivery",
          code: "MON-PORT-166"
        }
      ],
      items: [
        {
          id: "monday-item-1",
          boardId: "monday-board-16-6",
          name: "Kickoff",
          status: "working_on_it",
          dueDate: "2026-04-05",
          assigneeIds: ["user-1"],
          loggedHours: 4
        },
        {
          id: "monday-item-2",
          boardId: "monday-board-16-6",
          name: "Migration rehearsal",
          status: "stuck",
          dueDate: "2026-03-20",
          assigneeIds: ["user-1", "user-2"]
        },
        {
          id: "monday-item-3",
          boardId: "monday-board-16-6",
          name: "Go-live signoff",
          status: "done",
          isMilestone: true,
          dueDate: "2026-05-31",
          assigneeIds: ["user-3"],
          loggedHours: 2
        }
      ],
      workloadAllocations: [
        {
          boardId: "monday-board-16-6",
          personId: "user-1",
          plannedHours: 20,
          capacityHours: 16
        },
        {
          boardId: "monday-board-16-6",
          personId: "user-2",
          plannedHours: 18,
          capacityHours: 16
        }
      ],
      timeEntries: [
        {
          boardId: "monday-board-16-6",
          itemId: "monday-item-1",
          hours: 4
        },
        {
          boardId: "monday-board-16-6",
          itemId: "monday-item-3",
          hours: 2
        }
      ],
      riskSignals: [
        {
          boardId: "monday-board-16-6",
          severity: "high",
          title: "Portfolio dependency risk"
        }
      ],
      users: [
        { id: "user-1", name: "Alice PM" },
        { id: "user-2", name: "Bob Delivery" },
        { id: "user-3", name: "Charlie Finance" }
      ]
    },
    sourceExportCapturedAt: "2026-03-29T20:00:00.000Z"
  });

  assert.equal(preparedBatch.batchTypeCode, "crm_handoff");
  assert.equal(preparedBatch.adapterProviderCode, MONDAY_WORK_MANAGEMENT_PROVIDER_CODE);
  assert.equal(preparedBatch.adapterProviderBaselineCode, "SE-MONDAY-WORK-MANAGEMENT-PROJECTS");
  assert.equal(preparedBatch.integrationConnectionId, connection.connectionId);
  assert.equal(preparedBatch.sourcePayload.length, 1);
  assert.equal(preparedBatch.sourcePayload[0].displayName, "Portfolio delivery board");
  assert.equal(preparedBatch.sourcePayload[0].providerCode, MONDAY_WORK_MANAGEMENT_PROVIDER_CODE);
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.portfolioId, "portfolio-16-6");
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.openItemCount, 2);
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.completedItemCount, 1);
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.overdueItemCount, 1);
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.workloadPressureCode, "over_capacity");
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.riskSeverity, "high");
  assert.equal(preparedBatch.sourcePayload[0].contractValueAmount, 145000);
});
