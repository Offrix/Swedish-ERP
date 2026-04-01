import test from "node:test";
import assert from "node:assert/strict";
import { createDocumentArchivePlatform } from "../../packages/domain-documents/src/index.mjs";
import { createReviewCenterPlatform } from "../../packages/domain-review-center/src/index.mjs";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createBenefitsPlatform } from "../../packages/domain-benefits/src/index.mjs";
import { createPayrollPlatform } from "../../packages/domain-payroll/src/index.mjs";
import { createDocumentClassificationEngine, DEMO_COMPANY_ID } from "../../packages/domain-document-classification/src/index.mjs";

test("Step 14 document classification approves and dispatches deterministic wellness to benefits", () => {
  const clock = () => new Date("2026-03-24T16:00:00Z");
  const documentPlatform = createDocumentArchivePlatform({ clock });
  const reviewCenterPlatform = createReviewCenterPlatform({ clock, seedDemo: true });
  const hrPlatform = createHrPlatform({ clock, seedDemo: false, documentPlatform });
  const benefitsPlatform = createBenefitsPlatform({ clock, seedDemo: true, hrPlatform, documentPlatform });
  const classification = createDocumentClassificationEngine({
    clock,
    seedDemo: false,
    documentPlatform,
    reviewCenterPlatform,
    benefitsPlatform
  });

  const employee = hrPlatform.createEmployee({
    companyId: DEMO_COMPANY_ID,
    givenName: "Ada",
    familyName: "Lovelace",
    workEmail: "ada@example.test",
    actorId: "user_1"
  });
  const employment = hrPlatform.createEmployment({
    companyId: DEMO_COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Consultant",
    payModelCode: "monthly",
    startDate: "2026-01-01",
    actorId: "user_1"
  });
  const document = documentPlatform.createDocumentRecord({
    companyId: DEMO_COMPANY_ID,
    documentType: "expense_receipt",
    sourceReference: "wellness-unit-001",
    actorId: "user_1",
    metadataJson: {
      totalAmount: 3200
    }
  });

  const classificationCase = classification.createClassificationCase({
    companyId: DEMO_COMPANY_ID,
    documentId: document.documentId,
    actorId: "user_1",
    lineInputs: [
      {
        lineType: "document_total",
        description: "Friskvardskvitto",
        amount: 3200,
        treatmentCode: "WELLNESS_ALLOWANCE",
        person: {
          employeeId: employee.employeeId,
          employmentId: employment.employmentId,
          personRelationCode: "employee"
        },
        factsJson: {
          benefitCode: "WELLNESS_ALLOWANCE",
          activityType: "gym",
          activityDate: "2026-03-24",
          vendorName: "Demo Gym AB",
          equalTermsOffered: true,
          providedAsGiftCard: false,
          carryOverFromPriorYear: false,
          reimbursementAmount: 3200,
          calendarYearGrantedBeforeEvent: 0
        }
      }
    ]
  });

  assert.equal(classificationCase.requiresReview, false);
  assert.equal(classificationCase.status, "suggested");
  assert.equal(classificationCase.treatmentIntents[0].status, "draft");

  const approved = classification.approveClassificationCase({
    companyId: DEMO_COMPANY_ID,
    classificationCaseId: classificationCase.classificationCaseId,
    actorId: "user_1"
  });
  assert.equal(approved.status, "approved");
  assert.equal(approved.treatmentIntents[0].status, "approved");

  const dispatched = classification.dispatchTreatmentIntents({
    companyId: DEMO_COMPANY_ID,
    classificationCaseId: classificationCase.classificationCaseId,
    actorId: "user_1"
  });
  assert.equal(dispatched.status, "dispatched");
  assert.equal(dispatched.dispatchStatus.summary.realizedCount, 1);

  const benefitEvents = benefitsPlatform.listBenefitEvents({
    companyId: DEMO_COMPANY_ID,
    employmentId: employment.employmentId
  });
  assert.equal(benefitEvents.length, 1);
  assert.equal(benefitEvents[0].benefitCode, "WELLNESS_ALLOWANCE");
  assert.equal(benefitEvents[0].supportingDocumentId, document.documentId);
});

