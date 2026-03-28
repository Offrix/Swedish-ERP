import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";
import {
  DEMO_COMPANY_ID,
  IMPORT_CASE_APPLICATION_STATUSES,
  IMPORT_CASE_BLOCKING_REASON_CODES,
  EU_COUNTRY_CODES,
  IMPORT_CASE_COMPLETENESS_STATUSES,
  IMPORT_CASE_COMPONENT_TYPES,
  IMPORT_CASE_CORRECTION_REQUEST_REASON_CODES,
  IMPORT_CASE_CORRECTION_REQUEST_STATUSES,
  IMPORT_CASE_DOCUMENT_ROLE_CODES,
  IMPORT_CASE_REVIEW_DECISION_TYPE,
  IMPORT_CASE_REVIEW_QUEUE_CODE,
  IMPORT_CASE_RULEPACK_CODE,
  IMPORT_CASE_RULEPACK_VERSION,
  IMPORT_CASE_STATUSES,
  IMPORT_CASE_VAT_RELEVANCE_CODES
} from "./constants.mjs";
import {
  appendToIndex,
  buildHash,
  copy,
  createError,
  normalizeCode,
  normalizeMoney,
  normalizeOptionalText,
  nowIso,
  requireText,
  roundMoney
} from "./helpers.mjs";

const ACTIVE_CASE_STATUSES = new Set(["opened", "collecting_documents", "ready_for_review", "approved", "applied", "posted"]);
const MUTABLE_CASE_STATUSES = new Set(["opened", "collecting_documents", "ready_for_review"]);
const COMPONENTS_IN_IMPORT_VAT_BASE = new Set([
  "GOODS",
  "CUSTOMS_DUTY",
  "FREIGHT",
  "INSURANCE",
  "SPEDITION",
  "OTHER_STATE_FEE"
]);

export function createImportCasesPlatform(options = {}) {
  return createImportCasesEngine(options);
}

