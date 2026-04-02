import test from "node:test";
import assert from "node:assert/strict";
import { createProjectsPlatform } from "../../packages/domain-projects/src/index.mjs";
import { createFieldPlatform } from "../../packages/domain-field/src/index.mjs";
import {
  PERSONALLIGGARE_THRESHOLD_2026_EX_VAT,
  createPersonalliggarePlatform
} from "../../packages/domain-personalliggare/src/index.mjs";
import { createId06Engine } from "../../packages/domain-id06/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 13.5 project governance deprecates linked packs, blocks new links and surfaces workspace warnings", () => {
  const projectsPlatform = createProjectsPlatform({
    clock: () => new Date("2026-04-02T09:00:00Z"),
    seedDemo: false
  });

  const project = createProject(projectsPlatform, {
    projectCode: "P-VPACK-GOV-001",
    projectReferenceCode: "project-vpack-gov-001"
  });
  const siblingProject = createProject(projectsPlatform, {
    projectCode: "P-VPACK-GOV-002",
    projectReferenceCode: "project-vpack-gov-002"
  });

  projectsPlatform.linkVerticalPack({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    packType: "field",
    verticalRefs: {
      workModelCodes: ["work_order"]
    },
    actorId: "unit-test"
  });
  const decision = projectsPlatform.publishProjectVerticalPackGovernanceDecision({
    companyId: COMPANY_ID,
    packType: "field",
    status: "deprecated",
    effectiveFrom: "2026-04-02",
    sunsetAt: "2026-04-30",
    reasonCode: "pack_deprecated",
    evidenceRefs: ["governance-note-001"],
    actorId: "unit-test"
  });

  const operationalStatus = projectsPlatform.getProjectVerticalPackOperationalStatus({
    companyId: COMPANY_ID,
    packType: "field",
    asOfDate: "2026-04-02"
  });
  assert.equal(operationalStatus.operationalStatus, "deprecated");
  assert.equal(operationalStatus.allowNewLinks, false);
  assert.equal(operationalStatus.allowOperationalUse, true);
  assert.equal(operationalStatus.governanceDecisionId, decision.projectVerticalPackGovernanceDecisionId);

  assert.throws(
    () =>
      projectsPlatform.linkVerticalPack({
        companyId: COMPANY_ID,
        projectId: siblingProject.projectId,
        packType: "field",
        verticalRefs: {
          workModelCodes: ["work_order"]
        },
        actorId: "unit-test"
      }),
    (error) => error?.error === "project_vertical_pack_not_enabled"
  );

  const workspace = projectsPlatform.getProjectWorkspace({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    cutoffDate: "2026-04-02"
  });
  assert.equal(workspace.warningCodes.includes("vertical_pack_deprecated"), true);
  assert.deepEqual(workspace.verticalPackGovernanceSummary.deprecatedPackTypes, ["field"]);
  assert.equal(
    workspace.complianceIndicatorStrip.some(
      (indicator) =>
        indicator.indicatorCode === "vertical_pack_governance"
        && indicator.status === "warning"
        && indicator.count === 1
    ),
    true
  );

  const publishedDecisions = projectsPlatform.listProjectVerticalPackGovernanceDecisions({
    companyId: COMPANY_ID,
    packType: "field"
  });
  assert.equal(publishedDecisions.length, 1);
  assert.equal(publishedDecisions[0].status, "deprecated");
});

