export async function readJsonBody(req, allowEmpty = false) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) {
    return allowEmpty ? {} : {};
  }
  try {
    return JSON.parse(text);
  } catch {
    throw createHttpError(400, "json_invalid", "Request body is not valid JSON.");
  }
}

export function readBearerToken(req) {
  const header = req.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  return null;
}

export function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(`${JSON.stringify(payload, null, 2)}\n`);
}

export function createHttpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
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