test("Step 14 document classification opens review for private spend and preserves correction chain", () => {
  const clock = () => new Date("2026-03-24T16:30:00Z");
  const documentPlatform = createDocumentArchivePlatform({ clock });
  const reviewCenterPlatform = createReviewCenterPlatform({ clock, seedDemo: true });
  const hrPlatform = createHrPlatform({ clock, seedDemo: false, documentPlatform });
  const benefitsPlatform = createBenefitsPlatform({ clock, seedDemo: true, hrPlatform, documentPlatform });
  const classification = createDocumentClassificationEngine({
    clock,
    seedDemo: false,
    documentPlatform,
    reviewCenterPlatform,
    benefitsPlatform
  });

  const employee = hrPlatform.createEmployee({
    companyId: DEMO_COMPANY_ID,
    givenName: "Linus",
    familyName: "Torvalds",
    workEmail: "linus@example.test",
    actorId: "user_2"
  });
  const employment = hrPlatform.createEmployment({
    companyId: DEMO_COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Engineer",
    payModelCode: "monthly",
    startDate: "2026-01-01",
    actorId: "user_2"
  });
  const document = documentPlatform.createDocumentRecord({
    companyId: DEMO_COMPANY_ID,
    documentType: "expense_receipt",
    sourceReference: "private-unit-001",
    actorId: "user_2"
  });

  const created = classification.createClassificationCase({
    companyId: DEMO_COMPANY_ID,
    documentId: document.documentId,
    actorId: "user_2",
    lineInputs: [
      {
        description: "Privat kortkop pa foretagskort",
        amount: 1499,
        treatmentCode: "PRIVATE_RECEIVABLE",
        person: {
          employeeId: employee.employeeId,
          employmentId: employment.employmentId
        }
      }
    ]
  });

  assert.equal(created.requiresReview, true);
  assert.equal(created.status, "under_review");
  assert.equal(Boolean(created.reviewItemId), true);
  assert.equal(classification.listPendingReviewClassificationCases({ companyId: DEMO_COMPANY_ID }).length, 1);

  assert.throws(
    () =>
      classification.approveClassificationCase({
        companyId: DEMO_COMPANY_ID,
        classificationCaseId: created.classificationCaseId,
        actorId: "user_2"
      }),
    (error) => error?.code === "classification_case_review_center_required"
  );
  reviewCenterPlatform.claimReviewCenterItem({
    companyId: DEMO_COMPANY_ID,
    reviewItemId: created.reviewItemId,
    actorId: "user_2"
  });
  assert.throws(
    () =>
      classification.correctClassificationCase({
        companyId: DEMO_COMPANY_ID,
        classificationCaseId: created.classificationCaseId,
        actorId: "user_2",
        reasonCode: "manual_reclassification",
        lineInputs: [
          {
            description: "Utlagg med aterbetalning",
            amount: 1499,
            treatmentCode: "REIMBURSABLE_OUTLAY",
            person: {
              employeeId: employee.employeeId,
              employmentId: employment.employmentId
            }
          }
        ]
      }),
    (error) => error?.code === "classification_case_review_center_required"
  );

  const correction = classification.correctClassificationCase({
    companyId: DEMO_COMPANY_ID,
    classificationCaseId: created.classificationCaseId,
    actorId: "user_2",
    reasonCode: "manual_reclassification",
    reviewCenterManaged: true,
    lineInputs: [
      {
        description: "Utlagg med aterbetalning",
        amount: 1499,
        treatmentCode: "REIMBURSABLE_OUTLAY",
        person: {
          employeeId: employee.employeeId,
          employmentId: employment.employmentId
        }
      }
    ]
  });
  assert.equal(correction.priorCase.status, "corrected");
  assert.equal(correction.priorCase.correctedToCaseId, correction.replacementCase.classificationCaseId);
  assert.equal(correction.priorCase.reviewItemId, null);
  assert.equal(correction.replacementCase.parentClassificationCaseId, created.classificationCaseId);
  assert.equal(correction.replacementCase.reviewItemId, created.reviewItemId);
  assert.equal(correction.replacementCase.treatmentIntents[0].status, "draft");

  reviewCenterPlatform.decideReviewCenterItem({
    companyId: DEMO_COMPANY_ID,
    reviewItemId: created.reviewItemId,
    decisionCode: "approve",
    reasonCode: "classification_confirmed",
    actorId: "user_2"
  });
  const approved = classification.approveClassificationCase({
    companyId: DEMO_COMPANY_ID,
    classificationCaseId: correction.replacementCase.classificationCaseId,
    actorId: "user_2",
    reviewCenterManaged: true
  });
  assert.equal(approved.status, "approved");
});

