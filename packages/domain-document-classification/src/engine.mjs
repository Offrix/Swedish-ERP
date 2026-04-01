import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";
import {
  CLASSIFICATION_CASE_STATUSES,
  CLASSIFICATION_REVIEW_REASON_CODES,
  DOCUMENT_CLASSIFICATION_RULEPACK_CODE,
  DOCUMENT_CLASSIFICATION_RULEPACK_VERSION,
  TREATMENT_CODES,
  TREATMENT_INTENT_STATUSES,
  TREATMENT_LINE_TYPES,
  TREATMENT_SCENARIO_CODES
} from "./constants.mjs";
import {
  appendToIndex,
  assertAllowed,
  copy,
  createError,
  normalizeCaseStatus,
  normalizeCode,
  normalizeReasonCode,
  normalizeRiskClass,
  normalizeScenarioCode,
  normalizeMoney,
  normalizeOptionalDate,
  normalizeOptionalMoney,
  normalizeOptionalText,
  normalizePersonRelationCode,
  normalizeTargetDomain,
  normalizeTreatmentCode,
  normalizeTreatmentLineType,
  pickHighestRisk,
  requireText,
  roundMoney,
  sortByCreatedAt,
  nowIso
} from "./helpers.mjs";

const ACTIVE_CASE_STATUSES = new Set(["ingested", "suggested", "under_review", "approved", "dispatched"]);
const EXTRACTION_FIELD_LINEAGE_ALIASES = Object.freeze({
  amount: Object.freeze(["totalAmount"]),
  vatAmount: Object.freeze(["vatAmount"]),
  currencyCode: Object.freeze(["currencyCode"]),
  description: Object.freeze(["counterparty", "storeName", "vendorName", "contractTitle"]),
  "factsJson.supplierName": Object.freeze(["supplierName", "counterparty", "vendorName", "storeName"]),
  "factsJson.invoiceNumber": Object.freeze(["invoiceNumber"]),
  "factsJson.invoiceDate": Object.freeze(["invoiceDate"]),
  "factsJson.dueDate": Object.freeze(["dueDate"]),
  "factsJson.totalAmount": Object.freeze(["totalAmount"]),
  "factsJson.vatAmount": Object.freeze(["vatAmount"]),
  "factsJson.paymentReference": Object.freeze(["reference"]),
  "factsJson.purchaseOrderReference": Object.freeze(["purchaseOrderReference"]),
  "factsJson.currencyCode": Object.freeze(["currencyCode"]),
  "factsJson.benefitCode": Object.freeze(["benefitCode"]),
  "factsJson.activityType": Object.freeze(["activityType"]),
  "factsJson.activityDate": Object.freeze(["activityDate", "receiptDate"]),
  "factsJson.vendorName": Object.freeze(["vendorName", "storeName", "counterparty"]),
  "factsJson.reimbursementAmount": Object.freeze(["totalAmount"]),
  "factsJson.expenseType": Object.freeze(["expenseType"]),
  "factsJson.expenseDate": Object.freeze(["expenseDate", "receiptDate"]),
  "factsJson.paymentMethod": Object.freeze(["paymentMethod"]),
  "factsJson.hasReceiptSupport": Object.freeze([]),
  "factsJson.contractTitle": Object.freeze(["contractTitle"]),
  "factsJson.counterparty": Object.freeze(["counterparty", "storeName"]),
  "factsJson.effectiveDate": Object.freeze(["effectiveDate"]),
  "factsJson.attachmentCategory": Object.freeze([])
});

export function createDocumentClassificationPlatform(options = {}) {
  return createDocumentClassificationEngine(options);
}

