import test from "node:test";
import assert from "node:assert/strict";
import { createDocumentArchivePlatform } from "../../packages/domain-documents/src/index.mjs";
import { createReviewCenterPlatform } from "../../packages/domain-review-center/src/index.mjs";
import { createImportCasesEngine, DEMO_COMPANY_ID } from "../../packages/domain-import-cases/src/index.mjs";

test("Step 15 import cases block until customs evidence arrives and then approve the case", () => {
  const clock = () => new Date("2026-03-24T18:00:00Z");
  const documentPlatform = createDocumentArchivePlatform({ clock });
  const reviewCenterPlatform = createReviewCenterPlatform({ clock, seedDemo: true });
  const importCases = createImportCasesEngine({
    clock,
    seedDemo: false,
    documentPlatform,
    reviewCenterPlatform
  });

  const supplierDocument = documentPlatform.createDocumentRecord({
    companyId: DEMO_COMPANY_ID,
    documentType: "supplier_invoice",
    sourceReference: "import-supplier-001",
    actorId: "user_1"
  });
  const customsDocument = documentPlatform.createDocumentRecord({
    companyId: DEMO_COMPANY_ID,
    documentType: "supplier_invoice",
    sourceReference: "import-customs-001",
    actorId: "user_1"
  });

  const created = importCases.createImportCase({
    companyId: DEMO_COMPANY_ID,
    caseReference: "IMP-UNIT-001",
    goodsOriginCountry: "CN",
    customsReference: "CUST-001",
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
    ],
    actorId: "user_1"
  });

  assert.equal(created.status, "collecting_documents");
  assert.equal(created.completeness.status, "blocking");
  assert.deepEqual(created.completeness.blockingReasonCodes, ["CUSTOMS_EVIDENCE_MISSING"]);
  assert.equal(created.completeness.importVatBaseAmount, 12500);
  assert.equal(Boolean(created.reviewItemId), true);

  const idempotentLink = importCases.attachDocumentToImportCase({
    companyId: DEMO_COMPANY_ID,
    importCaseId: created.importCaseId,
    documentId: supplierDocument.documentId,
    roleCode: "PRIMARY_SUPPLIER_DOCUMENT",
    actorId: "user_1"
  });
  assert.equal(idempotentLink.documentLinks.length, 1);

  importCases.attachDocumentToImportCase({
    companyId: DEMO_COMPANY_ID,
    importCaseId: created.importCaseId,
    documentId: customsDocument.documentId,
    roleCode: "CUSTOMS_EVIDENCE",
    actorId: "user_1"
  });
  importCases.addImportCaseComponent({
    companyId: DEMO_COMPANY_ID,
    importCaseId: created.importCaseId,
    componentType: "CUSTOMS_DUTY",
    amount: 250,
    actorId: "user_1"
  });
  const withVat = importCases.addImportCaseComponent({
    companyId: DEMO_COMPANY_ID,
    importCaseId: created.importCaseId,
    componentType: "IMPORT_VAT",
    amount: 3187.5,
    actorId: "user_1"
  });

  assert.equal(withVat.status, "ready_for_review");
  assert.equal(withVat.completeness.status, "complete");
  assert.equal(withVat.completeness.importVatBaseAmount, 12750);
  assert.equal(withVat.completeness.importVatAmount, 3187.5);

  assert.throws(
    () =>
      importCases.approveImportCase({
        companyId: DEMO_COMPANY_ID,
        importCaseId: created.importCaseId,
        approvalNote: "Tullunderlag mottaget.",
        actorId: "user_1"
      }),
    (error) => error?.code === "import_case_review_center_required"
  );
  reviewCenterPlatform.claimReviewCenterItem({
    companyId: DEMO_COMPANY_ID,
    reviewItemId: created.reviewItemId,
    actorId: "user_1"
  });
  reviewCenterPlatform.decideReviewCenterItem({
    companyId: DEMO_COMPANY_ID,
    reviewItemId: created.reviewItemId,
    decisionCode: "approve",
    reasonCode: "import_case_complete",
    actorId: "user_1"
  });
  const approved = importCases.approveImportCase({
    companyId: DEMO_COMPANY_ID,
    importCaseId: created.importCaseId,
    approvalNote: "Tullunderlag mottaget.",
    actorId: "user_1",
    reviewCenterManaged: true
  });
  assert.equal(approved.status, "approved");
  assert.equal(approved.reviewRequired, false);

  const reviewItem = reviewCenterPlatform.getReviewCenterItem({
    companyId: DEMO_COMPANY_ID,
    reviewItemId: approved.reviewItemId
  });
  assert.equal(reviewItem.status, "approved");
});