test("Step 14 document classification dispatches payroll intents into pay runs without duplicating AGI payloads", () => {
  const clock = () => new Date("2026-03-24T17:15:00Z");
  const documentPlatform = createDocumentArchivePlatform({ clock });
  const reviewCenterPlatform = createReviewCenterPlatform({ clock, seedDemo: true });
  const hrPlatform = createHrPlatform({ clock, seedDemo: false, documentPlatform });
  const benefitsPlatform = createBenefitsPlatform({ clock, seedDemo: true, hrPlatform, documentPlatform });
  const payrollPlatform = createPayrollPlatform({
    clock,
    seedDemo: true,
    hrPlatform,
    benefitsPlatform
  });
  const classification = createDocumentClassificationEngine({
    clock,
    seedDemo: false,
    documentPlatform,
    reviewCenterPlatform,
    benefitsPlatform,
    payrollPlatform
  });

  const employee = hrPlatform.createEmployee({
    companyId: DEMO_COMPANY_ID,
    givenName: "Karin",
    familyName: "Larsson",
    workEmail: "karin@example.test",
    actorId: "user_3"
  });
  const employment = hrPlatform.createEmployment({
    companyId: DEMO_COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Controller",
    payModelCode: "monthly_salary",
    startDate: "2026-01-01",
    actorId: "user_3"
  });
  hrPlatform.addEmploymentContract({
    companyId: DEMO_COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    validFrom: "2026-01-01",
    salaryModelCode: "monthly_salary",
    monthlySalary: 42000,
    actorId: "user_3"
  });
  payrollPlatform.upsertEmploymentStatutoryProfile({
    companyId: DEMO_COMPANY_ID,
    employmentId: employment.employmentId,
    taxMode: "manual_rate",
    manualRateReasonCode: "emergency_manual_transition",
    taxRatePercent: 30,
    contributionClassCode: "full",
    actorId: "user_3"
  });

  const document = documentPlatform.createDocumentRecord({
    companyId: DEMO_COMPANY_ID,
    documentType: "expense_receipt",
    sourceReference: "private-payroll-unit-001",
    actorId: "user_3"
  });

  const created = classification.createClassificationCase({
    companyId: DEMO_COMPANY_ID,
    documentId: document.documentId,
    actorId: "user_3",
    lineInputs: [
      {
        description: "Privat kortkop pa foretagskort",
        amount: 1750,
        treatmentCode: "PRIVATE_RECEIVABLE",
        person: {
          employeeId: employee.employeeId,
          employmentId: employment.employmentId,
          personRelationCode: "employee"
        }
      }
    ]
  });

  assert.throws(
    () =>
      classification.approveClassificationCase({
        companyId: DEMO_COMPANY_ID,
        classificationCaseId: created.classificationCaseId,
        actorId: "user_3"
      }),
    (error) => error?.code === "classification_case_review_center_required"
  );
  reviewCenterPlatform.claimReviewCenterItem({
    companyId: DEMO_COMPANY_ID,
    reviewItemId: created.reviewItemId,
    actorId: "user_3"
  });
  reviewCenterPlatform.decideReviewCenterItem({
    companyId: DEMO_COMPANY_ID,
    reviewItemId: created.reviewItemId,
    decisionCode: "approve",
    reasonCode: "classification_confirmed",
    actorId: "user_3"
  });
  const approved = classification.approveClassificationCase({
    companyId: DEMO_COMPANY_ID,
    classificationCaseId: created.classificationCaseId,
    actorId: "user_3",
    reviewCenterManaged: true
  });
  assert.equal(approved.status, "approved");

  const dispatched = classification.dispatchTreatmentIntents({
    companyId: DEMO_COMPANY_ID,
    classificationCaseId: created.classificationCaseId,
    actorId: "user_3"
  });
  assert.equal(dispatched.status, "dispatched");
  assert.equal(dispatched.treatmentIntents[0].status, "dispatched");

  const payloadBundle = payrollPlatform.listPayrollDocumentClassificationPayloads({
    companyId: DEMO_COMPANY_ID,
    employmentId: employment.employmentId,
    reportingPeriod: "202603"
  });
  assert.equal(payloadBundle.payloads.length, 1);
  assert.equal(payloadBundle.payloads[0].payItemCode, "NET_DEDUCTION");
  assert.equal(payloadBundle.payloads[0].dispatchStatus.latestStage, "not_dispatched");

  const payCalendar = payrollPlatform.listPayCalendars({ companyId: DEMO_COMPANY_ID })[0];
  const payRun = payrollPlatform.createPayRun({
    companyId: DEMO_COMPANY_ID,
    payCalendarId: payCalendar.payCalendarId,
    reportingPeriod: "202603",
    employmentIds: [employment.employmentId],
    actorId: "user_3"
  });
  payrollPlatform.approvePayRun({
    companyId: DEMO_COMPANY_ID,
    payRunId: payRun.payRunId,
    actorId: "user_3"
  });

  const approvedRun = payrollPlatform.getPayRun({
    companyId: DEMO_COMPANY_ID,
    payRunId: payRun.payRunId
  });
  const deductionLine = approvedRun.lines.find((line) => line.sourceId === created.treatmentIntents[0].treatmentIntentId);
  assert.equal(Boolean(deductionLine), true);
  assert.equal(deductionLine.payItemCode, "NET_DEDUCTION");
  assert.equal(deductionLine.sourceType, "document_classification_private_receivable");

  const afterConsumption = payrollPlatform.listPayrollDocumentClassificationPayloads({
    companyId: DEMO_COMPANY_ID,
    employmentId: employment.employmentId,
    reportingPeriod: "202603"
  });
  assert.equal(afterConsumption.payloads.length, 0);
});

