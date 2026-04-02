export const SURFACE_POLICY_CODES = Object.freeze([
  "annual_operations",
  "finance_operations",
  "search_workspace",
  "desktop_surface",
  "personalliggare_control",
  "id06_control",
  "project_workspace",
  "egenkontroll_control",
  "field_control",
  "payroll_operations",
  "hr_operations",
  "time_operations",
  "review_center",
  "activity_feed",
  "activity_backoffice_context",
  "backoffice"
]);

const AUTHORIZATION_CONTEXT = Symbol.for("swedish_erp.api.authorization_context");

const POLICY_REGISTRY = Object.freeze(
  Object.fromEntries(
    [
      createPolicy(
        "annual_operations",
        "surface.annual.read",
        "annual_surface",
        "annual_surface",
        "annual_operations_role_forbidden",
        "Current actor is not allowed to access annual reporting or filing operations.",
        "annual_reporting_review_boundary",
        "annual_reporting_masked_projection",
        ["desktop"]
      ),
      createPolicy(
        "finance_operations",
        "surface.finance.read",
        "finance_surface",
        "finance_surface",
        "finance_operations_role_forbidden",
        "Current actor is not allowed to access finance operations worklists.",
        "finance_operations_review_boundary",
        "finance_masked_projection",
        ["desktop"]
      ),
      createPolicy(
        "search_workspace",
        "surface.search.read",
        "search_surface",
        "search_surface",
        "search_workspace_role_forbidden",
        "Current actor is not allowed to access search, object-profile or workbench read models.",
        "search_review_boundary",
        "search_masked_projection",
        ["desktop", "backoffice"]
      ),
      createPolicy(
        "desktop_surface",
        "surface.desktop.read",
        "desktop_surface",
        "desktop_surface",
        "desktop_surface_role_forbidden",
        "Current actor is not allowed to access desktop-only read models.",
        "desktop_review_boundary",
        "desktop_masked_projection",
        ["desktop"]
      ),
      createPolicy(
        "personalliggare_control",
        "surface.personalliggare.read",
        "personalliggare_control",
        "personalliggare_control",
        "personalliggare_control_role_forbidden",
        "Current actor is not allowed to access personalliggare control, export or audit read models.",
        "personalliggare_review_boundary",
        "personalliggare_masked_projection",
        ["field"]
      ),
      createPolicy(
        "id06_control",
        "surface.id06.read",
        "id06_control",
        "id06_control",
        "id06_control_role_forbidden",
        "Current actor is not allowed to access ID06 control, work-pass or audit read models.",
        "id06_review_boundary",
        "id06_masked_projection",
        ["field"]
      ),
      createPolicy(
        "project_workspace",
        "surface.project_workspace.read",
        "project_workspace_surface",
        "project_workspace_surface",
        "project_workspace_role_forbidden",
        "Current actor is not allowed to access project workspace or project control read models.",
        "project_workspace_review_boundary",
        "project_workspace_masked_projection",
        ["desktop"]
      ),
      createPolicy(
        "egenkontroll_control",
        "surface.egenkontroll.read",
        "egenkontroll_control",
        "egenkontroll_control",
        "egenkontroll_control_role_forbidden",
        "Current actor is not allowed to access egenkontroll template, overview or deviation control read models.",
        "egenkontroll_review_boundary",
        "egenkontroll_masked_projection",
        ["field"]
      ),
      createPolicy(
        "field_control",
        "surface.field.read",
        "field_control_surface",
        "field_control_surface",
        "field_control_role_forbidden",
        "Current actor is not allowed to access field dispatch, planning or audit read models.",
        "field_operations_review_boundary",
        "field_masked_projection",
        ["field"]
      ),
      createPolicy(
        "payroll_operations",
        "surface.payroll.read",
        "payroll_surface",
        "payroll_surface",
        "payroll_operations_role_forbidden",
        "Current actor is not allowed to access payroll operations worklists.",
        "payroll_review_boundary",
        "payroll_masked_projection",
        ["desktop"]
      ),
      createPolicy(
        "hr_operations",
        "surface.hr.read",
        "hr_surface",
        "hr_surface",
        "hr_operations_role_forbidden",
        "Current actor is not allowed to access HR operations read models.",
        "hr_review_boundary",
        "hr_masked_projection",
        ["desktop"]
      ),
      createPolicy(
        "time_operations",
        "surface.time.read",
        "time_surface",
        "time_surface",
        "time_operations_role_forbidden",
        "Current actor is not allowed to access time operations read models.",
        "time_review_boundary",
        "time_masked_projection",
        ["desktop"]
      ),
      createPolicy(
        "review_center",
        "surface.review_center.read",
        "review_center_surface",
        "review_center_surface",
        "review_center_role_forbidden",
        "Current actor is not allowed to access review-center worklists.",
        "review_center_assignment_boundary",
        "review_center_masked_projection",
        ["desktop"]
      ),
      createPolicy(
        "activity_feed",
        "surface.activity.read",
        "activity_feed_surface",
        "activity_feed_surface",
        "activity_feed_role_forbidden",
        "Current actor is not allowed to access full activity-feed read models.",
        "activity_feed_review_boundary",
        "activity_feed_masked_projection",
        ["desktop", "backoffice"]
      ),
      createPolicy(
        "activity_backoffice_context",
        "surface.activity.backoffice_context.read",
        "activity_backoffice_surface",
        "activity_backoffice_surface",
        "activity_feed_role_forbidden",
        "Current actor is not allowed to access backoffice-only activity context.",
        "activity_backoffice_review_boundary",
        "activity_backoffice_masked_projection",
        ["backoffice"]
      ),
      createPolicy(
        "backoffice",
        "surface.backoffice.read",
        "backoffice_surface",
        "backoffice_surface",
        "backoffice_role_forbidden",
        "Current actor is not allowed to access backoffice read models.",
        "backoffice_review_boundary",
        "backoffice_masked_projection",
        ["backoffice"]
      )
    ].map((entry) => [entry.policyCode, entry])
  )
);

