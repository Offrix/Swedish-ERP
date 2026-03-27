import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { matchPath } from "./route-helpers.mjs";

export const ROUTE_TRUST_LEVELS = Object.freeze(["public", "authenticated", "mfa", "strong_mfa"]);

const MUTATING_HTTP_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const ACTION_SEGMENTS = new Set([
  "accept",
  "ack",
  "acknowledge",
  "activate",
  "approve",
  "archive",
  "assert",
  "assign",
  "attach_document",
  "book",
  "claim",
  "close",
  "collect",
  "complete",
  "convert_to_project_budget",
  "convert_to_quote",
  "correct",
  "correction",
  "corrections",
  "decide",
  "deliver",
  "diagnostics",
  "dispatch",
  "end",
  "escalate",
  "execute",
  "export",
  "fail",
  "final_extract",
  "finalize",
  "generate_periods",
  "health",
  "health_checks",
  "import",
  "import_records",
  "invoice",
  "lock",
  "match",
  "override",
  "post",
  "post_review",
  "ready_for_sign",
  "recalculate",
  "regenerate",
  "reject",
  "release",
  "reopen",
  "repair",
  "replay",
  "replay_plan",
  "respond",
  "resolve",
  "retry",
  "retry_delivery",
  "return",
  "revoke",
  "revise",
  "rotate",
  "run",
  "send",
  "share",
  "sign",
  "signoff",
  "signoffs",
  "snooze",
  "start",
  "status",
  "stabilize",
  "submit",
  "suspend",
  "switch",
  "triage",
  "update",
  "validate",
  "versions",
  "writeoffs"
]);
const GENERIC_OBJECT_TYPES = new Set([
  "account",
  "agreement",
  "batch",
  "bundle",
  "case",
  "chain",
  "checklist",
  "comment",
  "connection",
  "decision",
  "definition",
  "diff",
  "drill",
  "entry",
  "event",
  "export",
  "flag",
  "item",
  "job",
  "line",
  "membership",
  "message",
  "notification",
  "offset",
  "operation",
  "package",
  "period",
  "plan",
  "profile",
  "proposal",
  "record",
  "report",
  "request",
  "resource",
  "run",
  "scenario",
  "secret",
  "session",
  "snapshot",
  "statement",
  "task",
  "token",
  "type",
  "user",
  "version",
  "widget"
]);
const EXACT_PUBLIC_ROUTE_KEYS = new Set([
  "POST /v1/system/bootstrap/validate",
  "POST /v1/auth/login",
  "POST /v1/auth/federation/start",
  "POST /v1/onboarding/runs",
  "POST /v1/public/oauth/token"
]);
const SELF_ROUTE_KEYS = new Set([
  "POST /v1/auth/logout",
  "POST /v1/auth/challenges",
  "POST /v1/auth/challenges/:challengeId/complete",
  "POST /v1/auth/devices/:deviceTrustRecordId/trust",
  "POST /v1/auth/devices/:deviceTrustRecordId/revoke",
  "POST /v1/auth/mfa/totp/enroll",
  "POST /v1/auth/mfa/totp/verify",
  "POST /v1/auth/mfa/passkeys/register-options",
  "POST /v1/auth/mfa/passkeys/register-verify",
  "POST /v1/auth/mfa/passkeys/assert",
  "POST /v1/auth/bankid/start",
  "POST /v1/auth/bankid/collect",
  "POST /v1/auth/federation/callback",
  "POST /v1/authz/check",
  "POST /v1/hr/employee-portal/me/leave-entries",
  "PATCH /v1/hr/employee-portal/me/leave-entries/:leaveEntryId",
  "POST /v1/hr/employee-portal/me/leave-entries/:leaveEntryId/submit"
]);
const LOW_RISK_COMPANY_READ_ROUTE_KEYS = new Set([
  "POST /v1/notifications/bulk-actions",
  "POST /v1/notifications/:notificationId/read",
  "POST /v1/notifications/:notificationId/ack",
  "POST /v1/notifications/:notificationId/acknowledge",
  "POST /v1/notifications/:notificationId/snooze"
]);
const HIGH_RISK_ROUTE_PREFIXES = Object.freeze([
  "/v1/org/",
  "/v1/ledger/",
  "/v1/vat/",
  "/v1/banking/",
  "/v1/payroll/",
  "/v1/pension/",
  "/v1/annual-reporting/",
  "/v1/submissions/",
  "/v1/backoffice/",
  "/v1/ops/",
  "/v1/migration/",
  "/v1/tax-account/",
  "/v1/legal-forms/",
  "/v1/accounting-method/",
  "/v1/fiscal-years/",
  "/v1/balances/",
  "/v1/collective-agreements/"
]);