test("Step 14 document classification derives AP extraction projection from OCR fields when line inputs are omitted", () => {
  const clock = () => new Date("2026-03-28T10:00:00Z");
  const documentPlatform = createDocumentArchivePlatform({ clock });
  const reviewCenterPlatform = createReviewCenterPlatform({ clock, seedDemo: true });
  const classification = createDocumentClassificationEngine({
    clock,
    seedDemo: false,
    documentPlatform,
    reviewCenterPlatform
  });

  const document = documentPlatform.createDocumentRecord({
    companyId: DEMO_COMPANY_ID,
    documentType: "supplier_invoice",
    sourceReference: "supplier-derived-001",
    actorId: "user_ocr",
    metadataJson: {
      totalAmount: 1250
    }
  });

  const created = classification.createClassificationCase({
    companyId: DEMO_COMPANY_ID,
    documentId: document.documentId,
    actorId: "user_ocr",
    extractedFields: {
      counterparty: { value: "Demo Leverantor AB", confidence: 0.97 },
      invoiceNumber: { value: "SUP-2026-001", confidence: 0.96 },
      invoiceDate: { value: "2026-03-28", confidence: 0.93 },
      dueDate: { value: "2026-04-27", confidence: 0.91 },
      totalAmount: { value: "1250.00", confidence: 0.98 },
      currencyCode: { value: "SEK", confidence: 0.99 }
    }
  });

  assert.equal(created.status, "suggested");
  assert.equal(created.requiresReview, false);
  assert.equal(created.treatmentLines.length, 1);
  assert.equal(created.treatmentLines[0].treatmentCode, "COMPANY_COST");
  assert.equal(created.treatmentIntents[0].targetDomainCode, "AP");
  assert.equal(created.extractionProjections.length, 1);
  assert.equal(created.extractionProjections[0].extractionFamilyCode, "AP_SUPPLIER_INVOICE");
  assert.equal(created.extractionProjections[0].candidateObjectType, "ap_supplier_invoice");
  assert.equal(created.extractionProjections[0].confidenceScore, 0.91);
  assert.equal(created.extractionProjections[0].documentRoleCode, "PRIMARY_SUPPLIER_DOCUMENT");
  assert.equal(created.extractionProjections[0].fieldLineageJson["factsJson.invoiceNumber"].sourceFieldKey, "invoiceNumber");
  assert.equal(created.extractionProjections[0].fieldLineageJson["factsJson.invoiceNumber"].confidenceScore, 0.96);
  assert.equal(created.extractionProjections[0].attachmentRefs.includes(`document:${document.documentId}`), true);
  assert.equal(created.extractionProjections[0].payloadHash.length, 64);
  assert.equal(created.extractionProjections[0].normalizedFieldsJson.factsJson.invoiceNumber, "SUP-2026-001");
});

