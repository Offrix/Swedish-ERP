import crypto from "node:crypto";
import { createRulePackRegistry } from "../../rule-engine/src/index.mjs";
import {
  DEMO_COMPANY_ID,
  EVENT_TYPE_TO_LIABILITY_TYPE,
  TAX_ACCOUNT_DIFFERENCE_CASE_STATUSES,
  TAX_ACCOUNT_EVENT_EFFECT_DIRECTIONS,
  TAX_ACCOUNT_EVENT_MAPPING_STATUSES,
  TAX_ACCOUNT_EVENT_RECONCILIATION_STATUSES,
  TAX_ACCOUNT_EVENT_TYPES,
  TAX_ACCOUNT_LIABILITY_TYPES,
  TAX_ACCOUNT_OFFSET_RULEPACK_CODE,
  TAX_ACCOUNT_OFFSET_STATUSES,
  TAX_ACCOUNT_RECONCILIATION_ITEM_STATUSES,
  TAX_ACCOUNT_RULEPACK_CODE,
  TAX_ACCOUNT_RULEPACK_VERSION
} from "./constants.mjs";
import {
  appendToIndex,
  appendUniqueToIndex,
  assertAllowed,
  buildHash,
  buildImportIdentity,
  compareReconciliationItems,
  compareTaxAccountEvents,
  copy,
  createError,
  currentDate,
  determineCreditEventReconciliationStatus,
  determineReconciliationItemStatus,
  isAssessmentEvent,
  isCreditEvent,
  normalizeCode,
  normalizeDate,
  normalizeImportedEvent,
  normalizeMoney,
  normalizeOptionalAllowedCode,
  normalizeOptionalDate,
  normalizeOptionalStatus,
  normalizeOptionalText,
  normalizeUpperCode,
  nowIso,
  presentReconciliationItem,
  presentTaxAccountEvent,
  pushAudit,
  remainingCreditAmountForEvent,
  requireText,
  roundMoney
} from "./helpers.mjs";
import {
  applyDurableStateSnapshot,
  serializeDurableState
} from "../../domain-core/src/state-snapshots.mjs";

const TAX_ACCOUNT_RULE_PACKS = Object.freeze([
  Object.freeze({
    rulePackId: "tax-account-mapping-se-2026.1",
    rulePackCode: TAX_ACCOUNT_RULEPACK_CODE,
    domain: "tax_account",
    jurisdiction: "SE",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    version: TAX_ACCOUNT_RULEPACK_VERSION,
    checksum: "tax-account-mapping-se-2026.1",
    sourceSnapshotDate: "2026-03-24",
    semanticChangeSummary: "Swedish tax-account mapping baseline for assessment/liability classification.",
    machineReadableRules: Object.freeze({
      eventTypeToLiabilityType: EVENT_TYPE_TO_LIABILITY_TYPE
    }),
    humanReadableExplanation: Object.freeze([
      "Assessment events must map deterministically to a tax-account liability type and expected reconciliation item."
    ]),
    testVectors: Object.freeze([]),
    migrationNotes: Object.freeze([])
  }),
  Object.freeze({
    rulePackId: "tax-account-offset-se-2026.1",
    rulePackCode: TAX_ACCOUNT_OFFSET_RULEPACK_CODE,
    domain: "tax_account",
    jurisdiction: "SE",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    version: TAX_ACCOUNT_RULEPACK_VERSION,
    checksum: "tax-account-offset-se-2026.1",
    sourceSnapshotDate: "2026-03-24",
    semanticChangeSummary: "Swedish tax-account offset baseline for payment/refund settlement ordering.",
    machineReadableRules: Object.freeze({
      liabilityTypePriority: Object.freeze(EVENT_TYPE_TO_LIABILITY_TYPE)
    }),
    humanReadableExplanation: Object.freeze([
      "Credit events must only settle approved, open liabilities and every suggested offset must pin the offset rulepack."
    ]),
    testVectors: Object.freeze([]),
    migrationNotes: Object.freeze([])
  })
]);

export function createTaxAccountPlatform(options = {}) {
  return createTaxAccountEngine(options);
}

