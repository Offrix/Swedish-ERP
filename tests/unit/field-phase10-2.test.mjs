import test from "node:test";
import assert from "node:assert/strict";
import { createFieldPlatform, createFieldSyncClient } from "../../packages/domain-field/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 10.2 offline queue survives network interruption and replays deterministically", async () => {
  const syncClient = createFieldSyncClient({
    companyId: COMPANY_ID,
    clientDeviceId: "device-01",
    clientUserId: "field.user"
  });

  syncClient.enqueueMutation({
    objectType: "field_material_withdrawal",
    mutationType: "material_withdrawal.create",
    localObjectId: "local-withdrawal-01",
    baseServerVersion: 2,
    payload: {
      workOrderId: "work-order-01",
      inventoryItemId: "inventory-item-01",
      inventoryLocationId: "inventory-location-01",
      quantity: 2
    }
  });

  const firstAttempt = await syncClient.flushMutations({
    send: async () => {
      const error = new Error("network unavailable");
      error.code = "network_unavailable";
      throw error;
    }
  });

  assert.equal(firstAttempt[0].syncStatus, "pending");
  assert.equal(firstAttempt[0].lastErrorCode, "network_unavailable");
  assert.equal(syncClient.listQueuedMutations()[0].retryCount, 1);

  const secondAttempt = await syncClient.flushMutations({
    send: async (record) => ({
      syncStatus: "synced",
      serverObjectId: `server:${record.localObjectId}`
    })
  });

  assert.equal(secondAttempt[0].syncStatus, "synced");
  assert.equal(secondAttempt[0].serverObjectId, "server:local-withdrawal-01");
  assert.equal(syncClient.listQueuedMutations()[0].syncStatus, "synced");
});

test("Phase 10.2 links material withdrawals to project and prepares completed work orders for finance review", () => {
  const fixture = createFieldFixture();
  const { fieldPlatform } = fixture;

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
    locationBalances: [
      {
        inventoryLocationId: location.inventoryLocationId,
        onHandQuantity: 25
      }
    ],
    actorId: "unit-test"
  });
  const workOrder = fieldPlatform.createWorkOrder({
    companyId: COMPANY_ID,
    projectId: fixture.project.projectId,
    displayName: "Install field unit",
    serviceTypeCode: "installation",
    laborItemId: "labor-ar-item",
    laborRateAmount: 1200,
    actorId: "unit-test"
  });
  const dispatch = fieldPlatform.createDispatchAssignment({
    companyId: COMPANY_ID,
    workOrderId: workOrder.workOrderId,
    employmentId: fixture.employment.employmentId,
    startsAt: "2026-03-25T07:00:00Z",
    endsAt: "2026-03-25T10:00:00Z",
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

  const withdrawal = fieldPlatform.createMaterialWithdrawal({
    companyId: COMPANY_ID,
    workOrderId: workOrder.workOrderId,
    inventoryItemId: inventoryItem.inventoryItemId,
    inventoryLocationId: location.inventoryLocationId,
    quantity: 2,
    sourceChannel: "mobile",
    actorId: "unit-test"
  });

  assert.equal(withdrawal.projectId, fixture.project.projectId);
  assert.equal(
    fieldPlatform.listInventoryBalances({
      companyId: COMPANY_ID,
      inventoryItemId: inventoryItem.inventoryItemId,
      inventoryLocationId: location.inventoryLocationId
    })[0].onHandQuantity,
    23
  );

  assert.throws(
    () =>
      fieldPlatform.completeWorkOrder({
        companyId: COMPANY_ID,
        workOrderId: workOrder.workOrderId,
        completedAt: "2026-03-25T10:15:00Z",
        laborMinutes: 90,
        actorId: "unit-test"
      }),
    (error) => error?.code === "field_work_order_signature_required"
  );

  fieldPlatform.captureCustomerSignature({
    companyId: COMPANY_ID,
    workOrderId: workOrder.workOrderId,
    signerName: "Customer Signer",
    signedAt: "2026-03-25T10:10:00Z",
    signatureText: "Approved onsite.",
    actorId: "unit-test"
  });
  const completed = fieldPlatform.completeWorkOrder({
    companyId: COMPANY_ID,
    workOrderId: workOrder.workOrderId,
    completedAt: "2026-03-25T10:15:00Z",
    laborMinutes: 90,
    actorId: "unit-test"
  });
  assert.equal(completed.status, "completed");

  const handoff = fieldPlatform.createWorkOrderFinanceHandoff({
    companyId: COMPANY_ID,
    workOrderId: workOrder.workOrderId,
    actorId: "unit-test"
  });

  assert.equal(handoff.workOrder.status, "completed");
  assert.equal(handoff.workOrder.financeTruthOwner, "projects");
  assert.equal(typeof handoff.workOrder.currentFinanceHandoffId, "string");
  assert.equal(handoff.financeHandoff.financeTruthOwner, "projects");
  assert.equal(handoff.financeHandoff.candidateLines.length, 2);
  assert.equal(handoff.financeHandoff.candidateLines[0].projectId, fixture.project.projectId);
  assert.equal(handoff.financeHandoff.candidateLines[1].projectId, fixture.project.projectId);

  const auditEvents = fieldPlatform.listFieldAuditEvents({
    companyId: COMPANY_ID,
    workOrderId: workOrder.workOrderId
  });
  assert.equal(auditEvents.some((event) => event.action === "field.material_withdrawal.created"), true);
  assert.equal(auditEvents.some((event) => event.action === "field.work_order.finance_handoff.created"), true);
});