export function createDocumentClassificationEngine({
  clock = () => new Date(),
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null,
  documentPlatform = null,
  reviewCenterPlatform = null,
  benefitsPlatform = null,
  payrollPlatform = null
} = {}) {
  const state = {
    cases: new Map(),
    caseIdsByCompany: new Map(),
    caseIdsByDocument: new Map(),
    activeCaseIdByDocument: new Map(),
    treatmentLines: new Map(),
    treatmentLineIdsByCase: new Map(),
    extractionProjections: new Map(),
    extractionProjectionIdsByCase: new Map(),
    personLinks: new Map(),
    personLinkIdsByCase: new Map(),
    treatmentIntents: new Map(),
    treatmentIntentIdsByCase: new Map(),
    corrections: new Map(),
    correctionIdsByCase: new Map(),
    auditEvents: []
  };

  if (seedDemo) {
    seedDemoState();
  }

  const engine = {
    classificationCaseStatuses: CLASSIFICATION_CASE_STATUSES,
    treatmentLineTypes: TREATMENT_LINE_TYPES,
    treatmentCodes: TREATMENT_CODES,
    treatmentIntentStatuses: TREATMENT_INTENT_STATUSES,
    treatmentScenarioCodes: TREATMENT_SCENARIO_CODES,
    reviewReasonCodes: CLASSIFICATION_REVIEW_REASON_CODES,
    createClassificationCase,
    listClassificationCases,
    getClassificationCase,
    approveClassificationCase,
    dispatchTreatmentIntents,
    correctClassificationCase,
    listPendingReviewClassificationCases,
    getClassificationDispatchStatus,
    snapshotDocumentClassification
  };

  Object.defineProperty(engine, "__durableState", {
    value: state,
    enumerable: false
  });

  return engine;

  function createClassificationCase(input = {}) {
    const companyId = requireText(input.companyId, "company_id_required");
    const documentId = requireText(input.documentId, "document_id_required");
    const activeCaseId = !input.parentClassificationCaseId
      ? state.activeCaseIdByDocument.get(buildDocumentKey(companyId, documentId))
      : null;
    if (activeCaseId) {
      const activeCase = state.cases.get(activeCaseId);
      if (activeCase && ACTIVE_CASE_STATUSES.has(activeCase.status)) {
        return presentCase(state, activeCase);
      }
    }

    const documentRecord = requireDocumentSnapshot({ documentPlatform, companyId, documentId });
    const latestOcrRun = resolveOcrSnapshot({
      documentPlatform,
      companyId,
      documentId,
      sourceOcrRunId: input.sourceOcrRunId
    });
    const extractedFields = copy(Object.keys(input.extractedFields || {}).length > 0 ? input.extractedFields : latestOcrRun?.extractedFieldsJson || {});
    const rawLineInputs =
      Array.isArray(input.lineInputs) && input.lineInputs.length > 0
        ? input.lineInputs
        : deriveSuggestedLineInputs({
            documentRecord,
            latestOcrRun,
            extractedFields
          });
    const lineInputs = normalizeLineInputs(rawLineInputs, extractedFields);
    if (lineInputs.length === 0) {
      throw createError(400, "classification_line_inputs_required", "At least one classification line input is required.");
    }

    const classificationCase = buildCaseRecord({
      clock,
      input,
      companyId,
      documentId,
      documentRecord,
      latestOcrRun,
      extractedFields,
      lineInputs
    });
    const materialized = materializeCaseArtifacts({ classificationCase, lineInputs });
    persistCaseArtifacts({ state, classificationCase, materialized, companyId, documentId });
    linkCaseToDocument({ documentPlatform, companyId, documentId, classificationCase });
    maybeCreateReviewItem({ reviewCenterPlatform, classificationCase });
    pushAudit(state, clock, {
      companyId,
      actorId: classificationCase.createdByActorId,
      action: "document_classification.case_created",
      entityType: "classification_case",
      entityId: classificationCase.classificationCaseId,
      explanation: `Created classification case for document ${documentId}.`
    });
    return presentCase(state, classificationCase);
  }

  function listClassificationCases({ companyId, documentId, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const ids = documentId
      ? state.caseIdsByDocument.get(buildDocumentKey(resolvedCompanyId, requireText(documentId, "document_id_required"))) || []
      : state.caseIdsByCompany.get(resolvedCompanyId) || [];
    const resolvedStatus = status == null ? null : normalizeCaseStatus(status);
    return ids.map((id) => state.cases.get(id)).filter(Boolean).filter((item) => (resolvedStatus ? item.status === resolvedStatus : true)).map((item) => presentCase(state, item)).sort(sortByCreatedAt);
  }

  function getClassificationCase({ companyId, classificationCaseId } = {}) {
    return presentCase(state, requireCase(state, companyId, classificationCaseId));
  }

  function approveClassificationCase({ companyId, classificationCaseId, actorId = "system", approvalNote = null } = {}) {
    const classificationCase = requireCase(state, companyId, classificationCaseId);
    if (!["ingested", "suggested", "under_review"].includes(classificationCase.status)) {
      throw createError(409, "classification_case_not_approvable", "Classification case cannot be approved from its current status.");
    }
    const resolvedActorId = requireText(actorId, "actor_id_required");
    if (classificationCase.reviewItemId && reviewCenterPlatform) {
      settleLinkedReviewItem({
        reviewCenterPlatform,
        classificationCase,
        actorId: resolvedActorId,
        approvalNote
      });
    }

    const now = nowIso(clock);
    classificationCase.status = "approved";
    classificationCase.approvedAt = now;
    classificationCase.approvedByActorId = resolvedActorId;
    classificationCase.updatedAt = now;
    classificationCase.approvalNote = normalizeOptionalText(approvalNote);
    for (const intent of listCaseIntents(state, classificationCase.classificationCaseId)) {
      if (intent.status === "draft") {
        intent.status = "approved";
        intent.updatedAt = now;
      }
    }
    pushAudit(state, clock, {
      companyId: classificationCase.companyId,
      actorId: resolvedActorId,
      action: "document_classification.case_approved",
      entityType: "classification_case",
      entityId: classificationCase.classificationCaseId,
      explanation: `Approved classification case ${classificationCase.classificationCaseId}.`
    });
    return presentCase(state, classificationCase);
  }

  function dispatchTreatmentIntents({ companyId, classificationCaseId, actorId = "system" } = {}) {
    const classificationCase = requireCase(state, companyId, classificationCaseId);
    if (!["approved", "dispatched"].includes(classificationCase.status)) {
      throw createError(409, "classification_case_not_dispatchable", "Classification case must be approved before dispatch.");
    }
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const now = nowIso(clock);
    for (const intent of listCaseIntents(state, classificationCase.classificationCaseId)) {
      if (["dispatched", "realized", "reversed"].includes(intent.status)) {
        continue;
      }
      if (intent.status !== "approved") {
        throw createError(409, "classification_intent_not_approved", "All treatment intents must be approved before dispatch.");
      }
      const line = state.treatmentLines.get(intent.treatmentLineId);
      const personLink = intent.personLinkId ? state.personLinks.get(intent.personLinkId) || null : null;
      const dispatchResult = dispatchIntent({
        clock,
        benefitsPlatform,
        payrollPlatform,
        intent,
        line,
        personLink,
        classificationCase,
        actorId: resolvedActorId
      });
      intent.status = dispatchResult.status;
      intent.dispatchedAt = now;
      intent.dispatchedByActorId = resolvedActorId;
      intent.dispatchResultJson = copy(dispatchResult.payload);
      intent.updatedAt = now;
    }
    classificationCase.status = "dispatched";
    classificationCase.dispatchedAt = now;
    classificationCase.dispatchedByActorId = resolvedActorId;
    classificationCase.updatedAt = now;
    pushAudit(state, clock, {
      companyId: classificationCase.companyId,
      actorId: resolvedActorId,
      action: "document_classification.case_dispatched",
      entityType: "classification_case",
      entityId: classificationCase.classificationCaseId,
      explanation: `Dispatched treatment intents for classification case ${classificationCase.classificationCaseId}.`
    });
    return presentCase(state, classificationCase);
  }

  function correctClassificationCase({
    companyId,
    classificationCaseId,
    lineInputs,
    extractedFields = {},
    sourceOcrRunId = null,
    actorId = "system",
    reasonCode,
    reasonNote = null
  } = {}) {
    const priorCase = requireCase(state, companyId, classificationCaseId);
    if (priorCase.status === "corrected") {
      throw createError(409, "classification_case_already_corrected", "Classification case has already been corrected.");
    }
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const replacementCase = createClassificationCase({
      companyId: priorCase.companyId,
      documentId: priorCase.documentId,
      parentClassificationCaseId: priorCase.classificationCaseId,
      sourceOcrRunId: sourceOcrRunId || priorCase.sourceOcrRunId,
      extractedFields,
      lineInputs,
      actorId: resolvedActorId
    });
    const now = nowIso(clock);
    const resolvedReasonCode = normalizeCode(reasonCode || "correction", "classification_correction_reason_required");
    priorCase.status = "corrected";
    priorCase.correctedAt = now;
    priorCase.correctedByActorId = resolvedActorId;
    priorCase.correctedToCaseId = replacementCase.classificationCaseId;
    priorCase.updatedAt = now;
    for (const intent of listCaseIntents(state, priorCase.classificationCaseId)) {
      if (intent.targetDomainCode === "PAYROLL" && payrollPlatform?.reverseDocumentClassificationPayrollPayload) {
        payrollPlatform.reverseDocumentClassificationPayrollPayload({
          companyId: priorCase.companyId,
          treatmentIntentId: intent.treatmentIntentId,
          actorId: resolvedActorId,
          reasonCode: resolvedReasonCode,
          replacementTreatmentIntentId:
            replacementCase.treatmentIntents.find((candidate) => candidate.treatmentCode === intent.treatmentCode)?.treatmentIntentId || null
        });
      }
    }
    for (const intent of listCaseIntents(state, priorCase.classificationCaseId)) {
      if (!["reversed", "failed"].includes(intent.status)) {
        intent.status = "reversed";
        intent.updatedAt = now;
      }
    }
    const correction = Object.freeze({
      classificationCorrectionId: crypto.randomUUID(),
      companyId: priorCase.companyId,
      classificationCaseId: priorCase.classificationCaseId,
      replacementClassificationCaseId: replacementCase.classificationCaseId,
      reasonCode: resolvedReasonCode,
      reasonNote: normalizeOptionalText(reasonNote),
      createdByActorId: resolvedActorId,
      createdAt: now
    });
    state.corrections.set(correction.classificationCorrectionId, correction);
    appendToIndex(state.correctionIdsByCase, priorCase.classificationCaseId, correction.classificationCorrectionId);
    pushAudit(state, clock, {
      companyId: priorCase.companyId,
      actorId: resolvedActorId,
      action: "document_classification.case_corrected",
      entityType: "classification_case",
      entityId: priorCase.classificationCaseId,
      explanation: `Corrected classification case ${priorCase.classificationCaseId} with replacement ${replacementCase.classificationCaseId}.`
    });
    return {
      priorCase: presentCase(state, priorCase),
      correction: copy(correction),
      replacementCase: getClassificationCase({
        companyId: priorCase.companyId,
        classificationCaseId: replacementCase.classificationCaseId
      })
    };
  }

  function listPendingReviewClassificationCases({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.caseIdsByCompany.get(resolvedCompanyId) || [])
      .map((classificationCaseId) => state.cases.get(classificationCaseId))
      .filter(Boolean)
      .filter((item) => item.requiresReview === true && ["suggested", "under_review"].includes(item.status))
      .map((item) => presentCase(state, item))
      .sort(sortByCreatedAt);
  }

  function getClassificationDispatchStatus({ companyId, classificationCaseId } = {}) {
    const classificationCase = requireCase(state, companyId, classificationCaseId);
    const intents = listCaseIntents(state, classificationCase.classificationCaseId);
    return {
      companyId: classificationCase.companyId,
      classificationCaseId: classificationCase.classificationCaseId,
      status: classificationCase.status,
      summary: summarizeIntentStatuses(intents),
      intents: intents.map((intent) => presentIntent(state, intent))
    };
  }

  function snapshotDocumentClassification({ companyId = null } = {}) {
    const resolvedCompanyId = normalizeOptionalText(companyId);
    const filterCompany = (item) => (resolvedCompanyId ? item.companyId === resolvedCompanyId : true);
    return {
      cases: Array.from(state.cases.values()).filter(filterCompany).map((item) => presentCase(state, item)),
      treatmentLines: Array.from(state.treatmentLines.values()).filter(filterCompany).map(copy),
      extractionProjections: Array.from(state.extractionProjections.values()).filter(filterCompany).map(copy),
      personLinks: Array.from(state.personLinks.values()).filter(filterCompany).map(copy),
      treatmentIntents: Array.from(state.treatmentIntents.values()).filter(filterCompany).map((item) => presentIntent(state, item)),
      corrections: Array.from(state.corrections.values()).filter(filterCompany).map(copy),
      auditEvents: state.auditEvents.filter(filterCompany).map(copy)
    };
  }

  function seedDemoState() {}
}

function buildCaseRecord({
  clock,
  input,
  companyId,
  documentId,
  documentRecord,
  latestOcrRun,
  extractedFields,
  lineInputs
}) {
  const now = nowIso(clock);
  const reviewProfile = collectReviewProfile({ lineInputs, documentRecord, latestOcrRun, extractedFields });
  const scenarioCode = deriveCaseScenarioCode(lineInputs);
  return {
    classificationCaseId: crypto.randomUUID(),
    companyId,
    documentId,
    parentClassificationCaseId: normalizeOptionalText(input.parentClassificationCaseId),
    sourceOcrRunId: normalizeOptionalText(input.sourceOcrRunId) || latestOcrRun?.ocrRun?.ocrRunId || latestOcrRun?.ocrRunId || null,
    sourceDocumentType: normalizeOptionalText(documentRecord.documentType),
    sourceDocumentStatus: normalizeOptionalText(documentRecord.status),
    sourceDocumentSnapshotJson: copy(documentRecord),
    sourceOcrSnapshotJson: latestOcrRun ? copy(latestOcrRun) : null,
    extractedFieldsJson: copy(extractedFields || {}),
    scenarioCode,
    status: reviewProfile.requiresReview ? "under_review" : "suggested",
    requiresReview: reviewProfile.requiresReview,
    reviewRiskClass: reviewProfile.reviewRiskClass,
    reviewReasonCodes: reviewProfile.reviewReasonCodes,
    reviewItemId: null,
    reviewQueueCode: reviewProfile.reviewQueueCode,
    totalAmount: roundMoney(lineInputs.reduce((sum, line) => sum + line.amount, 0)),
    currencyCode: normalizeOptionalText(input.currencyCode) || "SEK",
    approvalNote: null,
    approvedAt: null,
    approvedByActorId: null,
    dispatchedAt: null,
    dispatchedByActorId: null,
    correctedAt: null,
    correctedByActorId: null,
    correctedToCaseId: null,
    createdByActorId: requireText(input.actorId || "system", "actor_id_required"),
    createdAt: now,
    updatedAt: now,
    metadataJson: {
      rulepackCode: DOCUMENT_CLASSIFICATION_RULEPACK_CODE,
      rulepackVersion: DOCUMENT_CLASSIFICATION_RULEPACK_VERSION
    }
  };
}

function materializeCaseArtifacts({ classificationCase, lineInputs }) {
  const treatmentLines = [];
  const extractionProjections = [];
  const personLinks = [];
  const treatmentIntents = [];

  for (const lineInput of lineInputs) {
    const treatmentLineId = crypto.randomUUID();
    const personLinkId = lineInput.person?.employeeId ? crypto.randomUUID() : null;
    treatmentLines.push({
      treatmentLineId,
      classificationCaseId: classificationCase.classificationCaseId,
      companyId: classificationCase.companyId,
      lineType: lineInput.lineType,
      sourceLineKey: lineInput.sourceLineKey,
      description: lineInput.description,
      amount: lineInput.amount,
      vatAmount: lineInput.vatAmount,
      currencyCode: lineInput.currencyCode,
      treatmentCode: lineInput.treatmentCode,
      scenarioCode: lineInput.scenarioCode,
      targetDomainCode: lineInput.targetDomainCode,
      requiresReview: lineInput.requiresReview,
      reviewRiskClass: lineInput.reviewRiskClass,
      reviewReasonCodes: Object.freeze([...lineInput.reviewReasonCodes]),
      factsJson: copy(lineInput.factsJson),
      createdAt: classificationCase.createdAt,
      updatedAt: classificationCase.createdAt
    });
    extractionProjections.push(
      buildExtractionProjection({
        classificationCase,
        treatmentLineId,
        lineInput
      })
    );
    if (personLinkId) {
      personLinks.push({
        personLinkId,
        classificationCaseId: classificationCase.classificationCaseId,
        treatmentLineId,
        companyId: classificationCase.companyId,
        employeeId: lineInput.person.employeeId,
        employmentId: lineInput.person.employmentId,
        personRelationCode: lineInput.person.personRelationCode,
        createdAt: classificationCase.createdAt,
        updatedAt: classificationCase.createdAt
      });
    }
    treatmentIntents.push({
      treatmentIntentId: crypto.randomUUID(),
      classificationCaseId: classificationCase.classificationCaseId,
      treatmentLineId,
      personLinkId,
      companyId: classificationCase.companyId,
      documentId: classificationCase.documentId,
      targetDomainCode: lineInput.targetDomainCode,
      treatmentCode: lineInput.treatmentCode,
      scenarioCode: lineInput.scenarioCode,
      amount: lineInput.amount,
      currencyCode: lineInput.currencyCode,
      status: "draft",
      payloadJson: buildIntentPayload({ classificationCase, lineInput }),
      dispatchResultJson: null,
      dispatchedAt: null,
      dispatchedByActorId: null,
      createdAt: classificationCase.createdAt,
      updatedAt: classificationCase.createdAt
    });
  }

  return { treatmentLines, extractionProjections, personLinks, treatmentIntents };
}

function persistCaseArtifacts({ state, classificationCase, materialized, companyId, documentId }) {
  state.cases.set(classificationCase.classificationCaseId, classificationCase);
  appendToIndex(state.caseIdsByCompany, companyId, classificationCase.classificationCaseId);
  appendToIndex(state.caseIdsByDocument, buildDocumentKey(companyId, documentId), classificationCase.classificationCaseId);
  state.activeCaseIdByDocument.set(buildDocumentKey(companyId, documentId), classificationCase.classificationCaseId);
  for (const line of materialized.treatmentLines) {
    state.treatmentLines.set(line.treatmentLineId, line);
    appendToIndex(state.treatmentLineIdsByCase, line.classificationCaseId, line.treatmentLineId);
  }
  for (const extractionProjection of materialized.extractionProjections) {
    state.extractionProjections.set(extractionProjection.extractionProjectionId, extractionProjection);
    appendToIndex(
      state.extractionProjectionIdsByCase,
      extractionProjection.classificationCaseId,
      extractionProjection.extractionProjectionId
    );
  }
  for (const personLink of materialized.personLinks) {
    state.personLinks.set(personLink.personLinkId, personLink);
    appendToIndex(state.personLinkIdsByCase, personLink.classificationCaseId, personLink.personLinkId);
  }
  for (const intent of materialized.treatmentIntents) {
    state.treatmentIntents.set(intent.treatmentIntentId, intent);
    appendToIndex(state.treatmentIntentIdsByCase, intent.classificationCaseId, intent.treatmentIntentId);
  }
}

function linkCaseToDocument({ documentPlatform, companyId, documentId, classificationCase }) {
  if (!documentPlatform || typeof documentPlatform.linkDocumentRecord !== "function") {
    return;
  }
  documentPlatform.linkDocumentRecord({
    companyId,
    documentId,
    targetType: "classification_case",
    targetId: classificationCase.classificationCaseId,
    metadataJson: {
      sourceDomain: "DOCUMENT_CLASSIFICATION",
      scenarioCode: classificationCase.scenarioCode
    },
    actorId: classificationCase.createdByActorId
  });
}

function maybeCreateReviewItem({ reviewCenterPlatform, classificationCase }) {
  if (!classificationCase.requiresReview || !reviewCenterPlatform || typeof reviewCenterPlatform.createReviewItem !== "function") {
    return null;
  }
  const queueCode = classificationCase.reviewQueueCode || "DOCUMENT_REVIEW";
  const requiredDecisionType = queueCode === "PAYROLL_REVIEW" ? "payroll_treatment" : "classification";
  const reviewItem = reviewCenterPlatform.createReviewItem({
    companyId: classificationCase.companyId,
    queueCode,
    reviewTypeCode: "DOCUMENT_PERSON_CLASSIFICATION",
    sourceDomainCode: "DOCUMENT_CLASSIFICATION",
    sourceObjectType: "classification_case",
    sourceObjectId: classificationCase.classificationCaseId,
    sourceReference: classificationCase.documentId,
    sourceObjectLabel: `Document ${classificationCase.documentId}`,
    requiredDecisionType,
    riskClass: classificationCase.reviewRiskClass,
    title: `Document classification requires review for ${classificationCase.documentId}`,
    summary: classificationCase.reviewReasonCodes.join(", "),
    requestedPayload: {
      documentId: classificationCase.documentId,
      scenarioCode: classificationCase.scenarioCode,
      reviewReasonCodes: classificationCase.reviewReasonCodes
    },
    evidenceRefs: [`document:${classificationCase.documentId}`, `classification_case:${classificationCase.classificationCaseId}`],
    policyCode: "DOCUMENT_REVIEW_AND_ECONOMIC_DECISION",
    actorId: classificationCase.createdByActorId
  });
  classificationCase.reviewItemId = reviewItem.reviewItemId;
  return reviewItem;
}

function buildExtractionProjection({ classificationCase, treatmentLineId, lineInput }) {
  const extractionFamilyCode = deriveExtractionFamilyCode(lineInput);
  const candidateObjectType = deriveCandidateObjectType(lineInput);
  const documentRoleCode = deriveDocumentRoleCode(lineInput);
  const normalizedFieldsJson = buildNormalizedExtractionFields({ classificationCase, lineInput, extractionFamilyCode });
  const attachmentRefs = Object.freeze(buildProjectionAttachmentRefs({ classificationCase }));
  const fieldLineageJson = buildProjectionFieldLineage({
    classificationCase,
    normalizedFieldsJson,
    attachmentRefs
  });
  const confidenceScore = deriveProjectionConfidenceScore({
    classificationCase,
    fieldLineageJson
  });
  return {
    extractionProjectionId: crypto.randomUUID(),
    classificationCaseId: classificationCase.classificationCaseId,
    treatmentLineId,
    companyId: classificationCase.companyId,
    documentId: classificationCase.documentId,
    sourceOcrRunId: classificationCase.sourceOcrRunId,
    extractionFamilyCode,
    candidateObjectType,
    targetDomainCode: lineInput.targetDomainCode,
    documentRoleCode,
    attachmentRoleCode: "primary_document",
    requiresReview: lineInput.requiresReview,
    reviewRiskClass: lineInput.reviewRiskClass,
    reviewReasonCodes: Object.freeze([...lineInput.reviewReasonCodes]),
    confidenceScore,
    normalizedFieldsJson,
    fieldLineageJson,
    attachmentRefs,
    payloadHash: crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          classificationCaseId: classificationCase.classificationCaseId,
          treatmentLineId,
          extractionFamilyCode,
          candidateObjectType,
          targetDomainCode: lineInput.targetDomainCode,
          confidenceScore,
          normalizedFieldsJson,
          fieldLineageJson,
          attachmentRefs,
          reviewReasonCodes: lineInput.reviewReasonCodes
        })
      )
      .digest("hex"),
    createdAt: classificationCase.createdAt,
    updatedAt: classificationCase.createdAt
  };
}