test("Phase 13.5 field blocks disabled pack for new capture but preserves finance closeout on existing work", () => {
  const projectsPlatform = createProjectsPlatform({
    clock: () => new Date("2026-04-02T10:00:00Z"),
    seedDemo: false
  });
  const project = createProject(projectsPlatform, {
    projectCode: "P-VPACK-FIELD-001",
    projectReferenceCode: "project-vpack-field-001",
    customerId: "customer-field-001"
  });
  projectsPlatform.linkVerticalPack({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    packType: "field",
    verticalRefs: {
      workModelCodes: ["work_order"]
    },
    actorId: "unit-test"
  });

  const fieldPlatform = createFieldPlatform({
    clock: () => new Date("2026-04-02T10:00:00Z"),
    seedDemo: false,
    projectsPlatform,
    hrPlatform: {
      listEmployees({ companyId }) {
        assert.equal(companyId, COMPANY_ID);
        return [{ employeeId: "employee-field-001" }];
      },
      listEmployments({ companyId, employeeId }) {
        assert.equal(companyId, COMPANY_ID);
        assert.equal(employeeId, "employee-field-001");
        return [{ employmentId: "employment-field-001" }];
      }
    },
    arPlatform: {
      getCustomer({ companyId, customerId }) {
        assert.equal(companyId, COMPANY_ID);
        assert.equal(customerId, "customer-field-001");
        return {
          customerId,
          companyId
        };
      },
      getItem({ companyId, itemId }) {
        assert.equal(companyId, COMPANY_ID);
        assert.equal(itemId, "labor-ar-item");
        return {
          arItemId: itemId,
          itemCode: "FIELD-LABOR",
          standardPrice: 1200
        };
      }
    }
  });

  const workOrder = fieldPlatform.createWorkOrder({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    displayName: "Existing field work",
    description: "Closeout proof",
    laborItemId: "labor-ar-item",
    laborRateAmount: 1200,
    actorId: "unit-test"
  });
  const dispatch = fieldPlatform.createDispatchAssignment({
    companyId: COMPANY_ID,
    workOrderId: workOrder.workOrderId,
    employmentId: "employment-field-001",
    startsAt: "2026-04-02T10:05:00Z",
    endsAt: "2026-04-02T10:25:00Z",
    actorId: "unit-test"
  });
  fieldPlatform.markDispatchEnRoute({
    companyId: COMPANY_ID,
    workOrderId: workOrder.workOrderId,
    dispatchAssignmentId: dispatch.dispatchAssignmentId,
    actorId: "unit-test"
  });
  fieldPlatform.markDispatchOnSite({
    companyId: COMPANY_ID,
    workOrderId: workOrder.workOrderId,
    dispatchAssignmentId: dispatch.dispatchAssignmentId,
    actorId: "unit-test"
  });
  fieldPlatform.captureCustomerSignature({
    companyId: COMPANY_ID,
    workOrderId: workOrder.workOrderId,
    signerName: "Customer Signer",
    signedAt: "2026-04-02T10:30:00Z",
    signatureText: "Approved work.",
    actorId: "unit-test"
  });
  fieldPlatform.completeWorkOrder({
    companyId: COMPANY_ID,
    workOrderId: workOrder.workOrderId,
    completedAt: "2026-04-02T10:35:00Z",
    laborMinutes: 60,
    actorId: "unit-test"
  });

  projectsPlatform.publishProjectVerticalPackGovernanceDecision({
    companyId: COMPANY_ID,
    packType: "field",
    status: "disabled",
    effectiveFrom: "2026-04-02",
    reasonCode: "pack_disabled",
    evidenceRefs: ["governance-note-002"],
    actorId: "unit-test"
  });

  assert.throws(
    () =>
      fieldPlatform.createWorkOrder({
        companyId: COMPANY_ID,
        projectId: project.projectId,
        displayName: "Blocked field work",
        description: "Should fail after disable",
        laborItemId: "labor-ar-item",
        laborRateAmount: 1200,
        actorId: "unit-test"
      }),
    (error) => error?.code === "field_vertical_pack_disabled"
  );

  const handoff = fieldPlatform.createWorkOrderFinanceHandoff({
    companyId: COMPANY_ID,
    workOrderId: workOrder.workOrderId,
    actorId: "unit-test"
  });
  assert.equal(handoff.financeHandoff.financeTruthOwner, "projects");
  assert.equal(handoff.financeHandoff.verticalPackLinkId !== null, true);
  assert.equal(handoff.financeHandoff.candidateLines.length, 1);
});

test("Phase 13.5 personalliggare blocks disabled pack for new project-scoped sites", () => {
  const projectsPlatform = createProjectsPlatform({
    clock: () => new Date("2026-04-02T11:00:00Z"),
    seedDemo: false
  });
  const project = createProject(projectsPlatform, {
    projectCode: "P-VPACK-PL-001",
    projectReferenceCode: "project-vpack-pl-001"
  });
  projectsPlatform.linkVerticalPack({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    packType: "personalliggare",
    verticalRefs: {
      siteMode: "construction"
    },
    actorId: "unit-test"
  });
  projectsPlatform.publishProjectVerticalPackGovernanceDecision({
    companyId: COMPANY_ID,
    packType: "personalliggare",
    status: "disabled",
    effectiveFrom: "2026-04-02",
    reasonCode: "pack_disabled",
    evidenceRefs: ["governance-note-003"],
    actorId: "unit-test"
  });

  const personalliggarePlatform = createPersonalliggarePlatform({
    clock: () => new Date("2026-04-02T11:00:00Z"),
    projectsPlatform
  });

  assert.throws(
    () =>
      personalliggarePlatform.createConstructionSite({
        companyId: COMPANY_ID,
        siteCode: "SITE-GOV-001",
        siteName: "Blocked project site",
        siteAddress: "Bygggatan 10, Stockholm",
        builderOrgNo: "5561234567",
        estimatedTotalCostExVat: PERSONALLIGGARE_THRESHOLD_2026_EX_VAT + 1000,
        startDate: "2026-04-02",
        projectId: project.projectId,
        actorId: "unit-test"
      }),
    (error) => error?.error === "personalliggare_vertical_pack_disabled"
  );
});

