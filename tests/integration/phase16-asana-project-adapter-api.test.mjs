import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_IDS
} from "../../packages/domain-org-auth/src/index.mjs";
import { ASANA_PROVIDER_CODE } from "../../packages/domain-integrations/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 16.6 API exposes Asana project adapter manifests and imports projects through adapter flow", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T21:10:00Z")
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
    assert.equal(manifests.items.some((item) => item.providerCode === ASANA_PROVIDER_CODE), true);

    const connection = await requestJson(baseUrl, "/v1/integrations/connections", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        surfaceCode: "crm_handoff",
        connectionType: "crm_handoff",
        providerCode: ASANA_PROVIDER_CODE,
        displayName: "Asana production",
        environmentMode: "production",
        credentialsRef: "secret://asana/prod",
        secretManagerRef: "vault://asana/prod"
      }
    });

    const importBatch = await requestJson(baseUrl, "/v1/projects/import-batches", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        adapterConnectionId: connection.connectionId,
        adapterProviderCode: ASANA_PROVIDER_CODE,
        adapterPayload: {
          projects: [
            {
              gid: "asana-api-project-16-6",
              name: "API Asana project",
              portfolioId: "asana-api-portfolio-16-6",
              customer: {
                name: "API Asana Customer AB",
                organization_number: "5563344554"
              },
              billingModel: "fixed_price",
              contractValue: 87000,
              start_on: "2026-04-01"
            }
          ],
          portfolios: [
            {
              gid: "asana-api-portfolio-16-6",
              name: "API portfolio"
            }
          ],
          tasks: [
            {
              gid: "asana-api-task-1",
              projectId: "asana-api-project-16-6",
              name: "Execution",
              assignee: { gid: "asana-api-user-1" },
              due_on: "2026-04-12"
            },
            {
              gid: "asana-api-task-2",
              projectId: "asana-api-project-16-6",
              name: "Milestone signoff",
              assignee: { gid: "asana-api-user-2" },
              resource_subtype: "milestone",
              due_on: "2026-04-30"
            }
          ],
          users: [
            { gid: "asana-api-user-1", name: "API Owner" },
            { gid: "asana-api-user-2", name: "API Approver" }
          ]
        }
      }
    });

    assert.equal(importBatch.batchTypeCode, "crm_handoff");
    assert.equal(importBatch.sourceSystemCode, "asana");
    assert.equal(importBatch.adapterProviderCode, ASANA_PROVIDER_CODE);
    assert.equal(importBatch.sourcePayload[0].adapterContext.portfolioId, "asana-api-portfolio-16-6");

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
    assert.equal(importedProject.displayName, "API Asana project");
  } finally {
    await stopServer(server);
  }
});
