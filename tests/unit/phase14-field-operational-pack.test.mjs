import test from "node:test";
import assert from "node:assert/strict";
import { createFieldPlatform } from "../../packages/domain-field/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 14.5 builds operational case runtime above optional work-order pack and blocks invoice on open conflicts", () => {
  const fixture = createFieldFixture();
  const { fieldPlatform, invoices, project, employment } = fixture;

  const location = fieldPlatform.createInventoryLocation({
    companyId: COMPANY_ID,
    locationCode: "MAIN-WH",
    displayName: "Main Warehouse",
    locationType: "warehouse",
    actorId: "unit-test"
  });
  const inventoryItem = fieldPlatform.createInventoryItem({
    companyId: COMPANY_ID,
    itemCode: "MAT-CABLE",
    displayName: "Installation cable",
    unitCode: "m",
    arItemId: "material-ar-item",
    salesUnitPriceAmount: 45,
    locationBalances: [{ inventoryLocationId: location.inventoryLocationId, onHandQuantity: 25 }],
    actorId: "unit-test"
  });

  const generalCase = fieldPlatform.createOperationalCase({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    displayName: "General onsite service case",
    caseTypeCode: "service_case",
    packCodes: [],
    actorId: "unit-test"
  });
  assert.equal(generalCase.workOrderNo, null);
  assert.equal(fieldPlatform.listWorkOrders({ companyId: COMPANY_ID }).length, 0);
  assert.equal(fieldPlatform.listOperationalCases({ companyId: COMPANY_ID }).length, 1);

  const workOrderCase = fieldPlatform.createOperationalCase({
    companyId: COMPANY_ID,
    projectId: project.projectId,
    displayName: "Install field unit",
    caseTypeCode: "work_order",
    packCodes: ["work_order"],
    serviceTypeCode: "installation",
    laborItemId: "labor-ar-item",
    laborRateAmount: 1200,
    signatureRequired: true,
    actorId: "unit-test"
  });
  assert.equal(workOrderCase.packCodes.includes("work_order"), true);

  const dispatch = fieldPlatform.createDispatchAssignment({
    companyId: COMPANY_ID,
    workOrderId: workOrderCase.workOrderId,
    employmentId: employment.employmentId,
    startsAt: "2026-03-25T07:00:00Z",
    endsAt: "2026-03-25T10:00:00Z",
    actorId: "unit-test"
  });
  fieldPlatform.markDispatchEnRoute({
    companyId: COMPANY_ID,
    workOrderId: workOrderCase.workOrderId,
    dispatchAssignmentId: dispatch.dispatchAssignmentId,
    actorId: "unit-test"
  });
  fieldPlatform.markDispatchOnSite({
    companyId: COMPANY_ID,
    workOrderId: workOrderCase.workOrderId,
    dispatchAssignmentId: dispatch.dispatchAssignmentId,
    actorId: "unit-test"
  });

  const reservation = fieldPlatform.createMaterialReservation({
    companyId: COMPANY_ID,
    operationalCaseId: workOrderCase.operationalCaseId,
    inventoryItemId: inventoryItem.inventoryItemId,
    inventoryLocationId: location.inventoryLocationId,
    quantity: 2,
    actorId: "unit-test"
  });
  assert.equal(reservation.status, "active");

  const usage = fieldPlatform.createMaterialUsage({
    companyId: COMPANY_ID,
    operationalCaseId: workOrderCase.operationalCaseId,
    inventoryItemId: inventoryItem.inventoryItemId,
    inventoryLocationId: location.inventoryLocationId,
    quantity: 2,
    sourceChannel: "mobile",
    actorId: "unit-test"
  });
  assert.equal(usage.materialUsageId, usage.materialWithdrawalId);

  const balance = fieldPlatform.listInventoryBalances({
    companyId: COMPANY_ID,
    inventoryItemId: inventoryItem.inventoryItemId,
    inventoryLocationId: location.inventoryLocationId
  })[0];
  assert.equal(balance.onHandQuantity, 23);
  assert.equal(balance.reservedQuantity, 0);

  const signature = fieldPlatform.captureCustomerSignature({
    companyId: COMPANY_ID,
    workOrderId: workOrderCase.workOrderId,
    signerName: "Customer Signer",
    signedAt: "2026-03-25T10:10:00Z",
    signatureText: "Approved onsite.",
    actorId: "unit-test"
  });
  assert.equal(signature.signatureRecordId, signature.fieldCustomerSignatureId);

  const completed = fieldPlatform.completeWorkOrder({
    companyId: COMPANY_ID,
    workOrderId: workOrderCase.workOrderId,
    completedAt: "2026-03-25T10:15:00Z",
    laborMinutes: 90,
    actorId: "unit-test"
  });
  assert.equal(completed.status, "completed");

  const conflict = fieldPlatform.syncOfflineEnvelope({
    companyId: COMPANY_ID,
    clientMutationId: "field-conflict-001",
    clientDeviceId: "device-01",
    clientUserId: "field.user",
    objectType: "field_work_order",
    mutationType: "work_order.complete",
    baseServerVersion: 1,
    payload: {
      workOrderId: workOrderCase.workOrderId,
      completedAt: "2026-03-25T10:15:00Z",
      laborMinutes: 90
    },
    actorId: "unit-test"
  });
  assert.equal(conflict.syncStatus, "conflicted");
  assert.equal(typeof conflict.conflictRecordId, "string");

  const openConflicts = fieldPlatform.listConflictRecords({
    companyId: COMPANY_ID,
    operationalCaseId: workOrderCase.operationalCaseId
  });
  assert.equal(openConflicts.length, 1);
  assert.equal(openConflicts[0].status, "open");

  const fieldEvidence = fieldPlatform.listFieldEvidence({
    companyId: COMPANY_ID,
    operationalCaseId: workOrderCase.operationalCaseId
  });
  assert.equal(fieldEvidence.some((entry) => entry.evidenceTypeCode === "material_usage"), true);
  assert.equal(fieldEvidence.some((entry) => entry.evidenceTypeCode === "signature_capture"), true);
  assert.equal(fieldEvidence.some((entry) => entry.evidenceTypeCode === "sync_conflict"), true);

  assert.throws(
    () =>
      fieldPlatform.createWorkOrderInvoice({
        companyId: COMPANY_ID,
        workOrderId: workOrderCase.workOrderId,
        issueDate: "2026-03-25",
        dueDate: "2026-04-24",
        actorId: "unit-test"
      }),
    (error) => error?.code === "field_operational_case_open_conflicts"
  );

  const resolvedConflict = fieldPlatform.resolveConflictRecord({
    companyId: COMPANY_ID,
    operationalCaseId: workOrderCase.operationalCaseId,
    conflictRecordId: openConflicts[0].conflictRecordId,
    actorId: "unit-test"
  });
  assert.equal(resolvedConflict.status, "resolved");

  const invoiced = fieldPlatform.createWorkOrderInvoice({
    companyId: COMPANY_ID,
    workOrderId: workOrderCase.workOrderId,
    issueDate: "2026-03-25",
    dueDate: "2026-04-24",
    actorId: "unit-test"
  });
  assert.equal(invoiced.workOrder.status, "invoiced");
  assert.equal(invoices.length, 1);
});

