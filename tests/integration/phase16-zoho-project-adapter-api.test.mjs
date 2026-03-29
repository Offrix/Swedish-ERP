import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_IDS
} from "../../packages/domain-org-auth/src/index.mjs";
import { ZOHO_CRM_PROJECTS_PROVIDER_CODE } from "../../packages/domain-integrations/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 16.6 API exposes Zoho CRM/Projects/Billing manifests and imports projects through adapter flow", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T22:40:00Z")
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
    assert.equal(manifests.items.some((item) => item.providerCode === ZOHO_CRM_PROJECTS_PROVIDER_CODE), true);

    const connection = await requestJson(baseUrl, "/v1/integrations/connections", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        surfaceCode: "crm_handoff",
        connectionType: "crm_handoff",
        providerCode: ZOHO_CRM_PROJECTS_PROVIDER_CODE,
        displayName: "Zoho production",
        environmentMode: "production",
        credentialsRef: "secret://zoho/prod",
        secretManagerRef: "vault://zoho/prod"
      }
    });

    const importBatch = await requestJson(baseUrl, "/v1/projects/import-batches", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        adapterConnectionId: connection.connectionId,
        adapterProviderCode: ZOHO_CRM_PROJECTS_PROVIDER_CODE,
        adapterPayload: {
          deals: [
            {
              id: "zoho-api-deal-16-6",
              name: "API Zoho deal",
              amount: 91000,
              contactId: "zoho-api-contact-16-6",
              closedDate: "2026-03-28T00:00:00.000Z"
            }
          ],
          contacts: [
            {
              id: "zoho-api-contact-16-6",
              accountName: "API Zoho Customer AB",
              organizationNumber: "5564433221",
              email: "api.customer@example.se"
            }
          ],
          projects: [
            {
              id: "zoho-api-project-16-6",
              dealId: "zoho-api-deal-16-6",
              name: "API Zoho project",
              billingMethod: "fixed_price",
              budgetAmount: 91000,
              startDate: "2026-04-01",
              status: "active",
              clientPortalEnabled: true
            }
          ],
          timesheets: [
            {
              id: "zoho-api-ts-1",
              projectId: "zoho-api-project-16-6",
              billableHours: 28,
              billedHours: 10
            }
          ],
          invoices: [
            {
              id: "zoho-api-invoice-1",
              projectId: "zoho-api-project-16-6",
              total: 21000
            }
          ]
        }
      }
    });

    assert.equal(importBatch.batchTypeCode, "crm_handoff");
    assert.equal(importBatch.sourceSystemCode, "zoho");
    assert.equal(importBatch.adapterProviderCode, ZOHO_CRM_PROJECTS_PROVIDER_CODE);
    assert.equal(importBatch.sourcePayload[0].adapterContext.invoiceCount, 1);
    assert.equal(importBatch.sourcePayload[0].adapterContext.billingMethod, "fixed_price");

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
    assert.equal(importedProject.displayName, "API Zoho project");
  } finally {
    await stopServer(server);
  }
});
