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

  const approved = importCases.approveImportCase({
    companyId: DEMO_COMPANY_ID,
    importCaseId: created.importCaseId,
    approvalNote: "Tullunderlag mottaget.",
    actorId: "user_1"
  });
  assert.equal(approved.status, "approved");
  assert.equal(approved.reviewRequired, false);

  const reviewItem = reviewCenterPlatform.getReviewCenterItem({
    companyId: DEMO_COMPANY_ID,
    reviewItemId: approved.reviewItemId
  });
  assert.equal(reviewItem.status, "closed");
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