test("Step 15 import cases prevent document reuse across active cases and preserve correction chain", () => {
  const clock = () => new Date("2026-03-24T18:30:00Z");
  const documentPlatform = createDocumentArchivePlatform({ clock });
  const reviewCenterPlatform = createReviewCenterPlatform({ clock, seedDemo: true });
  const importCases = createImportCasesEngine({
    clock,
    seedDemo: false,
    documentPlatform,
    reviewCenterPlatform
  });

  const supplierDocument = documentPlatform.createDocumentRecord({
    companyId: DEMO_COMPANY_ID,
    documentType: "supplier_invoice",
    sourceReference: "import-supplier-002",
    actorId: "user_2"
  });

  const firstCase = importCases.createImportCase({
    companyId: DEMO_COMPANY_ID,
    caseReference: "IMP-UNIT-002",
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
        amount: 1000
      }
    ],
    actorId: "user_2"
  });
  assert.equal(firstCase.status, "ready_for_review");

  const secondCase = importCases.createImportCase({
    companyId: DEMO_COMPANY_ID,
    caseReference: "IMP-UNIT-003",
    goodsOriginCountry: "SE",
    requiresCustomsEvidence: false,
    actorId: "user_2"
  });
  assert.equal(secondCase.status, "collecting_documents");

  assert.throws(
    () =>
      importCases.attachDocumentToImportCase({
        companyId: DEMO_COMPANY_ID,
        importCaseId: secondCase.importCaseId,
        documentId: supplierDocument.documentId,
        roleCode: "PRIMARY_SUPPLIER_DOCUMENT",
        actorId: "user_2"
      }),
    (error) => error?.code === "import_case_document_already_linked"
  );

  const correction = importCases.correctImportCase({
    companyId: DEMO_COMPANY_ID,
    importCaseId: firstCase.importCaseId,
    replacementCaseReference: "IMP-UNIT-002-CORR",
    actorId: "user_2",
    reasonCode: "manual_reclassification"
  });

  assert.equal(correction.priorCase.status, "corrected");
  assert.equal(correction.priorCase.correctedToImportCaseId, correction.replacementCase.importCaseId);
  assert.equal(correction.replacementCase.parentImportCaseId, firstCase.importCaseId);
  assert.equal(correction.replacementCase.documentLinks.length, 1);
  assert.equal(correction.replacementCase.documentLinks[0].documentId, supplierDocument.documentId);
});

