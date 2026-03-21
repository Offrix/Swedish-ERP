import crypto from "node:crypto";

export const ROLE_PERMISSIONS = Object.freeze({
  company_admin: Object.freeze([
    "company.read",
    "company.manage",
    "company_user.read",
    "company_user.write",
    "delegation.manage",
    "object_grant.manage",
    "attest_chain.manage",
    "approval.approve",
    "onboarding.manage",
    "auth.session.revoke",
    "auth.factor.manage"
  ]),
  approver: Object.freeze(["company.read", "company_user.read"]),
  payroll_admin: Object.freeze(["company.read", "company_user.read"]),
  field_user: Object.freeze(["company.read"]),
  bureau_user: Object.freeze(["company.read", "company_user.read"])
});

export const MFA_FACTOR_TYPES = Object.freeze(["totp", "passkey", "bankid"]);
export const BANKID_PROVIDER_CODE = "bankid_stub";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function permissionsForRoles(roleCodes = []) {
  const permissions = new Set();
  for (const roleCode of roleCodes) {
    for (const permission of ROLE_PERMISSIONS[roleCode] || []) {
      permissions.add(permission);
    }
  }
  return permissions;
}

export function requiredFactorCountForRoles(roleCodes = []) {
  return roleCodes.includes("company_admin") ? 2 : 1;
}

export function issueOpaqueToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export function hashOpaqueToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

export function timestamp(value = new Date()) {
  return normalizeDate(value).toISOString();
}

export function isActiveWithinWindow({ startsAt, endsAt, now = new Date() }) {
  const resolvedNow = normalizeDate(now);
  const resolvedStart = startsAt ? normalizeDate(startsAt) : null;
  const resolvedEnd = endsAt ? normalizeDate(endsAt) : null;

  if (resolvedStart && resolvedNow < resolvedStart) {
    return false;
  }
  if (resolvedEnd && resolvedNow > resolvedEnd) {
    return false;
  }
  return true;
}

export function createAuthorizationResult(allowed, reasonCode, explanation) {
  return { allowed, reasonCode, explanation };
}

export function authorizeAction({
  principal,
  action,
  resource = {},
  delegations = [],
  objectGrants = [],
  now = new Date()
}) {
  if (!principal) {
    return createAuthorizationResult(false, "unauthenticated", "No authenticated principal was provided.");
  }

  if (resource.companyId && resource.companyId !== principal.companyId) {
    return createAuthorizationResult(false, "cross_company_forbidden", "Access outside the principal company scope is blocked.");
  }

  const directPermissions = permissionsForRoles(principal.roles);
  if (directPermissions.has(action)) {
    return createAuthorizationResult(true, "role_permission", `Action ${action} is allowed through the assigned role set.`);
  }

  const grant = objectGrants.find((candidate) => matchesObjectGrant(candidate, principal, action, resource, now));
  if (grant) {
    return createAuthorizationResult(
      true,
      "object_grant",
      `Action ${action} is allowed through object grant ${grant.objectGrantId || grant.grantId || "granted_scope"}.`
    );
  }

  const delegation = delegations.find((candidate) => matchesDelegation(candidate, principal, action, resource, now));
  if (delegation) {
    return createAuthorizationResult(
      true,
      "delegation",
      `Action ${action} is allowed through delegation ${delegation.delegationId || "delegated_scope"}.`
    );
  }

  return createAuthorizationResult(false, "missing_permission", `Action ${action} is not allowed for the current principal.`);
}

export function sessionIsActive(session, now = new Date()) {
  if (!session || session.status !== "active" || session.revokedAt) {
    return false;
  }
  if (!session.expiresAt) {
    return true;
  }
  return normalizeDate(now) <= normalizeDate(session.expiresAt);
}

export function createAuditEvent({
  companyId,
  actorId,
  action,
  result,
  entityType,
  entityId,
  explanation,
  correlationId,
  recordedAt = new Date()
}) {
  return {
    auditId: crypto.randomUUID(),
    companyId,
    actorId,
    action,
    result,
    entityType,
    entityId,
    explanation,
    correlationId,
    recordedAt: timestamp(recordedAt)
  };
}

export function generateTotpEnrollment({ label, issuer = "Swedish ERP", bytes = 20 } = {}) {
  const secret = base32Encode(crypto.randomBytes(bytes));
  const accountLabel = encodeURIComponent(label || "user");
  const issuerLabel = encodeURIComponent(issuer);
  const otpauthUrl = `otpauth://totp/${issuerLabel}:${accountLabel}?secret=${secret}&issuer=${issuerLabel}&algorithm=SHA1&digits=6&period=30`;
  return {
    secret,
    issuer,
    label: label || "user",
    otpauthUrl
  };
}

export function generateTotpCode({ secret, now = new Date(), stepSeconds = 30, digits = 6 } = {}) {
  const counter = Math.floor(normalizeDate(now).getTime() / 1000 / stepSeconds);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const key = base32Decode(secret);
  const digest = crypto.createHmac("sha1", key).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 10 ** digits).padStart(digits, "0");
}

export function verifyTotpCode({ secret, code, now = new Date(), window = 1 } = {}) {
  const normalizedCode = String(code || "").trim();
  for (let offset = -window; offset <= window; offset += 1) {
    const comparisonTime = new Date(normalizeDate(now).getTime() + offset * 30_000);
    if (generateTotpCode({ secret, now: comparisonTime }) === normalizedCode) {
      return true;
    }
  }
  return false;
}

export function createPasskeyChallenge() {
  return {
    challenge: issueOpaqueToken(),
    challengeId: crypto.randomUUID()
  };
}

function matchesObjectGrant(grant, principal, action, resource, now) {
  if (!grant || grant.status !== "active") {
    return false;
  }
  if (grant.companyId !== principal.companyId || grant.companyUserId !== principal.companyUserId) {
    return false;
  }
  if (!isActiveWithinWindow({ startsAt: grant.startsAt, endsAt: grant.endsAt, now })) {
    return false;
  }
  if (grant.permissionCode !== action) {
    return false;
  }
  if (grant.objectType && resource.objectType && grant.objectType !== resource.objectType) {
    return false;
  }
  if (grant.objectId && resource.objectId && grant.objectId !== resource.objectId) {
    return false;
  }
  return true;
}

function matchesDelegation(delegation, principal, action, resource, now) {
  if (!delegation || delegation.status !== "active") {
    return false;
  }
  if (delegation.companyId !== principal.companyId || delegation.toCompanyUserId !== principal.companyUserId) {
    return false;
  }
  if (!isActiveWithinWindow({ startsAt: delegation.startsAt, endsAt: delegation.endsAt, now })) {
    return false;
  }
  if (delegation.permissionCode && delegation.permissionCode !== action) {
    return false;
  }
  if (delegation.scopeCode && resource.scopeCode && delegation.scopeCode !== resource.scopeCode) {
    return false;
  }
  if (delegation.resourceType && resource.objectType && delegation.resourceType !== resource.objectType) {
    return false;
  }
  if (delegation.resourceId && resource.objectId && delegation.resourceId !== resource.objectId) {
    return false;
  }
  return true;
}

function normalizeDate(value) {
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
}

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(input) {
  const normalized = String(input || "")
    .toUpperCase()
    .replaceAll("=", "")
    .replace(/\s+/g, "");

  let bits = 0;
  let value = 0;
  const bytes = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) {
      continue;
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}