test("Step 14 document classification derives travel extraction projection and review from OCR receipt heuristics", () => {
  const clock = () => new Date("2026-03-28T10:30:00Z");
  const documentPlatform = createDocumentArchivePlatform({ clock });
  const reviewCenterPlatform = createReviewCenterPlatform({ clock, seedDemo: true });
  const classification = createDocumentClassificationEngine({
    clock,
    seedDemo: false,
    documentPlatform,
    reviewCenterPlatform
  });
  const document = documentPlatform.createDocumentRecord({
    companyId: DEMO_COMPANY_ID,
    documentType: "expense_receipt",
    sourceReference: "travel-derived-001",
    actorId: "user_travel",
    metadataJson: {
      totalAmount: 899
    }
  });

  const created = classification.createClassificationCase({
    companyId: DEMO_COMPANY_ID,
    documentId: document.documentId,
    actorId: "user_travel",
    extractedFields: {
      storeName: { value: "Grand Hotel", confidence: 0.95 },
      receiptDate: { value: "2026-03-28", confidence: 0.93 },
      totalAmount: { value: "899.00", confidence: 0.97 }
    }
  });

  assert.equal(created.status, "under_review");
  assert.equal(created.reviewQueueCode, "PAYROLL_REVIEW");
  assert.equal(created.treatmentLines[0].targetDomainCode, "TRAVEL");
  assert.equal(created.treatmentLines[0].treatmentCode, "REIMBURSABLE_OUTLAY");
  assert.equal(created.extractionProjections[0].extractionFamilyCode, "TRAVEL_EXPENSE_CANDIDATE");
  assert.equal(created.extractionProjections[0].candidateObjectType, "travel_claim_candidate");
  assert.equal(created.extractionProjections[0].confidenceScore, 0.93);
  assert.equal(created.extractionProjections[0].fieldLineageJson["factsJson.expenseDate"].sourceFieldKey, "receiptDate");
  assert.equal(created.extractionProjections[0].fieldLineageJson["factsJson.expenseType"].sourceKind, "derived_rule");
  assert.equal(created.extractionProjections[0].normalizedFieldsJson.factsJson.expenseType, "lodging");
});

test("Step 14 document classification carries OCR-backed attachment refs and lineage into extraction projections", () => {
  const clock = () => new Date("2026-03-28T11:00:00Z");
  const documentPlatform = createDocumentArchivePlatform({ clock });
  const reviewCenterPlatform = createReviewCenterPlatform({ clock, seedDemo: true });
  const classification = createDocumentClassificationEngine({
    clock,
    seedDemo: false,
    documentPlatform,
    reviewCenterPlatform
  });
  const channel = documentPlatform.registerInboxChannel({
    companyId: DEMO_COMPANY_ID,
    channelCode: "ocr_projection",
    inboundAddress: "ocr-projection@inbound.example.test",
    useCase: "documents_inbox",
    allowedMimeTypes: ["application/pdf"],
    maxAttachmentSizeBytes: 1024 * 1024,
    classificationConfidenceThreshold: 0.9,
    fieldConfidenceThreshold: 0.9
  });

  const document = documentPlatform.createDocumentRecord({
    companyId: DEMO_COMPANY_ID,
    documentType: "supplier_invoice",
    sourceChannel: "email_inbox",
    sourceReference: "ocr-backed-supplier-001",
    retentionPolicyCode: "supplier_invoice_standard",
    actorId: "user_ocr",
    metadataJson: {
      inboxChannelId: channel.inboxChannelId,
      filename: "ocr-backed-supplier-001.pdf",
      senderAddress: "supplier@example.com",
      mailboxCode: "ap-inbox",
      totalAmount: 1250
    }
  });
  const original = documentPlatform.appendDocumentVersion({
    companyId: DEMO_COMPANY_ID,
    documentId: document.documentId,
    variantType: "original",
    storageKey: "documents/originals/ocr-backed-supplier-001.pdf",
    mimeType: "application/pdf",
    contentText: "Invoice: SUP-UNIT-001 Supplier: Demo Leverantor AB Total: 1250.00 Due: 2026-04-27",
    actorId: "user_ocr"
  });
  const ocrRun = documentPlatform.runDocumentOcr({
    companyId: DEMO_COMPANY_ID,
    documentId: document.documentId,
    actorId: "user_ocr"
  });

  const created = classification.createClassificationCase({
    companyId: DEMO_COMPANY_ID,
    documentId: document.documentId,
    actorId: "user_ocr"
  });

  assert.equal(created.sourceOcrRunId, ocrRun.ocrRun.ocrRunId);
  assert.equal(created.extractionProjections[0].attachmentRefs.includes(`ocr_run:${ocrRun.ocrRun.ocrRunId}`), true);
  assert.equal(
    created.extractionProjections[0].attachmentRefs.includes(`document_version:${original.version.documentVersionId}`),
    true
  );
  assert.equal(
    created.extractionProjections[0].attachmentRefs.includes(`document_version:${ocrRun.ocrRun.ocrDocumentVersionId}`),
    true
  );
  assert.equal(created.extractionProjections[0].fieldLineageJson["factsJson.invoiceNumber"].sourceOcrRunId, ocrRun.ocrRun.ocrRunId);
  assert.equal(created.extractionProjections[0].payloadHash.length, 64);
});

