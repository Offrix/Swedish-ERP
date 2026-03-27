import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";

const DEMO_COMPANY_ID = "00000000-0000-4000-8000-000000000001";

export const FIELD_WORK_ORDER_STATUSES = Object.freeze([
  "draft",
  "ready_for_dispatch",
  "dispatched",
  "in_progress",
  "completed",
  "invoiced",
  "cancelled"
]);
export const FIELD_DISPATCH_STATUSES = Object.freeze(["planned", "accepted", "en_route", "on_site", "completed", "cancelled"]);
export const FIELD_INVENTORY_LOCATION_TYPES = Object.freeze(["warehouse", "truck", "site"]);
export const FIELD_SIGNATURE_STATUSES = Object.freeze(["pending", "captured", "voided"]);
export const FIELD_SYNC_ENVELOPE_STATUSES = Object.freeze(["pending", "synced", "conflicted", "failed_terminal"]);

const FIELD_OFFLINE_POLICIES = Object.freeze([
  {
    objectType: "field_material_withdrawal",
    allowedMutationTypes: ["material_withdrawal.create"],
    mergeStrategy: "manual_resolution"
  },
  {
    objectType: "field_customer_signature",
    allowedMutationTypes: ["customer_signature.capture"],
    mergeStrategy: "server_wins"
  },
  {
    objectType: "field_work_order",
    allowedMutationTypes: ["work_order.complete"],
    mergeStrategy: "manual_resolution"
  }
]);

export function createFieldPlatform(options = {}) {
  return createFieldEngine(options);
}

export function createFieldSyncClient({
  clock = () => new Date(),
  companyId,
  clientDeviceId = crypto.randomUUID(),
  clientUserId = "field-mobile",
  policyVersion = "phase10.2"
} = {}) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const queue = [];

  return {
    listQueuedMutations: () => queue.map(copy),
    enqueueMutation({ objectType, mutationType, localObjectId = null, serverObjectId = null, baseServerVersion = null, payload = {} } = {}) {
      const policy = requireOfflinePolicy(objectType, mutationType);
      const record = {
        localEnvelopeId: crypto.randomUUID(),
        companyId: resolvedCompanyId,
        clientMutationId: crypto.randomUUID(),
        clientDeviceId,
        clientUserId,
        objectType: policy.objectType,
        mutationType,
        localObjectId: normalizeOptionalText(localObjectId),
        serverObjectId: normalizeOptionalText(serverObjectId),
        baseServerVersion: normalizeOptionalInteger(baseServerVersion),
        policyVersion,
        mergeStrategy: policy.mergeStrategy,
        payloadHash: hashObject(payload),
        payloadJson: copy(payload),
        syncStatus: "pending",
        retryCount: 0,
        lastErrorCode: null,
        createdAt: nowIso(clock)
      };
      queue.push(record);
      return copy(record);
    },
    async flushMutations({ send } = {}) {
      if (typeof send !== "function") {
        throw createError(500, "field_sync_sender_required", "Sync sender is required.");
      }
      const results = [];
      for (const record of queue) {
        if (record.syncStatus === "synced") {
          results.push({ clientMutationId: record.clientMutationId, syncStatus: record.syncStatus });
          continue;
        }
        try {
          const response = await send(copy(record));
          record.syncStatus = requireEnvelopeStatus(response?.syncStatus || "synced");
          record.serverObjectId = normalizeOptionalText(response?.serverObjectId) || record.serverObjectId;
          record.lastErrorCode = normalizeOptionalText(response?.lastErrorCode);
          results.push({ clientMutationId: record.clientMutationId, syncStatus: record.syncStatus, serverObjectId: record.serverObjectId });
        } catch (error) {
          record.retryCount += 1;
          record.syncStatus = "pending";
          record.lastErrorCode = normalizeOptionalText(error?.code) || "network_error";
          results.push({ clientMutationId: record.clientMutationId, syncStatus: record.syncStatus, lastErrorCode: record.lastErrorCode });
          break;
        }
      }
      return results;
    }
  };
}

