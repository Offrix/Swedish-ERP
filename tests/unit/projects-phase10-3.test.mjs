import test from "node:test";
import assert from "node:assert/strict";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";
import { createVatPlatform } from "../../packages/domain-vat/src/index.mjs";
import { createProjectsPlatform } from "../../packages/domain-projects/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 10.3 project change orders and build VAT assessments remain deterministic", () => {
  const fixedNow = new Date("2026-03-22T10:00:00Z");
  const ledgerPlatform = createLedgerPlatform({
    clock: () => fixedNow
  });
  ledgerPlatform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "unit-test"
  });
  const vatPlatform = createVatPlatform({
    clock: () => fixedNow,
    ledgerPlatform
  });
  const projectsPlatform = createProjectsPlatform({
    clock: () => fixedNow,
    seedDemo: false,
    vatPlatform
  });

  const project = projectsPlatform.createProject({
    companyId: COMPANY_ID,
    projectCode: "P-BUILD-001",
    projectReferenceCode: "project-build-001",
    displayName: "Build test project",
    startsOn: "2026-03-01",
    status: "active",
    billingModelCode: "time_and_material",
    revenueRecognitionModelCode: "billing_equals_revenue",
    contractValueAmount: 75000,
    actorId: "unit-test"
  });

  const changeOrder = projectsPlatform.createProjectChangeOrder({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    scopeCode: "addition",
    title: "Additional cable route",
    description: "Extra construction service approved later.",
    revenueImpactAmount: 25000,
    costImpactAmount: 12000,
    scheduleImpactMinutes: 180,
    customerApprovalRequiredFlag: true,
    actorId: "unit-test"
  });
  assert.equal(changeOrder.status, "draft");

  const quoted = projectsPlatform.transitionProjectChangeOrderStatus({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectChangeOrderId: changeOrder.projectChangeOrderId,
    nextStatus: "quoted",
    actorId: "unit-test"
  });
  assert.equal(quoted.status, "quoted");

  const approved = projectsPlatform.transitionProjectChangeOrderStatus({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    projectChangeOrderId: changeOrder.projectChangeOrderId,
    nextStatus: "approved",
    customerApprovedAt: "2026-03-18",
    actorId: "unit-test"
  });
  assert.equal(approved.status, "approved");
  assert.equal(approved.customerApprovedAt, "2026-03-18");

  const vatAssessment = projectsPlatform.createProjectBuildVatAssessment({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    sourceDocumentId: changeOrder.projectChangeOrderId,
    sourceDocumentType: "project_change_order",
    description: "Approved construction change order for build-sector buyer.",
    invoiceDate: "2026-03-19",
    deliveryDate: "2026-03-19",
    buyerCountry: "SE",
    buyerType: "company",
    buyerVatNo: "SE556677889901",
    buyerVatNumber: "SE556677889901",
    buyerVatNumberStatus: "valid",
    buyerIsTaxablePerson: true,
    buyerBuildSectorFlag: true,
    buyerResellsConstructionServicesFlag: false,
    lineAmountExVat: 25000,
    vatRate: 25,
    goodsOrServices: "services",
    actorId: "unit-test"
  });
  assert.equal(vatAssessment.reverseChargeFlag, true);
  assert.equal(vatAssessment.vatCode, "VAT_SE_RC_BUILD_SELL");
  assert.equal(vatAssessment.decisionCategory, "construction_reverse_charge_sale");
  assert.equal(vatAssessment.invoiceTextRequirements.includes("buyer_vat_number_required"), true);

  const auditEvents = projectsPlatform.listProjectAuditEvents({
    companyId: COMPANY_ID,
    projectId: project.projectId
  });
  assert.equal(auditEvents.some((event) => event.action === "project.change_order.status_changed"), true);
  assert.equal(auditEvents.some((event) => event.action === "project.build_vat_assessment.created"), true);
});