test("Phase 9.3 document classification exposes masked search projections with routing and blocker metadata", () => {
  const clock = () => new Date("2026-04-01T07:15:00Z");
  const documentPlatform = createDocumentArchivePlatform({ clock });
  const reviewCenterPlatform = createReviewCenterPlatform({ clock, seedDemo: true });
  const hrPlatform = createHrPlatform({ clock, seedDemo: false, documentPlatform });
  const benefitsPlatform = createBenefitsPlatform({ clock, seedDemo: true, hrPlatform, documentPlatform });
  const classification = createDocumentClassificationEngine({
    clock,
    seedDemo: false,
    documentPlatform,
    reviewCenterPlatform,
    benefitsPlatform
  });

  const employee = hrPlatform.createEmployee({
    companyId: DEMO_COMPANY_ID,
    givenName: "PayrollLeakSentinel",
    familyName: "NineThree",
    workEmail: "payroll-9-3@example.test",
    actorId: "user_9_3"
  });
  const employment = hrPlatform.createEmployment({
    companyId: DEMO_COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Analyst",
    payModelCode: "monthly_salary",
    startDate: "2026-01-01",
    actorId: "user_9_3"
  });
  const document = documentPlatform.createDocumentRecord({
    companyId: DEMO_COMPANY_ID,
    documentType: "expense_receipt",
    sourceReference: "phase9-3-sensitive-001",
    actorId: "user_9_3"
  });

  const created = classification.createClassificationCase({
    companyId: DEMO_COMPANY_ID,
    documentId: document.documentId,
    actorId: "user_9_3",
    lineInputs: [
      {
        description: "Sensitive vendor PayrollLeakVendor AB",
        amount: 875,
        treatmentCode: "REIMBURSABLE_OUTLAY",
        person: {
          employeeId: employee.employeeId,
          employmentId: employment.employmentId,
          personRelationCode: "employee"
        },
        reviewReasonCodes: ["PERSON_IMPACT_REQUIRES_REVIEW"],
        factsJson: {
          vendorName: "PayrollLeakVendor AB",
          reimbursementAmount: 875,
          expenseDate: "2026-04-01"
        }
      }
    ]
  });

  const contracts = classification.listDocumentClassificationSearchProjectionContracts({
    companyId: DEMO_COMPANY_ID
  });
  assert.equal(contracts.some((contract) => contract.projectionCode === "document_classification.classification_case"), true);

  const documents = classification.listDocumentClassificationSearchProjectionDocuments({
    companyId: DEMO_COMPANY_ID
  });
  const projection = documents.find((item) => item.objectId === created.classificationCaseId);
  assert.equal(Boolean(projection), true);
  assert.equal(projection.filterPayload.reviewBoundaryCode, "review_center.payroll");
  assert.equal(projection.filterPayload.targetDomainCode, "PAYROLL");
  assert.equal(projection.filterPayload.sensitivityClass, "masked_sensitive");
  assert.equal(projection.searchText.includes("PayrollLeakSentinel"), false);
  assert.equal(projection.searchText.includes("PayrollLeakVendor AB"), false);
  assert.equal(projection.displayTitle.includes("PayrollLeakSentinel"), false);
  assert.equal(projection.snippet.includes("maskat"), true);
  assert.equal(projection.detailPayload.blockers.some((blocker) => blocker.blockerCode === "review_pending"), true);
  assert.equal(
    JSON.stringify(projection.detailPayload).includes("PayrollLeakVendor AB"),
    false
  );
});
