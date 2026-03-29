import crypto from "node:crypto";
import {
  BALANCE_ACCOUNT_STATUSES,
  BALANCE_CARRY_FORWARD_MODE_CODES,
  BALANCE_EXPIRY_MODE_CODES,
  BALANCE_OWNER_TYPE_CODES,
  BALANCE_TRANSACTION_TYPE_CODES,
  BALANCE_UNIT_CODES
} from "./constants.mjs";
import {
  addDays,
  appendToIndex,
  assertAllowed,
  buildAccountKey,
  compareDates,
  copy,
  createError,
  createRunKey,
  currentDate,
  freezeRecord,
  getIndexValue,
  normalizeCode,
  normalizeOptionalText,
  normalizeQuantity,
  normalizeRequiredDate,
  nowIso,
  pushAudit,
  requireText,
  resolveBalanceTypeCode,
  roundQuantity,
  setIndexValue
} from "./helpers.mjs";

export function createBalancesPlatform(options = {}) {
  return createBalancesEngine(options);
}

export function createBalancesEngine({
  clock = () => new Date(),
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null,
  hrPlatform = null
} = {}) {
  const state = {
    balanceTypes: new Map(),
    balanceTypeIdsByCompany: new Map(),
    balanceTypeIdByCode: new Map(),
    balanceAccounts: new Map(),
    balanceAccountIdsByCompany: new Map(),
    balanceAccountIdByKey: new Map(),
    balanceTransactions: new Map(),
    balanceTransactionIdsByAccount: new Map(),
    balanceTransactionIdByIdempotencyKey: new Map(),
    carryForwardRuns: new Map(),
    carryForwardRunIdsByCompany: new Map(),
    carryForwardRunIdByKey: new Map(),
    expiryRuns: new Map(),
    expiryRunIdsByCompany: new Map(),
    expiryRunIdByKey: new Map(),
    auditEvents: []
  };

  if (seedDemo) {
    seedDemoState(state, clock);
  }

  const engine = {
    balanceUnitCodes: BALANCE_UNIT_CODES,
    balanceOwnerTypeCodes: BALANCE_OWNER_TYPE_CODES,
    balanceAccountStatuses: BALANCE_ACCOUNT_STATUSES,
    balanceTransactionTypeCodes: BALANCE_TRANSACTION_TYPE_CODES,
    balanceCarryForwardModeCodes: BALANCE_CARRY_FORWARD_MODE_CODES,
    balanceExpiryModeCodes: BALANCE_EXPIRY_MODE_CODES,
    createBalanceType,
    listBalanceTypes,
    getBalanceType,
    openBalanceAccount,
    listBalanceAccounts,
    getBalanceAccount,
    recordBalanceTransaction,
    listBalanceTransactions,
    getBalanceSnapshot,
    runBalanceCarryForward,
    listBalanceCarryForwardRuns,
    runBalanceExpiry,
    listBalanceExpiryRuns
  };

  Object.defineProperty(engine, "__durableState", {
    value: state,
    enumerable: false
  });

  return engine;

  function createBalanceType({
    companyId,
    balanceTypeCode,
    label,
    unitCode,
    negativeAllowed = false,
    minimumBalance = null,
    maximumBalance = null,
    carryForwardModeCode = "none",
    carryForwardCapQuantity = null,
    expiryModeCode = "none",
    expiryDays = null,
    expiryMonthDay = null,
    expiryYearOffset = 1,
    active = true,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedBalanceTypeCode = resolveBalanceTypeCode(balanceTypeCode);
    if (getIndexValue(state.balanceTypeIdByCode, resolvedCompanyId, resolvedBalanceTypeCode)) {
      throw createError(409, "balance_type_code_exists", "Balance type code already exists.");
    }

    const resolvedUnitCode = assertAllowed(
      normalizeCode(unitCode, "balance_unit_code_required").toLowerCase(),
      BALANCE_UNIT_CODES,
      "balance_unit_code_invalid"
    );
    const resolvedCarryForwardModeCode = assertAllowed(
      normalizeCode(carryForwardModeCode || "none", "carry_forward_mode_code_required").toLowerCase(),
      BALANCE_CARRY_FORWARD_MODE_CODES,
      "carry_forward_mode_code_invalid"
    );
    const resolvedExpiryModeCode = assertAllowed(
      normalizeCode(expiryModeCode || "none", "expiry_mode_code_required").toLowerCase(),
      BALANCE_EXPIRY_MODE_CODES,
      "expiry_mode_code_invalid"
    );
    const resolvedMinimumBalance = minimumBalance === null || minimumBalance === undefined ? null : normalizeQuantity(minimumBalance, "minimum_balance_invalid");
    const resolvedMaximumBalance = maximumBalance === null || maximumBalance === undefined ? null : normalizeQuantity(maximumBalance, "maximum_balance_invalid");
    const resolvedCarryForwardCapQuantity =
      carryForwardCapQuantity === null || carryForwardCapQuantity === undefined
        ? null
        : normalizeQuantity(carryForwardCapQuantity, "carry_forward_cap_quantity_invalid");
    const resolvedExpiryDays =
      expiryDays === null || expiryDays === undefined ? null : Math.trunc(normalizeQuantity(expiryDays, "expiry_days_invalid"));
    const resolvedExpiryMonthDay = normalizeOptionalText(expiryMonthDay);
    const resolvedExpiryYearOffset = Number(expiryYearOffset ?? 1);

    if (resolvedMinimumBalance !== null && resolvedMaximumBalance !== null && resolvedMinimumBalance > resolvedMaximumBalance) {
      throw createError(400, "balance_range_invalid", "Minimum balance cannot exceed maximum balance.");
    }
    if (resolvedCarryForwardModeCode === "cap" && (resolvedCarryForwardCapQuantity === null || resolvedCarryForwardCapQuantity < 0)) {
      throw createError(400, "carry_forward_cap_required", "Carry-forward cap quantity is required for cap mode.");
    }
    if (resolvedExpiryModeCode === "rolling_days" && (!Number.isInteger(resolvedExpiryDays) || resolvedExpiryDays <= 0)) {
      throw createError(400, "expiry_days_required", "Positive expiryDays is required for rolling_days.");
    }
    if (resolvedExpiryModeCode === "fixed_date") {
      if (!resolvedExpiryMonthDay || !/^\d{2}-\d{2}$/.test(resolvedExpiryMonthDay)) {
        throw createError(400, "expiry_month_day_required", "expiryMonthDay must be MM-DD for fixed_date.");
      }
      if (!Number.isInteger(resolvedExpiryYearOffset) || resolvedExpiryYearOffset < 0) {
        throw createError(400, "expiry_year_offset_invalid", "expiryYearOffset must be an integer greater than or equal to zero.");
      }
    }

    const now = nowIso(clock);
    const record = freezeRecord({
      balanceTypeId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      balanceTypeCode: resolvedBalanceTypeCode,
      label: requireText(label, "balance_type_label_required"),
      unitCode: resolvedUnitCode,
      negativeAllowed: negativeAllowed === true,
      minimumBalance: resolvedMinimumBalance,
      maximumBalance: resolvedMaximumBalance,
      carryForwardModeCode: resolvedCarryForwardModeCode,
      carryForwardCapQuantity: resolvedCarryForwardCapQuantity,
      expiryModeCode: resolvedExpiryModeCode,
      expiryDays: resolvedExpiryDays,
      expiryMonthDay: resolvedExpiryMonthDay,
      expiryYearOffset: resolvedExpiryYearOffset,
      active: active !== false,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: now,
      updatedAt: now
    });

    state.balanceTypes.set(record.balanceTypeId, record);
    appendToIndex(state.balanceTypeIdsByCompany, resolvedCompanyId, record.balanceTypeId);
    setIndexValue(state.balanceTypeIdByCode, resolvedCompanyId, resolvedBalanceTypeCode, record.balanceTypeId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: record.createdByActorId,
      action: "balances.balance_type.created",
      entityType: "balance_type",
      entityId: record.balanceTypeId,
      explanation: `Created balance type ${resolvedBalanceTypeCode}.`
    });
    return presentBalanceType(record);
  }

  function listBalanceTypes({ companyId, active = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.balanceTypeIdsByCompany.get(resolvedCompanyId) || [])
      .map((balanceTypeId) => state.balanceTypes.get(balanceTypeId))
      .filter(Boolean)
      .filter((record) => (active === null || active === undefined ? true : record.active === (active === true || active === "true")))
      .sort((left, right) => left.balanceTypeCode.localeCompare(right.balanceTypeCode))
      .map(presentBalanceType);
  }

  function getBalanceType({ companyId, balanceTypeId = null, balanceTypeCode = null } = {}) {
    return presentBalanceType(requireBalanceType(state, companyId, { balanceTypeId, balanceTypeCode }));
  }

  function openBalanceAccount({
    companyId,
    balanceTypeCode,
    ownerTypeCode,
    employeeId = null,
    employmentId = null,
    openedOn = null,
    externalReference = null,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const balanceType = requireBalanceType(state, resolvedCompanyId, { balanceTypeCode });
    const resolvedOwnerTypeCode = assertAllowed(
      normalizeCode(ownerTypeCode, "owner_type_code_required").toLowerCase(),
      BALANCE_OWNER_TYPE_CODES,
      "owner_type_code_invalid"
    );
    const resolvedEmployeeId = normalizeOptionalText(employeeId);
    const resolvedEmploymentId = normalizeOptionalText(employmentId);
    validateOwner({
      companyId: resolvedCompanyId,
      ownerTypeCode: resolvedOwnerTypeCode,
      employeeId: resolvedEmployeeId,
      employmentId: resolvedEmploymentId,
      hrPlatform
    });

    const accountKey = buildAccountKey({
      companyId: resolvedCompanyId,
      balanceTypeCode: balanceType.balanceTypeCode,
      ownerTypeCode: resolvedOwnerTypeCode,
      employeeId: resolvedEmployeeId,
      employmentId: resolvedEmploymentId
    });
    const existingAccountId = state.balanceAccountIdByKey.get(accountKey);
    if (existingAccountId) {
      return presentBalanceAccount(state.balanceAccounts.get(existingAccountId), state);
    }

    const now = nowIso(clock);
    const record = freezeRecord({
      balanceAccountId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      balanceTypeId: balanceType.balanceTypeId,
      balanceTypeCode: balanceType.balanceTypeCode,
      ownerTypeCode: resolvedOwnerTypeCode,
      employeeId: resolvedEmployeeId,
      employmentId: resolvedEmploymentId,
      status: "open",
      openedOn: openedOn ? normalizeRequiredDate(openedOn, "opened_on_invalid") : currentDate(clock),
      closedOn: null,
      externalReference: normalizeOptionalText(externalReference),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: now,
      updatedAt: now
    });

    state.balanceAccounts.set(record.balanceAccountId, record);
    appendToIndex(state.balanceAccountIdsByCompany, resolvedCompanyId, record.balanceAccountId);
    state.balanceAccountIdByKey.set(accountKey, record.balanceAccountId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: record.createdByActorId,
      action: "balances.balance_account.opened",
      entityType: "balance_account",
      entityId: record.balanceAccountId,
      explanation: `Opened ${record.balanceTypeCode} account for ${record.ownerTypeCode}.`
    });
    return presentBalanceAccount(record, state);
  }

  function listBalanceAccounts({ companyId, balanceTypeCode = null, ownerTypeCode = null, employeeId = null, employmentId = null, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedBalanceTypeCode = balanceTypeCode ? resolveBalanceTypeCode(balanceTypeCode) : null;
    const resolvedOwnerTypeCode = ownerTypeCode
      ? assertAllowed(normalizeCode(ownerTypeCode, "owner_type_code_invalid").toLowerCase(), BALANCE_OWNER_TYPE_CODES, "owner_type_code_invalid")
      : null;
    const resolvedStatus = status
      ? assertAllowed(normalizeCode(status, "balance_account_status_invalid").toLowerCase(), BALANCE_ACCOUNT_STATUSES, "balance_account_status_invalid")
      : null;
    const resolvedEmployeeId = normalizeOptionalText(employeeId);
    const resolvedEmploymentId = normalizeOptionalText(employmentId);

    return (state.balanceAccountIdsByCompany.get(resolvedCompanyId) || [])
      .map((balanceAccountId) => state.balanceAccounts.get(balanceAccountId))
      .filter(Boolean)
      .filter((record) => (resolvedBalanceTypeCode ? record.balanceTypeCode === resolvedBalanceTypeCode : true))
      .filter((record) => (resolvedOwnerTypeCode ? record.ownerTypeCode === resolvedOwnerTypeCode : true))
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .filter((record) => (resolvedEmployeeId ? record.employeeId === resolvedEmployeeId : true))
      .filter((record) => (resolvedEmploymentId ? record.employmentId === resolvedEmploymentId : true))
      .sort((left, right) => {
        const balanceTypeCompare = left.balanceTypeCode.localeCompare(right.balanceTypeCode);
        if (balanceTypeCompare !== 0) {
          return balanceTypeCompare;
        }
        return left.balanceAccountId.localeCompare(right.balanceAccountId);
      })
      .map((record) => presentBalanceAccount(record, state));
  }

  function getBalanceAccount({ companyId, balanceAccountId } = {}) {
    return presentBalanceAccount(requireBalanceAccount(state, companyId, balanceAccountId), state);
  }

  function recordBalanceTransaction({
    companyId,
    balanceAccountId,
    effectiveDate,
    transactionTypeCode,
    quantityDelta,
    sourceDomainCode,
    sourceObjectType,
    sourceObjectId,
    sourceReference = null,
    idempotencyKey = null,
    explanation = null,
    actorId = "system"
  } = {}) {
    const account = requireBalanceAccount(state, companyId, balanceAccountId);
    const balanceType = requireBalanceType(state, account.companyId, { balanceTypeId: account.balanceTypeId });
    if (account.status !== "open") {
      throw createError(409, "balance_account_closed", "Balance account is closed.");
    }

    const resolvedTransactionTypeCode = assertAllowed(
      normalizeCode(transactionTypeCode, "transaction_type_code_required").toLowerCase(),
      BALANCE_TRANSACTION_TYPE_CODES,
      "transaction_type_code_invalid"
    );
    const resolvedQuantityDelta = normalizeQuantity(quantityDelta, "quantity_delta_invalid");
    if (resolvedQuantityDelta === 0) {
      throw createError(400, "quantity_delta_zero", "Quantity delta cannot be zero.");
    }

    const resolvedIdempotencyKey = normalizeOptionalText(idempotencyKey);
    if (resolvedIdempotencyKey) {
      const existingTransactionId = state.balanceTransactionIdByIdempotencyKey.get(`${account.companyId}::${resolvedIdempotencyKey}`);
      if (existingTransactionId) {
        return presentBalanceTransaction(state.balanceTransactions.get(existingTransactionId));
      }
    }

    const resolvedEffectiveDate = normalizeRequiredDate(effectiveDate, "effective_date_invalid");
    const snapshotBefore = calculateSnapshotForAccount({
      state,
      balanceAccountId: account.balanceAccountId,
      cutoffDate: resolvedEffectiveDate
    });
    const nextQuantity = roundQuantity(snapshotBefore.currentQuantity + resolvedQuantityDelta);
    enforceBalanceLimits({
      balanceType,
      nextQuantity,
      transactionTypeCode: resolvedTransactionTypeCode
    });

    const now = nowIso(clock);
    const record = freezeRecord({
      balanceTransactionId: crypto.randomUUID(),
      companyId: account.companyId,
      balanceAccountId: account.balanceAccountId,
      balanceTypeId: account.balanceTypeId,
      balanceTypeCode: account.balanceTypeCode,
      ownerTypeCode: account.ownerTypeCode,
      employeeId: account.employeeId,
      employmentId: account.employmentId,
      effectiveDate: resolvedEffectiveDate,
      transactionTypeCode: resolvedTransactionTypeCode,
      quantityDelta: resolvedQuantityDelta,
      quantityAfter: nextQuantity,
      unitCode: balanceType.unitCode,
      sourceDomainCode: normalizeCode(sourceDomainCode || "BALANCES", "source_domain_code_required"),
      sourceObjectType: requireText(sourceObjectType || "balance_transaction", "source_object_type_required"),
      sourceObjectId: requireText(sourceObjectId || crypto.randomUUID(), "source_object_id_required"),
      sourceReference: normalizeOptionalText(sourceReference),
      idempotencyKey: resolvedIdempotencyKey,
      explanation: normalizeOptionalText(explanation),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: now
    });

    state.balanceTransactions.set(record.balanceTransactionId, record);
    appendToIndex(state.balanceTransactionIdsByAccount, account.balanceAccountId, record.balanceTransactionId);
    if (resolvedIdempotencyKey) {
      state.balanceTransactionIdByIdempotencyKey.set(`${account.companyId}::${resolvedIdempotencyKey}`, record.balanceTransactionId);
    }
    pushAudit(state, clock, {
      companyId: account.companyId,
      actorId: record.createdByActorId,
      action: "balances.balance_transaction.recorded",
      entityType: "balance_transaction",
      entityId: record.balanceTransactionId,
      explanation: `Recorded ${resolvedTransactionTypeCode} transaction ${resolvedQuantityDelta} ${balanceType.unitCode}.`
    });
    return presentBalanceTransaction(record);
  }

  function listBalanceTransactions({ companyId, balanceAccountId } = {}) {
    const account = requireBalanceAccount(state, companyId, balanceAccountId);
    return listAccountTransactions(state, account.balanceAccountId).map(presentBalanceTransaction);
  }

  function getBalanceSnapshot({ companyId, balanceAccountId, cutoffDate = null } = {}) {
    const account = requireBalanceAccount(state, companyId, balanceAccountId);
    const balanceType = requireBalanceType(state, companyId, { balanceTypeId: account.balanceTypeId });
    const resolvedCutoffDate = cutoffDate ? normalizeRequiredDate(cutoffDate, "balance_snapshot_cutoff_date_invalid") : "9999-12-31";
    return buildSnapshot({
      state,
      account,
      balanceType,
      cutoffDate: resolvedCutoffDate
    });
  }

  function runBalanceCarryForward({
    companyId,
    sourceDate,
    targetDate,
    balanceTypeCode = null,
    balanceAccountId = null,
    idempotencyKey = null,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedSourceDate = normalizeRequiredDate(sourceDate, "carry_forward_source_date_required");
    const resolvedTargetDate = normalizeRequiredDate(targetDate, "carry_forward_target_date_required");
    if (compareDates(resolvedTargetDate, resolvedSourceDate) <= 0) {
      throw createError(400, "carry_forward_target_date_invalid", "targetDate must be later than sourceDate.");
    }
    const resolvedBalanceTypeCode = balanceTypeCode ? resolveBalanceTypeCode(balanceTypeCode) : null;
    const runKey = createRunKey({
      companyId: resolvedCompanyId,
      actionCode: "carry_forward",
      idempotencyKey,
      sourceDate: resolvedSourceDate,
      targetDate: resolvedTargetDate,
      balanceTypeCode: resolvedBalanceTypeCode
    });
    const existingRunId = state.carryForwardRunIdByKey.get(runKey);
    if (existingRunId) {
      return presentCarryForwardRun(state.carryForwardRuns.get(existingRunId));
    }

    const candidateAccounts = balanceAccountId
      ? [requireBalanceAccount(state, resolvedCompanyId, balanceAccountId)]
      : listBalanceAccounts({
          companyId: resolvedCompanyId,
          balanceTypeCode: resolvedBalanceTypeCode
        }).map((account) => requireBalanceAccount(state, resolvedCompanyId, account.balanceAccountId));

    const runId = crypto.randomUUID();
    const processedItems = [];
    for (const account of candidateAccounts) {
      const balanceType = requireBalanceType(state, resolvedCompanyId, { balanceTypeId: account.balanceTypeId });
      if (balanceType.carryForwardModeCode === "none") {
        continue;
      }
      const snapshot = buildSnapshot({
        state,
        account,
        balanceType,
        cutoffDate: resolvedSourceDate
      });
      if (snapshot.currentQuantity === 0) {
        continue;
      }
      const carriedQuantity = resolveCarriedQuantity(snapshot.currentQuantity, balanceType);
      recordBalanceTransaction({
        companyId: resolvedCompanyId,
        balanceAccountId: account.balanceAccountId,
        effectiveDate: resolvedSourceDate,
        transactionTypeCode: "carry_forward_out",
        quantityDelta: roundQuantity(-snapshot.currentQuantity),
        sourceDomainCode: "BALANCES",
        sourceObjectType: "balance_carry_forward_run",
        sourceObjectId: runId,
        sourceReference: "carry_forward_out",
        idempotencyKey: `${runId}:${account.balanceAccountId}:out`,
        explanation: `Carry-forward out from ${resolvedSourceDate}.`,
        actorId
      });
      if (carriedQuantity !== 0) {
        recordBalanceTransaction({
          companyId: resolvedCompanyId,
          balanceAccountId: account.balanceAccountId,
          effectiveDate: resolvedTargetDate,
          transactionTypeCode: "carry_forward_in",
          quantityDelta: carriedQuantity,
          sourceDomainCode: "BALANCES",
          sourceObjectType: "balance_carry_forward_run",
          sourceObjectId: runId,
          sourceReference: "carry_forward_in",
          idempotencyKey: `${runId}:${account.balanceAccountId}:in`,
          explanation: `Carry-forward in to ${resolvedTargetDate}.`,
          actorId
        });
      }
      processedItems.push({
        balanceAccountId: account.balanceAccountId,
        balanceTypeCode: account.balanceTypeCode,
        ownerTypeCode: account.ownerTypeCode,
        employeeId: account.employeeId,
        employmentId: account.employmentId,
        sourceQuantity: snapshot.currentQuantity,
        carriedQuantity,
        droppedQuantity: roundQuantity(snapshot.currentQuantity - carriedQuantity)
      });
    }

    const run = freezeRecord({
      balanceCarryForwardRunId: runId,
      companyId: resolvedCompanyId,
      sourceDate: resolvedSourceDate,
      targetDate: resolvedTargetDate,
      balanceTypeCode: resolvedBalanceTypeCode,
      processedCount: processedItems.length,
      processedItems,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      idempotencyKey: normalizeOptionalText(idempotencyKey)
    });
    state.carryForwardRuns.set(run.balanceCarryForwardRunId, run);
    appendToIndex(state.carryForwardRunIdsByCompany, resolvedCompanyId, run.balanceCarryForwardRunId);
    state.carryForwardRunIdByKey.set(runKey, run.balanceCarryForwardRunId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: run.createdByActorId,
      action: "balances.carry_forward.executed",
      entityType: "balance_carry_forward_run",
      entityId: run.balanceCarryForwardRunId,
      explanation: `Executed carry-forward for ${processedItems.length} balance account(s).`
    });
    return presentCarryForwardRun(run);
  }

  function listBalanceCarryForwardRuns({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.carryForwardRunIdsByCompany.get(resolvedCompanyId) || [])
      .map((runId) => state.carryForwardRuns.get(runId))
      .filter(Boolean)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(presentCarryForwardRun);
  }

  function runBalanceExpiry({
    companyId,
    runDate,
    balanceTypeCode = null,
    balanceAccountId = null,
    idempotencyKey = null,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedRunDate = normalizeRequiredDate(runDate, "balance_expiry_run_date_required");
    const resolvedBalanceTypeCode = balanceTypeCode ? resolveBalanceTypeCode(balanceTypeCode) : null;
    const runKey = createRunKey({
      companyId: resolvedCompanyId,
      actionCode: "expiry",
      idempotencyKey,
      sourceDate: resolvedRunDate,
      balanceTypeCode: resolvedBalanceTypeCode
    });
    const existingRunId = state.expiryRunIdByKey.get(runKey);
    if (existingRunId) {
      return presentExpiryRun(state.expiryRuns.get(existingRunId));
    }

    const candidateAccounts = balanceAccountId
      ? [requireBalanceAccount(state, resolvedCompanyId, balanceAccountId)]
      : listBalanceAccounts({
          companyId: resolvedCompanyId,
          balanceTypeCode: resolvedBalanceTypeCode
        }).map((account) => requireBalanceAccount(state, resolvedCompanyId, account.balanceAccountId));

    const runId = crypto.randomUUID();
    const processedItems = [];
    for (const account of candidateAccounts) {
      const balanceType = requireBalanceType(state, resolvedCompanyId, { balanceTypeId: account.balanceTypeId });
      if (balanceType.expiryModeCode === "none") {
        continue;
      }
      const lots = buildOpenLots({
        transactions: listAccountTransactions(state, account.balanceAccountId).filter((transaction) => transaction.effectiveDate <= resolvedRunDate),
        balanceType
      });
      const expiringLots = lots.filter((lot) => lot.expiryDate && lot.expiryDate <= resolvedRunDate && lot.remainingQuantity > 0);
      const expiredQuantity = roundQuantity(expiringLots.reduce((sum, lot) => sum + lot.remainingQuantity, 0));
      if (expiredQuantity <= 0) {
        continue;
      }
      recordBalanceTransaction({
        companyId: resolvedCompanyId,
        balanceAccountId: account.balanceAccountId,
        effectiveDate: resolvedRunDate,
        transactionTypeCode: "expire",
        quantityDelta: roundQuantity(-expiredQuantity),
        sourceDomainCode: "BALANCES",
        sourceObjectType: "balance_expiry_run",
        sourceObjectId: runId,
        sourceReference: "expiry",
        idempotencyKey: `${runId}:${account.balanceAccountId}:expire`,
        explanation: `Expired remaining balance quantity on ${resolvedRunDate}.`,
        actorId
      });
      processedItems.push({
        balanceAccountId: account.balanceAccountId,
        balanceTypeCode: account.balanceTypeCode,
        ownerTypeCode: account.ownerTypeCode,
        employeeId: account.employeeId,
        employmentId: account.employmentId,
        expiredQuantity,
        expiringLotCount: expiringLots.length
      });
    }

    const run = freezeRecord({
      balanceExpiryRunId: runId,
      companyId: resolvedCompanyId,
      runDate: resolvedRunDate,
      balanceTypeCode: resolvedBalanceTypeCode,
      processedCount: processedItems.length,
      processedItems,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      idempotencyKey: normalizeOptionalText(idempotencyKey)
    });
    state.expiryRuns.set(run.balanceExpiryRunId, run);
    appendToIndex(state.expiryRunIdsByCompany, resolvedCompanyId, run.balanceExpiryRunId);
    state.expiryRunIdByKey.set(runKey, run.balanceExpiryRunId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: run.createdByActorId,
      action: "balances.expiry.executed",
      entityType: "balance_expiry_run",
      entityId: run.balanceExpiryRunId,
      explanation: `Executed balance expiry for ${processedItems.length} balance account(s).`
    });
    return presentExpiryRun(run);
  }

  function listBalanceExpiryRuns({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.expiryRunIdsByCompany.get(resolvedCompanyId) || [])
      .map((runId) => state.expiryRuns.get(runId))
      .filter(Boolean)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(presentExpiryRun);
  }
}

function presentBalanceType(record) {
  return copy(record);
}

function presentBalanceAccount(record, state) {
  const base = copy(record);
  base.balanceType = presentBalanceType(state.balanceTypes.get(record.balanceTypeId));
  return base;
}

function presentBalanceTransaction(record) {
  return copy(record);
}

function presentCarryForwardRun(record) {
  return copy(record);
}

function presentExpiryRun(record) {
  return copy(record);
}

function requireBalanceType(state, companyId, { balanceTypeId = null, balanceTypeCode = null } = {}) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  let record = null;
  if (balanceTypeId) {
    record = state.balanceTypes.get(requireText(balanceTypeId, "balance_type_id_required")) || null;
  } else if (balanceTypeCode) {
    const recordId = getIndexValue(state.balanceTypeIdByCode, resolvedCompanyId, resolveBalanceTypeCode(balanceTypeCode));
    record = recordId ? state.balanceTypes.get(recordId) : null;
  }
  if (!record || record.companyId !== resolvedCompanyId) {
    throw createError(404, "balance_type_not_found", "Balance type was not found.");
  }
  return record;
}

