import test from "node:test";
import assert from "node:assert/strict";
import {
  createIntegrationEngine,
  ZOHO_CRM_PROJECTS_PROVIDER_CODE
} from "../../packages/domain-integrations/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 16.6 exposes Zoho CRM/Projects/Billing adapter manifest and prepares governed project import batches", () => {
  const platform = createIntegrationEngine({
    clock: () => new Date("2026-03-29T22:30:00Z")
  });

  const manifests = platform.listAdapterCapabilityManifests({
    surfaceCode: "crm_handoff"
  });
  const manifest = manifests.find((item) => item.providerCode === ZOHO_CRM_PROJECTS_PROVIDER_CODE);
  assert.ok(manifest);
  assert.equal(manifest.connectionType, "crm_handoff");
  assert.equal(manifest.trialSafe, true);
  assert.equal(manifest.sandboxSupported, true);

  const connection = platform.createIntegrationConnection({
    companyId: COMPANY_ID,
    surfaceCode: "crm_handoff",
    connectionType: "crm_handoff",
    providerCode: ZOHO_CRM_PROJECTS_PROVIDER_CODE,
    displayName: "Zoho CRM/Projects/Billing",
    environmentMode: "production",
    credentialsRef: "secret://zoho/prod",
    secretManagerRef: "vault://zoho/prod",
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
    providerCode: ZOHO_CRM_PROJECTS_PROVIDER_CODE,
    payload: {
      deals: [
        {
          id: "zoho-deal-16-6",
          name: "Zoho managed service win",
          amount: 125000,
          contactId: "zoho-contact-16-6",
          closedDate: "2026-03-28T00:00:00.000Z"
        }
      ],
      contacts: [
        {
          id: "zoho-contact-16-6",
          accountName: "Zoho Customer AB",
          organizationNumber: "5561020304",
          email: "customer@example.se"
        }
      ],
      projects: [
        {
          id: "zoho-project-16-6",
          dealId: "zoho-deal-16-6",
          name: "Zoho billing migration",
          billingMethod: "fixed_price",
          budgetAmount: 125000,
          startDate: "2026-04-01",
          endDate: "2026-06-30",
          status: "active",
          hasMilestones: true,
          nextMilestoneTitle: "Go-live cutover",
          nextMilestoneDate: "2026-05-31",
          clientPortalEnabled: true
        }
      ],
      timesheets: [
        {
          id: "zoho-ts-1",
          projectId: "zoho-project-16-6",
          billableHours: 40,
          nonBillableHours: 4,
          billedHours: 24
        }
      ],
      invoices: [
        {
          id: "zoho-invoice-1",
          projectId: "zoho-project-16-6",
          total: 65000
        }
      ]
    },
    sourceExportCapturedAt: "2026-03-29T22:25:00.000Z"
  });

  assert.equal(preparedBatch.batchTypeCode, "crm_handoff");
  assert.equal(preparedBatch.adapterProviderCode, ZOHO_CRM_PROJECTS_PROVIDER_CODE);
  assert.equal(preparedBatch.adapterProviderBaselineCode, "SE-ZOHO-CRM-PROJECTS-BILLING");
  assert.equal(preparedBatch.integrationConnectionId, connection.connectionId);
  assert.equal(preparedBatch.sourcePayload.length, 1);
  assert.equal(preparedBatch.sourcePayload[0].sourceSystemCode, "zoho");
  assert.equal(preparedBatch.sourcePayload[0].displayName, "Zoho billing migration");
  assert.equal(preparedBatch.sourcePayload[0].billingModelCode, "fixed_price");
  assert.equal(preparedBatch.sourcePayload[0].contractValueAmount, 125000);
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.invoiceCount, 1);
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.billedAmount, 65000);
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.unbilledHours, 16);
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.clientPortalEnabled, true);
});
