import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";

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
export const FIELD_MATERIAL_RESERVATION_STATUSES = Object.freeze(["active", "released", "fulfilled", "cancelled"]);
export const FIELD_CONFLICT_RECORD_STATUSES = Object.freeze(["open", "resolved", "dismissed"]);

const FIELD_OFFLINE_POLICIES = Object.freeze([
  {
    objectType: "field_material_withdrawal",
    allowedMutationTypes: ["material_withdrawal.create"],
    mergeStrategy: "manual_resolution"
  },
  {
    objectType: "field_customer_signature",
    allowedMutationTypes: ["customer_signature.capture"],
    mergeStrategy: "manual_resolution"
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
    materialReservations: new Map(),
    materialReservationIdsByWorkOrder: new Map(),
    materialWithdrawals: new Map(),
    materialWithdrawalIdsByWorkOrder: new Map(),
    customerSignatures: new Map(),
    signatureIdsByWorkOrder: new Map(),
    fieldEvidence: new Map(),
    fieldEvidenceIdsByWorkOrder: new Map(),
    syncEnvelopes: new Map(),
    syncEnvelopeIdsByCompany: new Map(),
    syncEnvelopeIdByClientMutation: new Map(),
    conflictRecords: new Map(),
    conflictRecordIdsByWorkOrder: new Map(),
    conflictRecordIdsByCompany: new Map(),
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

  function listOperationalCases({ companyId, status = null, employmentId = null, projectId = null, packCode = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = normalizeOptionalText(status);
    const resolvedEmploymentId = normalizeOptionalText(employmentId);
    const resolvedProjectId = normalizeOptionalText(projectId);
    const resolvedPackCode = normalizeOptionalText(packCode);
    return (state.workOrderIdsByCompany.get(resolvedCompanyId) || [])
      .map((workOrderId) => state.workOrders.get(workOrderId))
      .filter(Boolean)
      .map((record) => enrichOperationalCase(state, record))
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .filter((record) => (resolvedProjectId ? record.projectId === resolvedProjectId : true))
      .filter((record) => (resolvedPackCode ? record.packCodes.includes(resolvedPackCode) : true))
      .filter((record) =>
        resolvedEmploymentId
          ? record.dispatchAssignments.some((assignment) => assignment.employmentId === resolvedEmploymentId && assignment.status !== "cancelled")
          : true
      )
      .sort((left, right) => left.operationalCaseNo.localeCompare(right.operationalCaseNo))
      .map(copy);
  }

  function listWorkOrders({ companyId, status = null, employmentId = null, projectId = null } = {}) {
    return listOperationalCases({
      companyId,
      status,
      employmentId,
      projectId,
      packCode: "work_order"
    }).map(copy);
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

  function getOperationalCase({ companyId, operationalCaseId } = {}) {
    return copy(enrichOperationalCase(state, requireOperationalCase(state, companyId, operationalCaseId)));
  }

  function getWorkOrder({ companyId, workOrderId } = {}) {
    return copy(enrichOperationalCase(state, requireWorkOrder(state, companyId, workOrderId)));
  }

  function createOperationalCase({
    companyId,
    operationalCaseId = null,
    operationalCaseNo = null,
    projectId,
    customerId = null,
    displayName,
    description = null,
    caseTypeCode = "service_case",
    packCodes = [],
    serviceTypeCode = "service",
    priorityCode = "normal",
    scheduledStartAt = null,
    scheduledEndAt = null,
    laborItemId = null,
    laborRateAmount = 0,
    signatureRequired = false,
    workOrderNo = null,
    invoicingPolicyCode = "manual_review",
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const project = requireProject(projectsPlatform, resolvedCompanyId, projectId);
    const resolvedPackCodes = normalizePackCodes(packCodes);
    const hasWorkOrderPack = resolvedPackCodes.includes("work_order");
    const resolvedOperationalCaseNo = requireText(
      operationalCaseNo ||
        workOrderNo ||
        generateOperationalCaseNo(state, resolvedCompanyId, hasWorkOrderPack ? "WO" : "OC"),
      "field_operational_case_no_required"
    );
    const scopedOperationalCaseKey = toCompanyScopedKey(resolvedCompanyId, resolvedOperationalCaseNo);
    if (state.workOrderIdByNo.has(scopedOperationalCaseKey)) {
      throw createError(409, "field_operational_case_no_not_unique", `Operational case ${resolvedOperationalCaseNo} already exists.`);
    }
    const resolvedCustomerId = normalizeOptionalText(customerId) || normalizeOptionalText(project.customerId);
    if (resolvedCustomerId && arPlatform && typeof arPlatform.getCustomer === "function") {
      arPlatform.getCustomer({ companyId: resolvedCompanyId, customerId: resolvedCustomerId });
    }
    if (laborItemId && arPlatform && typeof arPlatform.getItem === "function") {
      arPlatform.getItem({ companyId: resolvedCompanyId, itemId: laborItemId });
    }
    const record = {
      workOrderId: normalizeOptionalText(operationalCaseId) || crypto.randomUUID(),
      operationalCaseId: null,
      companyId: resolvedCompanyId,
      operationalCaseNo: resolvedOperationalCaseNo,
      workOrderNo: hasWorkOrderPack ? resolvedOperationalCaseNo : null,
      projectId: project.projectId,
      customerId: resolvedCustomerId,
      displayName: requireText(displayName, "field_operational_case_name_required"),
      description: normalizeOptionalText(description),
      caseTypeCode: requireText(caseTypeCode, "field_operational_case_type_required"),
      packCodes: resolvedPackCodes,
      serviceTypeCode: requireText(serviceTypeCode, "field_operational_case_service_type_required"),
      priorityCode: requireEnum(["low", "normal", "high", "urgent"], priorityCode, "field_operational_case_priority_invalid"),
      status: hasWorkOrderPack ? "ready_for_dispatch" : "draft",
      scheduledStartAt: normalizeOptionalDateTime(scheduledStartAt),
      scheduledEndAt: normalizeOptionalDateTime(scheduledEndAt),
      actualStartedAt: null,
      actualEndedAt: null,
      laborMinutes: 0,
      laborItemId: normalizeOptionalText(laborItemId),
      laborRateAmount: normalizeMoney(laborRateAmount, "field_operational_case_labor_rate_invalid"),
      signatureRequired: signatureRequired === true,
      signatureStatus: signatureRequired === true ? "pending" : "captured",
      invoicingPolicyCode: requireEnum(["manual_review", "explicit_rule"], invoicingPolicyCode, "field_operational_case_invoicing_policy_invalid"),
      customerInvoiceId: null,
      versionNo: 1,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    record.operationalCaseId = record.workOrderId;
    state.workOrders.set(record.workOrderId, record);
    ensureCollection(state.workOrderIdsByCompany, record.companyId).push(record.workOrderId);
    state.workOrderIdByNo.set(scopedOperationalCaseKey, record.workOrderId);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId,
      correlationId,
      action: "field.operational_case.created",
      entityType: "field_operational_case",
      entityId: record.operationalCaseId,
      projectId: record.projectId,
      explanation: `Created operational case ${record.operationalCaseNo}.`
    });
    if (hasWorkOrderPack) {
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
    }
    return copy(enrichOperationalCase(state, record));
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
    return createOperationalCase({
      companyId,
      operationalCaseId: workOrderId,
      operationalCaseNo: workOrderNo,
      workOrderNo,
      projectId,
      customerId,
      displayName,
      description,
      caseTypeCode: "work_order",
      packCodes: ["work_order"],
      serviceTypeCode,
      priorityCode,
      scheduledStartAt,
      scheduledEndAt,
      laborItemId,
      laborRateAmount,
      signatureRequired,
      invoicingPolicyCode: "manual_review",
      actorId,
      correlationId
    });
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

  function listMaterialReservations({ companyId, operationalCaseId } = {}) {
    const operationalCase = requireOperationalCase(state, companyId, operationalCaseId);
    return (state.materialReservationIdsByWorkOrder.get(operationalCase.operationalCaseId) || [])
      .map((materialReservationId) => state.materialReservations.get(materialReservationId))
      .filter(Boolean)
      .map(copy);
  }

  function createMaterialReservation({
    companyId,
    operationalCaseId,
    inventoryItemId,
    inventoryLocationId,
    quantity,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const operationalCase = requireOperationalCase(state, companyId, operationalCaseId);
    const inventoryItem = requireInventoryItem(state, operationalCase.companyId, inventoryItemId);
    const inventoryLocation = requireInventoryLocation(state, operationalCase.companyId, inventoryLocationId);
    const balanceKey = toInventoryBalanceKey(inventoryItem.inventoryItemId, inventoryLocation.inventoryLocationId);
    const inventoryBalance = state.inventoryBalances.get(balanceKey);
    const resolvedQuantity = normalizeQuantity(quantity, "field_material_reservation_quantity_invalid");
    if (!inventoryBalance || inventoryBalance.onHandQuantity - inventoryBalance.reservedQuantity < resolvedQuantity) {
      throw createError(409, "field_material_reservation_insufficient_stock", "Insufficient stock for the requested material reservation.");
    }
    inventoryBalance.reservedQuantity = roundQuantity(inventoryBalance.reservedQuantity + resolvedQuantity);
    inventoryBalance.updatedAt = nowIso(clock);
    inventoryBalance.updatedByActorId = actorId;
    const record = {
      materialReservationId: crypto.randomUUID(),
      operationalCaseId: operationalCase.operationalCaseId,
      workOrderId: operationalCase.workOrderId,
      companyId: operationalCase.companyId,
      projectId: operationalCase.projectId,
      inventoryItemId: inventoryItem.inventoryItemId,
      inventoryLocationId: inventoryLocation.inventoryLocationId,
      quantity: resolvedQuantity,
      remainingQuantity: resolvedQuantity,
      status: "active",
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      releasedAt: null,
      releasedByActorId: null
    };
    state.materialReservations.set(record.materialReservationId, record);
    ensureCollection(state.materialReservationIdsByWorkOrder, operationalCase.operationalCaseId).push(record.materialReservationId);
    touchWorkOrder(clock, operationalCase);
    pushAudit(state, clock, {
      companyId: operationalCase.companyId,
      actorId,
      correlationId,
      action: "field.material_reservation.created",
      entityType: "field_material_reservation",
      entityId: record.materialReservationId,
      projectId: operationalCase.projectId,
      explanation: `Reserved material for operational case ${operationalCase.operationalCaseNo}.`
    });
    return copy(record);
  }

  function listMaterialWithdrawals({ companyId, workOrderId } = {}) {
    const workOrder = requireWorkOrder(state, companyId, workOrderId);
    return (state.materialWithdrawalIdsByWorkOrder.get(workOrder.workOrderId) || [])
      .map((materialWithdrawalId) => state.materialWithdrawals.get(materialWithdrawalId))
      .filter(Boolean)
      .map(copy);
  }

  function listMaterialUsages({ companyId, operationalCaseId } = {}) {
    return listMaterialWithdrawals({ companyId, workOrderId: operationalCaseId }).map((record) => ({
      ...copy(record),
      materialUsageId: record.materialUsageId || record.materialWithdrawalId
    }));
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
    let reservedToConsume = resolvedQuantity;
    for (const materialReservation of listActiveReservationsForCase(state, workOrder.workOrderId, inventoryItem.inventoryItemId, inventoryLocation.inventoryLocationId)) {
      if (reservedToConsume <= 0) {
        break;
      }
      const consumedQuantity = Math.min(materialReservation.remainingQuantity, reservedToConsume);
      materialReservation.remainingQuantity = roundQuantity(materialReservation.remainingQuantity - consumedQuantity);
      if (materialReservation.remainingQuantity === 0) {
        materialReservation.status = "fulfilled";
      }
      inventoryBalance.reservedQuantity = roundQuantity(Math.max(0, inventoryBalance.reservedQuantity - consumedQuantity));
      reservedToConsume = roundQuantity(reservedToConsume - consumedQuantity);
    }
    const record = {
      materialWithdrawalId: crypto.randomUUID(),
      materialUsageId: null,
      companyId: workOrder.companyId,
      workOrderId: workOrder.workOrderId,
      operationalCaseId: workOrder.operationalCaseId || workOrder.workOrderId,
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
    record.materialUsageId = record.materialWithdrawalId;
    state.materialWithdrawals.set(record.materialWithdrawalId, record);
    ensureCollection(state.materialWithdrawalIdsByWorkOrder, workOrder.workOrderId).push(record.materialWithdrawalId);
    inventoryBalance.onHandQuantity = roundQuantity(inventoryBalance.onHandQuantity - resolvedQuantity);
    inventoryBalance.updatedAt = nowIso(clock);
    inventoryBalance.updatedByActorId = actorId;
    touchWorkOrder(clock, workOrder);
    const evidence = recordFieldEvidence(state, clock, {
      companyId: workOrder.companyId,
      operationalCaseId: workOrder.operationalCaseId || workOrder.workOrderId,
      projectId: workOrder.projectId,
      evidenceTypeCode: "material_usage",
      linkedObjectType: "field_material_usage",
      linkedObjectId: record.materialUsageId,
      actorId
    });
    record.fieldEvidenceId = evidence.fieldEvidenceId;
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

  function createMaterialUsage({ companyId, operationalCaseId, inventoryItemId, inventoryLocationId, quantity, sourceChannel = "api", actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    return createMaterialWithdrawal({
      companyId,
      workOrderId: operationalCaseId,
      inventoryItemId,
      inventoryLocationId,
      quantity,
      sourceChannel,
      actorId,
      correlationId
    });
  }

  function listCustomerSignatures({ companyId, workOrderId } = {}) {
    const workOrder = requireWorkOrder(state, companyId, workOrderId);
    return (state.signatureIdsByWorkOrder.get(workOrder.workOrderId) || [])
      .map((fieldCustomerSignatureId) => state.customerSignatures.get(fieldCustomerSignatureId))
      .filter(Boolean)
      .map(copy);
  }

  function listSignatureRecords({ companyId, operationalCaseId } = {}) {
    return listCustomerSignatures({ companyId, workOrderId: operationalCaseId }).map((record) => ({
      ...copy(record),
      signatureRecordId: record.signatureRecordId || record.fieldCustomerSignatureId
    }));
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
      signatureRecordId: null,
      companyId: workOrder.companyId,
      workOrderId: workOrder.workOrderId,
      operationalCaseId: workOrder.operationalCaseId || workOrder.workOrderId,
      signerName: requireText(signerName, "field_signature_signer_required"),
      signedAt: requireText(normalizeOptionalDateTime(signedAt) || nowIso(clock), "field_signature_date_required"),
      signatureText: requireText(signatureText, "field_signature_text_required"),
      signatureHash: hashObject({ workOrderId, signerName, signedAt, signatureText }),
      status: "captured",
      capturedByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    record.signatureRecordId = record.fieldCustomerSignatureId;
    state.customerSignatures.set(record.fieldCustomerSignatureId, record);
    ensureCollection(state.signatureIdsByWorkOrder, workOrder.workOrderId).push(record.fieldCustomerSignatureId);
    workOrder.signatureStatus = "captured";
    touchWorkOrder(clock, workOrder);
    const evidence = recordFieldEvidence(state, clock, {
      companyId: workOrder.companyId,
      operationalCaseId: workOrder.operationalCaseId || workOrder.workOrderId,
      projectId: workOrder.projectId,
      evidenceTypeCode: "signature_capture",
      linkedObjectType: "field_signature_record",
      linkedObjectId: record.signatureRecordId,
      actorId
    });
    record.fieldEvidenceId = evidence.fieldEvidenceId;
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
    if (workOrder.invoicingPolicyCode !== "manual_review" && workOrder.invoicingPolicyCode !== "explicit_rule") {
      throw createError(409, "field_operational_case_invoicing_policy_invalid", "Operational case is missing invoicing policy.");
    }
    if (listOpenConflictRecordsForCase(state, workOrder.workOrderId).length > 0) {
      throw createError(409, "field_operational_case_open_conflicts", "Operational case has open conflicts that block invoice readiness.");
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
      conflictRecordId: null,
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
    if (record.syncStatus === "conflicted" || record.syncStatus === "failed_terminal") {
      const conflictRecord = createConflictRecord(state, clock, {
        companyId: record.companyId,
        operationalCaseId: targetWorkOrder?.operationalCaseId || targetWorkOrder?.workOrderId || null,
        projectId: targetWorkOrder?.projectId || null,
        syncEnvelopeId: record.fieldSyncEnvelopeId,
        conflictTypeCode: record.syncStatus === "conflicted" ? "version_conflict" : "apply_failure",
        objectType: record.objectType,
        mutationType: record.mutationType,
        lastErrorCode: record.lastErrorCode,
        actorId
      });
      record.conflictRecordId = conflictRecord.conflictRecordId;
      record.fieldEvidenceId = recordFieldEvidence(state, clock, {
        companyId: record.companyId,
        operationalCaseId: targetWorkOrder?.operationalCaseId || targetWorkOrder?.workOrderId || null,
        projectId: targetWorkOrder?.projectId || null,
        evidenceTypeCode: "sync_conflict",
        linkedObjectType: "field_conflict_record",
        linkedObjectId: conflictRecord.conflictRecordId,
        actorId
      }).fieldEvidenceId;
    } else {
      record.fieldEvidenceId = recordFieldEvidence(state, clock, {
        companyId: record.companyId,
        operationalCaseId: targetWorkOrder?.operationalCaseId || targetWorkOrder?.workOrderId || null,
        projectId: targetWorkOrder?.projectId || null,
        evidenceTypeCode: "sync_receipt",
        linkedObjectType: "field_sync_envelope",
        linkedObjectId: record.fieldSyncEnvelopeId,
        actorId
      }).fieldEvidenceId;
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

  function listFieldEvidence({ companyId, operationalCaseId } = {}) {
    const operationalCase = requireOperationalCase(state, companyId, operationalCaseId);
    return (state.fieldEvidenceIdsByWorkOrder.get(operationalCase.operationalCaseId) || [])
      .map((fieldEvidenceId) => state.fieldEvidence.get(fieldEvidenceId))
      .filter(Boolean)
      .map(copy);
  }

  function listConflictRecords({ companyId, operationalCaseId = null, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedOperationalCaseId = normalizeOptionalText(operationalCaseId);
    const resolvedStatus = normalizeOptionalText(status);
    const sourceIds = resolvedOperationalCaseId
      ? state.conflictRecordIdsByWorkOrder.get(requireOperationalCase(state, resolvedCompanyId, resolvedOperationalCaseId).operationalCaseId) || []
      : state.conflictRecordIdsByCompany.get(resolvedCompanyId) || [];
    return sourceIds
      .map((conflictRecordId) => state.conflictRecords.get(conflictRecordId))
      .filter(Boolean)
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .map(copy);
  }

  function resolveConflictRecord({
    companyId,
    operationalCaseId,
    conflictRecordId,
    resolutionCode = "manual_review_completed",
    notes = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const operationalCase = requireOperationalCase(state, companyId, operationalCaseId);
    const conflictRecord = requireConflictRecord(state, operationalCase.companyId, operationalCase.operationalCaseId, conflictRecordId);
    if (conflictRecord.status !== "open") {
      throw createError(409, "field_conflict_record_not_open", "Conflict record is not open.");
    }
    conflictRecord.status = "resolved";
    conflictRecord.resolutionCode = requireText(resolutionCode, "field_conflict_resolution_code_required");
    conflictRecord.resolutionNotes = normalizeOptionalText(notes);
    conflictRecord.resolvedAt = nowIso(clock);
    conflictRecord.resolvedByActorId = requireText(actorId, "actor_id_required");
    touchWorkOrder(clock, operationalCase);
    pushAudit(state, clock, {
      companyId: operationalCase.companyId,
      actorId,
      correlationId,
      action: "field.conflict.resolved",
      entityType: "field_conflict_record",
      entityId: conflictRecord.conflictRecordId,
      projectId: operationalCase.projectId,
      explanation: `Resolved conflict record ${conflictRecord.conflictRecordId}.`
    });
    return copy(conflictRecord);
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

  const engine = {
    fieldWorkOrderStatuses: FIELD_WORK_ORDER_STATUSES,
    fieldDispatchStatuses: FIELD_DISPATCH_STATUSES,
    fieldInventoryLocationTypes: FIELD_INVENTORY_LOCATION_TYPES,
    fieldSignatureStatuses: FIELD_SIGNATURE_STATUSES,
    fieldSyncEnvelopeStatuses: FIELD_SYNC_ENVELOPE_STATUSES,
    fieldMaterialReservationStatuses: FIELD_MATERIAL_RESERVATION_STATUSES,
    fieldConflictRecordStatuses: FIELD_CONFLICT_RECORD_STATUSES,
    listOfflinePolicies: () => FIELD_OFFLINE_POLICIES.map(copy),
    listInventoryLocations,
    createInventoryLocation,
    listInventoryItems,
    createInventoryItem,
    listInventoryBalances,
    createOrReplaceInventoryBalance,
    listOperationalCases,
    getOperationalCase,
    createOperationalCase,
    listWorkOrders,
    getProjectFieldSummary,
    getWorkOrder,
    createWorkOrder,
    listDispatchAssignments,
    createDispatchAssignment,
    markDispatchEnRoute,
    markDispatchOnSite,
    listMaterialReservations,
    createMaterialReservation,
    listMaterialUsages,
    createMaterialUsage,
    listMaterialWithdrawals,
    createMaterialWithdrawal,
    listSignatureRecords,
    listCustomerSignatures,
    captureCustomerSignature,
    completeWorkOrder,
    createWorkOrderInvoice,
    listMobileToday,
    syncOfflineEnvelope,
    listSyncEnvelopes,
    listFieldEvidence,
    listConflictRecords,
    resolveConflictRecord,
    listFieldAuditEvents
  };

  Object.defineProperty(engine, "__durableState", {
    value: state,
    enumerable: false
  });

  return engine;
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

function enrichOperationalCase(state, record) {
  const operationalCaseId = record.operationalCaseId || record.workOrderId;
  const dispatchAssignments = (state.dispatchIdsByWorkOrder.get(record.workOrderId) || [])
    .map((dispatchAssignmentId) => state.dispatchAssignments.get(dispatchAssignmentId))
    .filter(Boolean)
    .map(copy);
  const materialReservations = (state.materialReservationIdsByWorkOrder.get(operationalCaseId) || [])
    .map((materialReservationId) => state.materialReservations.get(materialReservationId))
    .filter(Boolean)
    .map(copy);
  const materialWithdrawals = (state.materialWithdrawalIdsByWorkOrder.get(record.workOrderId) || [])
    .map((materialWithdrawalId) => state.materialWithdrawals.get(materialWithdrawalId))
    .filter(Boolean)
    .map(copy);
  const customerSignatures = (state.signatureIdsByWorkOrder.get(record.workOrderId) || [])
    .map((fieldCustomerSignatureId) => state.customerSignatures.get(fieldCustomerSignatureId))
    .filter(Boolean)
    .map(copy);
  const fieldEvidence = (state.fieldEvidenceIdsByWorkOrder.get(operationalCaseId) || [])
    .map((fieldEvidenceId) => state.fieldEvidence.get(fieldEvidenceId))
    .filter(Boolean)
    .map(copy);
  const conflictRecords = (state.conflictRecordIdsByWorkOrder.get(operationalCaseId) || [])
    .map((conflictRecordId) => state.conflictRecords.get(conflictRecordId))
    .filter(Boolean)
    .map(copy);
  return {
    ...record,
    operationalCaseId,
    operationalCaseNo: record.operationalCaseNo || record.workOrderNo,
    packCodes: normalizePackCodes(record.packCodes),
    dispatchAssignments,
    materialReservations,
    materialUsages: materialWithdrawals.map((usage) => ({ ...usage, materialUsageId: usage.materialUsageId || usage.materialWithdrawalId })),
    materialWithdrawals,
    signatureRecords: customerSignatures.map((signature) => ({ ...signature, signatureRecordId: signature.signatureRecordId || signature.fieldCustomerSignatureId })),
    customerSignatures,
    fieldEvidence,
    conflictRecords,
    openConflictCount: conflictRecords.filter((conflictRecord) => conflictRecord.status === "open").length,
    invoiceReadyBlocked: conflictRecords.some((conflictRecord) => conflictRecord.status === "open")
  };
}

function enrichWorkOrder(state, record) {
  return enrichOperationalCase(state, record);
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

function requireOperationalCase(state, companyId, operationalCaseId) {
  const record = state.workOrders.get(requireText(operationalCaseId, "field_operational_case_id_required"));
  if (!record || record.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "field_operational_case_not_found", "Operational case was not found.");
  }
  return record;
}

function requireWorkOrder(state, companyId, workOrderId) {
  const record = requireOperationalCase(state, companyId, workOrderId);
  if (!normalizePackCodes(record.packCodes).includes("work_order")) {
    throw createError(404, "field_work_order_not_found", "Work order was not found.");
  }
  return record;
}

function requireConflictRecord(state, companyId, operationalCaseId, conflictRecordId) {
  const record = state.conflictRecords.get(requireText(conflictRecordId, "field_conflict_record_id_required"));
  if (
    !record ||
    record.companyId !== requireText(companyId, "company_id_required") ||
    record.operationalCaseId !== requireText(operationalCaseId, "field_operational_case_id_required")
  ) {
    throw createError(404, "field_conflict_record_not_found", "Conflict record was not found.");
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

function generateOperationalCaseNo(state, companyId, prefix = "OC") {
  const nextIndex = (state.workOrderIdsByCompany.get(companyId) || []).length + 1;
  return `${prefix}-2026-${String(nextIndex).padStart(4, "0")}`;
}

function generateWorkOrderNo(state, companyId) {
  return generateOperationalCaseNo(state, companyId, "WO");
}

function normalizePackCodes(packCodes) {
  const resolvedPackCodes = Array.isArray(packCodes)
    ? packCodes.map((packCode) => normalizeOptionalText(packCode)).filter(Boolean)
    : [];
  return Array.from(new Set(resolvedPackCodes));
}

function listActiveReservationsForCase(state, operationalCaseId, inventoryItemId, inventoryLocationId) {
  return (state.materialReservationIdsByWorkOrder.get(operationalCaseId) || [])
    .map((materialReservationId) => state.materialReservations.get(materialReservationId))
    .filter(Boolean)
    .filter((record) => record.status === "active")
    .filter((record) => record.inventoryItemId === inventoryItemId && record.inventoryLocationId === inventoryLocationId);
}

function createConflictRecord(state, clock, {
  companyId,
  operationalCaseId = null,
  projectId = null,
  syncEnvelopeId = null,
  conflictTypeCode,
  objectType,
  mutationType,
  lastErrorCode = null,
  actorId = "system"
} = {}) {
  const record = {
    conflictRecordId: crypto.randomUUID(),
    companyId: requireText(companyId, "company_id_required"),
    operationalCaseId: normalizeOptionalText(operationalCaseId),
    projectId: normalizeOptionalText(projectId),
    syncEnvelopeId: normalizeOptionalText(syncEnvelopeId),
    conflictTypeCode: requireText(conflictTypeCode, "field_conflict_type_required"),
    objectType: requireText(objectType, "field_conflict_object_type_required"),
    mutationType: requireText(mutationType, "field_conflict_mutation_type_required"),
    lastErrorCode: normalizeOptionalText(lastErrorCode),
    status: "open",
    createdAt: nowIso(clock),
    createdByActorId: requireText(actorId, "actor_id_required"),
    resolvedAt: null,
    resolvedByActorId: null,
    resolutionCode: null,
    resolutionNotes: null
  };
  state.conflictRecords.set(record.conflictRecordId, record);
  ensureCollection(state.conflictRecordIdsByCompany, record.companyId).push(record.conflictRecordId);
  if (record.operationalCaseId) {
    ensureCollection(state.conflictRecordIdsByWorkOrder, record.operationalCaseId).push(record.conflictRecordId);
  }
  return record;
}

function listOpenConflictRecordsForCase(state, operationalCaseId) {
  return (state.conflictRecordIdsByWorkOrder.get(operationalCaseId) || [])
    .map((conflictRecordId) => state.conflictRecords.get(conflictRecordId))
    .filter(Boolean)
    .filter((record) => record.status === "open");
}

function recordFieldEvidence(state, clock, {
  companyId,
  operationalCaseId = null,
  projectId = null,
  evidenceTypeCode,
  linkedObjectType,
  linkedObjectId,
  actorId = "system"
} = {}) {
  const record = {
    fieldEvidenceId: crypto.randomUUID(),
    companyId: requireText(companyId, "company_id_required"),
    operationalCaseId: normalizeOptionalText(operationalCaseId),
    projectId: normalizeOptionalText(projectId),
    evidenceTypeCode: requireText(evidenceTypeCode, "field_evidence_type_required"),
    linkedObjectType: requireText(linkedObjectType, "field_evidence_object_type_required"),
    linkedObjectId: requireText(linkedObjectId, "field_evidence_object_id_required"),
    createdAt: nowIso(clock),
    createdByActorId: requireText(actorId, "actor_id_required")
  };
  state.fieldEvidence.set(record.fieldEvidenceId, record);
  if (record.operationalCaseId) {
    ensureCollection(state.fieldEvidenceIdsByWorkOrder, record.operationalCaseId).push(record.fieldEvidenceId);
  }
  return record;
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
    operationalCaseId: "00000000-0000-4000-8000-000000010331",
    companyId: DEMO_COMPANY_ID,
    operationalCaseNo: "WO-2026-0001",
    workOrderNo: "WO-2026-0001",
    projectId: "00000000-0000-4000-8000-000000010101",
    customerId: "00000000-0000-4000-8000-000000005101",
    displayName: "Install site equipment",
    description: "Field demo work order",
    caseTypeCode: "work_order",
    packCodes: ["work_order"],
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
    invoicingPolicyCode: "manual_review",
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