export function createImportCasesEngine({
  clock = () => new Date(),
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null,
  documentPlatform = null,
  reviewCenterPlatform = null,
  documentClassificationPlatform = null
} = {}) {
  const state = {
    cases: new Map(),
    caseIdsByCompany: new Map(),
    caseIdByReference: new Map(),
    documentLinks: new Map(),
    documentLinkIdsByCase: new Map(),
    activeCaseIdByDocument: new Map(),
    components: new Map(),
    componentIdsByCase: new Map(),
    componentIdByDedupeKey: new Map(),
    correctionRequests: new Map(),
    correctionRequestIdsByCase: new Map(),
    corrections: new Map(),
    correctionIdsByCase: new Map(),
    auditEvents: []
  };

  if (seedDemo) {
    seedDemoState();
  }

  return {
    importCaseStatuses: IMPORT_CASE_STATUSES,
    importCaseCompletenessStatuses: IMPORT_CASE_COMPLETENESS_STATUSES,
    importCaseDocumentRoleCodes: IMPORT_CASE_DOCUMENT_ROLE_CODES,
    importCaseComponentTypes: IMPORT_CASE_COMPONENT_TYPES,
    importCaseVatRelevanceCodes: IMPORT_CASE_VAT_RELEVANCE_CODES,
    openImportCase: createImportCase,
    createImportCase,
    listImportCases,
    getImportCase,
    attachDocumentToImportCase,
    addImportCaseComponent,
    recalculateImportCase,
    approveImportCase,
    requestImportCaseCorrection,
    decideImportCaseCorrectionRequest,
    applyImportCase,
    correctImportCase,
    snapshotImportCases
  };

  function createImportCase({
    companyId,
    caseReference,
    goodsOriginCountry = null,
    customsReference = null,
    currencyCode = "SEK",
    requiresCustomsEvidence = null,
    sourceClassificationCaseId = null,
    parentImportCaseId = null,
    initialDocuments = [],
    initialComponents = [],
    metadataJson = {},
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedCaseReference = requireText(caseReference, "import_case_reference_required");
    const referenceKey = buildReferenceKey(resolvedCompanyId, resolvedCaseReference);
    if (state.caseIdByReference.has(referenceKey)) {
      throw createError(409, "import_case_reference_exists", "Import case reference already exists for the company.");
    }

    const classificationCase = resolveSourceClassificationCase({
      documentClassificationPlatform,
      companyId: resolvedCompanyId,
      sourceClassificationCaseId
    });
    const normalizedInitialDocuments = normalizeInitialDocuments({
      initialDocuments,
      classificationCase
    });
    const normalizedInitialComponents = Array.isArray(initialComponents) ? initialComponents : [];
    const now = nowIso(clock);
    const importCase = {
      importCaseId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      parentImportCaseId: normalizeOptionalText(parentImportCaseId),
      sourceClassificationCaseId: classificationCase?.classificationCaseId || normalizeOptionalText(sourceClassificationCaseId),
      caseReference: resolvedCaseReference,
      status: "opened",
      goodsOriginCountry: normalizeOptionalCountryCode(goodsOriginCountry),
      customsReference: normalizeOptionalText(customsReference),
      currencyCode: normalizeCurrencyCode(currencyCode),
      requiresCustomsEvidence: requiresCustomsEvidence == null ? null : Boolean(requiresCustomsEvidence),
      completenessStatus: "collecting",
      blockingReasonCodes: [],
      reviewRequired: false,
      reviewRiskClass: "medium",
      reviewItemId: null,
      reviewQueueCode: IMPORT_CASE_REVIEW_QUEUE_CODE,
      approvalNote: null,
      approvedAt: null,
      approvedByActorId: null,
      importVatBaseAmount: 0,
      importVatAmount: 0,
      componentTotalsJson: {},
      applicationStatus: IMPORT_CASE_APPLICATION_STATUSES[0],
      appliedTargetDomainCode: null,
      appliedTargetObjectType: null,
      appliedTargetObjectId: null,
      appliedCommandKey: null,
      appliedPayloadHash: null,
      appliedAt: null,
      appliedByActorId: null,
      correctedAt: null,
      correctedByActorId: null,
      correctedToImportCaseId: null,
      createdByActorId: resolvedActorId,
      createdAt: now,
      updatedAt: now,
      metadataJson: {
        ...copy(metadataJson || {}),
        rulepackCode: IMPORT_CASE_RULEPACK_CODE,
        rulepackVersion: IMPORT_CASE_RULEPACK_VERSION
      }
    };

    state.cases.set(importCase.importCaseId, importCase);
    appendToIndex(state.caseIdsByCompany, resolvedCompanyId, importCase.importCaseId);
    state.caseIdByReference.set(referenceKey, importCase.importCaseId);

    for (const linkInput of normalizedInitialDocuments) {
      attachDocumentInternal({
        importCase,
        documentId: linkInput.documentId,
        roleCode: linkInput.roleCode,
        metadataJson: linkInput.metadataJson || {},
        actorId: resolvedActorId
      });
    }

    for (const componentInput of normalizedInitialComponents) {
      addComponentInternal({
        importCase,
        componentType: componentInput.componentType,
        amount: componentInput.amount,
        currencyCode: componentInput.currencyCode || importCase.currencyCode,
        vatRelevanceCode: componentInput.vatRelevanceCode || null,
        sourceDocumentId: componentInput.sourceDocumentId || null,
        ledgerTreatmentCode: componentInput.ledgerTreatmentCode || null,
        metadataJson: componentInput.metadataJson || {},
        actorId: resolvedActorId
      });
    }

    pushAudit(state, {
      companyId: importCase.companyId,
      actorId: resolvedActorId,
      action: "import_case.created",
      entityType: "import_case",
      entityId: importCase.importCaseId,
      explanation: `Opened import case ${importCase.caseReference}.`,
      recordedAt: now
    });

    return recalculateImportCase({
      companyId: importCase.companyId,
      importCaseId: importCase.importCaseId,
      actorId: resolvedActorId
    });
  }

  function listImportCases({ companyId, status = null, completenessStatus = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = status == null ? null : requireAllowedStatus(status, IMPORT_CASE_STATUSES, "import_case_status_invalid");
    const resolvedCompletenessStatus =
      completenessStatus == null
        ? null
        : requireAllowedStatus(
            completenessStatus,
            IMPORT_CASE_COMPLETENESS_STATUSES,
            "import_case_completeness_status_invalid"
          );

    return (state.caseIdsByCompany.get(resolvedCompanyId) || [])
      .map((importCaseId) => state.cases.get(importCaseId))
      .filter(Boolean)
      .filter((importCase) => (resolvedStatus ? importCase.status === resolvedStatus : true))
      .filter((importCase) =>
        resolvedCompletenessStatus ? importCase.completenessStatus === resolvedCompletenessStatus : true
      )
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((importCase) => presentCase(state, importCase));
  }

  function getImportCase({ companyId, importCaseId } = {}) {
    return presentCase(state, requireCase(state, companyId, importCaseId));
  }

  function attachDocumentToImportCase({
    companyId,
    importCaseId,
    documentId,
    roleCode,
    metadataJson = {},
    actorId = "system"
  } = {}) {
    const importCase = requireMutableCase(state, companyId, importCaseId);
    attachDocumentInternal({
      importCase,
      documentId,
      roleCode,
      metadataJson,
      actorId: requireText(actorId, "actor_id_required")
    });
    return recalculateImportCase({
      companyId: importCase.companyId,
      importCaseId: importCase.importCaseId,
      actorId
    });
  }

  function addImportCaseComponent({
    companyId,
    importCaseId,
    componentType,
    amount,
    currencyCode = null,
    vatRelevanceCode = null,
    sourceDocumentId = null,
    ledgerTreatmentCode = null,
    metadataJson = {},
    actorId = "system"
  } = {}) {
    const importCase = requireMutableCase(state, companyId, importCaseId);
    addComponentInternal({
      importCase,
      componentType,
      amount,
      currencyCode: currencyCode || importCase.currencyCode,
      vatRelevanceCode,
      sourceDocumentId,
      ledgerTreatmentCode,
      metadataJson,
      actorId: requireText(actorId, "actor_id_required")
    });
    return recalculateImportCase({
      companyId: importCase.companyId,
      importCaseId: importCase.importCaseId,
      actorId
    });
  }

  function recalculateImportCase({ companyId, importCaseId, actorId = "system" } = {}) {
    const importCase = requireCase(state, companyId, importCaseId);
    const documentLinks = listCaseDocumentLinks(state, importCase.importCaseId);
    const components = listCaseComponents(state, importCase.importCaseId);
    const blockingReasonCodes = [];
    const classificationCase = resolveLinkedClassificationCase({
      documentClassificationPlatform,
      importCase
    });
    const openCorrectionRequests = listOpenCorrectionRequests(state, importCase.importCaseId);

    if (!documentLinks.some((link) => link.roleCode === "PRIMARY_SUPPLIER_DOCUMENT")) {
      blockingReasonCodes.push("PRIMARY_SUPPLIER_DOCUMENT_MISSING");
    }

    if (components.length === 0) {
      blockingReasonCodes.push("IMPORT_COMPONENTS_MISSING");
    }

    const customsEvidenceRequired = determineCustomsEvidenceRequirement(importCase, components);
    if (customsEvidenceRequired && !documentLinks.some((link) => link.roleCode === "CUSTOMS_EVIDENCE")) {
      blockingReasonCodes.push("CUSTOMS_EVIDENCE_MISSING");
    }

    const importVatBaseAmount = calculateImportVatBase(components);
    const importVatAmount = calculateImportVatAmount(components);
    if (
      importVatBaseAmount > 0 &&
      importVatAmount <= 0 &&
      customsEvidenceRequired &&
      documentLinks.some((link) => link.roleCode === "CUSTOMS_EVIDENCE")
    ) {
      blockingReasonCodes.push("IMPORT_VAT_AMOUNT_MISSING");
    }

    if (classificationCase && !["approved", "dispatched"].includes(classificationCase.status)) {
      blockingReasonCodes.push("SOURCE_CLASSIFICATION_NOT_APPROVED");
    }

    if (openCorrectionRequests.length > 0) {
      blockingReasonCodes.push("OPEN_CORRECTION_REQUESTS");
    }

    const completenessStatus = blockingReasonCodes.length > 0 ? "blocking" : "complete";
    const reviewRequired = completenessStatus === "blocking" || completenessStatus === "complete";
    const reviewRiskClass = blockingReasonCodes.length > 0 ? "high" : customsEvidenceRequired ? "medium" : "low";

    importCase.requiresCustomsEvidence = customsEvidenceRequired;
    importCase.blockingReasonCodes = Object.freeze(filterAllowedBlockingReasonCodes(blockingReasonCodes));
    importCase.completenessStatus = completenessStatus;
    importCase.reviewRequired = reviewRequired;
    importCase.reviewRiskClass = reviewRiskClass;
    importCase.importVatBaseAmount = importVatBaseAmount;
    importCase.importVatAmount = importVatAmount;
    importCase.componentTotalsJson = aggregateComponentTotals(components);
    importCase.updatedAt = nowIso(clock);

    if (!["approved", "applied", "posted", "rejected", "corrected", "closed"].includes(importCase.status)) {
      importCase.status = completenessStatus === "complete" ? "ready_for_review" : "collecting_documents";
    }

    if (reviewRequired && !["approved", "applied", "posted", "rejected", "corrected", "closed"].includes(importCase.status)) {
      createOrReuseReviewItem({
        importCase,
        customsEvidenceRequired,
        documentLinks
      });
    }

    pushAudit(state, {
      companyId: importCase.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      action: "import_case.recalculated",
      entityType: "import_case",
      entityId: importCase.importCaseId,
      explanation: `Recalculated import case ${importCase.caseReference} with completeness ${importCase.completenessStatus}.`,
      recordedAt: importCase.updatedAt
    });
    return presentCase(state, importCase);
  }

  function approveImportCase({ companyId, importCaseId, approvalNote = null, actorId = "system" } = {}) {
    const importCase = requireCase(state, companyId, importCaseId);
    if (["approved", "applied"].includes(importCase.status)) {
      return presentCase(state, importCase);
    }
    if (!MUTABLE_CASE_STATUSES.has(importCase.status)) {
      throw createError(409, "import_case_not_approvable", "Import case cannot be approved from its current status.");
    }
    if (importCase.completenessStatus !== "complete") {
      throw createError(409, "import_case_incomplete", "Import case must be complete before approval.");
    }
    if (listOpenCorrectionRequests(state, importCase.importCaseId).length > 0) {
      throw createError(
        409,
        "import_case_open_correction_requests",
        "Import case cannot be approved while correction requests are still open."
      );
    }

    const resolvedActorId = requireText(actorId, "actor_id_required");
    if (importCase.reviewItemId && reviewCenterPlatform) {
      settleLinkedReviewItem({ importCase, actorId: resolvedActorId, approvalNote });
    }

    const now = nowIso(clock);
    importCase.status = "approved";
    importCase.approvalNote = normalizeOptionalText(approvalNote);
    importCase.approvedAt = now;
    importCase.approvedByActorId = resolvedActorId;
    importCase.updatedAt = now;
    importCase.reviewRequired = false;

    pushAudit(state, {
      companyId: importCase.companyId,
      actorId: resolvedActorId,
      action: "import_case.approved",
      entityType: "import_case",
      entityId: importCase.importCaseId,
      explanation: `Approved import case ${importCase.caseReference}.`,
      recordedAt: now
    });
    return presentCase(state, importCase);
  }

  function requestImportCaseCorrection({
    companyId,
    importCaseId,
    reasonCode,
    reasonNote = null,
    actorId = "system"
  } = {}) {
    const importCase = requireCase(state, companyId, importCaseId);
    if (["corrected", "closed"].includes(importCase.status)) {
      throw createError(409, "import_case_not_correctable", "Import case cannot accept correction requests from its current status.");
    }
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const correctionRequest = {
      importCaseCorrectionRequestId: crypto.randomUUID(),
      companyId: importCase.companyId,
      importCaseId: importCase.importCaseId,
      status: IMPORT_CASE_CORRECTION_REQUEST_STATUSES[0],
      reasonCode: requireAllowedStatus(
        reasonCode,
        IMPORT_CASE_CORRECTION_REQUEST_REASON_CODES,
        "import_case_correction_request_reason_invalid"
      ),
      reasonNote: normalizeOptionalText(reasonNote),
      requestedByActorId: resolvedActorId,
      requestedAt: nowIso(clock),
      decidedAt: null,
      decidedByActorId: null,
      decisionCode: null,
      decisionNote: null,
      replacementImportCaseId: null
    };
    state.correctionRequests.set(correctionRequest.importCaseCorrectionRequestId, correctionRequest);
    appendToIndex(state.correctionRequestIdsByCase, correctionRequest.importCaseId, correctionRequest.importCaseCorrectionRequestId);
    pushAudit(state, {
      companyId: importCase.companyId,
      actorId: resolvedActorId,
      action: "import_case.correction_requested",
      entityType: "import_case_correction_request",
      entityId: correctionRequest.importCaseCorrectionRequestId,
      explanation: `Opened correction request for import case ${importCase.caseReference}.`,
      recordedAt: correctionRequest.requestedAt
    });
    return recalculateImportCase({
      companyId: importCase.companyId,
      importCaseId: importCase.importCaseId,
      actorId: resolvedActorId
    });
  }

  function decideImportCaseCorrectionRequest({
    companyId,
    importCaseId,
    importCaseCorrectionRequestId,
    decisionCode,
    decisionNote = null,
    replacementCaseReference = null,
    actorId = "system"
  } = {}) {
    const importCase = requireCase(state, companyId, importCaseId);
    const correctionRequest = requireCorrectionRequest({
      state,
      companyId: importCase.companyId,
      importCaseId: importCase.importCaseId,
      importCaseCorrectionRequestId
    });
    if (correctionRequest.status !== "open") {
      throw createError(409, "import_case_correction_request_closed", "Correction request is already closed.");
    }
    const resolvedDecisionCode = requireAllowedDecisionCode(decisionCode);
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const now = nowIso(clock);
    correctionRequest.status =
      resolvedDecisionCode === "approve"
        ? IMPORT_CASE_CORRECTION_REQUEST_STATUSES[1]
        : IMPORT_CASE_CORRECTION_REQUEST_STATUSES[2];
    correctionRequest.decisionCode = resolvedDecisionCode;
    correctionRequest.decisionNote = normalizeOptionalText(decisionNote);
    correctionRequest.decidedAt = now;
    correctionRequest.decidedByActorId = resolvedActorId;

    let correctionResult = null;
    if (resolvedDecisionCode === "approve") {
      correctionResult = correctImportCase({
        companyId: importCase.companyId,
        importCaseId: importCase.importCaseId,
        replacementCaseReference: requireText(
          replacementCaseReference,
          "replacement_case_reference_required"
        ),
        actorId: resolvedActorId,
        reasonCode: correctionRequest.reasonCode,
        reasonNote: correctionRequest.reasonNote
      });
      correctionRequest.replacementImportCaseId = correctionResult.replacementCase.importCaseId;
    }

    pushAudit(state, {
      companyId: importCase.companyId,
      actorId: resolvedActorId,
      action: "import_case.correction_request_decided",
      entityType: "import_case_correction_request",
      entityId: correctionRequest.importCaseCorrectionRequestId,
      explanation: `${resolvedDecisionCode}d correction request for import case ${importCase.caseReference}.`,
      recordedAt: now
    });

    return {
      importCase:
        correctionResult?.priorCase ||
        recalculateImportCase({
          companyId: importCase.companyId,
          importCaseId: importCase.importCaseId,
          actorId: resolvedActorId
        }),
      correctionRequest: copy(correctionRequest),
      replacementCase: correctionResult?.replacementCase || null,
      correction: correctionResult?.correction || null
    };
  }

  function applyImportCase({
    companyId,
    importCaseId,
    targetDomainCode,
    targetObjectType,
    targetObjectId,
    appliedCommandKey,
    payload = {},
    actorId = "system"
  } = {}) {
    const importCase = requireCase(state, companyId, importCaseId);
    if (!["approved", "applied", "posted"].includes(importCase.status)) {
      throw createError(409, "import_case_not_applicable", "Import case must be approved before downstream apply.");
    }
    if (importCase.completenessStatus !== "complete") {
      throw createError(409, "import_case_incomplete", "Import case must be complete before downstream apply.");
    }
    if (listOpenCorrectionRequests(state, importCase.importCaseId).length > 0) {
      throw createError(
        409,
        "import_case_open_correction_requests",
        "Import case cannot be applied while correction requests are still open."
      );
    }

    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedTargetDomainCode = normalizeCode(targetDomainCode, "import_case_target_domain_required");
    const resolvedTargetObjectType = normalizeCode(targetObjectType, "import_case_target_object_type_required");
    const resolvedTargetObjectId = requireText(targetObjectId, "import_case_target_object_id_required");
    const resolvedAppliedCommandKey = requireText(appliedCommandKey, "import_case_applied_command_key_required");
    const payloadHash = buildHash({
      targetDomainCode: resolvedTargetDomainCode,
      targetObjectType: resolvedTargetObjectType,
      targetObjectId: resolvedTargetObjectId,
      appliedCommandKey: resolvedAppliedCommandKey,
      payload: copy(payload || {})
    });

    if (importCase.applicationStatus === "applied") {
      const sameApplication =
        importCase.appliedTargetDomainCode === resolvedTargetDomainCode &&
        importCase.appliedTargetObjectType === resolvedTargetObjectType &&
        importCase.appliedTargetObjectId === resolvedTargetObjectId &&
        importCase.appliedCommandKey === resolvedAppliedCommandKey &&
        importCase.appliedPayloadHash === payloadHash;
      if (sameApplication) {
        return presentCase(state, importCase);
      }
      throw createError(
        409,
        "import_case_downstream_mapping_conflict",
        "Import case is already applied to another downstream mapping."
      );
    }

    const now = nowIso(clock);
    importCase.status = "applied";
    importCase.applicationStatus = IMPORT_CASE_APPLICATION_STATUSES[1];
    importCase.appliedTargetDomainCode = resolvedTargetDomainCode;
    importCase.appliedTargetObjectType = resolvedTargetObjectType;
    importCase.appliedTargetObjectId = resolvedTargetObjectId;
    importCase.appliedCommandKey = resolvedAppliedCommandKey;
    importCase.appliedPayloadHash = payloadHash;
    importCase.appliedAt = now;
    importCase.appliedByActorId = resolvedActorId;
    importCase.updatedAt = now;

    pushAudit(state, {
      companyId: importCase.companyId,
      actorId: resolvedActorId,
      action: "import_case.applied",
      entityType: "import_case",
      entityId: importCase.importCaseId,
      explanation: `Applied import case ${importCase.caseReference} to ${resolvedTargetDomainCode}/${resolvedTargetObjectType}/${resolvedTargetObjectId}.`,
      recordedAt: now
    });
    return presentCase(state, importCase);
  }

  function correctImportCase({
    companyId,
    importCaseId,
    replacementCaseReference,
    goodsOriginCountry = null,
    customsReference = null,
    requiresCustomsEvidence = null,
    actorId = "system",
    reasonCode = "correction",
    reasonNote = null
  } = {}) {
    const priorCase = requireCase(state, companyId, importCaseId);
    if (priorCase.status === "corrected") {
      throw createError(409, "import_case_already_corrected", "Import case has already been corrected.");
    }

    const resolvedActorId = requireText(actorId, "actor_id_required");
    const priorLinks = listCaseDocumentLinks(state, priorCase.importCaseId);
    const priorComponents = listCaseComponents(state, priorCase.importCaseId);
    const now = nowIso(clock);

    priorCase.status = "corrected";
    priorCase.correctedAt = now;
    priorCase.correctedByActorId = resolvedActorId;
    priorCase.updatedAt = now;

    const replacementCase = createImportCase({
      companyId: priorCase.companyId,
      caseReference: replacementCaseReference,
      goodsOriginCountry: goodsOriginCountry || priorCase.goodsOriginCountry,
      customsReference: customsReference || priorCase.customsReference,
      currencyCode: priorCase.currencyCode,
      requiresCustomsEvidence:
        requiresCustomsEvidence == null ? priorCase.requiresCustomsEvidence : requiresCustomsEvidence,
      sourceClassificationCaseId: priorCase.sourceClassificationCaseId,
      parentImportCaseId: priorCase.importCaseId,
      initialDocuments: priorLinks.map((link) => ({
        documentId: link.documentId,
        roleCode: link.roleCode,
        metadataJson: link.metadataJson
      })),
      initialComponents: priorComponents.map((component) => ({
        componentType: component.componentType,
        amount: component.amount,
        currencyCode: component.currencyCode,
        vatRelevanceCode: component.vatRelevanceCode,
        sourceDocumentId: component.sourceDocumentId,
        ledgerTreatmentCode: component.ledgerTreatmentCode,
        metadataJson: component.metadataJson
      })),
      metadataJson: {
        correctedFromImportCaseId: priorCase.importCaseId
      },
      actorId: resolvedActorId
    });

    priorCase.correctedToImportCaseId = replacementCase.importCaseId;
    const correction = {
      importCaseCorrectionId: crypto.randomUUID(),
      companyId: priorCase.companyId,
      importCaseId: priorCase.importCaseId,
      replacementImportCaseId: replacementCase.importCaseId,
      reasonCode: normalizeCode(reasonCode, "import_case_correction_reason_required"),
      reasonNote: normalizeOptionalText(reasonNote),
      createdByActorId: resolvedActorId,
      createdAt: now
    };
    state.corrections.set(correction.importCaseCorrectionId, correction);
    appendToIndex(state.correctionIdsByCase, priorCase.importCaseId, correction.importCaseCorrectionId);

    pushAudit(state, {
      companyId: priorCase.companyId,
      actorId: resolvedActorId,
      action: "import_case.corrected",
      entityType: "import_case",
      entityId: priorCase.importCaseId,
      explanation: `Corrected import case ${priorCase.caseReference} into ${replacementCase.caseReference}.`,
      recordedAt: now
    });

    return {
      priorCase: presentCase(state, priorCase),
      correction: copy(correction),
      replacementCase: presentCase(state, state.cases.get(replacementCase.importCaseId))
    };
  }

  function snapshotImportCases({ companyId = null } = {}) {
    const resolvedCompanyId = normalizeOptionalText(companyId);
    const filterByCompany = (item) => (resolvedCompanyId ? item.companyId === resolvedCompanyId : true);
    return {
      importCases: Array.from(state.cases.values()).filter(filterByCompany).map((importCase) => presentCase(state, importCase)),
      documentLinks: Array.from(state.documentLinks.values()).filter(filterByCompany).map(copy),
      components: Array.from(state.components.values()).filter(filterByCompany).map(copy),
      correctionRequests: Array.from(state.correctionRequests.values()).filter(filterByCompany).map(copy),
      corrections: Array.from(state.corrections.values()).filter(filterByCompany).map(copy),
      auditEvents: state.auditEvents.filter(filterByCompany).map(copy),
      documentBridgeReady: documentPlatform != null,
      reviewCenterBridgeReady: reviewCenterPlatform != null
    };
  }

  function createOrReuseReviewItem({ importCase, customsEvidenceRequired, documentLinks }) {
    if (!reviewCenterPlatform || typeof reviewCenterPlatform.createReviewItem !== "function") {
      return null;
    }
    const reviewItem = reviewCenterPlatform.createReviewItem({
      companyId: importCase.companyId,
      queueCode: importCase.reviewQueueCode || IMPORT_CASE_REVIEW_QUEUE_CODE,
      reviewTypeCode: "IMPORT_CASE_REVIEW",
      sourceDomainCode: "IMPORT_CASES",
      sourceObjectType: "import_case",
      sourceObjectId: importCase.importCaseId,
      sourceReference: importCase.caseReference,
      sourceObjectLabel: `Import case ${importCase.caseReference}`,
      requiredDecisionType: IMPORT_CASE_REVIEW_DECISION_TYPE,
      riskClass: importCase.reviewRiskClass,
      title:
        importCase.completenessStatus === "blocking"
          ? `Import case ${importCase.caseReference} is blocked`
          : `Import case ${importCase.caseReference} is ready for review`,
      summary: buildReviewSummary(importCase),
      requestedPayload: {
        caseReference: importCase.caseReference,
        goodsOriginCountry: importCase.goodsOriginCountry,
        customsReference: importCase.customsReference,
        customsEvidenceRequired,
        blockingReasonCodes: importCase.blockingReasonCodes,
        completenessStatus: importCase.completenessStatus,
        importVatBaseAmount: importCase.importVatBaseAmount,
        importVatAmount: importCase.importVatAmount,
        linkedDocuments: documentLinks.map((link) => ({
          documentId: link.documentId,
          roleCode: link.roleCode
        }))
      },
      evidenceRefs: [
        `import_case:${importCase.importCaseId}`,
        ...documentLinks.map((link) => `document:${link.documentId}`)
      ],
      policyCode: "DOCUMENT_REVIEW_AND_ECONOMIC_DECISION",
      actorId: importCase.createdByActorId
    });
    importCase.reviewItemId = reviewItem.reviewItemId;
    importCase.reviewQueueCode = reviewItem.queueCode;
    return reviewItem;
  }

  function settleLinkedReviewItem({ importCase, actorId, approvalNote }) {
    const current = reviewCenterPlatform.getReviewCenterItem({
      companyId: importCase.companyId,
      reviewItemId: importCase.reviewItemId
    });
    if (["open", "waiting_input", "escalated"].includes(current.status)) {
      reviewCenterPlatform.claimReviewCenterItem({
        companyId: importCase.companyId,
        reviewItemId: importCase.reviewItemId,
        actorId
      });
    }
    const claimed = reviewCenterPlatform.getReviewCenterItem({
      companyId: importCase.companyId,
      reviewItemId: importCase.reviewItemId
    });
    if (claimed.status === "claimed") {
      reviewCenterPlatform.startReviewCenterItem({
        companyId: importCase.companyId,
        reviewItemId: importCase.reviewItemId,
        actorId
      });
    }
    const active = reviewCenterPlatform.getReviewCenterItem({
      companyId: importCase.companyId,
      reviewItemId: importCase.reviewItemId
    });
    if (["claimed", "in_review", "waiting_input", "escalated"].includes(active.status)) {
      reviewCenterPlatform.decideReviewCenterItem({
        companyId: importCase.companyId,
        reviewItemId: importCase.reviewItemId,
        decisionCode: "approve",
        reasonCode: "import_case_complete",
        note: approvalNote || "Approved from import case.",
        decisionPayload: {
          importCaseId: importCase.importCaseId,
          caseReference: importCase.caseReference,
          importVatBaseAmount: importCase.importVatBaseAmount,
          importVatAmount: importCase.importVatAmount
        },
        actorId
      });
    }
    const decided = reviewCenterPlatform.getReviewCenterItem({
      companyId: importCase.companyId,
      reviewItemId: importCase.reviewItemId
    });
    if (["approved", "rejected", "escalated"].includes(decided.status)) {
      reviewCenterPlatform.closeReviewCenterItem({
        companyId: importCase.companyId,
        reviewItemId: importCase.reviewItemId,
        actorId,
        note: approvalNote || "Closed after import-case approval."
      });
    }
  }

  function attachDocumentInternal({ importCase, documentId, roleCode, metadataJson = {}, actorId }) {
    requireDocumentSnapshot({
      documentPlatform,
      companyId: importCase.companyId,
      documentId
    });

    const resolvedDocumentId = requireText(documentId, "document_id_required");
    const resolvedRoleCode = requireAllowedStatus(
      roleCode,
      IMPORT_CASE_DOCUMENT_ROLE_CODES,
      "import_case_document_role_invalid"
    );
    const existingLink = listCaseDocumentLinks(state, importCase.importCaseId).find(
      (candidate) => candidate.documentId === resolvedDocumentId
    );
    if (existingLink) {
      if (existingLink.roleCode !== resolvedRoleCode) {
        throw createError(
          409,
          "import_case_document_role_conflict",
          "Document is already linked to the import case with another role."
        );
      }
      return existingLink;
    }

    const documentKey = buildDocumentKey(importCase.companyId, resolvedDocumentId);
    const activeCaseId = state.activeCaseIdByDocument.get(documentKey);
    if (activeCaseId && activeCaseId !== importCase.importCaseId) {
      const activeCase = state.cases.get(activeCaseId) || null;
      if (activeCase && ACTIVE_CASE_STATUSES.has(activeCase.status)) {
        throw createError(
          409,
          "import_case_document_already_linked",
          "Document is already linked to another active import case."
        );
      }
    }

    const link = {
      importCaseDocumentLinkId: crypto.randomUUID(),
      importCaseId: importCase.importCaseId,
      companyId: importCase.companyId,
      documentId: resolvedDocumentId,
      roleCode: resolvedRoleCode,
      metadataJson: copy(metadataJson || {}),
      linkedByActorId: actorId,
      linkedAt: nowIso(clock)
    };
    state.documentLinks.set(link.importCaseDocumentLinkId, link);
    appendToIndex(state.documentLinkIdsByCase, importCase.importCaseId, link.importCaseDocumentLinkId);
    state.activeCaseIdByDocument.set(documentKey, importCase.importCaseId);

    if (documentPlatform && typeof documentPlatform.linkDocumentRecord === "function") {
      documentPlatform.linkDocumentRecord({
        companyId: importCase.companyId,
        documentId: resolvedDocumentId,
        targetType: "import_case",
        targetId: importCase.importCaseId,
        metadataJson: {
          roleCode: resolvedRoleCode,
          caseReference: importCase.caseReference
        },
        actorId
      });
    }

    pushAudit(state, {
      companyId: importCase.companyId,
      actorId,
      action: "import_case.document_linked",
      entityType: "import_case_document_link",
      entityId: link.importCaseDocumentLinkId,
      explanation: `Linked document ${resolvedDocumentId} as ${resolvedRoleCode} to import case ${importCase.caseReference}.`,
      recordedAt: link.linkedAt
    });
    return link;
  }

  function addComponentInternal({
    importCase,
    componentType,
    amount,
    currencyCode,
    vatRelevanceCode,
    sourceDocumentId = null,
    ledgerTreatmentCode = null,
    metadataJson = {},
    actorId
  }) {
    const resolvedComponentType = requireAllowedStatus(
      componentType,
      IMPORT_CASE_COMPONENT_TYPES,
      "import_case_component_type_invalid"
    );
    const resolvedAmount = normalizeMoney(amount, "import_case_component_amount_invalid");
    if (resolvedAmount <= 0) {
      throw createError(400, "import_case_component_amount_invalid", "Import case component amount must be greater than zero.");
    }
    const resolvedCurrencyCode = normalizeCurrencyCode(currencyCode || importCase.currencyCode);
    const resolvedVatRelevanceCode = requireAllowedStatus(
      vatRelevanceCode || defaultVatRelevanceCode(resolvedComponentType),
      IMPORT_CASE_VAT_RELEVANCE_CODES,
      "import_case_vat_relevance_invalid"
    );
    const resolvedSourceDocumentId = normalizeOptionalText(sourceDocumentId);
    if (resolvedSourceDocumentId) {
      requireDocumentSnapshot({
        documentPlatform,
        companyId: importCase.companyId,
        documentId: resolvedSourceDocumentId
      });
    }
    const dedupeKey = buildComponentDedupeKey({
      importCaseId: importCase.importCaseId,
      componentType: resolvedComponentType,
      amount: resolvedAmount,
      currencyCode: resolvedCurrencyCode,
      vatRelevanceCode: resolvedVatRelevanceCode,
      sourceDocumentId: resolvedSourceDocumentId
    });
    const existingComponentId = state.componentIdByDedupeKey.get(dedupeKey);
    if (existingComponentId) {
      return state.components.get(existingComponentId);
    }

    const component = {
      importCaseComponentId: crypto.randomUUID(),
      importCaseId: importCase.importCaseId,
      companyId: importCase.companyId,
      sourceDocumentId: resolvedSourceDocumentId,
      componentType: resolvedComponentType,
      amount: resolvedAmount,
      currencyCode: resolvedCurrencyCode,
      vatRelevanceCode: resolvedVatRelevanceCode,
      ledgerTreatmentCode: normalizeOptionalText(ledgerTreatmentCode)
        ? normalizeCode(ledgerTreatmentCode, "import_case_ledger_treatment_invalid")
        : resolvedComponentType,
      metadataJson: copy(metadataJson || {}),
      createdByActorId: actorId,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.components.set(component.importCaseComponentId, component);
    appendToIndex(state.componentIdsByCase, importCase.importCaseId, component.importCaseComponentId);
    state.componentIdByDedupeKey.set(dedupeKey, component.importCaseComponentId);

    pushAudit(state, {
      companyId: importCase.companyId,
      actorId,
      action: "import_case.component_added",
      entityType: "import_case_component",
      entityId: component.importCaseComponentId,
      explanation: `Added ${resolvedComponentType} component ${resolvedAmount} ${resolvedCurrencyCode} to import case ${importCase.caseReference}.`,
      recordedAt: component.createdAt
    });
    return component;
  }
}

function presentCase(state, importCase) {
  const documentLinks = listCaseDocumentLinks(state, importCase.importCaseId).map(copy);
  const components = listCaseComponents(state, importCase.importCaseId).map(copy);
  const correctionRequests = listCaseCorrectionRequests(state, importCase.importCaseId).map(copy);
  const corrections = listCaseCorrections(state, importCase.importCaseId).map(copy);
  return {
    ...copy(importCase),
    documentLinks,
    components,
    correctionRequests,
    corrections,
    completeness: {
      status: importCase.completenessStatus,
      blockingReasonCodes: [...importCase.blockingReasonCodes],
      importVatBaseAmount: importCase.importVatBaseAmount,
      importVatAmount: importCase.importVatAmount,
      componentTotals: copy(importCase.componentTotalsJson)
    },
    downstreamApplication: {
      applicationStatus: importCase.applicationStatus || IMPORT_CASE_APPLICATION_STATUSES[0],
      targetDomainCode: importCase.appliedTargetDomainCode,
      targetObjectType: importCase.appliedTargetObjectType,
      targetObjectId: importCase.appliedTargetObjectId,
      appliedCommandKey: importCase.appliedCommandKey,
      appliedPayloadHash: importCase.appliedPayloadHash,
      appliedAt: importCase.appliedAt,
      appliedByActorId: importCase.appliedByActorId
    }
  };
}

function buildReviewSummary(importCase) {
  if (importCase.blockingReasonCodes.length > 0) {
    return `Blocking reasons: ${importCase.blockingReasonCodes.join(", ")}`;
  }
  return `Import case is complete with VAT base ${importCase.importVatBaseAmount} SEK and import VAT ${importCase.importVatAmount} SEK.`;
}

function calculateImportVatBase(components) {
  return roundMoney(
    components
      .filter((component) => component.vatRelevanceCode === "IMPORT_VAT_BASE")
      .reduce((sum, component) => sum + component.amount, 0)
  );
}

function calculateImportVatAmount(components) {
  return roundMoney(
    components
      .filter((component) => component.vatRelevanceCode === "IMPORT_VAT_AMOUNT")
      .reduce((sum, component) => sum + component.amount, 0)
  );
}

function aggregateComponentTotals(components) {
  const totals = {};
  for (const component of components) {
    totals[component.componentType] = roundMoney((totals[component.componentType] || 0) + component.amount);
  }
  return totals;
}

function defaultVatRelevanceCode(componentType) {
  if (componentType === "IMPORT_VAT") {
    return "IMPORT_VAT_AMOUNT";
  }
  return COMPONENTS_IN_IMPORT_VAT_BASE.has(componentType) ? "IMPORT_VAT_BASE" : "OUTSIDE_IMPORT_VAT_BASE";
}

function determineCustomsEvidenceRequirement(importCase, components) {
  if (importCase.requiresCustomsEvidence === true) {
    return true;
  }
  if (importCase.requiresCustomsEvidence === false) {
    return false;
  }
  if (normalizeOptionalText(importCase.customsReference)) {
    return true;
  }
  if (importCase.goodsOriginCountry && !EU_COUNTRY_CODES.includes(importCase.goodsOriginCountry)) {
    return true;
  }
  return components.some((component) =>
    ["CUSTOMS_DUTY", "IMPORT_VAT", "OTHER_STATE_FEE"].includes(component.componentType)
  );
}

function resolveSourceClassificationCase({ documentClassificationPlatform, companyId, sourceClassificationCaseId }) {
  const resolvedSourceClassificationCaseId = normalizeOptionalText(sourceClassificationCaseId);
  if (!resolvedSourceClassificationCaseId) {
    return null;
  }
  if (!documentClassificationPlatform || typeof documentClassificationPlatform.getClassificationCase !== "function") {
    throw createError(
      409,
      "document_classification_platform_required",
      "Document classification platform is required when sourceClassificationCaseId is supplied."
    );
  }
  return documentClassificationPlatform.getClassificationCase({
    companyId,
    classificationCaseId: resolvedSourceClassificationCaseId
  });
}

function resolveLinkedClassificationCase({ documentClassificationPlatform, importCase }) {
  if (!importCase.sourceClassificationCaseId) {
    return null;
  }
  return resolveSourceClassificationCase({
    documentClassificationPlatform,
    companyId: importCase.companyId,
    sourceClassificationCaseId: importCase.sourceClassificationCaseId
  });
}

function normalizeInitialDocuments({ initialDocuments, classificationCase }) {
  const normalized = Array.isArray(initialDocuments) ? [...initialDocuments] : [];
  if (
    classificationCase &&
    classificationCase.documentId &&
    !normalized.some((candidate) => candidate.documentId === classificationCase.documentId)
  ) {
    normalized.unshift({
      documentId: classificationCase.documentId,
      roleCode: "PRIMARY_SUPPLIER_DOCUMENT",
      metadataJson: {
        sourceClassificationCaseId: classificationCase.classificationCaseId
      }
    });
  }
  return normalized;
}

function listCaseDocumentLinks(state, importCaseId) {
  return (state.documentLinkIdsByCase.get(importCaseId) || [])
    .map((importCaseDocumentLinkId) => state.documentLinks.get(importCaseDocumentLinkId))
    .filter(Boolean);
}

function listCaseComponents(state, importCaseId) {
  return (state.componentIdsByCase.get(importCaseId) || [])
    .map((importCaseComponentId) => state.components.get(importCaseComponentId))
    .filter(Boolean);
}

function listCaseCorrections(state, importCaseId) {
  return (state.correctionIdsByCase.get(importCaseId) || [])
    .map((importCaseCorrectionId) => state.corrections.get(importCaseCorrectionId))
    .filter(Boolean);
}

function listCaseCorrectionRequests(state, importCaseId) {
  return (state.correctionRequestIdsByCase.get(importCaseId) || [])
    .map((importCaseCorrectionRequestId) => state.correctionRequests.get(importCaseCorrectionRequestId))
    .filter(Boolean);
}

function listOpenCorrectionRequests(state, importCaseId) {
  return listCaseCorrectionRequests(state, importCaseId).filter(
    (correctionRequest) => correctionRequest.status === IMPORT_CASE_CORRECTION_REQUEST_STATUSES[0]
  );
}

function requireCase(state, companyId, importCaseId) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const resolvedImportCaseId = requireText(importCaseId, "import_case_id_required");
  const importCase = state.cases.get(resolvedImportCaseId);
  if (!importCase || importCase.companyId !== resolvedCompanyId) {
    throw createError(404, "import_case_not_found", "Import case was not found.");
  }
  return importCase;
}

function requireCorrectionRequest({ state, companyId, importCaseId, importCaseCorrectionRequestId }) {
  const correctionRequest = state.correctionRequests.get(
    requireText(importCaseCorrectionRequestId, "import_case_correction_request_id_required")
  );
  if (
    !correctionRequest ||
    correctionRequest.companyId !== requireText(companyId, "company_id_required") ||
    correctionRequest.importCaseId !== requireText(importCaseId, "import_case_id_required")
  ) {
    throw createError(404, "import_case_correction_request_not_found", "Import case correction request was not found.");
  }
  return correctionRequest;
}

function requireMutableCase(state, companyId, importCaseId) {
  const importCase = requireCase(state, companyId, importCaseId);
  if (!MUTABLE_CASE_STATUSES.has(importCase.status)) {
    throw createError(409, "import_case_not_mutable", "Import case cannot be modified from its current status.");
  }
  return importCase;
}

function requireAllowedStatus(value, allowedValues, errorCode) {
  const resolvedValue = normalizeCode(value, errorCode);
  const canonicalValue = allowedValues.find((allowedValue) => normalizeCode(allowedValue, errorCode) === resolvedValue);
  if (!canonicalValue) {
    throw createError(400, errorCode, `Value "${resolvedValue}" is not allowed.`);
  }
  return canonicalValue;
}

function requireAllowedDecisionCode(value) {
  return requireAllowedStatus(value, ["approve", "reject"], "import_case_correction_request_decision_invalid");
}

function normalizeCurrencyCode(value) {
  const resolvedValue = requireText(value, "currency_code_required").toUpperCase();
  if (!/^[A-Z]{3}$/.test(resolvedValue)) {
    throw createError(400, "currency_code_invalid", "Currency code must be a 3-letter ISO code.");
  }
  return resolvedValue;
}

function normalizeOptionalCountryCode(value) {
  const resolvedValue = normalizeOptionalText(value);
  if (!resolvedValue) {
    return null;
  }
  const countryCode = resolvedValue.toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    throw createError(400, "country_code_invalid", "Country code must be a 2-letter ISO code.");
  }
  return countryCode;
}

function buildReferenceKey(companyId, caseReference) {
  return `${companyId}:${caseReference}`;
}

function buildDocumentKey(companyId, documentId) {
  return `${companyId}:${documentId}`;
}

function buildComponentDedupeKey({ importCaseId, componentType, amount, currencyCode, vatRelevanceCode, sourceDocumentId }) {
  return buildHash({
    importCaseId,
    componentType,
    amount: roundMoney(amount),
    currencyCode,
    vatRelevanceCode,
    sourceDocumentId: normalizeOptionalText(sourceDocumentId)
  });
}

function requireDocumentSnapshot({ documentPlatform, companyId, documentId }) {
  if (!documentPlatform || typeof documentPlatform.getDocumentRecord !== "function") {
    throw createError(409, "document_platform_required", "Document platform is required for import cases.");
  }
  return documentPlatform.getDocumentRecord({
    companyId,
    documentId
  });
}

function pushAudit(state, event) {
  state.auditEvents.push(
    createAuditEnvelopeFromLegacyEvent({
      clock: () => event.recordedAt || new Date(),
      auditClass: "import_cases_action",
      event
    })
  );
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
}

function filterAllowedBlockingReasonCodes(values) {
  return uniqueStrings(values).filter((value) => IMPORT_CASE_BLOCKING_REASON_CODES.includes(value));
}

function seedDemoState() {
  return DEMO_COMPANY_ID;
}