function buildProjectionAttachmentRefs({ classificationCase }) {
  const documentSnapshot = classificationCase.sourceDocumentSnapshotJson || {};
  const sourceOcrSnapshot = classificationCase.sourceOcrSnapshotJson || {};
  return compactStringList([
    `document:${classificationCase.documentId}`,
    classificationCase.sourceOcrRunId ? `ocr_run:${classificationCase.sourceOcrRunId}` : null,
    documentSnapshot.originalDocumentVersionId ? `document_version:${documentSnapshot.originalDocumentVersionId}` : null,
    documentSnapshot.latestDocumentVersionId ? `document_version:${documentSnapshot.latestDocumentVersionId}` : null,
    sourceOcrSnapshot.ocrDocumentVersionId ? `document_version:${sourceOcrSnapshot.ocrDocumentVersionId}` : null,
    sourceOcrSnapshot.classificationDocumentVersionId
      ? `document_version:${sourceOcrSnapshot.classificationDocumentVersionId}`
      : null
  ]);
}

function buildProjectionFieldLineage({ classificationCase, normalizedFieldsJson, attachmentRefs }) {
  const extractedFields = classificationCase.extractedFieldsJson || {};
  const lineageEntries = {};
  const fieldPaths = [
    "amount",
    "vatAmount",
    "currencyCode",
    "description",
    ...Object.keys(normalizedFieldsJson?.factsJson || {}).map((key) => `factsJson.${key}`)
  ];
  for (const fieldPath of fieldPaths) {
    lineageEntries[fieldPath] = buildProjectionFieldLineageEntry({
      classificationCase,
      extractedFields,
      fieldPath,
      attachmentRefs
    });
  }
  return Object.freeze(lineageEntries);
}

