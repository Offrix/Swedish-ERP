import crypto from "node:crypto";

export const CANONICAL_API_VERSION = "2026-03-27";

export async function readJsonBody(req, allowEmpty = false) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) {
    return allowEmpty ? {} : {};
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw createHttpError(400, "json_invalid", "Request body is not valid JSON.");
  }
  return normalizeRequestPayload(req, parsed);
}

export function readBearerToken(req) {
  const header = req.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  return null;
}

export function writeJson(res, statusCode, payload, options = {}) {
  const meta = buildEnvelopeMeta(res, {
    classification: options.classification || classifySuccessStatus(statusCode)
  });
  const envelope = buildSuccessEnvelope(payload, meta);
  res.writeHead(statusCode, buildEnvelopeHeaders(meta, options.headers));
  res.end(`${JSON.stringify(envelope, null, 2)}\n`);
}

export function writeError(res, error) {
  const statusCode = error.status || error.statusCode || 500;
  const errorPayload = buildErrorPayload(error, statusCode);
  const meta = buildEnvelopeMeta(res, {
    classification: errorPayload.classification
  });
  const envelope = {
    meta,
    data: null,
    error: errorPayload.code,
    errorDetail: errorPayload,
    errorCode: errorPayload.code,
    message: errorPayload.message,
    classification: errorPayload.classification,
    retryable: errorPayload.retryable,
    reviewRequired: errorPayload.reviewRequired,
    denialReasonCode: errorPayload.denialReasonCode,
    supportRef: errorPayload.supportRef,
    details: errorPayload.details
  };
  res.writeHead(statusCode, buildEnvelopeHeaders(meta));
  res.end(`${JSON.stringify(envelope, null, 2)}\n`);
}

export function createHttpError(status, code, message, extras = {}) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  if (extras && typeof extras === "object") {
    Object.assign(error, extras);
  }
  return error;
}

export function matchPath(actualPath, template) {
  const actualParts = actualPath.split("/").filter(Boolean);
  const templateParts = template.split("/").filter(Boolean);
  if (actualParts.length !== templateParts.length) {
    return null;
  }
  const params = {};
  for (let index = 0; index < templateParts.length; index += 1) {
    const templatePart = templateParts[index];
    const actualPart = actualParts[index];
    if (templatePart.startsWith(":")) {
      params[templatePart.slice(1)] = decodeURIComponent(actualPart);
      continue;
    }
    if (templatePart !== actualPart) {
      return null;
    }
  }
  return params;
}

export function requireText(value, code, message) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createHttpError(400, code, message || `${code} is required.`);
  }
  return value.trim();
}

export function optionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function optionalInteger(value) {
  const normalized = optionalText(value);
  if (normalized == null) {
    return null;
  }
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed)) {
    throw createHttpError(400, "integer_invalid", "Value must be an integer.");
  }
  return parsed;
}

export function readSessionToken(req, body = {}) {
  return readBearerToken(req) || body.sessionToken || null;
}

export function authorizeCompanyAccess({
  platform,
  sessionToken,
  companyId,
  action,
  objectType,
  objectId,
  scopeCode
}) {
  const { principal, decision } = platform.checkAuthorization({
    sessionToken,
    action,
    resource: {
      companyId,
      objectType,
      objectId,
      scopeCode
    }
  });
  if (!decision.allowed) {
    throw createHttpError(403, decision.reasonCode, decision.explanation);
  }
  return principal;
}

export function authorizePublicAccess({
  platform,
  req,
  body = {},
  requiredScopes = [],
  mode = null,
  companyId = null
}) {
  const accessToken = readBearerToken(req) || body.accessToken || null;
  if (!accessToken) {
    throw createHttpError(401, "public_api_token_required", "Public API access token is required.");
  }
  return platform.authorizePublicApiToken({
    accessToken,
    requiredScopes,
    mode,
    companyId
  });
}

