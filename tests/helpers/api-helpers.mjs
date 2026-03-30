import assert from "node:assert/strict";
import crypto from "node:crypto";

export async function loginWithStrongAuth({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(baseUrl, "/v1/auth/login", {
    method: "POST",
    body: { companyId, email }
  });
  await requestJson(baseUrl, "/v1/auth/mfa/totp/verify", {
    method: "POST",
    token: started.sessionToken,
    body: { code: platform.getTotpCodeForTesting({ companyId, email }) }
  });
  const bankidStart = await requestJson(baseUrl, "/v1/auth/bankid/start", {
    method: "POST",
    token: started.sessionToken
  });
  await requestJson(baseUrl, "/v1/auth/bankid/collect", {
    method: "POST",
    token: started.sessionToken,
    body: {
      orderRef: bankidStart.orderRef,
      completionToken: platform.getBankIdCompletionTokenForTesting(bankidStart.orderRef)
    }
  });
  return started.sessionToken;
}

export async function loginWithTotpOnly({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(baseUrl, "/v1/auth/login", {
    method: "POST",
    body: { companyId, email }
  });
  await requestJson(baseUrl, "/v1/auth/mfa/totp/verify", {
    method: "POST",
    token: started.sessionToken,
    body: { code: platform.getTotpCodeForTesting({ companyId, email }) }
  });
  return started.sessionToken;
}

export async function requestJson(baseUrl, pathname, { method = "GET", body = null, token = null, headers = {}, expectedStatus = 200 } = {}) {
  const normalizedMethod = String(method || "GET").toUpperCase();
  const mutationIdempotencyKey =
    ["POST", "PUT", "PATCH", "DELETE"].includes(normalizedMethod)
      ? headers?.["idempotency-key"] || headers?.["Idempotency-Key"] || crypto.randomUUID()
      : null;
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: normalizedMethod,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(mutationIdempotencyKey ? { "idempotency-key": mutationIdempotencyKey } : {}),
      ...(headers && typeof headers === "object" ? headers : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus, JSON.stringify(payload));
  return normalizeApiTestPayload(payload, expectedStatus);
}

function normalizeApiTestPayload(payload, expectedStatus) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !payload.meta) {
    return payload;
  }
  if (expectedStatus >= 400 && payload.error && typeof payload.error === "object") {
    return {
      ...payload,
      error: payload.error.code,
      errorDetail: payload.error
    };
  }
  return payload;
}
