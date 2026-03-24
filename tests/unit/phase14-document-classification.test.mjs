import test from "node:test";
import assert from "node:assert/strict";
import { createDocumentArchivePlatform } from "../../packages/domain-documents/src/index.mjs";
import { createReviewCenterPlatform } from "../../packages/domain-review-center/src/index.mjs";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createBenefitsPlatform } from "../../packages/domain-benefits/src/index.mjs";
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

  const approved = classification.approveClassificationCase({
    companyId: DEMO_COMPANY_ID,
    classificationCaseId: created.classificationCaseId,
    actorId: "user_2"
  });
  assert.equal(approved.status, "approved");

  const correction = classification.correctClassificationCase({
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
  });

  assert.equal(correction.priorCase.status, "corrected");
  assert.equal(correction.priorCase.correctedToCaseId, correction.replacementCase.classificationCaseId);
  assert.equal(correction.replacementCase.parentClassificationCaseId, created.classificationCaseId);
  assert.equal(correction.replacementCase.treatmentIntents[0].status, "draft");
});
