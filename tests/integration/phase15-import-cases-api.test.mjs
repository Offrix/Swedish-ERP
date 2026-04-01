import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { createDefaultJobHandlers, runWorkerBatch } from "../../apps/worker/src/worker.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Step 15 migration adds correction-request and downstream-apply storage for import cases", { concurrency: false }, async () => {
  const migration = await readText("packages/db/migrations/20260328160000_phase10_import_case_correction_and_apply.sql");
  assert.match(migration, /ALTER TABLE import_cases/i);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS application_status TEXT NOT NULL DEFAULT 'pending'/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS import_case_correction_requests/i);
  assert.match(migration, /replacement_import_case_id UUID NULL REFERENCES import_cases\(import_case_id\)/i);
  assert.match(migration, /ux_import_cases_applied_command/i);
});

test("Step 15 API exposes import case creation, document attachment, recalc and review-center approval", { concurrency: false }, async () => {
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
    assert.equal(root.routes.includes("/v1/import-cases/:importCaseId/correction-requests"), true);
    assert.equal(
      root.routes.includes("/v1/import-cases/:importCaseId/correction-requests/:importCaseCorrectionRequestId/decide"),
      true
    );
    assert.equal(root.routes.includes("/v1/import-cases/:importCaseId/apply"), true);

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

    const directApproveForbidden = await requestJson(baseUrl, `/v1/import-cases/${created.importCaseId}/approve`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        approvalNote: "Importfallet komplett."
      }
    });
    assert.equal(directApproveForbidden.error, "import_case_review_center_required");

    const reviewClaim = await requestJson(baseUrl, `/v1/review-center/items/${created.reviewItemId}/claim`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(reviewClaim.status, "claimed");

    const approved = await requestJson(baseUrl, `/v1/review-center/items/${created.reviewItemId}/approve`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "import_case_complete",
        note: "Importfallet komplett.",
        evidenceRefs: ["import_case:review-center-approved"]
      }
    });
    assert.equal(approved.status, "approved");
    assert.equal(approved.sourceObjectSnapshot.status, "approved");

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

test("Step 15 API drives import-case correction requests and replay-safe downstream apply", { concurrency: false }, async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-28T16:15:00Z")
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

    const supplierDocument = platform.createDocumentRecord({
      companyId: DEMO_IDS.companyId,
      documentType: "supplier_invoice",
      sourceReference: "api-import-supplier-0104-001",
      actorId: DEMO_IDS.userId
    });

    const created = await requestJson(baseUrl, "/v1/import-cases", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        caseReference: "IMP-API-0104-001",
        goodsOriginCountry: "SE",
        requiresCustomsEvidence: false,
        initialDocuments: [
          {
            documentId: supplierDocument.documentId,
            roleCode: "PRIMARY_SUPPLIER_DOCUMENT"
          }
        ],
        initialComponents: [
          {
            componentType: "GOODS",
            amount: 7800
          }
        ]
      }
    });
    assert.equal(created.status, "ready_for_review");

    const correctionRequested = await requestJson(
      baseUrl,
      `/v1/import-cases/${created.importCaseId}/correction-requests`,
      {
        method: "POST",
        token: adminToken,
        expectedStatus: 201,
        body: {
          companyId: DEMO_IDS.companyId,
          reasonCode: "component_mapping_incorrect",
          reasonNote: "Kontrollera downstream mapping.",
          evidenceRefs: ["document:api-import-supplier-0104-001", "note:downstream-check"]
        }
      }
    );
    assert.equal(correctionRequested.completeness.status, "blocking");
    assert.deepEqual(correctionRequested.completeness.blockingReasonCodes, ["OPEN_CORRECTION_REQUESTS"]);
    assert.equal(Boolean(correctionRequested.correctionRequests[0].reviewItemId), true);
    assert.deepEqual(correctionRequested.correctionRequests[0].evidenceRefs, [
      "document:api-import-supplier-0104-001",
      "note:downstream-check"
    ]);

    await requestJson(baseUrl, `/v1/import-cases/${created.importCaseId}/approve`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        approvalNote: "Ska stoppas."
      }
    });

    const correctionRequestId = correctionRequested.correctionRequests[0].importCaseCorrectionRequestId;
    const rejectedRequest = await requestJson(
      baseUrl,
      `/v1/import-cases/${created.importCaseId}/correction-requests/${correctionRequestId}/decide`,
      {
        method: "POST",
        token: adminToken,
        body: {
          companyId: DEMO_IDS.companyId,
          decisionCode: "reject",
          decisionNote: "Nuvarande importcase är korrekt."
        }
      }
    );
    assert.equal(rejectedRequest.status, "rejected");
    assert.equal(rejectedRequest.latestDecision.decisionCode, "reject");
    assert.equal(rejectedRequest.sourceObjectSnapshot.correctionRequest.status, "rejected");
    assert.equal(rejectedRequest.sourceObjectSnapshot.importCase.completeness.status, "complete");

    await requestJson(baseUrl, `/v1/review-center/items/${created.reviewItemId}/claim`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });

    const approved = await requestJson(baseUrl, `/v1/review-center/items/${created.reviewItemId}/approve`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        approvalNote: "Klar för apply."
      }
    });
    assert.equal(approved.status, "approved");
    assert.equal(approved.sourceObjectSnapshot?.status, "approved");

    const applied = await requestJson(baseUrl, `/v1/import-cases/${created.importCaseId}/apply`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        targetDomainCode: "AP",
        targetObjectType: "supplier_invoice",
        targetObjectId: "ap_invoice_api_0104_001",
        appliedCommandKey: "ap-apply-api-0104-001",
        payload: {
          lineCount: 1
        }
      }
    });
    assert.equal(applied.status, "applied");
    assert.equal(applied.downstreamApplication.targetObjectId, "ap_invoice_api_0104_001");

    const replay = await requestJson(baseUrl, `/v1/import-cases/${created.importCaseId}/apply`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        targetDomainCode: "AP",
        targetObjectType: "supplier_invoice",
        targetObjectId: "ap_invoice_api_0104_001",
        appliedCommandKey: "ap-apply-api-0104-001",
        payload: {
          lineCount: 1
        }
      }
    });
    assert.equal(replay.status, "applied");

    await requestJson(baseUrl, `/v1/import-cases/${created.importCaseId}/apply`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        targetDomainCode: "AP",
        targetObjectType: "supplier_invoice",
        targetObjectId: "ap_invoice_api_0104_002",
        appliedCommandKey: "ap-apply-api-0104-002",
        payload: {
          lineCount: 2
        }
      }
    });
  } finally {
    await stopServer(server);
  }
});

