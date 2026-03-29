import test from "node:test";
import assert from "node:assert/strict";
import {
  createIntegrationEngine,
  ODOO_PROJECTS_BILLING_PROVIDER_CODE
} from "../../packages/domain-integrations/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 16.6 exposes Odoo project billing adapter manifest and prepares governed project import batches", () => {
  const platform = createIntegrationEngine({
    clock: () => new Date("2026-03-29T23:05:00Z")
  });

  const manifests = platform.listAdapterCapabilityManifests({
    surfaceCode: "crm_handoff"
  });
  const manifest = manifests.find((item) => item.providerCode === ODOO_PROJECTS_BILLING_PROVIDER_CODE);
  assert.ok(manifest);
  assert.equal(manifest.connectionType, "crm_handoff");
  assert.equal(manifest.trialSafe, true);
  assert.equal(manifest.sandboxSupported, true);

  const connection = platform.createIntegrationConnection({
    companyId: COMPANY_ID,
    surfaceCode: "crm_handoff",
    connectionType: "crm_handoff",
    providerCode: ODOO_PROJECTS_BILLING_PROVIDER_CODE,
    displayName: "Odoo Projects Billing",
    environmentMode: "production",
    credentialsRef: "secret://odoo/prod",
    secretManagerRef: "vault://odoo/prod",
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
    providerCode: ODOO_PROJECTS_BILLING_PROVIDER_CODE,
    payload: {
      partners: [
        {
          id: "odoo-partner-16-6",
          name: "Odoo Customer AB",
          vat: "5566677889"
        }
      ],
      saleOrders: [
        {
          id: "odoo-so-16-6",
          name: "S000166",
          partnerId: "odoo-partner-16-6",
          amountTotal: 142000,
          confirmationDate: "2026-03-28T00:00:00.000Z"
        }
      ],
      saleOrderLines: [
        {
          id: "odoo-sol-16-6",
          saleOrderId: "odoo-so-16-6",
          name: "Consulting delivery",
          invoicePolicy: "based_on_timesheets",
          priceTotal: 142000,
          productCode: "CONSULT"
        }
      ],
      projects: [
        {
          id: "odoo-project-16-6",
          saleOrderId: "odoo-so-16-6",
          saleOrderLineId: "odoo-sol-16-6",
          partnerId: "odoo-partner-16-6",
          name: "Odoo T&M delivery",
          plannedRevenue: 142000,
          dateStart: "2026-04-01",
          analyticAccountId: "odoo-aa-16-6"
        }
      ],
      tasks: [
        {
          id: "odoo-task-1",
          projectId: "odoo-project-16-6",
          name: "Build milestone",
          isMilestone: true,
          deadline: "2026-05-15"
        }
      ],
      timesheets: [
        {
          id: "odoo-ts-1",
          projectId: "odoo-project-16-6",
          unitAmount: 32,
          invoicedHours: 12
        }
      ],
      invoices: [
        {
          id: "odoo-invoice-1",
          projectId: "odoo-project-16-6",
          amountTotal: 52000
        }
      ]
    },
    sourceExportCapturedAt: "2026-03-29T23:00:00.000Z"
  });

  assert.equal(preparedBatch.batchTypeCode, "crm_handoff");
  assert.equal(preparedBatch.adapterProviderCode, ODOO_PROJECTS_BILLING_PROVIDER_CODE);
  assert.equal(preparedBatch.adapterProviderBaselineCode, "SE-ODOO-PROJECTS-BILLING");
  assert.equal(preparedBatch.integrationConnectionId, connection.connectionId);
  assert.equal(preparedBatch.sourcePayload.length, 1);
  assert.equal(preparedBatch.sourcePayload[0].sourceSystemCode, "odoo");
  assert.equal(preparedBatch.sourcePayload[0].billingModelCode, "time_and_material");
  assert.equal(preparedBatch.sourcePayload[0].contractValueAmount, 142000);
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.saleOrderId, "odoo-so-16-6");
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.invoicePolicy, "timesheets");
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.uninvoicedHours, 20);
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.invoiceCount, 1);
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.remainingAmount, 90000);
});