const READ_PATH_MATCHERS = Object.freeze([
  createMatcher("backoffice", (path) => path.startsWith("/v1/backoffice") || path.startsWith("/v1/ops") || path.startsWith("/v1/security/classes")),
  createMatcher("annual_operations", (path) => path.startsWith("/v1/annual-reporting") || path.startsWith("/v1/owner-distributions")),
  createMatcher("review_center", (path) => path.startsWith("/v1/review-center") || path.includes("/classification-cases")),
  createMatcher("activity_feed", (path) => path.startsWith("/v1/activity")),
  createMatcher("personalliggare_control", (path) => path.startsWith("/v1/personalliggare")),
  createMatcher("id06_control", (path) => path.startsWith("/v1/id06")),
  createMatcher("egenkontroll_control", (path) => path.startsWith("/v1/egenkontroll")),
  createMatcher("field_control", (path) => path.startsWith("/v1/field")),
  createMatcher("project_workspace", (path) => path.startsWith("/v1/projects") || path.startsWith("/v1/kalkyl")),
  createMatcher("hr_operations", (path) => path.startsWith("/v1/hr") && !path.startsWith("/v1/hr/employee-portal")),
  createMatcher("time_operations", (path) => path.startsWith("/v1/time")),
  createMatcher(
    "payroll_operations",
    (path) =>
      path.startsWith("/v1/payroll") ||
      path.startsWith("/v1/benefits") ||
      path.startsWith("/v1/travel") ||
      path.startsWith("/v1/pension") ||
      path.startsWith("/v1/migration")
  ),
  createMatcher(
    "finance_operations",
    (path) =>
      path.startsWith("/v1/ledger") ||
      path.startsWith("/v1/reporting") ||
      path.startsWith("/v1/vat") ||
      path.startsWith("/v1/ar") ||
      path.startsWith("/v1/ap") ||
      path.startsWith("/v1/banking") ||
      path.startsWith("/v1/hus") ||
      path.startsWith("/v1/accounting-method") ||
      path.startsWith("/v1/fiscal-years") ||
      path.startsWith("/v1/tax-account") ||
      path.startsWith("/v1/import-cases") ||
      path.startsWith("/v1/legal-forms")
  ),
  createMatcher(
    "search_workspace",
    (path) =>
      path.startsWith("/v1/search") ||
      path.startsWith("/v1/object-profiles") ||
      path.startsWith("/v1/workbenches") ||
      path.startsWith("/v1/saved-views")
  ),
  createMatcher(
    "desktop_surface",
    (path) =>
      !path.includes("/classification-cases") &&
      (path.startsWith("/v1/documents") ||
        path.startsWith("/v1/inbox") ||
        path.startsWith("/v1/review-tasks") ||
        path.startsWith("/v1/dashboard"))
  )
]);