export function createTaxAccountEngine({
  clock = () => new Date(),
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null,
  bankingPlatform = null,
  ruleRegistry = null
} = {}) {
  const rules = ruleRegistry || createRulePackRegistry({
    clock,
    seedRulePacks: TAX_ACCOUNT_RULE_PACKS
  });
  const state = {
    importBatches: new Map(),
    importBatchIdsByCompany: new Map(),
    events: new Map(),
    eventIdsByCompany: new Map(),
    eventIdByImportIdentity: new Map(),
    reconciliationItems: new Map(),
    reconciliationItemIdsByCompany: new Map(),
    reconciliationItemIdByKey: new Map(),
    offsets: new Map(),
    offsetIdsByCompany: new Map(),
    offsetIdByApprovalKey: new Map(),
    reconciliations: new Map(),
    reconciliationIdsByCompany: new Map(),
    discrepancyCases: new Map(),
    discrepancyCaseIdsByCompany: new Map(),
    discrepancyCaseIdByKey: new Map(),
    auditEvents: []
  };

  if (seedDemo) {
    seedDemoState(state, clock);
  }

  const engine = {
    taxAccountEventTypes: TAX_ACCOUNT_EVENT_TYPES,
    taxAccountEventEffectDirections: TAX_ACCOUNT_EVENT_EFFECT_DIRECTIONS,
    taxAccountEventMappingStatuses: TAX_ACCOUNT_EVENT_MAPPING_STATUSES,
    taxAccountEventReconciliationStatuses: TAX_ACCOUNT_EVENT_RECONCILIATION_STATUSES,
    taxAccountDifferenceCaseStatuses: TAX_ACCOUNT_DIFFERENCE_CASE_STATUSES,
    taxAccountReconciliationItemStatuses: TAX_ACCOUNT_RECONCILIATION_ITEM_STATUSES,
    taxAccountOffsetStatuses: TAX_ACCOUNT_OFFSET_STATUSES,
    taxAccountLiabilityTypes: TAX_ACCOUNT_LIABILITY_TYPES,
    registerExpectedTaxLiability,
    listExpectedTaxLiabilities,
    getExpectedTaxLiability,
    importTaxAccountEvents,
    listTaxAccountEvents,
    getTaxAccountEvent,
    createTaxAccountReconciliation,
    listTaxAccountReconciliations,
    getTaxAccountReconciliation,
    approveTaxAccountOffset,
    listTaxAccountOffsets,
    listOpenTaxAccountDifferenceCases,
    resolveTaxAccountDifferenceCase,
    getTaxAccountBalance,
    snapshotTaxAccount,
    exportDurableState,
    importDurableState
  };

  Object.defineProperty(engine, "rulePackGovernance", {
    value: Object.freeze({
      listRulePacks: (filters = {}) => rules.listRulePacks({ domain: "tax_account", jurisdiction: "SE", ...filters }),
      getRulePack: (filters) => rules.getRulePack(filters),
      createDraftRulePackVersion: (input) => rules.createDraftRulePackVersion(input),
      validateRulePackVersion: (input) => rules.validateRulePackVersion(input),
      approveRulePackVersion: (input) => rules.approveRulePackVersion(input),
      publishRulePackVersion: (input) => rules.publishRulePackVersion(input),
      rollbackRulePackVersion: (input) => rules.rollbackRulePackVersion(input),
      listRulePackRollbacks: (filters = {}) => rules.listRulePackRollbacks({ domain: "tax_account", jurisdiction: "SE", ...filters })
    }),
    enumerable: false
  });

  return engine;

  function registerExpectedTaxLiability({
    companyId,
    liabilityTypeCode,
    sourceDomainCode,
    sourceObjectType,
    sourceObjectId,
    sourceReference = null,
    periodKey = null,
    dueDate,
    amount,
    currencyCode = "SEK",
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedLiabilityTypeCode = assertAllowed(
      normalizeCode(liabilityTypeCode, "liability_type_code_required"),
      TAX_ACCOUNT_LIABILITY_TYPES,
      "liability_type_code_invalid"
    );
    const resolvedSourceDomainCode = normalizeCode(sourceDomainCode || sourceObjectType, "source_domain_code_required");
    const resolvedSourceObjectType = requireText(sourceObjectType, "source_object_type_required");
    const resolvedSourceObjectId = requireText(sourceObjectId, "source_object_id_required");
    const resolvedDueDate = normalizeDate(dueDate, "due_date_invalid");
    const resolvedAmount = normalizeMoney(amount, "expected_amount_invalid");
    const resolvedCurrencyCode = normalizeUpperCode(currencyCode, "currency_code_required", 3);
    const resolvedPeriodKey = normalizeOptionalText(periodKey);
    const rulePack = resolveTaxAccountMappingRulePack(resolvedDueDate);
    const itemKey = buildHash({
      companyId: resolvedCompanyId,
      liabilityTypeCode: resolvedLiabilityTypeCode,
      sourceObjectType: resolvedSourceObjectType,
      sourceObjectId: resolvedSourceObjectId,
      periodKey: resolvedPeriodKey,
      dueDate: resolvedDueDate
    });
    if (state.reconciliationItemIdByKey.has(itemKey)) {
      return presentReconciliationItem(state.reconciliationItems.get(state.reconciliationItemIdByKey.get(itemKey)));
    }

    const now = nowIso(clock);
    const item = Object.freeze({
      reconciliationItemId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      liabilityTypeCode: resolvedLiabilityTypeCode,
      sourceDomainCode: resolvedSourceDomainCode,
      sourceObjectType: resolvedSourceObjectType,
      sourceObjectId: resolvedSourceObjectId,
      sourceReference: normalizeOptionalText(sourceReference),
      periodKey: resolvedPeriodKey,
      dueDate: resolvedDueDate,
      rulepackId: rulePack.rulePackId,
      rulepackCode: rulePack.rulePackCode,
      rulepackVersion: rulePack.version,
      rulepackChecksum: rulePack.checksum,
      currencyCode: resolvedCurrencyCode,
      expectedAmount: resolvedAmount,
      assessedAmount: 0,
      settledAmount: 0,
      status: "open",
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: now,
      updatedAt: now
    });

    state.reconciliationItems.set(item.reconciliationItemId, item);
    appendToIndex(state.reconciliationItemIdsByCompany, resolvedCompanyId, item.reconciliationItemId);
    state.reconciliationItemIdByKey.set(itemKey, item.reconciliationItemId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: item.createdByActorId,
      action: "tax_account.expected_liability_registered",
      entityType: "tax_account_reconciliation_item",
      entityId: item.reconciliationItemId,
      explanation: `Registered expected ${resolvedLiabilityTypeCode} liability ${resolvedAmount} ${resolvedCurrencyCode}.`
    });
    return presentReconciliationItem(item);
  }

  function listExpectedTaxLiabilities({ companyId, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = normalizeOptionalStatus(
      status,
      TAX_ACCOUNT_RECONCILIATION_ITEM_STATUSES,
      "tax_account_reconciliation_item_status_invalid"
    );
    return (state.reconciliationItemIdsByCompany.get(resolvedCompanyId) || [])
      .map((itemId) => state.reconciliationItems.get(itemId))
      .filter(Boolean)
      .map(presentReconciliationItem)
      .filter((item) => (resolvedStatus ? item.status === resolvedStatus : true))
      .sort(compareReconciliationItems);
  }

  function getExpectedTaxLiability({ companyId, reconciliationItemId } = {}) {
    const item = requireReconciliationItem(state, companyId, reconciliationItemId);
    return presentReconciliationItem(item);
  }

  function importTaxAccountEvents({
    companyId,
    importSource,
    statementDate = null,
    importBatchId = null,
    events,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedImportSource = normalizeCode(importSource, "import_source_required");
    const resolvedStatementDate = normalizeOptionalDate(statementDate, "statement_date_invalid");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    if (!Array.isArray(events) || events.length === 0) {
      throw createError(400, "tax_account_events_required", "events must contain at least one imported tax-account event.");
    }

    const resolvedImportBatchId = normalizeOptionalText(importBatchId) || crypto.randomUUID();
    const existingBatch = state.importBatches.get(resolvedImportBatchId);
    if (existingBatch && existingBatch.companyId !== resolvedCompanyId) {
      throw createError(409, "tax_account_import_batch_company_mismatch", "Import batch id already belongs to another company.");
    }

    const workingBatch = existingBatch
      ? { ...copy(existingBatch), updatedAt: nowIso(clock) }
      : {
          importBatchId: resolvedImportBatchId,
          companyId: resolvedCompanyId,
          importSource: resolvedImportSource,
          statementDate: resolvedStatementDate,
          importedCount: 0,
          duplicateCount: 0,
          eventIds: [],
          importedByActorId: resolvedActorId,
          importedAt: nowIso(clock),
          updatedAt: nowIso(clock)
        };

    const importedItems = [];
    for (const rawEvent of events) {
      const normalized = normalizeImportedEvent(rawEvent, {
        companyId: resolvedCompanyId,
        importBatchId: resolvedImportBatchId,
        importSource: resolvedImportSource,
        actorId: resolvedActorId,
        clock,
        allowedEventTypes: TAX_ACCOUNT_EVENT_TYPES,
        allowedDirections: TAX_ACCOUNT_EVENT_EFFECT_DIRECTIONS,
        allowedLiabilityTypes: TAX_ACCOUNT_LIABILITY_TYPES
      });
      const importIdentity = buildImportIdentity(normalized);
      const existingEventId = state.eventIdByImportIdentity.get(importIdentity);
      if (existingEventId) {
        workingBatch.duplicateCount += 1;
        importedItems.push(presentTaxAccountEvent(state, state.events.get(existingEventId)));
        continue;
      }

      const frozen = Object.freeze(normalized);
      state.events.set(frozen.taxAccountEventId, frozen);
      appendToIndex(state.eventIdsByCompany, resolvedCompanyId, frozen.taxAccountEventId);
      state.eventIdByImportIdentity.set(importIdentity, frozen.taxAccountEventId);
      workingBatch.eventIds.push(frozen.taxAccountEventId);
      workingBatch.importedCount += 1;
      importedItems.push(presentTaxAccountEvent(state, frozen));
    }

    const batchRecord = Object.freeze({
      ...workingBatch,
      eventIds: Object.freeze([...workingBatch.eventIds])
    });
    state.importBatches.set(batchRecord.importBatchId, batchRecord);
    appendUniqueToIndex(state.importBatchIdsByCompany, resolvedCompanyId, batchRecord.importBatchId);

    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      action: "tax_account.events_imported",
      entityType: "tax_account_import_batch",
      entityId: batchRecord.importBatchId,
      explanation: `Imported ${batchRecord.importedCount} tax-account events from ${resolvedImportSource} with ${batchRecord.duplicateCount} duplicates ignored.`
    });

    return copy({
      importBatch: batchRecord,
      items: importedItems
    });
  }

  function listTaxAccountEvents({ companyId, eventTypeCode = null, mappingStatus = null, reconciliationStatus = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedEventTypeCode = normalizeOptionalAllowedCode(eventTypeCode, TAX_ACCOUNT_EVENT_TYPES, "tax_account_event_type_invalid");
    const resolvedMappingStatus = normalizeOptionalStatus(mappingStatus, TAX_ACCOUNT_EVENT_MAPPING_STATUSES, "tax_account_mapping_status_invalid");
    const resolvedReconciliationStatus = normalizeOptionalStatus(
      reconciliationStatus,
      TAX_ACCOUNT_EVENT_RECONCILIATION_STATUSES,
      "tax_account_reconciliation_status_invalid"
    );
    return (state.eventIdsByCompany.get(resolvedCompanyId) || [])
      .map((eventId) => state.events.get(eventId))
      .filter(Boolean)
      .filter((event) => (resolvedEventTypeCode ? event.eventTypeCode === resolvedEventTypeCode : true))
      .filter((event) => (resolvedMappingStatus ? event.mappingStatus === resolvedMappingStatus : true))
      .filter((event) => (resolvedReconciliationStatus ? event.reconciliationStatus === resolvedReconciliationStatus : true))
      .sort(compareTaxAccountEvents)
      .map((event) => presentTaxAccountEvent(state, event));
  }

  function getTaxAccountEvent({ companyId, taxAccountEventId } = {}) {
    return presentTaxAccountEvent(state, requireTaxAccountEvent(state, companyId, taxAccountEventId));
  }

  function createTaxAccountReconciliation({ companyId, actorId = "system" } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const events = listMutableEventsForCompany(state, resolvedCompanyId);
    const reviewedEventIds = [];
    const discrepancyCaseIds = [];
    const suggestedOffsets = [];

    for (const event of events.filter((candidate) => isAssessmentEvent(candidate))) {
      reviewedEventIds.push(event.taxAccountEventId);
      const assessmentResult = reconcileAssessmentEvent({
        state,
        event,
        clock,
        actorId: resolvedActorId,
        rulePack: resolveTaxAccountMappingRulePack(event.eventDate)
      });
      if (assessmentResult.discrepancyCaseId) {
        discrepancyCaseIds.push(assessmentResult.discrepancyCaseId);
      }
    }

    for (const event of events.filter((candidate) => isCreditEvent(candidate))) {
      reviewedEventIds.push(event.taxAccountEventId);
      const rulePack = resolveTaxAccountOffsetRulePack(event.eventDate);
      const creditSuggestions = buildSuggestedOffsetsForEvent(state, event, rulePack);
      if (creditSuggestions.length === 0) {
        const discrepancy = openDifferenceCase(state, clock, {
          companyId: resolvedCompanyId,
          differenceTypeCode: "unmatched_credit_event",
          taxAccountEventId: event.taxAccountEventId,
          reconciliationItemId: null,
          grossDifferenceAmount: remainingCreditAmountForEvent(state, event.taxAccountEventId),
          explanation: `Credit event ${event.externalReference} has no eligible settlement target.`,
          actorId: resolvedActorId
        });
        discrepancyCaseIds.push(discrepancy.discrepancyCaseId);
        updateTaxAccountEvent(state, event.taxAccountEventId, {
          mappingStatus: "mapped",
          reconciliationStatus: "unmatched",
          mappedByRuleCode: rulePack.rulePackCode,
          mappedByRulepackId: rulePack.rulePackId,
          mappedByRulepackVersion: rulePack.version,
          mappedByRulepackChecksum: rulePack.checksum,
          updatedAt: nowIso(clock)
        });
      } else {
        suggestedOffsets.push(...creditSuggestions);
        updateTaxAccountEvent(state, event.taxAccountEventId, {
          mappingStatus: "mapped",
          reconciliationStatus: determineCreditEventReconciliationStatus(state, event.taxAccountEventId),
          mappedByRuleCode: rulePack.rulePackCode,
          mappedByRulepackId: rulePack.rulePackId,
          mappedByRulepackVersion: rulePack.version,
          mappedByRulepackChecksum: rulePack.checksum,
          updatedAt: nowIso(clock)
        });
      }
    }

    for (const event of events.filter((candidate) => !isAssessmentEvent(candidate) && !isCreditEvent(candidate))) {
      reviewedEventIds.push(event.taxAccountEventId);
      const rulePack = resolveTaxAccountMappingRulePack(event.eventDate);
      updateTaxAccountEvent(state, event.taxAccountEventId, {
        mappingStatus: "mapped",
        reconciliationStatus: "closed",
        mappedByRuleCode: rulePack.rulePackCode,
        mappedByRulepackId: rulePack.rulePackId,
        mappedByRulepackVersion: rulePack.version,
        mappedByRulepackChecksum: rulePack.checksum,
        updatedAt: nowIso(clock)
      });
    }

    const run = Object.freeze({
      reconciliationRunId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      summary: getTaxAccountBalance({ companyId: resolvedCompanyId }),
      eventIdsReviewed: Object.freeze([...reviewedEventIds]),
      suggestedOffsets: Object.freeze(suggestedOffsets.map(copy)),
      discrepancyCaseIds: Object.freeze([...new Set(discrepancyCaseIds)]),
      createdByActorId: resolvedActorId,
      createdAt: nowIso(clock)
    });
    state.reconciliations.set(run.reconciliationRunId, run);
    appendToIndex(state.reconciliationIdsByCompany, resolvedCompanyId, run.reconciliationRunId);

    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      action: "tax_account.reconciliation_created",
      entityType: "tax_account_reconciliation_run",
      entityId: run.reconciliationRunId,
      explanation: `Created tax-account reconciliation with ${run.suggestedOffsets.length} suggested offsets and ${run.discrepancyCaseIds.length} discrepancy cases.`
    });
    return copy(run);
  }

  function listTaxAccountReconciliations({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.reconciliationIdsByCompany.get(resolvedCompanyId) || [])
      .map((runId) => state.reconciliations.get(runId))
      .filter(Boolean)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function getTaxAccountReconciliation({ companyId, reconciliationRunId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const run = state.reconciliations.get(requireText(reconciliationRunId, "tax_account_reconciliation_run_id_required"));
    if (!run || run.companyId !== resolvedCompanyId) {
      throw createError(404, "tax_account_reconciliation_not_found", "Tax-account reconciliation run was not found.");
    }
    return copy(run);
  }

  function approveTaxAccountOffset({
    companyId,
    taxAccountEventId,
    reconciliationItemId,
    offsetAmount,
    offsetReasonCode,
    reconciliationRunId = null,
    approvalNote = null,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const event = requireTaxAccountEvent(state, resolvedCompanyId, taxAccountEventId);
    const item = requireReconciliationItem(state, resolvedCompanyId, reconciliationItemId);
    const resolvedOffsetAmount = normalizeMoney(offsetAmount, "tax_account_offset_amount_invalid");
    const resolvedOffsetReasonCode = normalizeCode(offsetReasonCode || "AGGREGATED_TAX_ACCOUNT_SETTLEMENT", "tax_account_offset_reason_code_required");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const approvalKey = buildHash({
      companyId: resolvedCompanyId,
      taxAccountEventId: event.taxAccountEventId,
      reconciliationItemId: item.reconciliationItemId,
      offsetAmount: resolvedOffsetAmount,
      offsetReasonCode: resolvedOffsetReasonCode
    });
    if (state.offsetIdByApprovalKey.has(approvalKey)) {
      return copy(state.offsets.get(state.offsetIdByApprovalKey.get(approvalKey)));
    }

    if (!isCreditEvent(event)) {
      throw createError(409, "tax_account_offset_requires_credit_event", "Only credit tax-account events may be approved as settlement offsets.");
    }

    const availableEventAmount = remainingCreditAmountForEvent(state, event.taxAccountEventId);
    const remainingSettlementAmount = presentReconciliationItem(item).remainingSettlementAmount;
    if (resolvedOffsetAmount > availableEventAmount) {
      throw createError(409, "tax_account_offset_exceeds_available_event_amount", "Offset exceeds the remaining amount on the tax-account event.");
    }
    if (resolvedOffsetAmount > remainingSettlementAmount) {
      throw createError(409, "tax_account_offset_exceeds_open_liability", "Offset exceeds the remaining open amount on the liability.");
    }

    const rulePack = resolveTaxAccountOffsetRulePack(event.eventDate);
    const offset = Object.freeze({
      taxAccountOffsetId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      taxAccountEventId: event.taxAccountEventId,
      reconciliationItemId: item.reconciliationItemId,
      reconciliationRunId: normalizeOptionalText(reconciliationRunId),
      offsetAmount: resolvedOffsetAmount,
      offsetDate: currentDate(clock),
      offsetReasonCode: resolvedOffsetReasonCode,
      status: "approved",
      approvalNote: normalizeOptionalText(approvalNote),
      rulepackId: rulePack.rulePackId,
      rulepackCode: rulePack.rulePackCode,
      rulepackVersion: rulePack.version,
      rulepackChecksum: rulePack.checksum,
      createdByActorId: resolvedActorId,
      createdAt: nowIso(clock)
    });
    state.offsets.set(offset.taxAccountOffsetId, offset);
    appendToIndex(state.offsetIdsByCompany, resolvedCompanyId, offset.taxAccountOffsetId);
    state.offsetIdByApprovalKey.set(approvalKey, offset.taxAccountOffsetId);

    const nextSettledAmount = roundMoney(item.settledAmount + resolvedOffsetAmount);
    updateReconciliationItem(state, item.reconciliationItemId, {
      settledAmount: nextSettledAmount,
      status: determineReconciliationItemStatus({
        expectedAmount: item.expectedAmount,
        assessedAmount: item.assessedAmount,
        settledAmount: nextSettledAmount
      }),
      updatedAt: nowIso(clock)
    });

    const nextEventRemaining = roundMoney(availableEventAmount - resolvedOffsetAmount);
    updateTaxAccountEvent(state, event.taxAccountEventId, {
      mappingStatus: nextEventRemaining === 0 ? "reconciled" : "mapped",
      reconciliationStatus: nextEventRemaining === 0 ? "closed" : "partially_matched",
      mappedByRuleCode: offset.rulepackCode,
      mappedByRulepackId: offset.rulepackId,
      mappedByRulepackVersion: offset.rulepackVersion,
      mappedByRulepackChecksum: offset.rulepackChecksum,
      updatedAt: nowIso(clock)
    });

    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      action: "tax_account.offset_approved",
      entityType: "tax_account_offset",
      entityId: offset.taxAccountOffsetId,
      explanation: `Approved tax-account offset ${resolvedOffsetAmount} from event ${event.taxAccountEventId} to liability ${item.reconciliationItemId}.`
    });
    return copy(offset);
  }

  function listTaxAccountOffsets({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.offsetIdsByCompany.get(resolvedCompanyId) || [])
      .map((offsetId) => state.offsets.get(offsetId))
      .filter(Boolean)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function listOpenTaxAccountDifferenceCases({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.discrepancyCaseIdsByCompany.get(resolvedCompanyId) || [])
      .map((caseId) => state.discrepancyCases.get(caseId))
      .filter(Boolean)
      .filter((differenceCase) => !["resolved", "closed"].includes(differenceCase.status))
      .sort((left, right) => left.detectedAt.localeCompare(right.detectedAt))
      .map(copy);
  }

  function resolveTaxAccountDifferenceCase({ companyId, discrepancyCaseId, resolutionNote, actorId = "system" } = {}) {
    const differenceCase = requireDifferenceCase(state, companyId, discrepancyCaseId);
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedResolutionNote = requireText(resolutionNote, "tax_account_difference_resolution_note_required");
    const resolvedCase = updateDifferenceCase(state, discrepancyCaseId, {
      status: "resolved",
      updatedAt: nowIso(clock),
      resolvedAt: nowIso(clock),
      resolvedByActorId: resolvedActorId,
      resolutionNote: resolvedResolutionNote
    });
    pushAudit(state, clock, {
      companyId: resolvedCase.companyId,
      actorId: resolvedActorId,
      action: "tax_account.difference_case_resolved",
      entityType: "tax_account_difference_case",
      entityId: resolvedCase.discrepancyCaseId,
      explanation: `Resolved tax-account discrepancy case ${resolvedCase.discrepancyCaseId}.`
    });
    return copy(resolvedCase);
  }

  function getTaxAccountBalance({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const events = (state.eventIdsByCompany.get(resolvedCompanyId) || []).map((eventId) => state.events.get(eventId)).filter(Boolean);
    const items = (state.reconciliationItemIdsByCompany.get(resolvedCompanyId) || [])
      .map((itemId) => state.reconciliationItems.get(itemId))
      .filter(Boolean)
      .map(presentReconciliationItem);
    const creditBalance = roundMoney(
      events.filter((event) => event.effectDirection === "credit").reduce((sum, event) => sum + event.amount, 0)
    );
    const debitBalance = roundMoney(
      events.filter((event) => event.effectDirection === "debit").reduce((sum, event) => sum + event.amount, 0)
    );
    return copy({
      creditBalance,
      debitBalance,
      netBalance: roundMoney(creditBalance - debitBalance),
      openCreditAmount: roundMoney(
        events
          .filter((event) => event.effectDirection === "credit")
          .reduce((sum, event) => sum + remainingCreditAmountForEvent(state, event.taxAccountEventId), 0)
      ),
      openSettlementAmount: roundMoney(items.reduce((sum, item) => sum + item.remainingSettlementAmount, 0)),
      openDifferenceCaseCount: listOpenTaxAccountDifferenceCases({ companyId: resolvedCompanyId }).length
    });
  }

  function snapshotTaxAccount({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return copy({
      importBatches: (state.importBatchIdsByCompany.get(resolvedCompanyId) || [])
        .map((batchId) => state.importBatches.get(batchId))
        .filter(Boolean),
      events: listTaxAccountEvents({ companyId: resolvedCompanyId }),
      reconciliationItems: listExpectedTaxLiabilities({ companyId: resolvedCompanyId }),
      offsets: listTaxAccountOffsets({ companyId: resolvedCompanyId }),
      discrepancies: listOpenTaxAccountDifferenceCases({ companyId: resolvedCompanyId }),
      reconciliations: listTaxAccountReconciliations({ companyId: resolvedCompanyId }),
      balance: getTaxAccountBalance({ companyId: resolvedCompanyId }),
      auditEvents: state.auditEvents.filter((event) => event.companyId === resolvedCompanyId).map(copy),
      bankingBridgeReady: bankingPlatform != null
    });
  }

  function exportDurableState() {
    return serializeDurableState(state);
  }

  function importDurableState(snapshot) {
    applyDurableStateSnapshot(state, snapshot);
  }

  function resolveTaxAccountMappingRulePack(effectiveDate) {
    return rules.resolveRulePack({
      rulePackCode: TAX_ACCOUNT_RULEPACK_CODE,
      domain: "tax_account",
      jurisdiction: "SE",
      effectiveDate
    });
  }

  function resolveTaxAccountOffsetRulePack(effectiveDate) {
    return rules.resolveRulePack({
      rulePackCode: TAX_ACCOUNT_OFFSET_RULEPACK_CODE,
      domain: "tax_account",
      jurisdiction: "SE",
      effectiveDate
    });
  }
}

function reconcileAssessmentEvent({ state, event, clock, actorId, rulePack }) {
  const liabilityTypeCode = event.liabilityTypeCode || EVENT_TYPE_TO_LIABILITY_TYPE[event.eventTypeCode] || null;
  if (!liabilityTypeCode) {
    const discrepancy = openDifferenceCase(state, clock, {
      companyId: event.companyId,
      differenceTypeCode: "assessment_liability_type_missing",
      taxAccountEventId: event.taxAccountEventId,
      reconciliationItemId: null,
      grossDifferenceAmount: event.amount,
      explanation: `Assessment event ${event.externalReference} lacks a deterministic liability type.`,
      actorId
    });
    updateTaxAccountEvent(state, event.taxAccountEventId, {
      mappingStatus: "imported",
      reconciliationStatus: "unmatched",
      updatedAt: nowIso(clock)
    });
    return { discrepancyCaseId: discrepancy.discrepancyCaseId };
  }

  const candidate = findMatchingReconciliationItem(state, event, liabilityTypeCode);
  if (!candidate) {
    const discrepancy = openDifferenceCase(state, clock, {
      companyId: event.companyId,
      differenceTypeCode: "assessment_target_missing",
      taxAccountEventId: event.taxAccountEventId,
      reconciliationItemId: null,
      grossDifferenceAmount: event.amount,
      explanation: `Assessment event ${event.externalReference} could not be mapped to an expected liability.`,
      actorId
    });
    updateTaxAccountEvent(state, event.taxAccountEventId, {
      mappingStatus: "imported",
      reconciliationStatus: "unmatched",
      updatedAt: nowIso(clock)
    });
    return { discrepancyCaseId: discrepancy.discrepancyCaseId };
  }

  const nextAssessedAmount = roundMoney(candidate.assessedAmount + event.amount);
  updateReconciliationItem(state, candidate.reconciliationItemId, {
    assessedAmount: nextAssessedAmount,
    status: determineReconciliationItemStatus({
      expectedAmount: candidate.expectedAmount,
      assessedAmount: nextAssessedAmount,
      settledAmount: candidate.settledAmount
    }),
    updatedAt: nowIso(clock)
  });
    updateTaxAccountEvent(state, event.taxAccountEventId, {
      mappingStatus: "mapped",
      reconciliationStatus: nextAssessedAmount === candidate.expectedAmount ? "closed" : "partially_matched",
      mappedTargetObjectType: "tax_account_reconciliation_item",
      mappedTargetObjectId: candidate.reconciliationItemId,
      mappedLiabilityTypeCode: liabilityTypeCode,
      mappedByRuleCode: rulePack.rulePackCode,
      mappedByRulepackId: rulePack.rulePackId,
      mappedByRulepackVersion: rulePack.version,
      mappedByRulepackChecksum: rulePack.checksum,
      updatedAt: nowIso(clock)
    });

  const differenceAmount = roundMoney(candidate.expectedAmount - nextAssessedAmount);
  if (differenceAmount !== 0) {
    const discrepancy = openDifferenceCase(state, clock, {
      companyId: event.companyId,
      differenceTypeCode: "assessment_amount_mismatch",
      taxAccountEventId: event.taxAccountEventId,
      reconciliationItemId: candidate.reconciliationItemId,
      grossDifferenceAmount: Math.abs(differenceAmount),
      explanation: `Assessment event ${event.externalReference} differs from expected liability ${candidate.reconciliationItemId}.`,
      actorId
    });
    return { discrepancyCaseId: discrepancy.discrepancyCaseId };
  }

  return { discrepancyCaseId: null };
}

function buildSuggestedOffsetsForEvent(state, event, rulePack) {
  const availableAmount = remainingCreditAmountForEvent(state, event.taxAccountEventId);
  if (availableAmount <= 0) {
    return [];
  }
  let remainingAmount = availableAmount;
  let priority = 1;
  const suggestions = [];
  for (const item of listOffsetEligibleItems(state, event.companyId)) {
    const presentItem = presentReconciliationItem(item);
    if (presentItem.remainingSettlementAmount <= 0) {
      continue;
    }
    const suggestionAmount = Math.min(remainingAmount, presentItem.remainingSettlementAmount);
    if (suggestionAmount <= 0) {
      continue;
    }
    suggestions.push(
      Object.freeze({
        taxAccountEventId: event.taxAccountEventId,
        reconciliationItemId: item.reconciliationItemId,
        offsetAmount: suggestionAmount,
        offsetReasonCode: "AGGREGATED_TAX_ACCOUNT_SETTLEMENT",
        rulepackId: rulePack.rulePackId,
        rulepackCode: rulePack.rulePackCode,
        rulepackVersion: rulePack.version,
        rulepackChecksum: rulePack.checksum,
        priority
      })
    );
    remainingAmount = roundMoney(remainingAmount - suggestionAmount);
    priority += 1;
    if (remainingAmount === 0) {
      break;
    }
  }
  return suggestions;
}

function listOffsetEligibleItems(state, companyId) {
  return (state.reconciliationItemIdsByCompany.get(companyId) || [])
    .map((itemId) => state.reconciliationItems.get(itemId))
    .filter(Boolean)
    .filter((item) => presentReconciliationItem(item).remainingSettlementAmount > 0)
    .sort(compareReconciliationItems);
}

function findMatchingReconciliationItem(state, event, liabilityTypeCode) {
  const candidates = (state.reconciliationItemIdsByCompany.get(event.companyId) || [])
    .map((itemId) => state.reconciliationItems.get(itemId))
    .filter(Boolean)
    .filter((item) => item.liabilityTypeCode === liabilityTypeCode)
    .sort(compareReconciliationItems);

  return (
    candidates.find(
      (item) =>
        event.sourceObjectType &&
        event.sourceObjectId &&
        item.sourceObjectType === event.sourceObjectType &&
        item.sourceObjectId === event.sourceObjectId
    ) ||
    candidates.find((item) => event.periodKey && item.periodKey && item.periodKey === event.periodKey) ||
    candidates.find((item) => roundMoney(item.expectedAmount) === roundMoney(event.amount)) ||
    null
  );
}

function openDifferenceCase(
  state,
  clock,
  { companyId, differenceTypeCode, taxAccountEventId, reconciliationItemId, grossDifferenceAmount, explanation, actorId }
) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const resolvedDifferenceTypeCode = normalizeCode(differenceTypeCode, "tax_account_difference_type_code_required");
  const caseKey = buildHash({
    companyId: resolvedCompanyId,
    differenceTypeCode: resolvedDifferenceTypeCode,
    taxAccountEventId: normalizeOptionalText(taxAccountEventId),
    reconciliationItemId: normalizeOptionalText(reconciliationItemId),
    grossDifferenceAmount: roundMoney(grossDifferenceAmount)
  });
  const existingId = state.discrepancyCaseIdByKey.get(caseKey);
  if (existingId) {
    return state.discrepancyCases.get(existingId);
  }

  const now = nowIso(clock);
  const differenceCase = Object.freeze({
    discrepancyCaseId: crypto.randomUUID(),
    companyId: resolvedCompanyId,
    status: "open",
    differenceTypeCode: resolvedDifferenceTypeCode,
    grossDifferenceAmount: normalizeMoney(grossDifferenceAmount, "tax_account_difference_amount_invalid"),
    reviewRequired: true,
    taxAccountEventId: normalizeOptionalText(taxAccountEventId),
    reconciliationItemId: normalizeOptionalText(reconciliationItemId),
    explanation: requireText(explanation, "tax_account_difference_explanation_required"),
    detectedAt: now,
    updatedAt: now,
    resolvedAt: null,
    resolvedByActorId: null,
    resolutionNote: null
  });
  state.discrepancyCases.set(differenceCase.discrepancyCaseId, differenceCase);
  appendToIndex(state.discrepancyCaseIdsByCompany, resolvedCompanyId, differenceCase.discrepancyCaseId);
  state.discrepancyCaseIdByKey.set(caseKey, differenceCase.discrepancyCaseId);
  pushAudit(state, clock, {
    companyId: resolvedCompanyId,
    actorId: requireText(actorId, "actor_id_required"),
    action: "tax_account.difference_case_opened",
    entityType: "tax_account_difference_case",
    entityId: differenceCase.discrepancyCaseId,
    explanation: differenceCase.explanation
  });
  return differenceCase;
}

function updateTaxAccountEvent(state, taxAccountEventId, updates) {
  const existing = state.events.get(taxAccountEventId);
  const next = Object.freeze({
    ...existing,
    ...copy(updates)
  });
  state.events.set(taxAccountEventId, next);
  return next;
}

function updateReconciliationItem(state, reconciliationItemId, updates) {
  const existing = state.reconciliationItems.get(reconciliationItemId);
  const next = Object.freeze({
    ...existing,
    ...copy(updates)
  });
  state.reconciliationItems.set(reconciliationItemId, next);
  return next;
}

function updateDifferenceCase(state, discrepancyCaseId, updates) {
  const existing = state.discrepancyCases.get(discrepancyCaseId);
  const next = Object.freeze({
    ...existing,
    ...copy(updates)
  });
  state.discrepancyCases.set(discrepancyCaseId, next);
  return next;
}

function requireTaxAccountEvent(state, companyId, taxAccountEventId) {
  const event = state.events.get(requireText(taxAccountEventId, "tax_account_event_id_required"));
  if (!event || event.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "tax_account_event_not_found", "Tax-account event was not found.");
  }
  return event;
}

function requireReconciliationItem(state, companyId, reconciliationItemId) {
  const item = state.reconciliationItems.get(requireText(reconciliationItemId, "tax_account_reconciliation_item_id_required"));
  if (!item || item.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "tax_account_reconciliation_item_not_found", "Tax-account reconciliation item was not found.");
  }
  return item;
}