test("Step 15 import cases create correction requests that block approval until explicitly rejected", () => {
  const clock = () => new Date("2026-03-28T15:30:00Z");
  const documentPlatform = createDocumentArchivePlatform({ clock });
  const reviewCenterPlatform = createReviewCenterPlatform({ clock, seedDemo: true });
  const importCases = createImportCasesEngine({
    clock,
    seedDemo: false,
    documentPlatform,
    reviewCenterPlatform
  });

  const supplierDocument = documentPlatform.createDocumentRecord({
    companyId: DEMO_COMPANY_ID,
    documentType: "supplier_invoice",
    sourceReference: "import-supplier-0104-001",
    actorId: "user_3"
  });

  const created = importCases.createImportCase({
    companyId: DEMO_COMPANY_ID,
    caseReference: "IMP-UNIT-0104-001",
    goodsOriginCountry: "SE",
    requiresCustomsEvidence: false,
    initialDocuments: [{ documentId: supplierDocument.documentId, roleCode: "PRIMARY_SUPPLIER_DOCUMENT" }],
    initialComponents: [{ componentType: "GOODS", amount: 5000 }],
    actorId: "user_3"
  });
  assert.equal(created.status, "ready_for_review");

  const correctionRequested = importCases.requestImportCaseCorrection({
    companyId: DEMO_COMPANY_ID,
    importCaseId: created.importCaseId,
    reasonCode: "component_mapping_incorrect",
    reasonNote: "Fel komponentstruktur.",
    evidenceRefs: ["document:import-supplier-0104-001", "note:component-split"],
    actorId: "user_3"
  });
  assert.equal(correctionRequested.completeness.status, "blocking");
  assert.deepEqual(correctionRequested.completeness.blockingReasonCodes, ["OPEN_CORRECTION_REQUESTS"]);
  assert.deepEqual(correctionRequested.correctionRequests[0].evidenceRefs, [
    "document:import-supplier-0104-001",
    "note:component-split"
  ]);

  assert.throws(
    () =>
      importCases.approveImportCase({
        companyId: DEMO_COMPANY_ID,
        importCaseId: created.importCaseId,
        actorId: "user_3"
      }),
    (error) => error?.code === "import_case_incomplete"
  );

  const decision = importCases.decideImportCaseCorrectionRequest({
    companyId: DEMO_COMPANY_ID,
    importCaseId: created.importCaseId,
    importCaseCorrectionRequestId: correctionRequested.correctionRequests[0].importCaseCorrectionRequestId,
    decisionCode: "reject",
    decisionNote: "Nuvarande mapping är korrekt.",
    actorId: "user_4"
  });
  assert.equal(decision.correctionRequest.status, "rejected");
  assert.equal(decision.importCase.completeness.status, "complete");
  assert.equal(decision.importCase.correctionRequests[0].decisionCode, "reject");
});

test("Step 15 import cases apply downstream idempotently and conflict on divergent mappings", () => {
  const clock = () => new Date("2026-03-28T16:00:00Z");
  const documentPlatform = createDocumentArchivePlatform({ clock });
  const reviewCenterPlatform = createReviewCenterPlatform({ clock, seedDemo: true });
  const importCases = createImportCasesEngine({
    clock,
    seedDemo: false,
    documentPlatform,
    reviewCenterPlatform
  });

  const supplierDocument = documentPlatform.createDocumentRecord({
    companyId: DEMO_COMPANY_ID,
    documentType: "supplier_invoice",
    sourceReference: "import-supplier-0104-002",
    actorId: "user_5"
  });

  const created = importCases.createImportCase({
    companyId: DEMO_COMPANY_ID,
    caseReference: "IMP-UNIT-0104-002",
    goodsOriginCountry: "SE",
    requiresCustomsEvidence: false,
    initialDocuments: [{ documentId: supplierDocument.documentId, roleCode: "PRIMARY_SUPPLIER_DOCUMENT" }],
    initialComponents: [{ componentType: "GOODS", amount: 7000 }],
    actorId: "user_5"
  });

  reviewCenterPlatform.claimReviewCenterItem({
    companyId: DEMO_COMPANY_ID,
    reviewItemId: created.reviewItemId,
    actorId: "user_5"
  });
  reviewCenterPlatform.decideReviewCenterItem({
    companyId: DEMO_COMPANY_ID,
    reviewItemId: created.reviewItemId,
    decisionCode: "approve",
    reasonCode: "import_case_complete",
    actorId: "user_5"
  });
  importCases.approveImportCase({
    companyId: DEMO_COMPANY_ID,
    importCaseId: created.importCaseId,
    approvalNote: "Klar för downstream.",
    actorId: "user_5",
    reviewCenterManaged: true
  });

  const applied = importCases.applyImportCase({
    companyId: DEMO_COMPANY_ID,
    importCaseId: created.importCaseId,
    targetDomainCode: "AP",
    targetObjectType: "supplier_invoice",
    targetObjectId: "ap_invoice_demo_001",
    appliedCommandKey: "ap-apply-001",
    payload: { lineCount: 1 },
    actorId: "user_5"
  });
  assert.equal(applied.status, "applied");
  assert.equal(applied.downstreamApplication.targetObjectId, "ap_invoice_demo_001");

  const replay = importCases.applyImportCase({
    companyId: DEMO_COMPANY_ID,
    importCaseId: created.importCaseId,
    targetDomainCode: "AP",
    targetObjectType: "supplier_invoice",
    targetObjectId: "ap_invoice_demo_001",
    appliedCommandKey: "ap-apply-001",
    payload: { lineCount: 1 },
    actorId: "user_5"
  });
  assert.equal(replay.status, "applied");

  assert.throws(
    () =>
      importCases.applyImportCase({
        companyId: DEMO_COMPANY_ID,
        importCaseId: created.importCaseId,
        targetDomainCode: "AP",
        targetObjectType: "supplier_invoice",
        targetObjectId: "ap_invoice_demo_002",
        appliedCommandKey: "ap-apply-002",
        payload: { lineCount: 2 },
        actorId: "user_5"
      }),
    (error) => error?.code === "import_case_downstream_mapping_conflict"
  );
});

