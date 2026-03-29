import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_IDS
} from "../../packages/domain-org-auth/src/index.mjs";
import { DYNAMICS365_PROJECT_OPERATIONS_PROVIDER_CODE } from "../../packages/domain-integrations/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 16.6 API exposes Dynamics 365 Project Operations manifests and imports projects through adapter flow", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T23:50:00Z")
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
    assert.equal(manifests.items.some((item) => item.providerCode === DYNAMICS365_PROJECT_OPERATIONS_PROVIDER_CODE), true);

    const connection = await requestJson(baseUrl, "/v1/integrations/connections", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        surfaceCode: "crm_handoff",
        connectionType: "crm_handoff",
        providerCode: DYNAMICS365_PROJECT_OPERATIONS_PROVIDER_CODE,
        displayName: "Dynamics 365 production",
        environmentMode: "production",
        credentialsRef: "secret://d365/prod",
        secretManagerRef: "vault://d365/prod"
      }
    });

    const importBatch = await requestJson(baseUrl, "/v1/projects/import-batches", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        adapterConnectionId: connection.connectionId,
        adapterProviderCode: DYNAMICS365_PROJECT_OPERATIONS_PROVIDER_CODE,
        adapterPayload: {
          customers: [
            {
              id: "d365-api-customer-16-6",
              name: "API Dynamics Customer AB",
              organizationNumber: "5561239876"
            }
          ],
          contracts: [
            {
              id: "d365-api-contract-16-6",
              contractNumber: "PC-266",
              customerId: "d365-api-customer-16-6",
              totalAmount: 175000
            }
          ],
          contractLines: [
            {
              id: "d365-api-line-16-6",
              billingMethod: "time and material",
              totalAmount: 175000
            }
          ],
          projects: [
            {
              id: "d365-api-project-16-6",
              contractId: "d365-api-contract-16-6",
              contractLineId: "d365-api-line-16-6",
              customerId: "d365-api-customer-16-6",
              name: "API Dynamics project",
              startDate: "2026-04-01"
            }
          ],
          actuals: [
            {
              id: "d365-api-actual-1",
              projectId: "d365-api-project-16-6",
              salesAmount: 41000
            }
          ],
          billingBacklogItems: [
            {
              id: "d365-api-backlog-1",
              projectId: "d365-api-project-16-6",
              billingType: "time",
              readyToInvoiceAmount: 28000,
              onAccountAmount: 8000
            }
          ]
        }
      }
    });

    assert.equal(importBatch.batchTypeCode, "crm_handoff");
    assert.equal(importBatch.sourceSystemCode, "dynamics365_project_operations");
    assert.equal(importBatch.adapterProviderCode, DYNAMICS365_PROJECT_OPERATIONS_PROVIDER_CODE);
    assert.equal(importBatch.sourcePayload[0].adapterContext.contractId, "d365-api-contract-16-6");
    assert.equal(importBatch.sourcePayload[0].adapterContext.readyToInvoiceAmount, 28000);

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
    assert.equal(importedProject.displayName, "API Dynamics project");
  } finally {
    await stopServer(server);
  }
});