function requireBalanceAccount(state, companyId, balanceAccountId) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const record = state.balanceAccounts.get(requireText(balanceAccountId, "balance_account_id_required")) || null;
  if (!record || record.companyId !== resolvedCompanyId) {
    throw createError(404, "balance_account_not_found", "Balance account was not found.");
  }
  return record;
}

function compareBalanceTransactions(left, right) {
  return (
    left.effectiveDate.localeCompare(right.effectiveDate) ||
    left.createdAt.localeCompare(right.createdAt) ||
    left.balanceTransactionId.localeCompare(right.balanceTransactionId)
  );
}

function listAccountTransactions(state, balanceAccountId) {
  return (state.balanceTransactionIdsByAccount.get(balanceAccountId) || [])
    .map((balanceTransactionId) => state.balanceTransactions.get(balanceTransactionId))
    .filter(Boolean)
    .sort(compareBalanceTransactions);
}

function calculateSnapshotForAccount({ state, balanceAccountId, cutoffDate }) {
  const resolvedCutoffDate = normalizeRequiredDate(cutoffDate, "balance_snapshot_cutoff_date_invalid");
  const transactions = listAccountTransactions(state, balanceAccountId).filter((transaction) => transaction.effectiveDate <= resolvedCutoffDate);
  return {
    currentQuantity: roundQuantity(transactions.reduce((sum, transaction) => sum + transaction.quantityDelta, 0)),
    transactionCount: transactions.length
  };
}