export function createFieldEngine({
  clock = () => new Date(),
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null,
  arPlatform = null,
  hrPlatform = null,
  projectsPlatform = null
} = {}) {
  const state = {
    inventoryLocations: new Map(),
    inventoryLocationIdsByCompany: new Map(),
    inventoryLocationIdByCode: new Map(),
    inventoryItems: new Map(),
    inventoryItemIdsByCompany: new Map(),
    inventoryItemIdByCode: new Map(),
    inventoryBalances: new Map(),
    workOrders: new Map(),
    workOrderIdsByCompany: new Map(),
    workOrderIdByNo: new Map(),
    dispatchAssignments: new Map(),
    dispatchIdsByWorkOrder: new Map(),
    materialWithdrawals: new Map(),
    materialWithdrawalIdsByWorkOrder: new Map(),
    customerSignatures: new Map(),
    signatureIdsByWorkOrder: new Map(),
    syncEnvelopes: new Map(),
    syncEnvelopeIdsByCompany: new Map(),
    syncEnvelopeIdByClientMutation: new Map(),
    auditEvents: []
  };

  if (seedDemo) {
    seedFieldDemo(state, clock);
  }

  function listInventoryLocations({ companyId, locationType = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedLocationType = normalizeOptionalText(locationType);
    return (state.inventoryLocationIdsByCompany.get(resolvedCompanyId) || [])
      .map((inventoryLocationId) => state.inventoryLocations.get(inventoryLocationId))
      .filter(Boolean)
      .filter((location) => (resolvedLocationType ? location.locationType === resolvedLocationType : true))
      .sort((left, right) => left.locationCode.localeCompare(right.locationCode))
      .map(copy);
  }

  function createInventoryLocation({
    companyId,
    inventoryLocationId = null,
    locationCode,
    displayName,
    locationType = "warehouse",
    projectId = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedLocationCode = requireText(locationCode, "field_inventory_location_code_required");
    const resolvedLocationType = requireEnum(FIELD_INVENTORY_LOCATION_TYPES, locationType, "field_inventory_location_type_invalid");
    const scopedCodeKey = toCompanyScopedKey(resolvedCompanyId, resolvedLocationCode);
    if (state.inventoryLocationIdByCode.has(scopedCodeKey)) {
      throw createError(409, "field_inventory_location_code_not_unique", `Location code ${resolvedLocationCode} already exists.`);
    }
    if (projectId) {
      requireProject(projectsPlatform, resolvedCompanyId, projectId);
    }
    const record = {
      inventoryLocationId: normalizeOptionalText(inventoryLocationId) || crypto.randomUUID(),
      companyId: resolvedCompanyId,
      locationCode: resolvedLocationCode,
      displayName: requireText(displayName, "field_inventory_location_name_required"),
      locationType: resolvedLocationType,
      projectId: normalizeOptionalText(projectId),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    state.inventoryLocations.set(record.inventoryLocationId, record);
    ensureCollection(state.inventoryLocationIdsByCompany, record.companyId).push(record.inventoryLocationId);
    state.inventoryLocationIdByCode.set(scopedCodeKey, record.inventoryLocationId);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId,
      correlationId,
      action: "field.inventory_location.created",
      entityType: "inventory_location",
      entityId: record.inventoryLocationId,
      projectId: record.projectId,
      explanation: `Created inventory location ${record.locationCode}.`
    });
    return copy(record);
  }

  function listInventoryItems({ companyId, inventoryLocationId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedLocationId = normalizeOptionalText(inventoryLocationId);
    return (state.inventoryItemIdsByCompany.get(resolvedCompanyId) || [])
      .map((inventoryItemId) => state.inventoryItems.get(inventoryItemId))
      .filter(Boolean)
      .map((record) => enrichInventoryItem(state, record))
      .filter((record) =>
        resolvedLocationId
          ? record.balances.some((candidate) => candidate.inventoryLocationId === resolvedLocationId)
          : true
      )
      .sort((left, right) => left.itemCode.localeCompare(right.itemCode))
      .map(copy);
  }

  function createInventoryItem({
    companyId,
    inventoryItemId = null,
    itemCode,
    displayName,
    unitCode = "ea",
    arItemId = null,
    salesUnitPriceAmount = 0,
    locationBalances = [],
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedItemCode = requireText(itemCode, "field_inventory_item_code_required");
    const scopedItemKey = toCompanyScopedKey(resolvedCompanyId, resolvedItemCode);
    if (state.inventoryItemIdByCode.has(scopedItemKey)) {
      throw createError(409, "field_inventory_item_code_not_unique", `Inventory item ${resolvedItemCode} already exists.`);
    }
    if (arItemId && arPlatform && typeof arPlatform.getItem === "function") {
      arPlatform.getItem({ companyId: resolvedCompanyId, itemId: arItemId });
    }
    const record = {
      inventoryItemId: normalizeOptionalText(inventoryItemId) || crypto.randomUUID(),
      companyId: resolvedCompanyId,
      itemCode: resolvedItemCode,
      displayName: requireText(displayName, "field_inventory_item_name_required"),
      unitCode: requireText(unitCode, "field_inventory_item_unit_required"),
      arItemId: normalizeOptionalText(arItemId),
      salesUnitPriceAmount: normalizeMoney(salesUnitPriceAmount, "field_inventory_sales_price_invalid"),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    state.inventoryItems.set(record.inventoryItemId, record);
    ensureCollection(state.inventoryItemIdsByCompany, record.companyId).push(record.inventoryItemId);
    state.inventoryItemIdByCode.set(scopedItemKey, record.inventoryItemId);
    for (const locationBalance of locationBalances) {
      createOrReplaceInventoryBalance({
        companyId: record.companyId,
        inventoryItemId: record.inventoryItemId,
        inventoryLocationId: locationBalance.inventoryLocationId,
        onHandQuantity: locationBalance.onHandQuantity ?? 0,
        reservedQuantity: locationBalance.reservedQuantity ?? 0,
        actorId,
        correlationId
      });
    }
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId,
      correlationId,
      action: "field.inventory_item.created",
      entityType: "inventory_item",
      entityId: record.inventoryItemId,
      projectId: null,
      explanation: `Created inventory item ${record.itemCode}.`
    });
    return copy(enrichInventoryItem(state, record));
  }

  function listInventoryBalances({ companyId, inventoryItemId = null, inventoryLocationId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedItemId = normalizeOptionalText(inventoryItemId);
    const resolvedLocationId = normalizeOptionalText(inventoryLocationId);
    return Array.from(state.inventoryBalances.values())
      .filter((record) => record.companyId === resolvedCompanyId)
      .filter((record) => (resolvedItemId ? record.inventoryItemId === resolvedItemId : true))
      .filter((record) => (resolvedLocationId ? record.inventoryLocationId === resolvedLocationId : true))
      .map(copy);
  }

  function createOrReplaceInventoryBalance({
    companyId,
    inventoryItemId,
    inventoryLocationId,
    onHandQuantity = 0,
    reservedQuantity = 0,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const inventoryItem = requireInventoryItem(state, companyId, inventoryItemId);
    const inventoryLocation = requireInventoryLocation(state, companyId, inventoryLocationId);
    const record = {
      inventoryBalanceId: state.inventoryBalances.get(toInventoryBalanceKey(inventoryItem.inventoryItemId, inventoryLocation.inventoryLocationId))
        ?.inventoryBalanceId || crypto.randomUUID(),
      companyId: inventoryItem.companyId,
      inventoryItemId: inventoryItem.inventoryItemId,
      inventoryLocationId: inventoryLocation.inventoryLocationId,
      onHandQuantity: normalizeQuantity(onHandQuantity, "field_inventory_on_hand_invalid"),
      reservedQuantity: normalizeQuantity(reservedQuantity, "field_inventory_reserved_invalid"),
      updatedByActorId: requireText(actorId, "actor_id_required"),
      updatedAt: nowIso(clock)
    };
    if (record.reservedQuantity > record.onHandQuantity) {
      throw createError(400, "field_inventory_reserved_exceeds_on_hand", "Reserved quantity cannot exceed on-hand quantity.");
    }
    state.inventoryBalances.set(toInventoryBalanceKey(record.inventoryItemId, record.inventoryLocationId), record);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId,
      correlationId,
      action: "field.inventory_balance.upserted",
      entityType: "inventory_balance",
      entityId: record.inventoryBalanceId,
      projectId: inventoryLocation.projectId,
      explanation: `Updated inventory balance for ${inventoryItem.itemCode} at ${inventoryLocation.locationCode}.`
    });
    return copy(record);
  }

  function listWorkOrders({ companyId, status = null, employmentId = null, projectId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = normalizeOptionalText(status);
    const resolvedEmploymentId = normalizeOptionalText(employmentId);
    const resolvedProjectId = normalizeOptionalText(projectId);
    return (state.workOrderIdsByCompany.get(resolvedCompanyId) || [])
      .map((workOrderId) => state.workOrders.get(workOrderId))
      .filter(Boolean)
      .map((record) => enrichWorkOrder(state, record))
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .filter((record) => (resolvedProjectId ? record.projectId === resolvedProjectId : true))
      .filter((record) =>
        resolvedEmploymentId
          ? record.dispatchAssignments.some((assignment) => assignment.employmentId === resolvedEmploymentId && assignment.status !== "cancelled")
          : true
      )
      .sort((left, right) => left.workOrderNo.localeCompare(right.workOrderNo))
      .map(copy);
  }

  function getProjectFieldSummary({ companyId, projectId } = {}) {
    const project = requireProject(projectsPlatform, companyId, projectId);
    const workOrders = listWorkOrders({
      companyId: project.companyId,
      projectId: project.projectId
    });
    const openStatuses = new Set(["ready_for_dispatch", "dispatched", "in_progress"]);
    const latestOperationalUpdateAt =
      workOrders
        .map((workOrder) => workOrder.updatedAt || workOrder.createdAt || null)
        .filter(Boolean)
        .sort()
        .at(-1) || null;
    return {
      projectId: project.projectId,
      totalWorkOrderCount: workOrders.length,
      openWorkOrderCount: workOrders.filter((workOrder) => openStatuses.has(workOrder.status)).length,
      inProgressWorkOrderCount: workOrders.filter((workOrder) => workOrder.status === "in_progress").length,
      completedUnbilledWorkOrderCount: workOrders.filter((workOrder) => workOrder.status === "completed").length,
      pendingSignatureCount: workOrders.filter(
        (workOrder) => workOrder.signatureRequired === true && workOrder.signatureStatus === "pending"
      ).length,
      dispatchAssignedCount: workOrders.reduce(
        (sum, workOrder) =>
          sum + workOrder.dispatchAssignments.filter((assignment) => assignment.status !== "cancelled").length,
        0
      ),
      materialWithdrawalCount: workOrders.reduce((sum, workOrder) => sum + workOrder.materialWithdrawals.length, 0),
      materialWithdrawalAmount: roundMoney(
        workOrders.reduce(
          (sum, workOrder) =>
            sum +
            workOrder.materialWithdrawals.reduce(
              (workOrderSum, withdrawal) =>
                workOrderSum + Number(withdrawal.quantity || 0) * Number(withdrawal.salesUnitPriceAmount || 0),
              0
            ),
          0
        )
      ),
      latestOperationalUpdateAt,
      workOrders: workOrders.map((workOrder) => ({
        workOrderId: workOrder.workOrderId,
        workOrderNo: workOrder.workOrderNo,
        displayName: workOrder.displayName,
        status: workOrder.status,
        priorityCode: workOrder.priorityCode,
        signatureStatus: workOrder.signatureStatus,
        customerInvoiceId: workOrder.customerInvoiceId,
        dispatchCount: workOrder.dispatchAssignments.length,
        materialWithdrawalCount: workOrder.materialWithdrawals.length,
        actualStartedAt: workOrder.actualStartedAt,
        actualEndedAt: workOrder.actualEndedAt,
        updatedAt: workOrder.updatedAt
      }))
    };
  }

  function getWorkOrder({ companyId, workOrderId } = {}) {
    return copy(enrichWorkOrder(state, requireWorkOrder(state, companyId, workOrderId)));
  }

  function createWorkOrder({
    companyId,
    workOrderId = null,
    workOrderNo = null,
    projectId,
    customerId = null,
    displayName,
    description = null,
    serviceTypeCode = "service",
    priorityCode = "normal",
    scheduledStartAt = null,
    scheduledEndAt = null,
    laborItemId = null,
    laborRateAmount = 0,
    signatureRequired = true,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const project = requireProject(projectsPlatform, resolvedCompanyId, projectId);
    const resolvedWorkOrderNo = requireText(
      workOrderNo || generateWorkOrderNo(state, resolvedCompanyId),
      "field_work_order_no_required"
    );
    const scopedWorkOrderKey = toCompanyScopedKey(resolvedCompanyId, resolvedWorkOrderNo);
    if (state.workOrderIdByNo.has(scopedWorkOrderKey)) {
      throw createError(409, "field_work_order_no_not_unique", `Work order ${resolvedWorkOrderNo} already exists.`);
    }
    const resolvedCustomerId = normalizeOptionalText(customerId) || normalizeOptionalText(project.customerId);
    if (resolvedCustomerId && arPlatform && typeof arPlatform.getCustomer === "function") {
      arPlatform.getCustomer({ companyId: resolvedCompanyId, customerId: resolvedCustomerId });
    }
    if (laborItemId && arPlatform && typeof arPlatform.getItem === "function") {
      arPlatform.getItem({ companyId: resolvedCompanyId, itemId: laborItemId });
    }
    const record = {
      workOrderId: normalizeOptionalText(workOrderId) || crypto.randomUUID(),
      companyId: resolvedCompanyId,
      workOrderNo: resolvedWorkOrderNo,
      projectId: project.projectId,
      customerId: resolvedCustomerId,
      displayName: requireText(displayName, "field_work_order_name_required"),
      description: normalizeOptionalText(description),
      serviceTypeCode: requireText(serviceTypeCode, "field_work_order_service_type_required"),
      priorityCode: requireEnum(["low", "normal", "high", "urgent"], priorityCode, "field_work_order_priority_invalid"),
      status: "ready_for_dispatch",
      scheduledStartAt: normalizeOptionalDateTime(scheduledStartAt),
      scheduledEndAt: normalizeOptionalDateTime(scheduledEndAt),
      actualStartedAt: null,
      actualEndedAt: null,
      laborMinutes: 0,
      laborItemId: normalizeOptionalText(laborItemId),
      laborRateAmount: normalizeMoney(laborRateAmount, "field_work_order_labor_rate_invalid"),
      signatureRequired: signatureRequired === true,
      signatureStatus: signatureRequired === true ? "pending" : "captured",
      customerInvoiceId: null,
      versionNo: 1,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.workOrders.set(record.workOrderId, record);
    ensureCollection(state.workOrderIdsByCompany, record.companyId).push(record.workOrderId);
    state.workOrderIdByNo.set(scopedWorkOrderKey, record.workOrderId);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId,
      correlationId,
      action: "field.work_order.created",
      entityType: "field_work_order",
      entityId: record.workOrderId,
      projectId: record.projectId,
      explanation: `Created work order ${record.workOrderNo}.`
    });
    return copy(enrichWorkOrder(state, record));
  }

  function listDispatchAssignments({ companyId, workOrderId } = {}) {
    const workOrder = requireWorkOrder(state, companyId, workOrderId);
    return (state.dispatchIdsByWorkOrder.get(workOrder.workOrderId) || [])
      .map((dispatchAssignmentId) => state.dispatchAssignments.get(dispatchAssignmentId))
      .filter(Boolean)
      .sort((left, right) => `${left.startsAt}${left.dispatchAssignmentId}`.localeCompare(`${right.startsAt}${right.dispatchAssignmentId}`))
      .map(copy);
  }

  function createDispatchAssignment({
    companyId,
    workOrderId,
    employmentId,
    startsAt,
    endsAt,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const workOrder = requireWorkOrder(state, companyId, workOrderId);
    requireEmployment(hrPlatform, workOrder.companyId, employmentId);
    const record = {
      dispatchAssignmentId: crypto.randomUUID(),
      companyId: workOrder.companyId,
      workOrderId: workOrder.workOrderId,
      employmentId: requireText(employmentId, "employment_id_required"),
      startsAt: requireText(normalizeOptionalDateTime(startsAt), "field_dispatch_start_required"),
      endsAt: requireText(normalizeOptionalDateTime(endsAt), "field_dispatch_end_required"),
      status: "planned",
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    state.dispatchAssignments.set(record.dispatchAssignmentId, record);
    ensureCollection(state.dispatchIdsByWorkOrder, workOrder.workOrderId).push(record.dispatchAssignmentId);
    transitionWorkOrder(clock, workOrder, "dispatched");
    pushAudit(state, clock, {
      companyId: workOrder.companyId,
      actorId,
      correlationId,
      action: "field.dispatch.created",
      entityType: "field_dispatch_assignment",
      entityId: record.dispatchAssignmentId,
      projectId: workOrder.projectId,
      explanation: `Created dispatch assignment for ${workOrder.workOrderNo}.`
    });
    return copy(record);
  }

  function markDispatchEnRoute({ companyId, workOrderId, dispatchAssignmentId, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const workOrder = requireWorkOrder(state, companyId, workOrderId);
    const assignment = requireDispatchAssignment(state, companyId, workOrder.workOrderId, dispatchAssignmentId);
    assignment.status = "en_route";
    pushAudit(state, clock, {
      companyId: workOrder.companyId,
      actorId,
      correlationId,
      action: "field.dispatch.en_route",
      entityType: "field_dispatch_assignment",
      entityId: assignment.dispatchAssignmentId,
      projectId: workOrder.projectId,
      explanation: `Dispatch assignment ${assignment.dispatchAssignmentId} is en route.`
    });
    return copy(assignment);
  }

  function markDispatchOnSite({ companyId, workOrderId, dispatchAssignmentId, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const workOrder = requireWorkOrder(state, companyId, workOrderId);
    const assignment = requireDispatchAssignment(state, companyId, workOrder.workOrderId, dispatchAssignmentId);
    assignment.status = "on_site";
    if (!workOrder.actualStartedAt) {
      workOrder.actualStartedAt = nowIso(clock);
    }
    transitionWorkOrder(clock, workOrder, "in_progress");
    pushAudit(state, clock, {
      companyId: workOrder.companyId,
      actorId,
      correlationId,
      action: "field.dispatch.on_site",
      entityType: "field_dispatch_assignment",
      entityId: assignment.dispatchAssignmentId,
      projectId: workOrder.projectId,
      explanation: `Dispatch assignment ${assignment.dispatchAssignmentId} arrived on site.`
    });
    return copy(assignment);
  }

  function listMaterialWithdrawals({ companyId, workOrderId } = {}) {
    const workOrder = requireWorkOrder(state, companyId, workOrderId);
    return (state.materialWithdrawalIdsByWorkOrder.get(workOrder.workOrderId) || [])
      .map((materialWithdrawalId) => state.materialWithdrawals.get(materialWithdrawalId))
      .filter(Boolean)
      .map(copy);
  }

  function createMaterialWithdrawal({
    companyId,
    workOrderId,
    inventoryItemId,
    inventoryLocationId,
    quantity,
    sourceChannel = "api",
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const workOrder = requireWorkOrder(state, companyId, workOrderId);
    const inventoryItem = requireInventoryItem(state, workOrder.companyId, inventoryItemId);
    const inventoryLocation = requireInventoryLocation(state, workOrder.companyId, inventoryLocationId);
    const balanceKey = toInventoryBalanceKey(inventoryItem.inventoryItemId, inventoryLocation.inventoryLocationId);
    const inventoryBalance = state.inventoryBalances.get(balanceKey);
    const resolvedQuantity = normalizeQuantity(quantity, "field_material_quantity_invalid");
    if (!inventoryBalance || inventoryBalance.onHandQuantity < resolvedQuantity) {
      throw createError(409, "field_inventory_insufficient_stock", "Insufficient stock for the requested material withdrawal.");
    }
    const record = {
      materialWithdrawalId: crypto.randomUUID(),
      companyId: workOrder.companyId,
      workOrderId: workOrder.workOrderId,
      projectId: workOrder.projectId,
      inventoryItemId: inventoryItem.inventoryItemId,
      inventoryLocationId: inventoryLocation.inventoryLocationId,
      quantity: resolvedQuantity,
      salesUnitPriceAmount: inventoryItem.salesUnitPriceAmount,
      sourceChannel: requireEnum(["api", "mobile", "manual"], sourceChannel, "field_material_source_channel_invalid"),
      status: "posted",
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    state.materialWithdrawals.set(record.materialWithdrawalId, record);
    ensureCollection(state.materialWithdrawalIdsByWorkOrder, workOrder.workOrderId).push(record.materialWithdrawalId);
    inventoryBalance.onHandQuantity = roundQuantity(inventoryBalance.onHandQuantity - resolvedQuantity);
    inventoryBalance.updatedAt = nowIso(clock);
    inventoryBalance.updatedByActorId = actorId;
    touchWorkOrder(clock, workOrder);
    pushAudit(state, clock, {
      companyId: workOrder.companyId,
      actorId,
      correlationId,
      action: "field.material_withdrawal.created",
      entityType: "field_material_withdrawal",
      entityId: record.materialWithdrawalId,
      projectId: workOrder.projectId,
      explanation: `Posted material withdrawal for ${workOrder.workOrderNo}.`
    });
    return copy(record);
  }

  function listCustomerSignatures({ companyId, workOrderId } = {}) {
    const workOrder = requireWorkOrder(state, companyId, workOrderId);
    return (state.signatureIdsByWorkOrder.get(workOrder.workOrderId) || [])
      .map((fieldCustomerSignatureId) => state.customerSignatures.get(fieldCustomerSignatureId))
      .filter(Boolean)
      .map(copy);
  }

  function captureCustomerSignature({
    companyId,
    workOrderId,
    signerName,
    signedAt = null,
    signatureText,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const workOrder = requireWorkOrder(state, companyId, workOrderId);
    const record = {
      fieldCustomerSignatureId: crypto.randomUUID(),
      companyId: workOrder.companyId,
      workOrderId: workOrder.workOrderId,
      signerName: requireText(signerName, "field_signature_signer_required"),
      signedAt: requireText(normalizeOptionalDateTime(signedAt) || nowIso(clock), "field_signature_date_required"),
      signatureText: requireText(signatureText, "field_signature_text_required"),
      signatureHash: hashObject({ workOrderId, signerName, signedAt, signatureText }),
      status: "captured",
      capturedByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    state.customerSignatures.set(record.fieldCustomerSignatureId, record);
    ensureCollection(state.signatureIdsByWorkOrder, workOrder.workOrderId).push(record.fieldCustomerSignatureId);
    workOrder.signatureStatus = "captured";
    touchWorkOrder(clock, workOrder);
    pushAudit(state, clock, {
      companyId: workOrder.companyId,
      actorId,
      correlationId,
      action: "field.customer_signature.captured",
      entityType: "field_customer_signature",
      entityId: record.fieldCustomerSignatureId,
      projectId: workOrder.projectId,
      explanation: `Captured customer signature for ${workOrder.workOrderNo}.`
    });
    return copy(record);
  }

  function completeWorkOrder({
    companyId,
    workOrderId,
    completedAt = null,
    laborMinutes,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const workOrder = requireWorkOrder(state, companyId, workOrderId);
    if (!(state.dispatchIdsByWorkOrder.get(workOrder.workOrderId) || []).length) {
      throw createError(409, "field_work_order_dispatch_required", "Work order must be dispatched before completion.");
    }
    if (workOrder.signatureRequired === true && !hasCapturedSignature(state, workOrder.workOrderId)) {
      throw createError(409, "field_work_order_signature_required", "Customer signature must be captured before completion.");
    }
    workOrder.actualEndedAt = requireText(normalizeOptionalDateTime(completedAt) || nowIso(clock), "field_work_order_completed_at_required");
    workOrder.laborMinutes = normalizeQuantity(laborMinutes, "field_work_order_labor_minutes_invalid");
    transitionWorkOrder(clock, workOrder, "completed");
    pushAudit(state, clock, {
      companyId: workOrder.companyId,
      actorId,
      correlationId,
      action: "field.work_order.completed",
      entityType: "field_work_order",
      entityId: workOrder.workOrderId,
      projectId: workOrder.projectId,
      explanation: `Completed work order ${workOrder.workOrderNo}.`
    });
    return copy(enrichWorkOrder(state, workOrder));
  }

  function createWorkOrderInvoice({
    companyId,
    workOrderId,
    issueDate,
    dueDate,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const workOrder = requireWorkOrder(state, companyId, workOrderId);
    if (workOrder.status !== "completed") {
      throw createError(409, "field_work_order_not_completed", "Work order must be completed before invoicing.");
    }
    if (!arPlatform || typeof arPlatform.createInvoice !== "function" || typeof arPlatform.issueInvoice !== "function") {
      throw createError(500, "field_ar_platform_missing", "AR platform is required to invoice field work.");
    }
    const customerId = requireText(
      normalizeOptionalText(workOrder.customerId) || normalizeOptionalText(requireProject(projectsPlatform, workOrder.companyId, workOrder.projectId).customerId),
      "field_work_order_customer_required"
    );
    const invoiceLines = buildWorkOrderInvoiceLines({ state, arPlatform, companyId: workOrder.companyId, workOrder });
    if (!invoiceLines.length) {
      throw createError(409, "field_work_order_invoice_lines_missing", "Work order has no billable invoice lines.");
    }
    const invoice = arPlatform.createInvoice({
      companyId: workOrder.companyId,
      customerId,
      invoiceType: "standard",
      issueDate: normalizeDate(issueDate, "field_work_order_invoice_issue_date_invalid"),
      dueDate: normalizeDate(dueDate, "field_work_order_invoice_due_date_invalid"),
      lines: invoiceLines,
      actorId
    });
    const issued = arPlatform.issueInvoice({
      companyId: workOrder.companyId,
      customerInvoiceId: invoice.customerInvoiceId,
      actorId
    });
    workOrder.customerInvoiceId = issued.customerInvoiceId;
    transitionWorkOrder(clock, workOrder, "invoiced");
    pushAudit(state, clock, {
      companyId: workOrder.companyId,
      actorId,
      correlationId,
      action: "field.work_order.invoiced",
      entityType: "field_work_order",
      entityId: workOrder.workOrderId,
      projectId: workOrder.projectId,
      explanation: `Issued invoice for ${workOrder.workOrderNo}.`
    });
    return {
      workOrder: copy(enrichWorkOrder(state, workOrder)),
      invoice: copy(issued)
    };
  }

  function listMobileToday({ companyId, employmentId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedEmploymentId = requireText(employmentId, "employment_id_required");
    const workOrders = listWorkOrders({
      companyId: resolvedCompanyId,
      employmentId: resolvedEmploymentId
    }).filter((record) => !["completed", "invoiced", "cancelled"].includes(record.status));
    return {
      workOrders,
      offlinePolicies: FIELD_OFFLINE_POLICIES.map(copy),
      summary: {
        assignedWorkOrderCount: workOrders.length,
        pendingSignatureCount: workOrders.filter((record) => record.signatureStatus === "pending").length
      }
    };
  }

  function syncOfflineEnvelope({
    companyId,
    clientMutationId,
    clientDeviceId,
    clientUserId = "field-mobile",
    objectType,
    localObjectId = null,
    serverObjectId = null,
    mutationType,
    baseServerVersion = null,
    payload = {},
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedClientMutationId = requireText(clientMutationId, "field_sync_client_mutation_id_required");
    const scopedMutationKey = toCompanyScopedKey(resolvedCompanyId, resolvedClientMutationId);
    const existingEnvelopeId = state.syncEnvelopeIdByClientMutation.get(scopedMutationKey);
    if (existingEnvelopeId) {
      return copy(state.syncEnvelopes.get(existingEnvelopeId));
    }
    const policy = requireOfflinePolicy(objectType, mutationType);
    const targetWorkOrderId = normalizeOptionalText(payload.workOrderId) || normalizeOptionalText(serverObjectId);
    const targetWorkOrder = targetWorkOrderId ? requireWorkOrder(state, resolvedCompanyId, targetWorkOrderId) : null;
    const record = {
      fieldSyncEnvelopeId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      clientMutationId: resolvedClientMutationId,
      clientDeviceId: requireText(clientDeviceId, "field_sync_device_id_required"),
      clientUserId: requireText(clientUserId, "field_sync_user_id_required"),
      objectType: policy.objectType,
      localObjectId: normalizeOptionalText(localObjectId),
      serverObjectId: targetWorkOrder?.workOrderId || normalizeOptionalText(serverObjectId),
      mutationType: requireText(mutationType, "field_sync_mutation_type_required"),
      baseServerVersion: normalizeOptionalInteger(baseServerVersion),
      mergeStrategy: policy.mergeStrategy,
      payloadHash: hashObject(payload),
      payloadJson: copy(payload),
      syncStatus: "pending",
      lastErrorCode: null,
      createdAt: nowIso(clock),
      appliedAt: null
    };
    if (targetWorkOrder && record.baseServerVersion != null && targetWorkOrder.versionNo !== record.baseServerVersion) {
      record.syncStatus = "conflicted";
      record.lastErrorCode = "version_conflict";
    } else {
      try {
        if (record.mutationType === "material_withdrawal.create") {
          const result = createMaterialWithdrawal({
            companyId: resolvedCompanyId,
            workOrderId: payload.workOrderId,
            inventoryItemId: payload.inventoryItemId,
            inventoryLocationId: payload.inventoryLocationId,
            quantity: payload.quantity,
            sourceChannel: "mobile",
            actorId,
            correlationId
          });
          record.serverObjectId = result.materialWithdrawalId;
        } else if (record.mutationType === "customer_signature.capture") {
          const result = captureCustomerSignature({
            companyId: resolvedCompanyId,
            workOrderId: payload.workOrderId,
            signerName: payload.signerName,
            signedAt: payload.signedAt,
            signatureText: payload.signatureText,
            actorId,
            correlationId
          });
          record.serverObjectId = result.fieldCustomerSignatureId;
        } else if (record.mutationType === "work_order.complete") {
          const result = completeWorkOrder({
            companyId: resolvedCompanyId,
            workOrderId: payload.workOrderId,
            completedAt: payload.completedAt,
            laborMinutes: payload.laborMinutes,
            actorId,
            correlationId
          });
          record.serverObjectId = result.workOrderId;
        }
        record.syncStatus = "synced";
        record.appliedAt = nowIso(clock);
      } catch (error) {
        record.syncStatus = error?.statusCode === 409 ? "conflicted" : "failed_terminal";
        record.lastErrorCode = normalizeOptionalText(error?.code) || "field_sync_apply_failed";
      }
    }
    state.syncEnvelopes.set(record.fieldSyncEnvelopeId, record);
    ensureCollection(state.syncEnvelopeIdsByCompany, record.companyId).push(record.fieldSyncEnvelopeId);
    state.syncEnvelopeIdByClientMutation.set(scopedMutationKey, record.fieldSyncEnvelopeId);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId,
      correlationId,
      action: `field.sync.${record.syncStatus}`,
      entityType: "field_sync_envelope",
      entityId: record.fieldSyncEnvelopeId,
      projectId: targetWorkOrder?.projectId || null,
      explanation: `Processed offline mutation ${record.clientMutationId}.`
    });
    return copy(record);
  }

  function listSyncEnvelopes({ companyId, syncStatus = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedSyncStatus = normalizeOptionalText(syncStatus);
    return (state.syncEnvelopeIdsByCompany.get(resolvedCompanyId) || [])
      .map((fieldSyncEnvelopeId) => state.syncEnvelopes.get(fieldSyncEnvelopeId))
      .filter(Boolean)
      .filter((record) => (resolvedSyncStatus ? record.syncStatus === resolvedSyncStatus : true))
      .map(copy);
  }

  function listFieldAuditEvents({ companyId, projectId = null, workOrderId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedProjectId = normalizeOptionalText(projectId);
    const resolvedWorkOrderId = normalizeOptionalText(workOrderId);
    return state.auditEvents
      .filter((record) => record.companyId === resolvedCompanyId)
      .filter((record) => (resolvedProjectId ? record.projectId === resolvedProjectId : true))
      .filter((record) => {
        if (!resolvedWorkOrderId) {
          return true;
        }
        return record.entityId === resolvedWorkOrderId || record.projectId === state.workOrders.get(resolvedWorkOrderId)?.projectId;
      })
      .map(copy);
  }

  return {
    fieldWorkOrderStatuses: FIELD_WORK_ORDER_STATUSES,
    fieldDispatchStatuses: FIELD_DISPATCH_STATUSES,
    fieldInventoryLocationTypes: FIELD_INVENTORY_LOCATION_TYPES,
    fieldSignatureStatuses: FIELD_SIGNATURE_STATUSES,
    fieldSyncEnvelopeStatuses: FIELD_SYNC_ENVELOPE_STATUSES,
    listOfflinePolicies: () => FIELD_OFFLINE_POLICIES.map(copy),
    listInventoryLocations,
    createInventoryLocation,
    listInventoryItems,
    createInventoryItem,
    listInventoryBalances,
    createOrReplaceInventoryBalance,
    listWorkOrders,
    getProjectFieldSummary,
    getWorkOrder,
    createWorkOrder,
    listDispatchAssignments,
    createDispatchAssignment,
    markDispatchEnRoute,
    markDispatchOnSite,
    listMaterialWithdrawals,
    createMaterialWithdrawal,
    listCustomerSignatures,
    captureCustomerSignature,
    completeWorkOrder,
    createWorkOrderInvoice,
    listMobileToday,
    syncOfflineEnvelope,
    listSyncEnvelopes,
    listFieldAuditEvents
  };
}

function pushAudit(state, clock, event) {
  state.auditEvents.push(
    createAuditEnvelopeFromLegacyEvent({
      clock,
      auditClass: "field_action",
      event
    })
  );
}

function enrichInventoryItem(state, record) {
  const balances = Array.from(state.inventoryBalances.values())
    .filter((candidate) => candidate.inventoryItemId === record.inventoryItemId)
    .map(copy);
  return {
    ...record,
    balances,
    onHandQuantity: roundQuantity(balances.reduce((sum, candidate) => sum + candidate.onHandQuantity, 0))
  };
}

function enrichWorkOrder(state, record) {
  return {
    ...record,
    dispatchAssignments: (state.dispatchIdsByWorkOrder.get(record.workOrderId) || [])
      .map((dispatchAssignmentId) => state.dispatchAssignments.get(dispatchAssignmentId))
      .filter(Boolean)
      .map(copy),
    materialWithdrawals: (state.materialWithdrawalIdsByWorkOrder.get(record.workOrderId) || [])
      .map((materialWithdrawalId) => state.materialWithdrawals.get(materialWithdrawalId))
      .filter(Boolean)
      .map(copy),
    customerSignatures: (state.signatureIdsByWorkOrder.get(record.workOrderId) || [])
      .map((fieldCustomerSignatureId) => state.customerSignatures.get(fieldCustomerSignatureId))
      .filter(Boolean)
      .map(copy)
  };
}

function buildWorkOrderInvoiceLines({ state, arPlatform, companyId, workOrder }) {
  const lines = [];
  if (workOrder.laborMinutes > 0) {
    const laborItem = workOrder.laborItemId ? arPlatform.getItem({ companyId, itemId: workOrder.laborItemId }) : null;
    if (!laborItem) {
      throw createError(409, "field_work_order_labor_item_required", "Labor item must be set before invoicing a work order.");
    }
    lines.push({
      itemId: laborItem.arItemId,
      quantity: Number((workOrder.laborMinutes / 60).toFixed(2)),
      unitPrice: workOrder.laborRateAmount > 0 ? workOrder.laborRateAmount : laborItem.standardPrice,
      projectId: workOrder.projectId
    });
  }
  for (const materialWithdrawalId of state.materialWithdrawalIdsByWorkOrder.get(workOrder.workOrderId) || []) {
    const materialWithdrawal = state.materialWithdrawals.get(materialWithdrawalId);
    const inventoryItem = materialWithdrawal ? state.inventoryItems.get(materialWithdrawal.inventoryItemId) : null;
    if (!materialWithdrawal || !inventoryItem || !inventoryItem.arItemId || inventoryItem.salesUnitPriceAmount <= 0) {
      continue;
    }
    lines.push({
      itemId: inventoryItem.arItemId,
      quantity: materialWithdrawal.quantity,
      unitPrice: inventoryItem.salesUnitPriceAmount,
      projectId: workOrder.projectId
    });
  }
  return lines;
}

function requireProject(projectsPlatform, companyId, projectId) {
  if (!projectsPlatform || typeof projectsPlatform.getProject !== "function") {
    throw createError(500, "field_projects_platform_missing", "Projects platform is required.");
  }
  return projectsPlatform.getProject({
    companyId,
    projectId: requireText(projectId, "project_id_required")
  });
}

function requireEmployment(hrPlatform, companyId, employmentId) {
  if (!hrPlatform || typeof hrPlatform.listEmployees !== "function" || typeof hrPlatform.listEmployments !== "function") {
    throw createError(500, "field_hr_platform_missing", "HR platform is required.");
  }
  const employees = hrPlatform.listEmployees({ companyId });
  for (const employee of employees) {
    const employment = hrPlatform
      .listEmployments({ companyId, employeeId: employee.employeeId })
      .find((candidate) => candidate.employmentId === employmentId);
    if (employment) {
      return employment;
    }
  }
  throw createError(404, "field_employment_not_found", "Employment was not found.");
}

function requireInventoryLocation(state, companyId, inventoryLocationId) {
  const record = state.inventoryLocations.get(requireText(inventoryLocationId, "field_inventory_location_id_required"));
  if (!record || record.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "field_inventory_location_not_found", "Inventory location was not found.");
  }
  return record;
}

function requireInventoryItem(state, companyId, inventoryItemId) {
  const record = state.inventoryItems.get(requireText(inventoryItemId, "field_inventory_item_id_required"));
  if (!record || record.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "field_inventory_item_not_found", "Inventory item was not found.");
  }
  return record;
}

function requireWorkOrder(state, companyId, workOrderId) {
  const record = state.workOrders.get(requireText(workOrderId, "field_work_order_id_required"));
  if (!record || record.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "field_work_order_not_found", "Work order was not found.");
  }
  return record;
}

function requireDispatchAssignment(state, companyId, workOrderId, dispatchAssignmentId) {
  const record = state.dispatchAssignments.get(requireText(dispatchAssignmentId, "field_dispatch_assignment_id_required"));
  if (!record || record.companyId !== requireText(companyId, "company_id_required") || record.workOrderId !== requireText(workOrderId, "field_work_order_id_required")) {
    throw createError(404, "field_dispatch_assignment_not_found", "Dispatch assignment was not found.");
  }
  return record;
}

function transitionWorkOrder(clock, workOrder, nextStatus) {
  workOrder.status = requireEnum(FIELD_WORK_ORDER_STATUSES, nextStatus, "field_work_order_status_invalid");
  touchWorkOrder(clock, workOrder);
}

function touchWorkOrder(clock, workOrder) {
  workOrder.versionNo += 1;
  workOrder.updatedAt = nowIso(clock);
}

function generateWorkOrderNo(state, companyId) {
  const nextIndex = (state.workOrderIdsByCompany.get(companyId) || []).length + 1;
  return `WO-2026-${String(nextIndex).padStart(4, "0")}`;
}

function seedFieldDemo(state, clock) {
  const now = nowIso(clock);
  const location = {
    inventoryLocationId: "00000000-0000-4000-8000-000000010301",
    companyId: DEMO_COMPANY_ID,
    locationCode: "MAIN-WH",
    displayName: "Main Warehouse",
    locationType: "warehouse",
    projectId: null,
    createdByActorId: "field_seed",
    createdAt: now
  };
  state.inventoryLocations.set(location.inventoryLocationId, location);
  ensureCollection(state.inventoryLocationIdsByCompany, location.companyId).push(location.inventoryLocationId);
  state.inventoryLocationIdByCode.set(toCompanyScopedKey(location.companyId, location.locationCode), location.inventoryLocationId);

  const truck = {
    inventoryLocationId: "00000000-0000-4000-8000-000000010302",
    companyId: DEMO_COMPANY_ID,
    locationCode: "TRUCK-01",
    displayName: "Field Truck 01",
    locationType: "truck",
    projectId: null,
    createdByActorId: "field_seed",
    createdAt: now
  };
  state.inventoryLocations.set(truck.inventoryLocationId, truck);
  ensureCollection(state.inventoryLocationIdsByCompany, truck.companyId).push(truck.inventoryLocationId);
  state.inventoryLocationIdByCode.set(toCompanyScopedKey(truck.companyId, truck.locationCode), truck.inventoryLocationId);

  const item = {
    inventoryItemId: "00000000-0000-4000-8000-000000010311",
    companyId: DEMO_COMPANY_ID,
    itemCode: "MAT-CABLE",
    displayName: "Installation cable",
    unitCode: "m",
    arItemId: "00000000-0000-4000-8000-000000005122",
    salesUnitPriceAmount: 45,
    createdByActorId: "field_seed",
    createdAt: now
  };
  state.inventoryItems.set(item.inventoryItemId, item);
  ensureCollection(state.inventoryItemIdsByCompany, item.companyId).push(item.inventoryItemId);
  state.inventoryItemIdByCode.set(toCompanyScopedKey(item.companyId, item.itemCode), item.inventoryItemId);
  state.inventoryBalances.set(toInventoryBalanceKey(item.inventoryItemId, location.inventoryLocationId), {
    inventoryBalanceId: "00000000-0000-4000-8000-000000010321",
    companyId: DEMO_COMPANY_ID,
    inventoryItemId: item.inventoryItemId,
    inventoryLocationId: location.inventoryLocationId,
    onHandQuantity: 250,
    reservedQuantity: 0,
    updatedByActorId: "field_seed",
    updatedAt: now
  });

  const workOrder = {
    workOrderId: "00000000-0000-4000-8000-000000010331",
    companyId: DEMO_COMPANY_ID,
    workOrderNo: "WO-2026-0001",
    projectId: "00000000-0000-4000-8000-000000010101",
    customerId: "00000000-0000-4000-8000-000000005101",
    displayName: "Install site equipment",
    description: "Field demo work order",
    serviceTypeCode: "installation",
    priorityCode: "high",
    status: "dispatched",
    scheduledStartAt: "2026-03-24T07:00:00.000Z",
    scheduledEndAt: "2026-03-24T11:00:00.000Z",
    actualStartedAt: null,
    actualEndedAt: null,
    laborMinutes: 0,
    laborItemId: "00000000-0000-4000-8000-000000005121",
    laborRateAmount: 1250,
    signatureRequired: true,
    signatureStatus: "pending",
    customerInvoiceId: null,
    versionNo: 1,
    createdByActorId: "field_seed",
    createdAt: now,
    updatedAt: now
  };
  state.workOrders.set(workOrder.workOrderId, workOrder);
  ensureCollection(state.workOrderIdsByCompany, workOrder.companyId).push(workOrder.workOrderId);
  state.workOrderIdByNo.set(toCompanyScopedKey(workOrder.companyId, workOrder.workOrderNo), workOrder.workOrderId);

  const dispatchAssignment = {
    dispatchAssignmentId: "00000000-0000-4000-8000-000000010341",
    companyId: DEMO_COMPANY_ID,
    workOrderId: workOrder.workOrderId,
    employmentId: "00000000-0000-4000-8000-000000000722",
    startsAt: "2026-03-24T07:00:00.000Z",
    endsAt: "2026-03-24T11:00:00.000Z",
    status: "planned",
    createdByActorId: "field_seed",
    createdAt: now
  };
  state.dispatchAssignments.set(dispatchAssignment.dispatchAssignmentId, dispatchAssignment);
  ensureCollection(state.dispatchIdsByWorkOrder, workOrder.workOrderId).push(dispatchAssignment.dispatchAssignmentId);
}

function ensureCollection(map, key) {
  if (!map.has(key)) {
    map.set(key, []);
  }
  return map.get(key);
}

function hasCapturedSignature(state, workOrderId) {
  return (state.signatureIdsByWorkOrder.get(workOrderId) || [])
    .map((fieldCustomerSignatureId) => state.customerSignatures.get(fieldCustomerSignatureId))
    .filter(Boolean)
    .some((record) => record.status === "captured");
}

function toCompanyScopedKey(companyId, value) {
  return `${companyId}::${String(value).trim().toUpperCase()}`;
}

function toInventoryBalanceKey(inventoryItemId, inventoryLocationId) {
  return `${inventoryItemId}::${inventoryLocationId}`;
}

function hashObject(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function nowIso(clock) {
  return clock().toISOString();
}

function copy(value) {
  return structuredClone(value);
}

function roundMoney(value) {
  return Number(Number(value).toFixed(2));
}

function roundQuantity(value) {
  return Number(Number(value).toFixed(4));
}

function normalizeOptionalText(value) {
  if (value == null) {
    return null;
  }
  const text = String(value).trim();
  return text ? text : null;
}

function normalizeOptionalInteger(value) {
  if (value == null || value === "") {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0) {
    throw createError(400, "field_sync_base_version_invalid", "Base server version must be a non-negative integer.");
  }
  return numeric;
}

function normalizeMoney(value, errorCode) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw createError(400, errorCode, "Amount must be a non-negative number.");
  }
  return roundMoney(numeric);
}

function normalizeQuantity(value, errorCode) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw createError(400, errorCode, "Quantity must be a non-negative number.");
  }
  return roundQuantity(numeric);
}

function normalizeOptionalDateTime(value) {
  if (value == null || value === "") {
    return null;
  }
  const candidate = new Date(value);
  if (Number.isNaN(candidate.getTime())) {
    throw createError(400, "field_datetime_invalid", "Date time is invalid.");
  }
  return candidate.toISOString();
}

function normalizeDate(value, errorCode) {
  const text = requireText(value, errorCode);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw createError(400, errorCode, "Date must use YYYY-MM-DD.");
  }
  return text;
}

function requireText(value, errorCode) {
  const text = normalizeOptionalText(value);
  if (!text) {
    throw createError(400, errorCode, "Required text value is missing.");
  }
  return text;
}

function requireEnvelopeStatus(syncStatus) {
  return requireEnum(FIELD_SYNC_ENVELOPE_STATUSES, syncStatus, "field_sync_status_invalid");
}

function requireOfflinePolicy(objectType, mutationType) {
  const resolvedObjectType = requireText(objectType, "field_sync_object_type_required");
  const resolvedMutationType = requireText(mutationType, "field_sync_mutation_type_required");
  const policy = FIELD_OFFLINE_POLICIES.find((candidate) => candidate.objectType === resolvedObjectType);
  if (!policy || !policy.allowedMutationTypes.includes(resolvedMutationType)) {
    throw createError(409, "unsupported_offline_action", `Offline mutation ${resolvedMutationType} is not allowed for ${resolvedObjectType}.`);
  }
  return policy;
}

function requireEnum(values, value, errorCode) {
  const resolved = requireText(value, errorCode);
  if (!values.includes(resolved)) {
    throw createError(400, errorCode, `Value ${resolved} is not allowed.`);
  }
  return resolved;
}

function createError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