test("Phase 9.4 API reindexes import cases into search and object profiles", { concurrency: false }, async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-04-01T11:00:00Z")
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

    const supplierDocument = platform.createDocumentRecord({
      companyId: DEMO_IDS.companyId,
      documentType: "supplier_invoice",
      sourceReference: "api-import-search-001",
      actorId: DEMO_IDS.userId
    });

    const created = await requestJson(baseUrl, "/v1/import-cases", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        caseReference: "IMP-API-SEARCH-001",
        goodsOriginCountry: "CN",
        customsReference: "API-CUST-SEARCH-001",
        initialDocuments: [
          {
            documentId: supplierDocument.documentId,
            roleCode: "PRIMARY_SUPPLIER_DOCUMENT"
          }
        ],
        initialComponents: [
          {
            componentType: "GOODS",
            amount: 12100
          }
        ]
      }
    });

    await requestJson(baseUrl, `/v1/import-cases/${created.importCaseId}/correction-requests`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "missing_evidence",
        reasonNote: "Behöver tullunderlag.",
        evidenceRefs: [`document:${supplierDocument.documentId}`, "note:broker-statement-missing"]
      }
    });

    const reindex = await requestJson(baseUrl, `/v1/search/reindex`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(reindex.reindexRequest.status, "requested");

    const processed = await runWorkerBatch({
      platform,
      handlers: createDefaultJobHandlers({ logger: () => {} }),
      logger: () => {},
      workerId: "worker-phase9-4-import-search"
    });
    assert.equal(processed, 1);

    const contracts = await requestJson(baseUrl, `/v1/search/contracts?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(contracts.items.some((item) => item.projectionCode === "import_cases.import_case"), true);

    const search = await requestJson(
      baseUrl,
      `/v1/search/documents?companyId=${DEMO_IDS.companyId}&query=IMP-API-SEARCH-001`,
      { token: adminToken }
    );
    const importCaseDocument = search.items.find((item) => item.objectId === created.importCaseId);
    assert.equal(Boolean(importCaseDocument), true);
    assert.equal(importCaseDocument.objectType, "import_case");
    assert.equal(importCaseDocument.snippet.includes("open_correction_requests"), true);

    const objectProfile = await requestJson(
      baseUrl,
      `/v1/object-profiles/import_case/${created.importCaseId}?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(objectProfile.profileType, "ImportCaseProfile");
    assert.equal(objectProfile.evidence.some((item) => item.evidenceId === "note:broker-statement-missing"), true);
    assert.equal(
      objectProfile.sections.find((section) => section.sectionCode === "correctionRequests").fields.some((field) => field.fieldCode === "hasOpenCorrectionRequest" && field.value === true),
      true
    );
    assert.equal(
      objectProfile.sections
        .find((section) => section.sectionCode === "correctionRequests")
        .fields.some((field) => field.fieldCode === "correctionRequestReviewItemIds" && typeof field.value === "string" && field.value.length > 0),
      true
    );
    assert.equal(
      objectProfile.relatedObjects.some((item) => item.objectType === "reviewItem" && item.relationCode === "correction_request_review_item"),
      true
    );

    const financeWorkbench = await requestJson(
      baseUrl,
      `/v1/workbenches/FinanceWorkbench?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(financeWorkbench.rows.some((row) => row.objectType === "importCase" && row.objectId === created.importCaseId), true);
    assert.equal(financeWorkbench.counters.postingBlockedCount >= 1, true);
    assert.equal(financeWorkbench.counters.vatReviewCount >= 1, true);
  } finally {
    await stopServer(server);
  }
});