function buildSnapshot({ state, account, balanceType, cutoffDate }) {
  const summary = calculateSnapshotForAccount({
    state,
    balanceAccountId: account.balanceAccountId,
    cutoffDate
  });
  const lots = buildOpenLots({
    transactions: listAccountTransactions(state, account.balanceAccountId).filter((transaction) => transaction.effectiveDate <= cutoffDate),
    balanceType
  });
  const nextExpiryDate = lots
    .filter((lot) => lot.expiryDate)
    .sort((left, right) => left.expiryDate.localeCompare(right.expiryDate))[0]?.expiryDate || null;
  return {
    balanceAccountId: account.balanceAccountId,
    companyId: account.companyId,
    balanceTypeCode: account.balanceTypeCode,
    unitCode: balanceType.unitCode,
    ownerTypeCode: account.ownerTypeCode,
    employeeId: account.employeeId,
    employmentId: account.employmentId,
    cutoffDate,
    currentQuantity: summary.currentQuantity,
    transactionCount: summary.transactionCount,
    nextExpiryDate
  };
}

function enforceBalanceLimits({ balanceType, nextQuantity, transactionTypeCode }) {
  if (!balanceType.negativeAllowed && nextQuantity < 0) {
    throw createError(409, "negative_balance_forbidden", `Balance type ${balanceType.balanceTypeCode} cannot go negative.`);
  }
  if (balanceType.minimumBalance !== null && nextQuantity < balanceType.minimumBalance) {
    throw createError(409, "balance_minimum_breached", `Balance type ${balanceType.balanceTypeCode} minimum would be breached by ${transactionTypeCode}.`);
  }
  if (balanceType.maximumBalance !== null && nextQuantity > balanceType.maximumBalance) {
    throw createError(409, "balance_maximum_breached", `Balance type ${balanceType.balanceTypeCode} maximum would be exceeded by ${transactionTypeCode}.`);
  }
}

