import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_IDS
} from "../../packages/domain-org-auth/src/index.mjs";
import { CLICKUP_PROVIDER_CODE } from "../../packages/domain-integrations/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 16.6 API exposes ClickUp project adapter manifests and imports projects through adapter flow", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T21:50:00Z")
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
    assert.equal(manifests.items.some((item) => item.providerCode === CLICKUP_PROVIDER_CODE), true);

    const connection = await requestJson(baseUrl, "/v1/integrations/connections", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        surfaceCode: "crm_handoff",
        connectionType: "crm_handoff",
        providerCode: CLICKUP_PROVIDER_CODE,
        displayName: "ClickUp production",
        environmentMode: "production",
        credentialsRef: "secret://clickup/prod",
        secretManagerRef: "vault://clickup/prod"
      }
    });

    const importBatch = await requestJson(baseUrl, "/v1/projects/import-batches", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        adapterConnectionId: connection.connectionId,
        adapterProviderCode: CLICKUP_PROVIDER_CODE,
        adapterPayload: {
          spaces: [
            {
              id: "clickup-api-space-16-6",
              name: "API delivery"
            }
          ],
          folders: [
            {
              id: "clickup-api-folder-16-6",
              name: "API folder",
              spaceId: "clickup-api-space-16-6"
            }
          ],
          lists: [
            {
              id: "clickup-api-list-16-6",
              name: "API ClickUp list",
              folderId: "clickup-api-folder-16-6",
              customer: {
                name: "API ClickUp Customer AB",
                organization_number: "5562233113"
              },
              billingModel: "fixed_price",
              contractValue: 76000,
              start_date: "2026-04-01"
            }
          ],
          tasks: [
            {
              id: "clickup-api-task-1",
              listId: "clickup-api-list-16-6",
              name: "Execution board",
              assignees: [{ id: "clickup-api-user-1" }],
              due_date: "2026-04-12"
            }
          ],
          users: [
            { id: "clickup-api-user-1", username: "API ClickUp Owner" }
          ]
        }
      }
    });

    assert.equal(importBatch.batchTypeCode, "crm_handoff");
    assert.equal(importBatch.sourceSystemCode, "clickup");
    assert.equal(importBatch.adapterProviderCode, CLICKUP_PROVIDER_CODE);
    assert.equal(importBatch.sourcePayload[0].adapterContext.folderId, "clickup-api-folder-16-6");

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
    assert.equal(importedProject.displayName, "API ClickUp list");
  } finally {
    await stopServer(server);
  }
});