export function getSurfacePolicy(policyCode) {
  const policy = POLICY_REGISTRY[policyCode];
  if (!policy) {
    throw new Error(`Unknown surface policy ${policyCode}.`);
  }
  return policy;
}

export function bindAuthorizationContextToPrincipal(principal, context) {
  if (!principal || typeof principal !== "object") {
    return principal;
  }
  const existingContext = principal[AUTHORIZATION_CONTEXT];
  if (
    existingContext &&
    existingContext.platform === context.platform &&
    existingContext.sessionToken === context.sessionToken &&
    existingContext.companyId === context.companyId
  ) {
    return principal;
  }
  const boundPrincipal = { ...principal };
  Object.defineProperty(boundPrincipal, AUTHORIZATION_CONTEXT, {
    value: Object.freeze({
      platform: context.platform,
      sessionToken: context.sessionToken,
      companyId: context.companyId
    }),
    enumerable: false,
    configurable: false,
    writable: false
  });
  return boundPrincipal;
}

export function getAuthorizationContextFromPrincipal(principal) {
  return principal?.[AUTHORIZATION_CONTEXT] || null;
}

export function evaluateSurfacePolicyAccess({ principal, policyCode, objectId = null }) {
  const policy = getSurfacePolicy(policyCode);
  const context = getAuthorizationContextFromPrincipal(principal);
  if (!context) {
    return {
      policy,
      principal,
      context: null,
      decision: {
        allowed: false,
        reasonCode: "surface_policy_context_missing",
        explanation: "The principal is missing bound authorization context for surface-policy evaluation."
      }
    };
  }

  const companyWideDecision = context.platform.checkAuthorization({
    sessionToken: context.sessionToken,
    action: policy.action,
    resource: {
      companyId: context.companyId,
      objectType: policy.objectType,
      objectId: context.companyId,
      scopeCode: policy.scopeCode
    }
  });
  if (companyWideDecision.decision.allowed || objectId == null || objectId === context.companyId) {
    return {
      policy,
      context,
      principal: companyWideDecision.principal,
      decision: companyWideDecision.decision
    };
  }

  const objectScopedDecision = context.platform.checkAuthorization({
    sessionToken: context.sessionToken,
    action: policy.action,
    resource: {
      companyId: context.companyId,
      objectType: policy.objectType,
      objectId,
      scopeCode: policy.scopeCode
    }
  });
  return {
    policy,
    context,
    principal: objectScopedDecision.principal,
    decision: objectScopedDecision.decision
  };
}

export function resolveReadSurfacePolicyCode(path) {
  const normalizedPath = String(path || "").split("?")[0];
  for (const entry of READ_PATH_MATCHERS) {
    if (entry.matches(normalizedPath)) {
      return entry.policyCode;
    }
  }
  return null;
}

function createMatcher(policyCode, matches) {
  return Object.freeze({ policyCode, matches });
}

function createPolicy(
  policyCode,
  action,
  objectType,
  scopeCode,
  denialReasonCode,
  denialExplanation,
  reviewBoundaryCode,
  maskingPolicyCode,
  surfaceFamilyCodes
) {
  return Object.freeze({
    policyCode,
    action,
    objectType,
    scopeCode,
    denialReasonCode,
    denialExplanation,
    reviewBoundaryCode,
    maskingPolicyCode,
    surfaceFamilyCodes: Object.freeze([...surfaceFamilyCodes])
  });
}