function validateOwner({ companyId, ownerTypeCode, employeeId, employmentId, hrPlatform }) {
  if (ownerTypeCode === "company") {
    return;
  }
  if (ownerTypeCode === "employee") {
    if (!employeeId) {
      throw createError(400, "employee_id_required", "employeeId is required for employee-owned balance accounts.");
    }
    if (hrPlatform) {
      hrPlatform.getEmployee({ companyId, employeeId });
    }
    return;
  }
  if (!employeeId || !employmentId) {
    throw createError(400, "employment_owner_requires_employee_and_employment", "employeeId and employmentId are required for employment-owned balance accounts.");
  }
  if (hrPlatform) {
    hrPlatform.getEmployment({ companyId, employeeId, employmentId });
  }
}

function resolveCarriedQuantity(currentQuantity, balanceType) {
  if (balanceType.carryForwardModeCode === "none") {
    return 0;
  }
  if (balanceType.carryForwardModeCode === "full") {
    return roundQuantity(currentQuantity);
  }
  if (currentQuantity > 0) {
    return roundQuantity(Math.min(currentQuantity, balanceType.carryForwardCapQuantity || 0));
  }
  return roundQuantity(currentQuantity);
}

function buildOpenLots({ transactions, balanceType }) {
  const lots = [];
  for (const transaction of [...transactions].sort(compareBalanceTransactions)) {
    if (transaction.quantityDelta > 0) {
      lots.push({
        transactionId: transaction.balanceTransactionId,
        effectiveDate: transaction.effectiveDate,
        expiryDate: resolveLotExpiryDate(transaction.effectiveDate, balanceType),
        remainingQuantity: roundQuantity(transaction.quantityDelta)
      });
      continue;
    }
    if (transaction.quantityDelta >= 0) {
      continue;
    }
    let remainingToConsume = roundQuantity(-transaction.quantityDelta);
    for (const lot of lots) {
      if (remainingToConsume <= 0) {
        break;
      }
      if (lot.remainingQuantity <= 0) {
        continue;
      }
      const consumed = Math.min(lot.remainingQuantity, remainingToConsume);
      lot.remainingQuantity = roundQuantity(lot.remainingQuantity - consumed);
      remainingToConsume = roundQuantity(remainingToConsume - consumed);
    }
  }
  return lots.filter((lot) => lot.remainingQuantity > 0);
}

