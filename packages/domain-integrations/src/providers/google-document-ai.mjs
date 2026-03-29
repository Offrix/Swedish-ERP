import crypto from "node:crypto";

export const GOOGLE_DOCUMENT_AI_PROVIDER_CODE = "google_document_ai";

const OCR_PROFILE_CATALOG = Object.freeze({
  structured_document_parse: Object.freeze({
    profileCode: "structured_document_parse",
    processorFamily: "generic_ocr",
    processorType: "OCR_PROCESSOR",
    processorVersion: "pretrained-ocr-v2.1-2024-08-07",
    baselineCode: "SE-GOOGLE-DOCUMENT-AI-OCR",
    maxSyncPages: 15,
    maxBatchPages: 500,
    supportedMimeTypes: Object.freeze(["application/xml", "text/xml"])
  }),
  generic_document_ocr: Object.freeze({
    profileCode: "generic_document_ocr",
    processorFamily: "generic_ocr",
    processorType: "OCR_PROCESSOR",
    processorVersion: "pretrained-ocr-v2.1-2024-08-07",
    baselineCode: "SE-GOOGLE-DOCUMENT-AI-OCR",
    maxSyncPages: 15,
    maxBatchPages: 500,
    supportedMimeTypes: Object.freeze(["application/pdf", "image/png", "image/jpeg", "image/tiff"])
  }),
  invoice_parse: Object.freeze({
    profileCode: "invoice_parse",
    processorFamily: "invoice_parse",
    processorType: "INVOICE_PROCESSOR",
    processorVersion: "pretrained-invoice-v2.0-2023-12-06",
    baselineCode: "SE-GOOGLE-DOCUMENT-AI-INVOICE",
    maxSyncPages: 15,
    maxBatchPages: 200,
    supportedMimeTypes: Object.freeze(["application/pdf", "image/png", "image/jpeg", "image/tiff"])
  })
});