test("Phase 9.4 import cases expose canonical search projections with correction and replacement lineage", () => {
  const clock = () => new Date("2026-04-01T10:00:00Z");
  const documentPlatform = createDocumentArchivePlatform({ clock });
  const reviewCenterPlatform = createReviewCenterPlatform({ clock, seedDemo: true });
  const importCases = createImportCasesEngine({
    clock,
    seedDemo: false,
    documentPlatform,
    reviewCenterPlatform
  });

  const supplierDocument = documentPlatform.createDocumentRecord({
    companyId: DEMO_COMPANY_ID,
    documentType: "supplier_invoice",
    sourceReference: "import-search-001",
    actorId: "user_6"
  });

  const created = importCases.createImportCase({
    companyId: DEMO_COMPANY_ID,
    caseReference: "IMP-SEARCH-001",
    goodsOriginCountry: "CN",
    customsReference: "CUST-SEARCH-001",
    initialDocuments: [{ documentId: supplierDocument.documentId, roleCode: "PRIMARY_SUPPLIER_DOCUMENT" }],
    initialComponents: [{ componentType: "GOODS", amount: 9400 }],
    actorId: "user_6"
  });

  importCases.requestImportCaseCorrection({
    companyId: DEMO_COMPANY_ID,
    importCaseId: created.importCaseId,
    reasonCode: "missing_evidence",
    reasonNote: "Tullunderlag saknas fortfarande.",
    evidenceRefs: [`document:${supplierDocument.documentId}`, "note:broker-statement-missing"],
    actorId: "user_6"
  });

  const contracts = importCases.listImportCaseSearchProjectionContracts({
    companyId: DEMO_COMPANY_ID
  });
  assert.equal(contracts.some((contract) => contract.projectionCode === "import_cases.import_case"), true);

  const documents = importCases.listImportCaseSearchProjectionDocuments({
    companyId: DEMO_COMPANY_ID
  });
  const projected = documents.find((item) => item.objectId === created.importCaseId);
  assert.equal(Boolean(projected), true);
  assert.equal(projected.objectType, "import_case");
  assert.equal(projected.displayTitle, "Import case IMP-SEARCH-001");
  assert.equal(projected.filterPayload.reviewBoundaryCode, "review_center.finance");
  assert.equal(projected.filterPayload.hasOpenCorrectionRequest, true);
  assert.equal(projected.workbenchPayload.blockerCodes.includes("open_correction_requests"), true);
  assert.equal(projected.detailPayload.sections.some((section) => section.sectionCode === "correctionRequests"), true);
  assert.equal(projected.detailPayload.relatedObjects.some((item) => item.objectType === "reviewItem"), true);
  assert.equal(projected.detailPayload.evidence.some((item) => item.evidenceId === "note:broker-statement-missing"), true);
  assert.equal(projected.detailPayload.auditRefs.auditEventIds.length > 0, true);
});
