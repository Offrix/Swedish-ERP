import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_IDS
} from "../../packages/domain-org-auth/src/index.mjs";
import { HUBSPOT_CRM_PROVIDER_CODE } from "../../packages/domain-integrations/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 16.6 API exposes HubSpot crm handoff manifests and imports projects through adapter flow", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-29T19:10:00Z")
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
    assert.equal(manifests.items.some((item) => item.providerCode === HUBSPOT_CRM_PROVIDER_CODE), true);

    const connection = await requestJson(baseUrl, "/v1/integrations/connections", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        surfaceCode: "crm_handoff",
        connectionType: "crm_handoff",
        providerCode: HUBSPOT_CRM_PROVIDER_CODE,
        displayName: "HubSpot production",
        environmentMode: "production",
        credentialsRef: "secret://hubspot/prod",
        secretManagerRef: "vault://hubspot/prod"
      }
    });
    assert.equal(connection.surfaceCode, "crm_handoff");

    for (const permissionCode of ["company.manage", "company.read"]) {
      platform.createObjectGrant({
        sessionToken: adminToken,
        companyId: DEMO_IDS.companyId,
        companyUserId: DEMO_IDS.companyUserId,
        permissionCode,
        objectType: "integration_connection",
        objectId: connection.connectionId
      });
    }

    const healthCheck = await requestJson(
      baseUrl,
      `/v1/integrations/connections/${connection.connectionId}/health-checks`,
      {
        method: "POST",
        token: adminToken,
        expectedStatus: 201,
        body: {
          companyId: DEMO_IDS.companyId,
          checkSetCode: "standard"
        }
      }
    );
    assert.equal(healthCheck.results.find((result) => result.checkCode === "credentials_configured")?.status, "passed");

    const importBatch = await requestJson(baseUrl, "/v1/projects/import-batches", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        adapterConnectionId: connection.connectionId,
        adapterProviderCode: HUBSPOT_CRM_PROVIDER_CODE,
        adapterPayload: {
          deals: [
            {
              id: "deal-api-16-6",
              properties: {
                dealname: "API HubSpot project",
                amount: 120000,
                pipeline: "sales",
                dealstage: "closedwon",
                closedate: "2026-03-28T00:00:00.000Z"
              },
              associations: {
                companies: {
                  results: [{ id: "company-api-16-6" }]
                }
              }
            }
          ],
          companies: [
            {
              id: "company-api-16-6",
              properties: {
                name: "API HubSpot Customer AB",
                organization_number: "5561234567"
              }
            }
          ],
          projectObjects: [
            {
              id: "project-api-16-6",
              properties: {
                deal_id: "deal-api-16-6",
                project_name: "API HubSpot project",
                project_code: "HUB-166",
                work_model_code: "fixed_scope",
                billing_model_code: "milestone",
                revenue_recognition_model_code: "over_time",
                project_start_date: "2026-04-01",
                contract_value_amount: 120000,
                requires_milestones: "true",
                billing_plan_lines: [
                  {
                    plannedInvoiceDate: "2026-04-30",
                    amount: 60000,
                    triggerCode: "manual"
                  },
                  {
                    plannedInvoiceDate: "2026-05-31",
                    amount: 60000,
                    triggerCode: "manual"
                  }
                ]
              }
            }
          ]
        }
      }
    });

    assert.equal(importBatch.batchTypeCode, "crm_handoff");
    assert.equal(importBatch.sourceSystemCode, "hubspot");
    assert.equal(importBatch.adapterProviderCode, HUBSPOT_CRM_PROVIDER_CODE);
    assert.equal(importBatch.sourcePayload[0].adapterContext.dealId, "deal-api-16-6");

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
    assert.equal(importedProject.displayName, "API HubSpot project");
  } finally {
    await stopServer(server);
  }
});