export function createGoogleDocumentAiProvider({
  clock = () => new Date(),
  environmentMode = "test",
  providerEnvironmentRef = environmentMode === "production" ? "production" : "sandbox",
  providerBaselineRegistry = null
} = {}) {
  const operations = new Map();
  const providerMode = environmentMode === "production" ? "production" : "sandbox";

  return {
    providerCode: GOOGLE_DOCUMENT_AI_PROVIDER_CODE,
    providerMode,
    providerEnvironmentRef,
    getCapabilityManifest,
    startExtraction,
    collectOperation,
    snapshot,
    restore
  };

  function getCapabilityManifest() {
    const modeMatrix = Object.freeze({
      trial_safe: providerMode !== "production",
      sandbox_supported: true,
      test_supported: true,
      production_supported: true,
      supportsLegalEffect: providerMode === "production"
    });
    return Object.freeze({
      manifestId: `document_ai:document_ai:${GOOGLE_DOCUMENT_AI_PROVIDER_CODE}`,
      surfaceCode: "document_ai",
      connectionType: "document_ai",
      providerCode: GOOGLE_DOCUMENT_AI_PROVIDER_CODE,
      providerMode,
      providerEnvironmentRef,
      trialSafe: providerMode !== "production",
      sandboxSupported: true,
      supportsLegalEffect: providerMode === "production",
      modeMatrix,
      supportsAsyncCallback: true,
      supportsRerun: true,
      profiles: Object.values(OCR_PROFILE_CATALOG).map((profile) =>
        Object.freeze({
          profileCode: profile.profileCode,
          processorFamily: profile.processorFamily,
          processorType: profile.processorType,
          processorVersion: profile.processorVersion,
          baselineCode: profile.baselineCode,
          maxSyncPages: profile.maxSyncPages,
          maxBatchPages: profile.maxBatchPages,
          supportedMimeTypes: [...profile.supportedMimeTypes]
        })
      )
    });
  }

  function startExtraction({
    companyId,
    documentId,
    mimeType,
    filename = null,
    profileCode,
    requestedModelVersion = null,
    reasonCode,
    pageCount,
    sourceText = "",
    callbackMode = "auto"
  } = {}) {
    const resolvedProfile = resolveProfile(profileCode);
    const resolvedPageCount = normalizePageCount(pageCount);
    const resolvedMimeType = requireText(mimeType, "ocr_provider_mime_type_required");
    if (
      resolvedProfile.supportedMimeTypes.length > 0
      && !resolvedProfile.supportedMimeTypes.includes(resolvedMimeType)
      && resolvedMimeType !== "application/pdf"
    ) {
      throw createError(409, "ocr_provider_mime_type_unsupported", `OCR profile ${resolvedProfile.profileCode} does not accept ${resolvedMimeType}.`);
    }
    if (resolvedPageCount > resolvedProfile.maxBatchPages) {
      throw createError(
        409,
        "ocr_provider_page_limit_exceeded",
        `OCR profile ${resolvedProfile.profileCode} allows at most ${resolvedProfile.maxBatchPages} pages in batch mode.`
      );
    }
    const shouldRunAsync =
      callbackMode === "manual_provider_callback" ||
      (callbackMode !== "force_sync" && resolvedPageCount > resolvedProfile.maxSyncPages);
    if (callbackMode === "force_sync" && resolvedPageCount > resolvedProfile.maxSyncPages) {
      throw createError(
        409,
        "ocr_provider_sync_page_limit_exceeded",
        `OCR profile ${resolvedProfile.profileCode} allows at most ${resolvedProfile.maxSyncPages} pages in synchronous mode.`
      );
    }
    if (providerMode === "production") {
      throw createError(
        409,
        "ocr_provider_live_not_configured",
        "Google Document AI live processing is not configured in this runtime mode."
      );
    }

    const providerBaselineRef = buildProviderBaselineRef({
      providerBaselineRegistry,
      profile: resolvedProfile,
      effectiveDate: nowIso(clock).slice(0, 10),
      metadata: {
        companyId: normalizeOptionalText(companyId),
        documentId: normalizeOptionalText(documentId),
        reasonCode: normalizeOptionalText(reasonCode)
      }
    });
    const deterministicResult = buildDeterministicExtractionResult({
      clock,
      profile: resolvedProfile,
      sourceText,
      filename,
      pageCount: resolvedPageCount,
      requestedModelVersion,
      providerMode,
      providerEnvironmentRef,
      providerBaselineRef
    });

    if (!shouldRunAsync) {
      return Object.freeze({
        ...deterministicResult,
        status: "completed",
        callbackMode: "none",
        operationName: null,
        callbackToken: null
      });
    }

    const operationName = buildOperationName({
      companyId,
      documentId,
      profileCode: resolvedProfile.profileCode
    });
    const callbackToken = crypto.randomUUID();
    operations.set(operationName, {
      callbackToken,
      result: deterministicResult,
      createdAt: nowIso(clock)
    });

    return Object.freeze({
      providerCode: GOOGLE_DOCUMENT_AI_PROVIDER_CODE,
      providerMode,
      providerEnvironmentRef,
      providerBaselineRef,
      profileCode: resolvedProfile.profileCode,
      processorType: resolvedProfile.processorType,
      processorVersion: deterministicResult.processorVersion,
      pageCount: resolvedPageCount,
      maxSyncPages: resolvedProfile.maxSyncPages,
      maxBatchPages: resolvedProfile.maxBatchPages,
      processingMode: "batch_lro",
      status: "running",
      callbackMode: "manual_provider_callback",
      operationName,
      callbackToken
    });
  }

  function collectOperation({ operationName, callbackToken = null } = {}) {
    const resolvedOperationName = requireText(operationName, "ocr_provider_operation_name_required");
    const operation = operations.get(resolvedOperationName);
    if (!operation) {
      throw createError(404, "ocr_provider_operation_not_found", "OCR provider operation was not found.");
    }
    if (callbackToken !== null && callbackToken !== undefined && operation.callbackToken !== String(callbackToken)) {
      throw createError(403, "ocr_provider_callback_token_invalid", "OCR provider callback token is invalid.");
    }
    operations.delete(resolvedOperationName);
    return Object.freeze({
      ...operation.result,
      status: "completed",
      callbackMode: "manual_provider_callback",
      operationName: resolvedOperationName,
      callbackToken: null
    });
  }

  function snapshot() {
    return {
      operations: [...operations.entries()]
    };
  }

  function restore(snapshot = {}) {
    operations.clear();
    for (const [operationName, entry] of Array.isArray(snapshot.operations) ? snapshot.operations : []) {
      operations.set(operationName, entry);
    }
  }
}

function buildDeterministicExtractionResult({
  clock,
  profile,
  sourceText,
  filename,
  pageCount,
  requestedModelVersion,
  providerMode,
  providerEnvironmentRef,
  providerBaselineRef
}) {
  const normalizedSourceText = normalizeSourceText(sourceText, filename);
  const qualityHints = deriveQualityHints(normalizedSourceText);
  const processorVersion = normalizeOptionalText(requestedModelVersion) || profile.processorVersion;
  return Object.freeze({
    providerCode: GOOGLE_DOCUMENT_AI_PROVIDER_CODE,
    providerMode,
    providerEnvironmentRef,
    providerBaselineRef,
    profileCode: profile.profileCode,
    processorType: profile.processorType,
    processorVersion,
    processingMode: pageCount > profile.maxSyncPages ? "batch_lro" : "sync",
    pageCount,
    maxSyncPages: profile.maxSyncPages,
    maxBatchPages: profile.maxBatchPages,
    qualityScore: qualityHints.qualityScore,
    textConfidence: qualityHints.textConfidence,
    imageQualityScore: qualityHints.imageQualityScore,
    sourceText: normalizedSourceText,
    pages: buildPagePayloads({
      pageCount,
      sourceText: normalizedSourceText,
      qualityHints
    }),
    entityHints: buildEntityHints({
      sourceText: normalizedSourceText,
      profileCode: profile.profileCode
    }),
    completedAt: nowIso(clock)
  });
}

