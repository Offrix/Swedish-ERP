import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_IDS
} from "../../packages/domain-org-auth/src/index.mjs";
import { MONDAY_WORK_MANAGEMENT_PROVIDER_CODE } from "../../packages/domain-integrations/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 16.6 API exposes monday work management manifests and imports projects through adapter flow", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T20:20:00Z")
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
    assert.equal(manifests.items.some((item) => item.providerCode === MONDAY_WORK_MANAGEMENT_PROVIDER_CODE), true);

    const connection = await requestJson(baseUrl, "/v1/integrations/connections", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        surfaceCode: "crm_handoff",
        connectionType: "crm_handoff",
        providerCode: MONDAY_WORK_MANAGEMENT_PROVIDER_CODE,
        displayName: "monday production",
        environmentMode: "production",
        credentialsRef: "secret://monday/prod",
        secretManagerRef: "vault://monday/prod"
      }
    });
    assert.equal(connection.surfaceCode, "crm_handoff");

    const importBatch = await requestJson(baseUrl, "/v1/projects/import-batches", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        adapterConnectionId: connection.connectionId,
        adapterProviderCode: MONDAY_WORK_MANAGEMENT_PROVIDER_CODE,
        adapterPayload: {
          boards: [
            {
              id: "monday-api-board-16-6",
              name: "API monday board",
              portfolioId: "monday-api-portfolio-16-6",
              customer: {
                name: "API monday Customer AB",
                organization_number: "5565567780"
              },
              billingModel: "fixed_price",
              contractValue: 99000,
              startDate: "2026-04-01"
            }
          ],
          portfolios: [
            {
              id: "monday-api-portfolio-16-6",
              name: "API portfolio"
            }
          ],
          items: [
            {
              id: "monday-api-item-1",
              boardId: "monday-api-board-16-6",
              name: "Execution lane",
              status: "working_on_it",
              dueDate: "2026-04-15",
              assigneeIds: ["user-api-1"]
            },
            {
              id: "monday-api-item-2",
              boardId: "monday-api-board-16-6",
              name: "Approval gate",
              status: "done",
              isMilestone: true,
              dueDate: "2026-04-30",
              assigneeIds: ["user-api-2"]
            }
          ],
          workloadAllocations: [
            {
              boardId: "monday-api-board-16-6",
              personId: "user-api-1",
              plannedHours: 12,
              capacityHours: 16
            }
          ],
          users: [
            {
              id: "user-api-1",
              name: "API PM"
            },
            {
              id: "user-api-2",
              name: "API Approver"
            }
          ]
        }
      }
    });

    assert.equal(importBatch.batchTypeCode, "crm_handoff");
    assert.equal(importBatch.sourceSystemCode, "monday");
    assert.equal(importBatch.adapterProviderCode, MONDAY_WORK_MANAGEMENT_PROVIDER_CODE);
    assert.equal(importBatch.sourcePayload[0].adapterContext.portfolioId, "monday-api-portfolio-16-6");

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
    assert.equal(importedProject.displayName, "API monday board");
  } finally {
    await stopServer(server);
  }
});