function normalizeRequestPayload(req, payload) {
  if (!isPlainObject(payload)) {
    return payload;
  }
  const requestContext = ensureRequestContext(req);
  const meta = isPlainObject(payload.meta) ? payload.meta : null;
  const hasCanonicalEnvelope = meta && Object.prototype.hasOwnProperty.call(payload, "data");
  const data = hasCanonicalEnvelope ? payload.data : payload;
  const normalizedPayload = isPlainObject(data) ? { ...data } : data;
  const normalizedIdempotencyKey = optionalText(
    isPlainObject(normalizedPayload) ? normalizedPayload.idempotencyKey : null
  ) || optionalText(meta?.idempotencyKey) || readHeaderValue(req, "idempotency-key");
  const normalizedCorrelationId = optionalText(meta?.correlationId);
  if (normalizedIdempotencyKey) {
    requestContext.idempotencyKey = normalizedIdempotencyKey;
    if (isPlainObject(normalizedPayload) && normalizedPayload.idempotencyKey == null) {
      normalizedPayload.idempotencyKey = normalizedIdempotencyKey;
    }
  }
  if (normalizedCorrelationId) {
    requestContext.correlationId = normalizedCorrelationId;
  }
  if (isPlainObject(normalizedPayload)) {
    Object.defineProperty(normalizedPayload, "__requestEnvelopeMeta", {
      configurable: true,
      enumerable: false,
      writable: false,
      value: meta ? { ...meta } : null
    });
  }
  return normalizedPayload;
}

function buildSuccessEnvelope(payload, meta) {
  if (isPlainObject(payload)) {
    return {
      meta,
      data: payload,
      ...payload
    };
  }
  return {
    meta,
    data: payload
  };
}

function buildErrorPayload(error, statusCode) {
  const code = error.code || error.error || "internal_error";
  const classification = error.classification || classifyErrorStatus(statusCode);
  const denialReasonCode =
    error.denialReasonCode || (classification === "permission" ? code : null);
  const details = normalizeErrorDetails(error.details);
  return {
    code,
    message: error.message || "Unexpected error",
    classification,
    retryable: typeof error.retryable === "boolean" ? error.retryable : isRetryableErrorClassification(classification),
    reviewRequired: error.reviewRequired === true,
    denialReasonCode,
    supportRef: optionalText(error.supportRef),
    details
  };
}

function buildEnvelopeMeta(res, { classification }) {
  const context = ensureRequestContext(res);
  const correlationId = context.correlationId || context.requestId || crypto.randomUUID();
  context.correlationId = correlationId;
  return {
    requestId: context.requestId || crypto.randomUUID(),
    correlationId,
    apiVersion: context.apiVersion || CANONICAL_API_VERSION,
    mode: context.environmentMode || null,
    classification,
    idempotencyKey: context.idempotencyKey || null
  };
}

function buildEnvelopeHeaders(meta, extraHeaders = {}) {
  return {
    "content-type": "application/json; charset=utf-8",
    "x-request-id": meta.requestId,
    "x-correlation-id": meta.correlationId,
    "x-api-version": meta.apiVersion,
    ...(meta.idempotencyKey ? { "idempotency-key": meta.idempotencyKey } : {}),
    ...extraHeaders
  };
}

function normalizeErrorDetails(details) {
  if (!Array.isArray(details) || details.length === 0) {
    return [];
  }
  return details.map((detail) => {
    if (detail && typeof detail === "object") {
      return {
        code: optionalText(detail.code),
        field: optionalText(detail.field),
        message: optionalText(detail.message) || "Error detail."
      };
    }
    return {
      code: null,
      field: null,
      message: String(detail)
    };
  });
}

function isRetryableErrorClassification(classification) {
  return classification === "technical" || classification === "downstream" || classification === "rate_limited";
}

function classifySuccessStatus(statusCode) {
  if (statusCode === 201) {
    return "created";
  }
  if (statusCode === 202) {
    return "accepted";
  }
  return "success";
}

function classifyErrorStatus(statusCode) {
  if (statusCode === 401 || statusCode === 403) {
    return "permission";
  }
  if (statusCode === 409) {
    return "conflict";
  }
  if (statusCode === 429) {
    return "rate_limited";
  }
  if (statusCode >= 500) {
    return "technical";
  }
  return "validation";
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function readHeaderValue(req, headerName) {
  const headers = req?.headers || {};
  const rawValue = headers[headerName];
  if (typeof rawValue === "string" && rawValue.trim().length > 0) {
    return rawValue.trim();
  }
  if (Array.isArray(rawValue) && rawValue.length > 0 && typeof rawValue[0] === "string" && rawValue[0].trim().length > 0) {
    return rawValue[0].trim();
  }
  return null;
}

function ensureRequestContext(target) {
  if (!target.__swedishErpRequestContext) {
    Object.defineProperty(target, "__swedishErpRequestContext", {
      configurable: true,
      enumerable: false,
      writable: true,
      value: {
        requestId: crypto.randomUUID(),
        correlationId: null,
        apiVersion: CANONICAL_API_VERSION,
        environmentMode: null,
        idempotencyKey: null
      }
    });
  }
  return target.__swedishErpRequestContext;
}
