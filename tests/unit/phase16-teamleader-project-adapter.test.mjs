import test from "node:test";
import assert from "node:assert/strict";
import {
  createIntegrationEngine,
  TEAMLEADER_FOCUS_PROVIDER_CODE
} from "../../packages/domain-integrations/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 16.6 exposes Teamleader Focus crm handoff manifest and prepares governed project import batches", () => {
  const platform = createIntegrationEngine({
    clock: () => new Date("2026-03-29T19:40:00Z")
  });

  const manifests = platform.listAdapterCapabilityManifests({
    surfaceCode: "crm_handoff"
  });
  const manifest = manifests.find((item) => item.providerCode === TEAMLEADER_FOCUS_PROVIDER_CODE);
  assert.ok(manifest);
  assert.equal(manifest.connectionType, "crm_handoff");
  assert.equal(manifest.trialSafe, true);
  assert.equal(manifest.sandboxSupported, true);

  const connection = platform.createIntegrationConnection({
    companyId: COMPANY_ID,
    surfaceCode: "crm_handoff",
    connectionType: "crm_handoff",
    providerCode: TEAMLEADER_FOCUS_PROVIDER_CODE,
    displayName: "Teamleader Focus",
    environmentMode: "production",
    credentialsRef: "secret://teamleader/prod",
    secretManagerRef: "vault://teamleader/prod",
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
    providerCode: TEAMLEADER_FOCUS_PROVIDER_CODE,
    payload: {
      deals: [
        {
          id: "tl-deal-16-6",
          title: "Service delivery quote",
          customer: {
            name: "Teamleader Customer AB",
            organization_number: "5569988776"
          },
          createdAt: "2026-03-20T00:00:00.000Z"
        }
      ],
      quotations: [
        {
          id: "tl-quotation-16-6",
          dealId: "tl-deal-16-6",
          title: "Quoted onboarding package",
          number: "Q-166",
          acceptedAt: "2026-03-28T00:00:00.000Z",
          totalPrice: {
            amount: 88000
          }
        }
      ],
      projects: [
        {
          id: "tl-project-16-6",
          dealId: "tl-deal-16-6",
          title: "Service delivery project",
          billingMethod: "fixed_price",
          startsOn: "2026-04-01",
          endDate: "2026-05-31",
          reference: "TL-166"
        }
      ],
      workOrders: [
        {
          id: "tl-wo-16-6",
          projectId: "tl-project-16-6"
        }
      ]
    },
    sourceExportCapturedAt: "2026-03-29T19:35:00.000Z"
  });

  assert.equal(preparedBatch.batchTypeCode, "crm_handoff");
  assert.equal(preparedBatch.adapterProviderCode, TEAMLEADER_FOCUS_PROVIDER_CODE);
  assert.equal(preparedBatch.adapterProviderBaselineCode, "SE-TEAMLEADER-FOCUS-CRM-PROJECTS");
  assert.equal(preparedBatch.integrationConnectionId, connection.connectionId);
  assert.equal(preparedBatch.sourcePayload.length, 1);
  assert.equal(preparedBatch.sourcePayload[0].displayName, "Service delivery project");
  assert.equal(preparedBatch.sourcePayload[0].providerCode, TEAMLEADER_FOCUS_PROVIDER_CODE);
  assert.equal(preparedBatch.sourcePayload[0].workModelCode, "service_order");
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.quotationId, "tl-quotation-16-6");
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.workOrderCount, 1);
  assert.equal(preparedBatch.sourcePayload[0].contractValueAmount, 88000);
});