function buildProjectionFieldLineageEntry({ classificationCase, extractedFields, fieldPath, attachmentRefs }) {
  const candidateFieldKeys = EXTRACTION_FIELD_LINEAGE_ALIASES[fieldPath] || [];
  const matchedFieldKey = candidateFieldKeys.find((fieldKey) => extractedFields[fieldKey] != null) || null;
  if (matchedFieldKey) {
    return Object.freeze({
      sourceKind: "extracted_field",
      sourcePath: `extractedFields.${matchedFieldKey}`,
      sourceFieldKey: matchedFieldKey,
      sourceOcrRunId: classificationCase.sourceOcrRunId,
      confidenceScore: readExtractedFieldConfidence(extractedFields[matchedFieldKey]),
      attachmentRefs
    });
  }
  return Object.freeze({
    sourceKind: fieldPath.startsWith("factsJson.") ? "derived_rule" : "document_metadata",
    sourcePath: fieldPath.startsWith("factsJson.") ? "derived_rule" : "document.metadataJson",
    sourceFieldKey: null,
    sourceOcrRunId: classificationCase.sourceOcrRunId,
    confidenceScore: null,
    attachmentRefs
  });
}

function deriveProjectionConfidenceScore({ classificationCase, fieldLineageJson }) {
  const confidences = Object.values(fieldLineageJson)
    .map((entry) => (typeof entry?.confidenceScore === "number" ? entry.confidenceScore : null))
    .filter((value) => value != null);
  if (confidences.length > 0) {
    return roundConfidence(Math.min(...confidences));
  }
  const ocrConfidence = classificationCase.sourceOcrSnapshotJson?.classificationConfidence;
  return typeof ocrConfidence === "number" ? roundConfidence(ocrConfidence) : null;
}

function settleLinkedReviewItem({ reviewCenterPlatform, classificationCase, actorId, approvalNote }) {
  const reviewItem = reviewCenterPlatform.getReviewCenterItem({
    companyId: classificationCase.companyId,
    reviewItemId: classificationCase.reviewItemId
  });
  if (reviewItem.status === "open" || reviewItem.status === "waiting_input" || reviewItem.status === "escalated") {
    reviewCenterPlatform.claimReviewCenterItem({
      companyId: classificationCase.companyId,
      reviewItemId: classificationCase.reviewItemId,
      actorId
    });
  }
  const current = reviewCenterPlatform.getReviewCenterItem({
    companyId: classificationCase.companyId,
    reviewItemId: classificationCase.reviewItemId
  });
  if (current.status === "claimed") {
    reviewCenterPlatform.startReviewCenterItem({
      companyId: classificationCase.companyId,
      reviewItemId: classificationCase.reviewItemId,
      actorId
    });
  }
  const latest = reviewCenterPlatform.getReviewCenterItem({
    companyId: classificationCase.companyId,
    reviewItemId: classificationCase.reviewItemId
  });
  if (["claimed", "in_review", "waiting_input", "escalated"].includes(latest.status)) {
    reviewCenterPlatform.decideReviewCenterItem({
      companyId: classificationCase.companyId,
      reviewItemId: classificationCase.reviewItemId,
      decisionCode: "approve",
      reasonCode: "classification_confirmed",
      note: approvalNote || "Approved from document classification.",
      decisionPayload: {
        classificationCaseId: classificationCase.classificationCaseId,
        scenarioCode: classificationCase.scenarioCode
      },
      actorId
    });
  }
  const afterDecision = reviewCenterPlatform.getReviewCenterItem({
    companyId: classificationCase.companyId,
    reviewItemId: classificationCase.reviewItemId
  });
  if (["approved", "rejected", "escalated"].includes(afterDecision.status)) {
    reviewCenterPlatform.closeReviewCenterItem({
      companyId: classificationCase.companyId,
      reviewItemId: classificationCase.reviewItemId,
      actorId,
      note: approvalNote || "Closed after classification approval."
    });
  }
}

