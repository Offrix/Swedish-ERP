import test from "node:test";
import assert from "node:assert/strict";
import {
  createIntegrationEngine,
  HUBSPOT_CRM_PROVIDER_CODE
} from "../../packages/domain-integrations/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 16.6 exposes HubSpot crm handoff manifest and prepares governed project import batches", () => {
  const platform = createIntegrationEngine({
    clock: () => new Date("2026-03-29T19:00:00Z")
  });

  const manifests = platform.listAdapterCapabilityManifests({
    surfaceCode: "crm_handoff"
  });
  const manifest = manifests.find((item) => item.providerCode === HUBSPOT_CRM_PROVIDER_CODE);
  assert.ok(manifest);
  assert.equal(manifest.connectionType, "crm_handoff");
  assert.equal(manifest.trialSafe, true);
  assert.equal(manifest.sandboxSupported, true);

  const connection = platform.createIntegrationConnection({
    companyId: COMPANY_ID,
    surfaceCode: "crm_handoff",
    connectionType: "crm_handoff",
    providerCode: HUBSPOT_CRM_PROVIDER_CODE,
    displayName: "HubSpot CRM",
    environmentMode: "production",
    credentialsRef: "secret://hubspot/prod",
    secretManagerRef: "vault://hubspot/prod",
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
    providerCode: HUBSPOT_CRM_PROVIDER_CODE,
    payload: {
      deals: [
        {
          id: "deal-16-6",
          properties: {
            dealname: "CRM handoff project",
            amount: 95000,
            pipeline: "sales",
            dealstage: "closedwon",
            closedate: "2026-03-25T00:00:00.000Z"
          },
          associations: {
            companies: {
              results: [{ id: "company-16-6" }]
            }
          }
        }
      ],
      companies: [
        {
          id: "company-16-6",
          properties: {
            name: "HubSpot Customer AB",
            organization_number: "5566778899"
          }
        }
      ],
      projectObjects: [
        {
          id: "project-object-16-6",
          properties: {
            deal_id: "deal-16-6",
            project_name: "CRM handoff project",
            project_code: "CRM-166",
            work_model_code: "fixed_scope",
            billing_model_code: "milestone",
            revenue_recognition_model_code: "over_time",
            project_start_date: "2026-04-01",
            project_end_date: "2026-06-30",
            contract_value_amount: 95000,
            requires_milestones: "true",
            billing_plan_lines: [
              { plannedInvoiceDate: "2026-04-30", amount: 45000, triggerCode: "manual" },
              { plannedInvoiceDate: "2026-05-31", amount: 50000, triggerCode: "manual" }
            ]
          }
        }
      ]
    },
    sourceExportCapturedAt: "2026-03-29T18:55:00.000Z"
  });

  assert.equal(preparedBatch.batchTypeCode, "crm_handoff");
  assert.equal(preparedBatch.importModeCode, "review_required");
  assert.equal(preparedBatch.adapterProviderCode, HUBSPOT_CRM_PROVIDER_CODE);
  assert.equal(preparedBatch.integrationConnectionId, connection.connectionId);
  assert.equal(preparedBatch.adapterProviderBaselineCode, "SE-HUBSPOT-CRM-OBJECTS");
  assert.equal(preparedBatch.sourcePayload.length, 1);
  assert.equal(preparedBatch.sourcePayload[0].providerCode, HUBSPOT_CRM_PROVIDER_CODE);
  assert.equal(preparedBatch.sourcePayload[0].providerBaselineCode, "SE-HUBSPOT-CRM-OBJECTS");
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.dealId, "deal-16-6");
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.customObjectId, "project-object-16-6");
  assert.equal(preparedBatch.sourcePayload[0].externalOpportunityId, "deal-16-6");
  assert.equal(preparedBatch.sourcePayload[0].contractValueAmount, 95000);
});