test("Phase 10.2 marks stale offline envelopes as conflicts", () => {
  const fixture = createFieldFixture();
  const { fieldPlatform } = fixture;

  const workOrder = fieldPlatform.createWorkOrder({
    companyId: COMPANY_ID,
    projectId: fixture.project.projectId,
    displayName: "Conflict demo",
    serviceTypeCode: "service",
    laborItemId: "labor-ar-item",
    laborRateAmount: 1000,
    actorId: "unit-test"
  });
  fieldPlatform.createDispatchAssignment({
    companyId: COMPANY_ID,
    workOrderId: workOrder.workOrderId,
    employmentId: fixture.employment.employmentId,
    startsAt: "2026-03-25T07:00:00Z",
    endsAt: "2026-03-25T08:00:00Z",
    actorId: "unit-test"
  });

  const conflict = fieldPlatform.syncOfflineEnvelope({
    companyId: COMPANY_ID,
    clientMutationId: "client-mutation-01",
    clientDeviceId: "device-01",
    clientUserId: "field.user",
    objectType: "field_work_order",
    mutationType: "work_order.complete",
    baseServerVersion: 1,
    payload: {
      workOrderId: workOrder.workOrderId,
      completedAt: "2026-03-25T08:00:00Z",
      laborMinutes: 60
    },
    actorId: "unit-test"
  });

  assert.equal(conflict.syncStatus, "conflicted");
  assert.equal(conflict.lastErrorCode, "version_conflict");
  assert.equal(
    fieldPlatform.listSyncEnvelopes({
      companyId: COMPANY_ID,
      syncStatus: "conflicted"
    }).length,
    1
  );
});

function createFieldFixture() {
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
      },
      listProjectVerticalPackLinks({ companyId, projectId, packType }) {
        assert.equal(companyId, COMPANY_ID);
        assert.equal(projectId, project.projectId);
        assert.equal(packType, "field");
        return [{
          linkId: "field-pack-link-001",
          projectVerticalPackLinkId: "field-pack-link-001",
          companyId,
          projectId,
          packType,
          verticalRefs: { workModelCodes: ["work_order"] },
          financeTruthOwner: "projects"
        }];
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
      }
    }
  });

  return { fieldPlatform, project, employment };
}