function dispatchIntent({ clock, benefitsPlatform, payrollPlatform, intent, line, personLink, classificationCase, actorId }) {
  if (intent.targetDomainCode === "BENEFITS") {
    if (!benefitsPlatform || typeof benefitsPlatform.createBenefitEvent !== "function") {
      throw createError(409, "classification_benefits_platform_missing", "Benefits platform is required to dispatch benefit intents.");
    }
    const payload = intent.payloadJson || {};
    const benefitCode =
      normalizeOptionalText(payload.benefitCode) ||
      (intent.treatmentCode === "WELLNESS_ALLOWANCE" ? "WELLNESS_ALLOWANCE" : null);
    if (!benefitCode) {
      throw createError(409, "classification_benefit_code_missing", "Benefit dispatch requires a benefit code.");
    }
    if (!personLink?.employeeId || !personLink?.employmentId) {
      throw createError(409, "classification_person_link_missing", "Benefit dispatch requires employee and employment linkage.");
    }
    const event = benefitsPlatform.createBenefitEvent({
      companyId: classificationCase.companyId,
      employeeId: personLink.employeeId,
      employmentId: personLink.employmentId,
      benefitCode,
      occurredOn: normalizeOptionalDate(payload.activityDate || payload.occurredOn, "classification_benefit_date_invalid"),
      reportingPeriod: normalizeOptionalText(payload.reportingPeriod),
      sourceType: "document_classification_intent",
      sourceId: intent.treatmentIntentId,
      sourcePayload: {
        activityType: normalizeOptionalText(payload.activityType),
        activityDate: normalizeOptionalText(payload.activityDate),
        vendorName: normalizeOptionalText(payload.vendorName),
        equalTermsOffered: payload.equalTermsOffered === true,
        providedAsGiftCard: payload.providedAsGiftCard === true,
        carryOverFromPriorYear: payload.carryOverFromPriorYear === true,
        reimbursementAmount: payload.reimbursementAmount ?? intent.amount,
        calendarYearGrantedBeforeEvent: payload.calendarYearGrantedBeforeEvent ?? 0,
        valuationMethod: normalizeOptionalText(payload.valuationMethod),
        manualTaxableValue: payload.manualTaxableValue ?? null,
        employerPaidValue: payload.employerPaidValue ?? payload.insurancePremium ?? intent.amount,
        insurancePremium: payload.insurancePremium ?? null,
        taxablePremiumRatio: payload.taxablePremiumRatio ?? null,
        documentedLowerRatio: payload.documentedLowerRatio === true
      },
      employeePaidValue: payload.employeePaidValue ?? 0,
      netDeductionValue: payload.netDeductionValue ?? 0,
      supportingDocumentId: classificationCase.documentId,
      dimensionJson: copy(payload.dimensionJson || {}),
      actorId,
      correlationId: intent.treatmentIntentId
    });
    const approvedEvent =
      typeof benefitsPlatform.approveBenefitEvent === "function"
        ? benefitsPlatform.approveBenefitEvent({
            companyId: classificationCase.companyId,
            benefitEventId: event.benefitEventId,
            actorId,
            correlationId: intent.treatmentIntentId
          })
        : event;
    return {
      status: "realized",
      payload: {
        targetDomainCode: intent.targetDomainCode,
        realizedObjectType: "benefit_event",
        realizedObjectId: approvedEvent.benefitEventId,
        warnings: copy(approvedEvent.valuation?.decision?.warnings || [])
      }
    };
  }

  if (intent.targetDomainCode === "PAYROLL") {
    if (!payrollPlatform || typeof payrollPlatform.registerDocumentClassificationPayrollPayload !== "function") {
      throw createError(409, "classification_payroll_platform_missing", "Payroll platform is required to dispatch payroll intents.");
    }
    if (!personLink?.employeeId || !personLink?.employmentId) {
      throw createError(409, "classification_person_link_missing", "Payroll dispatch requires employee and employment linkage.");
    }
    const payrollPayload = buildPayrollDispatchPayload({
      clock,
      intent,
      line,
      personLink,
      classificationCase
    });
    const registeredPayload = payrollPlatform.registerDocumentClassificationPayrollPayload({
      companyId: classificationCase.companyId,
      classificationCaseId: classificationCase.classificationCaseId,
      treatmentIntentId: intent.treatmentIntentId,
      documentId: classificationCase.documentId,
      employeeId: personLink.employeeId,
      employmentId: personLink.employmentId,
      reportingPeriod: payrollPayload.reportingPeriod,
      treatmentCode: intent.treatmentCode,
      sourceType: payrollPayload.sourceType,
      sourceId: intent.treatmentIntentId,
      amount: intent.amount,
      currencyCode: intent.currencyCode,
      payLinePayloadJson: payrollPayload.payLinePayloadJson,
      metadataJson: {
        scenarioCode: intent.scenarioCode,
        treatmentLineId: intent.treatmentLineId,
        personRelationCode: personLink.personRelationCode
      },
      actorId
    });
    return {
      status: "dispatched",
      payload: {
        targetDomainCode: intent.targetDomainCode,
        realizedObjectType: "document_classification_payroll_payload",
        realizedObjectId: registeredPayload.documentClassificationPayrollPayloadId,
        reportingPeriod: registeredPayload.reportingPeriod,
        payItemCode: registeredPayload.payItemCode,
        sourceType: registeredPayload.sourceType,
        treatmentIntentId: intent.treatmentIntentId
      }
    };
  }

  return {
    status: "dispatched",
    payload: {
      targetDomainCode: intent.targetDomainCode,
      handoffRequired: true,
      sourceObjectType: "classification_case",
      sourceObjectId: classificationCase.classificationCaseId,
      treatmentIntentId: intent.treatmentIntentId
    }
  };
}

function buildPayrollDispatchPayload({ clock, intent, line, personLink, classificationCase }) {
  const sourcePayload = copy(intent.payloadJson || {});
  const reportingPeriod = derivePayrollReportingPeriod({ clock, sourcePayload, classificationCase });
  const basePayload = {
    employmentId: personLink.employmentId,
    amount: intent.amount,
    sourceType: null,
    sourceId: intent.treatmentIntentId,
    sourcePeriod: reportingPeriod,
    note: line.description,
    dimensionJson: copy(sourcePayload.dimensionJson || {})
  };

  switch (intent.treatmentCode) {
    case "PRIVATE_RECEIVABLE":
      return {
        reportingPeriod,
        sourceType: "document_classification_private_receivable",
        payLinePayloadJson: {
          ...basePayload,
          processingStep: 13,
          payItemCode: "NET_DEDUCTION",
          sourceType: "document_classification_private_receivable",
          overrides: {
            displayName: "Privatkop foretagskort",
            ledgerAccountCode: "2750",
            agiMappingCode: "not_reported",
            taxTreatmentCode: "non_taxable",
            employerContributionTreatmentCode: "excluded",
            includedInNetPay: true,
            reportingOnly: false
          }
        }
      };
    case "NET_SALARY_DEDUCTION":
      return {
        reportingPeriod,
        sourceType: "document_classification_net_deduction",
        payLinePayloadJson: {
          ...basePayload,
          processingStep: 13,
          payItemCode: "NET_DEDUCTION",
          sourceType: "document_classification_net_deduction",
          overrides: {
            displayName: "Nettoloneavdrag dokumentklassning",
            ledgerAccountCode: "2750",
            agiMappingCode: "not_reported",
            taxTreatmentCode: "non_taxable",
            employerContributionTreatmentCode: "excluded",
            includedInNetPay: true,
            reportingOnly: false
          }
        }
      };
    case "REIMBURSABLE_OUTLAY":
      return {
        reportingPeriod,
        sourceType: "document_classification_reimbursement",
        payLinePayloadJson: {
          ...basePayload,
          processingStep: 7,
          payItemCode: "EXPENSE_REIMBURSEMENT",
          sourceType: "document_classification_reimbursement",
          overrides: {
            displayName: "Utlag dokumentklassning",
            ledgerAccountCode: "7330",
            agiMappingCode: "not_reported",
            taxTreatmentCode: "non_taxable",
            employerContributionTreatmentCode: "excluded",
            includedInNetPay: true,
            reportingOnly: false
          }
        }
      };
    default:
      throw createError(409, "classification_payroll_treatment_unsupported", `Treatment ${intent.treatmentCode} cannot be dispatched to payroll.`);
  }
}

function derivePayrollReportingPeriod({ clock, sourcePayload, classificationCase }) {
  const candidateDate =
    normalizeOptionalDate(sourcePayload.reportingDate, "classification_reporting_date_invalid") ||
    normalizeOptionalDate(sourcePayload.activityDate, "classification_activity_date_invalid") ||
    normalizeOptionalDate(sourcePayload.occurredOn, "classification_occurred_on_invalid") ||
    normalizeOptionalDate(sourcePayload.expenseDate, "classification_expense_date_invalid") ||
    normalizeOptionalDate(sourcePayload.documentDate, "classification_document_date_invalid") ||
    normalizeOptionalDate(classificationCase.createdAt?.slice(0, 10), "classification_created_date_invalid") ||
    nowIso(clock).slice(0, 10);
  return `${candidateDate.slice(0, 4)}${candidateDate.slice(5, 7)}`;
}

function presentCase(state, classificationCase) {
  const treatmentLines = listCaseTreatmentLines(state, classificationCase.classificationCaseId).map(copy);
  const extractionProjections = listCaseExtractionProjections(state, classificationCase.classificationCaseId).map(copy);
  const personLinks = listCasePersonLinks(state, classificationCase.classificationCaseId).map(copy);
  const treatmentIntents = listCaseIntents(state, classificationCase.classificationCaseId).map((intent) => presentIntent(state, intent));
  const corrections = listCaseCorrections(state, classificationCase.classificationCaseId).map(copy);
  return {
    ...copy(classificationCase),
    treatmentLines,
    extractionProjections,
    personLinks,
    treatmentIntents,
    corrections,
    dispatchStatus: {
      status: classificationCase.status,
      summary: summarizeIntentStatuses(treatmentIntents)
    }
  };
}

function presentIntent(state, intent) {
  const personLink = intent.personLinkId ? state.personLinks.get(intent.personLinkId) || null : null;
  return {
    ...copy(intent),
    personLink: copy(personLink)
  };
}