function createFieldFixture() {
  const invoices = [];
  const project = {
    projectId: "project-001",
    companyId: COMPANY_ID,
    customerId: "customer-001"
  };
  const employment = {
    employmentId: "employment-001"
  };
  const arItems = new Map([
    ["labor-ar-item", { arItemId: "labor-ar-item", standardPrice: 1200 }],
    ["material-ar-item", { arItemId: "material-ar-item", standardPrice: 45 }]
  ]);

  const fieldPlatform = createFieldPlatform({
    clock: () => new Date("2026-03-25T06:00:00Z"),
    seedDemo: false,
    projectsPlatform: {
      getProject({ companyId, projectId }) {
        assert.equal(companyId, COMPANY_ID);
        assert.equal(projectId, project.projectId);
        return structuredClone(project);
      }
    },
    hrPlatform: {
      listEmployees({ companyId }) {
        assert.equal(companyId, COMPANY_ID);
        return [{ employeeId: "employee-001" }];
      },
      listEmployments({ companyId, employeeId }) {
        assert.equal(companyId, COMPANY_ID);
        assert.equal(employeeId, "employee-001");
        return [structuredClone(employment)];
      }
    },
    arPlatform: {
      getCustomer({ companyId, customerId }) {
        assert.equal(companyId, COMPANY_ID);
        assert.equal(customerId, project.customerId);
        return { customerId };
      },
      getItem({ companyId, itemId }) {
        assert.equal(companyId, COMPANY_ID);
        const item = arItems.get(itemId);
        if (!item) {
          throw new Error(`Unknown AR item ${itemId}`);
        }
        return structuredClone(item);
      },
      createInvoice(payload) {
        const invoice = {
          customerInvoiceId: `invoice-${invoices.length + 1}`,
          ...structuredClone(payload)
        };
        invoices.push(invoice);
        return structuredClone(invoice);
      },
      issueInvoice({ customerInvoiceId }) {
        return {
          customerInvoiceId,
          journalEntryId: `journal-${customerInvoiceId}`
        };
      }
    }
  });

  return { fieldPlatform, invoices, project, employment };
}