function requireDifferenceCase(state, companyId, discrepancyCaseId) {
  const differenceCase = state.discrepancyCases.get(requireText(discrepancyCaseId, "tax_account_difference_case_id_required"));
  if (!differenceCase || differenceCase.companyId !== requireText(companyId, "company_id_required")) {
    throw createError(404, "tax_account_difference_case_not_found", "Tax-account discrepancy case was not found.");
  }
  return differenceCase;
}

function listMutableEventsForCompany(state, companyId) {
  return (state.eventIdsByCompany.get(companyId) || [])
    .map((eventId) => state.events.get(eventId))
    .filter(Boolean)
    .filter((event) => event.mappingStatus !== "corrected" && event.reconciliationStatus !== "closed")
    .sort(compareTaxAccountEvents);
}

function seedDemoState(state, clock) {
  const item = Object.freeze({
    reconciliationItemId: crypto.randomUUID(),
    companyId: DEMO_COMPANY_ID,
    liabilityTypeCode: "VAT",
    sourceDomainCode: "VAT",
    sourceObjectType: "vat_declaration_run",
    sourceObjectId: "vat_demo_2026_01",
    sourceReference: "VAT-2026-01",
    periodKey: "2026-01",
    dueDate: "2026-02-12",
    currencyCode: "SEK",
    expectedAmount: 15000,
    assessedAmount: 15000,
    settledAmount: 10000,
    status: "partially_offset",
    createdByActorId: "seed",
    createdAt: nowIso(clock),
    updatedAt: nowIso(clock)
  });
  state.reconciliationItems.set(item.reconciliationItemId, item);
  appendToIndex(state.reconciliationItemIdsByCompany, DEMO_COMPANY_ID, item.reconciliationItemId);
  state.reconciliationItemIdByKey.set(
    buildHash({
      companyId: DEMO_COMPANY_ID,
      liabilityTypeCode: item.liabilityTypeCode,
      sourceObjectType: item.sourceObjectType,
      sourceObjectId: item.sourceObjectId,
      periodKey: item.periodKey,
      dueDate: item.dueDate
    }),
    item.reconciliationItemId
  );
}