function summarizeIntentStatuses(intents) {
  const summary = {
    totalCount: intents.length,
    draftCount: 0,
    approvedCount: 0,
    dispatchedCount: 0,
    realizedCount: 0,
    reversedCount: 0,
    failedCount: 0
  };
  for (const intent of intents) {
    if (intent.status === "draft") summary.draftCount += 1;
    if (intent.status === "approved") summary.approvedCount += 1;
    if (intent.status === "dispatched") summary.dispatchedCount += 1;
    if (intent.status === "realized") summary.realizedCount += 1;
    if (intent.status === "reversed") summary.reversedCount += 1;
    if (intent.status === "failed") summary.failedCount += 1;
  }
  return summary;
}

function deriveSuggestedLineInputs({ documentRecord, latestOcrRun, extractedFields }) {
  const suggestedDocumentType = normalizeOptionalText(
    latestOcrRun?.suggestedDocumentType || documentRecord?.documentType || "unknown"
  );
  const extractedText = normalizeOptionalText(latestOcrRun?.extractedText || "");
  const totalAmount = readExtractedMoney(
    extractedFields.totalAmount ||
      extractedFields.netAmount ||
      extractedFields.grossAmount ||
      documentRecord?.metadataJson?.totalAmount
  );
  const currencyCode = normalizeOptionalText(
    readExtractedFieldValue(extractedFields.currencyCode) || documentRecord?.metadataJson?.currencyCode || "SEK"
  );

  if (suggestedDocumentType === "supplier_invoice") {
    return [
      {
        lineType: "document_total",
        sourceLineKey: "ocr_supplier_invoice_total",
        description: normalizeOptionalText(readExtractedFieldValue(extractedFields.invoiceNumber))
          ? `Supplier invoice ${readExtractedFieldValue(extractedFields.invoiceNumber)}`
          : "Supplier invoice candidate",
        amount: totalAmount ?? 0,
        currencyCode,
        treatmentCode: "COMPANY_COST",
        targetDomainCode: "AP",
        factsJson: {
          supplierName: readExtractedFieldValue(extractedFields.counterparty),
          invoiceNumber: readExtractedFieldValue(extractedFields.invoiceNumber),
          invoiceDate: readExtractedFieldValue(extractedFields.invoiceDate),
          dueDate: readExtractedFieldValue(extractedFields.dueDate),
          totalAmount,
          vatAmount: readExtractedMoney(extractedFields.vatAmount),
          paymentReference: readExtractedFieldValue(extractedFields.reference),
          purchaseOrderReference: readExtractedFieldValue(extractedFields.purchaseOrderReference),
          currencyCode
        }
      }
    ];
  }

  if (suggestedDocumentType === "expense_receipt") {
    if (looksLikeWellnessOrBenefit({ extractedFields, extractedText })) {
      return [
        {
          lineType: "document_total",
          sourceLineKey: "ocr_benefit_receipt_total",
          description: "Benefit or wellness receipt candidate",
          amount: totalAmount ?? 0,
          currencyCode,
          treatmentCode: deriveBenefitTreatmentCode({ extractedFields, extractedText }),
          targetDomainCode: "BENEFITS",
          reviewReasonCodes: collectDerivedReviewReasonCodes({
            targetDomainCode: "BENEFITS",
            extractedFields,
            extractedText
          }),
          factsJson: {
            benefitCode: deriveBenefitCode({ extractedFields, extractedText }),
            activityType: readExtractedFieldValue(extractedFields.activityType),
            activityDate:
              readExtractedFieldValue(extractedFields.activityDate) ||
              readExtractedFieldValue(extractedFields.receiptDate),
            vendorName:
              readExtractedFieldValue(extractedFields.vendorName) ||
              readExtractedFieldValue(extractedFields.storeName) ||
              readExtractedFieldValue(extractedFields.counterparty),
            reimbursementAmount: totalAmount,
            equalTermsOffered: true,
            providedAsGiftCard: false,
            carryOverFromPriorYear: false,
            calendarYearGrantedBeforeEvent: 0
          }
        }
      ];
    }

    if (looksLikeTravelExpense({ extractedFields, extractedText })) {
      return [
        {
          lineType: "document_total",
          sourceLineKey: "ocr_travel_receipt_total",
          description: "Travel expense candidate",
          amount: totalAmount ?? 0,
          currencyCode,
          treatmentCode: "REIMBURSABLE_OUTLAY",
          targetDomainCode: "TRAVEL",
          reviewReasonCodes: collectDerivedReviewReasonCodes({
            targetDomainCode: "TRAVEL",
            extractedFields,
            extractedText
          }),
          factsJson: {
            expenseType: deriveTravelExpenseType({ extractedFields, extractedText }),
            expenseDate:
              readExtractedFieldValue(extractedFields.expenseDate) ||
              readExtractedFieldValue(extractedFields.receiptDate),
            vendorName:
              readExtractedFieldValue(extractedFields.vendorName) ||
              readExtractedFieldValue(extractedFields.storeName),
            paymentMethod: deriveTravelPaymentMethod({ extractedFields, extractedText }),
            amount: totalAmount,
            currencyCode,
            hasReceiptSupport: true
          }
        }
      ];
    }

    return [
      {
        lineType: "document_total",
        sourceLineKey: "ocr_payroll_receipt_total",
        description: "Expense receipt candidate",
        amount: totalAmount ?? 0,
        currencyCode,
        treatmentCode: "REIMBURSABLE_OUTLAY",
        targetDomainCode: "PAYROLL",
        reviewReasonCodes: ["PERSON_LINK_MISSING"],
        factsJson: {
          expenseDate: readExtractedFieldValue(extractedFields.receiptDate),
          vendorName:
            readExtractedFieldValue(extractedFields.vendorName) ||
            readExtractedFieldValue(extractedFields.storeName),
          reimbursementAmount: totalAmount,
          currencyCode
        }
      }
    ];
  }

  return [
    {
      lineType: "document_total",
      sourceLineKey: "ocr_attachment_candidate",
      description: normalizeOptionalText(readExtractedFieldValue(extractedFields.contractTitle))
        ? `Attachment candidate ${readExtractedFieldValue(extractedFields.contractTitle)}`
        : "Attachment candidate",
      amount: totalAmount ?? 0,
      currencyCode,
      treatmentCode: "UNKNOWN",
      targetDomainCode: "REVIEW_CENTER",
      reviewReasonCodes: ["ATTACHMENT_HANDOFF_REQUIRED", "TREATMENT_UNKNOWN"],
      factsJson: {
        contractTitle: readExtractedFieldValue(extractedFields.contractTitle),
        counterparty:
          readExtractedFieldValue(extractedFields.counterparty) ||
          readExtractedFieldValue(extractedFields.storeName),
        effectiveDate: readExtractedFieldValue(extractedFields.effectiveDate),
        attachmentCategory: suggestedDocumentType || "unknown"
      }
    }
  ];
}

function normalizeLineInputs(lineInputs, extractedFields) {
  const inputs = Array.isArray(lineInputs) ? lineInputs : [];
  return inputs.map((lineInput, index) => normalizeLineInput(lineInput, index, extractedFields));
}

function normalizeLineInput(lineInput, index, extractedFields) {
  const factsJson = copy(lineInput?.factsJson || lineInput?.payloadJson || {});
  const amount = normalizeMoney(
    lineInput?.amount ?? lineInput?.grossAmount ?? lineInput?.totalAmount ?? extractedFields?.totalAmount,
    `classification_line_${index}_amount_invalid`
  );
  const treatmentCode = normalizeTreatmentCode(lineInput?.treatmentCode || "UNKNOWN");
  const scenarioCode = normalizeScenarioCode(lineInput?.scenarioCode || deriveScenarioCodeFromTreatment(treatmentCode));
  const targetDomainCode = normalizeTargetDomain(lineInput?.targetDomainCode || deriveTargetDomainCode(treatmentCode));
  const reviewReasonCodes = normalizeReviewReasonCodes(lineInput?.reviewReasonCodes || []);
  const person = lineInput?.person?.employeeId
    ? {
        employeeId: requireText(lineInput.person.employeeId, "classification_person_employee_id_required"),
        employmentId: requireText(lineInput.person.employmentId, "classification_person_employment_id_required"),
        personRelationCode: normalizePersonRelationCode(lineInput.person.personRelationCode)
      }
    : null;
  const requiresReview = determineLineReviewRequirement({ treatmentCode, targetDomainCode, factsJson, amount, reviewReasonCodes, person });
  const reviewRiskClass = determineRiskClass({ treatmentCode, requiresReview, reviewReasonCodes, person });
  return {
    sourceLineKey: normalizeOptionalText(lineInput?.sourceLineKey) || `line_${index + 1}`,
    lineType: normalizeTreatmentLineType(lineInput?.lineType || "manual_split"),
    description: requireText(lineInput?.description || lineInput?.label || `Classification line ${index + 1}`, `classification_line_${index}_description_required`),
    amount,
    vatAmount: normalizeOptionalMoney(lineInput?.vatAmount, `classification_line_${index}_vat_amount_invalid`) || 0,
    currencyCode: normalizeOptionalText(lineInput?.currencyCode) || "SEK",
    treatmentCode,
    scenarioCode,
    targetDomainCode,
    reviewReasonCodes,
    requiresReview,
    reviewRiskClass,
    person,
    factsJson
  };
}

