import test from "node:test";
import assert from "node:assert/strict";
import { createSearchEngine } from "../../packages/domain-search/src/index.mjs";
import { createDocumentArchivePlatform } from "../../packages/domain-documents/src/index.mjs";
import { createReviewCenterPlatform } from "../../packages/domain-review-center/src/index.mjs";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createDocumentClassificationEngine } from "../../packages/domain-document-classification/src/index.mjs";

test("Step 35 search exposes object profile and workbench contracts with normalized object types", async () => {
  const engine = createSearchEngine({
    clock: () => new Date("2026-03-25T12:00:00Z"),
    reportingPlatform: {
      listSearchProjectionContracts: () => [
        {
          projectionCode: "payroll.pay_run",
          objectType: "payRun",
          displayName: "Pay runs",
          sourceDomainCode: "reporting",
          visibilityScope: "company",
          surfaceCodes: ["desktop.search"],
          filterFieldCodes: ["reportingPeriod", "status"]
        }
      ],
      listSearchProjectionDocuments: () => [
        {
          projectionCode: "payroll.pay_run",
          objectId: "pr_1",
          objectType: "payRun",
          displayTitle: "Marslön 2026",
          displaySubtitle: "2026-03",
          documentStatus: "active",
          searchText: "Marslön 2026 payroll pay run",
          filterPayload: { reportingPeriod: "2026-03", status: "approved" },
          sourceVersion: "pay_run:pr_1:v1",
          sourceUpdatedAt: "2026-03-25T11:00:00Z"
        }
      ]
    }
  });

  const companyId = "company_phase35_1";
  const reindex = await engine.requestSearchReindex({
    companyId,
    actorId: "user_1"
  });
  assert.equal(reindex.reindexRequest.status, "completed");

  const profileContracts = engine.listObjectProfileContracts({ companyId });
  assert.equal(profileContracts.some((contract) => contract.objectType === "payRun"), true);
  assert.equal(profileContracts.some((contract) => contract.objectType === "project"), true);

  const payRunProfile = engine.getObjectProfile({
    companyId,
    objectType: "pay_run",
    objectId: "pr_1"
  });
  assert.equal(payRunProfile.profileType, "PayRunProfile");
  assert.equal(payRunProfile.objectType, "payRun");
  assert.equal(payRunProfile.header.title, "Marslön 2026");
  assert.equal(payRunProfile.projectionInfo.projectionCode, "payroll.pay_run");

  const workbenchContracts = engine.listWorkbenchContracts({ companyId });
  assert.equal(workbenchContracts.some((contract) => contract.workbenchCode === "PayrollWorkbench"), true);
  assert.equal(workbenchContracts.some((contract) => contract.workbenchCode === "ComplianceWorkbench"), true);

  const payrollWorkbench = engine.getWorkbench({
    companyId,
    workbenchCode: "PayrollWorkbench"
  });
  assert.equal(payrollWorkbench.workbenchCode, "PayrollWorkbench");
  assert.equal(payrollWorkbench.rows.length, 1);
  assert.equal(payrollWorkbench.rows[0].objectType, "payRun");
  assert.equal(payrollWorkbench.commandBar.availableCommands.some((command) => command.actionCode === "payroll.createRun"), true);
});

test("Phase 9.3 search builds classification case profile from masked document classification projection", async () => {
  const clock = () => new Date("2026-04-01T08:00:00Z");
  const companyId = "company_phase35_93";
  const documentPlatform = createDocumentArchivePlatform({ clock });
  const reviewCenterPlatform = createReviewCenterPlatform({ clock, seedDemo: true });
  reviewCenterPlatform.createReviewQueue({
    companyId,
    queueCode: "PAYROLL_REVIEW",
    label: "Payroll review",
    ownerTeamId: "payroll_ops",
    priority: "critical",
    escalationPolicyCode: "PAYROLL_ESCALATION",
    defaultRiskClass: "critical",
    defaultSlaHours: 4,
    allowedSourceDomains: ["PAYROLL", "BENEFITS", "DOCUMENT_CLASSIFICATION", "AUTOMATION"],
    requiredDecisionTypes: ["payroll_treatment", "generic_review"],
    actorId: "user_phase35"
  });
  const hrPlatform = createHrPlatform({ clock, seedDemo: false, documentPlatform });
  const classificationPlatform = createDocumentClassificationEngine({
    clock,
    seedDemo: false,
    documentPlatform,
    reviewCenterPlatform
  });
  const employee = hrPlatform.createEmployee({
    companyId,
    givenName: "Phase35SecretName",
    familyName: "Employee",
    workEmail: "phase35-secret@example.test",
    actorId: "user_phase35"
  });
  const employment = hrPlatform.createEmployment({
    companyId,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Tester",
    payModelCode: "monthly_salary",
    startDate: "2026-01-01",
    actorId: "user_phase35"
  });
  const document = documentPlatform.createDocumentRecord({
    companyId,
    documentType: "expense_receipt",
    sourceReference: "phase35-classification-search",
    actorId: "user_phase35"
  });
  const classificationCase = classificationPlatform.createClassificationCase({
    companyId,
    documentId: document.documentId,
    actorId: "user_phase35",
    lineInputs: [
      {
        description: "Phase35 sensitive reimbursement",
        amount: 490,
        treatmentCode: "REIMBURSABLE_OUTLAY",
        person: {
          employeeId: employee.employeeId,
          employmentId: employment.employmentId,
          personRelationCode: "employee"
        },
        reviewReasonCodes: ["PERSON_IMPACT_REQUIRES_REVIEW"]
      }
    ]
  });

  const engine = createSearchEngine({
    clock,
    getDocumentClassificationPlatform: () => classificationPlatform
  });

  const reindex = await engine.requestSearchReindex({
    companyId,
    actorId: "user_phase35"
  });
  assert.equal(reindex.reindexRequest.status, "completed");

  const contracts = engine.listObjectProfileContracts({ companyId });
  assert.equal(contracts.some((contract) => contract.objectType === "classificationCase"), true);

  const queryLeak = engine.listSearchDocuments({
    companyId,
    query: "Phase35SecretName"
  });
  assert.equal(queryLeak.some((item) => item.objectId === classificationCase.classificationCaseId), false);

  const profile = engine.getObjectProfile({
    companyId,
    objectType: "classification_case",
    objectId: classificationCase.classificationCaseId
  });
  assert.equal(profile.profileType, "ClassificationCaseProfile");
  assert.equal(profile.objectType, "classificationCase");
  assert.equal(profile.header.title.includes("Phase35SecretName"), false);
  assert.equal(profile.blockers.some((blocker) => blocker.blockerCode === "review_pending"), true);
  assert.equal(
    profile.sections.find((section) => section.sectionCode === "reviewBoundary").fields.some((field) => field.fieldCode === "reviewBoundaryCode" && field.value === "review_center.payroll"),
    true
  );
});
