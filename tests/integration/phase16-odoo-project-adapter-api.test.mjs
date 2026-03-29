import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_IDS
} from "../../packages/domain-org-auth/src/index.mjs";
import { ODOO_PROJECTS_BILLING_PROVIDER_CODE } from "../../packages/domain-integrations/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 16.6 API exposes Odoo project billing manifests and imports projects through adapter flow", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T23:15:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });

    for (const permissionCode of ["company.manage", "company.read"]) {
      platform.createObjectGrant({
        sessionToken: adminToken,
        companyId: DEMO_IDS.companyId,
        companyUserId: DEMO_IDS.companyUserId,
        permissionCode,
        objectType: "integration_connection",
        objectId: DEMO_IDS.companyId
      });
    }

    const manifests = await requestJson(
      baseUrl,
      `/v1/integrations/capability-manifests?companyId=${DEMO_IDS.companyId}&surfaceCode=crm_handoff`,
      { token: adminToken }
    );
    assert.equal(manifests.items.some((item) => item.providerCode === ODOO_PROJECTS_BILLING_PROVIDER_CODE), true);

    const connection = await requestJson(baseUrl, "/v1/integrations/connections", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        surfaceCode: "crm_handoff",
        connectionType: "crm_handoff",
        providerCode: ODOO_PROJECTS_BILLING_PROVIDER_CODE,
        displayName: "Odoo production",
        environmentMode: "production",
        credentialsRef: "secret://odoo/prod",
        secretManagerRef: "vault://odoo/prod"
      }
    });

    const importBatch = await requestJson(baseUrl, "/v1/projects/import-batches", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        adapterConnectionId: connection.connectionId,
        adapterProviderCode: ODOO_PROJECTS_BILLING_PROVIDER_CODE,
        adapterPayload: {
          partners: [
            {
              id: "odoo-api-partner-16-6",
              name: "API Odoo Customer AB",
              vat: "5569981122"
            }
          ],
          saleOrders: [
            {
              id: "odoo-api-so-16-6",
              name: "S000266",
              partnerId: "odoo-api-partner-16-6",
              amountTotal: 88000,
              confirmationDate: "2026-03-28T00:00:00.000Z"
            }
          ],
          saleOrderLines: [
            {
              id: "odoo-api-sol-16-6",
              saleOrderId: "odoo-api-so-16-6",
              name: "Managed services",
              invoicePolicy: "based_on_timesheets",
              priceTotal: 88000
            }
          ],
          projects: [
            {
              id: "odoo-api-project-16-6",
              saleOrderId: "odoo-api-so-16-6",
              saleOrderLineId: "odoo-api-sol-16-6",
              partnerId: "odoo-api-partner-16-6",
              name: "API Odoo project",
              plannedRevenue: 88000,
              dateStart: "2026-04-01"
            }
          ],
          timesheets: [
            {
              id: "odoo-api-ts-1",
              projectId: "odoo-api-project-16-6",
              unitAmount: 18,
              invoicedHours: 8
            }
          ],
          invoices: [
            {
              id: "odoo-api-invoice-1",
              projectId: "odoo-api-project-16-6",
              amountTotal: 19000
            }
          ]
        }
      }
    });

    assert.equal(importBatch.batchTypeCode, "crm_handoff");
    assert.equal(importBatch.sourceSystemCode, "odoo");
    assert.equal(importBatch.adapterProviderCode, ODOO_PROJECTS_BILLING_PROVIDER_CODE);
    assert.equal(importBatch.sourcePayload[0].adapterContext.invoicePolicy, "timesheets");
    assert.equal(importBatch.sourcePayload[0].adapterContext.saleOrderId, "odoo-api-so-16-6");

    const committedBatch = await requestJson(
      baseUrl,
      `/v1/projects/import-batches/${importBatch.projectImportBatchId}/commit`,
      {
        method: "POST",
        token: adminToken,
        body: {
          companyId: DEMO_IDS.companyId
        }
      }
    );

    assert.equal(committedBatch.status, "committed");
    assert.equal(committedBatch.importedProjectIds.length, 1);

    const importedProject = await requestJson(
      baseUrl,
      `/v1/projects/${committedBatch.importedProjectIds[0]}?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(importedProject.displayName, "API Odoo project");
  } finally {
    await stopServer(server);
  }
});