function resolveLotExpiryDate(effectiveDate, balanceType) {
  if (balanceType.expiryModeCode === "none") {
    return null;
  }
  if (balanceType.expiryModeCode === "rolling_days") {
    return addDays(effectiveDate, balanceType.expiryDays);
  }
  const monthDay = balanceType.expiryMonthDay;
  if (!monthDay) {
    return null;
  }
  const baseYear = Number(effectiveDate.slice(0, 4)) + Number(balanceType.expiryYearOffset || 0);
  return `${String(baseYear).padStart(4, "0")}-${monthDay}`;
}

function seedDemoState(state, clock) {
  const companyId = "00000000-0000-4000-8000-000000000001";
  const now = nowIso(clock);
  const balanceType = freezeRecord({
    balanceTypeId: "balancetype-demo-vacation",
    companyId,
    balanceTypeCode: "VACATION_DAYS",
    label: "Vacation days",
    unitCode: "days",
    negativeAllowed: false,
    minimumBalance: 0,
    maximumBalance: null,
    carryForwardModeCode: "cap",
    carryForwardCapQuantity: 5,
    expiryModeCode: "fixed_date",
    expiryDays: null,
    expiryMonthDay: "12-31",
    expiryYearOffset: 5,
    active: true,
    createdByActorId: "seed",
    createdAt: now,
    updatedAt: now
  });
  state.balanceTypes.set(balanceType.balanceTypeId, balanceType);
  appendToIndex(state.balanceTypeIdsByCompany, companyId, balanceType.balanceTypeId);
  setIndexValue(state.balanceTypeIdByCode, companyId, balanceType.balanceTypeCode, balanceType.balanceTypeId);
}
