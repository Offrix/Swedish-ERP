import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Step 15 API exposes import case creation, document attachment, recalc and approval", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T18:45:00Z")
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

    const root = await requestJson(baseUrl, "/", { token: adminToken });
    assert.equal(root.routes.includes("/v1/import-cases"), true);
    assert.equal(root.routes.includes("/v1/import-cases/:importCaseId/approve"), true);

    const supplierDocument = platform.createDocumentRecord({
      companyId: DEMO_IDS.companyId,
      documentType: "supplier_invoice",
      sourceReference: "api-import-supplier-001",
      actorId: DEMO_IDS.userId
    });
    const customsDocument = platform.createDocumentRecord({
      companyId: DEMO_IDS.companyId,
      documentType: "supplier_invoice",
      sourceReference: "api-import-customs-001",
      actorId: DEMO_IDS.userId
    });

    const created = await requestJson(baseUrl, "/v1/import-cases", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        caseReference: "IMP-API-001",
        goodsOriginCountry: "CN",
        customsReference: "IMP-CUST-API-001",
        initialDocuments: [
          {
            documentId: supplierDocument.documentId,
            roleCode: "PRIMARY_SUPPLIER_DOCUMENT"
          }
        ],
        initialComponents: [
          {
            componentType: "GOODS",
            amount: 10000
          },
          {
            componentType: "FREIGHT",
            amount: 2500
          }
        ]
      }
    });

    assert.equal(created.status, "collecting_documents");
    assert.deepEqual(created.completeness.blockingReasonCodes, ["CUSTOMS_EVIDENCE_MISSING"]);

    await requestJson(baseUrl, `/v1/import-cases/${created.importCaseId}/attach-document`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        documentId: customsDocument.documentId,
        roleCode: "CUSTOMS_EVIDENCE"
      }
    });

    await requestJson(baseUrl, `/v1/import-cases/${created.importCaseId}/components`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        componentType: "CUSTOMS_DUTY",
        amount: 250
      }
    });

    await requestJson(baseUrl, `/v1/import-cases/${created.importCaseId}/components`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        componentType: "IMPORT_VAT",
        amount: 3187.5
      }
    });

    const recalculated = await requestJson(baseUrl, `/v1/import-cases/${created.importCaseId}/recalculate`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(recalculated.status, "ready_for_review");
    assert.equal(recalculated.completeness.status, "complete");
    assert.equal(recalculated.completeness.importVatBaseAmount, 12750);
    assert.equal(recalculated.completeness.importVatAmount, 3187.5);

    const approved = await requestJson(baseUrl, `/v1/import-cases/${created.importCaseId}/approve`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        approvalNote: "Importfallet komplett."
      }
    });
    assert.equal(approved.status, "approved");

    const fetched = await requestJson(
      baseUrl,
      `/v1/import-cases/${created.importCaseId}?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(fetched.status, "approved");
    assert.equal(fetched.documentLinks.length, 2);
    assert.equal(fetched.components.length, 4);
  } finally {
    await stopServer(server);
  }
});