const EXPLICIT_ROUTE_OVERRIDES = new Map([
  ["POST /v1/auth/logout", override("auth", "identity_session_end", "authenticated", "self", "auth_session", "auth_session", null, false)],
  ["POST /v1/auth/challenges", override("auth", "identity_step_up_start", "authenticated", "self", "auth_challenge", "auth_challenge", null, false)],
  ["POST /v1/auth/challenges/:challengeId/complete", override("auth", "identity_factor_verify", "authenticated", "self", "auth_challenge", "auth_challenge", null, false)],
  ["POST /v1/auth/devices/:deviceTrustRecordId/trust", override("auth", "identity_device_trust_manage", "mfa", "self", "device_trust_record", "device_trust_record", null, false)],
  ["POST /v1/auth/devices/:deviceTrustRecordId/revoke", override("auth", "identity_device_trust_manage", "mfa", "self", "device_trust_record", "device_trust_record", null, false)],
  ["POST /v1/auth/mfa/totp/enroll", override("auth", "identity_factor_manage", "authenticated", "self", "auth_factor", "auth_factor", "auth.factor.manage", false)],
  ["POST /v1/auth/mfa/totp/verify", override("auth", "identity_factor_verify", "authenticated", "self", "auth_factor", "auth_factor", null, false)],
  ["POST /v1/auth/mfa/passkeys/register-options", override("auth", "identity_factor_manage", "authenticated", "self", "auth_factor", "auth_factor", "auth.factor.manage", false)],
  ["POST /v1/auth/mfa/passkeys/register-verify", override("auth", "identity_factor_verify", "authenticated", "self", "auth_factor", "auth_factor", null, false)],
  ["POST /v1/auth/mfa/passkeys/assert", override("auth", "identity_factor_verify", "authenticated", "self", "auth_factor", "auth_factor", null, false)],
  ["POST /v1/auth/bankid/start", override("auth", "identity_factor_verify", "authenticated", "self", "auth_factor", "auth_factor", null, false)],
  ["POST /v1/auth/bankid/collect", override("auth", "identity_factor_verify", "authenticated", "self", "auth_factor", "auth_factor", null, false)],
  ["POST /v1/auth/federation/start", override("auth", "identity_federation_start", "public", "self", "auth_federation", "auth_challenge", null, false)],
  ["POST /v1/auth/federation/callback", override("auth", "identity_federation_complete", "authenticated", "self", "auth_federation", "auth_challenge", null, false)],
  ["POST /v1/auth/sessions/:sessionId/revoke", override("auth", "identity_session_manage", "strong_mfa", "company", "auth_session", "auth_session", "auth.session.revoke", true)],
  ["POST /v1/authz/check", { ...override("auth", "permission_resolution", "authenticated", "self", "authorization", "authorization_decision", null, false), mutation: false }],
  ["POST /v1/org/delegations", override("org", "org_identity_admin", "strong_mfa", "company", "delegation", "delegation", "delegation.manage", false)],
  ["POST /v1/org/companies/:companyId/users", override("org", "org_identity_admin", "strong_mfa", "company", "company_user", "company_user", "company_user.write", true)],
  ["POST /v1/backoffice/support-cases/:supportCaseId/close", override("backoffice", "support_case_operate", "strong_mfa", "support_case", "support_case", "support_case", "company.manage", true)],
  ["POST /v1/review-tasks/:reviewTaskId/approve", override("documents", "review_task_decide", "mfa", "review_task", "review_task", "review_task", "approval.approve", true)],
  ["POST /v1/review-center/items/:reviewItemId/approve", override("review", "review_center_decide", "mfa", "review_item", "review_item", "review_item", "approval.approve", true)],
  ["POST /v1/review-center/items/:reviewItemId/reject", override("review", "review_center_decide", "mfa", "review_item", "review_item", "review_item", "approval.approve", true)],
  ["POST /v1/review-center/items/:reviewItemId/escalate", override("review", "review_center_escalate", "mfa", "review_item", "review_item", "review_item", "approval.approve", true)],
  ["POST /v1/migration/cutover-plans/:cutoverPlanId/checklist/:itemCode", override("migration", "cutover_checklist_update", "strong_mfa", "checklist_item", "cutover_plan", "cutover_checklist_item", "company.manage", true)],
  ["POST /v1/notifications/:notificationId/acknowledge", override("ops", "notification_acknowledge", "authenticated", "notification", "notification", "notification", "company.read", true)],
  ["POST /v1/ops/rule-governance/changes", override("ops", "regulatory_change_create", "strong_mfa", "company", "regulatory_change_entry", "regulatory_change_entry", "company.manage", false)],
  ["POST /v1/ops/rule-governance/changes/:regulatoryChangeEntryId/source-snapshots", override("ops", "regulatory_change_source_capture", "strong_mfa", "regulatory_change_entry", "regulatory_change_entry", "regulatory_change_entry", "company.manage", true)],
  ["POST /v1/ops/rule-governance/changes/:regulatoryChangeEntryId/diff-review", override("ops", "regulatory_change_diff_review", "strong_mfa", "regulatory_change_entry", "regulatory_change_entry", "regulatory_change_entry", "company.manage", true)],
  ["POST /v1/ops/rule-governance/changes/:regulatoryChangeEntryId/sandbox-verification", override("ops", "regulatory_change_sandbox_verify", "strong_mfa", "regulatory_change_entry", "regulatory_change_entry", "regulatory_change_entry", "company.manage", true)],
  ["POST /v1/ops/rule-governance/changes/:regulatoryChangeEntryId/approve", override("ops", "regulatory_change_approve", "strong_mfa", "regulatory_change_entry", "regulatory_change_entry", "regulatory_change_entry", "company.manage", true)],
  ["POST /v1/ops/rule-governance/changes/:regulatoryChangeEntryId/publish", override("ops", "regulatory_change_publish", "strong_mfa", "regulatory_change_entry", "regulatory_change_entry", "regulatory_change_entry", "company.manage", true)],
  ["POST /v1/ops/rule-governance/changes/:regulatoryChangeEntryId/rollback", override("ops", "regulatory_change_rollback", "strong_mfa", "regulatory_change_entry", "regulatory_change_entry", "regulatory_change_entry", "company.manage", true)]
]);

