import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_IDS
} from "../../packages/domain-org-auth/src/index.mjs";
import { TEAMLEADER_FOCUS_PROVIDER_CODE } from "../../packages/domain-integrations/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 16.6 API exposes Teamleader Focus crm handoff manifests and imports projects through adapter flow", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T19:50:00Z")
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
    assert.equal(manifests.items.some((item) => item.providerCode === TEAMLEADER_FOCUS_PROVIDER_CODE), true);

    const connection = await requestJson(baseUrl, "/v1/integrations/connections", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        surfaceCode: "crm_handoff",
        connectionType: "crm_handoff",
        providerCode: TEAMLEADER_FOCUS_PROVIDER_CODE,
        displayName: "Teamleader production",
        environmentMode: "production",
        credentialsRef: "secret://teamleader/prod",
        secretManagerRef: "vault://teamleader/prod"
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
        adapterProviderCode: TEAMLEADER_FOCUS_PROVIDER_CODE,
        adapterPayload: {
          deals: [
            {
              id: "tl-api-deal-16-6",
              title: "API Teamleader deal",
              customer: {
                name: "API Teamleader Customer AB",
                organization_number: "5562233445"
              },
              createdAt: "2026-03-27T00:00:00.000Z"
            }
          ],
          quotations: [
            {
              id: "tl-api-quotation-16-6",
              dealId: "tl-api-deal-16-6",
              title: "API quotation",
              number: "Q-API-166",
              acceptedAt: "2026-03-28T00:00:00.000Z",
              totalPrice: {
                amount: 73000
              }
            }
          ],
          projects: [
            {
              id: "tl-api-project-16-6",
              dealId: "tl-api-deal-16-6",
              title: "API Teamleader project",
              billingMethod: "fixed_price",
              startsOn: "2026-04-01",
              reference: "TL-API-166"
            }
          ]
        }
      }
    });

    assert.equal(importBatch.batchTypeCode, "crm_handoff");
    assert.equal(importBatch.sourceSystemCode, "teamleader");
    assert.equal(importBatch.adapterProviderCode, TEAMLEADER_FOCUS_PROVIDER_CODE);
    assert.equal(importBatch.sourcePayload[0].adapterContext.quotationId, "tl-api-quotation-16-6");

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
    assert.equal(importedProject.displayName, "API Teamleader project");
  } finally {
    await stopServer(server);
  }
});