function buildPagePayloads({ pageCount, sourceText, qualityHints }) {
  return Array.from({ length: pageCount }, (_, index) =>
    Object.freeze({
      pageNumber: index + 1,
      extractedText: index === 0 ? sourceText : "",
      textConfidence: qualityHints.textConfidence,
      imageQualityScore: qualityHints.imageQualityScore
    })
  );
}

function buildEntityHints({ sourceText, profileCode }) {
  if (profileCode === "invoice_parse") {
    return Object.freeze({
      invoiceId: extractField(sourceText, [/(?:invoice|faktura)\s*(?:number|nr)?\s*[:#-]?\s*([A-Z0-9-]+)/i]),
      supplierName: extractField(sourceText, [/(?:supplier|leverantor)\s*[:#-]?\s*([^\n]+)/i]),
      totalAmount: extractField(sourceText, [/(?:total|summa|brutto)\s*[:#-]?\s*([0-9]+(?:[.,][0-9]{2})?)/i]),
      dueDate: extractField(sourceText, [/(?:due date|forfallodatum|forfaller)\s*[:#-]?\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i])
    });
  }
  return Object.freeze({});
}

function deriveQualityHints(sourceText) {
  const lower = String(sourceText || "").toLowerCase();
  if (lower.includes("[ocr_low_confidence]") || lower.includes("blurry")) {
    return Object.freeze({
      qualityScore: 0.62,
      imageQualityScore: 0.58,
      textConfidence: 0.61
    });
  }
  if (lower.includes("[ocr_medium_confidence]")) {
    return Object.freeze({
      qualityScore: 0.82,
      imageQualityScore: 0.8,
      textConfidence: 0.84
    });
  }
  return Object.freeze({
    qualityScore: 0.97,
    imageQualityScore: 0.96,
    textConfidence: 0.98
  });
}

function normalizeSourceText(sourceText, filename) {
  const parts = [
    normalizeOptionalText(sourceText),
    normalizeOptionalText(filename)
  ].filter(Boolean);
  return parts.join("\n").trim();
}

function buildOperationName({ companyId, documentId, profileCode }) {
  return `projects/${normalizeKeyPart(companyId) || "sandbox"}/locations/eu/operations/${normalizeKeyPart(profileCode) || "ocr"}-${normalizeKeyPart(documentId) || crypto.randomUUID()}-${crypto.randomUUID().replace(/-/g, "")}`;
}

function buildProviderBaselineRef({
  providerBaselineRegistry,
  profile,
  effectiveDate,
  metadata = {}
}) {
  if (providerBaselineRegistry && typeof providerBaselineRegistry.resolveProviderBaseline === "function") {
    const providerBaseline = providerBaselineRegistry.resolveProviderBaseline({
      domain: "integrations",
      jurisdiction: "SE",
      providerCode: GOOGLE_DOCUMENT_AI_PROVIDER_CODE,
      baselineCode: profile.baselineCode,
      effectiveDate
    });
    return providerBaselineRegistry.buildProviderBaselineRef({
      effectiveDate,
      providerBaseline,
      metadata
    });
  }
  return Object.freeze({
    providerCode: GOOGLE_DOCUMENT_AI_PROVIDER_CODE,
    baselineCode: profile.baselineCode,
    providerBaselineId: `${profile.baselineCode.toLowerCase()}-${effectiveDate}`,
    providerBaselineVersion: effectiveDate,
    providerBaselineChecksum: `${profile.baselineCode.toLowerCase()}-${effectiveDate}`,
    effectiveDate,
    metadata: { ...metadata }
  });
}

function resolveProfile(profileCode) {
  const resolvedProfileCode = requireText(profileCode, "ocr_provider_profile_required");
  const profile = OCR_PROFILE_CATALOG[resolvedProfileCode];
  if (!profile) {
    throw createError(400, "ocr_provider_profile_invalid", `Unsupported OCR profile ${resolvedProfileCode}.`);
  }
  return profile;
}

function normalizePageCount(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw createError(400, "ocr_provider_page_count_invalid", "OCR page count must be a positive integer.");
  }
  return number;
}

function extractField(sourceText, patterns) {
  for (const pattern of patterns) {
    const match = String(sourceText || "").match(pattern);
    if (match?.[1]) {
      return Object.freeze({
        value: match[1].trim(),
        confidence: 0.95
      });
    }
  }
  return Object.freeze({
    value: null,
    confidence: 0
  });
}

function requireText(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createError(400, code, `${code} is required.`);
  }
  return value.trim();
}

function normalizeOptionalText(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeKeyPart(value) {
  const resolved = normalizeOptionalText(value);
  return resolved ? resolved.replace(/[^a-zA-Z0-9_-]+/g, "-") : null;
}

function nowIso(clock = () => new Date()) {
  return new Date(clock()).toISOString();
}

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