const SOURCE_ROUTE_FILES = Object.freeze([
  new URL("./server.mjs", import.meta.url),
  ...fs
    .readdirSync(fileURLToPath(new URL(".", import.meta.url)), { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^phase\d+(?:-[a-z0-9]+)*-routes\.mjs$/i.test(entry.name))
    .map((entry) => new URL(`./${entry.name}`, import.meta.url))
    .sort((left, right) => left.href.localeCompare(right.href))
]);

const MUTATING_ROUTE_CONTRACTS = Object.freeze(buildRouteContracts());
export const ROUTE_SCOPE_TYPES = Object.freeze(
  [...new Set(MUTATING_ROUTE_CONTRACTS.map((routeContract) => routeContract.requiredScopeType))].sort()
);

export function listPublishedRouteContracts() {
  return MUTATING_ROUTE_CONTRACTS.map(cloneContract);
}

export function resolvePublishedRouteContract({ method, path } = {}) {
  const resolvedMethod = normalizeMethod(method);
  const resolvedPath = normalizePath(path);
  if (!resolvedMethod || !resolvedPath) {
    return null;
  }
  for (const routeContract of MUTATING_ROUTE_CONTRACTS) {
    if (routeContract.method !== resolvedMethod) {
      continue;
    }
    const params = matchPath(resolvedPath, routeContract.path);
    if (!params) {
      continue;
    }
    return {
      ...cloneContract(routeContract),
      params
    };
  }
  return null;
}

function buildRouteContracts() {
  return dedupeRoutes(SOURCE_ROUTE_FILES.flatMap((fileUrl) => parseMutatingRoutesFromSource(fileUrl))).map((route) =>
    Object.freeze(buildRouteContract(route))
  );
}

function parseMutatingRoutesFromSource(fileUrl) {
  const sourceText = fs.readFileSync(fileURLToPath(fileUrl), "utf8");
  const bindings = new Map(
    [...sourceText.matchAll(/const\s+(\w+)\s*=\s*matchPath\(path,\s*"([^"]+)"\)/g)].map((match) => [match[1], match[2]])
  );
  const routes = [];
  for (const match of sourceText.matchAll(/if\s*\(([^\{]+)\)\s*\{/g)) {
    const condition = match[1];
    const methods = [...condition.matchAll(/req\.method\s*===\s*"([A-Z]+)"/g)].map((methodMatch) => methodMatch[1]);
    if (methods.length === 0) {
      continue;
    }
    const directPaths = [...condition.matchAll(/path\s*===\s*"([^"]+)"/g)].map((pathMatch) => pathMatch[1]);
    const boundPaths = [...bindings.entries()].filter(([binding]) => condition.includes(binding)).map(([, route]) => route);
    for (const method of methods) {
      if (!MUTATING_HTTP_METHODS.has(method)) {
        continue;
      }
      for (const routePath of new Set([...directPaths, ...boundPaths])) {
        if (routePath === "/" || routePath === "/healthz" || routePath === "/readyz") {
          continue;
        }
        routes.push({ method, path: routePath });
      }
    }
  }
  return routes;
}

function dedupeRoutes(routes) {
  const seen = new Set();
  return routes
    .filter(({ method, path }) => method && path)
    .filter(({ method, path }) => {
      const key = `${method} ${path}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((left, right) => (left.path === right.path ? left.method.localeCompare(right.method) : left.path.localeCompare(right.path)));
}

function buildRouteContract({ method, path }) {
  const key = `${method} ${path}`;
  const overrideEntry = EXPLICIT_ROUTE_OVERRIDES.get(key);
  const routeFamily = overrideEntry?.routeFamily || deriveRouteFamily(path);
  const objectType = overrideEntry?.objectType || deriveObjectType(path, routeFamily);
  const requiredScopeType = overrideEntry?.requiredScopeType || deriveScopeType(path, objectType);
  const scopeCode = overrideEntry?.scopeCode || deriveScopeCode(requiredScopeType, objectType, routeFamily);
  const requiredTrustLevel = overrideEntry?.requiredTrustLevel || deriveTrustLevel(path, routeFamily);
  const permissionCode =
    overrideEntry && Object.prototype.hasOwnProperty.call(overrideEntry, "permissionCode")
      ? overrideEntry.permissionCode
      : derivePermissionCode({ method, path, routeFamily, requiredScopeType });
  const requiredActionClass = overrideEntry?.requiredActionClass || deriveActionClass({ path, routeFamily, objectType });
  const expectedObjectVersion =
    overrideEntry && Object.prototype.hasOwnProperty.call(overrideEntry, "expectedObjectVersion")
      ? overrideEntry.expectedObjectVersion
      : getRouteParams(path).length > 0;
  const mutation =
    overrideEntry && Object.prototype.hasOwnProperty.call(overrideEntry, "mutation")
      ? overrideEntry.mutation
      : !EXACT_PUBLIC_ROUTE_KEYS.has(key) || key === "POST /v1/auth/login";
  return {
    method,
    path,
    routeFamily,
    mutation,
    requiredActionClass,
    requiredTrustLevel,
    requiredScopeType,
    scopeCode,
    objectType,
    permissionCode: permissionCode || null,
    expectedObjectVersion: expectedObjectVersion === true
  };
}

function override(routeFamily, requiredActionClass, requiredTrustLevel, requiredScopeType, scopeCode, objectType, permissionCode, expectedObjectVersion) {
  return {
    routeFamily,
    requiredActionClass,
    requiredTrustLevel,
    requiredScopeType,
    scopeCode,
    objectType,
    permissionCode,
    expectedObjectVersion
  };
}

function deriveRouteFamily(path) {
  return normalizeToken(getStaticSegments(path)[0] || "system");
}

function deriveObjectType(path, routeFamily) {
  if (isPublicRoute(path)) {
    if (path === "/v1/auth/login") {
      return "auth_session";
    }
    if (path === "/v1/onboarding/runs") {
      return "onboarding_run";
    }
    if (path === "/v1/public/oauth/token") {
      return "public_access_token";
    }
    return "runtime_bootstrap_validation";
  }
  if (path === "/v1/authz/check") {
    return "authorization_decision";
  }
  const paramTokens = getRouteParams(path).map(normalizeParamName).filter(Boolean);
  const staticTokens = getStaticSegments(path).map(normalizeToken).filter(Boolean);
  if (paramTokens.length > 0) {
    const lastStaticToken = staticTokens[staticTokens.length - 1] || null;
    const derived = lastStaticToken && ACTION_SEGMENTS.has(lastStaticToken) ? paramTokens[0] : paramTokens[paramTokens.length - 1];
    return maybePrefixGenericObjectType(derived, routeFamily);
  }
  return maybePrefixGenericObjectType(singularize(staticTokens[staticTokens.length - 1] || routeFamily), routeFamily);
}

function deriveScopeType(path, objectType) {
  if (isPublicRoute(path)) {
    return "public";
  }
  if (SELF_ROUTE_KEYS.has(`POST ${path}`) || SELF_ROUTE_KEYS.has(`PATCH ${path}`)) {
    return "self";
  }
  if (path.includes("/checklist/:itemCode")) {
    return "checklist_item";
  }
  const paramTokens = getRouteParams(path).map(normalizeParamName).filter(Boolean);
  return paramTokens[0] || (objectType === "auth_session" || objectType === "auth_factor" ? "self" : "company");
}

function deriveScopeCode(requiredScopeType, objectType, routeFamily) {
  if (requiredScopeType === "public") {
    return "public";
  }
  if (requiredScopeType === "self") {
    return objectType;
  }
  if (requiredScopeType === "company") {
    return objectType || routeFamily;
  }
  if (requiredScopeType === "checklist_item") {
    return "cutover_plan";
  }
  return requiredScopeType || objectType || routeFamily;
}

function deriveTrustLevel(path, routeFamily) {
  if (isPublicRoute(path)) {
    return "public";
  }
  if (SELF_ROUTE_KEYS.has(`POST ${path}`) || SELF_ROUTE_KEYS.has(`PATCH ${path}`)) {
    return "authenticated";
  }
  if (path.startsWith("/v1/notifications/")) {
    return "authenticated";
  }
  if (HIGH_RISK_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return "strong_mfa";
  }
  if (routeFamily === "documents" || routeFamily === "review") {
    return "mfa";
  }
  return "mfa";
}

function derivePermissionCode({ method, path, routeFamily, requiredScopeType }) {
  const key = `${method} ${path}`;
  if (EXACT_PUBLIC_ROUTE_KEYS.has(key)) {
    return null;
  }
  if (SELF_ROUTE_KEYS.has(key)) {
    return null;
  }
  if (LOW_RISK_COMPANY_READ_ROUTE_KEYS.has(key)) {
    return "company.read";
  }
  if (path.startsWith("/v1/org/companies/:companyId/users")) {
    return "company_user.write";
  }
  if (path.startsWith("/v1/org/delegations")) {
    return "delegation.manage";
  }
  if (path.startsWith("/v1/org/object-grants")) {
    return "object_grant.manage";
  }
  if (path.startsWith("/v1/org/attest-chains")) {
    return "attest_chain.manage";
  }
  if (path.startsWith("/v1/auth/sessions/")) {
    return "auth.session.revoke";
  }
  if (path.startsWith("/v1/auth/mfa/") && path.endsWith("/register-options")) {
    return "auth.factor.manage";
  }
  const operation = deriveOperation(path);
  if (["approve", "reject", "decide", "sign", "signoff", "ready_for_sign"].includes(operation)) {
    return "approval.approve";
  }
  if (requiredScopeType === "public" || requiredScopeType === "self") {
    return null;
  }
  if (routeFamily === "documents" || routeFamily === "review") {
    return operation === "approve" ? "approval.approve" : "company.manage";
  }
  return "company.manage";
}

function deriveActionClass({ path, routeFamily, objectType }) {
  return compactTokens([routeFamily, objectType, deriveOperation(path)]).join("_");
}

function deriveOperation(path) {
  const staticTokens = getStaticSegments(path).map(normalizeToken).filter(Boolean);
  const lastStaticToken = staticTokens[staticTokens.length - 1] || "execute";
  if (ACTION_SEGMENTS.has(lastStaticToken)) {
    return singularize(lastStaticToken);
  }
  return getRouteParams(path).length > 0 ? "update" : "create";
}

function isPublicRoute(path) {
  return EXACT_PUBLIC_ROUTE_KEYS.has(`POST ${path}`);
}

function getStaticSegments(path) {
  return normalizePath(path)
    .split("/")
    .filter(Boolean)
    .slice(1)
    .filter((segment) => !segment.startsWith(":"));
}

function getRouteParams(path) {
  return normalizePath(path)
    .split("/")
    .filter((segment) => segment.startsWith(":"))
    .map((segment) => segment.slice(1));
}

function normalizeMethod(method) {
  return typeof method === "string" && method.trim().length > 0 ? method.trim().toUpperCase() : null;
}

function normalizePath(path) {
  return typeof path === "string" && path.trim().length > 0 ? path.trim() : null;
}

function normalizeToken(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function normalizeParamName(paramName) {
  const normalized = normalizeToken(paramName);
  return normalized ? normalized.replace(/_(id|code)$/, "") : null;
}

function singularize(value) {
  if (!value) {
    return value;
  }
  if (value.endsWith("ies")) {
    return `${value.slice(0, -3)}y`;
  }
  if (value.endsWith("ses")) {
    return value.slice(0, -2);
  }
  if (value.endsWith("s") && !value.endsWith("ss")) {
    return value.slice(0, -1);
  }
  return value;
}

function maybePrefixGenericObjectType(objectType, routeFamily) {
  if (!objectType) {
    return normalizeToken(routeFamily || "resource");
  }
  if (objectType.startsWith(`${routeFamily}_`) || !GENERIC_OBJECT_TYPES.has(objectType)) {
    return objectType;
  }
  return `${routeFamily}_${objectType}`;
}

function compactTokens(tokens) {
  const compacted = [];
  for (const token of tokens.map(normalizeToken).filter(Boolean)) {
    if (compacted[compacted.length - 1] !== token) {
      compacted.push(token);
    }
  }
  return compacted;
}

function cloneContract(routeContract) {
  return {
    ...routeContract
  };
}
