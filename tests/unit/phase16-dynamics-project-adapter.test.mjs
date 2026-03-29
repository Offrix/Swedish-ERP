import test from "node:test";
import assert from "node:assert/strict";
import {
  createIntegrationEngine,
  DYNAMICS365_PROJECT_OPERATIONS_PROVIDER_CODE
} from "../../packages/domain-integrations/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 16.6 exposes Dynamics 365 Project Operations adapter manifest and prepares governed project import batches", () => {
  const platform = createIntegrationEngine({
    clock: () => new Date("2026-03-29T23:40:00Z")
  });

  const manifests = platform.listAdapterCapabilityManifests({
    surfaceCode: "crm_handoff"
  });
  const manifest = manifests.find((item) => item.providerCode === DYNAMICS365_PROJECT_OPERATIONS_PROVIDER_CODE);
  assert.ok(manifest);
  assert.equal(manifest.connectionType, "crm_handoff");
  assert.equal(manifest.trialSafe, true);
  assert.equal(manifest.sandboxSupported, true);

  const connection = platform.createIntegrationConnection({
    companyId: COMPANY_ID,
    surfaceCode: "crm_handoff",
    connectionType: "crm_handoff",
    providerCode: DYNAMICS365_PROJECT_OPERATIONS_PROVIDER_CODE,
    displayName: "Dynamics 365 Project Operations",
    environmentMode: "production",
    credentialsRef: "secret://d365/prod",
    secretManagerRef: "vault://d365/prod",
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
    providerCode: DYNAMICS365_PROJECT_OPERATIONS_PROVIDER_CODE,
    payload: {
      customers: [
        {
          id: "d365-customer-16-6",
          name: "Dynamics Customer AB",
          organizationNumber: "5565544332"
        }
      ],
      contracts: [
        {
          id: "d365-contract-16-6",
          contractNumber: "PC-166",
          customerId: "d365-customer-16-6",
          totalAmount: 240000,
          priceListCount: 1
        }
      ],
      contractLines: [
        {
          id: "d365-line-16-6",
          billingMethod: "time and material",
          totalAmount: 240000,
          fundingLimitAmount: 200000,
          lineNumber: "1"
        }
      ],
      projects: [
        {
          id: "d365-project-16-6",
          contractId: "d365-contract-16-6",
          contractLineId: "d365-line-16-6",
          customerId: "d365-customer-16-6",
          name: "Dynamics enterprise delivery",
          startDate: "2026-04-01"
        }
      ],
      actuals: [
        {
          id: "d365-actual-1",
          projectId: "d365-project-16-6",
          salesAmount: 86000
        }
      ],
      billingBacklogItems: [
        {
          id: "d365-backlog-1",
          projectId: "d365-project-16-6",
          billingType: "milestone",
          readyToInvoiceAmount: 52000,
          onAccountAmount: 12000,
          plannedInvoiceDate: "2026-05-10",
          name: "Go-live milestone"
        }
      ]
    },
    sourceExportCapturedAt: "2026-03-29T23:35:00.000Z"
  });

  assert.equal(preparedBatch.batchTypeCode, "crm_handoff");
  assert.equal(preparedBatch.adapterProviderCode, DYNAMICS365_PROJECT_OPERATIONS_PROVIDER_CODE);
  assert.equal(preparedBatch.adapterProviderBaselineCode, "SE-D365-PROJECT-OPERATIONS");
  assert.equal(preparedBatch.integrationConnectionId, connection.connectionId);
  assert.equal(preparedBatch.sourcePayload.length, 1);
  assert.equal(preparedBatch.sourcePayload[0].sourceSystemCode, "dynamics365_project_operations");
  assert.equal(preparedBatch.sourcePayload[0].billingModelCode, "time_and_material");
  assert.equal(preparedBatch.sourcePayload[0].contractValueAmount, 240000);
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.contractId, "d365-contract-16-6");
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.readyToInvoiceAmount, 52000);
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.unbilledActualAmount, 40000);
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.priceListCount, 1);
});