function normalizeReviewReasonCodes(reasonCodes) {
  const values = Array.isArray(reasonCodes) ? reasonCodes : [];
  return Object.freeze(Array.from(new Set(values.map((value) => normalizeReasonCode(value)))));
}

function determineLineReviewRequirement({ treatmentCode, targetDomainCode, factsJson, amount, reviewReasonCodes, person }) {
  if (reviewReasonCodes.length > 0) {
    return true;
  }
  if (treatmentCode === "PRIVATE_RECEIVABLE") {
    return true;
  }
  if (["ASSET_CANDIDATE", "IMPORT_CANDIDATE", "UNKNOWN"].includes(treatmentCode)) {
    return true;
  }
  if (targetDomainCode === "BENEFITS" || targetDomainCode === "PAYROLL" || targetDomainCode === "TRAVEL") {
    if (!person?.employeeId || !person?.employmentId) {
      return true;
    }
  }
  if (targetDomainCode === "AR") {
    return true;
  }
  if (treatmentCode === "WELLNESS_ALLOWANCE") {
    return !isDeterministicWellnessFacts({ factsJson, amount });
  }
  return false;
}

function determineRiskClass({ treatmentCode, requiresReview, reviewReasonCodes, person }) {
  let risk = requiresReview ? "medium" : "low";
  if (["PRIVATE_RECEIVABLE", "NET_SALARY_DEDUCTION", "TAXABLE_BENEFIT"].includes(treatmentCode)) {
    risk = pickHighestRisk(risk, "high");
  }
  if (!person && ["BENEFITS", "PAYROLL", "TRAVEL"].includes(deriveTargetDomainCode(treatmentCode))) {
    risk = pickHighestRisk(risk, "critical");
  }
  if (["AR"].includes(deriveTargetDomainCode(treatmentCode))) {
    risk = pickHighestRisk(risk, "medium");
  }
  if (reviewReasonCodes.includes("DOCUMENT_TOTAL_SPLIT_MISMATCH")) {
    risk = pickHighestRisk(risk, "high");
  }
  return normalizeRiskClass(risk);
}

function collectReviewProfile({ lineInputs, documentRecord }) {
  let requiresReview = false;
  let reviewRiskClass = "low";
  const reviewReasonCodes = new Set();
  let reviewQueueCode = "DOCUMENT_REVIEW";
  const totalAmount = roundMoney(lineInputs.reduce((sum, line) => sum + line.amount, 0));
  const expectedTotal = normalizeOptionalMoney(documentRecord?.metadataJson?.ocrAmount || documentRecord?.metadataJson?.totalAmount, "document_total_invalid");
  if (expectedTotal != null && roundMoney(expectedTotal) !== totalAmount) {
    requiresReview = true;
    reviewReasonCodes.add("DOCUMENT_TOTAL_SPLIT_MISMATCH");
    reviewRiskClass = pickHighestRisk(reviewRiskClass, "high");
  }
  for (const line of lineInputs) {
    if (line.requiresReview) {
      requiresReview = true;
    }
    for (const reasonCode of line.reviewReasonCodes) {
      reviewReasonCodes.add(reasonCode);
    }
    reviewRiskClass = pickHighestRisk(reviewRiskClass, line.reviewRiskClass);
    if (["PAYROLL", "BENEFITS", "TRAVEL"].includes(line.targetDomainCode)) {
      reviewQueueCode = "PAYROLL_REVIEW";
    } else if (["AP", "AR"].includes(line.targetDomainCode)) {
      reviewQueueCode = "FINANCE_REVIEW";
    }
  }
  return {
    requiresReview,
    reviewRiskClass: normalizeRiskClass(reviewRiskClass),
    reviewReasonCodes: Object.freeze(Array.from(reviewReasonCodes).sort()),
    reviewQueueCode
  };
}

function buildIntentPayload({ classificationCase, lineInput }) {
  return {
    classificationCaseId: classificationCase.classificationCaseId,
    documentId: classificationCase.documentId,
    treatmentCode: lineInput.treatmentCode,
    scenarioCode: lineInput.scenarioCode,
    amount: lineInput.amount,
    currencyCode: lineInput.currencyCode,
    ...copy(lineInput.factsJson)
  };
}

function deriveCaseScenarioCode(lineInputs) {
  const unique = Array.from(new Set(lineInputs.map((line) => line.scenarioCode)));
  return unique.length === 1 ? unique[0] : "unknown";
}

function deriveScenarioCodeFromTreatment(treatmentCode) {
  switch (treatmentCode) {
    case "COMPANY_COST":
      return "company_cost";
    case "PRIVATE_RECEIVABLE":
      return "private_spend";
    case "REIMBURSABLE_OUTLAY":
      return "reimbursable_outlay";
    case "TAXABLE_BENEFIT":
      return "taxable_benefit";
    case "NET_SALARY_DEDUCTION":
      return "net_salary_deduction";
    case "WELLNESS_ALLOWANCE":
      return "wellness";
    case "ASSET_CANDIDATE":
      return "asset_candidate";
    case "IMPORT_CANDIDATE":
      return "import_candidate";
    default:
      return "unknown";
  }
}

function deriveTargetDomainCode(treatmentCode) {
  switch (treatmentCode) {
    case "WELLNESS_ALLOWANCE":
    case "TAXABLE_BENEFIT":
      return "BENEFITS";
    case "PRIVATE_RECEIVABLE":
    case "REIMBURSABLE_OUTLAY":
    case "NET_SALARY_DEDUCTION":
      return "PAYROLL";
    case "COMPANY_COST":
    case "IMPORT_CANDIDATE":
      return "AP";
    default:
      return "REVIEW_CENTER";
  }
}

function deriveExtractionFamilyCode(lineInput) {
  if (lineInput.targetDomainCode === "AP") {
    return lineInput.treatmentCode === "IMPORT_CANDIDATE" ? "IMPORT_CASE_CANDIDATE" : "AP_SUPPLIER_INVOICE";
  }
  if (lineInput.targetDomainCode === "AR") {
    return "AR_SUPPORTING_ATTACHMENT";
  }
  if (lineInput.targetDomainCode === "BENEFITS") {
    return "BENEFIT_EVENT_CANDIDATE";
  }
  if (lineInput.targetDomainCode === "TRAVEL") {
    return "TRAVEL_EXPENSE_CANDIDATE";
  }
  if (lineInput.targetDomainCode === "PAYROLL") {
    return "PAYROLL_DOCUMENT_SUPPORT";
  }
  return "ATTACHMENT_SUPPORT";
}

function deriveCandidateObjectType(lineInput) {
  if (lineInput.targetDomainCode === "AP") {
    return lineInput.treatmentCode === "IMPORT_CANDIDATE" ? "import_case" : "ap_supplier_invoice";
  }
  if (lineInput.targetDomainCode === "AR") {
    return "ar_supporting_attachment";
  }
  if (lineInput.targetDomainCode === "BENEFITS") {
    return "benefit_event";
  }
  if (lineInput.targetDomainCode === "TRAVEL") {
    return "travel_claim_candidate";
  }
  if (lineInput.targetDomainCode === "PAYROLL") {
    return "payroll_document_support";
  }
  return "document_attachment";
}

function deriveDocumentRoleCode(lineInput) {
  if (lineInput.targetDomainCode === "AP") {
    return lineInput.treatmentCode === "IMPORT_CANDIDATE" ? "CUSTOMS_EVIDENCE" : "PRIMARY_SUPPLIER_DOCUMENT";
  }
  if (lineInput.targetDomainCode === "AR") {
    return "AR_SUPPORTING_DOCUMENT";
  }
  if (lineInput.targetDomainCode === "BENEFITS") {
    return "BENEFIT_RECEIPT";
  }
  if (lineInput.targetDomainCode === "TRAVEL") {
    return "TRAVEL_RECEIPT";
  }
  if (lineInput.targetDomainCode === "PAYROLL") {
    return "PAYROLL_SUPPORTING_DOCUMENT";
  }
  return "OTHER_SUPPORTING_DOCUMENT";
}