test("Phase 13.5 ID06 blocks disabled pack for new project-scoped workplace bindings", () => {
  const projectsPlatform = createProjectsPlatform({
    clock: () => new Date("2026-04-02T12:00:00Z"),
    seedDemo: false
  });
  const project = createProject(projectsPlatform, {
    projectCode: "P-VPACK-ID06-001",
    projectReferenceCode: "project-vpack-id06-001"
  });
  projectsPlatform.linkVerticalPack({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    packType: "personalliggare",
    verticalRefs: {
      siteMode: "construction"
    },
    actorId: "unit-test"
  });
  projectsPlatform.linkVerticalPack({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    packType: "id06",
    verticalRefs: {
      workplaceMode: "construction_access"
    },
    actorId: "unit-test"
  });

  const personalliggarePlatform = createPersonalliggarePlatform({
    clock: () => new Date("2026-04-02T12:00:00Z"),
    projectsPlatform
  });
  const id06Platform = createId06Engine({
    clock: () => new Date("2026-04-02T12:00:00Z"),
    personalliggarePlatform,
    projectsPlatform
  });

  const site = personalliggarePlatform.createConstructionSite({
    companyId: COMPANY_ID,
    siteCode: "SITE-ID06-GOV-001",
    siteName: "ID06 governed site",
    siteAddress: "Kontrollgatan 2, Stockholm",
    builderOrgNo: "5561234567",
    estimatedTotalCostExVat: PERSONALLIGGARE_THRESHOLD_2026_EX_VAT + 5000,
    startDate: "2026-04-02",
    workplaceIdentifier: "WP-ID06-GOV-001",
    projectId: project.projectId,
    actorId: "unit-test"
  });

  id06Platform.verifyCompany({
    companyId: COMPANY_ID,
    orgNo: "5561112227",
    companyName: "Governed Employer AB",
    actorId: "unit-test"
  });
  id06Platform.verifyPerson({
    companyId: COMPANY_ID,
    workerIdentityValue: "198902029999",
    fullNameSnapshot: "Sara Nilsson",
    actorId: "unit-test"
  });
  id06Platform.validateCard({
    companyId: COMPANY_ID,
    employerOrgNo: "5561112227",
    workerIdentityValue: "198902029999",
    cardReference: "ID06-GOV-001",
    actorId: "unit-test"
  });

  projectsPlatform.publishProjectVerticalPackGovernanceDecision({
    companyId: COMPANY_ID,
    packType: "id06",
    status: "disabled",
    effectiveFrom: "2026-04-02",
    reasonCode: "pack_disabled",
    evidenceRefs: ["governance-note-004"],
    actorId: "unit-test"
  });

  assert.throws(
    () =>
      id06Platform.createWorkplaceBinding({
        companyId: COMPANY_ID,
        workplaceId: site.workplaceId,
        employerOrgNo: "5561112227",
        workerIdentityValue: "198902029999",
        cardReference: "ID06-GOV-001",
        actorId: "unit-test"
      }),
    (error) => error?.code === "id06_vertical_pack_disabled"
  );
});

function createProject(projectsPlatform, {
  projectCode,
  projectReferenceCode,
  customerId = null
}) {
  return projectsPlatform.createProject({
    companyId: COMPANY_ID,
    projectCode,
    projectReferenceCode,
    displayName: projectCode,
    customerId,
    startsOn: "2026-04-01",
    status: "active",
    billingModelCode: "time_and_material",
    revenueRecognitionModelCode: "billing_equals_revenue",
    contractValueAmount: 100000,
    actorId: "unit-test"
  });
}