function buildNormalizedExtractionFields({ classificationCase, lineInput, extractionFamilyCode }) {
  const factsJson = copy(lineInput.factsJson || {});
  return {
    extractionFamilyCode,
    scenarioCode: lineInput.scenarioCode,
    treatmentCode: lineInput.treatmentCode,
    targetDomainCode: lineInput.targetDomainCode,
    amount: lineInput.amount,
    vatAmount: lineInput.vatAmount,
    currencyCode: lineInput.currencyCode,
    description: lineInput.description,
    sourceDocumentType: classificationCase.sourceDocumentType,
    sourceDocumentStatus: classificationCase.sourceDocumentStatus,
    factsJson
  };
}

function readExtractedFieldConfidence(field) {
  if (field == null || typeof field !== "object" || Array.isArray(field) || !("confidence" in field)) {
    return null;
  }
  const numeric = Number(field.confidence);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return roundConfidence(numeric);
}

function readExtractedFieldValue(field) {
  if (field == null) {
    return null;
  }
  if (typeof field === "object" && !Array.isArray(field) && "value" in field) {
    return normalizeOptionalText(field.value);
  }
  return normalizeOptionalText(field);
}

function readExtractedMoney(field) {
  const value = readExtractedFieldValue(field);
  if (value == null) {
    return null;
  }
  return normalizeOptionalMoney(value, "classification_extracted_money_invalid");
}

function roundConfidence(value) {
  return Math.max(0, Math.min(1, Number(Number(value).toFixed(2))));
}

function compactStringList(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim().length > 0))].sort();
}

function collectDerivedReviewReasonCodes({ targetDomainCode, extractedFields, extractedText }) {
  const reasons = [];
  if (targetDomainCode === "BENEFITS" && !readExtractedFieldValue(extractedFields.activityDate)) {
    reasons.push("WELLNESS_FACTS_MISSING");
  }
  if (
    targetDomainCode === "TRAVEL" &&
    !(
      readExtractedFieldValue(extractedFields.receiptDate) ||
      readExtractedFieldValue(extractedFields.expenseDate)
    )
  ) {
    reasons.push("TRAVEL_FACTS_MISSING");
  }
  if (targetDomainCode === "AR") {
    reasons.push("AR_HANDOFF_REQUIRED");
  }
  if (targetDomainCode === "REVIEW_CENTER" && normalizeOptionalText(extractedText)) {
    reasons.push("ATTACHMENT_HANDOFF_REQUIRED");
  }
  return reasons;
}

function looksLikeWellnessOrBenefit({ extractedFields, extractedText }) {
  const mergedText = [
    readExtractedFieldValue(extractedFields.benefitCode),
    readExtractedFieldValue(extractedFields.activityType),
    readExtractedFieldValue(extractedFields.vendorName),
    readExtractedFieldValue(extractedFields.storeName),
    extractedText
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /(wellness|friskv|gym|massage|health insurance|sjukv|insurance|f[öo]rm[åa]n)/i.test(mergedText);
}

function deriveBenefitTreatmentCode({ extractedFields, extractedText }) {
  const mergedText = [
    readExtractedFieldValue(extractedFields.benefitCode),
    readExtractedFieldValue(extractedFields.activityType),
    extractedText
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /(insurance|sjukv)/i.test(mergedText) ? "TAXABLE_BENEFIT" : "WELLNESS_ALLOWANCE";
}

function deriveBenefitCode({ extractedFields, extractedText }) {
  const explicit = readExtractedFieldValue(extractedFields.benefitCode);
  if (explicit) {
    return explicit;
  }
  return /(insurance|sjukv)/i.test(normalizeOptionalText(extractedText) || "")
    ? "HEALTH_INSURANCE"
    : "WELLNESS_ALLOWANCE";
}

function looksLikeTravelExpense({ extractedFields, extractedText }) {
  const mergedText = [
    readExtractedFieldValue(extractedFields.expenseType),
    readExtractedFieldValue(extractedFields.vendorName),
    readExtractedFieldValue(extractedFields.storeName),
    extractedText
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /(hotel|taxi|uber|flight|train|travel|resa|traktamente|mileage|mile|kilometer|km|parking|lodging)/i.test(
    mergedText
  );
}

function deriveTravelExpenseType({ extractedFields, extractedText }) {
  const mergedText = [
    readExtractedFieldValue(extractedFields.expenseType),
    readExtractedFieldValue(extractedFields.vendorName),
    readExtractedFieldValue(extractedFields.storeName),
    normalizeOptionalText(extractedText)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/hotel|lodging/.test(mergedText)) return "lodging";
  if (/taxi|uber|train|flight/.test(mergedText)) return "transport";
  if (/parking/.test(mergedText)) return "parking";
  if (/mileage|kilometer| km /.test(` ${mergedText} `)) return "mileage";
  return "other";
}

function deriveTravelPaymentMethod({ extractedFields, extractedText }) {
  const mergedText = [
    readExtractedFieldValue(extractedFields.paymentMethod),
    normalizeOptionalText(extractedText)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/company card|foretagskort/.test(mergedText)) {
    return "company_card";
  }
  if (/cash|kontant/.test(mergedText)) {
    return "cash";
  }
  return "private_card";
}

function isDeterministicWellnessFacts({ factsJson, amount }) {
  return Boolean(
    factsJson &&
      normalizeOptionalText(factsJson.activityType) &&
      normalizeOptionalDate(factsJson.activityDate, "classification_wellness_activity_date_invalid") &&
      normalizeOptionalText(factsJson.vendorName) &&
      factsJson.equalTermsOffered === true &&
      factsJson.providedAsGiftCard !== true &&
      factsJson.carryOverFromPriorYear !== true &&
      Number(factsJson.calendarYearGrantedBeforeEvent || 0) + Number(factsJson.reimbursementAmount || amount) <= 5000
  );
}

function requireDocumentSnapshot({ documentPlatform, companyId, documentId }) {
  if (!documentPlatform || typeof documentPlatform.getDocumentRecord !== "function") {
    throw createError(409, "document_platform_required", "Document platform is required for document classification.");
  }
  return documentPlatform.getDocumentRecord({ companyId, documentId });
}

function resolveOcrSnapshot({ documentPlatform, companyId, documentId, sourceOcrRunId = null }) {
  if (!documentPlatform || typeof documentPlatform.getDocumentOcrRuns !== "function") {
    return null;
  }
  const snapshot = documentPlatform.getDocumentOcrRuns({ companyId, documentId });
  const runs = Array.isArray(snapshot?.ocrRuns) ? snapshot.ocrRuns : [];
  if (runs.length === 0) {
    return null;
  }
  if (sourceOcrRunId) {
    return copy(runs.find((item) => item.ocrRunId === sourceOcrRunId) || null);
  }
  return copy(runs[runs.length - 1]);
}

function listCaseTreatmentLines(state, classificationCaseId) {
  return (state.treatmentLineIdsByCase.get(classificationCaseId) || [])
    .map((treatmentLineId) => state.treatmentLines.get(treatmentLineId))
    .filter(Boolean);
}

function listCaseExtractionProjections(state, classificationCaseId) {
  return (state.extractionProjectionIdsByCase.get(classificationCaseId) || [])
    .map((extractionProjectionId) => state.extractionProjections.get(extractionProjectionId))
    .filter(Boolean);
}

function listCasePersonLinks(state, classificationCaseId) {
  return (state.personLinkIdsByCase.get(classificationCaseId) || [])
    .map((personLinkId) => state.personLinks.get(personLinkId))
    .filter(Boolean);
}

function listCaseIntents(state, classificationCaseId) {
  return (state.treatmentIntentIdsByCase.get(classificationCaseId) || [])
    .map((treatmentIntentId) => state.treatmentIntents.get(treatmentIntentId))
    .filter(Boolean);
}

function listCaseCorrections(state, classificationCaseId) {
  return (state.correctionIdsByCase.get(classificationCaseId) || [])
    .map((correctionId) => state.corrections.get(correctionId))
    .filter(Boolean);
}

function requireCase(state, companyId, classificationCaseId) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const resolvedClassificationCaseId = requireText(classificationCaseId, "classification_case_id_required");
  const classificationCase = state.cases.get(resolvedClassificationCaseId);
  if (!classificationCase || classificationCase.companyId !== resolvedCompanyId) {
    throw createError(404, "classification_case_not_found", "Classification case was not found.");
  }
  return classificationCase;
}

function buildDocumentKey(companyId, documentId) {
  return `${companyId}:${documentId}`;
}

function pushAudit(state, clock, event) {
  state.auditEvents.push(
    createAuditEnvelopeFromLegacyEvent({
      clock,
      auditClass: "document_classification_action",
      event
    })
  );
}
